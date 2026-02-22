# Type Usage Patterns - export-service

## Function Signatures

### Exported Functions with Object Parameters

#### queueExport
**Confidence:** 95% High

**Source:** [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:108)

```javascript
export const queueExport = async(managerCtx, {
  campaignId, requesterUserId, exportType, correlation, token, dateKey, includeAllMarkets
}) => { ... }
```

**Parameters:**

1. `managerCtx` (ManagerContext, required)
   - `managerCtx.datastore` (object, required)
     - `datastore.exports` (ExportsDataStore)
     - `datastore.campaigns` (CampaignsDataStore)
   - `managerCtx.service` (object, required)

2. Options object (required):
   - `campaignId` (string, required) - Campaign identifier
   - `requesterUserId` (string, required) - User ID requesting export
   - `exportType` (EXPORT_TYPE enum, required) - Type of export
   - `correlation` (object, required) - Correlation tracking
   - `token` (string, required) - JWT token
   - `dateKey` (string, optional) - Date key for codeWaves exports
   - `includeAllMarkets` (boolean, optional) - Include all markets flag

**Returns:** `Promise<Object>`
```javascript
{
  id: string,
  exportType: EXPORT_TYPE,
  campaignId: string,
  date: { created: Date },
  status: STATUS,
  requesterUserId: string
}
```

**Called By:**
- [POST /campaigns/:campaignId/exports router handler](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js:37)

**Calls:**
- [throwIfInvalid](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/throwIfInvalid.js) - Validates export type and date key
- `campaignsDataStore.findById` - Retrieves campaign
- `exportsDataStore.findWithStatusExportTypeAndDateKey` - Checks for existing queued exports
- `exportsDataStore.upsert` - Creates or updates export record

**Confidence Note:** Explicit destructuring in function signature provides high confidence.

---

#### findExportById
**Confidence:** 95% High

**Source:** [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:69)

```javascript
export const findExportById = async(managerCtx, { campaignId, exportId }) => { ... }
```

**Parameters:**

1. `managerCtx` (ManagerContext, required)
   - `managerCtx.datastore.exports` (ExportsDataStore)

2. Options object (required):
   - `campaignId` (string, required) - Campaign identifier
   - `exportId` (string, required) - Export identifier

**Returns:** `Promise<Object>` - Normalized export object with signed URL

**Called By:**
- [GET /campaigns/:campaignId/exports/:exportId router handler](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js:55)

**Calls:**
- `exportsDataStore.findByExportId` - Retrieves export by ID
- [normalizeExport](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/normalizers.js) - Adds signed URL and normalizes

**Confidence Note:** Explicit destructuring in function signature provides high confidence.

---

#### findExportsByCampaignAndType
**Confidence:** 95% High

**Source:** [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:50)

```javascript
export const findExportsByCampaignAndType = async(managerCtx, { campaignId, exportType }) => { ... }
```

**Parameters:**

1. `managerCtx` (ManagerContext, required)
   - `managerCtx.datastore.exports` (ExportsDataStore)
   - `managerCtx.datastore.campaigns` (CampaignsDataStore)

2. Options object (required):
   - `campaignId` (string, required) - Campaign identifier
   - `exportType` (EXPORT_TYPE enum, optional) - Filter by export type

**Returns:** `Promise<Array<Object>>` - Array of normalized export objects

**Called By:**
- [GET /campaigns/:campaignId/exports router handler](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js:68)

**Calls:**
- `campaignsDataStore.findById` - Validates campaign exists
- `exportsDataStore.findByCampaignIdAndType` - Retrieves exports
- [normalizeExport](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/normalizers.js) - Normalizes each export

**Confidence Note:** Explicit destructuring in function signature provides high confidence.

---

#### exportAndSave
**Confidence:** 95% High

**Source:** [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:165)

```javascript
export const exportAndSave = async(managerCtx, exportObj) => { ... }
```

**Parameters:**

1. `managerCtx` (ManagerContext, required)
   - `managerCtx.service[bucketType]` (S3Service) - S3 service for file upload

2. `exportObj` (Export Object, required)
   - `exportObj.campaignName` (string) - Campaign name
   - `exportObj.campaignId` (string) - Campaign ID
   - `exportObj.date.created` (Date) - Export creation date
   - `exportObj.exportType` (EXPORT_TYPE enum) - Export type
   - `exportObj.dateKey` (string, optional) - Date key
   - `exportObj.count` (number, optional) - Expected row count

