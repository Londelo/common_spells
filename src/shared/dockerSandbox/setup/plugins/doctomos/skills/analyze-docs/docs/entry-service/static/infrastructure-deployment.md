# Deployment - entry-service

## Overview

The entry-service uses GitLab CI/CD for continuous integration and deployment. The pipeline builds Docker containers, runs tests (unit tests and behavioral tests), and deploys to multiple Kubernetes clusters across different environments.

## CI/CD Platform

- **Platform**: GitLab CI
- **Configuration**: `.gitlab-ci.yml`
- **Base Image**: tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest
- **Docker Builder**: tmhub.io/verifiedfan/docker-builder:focal-node18-latest

## Deployment Workflow

### Pipeline Stages

1. **destroy** - Manual environment teardown
2. **install** - Install dependencies with Yarn
3. **test** - Run linting and unit tests
4. **bundle** - Create production bundle
5. **dockerize** - Build and push Docker images
6. **qa environments** - Deploy to QA (manual or develop branch)
7. **features** - Run behavioral tests against Docker containers
8. **dev pre deploy** - Create MongoDB indexes for dev
9. **dev deploy** - Deploy to dev environment
10. **dev post deploy** - Run smoke tests on dev
11. **preprod pre deploy** - Create MongoDB indexes for preprod
12. **preprod deploy** - Deploy to preprod environment
13. **preprod post deploy** - Run smoke tests on preprod
14. **production kick-off** - Manual approval gate for production
15. **production pre deploy** - Create MongoDB indexes for production
16. **production deploy** - Deploy to production (US-East and US-West)
17. **cleanup** - Clean up Docker artifacts

## GitLab Runners

| Runner Type | Tag | Purpose |
|-------------|-----|---------|
| Build | tm-prod terraformer | Build, test, dockerize |
| NonProd | tm-nonprod terraformer | Dev deployments |
| PreProd | tm-prod terraformer preprod | PreProd deployments |
| Prod | tm-prod terraformer | Production deployments |

## Environment Configuration

### ECR Registry

- **Host**: 889199535989.dkr.ecr.us-east-1.amazonaws.com
- **Repository**: titan/entry-service
- **Image Naming**: `${ECR_HOST}/${SHORTREPO}:${BUILD_VERSION}`

### Kubernetes Clusters

| Environment | Cluster | Region | Namespace |
|-------------|---------|--------|-----------|
| QA | nonprod9.us-east-1 | us-east-1 | prd1541 |
| Dev | nonprod9.us-east-1 | us-east-1 | prd1541 |
| PreProd | preprod9.us-east-1 | us-east-1 | prd1541 |
| Prod | prod9.us-east-1 | us-east-1 | prd1541 |
| Prod West | prod10.us-west-2 | us-west-2 | prd1541 |

### Helm Configuration

- **Helm Version**: v3.10.1
- **Chart Repository**: tm/webservice
- **Chart Version**: 11.6.0
- **Release Names**:
  - QA: vf-ent-srvc-qa
  - Dev: vf-ent-srvc-dev
  - PreProd: vf-ent-srvc
  - Prod: vf-ent-srvc

## Build Process

### 1. Install Dependencies

```bash
yarn
```

- **Caching**: Yarn cache is preserved across builds
- **Artifacts**: node_modules/, configs/build.config.yml
- **Expiration**: 24 hours

### 2. Linting and Testing

#### ESLint
```bash
npx run eslint '-f table'
```

#### YAML Lint
```bash
yamllint -c yamllint.config.yml .
```

#### Unit Tests
```bash
# Server tests
npx run server:test

# Library tests
npx run lib:test
```

### 3. Bundle Application

```bash
npx run bundle
```

- **Output**: dist/ directory
- **Artifacts**: Expires in 24 hours
- **Purpose**: Prepare optimized code for containerization

### 4. Build Version Calculation

```bash
npx run buildVersion:calculate
```

- **Output**: buildVersion file
- **Format**: Semantic version or commit-based
- **Retention**: 1 month

### 5. Docker Build

```bash
npx run docker:build
npx run docker:compose push
```

- **Main Image**: entry-service server
- **Features Image**: entry-service test container
- **Registry**: AWS ECR (889199535989.dkr.ecr.us-east-1.amazonaws.com)

## Testing Strategy

### Unit Tests

- **Server Tests**: lib/**/*.test.js
- **Framework**: Jest
- **Coverage**: N/A (not enforced in pipeline)

