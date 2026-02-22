# Deployment - dmd-pipeline

## Overview

The demand-pipeline uses GitLab CI/CD for continuous integration and deployment across four environments (dev1, qa1, preprod1, prod1). The pipeline is built with Node.js 18, uses Terraform for infrastructure as code, and implements a multi-stage deployment workflow with automated testing.

## CI/CD Platform

### GitLab CI

- **Configuration File:** `.gitlab-ci.yml`
- **Terraformer Version:** 1.5.6_cd
- **Terraformer Image:** `tmhub.io/ticketmaster/terraformer:1.5.6_cd`
- **Node Image:** `node:18.18-alpine`
- **GitLab Documentation:** https://confluence.livenation.com/display/DEVXT/GitLab+Runners

## Pipeline Stages

The CI/CD pipeline consists of the following stages:

1. **build** - Build TypeScript code and Lambda functions
2. **test** - Run unit tests and linting
3. **deploy-qa1** - Package and deploy to QA1 environment
4. **e2e-test-qa1** - Run integration and E2E tests in QA1
5. **deploy-dev1** - Package and deploy to DEV1 environment
6. **e2e-test-dev1** - Run integration and E2E tests in DEV1
7. **deploy-preprod** - Package and deploy to PREPROD1 environment
8. **e2e-test-preprod** - Run integration and E2E tests in PREPROD1
9. **deploy-prod** - Package and deploy to PROD1 environment (manual)

## GitLab Runner Tags

### Build Runners
- **Tags:** `tm-prod cicd build`
- **Purpose:** Build and package artifacts
- **Environment:** Production runners for build operations

### Test Runners
- **Nonprod Test:** `tm-nonprod cicd test`
- **Preprod Test:** `tm-nonprod-preprod cicd test`
- **Prod Test:** `tm-prod cicd test`

### Deployment Runners
- **Nonprod Terraformer:** `tm-nonprod terraformer`
- **Prod Terraformer:** `tm-prod terraformer`

## Environment Configuration

### Development Environments

| Environment | Account | AWS Region | Branch Trigger | Deployment | Testing |
|-------------|---------|------------|----------------|------------|---------|
| **dev1** | tm-nonprod | us-east-1 | main only | Automatic | Integration + E2E |
| **qa1** | tm-nonprod | us-east-1 | main (auto), other (manual) | Automatic on main | Integration + E2E |

**Environment Variables (dev1):**
- `aws_region`: us-east-1
- `aws_profile`: tm-nonprod-Ops-Techops
- `account_tag`: tm-nonprod
- `environment_tag`: dev1
- `product_code_tag`: PRD3292
- `inventory_code_tag`: dmnd-pipeline
- `kinesis_stream_name`: prd3292-dev1-dmnd-table-stream
- `dynamodb_table_name`: prd3292-dev1-us-east-1-demand-table
- `s3_bucket_id`: prd3292.dev1.us-east-1.demand-capture.tmaws

### Production Environments

| Environment | Account | AWS Region | Branch Trigger | Deployment | Testing |
|-------------|---------|------------|----------------|------------|---------|
| **preprod1** | tm-prod | us-east-1 | main only | Automatic | Integration + E2E |
| **prod1** | tm-prod | us-east-1 | main only | Manual approval required | None |

**Environment Variables (prod1):**
- `aws_region`: us-east-1
- `aws_profile`: tm-prod-Ops-Techops
- `account_tag`: tm-prod
- `environment_tag`: prod1
- `product_code_tag`: PRD3292
- `inventory_code_tag`: dmnd-pipeline
- `kinesis_stream_name`: TBD
- `dynamodb_table_name`: prd3292-prod1-us-east-1-demand-table
- `s3_bucket_id`: prd3292.prod1.us-east-1.demand-capture.tmaws

## Build Process

### Build Stage

**Job:** `build`
**Trigger:** All branches
**Runner:** Build runner (`tm-prod cicd build`)
**Image:** Node 18.18 Alpine

**Steps:**
```bash
yarn install
yarn build
```

**Build Script:** `tsc --project tsconfig.build.json --noEmit && lambda build`

**Artifacts:**
- **Path:** `dist/`
- **Expiration:** 1 week

**Cache:**
- `node_modules/`
- `.yarn/`

### Package Stage

**Template:** `.package`
**Used By:** package-dev1, package-qa1, package-preprod, package-prod

**Steps:**
```bash
yarn install
yarn package $ENV
```

**Artifacts:**
- **Path:** `deploy/`
- **Expiration:** 1 week

**Environment-specific packaging:**
- Uses config files from `config/{env}.js`
- Packages Lambda deployment artifacts with environment configuration

## Testing Strategy

