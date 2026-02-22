# Operations - reg-ui

## Monitoring & Observability

### Prometheus Metrics

**Metrics Endpoint**: `/metrics`

- **Enabled**: Yes (all environments)
- **Port**: 8080 (HTTP)
- **Scrape Target**: Kubernetes Service
- **Client Library**: `prom-client` (Node.js)

**Metrics Exposed**:
- Default Node.js runtime metrics (heap, GC, event loop)
- HTTP request duration/count
- Custom application metrics

**Access**:
```bash
curl https://<environment-fqdn>/metrics
```

### Health Checks

**Heartbeat Endpoint**: `/heartbeat`

- **Purpose**: Liveness and readiness probes
- **Expected Response**: HTTP 200
- **Checks**: Basic application health
- **Timeout**: 5 seconds
- **Frequency**: Every 10 seconds

**Access**:
```bash
curl https://<environment-fqdn>/heartbeat
```

### Distributed Tracing (Jaeger)

**Status**: Enabled (all environments)

**Configuration**:
- **Agent Image**: `jaegertracing/jaeger-agent:1.8`
- **Collector Host**: `jaeger-collector.prd121.svc.cluster.local`
- **Port**: 8080
- **Deployment**: Sidecar container in each pod
- **Resource Requests**: 256m CPU, 128Mi memory
- **Resource Limits**: 512Mi memory

**Purpose**: End-to-end request tracing across services

## Logging

### Application Logs

**Log Output**: `/logs/titan.log`

**Format**: JSON

**Log Levels**:
- `error` - Errors and exceptions
- `warn` - Warnings
- `info` - Informational messages (default)
- `debug` - Debug information

**Configuration**:
- Server-side: `LOG_LEVEL` environment variable (default: `info`)
- Client-side: `CONSOLE_LOGGING_ENABLED` flag (disabled in prod)

### Log Collection (Fluentd)

**Status**: Enabled (all environments)

**Configuration**:
- **Sidecar Image**: `tmhub.io/tm-waiting-room/fluentd:master-3454331`
- **Log Path**: `/logs/titan.log`
- **Deployment**: Sidecar container in each pod
- **Resource Requests**: 100m CPU, 500Mi memory
- **Resource Limits**: 100m CPU, 500Mi memory

**Log Pipeline**:
1. **Source**: Tail `/logs/titan.log` with JSON parsing
2. **Transform**: Add metadata (product_code, environment_tag, region, container_name)
3. **Destination**: AWS Elasticsearch Service (Logstash format)

#### Production Log Destination

```
http://verifiedfan-logs.prod1.us-east-1.prod-tmaws.io
```

**Index**: `logstash-application_log-YYYY.MM.DD`

**Metadata**:
- `product_code`: `PRD1541`
- `environment_tag`: `kube-prod`
- `region`: `us-east-1`
- `container_name`: `/reg-ui`

#### Dev/QA Log Destination

```
http://verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io
```

**Index**: `logstash-application_log-YYYY.MM.DD`

**Metadata**:
- `product_code`: `PRD1541`
- `environment_tag`: `kube-dev` or `kube-qa`
- `region`: `us-east-1`
- `container_name`: `/reg-ui`

### Fluentd Buffer Configuration

- **Flush Interval**: 1 second
- **Chunk Limit**: 8MB
- **Queue Length**: 64 chunks

### Accessing Logs

#### Via Elasticsearch/Kibana

1. Navigate to Kibana dashboard
2. Select index pattern: `logstash-application_log-*`
3. Filter by:
   - `product_code: PRD1541`
   - `container_name: /reg-ui`
   - `environment_tag: kube-prod` (or appropriate env)

#### Via Kubernetes

```bash
# Get pod logs
kubectl logs -n prd1541 <pod-name> -c server

# Get Fluentd sidecar logs
kubectl logs -n prd1541 <pod-name> -c fluentd

# Follow logs in real-time
kubectl logs -n prd1541 <pod-name> -c server -f

# Logs from all pods
kubectl logs -n prd1541 -l app=reg-ui -c server
```

## Alerting

### Current Alerting Setup

No specific alerting rules are configured in the infrastructure code. Monitoring and alerting are likely managed via:

- **Prometheus AlertManager**: For metric-based alerts
- **AWS CloudWatch**: For infrastructure alerts
- **PagerDuty/Opsgenie**: For incident management (integration not visible in configs)

### Recommended Alert Rules

#### High Error Rate

```yaml
alert: HighErrorRate
expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
for: 5m
severity: critical
```

