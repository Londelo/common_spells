# Data Flow - ccpa-workers

## Primary Flow

**CCPA Privacy Request Processing**

This repository implements a distributed privacy request processing system for CCPA compliance. The flow begins with a privacy request from an external Privacy Core platform (Kafka), routes through a request processor, and fans out to specialized workers via SQS queues.

```
Privacy Core Platform (Kafka)
          ↓
    [processRequest Worker]
    (SDK-invoked Lambda)
          ↓
    Route by Request Type
          ↓
    ┌─────┴─────┬─────────┬──────────┬─────────┐
    ↓           ↓         ↓          ↓         ↓
fanInfoQueue  keepPrivate optOut   deleteFan  saveDisclosures
    ↓         Queue     Queue      Queue       Queue
    ↓           ↓         ↓          ↓         ↓
[fanInfo]  [keepPrivate] [optOut] [deleteFan] [saveDisclosures]
  Worker      Worker      Worker    Worker       Worker
    ↓           ↓         ↓          ↓         ↓
    └─────┬─────┴─────────┴──────────┴─────────┘
          ↓
    Privacy Core Platform (Kafka)
    (Response Published)
```

## Request/Response Cycle

### 1. Initial Request Reception (processRequest Worker)

**Trigger**: SDK invocation (likely from API Gateway or another Lambda)

**Input**:
```javascript
{
  event: {
    requestType: "ERASE" | "GET_INFO" | "DO_NOT_SELL" | "UNSUBSCRIBE",
    fanIdentity: { id: "user@example.com" | "memberId" },
    // ... Privacy Core request payload
  },
  context: { ... }  // Lambda context
}
```

**Processing Steps**:
1. **Correlation Middleware**: Generate correlation ID for request tracing
2. **Tracing Middleware**: Start OpenTelemetry span
3. **Services Middleware**: Inject AWS clients, HTTP clients, MongoDB
4. **Authentication Middleware**: Validate JWT token from request
5. **Business Logic**:
   - Extract user ID from `fanIdentity.id`
   - Lookup user in TM Users service → Fall back to AccountFanscore DynamoDB if not found
   - Determine target queue based on `requestType`
   - Send message(s) to appropriate SQS queue
   - Handle preflight checks (for ERASE_PREFLIGHT_CHECK)
6. **Result Handler**: Return success/failure status

**Output**:
```javascript
{
  userIdFound: true,
  queued: "deleteFanQueue",
  requestType: "ERASE",
  queuedCount: 1
}
```

**Routing Logic**:
```javascript
REQUEST_TYPE_QUEUE = {
  GET_INFO → fanInfoQueue
  DO_NOT_SELL → keepPrivateQueue
  UNSUBSCRIBE → optOutQueue
  ERASE → deleteFanQueue
}
```

### 2. Queue-Based Worker Processing (deleteFan, fanInfo, keepPrivate, optOut)

**Trigger**: SQS message arrival

**Middleware Pipeline** (SQS Consumer Type):
1. **Correlation Middleware**: Extract correlation ID from message attributes
2. **Tracing Middleware**: Continue trace from parent span
3. **Transform SQS Records**: Parse SQS event into individual messages
4. **Set Record Correlations**: Track individual message processing
5. **Services Middleware**: Inject dependencies
6. **Authentication Middleware**: Extract JWT from message
7. **Worker Business Logic**: Execute privacy request action
8. **SQS Result Handler**: Handle batch partial failures, retry logic

**Input Format** (from SQS):
```javascript
{
  Records: [
    {
      body: {
        userId: "123",
        memberId: "member123",
        globalUserId: "global123",
        email: "user@example.com",
        requestEvent: { /* original Privacy Core payload */ }
      },
      messageAttributes: { correlationId: "..." }
    }
  ]
}
```

### 3. Worker-Specific Processing

#### A. fanInfo Worker (GET_INFO)

**Purpose**: Retrieve and return user's personal information

