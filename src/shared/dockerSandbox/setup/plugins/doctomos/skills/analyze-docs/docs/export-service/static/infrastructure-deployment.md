# Deployment - export-service

## Overview

The export-service uses GitLab CI/CD for automated testing, building, and deployment. Infrastructure is provisioned using Terraform via the Terramisu deployment tool. The service is packaged as a Docker container and deployed to EC2 instances across multiple environments.

## CI/CD Pipeline

### GitLab CI Configuration

**Repository**: `git@git.tmaws.io:Titan/export-service.git`

**Base Image**: `tmhub.io/verifiedfan/docker-builder:focal-node18-latest`

### Pipeline Stages

1. **destroy** - Manual environment teardown
2. **install** - Dependency installation
3. **test** - Linting and unit tests
4. **bundle** - Application bundling
5. **dockerize** - Container image build and push
6. **qa environments** - QA deployments
7. **features** - Integration testing
8. **dev pre deploy** - Dev preparation (DB indexes)
9. **dev deploy** - Dev environment deployment
10. **dev post deploy** - Dev verification tests
11. **preprod pre deploy** - Preprod preparation
12. **preprod deploy** - Preprod deployment
13. **preprod post deploy** - Preprod verification
14. **production kick-off** - Manual production gate
15. **production pre deploy** - Production preparation
16. **production deploy** - Production deployment
17. **cleanup** - Post-deployment cleanup

### GitLab Runners

| Runner Type | Tag | Usage |
|-------------|-----|-------|
| Build | `tm-prod terraformer` | Build, test, bundle |
| Nonprod | `tm-nonprod terraformer` | Dev/QA deployments |
| Preprod | `tm-prod terraformer preprod` | Preprod deployments |
| Production | `tm-prod terraformer` | Production deployments |

## Build Process

### 1. Install Dependencies

**Job**: `yarn`

```bash
yarn
```

- Caches node_modules and yarn cache for performance
- Produces artifacts: `node_modules`, `configs/build.config.yml`
- Artifact expiration: 24 hours

### 2. ECR Repository Creation

**Job**: `create repo`

```bash
docker run --rm tmhub.io/ticketmaster/ecr-createrepo titan/export-service
```

Ensures ECR repository exists for Docker images.

### 3. Linting & Testing

**Jobs:**
- `eslint` - JavaScript linting with table format output
- `yaml lint` - YAML configuration validation
- `server-uts` - Server-side unit tests
- `lib-uts` - Library unit tests

### 4. Bundle Application

**Job**: `bundle`

```bash
npx run bundle
```

- Produces `dist/` directory
- Artifact expiration: 24 hours

### 5. Version Calculation

**Job**: `dockerize` (pre-script)

```bash
npx run buildVersion:calculate
export BUILD_VERSION=$(cat buildVersion)
```

Calculates semantic version from Git history.

### 6. Docker Build & Push

**Job**: `dockerize`

```bash
npx run docker:build
npx run docker:compose push
```

- Builds two images:
  - `${ECR_HOST}/titan/export-service:${BUILD_VERSION}` (application)
  - `${ECR_HOST}/titan/export-service:${BUILD_VERSION}-features` (testing)
- Pushes to ECR: `889199535989.dkr.ecr.us-east-1.amazonaws.com`
- Produces artifact: `buildVersion` (expires in 1 month)

### 7. Integration Testing

**Job**: `features`

```bash
npx run docker:compose pull
npx run docker:features reports/all
npx run docker:features reports/verifyAfter "--tags @verifyAfter"
```

- Runs Cucumber feature tests in Docker
- Produces test reports and logs
- Artifact expiration: 8 hours
- Retry: 1 attempt on failure

## Environment Configuration

| Environment | AWS Account | Region | VPC | Terraform Workspace |
|-------------|-------------|--------|-----|---------------------|
| qa1 | tm-nonprod | us-east-1 | dev | tm-nonprod/qa1 |
| dev1 | tm-nonprod | us-east-1 | dev | tm-nonprod/dev1 |
| preprod1 | tm-prod | us-east-1 | prod | tm-prod/preprod1 |
| prod1 | tm-prod | us-east-1 | prod | tm-prod/prod1 |

