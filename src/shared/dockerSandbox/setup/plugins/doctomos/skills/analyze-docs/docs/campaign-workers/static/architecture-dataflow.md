# Data Flow - campaign-workers

## Primary Flow

The campaign-workers repository implements an **event-driven data pipeline** for processing Verified Fan campaign registrations, scoring, code assignments, and SMS waves. Data flows through multiple stages:

1. **Data Ingestion** → Various sources (MySQL, MongoDB, external services) send data to Kinesis streams
2. **Stream Processing** → Workers consume streams, validate, transform, and enrich data
3. **Data Storage** → Transformed data encoded as Avro and written to S3
4. **Scoring & Selection** → Data Science scores registrants, workers process scored files
5. **Code Assignment** → Winners assigned codes, selections saved to verdict queue
6. **Notification** → SMS waves scheduled and sent to fans

## Data Flow Diagram

```
External Sources (MySQL, Mongo, APIs)
    ↓
[loadCodeAssignmentsToStream]
    ↓
Kinesis: inputStream
    ↓
[transformCodeAssignments] ──→ [saveSelection]
    ↓                                ↓
Kinesis: saveSelectionStream    Verdict Queue (SQS)
    ↓
[saveCampaignData]
    ↓
S3: campaignDataBucket/avro/{type}/
    ↓
[mergeAvroFiles] (scheduled daily/monthly)
    ↓
S3: merged file → [moveMergedAvroFiles]
    ↓
S3: campaignDataBucket/avro/archived/

──────────────────────────────

Data Science Scoring
    ↓
S3: scoringBucket/scored/registrants.txt
    ↓
[processScoredFiles] (S3 trigger)
    ↓
Kinesis: vfInputStream (scored records)
    ↓
[saveCampaignData]
    ↓
S3: campaignDataBucket/avro/scoring/

──────────────────────────────

Fanlist Campaigns
    ↓
S3: scoringBucket/fanlist/uploaded/{fanlistId}/{file}.csv
    ↓
[translateRanksToScores] (S3 trigger)
    ↓
Kinesis: fanlistRanksStream
    ↓
[saveCampaignData]
    ↓
S3: campaignDataBucket/avro/scoring/

──────────────────────────────

SMS Wave Preparation
    ↓
MonoQL uploadWave (SDK invoke)
    ↓
[generateSmsWaveCodes] (if generateOfferCode=true)
    ↓ (generates codes via Pacman)
S3: scoringBucket/smsWaves/csv/{wave}.csv
    ↓
[smsWaveScheduler] (scheduled every 5 min)
    ↓ (checks notifyDate)
Step Function: sms-wave-step-fn
    ↓
[smsWaveSend]
    ↓
SMS Service / Email Queue

──────────────────────────────

Scheduled Workers
    ↓
CloudWatch Events (every 5/30 min)
    ↓
[saveStats] → MongoDB: adminStats collection
[slackStats] → Slack API (campaign stats)
```

## Detailed Data Flow by Worker Type

### Stream Consumers (Kinesis → Processing → Output)

#### saveCampaignData (cmp-save-data)
- **Input**: Kinesis `inputStream` (campaign registrations, code assignments, scores)
- **Processing**:
  1. Validate record type (registration, codeAssignment, scoring, etc.)
  2. Format and trim record fields
  3. Group records by type
  4. Encode each type to Avro format
  5. Stream encoded data to S3 by type
- **Output**: S3 `campaignDataBucket/avro/{type}/YYYY/MM/DD/{uuid}.avro`
- **Side Effects**: CloudWatch metrics (in/out counts)

#### transformCodeAssignments (cmp-trnsfrm-ca)
- **Input**: Kinesis `inputStream` (code assignment records)
- **Processing**:
  1. Filter for code assignment type
  2. Dedupe records
  3. Validate against Avro schema
  4. Batch process (batchSize: 25):
     - Lookup user IDs
     - Lookup campaign IDs
     - Reject invalid records
  5. Stream valid records to `saveSelectionStream`
- **Output**: Kinesis `saveSelectionStream`
- **Side Effects**: Warnings for invalid records

