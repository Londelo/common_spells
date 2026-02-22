# Operations - campaign-service

## Overview

This document covers operational procedures, monitoring, alerting, troubleshooting, and maintenance for the campaign-service.

## Monitoring

### Health Checks

**Endpoint**: `/heartbeat`

- **Purpose**: Liveness and readiness probe
- **Method**: GET
- **Expected Response**: HTTP 200
- **Check Interval**: Every 10 seconds
- **Timeout**: 5 seconds
- **Failure Threshold**: 3 consecutive failures

**Verification**:
```bash
# Production East
curl https://vf-camp-srvc.vf.prod9.us-east-1.tktm.io/heartbeat

# Production West
curl https://vf-camp-srvc.vf.prod10.us-west-2.tktm.io/heartbeat
```

### Prometheus Metrics

**Endpoint**: `/metrics`

- **Format**: Prometheus text format
- **Scrape Interval**: Configured in Kubernetes ServiceMonitor
- **Namespace**: prd1541

**Key Metrics**:

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | HTTP request latency by route |
| `http_requests_total` | Counter | Total HTTP requests by route and status |
| `mongodb_operation_duration_seconds` | Histogram | MongoDB operation latency by collection and operation |
| `external_service_duration_seconds` | Histogram | External service call latency (Discovery API, Fastly, etc.) |
| `nodejs_heap_size_used_bytes` | Gauge | Node.js heap memory usage |
| `nodejs_heap_size_total_bytes` | Gauge | Node.js total heap size |
| `process_cpu_user_seconds_total` | Counter | CPU time in user mode |
| `process_cpu_system_seconds_total` | Counter | CPU time in system mode |

**Instrumentation**:
- OpenTelemetry SDK via `@verifiedfan/prometheus`
- `@verifiedfan/tracing` for distributed tracing
- Automatic instrumentation for MongoDB operations
- Automatic instrumentation for HTTP requests
- Automatic instrumentation for external service calls

### Kubernetes Pod Metrics

```bash
# View pod resource usage
kubectl top pods -n prd1541 -l app=vf-camp-srvc

# View pod count
kubectl get pods -n prd1541 -l app=vf-camp-srvc

# Check HPA status
kubectl get hpa -n prd1541
```

**Auto-scaling Configuration**:
- Target: 25% CPU utilization
- Min replicas: 3
- Max replicas: 12
- Scale-up: When CPU > 25% for sustained period
- Scale-down: When CPU < 25% with stabilization window

## Logging

### Log Format

**Format**: JSON (Logstash)

**Standard Fields**:
- `@timestamp` - ISO 8601 timestamp
- `level` - Log level (error, warn, info, debug)
- `message` - Log message
- `correlationId` - Request correlation ID
- `product_code` - PRD1541
- `environment_tag` - kube-prod or kube-nonprod
- `region` - us-east-1 or us-west-2
- `container_name` - /vf-camp-srvc

**Log Levels**:
- `error` - Application errors, exceptions
- `warn` - Warning conditions
- `info` - Informational messages (default)
- `debug` - Detailed debug information

### Log Access

**Elasticsearch**:
- **Index**: `logstash-application_log`
- **Endpoint**: verifiedfan-logs.prod1.us-east-1.prod-tmaws.io
- **Retention**: Per organizational policy

**Query Examples**:
```
# All logs for campaign-service production
product_code:"PRD1541" AND environment_tag:"kube-prod"

# Errors in last hour
product_code:"PRD1541" AND level:"error" AND @timestamp:[now-1h TO now]

# Logs for specific correlation ID
correlationId:"<uuid>"

# Logs for specific request path
message:*"/campaigns"*
```

**Kubernetes Logs**:
```bash
# Tail logs from all pods
kubectl logs -n prd1541 -l app=vf-camp-srvc --tail=100 -f

# Logs from specific pod
kubectl logs -n prd1541 <pod-name> --tail=100 -f

# Logs from fluentd sidecar
kubectl logs -n prd1541 <pod-name> -c fluentd --tail=100
```

