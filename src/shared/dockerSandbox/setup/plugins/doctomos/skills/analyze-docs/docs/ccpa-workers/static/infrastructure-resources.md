# Infrastructure Resources - ccpa-workers

## Overview

The CCPA Workers repository deploys a collection of AWS Lambda functions that process CCPA (California Consumer Privacy Act) privacy requests. The infrastructure is managed through Terraform and uses multiple AWS services for event processing, storage, and messaging.

## Lambda Functions

The infrastructure supports multiple Lambda functions for processing different aspects of CCPA requests:

| Function | Purpose | Runtime | Memory | Timeout | Triggers |
|----------|---------|---------|--------|---------|----------|
| deleteFan | Delete fan data per CCPA request | nodejs18.x | 2048MB | 300s | SQS |
| fanInfo | Retrieve fan information | nodejs18.x | 2048MB | 300s | SQS |
| keepPrivate | Mark fan data as private | nodejs18.x | 2048MB | 300s | SQS |
| optOut | Process opt-out requests | nodejs18.x | 2048MB | 300s | SQS |
| processRequest | Main request processor | nodejs18.x | 2048MB | 300s | SQS |
| saveDisclosures | Save disclosure information | nodejs18.x | 2048MB | 300s | SQS |
| updateDictionary | Update data dictionary | nodejs18.x | 2048MB | 300s | SQS |

### Lambda Configuration

**Default Settings (configurable via Terraform variables):**
- **Handler**: `lambda.handler`
- **Runtime**: `nodejs18.x`
- **Memory**: 2048 MB (must be multiple of 64)
- **Timeout**: 300 seconds (5 minutes)
- **Reserved Concurrent Executions**: -1 (no limit)
- **VPC**: Deployed in VPC with app-tier subnets and web-tier security groups
- **Environment Variables**:
  - `ENVIRONMENT`: Environment tag (dev1, qa1, preprod1, prod1)
  - `CONFIG_ENV`: Config environment (dev, qa, preprod, prod)
  - `TARGET_ENV`: Target environment (matches CONFIG_ENV)
  - `APP_NAME`: Name of the application/worker

## SQS Queues

Each Lambda function is triggered by an SQS queue with a corresponding Dead Letter Queue (DLQ):

| Queue Name Pattern | Purpose | Visibility Timeout | Max Receive Count |
|-------------------|---------|-------------------|------------------|
| `prd2011-{env}-us-east-1-{app-name}` | Main processing queue | 90s | 3 |
| `prd2011-{env}-us-east-1-{app-name}-dlq` | Dead letter queue for failed messages | Default | N/A |

**Example Queues:**
- `prd2011-dev1-us-east-1-ccpa-keep-prvt`
- `prd2011-dev1-us-east-1-ccpa-keep-prvt-dlq`

**SQS Event Source Configuration:**
- **Batch Size**: 1 (configurable, max 10 for SQS)
- **Function Response Types**: `ReportBatchItemFailures`

## Kinesis Data Streams

The infrastructure supports Kinesis streams for event processing:

| Stream Type | Purpose | Configuration |
|-------------|---------|---------------|
| Event Stream | Process incoming events | Configurable via `kinesis_stream_name` variable |
| Log Stream | Centralized logging | Product-code based naming: `{product_code}-{env}-{region}-logs` |

**Kinesis Event Source Configuration:**
- **Batch Size**: 1 (configurable, max 10,000 for Kinesis)
- **Starting Position**: Configurable (TRIM_HORIZON, LATEST, AT_TIMESTAMP)

## DynamoDB Tables

Lambda functions have access to DynamoDB tables matching these patterns:
- Pattern: `prd2011*` (CCPA product tables)
- Pattern: `prd3292*` (Demand product tables)

**Permissions**: GetItem, PutItem, UpdateItem, Query, Scan, DeleteItem, BatchWriteItem, BatchGetItem

## S3 Buckets

Lambda functions can access S3 buckets based on configuration:

| Access Type | Permissions |
|-------------|-------------|
| Read-only | GetObject, ListBucket |
| Read-write | s3:* (all operations) |

**Configuration**: Specify bucket names via `s3_read_buckets` or `s3_read_write_buckets` Terraform variables.

## Kinesis Firehose

Functions can produce data to Firehose delivery streams matching pattern:
- Pattern: `prd2011*` (product-code based)
- **Permissions**: PutRecord, PutRecordBatch

## AWS Athena & Glue