**Returns:** `Promise<Object>`
```javascript
{
  key: string,      // S3 file key
  count: number     // Number of rows written
}
```

**Called By:**
- Background queue processor (processQueue)

**Calls:**
- `exportFn` (export type-specific function) - Generates export data
- [RowFormatter factory](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/index.js) - Creates row formatter
- [resolveBucketByType](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/resolveBucketByType.js) - Determines S3 bucket
- [makeContentType](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/utils/index.js) - Generates content type
- [makeFileName](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/utils/index.js) - Generates file name
- `service[bucketType].uploadFromStream` - Uploads to S3

**Confidence Note:** Explicit destructuring from exportObj provides high confidence.

---

#### exportEntries
**Confidence:** 95% High

**Source:** [/app/managers/exports/exportEntries.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportEntries.js:56)

```javascript
const exportEntries = async(managerCtx, { rowFormatter, passThroughStream, exportObj }) => { ... }
```

**Parameters:**

1. `managerCtx` (ManagerContext, required)
   - `managerCtx.datastore` (object)
     - `datastore.campaigns` (CampaignsDataStore)
     - `datastore.markets` (MarketsDataStore)
     - `datastore.entries` (EntriesDataStore)

2. Options object (required):
   - `rowFormatter` (RowFormatter, required) - Formatter configuration
   - `passThroughStream` (PassThroughStream, required) - Stream for output
   - `exportObj` (Export Object, required)
     - `exportObj.campaignId` (string) - Campaign ID
     - `exportObj.date.created` (Date) - Export creation date

**Returns:** `Promise<number>` - Number of rows written

**Called By:**
- [exportAndSave](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:165) - For ENTRIES, SCORING, ARTIST_OPT_IN, ARTIST_SMS_OPT_IN, LIVENATION_OPT_IN export types

**Calls:**
- [getCampaignAndMarkets](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportEntries.js:13) - Retrieves campaign and markets
- [CsvWriter](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/CsvWriter.js) - Creates CSV writer
- `datastore.entries.findUserEntries` - Streams entries
- `writer.write` - Writes each entry
- [writeAdditionalMarketRows](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/writeAdditionalMarketRows.js) - Writes additional market rows (if enabled)

**Confidence Note:** Explicit destructuring in function signature provides high confidence.

---

#### deleteExportsByUserId
**Confidence:** 95% High

**Source:** [/app/managers/exports/deleteExports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/deleteExports/index.js:45)

```javascript
export const deleteExportsByUserId = async(managerCtx, { isSupremeUser, userId, token }) => { ... }
```

**Parameters:**

1. `managerCtx` (ManagerContext, required)
   - `managerCtx.datastore.exports` (ExportsDataStore)
   - `managerCtx.service.entries` (EntriesService)

2. Options object (required):
   - `isSupremeUser` (boolean, required) - Whether user is supreme
   - `userId` (string, required) - User ID to delete exports for
   - `token` (string, required) - JWT token

**Returns:** `Promise<Object>`
```javascript
{
  deletedCount: {
    exports: number,
    files: number
  }
}
```

**Called By:**
- [DELETE /ccpa/users/:userId router handler](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/index.js:31)

**Calls:**
- `service.entries.getCampaignByUserId` - Retrieves user's campaigns
- `datastore.findByCampaignId` - Finds exports for campaigns
- [mapBucketTypeToKeys](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/deleteExports/mapBucketTypeToKeys.js) - Maps exports to S3 buckets
- [BatchDeleteAndNormalizeResults](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/deleteExports/batchDeleteAndNormalizeResults.js) - Batch deletes from S3
- `datastore.deleteByCampaignId` - Deletes export records

**Confidence Note:** Explicit destructuring in function signature provides high confidence.

---

#### KoaCtxToManagerCtx
**Confidence:** 95% High

**Source:** [/lib/KoaCtxToManagerCtx.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/KoaCtxToManagerCtx.js:16)

