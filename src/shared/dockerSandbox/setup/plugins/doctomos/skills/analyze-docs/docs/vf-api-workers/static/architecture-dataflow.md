# Data Flow - vf-api-workers

## Primary Flow

This system processes fan verification and scoring data through a serverless event-driven pipeline. Data flows from external sources (S3, API requests) through AWS services (Kinesis, DynamoDB) and triggers Lambda workers to process, transform, and aggregate results.

```
External Sources
       │
       ├─ S3 (scored CSV files) ──────────────────────────────────────────┐
       │                                                                   │
       └─ AppSync (API requests) ──────────────────────────────────────┐  │
                                                                        │  │
┌───────────────────────────────────────────────────────────────────┐ │  │
│                         EVENT SOURCES                              │ │  │
└───────────────────────────────────────────────────────────────────┘ │  │
                                                                        │  │
       ┌─────────────────────────────────────────────────────────────┘  │
       │                                                                  │
       ▼                                                                  ▼
┌─────────────────┐                                          ┌──────────────────────┐
│ AppSync Request │                                          │   S3 ObjectCreated   │
│  (API Gateway)  │                                          │  scoringBucket       │
└────────┬────────┘                                          └──────────┬───────────┘
         │                                                              │
         ├─ lookupPhoneScore ───► Phone Score Lookup                   │
         └─ proxyCampaignService ─► Campaign Service Proxy             │
                                                                        ▼
                                                            ┌──────────────────────┐
                                                            │ loadScoresToStream   │
                                                            │  (S3 Consumer)       │
                                                            └──────────┬───────────┘
                                                                       │
                        ┌──────────────────────────────────────────────┤
                        │                                              │
                        ▼                                              ▼
              ┌─────────────────┐                           ┌─────────────────┐
              │ Kinesis Stream  │                           │   SQS Queue     │
              │  scoresStream   │                           │ verdictReporter │
              └────────┬────────┘                           └─────────┬───────┘
                       │                                              │
        ┌──────────────┼───────────────────┐                         │
        │              │                   │                          │
        ▼              ▼                   ▼                          ▼
┌───────────────┐ ┌────────────────┐ ┌──────────────────┐  ┌────────────────┐
│loadScoresToDB │ │saveEntryScoring│ │saveFanlistScores │  │verdictReporter │
│(Kinesis)      │ │(Kinesis)       │ │(Kinesis)         │  │(SQS)           │
└───────┬───────┘ └────────┬───────┘ └──────────┬───────┘  └────────┬───────┘
        │                  │                     │                   │
        ▼                  ▼                     ▼                   │
┌─────────────────────────────────────────────────────────┐         │
│              DynamoDB: demandTable                      │         │
│  PK: campaign:${id}    SK: member:${id}                │         │
│  PK: campaign:${id}    SK: meta:counts                 │         │
│  PK: fan/sid/email:*   SK: campaign:${id}              │         │
└─────────────────────┬───────────────────────────────────┘         │
                      │                                             │
                      ▼                                             │
            ┌─────────────────────┐                                │
            │ DynamoDB Stream     │                                │
            │  (demandTable)      │                                │
            └──────────┬──────────┘                                │
                       │                                            │
                       ▼                                            │
            ┌──────────────────────┐                               │
            │ processSavedScores   │                               │
            │ (DynamoDB Stream)    │                               │
            └──────────┬───────────┘                               │
                       │                                            │
                       │  (Updates meta:counts)                    │
                       └────────────────► demandTable              │
                                                                    │
                                    ┌───────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │  Slack Channel  │
                          │  (Notification) │
                          └─────────────────┘
```

## Request/Response Cycle

### AppSync Resolvers (API Entry Points)

