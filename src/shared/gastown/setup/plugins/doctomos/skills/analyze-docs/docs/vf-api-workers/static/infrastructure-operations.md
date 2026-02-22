# Operations - vf-api-workers

## Overview

This document covers monitoring, logging, alerting, and operational procedures for the vf-api-workers Lambda functions.

## Monitoring

### CloudWatch Dashboards

**Recommended Dashboards** (to be created):
- **Lambda Performance**: Invocations, duration, errors, throttles for all 8 functions
- **Stream Processing**: Kinesis stream metrics (GetRecords, PutRecords, IteratorAge)
- **Queue Health**: SQS queue depth, message age, dead letter queue metrics
- **DynamoDB Metrics**: Read/write capacity, throttles, latency for demandTable

### CloudWatch Metrics

#### Lambda Function Metrics

**AWS/Lambda Namespace**:
- `Invocations` - Total number of times each function is invoked
- `Duration` - Execution time per invocation
- `Errors` - Number of invocations that resulted in errors
- `Throttles` - Number of throttled invocations
- `ConcurrentExecutions` - Number of concurrent executions
- `DeadLetterErrors` - Messages sent to DLQ (if configured)
- `IteratorAge` - For stream-triggered functions, age of last processed record

**Critical Thresholds**:
- `Errors` > 5% of invocations: Investigate function logic
- `Duration` near timeout: Consider increasing timeout or optimizing code
- `Throttles` > 0: Check concurrency limits and quotas
- `IteratorAge` > 1 hour: Stream processing is falling behind

#### Kinesis Stream Metrics

**AWS/Kinesis Namespace**:
- `IncomingRecords` - Records put to stream
- `IncomingBytes` - Bytes put to stream
- `GetRecords.Success` - Successful GetRecords operations
- `GetRecords.IteratorAge` - Age of the last record retrieved (lag indicator)
- `PutRecord.Success` - Successful PutRecord operations
- `WriteProvisionedThroughputExceeded` - Throttled writes

**Critical Thresholds**:
- `GetRecords.IteratorAge` > 1 hour: Consumers falling behind
- `WriteProvisionedThroughputExceeded` > 0: Need more shards

#### SQS Queue Metrics

**AWS/SQS Namespace**:
- `NumberOfMessagesSent` - Messages added to queue
- `NumberOfMessagesReceived` - Messages delivered from queue
- `ApproximateAgeOfOldestMessage` - Age of oldest message
- `ApproximateNumberOfMessagesVisible` - Messages in queue

**Critical Thresholds**:
- `ApproximateAgeOfOldestMessage` > 15 minutes: Consumer not processing fast enough
- `ApproximateNumberOfMessagesVisible` continuously growing: Consumer failure

#### DynamoDB Metrics

**AWS/DynamoDB Namespace**:
- `ConsumedReadCapacityUnits` - Read capacity consumed
- `ConsumedWriteCapacityUnits` - Write capacity consumed
- `UserErrors` - HTTP 400 errors
- `SystemErrors` - HTTP 500 errors
- `ThrottledRequests` - Throttled requests

**Critical Thresholds**:
- `ThrottledRequests` > 0: Increase capacity or implement exponential backoff
- `SystemErrors` > 0: AWS service issue, check Service Health Dashboard

### Custom Metrics

Functions emit custom CloudWatch metrics for:
- **Record counts**: Input, output, failed, invalid records per function
- **Processing status**: Success/failure counts per operation
- **Business metrics**: Verified counts, verdict counts per campaign

**Metric Namespaces** (likely):
- `VerifiedFan/Workers`
- `VerifiedFan/Scoring`

### Application Performance Monitoring

**OpenTelemetry Integration**:
- Functions use `@opentelemetry/api` for tracing
- Distributed tracing likely configured to send to X-Ray or external APM
- Trace context propagated across Kinesis, SQS, and service calls

## Logging

### Log Structure

**Log Destination**: CloudWatch Logs
**Log Groups**: `/aws/lambda/${function_name}`
**Retention**: 7 days (configurable via `log_retention_days` variable)

**Log Format**:
- Structured JSON logs (via `@verifiedfan/log` library)
- CloudWatch stdout integration (via `@verifiedfan/cloudwatch-stdout`)

**Log Levels**:
- ERROR: Function errors, external service failures
- WARN: Validation failures, retryable errors
- INFO: Processing counts, successful operations
- DEBUG: Detailed processing information (not in production)

### Log Streaming

When `use_log_stream=true` (default):
- Logs are subscribed to Kinesis log stream
- Centralized log aggregation
- Distribution: Random across stream shards
- Filter: All logs (empty filter pattern)

### Key Log Messages

