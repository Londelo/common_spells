# API Usage - code-service

## Authentication

### JWT Token Authentication

All production endpoints require JWT authentication. The service uses the `@verifiedfan/lib` JWT middleware.

**Configuration:**
- Public/private key pair for JWT signing and verification
- Configurable `allowAnon` setting for anonymous access

**Request Header:**
```http
Authorization: Bearer <jwt-token>
```

**Token Requirements:**
- Must be a valid JWT signed with the service's private key
- Must contain user information including supreme user status
- Tokens are validated on every request (except `/metrics`, `/heartbeat`, `/dev/token`)

### Supreme User Authorization

Most endpoints require the authenticated user to have **supreme user** status. This is a higher privilege level for administrative operations.

**Check:** `selectIsUserSupreme({ ctx })`

**If not supreme:**
```json
{
  "error": {
    "status": 403,
    "message": "Supreme user access required",
    "payload": "supremeUserRequired"
  }
}
```

---

## Base URL

The service runs on port 8080 by default (configurable).

```
http://localhost:8080
```

**Health Check:**
```bash
curl http://localhost:8080/heartbeat
```

---

## Request Examples

### 1. Upload Codes from S3

Upload a CSV file of codes from S3 to the database.

**Prerequisites:**
- CSV file must be uploaded to S3 bucket
- File key must follow pattern: `codes/{campaignId}/{type}/{filename}`

**Request:**
```bash
curl -X POST \
  http://localhost:8080/campaign-123/codes \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileKey": "codes/campaign-123/tm/batch-001.csv"
  }'
```

**Response:**
```json
{
  "data": {
    "in": 1000,
    "inserted": 950,
    "updated": 50
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "correlationId": "abc-123-def-456"
  }
}
```

**Interpretation:**
- `in`: 1000 codes in the CSV file
- `inserted`: 950 new codes added
- `updated`: 50 existing codes updated (based on campaign_id + code uniqueness)

---

### 2. Count Available Codes

Get the count of available codes for a campaign.

**Request:**
```bash
curl -X GET \
  "http://localhost:8080/campaign-123/codes/count?type=tm&status=available" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "data": {
    "available": 850
  },
  "meta": {
    "timestamp": "2024-01-15T10:35:00Z",
    "correlationId": "xyz-789-abc-012"
  }
}
```

**All Statuses:**
```bash
curl -X GET \
  "http://localhost:8080/campaign-123/codes/count?type=tm" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "data": {
    "available": 850,
    "assigned": 100,
    "reserved": 50
  }
}
```

---

### 3. Reserve Codes

Reserve 10 available codes for temporary use (24-hour expiration).

**Request:**
```bash
curl -X GET \
  "http://localhost:8080/campaign-123/reserve?count=10&type=tm" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "data": {
    "codes": [
      "TM-CODE-001",
      "TM-CODE-002",
      "TM-CODE-003",
      "TM-CODE-004",
      "TM-CODE-005",
      "TM-CODE-006",
      "TM-CODE-007",
      "TM-CODE-008",
      "TM-CODE-009",
      "TM-CODE-010"
    ],
    "reserveId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "meta": {
    "timestamp": "2024-01-15T10:40:00Z",
    "correlationId": "def-456-ghi-789"
  }
}
```

**Important Notes:**
- Reservation expires after 24 hours
- Use `reserveId` to track this specific reservation
- Reserved codes cannot be reserved by others until expired

---

### 4. Assign Codes

Mark codes as permanently assigned to users.

**Request:**
```bash
curl -X POST \
  http://localhost:8080/campaign-123/assign \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codes": [
      "TM-CODE-001",
      "TM-CODE-002",
      "TM-CODE-003"
    ]
  }'
```

**Response:**
```json
{
  "data": {
    "count": {
      "in": 3,
      "updated": 3
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:45:00Z",
    "correlationId": "ghi-789-jkl-012"
  }
}
```

**Interpretation:**
- `in`: 3 codes submitted
- `updated`: 3 codes successfully assigned
- Assigned codes are permanently marked and cannot be released

---

### 5. Release Reserved Codes

Release codes that were reserved but not used.

**Request:**
```bash
curl -X POST \
  http://localhost:8080/campaign-123/release \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "codes": [
      "TM-CODE-004",
      "TM-CODE-005",
      "TM-CODE-006"
    ]
  }'
```

