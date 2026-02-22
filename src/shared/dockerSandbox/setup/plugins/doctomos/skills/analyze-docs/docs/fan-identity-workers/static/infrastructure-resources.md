# Infrastructure Resources - fan-identity-workers

## Overview

This repository deploys serverless AWS Lambda workers across five distinct stacks, managed via Terraform. Each stack contains Lambda functions, supporting infrastructure (queues, streams, databases), and IAM policies for event-driven processing.

## Deployment Stacks

### 1. Auth Stack
Token validation and authentication workers

### 2. Bot Detection (botornot) Stack
Bot detection and data science import workers

### 3. Clustering Stack
Data clustering and import workers

### 4. Identity Verification (IDV) Stack
Identity verification with API Gateway integration

### 5. Scoring Stack (Primary)
User scoring system with multi-region support (east/west)

---

## Lambda Functions

### Auth Stack

| Function | Handler | Runtime | Purpose | Timeout | Memory |
|----------|---------|---------|---------|---------|--------|
| validateToken | validateToken | Node.js 18 | JWT token validation | 15s | Default |

### Bot Detection Stack

| Function | Handler | Runtime | Purpose | Timeout | Memory |
|----------|---------|---------|---------|---------|--------|
| startBotOrNotImport | startBotOrNotImport | Node.js 18 | Initiates bot detection import workflow | Default | Default |

**Triggers:**
- S3 event (from Data Science exports bucket)

**Permissions:**
- AWS Glue workflow execution

### Clustering Stack

| Function | Handler | Runtime | Purpose | Timeout | Memory |
|----------|---------|---------|---------|---------|--------|
| startClusterImport | startClusterImport | Node.js 18 | Initiates clustering import workflow | Default | Default |

**Triggers:**
- S3 event (from Data Science exports bucket)

### Identity Verification Stack

| Function | Handler | Runtime | Purpose | Timeout | Memory |
|----------|---------|---------|---------|---------|--------|
| handleEvent | handleEvent | Node.js 18 | AppSync resolver for IDV events | Default | Default |
| checkLiveness | checkLiveness | Node.js 18 | Liveness verification checks | Default | Default |

**API Integration:**
- API Gateway REST API (Regional endpoint)
- Custom domain: `{inventory_code}-gateway-{env}.verifiedfan.{zone}`
- Webhook endpoint with request validation

### Scoring Stack (Multi-Region)

#### East Region (Primary)

| Function | Handler | Runtime | Purpose | Timeout | Memory | Trigger |
|----------|---------|---------|---------|---------|--------|---------|
| scoreUsers | scoreUsers | Node.js 18 | Score users from DynamoDB changes | Default | Default | Kinesis stream |
| getArmScore | getArmScore | Node.js 18 | Retrieve ARM scores from Redis | 6s | Default | SDK invocation |
| enqueueFromVfStream | enqueueFromVfStream | Node.js 18 | Queue users from VF login stream | Configurable | Default | Kinesis stream |
| enqueueFromDemandStream | enqueueFromDemandStream | Node.js 18 | Queue users from demand stream | Configurable | Default | Kinesis stream |
| enqueueFromPurchaseStream | enqueueFromPurchaseStream | Node.js 18 | Queue users from purchase stream | Configurable | Default | Kinesis stream |
| enqueueFromSQJourneyStream | enqueueFromSQJourneyStream | Node.js 18 | Queue users from SQ journey stream | Configurable | Default | Kinesis stream |
| lookupArai | lookupArai | Node.js 18 | Look up ARAI identifiers | Default | Default | SQS |
| processRescoreEvents | processRescoreEvents | Node.js 18 | Process user rescore requests | Default | Default | Event stream |
| stagingScoreUsers | stagingScoreUsers | Node.js 18 | Staging environment scoring | Default | Default | Kinesis stream |

#### West Region (Conditional)

Same functions as East when `kafka_user_activity_topic_west` is configured

---

## DynamoDB Tables

### Fan Identity Table

| Table | Partition Key | Sort Key | Purpose | Streams |
|-------|--------------|----------|---------|---------|
| fan-identity-table | userId | - | Primary user identity data | Kinesis (enabled) |

**Naming Convention:** `{product_code}-{env}-{region}-fan-identity-table`

**Access Patterns:**
- Read: BatchGetItem
- Write: UpdateItem, BatchWriteItem
- Stream: DynamoDB -> Kinesis -> Lambda triggers

---

## SQS Queues

### Account Activity Queue (FIFO)

| Queue | Purpose | Type | Visibility Timeout | Retention |
|-------|---------|------|-------------------|-----------|
| account-activity-sqs.fifo | Activity data processing | FIFO | Configurable | Configurable days |

**Naming:** `{naming_prefix}-acct-activity-sqs.fifo`

**Producers:**
- enqueueFromDemandStream
- enqueueFromPurchaseStream
- enqueueFromSQJourneyStream

**Consumers:**
- Scoring workers

### On-Demand Scoring Queue

| Queue | Purpose | Type | Visibility Timeout | Retention |
|-------|---------|------|-------------------|-----------|
| on-demand-scoring-sqs | On-demand score requests | Standard | Configurable | Configurable days |

