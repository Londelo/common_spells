# API Contracts - fan-identity-workers

## Overview

This repository exposes Lambda-based APIs through AWS AppSync (GraphQL) and event-driven workers. Workers consume from AWS event sources (Kinesis, DynamoDB Streams, SQS, SNS) and process fan identity verification, bot detection, and user scoring.

---

## GraphQL Resolvers (AppSync)

### Authentication & Authorization

#### validateToken (Authorizer)

**Type**: `AppSyncAuthorizerWorker`
**File**: `apps/auth/validateToken/index.ts`

Lambda authorizer that validates API key and user tokens for AppSync GraphQL requests.

**Input**:
```typescript
type AuthorizerInput = {
  authorizationToken: string  // Format: "apiKey:sotc" where sotc is optional user token
  requestContext: {
    requestId: string
    queryString: string
    variables: Record<string, unknown>
  }
  requestHeaders: {
    tmuo?: string  // Ticketmaster User Origin header
  }
}
```

**Output**:
```typescript
type AuthorizerOutput = {
  isAuthorized: boolean
  resolverContext: ResolverContext
  ttlOverride?: number  // Set to 0 to disable caching on error
}

type ResolverContext = {
  isLoggedIn: boolean
  // When authenticated, includes:
  globalUserId?: string
  systemUserId?: string
  email?: string
  username?: string
  phoneNumber?: string
  firstName?: string
  lastName?: string
  postalCode?: string
  countryCode?: string
  accountTypes?: string
  memberId?: string
  env?: string
}
```

**Behavior**:
- Validates API key (first part of authorizationToken)
- If user token (sotc) present: Fetches user info from Ticketmaster Accounts service
- Returns `isLoggedIn: true` with user details on success
- Returns `isLoggedIn: false` if no token or token invalid (401 errors)
- Returns `ttlOverride: 0` on unexpected errors to prevent caching bad responses

---

### Identity Verification (IDV)

#### checkLiveness

**Type**: `AppSyncWorker`
**File**: `apps/idv/checkLiveness/index.ts`

Initiates or retrieves liveness verification sessions for users. Determines if verification is required based on configurable rules (tier, feature flags, verification history, risk scores).

**Arguments**:
```typescript
type CheckLivenessArguments = {
  options: LivenessRequest
  armScore?: number      // ARM risk score (1-5)
  accountScore?: number  // Account/fanscore (0.0-1.0)
}

type LivenessRequest = {
  tier: 'always' | 'high' | 'medium' | 'low' | 'asu' | 'test-always' | 'test-never'
  appId: string          // Application identifier
  subjectId: string      // Subject being verified (e.g., ticket transfer ID)
  verificationType?: 'selfie' | 'selfieAndGovID'  // Optional for ASU tier
}
```

**Returns**:
```typescript
type CheckLivenessResult =
  | { decision: LivenessDecision }
  | { error: LivenessError }

type LivenessDecision = {
  requiresVerification: boolean
  rule: string  // Rule that made the decision
  request: LivenessRequest
  details?: Record<string, unknown>
  verificationType?: 'selfie' | 'selfieAndGovID'
  token?: string  // JWT token (present if verification not required or completed)
  session?: LivenessSession  // Session details (present if verification required)
}

type LivenessSession = {
  id: string
  globalUserId: string
  status: 'created' | 'pending' | 'completed' | 'expired' | 'failed' | 'needs_review' | 'approved' | 'declined'
  ipAddress?: string
  vendorId: string
  vendorSessionId: string
  verificationType: 'selfie' | 'selfieAndGovID'
  date: {
    created?: Date
    pending?: Date
    completed?: Date
    approved?: Date
    declined?: Date
    failed?: Date
    expired?: Date
    updated: Date
    expiresAt: Date
    submitted?: Date
  }
  token?: string
}

type LivenessError = {
  __typename: string
  message: string
  name: string
  sessionId?: string
  expiresAt?: Date
}
```

**Behavior**:
- Evaluates rules engine to determine if verification required
- Returns token immediately if verification not required
- Reuses existing active sessions for multiple apps/subjects
- Creates new vendor session if needed
- Throws `LivenessCheckFailedError` if session in failed state (includes cooldown period)
- Returns bypass token if vendor API fails (failsafe behavior)