### Environment URLs

| Environment | URL |
|-------------|-----|
| qa1 | https://vf-export-qa1-us-east-1.titan.nonprod-tmaws.io |
| dev1 | https://vf-export-dev1-us-east-1.titan.nonprod-tmaws.io |
| preprod1 | https://vf-export-preprod1-us-east-1.titan.prod-tmaws.io |
| prod1 | https://vf-export-prod1-us-east-1.titan.pub-tmaws.io |

### SSH Keys

- **Nonprod**: `cet-qa-east`
- **Production**: `cet-prod-east`

## Terraform Deployment

### Deployment Tool

**Terramisu**: `prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3`

A wrapper around Terraform that manages:
- Backend configuration
- Environment-specific variables
- State locking

### Pre-Deployment Steps

**Database Index Creation:**

For each environment (dev, preprod, prod):

```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes
```

- Ensures MongoDB indexes are up-to-date
- Runs before deployment
- Only on `develop` branch

### Deployment Commands

**Apply (Deploy):**

```bash
cd terraform
terramisu apply \
  -e tm-${AWS_ACCOUNT}/${TERRAFORM_ENV} \
  -- \
  -var app_instance_artifact_version=${BUILD_VERSION} \
  -var app_instance_image=titan/export-service \
  -var app_elb_dns_alias_name=vf-export
```

**Destroy (Teardown):**

```bash
cd terraform
terramisu destroy \
  -e tm-${AWS_ACCOUNT}/${TERRAFORM_ENV} \
  -- \
  -var app_instance_image=titan/export-service \
  -var app_elb_dns_alias_name=vf-export
```

**Force Unlock (Release Lock):**

```bash
cd terraform
terramisu force-unlock -e tm-${AWS_ACCOUNT}/${TERRAFORM_ENV}
```

### Terraform Backend

**State Storage:**
- Nonprod: `terraform.nonprod1.us-east-1.tmaws` (S3 bucket)
- Production: `terraform.prod1.us-east-1.tmaws` (S3 bucket)

## Deployment Flow

### QA Environment (qa1)

**Trigger**:
- Automatic on `develop` branch
- Manual on other branches

**Jobs**:
1. `deploy qa1` - Manual deployment
2. `destroy qa1` - Manual teardown

### Development Environment (dev1)

**Trigger**: Automatic on `develop` branch

**Jobs**:
1. `dev db indexes` - Create/update MongoDB indexes
2. `release lock dev1` - Manual lock release (if needed)
3. `deploy dev1` - Automatic deployment (on success)
4. `dev features` - Post-deployment integration tests
5. `dev monoql features` - MonoQL integration tests
6. `destroy dev1` - Manual teardown

### Preprod Environment (preprod1)

**Trigger**: Automatic on `develop` branch

**Jobs**:
1. `preprod db indexes` - Create/update MongoDB indexes
2. `release lock preprod1` - Manual lock release (if needed)
3. `deploy preprod1` - Automatic deployment (on success)
4. `preprod features` - Post-deployment integration tests
5. `preprod monoql features` - MonoQL integration tests
6. `destroy preprod1` - Manual teardown

### Production Environment (prod1)

**Trigger**: Manual gate on `develop` branch

**Jobs**:
1. `prod kick off` - Manual approval gate (required)
2. `production db indexes` - Create/update MongoDB indexes (cannot fail)
3. `release lock prod1` - Manual lock release (if needed)
4. `deploy prod1` - Automatic deployment (on success, cannot fail)
5. `destroy prod1` - Manual teardown

**Important**: Production deployments require explicit manual approval at the "kick off" stage.

## Post-Deployment Verification

### Feature Tests

**Deployed Environment Tests:**

```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'
```

- Runs against deployed environment
- Tests real API endpoints
- Generates test reports
- Retry on failure: 1 attempt

**MonoQL Integration Tests:**

```bash
# Clone MonoQL repo
git clone https://git.tmaws.io/Titan/monoql.git
cd monoql
yarn
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features
```

- Tests export-service integration with MonoQL
- Only runs in dev and preprod
- Produces test reports (expire in 1 week)

## Deployment Variables

