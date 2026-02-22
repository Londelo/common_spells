# Architecture Patterns - reg-workers

## Architecture Style

**Identified Style**: **Serverless Event-Driven Microservices** with **Domain-Driven Design** organization.

**Evidence**:

1. **Serverless Architecture**:
   - All workers are AWS Lambda functions deployed independently
   - Each worker has a dedicated `apps/<domain>/<workerName>/index.ts` entry point
   - Workers are configured with middleware types matching AWS event sources (SQS, DynamoDB Streams, AppSync, EventBridge)
   - Infrastructure defined in `terraform/stacks/<domain>/` modules

2. **Event-Driven Architecture**:
   - Workers triggered by AWS events: SQS messages, DynamoDB Streams, SNS topics, EventBridge schedules
   - Asynchronous communication between workers via queues (saveEntriesQueue, saveSelectionQueue, dataQueue)
   - DynamoDB Streams enable change data capture for replication and side effects
   - Kafka topics for publishing analytics events to external consumers

3. **Domain-Driven Design**:
   - Code organized by bounded contexts: `registration`, `replication`, `selection`, `dataPipeline`, `notification`
   - Each domain contains related workers with cohesive business logic
   - Shared domain types in `shared/types/<domain>.ts` (campaign.ts, market.ts, scoring.ts)
   - Clear separation between domains (no cross-domain imports except shared types)

4. **Microservices Pattern**:
   - Workers communicate via HTTP with external services (Campaign Service, Entry Service, User Service, Code Service)
   - Each service has its own client wrapper in `shared/services/`
   - Services use TitanRequest pattern for HTTP calls with OpenTelemetry tracing
   - Workers are independently deployable via Terraform stacks

**Why this architecture makes sense**:
- **Scalability**: Each Lambda scales independently based on event volume
- **Resilience**: SQS dead letter queues and batch item failures enable partial retry and error isolation
- **Loose Coupling**: Event-driven design decouples producers from consumers
- **Domain Isolation**: DDD organization aligns code structure with business capabilities
- **Cost Efficiency**: Pay-per-invocation Lambda pricing with automatic scaling

## Design Patterns Used

### 1. Middleware Pipeline Pattern

**Location**: `shared/middlewares/index.js`

**Implementation**:
- Each worker is wrapped in a composable middleware chain (similar to Express/Koa)
- Middleware types are mapped to event sources (SQS, DynamoDB, AppSync, etc.)
- Middleware components are composed in order: correlation → tracing → input transformation → services → authentication → result handling

**Example**:
```javascript
// SQS_BATCH_CONSUMER middleware pipeline
[
  correlation,              // Inject correlation ID
  Tracing({ workerName }), // Start OpenTelemetry span
  transformSQSRecords,     // Parse SQS event to array of records
  setRecordCorrelations,   // Set correlation per record
  services,                // Inject AWS/HTTP/DB clients
  authentication,          // Validate JWT (if needed)
  batchItemResultHandler   // Format response with batchItemFailures
]
```

**Code Reference**: `shared/middlewares/index.js:25-121`

### 2. Dependency Injection Pattern

**Location**: `shared/middlewares/services.js`, `shared/services/index.ts`

**Implementation**:
- Services (AWS clients, HTTP clients, Redis, Kafka, MongoDB) are initialized once and injected into worker handlers
- Workers receive a `Services` parameter containing all dependencies
- Promotes testability (services can be mocked) and reduces coupling

**Example**:
```typescript
const handler = async({ Services, event, Config }) => {
  const { redis, aws, entries } = Services;
  // Use injected dependencies
  const campaign = await redis.get(`campaign:${id}`);
  await aws.demandTable.put({ Item: entry });
  await entries.post(`/entries`, { body: data });
};
```

**Code Reference**: `shared/services/index.ts:48-67`

### 3. Worker Registry Pattern

**Location**: `configs/default.config.yml`, `shared/appResolver/map.js`

**Implementation**:
- Workers are registered in YAML config with metadata (nameTag, inventoryCode, middlewareType, stack)
- `appResolver/map.js` dynamically imports workers at runtime based on `APP_NAME` environment variable
- Enables single Lambda image with multi-worker support (reduces deployment complexity)

**Example**:
```yaml
# configs/default.config.yml
verifiedfan:
  workers:
    checkEligibility:
      nameTag: eligibility
      inventoryCode: reg
      middlewareType: appsyncResolver
      stack: registration
```

```javascript
// shared/appResolver/map.js
const appMap = readWorkerConfigs()
  .reduce((acc, { workerName, stack }) => ({
    ...acc,
    [workerName]: require(`../../apps/${stack}/${workerName}`).default
  }), {});
```

**Code Reference**: `configs/default.config.yml:3-115`, `shared/appResolver/map.js:6-10`

### 4. Result Monad Pattern

**Location**: `shared/util/result.ts`

**Implementation**:
- Workers return structured results (success/failure) without throwing exceptions for expected errors
- Enables functional error handling without try-catch cascades
- SQS workers return `{ batchItemFailures, count }` for partial retry

