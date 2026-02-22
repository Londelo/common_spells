# API Usage - entry-service

## Authentication

### JWT Authentication

All API endpoints (except `/metrics`, `/heartbeat`, and `/dev/token`) require JWT authentication.

**Request Header:**
```
Authorization: Bearer <your-jwt-token>
```

**Token Claims:**
- `userId` - The authenticated user's ID
- `isSupreme` - Boolean flag indicating supreme (admin) user status

### Development Token Endpoint

For development/testing purposes only:
```
GET /dev/token
```
This endpoint is excluded from authentication and can be used to obtain test tokens.

---

## Common Request Examples

### Create or Update Entry

Create or update an entry for the authenticated user:

```bash
POST /:campaignId/entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "fan@example.com",
  "phone": "+12025551234",
  "market": "new-york-ny",
  "optional_markets": ["los-angeles-ca", "chicago-il"],
  "first_name": "Jane",
  "last_name": "Doe",
  "ticket_count": 2
}
```

**Success Response (200):**
```json
{
  "_id": {
    "campaign_id": "campaign123",
    "user_id": "user456"
  },
  "fields": {
    "email": "fan@example.com",
    "phone": "+12025551234",
    "market": "new-york-ny",
    "optional_markets": ["los-angeles-ca", "chicago-il"],
    "first_name": "Jane",
    "last_name": "Doe",
    "ticket_count": 2
  },
  "date": {
    "created": "2024-01-15T10:30:00.000Z",
    "updated": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Get User's Entry

Retrieve the authenticated user's entry for a campaign:

```bash
GET /:campaignId/entries
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "_id": {
    "campaign_id": "campaign123",
    "user_id": "user456"
  },
  "fields": {
    "email": "fan@example.com",
    "phone": "+12025551234",
    "market": "new-york-ny"
  },
  "score": 85,
  "date": {
    "created": "2024-01-15T10:30:00.000Z",
    "updated": "2024-01-15T10:30:00.000Z",
    "phoneConfirmed": "2024-01-15T10:35:00.000Z"
  }
}
```

**Not Found Response (404):**
```json
{
  "status": 404,
  "message": "Entry not found for specified user.",
  "payload": "No entry with provided list id and user id.",
  "code": "ENTRY_NOT_FOUND"
}
```

---

### Check Registration Eligibility

Check if the authenticated user is eligible to register for a campaign:

```bash
GET /:campaignId/entries/registrationEligibility
Authorization: Bearer <token>
```

**Eligible Response (200):**
```json
{
  "eligible": true,
  "reason": null
}
```

**Ineligible Response (403):**
```json
{
  "status": 403,
  "message": "Unfortunately, you are not eligible for participation in this campaign.",
  "payload": "User does not meet campaign gate requirements.",
  "code": "NO_PAST_PARTICIPATION"
}
```

---

### Confirm Phone (PPC)

Confirm a phone number after verification:

```bash
POST /:campaignId/entries/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneJwt": "<phone-verification-token>"
}
```

---

### Refresh Attribute

Refresh a specific attribute (e.g., fanscore) on an entry:

```bash
GET /:campaignId/refreshattribute?type=fanscore
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` - Attribute type to refresh (e.g., `fanscore`, `phonescore`)

---

## Admin/Supreme User Examples

The following operations require supreme user privileges.

### Get Entry Counts by Market

```bash
GET /:campaignId/entries/counts
Authorization: Bearer <supreme-token>
```

**Response:**
```json
[
  {
    "id": "new-york-ny",
    "counts": [450, 320, 180, 90]
  },
  {
    "id": "los-angeles-ca",
    "counts": [380, 290, 150, 70]
  }
]
```

The `counts` array represents:
- `counts[0]` - First choice selections
- `counts[1]` - Second choice selections
- `counts[2]` - Third choice selections
- `counts[3]` - Fourth choice selections

---

### Get Eligibility Counts

Get counts of eligible fans based on scoring criteria:

```bash
GET /:campaignId/entries/eligibility?minScore=70&maxScore=100&marketIds=new-york-ny,los-angeles-ca
Authorization: Bearer <supreme-token>
```

**Query Parameters:**
- `marketIds` - Comma-separated list of market IDs
- `minScore` - Minimum fanscore (e.g., 70)
- `maxScore` - Maximum fanscore (e.g., 100)
- `reassign` - Include previously selected fans (true/false)
- `randomSelection` - Randomize selection (true/false)
- `singleMarketSelection` - Limit to single market (true/false)
- `excludeIntlPhone` - Exclude international phone numbers (true/false)

**Response:**
```json
{
  "total": 1250,
  "verified": 1180,
  "selected": 0,
  "available": 1180
}
```

---

### Get Eligibility Breakdown

Get eligibility counts broken down by market preference:

```bash
GET /:campaignId/entries/eligibility/breakdown?minScore=70&maxScore=100
Authorization: Bearer <supreme-token>
```

**Response:**
```json
{
  "new-york-ny": {
    "first_choice": 450,
    "second_choice": 320,
    "third_choice": 180,
    "total": 950
  },
  "los-angeles-ca": {
    "first_choice": 380,
    "second_choice": 290,
    "third_choice": 150,
    "total": 820
  }
}
```

---

### Get Eligible Fans List

Retrieve paginated list of eligible fans:

```bash
GET /:campaignId/entries/scoring?marketId=new-york-ny&minScore=70&limit=100&offset=0
Authorization: Bearer <supreme-token>
```

**Query Parameters:**
- `marketId` - Single market ID filter
- `marketIds` - Multiple market IDs (comma-separated)
- `minScore` - Minimum score threshold
- `maxScore` - Maximum score threshold
- `reassign` - Include previously selected (boolean)
- `selectedOnly` - Only return selected fans (boolean)
- `orderByPreference` - Order by market preference (boolean)
- `randomSelection` - Randomize results (boolean)
- `limit` - Page size (default: 50)
- `offset` - Skip count (default: 0)

**Response:**
```json
{
  "data": [
    {
      "userId": "user123",
      "marketId": "new-york-ny",
      "score": 85,
      "verified": true,
      "selected": false,
      "preference": 1
    },
    {
      "userId": "user456",
      "marketId": "new-york-ny",
      "score": 82,
      "verified": true,
      "selected": false,
      "preference": 1
    }
  ],
  "total": 1250,
  "limit": 100,
  "offset": 0
}
```

---

### Save Scoring Records (Batch)

Save or update scoring records for multiple users:

```bash
POST /:campaignId/entries/scoring
Authorization: Bearer <supreme-token>
Content-Type: application/json

