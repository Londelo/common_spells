# Operations - entry-service

## Overview

This document covers operational procedures, monitoring, alerting, and troubleshooting for the entry-service.

## Monitoring

### Prometheus Metrics

The service exposes metrics at `/metrics` endpoint in Prometheus format.

**Key Metrics:**

- **HTTP Request Counters**: Track all incoming requests by endpoint, method, and status
- **Response Duration**: Histogram of response times
- **System Metrics**: CPU, memory, event loop lag (collected every 10 seconds)
- **Custom Business Metrics**: Application-specific counters and gauges

**Metric Requirements:**
- All metrics must have cardinality < 70 (enforced by tests)
- No metric labels should contain MongoDB ObjectIds (high cardinality)
- Metrics are scraped by Kubernetes Service Monitor

**Access Metrics:**

```bash
# In cluster
curl http://vf-ent-srvc:8080/metrics

# From external (port-forward)
kubectl port-forward -n prd1541 svc/vf-ent-srvc 8080:8080
curl http://localhost:8080/metrics
```

### Health Checks

#### Heartbeat Endpoint

```bash
curl https://vf-ent-srvc.vf.prod9.us-east-1.tktm.io/heartbeat
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

**Used By:**
- Kubernetes liveness probe (every 10 seconds)
- Kubernetes readiness probe (every 10 seconds)
- ALB health checks
- External monitoring systems

### Logging

#### Log Locations

**Container:**
- **Path**: /logs/titan.log
- **Format**: JSON (Logstash-compatible)
- **Console**: Logstash format enabled

**Elasticsearch:**
- **Production Index**: logstash-application_log-*
- **Endpoint**: http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io
- **Region**: us-east-1
- **Tags**:
  - product_code: PRD1541
  - environment_tag: kube-prod
  - region: us-east-1
  - container_name: /vf-ent-srvc

#### Log Levels

- **Default**: info
- **Debug**: Set DEBUG='titan*' environment variable
- **Depth**: DEBUG_DEPTH=8 for nested object inspection

#### Accessing Logs

**Via kubectl:**

```bash
# Application logs
kubectl logs -n prd1541 -l app=vf-ent-srvc --tail=100 -f

# Specific pod
kubectl logs -n prd1541 <pod-name> -c vf-ent-srvc --tail=100 -f

# Fluentd sidecar logs
kubectl logs -n prd1541 <pod-name> -c fluentd
```

**Via Elasticsearch/Kibana:**

Search for:
- `product_code: PRD1541`
- `container_name: /vf-ent-srvc`
- `environment_tag: kube-prod`

### Distributed Tracing

**OpenTelemetry Configuration:**

- **Service Name**: vf.ent-srvc
- **Tracer Name**: ent-srvc
- **Collector**: otel-collector-agent.prd3786.svc.cluster.local:4318
- **Protocol**: OTLP/HTTP
- **Encryption**: None (cluster-internal)
- **Product Code**: prd1541

**Trace Context:**
- **Header**: x-titan-correlation-id
- **Propagation**: Automatic across service boundaries
- **Sampling**: Configured at collector level

### Dashboard Recommendations

**Suggested Dashboards:**

1. **Service Health**
   - Request rate (requests/sec)
   - Error rate (4xx, 5xx)
   - Response time (p50, p95, p99)
   - Pod count and status

2. **Resource Utilization**
   - CPU usage (vs request/limit)
   - Memory usage (vs request/limit)
   - Network I/O
   - Container restarts

3. **Dependencies**
   - MongoDB connection pool
   - MongoDB query duration
   - AWS service call duration (Kinesis, S3, SQS, DynamoDB)
   - Downstream service response times (user-service, campaign-service)

4. **Business Metrics**
   - Entry creation rate
   - Entry update rate
   - Failed registrations
   - Scoring retry queue depth

## Alerting

### Recommended Alerts

#### Critical Alerts

**Pod Crash Loop**
- Condition: Pod restart count > 3 in 5 minutes
- Action: Page on-call engineer
- Runbook: Check pod logs for startup errors

**High Error Rate**
- Condition: 5xx error rate > 5% for 5 minutes
- Action: Page on-call engineer
- Runbook: Check application logs and downstream dependencies

**Service Unavailable**
- Condition: All pods down for > 1 minute
- Action: Page on-call engineer
- Runbook: Check deployment status, Kubernetes events

**Database Connection Failure**
- Condition: MongoDB connection errors > 0 for 2 minutes
- Action: Page on-call engineer
- Runbook: Check MongoDB Atlas status, network connectivity

#### Warning Alerts

**High Response Time**
- Condition: p95 response time > 1000ms for 10 minutes
- Action: Notify team channel
- Runbook: Check database performance, review slow queries

**High Memory Usage**
- Condition: Memory usage > 80% of limit for 15 minutes
- Action: Notify team channel
- Runbook: Check for memory leaks, review resource limits

**High CPU Usage**
- Condition: CPU usage > 80% of limit for 15 minutes
- Action: Notify team channel
- Runbook: Consider scaling up, investigate hot paths

**Low Replica Count**
- Condition: Available pods < 3 for 5 minutes
- Action: Notify team channel
- Runbook: Check for failing pods, insufficient cluster capacity

#### Info Alerts

**Deployment in Progress**
- Condition: Deployment started
- Action: Post to team channel
- Info: Track deployment progress

**Scaling Event**
- Condition: HPA scaled pods up or down
- Action: Post to team channel
- Info: Monitor for capacity issues

## Runbooks

### Common Issues

#### Issue: Pod Crash Loop

**Symptoms:**
- Pod status: CrashLoopBackOff
- Repeated restarts
- Service degradation

**Diagnosis:**

```bash
# Check pod status
kubectl get pods -n prd1541 -l app=vf-ent-srvc

