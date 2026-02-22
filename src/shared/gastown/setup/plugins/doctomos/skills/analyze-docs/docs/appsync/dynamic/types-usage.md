# Type Usage Patterns - appsync

## TypeScript Type Definitions

### Core Types

#### UserInfo
**Confidence:** 95-100% (High)

```typescript
export type UserInfo = {
  email: string
  phoneNumber: string
  firstName: string
  lastName: string
  globalUserId: string
  systemUserId: string
  postalCode: string
  countryCode: string
  locale: string
  env: string
  isLoggedIn: string
  memberId?: string
}
```

**Source:** [app/src/types/utils.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/types/utils.ts:3)

**Purpose:** User identity context passed from Lambda authorizer

**Used By:**
- Context stash in resolver pipeline functions
- Identity resolution in `getGlobalUserId()`

**Field Details:**
- All fields required except `memberId` (optional)
- `isLoggedIn` is string-typed but should be "true"/"false"
- `globalUserId` - Universal user identifier across TM systems
- `systemUserId` - Legacy system user ID
- `memberId` - Ticketmaster member ID (when logged in)

---

#### FanIdentity
**Confidence:** 95-100% (High)

```typescript
import { AppSyncIdentityLambda } from '@aws-appsync/utils';

export type FanIdentity = AppSyncIdentityLambda & {
  resolverContext: UserInfo
}
```

**Source:** [app/src/types/utils.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/types/utils.ts:18)

**Purpose:** AppSync context identity object with fan information

**Used By:**
- Cast from `ctx.identity` in resolvers/functions
- `getGlobalUserId()` utility function

**Extends:** AWS AppSync Lambda identity type

---

### Registration and Entry Types

#### MarketCodes
**Confidence:** 95-100% (High)

```typescript
export type MarketCodes = {
  id: string
  marketId: string
}
```

**Source:** [app/src/types/registration.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/types/registration.ts:1)

**Purpose:** Entry codes for specific markets

