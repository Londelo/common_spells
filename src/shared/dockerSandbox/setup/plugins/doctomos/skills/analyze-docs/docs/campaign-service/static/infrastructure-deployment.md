# Deployment - campaign-service

## Overview

The campaign-service uses GitLab CI/CD for continuous integration and deployment. The pipeline is defined in `.gitlab-ci.yml` and deploys to multiple environments using Helm charts on Kubernetes clusters.

## CI/CD Pipeline

### GitLab CI Configuration

| Property | Value |
|----------|-------|
| **CI/CD Platform** | GitLab |
| **Config File** | `.gitlab-ci.yml` |
| **Base Image** | tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest |
| **Container Registry** | 889199535989.dkr.ecr.us-east-1.amazonaws.com |
| **Image Name** | titan/campaign-service |

### Pipeline Stages

The pipeline consists of the following stages (in order):

1. **destroy** - Manual teardown of environments
2. **install** - Install dependencies and create ECR repository
3. **test** - Run linting and unit tests
4. **bundle** - Build production bundle with webpack
5. **dockerize** - Build and push Docker images
6. **qa environments** - Deploy to QA environment
7. **features** - Run BDD integration tests with Docker Compose
8. **dev pre deploy** - Pre-deployment tasks for dev (MongoDB indexes)
9. **dev deploy** - Deploy to dev environment
10. **dev post deploy** - Post-deployment verification (feature tests)
11. **preprod pre deploy** - Pre-deployment tasks for preprod (MongoDB indexes)
12. **preprod deploy** - Deploy to preprod environment
13. **preprod post deploy** - Post-deployment verification (feature tests)
14. **production kick-off** - Manual approval gate for production
15. **production pre deploy** - Pre-deployment tasks for production (MongoDB indexes)
16. **production deploy** - Deploy to production environments
17. **cleanup** - Clean up Docker resources

### CI/CD Jobs

#### Install Phase

**yarn**
- Installs Node.js dependencies
- Caches `.yarn-cache` directory for performance
- Produces `node_modules` artifact (24h expiry)
- Runs on: tm-prod terraformer runner

**create repo**
- Creates ECR repository if it doesn't exist
- Uses Docker-in-Docker
- Runs on: tm-prod terraformer runner

#### Test Phase

All test jobs run on `tm-prod terraformer` runners and are triggered on all branches except scheduled pipelines.

**eslint**
- Runs ESLint with table formatter
- Enforces strict functional programming rules
- Command: `npx run eslint '-f table'`

**yaml lint**
- Validates YAML files
- Image: portenez/yamllint
- Config: `yamllint.config.yml`

**server-uts**
- Unit tests for `/app` directory
- Command: `npx run server:test`
- Uses Jest test framework

**lib-uts**
- Unit tests for `/lib` directory
- Command: `npx run lib:test`
- Uses Jest test framework

#### Bundle Phase

**bundle**
- Builds production bundle with webpack
- Command: `npx run bundle`
- Produces `dist` artifact (24h expiry)
- Output used by Docker build

#### Dockerize Phase

**dockerize**
- Calculates build version from git
- Builds two Docker images:
  - Application image: `${IMAGE_NAME}:${BUILD_VERSION}`
  - Features test image: `${IMAGE_NAME}:${BUILD_VERSION}-features`
- Pushes images to ECR
- Command: `npx run docker:build && npx run docker:compose push`
- Produces `buildVersion` artifact (1 month expiry)

#### Feature Test Phase

Feature tests run in parallel across different test suites using Docker Compose:

**Test Groups**:
- `features campaignCreate` - Campaign creation tests
- `features campaignUpdate` - Campaign update tests
- `features campaignExtensions` - Campaign extension tests
- `features campaignRead` - Campaign read/query tests
- `features markets` - Market management tests
- `features search` - Search functionality tests
- `features misc` - Miscellaneous tests
- `features events` - Event integration tests
- `features contacts` - Contact management tests
- `features promoters` - Promoter management tests

**Execution**:
- Runs on: tm-nonprod terraformer runner
- Uses Docker Compose to orchestrate app + test containers
- Command: `npx run docker:features reports/all "${featureGroup}"`
- Produces test reports (8h expiry)
- Retry enabled (1 retry on failure)

