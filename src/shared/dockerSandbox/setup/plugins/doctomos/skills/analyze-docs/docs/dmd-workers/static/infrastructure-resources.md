# Infrastructure Resources - dmd-workers

## Overview

The demand-capture workers repository deploys AWS Lambda functions managed via Terraform. Each worker is a serverless function that processes events from various sources including Kinesis streams, DynamoDB streams, SQS queues, and scheduled cron jobs.

**Product Code**: PRD3292
**Product Name**: demand-capture (dmnd)
**IaC Tool**: Terraform
**Runtime**: Node.js 18.x

---

## Lambda Functions

The repository contains multiple Lambda workers, each with specific responsibilities:

| Function | Inventory Code | Trigger Type | Description |
|----------|---------------|-------------|-------------|
| notificationScheduler | ntfcn-schdlr | CloudWatch Events (Cron) | Schedules notification generation based on time |
| notificationGenerator | ntfcn-gnrtr | CloudWatch Events (Cron) | Generates notifications for scheduled events |
| notificationSend | ntfcn-snd | DynamoDB Stream | Sends notifications when created/retried in DynamoDB |
| demandStreamToSqs | dmnd-stream-to-sqs | DynamoDB Stream + Filter | Routes events requiring short URL to SQS queue |
| shortenEventUrl | shortn-evnt-url | SQS Queue | Consumes short URL queue and shortens event URLs |
| smsStatusConsumer | sms-status | Kinesis Stream | Processes SMS delivery status updates |
| proxyTmAccountService | prxy-acct | AppSync Resolver | Proxies requests to Ticketmaster account service |
| eventDetails | evnt-dtls | AppSync Resolver | Retrieves event details from Ticketmaster Discovery |

### Lambda Configuration

**Common settings** (configurable per worker):
- **Runtime**: nodejs18.x
- **Handler**: lambda.handler (default)
- **Memory**: 2048 MB (default, configurable)
- **Timeout**: 60 seconds (default, configurable)
- **Concurrency**: Unreserved (-1, configurable)
- **VPC**: Deployed in VPC with app-tier subnets and web-tier security groups

---

## DynamoDB Tables

| Table | Purpose | Access Pattern |
|-------|---------|---------------|
| prd3292-{env}-us-east-1-demand-table | Main demand capture data store | Read/Write from all workers |

**Stream Configuration**:
- DynamoDB Streams enabled
- Consumed by: `notificationSend`, `demandStreamToSqs`
- Filters applied to reduce Lambda invocations

### Stream Event Filters

**notificationSend** filter:
```
type = "notification" OR "notification:asu"
status.id = "CREATED" OR "RETRY"
eventName = "INSERT" OR "MODIFY"
```

**demandStreamToSqs** filter:
```
type = "event"
isSuppressed = false
shortUrl does not exist
eventName = "INSERT" OR "MODIFY"
```

---

## SQS Queues

| Queue | Purpose | Consumer |
|-------|---------|----------|
| prd3292-{env}-us-east-1-event-short-url | Event URL shortening requests | shortenEventUrl |

**Configuration**:
- Batch size: 10 (max for SQS)
- Retry handling: Configured per queue

---

## Kinesis Streams

| Stream | Purpose | Consumer |
|-------|---------|----------|
| dmnd-table-stream (default) | DynamoDB table stream | notificationSend, demandStreamToSqs |
| {product_code}-{env}-logs | CloudWatch logs aggregation | All workers (log subscription) |
| SMS status stream | SMS delivery status events | smsStatusConsumer |

**Configuration**:
- Batch size: 1000 (default for Kinesis)
- Starting position: LATEST
- Parallelization factor: 1

---

## ElastiCache (Redis)

| Cluster | Purpose | Endpoint Type |
|---------|---------|--------------|
| prd3292-{env}-dmnd | Caching layer | Primary (read/write) |
| prd3292-{env}-dmnd-ro | Caching layer | Read-only replica |

**Configuration**:
- Type: Redis
- Use cases: Session caching, rate limiting, temporary data storage

---

## CloudWatch Resources

### Log Groups

Each Lambda function has a dedicated log group:
- Pattern: `/aws/lambda/{function-name}`
- Retention: 7 days (default, configurable via `log_retention_days`)

### CloudWatch Events (EventBridge)

Used for scheduled Lambda executions:
- **notificationScheduler**: Cron-based trigger
- **notificationGenerator**: Cron-based trigger

**Configuration**:
- Schedule expression: `rate(1 minute)` (default)
- Configurable via `cron_expression` variable

