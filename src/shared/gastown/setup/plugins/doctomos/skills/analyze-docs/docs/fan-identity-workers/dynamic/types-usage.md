# Type Usage Patterns - fan-identity-workers

## Function Signatures

### Exported Functions with Explicit Types

---

#### CheckLiveness
**Confidence:** 95-100% High

```typescript
export const CheckLiveness = (
  { db, idv, rules, tokenService }: CheckLivenessParams
) => async (options: LivenessOptions): Promise<LivenessDecision>

export type CheckLivenessParams = {
  idv: IDVVendor
  db: IdentityDB
  rules: LivenessRules
  tokenService: TokenService
}
```

**Source:** [shared/services/identity/checkLiveness.ts](shared/services/identity/checkLiveness.ts:74-76)

**Description:** Main entry point for identity verification checks. Factory function returning async closure.

**Input:**
- `options.globalUserId` (string, required) - User identifier
- `options.tier` (LivenessTier, required) - Verification tier: 'always', 'high', 'medium', 'low', 'asu', 'test-always', 'test-never'
- `options.appId` (string, required) - Application ID requesting verification
- `options.subjectId` (string, required) - Subject ID (e.g., event ID)
- `options.verificationType` (VerificationType, optional) - 'selfie' or 'selfieAndGovID' (determined by tier for ASU)
- `options.firstName` (string, optional) - User first name
- `options.lastName` (string, optional) - User last name
- `options.armScore` (number, optional) - Account Risk Model score
- `options.accountScore` (number, optional) - Fan scoring model score

