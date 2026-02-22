# Data Flow - fan-identity-workers

## Primary Flow

This repository implements event-driven data processing for identity verification and risk scoring. Data flows from various event sources through Lambda workers that transform, score, and persist results to databases and queues.

**High-Level Flow**:

```
External Events → AWS Event Sources → Lambda Workers → Outputs
(User actions)    (Kinesis, Kafka,    (Transform,      (DynamoDB,
                   SQS, DynamoDB)      Score, Enqueue)   SQS, Redis)
```

## Event Processing Architecture

### Event Sources → Workers

Workers consume events from multiple AWS sources:

| Event Source | Worker Examples | Trigger Type |
|--------------|----------------|--------------|
| **Kafka** | `enqueueFromStream` | User activity events (purchases, logins, searches) |
| **Kinesis** | `scoreUsers`, `enqueueFromDemandStream` | Real-time data streams from DynamoDB |
| **DynamoDB Streams** | `scoreUsers` (via Kinesis) | Database change data capture (ARAI responses) |
| **SQS** | `scoreUsers`, `processRescoreEvents` | Async message queues for scoring requests |
| **AppSync** | `getArmScore`, `validateToken` | GraphQL API requests |
| **EventBridge** | `startClusterImport`, `startBotOrNotImport` | Scheduled tasks |
| **S3** | (Future workers) | File upload triggers |

### Middleware Pipeline Flow

Every event passes through a middleware pipeline before reaching the worker:

```
1. AWS Event (Lambda invocation)
   ↓
2. lambda.js entry point
   ↓
3. appResolver (load worker by APP_NAME)
   ↓
4. Middleware Pipeline:
   ├── correlation        → Add request ID
   ├── Tracing           → Start OpenTelemetry span
   ├── transformInput    → Parse event format (Kinesis/SQS/etc)
   ├── setRecordCorrelations → Correlate batch items
   ├── services          → Inject dependencies
   └── Worker Handler    → Business logic
   ↓
5. Result Handler (format output for AWS)
   ↓
6. AWS Response (return to Lambda runtime)
```

### Worker Internal Flow

Workers follow a consistent internal pattern:

```
Input → Validation → Business Logic → Side Effects → Output
```

**Example: scoreUsers worker**

```typescript
1. Input: DynamoDB change records (ARAI responses)
   ↓
2. Extract: selectAraiResponses(records)
   ↓
3. Process: ProcessAccountScores({ scoringModel, fanIdentityTable })
   ↓
4. Score: Call ML model API with user activity data
   ↓
5. Persist: Write scores to DynamoDB
   ↓
6. Output: Return processed results
```

## Domain-Specific Data Flows

### 1. User Scoring Flow (Primary)

**Purpose**: Calculate risk scores for user accounts based on activity patterns

```
User Activity → Kafka Topic
                    ↓
            enqueueFromStream (KAFKA_CONSUMER)
                    ↓
            Filter scorable activities
                    ↓
            accountActivityQueue (SQS FIFO)
                    ↓
            scoreUsers (SQS_CONSUMER)
                    ↓
            Fetch ARAI response from DynamoDB
                    ↓
            Call ML Scoring Model API
                    ↓
            Write scores to DynamoDB fanIdentityTable
                    ↓
            Return success/failure results
```

**Key Workers**:
- `enqueueFromStream` - Filters Kafka events for scorable activities, enqueues to SQS
- `scoreUsers` - Consumes SQS queue, calls scoring model, persists scores
- `stagingScoreUsers` - Parallel staging environment worker for testing model changes

**Data Transformations**:
1. Kafka message (`ScorableUserActivity`) → SQS message (JSON string)
2. SQS message → DynamoDB query key (`globalUserId`)
3. ARAI response + user activity → Scoring model API request
4. Scoring model response → DynamoDB score record (`DynamoDbScoreRecord`)

### 2. Stream-Based Enqueuing Flow

**Purpose**: Ingest events from various streams and enqueue for processing

```
Event Stream → Transform Worker → SQS Queue → Processing Worker
```

**Stream-Specific Workers**:

| Worker | Source | Target Queue | Purpose |
|--------|--------|--------------|---------|
| `enqueueFromStream` | Kafka (user activities) | accountActivityQueue | General user activity scoring |
| `enqueueFromPurchaseStream` | Kinesis (purchase events) | accountActivityQueue | Purchase-based scoring triggers |
| `enqueueFromVfStream` | Kinesis (VF events) | accountActivityQueue | VerifiedFan-specific events |
| `enqueueFromSQJourneyStream` | Kinesis (journey events) | accountActivityQueue | User journey tracking |
| `enqueueFromDemandStream` | Kinesis (demand events) | onDemandScoringQueue | On-demand scoring requests |

