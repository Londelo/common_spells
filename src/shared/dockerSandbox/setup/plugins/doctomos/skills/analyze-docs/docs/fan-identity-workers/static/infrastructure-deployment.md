# Deployment - fan-identity-workers

## CI/CD Pipeline

### Platform
**GitLab CI** - `.gitlab-ci.yml`

### Base Image
`tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`

### Terraformer Image
`tmhub.io/ticketmaster/terraformer:1.5.6_cd`

---

## Pipeline Stages

### 1. Destroy Stages (Manual)
- **qa destroy**
- **dev destroy** (manual, main branch only)
- **preprod destroy** (manual, main branch only)
- **prod destroy** (manual, main branch only)

### 2. Install Stage
- **yarn** - Install dependencies
  - Caches `node_modules` for 1 week

### 3. Pre-Bundle Tests
- **app unit tests** - Test `./apps` directory
- **lib unit tests** - Test `./shared` directory
- **eslint** - Lint with table format output
- **yamllint** - YAML file validation (uses Docker)

### 4. Bundle Stage
- **bundle** - Package Lambda functions
  - Installs zip utility
  - Runs `npx run workers:bundle`
  - Caches `dist/` for 1 week

### 5. Environment-Specific Stages

For each environment (QA, Dev, Preprod):
1. **{env} deploy** - Deploy infrastructure
2. **{env} check aws** - Verify AWS resources
3. **{env} integration tests** - Run integration tests
4. **{env} feature tests** - Run Cucumber feature tests
5. **{env} e2e tests** - Run end-to-end tests

### 6. Production Stages
- **prod kick-off** - Manual approval gate
- **prod deploy** - Deploy to production
- **prod check aws** - Verify production resources

---

## Environments

### Environment Configuration

| Environment | Account | Runner Tag | Branch Requirement | Deployment Type |
|-------------|---------|------------|-------------------|-----------------|
| qa1 | tm-nonprod | tm-nonprod terraformer | main or manual | Auto on main |
| dev1 | tm-nonprod | tm-nonprod terraformer | main only | Auto on main |
| preprod1 | tm-prod | tm-prod terraformer preprod | main only | Auto on main |
| prod1 | tm-prod | tm-prod terraformer | main only | Manual gate + auto |

### Terraform Variables Directory

| Environment | TF_VARS_DIR |
|-------------|-------------|
| QA | tm-nonprod/qa1 |
| Dev | tm-nonprod/dev1 |
| Preprod | tm-prod/preprod1 |
| Prod | tm-prod/prod1 |

---

## Deployment Process

### Standard Deployment Flow

1. **Code pushed to main branch**
2. **Install dependencies** (yarn)
3. **Run pre-bundle tests**
   - Unit tests (apps + shared)
   - Linting (ESLint + YAML)
4. **Bundle Lambda artifacts**
   - Creates `dist/lambda.zip`
5. **Deploy to QA** (automatic)
   - Run Terraform apply
   - Check AWS resources
   - Run integration tests
   - Run feature tests
   - Run E2E tests
6. **Deploy to Dev** (automatic)
   - Same testing pipeline as QA
7. **Deploy to Preprod** (automatic)
   - Same testing pipeline as QA/Dev
8. **Production approval** (manual gate)
   - Requires manual kick-off job
9. **Deploy to Prod** (automatic after approval)
   - Run Terraform apply
   - Check AWS resources

### Feature Branch Deployment

**Branches:** Any branch except `main` (push events)

**Available Actions:**
- **QA manual deploy** - Deploy specific stack to QA
- **QA manual target deploy** - Deploy specific resource to QA
- **Dev manual target deploy** - Deploy specific resource to Dev
- **Preprod manual target deploy** - Deploy specific resource to Preprod
- **Prod manual target deploy** - Deploy specific resource to Prod
- **QA manual E2E tests** - Run E2E tests on QA

---

## Terraform Deployment

### Deployment Commands

#### Full Stack Deployment
```bash
cd terraform/stacks/<stack>
terraformer tm-nonprod/qa1 apply -auto-approve
```

#### Targeted Deployment
```bash
cd terraform/stacks/<stack>
terraformer tm-nonprod/qa1 apply -auto-approve -target=<resource>
```

#### Destroy
```bash
cd terraform/stacks/<stack>
terraformer tm-nonprod/qa1 destroy -auto-approve
```

### Stack Deployment Paths

| Stack | Path |
|-------|------|
| Auth | `terraform/stacks/auth` |
| Bot Detection | `terraform/stacks/botornot` |
| Clustering | `terraform/stacks/clustering` |
| IDV | `terraform/stacks/idv` |
| Scoring | `terraform/stacks/scoring` |

### Terraform Backend

Each stack uses remote backend configuration:
- File: `terraform_backend.tf` in each stack directory
- Backend configuration provided by `terraformer` CLI

---

## Testing Pipeline

### Unit Tests

**Command:** `npx run tests:unit <path>`

**Execution:**
- Separate jobs for `./apps` and `./shared`
- Run before bundling
- Fast feedback on code quality

### Integration Tests

**Command:** `npx run tests:integration ' --retry 2 --fail-fast'`

**Execution:**
- After deployment to each environment
- Retries: 2 attempts
- Fail-fast: Stop on first failure
- Environment-specific via `CONFIG_ENV` variable

### Feature Tests

**Command:** `npx run tests:feature ' --retry 2 --fail-fast'`

**Framework:** Cucumber BDD

**Execution:**
- After deployment to each environment
- Generates HTML report in `reports/`
- Environment: `testing-nonprod` or `testing-preprod`

**Configuration:**
- Feature files in `features/` directory
- Step definitions included

### E2E Tests

**Command:** `npx run tests:tags @fanid`

