# Deployment - monoql

## CI/CD Pipeline

### Platform

**GitLab CI** - `.gitlab-ci.yml`

- **Runner Tags**:
  - `tm-prod terraformer` (build/test)
  - `tm-nonprod terraformer` (nonprod deployments)
  - `tm-prod terraformer preprod` (preprod deployments)
  - Kubernetes cluster-specific tags (nonprod9.us-east-1, preprod9.us-east-1, prod9.us-east-1, prod10.us-west-2)

### Pipeline Stages

The pipeline consists of 15 stages:

1. **destroy** - Teardown environments (manual)
2. **install** - Install dependencies and create ECR repository
3. **test** - Run linting and unit tests
4. **bundle** - Bundle application code
5. **dockerize** - Build and push Docker images
6. **qa environments** - Deploy to QA
7. **features** - Run integration/feature tests
8. **dev pre deploy** - Pre-deployment tasks for dev
9. **dev deploy** - Deploy to dev environment
10. **dev post deploy** - Post-deployment feature tests for dev
11. **preprod pre deploy** - Pre-deployment tasks for preprod
12. **preprod deploy** - Deploy to preprod
13. **preprod post deploy** - Post-deployment feature tests for preprod
14. **production kick-off** - Manual approval gate for production
15. **production pre deploy** - Pre-deployment tasks for production
16. **production deploy** - Deploy to production (us-east-1 and us-west-2)
17. **cleanup** - Clean up Docker images and artifacts

## Build Process

### Install Stage

**yarn** job:
```bash
yarn
```
- **Artifacts**:
  - `node_modules/` (24h expiration)
  - `configs/build.config.yml`
- **Cache**: Yarn cache folder (`.yarn-cache/`)
- **Runner**: tm-prod terraformer

**create repo** job:
```bash
docker run --rm tmhub.io/ticketmaster/ecr-createrepo titan/monoql
```
- Creates ECR repository if it doesn't exist
- **Image**: docker:stable

### Test Stage

All test jobs run in parallel, using `tm-prod terraformer` runners:

**eslint**:
```bash
npx run eslint '-f table'
```

**yaml lint**:
```bash
yamllint -c yamllint.config.yml .
```
- **Image**: portenez/yamllint

**server-uts**:
```bash
npx run server:test
```

**lib-uts**:
```bash
npx run lib:test
```

### Bundle Stage

**bundle** job:
```bash
npx run bundle
```
- **Artifacts**: `dist/` directory (24h expiration)
- Prepares application for containerization

### Dockerize Stage

**dockerize** job:
```bash
npx run buildVersion:calculate
export BUILD_VERSION=$(cat buildVersion)
npx run docker:build
npx run docker:compose push
```
- **Image**: tmhub.io/verifiedfan/docker-builder:focal-node18-latest
- **Artifacts**: `buildVersion` file (1 month expiration)
- Builds both main and features Docker images
- Pushes to ECR: `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/monoql`
- **After Script**: Cleanup Docker resources

### Feature Tests Stage

**features** job:
```bash
npx run docker:compose pull
npx run docker:features reports/all
npx run docker:features reports/verifyAfter "--tags @verifyAfter"
```
- **Image**: tmhub.io/verifiedfan/docker-builder:focal-node18-latest
- **Runner**: tm-nonprod terraformer
- **Artifacts**:
  - `reports/` (8h expiration)
  - `docker-logs.txt`
- **Retry**: 1 attempt
- Tests run in Docker Compose environment with server dependency

## Deployment Process

### Helm Deployment

All deployments use **Helm 3** with the following pattern:

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

**Common Parameters:**
- **Chart**: tm/webservice
- **Chart Version**: 11.6.0
- **Namespace**: prd1541
- **Release**: monoql (with environment suffix)
- **Values Files**:
  - `kube/common/values.yaml` (base configuration)
  - `kube/${CLUSTER}/${ENV}-values.yaml` (environment-specific overrides)

### Environment Configurations

| Environment | Cluster | Release Name | Values File | FQDN | Trigger |
|-------------|---------|--------------|-------------|------|---------|
| QA1 | nonprod9.us-east-1 | monoql-qa | qa-values.yaml | monoql-qa.vf.nonprod9.us-east-1.tktm.io | develop branch or manual |
| Dev1 | nonprod9.us-east-1 | monoql-dev | dev-values.yaml | monoql-dev.vf.nonprod9.us-east-1.tktm.io | develop branch |
| Preprod1 | preprod9.us-east-1 | monoql | values.yaml | monoql.vf.preprod9.us-east-1.pub-tktm.io | develop branch |
| Prod (us-east-1) | prod9.us-east-1 | monoql | values.yaml | monoql.vf.prod9.us-east-1.pub-tktm.io | develop branch + manual approval |
| Prod (us-west-2) | prod10.us-west-2 | monoql | values.yaml | monoql.vf.prod10.us-west-2.pub-tktm.io | develop branch + manual approval |

## Deployment Workflows

### QA Deployment

**Trigger**:
- Automatic on develop branch commits
- Manual for other branches

**Process**:
1. Pull Docker image (tagged with BUILD_VERSION)
2. Update Helm release with QA values
3. Kubernetes performs rolling update
4. Wait for pods to be ready

