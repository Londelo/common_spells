# Use Cases & Workflows - vf-api-workers

## Primary Use Cases

### Use Case 1: Process Scrubbed Registration Scoring File

**Actor**: Campaign Pipeline (automated system)

**Goal**: Ingest scored fan registrations from CSV file, validate, normalize, and distribute to downstream systems

**Preconditions**:
- Campaign pipeline has completed scoring and scrubbing process
- CSV file exists in S3 at path: `scrubbed/registrants.<campaignId>.<campaignName>.<dateTime>.cleaned.prepared.merged.csv`
- Kinesis scoresStream is available and healthy

**Main Flow**:
1. S3 ObjectCreated event triggers **loadScoresToStream** Lambda
2. System streams CSV from S3 in batches of 5000 rows to manage memory
3. For each row: assign rank based on market preference (determines fan priority)
4. Filter records: validate against schema, reject invalid or unranked records
5. Normalize valid records (format fields, combine duplicate keys)
6. Batch write normalized records to Kinesis scoresStream
7. Track counts: input, output, valid, invalid, failed records
8. Send SQS message to verdictReporterQueue with campaign ID and output count
9. Return processing summary with count breakdowns

**Postconditions**:
- Valid fan scores available in Kinesis stream for consumption
- Invalid records logged with metrics
- Verdict reporter queued to notify stakeholders

**Business Rules Applied**:
- Market preference determines rank priority
- Only records with valid rank are processed
- Records must pass schema validation
- Failed records don't block successful records

---

### Use Case 2: Upsert Fan Scores to DynamoDB

**Actor**: Kinesis scoresStream (event-driven)

**Goal**: Persist fan scoring data to DynamoDB for API queries and state tracking

**Preconditions**:
- Records available in Kinesis scoresStream
- DynamoDB demandTable accessible
- Records contain required fields: campaignId, globalUserId, score, isVerified

**Main Flow**:
1. **loadScoresToDynamoDB** Lambda triggered by Kinesis stream batch
2. Batch process records (up to configured batch size)
3. For each record: format DynamoDB update with primary key `PK: fan:{globalUserId}, SK: campaign:{campaignId}`
4. Update fields: score, isVerified, registrationScore, accountScore, tags, nudetect score
5. Set `updated` timestamp to current time
6. Execute batch upsert to DynamoDB (handles both new and existing records)
7. Track write statuses: success, created, updated, unchanged, invalid, failed
8. Emit CloudWatch metrics for monitoring
9. Return status counts

**Postconditions**:
- Fan scores persisted in DynamoDB
- Verification status (isVerified) stored for each fan-campaign pair
- CloudWatch metrics available for operational monitoring

**Business Rules Applied**:
- Existing records are updated, new records are created (upsert behavior)
- Timestamp updated on every write for audit trail
- Invalid records logged but don't fail the batch

---

### Use Case 3: Track Verification State Changes

**Actor**: DynamoDB Stream (event-driven)

**Goal**: Maintain accurate counts of verified, rejected, and selected fans per campaign

**Preconditions**:
- DynamoDB demandTable has streams enabled
- Fan score records being inserted or updated
- Records are not meta records (SK does not start with 'meta:')

**Main Flow**:
1. **processSavedScores** Lambda triggered by DynamoDB stream
2. Filter out meta records (keep only fan records)
3. For each record change:
   - Extract old and new values for: isVerified, verdict, localFanscore, events, selectedEvents
   - Detect if it's a new record (INSERT) or update (MODIFY)
4. Calculate count deltas:
   - New verified fan: +1 verified or +1 rejected based on isVerified
   - isVerified flipped: +1 to new state, -1 from old state
   - verdict changed: +1 or -1 selected count
5. Group count deltas by campaignId
6. For each campaignId: fetch existing `meta:counts` record from DynamoDB
7. Merge deltas with existing counts
8. Upsert updated counts to `PK: campaign:{campaignId}, SK: meta:counts`
9. Log each saved score to CloudWatch for audit
10. Return total number of records processed

**Postconditions**:
- Accurate verified/rejected/selected counts maintained in DynamoDB
- Count changes available for reporting and API queries
- Audit trail in CloudWatch logs

**Business Rules Applied**:
- Only actual state changes update counts (unchanged records have no effect)
- Counts are campaign-specific (not global)
- New records increment appropriate count by 1
- State flips adjust both old and new state counts

---

### Use Case 4: Report Verdict Counts to Slack

**Actor**: SQS verdictReporterQueue (event-driven)

**Goal**: Notify campaign stakeholders when scoring completes and counts are finalized

**Preconditions**:
- Verdict reporter message in SQS queue with campaignId and count
- DynamoDB meta:counts record updated for the campaign
- Slack channel configured

