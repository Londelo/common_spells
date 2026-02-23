# Operations - monoql

## Monitoring

### Prometheus Metrics

**Enabled**: true

**Metrics Endpoint**:
- **Path**: `/metrics`
- **Port**: 8080
- **Scheme**: http

**System Metrics**:
- CPU utilization
- Memory usage
- Request rate
- Response times
- Error rates
- Custom application metrics

**Kubernetes Service Discovery**:
- Prometheus automatically discovers pods via annotations
- Metrics scraped from all running pods

### Health Checks

**Heartbeat Endpoint**: `/heartbeat`

**Liveness Probe**:
- Determines if container should be restarted
- Initial delay: 30s
- Timeout: 5s
- Period: 10s
- Failure threshold: 3 consecutive failures
- Success threshold: 1

**Readiness Probe**:
- Determines if pod should receive traffic
- Initial delay: 30s
- Timeout: 5s
- Period: 10s
- Failure threshold: 3 consecutive failures
- Success threshold: 1

**Load Balancer Health Check**:
- Target: `/heartbeat`
- Expected status codes: 200
- Protocol: HTTP
- Port: 8080

### Auto-scaling

**Horizontal Pod Autoscaler (HPA)**:
- **Metric**: CPU utilization
- **Target**: 60% of requested CPU
- **Min Replicas**:
  - Dev/QA: 1
  - Preprod/Prod: 5
- **Max Replicas**:
  - Dev/QA: 1
  - Preprod/Prod: 15
- **Scaling Behavior**: Automatic based on CPU metrics

**Pod Disruption Budget**:
- **Max Unavailable**: 75% of pods
- Applies during voluntary disruptions (maintenance, node scaling)

## Logging

### Log Configuration

**Log Location**: `/logs/titan.log`

**Format**: JSON

**Log Levels**:
- ERROR
- WARN
- INFO
- DEBUG

**Environment-Specific Settings**:
- **Production**: `showDeveloperMessage: false`
- **Dev/QA**: `showDeveloperMessage: true` (likely, not explicitly shown)

### Fluentd Log Aggregation

**Sidecar Container**:
- **Image**: tmhub.io/tm-waiting-room/fluentd:master-3454331
- **Resource Limits**: 100m CPU, 500Mi memory

**Log Processing Pipeline**:

1. **Source** (Tail):
   - File: `/logs/titan.log`
   - Format: JSON
   - Position file: `/logs/application.log.pos`
   - Tag: `titan.logs`

2. **Filter** (Record Transformer):
   Adds metadata to every log entry:
   - `product_code`: PRD1541
   - `environment_tag`: kube-dev / kube-prod
   - `region`: us-east-1 / us-west-2
   - `container_name`: /monoql

3. **Output** (AWS Elasticsearch):
   - **Type**: aws-elasticsearch-service
   - **Index Pattern**: logstash-application_log-*
   - **Logstash Format**: true
   - **Tag Key**: @log_name
   - **Flush Interval**: 1s
   - **Chunk Limit**: 8MB
   - **Queue Limit**: 64 chunks
   - **Connection**: No reload

**Elasticsearch Endpoints**:
| Environment | Endpoint |
|-------------|----------|
| Dev | http://verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io |
| Prod | http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io |

### Log Retention

Retention policies are managed by the Elasticsearch cluster (not defined in application configuration).

### Accessing Logs

**Kubernetes Logs** (recent, ephemeral):
```bash
# View pod logs
kubectl logs -n prd1541 <pod-name>

# View logs from fluentd sidecar
kubectl logs -n prd1541 <pod-name> -c fluentd

# Follow logs
kubectl logs -n prd1541 <pod-name> -f

# View previous pod logs (after restart)
kubectl logs -n prd1541 <pod-name> --previous
```

**Elasticsearch Logs** (historical, indexed):
- Query Elasticsearch directly
- Use Kibana for visualization and search
- Index pattern: `logstash-application_log-*`
- Filter by metadata:
  - `product_code: PRD1541`
  - `environment_tag: kube-prod` or `kube-dev`
  - `container_name: /monoql`
  - `region: us-east-1` or `us-west-2`

## Alerting

