# Operations - admin-ui-next

## Monitoring and Observability

### Prometheus Metrics

The application exposes Prometheus-compatible metrics for monitoring.

**Endpoint**: `/metrics`

**Metrics Provider**: `prom-client` (Node.js)

**Default Metrics**:
- `nodejs_version_info` - Node.js version information
- `process_cpu_*` - CPU usage metrics
- `process_resident_memory_bytes` - Memory usage
- `process_heap_bytes` - Heap memory usage
- `nodejs_eventloop_lag_*` - Event loop lag
- `nodejs_active_handles` - Active handles count
- `nodejs_active_requests` - Active requests count
- `nodejs_gc_*` - Garbage collection metrics
- `nodejs_external_memory_bytes` - External memory

**Scraping Configuration**:
```yaml
metrics:
  enabled: true
  path: /metrics
  scheme: http
```

Kubernetes automatically scrapes metrics based on pod annotations.

### Health Monitoring

**Health Check Endpoint**: `/heartbeat`

**Response Format**:
```json
{
  "status": "OK"
}
```

**Probe Configuration**:

**Liveness Probe** (Is the app alive?):
- Initial Delay: 30 seconds
- Timeout: 5 seconds
- Period: 10 seconds (check every 10s)
- Success Threshold: 1
- Failure Threshold: 3 (restart after 3 failures)

**Readiness Probe** (Can the app receive traffic?):
- Initial Delay: 30 seconds
- Timeout: 5 seconds
- Period: 10 seconds
- Success Threshold: 1
- Failure Threshold: 3 (remove from load balancer after 3 failures)

### Logging

#### Log Collection: Fluentd

**Sidecar Container**: fluentd

**Configuration**:
- Log Path: `/logs/titan.log`
- Format: JSON
- Tag: `titan.logs`

**Log Enrichment**:

All logs are automatically enriched with:
- `product_code`: PRD1541
- `environment_tag`: Environment-specific (e.g., kube-qa, kube-prod)
- `region`: us-east-1
- `container_name`: /admin-ui-next

**Log Destinations**:

| Environment | Elasticsearch URL |
|-------------|-------------------|
| QA | http://verifiedfan-logs.qa1.us-east-1.nonprod-tmaws.io |
| Dev | http://verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io |
| Preprod | http://verifiedfan-logs.preprod1.us-east-1.prod-tmaws.io |
| Production | http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io |

**Log Format**:
- Logstash format enabled
- Index prefix: `logstash-application_log`
- Tag key: `@log_name`

**Buffer Configuration**:
- Flush Interval: 1 second
- Chunk Limit: 8MB
- Queue Limit: 64 chunks

#### Searching Logs

Logs are available in AWS Elasticsearch/OpenSearch:

**Query Example**:
```
product_code:"PRD1541" AND container_name:"/admin-ui-next" AND environment_tag:"kube-prod"
```

**Common Search Patterns**:

1. Error logs:
```
product_code:"PRD1541" AND level:"error"
```

2. Logs for specific request:
```
product_code:"PRD1541" AND request_id:"abc-123"
```

3. Time-range queries:
```
product_code:"PRD1541" AND @timestamp:[now-1h TO now]
```

### Distributed Tracing: Jaeger

**Service**: Jaeger Agent (sidecar)

**Configuration**:
- Collector Host: `jaeger-collector.prd121.svc.cluster.local`
- Port: 8080
- Agent Image: `jaegertracing/jaeger-agent:1.8`

**Resources**:
- CPU Request: 256m
- Memory Request: 128Mi
- Memory Limit: 512Mi

**Access Jaeger UI**:

Jaeger traces can be viewed through the centralized Jaeger UI. Contact DevOps for access.

## Common Operations

### Viewing Pod Status

```bash
# List all pods in namespace
kubectl get pods -n prd1541 -l app=admin-ui-next

# Watch pod status in real-time
kubectl get pods -n prd1541 -l app=admin-ui-next -w

# Get detailed pod information
kubectl describe pod <pod-name> -n prd1541

# View pod events
kubectl get events -n prd1541 --field-selector involvedObject.name=<pod-name>
```

### Viewing Logs

```bash
# View logs from specific pod
kubectl logs <pod-name> -n prd1541

# Follow logs in real-time
kubectl logs -f <pod-name> -n prd1541

# View logs from previous container (if crashed)
kubectl logs <pod-name> -n prd1541 --previous

# View logs from specific container in pod
kubectl logs <pod-name> -n prd1541 -c admin-ui-next

# View logs from all pods with label
kubectl logs -n prd1541 -l app=admin-ui-next --all-containers=true
```

