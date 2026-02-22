# Use Cases & Workflows - dmd-pipeline

## Primary Use Cases

### Use Case 1: Fan Creates Demand Request

**Actor**: Fan (via demand-capture service), Pipeline (automated)

**Goal**: Archive fan's demand request for an event/sale into queryable historical storage

**Preconditions**:
- Fan has submitted a demand request (e.g., "remind me when tickets go on sale")
- Demand record written to DynamoDB with fanId, eventId, saleId, and timestamps
- DynamoDB Streams enabled and Kinesis stream configured

**Main Flow**:
1. Fan submits demand request via API → demand-capture service writes record to DynamoDB
2. DynamoDB Stream captures INSERT event with NewImage containing full demand record
3. Kinesis delivers batch of change events to deliveryWorker Lambda function
4. Lambda unmarshalls DynamoDB record, validates type and schema, extracts demand fields
5. Lambda groups demand with other records by type='demand' and partition_date (from requested timestamp)
6. Lambda converts grouped records to Avro container file using demand schema
7. Lambda uploads Avro file to S3 at `s3://{bucket}/data/demand/partition_date=YYYY-MM-DD/{timestamp}-{uuid}.avro`
8. CloudWatch logs capture successful delivery with record count and S3 location

**Postconditions**:
- Demand record stored in S3 in Avro format
- Record is queryable via Athena after partition refresh (MSCK REPAIR TABLE)
- Sensitive data (phone, email) preserved in archive since record not deleted

**Business Rules Applied**:
- Partition date derived from `date.requested` timestamp
- System ID and reference ID automatically added to record
- Record grouped with others from same date to reduce S3 operations

---

### Use Case 2: Data Analyst Queries Demand Trends

**Actor**: Data Analyst

**Goal**: Analyze demand patterns for specific events over time using SQL

**Preconditions**:
- Demand records archived in S3 with partition_date
- Athena table 'demand' configured with Glue catalog
- Athena workgroup permissions granted to analyst

**Main Flow**:
1. Analyst opens AWS Athena console and selects demand workgroup
2. Analyst runs partition refresh: `MSCK REPAIR TABLE demand`
3. Analyst executes query: `SELECT eventid, COUNT(*) as demand_count FROM demand WHERE partition_date >= '2025-01-01' AND isdeleted = false GROUP BY eventid ORDER BY demand_count DESC LIMIT 10`
4. Athena scans S3 partitions, reads Avro files, applies schema from Glue catalog
5. Results returned showing top 10 events by demand volume
6. Analyst exports results for business reporting or dashboard integration

**Postconditions**:
- Analyst has insights into which events generate most fan demand
- Query results available for further analysis or visualization

**Business Rules Applied**:
- Only non-deleted records included (isdeleted = false filter)
- Date partitioning reduces scan cost and improves performance
- Multiple timestamps available (requested, triggered, notified) for different analyses

---

### Use Case 3: Fan Cancels Demand Request

**Actor**: Fan (via demand-capture service), Pipeline (automated)

**Goal**: Archive deletion event with scrubbed PII while maintaining audit trail

**Preconditions**:
- Existing demand record in DynamoDB
- Fan initiates cancellation via API
- Pipeline configured to capture REMOVE events from DynamoDB Stream

**Main Flow**:
1. Fan cancels demand request → demand-capture service deletes record from DynamoDB
2. DynamoDB Stream captures REMOVE event with OldImage containing original record
3. Kinesis delivers batch including REMOVE event to deliveryWorker Lambda
4. Lambda detects eventName='REMOVE', extracts OldImage instead of NewImage
5. Lambda marks record as deleted: sets `isDeleted=true` and `date.deleted={current timestamp}`
6. Lambda scrubs sensitive PII: replaces phoneNumber, email, messageBody with '[redacted]'
7. Lambda groups with other deleted records by type and partition_date (from original requested date)
8. Lambda converts to Avro and uploads to S3 in same partition as original record
9. CloudWatch logs capture deletion event with scrubbed fields confirmed