# View events
kubectl describe pod -n prd1541 <pod-name>

# Check logs
kubectl logs -n prd1541 <pod-name> --previous
```

**Common Causes:**
1. **Database connection failure**: Check MongoDB Atlas status and credentials
2. **Missing environment variables**: Verify ConfigMap and Secret
3. **Invalid configuration**: Review configs for syntax errors
4. **Port conflict**: Ensure port 8080 is not in use
5. **Out of memory**: Check memory limits and usage patterns

**Resolution:**
1. Fix root cause (config, credentials, etc.)
2. Trigger redeploy or delete failing pod to force recreation
3. Monitor for successful startup

#### Issue: High Response Times

**Symptoms:**
- p95 response time > 1000ms
- User complaints about slowness
- Timeout errors

**Diagnosis:**

```bash
# Check metrics
curl http://<service-fqdn>/metrics | grep response_duration

# Check pod resource usage
kubectl top pods -n prd1541 -l app=vf-ent-srvc

# Review logs for slow operations
kubectl logs -n prd1541 -l app=vf-ent-srvc | grep -i "slow\|timeout\|duration"
```

**Common Causes:**
1. **Database slow queries**: Use MongoDB Atlas performance advisor
2. **Downstream service delays**: Check user-service and campaign-service health
3. **High load**: Check request rate and consider scaling
4. **External API timeouts**: Nudata, AppSync, or other APIs experiencing issues
5. **Memory pressure**: GC pauses due to high memory usage

**Resolution:**
1. Scale up pods if under high load
2. Optimize slow database queries
3. Implement circuit breakers for failing dependencies
4. Review and increase timeout configurations if appropriate
5. Contact external service providers if third-party APIs are slow

#### Issue: MongoDB Connection Errors

**Symptoms:**
- Connection refused errors
- Authentication failures
- Timeout connecting to MongoDB

**Diagnosis:**

```bash
# Check logs for MongoDB errors
kubectl logs -n prd1541 -l app=vf-ent-srvc | grep -i mongo

# Test connectivity from pod
kubectl exec -n prd1541 <pod-name> -- nc -zv vf-prod-shard-00-00-z84pk.mongodb.net 27017

# Verify IAM role and security groups (if applicable)
kubectl describe pod -n prd1541 <pod-name> | grep -A 5 "iam.amazonaws.com/role"
```

**Common Causes:**
1. **Incorrect credentials**: Verify username/password in Secret
2. **Network connectivity**: Check VPC peering or Transit Gateway
3. **IP whitelist**: Ensure Kubernetes cluster IPs are whitelisted in MongoDB Atlas
4. **SSL/TLS issues**: Verify SSL certificate validation
5. **Replica set name mismatch**: Confirm replicaSet option matches cluster

**Resolution:**
1. Update credentials in Secret and restart pods
2. Verify network connectivity and DNS resolution
3. Update IP whitelist in MongoDB Atlas
4. Review SSL configuration in config file
5. Confirm replica set name with MongoDB Atlas settings

#### Issue: Failed Deployments

**Symptoms:**
- Helm upgrade fails
- Pods stuck in Pending or ImagePullBackOff
- Deployment timeout

**Diagnosis:**

```bash
# Check Helm release status
helm3 status vf-ent-srvc -n prd1541

