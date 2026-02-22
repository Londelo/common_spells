# Infrastructure Resources - reg-workers

## Overview

This repository deploys serverless AWS Lambda-based microservices organized into 5 Terraform stacks for the VerifiedFan registration system. Infrastructure is managed through Terraform with Terramisu for multi-environment deployments.

**Technology Stack**: Node.js 18.18.2, TypeScript 5.2.2, AWS Lambda, DynamoDB, SQS, SNS, Kinesis, Kafka, Step Functions

**Deployment Tool**: Terraform 1.5.6+, Terramisu v1.8.3

---

## Lambda Functions

### Registration Stack

| Function | Handler | Runtime | Memory | Timeout | Triggers | Purpose |
|----------|---------|---------|--------|---------|----------|---------|
| checkEligibility | lambda | Node 18 | Default | 30s | AppSync | Validates fan eligibility before entry submission |
| upsertUsers | lambda | Node 18 | Default | Default | SQS + EventBridge | Batch upsert user info to User Service |

### Replication Stack

| Function | Handler | Runtime | Memory | Timeout | Triggers | Purpose |
|----------|---------|---------|--------|---------|----------|---------|
| enqueueEntries | lambda | Node 18 | Default | Default | DynamoDB Streams | Filters entries needing replication, queues to saveEntriesQueue |
| saveEntries | lambda | Node 18 | Default | Default | SQS | Replicates entries to Entry Service MongoDB |
| retryScore | lambda | Node 18 | Default | Default | SQS | Refreshes user scores in Entry Service after failures |

### Selection Stack

| Function | Handler | Runtime | Memory | Timeout | Triggers | Purpose |
|----------|---------|---------|--------|---------|----------|---------|
| enqueueMarketSelections | lambda | Node 18 | Default | 900s | Step Function | Processes market selections, reserves codes |
| saveSelections | lambda | Node 18 | Default | Default | SQS | Assigns codes via Entry Service, updates verdicts |
| refreshSelections | lambda | Node 18 | Default | Default | SQS | Refreshes existing selections for a market |
| markAssignedCodes | lambda | Node 18 | Default | Default | DynamoDB Streams | Marks codes as assigned in Code Service |

### Data Pipeline Stack

| Function | Handler | Runtime | Memory | Timeout | Triggers | Purpose |
|----------|---------|---------|--------|---------|----------|---------|
| processData | lambda | Node 18 | Default | Default | SQS | Formats and fans out data to type-specific queues via SNS |
| sendData | lambda | Node 18 | Default | Default | SQS (5 queues) | Validates against JSON schemas and publishes to Kafka |

### Notification Stack

| Function | Handler | Runtime | Memory | Timeout | Triggers | Purpose |
|----------|---------|---------|--------|---------|----------|---------|
| notificationGenerator | lambda | Node 18 | Default | Default | EventBridge Scheduled | Generates reminder emails for campaigns |
| getMarketsToNotify | lambda | Node 18 | Default | Default | Direct Invocation | Retrieves markets needing notifications |
| planSends | lambda | Node 18 | Default | Default | Step Function | Plans notification sends |
| triggerReminderEmail | lambda | Node 18 | Default | Default | Step Function | Triggers actual email reminders |

---

## DynamoDB Tables

| Table | Partition Key | Sort Key | Purpose | Streams Enabled |
|-------|--------------|----------|---------|-----------------|
| demand-table (prd3292) | PK | SK | Primary data store for registrations, entries, selections | Yes (Kinesis) |

**Note**: The `demand-table` is managed externally but referenced by multiple workers. Name format: `prd3292-{environment}-{region}-demand-table`

**Stream Consumers**:
- `enqueueEntries` - Filters registration changes with fanModified date
- `markAssignedCodes` - Tracks MODIFY events for code assignment

---

## SQS Queues

### Registration Stack

| Queue | Purpose | Visibility Timeout | Max Receive Count | DLQ |
|-------|---------|-------------------|-------------------|-----|
| user-info | User upsert batch processing | Lambda timeout + 2s | 2 | user-info-dlq |

### Replication Stack

| Queue | Purpose | Visibility Timeout | Max Receive Count | DLQ |
|-------|---------|-------------------|-------------------|-----|
| save-entries | Entry replication to MongoDB | Lambda timeout + 2s | 3 | save-entries-dlq |
| retry-score | Score refresh retry queue | Lambda timeout + 2s | 3 | retry-score-dlq |
| enqueue-entries-dlq | Failed stream events | N/A | N/A | N/A |