**JSDoc:**
```javascript
/**
 * Creates a manager context from a koa context
 * @param {KoaContext} ctx
 * @param {Datastore} Datastore datastore to be instrumented
 * @param {Services} Services services to be instrumented
 * @returns {ManagerContext}
 */
```

```javascript
const KoaCtxToManagerCtx = ({ Datastore, Services }) => ({ ctx }) => { ... }
```

**Parameters:**

1. Configuration object (required):
   - `Datastore` (function, required) - Datastore factory
   - `Services` (function, required) - Services factory

**Returns:** Function that takes:
- `ctx` (KoaContext, required) - Koa context object

**Returns (inner function):** `ManagerContext`
```javascript
{
  correlation: Object,
  jwt: Object,
  datastore: Object,
  service: Object,
  InstrumentedAsyncOperation: Function
}
```

**Called By:**
- [/app/router/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js:10) - Creates context for export routes
- [/app/router/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/index.js:12) - Creates context for CCPA routes

**Calls:**
- `selectCorrelation` - Extracts correlation from Koa context
- `selectToken` - Extracts JWT from Koa context
- `Datastore({ correlation })` - Creates instrumented datastore
- `Services({ correlation, jwt })` - Creates instrumented services
- [InstrumentedAsyncOperation](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/InstrumentedAsyncOperation.js) - Creates async operation wrapper

**Confidence Note:** JSDoc annotation and explicit implementation provide high confidence.

---

#### InstrumentedAsyncOperation
**Confidence:** 95% High

**Source:** [/lib/InstrumentedAsyncOperation.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/InstrumentedAsyncOperation.js:22)

**JSDoc:**
```javascript
/**
 * Instruments a given function as an async operation that a request does not wait for.
 * @param {string} operationName used as the operation name of the new trace
 * @param {function} fn function that implements the async operation to be performed
 * @returns {function(ManagerContext, ...*): Promise.<*>}
 */
```

```javascript
const InstrumentedAsyncOperation = ({ correlation, jwt, Datastore, Services }) =>
  (operationName, fn) => async(...params) => { ... }
```

**Parameters:**

1. Configuration object (required):
   - `correlation` (object, required) - Correlation tracking
   - `jwt` (object, required) - JWT token data
   - `Datastore` (function, required) - Datastore factory
   - `Services` (function, required) - Services factory

**Returns:** Function that takes:
1. `operationName` (string, required) - Name for tracing
2. `fn` (function, required) - Async operation to instrument

**Returns (inner function):** `async (...params) => Promise<any>`
- Creates isolated async context with new trace
- Executes function with background span

**Called By:**
- Included in ManagerContext for background operations

**Calls:**
- [TracedAsyncFn](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/InstrumentedAsyncOperation.js:31) from `@verifiedfan/tracing`
- `fn(asyncCtx, ...params)` - Executes wrapped function

**Confidence Note:** JSDoc annotation and explicit implementation provide high confidence.

---

#### ValidatorMiddleware
**Confidence:** 95% High

**Source:** [/lib/middlewares/validators/ValidatorMiddleware.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/middlewares/validators/ValidatorMiddleware.js:9)

**JSDoc:**
```javascript
/**
 * Creates a middleware function that takes a predicate and an errorFn.
 * If the predicate fails, the result of the errorFn is thrown, otherwise next() is called.
 * @param {function: KoaContext => boolean} predicate
 * @param {function: KoaContext => Error} errorFn
 */
```

```javascript
const ValidatorMiddleware = ({ predicate, errorFn }) => R.ifElse(
  predicate,
  (ctx, next) => next(),
  ctx => { throw errorFn(ctx); }
);
```

**Parameters:**

1. Configuration object (required):
   - `predicate` (function, required) - Validation function
     - Takes: `KoaContext`
     - Returns: `boolean` (true = valid)
   - `errorFn` (function, required) - Error factory function
     - Takes: `KoaContext`
     - Returns: `Error`

**Returns:** Koa middleware function

**Called By:**
- Validator middleware implementations

**Confidence Note:** JSDoc annotation provides high confidence for function signature.

---

### Internal Helper Functions

#### normalizeExport
**Confidence:** 90% Medium-High

**Source:** [/app/managers/exports/normalizers.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/normalizers.js:31)

```javascript
const normalizeExport = R.pipeP(
  setSignedUrl,
  normalizers.stringifyObjectId
);
```

