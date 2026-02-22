# Domain Concepts - dmd-pipeline

## Core Entities

| Entity | Description |
|--------|-------------|
| **Demand** | A fan's request to be notified about an event/sale; includes fanId, eventId, saleId, timestamps for requested/triggered/notified/deleted, and optional contact info (phone/email) |
| **Notification** | A message sent to a fan about a demand; links fanId, eventId, saleId with message body, contact method, and created/updated/deleted timestamps |
| **Event** | Metadata about a ticketed event; includes event ID, name, start/end dates, and update timestamps |
| **Sale** | A ticketing sale associated with an event; includes sale ID, eventId, sale name, start datetime, and deletion timestamp |
| **DemandRecord** | Union type of all record types (Demand \| Notification \| Event \| Sale); base interface for pipeline processing |
| **Reference** | Composite identifier and timestamp for deduplication; format varies by type (e.g., `{eventId}_{saleId}_{fanId}` for demand) |
| **SystemId** | Metadata about originating system; includes system ID, database ID, and member ID for cross-system tracking |
| **ArchiveDelivery** | Successful delivery result containing record type, partition date, record count, Avro container, and S3 location |
| **ArchiveError** | Failed processing result containing error message and array of original JSON events for debugging |
| **StreamRecord** | DynamoDB Streams change event; contains dynamodb.NewImage (INSERT/MODIFY) or dynamodb.OldImage (REMOVE) and eventName |
| **ParsedRecord** | Intermediate result from parsing; contains original JSON string and validated DemandRecord object |
| **Container** | Binary Avro or Parquet file containing grouped records; output of format.toContainer() before S3 upload |

## Business Rules

### Record Processing Rules

- **BR-001: Image Selection**: INSERT and MODIFY events use dynamodb.NewImage; REMOVE events use dynamodb.OldImage
- **BR-002: Type Validation**: Only records with type in ['demand', 'notification', 'event', 'sale'] are processed; invalid types logged as errors
- **BR-003: Schema Validation**: All records validated against Avro schema before conversion; validation failures captured in errors/ prefix
- **BR-004: Deletion Marking**: REMOVE events result in record marked with `isDeleted=true` and `date.deleted={timestamp}`
- **BR-005: PII Scrubbing**: Deleted records have phoneNumber, email, messageBody replaced with '[redacted]' before archival
- **BR-006: Reference Generation**: All records enriched with reference ID and timestamp based on record type
- **BR-007: System Metadata**: Demand records enriched with system.id, system.databaseId, system.memberId if systemUserId present

### Partitioning Rules

- **BR-008: Demand Partition Date**: Derived from `date.requested` field converted to ISO date (YYYY-MM-DD)
- **BR-009: Notification Partition Date**: Derived from `date.created` field converted to ISO date
- **BR-010: Event Partition Date**: Derived from `date.firstSeen`, fallback to `eventDate.start.dateTime`, fallback to current timestamp
- **BR-011: Sale Partition Date**: Derived from `saleStartDateTime` field converted to ISO date
- **BR-012: Grouping Key**: Records grouped by `{type}/{partition_date}` before conversion to reduce S3 operations

### Storage Rules

- **BR-013: Data Path**: Successful records stored at `s3://{bucket}/{prefix}/data/{type}/partition_date={YYYY-MM-DD}/{timestamp}-{uuid}.avro`
- **BR-014: Error Path**: Failed records stored at `s3://{bucket}/{prefix}/errors/{timestamp}-{uuid}.json`
- **BR-015: File Naming**: Timestamps in ISO format with colons replaced by hyphens; UUIDs for uniqueness
- **BR-016: Batch Optimization**: Multiple records of same type/date combined into single Avro container before upload
- **BR-017: Error Aggregation**: All errors from a batch collected and uploaded together per error type

### Data Retention Rules

- **BR-018: No Deletion**: Archived records never deleted from S3; deleted operational records marked with isDeleted flag
- **BR-019: PII Retention**: Non-deleted records retain PII (phone, email) for operational use; deleted records scrub PII for compliance
- **BR-020: Audit Trail**: All record modifications captured including field changes visible in multiple archive snapshots

## Terminology

| Term | Definition |
|------|------------|
| **Demand Record** | Generic term for any of the 4 record types processed by pipeline (demand, notification, event, sale) |
| **Image** | DynamoDB term for record state; NewImage = current state after change, OldImage = state before deletion |
| **Unmarshall** | Convert DynamoDB wire format to standard JSON object |
| **Partition Date** | ISO date string (YYYY-MM-DD) used to organize S3 files and Athena table partitions |
| **Container File** | Avro or Parquet binary file containing multiple records with embedded schema |
| **Scrubbing** | Redacting sensitive PII fields by replacing with '[redacted]' literal string |
| **Reference ID** | Composite key combining entity IDs (e.g., eventId_saleId_fanId) for deduplication |
| **Delivery** | Successful upload of container file to S3 with metadata |
| **Archive Error** | Failed processing captured with original event JSON for debugging |
| **Workgroup** | Athena construct for query execution with result location and permissions |
| **Glue Catalog** | AWS service storing table schemas and partition metadata for Athena queries |
| **Stream Position** | Kinesis consumer offset; pipeline uses LATEST (only new events, not historical) |
| **Batch Size** | Number of Kinesis records processed per Lambda invocation (configurable, max 1000) |
| **Parallelization Factor** | Number of concurrent Lambda invocations per Kinesis shard (configurable for throughput) |

## Data Models

### Demand Record Structure

