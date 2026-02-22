# Type Definitions - fan-identity-workers

## TypeScript Types

### Core Type Categories

This repository contains TypeScript type definitions organized by domain:
- **Worker Types** - Lambda function signatures and middleware types
- **Identity/IDV Types** - Identity verification session, decision, and rule types
- **Scoring Types** - User activity and scoring model types
- **Service Types** - AWS, API, and third-party service types
- **Configuration Types** - Configuration and logging types

---

## Worker Types

### Worker<Event, Result, Services>
**Category:** TypeScript Type Alias

```typescript
export type Worker<Event = unknown, Result = void, Services = unknown> =
  WorkerWithoutInputTransformation<Event, Result, Services>
  | WorkerWithInputTransformation<Event, Result, Services>
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Generic worker type representing a Lambda function handler. Type parameters provide compile-time guarantees for input/output shapes across middleware pipeline.

**Type Parameters:**
- `Event` - Input event type (e.g., SQS message, Kinesis record)
- `Result` - Return type
- `Services` - Injected services object

**Variants:**
- [WorkerWithoutInputTransformation](#workerwithouttransformation) - Raw event preserved in `input.event`
- [WorkerWithInputTransformation](#workerwithinputtransformation) - Event lifted to `input` property

---

### WorkerWithoutInputTransformation<Event, Result, Services>
**Category:** TypeScript Type Alias

```typescript
export type AppParamsWithoutInputTransformation<Event, Services> = {
  input: {
    event: Event
    context: Context
  }
  Services: Services
  correlation: Correlation
}

export type WorkerWithoutInputTransformation<Event, Result = unknown, Services = unknown> =
  (input: AppParamsWithoutInputTransformation<Event, Services>) => Promise<Result>
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker variant where middleware preserves the raw event in `input.event` and provides correlation ID.

**Used By:**
- AppSync resolvers and authorizers
- Workers requiring access to Lambda context

---

### WorkerWithInputTransformation<Event, Result, Services>
**Category:** TypeScript Type Alias

```typescript
type AppParamsWithInputTransformation<Event, Services> = {
  input: Event
  Services: Services
  jwt?: string
}

export type WorkerWithInputTransformation<Event, Result = unknown, Services = unknown> =
  (input: AppParamsWithInputTransformation<Event, Services>) => Promise<Result>
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker variant where middleware transforms the event and lifts it directly to `input` property.

**Used By:**
- SQS consumers
- Kinesis consumers
- Kafka consumers
- Most event-driven workers

---

### SQSWorker<Message, Result, Services>
**Category:** TypeScript Type Alias

```typescript
export type SQSWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<TransformedSQSRecord<Message>[], SQSResultHandlerOutput<Result>, Services>

export type TransformedSQSRecord<Message = unknown> = Message & {
  shouldRetry?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __meta: any
}