### Unit Tests

**Job:** `unit-tests`
**Stage:** test
**Trigger:** All branches
**Runner:** Nonprod test runner

**Command:**
```bash
yarn test
```

**Test Framework:** Jest
**Configuration:** `jest.config.ts`

### Linting

**Job:** `lint`
**Stage:** test
**Trigger:** All branches
**Runner:** Nonprod test runner

**Command:**
```bash
yarn lint
```

**Linter:** ESLint with TypeScript support
**Configuration:** `.eslintrc.js`

### Integration Tests

**Jobs:** integration-test-{env}
**Trigger:** main branch deployments
**Environment Variables:**
- `AWS_REGION`: us-east-1
- `TEST_ENV`: {environment}

**Command:**
```bash
yarn test:integration
```

**Configuration:** `test/integration/jest.config.ts`

### End-to-End Tests

**Jobs:** e2e-test-{env}
**Trigger:** main branch deployments
**Environment Variables:**
- `AWS_REGION`: us-east-1
- `TEST_ENV`: {environment}

**Command:**
```bash
yarn test:e2e
```

**Configuration:** `test/e2e/jest.config.ts`

**Test Coverage:**
- Full pipeline validation
- DynamoDB → Kinesis → Lambda → S3 flow
- Athena query validation

## Deployment Process

### Nonprod Deployment (dev1, qa1)

**Template:** `.nonprod_deploy`
**Runner:** `tm-nonprod terraformer`
**Image:** Terraformer 1.5.6_cd

**Steps:**
```bash
cd terraform
terraformer tm-nonprod/$ENV apply -auto-approve -input=false
```

**IAM Role:** GitRunner (assumed by Terraformer)

### Prod Deployment (preprod1, prod1)

**Template:** `.prod_deploy`
**Runner:** `tm-prod terraformer`
**Image:** Terraformer 1.5.6_cd

**Steps:**
```bash
cd terraform
terraformer tm-prod/$ENV apply -auto-approve -input=false
```

**IAM Role:** GitRunner (assumed by Terraformer)

### Deployment Workflow

#### DEV1 Deployment
1. **Trigger:** Automatic on main branch
2. **Sequence:**
   - Package Lambda artifacts → Deploy infrastructure → Integration tests → E2E tests

#### QA1 Deployment
1. **Trigger:** Automatic on main, manual on feature branches
2. **Sequence:**
   - Package Lambda artifacts → Deploy infrastructure → Integration tests → E2E tests

#### PREPROD1 Deployment
1. **Trigger:** Automatic on main branch
2. **Sequence:**
   - Package Lambda artifacts → Deploy infrastructure → Integration tests → E2E tests

#### PROD1 Deployment
1. **Trigger:** Manual approval required on main branch
2. **Sequence:**
   - Package Lambda artifacts → Manual approval → Deploy infrastructure
3. **No automated testing in production**

## Infrastructure as Code

### Terraform Configuration

**Required Version:** >= 1.5.6
**Backend:** Configured per environment in `terraform_backend.tf`

**Directory Structure:**
```
terraform/
├── main.tf                    # Provider and Terraform config
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── modules.tf                 # External module references
├── lambda.tf                  # Lambda function config
├── dynamodb.tf                # DynamoDB data sources
├── kinesis.tf                 # Kinesis data sources
├── s3.tf                      # S3 data sources
├── athena.tf                  # Athena and Glue config
├── iam.tf                     # IAM roles and policies
├── account.tf                 # Account configuration
├── terraform_backend.tf       # State backend config
├── tm-nonprod/
│   ├── dev1/terraform.tfvars  # DEV1 environment vars
│   └── qa1/terraform.tfvars   # QA1 environment vars
└── tm-prod/
    ├── preprod1/terraform.tfvars  # PREPROD1 environment vars
    └── prod1/terraform.tfvars     # PROD1 environment vars
```

### Terraform Outputs

Available outputs after deployment:

| Output | Description | Usage |
|--------|-------------|-------|
| `athena_database_name` | Name of Athena database | Query configuration |
| `athena_workgroup_name` | Name of Athena workgroup | Athena console access |
| `ci_iam_role_arn` | ARN of CI IAM role | GitLab CI configuration |

**Get outputs:**
```bash
cd terraform
terraformer tm-nonprod/dev1 output athena_workgroup_name
```

## Deployment Commands

### Manual Deployment

#### Prerequisites
```bash
yarn install
```

#### Build Lambda Functions
```bash
yarn build
```

#### Package for Environment
```bash
# Development
yarn package dev1

# QA
yarn package qa1

# Preprod
yarn package preprod1

# Production
yarn package prod1
```

