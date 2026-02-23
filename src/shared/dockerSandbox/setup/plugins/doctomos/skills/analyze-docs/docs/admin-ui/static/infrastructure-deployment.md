# Deployment - admin-ui

## Overview

The admin-ui application uses GitLab CI/CD for continuous integration and deployment across multiple environments. The deployment strategy differs between legacy (Terraform/EC2) and modern (Kubernetes/Helm) infrastructure.

---

## CI/CD Pipeline

### Platform
- **CI/CD Tool**: GitLab CI
- **Configuration File**: `.gitlab-ci.yml`
- **Base Image**: tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest

### Pipeline Stages

1. **destroy** - Cleanup temporary environments
2. **install** - Install dependencies and create ECR repo
3. **test** - Run linting and unit tests
4. **bundle** - Build frontend assets
5. **dockerize** - Build and push Docker image
6. **qa environments** - Deploy to testing and QA
7. **features** - Run automated feature tests
8. **infrastructure** - Run infrastructure tests
9. **features breakdown** - Cleanup test environments
10. **dev deploy** - Deploy to dev (auto on develop branch)
11. **preprod deploy** - Deploy to preprod (auto on develop branch)
12. **prod kick-off** - Manual approval gate for production
13. **prod deploy** - Deploy to production (manual after approval)

### GitLab Runners

#### Test Runner
- **Tags**: `tm-nonprod terraformer`
- **Used for**: Test stages, feature tests

#### Build Runner
- **Tags**: `tm-prod terraformer`
- **Used for**: Build, bundle, dockerize stages

#### Kubernetes Runners
- **nonprod9.us-east-1**: For dev/qa/testing environments
- **preprod9.us-east-1**: For preprod environment
- **prod9.us-east-1**: For production environment

---

## Build Process

### 1. Install Stage

#### Yarn Install
```bash
yarn
```
- **Cache**: .yarn-cache/ (cached across branches)
- **Artifacts**: node_modules, configs/build.config.yml (24h expiration)

#### ECR Repository Creation
```bash
docker run --rm tmhub.io/ticketmaster/ecr-createrepo titan/admin
```
- Creates ECR repository if it doesn't exist

### 2. Test Stage

#### ESLint
```bash
npx run eslint '-f table'
```
- Linting with table format output

#### Jest Tests
```bash
npx jest
```
- Unit tests for both frontend and server code

### 3. Bundle Stage
```bash
npx run bundle
```
- **Artifacts**: dist/ directory (24h expiration)
- Bundles frontend assets with Webpack

### 4. Dockerize Stage
```bash
npx run buildVersion:calculate
npx run docker:build
docker push ${IMAGE_NAME}:${BUILD_VERSION}
```
- **Image**: tmhub.io/verifiedfan/docker-builder:focal-node18-latest
- **Output**: Docker image tagged with build version
- **Registry**: 889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/admin
- **Artifacts**: buildVersion, dist/ (1 week expiration)
- **Cleanup**: Runs docker:clean after build

---

## Environment Configuration

### Build Variables

| Variable | Value |
|----------|-------|
| ECR_HOST | 889199535989.dkr.ecr.us-east-1.amazonaws.com |
| SHORTREPO | titan/admin |
| IMAGE_NAME | ${ECR_HOST}/${SHORTREPO} |
| K8S_NAMESPACE | prd1541 |
| HELM_RELEASE_NAME | admin |
| HELM_VERSION | v3.10.1 |
| CHART_REPO | tm/webservice |
| CHART_VERSION | 11.6.0 |
| YARN_CACHE_FOLDER | .yarn-cache |

### Environment FQDNs

| Environment | FQDN | Variable |
|-------------|------|----------|
| Dev | admin-dev.vf.nonprod9.us-east-1.tktm.io | DEV_FQDN |
| QA | admin-qa.vf.nonprod9.us-east-1.tktm.io | QA_FQDN |
| Testing | admin-tests-${CI_COMMIT_REF_NAME}.vf.nonprod9.us-east-1.tktm.io | TESTING_FQDN |
| Preprod | admin.vf.preprod9.us-east-1.pub-tktm.io | PREPROD_FQDN |
| Prod | admin.vf.prod9.us-east-1.pub-tktm.io | PROD_FQDN |

