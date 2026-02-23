# Operations - appsync

## Monitoring

### CloudWatch Logging

**Log Group**: `/aws/appsync/apis/{appsync_api_id}`
**Retention Period**: 7 days (default)
**Field Log Level**:
- Nonprod: ALL (verbose logging)
- Prod: ERROR (minimal logging)

**Log Configuration**:
- Execution logs: Enabled
- Request/response logging: Controlled by field_log_level
- CloudWatch Logs Role: `{product_code}.{env}.{region}.tmaws-log-appsync`

**Log Subscription Filter**:
- Name: `{appsync_api_name}-log-sub`
- Destination: Kinesis log stream
- Filter pattern: Empty (all logs)
- Distribution: Random

### Kinesis Log Streaming

**Purpose**: Stream CloudWatch logs to centralized log aggregation system
**IAM Permission**: `kinesis:PutRecord` on log stream ARN
**Integration**: Logs forwarded to downstream analysis/monitoring systems

### AppSync Metrics

**Available CloudWatch Metrics** (AWS AppSync namespace):
- `4XXError`: Client-side errors (authentication, validation, missing fields)
- `5XXError`: Server-side errors (resolver errors, data source failures)
- `Latency`: Request processing time
- `Requests`: Total number of GraphQL requests
- `ConnectSuccess`: WebSocket connection success rate
- `ActiveConnections`: Number of active WebSocket connections

**Recommended Alarms**:
- `5XXError` rate above threshold
- `Latency` P99 above acceptable threshold
- `4XXError` spike (potential authentication issues)

### AppSync Caching Metrics

**Cache Configuration**: Per-resolver caching
**Cache Types**:
- Nonprod: SMALL
- Prod: LARGE

**Cache Metrics** (AWS AppSync namespace):
- `CacheHitCount`: Number of requests served from cache
- `CacheMissCount`: Number of requests that bypassed cache

**Cache Performance**:
- Default TTL: 300 seconds (5 minutes)
- Resolver-specific TTL overrides available
- Cache keys: Defined per resolver (e.g., `$context.arguments.eventId`)

## Alerting

### Recommended Alert Configuration

**Critical Alerts**:
1. **High 5XX Error Rate**
   - Metric: `5XXError`
   - Threshold: > 1% of requests
   - Action: Page on-call engineer

2. **Lambda Authorizer Failures**
   - Metric: Lambda authorizer error count
   - Threshold: > 5 errors in 5 minutes
   - Action: Alert authentication team

3. **DynamoDB Throttling**
   - Metric: `ThrottledRequests` on DynamoDB tables
   - Threshold: > 0 sustained for 5 minutes
   - Action: Alert infrastructure team

4. **Cache Performance Degradation**
   - Metric: Cache hit ratio
   - Threshold: < 50% hit rate sustained for 10 minutes
   - Action: Investigate cache configuration

**Warning Alerts**:
1. **Elevated 4XX Rate**
   - Metric: `4XXError`
   - Threshold: > 5% of requests
   - Action: Review client integration logs

2. **High Latency**
   - Metric: `Latency` P99
   - Threshold: > 3000ms
   - Action: Investigate slow resolvers/data sources

3. **API Key Expiration**
   - Time-based: 30 days before expiration
   - Action: Rotate API key

### Alert Destinations

**Recommended Integrations**:
- PagerDuty for critical alerts
- Slack channels for team notifications
- Email for warning alerts
- DataDog/New Relic for metrics visualization

## Logging

### Log Structure

**Request Logs**:
```
{
  "requestId": "uuid",
  "graphqlOperation": "query|mutation|subscription",
  "fieldName": "accountFanscore",
  "typeName": "VFApi",
  "duration": 123,
  "statusCode": 200,
  "errorType": "optional",
  "errorMessage": "optional"
}
```

**Error Logs**:
- Resolver errors logged with full context
- Data source errors include request/response details (nonprod only)
- Authorization failures logged separately

### Log Access

