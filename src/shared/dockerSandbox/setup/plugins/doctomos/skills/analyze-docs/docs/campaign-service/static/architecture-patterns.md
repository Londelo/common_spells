# Architecture Patterns - campaign-service

## Architecture Style

**Identified Style**: **3-Tier Layered Architecture** with **Functional Programming** paradigm

**Evidence**:
- Clear separation into Router → Manager → Datastore → Services layers
- No classes, only factory functions and pure functions
- Strict immutability enforced by ESLint (no `let`, no `var`, no mutations)
- Ramda functional composition throughout (`R.pipeP`, `R.map`, `R.path`)
- Each layer has distinct responsibility and depends on layer below
- Manager context pattern flows through all operations

**Why This Style**:
This architecture supports a RESTful API service managing campaign lifecycle with complex business rules. The functional approach ensures predictable, testable code while the layered separation enables independent evolution of persistence, business logic, and API contracts.

## Design Patterns Used

### 1. Context Propagation Pattern
**Location**: `lib/KoaCtxToManagerCtx.js`

**Implementation**: Every request flows through a manager context factory that extracts:
- Correlation ID (for distributed tracing)
- JWT token (for authentication/authorization)
- Instrumented datastore (for database operations)
- Instrumented services (for external calls)

**Example**:
```javascript
const koaCtxToManagerCtx = KoaCtxToManagerCtx({ Datastore, Services });
const managerCtx = koaCtxToManagerCtx({ ctx });
// managerCtx now contains { correlation, jwt, datastore, service, InstrumentedAsyncOperation }
```

This enables request tracing across all operations without manual propagation.

### 2. Factory Function Pattern
**Location**: Throughout codebase (no classes anywhere)

**Implementation**: All modules export factory functions that create closures over configuration:
```javascript
// lib/Log.js
const Log = (path) => ({
  info: (message, data) => { /* ... */ },
  error: (message, data) => { /* ... */ }
});

// app/datastore/default.js
const defaultDataStore = (collectionName) => ({
  find: (query) => { /* ... */ },
  upsert: (doc) => { /* ... */ }
});
```

Enables dependency injection and testability without classes.

### 3. Manager-Datastore Pattern
**Location**: `app/managers/` and `app/datastore/`

**Implementation**:
- **Managers** contain business logic, validation, formatting
- **Datastores** contain MongoDB CRUD operations only
- Managers call datastores, never vice versa
- Clear dependency direction: Router → Manager → Datastore

**Example Flow**:
```
GET /campaigns/123
  → router/campaigns.js (extract params, check auth)
  → managers/campaigns/index.js::findById (business logic)
    → datastore/campaigns.js::findById (MongoDB query)
  ← format and return
```

### 4. Selector Pattern
**Location**: Every manager has `selectors.js`

**Implementation**: Pure functions extract data from complex objects:
```javascript
// app/managers/campaigns/selectors.js
export const selectStatus = ({ campaign }) => campaign.status;
export const selectCampaignId = ({ campaign }) => campaign._id.toString();
```

Provides stable API for data access, isolates path changes.

### 5. Validator Pattern (throwIf*)
**Location**: Every manager has `validators/` directory

**Implementation**: Validators throw errors when conditions fail:
```javascript
// app/managers/campaigns/validators/throwIfInvalidPermissions.js
export const throwIfInvalidPermissions = ({ campaign, authUserActions }) => {
  if (!hasAccess(campaign, authUserActions)) {
    throw error(errors.unauthorized);
  }
};
```

Enforces business rules before operations execute, fails fast.

### 6. Error Factory Pattern
**Location**: Every manager has `errors.js`

**Implementation**: Errors defined as objects, thrown with context:
```javascript
// app/managers/campaigns/errors.js
export const campaignNotFound = error({
  type: 'CAMPAIGN_NOT_FOUND',
  message: 'Campaign not found'
});

// Usage
throw error(errors.campaignNotFound);
```

Consistent error structure across the application.

### 7. Instrumentation Wrapper Pattern
**Location**: `app/datastore/InstrumentDatastores.js`, `app/services/InstrumentServices.js`

**Implementation**: Wraps datastore/service functions with OpenTelemetry tracing:
```javascript
const instrumentFn = (fnName, fn) => async(...args) => {
  const span = tracer.startSpan(fnName);
  try {
    return await fn(...args);
  } finally {
    span.end();
  }
};
```

Automatic observability without manual instrumentation in business logic.

### 8. Schema Validation Pattern
**Location**: `schemas/` directory, `lib/ValidateSchema.js`

**Implementation**: JSON schemas validate all inputs before processing:
```javascript
ValidateSchema('campaignV2')(inputData);
```

Supports versioning (campaignV1, campaignV2) for backward compatibility.

### 9. Functional Composition Pattern
**Location**: Throughout codebase using Ramda

**Implementation**: Complex operations composed from small functions:
```javascript
const FindEventIdsFromPresaleWindow = managerCtx => R.pipeP(
  managerCtx.datastore.campaigns.findCampaignIdsByPresaleWindowDates,
  R.map(({ _id }) => _id.toString()),
  campaignIds => managerCtx.datastore.markets.findEventIdsByCampaignIds({ campaignIds })
);
```

Eliminates temporary variables, reveals data transformation flow.

### 10. Middleware Pipeline Pattern
**Location**: `app/index.js`, `lib/middlewares/`

