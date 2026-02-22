# Type Definitions - upload-service

**Note:** This service is written in JavaScript (not TypeScript) and uses JSDoc annotations for type documentation. Types are inferred from function signatures, JSDoc comments, and runtime validation patterns.

## Core Context Types

### ManagerContext
**Category:** Core Application Context

**Description:** Primary context object passed to all manager functions, containing instrumented services, datastores, and tracing information.

```javascript
{
  span: OpenTracingSpan,
  correlation: CorrelationContext,
  jwt: JwtToken,
  datastore: InstrumentedDatastores,
  service: InstrumentedServices,
  InstrumentedAsyncOperation: Function
}
```

**Created By:** [KoaCtxToManagerCtx](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/KoaCtxToManagerCtx.js)

**Used By:**
- All manager functions in `/app/managers/`
- All route handlers

**Fields:**
- `span` (OpenTracingSpan) - Distributed tracing span for request tracking
- `correlation` (CorrelationContext) - Correlation ID and metadata for request tracing
- `jwt` (JwtToken) - Decoded JWT token with user authentication data
- `datastore` (InstrumentedDatastores) - Instrumented datastore connections (currently empty in this service)
- `service` (InstrumentedServices) - Instrumented AWS SDK services (S3, Lambda, Step Functions)
- `InstrumentedAsyncOperation` (Function) - Factory for creating traced async operations

---

### KoaContext
**Category:** HTTP Context (from Koa framework)

**Description:** Koa middleware context object containing request/response information.

```javascript
{
  request: {
    fields: {
      file: Array<FileObject>,
      base64: String,
      contentType: String,
      fileName: String,
      cacheControl: String,
      prefix: String,
      bucketName: String,
      fileKeys: String
    },
    body: Object
  },
  response: Object,
  params: Object,
  query: Object,
  state: {
    span: OpenTracingSpan,
    correlation: CorrelationContext,
    jwt: JwtToken
  }
}
```

**Middleware Applied:**
- `koa-better-body` - Parses multipart/form-data and JSON bodies
- Tracing middleware - Adds `span` to state
- Correlation middleware - Adds `correlation` to state
- JWT middleware - Adds `jwt` to state

