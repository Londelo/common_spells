# Architecture Patterns - dmd-workers

## Architecture Style

**Identified Style**: **Serverless + Event-Driven + Middleware Pipeline**

**Evidence**:

1. **Serverless Architecture** ([AWS Lambda Patterns](https://aws.amazon.com/serverless/))
   - Each `apps/*` directory corresponds to a separate AWS Lambda function
   - Single entry point (`shared/entryFiles/lambda.js`) used by all workers
   - Workers are triggered by various AWS events (Kinesis, DynamoDB Streams, SQS, AppSync, CloudWatch scheduled events)
   - Configuration file maps each worker to a `middlewareType` that defines its event source
   - Terraform configuration (`terraform/lambda.tf`) defines Lambda resources

2. **Event-Driven Architecture** ([Event-Driven Pattern](https://en.wikipedia.org/wiki/Event-driven_architecture))
   - Workers respond to events from multiple AWS event sources:
     - **Kinesis streams** (`smsStatusConsumer`)
     - **DynamoDB Streams** (`notificationSend`, `demandStreamToSqs`)
     - **SQS queues** (`shortenEventUrl`)
     - **AppSync GraphQL** (`proxyTmAccountService`, `eventDetails`)
     - **CloudWatch scheduled events** (`notificationScheduler`, `notificationGenerator`)
   - Each worker processes events asynchronously
   - Workers communicate via event streams and queues (e.g., `demandStreamToSqs` writes to SQS, `shortenEventUrl` consumes)

3. **Middleware Pipeline Pattern**
   - Middleware composition in `shared/middlewares/index.js` defines processing chains
   - Each `middlewareType` maps to a specific middleware stack:
     ```javascript
     KINESIS_CONSUMER: [correlation, Tracing, transformKinesisRecords, setRecordCorrelations, services, batchItemResultHandler]
     SCHEDULED: [correlation, Tracing, services, resultHandler]
     APPSYNC_RESOLVER: [correlation, Tracing, transformAppSyncInput, services, resultHandler]
     ```
   - Middleware is composed using functional composition (`ComposeMiddlewares.js`)
   - Cross-cutting concerns (tracing, correlation, service injection) applied via middleware

4. **Service Layer Pattern**
   - Centralized service initialization in `shared/services/index.ts`
   - Services injected into workers via middleware (`services.js` middleware)
   - External dependencies abstracted behind service interfaces (AWS, MongoDB, Redis, HTTP clients)

**Why This Architecture Makes Sense**:

- **Event-driven demand capture domain**: Workers respond to various demand-related events (notifications, URL shortening, account lookups)
- **Scalability**: Each Lambda scales independently based on event volume
- **Separation of concerns**: Business logic in `apps/`, infrastructure in `shared/`
- **Code reuse**: Middleware allows common functionality (tracing, correlation, error handling) to be shared
- **Flexibility**: New workers can be created with minimal boilerplate using templates

## Design Patterns Used

### 1. Middleware Pattern (Chain of Responsibility)

**Location**: `shared/middlewares/`

**Implementation**:
- Middlewares are composable functions that take a handler and return a new handler
- Each middleware can transform input, inject dependencies, handle errors, or process results
- Middlewares are chained using `ComposeMiddlewares.js`

**Example**:
```javascript
// shared/middlewares/index.js
const MiddlewaresByType = workerName => ({
  [MIDDLEWARE_TYPES.KINESIS_CONSUMER]: [
    correlation,
    Tracing({ workerName }),
    transformKinesisRecords,
    setRecordCorrelations,
    services,
    batchItemResultHandler
  ]
});
```

**Benefit**: Separates cross-cutting concerns from business logic; makes worker behavior configurable

### 2. Dependency Injection

**Location**: `shared/middlewares/services.js`

**Implementation**:
- Services middleware initializes and injects dependencies into worker context
- Workers receive a `Services` object containing AWS clients, MongoDB, Redis, HTTP clients, etc.
- Services are initialized once per Lambda cold start

**Example**:
```javascript
// Worker receives injected services
const demandStreamToSqs = ({ input, Services: { aws: { shortUrlQueue } }, correlation }) => { ... }
```

**Benefit**: Workers don't instantiate their own dependencies; testability and separation of concerns

### 3. Pipeline Pattern (Function Composition)

**Location**: Throughout `apps/*/index.js` files

**Implementation**:
- Workers use Ramda's `R.pipe` and `R.pipeP` to compose data transformations
- Each step in the pipeline is a pure function or async function
- Data flows through transformation stages

**Example**:
```javascript
// apps/demandStreamToSqs/index.js
export const formatRecordsForSqs = R.pipe(
  selectNewItems,
  dedupById,
  R.map(formatSQSRecord)
);
```

**Benefit**: Declarative data transformations; easy to test individual stages; functional programming style

### 4. Strategy Pattern (Middleware Type Selection)

**Location**: `shared/middlewares/index.js`

**Implementation**:
- Different middleware strategies based on event source type
- Worker configuration specifies `middlewareType`
- Appropriate middleware chain selected at runtime

**Example**:
```yaml
# configs/default.config.yml
notificationSend:
  middlewareType: dynamodbKinesisConsumer  # Selects DynamoDB Kinesis middleware

shortenEventUrl:
  middlewareType: sqsConsumer  # Selects SQS middleware
```

**Benefit**: Workers can handle different event sources without code changes; polymorphic event handling

### 5. Adapter Pattern (Event Source Transformations)

**Location**: `shared/middlewares/transformInput/`

**Implementation**:
- Each event source has a transformer that adapts AWS event format to normalized internal format
- Transformers handle decoding, extraction, and standardization
- Located in subdirectories per event source (kinesis/, dynamodb/, sqs/, etc.)

**Example**:
```javascript
// shared/middlewares/transformInput/kinesis/
- decodeInPlace.js     # Decodes base64 Kinesis records
- setMetaFieldIfDoesNotExist.js  # Adds metadata
```

**Benefit**: Workers work with consistent data structures regardless of event source

### 6. Factory Pattern (Service Initialization)

**Location**: `shared/services/index.ts`

**Implementation**:
- Service factory creates and configures service clients
- Services are instrumented with tracing and logging
- Factory ensures proper initialization order

**Example**:
```typescript
const services = async(): Promise<Services> => {
  const aws = AWSClients({ namespace });
  const mongo = MongoClient({ namespace });
  const request = InstrumentedRequest({ request: _request, namespace });
  return { aws, mongo, request, ...appServices };
};
```

**Benefit**: Centralized service initialization; consistent configuration

### 7. Repository Pattern (Implied)

**Location**: `shared/services/aws/`, `shared/services/mongo/`

**Implementation**:
- Data access abstracted behind service clients
- Workers interact with `demandTable`, `shortUrlQueue`, `mongo.campaigns`, etc.
- Data source details hidden from business logic

**Benefit**: Workers don't contain SQL/DynamoDB queries; data access can be swapped

### 8. Batch Processing Pattern

**Location**: `@verifiedfan/batch-fn` (external library), used throughout workers

**Implementation**:
- Workers process records in configurable batch sizes
- `BatchFn` utility handles batching and parallel execution
- Batch size constants defined (e.g., `SQS_MAX_BATCH_SIZE`)

**Example**:
```javascript
// apps/demandStreamToSqs/index.js
const BatchWriteSqsRecords = ({ shortUrlQueue, correlation }) => BatchFn({
  fn: WriteSqsRecords({ sendMessageBatch, correlation }),
  batchSize: SQS_MAX_BATCH_SIZE
});
```

**Benefit**: Efficient processing of large datasets; respects AWS service limits

### 9. Correlation ID Pattern (Distributed Tracing)

**Location**: `shared/middlewares/correlation.js`, `shared/middlewares/telemetry.ts`

**Implementation**:
- Correlation IDs generated or extracted from incoming events
- IDs propagated through middleware pipeline
- OpenTelemetry tracing for observability

**Benefit**: Request tracing across distributed systems; debugging production issues

## Layer Separation

The codebase exhibits clear separation of concerns across layers:

### 1. Infrastructure Layer
**Location**: `shared/middlewares/`, `shared/services/`, `shared/entryFiles/`

**Responsibilities**:
- AWS event handling
- Service initialization
- Tracing and logging
- Error handling
- Input/output transformations

### 2. Business Logic Layer
**Location**: `apps/*/index.js`

**Responsibilities**:
- Domain-specific logic (notification generation, URL shortening, account proxying)
- Data transformations specific to use case
- Orchestration of service calls

### 3. Configuration Layer
**Location**: `configs/`, `shared/config/`

**Responsibilities**:
- Environment-specific settings
- Service endpoints and credentials
- Worker metadata (inventoryCode, middlewareType)

### 4. Data Access Layer
**Location**: `shared/services/` (aws, mongo, redis subdirectories)

**Responsibilities**:
- Database clients (DynamoDB, MongoDB, Redis)
- External API clients (Bitly, SMS, TM APIs)
- Data serialization/deserialization

## Dependency Direction

The dependency flow follows a **clean architecture** principle:

```
Lambda Entry Point (lambda.js)
        ↓
App Resolver (resolves APP_NAME → worker module)
        ↓
Middleware Pipeline (applies cross-cutting concerns)
        ↓
Worker Business Logic (apps/*)
        ↓
Services (abstracts external dependencies)
        ↓
External Systems (AWS, MongoDB, APIs)
```

**Key Rules**:
- Business logic (`apps/`) depends on services, not vice versa
- Middlewares are generic and don't depend on specific workers
- Services abstract away implementation details
- Configuration is injected, not imported directly

**No Circular Dependencies Detected**: Import structure is unidirectional from entry point → middleware → worker → services

## Deviations & Tech Debt

### 1. Mixed JavaScript and TypeScript
**Evidence**:
- Core workers (`apps/`) mostly in JavaScript (`.js`)
- Newer code (`shared/services/index.ts`, `shared/middlewares/telemetry.ts`) in TypeScript
- Mixed imports between `.js` and `.ts` files

**Impact**: Inconsistent type safety; requires Babel and ts-node for compilation

**Recommendation**: Gradual migration to TypeScript for better type safety

### 2. Configuration in YAML vs. Environment Variables
**Evidence**:
- Most configuration in `configs/*.config.yml`
- Some config from environment variables (`APP_NAME`, `CONFIG_ENV`)
- Secrets (database passwords, API keys) hardcoded in YAML

**Impact**: Security risk if configs committed to git; difficult secret rotation

**Recommendation**: Move secrets to AWS Secrets Manager or environment variables

### 3. Monorepo with Single Lambda Handler
**Evidence**:
- All workers share `shared/entryFiles/lambda.js` entry point
- Workers differentiated by `APP_NAME` environment variable at runtime
- Each worker deployed as separate Lambda, but same codebase

**Impact**: Lambda package size includes all workers' dependencies; cold start time

**Recommendation**: Consider per-worker bundling with webpack tree-shaking

### 4. Error Handling Inconsistency
**Evidence**:
- Some workers use try/catch and return error objects
- Some throw errors
- No standardized error format

**Example**:
```javascript
// Some workers return errors
catch ({ message, stack }) {
  return false;
}

// Others throw
catch (error) {
  log.error('Unexpected error', { message, stack });
  throw error;
}
```

**Impact**: Inconsistent error propagation; difficult to implement centralized error handling

**Recommendation**: Standardize on error middleware pattern

### 5. Test Coverage Gaps
**Evidence**:
- Integration tests in `features/` using Cucumber
- Some unit tests (`*.spec.js`) but not comprehensive
- No test coverage reporting visible

**Impact**: Confidence in refactoring is reduced; potential bugs in edge cases

**Recommendation**: Add unit test coverage for all workers; integrate coverage reporting

### 6. Hardcoded Batch Sizes
**Evidence**:
```javascript
const BATCH_PARALLEL_WRITE_SIZE = 5000;
const { MAX_BATCH_SIZE: { SQS: SQS_MAX_BATCH_SIZE } } = enums;
```

**Impact**: Batch sizes not configurable per environment; may cause throttling or memory issues

**Recommendation**: Move batch sizes to configuration

### 7. Tightly Coupled to AWS Lambda
**Evidence**:
- Entry point is Lambda-specific (`lambda.js`)
- Middleware assumes Lambda event structures
- No abstraction for running workers locally or in other environments

**Impact**: Difficult to test workers outside AWS; vendor lock-in

**Recommendation**: Consider adding a local runtime adapter for development/testing
