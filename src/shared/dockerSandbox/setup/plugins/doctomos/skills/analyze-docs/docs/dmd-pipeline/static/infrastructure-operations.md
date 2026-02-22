# Operations - dmd-pipeline

## Overview

Operational documentation for the demand-pipeline (dmd-pipeline), covering monitoring, logging, alerting, troubleshooting, and maintenance procedures.

## Monitoring

### CloudWatch Metrics

#### Lambda Function Metrics

**Function:** deliveryWorker

**Key Metrics:**
- **Invocations** - Number of times the function is invoked
- **Duration** - Execution time per invocation
- **Errors** - Number of failed invocations
- **Throttles** - Number of throttled invocations
- **IteratorAge** - Age of the last record processed from Kinesis
- **ConcurrentExecutions** - Number of concurrent executions

**Normal Ranges:**
- Duration: < 30s (timeout is 30s)
- Error rate: < 1%
- IteratorAge: < 60s (indicates processing lag)

**Access:**
1. Navigate to CloudWatch console
2. Select "Metrics" → "Lambda"
3. Filter by function name: `deliveryWorker`

#### Kinesis Stream Metrics

**Stream:** DynamoDB change stream (environment-specific)

**Key Metrics:**
- **GetRecords.Success** - Successful GetRecords operations
- **GetRecords.IteratorAgeMilliseconds** - Processing lag in milliseconds
- **IncomingRecords** - Records written to stream
- **ReadProvisionedThroughputExceeded** - Throttling events

**Normal Ranges:**
- IteratorAge: < 60,000 ms (1 minute)
- ReadProvisionedThroughputExceeded: 0

#### S3 Bucket Metrics

**Bucket:** Environment-specific (e.g., `prd3292.dev1.us-east-1.demand-capture.tmaws`)

**Key Metrics:**
- **PutRequests** - Number of PUT requests
- **BytesUploaded** - Data volume uploaded
- **4xxErrors** - Client errors
- **5xxErrors** - Server errors

**Normal Ranges:**
- 4xxErrors: 0
- 5xxErrors: 0

### Athena Query Metrics

**Workgroup:** Environment-specific (e.g., `prd3292_dev1_dmnd_pipeline`)

**Metrics:**
- **WorkgroupConfiguration** - Enforced configuration settings
- **PublishCloudWatchMetricsEnabled** - Enabled

**Access:**
1. Navigate to Athena console
2. Select workgroup
3. View "Metrics" tab

**To retrieve workgroup name:**
```bash
cd terraform
terraformer tm-nonprod/dev1 output athena_workgroup_name
```

## Logging

### Lambda Function Logs

**Log Group:** Created by lambda module (e.g., `/aws/lambda/deliveryWorker-{env}`)

**Log Structure:**
- Timestamp
- Request ID
- Log level (INFO, WARN, ERROR)
- Message
- Context (if applicable)

**Log Retention:** Configured by lambda module (default 30 days)

**Access:**
```bash
# Via AWS CLI
aws logs tail /aws/lambda/deliveryWorker-{env} --follow

# Via CloudWatch Console
# 1. Navigate to CloudWatch → Log groups
# 2. Search for deliveryWorker
# 3. Select log group
# 4. Browse log streams
```

### Centralized Log Stream

**Purpose:** Aggregates logs from all Lambda functions

**Module:** `terraform-modules/log-stream-arn` (v1.0.0)

**Configuration:**
- **Subscription Filter:** Forwards all Lambda logs
- **Distribution:** Random
- **Destination:** Kinesis log stream (region and environment-specific)

**Access:**
Logs are automatically forwarded to the centralized logging system.

### Log Format

**Logger:** Winston (v3.13.0)

**Standard Log Entry:**
```json
{
  "timestamp": "2025-01-13T12:00:00.000Z",
  "level": "info",
  "message": "Processing batch of 1000 records",
  "requestId": "abc-123-def-456",
  "context": {
    "batchSize": 1000,
    "recordType": "demand",
    "partitionDate": "2025-01-13"
  }
}
```

### Common Log Patterns

**Successful Processing:**
```
INFO: Processing batch of 1000 records
INFO: Converted 1000 records to Avro
INFO: Uploaded to S3: s3://bucket/data-pipeline/avro/demand/partition_date=2025-01-13/file.avro
```

**Error Processing:**
```
ERROR: Failed to process record
ERROR: S3 upload failed: Access Denied
ERROR: Avro conversion failed: Invalid schema
```

## Alerting

### Recommended Alerts

#### Lambda Errors

**Metric:** Lambda Errors
**Threshold:** > 5 errors in 5 minutes
**Severity:** High
**Action:** Investigate logs, check IAM permissions, verify S3 bucket access

#### High Iterator Age

