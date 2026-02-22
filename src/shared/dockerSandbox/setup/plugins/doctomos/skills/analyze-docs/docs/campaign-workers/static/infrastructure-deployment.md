# Deployment - campaign-workers

> **Last Updated**: 2026-02-13
> **Repository**: git.tmaws.io/verifiedfan/campaign-pipeline/workers
> **CI/CD Platform**: GitLab CI
> **Deployment Tool**: Terramisu (Terraform wrapper)

## Overview

The campaign-workers repository uses GitLab CI/CD with Terraform (via Terramisu) to deploy 16 Lambda workers across 4 environments. Each worker is deployed independently with environment-specific configurations.

## Environments

| Environment | Branch | AWS Account | Region | VPC | Approval |
|-------------|--------|-------------|--------|-----|----------|
| qa | develop | tm-nonprod | us-east-1 | dev | Automatic |
| dev | develop | tm-nonprod | us-east-1 | dev | Automatic |
| preprod | develop | tm-prod | us-east-1 | prod | Automatic |
| prod | develop | tm-prod | us-east-1 | prod | Manual |

### Environment Naming Convention

- **qa**: qa1
- **dev**: dev1
- **preprod**: preprod1
- **prod**: prod1

## CI/CD Pipeline

### Pipeline Configuration

- **GitLab CI File**: `.gitlab-ci.yml`
- **Worker Configs**: `gitlab-ci/workers/*.yml`
- **Docker Image**: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`
- **Terramisu Image**: `prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3`

### Pipeline Stages

The GitLab CI pipeline consists of 37 stages that run in sequence:

#### Destruction Stages (Manual)
1. **qa destroy** - Destroy QA environment
2. **dev destroy** - Destroy dev environment
3. **preprod destroy** - Destroy preprod environment
4. **prod destroy** - Destroy prod environment

#### Build and Test Stages
5. **install** - Install dependencies with Yarn
6. **refresh athena tables** - Manual Athena table refresh
7. **merge avro** - Manual Avro file merge
8. **pre-bundle tests** - Run unit tests and linting
9. **bundle** - Build and zip Lambda functions

#### QA Environment
10. **qa check aws** - Verify AWS resources exist
11. **qa integration tests** - Run integration tests
12. **qa deploy** - Deploy to QA (automatic on develop)
13. **clone e2e repo** - Clone end-to-end test repository
14. **qa e2e tests** - Run end-to-end tests

#### Dev Environment
15. **dev check aws** - Verify AWS resources exist
16. **dev integration tests** - Run integration tests
17. **dev deploy** - Deploy to dev (automatic on develop)
18. **dev e2e tests** - Run end-to-end tests

#### Preprod Environment
19. **preprod check aws** - Verify AWS resources exist
20. **preprod integration tests** - Run integration tests
21. **preprod deploy** - Deploy to preprod (automatic on develop)
22. **preprod e2e tests** - Run end-to-end tests

#### Production Environment
23. **prod kick-off** - Manual approval gate for production
24. **prod check aws** - Verify AWS resources exist
25. **prod deploy** - Deploy to production (after manual approval)

### GitLab Runners

#### Nonprod Runner
- **Tag**: `tm-nonprod terraformer`
- **Environments**: qa, dev
- **AWS Account**: tm-nonprod

#### Preprod Runner
- **Tag**: `tm-prod terraformer preprod`
- **Environments**: preprod
- **AWS Account**: tm-prod

#### Prod Runner
- **Tag**: `tm-prod terraformer`
- **Environments**: prod
- **AWS Account**: tm-prod

#### Build Runner
- **Tag**: `tm-prod cicd build`
- **Purpose**: Install, test, bundle stages

## Deployment Process

### Automatic Deployment (develop branch)

When code is merged to `develop`:

1. **Install**: `yarn install --immutable`
2. **Unit Tests**: Run tests for apps, tools, and shared libraries
3. **Linting**: ESLint and YAMLlint validation
4. **Bundle**: `npx run workers:bundle` creates `dist/lambda.zip`
5. **QA Deploy**: Terramisu applies Terraform for all workers to QA
6. **QA Tests**: Integration and E2E tests run in QA
7. **Dev Deploy**: Terramisu applies Terraform for all workers to dev
8. **Dev Tests**: Integration and E2E tests run in dev
9. **Preprod Deploy**: Terramisu applies Terraform for all workers to preprod
10. **Preprod Tests**: Integration and E2E tests run in preprod
11. **Prod Kick-off**: Manual gate - requires human approval
12. **Prod Deploy**: Terramisu applies Terraform for all workers to prod

### Manual Deployment (non-develop branches)

On feature branches, deployment jobs are manual:
- All QA deployments require manual trigger
- E2E test jobs require manual trigger
- No automatic progression to dev/preprod/prod

## Deployment Commands

### Standard Deployment (via CI/CD)

GitLab CI/CD automatically runs deployments, but the underlying commands are:

```bash
# Bundle workers
npx run workers:bundle