**Rules**:
- Skip if `CI_MERGE_REQUEST_EVENT_TYPE == "detached"`
- Auto-deploy on develop branch
- Manual deployment for other branches
- Failure allowed (won't block pipeline)

### Dev Deployment

**Trigger**: Automatic on develop branch only

**Process**:
1. Deploy to nonprod9.us-east-1 cluster
2. Run post-deployment feature tests:
   ```bash
   DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'
   ```
3. **Artifacts**: `reports/` directory
4. **Retry**: 1 attempt

### Preprod Deployment

**Trigger**: Automatic on develop branch

**Process**:
1. Deploy to preprod9.us-east-1 cluster
2. Run post-deployment feature tests
3. Success required for production deployment

### Production Deployment

**Trigger**: Manual approval required ("prod kick off" job)

**Process**:
1. **prod kick off** (manual gate):
   ```bash
   echo "We're deploying prod!"
   ```
   - Must be manually triggered
   - Failure blocks production deployment

2. **deploy prod** (us-east-1):
   - Deploys to prod9.us-east-1 cluster
   - Updates DNS for public domains:
     - registration.ticketmaster.com
     - registration.ticketmaster.ca
     - registration.livenation.com
     - registration.ticketmaster.com.mx
     - verifiedfan.ticketmaster.com
     - verifiedfan.ticketmaster.ca
     - verifiedfan.livenation.com
     - verifiedfan.ticketmaster.com.mx

3. **deploy prodw** (us-west-2):
   - Deploys to prod10.us-west-2 cluster
   - Same public domains as us-east-1

**Both production deployments run in parallel after manual approval.**

## Environment Teardown

Each environment has a corresponding destroy job:

| Environment | Job Name | Release Suffix | Trigger |
|-------------|----------|----------------|---------|
| QA1 | destroy qa1 | -qa | Manual |
| Dev1 | destroy dev1 | -dev | Manual (develop only) |
| Preprod1 | destroy preprod1 | (none) | Manual (develop only) |
| Prod (us-east-1) | destroy prod | (none) | Manual (develop only) |
| Prod (us-west-2) | destroy prodw | (none) | Manual (develop only) |

**Destroy Command**:
```bash
helm3 uninstall ${HELM_RELEASE_NAME}${RELEASE_SUFFIX}
```

## Build Versioning

**Build Version Calculation**:
```bash
npx run buildVersion:calculate
```

The BUILD_VERSION is:
- Calculated during dockerize stage
- Stored as artifact (`buildVersion` file)
- Used to tag Docker images
- Injected into Helm deployments via `--set image.tag=${BUILD_VERSION}`
- Retained for 1 month

## Artifact Management

| Artifact | Retention | Stages |
|----------|-----------|--------|
| node_modules/ | 24h | install → test |
| dist/ | 24h | bundle → dockerize |
| buildVersion | 1 month | dockerize → all deploy stages |
| reports/ | 8h | features, dev/preprod post-deploy |
| docker-logs.txt | 8h | features |

## Pipeline Variables

| Variable | Value | Description |
|----------|-------|-------------|
| ECR_HOST | 889199535989.dkr.ecr.us-east-1.amazonaws.com | ECR registry |
| SHORTREPO | titan/monoql | Repository short name |
| IMAGE_NAME | ${ECR_HOST}/${SHORTREPO} | Full image name |
| DNS_ALIAS_NAME | monoql | DNS alias |
| YARN_CACHE_FOLDER | ${CI_PROJECT_DIR}/.yarn-cache | Yarn cache location |
| K8S_NAMESPACE | prd1541 | Kubernetes namespace |
| KUBERNETES_NAMESPACE_OVERWRITE | $K8S_NAMESPACE | K8s namespace override |
| HELM_RELEASE_NAME | monoql | Helm release name |
| HELM_VERSION | v3.10.1 | Helm CLI version |
| CHART_REPO | tm/webservice | Helm chart repository |
| CHART_VERSION | 11.6.0 | Helm chart version |
| QA_FQDN | monoql-qa.vf.nonprod9.us-east-1.tktm.io | QA FQDN |
| DEV_FQDN | monoql-dev.vf.nonprod9.us-east-1.tktm.io | Dev FQDN |
| PREPROD_FQDN | monoql.vf.preprod9.us-east-1.pub-tktm.io | Preprod FQDN |
| PROD_FQDN | monoql.vf.prod9.us-east-1.pub-tktm.io | Prod us-east-1 FQDN |
| PRODW_FQDN | monoql.vf.prod10.us-west-2.pub-tktm.io | Prod us-west-2 FQDN |

## Deployment Images

| Purpose | Image | Version |
|---------|-------|---------|
| Build/Test Base | tmhub.io/verifiedfan/node18-base | 18.18.2-alpine-latest |
| Docker Builder | tmhub.io/verifiedfan/docker-builder | focal-node18-latest |
| Helm Deployment | prod.tmhub.io/prod/techops-tools/helm_cd | v3.10.1 |
| YAML Linting | portenez/yamllint | latest |
| Docker Stable | docker:stable | latest |
| ECR Repo Creation | tmhub.io/ticketmaster/ecr-createrepo | latest |

## Deployment Schedule

**Branch**: develop only (for automatic deployments)

**Scheduled Jobs**: Excluded via `except: - schedules`

## Cleanup Process

**docker cleanup** job:
```bash
export BUILD_VERSION=$(cat buildVersion)
npx run docker:clean || true
```
- Runs at end of pipeline
- Always executes (even on failure)
- Failure allowed
- Cleans up local Docker images and containers

## Rollback Strategy

To rollback a deployment:

1. **Identify previous build version** from GitLab artifacts
2. **Re-run deployment job** with previous BUILD_VERSION
3. **Or use Helm rollback**:
   ```bash
   helm3 rollback ${RELEASE_NAME} ${REVISION}
   ```

Helm maintains **3 revision history** (configurable in values.yaml).

## Multi-Region Deployment

Production deployments target two regions in parallel:
- **Primary**: prod9.us-east-1 (US East)
- **Secondary**: prod10.us-west-2 (US West)

Both regions:
- Use the same Docker image (BUILD_VERSION)
- Share the same public domain names (DNS routing)
- Deploy simultaneously after manual approval
- Use the same Helm chart and values
