# Operations - ccpa-workers

## Overview

This document covers monitoring, logging, alerting, and operational procedures for the CCPA Workers infrastructure.

## Monitoring

### CloudWatch Dashboards

Lambda functions are monitored via CloudWatch with standard Lambda metrics:

#### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| Invocations | Number of times function is invoked | N/A |
| Duration | Execution time per invocation | Approaching timeout (300s) |
| Errors | Number of invocations that result in errors | > 0 |
| Throttles | Number of throttled invocations | > 0 |
| ConcurrentExecutions | Number of concurrent executions | Approaching limit |
| DeadLetterErrors | Failed attempts to send to DLQ | > 0 |

#### SQS Queue Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| ApproximateNumberOfMessagesVisible | Messages available for retrieval | Growing continuously |
| ApproximateAgeOfOldestMessage | Age of oldest message in queue | > 5 minutes |
| NumberOfMessagesSent | Rate of messages sent to queue | N/A |
| NumberOfMessagesDeleted | Rate of messages successfully processed | N/A |
| ApproximateNumberOfMessagesNotVisible | Messages in flight | N/A |

#### Dead Letter Queue (DLQ) Monitoring

**Critical**: Messages in DLQ indicate processing failures after 3 retry attempts.

- **Alert on**: Any messages in DLQ (`ApproximateNumberOfMessagesVisible > 0`)
- **Action**: Investigate Lambda errors and message content

### AWS Resource Discovery

Automated resource verification runs after each deployment:

```bash
npx run aws:findResources
```

**Purpose**: Validates that deployed resources match expected configuration.

## Logging

### CloudWatch Logs

#### Log Groups

Each Lambda function writes to its own CloudWatch Log Group:
- **Pattern**: `/aws/lambda/{function-name}`
- **Retention**: 7 days
- **Format**: Standard Lambda JSON log format

**Examples**:
- `/aws/lambda/prd2011-dev1-us-east-1-ccpa-keep-prvt`
- `/aws/lambda/prd2011-prod1-us-east-1-ccpa-delete-fan`

#### Centralized Logging

Logs are streamed to a centralized Kinesis data stream:
- **Stream Pattern**: `{product_code}-{env}-{region}-logs`
- **Filter Pattern**: "" (all logs)
- **Distribution**: Random

**Benefits**:
- Long-term log retention
- Cross-function log analysis
- Integration with log aggregation tools

#### Log Format

Lambda functions use structured logging via `@verifiedfan/log` package:
- JSON-formatted log entries
- Consistent timestamp format
- Request ID tracking
- Severity levels: ERROR, WARN, INFO, DEBUG

### Accessing Logs

#### Via AWS Console
1. Navigate to CloudWatch → Log Groups
2. Search for `/aws/lambda/prd2011-{env}-{function-name}`
3. Select log stream to view

#### Via AWS CLI
```bash
# View recent logs
aws logs tail /aws/lambda/prd2011-prod1-us-east-1-ccpa-keep-prvt --follow

# Search logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/prd2011-prod1-us-east-1-ccpa-keep-prvt \
  --filter-pattern "ERROR"
```

#### Via CloudWatch Insights

