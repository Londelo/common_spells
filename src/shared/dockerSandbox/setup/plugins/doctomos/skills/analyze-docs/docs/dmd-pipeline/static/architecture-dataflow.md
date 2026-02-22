# Data Flow - dmd-pipeline

## Overview

The demand-pipeline implements a Change Data Capture (CDC) pipeline that streams DynamoDB modification records through Kinesis to Lambda, transforms them into analytical formats (Avro/Parquet), and stores them in S3 for querying with Athena.

## Primary Data Flow

```
DynamoDB Table (demand-capture)
         |
         | (DynamoDB Streams)
         ↓
  Kinesis Data Stream
         |
         | (Event Source Mapping with Filters)
         ↓
  Lambda: deliveryWorker
         |
         | (Batch Processing)
         ↓
    [Parse & Validate]
         |
         | (Group by Type & Date)
         ↓
   [Encode to Format]
         |
         | (Avro or Parquet)
         ↓
  S3 Bucket (Partitioned)
         |
         | (Athena Glue Tables)
         ↓
    AWS Athena Queries
```

## Detailed Request/Event Flow

### 1. Event Ingestion

**Source**: DynamoDB Streams from demand-capture table
**Transport**: Kinesis Data Stream
**Trigger**: Lambda Event Source Mapping

**Event Filtering** (`terraform/lambda.tf`):
- Only processes records with type: ['demand', 'notification', 'event', 'sale']
- Captures both INSERT/MODIFY (NewImage) and REMOVE (OldImage) events
- Batch size configurable (default: 100 records)
- Parallelization factor configurable (default: 10)

**Event Structure**:
```json
{
  "Records": [
    {
      "kinesis": {
        "data": "<base64-encoded-dynamodb-stream-record>"
      }
    }
  ]
}
```

### 2. Lambda Handler Processing

**Entry Point**: `src/lambda/deliveryWorker/index.ts`

**Handler Flow**:
```typescript
handler (Kinesis Event)
  ↓
DeliveryWorker (Handler Provider)
  ↓
1. Decode base64 Kinesis data to JSON
2. Call deliverDemandRecords(recordsJson)
3. Log deliveries and errors
```

**Middleware**:
- `@ticketmaster/lambda` boot framework
- `Instrument` middleware for observability
- Service injection via `buildServices()`

### 3. Core Processing Pipeline

**Entry Point**: `src/core/deliverDemandRecords.ts`

**Processing Steps**:

#### Step 1: Parse Records
```
recordsJson[] → parseImageJSON() → Result<ParsedRecord, ArchiveError>[]
```
- Parse JSON string to DynamoDB Stream Record
- Select NewImage (INSERT/MODIFY) or OldImage (REMOVE)
- Unmarshall DynamoDB record to plain object
- Validate record type
- Validate against format schema (Avro/Parquet)
- Mark deleted for REMOVE events
- Build record with enrichments (reference, systemId)

#### Step 2: Group Results
```
Result<ParsedRecord>[] → groupResults() → { errors: [], values: [] }
```
- Separate successful parses from errors
- Errors accumulated for later delivery

#### Step 3: Group by Type and Partition Date
```
ParsedRecord[] → groupBy(type/date) → Map<string, ParsedRecord[]>
```
- Key format: `{type}/{partition_date}`
- Example: `demand/2024-01-15`, `event/2024-01-16`
- Partition date extracted using `selectDate(record)` based on record type

#### Step 4: Deliver Groups in Parallel
```
Grouped Records → deliverGroup() → Result<ArchiveDelivery>[]
```
For each group:
1. Extract DemandRecord[] from ParsedRecord[]
2. Call `format.toContainer(records)` → Avro/Parquet Buffer
3. Call `storage.deliver(type, date, buffer)` → S3 location
4. Return ArchiveDelivery with metadata

#### Step 5: Deliver Errors
```
ArchiveError[] → deliverError() → Result<ArchiveErrorDelivery>[]
```
- Store failed records in S3 error prefix
- Include original JSON, error message, timestamp

