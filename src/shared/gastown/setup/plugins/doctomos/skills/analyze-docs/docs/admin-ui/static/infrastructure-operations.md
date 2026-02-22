# Operations - admin-ui

## Overview

This document covers operational procedures, monitoring, logging, alerting, and troubleshooting for the Titan Admin UI application.

---

## Monitoring

### Prometheus Metrics

#### Application Metrics
- **Endpoint**: `/metrics`
- **Port**: 8080
- **Format**: Prometheus exposition format
- **System Metrics Interval**: 10000ms (10 seconds)

#### Auto-Discovery Tags (EC2)
EC2 instances are tagged for automatic Prometheus scraping:
- **Prometheus8080**: enabled (application metrics on port 8080)
- **Prometheus**: enabled (node exporter metrics on port 9100)

#### Available Metrics Categories
1. **Node.js Process Metrics**:
   - Memory usage (heap, RSS, external)
   - CPU usage
   - Event loop lag
   - Active handles and requests

2. **HTTP Metrics** (via titan lib):
   - Request rate
   - Response time distribution
   - Status code counts
   - Endpoint-specific metrics

3. **System Metrics** (node exporter on EC2):
   - CPU utilization
   - Memory usage
   - Disk I/O
   - Network traffic

4. **Container Metrics** (cAdvisor on EC2):
   - Container CPU usage
   - Container memory usage
   - Container network I/O
   - Container filesystem usage

### Health Check

#### Endpoint Details
- **Path**: `/heartbeat`
- **Method**: GET
- **Expected Status**: 200 OK
- **Response Time**: < 3s (ELB timeout)
- **Purpose**: Indicates application is running and responsive

#### Health Check Configuration

**Kubernetes Liveness Probe**:
- Initial delay: 30s
- Timeout: 5s
- Period: 10s
- Success threshold: 1
- Failure threshold: 3

**Kubernetes Readiness Probe**:
- Initial delay: 30s
- Timeout: 5s
- Period: 10s
- Success threshold: 1
- Failure threshold: 3

**ELB Health Check**:
- Healthy threshold: 3
- Unhealthy threshold: 2
- Timeout: 3s
- Interval: 30s

#### What Gets Checked
The heartbeat endpoint should verify:
- Application is running
- Can respond to HTTP requests
- (Optionally) External dependencies are accessible

---

## Logging

### Log Architecture

#### Kubernetes Logging
- **Sidecar**: Fluentd container
- **Image**: tmhub.io/tm-waiting-room/fluentd:master-3454331
- **Log Path**: /logs/titan.log
- **Format**: JSON
- **Tag**: titan.logs

#### EC2 Logging (Legacy)
- **Sidecar**: Fluentd container
- **Image**: 889199535989.dkr.ecr.us-east-1.amazonaws.com/identity/fluent
- **Port**: 24224 (localhost)
- **Docker Log Driver**: fluentd
- **Tag**: admin

### Log Destinations

#### Elasticsearch Endpoints

| Environment | Endpoint |
|-------------|----------|
| Dev | http://verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io |
| Prod | http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io |

#### Log Format
All logs include standardized metadata:
- **product_code**: PRD1541
- **environment_tag**: kube-dev, kube-prod, dev1, prod1, etc.
- **region**: us-east-1
- **container_name**: /admin-ui or /admin
- **instance_id**: EC2 instance ID (EC2 only)
- **ip_address**: Private IPv4 (EC2 only)
- **@log_name**: Logstash tag name

### Log Configuration

#### Application Logging (from default.config.yml)
```yaml
titan:
  log:
    level: info
    console:
      logstash: true
    file: false
```

- **Level**: info (can be changed via config)
- **Console**: Enabled with logstash formatting
- **File**: Disabled (logs go to stdout/Fluentd)

#### Access Log Blacklist
These paths are NOT logged to reduce noise:
- `/metrics`
- `/heartbeat`
- `/favicon.ico`
- `/ui/bundle.js`
- `/ui/fonts/TMSans-Regular.woff`
- `/ui/img/flags/us.svg`

### Fluentd Buffer Settings

**Kubernetes**:
- Flush interval: 1s
- Chunk limit: 8MB
- Queue length: 64

**EC2**:
- Flush interval: 5s
- Buffer chunk limit: 16MB
- Buffer queue limit: 64

### Querying Logs

#### Kibana Access
Logs are sent to Elasticsearch and can be queried via Kibana:
- Dev/QA logs: verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io (check for Kibana endpoint)
- Prod logs: verifiedfan-logs.prod1.us-east-1.prod-tmaws.io (check for Kibana endpoint)