# View Helm history
helm3 history vf-ent-srvc -n prd1541

# Check pod events
kubectl get events -n prd1541 --sort-by='.lastTimestamp'

# Check image pull status
kubectl describe pod -n prd1541 <pod-name> | grep -A 10 Events
```

**Common Causes:**
1. **Invalid image tag**: buildVersion doesn't exist in ECR
2. **Resource constraints**: Insufficient CPU/memory in cluster
3. **Configuration errors**: Invalid values.yaml syntax
4. **Failed health checks**: Liveness/readiness probes failing
5. **Image pull authentication**: ECR credentials expired

**Resolution:**
1. Verify image exists in ECR and tag is correct
2. Check cluster capacity and scale nodes if needed
3. Validate Helm values syntax: `helm3 lint -f kube/common/values.yaml`
4. Review pod logs for startup errors
5. Refresh ECR credentials or check IAM role

#### Issue: High Memory Usage

**Symptoms:**
- Pods approaching memory limit
- OOMKilled events
- Performance degradation

**Diagnosis:**

```bash
# Check current memory usage
kubectl top pods -n prd1541 -l app=vf-ent-srvc

# Check for OOM kills
kubectl get events -n prd1541 | grep OOMKilled

# Enable heap profiling (dev/qa only)
# Add to environment: NODE_OPTIONS=--max-old-space-size=2048 --heap-prof
```

**Common Causes:**
1. **Memory leak**: Unclosed connections, event listeners
2. **Large dataset in memory**: Inefficient data processing
3. **Insufficient limits**: Memory limit too low for workload
4. **High concurrency**: Too many simultaneous requests

**Resolution:**
1. Review recent code changes for memory leaks
2. Implement streaming for large datasets
3. Increase memory limits if necessary (update values.yaml)
4. Reduce concurrency or implement backpressure
5. Restart pods as temporary mitigation

#### Issue: Queue Backlog (SQS)

**Symptoms:**
- Retry score queue depth increasing
- Delayed processing

**Diagnosis:**

```bash
# Check queue depth via AWS CLI
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/889199535989/prd2011-prod1-us-east-1-reg-replica-retry-score \
  --attribute-names ApproximateNumberOfMessages

