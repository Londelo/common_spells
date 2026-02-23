# Domain Concepts - fan-identity-workers

## Core Entities

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| **User / Fan** | A person attempting to access VerifiedFan services | `globalUserId` (primary identifier), email, verified status |
| **Risk Score** | Numerical assessment of fraud likelihood for a user account | `score` (0-1, where 1=highest risk), `version` (model version), `dateUpdated` |
| **ARAI Response** | Account Risk Activity Intelligence data from TM Accounts | Comprehensive account history, device signals, behavioral patterns |
| **User Activity** | An action performed by a user on their account | `action` (type of activity), `result` (success/failure), `globalUserId` |
| **Scorable Activity** | A user activity that triggers risk score recalculation | Subset of activities (logins, account updates, etc.) with `success` result |
| **Rescore Request** | A scheduled future recalculation of a user's risk score | `globalUserId`, `rescoreDate` (5 days in future), `expiresOn` (TTL) |
| **Liveness Session** | An identity verification session using selfie video | `sessionId` (Persona inquiry ID), `status`, `confidence` |
| **Liveness Event** | A frame or checkpoint in the liveness detection process | Video frame data, facial landmarks, liveness indicators |
| **Liveness Decision** | Final determination of whether user passed liveness check | `isLive` (boolean), `confidence` (score), `auditImages` |
| **ARM Score** | Account Risk Management score from dedicated ARM team system | Whole number 1-5 (1=lowest risk, 5=highest risk) |
| **Bot Detection Dataset** | ML model input data for identifying automated bot behavior | S3 file containing behavioral patterns and bot signatures |
| **Clustering Data** | ML model data identifying related accounts (fraud rings) | S3 file containing account relationship graphs and shared attributes |
| **Authorization Context** | User identity information for GraphQL request authorization | `isAuthorized` (boolean), `isLoggedIn` (boolean), `resolverContext` (user details) |
| **API Key** | Credential for accessing AppSync GraphQL API | Static key configured in AppSync settings |
| **SOTC Token** | Single Origin Token Cookie from TM Accounts for user session | JWT-like token representing authenticated user session |

---

## Business Rules

### Scoring Rules

- **Scorable Activity Types**: Only activities of type `add_phone`, `create_account`, `login`, `reset_password`, `update_account`, `update_email`, `update_phone`, `verify_otp`, `verify_otp_mfa` with `result: success` trigger scoring
- **ARAI Caching**: ARAI responses are cached in DynamoDB to reduce API calls and improve scoring latency
- **Score Versioning**: Every score includes the ML model version that calculated it, enabling audit trails and rollback
- **Conditional Score Creation**: The `dateCreated` field is only set if it doesn't already exist, preserving the original scoring timestamp
- **Rescore Deduplication**: Multiple rescore requests for the same user and date are automatically deduplicated to prevent redundant processing
- **Rescore Timing**: Rescore requests are scheduled 5 days in the future to debounce activity bursts and capture post-event behavior
- **TTL-Based Rescore Trigger**: DynamoDB TTL automatically deletes expired rescore records, triggering the scoring cycle via stream REMOVE events
- **Model Selection**: Production scoring uses `scoringModel`, while experimental models use `stagingScoringModel` for safe testing

### Identity Verification Rules

- **Session Requirement**: All liveness checks require a valid Persona inquiry session ID
- **Liveness Confidence Threshold**: Persona determines confidence scores; the system logs but does not override Persona's decisions
- **Error Normalization**: IDV-specific errors (from Persona SDK) are normalized to GraphQL error format with `errorType` and `message`
- **Invalid Event Handling**: Events that cannot be processed by Persona return `InvalidEvent` error type
- **Verification Persistence**: Liveness verification results are stored by Persona; workers act as a proxy

### Authentication & Authorization Rules

- **API Key Validation**: All GraphQL requests must provide a valid API key; mismatches result in `isAuthorized: false`
- **Optional User Authentication**: SOTC token is optional; requests without it are authorized but marked as `isLoggedIn: false`
- **Token Splitting**: Authorization header format is `{apiKey}` or `{apiKey}:{sotc}`, split on first colon
- **401 Error Handling**: 401 responses from TM Accounts (invalid SOTC) return default authorized response (not system error)
- **Non-401 Error Handling**: Other TM Accounts errors set `ttlOverride: 0` to prevent AppSync from caching bad responses
- **User Context Propagation**: Authenticated user information (globalUserId, email) is passed to resolvers via `resolverContext`

### Data Processing Rules

- **Batch Processing**: SQS records are processed in batches of 10-50 to optimize API calls and DynamoDB operations
- **Partial Failure Support**: Failed records are returned as `batchItemFailures` so SQS can retry them individually
- **Retry Strategy**: Failed operations retry up to 2 times with exponential backoff before alerting
- **FIFO Queue Ordering**: Account activity queue uses FIFO mode to preserve event ordering per user
- **Standard Queue for On-Demand**: On-demand scoring uses standard queue for lower latency (ordering not critical)
- **Date Extraction from S3**: Clustering/BotOrNot imports extract dates from S3 object keys using pattern `date=YYYY-MM-DD`
- **Stream-Based Orchestration**: DynamoDB streams (via Kinesis) provide event-driven coordination between workers

