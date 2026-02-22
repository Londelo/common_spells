# Operations - dmd-workers

## Overview

This document covers operational procedures, monitoring, logging, debugging, and common maintenance tasks for the demand-capture workers infrastructure.

---

## Monitoring

### CloudWatch Metrics

#### Lambda Function Metrics

**Default Lambda metrics** (available for all functions):
- **Invocations**: Number of times function is invoked
- **Errors**: Number of invocation errors
- **Duration**: Execution time per invocation
- **Throttles**: Number of throttled invocations
- **ConcurrentExecutions**: Number of concurrent executions
- **IteratorAge**: Age of the last record processed (stream-triggered functions)

**Accessing metrics**:
1. AWS Console → CloudWatch → Metrics → Lambda
2. Filter by function name pattern: `prd3292-{env}-{worker}`

#### Custom Metrics

The application can publish custom metrics to CloudWatch using the `@verifiedfan/aws` library.

**Common custom metrics**:
- Notification send attempts
- SMS delivery status
- URL shortening success/failure rates
- Event processing latency

### CloudWatch Alarms

**Note**: Alarms are not currently defined in this Terraform configuration. Consider adding alarms for:
- Lambda error rate > 5%
- Lambda duration > 50 seconds
- Lambda throttling > 0
- DynamoDB read/write capacity exceeded
- SQS queue depth > threshold

**Recommended alarm setup**:
```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "Lambda function error rate"
  alarm_actions       = [var.sns_topic_arn]
}
```

---

## Logging

### CloudWatch Logs

#### Log Groups

Each Lambda function has a dedicated log group:
- **Pattern**: `/aws/lambda/{function-name}`
- **Retention**: 7 days (configurable via `log_retention_days`)
- **Format**: JSON (structured logging)

**Example log group names**:
- `/aws/lambda/prd3292-qa1-us-east-1-ntfcn-schdlr`
- `/aws/lambda/prd3292-qa1-us-east-1-ntfcn-snd`
- `/aws/lambda/prd3292-qa1-us-east-1-dmnd-stream-to-sqs`

#### Log Streaming

All Lambda logs are streamed to a centralized Kinesis stream for aggregation:
- **Stream name**: `{product_code}-{env}-logs`
- **Distribution**: Random
- **Filter pattern**: All logs (no filtering)

**Controlled by**: `use_log_stream` variable (default: true)

**Purpose**:
- Centralized log aggregation
- Long-term log storage
- Security analysis and compliance
- Cross-function correlation

### Log Format

Logs are structured JSON using `@verifiedfan/log` and `@verifiedfan/cloudwatch-stdout`:

```json
{
  "level": "info",
  "message": "Processing notification",
  "timestamp": "2024-01-15T12:34:56.789Z",
  "context": {
    "notificationId": "abc123",
    "userId": "user456"
  }
}
```

**Log levels**:
- `error`: Application errors
- `warn`: Warnings
- `info`: General information (default)
- `debug`: Detailed debugging (disabled in production)

### Querying Logs

#### CloudWatch Insights

**Access**:
AWS Console → CloudWatch → Logs Insights → Select log group

**Example queries**:

**Find errors in last hour**:
```
fields @timestamp, @message, @logStream
| filter level = "error"
| sort @timestamp desc
| limit 100
```

**Notification send latency**:
```
fields @timestamp, duration
| filter message like /notification sent/
| stats avg(duration), max(duration), min(duration) by bin(5m)
```

**Lambda cold starts**:
```
fields @timestamp, @initDuration
| filter @type = "REPORT"
| filter @initDuration > 0
| sort @timestamp desc
```

#### CLI Access

**Stream logs in real-time**:
```bash
aws logs tail /aws/lambda/prd3292-qa1-us-east-1-ntfcn-snd --follow
```

**Query logs**:
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/prd3292-qa1-us-east-1-ntfcn-snd \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

---

## Tracing

### OpenTelemetry Integration

The application uses OpenTelemetry for distributed tracing:

**Configuration** (from default.config.yml):
```yaml
tracing:
  serviceName: vf.dmnd.workers
  collectorHost: otel.nonprod.use1.nonprod-tmaws.io
  collectorPort: 4318
  collectorEncryption: none
```

**Library**: `@verifiedfan/tracing` v3.0.1

**Trace data includes**:
- Lambda invocation spans
- DynamoDB operations
- External API calls (TM Discovery, SMS Service)
- Kinesis/SQS interactions

