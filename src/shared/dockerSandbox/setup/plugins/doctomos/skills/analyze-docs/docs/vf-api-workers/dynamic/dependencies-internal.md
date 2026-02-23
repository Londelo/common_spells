# Internal Dependencies - vf-api-workers

## @verifiedfan/* Packages

| Package | Version | Purpose | Usage Level |
|---------|---------|---------|-------------|
| **@verifiedfan/aws** | ^2.11.1 | AWS service integrations (S3, DynamoDB, Kinesis, SQS) | **HIGH** - Core infrastructure |
| **@verifiedfan/configs** | ^1.2.4 | Configuration management system | **HIGH** - Used 2+ times |
| **@verifiedfan/request** | ^3.5.1 | HTTP request utilities | **HIGH** - API communication |
| **@verifiedfan/titan-request** | ^2.0.21 | Titan service request client | **HIGH** - Internal service calls |
| **@verifiedfan/map-utils** | ^1.3.1 | Functional mapping utilities (MapAsyncParallel, MapAsyncSerial) | **HIGH** - Used 5+ times |
| **@verifiedfan/date** | ^1.2.1 | Date/time utilities (toISOString, toSeconds, etc.) | **HIGH** - Used 5+ times |
| **@verifiedfan/cloudwatch-stdout** | ^2.0.0 | CloudWatch metrics and logging | **MEDIUM** - Used 5+ times |
| **@verifiedfan/delay** | ^1.2.6 | Promise delay utilities | **MEDIUM** - Used 3+ times |
| **@verifiedfan/batch-fn** | ^1.2.1 | Batch processing functions | **MEDIUM** - Used 4+ times |
| **@verifiedfan/tracing** | 3.0.1 | OpenTelemetry tracing integration | **MEDIUM** - Observability |
| **@verifiedfan/schemas** | ^1.3.1 | Schema validation | **MEDIUM** - Used 2+ times |
| **@verifiedfan/kafka** | ^1.1.3 | Kafka integration with schema registry | **MEDIUM** - Event streaming |
| **@verifiedfan/log** | ^1.4.1 | Logging utilities | **LOW** - Used 1 time |
| **@verifiedfan/slack** | ^1.1.0 | Slack integration | **LOW** - Used 1 time |
| **@verifiedfan/normalizers** | ^1.4.0 | Data normalization utilities (email, etc.) | **LOW** - Used 1 time |
| **@verifiedfan/yaml** | ^1.2.1 | YAML parsing utilities | **LOW** - Configuration |
| **@verifiedfan/batch-transform-stream** | ^0.3.1 | Stream transformation for batches | **LOW** - Used 1 time |

### Dev/Test Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| **@verifiedfan/cucumber-features** | ^0.45.0 | Shared BDD test features |
| **@verifiedfan/test-utils** | ^2.10.0 | Testing utilities and helpers |

## Coupling Analysis

### High Coupling
This repository has **strong coupling** to the VerifiedFan internal ecosystem:

1. **AWS Infrastructure** - Deep dependency on @verifiedfan/aws for all AWS operations
2. **Configuration System** - Relies on centralized @verifiedfan/configs
3. **Service Communication** - Tightly coupled via @verifiedfan/titan-request for internal API calls
4. **Observability Stack** - Standardized on @verifiedfan/tracing and @verifiedfan/cloudwatch-stdout

### Shared Patterns
Common patterns across the codebase leveraging internal packages:

1. **Functional Programming** - Heavy use of @verifiedfan/map-utils for async operations
2. **Batch Processing** - @verifiedfan/batch-fn and @verifiedfan/batch-transform-stream for data processing
3. **Date Handling** - @verifiedfan/date standardizes date operations
4. **Retry Logic** - Combination of @verifiedfan/delay and async-retry for resilience

### Architectural Implications

**Benefits:**
- Consistent patterns across VerifiedFan services
- Shared utilities reduce code duplication
- Centralized updates for common functionality

**Risks:**
- High dependency on internal package maintenance
- Breaking changes in internal packages impact multiple workers
- Difficult to extract or open-source individual workers
- Version drift across packages (e.g., tracing at 3.0.1 without caret)

### Package Version Strategy

**Mostly Flexible:**
- Most packages use caret ranges (^) allowing minor/patch updates
- Exception: **@verifiedfan/tracing** is pinned at `3.0.1` (no caret)
  - This suggests intentional version locking, possibly due to breaking changes

**Version Ranges:**
- All other @verifiedfan/* packages use `^` (flexible)
- This allows automatic minor and patch updates while preventing breaking major updates

## Dependency Graph

```
vf-api-workers
├── Infrastructure Layer
│   ├── @verifiedfan/aws (DynamoDB, S3, Kinesis, SQS)
│   ├── @verifiedfan/configs (Configuration)
│   └── @verifiedfan/cloudwatch-stdout (Metrics)
│
├── Service Communication Layer
│   ├── @verifiedfan/request (HTTP)
│   ├── @verifiedfan/titan-request (Internal APIs)
│   └── @verifiedfan/kafka (Event Streaming)
│
├── Data Processing Layer
│   ├── @verifiedfan/batch-fn (Batch Processing)
│   ├── @verifiedfan/batch-transform-stream (Stream Processing)
│   ├── @verifiedfan/map-utils (Async Operations)
│   └── @verifiedfan/normalizers (Data Normalization)
│
├── Utilities Layer
│   ├── @verifiedfan/date (Date/Time)
│   ├── @verifiedfan/delay (Async Delays)
│   ├── @verifiedfan/schemas (Validation)
│   ├── @verifiedfan/yaml (Config Parsing)
│   └── @verifiedfan/log (Logging)
│
├── Observability Layer
│   └── @verifiedfan/tracing (OpenTelemetry)
│
└── Integration Layer
    └── @verifiedfan/slack (Notifications)
```

## Recommendations

1. **Unpin @verifiedfan/tracing** - Investigate why tracing is pinned at `3.0.1`. If no longer needed, add caret range.
2. **Version Alignment** - Consider aligning package versions across the VerifiedFan ecosystem for easier dependency management.
3. **Deprecation Plan** - Monitor internal package deprecations and plan migrations proactively.
4. **Documentation** - Maintain changelog for breaking changes in @verifiedfan/* packages to avoid surprise breakages.
