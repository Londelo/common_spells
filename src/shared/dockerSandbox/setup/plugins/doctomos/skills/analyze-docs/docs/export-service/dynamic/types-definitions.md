# Type Definitions - export-service

## Overview

This service is a **JavaScript-based Node.js service** that uses JSDoc type annotations for documentation. It does not use TypeScript, GraphQL schemas, or formal validation schemas (Joi/Yup/Zod). Type information is primarily derived from:

1. **JSDoc annotations** in middleware and core library files
2. **Function signatures** and parameter destructuring patterns
3. **Enum constants** defined in dedicated enum files
4. **Error factory functions** with structured return types

---

## Enums

### STATUS
**Category:** JavaScript Enum (Object)

**Source:** [/app/managers/exports/enums.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/enums.js:1)

```javascript
export const STATUS = {
  PENDING: 'PENDING',
  TRIGGERED: 'TRIGGERED',
  FINISHED: 'FINISHED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
};
```

**Usage:** Tracks the lifecycle state of export jobs.

**Used By:**
- Export manager functions for queuing and processing exports
- Database queries for finding exports by status
- Export status transitions

---

### EXPORT_TYPE
**Category:** JavaScript Enum (Object)

**Source:** [/app/managers/exports/enums.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/enums.js:9)

```javascript
export const EXPORT_TYPE = {
  ENTRIES: 'entries',
  CODES: 'codes',
  SCORING: 'scoring',
  CODE_ASSIGNMENTS: 'codeAssignments',
  ARTIST_OPT_IN: 'artistOptIn',
  ARTIST_SMS_OPT_IN: 'artistSmsOptIn',
  LIVENATION_OPT_IN: 'livenationOptIn',
  VERIFIED_ENTRIES: 'verifiedEntries',
  CODE_WAVES: 'codeWaves',
  FANLIST: 'fanlist',
  WAITLIST: 'waitlist',
  REMINDER_EMAIL: 'reminderEmail',
  REMINDER_EMAIL_SAMPLE: 'reminderEmailSample',
  AUTO_REMINDER_EMAIL: 'autoReminderEmail',
  PROMOTER_EMAIL_OPT_IN: 'promoterEmailOptIn'
};
```

**Usage:** Specifies the type of data export being generated.

**Used By:**
- API request body validation (POST `/campaigns/:campaignId/exports`)
- Export routing to specialized export functions
- Bucket type resolution for S3 storage
- File formatter selection

**Processing Categories:**
- **Processed exports** (stream-based CSV/TSV): `entries`, `codes`, `scoring`, `codeAssignments`, `artistOptIn`, `artistSmsOptIn`, `livenationOptIn`, `waitlist`
- **Non-processed exports** (specialized handling): `verifiedEntries`, `codeWaves`, `fanlist`, `reminderEmail`, `autoReminderEmail`, `promoterEmailOptIn`

---

### BUCKET_TYPE
**Category:** JavaScript Enum (Object) - S3 Bucket Mapping

**Source:** [/app/managers/exports/enums.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/enums.js:29)

```javascript
export const BUCKET_TYPE = {
  ENTRIES: 'exportsS3',
  CODES: 'exportsS3',
  SCORING: 'scoringS3',
  CODE_ASSIGNMENTS: 'exportsS3',
  ARTIST_OPT_IN: 'exportsS3',
  ARTIST_SMS_OPT_IN: 'exportsS3',
  LIVENATION_OPT_IN: 'exportsS3',
  VERIFIED_ENTRIES: 'vfScoringS3',
  CODE_WAVES: 'vfScoringS3',
  FANLIST: 'exportsS3',
  WAITLIST: 'exportsS3',
  REMINDER_EMAIL: 'exportsS3',
  REMINDER_EMAIL_SAMPLE: 'exportsS3',
  AUTO_REMINDER_EMAIL: 'sfmcS3',
  PROMOTER_EMAIL_OPT_IN: 'exportsS3'
};
```

**Usage:** Maps export types to S3 service bucket names for storage.