### Log File Location

- **Container Path**: `/logs/titan.log`
- **Shipper**: Fluentd sidecar container
- **Flush Interval**: 1 second
- **Chunk Limit**: 8MB
- **Queue Limit**: 64 chunks

### Correlation IDs

Every HTTP request is assigned a correlation ID:
- Header: Configurable via `titan.service.correlationHeaderKey`
- Default: Auto-generated UUID
- Propagated through all downstream calls
- Tracked in logs, metrics, and traces

**Tracing a Request**:
1. Extract correlation ID from response header or log
2. Search logs: `correlationId:"<uuid>"`
3. View all operations for that request

## Alerting

### Kubernetes Alerts

**Pod Health**:
- Alert: Pod not ready for > 5 minutes
- Alert: Pod restart count > 3 in 10 minutes
- Alert: No healthy pods available

**Resource Utilization**:
- Alert: CPU usage > 80% for > 10 minutes
- Alert: Memory usage > 90% for > 5 minutes
- Alert: Persistent high CPU preventing scale-down

**Deployment Issues**:
- Alert: Deployment stuck in progress > 15 minutes
- Alert: Failed deployment

### Application Alerts

**HTTP Errors**:
- Alert: 5xx error rate > 5% for > 5 minutes
- Alert: 4xx error rate > 20% for > 10 minutes
- Alert: Latency p95 > 2 seconds for > 5 minutes

**Database Issues**:
- Alert: MongoDB connection failures
- Alert: MongoDB query latency > 1 second (p95)
- Alert: MongoDB connection pool exhausted

**External Service Issues**:
- Alert: Discovery API error rate > 10%
- Alert: Redis connection failures
- Alert: Kinesis put failures

**Data Issues**:
- Alert: Campaign auto-open failures
- Alert: Campaign auto-close failures
- Alert: Selection refresh queue backup

## Troubleshooting

### Common Issues

#### High Memory Usage

**Symptoms**:
- Pods consuming > 2.5GB memory
- Frequent OOMKilled restarts
- Slow response times

**Diagnosis**:
```bash
# Check pod memory usage
kubectl top pods -n prd1541 -l app=vf-camp-srvc

# Check pod events for OOM kills
kubectl describe pod -n prd1541 <pod-name> | grep -A 5 "OOMKilled"

# Review heap snapshots via debug endpoint (if enabled)
```

**Resolution**:
- Check for memory leaks in recent code changes
- Review Redis cache size and eviction policy
- Consider increasing memory limits
- Investigate long-running operations holding references

#### High CPU Usage

**Symptoms**:
- Pods consuming > 1.5 cores sustained
- Slow response times
- Auto-scaling maxed out

**Diagnosis**:
```bash
# Check CPU usage
kubectl top pods -n prd1541 -l app=vf-camp-srvc

# Check application logs for heavy operations
# Look for long-running database queries, complex transformations
```

**Resolution**:
- Profile application using Node.js profiling tools
- Optimize database queries (add indexes, reduce data fetched)
- Cache expensive computations
- Consider code optimization (reduce complexity)

#### MongoDB Connection Issues

**Symptoms**:
- Errors: "connection pool exhausted"
- Errors: "topology was destroyed"
- Slow database operations

**Diagnosis**:
```bash
# Check logs for MongoDB errors
kubectl logs -n prd1541 -l app=vf-camp-srvc | grep -i mongo

# Verify MongoDB connectivity from pod
kubectl exec -it -n prd1541 <pod-name> -- sh
nc -zv vf-prod-shard-00-00-z84pk.mongodb.net 27017
```

**Resolution**:
- Verify MongoDB cluster health in Atlas dashboard
- Check connection pool configuration
- Review slow queries and add indexes
- Verify network connectivity between Kubernetes and MongoDB Atlas
- Check for long-running operations blocking connections