Query across multiple functions:
```sql
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

## Alerting

### Current Alerting

**Certificate Expiration Monitoring**:
- **Branch**: `alert-cert-expiry`
- **Schedule**: Daily (GitLab schedule)
- **Script**: `tools/certs/alertCertExpiration.js`
- **Alert Threshold**: < 30 days until expiration
- **Notification**: Slack message
- **Location**: Privacy Core certificates in `/shared/services/privacyCore/certs`

### Recommended Alerting

#### Lambda Function Errors
- **Metric**: `Errors`
- **Condition**: Count > 5 in 5 minutes
- **Severity**: High
- **Action**: Investigate logs, check for code errors

#### Lambda Function Throttling
- **Metric**: `Throttles`
- **Condition**: Count > 0 in 1 minute
- **Severity**: High
- **Action**: Review concurrent execution limits, consider increasing reserved capacity

#### SQS Queue Backlog
- **Metric**: `ApproximateAgeOfOldestMessage`
- **Condition**: Age > 300 seconds (5 minutes)
- **Severity**: Medium
- **Action**: Check Lambda processing capacity, investigate errors

#### Dead Letter Queue Messages
- **Metric**: `ApproximateNumberOfMessagesVisible` (DLQ)
- **Condition**: Count > 0
- **Severity**: High
- **Action**: Investigate failed messages, fix root cause, replay messages

#### Lambda Duration Approaching Timeout
- **Metric**: `Duration`
- **Condition**: Average > 270 seconds (90% of 300s timeout)
- **Severity**: Medium
- **Action**: Optimize function or increase timeout

## Runbooks

### Common Issues

#### 1. Lambda Function Timing Out

**Symptoms**:
- Function execution time approaching or exceeding 300 seconds
- Incomplete processing
- SQS messages returning to queue after visibility timeout

**Resolution**:
1. Check CloudWatch logs for slow operations
2. Identify bottleneck (database queries, external API calls, large data processing)
3. Options:
   - Optimize slow code paths
   - Increase `timeout_seconds` in Terraform variables
   - Break processing into smaller chunks
   - Increase memory (more memory = more CPU)

#### 2. Messages Stuck in DLQ

**Symptoms**:
- `ApproximateNumberOfMessagesVisible > 0` in DLQ
- Processing failures after 3 retries

**Resolution**:
1. Check Lambda function logs for error messages
2. Retrieve sample message from DLQ:
   ```bash
   aws sqs receive-message \
     --queue-url https://sqs.us-east-1.amazonaws.com/{account}/{queue-name}-dlq
   ```
3. Identify root cause of failure
4. Fix code/configuration issue
5. Deploy fix
6. Replay messages from DLQ:
   - Create script to read from DLQ and send to main queue
   - Or manually delete messages if not recoverable

#### 3. High Lambda Error Rate

**Symptoms**:
- Increased `Errors` metric
- Failed invocations in CloudWatch Logs

**Resolution**:
1. Access CloudWatch Logs for affected function
2. Filter for ERROR level messages
3. Common causes:
   - **Uncaught exceptions**: Add try-catch blocks
   - **Invalid input data**: Add input validation
   - **External service failures**: Add retry logic, circuit breakers
   - **Timeout**: See "Lambda Function Timing Out" above
4. Fix code and deploy
5. Monitor error rate after deployment

#### 4. SQS Queue Growing (Backlog)

**Symptoms**:
- `ApproximateNumberOfMessagesVisible` growing
- `ApproximateAgeOfOldestMessage` increasing
- Processing slower than message arrival rate

**Resolution**:
1. Check Lambda concurrent executions:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name ConcurrentExecutions \
     --dimensions Name=FunctionName,Value={function-name} \
     --start-time {start} --end-time {end} --period 300 \
     --statistics Maximum
   ```
2. Options:
   - Increase `reserved_concurrent_executions` in Terraform
   - Increase `batch_size` for event source mapping (process more messages per invocation)
   - Optimize Lambda function performance
   - Scale horizontally (multiple functions/queues)

#### 5. Certificate Expiration Alert

**Symptoms**:
- Slack alert indicating certificate expiring in < 30 days
- Privacy Core SSL/TLS certificates near expiration

**Resolution**:
1. Generate new certificates:
   ```bash
   npx run generateCerts
   ```
2. Enter TechOps credentials when prompted
3. New certificates saved to `/shared/services/privacyCore/certs`
4. Commit and push changes
5. Merge to main branch
6. Rebase `alert-cert-expiry` branch with main to update alerting

#### 6. Failed Deployment

**Symptoms**:
- GitLab pipeline fails during deployment stage
- Terraform apply errors

