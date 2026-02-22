# Operations - code-service

## Overview

The code-service runs as a containerized microservice on Kubernetes with comprehensive monitoring, logging, and tracing capabilities. This document covers operational procedures, monitoring, troubleshooting, and maintenance tasks.

## Monitoring

### Prometheus Metrics

#### Metrics Endpoint
- **Path**: `/metrics`
- **Port**: 8080
- **Scheme**: HTTP
- **Format**: Prometheus text format
- **Enabled**: Yes

#### System Metrics
- **Collection Interval**: 10000ms (10 seconds)
- **Auto-collected**: CPU, memory, event loop metrics

#### Custom Application Metrics
The service uses `@verifiedfan/prometheus` package for metrics collection:
- Request duration histograms
- Request count by endpoint
- Error rates
- Code operation metrics (reserve, assign, release)

#### Accessing Metrics
```bash
# Production
curl https://vf-code-srvc.vf.prod9.us-east-1.tktm.io/metrics

# Dev
curl https://vf-code-srvc-dev.vf.nonprod9.us-east-1.tktm.io/metrics

# Via kubectl port-forward
kubectl port-forward -n prd1541 <pod-name> 8080:8080
curl http://localhost:8080/metrics
```

### Health Checks

#### Heartbeat Endpoint
- **Path**: `/heartbeat`
- **Port**: 8080
- **Success Code**: 200
- **Purpose**: Kubernetes liveness and readiness probes

#### Probe Configuration
- **Initial Delay**: 30 seconds
- **Timeout**: 5 seconds
- **Period**: 10 seconds
- **Success Threshold**: 1
- **Failure Threshold**: 3

#### Checking Service Health
```bash
# Production
curl https://vf-code-srvc.vf.prod9.us-east-1.tktm.io/heartbeat

# Via kubectl
kubectl get pods -n prd1541 -l app=vf-code-srvc
kubectl describe pod -n prd1541 <pod-name>
```

### Kubernetes Resource Monitoring

#### View Pod Status
```bash
# List all pods
kubectl get pods -n prd1541 -l app=vf-code-srvc

# Watch pod status
kubectl get pods -n prd1541 -l app=vf-code-srvc -w

# Get detailed pod info
kubectl describe pod -n prd1541 <pod-name>
```

#### View Resource Usage
```bash
# CPU and memory usage
kubectl top pods -n prd1541 -l app=vf-code-srvc

# Node resource usage
kubectl top nodes
```

#### View Deployment Status
```bash
# Deployment status
kubectl get deployment -n prd1541 vf-code-srvc

# Deployment history
kubectl rollout history deployment/vf-code-srvc -n prd1541

# Deployment description
kubectl describe deployment -n prd1541 vf-code-srvc
```

#### Horizontal Pod Autoscaler
```bash
# View HPA status
kubectl get hpa -n prd1541

# HPA details
kubectl describe hpa -n prd1541 <hpa-name>
```

**Production Scaling**:
- Min replicas: 3
- Max replicas: 12
- Target CPU: 25%
- Scale up when average CPU > 25%
- Scale down when CPU < 25% (with cooldown)

## Logging

### Log Configuration

#### Log Outputs
1. **Console**: Logstash JSON format
2. **File**: `/logs/titan.log` (Logstash JSON format)

#### Log Levels
- **Production**: `info`
- **Dev**: `info` (configurable)
- **Available Levels**: error, warn, info, debug

#### Log Components
- **Application Logs**: All service logs
- **Access Logs**: HTTP request/response logs (excluding /metrics, /heartbeat)
- **Error Logs**: Uncaught exceptions and error details

### Fluentd Log Aggregation

#### Sidecar Container
- **Image**: tmhub.io/tm-waiting-room/fluentd:master-3454331
- **Purpose**: Collect logs from `/logs/titan.log` and forward to Elasticsearch
- **Format**: JSON with structured fields

#### Log Fields (Production)
```json
{
  "product_code": "PRD1541",
  "environment_tag": "kube-prod",
  "region": "us-east-1",
  "container_name": "/vf-code-srvc",
  "@log_name": "titan.logs"
}
```

#### Elasticsearch Endpoints

**Production**:
- URL: http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io
- Index prefix: logstash-application_log
- Region: us-east-1

**Dev**:
- URL: http://verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io
- Index prefix: logstash-application_log
- Region: us-east-1

#### Log Buffer Settings
- Flush interval: 1s
- Chunk limit: 8MB
- Queue length: 64

### Accessing Logs

#### View Pod Logs
```bash
# Tail logs from application container
kubectl logs -n prd1541 <pod-name> -c vf-code-srvc --tail=100 -f

# Tail logs from Fluentd sidecar
kubectl logs -n prd1541 <pod-name> -c fluentd --tail=100 -f

# View logs for all pods
kubectl logs -n prd1541 -l app=vf-code-srvc --tail=100

# Get logs from previous container (if crashed)
kubectl logs -n prd1541 <pod-name> -c vf-code-srvc --previous
```

