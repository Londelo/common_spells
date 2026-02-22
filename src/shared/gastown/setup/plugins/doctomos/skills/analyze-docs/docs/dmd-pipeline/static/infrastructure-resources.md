# Infrastructure Resources - dmd-pipeline

## Overview

The demand-pipeline (dmd-pipeline) is a data processing pipeline that stores Demand Records from DynamoDB change streams into S3 as Avro files for warehousing and querying with Athena. The pipeline consumes DynamoDB change records from Kinesis, transforms them to Avro format, and uploads them to S3 partitioned by type and date.

## AWS Lambda Functions

### deliveryWorker

The main data processing Lambda function that consumes DynamoDB change records from Kinesis.

| Property | Value |
|----------|-------|
| **Name** | deliveryWorker |
| **Runtime** | nodejs18.x |
| **Source Module** | terraform-module-nodejs-lambda (v1.0.0) |
| **Event Source** | Kinesis stream (DynamoDB change records) |
| **Starting Position** | LATEST |
| **Batch Size** | 1000 (configurable via `delivery_batch_size`) |
| **Parallelization Factor** | 2 (configurable via `delivery_parallelization_factor`) |

**Event Filtering:**
- Filters for specific demand data types: `demand`, `sale`, `event`, `notification`
- Processes both INSERT/MODIFY (NewImage) and REMOVE (OldImage) events from DynamoDB

**IAM Permissions:**
- Read from Kinesis stream
- Write to S3 bucket (data-pipeline prefix)
- CloudWatch Logs (with subscription to centralized log stream)

**Functionality:**
1. Unmarshalls DynamoDB change records
2. Groups records by type and partition date
3. Converts to Avro format
4. Uploads to S3 organized by type and partition date

## Data Storage

### DynamoDB Table

| Property | Value |
|----------|-------|
| **Table Name** | Environment-specific (e.g., `prd3292-dev1-us-east-1-demand-table`) |
| **Purpose** | Source table for demand records (referenced, not created by this pipeline) |
| **Access** | Referenced via data source in Terraform |

**Environment-specific table names:**
- **dev1**: `prd3292-dev1-us-east-1-demand-table`
- **qa1**: `prd3292-qa1-us-east-1-demand-table`
- **preprod1**: `prd3292-preprod1-us-east-1-demand-table`
- **prod1**: `prd3292-prod1-us-east-1-demand-table`

### S3 Buckets

| Property | Value |
|----------|-------|
| **Bucket Name** | Environment-specific (e.g., `prd3292.dev1.us-east-1.demand-capture.tmaws`) |
| **Prefix** | `data-pipeline` |
| **Purpose** | Storage for Avro/Parquet files and Athena query results |
| **Access** | Referenced via data source in Terraform |

**Environment-specific bucket names:**
- **dev1**: `prd3292.dev1.us-east-1.demand-capture.tmaws`
- **qa1**: `prd3292.qa1.us-east-1.demand-capture.tmaws`
- **preprod1**: `prd3292.preprod1.us-east-1.demand-capture.tmaws`
- **prod1**: `prd3292.prod1.us-east-1.demand-capture.tmaws`

**S3 Structure:**
```
s3://{bucket}/data-pipeline/
├── avro/
│   ├── demand/partition_date=YYYY-MM-DD/
│   ├── event/partition_date=YYYY-MM-DD/
│   ├── notification/partition_date=YYYY-MM-DD/
│   └── sale/partition_date=YYYY-MM-DD/
├── parquet/
│   └── (reserved for future parquet format)
└── athena/
    └── results/
```

## Streaming Data

### Kinesis Data Stream

| Property | Value |
|----------|-------|
| **Stream Name** | Environment-specific (e.g., `prd3292-dev1-dmnd-table-stream`) |
| **Purpose** | DynamoDB change stream for demand table |
| **Consumer** | deliveryWorker Lambda function |
| **Access** | Referenced via data source in Terraform |

**Environment-specific stream names:**
- **dev1**: `prd3292-dev1-dmnd-table-stream`
- **qa1**: TBD (follows same pattern)
- **preprod1**: TBD (follows same pattern)
- **prod1**: TBD (follows same pattern)

## Analytics & Querying

### AWS Glue Catalog

**Database: Avro Format**
- **Name**: `{product_code}_{environment}_{inventory_code}` (e.g., `prd3292_dev1_dmnd_pipeline`)
- **Tables**: 4 tables (one per demand data type)

**Database: Parquet Format (Future)**
- **Name**: `{product_code}_{environment}_{inventory_code}_parquet`
- **Status**: Reserved for future parquet format support

**Glue Tables (Avro):**

| Table Name | Schema Location | Storage Format | Partition Key |
|------------|-----------------|----------------|---------------|
| demand | `src/format/avro/schemas/demand.json` | Avro | partition_date (string) |
| event | `src/format/avro/schemas/event.json` | Avro | partition_date (string) |
| notification | `src/format/avro/schemas/notification.json` | Avro | partition_date (string) |
| sale | `src/format/avro/schemas/sale.json` | Avro | partition_date (string) |