**Used By:**
- [resolveBucketByType](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/resolveBucketByType.js) - Determines which S3 bucket to use
- Export normalizer for generating signed URLs
- S3 service calls for upload/download operations

---

### ACL_TYPE
**Category:** JavaScript Enum (Object) - S3 ACL Permissions

**Source:** [/app/managers/exports/enums.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/enums.js:116)

```javascript
export const ACL_TYPE = {
  PRIVATE: 'private',
  OWNER_CONTROL: 'bucket-owner-full-control'
};
```

**Usage:** S3 access control list types for uploaded files.

**Used By:**
- Export manager when uploading files to S3
- `scoring` exports use `OWNER_CONTROL`, all others use `PRIVATE`

---

### DELIMETER
**Category:** JavaScript Enum (Object) - CSV/TSV Delimiters

**Source:** [/lib/RowFormatter/enums.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/enums.js:1)

```javascript
export const DELIMETER = {
  TAB: '\t',
  COMMA: ','
};
```

**Usage:** Defines field separators for CSV/TSV file generation.

**Used By:**
- Row formatters for entries, codes, scoring, etc.
- CsvWriter configuration

---

### EXTENSION
**Category:** JavaScript Enum (Object) - File Extensions

**Source:** [/lib/RowFormatter/enums.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/enums.js:6)

```javascript
export const EXTENSION = {
  TSV: 'tsv',
  CSV: 'csv',
  TXT: 'txt'
};
```

**Usage:** File extension types for different export formats.

**Used By:**
- Row formatters to specify output file type
- File naming utilities
- Content-Type header generation

---

### SFMCMIDByRegion
**Category:** JavaScript Enum (Object) - Salesforce Marketing Cloud IDs

**Source:** [/app/managers/exports/enums.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/enums.js:62)

```javascript
export const SFMCMIDByRegion = {
  NA: '7222895',
  LNE: '518008883',
  MX: '523000091',
  GB: '1314420',
  // ... (24 total regions)
};
```

**Usage:** Maps region codes to Salesforce Marketing Cloud Member IDs for email campaigns.

**Used By:**
- Auto reminder email export functions
- SFMC integration for sending presale reminder emails

---

### entryLocaleToSfmc
**Category:** JavaScript Enum (Object) - Locale Mapping

**Source:** [/app/managers/exports/enums.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/enums.js:93)

```javascript
export const entryLocaleToSfmc = {
  'en-mx': 'en-us',
  'en-uk': 'en-gb',
  'en-ie': 'en-gb',
  'en-nz': 'en-au',
  // ... (more locale mappings)
};
```

**Usage:** Transforms entry locales to SFMC-compatible locale codes.

**Used By:**
- Auto reminder email export
- Locale normalization for international markets

---

## Error Types

### Error Factory Functions
**Category:** Error Response Factories

**Source:** [/app/errors/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/errors/index.js)

All error functions return objects with this structure:

```javascript
{
  status: number,        // HTTP status code
  message: string,       // Human-readable error message
  payload: string        // Detailed error information
}
```

#### MissingPermissions

```javascript
export const MissingPermissions = ({ requiredActions }) => ({
  status: 401,
  message: 'Invalid user permissions.',
  payload: `Missing ${requiredActions.join(', ')} permissions.`
});
```

**Parameters:**
- `requiredActions` (array of strings) - List of missing permission actions

---

#### CampaignNotFound

```javascript
export const CampaignNotFound = ({ campaignId }) => ({
  status: 400,
  message: 'Campaign not found.',
  payload: `Campaign ${campaignId} not found.`
});
```

**Parameters:**
- `campaignId` (string) - Campaign identifier that wasn't found

---

#### PromotersNotFound

```javascript
export const PromotersNotFound = ({ promoterIds }) => ({
  status: 400,
  message: 'Promoters not found.',
  payload: `Promoters ${promoterIds.join(', ')} not found.`
});
```

**Parameters:**
- `promoterIds` (array of strings) - Promoter IDs that weren't found

