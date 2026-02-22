# Domain Concepts - code-service

## Core Entities

| Entity | Description |
|--------|-------------|
| **Code** | A unique promotional or access code string associated with a campaign. Primary entity tracked through lifecycle. |
| **Campaign** | Container/context for codes. Identified by campaignId. Codes are scoped to campaigns. |
| **Reservation** | Temporary claim on codes for 24 hours. Tracked via reserveId and date.reserved timestamp. |
| **Supreme User** | Authenticated user with elevated permissions required for all code operations. |
| **Code Type** | Classification of code origin: "tm" (Ticketmaster internal) or "external" (third-party). |
| **Code Status** | Computed state based on timestamps: available, reserved (< 24hrs), or assigned (permanent). |

## Business Rules

### Code Lifecycle Rules
- **Rule 1**: Codes are created in "available" status when uploaded from CSV files
- **Rule 2**: Reserved codes automatically expire and return to available status after 24 hours
- **Rule 3**: Assigned codes are permanent and can never be released or modified
- **Rule 4**: Only codes without an assigned date can be reserved
- **Rule 5**: Only codes with a reserved date (and no assigned date) can be released

### Reservation Rules
- **Rule 6**: Each reservation batch gets a unique reserveId (UUIDv4)
- **Rule 7**: Reservation operations retry up to 3 times on concurrent write conflicts
- **Rule 8**: Available codes include never-reserved codes OR codes reserved more than 24 hours ago
- **Rule 9**: Reservation date is set to current timestamp at time of reservation
- **Rule 10**: Multiple codes can share the same reserveId (batch reservation)

### Upload Rules
- **Rule 11**: Code file keys must match pattern: `codes/{campaignId}/{type}/{filename}`
- **Rule 12**: CSV files are parsed with comma delimiter, trimming whitespace
- **Rule 13**: Empty lines and lines with empty values are skipped during parsing
- **Rule 14**: Only the first column of CSV is used as the code value
- **Rule 15**: Duplicate codes within a campaign are updated (not rejected), preserving status dates

### Access Control Rules
- **Rule 16**: All code operations require supreme-level authentication
- **Rule 17**: JWT tokens are validated on all endpoints except /metrics and /heartbeat

### Code Type Rules
- **Rule 18**: Valid code types are restricted to "tm" and "external"
- **Rule 19**: Code type must be specified for count and reserve operations
- **Rule 20**: Code type is encoded in S3 file path during upload

## Terminology

| Term | Definition |
|------|------------|
| **Supreme User** | User with supreme authentication level in JWT token. Only permission level allowed for code operations. |
| **Available Code** | Code with no assigned date AND either no reserved date OR reserved date older than 24 hours. |
| **Reserved Code** | Code with reserved date within last 24 hours AND no assigned date. |
| **Assigned Code** | Code with assigned date set. Permanent status that cannot be changed. |
| **Reserve ID** | UUID v4 identifier grouping codes reserved together in a single batch operation. |
| **Code Type - TM** | Ticketmaster-generated internal codes for verified fan access. |
| **Code Type - External** | Third-party or partner-generated codes for promotions or external integrations. |
| **Campaign ID** | Unique identifier for a campaign. Codes are scoped to campaigns. |
| **File Key** | S3 object key/path where CSV code file is stored. Format: `codes/{campaignId}/{type}/{filename}`. |
| **Scoring Bucket** | AWS S3 bucket configured to store code CSV files before processing. |
| **Batch Size** | Number of codes processed in a single batch during upload (50,000). |
| **Upsert** | Insert new code or update existing code if already exists (based on campaign_id + code composite key). |
| **Code Expiration** | Automatic transition of reserved codes to available status after 24 hours. No explicit cleanup job. |

## Data Models

### Code Document (MongoDB)

```javascript
{
  _id: {
    campaign_id: String,  // Campaign identifier
    code: String          // Unique code value (composite key)
  },
  type: String,           // "tm" or "external"
  date: {
    saved: Date,          // When code was uploaded/updated
    reserved: Date,       // When code was reserved (optional)
    assigned: Date        // When code was assigned (optional, permanent)
  },
  reserveId: String       // UUID v4 for batch reservation (optional)
}
```

### Status Computation Logic

Status is **not stored** but **computed** from timestamps:

```javascript
// Available: no assigned date AND (no reserved date OR reserved > 24 hours ago)
const isAvailable = !code.date.assigned &&
  (!code.date.reserved || code.date.reserved <= yesterday());

// Reserved: no assigned date AND reserved date within 24 hours
const isReserved = !code.date.assigned &&
  code.date.reserved && code.date.reserved > yesterday();

// Assigned: has assigned date (permanent)
const isAssigned = !!code.date.assigned;
```

### API Request/Response Models

**Upload Codes Request**:
```javascript
POST /:campaignId/codes
Body: {
  fileKey: "codes/CAMP123/tm/batch1.csv"
}
```

**Upload Codes Response**:
```javascript
{
  count: {
    in: 50000,        // Codes in CSV file
    inserted: 48000,  // New codes created
    updated: 2000     // Existing codes updated
  }
}
```

**Reserve Codes Request**:
```javascript
GET /:campaignId/reserve?count=10&type=tm
```

**Reserve Codes Response**:
```javascript
["CODE001", "CODE002", "CODE003", ...]  // Array of code strings
```

**Assign Codes Request**:
```javascript
POST /:campaignId/assign
Body: {
  codes: ["CODE001", "CODE002"]
}
```

**Assign Codes Response**:
```javascript
{
  count: {
    in: 2,        // Codes in request
    updated: 2    // Codes successfully assigned
  }
}
```

**Release Codes Request**:
```javascript
POST /:campaignId/release
Body: {
  codes: ["CODE003", "CODE004"]
}
```

**Release Codes Response**:
```javascript
{
  count: {
    in: 2,        // Codes in request
    updated: 2    // Codes successfully released
  }
}
```

**Count Codes Request**:
```javascript
GET /:campaignId/codes/count?type=tm&status=available
```

**Count Codes Response** (single status):
```javascript
{
  available: 1000
}
```

**Count Codes Response** (all statuses, when status param omitted):
```javascript
{
  available: 1000,
  reserved: 50,
  assigned: 500
}
```

### MongoDB Indexes

**Primary Queries Supported**:
- Find available codes by campaign and type
- Count codes by campaign, type, and status
- Find codes by reserveId
- Update codes by campaign and code values

**Expected Indexes** (from indexMap patterns):
```javascript
// Composite index for campaign + type queries
{ "_id.campaign_id": 1, "type": 1 }

// Index for reservation queries
{ "reserveId": 1 }

// Index for status queries (date fields)
{ "_id.campaign_id": 1, "type": 1, "date.reserved": 1, "date.assigned": 1 }
```

## Entity Relationships

```
Campaign (1) ----< (many) Codes
  |
  └─> Each code belongs to exactly one campaign
  └─> Campaign ID is part of code's composite primary key

Code (1) ----< (0..1) Reservation
  |
  └─> Code can be reserved (has reserveId + date.reserved)
  └─> Multiple codes can share same reserveId (batch reservation)
  └─> Reservation is optional and temporary (24 hour expiration)

Code (1) ----< (0..1) Assignment
  |
  └─> Code can be assigned (has date.assigned)
  └─> Assignment is optional but permanent once set
  └─> Assigned codes cannot be reserved or released

Code Type (enum)
  |
  ├─> "tm" (Ticketmaster internal codes)
  └─> "external" (Third-party codes)
```

## State Machine

```
[AVAILABLE] ──(reserve)──> [RESERVED] ──(24 hours)──> [AVAILABLE]
     |                          |
     |                          └──(assign)──> [ASSIGNED] (terminal)
     |
     └──(assign directly)──> [ASSIGNED] (terminal)


Notes:
- AVAILABLE is the initial state (on upload)
- RESERVED automatically transitions to AVAILABLE after 24 hours
- RESERVED can be manually released to AVAILABLE via release operation
- ASSIGNED is a terminal state (no transitions out)
- Codes can be assigned directly from AVAILABLE (skip reservation)
```

## Domain Constraints

### Cardinality Constraints
- One code can belong to exactly one campaign (1:1 with campaign_id in composite key)
- One code can have at most one active reservation (0..1)
- One code can have at most one assignment (0..1)
- One reserveId can be associated with many codes (1:N batch reservation)

### Time Constraints
- Reserved date must be within last 24 hours to be considered "reserved"
- Assigned date, once set, never changes
- Saved date updates on every upsert operation

### Uniqueness Constraints
- Code value must be unique within a campaign (enforced by composite primary key)
- Code value can be duplicated across different campaigns
- reserveId is unique per reservation batch but shared across codes in that batch