**Rule Evaluation**:
- `always`: Requires feature flag enabled
- `high`: Feature flag AND no completion in last 30 days
- `medium`: Feature flag AND no completion in last 90 days
- `low`: Feature flag OR fanscore < 0.5
- `asu`: Dynamic rule based on ARM risk score

---

#### handleEvent

**Type**: `AppSyncWorker`
**File**: `apps/idv/handleEvent/index.ts`

Processes webhook callbacks from IDV vendors (currently Persona). Updates session status and generates tokens for completed verifications.

**Arguments**:
```typescript
type LivenessEvent = {
  vendorId: string     // IDV vendor identifier
  payload: string      // JSON payload from vendor webhook
  signature?: string   // Webhook signature for validation
}
```

**Returns**:
```typescript
type HandleEventResult = LivenessSession | null

// Returns null if event is invalid or cannot be processed
// Returns updated LivenessSession on success
```

**Behavior**:
- Validates webhook signature from vendor
- Parses vendor payload into session update
- Retrieves existing session from database
- Merges callback data (status changes, timestamps)
- Generates JWT token if session completed/approved
- Handles out-of-order events (ignores stale updates)

---

### User Scoring

#### getArmScore

**Type**: `AppSyncWorker`
**File**: `apps/scoring/getArmScore/index.ts`

Retrieves the ARM (Account Risk Model) risk score for a user from Redis cache.

**Arguments**:
```typescript
type GetArmScoreArguments = {
  globalUserId: string  // Global user identifier
}
```

**Returns**:
```typescript
type ArmScoreResult = {
  armScore: number | null  // 1-5 risk score (1=lowest risk, 5=highest risk), null if not found
}
```

**Behavior**:
- Queries ARM Redis cache with key `user:{globalUserId}`
- Validates score is between 1-5
- Returns null if user not found or score invalid
- Logs warnings for invalid score values

**Environment Requirements**:
- `ARM_REDIS_URL`: Primary ARM Redis cluster URL
- `ARM_REDIS_READ_ONLY_URL` (optional): Read-only ARM Redis cluster URL

---

## Event-Driven Workers (Lambda)

### Kinesis Stream Workers

Workers that consume from Kinesis streams and process records.

#### scoreUsers

**Type**: `KinesisWorker<DynamoDbChangeRecord, processedResult>`
**File**: `apps/scoring/scoreUsers/index.ts`

Processes DynamoDB stream changes containing ARAI (Account Risk Activity Indicator) responses and calculates user account scores.

**Input**:
```typescript
type DynamoDbChangeRecord = {
  newItem: {
    araiResponse: UserAccountActivity
  }
}

type UserAccountActivity = {
  globalUserId: string
  firstName: string
  lastName: string
  emailAddress: string
  phoneNumber: string
  phoneNumberType: string
  phoneNumberCountry: string
  // ... additional user activity fields
}
```

**Output**:
```typescript
type processedResult = {
  processed: number
  errors: number
  // ... additional processing metrics
}
```

**Behavior**:
- Extracts ARAI responses from DynamoDB change records
- Invokes scoring model service to calculate risk scores
- Persists scores to fan identity DynamoDB table

---

#### enqueueFromVfStream

**Type**: `KinesisWorker<VfUserLogInActivity, EnqueueFromVfStreamOutput>`
**File**: `apps/scoring/enqueueFromVfStream/index.ts`

Consumes VerifiedFan user login activity from Kinesis stream and enqueues users with global IDs for on-demand scoring.

**Input**:
```typescript
type VfUserLogInActivity = {
  globalUserId?: string
  // ... additional activity fields
}
```

**Output**:
```typescript
type EnqueueFromVfStreamOutput = {
  in: number         // Total records received
  rejected: number   // Records without globalUserId
  // ... SQS send results
}
```

**Behavior**:
- Filters activities to only those with `globalUserId`
- Sends scorable activities to on-demand scoring SQS queue
- Returns metrics on accepted/rejected records

---

#### enqueueFromStream

**Type**: `KinesisWorker<UserActivity, EnqueueFromStreamOutput>`
**File**: `apps/scoring/enqueueFromStream/index.ts`

