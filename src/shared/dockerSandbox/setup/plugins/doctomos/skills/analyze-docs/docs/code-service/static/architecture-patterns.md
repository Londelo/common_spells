# Architecture Patterns - code-service

## Architecture Style

**Identified Style**: **Layered Architecture + Service-Oriented (REST API)**

**Evidence**:
- **Clear layer separation** in directory structure: `router/` (presentation) → `managers/` (business logic) → `datastore/` (data access) → `services/` (external integrations)
- **Dependency direction flows downward** - routers depend on managers, managers depend on datastores/services, but not vice versa
- **Context adapter pattern** (`KoaCtxToManagerCtx`) explicitly isolates framework code from business logic
- **RESTful HTTP API** - service exposes HTTP endpoints for code management operations
- **Middleware chain** in `app/index.js` shows classic layered web service pattern: compression → tracing → parsing → metrics → correlation → logging → error handling → auth → routing

**Why this style**:
This is a REST API microservice focused on managing promotional codes. The layered architecture provides:
- **Clear boundaries** between HTTP concerns and business logic
- **Testability** - managers can be tested without HTTP framework
- **Maintainability** - changes to one layer don't cascade
- **Observability** - middleware chain provides metrics, tracing, logging at infrastructure level

## Design Patterns Used

### 1. Context Adapter Pattern
**Location**: `lib/KoaCtxToManagerCtx.js`

**Implementation**: Transforms Koa framework context into a clean manager context:
```javascript
// Adapts from Koa-specific context to domain context
const koaCtxToManagerCtx = KoaCtxToManagerCtx({ Datastore, Services });
const managerCtx = koaCtxToManagerCtx({ ctx }); // Returns: { datastore, service, correlation, ... }
```

**Purpose**: Decouples business logic from web framework, making managers framework-agnostic and easier to test.

### 2. Factory Pattern
**Location**:
- `lib/Router/index.js` - Router factory
- `app/managers/codes/index.js` - Manager operations as factories
- `app/datastore/mongo/index.js` - Collection factory

**Implementation**:
```javascript
// Router factory accepts configuration
const Router = ({ devEndpoints }) => {
  const router = new _Router();
  // ... configure routes based on options
  return router;
};

// Manager factory creates configured operations
const UpdateCodes = updateFnName => async(managerCtx, { ... }) => {
  // ... implementation
};
export const assignCodes = UpdateCodes('assignCodes');
export const releaseCodes = UpdateCodes('releaseCodes');
```

**Purpose**: Enables configuration-based instantiation and reduces duplication.

### 3. Repository Pattern
**Location**: `app/datastore/codes.js`

**Implementation**: Data access abstraction over MongoDB:
```javascript
export default {
  findAvailableCodes: async({ campaignId, count, type }) => { ... },
  countCodesByStatus: async({ campaignId, type, status }) => { ... },
  assignCodes: async({ campaignId, codes }) => { ... },
  releaseCodes: async({ campaignId, codes }) => { ... },
  reserveCodes: async({ codeIds, reserveId }) => { ... },
  upsertCodes: async({ campaignId, type, codes }) => { ... }
};
```

**Purpose**: Encapsulates data access logic, provides clean API for data operations, enables testing with mock repositories.

### 4. Middleware Chain (Pipeline Pattern)
**Location**: `app/index.js`

**Implementation**: Sequential middleware processing:
```javascript
app.use(compress());
app.use(tracing.unless({ path: ['/metrics', '/heartbeat'] }));
app.use(bodyParser());
app.use(prometheus.responseDuration);
app.use(prometheus.requestCounter);
app.use(context);
app.use(correlation);
app.use(accessLog);
app.use(errorFormatter);
app.use(path);
app.use(responseFormatter.unless({ path: ['/metrics', '/heartbeat'] }));
app.use(jwt.unless({ path: ['/metrics', '/heartbeat', '/dev/token'] }));
app.use(router.routes());
```

**Purpose**: Separates cross-cutting concerns (auth, logging, tracing, metrics) from business logic. Each middleware can short-circuit the chain or pass through.

### 5. Dependency Injection
**Location**:
- `app/router/index.js` - Router receives `Datastore` and `Services` dependencies
- `KoaCtxToManagerCtx` - Factory receives dependencies and creates context adapter

**Implementation**:
```javascript
const koaCtxToManagerCtx = KoaCtxToManagerCtx({ Datastore, Services });
// Later used in routes:
const managerCtx = koaCtxToManagerCtx({ ctx });
return codesManager.uploadCodes(managerCtx, { fileKey, isAuthSupreme });
```

**Purpose**: Makes dependencies explicit, enables testing with mocks, reduces tight coupling.

### 6. Stream Processing (Pipeline)
**Location**: `app/managers/codes/readAndStoreCodes.js`

**Implementation**: CSV file processing via Node.js streams:
```javascript
s3ReadStream
  .pipe(parseCSV(parseOptions))     // Parse CSV rows
  .pipe(batchTransformStream)       // Batch into chunks of 50,000
  .on('finish', () => resolve(...)) // Complete processing
```

**Purpose**: Memory-efficient processing of large CSV files (potentially millions of codes) without loading entire file into memory.

### 7. Instrumentation/Decorator Pattern
**Location**:
- `app/datastore/InstrumentDatastores.js`
- `app/services/InstrumentServices.js`
- `lib/InstrumentedAsyncOperation.js`

