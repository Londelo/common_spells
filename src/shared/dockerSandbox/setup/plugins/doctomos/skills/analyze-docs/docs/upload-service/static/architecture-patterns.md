# Architecture Patterns - upload-service

## Architecture Style

**Identified Style**: **Layered Service Architecture** (3-tier) with **Service-Oriented patterns**

### Evidence

1. **Clear Layer Separation**:
   - **Presentation/Transport Layer** (`app/router/`): HTTP request handling via Koa routes
   - **Business Logic Layer** (`app/managers/`): Domain logic isolated from HTTP concerns
   - **Data/Service Layer** (`app/services/`, `app/datastore/`): External integrations

2. **Service Integration Pattern**:
   - Multiple AWS service integrations (S3, Lambda, Step Functions)
   - Microservice communication via Lambda invocation
   - Event-driven triggers (`/trigger/:function` endpoint)

3. **Middleware Chain Pattern**:
   - Koa middleware stack in `app/index.js`
   - Request processing pipeline: tracing → prometheus → correlation → auth → business logic

4. **Framework-Agnostic Business Logic**:
   - Managers accept `managerCtx` (not Koa `ctx`)
   - Context transformation via `KoaCtxToManagerCtx`
   - Enables testability and framework independence

### Why This Style?

This service acts as an **API gateway and orchestrator** for file/image uploads and AWS function triggers. The layered architecture allows:
- Independent scaling of HTTP layer vs. business logic
- Easy addition of new AWS service integrations
- Clear separation for testing (unit test managers, integration test routes)
- Framework migration capability (could swap Koa for Express without changing managers)

## Design Patterns Used

### 1. Dependency Injection (Constructor Injection)

**Location**: Throughout codebase, especially `KoaCtxToManagerCtx.js`

**Implementation**:
```javascript
// lib/KoaCtxToManagerCtx.js
const KoaCtxToManagerCtx = ({ Datastore, Services }) => ({ ctx }) => {
  return {
    datastore: Datastore({ span, correlation }),
    service: Services({ span, correlation, jwt }),
    // ...
  };
};
```

**Purpose**: Decouple routers/managers from concrete service implementations, enable testing with mocks

---

### 2. Factory Pattern

**Location**: `app/services/index.js`, `app/datastore/index.js`

**Implementation**:
```javascript
// Services factory creates instrumented service instances
const sdkBasedServices = {
  imagesS3,
  filesS3,
  awsSDK: { S3, Lambda, StepFunctions }
};
export default InstrumentServices({ requestBasedServices, sdkBasedServices });
```

**Purpose**: Centralized creation of instrumented service instances with consistent observability

---

### 3. Strategy Pattern (Middleware Chain)

**Location**: `app/index.js` middleware stack

**Implementation**:
```javascript
app.use(tracing.unless({ path: ['/metrics', '/heartbeat'] }));
app.use(prometheus.responseDuration);
app.use(prometheus.requestCounter);
app.use(correlation);
app.use(accessLog);
app.use(errorFormatter);
app.use(jwt.unless({ path: ['/metrics', '/heartbeat', '/dev/token'] }));
```

**Purpose**: Composable request processing with conditional execution

---

### 4. Adapter Pattern

**Location**: `lib/KoaCtxToManagerCtx.js`

**Implementation**:
- Transforms Koa-specific context (`ctx`) into framework-agnostic `managerCtx`
- Extracts only needed data (span, correlation, JWT)

**Purpose**: Isolate business logic from HTTP framework details

---

### 5. Service Locator / Context Object Pattern

**Location**: Manager functions receiving `managerCtx`

**Implementation**:
```javascript
// Managers receive context with all dependencies
export const uploadFile = async(managerCtx, { /* params */ }) => {
  const bucketService = await getBucketService({ managerCtx, bucketName });
  // Use managerCtx.service, managerCtx.datastore, etc.
};
```

**Purpose**: Pass dependencies without tight coupling to specific implementations

---

### 6. Router Composition Pattern

**Location**: `app/router/index.js`

**Implementation**:
```javascript
// Compose sub-routers under parent paths
router.use('/files', fileRoutes.routes(), fileRoutes.allowedMethods());
router.use('/trigger', triggerRoutes.routes(), triggerRoutes.allowedMethods());
```

**Purpose**: Modular route organization, clear API structure

---

### 7. Parameter Mapping Pattern

**Location**: Route handlers using `mapParams` from `@verifiedfan/lib`

**Implementation**:
```javascript
const params = mapParams({ ...s3ParamMap, ...pagingParamMap }, ctx.query);
```

**Purpose**: Normalize and validate query parameters before passing to managers

---

### 8. Instrumentation Decorator Pattern

**Location**: `app/datastore/InstrumentDatastores.js`, `app/services/InstrumentServices.js`

**Implementation**:
- Wraps service/datastore methods with observability hooks
- Adds tracing, metrics, logging without modifying core logic

**Purpose**: Cross-cutting observability concerns

---

### 9. Config-Driven Behavior

**Location**: `configs/*.config.yml`, `lib/config.js`

**Implementation**:
- Environment-specific YAML configs
- Schema validation via `configs/schema.yml`
- Access via immutable Config object

**Purpose**: 12-factor app compliance, externalized configuration

---

### 10. Error Factory Pattern

**Location**: `app/errors/` directory

**Implementation**:
```javascript
// app/errors/s3.js
export const missingFile = { code: 'missing-file', status: 400 };
export const supremeUserRequired = { code: 'supreme-user-required', status: 403 };
```

**Purpose**: Consistent error structure, centralized error definitions

## Layer Separation

### Request Flow Through Layers