### 4. Format Encoding

**Avro Flow** (`src/format/avro/index.ts`):
```
DemandRecord[] → getSchema(type) → avro.streams.BlockEncoder → Buffer
```
- Retrieve schema from `schemas/{type}.json`
- Create Avro BlockEncoder with schema
- Stream records through encoder
- Collect into single Buffer

**Parquet Flow** (`src/format/parquet/index.ts`):
```
DemandRecord[] → getSchema(type) → ParquetTransformer → Buffer
```
- Retrieve schema from `schemas/{type}.json`
- Create ParquetSchema and PatchedParquetTransformer
- Stream records through transformer
- Collect into single Buffer

**Validation**:
- Performed during parsing stage
- Avro: `type.isValid()` with error collection
- Parquet: `schema.shredRecord()` with try/catch

### 5. Storage Delivery

**S3 Storage Flow** (`src/delivery/S3Storage.ts`):

**Data Delivery**:
```
deliver(type, partitionDate, container)
  ↓
Generate key: {prefix}/{type}/partition_date={date}/{timestamp}-{uuid}.avro
  ↓
PutObjectCommand(bucket, key, buffer)
  ↓
Return S3Record { type: 's3', bucket, key }
```

**Error Delivery**:
```
deliverError(error)
  ↓
Generate key: {errors_prefix}/{timestamp}-{uuid}.json
  ↓
Build error document: { timestamp, error: { message }, events: [] }
  ↓
PutObjectCommand(bucket, key, JSON)
  ↓
Return S3Record { type: 's3', bucket, key }
```

**S3 Partitioning Strategy**:
```
{prefix}/
  {format}/               # avro or parquet
    {record_type}/        # demand, event, notification, sale
      partition_date={YYYY-MM-DD}/
        {YYYY-MM-DD-HH-mm-ss}-{uuid}.avro
```

### 6. Partition Date Selection

**Logic** (`src/demand/DemandRecord.ts:selectDate()`):

| Record Type | Partition Date Source |
|-------------|----------------------|
| demand | `date.requested` |
| notification | `date.created` |
| event | `date.firstSeen` or `eventDate.start.dateTime` or current time |
| sale | `saleStartDateTime` |

All dates converted to ISO date string (YYYY-MM-DD).

## Record Transformation Pipeline

### Parse Stage Transformations

1. **DynamoDB Unmarshalling**:
   - `unmarshall()` converts DynamoDB AttributeValue format to plain objects
   - Example: `{ S: "value" }` → `"value"`

2. **Delete Marking** (for REMOVE events):
   - Add `isDeleted: true`
   - Add `date.deleted: <current timestamp>`
   - Scrub PII fields (phoneNumber, email, messageBody) to `[redacted]`

3. **Record Building** (via `buildRecord()`):
   - **For demand records**:
     - Add `system` field via `putSystemId()`
     - Add `reference` field via `putReference()`
   - **For other records**:
     - Add `reference` field via `putReference()`

## State Management

**Stateless Lambda Function**:
- No state maintained between invocations
- Each batch processed independently
- Configuration loaded per cold start from environment

**State Sources**:
- **Configuration**: Loaded from `config/` via `@ticketmaster/lambda/config`
- **Environment Variables**: AWS_REGION, service endpoints
- **Kinesis State**: Shard iterators managed by Event Source Mapping

**Batch Processing**:
- Kinesis delivers batches of up to N records (configurable)
- Lambda processes entire batch in single invocation
- Partial failures handled gracefully (errors delivered separately)

## External Integrations

| Integration | Direction | Purpose | Configuration |
|-------------|-----------|---------|---------------|
| DynamoDB Streams | Read | Source of change data | `var.kinesis_stream_name` |
| Kinesis Data Stream | Read | Transport layer | Event Source Mapping |
| S3 | Write | Archive storage | `config.s3.bucket`, `config.s3.prefix` |
| Athena | Read (external) | Query interface | Glue catalog tables |
| CloudWatch Logs | Write | Logging & monitoring | Log subscription filter |
| IAM | Auth | Permissions | Policies in `terraform/iam.tf` |