**Note**: Specific alerting configuration not found in repository. Alerting likely managed externally via:
- Prometheus Alertmanager
- PagerDuty integration
- Slack notifications
- CloudWatch alarms

**Recommended Alerts** (based on resources):
- Pod crash loops (restart count > 5)
- High CPU utilization (> 80% for 5 minutes)
- High memory usage (> 90% for 5 minutes)
- Pod not ready (readiness probe failing)
- High error rate (5xx responses)
- Low request rate (potential traffic issue)
- Deployment failures

## Runbooks

### Common Operations

#### Viewing Application Status

**Check Deployment Status**:
```bash
# List all pods
kubectl get pods -n prd1541 -l app=monoql

# Get pod details
kubectl describe pod -n prd1541 <pod-name>

# Check deployment status
kubectl get deployment -n prd1541 monoql

# View deployment events
kubectl describe deployment -n prd1541 monoql
```

**Check Service/Ingress**:
```bash
# View service
kubectl get service -n prd1541 monoql

# View ingress
kubectl get ingress -n prd1541 monoql

# Describe ingress (shows ALB details)
kubectl describe ingress -n prd1541 monoql
```

**Check HPA Status**:
```bash
kubectl get hpa -n prd1541

kubectl describe hpa -n prd1541 monoql-hpa
```

#### Scaling Operations

**Manual Scaling** (overrides HPA temporarily):
```bash
# Scale to specific replica count
kubectl scale deployment monoql -n prd1541 --replicas=10

# Note: HPA will eventually override this
```

**Adjust HPA**:
```bash
# Edit HPA target
kubectl edit hpa -n prd1541 monoql-hpa

# Or update Helm values and redeploy
```

#### Restarting Pods

**Rolling Restart**:
```bash
# Trigger rolling restart
kubectl rollout restart deployment/monoql -n prd1541

# Watch rollout status
kubectl rollout status deployment/monoql -n prd1541
```

**Force Delete Pod** (last resort):
```bash
kubectl delete pod -n prd1541 <pod-name>
```

#### Configuration Updates

**Update ConfigMap**:
```bash
# Edit configmap
kubectl edit configmap -n prd1541 <configmap-name>

# Restart pods to pick up changes
kubectl rollout restart deployment/monoql -n prd1541
```

**Update Secrets** (if applicable):
```bash
kubectl edit secret -n prd1541 <secret-name>
kubectl rollout restart deployment/monoql -n prd1541
```

#### Debugging

**Execute Commands in Pod**:
```bash
# Get shell in pod
kubectl exec -it -n prd1541 <pod-name> -- sh

# Run specific command
kubectl exec -n prd1541 <pod-name> -- node --version
```

**Port Forward to Pod**:
```bash
# Forward local port 8080 to pod port 8080
kubectl port-forward -n prd1541 <pod-name> 8080:8080

# Test locally
curl http://localhost:8080/heartbeat
```

**Check Resource Usage**:
```bash
# View resource usage
kubectl top pods -n prd1541 -l app=monoql

# View node resource usage
kubectl top nodes
```

### Incident Response

#### High Error Rate

**Symptoms**:
- Increased 5xx responses
- Failed health checks
- Pod restarts

**Investigation Steps**:

1. **Check pod logs**:
   ```bash
   kubectl logs -n prd1541 <pod-name> --tail=100
   ```

2. **Check application errors** in Elasticsearch:
   - Filter by level: ERROR
   - Look for stack traces
   - Identify patterns

3. **Check resource usage**:
   ```bash
   kubectl top pods -n prd1541 -l app=monoql
   ```

4. **Check external dependencies**:
   - Users Service
   - Campaigns Service
   - Codes Service
   - Entries Service
   - Uploads Service
   - Exports Service
   - Waves Service
   - Identity Service

5. **Review recent changes**:
   - Check GitLab for recent deployments
   - Review Helm release history

**Resolution**:
- If config issue: Update configuration and redeploy
- If code issue: Rollback to previous version
- If dependency issue: Coordinate with dependent service teams
- If resource issue: Scale up or adjust resource limits

#### Pod Not Starting

**Symptoms**:
- Pod stuck in Pending or CrashLoopBackOff state
- Readiness probe failing

**Investigation Steps**:

