# Internal Dependencies - reg-workers

## @verifiedfan/* Production Packages

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/aws | ^2.12.1 | AWS SDK utilities (DynamoDB, SQS, SNS, Secrets Manager clients) |
| @verifiedfan/batch-fn | ^1.2.1 | Batch processing utilities for AWS operations (max 25 items/batch for DynamoDB) |
| @verifiedfan/cloudwatch-stdout | ^2.1.0 | CloudWatch Logs integration for stdout/stderr |
| @verifiedfan/configs | ^1.2.4 | Multi-environment configuration management (YAML-based) |
| @verifiedfan/crypto | ^1.0.1 | Cryptographic utilities |
| @verifiedfan/date | ^1.2.1 | Date/time manipulation utilities |
| @verifiedfan/delay | ^1.2.6 | Async delay utilities |
| @verifiedfan/kafka | ^4.0.0 | Kafka client integration for event streaming |
| @verifiedfan/log | ^1.4.1 | Structured logging utilities |
| @verifiedfan/map-utils | ^1.5.0 | Map/object transformation utilities |
| @verifiedfan/mongodb | ^2.1.0 | MongoDB client wrapper |
| @verifiedfan/normalizers | ^1.5.4 | Data normalization utilities (DynamoDB streams, etc.) |
| @verifiedfan/pager-duty | ^1.1.0 | PagerDuty integration for incident management |
| @verifiedfan/redis | ^2.0.2 | Redis client wrapper for caching |
| @verifiedfan/request | ^3.6.0 | HTTP request client (TitanRequest pattern with OpenTelemetry tracing) |
| @verifiedfan/schemas | ^1.3.1 | Shared JSON schemas for data validation |
| @verifiedfan/slack | ^2.0.0 | Slack integration for notifications |
| @verifiedfan/tracing | 3.0.1 | OpenTelemetry tracing middleware and utilities |
| @verifiedfan/yaml | ^1.2.1 | YAML parsing utilities |

**Total Internal Production Dependencies:** 19 packages

## @verifiedfan/* Development Packages

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/cucumber-features | ^1.3.0 | Shared Cucumber step definitions and test utilities |
| @verifiedfan/test-utils | ^3.7.0 | Testing utilities and mocks |
| @verifiedfan/tm-accounts | ^2.0.11 | Ticketmaster accounts integration for testing |

**Total Internal Dev Dependencies:** 3 packages

## Coupling Analysis

### High Coupling Areas

**Infrastructure & Observability (Critical Dependencies)**
- `@verifiedfan/aws` - Core AWS operations (DynamoDB, SQS, SNS)
- `@verifiedfan/tracing` - OpenTelemetry instrumentation (all workers)
- `@verifiedfan/configs` - Configuration management (all workers)
- `@verifiedfan/log` - Logging (all workers)

These packages are deeply integrated into the middleware pattern. Changes to their APIs would require updates across all workers.

**Data Layer (Medium Coupling)**
- `@verifiedfan/mongodb` - Campaign data access
- `@verifiedfan/redis` - Campaign caching
- `@verifiedfan/kafka` - Event streaming (data pipeline domain)
- `@verifiedfan/normalizers` - DynamoDB stream processing (replication domain)

Used in specific domains. Changes would affect multiple workers within those domains.

**HTTP Communication (Medium Coupling)**
- `@verifiedfan/request` - All external service calls (Entry Service, User Service, Campaign Service, Code Service)

Used across all domains for service-to-service communication. Critical for microservices integration.

**Utilities (Low Coupling)**
- `@verifiedfan/batch-fn` - Batch processing helper
- `@verifiedfan/delay` - Async delays
- `@verifiedfan/date` - Date utilities
- `@verifiedfan/crypto` - Cryptographic operations
- `@verifiedfan/map-utils` - Data transformations
- `@verifiedfan/yaml` - Config parsing
- `@verifiedfan/schemas` - Schema validation

Used sporadically. Can be easily replaced if needed.

**Alerting (Low Coupling)**
- `@verifiedfan/pager-duty` - Incident management
- `@verifiedfan/slack` - Notifications

Used for operational alerts. Non-critical for business logic.

### Dependency Graph

```
Registration Workers
├── Core Runtime Layer
│   ├── @verifiedfan/configs (config management)
│   ├── @verifiedfan/tracing (observability)
│   └── @verifiedfan/log (logging)
├── AWS Integration Layer
│   ├── @verifiedfan/aws (SDK wrappers)
│   ├── @verifiedfan/batch-fn (batch processing)
│   ├── @verifiedfan/cloudwatch-stdout (logs)
│   └── @verifiedfan/normalizers (stream processing)
├── Data Store Layer
│   ├── @verifiedfan/mongodb (campaign data)
│   ├── @verifiedfan/redis (caching)
│   └── @verifiedfan/kafka (event streaming)
├── Service Communication Layer
│   └── @verifiedfan/request (HTTP client with tracing)
├── Utility Layer
│   ├── @verifiedfan/date (date/time)
│   ├── @verifiedfan/delay (async delays)
│   ├── @verifiedfan/crypto (encryption)
│   ├── @verifiedfan/map-utils (transformations)
│   ├── @verifiedfan/yaml (YAML parsing)
│   └── @verifiedfan/schemas (validation)
└── Alerting Layer
    ├── @verifiedfan/pager-duty (incidents)
    └── @verifiedfan/slack (notifications)
```

### Shared Infrastructure Pattern

All internal packages follow common patterns:
- **Immutability** - Functional programming style
- **TypeScript** - Full type safety
- **Configuration-driven** - Environment-aware
- **Observability** - OpenTelemetry integration

This consistency reduces cognitive overhead when working across packages.

### Version Management

All packages use caret (`^`) versioning, allowing minor and patch updates. This is appropriate for internal packages maintained by the same organization.

**Risk:** Breaking changes in internal packages could cascade across all workers. Requires careful semantic versioning and testing.

### Testing Dependencies

Testing packages (`@verifiedfan/cucumber-features`, `@verifiedfan/test-utils`, `@verifiedfan/tm-accounts`) are well-isolated to devDependencies, ensuring they don't bloat production bundles.

## Monorepo Considerations

These packages are likely maintained in separate repositories. Changes to shared packages require:
1. Publishing new version to npm registry
2. Updating version in this repo's package.json
3. Retesting all affected workers
4. Redeploying all affected Lambda functions

Consider adopting a monorepo structure or versioned API contracts to reduce coordination overhead.

## Recommendations

1. **Document API Contracts** - Create interface documentation for high-coupling packages to prevent unexpected breaking changes
2. **Dependency Health Monitoring** - Track updates to internal packages and test compatibility regularly
3. **Version Pinning for Critical Packages** - Consider exact versions (not caret) for `@verifiedfan/configs`, `@verifiedfan/aws`, and `@verifiedfan/tracing` to prevent production surprises
4. **Reduce Coupling** - Evaluate if some utility packages can be replaced with standard npm packages (e.g., `@verifiedfan/date` vs `date-fns`)
5. **Consolidate HTTP Clients** - Ensure all service calls go through `@verifiedfan/request` for consistent tracing and error handling
