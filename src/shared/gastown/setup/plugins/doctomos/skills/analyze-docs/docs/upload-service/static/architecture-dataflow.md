# Data Flow - upload-service

## Primary Flow

The upload-service acts as an **API gateway and orchestration layer** for file/image uploads to AWS S3 and triggering of AWS Lambda functions and Step Functions. Data flows primarily through HTTP requests that orchestrate AWS service calls.

```
Client (HTTP) → Middleware Stack → Router → Manager → AWS Services
                     ↓                ↓         ↓           ↓
                 [Observability]   [Extract]  [Logic]   [Storage/Compute]
```

## Request/Response Cycle

### 1. File Upload Flow (`POST /files`)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Client                                                              │
└────────────┬────────────────────────────────────────────────────────┘
             │ POST /files (multipart/form-data)
             │   file: <file binary>
             │   prefix: "uploads/"
             │   bucketName: "my-bucket"
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Middleware Stack (app/index.js)                                     │
├─────────────────────────────────────────────────────────────────────┤
│ 1. koa-better-body: Parse multipart form, save to temp file        │
│ 2. tracing: Create span, attach to ctx                             │
│ 3. prometheus: Start request timer                                 │
│ 4. correlation: Generate/extract correlation ID                    │
│ 5. accessLog: Log request details                                  │
│ 6. jwt: Validate token, extract user claims                        │
└────────────┬────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Router (app/router/files.js)                                        │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Extract parameters from ctx.request.fields:                     │
│    - fileName, filePath, fileSize, contentType                     │
│    - uploadPrefix, bucketName                                      │
│ 2. Check isAuthSupreme (from JWT)                                  │
│ 3. Create managerCtx via KoaCtxToManagerCtx                        │
│ 4. Call: uploadFile(managerCtx, params)                            │
└────────────┬────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Manager (app/managers/files/uploadFile)                             │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Validate: isAuthSupreme, fileKey, filePath, fileSize           │
│ 2. Get bucket service: getBucketService({ managerCtx, bucketName })│
│    ├─ If bucketName === "tmolBucket"                               │
│    │   └─ Assume IAM role via STS for TMOL access                 │
│    └─ Else: Use default credentials                                │
│ 3. Call: bucketService.uploadFile(...)                             │
│ 4. Return: { url, name }                                           │
└────────────┬────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Service (app/services/s3/index.js)                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Create S3 client with credentials                               │
│ 2. uploadFile({ filePath, fileKey, contentType, acl: 'private' }) │
│    └─ Reads file from disk, streams to S3                          │
│ 3. Return: { url }                                                 │
└────────────┬────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ AWS S3                                                              │
├─────────────────────────────────────────────────────────────────────┤
│ - File stored at: s3://bucket/{prefix}/{fileName}                  │
│ - Returns: Object URL                                              │
└────────────┬────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Response Middleware (lib/middlewares/responseFormatter.js)         │
├─────────────────────────────────────────────────────────────────────┤
│ Format response: { data: { url, name } }                           │
└────────────┬────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Client                                                              │
├─────────────────────────────────────────────────────────────────────┤
│ Receives: { data: { url: "s3://...", name: "file.pdf" } }         │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Data Transformations**:
1. **Multipart form** → Temp file on disk (via `koa-better-body`)
2. **Koa ctx** → `managerCtx` (via `KoaCtxToManagerCtx`)
3. **File path** → S3 object key with prefix normalization
4. **Manager result** → Formatted JSON response

---

### 2. Image Upload Flow (`POST /images`)

```
Client → Middleware Stack → Router → Manager → S3 Service → AWS S3
           (JWT auth)         ↓         ↓          ↓
                          [Extract]  [Validate] [Upload]
                          base64,    content    base64
                          type,      type,      to S3
                          fileName   generate
                                     UUID key
```

**Differences from File Upload**:
- Accepts **base64-encoded** image data (not multipart file)
- Validates content type against whitelist: `image/gif`, `image/png`, `image/jpeg`
- Generates UUID-based filename: `{name}_{uuid}.{ext}`
- Uses dedicated images bucket (configured separately)

**Data Transformations**:
1. **Base64 string** → Binary buffer (in S3 service)
2. **Content type** → File extension (`image/jpeg` → `jpg`)
3. **Optional fileName** → UUID-suffixed key (`photo_abc-123.jpg`)

---

### 3. File Listing Flow (`GET /files/list`)

```
Client → Middleware → Router → Manager → S3 Service → AWS S3
         (JWT)         ↓          ↓           ↓
                   [Extract]  [Auth]    [List Objects]
                   prefix,    check     by prefix
                   bucket     supreme
                                ↓
                          [Sort by date]
                                ↓
                          Return: [{ key, date }]
```

**Data Flow**:
1. Query params: `?prefix=uploads/&bucketName=my-bucket`
2. S3 ListObjects API call
3. Filter/sort by `LastModified` (descending)
4. Normalize: `{ key, date }` array