Workers configured as Athena workers have access to:
- **Athena**: Full access (`athena:*`)
- **Glue**: Full access (`glue:*`)

**Use Case**: Query and analyze data stored in S3 data lakes

## CloudWatch Resources

### Log Groups

Each Lambda function has a dedicated CloudWatch Log Group:
- **Pattern**: `/aws/lambda/{function-name}`
- **Retention**: 7 days (configurable via `log_retention_days`)

### Log Subscription Filters

Logs are optionally streamed to centralized Kinesis log stream:
- **Filter Pattern**: "" (all logs)
- **Distribution**: Random
- **Enabled by**: `use_log_stream` variable (default: true)

### Cron Schedules

Lambda functions can be scheduled via CloudWatch Events:
- **Enabled by**: `is_cron_scheduled` variable (default: false)
- **Schedule Expression**: Configurable via `cron_expression` (default: `rate(1 minute)`)

## IAM Roles and Policies

### Lambda Execution Role

Each Lambda has an execution role with attached policies based on configuration:

| Policy | Purpose | Conditions |
|--------|---------|------------|
| LambdaInline | VPC network interface management (CreateNetworkInterface, DescribeNetworkInterfaces, etc.) | Always attached |
| PublishCloudwatch | CloudWatch Logs publishing | Always attached |
| KinesisProducer | Produce to Kinesis streams (pattern: `prd2011*`) | Always attached |
| DynamoPolicy | DynamoDB operations (patterns: `prd2011*`, `prd3292*`) | Always attached |
| KinesisConsumer | Consume from Kinesis streams | When `is_stream_consumer = true` |
| SqsConsumer | SQS operations (DeleteMessage, ReceiveMessage, etc.) | When `is_sqs_consumer = true` |
| SqsProducer | SQS SendMessage (pattern: `prd2011*`) | When `is_sqs_producer = true` |
| FirehoseProducer | Firehose PutRecord operations | When `is_firehose_producer = true` |
| InvokeLambda | Invoke other Lambda functions (pattern: `prd2011-{env}*`) | When `is_fanout_controller = true` |
| S3Read | Read from specified S3 buckets | When `s3_read_buckets` specified |
| S3All | Full S3 access to specified buckets | When `s3_read_write_buckets` specified |
| AthenaPolicy | Full Athena and Glue access | When `is_athena_worker = true` |

### CloudWatch Log Lambda Role

Separate role for log subscription filters to write to Kinesis log stream.

## Networking

### VPC Configuration

All Lambda functions are deployed within a VPC:
- **Subnets**: App-tier subnets (from `app_networks` module)
- **Security Groups**: Web-tier security group (from `web_networks` module)
- **VPC Options**: Specified per environment (dev, qa, preprod, prod)

### Regions

- **Primary Region**: us-east-1
- **Configurable**: Via `aws_region` variable per environment

## Resource Tagging

All resources are tagged with:
- **InventoryCode**: Application-specific inventory code (e.g., `ccpa-keep-prvt`)
- **ProductCode**: `PRD2011` (CCPA product)
- **Environment**: Environment tag (dev1, qa1, preprod1, prod1)
- **iacRepo**: `git.tmaws.io/verifiedfan/ccpa/workers`

## Terraform Modules

Infrastructure uses standard TM Terraform modules:

| Module | Source | Version | Purpose |
|--------|--------|---------|---------|
| naming | terraform-module-naming | v1.3.3 | Standardized resource naming |
| account | terraform-module-account | v1.1.2 | AWS account configuration |
| web_networks | terraform-module-networks | v3.2.3 | Web tier networking |
| app_networks | terraform-module-networks | v3.2.3 | App tier networking |
| log_stream_arn | log-stream-arn | v1.0.0 | Centralized logging stream |
| nodejs-lambda | nodejs-lambda | v2.0.0 | Lambda function deployment |
| sqs-event-source | sqs-event-source | v1.0.7 | SQS event source mapping |
| tm_env | tm-env | v1.0.0 | Environment configuration |

## Stack Structure

The infrastructure uses a modular stack approach:
- **Base Terraform**: `/terraform/` - Core Lambda infrastructure definitions
- **Stack Implementations**: `/terraform/stacks/` - Specific deployments per function
- **Templates**: `/terraform/templates/` - Reusable templates for creating new stacks

**Example Stack**: `exampleStack` demonstrates:
- Basic Lambda function
- Lambda with fanout pattern
- Lambda with SQS consumer + DLQ