**AWS Console**:
1. Navigate to CloudWatch Logs
2. Find log group: `/aws/appsync/apis/{api_id}`
3. Use CloudWatch Insights for querying

**CLI Access**:
```bash
# Stream logs in real-time (nonprod)
aws logs tail /aws/appsync/apis/{api_id} --follow --profile tm-nonprod-Ops-Techops

# Query logs with CloudWatch Insights
aws logs start-query \
  --log-group-name /aws/appsync/apis/{api_id} \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, fieldName, duration | filter errorType like /.*/ | sort @timestamp desc' \
  --profile tm-prod-Ops-Techops
```

### Sensitive Data Handling

**Important**: Nonprod logs (field_log_level: ALL) may contain:
- Request arguments
- Response payloads
- Authorization tokens (masked)

**Production logs** (field_log_level: ERROR) only contain error details.

## Runbooks

### Common Issues

#### 1. High 5XX Error Rate

**Symptoms**: Increased `5XXError` CloudWatch metric

**Potential Causes**:
- Downstream Lambda function errors
- DynamoDB throttling or service issues
- Network connectivity issues to data sources
- Pipeline function failures

**Resolution Steps**:
1. Check CloudWatch logs for specific error messages
2. Identify failing resolver/field: `fields @timestamp, fieldName, errorType, errorMessage | filter errorType like /.*/`
3. Check corresponding data source health:
   - Lambda: Check Lambda CloudWatch logs and metrics
   - DynamoDB: Check table metrics for throttling
   - HTTP: Check external API health
4. Review recent deployments for code changes
5. If Lambda issue: Check Lambda execution role permissions
6. If DynamoDB throttling: Consider increasing provisioned capacity or switching to on-demand

**Escalation**: If issue persists > 15 minutes, escalate to infrastructure team

---

#### 2. Authentication Failures (4XX Errors)

**Symptoms**: Elevated `4XXError` metric, authentication-related errors in logs

**Potential Causes**:
- Lambda authorizer failures
- Invalid API keys
- Expired tokens
- IAM role misconfiguration

**Resolution Steps**:
1. Check Lambda authorizer CloudWatch logs: `prd2011-{env}-fanid-auth-token`
2. Verify API key validity: Check ACM certificate and API key expiration
3. Test authentication with known-good credentials
4. Review IAM policies for AppSync execution role
5. Check for recent changes to authentication logic

**Quick Fix**:
```bash
# Test GraphQL API with API key
curl -X POST https://appsync-{env}.fanid.{zone}/graphql \
  -H "x-api-key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

---

#### 3. Slow Query Performance

**Symptoms**: High `Latency` metric, user complaints about slow responses

**Potential Causes**:
- Inefficient DynamoDB queries (missing GSIs)
- Lambda cold starts
- Cache misses
- Downstream API latency
- N+1 query problems

**Resolution Steps**:
1. Identify slow resolvers using CloudWatch Insights:
   ```
   fields @timestamp, fieldName, duration
   | filter duration > 1000
   | sort duration desc
   | limit 20
   ```
2. Check cache hit ratio for affected resolvers
3. Review DynamoDB query patterns:
   - Check for scans vs. queries
   - Verify GSI usage
4. Check Lambda metrics:
   - Cold start frequency
   - Execution duration
   - Memory utilization
5. Profile resolver pipelines: Identify slowest function in pipeline
6. Consider adding caching or optimizing data source queries

**Optimization Checklist**:
- [ ] Add resolver caching for static data
- [ ] Optimize DynamoDB queries (use Query instead of Scan)
- [ ] Increase Lambda memory for CPU-bound operations
- [ ] Batch requests to downstream services
- [ ] Add GSIs for common query patterns

---

#### 4. DynamoDB Throttling

**Symptoms**: `ThrottledRequests` metric > 0, intermittent 5XX errors

**Resolution Steps**:
1. Check DynamoDB table metrics in CloudWatch
2. Identify hot partitions causing throttling
3. Review query patterns for sequential access issues
4. Short-term fix: Increase provisioned capacity (if not on-demand)
5. Long-term fix:
   - Switch to on-demand billing mode
   - Redesign partition key for better distribution
   - Add application-level caching

**Emergency Response**:
```bash
# Temporarily increase table capacity (provisioned mode)
aws dynamodb update-table \
  --table-name prd2011-{env}-us-east-1-{table} \
  --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50 \
  --profile tm-nonprod-Ops-Techops
