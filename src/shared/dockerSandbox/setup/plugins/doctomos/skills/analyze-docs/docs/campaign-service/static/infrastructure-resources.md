# Infrastructure Resources - campaign-service

## Overview

The campaign-service is deployed as a containerized Node.js application running on AWS Kubernetes (EKS). The service uses MongoDB for data persistence, Redis for caching, and integrates with multiple AWS services and external APIs.

## Compute Resources

### Kubernetes Deployment

| Property | Value |
|----------|-------|
| **Cluster** | prod9.us-east-1 (primary), prod10.us-west-2 (secondary) |
| **Namespace** | prd1541 |
| **Release Name** | vf-camp-srvc |
| **Helm Chart** | tm/webservice v11.6.0 |
| **Min Replicas** | 3 |
| **Max Replicas** | 12 |
| **CPU Request** | 500m |
| **CPU Limit** | 2 cores |
| **Memory Request** | 1Gi |
| **Memory Limit** | 3Gi |
| **Auto-scaling Target** | 25% CPU utilization |

### Container Images

| Image | Purpose | Registry |
|-------|---------|----------|
| titan/campaign-service | Application container | 889199535989.dkr.ecr.us-east-1.amazonaws.com |
| titan/campaign-service-features | Integration test container | 889199535989.dkr.ecr.us-east-1.amazonaws.com |
| node:18.18.2-alpine | Base image | Docker Hub |

### Health Checks

- **Liveness Probe**: GET /heartbeat (30s initial delay, 5s timeout, 10s period)
- **Readiness Probe**: GET /heartbeat (30s initial delay, 5s timeout, 10s period)

## Data Storage

### MongoDB Atlas

**Production Cluster (prod)**

| Property | Value |
|----------|-------|
| **Cluster** | VF-prod-shard-0 (replica set) |
| **Nodes** | 3 shards |
| **Hostnames** | vf-prod-shard-00-00-z84pk.mongodb.net<br>vf-prod-shard-00-01-z84pk.mongodb.net<br>vf-prod-shard-00-02-z84pk.mongodb.net |
| **Port** | 27017 |
| **Database** | prod |
| **Auth Source** | admin |
| **SSL** | Enabled |
| **Read Preference** | NEAREST |

**Collections and Indexes**

| Collection | Key Indexes | Purpose |
|------------|-------------|---------|
| **campaigns** | `domain.site` (unique, sparse)<br>`name` (unique)<br>`categoryId` (unique, sparse)<br>`date.open`, `status`<br>`date.close`, `status`<br>`date.created`<br>`artist.id`, `status` | Campaign configuration and lifecycle management |
| **markets** | `campaign_id`<br>`event.id`<br>`event.ids` (partial)<br>`event.presaleDateTime` (partial)<br>`date.notification` (sparse)<br>`promoterIds` (partial) | Event-to-campaign associations |
| **events** | `status`, `date.end` | Event data cache from Discovery API |
| **contacts** | `keywords` | Contact information |
| **promoters** | `name` (unique)<br>`date.created` | Promoter management |

### Redis (ElastiCache)

| Property | Value |
|----------|-------|
| **Primary Node** | prd3292-prod1-dmnd.t5ssu1.ng.0001.use1.cache.amazonaws.com:6379 |
| **Read Replica** | prd3292-prod1-dmnd-ro.t5ssu1.ng.0001.use1.cache.amazonaws.com:6379 |
| **Purpose** | Caching for search results and Discovery API responses |
| **TTL Settings** | Search cache: configurable<br>Discovery ID cache: configurable |

## Message Queues and Streams

### AWS Kinesis Data Stream

| Stream | Purpose | Region |
|--------|---------|--------|
| prd2011-prod1-vf1-input-stream | Campaign data stream for downstream consumers | us-east-1 |

### AWS SQS Queues

| Queue | Purpose | Region |
|-------|---------|--------|
| prd2011-prod1-us-east-1-reg-sel-refresh-selection | Trigger selection refresh operations | us-east-1 |
| prd2011-prod1-us-east-1-reg-data | Data pipeline processing queue | us-east-1 |

## Networking

### Load Balancing

| Property | Value |
|----------|-------|
| **Ingress Type** | AWS Application Load Balancer (ALB) |
| **Scheme** | Internal |
| **Certificate** | arn:aws:acm:us-east-1:667096744268:certificate/763fdb83-0bc0-4398-8687-8245469626d8 |
| **HTTPS Port** | 443 |
| **Idle Timeout** | 60 seconds |
| **Health Check Path** | /heartbeat |
| **Success Codes** | 200 |