**Common Pattern**:
1. Read from stream (Kinesis/Kafka)
2. Filter relevant events (e.g., `isScorableUserActivity`)
3. Transform to queue message format
4. Batch send to SQS (max 10 messages per batch)
5. Return success/failure counts

### 3. AppSync GraphQL Resolver Flow

**Purpose**: Provide synchronous API access to ARM scores

```
GraphQL Query → AppSync → validateToken (APPSYNC_AUTHORIZER)
                              ↓ (if authorized)
                          getArmScore (APPSYNC_RESOLVER)
                              ↓
                          Query ARM Redis
                              ↓
                          Return ARM score (1-5)
```

**Key Workers**:
- `validateToken` - JWT validation, returns authorization decision
- `getArmScore` - Retrieves ARM risk score from Redis cache

**Data Flow**:
1. GraphQL request with JWT token in headers
2. `validateToken` validates JWT, returns `isAuthorized` boolean
3. If authorized, `getArmScore` receives `globalUserId` argument
4. Query Redis: `user:{globalUserId}` key
5. Extract `arm_risk` field from cached user data
6. Validate score (1-5 range)
7. Return `{ data: { armScore: number | null } }`

### 4. Identity Verification Flow

**Purpose**: Handle identity verification events and liveness checks

```
IDV Event → handleEvent (EVENT_CONSUMER)
                ↓
            Process verification result
                ↓
            Update identity service
                ↓
            Return verification status

Scheduled Check → checkLiveness (SCHEDULED)
                      ↓
                  Verify system health
                      ↓
                  Alert if failures detected
```

**Key Workers**:
- `handleEvent` - Processes IDV verification results
- `checkLiveness` - Periodic health checks for identity service

### 5. Batch Processing Flow

**Purpose**: Periodic data import and clustering tasks

```
EventBridge Schedule → startClusterImport (SCHEDULED)
                           ↓
                       Trigger Glue job for clustering
                           ↓
                       Process large dataset
                           ↓
                       Update cluster assignments

EventBridge Schedule → startBotOrNotImport (SCHEDULED)
                           ↓
                       Trigger bot detection batch job
                           ↓
                       Update bot scores
```

## State Management

### DynamoDB Table: fanIdentityTable

**Purpose**: Primary data store for user scores and ARAI responses

**Schema**:
```
Partition Key: PK (string)   - "USER#<globalUserId>"
Sort Key: SK (string)         - "SCORE#<timestamp>" or "ARAI#<timestamp>"
Attributes:
  - type: "score" | "arai"
  - dateUpdated: ISO timestamp
  - For scores: accountScore, armRisk, bonScore, clusterId
  - For ARAI: araiResponse (full response object), globalUserId
```

**Access Patterns**:
- Write: `fanIdentityTable.put({ data: scoreRecord })` - Insert new scores
- Read: `fanIdentityTable.get({ PK, SK })` - Fetch specific score
- Query: `fanIdentityTable.query({ PK })` - Get all scores for user

### SQS Queues

**1. accountActivityQueue (FIFO)**
- **Purpose**: Queue user activities for scoring
- **Message Format**: JSON string with `globalUserId` and activity data
- **Deduplication**: FIFO queue with message deduplication IDs
- **Consumers**: `scoreUsers`, `stagingScoreUsers`

**2. onDemandScoringQueue (Standard)**
- **Purpose**: On-demand scoring requests triggered by specific events
- **Message Format**: JSON string with `globalUserId`
- **Consumers**: Workers that process on-demand scoring

### Redis: armRedis

**Purpose**: Low-latency cache for ARM risk scores

**Schema**:
```
Key: user:{globalUserId}
Value: JSON object
  {
    "global_user_id": string,
    "arm_risk": number (1-5),
    "timestamp": number,
    "score_date": string
  }
```

**Access Pattern**: Read-only via `getArmScore` worker

## External Integrations

