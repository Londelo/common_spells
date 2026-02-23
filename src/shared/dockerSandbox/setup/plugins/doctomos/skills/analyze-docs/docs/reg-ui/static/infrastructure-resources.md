# Infrastructure Resources - reg-ui

## Platform Overview

**reg-ui** is deployed on **Kubernetes** using Helm charts across multiple AWS regions and environments. The application runs as containerized Next.js application with supporting infrastructure for caching, logging, and monitoring.

## Container Platform

### Docker Image

- **Registry**: `tmhub.io/titan/reg-ui` (ECR mirror)
- **ECR Repository**: `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/reg-ui`
- **Base Image**: `node:18-alpine`
- **Application User**: `nextjs:nodejs` (UID 1001:GID 1001)
- **Exposed Port**: 8080 (HTTP)
- **Runtime**: Node.js 18 production mode

### Kubernetes Deployment

- **Chart Repository**: `tm/webservice`
- **Chart Version**: `11.6.0`
- **Namespace**: `prd1541`
- **Product Code**: `prd1541`
- **Inventory Code**: `reg-ui`
- **Service Tier**: `web`

## Compute Resources

### Production Clusters

#### US East (prod9.us-east-1)

- **Release Name**: `reg-ui`
- **Cluster**: `prod9.us-east-1`
- **Region**: `us-east-1`
- **AWS Account**: 889199535989
- **IAM Role**: `arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default`
- **Replica Count**: 4 min / 12 max
- **Resource Requests**: 500m CPU, 1Gi memory
- **Resource Limits**: 2 CPU, 3Gi memory
- **Autoscaling Target**: 60% CPU utilization

#### US West (prod10.us-west-2)

- **Release Name**: `reg-ui`
- **Cluster**: `prod10.us-west-2`
- **Region**: `us-west-2`
- **Replica Count**: 4 min / 12 max
- **Resource Requests**: 500m CPU, 1Gi memory
- **Resource Limits**: 2 CPU, 3Gi memory
- **Autoscaling Target**: 60% CPU utilization

### Non-Production Clusters

#### PreProd (preprod9.us-east-1)

- **Release Name**: `reg-ui`
- **Cluster**: `preprod9.us-east-1`
- **Region**: `us-east-1`
- **Replica Count**: 4 min / 12 max
- **Resource Requests**: 500m CPU, 1Gi memory
- **Resource Limits**: 2 CPU, 3Gi memory

#### QA (nonprod9.us-east-1)

- **Release Name**: `reg-ui-qa`
- **Cluster**: `nonprod9.us-east-1`
- **Region**: `us-east-1`
- **AWS Account**: 343550350117
- **IAM Role**: `arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.qa1.iam-kube-default`
- **Replica Count**: 4 min / 12 max

#### Dev (nonprod9.us-east-1)

- **Release Name**: `reg-ui-dev`
- **Cluster**: `nonprod9.us-east-1`
- **Region**: `us-east-1`
- **AWS Account**: 343550350117
- **IAM Role**: `arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.dev1.iam-kube-default`
- **Replica Count**: 1 min / 1 max
- **Resource Requests**: 500m CPU, 512Mi memory
- **Resource Limits**: 500m CPU, 1Gi memory
- **Janitor TTL**: 4320h (180 days)

#### Test Environments (nonprod9.us-east-1)

- **Release Name**: `reg-ui-tests-{branch-slug}`
- **Cluster**: `nonprod9.us-east-1`
- **Dynamic per-branch**: Ephemeral environments created per feature branch
- **Replica Count**: 4 min / 12 max

## Data Storage

### Redis Cache (ElastiCache)

#### Production (US East)

- **Primary**: `prd3292-prod1-dmnd.t5ssu1.ng.0001.use1.cache.amazonaws.com:6379`
- **Read Replica**: `prd3292-prod1-dmnd-ro.t5ssu1.ng.0001.use1.cache.amazonaws.com:6379`
- **Purpose**: Campaign data caching (8-hour TTL)
- **Data Stored**: Campaign configuration, artist info, promoter details

#### Dev Environment

- **Primary**: `prd3292-dev1-dmnd.i8ciyj.ng.0001.use1.cache.amazonaws.com:6379`
- **Read Replica**: `prd3292-dev1-dmnd-ro.i8ciyj.ng.0001.use1.cache.amazonaws.com:6379`

### GraphQL API (AWS AppSync)

#### Production

- **Host**: Not specified in configs (resolved at runtime)
- **Purpose**: GraphQL queries/mutations for campaign operations

#### Non-Production

