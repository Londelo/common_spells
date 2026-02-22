# Architecture Patterns - campaign-workers

## Architecture Style

**Identified Style**: **Serverless + Event-Driven**

**Evidence**:
- **Serverless structure**: Each worker is an independent AWS Lambda function in `apps/{workerName}/` with its own deployment configuration
- **Event-driven triggers**: Workers respond to various AWS event sources (Kinesis streams, S3 events, SQS queues, CloudWatch schedules, SDK invocations)
- **Function-per-purpose**: 16+ specialized Lambda functions, each handling a specific domain task
- **Middleware-based composition**: Middleware pipeline adapts to event source type (defined in `shared/middlewares/types.js`)
- **Infrastructure as Code**: Terraform manages Lambda functions, event source mappings, IAM roles, and CloudWatch alarms

**Why this style**:
This architecture is ideal for a campaign pipeline that:
- Processes high-volume streams of campaign data (Kinesis, Firehose)
- Responds to file uploads (S3 triggers for scored files, wave configs)
- Runs scheduled jobs (stats collection, SMS scheduling)
- Scales elastically with campaign activity

## Design Patterns Used

### 1. Middleware Chain Pattern

**Location**: `shared/middlewares/`

**Implementation**:
- Each worker executes through a composed middleware pipeline
- Middleware order varies by event source type:
  - `kinesisConsumer`: correlation → tracing → transformKinesisRecords → setRecordCorrelations → services → authentication → resultHandler
  - `s3Consumer`: correlation → tracing → transformS3Input → services → authentication → resultHandler
  - `scheduled`: correlation → tracing → services → datastores → authentication → resultHandler
  - `sqsConsumer`: correlation → tracing → transformSQSRecords → setRecordCorrelations → services → SQSResultHandler

**Example** (`shared/middlewares/index.js`):
```javascript
const MiddlewaresByType = workerName => ({
  [MIDDLEWARE_TYPES.KINESIS_CONSUMER]: [
    correlation,
    Tracing({ workerName }),
    transformKinesisRecords,
    setRecordCorrelations,
    services,
    authentication,
    resultHandler
  ],
  // ... other middleware chains
});
```

**Purpose**: Standardizes cross-cutting concerns (tracing, input transformation, service injection) while allowing event-source-specific handling.

### 2. Functional Composition Pattern (Ramda Pipes)

**Location**: Throughout worker implementations (e.g., `apps/saveCampaignData/index.js`, `apps/transformCodeAssignments/index.js`)

**Implementation**: Uses Ramda's `R.pipe` and `R.pipeP` (promise-based pipe) to compose data transformation pipelines.

**Example** (`apps/saveCampaignData/index.js`):
```javascript
const saveCampaignData = ({ Services, input, correlation }) => R.pipeP(
  () => Promise.resolve(input),
  R.filter(isRecordTypeValid),
  R.map(formatRecord),
  R.groupBy(selectType),
  R.mapObjIndexed((records, recordType) => ({
    recordType,
    ...encodeRecordsByType({ recordType, records })
  })),
  Object.values,
  MapAsyncParallel(saveEncodedStreamByType),
  R.sum,
  formatResult
)();
```

**Purpose**: Creates readable, testable data transformation pipelines with clear data flow.

### 3. Service Locator Pattern

**Location**: `shared/services/index.js`, `shared/middlewares/services.js`

**Implementation**:
- Services middleware injects all external service clients into worker context
- Workers receive `Services` object with AWS clients (S3, Kinesis, DynamoDB), HTTP clients (campaigns, codes, entries, users), and third-party integrations (Slack, SFMC, SMS)

**Example**:
```javascript
const services = async() => {
  const aws = AWSClients({ namespace: REPO_NAMESPACE });
  const request = InstrumentedRequest({ request: _request });

  return {
    aws,
    request,
    campaigns: campaigns(request),
    codes: codes(request),
    entries: entries(request),
    slack: slack(),
    // ... other services
  };
};
```

**Purpose**: Centralizes service initialization, enables easy mocking for tests, and provides consistent service interfaces.

### 4. Schema-Driven Validation Pattern

**Location**: `shared/avro/`, workers that encode data (e.g., `apps/saveCampaignData/`, `apps/transformCodeAssignments/`)

**Implementation**:
- Avro schemas define data contracts for campaign records (registrations, code assignments, scores)
- Workers validate and encode data before writing to S3 or streaming to Kinesis
- Schema validation rejects invalid records early

**Example** (`apps/transformCodeAssignments/index.js`):
```javascript
const isCodeAssignmentValid = record => {
  try {
    validateRecord({ schema: codeAssignmentSchema, record });
    return true;
  }
  catch (error) {
    log.warn('error from transformCodeAssignments ', error);
    return false;
  }
};
```

**Purpose**: Ensures data quality, provides type safety, and enables schema evolution.

### 5. Stream Processing Pattern

**Location**: Workers processing Kinesis/SQS data (`transformCodeAssignments`, `saveSelection`, `saveCampaignData`)

**Implementation**:
- Batch processing with configurable batch sizes
- Records processed in parallel within batches
- Results aggregated and returned

**Example** (`apps/transformCodeAssignments/index.js`):
```javascript
const transformCodeAssignments = ({ input, Services, jwt }) =>
  R.pipeP(
    () => Promise.resolve(input),
    R.filter(isCodeAssignmentRecordType),
    R.map(setDedupeInfo),
    R.filter(isCodeAssignmentValid),
    BatchFn({ fn: BatchProcessRecords({ Services, stream, jwt }), batchSize }),
    FormatResponse(input)
  )();
```

