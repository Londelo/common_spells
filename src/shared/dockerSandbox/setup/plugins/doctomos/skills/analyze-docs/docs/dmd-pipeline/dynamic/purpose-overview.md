# Purpose - dmd-pipeline

## What This Does

The demand-pipeline is a real-time data warehousing system that captures changes to demand-related records from DynamoDB and archives them in S3 for analytical querying via AWS Athena. It transforms live operational data into queryable historical records for business intelligence and reporting.

## Business Context

This pipeline solves the problem of analyzing historical demand patterns and fan behavior for ticketing events. While the operational DynamoDB table stores current state, the business needs to query historical trends, analyze fan engagement over time, track deleted records for compliance, and generate reports on demand patterns across events and sales. Without this pipeline, teams would lack visibility into historical data and have no efficient way to run analytical queries on large datasets.

## Target Users/Consumers

- Data Analysts: Query historical demand, event, sale, and notification data using SQL via Athena
- Business Intelligence Teams: Generate reports on fan behavior, demand patterns, and notification effectiveness
- Data Science Teams: Access structured historical data for machine learning models and trend analysis
- Compliance Teams: Audit deleted records and track data retention policies
- Other Services: Downstream systems consuming archived data from S3 for batch processing

## Key Business Capabilities

- Real-time archival: Captures every change to demand records within seconds via DynamoDB Streams
- Historical analysis: Enables SQL queries on millions of historical records partitioned by date
- Data compliance: Scrubs sensitive information (phone numbers, emails) from deleted records
- Multi-format support: Stores data in Avro (primary) and Parquet formats for different query patterns
- Error tracking: Isolates and stores records that fail processing for investigation and recovery
- Change tracking: Maintains complete audit trail of record modifications including deletions

## Business Requirements & Constraints

- REQ-001: Pipeline must process DynamoDB change events within 60 seconds of occurrence
- REQ-002: All sensitive PII (phone numbers, emails, message bodies) must be redacted from deleted records
- REQ-003: Records must be partitioned by date to enable efficient querying and cost management
- REQ-004: System must handle 4 distinct record types: demand, notification, event, and sale
- REQ-005: Deleted records must be marked with isDeleted flag and deletion timestamp, not removed
- REQ-006: Failed records must be captured with original JSON for replay and debugging
- REQ-007: Data must be queryable within 5 minutes of archival (Athena partition refresh time)
- REQ-008: Pipeline must support batch sizes up to 1000 records per Lambda invocation

## Core Business Rules

- "Records deleted from DynamoDB are archived with isDeleted=true and scrubbed PII, not removed from archive"
- "Only INSERT and MODIFY events use NewImage; REMOVE events use OldImage from DynamoDB stream"
- "Partition date is derived from the record's primary timestamp (requested date for demand, created date for notifications, etc.)"
- "Records are grouped by type and partition date before conversion to reduce S3 PUT operations"
- "Failed records are stored separately in errors/ prefix with original JSON for manual investigation"
- "All demand records receive a reference ID combining eventId, saleId, and fanId for deduplication"
- "System metadata (system ID, database ID, member ID) is automatically attached to demand records"

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Record batch processed | Upload Avro container file | S3 bucket (data/ prefix) | Immediately after batch conversion |
| Processing error occurs | Upload error JSON | S3 bucket (errors/ prefix) | When validation or conversion fails |
| S3 write complete | CloudWatch logs | Log aggregation stream (Kinesis) | Real-time for all Lambda executions |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| DynamoDB Table | INSERT/MODIFY stream event | Parse NewImage, validate, group by type/date, convert to Avro, upload to S3 | Within 60 seconds |
| DynamoDB Table | REMOVE stream event | Parse OldImage, mark deleted, scrub PII, convert to Avro, upload to S3 | Within 60 seconds |
| Kinesis Stream | Batched change events | Process up to 1000 records per Lambda invocation with parallelization | Continuous (LATEST position) |

### Service Dependencies

| Service | Purpose | Criticality |
|---------|---------|-------------|
| DynamoDB Table (demand) | Source of record changes | Critical - data origin |
| Kinesis Stream | Delivers DynamoDB Stream events to Lambda | Critical - event delivery |
| S3 Bucket | Storage for Avro/Parquet files and errors | Critical - data persistence |
| AWS Glue Catalog | Schema registry for Athena tables | High - query capability |
| AWS Athena | Query engine for archived data | High - business analytics |
| CloudWatch Logs | Monitoring and debugging | High - observability |

## Success Metrics

- Event processing latency < 60 seconds (from DynamoDB change to S3 upload)
- Processing success rate > 99.9% (failed records captured in errors/ prefix)
- S3 storage efficiency: average 100+ records per Avro file (via batching)
- Athena query performance: < 5 seconds for single-partition queries
- Data accuracy: 100% (all DynamoDB changes captured with no data loss)
- PII scrubbing compliance: 100% (all deleted records have redacted sensitive fields)
