# Internal Dependencies - monoql

## @verifiedfan/* Packages

### Production Dependencies

| Package | Version | Purpose | Usage Verified |
|---------|---------|---------|----------------|
| @verifiedfan/access-log | ^1.4.0 | Access logging middleware | ✅ Yes (lib/middlewares/accessLog.js) |
| @verifiedfan/date | ^1.2.1 | Date/time utilities with timezone support | ✅ Yes (features/templates/newCampaign.js, app/graphql/schema/resolvers/Wave/*.js) |
| @verifiedfan/lib | ^1.6.1 | Core shared library (Config, JWT, selectors, validators, middlewares) | ✅ Yes (extensive usage throughout) |
| @verifiedfan/log | ^1.4.1 | Logging utilities | ✅ Yes (lib/Log.js) |
| @verifiedfan/map-utils | ^1.3.1 | Map/collection utility functions (MapAsyncParallel) | ✅ Yes (features/step_definitions/waves.js, exports.js) |
| @verifiedfan/prometheus | ^2.0.5 | Prometheus metrics collection | ✅ Yes (lib/collectDefaultPrometheusMetrics.js, lib/Router/index.js, app/services/InstrumentServices.js) |
| @verifiedfan/titan-request | ^2.0.4 | HTTP request utilities for Titan services | ✅ Yes (app/services/InstrumentServices.js) |
| @verifiedfan/tracing | ^3.0.1 | Distributed tracing utilities (TracedAsyncFn, TracedSdk, GlobalTracer) | ✅ Yes (lib/InstrumentedAsyncOperation.js, lib/middlewares/telemetry.js, app/services/InstrumentServices.js) |

### Development Dependencies

| Package | Version | Purpose | Usage Verified |
|---------|---------|---------|----------------|
| @verifiedfan/cucumber-features | ^1.0.4 | Shared Cucumber testing utilities (timeouts, enums, utils) | ✅ Yes (features/step_definitions/*.js) |
| @verifiedfan/test-utils | ^3.8.1 | Testing utilities and helpers | ✅ Yes (features/step_definitions/campaign.js, tools/jwt/generateToken.js, features/lib/clients/index.js) |
| @verifiedfan/tm-accounts | ^2.3.0 | TM accounts integration for testing | ⚠️ Not found in grep (likely used in test setup) |

## Coupling Analysis

### High Coupling

**@verifiedfan/lib** is the most heavily used internal dependency:
- Config management throughout the app
- JWT handling (authentication/authorization)
- Middleware stack (correlation, error formatting, response formatting)
- Selectors for context extraction
- Error handling utilities
- Validators

**Usage locations:**
- `runfile.js` - Build system configuration
- `lib/config.js` - Application configuration
- `lib/middlewares/*.js` - Multiple middleware components
- `app/context/selectors/*.js` - Context extraction
- `app/graphql/schema/resolvers/*.js` - GraphQL resolvers
- `tools/jwt/*.js` - JWT utilities

### Medium Coupling

**@verifiedfan/tracing** - Core observability:
- Distributed tracing wrapper for async operations
- Request tracing for external services
- SDK instrumentation
- Used in: instrumentation layer, telemetry middleware, service clients

**@verifiedfan/prometheus** - Metrics collection:
- Custom metrics registration
- HTTP request/response metrics
- Service call timing
- Used in: metrics middleware, router instrumentation, service clients

### Low Coupling

**@verifiedfan/date** - Date utilities:
- Used primarily in Wave resolvers for notification scheduling
- Campaign date handling
- Isolated to specific business logic

**@verifiedfan/map-utils** - Async utilities:
- MapAsyncParallel for concurrent operations
- Used in: Wave operations, export processing
- Limited to specific async batch operations

**@verifiedfan/access-log** - Access logging:
- Single integration point in middleware
- Standardized access log format
- Easy to replace if needed

## Architecture Implications

### Core Infrastructure Stack
The service is tightly integrated with VerifiedFan's infrastructure:
- **Observability:** tracing + prometheus + access-log provide full observability stack
- **Configuration:** Centralized through @verifiedfan/lib Config
- **Authentication:** JWT handling through @verifiedfan/lib
- **HTTP Requests:** Instrumented requests through titan-request

### Service Mesh Integration
The dependency stack suggests this is part of a larger microservices architecture:
- Distributed tracing integration (OpenTelemetry + @verifiedfan/tracing)
- Prometheus metrics for service discovery/monitoring
- Standardized request instrumentation
- Correlation ID propagation

### Testing Infrastructure
Strong testing coupling through:
- Shared Cucumber features and step definitions
- Common test utilities
- TM accounts integration for integration testing

## Migration Considerations

If this service needs to be decoupled or migrated:

**High Risk (extensive refactoring required):**
- @verifiedfan/lib - Used in 20+ files across middleware, config, auth, validation
- @verifiedfan/tracing - Core to observability, used in 5+ locations
- @verifiedfan/prometheus - Embedded in middleware and service layers

**Medium Risk (moderate refactoring):**
- @verifiedfan/titan-request - Service communication layer
- @verifiedfan/date - Business logic dependency in Wave management

**Low Risk (easy to replace):**
- @verifiedfan/access-log - Single integration point
- @verifiedfan/map-utils - Standard async utilities
- @verifiedfan/log - Logging abstraction
