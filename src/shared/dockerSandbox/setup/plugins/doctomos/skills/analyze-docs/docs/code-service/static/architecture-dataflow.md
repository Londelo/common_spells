# Data Flow - code-service

## Primary Flow

The code-service is a **code inventory management API** that handles promotional code lifecycle operations: uploading, counting, reserving, assigning, and releasing codes for campaigns.

**Core Operations Flow Pattern:**
```
HTTP Request
    ↓
Middleware Chain (auth, validation, logging, tracing)
    ↓
Router (parameter extraction)
    ↓
Context Adapter (Koa → Manager Context)
    ↓
Manager (business logic, validation)
    ↓
Datastore/Service (data persistence or external calls)
    ↓
Response (via middleware formatting)
```

## Request/Response Cycle

### 1. Upload Codes Flow
**Endpoint**: `POST /:campaignId/codes`

```
1. HTTP POST /v1/12345/codes { fileKey: "codes/12345/tm/upload-123.csv" }
   │
   ├─> Middleware Chain:
   │   ├─ Tracing: Start distributed trace span
   │   ├─ Body Parser: Parse JSON body
   │   ├─ Prometheus: Increment request counter, start duration timer
   │   ├─ Correlation: Generate/extract correlation ID
   │   ├─ Access Log: Log request details
   │   ├─ JWT: Validate JWT token, extract user claims (check isSupreme)
   │   └─ Router: Route to uploadCodes handler
   │
2. Router (`app/router/index.js`):
   │   - Extract fileKey from request body
   │   - Extract isAuthSupreme from JWT context
   │   - Create manager context via KoaCtxToManagerCtx
   │
3. Manager (`app/managers/codes/uploadCodes`):
   │   - Parse fileKey regex to extract campaignId and type
   │   - Validate: Supreme user required
   │   - Validate: Type must be 'tm' or 'external'
   │   - Call readAndStoreCodes
   │
4. readAndStoreCodes (`app/managers/codes/readAndStoreCodes.js`):
   │   ├─ S3 Service: Get read stream for CSV file from S3
   │   │   - s3Client.getReadStreamForObject(fileKey)
   │   │
   │   ├─ Stream Processing Pipeline:
   │   │   s3ReadStream
   │   │     → CSV Parser (parse CSV rows, extract first column)
   │   │     → BatchTransformStream (batch 50,000 codes at a time)
   │   │       └─> For each batch:
   │   │            - Datastore: upsertCodes({ campaignId, type, codes })
   │   │              └─> MongoDB bulk upsert (insert new, update existing)
   │   │            - Accumulate counts: { in, inserted, updated }
   │   │
   │   └─ Return: { count: { in: 100000, inserted: 98000, updated: 2000 } }
   │
5. Response Middleware:
   │   - Format success response
   │   - Prometheus: Record response duration
   │   - Return HTTP 200 with count data
```

### 2. Reserve Codes Flow
**Endpoint**: `GET /:campaignId/reserve?count=10&type=tm`

```
1. HTTP GET /v1/12345/reserve?count=10&type=tm
   │
   ├─> Middleware Chain (same as upload)
   │
2. Router:
   │   - Extract campaignId from path params
   │   - Extract count, type from query params
   │   - Extract isAuthSupreme from JWT
   │
3. Manager (`app/managers/codes/reserveCodes`):
   │   - Validate: Supreme user required
   │   - Validate: count >= 1, type in ['tm', 'external']
   │   - Generate UUID as reserveId
   │   - Call findAndReserveCodes
   │
4. findAndReserveCodes:
   │   ├─ Datastore.codes.findAvailableCodes({ campaignId, count, type })
   │   │   └─> MongoDB query: Find codes where:
   │   │       - campaign_id = 12345
   │   │       - type = 'tm'
   │   │       - status = AVAILABLE (not assigned, reserved date expired or doesn't exist)
   │   │       - Limit: 10 codes
   │   │   Returns: Array of code IDs
   │   │
   │   ├─ Extract code IDs from results
   │   │
   │   ├─ Datastore.codes.reserveCodes({ codeIds, reserveId })
   │   │   └─> MongoDB bulk update:
   │   │       - Set date.reserved = now
   │   │       - Set reserveId = <UUID>
   │   │       - Only update if still AVAILABLE (prevents race conditions)
   │   │   Returns: modifiedCount
   │   │
   │   ├─ Datastore.codes.findCodesByReserveId({ reserveId })
   │   │   └─> MongoDB query: Find codes with this reserveId
   │   │   Returns: Reserved codes with full data
   │   │
   │   └─ Return: { reserveId, codes: [...], count: 10 }
   │
5. Response: HTTP 200 with reserved codes and reserveId
```

