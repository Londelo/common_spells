# Architecture Patterns - vf-api-workers

## Architecture Style

**Identified Style**: Serverless Event-Driven Architecture with Middleware Pipeline Pattern

**Evidence**:
- Each app is a separate AWS Lambda function triggered by different event sources (Kinesis, DynamoDB Streams, SQS, S3, AppSync)
- Configuration file (`configs/default.config.yml`) defines each worker with `entryFile: lambda` and specific `middlewareType`
- Middleware types map to event sources: `kinesisConsumer`, `dynamodbKinesisConsumer`, `sqsConsumer`, `s3Consumer`, `appsyncResolver`
- Workers are independent, stateless functions that process events and produce results
- Event-driven data flow: S3 → Kinesis → DynamoDB → DynamoDB Streams → SQS → Slack
- Shared middleware pipeline composes behavior based on event source type

**Hybrid Characteristics**:
- **Microservices**: Workers integrate with separate HTTP services (campaign-service, entry-service, user-service)
- **Monorepo**: All Lambda functions in single repository with shared utilities
- **Pipeline Architecture**: Middleware composition pattern (Ramda `compose`) creates processing pipelines

## Design Patterns Used

### 1. Middleware Pipeline Pattern
- **Location**: `shared/middlewares/`
- **Implementation**: Functional composition using Ramda's `compose` in `ComposeMiddlewares.js`
- **Example**:
```javascript
// shared/middlewares/index.js
[MIDDLEWARE_TYPES.KINESIS_CONSUMER]: [
  correlation,           // Generate correlation IDs
  Tracing({ workerName }), // OpenTelemetry tracing
  transformKinesisRecords, // Decode Kinesis data
  setRecordCorrelations,   // Track individual records
  services,                // Inject AWS/HTTP clients
  authentication,          // Validate JWTs
  resultHandler            // Handle success/errors
]
```
- **Purpose**: Separates cross-cutting concerns from business logic. Each worker gets a tailored pipeline based on its event source type.

### 2. Dependency Injection via Middleware
- **Location**: `shared/middlewares/services.js`
- **Implementation**: Services middleware injects lazily-initialized clients into worker context
- **Example**:
```javascript
// Services injected into worker function
const worker = async({ input, Services, correlation }) => {
  const { aws: { demandTable }, campaigns, entries } = Services;
  // Use injected services
};
```
- **Purpose**: Workers receive pre-configured AWS clients and HTTP services without managing initialization

### 3. Strategy Pattern (Event Source Transformers)
- **Location**: `shared/middlewares/transformInput/`
- **Implementation**: Different transformers for each event source type (Kinesis, SQS, S3, DynamoDB, etc.)
- **Example**:
```javascript
// Kinesis transformer decodes base64 data and parses JSON
transformKinesisRecords: (app) => async (params) => {
  const input = params.input.event.Records.map(decodeKinesisRecord);
  return app({ ...params, input });
}
```
- **Purpose**: Normalizes diverse AWS event formats into consistent input for worker business logic

### 4. Factory Pattern (Service Client Construction)
- **Location**: `shared/services/aws/ClientMap.js`
- **Implementation**: Dynamically constructs AWS clients from configuration
- **Example**:
```javascript
// ClientMap reads config and instantiates DynamoDB, Kinesis, S3, SQS clients
const aws = AWSClients({ namespace: REPO_NAMESPACE });
// Returns: { demandTable: DynamoDB, scoresStream: Kinesis, ... }
```
- **Purpose**: Configuration-driven client creation with environment-specific settings

### 5. Repository Pattern (AWS Service Abstractions)
- **Location**: `@verifiedfan/aws` package (external dependency)
- **Implementation**: Workers use high-level methods like `demandTable.getMany()`, `scoresStream.putRecords()`
- **Purpose**: Abstracts AWS SDK complexity and provides domain-specific operations

### 6. Correlation ID Pattern
- **Location**: `shared/middlewares/correlation.js`, `shared/middlewares/setRecordCorrelations.js`
- **Implementation**: Generates unique IDs per invocation and per-record for tracing
- **Example**:
```javascript
correlation: (app) => async (params) => {
  const correlation = { id: uuid(), timestamp: Date.now() };
  return app({ ...params, correlation });
}
```
- **Purpose**: Distributed tracing across Lambda invocations, AWS services, and external APIs

