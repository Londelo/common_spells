# Deployment - dmd-workers

## Overview

The demand-capture workers use a **GitLab CI/CD pipeline** with **Terraform** for infrastructure deployment. The pipeline supports multiple environments with progressive promotion from QA → Dev → Preprod → Prod.

**CI/CD Platform**: GitLab CI
**IaC Tool**: Terraform (via Terramisu wrapper)
**Build Tool**: Webpack + Babel (Node.js bundling)

---

## CI/CD Pipeline

### Pipeline Stages

The GitLab CI pipeline consists of 35 stages organized into a deployment flow:

```
1. qa destroy (manual)
2. dev destroy (manual)
3. preprod destroy (manual)
4. prod destroy (manual)
5. install
6. publishExtensions (manual)
7. pre-bundle tests
8. bundle
9. qa deploy
10. qa check aws
11. qa integration tests
12. qa e2e tests
13. dev deploy
14. dev check aws
15. dev integration tests
16. dev e2e tests
17. preprod deploy
18. preprod check aws
19. preprod integration tests
20. preprod e2e tests
21. prod kick-off (manual)
22. prod deploy
23. prod check aws
```

### Pipeline Configuration

**Base Image**: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`

**Key Variables**:
- `PRD_CODE`: prd3292
- `TERRAMISU_IMAGE`: prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3
- `KUBERNETES_NAMESPACE_OVERWRITE`: ${PRD_CODE}
- `E2E_PIPELINE_GIT_URL`: https://git.tmaws.io/verifiedfan/e2e-tests/pipelines.git
- `E2E_TAG`: dmnd

---

## Build Process

### 1. Install Dependencies (Stage: install)

**Job**: `yarn`
```bash
yarn install
```

**Artifacts**:
- `node_modules/` (expires in 1 week)

### 2. Pre-Bundle Testing (Stage: pre-bundle tests)

**Jobs**:
- `app unit tests`: Run unit tests for all apps
  ```bash
  npx run tests:unit ./apps
  ```
- `lib unit tests`: Run unit tests for shared libraries
  ```bash
  npx run tests:unit ./shared
  ```
- `eslint`: Lint all code
  ```bash
  npx run eslint:lint '-f table'
  ```
- `yamllint`: Lint YAML configuration files
  ```bash
  yamllint -c yamllint.config.yml .
  ```

### 3. Bundle Workers (Stage: bundle)

**Job**: `bundle`
```bash
apk add --update zip
npx run workers:bundle
```

**Bundle script** (from runfile.js):
```javascript
run('rm -rf dist');
run('tsc --noEmit');  // Type check
run('BABEL_ENV=production NODE_OPTIONS=--openssl-legacy-provider npx webpack');
run('cd dist && zip -r lambda.zip ./');
```

**Output**:
- `dist/lambda.zip` (expires in 1 week)
- This artifact is deployed to all environments

---

## Deployment Process

### Terraform Deployment Tool: Terramisu

All deployments use **Terramisu**, a Terraform wrapper that:
- Manages Terraform state in S3
- Handles backend configuration
- Applies environment-specific variable files

**Terramisu commands**:
```bash
# Apply infrastructure
terramisu apply -e ${TF_VARS_DIR}

# Destroy infrastructure
terramisu destroy -e ${TF_VARS_DIR}

