# Data Flow - export-service

## Primary Flow

The export-service supports two concurrent flows:
1. **Synchronous HTTP API** - Queue export jobs, retrieve status/results
2. **Asynchronous Queue Processor** - Background job execution

Both flows interact with the same MongoDB datastore and S3 storage.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYNCHRONOUS FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

User/Client
    │
    │ POST /campaigns/:campaignId/exports
    ↓
[Koa Middleware Chain]
    │ - JWT Authentication
    │ - Tracing
    │ - Prometheus Metrics
    │ - Correlation ID
    │ - Access Logging
    ↓
[Router Layer]
    │ app/router/exports.js
    │ - Extract params (campaignId, exportType, dateKey)
    │ - Check permissions (REPORT)
    ↓
[Manager Layer]
    │ app/managers/exports/index.js::queueExport
    │ - Validate export type
    │ - Check campaign exists
    │ - Look for existing queued export (avoid duplicates)
    │ - Create export job object (status: PENDING)
    ↓
[Datastore Layer]
    │ app/datastore/exports.js::upsert
    ↓
MongoDB
    │ - Store export job record
    ↓
Response to Client
    │ { id, exportType, campaignId, status: "PENDING", ... }


┌─────────────────────────────────────────────────────────────────────┐
│                       ASYNCHRONOUS FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

[Queue Processor]
    │ app/managers/queue/process.js
    │ Triggered every `pollingInterval` ms (default: 1000ms)
    ↓
MongoDB Query
    │ - Find oldest TRIGGERED export (check if already processing)
    │   - If found: Check timeout → Mark EXPIRED if needed
    │   - If not found: Find oldest PENDING export
    ↓
[Status: PENDING → TRIGGERED]
    │ - Update export status to TRIGGERED
    │ - Add triggered timestamp
    │ - Fetch preliminary count (entries in campaign)
    │ - Store count in export record
    ↓
[Export Generation]
    │ app/managers/exports/index.js::exportAndSave
    │ - Select export strategy based on exportType
    │ - Create PassThrough stream (for streaming exports)
    │ - Create RowFormatter (CSV formatting logic)
    ↓
[Concurrent Processes]
    ┌─────────────────────────┐     ┌────────────────────────┐
    │ S3 Upload Stream        │     │ Data Generation        │
    │ service.uploadFromStream│     │ exportFn(managerCtx)   │
    │ - Consumes stream       │ ←─── │ - Writes to stream     │
    │ - Uploads to S3 bucket  │     │ - Formats CSV rows     │
    └─────────────────────────┘     └────────────────────────┘
                │                              │
                │                              ↓
                │                    [Query Data Sources]
                │                    - Datastore (MongoDB):
                │                      * campaigns
                │                      * markets
                │                      * entries
                │                      * users
                │                    - External Services:
                │                      * Athena (scoring data)
                │                      * Code Service API
                │                      * SFMC (email data)
                │                              │
                ↓                              ↓
             [S3 Bucket]            [Stream Processing]
        (exportsS3/scoringS3)       - CsvWriter formats rows
                                    - Writes to PassThrough stream
                                    - Counted and tracked
                │                              │
                └──────────────────────────────┘
                              ↓
                     [Completion]
                     - Final row count
                     - S3 key (file location)
                              ↓
              [Status: TRIGGERED → FINISHED]
              - Update export status
              - Store S3 key
              - Store final count
              - Add finished timestamp
                              ↓
                          MongoDB