---

#### ExportNotFound

```javascript
export const ExportNotFound = ({ exportId }) => ({
  status: 404,
  message: 'Export not found.',
  payload: `Export ${exportId} not found.`
});
```

**Parameters:**
- `exportId` (string) - Export identifier that wasn't found

---

#### InvalidExportType

```javascript
export const InvalidExportType = ({ exportType }) => ({
  status: 400,
  message: `Invalid export type: '${exportType}'.`,
  payload: 'The \'exportType\' value could not be resolved.'
});
```

**Parameters:**
- `exportType` (string) - Invalid export type value

---

#### InvalidDateKey / InvalidDateKeyType

```javascript
export const InvalidDateKey = ({ dateKey }) => ({
  status: 400,
  message: `Date key value, '${dateKey},' was invalid. The value must be a numeric string.`,
  payload: 'The \'dateKey\' value must be a numeric string.'
});

export const InvalidDateKeyType = ({ type }) => ({
  status: 400,
  message: `Date key type was invalid. Expected a numeric string, but received type: '${type}'.`,
  payload: 'The \'dateKey\' value must be a string.'
});
```

**Parameters:**
- `dateKey` (string) - Invalid date key value
- `type` (string) - Actual type received

---

#### DeleteFailed

```javascript
export const DeleteFailed = ({ message }) => ({
  status: 500,
  message: 'Received an error when attempting to delete exports.',
  payload: message
});
```

**Parameters:**
- `message` (string) - Error message from failed delete operation

---

## JSDoc-Annotated Types

### KoaContext
**Category:** JSDoc Type Reference

**Source:** [/lib/middlewares/validators/ValidatorMiddleware.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/middlewares/validators/ValidatorMiddleware.js:6)

**JSDoc:**
```javascript
/**
 * @param {function: KoaContext => boolean} predicate
 * @param {function: KoaContext => Error} errorFn
 */
```

**Description:** Koa framework context object containing request/response data.

**Common Properties (inferred from usage):**
- `ctx.request.body` - Request body object
- `ctx.params` - URL parameters
- `ctx.query` - Query string parameters
- `ctx.state` - State object for middleware communication

**Used By:**
- All middleware functions
- Router handlers
- Validator middleware

---

### ManagerContext
**Category:** JSDoc Type Reference

**Source:** [/lib/KoaCtxToManagerCtx.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/KoaCtxToManagerCtx.js:10-15)

**JSDoc:**
```javascript
/**
 * Creates a manager context from a koa context
 * @param {KoaContext} ctx
 * @param {Datastore} Datastore datastore to be instrumented
 * @param {Services} Services services to be instrumented
 * @returns {ManagerContext}
 */
```

**Structure (from implementation):**
```javascript
{
  correlation: Object,              // Correlation tracking object
  jwt: Object,                      // JWT token data
  datastore: Object,                // Instrumented datastore functions
  service: Object,                  // Instrumented service functions
  InstrumentedAsyncOperation: Function  // Async operation wrapper
}
```

**Used By:**
- All manager functions
- Export processing logic
- Datastore and service operations

---

### InstrumentedAsyncOperation Context
**Category:** JSDoc Type Reference

**Source:** [/lib/InstrumentedAsyncOperation.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/InstrumentedAsyncOperation.js:10-21)

**JSDoc:**
```javascript
/**
 * Instruments a given function as an async operation that a request does not wait for.
 * @param {string} operationName used as the operation name of the new trace
 * @param {function} fn function that implements the async operation to be performed
 * @returns {function(ManagerContext, ...*): Promise.<*>}
 */
```

**Structure (from implementation):**
```javascript
{
  correlation: Object,     // Correlation ID tracking
  jwt: Object,            // JWT token
  datastore: Function,    // Datastore factory
  service: Function       // Services factory
}
```

**Used By:**
- Background async operations
- Export processing tasks
- Operations that don't block HTTP responses

---

## Data Structure Types

### Export Object
**Category:** MongoDB Document Schema (inferred)