### Accessing Pod Shell

```bash
# Execute shell in running pod
kubectl exec -it <pod-name> -n prd1541 -- sh

# Run a single command
kubectl exec <pod-name> -n prd1541 -- ls -la /app

# Check container filesystem
kubectl exec <pod-name> -n prd1541 -- cat /app/server.js
```

### Scaling Operations

```bash
# Manually scale deployment
kubectl scale deployment admin-ui-next -n prd1541 --replicas=6

# View HPA (Horizontal Pod Autoscaler) status
kubectl get hpa -n prd1541

# Describe HPA for details
kubectl describe hpa admin-ui-next -n prd1541
```

### Service and Endpoint Verification

```bash
# List services
kubectl get svc -n prd1541 -l app=admin-ui-next

# Describe service
kubectl describe svc admin-ui-next -n prd1541

# Check endpoints
kubectl get endpoints admin-ui-next -n prd1541

# Test service from another pod
kubectl run -it --rm debug --image=alpine --restart=Never -- \
  wget -qO- http://admin-ui-next.prd1541.svc.cluster.local:8080/heartbeat
```

### Ingress/ALB Verification

```bash
# Get ingress details
kubectl get ingress -n prd1541 -l app=admin-ui-next

# Describe ingress for ALB details
kubectl describe ingress admin-ui-next -n prd1541

# Check ALB annotations
kubectl get ingress admin-ui-next -n prd1541 -o yaml
```

## Troubleshooting

### Issue: Pod Won't Start (CrashLoopBackOff)

**Symptoms**:
- Pod status shows `CrashLoopBackOff`
- Pod restart count increasing

**Diagnosis**:
```bash
# Check pod events
kubectl describe pod <pod-name> -n prd1541

# View previous container logs
kubectl logs <pod-name> -n prd1541 --previous

# Check if image can be pulled
kubectl get events -n prd1541 | grep <pod-name>
```

**Common Causes**:
1. **Application error at startup**
   - Check logs for errors
   - Verify environment variables
   - Check configuration files

2. **Health check failing**
   - Verify `/heartbeat` endpoint works
   - Check initialDelaySeconds is sufficient
   - Review application startup time

3. **Resource limits**
   - Check if OOMKilled (Out of Memory)
   - Review memory limits vs actual usage
   - Consider increasing resource limits

**Resolution**:
```bash
# Fix: Update health check timing
helm3 upgrade admin-ui-next tm/webservice \
  -f kube/common/values.yaml \
  -f kube/${CLUSTER}/values.yaml \
  --set livenessProbe.initialDelaySeconds=60

# Fix: Increase memory limits
--set resources.limits.memory=2Gi
```

### Issue: 503 Service Unavailable

**Symptoms**:
- ALB returns 503 errors
- Application unreachable

**Diagnosis**:
```bash
# Check pod readiness
kubectl get pods -n prd1541 -l app=admin-ui-next

# Check service endpoints
kubectl get endpoints admin-ui-next -n prd1541

# Test from within cluster
kubectl run -it --rm debug --image=alpine --restart=Never -- \
  wget -qO- http://admin-ui-next.prd1541.svc.cluster.local:8080/heartbeat

# Check ALB target group in AWS Console
```

**Common Causes**:
1. **No ready pods**
   - Pods failing health checks
   - All pods restarting

2. **Service selector mismatch**
   - Labels don't match pods

3. **ALB target group unhealthy**
   - Wrong health check path
   - Health check timing too aggressive

**Resolution**:
```bash
# Force pod restart
kubectl rollout restart deployment admin-ui-next -n prd1541

# Verify service selector
kubectl get svc admin-ui-next -n prd1541 -o yaml | grep selector

# Check pod labels
kubectl get pods -n prd1541 --show-labels | grep admin-ui-next
```

### Issue: High Memory Usage / OOMKilled

**Symptoms**:
- Pods show `OOMKilled` status
- Frequent pod restarts
- Memory usage approaching limits

**Diagnosis**:
```bash
# Check current memory usage
kubectl top pods -n prd1541 -l app=admin-ui-next

# View pod resource limits
kubectl describe pod <pod-name> -n prd1541 | grep -A 5 Limits

# Check metrics over time (Prometheus)
# Query: container_memory_usage_bytes{pod=~"admin-ui-next.*"}
```