**Implementation**: Wraps datastores and services with observability (likely metrics/tracing):
```javascript
const datastores = { codes };
export default InstrumentDatastores({ datastores });

const sdkBasedServices = { scoringBucket };
export default InstrumentServices({ requestBasedServices, sdkBasedServices });
```

**Purpose**: Transparently adds tracing and metrics to all datastore/service operations without modifying business logic.

### 8. Higher-Order Function Pattern
**Location**: `app/managers/codes/index.js`

**Implementation**:
```javascript
// Generic update function generator
const UpdateCodes = updateFnName => async(managerCtx, { isAuthSupreme, campaignId, codes }) => {
  // ... shared validation logic
  return { count: await managerCtx.datastore.codes[updateFnName]({ campaignId, codes }) };
};

// Specific operations created from generic function
export const assignCodes = UpdateCodes('assignCodes');
export const releaseCodes = UpdateCodes('releaseCodes');
```

**Purpose**: Eliminates duplication for similar operations (assign vs. release both follow same validation pattern but call different datastore methods).

## Layer Separation

### Clean Separation via Context Adapter
The architecture maintains strict separation between layers:

**Presentation Layer** (`router/`)
- Handles HTTP concerns: request parsing, response formatting
- Extracts parameters from request
- Delegates to managers

**Business Logic Layer** (`managers/`)
- Receives framework-agnostic context
- Enforces business rules (auth checks, validation)
- Orchestrates datastore and service calls
- Returns plain data structures

**Data Access Layer** (`datastore/`)
- MongoDB query construction
- Data transformation
- No knowledge of HTTP or business rules

**Infrastructure Layer** (`lib/middlewares/`)
- Cross-cutting concerns: auth, logging, tracing, metrics
- Applied consistently across all routes

### Boundary Enforcement
- **No direct Koa context in managers** - `KoaCtxToManagerCtx` adapter enforces this
- **Managers return data, not HTTP responses** - response formatting happens in middleware
- **Datastores don't throw HTTP errors** - domain errors converted by error formatter middleware

## Dependency Direction

**Clean downward flow** (higher-level modules depend on lower-level):

```
┌─────────────────────────────────────────┐
│  app/index.js (Koa Bootstrap)          │
└─────────────────┬───────────────────────┘
                  │
                  v
┌─────────────────────────────────────────┐
│  lib/middlewares/* (Cross-cutting)     │  ← Authentication, Logging, Tracing
└─────────────────┬───────────────────────┘
                  │
                  v
┌─────────────────────────────────────────┐
│  app/router/index.js (Routes)          │  ← HTTP endpoint definitions
└─────────────────┬───────────────────────┘
                  │
                  v (via KoaCtxToManagerCtx adapter)
┌─────────────────────────────────────────┐
│  app/managers/codes/* (Business Logic) │  ← Domain rules, orchestration
└─────────┬───────────────┬───────────────┘
          │               │
          v               v
┌────────────────┐  ┌────────────────────┐
│  app/datastore │  │  app/services/s3   │  ← Data access & external services
│  /codes.js     │  │  /index.js         │
└────────────────┘  └────────────────────┘
```

**No upward dependencies** - datastores don't import from managers, managers don't import from routers.

**Shared utilities** (`lib/config`, `lib/Log`, `lib/error`) are leaf dependencies used by all layers.

## Code Quality Patterns

### 1. Error Handling
- **Domain-specific errors** defined in `app/managers/codes/errors.js`
- **Error factory** in `lib/error/index.js` for consistent error creation
- **Error formatter middleware** converts errors to HTTP responses
- **No silent failures** - all errors thrown explicitly

### 2. Configuration Management
- **Environment-based config** loaded from `configs/` directory
- **Immutable config** (likely using Immutable.js based on `.toJS()` calls)
- **Type-safe access** via `config.getIn(['path', 'to', 'value'], defaultValue)`

### 3. Observability Built-in
- **Distributed tracing** via Lightstep (OpenTracing)
- **Prometheus metrics** exported at `/metrics`
- **Correlation IDs** for request tracking across services
- **Structured logging** via `@verifiedfan/log`
- **Access logs** for all HTTP requests

### 4. Validation
- **Input validation** at manager level (not just HTTP level)
- **Type validation** using enums (`typeSet`, `statusSet`)
- **Business rule enforcement** before data operations

## Deviations & Tech Debt

### 1. Mixed Concerns in Router
The router file (`app/router/index.js`) contains both:
- Route definitions (good)
- Parameter extraction logic using Ramda selectors (couples routing to data structure)

**Better approach**: Parameter extraction could move to middleware or be encapsulated in request objects.

### 2. Global State in `app/index.js`
The main entry point immediately starts the server:
```javascript
app.listen(port, () => { log.info('service started', { port, dnsCacheTTL }); });
```

**Issue**: Makes testing the full app difficult (server starts on import).

**Better approach**: Export the configured app separately from starting the server, enabling integration tests.

### 3. Implicit Datastore/Service Instrumentation
`InstrumentDatastores` and `InstrumentServices` wrap operations, but:
- Not clear what instrumentation is added (need to read implementation)
- Could be made explicit via decorators or documented interfaces

### 4. Mixed Module Systems
Uses ES6 imports (`import`/`export`) but some tooling files use CommonJS (`require`).

**Consistency would improve maintainability.**

### 5. Shared Enums
`app/managers/codes/enums.js` exports both to managers AND datastore layer.

**Minor coupling** - datastore knows about business-level statuses. Could be addressed with separate datastore enums mapped from business enums.