# Check logs for processing errors
kubectl logs -n prd1541 -l app=vf-ent-srvc | grep -i "retry\|sqs\|queue"
```

**Common Causes:**
1. **Processing failures**: Errors consuming messages
2. **Insufficient consumers**: Not enough pods/workers
3. **Slow processing**: Each message takes too long
4. **Dead letter queue**: Messages repeatedly failing

**Resolution:**
1. Investigate and fix processing errors
2. Scale up pods to increase throughput
3. Optimize message processing logic
4. Review dead letter queue for systematic failures

### Debugging in Production

**Safe Debugging Practices:**

1. **Enable Debug Logging** (use sparingly):
   ```bash
   # Update ConfigMap or deployment to add DEBUG='titan*'
   kubectl set env deployment/vf-ent-srvc -n prd1541 DEBUG='titan*' DEBUG_DEPTH=8
   ```

2. **Port Forward** for local inspection:
   ```bash
   kubectl port-forward -n prd1541 svc/vf-ent-srvc 8080:8080
   # Access metrics, heartbeat locally
   ```

3. **Exec into Pod** (avoid if possible):
   ```bash
   kubectl exec -it -n prd1541 <pod-name> -- /bin/sh
   ```

4. **Review Tracing**:
   - Use correlation ID from error logs
   - Search traces in observability platform
   - Identify slow dependencies or errors

5. **Temporary Scaling**:
   ```bash
   # Scale down to troubleshoot specific pod
   kubectl scale deployment/vf-ent-srvc --replicas=1 -n prd1541

   # Scale back up
   kubectl scale deployment/vf-ent-srvc --replicas=3 -n prd1541
   ```

## Maintenance Windows

### Rolling Updates

- **Strategy**: RollingUpdate (default)
- **Max Unavailable**: 75% (3 pods minimum)
- **Min Ready Seconds**: 15
- **Grace Period**: 30 seconds

**Process:**
1. New pod created
2. Wait 15 seconds after readiness
3. Old pod receives SIGTERM
4. 30-second grace period for graceful shutdown
5. Pod forcefully terminated if still running

### Database Maintenance

**MongoDB Index Creation:**

Before each deployment, indexes are automatically created:

```bash
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes
```

**Scheduled Maintenance:**
- Coordinate with MongoDB Atlas maintenance windows
- Plan deployments outside peak hours
- Notify team in advance

### Cluster Upgrades

**Kubernetes Version Upgrades:**
1. Test in dev/qa environments first
2. Schedule during low-traffic periods
3. Monitor pod stability post-upgrade
4. Rollback plan: Helm rollback ready

## Performance Tuning

### Resource Limits

**Current Configuration:**

| Resource | Request | Limit | Recommendation |
|----------|---------|-------|----------------|
| CPU | 500m | 2 cores | Monitor p95 CPU, adjust if frequently > 80% |
| Memory | 1Gi | 3Gi | Monitor p95 memory, adjust if frequently > 80% |

### Autoscaling

**Horizontal Pod Autoscaler:**

- **Min Replicas**: 3
- **Max Replicas**: 12
- **Target CPU**: 25% of requested
- **Scale-up**: Add pods when CPU > 25% for 2 minutes
- **Scale-down**: Remove pods when CPU < 25% for 5 minutes

**Tuning Recommendations:**
1. Monitor scale-up/down frequency
2. Adjust target CPU if oscillating
3. Consider custom metrics (request rate, queue depth)

### Database Connection Pooling

**MongoDB Connection Pool:**
- Configure via `@verifiedfan/mongodb` library
- Monitor active connections via metrics
- Tune pool size based on replica count and load

## Disaster Recovery

### Backup Strategy

**MongoDB:**
- Automated backups via MongoDB Atlas
- Continuous backup with point-in-time recovery
- Retention: 7-30 days (configured in Atlas)

**Configuration:**
- GitLab repository serves as source of truth
- Helm values files versioned in Git
- Secrets managed via Kubernetes Secrets (backed up by cluster backup solution)

### Recovery Procedures

**Full Service Outage:**

1. Check Kubernetes cluster health
2. Verify external dependencies (MongoDB, AWS services)
3. Rollback to last known good deployment if recent change
4. Scale to minimum viable replica count
5. Gradually scale up as issues resolve

**Data Loss Scenario:**

1. Contact MongoDB Atlas support for point-in-time recovery
2. Coordinate with team on recovery point
3. Test in non-prod environment first
4. Schedule maintenance window for production recovery

**Region Failure:**

1. Verify health of secondary region (US-West if US-East fails)
2. Update DNS or load balancer to route traffic to healthy region
3. Monitor for capacity issues in single region
4. Coordinate with platform team for cluster recovery

## Contacts and Escalation

### On-Call Rotation

- **Primary**: Titan Team on-call engineer
- **Escalation**: Titan Team Lead
- **Platform Support**: Kubernetes/Infrastructure team

### Key Contacts

- **MongoDB Atlas**: Support portal at cloud.mongodb.com
- **AWS Support**: Premium support via AWS Console
- **Kubernetes Platform**: Internal platform team
- **Security Team**: For security incidents

### Incident Response

1. **Acknowledge**: Respond to alert within 5 minutes
2. **Assess**: Determine severity and impact
3. **Communicate**: Update status page / team channel
4. **Mitigate**: Apply immediate fix or workaround
5. **Resolve**: Implement permanent solution
6. **Postmortem**: Document incident and improvements (for Sev1/Sev2)

## Additional Resources

- **GitLab Repository**: https://git.tmaws.io/Titan/entry-service
- **Helm Chart Docs**: tm/webservice chart documentation
- **Kubernetes Cluster**: Contact platform team for cluster access
- **MongoDB Atlas**: https://cloud.mongodb.com (PRD1541 project)