#### Useful Kibana Queries
```
# All admin-ui logs for a specific environment
product_code:"PRD1541" AND environment_tag:"kube-prod"

# Error logs only
product_code:"PRD1541" AND level:error

# Logs for a specific instance
product_code:"PRD1541" AND instance_id:"i-1234567890abcdef0"

# Logs for a specific timeframe
product_code:"PRD1541" AND @timestamp:[now-1h TO now]
```

---

## Alerting

### Prometheus Alerting

#### Recommended Alerts

**High Error Rate**:
```yaml
alert: HighErrorRate
expr: |
  sum(rate(http_requests_total{job="admin-ui", status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total{job="admin-ui"}[5m]))
  > 0.05
for: 5m
labels:
  severity: warning
annotations:
  summary: "High 5xx error rate on admin-ui"
```

**High Response Time**:
```yaml
alert: HighResponseTime
expr: |
  histogram_quantile(0.95,
    rate(http_request_duration_seconds_bucket{job="admin-ui"}[5m])
  ) > 1
for: 5m
labels:
  severity: warning
annotations:
  summary: "95th percentile response time > 1s"
```

**Pod Crash Loop**:
```yaml
alert: PodCrashLooping
expr: |
  rate(kube_pod_container_status_restarts_total{
    namespace="prd1541",
    pod=~"admin.*"
  }[15m]) > 0
for: 5m
labels:
  severity: critical
annotations:
  summary: "Admin-ui pod is crash looping"
```

**Low Replica Count** (Prod Only):
```yaml
alert: LowReplicaCount
expr: |
  kube_deployment_status_replicas_available{
    namespace="prd1541",
    deployment="admin"
  } < 1
for: 2m
labels:
  severity: critical
annotations:
  summary: "Admin-ui has no available replicas in production"
```

### ELB/ALB Health Monitoring

**Unhealthy Target Count**:
Monitor ALB target group health via CloudWatch:
- Metric: `UnHealthyHostCount`
- Threshold: > 0 for 2 consecutive periods
- Severity: Warning (dev/qa), Critical (prod)

---

## Scaling

### Auto-Scaling Configuration

#### Kubernetes HPA (Horizontal Pod Autoscaler)

| Environment | Min | Max | CPU Target |
|-------------|-----|-----|------------|
| Dev | 1 | 1 | 60% |
| QA | 1 | 1 | 60% |
| Preprod | 1 | 1 | 60% |
| Prod | 2 | 4 | 60% |

**Behavior**:
- Scales up when CPU utilization > 60%
- Scales down when CPU utilization < 60% consistently
- Based on CPU requests (500m)

#### EC2 Auto-Scaling (Legacy)

**Static Scaling**:
- Min: 1 instance
- Max: 1 instance
- No dynamic scaling policies

**Off-Hours Scheduling** (Optional):
- **Night schedule**: Scale to 0 at 2 AM UTC (7 PM PDT)
- **Reset schedule**: Restore to 1 at 12:30 PM UTC Mon-Fri (8 AM EDT)
- **Controlled by**: `create_night_schedule` variable

### Manual Scaling

#### Kubernetes
```bash
# Scale deployment
kubectl scale deployment admin -n prd1541 --replicas=3

# Or update via Helm
helm upgrade admin tm/webservice \
  --namespace prd1541 \
  --set replicaCount=3 \
  --reuse-values
```

#### EC2 (Legacy)
Update `app_instance_min_count` and `app_instance_max_count` in terraform.tfvars, then:
```bash
terraform apply
```

---

## Runbooks

### Common Issues

#### Issue: Pod Crash Loop
**Symptoms**:
- Pod restarts frequently
- CrashLoopBackOff status
- Health checks failing

**Investigation**:
1. Check pod logs:
   ```bash
   kubectl logs -n prd1541 admin-<pod-id> --previous
   ```

2. Check recent changes:
   ```bash
   kubectl describe pod -n prd1541 admin-<pod-id>
   ```

3. Check Fluentd logs for application errors:
   - Search Kibana for error-level logs
   - Check for startup errors or missing environment variables

**Resolution**:
- If config error: Rollback to previous deployment
- If resource limit: Increase memory/CPU limits in Helm values
- If dependency unavailable: Check external service health (GraphQL API, etc.)

#### Issue: High Response Times
**Symptoms**:
- Slow page loads
- Timeout errors
- High P95/P99 latency in metrics

**Investigation**:
1. Check CPU/Memory usage:
   ```bash
   kubectl top pods -n prd1541 -l app=admin
   ```

