# Architecture Patterns - entry-service

## Architecture Style

**Identified Style**: **Layered Architecture** (Traditional N-Tier) with **Service-Oriented Integration**

**Evidence**:
- Clear horizontal layers: Router → Manager → Datastore/Services
- `app/router/` handles HTTP concerns exclusively
- `app/managers/` contains business logic separate from data access
- `app/datastore/` encapsulates all MongoDB operations
- `app/services/` abstracts external service dependencies
- No circular dependencies between layers
- Dependencies flow downward: router depends on managers, managers depend on datastore/services

This is a classic **three-tier architecture** (presentation, business logic, data access) enhanced with a fourth tier for external service integration.

## Design Patterns Used

### 1. Repository Pattern
- **Location**: `app/datastore/entries/`, `app/datastore/scoring/`, etc.
- **Implementation**: Each datastore module wraps a MongoDB collection and provides domain-specific query methods
- **Example**:
  ```javascript
  // app/datastore/entries/index.js
  export default {
    findByUser: async({ userId }) => DataStore.find({ '_id.user_id': userId }),
    findByCampaignAndUser: ({ campaignId, userId }) => DataStore.findOne({ _id: make_id({ campaignId, userId }) }),
    insertEntry: async({ entry }) => DataStore.insertOne(entry),
    // ... more repository methods
  }
  ```

### 2. Service Layer Pattern
- **Location**: `app/managers/`
- **Implementation**: Business logic orchestration separated from HTTP and data concerns
- **Example**: `app/managers/entries/upsert.js` orchestrates validation, user lookup, campaign checks, and database operations

### 3. Facade Pattern
- **Location**: `app/services/`
- **Implementation**: Simplified interfaces to complex external systems
- **Example**: `app/services/campaigns/` wraps campaign-service API calls, `app/services/users/` wraps user-service calls

### 4. Middleware Chain Pattern
- **Location**: `app/index.js`
- **Implementation**: Koa middleware pipeline for cross-cutting concerns
- **Example**:
  ```javascript
  app.use(tracing.unless({ path: ['/metrics', '/heartbeat'] }));
  app.use(bodyParser());
  app.use(prometheus.responseDuration);
  app.use(correlation);
  app.use(accessLog);
  app.use(errorFormatter);
  app.use(jwt.unless({ path: ['/metrics', '/heartbeat'] }));
  ```

### 5. Strategy Pattern
- **Location**: `app/managers/entries/validators/`
- **Implementation**: Different validation strategies applied based on context
- **Example**: Registration eligibility validators (`validateCardGate`, `validateLinkedAccountGate`, `validateInviteOnlyGate`)

### 6. Normalizer/Transformer Pattern
- **Location**: `app/managers/*/normalizers/`
- **Implementation**: Standardized data transformation functions
- **Example**: `app/managers/entries/normalizers/forUser.js` transforms internal entry representation to API response format

### 7. Hook Pattern
- **Location**: `app/managers/entries/onUpserted/`
- **Implementation**: Post-operation side effects executed asynchronously
- **Example**: After entry upsert: send to Nudetect, query Fanscore, save to campaign pipeline

### 8. Selector Pattern (Functional)
- **Location**: `app/managers/*/selectors/`
- **Implementation**: Pure functions for extracting data from objects
- **Example**: Using Ramda's `R.path`, `R.prop` for safe data extraction

### 9. Dependency Injection
- **Location**: Throughout managers
- **Implementation**: `managerCtx` object injected with datastore and service dependencies
- **Example**:
  ```javascript
  const koaCtxToManagerCtx = KoaCtxToManagerCtx({ Datastore, Services });
  // ... later
  return entriesManager.upsert(managerCtx, { campaignId, userId, token, data });
  ```

### 10. Instrumentation Pattern
- **Location**: `app/datastore/InstrumentDatastores.js`, `app/services/InstrumentServices.js`
- **Implementation**: Wraps datastores and services with observability
- **Example**: All datastore/service calls are automatically traced and logged

## Layer Separation

### Dependency Direction

```
┌─────────────────┐
│  Router Layer   │  (app/router/)
└────────┬────────┘
         │ calls
         ↓
┌─────────────────┐
│  Manager Layer  │  (app/managers/)
└────┬───────┬────┘
     │       │
     │calls  │calls
     ↓       ↓
┌─────────┐ ┌──────────┐
│Datastore│ │ Services │
│  Layer  │ │  Layer   │
└─────────┘ └──────────┘
(app/datastore/) (app/services/)
```

**Key Principles Observed**:
- Routers never access datastores directly
- Managers coordinate between datastores and services
- Datastores have no dependencies on managers
- Services have no dependencies on datastores
- Clean unidirectional dependency flow

### Abstraction Levels

| Layer | Responsibility | Abstraction Level |
|-------|----------------|-------------------|
| Router | HTTP concerns, parameter extraction | Highest - HTTP protocol |
| Manager | Business logic, validation, orchestration | High - Domain concepts |
| Datastore | Data persistence, queries | Low - Database operations |
| Services | External integration | Low - API/SDK calls |

## Cross-Cutting Concerns

Handled via middleware pipeline in `app/index.js`:

- **Authentication**: JWT middleware validates tokens
- **Authorization**: Supreme user checks in manager layer
- **Logging**: Access log middleware + correlation IDs
- **Metrics**: Prometheus middleware tracks duration and counts
- **Tracing**: OpenTelemetry integration
- **Error Handling**: Centralized error formatter middleware
- **Compression**: Koa compress middleware
- **Body Parsing**: Koa bodyparser middleware

## Deviations & Tech Debt

### 1. Async Side Effects in Upsert
- **Location**: `app/managers/entries/onUpserted/`
- **Issue**: Post-upsert hooks fire asynchronously without waiting for completion
- **Risk**: Potential data inconsistency if hooks fail silently
- **Comment in code**: None - implicit fire-and-forget pattern

### 2. Mixed Validation Patterns
- **Location**: `app/managers/entries/validators/`
- **Issue**: Some validators throw errors, others return boolean/object
- **Example**: `throwIfInvalidEntry` vs `registrationEligibility`
- **Impact**: Inconsistent error handling patterns

### 3. Commented-out Routes
- **Location**: `app/router/index.js` (lines 366-376)
- **Issue**: Shares routes commented out but not removed
- **Impact**: Dead code, unclear if feature is deprecated

### 4. TODO Comments
- **Location**: Various, e.g., `app/router/index.js`:
  - Line 271: "should likely deprecate" for verdicts endpoint
  - Line 300: "should likely deprecate" for codes endpoint
  - Line 74: "TODO: cache result for 60 seconds" in manager
- **Impact**: Uncertainty about API stability and future direction

### 5. Global Error Object Pattern
- **Location**: `app/errors/`
- **Issue**: Custom error objects as plain objects, not Error instances
- **Impact**: Stack traces not automatically captured

### 6. No Typed Schema Validation
- **Location**: Router endpoints accept arbitrary body parameters
- **Issue**: No runtime schema validation for request payloads (aside from manual checks)
- **Impact**: Potential for invalid data reaching business logic

### 7. Tight Coupling to MongoDB
- **Location**: `app/datastore/` directly uses MongoDB driver
- **Issue**: No database abstraction layer
- **Impact**: Difficult to swap database implementations

## Testing Strategy

- **Unit Tests**: Jest for isolated functions (`.spec.js` files)
- **Integration Tests**: Cucumber BDD features (`features/` directory)
- **Test Organization**: Co-located spec files with implementation
