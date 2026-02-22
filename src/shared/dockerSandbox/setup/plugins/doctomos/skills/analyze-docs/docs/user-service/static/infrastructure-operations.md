# Operations - user-service

## Monitoring & Observability

### Prometheus Metrics

**Endpoint**: `https://<service-fqdn>/metrics`

**Available Metrics:**

#### Application Metrics
- **HTTP Request Duration**: Response time histogram by endpoint and status
- **HTTP Request Counter**: Total requests by endpoint, method, and status
- **Active Requests**: Current in-flight requests

#### System Metrics
- **Node.js Process Metrics**:
  - CPU usage
  - Memory usage (heap, RSS, external)
  - Garbage collection metrics
  - Event loop lag
  - Active handles and requests
- **Collection Interval**: 10 seconds (configurable via `prometheus.systemMetricInterval`)

**Metrics Format**: Prometheus exposition format

**Access**:
- Dev: https://vf-usr-srvc-dev.vf.nonprod9.us-east-1.tktm.io/metrics
- Preprod: https://vf-usr-srvc.vf.preprod9.us-east-1.tktm.io/metrics
- Prod East: https://vf-usr-srvc.vf.prod9.us-east-1.tktm.io/metrics
- Prod West: https://vf-usr-srvc.vf.prod10.us-west-2.tktm.io/metrics

**Note**: `/metrics` endpoint is excluded from:
- JWT authentication
- Tracing
- Access logging
- Response formatting

### Health Checks

**Endpoint**: `https://<service-fqdn>/heartbeat`

**Response**: HTTP 200 (indicates service is healthy)

**Used By**:
- Kubernetes liveness probe (checks if pod should be restarted)
- Kubernetes readiness probe (checks if pod should receive traffic)
- Ingress ALB health checks (expects status code 200)

**Check Intervals**:
- Liveness: Every 10 seconds (after 30s initial delay)
- Readiness: Every 10 seconds (after 30s initial delay)

**Failure Thresholds**:
- 3 consecutive failures trigger pod restart (liveness)
- 3 consecutive failures remove pod from service (readiness)

## Logging

### Log Format

**Format**: JSON (Logstash format)
**Location**: `/logs/titan.log` (container filesystem)

**Log Fields:**
- Timestamp
- Log level (info, warn, error, debug)
- Message
- Correlation ID (x-titan-correlation-id)
- Request/response data
- Error stack traces
- Product code: PRD1541
- Environment tag
- Region
- Container name

### Log Levels

| Level | Purpose | Example |
|-------|---------|---------|
| **error** | Application errors, exceptions | Failed API calls, validation errors |
| **warn** | Warnings, deprecated features | Slow responses, retry attempts |
| **info** | General information, business events | Service started, request completed |
| **debug** | Detailed diagnostic information | Config values, internal state |

**Default Level**: info

**Override**: Set `titan.log.level` in config or `DEBUG` environment variable

### Log Aggregation

**Shipper**: Fluentd sidecar container
**Destination**: AWS Elasticsearch Service

| Environment | Elasticsearch Endpoint |
|-------------|------------------------|
| **Dev** | http://verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io |
| **Prod** | http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io |

**Index Pattern**: `logstash-application_log-*`

**Retention**: Configured at Elasticsearch cluster level

### Accessing Logs

#### Via Kubernetes (Recent Logs)

```bash
# Get pod name
kubectl get pods -n prd1541 -l app=vf-usr-srvc

# Tail logs from main container
kubectl logs -n prd1541 <pod-name> -c vf-usr-srvc --tail=100 -f

# View logs from fluentd sidecar
kubectl logs -n prd1541 <pod-name> -c fluentd
```

#### Via Elasticsearch/Kibana

1. Access Kibana dashboard for environment
2. Use index pattern: `logstash-application_log-*`
3. Filter by:
   - `product_code: "PRD1541"`
   - `container_name: "/vf-usr-srvc"`
   - `environment_tag: "kube-<env>"`

### Debug Logging

**Enable Debug Logs**:
Set `DEBUG` environment variable to enable specific debug namespaces.

```bash
# Enable all titan debug logs
DEBUG='titan*'

# Enable specific namespace
DEBUG='titan:lib:config'

# Multiple namespaces
DEBUG='titan:lib:config,titan:server'
```

**Debug Depth**: Controls object inspection depth (default in CI/CD: 8)

## Distributed Tracing

### OpenTelemetry Configuration

| Setting | Value |
|---------|-------|
| **Product Code** | prd1541 |
| **Service Name** | vf.usr-srvc |
| **Tracer Name** | usr-srvc |
| **Product Acronym** | vf |
| **Product Group** | vf-srvc |

### Collector

**Type**: OpenTelemetry Collector
**Host**: otel-collector-agent.prd3786.svc.cluster.local
**Port**: 4318
**Protocol**: HTTP (OTLP)
**Encryption**: None (internal cluster communication)
**Region**: us-east-1

