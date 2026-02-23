# Data Flow - entry-service

## Primary Flow

The entry-service is a **REST API service** that manages campaign entries, scoring, and statistics for the Verified Fan platform. Data flows through a layered architecture with clear separation between HTTP handling, business logic, and persistence.

```
User/Client Request
       ↓
[Koa Middleware Chain]
   • Tracing
   • Body Parsing
   • Prometheus Metrics
   • Correlation ID
   • Access Logging
   • Error Formatting
   • JWT Authentication
       ↓
[Router Layer]
   • Route Matching
   • Parameter Extraction
   • Context Building
       ↓
[Manager Layer]
   • Business Logic
   • Validation
   • Orchestration
       ↓
    ┌────┴────┐
    ↓         ↓
[Datastore] [Services]
(MongoDB)   (External APIs)
    │         │
    └────┬────┘
         ↓
[Response Formatter]
         ↓
  JSON Response
```

## Request/Response Cycle

### Example: Create/Update Entry Flow

**Endpoint**: `POST /:campaignId/entries`

**Detailed Flow**:

1. **HTTP Request Arrives**
   - Koa receives POST request with JWT token and entry data
   - Middleware chain executes sequentially

2. **Middleware Processing**
   - **Tracing**: Start span for request
   - **Body Parsing**: Parse JSON body
   - **Prometheus**: Start timer for request duration
   - **Correlation**: Generate/extract correlation ID
   - **Access Log**: Log request details
   - **JWT**: Validate token, extract userId
   - **Response Formatter**: Prepare response wrapper

3. **Router Handling** (`app/router/index.js`)
   ```javascript
   router.post('/:campaignId/entries', async ctx => {
     const userId = selectAuthUserId({ ctx });
     const campaignId = selectCampaignId({ ctx });
     const managerCtx = koaCtxToManagerCtx({ ctx });

     return entriesManager.upsert(managerCtx, {
       campaignId, userId, token,
       data: { ...selectBody({ ctx }), originHost, originalUrl }
     });
   });
   ```

4. **Manager Orchestration** (`app/managers/entries/upsert.js`)
   - **Validation Phase**:
     - Validate campaign status (active/inactive)
     - Check registration eligibility (gates, invites, cards)
     - Validate user has referral code
   - **Data Retrieval Phase**:
     - Fetch campaign details from campaign-service
     - Fetch user details from user-service
     - Check for existing entry in MongoDB
   - **Processing Phase**:
     - Validate submitted fields (email, phone, markets)
     - Validate referrer information
     - Validate IP and user agent
     - Check for eligible linked attributes (Twitter, Instagram, etc.)
   - **Persistence Phase**:
     - Create new entry OR update existing entry
     - Insert/update in MongoDB entries collection
   - **Post-Processing Phase** (async):
     - Send entry to Nudetect for fraud detection
     - Query Fanscore for fan engagement score
     - Save to campaign data pipeline
     - Retry scores if missing

5. **Response**
   - Normalize entry data for API response
   - Format with response middleware
   - Return JSON to client

### Data Transformations in Flow

```
Client JSON
    ↓ (body parsing)
Request Body Object
    ↓ (parameter extraction)
Manager Input Parameters
    ↓ (validation & normalization)
Domain Entry Model
    ↓ (datastore)
MongoDB Document
    ↓ (retrieval)
MongoDB Document
    ↓ (normalization)
API Response Format
    ↓ (response formatting)
Client JSON
```

## State Management

The service is **stateless** - no in-memory state beyond request scope:

- **Request State**: Stored in Koa context (`ctx`) during request processing
- **Manager Context**: Built per-request with datastore and service clients
- **Session State**: JWT token carries user authentication
- **Persistence**: All durable state in MongoDB

**Context Building**:
```javascript
const koaCtxToManagerCtx = KoaCtxToManagerCtx({ Datastore, Services });
// Creates fresh context per request with:
// - correlation ID
// - datastore clients
// - service clients
// - logger instance
```

## Event Processing

### Asynchronous Operations (Fire-and-Forget)

After entry upsert, several async operations execute without blocking response:

1. **Fraud Detection** (`app/managers/entries/onUpserted/sendToNudetect.js`)
   - POST entry data to Nudetect API
   - No retry on failure
   - Logs errors but doesn't block

2. **Fanscore Query** (`app/managers/entries/onUpserted/queryFanscore.js`)
   - Query AppSync for fan engagement score
   - Conditional on user having verified social accounts
   - Saves score to entry on success

3. **Campaign Pipeline** (`app/managers/entries/onUpserted/saveToCampaignPipeline.js`)
   - Send entry event to Kinesis data stream
   - Used for analytics and downstream processing

4. **Score Retry Queue** (`app/managers/entries/onUpserted/retryScoresIfMissing.js`)
   - If Fanscore query fails, enqueue retry message to SQS
   - Provides eventual consistency for scores

### Scoring Flow

**Endpoint**: `POST /:campaignId/entries/scoring`

```
External System (CSV Upload)
        ↓
[Router] Batch scoring records
        ↓
[Scoring Manager]
   • Validate records parameter
   • Normalize phone numbers
   • Extract phone numbers
        ↓
[Datastore Query] Find entries by phone numbers
        ↓
[Enrich & Format]
   • Match records to entries
   • Enrich with entry data (email, name, market)
   • Format for scoring collection
        ↓
[Bulk Upsert] to scoring collection
        ↓
Response with counts
```