### Dynamic Variables (Passed at Deploy Time)

- `app_instance_artifact_version`: Docker image tag (e.g., `20171012_develop_b1424118`)
- `app_instance_image`: Image name (`titan/export-service`)
- `app_elb_dns_alias_name`: DNS prefix (`vf-export`)

### Static Variables (Per Environment)

Defined in `terraform/tm-{account}/{env}/terraform.tfvars`:

**Core Settings:**
- `product_name`: titan
- `product_code_tag`: PRD1541
- `inventory_code_tag`: vf-export
- `aws_region`: us-east-1
- `vpc`: dev / prod
- `zone`: nonprod-tmaws.io / prod-tmaws.io

**Instance Configuration:**
- `app_instance_type`: t2.medium (dev), t2.xlarge (prod)
- `app_instance_min_count`: 1
- `app_instance_max_count`: 1
- `enable_monitoring`: false (dev), true (prod)

**Application Settings:**
- `app_env`: dev / prod (NODE_ENV)
- `app_elb_internal`: true
- `app_instance_port`: 8080
- `app_container_port`: 8080
- `app_instance_healthcheck_url`: /heartbeat

## Rollback Strategy

### Manual Rollback

1. Identify previous working version in ECR
2. Update `app_instance_artifact_version` variable
3. Run Terraform apply:

```bash
terramisu apply \
  -e tm-${AWS_ACCOUNT}/${TERRAFORM_ENV} \
  -- \
  -var app_instance_artifact_version=<PREVIOUS_VERSION>
```

### Auto Scaling Group Behavior

- Health checks detect unhealthy instances
- ASG automatically replaces failed instances
- Connection draining: 600 seconds
- Min ELB capacity: 1 (ensures at least 1 healthy instance)

## Cleanup

**Job**: `docker cleanup`

```bash
BUILD_VERSION=$(cat buildVersion) npx run docker:clean
```

- Runs after deployment completes (success or failure)
- Cleans up local Docker images
- Prevents runner disk space issues

## Security Considerations

### Secrets Management

- AWS credentials managed by IAM instance profiles
- ECR authentication handled automatically
- Terraform state stored in encrypted S3 buckets

### Image Scanning

- ECR images should be scanned for vulnerabilities
- Container runs as non-root user in production

### Deployment Authorization

- GitLab protected branches for `develop`
- Manual gates for production deployments
- Terraform state locking prevents concurrent changes

## Monitoring Deployment Health

### CloudWatch Metrics

Monitor during deployment:
- ASG desired/in-service instance count
- ELB healthy host count
- Application startup time
- CPU/Memory utilization

### Health Check Endpoint

```
GET /heartbeat
```

Expected response: 200 OK

### Logs

Check logs in ELK:
- Application startup logs
- Health check responses
- Error rates during deployment

## Troubleshooting

### Terraform State Lock

If deployment fails with state lock error:

```bash
# Run the manual unlock job in GitLab CI
# Or manually:
terramisu force-unlock -e tm-${AWS_ACCOUNT}/${TERRAFORM_ENV}
```

### Failed Health Checks

1. Check application logs in ELK
2. Verify environment variables in cloud-config
3. Confirm Docker image was pulled successfully
4. Check security group rules

### Image Pull Failures

1. Verify ECR permissions in IAM role
2. Check ECR repository exists
3. Confirm image tag is correct
4. Check ECR login credentials

## Dependencies

### External Services

- **GitLab**: Source control and CI/CD
- **AWS ECR**: Container registry
- **AWS S3**: Terraform state storage
- **Terraform Cloud/Backend**: State management
- **MongoDB**: Database (indexes created pre-deployment)

### Docker Images

- Build: `tmhub.io/verifiedfan/docker-builder:focal-node18-latest`
- Deploy: `prod.tmhub.io/prod/techops-tools/terramisu:v1.8.3`
- Logging: `tmhub.io/tm-waiting-room/fluentd:master-3454331`
- Monitoring: `prom/node-exporter`, `google/cadvisor`
- Security: `prod.tmhub.io/prod/registry.crowdstrike.com/falcon-sensor/us-2/release/falcon-sensor:latest`