**Metric:** IteratorAge
**Threshold:** > 120 seconds
**Severity:** Medium
**Action:** Check Lambda concurrency, verify processing time, investigate bottlenecks

#### Lambda Throttling

**Metric:** Throttles
**Threshold:** > 0 in 5 minutes
**Severity:** Medium
**Action:** Review Lambda concurrency limits, consider reserved concurrency

#### S3 Upload Failures

**Metric:** S3 5xxErrors
**Threshold:** > 0 in 5 minutes
**Severity:** High
**Action:** Check S3 service health, verify IAM permissions, check bucket policy

#### Kinesis Throttling

**Metric:** ReadProvisionedThroughputExceeded
**Threshold:** > 0 in 5 minutes
**Severity:** Medium
**Action:** Adjust Lambda parallelization factor, review Kinesis shard configuration

### Alert Configuration

**Recommended Tools:**
- CloudWatch Alarms
- PagerDuty integration
- Slack notifications

**Example CloudWatch Alarm (Terraform):**
```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "deliveryWorker-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name        = "Errors"
  namespace          = "AWS/Lambda"
  period             = 300
  statistic          = "Sum"
  threshold          = 5
  alarm_description  = "Alert when Lambda errors exceed threshold"
  alarm_actions      = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = module.aws_lambda_function_delivery.function_name
  }
}
```

## Troubleshooting

### Common Issues

#### Issue: Lambda Function Timeout

**Symptoms:**
- Duration approaching or exceeding 30s
- Task timed out after 30.00 seconds

**Causes:**
- Large batch size from Kinesis
- Slow S3 uploads
- Network issues
- High CPU usage (Avro conversion)

**Resolution:**
1. Check CloudWatch logs for duration trends
2. Reduce `delivery_batch_size` variable (current: 1000)
3. Verify S3 bucket is in same region (us-east-1)
4. Check Lambda memory allocation
5. Review Avro conversion performance

**Commands:**
```bash
# View Lambda configuration
aws lambda get-function-configuration --function-name deliveryWorker-{env}

# Check recent invocations
aws logs filter-log-events \
  --log-group-name /aws/lambda/deliveryWorker-{env} \
  --filter-pattern "Task timed out"
```

#### Issue: High Iterator Age

**Symptoms:**
- IteratorAge metric increasing
- Processing lag
- Records not appearing in S3

**Causes:**
- Lambda function errors
- High volume of incoming records
- Insufficient concurrency

**Resolution:**
1. Check Lambda error logs
2. Verify Lambda is invoking successfully
3. Increase `delivery_parallelization_factor` (current: 2)
4. Check Kinesis shard count
5. Monitor Lambda concurrent executions

**Commands:**
```bash
# Check Kinesis metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Kinesis \
  --metric-name GetRecords.IteratorAgeMilliseconds \
  --dimensions Name=StreamName,Value=prd3292-dev1-dmnd-table-stream \
  --start-time 2025-01-13T00:00:00Z \
  --end-time 2025-01-13T23:59:59Z \
  --period 300 \
  --statistics Average
```

#### Issue: S3 Access Denied

**Symptoms:**
- Lambda errors with "Access Denied"
- No files uploaded to S3

**Causes:**
- IAM permissions missing
- S3 bucket policy restrictions
- Wrong bucket or prefix

**Resolution:**
1. Verify IAM role attached to Lambda
2. Check S3 write policy is attached
3. Verify bucket exists and is accessible
4. Confirm prefix matches configuration (data-pipeline)

**Commands:**
```bash
# Check Lambda IAM role
aws lambda get-function-configuration \
  --function-name deliveryWorker-{env} \
  --query 'Role'

# Verify role policies
aws iam list-attached-role-policies \
  --role-name {role-name}

# Test S3 access
aws s3 ls s3://prd3292.dev1.us-east-1.demand-capture.tmaws/data-pipeline/
```

#### Issue: Avro Conversion Failure

**Symptoms:**
- Lambda errors with "Invalid schema"
- Records failing to process

**Causes:**
- Schema mismatch
- Invalid DynamoDB record format
- Missing required fields

**Resolution:**
1. Review error logs for specific field issues
2. Compare record structure to Avro schema
3. Check schema files in `src/format/avro/schemas/`
4. Verify DynamoDB record structure
5. Update schema if needed (triggers table recreation)

**Commands:**
```bash
# View Avro schema
cat src/format/avro/schemas/demand.json

# Check Glue table schema
aws glue get-table \
  --database-name prd3292_dev1_dmnd_pipeline \
  --name demand
```

#### Issue: Athena Query Failures

**Symptoms:**
- Athena queries return no results
- Partition not found errors
- Schema mismatch errors

