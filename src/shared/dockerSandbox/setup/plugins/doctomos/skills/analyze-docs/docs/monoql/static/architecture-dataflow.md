# Data Flow - monoql

## Primary Flow

The monoql service acts as a **GraphQL API Gateway** that aggregates data from multiple backend microservices. Client requests flow through a middleware pipeline, are resolved by GraphQL resolvers, which fetch data from backend services via HTTP clients.

```
Client (Browser/App)
    ↓
    HTTP POST /graphql
    ↓
Koa Middleware Stack
    ├─ CORS
    ├─ Compression
    ├─ Tracing
    ├─ Body Parser
    ├─ Session Management
    ├─ Prometheus Metrics
    ├─ Context Injection
    ├─ JWT Authentication
    └─ Error/Response Formatting
    ↓
Apollo Server GraphQL Handler
    ↓
GraphQL Schema Resolvers
    ├─ Campaign Resolvers
    ├─ Entry Resolvers
    ├─ Wave Resolvers
    ├─ Viewer Resolvers
    └─ ...
    ↓
DataLoaders (Request-level Cache)
    ↓
Service Layer (Instrumented)
    ↓
HTTP Service Clients
    ├─ Campaigns Service
    ├─ Entries Service
    ├─ Exports Service
    ├─ Uploads Service
    ├─ Users Service
    └─ Codes Service
    ↓
Backend Microservices (External)
```

## Request/Response Cycle

### 1. Request Entry
**Entry Point**: `app/index.js` - Koa server listening on port 8080 (configurable)

```javascript
// Server initialization
const app = new Koa();
app.listen(port);
```

### 2. Middleware Processing (Sequential)

**CORS Handling** (`app/middlewares/cors/`)
- Validates request origin against allowed origins
- Sets CORS headers for cross-origin requests
- Resolves origin from configuration or environment

**Tracing** (`lib/middlewares/telemetry`)
- Injects OpenTelemetry trace context
- Skipped for `/metrics`, `/heartbeat`, `/graphiql`
- Propagates trace ID through request lifecycle

**Authentication** (`lib/middlewares/jwt`)
- Extracts JWT from Authorization header or cookies
- Validates token signature
- Attaches decoded JWT to context: `ctx.jwt`

**Context Enrichment** (`lib/middlewares/context`)
- Creates request context with service clients
- Attaches service layer to context: `ctx.service`
- Makes services available to resolvers

### 3. GraphQL Processing

**GraphQL Handler** (`app/graphql/index.js`)
```javascript
export const graphql = graphqlKoa(ctx => {
  const { service, jwt } = koaCtxToManagerCtx({ ctx });
  ctx.service = service;
  ctx.jwt = jwt;
  ctx.dataLoaders = DataLoaders(ctx);

  return {
    schema,
    context: ctx,
    logFunction: LogFunction(ctx),
    formatError: formatError(ctx)
  };
});
```

**Key Operations**:
1. Service clients extracted from context
2. JWT token attached to context
3. DataLoaders initialized (per-request instances for caching)
4. GraphQL schema and resolvers executed
5. Errors formatted with user/developer messages

### 4. Resolver Execution

**Example: Campaign Query**
```javascript
// app/graphql/schema/resolvers/Campaign/index.js
Query: {
  campaign: async (_, { domain, campaignId }, ctx) => {
    const { dataLoaders, jwt } = ctx;

    // DataLoader batches/caches requests within this request cycle
    const campaign = await dataLoaders.campaignsById.load({
      jwt,
      campaignId
    });

    return campaign;
  }
}
```

**Resolver Flow**:
1. Extract arguments (domain, campaignId) and context
2. Access DataLoader from context
3. DataLoader checks cache - if miss, calls service client
4. Service client makes HTTP request to backend
5. Response cached in DataLoader for this request
6. Data returned to resolver
7. GraphQL transforms data per schema type

### 5. Backend Service Communication

**Service Client Pattern** (`lib/clients/campaigns/index.js`)
```javascript
const campaigns = ({ request }) => ({
  byCampaignId: ({ jwt, campaignId, locale }) => request({
    baseUrl: config.getIn(['titan', 'services', 'campaigns', 'url']),
    method: 'GET',
    endpoint: `/campaigns/${campaignId}`,
    qs: { locale },
    jwt  // Passed as Authorization header
  })
});
```

**HTTP Request Details**:
- Base URL from environment config
- JWT included in Authorization header
- Request instrumented with metrics and tracing
- Response parsed and returned to DataLoader

### 6. Response Formatting