{
  "records": [
    {
      "userId": "user123",
      "marketId": "new-york-ny",
      "score": 85,
      "verified": true,
      "selected": false
    },
    {
      "userId": "user456",
      "marketId": "los-angeles-ca",
      "score": 78,
      "verified": true,
      "selected": true
    }
  ]
}
```

---

### Add Tags to Scoring Records

Tag scoring records based on uploaded filter lists:

```bash
POST /:campaignId/scoring/tags
Authorization: Bearer <supreme-token>
Content-Type: application/json

{
  "records": ["user123", "user456"],
  "targetField": "phone",
  "tagName": "exclude_list_2024"
}
```

---

### Flip Scoring Verdicts

Update verified status based on tags (e.g., after uploading exclusion list):

```bash
POST /:campaignId/scoring/flipVerdicts
Authorization: Bearer <supreme-token>
Content-Type: application/json

{
  "tagName": "exclude_list_2024",
  "filterType": "exclude"
}
```

---

### Transfer Entries Between Markets

Move entries from one market to another:

```bash
POST /:campaignId/entries/transfer
Authorization: Bearer <supreme-token>
Content-Type: application/json

{
  "fromMarketId": "chicago-il",
  "toMarketId": "detroit-mi"
}
```

---

### Get Filtered Entry List

Retrieve entries matching a specific filter:

```bash
GET /:campaignId/entries/winners?market=new-york-ny&limit=100&offset=0
Authorization: Bearer <supreme-token>
```

**Available Filter Types:**
- `winners` - Entries with assigned codes
- `codeless` - Entries without codes
- `blocked` - Blocked/flagged entries
- `verified` - All verified entries

**Query Parameters:**
- `market` - Filter by market ID
- `codeConfigId` - Filter by code configuration
- `limit` - Page size
- `offset` - Skip count

---

## V2 API Examples

### Batch Save Entries

Save or delete multiple entries across campaigns:

```bash
POST /v2/entries
Authorization: Bearer <supreme-token>
Content-Type: application/json

