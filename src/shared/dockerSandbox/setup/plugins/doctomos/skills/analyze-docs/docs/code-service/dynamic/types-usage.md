# Type Usage Patterns - code-service

## Manager Functions (Business Logic Layer)

### uploadCodes
**Confidence:** 95% High (JSDoc annotations + explicit parameter usage)

```javascript
async function uploadCodes(managerCtx, {
  isAuthSupreme: boolean,
  fileKey: string
}): Promise<{ count: { in: number, inserted: number, updated: number } }>
```

**Source:** [index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:22)

**Parameters:**
- `managerCtx` (ManagerContext, required)
  - `managerCtx.service.scoringBucket` - S3 client for file operations
  - `managerCtx.datastore.codes` - Database operations
  - `managerCtx.correlation` - Request correlation tracking
- `isAuthSupreme` (boolean, required) - Whether user has supreme privileges
- `fileKey` (string, required) - S3 object key in format `codes/{campaignId}/{type}/{filename}.csv`

**Return Type:** Promise<UploadResponse>
```javascript
{
  count: {
    in: number,        // Total codes in CSV
    inserted: number,  // New codes added
    updated: number    // Existing codes updated
  }
}
```

**Called By:**
- [router/index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/router/index.js:40) - POST `/:campaignId/codes` endpoint

**Calls:**
- [readAndStoreCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/readAndStoreCodes.js:20) - CSV parsing and storage

**Validation:**
- Throws `invalidFileKey` if fileKey doesn't match regex
- Throws `supremeUserRequired` if not supreme user
- Throws `InvalidType` if type not 'tm' or 'external'

**File Key Parsing:**
- Uses regex: `/codes\/(?<campaignId>.+)\/(?<type>.+)\/.+/`
- Extracts `campaignId` and `type` from S3 path

**Process Flow:**
```
S3 File → Stream → CSV Parser → Batch (50k) → MongoDB Upsert → Count Result
```

---

### countCodes
**Confidence:** 95% High (JSDoc annotations + explicit parameter usage)

```javascript
async function countCodes(managerCtx, {
  isAuthSupreme: boolean,
  campaignId: string,
  type: string,
  status?: string
}): Promise<{ [status: string]: number }>
```

**Source:** [index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:41)

**Parameters:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Supreme user check
- `campaignId` (string, required) - Campaign identifier
- `type` (string, required) - Code type: 'tm' or 'external'
- `status` (string, optional) - Status filter: 'available', 'reserved', or 'assigned'

**Return Type:** Promise<CountResponse>
```javascript
{
  available?: number,  // Count if status='available' or no status filter
  reserved?: number,   // Count if status='reserved' or no status filter
  assigned?: number    // Count if status='assigned' or no status filter
}
```

**Called By:**
- [router/index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/router/index.js:46) - GET `/:campaignId/codes/count` endpoint

**Calls:**
- [findCodesCounts](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findCodesCounts.js:3) - Parallel status counting

**Validation:**
- Throws `supremeUserRequired` if not supreme user
- Throws `missingType` if type not provided
- Throws `InvalidType` if type not 'tm' or 'external'
- Throws `InvalidStatus` if status not valid enum value

**Behavior:**
- If `status` provided: Returns count for that single status
- If no `status`: Returns counts for all statuses (available, reserved, assigned)

---

### reserveCodes
**Confidence:** 95% High (JSDoc annotations + explicit parameter usage)

```javascript
async function reserveCodes(managerCtx, {
  isAuthSupreme: boolean,
  campaignId: string,
  count: number,
  type: string
}): Promise<string[]>
```

**Source:** [index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:66)

**Parameters:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Supreme user check
- `campaignId` (string, required) - Campaign identifier
- `count` (number, required) - Number of codes to reserve
- `type` (string, required) - Code type: 'tm' or 'external'

**Return Type:** Promise<string[]> - Array of reserved code strings

**Called By:**
- [router/index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/router/index.js:59) - GET `/:campaignId/reserve` endpoint

**Calls:**
- [findAndReserveCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findAndReserveCodes.js:11) - Finds and reserves codes with retry logic

