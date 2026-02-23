# Architecture Patterns - export-service

## Architecture Style

**Identified Style**: **Layered Monolithic Service** with **Queue-Based Background Processing**

**Evidence**:
- Clear horizontal layers: Router → Manager → Datastore/Service
- Single deployable unit serving REST API endpoints
- Background queue processor running alongside HTTP server (`setInterval(processQueue, queueTimeout)` in `app/index.js:55`)
- Shared datastore and service abstractions across all export types
- Centralized middleware stack (JWT, tracing, Prometheus, error handling)
- All export logic consolidated in single codebase under `app/managers/exports/`

**Hybrid Pattern**: Combines **Layered Architecture** (separation by technical responsibility) with **Async Job Queue Pattern** (long-running export jobs processed in background).

## Design Patterns Used

### 1. Layered Architecture

**Location**: Entire `app/` directory structure

**Implementation**:
- **Router Layer** (`app/router/`): HTTP request handling, parameter extraction, permission checks
- **Manager Layer** (`app/managers/`): Business logic orchestration, domain operations
- **Datastore Layer** (`app/datastore/`): Data access abstraction over MongoDB
- **Service Layer** (`app/services/`): External API/service integration clients

**Example**:
```javascript
// app/router/exports.js - Route handler
router.post('/:campaignId/exports',
  checkPermissions([permissionsEnum.REPORT]),
  withManagedContext((ctx, managerCtx) =>
    reportManager.queueExport(managerCtx, {...})
  )
);

// app/managers/exports/index.js - Business logic
export const queueExport = async(managerCtx, { campaignId, exportType, ... }) => {
  // Validate, check existing queue, create export job
  await exportsDataStore.upsert(exportObj);
};

// app/datastore/exports.js - Data access
const exports = {
  upsert: async definition => {
    await DataStore.upsertOne({ _id: def._id }, { $set: def });
  }
};
```

### 2. Strategy Pattern (Export Type Handlers)

**Location**: `app/managers/exports/index.js:32-48`

**Implementation**: Different export algorithms selected via strategy map based on export type.

**Example**:
```javascript
const exportByType = {
  [EXPORT_TYPE.ENTRIES]: exportEntries,
  [EXPORT_TYPE.CODES]: exportCodes,
  [EXPORT_TYPE.SCORING]: exportEntries,  // Reuses entries strategy
  [EXPORT_TYPE.WAITLIST]: exportWaitlist,
  [EXPORT_TYPE.REMINDER_EMAIL]: exportReminderEmail,
  // ... 14+ export types total
};

// Strategy invoked dynamically
const exportFn = exportByType[exportType];
await exportFn(managerCtx, { rowFormatter, passThroughStream, exportObj });
```

### 3. Repository Pattern (Datastores)

**Location**: `app/datastore/` directory

**Implementation**: Each domain entity has a dedicated datastore module encapsulating MongoDB queries.

**Example**:
```javascript
// app/datastore/exports.js
const exports = {
  findById: DataStore.findByObjectIdStr,
  upsert: async definition => { /* MongoDB upsert */ },
  findWithStatusExportTypeAndDateKey: async({ campaignId, exportType, statuses }) => { /* Query */ },
  findOldest: async({ status }) => { /* Query */ }
};
```

### 4. Queue/Worker Pattern

**Location**: `app/managers/queue/process.js`

**Implementation**:
- Polls database for pending export jobs at regular intervals
- Single-threaded queue processor prevents race conditions
- State machine: PENDING → TRIGGERED → FINISHED/FAILED/EXPIRED

**Example**:
```javascript
// app/index.js:55
setInterval(processQueue, queueTimeout);

// app/managers/queue/process.js:76-108
const ProcessQueue = managerCtx => async() => {
  // Check for already-running job
  const triggered = await exportsDatastore.findOldest({ status: STATUS.TRIGGERED });
  if (triggered) { await expireIfNecessary(managerCtx, { exportObj: triggered }); return; }

  // Pick up next pending job
  const pending = await exportsDatastore.findOldest({ status: STATUS.PENDING });
  if (!pending) return;

  // Process job
  await markAsTriggered(managerCtx, { exportObj: pending });
  const { key, count } = await exportAndSave(managerCtx, exportObj);
  await markAsFinished(managerCtx, { exportObj, key });
};
```

### 5. Dependency Injection

**Location**: `lib/KoaCtxToManagerCtx.js`, `app/router/exports.js:10`

**Implementation**: Manager context (`managerCtx`) injected with datastore and service dependencies.

**Example**:
```javascript
// lib/KoaCtxToManagerCtx.js
const koaCtxToManagerCtx = KoaCtxToManagerCtx({ Datastore, Services });

// Router injects dependencies
const withManagedContext = handler => ctx => handler(ctx, koaCtxToManagerCtx({ ctx }));
```

### 6. Stream Processing

**Location**: `app/managers/exports/index.js:175-194`, `app/managers/exports/exportEntries.js`

**Implementation**: CSV data streamed to S3 to avoid loading large datasets in memory.