### 3. Assign Codes Flow
**Endpoint**: `POST /:campaignId/assign { codes: ["ABC123", "DEF456"] }`

```
1. HTTP POST /v1/12345/assign { codes: ["ABC123", "DEF456"] }
   │
   ├─> Middleware Chain
   │
2. Router:
   │   - Extract campaignId, codes, isAuthSupreme
   │   - Call UpdateCodes(codesManager.assignCodes)
   │
3. Manager (`app/managers/codes/assignCodes`):
   │   - Validate: Supreme user required
   │   - Validate: codes is non-empty array
   │   - Call datastore.codes.assignCodes
   │
4. Datastore.codes.assignCodes({ campaignId, codes }):
   │   └─> MongoDB updateMany:
   │       - Match: campaign_id = 12345, code in ["ABC123", "DEF456"]
   │       - Update: Set date.assigned = now
   │   Returns: { modifiedCount }
   │
5. Response: { count: { in: 2, updated: 2 } }
```

### 4. Count Codes Flow
**Endpoint**: `GET /:campaignId/codes/count?type=tm&status=available`

```
1. HTTP GET /v1/12345/codes/count?type=tm&status=available
   │
2. Manager (`app/managers/codes/countCodes`):
   │   - Validate: Supreme user, type valid, status valid (if provided)
   │   - Call findCodesCounts
   │
3. findCodesCounts:
   │   - If status provided: count that status only
   │   - If status omitted: count all statuses (available, reserved, assigned)
   │   - For each status:
   │       Datastore.codes.countCodesByStatus({ campaignId, type, status })
   │         └─> MongoDB count query with status-specific filters
   │   - Return: { available: 50000, reserved: 1000, assigned: 49000 }
   │
4. Response: Status counts object
```

### 5. Release Codes Flow
**Endpoint**: `POST /:campaignId/release { codes: ["ABC123"] }`

```
1. HTTP POST /v1/12345/release { codes: ["ABC123"] }
   │
2. Manager (`app/managers/codes/releaseCodes`):
   │   - Validate: Supreme user, non-empty codes array
   │   - Call datastore.codes.releaseCodes
   │
3. Datastore.codes.releaseCodes({ campaignId, codes }):
   │   └─> MongoDB updateMany:
   │       - Match: campaign_id = 12345, code in ["ABC123"]
   │       - Match: date.assigned doesn't exist (not assigned)
   │       - Match: date.reserved exists (is reserved)
   │       - Update: Unset date.reserved
   │   Returns: { modifiedCount }
   │
4. Response: { count: { in: 1, updated: 1 } }
```

## State Management

### Code Lifecycle States

Codes transition through three states stored in MongoDB:

```
┌────────────────┐
│   AVAILABLE    │  (No reserved date OR reserved date < yesterday)
└───────┬────────┘  (No assigned date)
        │
        │ [Reserve API]
        │ Sets: date.reserved = now, reserveId = UUID
        ▼
┌────────────────┐
│    RESERVED    │  (Reserved date > yesterday)
└───────┬────────┘  (No assigned date)
        │
        ├─────────────────┐
        │                 │
        │ [Auto-expire]   │ [Assign API]
        │ After 24 hours  │ Sets: date.assigned = now
        │                 │
        ▼                 ▼
┌────────────────┐  ┌────────────────┐
│   AVAILABLE    │  │    ASSIGNED    │  (Terminal state)
│   (Released)   │  │                │
└────────────────┘  └────────────────┘
        ▲
        │ [Release API]
        │ Unsets: date.reserved
        │ (Only works on RESERVED codes)
```

**State Queries** (in `app/datastore/codes.js`):
```javascript
STATUS_QUERY = {
  AVAILABLE: () => ({
    $or: [
      { 'date.reserved': { $exists: false } },
      { 'date.reserved': { $lte: yesterday() } }  // Auto-expire after 24 hours
    ],
    'date.assigned': { $exists: false }
  }),
  RESERVED: () => ({
    'date.assigned': { $exists: false },
    'date.reserved': { $gt: yesterday() }
  }),
  ASSIGNED: () => ({ 'date.assigned': { $exists: true } })
};
```

### MongoDB Document Structure

```javascript
{
  _id: {
    campaign_id: "12345",
    code: "ABC123XYZ"
  },
  type: "tm" | "external",  // Code type
  reserveId: "uuid-v4",       // Set when reserved (for finding reserved codes)
  date: {
    saved: Date,              // When uploaded to system
    reserved: Date,           // When reserved (auto-expires after 24 hours)
    assigned: Date            // When assigned to a customer (terminal)
  }
}
```

**Indexes** (likely defined in `app/datastore/mongo/indexMap.js`):
- Compound index on `{ _id.campaign_id, type, date.reserved, date.assigned }` for fast status queries
- Index on `reserveId` for finding reserved codes

