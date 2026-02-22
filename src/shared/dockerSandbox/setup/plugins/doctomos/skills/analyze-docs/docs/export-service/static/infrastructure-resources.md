# Infrastructure Resources - export-service

## Overview

The export-service is deployed as a containerized Node.js application running on AWS EC2 instances with auto-scaling capabilities. The infrastructure is managed through Terraform and deployed across multiple environments (qa1, dev1, preprod1, prod1).

## Compute Resources

### EC2 Auto Scaling Group

| Component | Details |
|-----------|---------|
| **Launch Template** | Uses Flatcar Container Linux (latest) |
| **Instance Profile** | IAM role for AWS service access |
| **User Data** | Cloud-config with systemd services |
| **Metadata Options** | IMDSv2 required (http_tokens: required) |
| **Monitoring** | Enabled in production environments |

**Auto Scaling Configuration:**

| Environment | Instance Type | Min Count | Max Count |
|-------------|---------------|-----------|-----------|
| dev1 | t2.medium | 1 | 1 |
| prod1 | t2.xlarge | 1 | 1 |

**Scaling Policies:**
- **Scale Up Policy**: Add 4 instances when CPU > 30% (configurable via `cpu_scale_up`)
- **Scale Down Policy**: Remove 1 instance when CPU < 15% (configurable via `cpu_scale_down`)
- **Cooldown Period**: 300 seconds

**Health Check:**
- Type: ELB
- Path: `/heartbeat`
- Protocol: HTTP
- Port: 8080

### Container Configuration

The application runs as a Docker container on EC2 instances:

| Setting | Value |
|---------|-------|
| **Base Image** | node:18.18.2-alpine |
| **Container Port** | 8080 |
| **Instance Port** | 8080 |
| **Node Options** | --max-old-space-size=4096 |
| **ECR Registry** | tmhub.io / 889199535989.dkr.ecr.us-east-1.amazonaws.com |
| **Image Path** | titan/export-service |

**Systemd Services (via cloud-config):**
- `campaigns.service` - Main application container
- `fluentd.service` - Log aggregation and forwarding to ELK
- `node-exporter.service` - Prometheus metrics exporter (port 9100)
- `cadvisor.service` - Container metrics (port 4914)
- `falcon-sensor.service` - CrowdStrike Falcon security agent

## Load Balancing

### Elastic Load Balancer (Classic)

| Setting | Value |
|---------|-------|
| **Type** | Classic ELB |
| **Internal** | true (internal to VPC) |
| **Scheme** | HTTPS (port 443) → HTTP (port 8080) |
| **Cross-Zone** | Enabled |
| **Connection Draining** | Enabled (600s timeout) |
| **Subnets** | web tier subnets |

**SSL Certificates:**
- dev1: `arn:aws:acm:us-east-1:343550350117:certificate/426827a5-afcd-4747-8f2d-40762e05cddd`
- prod1: `arn:aws:acm:us-east-1:889199535989:certificate/7d7e08d0-4cb1-4678-bf3f-a8c007c45cf8`

## DNS Configuration

| Environment | DNS Record |
|-------------|------------|
| qa1 | vf-export-qa1-us-east-1.titan.nonprod-tmaws.io |
| dev1 | vf-export-dev1-us-east-1.titan.nonprod-tmaws.io |
| preprod1 | vf-export-preprod1-us-east-1.titan.prod-tmaws.io |
| prod1 | vf-export-prod1-us-east-1.titan.pub-tmaws.io |

**Configuration:**
- Type: Route 53 A Record (Alias to ELB)
- Health Check: Evaluate target health enabled
- Zone: nonprod-tmaws.io (dev/qa) or prod-tmaws.io (preprod/prod)

## Storage Resources

### S3 Buckets

**Service Storage:**
- **dev1**: `prd1541.vf.dev.us-east-1.tmaws-export-service`
- **prod1**: `prd1541.vf.prod1.us-east-1.tmaws-export-service`

**Scoring Data:**
- **dev1**: `prd2011.dev1.us-east-1.vf-scoring.tmaws`
- **prod1**: `prd2011.prod1.us-east-1.vf-scoring.tmaws`

**Campaign Data:**
- **dev1**: `prd2011.dev1.us-east-1.campaign-data.tmaws`
- **prod1**: `prd2011.prod1.us-east-1.campaign-data.tmaws`

**Data Science (FanScore):**
- **dev1**: `prd3563-nonprod-fanscore-ds-us-east-1`
- **prod1**: `prd3563-prod-fanscore-ds-us-east-1`

### AWS Athena

