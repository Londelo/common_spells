# Operations - export-service

## Monitoring

### CloudWatch

**Auto Scaling Group Metrics:**

All ASG metrics are enabled:
- GroupMinSize
- GroupMaxSize
- GroupDesiredCapacity
- GroupInServiceInstances
- GroupPendingInstances
- GroupStandbyInstances
- GroupTerminatingInstances
- GroupTotalInstances

**CloudWatch Alarms:**

| Alarm | Threshold | Evaluation | Action |
|-------|-----------|------------|--------|
| CpuHigh | > 30% | 3 periods (60s) | Scale up by 4 instances |
| CpuLow | < 15% | 3 periods (300s) | Scale down by 1 instance |

**Alarm States:**
- OK: Within normal operating parameters
- ALARM: Threshold breached, scaling action triggered
- INSUFFICIENT_DATA: Not enough data points

### Prometheus Metrics

**Node Exporter (Port 9100):**
- CPU usage
- Memory utilization
- Disk I/O
- Network statistics
- Process count
- Load averages

**cAdvisor (Port 4914):**
- Container CPU usage
- Container memory usage
- Container network I/O
- Container filesystem usage
- Container restart count

**Application Metrics (Port 8080):**
- Custom application metrics exposed via `@verifiedfan/prometheus`
- HTTP request duration
- Request count by status code
- Custom business metrics

**Discovery Tags:**
- `Prometheus=enabled`
- `Prometheus8080=enabled`

### ELB Health Checks

**Configuration:**
- Protocol: HTTP
- Port: 8080
- Path: `/heartbeat`
- Interval: 30 seconds
- Timeout: 3 seconds
- Healthy threshold: 3 consecutive checks
- Unhealthy threshold: 2 consecutive checks

**Expected Response:**
- Status: 200 OK
- Body: Health check response (format varies by application)

## Logging

### ELK Stack Integration

**Log Flow:**
1. Application logs to Docker stdout/stderr
2. Docker fluentd log driver captures logs
3. Fluentd container forwards to AWS Elasticsearch
4. Logs indexed in Elasticsearch
5. Viewable via Kibana

**Fluentd Configuration:**

```yaml
Source:
  Type: forward
  Port: 24224

Filter Chain:
  1. Parse JSON log format
  2. Concatenate multiline logs
  3. Enrich with metadata:
     - aws_region
     - product_name
     - environment_tag
     - instance_id
     - ip_address

Destination:
  Type: aws-elasticsearch-service
  Format: logstash
  Prefix: logstash-application_log
  Flush Interval: 5 seconds
  Buffer: 16MB chunks, 64 queue length
```

**Log Endpoints:**
- dev1: `verifiedfan-logs.dev1.us-east-1.nonprod-tmaws.io`
- prod1: `verifiedfan-logs.prod1.us-east-1.prod-tmaws.io`

**Kibana Access:**
- URL: (Contact DevOps for Kibana URL)
- Index Pattern: `logstash-application_log-*`

### Log Queries

**Common Searches:**

Find errors in last 15 minutes:
```
environment_tag:"prod1" AND product_name:"titan" AND (level:"error" OR level:"ERROR")
```

Find logs for specific instance:
```
instance_id:"i-0123456789abcdef"
```

Find slow requests:
```
environment_tag:"prod1" AND duration:>5000
```

### Debug Mode

**Enable Debug Logging:**

Set environment variable in cloud-config:
```bash
DEBUG='titan*'
DEBUG_DEPTH=8
```

Currently enabled for all environments via docker-compose and cloud-config.

## Alerting

### CloudWatch Alarms

**Current Alarms:**
- CPU-based auto-scaling (operational, not critical alerts)

**Recommended Additional Alarms:**
- ELB unhealthy host count > 0
- ELB 5XX error rate > threshold
- ASG instances in service < min count
- Disk usage > 80%
- Memory usage > 80%

**Notification Channels:**
- Configure SNS topics for alarm notifications
- Integrate with PagerDuty, Slack, or email

### Application-Level Alerting

**Health Check Failures:**
- Monitored by ELB
- Unhealthy instances automatically replaced by ASG

**Error Rate Monitoring:**
- Set up ELK alerts for error log volume
- Alert when error rate > threshold for 5 minutes

## Runbooks

### Common Issues

#### Issue: Instance Fails Health Checks

**Symptoms:**
- ELB marks instance as unhealthy
- ASG terminates and replaces instance
- Service unavailable errors

