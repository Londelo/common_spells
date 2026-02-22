# API Contracts - code-service

## Service Overview

The **code-service** is a REST API service built with Koa that manages promotional codes for campaigns. It provides endpoints for uploading, assigning, reserving, releasing, and counting codes with support for both Ticketmaster (TM) and external code types.

**Framework:** Koa (Node.js)
**Authentication:** JWT (JSON Web Tokens)
**Database:** MongoDB
**Main Router Path:** `/:campaignId/*`

---

## REST Endpoints

### Production Endpoints

| Method | Path | Purpose | Auth Required | Supreme Only |
|--------|------|---------|---------------|--------------|
| POST | `/:campaignId/codes` | Upload codes from S3 file | JWT | Yes |
| POST | `/:campaignId/assign` | Mark codes as assigned | JWT | Yes |
| POST | `/:campaignId/release` | Release reserved codes | JWT | Yes |
| GET | `/:campaignId/reserve` | Reserve available codes | JWT | Yes |
| GET | `/:campaignId/codes/count` | Count codes by status and type | JWT | Yes |

### System Endpoints

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| GET | `/heartbeat` | Health check endpoint | No |
| GET | `/metrics` | Prometheus metrics | No |

### Development Endpoints

These endpoints are only available when `devEndpoints.enabled` is true in configuration.

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| GET | `/dev/auth` | Get authentication info | JWT |
| POST | `/dev/token` | Generate JWT token | No |
| GET | `/dev/supremes` | Check supreme user status | JWT |
| GET | `/dev/internalServerError` | Trigger test error | JWT |

---

## Endpoint Details

### POST /:campaignId/codes

Upload codes from an S3 file to the database for a specific campaign.

**Path Parameters:**
- `campaignId` (string, required) - The campaign identifier

**Request Body:**
```json
{
  "fileKey": "codes/{campaignId}/{type}/{filename}"
}
```

**File Key Pattern:** `codes/{campaignId}/{type}/{filename}`
- `type` must be either `tm` or `external`

**Response:**
```json
{
  "in": 100,
  "inserted": 95,
  "updated": 5
}
```

**Errors:**
- `404` - Invalid file key format
- `400` - Invalid code type
- `403` - Supreme user access required

---

### POST /:campaignId/assign

Mark codes as assigned to users. Assigned codes cannot be reserved by others.

**Path Parameters:**
- `campaignId` (string, required) - The campaign identifier

**Request Body:**
```json
{
  "codes": ["CODE001", "CODE002", "CODE003"]
}
```

**Response:**
```json
{
  "count": {
    "in": 3,
    "updated": 3
  }
}
```

**Validation:**
- `codes` must be a non-empty array
- All codes must be strings

**Errors:**
- `400` - Missing codes parameter
- `400` - Codes must be an array
- `400` - Codes array cannot be empty
- `403` - Supreme user access required

---

### POST /:campaignId/release

Release reserved codes, making them available again.

**Path Parameters:**
- `campaignId` (string, required) - The campaign identifier

**Request Body:**
```json
{
  "codes": ["CODE001", "CODE002", "CODE003"]
}
```

**Response:**
```json
{
  "count": {
    "in": 3,
    "updated": 2
  }
}
```

**Validation:**
- `codes` must be a non-empty array
- Only reserved (not assigned) codes can be released

**Errors:**
- `400` - Missing codes parameter
- `400` - Codes must be an array
- `400` - Codes array cannot be empty
- `403` - Supreme user access required

---

### GET /:campaignId/reserve

Reserve a specified number of available codes for temporary use.

**Path Parameters:**
- `campaignId` (string, required) - The campaign identifier

**Query Parameters:**
- `count` (integer, required) - Number of codes to reserve (minimum: 1)
- `type` (string, required) - Code type: `tm` or `external`

**Example:**
```
GET /:campaignId/reserve?count=10&type=tm
```

**Response:**
```json
{
  "codes": ["CODE001", "CODE002", "CODE003", "..."],
  "reserveId": "uuid-v4-string"
}
```

**Reservation Logic:**
- Reserved codes expire after 24 hours
- Expired reservations become available again
- Generates unique `reserveId` for tracking