**Example**:
```javascript
// app/managers/exports/index.js:175
const passThroughStream = new stream.PassThrough();

await Promise.all([
  // Upload stream to S3 concurrently with data generation
  managerCtx.service[bucketType].uploadFromStream({ passThroughStream, ... }),
  exportFn(managerCtx, { rowFormatter, passThroughStream, exportObj })
]);

passThroughStream.end();
```

### 7. Middleware Chain Pattern

**Location**: `app/index.js:40-53`

**Implementation**: Koa middleware pipeline for cross-cutting concerns.

**Example**:
```javascript
app.use(compress());
app.use(tracing.unless({ path: ['/metrics', '/heartbeat'] }));
app.use(bodyParser());
app.use(prometheus.responseDuration);
app.use(prometheus.requestCounter);
app.use(correlation);
app.use(accessLog);
app.use(errorFormatter);
app.use(jwt.unless({ path: ['/metrics', '/heartbeat', '/dev/token'] }));
app.use(router.routes());
```

### 8. Factory Pattern (RowFormatter)

**Location**: `lib/RowFormatter/index.js`

**Implementation**: Creates type-specific CSV formatters based on export type.

**Example**:
```javascript
const rowFormatter = RowFormatter({ type: exportType });
const fileExt = rowFormatter.fileExtension;
await writer.write({ user, entry, campaign, market });
```

## Layer Separation

**Clear boundaries enforced between layers:**

1. **Presentation Layer** (`app/router/`):
   - HTTP request/response handling
   - Parameter extraction/validation
   - Permission checks
   - Does NOT contain business logic

2. **Business Logic Layer** (`app/managers/`):
   - Domain rules and validation
   - Orchestration of datastores and services
   - Export job state management
   - Does NOT handle HTTP concerns

3. **Data Access Layer** (`app/datastore/`):
   - MongoDB query encapsulation
   - Data transformation (normalize, format)
   - Does NOT contain business rules

4. **Integration Layer** (`app/services/`):
   - External API clients (S3, Athena, SFMC)
   - Request/response formatting for external services
   - Does NOT contain domain logic

5. **Infrastructure Layer** (`lib/middlewares/`):
   - Cross-cutting concerns (logging, tracing, auth)
   - Applies globally via middleware chain

## Dependency Direction

**Strict unidirectional flow** (no circular dependencies):

```
Router → Manager → Datastore
                ↘ Service → External APIs

lib/middlewares → Routers (via Koa chain)
lib/RowFormatter → Managers (via factory)
```

**Key observations**:
- Managers depend on Datastores and Services (injected via context)
- Routers depend on Managers (via imports)
- Datastores and Services have NO dependencies on upper layers
- Shared lib code consumed by all layers but doesn't depend on them

## Deviations & Tech Debt

### 1. Polling-Based Queue

**Issue**: Queue processing uses polling (`setInterval`) rather than event-driven architecture.

**Impact**:
- Inefficient - polls database every `pollingInterval` (default 1000ms) even when queue empty
- Can miss jobs if interval too long
- No horizontal scaling - only one instance can process queue safely

**Evidence**: `app/index.js:55` - `setInterval(processQueue, queueTimeout)`

**Better Approach**: SQS/SNS event-driven queue, or MongoDB change streams.

### 2. Mixed Export Processing Models

**Issue**: Some export types use streaming (`exportEntries`), others write to disk then zip (`exportReminderEmail`), creating inconsistent patterns.

**Evidence**:
- Streaming: `app/managers/exports/exportEntries.js` (PassThrough stream)
- Disk-based: `app/managers/exports/exportReminderEmail/writeReminderEmailDataToDisk.js`

**Impact**:
- More complex to understand/maintain
- Disk-based exports risk running out of disk space
- Inconsistent error handling

### 3. Global Queue Processing Without Concurrency Control

**Issue**: Queue processor runs globally (`setInterval` in main app file), but lacks distributed lock for multi-instance deployments.

**Evidence**: `app/managers/queue/process.js:80-84` checks for triggered exports but relies on timing, not locks.

**Risk**: If multiple instances deployed, race conditions could cause duplicate processing.

### 4. Large Monolithic Manager Module

**Issue**: `app/managers/exports/index.js` contains 196 lines mixing multiple responsibilities (queueing, processing, S3 upload, status management).

**Impact**:
- Difficult to test in isolation
- High cognitive load
- Changes in one area risk breaking others

**Better Approach**: Split into separate modules (QueueManager, ExportProcessor, StatusManager).

### 5. Config Management

**Issue**: Configuration loaded via Immutable.js Map (`config.getIn(...)`) throughout codebase, but no type safety.

**Evidence**: `lib/config.js` usage in `app/index.js`, `app/managers/queue/process.js`, etc.

**Risk**: Typos in config paths cause runtime errors, no compile-time validation.

## Architecture Strengths

1. **Clear separation of concerns** - each layer has well-defined responsibility
2. **Testable** - dependency injection enables unit testing of managers
3. **Extensible export types** - strategy pattern makes adding new export types straightforward
4. **Comprehensive observability** - Prometheus metrics, distributed tracing, structured logging
5. **Stream processing** - efficient handling of large datasets without memory bloat