**Purpose**: Enables high-throughput data processing with controlled concurrency.

### 6. Configuration as Code Pattern

**Location**: `configs/*.config.yml`, `shared/config/resolveWorkerConfig.js`

**Implementation**:
- Workers configured via YAML files with environment-specific overrides
- Configuration includes middleware type, batch sizes, inventory codes, and feature flags
- Configuration resolved at runtime based on `APP_NAME` environment variable

**Example** (`configs/default.config.yml`):
```yaml
verifiedfan:
  workers:
    saveCampaignData:
      createdDate: '2019-02-02T00:57:58.401Z'
      inventoryCode: cmp-save-data
      entryFile: lambda
      middlewareType: kinesisConsumer
      basePrefix: avro
```

**Purpose**: Enables environment-specific behavior without code changes, centralizes configuration management.

### 7. Repository Pattern (Implicit)

**Location**: `shared/services/` (campaigns, codes, entries, users)

**Implementation**:
- Service modules abstract data access behind clean APIs
- Workers interact with services, not raw HTTP/database calls
- Services handle authentication, error handling, and response transformation

**Purpose**: Decouples business logic from data access implementation, enables service replacement.

## Layer Separation

**Layers** (implicit, not strict):

1. **Entry Layer**: `shared/entryFiles/lambda.js` - AWS Lambda handler
2. **Middleware Layer**: `shared/middlewares/` - Cross-cutting concerns (tracing, input transformation, service injection)
3. **Application Layer**: `apps/{workerName}/index.js` - Business logic for each worker
4. **Service Layer**: `shared/services/` - External integrations (AWS, HTTP APIs, third-party)
5. **Data Layer**: `shared/avro/`, `shared/datastores/` - Data schemas and persistence

**Note**: Boundaries are soft. Workers can directly call service methods and AWS SDKs. There's no strict layering enforcement.

## Dependency Direction

**Direction**: Top-down, with service injection

```
Lambda Handler (entryFiles/lambda.js)
    ↓
Middleware Pipeline (middlewares/)
    ↓
Worker Business Logic (apps/{workerName}/)
    ↓
Services (shared/services/)
    ↓
External Systems (AWS, HTTP APIs)
```

**Dependencies flow inward**:
- Workers depend on services (injected via middleware)
- Services depend on external clients (AWS SDK, HTTP libraries)
- Workers do NOT depend on entry handlers or middleware (inverted control)

**Configuration**: Workers are discovered by name, not imported directly (app resolver pattern).

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (AWS Lambda) |
| Language | JavaScript (ES6+) + TypeScript |
| Transpilation | Babel + TypeScript |
| Bundling | Webpack |
| Testing | Jest (unit), Cucumber (integration) |
| Data Serialization | Avro (via avsc) |
| Functional Programming | Ramda |
| Tracing | OpenTelemetry |
| Logging | Debug + custom Log module |
| Configuration | js-yaml (@verifiedfan/configs) |
| Infrastructure | Terraform |
| CI/CD | GitLab CI |

## Deviations & Tech Debt

### 1. Mixed JavaScript and TypeScript
- **Evidence**: Some files are `.ts`, most are `.js`, with Babel handling both
- **Impact**: Inconsistent type safety, harder to refactor
- **Location**: Scattered throughout codebase

### 2. Implicit Dependencies
- **Evidence**: Workers import from `../../shared/` rather than npm packages
- **Impact**: Harder to version shared code, potential circular dependencies
- **Location**: All worker `index.js` files

### 3. Middleware Type Configuration
- **Evidence**: Middleware type is configured in YAML, not enforced by type system
- **Impact**: Runtime errors if misconfigured, no compile-time validation
- **Location**: `configs/default.config.yml`

### 4. Service Mocking Strategy
- **Evidence**: Mock services conditionally loaded via `SHOULD_MOCK_TEST_DATA` env var
- **Impact**: Production code includes test mocks, potential for misuse
- **Location**: `shared/services/index.js`

### 5. Global Configuration State
- **Evidence**: Configuration loaded as global singleton
- **Impact**: Harder to test with different configs, potential race conditions
- **Location**: `shared/config/`

### 6. Lambda Handler Reuse
- **Evidence**: Single `lambda.js` entry file reused by all workers, differentiated by `APP_NAME` env var
- **Impact**: All workers bundled identically, larger bundle size
- **Location**: `shared/entryFiles/lambda.js`

### 7. Tools Directory as Operational Scripts
- **Evidence**: `tools/` contains data loading scripts mixed with development utilities
- **Impact**: Unclear which tools are operational vs. dev-only
- **Location**: `tools/`

## Observability Patterns

### Tracing
- OpenTelemetry instrumentation via `shared/middlewares/telemetry/`
- Span creation for worker execution
- Context propagation via correlation IDs

### Logging
- Structured logging via custom `Log` module
- Debug logging via `debug` library
- CloudWatch integration via `@verifiedfan/cloudwatch-stdout`

### Metrics
- CloudWatch alarms configured in Terraform
- Result counts returned from workers
- Stats workers (`saveStats`, `slackStats`) for monitoring

### Error Handling
- Middleware catches and logs errors
- Result handlers format responses for AWS
- Retry logic in stream consumers (Kinesis, SQS)
