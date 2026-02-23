# Use Cases & Workflows - campaign-workers

## Primary Use Cases

### Use Case 1: Process Fan Eligibility Scores

**Actor**: Campaign Pipeline Orchestrator (Step Function)

**Goal**: Transform raw fan scoring data into validated, enriched records ready for selection

**Preconditions**:
- Scoring service has uploaded a TSV file to S3 scoring bucket with format `{campaignId}.{timestamp}.txt`
- Campaign exists in campaign service with valid configuration
- Email blacklist file exists in scoring bucket

**Main Flow**:
1. S3 upload triggers `processScoredFiles` Lambda
2. Worker reads blacklist emails from S3
3. Worker fetches campaign configuration (including `allowIntlPhones` setting)
4. Worker streams scored file, parsing TSV rows
5. For each row, worker assigns randomized band scores within quality tiers
6. Worker validates phone numbers, tags unconfirmed/international numbers
7. Worker validates emails against blacklist and domain patterns
8. Worker transforms validated records to Kinesis format
9. Worker streams records to `saveSelectionStream` in batches of 2500
10. Worker writes scrubbed CSV to S3 for auditing
11. Worker sends Slack notification with processing stats

**Postconditions**:
- Valid fan records available in Kinesis stream
- Scrubbed CSV stored in S3 at `scrubbed/{campaignId}.{timestamp}.csv`
- Slack notification sent with counts (in/out/tagged)

**Business Rules Applied**:
- Scores are bucketed into bands to introduce fairness randomness
- Blacklisted emails automatically rejected
- International phones rejected unless campaign allows
- Invalid phone formats tagged but may still flow through

**Data Transformations**:
- TSV with raw scores → JSON records with band_score, score, tags
- Phone/email validation adds `tags` array with issues
- `setDedupeInfo` adds unique hash for downstream deduplication
- Record trimmed of whitespace on all string fields

---

### Use Case 2: Generate SMS Wave Access Codes

**Actor**: Campaign Step Function

**Goal**: Generate unique access codes for fans in an upcoming SMS wave

**Preconditions**:
- SMS wave configuration file uploaded with `generateOfferCode: true`
- Wave CSV file exists with fan records
- Pacman code service is accessible
- Wave has `notifyDate`, `productId`, `source` configured

**Main Flow**:
1. Step Function invokes `generateSmsWaveCodes` with wave file prefix and config
2. Worker expands config dates (beginDate = notifyDate - 1 day, endDate = notifyDate + 1 year)
3. Worker uploads normalized config with `genCodes: true` status
4. Worker reads wave CSV from S3
5. For each fan record, worker calls Pacman to generate code with:
   - Product ID, source, begin/end dates from config
   - Global user ID from fan record
6. Worker attaches generated code to fan record
7. Worker filters out any rows with generation failures
8. Worker overwrites wave CSV with enriched data (now includes codes)
9. Worker uploads final normalized config (without genCodes flag)
10. Worker returns counts (in/out/errors)

**Postconditions**:
- Wave CSV updated with `code` column populated
- Normalized config file at `smsWaves/configs/{waveFilePrefix}.normalized.json`
- Codes are valid from 1 day before notify date to 1 year after

**Business Rules Applied**:
- Codes must be unique per fan per campaign
- Code validity window handles timezone edge cases (1 day buffer)
- Failed code generation removes fan from wave (error count)
- Only generate codes if `generateOfferCode: true` in config

**Data Transformations**:
- Config `notifyDate` → expanded to `beginDate` and `endDate`
- Fan records enriched with `code` field from Pacman response
- Failed generations filtered out (input count > output count)

---

### Use Case 3: Process Scheduled Wave (Assign Codes)

**Actor**: Campaign Step Function

**Goal**: Assign pre-generated codes to campaign in code service

**Preconditions**:
- Wave CSV file exists at `smsWaves/csv/{campaignId}_{suffix}.csv`
- Wave file contains `code` column with valid codes
- Campaign exists in campaign service