**Data Sources**:
- VF Entries Service (HTTP): User's campaign entries

**Processing**:
1. Call Entries service to fetch user entries: `entries.getUserEntries({ jwt, userId })`
2. Format PII data from entries: `formatPIIData({ userEntries, userId })`
3. Publish response to Privacy Core with PII data

**Output**:
```javascript
{
  entries: 42,
  piiTypes: { email: 5, phone: 2, address: 3 }
}
```

#### B. deleteFan Worker (ERASE)

**Purpose**: Delete or flag user data across all systems

**Data Targets**:
- DynamoDB: `verificationTable` (delete records)
- DynamoDB: `demandTable` (delete records)
- DynamoDB: `acctFanscoreTable` (flag as deleted)
- DynamoDB: `fanIdentityTable` (flag records)
- VF Users Service (HTTP): Delete user account

**Processing**:
1. Remove from verification table: `removeFromVerificationTable({ ids, verificationTable })`
2. Flag account fanscore: `flagAccountFanscore({ memberId, Services })`
3. Flag identity records: `flagIdentityRecords({ globalUserId, Services })`
4. Delete VF user: `users.deleteFan({ jwt, userId })`
5. Remove from demand table: `removeFromDemandTable({ ids, demandTable })`
6. Publish success/failure to Privacy Core

**Output**:
```javascript
{
  ids: { memberId, globalUserId, userId },
  userDeleted: true,
  acctFanscoreFlagged: 1,
  counts: {
    registration: { profiles: 1, sessions: 5 },
    dynamo: { verification: 2, demand: 3, identity: 1 }
  }
}
```

#### C. keepPrivate Worker (DO_NOT_SELL)

**Purpose**: Opt user out of data selling

**Data Sources**: (Implementation not fully visible, likely similar to optOut)

#### D. optOut Worker (UNSUBSCRIBE)

**Purpose**: Unsubscribe user from communications

**Data Sources**: (Implementation not fully visible)

#### E. saveDisclosures Worker

**Purpose**: Save disclosure data to Privacy Core

**Trigger**: SDK invocation

#### F. updateDictionary Worker

**Purpose**: Update data dictionary in Privacy Core

**Trigger**: SDK invocation

### 4. Response Publishing (All Workers)

**All workers publish results back to Privacy Core via Kafka**:

**Success Response**:
```javascript
await privacyCore.publishPrivacyResponse({
  payload: requestEvent,    // Original request
  piiData: { ... },         // Optional: For fanInfo
  isPreFlight: false        // Optional: For preflight checks
});
```

**Error Response**:
```javascript
await privacyCore.publishPrivacyResponse({
  payload: requestEvent,
  error: true
});
```

**Privacy Core Service**:
- **Location**: `shared/services/privacyCore/`
- **Protocol**: Kafka via HTTP REST proxy
- **Topics**:
  - `privacy-request-status-update` (responses)
  - `datadictionary` (dictionary updates)
  - `disclosure-event` (disclosure data)

## State Management

**Stateless Workers**: All workers are stateless Lambda functions. State persisted in:
- **DynamoDB Tables**: User data, verification records, demand records, fanscore
- **External Services**: User profiles (Users service), campaign entries (Entries service)
- **Privacy Core Platform**: Request/response audit trail

**Correlation Tracking**:
- Each request assigned a correlation ID at entry point
- Correlation ID propagated through:
  - SQS message attributes
  - OpenTelemetry trace context
  - CloudWatch logs (structured logging)
- Enables end-to-end request tracing across workers

## Event Processing

### SQS-Based Workers

**Message Processing**:
1. Lambda receives batch of up to 10 SQS messages
2. Middleware transforms batch into individual records
3. Worker processes each record independently
4. Result handler collects individual results
5. Partial batch failures handled via SQS visibility timeout

**Retry Logic**:
- **maxRetryCount**: Configured per worker (e.g., 5 for deleteFan)
- **Dead Letter Queue**: Messages exceeding retry count sent to DLQ
- **Visibility Timeout**: Failed messages automatically retried by SQS