**Return:** Promise<[LivenessDecision](types-definitions.md#livenessdecision)>

**Business Logic:**
1. Evaluate rules to determine if verification required
2. If not required: Generate and return token immediately
3. If required: Check for existing active session
4. If existing session: Update with new decision, return token if approved
5. If no session: Create new vendor session
6. If vendor fails: Return bypass token (failsafe)

**Called By:**
- `apps/idv/checkLiveness/index.ts` - IDV worker

**Calls:**
- `rules.check(options)` - Evaluate verification rules
- `db.getCurrentSession(globalUserId, verificationType)` - Get active session
- `idv.createSession(globalUserId, verificationType, firstName, lastName)` - Create vendor session
- `db.putSession(sessionAttributes, decision)` - Store new session
- `tokenService.generateToken(params)` - Generate JWT token
- `handleCurrentSession(...)` - Process existing session

**Confidence Note:** Explicit TypeScript types with full parameter shapes defined.

---

#### HandleLivenessEvent
**Confidence:** 95-100% High

```typescript
export const HandleLivenessEvent = (
  { idv, db, tokenService }: HandleLivenessEventParams
) => async (event: LivenessEvent): Promise<LivenessSession>

export type HandleLivenessEventParams = {
  idv: IDVVendor
  db: IdentityDB
  tokenService: TokenService
}
```

**Source:** [shared/services/identity/handleEvent.ts](shared/services/identity/handleEvent.ts:50-51)

**Description:** Processes webhook callbacks from IDV vendor. Factory function returning async closure.

**Input:**
- `event.vendorId` (string, required) - Vendor identifier
- `event.payload` (string, required) - Webhook payload (JSON string)
- `event.signature` (string, optional) - Webhook signature for validation

**Return:** Promise<[LivenessSession](types-definitions.md#livenesssession)>

**Business Logic:**
1. (Optionally) Validate webhook signature
2. Parse vendor callback into IDVVendorSession
3. Lookup existing session in database
4. Merge callback data into session
5. Update session in database
6. If session failed: Track failure for abuse detection
7. If session approved: Generate token
8. Return updated session

**Called By:**
- `apps/idv/handleEvent/index.ts` - IDV event handler worker

**Calls:**
- `idv.validateSignature(event)` - Verify webhook authenticity (currently disabled)
- `idv.handleEvent(event)` - Parse vendor callback
- `db.getSession(callbackData)` - Lookup session by vendor session ID
- `mergeSession(session, callbackData)` - Update session with callback data
- `db.updateSession(updatedSession)` - Persist changes
- `db.getFailedSessions(globalUserId, subjectId)` - Track failures for abuse
- `tokenService.generateToken(params)` - Generate token if approved

**Confidence Note:** Explicit TypeScript types with full parameter shapes defined.

---

#### ProcessAccountScores
**Confidence:** 95-100% High

```typescript
const ProcessAccountScores = (
  { scoringModel, fanIdentityTable }: ProcessAccountScoresServices
): (userActivities: UserAccountActivity[]) => Promise<processedResult>

export type ProcessAccountScoresServices = {
  scoringModel: Services['scoringModel']
  fanIdentityTable: Pick<Services['aws']['fanIdentityTable'], 'updateMany'>
}

export type processedResult = {
  in: number
  saved: number
  failed: number
}
```

**Source:** [apps/scoring/scoreUsers/ProcessAccountScores.ts](apps/scoring/scoreUsers/ProcessAccountScores.ts:98-100)

**Description:** Processes user account activities through scoring model and saves scores to DynamoDB. Factory function returning async closure.

**Input:**
- `userActivities` (UserAccountActivity[], required) - Array of user account activity records from TM Accounts API

**Return:** Promise<processedResult>
- `in` - Total input activities count
- `saved` - Successfully saved scores count
- `failed` - Failed scores count

**Business Logic:**
1. Filter activities: Deduplicate by globalUserId and remove records without globalUserId
2. Lookup predictions from scoring model with retry
3. If predictions fail: Return failed result for all activities
4. Merge predictions with globalUserId to create Score records
5. Save scores to DynamoDB with retry
6. Return counts

**Called By:**
- `apps/scoring/scoreUsers/index.ts` - Score users worker

**Calls:**
- `filterActivities(userActivities)` - Dedupe and validate
- `lookupPredictions({ scoringModel, userActivities })` - Get ML scores
- `saveScores({ fanIdentityTable, records })` - Persist to DynamoDB

**Confidence Note:** Explicit TypeScript types with full parameter shapes defined.

---

#### filterActivities
**Confidence:** 95-100% High

```typescript
export const filterActivities = (userActivities: UserAccountActivity[]): UserAccountActivity[]
```

**Source:** [apps/scoring/scoreUsers/ProcessAccountScores.ts](apps/scoring/scoreUsers/ProcessAccountScores.ts:27-30)

**Description:** Deduplicates user activities by globalUserId and filters out records without globalUserId.

**Input:**
- `userActivities` (UserAccountActivity[], required)

**Return:** UserAccountActivity[] - Filtered and deduplicated activities

**Business Logic:**
1. Deduplicate by globalUserId using `R.uniqBy(R.prop('globalUserId'))`
2. Filter to only activities with globalUserId using `filter(hasId)`

**Called By:**
- [ProcessAccountScores](#processaccountscores)

**Confidence Note:** Explicit TypeScript types.

---

#### lookupPredictions
**Confidence:** 95-100% High

```typescript
export const lookupPredictions = async (
  { scoringModel, userActivities }: { scoringModel: ScoringModel, userActivities: UserAccountActivity[] }
): Promise<(number[] | null)>
```

**Source:** [apps/scoring/scoreUsers/ProcessAccountScores.ts](apps/scoring/scoreUsers/ProcessAccountScores.ts:38-39)

**Description:** Retrieves fan probability scores from ML scoring model with retry logic.

**Input:**
- `scoringModel` (ScoringModel, required) - Scoring model service
- `userActivities` (UserAccountActivity[], required) - User activities to score

**Return:** Promise<number[] | null> - Array of scores (0-1 probability) or null if failed

**Business Logic:**
1. Call `scoringModel.getScores(userActivities)` with async retry (2 retries, no randomization)
2. If all retries fail: Log error and return null
3. Otherwise return predictions array

**Called By:**
- [ProcessAccountScores](#processaccountscores)

**Confidence Note:** Explicit TypeScript types.

---

#### normalizeUserInfo
**Confidence:** 95-100% High

```typescript
export const normalizeUserInfo = (userInfo: UserInfo): Partial<NormalizedUserInfo>
```

**Source:** [apps/auth/validateToken/helpers.ts](apps/auth/validateToken/helpers.ts:49-73)

**Description:** Transforms UserInfo from TM Accounts API to normalized camelCase format for AppSync resolver context.

**Input:**
- `userInfo` (UserInfo, required) - Raw user info from TM Accounts API

**Return:** Partial<[NormalizedUserInfo](types-definitions.md#normalizeduserinfo)>

**Transformation:**
- Removes null/undefined properties
- Converts arrays/objects to string values
- Converts snake_case to camelCase
- Prepends '+' to phone numbers
- Extracts memberId from system_user_id for NA host
- Lowercases email

**Called By:**
- `apps/auth/validateToken/index.ts` - Token validation authorizer

**Calls:**
- `sanitizeUserInfo(userInfo)` - Remove nulls and stringify
- `selectMemberId(system_user_id)` - Extract memberId

**Confidence Note:** Explicit TypeScript types with full transformation logic.

---

#### createIdentityService
**Confidence:** 95-100% High

```typescript
export const createIdentityService = (
  { config, request, features }: { config: Config, request: Request, features: FeatureFlags }
): IdentityService
```

**Source:** [shared/services/identity/index.ts](shared/services/identity/index.ts:22-52)

**Description:** Factory function creating complete identity service with injected dependencies.

**Input:**
- `config` (Config, required) - Application configuration (Immutable.Map)
- `request` (Request, required) - HTTP client
- `features` (FeatureFlags, required) - Feature flag service

**Return:** [IdentityService](types-definitions.md#identityservice)

**Business Logic:**
1. Extract configuration for DynamoDB table and Persona vendor
2. Create PersonaIDVVendor with request client and credentials
3. Create DynamoIdentityDB with region and table name
4. Create JWTTokenService from JWT config
5. Create LivenessRules with tier-specific rule sets
6. Return service with checkLiveness and handleEvent methods

**Called By:**
- `shared/services/index.ts` - Service initialization

**Calls:**
- `getConfig(config, 'aws', 'clients', 'fanIdentityTable')` - Get DB config
- `getConfig(config, 'persona')` - Get Persona config
- `PersonaIDVVendor(request, personaConfig)` - Create vendor
- `DynamoIdentityDB({ region, tableName })` - Create DB
- `createTokenService(config)` - Create token service
- `createLivenessCheckRules({ db, features })` - Create rules engine

**Confidence Note:** Explicit TypeScript types with full dependency injection.

---

#### createLivenessCheckRules
**Confidence:** 95-100% High

```typescript
export const createLivenessCheckRules = (
  { db, features }: { db: IdentityDB, features: FeatureFlags }
): rule.LivenessRules
```

**Source:** [shared/services/identity/index.ts](shared/services/identity/index.ts:54-88)

**Description:** Creates tier-specific verification rules using rule combinators.

**Input:**
- `db` (IdentityDB, required) - Database for historical checks
- `features` (FeatureFlags, required) - Feature flag service

**Return:** [LivenessRules](types-definitions.md#livenessrules)

**Rule Configuration:**

**always tier:**
```typescript
rule.UseFeatureFlag(features, 'require_idv')
```
- Require verification if feature flag enabled

**high tier:**
```typescript
rule.All([
  rule.UseFeatureFlag(features, 'require_idv_high'),
  rule.NotInLast({ days: 30 }, db)
])
```
- Require verification if feature flag enabled AND no approved verification in last 30 days

**medium tier:**
```typescript
rule.All([
  rule.UseFeatureFlag(features, 'require_idv_medium'),
  rule.NotInLast({ days: 90 }, db)
])
```
- Require verification if feature flag enabled AND no approved verification in last 90 days

**low tier:**
```typescript
rule.Any([
  rule.UseFeatureFlag(features, 'require_idv_low'),
  rule.AccountScoreLowerThan(0.5)
])
```
- Require verification if feature flag enabled OR account score < 0.5

**asu tier (Adaptive Step-Up):**
```typescript
rule.All([
  rule.Any([
    rule.ArmWorseThan(3),  // ARM score > 3
    rule.All([
      rule.Any([rule.ArmIs(3), rule.ArmIs(null)]),
      rule.AccountScoreLowerThan(0.3)
    ]),
    rule.All([
      rule.ArmIs(null),
      rule.AccountScoreIsNull(),
      rule.pickRandom(0.5)  // 50% random sampling
    ])
  ]),
  rule.NotInLast({ days: 90 }, db)
])
```
- Complex multi-factor evaluation combining ARM score, account score, and random sampling
- Always requires no verification in last 90 days

**test-always / test-never tiers:**
- Always require or never require (for testing)

**Called By:**
- [createIdentityService](#createidentityservice)

**Confidence Note:** Explicit TypeScript types with full rule definitions.

---

#### newSession
**Confidence:** 95-100% High

```typescript
export const newSession = (
  globalUserId: string,
  vendorSession: IDVVendorSession,
  verificationType: VerificationType
): LivenessSessionAttributes
```

**Source:** [shared/services/identity/session.ts](shared/services/identity/session.ts:115-128)

**Description:** Creates new session from vendor session response.

**Input:**
- `globalUserId` (string, required)
- `vendorSession` (IDVVendorSession, required) - Vendor session data
- `verificationType` (VerificationType, required) - 'selfie' or 'selfieAndGovID'

**Return:** [LivenessSessionAttributes](types-definitions.md#livenesssession)

**Transformation:**
- Copies all fields from vendorSession except `statusTimestamp`
- Adds `globalUserId` and `verificationType`
- Creates `date` object with:
  - `created` = vendor statusTimestamp
  - `updated` = vendor statusTimestamp
  - `expiresAt` = calculated based on status

**Called By:**
- [CheckLiveness](#checkliveness) - When creating new session

**Confidence Note:** Explicit TypeScript types.

---

#### mergeSession
**Confidence:** 95-100% High

```typescript
export const mergeSession = (
  session: LivenessSession,
  callbackData: IDVVendorSession
): LivenessSession
```

**Source:** [shared/services/identity/session.ts](shared/services/identity/session.ts:130-143)

**Description:** Updates session with vendor callback data.

**Input:**
- `session` (LivenessSession, required) - Existing session
- `callbackData` (IDVVendorSession, required) - Vendor webhook data

**Return:** [LivenessSession](types-definitions.md#livenesssession)

**Transformation:**
- Updates `status` to callback status
- Updates `ipAddress` if present in callback (preserves existing if not)
- Adds timestamp for new status in `date` object
- Updates `date.updated` to callback statusTimestamp
- Recalculates `date.expiresAt` based on new status

**Called By:**
- [HandleLivenessEvent](#handlelivenesse vent) - When processing webhook

**Confidence Note:** Explicit TypeScript types.

---

#### hasDecision
**Confidence:** 95-100% High

```typescript
export const hasDecision = (
  prevDecisions: LivenessDecisionAttributes[],
  decision: LivenessDecisionAttributes
): boolean
```

**Source:** [shared/services/identity/session.ts](shared/services/identity/session.ts:159-167)

**Description:** Checks if session already has decision for same app/subject/tier combination.

**Input:**
- `prevDecisions` (LivenessDecisionAttributes[], required) - Existing decisions
- `decision` (LivenessDecisionAttributes, required) - New decision to check

**Return:** boolean - true if duplicate exists

**Logic:**
- Returns true if any previous decision matches on:
  - `request.appId`
  - `request.subjectId`
  - `request.tier`

**Called By:**
- [CheckLiveness](#checkliveness) - Before adding new decision

**Confidence Note:** Explicit TypeScript types.

---

#### isApproved
**Confidence:** 95-100% High

```typescript
export const isApproved = (session: LivenessSessionAttributes): boolean
```

**Source:** [shared/services/identity/session.ts](shared/services/identity/session.ts:82-107)

**Description:** Checks if session is successfully approved. Includes workaround for "stuck completed" status.

**Input:**
- `session` (LivenessSessionAttributes, required)

**Return:** boolean - true if approved or completed (with age check)

**Logic:**
1. If status is 'approved': return true
2. If status is 'completed' and has completedDate:
   - Calculate age in seconds
   - If age > 30 seconds: Log warning and return true (stuck status workaround)
3. Otherwise: return false

**Called By:**
- [CheckLiveness](#checkliveness)
- [HandleLivenessEvent](#handlelivenesse vent)
- Rule evaluations

**Confidence Note:** Explicit TypeScript types.

---

#### isFailed
**Confidence:** 95-100% High

```typescript
export const isFailed = (session: LivenessSessionAttributes): boolean
```

**Source:** [shared/services/identity/session.ts](shared/services/identity/session.ts:109-110)

**Description:** Checks if session is in failed state.

**Input:**
- `session` (LivenessSessionAttributes, required)

**Return:** boolean - true if status is 'failed' or 'declined'

**Called By:**
- [CheckLiveness](#checkliveness) - Throws error if failed
- [HandleLivenessEvent](#handlelivenesse vent) - Tracks failed session abuse

**Confidence Note:** Explicit TypeScript types.

---

#### isResumable
**Confidence:** 95-100% High

```typescript
export const isResumable = (session: LivenessSession): boolean
```

**Source:** [shared/services/identity/session.ts](shared/services/identity/session.ts:112-113)

**Description:** Checks if session can be resumed by user.

**Input:**
- `session` (LivenessSession, required)

**Return:** boolean - true if status is 'created' or 'pending'

**Confidence Note:** Explicit TypeScript types.

---

#### isScorableUserActivity
**Confidence:** 95-100% High

```typescript
export const isScorableUserActivity = (userActivity: UserActivity): userActivity is ScorableUserActivity
```

**Source:** [shared/scoring/types.ts](shared/scoring/types.ts:56-57)

**Description:** Type guard checking if user activity is scorable (has globalUserId, action, and success result).

**Input:**
- `userActivity` (UserActivity, required)

**Return:** boolean - true if activity is ScorableUserActivity (type narrowing)

**Logic:**
- Check hasGlobalUserId(userActivity)
- Check action is in SCORABLE_ACTIONS set
- Check result === 'success'

**Scorable Actions:**
- `add_phone`, `create_account`, `login`, `reset_password`, `update_account`, `update_email`, `update_phone`, `verify_otp`, `verify_otp_mfa`

**Called By:**
- Stream processing workers (filter scorable activities)

**Confidence Note:** Explicit TypeScript types with type guard.

---

#### isScorablePurchaseActivity
**Confidence:** 95-100% High

```typescript
export const isScorablePurchaseActivity = (
  purchaseActivity: PurchaseActivity
): purchaseActivity is ScorablePurchaseActivity
```

**Source:** [shared/scoring/types.ts](shared/scoring/types.ts:59-62)

**Description:** Type guard checking if purchase activity is scorable (successful purchase with globalUserId).

**Input:**
- `purchaseActivity` (PurchaseActivity, required)

**Return:** boolean - true if activity is ScorablePurchaseActivity (type narrowing)

**Logic:**
- Check status === 'SUCCESS'
- Check customer exists
- Check hasGlobalUserId(customer)

**Called By:**
- `apps/scoring/enqueueFromPurchaseStream` - Filter successful purchases

**Confidence Note:** Explicit TypeScript types with type guard.

---

#### hasGlobalUserId
**Confidence:** 95-100% High

```typescript
export const hasGlobalUserId = (userActivity: UserActivity): userActivity is GlobalUserIdActivity
```

**Source:** [shared/scoring/types.ts](shared/scoring/types.ts:53-54)

**Description:** Type guard checking if activity has globalUserId.

**Input:**
- `userActivity` (UserActivity, required)

**Return:** boolean - true if activity has globalUserId (type narrowing)

**Called By:**
- [isScorableUserActivity](#isscorableuseractivity)
- [isScorablePurchaseActivity](#isscor ablepurchaseactivity)

**Confidence Note:** Explicit TypeScript types with type guard.

---

#### AccountActivityQueueManager
**Confidence:** 95-100% High

```typescript
export const AccountActivityQueueManager = (
  { queue, isFIFO }: QueueManagerParams
): QueueManager<GlobalUserIdActivity>

type QueueManagerParams = {
  queue: SQSClient
  isFIFO?: boolean
}
```

**Source:** [shared/services/queue/QueueManager.ts](shared/services/queue/QueueManager.ts:65-87)

**Description:** Factory creating queue manager for sending GlobalUserIdActivity messages to SQS.

**Input:**
- `queue` (SQSClient, required) - SQS client
- `isFIFO` (boolean, optional) - Whether queue is FIFO (enables deduplication/grouping)

**Return:** [QueueManager](#queuemanager)<GlobalUserIdActivity>

**Business Logic:**
1. Creates `makeMessage` function that:
   - Generates UUID for message ID
   - If FIFO: Adds deduplication ID and message group ID (both set to globalUserId)
   - Serializes activity to JSON string
2. Returns object with `sendMessages` method that:
   - Maps activities to messages
   - Batches messages (default 10 per batch)
   - Sends batches via `SendMessageBatch`
   - Aggregates counts (failed, queued)

**Called By:**
- `shared/services/index.ts` - Service initialization

**Confidence Note:** Explicit TypeScript types.

---

#### SendMessageBatch
**Confidence:** 95-100% High

```typescript
export const SendMessageBatch = (queue: SQSClient) =>
  async (messages: SQSMessage[]): Promise<SendMessageBatchOutput>
```

**Source:** [shared/services/queue/QueueManager.ts](shared/services/queue/QueueManager.ts:34-58)

**Description:** Sends batch of messages to SQS queue.

**Input:**
- `queue` (SQSClient, required) - SQS client
- `messages` (SQSMessage[], required) - Messages to send

**Return:** Promise<[SendMessageBatchOutput](#sendmessagebatchoutput)>
- `queued` - Number of successfully queued messages
- `failed` - Number of failed messages

**Business Logic:**
1. Call `queue.sendMessageBatch(messages)`
2. If result has Failed entries: Log failed messages
3. Return counts from Successful/Failed arrays
4. If exception thrown: Log error, return all as failed

**Called By:**
- [AccountActivityQueueManager](#accountactivityqueuemanager) (via BatchFn)

**Confidence Note:** Explicit TypeScript types.

---

#### sanitizeUserInfo
**Confidence:** 95-100% High

```typescript
export const sanitizeUserInfo = R.pipe(
  removeNullProperties,
  R.mapObjIndexed(convertToStringValues),
  transformData
)
```

**Source:** [apps/auth/validateToken/helpers.ts](apps/auth/validateToken/helpers.ts:43-47)

**Description:** Ramda pipeline sanitizing user info by removing nulls, stringifying values, and prepending '+' to phone.

**Input:**
- `userInfo` (UserInfo, required)

**Return:** SanitizedUserInfo

**Transformation Steps:**
1. `removeNullProperties` - Remove null/undefined values
2. `mapObjIndexed(convertToStringValues)` - Convert arrays/objects to strings
3. `transformData` - Prepend '+' to phone_number

**Called By:**
- [normalizeUserInfo](#normalizeuserinfo)

**Confidence Note:** Explicit TypeScript types with Ramda composition.

---

#### prependPlus
**Confidence:** 95-100% High

```typescript
export const prependPlus = R.replace(/^(?:\+)?(.+)$/, '+$1')
```

**Source:** [apps/auth/validateToken/helpers.ts](apps/auth/validateToken/helpers.ts:26)

**Description:** Prepends '+' to phone number if not already present.

**Input:**
- Phone number string

**Return:** Phone number with '+' prefix

**Called By:**
- `sanitizeUserInfo` pipeline

**Confidence Note:** Explicit regex pattern.

---

## Common Patterns

### Pattern: Factory Function with Dependency Injection

**Description:** High-order functions that accept dependencies and return closures with business logic.

**Benefits:**
- Enables dependency injection for testability
- Maintains functional programming principles (no classes)
- Provides clear separation of configuration and business logic

**Example Usage:**

```typescript
// Factory receives dependencies
export const CheckLiveness = (
  { db, idv, rules, tokenService }: CheckLivenessParams
) =>
  // Returns closure with business logic
  async (options: LivenessOptions): Promise<LivenessDecision> => {
    // Business logic uses injected dependencies
    const decision = await rules.check(options);
    // ...
  };

// Service initialization injects dependencies
const checkLiveness = CheckLiveness({
  db: DynamoIdentityDB({ region, tableName }),
  idv: PersonaIDVVendor(request, config),
  rules: createLivenessCheckRules({ db, features }),
  tokenService: JWTTokenService(jwtConfig)
});

// Worker uses the configured function
const decision = await checkLiveness({ globalUserId, tier, appId, subjectId });
```

**Found In:**
- [CheckLiveness](shared/services/identity/checkLiveness.ts:74-130)
- [HandleLivenessEvent](shared/services/identity/handleEvent.ts:50-92)
- [ProcessAccountScores](apps/scoring/scoreUsers/ProcessAccountScores.ts:98-123)
- [AccountActivityQueueManager](shared/services/queue/QueueManager.ts:65-87)
- [SendMessageBatch](shared/services/queue/QueueManager.ts:34-58)

---

### Pattern: Type Guards for Runtime Type Narrowing

**Description:** Functions that perform runtime checks and narrow TypeScript types, enabling type-safe conditional logic.

**Benefits:**
- Type safety without type assertions
- Self-documenting validation logic
- Compiler-enforced handling of narrowed types

**Example Usage:**

```typescript
// Type guard function
export const isScorableUserActivity = (
  userActivity: UserActivity
): userActivity is ScorableUserActivity =>
  hasGlobalUserId(userActivity) &&
  SCORABLE_ACTIONS.has(userActivity.action!) &&
  userActivity.result === SUCCESS_RESULT;

// Usage in filter
const scorableActivities = activities.filter(isScorableUserActivity);
// TypeScript now knows scorableActivities is ScorableUserActivity[]
// and allows accessing .action, .result, .globalUserId without optional chaining
```

**Found In:**
- [isScorableUserActivity](shared/scoring/types.ts:56-57)
- [isScorablePurchaseActivity](shared/scoring/types.ts:59-62)
- [hasGlobalUserId](shared/scoring/types.ts:53-54)

---

### Pattern: Immutable State Transformation

**Description:** Functions that transform data without mutation, using Ramda or object spread to create new objects.

**Benefits:**
- Prevents accidental mutations
- Enables time-travel debugging
- Supports functional composition

**Example Usage:**

```typescript
// Transform via Ramda omit (no mutation)
export const newSession = (
  globalUserId: string,
  vendorSession: IDVVendorSession,
  verificationType: VerificationType
): LivenessSessionAttributes => ({
  ...R.omit(['statusTimestamp'], vendorSession),  // Omit without mutating
  globalUserId,
  verificationType,
  date: {
    created: vendorSession.statusTimestamp,
    updated: vendorSession.statusTimestamp,
    expiresAt: statusExpiresAt(vendorSession.statusTimestamp, vendorSession.status)
  }
});

// Transform via object spread (no mutation)
export const mergeSession = (
  session: LivenessSession,
  callbackData: IDVVendorSession
): LivenessSession => ({
  ...session,  // Copy all existing fields
  status: callbackData.status,  // Override status
  ipAddress: callbackData.ipAddress ? callbackData.ipAddress : session.ipAddress,
  date: {
    ...session.date,  // Copy existing dates
    [callbackData.status]: callbackData.statusTimestamp,  // Add new status date
    updated: callbackData.statusTimestamp,
    expiresAt: statusExpiresAt(callbackData.statusTimestamp, callbackData.status)
  }
});
```

**Found In:**
- [newSession](shared/services/identity/session.ts:115-128)
- [mergeSession](shared/services/identity/session.ts:130-143)
- [sanitizeUserInfo](apps/auth/validateToken/helpers.ts:43-47)
- [normalizeUserInfo](apps/auth/validateToken/helpers.ts:49-73)

---

### Pattern: Ramda Pipelines for Data Transformation

**Description:** Composing multiple transformation functions using Ramda's `pipe` or `compose` for readable data flows.

**Benefits:**
- Left-to-right data flow (easier to reason about)
- Reusable transformation steps
- Point-free style reduces boilerplate

**Example Usage:**

```typescript
// Define transformation steps
const removeNullProperties = R.reject(R.isNil);
const transformData = userInfo => ({
  ...userInfo,
  phone_number: prependPlus(userInfo.phone_number)
});

// Compose into pipeline
export const sanitizeUserInfo = R.pipe(
  removeNullProperties,
  R.mapObjIndexed(convertToStringValues),
  transformData
);

// Usage
const sanitized = sanitizeUserInfo(rawUserInfo);
```

**Found In:**
- [sanitizeUserInfo](apps/auth/validateToken/helpers.ts:43-47)
- [AccountActivityQueueManager.sendMessages](shared/services/queue/QueueManager.ts:78-85)

---

### Pattern: Async Retry with Fallback

**Description:** Wrapping async operations with retry logic and graceful degradation on failure.

**Benefits:**
- Resilience to transient failures
- Graceful degradation (return null/default instead of throwing)
- Centralized retry configuration

**Example Usage:**

```typescript
const retryOptions = {
  retries: 2,
  randomize: false
};

export const lookupPredictions = async (
  { scoringModel, userActivities }: { ... }
): Promise<(number[] | null)> => {
  try {
    // Wrap in async-retry
    return await asyncRetry(
      () => scoringModel.getScores(userActivities),
      retryOptions
    );
  }
  catch (error) {
    log.error('scoring prediction lookup failed', formatError(error));
    return null;  // Graceful degradation
  }
};

// Caller handles null case
const predictions = await lookupPredictions({ scoringModel, userActivities });
if (!predictions) {
  return { in: userActivities.length, failed: activities.length, saved: 0 };
}
```

**Found In:**
- [lookupPredictions](apps/scoring/scoreUsers/ProcessAccountScores.ts:38-46)
- [saveScores](apps/scoring/scoreUsers/ProcessAccountScores.ts:81-96)

---

### Pattern: Vendor Failsafe

**Description:** When external vendor API fails, proceed without blocking user flow (bypass with token generation).

**Benefits:**
- Prevents vendor outages from blocking user access
- Maintains availability during degraded conditions
- Preserves audit trail (decision shows requiresVerification=true)

**Example Usage:**

```typescript
try {
  // Attempt vendor session creation
  const vendorSession = await idv.createSession(globalUserId, verificationType, firstName, lastName);
  const sessionAttributes = newSession(globalUserId, vendorSession, verificationType);
  const { session } = await db.putSession(sessionAttributes, decision);
  return { ...decision, session };
}
catch (error) {
  if (error instanceof VendorRequestFailedError) {
    log.error('identity.checkLiveness.vendorFailure', { error, options });

    // Failsafe: Issue token anyway to prevent blocking user
    // Decision shows requiresVerification=true (rules required it)
    // but token is present (user allowed through)
    // and session is absent (no vendor session created)
    // This combination indicates vendor bypass occurred
    const token = tokenService.generateToken({
      globalUserId,
      decisions: [decision]
    });

    return { ...decision, token };  // requiresVerification=true, token present, session absent
  }

  throw error;  // Re-throw non-vendor errors
}
```

**Detection:** `requiresVerification: true` + `token` present + `session` absent

**Found In:**
- [CheckLiveness](shared/services/identity/checkLiveness.ts:98-126)

---

### Pattern: Status-Based Expiration

**Description:** Session expiration times vary based on current status, implemented via lookup table.

**Benefits:**
- Different expiration policies for different states
- Grace period for completed sessions (multi-app flows)
- Clear expiration logic via const lookup

**Example Usage:**

```typescript
const statusExpirations: Record<LivenessSessionStatus, TimeInterval> = {
  created: { days: 1 },
  pending: { days: 1 },
  completed: { hours: 1 },  // Grace period for multi-app
  expired: { hours: 0 },
  failed: { hours: 1 },
  needs_review: { days: 1 },
  approved: { hours: 1 },
  declined: { hours: 1 }
} as const;

export const statusExpiresAt = (statusTimestamp: Date, status: LivenessSessionStatus): Date =>
  shiftDate(statusTimestamp, statusExpirations[status]);
```

**Critical for:**
- Multi-app flows (1-hour grace period for completed sessions)
- Cooldown periods (1-hour for failed sessions)
- Active session reuse (1-day for pending sessions)

**Found In:**
- [statusExpiresAt](shared/services/identity/session.ts:145-157)

---

### Pattern: Dual Database Query Strategy

**Description:** Separate queries for different purposes - one with expiration filter (current sessions), one without (historical checks).

**Benefits:**
- `getCurrentSession()` - Reuses active sessions, respects expiration
- `getLastApprovedSession()` - Historical record for rule evaluation, ignores expiration

**Example Usage:**

```typescript
// In CheckLiveness - reuse active session
const currentSessionRecords = await db.getCurrentSession(globalUserId, verificationType);
// Only returns non-expired sessions (:now < #date.expiresAt)

// In NotInLast rule - historical check
const lastApproved = await db.getLastApprovedSession(globalUserId);
// Returns any approved session regardless of age
// Used to check "verified in last X days" via rule logic
```

**Critical distinction:**
- Current session query filters expired sessions (enables session reuse with grace period)
- Last approved query ignores expiration (enables time-window rules)

**Found In:**
- [getCurrentSession](shared/services/identity/db/dynamo.ts:115-142)
- [getLastApprovedSession](shared/services/identity/db/dynamo.ts:87-112)
- Used by [CheckLiveness](shared/services/identity/checkLiveness.ts:96) and rules

---

### Pattern: Rule Composition with Combinators

**Description:** Building complex verification logic by composing simple rules with AND/OR combinators.

**Benefits:**
- Reusable rule primitives
- Declarative rule definitions
- Short-circuit evaluation for performance
- Clear business logic expression

**Example Usage:**

```typescript
// Primitive rules
const UseFeatureFlag = (features, name) => ({ check: async (options) => { ... } });
const NotInLast = (interval, db) => ({ check: async (options) => { ... } });
const AccountScoreLowerThan = (threshold) => ({ check: async (options) => { ... } });

// Combinators
const All = (rules) => ({ check: async (options) => {
  // Short-circuit AND - stop at first negative
  for (const rule of rules) {
    const decision = await rule.check(options);
    if (!decision.requiresVerification) return decision;
  }
  return lastDecision;
}});

const Any = (rules) => ({ check: async (options) => {
  // Short-circuit OR - stop at first positive
  for (const rule of rules) {
    const decision = await rule.check(options);
    if (decision.requiresVerification) return decision;
  }
  return lastDecision;
}});

// Composed rule
const highTierRule = All([
  UseFeatureFlag(features, 'require_idv_high'),
  NotInLast({ days: 30 }, db)
]);
// Require verification if BOTH:
// 1. Feature flag is enabled
// 2. No approved verification in last 30 days
```

**Found In:**
- [Rule combinators](shared/services/identity/rules/index.ts)
- [createLivenessCheckRules](shared/services/identity/index.ts:54-88)

---

## Summary

This repository demonstrates strong TypeScript usage with:

### High-Confidence Type Coverage (95-100%)
- Explicit type annotations on all exported functions
- Extensive use of type aliases and interfaces
- Type guards for runtime type narrowing
- Generic types with constraints

### Functional Programming Patterns
- Factory functions with dependency injection
- Immutable data transformations
- Ramda pipelines for composition
- Pure functions with explicit dependencies

### Resilience Patterns
- Async retry with fallback
- Vendor failsafe with bypass tokens
- Status-based expiration policies
- Graceful degradation on failures

### Domain-Driven Design
- Rich type system modeling business domain
- Clear separation of concerns (vendor, db, rules, tokens)
- Composable rule engine
- Event-driven architecture with type-safe workers