| Integration | Direction | Purpose | Location |
|-------------|-----------|---------|----------|
| **TM Accounts API** | Read | Fetch user account activity (ARAI) | `shared/services/tmAccounts/` |
| **Identity Service** | Read/Write | Identity verification operations | `shared/services/identity/` |
| **Scoring Model API** | Read | ML model inference for risk scoring | `shared/services/scoringModel/` |
| **Unleash Feature Flags** | Read | Feature toggle configuration | `shared/services/featureFlags/` |
| **DynamoDB** | Read/Write | Persistent storage for scores and events | `shared/services/aws/` |
| **SQS** | Write | Enqueue messages for async processing | `shared/services/queue/` |
| **Redis** | Read | Cached ARM scores | `shared/services/armRedis/` |
| **Kafka** | Read | User activity event streams | Via Kinesis connector |
| **Kinesis** | Read | Real-time data streams | Via Lambda event source mapping |
| **AppSync** | Read/Write | GraphQL API requests | Direct Lambda integration |
| **CloudWatch** | Write | Logs and metrics | Via `@verifiedfan/cloudwatch-stdout` |
| **OpenTelemetry** | Write | Distributed tracing | Via `@verifiedfan/tracing` |

## Data Transformation Pipeline

### Input Transformation

Each event source requires format-specific transformation:

**Kinesis**:
```javascript
// Base64-encoded JSON records
transformKinesisRecords: [
  { kinesis: { data: 'base64...' } }
] → [
  { decodedData: {...}, meta: {...} }
]
```

**SQS**:
```javascript
// JSON body extraction
transformSQSRecords: [
  { body: '{"globalUserId": "..."}' }
] → [
  { globalUserId: "..." }
]
```

**Kafka**:
```javascript
// Kafka message value extraction
transformKafkaRecords: [
  { value: {...}, offset: 123 }
] → [
  { value: {...}, meta: { offset: 123 } }
]
```

**DynamoDB**:
```javascript
// Change event parsing
transformDynamoDBRecords: [
  { dynamodb: { NewImage: {...} } }
] → [
  { newItem: {...}, eventName: 'INSERT' }
]
```

### Output Transformation

Workers return results in AWS-expected formats:

**SQS Consumer** → `SQSBatchResponse`:
```javascript
{
  batchItemFailures: [
    { itemIdentifier: "messageId" }
  ]
}
```

**Kinesis Consumer** → Generic result:
```javascript
{
  correlation: { requestId: "..." },
  data: {...}
}
```

**AppSync Resolver** → GraphQL response:
```javascript
{
  data: {
    armScore: 3
  }
}
```

**AppSync Authorizer** → Authorization decision:
```javascript
{
  isAuthorized: true,
  resolverContext: {...}
}
```

## Error Handling Flow

### Worker-Level Errors

```
Worker throws error
    ↓
Middleware catches (lambda.js)
    ↓
Log error with stack trace
    ↓
Re-throw to Lambda runtime
    ↓
Lambda retries (for async sources)
    ↓
Dead Letter Queue (if configured)
```

### Batch Item Errors (SQS)

```
Worker processes batch of messages
    ↓
Individual message fails
    ↓
Return partial failure (SQSBatchResponse)
    ↓
Failed messages return to queue
    ↓
Retry with exponential backoff
    ↓
Move to DLQ after max retries
```

### Graceful Degradation

Workers use feature flags to degrade gracefully:

```javascript
const isEnabled = await features.isEnabled('scoring-service');
if (!isEnabled) {
  log.info('Scoring service disabled via feature flag');
  return { skipped: true };
}
```

## Performance Characteristics

### Batching Strategy

- **Kinesis/Kafka**: Process records in batches (configurable batch size)
- **SQS**: Max 10 messages per Lambda invocation
- **DynamoDB Streams**: Process change events in batches

### Concurrency

- Lambda concurrency limits per worker (configured in Terraform)
- FIFO queue ensures ordered processing per `globalUserId`
- Standard queues allow parallel processing

### Latency Targets

| Flow | Typical Latency | Notes |
|------|----------------|-------|
| AppSync query (getArmScore) | < 100ms | Redis cache read |
| Kafka → SQS enqueue | < 500ms | Includes filtering and batch send |
| SQS → Score → DynamoDB | 1-3 seconds | Includes ML model API call |
| Scheduled batch jobs | Minutes to hours | Large dataset processing |

## Observability

### Distributed Tracing

OpenTelemetry spans track requests across services:

```
Lambda Invocation (root span)
├── Middleware: Transform Input
├── Worker: Business Logic
│   ├── Service: TM Accounts API
│   ├── Service: Scoring Model API
│   └── Service: DynamoDB Put
└── Middleware: Result Handler
```

### Correlation IDs

All log entries include correlation IDs for request tracking:

```javascript
{
  requestId: "uuid",
  workerName: "scoreUsers",
  globalUserId: "...",
  message: "Processing user score"
}
```

### Metrics

Automatic instrumentation via `@verifiedfan/tracing`:
- Request count per worker
- Error rate per worker
- Latency percentiles (p50, p90, p99)
- Queue depth metrics (SQS)
- DynamoDB read/write capacity
