# Operations - fan-identity-workers

## Monitoring

### CloudWatch Logs

#### Log Groups

Each Lambda function creates its own log group:
- **Naming:** `/aws/lambda/{function-name}`
- **Retention:** Configured per environment
- **Access:** Via CloudWatch Logs console or CLI

**Example Log Groups:**
```
/aws/lambda/prd2011-{env}-{region}-validateToken
/aws/lambda/prd2011-{env}-{region}-scoreUsers
/aws/lambda/prd2011-{env}-{region}-handleEvent
```

#### Log Structure

**Standard Fields:**
- Timestamp
- Request ID (correlation)
- Function name
- Log level
- Message

**Custom Instrumentation:**
- OpenTelemetry tracing
- Request/response logging
- Error stack traces
- Performance metrics

### Lambda Metrics

#### Available Metrics (CloudWatch)

| Metric | Description | Threshold Recommendations |
|--------|-------------|---------------------------|
| Invocations | Total invocations | - |
| Duration | Execution time | Alert > timeout-5s |
| Errors | Error count | Alert > 0 sustained |
| Throttles | Throttled invocations | Alert > 0 |
| ConcurrentExecutions | Concurrent runs | Alert > 80% reserved |
| DeadLetterErrors | DLQ failures | Alert > 0 |
| IteratorAge | Stream lag (ms) | Alert > 60000ms (Kinesis) |

#### Stream-Specific Metrics

**Kinesis/DynamoDB Streams:**
- **IteratorAge** - Processing lag
- **BatchSize** - Records per invocation
- **FilteredRecords** - Records filtered by criteria

**SQS Queues:**
- **ApproximateAgeOfOldestMessage** - Message age
- **ApproximateNumberOfMessagesVisible** - Queue depth
- **NumberOfMessagesReceived** - Message rate

### API Gateway Metrics

**Identity Verification Stack:**
- **4XXError** - Client errors
- **5XXError** - Server errors
- **Count** - Total requests
- **Latency** - Request duration
- **IntegrationLatency** - Backend latency

---

## Alerting

### Recommended Alerts

#### Critical Alerts

**Lambda Errors**
- **Metric:** Errors
- **Threshold:** > 5 errors in 5 minutes
- **Action:** Page on-call engineer
- **Severity:** Critical

**Lambda Throttling**
- **Metric:** Throttles
- **Threshold:** > 0 sustained for 2 minutes
- **Action:** Page on-call engineer
- **Severity:** Critical

**Stream Processing Lag**
- **Metric:** IteratorAge
- **Threshold:** > 2 minutes (120000ms)
- **Action:** Alert team
- **Severity:** High

**DLQ Messages**
- **Metric:** ApproximateNumberOfMessagesVisible (DLQ)
- **Threshold:** > 0
- **Action:** Alert team
- **Severity:** High

#### Warning Alerts

**High Duration**
- **Metric:** Duration
- **Threshold:** > 80% of timeout
- **Action:** Investigate performance
- **Severity:** Medium

**Queue Depth**
- **Metric:** ApproximateNumberOfMessagesVisible
- **Threshold:** > 1000 messages
- **Action:** Check consumer health
- **Severity:** Medium

**API Gateway 4XX Rate**
- **Metric:** 4XXError rate
- **Threshold:** > 5% of requests
- **Action:** Review client integrations
- **Severity:** Low

#### Alerting Channels

**Recommended Setup:**
- PagerDuty for critical alerts
- Slack for warning alerts
- Email for informational alerts

---

## Logging

### Log Levels

**Available Levels:**
- ERROR - Errors requiring investigation
- WARN - Warnings, degraded functionality
- INFO - Informational messages
- DEBUG - Detailed debug information

**Configuration:** Via environment-specific config files

### Log Aggregation

**Service:** CloudWatch Logs Insights

**Example Queries:**

#### Find Errors
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

#### Function Performance
```
fields @timestamp, @duration
| stats avg(@duration), max(@duration), min(@duration)
| sort @timestamp desc
```

#### Request Correlation
```
fields @timestamp, @requestId, @message
| filter @requestId = "<request-id>"
| sort @timestamp asc
```

#### Error Rate by Function
```
fields @timestamp
| filter @message like /ERROR/
| stats count() by bin(5m)
```

### Structured Logging

**Format:** JSON with standard fields