1. **Check pod status**:
   ```bash
   kubectl describe pod -n prd1541 <pod-name>
   ```

2. **Check pod events**:
   - Look for ImagePullBackOff (image not found)
   - Look for resource constraints (CPU/memory limits)
   - Look for node affinity issues

3. **Check logs**:
   ```bash
   kubectl logs -n prd1541 <pod-name>
   ```

4. **Check image availability**:
   ```bash
   # Verify image exists in ECR
   aws ecr describe-images --repository-name titan/monoql \
     --image-ids imageTag=${BUILD_VERSION}
   ```

**Resolution**:
- If ImagePullBackOff: Verify image tag, rebuild if necessary
- If resource constraints: Adjust limits or add more nodes
- If config error: Fix configuration and redeploy
- If startup failure: Check application logs for initialization errors

#### High Latency

**Symptoms**:
- Slow response times
- Timeout errors
- Increased CPU/memory usage

**Investigation Steps**:

1. **Check Prometheus metrics**:
   - Request duration (p50, p95, p99)
   - Request rate
   - Error rate

2. **Check resource usage**:
   ```bash
   kubectl top pods -n prd1541 -l app=monoql
   ```

3. **Check HPA status**:
   ```bash
   kubectl get hpa -n prd1541
   ```

4. **Check external service latency**:
   - Test downstream services
   - Review service-to-service metrics

5. **Check database/cache performance** (if applicable)

**Resolution**:
- If CPU-bound: Increase replica count or CPU limits
- If memory-bound: Increase memory limits
- If downstream latency: Coordinate with service owners
- If code issue: Profile application, optimize slow queries
- If traffic spike: Ensure HPA is scaling correctly

#### Deployment Failure

**Symptoms**:
- Helm deployment fails
- Pods not updating to new version
- Rollout stuck

**Investigation Steps**:

1. **Check GitLab CI/CD logs**:
   - Review failed job logs
   - Check Helm output

2. **Check Kubernetes events**:
   ```bash
   kubectl get events -n prd1541 --sort-by='.lastTimestamp'
   ```

3. **Check rollout status**:
   ```bash
   kubectl rollout status deployment/monoql -n prd1541
   kubectl rollout history deployment/monoql -n prd1541
   ```

4. **Check new pod logs**:
   ```bash
   kubectl logs -n prd1541 <new-pod-name>
   ```

**Resolution**:
- If Helm error: Review values file, fix syntax errors
- If pod startup failure: Review logs, fix application issue
- If resource constraints: Add capacity or adjust limits
- If critical issue: Rollback deployment:
  ```bash
  helm3 rollback monoql -n prd1541
  # Or
  kubectl rollout undo deployment/monoql -n prd1541
  ```

### Rollback Procedures

#### Helm Rollback

**View revision history**:
```bash
helm3 history monoql -n prd1541
```

**Rollback to previous version**:
```bash
helm3 rollback monoql -n prd1541
```

**Rollback to specific revision**:
```bash
helm3 rollback monoql <revision-number> -n prd1541
```

**Verify rollback**:
```bash
kubectl rollout status deployment/monoql -n prd1541
```

#### Kubernetes Rollback

**View rollout history**:
```bash
kubectl rollout history deployment/monoql -n prd1541
```

**Rollback to previous revision**:
```bash
kubectl rollout undo deployment/monoql -n prd1541
```

**Rollback to specific revision**:
```bash
kubectl rollout undo deployment/monoql -n prd1541 --to-revision=<revision>
```

### Maintenance Windows

**Planned Maintenance Steps**:

1. **Notify stakeholders** of maintenance window
2. **Scale up pods** before maintenance (for redundancy):
   ```bash
   kubectl scale deployment monoql -n prd1541 --replicas=<increased-count>
   ```
3. **Perform maintenance** (deploy, upgrade, etc.)
4. **Verify health checks** pass
5. **Monitor logs and metrics** for 15-30 minutes
6. **Scale back to normal** if manually scaled

**Emergency Maintenance**:
- Follow same steps but with reduced notification time
- Prioritize rollback capability over extensive testing

## Performance Tuning

### Resource Optimization

