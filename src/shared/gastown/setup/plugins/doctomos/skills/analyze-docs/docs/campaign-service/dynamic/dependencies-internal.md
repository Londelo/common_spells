# Internal Dependencies - campaign-service

## @verifiedfan/* Packages

### Production Dependencies

| Package | Version | Purpose | Usage Verified |
|---------|---------|---------|----------------|
| @verifiedfan/access-log | ^1.4.0 | Access logging middleware | ✓ |
| @verifiedfan/configs | ^1.2.4 | Environment configuration management | ✓ |
| @verifiedfan/date | ^1.3.4 | Date/time utilities | ✓ Used in managers & features |
| @verifiedfan/lib | ^1.6.1 | Core utility library (selectors, paramUtils, normalizers, date, jwt, error, testUtils) | ✓ Heavy usage throughout |
| @verifiedfan/log | ^1.4.1 | Structured logging (Logstash format) | ✓ |
| @verifiedfan/map-utils | ^1.3.1 | Async mapping utilities (MapAsyncParallel) | ✓ Used in data pipeline tools |
| @verifiedfan/mongodb | ^2.1.0 | MongoDB client wrapper | ✓ Core datastore |
| @verifiedfan/prometheus | ^2.0.4 | Prometheus metrics instrumentation | ✓ Used in Router and datastore |
| @verifiedfan/redis | ^2.0.2 | Redis client wrapper | ✓ |
| @verifiedfan/schemas | ^1.3.1 | JSON schema validation | ✓ Used in ValidateSchema |
| @verifiedfan/titan-request | ^2.0.2 | HTTP request utilities for Titan services | ✓ |
| @verifiedfan/tm-discovery | ^2.10.0 | Ticketmaster Discovery API client | ✓ |
| @verifiedfan/tracing | ^3.0.1 | OpenTelemetry distributed tracing (TracedSdk) | ✓ Used in datastore instrumentation |
| @verifiedfan/locale | ^1.4.0 | Localization utilities | ⚠️ Not found in imports |

### Dev Dependencies

| Package | Version | Purpose | Usage Verified |
|---------|---------|---------|----------------|
| @verifiedfan/avro | ^1.1.0 | Avro schema handling | ⚠️ Not verified in code |
| @verifiedfan/cucumber-features | ^1.2.6 | Shared Cucumber feature files | ✓ BDD testing |
| @verifiedfan/locale | ^1.2.0 | Localization utilities (duplicate, different version) | ⚠️ Different version than prod |
| @verifiedfan/test-utils | ^3.8.1 | Testing utilities | ✓ Used in JWT generation |

## Coupling Analysis

### High Coupling Areas

**@verifiedfan/lib** (Core Dependency)
- Most heavily used internal package
- Provides critical utilities:
  - `selectors` - Data extraction from contexts
  - `paramUtils` - Parameter parsing and validation
  - `normalizers` - Data normalization
  - `date` - Date utilities
  - `jwt` - JWT token handling
  - `error` - Error factory
  - `testUtils` - Testing utilities
- Used in: routers, managers, tools, features
- Risk: High - Changes to this package could have widespread impact

**@verifiedfan/mongodb** (Data Layer)
- Core datastore implementation
- All persistence flows through this package
- Risk: High - Database operations depend entirely on this

**@verifiedfan/date** (Business Logic)
- Campaign lifecycle heavily depends on date operations
- Used in:
  - Campaign status transitions (OPEN, CLOSED, INACTIVE)
  - Manager validation logic
  - Feature tests
- Risk: Medium - Changes could affect business rules

**@verifiedfan/tracing** (Observability)
- Used to instrument all datastore operations
- TracedSdk wraps MongoDB operations
- Risk: Medium - Required for production observability

### Medium Coupling Areas

**@verifiedfan/prometheus** (Metrics)
- Used in Router middleware and datastore instrumentation
- Exposes `/metrics` endpoint
- Risk: Low - Metrics are additive, failures don't break functionality

**@verifiedfan/tm-discovery** (External Integration)
- Integration with Ticketmaster Discovery API
- Used for event, venue, artist, promoter data
- Risk: Low - Well-isolated in services layer

**@verifiedfan/schemas** (Validation)
- JSON schema validation for all inputs
- Risk: Medium - Schema changes could break validation

**@verifiedfan/map-utils** (Data Pipeline)
- Used in tools for batch processing
- MapAsyncParallel for concurrent operations
- Risk: Low - Used in offline tools only

### Low Coupling Areas

- @verifiedfan/redis - Isolated in services layer
- @verifiedfan/titan-request - Isolated HTTP client
- @verifiedfan/access-log - Middleware only
- @verifiedfan/configs - Configuration loading
- @verifiedfan/log - Logging abstraction

## Version Inconsistencies

**@verifiedfan/locale**
- Production: ^1.4.0
- Development: ^1.2.0
- Risk: Low - Appears unused in code
- Recommendation: Remove one version or verify usage

## Architecture Integration

The service follows a 3-layer architecture:

```
Router Layer
  ├─ Uses: @verifiedfan/lib (selectors, paramUtils)
  └─ Instrumented by: @verifiedfan/prometheus

Manager Layer
  ├─ Uses: @verifiedfan/lib (normalizers, date, error)
  ├─ Validates with: @verifiedfan/schemas
  └─ Calls: Datastore & Services

Datastore Layer
  ├─ Uses: @verifiedfan/mongodb
  ├─ Instrumented by: @verifiedfan/tracing, @verifiedfan/prometheus
  └─ Uses: @verifiedfan/map-utils (batch operations)

Services Layer
  ├─ Uses: @verifiedfan/tm-discovery
  ├─ Uses: @verifiedfan/redis
  ├─ Uses: @verifiedfan/titan-request
  └─ Uses: @verifiedfan/configs
```

All layers wrapped with:
- Logging: @verifiedfan/log
- Access logs: @verifiedfan/access-log
- Tracing: @verifiedfan/tracing

## Upgrade Considerations

**Before upgrading any internal package:**

1. **@verifiedfan/lib** - Run full test suite, check all routers/managers
2. **@verifiedfan/mongodb** - Test datastore operations, verify indexes
3. **@verifiedfan/date** - Test campaign lifecycle transitions
4. **@verifiedfan/tracing** - Verify instrumentation still works
5. **@verifiedfan/schemas** - Validate all schema validations pass

**Lower risk upgrades:**
- Prometheus, Redis, configs, log, access-log (well-isolated)
