# Internal Dependencies - entry-service

## @verifiedfan/* Production Packages

| Package | Version | Purpose | Usage |
|---------|---------|---------|-------|
| @verifiedfan/access-log | ^1.1.1 | Access logging middleware | Middleware for HTTP request/response logging |
| @verifiedfan/aws | ^2.4.0 | AWS utilities and helpers | SQS queues, AppSync client, AWS service integrations |
| @verifiedfan/configs | ^1.2.4 | Configuration management | Application configuration loading |
| @verifiedfan/date | ^1.2.1 | Date manipulation utilities | Telemetry, date normalization |
| @verifiedfan/lib | ^1.6.1 | Core shared library | Selectors, normalizers, JWT, middlewares, utilities |
| @verifiedfan/log | ^1.4.1 | Logging framework | Structured logging throughout application |
| @verifiedfan/mongodb | ^2.1.0 | MongoDB utilities | Database connections and operations |
| @verifiedfan/normalizers | ^1.4.0 | Data normalization utilities | Entry data normalization |
| @verifiedfan/prometheus | ^2.0.4 | Prometheus metrics | Request timing, instrumentation, metrics collection |
| @verifiedfan/request | ^3.2.4 | HTTP request utilities | Signed requests to AppSync |
| @verifiedfan/titan-request | ^2.0.2 | Titan-specific request utilities | Service-to-service communication |
| @verifiedfan/tm-wallet | ^1.3.0 | TM Wallet integration | Wallet functionality |
| @verifiedfan/tracing | ^3.0.1 | Distributed tracing | OpenTelemetry tracing, request/SDK instrumentation |

## @verifiedfan/* Dev Packages

| Package | Version | Purpose | Usage |
|---------|---------|---------|-------|
| @verifiedfan/batch-transform-stream | ^0.3.1 | Stream processing utility | Batch data transformation in tools |
| @verifiedfan/csv-write-stream | ^2.0.2 | CSV writing stream | CSV file generation in tools |
| @verifiedfan/cucumber-features | ^1.2.0 | Shared BDD test features | Integration testing |
| @verifiedfan/map-utils | ^1.3.1 | Map manipulation utilities | Data transformation utilities |
| @verifiedfan/test-utils | ^3.2.0 | Testing utilities | Test helpers and fixtures |
| @verifiedfan/tm-accounts | ^2.3.0 | TM Accounts service client | Account service integration for testing |

## Coupling Analysis

### High Coupling
**@verifiedfan/lib** - Heavily integrated throughout the codebase:
- Middleware system (JWT, error formatting, response formatting, correlation)
- Selectors for data extraction
- Normalizers for data transformation
- Parameter utilities
- Template variables
- SFMC client
- Build utilities

### Medium Coupling
**@verifiedfan/tracing** - Used for observability:
- Global tracer setup
- Request/SDK instrumentation
- Trace utilities in middleware

**@verifiedfan/prometheus** - Metrics infrastructure:
- Router instrumentation
- Request timing
- SDK timing
- Response duration tracking
- Request counters

**@verifiedfan/aws** - Cloud service integration:
- AppSync utilities
- SQS queue management

### Low Coupling
These packages are used in isolated areas:
- **@verifiedfan/access-log**: Single middleware file
- **@verifiedfan/configs**: Configuration loading only
- **@verifiedfan/date**: Telemetry middleware
- **@verifiedfan/mongodb**: Database layer
- **@verifiedfan/normalizers**: Entry normalization
- **@verifiedfan/request**: AppSync service only
- **@verifiedfan/titan-request**: Service instrumentation
- **@verifiedfan/tm-wallet**: Specific wallet features

## Key Integration Points

### Middleware Stack
```
@verifiedfan/tracing → tracing middleware
@verifiedfan/prometheus → metrics middleware
@verifiedfan/access-log → access logging
@verifiedfan/lib → JWT, error/response formatting, correlation
```

### Service Instrumentation
```
@verifiedfan/tracing → TracedSdk, TracedRequest
@verifiedfan/prometheus → TimedRequest, TimedSdk
@verifiedfan/titan-request → Instrumented HTTP client
```

### Data Layer
```
@verifiedfan/mongodb → Database connections
@verifiedfan/normalizers → Entry data normalization
@verifiedfan/lib → Data selectors and normalizers
```

## Dependency Tree Depth

This service has **deep integration** with the VerifiedFan platform:
- 13 production internal packages
- 6 development internal packages
- Particularly dependent on `@verifiedfan/lib` for core functionality

## Upgrade Considerations

**High Impact Upgrades** (require thorough testing):
- @verifiedfan/lib: Core functionality across entire app
- @verifiedfan/tracing: Observability infrastructure
- @verifiedfan/prometheus: Metrics collection

**Medium Impact Upgrades**:
- @verifiedfan/aws: Service integrations
- @verifiedfan/mongodb: Database operations

**Low Impact Upgrades**:
- @verifiedfan/access-log: Isolated middleware
- @verifiedfan/configs: Configuration loading
- Dev dependencies: Testing and tooling