### Selection Stack

| Queue | Purpose | Visibility Timeout | Max Receive Count | DLQ |
|-------|---------|-------------------|-------------------|-----|
| save-selection | Selection processing | Lambda timeout + 2s | 3 | save-selection-dlq |
| refresh-selection | Selection refresh | Lambda timeout + 2s | 3 | refresh-selection-dlq |
| mark-assigned-codes-dlq | Failed code marking | N/A | N/A | N/A |

### Data Pipeline Stack

| Queue | Purpose | Visibility Timeout | Max Receive Count | DLQ |
|-------|---------|-------------------|-------------------|-----|
| data-queue | Main data pipeline intake | Lambda timeout + 2s | 3 | data-queue-dlq |
| campaign-queue | Campaign data to Kafka | Lambda timeout + 2s | 3 | campaign-queue-dlq |
| market-queue | Market data to Kafka | Lambda timeout + 2s | 3 | market-queue-dlq |
| evt-mapping-queue | Event mapping data to Kafka | Lambda timeout + 2s | 3 | evt-mapping-queue-dlq |
| reg-markets-queue | Registered market data to Kafka | Lambda timeout + 2s | 3 | reg-markets-queue-dlq |
| registration-queue | Registration data to Kafka | Lambda timeout + 2s | 3 | registration-queue-dlq |
| dmnd-table-pipe-dlq | DynamoDB pipe failures | N/A | N/A | N/A |

**Message Retention**: All DLQs retain messages for 14 days (1,209,600 seconds)

---

## SNS Topics

### Data Pipeline Stack

| Topic | Purpose | Subscriptions |
|-------|---------|---------------|
| data-sns | Fan-out hub for data types | 5 SQS queues with filter policies |

**Filter Policy Routing**:
- `type: campaign` → campaign-queue
- `type: market` → market-queue
- `type: eventMapping` → evt-mapping-queue
- `type: registeredMarket` → reg-markets-queue
- `type: registration` → registration-queue

---

## EventBridge Rules

### Registration Stack

| Rule | Schedule/Pattern | Target | Purpose |
|------|-----------------|--------|---------|
| user-info | Event pattern | user-info SQS queue | Triggers user upsert processing |

### Notification Stack

| Rule | Schedule/Pattern | Target | Purpose |
|------|-----------------|--------|---------|
| notification-schedule | Cron expression | notificationGenerator Lambda | Scheduled reminder email generation |

---

## Step Functions

### Selection Stack

| State Machine | Type | Purpose | Invokes |
|---------------|------|---------|---------|
| selection-step-fn | STANDARD | Orchestrates market selection workflow | enqueueMarketSelections Lambda |

**Logging**: CloudWatch Logs at ERROR level with execution data

### Notification Stack

| State Machine | Type | Purpose | Invokes |
|---------------|------|---------|---------|
| notification-step-fn | STANDARD | Orchestrates reminder email workflow | getMarketsToNotify, planSends, triggerReminderEmail |

---

## AWS Secrets Manager

### Data Pipeline Stack

| Secret | Purpose | Access Granted To |
|--------|---------|-------------------|
| kafka-cert | Kafka authentication certificate | sendData Lambda + CCPA Lambdas (7 functions) |

**Certificate Management**: Certificates expire and are regenerated via `npx run tools:generateCerts`. Stored in GitLab CI/CD variables:
- `nonprod_kafka_cert` (qa/dev)
- `preprod_kafka_cert` (preprod)
- `prod_kafka_cert` (prod)

**Expiration Monitoring**: Daily GitLab scheduled job alerts via Slack when < 20 days remain

---

## DynamoDB Streams & Event Source Mappings

| Lambda | Source | Batch Size | Starting Position | Filter |
|--------|--------|-----------|-------------------|--------|
| enqueueEntries | demand-table stream | 500 | LATEST | Registration type with fanModified date |
| markAssignedCodes | demand-table stream | 500 | LATEST | Selection MODIFY events |

**Stream Configuration**:
- Bisect batch on function error: Enabled
- Maximum retry attempts: 3
- Batching window: Configured per environment
- Function response types: ReportBatchItemFailures (partial retry)