**Example Log Entry:**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "requestId": "abc-123-def",
  "functionName": "scoreUsers",
  "message": "User scored successfully",
  "userId": "user-456",
  "score": 85,
  "duration": 245
}
```

---

## Tracing

### OpenTelemetry

**Package:** `@verifiedfan/tracing`

**Instrumentation:**
- HTTP requests
- DynamoDB operations
- SQS operations
- External API calls

**Trace Context:**
- Propagated via middleware
- Correlation IDs in logs
- Distributed tracing across services

### Trace Analysis

**Key Spans:**
- Lambda invocation
- Middleware execution
- Service calls (DynamoDB, SQS, APIs)
- Business logic execution

---

## Runbooks

### Common Issues

#### Issue: Lambda Function Timing Out

**Symptoms:**
- Duration approaching timeout
- Task timed out errors in logs

**Diagnosis:**
1. Check CloudWatch duration metric
2. Review logs for slow operations
3. Check external service latency

**Resolution:**
1. Increase timeout in Terraform config
2. Optimize slow queries
3. Add caching where appropriate
4. Consider async processing for long tasks

**Prevention:**
- Set appropriate timeouts per function
- Monitor duration metrics
- Profile slow functions

---

#### Issue: Kinesis Stream Processing Lag

**Symptoms:**
- IteratorAge increasing
- Delayed event processing
- Backlog of unprocessed records

**Diagnosis:**
1. Check IteratorAge metric
2. Review Lambda duration for stream consumers
3. Check for errors in consumer functions
4. Verify batch size configuration

**Resolution:**
1. Increase Lambda concurrency
2. Optimize processing logic
3. Adjust batch size
4. Add more shards to stream (if needed)

**Prevention:**
- Monitor IteratorAge continuously
- Set alerts for lag > 2 minutes
- Load test stream consumers

---

#### Issue: SQS Queue Depth Growing

**Symptoms:**
- ApproximateNumberOfMessagesVisible increasing
- Message age increasing
- Consumer functions not keeping up

**Diagnosis:**
1. Check queue depth metric
2. Review consumer Lambda invocations
3. Check for consumer errors
4. Verify visibility timeout

**Resolution:**
1. Check if consumer is enabled
2. Investigate consumer errors
3. Increase consumer concurrency
4. Adjust visibility timeout if needed

**Prevention:**
- Monitor queue depth
- Set alerts for unusual growth
- Ensure proper error handling in consumers

---

#### Issue: API Gateway 5XX Errors

**Symptoms:**
- 5XXError metric increasing
- Backend integration failures
- Lambda errors

**Diagnosis:**
1. Check API Gateway logs
2. Review Lambda function logs
3. Check IAM permissions
4. Verify integration configuration

**Resolution:**
1. Fix Lambda function errors
2. Verify IAM role permissions
3. Check API Gateway integration settings
4. Review VTL templates (if used)

**Prevention:**
- Monitor 5XX error rate
- Implement retry logic
- Test integrations thoroughly

---

#### Issue: DynamoDB Throttling

**Symptoms:**
- ProvisionedThroughputExceededException
- Slow writes/reads
- Lambda retries

**Diagnosis:**
1. Check DynamoDB metrics
2. Review consumed capacity
3. Check for hot partitions
4. Verify on-demand vs provisioned mode

**Resolution:**
1. Switch to on-demand if using provisioned
2. Adjust provisioned capacity
3. Implement backoff/retry logic
4. Optimize query patterns

**Prevention:**
- Use on-demand for variable workloads
- Monitor consumed capacity
- Design for even partition distribution

---

#### Issue: Failed Deployments

**Symptoms:**
- Terraform apply fails
- GitLab CI pipeline fails
- Resource creation errors

**Diagnosis:**
1. Check GitLab CI logs
2. Review Terraform error messages
3. Verify AWS permissions
4. Check resource limits

**Resolution:**
1. Fix Terraform configuration issues
2. Resolve resource conflicts
3. Request service limit increases
4. Roll back to previous state if needed

**Prevention:**
- Test in QA first
- Review Terraform plan before apply
- Monitor AWS service limits

---

### Debugging Procedures

#### Debug Lambda Function

**Steps:**
1. Enable DEBUG log level in config
2. Invoke function with test event
3. Review CloudWatch logs
4. Check tracing data
5. Reproduce locally if possible

**Local Testing:**
```bash
# Set environment
export CONFIG_ENV=local-dev

