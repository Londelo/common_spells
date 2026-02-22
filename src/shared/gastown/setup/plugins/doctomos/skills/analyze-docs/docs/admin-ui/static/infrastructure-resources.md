# Infrastructure Resources - admin-ui

## Overview

The Titan Admin UI is deployed in two modes:
1. **Legacy Terraform-managed EC2/ELB deployment** (tm-nonprod, tm-prod accounts)
2. **Kubernetes deployment** (nonprod9, preprod9, prod9 clusters)

---

## Terraform-Managed Resources (Legacy)

### Compute Resources

#### EC2 Auto Scaling Group
- **Name Pattern**: `${product_code}-${environment}-${inventory_code}-app`
- **Instance Type**: m3.medium
- **OS**: CoreOS 1465.7.0
- **Scaling Configuration**:
  - Dev/QA: Min 1, Max 1
  - Prod: Min 1, Max 1
- **Health Check**: ELB-based
- **Termination Policy**: OldestLaunchConfiguration
- **Enabled Metrics**: All ASG metrics (GroupMinSize, GroupMaxSize, GroupDesiredCapacity, etc.)

#### Launch Configuration
- **AMI**: CoreOS 1465.7.0 (via terraform-module-ami)
- **Security Groups**:
  - Web security group (from terraform-module-networks)
  - Onprem security group (from terraform-module-networks)
  - Custom admin-sg (port 8080 ingress from 10.0.0.0/8)
- **User Data**: Cloud-init configuration from `app-cloud-config.yaml`
- **IAM Instance Profile**: Attached with ECR read-only permissions
- **Monitoring**: Enabled in prod, disabled in dev/qa

### Load Balancing

#### Elastic Load Balancer (ELB)
- **Type**: Classic Load Balancer
- **Listener**: HTTPS:443 → HTTP:8080
- **SSL Certificate**: Environment-specific ACM certificates
- **Health Check**:
  - Path: `/heartbeat`
  - Protocol: HTTP:8080
  - Healthy threshold: 3
  - Unhealthy threshold: 2
  - Timeout: 3s
  - Interval: 30s
- **Settings**:
  - Cross-zone load balancing: enabled
  - Connection draining: 600s
- **Visibility**:
  - Dev/QA: Internal
  - Prod: Internet-facing

### Networking

#### DNS (Route 53)
- **Record Pattern**: `${app_elb_dns_alias_name}-${environment_tag}-${aws_region}.${product_name}.${zone}`
- **Type**: Alias record pointing to ELB
- **Zone**:
  - Dev: nonprod-tmaws.io
  - Prod: pub-tmaws.io

#### Security Groups
- **admin-sg**:
  - Ingress: TCP 8080 from 10.0.0.0/8
  - Egress: All traffic to 0.0.0.0/0
- **Web tier** (from terraform-module-networks)
- **Onprem** (from terraform-module-networks)

#### VPC Configuration
- **Dev Environment**: dev VPC
- **Prod Environment**: prod VPC
- **Subnets**:
  - Web tier (for EC2 instances)
  - Public tier (for ELB)

### IAM Resources

#### IAM Role
- **Name**: `${product_code}-${environment}-${inventory_code}-default`
- **Trust Relationship**: ec2.amazonaws.com
- **Purpose**: Allow EC2 instances to pull Docker images from ECR

#### IAM Policy
- **Name**: `AmazonEC2ContainerRegistryReadOnly`
- **Permissions**:
  - `ecr:GetAuthorizationToken`
  - `ecr:BatchCheckLayerAvailability`
  - `ecr:GetDownloadUrlForLayer`
  - `ecr:GetRepositoryPolicy`
  - `ecr:DescribeRepositories`
  - `ecr:ListImages`
  - `ecr:BatchGetImage`

#### IAM Instance Profile
- Attached to EC2 instances via launch configuration

### Container Resources

#### Docker Container (on EC2)
- **Image**: `${ecr_host}/titan/admin:${artifact_version}`
- **ECR Host**: tmhub.io (legacy) / 889199535989.dkr.ecr.us-east-1.amazonaws.com
- **Exposed Port**: 8080
- **Logging**: Fluentd driver (tag: admin)
- **Environment Variables**:
  - `NODE_ENV`: dev/prod
  - `AWS_REGION`: us-east-1