**Implementation**: Koa middleware stack processes requests sequentially:
```javascript
app.use(compress());
app.use(tracing);
app.use(bodyParser());
app.use(prometheus.responseDuration);
app.use(correlation);
app.use(accessLog);
app.use(errorFormatter);
app.use(jwt);
app.use(router.routes());
```

Each middleware handles cross-cutting concern (auth, logging, metrics).

## Layer Separation

### Router Layer (`app/router/`)
**Responsibilities**:
- Define HTTP endpoints and methods
- Extract parameters from request (query, body, path)
- JWT authentication checks
- Convert Koa context to Manager context
- Call manager functions
- Return formatted response

**Does NOT contain**: Business logic, validation, database calls, formatting

### Manager Layer (`app/managers/`)
**Responsibilities**:
- Orchestrate business operations
- Validate inputs against JSON schemas
- Enforce business rules (via validators)
- Check permissions and authorization
- Call datastore operations
- Format responses for API
- Trigger side effects (cache purges, queue messages)

**Does NOT contain**: HTTP concerns, raw database queries, external API details

### Datastore Layer (`app/datastore/`)
**Responsibilities**:
- MongoDB CRUD operations
- Query construction
- Index management
- Return raw database documents

**Does NOT contain**: Business logic, formatting, validation, HTTP concerns

### Services Layer (`app/services/`)
**Responsibilities**:
- External API integrations (Ticketmaster Discovery, Fastly, GitLab)
- AWS integrations (Kinesis, SQS)
- Redis caching
- HTTP request construction
- Response parsing

**Does NOT contain**: Business logic, database operations, HTTP routing

## Dependency Direction

```
┌─────────────────────────────────────┐
│  HTTP Request (Koa)                 │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Router Layer (app/router/)         │
│  - Route definitions                │
│  - Parameter extraction             │
│  - JWT authentication               │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Manager Layer (app/managers/)      │
│  - Business logic                   │
│  - Validation                       │
│  - Orchestration                    │
│  - Formatting                       │
└──────────┬────────────┬─────────────┘
           ↓            ↓
  ┌────────────┐  ┌────────────────┐
  │ Datastore  │  │ Services       │
  │ (MongoDB)  │  │ (External APIs)│
  └────────────┘  └────────────────┘
```

**Dependency Rules**:
- Router depends on Manager
- Manager depends on Datastore and Services
- Datastore depends on MongoDB client
- Services depend on external APIs
- No circular dependencies
- Lower layers never import from upper layers

This is **clean dependency direction** - higher layers depend on lower layers, enabling independent testing and replacement.

## Cross-Cutting Concerns

### Observability (OpenTelemetry + Prometheus)
- All datastore operations automatically traced
- All service calls automatically traced
- Custom spans via `InstrumentedAsyncOperation`
- Prometheus metrics exposed on `/metrics`
- Correlation IDs propagated through entire request lifecycle

### Caching (Redis)
- Service-level caching for Discovery API results
- Read replica support for high availability
- TTL-based expiration
- Cache keys include correlation for debugging

### Error Handling
- Custom error types per domain
- Consistent error structure with `type` and `message`
- Error middleware formats errors for API response
- All errors logged with correlation ID

### Authentication & Authorization
- JWT middleware validates tokens
- Per-route authentication requirements
- Campaign-level permissions via `authUserActions`
- Supreme user bypass for admin operations

## Functional Programming Enforcement

ESLint rules strictly enforce functional programming:
- **No `let` or `var`**: Only `const` declarations allowed
- **No mutations**: No array.push(), object property assignment
- **No loops**: Use Ramda `R.map`, `R.filter`, `R.reduce`
- **No classes**: Only factory functions and arrow functions
- **Max complexity: 7**: Forces decomposition
- **Max nesting: 2**: Forces early returns and extraction

**Example of enforced FP style**:
```javascript
// BAD (not allowed)
let total = 0;
for (let i = 0; i < items.length; i++) {
  total += items[i].price;
}

// GOOD (required)
const total = R.reduce((acc, item) => acc + item.price, 0, items);
```

## Deviations & Technical Considerations

### Domain Uniqueness via Sparse Index
**Location**: `app/datastore/mongo/indexMap.js`

**Pattern**: Campaign `domain.site` has unique sparse index
- Allows multiple campaigns with null `domain.site`
- Only enforces uniqueness when value is present
- Supports campaign lifecycle (INACTIVE campaigns clear domain)

**Rationale**: Domains are valuable and reusable - when campaigns close and go inactive, domains should be freed for future campaigns.

### Mixed Schema Versions
**Pattern**: Supports campaignV1, campaignV2, fanlistCampaign, campaignDraft

**Rationale**:
- V1 campaigns still exist in production
- V2 adds additional fields and validation
- Fanlist is specialized campaign type
- Draft allows partial validation for work-in-progress

### Manual Correlation in Tests
**Location**: `features/` tests

**Deviation**: BDD tests manually construct manager context instead of using middleware

**Rationale**: Integration tests bypass HTTP layer to test business logic directly.

### Config as Immutable Map
**Pattern**: Configuration loaded as Immutable.js Map

**Rationale**: Prevents accidental configuration mutation at runtime, uses `getIn()` for nested access.

### Status Transition via Refresh
**Pattern**: Campaign status changes happen via periodic refresh job, not inline

**Rationale**:
- Decouples status updates from user operations
- Avoids race conditions during updates
- Enables batch processing for efficiency
- Status transitions based on time (`date.open`, `date.close`)