#### High Latency

```yaml
alert: HighLatency
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 5m
severity: warning
```

#### Pod Crashes

```yaml
alert: PodCrashing
expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
for: 5m
severity: warning
```

#### High Memory Usage

```yaml
alert: HighMemoryUsage
expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
for: 10m
severity: warning
```

## Incident Response

### Common Issues

#### Issue: Application Not Responding

**Symptoms**:
- Health check failures
- Pods restarting
- 502/503 errors from ALB

**Resolution**:
1. Check pod status:
   ```bash
   kubectl get pods -n prd1541 -l app=reg-ui
   ```
2. Check pod logs for errors:
   ```bash
   kubectl logs -n prd1541 <pod-name> -c server --tail=100
   ```
3. Check pod events:
   ```bash
   kubectl describe pod -n prd1541 <pod-name>
   ```
4. If OOM (Out of Memory):
   - Scale up resources in Helm values
   - Redeploy with increased memory limits
5. If crashing on startup:
   - Check for missing environment variables
   - Verify Redis connectivity
   - Check AppSync API availability

#### Issue: Redis Connection Failures

**Symptoms**:
- Campaign data not loading
- Increased latency
- Error logs: "Connection refused" or "ECONNREFUSED"

**Resolution**:
1. Verify Redis endpoints are correct:
   ```bash
   kubectl get configmap -n prd1541 -o yaml | grep REDIS_URL
   ```
2. Test Redis connectivity from pod:
   ```bash
   kubectl exec -it -n prd1541 <pod-name> -c server -- sh
   nc -zv <redis-host> 6379
   ```
3. Check Redis ElastiCache cluster health in AWS Console
4. If Redis is down, campaigns will fail to load (graceful degradation not implemented)

#### Issue: High CPU/Memory Usage

**Symptoms**:
- Pods hitting resource limits
- Throttling/slow response times
- OOMKilled pod status

**Resolution**:
1. Check current resource usage:
   ```bash
   kubectl top pods -n prd1541 -l app=reg-ui
   ```
2. Check HPA (Horizontal Pod Autoscaler) status:
   ```bash
   kubectl get hpa -n prd1541
   ```
3. If consistently hitting limits:
   - Increase CPU/memory requests in values.yaml
   - Increase max replica count if needed
   - Redeploy via CI/CD
4. Investigate memory leaks:
   - Review application logs
   - Check for unbounded cache growth
   - Profile with Node.js heap snapshots

#### Issue: Deployment Stuck/Failed

**Symptoms**:
- Helm deployment times out
- New pods not reaching Ready state
- Old pods still running

**Resolution**:
1. Check deployment status:
   ```bash
   kubectl rollout status deployment/reg-ui -n prd1541
   ```
2. Check pod events:
   ```bash
   kubectl get events -n prd1541 --sort-by='.lastTimestamp'
   ```
3. Common causes:
   - Image pull failures (check ECR permissions)
   - Health check failures (check `/heartbeat` endpoint)
   - Resource constraints (check node resources)
4. Rollback if needed:
   ```bash
   helm3 rollback reg-ui -n prd1541
   ```

#### Issue: CDN Cache Issues (Fastly)

**Symptoms**:
- Stale content served to users
- New deployments not reflected

**Resolution**:
1. Manually purge Fastly cache:
   ```bash
   # PreProd
   curl -X POST https://api.fastly.com/service/sJWkDDZbgiLhehjrxZmI46/purge_all \
     -H 'accept: application/json' \
     -H 'fastly-key: <key>'

   # Production
   curl -X POST https://api.fastly.com/service/jzcal6fzi3hxclocGLNTT6/purge_all \
     -H 'accept: application/json' \
     -H 'fastly-key: <key>'
   ```
2. Verify CDN purge in Fastly dashboard
3. Test with cache-busting headers:
   ```bash
   curl -I https://signup.ticketmaster.com -H "Cache-Control: no-cache"
   ```

#### Issue: Translation Files Missing

**Symptoms**:
- English text showing for non-English locales
- 404 errors for locale files

**Resolution**:
1. Check if translations were downloaded during build:
   ```bash
   # In GitLab CI/CD pipeline, check "download translations" job logs
   ```
2. Manually trigger translation download:
   ```bash
   TX_TOKEN=<token> npm run tx download
   ```
3. Rebuild and redeploy with translations included
4. If Transifex is down, translations may fail to download (job allows failure)

### Emergency Procedures

#### Emergency Rollback (Production)