**Common Causes**:
1. **Memory leak in application**
2. **Insufficient memory limits**
3. **Unexpected traffic spike**

**Resolution**:
```bash
# Temporary: Restart affected pods
kubectl delete pod <pod-name> -n prd1541

# Permanent: Increase memory limits
helm3 upgrade admin-ui-next tm/webservice \
  --reuse-values \
  --set resources.limits.memory=4Gi
```

**Prevention**:
- Monitor `/metrics` endpoint for memory trends
- Set up alerts for memory usage >80%
- Review application for memory leaks

### Issue: High CPU Usage / Performance Issues

**Symptoms**:
- Slow response times
- CPU throttling
- HPA scaling out to max replicas

**Diagnosis**:
```bash
# Check CPU usage
kubectl top pods -n prd1541 -l app=admin-ui-next

# View HPA status
kubectl get hpa admin-ui-next -n prd1541

# Check pod count
kubectl get pods -n prd1541 -l app=admin-ui-next --no-headers | wc -l
```

**Common Causes**:
1. **Traffic spike**
2. **Inefficient code path**
3. **Insufficient CPU limits**
4. **Too few replicas for load**

**Resolution**:
```bash
# Immediate: Manual scale up
kubectl scale deployment admin-ui-next -n prd1541 --replicas=10

# Check if at HPA max
kubectl describe hpa admin-ui-next -n prd1541

# Increase max replicas if needed
helm3 upgrade admin-ui-next tm/webservice \
  --reuse-values \
  --set maxReplicaCount=20
```

### Issue: Deployment Stuck (Not Rolling Out)

**Symptoms**:
- Helm upgrade appears stuck
- New pods not starting
- Old pods not terminating

**Diagnosis**:
```bash
# Check deployment status
kubectl rollout status deployment admin-ui-next -n prd1541

# View deployment history
kubectl rollout history deployment admin-ui-next -n prd1541

# Check replica sets
kubectl get rs -n prd1541 -l app=admin-ui-next

# Check pod creation events
kubectl get events -n prd1541 --sort-by='.lastTimestamp' | grep admin-ui-next
```

**Common Causes**:
1. **New pods failing health checks**
2. **Image pull errors**
3. **Resource quota exceeded**
4. **PodDisruptionBudget blocking**

**Resolution**:
```bash
# Rollback deployment
kubectl rollout undo deployment admin-ui-next -n prd1541

# Or via Helm
helm3 rollback admin-ui-next -n prd1541

# Check quota limits
kubectl describe resourcequota -n prd1541
```

### Issue: Can't Pull Docker Image

**Symptoms**:
- `ImagePullBackOff` or `ErrImagePull`
- Pods stuck in Pending state

**Diagnosis**:
```bash
# Check pod events
kubectl describe pod <pod-name> -n prd1541 | grep -A 10 Events

# Verify image exists in ECR
aws ecr describe-images \
  --repository-name titan/admin-ui-next \
  --image-ids imageTag=${BUILD_VERSION}

# Check IAM role
kubectl describe pod <pod-name> -n prd1541 | grep iam.amazonaws.com/role
```

**Common Causes**:
1. **Image tag doesn't exist**
2. **IAM role lacks ECR permissions**
3. **Wrong ECR repository**

**Resolution**:
```bash
# Verify correct image tag
kubectl get deployment admin-ui-next -n prd1541 -o yaml | grep image:

# Update to working tag
helm3 upgrade admin-ui-next tm/webservice \
  --reuse-values \
  --set image.tag=<working-tag>
```

## Alerting

### Recommended Alerts

#### Critical Alerts

1. **Pod CrashLooping**
   - Condition: Pod restart count > 5 in 10 minutes
   - Action: Page on-call engineer

2. **Service Unavailable**
   - Condition: No ready pods for 5 minutes
   - Action: Page on-call engineer

3. **High Error Rate**
   - Condition: HTTP 5xx rate > 5% for 5 minutes
   - Action: Page on-call engineer

4. **All Pods Restarting**
   - Condition: All replicas restarting simultaneously
   - Action: Page on-call engineer immediately

#### Warning Alerts

1. **High Memory Usage**
   - Condition: Memory usage > 80% of limit for 10 minutes
   - Action: Notify team, investigate

2. **High CPU Usage**
   - Condition: CPU usage > 80% for 10 minutes
   - Action: Notify team, consider scaling

3. **Pod Not Ready**
   - Condition: Pod not ready for 5 minutes
   - Action: Notify team

