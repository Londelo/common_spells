# Infrastructure Resources - monoql

## Overview

MonoQL is a GraphQL API service for the Verified Fan platform, deployed as a containerized Node.js application on Kubernetes (AWS EKS). It provides a unified GraphQL interface for user, campaign, entry, and code management services.

## Container Infrastructure

### Docker Images

| Image | Base | Purpose | Build Context |
|-------|------|---------|---------------|
| `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/monoql:${BUILD_VERSION}` | node:18.18.2-alpine | Main application service | ./dist |
| `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/monoql:${BUILD_VERSION}-features` | node:18.18.2-alpine | Feature test runner | . (features/Dockerfile) |

### Application Configuration

- **Base Image**: node:18.18.2-alpine
- **Application Directory**: `/opt/titan`
- **Entry Point**: `node service.js` (main), `./wfcAndRunFeatures.sh` (features)
- **HTTP Port**: 8080
- **Log Path**: `/logs`

## Kubernetes Resources

### Helm Chart

- **Chart Repository**: tm/webservice
- **Chart Version**: 11.6.0
- **Release Name**: monoql (with env suffixes: -dev, -qa)
- **Namespace**: prd1541

### Pod Configuration

| Environment | Replicas (Min/Max) | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-------------|-------------------|-------------|-----------|----------------|--------------|
| dev | 1/1 | 500m | 500m | 512Mi | 1Gi |
| qa | 1/1 | 500m | 500m | 512Mi | 1Gi |
| preprod | 5/15 | 500m | 2 | 1Gi | 3Gi |
| prod (us-east-1) | 5/15 | 500m | 2 | 1Gi | 3Gi |
| prod (us-west-2) | 5/15 | 500m | 2 | 1Gi | 3Gi |

### Auto-scaling Configuration

- **Metric**: CPU Utilization
- **Target**: 60% of requested CPU
- **Scale Up**: When CPU > 60%
- **Scale Down**: When CPU < 60%

### Health Checks

Both liveness and readiness probes configured:
- **Path**: `/heartbeat`
- **Initial Delay**: 30s
- **Timeout**: 5s
- **Period**: 10s
- **Success Threshold**: 1
- **Failure Threshold**: 3

## AWS Resources

### Elastic Container Registry (ECR)

- **Repository**: `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/monoql`
- **Region**: us-east-1
- **Account**: 889199535989 (prod)

### IAM Roles

| Environment | IAM Role ARN |
|-------------|-------------|
| dev | arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.dev1.iam-kube-default |
| prod (us-east-1) | arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default |

### Application Load Balancer (Ingress)

| Environment | Scheme | Certificate ARN | Idle Timeout |
|-------------|--------|----------------|--------------|
| dev | internal | arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd | 60s |
| qa | internal | (inherited from dev) | 60s |
| preprod | internet-facing | arn:aws:acm:us-east-1:667096744268:certificate/2e5e6799-0ea6-48ce-b560-56bc8398e768 | 60s |
| prod | internet-facing | arn:aws:acm:us-east-1:667096744268:certificate/2e5e6799-0ea6-48ce-b560-56bc8398e768 | 60s |

- **Listen Ports**: HTTPS (443)
- **Target Port**: 8080 (HTTP)
- **Health Check**: GET /heartbeat (expecting 200)

### S3 Buckets

- **Scoring Bucket**: `prd2011.prod1.us-east-1.vf-scoring.tmaws` (production environment)

## DNS Configuration

### Environment FQDNs

| Environment | FQDN | Public Domains |
|-------------|------|----------------|
| qa | monoql-qa.vf.nonprod9.us-east-1.tktm.io | - |
| dev | monoql-dev.vf.nonprod9.us-east-1.tktm.io | - |
| preprod | monoql.vf.preprod9.us-east-1.pub-tktm.io | - |
| prod (us-east-1) | monoql.vf.prod9.us-east-1.pub-tktm.io | registration.ticketmaster.com<br>registration.ticketmaster.ca<br>registration.livenation.com<br>registration.ticketmaster.com.mx<br>verifiedfan.ticketmaster.com<br>verifiedfan.ticketmaster.ca<br>verifiedfan.livenation.com<br>verifiedfan.ticketmaster.com.mx |
| prod (us-west-2) | monoql.vf.prod10.us-west-2.pub-tktm.io | (same as us-east-1) |

