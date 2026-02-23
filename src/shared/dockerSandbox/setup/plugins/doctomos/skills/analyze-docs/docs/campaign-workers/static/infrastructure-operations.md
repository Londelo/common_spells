# Operations - campaign-workers

> **Last Updated**: 2026-02-13
> **Repository**: git.tmaws.io/verifiedfan/campaign-pipeline/workers
> **Product Code**: PRD2011

## Overview

This document covers operational aspects of the campaign-workers Lambda infrastructure including monitoring, logging, alerting, and common operational procedures.

## Monitoring

### CloudWatch Metrics

#### Lambda Function Metrics

Each Lambda function automatically reports:

**Invocation Metrics**:
- `Invocations` - Number of times function is invoked
- `Errors` - Number of invocations that result in errors
- `Duration` - Execution time in milliseconds
- `Throttles` - Number of throttled invocations
- `ConcurrentExecutions` - Number of concurrent executions
- `UnreservedConcurrentExecutions` - Concurrent executions not reserved

**Resource Metrics**:
- `MemoryUtilization` - Memory used as percentage of allocated
- `EphemeralStorageUsed` - Temporary storage used

**Async Metrics** (if applicable):
- `DeadLetterErrors` - Messages sent to DLQ
- `DestinationDeliveryFailures` - Failed async invocations

#### Stream Processing Metrics

For Kinesis consumer workers (e.g., saveCampaignData):

- `IteratorAge` - Age of the last record processed
- `BatchSize` - Number of records per batch
- `ProcessingLatency` - Time to process batches

#### SQS Consumer Metrics

For SQS consumer workers (e.g., moveMergedAvroFiles):

- `ApproximateAgeOfOldestMessage` - Queue backlog age
- `ApproximateNumberOfMessagesVisible` - Messages in queue
- `NumberOfMessagesReceived` - Messages received
- `NumberOfMessagesDeleted` - Messages successfully processed

### Accessing CloudWatch Metrics

**Via AWS Console**:
1. Navigate to CloudWatch > Metrics
2. Select namespace: `AWS/Lambda`
3. Filter by function name (e.g., `prd2011-dev1-us-east-1-cmp-save-data`)

**Via AWS CLI**:
```bash
# Get function invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=prd2011-prod1-us-east-1-cmp-save-data \
  --start-time 2026-02-13T00:00:00Z \
  --end-time 2026-02-13T23:59:59Z \
  --period 3600 \
  --statistics Sum

# Check error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=prd2011-prod1-us-east-1-cmp-save-data \
  --start-time 2026-02-13T00:00:00Z \
  --end-time 2026-02-13T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## Logging

### Log Groups

Each Lambda function writes logs to CloudWatch Logs:

**Log Group Pattern**: `/aws/lambda/{function-name}`

**Examples**:
- `/aws/lambda/prd2011-dev1-us-east-1-cmp-save-data`
- `/aws/lambda/prd2011-prod1-us-east-1-cmp-save-data`

**Retention**: 7 days (configured via Terraform)

### Log Streaming

Logs are automatically streamed to a Kinesis stream for centralized aggregation:

**Configuration**:
- Subscription filter on each log group
- Destination: Kinesis log stream (managed by `log_stream_arn` module)
- Filter pattern: Empty (all logs)
- Distribution: Random

**Purpose**: Centralized logging for:
- Long-term retention
- Log aggregation across services
- Integration with SIEM/monitoring tools

### Log Format

The workers use `@verifiedfan/cloudwatch-stdout` for structured logging:

**Log Structure**:
```json
{
  "timestamp": "2026-02-13T10:30:45.123Z",
  "level": "INFO|WARN|ERROR",
  "message": "Log message",
  "context": {
    "requestId": "abc-123",
    "eventType": "codeAssignment",
    "batchSize": 1000
  }
}
```

### Viewing Logs

#### CloudWatch Logs Insights

**Access logs**:
1. Navigate to CloudWatch > Logs > Insights
2. Select log group(s)
3. Run queries

**Common Queries**:

```sql
# Find errors in last hour
fields @timestamp, @message
| filter level = "ERROR"
| sort @timestamp desc
| limit 100