---

## IAM Roles & Policies

### Common Patterns

**Lambda Execution Roles**: Each Lambda has a unique IAM role created by the `nodejs-lambda` Terraform module with:
- CloudWatch Logs write permissions
- VPC network interface management (if VPC-enabled)
- Service-specific permissions (see below)

### Key IAM Policies

#### DynamoDB Access
- **checkEligibility**: `dynamodb:GetItem` on demand-table
- **Stream Consumers**: Kinesis stream read permissions (DescribeStream, GetShardIterator, GetRecords, ListStreams)

#### SQS Access
- **Producers**: `sqs:SendMessage` to target queues and DLQs
- **Consumers**: Auto-granted by event source mapping (ReceiveMessage, DeleteMessage, GetQueueAttributes)

#### SNS Access
- **processData**: `sns:Publish` to data-sns topic

#### Secrets Manager Access
- **sendData**: `secretsmanager:GetSecretValue` and `secretsmanager:DescribeSecret` on kafka-cert secret
- **CCPA Lambdas**: Shared access to kafka-cert secret

#### Step Functions Access
- **State Machine Roles**: Lambda invoke permissions for orchestrated functions

---

## CloudWatch Logs

### Log Groups

All Lambda functions write to CloudWatch Logs with standard naming:
- `/aws/lambda/{function-name}`

### Step Function Logs

- `/aws/vendedlogs/states/{product-code}-{environment}-{inventory-code}-step-fn`

**Retention**: Configurable per environment (default varies by stack)

---

## Networking

**VPC Configuration**: Managed through `tm-env` Terraform module referencing:
- VPC ID specified per environment
- Private subnets for Lambda execution
- Security groups for internal AWS service access

**Connectivity**:
- **MongoDB**: External connection to campaign data store
- **Redis**: Campaign caching layer
- **Kafka**: On-premise/external cluster with certificate authentication
- **HTTP Services**: Entry Service, User Service, Campaign Service, Code Service (via TitanRequest pattern with OpenTelemetry)

---

## External Dependencies

### AWS Services (Internal)
- **AppSync**: Triggers checkEligibility pipeline function
- **Kinesis**: DynamoDB stream delivery
- **CloudWatch**: Logging and monitoring
- **Secrets Manager**: Kafka certificate storage

### External Services (HTTP APIs)
- **Entry Service**: MongoDB-backed entry management
- **User Service**: User profile management
- **Campaign Service**: Campaign configuration
- **Code Service**: Access code reservation and assignment

### Data Stores (External)
- **MongoDB**: Campaign data storage (read-only cache source)
- **Redis**: Campaign configuration caching
- **Kafka**: Event streaming platform for analytics data export

---

## Terraform Modules

### Internal Modules (VerifiedFan)

| Module | Source | Version | Purpose |
|--------|--------|---------|---------|
| nodejs-lambda | git.tmaws.io/verifiedfan/terraform-modules/nodejs-lambda.git | v2.0.3 | Lambda function provisioning |
| tm-env | git.tmaws.io/verifiedfan/terraform-modules/tm-env.git | v1.0.0 | Environment configuration |

### AWS Modules

| Module | Source | Version | Purpose |
|--------|--------|---------|---------|
| account | git.tmaws.io/AWS/terraform-module-account.git | v1.1.1 | Account-level configuration |
| naming | git.tmaws.io/AWS/terraform-module-naming.git | v1.3.3 | Resource naming standards |

---

## Resource Tagging

All resources tagged with:
- **Environment**: qa1, dev1, preprod1, prod1
- **ProductCode**: prd2011 (VerifiedFan)
- **InventoryCode**: Stack-specific (reg, reg-replica, reg-sel, reg-data, reg-ntfcn)
- **iacRepo**: Repository URL

**Naming Convention**: `{product-code}.{product-name}.{region}.{environment}.{name-tag}`

---

## Configuration Management

**Framework**: `@verifiedfan/configs` (version 1.2.4)

**Files**: `configs/` directory with environment overrides
- `default.config.yml` - Base configuration
- `dev.config.yml`, `qa.config.yml`, `preprod.config.yml`, `prod.config.yml`

**Bundle Strategy**: Environment-specific configs bundled into Lambda ZIP to reduce package size

**Environment Variable**: `CONFIG_ENV` determines active configuration