**Current Limits**:
| Environment | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-------------|-------------|-----------|----------------|--------------|
| Dev/QA | 500m | 500m | 512Mi | 1Gi |
| Preprod/Prod | 500m | 2 | 1Gi | 3Gi |

**Tuning Recommendations**:
- Monitor actual usage with `kubectl top pods`
- Adjust requests based on baseline usage (p95)
- Set limits 1.5-2x higher than requests
- Ensure requests × replicas fit on available nodes

### Auto-scaling Tuning

**Current Target**: 60% CPU utilization

**Tuning Recommendations**:
- Lower target (e.g., 50%) for more headroom during spikes
- Raise target (e.g., 70%) for better resource utilization
- Monitor scale-up/scale-down frequency
- Adjust min/max replicas based on traffic patterns

### DNS Caching

**Configuration**: `dnsCacheTTL` in service config

**Tuning**:
- Default TTL may be too high for dynamic services
- Lower TTL for frequently changing backends
- Higher TTL for static backends (better performance)

## Security Operations

### Certificate Management

**TLS Certificates**: ACM (AWS Certificate Manager)

| Environment | Certificate ARN |
|-------------|-----------------|
| Dev | arn:aws:acm:us-east-1:234212695392:certificate/182d62fa-7cd8-4625-b6b5-86a2d4bea0dd |
| Prod | arn:aws:acm:us-east-1:667096744268:certificate/2e5e6799-0ea6-48ce-b560-56bc8398e768 |

**Certificate Renewal**:
- ACM auto-renews certificates
- No manual intervention required
- Monitor expiration dates

### IAM Role Management

**Principle**: Least privilege

**Current Roles**:
- Dev: arn:aws:iam::343550350117:role/prd1541.titan.us-east-1.dev1.iam-kube-default
- Prod: arn:aws:iam::889199535989:role/prd1541.titan.us-east-1.prod1.iam-kube-default

**Permissions Review**:
- Review IAM policies regularly
- Remove unused permissions
- Audit access logs

### Secrets Management

**Current State**: Configuration files in repository (not ideal for sensitive data)

**Recommendations**:
- Migrate sensitive values to Kubernetes Secrets
- Use AWS Secrets Manager or Parameter Store
- Rotate secrets regularly
- Never commit secrets to Git

### CORS Policy

**Production Configuration**:
- HTTPS only: true
- Allow all: false
- Allowed hosts: Whitelist of admin domains

**Security Considerations**:
- Regularly review allowed hosts
- Remove deprecated domains
- Ensure HTTPS enforcement

## Disaster Recovery

### Backup Strategy

**Application State**: Stateless
- No persistent data in containers
- All state in backend services

**Configuration Backup**:
- Source: Git repository (git.tmaws.io:Titan/monoql.git)
- Helm values: In repository
- Docker images: ECR (retained per lifecycle policy)

### Recovery Procedures

**Complete Environment Loss**:

1. **Verify cluster is operational**:
   ```bash
   kubectl cluster-info
   ```

2. **Redeploy from GitLab CI/CD**:
   - Trigger appropriate deploy job
   - Or run Helm install manually

3. **Verify deployment**:
   ```bash
   kubectl get pods -n prd1541
   kubectl get ingress -n prd1541
   ```

4. **Test health checks**:
   ```bash
   curl https://<fqdn>/heartbeat
   ```

**Single Region Failure** (Production):
- Traffic automatically routes to healthy region (us-east-1 or us-west-2)
- No manual intervention required if DNS routing is configured
- Monitor and restore failed region when available

### RTO/RPO

**RTO** (Recovery Time Objective):
- Dev/QA: 30 minutes
- Preprod: 15 minutes
- Production: 15 minutes (single region), 0 minutes (multi-region)

**RPO** (Recovery Point Objective):
- 0 minutes (stateless application)
- Dependent services manage their own RPO

## Contact Information

**Team**: Titan / Verified Fan

**On-Call**: (Configure PagerDuty rotation)

**Escalation Path**:
1. On-call engineer
2. Team lead
3. Platform engineering

**External Dependencies**:
- Users Service team
- Campaigns Service team
- Codes Service team
- Entries Service team
- Uploads Service team
- Exports Service team
- Waves Service team
- Identity Service team
- Kubernetes platform team
- AWS support
