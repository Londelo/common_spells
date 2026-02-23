# Use Cases & Workflows - export-service

## Primary Use Cases

### Use Case 1: Campaign Administrator Exports Fan Entries

**Actor**: Campaign administrator with REPORT permission

**Goal**: Export all fan entries for a campaign to analyze demographics, prepare presale codes, or share with ticketing partners

**Preconditions**:
- Campaign exists with at least one market configured
- User has REPORT permission for the campaign
- Entries have been collected from fans

**Main Flow**:
1. Admin sends POST request to `/campaigns/:campaignId/exports` with exportType "entries"
2. System validates campaign exists and user has REPORT permission
3. System checks for existing PENDING/TRIGGERED exports of same type; returns existing if found
4. System creates export record with status PENDING and returns export ID
5. Queue processor picks up PENDING export, marks it TRIGGERED
6. System counts total entries and updates export record
7. System streams entries from MongoDB, formats as CSV rows
8. System uploads CSV to exportsS3 bucket with campaign name in filename
9. System marks export as FINISHED with S3 key and row count
10. Admin polls GET `/campaigns/:campaignId/exports/:exportId` until status is FINISHED
11. Admin retrieves S3 download URL from export metadata

**Postconditions**:
- CSV file exists in S3 with all campaign entries
- Export record shows FINISHED status with S3 key, row count, completion timestamp

**Business Rules Applied**:
- Duplicate prevention: no duplicate PENDING/TRIGGERED exports for same campaign/type
- Permission enforcement: REPORT permission required
- Single-threaded processing: only one export TRIGGERED at a time

---

### Use Case 2: Marketing Team Exports Reminder Email Data for International Campaign

**Actor**: Marketing operations team preparing Salesforce Marketing Cloud (SFMC) email campaign

**Goal**: Export segmented reminder email data by region and locale for multi-country artist presale campaign

**Preconditions**:
- Campaign configured with multiple locales (e.g., en-US, en-GB, fr-CA)
- Scoring data exists for verified fans
- Markets configured for each country

**Main Flow**:
1. Marketing team requests reminderEmail export via API
2. System queues export as PENDING
3. Queue processor triggers export job
4. System loads campaign and identifies locales/countries
5. System maps country codes to regions (US/CA → NA, GB → UK)
6. System creates temporary CSV writers for each region in `/tmp/{locale}`
7. System queries scoring data and formats reminder email rows per region
8. System writes segmented CSV files (max rows per file: maxRowPerExportedFile)
9. System creates ZIP archive with folder structure: NA/, UK/ containing regional CSVs
10. System uploads ZIP to exportsS3 with filename "Combined - {campaignName} ASU - Reminder Email Data.zip"
11. System cleans up temporary files and marks export FINISHED

**Postconditions**:
- ZIP file in S3 contains regional folders with segmented CSV files
- Each CSV follows SFMC import format requirements
- Export metadata includes total row count and S3 key

**Business Rules Applied**:
- Locale transformation: en-uk → en-gb, en-mx → en-us per SFMC requirements
- Regional grouping: US/CA/Mexico → NA region, UK/Ireland → UK region
- File segmentation: splits large exports into multiple files per region

---

### Use Case 3: Ticketing Platform Exports Access Codes

**Actor**: Ticketing integration system

**Goal**: Retrieve presale access codes assigned to verified fans for ticketing system ingestion

**Preconditions**:
- Campaign has codes generated and assigned to entries
- Integration system has REPORT permission

**Main Flow**:
1. Integration system requests "codes" export
2. System queues export
3. System queries all code records for campaign
4. System formats codes as CSV (code, metadata)
5. System uploads to exportsS3 bucket
6. Integration system polls for completion
7. Integration system downloads CSV from S3
8. Integration system imports codes into ticketing platform

**Postconditions**:
- All campaign codes exported to CSV
- Ticketing platform has current code list for presale validation

