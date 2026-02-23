# Operations - upload-service

## Overview

This document covers operational procedures, monitoring, alerting, debugging, and incident response for the upload-service.

## Monitoring

### CloudWatch Metrics

#### Auto Scaling Group Metrics

The following ASG metrics are automatically collected and available in CloudWatch:

| Metric | Description | Use Case |
|--------|-------------|----------|
| `GroupMinSize` | Minimum capacity | Track scaling configuration |
| `GroupMaxSize` | Maximum capacity | Track scaling configuration |
| `GroupDesiredCapacity` | Target instance count | Monitor auto-scaling decisions |
| `GroupInServiceInstances` | Healthy instances | Alert on capacity issues |
| `GroupPendingInstances` | Starting instances | Monitor scale-up progress |
| `GroupStandbyInstances` | Standby instances | Capacity planning |
| `GroupTerminatingInstances` | Shutting down instances | Monitor scale-down |
| `GroupTotalInstances` | All instances (any state) | Overall capacity view |

#### EC2 Metrics

Standard EC2 metrics collected for each instance:

- **CPUUtilization**: Percentage of CPU used
- **NetworkIn/NetworkOut**: Network traffic
- **DiskReadOps/DiskWriteOps**: Disk I/O operations
- **DiskReadBytes/DiskWriteBytes**: Disk throughput

#### Application Metrics

Application exposes Prometheus metrics on port 8080:

- **Custom Application Metrics**: Via `@verifiedfan/prometheus` library
- **Node.js Process Metrics**: Memory, event loop, garbage collection
- **HTTP Request Metrics**: Request rate, duration, status codes

### Prometheus Integration

EC2 instances are tagged for Prometheus service discovery:

- **Tag**: `Prometheus=enabled` - Enables standard scraping
- **Tag**: `Prometheus8080=enabled` - Scrapes application metrics on port 8080
- **Node Exporter**: Port 9100 - Host-level metrics (CPU, memory, disk, network)
- **cAdvisor**: Port 4914 - Container-level metrics

**Metrics Available**:
- System metrics (CPU, memory, disk usage)
- Container metrics (per-container resource usage)
- Application metrics (custom business metrics)
- Network metrics (connections, throughput)

### Load Balancer Health Checks

**Health Check Configuration**:
- **Endpoint**: `HTTP:8080/heartbeat`
- **Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Healthy Threshold**: 3 consecutive successes
- **Unhealthy Threshold**: 2 consecutive failures

**Health Check Response**:
The `/heartbeat` endpoint should return HTTP 200 when the application is healthy.

## Alerting

### CloudWatch Alarms

#### CPU-Based Auto-Scaling Alarms

**High CPU Alarm** (`CpuHigh`):
- **Threshold**: Average CPU > 30% (configurable via `cpu_scale_up`)
- **Evaluation**: 3 consecutive periods of 60 seconds
- **Action**: Trigger scale-up (add 4 instances)
- **Response Time**: ~5 minutes total (3 min evaluation + launch time)

**Low CPU Alarm** (`CpuLow`):
- **Threshold**: Average CPU < 15% (configurable via `cpu_scale_down`)
- **Evaluation**: 3 consecutive periods of 300 seconds
- **Action**: Trigger scale-down (remove 1 instance)
- **Response Time**: ~15 minutes total (15 min evaluation + drain time)

#### Recommended Additional Alarms

While not configured by default, consider setting up these CloudWatch alarms:

| Alarm | Metric | Threshold | Purpose |
|-------|--------|-----------|---------|
| **No Healthy Instances** | `HealthyHostCount` | < 1 | Critical outage alert |
| **High Unhealthy Instances** | `UnHealthyHostCount` | > 0 | Service degradation |
| **Target Response Time** | ELB `TargetResponseTime` | > 5s | Performance degradation |
| **5xx Errors** | ELB `HTTPCode_Target_5XX` | > 10/min | Application errors |
| **ELB 5xx Errors** | ELB `HTTPCode_ELB_5XX` | > 0 | Infrastructure errors |

### Alert Notification Channels

Alerting configuration is managed outside Terraform. Common channels:
- PagerDuty (for production critical alerts)
- Slack (for team notifications)
- Email (for non-urgent notifications)

**Action Required**: Set up SNS topics and subscribe alert channels to CloudWatch alarms.

## Logging

### Log Aggregation

**Architecture**:
1. Application writes logs to stdout/stderr
2. Docker captures logs via fluentd logging driver
3. Fluentd sidecar processes and enriches logs
4. Logs forwarded to AWS Elasticsearch Service
5. Indexed as `logstash-application_log-{date}`

### Fluentd Log Processing

**Log Transformations**:
- JSON parsing of structured logs
- Log concatenation for multi-line stack traces
- Metadata enrichment with:
  - AWS Region
  - Product Name
  - Environment Tag
  - Instance ID
  - Private IP Address

