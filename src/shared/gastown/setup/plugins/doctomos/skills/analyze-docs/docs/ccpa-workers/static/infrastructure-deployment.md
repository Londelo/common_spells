# Deployment - ccpa-workers

## Overview

The CCPA Workers project uses GitLab CI/CD with Terraform (via Terramisu wrapper) to deploy Lambda functions across multiple environments. Deployments are automated on the `main` branch with manual promotion to production.

## CI/CD Pipeline

### Platform
- **CI/CD Tool**: GitLab CI
- **Configuration**: `.gitlab-ci.yml`
- **Base Image**: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`
- **Terraform Tool**: Terramisu v1.8.3 (Terraform wrapper)
- **Terraform Version**: 1.5.6

### Pipeline Stages

The pipeline consists of 37 stages organized in this order:

1. **Destroy Stages** (Manual)
   - qa destroy
   - dev destroy
   - preprod destroy
   - prod destroy

2. **Build & Test**
   - install
   - pre-bundle tests
   - bundle

3. **QA Environment**
   - qa deploy
   - qa check aws
   - qa integration tests
   - qa e2e tests

4. **Dev Environment**
   - dev deploy
   - dev check aws
   - dev integration tests
   - dev e2e tests

5. **Preprod Environment**
   - preprod deploy
   - preprod check aws
   - preprod integration tests
   - preprod e2e tests

6. **Production**
   - prod kick-off (manual gate)
   - prod deploy
   - prod check aws

### Pipeline Jobs

#### Install Stage
**Job**: `yarn`
- Installs npm dependencies
- Artifacts: `node_modules/` (expires in 1 week)

#### Pre-bundle Tests
All tests run in parallel on the default runner:

1. **app unit tests**: `npx run tests:unit ./apps`
2. **lib unit tests**: `npx run tests:unit ./shared`
3. **eslint**: `npx run eslint:lint '-f table'`
4. **yamllint**: Validates YAML configuration files

#### Bundle Stage
**Job**: `bundle`
- Bundles all Lambda functions into deployment package
- Script: `npx run workers:bundle`
- Artifacts: `dist/` directory containing `lambda.zip` (expires in 1 week)

#### Deploy Jobs
Deployment uses Terramisu (Terraform wrapper) with environment-specific configurations:

```bash
cd ${TERRAFORM_DIR:-terraform}
terramisu apply -e ${TF_VARS_DIR}
```

#### Check AWS
Verifies deployed resources:
```bash
npx run aws:findResources
```

#### Integration Tests
```bash
npx run tests:integration ' --retry 2 --fail-fast'
```
Generates test reports in `reports/` directory.

#### E2E Tests
Runs end-to-end tests using separate test pipeline:
```bash
git clone https://git.tmaws.io/verifiedfan/e2e-tests/pipelines.git
cd pipelines && yarn
NODE_ENV=$CONFIG_ENV npx run tests:tags @ccpa
```
- **Tag**: `@ccpa`
- **Conditional**: Only runs if `E2E_TAG` variable is set
- **Artifacts**: `e2eTests/reports/`

## Environments

### Environment Configuration

| Environment | Account | Region | VPC | GitLab Runner | Auto Deploy |
|-------------|---------|--------|-----|---------------|-------------|
| qa1 | tm-nonprod | us-east-1 | dev | tm-nonprod terraformer | Yes (main branch) |
| dev1 | tm-nonprod | us-east-1 | dev | tm-nonprod terraformer | Yes (main branch) |
| preprod1 | tm-prod | us-east-1 | prod | tm-prod terraformer preprod | Yes (main branch) |
| prod1 | tm-prod | us-east-1 | prod | tm-prod terraformer | Manual gate required |

### Environment-Specific Configs

Each Lambda function has environment-specific Terraform variable files:

**Pattern**: `terraform/tm-{account}/{app-name}-{env}/terraform.tfvars`

**Examples**:
- `terraform/tm-nonprod/keepPrivate-dev1/terraform.tfvars`
- `terraform/tm-nonprod/keepPrivate-qa1/terraform.tfvars`
- `terraform/tm-prod/keepPrivate-preprod1/terraform.tfvars`
- `terraform/tm-prod/keepPrivate-prod1/terraform.tfvars`

**Available Workers** (based on directory structure):
- deleteFan
- fanInfo
- keepPrivate
- optOut
- processRequest
- saveDisclosures
- updateDictionary

Each worker has configurations for: dev1, qa1, preprod1, prod1

## Deployment Flow

### Automatic Deployment (main branch)

```
Commit to main
  ↓
Install dependencies (yarn)
  ↓
Run tests (unit, eslint, yamllint) - Parallel
  ↓