Generic stream consumer for user activity events. Filters scorable actions and enqueues for processing.

**Input**:
```typescript
type UserActivity = {
  action?: string        // e.g., 'login', 'create_account', 'update_email'
  result?: string        // e.g., 'success', 'failure'
  globalUserId?: string
  // ... additional activity fields
}

// Scorable actions: add_phone, create_account, login, reset_password,
//                   update_account, update_email, update_phone, verify_otp, verify_otp_mfa
```

**Output**:
```typescript
type EnqueueFromStreamOutput = {
  in: number         // Total records received
  rejected: number   // Records that are not scorable
}
```

---

#### enqueueFromDemandStream

**Type**: `KinesisWorker`
**File**: `apps/scoring/enqueueFromDemandStream/index.ts`

Consumes demand/inventory events from Kinesis and enqueues user activities for scoring.

---

#### enqueueFromPurchaseStream

**Type**: `KinesisWorker`
**File**: `apps/scoring/enqueueFromPurchaseStream/index.ts`

Consumes purchase transaction events from Kinesis stream and enqueues successful purchases with global user IDs for scoring.

**Input**:
```typescript
type PurchaseActivity = {
  status?: 'SUCCESS' | 'FAILED'
  customer?: {
    globalUserId?: string
    // ... customer details
  }
  // ... purchase details
}
```

**Behavior**:
- Filters to only SUCCESS purchases with globalUserId
- Enqueues scorable purchase activities to account activity queue

---

#### enqueueFromSQJourneyStream

**Type**: `KinesisWorker`
**File**: `apps/scoring/enqueueFromSQJourneyStream/index.ts`

Consumes SeatGeek Journey events from Kinesis stream for user scoring pipeline.

---

#### processRescoreEvents

**Type**: `KinesisWorker`
**File**: `apps/scoring/processRescoreEvents/index.ts`

Processes rescore events triggered by manual requests or scheduled jobs.

---

#### stagingScoreUsers

**Type**: `KinesisWorker`
**File**: `apps/scoring/stagingScoreUsers/index.ts`

Staging environment version of the scoring worker for testing scoring model changes.

---

### SQS Queue Workers

#### lookupArai

**Type**: `SQSWorker`
**File**: `apps/scoring/lookupArai/index.ts`

Consumes messages from SQS queue, looks up ARAI (Account Risk Activity Indicator) data from Ticketmaster Accounts service, and persists to DynamoDB.

**Input**:
```typescript
type GlobalUserIdActivityMessage = UserActivity & {
  globalUserId: string
  shouldRetry?: boolean
  __meta: any
}
```

**Behavior**:
- Fetches user account activity from TM Accounts service
- Stores ARAI response in DynamoDB table
- Triggers downstream scoring via DynamoDB streams
- Supports retry on failure via `shouldRetry` flag

---

### Other Workers

#### startBotOrNotImport

**Type**: Lambda worker
**File**: `apps/botornot/startBotOrNotImport/index.ts`

Initiates bot detection data import jobs.

---

#### startClusterImport

**Type**: Lambda worker
**File**: `apps/clustering/startClusterImport/index.ts`

Initiates user clustering/segmentation data import jobs.

---

## Shared Types

### Worker Base Types

All workers are typed using generic `Worker<Event, Result, Services>` signature:

```typescript
type Worker<Event = unknown, Result = void, Services = unknown> =
  WorkerWithoutInputTransformation<Event, Result, Services>
  | WorkerWithInputTransformation<Event, Result, Services>

type WorkerWithoutInputTransformation<Event, Services> = {
  input: {
    event: Event
    context: Context  // AWS Lambda context
  }
  Services: Services
  correlation: {
    id: string
    awsRequestId: string
  }
}

type WorkerWithInputTransformation<Event, Services> = {
  input: Event  // Event already transformed by middleware
  Services: Services
  jwt?: string
}
```

---

### Transformed Event Types

Middleware transforms AWS events into normalized formats:

```typescript
// Kinesis records
type TransformedKinesisMessage<Message> = Message & {
  __meta: any  // Original AWS record metadata
}

// SQS messages
type TransformedSQSRecord<Message> = Message & {
  shouldRetry?: boolean
  __meta: any
}

// Kafka messages
type TransformedKafkaMessage<Message> = Message & {
  topic: string
  offset: number
  timestamp: number
  key?: string
  value: Record<string, unknown>
}

// S3 objects
type TransformedS3Object = {
  body: Record<string, unknown>
  s3TriggerObjectKey: string
}
```

