# Deployment - reg-ui

## CI/CD Platform

**GitLab CI/CD** is used for all build, test, and deployment pipelines.

## Pipeline Configuration

### Pipeline Source

- **File**: `.gitlab-ci.yml`
- **Base Image**: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`
- **Trigger Rule**: Runs on all branches except merge request events

### Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `ECR_HOST` | `889199535989.dkr.ecr.us-east-1.amazonaws.com` | ECR registry host |
| `SHORTREPO` | `titan/reg-ui` | Repository short name |
| `IMAGE_NAME` | `${ECR_HOST}/${SHORTREPO}` | Full Docker image name |
| `K8S_NAMESPACE` | `prd1541` | Kubernetes namespace |
| `HELM_RELEASE_NAME` | `reg-ui` | Helm release name |
| `HELM_VERSION` | `v3.10.1` | Helm CLI version |
| `CHART_REPO` | `tm/webservice` | Helm chart repository |
| `CHART_VERSION` | `11.6.0` | Helm chart version |

### Environment URLs

| Environment | FQDN |
|-------------|------|
| **Testing** | `reg-ui-tests-{branch-slug}.vf.nonprod9.us-east-1.tktm.io` |
| **QA** | `reg-ui-qa.vf.nonprod9.us-east-1.tktm.io` |
| **Dev** | `reg-ui-dev.vf.nonprod9.us-east-1.tktm.io` |
| **PreProd** | `reg-ui.vf.preprod9.us-east-1.pub-tktm.io` |
| **Prod East** | `reg-ui.vf.prod9.us-east-1.pub-tktm.io` |
| **Prod West** | `reg-ui.vf.prod10.us-west-2.pub-tktm.io` |

## Pipeline Stages

### 1. Install Stage

**Job**: `install`

- **Purpose**: Install npm dependencies and populate cache
- **Commands**:
  ```bash
  npm ci --cache .npm
  ```
- **Cache Policy**: `push` (updates cache)
- **Cache Paths**:
  - `.npm/`
  - `node_modules/`
  - `.next/cache`
  - `messages/`
- **Runner**: `tm-prod cicd build`

### 2. Transifex Stage

#### Download Translations

**Job**: `download translations`

- **Purpose**: Download translations from Transifex
- **Commands**:
  ```bash
  TX_TOKEN=${TX_TOKEN} npm run tx download
  ```
- **Cache Policy**: `pull-push` (reads and updates cache)
- **Dependencies**: `install`
- **Failure Handling**: Allowed to fail (temporary)

#### Upload Translations

**Job**: `upload translations`

- **Purpose**: Upload source translations to Transifex
- **Commands**:
  ```bash
  TX_TOKEN=${TX_TOKEN} npm run tx upload
  ```
- **Trigger Rules**:
  - Automatic: On `main` branch when `messages/en_US.json` changes
  - Manual: For all other cases
- **Dependencies**: `install`
- **Failure Handling**: Allowed to fail

### 3. Verify Stage

All verification jobs run in parallel after `install` completes.

#### Prettier Check

**Job**: `prettier`

- **Purpose**: Verify code formatting
- **Command**: `npm run prettier:check`
- **Dependencies**: `install`

#### Lint Check

**Job**: `lint`

- **Purpose**: Run ESLint checks
- **Command**: `npm run lint:check`
- **Dependencies**: `install`

#### Type Check

**Job**: `typecheck`

- **Purpose**: Verify TypeScript types
- **Command**: `npm run types:check`
- **Dependencies**: `install`

#### Unit Tests

**Job**: `test`

- **Purpose**: Run Jest unit tests with coverage
- **Command**: `npm run test`
- **Dependencies**: `install`

### 4. Dockerize Stage

**Job**: `dockerize`

- **Purpose**: Build and push Docker image
- **Image**: `tmhub.io/verifiedfan/docker-builder:focal-node18-latest`
- **Dependencies**: `install`, `download translations`
- **Runner**: `tm-prod terraformer`
- **Commands**:
  ```bash
  npm run script:writeBuildVersion  # Generate BUILD_VERSION
  npm run build                      # Next.js production build
  docker-compose build              # Build Docker image
  docker-compose push               # Push to ECR
  ```
- **Artifacts**:
  - `buildVersion` file (expires in 1 week)
- **Cleanup**: Removes all containers, images, and volumes after push

### 5. QA Envs Stage

#### Pre-Deploy Testing Environment

**Job**: `pre deploy testing env`

- **Purpose**: Speed up test environment by pre-deploying with existing image
- **Stage**: `install` (runs early)
- **Build Version**: `20240918_main_b62852432` (hardcoded)
- **Deployment**: Ephemeral per-branch environment

#### Deploy Testing Environment

**Job**: `deploy testing env`

- **Purpose**: Deploy ephemeral test environment for branch
- **Dependencies**: `dockerize`
- **Release Name**: `${HELM_RELEASE_NAME}-tests-${CI_COMMIT_REF_SLUG}`
- **Values File**: `tests-values.yaml`
- **Environment**: `tests-${CI_COMMIT_REF_SLUG}`
- **Cleanup**: Linked to `destroy testing env` job

#### Deploy QA

**Job**: `deploy qa1`

- **Purpose**: Deploy to QA environment
- **Cluster**: `nonprod9.us-east-1`
- **Release Name**: `${HELM_RELEASE_NAME}-qa`
- **Values File**: `qa-values.yaml`
- **Trigger Rules**: Automatic on `main` branch or release tags, otherwise manual
- **Environment**: `qa1`
- **Failure Handling**: Allowed to fail

### 6. Dev Envs Stage

**Job**: `deploy dev1`

- **Purpose**: Deploy to Dev environment
- **Cluster**: `nonprod9.us-east-1`
- **Release Name**: `${HELM_RELEASE_NAME}-dev`
- **Values File**: `dev-values.yaml`
- **Trigger Rules**: Automatic on `main` branch or release tags, otherwise manual
- **Environment**: `dev1`
- **Failure Handling**: Allowed to fail

### 7. PreProd Envs Stage

**Job**: `deploy preprod1`

- **Purpose**: Deploy to PreProd environment
- **Cluster**: `preprod9.us-east-1`
- **Release Name**: `${HELM_RELEASE_NAME}`
- **Values File**: `values.yaml`
- **Trigger Rules**: Automatic on `main` branch or release tags, otherwise manual
- **Environment**: `preprod1`
- **Failure Handling**: Allowed to fail

**Job**: `purge fastly preprod`

- **Purpose**: Purge Fastly CDN cache after PreProd deployment
- **Dependencies**: `deploy preprod1`
- **Service ID**: `sJWkDDZbgiLhehjrxZmI46`

### 8. Production Envs Stage

#### Deploy Production East

**Job**: `deploy prod1`

- **Purpose**: Deploy to Production US East
- **Cluster**: `prod9.us-east-1`
- **Release Name**: `${HELM_RELEASE_NAME}`
- **Values File**: `values.yaml`
- **Trigger Rules**: Manual only, tags only
- **Tag Pattern**: `v*.*.*` (semantic versioning)
- **Environment**: `prod1`

#### Deploy Production West

**Job**: `deploy prod1w`

- **Purpose**: Deploy to Production US West
- **Cluster**: `prod10.us-west-2`
- **Release Name**: `${HELM_RELEASE_NAME}`
- **Values File**: `values.yaml`
- **Trigger Rules**: Manual only, tags only
- **Tag Pattern**: `v*.*.*` (semantic versioning)
- **Environment**: `prod1w`

#### Purge Fastly Production

**Job**: `purge fastly prod`

- **Purpose**: Purge Fastly CDN cache after Production deployment
- **Dependencies**: `deploy prod1`, `deploy prod1w`
- **Service ID**: `jzcal6fzi3hxclocGLNTT6`
- **Trigger Rules**: Tags only

### 9. Destroy Stage

All destroy jobs are **manual** and used to tear down environments.

| Job | Environment | Release Suffix | Cluster |
|-----|-------------|----------------|---------|
| `destroy testing env` | tests-{branch-slug} | `-tests-${CI_COMMIT_REF_SLUG}` | nonprod9.us-east-1 |
| `destroy qa1` | qa1 | `-qa` | nonprod9.us-east-1 |
| `destroy dev1` | dev1 | `-dev` | nonprod9.us-east-1 |
| `destroy preprod1` | preprod1 | (none) | preprod9.us-east-1 |
| `destroy prod1` | prod1 | (none) | prod9.us-east-1 |
| `destroy prod1w` | prod1w | (none) | prod10.us-west-2 |

**Command**: `helm3 uninstall ${HELM_RELEASE_NAME}${RELEASE_SUFFIX}`

## Deployment Process

### Helm Deployment Script

**File**: `kube/install.sh`

**Usage**:
```bash
./kube/install.sh <INGRESS_FQDN> <RELEASE_NAME> <VALUES_FILENAME> [EXTRA_ARGS]
```

**Process**:
1. Update Helm repositories (`helm3 repo up`)
2. Run Helm upgrade with:
   - Common values: `kube/common/values.yaml`
   - Cluster-specific values: `kube/${CLUSTER}/${FILENAME}`
   - Dynamic overrides: `ingress.fqdn`, `image.tag`, `deploytime`
3. Wait for deployment to complete (`--wait --debug`)

**Example**:
```bash
helm3 upgrade --wait --debug -i reg-ui tm/webservice \
  --version 11.6.0 --namespace=prd1541 \
  -f kube/common/values.yaml \
  -f kube/prod9.us-east-1/values.yaml \
  --set ingress.fqdn=reg-ui.vf.prod9.us-east-1.pub-tktm.io \
  --set image.tag=20250213_main_abc123 \
  --set deploytime=2025-02-13T12:00:00Z
