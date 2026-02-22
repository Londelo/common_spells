# API Usage - campaign-service

## Authentication

### JWT Bearer Token

All endpoints (except `/metrics` and `/heartbeat`) require JWT authentication.

**Header Format**:
```
Authorization: Bearer <jwt_token>
```

**JWT Configuration**:
- Uses RSA public/private key pair
- Configured via `titan.jwt.publicKey` and `titan.jwt.privateKey` in service config
- Supports anonymous access when `allowAnon: true` (configurable)

**JWT Claims Required**:
```json
{
  "userId": "string",
  "supreme": "boolean",
  "campaignActions": {
    "[campaignId]": ["read", "write", "admin"]
  }
}
```

### Generating Tokens (Development)

For local development, use the token generator tool:

```bash
node tools/jwt/generateToken.js
```

Parse existing tokens:

```bash
node tools/jwt/parseToken.js <token>
```

---

## Request Examples

### Campaign Operations

#### Create a Campaign

**Endpoint**: `POST /campaigns`

**Headers**:
```
Authorization: Bearer <jwt_with_supreme>
Content-Type: application/json
```

**Request Body**:
```json
{
  "status": "DRAFT",
  "artist": {
    "id": "K8vZ917Gku7",
    "name": "Example Artist",
    "discovery_id": "K8vZ917Gku7"
  },
  "domain": {
    "site": "example-campaign"
  },
  "tour": {
    "name": "World Tour 2024"
  },
  "name": "Example Campaign",
  "identifier": "example-2024",
  "date": {
    "created": "2024-01-01T00:00:00Z",
    "open": "2024-02-01T00:00:00Z",
    "close": "2024-03-01T00:00:00Z"
  },
  "style": {
    "theme": { "primary": "#000000" },
    "border": { "primary": "#000000" },
    "pageBackground": { "primary": "#ffffff" },
    "text": { "primary": "#000000" }
  },
  "image": {
    "main": { "url": "https://example.com/image.jpg" }
  },
  "content": {
    "en": {
      "landing": {}
    }
  },
  "faqs": {
    "landing": { "open": [], "closed": [] },
    "confirmation": { "open": [], "closed": [], "activePresale": [] }
  },
  "preferences": [
    {
      "id": "email",
      "type": "email",
      "is_optional": false,
      "label": { "en": "Email Address" }
    }
  ],
  "locales": [
    { "id": "en", "is_default": true }
  ],
  "schema": {
    "version": "2"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "DRAFT",
  "artist": { ... },
  "domain": { "site": "example-campaign" },
  ...
}
```

---

#### Get Campaign by Domain

**Endpoint**: `GET /campaigns?domain=example-campaign`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
- `domain` (required) - Campaign domain name
- `locale` (optional) - Locale code (e.g., 'en', 'es')
- `showAllLocales` (optional) - Set to 'true' to show all locales
- `password` (optional) - Password for protected campaigns

**Response** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "OPEN",
  "artist": {
    "id": "K8vZ917Gku7",
    "name": "Example Artist"
  },
  "domain": {
    "site": "example-campaign"
  },
  ...
}
```

---

#### Update Campaign

**Endpoint**: `POST /campaigns/:campaignId`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body** (partial update):
```json
{
  "status": "PREVIEW",
  "date": {
    "open": "2024-02-15T00:00:00Z"
  }
}
```

**Response** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "status": "PREVIEW",
  ...
}
```

---

#### List Campaigns with Filters

**Endpoint**: `GET /campaigns/list`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
- `q` - Search query (searches name, artist name)
- `type` - Campaign type filter
- `version` - Campaign version filter ('v1' or 'v2')
- `artistId` - Filter by artist ID
- `sortBy` - Sort field
- `sortDirection` - 'asc' or 'desc'
- `page` - Page number (default: 0)
- `pageSize` - Results per page (default: 10)

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/campaigns/list?q=tour&version=v2&page=0&pageSize=20"
```

**Response** (200 OK):
```json
{
  "campaigns": [
    { "id": "...", "name": "Tour Campaign 1", ... },
    { "id": "...", "name": "Tour Campaign 2", ... }
  ],
  "pagination": {
    "page": 0,
    "pageSize": 20,
    "total": 2
  }
}
```

---

### Market Operations

#### Create Market for Campaign

**Endpoint**: `POST /campaigns/:campaignId/markets`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Los Angeles, CA",
  "city": "Los Angeles",
  "state": "CA",
  "timezone": "America/Los_Angeles",
  "point": {
    "type": "Point",
    "coordinates": [-118.2437, 34.0522]
  },
  "population": 3979576,
  "event": {
    "ids": ["G5vYZ9nONGdj"],
    "name": "Concert at Forum",
    "date": "2024-03-15T20:00:00Z",
    "presaleDateTime": "2024-03-01T10:00:00Z",
    "ticketer": "ticketmaster",
    "category_ids": ["KnvZfZ7vAdt"],
    "venue": {
      "id": "KovZpZAEdlJA",
      "name": "The Forum"
    }
  },
  "promoterIds": ["507f1f77bcf86cd799439012"]
}
```