**Causes:**
- Missing partitions
- Incorrect partition path
- Schema changes not applied

**Resolution:**
1. Check if partitions exist in S3
2. Add partitions manually if needed
3. Verify Glue table schema matches Avro schema
4. Recreate table if schema changed

**Commands:**
```bash
# List S3 partitions
aws s3 ls s3://prd3292.dev1.us-east-1.demand-capture.tmaws/data-pipeline/avro/demand/

# Add partition to Athena
ALTER TABLE demand ADD PARTITION (partition_date='2025-01-13')
LOCATION 's3://prd3292.dev1.us-east-1.demand-capture.tmaws/data-pipeline/avro/demand/partition_date=2025-01-13/';

# Repair partitions (loads all partitions)
MSCK REPAIR TABLE demand;
```

### Debugging Steps

#### Step 1: Check Lambda Invocations

```bash
# Recent invocations
aws logs filter-log-events \
  --log-group-name /aws/lambda/deliveryWorker-{env} \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --limit 10
```

#### Step 2: Verify Event Source Mapping

```bash
# List event source mappings
aws lambda list-event-source-mappings \
  --function-name deliveryWorker-{env}

# Check mapping state (should be "Enabled")
aws lambda get-event-source-mapping \
  --uuid {mapping-uuid}
```

#### Step 3: Check S3 Uploads

```bash
# Recent uploads
aws s3 ls s3://prd3292.dev1.us-east-1.demand-capture.tmaws/data-pipeline/avro/demand/ \
  --recursive \
  --human-readable \
  --summarize
```

#### Step 4: Test Athena Query

```sql
-- Check recent data
SELECT *
FROM demand
WHERE partition_date >= '2025-01-10'
LIMIT 10;

-- Count records by partition
SELECT partition_date, COUNT(*) as record_count
FROM demand
GROUP BY partition_date
ORDER BY partition_date DESC;
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Monitor Lambda error rate
- [ ] Check IteratorAge metric
- [ ] Verify S3 uploads continuing

#### Weekly
- [ ] Review CloudWatch logs for warnings
- [ ] Check Lambda duration trends
- [ ] Verify Athena queries working
- [ ] Review partition count in S3

#### Monthly
- [ ] Review and optimize Lambda configuration
- [ ] Analyze cost trends
- [ ] Update dependencies (security patches)
- [ ] Review and cleanup old test data

### Schema Updates

When updating Avro schemas:

1. **Update schema file:**
   ```bash
   # Edit schema
   vi src/format/avro/schemas/demand.json
   ```

2. **Test locally:**
   ```bash
   yarn test
   ```

3. **Deploy:**
   ```bash
   # Terraform will detect schema change and recreate table
   cd terraform
   terraformer tm-nonprod/dev1 apply
   ```

4. **Verify:**
   ```bash
   # Check Glue table
   aws glue get-table \
     --database-name prd3292_dev1_dmnd_pipeline \
     --name demand
   ```

**Note:** Schema changes trigger table recreation via Terraform lifecycle rule.

### Partition Management

#### Adding Partitions

**Automatic:** Partitions are created automatically by S3 key structure.

**Manual (if needed):**
```sql
ALTER TABLE demand ADD PARTITION (partition_date='2025-01-13')
LOCATION 's3://bucket/data-pipeline/avro/demand/partition_date=2025-01-13/';
```

#### Repairing Partitions

If partitions exist in S3 but not in Glue catalog:

```sql
MSCK REPAIR TABLE demand;
```

#### Dropping Old Partitions

For data retention policies:

```sql
-- Drop partition
ALTER TABLE demand DROP PARTITION (partition_date='2024-01-01');

