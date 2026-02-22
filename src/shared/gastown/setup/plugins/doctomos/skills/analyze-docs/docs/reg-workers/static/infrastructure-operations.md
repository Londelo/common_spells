# Operations - reg-workers

## Monitoring & Observability

### CloudWatch Logs

#### Log Groups
All Lambda functions write structured logs to CloudWatch:
- **Pattern**: `/aws/lambda/{function-name}`
- **Format**: JSON structured logs via `@verifiedfan/log` package
- **Stdout**: Redirected to CloudWatch via `@verifiedfan/cloudwatch-stdout`

**Step Functions**:
- **Pattern**: `/aws/vendedlogs/states/{product-code}-{environment}-{inventory-code}-step-fn`
- **Level**: ERROR only (with execution data)

#### Log Retention
Configurable per environment (set via Terraform `log_retention_days` variable)

#### Common Log Queries

**Find Failed Lambda Invocations**:
```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

**Track Correlation IDs**:
```
fields @timestamp, correlationId, @message
| filter correlationId = "<correlation-id>"
| sort @timestamp asc
```

**SQS Batch Failures**:
```
fields @timestamp, batchItemFailures
| filter batchItemFailures != "[]"
| sort @timestamp desc
```

---

### Distributed Tracing

**Framework**: OpenTelemetry (via `@verifiedfan/tracing` v3.0.1)

**Implementation**:
- Automatic span creation via middleware pipeline
- Correlation ID propagation across services
- HTTP request tracing with TitanRequest pattern
- Custom spans for business logic via `Services.tracer.startActiveSpan()`

**Viewing Traces**:
- Traces exported to configured OpenTelemetry collector
- Correlation IDs link logs to traces
- Request/response timing captured for external services

---

### Metrics & Dashboards

#### Lambda Metrics (CloudWatch)
**Available Metrics**:
- **Invocations** - Total invocation count
- **Duration** - Execution time (p50, p95, p99)
- **Errors** - Error count and rate
- **Throttles** - Throttling events
- **ConcurrentExecutions** - Active Lambda instances
- **DeadLetterErrors** - DLQ delivery failures
- **IteratorAge** - Stream processing lag (DynamoDB/Kinesis consumers)

#### SQS Metrics (CloudWatch)
**Available Metrics**:
- **ApproximateNumberOfMessagesVisible** - Messages in queue
- **ApproximateAgeOfOldestMessage** - Queue lag indicator
- **NumberOfMessagesSent** - Enqueue rate
- **NumberOfMessagesDeleted** - Processing rate
- **ApproximateNumberOfMessagesNotVisible** - In-flight messages

#### DynamoDB Stream Metrics
**Available Metrics**:
- **GetRecords.IteratorAgeMilliseconds** - Processing delay
- **GetRecords.Success** - Successful reads
- **UserErrors** - Application errors

#### Step Functions Metrics
**Available Metrics**:
- **ExecutionsFailed** - Failed executions
- **ExecutionsSucceeded** - Successful executions
- **ExecutionTime** - Duration per execution

---

### Alerting

#### Critical Alerts (PagerDuty Integration)

**High Error Rate**:
- **Condition**: Lambda error rate > 5% over 5 minutes
- **Impact**: Processing failures, data loss risk
- **Action**: Check CloudWatch Logs for error patterns

**DLQ Not Empty**:
- **Condition**: Messages in dead letter queue
- **Impact**: Failed events not processed
- **Action**: Inspect DLQ messages, resolve root cause

**Stream Lag High**:
- **Condition**: IteratorAge > 60 seconds for DynamoDB stream consumers
- **Impact**: Delayed replication, stale data
- **Action**: Check Lambda concurrency, review error logs

**Step Function Failures**:
- **Condition**: Step Function execution failed
- **Impact**: Workflow incomplete (selections, notifications)
- **Action**: Review execution history, check failed step

#### Warning Alerts (Slack Integration)

**Certificate Expiration**:
- **Condition**: Kafka certificate expires in < 20 days
- **Impact**: Kafka publish will fail when expired
- **Action**: Run `npx run tools:generateCerts` and redeploy

**High Queue Depth**:
- **Condition**: SQS queue depth > threshold (varies by queue)
- **Impact**: Increased processing latency
- **Action**: Monitor Lambda concurrency, check for errors

**Lambda Duration High**:
- **Condition**: p95 duration approaching timeout
- **Impact**: Risk of timeouts, incomplete processing
- **Action**: Optimize code or increase timeout

---

## Runbooks

### Common Issues

#### 1. Lambda Function Timing Out

**Symptoms**:
- CloudWatch Logs show "Task timed out after X seconds"
- Incomplete processing
- Increase in DLQ messages

**Diagnosis**:
1. Check CloudWatch Logs for duration metrics
2. Review code for blocking operations
3. Check external service response times (Entry Service, User Service, etc.)
4. Monitor DynamoDB/MongoDB query performance

**Resolution**:
- **Short-term**: Increase Lambda timeout in Terraform
  ```hcl
  timeout_seconds = 120  # Increase from default
  ```
- **Long-term**: Optimize code (batch operations, parallel processing)
- **External services**: Implement timeouts and retries

---

#### 2. DLQ Messages Accumulating

**Symptoms**:
- Messages in dead letter queue
- Processing gaps in data pipeline
- Alert: "DLQ Not Empty"

**Diagnosis**:
1. Read messages from DLQ (AWS Console or CLI):
   ```bash
   aws sqs receive-message \
     --queue-url https://sqs.us-east-1.amazonaws.com/.../dlq \
     --max-number-of-messages 10
   ```
2. Check message attributes and body
3. Review Lambda CloudWatch Logs for corresponding errors
4. Identify error pattern (schema validation, service unavailable, etc.)

**Resolution**:
- **Schema validation errors**: Fix data producer or update schema
- **Service unavailable**: Retry after service recovery
- **Code bug**: Deploy fix, redrive messages from DLQ
- **Corrupt message**: Delete message if not recoverable

**Redrive from DLQ**:
```bash
aws sqs start-message-move-task \
  --source-arn arn:aws:sqs:us-east-1:...:queue-dlq \
  --destination-arn arn:aws:sqs:us-east-1:...:main-queue