Bundle Lambda functions
  ↓
Deploy to QA → Check AWS → Integration Tests → E2E Tests
  ↓
Deploy to Dev → Check AWS → Integration Tests → E2E Tests
  ↓
Deploy to Preprod → Check AWS → Integration Tests → E2E Tests
  ↓
[Manual Gate: prod kick-off]
  ↓
Deploy to Prod → Check AWS
```

### Feature Branch Deployment (non-main)

- All automatic stages are disabled
- Manual deployment to QA available
- Targeted deployments available for QA, Dev, Preprod with `-target` flag

### Production Deployment Gate

Production deployment requires manual approval:
1. Pipeline reaches "prod kick-off" stage
2. Manual approval required (cannot be bypassed)
3. Once approved, deployment proceeds to prod1
4. After production deployment, AWS resources are verified

## Deployment Commands

### Manual Terraform Operations

#### Deploy to Environment
```bash
cd terraform
terramisu apply -e tm-nonprod/dev1
```

#### Deploy Specific Target
```bash
cd terraform
terramisu apply -e tm-nonprod/dev1 -- -target=module.example
```

#### Destroy Environment (Manual Only)
```bash
cd terraform
terramisu destroy -e tm-nonprod/qa1
```

### Local Development Commands

From project root with `package.json` scripts:

```bash
# Bundle workers for deployment
npx run workers:bundle

# Run unit tests
npx run tests:unit ./apps
npx run tests:unit ./shared

# Run integration tests
npx run tests:integration

# Lint code
npx run eslint:lint

# Find AWS resources
npx run aws:findResources
```

## GitLab Runner Configuration

### Runner Tags

| Tag | Purpose | Environments |
|-----|---------|--------------|
| `tm-nonprod terraformer` | Non-production Terraform operations | QA, Dev |
| `tm-prod terraformer preprod` | Preprod Terraform operations | Preprod |
| `tm-prod terraformer` | Production Terraform operations | Prod |
| `tm-prod cicd build` | Build and test operations | All |

## Terraform Backend

Each stack/environment uses remote Terraform state storage:
- State is managed per environment
- Backend configuration in `terraform_backend.tf` files

## Environment Variables

### CI/CD Variables

Set in GitLab CI configuration:

| Variable | Value | Purpose |
|----------|-------|---------|
| PRD_CODE | prd2011 | Product code for CCPA |
| TERRAFORMER_VERSION | 1.5.6_cd | Terraform version |
| TERRAMISU_IMAGE | prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3 | Terraform wrapper image |
| E2E_PIPELINE_GIT_URL | https://git.tmaws.io/verifiedfan/e2e-tests/pipelines.git | E2E test repo |
| E2E_TAG | ccpa | E2E test tag filter |
| GIT_EMAIL | thomas.zheng@ticketmaster.com | Git config |
| GIT_NAME | Thomas Zheng | Git config |

### Lambda Environment Variables

Set per environment via Terraform:

| Variable | Source | Example Value |
|----------|--------|---------------|
| ENVIRONMENT | `environment_tag` | dev1, qa1, preprod1, prod1 |
| CONFIG_ENV | `config` | dev, qa, preprod, prod |
| TARGET_ENV | `config` | dev, qa, preprod, prod |
| APP_NAME | `app_name` | keepPrivate, deleteFan, etc. |

## Deployment Artifacts

### Build Artifacts
- **Location**: `dist/lambda.zip`
- **Content**: Bundled Lambda functions
- **Expiration**: 1 week
- **Size**: Contains all compiled code and dependencies

### Test Reports
- **Location**: `reports/` (integration tests)
- **Location**: `e2eTests/reports/` (E2E tests)
- **Format**: Generated by test framework
- **Availability**: Per pipeline run

## Rollback Strategy

To rollback a deployment:

1. **Revert Git Commit**: Revert the problematic commit on main branch
2. **Trigger Pipeline**: Push the revert to trigger automatic deployment
3. **Or Manual Deploy**: Use previous version's git commit and manually deploy

**Note**: Terraform state tracks current infrastructure. Reverting code and redeploying will update resources to match previous state.

## Deployment Schedule

- **Scheduled Pipelines**: Pipeline can be triggered on schedule
- **Schedule Check**: Jobs skip on scheduled runs (check: `except: schedules`)
- **Use Case**: Automated certificate expiration alerting (runs on `alert-cert-expiry` branch)

## Multi-Stack Deployment

The repository includes mechanisms for deploying multiple workers:
- **Worker Configs**: `gitlab-ci/workers.yml`
- **Stack Configs**: `gitlab-ci/stacks.yml`

Each worker/stack extends base templates and provides environment-specific overrides.