**Success Path**:
1. Resolver returns data
2. GraphQL formats per schema
3. Response middleware wraps in standard format (unless `/graphql` endpoint)
4. Prometheus metrics recorded (duration, count)
5. Access log entry written
6. JSON response sent to client

**Error Path**:
1. Error thrown in resolver or service client
2. `FormatError` handler processes error
3. Differentiates user-facing vs developer messages
4. Logs error with trace context
5. Returns GraphQL error response

## State Management

**Request-Scoped State**:
- **Koa Context** (`ctx`): Request-specific data, session, JWT
- **DataLoaders**: Per-request caching instances (prevent N+1 queries)
- **Service Clients**: Stateless - accept JWT per call
- **Session**: Stored in Koa session (cookies or session store)

**Application-Level State**:
- **Configuration**: Loaded at startup from YAML files
- **Prometheus Metrics**: Aggregated across requests
- **DNS Cache**: Shared cache with configurable TTL (default 1 hour)

**No persistent state in monoql** - all data fetched from backend services.

## Event Processing

Not applicable - monoql is a synchronous request/response service, not event-driven.

## External Integrations

### Backend Microservices (HTTP)

| Service | Client Location | Purpose | Base URL Config |
|---------|----------------|---------|----------------|
| Campaigns Service | `lib/clients/campaigns/` | Campaign management, markets, artists, venues, promoters | `titan.services.campaigns.url` |
| Entries Service | `lib/clients/entries/` | User entries, eligibility, entry management | `titan.services.entries.url` |
| Exports Service | `lib/clients/exports/` | Data export generation and retrieval | `titan.services.exports.url` |
| Uploads Service | `lib/clients/uploads/` | File upload management, S3 operations | `titan.services.uploads.url` |
| Users Service | `lib/clients/users/` | Authentication, user profile management | `titan.services.users.url` |
| Codes Service | `lib/clients/codes/` | Code generation and validation | `titan.services.codes.url` |

### Service Client Operations

**Campaigns Service**:
- Fetch campaigns by domain or ID
- List campaigns with filters (type, artist, version)
- Upsert campaigns and markets
- Search artists, contacts, venues
- Manage promoters

**Entries Service**:
- Get user's entries for a campaign
- Check eligibility
- Get eligibility counts

**Exports Service**:
- Get export by ID
- List exports with filters

**Uploads Service**:
- List S3 objects
- Get object data

**Users Service**:
- Authenticate user (login)
- Get current user (`me` endpoint)

**Codes Service**:
- Code-related operations (specific methods in client)

### Authentication Flow

```
Client → POST /graphql
       → Query { viewer { authenticate(email, password) } }
          ↓
       GraphQL Resolver
          ↓
       DataLoader: authenticate
          ↓
       Users Service Client → POST /authenticate
          ↓
       Users Service (Backend) validates credentials
          ↓
       Returns: { auth: { token: "jwt..." }, user: {...} }
          ↓
       DataLoader caches viewer
       ctx.jwt updated with new token
          ↓
       Response to client with JWT
```

**Subsequent Requests**:
- Client includes JWT in Authorization header
- JWT middleware validates and attaches to `ctx.jwt`
- Service clients include JWT in backend requests
- Backend services validate JWT and return user-specific data

### Observability Integrations

**Prometheus** (`/metrics` endpoint):
- Request duration histogram
- Request counter
- Default Node.js metrics (memory, CPU, event loop)
- Custom business metrics from resolvers

**OpenTelemetry Tracing**:
- Trace context propagated through middleware
- Spans created for service calls
- Distributed tracing across monoql and backend services

**Access Logging**:
- GraphQL-specific access log (`app/middlewares/graphqlAccessLog.js`)
- Standard HTTP access log
- Includes correlation IDs, duration, status codes

**Error Logging**:
- Structured logging with context
- Separate user vs developer error messages
- Stack traces logged but not exposed to clients

## GraphQL Upload Flow

**File Upload Handling**:
1. Client sends multipart/form-data request with GraphQL mutation
2. `graphqlUploadKoa()` middleware processes multipart data
3. Files available as Promise-like objects in resolver arguments
4. Resolver streams file to Uploads Service
5. Uploads Service stores in S3
6. Returns file metadata/URL to client

**Upload Resolver Example**:
```javascript
Mutation: {
  uploadFile: async (_, { file }, ctx) => {
    const { createReadStream, filename, mimetype } = await file;
    // Stream to uploads service
    const result = await ctx.service.uploads.uploadFile({
      stream: createReadStream(),
      filename,
      mimetype
    });
    return result;
  }
}
```
