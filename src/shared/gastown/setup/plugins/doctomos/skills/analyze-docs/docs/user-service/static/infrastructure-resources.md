# Infrastructure Resources - user-service

## Platform Overview

The user-service is a Node.js 18 microservice deployed on Kubernetes using Helm charts. It runs as a containerized application with integrated logging, monitoring, and tracing capabilities.

## Kubernetes Resources

### Container Image

| Component | Repository | Registry |
|-----------|-----------|----------|
| Service | titan/users-service | 889199535989.dkr.ecr.us-east-1.amazonaws.com |
| Base Image | node18-base:18.18.2-alpine-latest | tmhub.io/verifiedfan |

### Deployment Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| **Name** | vf-usr-srvc | Service identifier in Kubernetes |
| **Namespace** | prd1541 | Kubernetes namespace |
| **Product Code** | prd1541 | TM product identifier |
| **Inventory Code** | vf-usr-srvc | Inventory tracking code |
| **Tier** | app | Application tier |
| **Platform** | aws | Cloud platform |

### Pod Configuration

| Setting | Dev | Production |
|---------|-----|------------|
| **Replica Count** | 1 | 3 |
| **Max Replicas** | 1 | 12 (HPA enabled) |
| **CPU Request** | 500m | 500m |
| **CPU Limit** | 500m | 2 cores |
| **Memory Request** | 512Mi | 1Gi |
| **Memory Limit** | 1Gi | 3Gi |
| **Min Ready Seconds** | 15 | 15 |
| **Termination Grace Period** | 30s | 30s |
| **Max Unavailable Pods** | - | 75% |

### Horizontal Pod Autoscaling

- **Enabled**: Yes (production environments)
- **Metric**: CPU Utilization
- **Target**: 25% average CPU utilization
- **Min Replicas**: 3 (prod), 1 (dev)
- **Max Replicas**: 12 (prod), 1 (dev)

### Health Checks

| Check | Configuration |
|-------|---------------|
| **Liveness Probe** | HTTP GET /heartbeat |
| Initial Delay | 30 seconds |
| Timeout | 5 seconds |
| Period | 10 seconds |
| Success Threshold | 1 |
| Failure Threshold | 3 |
| **Readiness Probe** | HTTP GET /heartbeat |
| Initial Delay | 30 seconds |
| Timeout | 5 seconds |
| Period | 10 seconds |
| Success Threshold | 1 |
| Failure Threshold | 3 |

## Networking

### Service Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 8080 | HTTP | Application traffic |
| 0 | HTTPS | Not exposed (HTTPS handled by ingress) |
| 0 | Management | Not exposed |

### Ingress Configuration

| Environment | FQDN | Certificate ARN | Scheme |
|-------------|------|-----------------|--------|
| **QA** | vf-usr-srvc-qa.vf.nonprod9.us-east-1.tktm.io | (internal) | internal |
| **Dev** | vf-usr-srvc-dev.vf.nonprod9.us-east-1.tktm.io | arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd | internal |
| **Preprod** | vf-usr-srvc.vf.preprod9.us-east-1.tktm.io | arn:aws:acm:us-east-1:667096744268:certificate/763fdb83-0bc0-4398-8687-8245469626d8 | internal |
| **Prod US-East** | vf-usr-srvc.vf.prod9.us-east-1.tktm.io | arn:aws:acm:us-east-1:667096744268:certificate/763fdb83-0bc0-4398-8687-8245469626d8 | internal |
| **Prod US-West** | vf-usr-srvc.vf.prod10.us-west-2.tktm.io | (configured per cluster) | internal |

**Ingress Settings:**
- **Listen Ports**: HTTPS on port 443
- **Success Codes**: 200
- **Idle Timeout**: 60 seconds
- **TLS**: Enabled via AWS ACM certificates
- **Load Balancer Type**: AWS ALB (Application Load Balancer)

## Data Storage

### MongoDB

The service uses MongoDB Atlas (managed MongoDB) for data persistence.

| Setting | Configuration |
|---------|---------------|
| **Replica Set** | NonProd0-shard-0 |
| **Port** | 27017 |
| **SSL/TLS** | Enabled |
| **Auth Source** | admin |
| **Read Preference** | NEAREST |

**Connection Details:**
- **Dev Database**: dev
- **Nonprod Hosts**:
  - nonprod0-shard-00-00-iottj.mongodb.net
  - nonprod0-shard-00-01-iottj.mongodb.net
  - nonprod0-shard-00-02-iottj.mongodb.net
- **Authentication**: Username/password (stored in config files per environment)

**Collections:**
- Users collection (primary data store)
- Sessions/tokens
- Worker keys
- Permissions

**Indexes:**
- Managed via `createMongoIndexes` command
- Created automatically during pre-deployment stage

## AWS Resources

### IAM Roles

| Environment | Role ARN |
|-------------|----------|
| **Dev** | arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.dev1.iam-kube-default |
| **Prod** | arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default |

**Purpose**: Service account permissions for AWS resource access

### ECR (Elastic Container Registry)

| Repository | Host | Account |
|------------|------|---------|
| titan/users-service | 889199535989.dkr.ecr.us-east-1.amazonaws.com | 889199535989 |