# Count invocations by event type
fields data.type as eventType
| stats count() by eventType

# Find slow executions
fields @duration, @message
| filter @duration > 5000
| sort @duration desc

# Search for specific request
fields @timestamp, @message
| filter requestId = "abc-123"
| sort @timestamp asc
```

#### AWS CLI

```bash
# Tail logs
aws logs tail /aws/lambda/prd2011-prod1-us-east-1-cmp-save-data --follow

# Get recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/prd2011-prod1-us-east-1-cmp-save-data \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Download logs
aws logs get-log-events \
  --log-group-name /aws/lambda/prd2011-prod1-us-east-1-cmp-save-data \
  --log-stream-name '2026/02/13/[$LATEST]abc123...' \
  --start-from-head
```

## Alerting

### CloudWatch Alarms

While not defined in the repository Terraform (likely managed elsewhere), recommended alarms:

#### Critical Alarms

**Lambda Errors**:
- Metric: `Errors`
- Threshold: > 10 in 5 minutes
- Action: Page on-call

**Lambda Throttles**:
- Metric: `Throttles`
- Threshold: > 0 in 5 minutes
- Action: Page on-call

**Kinesis Iterator Age**:
- Metric: `IteratorAge`
- Threshold: > 60000 ms (1 minute behind)
- Action: Alert team

**SQS Queue Depth**:
- Metric: `ApproximateNumberOfMessagesVisible`
- Threshold: > 1000
- Action: Alert team

#### Warning Alarms

**Lambda Duration**:
- Metric: `Duration`
- Threshold: > 50000 ms (close to 60s timeout)
- Action: Notify team

**Memory Utilization**:
- Metric: Memory used
- Threshold: > 90% of 2048MB
- Action: Notify team

### Creating Alarms

```bash
# Example: Error alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "prd2011-prod1-cmp-save-data-errors" \
  --alarm-description "Errors in saveCampaignData" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=prd2011-prod1-us-east-1-cmp-save-data
```

## Common Operational Tasks

### Manually Invoke a Worker

#### Via AWS Console

1. Navigate to Lambda > Functions
2. Select function
3. Click "Test" tab
4. Create test event
5. Click "Test"

#### Via AWS CLI

```bash
# Synchronous invoke
aws lambda invoke \
  --function-name prd2011-dev1-us-east-1-cmp-prcss-scheduled \
  --payload '{"test": true}' \
  --region us-east-1 \
  response.json

# Check response
cat response.json
```

### Check Worker Configuration

```bash
# Get function configuration
aws lambda get-function-configuration \
  --function-name prd2011-prod1-us-east-1-cmp-save-data

# Get environment variables
aws lambda get-function-configuration \
  --function-name prd2011-prod1-us-east-1-cmp-save-data \
  --query 'Environment.Variables'
```

### Update Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name prd2011-dev1-us-east-1-cmp-save-data \
  --environment Variables='{
    "ENVIRONMENT":"dev1",
    "NODE_ENV":"dev",
    "TARGET_ENV":"dev",
    "APP_NAME":"saveCampaignData",
    "DEBUG":"true"
  }'
```

### Refresh Athena Tables

For workers that use Athena (e.g., mergeAvroFiles):

**Via GitLab CI**:
1. Navigate to CI/CD > Pipelines
2. Run pipeline
3. Manually trigger `{env} athena tables` job

**Via CLI**:
```bash
NODE_ENV=prod npx run aws:athena:refreshTables
```

### Merge Avro Files

**Via GitLab CI**:
1. Navigate to CI/CD > Pipelines
2. Run pipeline
3. Manually trigger `{env} merge avro` job

**Via CLI**:
```bash
NODE_ENV=prod npx run aws:s3:mergeAvro
```

### Check Kinesis Stream Status