**Access Configuration:**
- Workgroup: primary
- Database: `prd2011_${environment}_campaign_data`
- Table: `fanlist_entry`
- Glue Catalog: Enabled for metadata management

## Data Streaming

### AWS Kinesis

**Permissions:**
- Stream Pattern: `PRD1541*`
- Actions: DescribeStream, GetShardIterator, GetRecords, PutRecord, PutRecords, ListStreams

## Networking

### VPC Configuration

| Environment | VPC | Region | Subnets |
|-------------|-----|--------|---------|
| dev1 | dev | us-east-1 | web tier |
| prod1 | prod | us-east-1 | web tier |

### Security Groups

**campaigns-sg:**
- Ingress: Port 8080 from 10.0.0.0/8 (internal network)
- Egress: All traffic allowed (0.0.0.0/0)

**Additional Security Groups:**
- `web` - Standard web tier security group
- `onprem` - On-premises network access

## IAM Roles and Policies

### Instance Role: `default`

**Trust Relationships:**
- EC2 service (for instance profile)
- Cross-account: `arn:aws:iam::710703089922:role/prd1541-verifiedfan-export-service-s3` (production)

**Attached Policies:**

1. **AmazonEC2ContainerRegistryReadOnly**
   - ECR image pull access
   - Actions: GetAuthorizationToken, BatchCheckLayerAvailability, GetDownloadUrlForLayer, etc.

2. **KinesisInline**
   - Kinesis stream access for PRD1541 streams
   - Actions: DescribeStream, GetShardIterator, GetRecords, PutRecord, PutRecords

3. **ServiceS3**
   - Full access to service, scoring, and campaign data buckets
   - Actions: List*, Get*, Put*, DeleteObject, DeleteObjects

4. **DataScienceS3**
   - Access to Data Science FanScore bucket
   - Actions: ListBucket, GetObject, PutObject*

5. **AthenaTable**
   - Query access to campaign data in Athena
   - Actions: StartQueryExecution, GetQueryExecution, GetQueryResults
   - Glue: GetDatabase, GetTables, GetPartitions

6. **SFMC-S3 (AssumeRole)**
   - dev1: `arn:aws:iam::452400060166:role/PRD3387-TMNT-ETL-CrossAccount-dev`
   - prod1: `arn:aws:iam::367921453571:role/PRD3387-TMNT-ETL-CrossAccount-prod`

7. **TMOL-S3 (AssumeRole)**
   - dev1: `arn:aws:iam::774566154345:role/vf-webapp-s3-full`
   - prod1: `arn:aws:iam::259990900932:role/vf-webapp-s3-full`

## Monitoring & Observability

### CloudWatch Alarms

**CPU High Alarm:**
- Metric: CPUUtilization
- Threshold: > 30% (variable: `cpu_scale_up`)
- Evaluation: 3 periods of 60 seconds
- Action: Trigger scale-up policy

**CPU Low Alarm:**
- Metric: CPUUtilization
- Threshold: < 15% (variable: `cpu_scale_down`)
- Evaluation: 3 periods of 300 seconds
- Action: Trigger scale-down policy

### Metrics Exporters

**Prometheus Integration:**
- Node Exporter: Port 9100 (host metrics)
- cAdvisor: Port 4914 (container metrics)
- Application Tags: `Prometheus=enabled`, `Prometheus8080=enabled`

## Logging

### ELK Stack Integration

**Fluentd Configuration:**
- Log Driver: fluentd (Docker)
- Tag: `campaigns`
- Format: JSON with parsing
- Destination: AWS Elasticsearch Service

**Log Endpoints:**
- dev1: `verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io`
- prod1: `verifiedfan-logs.prod1.us-east-1.prod-tmaws.io`

**Log Enrichment:**
- AWS Region
- Product Name
- Environment Tag
- Instance ID
- Private IP Address

## Security

### CrowdStrike Falcon

**Configuration:**
- Agent: Latest falcon-sensor image
- CID: 6116EF206F804CCABFB1EBF819369952-E8

**Environment Tags:**
- dev1: `Env/Nonprod`
- prod1: `Env/Prod`

**Additional Tags:**
- ProductCode: PRD1541
- InventoryCode: vf-export
- PosturePref: Measured
- UpdatePref: Early
- LogicalGrouping: VF
- Division: Marketplace
- Type: Normal
- Location: us-east-1

## Resource Tagging

All resources are tagged with:
- **ProductCode**: PRD1541
- **Environment**: dev1 / preprod1 / prod1
- **InventoryCode**: vf-export
- **RuntimeHours**: off (scheduling disabled)

## Off-Hours Scheduling

**Configuration:**
- `create_night_schedule`: 0 (disabled in all environments)
- Instances run 24/7