1. Identify last known good release:
   ```bash
   helm3 history reg-ui -n prd1541
   ```
2. Rollback to specific revision:
   ```bash
   helm3 rollback reg-ui <revision-number> -n prd1541
   ```
3. Monitor rollback:
   ```bash
   kubectl rollout status deployment/reg-ui -n prd1541
   ```
4. Verify health:
   ```bash
   curl https://reg-ui.vf.prod9.us-east-1.pub-tktm.io/heartbeat
   ```

#### Scale Down for Emergency Maintenance

```bash
# Scale to zero replicas
kubectl scale deployment reg-ui -n prd1541 --replicas=0

# Scale back up
kubectl scale deployment reg-ui -n prd1541 --replicas=4
```

#### Force Pod Restart (Avoid if possible)

```bash
# Delete pods one at a time (rolling restart)
kubectl delete pod -n prd1541 <pod-name>

# Force restart all pods (use with caution)
kubectl rollout restart deployment/reg-ui -n prd1541
```

## Debugging

### Debug Mode

**Local Development**:
```bash
# Run with DEBUG logging
LOG_LEVEL=debug npm run local

# Enable console logging
CONSOLE_LOGGING_ENABLED=true npm run local
```

**Production Debugging** (not recommended):
- Temporarily set `LOG_LEVEL: debug` in environment configmap
- Redeploy to apply changes
- Review logs in Elasticsearch
- **Remember to revert to `info` level after debugging**

### Tracing Requests

1. Find request ID in logs or response headers
2. Search Elasticsearch for request ID
3. View distributed trace in Jaeger UI:
   - Navigate to Jaeger dashboard
   - Search by operation or trace ID
   - View service call graph

### Accessing Pod Shell

```bash
# Interactive shell in running pod
kubectl exec -it -n prd1541 <pod-name> -c server -- sh

# Run single command
kubectl exec -n prd1541 <pod-name> -c server -- env | grep REDIS
```

### Testing Redis Connectivity

```bash
# From pod
kubectl exec -n prd1541 <pod-name> -c server -- sh -c \
  "nc -zv prd3292-prod1-dmnd.t5ssu1.ng.0001.use1.cache.amazonaws.com 6379"
```

### Checking GraphQL API

```bash
# Test AppSync endpoint (requires API key)
curl -X POST https://appsync-prod.fanid.prod-tmaws.io/graphql \
  -H "x-api-key: <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## Capacity Planning

### Current Capacity (Production)

- **Min Replicas**: 4 per region
- **Max Replicas**: 12 per region
- **Total Capacity**: 24 pods (2 regions)
- **Pod Resources**: 500m CPU, 1Gi memory (request)
- **Pod Limits**: 2 CPU, 3Gi memory

### Scaling Thresholds

- **CPU Target**: 60% utilization triggers scale-up
- **Scale-up**: Adds pods when avg CPU > 60%
- **Scale-down**: Removes pods when avg CPU < 60%

### Performance Baseline

**Expected Performance**:
- P50 response time: < 500ms
- P95 response time: < 2s
- P99 response time: < 5s
- Error rate: < 0.1%

**Load Handling**:
- Single pod: ~100-200 req/s (estimated)
- Min capacity (4 pods): ~400-800 req/s per region
- Max capacity (12 pods): ~1200-2400 req/s per region

### Scaling Recommendations

**Scale Up** when:
- Average CPU > 70% for 5+ minutes
- P95 latency > 3s consistently
- Campaign launches expected (plan ahead)

**Scale Down** when:
- Average CPU < 40% for 15+ minutes
- Off-peak hours with low traffic

## Maintenance Windows

### Kubernetes Upgrades

Coordinate with platform team for cluster upgrades. No specific maintenance windows defined in configs.

### Deployment Best Practices

1. **Deploy during low-traffic periods** (typically late night in primary markets)
2. **Deploy to US West first** (lower traffic), then US East
3. **Monitor for 15-30 minutes** after deployment
4. **Have rollback plan ready**
5. **Notify stakeholders** of production deployments

## Runbook Links

- **GitLab CI/CD**: [Pipeline Configuration](/.gitlab-ci.yml)
- **Helm Values**: [Kubernetes Configuration](/kube/)
- **Application Config**: [Environment Configs](/configs/)
- **Docker Image**: `889199535989.dkr.ecr.us-east-1.amazonaws.com/titan/reg-ui`

## Support Contacts

- **Product Code**: PRD1541
- **Team**: Titan / Verified Fan
- **On-Call**: (Contact information managed externally)
