# Type Definitions - code-service

## JavaScript Enums and Constants

### CODE_TYPE
**Category:** Enum (Constant Object)

```javascript
const CODE_TYPE = {
  TM: 'tm',
  EXTERNAL: 'external'
};
```

**Source:** [enums.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/enums.js:3)

**Usage:**
- Defines valid code type identifiers
- Used for validation in `uploadCodes`, `countCodes`, `reserveCodes` functions
- Exported as `typeSet` for validation checks

**Values:**
- `TM` - Ticketmaster-issued codes (value: 'tm')
- `EXTERNAL` - Externally sourced codes (value: 'external')

**Validation Set:** `typeSet` - Set containing all valid type values

---

### STATUS
**Category:** Enum (Constant Object)

```javascript
const STATUS = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  RESERVED: 'reserved'
};
```

**Source:** [enums.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/enums.js:10)

**Usage:**
- Defines valid code status states
- Maps to MongoDB query logic in `STATUS_QUERY`
- Used for filtering codes by state

**Values:**
- `AVAILABLE` - Code is available for use (value: 'available')
  - Query: No reserved date OR reserved date expired, AND no assigned date
- `ASSIGNED` - Code has been permanently assigned (value: 'assigned')
  - Query: Has assigned date
- `RESERVED` - Code is temporarily reserved (value: 'reserved')
  - Query: Has reserved date not expired, AND no assigned date

**Validation Set:** `statusSet` - Set containing all valid status values

**State Transitions:**
```
AVAILABLE → RESERVED → ASSIGNED
    ↑           ↓
    └───────────┘ (release)
```

---

## MongoDB Document Schemas

### Code Document
**Category:** MongoDB Document Schema

```javascript
{
  _id: {
    campaign_id: String,  // Campaign identifier
    code: String          // The actual presale code
  },
  type: String,           // 'tm' | 'external' (CODE_TYPE enum)
  date: {
    saved: Date,          // When code was uploaded
    reserved: Date,       // When code was reserved (optional)
    assigned: Date        // When code was assigned (optional)
  },
  reserveId: String       // UUID for reservation tracking (optional)
}
```

**Source:** Inferred from [codes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/datastore/codes.js)

**Collection:** `codes`

**Compound ID Structure:**
- `_id.campaign_id` - Campaign identifier (string)
- `_id.code` - The presale code value (string)

**Fields:**
- `type` - Code type from CODE_TYPE enum (required)
- `date.saved` - Timestamp when code was uploaded to system (required)
- `date.reserved` - Timestamp when code was reserved (optional, expires after 24h)
- `date.assigned` - Timestamp when code was permanently assigned (optional)
- `reserveId` - UUID tracking which reservation batch this code belongs to (optional)

**Indexes:**
- Primary index on `_id` (compound: campaign_id + code)
- Queries use `_id.campaign_id`, `type`, `date.reserved`, `date.assigned`

**Status Determination:**
- **Available:** No `date.reserved` OR `date.reserved` <= yesterday, AND no `date.assigned`
- **Reserved:** Has `date.reserved` > yesterday, AND no `date.assigned`
- **Assigned:** Has `date.assigned`

---

## Error Response Objects

### Error Response Structure
**Category:** Error Object Type

```javascript
{
  status: Number,      // HTTP status code
  message: String,     // Human-readable error message
  payload: String,     // Machine-readable error identifier
  code?: String,       // Optional error code
  field?: String       // Optional field identifier
}
```

**Source:** [error/index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/lib/error/index.js:9)

**Fields:**
- `status` - HTTP status code (400, 401, 403, 404, etc.)
- `message` - Detailed error message for humans
- `payload` - Short error identifier for client-side handling
- `code` - Optional error code for categorization
- `field` - Optional field name that caused the error

**Error Definitions:**

#### Authentication Errors
Source: [authErrors.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/errors/authErrors.js)

- **notLoggedIn** - HTTP 401, requires JWT authentication
- **supremeUserRequired** - HTTP 403, requires supreme user privileges

#### Code Management Errors
Source: [errors.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/errors.js)

- **invalidFileKey** - HTTP 404, file key doesn't match regex pattern
- **InvalidType({ type })** - HTTP 400, code type not 'tm' or 'external'
- **missingCodeReserveParams** - HTTP 400, missing 'count' or 'type'
- **invalidCount** - HTTP 400, count < 1
- **InvalidStatus({ status })** - HTTP 400, status not valid enum value
- **missingType** - HTTP 400, 'type' parameter required
- **missingCodes** - HTTP 400, 'codes' property required
- **emptyCodes** - HTTP 400, 'codes' array is empty
- **invalidCodesProp** - HTTP 400, 'codes' must be an array

---

## Regular Expression Patterns

### uploadFileKeyRegex
**Category:** Regular Expression Pattern

```javascript
const uploadFileKeyRegex = /codes\/(?<campaignId>.+)\/(?<type>.+)\/.+/;
```

**Source:** [index.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/index.js:20)

**Purpose:** Parses S3 file keys to extract campaign ID and code type

**Capture Groups:**
- `campaignId` - Campaign identifier from path segment
- `type` - Code type ('tm' or 'external') from path segment

**Expected Format:** `codes/{campaignId}/{type}/{filename}.csv`

**Examples:**
- `codes/taylor-swift-2024/tm/20200704005334.csv`
  - campaignId: `taylor-swift-2024`
  - type: `tm`
- `codes/abc123/external/import-2024.csv`
  - campaignId: `abc123`
  - type: `external`

**Validation:** Used in `uploadCodes` function to validate S3 file keys before processing

---