### Data Retention Rules

- **Rescore Record Expiration**: Rescore records expire 5 days after creation via DynamoDB TTL
- **Score History**: Previous scores are overwritten (not versioned) to minimize storage costs
- **ARAI Cache Freshness**: ARAI responses cached indefinitely; refreshed on each scoring cycle
- **ARM Score Staleness**: ARM scores are read-only; staleness depends on ARM team's Redis update frequency

---

## Terminology

| Term | Definition | Context |
|------|------------|---------|
| **ARAI** | Account Risk Activity Intelligence - Comprehensive risk data from TM Accounts API | Includes login history, device fingerprints, geolocation patterns, past fraud flags |
| **ARM** | Account Risk Management - Holistic risk scores (1-5) from dedicated ARM team | Separate scoring system maintained by ARM team, stored in dedicated Redis cluster |
| **SOTC** | Single Origin Token Cookie - Session token from TM Accounts representing authenticated user | Used for cross-domain authentication in Ticketmaster ecosystem |
| **Persona** | Third-party identity verification service | Provides liveness detection (selfie video analysis) and government ID verification |
| **Liveness Detection** | Biometric verification that a selfie video shows a real person (not photo/deepfake) | Uses facial analysis, motion detection, lighting patterns |
| **globalUserId** | Universal user identifier across Ticketmaster/LiveNation systems | Primary key for user identity (not email, which can change) |
| **Scorable Activity** | User actions that indicate account usage patterns relevant to fraud detection | Subset of all activities; excludes passive events like page views |
| **Rescore** | Recalculation of a user's risk score, typically triggered by significant events | Scheduled 5 days after purchases, registrations, queue joins |
| **Fan Identity Table** | DynamoDB table storing scores, ARAI cache, and rescore schedules | Primary data store for all worker state |
| **Account Activity Queue** | FIFO SQS queue for activities requiring ARAI lookup and scoring | Ensures ordered processing per user |
| **On-Demand Scoring Queue** | Standard SQS queue for real-time scoring (e.g., VerifiedFan login) | Non-FIFO for lower latency |
| **Middleware Pipeline** | Lambda execution framework providing input transformation, telemetry, service injection | Configured per worker via `middlewareType` (e.g., `kafkaConsumer`, `sqsConsumer`) |
| **Worker Type** | TypeScript type definition for Lambda function signature | Examples: `KafkaWorker`, `SQSWorker`, `AppSyncWorker` - provides compile-time safety |
| **Glue Workflow** | AWS Glue orchestration for data import ETL jobs | Triggered by S3 uploads of bot detection / clustering datasets |
| **AppSync Authorizer** | Lambda function invoked before every GraphQL request to validate authorization | Returns authorization decision + user context |
| **AppSync Resolver** | Lambda function that handles a specific GraphQL query/mutation | Receives user context from authorizer |
| **DynamoDB Stream** | Change data capture stream of DynamoDB table modifications | Triggers workers when scores/ARAI/rescores are added/updated/deleted |
| **Kinesis Consumer** | Worker that processes records from Kinesis stream | Used for VerifiedFan login events and DynamoDB stream (Kinesis mode) |
| **FIFO Queue** | First-In-First-Out queue preserving message order | Critical for account activity to maintain event sequence per user |
| **TTL** | Time To Live - DynamoDB feature that automatically deletes expired records | Used for rescore records to trigger delayed scoring |

---

## Data Models

### DynamoDB Schema - fan-identity-table

The `fan-identity-table` uses a single-table design with composite keys:

```
PK (Partition Key): "g:{globalUserId}"
SK (Sort Key): Varies by record type
```

#### Record Type: Score

```typescript
{
  PK: "g:12345",              // User identifier
  SK: "score#account",        // Fixed sort key for scores
  type: "score",              // Record type discriminator
  score: 0.342,               // Risk score (0-1 scale)
  version: "v2.1.3",          // ML model version
  dateCreated: "2025-01-15T10:30:00.000Z",
  dateUpdated: "2025-01-20T14:22:00.000Z"
}
```

#### Record Type: ARAI Cache

```typescript
{
  PK: "g:12345",
  SK: "arai:{timestamp}",     // Timestamped sort key
  type: "arai",
  globalUserId: "12345",
  araiResponse: {             // Full ARAI response from TM Accounts
    globalUserId: "12345",
    devices: [...],
    loginHistory: [...],
    fraudFlags: [...],
    // ... extensive account data
  },
  dateUpdated: "2025-01-20T14:20:00.000Z"
}
```

#### Record Type: Rescore Request

```typescript
{
  PK: "g:12345",
  SK: "rescore:2025-01-25",   // Date-based sort key
  type: "rescore",
  globalUserId: "12345",
  expiresOn: 1737849600,      // Unix timestamp for TTL
  dateUpdated: "2025-01-20T14:22:00.000Z"
}
```