### Trace Data

**Includes**:
- HTTP request traces
- Service-to-service calls
- Database queries
- External API calls
- Error traces

**Excluded Endpoints**:
- `/metrics`
- `/heartbeat`

## Alerting

### Kubernetes Alerts

**Monitored Conditions**:
- Pod crash loops (CrashLoopBackOff)
- Pod evictions
- Failed liveness/readiness probes
- Resource limit violations (OOMKilled)
- HPA scaling events
- Deployment failures

**Alert Destination**: Configured at cluster level (likely PagerDuty/Slack)

### Application-Level Alerts

**Recommended Alerts** (to be configured in monitoring system):

1. **High Error Rate**
   - Condition: >5% of requests returning 5xx status
   - Severity: High
   - Action: Check logs, recent deployments

2. **High Response Time**
   - Condition: P95 response time >2 seconds
   - Severity: Medium
   - Action: Check resource utilization, database performance

3. **Pod Restart Rate**
   - Condition: >3 restarts in 5 minutes
   - Severity: Critical
   - Action: Check logs for errors, OOM conditions

4. **Low Pod Count**
   - Condition: <2 running pods in production
   - Severity: High
   - Action: Check deployment status, HPA configuration

5. **Failed Health Checks**
   - Condition: /heartbeat returning non-200
   - Severity: Critical
   - Action: Immediate investigation

## Runbooks

### Issue: Service Not Responding (503 errors)

**Symptoms**:
- ALB returning 503
- Clients cannot reach service
- No healthy pods

**Diagnosis**:
```bash
# Check pod status
kubectl get pods -n prd1541 -l app=vf-usr-srvc

# Check pod events
kubectl describe pod <pod-name> -n prd1541

# Check recent logs
kubectl logs -n prd1541 <pod-name> --tail=100
```

**Common Causes**:
1. **All pods failing readiness checks**
   - Check /heartbeat endpoint
   - Review application logs for startup errors
   - Verify MongoDB connectivity

2. **No pods running**
   - Check deployment status: `kubectl get deployment vf-usr-srvc -n prd1541`
   - Check HPA: `kubectl get hpa -n prd1541`
   - Review recent changes in GitLab

3. **Resource exhaustion**
   - Check CPU/memory: `kubectl top pods -n prd1541`
   - Review HPA: May need to increase maxReplicas

**Resolution**:
- If config issue: Rollback deployment
- If resource issue: Scale up or increase limits
- If external dependency: Check MongoDB, TM services

### Issue: High Memory Usage / OOMKilled

**Symptoms**:
- Pods restarting frequently
- OOMKilled events in pod status
- Increased latency before crashes

**Diagnosis**:
```bash
# Check pod events for OOMKilled
kubectl describe pod <pod-name> -n prd1541

# Check current memory usage
kubectl top pod <pod-name> -n prd1541

# Review metrics in Prometheus
# Query: container_memory_usage_bytes{pod=~"vf-usr-srvc.*"}
```

**Common Causes**:
1. Memory leak in application code
2. Insufficient memory limits
3. Large request payloads
4. Inefficient data processing

**Resolution**:
- **Immediate**: Increase memory limits in values.yaml, redeploy
- **Short-term**: Increase maxReplicaCount to distribute load
- **Long-term**: Investigate memory leak, optimize code

### Issue: Slow Response Times

**Symptoms**:
- Increased P95/P99 response times
- Timeouts
- User complaints

**Diagnosis**:
```bash
# Check pod CPU/memory
kubectl top pods -n prd1541 -l app=vf-usr-srvc

# Review logs for slow operations
kubectl logs -n prd1541 <pod-name> | grep -i "slow\|timeout"

# Check external dependencies
# - MongoDB Atlas status
# - TM Identity service status
# - TM UAPI status
```

**Common Causes**:
1. **Database slow queries**
   - Check MongoDB Atlas metrics
   - Review missing indexes
   - Run `createMongoIndexes` if indexes missing

2. **High CPU usage**
   - Check if HPA is scaling appropriately
   - Review CPU limits

3. **External service latency**
   - Check TM Identity response times
   - Check TM Wallet API status
   - Review network issues

4. **DNS resolution delays**
   - Check dnsCacheTTL setting (default: 60s)
   - May need to adjust cache duration

**Resolution**:
- **Database**: Optimize queries, add indexes, check connection pool
- **CPU**: Scale horizontally (HPA), increase CPU limits
- **External services**: Implement circuit breakers, increase timeouts, add retries
- **DNS**: Tune DNS cache TTL

### Issue: Authentication Failures

**Symptoms**:
- 401 Unauthorized errors
- JWT validation failures
- "Invalid token" errors