**Response** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439013",
  "campaign_id": "507f1f77bcf86cd799439011",
  "name": "Los Angeles, CA",
  ...
}
```

---

#### Get Markets for Campaign

**Endpoint**: `GET /campaigns/:campaignId/markets`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
- `useGeoJson` (optional) - Set to 'true' for GeoJSON format

**Response** (200 OK):
```json
{
  "markets": [
    {
      "id": "507f1f77bcf86cd799439013",
      "name": "Los Angeles, CA",
      "city": "Los Angeles",
      "state": "CA",
      ...
    }
  ]
}
```

---

#### Clone Markets Between Campaigns

**Endpoint**: `POST /campaigns/:toCampaignId/markets/clones`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "fromCampaignId": "507f1f77bcf86cd799439010"
}
```

**Response** (200 OK):
```json
{
  "cloned": [
    { "id": "507f1f77bcf86cd799439014", "name": "Los Angeles, CA" },
    { "id": "507f1f77bcf86cd799439015", "name": "New York, NY" }
  ]
}
```

---

### FAQ and Terms Management

#### Get Campaign FAQs

**Endpoint**: `GET /campaigns/:campaignId/faqs?locale=en`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "landing": {
    "open": [
      {
        "id": "uuid-1",
        "question": "What is this campaign?",
        "answer": "This is a presale campaign..."
      }
    ],
    "closed": []
  },
  "confirmation": {
    "open": [],
    "closed": [],
    "activePresale": []
  }
}
```

---

#### Update Campaign FAQs

**Endpoint**: `POST /campaigns/:campaignId/faqs?locale=en`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "landing": {
    "open": ["uuid-1", "uuid-2"],
    "closed": []
  }
}
```

**Response** (200 OK):
```json
{
  "success": true
}
```

---

### Search Operations

#### Search Artists

**Endpoint**: `GET /artists?q=beatles`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Query Parameters**:
- `q` - Search query string
- `page` - Page number
- `pageSize` - Results per page

**Response** (200 OK):
```json
{
  "artists": [
    {
      "id": "K8vZ917Gku7",
      "name": "The Beatles",
      "image_url": "https://..."
    }
  ],
  "pagination": {
    "page": 0,
    "pageSize": 10,
    "total": 1
  }
}
```

---

#### Search Venues

**Endpoint**: `GET /venues?q=forum`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response**: Similar structure to artist search

---

#### Search Contacts

**Endpoint**: `GET /contacts?q=john`

**Headers**:
```
Authorization: Bearer <jwt_token_supreme>
```

**Note**: Requires supreme user privileges

**Response** (200 OK):
```json
{
  "contacts": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "name": "John Doe",
      "keyword": ["support", "help"]
    }
  ]
}
```

---

### Promoter Operations

#### Create Promoter

**Endpoint**: `POST /promoters`

**Headers**:
```
Authorization: Bearer <jwt_token_supreme>
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Live Nation",
  "privacyUrls": [
    {
      "locale": "en",
      "url": "https://livenation.com/privacy",
      "is_default": true
    },
    {
      "locale": "es",
      "url": "https://livenation.com/es/privacy",
      "is_default": false
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439021",
  "name": "Live Nation",
  "privacyUrls": [...],
  "date": {
    "created": "2024-01-01T00:00:00Z"
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "status": 400,
  "message": "Human-readable error message",
  "payload": "Additional error details",
  "field": "fieldName (optional, indicates which field caused error)"
}
```

### Common Error Codes

| Status | Error Type | Description |
|--------|------------|-------------|
| 400 | Bad Request | Invalid input, schema validation failure |
| 401 | Unauthorized | Invalid or missing JWT token |
| 403 | Forbidden | Insufficient permissions for action |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Unexpected server error |

### Campaign-Specific Errors

| Error | Status | Trigger |
|-------|--------|---------|
| `CAMPAIGN_NOT_FOUND` | 404 | Campaign ID or domain doesn't exist |
| `INVALID_CAMPAIGN_PERMISSIONS` | 403 | Missing required campaign actions |
| `CAMPAIGN_WITH_DOMAIN_EXISTS` | 400 | Domain already in use by another campaign |
| `INVALID_CAMPAIGN_SCHEMA` | 400 | Request body fails JSON schema validation |
| `INVALID_CAMPAIGN_PASSWORD` | 401 | Incorrect password for protected campaign |
| `INVALID_CAMPAIGN_STATUS_CHANGE` | 404 | Invalid status transition |
| `MISSING_PRESALE_WINDOW_DATE` | 400 | Presale dates required when category ID is set |
| `INVALID_PRESALE_WINDOW_DATE_ORDER` | 400 | End date must be after start date |