4. **Approaching Max Replicas**
   - Condition: Replica count >= 90% of max for 15 minutes
   - Action: Consider increasing maxReplicaCount

5. **Image Pull Errors**
   - Condition: Any ImagePullBackOff
   - Action: Check CI/CD pipeline, verify ECR

## Maintenance Windows

### Regular Maintenance Tasks

1. **Weekly**: Review logs for errors and warnings
2. **Weekly**: Check resource usage trends
3. **Monthly**: Review and prune old Docker images in ECR
4. **Quarterly**: Review and update dependencies
5. **Quarterly**: Load testing and capacity planning

### Planned Maintenance Procedure

1. **Pre-maintenance**:
   - Announce maintenance window
   - Verify rollback procedure
   - Prepare monitoring dashboards

2. **During maintenance**:
   - Deploy changes to non-production first
   - Monitor metrics closely
   - Keep rollback option ready

3. **Post-maintenance**:
   - Verify all services healthy
   - Monitor for 30 minutes
   - Document any issues

## Runbooks

### Emergency Rollback

**When to use**: Critical production issue requiring immediate rollback

**Steps**:
```bash
# 1. Identify last working release
helm3 history admin-ui-next -n prd1541

# 2. Rollback to previous release
helm3 rollback admin-ui-next -n prd1541

# 3. Verify rollback success
kubectl rollout status deployment admin-ui-next -n prd1541

# 4. Check pod health
kubectl get pods -n prd1541 -l app=admin-ui-next

# 5. Test application
curl -k https://admin.verifiedfan.ticketmaster.com/heartbeat

# 6. Monitor metrics for 15 minutes
```

**Expected duration**: 5-10 minutes

### Scaling for Expected Traffic Spike

**When to use**: Anticipated traffic increase (e.g., major event)

**Steps**:
```bash
# 1. Calculate required capacity
# Rule of thumb: 1 pod per 1000 concurrent users

# 2. Pre-scale deployment
kubectl scale deployment admin-ui-next -n prd1541 --replicas=15

# 3. Verify all pods ready
kubectl get pods -n prd1541 -l app=admin-ui-next

# 4. Optional: Temporarily disable HPA
kubectl delete hpa admin-ui-next -n prd1541

# 5. Monitor during event
watch kubectl get pods -n prd1541 -l app=admin-ui-next

# 6. After event: Scale down
kubectl scale deployment admin-ui-next -n prd1541 --replicas=4

# 7. Re-enable HPA if disabled
helm3 upgrade admin-ui-next tm/webservice --reuse-values
```

### Investigating Slow Response Times

**Steps**:

1. **Check pod health**:
```bash
kubectl get pods -n prd1541 -l app=admin-ui-next
```

2. **Review metrics**:
- CPU usage: Should be < 80%
- Memory usage: Should be < 80%
- Event loop lag (from `/metrics`)

3. **Check logs for errors**:
```bash
kubectl logs -n prd1541 -l app=admin-ui-next --tail=100 | grep -i error
```

4. **Check Jaeger traces**:
- Identify slow operations
- Look for database query times
- Check external API calls

5. **Review resource utilization**:
```bash
kubectl top pods -n prd1541 -l app=admin-ui-next
```

6. **Scale if needed**:
```bash
kubectl scale deployment admin-ui-next -n prd1541 --replicas=8
```

## On-Call Information

### Escalation Path

1. **L1**: On-call engineer (PagerDuty)
2. **L2**: Team lead
3. **L3**: Platform engineering team
4. **L4**: Director of Engineering

### Key Contacts

- **Team**: Titan/VerifiedFan Team
- **Product Code**: PRD1541
- **Slack Channels**: #titan-alerts, #verifiedfan-ops
- **PagerDuty Service**: (Contact team lead for details)

### Quick Reference

**Application Name**: admin-ui-next
**Namespace**: prd1541
**Cluster Production**: prod9.us-east-1
**Cluster Preprod**: preprod9.us-east-1
**Cluster Nonprod**: nonprod9.us-east-1
**ECR Repository**: titan/admin-ui-next
**Helm Chart**: tm/webservice:11.6.0
**Health Check**: `/heartbeat`
**Metrics**: `/metrics`

### Emergency Contacts

For production outages:
1. Check #titan-alerts Slack channel
2. Review recent deployments in GitLab CI
3. Check AWS status page for regional issues
4. Escalate to platform team if infrastructure issue