# Target specific resources
terramisu apply -e ${TF_VARS_DIR} -- -target=${TARGET}
```

### GitLab Runners

Different runners are used based on environment and AWS account:

| Runner Tag | Used For | Account Access |
|------------|----------|----------------|
| `tm-nonprod terraformer` | QA, Dev | tm-nonprod AWS account |
| `tm-prod terraformer preprod` | Preprod | tm-prod AWS account (preprod env) |
| `tm-prod terraformer` | Production | tm-prod AWS account (prod env) |
| `tm-prod cicd build` | Build/test jobs | General compute |

---

## Environment Deployment Flow

### QA Environment (qa1)

**Deployment**: Automatic on main branch
**Account**: tm-nonprod
**Runner**: tm-nonprod terraformer

**Jobs**:
- `qa deploy` (.qa_deploy template)
  - Extends: `.terraform_deploy`, `.terraform_runner_nonprod`, `.only_main`
  - Variables: `TF_VARS_DIR: tm-nonprod/qa1`
- `qa check aws`: Verify AWS resources exist
- `qa integration tests`: Run integration tests
- `qa e2e tests`: Run end-to-end tests

**Manual jobs** (for non-main branches):
- `qa manual deploy`: Deploy from feature branches
- `qa manual target deploy`: Deploy specific resources only

### Dev Environment (dev1)

**Deployment**: Automatic on main branch (after QA)
**Account**: tm-nonprod
**Runner**: tm-nonprod terraformer

**Jobs**:
- `dev deploy` (.dev_deploy template)
  - Extends: `.terraform_deploy`, `.terraform_runner_nonprod`, `.only_main`
  - Variables: `TF_VARS_DIR: tm-nonprod/dev1`
- `dev check aws`: Verify AWS resources
- `dev integration tests`: Run integration tests
- `dev e2e tests`: Run end-to-end tests

### Preprod Environment (preprod1)

**Deployment**: Automatic on main branch (after Dev)
**Account**: tm-prod
**Runner**: tm-prod terraformer preprod

**Jobs**:
- `preprod deploy` (.preprod_deploy template)
  - Extends: `.terraform_deploy`, `.terraform_runner_preprod`, `.only_main`
  - Variables: `TF_VARS_DIR: tm-prod/preprod1`
- `preprod check aws`: Verify AWS resources
- `preprod integration tests`: Run integration tests
- `preprod e2e tests`: Run end-to-end tests

### Production Environment (prod1)

**Deployment**: Manual approval required
**Account**: tm-prod
**Runner**: tm-prod terraformer

**Jobs**:
- `prod kick-off`: Manual gate before production deployment
  - Must be manually triggered
  - `allow_failure: false` (blocks pipeline if not approved)
- `prod deploy` (.prod_deploy template)
  - Extends: `.terraform_deploy`, `.terraform_runner_prod`, `.only_main`
  - Variables: `TF_VARS_DIR: tm-prod/prod1`
- `prod check aws`: Verify AWS resources

**Production safety**:
- Requires manual kick-off approval
- No automated testing in production (only AWS resource verification)

---

## Environment Configuration

### Terraform Variable Files

Each environment has dedicated Terraform variable files:

```
terraform/
  tm-nonprod/
    {worker}-qa1/
      terraform.tfvars
    {worker}-dev1/
      terraform.tfvars
  tm-prod/
    {worker}-preprod1/
      terraform.tfvars
    {worker}-prod1/
      terraform.tfvars
```

**Example structure** (terraform.tfvars):
```hcl
product_code_tag   = "PRD3292"
inventory_code_tag = "ntfcn-schdlr"
aws_profile        = "tm-nonprod-Ops-Techops"
aws_region         = "us-east-1"
account_tag        = "tm-nonprod"
environment_tag    = "qa1"
vpc                = "qa"
zone               = "nonprod-tmaws.io"
config             = "qa"
app_name           = "notificationScheduler"
```

### Application Configuration

**Config files** (in `configs/`):
- `default.config.yml`: Base configuration
- `qa.config.yml`: QA overrides
- `dev.config.yml`: Dev overrides
- `preprod.config.yml`: Preprod overrides
- `prod.config.yml`: Production overrides

**Runtime configuration**:
- Loaded by `@verifiedfan/configs` library
- Environment selected via `CONFIG_ENV` environment variable
- Lambda receives `CONFIG_ENV` and `TARGET_ENV` from Terraform

---

## Deployment Commands

### Deploy Entire Stack

```bash
cd terraform/stacks/<stack>
terramisu apply -e tm-nonprod/qa1
```

### Deploy Single Worker

```bash
cd terraform
terramisu apply -e tm-nonprod/qa1 -- -target=aws_lambda_function.lambda
```

### Local Testing

Before deployment, you can test workers locally:

```bash
# Run unit tests
npx run tests:unit ./apps