**Source:** [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:81-101), [/app/datastore/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/datastore/exports.js)

**Structure:**
```javascript
{
  _id: ObjectId,                    // MongoDB ObjectId
  campaignId: string,               // Campaign identifier
  campaignName: string,             // Campaign name
  date: {
    created: Date                   // Export creation timestamp
  },
  status: STATUS,                   // Export status (enum)
  requesterUserId: string,          // User who requested export
  exportType: EXPORT_TYPE,          // Type of export (enum)
  correlation: Object,              // Correlation tracking data
  token: string,                    // JWT token for authorization
  dateKey?: string,                 // Optional date key (for codeWaves)
  includeAllMarkets?: boolean,      // Optional flag for market inclusion
  key?: string,                     // S3 file key (after processing)
  count?: number,                   // Row count (after processing)
  env?: string                      // Environment identifier
}
```

**Normalized Response Shape (after stringifyObjectId):**
```javascript
{
  id: string,                       // Stringified ObjectId
  exportType: EXPORT_TYPE,
  campaignId: string,
  date: { created: Date },
  status: STATUS,
  requesterUserId: string,
  path?: string                     // Signed S3 URL (for single-file exports)
}
```

**Used By:**
- [queueExport](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:108) - Creates new export
- [findExportById](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:69) - Retrieves single export
- [findExportsByCampaignAndType](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:50) - Lists exports
- [exportAndSave](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js:165) - Processes export

---

### Entry Object (User Entry)
**Category:** MongoDB Document Schema (inferred from formatters)

**Source:** [/lib/RowFormatter/formatters/normalizeEntryRow.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/normalizeEntryRow.js)

**Structure:**
```javascript
{
  _id: Object,
  date: {
    created: Date,                  // Entry creation date
    phoneConfirmed?: Date           // Phone confirmation date (optional)
  },
  locale: string,                   // Locale code (e.g., 'en-US')
  fields: {
    email?: string,                 // Entry email
    phone?: string,                 // Entry phone
    first_name?: string,            // Entry first name
    last_name?: string,             // Entry last name
    [preferenceId: string]: any    // Dynamic preference values
  },
  origin: {
    ip: {
      address: string,              // IP address
      postalCode?: string,          // Postal code from IP
      latitude?: number,            // IP geolocation
      longitude?: number            // IP geolocation
    }
  },
  nudetect?: {
    score?: number,                 // Fraud detection score
    scoreBand?: string              // Score band classification
  },
  accountFanscore?: number,         // Universal fan score
  user?: Object                     // Reference to user object
}
```

**Used By:**
- Entry export formatters
- Scoring export formatters
- Reminder email formatters

---

### User Object
**Category:** MongoDB Document Schema (inferred from formatters)

**Source:** [/lib/RowFormatter/formatters/normalizeEntryRow.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/normalizeEntryRow.js)

**Structure:**
```javascript
{
  _id: Object,
  integrations: {
    ticketmaster: {
      id?: string,                  // TM user ID
      member_id?: string,           // TM member ID
      globalUserId?: string,        // Global user ID
      email?: string,               // User email
      phone?: string,               // User phone
      postalCode?: string,          // User postal code
      name: {
        first?: string,             // User first name
        last?: string               // User last name
      }
    }
  }
}
```

**Used By:**
- Entry export formatters
- User data normalization
- Contact information resolution

---

### Campaign Object
**Category:** MongoDB Document Schema (inferred)

**Source:** [/app/managers/exports/exportEntries.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportEntries.js:14)

**Structure:**
```javascript
{
  _id: ObjectId,                    // Campaign ID
  name: string,                     // Campaign name
  preferences?: Array<{             // Campaign-specific preferences
    id: string,                     // Preference ID
    type: string,                   // Preference type
    is_optional: boolean,           // Whether preference is optional
    label: Object                   // Locale-keyed labels
  }>,
  marketIds?: Array<string>         // Associated market IDs
}
```