### DNS / FQDNs

| Environment | FQDN |
|-------------|------|
| **Development** | vf-camp-srvc-dev.vf.nonprod9.us-east-1.tktm.io |
| **QA** | vf-camp-srvc-qa.vf.nonprod9.us-east-1.tktm.io |
| **Pre-production** | vf-camp-srvc.vf.preprod9.us-east-1.tktm.io |
| **Production (East)** | vf-camp-srvc.vf.prod9.us-east-1.tktm.io |
| **Production (West)** | vf-camp-srvc.vf.prod10.us-west-2.tktm.io |

## Security

### IAM Roles

| Role | ARN | Purpose |
|------|-----|---------|
| Kubernetes Service Account | arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default | Pod execution role with permissions for AWS services |

### Secrets Management

- MongoDB credentials managed via environment-specific config files
- JWT public key embedded in config for token verification
- API keys and tokens stored in configuration (e.g., Fastly, TM Discovery, GitLab)

**Note**: Sensitive configuration values are managed outside source control and injected at deployment time.

## CDN

### Fastly

| Property | Value |
|----------|-------|
| **Service ID** | jzcal6fzi3hxclocGLNTT6 |
| **Purpose** | CDN caching for registration UI domains |
| **Integration** | Service can purge Fastly cache programmatically |

## External API Integrations

### Ticketmaster Discovery API

| Property | Value |
|----------|-------|
| **Base URL** | https://app.ticketmaster.com/discovery |
| **Version** | v2 |
| **Purpose** | Event discovery and venue information |
| **Caching** | Redis-backed with configurable TTL |

### Ticketmaster Publish API

| Property | Value |
|----------|-------|
| **Base URL** | https://pxy.ges.prod.pub-tmaws.io |
| **Purpose** | Publishing campaign data |

### GitLab API

| Property | Value |
|----------|-------|
| **Purpose** | Trigger replicate-entries pipeline |
| **Project ID** | 47606 |
| **Pipeline Ref** | replicate-entries |

## Environment Variables

### Core Configuration

| Variable | Purpose | Source |
|----------|---------|--------|
| NODE_ENV | Environment identifier (prod, preprod, dev, qa) | Kubernetes values |
| AWS_REGION | AWS region for services | Kubernetes values |
| ENVIRONMENT | Environment tag | Kubernetes values |
| DOCKER_IMAGE_TAG | Container image version | Set during deployment |

### Service Configuration

Configuration is loaded from YAML files in `/configs` directory:
- `prod.config.yml` - Production settings
- `preprod.config.yml` - Pre-production settings
- `dev.config.yml` - Development settings
- `qa.config.yml` - QA settings

Configuration includes:
- MongoDB connection strings and credentials
- Redis URLs
- AWS service endpoints
- JWT public keys
- API keys for external services
- Feature flags and operational settings

## Observability Resources

### Logging

| Property | Value |
|----------|-------|
| **Log Format** | JSON (Logstash format) |
| **Log File** | /logs/titan.log |
| **Shipper** | Fluentd sidecar container |
| **Destination** | AWS Elasticsearch Service |
| **Index Pattern** | logstash-application_log |
| **Region** | us-east-1 |
| **Endpoint** | verifiedfan-logs.prod1.us-east-1.prod-tmaws.io |

### Metrics

| Property | Value |
|----------|-------|
| **Format** | Prometheus |
| **Endpoint** | /metrics (HTTP) |
| **Scrape** | Kubernetes service discovery |
| **Instrumentation** | OpenTelemetry (@verifiedfan/prometheus) |

**Tracked Metrics**:
- HTTP request duration
- HTTP request counter
- Database operation timing
- External service call timing
- System metrics (CPU, memory)

### Distributed Tracing

| Property | Value |
|----------|-------|
| **Library** | OpenTelemetry |
| **Product Code** | PRD1541 |
| **Product Acronym** | VF |
| **Product Group** | Titan |
| **Service Name** | campaign-service |
| **Collector** | Configured per environment |
| **Correlation** | Custom correlation ID header tracking |

## Resource Tagging

| Tag | Value |
|-----|-------|
| product_code | PRD1541 |
| environment_tag | kube-prod (production) / kube-nonprod (non-prod) |
| inventory_code | vf-camp-srvc |
| tier | app |
| platform | aws |
