# Deployment - vf-api-workers

## Overview

The vf-api-workers repository uses GitLab CI/CD for continuous integration and Terraform (via Terramisu wrapper) for infrastructure deployment across multiple environments.

## CI/CD Pipeline

**Platform**: GitLab CI
**Configuration**: `.gitlab-ci.yml` with modular includes from `gitlab-ci/` directory
**Container Image**: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`
**Terraform Wrapper**: Terramisu (`prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3`)

### Pipeline Stages

The pipeline consists of 35 stages organized in sequential order:

#### 1. Destroy Stages (Manual)
- `qa destroy` - Destroy QA environment resources
- `dev destroy` - Destroy Dev environment resources
- `preprod destroy` - Destroy Preprod environment resources
- `prod destroy` - Destroy Production environment resources

#### 2. Build and Test Stages
- `install` - Install dependencies (yarn)
- `lookup fan` - (reserved stage)
- `pre-bundle tests` - Run tests before bundling:
  - App unit tests (`npx run tests:unit ./apps`)
  - Tools unit tests (`npx run tests:unit ./tools`)
  - Lib unit tests (`npx run tests:unit ./shared`)
  - ESLint (`npx run eslint:lint`)
  - YAMLLint (yamllint)
- `bundle` - Build Lambda zip artifacts (`npx run workers:bundle`)

#### 3. QA Deployment and Testing
- `qa deploy` - Deploy to QA environment (automatic on main branch)
- `qa check aws` - Verify AWS resources (`npx run aws:findResources`)
- `qa integration tests` - Run integration tests (`npx run tests:integration`)
- `qa e2e tests` - Run end-to-end tests

#### 4. Dev Deployment and Testing
- `dev deploy` - Deploy to Dev environment (automatic on main branch)
- `dev check aws` - Verify AWS resources
- `dev integration tests` - Run integration tests
- `dev e2e tests` - Run end-to-end tests

#### 5. Preprod Deployment and Testing
- `preprod deploy` - Deploy to Preprod environment (automatic on main branch)
- `preprod check aws` - Verify AWS resources
- `preprod integration tests` - Run integration tests
- `preprod e2e tests` - Run end-to-end tests

#### 6. Production Deployment
- `prod kick-off` - Manual approval gate for production
- `prod deploy` - Deploy to Production (automatic after kick-off)
- `prod check aws` - Verify AWS resources

### Runner Tags

Different runner types for different environments:

| Runner Tag | Purpose | Environments |
|------------|---------|--------------|
| `tm-nonprod terraformer` | Terraform operations in nonprod | qa1, dev1 |
| `tm-prod terraformer preprod` | Terraform operations in preprod | preprod1 |
| `tm-prod terraformer` | Terraform operations in prod | prod1 |
| `tm-prod cicd build` | Build and test operations | All |

## Environment Configuration

### Environments

| Environment | Account | Region | VPC | TF Vars Directory |
|-------------|---------|--------|-----|-------------------|
| qa1 | tm-nonprod | us-east-1 | qa | terraform/tm-nonprod/{app}-qa1 |
| dev1 | tm-nonprod | us-east-1 | dev | terraform/tm-nonprod/{app}-dev1 |
| preprod1 | tm-prod | us-east-1 | preprod | terraform/tm-prod/{app}-preprod1 |
| prod1 | tm-prod | us-east-1 | prod | terraform/tm-prod/{app}-prod1 |

### Per-Function Deployment Jobs

Each of the 8 Lambda functions has dedicated deploy/destroy jobs for each environment. The functions are:

1. **loadScoresToDynamoDB**
2. **loadScoresToStream**
3. **lookupPhoneScore**
4. **processSavedScores**
5. **proxyCampaignService**
6. **saveEntryScoring**
7. **saveFanlistScores**
8. **verdictReporter**

Each function has jobs in this pattern:
- `{function} deploy qa` - Automatic on main branch
- `{function} deploy qa manual` - Manual trigger on feature branches
- `{function} deploy dev` - Automatic on main branch
- `{function} destroy dev` - Manual trigger on main branch
- `{function} deploy preprod` - Automatic on main branch
- `{function} destroy preprod` - Manual trigger on main branch
- `{function} deploy prod` - Automatic on main branch (after kick-off)
- `{function} destroy prod` - Manual trigger on main branch

### Manual vs Automatic Deployments

**Automatic Deployments** (main branch only):
- QA: All functions deploy automatically
- Dev: All functions deploy automatically
- Preprod: All functions deploy automatically
- Prod: All functions deploy automatically after manual `prod kick-off` approval

**Manual Deployments** (feature branches):
- QA: Manual deploy and manual target deploy available
- Dev: Manual target deploy available
- Preprod: Manual target deploy available
- Prod: Manual target deploy available

**Target Deployments**: Allow deploying specific Terraform resources via `-target` flag

## Deployment Commands

### Local Development

```bash
# Install dependencies
yarn

