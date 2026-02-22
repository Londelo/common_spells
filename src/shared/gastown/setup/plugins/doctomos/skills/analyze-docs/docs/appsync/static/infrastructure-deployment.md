# Deployment - appsync

## CI/CD Pipeline

**Platform**: GitLab CI
**Configuration File**: `.gitlab-ci.yml`
**Base Image**: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`
**Terraform Tool**: Terramisu v1.8.3

### Pipeline Stages

1. **install** - Install dependencies (yarn)
2. **test** - Lint and code quality checks
3. **build** - Build resolvers/functions and GraphQL schema
4. **unit tests** - Run Jest unit tests
5. **tf plan nonprod** - Terraform plan for nonprod environments
6. **deploy nonprod** - Deploy to nonprod environments
7. **features nonprod** - Run Cucumber feature tests
8. **deploy preprod** - Deploy to preprod environment
9. **deploy prod** - Deploy to production environment

### Pipeline Jobs

#### Install Phase

**Job**: `yarn`
- Install Node.js dependencies with Yarn
- Cache: `.yarn-cache/` directory
- Artifacts: `node_modules/` (expires in 24h)
- Runner: `tm-prod terraformer`

#### Test Phase

**Job**: `eslint`
- Run ESLint on `.js`, `.ts`, and `.graphql` files
- Command: `npx run eslint`
- Skipped on: scheduled runs
- Runner: `tm-prod terraformer`

#### Build Phase

**Job**: `build`
- Build TypeScript resolvers/functions with esbuild
- Merge GraphQL schema partials into `dist/schema.graphql`
- Command: `npx run build`
- Artifacts: `dist/` directory (expires in 24h)
- Failure behavior: Pipeline fails if build fails
- Runner: `tm-prod terraformer`

#### Unit Tests Phase

**Job**: `unit tests`
- Run Jest tests on all `*.spec.ts` files
- Command: `npx run test`
- Failure behavior: Pipeline fails if tests fail
- Runner: `tm-prod terraformer`

#### Feature Branch Workflow

**Terraform Plan Jobs** (manual trigger):
- `qa1 plan`: Plan deployment to qa1
- `qa2 plan`: Plan deployment to qa2

**Deployment Jobs**:
- `qa1 deploy`: **Required** deployment to qa1 (must succeed)
- `qa2 deploy`: Optional deployment to qa2 (allowed to fail)

**Feature Tests**:
- `qa features`: Run Cucumber tests against qa1 environment
- Debug mode enabled: `DEBUG='verifiedfan:*' DEBUG_DEPTH=8`
- Artifacts: `reports/` directory
- Retry: 1 automatic retry on failure

#### Develop Branch Workflow

**Automatic Deployments** (on push to develop):
- `deploy qa1`: Auto-deploy to qa1
- `deploy dev1`: Auto-deploy to dev1

**Manual Deployment**:
- `deploy preprod1`: Manual deployment to preprod1

**Feature Tests**:
- `dev features`: Run Cucumber tests against dev1 environment

#### Production Deployment

**Job**: `deploy prod1`
- Trigger: Manual (from develop branch only)
- Environment: `tm-prod/prod1`
- Failure behavior: Pipeline fails if deployment fails
- Runner: `tm-prod terraformer`

## Environment Configuration

### Nonprod Environments

| Environment | Account | Region | AWS Profile | Domain Zone |
|-------------|---------|--------|-------------|-------------|
| qa1 | tm-nonprod | us-east-1 | tm-nonprod-Ops-Techops | nonprod-tmaws.io |
| qa2 | tm-nonprod | us-east-1 | tm-nonprod-Ops-Techops | nonprod-tmaws.io |
| dev1 | tm-nonprod | us-east-1 | tm-nonprod-Ops-Techops | nonprod-tmaws.io |

**Nonprod Configuration**:
- Cache type: SMALL
- Field log level: ALL (verbose logging)
- Introspection: ENABLED (qa1, likely others)
- LNAA API: `https://loyalty-user.staging.livenationapi.com`

### Production Environments