---

### Service Dependencies

Workers receive injected services via middleware:

```typescript
type Services = {
  aws: {
    fanIdentityTable: DynamoDbClient
    sqsClient: SQSClient
  }
  request: HttpClient
  identity: IdentityService
  features: FeatureFlagService
  tmAccounts: TmAccountsService
  scoringModel: ScoringModelService
  stagingScoringModel: ScoringModelService
  accountActivityQueueManager: QueueManager
  onDemandScoringQueueManager: QueueManager
}
```

---

### Identity Service Types

```typescript
type IdentityService = {
  checkLiveness: (options: LivenessOptions) => Promise<LivenessDecision>
  handleEvent: (event: LivenessEvent) => Promise<LivenessSession | null>
}

type LivenessOptions = LivenessRequest & ScoringFields & {
  globalUserId: string
  firstName?: string
  lastName?: string
}

type ScoringFields = {
  armScore?: number      // 1-5 (1=lowest risk, 5=highest risk)
  accountScore?: number  // 0.0-1.0 (fanscore)
}
```

---

## Middleware Types

Workers are configured with middleware types that determine event transformation and result handling:

| Middleware Type | Input Source | Output Format |
|----------------|--------------|---------------|
| `KINESIS_CONSUMER` | Kinesis stream | Array of records |
| `DYNAMODB_CONSUMER` | DynamoDB stream | Array of change records |
| `DYNAMODB_KINESIS_CONSUMER` | DynamoDB via Kinesis | Array of change records |
| `SQS_CONSUMER` | SQS queue | Array of messages with retry support |
| `KAFKA_CONSUMER` | Kafka topic | Array of messages |
| `S3_CONSUMER` | S3 events | S3 object metadata |
| `SNS_SUBSCRIBER` | SNS topic | SNS message |
| `FIREHOSE_PROCESSOR` | Kinesis Firehose | Transformed records |
| `APPSYNC_RESOLVER` | AppSync GraphQL | `{ data?, error?, errors? }` |
| `APPSYNC_AUTHORIZER` | AppSync auth | `{ isAuthorized, resolverContext, ttlOverride? }` |
| `SCHEDULED` | EventBridge | Scheduled event |
| `SDK_INVOKED` | Direct invocation | Custom payload |
| `FANOUT_CONTROLLER` | Fan-out pattern | Parallel execution results |

---

## Error Types

### Identity Verification Errors

```typescript
// Base error type
class IDVError extends Error {
  name: string
  type: IDVErrorType
  metadata?: Record<string, unknown>
}

type IDVErrorType = {
  name: string
  code: string
}

// Specific error types
class LivenessCheckFailedError extends IDVError {
  metadata: {
    sessionId: string
    expiresAt: Date
  }
}

class SessionNotFoundError extends IDVError {}
class SignatureValidationFailedError extends IDVError {}
class VendorRequestFailedError extends IDVError {}
class SessionEventOutOfOrderError extends IDVError {}
class InvalidEventError extends IDVError {}
```

---

## Response Formats

### AppSync Resolver Output

All AppSync resolvers return:

```typescript
type AppSyncOutput<Result> = {
  error?: AppSyncError
  errors?: AppSyncError[]
  data?: Result
}

type AppSyncError = {
  message: string
  errorType: string
  data?: Record<string, unknown>
  errorInfo?: Record<string, unknown>
}
```

### SQS Batch Response

SQS workers can return failed items for retry:

```typescript
type SQSResultHandlerOutput<Result> = Result & {
  unprocessed: TransformedSQSRecord[]
}
```

---

## Configuration

Workers are configured via environment-specific YAML files in `configs/`:

- `default.config.yml` - Base configuration
- `local-dev.config.yml` - Local development overrides
- `dev.config.yml`, `qa.config.yml`, `preprod.config.yml`, `prod.config.yml`, `prodw.config.yml` - Environment-specific

Configuration accessed via Immutable.js: `config.getIn(['path', 'to', 'value'])`