---

### 4. File Listing with Pagination (`GET /files/list/data`)

**Enhanced version** of `/files/list` with pagination support:

```
Client → Router → Manager → S3 Service → AWS S3
                    ↓
              [Pagination]
              limit, offset
                    ↓
              Return: { items, total, page }
```

**Additional Data Handling**:
- Implements `listData.js` logic (separate from basic list)
- Supports `limit` and `offset` query params
- Returns paginated result set

---

### 5. File Deletion Flow (`DELETE /files`)

```
Client → Middleware → Router → Manager → S3 Service → AWS S3
         (JWT)         ↓          ↓           ↓
                   [Parse]    [Auth]     [Batch Delete]
                   fileKeys   check      deleteObjects
                   CSV        supreme
```

**Data Transformations**:
1. Query param: `?fileKeys=file1.pdf,file2.txt,file3.jpg&bucketName=my-bucket`
2. Parse CSV: `"file1.pdf, file2.txt"` → `["file1.pdf", "file2.txt"]`
3. S3 DeleteObjects API (batch delete, max 1000 per call)
4. Return: `{ deleted: [...] }`

---

### 6. Lambda/Step Function Trigger Flow (`POST /trigger/:function`)

```
Client → Middleware → Router → Manager → Lambda/StepFn Service → AWS
         (JWT)         ↓          ↓              ↓
                   [Route]    [Map]        [Invoke]
                   function   config       function
                   param      lookup       with data
```

**Supported Functions** (from `app/managers/trigger/index.js`):
- `ccpa` → `processCcpaRequestLambda` (no auth required)
- `waveprep` → `processSmsWaveFilesLambda`
- `process-scheduled` → `processScheduledLambda`
- `gen-sms-wave-codes` → `generateSmsWaveCodesLambda`
- `selection` → `selectionStepFn` (Step Function, not Lambda)

**Data Flow**:
1. Route param: `/trigger/waveprep`
2. Request body: `{ data: { eventId: "123", ... } }`
3. Manager validates auth (except `ccpa`)
4. Looks up function config from `triggerFnMap`
5. Invokes Lambda or starts Step Function execution
6. Returns: `{ success: true/false }`

**Special Handling**:
- **Lambda invocation**: `Lambda.invoke({ data })`
- **Step Function**: `StepFunctions.startExecution({ data })`
- Error handling: Catches errors, logs, returns `{ success: false }`

---

## State Management

**No client-side state** - This is a stateless backend service.

**Request-scoped state**:
- Managed via Koa context (`ctx`)
- Transformed to `managerCtx` for business logic
- Contains: span, correlation ID, JWT claims

**Session state**:
- JWT token-based (stateless authentication)
- No server-side sessions

**Temporary file state**:
- Files uploaded to temp directory via `koa-better-body`
- Cleaned up after upload to S3 completes

---

## Event Processing

### Outbound Events (This service triggers others)

**Lambda Invocations** (`POST /trigger/:function`):
- **Synchronous** invocation (waits for response)
- Payload: JSON data from request body
- Response: Success/failure indication

**Step Function Executions**:
- **Asynchronous** (fire-and-forget)
- Payload: JSON input for state machine
- Response: Execution ARN

### Inbound Events

**None directly** - This service does not consume events. It's an HTTP-only API.

**Potential integration** (based on code):
- MongoDB datastore present but minimally used
- Could store upload metadata (not currently implemented)

---

## External Integrations

| Integration | Direction | Purpose | Implementation |
|-------------|-----------|---------|----------------|
| **AWS S3** | Read/Write | File and image storage | `app/services/s3/` |
| **AWS Lambda** | Write (Invoke) | Trigger serverless functions | `app/services/lambda/` |
| **AWS Step Functions** | Write (Start) | Trigger workflow executions | `app/services/stepFunctions/` |
| **AWS STS** | Read (AssumeRole) | Temporary credentials for TMOL bucket | `app/managers/files/` |
| **MongoDB** | Read/Write (planned) | Metadata storage | `app/datastore/mongo/` (minimal usage) |
| **Lightstep** | Write (Traces) | Distributed tracing | `lib/middlewares/tracing/` |
| **Prometheus** | Read (Scrape) | Metrics collection | `/metrics` endpoint |

### AWS S3 Integration Details

**Bucket Selection**:
- Default buckets configured per environment (`configs/*.config.yml`)
- Override via `bucketName` parameter
- Special handling for `tmolBucket` (requires IAM role assumption)

**Operations**:
- `uploadFile`: Stream file from disk to S3
- `uploadBase64Image`: Decode base64, upload to S3
- `listObjectsByPrefix`: List objects matching prefix
- `deleteObjects`: Batch delete (max 1000 keys)