## Backend Service Dependencies

MonoQL integrates with these backend microservices:

| Service | Environment | URL |
|---------|-------------|-----|
| Users Service | prod | https://vf-usr-srvc.vf.prod9.us-east-1.tktm.io |
| Campaigns Service | prod | https://vf-camp-srvc.vf.prod9.us-east-1.tktm.io |
| Codes Service | prod | https://vf-code-srvc.vf.prod9.us-east-1.tktm.io |
| Entries Service | prod | https://vf-ent-srvc.vf.prod9.us-east-1.tktm.io |
| Uploads Service | prod | https://uploads-prod1-us-east-1.titan.prod-tmaws.io |
| Exports Service | prod | https://vf-export-prod1-us-east-1.titan.prod-tmaws.io |
| Waves Service | prod | https://wave-svc-prod1-us-east-1.titan.prod-tmaws.io |
| Identity Service | prod | https://identity.ticketmaster.com (domain-specific variants) |

## Configuration Management

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| NODE_ENV | Node.js environment | dev, prod, preprod |
| environment_tag | Kubernetes environment tag | kube-dev, kube-prod |
| profile | Application profile | kube-dev, kube-prod |
| domain | Base domain for services | tktm.io, pub-tktm.io |
| DOCKER_IMAGE_TAG | Docker image tag | latest |
| AWS_REGION | AWS region | us-east-1, us-west-2 |
| REGION | Application region | us-east-1, us-west-2 |
| ENVIRONMENT | Environment name | dev, prod, preprod |

### Configuration Files

Environment-specific configurations located in `/configs/`:
- `dev.config.yml` - Development environment
- `qa.config.yml` / `qa2.config.yml` - QA environments
- `preprod.config.yml` - Pre-production
- `prod.config.yml` - Production (us-east-1)
- `prodw.config.yml` - Production (us-west-2)
- `schema.yml` - Configuration schema validation

Configuration includes:
- Service URLs
- JWT public keys
- CORS policies
- Logging settings
- Feature flags
- AWS resource identifiers

## Sidecar Containers

### Fluentd (Log Aggregation)

- **Image**: tmhub.io/tm-waiting-room/fluentd:master-3454331
- **CPU Request**: 100m
- **Memory Request**: 500Mi
- **CPU Limit**: 100m
- **Memory Limit**: 500Mi

**Log Configuration:**
- **Source**: `/logs/titan.log` (JSON format)
- **Tags**: Product code (PRD1541), environment, region, container name
- **Destination**: AWS Elasticsearch Service
- **Index Pattern**: logstash-application_log-*
- **Flush Interval**: 1s
- **Chunk Limit**: 8MB
- **Queue Limit**: 64 chunks

**Elasticsearch Endpoints:**
- **Dev**: http://verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io
- **Prod**: http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io

## Kubernetes Clusters

| Cluster | Region | Environment | Account |
|---------|--------|-------------|---------|
| nonprod9.us-east-1 | us-east-1 | dev, qa | nonprod |
| preprod9.us-east-1 | us-east-1 | preprod | preprod |
| prod9.us-east-1 | us-east-1 | prod | prod |
| prod10.us-west-2 | us-west-2 | prod | prod |

## Resource Metadata

- **Product Code**: PRD1541
- **Inventory Code**: monoql (monoql-dev for dev environment)
- **Tier**: web
- **Platform**: aws
- **Service Account**: default
- **Revision History Limit**: 3 deployments
- **Min Ready Seconds**: 15s
- **Termination Grace Period**: 30s

## Monitoring & Metrics

### Prometheus

- **Enabled**: true
- **Metrics Path**: `/metrics`
- **Scheme**: http
- **System Metric Interval**: Configured per environment

### Janitor TTL

- **Dev Environment**: 4320h (180 days)
- **Other Environments**: Not configured (resources preserved)