**Diagnosis:**
1. Check ELB health check status:
   ```bash
   aws elb describe-instance-health \
     --load-balancer-name <ELB_NAME> \
     --region us-east-1
   ```

2. Check application logs in ELK:
   ```
   instance_id:"<INSTANCE_ID>" AND level:"error"
   ```

3. SSH to instance and check Docker logs:
   ```bash
   ssh -i <SSH_KEY> core@<INSTANCE_IP>
   docker logs <CONTAINER_NAME>
   ```

**Resolution:**
- If transient: Wait for ASG to replace instance
- If persistent: Check application code for /heartbeat endpoint
- Verify environment variables in cloud-config
- Check container resource limits

#### Issue: Application Won't Start

**Symptoms:**
- Instance passes health checks initially, then fails
- Docker container exits after starting
- No application logs in ELK

**Diagnosis:**
1. SSH to instance:
   ```bash
   ssh -i <SSH_KEY> core@<INSTANCE_IP>
   ```

2. Check systemd service status:
   ```bash
   systemctl status campaigns.service
   journalctl -u campaigns.service -n 100
   ```

3. Check Docker container status:
   ```bash
   docker ps -a
   docker logs vf-export
   ```

4. Verify image was pulled:
   ```bash
   docker images | grep export-service
   ```

**Resolution:**
- Verify ECR image exists and tag is correct
- Check IAM permissions for ECR pull
- Review application startup errors in logs
- Verify environment variables
- Check for missing dependencies

#### Issue: High CPU Usage / Auto-Scaling Storms

**Symptoms:**
- Frequent scale-up events
- CPU consistently above threshold
- Slow response times

**Diagnosis:**
1. Check CloudWatch CPU metrics:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/EC2 \
     --metric-name CPUUtilization \
     --dimensions Name=AutoScalingGroupName,Value=<ASG_NAME> \
     --start-time <TIME> --end-time <TIME> \
     --period 300 --statistics Average
   ```

2. Review application metrics in Prometheus
3. Check for memory leaks in Node.js application
4. Review slow queries in application logs

**Resolution:**
- Increase instance type if consistently high
- Optimize application code (database queries, caching)
- Adjust CPU thresholds in CloudWatch alarms
- Increase max instance count if traffic spike is legitimate
- Review and optimize memory usage (--max-old-space-size=4096)

#### Issue: Terraform State Locked

**Symptoms:**
- Deployment fails with "state is locked" error
- Cannot apply or destroy infrastructure

**Diagnosis:**
1. Check lock information:
   ```bash
   cd terraform
   terraform show
   ```

2. Identify who/what has the lock

**Resolution:**
1. If lock is from failed GitLab job:
   - Run "release lock" job in GitLab CI
   - Or manually:
     ```bash
     terramisu force-unlock -e tm-${AWS_ACCOUNT}/${TERRAFORM_ENV}
     ```

2. If lock is from active deployment:
   - Wait for deployment to complete
   - Do NOT force unlock during active changes

**Prevention:**
- Ensure CI jobs properly clean up on failure
- Avoid concurrent deployments
- Use GitLab environment locks

#### Issue: Cannot Connect to Application

**Symptoms:**
- DNS resolves correctly
- Connection timeout or refused
- Service unavailable

**Diagnosis:**
1. Check DNS resolution:
   ```bash
   nslookup vf-export-prod1-us-east-1.titan.prod-tmaws.io
   ```

2. Check ELB health:
   ```bash
   aws elb describe-load-balancers \
     --load-balancer-names <ELB_NAME> \
     --region us-east-1
   ```

3. Check security groups:
   ```bash
   aws ec2 describe-security-groups \
     --group-ids <SG_ID> \
     --region us-east-1
   ```

4. Verify from VPN/internal network (ELB is internal)

**Resolution:**
- Confirm connecting from correct network (internal VPC)
- Verify security group allows traffic from your source
- Check ELB listener configuration
- Verify SSL certificate is valid
- Check Route 53 health checks

#### Issue: Out of Memory (OOM)

**Symptoms:**
- Container exits unexpectedly
- Node.js heap exhausted errors
- System OOM killer terminates process

**Diagnosis:**
1. Check Docker logs for OOM errors:
   ```bash
   docker logs vf-export 2>&1 | grep -i "memory\|heap"
   ```

2. Review memory metrics in Prometheus/cAdvisor

3. Check Node.js heap usage in application logs

**Resolution:**
- Increase `--max-old-space-size` (currently 4096)
- Increase instance type for more RAM
- Optimize application memory usage:
  - Fix memory leaks
  - Reduce in-memory caching
  - Stream large datasets instead of loading in memory
- Review and optimize batch processing jobs

#### Issue: S3 Access Denied

**Symptoms:**
- Application logs show S3 permission errors
- Export/import operations fail

**Diagnosis:**
1. Check IAM role attached to instance:
   ```bash
   aws iam get-instance-profile --instance-profile-name <PROFILE_NAME>
   ```

2. Review IAM policies attached to role

3. Verify S3 bucket ARNs in policy match actual buckets

4. Check bucket policies for deny statements

**Resolution:**
- Verify IAM role has correct policies attached
- Check S3 bucket names in terraform.tfvars
- Ensure cross-account roles have correct trust relationships
- For SFMC/TMOL buckets, verify AssumeRole is working

#### Issue: Database Connection Failures

**Symptoms:**
- Application cannot connect to MongoDB
- Connection timeout errors

**Diagnosis:**
1. Check connection string in application config
2. Verify database network access (security groups)
3. Check database is running and accepting connections
4. Review connection pool settings

**Resolution:**
- Verify MongoDB connection string
- Check security groups allow port 27017
- Ensure MongoDB indexes were created (pre-deploy job)
- Review connection timeout settings
- Check for DNS resolution issues

## Debugging

### SSH Access to Instances

**Prerequisites:**
- SSH key: `cet-qa-east` (nonprod) or `cet-prod-east` (prod)
- VPN connection to internal network (ELB is internal)

**Connect:**
```bash
# Get instance IP from AWS console or CLI
aws ec2 describe-instances \
  --filters "Name=tag:InventoryCode,Values=vf-export" \
            "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,PrivateIpAddress,Tags[?Key==`Environment`].Value|[0]]' \
  --output table