**Accessing traces**:
- Connect to OpenTelemetry collector endpoint
- Or use AWS X-Ray if configured (not currently enabled)

---

## Debugging

### Local Development

#### Running Workers Locally

```bash
# Invoke a worker with test data
npx run workers:invoke notificationScheduler '[{ "message": "test" }]'
```

**How it works**:
- Loads worker from `apps/{workerName}/index.js`
- Executes handler with provided event
- Uses local configuration (CONFIG_ENV=local-dev)

#### Local Testing

```bash
# Unit tests
npx run tests:unit ./apps
npx run tests:unit ./shared

# Integration tests (requires AWS credentials)
npx run tests:integration

# E2E tests
npx run tests:e2e

# Run specific test
npx run tests:scenario "notification scheduling"
npx run tests:tags "@smoke"
```

#### Environment Variables

For local development:
```bash
export CONFIG_ENV=local-dev
export AWS_PROFILE=tm-nonprod-Ops-Techops
export AWS_REGION=us-east-1
```

### Remote Debugging

#### AWS Lambda Console

1. Go to AWS Console → Lambda → Select function
2. **Test tab**: Create test event and invoke
3. **Monitor tab**: View invocation metrics
4. **Configuration → Environment variables**: View/edit configuration

#### CloudWatch Logs Live Tail

```bash
aws logs tail /aws/lambda/{function-name} --follow --format short
```

#### Lambda Invocation via CLI

**Synchronous invocation**:
```bash
aws lambda invoke \
  --function-name prd3292-qa1-us-east-1-ntfcn-schdlr \
  --payload '{"test": true}' \
  --region us-east-1 \
  response.json
```

**View result**:
```bash
cat response.json
```

---

## Common Operational Tasks

### Adding a New Worker

```bash
# Create worker with all configuration
npx run workers:create myNewWorker \
  --nameTag=my-new-wrkr \
  --middlewareType=dynamodbKinesisConsumer \
  --inventoryCode=my-new-wrkr \
  --stack=myStack
```

**What this creates**:
- Worker directory: `apps/myNewWorker/`
- Terraform config: `terraform/tm-nonprod/myNewWorker-{env}/`
- GitLab CI config: `gitlab-ci/workers/myNewWorker.yml`
- Config entry: Updated `configs/default.config.yml`

**Next steps**:
1. Implement worker logic in `apps/myNewWorker/index.js`
2. Add tests
3. Commit and push to trigger CI/CD

### Removing a Worker

```bash
npx run workers:remove myOldWorker
```

**What this removes**:
- Worker directory
- Terraform configuration
- GitLab CI configuration
- Config entry

**Important**: Manually destroy infrastructure first:
```bash
cd terraform
terramisu destroy -e tm-nonprod/qa1
```

### Scaling Lambda Concurrency

Edit worker's `terraform.tfvars`:
```hcl
reserved_concurrent_executions = "10"  # Limit to 10 concurrent
# or
reserved_concurrent_executions = "-1"  # No limit (default)
```

Deploy the change:
```bash
cd terraform
terramisu apply -e tm-nonprod/qa1
```

### Increasing Lambda Memory/Timeout

Edit worker's `terraform.tfvars`:
```hcl
memory_size_mb   = "3008"  # Increase from 2048
timeout_seconds  = "120"   # Increase from 60
```

**Note**: Memory affects CPU allocation. More memory = faster execution.

### Updating Lambda Runtime

Edit `terraform/variables.tf`:
```hcl
variable "runtime" {
  type    = string
  default = "nodejs20.x"  # Update from nodejs18.x
}
```

**Important**: Test thoroughly before deploying to production.

### Adjusting Stream Batch Size

Edit worker's `terraform.tfvars`:
```hcl
# For Kinesis (max 10,000)
batch_size = "5000"

# For SQS (max 10)
batch_size = "10"
```

**Trade-off**: Larger batches = better throughput, but longer processing time.

### Changing Log Retention

Edit worker's `terraform.tfvars`:
```hcl
log_retention_days = "30"  # Increase from 7
```

**Cost impact**: Longer retention = higher CloudWatch Logs costs.

---

## Disaster Recovery

### Lambda Function Recovery

**Scenario**: Lambda function deleted or misconfigured

