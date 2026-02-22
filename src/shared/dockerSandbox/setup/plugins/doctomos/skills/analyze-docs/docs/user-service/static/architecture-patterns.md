# Architecture Patterns - user-service

## Architecture Style

**Identified Style**: **Layered Monolith with Service-Oriented Integration**

**Evidence**:
- Clear separation into **Router → Manager → Datastore** layers (3-tier architecture)
- Single deployable unit running as a Koa web service (monolithic deployment)
- Service layer (`app/services/`) for external integrations (service-oriented approach)
- No domain/infrastructure separation (not Clean Architecture or Hexagonal)
- Shared middleware stack and single HTTP server (not microservices)
- Feature-based organization within layers (users, permissions, workers)

**Why this style fits**:
- User authentication and management is centralized and benefits from tight coupling
- MongoDB datastore accessed directly through dedicated layer
- External dependencies abstracted through service layer
- Middleware-based request processing (Koa framework pattern)

## Design Patterns Used

### 1. Layered Architecture (3-Tier)

**Location**: Throughout `app/` directory

**Implementation**:
```
┌──────────────────────┐
│   Router Layer       │ ← HTTP endpoints (app/router/)
└──────────────────────┘
          ↓
┌──────────────────────┐
│   Manager Layer      │ ← Business logic (app/managers/)
└──────────────────────┘
          ↓
┌──────────────────────┐
│  Datastore Layer     │ ← Data access (app/datastore/)
└──────────────────────┘
```

**Example**:
- `app/router/users.js` - Routes HTTP requests
- `app/managers/users/index.js` - Handles authentication, validation, orchestration
- `app/datastore/users.js` - MongoDB CRUD operations

**Benefits**: Clear separation of concerns, easy to test layers independently

### 2. Repository Pattern

**Location**: `app/datastore/` directory

**Implementation**: Each entity has a dedicated datastore module that encapsulates all database operations

**Example**: `app/datastore/users.js`
```javascript
// Provides interface for user data operations
DataStore.findById({ userId })
DataStore.upsertWithTM({ tmUser, codes })
DataStore.updateContact({ type, account, user })
```

**Benefits**: Abstracts MongoDB operations, centralizes query logic, enables easier testing

### 3. Manager/Service Pattern

**Location**: `app/managers/` directory

**Implementation**: Business logic modules orchestrate multiple datastore operations and external service calls

**Example**: `app/managers/users/index.js::authenticate()`
- Calls Ticketmaster API to validate token
- Upserts user data
- Checks permissions
- Generates JWT token
- Returns authenticated user

**Benefits**: Keeps business logic separate from HTTP and data layers

### 4. Middleware Chain (Chain of Responsibility)

**Location**: `app/index.js` and `lib/middlewares/`

**Implementation**: Koa middleware stack processes requests through sequential middleware functions

**Example**:
```javascript
app.use(compress());
app.use(tracing.unless({ path: ['/metrics', '/heartbeat'] }));
app.use(bodyParser());
app.use(prometheus.responseDuration);
app.use(correlation);
app.use(accessLog);
app.use(errorFormatter);
app.use(jwt.unless({ path: ['/metrics', '/heartbeat', '/dev/token', '/auth'] }));
app.use(router.routes());
```

**Order of execution**:
1. Compression
2. Tracing/telemetry
3. Body parsing
4. Prometheus metrics
5. Correlation ID injection
6. Access logging
7. Error formatting
8. JWT authentication
9. Route handling

**Benefits**: Separation of cross-cutting concerns, configurable request processing

### 5. Facade Pattern

**Location**: `app/services/index.js`

**Implementation**: Aggregates external service clients and provides instrumentation wrapper

**Example**:
```javascript
// Wraps multiple service clients with instrumentation
const services = {
  entries,
  exports,
  slas,
  tmAccountsV2,
  campaignDataStream,
  facebook
};
```

**Benefits**: Unified interface for external services, centralized monitoring

### 6. Context Object Pattern

**Location**: `app/koaCtxToManagerCtx.js`

**Implementation**: Transforms Koa HTTP context into manager-layer context object

**Purpose**:
- Decouples HTTP layer from business logic layer
- Provides managers with datastore and service dependencies
- Enables testing without HTTP context

