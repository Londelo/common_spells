# Infrastructure Resources - admin-ui-next

## Overview

The admin-ui-next application is a Next.js 15 web application deployed on AWS Kubernetes (EKS) using Helm charts. The infrastructure follows a microservices pattern with containerized deployment across multiple environments.

## Container Infrastructure

### Docker Container

**Base Image**: `node:18-alpine`

**Container Configuration**:
- Port: 8080 (HTTP)
- Runtime: Node.js 18
- User: nextjs (UID 1001, GID 1001)
- Working Directory: `/app`
- Production optimized with Next.js standalone output

**Security Features**:
- Non-root user execution
- Minimal Alpine Linux base
- libc6-compat for compatibility

### Container Registry

**ECR Repository**: `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/admin-ui-next`

**Image Naming**: `${ECR_HOST}/${SHORTREPO}:${BUILD_VERSION}`

## Kubernetes Resources

### Helm Chart

**Chart Repository**: `tm/webservice`
**Chart Version**: `11.6.0`
**Helm Version**: `v3.10.1`

### Namespaces

| Environment | Namespace | Cluster | Region |
|-------------|-----------|---------|--------|
| Testing (PR) | prd1541 | nonprod9.us-east-1 | us-east-1 |
| QA | prd1541 | nonprod9.us-east-1 | us-east-1 |
| Dev | prd1541 | nonprod9.us-east-1 | us-east-1 |
| Preprod | prd1541 | preprod9.us-east-1 | us-east-1 |
| Production | prd1541 | prod9.us-east-1 | us-east-1 |

### Pod Configuration

#### Common Settings (All Environments)

| Setting | Value |
|---------|-------|
| HTTP Port | 8080 |
| Tier | web |
| Platform | aws |
| Product Code | prd1541 |
| Inventory Code | admin-ui-next |
| Min Ready Seconds | 15 |
| Revision History Limit | 3 |
| Termination Grace Period | 30s |

#### Environment-Specific Resources

**Testing/QA/Dev Environments**:
```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 500m
    memory: 1Gi
replicaCount: 1
maxReplicaCount: 1
```

**Preprod Environment**:
```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2
    memory: 3Gi
replicaCount: 1
maxReplicaCount: 12
```

**Production Environment**:
```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2
    memory: 3Gi
replicaCount: 4
maxReplicaCount: 12
maxUnavailablePods: 75%
```

### Auto-scaling

**Scaling Metric**: CPU Utilization
**Target CPU Utilization**: 60%

Production can scale from 4 to 12 pods based on CPU usage.

## AWS Resources

### IAM Roles

| Environment | Role ARN |
|-------------|----------|
| QA | arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.qa1.iam-kube-default |
| Dev | arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.dev1.iam-kube-default |
| Preprod | arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.preprod1.iam-kube-default |
| Production | arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default |

### Application Load Balancers

#### QA/Dev Environments (Internal)

- **Scheme**: internal
- **Certificate ARN**: arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd
- **Idle Timeout**: 60s
- **Health Check Path**: `/heartbeat`
- **Success Codes**: 200

#### Preprod Environment (Internet-Facing)

- **Scheme**: internet-facing
- **Certificate ARN**: arn:aws:acm:us-east-1:109494285962:certificate/00edae63-0fd8-4b70-af9c-7c9b76d843aa
- **Idle Timeout**: 60s
- **Health Check Path**: `/heartbeat`
- **Success Codes**: 200
- **Aliases**:
  - admin.registration.tmus.preprod.ticketmaster.net
  - admin.preprod-verifiedfan.ticketmaster.com
  - admin.verifiedfan.tmus.preprod.ticketmaster.net

#### Production Environment (Internet-Facing)

- **Scheme**: internet-facing
- **Certificate ARN**: arn:aws:acm:us-east-1:667096744268:certificate/2e5e6799-0ea6-48ce-b560-56bc8398e768
- **Idle Timeout**: 60s
- **Health Check Path**: `/heartbeat`
- **Success Codes**: 200
- **Aliases**:
  - admin.registration.ticketmaster.com
  - admin.verifiedfan.ticketmaster.com

### AWS Accounts

| Account Type | Account ID |
|--------------|------------|
| ECR (Shared) | 889199535989 |
| Nonprod | 343550350117 |
| Preprod | 889199535989 |
| Production | 889199535989 |
| ACM (Preprod) | 109494285962 |
| ACM (Prod) | 667096744268 |
| ACM (Nonprod) | 234212695392 |

## Health Checks

### Liveness Probe

```yaml
path: /heartbeat
initialDelaySeconds: 30
timeoutSeconds: 5
periodSeconds: 10
successThreshold: 1
failureThreshold: 3
```

### Readiness Probe

```yaml
path: /heartbeat
initialDelaySeconds: 30
timeoutSeconds: 5
periodSeconds: 10
successThreshold: 1
failureThreshold: 3
```

**Heartbeat Endpoint**: Returns JSON `{"status": "OK"}`

## Observability Components

### Prometheus Metrics

- **Enabled**: Yes
- **Path**: `/metrics`
- **Scheme**: http
- **Provider**: prom-client (Node.js Prometheus client)
- **Metrics**: Default Node.js metrics (CPU, memory, event loop, etc.)

### Jaeger Tracing

- **Enabled**: Yes
- **Image**: jaegertracing/jaeger-agent:1.8
- **Collector Host**: jaeger-collector.prd121.svc.cluster.local
- **Port**: 8080
- **Resources**:
  - Requests: 256m CPU, 128Mi memory
  - Limits: 512Mi memory

### Fluentd Logging

- **Enabled**: Yes
- **Image**: tmhub.io/tm-waiting-room/fluentd:master-3454331
- **Log Path**: `/logs/titan.log`
- **Target**: AWS Elasticsearch Service
- **Format**: JSON (Logstash format)
- **Product Code**: PRD1541
- **Resources**:
  - CPU: 100m (request/limit)
  - Memory: 500Mi (request/limit)

## Application Dependencies

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.3.6 | Next.js framework |
| react | 18.3.1 | React library |
| @apollo/client | 3.13.8 | GraphQL client |
| prom-client | 15.1.3 | Prometheus metrics |
| @ticketmaster/global-design-system | 23.6.0 | UI components |
| @tm1/design-system | 3.19.48 | TM1 design system |
| styled-components | 6.1.19 | CSS-in-JS |
| zod | 3.25.67 | Schema validation |
| zustand | 4.5.7 | State management |

## Environment Variables

### Common Variables

All environments include:
- `AWS_REGION`: us-east-1
- `ENVIRONMENT`: (environment-specific)
- `REGION`: us-east-1
- `NODE_ENV`: (environment-specific)
- `BUILD_ENV`: (environment-specific)
- `DOCKER_IMAGE_TAG`: latest

### Environment-Specific Variables

| Environment | domain | environment_tag | profile |
|-------------|--------|-----------------|---------|
| QA | tktm.io | kube-qa | kube-qa |
| Dev | tktm.io | kube-dev | kube-dev |
| Preprod | pub-tktm.io | kube-preprod | kube-preprod |
| Production | pub-tktm.io | kube-prod | kube-prod |

## Resource Cleanup

### Janitor TTL (Auto-cleanup)

| Environment | TTL |
|-------------|-----|
| Testing (PR) | 14 days |
| QA | 4320h (180 days) |
| Dev | 4320h (180 days) |
| Preprod | 4320h (180 days) |
| Production | None (manual cleanup only) |