**Response:**
```json
{
  "data": {
    "count": {
      "in": 3,
      "updated": 2
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:50:00Z",
    "correlationId": "jkl-012-mno-345"
  }
}
```

**Interpretation:**
- `in`: 3 codes submitted
- `updated`: 2 codes successfully released
- 1 code may have been assigned or already released

**Important:**
- Only reserved codes can be released
- Assigned codes cannot be released
- Available codes are ignored

---

## Development Endpoints

These are only available when `devEndpoints.enabled = true` in configuration.

### Generate JWT Token

Create a test JWT token for development.

**Request:**
```bash
curl -X POST \
  http://localhost:8080/dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "isSupreme": true
  }'
```

**Response:**
```json
{
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Check Supreme Status

Verify if the authenticated user has supreme privileges.

**Request:**
```bash
curl -X GET \
  http://localhost:8080/dev/supremes \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response (if supreme):**
```json
{
  "data": {
    "isSupreme": true
  }
}
```

**Response (if not supreme):**
```json
{
  "error": {
    "status": 403,
    "message": "Supreme user access required",
    "payload": "supremeUserRequired"
  }
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "status": 400,
    "message": "Human-readable description of the error",
    "payload": "Brief error identifier"
  },
  "meta": {
    "timestamp": "2024-01-15T11:00:00Z",
    "correlationId": "error-trace-id"
  }
}
```

### Common Errors

#### 1. Invalid File Key (400)

**Trigger:** File key doesn't match `codes/{campaignId}/{type}/{filename}` pattern

```bash
curl -X POST http://localhost:8080/campaign-123/codes \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"fileKey": "invalid/path.csv"}'
```

**Response:**
```json
{
  "error": {
    "status": 404,
    "message": "A valid file key is required.",
    "payload": "Invalid file key."
  }
}
```

#### 2. Invalid Code Type (400)

**Trigger:** Type is not `tm` or `external`

```bash
curl -X GET "http://localhost:8080/campaign-123/codes/count?type=invalid" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "error": {
    "status": 400,
    "message": "The type 'invalid' is not a valid code type.",
    "payload": "Invalid code type."
  }
}
```

#### 3. Missing Required Parameters (400)

**Trigger:** Required query/body parameters not provided

```bash
curl -X GET "http://localhost:8080/campaign-123/reserve?count=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "error": {
    "status": 400,
    "message": "The 'count' and 'type' properties must be specified to reserve codes.",
    "payload": "Missing code reserve parameters."
  }
}
```

#### 4. Invalid Count (400)

**Trigger:** Count is less than 1

```bash
curl -X GET "http://localhost:8080/campaign-123/reserve?count=0&type=tm" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "error": {
    "status": 400,
    "message": "You must enter a valid count.",
    "payload": "Invalid count."
  }
}
```

#### 5. Empty Codes Array (400)

**Trigger:** Codes array is empty

```bash
curl -X POST http://localhost:8080/campaign-123/assign \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"codes": []}'
```

**Response:**
```json
{
  "error": {
    "status": 400,
    "message": "The 'codes' array must contain one or more codes.",
    "payload": "Empty codes array."
  }
}
```

#### 6. Unauthorized (401)

**Trigger:** Missing or invalid JWT token

```bash
curl -X GET http://localhost:8080/campaign-123/codes/count?type=tm
```

**Response:**
```json
{
  "error": {
    "status": 401,
    "message": "Authentication required",
    "payload": "Unauthorized"
  }
}
```

#### 7. Supreme User Required (403)

**Trigger:** User is authenticated but not supreme

```bash
curl -X POST http://localhost:8080/campaign-123/assign \
  -H "Authorization: Bearer $NON_SUPREME_TOKEN" \
  -d '{"codes": ["CODE-001"]}'
```

**Response:**
```json
{
  "error": {
    "status": 403,
    "message": "Supreme user access required",
    "payload": "supremeUserRequired"
  }
}
```

---

## Workflow Examples

### Complete Code Management Workflow

#### Step 1: Upload Codes

```bash
# Upload CSV file from S3 to database
curl -X POST http://localhost:8080/campaign-123/codes \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"fileKey": "codes/campaign-123/tm/batch-001.csv"}'
```

#### Step 2: Check Available Count