**Schema Management:**
- Avro schemas defined in `src/format/avro/schemas/`
- Table columns derived from schema definitions
- Tables automatically recreated when schemas change (lifecycle replacement)

### AWS Athena

| Property | Value |
|----------|-------|
| **Database Name** | Same as Glue database name |
| **Workgroup Name** | Same as database name |
| **Query Results Location** | `s3://{bucket}/data-pipeline/athena/results/` |
| **CloudWatch Metrics** | Enabled |

**Configuration:**
- Workgroup configuration enforcement enabled
- Centralized result output location
- CloudWatch metrics publishing enabled

## IAM Roles and Policies

### Lambda Execution Role (deliveryWorker)

**Managed by Module:** `terraform-module-nodejs-lambda`

**Attached Policies:**
1. **kinesis-read** - Read from Kinesis stream
2. **s3-write** - Write to S3 bucket (data-pipeline prefix)
3. **CloudWatch Logs** - Write logs

### Log Producer Role

**Purpose:** CloudWatch Logs subscription to centralized log stream

**Permissions:**
- Assume role for logs.amazonaws.com
- Put records to centralized Kinesis log stream

### CI Role (for GitLab CI/CD)

**Role Name:** `{naming}-ci`

**Assumable By:**
- Account root
- GitLab CI Runner role (`GitRunner`)

**Attached Policies:**
1. **dynamodb-rw** - Read/write DynamoDB demand table
2. **athena-query-execution** - Execute Athena queries
3. **s3-write** - Write to S3 (data-pipeline prefix)
4. **s3-delete-test** - Delete test data (data-pipeline/test/* prefix only)

### IAM Policies

| Policy Name | Purpose | Resources |
|-------------|---------|-----------|
| `{naming}-kinesis-read` | Read from Kinesis stream | Kinesis demand stream |
| `{naming}-s3-write` | Write to S3 bucket | S3 bucket + data-pipeline/* |
| `{naming}-s3-delete-test` | Delete test data | S3 data-pipeline/test/* only |
| `{naming}-athena-query-execution` | Athena query execution | Athena workgroup, Glue catalog, S3 |
| `{naming}-dynamodb-rw` | DynamoDB read/write | DynamoDB demand table + indexes |
| `{naming}-logs-write` | Write to log stream | Centralized Kinesis log stream |

**Note:** `{naming}` is generated by the naming module based on environment tags.

## CloudWatch Logging

### Lambda Logs

- **Log Group:** Managed by lambda module
- **Subscription Filter:** Forwards all logs to centralized log stream
- **Distribution:** Random

### Centralized Log Stream

- **Module:** `terraform-modules/log-stream-arn` (v1.0.0)
- **Purpose:** Aggregates logs from all Lambda functions
- **Region-specific ARN:** Based on account, region, product code, and environment

## Resource Tagging

All resources created include default tags:

| Tag | Description | Source |
|-----|-------------|--------|
| **Environment** | Environment name (dev1, qa1, preprod1, prod1) | `environment_tag` variable |
| **ProductCode** | Product code (PRD3292) | `product_code_tag` variable |
| **InventoryCode** | Inventory code (dmnd-pipeline) | `inventory_code_tag` variable |
| **iacRepo** | Infrastructure repo URL | Default: `https://git.tmaws.io/demand-capture/data-pipeline` |

## Terraform Modules

### External Modules Used

| Module | Version | Purpose |
|--------|---------|---------|
| `terraform-module-nodejs-lambda` | v1.0.0 | Lambda function deployment |
| `terraform-module-account` | v1.1.1 | AWS account information |
| `terraform-module-naming` | v1.3.3 | Resource naming conventions |
| `terraform-modules/log-stream-arn` | v1.0.0 | Centralized log stream ARN |

### Provider Requirements

| Provider | Version Constraint | Purpose |
|----------|-------------------|---------|
| aws | ~> 5.0 | AWS resources |
| archive | ~> 2.4 | Lambda packaging |
| null | ~> 3.2 | Schema change detection |

**Terraform Version:** >= 1.5.6

## Environment Configuration

All environments use the same AWS region: **us-east-1**

### Development Environments

| Environment | Account | Deployment Tier | Auto-deploy on main |
|-------------|---------|-----------------|---------------------|
| dev1 | tm-nonprod | development | Yes |
| qa1 | tm-nonprod | development | Yes |

### Production Environments

| Environment | Account | Deployment Tier | Auto-deploy on main |
|-------------|---------|-----------------|---------------------|
| preprod1 | tm-prod | staging | Yes |
| prod1 | tm-prod | production | Manual only |

## Data Types Processed

The pipeline processes four types of demand records:

1. **demand** - Primary demand records
2. **sale** - Sale transactions
3. **event** - Event records
4. **notification** - Notification records

These types are configurable via the `demand_data_types` variable.