### Integration Tests (Docker)

Feature tests run in isolated Docker containers:

```bash
npx run docker:compose pull
npx run docker:features reports/all "${featureGroup}"
npx run docker:features reports/verifyAfter "" "--tags @verifyAfter"
```

**Feature Groups:**
- entry/create
- entry/read
- entry/update
- entry/delete
- misc
- scoring
- stats

**Artifacts:**
- Test reports in reports/
- Docker logs in docker-logs.txt
- Retention: 8 hours

### Deployed Environment Tests

Run tests against deployed environments:

```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'
```

**Environments:**
- Dev (post-deployment)
- PreProd (post-deployment)

### MonoQL Integration Tests

Cross-service tests from external monoql repository:

```bash
git clone https://git.tmaws.io/Titan/monoql.git
cd monoql
yarn
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features
```

**Environments:**
- Dev
- PreProd

**Artifacts**: monoql/reports/ (1 week retention)

## Deployment Process

### Pre-Deployment: MongoDB Indexes

Before each deployment, ensure indexes are up-to-date:

```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes
```

**Runs for:** Dev, PreProd, Production

### Helm Deployment

The `kube/install.sh` script handles all Helm deployments:

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

**Parameters:**
- `${RELEASE}`: Helm release name (e.g., vf-ent-srvc)
- `${CHART_REPO}`: tm/webservice
- `${CHART_VERSION}`: 11.6.0
- `${K8S_NAMESPACE}`: prd1541
- `${CLUSTER}`: Target cluster (e.g., prod9.us-east-1)
- `${FILENAME}`: Environment values file (e.g., values.yaml)
- `${INGRESS_FQDN}`: Service FQDN
- `${BUILD_VERSION}`: Docker image tag
- `${DEPLOYTIME}`: UTC timestamp

### Deployment Commands by Environment

#### QA Deployment
```bash
sh kube/install.sh ${QA_FQDN} ${HELM_RELEASE_NAME}-qa qa-values.yaml
```
- **Trigger**: Develop branch or manual
- **FQDN**: vf-ent-srvc-qa.vf.nonprod9.us-east-1.tktm.io

#### Dev Deployment
```bash
sh kube/install.sh ${DEV_FQDN} ${HELM_RELEASE_NAME}-dev dev-values.yaml
```
- **Trigger**: Develop branch only
- **FQDN**: vf-ent-srvc-dev.vf.nonprod9.us-east-1.tktm.io

#### PreProd Deployment
```bash
sh kube/install.sh ${PREPROD_FQDN} ${HELM_RELEASE_NAME} values.yaml
```
- **Trigger**: Develop branch only
- **FQDN**: vf-ent-srvc.vf.preprod9.us-east-1.tktm.io

#### Production Deployment (US-East)
```bash
sh kube/install.sh ${PROD_FQDN} ${HELM_RELEASE_NAME} values.yaml
```
- **Trigger**: Manual approval required ("prod kick off" stage)
- **FQDN**: vf-ent-srvc.vf.prod9.us-east-1.tktm.io
- **Cluster**: prod9.us-east-1

#### Production Deployment (US-West)
```bash
sh kube/install.sh ${PRODW_FQDN} ${HELM_RELEASE_NAME} values.yaml
```
- **Trigger**: Manual approval required ("prod kick off" stage)
- **FQDN**: vf-ent-srvc.vf.prod10.us-west-2.tktm.io
- **Cluster**: prod10.us-west-2

## Deployment Safeguards

### Automatic Rollback

- **Helm Flag**: `--wait`
- **Behavior**: Waits for all pods to be ready before marking deployment successful
- **Timeout**: Kubernetes default (5 minutes for readiness)

### Manual Gates

1. **QA Deployment**: Optional manual trigger for feature branches
2. **Production Kick-off**: Required manual approval before production deployment
   - Stage: "production kick-off"
   - Only on develop branch
   - Blocks both US-East and US-West prod deployments

### Deployment Dependencies

- **QA**: Requires dockerize stage
- **Dev**: Requires dockerize + dev db indexes
- **PreProd**: Requires dockerize + preprod db indexes
- **Production**: Requires manual kick-off + production db indexes + dockerize

## Environment Variables (Deployment-Time)

### Common Variables