**loadScoresToDynamoDB**:
- Input record count from Kinesis
- DynamoDB write results (created, updated, unchanged, failed)
- Validation errors for invalid records

**loadScoresToStream**:
- S3 file processing start/end
- Filtering results (rank-based filtering)
- Stream put results
- SQS message sent to verdictReporter

**processSavedScores**:
- DynamoDB stream record count
- Meta record filtering
- Count aggregation by campaignId
- Meta:counts update results

**verdictReporter**:
- SQS message received
- Campaign counts lookup
- Slack comparison results
- Slack post success/skip

**saveFanlistScores**:
- S3 file read start/end
- CSV parsing results (valid, invalid, duplicate)
- DynamoDB batch write results
- Kinesis put results
- SQS message sent

**saveEntryScoring**:
- Kinesis batch received
- Rank0 filtering results
- Entry service API call results

**proxyCampaignService**:
- API request received (eventId)
- Campaign service proxy call
- Campaign results returned

### Searching Logs

**CloudWatch Insights Queries**:

Find errors:
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
```

Track processing counts:
```
fields @timestamp, count.in, count.out, count.failed
| filter @message like /count/
| sort @timestamp desc
```

Monitor specific campaign:
```
fields @timestamp, @message
| filter campaignId = "12345"
| sort @timestamp desc
```

## Alerting

### Recommended CloudWatch Alarms

#### Lambda Function Health

**High Error Rate**:
- Metric: `Errors`
- Threshold: > 5% of invocations in 5 minutes
- Action: Page on-call engineer
- Recovery: Errors < 1% for 10 minutes

**Lambda Throttling**:
- Metric: `Throttles`
- Threshold: > 10 throttles in 5 minutes
- Action: Alert team channel
- Recovery: Throttles = 0 for 10 minutes

**Long Duration**:
- Metric: `Duration`
- Threshold: > 80% of timeout (per function)
- Action: Alert team channel
- Recovery: Duration < 70% of timeout

**No Invocations** (for critical functions):
- Metric: `Invocations`
- Threshold: = 0 for 1 hour
- Action: Alert team channel (may indicate upstream failure)

#### Stream Processing Health

**Consumer Lag (IteratorAge)**:
- Metric: `IteratorAge`
- Threshold: > 1 hour
- Action: Page on-call engineer
- Priority: High (data processing delay)

**Stream Write Throttling**:
- Metric: `WriteProvisionedThroughputExceeded`
- Threshold: > 0 for 5 minutes
- Action: Alert team channel, consider adding shards

#### Queue Health

**Queue Age High**:
- Metric: `ApproximateAgeOfOldestMessage`
- Threshold: > 15 minutes
- Action: Alert team channel
- Check: verdictReporter consumer health

**Queue Depth Growing**:
- Metric: `ApproximateNumberOfMessagesVisible`
- Threshold: > 100 and increasing
- Action: Alert team channel
- Check: Consumer processing capacity

#### DynamoDB Health

**Throttled Requests**:
- Metric: `ThrottledRequests`
- Threshold: > 10 in 5 minutes
- Action: Alert team channel
- Recovery: Throttles = 0 for 10 minutes

### Alerting Channels

**PagerDuty** (High Priority):
- Lambda errors > 5%
- Stream lag > 1 hour
- All functions failing

**Slack** (Medium Priority):
- Lambda throttling
- Queue depth issues
- DynamoDB throttling
- Long durations

**Email** (Low Priority):
- Weekly summary reports
- Capacity planning alerts

## Runbooks

### Common Issues

#### Issue: Lambda Function Errors Spike

**Symptoms**:
- CloudWatch alarm: High error rate
- Slack notification from verdictReporter failing
- Integration tests failing

**Diagnosis**:
1. Check CloudWatch Logs for error messages
2. Review recent deployments (last 24 hours)
3. Check external service status (Entry Service, Campaign Service, Slack)
4. Review input data quality (S3 files, Kinesis records)

**Resolution**:
1. If deployment issue: Rollback to previous version
2. If external service issue: Wait for service recovery, check retry logic
3. If data issue: Identify source, fix data pipeline
4. If code bug: Hotfix and deploy

**Prevention**:
- Improve input validation
- Add circuit breakers for external services
- Enhance error handling and retries

---

#### Issue: Stream Processing Lag (High IteratorAge)

**Symptoms**:
- CloudWatch alarm: IteratorAge > 1 hour
- Data processing delays reported by users
- Downstream services missing data

**Diagnosis**:
1. Check Lambda consumer function logs for errors
2. Review Lambda concurrency and throttles
3. Check stream shard count vs. throughput
4. Review batch size and processing time

**Resolution**:
1. **Temporary**: Increase Lambda concurrency limit
2. **Increase parallelization**: Set `parallelization_factor` > 1
3. **Optimize code**: Reduce processing time per record
4. **Add shards**: If throughput-bound
5. **Increase batch size**: If under-utilizing Lambda capacity

**Prevention**:
- Monitor IteratorAge proactively
- Load test stream processing
- Set up auto-scaling for throughput

---

#### Issue: Verdict Not Posted to Slack

**Symptoms**:
- Campaign processing complete
- No Slack notification
- Users asking about campaign status

**Diagnosis**:
1. Check verdictReporter CloudWatch Logs
2. Review SQS verdictReporterQueue metrics
3. Check if counts changed (HasEqualCounts logic)
4. Verify Slack API token and channel configuration

**Resolution**:
1. **If queue not triggered**: Check loadScoresToStream/saveFanlistScores logs for SQS put
2. **If lambda not invoked**: Check SQS event source mapping
3. **If counts equal**: Expected behavior (no change since last post)
4. **If Slack API error**: Check token, channel permissions
5. **Manual trigger**: Invoke verdictReporter Lambda with test payload

**Prevention**:
- Alert on verdictReporter errors
- Add Slack API health check
- Document "no notification" logic for operators

---

#### Issue: DynamoDB Throttling

**Symptoms**:
- CloudWatch alarm: ThrottledRequests > 0
- Lambda retries visible in logs
- Processing slowdown

**Diagnosis**:
1. Review DynamoDB capacity settings
2. Check consumed capacity vs. provisioned
3. Identify throttled operations (read vs. write)
4. Review access patterns (hot keys)

**Resolution**:
1. **Immediate**: Enable DynamoDB auto-scaling
2. **Short-term**: Increase provisioned capacity manually
3. **Long-term**: Optimize access patterns, add indexes if needed
4. **Code**: Implement exponential backoff (likely already present)

**Prevention**:
- Enable auto-scaling by default
- Monitor capacity utilization
- Review access patterns during design

---

#### Issue: S3 File Processing Failure

**Symptoms**:
- loadScoresToStream or saveFanlistScores errors
- CloudWatch Logs show S3 access errors
- File uploaded but not processed

**Diagnosis**:
1. Check S3 event notification configuration
2. Verify file exists at expected path
3. Review Lambda IAM permissions for S3
4. Check file format and content

**Resolution**:
1. **If S3 notification missed**: Manually invoke Lambda with S3 event payload
2. **If permission error**: Review IAM policy, add missing permissions
3. **If file format error**: Fix upstream process, add validation
4. **If file too large**: Increase Lambda timeout or memory

**Prevention**:
- Monitor S3 event notifications
- Validate file format at upload
- Add size limits and checks

---

#### Issue: Integration Tests Failing in Pipeline

**Symptoms**:
- GitLab pipeline fails at integration test stage
- Tests pass locally
- Deployment blocked

**Diagnosis**:
1. Review integration test logs in GitLab
2. Check CONFIG_ENV environment variable
3. Verify test data in target environment
4. Review recent infrastructure changes

**Resolution**:
1. **If environment issue**: Check AWS resources in target environment
2. **If data issue**: Reset test data, re-run tests
3. **If timing issue**: Retry (pipeline has retry=2)
4. **If real bug**: Fix code, commit, re-run pipeline

**Prevention**:
- Keep test data consistent across environments
- Add test data setup/teardown
- Improve test reliability

## Debugging

### Lambda Debugging

**View Execution Logs**:
```bash
aws logs tail /aws/lambda/prd2011-qa1-us-east-1-api-load-db-tmaws --follow
```

**Get Recent Invocations**:
```bash
aws lambda list-functions --query "Functions[?FunctionName=='prd2011-qa1-us-east-1-api-load-db-tmaws']"
```

**Invoke Function Manually**:
```bash
aws lambda invoke \
  --function-name prd2011-qa1-us-east-1-api-load-db-tmaws \
  --payload file://test-event.json \
  output.json