**Postconditions**:
- Deleted record archived with isDeleted flag
- PII removed from archive for compliance
- Audit trail maintained showing fan had demand at specific time
- Record appears in Athena queries filtered by isdeleted = true

**Business Rules Applied**:
- REMOVE events use OldImage from DynamoDB stream, not NewImage
- PII scrubbing mandatory for deleted records (phoneNumber, email, messageBody → '[redacted]')
- Deletion timestamp added to date.deleted field
- Partition date still derived from original requested date, not deletion date

---

### Use Case 4: Processing Error Occurs

**Actor**: Pipeline (automated), Operations Team (reactive)

**Goal**: Capture and isolate failed records for investigation without blocking other records

**Preconditions**:
- Invalid or malformed record in DynamoDB change event
- OR schema validation failure
- OR S3 upload failure

**Main Flow**:
1. Lambda receives batch of change events from Kinesis
2. Lambda attempts to parse JSON and validate one record against Avro schema
3. Validation fails (e.g., missing required field, wrong data type, invalid record type)
4. Lambda catches error, wraps original JSON in ArchiveError object with error message
5. Lambda continues processing other records in batch (does not fail entire batch)
6. After main processing, Lambda calls deliverError() for all failed records
7. Lambda uploads error JSON to S3 at `s3://{bucket}/errors/{timestamp}-{uuid}.json`
8. Error JSON includes: timestamp, error message, original event JSON array
9. CloudWatch logs error details with record identifiers for alerting
10. Operations team notified via CloudWatch alarms or log monitoring

**Postconditions**:
- Failed record captured in errors/ prefix with full context
- Other records in batch processed successfully
- Operations team can replay or fix and reprocess failed records

**Business Rules Applied**:
- Errors do not block processing of valid records in same batch
- Original JSON preserved for debugging and potential replay
- All errors logged to CloudWatch for visibility
- Error files include timestamp for chronological investigation

---

### Use Case 5: Event Metadata Updated

**Actor**: Event management system, Pipeline (automated)

**Goal**: Archive changes to event metadata for historical tracking

**Preconditions**:
- Event record exists in DynamoDB with id, name, eventDate
- Event details modified (e.g., name change, date change)
- Pipeline configured to capture event type records

**Main Flow**:
1. Event management system updates event record in DynamoDB
2. DynamoDB Stream captures MODIFY event with NewImage containing updated event
3. Kinesis delivers event change to deliveryWorker Lambda
4. Lambda validates event type, extracts id, name, eventDate fields
5. Lambda derives partition_date from date.firstSeen or eventDate.start.dateTime
6. Lambda groups with other event records by partition_date
7. Lambda converts to Avro using event schema and uploads to S3 at `data/event/partition_date=YYYY-MM-DD/`
8. Athena table 'events' now contains historical snapshot of event metadata

**Postconditions**:
- Event change captured in S3 with timestamp
- Historical queries can show event name changes over time
- Reference ID added for deduplication in downstream systems

**Business Rules Applied**:
- Event records use date.firstSeen or eventDate.start.dateTime for partition date
- If both missing, current timestamp used as fallback
- Reference ID is just the event ID (not composite like demand records)

## User Journey Map

**Data Lifecycle in Pipeline**:
1. Operational record created/modified in DynamoDB →
2. DynamoDB Stream captures change →
3. Kinesis buffers and batches events →
4. Lambda receives batch, unmarshalls records →
5. Validation and schema checking →
6. Grouping by type and partition date →
7. Conversion to Avro container format →
8. Upload to S3 in partitioned structure →
9. Glue Catalog provides schema for Athena →
10. Analysts query via Athena SQL

**Analyst Journey**:
1. Analyst identifies business question (e.g., "Which events had most demand last month?") →
2. Analyst opens Athena console, selects workgroup →
3. Analyst refreshes partitions to discover new data →
4. Analyst writes SQL query using demand/event/notification/sale tables →
5. Athena scans S3, applies Avro schema, returns results →
6. Analyst exports data for visualization or reporting

## Key Workflows

### Workflow 1: Real-Time Change Capture and Archival

