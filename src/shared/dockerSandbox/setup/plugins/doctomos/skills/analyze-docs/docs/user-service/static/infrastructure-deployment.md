# Deployment - user-service

## CI/CD Platform

**Tool**: GitLab CI/CD
**Configuration**: `.gitlab-ci.yml`
**Base Image**: tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest

## Pipeline Overview

The deployment pipeline follows a multi-stage approach with distinct phases for different environments.

### Pipeline Stages

1. **destroy** - Manual teardown of environments
2. **install** - Dependency installation and repository setup
3. **test** - Linting and unit testing
4. **bundle** - Application bundling
5. **dockerize** - Container image building
6. **qa environments** - QA deployment (manual/automatic)
7. **features** - Feature test execution
8. **dev pre deploy** - Dev environment preparation
9. **dev deploy** - Dev deployment
10. **dev post deploy** - Dev smoke tests
11. **preprod pre deploy** - Preprod environment preparation
12. **preprod deploy** - Preprod deployment
13. **preprod post deploy** - Preprod smoke tests
14. **production kick-off** - Manual gate for production
15. **production pre deploy** - Production preparation
16. **production deploy** - Production deployment (2 regions)
17. **cleanup** - Docker image cleanup

## Build Pipeline

### Stage: Install

**Jobs:**

#### `yarn`
- **Purpose**: Install Node.js dependencies
- **Runner**: tm-prod terraformer
- **Cache**: Yarn cache (.yarn-cache/)
- **Output**:
  - node_modules/
  - configs/build.config.yml
- **Expiration**: 24 hours
- **Trigger**: All branches except schedules

#### `create repo`
- **Purpose**: Ensure ECR repository exists
- **Image**: docker:stable
- **Command**: `docker run --rm tmhub.io/ticketmaster/ecr-createrepo titan/users-service`
- **Trigger**: All branches except schedules

### Stage: Test

**Jobs:**

#### `eslint`
- **Purpose**: JavaScript linting
- **Command**: `npx run eslint '-f table'`
- **Runner**: tm-prod terraformer

#### `yaml lint`
- **Purpose**: YAML configuration validation
- **Image**: portenez/yamllint
- **Command**: `yamllint -c yamllint.config.yml .`
- **Runner**: tm-prod terraformer

#### `server-uts`
- **Purpose**: Server unit tests
- **Command**: `npx run server:test`
- **Runner**: tm-prod terraformer

#### `lib-uts`
- **Purpose**: Library unit tests
- **Command**: `npx run lib:test`
- **Runner**: tm-prod terraformer

### Stage: Bundle

#### `bundle`
- **Purpose**: Webpack application bundling for production
- **Command**: `npx run bundle`
- **Runner**: tm-prod terraformer
- **Output**: dist/ directory
- **Expiration**: 24 hours
- **Note**: Uses Babel with production environment and legacy OpenSSL provider

### Stage: Dockerize

#### `dockerize`
- **Purpose**: Build and push Docker images
- **Image**: tmhub.io/verifiedfan/docker-builder:focal-node18-latest
- **Runner**: tm-prod terraformer
- **Process**:
  1. Calculate build version: `npx run buildVersion:calculate`
  2. Build images: `npx run docker:build`
  3. Push to ECR: `npx run docker:compose push`
- **Outputs**:
  - Docker images in ECR
  - buildVersion file (retained for 1 month)
- **Images Built**:
  - Main service image: `${IMAGE_NAME}:${BUILD_VERSION}`
  - Features test image: `${IMAGE_NAME}:${BUILD_VERSION}-features`

### Stage: Features (Docker-based)

#### `features`
- **Purpose**: Run Cucumber feature tests in Docker containers
- **Image**: tmhub.io/verifiedfan/docker-builder:focal-node18-latest
- **Runner**: tm-nonprod terraformer
- **Dependencies**: MongoDB 3.2.16 (via docker-compose)
- **Process**:
  1. Pull images from ECR
  2. Run all feature tests: `npx run docker:features reports/all`
  3. Run post-verification tests: `npx run docker:features reports/verifyAfter "--tags @verifyAfter"`