# Invoke worker
npx run workers:invoke <workerName> '<event-json>'
```

#### Debug Stream Processing

**Steps:**
1. Check stream health (shards, throughput)
2. Review Lambda event source mapping
3. Check filter criteria
4. Verify batch size and timeout
5. Test with sample events

#### Debug API Gateway

**Steps:**
1. Enable CloudWatch logging
2. Enable execution logging
3. Test with curl/Postman
4. Check request/response transforms
5. Verify IAM permissions

---

### Performance Tuning

#### Lambda Optimization

**Memory:**
- Start with default (128MB)
- Monitor memory usage
- Increase if near limit
- More memory = faster CPU

**Timeout:**
- Set based on expected duration + buffer
- Monitor 95th percentile duration
- Avoid unnecessary long timeouts

**Concurrency:**
- Use reserved concurrency for critical functions
- Avoid throttling downstream services
- Monitor concurrent executions

**Cold Start Reduction:**
- Keep functions warm with scheduled events
- Minimize dependencies
- Use Lambda layers for large dependencies
- Consider provisioned concurrency

#### Stream Processing Optimization

**Batch Size:**
- Larger batches = fewer invocations
- Smaller batches = lower latency
- Balance based on workload

**Parallelization:**
- More shards = more parallelism
- Adjust based on throughput needs
- Cost vs performance tradeoff

#### DynamoDB Optimization

**Query Patterns:**
- Use batch operations where possible
- Implement caching for hot data
- Use GSIs for alternative access patterns

**Write Optimization:**
- Batch writes when possible
- Use UpdateItem instead of PutItem
- Avoid hot partitions

---

## Health Checks

### Lambda Health

**Indicators:**
- Zero errors in past hour
- Duration within acceptable range
- No throttling
- IteratorAge < threshold (for stream consumers)

### Infrastructure Health

**Checks:**
```bash
# Run AWS resource verification
npx run aws:findResources
```

**Expected:** All configured resources exist and are accessible

### API Gateway Health

**Endpoint:** Custom health check endpoint (if implemented)

**Checks:**
- Gateway responds
- Backend integration functional
- Certificate valid
- DNS resolution working

---

## Incident Response

### Severity Levels

**P1 - Critical**
- Complete service outage
- Data loss risk
- Security breach

**P2 - High**
- Partial service degradation
- Significant processing delays
- High error rates

**P3 - Medium**
- Minor functionality impaired
- Workaround available
- Performance degradation

**P4 - Low**
- Cosmetic issues
- No user impact

### Response Process

1. **Detect** - Alert triggers
2. **Assess** - Determine severity
3. **Respond** - Follow runbook
4. **Communicate** - Update stakeholders
5. **Resolve** - Fix issue
6. **Review** - Post-mortem

### Escalation

**L1 - Team**
- Initial response
- Follow runbooks
- Resolve common issues

**L2 - Senior Engineers**
- Complex issues
- Infrastructure changes
- Architecture decisions

**L3 - Management**
- Customer communication
- Resource allocation
- Policy decisions

---

## Maintenance

### Regular Tasks

**Daily:**
- Check error rates
- Review alerts
- Monitor queue depths

**Weekly:**
- Review performance metrics
- Check cost anomalies
- Update dependencies (if needed)

**Monthly:**
- Review logs for patterns
- Optimize cold starts
- Update runbooks
- Review security

**Quarterly:**
- Architecture review
- Capacity planning
- Disaster recovery test

### Dependency Updates

**Process:**
1. Review dependency security advisories
2. Test updates in local environment
3. Deploy to QA
4. Run full test suite
5. Deploy through normal pipeline

### Infrastructure Updates

**Terraform Modules:**
- Review module changelogs
- Test in QA environment
- Deploy during low-traffic period
- Monitor closely post-deployment

---

## Disaster Recovery

### Backup Strategy

**Lambda Functions:**
- Code stored in Git repository
- Deployment artifacts in S3 (via GitLab CI)

**Configuration:**
- Terraform state in remote backend
- Config files in Git repository

**Data:**
- DynamoDB point-in-time recovery (if enabled)
- Kinesis stream replay capability

### Recovery Procedures

**Lambda Function Failure:**
1. Identify last known good version
2. Revert code in Git
3. Redeploy via pipeline

**Stack Corruption:**
1. Review Terraform state
2. Import existing resources if needed
3. Reapply Terraform configuration

**Regional Outage:**
- Scoring stack has west region failover
- Other stacks require manual intervention
- Follow AWS service recovery guidance

---

## Cost Monitoring

### Key Cost Drivers

**Lambda:**
- Invocations
- Duration (GB-seconds)
- Data transfer

**DynamoDB:**
- Read/write capacity
- Storage
- Streams

**Kinesis:**
- Shard hours
- Data transfer

**API Gateway:**
- Requests
- Data transfer

### Cost Optimization

**Lambda:**
- Right-size memory allocation
- Reduce cold starts
- Optimize execution time
- Use ARM architecture (if compatible)

**DynamoDB:**
- Use on-demand for variable workloads
- Clean up unused data
- Archive to S3 when appropriate

**Streams:**
- Right-size shard count
- Use appropriate retention periods
- Leverage filtering to reduce processing

---

## Notes

- All stacks share common tagging for cost allocation
- Multi-region deployment increases cost but provides redundancy
- Feature flags control optional features per environment
- Regular review of CloudWatch logs helps identify optimization opportunities