```
DynamoDB Change → DynamoDB Stream → Kinesis Stream → Lambda (deliveryWorker) →
[Parse] → [Validate] → [Group by Type+Date] → [Convert to Avro] →
[Upload to S3] → [Log Success]

Error Path: [Validation Fails] → [Create ArchiveError] → [Upload to errors/] → [Log Error]
```

**Timing**: 30-60 seconds end-to-end (DynamoDB change to S3 availability)

### Workflow 2: Partition Management and Query Preparation

```
New S3 Files Uploaded → Data Analyst Needs Fresh Data →
Run `MSCK REPAIR TABLE {table}` → Glue Catalog Discovers New Partitions →
Athena Queries Can Access New Data
```

**Timing**: Partition refresh takes 2-5 seconds; required before querying new partitions

### Workflow 3: Batch Processing with Error Isolation

```
Kinesis Batch (up to 1000 records) → Lambda Processes Each →
Valid Records: Group → Convert → Upload
Invalid Records: Capture Error → Collect → Upload to errors/
All: Log Results → Return to Kinesis (no failure, prevents retries)
```

**Key Feature**: Errors isolated per-record; batch never fails entirely

## Example Scenarios

### Scenario 1: Concert Announcement Generates Surge of Demand

**Situation**: Taylor Swift announces surprise tour date → 50,000 fans create demand requests within 5 minutes

**Pipeline Response**:
- DynamoDB receives 50,000 writes in 5 minutes
- DynamoDB Stream + Kinesis buffers events into batches of 1000
- Lambda invoked ~50 times with parallelization_factor to process in parallel
- Records grouped by partition_date=2025-02-13 (today)
- Each Lambda batch generates 1-5 Avro files (depending on grouping)
- S3 receives ~100-200 Avro files within 2 minutes
- Analyst runs MSCK REPAIR TABLE demand
- Query `SELECT COUNT(*) FROM demand WHERE eventid='{taylor_swift_event}' AND partition_date='2025-02-13'` returns 50,000

**Business Value**: Immediate visibility into demand spike for capacity planning and sales strategy

---

### Scenario 2: Compliance Audit Requires Deleted Record Report

**Situation**: Legal team needs report of all deleted demand records from Q4 2024 for GDPR compliance audit

**Pipeline Response**:
- All deleted records archived with isDeleted=true and date.deleted timestamp
- PII scrubbed (phone/email → '[redacted]')
- Query available: `SELECT fanid, eventid, date.requested, date.deleted FROM demand WHERE isdeleted = true AND partition_date >= '2024-10-01' AND partition_date < '2025-01-01'`
- Results show 12,000 deleted records with timestamps
- Legal team confirms PII removed and retention policy followed

**Business Value**: Compliance with data protection regulations; audit trail without exposing PII

---

### Scenario 3: Marketing Analyzes Notification Effectiveness

**Situation**: Marketing wants to compare demand requested vs notified timestamps to measure notification lag

**Pipeline Response**:
- Demand records include date.requested, date.triggered, date.notified timestamps
- All archived in demand table with full timestamp granularity
- Query: `SELECT AVG(UNIX_TIMESTAMP(date.notified) - UNIX_TIMESTAMP(date.requested)) as avg_lag_seconds FROM demand WHERE date.notified IS NOT NULL AND partition_date >= '2025-01-01'`
- Results show average 45-second lag from request to notification
- Marketing identifies slow periods and optimizes notification service

**Business Value**: Data-driven optimization of fan experience and notification timing

---

### Scenario 4: Data Quality Issue Discovered in Production

**Situation**: Invalid records written to DynamoDB due to upstream bug → pipeline captures errors

**Pipeline Response**:
- Lambda validates each record against Avro schema
- 200 invalid records fail validation (missing required field)
- Lambda uploads 200 error JSON files to `errors/` prefix with original event data
- CloudWatch logs show error spike → alert triggered
- Operations team reviews error files, identifies root cause (missing saleId field)
- Upstream service fixed, operations team replays error files after fixing records
- Valid records continue processing unaffected

**Business Value**: Error isolation prevents data loss and provides debugging context without blocking valid data