```bash
# Verify codes were uploaded
curl -X GET "http://localhost:8080/campaign-123/codes/count?type=tm&status=available" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### Step 3: Reserve Codes for User

```bash
# Reserve 5 codes for a user session
curl -X GET "http://localhost:8080/campaign-123/reserve?count=5&type=tm" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Save the returned reserveId and codes
```

#### Step 4: Assign Codes (Success Case)

```bash
# User completes checkout - assign codes permanently
curl -X POST http://localhost:8080/campaign-123/assign \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "codes": ["CODE-001", "CODE-002", "CODE-003"]
  }'
```

#### Step 5: Release Codes (Failure Case)

```bash
# User abandons cart - release reserved codes
curl -X POST http://localhost:8080/campaign-123/release \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "codes": ["CODE-004", "CODE-005"]
  }'
```

---

### Monitoring Workflow

#### Check Service Health

```bash
# Basic health check
curl http://localhost:8080/heartbeat
```

#### View Prometheus Metrics

```bash
# Get all service metrics
curl http://localhost:8080/metrics
```

**Key Metrics:**
- Request counts and durations
- Error rates
- MongoDB connection status
- Custom business metrics

---

## Rate Limits

No explicit rate limiting is currently configured at the application level. Rate limiting may be enforced at the infrastructure/gateway layer.

---

## Request/Response Middleware

The service applies the following middleware to all requests:

1. **Compression** - Response compression with `koa-compress`
2. **Tracing** - Distributed tracing (excluded from `/metrics`, `/heartbeat`)
3. **Body Parser** - JSON request body parsing
4. **Prometheus** - Metrics collection (response duration, request count)
5. **Context** - Request context initialization
6. **Correlation** - Correlation ID for request tracking
7. **Access Log** - Request/response logging
8. **Error Formatter** - Standardized error responses
9. **Path** - Path normalization
10. **Response Formatter** - Standardized success responses (excluded from `/metrics`, `/heartbeat`)
11. **JWT** - Authentication (excluded from `/metrics`, `/heartbeat`, `/dev/token`)

---

## Correlation IDs

Every request is assigned a unique correlation ID for tracing.

**Header:**
```http
X-Correlation-ID: <uuid>
```

**Response:**
```json
{
  "meta": {
    "correlationId": "abc-123-def-456"
  }
}
```

Use correlation IDs for:
- Debugging across distributed systems
- Tracing requests through logs
- Support ticket investigation

---

## Integration Notes

### S3 Integration

**Service:** AWS S3
**Bucket:** Configured via `titan.aws.clients.scoringBucket.bucketName`
**Usage:** Code file uploads (POST `/:campaignId/codes`)

**File Format (CSV):**
```csv
code
CODE-001
CODE-002
CODE-003
```

- CSV must have a `code` column header
- One code per line
- No duplicates within file recommended

### MongoDB Integration

**Database:** Configured via `titan.mongo` settings
**Collection:** `codes`
**Connection:** Managed by `@verifiedfan/mongodb`

**Operations:**
- `findAvailableCodes` - Query available codes
- `countCodesByStatus` - Aggregate counts
- `reserveCodes` - Bulk reserve operation
- `assignCodes` - Bulk assign operation
- `releaseCodes` - Bulk release operation
- `upsertCodes` - Insert or update codes

### Observability

**Logging:**
- Structured logging via `@verifiedfan/log`
- Access logs for all requests
- Debug logs for datastore operations

**Tracing:**
- Distributed tracing via `@verifiedfan/tracing`
- LightStep integration support
- OpenTracing compatible

**Metrics:**
- Prometheus metrics at `/metrics`
- Custom business metrics
- Default Node.js runtime metrics
- HTTP request/response metrics

---

## Security Considerations

### Authentication

- All production endpoints require valid JWT
- Tokens must be signed with service's private key
- Token validation on every request

### Authorization

- Supreme user check for administrative operations
- User identity extracted from JWT claims

### Input Validation

- File key pattern validation
- Code type enum validation
- Status enum validation
- Array and count validations

### Data Protection

- Codes stored with composite primary key (campaign + code)
- No personally identifiable information (PII) in codes collection
- Secure S3 access with IAM credentials

### Best Practices

- Use HTTPS in production
- Rotate JWT keys regularly
- Monitor `/metrics` for anomalies
- Implement rate limiting at gateway
- Use DNS caching (configured TTL: 1 hour default)