**Errors:**
- `400` - Missing count or type parameter
- `400` - Invalid count (must be >= 1)
- `400` - Invalid code type
- `403` - Supreme user access required

---

### GET /:campaignId/codes/count

Get the count of codes for a campaign filtered by status and type.

**Path Parameters:**
- `campaignId` (string, required) - The campaign identifier

**Query Parameters:**
- `type` (string, required) - Code type: `tm` or `external`
- `status` (string, optional) - Code status: `available`, `assigned`, or `reserved`

**Example:**
```
GET /:campaignId/codes/count?type=tm&status=available
```

**Response:**
```json
{
  "available": 100,
  "assigned": 50,
  "reserved": 25
}
```

If `status` is not provided, returns counts for all statuses.

**Errors:**
- `400` - Missing type parameter
- `400` - Invalid code type
- `400` - Invalid status value
- `403` - Supreme user access required

---

## Data Models

### Code Document Structure

```javascript
{
  "_id": {
    "campaign_id": "campaign-123",
    "code": "CODE001"
  },
  "type": "tm",  // or "external"
  "date": {
    "saved": ISODate("2024-01-01T00:00:00Z"),
    "reserved": ISODate("2024-01-02T00:00:00Z"),  // optional
    "assigned": ISODate("2024-01-03T00:00:00Z")   // optional
  },
  "reserveId": "uuid-v4-string"  // optional, set when reserved
}
```

### Code Types

| Type | Description |
|------|-------------|
| `tm` | Ticketmaster codes |
| `external` | Third-party/external codes |

### Code Statuses

| Status | Condition |
|--------|-----------|
| `available` | No assignment date AND (no reservation OR reservation expired) |
| `reserved` | Has reservation date within last 24 hours AND no assignment date |
| `assigned` | Has assignment date (permanent) |

**Status Priority:** assigned > reserved > available

**Expiration Logic:**
- Reserved codes older than 24 hours become available
- Assigned codes are permanent (no expiration)

---

## Database Indexes

### codes Collection

```javascript
// Compound index for campaign and code lookup
{ "_id.campaign_id": -1, "_id.code": 1 }

// Index for status queries (available/reserved/assigned)
{ "_id.campaign_id": -1, "type": 1, "date.reserved": -1, "date.assigned": -1 }

// Sparse index for reserve ID lookups
{ "reserveId": -1 }  // sparse: true
```

---

## Response Format

All endpoints return responses in a standardized format enforced by the `responseFormatter` middleware.

**Success Response:**
```json
{
  "data": { /* endpoint-specific data */ },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "correlationId": "uuid-v4"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "status": 400,
    "message": "Human-readable error message",
    "payload": "Brief error description"
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "correlationId": "uuid-v4"
  }
}
```

---

## Validation Rules

### Common Validations

1. **Supreme User Check:** All production endpoints require supreme user authorization
2. **Campaign ID:** Must be provided in URL path
3. **Code Type:** Must be `tm` or `external`
4. **Code Status:** Must be `available`, `assigned`, or `reserved`

### Endpoint-Specific Validations

**Upload Codes (`POST /:campaignId/codes`):**
- File key must match pattern: `codes/{campaignId}/{type}/{filename}`
- Type in file key must be valid

**Assign/Release Codes:**
- `codes` property required
- `codes` must be an array
- Array must contain at least one code

**Reserve Codes:**
- `count` and `type` required
- `count` must be >= 1

**Count Codes:**
- `type` parameter required
- `status` parameter optional but must be valid if provided

---

## Error Codes

| HTTP Status | Error | Description |
|-------------|-------|-------------|
| 400 | invalidFileKey | File key doesn't match expected pattern |
| 400 | InvalidType | Code type is not 'tm' or 'external' |
| 400 | InvalidStatus | Status is not 'available', 'assigned', or 'reserved' |
| 400 | missingType | Type parameter required |
| 400 | missingCodeReserveParams | Count and type required for reservation |
| 400 | invalidCount | Count must be >= 1 |
| 400 | missingCodes | Codes array required |
| 400 | emptyCodes | Codes array cannot be empty |
| 400 | invalidCodesProp | Codes must be an array |
| 401 | Unauthorized | Invalid or missing JWT token |
| 403 | supremeUserRequired | Endpoint requires supreme user access |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Unexpected server error |
