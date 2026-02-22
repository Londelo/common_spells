# Domain Concepts - vf-api-workers

## Core Entities

| Entity | Description |
|--------|-------------|
| **Fan** | An individual participating in a Verified Fan campaign, identified by globalUserId or memberId |
| **Campaign** | A Verified Fan registration campaign tied to a specific event or presale opportunity |
| **Score** | Numeric value representing a fan's verification strength (higher = more verified behavior) |
| **Registration** | A fan's submission to participate in a specific campaign |
| **Verdict** | Final determination of whether a fan is verified, rejected, or selected for ticket access |
| **Rank** | Priority level assigned to a fan based on market preference (rank 0 = highest priority) |
| **Market** | Geographic or event-specific segmentation used for ranking and allocation |
| **Meta Counts** | Aggregate statistics tracking verified, rejected, and selected fan counts per campaign |
| **Nudetect Score** | Third-party fraud detection score from NuData (scoreBand: risk level) |
| **Fanlist** | External dataset of fans with pre-computed scores (not from registration flow) |
| **Event** | Concert, show, or ticketed experience that fans are attempting to access |

## Business Rules

### Verification Rules
- **Verification Status**: A fan is `isVerified: true` if their score meets campaign threshold, `false` otherwise
- **Verdict Assignment**: Verdict can be null (pending), true (selected for tickets), or false (rejected)
- **State Transitions**: A fan can move between verified and rejected as their score updates, but transitions are tracked

### Ranking Rules
- **Rank Calculation**: Rank is determined by market preference order and fan's score within that market
- **Rank 0 Significance**: Only rank 0 fans (top-ranked for their events) have their scoring data sent to Entry Service
- **Rank Format**: Stored as string ("0", "1", "2", etc.) extracted from globalUserId suffix

### Count Management Rules
- **New Record Counts**: When a fan is first scored, increment verified or rejected count by 1
- **Update Counts**: When isVerified flips, adjust both old and new state counts (+1 new, -1 old)
- **Selection Counts**: When verdict changes, adjust selected count (+1 if selected, -1 if deselected)
- **Meta Record Structure**: Counts stored at `PK: campaign:{campaignId}, SK: meta:counts` with fields: verified, rejected, selected

### Data Quality Rules
- **Schema Validation**: Records must pass schema validation before processing
- **Deduplication**: Fanlist scores deduplicated by memberId or email, keeping highest score
- **Invalid Record Handling**: Invalid records logged but don't block valid records
- **Rank Filtering**: Only records with valid rank (not null/empty) are processed

### Notification Rules
- **Slack Notification Trigger**: Only post to Slack when counts differ from last posted counts (stored in meta:slack:counts)
- **Requeue Logic**: If expected count doesn't match current count, requeue message for retry (counts still stabilizing)
- **Duplicate Prevention**: Compare current counts to meta:slack:counts before posting

### Storage Rules
- **Fan Primary Key Format**: `PK: fan:{globalUserId}, SK: campaign:{campaignId}` for registration-based scores
- **Fanlist Primary Key Format**: `PK: fan/sid/email:{identifier}, SK: campaign:{campaignId}` for fanlist scores
- **Meta Record Exclusion**: DynamoDB stream processing ignores records where SK starts with "meta:"
- **Timestamp Updates**: Every score update sets `updated` field to current ISO timestamp

## Terminology

| Term | Definition |
|------|------------|
| **Scrubbed File** | CSV file containing scored and cleaned registration data, produced by campaign pipeline |
| **Scores Stream** | Kinesis stream (`scoresStream`) carrying validated fan scoring records |
| **Campaign Data Stream** | Kinesis stream (`campaignDataStream`) carrying fanlist scoring updates |
| **Demand Table** | DynamoDB table (`demandTable`) storing fan scores, verification states, and meta counts |
| **Verdict Reporter Queue** | SQS queue (`verdictReporterQueue`) for asynchronous Slack notification jobs |
| **Local Fanscore** | Campaign-specific score component (distinct from account-level score) |
| **Account Fanscore** | Global fan behavior score across all Ticketmaster activity |
| **Band Score** | Artist/band-specific scoring component |
| **Global User ID** | Unique identifier for a fan across all Ticketmaster systems |
| **Member ID** | Legacy or alternate identifier for a fan, used in some contexts |
| **Hbase** | Market or location identifier used for marketId lookups |
| **Nudetect Score Band** | Risk categorization from NuData fraud detection (e.g., "low", "medium", "high") |
| **Write Status** | Classification of DynamoDB operation result: success, created, updated, unchanged, invalid, failed |
| **Partition Key** | Used in Kinesis writes to distribute records across shards (e.g., globalUserId, memberId, email) |
| **Correlation ID** | Request tracing identifier passed through processing pipeline for debugging |
| **Meta Record** | Special DynamoDB record (SK starts with "meta:") used for storing aggregate data (counts, config) |

## Data Models

### Fan Score Record (DynamoDB)

```typescript
{
  PK: string,                    // "fan:{globalUserId}"
  SK: string,                    // "campaign:{campaignId}"
  score: number,                 // Overall verification score (0-1)
  localFanscore: number,         // Campaign-specific score component
  accountScore: number,          // Account-level score
  bandScore?: number,            // Band/artist-specific score
  isVerified: boolean,           // Verification status (true = verified)
  verdict: boolean | null,       // Selection status (true = selected, false = rejected, null = pending)
  codes: string[],               // Verification code flags
  selectedEvents: object,        // Events fan is selected for
  tags: string[],                // Review notes or flags
  origin: {
    nudetect: {
      score: number,             // NuData fraud score
      scoreBand: string          // Risk band ("low", "medium", "high")
    }
  },
  date: {
    updated: string              // ISO timestamp of last update
  },
  memberId?: string,             // Legacy fan identifier
  globalUserId: string,          // Primary fan identifier
  campaignId: string,            // Campaign identifier
  rank?: string,                 // Fan's rank in campaign ("0" = highest)
  events?: object,               // Event-specific data
  registrationScore?: number     // Synonym for localFanscore
}
```