# Run integration tests
npx run tests:integration

# Invoke worker locally
npx run workers:invoke notificationScheduler '[{ "message": "test" }]'
```

---

## Branch Strategy

### Main Branch
- **Auto-deploys**: QA → Dev → Preprod
- **Manual gate**: Production (requires kick-off approval)

### Feature Branches
- **Manual deploys**: Available for QA only
- **Manual target deploys**: Deploy specific resources
- **No auto-promotion**: Changes must be merged to main

---

## Rollback Strategy

### Infrastructure Rollback

1. **Revert commit** in Git
2. **Re-run pipeline** with reverted code
3. **Manual destroy** (if needed):
   ```bash
   cd terraform
   terramisu destroy -e tm-nonprod/qa1
   ```

### Lambda Code Rollback

Since Lambda deployments are immutable:
1. **Redeploy** previous working version by checking out previous commit
2. **Or**: Use AWS Lambda versioning/aliases (not currently implemented)

---

## Artifact Management

### Build Artifacts

**Lambda deployment package**:
- Path: `dist/lambda.zip`
- Contains: Webpack-bundled JavaScript + dependencies
- Size optimization: Production build, tree-shaking enabled
- Retention: 1 week in GitLab CI artifacts

### Terraform State

**State storage**:
- Backend: S3
- State locking: DynamoDB (implicit via Terramisu)
- Isolation: Per worker per environment

---

## Integration Testing

### Post-Deployment Tests

After each environment deployment:

**Check AWS Resources**:
```bash
npx run aws:findResources
```
- Verifies deployed Lambda functions exist
- Validates configuration matches expected state

**Integration Tests**:
```bash
npx run tests:integration ' --retry 2 --fail-fast'
```
- Tests against deployed environment
- Retries failures up to 2 times
- Reports saved to `reports/` directory

**E2E Tests** (QA, Dev, Preprod only):
```bash
git clone $E2E_PIPELINE_GIT_URL
cd pipelines
yarn
NODE_ENV=$CONFIG_ENV npx run tests:tags @dmnd
```
- Runs external E2E test suite
- Tagged with `@dmnd`
- Reports saved to `e2eTests/reports/`

---

## Manual Operations

### Publish Suppression Extension (Manual)

Updates Ticketmaster event extensions with suppression data:

```bash
npx run publishSuppression
```

**Available jobs**:
- `publishSuppression nonprod` (QA environment)
- `publishSuppression preprod`
- `publishSuppression prod`

**When to use**:
- Manual sync of suppression status to TM Publish API
- Required after bulk suppression updates

---

## Deployment Validation

### Post-Deployment Checklist

1. **Resource verification**: `qa check aws` job passes
2. **Integration tests**: All integration tests pass
3. **E2E tests**: End-to-end scenarios pass
4. **CloudWatch logs**: Check for errors in Lambda execution
5. **Metrics**: Verify Lambda invocations and success rate

### Monitoring Deployment Success

- **GitLab CI UI**: View job status and logs
- **AWS CloudWatch**: Monitor Lambda invocations
- **AWS CloudWatch Logs**: Check function execution logs
- **AWS X-Ray**: Trace distributed requests (if enabled)

---

## Terraform Modules

### External Modules

The infrastructure uses several reusable Terraform modules:

| Module | Source | Purpose |
|--------|--------|---------|
| naming | terraform-module-naming | Resource naming convention |
| account | terraform-module-account | AWS account metadata |
| web_networks | terraform-module-networks | VPC network configuration (web tier) |
| app_networks | terraform-module-networks | VPC network configuration (app tier) |
| log_stream_arn | terraform-modules/log-stream-arn | Log stream ARN resolution |
| event_stream_arn | ./modules/event_stream_arn | Event stream ARN resolution |

### Module Versions

Modules are pinned to specific versions for stability:
- `terraform-module-naming`: v1.3.3
- `terraform-module-account`: v1.1.2
- `terraform-module-networks`: v3.2.3
- `log-stream-arn`: v1.0.0