#### saveSelection (cmp-save-selection)
- **Input**: Kinesis `saveSelectionStream` (code assignments + selection refreshes)
- **Processing**:
  1. Dedupe records
  2. Batch process (batchSize: 25):
     - Assign codes via `entryService`
     - Mark verdict as true for assignments
     - Update `selected_events` in DynamoDB `demandTable`
     - Send message to `verdictQueue` (SQS)
- **Output**: SQS `verdictQueue`, DynamoDB `demandTable`
- **Side Effects**: Code assignments in MongoDB, verdict records

### S3 Consumers (S3 Event → Processing → Output)

#### processScoredFiles (cmp-process-scored)
- **Trigger**: S3 upload to `scoringBucket/scored/registrants.txt`
- **Input**: Scored registrant file from Data Science
- **Processing**:
  1. Stream read from S3
  2. Transform records:
     - Mark as verdict=0 if in blacklist
     - Mark as verdict=0 if domain blacklisted
     - Apply scrubbing rules
  3. Collect stats
  4. Write to Kinesis `vfInputStream`
  5. Upload scrubbed file to `scoringBucket/scrubbed/`
  6. Send stats to Slack
- **Output**: Kinesis `vfInputStream`, S3 `scoringBucket/scrubbed/`
- **Side Effects**: Slack notification with stats

#### translateRanksToScores (cmp-trnslt-ranks)
- **Trigger**: S3 upload to `scoringBucket/fanlist/uploaded/{fanlistId}/{file}.csv`
- **Input**: Fanlist CSV with rank column
- **Processing**:
  1. Extract `campaignId` from S3 key
  2. Fetch campaign scoring type from `campaignService`
  3. Read uploaded CSV
  4. Transform ranks to scores using scoring formula
  5. Stream to Kinesis `fanlistRanksStream`
  6. Create manifest file
  7. Upload manifest to S3
- **Output**: Kinesis `fanlistRanksStream`, S3 `scoringBucket/fanlist/uploaded/{fanlistId}/manifest.json`

#### loadCodeAssignmentsToStream (cmp-load-stream-ca)
- **Trigger**: S3 upload to `scoringBucket/smsWaves/triggered/{file}`
- **Input**: SMS wave config file
- **Processing**:
  1. Fetch config file from S3
  2. Fetch wave data file from S3
  3. Remove records with invalid codes
  4. Stream valid codes (+ metadata) to Kinesis `inputStream`
- **Output**: Kinesis `inputStream`

### SDK Invoked (Direct Lambda Invoke → Processing → Output)

#### generateSmsWaveCodes (cmp-gen-codes)
- **Trigger**: MonoQL `uploadWave` (SDK invoke)
- **Input**: `{ waveFilePrefix, config: { generateOfferCode, notifyDate, ... } }`
- **Processing**:
  1. If `generateOfferCode` is true:
     - Upload prefixed config file (`generateCode_{prefix}.json`)
     - Fetch wave CSV from S3
     - Generate codes via Pacman API
     - Attach codes to wave data rows
     - Re-upload wave CSV with codes
  2. Upload final config file with `generateOfferCode=false`
- **Output**: S3 `scoringBucket/smsWaves/csv/{wave}.csv`, config file
- **Side Effects**: Codes inserted into Pacman

#### processSmsWaveFiles (cmp-process-sms-wave)
- **Trigger**: Upload service (SDK invoke)
- **Input**: `{ campaignId, dateKey, reassign, orderByPreference, singleMarket, minScore }`
- **Processing**:
  1. Fetch wave prep status from S3
  2. Update status to `TRIGGERED`
  3. Fetch campaign markets from `campaignService`
  4. Merge markets with market details file
  5. Reserve non-TM codes via `codeService`
  6. Select eligible fans via `entryService`
  7. Create local files by category (emails, masterCodes, smsSELECTED)
  8. Zip files
  9. Upload to S3 `scoringBucket/wavePrep/{campaignId}/prepped/`
  10. Clean up local files
- **Output**: S3 `scoringBucket/wavePrep/{campaignId}/prepped/prepped.{date}.zip`