**Validation:**
- Throws `supremeUserRequired` if not supreme user
- Throws `missingCodeReserveParams` if count or type missing
- Throws `invalidCount` if count < 1
- Throws `InvalidType` if type not 'tm' or 'external'

**Reserve Logic:**
- Generates UUID for this reservation batch
- Attempts to reserve `count` available codes
- Retries up to MAX_RETRIES (2) times on conflicts
- Returns array of successfully reserved codes

**Reserve Expiration:**
- Reserved codes expire after 24 hours (calculated as "yesterday" from current time)
- Expired reserved codes become available again

---

### assignCodes
**Confidence:** 95% High (JSDoc annotations + explicit parameter usage)

```javascript
async function assignCodes(managerCtx, {
  isAuthSupreme: boolean,
  campaignId: string,
  codes: string[]
}): Promise<{ count: { in: number, updated: number } }>
```

**Source:** [index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:102) (via UpdateCodes factory)

**Parameters:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Supreme user check
- `campaignId` (string, required) - Campaign identifier
- `codes` (string[], required) - Array of code strings to assign

**Return Type:** Promise<UpdateResponse>
```javascript
{
  count: {
    in: number,       // Number of codes in request
    updated: number   // Number of codes actually assigned
  }
}
```

**Called By:**
- [router/index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/router/index.js:36) - POST `/:campaignId/assign` endpoint

**Calls:**
- [codes.assignCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:62) - MongoDB update operation

**Validation:**
- Throws `supremeUserRequired` if not supreme user
- Throws `missingCodes` if codes parameter not provided
- Throws `invalidCodesProp` if codes is not an array
- Throws `emptyCodes` if codes array is empty

**Assign Logic:**
- Sets `date.assigned` to current timestamp for matching codes
- Permanently assigns codes (no expiration)
- Returns count of successfully updated documents

---

### releaseCodes
**Confidence:** 95% High (JSDoc annotations + explicit parameter usage)

```javascript
async function releaseCodes(managerCtx, {
  isAuthSupreme: boolean,
  campaignId: string,
  codes: string[]
}): Promise<{ count: { in: number, updated: number } }>
```

**Source:** [index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:104) (via UpdateCodes factory)

**Parameters:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Supreme user check
- `campaignId` (string, required) - Campaign identifier
- `codes` (string[], required) - Array of code strings to release

**Return Type:** Promise<UpdateResponse>
```javascript
{
  count: {
    in: number,       // Number of codes in request
    updated: number   // Number of codes actually released
  }
}
```

**Called By:**
- [router/index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/router/index.js:57) - POST `/:campaignId/release` endpoint

**Calls:**
- [codes.releaseCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:78) - MongoDB update operation

**Validation:**
- Throws `supremeUserRequired` if not supreme user
- Throws `missingCodes` if codes parameter not provided
- Throws `invalidCodesProp` if codes is not an array
- Throws `emptyCodes` if codes array is empty

**Release Logic:**
- Removes `date.reserved` field from matching codes
- Only releases codes that are reserved (not assigned)
- Returns count of successfully updated documents
- Released codes become available again

---

## Datastore Functions (Database Layer)

### findAvailableCodes
**Confidence:** 90% High (Clear implementation)

```javascript
async function findAvailableCodes({
  campaignId: string,
  count: number,
  type: string
}): Promise<Array<{ _id: { campaign_id: string, code: string } }>>
```

**Source:** [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:36)

**Parameters:**
- `campaignId` (string, required) - Campaign identifier
- `count` (number, required) - Maximum number of codes to return
- `type` (string, required) - Code type: 'tm' or 'external'

**Return Type:** Promise<CodeDocument[]> - Array of code documents (only _id field)

**Called By:**
- [findAndReserveCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findAndReserveCodes.js:22)

**MongoDB Query:**
```javascript
{
  '_id.campaign_id': campaignId,
  'type': type,
  $or: [
    { 'date.reserved': { $exists: false } },
    { 'date.reserved': { $lte: yesterday() } }
  ],
  'date.assigned': { $exists: false }
}
```

**Projection:** `{ _id: 1 }` - Only returns ID fields

**Limit:** Applied using cursor.limit(count)

---

### countCodesByStatus
**Confidence:** 90% High (Clear implementation)