- **Host**: `appsync-dev1.fanid.nonprod-tmaws.io`
- **Introspection Host**: `appsync-qa1.fanid.nonprod-tmaws.io`
- **Authentication**: API Key-based (da2-* format)

## Networking

### Load Balancers (AWS ALB)

#### Production

- **Scheme**: `internet-facing`
- **Certificate ARN**: `arn:aws:acm:us-east-1:667096744268:certificate/2e5e6799-0ea6-48ce-b560-56bc8398e768`
- **Idle Timeout**: 60 seconds
- **Listen Ports**: 443 (HTTPS)
- **Health Check Path**: `/heartbeat`
- **Success Codes**: 200
- **Health Check Settings**:
  - Initial Delay: 30s
  - Timeout: 5s
  - Period: 10s
  - Failure Threshold: 3

#### Non-Production

- **Scheme**: `internal`
- **Certificate ARN**: `arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd` (Dev)
- **Certificate ARN**: `arn:aws:acm:us-east-1:234212695392:certificate/b5f6af5f-79f8-4eb6-bcc2-d94ae8b68c9d` (QA)

### Domain Aliases (Production)

The production ALB serves traffic for multiple international domains:

- `signup.ticketmaster.com` (US)
- `signup.livenation.com` (Live Nation US)
- `signup.ticketmaster.ca` (Canada)
- `signup.ticketmaster.com.mx` (Mexico)
- `signup.ticketmaster.com.au` (Australia)
- `signup.ticketmaster.ie` (Ireland)
- `signup.ticketmaster.co.uk` (UK)
- `signup.ticketmaster.co.nz` (New Zealand)
- `signup.ticketmaster.es` (Spain)
- `signup.ticketmaster.de` (Germany)
- `signup.ticketmaster.at` (Austria)
- `signup.ticketmaster.ch` (Switzerland)
- `signup.ticketmaster.cz` (Czech Republic)
- `signup.ticketmaster.pl` (Poland)
- `signup.ticketmaster.nl` (Netherlands)
- `signup.ticketmaster.dk` (Denmark)
- `signup.ticketmaster.be` (Belgium)
- `signup.ticketmaster.se` (Sweden)
- `signup.ticketmaster.no` (Norway)
- `signup.ticketmaster.fi` (Finland)
- `signup.ticketmaster.ae` (UAE)
- `signup.ticketmaster.co.za` (South Africa)
- `signup.ticketmaster.sg` (Singapore)

### CDN (Fastly)

#### PreProd

- **Service ID**: `sJWkDDZbgiLhehjrxZmI46`
- **Purpose**: CDN caching and delivery

#### Production

- **Service ID**: `jzcal6fzi3hxclocGLNTT6`
- **Purpose**: Global CDN caching and delivery
- **Cache Purging**: Automated via CI/CD after deployment

## External Integrations

### NuData Security (Fraud Detection)

- **Production**:
  - Base URL: `https://api-ticketmaster.nd.nudatasecurity.com`
  - Client ID: `w-481390`
  - Status: Enabled
- **Non-Production**:
  - Base URL: `https://api-ticketmaster.nd.nudatasecurity.com`
  - Client ID: `w-343181`
  - Status: Disabled

### Ticketmaster Discovery API

- **Production**:
  - Base URL: `http://api.disco.prod1.us-east-1.prod-tmaws.io:8080/discovery`
- **Non-Production**:
  - Base URL: `https://app.ticketmaster.com/discovery`

### Identity Service (Account URLs)

Each locale has its own identity service endpoint (format: `https://identity.ticketmaster.{tld}`).

### MonoQL Service

- **Production**: `monoql.vf.prod9.us-east-1.pub-tktm.io`
- **Dev**: `monoql-dev.vf.nonprod9.us-east-1.tktm.io`

### Transifex (Translation Management)

- **Purpose**: i18n translation management
- **Authentication**: Token-based (TX_TOKEN)
- **Source Locale**: `en_US.json`
- **Supported Locales**: 30+ languages

## Security

### IAM Roles

Each environment has dedicated IAM roles for Kubernetes service accounts:

- **Production**: `prd1541.titan.us-east-1.prod1.iam-kube-default`
- **Dev**: `prd1541.titan.us-east-1.dev1.iam-kube-default`
- **QA**: `prd1541.titan.us-east-1.qa1.iam-kube-default`

### Secrets Management

- Environment-specific configuration via Kubernetes ConfigMaps
- API keys and tokens injected via environment variables
- No hardcoded credentials in codebase

### Network Security

- **Production**: Internet-facing ALB with TLS termination
- **Non-Production**: Internal-only ALB
- **Pod Security**: Non-root user (nextjs:nodejs, UID 1001)