**lookupPhoneScore**
```
1. AppSync Request → Lambda(lookupPhoneScore)
2. Middleware Pipeline:
   - correlation (generate ID)
   - Tracing (OpenTelemetry)
   - transformAppSyncInput (extract arguments)
   - services (inject AWS clients, HTTP clients)
   - resultHandler (error handling)
3. Business Logic:
   - Query phone score from external service (TeleSign)
   - Return score data
4. Response → AppSync → Client
```

**proxyCampaignService**
```
1. AppSync Request → Lambda(proxyCampaignService)
2. Middleware Pipeline:
   - correlation, Tracing, transformAppSyncInput, services, resultHandler
3. Business Logic:
   - Proxy request to campaign-service HTTP API
   - Return campaign data by eventId
4. Response → AppSync → Client
```

### Event-Driven Processing

**S3 → Kinesis → DynamoDB Flow**

1. **S3 Event (loadScoresToStream)**
```
S3 ObjectCreated Event
  → Lambda(loadScoresToStream)
    → Read S3 CSV file (scored registrants)
    → FilterAndPutToStream:
      - Set rank based on market preference
      - Validate schema
      - Filter by rank
      - Normalize records
    → Put records to Kinesis (scoresStream)
    → Send SQS message (verdictReporterQueue)
    → Return: { count: { in, out, valid, invalid, failed } }
```

2. **Kinesis Event (Multiple Consumers)**

**loadScoresToDynamoDB**
```
Kinesis (scoresStream) Record
  → Lambda(loadScoresToDynamoDB)
    → BatchUpdateRegistrations:
      - Normalize DynamoDB update structure
      - Upsert records to demandTable
      - Track: created, updated, unchanged, invalid, failed
    → Emit CloudWatch metrics
    → Return: { in, success, created, updated, unchanged, invalid, failed }
```

**saveEntryScoring**
```
Kinesis (scoresStream) Record
  → Lambda(saveEntryScoring)
    → Filter records with rank0 (events[0] exists)
    → Group by campaignId
    → HTTP POST to entry-service /scoring endpoint
    → Upsert scoring data to MongoDB
    → Return: { records, input, scoring, inserted, entries, updated, found }
```

**saveFanlistScores**
```
Kinesis (scoresStream) Record
  → Lambda(saveFanlistScores)
    → BatchTransformStream:
      - Validate memberIds
      - Deduplicate
      - Attach campaign properties
    → Save to DynamoDB (demandTable)
      - PK: 'fan/sid/email:${identifier}'
      - SK: 'campaign:${campaignId}'
    → Put successful records to Kinesis (campaignDataStream)
    → Send SQS message (verdictReporterQueue)
    → Return: { input: {in, invalid, duplicate, valid}, dynamo: {in, failed, out, rejected}, stream: {in, failed, out} }
```

3. **DynamoDB Stream Event (processSavedScores)**
```
DynamoDB Stream (demandTable changes)
  → Lambda(processSavedScores)
    → Filter: Reject records with SK starting with 'meta:'
    → Normalize: Extract oldItem and newItem for changed fields
    → Calculate count changes:
      - isVerified changed? → Update verified/rejected counts
      - verdict changed? → Update selected counts
    → Aggregate counts by campaignId
    → Upsert meta:counts records:
      - PK: 'campaign:${campaignId}'
      - SK: 'meta:counts'
      - Data: { verified, rejected, selected }
    → Return: { count: numberOfRecordsProcessed }
```

4. **SQS Event (verdictReporter)**
```
SQS Message (verdictReporterQueue)
  → Lambda(verdictReporter)
    → Filter by campaignId
    → Lookup meta:counts from demandTable
    → Check meta:slack:counts (last posted counts)
    → If counts match:
      - Bypass (already posted)
    → If counts don't match:
      - Either requeue message (counts still updating)
      - Or post to Slack channel with scoring attachment
    → Update meta:slack:counts
    → Return: { counts: { requeue: {success}, slack: {success}, input } }
```

## State Management

**DynamoDB Tables as State Stores**