**Diagnosis**:
```bash
# Check logs for auth errors
kubectl logs -n prd1541 <pod-name> | grep -i "auth\|jwt\|unauthorized"

# Test JWT token parsing
npx run parseToken <token>

# Verify JWT config
DEBUG='titan:lib:config' npx run server:watch
```

**Common Causes**:
1. **Expired JWT token**
   - Check token expiration (`expiresIn: 1d` in config)
   - Client needs to refresh token

2. **Invalid JWT private key**
   - Verify `jwt.privateKey` in config matches key used to sign tokens
   - Check if key was rotated

3. **Missing or malformed Authorization header**
   - Check client request format
   - Should be: `Authorization: Bearer <token>`

**Resolution**:
- Client should obtain new token via `/auth` endpoint
- If key mismatch: Update config with correct private key
- For worker auth: Check worker key in database via `insertMongoWorkerKey`

### Issue: MongoDB Connection Failures

**Symptoms**:
- "MongoDB connection error" in logs
- Service fails to start
- Database operation timeouts

**Diagnosis**:
```bash
# Check logs for MongoDB errors
kubectl logs -n prd1541 <pod-name> | grep -i "mongo\|database"

# Verify MongoDB config
DEBUG='titan:lib:config' DEBUG_DEPTH=8 node -r @babel/register app/index.js

# Check network connectivity (from pod)
kubectl exec -it <pod-name> -n prd1541 -- wget -O- https://nonprod0-shard-00-00-iottj.mongodb.net:27017
```

**Common Causes**:
1. **Invalid credentials**
   - Check `mongo.username` and `mongo.password` in config
   - Verify credentials in MongoDB Atlas

2. **Network connectivity**
   - Check MongoDB Atlas network access whitelist
   - Verify replica set hostnames resolve correctly

3. **SSL/TLS issues**
   - Ensure `mongo.options.ssl: true`
   - Check certificate validity

4. **Replica set misconfiguration**
   - Verify `replicaSet` name matches MongoDB Atlas
   - Check `readPreference` is valid (NEAREST, PRIMARY, etc.)

**Resolution**:
- Update credentials in appropriate config file
- Verify MongoDB Atlas IP whitelist includes Kubernetes cluster IPs
- Run pre-deploy index creation to test connectivity
- Check MongoDB Atlas status dashboard for outages

### Issue: Failed Deployment

**Symptoms**:
- Helm upgrade fails
- New pods not starting
- Deployment stuck in progress

**Diagnosis**:
```bash
# Check deployment status
kubectl get deployment vf-usr-srvc -n prd1541
kubectl rollout status deployment/vf-usr-srvc -n prd1541

# Check recent events
kubectl get events -n prd1541 --sort-by='.lastTimestamp' | grep vf-usr-srvc

# Review Helm release status
helm3 status vf-usr-srvc -n prd1541

# Check Helm history
helm3 history vf-usr-srvc -n prd1541
```

**Common Causes**:
1. **Image pull failures**
   - Verify image exists in ECR
   - Check IAM role has ECR pull permissions
   - Verify image tag is correct

2. **Configuration errors**
   - Invalid values.yaml syntax
   - Missing required config values
   - Incorrect environment variables

3. **Resource constraints**
   - Insufficient cluster resources
   - ResourceQuota exceeded
   - Pod cannot be scheduled

**Resolution**:
```bash
# Rollback to previous version
helm3 rollback vf-usr-srvc -n prd1541

# Fix issue and redeploy
# Update config, push new image, or adjust resources

# Force new deployment with corrected values
sh kube/install.sh <FQDN> <RELEASE> <VALUES_FILE>
```

## Debugging

### Access Pod Shell

```bash
# Get running pod
kubectl get pods -n prd1541 -l app=vf-usr-srvc

# Execute shell in pod
kubectl exec -it <pod-name> -n prd1541 -- /bin/sh

# Common debugging commands inside pod:
# - Check environment: env | sort
# - Check config files: cat /opt/titan/configs/*.yml
# - Check disk space: df -h
# - Check processes: ps aux
# - Test network: wget -O- https://example.com
```

### Port Forwarding

```bash
# Forward local port to service
kubectl port-forward -n prd1541 svc/vf-usr-srvc 8080:8080

# Access service locally
curl http://localhost:8080/heartbeat
```

### Enable Debug Mode

**In Kubernetes Deployment**:

Edit deployment or Helm values to add DEBUG environment variable:

```yaml
env:
  DEBUG: "titan*"
  DEBUG_DEPTH: "8"
```

Redeploy to apply changes.

### Generate and Parse JWT Tokens

```bash
# Generate test token
npx run generateToken '{"userId":"test123","email":"test@example.com"}'

# Parse token to inspect claims
npx run parseToken <jwt-token>
```

## Performance Tuning

### Horizontal Pod Autoscaling