# SSH to instance (Flatcar uses 'core' user)
ssh -i ~/.ssh/cet-prod-east.pem core@<INSTANCE_IP>
```

### Container Debugging

**View running containers:**
```bash
docker ps
```

**View all containers (including stopped):**
```bash
docker ps -a
```

**View container logs:**
```bash
docker logs vf-export
docker logs -f vf-export  # Follow logs
docker logs --tail 100 vf-export  # Last 100 lines
```

**Execute commands in running container:**
```bash
docker exec -it vf-export /bin/sh
```

**Inspect container:**
```bash
docker inspect vf-export
```

### Systemd Service Debugging

**Check service status:**
```bash
sudo systemctl status campaigns.service
sudo systemctl status fluentd.service
sudo systemctl status node-exporter.service
```

**View service logs:**
```bash
sudo journalctl -u campaigns.service -n 100
sudo journalctl -u campaigns.service -f  # Follow logs
sudo journalctl -u campaigns.service --since "10 minutes ago"
```

**Restart service:**
```bash
sudo systemctl restart campaigns.service
```

### Network Debugging

**Check listening ports:**
```bash
sudo netstat -tlnp
```

**Test health check endpoint:**
```bash
curl http://localhost:8080/heartbeat
```

**Check DNS:**
```bash
nslookup vf-export-prod1-us-east-1.titan.prod-tmaws.io
```

**Check connectivity to ELB:**
```bash
curl -I https://vf-export-prod1-us-east-1.titan.prod-tmaws.io
```

### Metrics Access

**Node Exporter:**
```bash
curl http://localhost:9100/metrics
```

**cAdvisor:**
```bash
curl http://localhost:4914/metrics
```

**Application Metrics:**
```bash
curl http://localhost:8080/metrics
```

## Maintenance

### Planned Downtime

**Process:**
1. Schedule maintenance window
2. Notify stakeholders
3. Disable auto-scaling (set min=max=0) OR
4. Drain connections gracefully:
   ```bash
   aws elb deregister-instances-from-load-balancer \
     --load-balancer-name <ELB_NAME> \
     --instances <INSTANCE_ID>
   ```
5. Perform maintenance
6. Re-enable auto-scaling or re-register instances
7. Verify health checks pass

### Instance Refresh

**Manual Instance Replacement:**
```bash
# Terminate instance (ASG will create replacement)
aws autoscaling terminate-instance-in-auto-scaling-group \
  --instance-id <INSTANCE_ID> \
  --should-decrement-desired-capacity
```

**Rolling Update:**
Update launch template, then:
```bash
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name <ASG_NAME> \
  --preferences MinHealthyPercentage=100