### 7. Configuration as Code Pattern
- **Location**: `configs/`, `shared/config/`
- **Implementation**: YAML configuration with environment overrides and validation
- **Example**:
```yaml
# configs/default.config.yml
verifiedfan:
  workers:
    loadScoresToDynamoDB:
      inventoryCode: vf-api-load-db
      entryFile: lambda
      middlewareType: kinesisConsumer
```
- **Purpose**: Declarative worker definition separates configuration from code

### 8. Result Handler Pattern (Error Boundary)
- **Location**: `shared/middlewares/resultHandler.js`
- **Implementation**: Wraps worker execution, catches errors, emits metrics, logs results
- **Example**:
```javascript
try {
  const result = await app(params);
  log.info('success', { result, correlation });
  return { input, result, correlation };
} catch (error) {
  log.error('failure', { message, stack, correlation });
  putMetric({ metric: ERROR_METRIC });
  return { correlation, error };
}
```
- **Purpose**: Centralized error handling, logging, and metric emission

## Layer Separation

**Presentation Layer**: Lambda entry point (`shared/entryFiles/lambda.js`)
- Handles AWS Lambda runtime integration
- Routes to middleware-wrapped worker

**Middleware Layer**: Cross-cutting concerns (`shared/middlewares/`)
- Input transformation (event source specific)
- Service injection
- Authentication
- Correlation tracking
- Telemetry (tracing, logging, metrics)
- Result handling and error boundaries

**Business Logic Layer**: Worker implementations (`apps/{workerName}/`)
- Pure business logic functions
- Receives normalized input and services
- Returns results (no side effects in return value)

**Data Access Layer**: Service clients (`shared/services/`)
- AWS SDK wrappers (DynamoDB, Kinesis, S3, SQS)
- HTTP API clients (campaigns, entries, users)
- Third-party integrations (Slack, TeleSign)

**Configuration Layer**: YAML configs and resolvers (`configs/`, `shared/config/`)
- Environment-specific settings
- AWS resource names
- Service URLs
- Middleware type mappings

## Dependency Direction

**Clean Dependency Flow** (mostly):
- Workers depend on middleware abstractions (good)
- Middleware depends on service interfaces (good)
- Services depend on external SDKs and configuration (good)

**Potential Issues**:
- App resolution (`shared/appResolver/map.js`) uses `require()` to dynamically load workers, which couples the resolution logic to the file system structure
- Configuration module (`shared/config/`) directly reads from `configs/` directory, tightly coupling config format to implementation

## Deviations & Tech Debt

### 1. Dynamic Require for App Loading
**Location**: `shared/appResolver/map.js`
```javascript
[workerName]: require(`../../apps/${stack ? `${stack}/${workerName}` : workerName}`).default
```
**Issue**: Dynamic require prevents static analysis and tree-shaking
**Impact**: Bundling complexity, potential for runtime errors if worker missing

### 2. Mixed JavaScript and TypeScript
**Evidence**: `.js` files in most of repo, `.ts` files in `shared/services/`, `shared/middlewares/telemetry.ts`
**Issue**: Inconsistent type safety across codebase
**Impact**: Limited compile-time error detection in JavaScript portions

### 3. Global State in Services
**Location**: `shared/middlewares/services.js`
```javascript
let services;
services = services ?? await Services();
```
**Issue**: Memoized services persist across Lambda invocations in warm containers
**Impact**: Potential stale connections if service configuration changes (though this is intentional for performance)

### 4. Configuration Coupling
**Location**: `shared/config/index.js`
- Hardcoded paths to `../../configs/`
- Uses `@verifiedfan/configs` package with custom loader
**Issue**: Tight coupling between config format and loading mechanism
**Impact**: Difficult to test with alternative configurations

### 5. Middleware Type String Literals
**Location**: `shared/middlewares/types.js`, `configs/default.config.yml`
- Middleware types defined as string constants
- Configuration uses string values: `middlewareType: kinesisConsumer`
**Issue**: No compile-time validation of middleware type names
**Impact**: Typos in config cause runtime errors

### 6. Test Organization
**Location**: `features/` (Cucumber tests) alongside unit tests (`.spec.js` files in source)
**Issue**: Mixed test paradigms (BDD integration tests + unit tests)
**Impact**: Confusion about test coverage and when to use each style

### 7. Babel Build Complexity
**Location**: `babel.config.json`, `webpack.config.babel.js`
- Complex Babel configuration with multiple plugins
- Webpack bundling for Lambda deployment
**Issue**: Build pipeline complexity for what could be simpler with native ES modules or TypeScript compilation
**Impact**: Slower builds, more dependencies, harder to debug bundling issues
