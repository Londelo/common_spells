# Infrastructure Resources - entry-service

## Overview

The entry-service is deployed as a containerized Node.js application running on Kubernetes (EKS). It uses MongoDB Atlas for data persistence and integrates with various AWS services for queuing, streaming, and storage.

## Container Images

| Image | Purpose | Base Image | Registry |
|-------|---------|------------|----------|
| entry-service | Main application server | node:18.18.2-alpine | 889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/entry-service |
| entry-service-features | Test container for feature tests | node:18.18.2-alpine | 889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/entry-service-features |

## Kubernetes Resources

### Deployment Configuration

- **Helm Chart**: tm/webservice v11.6.0
- **Release Name**: vf-ent-srvc
- **Namespace**: prd1541
- **Replicas**: 3 (minimum) to 12 (maximum)
- **Scaling Metric**: CPU utilization (target: 25%)

### Container Resources

| Resource | Request | Limit |
|----------|---------|-------|
| CPU | 500m | 2 cores |
| Memory | 1Gi | 3Gi |

### Port Configuration

| Port | Protocol | Purpose |
|------|----------|---------|
| 8080 | HTTP | Main application port |
| N/A | HTTPS | Not configured (handled by ingress) |

### Health Checks

- **Liveness Probe**: GET /heartbeat (delay: 30s, period: 10s)
- **Readiness Probe**: GET /heartbeat (delay: 30s, period: 10s)
- **Metrics Endpoint**: GET /metrics (Prometheus format)

### Ingress Configuration

| Environment | FQDN | Scheme | Certificate |
|-------------|------|--------|-------------|
| QA | vf-ent-srvc-qa.vf.nonprod9.us-east-1.tktm.io | internal | TLS |
| Dev | vf-ent-srvc-dev.vf.nonprod9.us-east-1.tktm.io | internal | TLS |
| PreProd | vf-ent-srvc.vf.preprod9.us-east-1.tktm.io | internal | TLS |
| Prod (US-East) | vf-ent-srvc.vf.prod9.us-east-1.tktm.io | internal | arn:aws:acm:us-east-1:667096744268:certificate/763fdb83-0bc0-4398-8687-8245469626d8 |
| Prod (US-West) | vf-ent-srvc.vf.prod10.us-west-2.tktm.io | internal | TLS |

## MongoDB Atlas

### Connection Details

**Production:**
- **Cluster**: VF-prod-shard-0
- **Nodes**:
  - vf-prod-shard-00-00-z84pk.mongodb.net:27017
  - vf-prod-shard-00-01-z84pk.mongodb.net:27017
  - vf-prod-shard-00-02-z84pk.mongodb.net:27017
- **Database**: prod
- **Authentication**: admin database
- **Read Preference**: NEAREST
- **SSL**: Enabled

**Dev/NonProd:**
- **Cluster**: NonProd0-shard-0
- **Nodes**:
  - nonprod0-shard-00-00-iottj.mongodb.net:27017
  - nonprod0-shard-00-01-iottj.mongodb.net:27017
  - nonprod0-shard-00-02-iottj.mongodb.net:27017
- **Database**: dev
- **Authentication**: admin database
- **Read Preference**: NEAREST
- **SSL**: Enabled

## AWS Resources

### Kinesis Data Streams

| Environment | Stream Name | Region | Purpose |
|-------------|-------------|--------|---------|
| Dev | prd2011-dev1-vf1-input-stream | us-east-1 | Campaign data ingestion |
| Prod | prd2011-prod1-vf1-input-stream | us-east-1 | Campaign data ingestion |

### S3 Buckets

| Environment | Bucket Name | Region | Purpose |
|-------------|-------------|--------|---------|
| Dev | prd2011.dev1.us-east-1.campaign-data.tmaws | us-east-1 | Campaign data storage |
| Prod | prd2011.prod1.us-east-1.campaign-data.tmaws | us-east-1 | Campaign data storage |

### DynamoDB Tables

| Environment | Table Name | Purpose | Region |
|-------------|------------|---------|--------|
| Dev | prd2011-dev1-us-east-1-fan-identity-table | Fan identity data | us-east-1 |
| Dev | prd2011-dev1-us-east-1-acct-fanscore-table | Account fanscore data | us-east-1 |

### SQS Queues

| Environment | Queue URL | Purpose |
|-------------|-----------|---------|
| Dev | https://sqs.us-east-1.amazonaws.com/343550350117/prd2011-dev1-us-east-1-reg-replica-retry-score | Registration replica retry scoring |
| Prod | https://sqs.us-east-1.amazonaws.com/889199535989/prd2011-prod1-us-east-1-reg-replica-retry-score | Registration replica retry scoring |

### IAM Roles