## External Integrations

### 1. AWS S3 (Incoming: Code Upload)

| Integration | Direction | Purpose | Details |
|-------------|-----------|---------|---------|
| S3 `scoringBucket` | **Read** | Retrieve uploaded code CSV files | Files uploaded externally to `codes/{campaignId}/{type}/filename.csv`, service reads via stream |

**Data Flow**:
1. External process uploads CSV to S3: `codes/12345/tm/batch-001.csv`
2. Client calls API with fileKey: `POST /v1/12345/codes { fileKey: "codes/12345/tm/batch-001.csv" }`
3. Service streams file from S3 → parses CSV → batches 50k codes → upserts to MongoDB
4. Returns upload statistics

**Configuration**: S3 credentials and bucket name from config (`titan.aws.clients.scoringBucket`)

### 2. MongoDB (Persistent Storage)

| Integration | Direction | Purpose | Details |
|-------------|-----------|---------|---------|
| MongoDB (via `@verifiedfan/mongodb`) | **Read/Write** | Persistent code storage and state management | Collection: `codes`, Operations: find, count, updateMany, bulkWrite |

**Operations**:
- **Read**: Find available codes, count by status, find by reserveId
- **Write**: Upsert codes (bulk), reserve codes, assign codes, release codes
- **Connection**: Instrumented via `app/datastore/mongo/index.js`

### 3. Distributed Tracing (Lightstep)

| Integration | Direction | Purpose | Details |
|-------------|-----------|---------|---------|
| Lightstep (OpenTracing) | **Send** | Distributed request tracing | Traces all requests through middleware chain and async operations |

**Tracing Points**:
- HTTP request start/end
- Datastore operations (via `InstrumentDatastores`)
- Service calls (via `InstrumentServices`)
- Async operations (via `InstrumentedAsyncOperation`)

### 4. Prometheus Metrics

| Integration | Direction | Purpose | Details |
|-------------|-----------|---------|---------|
| Prometheus `/metrics` endpoint | **Pull (by Prometheus)** | Operational metrics collection | HTTP request counts, durations, default Node.js metrics |

**Metrics Exposed**:
- `http_request_count` - Total requests by path, method, status
- `http_response_duration_seconds` - Response time histogram
- Default Node.js metrics: heap, event loop, GC stats

### 5. JWT Authentication

| Integration | Direction | Purpose | Details |
|-------------|-----------|---------|---------|
| JWT token validation (issuer external) | **Validate** | User authentication and authorization | All endpoints (except `/metrics`, `/heartbeat`, `/dev/token`) require valid JWT with `isSupreme` claim |

**Auth Flow**:
1. Client includes JWT in `Authorization: Bearer <token>` header
2. Middleware validates signature and expiration
3. Extracts claims (including `isSupreme` flag)
4. Managers check `isAuthSupreme` for authorization
5. Only supreme users can upload, reserve, count, assign, or release codes

## Observability Data Flow

### Request Correlation

```
Client Request
  ↓ (Generates correlation ID if not present)
Correlation Middleware
  ↓ (Attaches to context)
All Logs, Traces, Metrics tagged with correlation ID
  ↓
Enables request tracing across service boundaries
```

### Logging Flow

```
Application Code: log.info('message', { context })
  ↓
@verifiedfan/log (Structured Logger)
  ↓ (JSON formatted with correlation ID, timestamp, level)
stdout
  ↓ (Captured by Kubernetes)
Centralized Log Aggregation (likely ELK or CloudWatch)
```

### Metrics Flow

```
HTTP Request
  ↓
Prometheus Middleware: requestCounter.inc(), responseDuration.observe()
  ↓
Datastore Operation
  ↓
InstrumentDatastores: Wraps with operation timing/counting
  ↓
Prometheus /metrics endpoint
  ↓ (Scraped by Prometheus server)
Prometheus Time-Series Database
  ↓
Grafana Dashboards / Alerting
```

## Error Propagation Flow

```
Error occurs in: Datastore | Manager | Router
  ↓
Error thrown with domain-specific error factory
  ↓
Error Formatter Middleware catches error
  ↓
Converts to HTTP response:
  - Status code (400, 401, 404, 500)
  - Error message
  - Error code
  ↓
Response sent to client
  ↓
Access Log records error
Prometheus records status code
Distributed trace marks span as error
```

**Error Types**:
- **Auth errors**: `supremeUserRequired` → 401 Unauthorized
- **Validation errors**: `invalidType`, `invalidCount`, `emptyCodes` → 400 Bad Request
- **Not found errors**: (implied) → 404 Not Found
- **System errors**: Unhandled exceptions → 500 Internal Server Error