**Example**:
```typescript
type WorkerResult = {
  batchItemFailures: FailureIdentifier[],
  count: {
    received: number,
    processed: number,
    failed: number
  }
};

return {
  batchItemFailures: failedRecords.map(r => ({ itemIdentifier: r.messageId })),
  count: { received: 100, processed: 95, failed: 5 }
};
```

**Code Reference**: `apps/replication/saveEntries/index.ts:19-34`

### 5. Service Client Pattern (TitanRequest)

**Location**: `shared/services/*.ts` (campaigns, entries, users, codes)

**Implementation**:
- All HTTP services use instrumented request client with OpenTelemetry tracing
- Clients encapsulate service URLs (from config) and provide typed methods
- Automatic retry, timeout, and error handling

**Example**:
```typescript
// shared/services/entries.ts
const entries = (request: Request): EntryService => ({
  post: (path, options) => request.post(`${baseUrl}${path}`, options),
  get: (path, options) => request.get(`${baseUrl}${path}`, options),
  delete: (path, options) => request.delete(`${baseUrl}${path}`, options)
});
```

**Code Reference**: `shared/services/index.ts:33-46`

### 6. Change Data Capture (CDC) Pattern

**Location**: `apps/replication/enqueueEntries/`, `apps/replication/saveEntries/`

**Implementation**:
- DynamoDB Streams capture changes to `demand-table` (INSERT, MODIFY, REMOVE)
- `enqueueEntries` filters changes needing replication and queues to `saveEntriesQueue`
- `saveEntries` validates changes against current DynamoDB state (handles race conditions) before replicating to Entry Service
- Ensures eventual consistency between DynamoDB and MongoDB

**Example**:
```typescript
// enqueueEntries filters changes
const needsReplication = record.newImage?.needsReplication === true;

// saveEntries validates before replicating
const validateOperation = ValidateOperation(Services);
const validChangeRecords = await validateOperation(normalizedRecords);
```

**Code Reference**: `apps/replication/saveEntries/index.ts:47-65`

### 7. Fan-Out Pattern (SNS → SQS)

**Location**: `apps/dataPipeline/processData/`, `apps/dataPipeline/sendData/`

**Implementation**:
- `processData` formats data and publishes to SNS topic with type-specific attributes
- SNS fans out to multiple SQS queues (one per data type: CAMPAIGN, MARKET, REGISTRATION)
- `sendData` workers consume from type-specific queues and publish to Kafka topics
- Decouples data formatting from publishing and enables parallel processing

**Code Reference**: `shared/services/sns/DataTopicManager.ts`

### 8. Batch Processing Pattern

**Location**: All SQS workers (saveEntries, saveSelections, processData, sendData)

**Implementation**:
- Workers process batches of messages (configurable batch size in config)
- Partial failures return `batchItemFailures` to retry only failed messages
- Batch operations to Entry Service (upsert/delete up to 25 items per request)
- DynamoDB batch operations limited to 25 items per batch

**Example**:
```typescript
// Process batch with partial retry
return {
  batchItemFailures: failedRecords.map(record => ({
    itemIdentifier: record.messageId
  })),
  count: { received, processed, failed }
};
```

**Code Reference**: `apps/replication/saveEntries/index.ts:19-34`

### 9. Cache-Aside Pattern

**Location**: Workers accessing campaign data (checkEligibility, saveEntries)

**Implementation**:
- Campaign data is cached in Redis with TTL
- Workers check Redis first; on cache miss, fetch from MongoDB and populate cache
- Reduces load on MongoDB and improves response times

**Example**:
```typescript
const getCampaign = async({ slug, redis }) => {
  const cached = await redis.get(`campaign:${slug}`);
  if (cached) return JSON.parse(cached);

  const campaign = await mongo.campaigns.findOne({ slug });
  await redis.set(`campaign:${slug}`, JSON.stringify(campaign), 'EX', 3600);
  return campaign;
};
```

**Code Reference**: `apps/registration/checkEligibility/utils/getCampaign.ts`

## Layer Separation

**Horizontal Layers**:

1. **Handler Layer** (`apps/<domain>/<worker>/index.ts`):
   - Entry point for Lambda invocations
   - Receives pre-processed input from middleware
   - Orchestrates business logic
   - Returns structured results

2. **Business Logic Layer** (`apps/<domain>/<worker>/<helpers>`):
   - Domain-specific business rules and validation
   - Pure functions (no side effects)
   - Worker-specific utilities (formatters, validators, calculators)

3. **Service Layer** (`shared/services/`):
   - External integrations (HTTP, AWS, Kafka, Redis, MongoDB)
   - Abstract infrastructure concerns
   - Provides consistent API across workers

4. **Middleware Layer** (`shared/middlewares/`):
   - Cross-cutting concerns (tracing, correlation, authentication)
   - Input/output transformation per event source
   - Service initialization and dependency injection