#### Query Elasticsearch/Kibana
1. Access Kibana dashboard
2. Index pattern: `logstash-application_log-*`
3. Filter by:
   - `product_code: "PRD1541"`
   - `container_name: "/vf-code-srvc"`
   - `environment_tag: "kube-prod"` (or kube-dev, etc.)

### Debug Logging

#### Enable Debug Logs
Set environment variable in Kubernetes deployment:
```bash
kubectl set env deployment/vf-code-srvc -n prd1541 DEBUG='titan*'
```

Debug patterns:
- `titan*` - All Titan logs
- `titan:codes*` - Code management logs
- `titan:lib:config` - Configuration logs
- `titan:codes:mongodb` - Database operation logs

#### Disable Debug Logs
```bash
kubectl set env deployment/vf-code-srvc -n prd1541 DEBUG-
```

## Distributed Tracing

### LightStep Configuration

#### Connection Details
- **Collector Host**: lightstep.prd1737.svc.cluster.local
- **Collector Port**: 8080
- **Encryption**: none (internal cluster communication)
- **Region**: us-east-1

#### Service Identification
- **Product Code**: prd1541
- **Product Acronym**: vf
- **Service Name**: code-srvc

#### Trace Data
- Request/response traces
- Database query traces
- External API call traces
- Error traces

### Accessing Traces
1. Access LightStep dashboard
2. Search by service: `code-srvc`
3. Filter by:
   - Product: prd1541
   - Environment: prod/dev/preprod
   - Error status
   - Latency thresholds

## Alerting

### Kubernetes Alerts

#### Pod Health Alerts
- Pod not ready after 30 seconds
- Pod restart count increasing
- Pod OOMKilled
- Pod CrashLoopBackOff

#### Resource Alerts
- CPU usage > 90% sustained
- Memory usage > 90% sustained
- Disk usage > 85%
- HPA unable to scale

#### Deployment Alerts
- Deployment rollout stuck
- Deployment replica count below minimum (3 in prod)
- Too many unavailable pods

### Application Alerts

#### Health Check Failures
- Heartbeat endpoint returning non-200
- Repeated liveness probe failures
- Repeated readiness probe failures

#### Database Alerts
- MongoDB connection failures
- Slow queries (> 1s)
- Index missing warnings

#### Error Rate Alerts
- HTTP 5xx rate > threshold
- Unhandled exceptions
- JWT validation failures

## Troubleshooting

### Common Issues

#### 1. Pod Not Starting

**Symptoms**:
- Pod in `Pending`, `ContainerCreating`, or `CrashLoopBackOff` state

**Diagnosis**:
```bash
# Check pod status
kubectl describe pod -n prd1541 <pod-name>

# Check events
kubectl get events -n prd1541 --sort-by='.lastTimestamp'

# Check logs
kubectl logs -n prd1541 <pod-name>
```

**Common Causes**:
- Image pull failures (check ECR access)
- Insufficient resources (check node capacity)
- Configuration errors (check environment variables)
- MongoDB connection failures (check credentials)

**Resolution**:
```bash
# Check image exists in ECR
aws ecr describe-images --repository-name titan/code-service --region us-east-1

# Check node resources
kubectl describe node <node-name>

# Verify configuration
kubectl get configmap -n prd1541
kubectl describe deployment -n prd1541 vf-code-srvc
```

#### 2. MongoDB Connection Issues

**Symptoms**:
- Logs show "MongoError: connection refused"
- Service responds with 500 errors
- Health check fails

**Diagnosis**:
```bash
# Check logs for MongoDB errors
kubectl logs -n prd1541 <pod-name> | grep -i mongo

# Enable debug logging
kubectl set env deployment/vf-code-srvc -n prd1541 DEBUG='titan:lib:config'
```

**Common Causes**:
- Incorrect MongoDB credentials
- Network connectivity issues
- MongoDB Atlas IP whitelist
- SSL/TLS configuration

**Resolution**:
1. Verify credentials in environment-specific config
2. Check MongoDB Atlas network access
3. Test connection from pod:
```bash
kubectl exec -it -n prd1541 <pod-name> -- /bin/sh
nc -zv nonprod0-shard-00-00-iottj.mongodb.net 27017
```

#### 3. High Memory Usage / OOMKilled

**Symptoms**:
- Pods restarting with OOMKilled
- Memory usage climbing steadily
- Slow response times

**Diagnosis**:
```bash
# Check pod memory usage
kubectl top pod -n prd1541 <pod-name>

# Check memory limits
kubectl describe pod -n prd1541 <pod-name> | grep -A 5 Limits

# Check for memory leaks in logs
kubectl logs -n prd1541 <pod-name> | grep -i memory
```