## Type Dependency Graph

```
Campaign ID (String)
  └─ Code Document (MongoDB)
      ├─ _id (Compound)
      │   ├─ campaign_id: String
      │   └─ code: String
      ├─ type: CODE_TYPE
      │   ├─ TM
      │   └─ EXTERNAL
      ├─ date (Object)
      │   ├─ saved: Date
      │   ├─ reserved?: Date
      │   └─ assigned?: Date
      └─ reserveId?: String (UUID)

Status Query Logic
  └─ STATUS
      ├─ AVAILABLE → Query: { no reserved OR reserved expired } AND no assigned
      ├─ RESERVED → Query: reserved exists AND not expired AND no assigned
      └─ ASSIGNED → Query: assigned exists

Error Responses
  ├─ Authentication Errors
  │   ├─ notLoggedIn (401)
  │   └─ supremeUserRequired (403)
  └─ Code Management Errors
      ├─ invalidFileKey (404)
      ├─ InvalidType (400)
      ├─ missingCodeReserveParams (400)
      ├─ invalidCount (400)
      ├─ InvalidStatus (400)
      ├─ missingType (400)
      ├─ missingCodes (400)
      ├─ emptyCodes (400)
      └─ invalidCodesProp (400)
```

---

## Configuration Types

### Manager Context (ManagerContext)
**Category:** Context Object Type

```javascript
{
  span: Object,                           // OpenTracing span
  correlation: Object,                    // Correlation ID tracking
  jwt: Object,                            // JWT token data
  datastore: {                            // Database operations
    codes: CodesDatastore
  },
  service: {                              // External services
    scoringBucket: S3Client
  },
  InstrumentedAsyncOperation: Function    // Async operation wrapper
}
```

**Source:** [KoaCtxToManagerCtx.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/lib/KoaCtxToManagerCtx.js:22)

**Purpose:** Provides all necessary context for manager function operations

**Fields:**
- `span` - OpenTracing span for distributed tracing
- `correlation` - Correlation ID object for request tracking
- `jwt` - Decoded JWT token containing user info
- `datastore.codes` - Database operations for codes collection
- `service.scoringBucket` - S3 client for file operations
- `InstrumentedAsyncOperation` - Factory for creating instrumented async operations

**Created From:** Koa context via `KoaCtxToManagerCtx` factory

**Used By:**
- All manager functions (uploadCodes, countCodes, reserveCodes, etc.)
- Datastore operations
- Service calls

---

## Constants

### Batch Processing
**Category:** Configuration Constants

```javascript
const batchSize = 50000;  // readAndStoreCodes.js
const MAX_RETRIES = 2;     // findAndReserveCodes.js
```

**Purpose:**
- `batchSize` - Number of codes processed in a single MongoDB upsert batch (50,000)
- `MAX_RETRIES` - Maximum retry attempts for code reservation on conflict (2)

**Usage:**
- `batchSize` - Controls memory usage and MongoDB performance during CSV imports
- `MAX_RETRIES` - Prevents infinite loops when concurrent reservations conflict

---

## CSV Parsing Configuration

### parseOptions
**Category:** CSV Parser Configuration

```javascript
const parseOptions = {
  delimiter: ',',
  on_record: R.propOr(null, 0),          // Extract first column
  skip_empty_lines: true,
  skip_lines_with_empty_values: true,
  trim: true
};
```

**Source:** [readAndStoreCodes.js](/Users/Brodie.Balser/Documents/TM/titan/code-service/app/managers/codes/readAndStoreCodes.js:10)

**Purpose:** Configuration for parsing CSV files containing presale codes

**Fields:**
- `delimiter` - Column separator (comma)
- `on_record` - Transform function to extract first column only
- `skip_empty_lines` - Ignore blank lines
- `skip_lines_with_empty_values` - Ignore lines with empty values
- `trim` - Remove whitespace from values

**Expected CSV Format:**
```csv
CODE1
CODE2
CODE3
```

**Notes:**
- Only first column is used
- Additional columns are ignored
- Whitespace is automatically trimmed
- Empty lines are skipped

---

## Response Types

### Upload Response
**Category:** Response Object Type

```javascript
{
  count: {
    in: Number,        // Number of codes in CSV
    inserted: Number,  // Number of new codes inserted
    updated: Number    // Number of existing codes updated
  }
}
```

**Source:** Returned by `uploadCodes` via `readAndStoreCodes`

**Purpose:** Reports results of CSV code upload operation

---

### Count Response
**Category:** Response Object Type

```javascript
{
  available: Number,  // Count of available codes (optional)
  reserved: Number,   // Count of reserved codes (optional)
  assigned: Number    // Count of assigned codes (optional)
}
```

**Source:** Returned by `countCodes` via `findCodesCounts`

**Purpose:** Reports code counts by status for a campaign and type

**Dynamic Keys:** Only requested status values are included in response

---

### Reserve Response
**Category:** Response Object Type

```javascript
String[]  // Array of reserved code strings
```

**Source:** Returned by `reserveCodes` via `findAndReserveCodes`

**Purpose:** Returns array of successfully reserved codes

**Example:**
```javascript
[
  "CODE_ABC123",
  "CODE_XYZ789",
  "CODE_DEF456"
]
```

---

### Update Response
**Category:** Response Object Type

```javascript
{
  count: {
    in: Number,       // Number of codes in request
    updated: Number   // Number of codes actually updated
  }
}
```

**Source:** Returned by `assignCodes` and `releaseCodes`

**Purpose:** Reports results of batch assign/release operations

**Note:** `updated` may be less than `in` if some codes were not found or already in target state
