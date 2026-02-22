# Infrastructure Resources - vf-api-workers

## Overview

The vf-api-workers repository contains Lambda functions for the Verified Fan API, deployed via Terraform. The infrastructure consists of 8 Lambda functions that process fan scoring, verification, and campaign data.

Product Code: **PRD2011**

## Lambda Functions

| Function | Inventory Code | Handler | Runtime | Memory | Timeout | Triggers |
|----------|---------------|---------|---------|--------|---------|----------|
| loadScoresToDynamoDB | api-load-db | lambda.handler | nodejs18.x | 2048MB | 60s | Kinesis (scoresStream) |
| loadScoresToStream | api-load-scrs | lambda.handler | nodejs18.x | 2048MB | 900s | S3 ObjectCreated (scoringBucket) |
| lookupPhoneScore | - | lambda.handler | nodejs18.x | 2048MB | 60s | AppSync |
| processSavedScores | api-prcss-scrs | lambda.handler | nodejs18.x | 2048MB | 60s | DynamoDB Stream (demandTable) |
| proxyCampaignService | proxy-cmp-srvc | lambda.handler | nodejs18.x | 2048MB | 60s | AppSync |
| saveEntryScoring | api-save-ent | lambda.handler | nodejs18.x | 2048MB | 60s | Kinesis (scoresStream) |
| saveFanlistScores | api-fanlist-scrs | lambda.handler | nodejs18.x | 2048MB | 60s | S3 ObjectCreated (scoringBucket/fanlist/scored/) |
| verdictReporter | api-vdct-rptr | lambda.handler | nodejs18.x | 2048MB | 60s | SQS (verdictReporterQueue) |

### Function Details

#### loadScoresToDynamoDB
**Purpose**: Normalize and upsert fan scores to DynamoDB
**Trigger**: Kinesis stream (scoresStream)
**Input**: Array of scrubbedRegistrants for a campaignId
**Output**: Write status counts (input, success, created, updated, unchanged, invalid, failed)
**Resources**:
- Reads from: Kinesis scoresStream
- Writes to: DynamoDB demandTable
- Metrics to: CloudWatch

#### loadScoresToStream
**Purpose**: Process S3 scoring files and push to Kinesis
**Trigger**: S3 ObjectCreated notification from scoringBucket (scrubbed folder)
**Input**: S3 file key `scrubbed/registrants.<campaignId>.<campaignName>.<dateTime>.cleaned.prepared.merged.csv`
**Output**: Record counts (in, out, failed, invalid, valid)
**Resources**:
- Reads from: S3 scoringBucket
- Writes to: Kinesis scoresStream
- Writes to: SQS verdictReporterQueue
- Timeout: 900s (extended for large files)

#### lookupPhoneScore
**Purpose**: Look up phone scoring data
**Trigger**: AppSync resolver
**Resources**:
- Reads from: DynamoDB demandTable

#### processSavedScores
**Purpose**: Update campaign scoring counts based on DynamoDB changes
**Trigger**: DynamoDB Stream (demandTable)
**Input**: Array of registrant scoring DynamoDB modification records
**Output**: Processed record count
**Logic**:
- Rejects records with sortKey starting with 'meta:'
- Tracks changes to isVerified and verdict properties
- Aggregates counts by campaignId
- Updates meta:counts records in DynamoDB
**Resources**:
- Reads from: DynamoDB Stream (demandTable)
- Writes to: DynamoDB demandTable (meta:counts records)

#### proxyCampaignService
**Purpose**: Proxy requests to campaign service
**Trigger**: AppSync CampaignsByEventIdResolver
**Input**: API request to `/campaigns/events` with eventId param
**Output**: Array of campaigns for the eventId
**Resources**:
- Makes HTTP requests to Campaign Service

#### saveEntryScoring
**Purpose**: Send scoring data to entry service
**Trigger**: Kinesis stream (scoresStream)
**Input**: Array of scrubbedRegistrants
**Output**: Status counts (records, input, scoring, inserted, entries, updated, found)
**Logic**:
- Filters records with rank0 (checks for prop ['events', '0'])
- Groups records by campaignId
- Upserts to entry service scoring collection
**Resources**:
- Reads from: Kinesis scoresStream
- Writes to: Entry Service API