**Current HPA Settings**:
- Target CPU: 25%
- Min replicas: 3 (prod), 1 (dev)
- Max replicas: 12 (prod), 1 (dev)

**Tuning Recommendations**:
- If frequent scaling: Reduce targetCPUUtilizationPercentage to 20%
- If too aggressive: Increase to 30-35%
- If capacity issues: Increase maxReplicaCount

**Apply Changes**: Update values.yaml and redeploy

### Resource Limits

**Current Settings**:

| Environment | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-------------|-------------|-----------|----------------|--------------|
| Dev | 500m | 500m | 512Mi | 1Gi |
| Prod | 500m | 2 cores | 1Gi | 3Gi |

**Tuning Guidelines**:
- Set requests to average usage
- Set limits to peak usage + 20% buffer
- Monitor actual usage via `kubectl top pods`

### DNS Cache TTL

**Current**: 60 seconds (60000ms)

**Tuning**:
- Increase for services with stable IPs: 300s (5 minutes)
- Decrease for frequently changing endpoints: 30s

**Apply**: Update `titan.service.dnsCacheTTL` in config

## Maintenance

### Planned Maintenance Windows

**Recommended Windows**:
- **Dev/QA**: Anytime (low impact)
- **Preprod**: Off-peak hours (evenings/weekends)
- **Production**: Sunday 2-6 AM EST (lowest traffic)

**Maintenance Checklist**:
1. Announce maintenance window
2. Verify rollback plan
3. Monitor deployment carefully
4. Verify health checks after deployment
5. Monitor error rates and latency
6. Keep communication channels open

### Scaling for Events

**High-Traffic Events** (e.g., major ticket sales):

1. **Pre-scale pods**:
   ```bash
   kubectl scale deployment vf-usr-srvc -n prd1541 --replicas=10
   ```

2. **Monitor metrics closely**:
   - Watch Prometheus dashboards
   - Monitor Elasticsearch for errors
   - Track response times

3. **Prepare for rollback**:
   - Have previous version ready
   - Test rollback procedure beforehand

4. **Post-event scale down**:
   - HPA will automatically scale down
   - Or manually: `kubectl scale deployment vf-usr-srvc -n prd1541 --replicas=3`

## Security Operations

### Secrets Rotation

**JWT Private Key Rotation**:
1. Generate new key pair: `npx run RSA:writeNewKeyPair`
2. Update `jwt.privateKey` in all environment configs
3. Deploy to environments sequentially (dev → preprod → prod)
4. Monitor for auth errors during transition

**MongoDB Password Rotation**:
1. Update password in MongoDB Atlas
2. Update `mongo.password` in environment configs
3. Deploy new config
4. Verify connectivity

**OAuth Secrets Rotation**:
1. Rotate secrets in provider platforms (Facebook, Twitter, etc.)
2. Update secrets in config files
3. Deploy and test social auth flows

### Vulnerability Scanning

**Container Images**:
- ECR automatically scans images for vulnerabilities
- Review scan results in AWS ECR console
- Update base images regularly

**Dependencies**:
```bash
# Check for vulnerable packages
yarn audit

# Fix vulnerabilities
yarn audit fix
```

## Disaster Recovery

### Service Outage Response

1. **Identify scope**: Single pod, region, or multi-region?
2. **Check dependencies**: MongoDB, TM services, AWS infrastructure
3. **Attempt quick fixes**:
   - Restart pods: `kubectl rollout restart deployment vf-usr-srvc -n prd1541`
   - Scale up: Increase replica count
4. **If unrecoverable**: Rollback to previous version
5. **Post-incident**: Review logs, identify root cause, implement fixes

### Region Failover

**Current Setup**: Multi-region (us-east-1 and us-west-2)

**Failover Procedure**:
1. Verify us-west-2 region is healthy
2. Update DNS or load balancer to route to us-west-2
3. Monitor us-west-2 for increased load
4. Scale us-west-2 if needed
5. Investigate and repair us-east-1

**Recovery**:
1. Deploy fixes to us-east-1
2. Verify health in us-east-1
3. Gradually shift traffic back
4. Return to normal configuration

### Data Loss Prevention

**MongoDB Backups**:
- Managed by MongoDB Atlas
- Continuous backups with point-in-time recovery
- Verify backup policy in Atlas console

**Configuration Backups**:
- All config stored in Git
- Tagged releases for production deployments
- Helm revisions retained (last 3)

## Contact & Escalation

**On-Call Rotation**: [To be configured]
**Escalation Path**:
1. On-call engineer
2. Team lead
3. Engineering manager
4. Infrastructure team (for cluster issues)
5. MongoDB Atlas support (for database issues)

**Communication Channels**:
- Slack: #titan-alerts (to be configured)
- PagerDuty: [Integration to be set up]
- Status Page: [To be configured]
