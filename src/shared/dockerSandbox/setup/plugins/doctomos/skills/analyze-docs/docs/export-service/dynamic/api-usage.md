# API Usage - export-service

## Authentication

All endpoints except `/heartbeat`, `/metrics`, and `/dev/token` require JWT authentication.

### JWT Token Requirements

**Header Format**:
```
Authorization: Bearer <jwt-token>
```

**Token Claims**:
- User ID
- Campaign permissions/actions
- Optional: Supreme user flag (for CCPA endpoints)

**Token Configuration**:
- Signed with RSA public/private key pair
- Keys configured via environment variables
- Optional anonymous access can be enabled via config

---

## Authorization & Permissions

### Permission Types

The service uses the VerifiedFan permission system:

- **REPORT**: Required for all export operations (create, read, list)
- **Supreme User**: Required for CCPA deletion endpoints

### Permission Checks

Permissions are validated on a per-campaign basis:
1. JWT token contains user's campaign-specific permissions
2. Middleware validates required permissions before processing request
3. Invalid permissions return 401 Unauthorized

---

## Request Examples

### 1. Queue a New Export

**Request**:
```bash
curl -X POST https://api.example.com/campaigns/123/exports \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1..." \
  -H "Content-Type: application/json" \
  -d '{
    "exportType": "entries"
  }'
```

**Response** (201 Created):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "exportType": "entries",
  "campaignId": "123",
  "date": {
    "created": "2024-01-15T10:30:00.000Z"
  },
  "status": "PENDING",
  "requesterUserId": "user123"
}
```

---

### 2. Queue Code Wave Export (with dateKey)

**Request**:
```bash
curl -X POST https://api.example.com/campaigns/456/exports \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1..." \
  -H "Content-Type: application/json" \
  -d '{
    "exportType": "codeWaves",
    "dateKey": "1673740800000"
  }'
```

**Response** (201 Created):
```json
{
  "id": "507f1f77bcf86cd799439012",
  "exportType": "codeWaves",
  "campaignId": "456",
  "date": {
    "created": "2024-01-15T11:00:00.000Z"
  },
  "status": "PENDING",
  "requesterUserId": "user123"
}
```

**Note**: The `dateKey` parameter is **required** for `codeWaves` export type.

---

### 3. Get Export Status

**Request**:
```bash
curl -X GET https://api.example.com/campaigns/123/exports/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1..."
```

**Response (In Progress)** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "exportType": "entries",
  "campaignId": "123",
  "campaignName": "Summer Tour Presale",
  "date": {
    "created": "2024-01-15T10:30:00.000Z"
  },
  "status": "TRIGGERED",
  "requesterUserId": "user123"
}
```

**Response (Completed)** (200 OK):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "exportType": "entries",
  "campaignId": "123",
  "campaignName": "Summer Tour Presale",
  "date": {
    "created": "2024-01-15T10:30:00.000Z"
  },
  "status": "FINISHED",
  "requesterUserId": "user123",
  "path": "https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...",
  "key": "exports/Summer_Tour_Presale_123_20240115_103000.csv",
  "count": 15420
}
```

---

### 4. List Campaign Exports

**Request**:
```bash
curl -X GET https://api.example.com/campaigns/123/exports \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1..."
```

**Response** (200 OK):
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "exportType": "entries",
    "campaignId": "123",
    "campaignName": "Summer Tour Presale",
    "status": "FINISHED",
    "date": {
      "created": "2024-01-15T10:30:00.000Z"
    },
    "requesterUserId": "user123",
    "path": "https://s3.amazonaws.com/...",
    "count": 15420
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "exportType": "codes",
    "campaignId": "123",
    "campaignName": "Summer Tour Presale",
    "status": "PENDING",
    "date": {
      "created": "2024-01-15T11:00:00.000Z"
    },
    "requesterUserId": "user456"
  }
]
```

---

### 5. Filter Exports by Type

**Request**:
```bash
curl -X GET "https://api.example.com/campaigns/123/exports?exportType=codes" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1..."
```

**Response** (200 OK):
```json
[
  {
    "id": "507f1f77bcf86cd799439012",
    "exportType": "codes",
    "campaignId": "123",
    "campaignName": "Summer Tour Presale",
    "status": "FINISHED",
    "date": {
      "created": "2024-01-15T11:00:00.000Z"
    },
    "requesterUserId": "user456",
    "path": "https://s3.amazonaws.com/...",
    "count": 5000
  }
]
```

