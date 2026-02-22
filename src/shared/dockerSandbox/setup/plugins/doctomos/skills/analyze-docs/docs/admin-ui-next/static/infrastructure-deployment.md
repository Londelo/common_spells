# Deployment - admin-ui-next

## Overview

The admin-ui-next application uses GitLab CI/CD for automated testing, building, and deployment to multiple Kubernetes clusters across different environments. Deployments follow a progressive promotion pattern: Testing → QA/Dev → Preprod → Production.

## CI/CD Pipeline

### Platform

**CI System**: GitLab CI
**Configuration**: `.gitlab-ci.yml`
**Base Image**: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`
**Docker Builder Image**: `tmhub.io/verifiedfan/docker-builder:focal-node18-latest`

### Pipeline Variables

```yaml
ECR_HOST: 889199535989.dkr.ecr.us-east-1.amazonaws.com
SHORTREPO: titan/admin-ui-next
IMAGE_NAME: ${ECR_HOST}/${SHORTREPO}
K8S_NAMESPACE: prd1541
HELM_RELEASE_NAME: admin-ui-next
HELM_VERSION: v3.10.1
CHART_REPO: tm/webservice
CHART_VERSION: 11.6.0
```

### Pipeline Stages

The CI/CD pipeline consists of 7 stages:

1. **install** - Warm NPM cache
2. **verify** - Code quality checks
3. **dockerize** - Build and push Docker image
4. **qa envs** - Deploy to QA/Testing environments
5. **dev envs** - Deploy to Dev environment
6. **preprod envs** - Deploy to Preprod environment
7. **production envs** - Deploy to Production environment
8. **destroy** - Clean up environments

## Stage Details

### 1. Install Stage

**Job**: `install`

**Purpose**: Warm the NPM cache for downstream jobs

```bash
npm config set cache .npm
npm ci
```

**Cache Strategy**:
- Cache key: `npm-node18-${package-lock.json hash}`
- Cache path: `.npm/`
- Policy: push (publishes warmed cache)

**Runner Tags**: `tm-prod cicd build`

### 2. Verify Stage

Runs in parallel after install stage completes.

#### Prettier Check

**Job**: `prettier`

```bash
npm run prettier:check
```

Validates code formatting against Prettier rules.

#### Lint Check

**Job**: `lint`

```bash
npm run lint:check
```

Runs ESLint to check code quality and style violations.

#### Type Check

**Job**: `typecheck`

```bash
npm run types:check
```

Runs TypeScript compiler in no-emit mode to validate types.

#### Test

**Job**: `test`

```bash
npm run test
```

Runs Jest test suite.

**All verify jobs**:
- Use cached NPM dependencies (pull policy)
- Run on `tm-prod cicd build` runners
- Must pass before dockerize stage

### 3. Dockerize Stage

**Job**: `dockerize`

**Trigger**: After install stage completes

**Steps**:

1. Install dependencies
2. Generate build version
3. Build Next.js application for QA environment
4. Build Docker image
5. Push to ECR

```bash
npm ci
npm run script:writeBuildVersion
export BUILD_VERSION=$(cat buildVersion)
npm run build  # BUILD_ENV=qa
docker-compose build
docker-compose push
```

**Artifacts**:
- `buildVersion` file (expires in 1 week)

**Cleanup**: Removes Docker containers and images after push

**Runner Tags**: `tm-prod terraformer`

## Environment URLs

### Testing (Per Branch/PR)

**FQDN**: `admin-ui-next-tests-${CI_COMMIT_REF_SLUG}.vf.nonprod9.us-east-1.tktm.io`

**Example**: `admin-ui-next-tests-feature-auth.vf.nonprod9.us-east-1.tktm.io`

### QA Environment

**FQDN**: `admin-ui-next-qa.vf.nonprod9.us-east-1.tktm.io`

### Dev Environment

**FQDN**: `admin-ui-next-dev.vf.nonprod9.us-east-1.tktm.io`

### Preprod Environment

**FQDN**: `admin-ui-next.vf.preprod9.us-east-1.pub-tktm.io`

**Public Aliases**:
- `admin.registration.tmus.preprod.ticketmaster.net`
- `admin.preprod-verifiedfan.ticketmaster.com`
- `admin.verifiedfan.tmus.preprod.ticketmaster.net`

### Production Environment

**FQDN**: `admin-ui-next.vf.prod9.us-east-1.pub-tktm.io`

**Public Aliases**:
- `admin.registration.ticketmaster.com`
- `admin.verifiedfan.ticketmaster.com`

## Deployment Jobs

### Testing Environment Deployment

**Job**: `deploy testing env`

**Trigger**: Automatically on any branch/MR

**Release Name**: `${HELM_RELEASE_NAME}-tests-${CI_COMMIT_REF_SLUG}`

**Cluster**: nonprod9.us-east-1

**Values File**: `tests-values.yaml`

**Features**:
- Auto-cleanup on MR close (`destroy testing env` job)
- 14-day TTL (janitor cleanup)
- Allows failures (won't block pipeline)

**Deployment Command**:
```bash
sh kube/install.sh \
  ${TESTING_FQDN} \
  ${HELM_RELEASE_NAME}-tests-${CI_COMMIT_REF_SLUG} \
  tests-values.yaml \
  "--set nameOverride=${HELM_RELEASE_NAME}-tests-${CI_COMMIT_REF_SLUG} \
   --set inventoryCode=${HELM_RELEASE_NAME}-tests-${CI_COMMIT_REF_SLUG}"