**Parameters:**

1. `managerCtx` (ManagerContext, required) - Passed to setSignedUrl
2. `exportObj` (Export Object, required)
   - `exportObj.key` (string, optional) - S3 file key
   - `exportObj.exportType` (EXPORT_TYPE enum) - Export type
   - `exportObj._id` (ObjectId) - Export ID

**Returns:** `Promise<Object>` - Export with signed URL and stringified ObjectId

**Called By:**
- [findExportById](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:78)
- [findExportsByCampaignAndType](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:64)

**Calls:**
- `setSignedUrl` - Generates signed S3 URL
- `normalizers.stringifyObjectId` - Converts ObjectId to string

**Confidence Note:** Ramda pipeline composition provides medium-high confidence.

---

#### NormalizeEntryRow
**Confidence:** 90% Medium-High

**Source:** [/lib/RowFormatter/formatters/normalizeEntryRow.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/normalizeEntryRow.js:84)

```javascript
const NormalizeEntryRow = ({ includePreferenceColumns }) => ({ user, entry, campaign, market, numericId } = {}) => { ... }
```

**Parameters:**

1. Configuration object (required):
   - `includePreferenceColumns` (boolean, required) - Whether to include campaign preferences

**Returns:** Function that takes:
- `user` (User Object, optional) - User data
- `entry` (Entry Object, optional) - Entry data
- `campaign` (Campaign Object, optional) - Campaign data
- `market` (Market Object, optional) - Market data
- `numericId` (number, optional) - Override ID

**Returns (inner function):** Object with normalized row data

**Row Structure:**
```javascript
{
  id: string,
  contest_title: string,
  entry_date: string,
  tm_id: string,
  globalUserId: string,
  ip_address: string,
  email: string,
  first_name: string,
  last_name: string,
  'Zip Code': string,
  'Mobile Phone': string,
  Hbase_ID: string,
  'Select Show': string,
  Event_ID: string,
  locale: string,
  campaign_id: string,
  'Phone confirmed': string,
  // If includePreferenceColumns:
  '#[type].[id]': any  // Dynamic preference columns
}
```

**Called By:**
- [entries formatter](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/entries.js:4) - With `includePreferenceColumns: true`
- [scoring formatter](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/scoring.js:5) - With `includePreferenceColumns: false`

**Confidence Note:** Explicit destructuring provides medium-high confidence.

---

#### CsvWriter
**Confidence:** 95% High

**Source:** [/app/managers/exports/CsvWriter.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/CsvWriter.js:8)

```javascript
const CsvWriter = ({ rowFormatter, passThroughStream, filePath }) => { ... }
```

**Parameters:**

1. Configuration object (required):
   - `rowFormatter` (RowFormatter, required)
     - `rowFormatter.includeHeaders` (boolean) - Include headers
     - `rowFormatter.delimiter` (string) - Field delimiter
     - `rowFormatter.makeRow` (function) - Row transformation function
   - `passThroughStream` (PassThroughStream, optional) - Stream for output
   - `filePath` (string, optional) - File path for disk writes

**Returns:** Object with methods:
```javascript
{
  write: async (params: Object) => Promise<void>,
  getRowCount: () => number,
  end: async () => Promise<void>
}
```

**Write Parameters:**
```javascript
{
  user: Object,
  entry: Object,
  campaign: Object,
  market: Object,
  numericId?: number
}
```

**Called By:**
- [exportEntries](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportEntries.js:60)
- [exportCodes](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportCodes.js)
- Other export functions

**Confidence Note:** Explicit destructuring and method signatures provide high confidence.

---

#### getCampaignAndMarkets
**Confidence:** 95% High

**Source:** [/app/managers/exports/exportEntries.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportEntries.js:13)

```javascript
export const getCampaignAndMarkets = async({ datastore, campaignId }) => { ... }
```

**Parameters:**

1. Options object (required):
   - `datastore` (object, required)
     - `datastore.campaigns` (CampaignsDataStore)
     - `datastore.markets` (MarketsDataStore)
   - `campaignId` (string, required) - Campaign ID

**Returns:** `Promise<Object>`
```javascript
{
  campaign: Campaign Object,
  campaignMarkets: Array<Market Object>
}
```

