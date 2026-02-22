# Architecture Patterns - ccpa-workers

## Architecture Style

**Identified Style**: **Serverless + Event-Driven + Microservices**

**Evidence**:
- **Serverless**: Each worker in `apps/` is an independent Lambda function with its own deployment configuration in Terraform
- **Event-Driven**: Workers process events from SQS queues, Kinesis streams, and direct SDK invocations
- **Microservices**: Workers are loosely coupled, single-purpose functions that communicate via queues and HTTP APIs
- **Configuration-Driven**: Worker behavior defined declaratively in YAML (middlewareType, queueName, etc.)

**Key Characteristics**:
1. **Apps Directory Pattern**: Each subdirectory under `apps/` represents a deployable Lambda function
2. **Shared Infrastructure**: Common middleware, services, and entry points in `shared/`
3. **Multiple Event Sources**: Workers can consume from SQS, Kinesis, SNS, Kafka, S3, AppSync, or direct SDK invocation
4. **Middleware Pipeline**: Composable middleware functions wrap business logic

## Design Patterns Used

### 1. Middleware Pipeline Pattern

**Location**: `shared/middlewares/`

**Implementation**:
- Functional composition of ordered middleware functions
- Each middleware wraps the next in the chain
- Implemented using Ramda's `compose` function in `ComposeMiddlewares.js`

**Example**:
```javascript
// From shared/middlewares/index.js
[MIDDLEWARE_TYPES.SQS_CONSUMER]: [
  correlation,              // Add correlation ID
  Tracing({ workerName }), // OpenTelemetry tracing
  transformSQSRecords,      // Parse SQS event structure
  setRecordCorrelations,    // Track individual records
  services,                 // Inject service dependencies
  authentication,           // Validate JWT tokens
  SQSResultHandler({ workerName }) // Handle results
]
```

**Purpose**: Separation of cross-cutting concerns (logging, tracing, input transformation) from business logic

### 2. Dependency Injection Pattern

**Location**: `shared/middlewares/services.js`

**Implementation**:
- Services middleware injects external dependencies (AWS clients, HTTP clients, MongoDB) into worker context
- Workers receive a `Services` object containing initialized clients
- Enables testability by allowing mock services in tests

**Example**:
```javascript
// Worker receives pre-configured services
const deleteFan = async({ input, Services, jwt }) => {
  const { privacyCore, aws, users } = Services;
  // Use injected services
}
```

### 3. Strategy Pattern (Middleware Selection)

**Location**: `shared/middlewares/index.js` and `shared/config/`

**Implementation**:
- Different middleware pipelines selected based on event source type
- Configuration defines `middlewareType` per worker
- Runtime selects appropriate middleware array from map

**Example Middleware Types**:
- `sqsConsumer`: For queue-based workers (deleteFan, fanInfo, keepPrivate, optOut)
- `sdkInvoked`: For directly invoked workers (processRequest, updateDictionary)
- `kinesisConsumer`: For stream-based workers
- `scheduled`: For cron-triggered workers

### 4. Adapter Pattern (Input Transformers)

**Location**: `shared/middlewares/transformInput/`

**Implementation**:
- Each event source (SQS, Kinesis, SNS, S3, DynamoDB, Kafka, Firehose, AppSync) has a dedicated transformer
- Transforms source-specific event format into standardized internal format
- Decouples business logic from AWS event structures

**Example**:
```
transformInput/
├── sqs/index.js        # Parse SQS message batches
├── kinesis/index.js    # Decode Kinesis records
├── dynamodb/index.js   # Parse DynamoDB streams
├── kafka/index.js      # Parse Kafka records
└── ...
```

### 5. Factory Pattern (Service Initialization)

**Location**: `shared/services/index.ts` and `shared/services/aws/`

**Implementation**:
- Service factory functions create pre-configured clients
- Clients initialized with environment-specific configuration
- Shared across all workers via dependency injection

**Example**:
```javascript
const services = async() => {
  const aws = AWSClients({ namespace });      // Factory for AWS clients
  const mongo = MongoClient({ namespace });   // Factory for MongoDB client
  const request = InstrumentedRequest({ ... }); // Factory for HTTP client
  return { aws, mongo, request, ... };
};
```

### 6. Template Method Pattern (Worker Structure)

**Location**: Individual workers in `apps/*/index.js`

**Implementation**:
- All workers follow common structure: receive input, process, return result
- Common error handling: catch errors and publish failure to Privacy Core
- Template enforced by middleware pipeline expectations

**Example Template**:
```javascript
const worker = async({ input, Services, jwt }) => {
  const { privacyCore } = Services;
  const requestEvent = extractRequestEvent(input);

  try {
    // Worker-specific business logic
    const result = await processLogic();

    // Publish success to Privacy Core
    await privacyCore.publishPrivacyResponse({ payload: requestEvent });

    return result;
  } catch (error) {
    // Publish failure to Privacy Core
    await privacyCore.publishPrivacyResponse({ payload: requestEvent, error: true });
    throw error;
  }
};
```