---

### 6. Delete User Exports (CCPA)

**Request**:
```bash
curl -X DELETE https://api.example.com/ccpa/users/user123 \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1..." (supreme user token required)
```

**Response** (200 OK):
```json
{
  "message": "User exports deleted successfully"
}
```

**Note**: Requires supreme user privileges. Does not delete VERIFIED_ENTRIES, SCORING, or AUTO_REMINDER_EMAIL exports.

---

## Error Handling

### Error Response Structure

All errors return a standardized format:

```json
{
  "error": {
    "status": 400,
    "message": "Error summary",
    "payload": "Detailed error message"
  }
}
```

---

### Common Error Codes

| HTTP Status | Error Type | Message | When It Occurs |
|-------------|------------|---------|----------------|
| 400 | InvalidExportType | Invalid export type: 'xyz' | Export type not recognized |
| 400 | CampaignNotFound | Campaign not found | Campaign ID doesn't exist |
| 400 | MissingDateKey | dateKey parameter required | Missing dateKey for codeWaves |
| 400 | InvalidDateKey | dateKey value was invalid | dateKey is not a numeric string |
| 401 | MissingPermissions | Invalid user permissions | Missing REPORT permission |
| 404 | ExportNotFound | Export not found | Export ID doesn't exist |
| 500 | DeleteFailed | Error deleting exports | S3 or DB deletion error |

---

### Error Examples

#### 1. Invalid Export Type

**Request**:
```bash
curl -X POST https://api.example.com/campaigns/123/exports \
  -H "Authorization: Bearer ..." \
  -d '{"exportType": "invalidType"}'
```

**Response** (400 Bad Request):
```json
{
  "error": {
    "status": 400,
    "message": "Invalid export type: 'invalidType'.",
    "payload": "The 'exportType' value could not be resolved."
  }
}
```

---

#### 2. Missing Permissions

**Request**:
```bash
curl -X POST https://api.example.com/campaigns/123/exports \
  -H "Authorization: Bearer ..." (token without REPORT permission)
  -d '{"exportType": "entries"}'
```

**Response** (401 Unauthorized):
```json
{
  "error": {
    "status": 401,
    "message": "Invalid user permissions.",
    "payload": "Missing REPORT permissions."
  }
}
```

---

#### 3. Campaign Not Found

**Request**:
```bash
curl -X POST https://api.example.com/campaigns/999999/exports \
  -H "Authorization: Bearer ..." \
  -d '{"exportType": "entries"}'
```

**Response** (400 Bad Request):
```json
{
  "error": {
    "status": 400,
    "message": "Campaign not found.",
    "payload": "Campaign 999999 not found."
  }
}
```

---

#### 4. Missing dateKey for codeWaves

**Request**:
```bash
curl -X POST https://api.example.com/campaigns/123/exports \
  -H "Authorization: Bearer ..." \
  -d '{"exportType": "codeWaves"}'
```

**Response** (400 Bad Request):
```json
{
  "error": {
    "status": 400,
    "message": "The 'dateKey' parameter is required for export type 'codeWaves'.",
    "payload": "Missing 'dateKey' value for 'codeWave'."
  }
}
```

---

#### 5. Export Not Found

**Request**:
```bash
curl -X GET https://api.example.com/campaigns/123/exports/invalid-id \
  -H "Authorization: Bearer ..."
```

**Response** (404 Not Found):
```json
{
  "error": {
    "status": 404,
    "message": "Export not found.",
    "payload": "Export invalid-id not found."
  }
}
```

---

## Best Practices

### 1. Polling for Export Completion

Exports are processed asynchronously. Recommended polling approach:

```javascript
async function waitForExport(campaignId, exportId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const exportData = await getExport(campaignId, exportId);

    if (exportData.status === 'FINISHED') {
      return exportData.path; // Download URL
    }

    if (exportData.status === 'FAILED') {
      throw new Error('Export failed');
    }

    // Wait 5 seconds before next poll
    await sleep(5000);
  }

  throw new Error('Export timeout');
}
```

**Notes**:
- Poll every 5-10 seconds
- Implement exponential backoff for longer exports
- Handle FAILED status appropriately

---

### 2. Handling Duplicate Export Requests

If you queue an export that's already PENDING or TRIGGERED, the API returns the existing export instead of creating a duplicate:

