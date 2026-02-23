# Infrastructure Resources - code-service

## Overview

The code-service is deployed as a containerized Node.js application on Kubernetes (K8s) using Helm charts. The infrastructure spans multiple AWS environments (dev, qa, preprod, prod) within the VerifiedFan platform.

## Container Resources

### Docker Images

| Image | Purpose | Base |
|-------|---------|------|
| `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/code-service` | Main application service | node:12.14-alpine |
| `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/code-service:*-features` | Feature testing container | node:12.14-alpine |

**Registry**: AWS ECR in us-east-1 (Account: 889199535989)

### Kubernetes Deployment

| Component | Value |
|-----------|-------|
| Namespace | prd1541 |
| Helm Release | vf-code-srvc (prod/preprod)<br>vf-code-srvc-dev (dev)<br>vf-code-srvc-qa (qa) |
| Chart | tm/webservice v11.6.0 |
| Service Port | 8080 (HTTP) |

## Compute Resources

### Pod Configuration

#### Production
- **Replica Count**: 3-12 pods (autoscaling)
- **CPU Request**: 500m
- **CPU Limit**: 2 cores
- **Memory Request**: 1Gi
- **Memory Limit**: 3Gi
- **Max Unavailable**: 75%
- **Scaling Trigger**: 25% CPU utilization

#### Dev
- **Replica Count**: 1 (no autoscaling)
- **CPU Request**: 500m
- **CPU Limit**: 500m
- **Memory Request**: 512Mi
- **Memory Limit**: 1Gi

### Health Checks
- **Liveness Probe**: /heartbeat endpoint
  - Initial delay: 30s
  - Timeout: 5s
  - Period: 10s
- **Readiness Probe**: /heartbeat endpoint
  - Initial delay: 30s
  - Timeout: 5s
  - Period: 10s

## Database Resources

### MongoDB (Atlas)

#### Production Database
- **Cluster**: VF-prod-shard-0 (MongoDB Atlas)
- **Hosts**:
  - vf-prod-shard-00-00-z84pk.mongodb.net
  - vf-prod-shard-00-01-z84pk.mongodb.net
  - vf-prod-shard-00-02-z84pk.mongodb.net
- **Port**: 27017
- **Database Name**: prod
- **Read Preference**: NEAREST
- **SSL**: Enabled
- **Auth Source**: admin
- **User**: signup-api

#### Non-Production Database
- **Cluster**: NonProd0-shard-0 (MongoDB Atlas)
- **Hosts**:
  - nonprod0-shard-00-00-iottj.mongodb.net
  - nonprod0-shard-00-01-iottj.mongodb.net
  - nonprod0-shard-00-02-iottj.mongodb.net
- **Port**: 27017
- **Database Name**: dev
- **Read Preference**: NEAREST
- **SSL**: Enabled
- **Auth Source**: admin
- **User**: nonprod-user1

### MongoDB Collections

#### codes Collection

**Purpose**: Stores verification codes for campaigns with reservation and assignment tracking.

**Indexes**:
1. `_id.campaign_id: -1, _id.code: 1` - Primary lookup
2. `_id.campaign_id: -1, type: 1, date.reserved: -1, date.assigned: -1` - Status queries
3. `reserveId: -1` (sparse) - Reservation lookup

**Document Structure**:
```javascript
{
  _id: {
    campaign_id: String,  // Campaign identifier
    code: String          // The actual code
  },
  type: String,           // Code type
  date: {
    saved: Date,          // When code was created
    reserved: Date,       // When code was reserved (optional)
    assigned: Date        // When code was assigned (optional)
  },
  reserveId: String       // Reservation identifier (optional)
}
```

## Storage Resources

### AWS S3

#### Scoring Bucket (Production)
- **Bucket**: prd2011.prod1.us-east-1.vf-scoring.tmaws
- **Region**: us-east-1
- **Purpose**: Verification scoring data storage

#### Scoring Bucket (Dev)
- **Bucket**: prd2011.dev1.us-east-1.vf-scoring.tmaws
- **Region**: us-east-1
- **Purpose**: Development scoring data storage

## Networking

### Ingress Configuration

#### Production
- **FQDN**: vf-code-srvc.vf.prod9.us-east-1.tktm.io
- **Scheme**: internal
- **Certificate ARN**: arn:aws:acm:us-east-1:667096744268:certificate/763fdb83-0bc0-4398-8687-8245469626d8
- **Listen Ports**: 443 (HTTPS)
- **Health Check Codes**: 200
- **Idle Timeout**: 60s

#### Preprod
- **FQDN**: vf-code-srvc.vf.preprod9.us-east-1.tktm.io
- **Scheme**: internal
- **Certificate ARN**: arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd

#### Dev
- **FQDN**: vf-code-srvc-dev.vf.nonprod9.us-east-1.tktm.io
- **Scheme**: internal
- **Certificate ARN**: arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd

#### QA
- **FQDN**: vf-code-srvc-qa.vf.nonprod9.us-east-1.tktm.io
- **Scheme**: internal

### DNS Configuration
- **Domain**: tktm.io
- **DNS Cache TTL**: 60000ms

## IAM Resources

### Kubernetes Service Accounts

#### Production
- **IAM Role**: arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default
- **Service Account**: default

#### Dev
- **IAM Role**: arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.dev1.iam-kube-default
- **Service Account**: default

## Security

### JWT Configuration
- **Production**: Public key only (authentication via external service)
- **Dev/Non-prod**: Private key for local token generation
- **Anonymous Access**: Allowed (configurable)
- **Correlation Header**: x-titan-correlation-id

### Secrets Management
- MongoDB credentials stored in environment-specific configurations
- JWT keys stored in configuration files
- AWS credentials managed via IAM roles attached to K8s service accounts

## Environment Configuration

### Environment Variables (Common)

| Variable | Purpose |
|----------|---------|
| NODE_ENV | Environment identifier (dev, preprod, prod) |
| AWS_REGION | AWS region (us-east-1) |
| ENVIRONMENT | K8s environment tag |
| domain | Base domain (tktm.io) |
| profile | Profile identifier (kube-dev, kube-prod) |
| DOCKER_IMAGE_TAG | Docker image tag |

### Product/Service Identifiers
- **Product Code**: prd1541
- **Inventory Code**: vf-code-srvc
- **Service Name**: code-srvc
- **Product Acronym**: vf (VerifiedFan)

## Sidecar Containers

### Fluentd Logging Sidecar
- **Image**: tmhub.io/tm-waiting-room/fluentd:master-3454331
- **CPU Request**: 100m
- **CPU Limit**: 100m
- **Memory Request**: 500Mi
- **Memory Limit**: 500Mi
- **Log Path**: /logs/titan.log
- **Enabled**: true

## Kubernetes Clusters

| Environment | Cluster | Region | Account Type |
|-------------|---------|--------|--------------|
| dev | nonprod9.us-east-1 | us-east-1 | tm-nonprod |
| qa | nonprod9.us-east-1 | us-east-1 | tm-nonprod |
| preprod | preprod9.us-east-1 | us-east-1 | tm-prod |
| prod | prod9.us-east-1 | us-east-1 | tm-prod |

## External Dependencies

### Tracing (LightStep)
- **Collector Host**: lightstep.prd1737.svc.cluster.local
- **Collector Port**: 8080
- **Encryption**: none
- **Product Code**: prd1541
- **Service Name**: code-srvc

### Monitoring (Prometheus)
- **Metrics Endpoint**: /metrics
- **Metrics Enabled**: true
- **System Metric Interval**: 10000ms
