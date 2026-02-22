# Type Usage Patterns - vf-api-workers

## Function Signatures

### Exported Functions with Object Parameters

#### formatBatchFailureIdentifiers
**Confidence:** 95-100% High

```typescript
export const formatBatchFailureIdentifiers = <T extends RecordWithId[]>(records: T): FailureIdentifier[]
```

**Source:** [format.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/format.ts:7)

**Parameter Shape:**
- `records` (Array<RecordWithId>, required)
  - Each record must have `recordId` (string, required)

**Return Type:** Array<[FailureIdentifier](/Users/Brodie.Balser/.vf-docs/vf-api-workers/dynamic/types-definitions.md#failureidentifier)>

**Description:** Maps an array of records with IDs to AWS Lambda batch failure identifiers.

**Called By:**
- Batch result handler middleware (for SQS and Kinesis)

**Confidence Note:** Explicit TypeScript types with generic constraint

---

#### formatPrimaryKey
**Confidence:** 95-100% High

```typescript
export const formatPrimaryKey = ({ campaignId, globalUserId }) => ({
  PK: `fan:${globalUserId}`,
  SK: `campaign:${campaignId}`
})
```

**Source:** [format.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/format.ts:11)

**Parameter Shape:**
- `campaignId` (string, required) - Campaign identifier
- `globalUserId` (string, required) - Global user identifier

**Return Type:**
```typescript
{
  PK: string,  // Format: "fan:{globalUserId}"
  SK: string   // Format: "campaign:{campaignId}"
}
```

**Description:** Formats DynamoDB composite key for fan-campaign relationships.

**Called By:**
- DynamoDB operations in worker apps

**Confidence Note:** Inferred from function implementation with clear parameter destructuring

---

#### Tracing
**Confidence:** 70-94% Medium

```javascript
export const Tracing = ({ workerName }) => app => async params => { ... }
```

**Source:** [telemetry.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/middlewares/telemetry.ts:99)

**Function Type:** Higher-order middleware factory

**Parameter Shape (outer function):**
- `workerName` (string, required) - Name of the worker for tracing

**Parameter Shape (middleware function):**
- `app` (function, required) - Next middleware or worker handler in chain

**Parameter Shape (handler function):**
- `params` (object, required)
  - `correlation` (object, optional)
    - `id` (string, optional) - Correlation ID
    - `awsRequestId` (string, optional) - AWS request ID
  - `input` (object, optional)
    - `event` (object, optional)
      - `headers` (object, optional) - For extracting parent trace context

**Return Type:** Function that returns Promise<Result>

**Description:** Middleware that wraps worker execution in OpenTelemetry tracing spans.

**Calls:**
- `resolveWorkerConfig` - Resolves worker configuration
- `GlobalTracer` - Creates OpenTelemetry tracer
- `app(params)` - Calls next middleware/handler

**Confidence Note:** JSDoc annotations and parameter usage patterns

---

### Worker Handlers

#### verdictReporter
**Confidence:** 70-94% Medium

```javascript
const verdictReporter = ({ input = [], Services, correlation, jwt }) => Promise<Result>
```

**Source:** [verdictReporter/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/verdictReporter/index.js:58)

**Parameter Shape:**
- `input` (Array, required, default: []) - Array of verdict records
  - Each record has:
    - `campaignId` (string) - Campaign identifier
    - Other fields (see normalizers.js)
- `Services` (object, required)
  - `aws` (object)
    - `demandTable` (DynamoDB client) - For looking up current counts
    - `verdictReporterQueue` (SQS client) - For requeueing
- `correlation` (object, optional) - Correlation tracking
- `jwt` (string, optional) - Authentication token

**Return Type:** Promise<object>
```javascript
{
  results: Array<{ SLACK: ... } | { REQUEUE: ... }>,
  unprocessed: Array,
  // other metrics
}
```

**Description:** Processes verdict records by checking counts and either posting to Slack or requeueing.

**Calls:**
- `filterByCampaignId` - Filters records
- `LookupAndMergeCurrentCounts` - Queries DynamoDB
- `MapAsyncParallel` - Parallel processing
- `RequeueOrPostToSlack` - Handler for each record
- `normalizeResults` - Formats output

**Confidence Note:** Parameter destructuring with defaults, inferred from usage

---

#### saveEntryScoring
**Confidence:** 70-94% Medium

```javascript
const saveEntryScoring = async({ input, ...ctx }) => Promise<{ count: object }>
```

**Source:** [saveEntryScoring/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/saveEntryScoring/index.js:73)

**Parameter Shape:**
- `input` (Array, required) - Array of scoring records
  - Each record has:
    - `campaignId` (string)
    - `events` (Array) - Must have at least `events[0]` (rank 0)
    - `memberId` (string)
    - `globalUserId` (string)
    - `phoneType` (string)
    - `phone` (string)
    - `phoneConfirmedDate` (string)
    - `email` (string)
    - `firstName` (string)
    - `lastName` (string)
    - `isVerified` (boolean)
    - `score` (number)
    - `localFanscore` (number)
    - `bandScore` (number)
    - `hbase` (string) - Market identifier
    - `locale` (string)
- `Services` (object, required)
  - `entries` (service client) - Entries service API
  - `campaigns` (service client) - Campaigns service API
- `jwt` (string, required) - Authentication token
- `correlation` (object, optional) - Correlation tracking

**Return Type:** Promise<{ count: object }>
```javascript
{
  count: {
    records: number,
    input: number,
    scoring: number,
    entries: number,
    inserted: number,
    updated: number,
    found: number
  }
}
```

**Description:** Normalizes and saves entry scoring data to the entries service.

**Calls:**
- `hasRank0` - Filters records with rank 0
- `R.groupBy` - Groups by campaign ID
- `MapAsyncSerial` - Serial processing by campaign
- `SaveScoring` - Saves each campaign's scores
- `NormalizeRecord` - Transforms record structure
- `aggregateCounts` - Aggregates metrics
- `emitMetrics` - Emits CloudWatch metrics

**Confidence Note:** Parameter destructuring and spread operator, inferred from implementation

---

#### loadScoresToDynamo
**Confidence:** 95-100% High

```javascript
const loadScoresToDynamo = async({ input, Services, correlation }) => Promise<object>
```

**Source:** [loadScoresToDynamoDB/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/loadScoresToDynamoDB/index.js:4)

**Parameter Shape:**
- `input` (Array, required) - Array of score records
- `Services` (object, required) - Injected services
- `correlation` (object, required) - Correlation tracking

**Return Type:** Promise<object>
```javascript
{
  ...metrics,  // From batch update
  in: number   // Input record count
}
```

**Description:** Loads scoring data to DynamoDB in batches.

**Calls:**
- `BatchUpdateRegistrations` - Handles batch updates
- `emitMetrics` - Sends metrics to CloudWatch

**Confidence Note:** Explicit parameter destructuring with clear types

---

### Utility Functions

#### NormalizeRecord
**Confidence:** 70-94% Medium

```javascript
export const NormalizeRecord = R.pipeP(
  getMarkets,
  mapMarketIdsByName,
  markets => R.applySpec({ ... })
)
```

**Source:** [saveEntryScoring/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/saveEntryScoring/index.js:24)

**Function Type:** Async transformation pipeline (Ramda pipeP)

**Parameter Shape (implicit):**
- Object with:
  - `campaignId` (string, required)
  - `campaigns` (service client, required)
  - `jwt` (string, required)

**Return Type:** Function that transforms scoring records
```javascript
(record: ScoringRecord) => Promise<NormalizedRecord>

// Output shape:
{
  memberId: string,
  globalUserId: string,
  phoneType: string,
  phone: string,
  phoneConfirmedDate: string,
  email: string,
  firstName: string,
  lastName: string,
  verdict: boolean,
  score: number,
  localFanscore: number,
  bandScore: number,
  marketId: string,  // Resolved from hbase via markets lookup
  locale: string
}
```

**Description:** Creates a transformation function that normalizes scoring records for entry service.

**Calls:**
- `getMarkets` - Fetches market data from campaigns service
- `mapMarketIdsByName` - Creates market name to ID mapping
- `R.applySpec` - Applies field transformations

**Confidence Note:** Ramda pipeline with explicit field mapping via applySpec

---

#### SaveScoring
**Confidence:** 70-94% Medium

```javascript
const SaveScoring = ({ Services: { entries, campaigns }, jwt, correlation }) =>
  async([campaignId, input]) => Promise<CountObject>
```

**Source:** [saveEntryScoring/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/saveEntryScoring/index.js:48)

**Function Type:** Curried async function

**Parameter Shape (outer function):**
- `Services` (object, required)
  - `entries` (service client, required)
  - `campaigns` (service client, required)
- `jwt` (string, required)
- `correlation` (object, optional)

**Parameter Shape (inner function):**
- `[campaignId, input]` (tuple, required)
  - `campaignId` (string) - Campaign ID
  - `input` (Array) - Scoring records for this campaign

**Return Type:** Promise<object>
```javascript
{
  input: number,
  scoring: number,
  entries: number,
  inserted: number,
  updated: number,
  found: number
}
```

**Description:** Saves scoring records for a single campaign to entries service.

**Calls:**
- `NormalizeRecord` - Creates record normalizer
- `entries.saveScoring` - Saves to entries service

**Confidence Note:** Parameter destructuring and array destructuring in function signature

---

#### LookupAndMergeCurrentCounts
**Confidence:** 70-94% Medium

```javascript
const LookupAndMergeCurrentCounts = ({ aws: { demandTable } }) =>
  records => Promise<Array<RecordWithCounts>>
```

**Source:** [verdictReporter/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/verdictReporter/index.js:31)

**Function Type:** Curried async function (Ramda pipeP)

**Parameter Shape (outer function):**
- Object with nested destructuring:
  - `aws` (object)
    - `demandTable` (DynamoDB client)

**Parameter Shape (inner function):**
- `records` (Array, required) - Verdict records to process

**Return Type:** Promise<Array>
```javascript
[{
  ...originalRecord,
  currentCount: object,  // Current counts from DynamoDB
  hasMatchingCounts: boolean  // Whether last count matches current
}]
```

**Description:** Looks up current counts from DynamoDB and merges with records.

**Calls:**
- `R.map(normalizeCountsKeys)` - Normalizes count keys
- `demandTable.getMany` - Batch get from DynamoDB
- `R.indexBy(selectCampaignId)` - Indexes results by campaign
- `AddCurrentCountToRecords` - Merges counts with records

**Confidence Note:** Ramda pipeline with DynamoDB client method

---

#### BatchUpdateRegistrations
**Confidence:** 70-94% Medium

```javascript
const BatchUpdateRegistrations = ({ Services, correlation }) =>
  async(input) => Promise<MetricsObject>
```

**Source:** [loadScoresToDynamoDB/BatchUpdateRegistrations.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/loadScoresToDynamoDB/BatchUpdateRegistrations.js)

**Parameter Shape (outer function):**
- `Services` (object, required) - Injected services
- `correlation` (object, required) - Correlation tracking

**Parameter Shape (inner function):**
- `input` (Array, required) - Score records to update

**Return Type:** Promise<object>
```javascript
{
  updated: number,
  failed: number,
  // other metrics
}
```

**Description:** Performs batch update of registration scores in DynamoDB.

**Calls:**
- `normalizeDynamoUpdate` - Transforms records for DynamoDB
- DynamoDB batch write operations

**Confidence Note:** Function signature inferred from usage in index.js

---

### Service Initialization

#### services
**Confidence:** 95-100% High

```typescript
const services = async(): Promise<Services>
```

**Source:** [services/index.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/services/index.ts:28)

**Parameter Shape:** None (no parameters)

**Return Type:** Promise<[Services](/Users/Brodie.Balser/.vf-docs/vf-api-workers/dynamic/types-definitions.md#services)>
```typescript
{
  aws: AWS,
  request: Request,
  // Additional instrumented services
}
```

**Description:** Initializes and returns all services (AWS clients, HTTP request, etc.) with instrumentation.

**Calls:**
- `AWSClients` - Creates AWS service clients
- `InstrumentedRequest` - Wraps request function with tracing
- `InstrumentedServices` - Wraps additional services with instrumentation

**Confidence Note:** Explicit TypeScript return type annotation

---

## Common Patterns

### Pattern: Curried Middleware Factory

**Description:** Higher-order functions that create middleware by partially applying configuration, then accepting the next handler, then accepting request parameters.

**Example Usage:**
```javascript
// Factory accepts config
const middleware = ({ config }) =>
  // Returns middleware that accepts next handler
  app =>
    // Returns handler that accepts request params
    async params => {
      // Process params
      const result = await app(params);
      // Post-process result
      return result;
    };
```

**Found In:**
- [telemetry.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/middlewares/telemetry.ts:99) - Tracing middleware
- [services.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/middlewares/services.js) - Services injection
- [correlation.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/middlewares/correlation.js) - Correlation ID

---

### Pattern: Ramda pipeP for Async Pipelines

**Description:** Using Ramda's `pipeP` to compose async transformations in a readable pipeline.

**Example Usage:**
```javascript
const processRecords = ({ config }) => R.pipeP(
  () => Promise.resolve(input),
  filterRecords,
  transformRecords,
  saveToDatabase,
  formatResponse
)();
```

**Found In:**
- [verdictReporter/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/verdictReporter/index.js:58) - Main handler
- [saveEntryScoring/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/saveEntryScoring/index.js:73) - Scoring pipeline
- [verdictReporter/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/verdictReporter/index.js:31) - Count lookup

---

### Pattern: Service Injection via Destructuring

**Description:** Workers receive services through object destructuring, making dependencies explicit.

**Example Usage:**
```javascript
const handler = ({ input, Services, correlation, jwt }) => {
  const { aws, request } = Services;
  const { demandTable, verificationsTable } = aws;
  // Use services
};
```

**Found In:**
- [verdictReporter/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/verdictReporter/index.js:58)
- [saveEntryScoring/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/saveEntryScoring/index.js:73)
- [loadScoresToDynamoDB/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/loadScoresToDynamoDB/index.js:4)

---

### Pattern: Generic Worker Type with Specializations

**Description:** Base `Worker` type supports multiple event sources, with specialized types for SQS and Kinesis.

**Example Usage:**
```typescript
// Generic worker
const handler: Worker<MyEvent, MyResult, Services> = async({ input, Services }) => {
  return processEvent(input);
};

// SQS worker
const sqsHandler: SQSWorker<MyMessage, MyResult, Services> = async({ input, Services }) => {
  const unprocessed = [];
  // Process SQS records
  return { ...result, unprocessed };
};

// Kinesis worker
const kinesisHandler: KinesisWorker<MyMessage, MyResult, Services> = async({ input, Services }) => {
  // Process Kinesis records
  return batchItemResults;
};
```

**Found In:**
- [Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts:44) - Base worker type
- [Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts:94) - SQSWorker
- [Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts:51) - KinesisWorker
- [template/index.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/templates/template/index.ts:6) - Template usage

---

### Pattern: DynamoDB Composite Keys

**Description:** Using `PK` (Partition Key) and `SK` (Sort Key) with prefixed values for entity types.

**Example Usage:**
```javascript
// Fan-Campaign relationship
const key = formatPrimaryKey({ campaignId, globalUserId });
// Returns: { PK: "fan:{globalUserId}", SK: "campaign:{campaignId}" }
```

**Format Convention:**
- `PK` = `{entityType}:{entityId}`
- `SK` = `{relationType}:{relationId}`

**Found In:**
- [format.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/format.ts:11) - Key formatting
- Used across DynamoDB table operations

---

### Pattern: Batch Result Handling

**Description:** Processing batches with partial failure support, tracking unprocessed records.

**Example Usage:**
```javascript
// SQS batch handler
const handler = async({ input }) => {
  const unprocessed = [];
  for (const record of input) {
    try {
      await processRecord(record);
    } catch (err) {
      if (shouldRetry(err)) {
        unprocessed.push(record);
      }
    }
  }
  return { unprocessed };
};
```

**Return Types:**
- SQS: `{ unprocessed: TransformedSQSRecord[] }`
- Kinesis: `{ batchItemFailures: FailureIdentifier[] }`

**Found In:**
- [Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts:90) - SQSResultHandlerOutput
- [Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts:77) - KinesisBatchItemResultHandlerOutput
- [format.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/format.ts:7) - formatBatchFailureIdentifiers

---

### Pattern: Record Metadata with __meta

**Description:** Transformed records include `__meta` field with original event metadata.

**Example Usage:**
```javascript
// Transformed record structure
{
  ...messageData,  // Decoded message fields
  recordId: 'kinesis-shard-00001',
  __meta: {
    sequenceNumber: '...',
    partitionKey: '...',
    // other metadata
  }
}
```

**Found In:**
- [Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts:79) - TransformedSQSRecord
- [Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts:65) - TransformedKinesisMessage

---

### Pattern: MapAsync Utilities

**Description:** Using `@verifiedfan/map-utils` for parallel or serial async array processing.

**Example Usage:**
```javascript
import { MapAsyncParallel, MapAsyncSerial } from '@verifiedfan/map-utils';

// Parallel processing (for independent operations)
const results = await MapAsyncParallel(processItem)(items);

// Serial processing (for dependent operations or rate limiting)
const results = await MapAsyncSerial(processItem)(items);
```

**Found In:**
- [verdictReporter/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/verdictReporter/index.js:62) - Parallel Slack posting
- [saveEntryScoring/index.js](/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/apps/saveEntryScoring/index.js:78) - Serial entry saving

---

## Function Call Relationships

### verdictReporter Handler Chain

```
verdictReporter
  ├─ filterByCampaignId (normalizers.js)
  ├─ LookupAndMergeCurrentCounts
  │   ├─ R.map(normalizeCountsKeys)
  │   ├─ demandTable.getMany
  │   ├─ R.indexBy(selectCampaignId)
  │   └─ AddCurrentCountToRecords
  │       ├─ selectCampaignId (normalizers.js)
  │       ├─ selectLastCount (normalizers.js)
  │       └─ formatCurrentCount (normalizers.js)
  ├─ MapAsyncParallel(RequeueOrPostToSlack)
  │   ├─ CheckMetaSlackCounts (CheckMetaSlackCounts.js)
  │   ├─ PostDetailsToSlack (PostDetailsToSlack.js)
  │   └─ RequeueMessage (RequeueMessage.js)
  └─ normalizeResults (normalizers.js)
```

---

### saveEntryScoring Handler Chain

```
saveEntryScoring
  ├─ hasRank0 (checks events[0])
  ├─ R.groupBy(selectCampaignId)
  ├─ MapAsyncSerial(SaveScoring)
  │   ├─ NormalizeRecord
  │   │   ├─ getMarkets (getMarkets.js)
  │   │   ├─ mapMarketIdsByName
  │   │   └─ R.applySpec (field mappings)
  │   └─ entries.saveScoring
  ├─ aggregateCounts (AggregateCounts from utils)
  └─ AssocRecordsCount
```

---

### loadScoresToDynamo Handler Chain

```
loadScoresToDynamo
  ├─ BatchUpdateRegistrations (BatchUpdateRegistrations.js)
  │   ├─ normalizeDynamoUpdate (normalizeDynamoUpdate.js)
  │   └─ DynamoDB batch operations
  └─ emitMetrics (emitMetrics.js)
```

---

### Middleware Chain Example

```
Lambda Handler
  └─ Tracing (telemetry.ts)
      └─ Services (services.js)
          └─ Correlation (correlation.js)
              └─ TransformInput (transformInput/index.js)
                  └─ ResultHandler (resultHandler.js)
                      └─ Worker Handler (app code)
```
