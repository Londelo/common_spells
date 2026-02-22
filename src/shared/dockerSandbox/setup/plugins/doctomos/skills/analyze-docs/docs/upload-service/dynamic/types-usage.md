# Type Usage Patterns - upload-service

**Note:** This service uses JavaScript with JSDoc annotations. Type information is extracted from function signatures, JSDoc comments, parameter destructuring, and validation patterns.

## Manager Functions (Business Logic)

### uploadFile
**Confidence:** 95-100% High

```javascript
async function uploadFile(managerCtx, {
  isAuthSupreme: Boolean,
  fileKey: String,
  filePath: String,
  fileSize: Number,
  contentType: String,
  uploadPrefix: String,
  bucketName: String
}): Promise<{ url: String, name: String }>
```

**Source:** [/app/managers/files/index.js:110](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:110)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required) - Application context with services
- `isAuthSupreme` (boolean, required) - Must be true (throws 403 if false)
- `fileKey` (string, required) - Destination S3 key/filename
- `filePath` (string, required) - Local temp file path to upload
- `fileSize` (number, required) - File size in bytes (throws if 0 or falsy)
- `contentType` (string, required) - MIME type
- `uploadPrefix` (string, optional) - S3 key prefix (automatically adds trailing '/')
- `bucketName` (string, optional) - Custom bucket name (defaults to config value)

**Return Type:** Promise<{ url: String, name: String }>

**Called By:**
- [POST /files router](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js:38)

**Calls:**
- [getBucketService](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:72)
- `bucketService.uploadFile`
- [fixPrefix](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:165) (internal helper)

**Throws:**
- `supremeUserRequired` - If `isAuthSupreme` is false
- `missingFile` - If `fileKey` or `filePath` is missing
- `emptyFile` - If `fileSize` is 0 or falsy

**Confidence Note:** Explicit parameter destructuring with clear validation logic.

---

### getObjectsList
**Confidence:** 95-100% High

```javascript
async function getObjectsList(managerCtx, {
  isAuthSupreme: Boolean,
  prefix: String,
  bucketName: String
}): Promise<Array<{ date: Date, key: String }>>
```

**Source:** [/app/managers/files/index.js:90](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:90)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Must be true
- `prefix` (string, required) - S3 key prefix to filter by
- `bucketName` (string, optional) - Custom bucket name

**Return Type:** Promise<Array<{ date: Date, key: String }>>
- Sorted by date descending (most recent first)

**Called By:**
- [GET /files/list router](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js:48)

**Calls:**
- [getBucketService](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:72)
- `bucketService.listObjectsByPrefix`
- [normalizeAndSortByModifiedDate](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:50) (internal pipeline)

**Throws:**
- `supremeUserRequired` - If `isAuthSupreme` is false

**Confidence Note:** Explicit parameter destructuring with Ramda pipeline processing.

---

### getObjectsData
**Confidence:** 95-100% High

```javascript
async function getObjectsData(managerCtx, {
  isAuthSupreme: Boolean,
  prefix: String,
  bucketName: String,
  skip: Number,
  limit: Number
}): Promise<Array<{
  key: String,
  size: Number,
  lastModifiedDate: Date,
  content?: Array<Object> | Object,
  error?: { message: String }
}>>
```

**Source:** [/app/managers/files/listData.js:82](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:82)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Must be true
- `prefix` (string, required) - S3 key prefix to filter by
- `bucketName` (string, optional) - Custom bucket name
- `skip` (number, optional) - Pagination offset (default: 0)
- `limit` (number, optional) - Pagination limit (default: 100)

**Return Type:** Promise<Array<S3ObjectData>>
- Each object includes parsed content (for JSON/CSV files) or error message

**Called By:**
- [GET /files/list/data router](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js:59)

**Calls:**
- [getBucketService](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:72)
- [ListAndSortObjects](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:35) (factory function)
- [GetDataFromObject](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:51) (factory function)
- [MapAsyncParallel](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:93) (utility)