**Fluentd Configuration** (deployed via cloud-config):
```yaml
<source>
  @type forward
  port 24224
</source>

<filter campaigns.**>
  @type parser
  format json
  key_name log
  reserve_data true
</filter>

<filter campaigns.**>
  @type record_transformer
  <record>
    aws_region "${region}"
    product_name "${product_name}"
    environment_tag "${environment_tag}"
    instance_id "#{ENV['INSTANCE_ID']}"
    ip_address "$private_ipv4"
  </record>
</filter>

<match campaigns.**>
  @type "aws-elasticsearch-service"
  type_name "application_log"
  logstash_format true
  logstash_prefix logstash-application_log
  <endpoint>
    url http://${elk_logs_endpoint}
    region ${region}
  </endpoint>
</match>
```

### Log Querying

**Elasticsearch Endpoint**: Configured per environment via `elk_logs_endpoint` variable

**Common Log Queries**:
```
# Find errors in last hour
environment_tag:"prod" AND level:"error" AND @timestamp:[now-1h TO now]

# Search by instance ID
instance_id:"i-0123456789abcdef"

# Search by correlation ID
correlation_id:"abc-123-def"

# Application-specific searches
product_name:"titan" AND message:"upload"
```

### Debug Logging

To enable debug logging, the application supports the `DEBUG` environment variable:
- `DEBUG='titan*'` - All Titan services debug logs
- `DEBUG='titan:lib:config'` - Configuration debugging
- `DEBUG_DEPTH=8` - Object inspection depth

## Debugging

### SSH Access to EC2 Instances

**SSH Key**: Configured via `ssh_key` variable in Terraform

**Access Steps**:
1. Obtain bastion/jump host access
2. SSH to private instance IP (instances are in private subnets)
3. Use Instance Connect or Session Manager for baseless access

**Instance Discovery**:
```bash
# List instances via AWS CLI
aws ec2 describe-instances \
  --filters "Name=tag:ProductCode,Values={product_code}" \
            "Name=tag:Environment,Values={env}" \
  --query 'Reservations[].Instances[].[InstanceId,PrivateIpAddress,State.Name]'
```

### Docker Container Debugging

**Check Running Containers**:
```bash
# List containers
docker ps

# View application container logs
docker logs -f {container_name}

# View all service logs
journalctl -u campaigns.service -f
```

**Container Names**:
- **Application**: Uses `inventory_code_tag` variable as container name
- **Fluentd**: `fluentd`
- **Falcon Sensor**: `falcon`

**Access Container**:
```bash
# Get shell in running container
docker exec -it {container_name} sh

# Inspect container
docker inspect {container_name}
```

### Systemd Service Debugging

**View Service Status**:
```bash
# Check service status
systemctl status campaigns.service
systemctl status fluentd.service
systemctl status node-exporter.service
systemctl status cadvisor.service

# View service logs
journalctl -u campaigns.service -n 100 --no-pager
journalctl -u fluentd.service -f
```

**Restart Services**:
```bash
systemctl restart campaigns.service
systemctl restart fluentd.service
```

### Application Debugging

**Health Check**:
```bash
# Local health check
curl http://localhost:8080/heartbeat

# Check from load balancer perspective
curl http://{elb_dns}/heartbeat
```

**Application Logs**:
```bash
# Via Docker
docker logs -f {container_name}

# Via journald
journalctl -u campaigns.service -f

# Via files (if configured)
tail -f /var/log/campaigns.log
```

### Prometheus Metrics Debugging

**Check Metrics Endpoints**:
```bash
# Application metrics
curl http://localhost:8080/metrics

# Node exporter metrics
curl http://localhost:9100/metrics

# cAdvisor metrics
curl http://localhost:4914/metrics
```

### Fluentd Debugging

**Check Fluentd Status**:
```bash
# View fluentd logs
docker logs -f fluentd

# Test log forwarding
echo '{"test":"message"}' | docker exec -i {app_container} logger
```

## Incident Response

### Runbooks

#### Service Unavailable (All Instances Down)

**Symptoms**:
- ELB reports 0 healthy instances
- Application returning 503/504 errors
- CloudWatch alarm: `HealthyHostCount < 1`

**Investigation**:
1. Check ASG: Are instances launching? `aws autoscaling describe-auto-scaling-groups`
2. Check instance health: `aws ec2 describe-instance-status`
3. Check ELB targets: Verify instances registered
4. Check security groups: Port 8080 accessible?

**Resolution**:
1. Force new instances: Increase desired capacity temporarily
2. Check recent deployments: Rollback if needed
3. Review application logs for startup errors
4. Verify environment variables and configuration

#### High Error Rate (5xx Errors)

**Symptoms**:
- ELB metrics show elevated `HTTPCode_Target_5XX`
- Application logs show exceptions
- User-reported errors

**Investigation**:
1. Check application logs in Elasticsearch
2. Identify error patterns (stack traces, error types)
3. Check external dependencies (MongoDB, AWS services)
4. Review recent code deployments

**Resolution**:
1. If deployment-related: Rollback to previous version
2. If dependency issue: Check service status, credentials, network
3. If data issue: Review problematic requests, fix data
4. Scale up if load-related: Increase instance count

#### Auto-Scaling Not Working