```

---

#### 5. Lambda Authorizer Timeout

**Symptoms**: Requests failing with authorization timeout errors

**Potential Causes**:
- Lambda cold starts
- Slow external validation services
- Network connectivity issues
- Lambda execution timeout too low

**Resolution Steps**:
1. Check Lambda authorizer CloudWatch logs
2. Review Lambda execution duration metrics
3. Verify Lambda timeout setting (should be < 60s)
4. Check Lambda VPC configuration (if applicable)
5. Review authorization logic for performance bottlenecks
6. Consider caching authorization results (TTL: 3600s configured)

**Cache Configuration**:
- Current TTL: 3600 seconds (1 hour)
- Result caching enabled in AppSync
- Verify cache is being used effectively

---

#### 6. Schema Deployment Failure

**Symptoms**: Terraform apply fails on schema changes, GraphQL schema validation errors

**Potential Causes**:
- Breaking schema changes
- Invalid GraphQL syntax
- Missing AWS AppSync directives
- Resolver/data source mismatch

**Resolution Steps**:
1. Check Terraform error message for specific validation failure
2. Validate schema locally:
   ```bash
   npx run build
   # Review dist/schema.graphql for syntax errors
   ```
3. Check for breaking changes:
   - Removed fields
   - Changed field types
   - Removed types
4. Verify all resolvers have corresponding schema fields
5. Check AWS AppSync directive usage:
   - `@aws_api_key`
   - `@aws_iam`
   - `@aws_lambda`
6. Test schema in nonprod first

**Schema Validation**:
```bash
# Validate schema syntax
graphql-schema-linter dist/schema.graphql

# Test schema compatibility
# Use AWS AppSync schema validation in console
```

---

#### 7. Pipeline Function Failures

**Symptoms**: Partial responses, errors in pipeline execution

**Potential Causes**:
- Function logic errors
- Missing data in `ctx.stash`
- Early return conditions not met
- Data source errors mid-pipeline

**Resolution Steps**:
1. Identify failing function in pipeline:
   ```
   fields @timestamp, fieldName, @message
   | filter @message like /pipeline/
   | sort @timestamp desc
   ```
2. Check function-specific CloudWatch logs
3. Review `ctx.stash` data flow between functions
4. Verify early return conditions
5. Test function in isolation (nonprod)
6. Check data source health for that function

**Debugging Pipeline**:
- Log `ctx.stash` at each pipeline stage (nonprod only)
- Use `runtime.earlyReturn()` for short-circuit testing
- Test functions individually via GraphQL queries

---

#### 8. Custom Domain Certificate Issues

**Symptoms**: SSL/TLS errors, certificate validation failures, domain unreachable

**Potential Causes**:
- Certificate expiration
- DNS validation failure
- Route53 record misconfiguration
- CloudFront distribution issues

**Resolution Steps**:
1. Check ACM certificate status in AWS Console
2. Verify DNS validation records in Route53
3. Test domain resolution:
   ```bash
   dig appsync-{env}.fanid.{zone}
   ```
4. Check CNAME record pointing to AppSync CloudFront distribution
5. Verify certificate renewal process
6. Test SSL/TLS:
   ```bash
   openssl s_client -connect appsync-{env}.fanid.{zone}:443
   ```

**Certificate Details**:
- Validation: DNS-based
- Transparency logging: Enabled
- Auto-renewal: ACM handles automatically
- Zones: nonprod-tmaws.io (nonprod), pub-tmaws.io (prod)

## Debugging

### Local Debugging

**Unit Test Debugging**:
```bash
# Run specific test file
npx run test -- path/to/file.spec.ts

