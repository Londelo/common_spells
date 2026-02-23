# API Contracts - export-service

## REST API Endpoints

### Export Management

| Method | Path | Purpose | Auth | Permissions |
|--------|------|---------|------|-------------|
| POST | `/campaigns/:campaignId/exports` | Queue a new export job | JWT | REPORT |
| GET | `/campaigns/:campaignId/exports/:exportId` | Get export by ID | JWT | REPORT |
| GET | `/campaigns/:campaignId/exports` | List exports for campaign | JWT | REPORT |
| DELETE | `/ccpa/users/:userId` | Delete user exports (CCPA compliance) | JWT | Supreme User |

### Health & Monitoring

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/heartbeat` | Service health check | None |
| GET | `/metrics` | Prometheus metrics | None |

### Development Endpoints (Dev Mode Only)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/dev/auth` | Get auth test data | None |
| GET | `/dev/internalServerError` | Trigger test error | None |
| POST | `/dev/token` | Generate test JWT | None |
| GET | `/dev/supremes` | Test supreme user access | JWT + Supreme |

---

## Request/Response Schemas

### POST `/campaigns/:campaignId/exports`

**Purpose**: Queue a new export job for a campaign.

**Path Parameters**:
- `campaignId` (string, required): Campaign identifier

**Request Body**:
```json
{
  "exportType": "string",
  "dateKey": "string (optional, required for codeWaves)",
  "includeAllMarkets": "boolean (optional)"
}
```

**Response** (201 Created):
```json
{
  "id": "string",
  "exportType": "string",
  "campaignId": "string",
  "date": {
    "created": "ISO 8601 timestamp"
  },
  "status": "PENDING",
  "requesterUserId": "string"
}
```

**Notes**:
- If an export of the same type is already queued (PENDING or TRIGGERED status), returns the existing export instead of creating a new one
- Returns existing export with 200 OK, or creates new export with 201 Created

---

### GET `/campaigns/:campaignId/exports/:exportId`

**Purpose**: Retrieve a specific export by ID.

**Path Parameters**:
- `campaignId` (string, required): Campaign identifier
- `exportId` (string, required): Export identifier

**Response** (200 OK):
```json
{
  "id": "string",
  "exportType": "string",
  "campaignId": "string",
  "campaignName": "string",
  "date": {
    "created": "ISO 8601 timestamp"
  },
  "status": "PENDING | TRIGGERED | FINISHED | FAILED | EXPIRED",
  "requesterUserId": "string",
  "path": "string (signed URL when status is FINISHED)",
  "key": "string (S3 key)",
  "count": "number (row count when finished)",
  "dateKey": "string (optional)",
  "includeAllMarkets": "boolean (optional)"
}
```

**Notes**:
- The `path` field contains a time-limited signed URL (TTL configured in service)
- For multi-key exports (e.g., autoReminderEmail), the `key` field is returned instead of `path`

---

### GET `/campaigns/:campaignId/exports`

**Purpose**: List all exports for a campaign with optional filtering and pagination.

**Path Parameters**:
- `campaignId` (string, required): Campaign identifier

**Query Parameters**:
- `exportType` (string, optional): Filter by export type
- `sort` (string, optional): Sort field
- `sortOrder` (string, optional): Sort direction (asc/desc)
- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Results per page

**Response** (200 OK):
```json
[
  {
    "id": "string",
    "exportType": "string",
    "campaignId": "string",
    "campaignName": "string",
    "date": {
      "created": "ISO 8601 timestamp"
    },
    "status": "PENDING | TRIGGERED | FINISHED | FAILED | EXPIRED",
    "requesterUserId": "string",
    "path": "string (signed URL when finished)",
    "key": "string",
    "count": "number (optional)"
  }
]
```

---

### DELETE `/ccpa/users/:userId`

**Purpose**: Delete all exports associated with a user (CCPA compliance).

**Path Parameters**:
- `userId` (string, required): User identifier

**Authorization**: Requires JWT and supreme user privileges

**Response** (200 OK):
```json
{
  "message": "User exports deleted successfully"
}
```

**Notes**:
- Does not delete exports of types: VERIFIED_ENTRIES, SCORING, AUTO_REMINDER_EMAIL
- Requires supreme user token (validated via `selectIsUserSupreme`)

---

## Export Types

The service supports the following export types:

| Export Type | Description | Bucket | Notes |
|-------------|-------------|--------|-------|
| `entries` | Campaign entry data | exportsS3 | Standard entries export |
| `codes` | Access codes | exportsS3 | All assigned codes |
| `scoring` | Scoring data | scoringS3 | Fan scoring/ranking data |
| `codeAssignments` | Code assignment records | exportsS3 | Assignment history |
| `artistOptIn` | Artist opt-in contacts | exportsS3 | Email opt-ins |
| `artistSmsOptIn` | Artist SMS opt-ins | exportsS3 | SMS opt-ins |
| `livenationOptIn` | LiveNation opt-ins | exportsS3 | Email opt-ins |
| `verifiedEntries` | Verified entry records | vfScoringS3 | Post-verification data |
| `codeWaves` | Code wave assignments | vfScoringS3 | Requires `dateKey` param |
| `fanlist` | Fan contact list | exportsS3 | Formatted fan data |
| `waitlist` | Waitlist entries | exportsS3 | Waitlist registrations |
| `reminderEmail` | Reminder email data | exportsS3 | Email campaign data |
| `reminderEmailSample` | Sample reminder data | exportsS3 | Test/preview data |
| `autoReminderEmail` | Automated reminder batch | sfmcS3 | SFMC integration |
| `promoterEmailOptIn` | Promoter email opt-ins | exportsS3 | Promoter contact list |

---

## Export Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Export queued, waiting to be processed |
| `TRIGGERED` | Export processing started |
| `FINISHED` | Export completed successfully |
| `FAILED` | Export processing failed |
| `EXPIRED` | Export signed URL has expired |

---

## Data Types & Enumerations

### ACL Types
```javascript
{
  PRIVATE: 'private',
  OWNER_CONTROL: 'bucket-owner-full-control'
}
```

**Notes**:
- Most exports use `private` ACL
- Scoring exports use `bucket-owner-full-control`

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "status": "number",
    "message": "string",
    "payload": "string (detailed error message)"
  }
}
```

See [api-usage.md](./api-usage.md) for specific error codes and examples.