**Recovery**:
1. **Restore from Terraform**:
   ```bash
   cd terraform
   terramisu apply -e tm-prod/prod1
   ```
2. **Verify**: Check AWS console or run `npx run aws:findResources`

### DynamoDB Table Recovery

**Scenario**: Data loss or corruption

**Options**:
1. **Point-in-Time Recovery** (if enabled):
   - AWS Console → DynamoDB → Table → Backups → Restore
2. **On-Demand Backup**:
   - Restore from latest backup
3. **Stream Replay**:
   - Not directly supported; would require custom tooling

### Configuration Rollback

**Scenario**: Bad configuration deployed

**Recovery**:
1. **Git revert**:
   ```bash
   git revert HEAD
   git push
   ```
2. **Re-run pipeline**: GitLab CI will deploy previous configuration

---

## Runbooks

### Runbook: High Lambda Error Rate

**Symptom**: Lambda function error rate > 5%

**Steps**:
1. **Check CloudWatch Logs**:
   ```bash
   aws logs tail /aws/lambda/{function-name} --follow
   ```
2. **Look for error patterns**: Timeout? Out of memory? Dependency failure?
3. **Check recent deployments**: Correlation with recent code changes?
4. **Mitigate**:
   - **Timeout**: Increase `timeout_seconds`
   - **Memory**: Increase `memory_size_mb`
   - **Code error**: Rollback deployment
   - **Dependency**: Check external service status

### Runbook: Lambda Throttling

**Symptom**: Lambda throttled invocations > 0

**Root cause**: Account or function concurrency limit reached

**Steps**:
1. **Check account limits**:
   ```bash
   aws lambda get-account-settings
   ```
2. **Check function concurrency**:
   ```bash
   aws lambda get-function-concurrency --function-name {function-name}
   ```
3. **Mitigate**:
   - **Temporary**: Request limit increase from AWS Support
   - **Long-term**: Optimize function duration, add backoff/retry logic

### Runbook: DynamoDB Stream Processing Lag

**Symptom**: High `IteratorAge` metric

**Root cause**: Lambda not processing stream fast enough

**Steps**:
1. **Check Lambda metrics**: Throttling? Errors?
2. **Increase parallelization**:
   - Edit `terraform.tfvars`:
     ```hcl
     parallelization_factor = "10"
     ```
3. **Increase memory**: Faster execution = higher throughput
4. **Optimize code**: Reduce processing time per record

### Runbook: SQS Queue Depth Growing

**Symptom**: SQS queue depth increasing

**Root cause**: Lambda consumer not keeping up

**Steps**:
1. **Check Lambda consumer**: Running? Errors?
2. **Check batch size**: Too small?
   ```hcl
   batch_size = "10"  # Max for SQS
   ```
3. **Increase concurrency**:
   ```hcl
   reserved_concurrent_executions = "20"
   ```
4. **Add DLQ**: Route failed messages to dead-letter queue

### Runbook: Notification Not Sent

**Symptom**: User didn't receive notification

**Steps**:
1. **Check DynamoDB**: Is notification record created?
   ```bash
   aws dynamodb get-item \
     --table-name prd3292-prod1-us-east-1-demand-table \
     --key '{"pk":{"S":"notification#123"},"sk":{"S":"metadata"}}'
   ```
2. **Check CloudWatch Logs**: Did `notificationSend` process it?
   ```
   fields @timestamp, @message
   | filter message like /notification#123/
   ```
3. **Check SMS Service**: Was SMS sent?
   - Check SMS Service logs/metrics
4. **Check status**: Is notification in `FAILED` state?
5. **Retry**:
   - Update status to `RETRY` in DynamoDB
   - Lambda will pick it up automatically

---

## Maintenance Windows

### Scheduled Maintenance

**Recommended window**: Sunday 02:00-04:00 UTC (lowest traffic)

**Pre-maintenance checklist**:
1. Announce maintenance window to stakeholders
2. Disable CloudWatch Event rules (cron-triggered functions)
3. Pause stream processing (set `reserved_concurrent_executions = "0"`)
4. Wait for in-flight requests to complete

**Post-maintenance checklist**:
1. Re-enable CloudWatch Event rules
2. Resume stream processing (restore concurrency)
3. Monitor for errors
4. Verify end-to-end functionality

### Terraform State Maintenance