**Common Causes**:
- Memory leak in application code
- Too many database connections
- Large result sets not streaming
- Insufficient memory limits

**Resolution**:
1. Review recent code changes
2. Check MongoDB query patterns
3. Increase memory limits temporarily:
```bash
kubectl set resources deployment/vf-code-srvc -n prd1541 --limits=memory=4Gi
```
4. Investigate with heap dumps (if needed)

#### 4. Slow Response Times

**Symptoms**:
- Requests timing out
- High latency in traces
- Users reporting slowness

**Diagnosis**:
```bash
# Check pod CPU/memory
kubectl top pod -n prd1541

# Check HPA status
kubectl get hpa -n prd1541

# Review traces in LightStep
# Check slow queries in MongoDB
```

**Common Causes**:
- CPU throttling
- Database slow queries
- Missing indexes
- Insufficient pod replicas

**Resolution**:
1. Scale manually if needed:
```bash
kubectl scale deployment/vf-code-srvc -n prd1541 --replicas=10
```
2. Check database indexes:
```bash
# Run in pod
kubectl exec -it -n prd1541 <pod-name> -- node
> require('./lib/config')
> DEBUG='titan:lib:config' run createMongoIndexes
```
3. Review slow queries in MongoDB Atlas

#### 5. Deployment Rollout Stuck

**Symptoms**:
- Deployment shows "Progressing" for extended time
- Old pods not terminating
- New pods not becoming ready

**Diagnosis**:
```bash
# Check rollout status
kubectl rollout status deployment/vf-code-srvc -n prd1541

# Check rollout history
kubectl rollout history deployment/vf-code-srvc -n prd1541

# Check pod status
kubectl get pods -n prd1541 -l app=vf-code-srvc
```

**Common Causes**:
- Health check failures
- Image pull issues
- Breaking configuration changes
- Insufficient resources

**Resolution**:
```bash
# Rollback to previous version
kubectl rollout undo deployment/vf-code-srvc -n prd1541

# Check specific revision
kubectl rollout history deployment/vf-code-srvc -n prd1541 --revision=<N>

# Rollback to specific revision
kubectl rollout undo deployment/vf-code-srvc -n prd1541 --to-revision=<N>
```

### Debug Mode

#### Enable Debug Logging
```bash
# Enable all Titan debug logs
kubectl set env deployment/vf-code-srvc -n prd1541 DEBUG='titan*'

# Enable specific module debug logs
kubectl set env deployment/vf-code-srvc -n prd1541 DEBUG='titan:codes*'

# Increase debug depth
kubectl set env deployment/vf-code-srvc -n prd1541 DEBUG_DEPTH='8'
```

#### Exec into Running Pod
```bash
# Start interactive shell
kubectl exec -it -n prd1541 <pod-name> -- /bin/sh

# Run Node REPL
kubectl exec -it -n prd1541 <pod-name> -- node

# Check files
kubectl exec -it -n prd1541 <pod-name> -- ls -la /opt/titan

# Check environment
kubectl exec -it -n prd1541 <pod-name> -- env | sort
```

## Maintenance

### Database Index Management

#### Create/Update Indexes

**Manual**:
```bash
# Set environment
export NODE_ENV=prod

# Run index creation
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run createMongoIndexes
```

**Via GitLab CI** (recommended):
- Automatically run during pre-deploy stages
- Configured for dev, preprod, prod environments

#### Verify Indexes
```bash
# Connect to MongoDB and check indexes
db.codes.getIndexes()
```

**Expected Indexes**:
1. `_id.campaign_id: -1, _id.code: 1`
2. `_id.campaign_id: -1, type: 1, date.reserved: -1, date.assigned: -1`
3. `reserveId: -1` (sparse)

### Scaling Operations

#### Manual Scaling
```bash
# Scale up
kubectl scale deployment/vf-code-srvc -n prd1541 --replicas=10

# Scale down
kubectl scale deployment/vf-code-srvc -n prd1541 --replicas=5

# Check current replicas
kubectl get deployment -n prd1541 vf-code-srvc
```

#### Autoscaling Configuration
Edit HPA if needed:
```bash
kubectl edit hpa -n prd1541 <hpa-name>
```

### Configuration Updates

#### Update Environment Variables
```bash
# Set single variable
kubectl set env deployment/vf-code-srvc -n prd1541 NEW_VAR=value

# Remove variable
kubectl set env deployment/vf-code-srvc -n prd1541 NEW_VAR-

# Update from file
kubectl set env deployment/vf-code-srvc -n prd1541 --from=env-file.txt
```

#### Update ConfigMaps
```bash
# Edit configmap
kubectl edit configmap -n prd1541 <configmap-name>

# Restart deployment to pick up changes
kubectl rollout restart deployment/vf-code-srvc -n prd1541
```