**Notes**:
- All records for a user share the same partition key (`g:{globalUserId}`)
- Sort key differentiates record types
- TTL field (`expiresOn`) triggers automatic deletion for rescore records
- DynamoDB Streams (Kinesis mode) propagate changes to workers

---

### SQS Message Format - Account Activity Queue

```typescript
{
  MessageId: "abc-123-def-456",
  Body: JSON.stringify({
    globalUserId: "12345",
    action: "login",
    result: "success",
    timestamp: "2025-01-20T14:22:00.000Z",
    // ... additional activity metadata
  }),
  MessageAttributes: {
    // Optional attributes for filtering/routing
  },
  MessageGroupId: "12345",      // FIFO grouping by globalUserId
  MessageDeduplicationId: "unique-activity-id"
}
```

**Notes**:
- FIFO queue ensures activities for same user processed in order
- Deduplication prevents duplicate processing of same activity

---

### Kafka Event Schema - User Activity Stream

```json
{
  "globalUserId": "12345",
  "action": "update_email",
  "result": "success",
  "timestamp": 1705756920000,
  "metadata": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "deviceId": "device-abc-123"
  }
}
```

**Notes**:
- Uses Avro schema with Confluent Schema Registry
- Schema evolution managed centrally
- Multiple topics: user activity, purchases, SmartQueue journeys

---

### AppSync Authorization Response

```typescript
{
  isAuthorized: true,           // Allow/deny request
  resolverContext: {             // User context for resolvers
    isLoggedIn: true,
    globalUserId: "12345",
    email: "user@example.com",
    env: "prod"
  },
  ttlOverride?: 0                // Optional: prevent caching on errors
}
```

---

### Scoring Model Request/Response

**Request (ARAI data)**:
```typescript
[
  {
    globalUserId: "12345",
    devices: [...],
    loginHistory: [...],
    fraudFlags: [...]
  },
  // ... batch of users
]
```

**Response (scores)**:
```typescript
[
  0.342,  // Score for user 1
  0.789,  // Score for user 2
  // ... corresponding scores
]
```

**Notes**:
- Databricks serving endpoint expects ARAI format
- Returns array of scores in same order as input
- Scores range 0-1 (higher = more risky)

---

### ARM Redis Data Model

**Redis Key**: `user:{globalUserId}`

**Redis Value** (JSON string):
```json
{
  "global_user_id": "12345",
  "arm_risk": 3,              // 1-5 scale
  "timestamp": 1705756920,
  "score_date": "2025-01-20"
}
```

**Notes**:
- Maintained by ARM team, read-only for workers
- Workers validate `arm_risk` is 1-5, log warnings for invalid values

---

## Domain Relationships

### User → Risk Score (1:1)
- Each user has one current risk score (previous versions overwritten)
- Score identified by `PK=g:{globalUserId}, SK=score#account`

### User → ARAI Cache (1:Many)
- Users can have multiple ARAI cache entries (timestamped)
- Most recent used for scoring
- Older entries retained for audit (no automatic cleanup)

### User → Rescore Requests (1:Many)
- Users can have multiple pending rescores (different dates)
- Deduplication prevents multiple rescores for same date
- Expired rescores automatically deleted by TTL

### User Activity → ARAI Lookup (Many:1)
- Multiple activities trigger single ARAI fetch (deduplication)
- ARAI response cached for reuse

### ARAI Response → Risk Score (1:1)
- Each cached ARAI triggers one score calculation
- DynamoDB stream propagates ARAI insert to scoring worker

### Risk Score → Downstream Systems (1:Many)
- Single score consumed by multiple systems (demand, purchasing, admin tools)
- Consumers query DynamoDB directly for latest score

### Liveness Session → Liveness Events (1:Many)
- Session contains multiple events (video frames)
- Events processed sequentially to build liveness confidence

### Liveness Session → Liveness Decision (1:1)
- Session culminates in single decision (pass/fail)
- Decision stored by Persona, workers retrieve on demand

---

## Event Flow Diagrams

### Real-Time Scoring Flow
```
User Activity
    ↓
Kafka: user-activity-stream
    ↓
enqueueFromStream (filter)
    ↓
SQS: accountActivityQueue
    ↓
lookupArai (fetch + cache)
    ↓
DynamoDB: fan-identity-table
    ↓ (stream)
scoreUsers (ML inference)
    ↓
DynamoDB: fan-identity-table
    ↓
[Downstream consumers]
```

### Delayed Rescore Flow
```
Purchase/Registration Event
    ↓
enqueue* worker
    ↓
DynamoDB: create rescore (TTL=5 days)
    ↓
[5 days pass]
    ↓
DynamoDB TTL deletes record
    ↓ (stream REMOVE event)
processRescoreEvents
    ↓
SQS: accountActivityQueue
    ↓
[Standard scoring flow]
```

### Identity Verification Flow
```
GraphQL Request
    ↓
validateToken (authorize)
    ↓
handleEvent/checkLiveness (resolve)
    ↓
Persona API
    ↓
[Liveness decision]
    ↓
GraphQL Response
```