### Market-Specific Errors

| Error | Status | Trigger |
|-------|--------|---------|
| `MARKET_NOT_FOUND` | 404 | Market ID doesn't exist |
| `INVALID_MARKET_SCHEMA` | 400 | Request body fails schema validation |

### Promoter-Specific Errors

| Error | Status | Trigger |
|-------|--------|---------|
| `PROMOTER_NOT_FOUND` | 404 | Promoter ID doesn't exist |
| `INVALID_PROMOTER_SCHEMA` | 400 | Request body fails schema validation |

### Permission Errors

| Error | Status | Trigger |
|-------|--------|---------|
| `SUPREME_USER_REQUIRED` | 403 | Endpoint requires supreme privileges |

---

## Rate Limits

No explicit rate limits are enforced at the application level. Rate limiting may be applied at the infrastructure level (load balancer, API gateway).

---

## CORS Configuration

CORS is not explicitly configured in the application. This should be handled at the infrastructure level if cross-origin requests are required.

---

## Monitoring and Observability

### Prometheus Metrics

**Endpoint**: `GET /metrics`

Exposes Prometheus-compatible metrics including:
- HTTP request duration histograms
- HTTP request counters by method and status
- Default Node.js process metrics
- Custom business metrics

**Example Metrics**:
```
http_request_duration_seconds_bucket{le="0.1",method="GET",route="/campaigns",status="200"} 45
http_request_duration_seconds_sum{method="GET",route="/campaigns",status="200"} 3.2
http_request_duration_seconds_count{method="GET",route="/campaigns",status="200"} 50
http_requests_total{method="GET",route="/campaigns",status="200"} 50
```

### Health Check

**Endpoint**: `GET /heartbeat`

Returns 200 OK if service is running. Does not check dependencies (database, cache, etc.).

**Response**:
```
200 OK
```

### Request Tracing

All requests are automatically traced with:
- **Correlation ID**: Unique ID for each request, propagated through all layers
- **OpenTelemetry Tracing**: Spans created for datastore and service operations
- **Access Logs**: JSON-formatted logs with correlation IDs

**Log Format** (Logstash JSON):
```json
{
  "@timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "request completed",
  "correlationId": "uuid-1234",
  "method": "GET",
  "path": "/campaigns",
  "status": 200,
  "duration": 45
}
```

---

## Pagination

List endpoints support pagination via query parameters:

**Parameters**:
- `page` - Zero-based page number (default: 0)
- `pageSize` - Results per page (default: 10)

**Response Format**:
```json
{
  "results": [...],
  "pagination": {
    "page": 0,
    "pageSize": 10,
    "total": 42
  }
}
```

---

## Locale Support

Campaign content supports multiple locales:

**Locale Format**: `xx` or `xx-XX` (e.g., `en`, `en-US`, `es`, `es-MX`)

**Usage**:
- Include `locale` query parameter: `GET /campaigns/:id?locale=en`
- Use `showAllLocales=true` to return content for all locales
- Default locale is defined in campaign's `locales` array with `is_default: true`

**Response**:
- Without `showAllLocales`: Returns content only for requested locale
- With `showAllLocales=true`: Returns content for all configured locales

---

## Best Practices

### 1. Always Validate Before Submitting

Schema validation happens server-side, but validating client-side against the JSON schemas in `/schemas` prevents unnecessary API calls.

### 2. Use Correlation IDs for Debugging

When reporting issues, include the `correlationId` from response headers or logs to trace requests through the system.

### 3. Handle Campaign Lifecycle

Be aware of automatic status transitions:
- Campaigns auto-open when `date.open` is reached
- Campaigns auto-close when `date.close` is reached
- Campaigns auto-inactivate 30 days after closing

### 4. Refresh Campaign Data Periodically

Use `POST /campaigns/refresh` to sync campaign data from Discovery API and update cached data.

### 5. Supreme Privileges

Many administrative operations require supreme user privileges. Ensure proper JWT configuration for administrative users.

### 6. Idempotency

POST endpoints are NOT idempotent. Duplicate requests may create duplicate resources. Implement client-side deduplication if needed.

### 7. Domain Uniqueness

Campaign domains (`domain.site`) must be unique across all non-inactive campaigns. When a campaign becomes inactive, its domain is freed for reuse.