**Main Flow**:
1. **verdictReporter** Lambda triggered by SQS message batch
2. For each message: extract campaignId and last reported count
3. Fetch current counts from DynamoDB `meta:counts` record
4. Compare last count (from message) with current count (from DynamoDB)
5. If counts match:
   - Check `meta:slack:counts` record in DynamoDB
   - If counts equal last Slack notification: bypass Slack post (no change)
   - If counts differ: post verdict details to Slack
   - Update `meta:slack:counts` with new counts
6. If counts don't match:
   - Requeue message to SQS for retry (counts still settling)
   - Log requeue event
7. Return aggregated results: requeue success count, Slack success count, input count

**Postconditions**:
- Campaign managers notified via Slack when counts are finalized
- No duplicate notifications for unchanged counts
- Failed matches requeued for retry

**Business Rules Applied**:
- Only notify Slack when counts actually change from last notification
- If counts are still changing, requeue for later retry
- Deduplicate notifications using meta:slack:counts comparison
- Process multiple campaigns in parallel

---

### Use Case 5: Save Fanlist Scores from Third-Party Data

**Actor**: External fanlist scoring system (upstream)

**Goal**: Ingest fanlist-based scoring data and distribute to campaign data stream

**Preconditions**:
- Fanlist scoring file uploaded to S3 at `fanlist/scored/{campaignId}/{timestamp}.csv`
- File contains member IDs or emails with scores
- DynamoDB demandTable accessible
- Kinesis campaignDataStream available

**Main Flow**:
1. S3 ObjectCreated event triggers **saveFanlistScores** Lambda
2. Stream CSV file from S3 in batches
3. For each batch:
   - Parse CSV rows
   - Validate member IDs or emails (identifier present, not empty)
   - Track invalid and duplicate records
   - Deduplicate by member ID or email, keeping highest score
4. Normalize email addresses (lowercase, trim)
5. Sort by score (descending) and deduplicate
6. For each valid record: upsert to DynamoDB with `PK: fan/sid/email:{identifier}, SK: campaign:{campaignId}`
7. Track DynamoDB results: successful writes, failures, rejections
8. Extract successful records from DynamoDB results
9. Normalize for Kinesis (add metadata: correlation, date)
10. Batch write to Kinesis campaignDataStream
11. Send SQS message to verdictReporterQueue with campaign ID
12. Return counts: input (in, invalid, duplicate, valid), dynamo (in, failed, out), stream (in, failed, out)

**Postconditions**:
- Fanlist scores stored in DynamoDB
- Scoring events published to campaignDataStream
- Verdict reporter queued for Slack notification
- Detailed count metrics available for monitoring

**Business Rules Applied**:
- Deduplication by identifier (member ID or email)
- Highest score wins for duplicates
- Invalid identifiers (missing or malformed) are rejected
- Email addresses normalized before storage

---

### Use Case 6: Save Entry Scoring for Rank 0 Fans

**Actor**: Kinesis scoresStream (event-driven)

**Goal**: Send top-ranked fan scoring data to Entry Service for registration tracking

**Preconditions**:
- Records in Kinesis scoresStream contain events array
- Rank 0 fans identified (fans with events[0] present)
- Entry Service API available
- Campaign Service accessible for market lookups

**Main Flow**:
1. **saveEntryScoring** Lambda triggered by Kinesis stream
2. Filter records: keep only those with rank 0 (events[0] exists)
3. Group filtered records by campaignId
4. For each campaign:
   - Fetch market data from Campaign Service
   - Map market names to IDs
   - Normalize each record for Entry Service format:
     - Include: memberId, globalUserId, phone details, email, name, verdict (isVerified), scores
     - Map hbase field to marketId using market lookup
   - POST normalized records to Entry Service `/campaigns/{campaignId}/scoring`
   - Track Entry Service response counts: input, scoring, entries, inserted, updated, found
5. Aggregate counts across all campaigns
6. Return total counts with record count

**Postconditions**:
- Rank 0 fan scores sent to Entry Service
- Entry registration records updated with scoring data
- Processing counts available for monitoring

**Business Rules Applied**:
- Only rank 0 fans (top-ranked for their market) flow to Entry Service
- Market ID must be resolved from market name before sending
- Failed Entry Service calls are logged but don't fail the entire batch

---

## User Journey Map

**Campaign Manager Lifecycle**:
1. Campaign manager sets up campaign with market preferences
2. Fans register and submit entries
3. Campaign pipeline scores registrations and uploads scrubbed file to S3
4. vf-api-workers processes scores → stores in DynamoDB → publishes to streams
5. DynamoDB stream triggers count updates as scores are saved
6. Verdict reporter checks if counts are stable and notifies Slack
7. Campaign manager sees Slack notification with verified/rejected/selected counts
8. Campaign manager reviews counts and takes action (e.g., proceed to ticket sale)

**Fan Experience (Indirect)**:
1. Fan registers for Verified Fan campaign
2. System scores fan based on activity, device, location
3. Fan's score processed by vf-api-workers → stored in DynamoDB
4. Fan's verification status (verified/rejected) determined and saved
5. Downstream systems query DynamoDB to determine ticket access eligibility
6. Fan sees access granted or denied based on stored verification status