```

### QA Environment Deployment

**Job**: `deploy qa1`

**Trigger**:
- Auto-runs on `main` branch
- Auto-runs on release tags (`v*.*.*`)
- Manual on other branches

**Release Name**: `${HELM_RELEASE_NAME}-qa`

**Cluster**: nonprod9.us-east-1

**Values File**: `qa-values.yaml`

**Runner Tags**: `nonprod9.us-east-1`, `kubernetes`

### Dev Environment Deployment

**Job**: `deploy dev1`

**Trigger**:
- Auto-runs on `main` branch
- Auto-runs on release tags (`v*.*.*`)
- Manual on other branches

**Release Name**: `${HELM_RELEASE_NAME}-dev`

**Cluster**: nonprod9.us-east-1

**Values File**: `dev-values.yaml`

**Runner Tags**: `nonprod9.us-east-1`, `kubernetes`

### Preprod Environment Deployment

**Job**: `deploy preprod1`

**Trigger**:
- Auto-runs on `main` branch
- Auto-runs on release tags (`v*.*.*`)
- Manual on other branches

**Release Name**: `${HELM_RELEASE_NAME}` (no suffix)

**Cluster**: preprod9.us-east-1

**Values File**: `values.yaml`

**Runner Tags**: `preprod9.us-east-1`, `kubernetes`

### Production Environment Deployment

**Job**: `deploy prod1`

**Trigger**: **Manual only** (on release tags)

**Condition**: Only runs when `CI_COMMIT_TAG` matches `/^v\d+\.\d+\.\d+$/` (e.g., v1.2.3)

**Release Name**: `${HELM_RELEASE_NAME}` (no suffix)

**Cluster**: prod9.us-east-1

**Values File**: `values.yaml`

**Runner Tags**: `prod9.us-east-1`, `kubernetes`

**Safety**: Manual approval required for production deployments

## Helm Installation Script

**Script**: `kube/install.sh`

**Parameters**:
1. `INGRESS_FQDN` - Fully qualified domain name
2. `RELEASE` - Helm release name
3. `FILENAME` - Values file name
4. `CMD` - Additional Helm arguments (optional)

**Command Structure**:
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

**Features**:
- Updates Helm repo before deployment
- Uses `--wait` flag for deployment verification
- Debug output enabled
- Installs or upgrades based on existence
- Merges common values with environment-specific values

## Deployment Flow Diagram

```
┌─────────────────┐
│   Git Push      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Install + Cache│
└────────┬────────┘
         │
         ├──────────┬──────────┬──────────┐
         ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Prettier│ │ Lint   │ │TypeChk │ │ Test   │
    └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
         └──────────┴──────────┴──────────┘
                     │
                     ▼
              ┌─────────────┐
              │  Dockerize  │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │Testing │  │   QA   │  │  Dev   │
    │ (Auto) │  │ (Auto) │  │ (Auto) │
    └────────┘  └────────┘  └────────┘
                     │
                     ▼
              ┌─────────────┐
              │   Preprod   │
              │   (Auto)    │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │  Production │
              │  (Manual)   │
              └─────────────┘