- **Artifacts**:
  - reports/ directory
  - docker-logs.txt
  - Retained for 8 hours
  - Always saved (even on failure)
- **Retry**: 1 attempt

## Environment Deployments

### Environment Configuration

| Environment | Region | Cluster | Account | FQDN |
|-------------|--------|---------|---------|------|
| **QA** | us-east-1 | nonprod9.us-east-1 | nonprod | vf-usr-srvc-qa.vf.nonprod9.us-east-1.tktm.io |
| **Dev** | us-east-1 | nonprod9.us-east-1 | 343550350117 | vf-usr-srvc-dev.vf.nonprod9.us-east-1.tktm.io |
| **Preprod** | us-east-1 | preprod9.us-east-1 | preprod | vf-usr-srvc.vf.preprod9.us-east-1.tktm.io |
| **Prod (East)** | us-east-1 | prod9.us-east-1 | 889199535989 | vf-usr-srvc.vf.prod9.us-east-1.tktm.io |
| **Prod (West)** | us-west-2 | prod10.us-west-2 | 889199535989 | vf-usr-srvc.vf.prod10.us-west-2.tktm.io |

### Helm Deployment Process

All deployments use Helm 3 (v3.10.1) with the following pattern:

```bash
helm3 upgrade --wait --debug -i ${RELEASE} tm/webservice \
  --version 11.6.0 \
  --namespace=prd1541 \
  -f kube/common/values.yaml \
  -f kube/${CLUSTER}/${ENVIRONMENT}-values.yaml \
  --set ingress.fqdn=${FQDN} \
  --set image.tag=${BUILD_VERSION} \
  --set deploytime=${TIMESTAMP}
```

**Helm Chart**: tm/webservice:11.6.0

### QA Deployment

#### `deploy qa1`
- **Stage**: qa environments
- **Trigger**:
  - Automatic on `develop` branch
  - Manual on other branches
- **Runner**: nonprod9.us-east-1 kubernetes
- **Release Name**: vf-usr-srvc-qa
- **Values File**: kube/nonprod9.us-east-1/qa-values.yaml
- **On Stop**: destroy qa1
- **Allows Failure**: Yes

### Dev Deployment

#### Pre-Deploy: `dev db indexes`
- **Stage**: dev pre deploy
- **Purpose**: Create/update MongoDB indexes
- **Command**: `DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes`
- **Environment**: NODE_ENV=dev
- **Trigger**: Only on `develop` branch

#### Deploy: `deploy dev1`
- **Stage**: dev deploy
- **Runner**: nonprod9.us-east-1 kubernetes
- **Release Name**: vf-usr-srvc-dev
- **Values File**: kube/nonprod9.us-east-1/dev-values.yaml
- **Trigger**: Automatic on `develop` branch
- **On Stop**: destroy dev1

#### Post-Deploy: `dev features`
- **Stage**: dev post deploy
- **Purpose**: Run Cucumber tests against deployed dev environment
- **Runner**: tm-nonprod terraformer
- **Command**: `DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'`
- **Artifacts**: reports/ (retained 1 day)
- **Retry**: 1 attempt
- **Trigger**: Only on `develop` branch

### Preprod Deployment

#### Pre-Deploy: `preprod db indexes`
- **Stage**: preprod pre deploy
- **Purpose**: Create/update MongoDB indexes
- **Command**: `DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes`
- **Environment**: NODE_ENV=preprod
- **Trigger**: Only on `develop` branch

#### Deploy: `deploy preprod1`
- **Stage**: preprod deploy
- **Runner**: preprod9.us-east-1 kubernetes
- **Release Name**: vf-usr-srvc
- **Values File**: kube/preprod9.us-east-1/values.yaml
- **Trigger**: Automatic on `develop` branch (after dev success)
- **On Stop**: destroy preprod1