**Used By:**
- Export managers for campaign lookup
- Preference column generation
- Campaign name in file naming

---

### Market Object
**Category:** MongoDB Document Schema (inferred)

**Source:** [/lib/RowFormatter/formatters/normalizeEntryRow.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/normalizeEntryRow.js:9-14)

**Structure:**
```javascript
{
  _id: ObjectId,                    // Market ID
  name: string,                     // Market name
  city?: string,                    // Market city
  state?: string,                   // Market state
  event?: {
    date?: Date,                    // Event date
    ids?: Array<string>             // Event IDs
  }
}
```

**Used By:**
- Entry export formatters
- Market selection display
- Event data inclusion

---

### RowFormatter Configuration
**Category:** Configuration Object

**Source:** [/lib/RowFormatter/formatters/entries.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/entries.js), [/lib/RowFormatter/formatters/scoring.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/formatters/scoring.js)

**Structure:**
```javascript
{
  makeRow: Function,                // Function to transform data to row
  fileExtension: EXTENSION,         // Output file extension
  delimiter: DELIMETER,             // Field delimiter
  includeHeaders: boolean,          // Whether to include header row
  useAdditionalMarketRows?: boolean,// Whether to write additional market rows
  filterEntries?: Function          // Optional entry filter function
}
```

**Variants:**
- **entries formatter**: TSV, includes headers, uses additional market rows, includes preference columns
- **scoring formatter**: TXT (TSV), includes headers, no additional market rows, includes nudata/fanscore
- **codes formatter**: CSV, includes headers
- **waitlist formatter**: CSV, includes headers
- **reminderEmail formatter**: CSV, includes headers

**Used By:**
- [RowFormatter factory](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/RowFormatter/index.js) - Selects formatter by type
- [CsvWriter](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/CsvWriter.js) - Configures CSV stream

---

### CsvWriter API
**Category:** Writer Interface

**Source:** [/app/managers/exports/CsvWriter.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/CsvWriter.js)

**Methods:**
```javascript
{
  write: async (params: Object) => Promise<void>,
  getRowCount: () => number,
  end: async () => Promise<void>
}
```

**Parameters (for write):**
```javascript
{
  user: Object,                     // User object
  entry: Object,                    // Entry object
  campaign: Object,                 // Campaign object
  market: Object,                   // Market object
  numericId?: number                // Optional numeric ID override
}
```

**Used By:**
- [exportEntries](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportEntries.js) - Writes entry rows
- [exportCodes](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/exportCodes.js) - Writes code rows
- Other export functions

---

## API Request/Response Types

### POST /campaigns/:campaignId/exports
**Category:** API Endpoint

**Source:** [/app/router/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js:37)

**Request:**
```javascript
// URL Parameters
{
  campaignId: string                // Campaign identifier
}

// Request Body
{
  exportType: EXPORT_TYPE,          // Type of export to create (required)
  dateKey?: string,                 // Date key (required for codeWaves)
  includeAllMarkets?: boolean       // Include all markets flag (optional)
}

// Headers
{
  Authorization: string             // JWT token (required)
}
```

**Response:**
```javascript
{
  id: string,                       // Export ID
  exportType: EXPORT_TYPE,
  campaignId: string,
  date: { created: Date },
  status: STATUS,                   // Will be 'PENDING' or 'TRIGGERED'
  requesterUserId: string
}
```

**Permissions Required:** `REPORT`

---

### GET /campaigns/:campaignId/exports/:exportId
**Category:** API Endpoint

**Source:** [/app/router/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js:55)

**Request:**
```javascript
// URL Parameters
{
  campaignId: string,               // Campaign identifier
  exportId: string                  // Export identifier
}

// Headers
{
  Authorization: string             // JWT token (required)
}
```

**Response:**
```javascript
{
  id: string,
  exportType: EXPORT_TYPE,
  campaignId: string,
  campaignName: string,
  date: { created: Date },
  status: STATUS,
  requesterUserId: string,
  path?: string,                    // Signed S3 URL (if finished)
  count?: number,                   // Row count (if finished)
  key?: string                      // S3 key (for multi-key exports)
}
```