## Environment Configuration

### Deployment Targets

| Environment | K8s Cluster | Region | Account | Runner |
|-------------|-------------|--------|---------|--------|
| **QA** | nonprod9.us-east-1 | us-east-1 | AWS nonprod | tm-nonprod terraformer |
| **Dev** | nonprod9.us-east-1 | us-east-1 | AWS nonprod | tm-nonprod terraformer |
| **Preprod** | preprod9.us-east-1 | us-east-1 | AWS preprod | tm-prod terraformer preprod |
| **Prod East** | prod9.us-east-1 | us-east-1 | 889199535989 | tm-prod terraformer |
| **Prod West** | prod10.us-west-2 | us-west-2 | 889199535989 | tm-prod terraformer |

### Deployment Process

#### Pre-Deployment Steps

**Database Index Creation**
- Runs before each environment deployment
- Command: `DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes`
- Ensures MongoDB indexes are up-to-date
- Uses environment-specific NODE_ENV
- Failure blocks deployment (production only)

#### Deployment Steps

**Helm Deployment Script**: `kube/install.sh`

```bash
helm3 upgrade --wait --debug -i ${RELEASE} ${CHART_REPO} \
  --version ${CHART_VERSION} \
  --namespace=${K8S_NAMESPACE} \
  -f kube/common/values.yaml \
  -f kube/${CLUSTER}/${FILENAME} \
  --set ingress.fqdn=${INGRESS_FQDN} \
  --set image.tag=${BUILD_VERSION} \
  --set deploytime=${DEPLOYTIME}
```

**Helm Chart**: `tm/webservice` version `11.6.0`

**Deployment Configurations**:
- QA: `sh kube/install.sh ${QA_FQDN} ${HELM_RELEASE_NAME}-qa qa-values.yaml`
- Dev: `sh kube/install.sh ${DEV_FQDN} ${HELM_RELEASE_NAME}-dev dev-values.yaml`
- Preprod: `sh kube/install.sh ${PREPROD_FQDN} ${HELM_RELEASE_NAME} values.yaml`
- Prod: `sh kube/install.sh ${PROD_FQDN} ${HELM_RELEASE_NAME} values.yaml`
- Prod West: `sh kube/install.sh ${PRODW_FQDN} ${HELM_RELEASE_NAME} values.yaml`

#### Post-Deployment Steps

**Feature Tests on Deployed Environment**
- Runs after dev and preprod deployments
- Tests against actual deployed service
- Command: `DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'`
- Validates deployment success
- Retry enabled (1 retry on failure)

**MonoQL Feature Tests**
- Clones monoql repository
- Runs MonoQL integration tests against deployed service
- Validates GraphQL API functionality
- Runs on dev and preprod post-deploy

## Deployment Commands

### Development Deployment

```bash
# Deploy to dev (automatic on develop branch)
git push origin develop
```

### QA Deployment

```bash
# Deploy to QA (manual trigger or automatic on develop)
# Triggered via GitLab CI pipeline
```

### Pre-production Deployment

```bash
# Deploy to preprod (automatic on develop branch)
# Requires successful dev deployment
```

### Production Deployment

```bash
# Production requires manual approval via "prod kick off" job
# Then automatically deploys to both prod9 (East) and prod10 (West)
```

### Manual Deployment via Helm

```bash
# Set environment variables
export BUILD_VERSION=<version>
export INGRESS_FQDN=<fqdn>
export K8S_NAMESPACE=prd1541
export CHART_REPO=tm/webservice
export CHART_VERSION=11.6.0
export CLUSTER=prod9.us-east-1

# Run deployment
sh kube/install.sh ${INGRESS_FQDN} vf-camp-srvc values.yaml
```

### Environment Destruction

All environments have manual destroy jobs:
- `destroy qa1`
- `destroy dev1`
- `destroy preprod1`
- `destroy prod1`
- `destroy prod1w`

Command: `helm3 uninstall ${HELM_RELEASE_NAME}`

## Deployment Configuration Files

### Kubernetes Values

**Common values**: `kube/common/values.yaml`
- Base configuration shared across all environments
- Defines resource limits, scaling, health checks
- Configures ingress, logging, metrics