**Naming:** `{naming_prefix}-on-demand-scoring-sqs`

**Producers:**
- enqueueFromVfStream

**Consumers:**
- Scoring workers

---

## Kinesis Streams

### Input Streams

| Stream | Purpose | Lambda Consumer | Filter Pattern |
|--------|---------|----------------|----------------|
| fan-identity-table-stream | DynamoDB change stream | scoreUsers | eventName=[INSERT,MODIFY], type=activityData |
| vf-input-stream | Verified Fan logins | enqueueFromVfStream | type=vfLogin |
| dmnd-table-stream | Demand data stream | enqueueFromDemandStream | (varies) |
| purchase-stream | Purchase events | enqueueFromPurchaseStream | (varies) |
| sq-journey-stream | SeatGeek journey data | enqueueFromSQJourneyStream | (varies) |

**Configuration:**
- Batch size: Configurable per stack
- Starting position: LATEST

---

## API Gateway

### Identity Verification API

| Component | Type | Value |
|-----------|------|-------|
| API Name | REST API | Generated via naming module |
| Endpoint | Regional | Enabled |
| Stage | Dynamic | Based on environment_tag |
| Custom Domain | CNAME | `{inventory_code}-gateway-{env}.verifiedfan.{zone}` |
| Certificate | ACM | DNS-validated |

**Configuration:**
- Request validation: All (body + parameters)
- Execute API endpoint: Disabled
- CloudWatch logging: Enabled

**Responses:**
- 400 Bad Request (Body)
- 400 Bad Request (Parameters)

**Route53:**
- CNAME record pointing to regional API Gateway endpoint
- Public hosted zone

---

## ElastiCache Redis

### ARM Scoring Cache

| Environment Variable | Purpose |
|---------------------|---------|
| ARM_REDIS_URL | Primary Redis endpoint |
| ARM_REDIS_READ_ONLY_URL | Read replica endpoint |
| ARM_REDIS_CLUSTER_MODE | Cluster mode flag |

**Access:**
- Used by `getArmScore` Lambda function
- Provides fast access to precomputed ARM scores

---

## VPC Configuration

### Network Tiers

| Tier | Purpose | Used By |
|------|---------|---------|
| web | Public-facing resources | API Gateway |
| app | Application-tier resources | Lambdas with VPC access |

**VPC Module:** `terraform-module-networks v3.2.3`

---

## IAM Policies

### Lambda Execution Roles

Each Lambda function has a dedicated IAM role with policies for:

#### Common Policies
- CloudWatch Logs: CreateLogGroup, CreateLogStream, PutLogEvents
- VPC Access: CreateNetworkInterface, DescribeNetworkInterfaces, DeleteNetworkInterface

#### Stack-Specific Policies

**Scoring Stack:**
- `fan_identity_kinesis_consumer_policy` - Read from Kinesis streams
- `dynamodb_write_scores` - Write scores to DynamoDB
- `lambda_sqs_producer` - Send messages to SQS
- `enqueue_from_streams_network` - VPC networking for stream consumers
- `dynamodb_enqueue_from_streams` - Read/write for enqueue functions

**Bot Detection Stack:**
- `glue_policy` - Start AWS Glue workflows

**Clustering Stack:**
- S3 invoke permissions for Lambda triggers

**IDV Stack:**
- API Gateway CloudWatch role

---

## Terraform Modules

### Core Modules

| Module | Version | Purpose |
|--------|---------|---------|
| tm-env | v1.0.0 | Environment configuration |
| terraform-module-account | v1.1.1-v1.1.2 | Account metadata |
| terraform-module-naming | v1.3.3 | Resource naming conventions |
| terraform-module-networks | v3.2.3 | VPC/subnet configuration |
| nodejs-lambda | v2.0.0-v2.1.0 | Lambda function deployment |

---

## Multi-Region Configuration

### Scoring Stack Dual-Region Setup

**Condition:** `kafka_user_activity_topic_west != null`

When enabled, deploys parallel infrastructure in:
- **Primary:** us-east-1
- **Secondary:** us-west-2

**Region-Specific Configuration:**
- Separate Kafka bootstrap servers
- Separate Kafka topics
- Separate SQS queues
- Log stream region override (west logs to east)
- Config suffix: `{config}w` for west region

---

## Tagging Strategy

All resources tagged with:

| Tag | Purpose |
|-----|---------|
| Environment | Environment name (qa1, dev1, preprod1, prod1) |
| ProductCode | Product code identifier |
| InventoryCode | Inventory code identifier |
| iacRepo | Infrastructure repository URL |

---

## External Integrations

### AWS Glue
- Bot detection workflow
- Clustering workflow

### Data Science S3 Buckets
- Export bucket ARN configurable per environment
- Triggers for bot detection and clustering imports

### Kafka
- User activity topics (east/west)
- Bootstrap servers configurable per region
- Conditional enablement via `kafka_is_enabled` flag

---

## Notes

- All Lambda functions use the same deployment artifact: `dist/lambda.zip`
- Functions are resolved at runtime via worker name
- Runtime: Node.js 18.18.2
- Terraform version: >= 1.5.6
- AWS Provider version: ~> 5.0