#### Redis Connection Issues

**Symptoms**:
- Cache misses increase dramatically
- Errors: "Redis connection failed"
- Timeouts on Redis operations

**Diagnosis**:
```bash
# Check logs for Redis errors
kubectl logs -n prd1541 -l app=vf-camp-srvc | grep -i redis

# Test Redis connectivity
kubectl exec -it -n prd1541 <pod-name> -- sh
nc -zv prd3292-prod1-dmnd.t5ssu1.ng.0001.use1.cache.amazonaws.com 6379
```

**Resolution**:
- Check Redis ElastiCache cluster health in AWS console
- Verify security group rules allow access
- Consider increasing Redis timeout configuration
- Review cache key patterns for issues

#### Discovery API Issues

**Symptoms**:
- Event search returns errors
- Venue information unavailable
- High latency on event-related endpoints

**Diagnosis**:
```bash
# Check logs for Discovery API errors
kubectl logs -n prd1541 -l app=vf-camp-srvc | grep -i discovery

# Check metrics for Discovery API call durations
```

**Resolution**:
- Verify Discovery API status (external dependency)
- Check rate limiting on API key
- Verify network connectivity
- Enable/verify Redis caching for Discovery responses

#### Campaign Auto-Open/Close Failures

**Symptoms**:
- Campaigns not transitioning to OPEN status at scheduled time
- Campaigns not transitioning to CLOSED status at end time

**Diagnosis**:
```bash
# Check refresh job logs
kubectl logs -n prd1541 -l app=vf-camp-srvc | grep -i refresh

# Query campaigns stuck in wrong status
# Use MongoDB shell or admin tools to check date.open vs status
```

**Resolution**:
- Verify refresh job is running (check for cron/scheduler)
- Check for errors during status transition
- Manually trigger refresh: `npx run refreshCampaigns` (if available)
- Investigate database locking or transaction issues

### Debugging in Production

#### Enable Debug Logging

Debug logging is controlled via environment variables:

```bash
# Edit deployment to enable debug logging
kubectl set env deployment/vf-camp-srvc -n prd1541 DEBUG='titan*' DEBUG_DEPTH=8

# Wait for pods to restart
kubectl rollout status deployment/vf-camp-srvc -n prd1541

# View debug logs
kubectl logs -n prd1541 -l app=vf-camp-srvc -f
```

**Warning**: Debug logging increases log volume significantly. Disable after troubleshooting.

```bash
# Disable debug logging
kubectl set env deployment/vf-camp-srvc -n prd1541 DEBUG- DEBUG_DEPTH-
```

#### Access Pod Shell

```bash
# Open shell in running pod
kubectl exec -it -n prd1541 <pod-name> -- sh

# Common debugging commands
ps aux                    # Check running processes
netstat -an              # Check network connections
cat /logs/titan.log      # View logs directly
```

#### Port Forwarding for Local Testing

```bash
# Forward pod port to local machine
kubectl port-forward -n prd1541 <pod-name> 8080:8080

# Access service locally
curl http://localhost:8080/heartbeat
```

## Maintenance

### MongoDB Index Management

**Creating Indexes**:
```bash
# Run index creation script
NODE_ENV=prod npx run createMongoIndexes
```

**Index Definitions**: `app/datastore/mongo/indexMap.js`

**Best Practices**:
- Create indexes in pre-deployment stage
- Monitor index creation time (large collections can take time)
- Verify index usage after creation (MongoDB Atlas metrics)

### Deployment Maintenance

**Update Helm Chart Version**:
```yaml
# In .gitlab-ci.yml
CHART_VERSION: "11.6.0"  # Update version
```

**Update Node.js Version**:
```dockerfile
# In Dockerfile and features/Dockerfile
FROM node:18.18.2-alpine  # Update version
```

**Update Base Image**:
```yaml
# In .gitlab-ci.yml
image: tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest
```

### Configuration Updates