{
  "entries": [
    {
      "campaignId": "campaign1",
      "userId": "user123",
      "email": "user1@example.com",
      "phone": "+12025551234"
    },
    {
      "campaignId": "campaign2",
      "userId": "user456",
      "email": "user2@example.com",
      "phone": "+13105557890"
    }
  ],
  "deletions": [
    {
      "campaignId": "campaign3",
      "userId": "user789"
    }
  ]
}
```

---

### Refresh Scores

Refresh phone score and account fanscore for multiple entries:

```bash
POST /v2/refreshScores
Authorization: Bearer <supreme-token>
Content-Type: application/json

{
  "entries": [
    {
      "campaignId": "campaign1",
      "userId": "user123"
    },
    {
      "campaignId": "campaign1",
      "userId": "user456"
    }
  ]
}
```

---

## Users API Examples

### Get All Entries for User

Retrieve all campaign entries for a specific user:

```bash
GET /users/:userId/entries
Authorization: Bearer <token>
```

**Authorization:**
- User can access their own entries
- Supreme users can access any user's entries

**Response:**
```json
[
  {
    "_id": {
      "campaign_id": "campaign1",
      "user_id": "user123"
    },
    "fields": {
      "email": "user@example.com",
      "market": "new-york-ny"
    },
    "score": 85,
    "date": {
      "created": "2024-01-15T10:30:00.000Z",
      "updated": "2024-01-15T10:30:00.000Z"
    }
  },
  {
    "_id": {
      "campaign_id": "campaign2",
      "user_id": "user123"
    },
    "fields": {
      "email": "user@example.com",
      "market": "los-angeles-ca"
    },
    "score": 78
  }
]
```

---

### Opt Out User

Mark a user as opted out of campaigns:

```bash
POST /users/:userId/optout
Authorization: Bearer <supreme-token>
Content-Type: application/json

{
  "reason": "User requested opt-out via email",
  "campaigns": ["campaign1", "campaign2"]
}
```

---

### Delete User Entries

Delete all entries for a specific user:

```bash
DELETE /users/:userId
Authorization: Bearer <supreme-token>
```

**Response:**
```json
{
  "deleted": 5,
  "userId": "user123"
}
```

---

## GraphQL Examples

### Query Account Fanscore

```graphql
query GetFanscore($memberId: ID, $globalUserId: ID) {
  api {
    accountFanscore(memberId: $memberId, globalUserId: $globalUserId) {
      rawScore
    }
  }
}
```

**Variables:**
```json
{
  "memberId": "member123",
  "globalUserId": "user456"
}
```

**cURL Example:**
```bash
curl -X POST https://entry-service.example.com/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "query entries_fanscore($globalUserId: ID, $memberId: ID) { api { accountFanscore(memberId: $memberId, globalUserId: $globalUserId) { rawScore } } }",
    "variables": {
      "memberId": "member123",
      "globalUserId": "user456"
    }
  }'