### Deployment Updates

#### Redeployment
```bash
# Restart all pods (rolling restart)
kubectl rollout restart deployment/vf-code-srvc -n prd1541

# Check rollout status
kubectl rollout status deployment/vf-code-srvc -n prd1541
```

#### Image Update
```bash
# Update image tag
kubectl set image deployment/vf-code-srvc -n prd1541 \
  vf-code-srvc=889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/code-service:<new-tag>
```

### Resource Cleanup

#### Delete Old ReplicaSets
```bash
# List old replicasets
kubectl get rs -n prd1541

# Delete specific replicaset
kubectl delete rs -n prd1541 <replicaset-name>
```

#### Clean Up Failed Pods
```bash
# Delete failed pods
kubectl delete pod -n prd1541 --field-selector=status.phase=Failed

# Delete evicted pods
kubectl delete pod -n prd1541 --field-selector=status.phase=Evicted
```

## Backup and Recovery

### Database Backups
- MongoDB Atlas provides automated backups
- Point-in-time recovery available
- Snapshots retained per Atlas configuration

### Configuration Backups
- Helm release configurations stored in Git
- Kubernetes manifests versioned in repository
- Environment-specific values in `kube/` directory

### Disaster Recovery

#### Complete Environment Rebuild
```bash
# Redeploy from scratch
sh kube/install.sh <FQDN> <RELEASE_NAME> <VALUES_FILE>

# Example for production
sh kube/install.sh vf-code-srvc.vf.prod9.us-east-1.tktm.io vf-code-srvc values.yaml
```

#### Data Recovery
- Restore MongoDB from Atlas backup
- Verify indexes after restore
- Run smoke tests

## Performance Tuning

### Resource Optimization

#### CPU Tuning
- Monitor CPU usage patterns
- Adjust CPU requests/limits based on actual usage
- Review HPA thresholds

#### Memory Tuning
- Monitor memory usage over time
- Look for memory leaks
- Adjust memory requests/limits

#### Pod Count Optimization
- Review traffic patterns
- Adjust min/max replica counts
- Consider time-of-day scaling

### Database Optimization

#### Query Performance
- Monitor slow queries in MongoDB Atlas
- Review explain plans for queries
- Ensure proper index usage

#### Connection Pooling
- Monitor connection pool metrics
- Adjust pool size if needed
- Check for connection leaks

## Security Operations

### Credential Rotation

#### MongoDB Credentials
1. Generate new password in MongoDB Atlas
2. Update environment-specific config
3. Redeploy service
4. Verify connectivity

#### JWT Keys
1. Generate new key pair
2. Update configuration
3. Deploy to all environments
4. Monitor for authentication failures

### Security Scanning

#### Container Image Scanning
- ECR provides automatic vulnerability scanning
- Review scan results in AWS Console
- Address critical/high vulnerabilities

#### Dependency Scanning
- Run `yarn audit`
- Review security advisories
- Update dependencies as needed

## Monitoring Dashboards

### Recommended Metrics to Track

**Service Health**:
- Request rate (requests/sec)
- Error rate (%)
- Response time (p50, p95, p99)
- Active connections

**Resource Usage**:
- CPU utilization (%)
- Memory utilization (%)
- Pod count
- Network I/O

**Database**:
- Query duration (ms)
- Connection pool usage
- Slow query count
- Index usage

**Business Metrics**:
- Codes reserved per minute
- Codes assigned per minute
- Codes released per minute
- Available code inventory by campaign

## On-Call Runbook

### Immediate Actions for Incidents

1. **Check service status**
   ```bash
   kubectl get pods -n prd1541 -l app=vf-code-srvc
   ```

2. **Check recent events**
   ```bash
   kubectl get events -n prd1541 --sort-by='.lastTimestamp' | head -20
   ```

3. **Check logs for errors**
   ```bash
   kubectl logs -n prd1541 -l app=vf-code-srvc --tail=100 | grep -i error
   ```

4. **Check metrics**
   - Review Prometheus dashboards
   - Check LightStep traces
   - Review Elasticsearch logs

5. **Escalation**
   - Contact: Titan Team
   - Slack channel: #titan-alerts
   - PagerDuty: Titan Service

### Emergency Procedures

#### Complete Service Outage
1. Check Kubernetes cluster health
2. Check MongoDB Atlas status
3. Verify network connectivity
4. Check recent deployments
5. Consider rollback if recent change

#### Partial Degradation
1. Scale up pod count temporarily
2. Check for specific pod issues
3. Review error logs for patterns
4. Check downstream dependencies

#### Data Corruption
1. Stop writes immediately (scale to 0)
2. Assess extent of corruption
3. Restore from MongoDB backup
4. Verify data integrity
5. Resume service
