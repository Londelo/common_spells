# Purpose - vf-api-workers

## What This Does

This repository processes and manages fan verification scoring data for Ticketmaster's Verified Fan platform. It consumes scoring data from various sources, stores it in DynamoDB, tracks verification status changes, and notifies stakeholders about scoring results.

## Business Context

The Verified Fan program requires real-time processing of fan scoring data to determine which fans are verified and eligible for ticket purchasing opportunities. This system exists to ingest scored fan data, maintain accurate verification states, update counts, and ensure visibility into scoring operations through Slack notifications. It bridges the gap between the scoring pipeline (which generates fan scores) and the operational systems (which use that data to grant ticket access).

## Target Users/Consumers

- **End Users**: Fans participating in Verified Fan campaigns (indirectly - their verification status is determined by this system)
- **Campaign Managers**: Receive Slack notifications about scoring completion and verification counts
- **Entry Service**: Receives scoring data for fan records with rank 0 events
- **Campaign Service**: Proxy access for retrieving campaign information by event ID
- **Downstream Systems**: Consume data from Kinesis streams (scoresStream, campaignDataStream) to react to scoring changes

## Key Business Capabilities

- **Real-time Score Processing**: Ingests fan scoring data from S3 files and processes thousands of records in batches
- **Verification State Management**: Tracks and maintains fan verification status (verified, rejected, selected) across campaigns
- **Automated Reporting**: Notifies stakeholders via Slack when scoring completes and verification counts change
- **Data Distribution**: Publishes scoring events to Kinesis streams for downstream consumption
- **Count Reconciliation**: Maintains accurate counts of verified, rejected, and selected fans per campaign

## Business Requirements & Constraints

- REQ-001: System must process scoring files from S3 within minutes of file creation
- REQ-002: Verification state changes must be tracked in real-time to maintain accurate counts
- REQ-003: Slack notifications must only be sent when counts actually change to reduce noise
- REQ-004: Fan scores must be validated against schema before processing
- REQ-005: System must handle duplicate records by deduplication based on member/global user ID
- REQ-006: Records must be filtered by rank - only rank 0 records flow to entry service
- REQ-007: Scoring data must be available in DynamoDB for API queries
- REQ-008: Failed records must not block processing of successful records

## Core Business Rules

- **Ranking Priority**: Market preference determines fan rank; higher-ranked fans get priority
- **Verification States**: Fans can be verified (eligible), rejected (not eligible), or selected (chosen for access)
- **Count Updates**:
  - New verified fan: +1 verified
  - Verification status flip: +1 to new state, -1 from old state
  - New selection: +1 selected
  - Deselection: -1 selected
- **Slack Notification Logic**:
  - Only notify if current counts differ from last-reported counts
  - Compare against meta:slack:counts record to prevent duplicate notifications
  - If counts match last notification, bypass Slack post
- **Rank 0 Rule**: Only fans with rank 0 (top-ranked event) get their scoring saved to entry service
- **Deduplication**: When processing fanlist scores, deduplicate by member ID or email, keeping highest score
- **Requeue Logic**: If counts don't match expected values, requeue message for retry instead of posting to Slack

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Scoring data processed | Put records to Kinesis | scoresStream | After validating and normalizing records from S3 |
| Fan scores saved to DynamoDB | Put records to Kinesis | campaignDataStream | After successful DynamoDB write for fanlist scores |
| Scoring file processed | Send SQS message | verdictReporterQueue | After S3 file fully processed |
| Verdict counts ready | Post to Slack | slackScrubbedChannel | When counts change from last notification |
| Campaign query | HTTP proxy request | Campaign Service | When AppSync resolver requests campaigns by event ID |
| Rank 0 scores | HTTP POST | Entry Service | When processing fans with top-ranked events |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| S3 scoringBucket | s3:ObjectCreated (scrubbed folder) | Load scores to Kinesis stream | Immediate |
| S3 scoringBucket | s3:ObjectCreated (fanlist/scored folder) | Save fanlist scores to DynamoDB | Immediate |
| Kinesis scoresStream | Stream records | Upsert fan scores to DynamoDB | Real-time batch processing |
| Kinesis scoresStream | Stream records | Save entry scoring data | Real-time batch processing |
| DynamoDB demandTable | DynamoDB Stream | Process score changes and update counts | Real-time |
| SQS verdictReporterQueue | SQS messages | Report verdict counts to Slack | Within seconds |

### Service Dependencies

**Required Services**:
- **Campaign Pipeline Workers**: Produces scrubbed CSV files in S3 scoringBucket (upstream dependency)
- **Campaign Service**: Provides campaign metadata for scoring operations
- **Entry Service**: Receives scoring data for fan entries
- **DynamoDB demandTable**: Primary data store for fan scores and verification status
- **Kinesis scoresStream**: Event stream for distributing scoring data
- **Kinesis campaignDataStream**: Event stream for fanlist scoring updates
- **S3 scoringBucket**: Source of truth for scored registrant files
- **SQS verdictReporterQueue**: Queue for asynchronous Slack notifications
- **Slack**: Destination for scoring completion notifications

## Success Metrics

- **Processing Success Rate**: > 99% of valid records successfully written to DynamoDB
- **Count Accuracy**: 100% accuracy in verified/rejected/selected counts per campaign
- **Notification Timeliness**: Verdict reports posted to Slack within 60 seconds of file processing completion
- **Stream Delivery**: > 99% of records successfully published to Kinesis streams
- **Deduplication Effectiveness**: 0 duplicate fan records in DynamoDB per campaign
- **Invalid Record Handling**: < 5% invalid records per scoring file (higher indicates data quality issues upstream)