# Deploy with Terramisu (example for saveCampaignData to dev)
cd terraform
terramisu apply -e tm-nonprod/saveCampaignData-dev1
```

### Local Deployment

#### Prerequisites

1. Install Terramisu Docker wrapper:

```bash
function terramisu() {
  docker run --rm -it \
    --volume $(pwd):/app \
    --volume ~/.aws:/home/app/.aws:ro \
    --volume ~/.terramisu:/home/app/.terramisu \
    --entrypoint /bin/terramisu \
    prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3 "$@"
}
```

2. Configure AWS credentials for appropriate account

#### Deploy Steps

```bash
# 1. Build the Lambda zip
npx run workers:bundle

# 2. Navigate to Terraform directory
cd terraform

# 3. Deploy a specific worker to a specific environment
terramisu apply -e tm-nonprod/saveCampaignData-dev1

# 4. Deploy all workers in an environment
for worker in saveCampaignData processScheduledWave mergeAvroFiles; do
  terramisu apply -e tm-nonprod/${worker}-dev1
done
```

#### Destroy Infrastructure

```bash
cd terraform
terramisu destroy -e tm-nonprod/saveCampaignData-dev1
```

## Per-Worker Deployment

Each of the 16 workers has its own deployment jobs:

### Deployment Job Pattern

For each worker (e.g., `saveCampaignData`):

**QA Jobs**:
- `saveCampaignData deploy qa` - Auto deploy on develop
- `saveCampaignData deploy qa manual` - Manual deploy on other branches
- `saveCampaignData destroy qa` - Manual destroy

**Dev Jobs**:
- `saveCampaignData deploy dev` - Auto deploy on develop
- `saveCampaignData destroy dev` - Manual destroy (develop only)

**Preprod Jobs**:
- `saveCampaignData deploy preprod` - Auto deploy on develop
- `saveCampaignData destroy preprod` - Manual destroy (develop only)

**Prod Jobs**:
- `saveCampaignData deploy prod` - Auto deploy on develop (after kick-off)
- `saveCampaignData destroy prod` - Manual destroy (develop only)

### Terraform Variable Files

Each worker/environment combination has a tfvars file:

```
terraform/
  tm-nonprod/
    saveCampaignData-dev1/terraform.tfvars
    saveCampaignData-qa1/terraform.tfvars
    processScheduledWave-dev1/terraform.tfvars
    ...
  tm-prod/
    saveCampaignData-preprod1/terraform.tfvars
    saveCampaignData-prod1/terraform.tfvars
    ...
