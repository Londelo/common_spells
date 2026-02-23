# Infrastructure Resources - upload-service

## Overview

The upload-service is deployed on AWS using EC2 instances with Docker containers, managed through Terraform infrastructure-as-code. The service uses auto-scaling EC2 instances behind a Classic Elastic Load Balancer (ELB) in private subnets.

## Compute Resources

### EC2 Auto Scaling Group

| Resource | Configuration | Notes |
|----------|--------------|-------|
| **Launch Template** | Flatcar Linux (latest AMI) | CoreOS-based container-optimized OS |
| **Instance Type** | Configurable per environment | Set via `app_instance_type` variable |
| **Min Instances** | Configurable (`app_instance_min_count`) | Minimum capacity |
| **Max Instances** | Configurable (`app_instance_max_count`) | Maximum capacity for auto-scaling |
| **Instance Port** | 8080 (HTTP) | Application container port |
| **Health Check** | ELB health check on `/heartbeat` | HTTP health check endpoint |
| **Termination Policy** | OldestLaunchConfiguration | Replaces oldest instances first |

### Container Configuration

The service runs as a Docker container on each EC2 instance:

- **Base Image**: `node:18.18.2-alpine`
- **Container Port**: 8080
- **Image Registry**: AWS ECR (`tmhub.io` / `889199535989.dkr.ecr.us-east-1.amazonaws.com`)
- **Repository**: `titan/upload-service`
- **Working Directory**: `/opt/titan`
- **Entry Point**: `node service.js`

### Supporting Containers

Each EC2 instance runs several sidecar containers:

1. **Fluentd** - Log aggregation and forwarding to Elasticsearch
   - Image: `tmhub.io/tm-waiting-room/fluentd:master-3454331`
   - Port: 24224 (local only)
   - Purpose: Forward application logs to ELK stack

2. **cAdvisor** - Container metrics monitoring
   - Port: 4914
   - Purpose: Expose container resource usage metrics

3. **Node Exporter** - Host metrics for Prometheus
   - Image: `prom/node-exporter` (configurable version)
   - Port: 9100
   - Purpose: Export host-level metrics (CPU, memory, disk)

4. **Falcon Sensor** - CrowdStrike endpoint security
   - Image: `prod.tmhub.io/prod/registry.crowdstrike.com/falcon-sensor/us-2/release/falcon-sensor:latest`
   - Mode: Privileged container with host networking
   - Purpose: Security monitoring and threat detection

## Load Balancing

### Classic Elastic Load Balancer (ELB)

| Property | Value |
|----------|-------|
| **Type** | AWS Classic Load Balancer |
| **Protocol** | HTTPS (port 443) → HTTP (port 8080) |
| **Internal** | Yes (private, internal-only access) |
| **Subnets** | Web tier subnets across multiple AZs |
| **Cross-Zone Load Balancing** | Enabled |
| **Connection Draining** | Enabled (600s timeout) |
| **Health Check** | HTTP:8080/heartbeat |
| **Health Check Interval** | 30 seconds |
| **Healthy Threshold** | 3 checks |
| **Unhealthy Threshold** | 2 checks |

### DNS Configuration

- **DNS Alias**: `uploads` (configurable via `app_elb_dns_alias_name`)
- **Route53 Record**: `{alias}-{env}-{region}.{product_name}.{zone}`
- **Example**: `uploads-dev1-us-east-1.titan.nonprod-tmaws.io`
- **Type**: Route53 Alias record pointing to ELB

## Storage

### S3 Buckets

The service uses S3 buckets for file uploads and storage:

| Bucket Purpose | Configuration | Access |
|----------------|---------------|--------|
| **Upload Bucket** | `{naming_prefix}-{inventory_code}` | Private ACL |
| **Bucket Policy** | Service role access only | List, Put, Get permissions |
| **Scoring Bucket** | Configurable (`scoring_bucket_name`) | EC2 instance role access |
| **QA Scoring Bucket** | Optional (`qa_scoring_bucket_name`) | Conditional, for QA environment |

**S3 Permissions**: EC2 instances can:
- List, Put, Get, Delete objects
- Access via IAM role (no credentials stored on instances)
- Cross-account access via `tmol_s3_role_arn` for specific buckets

## Networking

### VPC Configuration

| Component | Details |
|-----------|---------|
| **VPC** | Configurable per environment (via `vpc` variable) |
| **Subnets** | Web tier subnets (private, multi-AZ) |
| **Availability** | Multi-AZ deployment for high availability |

### Security Groups

**Custom Application Security Group** (`campaigns-sg`):
- **Inbound**: TCP port 8080 from 10.0.0.0/8 (internal network)
- **Outbound**: All traffic to 0.0.0.0/0

**Additional Security Groups** (from network module):
- `web` security group - Standard web tier access
- `onprem` security group - On-premises network access

## Data Streaming

### AWS Kinesis

The service has permissions to interact with Kinesis streams:

| Permission | Resource Pattern |
|------------|------------------|
| **Actions** | DescribeStream, GetShardIterator, GetRecords, PutRecord, PutRecords, ListStreams |
| **Streams** | `arn:aws:kinesis:*:*:stream/PRD1541*` |

## Integration Services

### AWS Step Functions

- **Permission**: `states:StartExecution`
- **Resource**: Configurable via `selection_step_fn_arn` variable
- **Purpose**: Trigger state machine executions from the service

### AWS Lambda

- **Permission**: `lambda:InvokeFunction`
- **Scope**: All Lambda functions in the account
- **Purpose**: Invoke Lambda functions as needed from EC2 instances

## IAM Roles and Policies

### EC2 Instance Role

The EC2 instances assume an IAM role with the following policies:

| Policy | Purpose |
|--------|---------|
| **ECR ReadOnly** | Pull Docker images from ECR registry |
| **S3 Access** | Full access to scoring and upload buckets |
| **Kinesis** | Read/write access to Kinesis streams |
| **Lambda Invoke** | Invoke Lambda functions |
| **Step Functions** | Start Step Function executions |
| **AssumeRole** | Assume TMOL S3 access role for cross-account access |

## Auto-Scaling

### Scaling Policies

**Scale Up Policy**:
- **Trigger**: CPU utilization > 30% (configurable via `cpu_scale_up`)
- **Action**: Add 4 instances
- **Adjustment Type**: ChangeInCapacity
- **Cooldown**: 300 seconds
- **Evaluation Periods**: 3 consecutive periods

**Scale Down Policy**:
- **Trigger**: CPU utilization < 15% (configurable via `cpu_scale_down`)
- **Action**: Remove 1 instance
- **Adjustment Type**: ChangeInCapacity
- **Cooldown**: 300 seconds
- **Evaluation Periods**: 3 consecutive periods

### Off-Hours Scheduling

Optional scheduled scaling for cost optimization:

**Night Schedule** (turn down):
- **Time**: 2:00 AM UTC daily (7 PM PDT / 6 PM PST)
- **Action**: Scale to night-time capacity (`app_instance_ns_min_count`, `app_instance_ns_max_count`)

**Reset Schedule** (turn back up):
- **Time**: 12:30 PM UTC Mon-Fri (8 AM EDT / 7 AM EST)
- **Action**: Restore normal capacity

## Monitoring & Observability

### CloudWatch Alarms

| Alarm | Condition | Action |
|-------|-----------|--------|
| **CpuHigh** | Average CPU > 30% for 3 minutes | Trigger scale-up policy |
| **CpuLow** | Average CPU < 15% for 5 minutes | Trigger scale-down policy |

### Prometheus Metrics

EC2 instances are tagged for Prometheus scraping:
- `Prometheus=enabled` - Standard Prometheus scraping
- `Prometheus8080=enabled` - Application metrics on port 8080

### Logging

**Fluentd Configuration**:
- **Source**: Docker container logs via fluentd driver
- **Processing**: JSON parsing, log concatenation, metadata enrichment
- **Destination**: AWS Elasticsearch Service
- **Index**: `logstash-application_log-{date}`
- **Metadata**: AWS region, product name, environment, instance ID, IP address

## Environment Variables

The following environment variables are injected into the application container:

| Variable | Source | Purpose |
|----------|--------|---------|
| `NODE_ENV` | Terraform (`app_env`) | Node.js environment (dev/preprod/prod) |
| `AWS_REGION` | Terraform | AWS region for SDK calls |

Additional configuration is managed via the `@verifiedfan/configs` library.

## Security & Compliance

### Secrets Management

- **No hardcoded credentials**: All AWS access via IAM instance profiles
- **ECR Authentication**: Automatic via IAM role
- **SSL/TLS**: HTTPS termination at ELB with ACM certificate

### Network Security

- **Private Instances**: EC2 instances in private subnets (no direct internet access)
- **Internal ELB**: Load balancer is internal-only
- **Security Groups**: Strict ingress rules (port 8080 from 10.0.0.0/8 only)

### Endpoint Security

- **CrowdStrike Falcon**: Deployed on all instances
- **Environment Class**: Configurable per environment (`falcon_environment_class`)
- **Tags**: Includes product, environment, and organizational tags

## Resource Naming

All resources use standardized naming via the `terraform-module-naming` module:

**Format**: `{product_code}-{environment}-{inventory_code}-{region}-{resource_type}`

**Tags** applied to all resources:
- `ProductCode`: Organizational product identifier
- `Environment`: dev/preprod/prod
- `InventoryCode`: Service-specific identifier
- `RuntimeHours`: Cost optimization tag

## Infrastructure Dependencies

The infrastructure uses several Terraform modules from the organization's module library:

| Module | Purpose | Version |
|--------|---------|---------|
| **terraform-module-networks** | VPC, subnets, security groups | v3.2.3 |
| **terraform-module-naming** | Standardized resource naming | v1.3.3 |
| **terraform-module-ami** | AMI selection (Flatcar Linux) | v0.2.10 |
| **terraform-module-zones** | Route53 zone management | v0.4.0 |