### Monitoring & Observability (EC2 Deployment)

#### cAdvisor
- **Port**: 4914
- **URL**: https://github.com/google/cadvisor/releases/download/v0.22.0/cadvisor
- **Purpose**: Container metrics collection

#### Node Exporter
- **Version**: v0.15.0
- **Port**: 9100
- **Purpose**: System metrics for Prometheus

#### Prometheus Tags
- **Prometheus8080**: enabled (for application metrics)
- **Prometheus**: enabled (for node exporter metrics)

#### Fluentd Logging
- **Image**: 889199535989.dkr.ecr.us-east-1.amazonaws.com/identity/fluent
- **Port**: 24224 (localhost only)
- **Log Destination**: AWS Elasticsearch Service
- **Log Format**: JSON with metadata (product_code, environment_tag, region, instance_id, ip_address)

### Auto Scaling Schedules

#### Night Schedule (Optional)
- **Trigger**: 0 2 * * * (2 AM UTC / 7 PM PDT / 6 PM PST)
- **Action**: Scale down to configured night minimum
- **Controlled by**: `create_night_schedule` variable

#### Reset Schedule (Optional)
- **Trigger**: 30 12 * * 1-5 (12:30 PM UTC Mon-Fri / 8 AM EDT / 7 AM EST)
- **Action**: Restore to normal capacity
- **Controlled by**: `create_night_schedule` variable

### Environment Variables (EC2)

| Variable | Dev | Prod | Source |
|----------|-----|------|--------|
| NODE_ENV | dev | prod | Terraform |
| AWS_REGION | us-east-1 | us-east-1 | Terraform |
| product_code_tag | PRD1541 | PRD1541 | Terraform |
| inventory_code_tag | titan-admin | titan-admin | Terraform |
| environment_tag | dev1 | prod1 | Terraform |
| app_instance_port | 8080 | 8080 | Terraform |
| app_container_port | 8080 | 8080 | Terraform |
| elk_logs_endpoint | verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io | verifiedfan-logs.prod1.us-east-1.prod-tmaws.io | Terraform |

---

## Kubernetes Resources (Current)

### Namespaces
- **Dev/QA/Testing**: prd1541 (nonprod9.us-east-1 cluster)
- **Preprod**: prd1541 (preprod9.us-east-1 cluster)
- **Production**: prd1541 (prod9.us-east-1 cluster)

### Helm Chart
- **Repository**: tm/webservice
- **Version**: 11.6.0
- **Release Names**:
  - Dev: `admin-dev`
  - QA: `admin-qa`
  - Testing: `admin-tests-${CI_COMMIT_REF_NAME}`
  - Preprod: `admin`
  - Prod: `admin`

### Deployments

#### Pod Configuration
- **Image**: tmhub.io/titan/admin:${BUILD_VERSION}
- **Base Image**: node:18.18.2-alpine
- **Product Code**: prd1541
- **Inventory Code**: admin
- **Tier**: web

#### Resources (Common Settings)
- **CPU**:
  - Limits: 500m
  - Requests: 500m
- **Memory**:
  - Limits: 1Gi
  - Requests: 1Gi

#### Scaling Configuration

| Environment | Min Replicas | Max Replicas | CPU Target |
|-------------|--------------|--------------|------------|
| Dev | 1 | 1 | 60% |
| QA | 1 | 1 | 60% |
| Testing | 1 | 1 | 60% |
| Preprod | 1 | 1 | 60% |
| Prod | 2 | 4 | 60% |

### Services

#### HTTP Service
- **Port**: 8080
- **Protocol**: HTTP
- **Health Checks**:
  - Liveness: `/heartbeat` (30s initial delay, 10s period)
  - Readiness: `/heartbeat` (30s initial delay, 10s period)

### Ingress (ALB)

#### Dev Environment
- **FQDN**: admin-dev.vf.nonprod9.us-east-1.tktm.io
- **Certificate**: arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd
- **Scheme**: internal
- **Idle Timeout**: 60s

#### QA Environment
- **FQDN**: admin-qa.vf.nonprod9.us-east-1.tktm.io
- **Certificate**: arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd
- **Scheme**: internal
- **Idle Timeout**: 60s