**Example Config**:
```yaml
deleteFan:
  middlewareType: sqsConsumer
  queueName: deleteFanQueue
  maxRetryCount: 5
```

### SDK-Invoked Workers

**Direct Invocation**:
- No queue intermediary
- Synchronous processing
- Immediate response to caller
- Used for orchestration (processRequest) and API-driven actions (updateDictionary, saveDisclosures)

**Example Workers**:
- `processRequest`: Routes incoming requests to queues
- `updateDictionary`: Updates Privacy Core data dictionary
- `saveDisclosures`: Saves disclosure data

## External Integrations

| Integration | Direction | Protocol | Purpose |
|-------------|-----------|----------|---------|
| **Privacy Core** | Bidirectional | Kafka (via HTTP REST) | Receive requests, publish responses |
| **VF Users Service** | Outbound | HTTP/REST | User lookup, deletion |
| **VF Entries Service** | Outbound | HTTP/REST | Fetch user campaign entries |
| **VF Campaigns Service** | Outbound | HTTP/REST | Campaign data retrieval |
| **DynamoDB Tables** | Read/Write | AWS SDK | Data persistence |
| - verificationTable | Read/Write | AWS SDK | Email verification records |
| - demandTable | Read/Write | AWS SDK | Demand/inventory records |
| - acctFanscoreTable | Read/Write | AWS SDK | User fanscore data |
| - fanIdentityTable | Read/Write | AWS SDK | User identity mapping |
| **MongoDB** | Read/Write | MongoDB Wire Protocol | Campaign data storage |
| **SQS Queues** | Write → Read | AWS SDK | Inter-worker messaging |
| **Secrets Manager** | Read | AWS SDK | Certificate and credential retrieval |
| **CloudWatch** | Outbound | AWS SDK | Structured logging |
| **OpenTelemetry** | Outbound | OTLP/HTTP | Distributed tracing |
| **Slack** | Outbound | HTTP/REST | Alerting (cert expiration) |

## Data Flow Patterns

### Fan-Out Pattern (processRequest → Specialized Workers)

**Trigger**: Single privacy request
**Outcome**: Multiple SQS messages if user has multiple identities

Example: User with 3 identity records → 3 messages sent to target queue → 3 parallel worker executions

### Batch Processing Pattern (SQS Workers)

**Trigger**: SQS delivers batch of messages
**Processing**: Each message processed independently within single Lambda invocation
**Result**: Partial batch failures returned to SQS for retry

### Request-Response Pattern (Privacy Core Integration)

**Flow**:
1. Privacy Core publishes request → Kafka
2. System processes request → Multiple workers
3. Workers publish responses → Kafka (Privacy Core listens)
4. Privacy Core aggregates responses → Updates request status

### Fallback Pattern (User ID Resolution)

**Primary Source**: TM Users Service (HTTP)
↓ (on failure or not found)
**Fallback Source**: AccountFanscore DynamoDB
↓ (on failure or not found)
**Minimal Data**: Construct minimal user object from provided ID

## Performance Characteristics

**Concurrency**:
- Each worker Lambda can handle up to 10 SQS messages per invocation
- Lambda reserved concurrency configured per worker
- Horizontal scaling via Lambda concurrency limits

**Latency Targets**:
- **processRequest**: < 5 seconds (includes user lookup + queue send)
- **SQS Workers**: < 30 seconds per message (includes external service calls)
- **Privacy Core Response**: Published asynchronously (non-blocking)

**Throughput**:
- Limited by SQS queue throughput (nearly unlimited)
- Limited by downstream service rate limits (Users, Entries services)
- DynamoDB provisioned throughput per table

**Error Handling**:
- **Transient Failures**: Automatic retry via SQS (up to maxRetryCount)
- **Permanent Failures**: Send to DLQ, publish error to Privacy Core
- **Partial Failures**: Batch processing allows individual message retry