```bash
# Describe stream
aws kinesis describe-stream \
  --stream-name vf1-input-stream

# Get shard iterators
aws kinesis get-shard-iterator \
  --stream-name vf1-input-stream \
  --shard-id shardId-000000000000 \
  --shard-iterator-type LATEST

# Get records
aws kinesis get-records \
  --shard-iterator <iterator-from-previous-command>
```

### Monitor SQS Queue

```bash
# Get queue attributes
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/343550350117/prd2011-prod1-us-east-1-cmp-mv-mrgd-sqs \
  --attribute-names All

# Purge queue (dev/qa only!)
aws sqs purge-queue \
  --queue-url https://sqs.us-east-1.amazonaws.com/343550350117/prd2011-dev1-us-east-1-cmp-mv-mrgd-sqs
```

### Check S3 Bucket

```bash
# List objects in campaign-data bucket
aws s3 ls s3://prd2011.prod1.us-east-1.campaign-data.tmaws/ --recursive

# List scoring files
aws s3 ls s3://prd2011.prod1.us-east-1.vf-scoring.tmaws/waves/

# Download a file
aws s3 cp s3://prd2011.prod1.us-east-1.vf-scoring.tmaws/waves/config.yaml ./
```

## Debugging

### Investigation Workflow

1. **Check CloudWatch Metrics**:
   - Are there errors?
   - Are there throttles?
   - What's the invocation rate?

2. **Review CloudWatch Logs**:
   - Find error messages
   - Check request IDs
   - Look for exceptions

3. **Check Event Source**:
   - Kinesis: Check iterator age, shard health
   - SQS: Check queue depth, DLQ messages
   - EventBridge: Check rule status, invocation count

4. **Verify IAM Permissions**:
   - Can Lambda access S3?
   - Can Lambda read from Kinesis/SQS?
   - Are there new resources that need permissions?

5. **Check VPC Configuration**:
   - Are security groups correct?
   - Can Lambda reach external APIs?
   - Is NAT gateway healthy?

### Common Issues

#### Issue: Lambda Timing Out

**Symptoms**: Duration close to 60000ms, incomplete processing

**Resolution**:
1. Check CloudWatch Logs for slow operations
2. Consider increasing timeout (max 900s for Lambda)
3. Optimize batch size
4. Add pagination for large datasets

```bash
# Increase timeout
aws lambda update-function-configuration \
  --function-name prd2011-prod1-us-east-1-cmp-save-data \
  --timeout 120
```

#### Issue: Out of Memory

**Symptoms**: Lambda crashes, memory exceeded errors

**Resolution**:
1. Check memory usage in CloudWatch metrics
2. Increase memory allocation (current: 2048MB, max: 10240MB)
3. Optimize batch processing
4. Stream large files instead of loading into memory

```bash
# Increase memory
aws lambda update-function-configuration \
  --function-name prd2011-prod1-us-east-1-cmp-save-data \
  --memory-size 3008
```

#### Issue: Kinesis Iterator Age Increasing

**Symptoms**: `IteratorAge` metric increasing, processing falling behind

**Causes**:
- Increased event volume
- Slow processing per record
- Errors causing retries

**Resolution**:
1. Check for errors in logs
2. Increase batch size (current: 1000, max: 10000)
3. Increase Lambda concurrency
4. Add more shards to Kinesis stream

```bash
# Update event source mapping batch size
aws lambda update-event-source-mapping \
  --uuid <event-source-mapping-uuid> \
  --batch-size 2000
```

#### Issue: SQS Messages Not Being Processed

**Symptoms**: Queue depth increasing, no Lambda invocations

**Causes**:
- Event source mapping disabled
- Lambda errors causing message visibility timeout
- IAM permission issues

**Resolution**:
1. Check event source mapping is enabled
2. Check Lambda errors in CloudWatch
3. Check DLQ for failed messages
4. Verify IAM permissions

```bash
# Check event source mapping
aws lambda list-event-source-mappings \
  --function-name prd2011-prod1-us-east-1-cmp-mv-mrgd

# Enable event source mapping
aws lambda update-event-source-mapping \
  --uuid <uuid> \
  --enabled
```