**Key Behavior**: Scoring records require matching phone-confirmed entries. Records without matching entries are logged but not persisted.

## External Integrations

| Integration | Direction | Purpose | Implementation |
|-------------|-----------|---------|----------------|
| **MongoDB** | Read/Write | Primary data store for entries, scoring, stats, shares | Direct driver via `app/datastore/mongo/` |
| **Campaign Service** | Read | Fetch campaign configuration and status | HTTP REST via `app/services/campaigns/` |
| **User Service** | Read | Fetch user profile and referral code | HTTP REST via `app/services/users/` |
| **AppSync (GraphQL)** | Write | Query Fanscore for fan engagement metrics | AWS SDK via `app/services/appsync/` |
| **Kinesis** | Write | Stream entry events for analytics pipeline | AWS SDK via `app/services/campaignDataStream/` |
| **SQS** | Write | Queue failed score lookups for retry | AWS SDK via `app/services/retryScoresQueue/` |
| **Nudetect** | Write | Submit entries for fraud detection | HTTP REST (no dedicated service wrapper) |
| **SFMC** | Write | Send email receipts via Salesforce Marketing Cloud | HTTP REST via `app/services/sfmc/` |

### Service Client Pattern

All external HTTP services follow this pattern:
```javascript
// app/services/campaigns/index.js
export default {
  getCampaign: async ({ jwt, campaignId, locale }) => {
    const response = await request({
      url: `${campaignsUrl}/${campaignId}`,
      headers: { Authorization: `Bearer ${jwt}` },
      qs: { locale }
    });
    return response;
  }
}
```

Services are instrumented for observability via `InstrumentServices`.

## Data Models

### Entry Document Structure (MongoDB)

```javascript
{
  _id: {
    campaign_id: "campaign-uuid",
    user_id: "user-uuid"
  },
  fields: {
    email: "user@example.com",
    phone: "+12025551234",
    first_name: "John",
    last_name: "Doe",
    market: "market-id-1",
    optional_markets: ["market-id-2", "market-id-3"],
    // ... custom fields
  },
  code: "user-referral-code",
  link: "https://share.example.com/user-referral-code",
  locale: "en-US",
  score: 0,
  accountFanscore: { /* fanscore data */ },
  date: {
    created: ISODate("..."),
    updated: ISODate("..."),
    phoneConfirmed: ISODate("..."),
    receipt: ISODate("...")
  },
  referrer: {
    code: "referrer-code",
    user_id: "referrer-user-id"
  },
  presale: {
    codes: [
      {
        code: "presale-code-123",
        codeConfigId: "code-config-id",
        date: [ISODate("...")]
      }
    ]
  },
  review: {
    isBlocked: false,
    date: ISODate("...")
  },
  device: {
    ip: "192.0.2.1",
    userAgent: "Mozilla/5.0 ..."
  },
  attributes: {
    twitter: { /* linked account data */ },
    instagram: { /* linked account data */ }
  }
}
```

### Scoring Document Structure (MongoDB)

```javascript
{
  _id: {
    campaign_id: "campaign-uuid",
    user_id: "user-uuid"
  },
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "+12025551234",
  phoneConfirmedDate: ISODate("..."),
  marketIds: ["market-id-1", "market-id-2"],
  locale: "en-US",
  verdict: {
    isEligible: true,
    selected: false,
    reason: null
  },
  tags: {
    filterName: ["tag1", "tag2"]
  },
  // ... scoring-specific fields
}
```

## Performance Considerations

### Caching
- **Not Implemented**: Comment in code suggests caching market counts for 60 seconds (not implemented)
- All requests hit MongoDB and external services directly

### Bulk Operations
- **Batch Inserts**: Scoring upserts use MongoDB bulk operations
- **Batch Updates**: Verdicts and code assignments use unordered bulk writes
- Reduces round trips for large operations (e.g., 1000 records → 1 database call)

### Async Processing
- Post-upsert hooks execute asynchronously
- Main response not blocked by Nudetect, Fanscore, or pipeline operations
- Improves API response time at cost of eventual consistency

### Database Queries
- **Composite ID**: Entries use compound `_id` for efficient lookups by campaign + user
- **Indexes**: Not visible in code, likely defined in `tools/mongo/createIndexes.js`
- **Aggregations**: Complex queries use MongoDB aggregation pipeline (e.g., market counts)

## Error Handling Flow

```
Error Occurs
    ↓
[Manager Layer] Catches known errors
    ↓
error(errorObject) → Wraps in standard format
    ↓
[Error Formatter Middleware]
    ↓
Logs error with correlation ID
    ↓
Returns formatted JSON error response
```

**Error Categories** (from `app/errors/`):
- Authentication errors (`notLoggedIn`, `supremeUserRequired`)
- User errors (`userMissingCode`)
- Campaign errors (`invalidCampaignStatus`)
- Entry errors (`entryNotFound`, `phoneAlreadyConfirmed`)
- Scoring errors (`missingRecords`, `invalidTargetField`)
- Validation errors (thrown by validators)
