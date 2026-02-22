# Type Usage Patterns - reg-workers

## Worker Function Signatures

### Registration Domain

#### checkEligibility
**Confidence:** 100% High

```typescript
const handler: WorkerWithInputTransformation<CheckEligibilityInput, CheckEligibilityOutput, Services> =
  async({
    input: { body: { slug, entry, userInfo, doTransfer = false } },
    Services: services
  }) => Promise<CheckEligibilityOutput>
```

**Source:** [apps/registration/checkEligibility/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/checkEligibility/index.ts:35)

**Middleware Type:** `APPSYNC_RESOLVER` (AppSync pipeline function)

**Input Parameter Shape:**
- `input.body.slug` (string, required) - Campaign URL slug
- `input.body.entry` (RegistrationEntry, required) - Fan-submitted registration fields
- `input.body.userInfo` (UserInfo, required) - Authenticated user information
- `input.body.doTransfer` (boolean, optional, default: false) - Whether to transfer linked campaign entry
- `Services` (Services, injected) - All available services

**UserInfo Shape:**
```typescript
{
  email: string
  phoneNumber: string
  firstName: string
  lastName: string
  globalUserId: string
  memberId?: string
  postalCode: string
  countryCode: string
  locale: string
  env: string
  isLoggedIn: string
}
```

**RegistrationEntry Shape:**
```typescript
Record<string, unknown> & { idvToken?: string }
```

**Return Type:** `Promise<CheckEligibilityOutput>`

```typescript
{
  isEligible: boolean
  reason?: INELIGIBLE_REASON
  campaignId?: string
  fields?: ValidatedFields
  linkedCampaignId?: string
}
```

**Called By:**
- AppSync GraphQL API (eligibility query before submission)

**Calls:**
- `getCampaign({ slug, redis })` - Fetches campaign from Redis cache
- `validateCampaign(cachedCampaign)` - Validates campaign status and dates
- `checkGate(services, campaign, userInfo, doTransfer, entry)` - Validates campaign gate requirements
- `validateEntry({ campaign, entry })` - Validates entry fields against campaign preferences

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

#### upsertUsers
**Confidence:** 100% High

```typescript
const handler: SQSBatchWorker<UserInfoMessage, UpsertUsersResult, UpsertServices> = async({
  input: users,
  Services,
  jwt
}) => Promise<{
  batchItemFailures: FailureIdentifier[],
  count: {
    received: number,
    unprocessed: number,
    processed: number
  }
}>
```

**Source:** [apps/registration/upsertUsers/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/upsertUsers/index.ts:24)

**Middleware Type:** `SQS_BATCH_CONSUMER` (SQS queue with batch item failures)

**Input Parameter Shape:**
- `input` (TransformedSQSRecord<UserInfoMessage>[], required) - Array of SQS messages with user info
- `Services` (UpsertServices, injected) - Services subset (users service)
- `jwt` (string, injected) - JWT token for authentication

**UserInfoMessage Shape:**
```typescript
{
  global_user_id: string
  // Additional user fields...
}
```

**Return Type:**
```typescript
{
  batchItemFailures: FailureIdentifier[]
  count: {
    received: number
    unprocessed: number
    processed: number
  }
}
```

**Called By:**
- Triggered by SQS queue: `upsertUsersQueue`

**Calls:**
- `UpsertUsers(Services, jwt)(usersDetail)` - Batch upserts users to User Service
- `processUsers({ result, users })` - Processes failed records for retry
- `formatSQSBatchFailureIdentifiers(failedUsers)` - Formats batch item failures

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### Replication Domain

#### saveEntries
**Confidence:** 100% High

```typescript
const saveEntries: SQSBatchWorker<SaveEntryQueuePayload, SaveEntriesResult, SaveEntriesServices> =
  async({ input, Services, jwt }) => Promise<SaveEntriesResult>
```

**Source:** [apps/replication/saveEntries/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/saveEntries/index.ts:56)

**Middleware Type:** `SQS_BATCH_CONSUMER` (SQS queue with batch item failures)