| Environment | Account | Region | AWS Profile | Domain Zone |
|-------------|---------|--------|-------------|-------------|
| preprod1 | tm-prod | us-east-1 | tm-prod-Ops-Techops | pub-tmaws.io |
| prod1 | tm-prod | us-east-1 | tm-prod-Ops-Techops | pub-tmaws.io |

**Production Configuration**:
- Cache type: LARGE
- Field log level: ERROR (minimal logging)
- Introspection: DISABLED
- LNAA API: `https://loyalty-user.livenationapi.com`

## Deployment Commands

### Local Development Build

```bash
# Install dependencies
yarn install

# Build resolvers and schema
npx run build
```

**Build Output**:
- JavaScript resolvers/functions: `dist/`
- Merged GraphQL schema: `dist/schema.graphql`

### Local QA Deployment

```bash
# Build the application
npx run build

# Navigate to Terraform directory
cd terraform

# Set AWS credentials profile
export AWS_PROFILE=tm-nonprod-Ops-Techops

# Deploy to qa1
terramisu apply -e tm-nonprod/qa1

# Deploy to qa2
terramisu apply -e tm-nonprod/qa2
```

### Local Dev Deployment

```bash
npx run build
cd terraform
export AWS_PROFILE=tm-nonprod-Ops-Techops
terramisu apply -e tm-nonprod/dev1
```

### Terraform Planning

```bash
cd terraform
export AWS_PROFILE=tm-nonprod-Ops-Techops
terramisu plan -e tm-nonprod/qa1
```

### Production Deployment (via CI/CD)

Production deployments should only be done through GitLab CI:
1. Merge changes to `develop` branch
2. Pipeline auto-deploys to qa1, dev1
3. Manually trigger `deploy preprod1` job
4. Verify preprod1 deployment
5. Manually trigger `deploy prod1` job

## Environment Variables

### Terraform Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `product_code_tag` | Product identifier (PRD2011/PRD3292) | tfvars |
| `inventory_code_tag` | Inventory code (appsync) | tfvars |
| `environment_tag` | Environment name (qa1, dev1, prod1) | tfvars |
| `aws_profile` | AWS credentials profile | tfvars |
| `aws_region` | AWS region (us-east-1) | tfvars |
| `cache_type` | AppSync cache size (SMALL/LARGE) | tfvars |
| `field_log_level` | Logging verbosity (ALL/ERROR) | tfvars |
| `introspection_status` | Schema introspection (ENABLED/DISABLED) | tfvars |
| `lnaa_api_base_url` | Live Nation API endpoint | tfvars |
| `build_directory` | Build output directory (../dist) | variables.tf |
| `log_retention_days` | CloudWatch log retention (default: 7 days) | variables.tf |

### Resource Name Variables (Format Strings)

All resource names use format strings with `%s` placeholder for environment tag:

| Variable | Default Value | Description |
|----------|---------------|-------------|
| `account_fanscore_table_name` | `prd2011-%s-us-east-1-acct-fanscore-table` | Account fanscore DynamoDB table |
| `fan_identity_table_name` | `prd2011-%s-us-east-1-fan-identity-table` | Fan identity DynamoDB table |
| `verification_table_name` | `prd2011-%s-us-east-1-verification-table` | Verification DynamoDB table |
| `demand_table_name` | `prd3292-%s-us-east-1-demand-table` | Demand DynamoDB table |
| `proxy_campaign_service_function_name` | `prd2011-%s-proxy-cmp-srvc` | Campaign service proxy Lambda |
| `proxy_tm_account_service_function_name` | `prd3292-%s-prxy-acct` | TM account service proxy Lambda |
| `event_details_function_name` | `prd3292-%s-evnt-dtls` | Event details Lambda |
| `get_updated_phonescore_function_name` | `prd2011-%s-api-phone-scr` | Phonescore Lambda |
| `arm_scoring_function_name` | `prd2011-%s-acct-scrng-get-arm` | ARM scoring Lambda |
| `idv_handle_event_worker_name` | `prd2011-%s-idv-event` | IDV event worker Lambda |
| `idv_check_liveness_worker_name` | `prd2011-%s-idv-liveness` | Liveness check Lambda |
| `check_eligibility_worker_name` | `prd2011-%s-reg-eligibility` | Eligibility check Lambda |
| `lambda_authorizer_name` | `prd2011-%s-fanid-auth-token` | Lambda authorizer |

