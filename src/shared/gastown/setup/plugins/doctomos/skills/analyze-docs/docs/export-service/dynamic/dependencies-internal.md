# Internal Dependencies - export-service

## @verifiedfan/* Packages

### Production Dependencies

| Package | Version | Purpose | Usage Location |
|---------|---------|---------|----------------|
| @verifiedfan/aws | ^2.13.0 | AWS SDK utilities and wrappers | app/services/athena, app/services/scoringS3, app/services/sfmc, app/services/vfScoringS3, app/services/exportsS3 |
| @verifiedfan/batch-transform-stream | ^0.3.1 | Batch transformation stream utilities | app/managers/exports/exportWaitlist/smsWaves.js |
| @verifiedfan/configs | ^1.2.4 | Configuration management | (Indirect usage via other packages) |
| @verifiedfan/date | ^1.2.1 | Date/time utilities | app/services/sfmc, app/managers/exports/exportAutoReminderEmail |
| @verifiedfan/lib | ^1.6.1 | Core library with selectors, permissions, error handling, JWT, middlewares | lib/Router, lib/middlewares, app/router, app/managers/exports |
| @verifiedfan/log | ^1.4.1 | Logging utilities | lib/Log.js |
| @verifiedfan/map-utils | ^1.3.1 | Async mapping utilities (MapAsyncSerial, MapAsyncParallel) | app/managers/exports (multiple files) |
| @verifiedfan/mongodb | ^2.1.0 | MongoDB client wrapper | app/datastore/mongo |
| @verifiedfan/prometheus | ^2.0.4 | Prometheus metrics collection | lib/Router, lib/collectDefaultPrometheusMetrics, lib/middlewares/prometheus, app/services/InstrumentServices |
| @verifiedfan/string-utils | ^1.1.1 | String manipulation utilities | lib/athena/exportQuery.js |
| @verifiedfan/titan-request | ^2.0.9 | HTTP request client for Titan services | app/services/InstrumentServices.js |
| @verifiedfan/tracing | ^3.0.1 | Distributed tracing utilities (OpenTelemetry) | lib/InstrumentedAsyncOperation, lib/middlewares/telemetry, app/services/InstrumentServices, app/managers/queue/process, app/datastore/InstrumentDatastores |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/cucumber-features | ^1.4.1 | Shared Cucumber test features |
| @verifiedfan/test-utils | ^3.8.1 | Testing utilities and helpers |

## Coupling Analysis

### Dependency Intensity

**High Coupling** (used extensively throughout codebase):
- **@verifiedfan/lib**: Core dependency used in nearly every module for selectors, permissions, error handling, JWT, middlewares, and utilities
- **@verifiedfan/tracing**: Used throughout for distributed tracing (middleware, services, datastores, async operations)
- **@verifiedfan/prometheus**: Integrated into router, middleware, and instrumentation layers for metrics
- **@verifiedfan/map-utils**: Used heavily in export managers for async batch processing

**Medium Coupling** (used in specific domains):
- **@verifiedfan/aws**: Used exclusively in service layer for AWS integrations (S3, Athena, SFMC)
- **@verifiedfan/mongodb**: Used in datastore layer only
- **@verifiedfan/date**: Used in specific export managers dealing with date/time operations

**Low Coupling** (specialized usage):
- **@verifiedfan/batch-transform-stream**: Used in one specific export feature (SMS waves)
- **@verifiedfan/string-utils**: Used in one location (Athena query building)
- **@verifiedfan/log**: Used as primary logger wrapper
- **@verifiedfan/titan-request**: Used for inter-service communication
- **@verifiedfan/configs**: Indirect usage through other packages

### Architecture Pattern

The service follows a **layered architecture** with clear separation:

1. **Router Layer**: Uses lib (selectors, permissions), prometheus
2. **Middleware Layer**: Uses lib (middlewares), tracing, prometheus
3. **Manager Layer**: Uses lib (error handling), map-utils, date
4. **Service Layer**: Uses aws, titan-request, tracing, prometheus
5. **Datastore Layer**: Uses mongodb, tracing, prometheus

### Migration Considerations

**Breaking if Updated**:
- @verifiedfan/lib (affects entire codebase)
- @verifiedfan/tracing (affects instrumentation)
- @verifiedfan/prometheus (affects metrics)
- @verifiedfan/mongodb (affects data layer)

**Safe to Update**:
- @verifiedfan/batch-transform-stream (isolated usage)
- @verifiedfan/string-utils (single usage)
- @verifiedfan/configs (indirect usage)

**Test Impact**:
- @verifiedfan/cucumber-features
- @verifiedfan/test-utils

## Internal Package Versions

All internal packages use **caret (^) versioning**, allowing minor and patch updates automatically. This is appropriate for the Verified Fan internal ecosystem.

## Notable Patterns

1. **Instrumentation Wrapper Pattern**: Services and datastores are wrapped with tracing and Prometheus timing utilities
2. **Async Batch Processing**: Heavy use of map-utils (MapAsyncSerial, MapAsyncParallel) for export operations
3. **Middleware Composition**: Extensive use of @verifiedfan/lib middlewares for standard HTTP handling
4. **Selector Pattern**: Consistent use of lib selectors for extracting context data
