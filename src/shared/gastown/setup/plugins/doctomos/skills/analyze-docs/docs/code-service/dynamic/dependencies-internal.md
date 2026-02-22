# Internal Dependencies - code-service

## @verifiedfan/* Packages

| Package | Version | Category | Purpose | Usage Locations |
|---------|---------|----------|---------|-----------------|
| @verifiedfan/lib | ^1.6.1 | Core Utilities | Common utilities, selectors, JWT handling, test utils, config management | Heavily used across app/router, lib/middlewares, lib/config, tools/jwt |
| @verifiedfan/log | ^1.4.1 | Logging | Structured logging functionality | lib/Log.js, features/lib/Log.js |
| @verifiedfan/mongodb | ^1.7.9 | Database | MongoDB client and operations | app/datastore/mongo, features/lib/mongo.js |
| @verifiedfan/configs | ^1.2.4 | Configuration | Configuration management | (Likely used internally by other @verifiedfan packages) |
| @verifiedfan/date | ^1.2.1 | Utilities | Date/time utilities and helpers | app/datastore/codes.js, features/lib/inputs |
| @verifiedfan/map-utils | ^1.3.1 | Utilities | Parallel mapping utilities | app/managers/codes/findCodesCounts.js |
| @verifiedfan/batch-transform-stream | ^0.3.1 | Streaming | Batch stream processing | app/managers/codes/readAndStoreCodes.js |
| @verifiedfan/prometheus | ^2.0.4 | Monitoring | Prometheus metrics collection | lib/Router, lib/middlewares/prometheus, app/datastore/mongo/instrumentFn.js, app/services/InstrumentServices.js |
| @verifiedfan/titan-request | ^2.0.2 | HTTP Client | Internal HTTP request library | app/services/InstrumentServices.js |
| @verifiedfan/tracing | ^2.0.2 | Observability | Distributed tracing utilities | app/services/InstrumentServices.js, app/datastore/InstrumentDatastores.js, lib/InstrumentedAsyncOperation.js |
| @verifiedfan/aws | (Not in deps) | AWS Utilities | AWS SDK wrappers and utilities | app/services/s3/index.js |

### Test-Only Internal Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/cucumber-features | ^0.25.9 | Shared Cucumber step definitions, test utilities, and test setup |
| @verifiedfan/test-utils | ^2.3.0 | Testing utilities and helpers |

## Usage Analysis by Package

### @verifiedfan/lib
**Heavy usage** - This is the most critical internal dependency.

Key imports:
- `Config` - Configuration management
- `selectors` - Data selection utilities
- `paramUtils` - Parameter handling
- `jwt` - JWT token operations
- `testUtils` - Test utilities
- `middlewares` - Koa middleware components (correlation, accessLog, errorFormatter, responseFormatter, jwt)
- `error` - Error handling utilities
- `tracingUtils` - Tracing utilities
- `date` - Date utilities

Used in:
- Configuration system (lib/config.js)
- Router and API layer (app/router/index.js)
- All middleware (lib/middlewares/*)
- JWT tooling (tools/jwt/*)
- Test setup (features/*)

### @verifiedfan/prometheus
**Moderate usage** - Core monitoring infrastructure.

Key imports:
- `Prometheus` - Main metrics client
- `makeMetricName` - Metric naming utilities
- `enums` - Prometheus-specific enumerations

Used in:
- HTTP request/response metrics (lib/middlewares/prometheus/*)
- Database operation metrics (app/datastore/mongo/instrumentFn.js)
- Service instrumentation (app/services/InstrumentServices.js)
- Router metrics (lib/Router/index.js)
- Default metrics collection (lib/collectDefaultPrometheusMetrics.js)

### @verifiedfan/tracing
**Moderate usage** - Distributed tracing infrastructure.

Key imports:
- `TracedSdk` - SDK tracing wrapper
- `TracedRequest` - Request tracing wrapper
- `utils` - Tracing utilities

Used in:
- Service instrumentation (app/services/InstrumentServices.js)
- Datastore instrumentation (app/datastore/InstrumentDatastores.js)
- Async operation tracking (lib/InstrumentedAsyncOperation.js)

### @verifiedfan/mongodb
**Targeted usage** - Database layer only.

Used in:
- Main datastore connection (app/datastore/mongo/index.js)
- Test MongoDB setup (features/lib/mongo.js)

### @verifiedfan/date
**Light usage** - Date utilities.

Key imports:
- `yesterday` - Date calculation
- `timeInMilliseconds` - Time conversion
- `now` - Current timestamp

Used in:
- Code datastore queries (app/datastore/codes.js)
- Test input generation (features/lib/inputs/*)

### @verifiedfan/log
**Targeted usage** - Logging infrastructure.

Simple import pattern: `import Log from '@verifiedfan/log'`

Used in:
- Main application logging (lib/Log.js)
- Test logging (features/lib/Log.js)

### @verifiedfan/batch-transform-stream
**Single use** - CSV code processing.

Used only in:
- app/managers/codes/readAndStoreCodes.js for batch CSV processing

### @verifiedfan/map-utils
**Single use** - Parallel operations.

Key import:
- `MapAsyncParallel` - Parallel async mapping

Used only in:
- app/managers/codes/findCodesCounts.js for parallel code count queries

### @verifiedfan/titan-request
**Single use** - HTTP requests.

Used only in:
- app/services/InstrumentServices.js as the base request client (wrapped with tracing/metrics)

### @verifiedfan/aws
**Missing from package.json** - This is imported but not declared as a dependency!

Import found in:
- app/services/s3/index.js

**Action Required**: Add `@verifiedfan/aws` to dependencies

## Coupling Analysis

### High Coupling Dependencies
**@verifiedfan/lib** - Critical dependency
- Used in 20+ files across the codebase
- Provides core functionality: config, middlewares, utilities, JWT
- **Impact**: Breaking changes in this package would require extensive updates
- **Risk Level**: High
- **Mitigation**: This is a stable, well-maintained internal package

### Medium Coupling Dependencies
**@verifiedfan/prometheus** - Important for observability
- Used in 7+ files
- Provides metrics collection
- **Impact**: Changes to metrics API would require updates across instrumentation points
- **Risk Level**: Medium

**@verifiedfan/tracing** - Important for observability
- Used in 5+ files
- Provides distributed tracing
- **Impact**: Changes to tracing API would require updates across instrumentation
- **Risk Level**: Medium

### Low Coupling Dependencies
- @verifiedfan/mongodb - Isolated to datastore layer
- @verifiedfan/log - Isolated to logging layer
- @verifiedfan/date - Few, targeted uses
- @verifiedfan/map-utils - Single use case
- @verifiedfan/batch-transform-stream - Single use case
- @verifiedfan/titan-request - Single use (wrapped in services)

## Internal Package Version Analysis

All internal packages use caret (^) version ranges, allowing minor and patch updates:

- **1.x.x packages**: configs, date, lib, log, map-utils
- **2.x.x packages**: prometheus, titan-request, tracing (newer, v2 APIs)
- **0.x.x packages**: batch-transform-stream, cucumber-features (pre-1.0)

## Recommendations

1. **Add missing dependency**: Include `@verifiedfan/aws` in package.json dependencies
2. **Dependency hygiene**: The service follows good practices with semantic versioning
3. **Observability**: Strong instrumentation with prometheus and tracing packages
4. **Test infrastructure**: Good separation of test utilities in devDependencies
