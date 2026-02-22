# Deployment - reg-workers

## CI/CD Pipeline

### Platform
**GitLab CI/CD** at `git.tmaws.io/verifiedfan/registration/workers`

### Pipeline Configuration
- **Main file**: `.gitlab-ci.yml`
- **Stack configs**: `gitlab-ci/stacks/*.yml` (registration, replication, selection, dataPipeline, notification)
- **Base image**: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`

---

## Pipeline Stages

### 1. Destroy (Manual)
- **Stages**: `qa destroy`, `dev destroy`, `preprod destroy`, `prod destroy`
- **Purpose**: Manual Terraform destroy operations per environment
- **Trigger**: Manual only

### 2. Install
- **Job**: `yarn`
- **Purpose**: Install Node.js dependencies
- **Artifacts**: `node_modules/` (expires in 1 week)
- **Runner**: `tm-prod cicd build`

### 3. Pre-Bundle Tests
- **Jobs**:
  - `app unit tests` - Jest tests for `./apps`
  - `lib unit tests` - Jest tests for `./shared`
  - `eslint` - Linting with table format
  - `yamllint` - YAML validation
- **Runner**: `tm-prod cicd build`
- **Dependencies**: yarn artifacts

### 4. Bundle
- **Job**: `bundle`
- **Command**: `npx run workers:bundle` (Webpack bundling)
- **Output**: `dist/lambda.zip` containing all workers
- **Artifacts**: `dist/` (expires in 1 week)
- **Extra**: Installs `zip` utility

### 5. Environment Deployment (Sequential)

**Deployment Flow**: qa → dev → preprod → prod

#### QA Deployment
- **Stage**: `qa deploy`
- **Trigger**: Auto on `main` branch, manual on feature branches
- **Environment**: qa1
- **Runner**: `tm-nonprod terraformer`
- **Variables**: `TF_VARS_DIR=tm-nonprod/qa1`

#### Dev Deployment
- **Stage**: `dev deploy`
- **Trigger**: Auto on `main` branch only
- **Environment**: dev1
- **Runner**: `tm-nonprod terraformer`
- **Variables**: `TF_VARS_DIR=tm-nonprod/dev1`

#### Preprod Deployment
- **Stage**: `preprod deploy`
- **Trigger**: Auto on `main` branch only
- **Environment**: preprod1
- **Runner**: `tm-prod terraformer preprod`
- **Variables**: `TF_VARS_DIR=tm-prod/preprod1`

#### Prod Deployment
- **Stage**: `prod deploy`
- **Trigger**: Manual approval required (`prod kick-off` gate)
- **Environment**: prod1
- **Runner**: `tm-prod terraformer`
- **Variables**: `TF_VARS_DIR=tm-prod/prod1`

### 6. AWS Resource Verification
- **Stages**: `qa check aws`, `dev check aws`, `preprod check aws`, `prod check aws`
- **Job**: `npx run aws:findResources`
- **Purpose**: Validate AWS resources exist post-deployment
- **Runner**: Environment-specific terraformer

### 7. Integration Tests
- **Stages**: `qa integration tests`, `dev integration tests`, `preprod integration tests`
- **Command**: `npx run tests:integration ' --retry 2 --fail-fast'`
- **Framework**: Cucumber BDD
- **Environment Variable**: `CONFIG_ENV={env}`
- **Artifacts**: `reports/` directory
- **Runner**: Environment-specific terraformer
- **Dependencies**: yarn artifacts (not bundle)

### 8. E2E Tests
- **Stages**: `qa e2e tests`, `dev e2e tests`, `preprod e2e tests`
- **Repository**: `https://git.tmaws.io/verifiedfan/e2e-tests/pipelines.git`
- **Tag**: `@reg` (E2E_TAG variable)
- **Command**: `NODE_ENV=$CONFIG_ENV npx run tests:tags @${E2E_TAG}`
- **Artifacts**: `e2eTests/reports/`
- **Retry**: 1 automatic retry
- **Conditional**: Only runs if `E2E_TAG` is set
- **Runner**: Environment-specific terraformer

---

## Deployment Commands

### Manual Deployment (Local)

#### Deploy Entire Stack
```bash
cd terraform/stacks/<stack-name>
terramisu apply -e tm-nonprod/<environment>
# or for prod/preprod
terramisu apply -e tm-prod/<environment>
```

**Example**:
```bash
cd terraform/stacks/registration
terramisu apply -e tm-nonprod/qa1
```

#### Deploy Individual Worker (Targeted)
```bash
cd terraform/stacks/<stack-name>
terramisu apply -e tm-nonprod/<environment> -- -target=module.<worker-name>
```

**Example**:
```bash
cd terraform/stacks/registration
terramisu apply -e tm-nonprod/qa1 -- -target=module.checkEligibility
```