**Main Flow**:
1. Step Function invokes `processScheduledWave` with file key
2. Worker extracts campaign ID from file key
3. Worker reads wave CSV from S3
4. Worker filters out empty codes and placeholder "TM" codes
5. Worker batches codes into groups of 2500
6. For each batch, worker calls code service `assignCodesToCampaign` API
7. Code service marks codes as assigned to the campaign
8. Worker aggregates batch results (valid count, updated count)
9. Worker returns summary with total in/valid/updated counts

**Postconditions**:
- All valid codes in wave file are assigned to campaign in code service
- Codes are now reserved and can't be used by other campaigns
- Counts reflect: total fans, valid codes, successfully updated codes

**Business Rules Applied**:
- "TM" codes are ignored (placeholder for TM-managed inventory)
- Empty/nil codes are ignored
- Codes must exist in code service before assignment
- Assignment is idempotent (re-running won't create duplicates)

**Data Transformations**:
- CSV rows → array of code strings
- Filtered to remove invalid/placeholder values
- Batched for API efficiency
- Aggregated counts from batch results

---

### Use Case 4: Prepare SMS Wave Files for Delivery

**Actor**: Campaign Step Function

**Goal**: Select eligible fans per market, assign codes, and prepare delivery files

**Preconditions**:
- Campaign configured with market details (ID, name, capacity, selection time)
- Market details CSV uploaded to `wavePrep/{campaignId}/data/{dateKey}.csv`
- Entry service has fan registration data
- Code service has available codes

**Main Flow**:
1. Step Function invokes `processSmsWaveFiles` with campaign ID and date key
2. Worker creates temp directories for output files (email, masterCodes, sms)
3. Worker reads market details from CSV
4. Worker fetches campaign market data from campaign service
5. Worker combines uploaded details with service data
6. Worker reserves external codes from Pacman in batches per market
7. Worker queries entry service for eligible fans per market/selection time
8. For each market, worker selects fans up to capacity limit
9. Worker normalizes fan records (format phone, select relevant fields)
10. Worker assigns codes (TM or reserved external codes) to selected fans
11. Worker writes records to categorized CSV files:
    - `sms/{marketName}.csv` - fans with phone numbers for SMS
    - `email/{marketName}.csv` - fans for email delivery
    - `masterCodes/{marketName}.csv` - full code assignment data
12. Worker zips all output files
13. Worker uploads zip to `wavePrep/{campaignId}/prepped/prepped.{dateKey}.zip`
14. Worker uploads status JSON tracking attempts, timing, counts
15. Worker cleans up temp files

**Postconditions**:
- Zip file contains categorized CSV files ready for notification services
- Status JSON shows FINISHED with file path and counts
- External codes reserved in Pacman
- Selected fans recorded in output files

**Business Rules Applied**:
- Market selection limits enforced (can't exceed market capacity)
- Fans selected per market based on selection time windows
- External codes reserved before assignment to prevent conflicts
- Wave prep limited to 2 attempts (tracked in status JSON)
- Output categorized by delivery channel (SMS, email, master codes)

**Data Transformations**:
- Market details CSV + campaign service data → combined market metadata
- Entry service fan records → normalized format (phone formatting, field selection)
- Code reservations + fan records → code assignments
- Multiple CSVs → categorized folder structure → zip file
- Status tracked through JSON file updates (TRIGGERED → FINISHED/FAILED)

---

### Use Case 5: Send SMS Wave Notifications

**Actor**: Campaign Step Function

**Goal**: Send SMS notifications with access codes to all fans in a wave

**Preconditions**:
- Wave config file in `triggered` state
- Wave CSV file exists with fan records including codes
- TM SMS service is operational
- SQS email queue is available

**Main Flow**:
1. Step Function invokes `smsWaveSend` with wave name
2. Worker reads wave config to get notify date and details
3. Worker creates wave metadata (name, date, file key)
4. Worker streams wave CSV file from S3
5. Worker parses CSV rows (columns: phone, email, code, etc.)
6. Worker batches registrants into groups of 200 for concurrent processing
7. For each registrant:
   - If phone exists: Call TM SMS service to send SMS with code
   - If email exists: Queue email notification to SQS
   - Track result (ok/failed, detail by channel)
8. Worker aggregates results across all batches
9. Worker logs progress after each batch completes
10. Worker returns final counts (total, ok, failed, detail breakdown)

**Postconditions**:
- SMS messages sent to all fans with valid phone numbers
- Email notifications queued for all fans with email addresses
- Delivery statistics available (sent/failed per channel)
- Wave marked as completed

**Business Rules Applied**:
- SMS concurrency limited to 200 requests to respect rate limits
- Both SMS and email attempted for fans with both channels
- Failed sends tracked but don't block wave completion
- Empty phone/email values skip that channel (no error)

**Data Transformations**:
- CSV rows → Registrant objects (typed)
- Registrant + wave metadata → SMS message payload
- Registrant + wave metadata → email queue message
- Batch results → aggregated SendResults with counts

---

### Use Case 6: Merge Campaign Data Files

**Actor**: Scheduled CloudWatch Event (daily/monthly)

**Goal**: Consolidate fragmented Avro campaign data into single queryable files

**Preconditions**:
- Multiple Avro files exist at `campaignData/{recordType}/{prefix}/`
- Athena database and table definitions exist
- Record type has valid Avro schema
- Files are under 1.2GB combined size

**Main Flow**:
1. CloudWatch event triggers `mergeAvroFiles` with type (daily/monthly) and optional prefix
2. Worker calculates file prefix based on type and current date
3. Worker verifies files exist at prefix (lists S3 objects)
4. Worker extracts record type from prefix (e.g., "registration")
5. Worker validates Avro schema is current (not outdated)
6. Worker creates temporary Athena table for the prefix
7. Worker executes Athena query to consolidate files
8. Athena outputs merged file to `athena-output/{QueryExecutionId}/`
9. Worker validates merged file size < 1.2GB
10. Worker reads merged Avro file from Athena output
11. Worker normalizes records (trim whitespace, validate schema)
12. Worker writes consolidated Avro to `campaignData/{recordType}/merged/{prefix}.avro`
13. Worker deletes temporary Athena output file
14. Worker sends message to `moveMergedAvroQueue` with prefix
15. Worker drops temporary Athena table
16. Worker returns merge statistics (records merged, files consolidated)

**Postconditions**:
- Single merged Avro file replaces multiple source files
- Athena queries now hit one large file instead of many small files
- SQS message queued to archive source files
- Statistics show merge efficiency

**Business Rules Applied**:
- Only "registration" record type currently supported
- Files exceeding 1.2GB rejected (prevents query timeouts)
- Outdated schemas rejected (must match current version)
- Temporary Athena resources cleaned up after success or failure
- Source files archived only after successful merge

**Data Transformations**:
- Multiple Avro files → single Athena query → merged Avro file
- Records normalized during merge (whitespace trimmed)
- File prefix tracked for downstream archival
- Query execution ID used as temporary file identifier

---

### Use Case 7: Archive Merged Source Files

**Actor**: SQS message from mergeAvroFiles

**Goal**: Move source Avro files to archive after successful merge

**Preconditions**:
- Merge completed successfully
- Merged file exists at `campaignData/{recordType}/merged/{prefix}.avro`
- Source files still exist at `campaignData/{recordType}/{prefix}/`

**Main Flow**:
1. SQS delivers message to `moveMergedAvroFiles` Lambda
2. Worker receives file prefix from message
3. Worker lists all source files matching prefix
4. Worker copies each file to `campaignData/{recordType}/merged/{prefix}/{originalName}`
5. Worker verifies all copies succeeded
6. Worker deletes original source files
7. Worker returns count of files moved

**Postconditions**:
- Source files archived under `/merged/{prefix}/` path
- Original source file locations cleared
- Storage optimized (queries hit merged file only)

**Business Rules Applied**:
- Copy before delete (prevents data loss)
- All copies must succeed before any deletes
- Archive preserves original file names under merged prefix

---

### Use Case 8: Load Code Assignments to Stream

**Actor**: S3 event on wave config state change

**Goal**: Publish code assignments to Kinesis for downstream consumption

**Preconditions**:
- Wave config moved to `triggered` or `completed` state
- Wave CSV exists with code assignments
- Kinesis input stream is available

**Main Flow**:
1. S3 triggers Lambda on config file write at `smsWaves/{state}/{prefix}_csv.json`
2. Worker decodes S3 object key (handles URI encoding)
3. Worker reads wave config JSON from S3
4. Worker validates config has required `campaignId`
5. Worker derives wave CSV key from config key
6. Worker reads wave CSV file
7. Worker filters rows to only those with valid codes (not empty, not "TM")
8. Worker formats each row as code assignment record:
   - type: "codeAssignment"
   - date.created: current timestamp
   - campaignId, categoryId from config
   - globalUserId, memberId, marketId, code from row
9. Worker batches code assignments (groups for efficient streaming)
10. Worker puts batches to Kinesis input stream with code as partition key
11. Worker returns counts (total rows, streamed records)

**Postconditions**:
- Code assignments available in Kinesis for transformation workers
- Each valid code published exactly once
- Counts show input vs. streamed records

**Business Rules Applied**:
- "TM" codes filtered out (not published to stream)
- Empty/nil codes filtered out
- Code used as partition key for Kinesis ordering
- Timestamps added at publish time (not from source file)

**Data Transformations**:
- CSV rows → code assignment objects
- Config metadata attached (campaignId, categoryId)
- Filtered to valid codes only
- Batched for Kinesis efficiency
- Partition key derived from code field

---

## User Journey Map

**Campaign Operations Team Perspective:**

1. **Campaign Created** → Operations team configures campaign in campaign service with markets, dates, options
2. **Fan Registration Begins** → Fans register, data flows to entry service
3. **Scoring Triggered** → Scoring service uploads fan scores to S3 → `processScoredFiles` validates and streams data
4. **Selection Window** → Entry service has validated fan pool ready for selection
5. **Wave Scheduled** → Operations schedules SMS wave with notify date → `generateSmsWaveCodes` reserves codes
6. **Wave Prepared** → `processSmsWaveFiles` selects eligible fans, assigns codes, creates delivery files
7. **Notification Sent** → `smsWaveSend` delivers SMS/email at notify time → Fans receive access codes
8. **Monitoring** → Slack notifications show success/failure stats → Operations team verifies delivery
9. **Data Archived** → `mergeAvroFiles` consolidates campaign data → Analytics team can query results

---

## Key Workflows

### Workflow 1: End-to-End Campaign Execution

**Trigger**: Campaign scheduled with notify date

**Steps**:
1. **Pre-processing** (days before notify):
   - Scoring service uploads fan scores → processScoredFiles → validated data in stream
   - translateRanksToScores converts rankings to normalized scores
   - saveCampaignData writes records to Avro data lake

2. **Wave Preparation** (1-2 days before notify):
   - generateSmsWaveCodes generates unique access codes
   - processSmsWaveFiles selects fans, reserves codes, creates delivery files
   - loadCodeAssignmentsToStream publishes assignments to Kinesis

3. **Code Assignment** (day of notify):
   - processScheduledWave assigns codes to campaign in code service
   - transformCodeAssignments enriches code records with user/campaign IDs
   - saveSelection stores final selection data

4. **Notification Delivery** (at notify time):
   - smsWaveSend sends SMS and queues emails
   - Fans receive access codes
   - slackStats publishes delivery statistics

5. **Post-processing** (after campaign):
   - mergeAvroFiles consolidates data daily/monthly
   - moveMergedAvroFiles archives source files
   - saveStats refreshes admin statistics

**Outcome**: Fans notified with access codes, campaign data archived for analytics

---

### Workflow 2: Data Quality Pipeline

**Purpose**: Ensure only valid, non-fraudulent fans enter campaign pipeline

**Steps**:
1. **Blacklist Loading**: getBlacklistEmailsFromBucket fetches blocked emails
2. **Scoring**: Fan scores assigned with band randomization
3. **Validation**:
   - Email checked against blacklist and domain patterns
   - Phone validated for format and country code
   - Tags added for issues (unconfirmed, international, invalid)
4. **Filtering**: Records with critical issues rejected or tagged
5. **Streaming**: Valid records sent to Kinesis with dedupe info
6. **Scrubbing**: Cleaned CSV written for audit trail
7. **Alerting**: Slack notification with validation statistics

**Outcome**: Only quality fan data flows to selection and notification stages

---

### Workflow 3: Code Lifecycle Management

**Purpose**: Track access codes from generation through assignment to delivery

**Steps**:
1. **Generation**: generateSmsWaveCodes calls Pacman to create codes
2. **Assignment**: processScheduledWave assigns codes to campaign
3. **Publishing**: loadCodeAssignmentsToStream publishes to Kinesis
4. **Enrichment**: transformCodeAssignments adds user/campaign metadata
5. **Selection Storage**: saveSelection persists final assignments
6. **Delivery**: smsWaveSend includes codes in notifications
7. **Validation**: Fans redeem codes (handled by downstream services)

**Outcome**: Full audit trail of code generation, assignment, and delivery

---

## Example Scenarios

### Scenario 1: High-Volume Concert Presale
**Context**: Major artist tour announcement, 2M fans registered, 100K codes available

**Flow**:
- Scoring uploads 2M fan records → processScoredFiles validates 1.95M (50K blacklisted/invalid)
- Wave prep selects top 100K fans across 50 markets → codes generated
- Notify time arrives → smsWaveSend delivers 200 SMS/sec → completes in ~8 minutes
- Result: 98K successful SMS, 2K failed (bad numbers), 100K emails queued

**Timing**: Total pipeline <4 hours from score upload to delivery

---

### Scenario 2: Multi-Market International Campaign
**Context**: Festival with 10 markets, some international, staggered selection times

**Flow**:
- Campaign configured with allowIntlPhones: true
- processSmsWaveFiles queries entry service per market with selection time filters
- Market capacities enforced (e.g., US: 50K, UK: 10K, AU: 5K)
- External codes reserved per market from Pacman
- Zip file contains separate CSV per market for localized delivery
- Notification step uses market-specific templates

**Outcome**: Fair distribution across markets respecting local capacity limits

---

### Scenario 3: Data Consolidation for Analytics
**Context**: Campaign ran 30 waves over 2 months, 500K total selections, fragmented data

**Flow**:
- Daily: mergeAvroFiles consolidates each day's data (30 days × ~16K fans/day)
- Monthly: mergeAvroFiles consolidates month's data into single 500K record file
- Athena query time reduced from 45 seconds (500 files) to 3 seconds (1 file)
- moveMergedAvroFiles archives source files to /merged/ prefix
- Analytics team runs queries on consolidated data for campaign reports

**Outcome**: 15x query performance improvement, simplified data structure

---

### Scenario 4: Wave Failure Recovery
**Context**: Code service timeout during wave prep, 50K fans selected but codes not assigned

**Flow**:
- First attempt: processSmsWaveFiles selects fans, reserves codes, code service times out
- Status JSON shows attempts: 1, status: FAILED
- Operations team checks error in Slack alert
- Retry triggered: processSmsWaveFiles re-runs (attempt 2)
- Code reservations already exist (idempotent), assignment succeeds
- Status JSON shows attempts: 2, status: FINISHED
- Wave proceeds to notification stage

**Outcome**: Automatic retry recovers from transient failure without data loss