**Permissions Required:** `REPORT`

---

### GET /campaigns/:campaignId/exports
**Category:** API Endpoint

**Source:** [/app/router/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js:68)

**Request:**
```javascript
// URL Parameters
{
  campaignId: string                // Campaign identifier
}

// Query Parameters
{
  exportType?: EXPORT_TYPE,         // Filter by export type (optional)
  sort?: string,                    // Sort field (optional)
  sortDir?: 'asc' | 'desc',        // Sort direction (optional)
  limit?: number,                   // Page size (optional)
  offset?: number                   // Page offset (optional)
}

// Headers
{
  Authorization: string             // JWT token (required)
}
```

**Response:**
```javascript
Array<{
  id: string,
  exportType: EXPORT_TYPE,
  campaignId: string,
  campaignName: string,
  date: { created: Date },
  status: STATUS,
  requesterUserId: string,
  path?: string,
  count?: number
}>
```

**Permissions Required:** `REPORT`

---

### DELETE /ccpa/users/:userId
**Category:** API Endpoint

**Source:** [/app/router/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/index.js:31)

**Request:**
```javascript
// URL Parameters
{
  userId: string                    // User identifier
}

// Headers
{
  Authorization: string             // JWT token (required, must be supreme user)
}
```

**Response:**
```javascript
{
  deletedCount: {
    exports: number,                // Number of export records deleted
    files: number                   // Number of S3 files deleted
  }
}
```

**Permissions Required:** Supreme user (checked via JWT)

**Notes:** Deletes all exports for campaigns associated with the user, excluding CCPA-ignored export types (`verifiedEntries`, `scoring`, `autoReminderEmail`).

---

## Type Dependency Graph

```
ManagerContext
  ├─ correlation (Object)
  ├─ jwt (Object)
  ├─ datastore
  │   ├─ exports (DataStore)
  │   ├─ campaigns (DataStore)
  │   ├─ markets (DataStore)
  │   ├─ entries (DataStore)
  │   └─ scoring (DataStore)
  ├─ service
  │   ├─ exportsS3 (S3Service)
  │   ├─ scoringS3 (S3Service)
  │   ├─ vfScoringS3 (S3Service)
  │   ├─ sfmcS3 (S3Service)
  │   └─ entries (EntriesService)
  └─ InstrumentedAsyncOperation (Function)

Export Object
  ├─ _id (ObjectId)
  ├─ campaignId (string)
  ├─ status (STATUS enum)
  ├─ exportType (EXPORT_TYPE enum)
  └─ date
      └─ created (Date)
     ↓ transforms to ↓
Normalized Export Response
  ├─ id (string)
  ├─ exportType (EXPORT_TYPE enum)
  ├─ campaignId (string)
  ├─ status (STATUS enum)
  └─ path (string - signed URL)

Entry Object
  ├─ fields (Object)
  │   ├─ email (string)
  │   ├─ phone (string)
  │   └─ [dynamic preferences]
  ├─ date
  │   └─ created (Date)
  ├─ origin
  │   └─ ip (Object)
  ├─ nudetect (Object - optional)
  └─ user (User Object)

User Object
  └─ integrations
      └─ ticketmaster
          ├─ globalUserId (string)
          ├─ email (string)
          ├─ phone (string)
          └─ name
              ├─ first (string)
              └─ last (string)

RowFormatter Configuration
  ├─ makeRow (Function)
  │   └─ receives: { user, entry, campaign, market }
  │   └─ returns: Object (row data)
  ├─ fileExtension (EXTENSION enum)
  ├─ delimiter (DELIMETER enum)
  └─ includeHeaders (boolean)

CsvWriter
  ├─ write (Function)
  │   └─ receives: { user, entry, campaign, market }
  ├─ getRowCount (Function)
  │   └─ returns: number
  └─ end (Function)
      └─ returns: Promise<void>
```

---

## Common Patterns