```

---

#### 3. DynamoDB Stream Lag

**Symptoms**:
- High IteratorAge metric
- Delayed replication to Entry Service
- Stale data in MongoDB

**Diagnosis**:
1. Check IteratorAge in CloudWatch:
   ```
   Metric: GetRecords.IteratorAgeMilliseconds
   Dimension: StreamLabel=<stream-label>
   ```
2. Review Lambda concurrency (may be throttled)
3. Check Lambda error rate
4. Monitor batch processing duration

**Resolution**:
- **Increase concurrency**:
  ```hcl
  reserved_concurrent_executions = 10  # Increase from default
  ```
- **Reduce batch size** (faster processing, more frequent invocations):
  ```hcl
  batch_size = 100  # Reduce from 500
  ```
- **Optimize Lambda code**: Reduce processing time per record
- **Fix errors**: Address root cause of failures

---

#### 4. Kafka Publish Failures

**Symptoms**:
- `sendData` Lambda failures
- CloudWatch Logs: Kafka connection errors
- Data not appearing in analytics pipeline

**Diagnosis**:
1. Check Kafka certificate expiration:
   ```bash
   npx run tools:generateCerts
   # Select environment, choose 'check expiry' option
   ```
2. Review CloudWatch Logs for Kafka errors
3. Verify Kafka cluster availability
4. Check network connectivity (VPC, security groups)

**Resolution**:
- **Expired certificate**: Regenerate and redeploy
  ```bash
  npx run tools:generateCerts
  # Update GitLab CI/CD variable
  # Redeploy dataPipeline stack
  ```
- **Kafka unavailable**: Contact Kafka cluster admins
- **Network issue**: Review security groups and routing

---

#### 5. Entry Replication Out of Sync

**Symptoms**:
- Entries exist in DynamoDB but not in Entry Service MongoDB
- Selection failures due to missing entries

**Diagnosis**:
1. Check `enqueueEntries` Lambda for stream filtering
2. Review `saveEntries` Lambda logs for failures
3. Query Entry Service API for specific entry
4. Check DynamoDB `needsReplication` flag
5. Review replication queue depth

**Resolution**:
- **Queue backed up**: Increase Lambda concurrency
- **Validation failures**: Check Entry Service schema requirements
- **Entry Service unavailable**: Retry after recovery
- **Race condition**: `saveEntries` validates against current demand-table state before replicating

**Manual Replication Trigger**:
```javascript
// Set needsReplication flag in DynamoDB
// This will trigger enqueueEntries on next stream event
await dynamodb.updateItem({
  TableName: 'demand-table',
  Key: { PK: { S: '...' }, SK: { S: '...' } },
  UpdateExpression: 'SET needsReplication = :true',
  ExpressionAttributeValues: { ':true': { BOOL: true } }
});
```

---

#### 6. Selection Process Failures

**Symptoms**:
- Step Function execution failed
- Codes not assigned to winners
- Campaign status stuck in PROCESSING

**Diagnosis**:
1. Check Step Function execution history (AWS Console)
2. Review `enqueueMarketSelections` Lambda logs
3. Check Code Service availability
4. Verify selection queue processing

**Resolution**:
- **Code Service unavailable**: Retry Step Function after service recovery
- **Insufficient codes**: Code Service should have reserved codes; check inventory
- **Lambda timeout**: Increase timeout for `enqueueMarketSelections` (max 900s)
- **Retry execution**:
  ```bash
  aws stepfunctions start-execution \
    --state-machine-arn arn:aws:states:us-east-1:...:stateMachine:... \
    --input '{"campaignId":"...","marketId":"..."}'
  ```

---

#### 7. Campaign Configuration Issues

**Symptoms**:
- `checkEligibility` rejecting valid entries
- Unexpected eligibility reasons
- Cached campaign data stale

**Diagnosis**:
1. Check Redis cache for campaign:
   ```bash
   redis-cli -h <host> GET "campaign:<campaignId>"
   ```
2. Compare with MongoDB campaign data
3. Review campaign configuration in Campaigns Service

**Resolution**:
- **Stale cache**: Clear Redis key to force refresh
  ```bash
  redis-cli -h <host> DEL "campaign:<campaignId>"
  ```
- **Invalid configuration**: Update via Campaigns Service
- **Cache service unavailable**: Lambda falls back to MongoDB

---

#### 8. High Lambda Costs

**Symptoms**:
- CloudWatch bill spike
- High invocation count or duration

**Diagnosis**:
1. Review Lambda metrics per function
2. Check CloudWatch Logs retention settings
3. Identify functions with high invocation rate
4. Profile execution duration

**Resolution**:
- **Reduce log retention**: Update Terraform configuration
- **Optimize cold starts**: Increase memory (improves CPU)
- **Batch processing**: Reduce invocation count via larger batches
- **Remove debug logs**: Clean up verbose logging in production

---

## Debugging

### Local Development

#### Invoke Worker Locally
```bash
# Basic invocation
npx run workers:invoke <workerName> '<jsonPayload>'

