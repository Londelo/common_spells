# Deployment - code-service

## CI/CD Pipeline

### Platform
**GitLab CI** (.gitlab-ci.yml)

### Pipeline Image
- **Base Image**: tmhub.io/verifiedfan/node12-base:12.14-alpine-latest

### Pipeline Stages

The deployment pipeline consists of 12 stages:

1. **destroy** - Tear down environments
2. **install** - Install dependencies and create ECR repository
3. **test** - Run linting and unit tests
4. **bundle** - Build application artifacts
5. **dockerize** - Build and push Docker images
6. **qa environments** - Deploy to QA environment
7. **features** - Run feature tests in containers
8. **dev pre deploy** - Pre-deployment tasks for dev (DB indexes)
9. **dev deploy** - Deploy to dev environment
10. **dev post deploy** - Post-deployment feature tests for dev
11. **preprod pre deploy** - Pre-deployment tasks for preprod (DB indexes)
12. **preprod deploy** - Deploy to preprod environment
13. **preprod post deploy** - Post-deployment feature tests for preprod
14. **production kick-off** - Manual approval gate for production
15. **production pre deploy** - Pre-deployment tasks for prod (DB indexes)
16. **production deploy** - Deploy to production environment
17. **cleanup** - Clean up Docker resources

## Pipeline Runners

### Build Runner (tm-nonprod terraformer)
Used for: install, test, bundle stages

### Non-prod Runner (tm-nonprod terraformer)
Used for: dev deployments, feature tests

### Preprod Runner (tm-prod terraformer preprod)
Used for: preprod deployments

### Production Runner (tm-prod terraformer)
Used for: production deployments, ECR operations

## Build Process

### 1. Install Stage

#### Dependencies Installation (yarn job)
```bash
yarn
```
- Uses yarn cache (`.yarn-cache` directory)
- Produces artifacts: `node_modules`, `configs/build.config.yml`
- Expires in: 24h
- Skipped on: schedules

#### ECR Repository Creation (create repo job)
```bash
docker run --rm tmhub.io/ticketmaster/ecr-createrepo titan/code-service
```
- Ensures ECR repository exists: `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/code-service`
- Runs on: prod runner
- Skipped on: schedules

### 2. Test Stage

All test jobs run on build runner and are skipped on schedules.

#### ESLint (eslint job)
```bash
run eslint '-f table'
```
- Runs code style checks
- Format: table output

#### YAML Lint (yaml lint job)
```bash
yamllint -c yamllint.config.yml .
```
- Image: portenez/yamllint
- Validates YAML configuration files

#### Server Unit Tests (server-uts job)
```bash
run server:test
```
- Tests server code in `app/` directory

#### Library Unit Tests (lib-uts job)
```bash
run lib:test
```
- Tests library code in `lib/` directory

### 3. Bundle Stage

#### Application Bundling (bundle job)
```bash
run bundle
```
- Produces: `dist/` directory with bundled application
- Expires in: 24h
- Uses: webpack for bundling
- Depends on: yarn artifacts

### 4. Dockerize Stage

#### Docker Image Build (dockerize job)
```bash
run buildVersion:calculate
export BUILD_VERSION=$(cat buildVersion)
run docker:build
run docker:compose push
```
- Image: tmhub.io/verifiedfan/docker-builder:xenial-node12-latest
- Builds two images:
  1. Main service image: `${IMAGE_NAME}:${BUILD_VERSION}`
  2. Features test image: `${IMAGE_NAME}:${BUILD_VERSION}-features`
- Pushes to ECR
- Produces: `buildVersion` artifact (expires in 1 month)
- Runs on: prod runner
- Cleanup: Runs `docker:clean` after script

### 5. Features Stage

#### Container-based Feature Tests (features job)
```bash
run docker:compose pull
run docker:features reports/all
run docker:features reports/verifyAfter "--tags @verifyAfter"
```
- Image: tmhub.io/verifiedfan/docker-builder:xenial-node12-latest
- Pulls Docker images from ECR
- Runs Cucumber feature tests in isolated Docker environment
- Produces: `reports/`, `docker-logs.txt` (expires in 8h)
- Runs on: nonprod runner
- Retry: 1 attempt

## Environment Deployment

### Deployment Tool
**Helm 3** (v3.10.1)

