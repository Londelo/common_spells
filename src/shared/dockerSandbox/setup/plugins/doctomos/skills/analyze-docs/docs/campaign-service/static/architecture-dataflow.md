# Data Flow - campaign-service

## Primary Flow

This service implements a **RESTful API for campaign management** where data flows from HTTP requests through business logic layers to MongoDB and external services, then back through formatters to HTTP responses.

```
HTTP Request
    ↓
Koa Middleware Pipeline (auth, logging, correlation)
    ↓
Router (extract params, convert to manager context)
    ↓
Manager (validate, enforce rules, orchestrate)
    ↓                              ↓
Datastore (MongoDB)       Services (External APIs)
    ↓                              ↓
Raw data                    API responses
    ↓                              ↓
Manager (format, transform)
    ↓
HTTP Response (JSON)
```

## Request/Response Cycle

### Inbound Request Processing

**1. Middleware Pipeline** (`app/index.js`)
```
Request → compress → tracing → bodyParser → prometheus → context
       → correlation → accessLog → errorFormatter → responseFormatter
       → jwt → router
```

Key transformations:
- **compress**: Gzip response compression
- **tracing**: Start OpenTelemetry span, assign trace ID
- **bodyParser**: Parse JSON body into `ctx.request.body`
- **prometheus**: Record request metrics (duration, count)
- **context**: Add context utilities to `ctx`
- **correlation**: Generate/extract correlation ID, attach to `ctx.correlation`
- **accessLog**: Log request with correlation ID
- **jwt**: Validate JWT, attach decoded token to `ctx.jwt`
- **errorFormatter**: Catch errors and format as JSON responses
- **responseFormatter**: Wrap responses in consistent structure

**2. Router Layer** (`app/router/campaigns.js` example)
```javascript
router.get('/:campaignId', ctx => {
  const campaignId = selectCampaignId(ctx);               // Extract from path
  const locale = selectLocale(ctx);                       // Extract from query
  const authUserActions = selectCampaignActions({ ctx, campaignId }); // From JWT
  const managerCtx = koaCtxToManagerCtx({ ctx });        // Convert context
  return campaignManager.findById(managerCtx, {          // Call manager
    campaignId, authUserActions, locale, showAllLocales
  });
});
```

Context transformation:
```javascript
// Input: Koa ctx
{
  params: { campaignId: '123' },
  query: { locale: 'en' },
  request: { body: { ... } },
  correlation: 'abc-def',
  jwt: { userId, actions, campaigns }
}

// Output: Manager ctx
{
  correlation: 'abc-def',
  jwt: { userId, actions, campaigns },
  datastore: { campaigns, markets, events, ... },  // Instrumented
  service: { discovery, redis, fastly, ... },      // Instrumented
  InstrumentedAsyncOperation: fn
}
```

**3. Manager Layer** (`app/managers/campaigns/index.js`)
```javascript
export const findById = async(managerCtx, { campaignId, authUserActions, locale }) => {
  // 1. Fetch from database
  const campaign = await managerCtx.datastore.campaigns.findById(campaignId);

  // 2. Validate access
  throwIfInvalidPermissions({ campaign, authUserActions });

  // 3. Format for response
  return formatCampaign({ campaign, locale });
};
```

**4. Datastore Layer** (`app/datastore/campaigns.js`)
```javascript
const findById = async(campaignId) => {
  const doc = await DataStore.findById(campaignId);
  if (!doc) throw error(errors.campaignNotFound);
  return doc;  // Raw MongoDB document
};
```

**5. Response Formatting** (Manager → Router → Middleware)
```javascript
// Manager formats
{
  _id: '123',
  name: 'Campaign Name',
  status: 'OPEN',
  date: { start: '2024-01-01', end: '2024-01-31' },
  domain: { site: 'example.verifiedfan.com' }
}

// Response middleware wraps
{
  data: { /* campaign object */ },
  meta: {
    correlation: 'abc-def',
    timestamp: '2024-01-15T12:00:00Z'
  }
}
```

### Outbound Integrations

**Services called by managers**:

1. **Ticketmaster Discovery API** (`app/services/discovery/`)
   - Search artists, venues, events
   - Cache results in Redis (TTL-based)
   - Used by: artist manager, venue manager, event manager

2. **Fastly CDN** (`app/services/fastly/`)
   - Purge cache when campaigns update
   - Called by: `triggerPostUpdateOperations`

3. **Redis Cache** (`app/services/redis/`)
   - Cache Discovery API responses
   - Read replica support for HA
   - TTL-based expiration

4. **AWS Kinesis** (`app/services/campaignDataStream/`)
   - Stream campaign changes to data pipeline
   - Called by: `triggerPostUpdateOperations/saveToCampaignPipeline.js`