#### Testing Environment
- **FQDN**: admin-tests-${CI_COMMIT_REF_NAME}.vf.nonprod9.us-east-1.tktm.io
- **Certificate**: arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd
- **Scheme**: internal
- **Idle Timeout**: 60s
- **Lifecycle**: Auto-created per branch, destroyed after tests

#### Preprod Environment
- **FQDN**: admin.vf.preprod9.us-east-1.pub-tktm.io
- **Certificate**: arn:aws:acm:us-east-1:667096744268:certificate/2e5e6799-0ea6-48ce-b560-56bc8398e768
- **Scheme**: internet-facing
- **Idle Timeout**: 60s

#### Production Environment
- **FQDN**: admin.vf.prod9.us-east-1.pub-tktm.io
- **Certificate**: arn:aws:acm:us-east-1:667096744268:certificate/2e5e6799-0ea6-48ce-b560-56bc8398e768
- **Scheme**: internet-facing
- **Idle Timeout**: 60s
- **Aliases**:
  - admin.registration.ticketmaster.com
  - admin.verifiedfan.ticketmaster.com

### IAM Roles (Kubernetes)

| Environment | IAM Role ARN |
|-------------|--------------|
| Dev | arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.dev1.iam-kube-default |
| Prod | arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default |

### Monitoring & Logging (Kubernetes)

#### Prometheus Metrics
- **Enabled**: true
- **Path**: /metrics
- **Scheme**: http
- **System Metric Interval**: 10000ms

#### Fluentd Logging
- **Enabled**: true
- **Image**: tmhub.io/tm-waiting-room/fluentd:master-3454331
- **Log Path**: /logs
- **Log File**: titan.log
- **Destination**: AWS Elasticsearch Service
- **Logstash Format**: true
- **Resources**:
  - CPU: 100m (limit and request)
  - Memory: 500Mi (limit), 500Mi (request)

#### Log Endpoints

| Environment | Elasticsearch Endpoint |
|-------------|------------------------|
| Dev | http://verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io |
| Prod | http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io |

### Environment Variables (Kubernetes)

#### Dev Environment
- `NODE_ENV`: dev
- `environment_tag`: kube-dev
- `profile`: kube-dev
- `domain`: tktm.io
- `DOCKER_IMAGE_TAG`: latest
- `AWS_REGION`: us-east-1

#### Production Environment
- `NODE_ENV`: prod
- `environment_tag`: kube-prod
- `profile`: kube-prod
- `domain`: pub-tktm.io
- `DOCKER_IMAGE_TAG`: latest
- `AWS_REGION`: us-east-1

### ConfigMaps & Volumes
- **Log Volume**: /logs (for Fluentd tail)
- **Fluentd Configuration**: Injected via Helm values

---

## Container Registry

### ECR Repository
- **Registry**: 889199535989.dkr.ecr.us-east-1.amazonaws.com
- **Repository**: titan/admin
- **Legacy Registry**: tmhub.io/titan/admin
- **Image Tag Format**: YYYYMMDD_branch_bBUILDNUMBER (e.g., 20190916_develop_b11151299)

---

## External Dependencies

### GraphQL API
- **Dev**: https://monoql-dev.vf.nonprod9.us-east-1.tktm.io/graphql
- **Prod**: https://registration.ticketmaster.com/graphql

### Other UI Services
- **Fan UI**: https://fan-ui-dev.vf.nonprod9.us-east-1.tktm.io/
- **Registration UI**: https://reg-ui-dev.vf.nonprod9.us-east-1.tktm.io/

---

## Terraform Modules

The infrastructure uses several internal Terraform modules:
- `terraform-module-networks` - VPC, subnets, security groups
- `terraform-module-naming` - Consistent resource naming
- `terraform-module-ami` - AMI selection
- `terraform-module-zones` - Route 53 zone management

---

## Resource Tags

All resources are tagged with:
- **ProductCode**: PRD1541
- **Environment**: dev1, qa1, preprod1, prod1
- **InventoryCode**: titan-admin (or admin-dev, admin-qa for Kubernetes)
- **BusinessHours**: 24HOURS (configurable)
