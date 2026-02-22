# Architecture Patterns - vf-lib

## Architecture Style

**Identified Style**: **Monorepo Library Collection**

This repository follows a **monorepo pattern** for managing a collection of independent, reusable libraries. It is NOT a single application but rather a curated set of 48 npm packages that are developed, tested, and published together.

**Evidence**:
- **Lerna Configuration**: `lerna.json` with `"packages": ["packages/*"]` and `"version": "independent"` indicates independent versioning per package
- **Multiple Entry Points**: Each package in `packages/` has its own `package.json`, `src/`, and exports
- **Scoped Packages**: All packages are published under `@verifiedfan` npm scope
- **Independent Publishing**: CI/CD pipeline publishes only changed packages (semantic-release + conventional commits)
- **Cross-Package Dependencies**: Packages reference each other via npm (e.g., `@verifiedfan/spotify` depends on `@verifiedfan/request`)
- **Shared Tooling**: Common babel/typescript configs, linting, testing frameworks at root

**Why This Style Makes Sense**:
- Enables code reuse across VerifiedFan services and applications
- Each package can be versioned and published independently
- Consumers only install the specific packages they need
- Shared development tooling reduces configuration duplication
- Single repository simplifies cross-package refactoring

## Design Patterns Used

### 1. Factory Pattern
- **Location**: Multiple API client packages (spotify, apple-music, bitly, etc.)
- **Implementation**: Client functions accept configuration and return an object with methods
- **Example**:
  ```javascript
  // packages/spotify/src/index.js
  export default ({ version, appId, appSecret }) => {
    const request = Request({ version, appId, appSecret });
    return R.map(fn => fn({ request }), {
      getUser,
      getSavedTracks,
      // ... more methods
    });
  };
  ```

### 2. Dependency Injection Pattern
- **Location**: API clients (spotify, apple-music, request)
- **Implementation**: Core functionality (request) is injected into endpoint functions
- **Example**: Endpoint functions receive `{ request }` as parameter, enabling testability and reusability

### 3. Adapter Pattern
- **Location**: AWS package (`packages/aws/src/`)
- **Implementation**: Each AWS service (S3, DynamoDB, Lambda, SQS, etc.) has its own adapter module
- **Example**:
  ```typescript
  // packages/aws/src/index.ts
  import S3 from './s3';
  import Kinesis from './kinesis';
  // Exposes unified interface to AWS services
  export default { S3, Kinesis, Firehose, Lambda, ... };
  ```

### 4. Middleware/Transform Stream Pattern
- **Location**: Stream processing packages (flatten-transform-stream, batch-transform-stream, reduce-lines-from-stream)
- **Implementation**: Node.js Transform streams for data processing pipelines
- **Example**: Used for processing large datasets in chunks without loading into memory

### 5. Singleton Pattern (Global Tracer)
- **Location**: `packages/tracing/src/index.ts`
- **Implementation**: OpenTelemetry tracer is initialized once and stored in `global.nodeTraceProvider`
- **Example**:
  ```typescript
  export const GlobalTracer = ({ tracerName, serviceName, ... }) => {
    if (global.nodeTraceProvider) {
      return getTracer(tracerName);
    }
    // Initialize provider once
    global.nodeTraceProvider = provider;
    return getTracer(tracerName);
  };
  ```

### 6. Retry Pattern with Exponential Backoff
- **Location**: `packages/request/src/index.js`
- **Implementation**: HTTP requests automatically retry on 5xx errors using `async-retry` library
- **Example**:
  ```javascript
  const retryOptions = {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    randomize: false
  };
  const response = await asyncRetry(
    bail => retryRequest({ normalizedParams, bail }),
    retryOptions
  );
  ```

### 7. Repository/Client Pattern
- **Location**: MongoDB, Kafka, Redis packages
- **Implementation**: Each data store has a client wrapper abstracting connection and operations
- **Purpose**: Shields consumers from underlying SDK complexity

### 8. Normalizer Pattern
- **Location**: `packages/normalizers/`, also within API clients (spotify/normalizers.js)
- **Implementation**: Functions that transform external API responses to consistent internal formats
- **Purpose**: Standardize data shapes across different third-party services

### 9. Functional Composition with Ramda
- **Location**: Throughout codebase, especially in API clients
- **Implementation**: Heavy use of Ramda library for functional programming patterns
- **Example**: `R.map`, `R.pipe`, `R.curry` for composing operations

### 10. Test Builder Pattern
- **Location**: `packages/test-utils/src/generate/` and `packages/test-utils/src/lambdaInputs/`
- **Implementation**: Factory functions to generate test data and mock AWS Lambda events
- **Example**: `generateUser()`, `generateCampaign()`, `makeDynamoDBStreamRecords()`

## Layer Separation

**This is a library collection, not a layered application**. However, packages can be categorized by concern:

### External Integration Layer
- API clients for third-party services: spotify, apple-music, bitly, facebook
- Ticketmaster service clients: tm-accounts, tm-discovery, tm-orders, tm-users, tm-wallet, tm-pacman, tm-sms
- Cloud service clients: aws, kafka, mongodb, redis, snowflake