- **IMAGE_NAME**: `${ECR_HOST}/${SHORTREPO}`
- **BUILD_VERSION**: Calculated from buildVersion file
- **K8S_NAMESPACE**: prd1541
- **HELM_RELEASE_NAME**: vf-ent-srvc

### Environment-Specific FQDNs

| Variable | Environment | Value |
|----------|-------------|-------|
| QA_FQDN | QA | vf-ent-srvc-qa.vf.nonprod9.us-east-1.tktm.io |
| DEV_FQDN | Dev | vf-ent-srvc-dev.vf.nonprod9.us-east-1.tktm.io |
| PREPROD_FQDN | PreProd | vf-ent-srvc.vf.preprod9.us-east-1.tktm.io |
| PROD_FQDN | Prod (East) | vf-ent-srvc.vf.prod9.us-east-1.tktm.io |
| PRODW_FQDN | Prod (West) | vf-ent-srvc.vf.prod10.us-west-2.tktm.io |

## Rollback Procedure

### Using Helm

To rollback a deployment:

```bash
# List revisions
helm3 history ${HELM_RELEASE_NAME} -n ${K8S_NAMESPACE}

# Rollback to previous version
helm3 rollback ${HELM_RELEASE_NAME} -n ${K8S_NAMESPACE}

# Rollback to specific revision
helm3 rollback ${HELM_RELEASE_NAME} ${REVISION} -n ${K8S_NAMESPACE}
```

### Emergency Rollback

If automated rollback fails:

1. Identify last known good image tag from GitLab pipeline history
2. Update values file with previous BUILD_VERSION
3. Run helm upgrade manually with previous image

## Environment Destruction

Manual destruction is available for all environments:

```bash
helm3 uninstall ${HELM_RELEASE_NAME}${RELEASE_SUFFIX}
```

**Release Suffixes:**
- QA: -qa
- Dev: -dev
- PreProd: (none)
- Prod: (none)

**Triggers:** Manual only (when: manual)

## Artifact Management

### Docker Image Cleanup

```bash
BUILD_VERSION=$(cat buildVersion) npx run docker:clean
```

- **Stage**: cleanup
- **Trigger**: Always runs (even on failure)
- **Purpose**: Remove local Docker images to free up runner disk space

### Artifact Retention

| Artifact | Retention | Purpose |
|----------|-----------|---------|
| node_modules | 24 hours | Dependency caching between stages |
| dist/ | 24 hours | Bundled application code |
| buildVersion | 1 month | Version tracking for rollbacks |
| reports/ | 8 hours | Test results |
| docker-logs.txt | 8 hours | Container logs from tests |
| monoql/reports/ | 1 week | Cross-service test results |

## Scheduled Jobs

The pipeline can be triggered by schedules (except noted stages):

- Most stages exclude schedules with `except: - schedules`
- Allows for scheduled maintenance or cleanup tasks

## Branching Strategy

### Develop Branch

- **Auto-Deploy Targets**: Dev, PreProd
- **Manual Deploy**: QA (optional), Production (required approval)
- **Full Pipeline**: All stages run

### Feature Branches

- **Build & Test**: Yes
- **Dockerize**: Yes
- **Deploy QA**: Manual trigger available
- **Deploy Dev/PreProd/Prod**: Not available

### Pipeline Rules

- `if: $CI_MERGE_REQUEST_EVENT_TYPE == "detached"` prevents duplicate pipelines
- Most deployments use `only: - develop` to restrict to develop branch

## Monitoring Deployment

### Post-Deployment Verification

1. **Health Check**: Automatically verified by Helm --wait flag
   - Liveness probe on /heartbeat
   - Readiness probe on /heartbeat

2. **Feature Tests**: Automated smoke tests run post-deployment
   - Dev environment: Full feature suite
   - PreProd environment: Full feature suite
   - Production: No automated tests (manual QA)

3. **Metrics**: Prometheus metrics available immediately at /metrics

### GitLab Environment Links

Each environment has a tracked URL in GitLab:
- QA: https://vf-ent-srvc-qa.vf.nonprod9.us-east-1.tktm.io
- Dev: https://vf-ent-srvc-dev.vf.nonprod9.us-east-1.tktm.io
- PreProd: https://vf-ent-srvc.vf.preprod9.us-east-1.tktm.io
- Prod (East): https://vf-ent-srvc.vf.prod9.us-east-1.tktm.io
- Prod (West): https://vf-ent-srvc.vf.prod10.us-west-2.tktm.io