**Business Rules Applied**:
- Private ACL: codes are sensitive, limited to authorized systems
- De-duplication: prevents duplicate code exports

---

### Use Case 4: Admin Exports Waitlist for Follow-Up Campaign

**Actor**: Campaign manager planning follow-up event

**Goal**: Export fans who were not selected in initial presale to invite them to general sale

**Preconditions**:
- Campaign has scoring data (selected and unselected fans)
- SMS waves may have been scheduled for some unselected fans

**Main Flow**:
1. Admin requests "waitlist" export
2. System queries vfScoringS3 for existing scheduled SMS wave keys
3. System extracts member IDs from scheduled waves to exclude them
4. System queries scoring collection for unselected fans NOT in exclude list
5. System streams unselected scoring records as CSV rows
6. System uploads waitlist CSV to exportsS3
7. System marks export FINISHED with row count

**Postconditions**:
- CSV contains unselected fans not already scheduled for SMS
- Admin can use list for retargeting campaigns

**Business Rules Applied**:
- Wave exclusion: fans already scheduled for SMS waves are excluded
- Large ID list warning: logs warning if exclude list exceeds 1M IDs

---

### Use Case 5: Compliance Team Processes CCPA Deletion Request

**Actor**: Compliance system handling data subject rights request

**Goal**: Delete all export files containing user's personal data across all campaigns

**Preconditions**:
- User has requested CCPA data deletion
- Request authenticated by Supreme user token

**Main Flow**:
1. Compliance system sends DELETE request to `/ccpa/users/:userId`
2. System validates requester is Supreme user
3. System queries exports collection for all exports containing userId
4. System filters out exempt export types (VERIFIED_ENTRIES, SCORING, AUTO_REMINDER_EMAIL)
5. System iterates through each export, deleting S3 objects using export keys
6. System updates export records to mark as deleted
7. System returns summary of deleted exports

**Postconditions**:
- All user export files removed from S3 (except exempt types)
- Export metadata updated to reflect deletion

**Business Rules Applied**:
- Supreme user required for CCPA operations
- Certain export types exempt from deletion per business policy
- Deletes actual S3 objects, not just metadata

---

### Use Case 6: System Expires Stale Export Job

**Actor**: Queue processor (automated)

**Goal**: Prevent hung exports from blocking queue indefinitely

**Preconditions**:
- Export has been TRIGGERED for longer than timeoutMillis
- Export has not completed or failed

**Main Flow**:
1. Queue processor polls for TRIGGERED exports
2. System finds export TRIGGERED > timeoutMillis ago
3. System marks export as EXPIRED with timestamp
4. System updates export record in database
5. Queue processor moves to next PENDING export

**Postconditions**:
- Stale export marked EXPIRED
- Queue unblocked for next job

**Business Rules Applied**:
- Timeout enforcement: prevents indefinite queue blocking
- Status transition: TRIGGERED → EXPIRED after timeout

## User Journey Map

**Campaign Admin Journey:**
Campaign launched → Entries collected → Admin requests export → Waits for processing → Downloads CSV from S3 → Shares with partners/systems → Uses data for presale/marketing

**Marketing Team Journey:**
Multi-country campaign planned → Scoring completed → Request reminder email export → System segments by region → Download ZIP → Upload regional CSVs to SFMC → Schedule email sends

**Ticketing System Journey:**
Presale approaching → Request code export → Poll for completion → Download codes → Import to ticketing platform → Validate codes during sale

## Key Workflows

### Workflow 1: Standard Export Request-Process-Deliver

1. **API Request**: User/system POSTs export request with campaignId and exportType
2. **Queue Creation**: System creates PENDING export record, returns export ID immediately
3. **Queue Processing**: Background processor picks oldest PENDING export
4. **Status Update**: Marks export TRIGGERED, counts preliminary entries
5. **Data Extraction**: Queries MongoDB for campaign data (entries, codes, scoring, etc.)
6. **Transformation**: Formats data per export type (CSV rows, regional segmentation, locale mapping)
7. **Upload**: Streams formatted data to appropriate S3 bucket
8. **Completion**: Marks export FINISHED with S3 key, row count, metadata
9. **Retrieval**: User/system polls GET endpoint for status, retrieves S3 download URL