#### Issue: IAM Permission Denied

**Symptoms**: AccessDenied errors in logs

**Resolution**:
1. Check IAM role attached to Lambda
2. Verify policy allows required actions
3. Check resource ARN patterns
4. Update Terraform if new permissions needed

```bash
# Get Lambda IAM role
aws lambda get-function-configuration \
  --function-name prd2011-prod1-us-east-1-cmp-save-data \
  --query 'Role'

# Get role policies
aws iam list-attached-role-policies \
  --role-name prd2011.prod1.us-east-1.cmp-save-data.tmaws

# Get inline policies
aws iam list-role-policies \
  --role-name prd2011.prod1.us-east-1.cmp-save-data.tmaws
```

#### Issue: VPC Connectivity

**Symptoms**: Timeouts connecting to external APIs or RDS

**Resolution**:
1. Check security group allows outbound traffic
2. Verify NAT gateway is healthy
3. Check VPC endpoints for AWS services
4. Test connectivity from within VPC

```bash
# Get Lambda VPC config
aws lambda get-function-configuration \
  --function-name prd2011-prod1-us-east-1-cmp-save-data \
  --query 'VpcConfig'
```

### Enable Debug Logging

```bash
# Add DEBUG environment variable
aws lambda update-function-configuration \
  --function-name prd2011-dev1-us-east-1-cmp-save-data \
  --environment Variables='{
    "ENVIRONMENT":"dev1",
    "NODE_ENV":"dev",
    "TARGET_ENV":"dev",
    "APP_NAME":"saveCampaignData",
    "DEBUG":"*"
  }'
```

## Incident Response

### Severity Levels

**SEV1 - Critical**:
- Production Lambda failing all invocations
- Data loss or corruption
- Kinesis stream processing stopped

**SEV2 - High**:
- Degraded performance in production
- Non-critical Lambda errors
- Increased latency

**SEV3 - Medium**:
- Issues in preprod/dev
- Warnings or alerts
- Non-urgent bugs

### SEV1 Response Procedure

1. **Acknowledge Incident**: Post in team channel
2. **Assess Impact**: Check metrics and logs
3. **Immediate Mitigation**:
   - Disable problematic Lambda if necessary
   - Redirect traffic if possible
   - Scale up resources
4. **Identify Root Cause**: Review recent changes
5. **Implement Fix**:
   - Hotfix deployment
   - Configuration change
   - Rollback
6. **Verify Resolution**: Check metrics return to normal
7. **Post-Mortem**: Document incident and prevention

### Emergency Contacts

**Escalation Path**:
1. On-call engineer (PagerDuty/alerts)
2. Team lead
3. Engineering manager
4. DevOps team (for infrastructure issues)

### Rollback Procedure