### Helm Chart
- **Repository**: tm/webservice
- **Version**: 11.6.0

### Common Deployment Process

All deployments use the `kube/install.sh` script:
```bash
helm3 repo up
helm3 upgrade --wait --debug -i ${RELEASE} tm/webservice \
  --version 11.6.0 \
  --namespace=prd1541 \
  -f kube/common/values.yaml \
  -f kube/${CLUSTER}/${VALUES_FILE} \
  --set ingress.fqdn=${FQDN} \
  --set image.tag=${BUILD_VERSION} \
  --set deploytime=${DEPLOYTIME}
```

## Environment Configurations

### QA Environment

#### Deployment (deploy qa1 job)
- **Stage**: qa environments
- **Trigger**: Manual or automatic on develop branch
- **Runner**: nonprod helm (nonprod9.us-east-1 kubernetes)
- **Namespace**: prd1541
- **Release Name**: vf-code-srvc-qa
- **Values File**: kube/nonprod9.us-east-1/qa-values.yaml
- **FQDN**: vf-code-srvc-qa.vf.nonprod9.us-east-1.tktm.io
- **Environment URL**: https://vf-code-srvc-qa.vf.nonprod9.us-east-1.tktm.io
- **Can be stopped**: Yes (destroy qa1)

#### Destroy (destroy qa1 job)
```bash
helm3 uninstall vf-code-srvc-qa
```
- Manual trigger only

### Dev Environment

#### Pre-deployment (dev db indexes job)
```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run createMongoIndexes
```
- **Stage**: dev pre deploy
- **Environment**: dev (NODE_ENV=dev)
- **Purpose**: Ensures MongoDB indexes are created/updated
- **Runs on**: prod runner
- **Trigger**: Only on develop branch

#### Deployment (deploy dev1 job)
- **Stage**: dev deploy
- **Runner**: nonprod helm (nonprod9.us-east-1 kubernetes)
- **Namespace**: prd1541
- **Release Name**: vf-code-srvc-dev
- **Values File**: kube/nonprod9.us-east-1/dev-values.yaml
- **FQDN**: vf-code-srvc-dev.vf.nonprod9.us-east-1.tktm.io
- **Environment URL**: https://vf-code-srvc-dev.vf.nonprod9.us-east-1.tktm.io
- **Trigger**: Automatic on develop branch
- **Can be stopped**: Yes (destroy dev1)

#### Post-deployment Testing (dev features job)
```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run features ' --fail-fast'
```
- **Stage**: dev post deploy
- **Purpose**: Run Cucumber feature tests against deployed dev environment
- **Produces**: `reports/` directory
- **Runs on**: nonprod runner
- **Retry**: 1 attempt

#### MonoQL Integration Tests (dev monoql features job)
```bash
git clone https://git.tmaws.io/Titan/monoql.git
cd monoql
yarn
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run features
```
- **Stage**: dev post deploy
- **Purpose**: Run MonoQL cross-service feature tests
- **Produces**: `monoql/reports/` (expires in 1 week)
- **Runs on**: nonprod runner
- **Retry**: 1 attempt

#### Destroy (destroy dev1 job)
```bash
helm3 uninstall vf-code-srvc-dev
```
- Manual trigger only
- Only on develop branch

### Preprod Environment

#### Pre-deployment (preprod db indexes job)
```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run createMongoIndexes
```
- **Stage**: preprod pre deploy
- **Environment**: preprod (NODE_ENV=preprod)
- **Purpose**: Ensures MongoDB indexes are created/updated
- **Runs on**: prod runner
- **Trigger**: Only on develop branch

#### Deployment (deploy preprod1 job)
- **Stage**: preprod deploy
- **Runner**: preprod helm (preprod9.us-east-1 kubernetes)
- **Namespace**: prd1541
- **Release Name**: vf-code-srvc
- **Values File**: kube/preprod9.us-east-1/values.yaml
- **FQDN**: vf-code-srvc.vf.preprod9.us-east-1.tktm.io
- **Environment URL**: https://vf-code-srvc.vf.preprod9.us-east-1.tktm.io
- **Trigger**: Automatic on develop branch
- **Can be stopped**: Yes (destroy preprod1)