### Log Subscriptions

All Lambda logs are optionally streamed to a Kinesis stream for centralized logging:
- Destination: `{product_code}-{env}-logs` Kinesis stream
- Distribution: Random
- Controlled by `use_log_stream` variable (default: true)

---

## IAM Roles and Policies

### Lambda Execution Role

Each Lambda function has an IAM role with the following attached policies:

#### Base Policies (All Lambdas)
- **LambdaInline**: EC2 network interface management (VPC execution)
- **PublishCloudwatch**: Log publishing to CloudWatch
- **KinesisProducer**: Write to Kinesis streams (pattern: `{product_code}*`)
- **DynamoPolicy**: DynamoDB operations on tables matching `{product_code}*`

#### Conditional Policies (Feature-based)

| Policy | When Applied | Permissions |
|--------|-------------|-------------|
| KinesisConsumer | `is_stream_consumer = true` | Read from specified Kinesis/DynamoDB stream |
| SqsConsumer | `is_sqs_consumer = true` | SQS receive/delete/send on specified queues |
| SqsProducer | `is_sqs_producer = true` | Send messages to SQS queues matching `{product_code}*` |
| FirehoseProducer | `is_firehose_producer = true` | Write to Firehose streams matching `{product_code}*` |
| InvokeLambda | `is_fanout_controller = true` | Invoke other Lambda functions in the product |
| S3Read | `s3_read_buckets` specified | Read objects from specified S3 buckets |
| S3All | `s3_read_write_buckets` specified | Full S3 access to specified buckets |
| AthenaPolicy | `is_athena_worker = true` | Query Athena and access Glue catalog |

### CloudWatch Log Lambda Role

Separate role for log stream subscription:
- **CloudwatchLogLambda**: Write logs to Kinesis stream

---

## VPC Configuration

### Network Topology

All Lambda functions are deployed in VPC:
- **Subnets**: App-tier subnets (from `app_networks` module)
- **Security Groups**: Web-tier security group (from `web_networks` module)

### Terraform Network Modules

```hcl
module "app_networks" {
  source = "terraform-module-networks"
  region = var.aws_region
  vpc    = var.vpc
  tier   = "app"
}

module "web_networks" {
  source = "terraform-module-networks"
  region = var.aws_region
  vpc    = var.vpc
  tier   = "web"
}
```

---

## S3 Buckets

S3 access is granted conditionally based on worker requirements:
- Read-only access: Specified via `s3_read_buckets` variable
- Read/write access: Specified via `s3_read_write_buckets` variable

**Example use case**: Lambda artifacts stored in S3 (`lambda_zip_path`)

---

## External Service Integrations

### Ticketmaster Services

| Service | Purpose | Configuration |
|---------|---------|--------------|
| TM Accounts ACOE | Account authentication | IAM role-based access |
| TM Discovery API | Event data retrieval | API key authentication |
| TM Publish API | Event extension publishing | API key authentication |

### Third-Party Services

| Service | Purpose | Configuration |
|---------|---------|--------------|
| Bitly | URL shortening | API token authentication |
| MongoDB Atlas | Data persistence (legacy) | Connection string with auth |
| SMS Service | SMS delivery | IAM role ARN for cross-account |

---

## Environment-Specific Resources

Resources are deployed across multiple environments:

| Environment | Account | Region | VPC |
|-------------|---------|--------|-----|
| qa1 | tm-nonprod | us-east-1 | qa |
| dev1 | tm-nonprod | us-east-1 | dev |
| preprod1 | tm-prod | us-east-1 | preprod |
| prod1 | tm-prod | us-east-1 | prod |

**Naming Convention**: `{product_code}-{env}-{region}-{resource-type}`

Example: `prd3292-qa1-us-east-1-demand-table`

---

## Terraform Backend

State management:
- **Backend**: S3
- **Configuration**: Dynamically configured (see `terraform_backend.tf`)
- **State isolation**: Per environment and per worker

---

## Resource Tagging

All resources are tagged using the `terraform-module-naming` module:

```hcl
module "naming" {
  source             = "terraform-module-naming"
  product_code_tag   = var.product_code_tag   # PRD3292
  environment_tag    = var.environment_tag     # qa1, dev1, etc.
  inventory_code_tag = var.inventory_code_tag  # Worker-specific
  product_name       = var.product_name        # dmnd
  aws_region         = var.aws_region
}
```

**Tags applied**:
- Product code
- Environment
- Inventory code
- Product name
- Region
- IaC repository reference
