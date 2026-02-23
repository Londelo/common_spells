# Purpose - campaign-workers

## What This Does

This repository contains AWS Lambda workers that automate the campaign pipeline for Verified Fan. It processes fan data through multiple stages - from scoring fans based on their activity to generating access codes, preparing SMS wave files, and sending notifications. These workers handle the operational workflow that determines which fans get selected for campaigns and how they're notified.

## Business Context

When Ticketmaster runs a Verified Fan campaign (presales, exclusive offers, etc.), thousands or millions of fans register. This system exists to solve the problem of fairly selecting and notifying eligible fans at scale. It automates the entire pipeline from analyzing fan eligibility, scoring their likelihood of being genuine fans, generating unique access codes, and delivering SMS/email notifications with those codes.

Without these workers, campaign operations would require massive manual effort and couldn't scale to handle high-volume campaigns with tight deadlines. The system enables fair, automated, and auditable fan selection while preventing bot abuse through scoring algorithms.

## Target Users/Consumers

**Primary Consumers:**
- **Campaign Management System** - Orchestrates these workers via Step Functions/SQS
- **Campaign Operations Team** - Monitors campaign execution through Slack notifications and stats
- **Marketing Teams** - Indirectly benefit from automated wave processing and notifications

**Data Consumers:**
- Campaign Data Lake (Athena/S3) - Receives processed campaign data
- Analytics Systems - Consume merged Avro files for reporting
- Code Management Service - Receives code assignments
- SMS/Email Services (Salesforce Marketing Cloud, TM SMS) - Deliver notifications to fans

## Key Business Capabilities

- **Fan Scoring & Validation** - Analyzes fan data to assign eligibility scores, detect fraudulent patterns, and filter out blacklisted users
- **Code Generation & Assignment** - Creates unique access codes for campaigns and assigns them to selected fans
- **SMS Wave Processing** - Prepares batches of fans for notification, organizing by market and eligibility
- **Multi-Channel Notification Delivery** - Sends SMS and email notifications with access codes to fans
- **Campaign Data Aggregation** - Merges campaign data into queryable formats for analytics
- **Real-Time Monitoring** - Provides Slack notifications and statistics for campaign health monitoring

## Business Requirements & Constraints

### Data Processing Requirements
- **REQ-001**: Process fan scoring files within minutes of upload to meet campaign timelines
- **REQ-002**: Handle campaign files containing millions of fan records without data loss
- **REQ-003**: Validate all phone numbers and email addresses before notification attempts
- **REQ-004**: Support international phone numbers only when explicitly allowed by campaign configuration
- **REQ-005**: Merge and consolidate campaign data files daily and monthly for analytics queries

### Code Management Requirements
- **REQ-006**: Generate unique, non-duplicate access codes for each eligible fan
- **REQ-007**: Assign codes to fans only once per campaign to prevent duplicate access
- **REQ-008**: Support both TM-managed codes and external partner code systems (Pacman)
- **REQ-009**: Reserve external codes in batches before assignment to prevent race conditions

### Notification Requirements
- **REQ-010**: Send SMS notifications at configured wave times with rate limiting
- **REQ-011**: Send email notifications with HTML templates via Salesforce Marketing Cloud
- **REQ-012**: Track notification delivery success/failure rates per wave
- **REQ-013**: Support wave-based phased rollout (not all fans notified at once)
- **REQ-014**: Include campaign-specific metadata in all notifications

### Data Quality Requirements
- **REQ-015**: Reject registrations with blacklisted email addresses
- **REQ-016**: Validate email domains against known disposable/fraudulent patterns
- **REQ-017**: Normalize and validate all data before storage in campaign data lake
- **REQ-018**: Enforce Avro schema validation to prevent data corruption
- **REQ-019**: Limit merged file sizes to 1.2GB to prevent query timeouts

### Monitoring & Observability Requirements
- **REQ-020**: Send Slack alerts for all processing failures with error details
- **REQ-021**: Publish processing statistics after each wave completion
- **REQ-022**: Track counts (in/out/failed) for every data transformation step
- **REQ-023**: Retry wave preparation up to 2 times before marking as failed

## Core Business Rules

### Scoring & Selection Rules
- **Fan scores are bucketed into bands (high: 0.95-1.0, mid: 0.80-0.95, low: 0.22-0.80)** to introduce randomness within quality tiers
- **Fans without confirmed phone numbers are tagged but may still be selected** based on campaign configuration
- **International phone numbers are rejected by default** unless campaign explicitly enables `allowIntlPhones`
- **Blacklisted email domains automatically disqualify fans** from selection regardless of score
- **Email whitelist patterns take precedence** over blacklist rules

### Code Assignment Rules
- **TM codes (placeholder value "TM") are never assigned to the code stream** - they're filtered out
- **Code assignments must include globalUserId** - records without valid user IDs are rejected
- **Each fan receives exactly one code per campaign** - duplicate assignments are prevented
- **External codes must be reserved before assignment** to prevent inventory conflicts
- **Code assignments are immutable** once created in the stream