**Update Application Config**:
1. Edit environment-specific config file (e.g., `configs/prod.config.yml`)
2. Commit and push to repository
3. Deploy via CI/CD pipeline (configs bundled into image)

**Update Kubernetes Values**:
1. Edit `kube/${CLUSTER}/values.yaml`
2. Commit and push to repository
3. Deploy via CI/CD pipeline

### Certificate Renewal

SSL certificates managed via AWS Certificate Manager (ACM):
- Automatic renewal by AWS
- No manual action required
- Verify certificate ARN in `kube/${CLUSTER}/values.yaml`

### Scaling Configuration Updates

**Adjust Auto-scaling**:
```bash
# Edit HPA
kubectl edit hpa -n prd1541 vf-camp-srvc

# Or update via Helm values
# In kube/common/values.yaml
replicaCount: 3          # Minimum
maxReplicaCount: 12      # Maximum
scalingMetrics:
  targetCPUUtilizationPercentage: 25  # Target CPU
```

**Manual Scaling** (temporary):
```bash
# Scale to specific replica count
kubectl scale deployment/vf-camp-srvc -n prd1541 --replicas=6

# Note: HPA will eventually override manual scaling
```

### Database Maintenance

**MongoDB Maintenance Windows**:
- Coordinate with MongoDB Atlas schedule
- Service remains available during maintenance (replica set)
- Monitor connection metrics during maintenance

**Redis Maintenance Windows**:
- Coordinate with AWS ElastiCache maintenance schedule
- Brief connection interruptions expected
- Application automatically reconnects

### Log Retention

**Elasticsearch Indices**:
- Retention: Per organizational policy
- Archive old logs if needed for compliance
- Monitor index size and performance

**Kubernetes Logs**:
- Stored in pod only (not persistent)
- Logs lost on pod restart
- Rely on Elasticsearch for historical logs

## Runbooks

### Runbook: Service Outage

**Symptoms**: Service returning 5xx errors or not responding

1. **Verify pod health**:
   ```bash
   kubectl get pods -n prd1541 -l app=vf-camp-srvc
   ```

2. **Check pod logs**:
   ```bash
   kubectl logs -n prd1541 -l app=vf-camp-srvc --tail=100
   ```

3. **Check recent deployments**:
   ```bash
   kubectl rollout history deployment/vf-camp-srvc -n prd1541
   ```

4. **Check ingress/ALB**:
   ```bash
   kubectl describe ingress -n prd1541
   ```

5. **If recent deployment, rollback**:
   ```bash
   helm3 rollback vf-camp-srvc -n prd1541
   ```

6. **Escalate** if issue persists after rollback

### Runbook: High Latency

**Symptoms**: p95 latency > 2 seconds

1. **Check pod CPU/memory**:
   ```bash
   kubectl top pods -n prd1541 -l app=vf-camp-srvc
   ```

2. **Review Prometheus metrics**:
   - Check endpoint latency by route
   - Check database operation latency
   - Check external service latency

3. **Check logs for slow operations**:
   ```bash
   kubectl logs -n prd1541 -l app=vf-camp-srvc | grep -i "slow\|timeout"
   ```

4. **Verify external dependencies**:
   - MongoDB Atlas cluster health
   - Redis ElastiCache health
   - Discovery API availability

5. **Scale up if needed**:
   ```bash
   kubectl scale deployment/vf-camp-srvc -n prd1541 --replicas=8
   ```

### Runbook: Database Issues

**Symptoms**: MongoDB errors in logs

1. **Verify MongoDB cluster health** in Atlas dashboard

2. **Check connection pool**:
   ```bash
   kubectl logs -n prd1541 -l app=vf-camp-srvc | grep -i "connection pool"
   ```

3. **Review slow queries** in Atlas Performance Advisor

4. **Create missing indexes** if needed:
   ```bash
   NODE_ENV=prod npx run createMongoIndexes
   ```

