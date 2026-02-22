# Domain Concepts - export-service

## Core Entities

| Entity | Description |
|--------|-------------|
| **Export** | A record representing a data export job with status, metadata, and S3 location. Tracks lifecycle from PENDING → TRIGGERED → FINISHED/FAILED/EXPIRED |
| **Campaign** | A Verified Fan presale/registration campaign that generates entries and data to export |
| **Entry** | A single fan registration/entry in a campaign, containing user info, market, codes, and opt-ins |
| **Market** | A geographical/ticketing market within a campaign (e.g., "New York Metro Area") |
| **Code** | An access code assigned to verified fans for presale ticket purchasing |
| **Code Assignment** | The relationship between a code and an entry (who got which code) |
| **Scoring** | A record of fan verification scoring results (selected/unselected, priority, etc.) |
| **User** | A Verified Fan user account with profile data (name, email, phone, preferences) |
| **Waitlist** | Unselected fans from scoring who did not receive codes but may be eligible for follow-ups |
| **SMS Wave** | A scheduled batch of SMS messages to fans, tracked to avoid duplicate communications |
| **Locale** | Language/country identifier for regional data (e.g., en-US, en-GB, fr-CA) |

## Business Rules

### Export Lifecycle Rules
- **BR-001**: Exports transition through exactly one path: PENDING → TRIGGERED → (FINISHED | FAILED | EXPIRED)
- **BR-002**: Only one export can have TRIGGERED status at any time (single-threaded queue processing)
- **BR-003**: Duplicate exports (same campaignId + exportType + dateKey + status PENDING/TRIGGERED) return existing export instead of creating new one
- **BR-004**: Exports TRIGGERED for longer than timeoutMillis are automatically marked EXPIRED
- **BR-005**: FINISHED exports include: S3 key, row count, completion timestamp, metadata

### Export Type Rules
- **BR-006**: exportType must be one of: entries, codes, scoring, codeAssignments, artistOptIn, artistSmsOptIn, livenationOptIn, verifiedEntries, codeWaves, fanlist, waitlist, reminderEmail, reminderEmailSample, autoReminderEmail, promoterEmailOptIn
- **BR-007**: Scoring exports use bucket-owner-full-control ACL; all other types use private ACL
- **BR-008**: CCPA deletions skip these export types: VERIFIED_ENTRIES, SCORING, AUTO_REMINDER_EMAIL

### Data Extraction Rules
- **BR-009**: Entry exports require at least one market configured for the campaign (fail with NoMarketsFound if none)
- **BR-010**: Entry exports with `includeAllMarkets=true` write additional rows for users in multiple markets
- **BR-011**: Waitlist exports exclude member IDs found in any scheduled SMS waves for the campaign
- **BR-012**: Reminder email exports segment by country-to-region mapping: US/CA/MX → NA, GB/IE → UK
- **BR-013**: Opt-in exports (artistOptIn, livenationOptIn) filter entries by opt-in type and exclude opted-out users

### Locale/Region Rules
- **BR-014**: Locale transformation for SFMC compatibility: en-mx → en-us, en-uk → en-gb, en-nz → en-au, etc.
- **BR-015**: Regional SFMC MIDs vary by region: NA=7222895, UK=1314420, DE=1347780, AU=1341602, etc.
- **BR-016**: SFMC file prefixes by region: NA="Ticketmaster/7222895/TMDemandMgmt/DM_ArtistPresale_V03", LNE="Livenation/518008883/..."

### Permission Rules
- **BR-017**: All export endpoints require REPORT permission for the campaign
- **BR-018**: CCPA deletion requires Supreme user privilege
- **BR-019**: Export download URLs include signed S3 URLs with expiration

### Processing Rules
- **BR-020**: Queue processor polls every pollingInterval (default: 1000ms)
- **BR-021**: Preliminary entry count is fetched before export processing (except disabled types)
- **BR-022**: CSV streaming uses PassThrough stream for memory efficiency
- **BR-023**: Reminder email exports segment CSVs at maxRowPerExportedFile (configurable limit)
- **BR-024**: Temporary files for reminder email exports are written to `/tmp/{locale}` and deleted after ZIP upload

## Terminology

| Term | Definition |
|------|------------|
| **ASU** | Artist Sign-Up - a type of Verified Fan campaign for artist presales |
| **CCPA** | California Consumer Privacy Act - data privacy regulation requiring deletion capabilities |
| **SFMC** | Salesforce Marketing Cloud - email marketing platform consuming reminder email exports |
| **MID** | Marketing Cloud ID - SFMC identifier for business unit/region |
| **Queue Processor** | Background job that polls for PENDING exports and processes them one at a time |
| **dateKey** | Optional filter for exports by date (used to segment exports by time period) |
| **correlation** | Request tracking ID for tracing exports across systems |
| **token** | JWT authentication token for API requests |
| **requesterUserId** | ID of user who requested the export |
| **PassThrough Stream** | Node.js stream that pipes data from MongoDB directly to S3 without buffering full dataset in memory |
| **rowFormatter** | Component that formats MongoDB documents as CSV rows per export type |
| **CSV Writer** | Component that writes formatted rows to CSV file with headers |
| **Segmented CSV Writer** | Special writer that splits CSVs into multiple files at row limit |
| **Market Map** | Index of campaign markets by ID for fast lookup during export |
| **Opt-In Type** | Type of marketing consent: allowMarketing (artist), allowLiveNation, allowPromoter, allowSms |
| **Scoring Bucket** | S3 bucket for verified entry scoring data (vfScoringS3) |
| **Export Bucket** | Default S3 bucket for most exports (exportsS3) |
| **SFMC Bucket** | S3 bucket for Salesforce Marketing Cloud automation imports (sfmcS3) |
| **Athena Service** | Service for querying exports via AWS Athena (future capability) |
| **Promoter Zipper** | Utility that packages exports for promoter consumption |
| **Additional Market Rows** | Extra CSV rows for users who entered multiple markets in a campaign |
| **Unselected Scoring** | Fans who did not meet selection criteria in verification scoring |
| **Preliminary Count** | Pre-export count of entries to estimate export size |
| **Scrubbed S3 Bucket** | S3 bucket containing cleaned/verified scoring data |