**Referenced By:**
- [UserEntryRecord](#userentryrecord)

---

#### UserEntryRecord
**Confidence:** 95-100% (High)

```typescript
export type UserEntryRecord = {
  PK: string
  SK: string
  codes?: MarketCodes[]
}
```

**Source:** [app/src/types/registration.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/types/registration.ts:6)

**Purpose:** DynamoDB record structure for fan campaign entries

**Field Details:**
- `PK` - Partition key: `fan:{globalUserId}`
- `SK` - Sort key: `campaign:{campaignId}`
- `codes` - Optional array of market-specific codes

---

#### UpsertEntryInput
**Confidence:** 95-100% (High)

```typescript
export type UpsertEntryInput = {
  entry: Record<string, any>
  slug: string
  locale: string
  doTransfer: boolean
}
```

**Source:** [app/src/types/registration.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/types/registration.ts:12)

**Purpose:** Input for upsertEntry mutation

**Field Details:**
- `entry` - Campaign entry form data (flexible JSON object)
- `slug` - Campaign slug identifier
- `locale` - User locale (e.g., "en-us")
- `doTransfer` - Whether to transfer codes from previous entry

---

#### EntryQueryInput
**Confidence:** 95-100% (High)

```typescript
export type EntryQueryInput = {
  campaignId: string
}
```

**Source:** [app/src/types/registration.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/types/registration.ts:20)

**Purpose:** Input for querying entry records

---

### Verification Types

#### Args
**Confidence:** 95-100% (High)

```typescript
export interface Args {
  globalUserId?: string
  memberId?: string
  email?: string
}
```

**Source:** [app/src/types/verificationStatus.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/types/verificationStatus.ts:1)

**Purpose:** Common argument pattern for identity lookup

**Used By:**
- `getPartitionKey()` utility function
- Multiple queries accepting fan identifiers

**Field Details:**
- At least one identifier should be provided
- Used to construct DynamoDB partition keys

---

### Configuration Constants

#### DS_SCORE_BOOST_VALUES
**Confidence:** 95-100% (High)

```typescript
export const DS_SCORE_BOOST_VALUES = {
  ELIGIBILITY_LOWER_LIMIT: .5,
  ELIGIBILITY_UPPER_LIMIT: .8,
  SCORE_LOWER_LIMIT: .9,
  SCORE_UPPER_LIMIT: 1,
  BOOST_PROBABILITY: 0.0001
} as const
```

**Source:** [lib/enums.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/lib/enums.ts:3)

**Purpose:** Data Science score boost configuration for PAS model testing

**Used By:**
- Score boost pipeline functions
- `addScoreModelBoost` function

**Details:**
- Boost applied to scores in .5-.8 range
- Final boosted score lands in .9-1.0 range
- 0.01% probability (1 in 10,000 fans)

---

#### SCORE_PIPELINE_TAGS
**Confidence:** 95-100% (High)

```typescript
export const SCORE_PIPELINE_TAGS = {
  SCORE_MODEL_BOOST: 'pas_model_testing'
} as const
```

**Source:** [lib/enums.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/lib/enums.ts:11)

**Purpose:** Tags added to scores when specific pipeline features are active

---

## Resolver and Function Signatures

### Demand Resolvers

#### demandRecordQuery
**Confidence:** 95-100% (High)

```typescript
export function request(ctx: Context): DynamoDBQueryRequest
export function response(ctx: Context): DemandRecord[]
```

**Source:** [app/src/resolvers/demandRecordQuery.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/resolvers/demandRecordQuery.ts:1)

**Purpose:** Query fan's demand records from DynamoDB

**Request Parameters:**
```typescript
{
  args: {
    eventId?: string
    saleId?: string
    saleName?: string
  },
  source: {
    isLoggedIn: boolean
    global_user_id: string
  }
}
```

**Response Transformation:**
- Maps DynamoDB items to DemandRecord array
- Adds `notifiedDateTime` from `record.date.notified`
- Returns empty array if not logged in or no records

**Called By:**
- `DemandFan.demandRecords` field resolver

**Database Access:**
- DynamoDB Query operation
- Table: demand records table
- PK: `fan:{globalUserId}`
- SK: `demand#{eventId}-{saleId}` or `demand#{eventId}-` prefix

---

#### eventDetails
**Confidence:** 95-100% (High)

```typescript
export function request(ctx: Context): LambdaInvokeRequest
export function response(ctx: Context): DemandEvent
```

**Source:** [app/src/resolvers/eventDetails.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/resolvers/eventDetails.ts:1)

**Purpose:** Fetch event details via Lambda proxy

**Request Parameters:**
```typescript
{
  args: {
    eventId: string
  },
  request: {
    headers: {
      'tm-market-id': string
    }
  }
}
```

**Lambda Payload:**
```typescript
{
  arguments: {
    eventId: string
    tmMarketId: string
  }
}
```

**Error Handling:**
- 404 errors throw "Not Found"
- Other errors throw "Internal Server Error"

**Called By:**
- `Demand.eventDetails` field resolver

---

#### checkLiveness
**Confidence:** 95-100% (High)

```typescript
export function request(): EmptyRequest
export function response(ctx: Context): CheckLivenessResult
```

**Source:** [app/src/resolvers/checkLiveness.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/resolvers/checkLiveness.ts:1)

**Purpose:** Passthrough resolver - returns Lambda function result

**Note:** This is a simple passthrough resolver. Actual logic handled by Lambda data source.

**Called By:**
- `checkLiveness` mutation

---

### Pipeline Functions

#### getAccountFanscoreGlobalUserId
**Confidence:** 95-100% (High)

```typescript
export function request(ctx: Context): DynamoDBQueryRequest
export function response(ctx: Context): AccountFanscoreResult
```

**Source:** [app/src/functions/getAccountFanscoreGlobalUserId.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/functions/getAccountFanscoreGlobalUserId.ts:1)

**Purpose:** Fetch account fanscore from DynamoDB by globalUserId

**Pipeline Position:** First function in accountFanscore pipeline

**Request Logic:**
- Extracts globalUserId from args or identity
- Early return if no globalUserId
- Queries DynamoDB for account score

**DynamoDB Query:**
- PK: `g:{globalUserId}`
- SK: `score#account`
- Filter: `attribute_not_exists(expiresOn)` (exclude expired scores)

**Response Shape:**
```typescript
{
  ...ctx.prev.result,  // Preserve previous results
  globalUserId: string
  memberId: string
  score: number
  rawScore: number
  armScore: number
  email: string
  version: string
}
```

**Stash Usage:**
- Does not use stash
- Passes results via ctx.result

**Called By:**
- `VFApi.accountFanscore` query (pipeline function #1)

**Calls:**
- `selectAccountFanscoreResult()` from [shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:25)
- `getGlobalUserId()` from [utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:66)

---

#### getDiscoEventId
**Confidence:** 95-100% (High)

```typescript
export function request(ctx: Context): DynamoDBGetItemRequest
export function response(ctx: Context): PipelinePassthrough
```

**Source:** [app/src/functions/getDiscoEventId.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/functions/getDiscoEventId.ts:1)

**Purpose:** Resolve Discovery (Disco) event ID from TM event ID

**Pipeline Position:** Mid-pipeline (after score fetched, before event boost)

**Request Parameters:**
```typescript
{
  args: {
    eventId?: string
    market?: string  // defaults to "US"
  }
}
```

**DynamoDB GetItem:**
- PK: `event:{MARKET}:{eventId}`
- SK: `event#mapping`

**Response Logic:**
- Stores discoId in `ctx.stash.eventId`
- Falls back to original `ctx.args.eventId` if no mapping found
- Returns previous pipeline result unchanged

**Stash Usage:**
- **Writes:** `ctx.stash.eventId` (resolved Disco ID)

**Called By:**
- `VFApi.accountFanscore` query (pipeline function #4)

---

### Shared Utility Functions

#### demandRecordKeys
**Confidence:** 95-100% (High)

```typescript
export const demandRecordKeys = (ctx: Context): DemandRecordKeys
```

**Return Type:**
```typescript
{
  PK: string  // `fan:{globalUserId}`
  SK: string  // `demand#{eventId}-{saleId}`
}
```

**Source:** [app/src/shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:20)

**Purpose:** Generate DynamoDB key structure for demand records

**Requires Stash:**
- `ctx.stash.userInfo.global_user_id`
- `ctx.stash.eventId`
- `ctx.stash.saleId`

**Used By:**
- Demand record save/delete mutations

---

#### selectAccountFanscoreResult
**Confidence:** 95-100% (High)

```typescript
export const selectAccountFanscoreResult = (ctx: Context): AccountFanscore | null
```

**Source:** [app/src/shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:25)

**Purpose:** Extract first fanscore result from DynamoDB query

**Logic:**
- Gets first item from `ctx.result.items`
- Returns item if score exists (including score === 0)
- Returns null if no valid score

**Used By:**
- `getAccountFanscoreGlobalUserId` function
- `getAccountFanscoreMemberId` function

---

#### defaultResponseTemplate
**Confidence:** 95-100% (High)

```typescript
export const defaultResponseTemplate = (ctx: Context): any
```

**Source:** [app/src/shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:31)

**Purpose:** Standard response handler with error extraction

**Logic:**
- Checks for `ctx.result.error`
- Throws GraphQL error if error present
- Returns `ctx.result.result` otherwise

**Error Format:**
```typescript
{
  error: {
    message: string
    errorType: string
    data?: any
    errorInfo?: any
  }
}
```

**Used By:**
- Lambda-backed resolvers
- Functions that invoke Lambda data sources

---

#### lambdaRequest
**Confidence:** 95-100% (High)

```typescript
export function lambdaRequest(ctx: Context): LambdaRequestPayload
```

**Return Type:**
```typescript
{
  version: '2018-05-29'
  operation: 'Invoke'
  payload: Context  // Full AppSync context
}
```

**Source:** [app/src/shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:46)

**Purpose:** Standard Lambda invocation request template

**Used By:**
- Lambda-backed resolvers

---

#### lambdaResponse
**Confidence:** 95-100% (High)

```typescript
export function lambdaResponse(ctx: Context): any
```

**Source:** [app/src/shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:54)

**Purpose:** Standard Lambda response handler with error extraction

**Error Handling:**
- Checks `ctx.error` (invocation error)
- Checks `ctx.result.error` (Lambda error)
- Checks `ctx.result.result.error` (application error)
- Checks `ctx.result.result.errors` (multiple errors)

**Returns:** `ctx.result.result.data`

**Used By:**
- Lambda-backed resolvers

---

#### getPartitionKey
**Confidence:** 95-100% (High)

```typescript
export const getPartitionKey = (args: Args, isDemand: boolean = false): string
```

**Source:** [app/src/shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:81)

**Purpose:** Generate DynamoDB partition key from fan identifier

**Parameter:**
```typescript
args: {
  globalUserId?: string
  memberId?: string
  email?: string
}
```

**Key Formats:**
```typescript
// For Demand (isDemand = true):
globalUserId → `fan:{globalUserId}`
memberId     → `sid:{memberId}`
email        → `email:{normalizedEmail}`

// For Other (isDemand = false):
globalUserId → `gid:{globalUserId}`
memberId     → `m:{memberId}`
email        → `e:{normalizedEmail}`
```

**Error:** Throws 400 error if no valid identifier provided

**Used By:**
- Identity resolution functions
- Verification status queries

---

#### throwIfNotLoggedIn
**Confidence:** 95-100% (High)

```typescript
export const throwIfNotLoggedIn = (ctx: Context): void
```

**Source:** [app/src/shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:96)

**Purpose:** Guard function for authenticated operations

**Logic:**
- Checks `isLoggedIn(ctx)`
- Throws 401 error with code "NOT_LOGGED_IN" if not logged in

**Used By:**
- Mutations requiring authentication
- Protected field resolvers

---

#### throwInternalServerError
**Confidence:** 95-100% (High)

```typescript
export const throwInternalServerError = (): never
```

**Source:** [app/src/shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:102)

**Purpose:** Throw generic 500 error

**Used By:**
- Error fallback cases

---

### Utility Functions

#### isLoggedIn
**Confidence:** 95-100% (High)

```typescript
export const isLoggedIn = (ctx: Context): boolean
```

**Source:** [app/src/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:14)

**Purpose:** Check if fan is authenticated

**Logic:**
- Checks `ctx.identity.resolverContext.isLoggedIn === 'true'`
- Returns boolean

**Used By:**
- `throwIfNotLoggedIn()` guard
- Conditional logic in resolvers

---

#### getGlobalUserId
**Confidence:** 95-100% (High)

```typescript
export const getGlobalUserId = (ctx: Context): string | undefined
```

**Source:** [app/src/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:66)

**Purpose:** Extract globalUserId from args or identity context

**Logic:**
1. Try to get from `ctx.identity.resolverContext.globalUserId`
2. Fall back to `ctx.args.globalUserId`
3. Return undefined if neither present

**Used By:**
- `getAccountFanscoreGlobalUserId` function
- Resolvers that accept globalUserId

---

#### isArmAdjustingEnabled
**Confidence:** 95-100% (High)

```typescript
export const isArmAdjustingEnabled = (ctx: Context): boolean
```

**Source:** [app/src/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:39)

**Purpose:** Check if ARM (Account Risk Model) adjustment is enabled

**Logic:**
- Checks environment variable `ARM_ADJUSTING_ENABLED === 'true'`

**Used By:**
- Score adjustment pipeline functions

---

#### applyArmAdjustment
**Confidence:** 95-100% (High)

```typescript
export const applyArmAdjustment = (
  ctx: Context,
  score: number,
  armScore: number | null
): number
```

**Source:** [app/src/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:45)

**Purpose:** Apply Account Risk Model adjustment to fanscore

**Constants:**
- `HIGH_RISK_ARM_THRESHOLD = 4`
- `MAX_HIGH_RISK_ACCOUNT_SCORE = 0.25`
- `LOW_RISK_ACCOUNT_MULTIPLIER = 0.75`

**Logic:**
```typescript
if (!isArmAdjustingEnabled(ctx)) return score

if (armScore >= 4) {
  // High risk: cap at 25% of original score
  return score * 0.25
} else {
  // Low risk: scale to 25%-100% range
  return score * 0.75 + 0.25
}
```

**Used By:**
- Score calculation pipeline

---

#### getDefaultArmAdjustedScore
**Confidence:** 95-100% (High)

```typescript
export const getDefaultArmAdjustedScore = (
  ctx: Context,
  armScore: number | null
): number | null
```

**Source:** [app/src/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:54)

**Purpose:** Get default score when no fanscore exists

**Constants:**
- `DEFAULT_HIGH_RISK_SCORE = 0.001`
- `DEFAULT_LOW_RISK_SCORE = 0.251`

**Logic:**
```typescript
if (!isArmAdjustingEnabled(ctx)) return null

return armScore >= 4 ? 0.001 : 0.251
```

**Used By:**
- Score fallback logic

---

#### convertToBoolean
**Confidence:** 95-100% (High)

```typescript
export const convertToBoolean = (value: any): boolean
```

**Source:** [app/src/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:20)

**Purpose:** Flexible boolean conversion

**Logic:**
- Falsey values: `0, '0', false, 'false', 'no'` → `false`
- Truthy values: `1, '1', true, 'true', 'yes'` → `true`
- Other values: Convert with `!!value`

**Used By:**
- Configuration parsing

---

#### lookupBooleanFromEnv
**Confidence:** 95-100% (High)

```typescript
export const lookupBooleanFromEnv = (env: Context['env'], key: string): boolean
```

**Source:** [app/src/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:30)

**Purpose:** Parse boolean from environment variable

**Logic:**
- Returns `true` if `env[key] === 'true'`
- Returns `false` otherwise

**Used By:**
- Feature flag checks

---

#### makeEntryKey
**Confidence:** 95-100% (High)

```typescript
export const makeEntryKey = (globalUserId: string, campaignId: string): DynamoDBKey
```

**Return Type:**
```typescript
{
  PK: string  // `fan:{globalUserId}`
  SK: string  // `campaign:{campaignId}`
}
```

**Source:** [app/src/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:33)

**Purpose:** Generate DynamoDB key for entry records

**Used By:**
- Entry record queries
- upsertEntry mutation

---

## Common Patterns

### Pattern: Pipeline Function Stash Sharing

**Description:** Pipeline functions use `ctx.stash` to pass data between stages

**Example Usage:**
```typescript
// Function 1: Store data in stash
export function response(ctx: Context) {
  ctx.stash.eventId = resolvedEventId
  ctx.stash.userInfo = identityInfo
  return ctx.prev.result
}

// Function 2: Read from stash
export function request(ctx: Context) {
  const eventId = ctx.stash.eventId
  const userId = ctx.stash.userInfo.global_user_id
  // Use stash data for DynamoDB query
}
```

**Found In:**
- [getDiscoEventId.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/functions/getDiscoEventId.ts:24)
- [demandRecordKeys in shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:20)

---

### Pattern: Early Return from Pipeline

**Description:** Use `runtime.earlyReturn()` to short-circuit pipeline execution

**Example Usage:**
```typescript
export function request(ctx: Context) {
  if (!isLoggedIn(ctx)) {
    runtime.earlyReturn()  // Stop pipeline, return empty
  }

  const globalUserId = getGlobalUserId(ctx)
  if (!globalUserId) {
    runtime.earlyReturn(ctx.prev.result)  // Return previous result
  }

  // Continue with request
}
```

**Found In:**
- [getAccountFanscoreGlobalUserId.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/functions/getAccountFanscoreGlobalUserId.ts:9)
- [demandRecordQuery.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/resolvers/demandRecordQuery.ts:12)
- [getDiscoEventId.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/functions/getDiscoEventId.ts:7)

---

### Pattern: DynamoDB Key Construction

**Description:** Consistent key format patterns for different entity types

**Example Key Formats:**
```typescript
// Fan-scoped records
PK: `fan:{globalUserId}`
SK: `demand#{eventId}-{saleId}`    // Demand record
SK: `campaign:{campaignId}`         // Entry record

// Score records
PK: `g:{globalUserId}`  or  `m:{memberId}`
SK: `score#account`

// Event mapping
PK: `event:{market}:{eventId}`
SK: `event#mapping`

// Identity lookup
PK: `gid:{globalUserId}`  or  `m:{memberId}`  or  `e:{email}`
SK: varies by table
```

**Found In:**
- [getPartitionKey in shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:81)
- [demandRecordKeys in shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:20)
- [makeEntryKey in utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:33)

---

### Pattern: Error Response Handling

**Description:** Consistent error handling with typed error responses

**Example Mutation Responses:**
```typescript
// Success
return {
  status: 'SAVED',
  error: null
}

// Failure with error details
return {
  status: 'FAILED',
  error: {
    code: 401,
    message: 'User not logged in'
  }
}
```

**Predefined Error Templates:**
```typescript
// shared.ts constants
demandMutationErrorResult = {
  status: 'FAILED',
  error: { code: 500, message: 'Internal Server Error' }
}

demandMutationNotFoundResult = {
  status: 'FAILED',
  error: { code: 404, message: 'Not Found' }
}

demandMutationNotLoggedInResult = {
  status: 'FAILED',
  error: { code: 401, message: 'User not logged in' }
}
```

**Found In:**
- [shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:5)

---

### Pattern: Lambda Invocation Template

**Description:** Standard request/response templates for Lambda data sources

**Request Template:**
```typescript
export function request(ctx: Context) {
  return {
    version: '2018-05-29',
    operation: 'Invoke',
    payload: ctx  // Pass full context
  }
}

// Or use shared helper:
import { lambdaRequest } from './shared'
export const request = lambdaRequest
```

**Response Template:**
```typescript
import { lambdaResponse } from './shared'
export const response = lambdaResponse

// Or custom:
export function response(ctx: Context) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type)
  }
  return ctx.result.result.data
}
```

**Found In:**
- [lambdaRequest in shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:46)
- [lambdaResponse in shared.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:54)

---

### Pattern: Identity Context Extraction

**Description:** Extract user identity from multiple possible sources

**Example Usage:**
```typescript
import { FanIdentity } from './types'