**Processing:**
- Lists objects by prefix
- Sorts by date descending
- Applies pagination (skip/limit)
- Parses content in parallel for each file
- Supports JSON and CSV parsing
- Max file size: 1MB

**Throws:**
- `supremeUserRequired` - If `isAuthSupreme` is false

**Confidence Note:** Explicit parameter destructuring with complex data transformation pipeline.

---

### deleteFiles
**Confidence:** 95-100% High

```javascript
async function deleteFiles(managerCtx, {
  isAuthSupreme: Boolean,
  fileKeys: String,
  bucketName: String
}): Promise<{ deleted: Array<{ Key: String, VersionId: String }> }>
```

**Source:** [/app/managers/files/index.js:139](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:139)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Must be true
- `fileKeys` (string, required) - Comma-separated list of S3 keys
- `bucketName` (string, optional) - Custom bucket name

**Return Type:** Promise<{ deleted: Array<Object> }>

**Called By:**
- [DELETE /files router](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js:71)

**Calls:**
- [parseFileKeys](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:37) (internal parser)
- [getBucketService](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:72)
- `bucketService.deleteObjects`

**Processing:**
- Parses comma-separated fileKeys string
- Trims whitespace
- Rejects empty strings
- Deletes all keys in single batch operation

**Throws:**
- `supremeUserRequired` - If `isAuthSupreme` is false
- `missingFileKeys` - If parsed array is empty
- `deleteObjectsFailure` - If S3 deletion fails (caught and re-thrown)

**Confidence Note:** Explicit parameter destructuring with error handling.

---

### uploadBase64Image
**Confidence:** 95-100% High

```javascript
async function uploadBase64Image(managerCtx, {
  isAuthSupreme: Boolean,
  base64: String,
  contentType: String,
  fileName: String,
  cacheControl: String,
  bucketName: String
}): Promise<{ url: String, name: String }>
```

**Source:** [/app/managers/images/index.js:45](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:45)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Must be true
- `base64` (string, required) - Base64-encoded image data
- `contentType` (string, required) - Must be 'image/gif', 'image/png', or 'image/jpeg'
- `fileName` (string, optional) - Original filename (defaults to 'image')
- `cacheControl` (string, optional) - Cache-Control header value
- `bucketName` (string, optional) - Custom bucket name

**Return Type:** Promise<{ url: String, name: String }>

**Called By:**
- [POST /images router](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/images.js:16)

**Calls:**
- [validateContentType](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:26)
- [makeFileKey](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:37) (generates UUID-based filename)
- [getBucketConfigOrDefault](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/shared.js:6)
- `managerCtx.service.awsSDK.S3`
- `bucketService.uploadBase64Image`

**Processing:**
- Validates content type (only allows specific image types)
- Generates unique filename with UUID
- Uploads to images bucket
- Returns S3 URL and generated filename

**Throws:**
- `supremeUserRequired` - If `isAuthSupreme` is false
- `missingBase64Field` - If `base64` is missing
- `ContentNotAccepted` - If content type is not allowed

**Confidence Note:** Explicit parameter destructuring with content type validation.

---

### trigger
**Confidence:** 95-100% High

```javascript
async function trigger(managerCtx, {
  isAuthSupreme: Boolean,
  triggerFunction: String,
  data: Object
}): Promise<{ success: Boolean }>
```

**Source:** [/app/managers/trigger/index.js:45](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/trigger/index.js:45)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `isAuthSupreme` (boolean, required) - Required except for 'ccpa' trigger
- `triggerFunction` (string, required) - One of: 'ccpa', 'waveprep', 'process-scheduled', 'gen-sms-wave-codes', 'selection'
- `data` (object, required) - Payload to pass to Lambda/Step Function