## Deployment Process Flow

### Feature Branch Deployment

```
Developer pushes branch
  ↓
GitLab CI starts pipeline
  ↓
yarn (install dependencies)
  ↓
eslint (code quality check)
  ↓
build (compile TypeScript, merge schema)
  ↓
unit tests (Jest tests)
  ↓
[Manual] qa1 plan (Terraform plan)
  ↓
[Manual Required] qa1 deploy (Terramisu apply)
  ↓
[Manual Optional] qa2 deploy (Terramisu apply)
  ↓
qa features (Cucumber tests against qa1)
  ↓
✓ Pipeline complete
```

### Develop Branch Deployment

```
Merge to develop
  ↓
GitLab CI starts pipeline
  ↓
yarn → eslint → build → unit tests
  ↓
[Auto] deploy qa1
  ↓
[Auto] deploy dev1
  ↓
[Auto] dev features (Cucumber tests against dev1)
  ↓
[Manual] deploy preprod1
  ↓
[Manual Required] deploy prod1
  ↓
✓ Pipeline complete
```

## Terraform Backend

**Backend Type**: Remote (configured in `terraform_backend.tf`)
**State Management**: Centralized Terraform state storage
**Workspace Pattern**: Environment-specific workspaces (qa1, qa2, dev1, preprod1, prod1)

## Build Process

### TypeScript Compilation

**Tool**: esbuild
**Source Directory**: `app/src/`
**Output Directory**: `dist/`
**Excluded Files**: `*.spec.ts` (test files)

**Build Script**: `build.mjs`
- Compiles all TypeScript resolvers and functions
- Tree-shaking for minimal bundle size
- Source maps for debugging

### GraphQL Schema Merging

**Source Directories**:
- `app/schema/types/*.graphql` - Schema type definitions
- `app/schema/external/*.graphql` - AWS directives and scalars

**Output**: `dist/schema.graphql` (single merged schema file)

**Tools**: `@graphql-tools/load-files`, `@graphql-tools/merge`

## Testing in CI/CD

### Unit Tests

**Framework**: Jest with ts-jest
**Configuration**: `jest.config.js`
**Test Pattern**: `**/*.spec.ts`
**Coverage**: Test files colocated with source code

### Feature Tests

**Framework**: Cucumber (BDD)
**Test Location**: `features/scenarios/*.feature`
**Step Definitions**: Feature-specific step definitions
**Environment**: Tests run against deployed qa1/dev1 environments
**Debug Output**: Full debug logging enabled during test runs
**Reports**: HTML reports generated in `reports/` directory

## Rollback Procedure

In case of deployment issues:

1. **Identify last working commit**: Check Git history
2. **Revert changes**: Create revert commit
3. **Deploy via CI/CD**: Follow normal deployment process
4. **Manual emergency rollback**:
   ```bash
   cd terraform
   export AWS_PROFILE=tm-prod-Ops-Techops
   git checkout <previous-commit>
   npx run build
   terramisu apply -e tm-prod/prod1
   ```

## Deployment Prerequisites

**Required Tools**:
- Node.js 18.18.2+
- Yarn package manager
- Terramisu CLI (v1.8.3+)
- AWS CLI configured with appropriate profiles
- Terraform knowledge for troubleshooting

**Required Permissions**:
- AWS IAM permissions for tm-nonprod/tm-prod accounts
- GitLab repository access for CI/CD
- Ops-Techops role access

## GitLab CI Configuration

**Product Code**: PRD2011
**Short Repo**: verifiedfan/appsync
**Kubernetes Namespace**: prd2011 (product code)
**Yarn Cache**: `.yarn-cache/` (persisted between pipeline runs)
**Terramisu Image**: `prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3`