**Called By:**
- [exportEntries](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportEntries.js:66)

**Calls:**
- `datastore.campaigns.findById` - Retrieves campaign
- `datastore.markets.findByCampaign` - Retrieves markets

**Confidence Note:** Explicit destructuring provides high confidence.

---

## Call Relationship Graphs

### Export Request Flow

```
POST /campaigns/:campaignId/exports
  └─> router handler [app/router/exports.js:37]
      └─> queueExport [app/managers/exports/index.js:108]
          ├─> throwIfInvalid [app/managers/exports/throwIfInvalid.js]
          ├─> campaignsDataStore.findById
          ├─> exportsDataStore.findWithStatusExportTypeAndDateKey
          └─> exportsDataStore.upsert

Background: processQueue
  └─> exportsDataStore.findOldest
      └─> exportAndSave [app/managers/exports/index.js:165]
          ├─> RowFormatter [lib/RowFormatter/index.js]
          ├─> resolveBucketByType [app/managers/exports/resolveBucketByType.js]
          ├─> service[bucketType].uploadFromStream
          └─> exportEntries [app/managers/exports/exportEntries.js:56]
              ├─> getCampaignAndMarkets [app/managers/exports/exportEntries.js:13]
              │   ├─> datastore.campaigns.findById
              │   └─> datastore.markets.findByCampaign
              ├─> CsvWriter [app/managers/exports/CsvWriter.js:8]
              ├─> datastore.entries.findUserEntries (stream)
              └─> writer.write (for each entry)
                  └─> rowFormatter.makeRow
                      └─> NormalizeEntryRow [lib/RowFormatter/formatters/normalizeEntryRow.js:84]

GET /campaigns/:campaignId/exports/:exportId
  └─> router handler [app/router/exports.js:55]
      └─> findExportById [app/managers/exports/index.js:69]
          ├─> exportsDataStore.findByExportId
          └─> normalizeExport [app/managers/exports/normalizers.js:31]
              ├─> setSignedUrl
              │   └─> service[bucketType].generateSignedUrl
              └─> normalizers.stringifyObjectId
```

---

### CCPA Delete Flow

```
DELETE /ccpa/users/:userId
  └─> router handler [app/router/index.js:31]
      └─> deleteExportsByUserId [app/managers/exports/deleteExports/index.js:45]
          ├─> service.entries.getCampaignByUserId
          ├─> datastore.findByCampaignId
          ├─> mapBucketTypeToKeys [app/managers/exports/deleteExports/mapBucketTypeToKeys.js]
          ├─> BatchDeleteAndNormalizeResults [app/managers/exports/deleteExports/batchDeleteAndNormalizeResults.js]
          │   └─> service[bucketType].batchDelete (for each bucket)
          └─> datastore.deleteByCampaignId
```

---

### Context Transformation Flow

```
Koa HTTP Request
  └─> middleware pipeline [app/index.js]
      ├─> tracing middleware
      ├─> correlation middleware (adds correlation to ctx.state)
      ├─> jwt middleware (validates and adds jwt to ctx.state)
      └─> router handler
          └─> withManagedContext wrapper [app/router/exports.js:35]
              └─> koaCtxToManagerCtx [lib/KoaCtxToManagerCtx.js:16]
                  ├─> selectCorrelation (extracts from ctx)
                  ├─> selectToken (extracts from ctx)
                  ├─> Datastore({ correlation })
                  ├─> Services({ correlation, jwt })
                  └─> InstrumentedAsyncOperation({ correlation, jwt, Datastore, Services })
                      └─> returns ManagerContext
                          └─> passed to manager function
```

---

## Implicit Type Patterns

### Pattern: MongoDB Document Structure

**Inferred from:** Datastore queries and normalizers

**Common MongoDB Document Fields:**
```javascript
{
  _id: ObjectId,                    // MongoDB ObjectId
  // ... specific document fields
  env?: string                      // Optional environment filter
}
```

**Operations:**
- `findById` expects ObjectId or string (converts internally)
- `upsert` returns document with `_id`
- `stringifyObjectId` transforms `_id` → `id` (string)

**Found In:**
- [/app/datastore/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/datastore/exports.js)
- All datastore modules

---

### Pattern: S3 Service Interface

**Inferred from:** Service usage in export managers