#### saveFanlistScores
**Purpose**: Process fanlist scoring files
**Trigger**: S3 ObjectCreated notification (scoringBucket/fanlist/scored/)
**Input**: S3 file key `fanlist/scored/${campaignId}/${timestamp}.csv`
**Output**: Counts for input, dynamo, and stream operations
**Logic**:
- Reads CSV from S3
- Deduplicates by memberId
- Attaches campaign properties
- Saves to DynamoDB
- Streams successful records to Kinesis
- Triggers verdict reporter via SQS
**Resources**:
- Reads from: S3 scoringBucket
- Writes to: DynamoDB demandTable
- Writes to: Kinesis campaignDataStream
- Writes to: SQS verdictReporterQueue

#### verdictReporter
**Purpose**: Report scoring counts to Slack
**Trigger**: SQS (verdictReporterQueue)
**Input**: Array of counts by campaign id
**Output**: Counts for requeue, slack, and input
**Logic**:
- Looks up meta:counts from DynamoDB
- Compares with previous slack counts (meta:slack:counts)
- Only posts to Slack if counts changed
**Resources**:
- Reads from: SQS verdictReporterQueue
- Reads from: DynamoDB demandTable (meta:counts, meta:slack:counts)
- Writes to: Slack (slackScrubbedChannel)

## DynamoDB Tables

| Table | Purpose | Keys | GSIs |
|-------|---------|------|------|
| demandTable | Fan scores and verification data | PK: campaign:<campaignId>, SK: varies | - |

**demandTable Record Types**:
- **Score records**: `PK: 'campaign:${campaignId}', SK: 'registrant:${registrantId}'`
- **Count records**: `PK: 'campaign:${campaignId}', SK: 'meta:counts'`
- **Slack count records**: `PK: 'campaign:${campaignId}', SK: 'meta:slack:counts'`
- **Fanlist records**: `PK: 'fan/sid/email:${identifier}', SK: 'campaign:${campaignId}'`

## Kinesis Streams

| Stream | Purpose | Consumers |
|--------|---------|-----------|
| scoresStream | Fan scoring data | loadScoresToDynamoDB, saveEntryScoring |
| campaignDataStream | Campaign data events | External consumers |

## SQS Queues

| Queue | Purpose | Producers | Consumers |
|-------|---------|-----------|-----------|
| verdictReporterQueue | Trigger verdict reporting | loadScoresToStream, saveFanlistScores | verdictReporter |

## S3 Buckets

| Bucket | Purpose | Prefix/Folder | Triggers |
|--------|---------|---------------|----------|
| scoringBucket | Scoring CSV files | scrubbed/ | loadScoresToStream |
| scoringBucket | Fanlist scoring files | fanlist/scored/ | saveFanlistScores |

**Bucket Naming Convention**: `prd2011.{env}.us-east-1.vf-scoring.tmaws`
- Example (QA): `prd2011.qa1.us-east-1.vf-scoring.tmaws`

## VPC Configuration

All Lambda functions run in VPC with:
- **Subnets**: App tier subnets (from module app_networks)
- **Security Groups**: Web tier security group (from module web_networks)

## IAM Roles and Policies

### Lambda Execution Role

Each Lambda has a dedicated IAM role with the following policies:

**Base Policies (All Functions)**:
- **LambdaInline**: VPC network interface management (ec2:CreateNetworkInterface, ec2:DescribeNetworkInterfaces, ec2:DetachNetworkInterface, ec2:DeleteNetworkInterface)
- **PublishCloudwatch**: CloudWatch Logs (logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents)
- **DynamoLambda**: DynamoDB operations (GetItem, PutItem, UpdateItem, Query, Scan, DeleteItem, BatchWriteItem, BatchGetItem) on tables matching `prd2011*`
- **KinesisProducer**: Kinesis stream producer (kinesis:DescribeStream, kinesis:PutRecord, kinesis:PutRecords, kinesis:ListShards) on streams matching `prd2011*`
- **InvokeLambda**: Lambda invocation for fanout pattern (lambda:InvokeFunction) on functions matching `prd2011-{env}*`