### Meta Counts Record (DynamoDB)

```typescript
{
  PK: string,           // "campaign:{campaignId}"
  SK: string,           // "meta:counts" or "meta:slack:counts"
  verified: number,     // Count of verified fans
  rejected: number,     // Count of rejected fans
  selected: number      // Count of selected fans
}
```

### Kinesis Stream Record

```typescript
{
  data: {
    campaignId: string,
    globalUserId: string,
    memberId?: string,
    email?: string,
    score: number,
    localFanscore: number,
    accountFanscore: number,
    isVerified: boolean,
    verdict?: boolean,
    rank: string,
    events?: object,
    selectedEvents?: object,
    origin: {
      nudetect: {
        score: number,
        scoreBand: string
      }
    },
    __meta?: {
      correlation: string,
      date: number
    }
  },
  partitionKey: string   // globalUserId, memberId, or email for shard distribution
}
```

### S3 Scrubbed File Record (CSV Row)

```csv
globalUserId,id,campaign_id,score,localFanscore,accountFanscore,isVerified,nudetect.score,nudetect.scoreBand,review_notes,...
```

**Key Fields**:
- `globalUserId`: Unique fan identifier
- `id`: Alternate identifier with rank suffix (e.g., "globalUserId001" for rank 1)
- `campaign_id`: Campaign identifier
- `score`: Overall score
- `localFanscore`: Campaign-specific score
- `accountFanscore`: Account-level score
- `isVerified`: Boolean verification status
- `nudetect.score`: Fraud detection score
- `nudetect.scoreBand`: Risk level
- `review_notes`: Tags or flags
- `hbase`: Market identifier

### Entry Service Scoring Payload

```typescript
{
  records: [
    {
      memberId: string,
      globalUserId: string,
      phoneType?: string,
      phone?: string,
      phoneConfirmedDate?: string,
      email: string,
      firstName?: string,
      lastName?: string,
      verdict: boolean,              // Maps from isVerified
      score: number,
      localFanscore: number,
      bandScore?: number,
      marketId: string,              // Resolved from hbase via Campaign Service
      locale?: string
    }
  ]
}
```

### Verdict Reporter SQS Message

```json
{
  campaignId: "string",
  count: 10000
}
```

### CloudWatch Metrics Emitted

**Metric Dimensions**:
- `input`: Total records received
- `success`: Successfully processed records
- `created`: New records created
- `updated`: Existing records updated
- `unchanged`: Records with no changes
- `invalid`: Schema validation failures
- `failed`: Processing errors
- `in`: Input count (streaming context)
- `out`: Output count (streaming context)
- `valid`: Valid records count
- `duplicate`: Duplicate records filtered

## Data Flow & Transformations

### Transformation: CSV → Kinesis Stream
**Input**: CSV row from S3 scrubbed file
**Processing**:
1. Parse CSV with csv-parse library
2. Assign rank based on globalUserId suffix and market preference
3. Validate against schema (IsValidRecord)
4. Normalize and combine keys (NormalizeAndCombineByKeys)
5. Format for Kinesis: `{ data: record, partitionKey: globalUserId }`
**Output**: Kinesis record in scoresStream

### Transformation: Kinesis → DynamoDB
**Input**: Kinesis stream record with fan score
**Processing**:
1. Extract campaignId and globalUserId
2. Format primary key: `{ PK: "fan:{globalUserId}", SK: "campaign:{campaignId}" }`
3. Build update expression for score, isVerified, registrationScore, accountScore, tags, nudetect fields
4. Set updated timestamp
5. Execute updateMany with upsert logic
**Output**: DynamoDB record in demandTable

### Transformation: DynamoDB Stream → Count Delta
**Input**: DynamoDB stream event (INSERT or MODIFY)
**Processing**:
1. Extract old and new values for isVerified, verdict
2. Determine if new record (INSERT) or change (MODIFY)
3. Calculate delta:
   - New verified: +1 verified or +1 rejected
   - isVerified flip: +1 new state, -1 old state
   - verdict change: +1 or -1 selected
4. Group deltas by campaignId
5. Merge with existing meta:counts
**Output**: Updated meta:counts record in DynamoDB

### Transformation: Fan Score → Entry Service Payload
**Input**: Kinesis record with rank 0
**Processing**:
1. Filter for records with events[0] (rank 0)
2. Fetch market data from Campaign Service
3. Map hbase field to marketId
4. Normalize to Entry Service schema:
   - `verdict` ← `isVerified`
   - Resolve marketId from hbase
   - Include phone, email, name, scores
**Output**: HTTP POST to Entry Service `/campaigns/{campaignId}/scoring`

### Transformation: Fanlist CSV → DynamoDB + Stream
**Input**: CSV row with member ID/email and score
**Processing**:
1. Validate identifier (member ID or email present)
2. Normalize email (lowercase, trim)
3. Deduplicate by identifier, keep highest score
4. Format primary key: `{ PK: "fan/sid/email:{identifier}", SK: "campaign:{campaignId}" }`
5. Upsert to DynamoDB
6. Extract successful writes from results
7. Add metadata: `{ __meta: { correlation, date } }`
8. Format for Kinesis: `{ data: record, partitionKey: globalUserId || memberId || email }`
**Output**: DynamoDB record + Kinesis record in campaignDataStream