**Lock cleanup** (if state locked due to crashed job):
```bash
# Get state lock info
aws dynamodb get-item \
  --table-name terraform-state-lock \
  --key '{"LockID": {"S": "terraform-state-path"}}'

# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

---

## Performance Optimization

### Lambda Performance Tuning

**Cold start optimization**:
- Minimize dependencies
- Use Webpack tree-shaking
- Consider Lambda SnapStart (not currently enabled)

**Execution time optimization**:
- Increase memory (more CPU allocated)
- Use connection pooling for databases
- Cache frequently accessed data in global scope
- Batch operations where possible

**Cost optimization**:
- Right-size memory allocation
- Reduce log verbosity in production
- Use Graviton2 processor (arm64) if compatible

### Stream Processing Optimization

**Kinesis/DynamoDB Streams**:
- Tune `batch_size` for throughput vs. latency
- Use `parallelization_factor` to process shards concurrently
- Apply filters to reduce unnecessary invocations

**Example optimized configuration**:
```hcl
batch_size             = "5000"
parallelization_factor = "10"
stream_event_source_filter_pattern = { /* ... */ }
```

---

## Security Operations

### Credential Rotation

**Scenario**: Rotate API keys/tokens

**Steps**:
1. **Update configuration**:
   - Edit `configs/prod.config.yml`
   - Never commit secrets to Git
   - Use AWS Secrets Manager or Parameter Store
2. **Deploy configuration**:
   ```bash
   cd terraform
   terramisu apply -e tm-prod/prod1
   ```
3. **Verify**: Test functionality with new credentials

### IAM Policy Updates

**Scenario**: Grant new permissions to Lambda

**Steps**:
1. **Edit IAM policy**: `terraform/iam.tf`
2. **Test in nonprod**: Deploy to QA/Dev first
3. **Deploy to prod**: Follow normal deployment process

### VPC Security Group Changes

**Scenario**: Modify network access rules

**Steps**:
1. **Modify security group** via Terraform or AWS Console
2. **Test connectivity**: Invoke Lambda and verify external calls work
3. **Monitor**: Check for timeout errors in CloudWatch Logs

---

## Useful AWS CLI Commands

### List all Lambda functions
```bash
aws lambda list-functions \
  --query "Functions[?starts_with(FunctionName, 'prd3292')].FunctionName"
```

### Get Lambda configuration
```bash
aws lambda get-function-configuration \
  --function-name prd3292-qa1-us-east-1-ntfcn-snd
```

### Update Lambda environment variables
```bash
aws lambda update-function-configuration \
  --function-name prd3292-qa1-us-east-1-ntfcn-snd \
  --environment "Variables={LOG_LEVEL=debug}"
```

### DynamoDB: Scan table
```bash
aws dynamodb scan \
  --table-name prd3292-qa1-us-east-1-demand-table \
  --limit 10
```

### SQS: Get queue attributes
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/343550350117/prd3292-qa1-us-east-1-event-short-url \
  --attribute-names All
```

### Kinesis: Describe stream
```bash
aws kinesis describe-stream \
  --stream-name prd3292-qa1-us-east-1-logs
```

---

## Useful npm Scripts

From `runfile.js`:

```bash
# Run unit tests
npx run tests:unit <path>

# Run integration tests
npx run tests:integration

# Run E2E tests
npx run tests:e2e

# Run specific scenario
npx run tests:scenario "scenario name"

# Run tests by tag
npx run tests:tags @smoke

# Lint code
npx run eslint:lint
npx run eslint:fix

# Type check
npx run types:check

# Bundle workers
npx run workers:bundle

# List all workers
npx run workers:list

# Invoke worker locally
npx run workers:invoke <workerName> '<json-payload>'

# Find AWS resources
npx run aws:findResources

# Clear DynamoDB tables (nonprod only)
npx run aws:clearTables "tmId1,tmId2,tmId3"

# Publish suppression extension
npx run publishSuppression
```

---

## Contacts and Escalation

**Team**: VerifiedFan / Demand Capture
**Repository**: git@git.tmaws.io:demand-capture/workers.git
**Product Code**: PRD3292

**Escalation Path**:
1. Team lead or on-call engineer
2. Platform engineering team (for infrastructure issues)
3. AWS Support (for AWS service issues)

**Documentation Links**:
- Terraform: https://developer.hashicorp.com/terraform
- AWS Lambda: https://docs.aws.amazon.com/lambda
- GitLab CI: https://docs.gitlab.com/ee/ci