**Authentication**:
1. **Standard buckets**: Static credentials from config
2. **TMOL bucket**: Temporary credentials via STS AssumeRole

---

### Lambda/Step Function Integration Details

**Invocation Pattern**:
```javascript
const lambda = await Lambda({ functionName, accessKeyId, secretAccessKey, region });
await lambda.invoke({ data });
```

**Configuration**:
- Function names/ARNs from `configs/*.config.yml`
- Mapped to trigger keywords: `waveprep`, `ccpa`, etc.

**Use Cases**:
- `processSmsWaveFilesLambda`: Process SMS wave files
- `processCcpaRequestLambda`: Handle CCPA deletion requests (public endpoint)
- `processScheduledLambda`: Process scheduled tasks
- `generateSmsWaveCodesLambda`: Generate SMS wave codes
- `selectionStepFn`: Run fan selection workflow

---

## Observability Data Flow

### Tracing Flow

```
HTTP Request
    ↓
[Tracing Middleware]
    ├─ Create root span
    ├─ Attach to ctx.state.span
    └─ Propagate via managerCtx
         ↓
[Manager Layer]
    └─ Child spans via managerCtx.span
         ↓
[Service Layer]
    └─ Instrumented operations
         ↓
[Lightstep]
    └─ Export spans
```

### Metrics Flow

```
HTTP Request
    ↓
[Prometheus Middleware]
    ├─ Increment request counter
    ├─ Start duration timer
    └─ On response: Record duration histogram
         ↓
[Default Metrics Collector]
    └─ Node.js runtime metrics (memory, CPU, event loop)
         ↓
[/metrics endpoint]
    └─ Prometheus scrape target (text format)
```

### Logging Flow

```
[Log Factory (lib/Log.js)]
    └─ Creates logger with module name
         ↓
[Manager/Service/Router]
    ├─ log.info('operation', { data })
    ├─ log.warn('warning', { error })
    └─ log.error('failure', { stack })
         ↓
[@verifiedfan/log]
    └─ Structured JSON logs with correlation ID
         ↓
[Stdout/CloudWatch]
```

---

## Data Validation

### Request Validation

**JWT Validation** (`lib/middlewares/jwt.js`):
- Verifies token signature
- Extracts user claims (`isSupreme`, etc.)
- Excludes: `/metrics`, `/heartbeat`, `/dev/token`

**Input Validation**:
- File size limits: `maxFileSize` from config (applied by `koa-better-body`)
- Content type whitelist (images only): `image/gif`, `image/png`, `image/jpeg`
- Parameter presence checks in managers (throw errors if missing)

**Schema Validation** (BDD tests):
- JSON schemas in `features/schemas/`
- Validates response structure during testing
- Not applied to production requests

---

## Error Propagation

```
[Service Layer Error]
    ↓
[Manager Layer]
    ├─ Catch service error
    ├─ Log error details
    └─ Throw formatted error via error factory
         ↓
[Error Formatter Middleware]
    ├─ Catch thrown errors
    ├─ Format as: { error: { code, status, message } }
    └─ Set HTTP status code
         ↓
[Client]
    └─ Receives error response
```

**Error Factory Pattern**:
```javascript
// app/errors/s3.js
export const missingFile = { code: 'missing-file', status: 400 };

// Manager usage
throw error(missingFile);

// Middleware converts to HTTP response
{ error: { code: 'missing-file', status: 400 } }
```

---

## Performance Considerations

### Bottlenecks

1. **File Upload Size**: Limited by `maxFileSize` config (prevents memory exhaustion)
2. **S3 API Rate Limits**: Could throttle under high load (no retry logic visible)
3. **Lambda Cold Starts**: Trigger endpoint latency depends on downstream Lambda warmth
4. **Synchronous Processing**: File uploads block request until S3 upload completes

### Optimizations

1. **DNS Caching**: Enabled via `dns-cache` module (TTL from config)
2. **Compression**: Koa-compress middleware (gzip/deflate)
3. **Streaming**: Files streamed to S3 (not buffered in memory)
4. **Connection Pooling**: AWS SDK handles connection reuse

### Scalability

- **Horizontal**: Stateless service, can scale via container replication (ECS Fargate)
- **Vertical**: Limited by file upload size and memory
- **AWS Service Limits**: S3 throughput, Lambda concurrency

---

## Data Retention & Cleanup

**Temporary Files**:
- Created by `koa-better-body` in temp directory
- Lifecycle: Request duration only
- Cleanup: Automatic (handled by Koa middleware)

**S3 Objects**:
- No automatic cleanup in application code
- Retention managed via S3 lifecycle policies (configured externally)

**Logs**:
- Stdout logs captured by container orchestration (CloudWatch Logs)
- Retention per CloudWatch configuration

**Traces**:
- Sent to Lightstep (retention per Lightstep plan)

**Metrics**:
- Scraped by Prometheus
- Retention per Prometheus configuration