```

**Check Function Configuration**:
```bash
aws lambda get-function-configuration \
  --function-name prd2011-qa1-us-east-1-api-load-db-tmaws
```

### Stream Debugging

**Check Kinesis Stream Status**:
```bash
aws kinesis describe-stream --stream-name prd2011-qa1-api-scores-stream
```

**Get Iterator Age (Lag)**:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name IteratorAge \
  --dimensions Name=FunctionName,Value=prd2011-qa1-us-east-1-api-load-db-tmaws \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Maximum
```

**Check Event Source Mapping**:
```bash
aws lambda list-event-source-mappings \
  --function-name prd2011-qa1-us-east-1-api-load-db-tmaws
```

### DynamoDB Debugging

**Scan Table for Campaign Counts**:
```bash
aws dynamodb query \
  --table-name prd2011-qa1-demand-table \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"campaign:12345"},":sk":{"S":"meta:"}}'
```

**Check Table Capacity**:
```bash
aws dynamodb describe-table --table-name prd2011-qa1-demand-table \
  --query 'Table.ProvisionedThroughput'
```

### SQS Debugging

**Check Queue Depth**:
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/{account-id}/prd2011-qa1-verdict-reporter-queue \
  --attribute-names ApproximateNumberOfMessages ApproximateAgeOfOldestMessage