**Input Parameter Shape:**
- `input` (QueueEntry[], required) - Array of SQS messages with entry change records
- `Services` (SaveEntriesServices, injected) - Services subset (aws.demandTable, entries)
- `jwt` (string, injected) - JWT token for authentication

**QueueEntry Shape:**
```typescript
TransformedSQSRecord<SaveEntryQueuePayload>
```

**SaveEntryQueuePayload Shape:**
```typescript
{
  operation: DynamoDbOperation  // 'INSERT' | 'MODIFY' | 'REMOVE'
  newItem?: DynamoDbEntry
  oldItem?: DynamoDbEntry
  sqsMessageId: string
}
```

**Return Type:**
```typescript
{
  batchItemFailures: FailureIdentifier[]
  count: {
    received: number
    rejected: number
    failed: number
    upsertedCount: number
    deletedCount: number
  }
}
```

**Called By:**
- Triggered by SQS queue: `saveEntriesQueue`
- Enqueued by `enqueueEntries` worker

**Calls:**
- `normalizeRecords(records)` - Normalizes queue entries to extract operation and entry
- `ValidateOperation(Services)(normalizedRecords)` - Validates operation against current demand-table state
- `splitByOperations(validChangeRecords)` - Splits entries into puts and deletions
- `ProcessEntries(Services, jwt)({ entries, input })` - Replicates to Entry Service

**Transformation Logic:**
```typescript
// Normalizes records based on operation type:
const entry = (record.operation === 'REMOVE' ? record.oldItem : record.newItem) as DynamoDbEntry;
return {
  entry: { ...entry, recordId: record.sqsMessageId },
  operation: record.operation
};
```

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### Selection Domain

#### saveSelections
**Confidence:** 100% High

```typescript
const handler: SaveSelectionsWorker = async({ input, Services, jwt }) =>
  Promise<SaveSelectionsWorkerResult>
```

**Source:** [apps/selection/saveSelections/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/selection/saveSelections/index.ts)

**Middleware Type:** `SQS_BATCH_CONSUMER` (SQS queue with batch item failures)

**Input Parameter Shape:**
- `input` (SaveSelectionsSQSMessage[], required) - Array of selection messages
- `Services` (Services, injected) - All available services
- `jwt` (string, injected) - JWT token for authentication

**SaveSelectionsSQSMessage Shape:**
```typescript
(SelectionSQSMessage | SelectionRefreshSQSMessage) & SQSRecordExtensions
```

**SelectionSQSMessage Shape:**
```typescript
{
  type: 'selection'
  campaignId: string
  globalUserId: string
  marketId: string
  eventIds: string[]
  userId: string
  memberId?: string
  code?: string
  codeConfigId?: string
  date: { created: string }
  // + SQSRecordExtensions (sqsMessageId, __meta, etc.)
}
```

**SelectionRefreshSQSMessage Shape:**
```typescript
{
  type: 'selectionRefresh'
  campaignId: string
  globalUserId: string
  marketId: string
  eventIds: string[]
  userId: string
  memberId?: string
  date: { created: string }
  // + SQSRecordExtensions
}
```

**Return Type:**
```typescript
{
  count: {
    input: {
      total: number
      deduped: number
      codeAssignments: number
      selectionRefreshes: number
      failed?: number
    }
    codes: AssignedCodesCount
    savedVerdicts: number
  }
  batchItemFailures: FailureIdentifier[]
  campaignIds: string[]
}
```

**Called By:**
- Triggered by SQS queue: `saveSelectionQueue`
- Enqueued by `enqueueMarketSelections` worker

**Calls:**
- `AssignCodesByCampaignId({ assignments, campaignId, jwt, Services })` - Assigns codes and updates verdicts
- Deduplication logic to prevent duplicate assignments

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

## Helper Function Signatures

### Validation Functions

#### validateCampaign
**Confidence:** 95% High

```typescript
const validateCampaign = (campaign: Campaign | null): CampaignValidationResult => {
  isValid: boolean
  campaign?: Campaign
  reason?: INELIGIBLE_REASON
}
```

