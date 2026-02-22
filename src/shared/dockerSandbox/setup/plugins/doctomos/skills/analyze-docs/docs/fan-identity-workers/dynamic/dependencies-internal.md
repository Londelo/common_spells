# Internal Dependencies - fan-identity-workers

Generated: 2026-02-16

## @verifiedfan/* Packages

| Package | Version | Purpose | Domain |
|---------|---------|---------|--------|
| `@verifiedfan/aws` | ^2.11.1 | AWS service wrappers (DynamoDB, SQS, Kinesis) | Infrastructure |
| `@verifiedfan/batch-fn` | ^1.2.1 | Batch processing utilities | Data Processing |
| `@verifiedfan/cloudwatch-stdout` | ^2.0.0 | CloudWatch logging integration | Monitoring |
| `@verifiedfan/configs` | ^1.2.4 | Configuration management (YAML-based) | Configuration |
| `@verifiedfan/date` | ^1.2.1 | Date/time utilities | Utility |
| `@verifiedfan/delay` | ^1.2.6 | Promise delay utilities | Utility |
| `@verifiedfan/kafka` | ^3.0.0 | Kafka consumer/producer wrapper | Messaging |
| `@verifiedfan/log` | ^1.4.1 | Structured logging | Monitoring |
| `@verifiedfan/map-utils` | ^1.3.1 | Map/collection utilities | Utility |
| `@verifiedfan/redis` | ^2.0.2 | Redis client wrapper | Caching |
| `@verifiedfan/request` | ^3.6.0 | HTTP request utilities with retry | HTTP |
| `@verifiedfan/schemas` | ^1.3.1 | Shared data schemas and validation | Data Model |
| `@verifiedfan/tm-accounts` | ^2.2.0 | Ticketmaster accounts API client | Integration |
| `@verifiedfan/tracing` | 3.0.1 | OpenTelemetry tracing utilities | Monitoring |
| `@verifiedfan/yaml` | ^1.2.1 | YAML parsing utilities | Configuration |

### Development-Only Internal Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@verifiedfan/cucumber-features` | ^1.0.1 | Shared Cucumber test features |
| `@verifiedfan/test-utils` | ^2.3.2 | Testing utilities and fixtures |

## Usage Analysis

### Verified Usage (via grep)

17 TypeScript files import `@verifiedfan/*` packages:

**Services Layer:**
- `shared/services/request/index.ts` - Uses `@verifiedfan/request`
- `shared/services/tmAccounts/index.ts` - Uses `@verifiedfan/tm-accounts`
- `shared/services/aws/index.ts` - Uses `@verifiedfan/aws`
- `shared/services/queue/QueueManager.ts` - Uses `@verifiedfan/aws`, `@verifiedfan/batch-fn`

**Middleware:**
- `shared/middlewares/telemetry.ts` - Uses `@verifiedfan/tracing`

**Utilities:**
- `shared/util/date.ts` - Uses `@verifiedfan/date`
- `shared/scoring/SaveRescoreUsers.ts` - Uses `@verifiedfan/aws`

**Workers:**
- `apps/scoring/scoreUsers/ProcessAccountScores.ts` - Uses `@verifiedfan/delay`
- `apps/scoring/lookupArai/LookupAndCacheArai.ts` - Uses `@verifiedfan/batch-fn`
- `apps/botornot/startBotOrNotImport/index.ts` - Uses `@verifiedfan/aws`
- `apps/clustering/startClusterImport/index.ts` - Uses `@verifiedfan/aws`

**Test Files:**
- Multiple `*.spec.ts` files use `@verifiedfan/test-utils`

## Coupling Analysis

### High Coupling

**Infrastructure Layer (Tight Coupling):**
- `@verifiedfan/aws` - Critical dependency for all AWS service interactions
- `@verifiedfan/tracing` - Core telemetry, injected into all workers via middleware
- `@verifiedfan/log` - Standard logging used throughout codebase
- `@verifiedfan/configs` - Configuration system foundation

**Business Logic (Moderate Coupling):**
- `@verifiedfan/tm-accounts` - Ticketmaster accounts service integration (scoring domain)
- `@verifiedfan/request` - HTTP client wrapper used for external API calls
- `@verifiedfan/kafka` - Messaging layer for event-driven architecture

### Moderate Coupling

**Utility Layer:**
- `@verifiedfan/batch-fn` - Used in specific workers for batch processing
- `@verifiedfan/delay` - Used for rate limiting and backoff strategies
- `@verifiedfan/date` - Date utilities abstraction over moment.js
- `@verifiedfan/map-utils` - Collection utilities

### Low Coupling

**Optional Services:**
- `@verifiedfan/redis` - Caching layer (not used in all workers)
- `@verifiedfan/schemas` - Shared schemas (used for validation)
- `@verifiedfan/yaml` - Configuration parsing (indirect via configs)

## Dependency Graph

```
fan-identity-workers
├── Core Infrastructure (Required)
│   ├── @verifiedfan/aws (DynamoDB, SQS, Kinesis)
│   ├── @verifiedfan/tracing (OpenTelemetry)
│   ├── @verifiedfan/log (Structured logging)
│   └── @verifiedfan/configs (Configuration)
│
├── Messaging & Integration (Required)
│   ├── @verifiedfan/kafka (Event streams)
│   ├── @verifiedfan/tm-accounts (TM API)
│   └── @verifiedfan/request (HTTP client)
│
├── Data Processing (Conditional)
│   ├── @verifiedfan/batch-fn (Batch operations)
│   ├── @verifiedfan/schemas (Validation)
│   └── @verifiedfan/redis (Caching)
│
└── Utilities (Optional)
    ├── @verifiedfan/date (Date/time)
    ├── @verifiedfan/delay (Async control)
    ├── @verifiedfan/map-utils (Collections)
    └── @verifiedfan/yaml (YAML parsing)
```

## Version Consistency

All `@verifiedfan/*` packages use semantic versioning with caret (^) ranges, allowing minor and patch updates.

**Latest versions in use:**
- Infrastructure packages: v2.x-3.x (mature)
- Utility packages: v1.x (stable)
- Testing packages: v1.x-2.x (stable)

## Migration Considerations

If this repository needs to be decoupled from internal packages:

**High-Impact Changes:**
1. `@verifiedfan/aws` → Direct AWS SDK usage (17+ files affected)
2. `@verifiedfan/tracing` → Direct OpenTelemetry setup (middleware changes)
3. `@verifiedfan/configs` → Alternative config system (architecture change)

**Moderate-Impact Changes:**
4. `@verifiedfan/log` → Winston/Pino (logging changes)
5. `@verifiedfan/tm-accounts` → Direct API calls (service layer)
6. `@verifiedfan/kafka` → kafkajs direct usage

**Low-Impact Changes:**
7. Utility packages → Inline or replace with standard libraries

## Security Notes

- All internal packages are private npm packages (hosted internally)
- No external registry exposure
- Version updates controlled through internal package publishing
- Security patches propagate through version updates