2. Check if external dependencies are slow:
   - GraphQL API response times
   - Network latency

3. Check pod logs for slow operations

**Resolution**:
- Scale up replicas if CPU/Memory constrained:
  ```bash
  kubectl scale deployment admin -n prd1541 --replicas=4
  ```
- Investigate slow GraphQL queries
- Check database performance (if applicable)

#### Issue: 502 Bad Gateway
**Symptoms**:
- Users see 502 errors
- ALB returns 502 status
- Health checks passing

**Investigation**:
1. Check if pods are ready:
   ```bash
   kubectl get pods -n prd1541 -l app=admin
   ```

2. Check ALB target group health:
   - AWS Console → EC2 → Target Groups
   - Look for draining or unhealthy targets

3. Check application logs for errors

**Resolution**:
- If pods not ready: Wait for readiness probe to pass
- If pods failing: Check application logs
- If ALB misconfigured: Verify ingress configuration

#### Issue: Memory Leak
**Symptoms**:
- Memory usage steadily increasing
- Pods restarted due to OOMKilled
- Slow performance over time

**Investigation**:
1. Check memory usage trend in Prometheus/Grafana
2. Review recent code changes
3. Check for long-running requests or large data processing

**Resolution**:
1. Immediate: Restart pods to free memory:
   ```bash
   kubectl rollout restart deployment admin -n prd1541
   ```

2. Short-term: Increase memory limits:
   ```yaml
   resources:
     limits:
       memory: 2Gi
   ```

3. Long-term: Profile application and fix memory leak

#### Issue: Unable to Pull Docker Image
**Symptoms**:
- ErrImagePull or ImagePullBackOff
- Deployment stuck

**Investigation**:
1. Check image exists:
   ```bash
   aws ecr list-images --repository-name titan/admin
   ```

2. Check IAM role permissions:
   - Verify role has ECR read access
   - Check trust relationship

3. Check image tag in deployment:
   ```bash
   kubectl get deployment admin -n prd1541 -o jsonpath='{.spec.template.spec.containers[0].image}'
   ```

**Resolution**:
- Verify correct image tag in GitLab pipeline
- Check ECR repository permissions
- Verify IAM role is attached to node group/instance profile

#### Issue: Service Unavailable After Deployment
**Symptoms**:
- Service not responding after new deployment
- All pods showing "Running" but not ready

**Investigation**:
1. Check pod events:
   ```bash
   kubectl describe pod -n prd1541 admin-<pod-id>
   ```

2. Check readiness probe:
   ```bash
   kubectl logs -n prd1541 admin-<pod-id>
   ```

3. Test health check endpoint:
   ```bash
   kubectl exec -n prd1541 admin-<pod-id> -- curl localhost:8080/heartbeat
   ```

**Resolution**:
- If health check failing: Check application logs
- If misconfiguration: Rollback deployment:
  ```bash
  helm rollback admin -n prd1541
  ```

---

## Debugging

### Access Pod Shell
```bash
# Kubernetes
kubectl exec -it -n prd1541 admin-<pod-id> -- /bin/sh

# Check environment variables
env | grep titan

# Check if app is running
ps aux | grep node

# Test health endpoint locally
curl localhost:8080/heartbeat
```

### View Real-Time Logs
```bash
# Kubernetes
kubectl logs -f -n prd1541 admin-<pod-id>

# All containers including Fluentd
kubectl logs -f -n prd1541 admin-<pod-id> --all-containers

# EC2 (via SSH)
docker logs -f <container-id>
```

### Check Fluentd Status
```bash
# Kubernetes
kubectl logs -n prd1541 admin-<pod-id> -c fluentd

# Verify Fluentd is receiving logs
kubectl exec -n prd1541 admin-<pod-id> -c fluentd -- tail -f /logs/titan.log
```

### Port Forwarding for Local Testing
```bash
# Forward pod port to localhost
kubectl port-forward -n prd1541 admin-<pod-id> 8080:8080

# Access at http://localhost:8080
```

### Check Helm Release Status
```bash
# List releases
helm list -n prd1541

# Get release history
helm history admin -n prd1541

# Get release values
helm get values admin -n prd1541
```

---

## Disaster Recovery

### Backup Strategy
- **Code**: Stored in GitLab (git.tmaws.io)
- **Docker Images**: Stored in ECR with 1-week retention
- **Configuration**: Stored in Helm values (version controlled)
- **Infrastructure**: Defined in Terraform (version controlled)

### Recovery Procedures