```

## Request/Response Cycle (HTTP API)

### POST /campaigns/:campaignId/exports - Queue Export

**Request Flow:**
1. **Client** → HTTP POST with body `{ exportType: 'entries', dateKey: '2024-01-01' }`
2. **Middleware Pipeline** (app/index.js:40-53):
   - `tracing`: Start distributed trace span
   - `bodyParser`: Parse JSON body
   - `prometheus`: Record request metrics
   - `context`: Add request context
   - `correlation`: Generate/extract correlation ID
   - `accessLog`: Log request
   - `jwt`: Validate JWT token, extract user claims
3. **Router** (app/router/exports.js:37-53):
   - `checkPermissions([REPORT])`: Verify user has REPORT permission
   - `withManagedContext`: Inject datastore/service dependencies
   - Extract params: `campaignId`, `exportType`, `dateKey`, `includeAllMarkets`
4. **Manager** (app/managers/exports/index.js:108-156):
   - Validate `exportType` exists in `exportByType` map
   - Call `throwIfInvalid` for export-specific validation
   - Look up campaign in MongoDB
   - Check for existing PENDING/TRIGGERED exports (avoid duplicates)
   - Create export job object (status: PENDING)
   - Upsert to MongoDB
5. **Response**:
   ```json
   {
     "id": "507f1f77bcf86cd799439011",
     "exportType": "entries",
     "campaignId": "123456",
     "status": "PENDING",
     "date": { "created": "2024-01-01T10:00:00Z" }
   }
   ```

### GET /campaigns/:campaignId/exports/:exportId - Get Export Status

**Request Flow:**
1. **Client** → HTTP GET
2. **Middleware Pipeline** (same as above)
3. **Router** (app/router/exports.js:55-66):
   - Extract `campaignId` and `exportId`
4. **Manager** (app/managers/exports/index.js:69-79):
   - Query MongoDB for export by ID and campaignId
   - Normalize export object (add S3 presigned URL if FINISHED)
5. **Response** (status: FINISHED):
   ```json
   {
     "id": "507f1f77bcf86cd799439011",
     "exportType": "entries",
     "campaignId": "123456",
     "status": "FINISHED",
     "count": 15000,
     "date": {
       "created": "2024-01-01T10:00:00Z",
       "triggered": "2024-01-01T10:00:05Z",
       "finished": "2024-01-01T10:02:30Z"
     },
     "url": "https://s3.amazonaws.com/exports/...?presignedUrl",
     "key": "campaigns/campaign-name-123456-20240101.csv"
   }
   ```

### GET /campaigns/:campaignId/exports - List Exports

**Request Flow:**
1. **Client** → HTTP GET with query params `?exportType=entries&sortBy=date&sortDesc=true&limit=10&page=0`
2. **Middleware Pipeline** (same as above)
3. **Router** (app/router/exports.js:68-83):
   - Extract `campaignId` from path
   - Map query params (exportType, sort, paging)
4. **Manager** (app/managers/exports/index.js:50-67):
   - Verify campaign exists
   - Query MongoDB for exports by campaignId + exportType (optional filter)
   - Sort by date descending
   - Normalize each export (add presigned URLs)
5. **Response**:
   ```json
   [
     { "id": "...", "status": "FINISHED", "url": "...", ... },
     { "id": "...", "status": "PENDING", ... }
   ]
   ```

## Queue Processing Lifecycle

**State Machine:**
```
PENDING → TRIGGERED → FINISHED
                   ↘ FAILED
                   ↘ EXPIRED (if timeout exceeded)