#### Deploy with Terraform
```bash
cd terraform

# Nonprod environments
terraformer tm-nonprod/dev1 apply
terraformer tm-nonprod/qa1 apply

# Prod environments
terraformer tm-prod/preprod1 apply
terraformer tm-prod/prod1 apply
```

### Clean Build Artifacts
```bash
yarn clean
```

## Artifact Management

### Lambda Deployment Artifacts

**Storage:** GitLab artifacts
**Retention:** 1 week
**Contents:**
- Compiled JavaScript (from TypeScript)
- Node modules (production only)
- Lambda handler entry points
- Environment-specific configuration

### Build Cache

**Cached Paths:**
- `node_modules/` - NPM dependencies
- `.yarn/` - Yarn cache

**Cache Key:** Per job and branch

## Dependency Management

### Node.js Dependencies

**Package Manager:** Yarn 4.0.2
**Lock File:** `yarn.lock`
**Configuration:** `.yarnrc.yml`

**Key Dependencies:**
- **AWS SDK:** Client libraries for DynamoDB, S3, Athena, Kinesis
- **Avro:** avsc (v5.7.7)
- **Parquet:** parquets (v0.10.10)
- **Lambda Tooling:** @ticketmaster/lambda
- **Logging:** winston (v3.13.0)

**Dev Dependencies:**
- **TypeScript:** v5.4.5
- **Jest:** v29.7.0
- **ESLint:** v8.54.1

### Infrastructure Dependencies

**Terraform Modules:**
- `terraform-module-nodejs-lambda` (v1.0.0)
- `terraform-module-account` (v1.1.1)
- `terraform-module-naming` (v1.3.3)
- `terraform-modules/log-stream-arn` (v1.0.0)

## Rollback Procedure

### Lambda Rollback

1. **Identify previous version:**
   ```bash
   # Get artifact from previous successful pipeline
   ```

2. **Revert code:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Automatic re-deployment:**
   - CI/CD pipeline will rebuild and redeploy

### Infrastructure Rollback

1. **Identify last known good state:**
   ```bash
   cd terraform
   terraformer tm-nonprod/dev1 state list
   ```

2. **Revert Terraform code:**
   ```bash
   git revert <commit-hash>
   ```

3. **Apply changes:**
   ```bash
   cd terraform
   terraformer tm-nonprod/dev1 apply
   ```

## Environment Promotion

Standard promotion path:
**dev1** → **qa1** → **preprod1** → **prod1**

### Promotion Process

1. **Merge to main:**
   - All changes must be merged to main branch
   - Triggers automatic deployment to dev1 and qa1

2. **Verify in dev1 and qa1:**
   - Monitor integration and E2E test results
   - Verify functionality in both environments

3. **Automatic preprod deployment:**
   - Successful main branch builds auto-deploy to preprod1
   - Monitor integration and E2E test results

4. **Manual production deployment:**
   - Navigate to GitLab pipeline
   - Click "deploy-prod" manual action
   - Confirm deployment

## Monitoring Deployment

### GitLab Pipeline Status

**View pipeline:**
https://git.tmaws.io/demand-capture/data-pipeline/-/pipelines

**Pipeline artifacts:**
- Build logs
- Test results
- Deployment logs

### CloudWatch Logs

**Lambda logs:**
- Navigate to CloudWatch Logs
- Search for log group created by lambda module
- Filter by timestamp for deployment verification

### Terraform State

**View current state:**
```bash
cd terraform
terraformer tm-nonprod/dev1 state list
terraformer tm-nonprod/dev1 show
```

## Secrets Management

### Environment Variables

- **Not stored in code** - All sensitive values configured via GitLab CI/CD variables
- **IAM Role Assumption** - Runners use GitRunner role for AWS access
- **No hardcoded credentials** - All AWS access via IAM roles

### GitLab CI/CD Variables

Variables configured at project level (not visible in code):
- AWS credentials (if applicable)
- Service tokens
- API keys

## Deployment Best Practices

### Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] Code reviewed and approved
- [ ] Breaking changes documented
- [ ] Database migrations tested (if applicable)
- [ ] Rollback plan prepared

### Post-Deployment Checklist

- [ ] Pipeline completed successfully
- [ ] Integration tests passed
- [ ] E2E tests passed
- [ ] CloudWatch metrics normal
- [ ] Lambda function invocation count normal
- [ ] S3 file uploads continuing
- [ ] Athena queries working

### Production Deployment Guidelines

1. **Schedule during low-traffic periods**
2. **Monitor CloudWatch metrics during deployment**
3. **Verify test data in preprod before prod deployment**
4. **Keep communication channel open with team**
5. **Have rollback plan ready**
6. **Document any manual steps required**