```javascript
async function countCodesByStatus({
  campaignId: string,
  type: string,
  status: string,
  statusFn?: Function
}): Promise<number>
```

**Source:** [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:48)

**Parameters:**
- `campaignId` (string, required) - Campaign identifier
- `type` (string, required) - Code type: 'tm' or 'external'
- `status` (string, required) - Status enum value
- `statusFn` (Function, optional) - Status query function from STATUS_QUERY map

**Return Type:** Promise<number> - Count of matching codes

**Called By:**
- [findCodesCounts](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findCodesCounts.js:7)

**MongoDB Query:**
```javascript
{
  '_id.campaign_id': campaignId,
  'type': type,
  ...statusFn()  // Spreads status-specific query conditions
}
```

**Status Query Functions:**
- `STATUS.AVAILABLE`: No/expired reserved date AND no assigned date
- `STATUS.RESERVED`: Valid reserved date AND no assigned date
- `STATUS.ASSIGNED`: Has assigned date

---

### findCodesByReserveId
**Confidence:** 90% High (Clear implementation)

```javascript
async function findCodesByReserveId({
  reserveId: string
}): Promise<Array<{ _id: { campaign_id: string, code: string } }>>
```

**Source:** [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:57)

**Parameters:**
- `reserveId` (string, required) - UUID of reservation batch

**Return Type:** Promise<CodeDocument[]> - Array of code documents (only _id field)

**Called By:**
- [findAndReserveCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findAndReserveCodes.js:30) - For conflict resolution

**MongoDB Query:**
```javascript
{ reserveId: reserveId }
```

**Projection:** `{ _id: 1 }` - Only returns ID fields

**Purpose:** Find codes that were successfully reserved in a batch during concurrent operations

---

### assignCodes (Datastore)
**Confidence:** 90% High (Clear implementation)

```javascript
async function assignCodes({
  campaignId: string,
  codes: string[]
}): Promise<{ in: number, updated: number }>
```

**Source:** [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:62)

**Parameters:**
- `campaignId` (string, required) - Campaign identifier
- `codes` (string[], required) - Array of code strings

**Return Type:** Promise<{ in: number, updated: number }>

**Called By:**
- [assignCodes manager](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:102)

**MongoDB Operation:**
```javascript
updateMany(
  {
    '_id.campaign_id': campaignId,
    '_id.code': { $in: codes }
  },
  {
    $set: { 'date.assigned': new Date() }
  }
)
```

**Returns:**
- `in` - Number of codes in request array
- `updated` - Number of documents actually modified (modifiedCount)

---

### releaseCodes (Datastore)
**Confidence:** 90% High (Clear implementation)

```javascript
async function releaseCodes({
  campaignId: string,
  codes: string[]
}): Promise<{ in: number, updated: number }>
```

**Source:** [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:78)

**Parameters:**
- `campaignId` (string, required) - Campaign identifier
- `codes` (string[], required) - Array of code strings

**Return Type:** Promise<{ in: number, updated: number }>

**Called By:**
- [releaseCodes manager](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:104)

**MongoDB Operation:**
```javascript
updateMany(
  {
    '_id.campaign_id': campaignId,
    '_id.code': { $in: codes },
    'date.assigned': { $exists: false },
    'date.reserved': { $exists: true }
  },
  {
    $unset: { 'date.reserved': 1 }
  }
)
```

**Returns:**
- `in` - Number of codes in request array
- `updated` - Number of documents actually modified

**Important:** Only releases codes that are reserved (not assigned)

---

### reserveCodes (Datastore)
**Confidence:** 90% High (Clear implementation)

```javascript
async function reserveCodes({
  codeIds: Array<{ campaign_id: string, code: string }>,
  reserveId: string
}): Promise<number>
```

**Source:** [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:95)

**Parameters:**
- `codeIds` (Array<ObjectId>, required) - Array of MongoDB _id objects
- `reserveId` (string, required) - UUID for this reservation batch

**Return Type:** Promise<number> - Number of codes successfully reserved

**Called By:**
- [findAndReserveCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findAndReserveCodes.js:28)