### Workflow 2: Reminder Email Export with Regional Segmentation

1. **Request**: Marketing team requests reminderEmail export
2. **Campaign Analysis**: System loads campaign locales and markets
3. **Region Mapping**: Maps country codes to SFMC regions (NA, UK, etc.)
4. **Writer Creation**: Creates CSV writers for each region in temp directories
5. **Data Streaming**: Queries scoring data, transforms locales, writes to regional CSVs
6. **File Segmentation**: Splits large regions into multiple files (maxRowPerExportedFile)
7. **ZIP Creation**: Packages regional folders into single ZIP archive
8. **Upload & Cleanup**: Uploads ZIP to S3, deletes temp files
9. **Notification**: Updates export status with ZIP key and total count

### Workflow 3: Queue-Based Export Processing

1. **Polling**: Queue processor runs every pollingInterval (default: 1000ms)
2. **Conflict Check**: Checks for any TRIGGERED exports; if found, validates timeout
3. **Timeout Handling**: If TRIGGERED export exceeds timeoutMillis, marks EXPIRED
4. **Next Job**: If no TRIGGERED exports, finds oldest PENDING export
5. **Trigger**: Marks PENDING export as TRIGGERED, counts entries
6. **Export**: Calls appropriate export function based on exportType
7. **S3 Upload**: Uploads formatted data to designated bucket
8. **Finalization**: Marks export FINISHED or FAILED based on outcome
9. **Repeat**: Processor continues polling for next PENDING export

### Workflow 4: Multi-Market Entry Export

1. **Validation**: Checks campaign and markets exist
2. **Market Iteration**: Loops through each campaign market
3. **Entry Query**: Queries user entries for specific marketId
4. **Row Writing**: For each entry, formats user/entry/campaign/market data as CSV row
5. **Additional Markets**: Optionally writes extra rows for users in multiple markets
6. **Stream Upload**: Streams CSV rows directly to S3 via PassThrough stream
7. **Count Return**: Returns total row count after stream completes

## Example Scenarios

**Scenario 1: "Stadium Tour Multi-Country Campaign"**
- Marketing team launches Taylor Swift tour presale across US, UK, Germany
- Campaign collects 500K entries across 15 markets
- Team requests reminderEmail export for SFMC
- System segments: 300K US/Canada entries → NA folder, 150K UK entries → UK folder, 50K Germany → NA folder (locale transformation)
- ZIP generated with 2 folders, 6 CSV files (3 per region due to maxRowPerFile limit)
- Marketing imports regional CSVs to corresponding SFMC data extensions
- Reminder emails sent in appropriate languages per region within 2 hours

**Scenario 2: "High-Demand Festival Presale"**
- Festival campaign generates 1.2M entries in 48 hours
- Ticketing partner needs code assignments for presale validation
- Admin requests codeAssignments export at 8 AM
- System queues export (2 other exports already pending)
- Queue processor completes prior exports in 12 minutes
- codeAssignments export triggers, counts 1.2M entries
- Export streams 1.2M rows to CSV over 18 minutes
- Uploads 250MB CSV to exportsS3
- Ticketing partner downloads and imports codes, presale opens at 10 AM

**Scenario 3: "Artist Opt-In Campaign Compliance"**
- Fan submits CCPA deletion request
- Compliance team authenticates as Supreme user
- Sends DELETE /ccpa/users/{userId} request
- System finds user in 8 campaign exports (3 entries, 2 artistOptIn, 2 codes, 1 waitlist)
- Deletes 7 S3 objects (skips 1 scoring export per exemption policy)
- Updates export records with deletion timestamps
- Returns confirmation: 7 exports deleted within 500ms