**Environment-specific values**: `kube/${CLUSTER}/values.yaml`
- Environment tag
- AWS region
- IAM role ARN
- Certificate ARN
- Fluentd configuration
- Environment variables

### Application Configuration

**Config directory**: `/configs`

| File | Environment | Purpose |
|------|-------------|---------|
| `dev.config.yml` | Development | Dev MongoDB, Redis, AWS resources |
| `qa.config.yml` | QA | QA MongoDB, Redis, AWS resources |
| `preprod.config.yml` | Pre-production | Preprod MongoDB, Redis, AWS resources |
| `prod.config.yml` | Production (East) | Production MongoDB, Redis, AWS resources |
| `prodw.config.yml` | Production (West) | Production West MongoDB, Redis, AWS resources |
| `schema.yml` | All | Configuration validation schema |
| `default.config.yml` | All | Default fallback values |

Configuration is loaded based on `NODE_ENV` environment variable.

## Build Versioning

**Version Calculation**:
- Script: `npx run buildVersion:calculate`
- Output: `buildVersion` file
- Format: Git-based version (commit SHA or tag)
- Used as Docker image tag
- Stored as artifact for use in deployment stages

## Deployment Triggers

### Automatic Deployments

| Branch | Target Environment | Condition |
|--------|-------------------|-----------|
| `develop` | QA | On success (optional manual) |
| `develop` | Dev | On success (automatic) |
| `develop` | Preprod | After dev success (automatic) |
| `develop` | Prod | Manual approval required |

### Manual Deployments

- All environments can be deployed manually via GitLab UI
- Production requires explicit "prod kick off" manual trigger
- QA can be deployed from feature branches (manual)

## Rollback Procedures

### Kubernetes Rollback

```bash
# List deployment history
helm3 history vf-camp-srvc -n prd1541

# Rollback to previous release
helm3 rollback vf-camp-srvc -n prd1541

# Rollback to specific revision
helm3 rollback vf-camp-srvc <revision> -n prd1541
```

### Re-deploy Specific Version

```bash
# Set BUILD_VERSION to desired version
export BUILD_VERSION=<previous-version>

# Run deployment script
sh kube/install.sh <fqdn> vf-camp-srvc values.yaml
```

## Deployment Verification

### Health Check Verification

```bash
# Check health endpoint
curl https://vf-camp-srvc.vf.prod9.us-east-1.tktm.io/heartbeat

# Expected response: HTTP 200
```

### Kubernetes Pod Status

```bash
# Check pod status
kubectl get pods -n prd1541 -l app=vf-camp-srvc

# Check pod logs
kubectl logs -n prd1541 -l app=vf-camp-srvc --tail=100

# Check pod events
kubectl describe pod -n prd1541 -l app=vf-camp-srvc
```

### Application Logs

Logs are shipped to Elasticsearch and searchable via:
- **Index**: `logstash-application_log`
- **Product Code**: PRD1541
- **Environment Tag**: kube-prod (production) or kube-nonprod (non-prod)
- **Container Name**: /vf-camp-srvc

### Metrics Verification

```bash
# Check Prometheus metrics
curl https://vf-camp-srvc.vf.prod9.us-east-1.tktm.io/metrics

# Verify metrics are being scraped in Prometheus UI
```

## Caching Strategy

### Yarn Cache

- Cached in GitLab CI: `.yarn-cache` directory
- Speeds up dependency installation
- Shared across all branch pipelines

### Docker Layer Cache

- ECR registry maintains layer cache
- Speeds up image builds
- Uses `IfNotPresent` pull policy in Kubernetes

## Build Optimization

- **Parallel Testing**: Feature tests run in parallel across 10 groups
- **Artifact Reuse**: Build artifacts passed between stages
- **Conditional Execution**: Tests skip on scheduled pipelines
- **Caching**: Yarn cache and Docker layers cached
- **Resource Allocation**: Appropriate runner selection per job type

## Security Considerations

### Deployment Security

- Production deployments require manual approval
- Secrets not stored in GitLab CI config
- IAM roles used for AWS service access
- TLS certificates managed via AWS ACM
- Internal-only load balancer scheme

### Image Security

- Base images from trusted internal registry
- Regular base image updates
- Vulnerability scanning (external to pipeline)
- Multi-stage Docker builds minimize attack surface
