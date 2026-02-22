# Infrastructure Resources - campaign-workers

> **Last Updated**: 2026-02-13
> **Repository**: git.tmaws.io/verifiedfan/campaign-pipeline/workers
> **Product Code**: PRD2011
> **Infrastructure Type**: Terraform + GitLab CI/CD

## Overview

The campaign-workers infrastructure consists of 16 AWS Lambda functions that process verified fan campaign pipeline events. Each worker is deployed independently across multiple environments (qa, dev, preprod, prod) using Terraform.

## Lambda Functions

### Architecture

- **Runtime**: Node.js 16.x
- **Handler**: `lambda.handler`
- **Memory**: 2048 MB
- **Timeout**: 60 seconds
- **Ephemeral Storage**: 512 MB
- **VPC**: Deployed in VPC with app subnet tier
- **Concurrent Executions**: Unlimited (-1)

### Deployed Workers

| Worker | Inventory Code | Trigger Type | Purpose |
|--------|----------------|--------------|---------|
| saveCampaignData | cmp-save-data | Kinesis Stream | Consumes campaign events from input stream and saves to data store |
| generateSmsWaveCodes | cmp-gen-codes | Manual/API | Generates SMS wave codes for campaigns |
| loadCodeAssignmentsToStream | cmp-load-stream-ca | Manual/API | Loads code assignments from S3 and publishes to Kinesis |
| mergeAvroFiles | cmp-mrg-avro | Cron Schedule | Merges Avro files on S3 (daily 10:00, monthly 09:00 on 2nd) |
| moveMergedAvroFiles | cmp-mv-mrgd | SQS | Moves merged Avro files after processing |
| processScheduledWave | cmp-prcss-scheduled | Manual/API | Processes scheduled campaign waves |
| processScoredFiles | cmp-prcss-scored | Manual/API | Processes scored campaign files |
| processSmsWaveFiles | cmp-prcss-sms | Manual/API | Processes SMS wave files |
| saveSelection | cmp-save-selection | Manual/API | Saves campaign selection data |
| saveStats | cmp-save-stats | Manual/API | Saves campaign statistics |
| slackStats | cmp-slack-stats | Manual/API | Posts campaign stats to Slack |
| smsWaveScheduler | cmp-sms-wave-scheduler | Manual/API | Schedules SMS wave campaigns |
| smsWaveSend | cmp-sms-wave-send | Manual/API | Sends SMS wave messages |
| template | cmp-template | Manual/API | Template worker for creating new workers |
| transformCodeAssignments | cmp-trnsfrm-ca | Manual/API | Transforms code assignment data |
| translateRanksToScores | cmp-trnslt-ranks | Manual/API | Translates fan ranks to campaign scores |

## Kinesis Data Streams

### Input Stream

- **Name**: `vf1-input-stream` (default, can be overridden)
- **Consumers**: saveCampaignData
- **Batch Size**: 1000 records
- **Starting Position**: LATEST

#### saveCampaignData Stream Filters

Consumes only the following event types:
- campaignMapping
- codeAssignment
- codeBan
- codeReserve
- eventMapping
- registration
- scoring
- secondaryListing
- attendanceScan
- fanlistEntry

### Producers

All workers have Kinesis producer permissions to publish to streams matching:
- Pattern: `arn:aws:kinesis:*:*:stream/prd2011*`
- Special access: `prd1541-{env}-save-codes-stream`

## SQS Queues

### moveMergedAvroFiles Queue

- **Queue Pattern**: `prd2011-{env}-us-east-1-cmp-mv-mrgd-sqs`
- **Consumer**: moveMergedAvroFiles worker
- **Batch Size**: 1000 messages
- **Purpose**: Triggers file movement after Avro merge operations

**Examples by Environment**:
- dev1: `arn:aws:sqs:us-east-1:343550350117:prd2011-dev1-us-east-1-cmp-mv-mrgd-sqs`
- qa1: `arn:aws:sqs:us-east-1:343550350117:prd2011-qa1-us-east-1-cmp-mv-mrgd-sqs`

### Producers

Multiple workers can produce to SQS queues matching pattern:
- Pattern: `arn:aws:sqs:*:*:prd2011*`
- Workers: mergeAvroFiles, translateRanksToScores

## S3 Buckets

### Campaign Data Bucket

- **Pattern**: `prd2011.{env}.us-east-1.campaign-data.tmaws`
- **Access**: Read/Write
- **Workers**: mergeAvroFiles, moveMergedAvroFiles
- **Purpose**: Stores merged Avro files and campaign data archives

**Examples**:
- dev1: `prd2011.dev1.us-east-1.campaign-data.tmaws`
- qa1: `prd2011.qa1.us-east-1.campaign-data.tmaws`

### VF Scoring Bucket

- **Pattern**: `prd2011.{env}.us-east-1.vf-scoring.tmaws`
- **Access**: Read or Read/Write (varies by worker)
- **Workers**:
  - Read/Write: generateSmsWaveCodes, processScheduledWave, processScoredFiles, processSmsWaveFiles, translateRanksToScores
  - Read-only: loadCodeAssignmentsToStream, smsWaveScheduler, smsWaveSend