**MongoDB Operation:**
```javascript
updateMany(
  {
    _id: { $in: codeIds },
    ...STATUS_QUERY.AVAILABLE()  // Only available codes
  },
  {
    $set: {
      'date.reserved': new Date(),
      reserveId: reserveId
    }
  }
)
```

**Returns:** modifiedCount - Number of codes successfully reserved

**Concurrency Handling:**
- Uses available status check in query
- May reserve fewer codes than requested if concurrent operations occur
- Caller (findAndReserveCodes) retries with remaining count

---

### upsertCodes
**Confidence:** 90% High (Clear implementation)

```javascript
async function upsertCodes({
  campaignId: string,
  type: string,
  codes: string[]
}): Promise<{ in: number, inserted: number, updated: number }>
```

**Source:** [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:111)

**Parameters:**
- `campaignId` (string, required) - Campaign identifier
- `type` (string, required) - Code type: 'tm' or 'external'
- `codes` (string[], required) - Array of code strings to upsert

**Return Type:** Promise<{ in: number, inserted: number, updated: number }>

**Called By:**
- [readAndStoreCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/readAndStoreCodes.js:31) - In batches of 50,000

**MongoDB Operation:**
```javascript
// For each code in array:
bulk.find({
  _id: { campaign_id: campaignId, code: code }
})
.upsert()
.updateOne({
  $set: {
    type: type,
    'date.saved': new Date()
  }
})
```

**Returns:**
- `in` - Number of codes in request array
- `inserted` - Number of new documents created (nUpserted)
- `updated` - Number of existing documents updated (nModified)

**Performance:** Uses unordered bulk operations for efficient batch processing

---

## Helper Functions

### readAndStoreCodes
**Confidence:** 85% High (Clear stream pipeline)

```javascript
async function readAndStoreCodes(managerCtx, {
  campaignId: string,
  type: string,
  fileKey: string
}): Promise<{ count: { in: number, inserted: number, updated: number } }>
```

**Source:** [readAndStoreCodes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/readAndStoreCodes.js:20)

**Parameters:**
- `managerCtx` (ManagerContext, required)
  - `managerCtx.service.scoringBucket` - S3 client
  - `managerCtx.datastore.codes` - Codes datastore
  - `managerCtx.correlation` - Request correlation
- `campaignId` (string, required) - Campaign identifier
- `type` (string, required) - Code type: 'tm' or 'external'
- `fileKey` (string, required) - S3 object key

**Return Type:** Promise<UploadResponse>

**Called By:**
- [uploadCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:38)

**Processing Pipeline:**
```
S3 ReadStream
  → CSV Parser (parseCSV with parseOptions)
  → BatchTransformStream (batches of 50,000 codes)
  → upsertCodes (MongoDB bulk upsert)
  → Accumulate counts
```

**CSV Parsing:**
- Delimiter: comma
- Extracts first column only
- Trims whitespace
- Skips empty lines

**Batch Processing:**
- Processes codes in batches of 50,000
- Each batch is flattened and upserted
- Counts are accumulated across all batches

**Error Handling:**
- Logs MongoDB errors but continues processing
- Rejects promise on stream errors

---

### findAndReserveCodes
**Confidence:** 85% High (Recursive with retry logic)

```javascript
async function findAndReserveCodes(managerCtx, {
  campaignId: string,
  count: number,
  type: string,
  reserveId: string,
  reservedCodes?: string[],
  counter?: number
}): Promise<string[]>
```

**Source:** [findAndReserveCodes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findAndReserveCodes.js:11)

**Parameters:**
- `managerCtx` (ManagerContext, required)
- `campaignId` (string, required) - Campaign identifier
- `count` (number, required) - Number of codes to reserve
- `type` (string, required) - Code type
- `reserveId` (string, required) - UUID for this reservation
- `reservedCodes` (string[], optional) - Accumulated reserved codes (for recursion)
- `counter` (number, optional) - Retry counter (for recursion)

**Return Type:** Promise<string[]> - Array of reserved code strings

**Called By:**
- [reserveCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:79)

**Algorithm:**
```
1. Check retry limit (MAX_RETRIES = 2)
2. Find available codes (up to count)
3. Attempt to reserve codes with reserveId
4. If modified count mismatch (concurrent conflict):
   a. Find codes successfully reserved by reserveId
   b. Calculate missing count
   c. Recursively retry with missing count
5. Return accumulated reserved codes
```