1. **demandTable** (Primary state store)
   - Fan scoring data: `PK: campaign:${campaignId}, SK: member:${memberId}`
   - Aggregated counts: `PK: campaign:${campaignId}, SK: meta:counts`
   - Last Slack post: `PK: campaign:${campaignId}, SK: meta:slack:counts`
   - Fanlist scores: `PK: fan/sid/email:${identifier}, SK: campaign:${campaignId}`

2. **verificationsTable** (Referenced but not shown in code)
   - Historical verification data (inferred from config)

3. **fanIdentityTable** (Referenced but not shown in code)
   - Fan identity mappings (inferred from config)

**Stream-Based Processing**
- Kinesis streams provide at-least-once delivery
- Workers are idempotent (can process same record multiple times safely)
- DynamoDB streams capture all modifications for aggregation

**Message Queuing**
- SQS (verdictReporterQueue) decouples scoring from notification
- Allows retry logic for Slack posting
- MAX_RETRY_COUNT: 0 (fail fast, no retries in config)

## Event Processing

**Batch Processing**
- Most workers process arrays of records
- Use `@verifiedfan/batch-fn` and `@verifiedfan/map-utils` for parallel processing
- DynamoDB batch operations via `@verifiedfan/aws` abstractions

**Error Handling**
- Result handler middleware catches errors per invocation
- Individual record failures tracked in return counts (failed, invalid, rejected)
- CloudWatch metrics emitted on errors (ERROR_METRIC)
- Logs structured JSON to CloudWatch with correlation IDs

**Correlation Tracking**
- Top-level correlation per Lambda invocation
- Per-record correlation IDs via `setRecordCorrelations` middleware
- Flows through to OpenTelemetry traces and logs

## External Integrations

| Integration | Direction | Purpose | Workers Using |
|-------------|-----------|---------|---------------|
| S3 (scoringBucket) | Read | CSV files with scored registrants | loadScoresToStream, saveFanlistScores |
| Kinesis (scoresStream) | Read/Write | Fan score event stream | loadScoresToStream (write), loadScoresToDynamoDB (read), saveEntryScoring (read), saveFanlistScores (write) |
| Kinesis (campaignDataStream) | Write | Campaign data event stream | saveFanlistScores |
| DynamoDB (demandTable) | Read/Write | Fan scores, counts, metadata | loadScoresToDynamoDB (write), processSavedScores (read/write), verdictReporter (read) |
| DynamoDB Stream | Read | Change data capture | processSavedScores |
| SQS (verdictReporterQueue) | Read/Write | Verdict notification queue | loadScoresToStream (write), saveFanlistScores (write), verdictReporter (read) |
| Campaign Service (HTTP) | Read | Campaign metadata | proxyCampaignService, saveFanlistScores |
| Entry Service (HTTP) | Write | Scoring data to MongoDB | saveEntryScoring |
| User Service (HTTP) | Read | User data (inferred) | Not shown in examined code |
| Slack (HTTP Webhook) | Write | Notification messages | verdictReporter |
| TeleSign (HTTP API) | Read | Phone score lookup | lookupPhoneScore |
| AppSync (GraphQL) | Read | API requests | lookupPhoneScore, proxyCampaignService |

## Data Transformations

**S3 CSV → Kinesis JSON**
- CSV parsing with `csv-parse`
- Schema validation via `ValidateSchema`
- Rank calculation and filtering
- Normalization to standard format

**Kinesis → DynamoDB**
- Base64 decode of Kinesis data
- JSON parsing
- DynamoDB update expression generation
- Conditional updates (upsert logic)

**DynamoDB Stream → Aggregated Counts**
- Change record parsing (INSERT, MODIFY, REMOVE)
- Old/new image comparison
- Count delta calculation
- Merge counts by campaignId

**DynamoDB → Slack Message**
- Fetch counts from demandTable
- Format as Slack attachment JSON
- Compare to previous post (meta:slack:counts)
- Include campaign metadata