# Run tests in watch mode
npx run test -- --watch

# Run with debugger
node --inspect-brk node_modules/.bin/jest --runInBand path/to/file.spec.ts
```

**Resolver Debugging**:
```bash
# Watch mode for automatic rebuild
npx run esbuildWatch

# Build and inspect output
npx run build
cat dist/{resolverName}.js
```

### Remote Debugging

**GraphQL Query Testing** (nonprod):
```bash
# Test with API key
curl -X POST https://appsync-qa1.fanid.nonprod-tmaws.io/graphql \
  -H "x-api-key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { api { __typename } }"
  }'

# Test with IAM signature
aws appsync graphql \
  --api-id {api_id} \
  --query '{"query":"{ api { __typename } }"}' \
  --profile tm-nonprod-Ops-Techops
```

**CloudWatch Insights Queries**:

```sql
-- Find errors by field
fields @timestamp, fieldName, errorType, errorMessage
| filter errorType like /.*/
| stats count() by fieldName
| sort count desc

-- Slowest resolvers
fields @timestamp, fieldName, duration
| sort duration desc
| limit 20

-- Pipeline function execution times
fields @timestamp, fieldName, @message
| filter @message like /pipeline/
| parse @message /pipeline function: (?<function>\w+) duration: (?<duration>\d+)/
| stats avg(duration) by function

-- Authentication failures
fields @timestamp, @message
| filter @message like /Unauthorized|Forbidden|authentication/
| sort @timestamp desc
```

### Feature Test Debugging

```bash
# Run all feature tests with debug output
DEBUG='verifiedfan:*' DEBUG_DEPTH=8 npx run features

# Run specific feature
npx run features:scenario "scenario name"

# Run tests with specific tag
npx run features:tags @wip
```

## Health Checks

### API Health Verification

**GraphQL Introspection** (nonprod only):
```graphql
query {
  __schema {
    queryType {
      name
    }
    mutationType {
      name
    }
  }
}
```

**Simple Query Test**:
```graphql
query {
  api {
    __typename
  }
}
```

### Data Source Health

**DynamoDB**: Check table status and metrics in CloudWatch
**Lambda**: Check function metrics and recent invocations
**EventBridge**: Verify event delivery metrics
**HTTP Endpoints**: Test endpoint availability

## Maintenance Tasks

### Regular Maintenance

**Weekly**:
- Review error logs for patterns
- Check cache hit ratios
- Review latency trends
- Verify backup/disaster recovery processes

**Monthly**:
- Review IAM policies for least privilege
- Audit API key rotation
- Review and optimize DynamoDB capacity
- Check for unused resources

**Quarterly**:
- Security audit
- Performance optimization review
- Disaster recovery drill
- Documentation updates

### API Key Rotation

**Current Configuration**: 365-day API key with automatic rotation

**Manual Rotation Process**:
1. New key auto-generated via `time_rotating` resource (daily check)
2. New key valid 365 days from generation
3. Old key remains valid until expiration
4. Clients update to new key before old key expires

**Monitoring**: Set alert 30 days before expiration

### Schema Evolution

**Best Practices**:
- Never remove fields (deprecate instead using `@deprecated`)
- Add optional fields only
- Use union types for new return types
- Version breaking changes with new root fields

**Deprecation Process**:
1. Add `@deprecated(reason: "...")` to field
2. Notify API consumers
3. Wait for adoption period (typically 90 days)
4. Remove field in next major version

## Contact Information

**On-Call Escalation**:
- Primary: Verified Fan Team
- Secondary: TechOps Infrastructure Team

**Support Channels**:
- Slack: #verified-fan (general), #tm-techops (infrastructure)
- GitLab: git.tmaws.io/verifiedfan/appsync/appsync

**Related Services**:
- Fan Identity Service (PRD2011)
- Demand Service (PRD3292)
- Campaign Service (PRD2011)
- TM Account Service (PRD3292)