5. **AWS SQS Queues** (`app/services/queue/`)
   - `refreshSelectionsQueue`: Trigger selection refresh
   - `dataPipelineQueue`: Send market data to analytics
   - Called by: market and campaign update operations

6. **GitLab API** (`app/services/gitlab/`)
   - Integration for deployment/config management
   - Used by: admin operations

## Campaign Lifecycle Data Flow

### Create Campaign
```
POST /campaigns
    ↓
1. Router validates JWT, extracts body
    ↓
2. Manager validates schema (ValidateSchema('campaignV2'))
    ↓
3. Manager validates business rules:
   - throwIfInvalidCampaign
   - throwIfInvalidPermissions
   - throwIfDomainNameConflict (check if domain.site already exists)
    ↓
4. Datastore inserts document into db.campaigns
    ↓
5. Manager triggers post-create operations:
   - Send to Kinesis data stream
   - Purge Fastly cache
    ↓
6. Return formatted campaign
```

### Update Campaign
```
POST /campaigns/:campaignId
    ↓
1. Router extracts campaignId, body, JWT
    ↓
2. Manager fetches existing campaign from datastore
    ↓
3. Manager validates permissions and business rules
    ↓
4. Manager merges changes with existing data
    ↓
5. Datastore updates document in db.campaigns
    ↓
6. Manager triggers post-update operations:
   - Send to Kinesis (saveToCampaignPipeline)
   - Send to data pipeline queue (sendToDataPipeline)
   - Purge Fastly cache (purgeFastlyCache)
   - Maybe update linked campaigns (updateLinkedCampaigns)
    ↓
7. Return formatted campaign
```

### Status Refresh (Automatic)
```
POST /campaigns/refresh (admin-only endpoint)
    ↓
1. Find campaigns where date.open <= now AND status = DRAFT
    ↓
2. Update each to status = OPEN, set date.opened
    ↓
3. Find campaigns where date.close <= now AND status = OPEN
    ↓
4. Update each to status = CLOSED, set date.closed
    ↓
5. Find campaigns where date.closed <= now - 30 days AND status = CLOSED
    ↓
6. Update each to status = INACTIVE:
   - Set date.inactivated
   - Clear domain.site (frees domain for reuse)
    ↓
7. Trigger post-update operations for each changed campaign
```

This refresh operation runs periodically via scheduled job (not triggered by user requests).

## Market Data Flow

Markets represent events/shows within a campaign. They have their own lifecycle.

### Add Market to Campaign
```
POST /campaigns/:campaignId/markets
    ↓
1. Router validates JWT, extracts campaignId and market data
    ↓
2. Manager validates market schema
    ↓
3. Manager fetches campaign to verify ownership
    ↓
4. Manager validates:
   - Market dates within campaign dates
   - No duplicate eventId in campaign
   - Valid venue/event from Discovery API
    ↓
5. Datastore inserts into db.markets with campaignId reference
    ↓
6. Manager triggers side effects:
   - sendToDataPipeline (SQS queue for analytics)
   - saveToCampaignPipeline (Kinesis)
   - saveToAttendancePipeline (if applicable)
   - maybeEnqueueToRefreshSelections (SQS queue)
    ↓
7. Return formatted market
```

### Market Selection Refresh Flow
```
Market updates enqueue message to refreshSelectionsQueue
    ↓
SQS message processed by separate worker service
    ↓
Worker fetches market and campaign details
    ↓
Worker updates selection status based on rules
    ↓
Results written back to db.markets
```

This is **asynchronous** - the API returns immediately, refresh happens separately.

## External Integrations

| Integration | Direction | Purpose | Trigger |
|-------------|-----------|---------|---------|
| **MongoDB** | Read/Write | Primary data persistence | All CRUD operations |
| **Redis** | Read/Write | Cache Discovery API responses | Artist/venue searches |
| **Ticketmaster Discovery API** | Read | Search artists, venues, events | User searches in UI |
| **AWS Kinesis** | Write | Stream campaign/market changes | Campaign/market updates |
| **AWS SQS (dataPipelineQueue)** | Write | Send market data to analytics | Market updates |
| **AWS SQS (refreshSelectionsQueue)** | Write | Trigger selection recalculation | Market updates |
| **Fastly CDN** | Write | Purge cache on updates | Campaign updates |
| **GitLab API** | Read/Write | Config/deployment management | Admin operations |

## Authentication & Authorization Flow