```

### Scaling Adjustments

**Temporarily Increase Capacity:**
```bash
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name <ASG_NAME> \
  --desired-capacity 2
```

**Permanently Change Capacity:**
Update `app_instance_min_count` and `app_instance_max_count` in terraform.tfvars, then deploy.

### Database Maintenance

**Rebuild Indexes:**
```bash
# Run from GitLab CI or locally with correct NODE_ENV
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run createMongoIndexes
```

**Schedule:** Pre-deployment for each environment

## Performance Tuning

### Application Level

**Node.js Memory:**
- Current: `--max-old-space-size=4096`
- Increase if experiencing OOM errors
- Monitor heap usage before changing

**Environment Variables:**
- `NODE_ENV`: production (enables optimizations)
- `DEBUG`: Control debug log verbosity

### Infrastructure Level

**Instance Type:**
- dev1: t2.medium (2 vCPU, 4 GB RAM)
- prod1: t2.xlarge (4 vCPU, 16 GB RAM)

**Auto-Scaling:**
- Scale-up threshold: 30% CPU
- Scale-down threshold: 15% CPU
- Adjust based on actual usage patterns

**Connection Draining:**
- Current: 600 seconds
- Tune based on request duration

## Security Operations

### CrowdStrike Falcon Monitoring

**Service:** `falcon-sensor.service`

**Check Status:**
```bash
sudo systemctl status falcon-sensor.service
docker logs falcon
```

**Agent Tags:**
- ProductCode: PRD1541
- InventoryCode: vf-export
- Environment: Nonprod/Prod
- PosturePref: Measured
- UpdatePref: Early

**Alerts:**
Monitor CrowdStrike console for security events

### Security Group Audits

**Review Regularly:**
1. Ensure minimal access (principle of least privilege)
2. Remove unused rules
3. Document all exceptions
4. Audit ingress from 0.0.0.0/0 (should be none)

### IAM Role Audits

**Review:**
1. Policies attached to instance role
2. Cross-account assume role permissions
3. S3 bucket access (ensure minimal required)
4. Remove unused policies

### Secrets Rotation

**Current Secrets:**
- None hardcoded (uses IAM instance profile)
- AWS credentials auto-rotated via STS

**Best Practice:**
- Never hardcode credentials
- Use AWS Secrets Manager for external API keys
- Rotate database passwords regularly

## Disaster Recovery

### Backup Strategy

**Application:**
- Docker images in ECR (retained)
- Source code in GitLab
- Terraform state in S3 (versioned)

**Data:**
- S3 buckets (versioning enabled recommended)
- MongoDB backups (separate from this service)

### Recovery Procedures

**Complete Environment Loss:**

1. Ensure Terraform state is intact in S3
2. Run deployment pipeline from GitLab:
   ```bash
   # Terraform will recreate all resources
   terramisu apply -e tm-${AWS_ACCOUNT}/${TERRAFORM_ENV}
   ```
3. Verify health checks pass
4. Restore data from backups if needed

**Data Loss:**
1. Restore S3 buckets from backups or versioning
2. Restore MongoDB from backups (if applicable)
3. Restart application if needed

**RTO/RPO:**
- RTO (Recovery Time Objective): ~15 minutes (Terraform apply time)
- RPO (Recovery Point Objective): Depends on data backup frequency

## Capacity Planning

### Current Limits

**Instances:**
- dev1: 1 min, 1 max (no scaling)
- prod1: 1 min, 1 max (no scaling)

**Scaling Capacity:**
- Max scale-up: 4 instances at once
- Max total: Limited by `app_instance_max_count`

### Monitoring Utilization

**Weekly Review:**
1. CPU utilization trends
2. Memory usage patterns
3. Request volume
4. Error rates
5. Response times

### Scaling Recommendations

**Increase Capacity When:**
- CPU consistently > 50%
- Response times increase
- Error rates increase during traffic spikes
- Memory usage > 70%

**Consider:**
1. Increase `app_instance_max_count` in terraform.tfvars
2. Increase instance type for vertical scaling
3. Optimize application for horizontal scaling

## Contact Information

**DevOps Team:**
- Slack: (Add channel)
- Email: (Add email)
- PagerDuty: (Add escalation policy)

**On-Call Rotation:**
- (Add on-call schedule)

**Escalation:**
1. DevOps engineer (first response)
2. DevOps team lead (if unresolved after 30 minutes)
3. Engineering manager (if critical and unresolved after 1 hour)