### Pattern: Export Request → Queue → Process → S3

**Description:** The service queues export requests, processes them asynchronously, and uploads results to S3.

**Flow:**
```
1. POST /campaigns/:campaignId/exports { exportType, dateKey? }
   ↓
2. queueExport() creates Export object with status='PENDING'
   ↓
3. Background queue processor (processQueue) finds oldest PENDING export
   ↓
4. exportAndSave() creates stream pipeline:
   - RowFormatter.makeRow() → transforms each entry
   - CsvWriter → formats as CSV/TSV
   - PassThroughStream → pipes to S3
   - S3 uploadFromStream() → stores file
   ↓
5. Export status updated to 'FINISHED' with key and count
   ↓
6. GET /campaigns/:campaignId/exports/:exportId returns signed S3 URL
```

**Found In:**
- [/app/router/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js)
- [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js)

---

### Pattern: Context Transformation (Koa → Manager)

**Description:** Converts Koa HTTP context to manager context with instrumented services.

**Example Usage:**
```javascript
const koaCtxToManagerCtx = KoaCtxToManagerCtx({ Datastore, Services });

router.post('/:campaignId/exports',
  withManagedContext(
    (ctx, managerCtx) => exportManager.queueExport(managerCtx, { ... })
  )
);
```

**Structure:**
```
KoaContext { request, response, params, query, state }
   ↓ KoaCtxToManagerCtx
ManagerContext { correlation, jwt, datastore, service, InstrumentedAsyncOperation }
```

**Found In:**
- [/lib/KoaCtxToManagerCtx.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/lib/KoaCtxToManagerCtx.js)
- [/app/router/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/router/exports.js)

---

### Pattern: Error Factory Pattern

**Description:** Centralized error creation with consistent structure.

**Example Usage:**
```javascript
import { error } from '@verifiedfan/lib';
import { CampaignNotFound, InvalidExportType } from '../../errors';

if (!campaign) {
  throw error(CampaignNotFound({ campaignId }));
}

if (!exportByType[exportType]) {
  throw error(InvalidExportType({ exportType }));
}
```

**Structure:**
```
ErrorFactory({ params }) → { status, message, payload }
   ↓ wrapped by error()
Thrown Error with HTTP status and structured message
```

**Found In:**
- [/app/errors/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/errors/index.js)
- [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js)

---

### Pattern: Bucket Type Resolution

**Description:** Maps export type to appropriate S3 bucket name.

**Example Usage:**
```javascript
import resolveBucketByType from './resolveBucketByType';

const bucketType = resolveBucketByType(exportType);
// Returns: 'exportsS3', 'scoringS3', 'vfScoringS3', or 'sfmcS3'

const signedUrl = await managerCtx.service[bucketType].generateSignedUrl({ fileKey, ttlSecs });
```

**Mapping:**
- Most exports → `exportsS3`
- `scoring` → `scoringS3`
- `verifiedEntries`, `codeWaves` → `vfScoringS3`
- `autoReminderEmail` → `sfmcS3`

**Found In:**
- [/app/managers/exports/resolveBucketByType.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/resolveBucketByType.js)
- [/app/managers/exports/normalizers.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/normalizers.js)

---

### Pattern: Datastore Query with Ramda Pipelines

**Description:** Uses Ramda's functional composition for datastore operations.

**Example Usage:**
```javascript
return R.pipeP(
  exportsDataStore.findByCampaignIdAndType,
  R.defaultTo([]),
  R.map(exportObj => normalizeExport(managerCtx, exportObj)),
  promises => Promise.all(promises)
)({ campaignId, exportType });
```

**Structure:**
```
Input params
  ↓ async datastore query
  ↓ default to empty array if null
  ↓ map each result through normalizer
  ↓ await all promises
Output array
```

**Found In:**
- [/app/managers/exports/index.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/managers/exports/index.js)
- [/app/datastore/exports.js](/Users/Brodie.Balser/Documents/TM/titan/export-service/app/datastore/exports.js)