5. **Restart pods** to reset connection pool:
   ```bash
   kubectl rollout restart deployment/vf-camp-srvc -n prd1541
   ```

### Runbook: Cache Issues

**Symptoms**: Redis errors, high cache miss rate

1. **Check Redis cluster health** in AWS ElastiCache console

2. **Verify connectivity**:
   ```bash
   kubectl exec -it -n prd1541 <pod-name> -- sh
   nc -zv <redis-host> 6379
   ```

3. **Check cache metrics**:
   - Cache hit rate
   - Eviction rate
   - Connection count

4. **Review cache TTL settings** in config files

5. **Restart pods** to reset Redis connections:
   ```bash
   kubectl rollout restart deployment/vf-camp-srvc -n prd1541
   ```

## Disaster Recovery

### Backup Strategy

**MongoDB**:
- Automated backups via MongoDB Atlas
- Point-in-time recovery available
- Snapshot retention per Atlas configuration

**Configuration**:
- All configuration in Git (source of truth)
- Helm values and app configs version controlled

**Docker Images**:
- Images stored in ECR with retention policy
- Build version tagged for traceability

### Recovery Procedures

**Complete Service Restoration**:

1. **Deploy from Git**:
   ```bash
   # Checkout specific version
   git checkout <commit-or-tag>

   # Deploy via CI/CD or manual Helm
   sh kube/install.sh <fqdn> vf-camp-srvc values.yaml
   ```

2. **Restore MongoDB** (if needed):
   - Use MongoDB Atlas restore feature
   - Point-in-time or snapshot restore
   - Update connection strings if cluster recreated

3. **Verify health**:
   ```bash
   curl https://vf-camp-srvc.vf.prod9.us-east-1.tktm.io/heartbeat
   kubectl get pods -n prd1541 -l app=vf-camp-srvc
   ```

**Data Loss Scenarios**:
- MongoDB: Restore from Atlas backup
- Redis: Cache rebuilt on demand (no persistent data)
- Logs: Lost if not shipped to Elasticsearch

## Security Operations

### Security Monitoring

- Monitor for unusual API access patterns
- Review authentication failures
- Check for unauthorized configuration changes

### Credential Rotation

**MongoDB Credentials**:
1. Create new credentials in MongoDB Atlas
2. Update `configs/prod.config.yml` (encrypted)
3. Deploy updated config
4. Revoke old credentials after verification

**API Keys** (Discovery, Fastly, GitLab):
1. Generate new key in respective service
2. Update `configs/prod.config.yml`
3. Deploy updated config
4. Revoke old key after verification

**IAM Role**:
- Managed by infrastructure team
- No application code changes required
- Pods automatically use new permissions

### Incident Response

**In case of security incident**:
1. Assess impact and scope
2. Isolate affected resources if necessary
3. Review access logs and audit trails
4. Rotate credentials if compromised
5. Document incident and remediation
6. Update security procedures

## Performance Optimization

### Query Optimization

1. Monitor slow queries in MongoDB Atlas Performance Advisor
2. Add indexes as needed (update `indexMap.js`)
3. Review query patterns in code
4. Consider data model changes for common queries

### Caching Strategy

1. Review cache hit rates in Redis metrics
2. Adjust TTL values in config for optimal hit rate
3. Identify frequently accessed data for caching
4. Consider cache warming for predictable access patterns

### Resource Tuning

1. Review CPU/memory usage patterns over time
2. Adjust resource requests/limits if consistently over/under-utilized
3. Optimize auto-scaling thresholds based on traffic patterns
4. Consider vertical scaling (larger node types) vs horizontal scaling

## Contact Information

**Service Ownership**: Titan Team

**Escalation**:
- L1: On-call engineer (via PagerDuty)
- L2: Titan team lead
- L3: Platform engineering team

**Related Services**:
- MongoDB Atlas: Contact infrastructure team
- AWS Services: Contact cloud operations team
- Kubernetes Cluster: Contact platform team