5. **Infrastructure Layer** (`terraform/stacks/`):
   - AWS resource definitions (Lambda, SQS, DynamoDB, IAM)
   - Per-stack deployment modules
   - Environment-specific configurations

**Vertical Separation (by Domain)**:

Workers are organized into bounded contexts with clear domain boundaries:
- **Registration**: Fan eligibility and user management
- **Replication**: Data synchronization between DynamoDB and Entry Service
- **Selection**: Winner selection and code assignment
- **Data Pipeline**: Analytics event publishing to Kafka
- **Notification**: Email reminder scheduling and delivery

Each domain is independently deployable via Terraform stacks.

## Dependency Direction

**Inward Dependencies** (Clean Architecture):
- **Worker handlers** depend on **services** (abstraction)
- **Services** depend on **config** and **utilities**
- **Middleware** depends on **services** (injects them)
- **Business logic** has no dependencies on infrastructure (pure functions)

**Infrastructure Dependencies**:
- Workers depend on AWS SDK clients (DynamoDB, SQS, SNS, Secrets Manager)
- Workers depend on external HTTP services (Campaign, Entry, User, Code services)
- Workers depend on data stores (Redis, MongoDB, Kafka)

**Dependency Injection**:
All external dependencies are injected via `Services` parameter, enabling:
- **Testability**: Mock services in unit tests
- **Flexibility**: Swap implementations without changing worker code
- **Loose Coupling**: Workers don't instantiate dependencies directly

**No Circular Dependencies**:
- Workers never import from other workers
- Shared types are in `shared/types/` (leaf nodes)
- Shared utilities are in `shared/util/` (leaf nodes)
- Middleware and services are injected (not imported by workers)

## Deviations & Tech Debt

### 1. Mixed JavaScript and TypeScript

**Issue**: Workers are TypeScript (`*.ts`), but middleware and config are JavaScript (`*.js`).

**Impact**: Partial type safety; shared code lacks compile-time type checking.

**Mitigation**: Gradually migrate middleware and config to TypeScript.

---

### 2. Functional Programming Enforcement

**Issue**: ESLint strictly enforces functional programming (`fp/no-let`, `fp/no-mutation`, `fp/no-loops`, `fp/no-class`) but configuration and middleware are imperative.

**Impact**: Inconsistent coding style across codebase; new developers face steep learning curve.

**Rationale**: Functional programming reduces bugs (immutability) and improves testability.

---

### 3. Config Mutation in Tests

**Issue**: Integration tests mutate config objects (`features/lib/inputs/`), violating functional principles.

**Impact**: Tests may have side effects; config state is shared across test scenarios.

**Mitigation**: Use config clones or frozen objects in tests.

---

### 4. Large Config File

**Issue**: `configs/default.config.yml` contains all worker registrations, AWS clients, and service URLs (330+ lines).

**Impact**: Single point of change; difficult to navigate; merge conflicts.

**Mitigation**: Split config into domain-specific files (e.g., `configs/workers/registration.yml`).

---

### 5. Worker Registry Magic

**Issue**: Workers are auto-discovered via `appResolver/map.js` using `require()` based on file paths constructed from config.

**Impact**: Implicit dependencies; errors only surface at runtime if config/files are misaligned.

**Mitigation**: Add startup validation to verify all registered workers exist.

---

### 6. Kafka Certificate Expiration

**Issue**: Kafka TLS certificates expire and must be manually regenerated using `npx run tools:generateCerts`.

**Impact**: Certificate expiration causes Kafka publishing failures (data pipeline outage).

**Mitigation**: Daily scheduled job monitors cert expiration and alerts via Slack (`tools/certs/alertCertExpiration.js`).

---

### 7. Race Conditions in Replication

**Issue**: DynamoDB Streams process changes asynchronously; record may change between stream event and replication.

**Impact**: Stale data replicated to Entry Service.

**Mitigation**: `saveEntries` validates changes against current DynamoDB state before replicating (implemented).

---

### 8. No Distributed Tracing Correlation Across Services

**Issue**: OpenTelemetry traces exist per Lambda, but correlation IDs are not propagated to downstream HTTP services.

**Impact**: Difficult to trace requests across service boundaries.

**Mitigation**: Pass correlation ID in HTTP headers (X-Correlation-Id) and log in downstream services.

---

### 9. Large Lambda Bundle Size

**Issue**: Single Webpack bundle includes all workers, shared code, and dependencies.

**Impact**: Cold start latency; large bundle uploaded to all Lambdas regardless of which worker runs.

**Mitigation**: Use Webpack code splitting or per-worker bundles (requires Terraform changes).

---

### 10. Limited Unit Test Coverage

**Issue**: Unit tests (`.spec.ts`) exist for some utilities, but worker handlers and business logic lack comprehensive unit tests.

**Impact**: Regression risk; integration tests are slow and flaky.

**Mitigation**: Increase unit test coverage for pure functions and business logic (target 80%+).