**Symptoms**:
- Instance count not changing despite load
- CPU alarms firing but no scaling action
- Capacity stuck at min or max

**Investigation**:
1. Check CloudWatch alarms: Are they in ALARM state?
2. Check scaling policies: Are they attached to ASG?
3. Check cooldown periods: Recently scaled?
4. Check ASG capacity: At min or max limits?
5. Review ASG activity history

**Resolution**:
1. Verify alarm thresholds are appropriate
2. Adjust min/max capacity if at limits
3. Wait for cooldown period to expire
4. Manually adjust desired capacity if needed

#### Slow Performance

**Symptoms**:
- High response times
- ELB `TargetResponseTime` elevated
- User complaints about slowness

**Investigation**:
1. Check CPU utilization: Instances overloaded?
2. Check memory usage: Running out of RAM?
3. Check application metrics: Slow database queries?
4. Check network: High latency to dependencies?

**Resolution**:
1. Scale up: Add more instances
2. Optimize: Review slow queries, code paths
3. Increase instance type: More CPU/memory
4. Review recent changes: Rollback if regression

#### Instance Failing Health Checks

**Symptoms**:
- Instances repeatedly terminated and replaced
- `UnHealthyHostCount > 0`
- ASG constantly launching new instances

**Investigation**:
1. Check instance logs before termination
2. Test `/heartbeat` endpoint manually
3. Check application startup time: Longer than health check allows?
4. Review cloud-init logs: `/var/log/cloud-init.log`

**Resolution**:
1. Increase health check grace period if needed
2. Fix application startup issues
3. Verify Docker image is valid
4. Check IAM permissions for startup

### Rollback Procedure

**Terraform Rollback**:
```bash
# Identify previous good version
git log terraform/

# Check what version is deployed
terraform output

# Rollback infrastructure (if needed)
cd terraform
terramisu apply -e tm-{account}/{env} -- \
  -var app_instance_artifact_version={PREVIOUS_VERSION} \
  -var app_instance_image=titan/upload-service

# Or destroy and redeploy
terramisu destroy -e tm-{account}/{env}
terramisu apply -e tm-{account}/{env}
```

**Application Rollback**:
```bash
# Find previous working build version
# (check GitLab pipeline artifacts or ECR image tags)

# Redeploy with previous version
terramisu apply -e tm-{account}/{env} -- \
  -var app_instance_artifact_version={GOOD_VERSION}
```

### Emergency Contacts

**Escalation Path** (configure per organization):
1. On-call engineer (PagerDuty)
2. Team lead
3. Engineering manager
4. DevOps/Platform team

### Disaster Recovery

**Data Loss Prevention**:
- S3 buckets: Enable versioning
- MongoDB: Regular backups via separate process
- Terraform state: Stored in S3 with versioning

**Service Recovery**:
1. Deploy to new environment if needed
2. Use Terraform to rebuild infrastructure
3. Restore data from backups
4. Update DNS/routing

## Capacity Planning

### Scaling Configuration

**Current Scaling Policy**:
- Scale up: +4 instances when CPU > 30%
- Scale down: -1 instance when CPU < 15%
- Cooldown: 5 minutes

**Tuning Recommendations**:
- Monitor CPU patterns over time
- Adjust thresholds based on actual load
- Consider time-based scaling for predictable traffic

### Cost Optimization

**Off-Hours Scheduling**:
- Enabled via `create_night_schedule` variable
- Night schedule: Scale down at 2 AM UTC
- Reset schedule: Scale up at 12:30 PM UTC Mon-Fri
- Tag: `RuntimeHours=off` for cost tracking

**Right-Sizing**:
- Review instance type based on actual resource usage
- Consider spot instances for non-production
- Use ASG metrics to determine optimal min/max capacity

## Maintenance Windows

### Planned Maintenance

**Best Practices**:
1. Schedule during low-traffic periods
2. Deploy to dev → preprod → prod progressively
3. Monitor each stage before proceeding
4. Keep rollback option ready

**Communication**:
- Notify stakeholders before production changes
- Update status page if user-facing
- Document changes in deployment logs

### Patching Strategy

**OS Patching**:
- Flatcar Linux auto-updates are disabled (via cloud-config)
- Update via new AMI selection in Terraform
- Deploy new instances, drain old instances

**Application Patching**:
- Via Docker image updates
- Deploy through GitLab CI/CD pipeline
- Rolling update via ASG instance replacement

**Security Patching**:
- Critical patches: Expedite through pipeline
- Follow same deployment process
- Monitor Falcon Sensor alerts for vulnerabilities

## Operational Tools

### Recommended Tools

- **AWS CLI**: Instance management, debugging
- **kubectl**: If Kubernetes deployment used
- **docker**: Container debugging
- **systemctl**: Service management
- **journalctl**: Log viewing
- **curl**: API testing
- **jq**: JSON processing

### Access Requirements

- **AWS Console Access**: View metrics, logs
- **SSH Access**: Debugging instances
- **GitLab Access**: Deploy, view pipelines
- **Terraform State Access**: Infrastructure changes
- **Elasticsearch Access**: Log querying