```

**Receive Message (Manual)**:
```bash
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/{account-id}/prd2011-qa1-verdict-reporter-queue
```

## Capacity Planning

### Lambda Capacity

**Current Configuration**:
- Memory: 2048MB (all functions)
- Timeout: 60s (most), 900s (loadScoresToStream)
- Reserved Concurrency: -1 (unreserved, default)

**Monitoring for Scaling**:
- Review Duration metrics monthly
- Check ConcurrentExecutions trends
- Evaluate memory usage via logs

**Scaling Triggers**:
- Duration > 50s consistently: Increase timeout or optimize code
- Memory errors in logs: Increase memory_size_mb
- Throttling: Increase reserved concurrency or account limit

### Stream Capacity

**Kinesis Shard Calculation**:
- Write: 1 MB/s or 1000 records/s per shard
- Read: 2 MB/s per shard (across all consumers)

**Monitoring for Scaling**:
- `IncomingBytes` and `IncomingRecords` metrics
- `WriteProvisionedThroughputExceeded` metric

**Scaling Actions**:
- Add shards if consistently near limits
- Consider enhanced fan-out for multiple consumers

### DynamoDB Capacity

**Current Mode**: Provisioned (likely) or On-Demand
**Scaling**: Auto-scaling enabled per environment

**Monitoring for Scaling**:
- `ConsumedReadCapacityUnits` / `ConsumedWriteCapacityUnits`
- `ThrottledRequests` metric

**Scaling Actions**:
- Enable auto-scaling if not enabled
- Switch to On-Demand for unpredictable workloads
- Optimize queries and indexes

## Disaster Recovery

### Lambda Function Recovery

**RPO (Recovery Point Objective)**: 0 (stateless functions)
**RTO (Recovery Time Objective)**: < 15 minutes

**Recovery Steps**:
1. Identify last known good version (Git commit)
2. Rollback deployment via GitLab pipeline
3. Verify via AWS resource checks and tests

### Data Recovery

**DynamoDB**:
- Point-in-time recovery (if enabled): Restore table to specific timestamp
- Backups: Automated daily backups (if enabled)

**S3**:
- Versioning enabled: Restore previous file versions
- Replication: Cross-region replication (if configured)

**Kinesis**:
- Retention: 24 hours default (configurable up to 365 days)
- Replay: Reprocess from earlier iterator position

### Incident Response

**Severity Levels**:
- **P1 (Critical)**: All functions down, production data loss
- **P2 (High)**: Single function down, processing lag > 4 hours
- **P3 (Medium)**: Degraded performance, non-critical errors
- **P4 (Low)**: Cosmetic issues, logging problems

**Response Procedure**:
1. **Acknowledge**: Page on-call engineer
2. **Assess**: Determine severity and impact
3. **Communicate**: Post in incident channel
4. **Mitigate**: Stop the bleeding (rollback, scale up, failover)
5. **Resolve**: Fix root cause
6. **Document**: Write postmortem (P1/P2 only)

## Health Checks

### Synthetic Monitoring

**Recommended**:
- Scheduled Lambda invocations (canaries) every 5 minutes
- Test each function with valid payload
- Alert if canary fails

**Example Canary for loadScoresToDynamoDB**:
- Invoke with small test batch
- Verify DynamoDB write succeeds
- Check CloudWatch metrics

### External Monitoring

**Datadog / New Relic** (if configured):
- APM for Lambda functions
- Distributed tracing
- Custom dashboards

**AWS X-Ray** (if enabled):
- Service map visualization
- Trace analysis
- Performance bottleneck identification

## Contact Information

**On-Call**: Check PagerDuty schedule
**Team Channel**: Slack #verifiedfan-api (example)
**Escalation**: Engineering Manager → Director of Engineering

**Key Repositories**:
- Workers: `git@git.tmaws.io:verifiedfan/vf-api/workers.git`
- E2E Tests: `https://git.tmaws.io/verifiedfan/e2e-tests/pipelines.git`
- Documentation: `http://verifiedfan.git.tmaws.io/docs/architecture/verifiedFanAPI/`