```

## Build Version Management

**Script**: `scripts/writeBuildVersion.mjs`

Generates a build version identifier used for:
- Docker image tagging
- Helm deployment tracking
- Rollback references

The build version is stored in `buildVersion` artifact file.

## Environment-Specific Builds

The application supports building for different environments:

```bash
# Local development with QA config
npm run local

# Local development with specific environment
npm run local-dev      # Dev config
npm run local-preprod  # Preprod config
npm run local-prod     # Production config

# Production builds
npm run build          # QA environment
npm run build-dev      # Dev environment
npm run build-preprod  # Preprod environment
npm run build-prod     # Production environment
```

**Note**: CI pipeline always builds with QA configuration (`BUILD_ENV=qa`), then deploys to appropriate environments with environment-specific Helm values.

## Deployment Verification

After deployment, the following verifications occur automatically:

1. **Helm Wait**: Waits for pods to become ready
2. **Health Checks**: Kubernetes probes verify `/heartbeat` endpoint
3. **Rolling Update**: Gradual replacement of old pods
4. **Max Unavailable**: Respects `maxUnavailablePods` setting (75% in prod)

## Rollback Procedure

Helm maintains 3 revision history entries for rollback:

```bash
# List releases
helm3 list -n prd1541

# View release history
helm3 history ${RELEASE_NAME} -n prd1541

# Rollback to previous version
helm3 rollback ${RELEASE_NAME} -n prd1541

# Rollback to specific revision
helm3 rollback ${RELEASE_NAME} ${REVISION} -n prd1541
```

## Environment Cleanup

### Automatic Cleanup (Janitor)

Testing, QA, Dev, and Preprod environments have automatic cleanup enabled via `janitorTtl`.

### Manual Cleanup

**Destroy Jobs**: Available for each environment

- `destroy testing env` - Runs automatically when MR is closed
- `destroy qa1` - Manual, only on main/tags
- `destroy dev1` - Manual, only on main/tags
- `destroy preprod1` - Manual, only on main/tags
- `destroy prod1` - Manual, only on main/tags

**Command**:
```bash
helm3 uninstall ${HELM_RELEASE_NAME}${RELEASE_SUFFIX}
```

## Deployment Best Practices

### Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Code reviewed and approved
- [ ] Changes tested in lower environments
- [ ] Database migrations (if any) are ready
- [ ] Feature flags configured appropriately
- [ ] Monitoring dashboards prepared

### Deployment to Production

1. Create release tag: `git tag v1.2.3 && git push origin v1.2.3`
2. Wait for CI pipeline to reach production stage
3. Review changes in Preprod environment
4. Click "Manual" trigger for `deploy prod1` job
5. Monitor deployment in Kubernetes dashboard
6. Verify metrics and health checks
7. Monitor error rates and logs
8. Keep rollback plan ready

### Rollback Criteria

Trigger immediate rollback if:
- Error rate exceeds 5%
- Health check failures
- Critical bugs affecting core functionality
- Performance degradation beyond acceptable limits

## Security Considerations

- ECR authentication handled by IAM roles
- Kubernetes secrets managed via Helm
- No secrets in source code or CI variables
- HTTPS enforced on all public endpoints
- Internal ALBs used for non-production environments
- Production requires manual approval for deployment
