# Architecture Patterns - monoql

## Architecture Style

**Identified Style**: GraphQL API Gateway with Microservices Backend

**Evidence**:
- **GraphQL API Gateway**: Core application is a GraphQL server (Apollo Server) that aggregates multiple backend services
- **Backend for Frontend (BFF)**: Acts as intermediary between frontend clients and multiple backend microservices
- **Microservices Integration**: Six distinct service clients (campaigns, entries, exports, uploads, users, codes) under `lib/clients/`
- **HTTP-based Service Communication**: Each client uses HTTP to communicate with dedicated backend microservices
- **Domain-driven Resolvers**: GraphQL resolvers organized by business domain (Campaign, Entry, Wave, Viewer) rather than technical layers

**Supporting Code**:
```javascript
// app/services/index.js - Service aggregation layer
const requestBasedServices = {
  campaigns,  // campaigns microservice client
  codes,      // codes microservice client
  entries,    // entries microservice client
  exports,    // exports microservice client
  uploads,    // uploads microservice client
  users       // users microservice client
};
```

## Design Patterns Used

### DataLoader Pattern
- **Location**: `app/DataLoaders/index.js`
- **Implementation**: Uses Facebook's DataLoader library for request-level caching and batching
- **Purpose**: Reduces N+1 query problems when fetching data from backend services
- **Example**:
```javascript
const dataLoaders = R.map(makeDataLoader, {
  campaignsById: campaigns.byCampaignId,
  entries: campaignId => entries.getMine({ jwt: ctx.jwt, campaignId }),
  markets: campaigns.getMarkets
});
```

### Middleware Chain Pattern
- **Location**: `app/index.js`
- **Implementation**: Koa middleware stack with ordered execution
- **Purpose**: Request processing pipeline with cross-cutting concerns
- **Stack Order**:
  1. CORS handling
  2. Compression
  3. Tracing/telemetry (unless excluded paths)
  4. Body parsing
  5. Session management
  6. Prometheus metrics (duration, counter)
  7. Context injection
  8. Correlation ID
  9. Access logging
  10. Error formatting
  11. Response formatting
  12. JWT authentication
  13. GraphQL upload support
  14. Route handling

### Service Layer / Repository Pattern
- **Location**: `lib/clients/`, `app/services/`
- **Implementation**: Service clients encapsulate HTTP communication with backend services
- **Purpose**: Abstracts external service integration from business logic
- **Example**:
```javascript
// lib/clients/campaigns/index.js
const campaigns = ({ request }) => ({
  byDomain: ({ jwt, domain, locale }) => request({
    baseUrl: config.getIn(['titan', 'services', 'campaigns', 'url']),
    method: 'GET',
    endpoint: '/campaigns',
    jwt
  })
});
```

### Factory Pattern
- **Location**: Service clients and DataLoaders
- **Implementation**: Functions that accept dependencies and return configured instances
- **Purpose**: Dependency injection and testability
- **Example**:
```javascript
// DataLoaders factory accepts context, returns configured loaders
const DataLoaders = ctx => {
  const { users, campaigns, entries } = ctx.service;
  return R.map(makeDataLoader, { /* loaders */ });
};
```

### Resolver Composition
- **Location**: `app/graphql/schema/resolvers/`
- **Implementation**: Resolvers organized by GraphQL type, merged into unified schema
- **Purpose**: Modular schema definition with separation of concerns by domain
- **Example**:
```javascript
// Resolvers merged from domain-specific modules
const resolvers = [
  Campaign, Markets, Codes, Content, Entry,
  Viewer, Wave, Exports, Metrics
].reduce((acc, curr) => mergeDeepRight(acc, curr), {});
```

### Configuration as Code
- **Location**: `configs/`, `lib/config.js`
- **Implementation**: YAML configuration files per environment with schema validation
- **Purpose**: Environment-specific configuration without code changes
- **Environments**: default, dev, docker, local-dev, qa, qa2, preprod, prod, prodw

### Instrumentation Pattern
- **Location**: `app/services/InstrumentServices.js`
- **Implementation**: Wraps service calls with observability (metrics, tracing)
- **Purpose**: Automatic instrumentation of service client calls
- **Evidence**: Service initialization wraps all clients with instrumentation

## Layer Separation

**Three-tier logical separation:**

1. **Presentation Layer** (`app/graphql/schema/`)
   - GraphQL schema definitions (types)
   - GraphQL resolvers (query/mutation handlers)
   - Input validation and transformation
   - Response formatting

2. **Application Layer** (`app/services/`, `app/DataLoaders/`)
   - Business logic coordination
   - Service orchestration
   - Data loading and caching
   - Authentication/authorization context

3. **Integration Layer** (`lib/clients/`)
   - HTTP clients for backend services
   - External service communication
   - Request/response transformation
   - Service-specific error handling

**Middleware Layer** (cross-cutting concerns):
- Authentication (JWT)
- Logging and observability
- Metrics collection (Prometheus)
- Distributed tracing (OpenTelemetry)
- CORS handling
- Session management

## Dependency Direction

**Clean dependency flow:**

```
GraphQL Resolvers → Application Services → Service Clients → Backend APIs
       ↓                    ↓
   DataLoaders      Context/Middleware
```

- **Resolvers** depend on DataLoaders and service layer
- **DataLoaders** depend on service clients
- **Service clients** depend on configuration and HTTP utilities
- **Middlewares** are independent and composable
- **No circular dependencies** - strict unidirectional flow from presentation to integration

**Context propagation:**
- Request context flows through middleware chain
- JWT tokens extracted early and attached to context
- Service clients receive JWT from context for authenticated requests
- DataLoaders created per-request to ensure request-level caching

## Deviations & Tech Debt

### Potential Tech Debt Areas

1. **Mixed Service Communication Patterns**
   - Evidence: Both `requestBasedServices` and `sdkBasedServices` structures exist
   - `sdkBasedServices` is currently empty but infrastructure exists
   - Suggests potential migration or inconsistent patterns

2. **Babel/Webpack Build Complexity**
   - Uses Babel transpilation for ES6 modules
   - Webpack for bundling
   - Modern Node.js supports ES6 natively - build step may be unnecessary overhead

3. **Pseudo-batching in DataLoader**
   - Implementation: `pseudoBatch = apiFn => R.pipe(R.map(apiFn), promises => Promise.all(promises))`
   - Maps individual API calls rather than true batch endpoints
   - Backend services likely don't support batching - DataLoader only provides caching benefit

4. **GraphQL Version**
   - Using `graphql@0.12.0` (very old, current is 16+)
   - `apollo-server-koa@1.2.0` (deprecated, current is @apollo/server)
   - Security and performance improvements missed from newer versions

5. **Test Organization**
   - Unit tests co-located (`.spec.js`) but BDD tests separated in `features/`
   - Two testing frameworks: Jest for unit tests, Cucumber for acceptance tests
   - Potential duplication of test scenarios

6. **Configuration Management**
   - 9+ environment-specific config files
   - Configuration scattered across `configs/` and `kube/` directories
   - Environment-specific values could be consolidated or externalized

### Positive Patterns

- **Strong observability**: Comprehensive logging, metrics, and tracing
- **Clear separation**: Distinct layers with well-defined responsibilities
- **Testability**: DataLoader and service patterns support testing
- **Extensibility**: Middleware chain allows easy addition of cross-cutting concerns