```

**Processing Steps:**

1. **Poll for Work** (every `pollingInterval` ms):
   - Query: Find oldest export with `status: TRIGGERED`
   - If found: Check if `date.triggered` > `timeoutMillis` → Mark EXPIRED and return
   - If not found: Query for oldest export with `status: PENDING`
   - If no pending: Return (idle)

2. **Mark as Triggered**:
   - Update export status: `PENDING → TRIGGERED`
   - Add `date.triggered: new Date()`
   - Fetch preliminary count from `entries.countByCampaign()`
   - Store count in export record

3. **Generate Export Data**:
   - Select export function from `exportByType[exportType]` strategy map
   - Create `RowFormatter` for CSV formatting
   - Create `PassThrough` stream for piping data to S3
   - Resolve S3 bucket type (`exportsS3`, `scoringS3`, `vfScoringS3`, `sfmcS3`)
   - **Concurrently**:
     - Start S3 upload from stream
     - Execute export function (queries data, formats rows, writes to stream)

4. **Export Function Execution** (example: `exportEntries`):
   - Query `campaigns.findById(campaignId)`
   - Query `markets.findByCampaign(campaignId)` → Get all markets
   - **For each market** (serial):
     - Query `entries.findUserEntries({ campaignId, marketId })` → Cursor/stream
     - **For each entry** (streaming):
       - Format row via `rowFormatter.format({ user, entry, campaign, market })`
       - Write row to CSV via `CsvWriter.write()`
       - If `useAdditionalMarketRows`: Write extra rows for other markets user entered
   - Close CSV writer
   - Return final row count

5. **Mark as Finished**:
   - Update export status: `TRIGGERED → FINISHED`
   - Store S3 key (file location)
   - Store final count
   - Add `date.finished: new Date()`

6. **Error Handling** (on exception):
   - Catch error in `try/catch` block
   - Update export status: `TRIGGERED → FAILED`
   - Store error details: `{ message, status, payload, stack }`
   - Log error with full context

## State Management

**Export Job Status:**
- Stored in MongoDB `exports` collection
- Status field: `PENDING | TRIGGERED | FINISHED | FAILED | EXPIRED`
- Timestamps: `date.created`, `date.triggered`, `date.finished`
- Metadata: `count`, `key` (S3), `error` (if failed)

**Queue Coordination:**
- **Single-threaded processing**: Only one export processed at a time
- **Mutual exclusion**: Checks for TRIGGERED exports before picking PENDING
- **Timeout mechanism**: Expires stuck TRIGGERED exports after `timeoutMillis`
- **Idempotency**: Duplicate queue requests return existing PENDING/TRIGGERED export

**No in-memory state** - all state persisted in MongoDB, enabling process restarts without losing jobs.

## External Integrations

| Integration | Direction | Purpose | Location |
|-------------|-----------|---------|----------|
| **MongoDB** | Read/Write | Primary datastore for campaigns, entries, markets, users, exports, scoring | `app/datastore/mongo/` |
| **AWS S3** | Write | Store generated CSV/ZIP export files | `app/services/exportsS3/`, `scoringS3/`, `vfScoringS3/`, `sfmc/` |
| **AWS Athena** | Read | Query scoring data for verified entries exports | `app/services/athena/` |
| **Code Service API** | Read | Fetch code data for code exports | `app/services/codes/` |
| **Entry Service API** | Read | Fetch entry data (alternative to MongoDB) | `app/services/entries/` |
| **Salesforce Marketing Cloud** | Write | Upload auto-reminder email data | `app/services/sfmc/` |
| **Prometheus** | Write | Export metrics (request count, duration, export counts) | `lib/middlewares/prometheus/` |
| **OpenTelemetry** | Write | Distributed tracing spans | `lib/middlewares/telemetry.js` |

## Data Sources by Export Type

| Export Type | Data Sources |
|-------------|--------------|
| **entries** | MongoDB: campaigns, markets, entries, users |
| **codes** | MongoDB: campaigns + Code Service API |
| **scoring** | MongoDB: campaigns, markets, entries, users + Athena (scoring data) |
| **codeAssignments** | MongoDB: campaigns, entries + Code Service API |
| **artistOptIn** | MongoDB: campaigns, markets, entries (filtered by opt-in flag) |
| **verifiedEntries** | Athena: scoring data (bypass MongoDB for verified-only) |
| **codeWaves** | MongoDB: campaigns + Code Service API (wave data) |
| **fanlist** | MongoDB: campaigns, markets, entries (aggregated by user) |
| **waitlist** | MongoDB: campaigns, markets, entries (waitlist-specific fields) |
| **reminderEmail** | MongoDB: campaigns, markets, entries, events (email template data) |
| **autoReminderEmail** | MongoDB: campaigns, entries + SFMC upload |
| **promoterEmailOptIn** | MongoDB: campaigns, promoters, markets, entries (opt-in filtered) |

## Performance Characteristics

**Streaming Exports:**
- Memory-efficient: Constant memory usage regardless of dataset size
- Concurrent S3 upload and data generation
- Row count tracked incrementally

**Non-Streaming Exports:**
- Write to disk first (e.g., reminder emails)
- Zip multiple files
- Upload ZIP to S3
- Higher memory/disk usage for large exports

**Preliminary Count:**
- Fetched at TRIGGERED state for progress tracking
- May differ from final count due to filtering
- Disabled for certain export types (`isPreliminaryCountDisabled`)

**Queue Throughput:**
- Single-threaded: One export at a time
- Polling interval: 1000ms default (configurable)
- Bottleneck: Long-running exports block queue
- No horizontal scaling support (single queue processor)