# With local-dev config
CONFIG_ENV=local-dev npx run workers:invoke <workerName> '<jsonPayload>'
```

**Example**:
```bash
CONFIG_ENV=local-dev npx run workers:invoke checkEligibility '[{
  "campaignSlug": "test-campaign",
  "entry": {
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  },
  "doTransfer": false
}]'
```

#### Local Configuration
Edit `configs/local-dev.config.yml` to override environment-specific settings:
- MongoDB connection string (local or tunnel to dev)
- Redis host (local or tunnel to dev)
- AWS credentials (local profile or assume role)
- Service endpoints (local mocks or dev environment)

---

### Production Debugging

#### CloudWatch Insights Queries

**Find Slow Requests**:
```
fields @timestamp, @duration, correlationId, @message
| filter @duration > 5000
| sort @duration desc
| limit 50
```

**Track Request Flow**:
```
fields @timestamp, @message
| filter correlationId = "<correlation-id>"
| sort @timestamp asc
```

**Analyze Batch Item Failures**:
```
fields @timestamp, batchItemFailures
| filter batchItemFailures like /.+/
| stats count(*) by bin(5m)
```

#### Lambda Environment Variables

**Check Current Configuration**:
```bash
aws lambda get-function-configuration \
  --function-name <function-name> \
  --query 'Environment.Variables'