```
HTTP Request
    ↓
[Router Layer] (app/router/)
    │ - Parse request
    │ - Extract parameters
    │ - Create managerCtx
    ↓
[Manager Layer] (app/managers/)
    │ - Validate business rules
    │ - Check authorization
    │ - Orchestrate services
    ↓
[Service Layer] (app/services/)
    │ - Call AWS APIs
    │ - Handle retries/errors
    ↓
External Systems (S3, Lambda, Step Functions)
```

### Middleware Layer (Cross-Cutting)

Applied to all requests before reaching routers:

1. **Tracing** (`lib/middlewares/tracing/`) - Distributed tracing with Lightstep
2. **Prometheus** (`lib/middlewares/prometheus/`) - Metrics collection
3. **Correlation** (`lib/middlewares/correlation.js`) - Request correlation IDs
4. **Access Log** (`lib/middlewares/accessLog.js`) - Request logging
5. **Error Formatting** (`lib/middlewares/errorFormatter.js`) - Error normalization
6. **JWT Auth** (`lib/middlewares/jwt.js`) - Token validation
7. **Response Formatting** (`lib/middlewares/responseFormatter.js`) - Response normalization

### Boundary Enforcement

**Good**: Managers are framework-agnostic
- Manager functions accept `managerCtx` (not Koa `ctx`)
- Can be tested without HTTP layer
- Reusable across different HTTP frameworks

**Good**: Services are isolated
- Each AWS service has dedicated module
- Services don't call other services directly
- Managers orchestrate service calls

**Trade-off**: Context transformation overhead
- `KoaCtxToManagerCtx` creates new context object per request
- Necessary for clean architecture but adds minimal overhead

## Dependency Direction

### Clean Dependency Flow

```
Routers → Managers → Services
   ↓          ↓         ↓
  (depends on managers)
             ↓
        (depends on services)
```

**Observations**:
- ✅ **Correct**: Routers depend on Managers, not vice versa
- ✅ **Correct**: Managers depend on Services/Datastores via injection
- ✅ **Correct**: Services have no dependencies on Managers or Routers
- ✅ **Correct**: Shared libraries (`lib/`) are depended upon, never depend on app code

### Dependency Injection Flow

```
Router File (app/router/files.js)
    │
    ├─ Imports: Datastore, Services (singletons)
    │
    └─ Creates: KoaCtxToManagerCtx({ Datastore, Services })
          │
          └─ Passes managerCtx to managers
                │
                └─ Managers use: managerCtx.service, managerCtx.datastore
```

**Benefit**: Managers never import concrete service implementations directly

## Observability Patterns

### Distributed Tracing
- **Provider**: Lightstep (OpenTracing compatible)
- **Middleware**: `lib/middlewares/tracing/`
- **Propagation**: Span context passed through `managerCtx`

### Metrics
- **Provider**: Prometheus
- **Collectors**: Request counter, response duration, default Node.js metrics
- **Endpoint**: `/metrics` (Prometheus scrape target)

### Logging
- **Library**: `@verifiedfan/log`
- **Pattern**: Structured logging with correlation IDs
- **Location**: `lib/Log.js` (factory function)

### Health Checks
- **Endpoint**: `/heartbeat` (no auth required)
- **Implementation**: `lib/Router/heartbeat.js`

## Security Patterns

### 1. Role-Based Access Control

**Implementation**: JWT token validation with "supreme user" checks

```javascript
// Managers check isAuthSupreme before sensitive operations
if (!isAuthSupreme) {
  throw error(supremeUserRequired);
}
```

### 2. AWS IAM Role Assumption

**Location**: `app/managers/files/index.js`

**Pattern**: Assume temporary credentials for TMOL bucket access
```javascript
const credentials = bucketName === TMOL_BUCKETNAME
  ? await getAssumeRoleCreds()
  : { accessKeyId, secretAccessKey };
```

### 3. Environment-Based Configuration

**Pattern**: No secrets in code, loaded from environment-specific configs

## Deviations & Tech Debt

### 1. Mixed Configuration Approaches

**Issue**: Both YAML configs and environment variables used
- YAML: AWS credentials, bucket names, service endpoints
- Environment: `WEBPACKED_CONFIG` flag

**Recommendation**: Migrate sensitive values (credentials) to secret management (AWS Secrets Manager)

---

### 2. Instrumentation Wrappers

**Issue**: `InstrumentDatastores` and `InstrumentServices` add indirection
- Located in `app/datastore/InstrumentDatastores.js`, `app/services/InstrumentServices.js`
- Purpose not immediately clear from usage

**Observation**: Likely adds tracing/metrics, but pattern could be clearer

---

### 3. Development Endpoints in Production Build

**Issue**: `lib/Router/development/` endpoints included conditionally
- `/dev/token` endpoint for JWT generation
- Controlled by `devEndpoints.enabled` config flag

**Risk**: If misconfigured, could expose dev endpoints in production

---

### 4. Test Code Organization

**Issue**: `features/` tests import from `app/` but also duplicate some utilities
- `features/lib/aws/` duplicates some service patterns

**Recommendation**: Consider extracting shared test utilities to dedicated package

---

### 5. MongoDB Datastore Unused

**Observation**: `app/datastore/mongo/` exists but minimal usage in managers
- IndexMap and instrumentation present
- Suggests planned or deprecated feature

**Recommendation**: Remove if truly unused, or document usage patterns

---

### 6. Error Handling Consistency

**Issue**: Mixed error handling approaches
- Some managers use `throw error(errorFactory)` pattern
- Some services use try/catch with logging

**Recommendation**: Standardize error propagation strategy

---

### 7. AWS SDK Version

**Observation**: Uses AWS SDK v2 (`aws-sdk` package)
- AWS SDK v3 is now standard with better tree-shaking

**Recommendation**: Consider migration to v3 for smaller bundle size and improved performance