export type SQSResultHandlerOutput<Result = unknown> = Result & {
  unprocessed: TransformedSQSRecord[]
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Specialized worker type for SQS message processing. Input is an array of transformed SQS records. Output includes unprocessed records for retry.

**Key Fields:**
- `shouldRetry` - Flag to mark message for retry
- `__meta` - Metadata from original SQS record
- `unprocessed` - Records to return to SQS for retry

**Used By:**
- `apps/scoring/enqueueFromStream`
- `apps/scoring/scoreUsers`
- Most SQS-based workers

---

### KinesisWorker<Message, Result, Services>
**Category:** TypeScript Type Alias

```typescript
export type KinesisWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<TransformedKinesisMessage<Message>[], Result, Services>

export type TransformedKinesisMessage<Message = unknown> = Message & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __meta: any
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Specialized worker type for Kinesis stream processing. Input is an array of transformed Kinesis records.

**Used By:**
- `apps/scoring/enqueueFromDemandStream`
- `apps/scoring/enqueueFromPurchaseStream`
- `apps/scoring/enqueueFromVfStream`

---

### AppSyncWorker<Arguments, Result, Services>
**Category:** TypeScript Type Alias

```typescript
export type AppSyncWorker<Arguments, Result, Services = unknown> =
  WorkerWithoutInputTransformation<AppSyncResolverEvent<Arguments>, AppSyncOutput<Result>, Services>

export type AppSyncOutput<Result> = {
  error?: AppSyncError
  errors?: AppSyncError[]
  data?: Result
}

export type AppSyncError = {
  message: string
  errorType: string
  data?: Record<string, unknown>
  errorInfo?: Record<string, unknown>
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker type for AppSync GraphQL resolvers. Input includes resolver event with arguments. Output follows AppSync error format.

---

### AppSyncAuthorizerWorker<Result, Services>
**Category:** TypeScript Type Alias

```typescript
export type AppSyncAuthorizerWorker<Result, Services = unknown> = WorkerWithoutInputTransformation<
  AppSyncAuthorizerEvent & AppSyncAuthorizerRequestHeaders,
  AppSyncAuthorizerResult<Result>,
  Services
>

export type AppSyncAuthorizerRequestHeaders = {
  requestHeaders: Record<string, string>
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker type for AppSync authorization handlers. Validates tokens and returns resolver context.

**Used By:**
- `apps/auth/validateToken`

**Returns:** [ResolverContext](#resolvercontext)

---

### KafkaWorker<Message, Result, Services>
**Category:** TypeScript Type Alias

```typescript
export type KafkaWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<TransformedKafkaMessage<Message>[], Result, Services>

export type TransformedKafkaMessage<Message = unknown> = Message & {
    topic: string,
    offset: number,
    timestamp: number,
    key?: string,
    value: Record<string, unknown>
  }
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker type for Kafka message processing. Input includes Kafka metadata (topic, offset, timestamp).

---

### TransformedS3Object
**Category:** TypeScript Type Alias

```typescript
export type TransformedS3Object = {
  body: Record<string, unknown>,
  s3TriggerObjectKey: string
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Transformed S3 event object for S3-triggered workers.

---

## Identity/IDV Types

### LivenessOptions
**Category:** TypeScript Type Alias

```typescript
export type LivenessOptions = LivenessRequest & ScoringFields & {
  globalUserId: string
  firstName?: string
  lastName?: string
}

export type LivenessRequest = {
  tier: LivenessTier
  appId: string
  subjectId: string
  verificationType?: VerificationType
}

export type ScoringFields = {
  armScore?: number
  accountScore?: number
}

export type LivenessTier = 'always' | 'high' | 'medium' | 'low' | 'asu' | 'test-always' | 'test-never'

export type VerificationType = 'selfie' | 'selfieAndGovID'
```

**Exported From:** `shared/services/identity/session.ts`

**Description:** Input parameters for identity verification check. Combines user identity, verification tier, app context, and optional scoring data.

**Key Fields:**
- `globalUserId` - Unique user identifier
- `tier` - Verification requirement level (determines rule set applied)
- `appId` - Application requesting verification
- `subjectId` - Subject/context within app (e.g., event ID)
- `verificationType` - Type of verification required (optional, determined by tier for ASU)
- `armScore` - Account Risk Model score (optional)
- `accountScore` - Fan scoring model score (optional)

**Used By:**
- [CheckLiveness](#checkliveness) - Main entry point for verification checks
- [LivenessRules](#livenessrules) - Rule evaluation

---

### LivenessDecision
**Category:** TypeScript Type Alias

```typescript
export type LivenessDecisionAttributes = {
  requiresVerification: boolean
  rule: string
  request: LivenessRequest
  details?: Record<string, unknown>
  verificationType?: VerificationType
}

export type LivenessDecision = LivenessDecisionAttributes & {
  token?: string
  session?: LivenessSession
}
```

**Exported From:** `shared/services/identity/session.ts`

**Description:** Result of liveness check including rule decision, optional session, and optional token.

**Key Fields:**
- `requiresVerification` - Whether rules determined verification is needed
- `rule` - Rule name that made the decision
- `request` - Original request context
- `token` - JWT token (present if verification not required OR if completed OR vendor failsafe)
- `session` - Verification session (present if verification required and session created/retrieved)

**Decision Scenarios:**
1. **Verification not required**: `requiresVerification: false`, `token` present, `session` absent
2. **Verification required, new session**: `requiresVerification: true`, `session` present, `token` absent
3. **Verification required, existing approved session**: `requiresVerification: true`, `session` and `token` present
4. **Vendor failsafe**: `requiresVerification: true`, `token` present, `session` absent (indicates vendor bypass)

**Returned By:**
- [CheckLiveness](#checkliveness)

---

### LivenessSession
**Category:** TypeScript Type Alias

```typescript
export type LivenessSession = LivenessSessionAttributes & {
  id: string
  token?: string
}

export type LivenessSessionAttributes = {
  globalUserId: string
  status: LivenessSessionStatus
  ipAddress?: string
  vendorId: string
  vendorSessionId: string
  verificationType: VerificationType
  date: Partial<Record<LivenessSessionStatus, Date>> & { updated: Date, expiresAt: Date, submitted?: Date }
}

export type LivenessSessionStatus =
  'created' |
  'pending' |
  'completed' |
  'expired' |
  'failed' |
  'needs_review' |
  'approved' |
  'declined'
```

**Exported From:** `shared/services/identity/session.ts`

**Description:** Complete identity verification session record with status, timestamps, and metadata.

**Status Flow:**
- Success path: `created` → `pending` → `completed` → `approved`
- Failure paths: `created` → `pending` → `failed`/`declined`/`expired`
- Review path: `created` → `pending` → `needs_review` → `approved`/`declined`

**Expiration Policy:**
- Active sessions (`created`, `pending`, `needs_review`): 1 day
- Completed/approved sessions: 1 hour
- Failed/declined sessions: 1 hour
- Expired sessions: 0 hours

**Key Functions:**
- `isApproved(session)` - Checks if successfully completed
- `isFailed(session)` - Checks if failed
- `isResumable(session)` - Checks if can be resumed
- `hasDecision(decisions, decision)` - Checks for duplicate decisions

---

### LivenessEvent
**Category:** TypeScript Type Alias

```typescript
export type LivenessEvent = {
  vendorId: string
  payload: string
  signature?: string
}
```

**Exported From:** `shared/services/identity/session.ts`

**Description:** Webhook event payload from IDV vendor containing session updates.

**Used By:**
- [HandleLivenessEvent](#handlelivenesse vent) - Processes vendor callbacks

---

### IDVVendorSession
**Category:** TypeScript Type Alias

```typescript
export type IDVVendorSession = {
  status: LivenessSessionStatus
  statusTimestamp: Date
  ipAddress?: string
  vendorId: string
  vendorSessionId: string
  globalUserId: string
}
```

**Exported From:** `shared/services/identity/vendor/index.ts`

**Description:** Vendor-specific session data structure. Abstract representation of vendor session state.

**Transforms To:** [LivenessSessionAttributes](#livenesssession) via `newSession()`

**Used By:**
- [IDVVendor](#idvvendor) interface methods
- `newSession()` - Creates session from vendor response
- `mergeSession()` - Updates session with vendor callback

---

### IDVVendor
**Category:** TypeScript Interface

```typescript
export interface IDVVendor {
  vendorId: string
  createSession(
    globalUserId: string,
    verificationType: VerificationType,
    firstName?: string,
    lastName?: string
  ): Promise<IDVVendorSession>
  fetchSession(vendorSessionId: string): Promise<IDVVendorSession>
  handleEvent(event: LivenessEvent): Promise<IDVVendorSession>
  validateSignature(event: LivenessEvent): ValidateSignatureResponse
}

export type ValidateSignatureResponse = {
  isValid: boolean
  error?: string
}
```

**Exported From:** `shared/services/identity/vendor/index.ts`

**Description:** Abstract interface for identity verification vendors. Implementations handle vendor-specific API integration.

**Implemented By:**
- `PersonaIDVVendor` - Persona identity verification provider

**Methods:**
- `createSession()` - Initiate new verification session with vendor
- `fetchSession()` - Retrieve current session state from vendor
- `handleEvent()` - Parse webhook callback into vendor session
- `validateSignature()` - Verify webhook authenticity

---

### IdentityDB
**Category:** TypeScript Interface

```typescript
export type LivenessCheckRecords = {
  session: LivenessSession
  decisions: LivenessDecisionAttributes[]
}

export type LivenessSessionKeys = {
  globalUserId: string
  vendorId: string
  vendorSessionId: string
}

export interface IdentityDB {
  getSession(keys: LivenessSessionKeys): Promise<LivenessCheckRecords | null>
  getCurrentSession(globalUserId: string, verificationType: VerificationType): Promise<LivenessCheckRecords | null>
  getLastApprovedSession(globalUserId: string): Promise<LivenessCheckRecords | null>
  getFailedSessions(globalUserId: string, subjectId: string): Promise<LivenessSession[]>
  putSession(session: LivenessSessionAttributes, decision: LivenessDecisionAttributes): Promise<LivenessCheckRecords>
  updateSession(session: LivenessSessionAttributes): Promise<void>
  addDecision(session: LivenessSessionAttributes, decision: LivenessDecisionAttributes): Promise<void>
  getScore(globalUserId: string): Promise<number | null>
}
```

**Exported From:** `shared/services/identity/db/index.ts`

**Description:** Database interface for identity session and score persistence. Abstracts DynamoDB operations.

**Key Methods:**
- `getSession()` - Lookup by vendor session ID (used by webhook handler)
- `getCurrentSession()` - Get active non-expired session (WITH expiration filter)
- `getLastApprovedSession()` - Get most recent approved session (NO expiration filter, used by rules)
- `putSession()` - Create new session with initial decision
- `updateSession()` - Update session status/metadata
- `addDecision()` - Add decision to existing session
- `getScore()` - Retrieve user's account score

**Implemented By:**
- `DynamoIdentityDB` - DynamoDB implementation

---

### LivenessRules
**Category:** TypeScript Interface

```typescript
export type LivenessRuleDecision = Omit<LivenessDecisionAttributes, 'request'>

export interface LivenessRules {
  check(options: LivenessOptions): Promise<LivenessRuleDecision>
}
```

**Exported From:** `shared/services/identity/rules/types.ts`

**Description:** Interface for rule engine that determines verification requirements. Rules are composable using combinators.

**Rule Types:**
- `Always()` - Always require verification
- `Never()` - Never require verification
- `UseFeatureFlag(features, name)` - Check feature flag
- `NotInLast(interval, db)` - Require if no completion within time window
- `AccountScoreLowerThan(threshold)` - Require if score below threshold
- `ArmWorseThan(threshold)` - Require if ARM score above threshold
- `ArmIs(value)` - Check ARM score equals value
- `AccountScoreIsNull()` - Check if score is null
- `pickRandom(probability)` - Random sampling

**Combinators:**
- `All(rules)` - AND logic (short-circuits on first negative)
- `Any(rules)` - OR logic (short-circuits on first positive)
- `WithTier(tierMap)` - Route to different rules per tier

---

### TokenService
**Category:** TypeScript Interface

```typescript
export type TokenParams = {
  globalUserId: string
  decisions: LivenessDecisionAttributes[]
}

export interface TokenService {
  generateToken(params: TokenParams): string
}
```

**Exported From:** `shared/services/identity/token/index.ts`

**Description:** JWT token generation interface. Tokens include all verification decisions for multi-app flows.

**Implemented By:**
- `JWTTokenService` - RSA-signed JWT implementation

---

### IdentityService
**Category:** TypeScript Interface

```typescript
export interface IdentityService {
  checkLiveness(options: LivenessOptions): Promise<LivenessDecision>
  handleEvent(event: LivenessEvent): Promise<LivenessSession>
}
```

**Exported From:** `shared/services/identity/index.ts`

**Description:** Main identity service interface combining liveness check and event handling.

**Created By:** `createIdentityService({ config, request, features })`

---

### IDV Error Types
**Category:** TypeScript Classes (Error Types)

```typescript
export class IDVError extends Error {
  constructor(message: string, public type: IDVErrorType)
}

export type IDVErrorType =
  { name: 'LivenessCheckFailedError', sessionId: string, expiresAt: Date } |
  { name: 'VendorRequestFailedError', vendorId: string } |
  { name: 'SessionEventOutOfOrderError' } |
  { name: 'SignatureValidationFailedError' } |
  { name: 'SessionNotFoundError' } |
  { name: 'InvalidEventError' }
```

**Exported From:** `shared/services/identity/error.ts`

**Description:** Custom error types for identity verification with typed metadata.

**Error Classes:**
- `LivenessCheckFailedError` - Session in failed state (includes cooldown expiration)
- `VendorRequestFailedError` - Vendor API failure
- `SessionEventOutOfOrderError` - Received stale event
- `SignatureValidationFailedError` - Invalid webhook signature
- `SessionNotFoundError` - Callback for unknown session
- `InvalidEventError` - Malformed event payload

---

## Scoring Types

### UserActivity
**Category:** TypeScript Type Alias

```typescript
export type UserActivity = {
  action?: string,
  result?: string,
  globalUserId?: string,
} & Record<string, unknown>

export type GlobalUserIdActivity = (UserActivity | VfUserLogInActivity) & { globalUserId: string }

export type ScorableUserActivity = GlobalUserIdActivity & { action: string, result: string }
```

**Exported From:** `shared/scoring/types.ts`

**Description:** User activity event from account activity stream. Base type for scoring events.

**Type Guards:**
- `hasGlobalUserId(activity)` - Narrows to GlobalUserIdActivity
- `isScorableUserActivity(activity)` - Narrows to ScorableUserActivity (action in whitelist, result='success')

**Scorable Actions:**
- `add_phone`, `create_account`, `login`, `reset_password`, `update_account`, `update_email`, `update_phone`, `verify_otp`, `verify_otp_mfa`

**Used By:**
- Scoring worker input types
- Queue managers

---

### VfUserLogInActivity
**Category:** TypeScript Type Alias

```typescript
export type VfUserLogInActivity = {
  globalUserId?: string,
} & Record<string, unknown>
```

**Exported From:** `shared/scoring/types.ts`

**Description:** Verified Fan login activity event.

---

### PurchaseActivity
**Category:** TypeScript Type Alias

```typescript
export type PurchaseActivity = {
  status?: 'SUCCESS' | 'FAILED',
  customer?: {
      globalUserId?: string
  } & Record<string, unknown>
} & Record<string, unknown>

export type ScorablePurchaseActivity = PurchaseActivity & {
  status: 'SUCCESS',
  customer: {
      globalUserId: string
  }
}
```

**Exported From:** `shared/scoring/types.ts`

**Description:** Purchase event from purchase stream. Used to trigger scoring on successful purchases.

**Type Guard:**
- `isScorablePurchaseActivity(activity)` - Narrows to successful purchases with globalUserId

---

### AccountJoinsQueueActivity
**Category:** TypeScript Type Alias

```typescript
export type AccountJoinsQueueActivity = {
  globalUserId: string
} & Record<string, unknown>;
```

**Exported From:** `shared/scoring/types.ts`

**Description:** Activity queued for account scoring. Simplified structure containing only globalUserId.

---

### GlobalUserIdActivityMessage
**Category:** TypeScript Type Alias

```typescript
export type GlobalUserIdActivityMessage = UserActivity & {
  globalUserId: string,
  shouldRetry?: boolean,
  __meta: any
}
```

**Exported From:** `shared/scoring/types.ts`

**Description:** Activity message with SQS metadata. Extends UserActivity with retry flag and metadata.

---

### Score
**Category:** TypeScript Type Alias

```typescript
export type Score = {
  globalUserId: string
  score: number
  version: string
}
```

**Exported From:** `shared/services/scoringModel/index.ts`

**Description:** Fan scoring result from ML model. Score represents probability user is a genuine fan (0-1 scale).

---

### ScoringModel
**Category:** TypeScript Interface

```typescript
export type ScoringModel = {
  getScores: (accountActivities: UserAccountActivity[]) => Promise<number[]>
}
```

**Exported From:** `shared/services/scoringModel/index.ts`

**Description:** Interface for fan scoring model. Takes user account activities and returns score predictions.

**Implementations:**
- `LiveScoringModel` - Production Databricks endpoint
- `StagingScoringModel` - Staging Databricks endpoint

---

### DataframeRecord
**Category:** TypeScript Type Alias

```typescript
export type DataframeRecord = {
  globalUserId: string,
  raw_json_string: string
}
```

**Exported From:** `shared/services/scoringModel/index.ts`

**Description:** Input format for Databricks scoring model. User activity serialized to JSON string.

---

## Service Types

### Services
**Category:** TypeScript Type Alias

```typescript
export type Services = {
  aws: AWSServices
  accountActivityQueueManager: QueueManager<GlobalUserIdActivity>
  onDemandScoringQueueManager: QueueManager<GlobalUserIdActivity>
  request: Request
  identity: IdentityService
  features: FeatureFlags
  tmAccounts: TmAccountsService
  scoringModel: ScoringModel
  stagingScoringModel: ScoringModel
}
```

**Exported From:** `shared/services/index.ts`

**Description:** Complete services object injected into all workers by middleware. Provides access to AWS clients, APIs, and business logic services.

**Service Categories:**
- **aws** - DynamoDB and SQS clients
- **accountActivityQueueManager** - Queue for account activity events (FIFO)
- **onDemandScoringQueueManager** - Queue for on-demand scoring requests
- **request** - HTTP client with instrumentation
- **identity** - Identity verification service
- **features** - Feature flag service (Unleash)
- **tmAccounts** - Ticketmaster accounts API client
- **scoringModel** - Production ML scoring model
- **stagingScoringModel** - Staging ML scoring model

---

### AWSServices
**Category:** TypeScript Type Alias

```typescript
export type AWSServices = {
  accountActivityQueue: SQSClient
  onDemandScoringQueue: SQSClient
  fanIdentityTable: DynamoDbClient
}
```

**Exported From:** `shared/services/index.ts`

**Description:** AWS service clients for SQS and DynamoDB.

---

### SQSClient
**Category:** TypeScript Type Alias

```typescript
export type SQSMessage = {
  id: string,
  data: string,
  delaySeconds?: number,
  messageAttributes?: Record<string, MessageAttributeValue>
  messageDeduplicationId?: string,
  messageGroupId?: string,
}

export type SQSClient = {
  sendMessage: (params: SQSMessage) => Promise<SendMessageCommandOutput>,
  sendMessageBatch: (batch: SQSMessage[]) => Promise<SendMessageBatchCommandOutput>
}
```

**Exported From:** `shared/services/index.ts`

**Description:** SQS client interface for sending messages. Abstracts AWS SDK SQS operations.

---

### DynamoDbClient
**Category:** TypeScript Type Alias

```typescript
export type DynamoDbRecord = { PK: string, SK: string, type: string, dateUpdated: string };

export type DynamoDbScoreRecord = DynamoDbRecord & Score;
export type DynamoDbAraiRecord = DynamoDbRecord & { araiResponse: UserAccountActivity, globalUserId: string };

export type DynamoDbClientPutInput = {
  data: DynamoDbScoreRecord | DynamoDbAraiRecord
}

export type DynamoDbClient = {
  name: (params: any) => Promise<any>
  get: (params: any) => Promise<any>
  getMany: (params: any) => Promise<any>
  query: (params: any) => Promise<any>
  delete: (params: any) => Promise<any>
  deleteMany: (params: any) => Promise<any>
  put: (params: DynamoDbClientPutInput) => Promise<any>
  putMany: (params: any) => Promise<any>
  update: (params: any) => Promise<any>
  updateMany: (params: any) => Promise<any>
  config: {
    tableName: 'string',
    region: 'string'
  }
}
```

**Exported From:** `shared/services/index.ts`

**Description:** DynamoDB client interface. Abstracts AWS SDK DynamoDB operations with typed inputs for score/ARAI records.

---

### QueueManager<Message>
**Category:** TypeScript Type Alias

```typescript
export type QueueManager<Message> = {
  sendMessages: (messages: Message[], batchSize?: number) => Promise<SendMessageBatchOutput>
}

export type SendMessageBatchOutput = {
  failed: number,
  queued: number
}
```

**Exported From:** `shared/services/queue/QueueManager.ts`

**Description:** High-level queue manager for batching and sending messages to SQS.

**Implementation:**
- `AccountActivityQueueManager` - Handles FIFO queue requirements (deduplication, message grouping)

---

### TmAccountsService
**Category:** TypeScript Type Alias

```typescript
export type TmAccountsService = {
  getUserInfo: ({ accessToken, tmuo }: { accessToken: string, tmuo?: string }) =>
      Promise<TmAccountsServiceOutput<UserInfo>>
  createSingleUser: (tempUserInputFields: Partial<TempUserInputFields>) =>
      Promise<TmAccountsServiceOutput<TempUserInfo>>
  generateAccessToken: ({ email, tmuo }: { email: string, tmuo?: string }) =>
      Promise<TmAccountsServiceOutput<TempAuthTokens>>
  getUserActivity: ({ globalUserId }: { globalUserId: string }) =>
      Promise<TmAccountsServiceOutput<UserAccountActivity>>
}

export type TmAccountsServiceOutput<Data> = {
  data: Data
  meta: { pageCount: number }
}
```

**Exported From:** `shared/services/tmAccounts/index.ts`

**Description:** Ticketmaster accounts service API client. Provides user info, activity history, and account management.

---

### UserInfo
**Category:** TypeScript Type Alias

```typescript
export type UserInfo = {
  sub: string
  hmac_user_id: string
  email: string
  phone_number: string
  given_name: string
  family_name: string
  do_not_sell: boolean
  locale: string
  account_types: string[]
  global_user_id: string
  system_user_id: string
  postal_code: string
  country_code: string
  updated_at: number
  created_at: number
  email_verified_at: number
  phone_number_verified_at: number
  username: string
  auth_type: string
  client_id: string
  restrictions: string[]
}
```

**Exported From:** `shared/services/tmAccounts/index.ts`

**Description:** User information from Ticketmaster accounts API.

**Transforms To:** [NormalizedUserInfo](#normalizeduserinfo) via `normalizeUserInfo()`

---

### NormalizedUserInfo
**Category:** TypeScript Type Alias

```typescript
export type NormalizedUserInfo = SanitizedUserInfo & {
  phoneNumber: string
  firstName: string
  lastName: string
  globalUserId: string
  systemUserId: string
  postalCode: string
  countryCode: string
  accountTypes: string
  memberId?: string
}
```

**Exported From:** `apps/auth/validateToken/helpers.ts`

**Description:** Normalized user information with camelCase fields and additional derived fields.

**Transformation:** `UserInfo` → `NormalizedUserInfo` via `normalizeUserInfo()`
- Converts snake_case to camelCase
- Prepends '+' to phone numbers
- Stringifies arrays
- Extracts memberId from systemUserId for NA host

**Used By:**
- [ResolverContext](#resolvercontext) - AppSync resolver context

---

### UserAccountActivity
**Category:** TypeScript Type Alias

```typescript
export type UserAccountActivity = {
  globalUserId: string,
  firstName: string,
  lastName: string,
  emailAddress: string,
  phoneNumber: string,
  phoneNumberType: string,
  phoneNumberCountry: string,
  sharedPhoneNumberCount: number,
  counts: {
    loginActivity: number,
    failedLoginActivity: number
  },
  history: {
    loginActivity: LoginActivity[],
    failedLoginActivity: LoginActivity[]
  },
  linkedAccounts: LinkedAccount[]
}

export type LoginActivity = {
  result: string,
  at: string,
  os: string,
  browser: string,
  from: string,
  cip: string,
  device: string,
  lat: string,
  long: string
}

export type LinkedAccount = {
  providerId: string,
  providerType: string,
  linkedAt: number
}
```

**Exported From:** `shared/services/tmAccounts/index.ts`

**Description:** User account activity history from Ticketmaster accounts API. Used as input to scoring model.

**Contains:**
- User profile data (name, email, phone)
- Login activity counts and history
- Linked social accounts
- Phone number sharing metrics

**Used By:**
- [ScoringModel](#scoringmodel) - Input to ML scoring
- ARAI (Account Risk Activity Index) caching

---

### ResolverContext
**Category:** TypeScript Type Alias

```typescript
export type ResolverContext = { isLoggedIn: boolean } & Partial<NormalizedUserInfo>
```

**Exported From:** `shared/types/auth.ts`

**Description:** AppSync resolver context shape returned by validateToken authorizer. Contains user information when authenticated.

**Fields:**
- `isLoggedIn` - Authentication status
- All fields from [NormalizedUserInfo](#normalizeduserinfo) (optional when not authenticated)

---

## Configuration Types

### Config
**Category:** TypeScript Type Alias

```typescript
type ConfigValue = string | number | ConfigValue[] | Map<string, ConfigValue>;

export type Config = Map<string, ConfigValue>;
```

**Exported From:** `shared/config/index.d.ts`

**Description:** Immutable.js Map for hierarchical configuration. Configuration is immutable at runtime.

**Access Methods:**
- `config.getIn(['path', 'to', 'value'])` - Get nested value
- `getConfig<T>(config, ...path)` - Typed helper to extract config object
- `getConfigValue<T>(config, ...path)` - Extract primitive config value

**Configuration Files:**
- `configs/default.config.yml` - Base configuration
- `configs/{env}.config.yml` - Environment-specific overrides

---

### Logger
**Category:** TypeScript Type Alias

```typescript
type LogLevels =
  'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'

export type Logger = {
  [key in LogLevels]: LeveledLogMethod
}

export type LoggerProvider = (context: string) => Logger
```

**Exported From:** `shared/Log.d.ts`

**Description:** Winston logger interface with structured logging support.

**Usage:**
```typescript
import Log from 'shared/Log';
const log = Log('context:name');
log.info('message', { data });
```

---

### TimeInterval
**Category:** TypeScript Type Alias

```typescript
export type TimeInterval = {
  milliseconds?: number,
  seconds?: number,
  minutes?: number,
  hours?: number,
  days?: number,
  weeks?: number,
}
```

**Exported From:** `shared/util/date.ts`

**Description:** Time interval specification for date calculations.

**Functions:**
- `timeInMilliseconds(interval)` - Converts to milliseconds
- `shiftDate(date, interval)` - Adds interval to date

**Used By:**
- Session expiration calculations
- Rule time window checks (`NotInLast`)

---

### ProcessingDetail
**Category:** TypeScript Type Alias

```typescript
export type ProcessingDetail = {
  [key: string]: {
    [detail: string]: number
  }
}
```

**Exported From:** `shared/processingDetail.ts`

**Description:** Nested counter structure for tracking processing outcomes. Used for aggregating result metrics.

**Usage:**
```typescript
const detail: ProcessingDetail = {};
const updated = mergeDetail(detail, { category: 'status' }); // Increments count
```

---

## Type Dependency Graph

```
Worker Types (Entry Points)
├─ SQSWorker
│   ├─ TransformedSQSRecord
│   │   └─ GlobalUserIdActivity
│   │       ├─ UserActivity
│   │       ├─ VfUserLogInActivity
│   │       └─ ScorableUserActivity
│   └─ SQSResultHandlerOutput
├─ KinesisWorker
│   └─ TransformedKinesisMessage
│       └─ (Message types same as SQS)
├─ AppSyncWorker
│   ├─ AppSyncOutput
│   │   └─ AppSyncError
│   └─ AppSyncResolverEvent (AWS Lambda type)
└─ AppSyncAuthorizerWorker
    └─ ResolverContext
        └─ NormalizedUserInfo
            └─ UserInfo (from TM Accounts API)

Identity Service Types
├─ IdentityService
│   ├─ checkLiveness
│   │   ├─ LivenessOptions
│   │   │   ├─ LivenessRequest
│   │   │   │   ├─ LivenessTier (enum)
│   │   │   │   └─ VerificationType (enum)
│   │   │   └─ ScoringFields
│   │   └─ returns LivenessDecision
│   │       ├─ LivenessDecisionAttributes
│   │       ├─ LivenessSession (optional)
│   │       │   └─ LivenessSessionAttributes
│   │       │       ├─ LivenessSessionStatus (enum)
│   │       │       └─ date timestamps
│   │       └─ token (optional)
│   └─ handleEvent
│       ├─ LivenessEvent
│       └─ returns LivenessSession
├─ IdentityDB
│   ├─ LivenessCheckRecords
│   │   ├─ LivenessSession
│   │   └─ LivenessDecisionAttributes[]
│   └─ LivenessSessionKeys
├─ IDVVendor
│   ├─ IDVVendorSession
│   │   └─ transforms to LivenessSessionAttributes
│   └─ ValidateSignatureResponse
├─ LivenessRules
│   └─ LivenessRuleDecision
└─ TokenService
    └─ TokenParams

Scoring Types
├─ Services
│   ├─ AWSServices
│   │   ├─ SQSClient
│   │   │   └─ SQSMessage
│   │   └─ DynamoDbClient
│   │       ├─ DynamoDbRecord
│   │       ├─ DynamoDbScoreRecord (+ Score)
│   │       └─ DynamoDbAraiRecord
│   ├─ QueueManager<GlobalUserIdActivity>
│   │   └─ SendMessageBatchOutput
│   ├─ TmAccountsService
│   │   ├─ getUserActivity → UserAccountActivity
│   │   │   ├─ LoginActivity[]
│   │   │   └─ LinkedAccount[]
│   │   ├─ getUserInfo → UserInfo
│   │   └─ TmAccountsServiceOutput<T>
│   ├─ ScoringModel
│   │   └─ UserAccountActivity[] → number[] (scores)
│   └─ IdentityService (see above)
└─ Activity Types
    ├─ UserActivity
    │   └─ GlobalUserIdActivity
    │       ├─ ScorableUserActivity
    │       └─ GlobalUserIdActivityMessage
    ├─ PurchaseActivity
    │   └─ ScorablePurchaseActivity
    └─ AccountJoinsQueueActivity

Configuration Types
├─ Config (Immutable.Map)
├─ TimeInterval
├─ Logger / LoggerProvider
└─ ProcessingDetail
```

### Legend
- **→** - Transforms to / Returns
- **+** - Extends / Includes
- **[]** - Array type
- **(enum)** - Enum or union of literals
- **(optional)** - May or may not be present