#### processScheduledWave (cmp-prcss-scheduled)
- **Trigger**: Upload service (SDK invoke)
- **Input**: S3 file key (`smsWaves/csv/{filename}.csv`)
- **Processing**:
  1. Fetch wave CSV from S3
  2. Collect all codes from wave data
  3. Filter out invalid and TM codes
  4. Assign codes via `codeService.assignCodes`
- **Output**: Updated code assignments in backend
- **Side Effects**: Code assignments via code service

### Scheduled Workers (CloudWatch Event → Processing → Output)

#### mergeAvroFiles (cmp-mrg-avro)
- **Trigger**: CloudWatch schedule (daily 10:00 AM UTC, monthly day 2 at 09:00 AM UTC)
- **Input**: `{ type: 'daily' | 'monthly' }` or `{ inputPrefix }`
- **Processing**:
  1. Determine prefix (daily: YYYY/MM/DD, monthly: YYYY/MM)
  2. Query Athena for all registrations in `campaignDataBucket/avro/registration/{prefix}`
  3. Merge all files into single `merged` file
  4. Delete Athena CSV output
  5. Send message to `moveMergedAvroQueue` (SQS)
- **Output**: S3 `campaignDataBucket/avro/registration/{prefix}/merged`, SQS `moveMergedAvroQueue`

#### moveMergedAvroFiles (cmp-mv-mrgd)
- **Trigger**: SQS `moveMergedAvroQueue` message
- **Input**: S3 prefix list (single item: `campaignDataBucket/avro/registration/YYYY/MM/DD`)
- **Processing**:
  1. Fetch all registration files EXCEPT merged file
  2. Copy files to `campaignDataBucket/avro/archived/registration/YYYY/MM/DD`
  3. Delete original files
- **Output**: S3 `campaignDataBucket/avro/archived/registration/YYYY/MM/DD/`

#### saveStats (cmp-save-stats)
- **Trigger**: CloudWatch schedule (every 5 minutes)
- **Input**: CloudWatch event (ignored, only for logging)
- **Processing**:
  1. Find open campaign IDs from MongoDB `campaigns` collection
  2. For each campaign, fetch entries from MongoDB `entries` collection
  3. Calculate admin stats
  4. Save stats to MongoDB `adminStats` collection
- **Output**: MongoDB `adminStats` collection

#### slackStats (cmp-slack-stats)
- **Trigger**: CloudWatch schedule (every 30 minutes)
- **Input**: CloudWatch event (ignored, only for logging)
- **Processing**:
  1. Find open campaigns with artist from MongoDB `campaigns` collection
  2. For each campaign, gather stats from `markets` and `adminStats` collections
  3. Format payload with campaign stats
  4. Send to Slack API
- **Output**: Slack channel notifications

#### smsWaveScheduler (cmp-sms-wave-scheduler)
- **Trigger**: CloudWatch schedule (every 5 minutes)
- **Input**: CloudWatch event
- **Processing**:
  1. List config files in S3 `scoringBucket/smsWaves/scheduled/`
  2. Check each config's `notifyDate`
  3. Return config keys ready for notification
  4. Trigger step function `sms-wave-step-fn`
- **Output**: List of ready config keys, step function invocation

### Step Function Workers

#### smsWaveSend (cmp-sms-wave-send)
- **Trigger**: Step function `sms-wave-step-fn`
- **Input**: SMS wave config file S3 key
- **Processing**:
  1. Fetch config file from S3
  2. Fetch wave file from S3
  3. For each registrant:
     - Send SMS via SMS service (if eligible)
     - OR add to email queue (fallback)
  4. Collect counts (ok, sms, email, failed)
- **Output**: SMS service requests, email queue messages
- **Return**: `{ configKey, count: { ok, sms, email, failed, total } }`

## State Management

### DynamoDB Tables
- **demandTable**: Stores `selected_events` for each verdict assignment (updated by `saveSelection`)

### MongoDB Collections
- **campaigns**: Campaign metadata and status (read by `processSmsWaveFiles`, `saveStats`, `slackStats`)
- **entries**: Fan registrations and entry data (read by `processSmsWaveFiles`, `saveStats`)
- **markets**: Market details and limits (read by `processSmsWaveFiles`, `slackStats`)
- **adminStats**: Calculated stats per campaign (written by `saveStats`, read by `slackStats`)