**Return Type:** Promise<{ success: Boolean }>
- Returns `{ success: true }` on successful invocation
- Returns `{ success: false }` on failed invocation (doesn't throw)

**Called By:**
- [POST /trigger/:function router](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/trigger.js:16)

**Calls:**
- [getFn](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/trigger/index.js:27) (selects Lambda or Step Function)
- `managerCtx.service.awsSDK.Lambda` or `managerCtx.service.awsSDK.StepFunctions`
- `fnct.invoke`

**Trigger Functions:**
- `ccpa` - No auth required (in `doNotRequireAuthSet`)
- `waveprep`, `process-scheduled`, `gen-sms-wave-codes` - Lambda functions (auth required)
- `selection` - Step Function state machine (auth required)

**Throws:**
- `supremeUserRequired` - If not supreme and trigger not in `doNotRequireAuthSet`
- `invalidTriggerData` - If `data` is null or empty
- `invalidTriggerFunction` - If `triggerFunction` not in `triggerFnMap`

**Confidence Note:** Explicit parameter destructuring with error handling and function mapping.

---

## Helper Functions

### getBucketService
**Confidence:** 95-100% High

```javascript
async function getBucketService({
  managerCtx: ManagerContext,
  bucketName: String
}): Promise<S3Service>
```

**Source:** [/app/managers/files/index.js:72](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:72)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `bucketName` (string, optional) - Defaults to config value

**Return Type:** Promise<S3Service>

**Called By:**
- [uploadFile](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:110)
- [getObjectsList](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:90)
- [getObjectsData](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:82)
- [deleteFiles](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:139)

**Calls:**
- [getBucketConfigOrDefault](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/shared.js:6)
- [getAssumeRoleCreds](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:66) (only for 'tmolBucket')
- `managerCtx.service.awsSDK.S3`

**Processing:**
- Retrieves bucket configuration from config
- For TMOL bucket: Assumes role and gets temporary credentials
- For other buckets: Uses standard AWS credentials
- Creates S3 service with appropriate credentials and region

**Confidence Note:** Explicit parameter destructuring with async credential handling.

---

### KoaCtxToManagerCtx
**Confidence:** 95-100% High

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
function KoaCtxToManagerCtx({
  Datastore: Function,
  Services: Function
}): ({ ctx: KoaContext }) => ManagerContext
```

**Source:** [/lib/KoaCtxToManagerCtx.js:17](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/KoaCtxToManagerCtx.js:17)

**Parameter Shape (Outer):**
- `Datastore` (function, required) - Datastore factory
- `Services` (function, required) - Services factory

**Parameter Shape (Inner):**
- `ctx` (KoaContext, required) - Koa request context

**Return Type:** ManagerContext

**Called By:**
- All route handlers (as `koaToManagerCtx`)

**Calls:**
- `selectSpan({ ctx })` - Extracts tracing span from context
- `selectCorrelation({ ctx })` - Extracts correlation from context
- `selectToken({ ctx })` - Extracts JWT from context
- `Datastore({ span, correlation })` - Creates instrumented datastores
- `Services({ span, correlation, jwt })` - Creates instrumented services
- [InstrumentedAsyncOperation](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/InstrumentedAsyncOperation.js)

**Confidence Note:** Well-documented JSDoc with explicit parameter types.

---

### InstrumentedAsyncOperation
**Confidence:** 95-100% High

**JSDoc:**
```javascript
/**
 * Instruments a given function as an async operation that a request does not wait for.
 * This results in the operation getting it's own ManagerContext created from the one passed
 * into the curried function.
 * The new MangerContext will contain it's own span (and trace for now ~ see below)
 * @param {string} operationName used as the operation name of the new trace
 * @param {function} fn function that implements the async operation to be performed
 * @returns {function(ManagerContext, ...*): Promise.<*>}
 */
```

```javascript
function InstrumentedAsyncOperation({
  span: OpenTracingSpan,
  correlation: CorrelationContext,
  jwt: JwtToken,
  Datastore: Function,
  Services: Function
}): (operationName: String, fn: Function) => (...params: any[]) => Promise<any>
```

**Source:** [/lib/InstrumentedAsyncOperation.js:21](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/InstrumentedAsyncOperation.js:21)

**Parameter Shape (Outer):**
- `span` (OpenTracingSpan, required) - Parent tracing span
- `correlation` (CorrelationContext, required) - Request correlation
- `jwt` (JwtToken, required) - JWT token
- `Datastore` (function, required) - Datastore factory
- `Services` (function, required) - Services factory

**Parameter Shape (Returned Factory):**
- `operationName` (string, required) - Name for the async operation
- `fn` (function, required) - Async function with signature `(asyncCtx, ...params) => Promise`

**Return Type:** Curried function that executes the async operation

**Called By:**
- Included in every ManagerContext via KoaCtxToManagerCtx

**Calls:**
- `parentSpan.tracer().startSpan(operationName)` - Creates new span
- `Datastore({ span, correlation })` - Creates datastore for async context
- `Services({ span, correlation, jwt })` - Creates services for async context
- `applySpanTags` - Adds tracing metadata
- `awaitSpan` - Executes async function with span tracking

**Confidence Note:** Comprehensive JSDoc with explicit parameter types and return type.

---

### ValidatorMiddleware
**Confidence:** 95-100% High

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
function ValidatorMiddleware({
  predicate: (KoaContext) => Boolean,
  errorFn: (KoaContext) => Error
}): (ctx: KoaContext, next: Function) => void
```

**Source:** [/lib/middlewares/validators/ValidatorMiddleware.js:9](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/middlewares/validators/ValidatorMiddleware.js:9)

**Parameter Shape:**
- `predicate` (function, required) - Validation function returning boolean
- `errorFn` (function, required) - Error factory function

**Return Type:** Koa middleware function

**Called By:**
- Not actively used in current codebase (infrastructure in place)

**Implementation:** Uses Ramda's `ifElse` to create branching logic

**Confidence Note:** Well-documented JSDoc with explicit function signature types.

---

## Utility Functions

### getBucketConfigOrDefault
**Confidence:** 95-100% High

```javascript
function getBucketConfigOrDefault(
  bucketDefaultName: String
): (bucketName: String) => {
  bucketName: String,
  region: String
}
```

**Source:** [/app/managers/shared.js:6](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/shared.js:6)

**Parameter Shape:**
- `bucketDefaultName` (string, required) - Default bucket name to use if lookup fails

**Return Type:** Curried function that accepts `bucketName` and returns config object

**Called By:**
- [getBucketService](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:72)
- [uploadBase64Image](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:45)

**Calls:**
- [getBucketConfigByName](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/shared.js:4) (internal)
- `config.getIn(['titan', 'aws', 'clients', bucketName])`

**Processing:**
- Looks up bucket config by name
- If not found, uses default bucket config
- Converts Immutable.js to plain JavaScript object

**Confidence Note:** Ramda pipeline with explicit fallback logic.

---

### parseFileKeys
**Confidence:** 95-100% High

```javascript
function parseFileKeys(fileKeys: String): Array<String>
```

**Source:** [/app/managers/files/index.js:37](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:37)

**Parameter Shape:**
- `fileKeys` (string, required) - Comma-separated list of S3 keys

**Return Type:** Array<String>
- Empty strings removed
- Whitespace trimmed

**Implementation:**
```javascript
R.pipe(
  R.split(','),
  R.map(R.trim),
  R.reject(R.isEmpty)
)
```

**Called By:**
- [deleteFiles](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:139)

**Confidence Note:** Pure Ramda pipeline with clear transformation steps.

---

### normalizeS3ObjectsList
**Confidence:** 95-100% High

```javascript
function normalizeS3ObjectsList(s3Object: {
  LastModified: Date,
  Key: String,
  ...other: any
}): {
  date: Date,
  key: String
}
```

**Source:** [/app/managers/files/index.js:45](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:45)

**Parameter Shape:**
- `s3Object` (object, required) - AWS SDK S3 object metadata

**Return Type:** { date: Date, key: String }

**Implementation:**
```javascript
R.applySpec({
  date: R.prop('LastModified'),
  key: R.prop('Key')
})
```

**Called By:**
- [normalizeAndSortByModifiedDate](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:50) pipeline

**Confidence Note:** Ramda `applySpec` provides explicit transformation schema.

---

### validateContentType
**Confidence:** 95-100% High

```javascript
function validateContentType({
  type: String
}): {
  type: String,
  fileExtension: String
}
```

**Source:** [/app/managers/images/index.js:26](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:26)

**Parameter Shape:**
- `type` (string, required) - MIME content type

**Return Type:** { type: String, fileExtension: String }

**Called By:**
- [uploadBase64Image](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:45)

**Processing:**
- Converts type to lowercase
- Validates against ALLOWED_CONTENT_TYPES map
- Returns normalized type and file extension

**Throws:**
- `ContentNotAccepted` - If content type not in allowed list

**Allowed Types:**
- `image/gif` → `gif`
- `image/png` → `png`
- `image/jpeg` → `jpg`

**Confidence Note:** Explicit object destructuring with validation logic.

---

### makeFileKey
**Confidence:** 95-100% High

```javascript
function makeFileKey({
  fileName: String,
  fileExtension: String
}): String
```

**Source:** [/app/managers/images/index.js:37](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:37)

**Parameter Shape:**
- `fileName` (string, optional) - Original filename (defaults to 'image')
- `fileExtension` (string, required) - File extension without dot

**Return Type:** String
- Format: `{name}_{uuid}.{extension}`

**Called By:**
- [uploadBase64Image](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:45)

**Processing:**
- Strips existing extension from fileName
- Falls back to 'image' if no fileName provided
- Appends UUID v4 and extension

**Confidence Note:** Explicit parameter destructuring with string manipulation logic.

---

### fixPrefix
**Confidence:** 95-100% High

```javascript
function fixPrefix(prefix: String): String
```

**Source:** [/app/managers/files/index.js:165](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:165)

**Parameter Shape:**
- `prefix` (string, optional) - S3 key prefix

**Return Type:** String
- Ensures prefix ends with '/'
- Returns empty string if no prefix

**Called By:**
- [uploadFile](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:110)

**Processing:**
- If no prefix: returns ''
- If doesn't end with '/': appends '/'
- Otherwise: returns unchanged

**Confidence Note:** Simple string manipulation with Ramda helpers.

---

### getAssumeRoleCreds
**Confidence:** 95-100% High

```javascript
async function getAssumeRoleCreds(): Promise<{
  accessKeyId: String,
  secretAccessKey: String,
  sessionToken: String
}>
```

**Source:** [/app/managers/files/index.js:66](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:66)

**Parameter Shape:** None (uses closure variables)

**Return Type:** Promise<AWSCredentials>

**Called By:**
- [getBucketService](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:72) (only for TMOL bucket)

**Calls:**
- [assumeTmolRole](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:61)
- [formatAssumeRoleCreds](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:55)
- AWS STS `assumeRole`

**Processing:**
- Assumes AWS IAM role for TMOL S3 access
- Generates temporary credentials
- Formats credentials for S3 client

**Confidence Note:** Ramda pipeline with AWS SDK types.

---

## Factory Functions

### ListAndSortObjects
**Confidence:** 95-100% High

```javascript
function ListAndSortObjects({
  bucketService: S3Service,
  skip: Number,
  limit: Number
}): (prefix: String) => Promise<Array<S3Object>>
```

**Source:** [/app/managers/files/listData.js:35](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:35)

**Parameter Shape:**
- `bucketService` (S3Service, required)
- `skip` (number, optional) - Defaults to 0
- `limit` (number, optional) - Defaults to 100

**Return Type:** Function that accepts prefix and returns Promise<Array<S3Object>>

**Called By:**
- [getObjectsData](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:82)

**Processing:**
- Lists objects by prefix
- Extracts Contents array
- Sorts by LastModified descending
- Applies pagination (slice from skip to skip+limit)

**Confidence Note:** Factory pattern with explicit parameter destructuring.

---

### GetDataFromObject
**Confidence:** 95-100% High

```javascript
function GetDataFromObject({
  bucketService: S3Service
}): (s3Object: {
  Key: String,
  Size: Number,
  LastModified: Date
}) => Promise<{
  key: String,
  size: Number,
  lastModifiedDate: Date,
  content?: Array | Object,
  error?: { message: String }
}>
```

**Source:** [/app/managers/files/listData.js:51](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:51)

**Parameter Shape (Outer):**
- `bucketService` (S3Service, required)

**Parameter Shape (Inner):**
- `Key` (string, required) - S3 object key
- `Size` (number, required) - File size in bytes
- `LastModified` (date, required) - Last modified timestamp

**Return Type:** Promise<S3ObjectData>

**Called By:**
- [getObjectsData](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:82) via MapAsyncParallel

**Calls:**
- [getFileExtension](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:30)
- [getParsedContent](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:46) (internal)
- `bucketService.getObject`

**Processing:**
- Extracts file extension from key
- Validates file type (JSON or CSV supported)
- Checks file size (max 1MB)
- Parses content if valid
- Returns error message if unsupported, too large, or parse fails

**Confidence Note:** Factory pattern with comprehensive error handling.

---

## Router Selectors

### selectFileName (files)
**Confidence:** 95-100% High

```javascript
const selectFileName: (ctx: KoaContext) => String = R.pipe(
  R.path(['ctx', 'request', 'fields', 'file']),
  R.head,
  R.path(['name'])
)
```

**Source:** [/app/router/files.js:17](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js:17)

**Extracts:** `ctx.request.fields.file[0].name`

**Called By:** POST /files route handler

**Confidence Note:** Ramda path pipeline with explicit structure.

---

### selectFilePath
**Confidence:** 95-100% High

```javascript
const selectFilePath: (ctx: KoaContext) => String = R.pipe(
  R.path(['ctx', 'request', 'fields', 'file']),
  R.head,
  R.path(['path'])
)
```

**Source:** [/app/router/files.js:18](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js:18)

**Extracts:** `ctx.request.fields.file[0].path`

**Called By:** POST /files route handler

**Confidence Note:** Ramda path pipeline with explicit structure.

---

### selectFileType
**Confidence:** 95-100% High

```javascript
const selectFileType: (ctx: KoaContext) => String = R.pipe(
  R.path(['ctx', 'request', 'fields', 'file']),
  R.head,
  R.path(['type'])
)
```

**Source:** [/app/router/files.js:19](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js:19)

**Extracts:** `ctx.request.fields.file[0].type`

**Called By:** POST /files route handler

**Confidence Note:** Ramda path pipeline with explicit structure.

---

### selectFileSize
**Confidence:** 95-100% High

```javascript
const selectFileSize: (ctx: KoaContext) => Number = R.pipe(
  R.path(['ctx', 'request', 'fields', 'file']),
  R.head,
  R.path(['size'])
)
```

**Source:** [/app/router/files.js:20](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js:20)

**Extracts:** `ctx.request.fields.file[0].size`

**Called By:** POST /files route handler

**Confidence Note:** Ramda path pipeline with explicit structure.

---

### selectBase64Content (images)
**Confidence:** 95-100% High

```javascript
const selectBase64Content: (ctx: KoaContext) => String =
  path(['ctx', 'request', 'fields', 'base64'])
```

**Source:** [/app/router/images.js:8](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/images.js:8)

**Extracts:** `ctx.request.fields.base64`

**Called By:** POST /images route handler

**Confidence Note:** Ramda path with explicit structure.

---

### selectContentType (images)
**Confidence:** 95-100% High

```javascript
const selectContentType: (ctx: KoaContext) => String =
  path(['ctx', 'request', 'fields', 'contentType'])
```

**Source:** [/app/router/images.js:9](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/images.js:9)

**Extracts:** `ctx.request.fields.contentType`

**Called By:** POST /images route handler

**Confidence Note:** Ramda path with explicit structure.

---

### selectTriggerFunction
**Confidence:** 95-100% High

```javascript
const selectTriggerFunction: (ctx: KoaContext) => String =
  R.path(['ctx', 'params', 'function'])
```

**Source:** [/app/router/trigger.js:9](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/trigger.js:9)

**Extracts:** `ctx.params.function` (from URL path parameter)

**Called By:** POST /trigger/:function route handler

**Confidence Note:** Ramda path with explicit structure.

---

### selectRequestFields
**Confidence:** 95-100% High

```javascript
const selectRequestFields: (ctx: KoaContext) => Object =
  R.path(['ctx', 'request', 'fields'])
```

**Source:** [/app/router/trigger.js:12](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/trigger.js:12)

**Extracts:** `ctx.request.fields` (entire fields object as data payload)

**Called By:** POST /trigger/:function route handler

**Confidence Note:** Ramda path with explicit structure.

---

## Instrumentation Patterns

### InstrumentServices
**Confidence:** 95-100% High

```javascript
function InstrumentServices({
  requestBasedServices: Object,
  sdkBasedServices: Object
}): ({
  span: OpenTracingSpan,
  correlation: CorrelationContext,
  jwt: JwtToken
}) => InstrumentedServices
```

**Source:** [/app/services/InstrumentServices.js:6](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/services/InstrumentServices.js:6)

**Parameter Shape (Outer):**
- `requestBasedServices` (object, optional) - Services that use HTTP requests
- `sdkBasedServices` (object, optional) - Services that use AWS SDK

**Parameter Shape (Inner):**
- `span` (OpenTracingSpan, required)
- `correlation` (CorrelationContext, required)
- `jwt` (JwtToken, required)

**Return Type:** InstrumentedServices

**Called By:**
- [Services factory](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/services/index.js) (once on app init)
- [KoaCtxToManagerCtx](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/KoaCtxToManagerCtx.js) (per request)

**Instrumentation:**
- Wraps services with Prometheus timing (`TimedSdk`, `TimedRequest`)
- Wraps services with distributed tracing (`TracedSdk`, `TracedRequest`)
- Adds correlation ID and JWT to requests

**Confidence Note:** Explicit parameter destructuring with nested factories.

---

### InstrumentDatastores
**Confidence:** 95-100% High

```javascript
function InstrumentDatastores({
  datastores: Object
}): ({
  span: OpenTracingSpan,
  correlation: CorrelationContext
}) => InstrumentedDatastores
```

**Source:** [/app/datastore/InstrumentDatastores.js:10](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/datastore/InstrumentDatastores.js:10)

**Parameter Shape (Outer):**
- `datastores` (object, optional) - Map of datastore connections

**Parameter Shape (Inner):**
- `span` (OpenTracingSpan, required)
- `correlation` (CorrelationContext, required)

**Return Type:** InstrumentedDatastores

**Called By:**
- [Datastore factory](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/datastore/index.js) (once on app init)
- [KoaCtxToManagerCtx](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/KoaCtxToManagerCtx.js) (per request)

**Instrumentation:**
- Wraps datastores with distributed tracing (`TracedSdk`)
- Adds custom tags for database user and name

**Note:** Currently no datastores configured in this service.

**Confidence Note:** Explicit parameter destructuring with Ramda transformation.

---

## Common Patterns

### Pattern: Parameter Destructuring with Validation

**Description:** Most manager functions follow this pattern:
1. Destructure parameters from object
2. Validate auth (check `isAuthSupreme`)
3. Validate required fields
4. Perform operation
5. Return result or throw error

**Example Usage:**
```javascript
export const uploadFile = async(managerCtx, {
  isAuthSupreme, fileKey, filePath, fileSize, contentType, uploadPrefix, bucketName
}) => {
  if (!isAuthSupreme) {
    throw error(supremeUserRequired);
  }
  if (!fileKey || !filePath) {
    throw error(missingFile);
  }
  if (!fileSize) {
    throw error(emptyFile);
  }

  // ... perform operation

  return { url, name };
};
```

**Found In:**
- [uploadFile](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:110)
- [getObjectsList](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:90)
- [deleteFiles](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:139)
- [uploadBase64Image](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:45)
- [trigger](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/trigger/index.js:45)

---

### Pattern: Ramda Pipelines for Data Transformation

**Description:** Uses Ramda's functional composition for data transformations:
- `R.pipe` for synchronous transformations
- `R.pipeP` for async transformations
- `R.applySpec` for object mapping

**Example Usage:**
```javascript
const normalizeS3ObjectsList = R.applySpec({
  date: R.prop('LastModified'),
  key: R.prop('Key')
});

const normalizeAndSortByModifiedDate = R.pipe(
  R.sort(byLastModified),
  R.map(normalizeS3ObjectsList)
);
```

**Found In:**
- [/app/managers/files/index.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js) - Object normalization and sorting
- [/app/managers/files/listData.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js) - File parsing pipeline
- [/app/managers/shared.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/shared.js) - Config retrieval

---

### Pattern: Factory Functions for Dependency Injection

**Description:** Higher-order functions that close over dependencies and return operation functions.

**Example Usage:**
```javascript
const GetDataFromObject = ({ bucketService }) => async({ Key, Size, LastModified }) => {
  // ... use bucketService to fetch and parse data
  return { key, size, lastModifiedDate, content };
};

// Usage
const getDataFromObject = GetDataFromObject({ bucketService });
const results = await MapAsyncParallel(getDataFromObject)(s3Objects);
```

**Found In:**
- [ListAndSortObjects](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:35)
- [GetDataFromObject](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:51)
- [InstrumentServices](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/services/InstrumentServices.js)
- [InstrumentDatastores](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/datastore/InstrumentDatastores.js)

---

### Pattern: Path Selectors for Context Extraction

**Description:** Ramda path functions extract nested values from Koa context.

**Example Usage:**
```javascript
const selectFileName = R.pipe(
  R.path(['ctx', 'request', 'fields', 'file']),
  R.head,
  R.path(['name'])
);

// Usage in router
router.post('/', ctx => uploadFile(koaToManagerCtx({ ctx }), {
  fileKey: selectFileName({ ctx }),
  // ...
}));
```

**Found In:**
- [/app/router/files.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/files.js) - File field extraction
- [/app/router/images.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/images.js) - Image field extraction
- [/app/router/trigger.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/router/trigger.js) - Trigger param extraction

---

### Pattern: Error Objects with Status Codes

**Description:** Error definitions as plain objects with status, message, and payload fields.

**Example Usage:**
```javascript
export const supremeUserRequired = {
  status: 403,
  message: 'Supreme privileges required.',
  payload: 'Not authorized to call this endpoint.'
};

// Usage
if (!isAuthSupreme) {
  throw error(supremeUserRequired);
}
```

**Found In:**
- [/app/errors/s3.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/errors/s3.js)
- [/app/errors/authErrors.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/errors/authErrors.js)
- [/app/errors/trigger.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/errors/trigger.js)

---

### Pattern: Async/Await with Try-Catch for Error Recovery

**Description:** Some functions use try-catch to handle errors gracefully instead of throwing.

**Example Usage:**
```javascript
export const trigger = async(managerCtx, { isAuthSupreme, triggerFunction, data }) => {
  // ... validation

  try {
    const fnct = await getFn(managerCtx, fnConfig);
    await fnct.invoke({ data });
    return { success: true };
  }
  catch ({ message, stack }) {
    log.warn('function trigger error', { message, fnConfig, data, stack });
    return { success: false };
  }
};
```

**Found In:**
- [trigger](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/trigger/index.js:45)
- [deleteFiles](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:139) (re-throws custom error)
- [GetDataFromObject](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:51) (returns error object)