```

**Update Environment Variable** (requires redeploy):
Edit Terraform configuration and apply.

---

### External Service Debugging

#### Entry Service
**Check Entry Existence**:
```bash
curl -X GET "https://entry-service.example.com/{campaignId}/entries/{entryId}" \
  -H "Authorization: Bearer <token>"
```

**Check Entry Service Health**:
```bash
curl -X GET "https://entry-service.example.com/health"
```

#### User Service
**Check User Profile**:
```bash
curl -X GET "https://user-service.example.com/users/{globalUserId}" \
  -H "Authorization: Bearer <token>"
```

#### Code Service
**Check Code Availability**:
```bash
curl -X GET "https://code-service.example.com/campaigns/{campaignId}/codes/available" \
  -H "Authorization: Bearer <token>"
```

#### Campaign Service
**Check Campaign Configuration**:
```bash
curl -X GET "https://campaign-service.example.com/campaigns/{campaignId}" \
  -H "Authorization: Bearer <token>"
```

---

## Operational Tools

### Upload Invites

**Purpose**: Bulk upload invite lists to DynamoDB for invite-only campaigns

**Command**:
```bash
npx run uploadInvites <campaignId> <type> <fileName> <ttl>
```

**Parameters**:
- `campaignId` (required): Campaign identifier
- `type` (required): "email" | "globalUserId" | "memberId"
- `fileName` (optional): Path to CSV file (default: `./tools/uploadInvites/invites.csv`)
- `ttl` (optional): Time-to-live timestamp (default: 30 days from now)

**CSV Format**:
```csv
email
user1@example.com
user2@example.com
```

**Example**:
```bash
npx run uploadInvites campaign-123 email ./invites.csv 1704067200
```

---

### Generate Kafka Certificates

**Purpose**: Generate Kafka authentication certificates from Vault

**Command**:
```bash
npx run tools:generateCerts
```

**Process**:
1. Select environment (qa/dev, preprod, prod)
2. Choose authentication method:
   - **user**: Enter techops username and password
   - **app**: Enter app role ID and secret ID
3. Script generates certificate and copies to clipboard
4. Paste into GitLab CI/CD variable:
   - `nonprod_kafka_cert` (qa/dev)
   - `preprod_kafka_cert` (preprod)
   - `prod_kafka_cert` (prod)
5. Redeploy dataPipeline stack

**Certificate Expiration**:
- Monitored daily via GitLab scheduled job
- Alerts via Slack when < 20 days remain
- Manual check: Run `alert cert expiration` job in GitLab

---

### Pull Shared Code Updates

**Purpose**: Sync shared code from template repository

**Command**:
```bash
npx run template:update
```

**Updates**:
- Shared middleware (`shared/middlewares/`)
- Service layer (`shared/services/`)
- Common utilities

---

### AWS Resource Discovery

**Purpose**: Verify deployed AWS resources match Terraform configuration

**Command**:
```bash
CONFIG_ENV=<environment> npx run aws:findResources
```

**Checks**:
- Lambda functions exist
- SQS queues configured correctly
- DynamoDB tables accessible
- IAM roles and policies attached

**Run in CI/CD**: Automatically after each deployment

---

## Maintenance Tasks

### Regular Maintenance

#### Weekly
- [ ] Review DLQ queues for failed messages
- [ ] Check CloudWatch alarms status
- [ ] Monitor Lambda duration trends (approaching timeout?)
- [ ] Review error logs for patterns

#### Monthly
- [ ] Review Lambda memory allocation (rightsizing)
- [ ] Check CloudWatch Logs retention settings
- [ ] Analyze Lambda costs and optimization opportunities
- [ ] Verify Kafka certificate expiration date

#### Quarterly
- [ ] Review IAM policies for least privilege
- [ ] Update dependencies (`yarn upgrade-interactive`)
- [ ] Review and update Terraform module versions
- [ ] Validate disaster recovery procedures

---

### Capacity Planning

#### Lambda Concurrency
**Current**: Default account-level concurrency (1000)
**Reserved**: Per-function reserved concurrency (if configured)

**Scaling Considerations**:
- DynamoDB stream consumers: Concurrency = number of shards
- SQS consumers: Auto-scales based on queue depth
- Synchronous invocations (AppSync): Scales to demand

#### SQS Queue Limits
**Message Size**: 256 KB max
**Batch Size**: 10 messages max (send), configurable for Lambda (1-10,000)
**Retention**: 14 days for DLQs, 4 days default for main queues

#### DynamoDB Stream Limits
**Batch Size**: Up to 10,000 records per batch
**Parallel Processing**: Up to 10 concurrent Lambda invocations per shard

---

## Disaster Recovery

### RTO/RPO Targets
- **RTO** (Recovery Time Objective): < 1 hour for production
- **RPO** (Recovery Point Objective): Near-zero (DynamoDB streams processed eventually)

### Backup Strategy
- **DynamoDB**: Point-in-time recovery enabled (managed externally)
- **Lambda Code**: Stored in S3 (via Terraform state), Git repository is source of truth
- **Configuration**: Version-controlled in Git

### Recovery Procedures

#### Total Stack Failure
1. Verify Terraform state is intact (S3 backend)
2. Check DynamoDB table health (external)
3. Redeploy entire stack:
   ```bash
   cd terraform/stacks/<stack>
   terramisu apply -e tm-prod/prod1
   ```
4. Verify resource health
5. Monitor logs for errors
6. Check DLQ queues for failed events

#### Data Replication Failure
1. Identify missing entries via Entry Service query
2. Set `needsReplication` flag in DynamoDB for affected entries
3. Monitor `enqueueEntries` and `saveEntries` Lambdas
4. Verify replication via Entry Service API

#### Kafka Pipeline Failure
1. Check Kafka cluster health
2. Verify certificate validity
3. Review CloudWatch Logs for `sendData` errors
4. Messages remain in SQS queues during outage (14-day retention)
5. Processing resumes automatically when Kafka recovers

---

## Security Operations

### IAM Policy Review
- Verify least privilege access
- Check for overly permissive policies
- Ensure cross-account access is properly scoped

### Secrets Rotation
- **Kafka Certificates**: Rotate before expiration (< 20 days warning)
- **Service API Tokens**: Managed by external services
- **AWS Credentials**: Managed by IAM roles (no long-term keys)

### Audit Logging
- CloudTrail captures API calls
- Lambda execution logs in CloudWatch
- DynamoDB streams capture data changes

---

## Performance Optimization

### Lambda Optimization
- **Memory allocation**: Balance cost vs. performance (CPU scales with memory)
- **Cold start reduction**: Increase memory, minimize dependencies
- **Connection pooling**: Reuse HTTP clients, database connections
- **Batch operations**: Reduce API calls via batching

### Data Pipeline Optimization
- **SQS batch processing**: Use larger batches when possible
- **DynamoDB stream batching**: Increase batch size and batching window
- **Parallel processing**: Use Promise.all() for independent operations
- **Ramda data transformations**: Immutable, efficient functional patterns

### External Service Optimization
- **Redis caching**: Reduce MongoDB and Service API calls
- **HTTP timeouts**: Set aggressive timeouts to fail fast
- **Retry logic**: Exponential backoff with jitter
- **Circuit breakers**: Prevent cascade failures