**Source:** [apps/registration/checkEligibility/validation/validateCampaign/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/checkEligibility/validation/validateCampaign/index.ts)

**Parameter Shape:**
- `campaign` (Campaign | null, required) - Campaign to validate

**Return Type:**
```typescript
{
  isValid: boolean
  campaign?: Campaign
  reason?: INELIGIBLE_REASON
}
```

**Called By:**
- [checkEligibility](#checkeligibility)

**Validation Logic:**
- Checks if campaign exists (NOT_FOUND)
- Checks if campaign is OPEN (CLOSED)
- Checks if current time is within registration window (CLOSED)

**Confidence Note:** Inferred from usage and return type analysis.

---

#### validateEntry
**Confidence:** 95% High

```typescript
const validateEntry = ({ campaign, entry }: {
  campaign: Campaign
  entry: RegistrationEntry
}): {
  fields?: ValidatedFields
  error?: { field: string }
}
```

**Source:** [apps/registration/checkEligibility/validation/validateEntry/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/checkEligibility/validation/validateEntry/index.ts)

**Parameter Shape:**
- `campaign` (Campaign, required) - Campaign with preferences
- `entry` (RegistrationEntry, required) - Entry fields to validate

**Return Type:**
```typescript
{
  fields?: ValidatedFields
  error?: { field: string }
}
```

**Called By:**
- [checkEligibility](#checkeligibility)

**Validation Logic:**
- Validates each preference field against campaign.preferences
- Checks required vs optional fields
- Validates field types and constraints (min/max length, items list)

**Confidence Note:** Inferred from usage pattern and error handling.

---

### Data Transformation Functions

#### getCampaign
**Confidence:** 100% High

```typescript
const getCampaign = async({ slug, redis }: {
  slug: string
  redis: RedisClient
}): Promise<Campaign | null> => Campaign | null
```

**Source:** [apps/registration/checkEligibility/utils/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/checkEligibility/utils/index.ts)

**Parameter Shape:**
- `slug` (string, required) - Campaign URL slug
- `redis` (RedisClient, required) - Redis client for caching

**Return Type:** `Promise<Campaign | null>`

**Called By:**
- [checkEligibility](#checkeligibility)

**Calls:**
- `redis.get(campaignKey)` - Fetches campaign from Redis cache
- Falls back to MongoDB if cache miss

**Confidence Note:** Explicit TypeScript types.

---

#### ProcessEntries
**Confidence:** 100% High

```typescript
const ProcessEntries = (Services: SaveEntriesServices, jwt: string) =>
  async({ entries, input }: {
    entries: EntriesSplitByOperation
    input: QueueEntry[]
  }): Promise<{
    upsertedCount: number
    deletedCount: number
    batchItemFailures: FailureIdentifier[]
  }>
```

**Source:** [apps/replication/saveEntries/ProcessEntries.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/saveEntries/ProcessEntries.ts)

**Parameter Shape:**
- `Services` (SaveEntriesServices, required) - Services for replication
- `jwt` (string, required) - JWT token

**Curried Function Returns:**
- Function accepting `{ entries, input }`

**Inner Parameter Shape:**
- `entries.puts` (DynamoDbEntryRecord[], required) - Entries to upsert
- `entries.deletions` (DynamoDbEntryRecord[], required) - Entries to delete
- `input` (QueueEntry[], required) - Original queue entries for failure mapping

**Return Type:**
```typescript
{
  upsertedCount: number
  deletedCount: number
  batchItemFailures: FailureIdentifier[]
}
```

**Called By:**
- [saveEntries](#saveentries)

**Calls:**
- `Services.entries.batchUpsert(entries.puts)` - Upserts entries to Entry Service
- `Services.entries.batchDelete(entries.deletions)` - Deletes entries from Entry Service
- Retry logic with exponential backoff

**Confidence Note:** Explicit TypeScript types.

---

#### ValidateOperation
**Confidence:** 100% High

```typescript
const ValidateOperation = (Services: SaveEntriesServices) =>
  async(records: NormalizedQueueEntry[]): Promise<NormalizedQueueEntry[]>
```

**Source:** [apps/replication/saveEntries/ValidateOperations.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/saveEntries/ValidateOperations.ts)

**Parameter Shape:**
- `Services` (SaveEntriesServices, required) - Services for validation

**Curried Function Returns:**
- Function accepting `records: NormalizedQueueEntry[]`

**Inner Parameter Shape:**
- `records` (NormalizedQueueEntry[], required) - Normalized queue entries to validate

**Return Type:** `Promise<NormalizedQueueEntry[]>` (filtered to only valid operations)

**Called By:**
- [saveEntries](#saveentries)

**Calls:**
- `Services.aws.demandTable.get({ PK, SK })` - Fetches current state from demand-table
- Compares queue entry timestamp with current state timestamp
- Filters out stale operations (prevents race conditions)

**Validation Logic:**
```typescript
// Validates that the change record is still current:
const currentEntry = await demandTable.get({ PK: entry.PK, SK: entry.SK });
if (currentEntry.date.updated > entry.date.updated) {
  // Skip stale record
  return null;
}
return record;
```

**Confidence Note:** Explicit TypeScript types.

---

### Formatting Functions

#### formatBatchFailureIdentifiers
**Confidence:** 100% High

```typescript
export const formatBatchFailureIdentifiers = <T extends RecordWithId[]>(records: T): FailureIdentifier[] =>
  records.map(({ recordId }) => ({ itemIdentifier: recordId }))
```

**Source:** [shared/format.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/format.ts:7)

**Parameter Shape:**
- `records` (T extends RecordWithId[], required) - Records with recordId field

**RecordWithId Shape:**
```typescript
{
  recordId: string
}
```

**Return Type:** `FailureIdentifier[]`

**Called By:**
- Kinesis stream workers
- DynamoDB stream workers

**Confidence Note:** Explicit TypeScript generic types.

---

#### formatSQSBatchFailureIdentifiers
**Confidence:** 100% High

```typescript
export const formatSQSBatchFailureIdentifiers = <T extends RecordWithSqsMessageId>(records: T[]): FailureIdentifier[] =>
  records.map(({ sqsMessageId }) => ({ itemIdentifier: sqsMessageId }))
```

**Source:** [shared/format.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/format.ts:13)

**Parameter Shape:**
- `records` (T extends RecordWithSqsMessageId[], required) - Records with sqsMessageId field

**RecordWithSqsMessageId Shape:**
```typescript
Pick<TransformedSQSRecord, 'sqsMessageId'>
```

**Return Type:** `FailureIdentifier[]`

**Called By:**
- [upsertUsers](#upsertusers)
- Other SQS batch workers

**Confidence Note:** Explicit TypeScript generic types.

---

### Selector Functions

#### selectS3ObjectKeyFromRecord
**Confidence:** 100% High

```typescript
export const selectS3ObjectKeyFromRecord = R.pipe(
  R.pathOr('', ['s3', 'object', 'key']),
  decodeURIComponent
)
```

**Source:** [shared/selectors.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/selectors.ts:3)

**Parameter Shape:**
- Input: S3 event record (implicit from Ramda pipe)

**Expected Input Structure:**
```typescript
{
  s3: {
    object: {
      key: string
    }
  }
}
```

**Return Type:** `string` (decoded S3 object key)

**Called By:**
- S3 event triggered workers

**Transformation Logic:**
- Extracts `s3.object.key` from record
- Decodes URI-encoded key
- Returns empty string if path not found

**Confidence Note:** Ramda functional composition with clear path selectors.

---

#### selectS3BucketFromRecord
**Confidence:** 100% High

```typescript
export const selectS3BucketFromRecord = R.pathOr('', ['s3', 'bucket', 'name'])
```

**Source:** [shared/selectors.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/selectors.ts:8)

**Parameter Shape:**
- Input: S3 event record (implicit from Ramda)

**Expected Input Structure:**
```typescript
{
  s3: {
    bucket: {
      name: string
    }
  }
}
```

**Return Type:** `string` (S3 bucket name)

**Called By:**
- S3 event triggered workers

**Confidence Note:** Ramda functional composition with clear path selector.

---

#### selectCampaignGate
**Confidence:** 95% High

```typescript
const selectCampaignGate = (campaign: Campaign): CampaignGate | undefined =>
  campaign.options?.gate
```

**Source:** [apps/registration/checkEligibility/selectors.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/checkEligibility/selectors.ts)

**Parameter Shape:**
- `campaign` (Campaign, required) - Campaign object

**Return Type:** `CampaignGate | undefined`

**Called By:**
- [checkEligibility](#checkeligibility) → checkGate function

**Confidence Note:** Inferred from usage pattern in checkEligibility.

---

## Common Patterns

### Pattern: SQS Batch Worker with Partial Retry

**Description:** Workers that process SQS messages in batches and return `batchItemFailures` for partial retry. This enables SQS to retry only failed messages, not the entire batch.

**Example Usage:**
```typescript
const handler: SQSBatchWorker<MessageType, ResultType, Services> = async({
  input,
  Services,
  jwt
}) => {
  const results = await processMessages(input, Services, jwt);

  const failedRecords = results.filter(r => !r.success);
  const batchItemFailures = formatSQSBatchFailureIdentifiers(failedRecords);

  return {
    batchItemFailures,
    count: {
      received: input.length,
      processed: input.length - failedRecords.length,
      failed: failedRecords.length
    }
  };
};
```

**Found In:**
- [upsertUsers](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/upsertUsers/index.ts:24)
- [saveEntries](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/saveEntries/index.ts:56)
- [saveSelections](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/selection/saveSelections/index.ts)

**Key Requirements:**
- Return `batchItemFailures: FailureIdentifier[]`
- Use `sqsMessageId` as `itemIdentifier`
- Always return array (even if empty)

---

### Pattern: DynamoDB Stream Validation

**Description:** Workers that process DynamoDB stream events must validate that the change record is still current before acting on it. This prevents race conditions where the record has been modified again after the stream event was created.

**Example Usage:**
```typescript
const ValidateOperation = (Services: SaveEntriesServices) =>
  async(records: NormalizedQueueEntry[]): Promise<NormalizedQueueEntry[]> => {
    const validRecords = await Promise.all(
      records.map(async(record) => {
        // Fetch current state from demand-table
        const currentEntry = await Services.aws.demandTable.get({
          PK: record.entry.PK,
          SK: record.entry.SK
        });

        // Skip if timestamps don't match (stale record)
        if (currentEntry.date.updated > record.entry.date.updated) {
          return null;
        }

        return record;
      })
    );

    return validRecords.filter(r => r !== null);
  };
```

**Found In:**
- [saveEntries](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/saveEntries/index.ts:56) → ValidateOperation

**Key Requirements:**
- Always fetch current state before replicating
- Compare timestamps to detect stale records
- Filter out invalid operations

---

### Pattern: Curried Service Injection

**Description:** Helper functions that accept services and return a function that operates on data. This pattern enables dependency injection and testing.

**Example Usage:**
```typescript
const ProcessEntries = (Services: SaveEntriesServices, jwt: string) =>
  async({ entries, input }: { entries: EntriesSplitByOperation, input: QueueEntry[] }) => {
    // Implementation using Services and jwt
    const result = await Services.entries.batchUpsert(entries.puts);
    return result;
  };

// Usage:
const processEntries = ProcessEntries(Services, jwt);
const result = await processEntries({ entries, input });
```

**Found In:**
- [ProcessEntries](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/saveEntries/ProcessEntries.ts)
- [ValidateOperation](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/saveEntries/ValidateOperations.ts)
- [UpsertUsers](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/upsertUsers/UpsertUsers.ts)

**Key Requirements:**
- Outer function accepts dependencies (Services, config, jwt)
- Inner function accepts data to operate on
- Enables testing by mocking services

---

### Pattern: Ramda Functional Composition

**Description:** Use Ramda for immutable data transformations and functional composition. This pattern aligns with the codebase's strict functional programming requirements.

**Example Usage:**
```typescript
import * as R from 'ramda';

// Pipe for sequential transformations
const processRecord = R.pipe(
  R.pathOr('', ['s3', 'object', 'key']),
  decodeURIComponent,
  parseFilename
);

// Compose for right-to-left transformations
const dedupe = R.uniqBy(R.prop('globalUserId'));

// groupBy for categorization
const groupByCampaign = R.groupBy(R.prop('campaignId'));

// pluck for extracting fields
const extractIds = R.pluck('id');
```

**Found In:**
- [selectors.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/selectors.ts:3)
- [saveEntries](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/saveEntries/index.ts:37)

**Key Requirements:**
- No mutations (use R.assoc, R.merge instead of object spread when needed)
- Prefer R.pipe for readability
- Use point-free style where appropriate

---

### Pattern: Error Formatting with Context

**Description:** Format errors with context information for debugging and observability.

**Example Usage:**
```typescript
import { formatError } from '../../../shared/util/error';

try {
  await processData();
} catch (error) {
  log.error('check eligibility error', formatError(error));
  return { ...DEFAULT_INELIGIBLE, reason: INELIGIBLE_REASON.SERVER_ERROR };
}
```

**Found In:**
- [checkEligibility](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/checkEligibility/index.ts:81)

**Key Requirements:**
- Always format errors before logging
- Include operation context in log message
- Return user-friendly error responses

---

### Pattern: Redis Cache with Fallback

**Description:** Use Redis cache for campaign data with MongoDB fallback. Always quit Redis connection in finally block.

**Example Usage:**
```typescript
const getCampaign = async({ slug, redis }: { slug: string, redis: RedisClient }) => {
  try {
    const campaignKey = `campaign:${slug}`;
    const cached = await redis.get(campaignKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to MongoDB
    const campaign = await mongo.campaigns.findOne({ slug });

    if (campaign) {
      await redis.set(campaignKey, JSON.stringify(campaign), 'EX', 3600);
    }

    return campaign;
  } finally {
    await redis.quit();
  }
};
```

**Found In:**
- [checkEligibility](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/registration/checkEligibility/index.ts:85) → getCampaign

**Key Requirements:**
- Always use try/finally with redis.quit()
- Set TTL on cached values
- Fallback to MongoDB on cache miss

---

## Type Inference Examples

### Example 1: SQS Message Transformation

**Input Type (AWS Lambda SQS Event):**
```typescript
{
  Records: [
    {
      messageId: string
      body: string  // JSON string
      messageAttributes: SQSMessageAttributes
      eventSourceARN: string
    }
  ]
}
```

**After Middleware Transformation:**
```typescript
TransformedSQSRecord<MessageType>[] = [
  {
    // Parsed message body fields
    ...parsedBody,
    // Added by middleware
    sqsMessageId: string
    __meta: Record<string, unknown>
    sqsMessageAttributes: SQSMessageAttributes
    sqsEventSourceARN: string
    shouldRetry?: boolean
  }
]
```

**Pattern:** Middleware parses `body` JSON and spreads fields, then adds metadata.

---

### Example 2: DynamoDB Stream Normalization

**Input Type (DynamoDB Stream Event):**
```typescript
{
  Records: [
    {
      eventName: 'INSERT' | 'MODIFY' | 'REMOVE'
      dynamodb: {
        NewImage?: AttributeMap
        OldImage?: AttributeMap
        Keys: AttributeMap
      }
    }
  ]
}
```

**After normalizeDynamoStreamRecord():**
```typescript
{
  operation: 'INSERT' | 'MODIFY' | 'REMOVE'
  newItem?: DynamoDbEntry
  oldItem?: DynamoDbEntry
  keys: { PK: string, SK: string }
}
```

**Pattern:** Unmarshals DynamoDB AttributeMap to plain objects and categorizes by operation.

---

### Example 3: Campaign Data Flow

**MongoDB Campaign Schema:**
```typescript
// Raw MongoDB document
{
  _id: ObjectId
  slug: string
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'PREVIEW'
  artist: { discovery_id: string, name: string }
  markets: [...]
  // ... all campaign fields
}
```

**After Redis Caching:**
```typescript
Campaign  // Same structure but serialized/deserialized
```

**Used in Worker:**
```typescript
// Validated and type-safe
const campaign: Campaign = await getCampaign({ slug, redis });
const gate: CampaignGate | undefined = campaign.options?.gate;
```

**Pattern:** MongoDB → Redis cache → TypeScript type (no transformation, just serialization).

---

## Service Method Signatures

### EntryService

#### batchUpsert
**Confidence:** 90% High

```typescript
entryService.batchUpsert = async(entries: DynamoDbEntryRecord[]): Promise<{
  success: boolean
  upsertedCount: number
  failed?: string[]
}>
```

**Called By:**
- [saveEntries](#saveentries) → ProcessEntries

---

#### batchDelete
**Confidence:** 90% High

```typescript
entryService.batchDelete = async(entries: DynamoDbEntryRecord[]): Promise<{
  success: boolean
  deletedCount: number
  failed?: string[]
}>
```

**Called By:**
- [saveEntries](#saveentries) → ProcessEntries

---

### UserService

#### batchUpsert
**Confidence:** 90% High

```typescript
userService.batchUpsert = async(users: UserInfoMessage[], jwt: string): Promise<UpsertUsersBatchResult>
```

**UpsertUsersBatchResult Shape:**
```typescript
{
  success: boolean
  failed?: string[]  // Array of global_user_ids that failed
}
```

**Called By:**
- [upsertUsers](#upsertusers) → UpsertUsers

---

### CampaignService

#### getCampaignBySlug
**Confidence:** 85% Medium

```typescript
campaignService.getCampaignBySlug = async(slug: string): Promise<Campaign | null>
```

**Called By:**
- getCampaign helper (with Redis caching)

---

### CodeService

#### reserveCodes
**Confidence:** 85% Medium

```typescript
codeService.reserveCodes = async(params: {
  campaignId: string
  marketId: string
  count: number
  codeConfigId?: string
}): Promise<{
  codes: Array<{ id: string, marketId: string }>
  reserved: number
}>
```

**Called By:**
- enqueueMarketSelections worker

---

### RedisClient

#### get
**Confidence:** 100% High

```typescript
redis.get = async(key: string): Promise<string | null>
```

---

#### set
**Confidence:** 100% High

```typescript
redis.set = async(key: string, value: string, mode?: 'EX' | 'PX', ttl?: number): Promise<'OK'>
```

---

#### quit
**Confidence:** 100% High

```typescript
redis.quit = async(): Promise<'OK'>
```

**Called By:**
- All workers using Redis (in finally block)

---

## Middleware Type Mapping

| Middleware Type | Input Event Type | Output Type | Use Case |
|----------------|------------------|-------------|----------|
| `SQS_CONSUMER` | `TransformedSQSRecord<Message>[]` | `SQSResultHandlerOutput` | SQS with unprocessed records |
| `SQS_BATCH_CONSUMER` | `TransformedSQSRecord<Message>[]` | `SQSBatchItemResultHandlerOutput` | SQS with batch item failures |
| `DYNAMODB_CONSUMER` | DynamoDB Stream Records | `EnqueueFromStreamOutput` | DynamoDB stream processing |
| `APPSYNC_RESOLVER` | AppSync event | Custom output | AppSync pipeline function |
| `SCHEDULED` | EventBridge event | void | Scheduled task |
| `KAFKA_CONSUMER` | Kafka message | void | Kafka topic consumption |
| `SDK_INVOKED` | Custom payload | Custom output | Direct Lambda invocation |

**Pattern:** Middleware type determines input transformation and expected output format.