#### Post-Deploy: `preprod features`
- **Stage**: preprod post deploy
- **Purpose**: Run Cucumber tests against deployed preprod environment
- **Runner**: tm-preprod terraformer preprod
- **Command**: `DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'`
- **Artifacts**: reports/ (retained 1 day)
- **Retry**: 1 attempt
- **Trigger**: Only on `develop` branch

### Production Deployment

#### Kick-off: `prod kick off`
- **Stage**: production kick-off
- **Purpose**: Manual gate before production deployment
- **Trigger**: **MANUAL** (must be approved)
- **Branch**: Only `develop`
- **Allows Failure**: No (blocks pipeline if skipped)

#### Pre-Deploy: `production db indexes`
- **Stage**: production pre deploy
- **Purpose**: Create/update MongoDB indexes in production
- **Command**: `DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes`
- **Environment**: NODE_ENV=prod
- **Trigger**: Only on `develop` branch after manual approval
- **Allows Failure**: No

#### Deploy East: `deploy prod1`
- **Stage**: production deploy
- **Runner**: prod9.us-east-1 kubernetes
- **Release Name**: vf-usr-srvc
- **Values File**: kube/prod9.us-east-1/values.yaml
- **Cluster**: prod9.us-east-1
- **Trigger**: Automatic after prod kick-off
- **On Stop**: destroy prod1 (manual)

#### Deploy West: `deploy prod1w`
- **Stage**: production deploy
- **Runner**: prod10.us-west-2 kubernetes
- **Release Name**: vf-usr-srvc
- **Values File**: kube/prod10.us-west-2/values.yaml
- **Cluster**: prod10.us-west-2
- **Trigger**: Automatic after prod kick-off
- **On Stop**: destroy prod1w (manual)

**Note**: Both production regions deploy in parallel during the same stage.

## Deployment Commands

### Local Development

```bash
# Start development server with hot reload
npx run server:watch

# Start with debugger
npx run server:debug

# Run tests
npx run server:test
npx run lib:test
```

### Manual Deployment

```bash
# Bundle application
npx run bundle

# Build Docker images
npx run buildVersion:calculate
export BUILD_VERSION=$(cat buildVersion)
npx run docker:build

# Push to ECR
npx run docker:compose push

# Deploy to specific environment (via Helm)
sh kube/install.sh <FQDN> <RELEASE_NAME> <VALUES_FILE>
```

### Database Management

```bash
# Create MongoDB indexes
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes

# Add worker key
npx run insertMongoWorkerKey
```

## Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| **NODE_ENV** | GitLab CI | Environment identifier (dev/preprod/prod) |
| **BUILD_VERSION** | buildVersion file | Docker image tag |
| **IMAGE_NAME** | GitLab CI vars | Full ECR image path |
| **CLUSTER** | GitLab runner tags | Kubernetes cluster identifier |
| **K8S_NAMESPACE** | GitLab CI vars | Kubernetes namespace (prd1541) |
| **HELM_RELEASE_NAME** | GitLab CI vars | Helm release identifier |
| **DEBUG** | Set per job | Debug logging configuration |
| **YARN_CACHE_FOLDER** | GitLab CI | Yarn cache location |

### Runtime Environment Variables (from Kubernetes)

Set in Helm values files:

| Variable | Description | Source |
|----------|-------------|--------|
| **domain** | Domain name (tktm.io) | values.yaml |
| **environment_tag** | Environment label | values.yaml |
| **profile** | Configuration profile | values.yaml |
| **DOCKER_IMAGE_TAG** | Image tag | values.yaml |
| **NODE_ENV** | Runtime environment | values.yaml |
| **AWS_REGION** | Auto-injected | Helm chart |
| **ENVIRONMENT** | Auto-injected | Helm chart |
| **REGION** | Auto-injected | Helm chart |

## Rollback Procedures

### Helm Rollback

```bash
# List deployment history
helm3 history ${RELEASE_NAME} -n prd1541

# Rollback to previous version
helm3 rollback ${RELEASE_NAME} -n prd1541

# Rollback to specific revision
helm3 rollback ${RELEASE_NAME} <REVISION> -n prd1541
```