**Conditional Policies (Per Function)**:
- **S3Read**: Applied when s3_read_buckets is configured (s3:GetObject, s3:ListBucket)
- **S3All**: Applied when s3_read_write_buckets is configured (full S3 operations including PutObject, DeleteObject, CopyObject)
- **KinesisConsumer**: Applied when is_stream_consumer=true (kinesis:DescribeStream, kinesis:GetShardIterator, kinesis:GetRecords, kinesis:ListStreams, dynamodb stream operations)
- **SqsConsumer**: Applied when is_sqs_consumer=true (sqs:DeleteMessage, sqs:ReceiveMessage, sqs:SendMessage, sqs:GetQueueAttributes, sqs:ChangeMessageVisibility, sqs:GetQueueUrl)
- **SqsProducer**: Applied when is_sqs_producer=true (sqs:SendMessage) on queues matching `prd2011*`
- **FirehoseProducer**: Applied when is_firehose_producer=true (firehose:PutRecord, firehose:PutRecordBatch) on delivery streams matching `prd2011*`
- **AthenaPolicy**: Applied when is_athena_worker=true (athena:*, glue:* on all resources)

### CloudWatch Log Lambda Role

Dedicated role for CloudWatch log subscription filters:
- **CloudwatchLogLambda**: Kinesis producer for log streaming (kinesis:PutRecord to log stream)

## CloudWatch Resources

### Log Groups

Each Lambda function has a dedicated log group:
- **Path**: `/aws/lambda/${function_name}`
- **Retention**: 7 days (configurable via log_retention_days)

### CloudWatch Events (EventBridge)

For cron-scheduled Lambdas (when is_cron_scheduled=true):
- **Event Rule**: Triggers Lambda on schedule
- **Schedule**: Configurable via cron_expression variable (default: rate(1 minute))
- **State**: ENABLED

### Log Subscription Filters

When use_log_stream=true:
- Subscribes Lambda logs to Kinesis log stream
- **Distribution**: Random
- **Filter Pattern**: Empty (all logs)

## Event Sources

### Kinesis Event Source Mapping

For stream consumers (is_stream_consumer=true):
- **Batch Size**: Configurable (default: 2000, max: 10000 for Kinesis)
- **Starting Position**: LATEST (configurable)
- **Parallelization Factor**: 1 (configurable)
- **Filter Criteria**: Supports DynamoDB stream event filters

### SQS Event Source Mapping

For SQS consumers (is_sqs_consumer=true):
- **Batch Size**: Configurable (max: 10 for SQS)
- **Enabled**: true

## External Service Dependencies

| Service | Purpose | Functions |
|---------|---------|-----------|
| Entry Service | Store scoring data | saveEntryScoring |
| Campaign Service | Campaign metadata | proxyCampaignService |
| Slack API | Notifications | verdictReporter |

## Environment Variables

All Lambda functions receive these environment variables:
- **ENVIRONMENT**: Environment tag (qa1, dev1, preprod1, prod1)
- **CONFIG_ENV**: Config environment (qa, dev, preprod, prod)
- **TARGET_ENV**: Target environment (same as CONFIG_ENV)
- **APP_NAME**: Name of the Lambda function

## Data Flow

```
S3 Scoring Files (scrubbed/)
    ↓
loadScoresToStream (Lambda)
    ↓
Kinesis scoresStream
    ├→ loadScoresToDynamoDB (Lambda) → DynamoDB demandTable
    └→ saveEntryScoring (Lambda) → Entry Service

DynamoDB demandTable (stream)
    ↓
processSavedScores (Lambda)
    ↓
DynamoDB demandTable (meta:counts)

S3 Fanlist Files (fanlist/scored/)
    ↓
saveFanlistScores (Lambda)
    ├→ DynamoDB demandTable
    └→ Kinesis campaignDataStream

loadScoresToStream/saveFanlistScores
    ↓
SQS verdictReporterQueue
    ↓
verdictReporter (Lambda)
    └→ Slack
```

## Resource Naming Convention

Resources follow the Terraform module naming convention:
- **Format**: `{product_code}.{environment}.{region}.{inventory_code}.tmaws`
- **Example**: `prd2011.qa1.us-east-1.api-load-db.tmaws`

Modules used:
- `terraform-module-naming` (v1.3.3)
- `terraform-module-account` (v1.1.2)
- `terraform-module-networks` (v3.2.3)