```

## Build Versioning

### Build Version Format

**Script**: `scripts/writeBuildVersion.mjs`

**Format**: `YYYYMMDD_{branch}_{short-commit-sha}`

**Example**: `20250213_main_b62852432`

**Storage**:
- Written to `buildVersion` file in repo root
- Exported as `BUILD_VERSION` environment variable
- Used as Docker image tag
- Passed to Helm as `image.tag`

## Environment Configuration

Application configuration is managed via YAML files in `configs/`:

| File | Build Env | Target |
|------|-----------|--------|
| `default.config.yml` | (base) | All environments |
| `dev.config.yml` | `dev` | Dev environment |
| `qa.config.yml` | `qa` | QA environment |
| `preprod.config.yml` | `preprod` | PreProd environment |
| `prod.config.yml` | `prod` | Production environments |

**Build Environment Variable**: `BUILD_ENV`

**Build Commands**:
```bash
npm run build         # Uses BUILD_ENV=qa
npm run build-dev     # Uses BUILD_ENV=dev
npm run build-preprod # Uses BUILD_ENV=preprod
npm run build-prod    # Uses BUILD_ENV=prod
```

## Deployment Strategy

### Rollout Configuration

- **Min Ready Seconds**: 15 seconds
- **Revision History**: 3 deployments retained
- **Max Unavailable Pods**: 75% during disruptions
- **Termination Grace Period**: 30 seconds

### Health Checks

#### Liveness Probe

- **Path**: `/heartbeat`
- **Initial Delay**: 30 seconds
- **Timeout**: 5 seconds
- **Period**: 10 seconds
- **Failure Threshold**: 3

#### Readiness Probe

- **Path**: `/heartbeat`
- **Initial Delay**: 30 seconds
- **Timeout**: 5 seconds
- **Period**: 10 seconds
- **Failure Threshold**: 3

## Deployment Environments

### Production Deployment Flow

1. Create semantic version tag: `v1.2.3`
2. Push tag to GitLab
3. CI/CD runs full pipeline (install → verify → dockerize)
4. **Manual approval**: Deploy to `prod1` (US East)
5. **Manual approval**: Deploy to `prod1w` (US West)
6. Automatic: Purge Fastly CDN cache

### Non-Production Deployment Flow

**Main Branch**:
- Automatically deploys to QA, Dev, PreProd (or manual option)
- Creates ephemeral test environment

**Feature Branches**:
- Manual deployment option for QA, Dev, PreProd
- Automatic ephemeral test environment creation

## Docker Image Lifecycle

1. **Build**: Next.js standalone output + static assets
2. **Image Creation**: Multi-stage Docker build using `node:18-alpine`
3. **Tag**: `${IMAGE_NAME}:${BUILD_VERSION}`
4. **Push**: ECR registry (`889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/reg-ui`)
5. **Deploy**: Helm chart pulls image by tag
6. **Cleanup**: Old images/containers removed after push

## Cache Management

### Build Cache (GitLab)

- **Key**: `$CI_COMMIT_REF_SLUG` (branch-specific)
- **Paths**:
  - `.npm/` - npm package cache
  - `node_modules/` - installed dependencies
  - `.next/cache` - Next.js build cache
  - `messages/` - translation files
- **Policy**: Pull for most jobs, push from `install` job

### CDN Cache (Fastly)

- **PreProd**: Manual purge or automated after deployment
- **Production**: Automated purge after both regions deploy
- **Purge Method**: Full service purge (`/purge_all`)

## Deployment Verification

After deployment, verify:

1. **Health Check**: `curl https://<fqdn>/heartbeat` returns 200
2. **Metrics Endpoint**: `curl https://<fqdn>/metrics` returns Prometheus metrics
3. **Pod Status**: `kubectl get pods -n prd1541` shows all pods running
4. **Logs**: Check Fluentd/Elasticsearch for application logs