#### Post-deployment Testing (preprod features job)
```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run features
```
- **Stage**: preprod post deploy
- **Purpose**: Run Cucumber feature tests against deployed preprod environment
- **Produces**: `reports/` directory
- **Runs on**: prod runner
- **Retry**: 1 attempt

#### MonoQL Integration Tests (preprod monoql features job)
```bash
git clone https://git.tmaws.io/Titan/monoql.git
cd monoql
yarn
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run features
```
- **Stage**: preprod post deploy
- **Purpose**: Run MonoQL cross-service feature tests
- **Produces**: `monoql/reports/` (expires in 1 week)
- **Runs on**: preprod runner
- **Retry**: 1 attempt

#### Destroy (destroy preprod1 job)
```bash
helm3 uninstall vf-code-srvc
```
- Manual trigger only
- Only on develop branch

### Production Environment

#### Manual Approval Gate (prod kick off job)
```bash
echo "We're deploying prod!"
```
- **Stage**: production kick-off
- **Purpose**: Manual approval step before production deployment
- **Trigger**: Manual only
- **Required**: Cannot be skipped (allow_failure: false)
- **Depends on**: dockerize job
- **Only on**: develop branch

#### Pre-deployment (production db indexes job)
```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run createMongoIndexes
```
- **Stage**: production pre deploy
- **Environment**: prod (NODE_ENV=prod)
- **Purpose**: Ensures MongoDB indexes are created/updated
- **Runs on**: prod runner
- **Required**: Cannot fail (allow_failure: false)
- **Trigger**: Only on develop branch

#### Deployment (deploy prod1 job)
- **Stage**: production deploy
- **Runner**: prod helm (prod9.us-east-1 kubernetes)
- **Namespace**: prd1541
- **Release Name**: vf-code-srvc
- **Values File**: kube/prod9.us-east-1/values.yaml
- **FQDN**: vf-code-srvc.vf.prod9.us-east-1.tktm.io
- **Environment URL**: https://vf-code-srvc.vf.prod9.us-east-1.tktm.io
- **Trigger**: Automatic after manual approval
- **Can be stopped**: Yes (destroy prod1)
- **Only on**: develop branch

#### Destroy (destroy prod1 job)
```bash
helm3 uninstall vf-code-srvc
```
- Manual trigger only
- Only on develop branch

### Cleanup Stage

#### Docker Cleanup (docker cleanup job)
```bash
BUILD_VERSION=$(cat buildVersion) run docker:clean
```
- **Stage**: cleanup
- **Purpose**: Remove temporary Docker images and containers
- **Runs**: Always (even if pipeline fails)
- **Allow failure**: true
- **Depends on**: dockerize job

## Deployment Workflow

### Standard Development Flow

```
develop branch commit
  ↓
Install → Test → Bundle → Dockerize → Features
  ↓
Dev Pre-deploy (DB indexes) → Dev Deploy → Dev Post-deploy (Feature tests)
  ↓
Preprod Pre-deploy (DB indexes) → Preprod Deploy → Preprod Post-deploy (Feature tests)
  ↓
[MANUAL APPROVAL GATE]
  ↓
Prod Pre-deploy (DB indexes) → Prod Deploy
  ↓
Cleanup
```

### QA Environment Flow

```
Any branch
  ↓
Install → Test → Bundle → Dockerize → Features
  ↓
[MANUAL] Deploy QA
```

### Feature Branch Flow

```
feature/* branch
  ↓
Install → Test → Bundle → Dockerize → Features
  ↓
[OPTIONAL MANUAL] Deploy QA
```

## Deployment Commands

### Local Development
```bash
# Watch mode for development
run server:watch

# Run unit tests
run server:test
run lib:test

# Build bundle
run bundle
```

### Docker Compose (Local)
```bash
# Set environment variables
export IMAGE_NAME=889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/code-service
export BUILD_VERSION=$(cat buildVersion)

# Build images
run docker:build

# Run containers
docker-compose up

# Run feature tests
run docker:features reports/all
```

