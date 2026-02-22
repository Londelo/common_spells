# Internal Dependencies - ccpa-workers

## @verifiedfan/* Production Packages

| Package | Version | Purpose | Verified Usage |
|---------|---------|---------|----------------|
| @verifiedfan/aws | ^2.13.0 | AWS service clients (S3, SQS, DynamoDB, Athena, SecretsManager) | ✓ Used in `/shared/services/aws/` |
| @verifiedfan/batch-fn | ^1.2.1 | Batch processing utilities | Not directly verified |
| @verifiedfan/batch-transform-stream | ^0.3.1 | Stream transformation for batch operations | Not directly verified |
| @verifiedfan/cloudwatch-stdout | ^2.1.0 | CloudWatch logging integration | Not directly verified |
| @verifiedfan/configs | ^1.2.4 | Configuration management | Not directly verified |
| @verifiedfan/date | ^1.2.1 | Date/time utilities | Not directly verified |
| @verifiedfan/delay | ^1.2.6 | Promise delay utilities | ✓ Used in `/shared/middlewares/telemetry.ts` |
| @verifiedfan/kafka | ^1.1.3 | Kafka client and utilities | Not directly verified |
| @verifiedfan/log | ^1.4.1 | Logging utilities | Not directly verified |
| @verifiedfan/map-utils | ^1.3.1 | Map/object utilities | Not directly verified |
| @verifiedfan/mongodb | ^2.1.0 | MongoDB client wrapper | Not directly verified |
| @verifiedfan/request | ^3.5.1 | HTTP request client | ✓ Used in `/shared/services/request/` |
| @verifiedfan/schemas | ^1.3.1 | Shared data schemas | Not directly verified |
| @verifiedfan/tracing | 3.0.1 | Distributed tracing (OpenTelemetry) | ✓ Used in `/shared/middlewares/telemetry.ts` |
| @verifiedfan/yaml | ^1.2.1 | YAML parsing utilities | Not directly verified |

## @verifiedfan/* Dev Packages

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/cucumber-features | ^1.2.5 | Shared Cucumber test features |
| @verifiedfan/slack | ^2.0.0 | Slack integration utilities |
| @verifiedfan/test-utils | ^3.4.2 | Shared testing utilities |

## Coupling Analysis

### High Coupling Areas

**Observability & Infrastructure** (Tight Coupling)
- `@verifiedfan/tracing` (3.0.1): Core telemetry middleware depends on this
- `@verifiedfan/aws` (^2.13.0): Primary AWS service interface
- `@verifiedfan/request` (^3.5.1): Standard HTTP client

These packages form the infrastructure backbone and are deeply integrated.

**Utilities** (Moderate Coupling)
- `@verifiedfan/delay`: Used in telemetry retry logic
- `@verifiedfan/date`, `@verifiedfan/map-utils`, `@verifiedfan/yaml`: General utilities

**Data Layer** (Domain-Specific Coupling)
- `@verifiedfan/mongodb` (^2.1.0): Database access
- `@verifiedfan/schemas` (^1.3.1): Shared data contracts
- `@verifiedfan/kafka` (^1.1.3): Event streaming

### Internal Package Usage Patterns

**Telemetry Middleware** (`/shared/middlewares/telemetry.ts`)
```typescript
import GlobalTracer, { traceUtils } from '@verifiedfan/tracing';
import delay from '@verifiedfan/delay';
```
This middleware is the primary integration point for observability.

**AWS Services** (`/shared/services/aws/`)
```typescript
import { S3, SQS, DynamoDB, Athena, SecretsManager } from '@verifiedfan/aws/types';
```
Typed AWS client wrappers for type-safe service access.

**Request Service** (`/shared/services/request/`)
```typescript
import request from '@verifiedfan/request';
```
Standard HTTP client for external API calls.

### Dependency Graph Insights

1. **Core Services Layer**: `@verifiedfan/aws`, `@verifiedfan/mongodb`, `@verifiedfan/kafka`
2. **Observability Layer**: `@verifiedfan/tracing`, `@verifiedfan/cloudwatch-stdout`, `@verifiedfan/log`
3. **Utility Layer**: `@verifiedfan/delay`, `@verifiedfan/date`, `@verifiedfan/map-utils`, `@verifiedfan/yaml`
4. **Data Layer**: `@verifiedfan/schemas`, `@verifiedfan/batch-fn`, `@verifiedfan/batch-transform-stream`

### Version Pinning Note

- Most packages use caret (`^`) versioning, allowing minor/patch updates
- Exception: `@verifiedfan/tracing` is pinned to exact version `3.0.1` (no `^`)
  - This suggests API stability concerns or known breaking changes in newer versions

## Recommendations

### Verify Unused Dependencies
Several packages are declared but not confirmed in code scanning:
- `@verifiedfan/batch-fn`
- `@verifiedfan/batch-transform-stream`
- `@verifiedfan/cloudwatch-stdout`
- `@verifiedfan/configs`
- `@verifiedfan/date`
- `@verifiedfan/kafka`
- `@verifiedfan/log`
- `@verifiedfan/map-utils`
- `@verifiedfan/mongodb`
- `@verifiedfan/schemas`
- `@verifiedfan/yaml`

These may be:
1. Used in non-TypeScript files (JavaScript tools, config files)
2. Dynamically imported
3. Transitive dependencies that should be removed
4. Used in areas not scanned (e.g., `/tools/`, `/features/`)

### Investigate Tracing Version Pin
The exact version pin on `@verifiedfan/tracing` (3.0.1) should be reviewed:
- Check if newer versions are available
- Understand why the pin was added
- Consider updating if safe