### 7. Router Pattern (Request Processor)

**Location**: `apps/processRequest/index.js`

**Implementation**:
- Central router that receives privacy requests and routes to appropriate worker queue
- Maps request types to downstream SQS queues
- Single entry point for all CCPA privacy requests from Privacy Core

**Routing Table**:
```javascript
const REQUEST_TYPE_QUEUE = {
  [PRIVACY_CORE_REQUEST_TYPE.GET_INFO]: 'fanInfoQueue',
  [PRIVACY_CORE_REQUEST_TYPE.DO_NOT_SELL]: 'keepPrivateQueue',
  [PRIVACY_CORE_REQUEST_TYPE.UNSUBSCRIBE]: 'optOutQueue',
  [PRIVACY_CORE_REQUEST_TYPE.ERASE]: 'deleteFanQueue'
};
```

### 8. Chain of Responsibility (Data Retrieval)

**Location**: `apps/processRequest/GetUserIds`

**Implementation**:
- Try to fetch user IDs from primary source (TM Users service)
- Fall back to secondary source (AccountFanscore DynamoDB)
- Fall back to minimal user data if neither succeeds
- Each step in chain handles or passes to next

## Layer Separation

The architecture separates concerns into distinct layers:

### 1. **Entry Layer**
- **Location**: `shared/entryFiles/lambda.js`
- **Responsibility**: AWS Lambda handler, pre-warming, top-level error handling

### 2. **Resolution Layer**
- **Location**: `shared/appResolver/`
- **Responsibility**: Map environment variable (`APP_NAME`) to worker implementation

### 3. **Middleware Layer**
- **Location**: `shared/middlewares/`
- **Responsibility**: Cross-cutting concerns (tracing, correlation, input transformation, authentication, result handling)

### 4. **Service Layer**
- **Location**: `shared/services/`
- **Responsibility**: External integration clients (AWS, MongoDB, HTTP APIs)

### 5. **Business Logic Layer**
- **Location**: `apps/*/index.js`
- **Responsibility**: Worker-specific privacy request processing

### 6. **Configuration Layer**
- **Location**: `configs/*.config.yml` and `shared/config/`
- **Responsibility**: Environment-specific settings, merged at runtime

## Dependency Direction

**Clean Dependency Flow**:

```
Entry Layer (lambda.js)
    ↓
Resolution Layer (appResolver)
    ↓
Middleware Layer (middlewares/)
    ↓
Business Logic Layer (apps/*/index.js)
    ↓
Service Layer (services/)
    ↓
External Systems (AWS, MongoDB, HTTP APIs)
```

**Key Principles**:
- **Business logic depends on services** (injected via middleware)
- **Services depend on configuration** (environment-aware)
- **Middleware depends on nothing** (pure functions)
- **No circular dependencies** between layers
- **Outer layers depend on inner layers**, not vice versa

**Configuration Flow**:
- Configurations loaded at middleware layer
- Injected into services during initialization
- Services passed to business logic via dependency injection

## Deviations & Tech Debt

### 1. **Mixed JavaScript and TypeScript**
- **Issue**: Most code is JavaScript, but some shared services use TypeScript (e.g., `services/index.ts`, `format.ts`)
- **Impact**: Inconsistent type safety, requires ts-node for development
- **Location**: `shared/services/` and scattered `.ts` files

### 2. **Implicit Worker Registration**
- **Issue**: Workers must be manually added to `shared/appResolver/map.js`
- **Impact**: Easy to forget when creating new workers, not automatically discovered
- **Potential Fix**: Auto-generate map from `apps/` directory structure

### 3. **Tight Coupling to Privacy Core**
- **Issue**: All workers directly depend on `privacyCore.publishPrivacyResponse()`
- **Impact**: Cannot reuse workers outside CCPA context
- **Location**: Every worker in `apps/` has hardcoded Privacy Core success/failure publishing

### 4. **Configuration Complexity**
- **Issue**: Immutable.js used for configuration management (legacy approach)
- **Impact**: Complex mental model, harder to debug than plain objects
- **Location**: `shared/config/index.js`

### 5. **Inconsistent Error Handling**
- **Issue**: Some workers catch and re-throw errors after publishing to Privacy Core, others don't
- **Impact**: Inconsistent Lambda failure behavior across workers
- **Location**: Error handling patterns vary across `apps/*/index.js`

### 6. **No Shared Base Worker Class**
- **Issue**: Common worker patterns (extracting request ID, publishing responses) duplicated across workers
- **Potential Fix**: Create base worker class or higher-order function to reduce duplication

### 7. **Middleware Type Mismatch Risk**
- **Issue**: If worker config specifies wrong `middlewareType`, runtime failures occur
- **Impact**: Configuration errors not caught until Lambda execution
- **Potential Fix**: Validate middleware type at build time or startup