## Data Format Specifications

### Avro Container Format
- **Encoding**: Binary Avro with Object Container File format
- **Compression**: None (configurable in encoder options)
- **Metadata**: Schema embedded in container header
- **Content-Type**: `avro/binary`

### Parquet Container Format
- **Encoding**: Columnar Parquet format
- **Compression**: Snappy (default in parquets library)
- **Metadata**: Schema embedded in Parquet metadata
- **Content-Type**: `application/octet-stream`

### Error Format
- **Encoding**: JSON
- **Schema**: `{ timestamp: string, error: { message: string }, events: string[] }`
- **Content-Type**: `application/json`

## Query Access via Athena

**Glue Catalog Tables** (configured in `terraform/athena.tf`):
- One table per record type: `demand`, `event`, `notification`, `sale`
- Partitioned by `partition_date`
- SerDe configured for Avro/Parquet format
- Location: `s3://{bucket}/{prefix}/{format}/{type}/`

**Query Flow**:
```
Athena Console/SDK
  ↓
Glue Catalog (table schema)
  ↓
S3 Scan (partitioned by date)
  ↓
Avro/Parquet Deserialization
  ↓
Query Results
```

## Error Handling Data Flow

**Error Types & Handling**:

1. **Parse Errors**:
   - JSON parse failure
   - Invalid record type
   - Schema validation failure
   → Wrapped in ArchiveError
   → Delivered to S3 errors prefix
   → Original JSON preserved

2. **Encoding Errors**:
   - Avro/Parquet encoding failure
   → Wrapped in ArchiveError
   → Delivered to S3 errors prefix
   → All records in group preserved

3. **S3 Delivery Errors**:
   - Network failures
   - Permission errors
   → Logged to CloudWatch
   → Returned as error Result
   → Lambda may retry batch

4. **Error Delivery Failures**:
   - S3 write to errors prefix fails
   → Logged to CloudWatch
   → Not retried (to prevent infinite loops)

**Error Data Preservation**:
```
ArchiveError {
  message: string           // Error description
  originalEvents: string[]  // Original JSON records
}
  ↓
S3 Error Document {
  timestamp: ISO string     // When error occurred
  error: { message }        // Error details
  events: string[]          // Original records for replay
}
```

## Performance Characteristics

**Batch Processing**:
- Kinesis batch size: Configurable (default: 100)
- Parallel delivery: Groups processed in parallel via Promise.all()
- Parallelization factor: Configurable (default: 10 concurrent batches)

**Grouping Strategy**:
- In-memory grouping by type/date
- Each group becomes one S3 object
- Optimizes S3 operations and reduces Athena scan cost

**Stream Processing**:
- Records streamed through Avro/Parquet encoders
- Reduces memory footprint for large batches
- Buffer collected at end for S3 upload

## Data Lifecycle

1. **Creation**: Record inserted/modified in DynamoDB
2. **Streaming**: DynamoDB Streams → Kinesis (near real-time)
3. **Processing**: Lambda processes within seconds of arrival
4. **Storage**: Written to S3 with partition date
5. **Partitioning**: Athena partitions for efficient querying
6. **Retention**: S3 lifecycle policies (defined in infrastructure)
7. **Deletion**: REMOVE events marked as deleted, not removed from archive

## Monitoring & Observability

**Logging Flow**:
```
Lambda Function
  ↓ (winston logger)
CloudWatch Log Group
  ↓ (subscription filter)
Kinesis Log Stream
  ↓
Central Log Aggregation
```

**Key Metrics**:
- Records processed per batch
- Delivery success/failure counts
- S3 write latency
- Error rates by type
- Partition dates processed

**Structured Logging** (`src/logger.ts`):
- JSON format via winston
- Contextual fields (lambda name, record types, etc.)
- Index suppression for large arrays