### Wave Processing Rules
- **Wave files must be prepared at least 1 day before notify date** based on `notifyDate` configuration
- **Code validity spans from 1 day before notify date to 1 year after** to handle timezone edge cases
- **Wave preparation attempts are limited to 2 retries** before requiring manual intervention
- **Market-specific selection limits are enforced** when processing SMS waves
- **Files are organized by type** (email, SMS, master codes) for downstream consumption

### Data Consolidation Rules
- **Campaign data is merged daily and monthly** to optimize query performance
- **Only registration type data is currently supported** for merging (enforced by schema validation)
- **Merged files exceeding 1.2GB are rejected** and source files remain unmerged
- **Merged files replace individual source files** after successful Athena query execution
- **Source files are archived to /merged/ prefix** after consolidation

### Notification Delivery Rules
- **SMS messages are sent in batches of 200 concurrent requests** to respect rate limits
- **Email notifications are queued to SQS** for async processing by email service
- **Failed notifications are tracked but do not block the wave** - reporting shows final counts
- **Notification content includes campaign name, wave date, and access code** as core metadata
- **Wave config status files track attempt count, timing, and completion state** for monitoring

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Scored file processed | Campaign data records | Kinesis saveSelectionStream | Real-time as files are processed |
| Code assignments created | Code assignment records | Kinesis inputStream | When wave files are triggered/completed |
| Code assigned to campaign | Update code status | Code Service API | During scheduled wave processing |
| Campaign data merged | Merged Avro file ready | SQS moveMergedAvroQueue | After Athena query completes |
| SMS wave sent | SMS messages | TM SMS Service | At configured wave notify time |
| Email wave sent | Email notification jobs | SQS smsWaveEmailQueue | At configured wave notify time |
| Processing error | Slack alert with details | Slack channels | On any worker failure |
| Wave completed | Statistics summary | Slack channels | After wave/merge completion |
| Campaign data ready | Avro files in S3 | S3 campaignDataBucket | Continuously during processing |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| S3 scoring bucket | New scored file (.txt) | Process scores, validate, transform to CSV | Triggered immediately on file upload |
| S3 scoring bucket | Ranked file uploaded | Translate ranks to scores | Triggered on ranking file upload |
| Step Function | SMS wave codes needed | Generate external codes via Pacman | Scheduled wave preparation |
| Step Function | Process scheduled wave | Assign codes to campaign | Scheduled wave execution |
| Step Function | Process SMS wave files | Select eligible fans, prepare zip files | Scheduled wave preparation |
| Step Function | Send SMS wave | Read CSV, send notifications | At configured notify time |
| S3 scoring bucket | Wave config triggered | Load code assignments to stream | When wave moves to triggered state |
| S3 campaign data bucket | Daily/monthly trigger | Merge Avro files via Athena | Scheduled daily/monthly |
| SQS moveMergedAvroQueue | Merge completed | Archive source files | After merge success |

### Service Dependencies

| Service | Purpose | Critical Operations |
|---------|---------|---------------------|
| Campaign Service | Fetch campaign configuration | Get campaign name, options, market data |
| Code Service (tm-pacman) | Code generation & assignment | Reserve codes, assign codes to campaigns, update code status |
| Entry Service | Fan registration data | Query eligible fans by campaign and market |
| TM SMS Service | SMS delivery | Send SMS notifications with codes |
| Salesforce Marketing Cloud | Email delivery | Queue and send email notifications |
| MongoDB | Data persistence | Campaign configuration storage (via Campaign Service) |
| AWS S3 (scoringBucket) | File storage | Store scored files, wave configs, wave CSVs, zipped wave packages |
| AWS S3 (campaignDataBucket) | Data lake | Store Avro campaign data, merged files |
| AWS Kinesis | Event streaming | Input stream (code assignments), saveSelection stream (scored data) |
| AWS SQS | Message queuing | moveMergedAvroQueue, smsWaveEmailQueue |
| AWS Athena | Query engine | Merge Avro files via SQL queries |
| Slack | Monitoring & alerts | Send errors, stats, campaign alerts |

## Success Metrics

### Data Processing Metrics
- **Scored file processing latency < 5 minutes** from upload to Kinesis output
- **Data accuracy rate 100%** - all records match schema validation
- **File merge success rate > 99%** for daily/monthly consolidation
- **Zero data loss** - input count always equals output + rejected count

### Code Management Metrics
- **Code uniqueness 100%** - no duplicate codes assigned per campaign
- **Code assignment success rate > 99.5%** for valid fans
- **External code reservation success rate > 99%** with Pacman integration

### Notification Delivery Metrics
- **SMS delivery attempt rate > 98%** (excluding invalid numbers)
- **Email queue success rate 100%** (queuing, not final delivery)
- **Wave processing time < 30 minutes** for batches up to 100K fans
- **Notification concurrency sustained at 200 req/sec** without throttling

### Operational Metrics
- **Worker execution success rate > 99%** across all worker types
- **Slack alert delivery within 1 minute** of any failure
- **Wave retry success rate > 90%** for transient failures
- **Mean time to detection < 5 minutes** for campaign issues