# Run unit tests
npx run tests:unit ./apps
npx run tests:unit ./tools
npx run tests:unit ./shared

# Run linting
npx run eslint:lint

# Bundle Lambda functions
npx run workers:bundle

# Run integration tests (requires AWS credentials)
CONFIG_ENV=qa npx run tests:integration
```

### Terraform Deployment

**Standard Deploy**:
```bash
cd terraform
terramisu apply -e tm-nonprod/loadScoresToDynamoDB-qa1
```

**Target-specific Deploy**:
```bash
cd terraform
terramisu apply -e tm-nonprod/loadScoresToDynamoDB-qa1 -- -target=aws_lambda_function.lambda
```

**Destroy**:
```bash
cd terraform
terramisu destroy -e tm-nonprod/loadScoresToDynamoDB-qa1
```

## Build Artifacts

### Yarn Install (`install` stage)
**Artifacts**:
- `node_modules/` directory
- **Expiration**: 1 week
- **Used by**: All subsequent stages

### Bundle (`bundle` stage)
**Artifacts**:
- `dist/` directory containing Lambda zip files
- **Expiration**: 1 week
- **Used by**: All deployment stages

### Integration Tests
**Artifacts**:
- `reports/` directory
- **Used for**: Test result analysis

### E2E Tests
**Artifacts**:
- `e2eTests/reports/` directory
- **Retry**: 1 time on failure
- **Used for**: End-to-end test result analysis

## Terraform Configuration

### Backend

**Type**: S3 backend (implied by Terramisu usage)
**Configuration File**: `terraform/terraform_backend.tf`

### State Management

Each Lambda function in each environment has its own Terraform state:
- State isolation per function and environment
- Allows independent deployment and rollback
- Example state keys:
  - `tm-nonprod/loadScoresToDynamoDB-qa1`
  - `tm-prod/loadScoresToDynamoDB-prod1`

### Variables Per Environment

Each environment directory contains a `terraform.tfvars` file with:

**Required Variables**:
- `product_code_tag` - Always "PRD2011"
- `inventory_code_tag` - Function-specific code (e.g., "api-load-db")
- `aws_profile` - AWS profile for authentication
- `aws_region` - Deployment region (us-east-1)
- `account_tag` - Account identifier (tm-nonprod or tm-prod)
- `environment_tag` - Environment (qa1, dev1, preprod1, prod1)
- `vpc` - VPC name (qa, dev, preprod, prod)
- `zone` - DNS zone (nonprod-tmaws.io or prod-tmaws.io)
- `config` - Config environment (qa, dev, preprod, prod)
- `app_name` - Lambda function name

**Optional Variables** (function-specific):
- `timeout_seconds` - Lambda timeout (default: 60s, extended for some functions)
- `memory_size_mb` - Lambda memory (default: 2048MB)
- `batch_size` - Event source batch size (default: 2000)
- `is_stream_consumer` - Enable Kinesis stream consumer
- `is_sqs_consumer` - Enable SQS consumer
- `is_sqs_producer` - Enable SQS producer
- `is_firehose_producer` - Enable Firehose producer
- `is_athena_worker` - Enable Athena permissions
- `is_fanout_controller` - Enable Lambda invocation permissions
- `s3_read_write_buckets` - List of S3 buckets for read/write access
- `kinesis_stream_name` - Kinesis stream name
- `sqs_arn` - SQS queue ARN
- `stream_arn` - Kinesis stream ARN

### Example Configuration

```hcl
# loadScoresToStream QA configuration
product_code_tag = "PRD2011"
inventory_code_tag = "api-load-scrs"
aws_profile = "tm-nonprod-Ops-Techops"
aws_region = "us-east-1"
account_tag = "tm-nonprod"
environment_tag = "qa1"
vpc = "qa"
zone = "nonprod-tmaws.io"
config = "qa"
app_name = "loadScoresToStream"
s3_read_write_buckets = ["prd2011.qa1.us-east-1.vf-scoring.tmaws"]
timeout_seconds = "900"
is_sqs_producer = "true"
```

## Deployment Flow

### Main Branch Deployment

1. **Trigger**: Push to `main` branch
2. **Install**: Install dependencies via yarn
3. **Tests**: Run unit tests, ESLint, YAMLLint
4. **Bundle**: Build Lambda zip artifacts
5. **QA Deploy**: Deploy all functions to QA automatically
6. **QA Verify**: Check AWS resources and run integration/e2e tests
7. **Dev Deploy**: Deploy all functions to Dev automatically
8. **Dev Verify**: Check AWS resources and run integration/e2e tests
9. **Preprod Deploy**: Deploy all functions to Preprod automatically
10. **Preprod Verify**: Check AWS resources and run integration/e2e tests
11. **Prod Kick-Off**: Manual approval required
12. **Prod Deploy**: Deploy all functions to Production automatically
13. **Prod Verify**: Check AWS resources

### Feature Branch Deployment

1. **Trigger**: Push to feature branch
2. **Install & Tests**: Same as main branch
3. **Bundle**: Same as main branch
4. **Manual QA Deploy**: Manual trigger available for testing
5. **QA Verify**: Tests run if deployed

## Testing Strategy

### Unit Tests

**Scope**: Individual functions and modules
**Location**: `./apps`, `./tools`, `./shared`
**Command**: `npx run tests:unit {path}`
**Stage**: `pre-bundle tests`

### Integration Tests

**Scope**: End-to-end function behavior in AWS
**Command**: `npx run tests:integration --retry 2 --fail-fast`
**Stage**: Environment-specific (qa/dev/preprod integration tests)
**Retry**: 2 attempts
**Environment Variables**: `CONFIG_ENV` set per environment

### End-to-End Tests

**Scope**: Cross-service workflows
**Source**: External repository (`verifiedfan/e2e-tests/pipelines.git`)
**Tags**: `@api`
**Command**: `NODE_ENV=$CONFIG_ENV npx run tests:tags @${E2E_TAG}`
**Stage**: Environment-specific (qa/dev/preprod e2e tests)
**Retry**: 1 attempt

### AWS Resource Verification

**Purpose**: Verify deployed resources exist and are configured correctly
**Command**: `npx run aws:findResources`
**Stage**: Environment-specific (qa/dev/preprod/prod check aws)

## Rollback Strategy

### Manual Rollback

1. **Identify previous working commit**: Check Git history
2. **Checkout previous commit**: `git checkout <commit-hash>`
3. **Trigger deployment**: Push to main or run manual deploy job
4. **Verify**: Run AWS resource checks and tests

### Terraform State Rollback

1. **Access Terraform state**: Connect to S3 backend
2. **Identify previous state**: Review Terraform state history
3. **Manual apply**: Run `terramisu apply` with previous state
4. **Verify**: Check deployed resources

### Destroy and Redeploy

For critical issues:
1. **Trigger destroy job**: Manual destroy job in GitLab
2. **Fix issue**: Update code or configuration
3. **Redeploy**: Run deploy job
4. **Verify**: Run full test suite

## GitLab Variables

The pipeline likely uses these GitLab CI/CD variables (not shown in config):
- AWS credentials for tm-nonprod and tm-prod accounts
- Slack webhook URLs for verdictReporter
- External service endpoints (Entry Service, Campaign Service)
- API keys and tokens (stored as masked variables)

## Security Considerations

### Secrets Management

- AWS credentials configured at runner level
- Secrets should be managed via GitLab CI/CD variables (masked and protected)
- Lambda environment variables for sensitive data should reference AWS Secrets Manager or Parameter Store

### Access Control

- **Nonprod Deployments**: Require tm-nonprod account access
- **Prod Deployments**: Require tm-prod account access + manual approval
- **Destroy Operations**: Always manual to prevent accidental deletion

### Network Security

- All Lambdas deploy in VPC
- Security groups control network access
- No public IP addresses assigned to Lambda functions

## Monitoring Deployment

### Success Indicators

- All pipeline stages complete successfully
- AWS resource verification passes
- Integration tests pass
- E2E tests pass
- CloudWatch shows Lambda invocations

### Failure Handling

- Pipeline stops on first failure (fail-fast enabled for integration tests)
- Artifacts preserved for debugging
- Rollback via redeployment of previous version

## Dependencies

### Build Dependencies

- Node.js 18 (Alpine Linux base image)
- Yarn 4.0.2
- Babel (transpilation)
- Webpack (bundling)
- TypeScript compiler

### Runtime Dependencies

Key packages deployed with Lambda functions:
- `@verifiedfan/*` - Internal Verified Fan libraries
- `@opentelemetry/api` - Tracing and observability
- AWS SDK (included in Lambda runtime)
- `csv-parse` - CSV file processing
- `ramda` - Functional programming utilities

## Deployment Troubleshooting

### Common Issues

**Bundle Failures**:
- Check webpack configuration
- Verify all dependencies are installed
- Review bundle size (Lambda has 250MB limit)

**Terraform Apply Failures**:
- Check Terraform state locking
- Verify AWS credentials and permissions
- Review Terraform plan output
- Check for resource name conflicts

**Integration Test Failures**:
- Verify AWS resources deployed correctly
- Check environment variables (CONFIG_ENV)
- Review CloudWatch logs for Lambda errors
- Verify external service availability

**E2E Test Failures**:
- Check external repository availability
- Verify test environment configuration
- Review test tags and filters