**Transformed To:** [ManagerContext](#managercontext) via KoaCtxToManagerCtx

---

### CorrelationContext
**Category:** Request Tracking

**Description:** Correlation metadata for distributed request tracing.

```javascript
{
  id: String  // UUID v4 correlation ID
}
```

**Created By:** Correlation middleware
**Used By:** All services and datastores for request tracking

---

### JwtToken
**Category:** Authentication

**Description:** Decoded JWT token containing user authentication and authorization data.

```javascript
{
  userId: String,
  supreme: Boolean,  // Supreme user flag for elevated permissions
  // ... other JWT claims
}
```

**Created By:** JWT middleware (`/lib/middlewares/jwt.js`)
**Selector:** `selectIsUserSupreme` - Extracts `supreme` boolean flag

---

## AWS Service Configuration Types

### S3BucketConfig
**Category:** AWS Configuration

**Description:** Configuration for S3 bucket access.

```javascript
{
  bucketName: String,
  region: String  // Optional, defaults to config.titan.aws.default.region
}
```

**Used By:**
- [getBucketService](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:72)
- [uploadBase64Image](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:45)

**Retrieved Via:** `getBucketConfigOrDefault(bucketDefaultName)(bucketName)`

---

### AWSCredentials
**Category:** AWS Configuration

**Description:** AWS credentials for SDK authentication.

```javascript
{
  accessKeyId: String,
  secretAccessKey: String,
  sessionToken: String  // Optional, only for assumed role credentials
}
```

**Used By:**
- All AWS SDK service initialization
- [getAssumeRoleCreds](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:66) - For TMOL bucket access

---

### LambdaConfig
**Category:** AWS Configuration

**Description:** Configuration for Lambda function invocation.

```javascript
{
  functionName: String
}
```

**Examples:**
- `clients.processCcpaRequestLambda`
- `clients.processSmsWaveFilesLambda`
- `clients.processScheduledLambda`
- `clients.generateSmsWaveCodesLambda`

---

### StepFunctionConfig
**Category:** AWS Configuration

**Description:** Configuration for Step Functions state machine.

```javascript
{
  stateMachineArn: String
}
```

**Example:** `clients.selectionStepFn`

---

## File Upload Types

### FileObject
**Category:** File Upload (multipart/form-data)

**Description:** File object from multipart form upload.

```javascript
{
  name: String,     // Original filename
  path: String,     // Temporary file path on disk
  type: String,     // MIME content type
  size: Number      // File size in bytes
}
```

**Source:** `koa-better-body` middleware
**Accessed Via:** `ctx.request.fields.file[0]`

**Selectors:**
- `selectFileName` - Extracts `name` field
- `selectFilePath` - Extracts `path` field
- `selectFileType` - Extracts `type` field
- `selectFileSize` - Extracts `size` field

---

### UploadFileParams
**Category:** File Upload Parameters

**Description:** Parameters for file upload operation.

```javascript
{
  isAuthSupreme: Boolean,
  fileKey: String,           // Destination filename in S3
  filePath: String,          // Temporary local file path
  fileSize: Number,          // File size in bytes
  contentType: String,       // MIME type
  uploadPrefix: String,      // Optional S3 key prefix/folder
  bucketName: String         // Optional bucket name (defaults to config value)
}
```

**Used By:** [uploadFile](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:110)

**Returns:** [UploadResult](#uploadresult)

---

### UploadResult
**Category:** File Upload Response

**Description:** Result of successful file upload.

```javascript
{
  url: String,      // Full S3 URL of uploaded file
  name: String      // Filename (fileKey)
}
```

**Returned By:**
- [uploadFile](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:110)
- [uploadBase64Image](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:45)

---

## Image Upload Types

### UploadBase64ImageParams
**Category:** Image Upload Parameters

**Description:** Parameters for base64 image upload.

```javascript
{
  isAuthSupreme: Boolean,
  base64: String,           // Base64-encoded image data
  contentType: String,      // MIME type (must be image/gif, image/png, or image/jpeg)
  fileName: String,         // Optional original filename
  cacheControl: String,     // Optional cache-control header
  bucketName: String        // Optional bucket name
}
```

**Used By:** [uploadBase64Image](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:45)

**Returns:** [UploadResult](#uploadresult)

**Validation:**
- `contentType` must be one of: `image/gif`, `image/png`, `image/jpeg`
- `base64` field is required

---

### AllowedContentTypes
**Category:** Image Upload Validation

**Description:** Map of allowed image content types to file extensions.

```javascript
{
  'image/gif': 'gif',
  'image/png': 'png',
  'image/jpeg': 'jpg'
}
```

**Used By:** [validateContentType](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/images/index.js:26)

---

## File Listing Types

### GetObjectsListParams
**Category:** File Listing Parameters

**Description:** Parameters for listing S3 objects.

```javascript
{
  isAuthSupreme: Boolean,
  prefix: String,          // S3 key prefix to filter objects
  bucketName: String       // Optional bucket name
}
```

**Used By:** [getObjectsList](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:90)

**Returns:** Array<[S3ObjectSummary](#s3objectsummary)>

---

### S3ObjectSummary
**Category:** S3 Object Metadata

**Description:** Normalized S3 object metadata.

```javascript
{
  date: Date,       // LastModified date
  key: String       // S3 object key
}
```

**Transformed From:** AWS SDK `ListObjectsV2` response via `normalizeS3ObjectsList`

**Sorting:** Sorted by `date` descending (most recent first)

---

### GetObjectsDataParams
**Category:** File Data Retrieval Parameters

**Description:** Parameters for retrieving S3 object data with pagination.

```javascript
{
  isAuthSupreme: Boolean,
  prefix: String,          // S3 key prefix to filter objects
  bucketName: String,      // Optional bucket name
  skip: Number,            // Pagination offset (default: 0)
  limit: Number            // Pagination limit (default: 100)
}
```

**Used By:** [getObjectsData](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/listData.js:82)

**Returns:** Array<[S3ObjectData](#s3objectdata)>

---

### S3ObjectData
**Category:** S3 Object with Content

**Description:** S3 object metadata with parsed content or error.

```javascript
{
  key: String,
  size: Number,
  lastModifiedDate: Date,
  content?: Array<Object> | Object,  // Parsed JSON or CSV content (if successful)
  error?: {
    message: String
  }
}
```

**Content Parsing:**
- `.json` files → Parsed as JSON
- `.csv` files → Parsed as CSV with headers
- Other files → Error: "Parsing this file type not yet supported"
- Files > 1MB → Error: "File too large to read"
- Parse failures → Error: "File parse attempt failed"

**CSV Parser Options:**
```javascript
{
  delimiter: ',',
  skip_empty_lines: true,
  relax_column_count: true,
  columns: true  // Use first row as headers
}
```

---

### DeleteFilesParams
**Category:** File Deletion Parameters

**Description:** Parameters for deleting S3 objects.

```javascript
{
  isAuthSupreme: Boolean,
  fileKeys: String,        // Comma-separated list of S3 keys
  bucketName: String       // Optional bucket name
}
```

**Used By:** [deleteFiles](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/files/index.js:139)

**Returns:** [DeleteFilesResult](#deletefilesresult)

---

### DeleteFilesResult
**Category:** File Deletion Response

**Description:** Result of S3 object deletion.

```javascript
{
  deleted: Array<{
    Key: String,
    VersionId: String
  }>
}
```

**Source:** AWS SDK `deleteObjects` response

---

## Trigger Types

### TriggerParams
**Category:** Lambda/Step Function Trigger Parameters

**Description:** Parameters for triggering Lambda functions or Step Functions.

```javascript
{
  isAuthSupreme: Boolean,    // Required for most triggers (except 'ccpa')
  triggerFunction: String,   // Function identifier
  data: Object               // Payload data to pass to function
}
```

**Used By:** [trigger](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/managers/trigger/index.js:45)

**Valid triggerFunction Values:**
- `'ccpa'` - Process CCPA request (no auth required)
- `'waveprep'` - Process SMS wave files
- `'process-scheduled'` - Process scheduled events
- `'gen-sms-wave-codes'` - Generate SMS wave codes
- `'selection'` - Selection Step Function (state machine)

**Returns:** [TriggerResult](#triggerresult)

---

### TriggerFunctionMap
**Category:** Trigger Function Configuration

**Description:** Map of trigger function names to AWS service configurations.

```javascript
{
  ccpa: LambdaConfig,
  waveprep: LambdaConfig,
  'process-scheduled': LambdaConfig,
  'gen-sms-wave-codes': LambdaConfig,
  selection: StepFunctionConfig
}
```

**Source:** `config.titan.aws.clients`

---

### TriggerResult
**Category:** Trigger Response

**Description:** Result of trigger invocation.

```javascript
{
  success: Boolean
}
```

**Returns:**
- `{ success: true }` - If invocation succeeded
- `{ success: false }` - If invocation failed (logged, but not thrown)

---

## Error Types

### S3ErrorTypes
**Category:** S3 Error Definitions

**Description:** Standardized error objects for S3 operations.

#### ContentNotAccepted
```javascript
{
  status: 400,
  message: 'The provided content type is not accepted.',
  payload: String  // "Invalid content type: '{type}'."
}
```

#### missingBase64Field
```javascript
{
  status: 400,
  message: 'Missing image content.',
  payload: "The 'base64' field is required."
}
```

#### missingFile
```javascript
{
  status: 400,
  message: 'Missing file content.',
  payload: "The 'file' field is required."
}
```

#### emptyFile
```javascript
{
  status: 400,
  message: 'Empty file content.',
  payload: 'The file content is empty.'
}
```

#### missingFileKeys
```javascript
{
  status: 400,
  message: 'Missing fileKeys.',
  payload: 'The fileKeys field is required.'
}
```

#### deleteObjectsFailure
```javascript
{
  status: 400,
  message: 'Failed to delete requested files.',
  payload: 'Failed to delete requested files.'
}
```

#### supremeUserRequired
```javascript
{
  status: 403,
  message: 'Supreme privileges required.',
  payload: 'Not authorized to call this endpoint.'
}
```

**Source:** [/app/errors/s3.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/errors/s3.js)

---

### AuthErrorTypes
**Category:** Authentication Error Definitions

#### notLoggedIn
```javascript
{
  status: 401,
  message: 'This action requires you to be logged in.',
  payload: 'Did not receive jwt with userId'
}
```

#### supremeUserRequired
```javascript
{
  status: 403,
  message: 'Supreme user permissions required.',
  payload: 'User is not supreme.'
}
```

**Source:** [/app/errors/authErrors.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/errors/authErrors.js)

---

### TriggerErrorTypes
**Category:** Trigger Error Definitions

#### invalidTriggerFunction
```javascript
{
  status: 400,
  message: 'The provided trigger function is not valid.',
  payload: String  // "Invalid trigger function: '{triggerFunction}'."
}
```

#### invalidTriggerData
```javascript
{
  status: 400,
  message: 'The data provided is empty or does not exist.',
  payload: 'Empty or null data was passed.'
}
```

**Source:** [/app/errors/trigger.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/errors/trigger.js)

---

## Instrumentation Types

### InstrumentedServices
**Category:** Service Instrumentation

**Description:** Instrumented AWS SDK services with tracing and metrics.

```javascript
{
  imagesS3: S3Service,
  filesS3: S3Service,
  awsSDK: {
    S3: Function,           // S3 service factory
    Lambda: Function,       // Lambda service factory
    StepFunctions: Function // Step Functions service factory
  },
  processSmsWaveFilesLambda: LambdaService,
  selectionStepFn: StepFunctionService
}
```

**Created By:** [InstrumentServices](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/services/InstrumentServices.js)

**Instrumentation Layers:**
1. **Prometheus** - Request timing metrics (`TimedSdk`, `TimedRequest`)
2. **Tracing** - Distributed tracing spans (`TracedSdk`, `TracedRequest`)

**Used By:** All manager functions via `managerCtx.service`

---

### InstrumentedDatastores
**Category:** Datastore Instrumentation

**Description:** Instrumented datastore connections (currently empty in this service).

```javascript
{
  // No datastores configured
}
```

**Created By:** [InstrumentDatastores](/Users/Brodie.Balser/Documents/TM/titan/upload-service/app/datastore/InstrumentDatastores.js)

**Note:** This service does not use MongoDB or other datastores despite having the infrastructure.

---

### InstrumentedAsyncOperation
**Category:** Async Operation Instrumentation

**Description:** Factory function for creating traced async operations that don't block the request.

**Type Signature:**
```javascript
(operationName: String, fn: Function) => (...params: any[]) => Promise<any>
```

**Parameters:**
- `operationName` (String) - Name for the async operation span
- `fn` (Function) - Async function to execute with signature `(asyncCtx, ...params) => Promise`

**Returns:** Curried function that accepts parameters and returns a Promise

**Example Usage:**
```javascript
const someAsyncTask = InstrumentedAsyncOperation('someAsyncTask', async(asyncCtx, { foo }) => {
  // do something async...
});

someAsyncTask(managerCtx, { foo: 'bar' });
```

**Features:**
- Creates new trace span for async operation
- Propagates correlation ID and JWT
- Provides new ManagerContext to async function
- Non-blocking (parent request doesn't wait)

**Source:** [/lib/InstrumentedAsyncOperation.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/InstrumentedAsyncOperation.js)

---

## Middleware Types

### ValidatorMiddleware
**Category:** Validation Middleware

**JSDoc:**
```javascript
/**
 * Creates a middleware function that takes a predicate and an errorFn.
 * If the predicate fails, the result of the errorFn is thrown, otherwise next() is called.
 * @param {function: KoaContext => boolean} predicate
 * @param {function: KoaContext => Error} errorFn
 */
```

**Type Signature:**
```javascript
({
  predicate: (KoaContext) => Boolean,
  errorFn: (KoaContext) => Error
}) => (KoaContext, Function) => void
```

**Source:** [/lib/middlewares/validators/ValidatorMiddleware.js](/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/middlewares/validators/ValidatorMiddleware.js)

---

## Type Dependency Graph

```
HTTP Request
  └─ KoaContext (Koa framework)
      ├─ request.fields (multipart/form-data)
      │   ├─ FileObject (file uploads)
      │   └─ String fields (base64, contentType, etc.)
      └─ state
          ├─ OpenTracingSpan (tracing)
          ├─ CorrelationContext (request tracking)
          └─ JwtToken (authentication)
             ↓ transforms to ↓
ManagerContext (application context)
  ├─ span (OpenTracingSpan)
  ├─ correlation (CorrelationContext)
  ├─ jwt (JwtToken)
  ├─ datastore (InstrumentedDatastores - empty)
  ├─ service (InstrumentedServices)
  │   ├─ imagesS3 (S3Service)
  │   ├─ filesS3 (S3Service)
  │   ├─ awsSDK
  │   │   ├─ S3 (Factory)
  │   │   ├─ Lambda (Factory)
  │   │   └─ StepFunctions (Factory)
  │   ├─ processSmsWaveFilesLambda (LambdaService)
  │   └─ selectionStepFn (StepFunctionService)
  └─ InstrumentedAsyncOperation (Factory)
      └─ creates new ManagerContext for async ops

Configuration Types:
  ├─ S3BucketConfig
  ├─ AWSCredentials
  ├─ LambdaConfig
  └─ StepFunctionConfig

Request Parameter Types:
  ├─ UploadFileParams → UploadResult
  ├─ UploadBase64ImageParams → UploadResult
  ├─ GetObjectsListParams → Array<S3ObjectSummary>
  ├─ GetObjectsDataParams → Array<S3ObjectData>
  ├─ DeleteFilesParams → DeleteFilesResult
  └─ TriggerParams → TriggerResult

Error Types:
  ├─ S3ErrorTypes (6 errors)
  ├─ AuthErrorTypes (2 errors)
  └─ TriggerErrorTypes (2 errors)
```

---

## API Endpoints Type Summary

### POST /images
**Accepts:** Multipart form-data with [UploadBase64ImageParams](#uploadbase64imageparams)
**Returns:** [UploadResult](#uploadresult)

### POST /files
**Accepts:** Multipart form-data with file and [UploadFileParams](#uploadfileparams)
**Returns:** [UploadResult](#uploadresult)

### GET /files/list
**Query Params:** [GetObjectsListParams](#getobjectslistparams)
**Returns:** Array<[S3ObjectSummary](#s3objectsummary)>

### GET /files/list/data
**Query Params:** [GetObjectsDataParams](#getobjectsdataparams) + pagination
**Returns:** Array<[S3ObjectData](#s3objectdata)>

### DELETE /files
**Query Params:** [DeleteFilesParams](#deletefilesparams)
**Returns:** [DeleteFilesResult](#deletefilesresult)

### POST /trigger/:function
**Body:** [TriggerParams](#triggerparams) (function from URL param)
**Returns:** [TriggerResult](#triggerresult)
