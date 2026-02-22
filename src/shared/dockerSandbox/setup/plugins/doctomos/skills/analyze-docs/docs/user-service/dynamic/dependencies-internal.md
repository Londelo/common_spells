# Internal Dependencies - user-service

## @verifiedfan/* Packages

| Package | Version | Purpose | Usage Pattern |
|---------|---------|---------|---------------|
| @verifiedfan/access-log | ^1.4.0 | Request access logging middleware | Used in lib/middlewares/accessLog.js |
| @verifiedfan/configs | ^1.2.4 | Configuration management | Likely used for shared configs |
| @verifiedfan/date | ^1.2.1 | Date/time utilities | Used for timestamps, time calculations (now, timeInMilliseconds, millisElapsedSince) |
| @verifiedfan/lib | ^1.6.2 | Core library utilities | **Heavy usage** - jwt, selectors, normalizers, paramUtils, error, validators, pagingUtils, permissions, testUtils, Facebook, Config, SchemaValidator |
| @verifiedfan/log | ^1.4.1 | Logging utilities | Used throughout for structured logging |
| @verifiedfan/mongodb | ^2.1.0 | MongoDB utilities and enums | Used for database operations and constants |
| @verifiedfan/normalizers | ^1.3.3 | Data normalization utilities | Used for contact normalization, ticketmaster data normalization |
| @verifiedfan/prometheus | ^2.0.4 | Prometheus metrics collection | Used for monitoring (Prometheus, makeMetricName, enums, TimedRequest, TimedSdk) |
| @verifiedfan/titan-request | ^2.0.2 | HTTP request wrapper for Titan services | Used for inter-service communication |
| @verifiedfan/tm-wallet | ^1.1.0 | Ticketmaster wallet integration | Used in app/managers/users/wallet.js |
| @verifiedfan/tracing | ^3.0.1 | Distributed tracing utilities | Used for OpenTelemetry tracing (TracedSdk, TracedRequest, TracedAsyncFn, GlobalTracer, traceUtils) |

## Dev/Test Dependencies

| Package | Version | Purpose | Usage Pattern |
|---------|---------|---------|---------------|
| @verifiedfan/cucumber-features | ^1.2.0 | Shared Cucumber step definitions | Used in features/cucumberSetup.js, provides Mongo utilities |
| @verifiedfan/test-utils | ^3.2.0 | Testing utilities | **Heavy usage** - Used extensively in feature tests for generating test data (generateToken, generateMongoObjectIdAsString, generateGlobalUserId, testUtils) |
| @verifiedfan/tm-accounts | ^2.2.0 | Ticketmaster accounts utilities | Used in features/lib/identity/index.js for test setup |

## Coupling Analysis

### High Coupling - Critical Dependencies

**@verifiedfan/lib** (Most Critical)
- Imported in 30+ files
- Provides core functionality: jwt, selectors, normalizers, error handling, validators, permissions
- Heavy functional dependency - removing would require significant refactoring
- Used across all layers: managers, routers, middlewares, services

**@verifiedfan/tracing** (Observability)
- Used for distributed tracing across services
- Wraps service calls and async operations
- Critical for production monitoring

**@verifiedfan/prometheus** (Monitoring)
- Used for metrics collection
- Instruments HTTP requests, database operations, external service calls
- Essential for production observability

**@verifiedfan/mongodb** (Data Layer)
- Core data persistence layer
- Provides connection management and MongoDB enums

### Medium Coupling

**@verifiedfan/log**
- Standard logging throughout
- Could be replaced but would require updating many files

**@verifiedfan/date**
- Time/date utilities used in multiple places
- Provides consistency across time handling

**@verifiedfan/normalizers**
- Data normalization for contacts and external APIs
- Used in specific domains (user contacts, ticketmaster integration)

**@verifiedfan/titan-request**
- Used for inter-service communication
- Medium coupling - only used in service layer

### Low Coupling

**@verifiedfan/access-log**
- Single middleware usage
- Easy to replace or remove

**@verifiedfan/configs**
- Configuration management
- Limited direct usage in code

**@verifiedfan/tm-wallet**
- Used only in wallet manager
- Domain-specific, isolated usage

### Test Infrastructure Coupling

**@verifiedfan/test-utils** and **@verifiedfan/cucumber-features**
- Heavy usage in test/feature files
- Not production code, but essential for testing
- Provides shared test data generators and step definitions

## Internal Package Version Consistency

Most internal packages are at relatively current versions (2023-2024 based on version numbers), suggesting active maintenance. However, the service should regularly update these to get bug fixes and new features.

## Architectural Impact

This service is **tightly integrated** with the VerifiedFan/Titan ecosystem:

1. **Authentication & Authorization**: Heavily dependent on @verifiedfan/lib for JWT and permissions
2. **Observability**: Fully integrated with Prometheus and OpenTelemetry via @verifiedfan packages
3. **Data Layer**: Uses @verifiedfan/mongodb for persistence
4. **Inter-Service Communication**: Uses @verifiedfan/titan-request
5. **Testing Infrastructure**: Shares test utilities and feature definitions

**Portability**: Low - This service would require significant refactoring to operate outside the VerifiedFan/Titan ecosystem.

**Maintainability**: Depends on keeping internal packages up to date. Any breaking changes in @verifiedfan/lib would have wide-reaching impact.