### JWT Validation
```
Request with Authorization: Bearer <token>
    ↓
jwt middleware (lib/middlewares/jwt.js)
    ↓
Validate signature and expiration
    ↓
Decode token payload:
{
  userId: 'user-123',
  campaigns: {
    'campaign-123': { actions: ['read', 'update'] },
    'campaign-456': { actions: ['read'] }
  },
  supreme: false  // Admin flag
}
    ↓
Attach to ctx.jwt
    ↓
Router extracts relevant permissions using selectCampaignActions
    ↓
Manager enforces via throwIfInvalidPermissions
```

### Permission Check Pattern
```javascript
// In router
const authUserActions = selectCampaignActions({ ctx, campaignId });
// Returns: ['read', 'update'] or [] if no access

// In manager
throwIfInvalidPermissions({ campaign, authUserActions });
// Throws 403 if required action not present

// Special case: supreme users
const isAuthSupreme = selectIsUserSupreme({ ctx });
// If true, bypass campaign-specific permission checks
```

## Error Flow

### Error Propagation
```
Error thrown anywhere in stack
    ↓
errorFormatter middleware catches (lib/middlewares/errorFormatter.js)
    ↓
Extract error type, message, status code
    ↓
Log error with correlation ID
    ↓
Format response:
{
  error: {
    type: 'CAMPAIGN_NOT_FOUND',
    message: 'Campaign not found',
    correlation: 'abc-def'
  }
}
    ↓
Set HTTP status code (404, 403, 400, 500)
    ↓
Return to client
```

### Common Error Types
- `CAMPAIGN_NOT_FOUND` (404) - Campaign doesn't exist
- `UNAUTHORIZED` (403) - Invalid JWT or insufficient permissions
- `VALIDATION_ERROR` (400) - Schema validation failed
- `DOMAIN_NAME_CONFLICT` (400) - Domain already in use
- `INVALID_CAMPAIGN` (400) - Business rule violation

## Observability Data Flow

### Distributed Tracing (OpenTelemetry)
```
Request arrives
    ↓
tracing middleware creates root span
    ↓
Correlation ID attached to span
    ↓
Each datastore operation creates child span:
  - campaigns.findById
  - campaigns.update
    ↓
Each service call creates child span:
  - discovery.searchArtists
  - redis.get
  - fastly.purge
    ↓
Spans closed when operations complete
    ↓
Trace exported to OpenTelemetry collector
```

All spans include correlation ID as attribute for request tracking.

### Metrics (Prometheus)
```
Request arrives
    ↓
prometheus.requestCounter increments
    ↓
Request processed
    ↓
prometheus.responseDuration records (with labels: method, path, status)
    ↓
Metrics exposed on GET /metrics endpoint
```

### Logging
```
Every operation uses Log factory:
const log = Log('path/to/module');
log.info('operation', { data });
    ↓
Outputs Logstash JSON format:
{
  "@timestamp": "2024-01-15T12:00:00Z",
  "correlation": "abc-def",
  "level": "info",
  "message": "operation",
  "path": "path/to/module",
  "data": { ... }
}
```

All logs include correlation ID for request tracing.

## State Management

### Campaign Status State Machine
```
       create
         ↓
      DRAFT ────→ OPEN ────→ CLOSED ────→ INACTIVE
      (new)   (date.open)  (date.close)  (30 days after close)

Transitions triggered by:
- DRAFT → OPEN: Refresh job when date.open <= now
- OPEN → CLOSED: Refresh job when date.close <= now
- CLOSED → INACTIVE: Refresh job when date.closed + 30 days <= now

On INACTIVE transition:
- domain.site is cleared (freed for reuse)
- date.inactivated is set
```

### Campaign Domain Management
```
db.campaigns has unique sparse index on domain.site

When status = ACTIVE/OPEN/CLOSED:
  - domain.site must be unique
  - throwIfDomainNameConflict checks before save

When status = INACTIVE:
  - domain.site is set to null
  - Sparse index allows multiple null values
  - Domain is available for new campaigns
```

This enables domain reuse without conflicts.

## Caching Strategy

### Discovery API Caching
```
User searches for artist "Taylor Swift"
    ↓
Manager calls service.discovery.searchArtists({ query: 'Taylor Swift' })
    ↓
Service checks Redis cache:
  - Cache key: 'discovery:artists:Taylor Swift'
  - TTL: configured via SEARCH_CACHE_TTL
    ↓
Cache miss:
  - Call Ticketmaster Discovery API
  - Parse and format results
  - Store in Redis with TTL
  - Return results
    ↓
Cache hit:
  - Return cached results immediately
```

### Promoter Caching
```
Manager calls service.redis.get('promoter:123')
    ↓
Redis returns cached promoter or null
    ↓
If null:
  - Fetch from datastore
  - Cache in Redis
    ↓
Return promoter
```

Redis supports read replicas for high availability (configured per environment).