**Concurrency Handling:**
- Handles race conditions where multiple requests reserve same codes
- Uses reserveId to identify successfully reserved codes
- Retries with remaining count needed
- Stops after MAX_RETRIES to prevent infinite loops

---

### findCodesCounts
**Confidence:** 85% High (Functional pipeline)

```javascript
async function findCodesCounts({
  managerCtx: ManagerContext,
  statuses: string[],
  campaignId: string,
  type: string
}): Promise<{ [status: string]: number }>
```

**Source:** [findCodesCounts.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findCodesCounts.js:3)

**Parameters:**
- `managerCtx` (ManagerContext, required)
- `statuses` (string[], required) - Array of status values to count
- `campaignId` (string, required) - Campaign identifier
- `type` (string, required) - Code type

**Return Type:** Promise<{ [status: string]: number }> - Object mapping status to count

**Called By:**
- [countCodes](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:58)

**Algorithm:**
```
1. Map over statuses array in parallel
2. For each status: call countCodesByStatus
3. Convert array of [status, count] tuples to object
```

**Parallel Execution:** Uses MapAsyncParallel to count all statuses concurrently

**Example Output:**
```javascript
{
  available: 1500,
  reserved: 250,
  assigned: 8750
}
```

---

## Context Transformation Functions

### KoaCtxToManagerCtx
**Confidence:** 95% High (Explicit JSDoc)

```javascript
function KoaCtxToManagerCtx({
  Datastore: Function,
  Services: Function
}): (ctx: KoaContext) => ManagerContext
```

**Source:** [KoaCtxToManagerCtx.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/lib/KoaCtxToManagerCtx.js:17)

**Parameters:**
- `Datastore` (Function, required) - Factory for creating instrumented datastore
- `Services` (Function, required) - Factory for creating instrumented services

**Return Type:** Function that takes KoaContext and returns ManagerContext

**Called By:**
- [router/index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/router/index.js:17) - Created once at startup

**Transforms:**
```javascript
// Input: Koa Context
{
  state: {
    span: Object,        // OpenTracing span
    correlation: Object, // Correlation object
    token: Object        // JWT token
  }
}

// Output: Manager Context
{
  span: Object,
  correlation: Object,
  jwt: Object,
  datastore: {
    codes: CodesDatastore
  },
  service: {
    scoringBucket: S3Client
  },
  InstrumentedAsyncOperation: Function
}
```

**Purpose:** Creates manager-level context from HTTP request context with instrumentation

---

### InstrumentedAsyncOperation
**Confidence:** 90% High (JSDoc example)

```javascript
function InstrumentedAsyncOperation({
  span: Object,
  correlation: Object,
  jwt: Object,
  Datastore: Function,
  Services: Function
}): (operationName: string, fn: Function) => (...params: any[]) => Promise<any>
```

**Source:** [InstrumentedAsyncOperation.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/lib/InstrumentedAsyncOperation.js:21)

**Parameters:**
- `span` (Object, required) - Parent OpenTracing span
- `correlation` (Object, required) - Correlation tracking
- `jwt` (Object, required) - JWT token
- `Datastore` (Function, required) - Datastore factory
- `Services` (Function, required) - Services factory

**Return Type:** Curried function that creates instrumented async operations

**Usage Pattern:**
```javascript
const someAsyncTask = InstrumentedAsyncOperation(
  'someAsyncTask',
  async(ctx, params) => {
    // async operation implementation
  }
);

// Later:
someAsyncTask(managerCtx, { foo: 'bar' });
```

**Purpose:**
- Creates fire-and-forget async operations
- Each operation gets its own span for tracing
- Operations don't block request response

**Tracing:**
- Creates new child span with operationName
- Tags span with correlation ID and parent trace ID
- Closes span when operation completes

---

## Validation Middleware

### ValidatorMiddleware
**Confidence:** 85% High (JSDoc + functional pattern)

```javascript
function ValidatorMiddleware({
  predicate: (ctx: KoaContext) => boolean,
  errorFn: (ctx: KoaContext) => Error
}): (ctx: KoaContext, next: Function) => void
```