See [infrastructure-deployment.md](./infrastructure-deployment.md#rollback-procedures) for detailed rollback instructions.

## Maintenance

### Scheduled Maintenance

**Lambda Runtime Updates**:
- Current: Node.js 16.x
- Monitor AWS deprecation notices
- Plan upgrades during low-traffic windows

**Dependency Updates**:
- Review security advisories weekly
- Update packages via Renovate/Dependabot
- Test in dev before production

### Log Retention

- CloudWatch: 7 days
- Kinesis log stream: Dependent on stream retention
- Archive old logs to S3 if needed

### Cost Optimization

**Review Monthly**:
- Lambda invocation count
- Lambda duration (optimize if consistently low)
- Kinesis shard count
- CloudWatch Logs storage

**Optimization Opportunities**:
- Reduce log retention if not needed
- Optimize cold starts
- Batch processing improvements
- Reserved capacity if predictable load

## Performance Tuning

### Lambda Performance

**Current Configuration**:
- Memory: 2048 MB
- Timeout: 60 seconds
- Ephemeral storage: 512 MB

**Tuning Guidelines**:
1. Monitor memory usage via CloudWatch
2. If using <50%, reduce memory
3. If using >90%, increase memory
4. Memory affects CPU allocation (more memory = more CPU)

### Batch Size Tuning

**Kinesis**:
- Current: 1000 records
- Max: 10,000 records
- Consider increasing if processing falls behind
- Consider decreasing if Lambda times out

**SQS**:
- Current: 1000 messages
- Max: 10 messages (SQS limit)
- Balance between throughput and error handling

### Concurrency

**Current**: Unlimited (reserved_concurrent_executions = -1)

**Considerations**:
- Set reserved concurrency to prevent runaway costs
- Set reserved concurrency to guarantee capacity
- Monitor throttles if limiting concurrency

## Runbooks

### Worker-Specific Runbooks

#### saveCampaignData

**Purpose**: Consumes campaign events from Kinesis input stream

**Common Issues**:
- Iterator age increasing: Check for errors, increase batch size
- Missing event types: Verify stream filter patterns
- DynamoDB throttling: Check table capacity

**Resolution**:
```bash
# Check iterator age
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name IteratorAge \
  --dimensions Name=FunctionName,Value=prd2011-prod1-us-east-1-cmp-save-data \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --period 300 \
  --statistics Maximum
```

#### mergeAvroFiles

**Purpose**: Scheduled merger of Avro files on S3

**Schedule**:
- Daily: 10:00 AM UTC
- Monthly: 9:00 AM UTC on 2nd of month

**Common Issues**:
- Athena query failures: Check query syntax, table definitions
- S3 access denied: Verify IAM permissions
- SQS production failures: Check queue exists

**Manual Trigger**:
```bash
aws lambda invoke \
  --function-name prd2011-prod1-us-east-1-cmp-mrg-avro \
  --payload '{"type": "daily"}' \
  response.json
```

#### moveMergedAvroFiles

**Purpose**: Moves merged Avro files from SQS trigger

**Common Issues**:
- Queue backlog: Check for errors in Lambda
- File not found: Verify SQS message contains correct S3 key
- S3 copy failures: Check source/destination buckets

**Resolution**:
```bash
# Check SQS queue depth
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/.../prd2011-prod1-us-east-1-cmp-mv-mrgd-sqs \
  --attribute-names ApproximateNumberOfMessagesVisible
```

## Useful Commands Reference

### Lambda Management

```bash
# List all campaign workers
aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `prd2011-prod1`)].FunctionName'

# Get function details
aws lambda get-function --function-name <function-name>

# Update function code
aws lambda update-function-code \
  --function-name <function-name> \
  --zip-file fileb://lambda.zip

# Invoke function
aws lambda invoke \
  --function-name <function-name> \
  --payload '{}' \
  output.json
```

### CloudWatch

```bash
# Tail logs
aws logs tail /aws/lambda/<function-name> --follow

# Create log group
aws logs create-log-group --log-group-name /aws/lambda/<function-name>

# Set retention
aws logs put-retention-policy \
  --log-group-name /aws/lambda/<function-name> \
  --retention-in-days 7
```

### Kinesis

```bash
# List streams
aws kinesis list-streams

# Describe stream
aws kinesis describe-stream --stream-name vf1-input-stream

# Put test record
aws kinesis put-record \
  --stream-name vf1-input-stream \
  --partition-key test \
  --data '{"type":"test"}'
```

### SQS

```bash
# Get queue URL
aws sqs get-queue-url --queue-name prd2011-prod1-us-east-1-cmp-mv-mrgd-sqs

# Send message
aws sqs send-message \
  --queue-url <url> \
  --message-body '{"test": true}'

# Receive messages
aws sqs receive-message --queue-url <url>

# Purge queue
aws sqs purge-queue --queue-url <url>
```

### S3

```bash
# List buckets
aws s3 ls | grep prd2011

# Sync from S3
aws s3 sync s3://prd2011.prod1.us-east-1.campaign-data.tmaws/ ./local/

# Copy file
aws s3 cp ./file.json s3://prd2011.prod1.us-east-1.vf-scoring.tmaws/
```