---

## Deployment Strategy

### Kubernetes Deployment (Current)

#### Helm Deployment Script
```bash
sh kube/install.sh ${FQDN} ${RELEASE_NAME} ${VALUES_FILE} ${EXTRA_FLAGS}
```

The install.sh script:
1. Updates Helm repositories
2. Runs `helm3 upgrade --install` with:
   - Common values: `kube/common/values.yaml`
   - Environment-specific values: `kube/${CLUSTER}/${VALUES_FILE}`
   - Build-specific overrides:
     - `ingress.fqdn=${INGRESS_FQDN}`
     - `image.tag=${BUILD_VERSION}`
     - `deploytime=${DEPLOYTIME}`

#### Values Files by Environment

| Environment | Values File | Cluster |
|-------------|-------------|---------|
| Dev | dev-values.yaml | nonprod9.us-east-1 |
| QA | qa-values.yaml | nonprod9.us-east-1 |
| Testing | tests-values.yaml | nonprod9.us-east-1 |
| Preprod | values.yaml | preprod9.us-east-1 |
| Prod | values.yaml | prod9.us-east-1 |

### Deploy Dev Environment
- **Trigger**: Auto on `develop` branch
- **Command**:
  ```bash
  sh kube/install.sh ${DEV_FQDN} ${HELM_RELEASE_NAME}-dev dev-values.yaml
  ```
- **Environment URL**: https://admin-dev.vf.nonprod9.us-east-1.tktm.io
- **On-stop action**: destroy dev (manual)

### Deploy QA Environment
- **Trigger**: Manual (or auto on develop for MRs)
- **Command**:
  ```bash
  sh kube/install.sh ${QA_FQDN} ${HELM_RELEASE_NAME}-qa qa-values.yaml
  ```
- **Environment URL**: https://admin-qa.vf.nonprod9.us-east-1.tktm.io
- **On-stop action**: destroy qa (manual)
- **Special Rules**:
  - Never runs on detached MR pipelines
  - Auto on develop branch
  - Manual otherwise

### Deploy Testing Environment (Per Branch)
- **Trigger**: Auto on feature branches (except develop)
- **Pre-deploy**: Creates environment with placeholder image first
- **Post-deploy**: Waits for service to respond (300s timeout)
- **Command**:
  ```bash
  sh kube/install.sh ${TESTING_FQDN} ${HELM_RELEASE_NAME}-tests-${CI_COMMIT_REF_NAME} tests-values.yaml \
    "--set nameOverride=admin-tests-${CI_COMMIT_REF_NAME} --set inventoryCode=admin-tests-${CI_COMMIT_REF_NAME}"
  ```
- **Environment URL**: https://admin-tests-${CI_COMMIT_REF_NAME}.vf.nonprod9.us-east-1.tktm.io
- **Lifecycle**: Auto-destroyed after feature tests complete
- **Health Check**:
  ```bash
  features/wfc.sh -c "curl https://${TESTING_FQDN}" -t 300
  ```
- **Retry**: 1 attempt on failure

### Deploy Preprod Environment
- **Trigger**: Auto on `develop` branch after dev deployment
- **Command**:
  ```bash
  sh kube/install.sh ${PREPROD_FQDN} ${HELM_RELEASE_NAME} values.yaml
  ```
- **Environment URL**: https://admin.vf.preprod9.us-east-1.pub-tktm.io
- **On-stop action**: destroy preprod (manual)

### Deploy Production
- **Trigger**: Manual after "prod kick-off" approval
- **Required**: Explicit approval via "prod kick-off" job
- **Command**:
  ```bash
  sh kube/install.sh ${PROD_FQDN} ${HELM_RELEASE_NAME} values.yaml
  ```
- **Environment URL**: https://admin.vf.prod9.us-east-1.pub-tktm.io
- **On-stop action**: destroy prod (manual)
- **Special**: Only runs on `develop` branch

---

## Deployment Workflow