| Environment | Role ARN | Purpose |
|-------------|----------|---------|
| Prod | arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default | Kubernetes service account permissions |
| Dev/Prod | arn:aws:iam::343550350117:role/prd2011.vf.us-east-1.dev1.appsync-client-iam-FanIdConsumer | AppSync client access |
| Prod | arn:aws:iam::889199535989:role/prd2011.vf.us-east-1.prod1.appsync-client-iam-FanIdConsumer | AppSync client access (prod) |

## External Service Dependencies

### Internal Microservices

| Service | Environment | URL |
|---------|-------------|-----|
| User Service (Dev) | Dev | https://vf-usr-srvc-dev.vf.nonprod9.us-east-1.tktm.io |
| User Service (Prod) | Prod | https://vf-usr-srvc.vf.prod9.us-east-1.tktm.io |
| Campaign Service (Dev) | Dev | https://vf-camp-srvc-dev.vf.nonprod9.us-east-1.tktm.io |
| Campaign Service (Prod) | Prod | https://vf-camp-srvc.vf.prod9.us-east-1.tktm.io |

### External APIs

| Service | Purpose | Environment-Specific |
|---------|---------|---------------------|
| AppSync | GraphQL API for Fan Identity | Yes (dev1/prod1) |
| Nudata | Fraud detection and device fingerprinting | Yes (w-343181 dev, w-481390 prod) |
| TM Accounts (AUUM) | Ticketmaster account management | QA only in dev |
| Salesforce Marketing Cloud (SFMC) | Email communications | Shared client |
| Payment Phone Confirmation (PPC) | Phone verification service | Yes |
| Social Media APIs | Facebook, Twitter, Tumblr, YouTube | Shared credentials |

## Third-Party Integrations

### Nudata (Fraud Detection)

- **Dev Client ID**: w-343181
- **Prod Client ID**: w-481390
- **Base URL**: https://api-ticketmaster.nd.nudatasecurity.com
- **Placements**: VerifiedFanSignUp, VerifiedFanEdit

### Social Media

- **Facebook API**: v2.9
- **Twitter API**: OAuth 1.0
- **Tumblr API**: OAuth 1.0
- **YouTube API**: Google OAuth 2.0

## Logging and Observability

### Fluentd Sidecar

- **Image**: tmhub.io/tm-waiting-room/fluentd:master-3454331
- **Log Path**: /logs/titan.log
- **Format**: JSON with Logstash format
- **CPU Request**: 100m
- **Memory Request**: 500Mi
- **CPU Limit**: 100m
- **Memory Limit**: 500Mi

### Log Destination

**Production:**
- **Type**: AWS Elasticsearch Service
- **Endpoint**: http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io
- **Region**: us-east-1
- **Index**: logstash-application_log-*
- **Flush Interval**: 1 second

### Metrics

- **Format**: Prometheus
- **Endpoint**: /metrics
- **Scraping**: Enabled via Kubernetes Service Monitor
- **Collection Interval**: 10 seconds (system metrics)

### Tracing

- **Product Code**: prd1541
- **Service Name**: vf.ent-srvc
- **Tracer**: ent-srvc
- **Collector**: otel-collector-agent.prd3786.svc.cluster.local:4318
- **Protocol**: OpenTelemetry (OTLP)
- **Encryption**: None (cluster-local)

## Network Configuration

### DNS Caching

- **TTL**: 60 seconds (60000ms)

### Correlation

- **Header**: x-titan-correlation-id
- **Purpose**: Request tracing across services

### Load Balancer

- **Type**: AWS Application Load Balancer (ALB)
- **Idle Timeout**: 60 seconds
- **Health Check**: 200 status code on /heartbeat
- **Minimum Capacity**: 0 Capacity Units (cost optimization)

## Security Configuration

### TLS/SSL

- **Ingress**: TLS termination at ALB
- **MongoDB**: SSL/TLS enabled
- **Certificate Management**: AWS Certificate Manager (ACM)

### Authentication

- **JWT**: RSA public key validation
- **Service-to-Service**: IAM role-based authentication for AWS services
- **AppSync**: IAM role assumption with TTL (1800 seconds)

## Environment Variables

### Common Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| NODE_ENV | Node.js environment | prod/dev/preprod |
| AWS_REGION | AWS region for services | us-east-1 |
| domain | Domain suffix | tktm.io |
| profile | Configuration profile | kube-prod/kube-dev |
| environment_tag | Environment tag for logging | kube-prod/dev |
| DOCKER_IMAGE_TAG | Docker image tag | latest |

### Service-Specific

- **titan_service_port**: 8080
- **DEBUG**: 'titan*' (for docker-compose)
- **DEBUG_COLORS**: false (for docker-compose)
- **DEBUG_DEPTH**: 8 (for docker-compose)