### Manual Kubernetes Deployment
```bash
# Set environment variables
export BUILD_VERSION=<version>
export K8S_NAMESPACE=prd1541
export HELM_RELEASE_NAME=vf-code-srvc
export CLUSTER=<nonprod9.us-east-1|preprod9.us-east-1|prod9.us-east-1>

# Deploy
sh kube/install.sh <FQDN> <RELEASE_NAME> <VALUES_FILE>

# Example for dev
sh kube/install.sh vf-code-srvc-dev.vf.nonprod9.us-east-1.tktm.io vf-code-srvc-dev dev-values.yaml
```

### Destroy Environment
```bash
# Uninstall Helm release
helm3 uninstall <RELEASE_NAME>

# Examples
helm3 uninstall vf-code-srvc-qa
helm3 uninstall vf-code-srvc-dev
helm3 uninstall vf-code-srvc  # preprod/prod
```

## Environment Variables

### Build Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| ECR_HOST | 889199535989.dkr.ecr.us-east-1.amazonaws.com | ECR registry host |
| SHORTREPO | titan/code-service | Repository short name |
| IMAGE_NAME | ${ECR_HOST}/${SHORTREPO} | Full image name |
| DNS_ALIAS_NAME | codes | DNS alias |
| YARN_CACHE_FOLDER | ${CI_PROJECT_DIR}/.yarn-cache | Yarn cache location |
| K8S_NAMESPACE | prd1541 | Kubernetes namespace |
| HELM_RELEASE_NAME | vf-code-srvc | Helm release name |
| HELM_VERSION | v3.10.1 | Helm version |
| CHART_REPO | tm/webservice | Helm chart repository |
| CHART_VERSION | 11.6.0 | Helm chart version |

### Environment FQDNs

| Environment | FQDN Variable | Value |
|-------------|---------------|-------|
| QA | QA_FQDN | vf-code-srvc-qa.vf.nonprod9.us-east-1.tktm.io |
| Dev | DEV_FQDN | vf-code-srvc-dev.vf.nonprod9.us-east-1.tktm.io |
| Preprod | PREPROD_FQDN | vf-code-srvc.vf.preprod9.us-east-1.tktm.io |
| Prod | PROD_FQDN | vf-code-srvc.vf.prod9.us-east-1.tktm.io |

## Deployment Artifacts

### Docker Images
- **Main service**: `${IMAGE_NAME}:${BUILD_VERSION}`
- **Features test**: `${IMAGE_NAME}:${BUILD_VERSION}-features`
- **Retention**: 1 month (based on buildVersion artifact expiration)

### Build Artifacts
- `node_modules/` - Dependencies (expires in 24h)
- `dist/` - Bundled application (expires in 24h)
- `buildVersion` - Version identifier (expires in 1 month)
- `reports/` - Test reports (expires in 8h or 1 week)
- `docker-logs.txt` - Container logs (expires in 8h)

## Deployment Dependencies

### Pre-deployment Requirements
- MongoDB indexes created/updated
- ECR repository exists
- Helm chart repository accessible
- Appropriate AWS credentials configured
- Kubernetes cluster accessible

### Post-deployment Validations
- Health check endpoint responding (/heartbeat)
- Feature tests passing
- MonoQL integration tests passing (dev/preprod only)

## Rollback Procedure

### Manual Rollback via Helm
```bash
# List releases
helm3 history <RELEASE_NAME>

# Rollback to previous version
helm3 rollback <RELEASE_NAME>

# Rollback to specific revision
helm3 rollback <RELEASE_NAME> <REVISION>
```

### Automatic Rollback
- Kubernetes automatically rolls back if readiness probes fail
- Helm waits for successful deployment (`--wait` flag)
- Failed deployments preserve previous revision

## Deployment Monitoring

### GitLab Pipeline Status
- View pipeline in GitLab CI/CD interface
- Artifacts available for 24h (build) or 8h (test results)
- Manual intervention required for production deployments

### Kubernetes Deployment Status
```bash
# Check deployment status
kubectl get deployment -n prd1541

# Check pod status
kubectl get pods -n prd1541

# Check logs
kubectl logs -n prd1541 <pod-name>
```

## Deployment Best Practices

1. **Always deploy to dev first** - Automatic on develop branch
2. **Validate preprod deployment** - Review feature test results
3. **Manual approval for production** - Required gate at "prod kick off" stage
4. **Monitor post-deployment** - Check health endpoints and logs
5. **Run database migrations first** - Handled by pre-deploy jobs
6. **Verify feature tests** - All environments run automated tests