**Source:** [ValidatorMiddleware.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/lib/middlewares/validators/ValidatorMiddleware.js:9)

**Parameters:**
- `predicate` (Function, required) - Function that returns true if validation passes
- `errorFn` (Function, required) - Function that returns Error object if validation fails

**Return Type:** Koa middleware function

**Behavior:**
- If `predicate(ctx)` returns true: calls `next()`
- If `predicate(ctx)` returns false: throws `errorFn(ctx)`

**Purpose:** Creates reusable validation middleware for Koa routes

**Pattern:** Uses Ramda's `ifElse` for functional validation logic

---

## Common Patterns

### Pattern: Fire-and-Forget Async Operations

**Description:** Execute async operations without blocking request response

**Implementation:**
```javascript
const asyncOperation = managerCtx.InstrumentedAsyncOperation(
  'operationName',
  async(ctx, params) => {
    // Long-running operation
    await someAsyncWork(params);
  }
);

// Fire and forget - returns immediately
asyncOperation(managerCtx, { data: 'value' });
```

**Found In:**
- [InstrumentedAsyncOperation.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/lib/InstrumentedAsyncOperation.js:21)
- Used throughout managers for background tasks

**Benefits:**
- Request doesn't wait for operation to complete
- Operation gets its own tracing span
- Errors are logged but don't fail the request

---

### Pattern: Stream-Based CSV Processing

**Description:** Process large CSV files without loading entire file into memory

**Implementation:**
```javascript
const s3ReadStream = await s3Client.getReadStreamForObject(fileKey);

s3ReadStream
  .pipe(parseCSV(parseOptions))
  .pipe(BatchTransformStream({
    batchSize: 50000,
    transformFn: async codes => {
      await processCodesBatch(codes);
    }
  }))
  .on('finish', () => resolve(result));
```

**Found In:**
- [readAndStoreCodes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/readAndStoreCodes.js:45)

**Benefits:**
- Memory efficient - processes codes in batches
- Handles files of any size
- Backpressure management through streams

---

### Pattern: Optimistic Concurrency with Retry

**Description:** Handle concurrent code reservation requests with retry logic

**Implementation:**
```javascript
async function findAndReserveCodes({ count, reserveId, counter = 0 }) {
  if (counter > MAX_RETRIES) return reservedCodes;

  const codes = await findAvailableCodes({ count });
  const modified = await reserveCodes({ codes, reserveId });

  if (modified !== codes.length) {
    // Conflict detected - some codes reserved by another request
    const actualReserved = await findCodesByReserveId({ reserveId });
    const missing = count - actualReserved.length;

    // Retry with remaining count
    return findAndReserveCodes({
      count: missing,
      reserveId,
      counter: counter + 1
    });
  }

  return codes;
}
```

**Found In:**
- [findAndReserveCodes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findAndReserveCodes.js:11)

**Benefits:**
- Handles race conditions gracefully
- Ensures requested count is reserved (if available)
- Bounded retry prevents infinite loops

---

### Pattern: Bulk MongoDB Operations

**Description:** Efficiently update many documents in a single database round-trip

**Implementation:**
```javascript
const bulk = await collection.UnorderedBulk();

codes.forEach(code => {
  bulk
    .find({ _id: makeId(code) })
    .upsert()
    .updateOne({ $set: { field: value } });
});

const { nUpserted, nModified } = await bulk.execute();
```

**Found In:**
- [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js:112) - upsertCodes function

**Benefits:**
- Single network round-trip for thousands of operations
- Unordered allows parallel execution
- Returns detailed operation counts

---

### Pattern: Functional Data Transformation

**Description:** Use Ramda functional programming for data transformations

**Implementation:**
```javascript
const selectIds = R.pluck('_id');
const selectCodes = R.map(R.path(['_id', 'code']));

// Transform array of documents to array of codes
const codes = selectCodes(documents);
```

**Found In:**
- [findAndReserveCodes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/findAndReserveCodes.js:8)
- Throughout the codebase

**Benefits:**
- Pure functions - no side effects
- Composable transformations
- Point-free style for clarity