export function request(ctx: Context) {
  // Type-safe identity cast
  const identity = ctx.identity as FanIdentity
  const userInfo = identity.resolverContext

  // Extract globalUserId (args take precedence over identity)
  const globalUserId = getGlobalUserId(ctx)

  // Check authentication
  if (!isLoggedIn(ctx)) {
    runtime.earlyReturn()
  }
}
```

**Utility Functions:**
- `getGlobalUserId(ctx)` - Gets from args or identity
- `isLoggedIn(ctx)` - Checks authentication
- `throwIfNotLoggedIn(ctx)` - Guard function

**Found In:**
- [getGlobalUserId in utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:66)
- [isLoggedIn in utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:14)
- [FanIdentity type definition](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/types/utils.ts:18)

---

### Pattern: Score Adjustment with ARM

**Description:** Apply Account Risk Model adjustments to fanscores

**Algorithm:**
```typescript
// High-risk accounts (ARM score >= 4)
if (armScore >= 4) {
  adjustedScore = rawScore * 0.25  // Cap at 25%
}

// Low-risk accounts (ARM score < 4)
else {
  adjustedScore = rawScore * 0.75 + 0.25  // Scale to 25-100%
}
```

**Example Usage:**
```typescript
export function response(ctx: Context) {
  const rawScore = ctx.result.score
  const armScore = ctx.result.armScore

  const adjustedScore = applyArmAdjustment(ctx, rawScore, armScore)

  return {
    ...ctx.result,
    rawScore,
    score: adjustedScore,
    armScore
  }
}
```

**Found In:**
- [applyArmAdjustment in utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:45)
- [getDefaultArmAdjustedScore in utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:54)

---

### Pattern: DynamoDB Query with Filter

**Description:** Query DynamoDB with additional filter expressions

**Example Usage:**
```typescript
export function request(ctx: Context) {
  return {
    version: '2017-02-28',
    operation: 'Query',
    query: {
      expression: 'PK = :PK AND SK = :SK',
      expressionValues: util.dynamodb.toMapValues({
        ':PK': `fan:${globalUserId}`,
        ':SK': `score#account`
      })
    },
    filter: {
      expression: 'attribute_not_exists(#expiresOn)',
      expressionNames: {
        '#expiresOn': 'expiresOn'
      }
    }
  }
}
```

**Found In:**
- [getAccountFanscoreGlobalUserId.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/functions/getAccountFanscoreGlobalUserId.ts:12)
- [demandRecordQuery.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/resolvers/demandRecordQuery.ts:33)

---

## Type Transformations

### DynamoDB Record → GraphQL Type

#### Demand Record Transformation

**DynamoDB Structure:**
```typescript
{
  PK: string                    // `fan:{globalUserId}`
  SK: string                    // `demand#{eventId}-{saleId}`
  eventId: string
  saleId: string
  artistId: string
  eventName: string
  saleName: string
  artistName: string
  contactMethod: 'sms' | 'email'
  date: {
    requested: string           // ISO DateTime
    notified: string            // ISO DateTime
  }
}
```

**GraphQL Output (DemandRecord):**
```graphql
type DemandRecord {
  eventId: ID
  saleId: ID
  artistId: ID
  eventName: String
  saleName: String
  artistName: String
  contactMethod: ContactMethod
  requestedDateTime: AWSDateTime
  notifiedDateTime: AWSDateTime
}
```

**Transformation Logic:**
```typescript
export function response(ctx: Context) {
  const records = ctx.result.items
  return records.map(record => ({
    ...record,
    notifiedDateTime: record.date.notified  // Flatten nested date
  }))
}
```

**Source:** [demandRecordQuery.ts](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/resolvers/demandRecordQuery.ts:86)

---

#### Entry Record Transformation

**DynamoDB Structure:**
```typescript
{
  PK: string                    // `fan:{globalUserId}`
  SK: string                    // `campaign:{campaignId}`
  campaignId: string
  locale: string
  fields: object                // Campaign form data
  attributes: object            // Additional metadata
  codes?: Array<{
    id: string
    marketId: string
  }>
  date: {
    created: string
    updated: string
    fanModified: string
  }
}
```

**GraphQL Output (EntryRecord):**
```graphql
type EntryRecord {
  campaignId: ID
  date: EntryRecordDate
  locale: String
  fields: AWSJSON
  attributes: AWSJSON
  codes: [EntryCode]
}
```

**Transformation:** Direct mapping (no transformation needed)

---

### Pipeline Data Flow

#### accountFanscore Pipeline

**Input (Query Arguments):**
```typescript
{
  globalUserId?: string
  memberId?: string
  eventId?: string
  market?: string
}
```

**Pipeline Stages with Data Flow:**

1. **getAccountFanscoreGlobalUserId**
   - Input: `{ globalUserId?, memberId? }`
   - Output: `{ globalUserId, memberId, score, rawScore, armScore, email, version }`

2. **getAccountFanscoreMemberId** (if no result from #1)
   - Input: `{ memberId? }`
   - Output: `{ globalUserId, memberId, score, rawScore, armScore, email, version }`

3. **randomizeScore**
   - Input: `{ score, rawScore }`
   - Output: `{ score (randomized), rawScore, ... }`

4. **getDiscoEventId**
   - Input: `{ eventId?, market? }`
   - Stash: `ctx.stash.eventId = resolvedEventId`
   - Output: (passthrough)

5. **addEventScoreBoost**
   - Input: `{ score }` + `ctx.stash.eventId`
   - Output: `{ score (boosted), ... }`

6. **getBotOrNotCursor**
   - Setup bot detection cursor
   - Output: (passthrough)

7. **getBotOrNot**
   - Input: Bot detection cursor
   - Output: `{ isBot, ... }`

8. **addScoreModelBoost**
   - Input: `{ score }`
   - Output: `{ score (possibly boosted), tags: ['pas_model_testing'], ... }`

**Final Output (AccountFanscore):**
```graphql
{
  globalUserId: ID
  memberId: ID
  score: Float           # Final adjusted score
  rawScore: Float        # Original score before adjustments
  armScore: Int          # Account risk score
  email: String
  version: String
  isBot: Boolean         # From BotOrNot service
  tags: [ScoreTags]      # Pipeline tags (e.g., pas_model_testing)
}
```

---

## Function Call Relationships

### Resolver: demandRecordQuery

**Calls:**
- No function calls (direct DynamoDB query)

**Called By:**
- `DemandFan.demandRecords` field resolver

**Data Sources:**
- DynamoDB demand records table

---

### Function: getAccountFanscoreGlobalUserId

**Calls:**
- `getGlobalUserId(ctx)` - [utils/index.ts:66](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:66)
- `selectAccountFanscoreResult(ctx)` - [shared.ts:25](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:25)

**Called By:**
- `VFApi.accountFanscore` query (pipeline stage 1)

**Data Sources:**
- DynamoDB account_fanscore table

---

### Utility: getGlobalUserId

**Calls:**
- No function calls (pure logic)

**Called By:**
- `getAccountFanscoreGlobalUserId` - [app/src/functions/getAccountFanscoreGlobalUserId.ts:6](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/functions/getAccountFanscoreGlobalUserId.ts:6)
- Other resolvers needing globalUserId extraction

---

### Utility: isLoggedIn

**Calls:**
- No function calls (pure logic)

**Called By:**
- `throwIfNotLoggedIn` - [shared.ts:97](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/shared.ts:97)
- Various resolvers checking authentication

---

### Utility: applyArmAdjustment

**Calls:**
- `isArmAdjustingEnabled(ctx)` - [utils/index.ts:39](/Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/app/src/utils/index.ts:39)

**Called By:**
- Score adjustment pipeline functions

---

### Utility: getPartitionKey

**Calls:**
- No function calls (pure logic)

**Called By:**
- Identity resolution functions
- Verification status queries