### S3 Buckets
- **campaignDataBucket**:
  - `avro/{type}/YYYY/MM/DD/*.avro` - Encoded campaign data by type
  - `avro/archived/registration/` - Archived merged registration files
- **scoringBucket**:
  - `scored/` - Input from Data Science scoring
  - `scrubbed/` - Scrubbed scored files after processing
  - `fanlist/uploaded/` - Fanlist CSV uploads
  - `fanlist/scored/` - Scored fanlist outputs
  - `smsWaves/csv/` - SMS wave data files
  - `smsWaves/scheduled/` - Wave configs awaiting notification
  - `smsWaves/triggered/` - Wave configs ready to process
  - `wavePrep/` - Prepared wave files for campaigns

## External Integrations

| Integration | Direction | Purpose | Workers Using |
|-------------|-----------|---------|---------------|
| **Campaign Service** | Read | Fetch campaign metadata, markets | `processSmsWaveFiles`, `translateRanksToScores` |
| **Code Service** | Read/Write | Reserve codes, assign codes | `processSmsWaveFiles`, `processScheduledWave` |
| **Entry Service** | Read/Write | Select eligible fans, assign codes | `processSmsWaveFiles`, `saveSelection` |
| **User Service** | Read | Lookup user IDs | `transformCodeAssignments` |
| **Pacman API** | Write | Generate offer codes | `generateSmsWaveCodes` |
| **SMS Service** | Write | Send SMS messages | `smsWaveSend` |
| **SFMC** | Write | Send marketing emails | (via queue) |
| **Slack API** | Write | Send campaign stats notifications | `slackStats`, `processScoredFiles` |
| **Athena** | Query | Query merged Avro registrations | `mergeAvroFiles` |
| **SQS Verdict Queue** | Write | Verdict assignments for downstream processing | `saveSelection` |
| **Kinesis inputStream** | Write | Ingest code assignments, scores | Multiple loaders |
| **Kinesis saveSelectionStream** | Read/Write | Transform → Save pipeline | `transformCodeAssignments` → `saveSelection` |
| **Kinesis vfInputStream** | Write | Scored registrant data | `processScoredFiles` |
| **Kinesis fanlistRanksStream** | Write | Fanlist scoring data | `translateRanksToScores` |

## Data Transformation Pipeline

### Typical Record Journey

**Example: Code Assignment**

1. **Source**: External system (MySQL, Mongo, API) → `loadCodeAssignmentsToStream`
2. **Ingestion**: Kinesis `inputStream`
3. **Transformation**: `transformCodeAssignments`
   - Validate schema
   - Lookup user ID
   - Lookup campaign ID
   - Dedupe
4. **Selection**: Kinesis `saveSelectionStream` → `saveSelection`
   - Assign codes
   - Update DynamoDB `demandTable`
   - Send to `verdictQueue`
5. **Storage**: `saveCampaignData`
   - Encode as Avro
   - Write to S3 `campaignDataBucket/avro/codeAssignment/`
6. **Archival**: `mergeAvroFiles` (scheduled)
   - Merge daily files
   - Archive to `avro/archived/`

## Error Handling & Retries

- **Kinesis consumers**: Automatic retries by AWS (configurable batch size, retry attempts)
- **SQS consumers**: Dead-letter queues for failed messages, maxRetryCount in config
- **S3 operations**: Retry logic in AWS SDK
- **Service calls**: Retry logic in service wrappers (e.g., Pacman retries)
- **Validation failures**: Records logged and filtered out, continue processing remaining records
- **Lambda failures**: CloudWatch alarms, manual investigation

## Data Flow Characteristics

- **Asynchronous**: Workers triggered by events, process independently
- **Batch processing**: Kinesis/SQS consumers process records in batches
- **Schema-driven**: Avro schemas enforce data contracts
- **Event sourcing**: Kinesis streams act as event logs
- **Idempotency**: Dedupe logic in transform workers
- **Fan-out**: Single input stream feeds multiple consumers
- **Fan-in**: Multiple workers write to shared S3 buckets
- **Backpressure**: Kinesis shard limits, Lambda concurrency limits