**Resolution**:
1. Check GitLab pipeline logs for error details
2. Common causes:
   - **Terraform state lock**: Wait for other operations to complete, or manually unlock
   - **IAM permission issues**: Verify runner role has necessary permissions
   - **Resource conflicts**: Check for existing resources with same name
   - **Invalid configuration**: Review Terraform variable files
3. Fix issue and re-run pipeline
4. If unable to fix, rollback to previous working commit

## Debugging

### Debugging in Development

#### Local Testing
1. Set environment variables:
   ```bash
   export ENVIRONMENT=dev1
   export CONFIG_ENV=dev
   export APP_NAME=keepPrivate
   ```
2. Run function locally with test event
3. Use debugger or logging to trace execution

#### Integration Tests
```bash
# Run with specific config
CONFIG_ENV=dev npx run tests:integration
```

### Debugging in Production

#### View Live Logs
```bash
# Follow logs in real-time
aws logs tail /aws/lambda/prd2011-prod1-us-east-1-{app-name} --follow

# Filter for errors
aws logs tail /aws/lambda/prd2011-prod1-us-east-1-{app-name} \
  --follow --filter-pattern "ERROR"
```

#### Inspect SQS Messages

View messages without removing from queue:
```bash
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/{account}/{queue-name} \
  --max-number-of-messages 10 \
  --visibility-timeout 0
```

#### Lambda Invocation Testing

Invoke Lambda directly with test payload:
```bash
aws lambda invoke \
  --function-name prd2011-prod1-us-east-1-{app-name} \
  --payload '{"test": "data"}' \
  response.json
```

#### Review Recent Deployments
```bash
# Check Lambda function's last modified time
aws lambda get-function --function-name {function-name}

# View recent GitLab pipelines
# Navigate to: https://git.tmaws.io/verifiedfan/ccpa/workers/-/pipelines
```

## Operational Tasks

### Viewing Deployed Resources

#### List All Lambda Functions
```bash
aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `prd2011`)].[FunctionName,Runtime,LastModified]' \
  --output table
```

#### List SQS Queues
```bash
aws sqs list-queues \
  --queue-name-prefix prd2011
```

#### Check Lambda Configuration
```bash
aws lambda get-function-configuration \
  --function-name {function-name}
```

### Scaling Operations

#### Increase Reserved Concurrency
Update `terraform.tfvars`:
```hcl
reserved_concurrent_executions = "50"
```
Deploy via GitLab pipeline or manually:
```bash
cd terraform
terramisu apply -e tm-nonprod/dev1
```

#### Adjust Timeout
Update `terraform.tfvars`:
```hcl
timeout_seconds = "600"  # 10 minutes
```
Redeploy.

#### Increase Memory
Update `terraform.tfvars`:
```hcl
memory_size_mb = "3008"  # Must be multiple of 64
```
Redeploy.

### Emergency Procedures

#### Stop All Processing (Emergency)
Disable event source mappings:
```bash
# List event source mappings
aws lambda list-event-source-mappings \
  --function-name {function-name}

# Disable event source
aws lambda update-event-source-mapping \
  --uuid {mapping-uuid} \
  --no-enabled
```

#### Re-enable Processing
```bash
aws lambda update-event-source-mapping \
  --uuid {mapping-uuid} \
  --enabled
```

## Maintenance Windows

### Certificate Rotation
- **Frequency**: As needed (monitor via alert)
- **Impact**: Minimal (certificates updated during deployment)
- **Procedure**: See "Certificate Expiration Alert" runbook

### Dependency Updates
- **Frequency**: Regular (check for security updates)
- **Impact**: Varies (test in dev/qa first)
- **Procedure**: Update `package.json`, test, deploy

### Infrastructure Updates
- **Frequency**: As needed
- **Impact**: Varies by change
- **Procedure**: Update Terraform configs, deploy through standard pipeline

## Support Contacts

- **Repository**: https://git.tmaws.io/verifiedfan/ccpa/workers
- **Documentation**: http://verifiedfan.git.tmaws.io/docs/architecture/ccpa/overview/
- **Team**: VerifiedFan