**Revision History**: Last 3 deployments retained (revisionHistoryLimit: 3)

### Manual Rollback

1. Identify previous working build version
2. Redeploy using specific image tag:
   ```bash
   sh kube/install.sh <FQDN> <RELEASE> <VALUES_FILE>
   # With override: --set image.tag=<PREVIOUS_VERSION>
   ```

## Destroy/Cleanup

### Environment Teardown

Each environment has a manual destroy job:

- `destroy qa1` - Remove QA environment
- `destroy dev1` - Remove dev environment
- `destroy preprod1` - Remove preprod environment
- `destroy prod1` - Remove prod us-east-1
- `destroy prod1w` - Remove prod us-west-2

**Command**: `helm3 uninstall <RELEASE_NAME> -n prd1541`

**Trigger**: Manual only (when: manual)

### Docker Cleanup

#### `docker cleanup`
- **Stage**: cleanup
- **Purpose**: Remove local Docker images after pipeline completion
- **Command**: `BUILD_VERSION=$(cat buildVersion) npx run docker:clean`
- **Trigger**: Always runs (even if previous stages fail)
- **Allows Failure**: Yes

## Build Artifacts

| Artifact | Retention | Description |
|----------|-----------|-------------|
| node_modules/ | 24h | Installed dependencies |
| dist/ | 24h | Bundled application |
| buildVersion | 1 month | Git-based version tag |
| reports/ | 8h (features) / 1 day (deployed tests) | Cucumber test results |
| docker-logs.txt | 8h | Container logs from feature tests |

## Branch Strategy

| Branch | Behavior |
|--------|----------|
| **develop** | Full pipeline: test → bundle → dockerize → features → dev → preprod → (manual gate) → prod |
| **feature branches** | Test, bundle, optional manual QA deployment |
| **schedules** | Excluded from all jobs |

## GitLab Runners

| Runner Tag | Purpose | Environments |
|-----------|---------|--------------|
| **tm-prod terraformer** | Build, test, bundle, dockerize | All |
| **tm-nonprod terraformer** | Feature tests, dev deployment | Dev, QA |
| **tm-prod terraformer preprod** | Preprod operations | Preprod |
| **nonprod9.us-east-1 kubernetes** | Kubernetes deployment | Dev, QA |
| **preprod9.us-east-1 kubernetes** | Kubernetes deployment | Preprod |
| **prod9.us-east-1 kubernetes** | Kubernetes deployment | Prod East |
| **prod10.us-west-2 kubernetes** | Kubernetes deployment | Prod West |

## Deployment Timeline

Typical deployment progression (develop branch):

1. **Install & Test** - ~5-10 minutes
2. **Bundle** - ~2-5 minutes
3. **Dockerize** - ~5-10 minutes (includes image push)
4. **Features** - ~10-20 minutes (Docker-based tests)
5. **Dev Deploy** - ~2-5 minutes (includes index creation)
6. **Dev Features** - ~10-15 minutes
7. **Preprod Deploy** - ~2-5 minutes (includes index creation)
8. **Preprod Features** - ~10-15 minutes
9. **Production Kick-off** - MANUAL GATE
10. **Prod Deploy** - ~5-10 minutes (both regions in parallel, includes index creation)

**Total Time (develop to preprod)**: ~45-90 minutes
**Total Time (develop to production)**: Manual approval + ~5-10 minutes

## Deployment Requirements

### Prerequisites

- GitLab CI runner access
- ECR repository created
- Kubernetes cluster access
- Helm 3 installed on runners
- MongoDB credentials configured
- AWS IAM roles assigned
- TLS certificates provisioned in ACM

### Configuration Files Required

- `.gitlab-ci.yml` - Pipeline definition
- `kube/install.sh` - Helm deployment script
- `kube/common/values.yaml` - Base Helm values
- `kube/<cluster>/<env>-values.yaml` - Environment-specific overrides
- `configs/<env>.config.yml` - Application configuration
- `Dockerfile` - Container definition
- `docker-compose.yml` - Local/feature test setup