```bash
# First request - creates new export
POST /campaigns/123/exports {"exportType": "entries"}
# Returns: {"id": "abc", "status": "PENDING"}

# Second request (while first is pending) - returns existing
POST /campaigns/123/exports {"exportType": "entries"}
# Returns: {"id": "abc", "status": "PENDING"} (same ID)
```

---

### 3. Downloading Export Files

When export status is FINISHED, use the `path` field to download:

```bash
# Get export to retrieve signed URL
GET /campaigns/123/exports/abc
# Response includes: "path": "https://s3.amazonaws.com/...?X-Amz-..."

# Download the file directly
curl -o export.csv "https://s3.amazonaws.com/...?X-Amz-..."
```

**Important**:
- Signed URLs expire after configured TTL (check service config)
- For multi-key exports (e.g., autoReminderEmail), use `key` instead of `path`
- Re-fetch the export to get a new signed URL if expired

---

### 4. Rate Limits

No explicit rate limits are enforced at the application level, but consider:
- Background processing queue has polling interval (default: 1000ms)
- Multiple simultaneous exports may impact processing time
- AWS S3 and database have their own rate limits

---

## Integration Guide

### Typical Export Workflow

1. **Queue Export**
   - POST to `/campaigns/:campaignId/exports`
   - Receive export ID and PENDING status

2. **Poll for Completion**
   - GET `/campaigns/:campaignId/exports/:exportId` every 5-10 seconds
   - Check status field

3. **Download File**
   - When status = FINISHED, use `path` field
   - Download file before signed URL expires

4. **Process Data**
   - Parse CSV/ZIP file
   - Handle row data according to export type

---

### Testing with Development Endpoints

Development endpoints are enabled via configuration flag.

**Generate Test JWT**:
```bash
curl -X POST https://api.example.com/dev/token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "campaignId": "test-campaign",
    "permissions": ["REPORT"]
  }'
```

**Response**:
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Verify Supreme Access**:
```bash
curl -X GET https://api.example.com/dev/supremes \
  -H "Authorization: Bearer <token-with-supreme-flag>"
```

---

## Export File Formats

### CSV Exports

Most export types generate CSV files with headers. Format varies by export type:

**entries**:
- Columns include: userId, email, campaignId, entryDate, etc.
- One row per entry

**codes**:
- Columns include: code, assignedTo, assignedAt, status
- One row per code

**codeAssignments**:
- Columns include: code, userId, campaignId, assignmentDate
- One row per assignment

### ZIP Exports

Some export types (e.g., `promoterEmailOptIn`) generate ZIP archives containing multiple CSV files grouped by promoter.

---

## SFMC Integration (autoReminderEmail)

The `autoReminderEmail` export type integrates with Salesforce Marketing Cloud (SFMC):

**Region-Specific Configuration**:
- NA (North America): MID 7222895
- LNE (Live Nation Entertainment): MID 518008883
- GB, IE, ES, DE, AT, etc.: Region-specific MIDs

**S3 Bucket**: `sfmcS3` (separate from standard exports)

**File Naming**: Includes region prefix for proper SFMC routing

---

## Monitoring & Observability

### Prometheus Metrics

Available at `/metrics` endpoint (no auth required):

- `http_request_duration_seconds`: Request processing time
- `http_requests_total`: Total request count
- Custom export metrics (queue size, processing time, etc.)

### Health Check

Available at `/heartbeat` endpoint (no auth required):

Returns 200 OK when service is healthy.

---

## Security Considerations

### JWT Token Security

- Never expose private keys
- Rotate keys periodically
- Use HTTPS in production
- Validate token expiration

### S3 Signed URLs

- URLs expire after configured TTL
- Generate new URLs for each download request
- Use appropriate ACLs (private by default)

### CCPA Compliance

- CCPA deletion endpoint requires supreme user token
- Certain export types exempt from deletion (scoring, verified entries)
- Audit log tracks all deletion operations

---

## Support & Troubleshooting

### Common Issues

**Issue**: Export stuck in PENDING
- **Cause**: Queue processing may be paused or slow
- **Solution**: Check service logs, verify queue processing interval

**Issue**: Export status FAILED
- **Cause**: Data validation error, S3 upload failure, or missing dependencies
- **Solution**: Check export error logs for specific failure reason

**Issue**: Signed URL expired
- **Cause**: URL TTL exceeded
- **Solution**: Re-fetch export to get new signed URL

**Issue**: 401 Unauthorized
- **Cause**: Missing or invalid JWT, or insufficient permissions
- **Solution**: Verify token is valid and includes REPORT permission for the campaign