```typescript
{
  type: 'demand',
  fanId: string,              // Fan identifier
  eventId: string,            // Event identifier
  saleId: string,             // Sale identifier
  artistId?: string,          // Artist identifier
  eventName?: string,         // Human-readable event name
  saleName?: string,          // Human-readable sale name
  artistName?: string,        // Human-readable artist name
  requestedDateTime: string,  // ISO timestamp when demand created
  phoneNumber?: string,       // Fan phone (scrubbed if deleted)
  email?: string,             // Fan email (scrubbed if deleted)
  contactMethod?: string,     // Preferred contact method ('sms', 'email')
  demandType?: string,        // Type of demand ('remind', etc.)
  date: {
    requested: string,        // When fan submitted request
    triggered?: string,       // When demand condition triggered
    notified?: string,        // When notification sent
    deleted?: string          // When record deleted (only if isDeleted=true)
  },
  systemUserId?: string,      // Legacy system user ID
  system?: {                  // System metadata (auto-generated)
    id: string,
    databaseId: string,
    memberId: string
  },
  reference: {                // Auto-generated reference
    id: string,               // '{eventId}_{saleId}_{fanId}'
    timestamp: string         // Most recent date.* timestamp
  },
  isDeleted?: true            // Present only if record deleted
}
```

### Notification Record Structure

```typescript
{
  type: 'notification',
  fanId: string,
  eventId: string,
  saleId: string,
  saleName?: string,
  messageBody?: string,       // Notification content (scrubbed if deleted)
  phoneNumber?: string,       // Recipient phone (scrubbed if deleted)
  email?: string,             // Recipient email (scrubbed if deleted)
  date: {
    created: string,          // When notification created
    updated?: string,         // When notification modified
    deleted?: string          // When notification deleted
  },
  reference: {
    id: string,               // '{eventId}_{saleId}_{fanId}'
    timestamp: string         // date.deleted ?? date.updated ?? current
  },
  isDeleted?: true
}
```

### Event Record Structure

```typescript
{
  type: 'event',
  id: string,                 // Event identifier
  name?: string,              // Event name
  eventDate?: {
    start?: {
      dateTime?: string,      // Event start (ISO timestamp)
      localDate?: string      // Event start (local date)
    },
    end?: {
      dateTime?: string,      // Event end (ISO timestamp)
      localDate?: string      // Event end (local date)
    }
  },
  date?: {
    firstSeen?: string,       // When event first recorded
    updated: string,          // When event last modified
    deleted?: string          // When event deleted
  },
  reference: {
    id: string,               // '{id}' (just event ID)
    timestamp: string         // date.deleted ?? date.updated ?? current
  },
  isDeleted?: true
}
```

### Sale Record Structure

```typescript
{
  type: 'sale',
  id: string,                 // Sale identifier
  eventId: string,            // Associated event
  name?: string,              // Sale name
  saleStartDateTime: string,  // When sale begins (ISO timestamp)
  date?: {
    deleted?: string          // When sale deleted
  },
  reference: {
    id: string,               // '{eventId}_{id}'
    timestamp: string         // date.deleted ?? saleStartDateTime ?? current
  },
  isDeleted?: true
}
```

### Archive Error Structure

```typescript
{
  timestamp: string,          // When error occurred (ISO format)
  error: {
    message: string           // Human-readable error description
  },
  events: string[]            // Array of original JSON event strings
}
```

### S3 Storage Record Structure

```typescript
{
  type: 's3',
  bucket: string,             // S3 bucket name
  key: string                 // Full S3 object key including prefix and filename
}
```

### Data Flow Diagram

```
┌─────────────┐
│  DynamoDB   │
│   Table     │  (operational data)
└──────┬──────┘
       │ Stream
       ▼
┌─────────────┐
│  DynamoDB   │
│   Streams   │  (change capture)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Kinesis   │
│   Stream    │  (buffering + batching)
└──────┬──────┘
       │ Batch (up to 1000 records)
       ▼
┌─────────────────────────────────────┐
│  Lambda: deliveryWorker             │
│                                     │
│  1. Parse JSON → StreamRecord       │
│  2. Unmarshall → DemandRecord       │
│  3. Validate schema                 │
│  4. Mark deleted if REMOVE          │
│  5. Scrub PII if deleted            │
│  6. Add reference + system metadata │
│  7. Group by {type}/{partition_date}│
│  8. Convert to Avro container       │
│  9. Upload to S3                    │
│ 10. Log results                     │
└──────┬──────────────────────┬───────┘
       │                      │
       │ Success              │ Errors
       ▼                      ▼
┌─────────────┐      ┌─────────────┐
│     S3      │      │     S3      │
│  data/      │      │  errors/    │
│  {type}/    │      │  *.json     │
│  *.avro     │      └─────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Glue     │
│  Catalog    │  (schema registry)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Athena    │
│  Workgroup  │  (SQL queries)
└─────────────┘
       │
       ▼
    Users
```

### Relationships

- **Demand → Event**: Many-to-one (many fans can request same event)
- **Demand → Sale**: Many-to-one (many fans can request same sale)
- **Notification → Demand**: One-to-one (each notification corresponds to a demand)
- **Sale → Event**: Many-to-one (events can have multiple sales)
- **Event → Demand**: One-to-many (one event can have thousands of demand requests)

### Cardinality

- **Single Event**: Can have 10,000+ demand records during popular sales
- **Single Batch**: Lambda processes up to 1,000 records per invocation
- **Single Partition**: Can contain hundreds of Avro files (one per batch that included records for that date)
- **Daily Volume**: Varies widely; major concert announcements can generate 50,000+ records/day