**S3 Service Methods:**
```javascript
{
  uploadFromStream: async ({
    passThroughStream: PassThroughStream,
    contentType: string,
    fileKey: string,
    acl: ACL_TYPE
  }) => Promise<{ key: string }>,

  generateSignedUrl: async ({
    fileKey: string,
    ttlSecs: number
  }) => Promise<string>,

  batchDelete: async (
    keys: Array<string>
  ) => Promise<{ deleted: Array, errors: Array }>
}
```

**Found In:**
- [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:182)
- [/app/managers/exports/normalizers.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/normalizers.js:26)
- [/app/managers/exports/deleteExports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/deleteExports/index.js:26)

---

### Pattern: Datastore Query Interface

**Inferred from:** Datastore usage patterns

**Common Datastore Methods:**
```javascript
{
  findById: async (id: string) => Promise<Document | null>,

  find: async (query: Object) => Promise<Cursor>,
  // Cursor methods: .toArray(), .sort(sortObj), .limit(n), .next()

  findOne: async (query: Object) => Promise<Document | null>,

  upsert: async (definition: Object) => Promise<Document>,

  upsertOne: async (
    filter: Object,
    update: Object
  ) => Promise<void>,

  deleteMany: async (query: Object) => Promise<{ deletedCount: number }>
}
```

**Found In:**
- [/app/datastore/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/datastore/exports.js)
- [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js)

---

### Pattern: Koa Router Handler Signature

**Inferred from:** Router implementations

**Handler Signature:**
```javascript
async (ctx: KoaContext) => Promise<any>

// Or with managed context wrapper:
(ctx: KoaContext, managerCtx: ManagerContext) => Promise<any>
```

**Context Properties Used:**
```javascript
ctx.params[key]          // URL parameters
ctx.query[key]           // Query string parameters
ctx.request.body[key]    // Request body (POST/PUT)
ctx.state.correlation    // Correlation ID (from middleware)
ctx.state.jwt            // JWT data (from middleware)
```

**Return Value:** Becomes response body (via responseFormatter middleware)

**Found In:**
- [/app/router/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js)
- [/app/router/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/index.js)

---

### Pattern: Stream Processing Pipeline

**Inferred from:** Export processing flow

**Pipeline Structure:**
```javascript
// 1. Create pass-through stream
const passThroughStream = new stream.PassThrough();

// 2. Create CSV writer that pipes to pass-through
const writeStream = CSVWriteStream({ separator, sendHeaders });
writeStream.pipe(passThroughStream);

// 3. Start S3 upload (consumes stream in parallel)
const uploadPromise = service.uploadFromStream({
  passThroughStream,
  contentType,
  fileKey,
  acl
});

// 4. Write data rows (producer)
for await (const entry of entries) {
  await writer.write({ user, entry, campaign, market });
}
await writer.end();

// 5. Wait for upload to complete
const { key } = await uploadPromise;

// 6. Clean up
passThroughStream.end();
```

**Found In:**
- [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:175-194)
- [/app/managers/exports/CsvWriter.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/CsvWriter.js)

---

### Pattern: Ramda Functional Pipelines

**Inferred from:** Ramda usage throughout codebase

**Common Patterns:**

**pipeP (Promise pipeline):**
```javascript
R.pipeP(
  asyncFn1,              // Returns Promise
  asyncFn2,              // Receives resolved value
  asyncFn3               // Returns final Promise
)(initialValue)
```

**pipe (Synchronous pipeline):**
```javascript
R.pipe(
  fn1,                   // Transforms value
  fn2,                   // Transforms again
  fn3                    // Returns final value
)(initialValue)
```

**Common Ramda Functions:**
```javascript
R.path(['a', 'b', 'c'], obj)           // Safe nested property access
R.prop('key', obj)                      // Property access
R.defaultTo(defaultVal, maybeNull)      // Null coalescing
R.map(fn, array)                        // Array map
R.compose(fn3, fn2, fn1)               // Right-to-left composition
R.indexBy(keyFn, array)                // Create lookup map
R.ifElse(predicate, thenFn, elseFn)    // Conditional execution
```

**Found In:**
- Throughout all manager and formatter files
- [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js)
- [/lib/RowFormatter/formatters/normalizeEntryRow.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/normalizeEntryRow.js)