**Tags:**
- Build version-based tags (e.g., `1.2.3`, `latest`)
- Feature test tags with `-features` suffix

### AWS Kinesis (Campaign Data Stream)

| Environment | Stream Name | Region |
|-------------|-------------|--------|
| **Dev** | prd2011-dev1-vf1-input-stream | us-east-1 |

**Purpose**: Campaign data streaming (referenced in AWS clients config)

### AWS Accounts

| Environment | Account ID | Region |
|-------------|-----------|--------|
| **Dev/NonProd** | 343550350117 | us-east-1 |
| **Prod** | 889199535989 | us-east-1 |
| **Prod West** | 889199535989 | us-west-2 |

## External Service Dependencies

### Ticketmaster Services

| Service | Environment | Endpoint |
|---------|-------------|----------|
| **TM Identity** | Dev | https://dev1.identity.nonprod-tmaws.io |
| **TM UAPI** | QA | https://acoe-s-qa-us-east-1.accounts.nonprod-tmaws.io:8443 |
| **TM SLAS** | QA | https://app.slas-service.qa1.prd2166.nonprod9.us-east-1.tktm.io:8443 |
| **TM Wallet** | QA | https://api.payment.qa3.us-east-1.nonprod-tmaws.io |

### Internal Titan Services

| Service | Environment | Endpoint |
|---------|-------------|----------|
| **Entries Service** | Dev | https://vf-ent-srvc-dev.vf.nonprod9.us-east-1.tktm.io |
| **Exports Service** | Dev | https://vf-export-dev1-us-east-1.titan.nonprod-tmaws.io |

### Social Media OAuth Providers

| Provider | Configuration |
|----------|---------------|
| **Facebook** | App ID, Secret, API v2.9 |
| **Twitter** | App Key, Secret |
| **Tumblr** | App Key, Secret |
| **YouTube/Google** | Consumer Key, Secret |

**Note**: OAuth credentials are environment-specific and stored in config YAML files

## Secrets Management

Sensitive configuration data is stored in:
- **Kubernetes ConfigMaps**: Non-sensitive configuration
- **YAML Config Files**: Environment-specific settings (deployed with application)
- **IAM Roles**: AWS resource access (no static credentials)

**Configuration Schema:**
- JWT private keys
- MongoDB credentials
- OAuth client secrets
- API keys for external services

**Security Note**: Credentials in default.config.yml appear to be development/test credentials. Production credentials should be managed via secure secret management.

## Observability Stack

### OpenTelemetry Tracing

| Setting | Value |
|---------|-------|
| **Product Code** | prd1541 |
| **Product Acronym** | vf |
| **Tracer Name** | usr-srvc |
| **Service Name** | vf.usr-srvc |
| **Product Group** | vf-srvc |
| **Collector Host** | otel-collector-agent.prd3786.svc.cluster.local |
| **Collector Port** | 4318 |
| **Encryption** | none (internal cluster traffic) |

### Prometheus Metrics

| Setting | Value |
|---------|-------|
| **Enabled** | true |
| **Metrics Path** | /metrics |
| **Scheme** | http |
| **System Metric Interval** | 10000ms (10 seconds) |

**Metrics Collected:**
- HTTP request duration
- Request counter
- Default Node.js process metrics (CPU, memory, GC)
- Custom business metrics

### Fluentd Logging

| Setting | Dev | Production |
|---------|-----|------------|
| **Enabled** | true | true |
| **Image** | tmhub.io/tm-waiting-room/fluentd:master-3454331 | Same |
| **CPU Request** | 100m | 100m |
| **CPU Limit** | 100m | 100m |
| **Memory Request** | 500Mi | 500Mi |
| **Memory Limit** | 500Mi | 500Mi |

**Log Configuration:**
- **Source**: Tail /logs/titan.log (JSON format)
- **Format**: Logstash JSON
- **Destination**: AWS Elasticsearch Service
  - Dev: verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io
  - Prod: verifiedfan-logs.prod1.us-east-1.prod-tmaws.io
- **Index**: logstash-application_log
- **Flush Interval**: 1 second
- **Chunk Limit**: 8MB
- **Queue Length**: 64

**Log Enrichment:**
- Product code: PRD1541
- Environment tag
- Region
- Container name

## Kubernetes Clusters

| Cluster | Environment | Region | Namespace |
|---------|-------------|--------|-----------|
| **nonprod9.us-east-1** | dev, qa | us-east-1 | prd1541 |
| **preprod9.us-east-1** | preprod | us-east-1 | prd1541 |
| **prod9.us-east-1** | prod | us-east-1 | prd1541 |
| **prod10.us-west-2** | prod | us-west-2 | prd1541 |

## Helm Chart

| Setting | Value |
|---------|-------|
| **Chart Repository** | tm/webservice |
| **Chart Version** | 11.6.0 |
| **Release Name (Dev)** | vf-usr-srvc-dev |
| **Release Name (QA)** | vf-usr-srvc-qa |
| **Release Name (Prod)** | vf-usr-srvc |
| **Revision History Limit** | 3 |

## Resource Cleanup

| Setting | Value |
|---------|-------|
| **Janitor TTL (Dev)** | 4320h (180 days) |
| **Canary Deployment** | Disabled (allowCanary: false) |