#### Full Environment Recovery
1. Ensure GitLab repository is accessible
2. Run CI/CD pipeline from last known good commit
3. Pipeline will:
   - Build new Docker image
   - Deploy to Kubernetes
   - Run health checks

#### Rollback to Previous Version
```bash
# Via GitLab
# Re-run successful deployment job from previous pipeline

# Via Helm (if pipeline unavailable)
helm rollback admin -n prd1541

# Via kubectl (emergency)
kubectl rollout undo deployment admin -n prd1541
```

#### Database Recovery
**Note**: This application appears to be stateless and relies on external GraphQL API for data. No database backup/recovery needed for the admin-ui itself.

---

## Maintenance Windows

### Recommended Maintenance Times
- **Dev/QA**: Anytime (no user impact)
- **Preprod**: Tuesday-Thursday, 2-4 PM EST
- **Production**: Tuesday-Thursday, 2-4 AM EST (lowest traffic)

### Maintenance Procedures

#### Planned Downtime
1. Notify stakeholders via Slack/email
2. Create maintenance notice (if user-facing)
3. Perform maintenance:
   ```bash
   # Scale down
   kubectl scale deployment admin -n prd1541 --replicas=0

   # Perform maintenance tasks

   # Scale back up
   kubectl scale deployment admin -n prd1541 --replicas=2
   ```
4. Verify health checks
5. Confirm with stakeholders

#### Zero-Downtime Deployment
Kubernetes rolling updates provide zero-downtime by default:
- maxUnavailablePods: 50%
- minReadySeconds: 15
- Ensures at least 1 replica always available

---

## Performance Tuning

### Resource Limits
Current limits are:
- CPU: 500m (0.5 cores)
- Memory: 1Gi

**Recommendations**:
- Monitor actual usage via `kubectl top pods`
- If consistently hitting limits, increase gradually
- Ensure requests match typical usage
- Keep limits 20-50% higher than requests

### Node.js Optimization
```bash
# Increase max old space size if memory available
NODE_OPTIONS="--max-old-space-size=768"

# Enable GC logging for investigation
NODE_OPTIONS="--trace-gc"
```

### Application-Level Optimization
- Review slow GraphQL queries
- Implement caching where appropriate
- Optimize bundle size (currently bundled via Webpack)
- Use CDN for static assets if not already

---

## Security Operations

### Secret Rotation
- **IAM Roles**: Managed by AWS/Terraform
- **SSL Certificates**: Managed by AWS ACM (auto-renewal)
- **ECR Credentials**: Auto-refreshed via IAM roles

### Security Scanning
- **Image Scanning**: Enabled in ECR
- **Dependency Scanning**: Run `npm audit` regularly
- **Infrastructure Scanning**: Terraform validate/tfsec

### Incident Response
1. Identify scope (which environment, how many users affected)
2. Isolate affected component (scale down compromised pods)
3. Investigate logs in Kibana/CloudWatch
4. Patch vulnerability
5. Deploy fixed version
6. Document incident and lessons learned

---

## Useful Commands Reference

### Kubernetes
```bash
# Get pod status
kubectl get pods -n prd1541 -l app=admin

# Get recent events
kubectl get events -n prd1541 --sort-by='.lastTimestamp'

# Describe deployment
kubectl describe deployment admin -n prd1541

# Check resource usage
kubectl top pods -n prd1541 -l app=admin

# Get service endpoints
kubectl get endpoints admin -n prd1541

# Check ingress
kubectl get ingress -n prd1541
```

### Helm
```bash
# List installed releases
helm list -n prd1541

# Get release status
helm status admin -n prd1541

# Get release values
helm get values admin -n prd1541

# Test release
helm test admin -n prd1541
```

### AWS CLI
```bash
# List ECR images
aws ecr list-images --repository-name titan/admin

# Get latest image
aws ecr describe-images --repository-name titan/admin --query 'sort_by(imageDetails,& imagePushedAt)[-1]'

# Check ALB target health (replace with actual target group ARN)
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...
```

---

## Contact Information

### Escalation Path
1. **L1 Support**: Check runbooks, restart pods if needed
2. **L2 Support**: Development team (via Slack/PagerDuty)
3. **L3 Support**: Platform team for infrastructure issues

### Key Resources
- **GitLab Pipeline**: https://git.tmaws.io/Titan/internal-dashboard/pipelines
- **Helm Chart**: tm/webservice (version 11.6.0)
- **Product Code**: PRD1541
- **Inventory Code**: titan-admin
- **Namespace**: prd1541