## Data Models

### Export Document Schema
```javascript
{
  _id: ObjectId,
  campaignId: String,           // Campaign this export belongs to
  campaignName: String,          // Campaign name for filename generation
  exportType: String,            // One of EXPORT_TYPE enum values
  status: String,                // PENDING | TRIGGERED | FINISHED | FAILED | EXPIRED
  requesterUserId: String,       // User who requested export
  correlation: String,           // Request tracking ID
  token: String,                 // JWT for authenticated operations
  dateKey: String,               // Optional date filter for segmented exports
  includeAllMarkets: Boolean,    // Whether to export additional market rows
  date: {
    created: Date,               // When export was queued
    triggered: Date,             // When export processing started
    finished: Date,              // When export completed successfully
    failed: Date,                // When export failed
    expired: Date                // When export timed out
  },
  key: String,                   // S3 object key for completed export
  count: Number,                 // Number of rows exported
  meta: Object,                  // Additional metadata (e.g., file count in ZIP)
  error: {                       // Present if status=FAILED
    message: String,
    payload: Object,
    stack: String
  }
}
```

### Entry Document (Simplified)
```javascript
{
  _id: ObjectId,
  campaignId: String,
  userId: String,
  marketId: String,
  localeId: String,
  codes: [String],               // Access codes assigned to this entry
  optIns: {
    allowMarketing: Boolean,
    allowLiveNation: Boolean,
    allowPromoter: Boolean,
    allowSms: Boolean
  },
  phoneNumber: String,
  phoneConfirmed: Boolean,
  additionalMarkets: [String],   // Other markets user entered
  user: {                        // Embedded user data
    firstName: String,
    lastName: String,
    email: String,
    ...
  }
}
```

### Scoring Document
```javascript
{
  _id: ObjectId,
  campaignId: String,
  memberId: String,              // User ID
  selected: Boolean,             // Whether fan was selected for codes
  score: Number,                 // Verification score
  locale: String,
  market: String,
  ...
}
```

### Export Status Transitions
```
PENDING ──────────────────────────────────────┐
   │                                            │
   │ (Queue processor picks up)                 │
   ↓                                            │
TRIGGERED ─────────────────────────────────────┤
   │                      │                     │
   │ (Success)            │ (Timeout)           │ (Error)
   ↓                      ↓                     ↓
FINISHED              EXPIRED               FAILED
```

### S3 Bucket Routing by Export Type
```
EXPORT_TYPE          →  S3 BUCKET
──────────────────────  ─────────────
entries              →  exportsS3
codes                →  exportsS3
scoring              →  scoringS3
codeAssignments      →  exportsS3
artistOptIn          →  exportsS3
artistSmsOptIn       →  exportsS3
livenationOptIn      →  exportsS3
verifiedEntries      →  vfScoringS3
codeWaves            →  vfScoringS3
fanlist              →  exportsS3
waitlist             →  exportsS3
reminderEmail        →  exportsS3
reminderEmailSample  →  exportsS3
autoReminderEmail    →  sfmcS3
promoterEmailOptIn   →  exportsS3
```

### Regional Mapping for Reminder Emails
```
COUNTRY CODE  →  SFMC REGION  →  SFMC MID
──────────────   ────────────    ─────────
US            →  NA           →  7222895
CA            →  NA           →  7222895
MX            →  NA           →  523000091
GB            →  UK           →  1314420
IE            →  UK           →  1362441
DE            →  (Default NA) →  1347780
AU            →  (Default NA) →  1341602
...
```

### Export Type Row Formatters
Each export type has a specific row formatter that defines:
- **Column headers**: CSV column names
- **Field mapping**: How to extract/transform data from Entry/Scoring documents
- **File extension**: .csv or .zip
- **Additional processing**: Multi-market rows, locale transformation, filtering

Example formatter types:
- `entries` - Full entry data with user, market, codes
- `scoring` - Scoring results with selection status
- `codeAssignments` - Code-to-entry mappings
- `artistOptIn` - Filtered entries with artist marketing consent
- `reminderEmail` - Segmented by region with SFMC-compatible format
- `waitlist` - Unselected scoring records

## Relationships

```
Campaign (1) ──< (N) Markets
Campaign (1) ──< (N) Entries
Campaign (1) ──< (N) Exports
Campaign (1) ──< (N) Scoring Records
Entry (N) ──> (1) User
Entry (N) ──> (1) Market
Entry (1) ──< (N) Codes
Scoring (N) ──> (1) User (via memberId)
Export (1) ──> (1) S3 Object (via key)
Waitlist Query ──> (excludes) SMS Waves
Reminder Email Export ──> (segments by) Locale/Region
```