- **Purpose**: Stores campaign scoring files, wave configurations, and SMS data

## DynamoDB Tables

### Access Pattern

Workers have read/write access to DynamoDB tables matching:
- Pattern: `arn:aws:dynamodb:*:*:table/prd2011*`
- Permissions: GetItem, PutItem, UpdateItem, Query, Scan, DeleteItem, BatchWriteItem, BatchGetItem

### Integration

Additional table access can be granted via `dynamo_read_write_tables` variable for cross-product integrations.

## AWS Kinesis Firehose

### Producer Access

Workers configured with `is_firehose_producer = "true"` can write to:
- Pattern: `arn:aws:firehose:*:*:deliverystream/prd2011*`
- Actions: PutRecord, PutRecordBatch

## AWS Athena

### Athena Workers

Workers with `is_athena_worker = "true"` (e.g., mergeAvroFiles) have access to:

**Athena Permissions**:
- StartQueryExecution
- GetQueryExecution
- GetQueryResults

**Glue Data Catalog**:
- GetDatabase, GetDatabases
- GetTable, GetTables
- GetPartition, GetPartitions
- CreateTable, UpdateTable, DeleteTable

**S3 Query Results**:
- Location: `prd2011.{env}.us-east-1.campaign-data.tmaws/athena-outputs/`

## CloudWatch Logs

### Log Groups

Each Lambda function has a CloudWatch log group:
- **Pattern**: `/aws/lambda/{function-name}`
- **Retention**: 7 days
- **Region**: us-east-1

### Log Streaming

**Log Stream ARN**: Managed by `log_stream_arn` module
- Logs are streamed to Kinesis for centralized log aggregation
- Subscription filters configured with CloudWatch role
- Distribution: Random

## IAM Roles and Policies

### Lambda Execution Role

Each worker has an IAM role: `{product_code}.{env}.{region}.{inventory_code}.tmaws`

**Base Permissions**:
- EC2 network interface management (VPC Lambda)
- CloudWatch Logs publishing
- Kinesis producer access
- DynamoDB read/write access
- Lambda invocation (for fanout controllers)

**Conditional Permissions** (based on worker configuration):
- S3 read/write (when S3 buckets configured)
- Kinesis consumer (when `is_stream_consumer = true`)
- SQS consumer/producer (when `is_sqs_consumer/producer = true`)
- SNS subscriber (when `is_sns_subscriber = true`)
- Firehose producer (when `is_firehose_producer = true`)
- Athena query execution (when `is_athena_worker = true`)

### CloudWatch Logs Lambda Role

Separate role for log subscription filters: `{role-name}-log-lambda`
- Allows CloudWatch Logs service to put records to Kinesis log stream

## EventBridge (CloudWatch Events)

### Cron-Scheduled Workers

#### mergeAvroFiles

**Daily Schedule**:
- **Expression**: `cron(0 10 * * ? *)`
- **Input**: `{"type": "daily"}`
- **Time**: 10:00 AM UTC daily

**Monthly Schedule**:
- **Expression**: `cron(0 9 2 * ? *)`
- **Input**: `{"type": "monthly"}`
- **Time**: 9:00 AM UTC on the 2nd of each month

### EventBridge Configuration

- EventBridge rules are created per schedule with unique names
- Lambda permissions granted for CloudWatch Events service invocation
- State: ENABLED

## VPC Configuration

### Network Setup

**Modules**:
- `terraform-module-networks` (v3.3.1)

**Subnets**:
- **Tier**: app (configurable via `subnet_tier`)
- **VPC**: Environment-specific (dev, preprod, prod)

**Security Groups**:
- Web tier security group attached
- Allows outbound internet access for API calls

## Terraform Modules

### External Modules

| Module | Version | Purpose |
|--------|---------|---------|
| terraform-module-naming | v1.3.3 | Resource naming conventions |
| terraform-module-account | v1.0.3 | AWS account configuration |
| terraform-module-networks | v3.3.1 | VPC and subnet management |

### Internal Modules

| Module | Location | Purpose |
|--------|----------|---------|
| log_stream_arn | verifiedfan/terraform-modules/log-stream-arn@v1.0.0 | Log stream ARN resolution |
| event_stream_arn | ./modules/event_stream_arn | Event stream ARN resolution |

## Resource Naming Convention

All resources follow TM naming standards via the naming module:

**Format**: `{product_code}.{environment}.{region}.{inventory_code}.tmaws`

**Example**: `prd2011.dev1.us-east-1.cmp-save-data.tmaws`

## Environment Variables

Each Lambda function receives:

```bash
ENVIRONMENT={environment_tag}    # e.g., dev1, qa1, preprod1, prod1
NODE_ENV={node_env}              # e.g., dev, qa, preprod, prod
TARGET_ENV={node_env}            # same as NODE_ENV
APP_NAME={app_name}              # worker name (e.g., saveCampaignData)
```