**Repository:** `https://git.tmaws.io/verifiedfan/e2e-tests/pipelines.git`

**Execution:**
- Clones separate E2E test repository
- Runs tests tagged with `@fanid`
- Reports saved to `e2eTests/reports/`
- Retries: 1 attempt
- Only runs if `E2E_TAG` variable is set

**Environments:**
- QA: Auto on main, manual on feature branches
- Dev: Auto on main
- Preprod: Auto on main

### AWS Resource Check

**Command:** `npx run aws:findResources`

**Purpose:** Verify deployed AWS resources exist and are accessible

**Execution:** After each environment deployment

---

## Build Process

### Bundle Step

**Script:**
```bash
apk add --update zip
npx run workers:bundle
```

**Output:**
- `dist/lambda.zip` - Single deployment artifact for all Lambda functions

**Artifact Retention:** 1 week

**Notes:**
- All Lambda functions share the same zip file
- Worker resolution happens at runtime via entry point configuration

### Webpack Configuration

**Target:** Node.js 18.18.2

**Entry Points:**
- Located in `shared/entryFiles/`
- One entry per worker function

**Transpilation:**
- Babel with TypeScript preset
- ES2022 target
- Module: node16

---

## Environment Variables

### Stack-Specific Configuration

**Auth Stack:**
- Standard Lambda environment variables

**Bot Detection Stack:**
- `DS_ACCOUNT` - Data Science AWS account
- `DS_EXPORTS_S3_ARN` - S3 bucket ARN for exports
- `GLUE_WORKFLOW_ARN` - AWS Glue workflow ARN

**Clustering Stack:**
- `DS_ACCOUNT` - Data Science AWS account
- `DS_EXPORTS_S3_ARN` - S3 bucket ARN for exports

**IDV Stack:**
- `PUBLIC_ZONE` - Route53 zone for API Gateway
- `PUBLIC_ZONE_ID` - Route53 zone ID
- `ACM_CERTIFICATE` - Certificate domain name

**Scoring Stack:**
- `ARM_REDIS_URL` - Redis primary endpoint
- `ARM_REDIS_READ_ONLY_URL` - Redis read replica
- `ARM_REDIS_CLUSTER_MODE` - Cluster mode flag
- `FAN_IDENTITY_TABLE_ARN` - DynamoDB table ARN
- `FAN_IDENTITY_TABLE_STREAM_ARN` - Kinesis stream ARN
- `KAFKA_BOOTSTRAP_SERVERS` - Kafka brokers (east)
- `KAFKA_BOOTSTRAP_SERVERS_WEST` - Kafka brokers (west)
- `KAFKA_USER_ACTIVITY_TOPIC` - Topic name (east)
- `KAFKA_USER_ACTIVITY_TOPIC_WEST` - Topic name (west)
- `KAFKA_IS_ENABLED` - Enable Kafka integration
- `VF_INPUT_STREAM_ARN` - VF login stream ARN

### Application Configuration

**Config Files:** `configs/<env>.config.yml`

**Environments:**
- `local-dev.config.yml`
- `dev.config.yml`
- `qa.config.yml`
- `preprod.config.yml`
- `prod.config.yml`
- `prodw.config.yml` (west region)

**Access:** Via `@verifiedfan/configs` package

---

## Runner Tags

### CI/CD Runners

| Runner Tag | Purpose | Environments |
|------------|---------|--------------|
| tm-prod cicd build | Build and test | All (default) |
| tm-nonprod terraformer | Terraform operations | QA, Dev |
| tm-prod terraformer preprod | Terraform operations | Preprod |
| tm-prod terraformer | Terraform operations | Prod |

---

## Deployment Commands (Local)

### Prerequisites
```bash
# Install dependencies
yarn install

# Run tests
npx run tests:unit
npx run tests:integration
npx run tests:feature
```

### Bundle Locally
```bash
npx run workers:bundle
```

### Deploy Stack
```bash
cd terraform/stacks/<stack>
terraformer tm-nonprod/dev1 apply
```

### Invoke Worker Locally
```bash
npx run workers:invoke <workerName> '[{ "message": "hello" }]'
```

---

## GitLab CI Configuration

### Main Configuration
**File:** `.gitlab-ci.yml`

**Includes:** `gitlab-ci/stacks.yml`

### Stack-Specific Configuration
**Directory:** `gitlab-ci/`

**Purpose:** Define stack-specific deployment jobs

### Rebuild CI Configuration
**Command:** `npx run gitlabCI:rebuild`

**Purpose:** Regenerate GitLab CI configuration from templates

---

## Artifact Management

### Build Artifacts

| Artifact | Retention | Path |
|----------|-----------|------|
| node_modules | 1 week | `node_modules/` |
| Lambda bundle | 1 week | `dist/` |
| Test reports | Pipeline duration | `reports/` |
| E2E reports | Pipeline duration | `e2eTests/reports/` |

---

## Deployment Best Practices

### Pre-Deployment Checklist
1. All tests pass locally
2. ESLint passes with no warnings
3. YAML files are valid
4. Bundle builds successfully
5. Feature branch tested in QA

### Rollback Procedure
1. Identify previous stable version
2. Revert commit in main branch
3. Pipeline auto-deploys previous state
4. Or manually run destroy + redeploy

### Emergency Hotfix
1. Create hotfix branch from main
2. Deploy manually to QA for testing
3. Merge to main
4. Manual prod kick-off required

---

## Notes

- Production deployments require manual approval via "prod kick-off" job
- All environments run full test suite except production
- Terraform state managed remotely by terraformer
- Multi-region deployments handled via conditional west core module
- Lambda functions share single deployment artifact
- Pre-push hook runs ESLint to catch issues early