## Key Workflows

### 1. End-to-End Scoring Pipeline
**Campaign Pipeline** (upstream) → Scores registrations → Writes scrubbed CSV to S3 → **loadScoresToStream** reads file → Validates and normalizes → Publishes to Kinesis **scoresStream** → Parallel processing:
- **loadScoresToDynamoDB** upserts scores to DynamoDB
- **saveEntryScoring** sends rank 0 scores to Entry Service
→ **processSavedScores** (DynamoDB stream) calculates count deltas → Updates meta:counts in DynamoDB → **verdictReporter** (SQS queue) compares counts → Posts to Slack when stable

### 2. Fanlist Scoring Integration
**External Fanlist System** → Uploads scored fanlist CSV to S3 → **saveFanlistScores** reads file → Validates and deduplicates → Writes to DynamoDB → Publishes to Kinesis **campaignDataStream** → Triggers verdict reporter → Posts to Slack

### 3. Real-time Verification Count Tracking
Fan score changes in DynamoDB → **processSavedScores** detects change → Calculates count delta (verified +/-1, rejected +/-1, selected +/-1) → Updates meta:counts record → Downstream systems query for accurate counts

### 4. Verdict Notification with Anti-Duplicate Logic
Scoring completes → SQS message sent to **verdictReporterQueue** with campaignId and count → **verdictReporter** fetches current counts from DynamoDB → Compares last count vs. current count:
- **If match**: Checks meta:slack:counts → If equal: skip Slack post (already notified) | If different: post to Slack and update meta:slack:counts
- **If no match**: Requeue message (counts still updating)

## Example Scenarios

### Scenario 1: Large Campaign Scoring Completion
Campaign "Taylor Swift Presale" with 100,000 registrations completes scoring:
1. Campaign pipeline uploads `scrubbed/registrants.campaign-123.taylor-swift.2026-02-13T10:00:00.csv` to S3
2. **loadScoresToStream** streams file in 5000-row batches, validates 98,500 valid records, rejects 1,500 invalid
3. 98,500 records published to scoresStream in under 2 minutes
4. **loadScoresToDynamoDB** processes stream in parallel, upserts all 98,500 scores to DynamoDB
5. **processSavedScores** tracks each upsert, calculates: 75,000 verified, 23,500 rejected
6. **verdictReporter** receives SQS message, fetches meta:counts (verified: 75,000, rejected: 23,500), compares to last Slack count (verified: 72,000, rejected: 26,500)
7. Counts differ → Post to Slack: "Campaign 'Taylor Swift Presale' scoring complete: 75,000 verified (+3,000), 23,500 rejected (-3,000)"
8. Update meta:slack:counts to prevent duplicate notification

### Scenario 2: Fanlist Score Integration
Marketing team uploads 50,000 fan emails with scores from fanlist provider:
1. File uploaded to `fanlist/scored/campaign-456/2026-02-13T14:30:00.csv`
2. **saveFanlistScores** reads file, finds 48,000 valid emails, 1,500 invalid, 500 duplicates
3. Deduplicates: keeps 48,000 unique emails with highest score per email
4. Writes 48,000 records to DynamoDB with `PK: fan/sid/email:{email}, SK: campaign:campaign-456`
5. Publishes 48,000 records to campaignDataStream for downstream processing
6. Sends SQS message to verdictReporterQueue
7. **verdictReporter** posts to Slack: "Campaign 'Fanlist Integration' scoring complete: 48,000 records processed"

### Scenario 3: Rank 0 Fan Entry Tracking
Campaign processes 20,000 fans, 5,000 have rank 0 (top-ranked event):
1. **loadScoresToStream** publishes 20,000 records to scoresStream
2. **saveEntryScoring** filters for rank 0: 5,000 fans match
3. Groups by campaignId: 5,000 records for campaign-789
4. Fetches market data from Campaign Service
5. Normalizes 5,000 records with marketId mappings
6. POSTs to Entry Service: `/campaigns/campaign-789/scoring` with 5,000 records
7. Entry Service responds: 4,800 inserted, 200 updated
8. Returns counts: records: 20,000, input: 1, scoring: 1, inserted: 4,800, updated: 200

### Scenario 4: Count Stabilization and Requeue Logic
Scoring completes, but DynamoDB stream processing lags:
1. **loadScoresToStream** completes, sends SQS message with count: 10,000
2. **verdictReporter** triggered immediately, fetches meta:counts: verified: 9,500 (still processing)
3. Count mismatch (expected 10,000, found 9,500) → Requeue message to SQS with delay
4. 30 seconds later, **verdictReporter** triggered again, fetches meta:counts: verified: 10,000
5. Counts match → Check meta:slack:counts (verified: 8,000)
6. Counts differ → Post to Slack: "Campaign scoring complete: 10,000 verified (+2,000)"
7. Update meta:slack:counts to 10,000 verified