**Example**:
```javascript
// Transforms: ctx (Koa HTTP context) → managerCtx (business layer context)
const managerCtx = koaCtxToManagerCtx({ ctx });
// managerCtx contains: { datastore, service, log, ... }
```

### 7. Instrumentation Wrapper Pattern

**Location**: `app/datastore/InstrumentDatastores.js`, `app/services/InstrumentServices.js`

**Implementation**: Wraps datastores and services with monitoring/metrics

**Benefits**: Centralized observability, consistent telemetry across all operations

## Layer Separation

### Clear Boundaries

| Layer | Responsibility | Dependencies |
|-------|----------------|--------------|
| **Router** | HTTP routing, request/response handling | Managers, Middlewares |
| **Manager** | Business logic, orchestration, validation | Datastore, Services |
| **Datastore** | MongoDB operations, query building | MongoDB driver |
| **Services** | External API integration | HTTP clients, SDKs |
| **Lib** | Shared utilities, middleware, config | None (infrastructure) |

### Communication Flow

```
HTTP Request
    ↓
Middleware Stack (auth, validation, logging)
    ↓
Router (route matching)
    ↓
Manager (business logic)
    ↓
Datastore ← → MongoDB
    ↓
Manager (orchestration)
    ↓
Services → External APIs
    ↓
Response Formatter
    ↓
HTTP Response
```

## Dependency Direction

**Clean dependency flow** (mostly adhered to):
- ✅ Router depends on Managers (correct)
- ✅ Managers depend on Datastore and Services (correct)
- ✅ Datastore has no business logic (correct)
- ✅ Lib is independently usable (correct)

**Minor violations**:
- Managers import from `@verifiedfan/lib` (shared library - acceptable)
- Some datastore logic includes business rules (e.g., contact validation could be in manager layer)

## Cross-Cutting Concerns

Handled via middleware and shared utilities:

| Concern | Implementation | Location |
|---------|----------------|----------|
| **Authentication** | JWT middleware | `lib/middlewares/jwt.js` |
| **Authorization** | Permission checks in managers | `app/managers/permissions/` |
| **Logging** | Access log middleware + Log utility | `lib/middlewares/accessLog.js`, `lib/Log.js` |
| **Error Handling** | Error formatter middleware | `lib/middlewares/errorFormatter.js` |
| **Metrics** | Prometheus middleware | `lib/middlewares/prometheus/` |
| **Tracing** | OpenTelemetry tracing middleware | `lib/middlewares/telemetry.js` |
| **Request Correlation** | Correlation ID middleware | `lib/middlewares/correlation.js` |
| **Response Formatting** | Response formatter middleware | `lib/middlewares/responseFormatter.js` |

## Deviations & Tech Debt

### Positive Aspects
- Clear layered structure makes codebase navigable
- Consistent use of async/await for asynchronous operations
- Comprehensive BDD test coverage with Cucumber
- Instrumentation wrapper pattern provides observability

### Areas for Improvement

1. **Mixed Concerns in Datastore Layer**
   - Some business logic leaks into datastore (e.g., contact validation)
   - Consider moving validation to manager layer

2. **Tight Coupling to MongoDB**
   - Direct use of MongoDB operations throughout datastore
   - No abstraction layer for database switching
   - Mitigation: Repository pattern partially addresses this

3. **Manager Layer Complexity**
   - `managers/users/index.js` handles multiple responsibilities (auth, updates, lookups)
   - Could benefit from further decomposition into focused modules

4. **Configuration Management**
   - Config loaded globally, hard to mock for testing
   - Consider dependency injection for config

5. **Error Handling Consistency**
   - Mix of error patterns (thrown errors, returned errors)
   - Some functions return boolean, others throw
   - Standardize error handling approach

6. **ESLint Disables**
   - Multiple `eslint-disable` comments throughout code
   - Indicates code quality rules being bypassed
   - Should address root causes rather than disable rules

## Testing Strategy

**BDD with Cucumber**:
- Feature files in Gherkin syntax (`features/scenarios/*.feature`)
- Step definitions implement test steps
- World object provides shared test context
- API client for integration testing

**Unit Tests**:
- Co-located `*.spec.js` files
- Uses Chai assertion library
- Jest test runner (modern setup)