---

## Common Field Access Patterns

### Entry Field Access

**Pattern:** Ramda path selectors for nested properties

```javascript
// Email resolution (preference: entry > user)
const selectUserEmail = R.path(['integrations', 'ticketmaster', 'email']);
const selectEntryEmail = R.path(['fields', 'email']);
const email = selectEntryEmail(entry) || selectUserEmail(user);

// Phone resolution (preference: entry > user)
const selectUserPhone = R.path(['integrations', 'ticketmaster', 'phone']);
const selectEntryPhone = R.path(['fields', 'phone']);
const phone = selectEntryPhone(entry) || selectUserPhone(user);

// Name resolution (preference: user > entry)
const selectUserFirstName = R.path(['integrations', 'ticketmaster', 'name', 'first']);
const selectEntryFirstName = R.path(['fields', 'first_name']);
const firstName = selectUserFirstName(user) || selectEntryFirstName(entry);

// Postal code resolution (preference: entry IP > user)
const selectEntryZipCode = R.path(['origin', 'ip', 'postalCode']);
const selectUserZipCode = R.path(['integrations', 'ticketmaster', 'postalCode']);
const zipCode = selectEntryZipCode(entry) || selectUserZipCode(user);

// User ID resolution
const selectGlobalUserId = R.path(['integrations', 'ticketmaster', 'globalUserId']);
const selectMemberId = R.path(['integrations', 'ticketmaster', 'member_id']);
const globalUserId = selectGlobalUserId(user);
const memberId = selectMemberId(user);

// Fraud detection scores
const nudataScore = R.path(['nudetect', 'score'], entry);
const nudataScoreBand = R.path(['nudetect', 'scoreBand'], entry);
const fanscore = R.prop('accountFanscore', entry);

// IP geolocation
const latitude = R.path(['origin', 'ip', 'latitude'], entry);
const longitude = R.path(['origin', 'ip', 'longitude'], entry);
const ipAddress = R.path(['origin', 'ip', 'address'], entry);
```

**Found In:**
- [/lib/RowFormatter/formatters/normalizeEntryRow.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/normalizeEntryRow.js)
- [/lib/RowFormatter/formatters/scoring.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/scoring.js)

---

### Market Field Access

**Pattern:** Market and event information extraction

```javascript
// Market display name
const makeSelectShow = ({ market: { event: { date } = {}, city, state } = {} } = {}) =>
  `${formatUTC(date, 'M/DD')} - ${city}, ${state}`;

// Market name
const selectMarketName = R.path(['market', 'name']);

// Event IDs (comma-separated)
const selectEventIds = R.pipe(
  R.path(['event', 'ids']),
  R.join(',')
);
```

**Found In:**
- [/lib/RowFormatter/formatters/normalizeEntryRow.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/normalizeEntryRow.js)

---

### Campaign Field Access

**Pattern:** Campaign preferences extraction

```javascript
// Campaign name
const campaignName = R.path(['name'], campaign);

// Campaign ID
const selectCampaignId = R.compose(R.toString, R.prop('_id'));

// Campaign preferences (dynamic columns)
const makeCampaignColumns = ({ campaign: { preferences = [] } = {}, entry: { fields } = {} } = {}) => {
  const campaignColumns = preferences
    .reduce((colMap, { id: currPrefId, type }) => ({
      ...colMap,
      [`#${type}.${currPrefId}`]: R.defaultTo(false, fields[currPrefId])
    }), {});
  return campaignColumns;
};
```

**Found In:**
- [/lib/RowFormatter/formatters/normalizeEntryRow.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/normalizeEntryRow.js)

---

## Summary

This export service primarily uses:

1. **JSDoc annotations** for type documentation in core libraries
2. **Explicit destructuring** in function signatures for parameter clarity
3. **Ramda functional utilities** for data transformation and access
4. **Enum constants** for finite value sets (status, export types, etc.)
5. **Error factory functions** for consistent error responses
6. **MongoDB document patterns** with ObjectId handling
7. **Stream-based processing** for large data exports
8. **Middleware-based context enrichment** (correlation, JWT)

Type confidence is generally **high (90-100%)** due to explicit parameter destructuring, JSDoc annotations, and clear usage patterns throughout the codebase.