```

**Response:**
```json
{
  "data": {
    "api": {
      "accountFanscore": {
        "rawScore": 85
      }
    }
  }
}
```

---

## Statistics API Examples

### Get Campaign Statistics

```bash
GET /:campaignId/stats/daily?marketId=new-york-ny&dateId=2024-01-15
Authorization: Bearer <supreme-token>
```

**Response:**
```json
[
  {
    "_id": {
      "campaignId": "campaign123",
      "marketId": "new-york-ny",
      "dateId": "2024-01-15",
      "type": "daily"
    },
    "count": {
      "total": 1250,
      "verified": 1180,
      "selected": 450,
      "processed": 1250
    },
    "status": "FINISHED",
    "date": {
      "created": "2024-01-15T00:00:00.000Z",
      "updated": "2024-01-15T23:59:59.000Z"
    }
  }
]
```

---

### Update Campaign Statistics

```bash
POST /:campaignId/stats/daily
Authorization: Bearer <supreme-token>
Content-Type: application/json

{
  "marketId": "new-york-ny",
  "dateId": "2024-01-15",
  "count": {
    "total": 100,
    "verified": 95,
    "selected": 30
  },
  "status": "PROCESSING",
  "meta": {
    "source": "batch-processor",
    "version": "1.2.0"
  }
}
```

**Response:**
```json
{
  "processed": 1
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "status": 400,
  "message": "Human-readable error message",
  "payload": "Technical error details",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input or missing required fields |
| 401 | Unauthorized - Missing or invalid JWT token |
| 403 | Forbidden - User lacks required permissions or eligibility |
| 404 | Not Found - Resource (entry, campaign, market) not found |
| 500 | Internal Server Error - Unexpected server error |

### Common Error Codes

| Code | Description |
|------|-------------|
| `ENTRY_NOT_FOUND` | Entry not found for specified user and campaign |
| `ENTRY_FLAGGED` | Entry was flagged and excluded from selection |
| `NO_PAST_PARTICIPATION` | User lacks required past participation |

### Validation Error Examples

**Missing Required Fields:**
```json
{
  "status": 400,
  "message": "The following required fields are missing: 'email', 'phone'.",
  "payload": "Missing required fields."
}
```

**Invalid Field Value:**
```json
{
  "status": 400,
  "message": "Invalid entry field: 'market'.",
  "payload": "Field is not valid.",
  "field": "market"
}
```

**Market Overlap Error:**
```json
{
  "status": 400,
  "message": "The primary city may not be the same as one of the additional cities.",
  "payload": "City provided for both destination city and additional cities."
}
```

---

## Rate Limiting

Currently, the service does not implement rate limiting at the application level. Rate limiting may be enforced at the infrastructure/gateway level.

---

## Best Practices

### 1. Use Appropriate API Version

- Use V1 API for single-entry operations
- Use V2 API for batch operations requiring supreme access
- Use Users API for user-centric operations

### 2. Handle Pagination

When retrieving lists of entries or scoring records:
- Always specify `limit` to avoid large response payloads
- Use `offset` or `page` for pagination
- Default limit is typically 50 items

### 3. Supreme User Operations

Operations requiring supreme user access should:
- Validate user permissions before making requests
- Handle 403 Forbidden responses appropriately
- Log administrative actions for audit purposes

### 4. Phone Number Format

Always provide phone numbers in E.164 format:
- Include country code with + prefix
- Example: `+12025551234` (US), `+442071234567` (UK)
- Mexican numbers support both `+52` and `+521` prefixes

### 5. Market Selection

When setting market preferences:
- Validate market IDs against available markets
- Ensure primary market differs from additional markets
- Respect maximum additional markets limit (usually 3)

### 6. Error Handling

- Check HTTP status codes before parsing response
- Handle specific error codes for better user experience
- Provide meaningful error messages to end users
- Log errors with correlation IDs for debugging

### 7. Token Management

- Store JWT tokens securely
- Refresh tokens before expiration
- Handle 401 responses by redirecting to authentication
- Never log or expose tokens in client-side code