### Bundle Workers Locally
```bash
npx run workers:bundle
```

**Output**: `dist/lambda.zip` (referenced in Terraform as `${path.root}/../../../dist/lambda.zip`)

### Invoke Worker Locally
```bash
npx run workers:invoke <workerName> '<jsonPayload>'

# With specific environment config
CONFIG_ENV=local-dev npx run workers:invoke <workerName> '<jsonPayload>'
```

**Example**:
```bash
npx run workers:invoke checkEligibility '[{ "campaignSlug": "test-campaign", "entry": {...} }]'
```

---

## Environment Configuration

### Available Environments

| Environment | Region | Account Type | Terraform Runner | Variables Path |
|-------------|--------|--------------|------------------|----------------|
| qa1 | us-east-1 | tm-nonprod | tm-nonprod terraformer | tm-nonprod/qa1 |
| dev1 | us-east-1 | tm-nonprod | tm-nonprod terraformer | tm-nonprod/dev1 |
| preprod1 | us-east-1 | tm-prod | tm-prod terraformer preprod | tm-prod/preprod1 |
| prod1 | us-east-1 | tm-prod | tm-prod terraformer | tm-prod/prod1 |

### Terraform Variables (Per Environment)

**Location**: `terraform/stacks/<stack>/tm-{nonprod|prod}/<environment>/`

**Common Variables**:
- `iac_repo` - Repository URL
- `aws_region` - Deployment region (us-east-1)
- `product_name` - "vf" (VerifiedFan)
- `product_code_tag` - Product identifier
- `inventory_code_tag` - Stack-specific inventory code
- `account_tag` - AWS account identifier
- `environment_tag` - Environment name (qa, dev, preprod, prod)
- `config` - Application configuration content
- `vpc` - VPC identifier for networking

**Stack-Specific Variables**:
- `max_timeout_seconds` - Maximum Lambda timeout (default: 900)
- `two_second_buffer` - Queue visibility timeout buffer (default: 2)
- `demand_table_stream_arn` - DynamoDB stream ARN (replication/selection stacks)
- `kafka_cert` - Kafka certificate content (dataPipeline stack)
- `batching_window` - Stream batching window (replication stack)

---

## Deployment Patterns

### Full Stack Deployment
**When**: Major releases, infrastructure changes
**Trigger**: Push to `main` branch
**Flow**:
1. Tests pass
2. Bundle created
3. QA deployed automatically
4. Dev deployed automatically
5. Preprod deployed automatically
6. Prod requires manual kick-off
7. Each environment verified and tested

### Individual Worker Deployment
**When**: Hotfix, single worker update
**Trigger**: Manual job in GitLab CI
**Configuration**: Define in `gitlab-ci/stacks/<stack>.yml`

**Example Job Definition**:
```yaml
checkEligibility deploy qa:
  extends:
    - .registration_variables
    - .qa_manual_target_deploy
  variables:
    TARGET: module.checkEligibility
```

### Feature Branch Deployment
**When**: Testing unreleased features
**Trigger**: Manual deployment to QA
**Jobs**: `<stack> deploy qa manual` jobs available for each stack

---

## GitLab CI/CD Variables

### Required Variables (Per Environment)

#### Kafka Certificates
- `nonprod_kafka_cert` - Used by qa1 and dev1
- `preprod_kafka_cert` - Used by preprod1
- `prod_kafka_cert` - Used by prod1

**Renewal Process**:
1. Run `npx run tools:generateCerts` locally for each environment
2. Authenticate to Vault (user or app role)
3. Copy generated certificate from clipboard
4. Update corresponding GitLab CI/CD variable
5. Redeploy dataPipeline stack

**Certificate Expiration**: Monitored daily via scheduled job, alerts via Slack when < 20 days remain

### Pipeline Configuration
- `PRD_CODE` - "prd2011" (Product code)
- `TERRAMISU_IMAGE` - "prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3"
- `KUBERNETES_NAMESPACE_OVERWRITE` - "${PRD_CODE}"
- `E2E_PIPELINE_GIT_URL` - E2E test repository URL
- `E2E_TAG` - "reg" (test tag filter)

---

## Terraform Backend

### State Storage
**Backend**: S3 with DynamoDB locking (configured per stack)

**Configuration File**: `terraform/stacks/<stack>/terraform_backend.tf`

**State Key Pattern**: `{product-code}/{stack}/{environment}/terraform.tfstate`

### Terramisu Integration
Terramisu automatically:
- Configures backend from `-e` environment flag
- Initializes Terraform
- Applies/destroys with environment-specific variables
- Handles state locking

---

## Worker Registration

### Adding a New Worker

**1. Generate Worker Scaffold**:
```bash
npx run workers:create <workerName> \
  --nameTag=<shortName> \
  --middlewareType=<type> \
  --inventoryCode=<code> \
  --stack=<stack>
```

