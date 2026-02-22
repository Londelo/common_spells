# Architecture Patterns - fan-identity-workers

## Architecture Style

**Identified Style**: **Serverless + Event-Driven + Functional**

**Evidence**:

1. **Serverless Architecture** ([AWS Serverless](https://aws.amazon.com/serverless/))
   - Each worker in `apps/<domain>/<workerName>/` is an isolated AWS Lambda function
   - Workers are stateless and event-triggered
   - Deployed using Terraform with Lambda-specific infrastructure in `terraform/stacks/`
   - Entry point in `shared/entryFiles/lambda.js` handles Lambda-specific concerns (pre-warming, context)
   - Workers scale automatically based on event volume

2. **Event-Driven Architecture** ([Wikipedia - Event-driven Architecture](https://en.wikipedia.org/wiki/Event-driven_architecture))
   - Workers consume from multiple AWS event sources:
     - **Kinesis streams** (real-time data streams)
     - **DynamoDB streams** (database change data capture)
     - **SQS queues** (asynchronous message processing)
     - **Kafka topics** (distributed event streaming)
     - **S3 events** (file upload triggers)
     - **SNS notifications** (pub/sub messaging)
     - **EventBridge/CloudWatch** (scheduled events)
   - Input transformations in `shared/middlewares/transformInput/` normalize different event formats
   - Workers produce outputs to queues, databases, and streams
   - Decoupled components communicate via messages/events

3. **Functional Programming Principles**
   - Enforced via ESLint rules: `fp/no-mutation`, `fp/no-class`, `fp/no-let`
   - Middleware composition using Ramda's `compose` function
   - Immutable configuration using Immutable.js
   - Pure functions with explicit inputs/outputs
   - Worker handlers are pure async functions: `(input, services) => result`

**Why this style makes sense**:
- **Serverless**: Reduces operational overhead, enables pay-per-use billing, automatic scaling for variable event volumes
- **Event-driven**: Enables real-time processing of user activities, purchase events, and identity verification workflows
- **Functional**: Improves testability, reduces bugs from side effects, enables safe concurrent processing

## Design Patterns Used

### 1. Middleware Pipeline Pattern

**Location**: `shared/middlewares/index.js`

**Implementation**: Chain of Responsibility pattern using functional composition

```javascript
// Middleware composition using Ramda
const ComposeMiddlewares = orderedMiddlewares =>
  R.compose(...orderedMiddlewares);

// Middleware stack for Kinesis consumer
[
  correlation,           // Add request correlation ID
  Tracing({ workerName }), // OpenTelemetry tracing
  transformKinesisRecords, // Parse Kinesis event format
  setRecordCorrelations,   // Correlate individual records
  services,                // Inject service dependencies
  resultHandler            // Transform output format
]
```

**Purpose**: Transform raw AWS events into normalized inputs, inject dependencies, handle cross-cutting concerns (logging, tracing), and format outputs

**Example**: See `shared/middlewares/index.js:24-112` for 11 different middleware stacks based on event source type

### 2. Dependency Injection Pattern

**Location**: `shared/middlewares/services.js`, `shared/services/index.ts`

**Implementation**: Services are injected into workers via middleware, providing abstraction over external dependencies

```typescript
// Services injected into every worker
export type Services = {
  aws: AWSServices              // DynamoDB and SQS clients
  request: Request              // HTTP client
  identity: IdentityService     // Identity verification service
  features: FeatureFlags        // Unleash feature flags
  tmAccounts: TmAccountsService // Ticketmaster accounts API
  scoringModel: ScoringModel    // ML scoring model
  stagingScoringModel: ScoringModel
  accountActivityQueueManager: QueueManager
  onDemandScoringQueueManager: QueueManager
}
```

**Purpose**: Enables testing with mock services, decouples workers from implementation details, centralizes client configuration

**Example**: `apps/scoring/scoreUsers/index.ts` receives `Services` parameter with all dependencies pre-configured

### 3. Factory Pattern

**Location**: `shared/services/*`, `shared/appResolver/index.js`

**Implementation**: Factory functions create configured service instances

```javascript
// App resolution factory
export const InstrumentedApp = ({
  MIDDLEWARE_TYPE: middlewareTypeOverride,
  APP_NAME: appNameOverride
} = {}) => {
  const appName = appNameOverride || process.env.APP_NAME;
  const middlewareType = middlewareTypeOverride ||
    resolveWorkerConfig(appName).middlewareType;

  const app = App({ APP_NAME: appName });
  return Middlewares({ type: middlewareType, appName })(app);
};

// Service factory
const services = async(): Promise<Services> => {
  const aws = AWSClients(instrumentationParams);
  const request = InstrumentedRequest({ request: _request, ...params });
  const appServices = await AppServices({ aws, request });
  return { aws, request, ...appServices };
};
```

**Purpose**: Centralize object creation with proper configuration, enable environment-specific initialization

### 4. Strategy Pattern

**Location**: `shared/middlewares/index.js`

**Implementation**: Different middleware stacks selected based on event source type (MIDDLEWARE_TYPE)

```javascript
const MiddlewaresByType = workerName => ({
  [MIDDLEWARE_TYPES.KINESIS_CONSUMER]: [...],
  [MIDDLEWARE_TYPES.SQS_CONSUMER]: [...],
  [MIDDLEWARE_TYPES.KAFKA_CONSUMER]: [...],
  [MIDDLEWARE_TYPES.APPSYNC_RESOLVER]: [...],
  // 11 different strategies
});

const resolveMiddlewares = (middlewareType, appName) =>
  MiddlewaresByType(appName)[middlewareType];
```

**Purpose**: Handle different AWS event sources (Kinesis, SQS, Kafka, AppSync, etc.) with source-specific transformation and result handling logic

### 5. Queue Manager Pattern

**Location**: `shared/services/queue/QueueManager.ts`

**Implementation**: Abstraction over SQS operations with batch processing and error handling

**Purpose**: Simplify queue operations, handle batching (SQS max 10 messages per batch), provide consistent error handling

**Example**: `accountActivityQueueManager.sendMessages(activities)` in `apps/scoring/enqueueFromStream/index.ts`

### 6. Adapter Pattern

**Location**: `shared/middlewares/transformInput/*`

**Implementation**: Transform heterogeneous AWS event formats into normalized internal format

- `transformKinesisRecords` - Decodes base64 Kinesis records
- `transformDynamoDBRecords` - Parses DynamoDB stream change events
- `transformSQSRecords` - Extracts message bodies from SQS events
- `transformKafkaRecords` - Parses Kafka message values

**Purpose**: Isolate workers from AWS-specific event formats, enable worker logic to focus on business logic rather than event parsing

### 7. Configuration Management Pattern

**Location**: `shared/config/index.js`, `configs/*.config.yml`

**Implementation**: Hierarchical YAML configuration with environment overrides using Immutable.js

```javascript
// Configuration accessed via immutable paths
config.getIn(['services', 'identity', 'baseUrl'])
config.getIn(['aws', 'dynamodb', 'fanIdentityTable'])
```

**Purpose**: Environment-specific configuration without code changes, immutability prevents runtime modifications

### 8. Type-Safe Worker Pattern

**Location**: `shared/appResolver/Worker.ts`

**Implementation**: Generic TypeScript types ensure compile-time safety for worker inputs/outputs

```typescript
// Worker type definitions
export type Worker<Event, Result, Services> =
  (params: { input: Event, Services: Services }) => Promise<Result>;

export type KinesisWorker<Event, Result, Services> =
  Worker<Event[], Result, Services>;

export type AppSyncWorker<Event, Result, Services> =
  Worker<{ event: { arguments: Event } }, { data: Result }, Services>;
```

**Purpose**: Catch type mismatches at compile time, provide IDE autocomplete, document expected input/output shapes

## Layer Separation

### 1. Entry Layer
- **Location**: `shared/entryFiles/lambda.js`
- **Responsibility**: Lambda-specific concerns (pre-warming, error handling)
- **Dependencies**: None (bootstraps everything)

### 2. Orchestration Layer
- **Location**: `shared/appResolver/`
- **Responsibility**: Resolve worker by name, apply appropriate middleware stack
- **Dependencies**: Worker modules, middleware definitions

### 3. Middleware Layer
- **Location**: `shared/middlewares/`
- **Responsibility**: Cross-cutting concerns (tracing, correlation, transformation, service injection)
- **Dependencies**: Services layer, configuration

### 4. Application Layer (Workers)
- **Location**: `apps/<domain>/<workerName>/`
- **Responsibility**: Business logic for specific event processing tasks
- **Dependencies**: Services (injected), shared types and utilities

### 5. Service Layer
- **Location**: `shared/services/`
- **Responsibility**: Abstract external dependencies (AWS, APIs, feature flags)
- **Dependencies**: Configuration, AWS SDK, HTTP clients

### 6. Infrastructure Layer
- **Location**: Implicit (AWS resources defined in Terraform)
- **Responsibility**: Event sources (Kinesis, SQS), data stores (DynamoDB), queues

## Dependency Direction

**Clean dependency flow** (inner layers don't depend on outer layers):

```
Infrastructure (AWS)
    ↓ (events)
Entry Layer (lambda.js)
    ↓
Orchestration Layer (appResolver)
    ↓
Middleware Layer
    ↓ (injects)
Service Layer ← Application Layer (Workers)
    ↓ (uses)
Infrastructure (AWS SDK, HTTP)
```

**Key principles**:
- Workers depend on abstract Services interface, not concrete implementations
- Middleware depends on services but not on worker implementations
- Services depend on configuration but not on workers
- Configuration is data (no code dependencies)

**Evidence of clean architecture**:
1. Workers receive `Services` as parameter - they don't import service modules directly
2. Middleware is generic - it works with any worker that matches the type signature
3. Services are factories that can be mocked for testing
4. Configuration is hierarchical YAML - no code in config files

## Deviations & Technical Debt

### 1. Mixed JavaScript and TypeScript

**Location**: Throughout codebase

**Issue**: Inconsistent type safety. Core shared code (`middlewares/`, `entryFiles/`) is JavaScript, while newer workers use TypeScript.

**Impact**: Type checking only works in TypeScript files. JavaScript code can have runtime type errors.

**Mitigation**: TypeScript compiler configured with `noImplicitAny: false` to tolerate gradual migration.

### 2. Relaxed Functional Programming Rules in Tests

**Location**: `features/`, `test/`

**Issue**: ESLint disables `fp/no-let` and `fp/no-mutation` in test files

**Rationale**: Test setup code benefits from imperative patterns (arrange-act-assert)

**Impact**: Tests are more readable but don't enforce same discipline as production code

### 3. `any` Types in Service Definitions

**Location**: `shared/services/index.ts:60-71`

**Issue**: DynamoDB client methods use `any` for parameters and return types

```typescript
export type DynamoDbClient = {
  get: (params: any) => Promise<any>
  query: (params: any) => Promise<any>
  put: (params: any) => Promise<any>
  // ...
}
```

**Impact**: No type safety for DynamoDB operations, potential for runtime errors

**Rationale**: DynamoDB operations have complex, context-dependent types that are difficult to generically type

### 4. Environment Variable Configuration

**Location**: `shared/appResolver/index.js:6-9`

**Issue**: APP_NAME and MIDDLEWARE_TYPE resolved from environment variables at runtime

```javascript
const appName = appNameOverride || process.env.APP_NAME;
const middlewareType = middlewareTypeOverride ||
  resolveWorkerConfig(appName).middlewareType;
```

**Impact**: Configuration errors only caught at runtime, not during build

**Mitigation**: Throws clear error messages if required variables are missing

### 5. Global State in Service Initialization

**Location**: `shared/services/featureFlags/index.ts`

**Issue**: Feature flag client created as singleton via `createFeatureFlagsOnce`

**Impact**: Cannot easily reset feature flags between tests, potential for test pollution

**Rationale**: Unleash client initialization is expensive, singleton reduces overhead

### 6. Large Configuration Files

**Location**: `configs/default.config.yml` (9414 bytes), `configs/prod.config.yml` (4322 bytes)

**Issue**: Monolithic YAML files containing worker configs, AWS resources, service endpoints

**Impact**: Difficult to find specific settings, prone to merge conflicts

**Alternative**: Could split into domain-specific config files (auth.config.yml, scoring.config.yml)

### 7. Worker Config Resolution Complexity

**Location**: `shared/config/resolveWorkerConfig.js`

**Issue**: Worker configuration resolution involves multiple layers (default → environment → worker-specific)

**Impact**: Difficult to trace where a config value originates, debugging overhead

**Benefit**: Enables fine-grained overrides per environment and per worker