```

## Build Process

### Bundle Task

The `workers:bundle` task:
1. Compiles TypeScript to JavaScript
2. Bundles with Webpack
3. Creates individual zip files per worker
4. Outputs to `dist/` directory

### Artifacts

**Bundle Stage**:
- Path: `dist/`
- Expiration: 1 week
- Contains: `lambda.zip` for each worker

**Test Reports**:
- Path: `reports/`
- Contains: Integration test results

**E2E Repository**:
- Path: `e2eTests/`
- Cloned from: `verifiedfan/e2e-tests/pipelines.git`
- Tag: `@cmp`

## Testing in Pipeline

### Unit Tests

**Execution**:
```bash
npx run tests:unit ./apps     # App unit tests
npx run tests:unit ./tools    # Tool unit tests
npx run tests:unit ./shared   # Shared library tests
```

**Dependencies**: Requires `yarn install` to complete

### Integration Tests

**Command**:
```bash
NODE_ENV={env} SHOULD_MOCK_TEST_DATA=true npx run tests:integration ' --retry 2 --fail-fast'
```

**Environments**: qa, dev, preprod
**Retry Policy**: 2 retries on failure
**Fail-fast**: Stops on first failure

### E2E Tests

**Repository**: `verifiedfan/e2e-tests/pipelines`
**Command**:
```bash
NODE_ENV={env} npx run tests:tags @cmp
```

**Environments**: qa, dev, preprod
**Tag**: `@cmp` (campaign-specific tests)

### AWS Resource Checks

Before each environment deployment:

```bash
NODE_ENV={env} npx run aws:findResources
```

Validates that expected AWS resources exist before deployment.

## Operational Tasks

### Manual Tasks (via GitLab CI)

#### Refresh Athena Tables

**Job**: `{env} athena tables`
**Command**: `NODE_ENV={env} npx run aws:athena:refreshTables`
**Environments**: qa, dev, preprod, prod
**Trigger**: Manual

#### Merge Avro Files

**Job**: `{env} merge avro`
**Command**: `NODE_ENV={env} npx run aws:s3:mergeAvro`
**Environments**: qa, dev, preprod, prod
**Trigger**: Manual

## Terraform Backend

Backend configuration in `terraform_backend.tf`:
- Uses remote state (likely S3)
- Managed by Terramisu

## Cache Configuration

### Yarn Cache

- **Path**: `.yarn-cache/`
- **Key**: Per-project
- **Scope**: GitLab CI cache

### Node Modules

- **Artifact**: `node_modules/`
- **Expiration**: 1 week
- **Dependencies**: Used by test and bundle stages

## Environment Variables

### GitLab CI Variables

```yaml
PRD_CODE: prd2011                                          # Product code
KUBERNETES_NAMESPACE_OVERWRITE: ${PRD_CODE}                # K8s namespace
YARN_CACHE_FOLDER: ${CI_PROJECT_DIR}/.yarn-cache           # Yarn cache location
E2E_PIPELINE_GIT_URL: https://git.tmaws.io/verifiedfan/e2e-tests/pipelines.git
E2E_TAG: cmp                                               # E2E test tag filter
TERRAMISU_IMAGE: prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3
```

### Per-Environment Variables

Set dynamically in each job:
- `NODE_ENV`: qa, dev, preprod, prod
- `TF_VARS_DIR`: Path to terraform.tfvars file

## Deployment Artifacts

### Lambda Zip Structure

```
dist/
  lambda.zip          # Contains bundled code for all workers
    lambda.js         # Main handler entry point
    [bundled dependencies]
```

### Worker Handler

All workers share the same zip but use different handler configurations via Terraform variables.

## Rollback Procedures

### Automatic Rollback

Not configured. Failed deployments remain in the deployed state.

### Manual Rollback

1. **Identify Previous Version**: Check GitLab CI history
2. **Revert Git Branch**:
   ```bash
   git revert <commit-hash>
   git push origin develop
   ```
3. **Manual Deploy**: Trigger deployment pipeline
4. **Or Deploy from Commit**:
   - In GitLab, go to the previous successful pipeline
   - Manually trigger deploy jobs from that pipeline

### Emergency Rollback (Terraform)

```bash
cd terraform

# Option 1: Redeploy previous version
git checkout <previous-commit>
npx run workers:bundle
terramisu apply -e tm-prod/saveCampaignData-prod1

# Option 2: Destroy and redeploy
terramisu destroy -e tm-prod/saveCampaignData-prod1
git checkout develop
npx run workers:bundle
terramisu apply -e tm-prod/saveCampaignData-prod1
```

## Monitoring Deployments

### GitLab Pipeline View

- Navigate to CI/CD > Pipelines
- Each commit shows pipeline status
- Click pipeline to see individual job status

### Terraform Output

Terramisu provides output showing:
- Resources created/updated/destroyed
- Function ARNs
- Stream/queue ARNs

### Deployment Verification

After deployment, the pipeline automatically:
1. Checks AWS resources exist (`aws:findResources`)
2. Runs integration tests
3. Runs E2E tests

## Deployment Best Practices

1. **Always Deploy to QA First**: Even for hotfixes
2. **Run Integration Tests**: Verify tests pass before promoting
3. **Manual Prod Gate**: Use kick-off stage to coordinate production deployments
4. **Bundle Before Deploy**: Always run `npx run workers:bundle` locally before Terraform
5. **Single Worker Deploys**: For targeted fixes, deploy individual workers only
6. **Monitor Logs**: Check CloudWatch logs after deployment
7. **Verify IAM**: Ensure IAM permissions match new resource requirements