### Development Flow
1. Developer pushes to feature branch
2. Pipeline creates testing environment automatically
3. Runs feature tests against testing environment
4. Testing environment auto-destroyed after tests complete

### Develop Branch Flow
1. Code merged to `develop` branch
2. Pipeline runs tests and builds Docker image
3. Deploys to QA (if configured)
4. Deploys to Dev automatically
5. Deploys to Preprod automatically
6. Waits for manual "prod kick-off" approval
7. Deploys to Production after approval

### Rollback Strategy
Each environment has a manual "destroy" job that can be used to tear down the deployment. For rollback:
1. Use GitLab UI to find previous successful deployment
2. Retry that pipeline's deployment job
3. Helm will rollback to the previous release

---

## Feature Testing

### Test Runner
- **Image**: tmhub.io/verifiedfan/docker-builder:focal-node18-nightwatch-remove-chromedriver-18
- **Stage**: features
- **Retry**: 2 attempts
- **Reports**: Stored in features/reports (1 day expiration)

### Test Groups
- **campaign**: Campaign management tests
- **campaignModal**: Campaign modal UI tests
- **distribution**: Distribution functionality tests
- **files**: File upload/management tests
- **misc**: Miscellaneous UI tests
- **infrastructure**: Infrastructure/heartbeat tests (runs in separate stage)

### Test Execution
```bash
export NODE_ENV=features
export titan_service_selfUrl=https://${TESTING_FQDN}
export RETRY_COUNT=2
npx run features:group "${featureGroup}" --headless --launchReport
```

---

## Environment Cleanup

### Manual Cleanup Jobs
Each environment has a corresponding "destroy" job:
- **destroy testing env**: Manual, available any time
- **destroy qa**: Manual, requires QA environment
- **destroy dev**: Manual, only on develop branch
- **destroy preprod**: Manual, only on develop branch
- **destroy prod**: Manual, only on develop branch

### Auto-Cleanup
- **Testing environments**: Auto-destroyed via "features destroy testing env" job after feature tests complete (feature branches only)

### Cleanup Command
```bash
helm3 uninstall ${HELM_RELEASE_NAME}${RELEASE_SUFFIX}
```

---

## Deployment Commands (Manual)

### Local Development
```bash
# Install dependencies
yarn

# Run in development mode
npx run dev

# Build bundle
npx run bundle

# Build Docker image
npx run buildVersion:calculate
npx run docker:build

# Run tests
npx run eslint
npx jest
```

### Docker Compose (Local Testing)
```bash
export IMAGE_NAME=889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/admin
export BUILD_VERSION=<version>
docker-compose up
```

---

## Janitor TTL

Kubernetes resources use janitor TTL for automatic cleanup:
- **Dev**: 4320h (180 days)
- **Production**: Not set (manual cleanup only)

This prevents abandoned test environments from consuming resources indefinitely.

---

## Build Version Format

Build versions follow the pattern:
```
YYYYMMDD_<branch>_b<build_number>
```

Example: `20190916_develop_b11151299`

This format ensures:
- Chronological ordering
- Branch identification
- Unique build tracking
- Compatibility with Docker image tagging

---

## Security Considerations

### Image Scanning
Docker images are pushed to AWS ECR, which has automatic image scanning enabled for vulnerability detection.

### Secret Management
- IAM roles provide authentication to AWS services
- No secrets are hardcoded in Docker images
- Environment-specific secrets managed via Kubernetes secrets (referenced in Helm values)

### Network Security
- Dev/QA: Internal load balancers only
- Preprod/Prod: Internet-facing with SSL termination
- All traffic encrypted via HTTPS

---

## Monitoring Deployment Health

### Health Check Endpoint
- **Path**: `/heartbeat`
- **Expected Response**: 200 OK
- **Used By**:
  - Kubernetes liveness probe
  - Kubernetes readiness probe
  - ELB health checks
  - CI/CD pipeline verification

### Deployment Verification
After deployment, the pipeline verifies:
1. Helm deployment completes successfully (--wait flag)
2. All pods reach ready state
3. Health checks pass
4. For testing environments: HTTP request succeeds within 300s