### Infrastructure/Cross-Cutting Layer
- **Observability**: tracing, log, prometheus, pager-duty
- **Security**: jwt, crypto
- **Error Handling**: vf-error
- **HTTP Client**: request (with retry logic)

### Data Processing Layer
- **Streaming**: batch-transform-stream, flatten-transform-stream, reduce-lines-from-stream, csv-write-stream
- **Utilities**: batch-fn, normalizers

### Utility Layer
- **Data manipulation**: object-utils, string-utils, map-utils
- **Time**: date, delay, timer
- **Configuration**: configs, schemas, yaml, avro
- **Locale**: locale

### Testing Layer
- test-utils, cucumber-features

## Dependency Direction

**Dependency Flow**: Low-level utilities → Infrastructure → Integration clients

**Example Dependency Chain**:
```
spotify (API client)
  ↓ depends on
request (HTTP client with retry)
  ↓ depends on
log (logging)
  ↓ depends on
(external: winston)
```

**Inter-Package Dependencies Are Clean**:
- Lower-level packages (log, request, jwt) have no internal dependencies
- Higher-level packages (API clients) depend on lower-level utilities
- No circular dependencies detected in package.json files
- Lerna manages symlinks correctly

**Root vs Package Dependencies**:
- **Root `package.json`**: Dev dependencies (babel, typescript, jest, lerna) available to ALL packages
- **Package `package.json`**: Only runtime dependencies specific to that package
- Keeps package dependency trees minimal for consumers

## Deviations & Tech Debt

### Language Inconsistency
- **Issue**: Mix of JavaScript (Babel) and TypeScript packages
- **Evidence**: Some packages use `.js` (jwt, spotify), others use `.ts` (tracing, crypto, locale, aws)
- **Impact**: No TypeScript benefits for older packages (type safety, IDE support)
- **Recommendation**: Gradual migration to TypeScript for core packages

### Integration Test Organization
- **Issue**: Integration tests in separate `integrationTests/` directories but not consistently present
- **Evidence**: Only some packages have `integrationTests/` (spotify, apple-music, bitly, kafka, mongodb, tm-pacman)
- **Impact**: Unclear which packages have integration test coverage
- **Recommendation**: Standardize integration test presence or document why some packages lack them

### Legacy `src/` Directory at Root
- **Issue**: Root-level `src/` directory contains old npm-lib packages
- **Evidence**: README.md mentions "the `src/` directory contains the old `npm-lib` packages to preserve commit history"
- **Impact**: Confusing directory structure with both `src/` and `packages/`
- **Status**: Intentional for git history preservation, but may confuse new developers

### Build Output Not Gitignored Consistently
- **Issue**: Some packages may commit `dist/` directories
- **Evidence**: `.gitignore` excludes node_modules but unclear if dist/ is consistently ignored
- **Recommendation**: Verify dist/ is properly ignored in version control

### Shared Root Dependencies
- **Issue**: Root `package.json` has dependencies (debug, ramda) that may be needed by packages
- **Evidence**: `ramda` is used throughout packages but declared at root
- **Impact**: Packages may implicitly rely on root dependencies
- **Recommendation**: Each package should explicitly declare its own dependencies

### JWT Package Naming
- **Issue**: Package exports `WorkerAuth` as a named export but uses inconsistent naming
- **Evidence**: `packages/jwt/src/index.js` exports `{ WorkerAuth }` vs default exports
- **Impact**: Consumers must use `import { WorkerAuth } from '@verifiedfan/jwt'` vs `import JWT from '@verifiedfan/jwt'`
- **Recommendation**: Consider consistency in export patterns

### Monorepo-Specific Patterns
- **Pattern**: Independent versioning (`lerna.json` has `"version": "independent"`)
- **Implication**: Each package can have different version numbers (observed in package.json files)
- **Trade-off**: Flexibility in releases vs potential version sprawl

## Architectural Decisions

### Decision: Lerna + Independent Versioning
- **Rationale**: Allows fine-grained releases - only changed packages are published
- **Alternative**: Fixed versioning (all packages same version)
- **Impact**: More flexible but requires good conventional commit hygiene

### Decision: Scoped npm Packages (@verifiedfan)
- **Rationale**: Namespace isolation, clear ownership, private package support
- **Alternative**: Unscoped package names
- **Impact**: All packages clearly branded as VerifiedFan

### Decision: Babel for JavaScript, TSC for TypeScript
- **Rationale**: Standard tooling for each language ecosystem
- **Alternative**: Babel for all (with @babel/preset-typescript)
- **Impact**: TypeScript packages get full type checking; JS packages transpiled only

### Decision: Co-located Unit Tests
- **Rationale**: Tests live next to code (`.spec.js` files in `src/`)
- **Alternative**: Separate test/ directory
- **Impact**: Easier to find tests, but dist/ includes compiled tests (filtered by tsconfig.build.json)

### Decision: Semantic Release + Conventional Commits
- **Rationale**: Automated versioning and changelog generation
- **Alternative**: Manual version bumps
- **Impact**: Requires disciplined commit messages but reduces manual release overhead