-- Delete from S3 (use carefully!)
aws s3 rm s3://bucket/data-pipeline/avro/demand/partition_date=2024-01-01/ --recursive
```

### Cleanup Test Data

**Test data prefix:** `data-pipeline/test/*`

**Cleanup script:**
```bash
# Set environment
ENV=dev1
BUCKET=prd3292.${ENV}.us-east-1.demand-capture.tmaws

# Delete test data
aws s3 rm s3://${BUCKET}/data-pipeline/test/ --recursive

# Verify deletion
aws s3 ls s3://${BUCKET}/data-pipeline/test/
```

**Note:** CI role has delete permissions only for test prefix.

### Cost Optimization

#### Lambda Optimization
- Monitor Duration metric
- Adjust memory allocation if needed
- Review batch size and parallelization factor
- Consider reserved concurrency if needed

#### S3 Optimization
- Implement lifecycle policies for old data
- Use S3 Intelligent-Tiering
- Archive old partitions to Glacier

#### Athena Optimization
- Partition data effectively (currently by date)
- Use columnar formats (Parquet planned)
- Limit query scope with WHERE clauses
- Monitor query costs

## Runbooks

### Runbook: Lambda Function Not Processing Records

**Severity:** High
**Estimated Time:** 15 minutes

**Steps:**

1. **Verify event source mapping is enabled:**
   ```bash
   aws lambda list-event-source-mappings --function-name deliveryWorker-{env}
   ```
   - If disabled, re-enable via console or CLI

2. **Check Lambda errors:**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/deliveryWorker-{env} \
     --filter-pattern "ERROR" \
     --start-time $(date -u -d '1 hour ago' +%s)000
   ```

3. **Verify IAM permissions:**
   - Check Kinesis read policy attached
   - Check S3 write policy attached

4. **Test Lambda manually:**
   - Use test event in Lambda console
   - Verify function executes successfully

5. **Check Kinesis stream:**
   - Verify stream exists and is active
   - Check stream has records

6. **Escalate if unresolved:**
   - Contact AWS support
   - Review recent infrastructure changes

### Runbook: S3 Data Not Appearing

**Severity:** Medium
**Estimated Time:** 10 minutes

**Steps:**

1. **Verify Lambda is running:**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Invocations \
     --dimensions Name=FunctionName,Value=deliveryWorker-{env} \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Sum
   ```

2. **Check Lambda logs for S3 errors:**
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/deliveryWorker-{env} \
     --filter-pattern "S3" \
     --start-time $(date -u -d '1 hour ago' +%s)000
   ```

3. **Verify S3 bucket and prefix:**
   ```bash
   aws s3 ls s3://prd3292.{env}.us-east-1.demand-capture.tmaws/data-pipeline/
   ```

4. **Check IAM permissions:**
   ```bash
   aws iam get-policy-version \
     --policy-arn {s3-write-policy-arn} \
     --version-id v1
   ```

5. **Test S3 write manually:**
   ```bash
   echo "test" | aws s3 cp - s3://bucket/data-pipeline/test/test.txt
   ```

6. **Redeploy if needed:**
   ```bash
   cd terraform
   terraformer tm-nonprod/{env} apply
   ```

### Runbook: Athena Queries Failing

**Severity:** Low
**Estimated Time:** 15 minutes

**Steps:**

1. **Verify workgroup configuration:**
   ```bash
   aws athena get-work-group --work-group prd3292_{env}_dmnd_pipeline
   ```

2. **Check if partitions exist:**
   ```bash
   aws s3 ls s3://bucket/data-pipeline/avro/demand/ --recursive
   ```

3. **Repair partitions:**
   ```sql
   MSCK REPAIR TABLE demand;
   ```

4. **Verify Glue table schema:**
   ```bash
   aws glue get-table \
     --database-name prd3292_{env}_dmnd_pipeline \
     --name demand
   ```

5. **Test simple query:**
   ```sql
   SELECT COUNT(*) FROM demand;
   ```

6. **Check Athena query execution:**
   ```bash
   aws athena list-query-executions \
     --work-group prd3292_{env}_dmnd_pipeline
   ```

7. **Recreate table if schema mismatch:**
   ```bash
   cd terraform
   # Touch schema file to trigger recreation
   touch ../src/format/avro/schemas/demand.json
   terraformer tm-nonprod/{env} apply
   ```

## Performance Tuning

### Lambda Configuration

**Current Settings:**
- **Runtime:** nodejs18.x
- **Memory:** Defined by lambda module (default varies)
- **Timeout:** 30 seconds
- **Batch Size:** 1000 records
- **Parallelization Factor:** 2

**Tuning Options:**

1. **Increase memory** if CPU-bound (Avro conversion)
2. **Adjust batch size** if processing time high
3. **Increase parallelization factor** if iterator age high
4. **Add reserved concurrency** if throttling occurs

### Kinesis Configuration

**Tuning Options:**
- Adjust shard count for higher throughput
- Enable enhanced fan-out for lower latency

### S3 Upload Optimization

**Current:** Batch writes grouped by type and partition date

**Optimization:**
- Use S3 Transfer Acceleration if cross-region
- Batch multiple records per file
- Use multipart upload for large files

## Contact Information

### Support Escalation

**Level 1:** Check this runbook
**Level 2:** Review CloudWatch logs and metrics
**Level 3:** Contact team lead
**Level 4:** Contact AWS support

### Related Documentation

- **GitLab Repo:** https://git.tmaws.io/demand-capture/data-pipeline
- **Demand Capture Docs:** http://demand-capture.git.tmaws.io/docs/
- **GitLab Runners:** https://confluence.livenation.com/display/DEVXT/GitLab+Runners
- **AWS Lambda Docs:** https://docs.aws.amazon.com/lambda/
- **AWS Athena Docs:** https://docs.aws.amazon.com/athena/