**Example**:
```bash
npx run workers:create processNewEntries \
  --nameTag=process-entries \
  --middlewareType=sqsBatchConsumer \
  --inventoryCode=reg \
  --stack=registration
```

**2. Register in Configuration**:
Edit `configs/default.config.yml`:
```yaml
verifiedfan:
  workers:
    processNewEntries:
      createdDate: '2025-01-15T12:00:00.000Z'
      nameTag: process-entries
      inventoryCode: reg
      entryFile: lambda
      middlewareType: sqsBatchConsumer
      stack: registration
```

**3. Add to App Resolver**:
Edit `shared/appResolver/map.js`:
```javascript
processNewEntries: () => import('../../apps/registration/processNewEntries'),
```

**4. Create Terraform Configuration**:
Create `terraform/stacks/<stack>/<workerName>.tf`:
```hcl
module "processNewEntries" {
  source          = "git::https://git.tmaws.io/verifiedfan/terraform-modules/nodejs-lambda.git?ref=v2.0.3"
  env             = module.tm_env.env
  config          = var.config
  name            = "processNewEntries"
  name_tag        = "process-entries"
  lambda_zip_path = "${path.root}/../../../dist/lambda.zip"
}
```

**5. Add CI/CD Jobs** (optional for targeted deploys):
Edit `gitlab-ci/stacks/<stack>.yml`:
```yaml
processNewEntries deploy qa:
  extends:
    - .<stack>_variables
    - .qa_manual_target_deploy
  variables:
    TARGET: module.processNewEntries
```

---

## Deployment Best Practices

### Pre-Deployment Checklist
- [ ] Unit tests pass locally (`npx run tests:unit`)
- [ ] Linting passes (`npx run eslint:lint`)
- [ ] Bundle succeeds (`npx run workers:bundle`)
- [ ] Configuration updated in `configs/default.config.yml`
- [ ] Worker registered in `shared/appResolver/map.js`
- [ ] Terraform configuration created and validated

### Post-Deployment Verification
- [ ] CloudWatch Logs show successful initialization
- [ ] AWS resource verification passes
- [ ] Integration tests pass in deployed environment
- [ ] E2E tests pass (if applicable)
- [ ] DLQs are empty
- [ ] Monitoring dashboards show expected metrics

### Rollback Procedure
**Option 1 - Revert Terraform**:
```bash
cd terraform/stacks/<stack>
git checkout <previous-commit>
terramisu apply -e tm-nonprod/<environment>
```

**Option 2 - Deploy Previous Bundle**:
1. Retrieve previous `lambda.zip` from GitLab artifacts
2. Replace in `dist/lambda.zip`
3. Run `terramisu apply`

**Option 3 - Environment Variable Revert**:
- Change `CONFIG_ENV` to previous configuration
- Redeploy without code changes

---

## Monitoring Deployment

### GitLab Pipeline Visibility
- **Pipeline View**: Shows all stages and job status
- **Environment View**: Shows current deployment per environment
- **Job Logs**: Detailed Terraform plan/apply output

### Deployment Notifications
- Configured via GitLab integrations (Slack, email, etc.)
- Pipeline status updates on main branch
- Failed deployment alerts

### Metrics
- Pipeline duration
- Deployment frequency
- Success/failure rate per environment
- Time between environments

---

## Troubleshooting

### Bundle Fails
**Issue**: Webpack bundling errors
**Solutions**:
- Check for missing dependencies in `package.json`
- Verify import paths are correct
- Check for circular dependencies
- Review ESLint errors (must pass before bundling)

### Terraform Apply Fails
**Issue**: Resource conflicts or validation errors
**Solutions**:
- Check Terraform state lock (DynamoDB)
- Verify IAM permissions
- Review resource naming conflicts
- Check variable values in environment config
- Run `terraform plan` locally for detailed output

### Integration Tests Fail
**Issue**: Post-deployment tests not passing
**Solutions**:
- Check Lambda CloudWatch Logs for errors
- Verify environment variables are set correctly
- Confirm external services are accessible (MongoDB, Redis, Kafka)
- Check IAM permissions for service access
- Review SQS queues for pending messages

### DLQ Messages Accumulating
**Issue**: Failed events in dead letter queues
**Solutions**:
- Review Lambda CloudWatch Logs for error patterns
- Check for schema validation failures
- Verify external service availability
- Inspect DLQ message content for debugging
- Increase Lambda timeout or memory if resource-constrained

### Kafka Certificate Expiration
**Issue**: Kafka publish failing
**Solutions**:
- Check certificate expiration date
- Generate new certificate via `npx run tools:generateCerts`
- Update GitLab CI/CD variable
- Redeploy dataPipeline stack
- Verify with `alert cert expiration` job
