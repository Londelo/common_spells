# Internal Dependencies - upload-service

## @verifiedfan/* Packages

| Package | Version | Purpose | Usage Locations |
|---------|---------|---------|-----------------|
| **@verifiedfan/aws** | ^2.2.1 | AWS service wrappers | Step Functions integration |
| **@verifiedfan/configs** | ^1.1.0 | Configuration management | Application config loading |
| **@verifiedfan/lib** | ^1.6.1 | Core utilities library | Extensive - see breakdown below |
| **@verifiedfan/log** | ^1.4.1 | Logging utilities | Application logging |
| **@verifiedfan/map-utils** | ^1.3.1 | Async mapping utilities | Parallel file operations |
| **@verifiedfan/mongodb** | ^2.1.0 | MongoDB client wrapper | Data persistence |
| **@verifiedfan/prometheus** | ^2.0.4 | Prometheus metrics | Monitoring/observability |
| **@verifiedfan/titan-request** | ^2.0.2 | Titan service HTTP client | Service-to-service calls |
| **@verifiedfan/tracing** | ^2.0.2 | Distributed tracing utilities | OpenTracing instrumentation |

## @verifiedfan/* Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@verifiedfan/cucumber-features** | ^1.2.0 | BDD testing utilities |
| **@verifiedfan/test-utils** | ^3.2.0 | Testing helpers |

## Detailed Usage Analysis

### @verifiedfan/lib (Most Heavily Used)
This is the most critical internal dependency. Used for:

**Modules imported:**
- `selectors` - Data extraction/selection (used in 5+ files)
- `middlewares` - Koa middleware (6+ files)
- `error` - Error handling utilities
- `jwt` - JWT authentication
- `paramUtils` - Parameter validation
- `date` - Date utilities
- `tracingUtils` - Tracing helpers
- `testUtils` - Testing utilities
- `validators` - Data validation
- `Config` - Configuration loading
- `Runfile` / `Objects` / `Build` - Build tooling

**Files using @verifiedfan/lib:**
- `runfile.js` - Build automation
- `build/features.js` - Feature build
- `lib/config.spec.js` - Config tests
- `app/router/images.js` - Image upload routes
- `app/router/trigger.js` - Trigger routes
- `app/router/files.js` - File upload routes
- `lib/KoaCtxToManagerCtx.js` - Context transformation
- `lib/middlewares/*.js` - Multiple middleware files
- `features/step_definitions/*.js` - Test definitions
- `tools/jwt/*.js` - JWT tooling
- `app/managers/files/*.js` - File managers

### @verifiedfan/prometheus
**Usage:**
- `lib/collectDefaultPrometheusMetrics.js` - Default metrics
- `lib/Router/index.js` - Router instrumentation
- `app/datastore/mongo/instrumentFn.js` - MongoDB instrumentation

**Imports:**
- `Prometheus` - Main client
- `makeMetricName` - Metric naming
- `enums` - Metric type enums

### @verifiedfan/tracing
**Usage:**
- `lib/InstrumentedAsyncOperation.js` - Async operation tracing
- `lib/middlewares/tracing/index.js` - Tracing middleware

**Imports:**
- `utils` - Tracing utilities
- `tracingUtils` - Helper functions
- `date`, `selectors` - Supporting utilities

### @verifiedfan/mongodb
**Usage:**
- `app/datastore/mongo/index.js` - Primary datastore

**Pattern:**
- Default import: `import Mongo from '@verifiedfan/mongodb'`
- Single connection manager for the service

### @verifiedfan/map-utils
**Usage:**
- `app/managers/files/listData.js` - Parallel file data fetching

**Imports:**
- `MapAsyncParallel` - Parallel async mapping

### @verifiedfan/aws
**Usage:**
- `app/services/stepFunctions/index.js` - AWS Step Functions client

**Pattern:**
- Default import: `import aws from '@verifiedfan/aws'`

### @verifiedfan/configs
**Purpose:**
- Configuration management and loading
- Version: ^1.1.0

**Expected Usage:**
- Application configuration bootstrapping
- Environment-specific settings

### @verifiedfan/log
**Purpose:**
- Structured logging
- Version: ^1.4.1

**Expected Usage:**
- Application-wide logging
- Request/response logging

### @verifiedfan/titan-request
**Purpose:**
- HTTP client for Titan service calls
- Version: ^2.0.2

**Expected Usage:**
- Inter-service communication
- Service mesh integration

## Dev-Only Internal Packages

### @verifiedfan/cucumber-features
**Usage:**
- `features/step_definitions/images.js` - BDD test steps

**Imports:**
- `expect` - Assertion helpers
- `LONG_TIMEOUT` - Test timeout constants

### @verifiedfan/test-utils
**Usage:**
- `features/step_definitions/images.js` - Test utilities
- `tools/jwt/generateToken.js` - Token generation

**Pattern:**
- Provides testing helpers and mocks
- JWT generation for test scenarios

## Coupling Analysis

### High Coupling
The service is **heavily coupled** to the @verifiedfan ecosystem:

**Critical Dependencies:**
1. **@verifiedfan/lib** - Core utilities permeate the entire codebase
2. **@verifiedfan/mongodb** - Data layer entirely dependent on wrapper
3. **@verifiedfan/prometheus** - Observability tightly integrated
4. **@verifiedfan/tracing** - Distributed tracing infrastructure

### Moderate Coupling
These could potentially be replaced but would require effort:
- **@verifiedfan/aws** - Step Functions wrapper (could use aws-sdk directly)
- **@verifiedfan/map-utils** - Async utilities (could use Promise.all)
- **@verifiedfan/titan-request** - HTTP client (could use generic client)

### Low Coupling
Configuration and logging abstractions:
- **@verifiedfan/configs** - Config loading
- **@verifiedfan/log** - Logging facade

## Version Consistency

All internal packages use caret (^) versioning, allowing automatic minor/patch updates:
- This promotes staying current with internal library improvements
- Risk: Breaking changes in minor versions could cause issues
- Mitigation: Internal packages should follow semantic versioning strictly

## Internal Package Version Summary

**Production:**
- AWS: 2.2.1
- Configs: 1.1.0
- Lib: 1.6.1
- Log: 1.4.1
- Map Utils: 1.3.1
- MongoDB: 2.1.0
- Prometheus: 2.0.4
- Titan Request: 2.0.2
- Tracing: 2.0.2

**Development:**
- Cucumber Features: 1.2.0
- Test Utils: 3.2.0

Most packages are on version 2.x, suggesting a mature internal ecosystem.
