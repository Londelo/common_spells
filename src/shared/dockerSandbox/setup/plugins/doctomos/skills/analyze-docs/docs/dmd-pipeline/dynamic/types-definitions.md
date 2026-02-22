# Type Definitions - dmd-pipeline

## Overview

This data pipeline processes DynamoDB stream events containing demand capture records. The pipeline supports four core record types (Demand, Event, Sale, Notification) which are serialized to Avro or Parquet format and delivered to S3.

## Core Type Union

### DemandRecord

**Category:** Union Type Alias

```typescript
export type DemandRecord =
  Demand |
  Notification |
  Event |
  Sale
```

**Exported From:** `src/demand/DemandRecord.ts`

**Description:** The top-level discriminated union for all record types in the pipeline. Discriminated by the `type` field.

**Type Members:**
- [Demand](#demand) - User demand/reminder requests
- [Notification](#notification) - Notification delivery records
- [Event](#event) - Event metadata records
- [Sale](#sale) - Sale/presale records

**Derived Type:**
```typescript
export type DemandRecordType = DemandRecord['type']
// Evaluates to: 'demand' | 'notification' | 'event' | 'sale'
```

---

## TypeScript Interface Definitions

### Demand

**Category:** TypeScript Interface

```typescript
export interface Demand extends Record<string, unknown> {
  type: 'demand'
  fanId: string
  eventId: string
  saleId: string
  requestedDateTime: string
  phoneNumber?: string
  email?: string
  date: {
    requested: string
    triggered?: string
    notified?: string
    deleted?: string
  }
  systemUserId?: string
  system?: SystemId
  reference?: Reference
  isDeleted?: true
}
```

**Exported From:** `src/demand/DemandRecord.ts`

**Description:** Represents a fan's demand capture request (reminder or invite) for an event/sale.

**Key Fields:**
- `type` - Literal type discriminator: `'demand'`
- `fanId` - Unique fan identifier
- `eventId` - Associated event identifier
- `saleId` - Associated sale identifier
- `requestedDateTime` - ISO timestamp when demand was requested
- `phoneNumber` - Contact phone number (optional, may be redacted)
- `email` - Contact email (optional, may be redacted)
- `date` - Nested date object tracking lifecycle timestamps
- `systemUserId` - Raw system user ID string (parsed into `system`)
- `system` - Parsed system ID components (id, databaseId, memberId)
- `reference` - Generated reference for deduplication
- `isDeleted` - Deletion marker (only present when `true`)

**References:**
- [SystemId](#systemid) - Parsed system identifier
- [Reference](#reference) - Deduplication reference

**Transformations:**
- `putSystemId()` - Parses `systemUserId` into `system` field
- `putReference()` - Generates `reference` from composite key
- `markDeleted()` - Sets `isDeleted: true` and adds `date.deleted`
- `scrub()` - Redacts PII fields (phoneNumber, email, messageBody)

**Avro Schema:** `src/format/avro/schemas/demand.json`
**Parquet Schema:** `src/format/parquet/schemas/demand.json`

---

### Notification

**Category:** TypeScript Interface

```typescript
export interface Notification extends Record<string, unknown> {
  type: 'notification'
  fanId: string
  eventId: string
  saleId: string
  messageBody?: string
  phoneNumber?: string
  email?: string
  date: {
    created: string
    updated?: string
    deleted?: string
  }
  reference?: Reference
  isDeleted?: true
}
```

**Exported From:** `src/demand/DemandRecord.ts`

**Description:** Represents a notification delivery record (SMS or email sent to a fan).

**Key Fields:**
- `type` - Literal type discriminator: `'notification'`
- `fanId` - Unique fan identifier
- `eventId` - Associated event identifier
- `saleId` - Associated sale identifier
- `messageBody` - Message content (optional, may be redacted)
- `phoneNumber` - Recipient phone number (optional, may be redacted)
- `email` - Recipient email (optional, may be redacted)
- `date.created` - ISO timestamp when notification was created
- `date.updated` - ISO timestamp of last update (optional)
- `date.deleted` - ISO timestamp when deleted (optional)
- `reference` - Generated reference for deduplication
- `isDeleted` - Deletion marker (only present when `true`)

**References:**
- [Reference](#reference) - Deduplication reference

**Transformations:**
- `putReference()` - Generates `reference` from composite key
- `markDeleted()` - Sets `isDeleted: true` and adds `date.deleted`
- `scrub()` - Redacts PII fields (phoneNumber, email, messageBody)

**Avro Schema:** `src/format/avro/schemas/notification.json`
**Parquet Schema:** `src/format/parquet/schemas/notification.json`

---

### Event

**Category:** TypeScript Interface

```typescript
export interface Event extends Record<string, unknown> {
  type: 'event'
  id: string
  date?: {
    firstSeen?: string
    updated: string
    deleted?: string
  },
  eventDate?: {
    start?: {
      dateTime?: string
      localDate?: string
    },
    end?: {
      dateTime?: string
      localDate?: string
    }
  }
  reference?: Reference
  isDeleted?: true
}
```

**Exported From:** `src/demand/DemandRecord.ts`

**Description:** Represents event metadata. The TypeScript definition is minimal, but Avro schema includes extensive nested structures for venues, classifications, images, etc.

**Key Fields:**
- `type` - Literal type discriminator: `'event'`
- `id` - Unique event identifier
- `date.firstSeen` - First time event was observed (optional)
- `date.updated` - Last update timestamp
- `date.deleted` - Deletion timestamp (optional)
- `eventDate.start` - Event start date/time
- `eventDate.end` - Event end date/time
- `reference` - Generated reference for deduplication
- `isDeleted` - Deletion marker (only present when `true`)

**Extended Fields (Avro Schema Only):**
- `name` - Event name
- `isSuppressed` - Boolean suppression flag
- `url` - Event URL
- `locale` - Locale string
- `classifications` - Array of classification objects (segment, genre, subGenre, type, subType)
- `images` - Array of image objects (url, width, height, attribution)
- `promoter` - Promoter object
- `promoters` - Array of promoters
- `ticketing` - Ticketing configuration (safeTix)
- `venues` - Array of venue objects (with address, location, markets, etc.)
- `attractions` - Array of attraction objects

**References:**
- [Reference](#reference) - Deduplication reference

**Transformations:**
- `putReference()` - Generates `reference` from event ID
- `markDeleted()` - Sets `isDeleted: true` and adds `date.deleted`

**Avro Schema:** `src/format/avro/schemas/event.json` (extensive nested structure)
**Parquet Schema:** `src/format/parquet/schemas/event.json`

---

### Sale

**Category:** TypeScript Interface

```typescript
export interface Sale extends Record<string, unknown> {
  type: 'sale'
  id: string
  eventId: string
  saleStartDateTime: string
  date?: {
    deleted?: string
  }
  reference?: Reference
  isDeleted?: true
}
```

**Exported From:** `src/demand/DemandRecord.ts`

**Description:** Represents a sale or presale record for an event.

**Key Fields:**
- `type` - Literal type discriminator: `'sale'`
- `id` - Unique sale identifier
- `eventId` - Associated event identifier
- `saleStartDateTime` - ISO timestamp when sale starts
- `date.deleted` - Deletion timestamp (optional)
- `reference` - Generated reference for deduplication
- `isDeleted` - Deletion marker (only present when `true`)

**Extended Fields (Avro Schema):**
- `saleTypes` - Array of sale type strings
- `name` - Sale name
- `saleStartDate` - Sale start date (separate from datetime)
- `saleEndDateTime` - Sale end datetime

**References:**
- [Reference](#reference) - Deduplication reference

**Transformations:**
- `putReference()` - Generates `reference` from composite key (eventId_saleId)
- `markDeleted()` - Sets `isDeleted: true` and adds `date.deleted`

**Avro Schema:** `src/format/avro/schemas/sale.json`
**Parquet Schema:** `src/format/parquet/schemas/sale.json`

---

## Nested Type Definitions

### Reference

**Category:** TypeScript Type Alias

```typescript
export type Reference = {
  id: string
  timestamp: string
}
```

**Exported From:** `src/demand/reference.ts`

**Description:** Reference object for deduplication and tracking. The `id` is a composite key unique to each record type.

**Fields:**
- `id` - Composite identifier (format varies by record type)
- `timestamp` - ISO timestamp for reference

**ID Format by Record Type:**
- **Demand:** `{eventId}_{saleId}_{fanId}`
- **Notification:** `{eventId}_{saleId}_{fanId}`
- **Event:** `{eventId}`
- **Sale:** `{eventId}_{saleId}`

**Referenced By:**
- [Demand](#demand)
- [Notification](#notification)
- [Event](#event)
- [Sale](#sale)

**Generated By:** `makeReference(record: DemandRecord): Reference`

---

### SystemId

**Category:** TypeScript Type Alias

```typescript
export type SystemId = {
  id: string
  databaseId: string
  memberId: string
}
```

**Exported From:** `src/demand/systemId.ts`

**Description:** Parsed components of a system user ID. Follows the format: `{systemId}-{databaseId}.{memberId}`

**Fields:**
- `id` - System identifier
- `databaseId` - Database identifier
- `memberId` - Member identifier

**Parsing Regex:** `/(?<systemId>\w+)-(?<databaseId>\w+)\.(?<memberId>.+)/`

**Referenced By:**
- [Demand](#demand)

**Generated By:** `parseSystemUserId(systemUserId?: string): SystemId | undefined`

**Documentation Reference:** [Confluence - system user id](https://confluence.livenation.com/pages/viewpage.action?spaceKey=ACCTS&title=system+user+id)

---

## Delivery & Storage Types

### ArchiveDelivery

**Category:** TypeScript Type Alias

```typescript
export type ArchiveDelivery = {
  type: DemandRecordType
  partitionDate: string
  records: DemandRecord[]
  container: Buffer
  location: StorageRecord
}
```

**Exported From:** `src/delivery/ArchiveDelivery.ts`

**Description:** Represents a successful delivery of a batch of records to storage.

**Fields:**
- `type` - Record type for this batch
- `partitionDate` - Partition date (YYYY-MM-DD format)
- `records` - Array of demand records in this batch
- `container` - Serialized Avro or Parquet container (Buffer)
- `location` - Storage location metadata

**Used By:**
- [deliverDemandRecords](#deliverdemandrecords) - Returns array of ArchiveDelivery

---

### ArchiveErrorDelivery

**Category:** TypeScript Type Alias

```typescript
export type ArchiveErrorDelivery = {
  error: ArchiveError
  location: string
}
```

**Exported From:** `src/delivery/ArchiveDelivery.ts`

**Description:** Represents an error that was delivered to storage.

**Fields:**
- `error` - The ArchiveError instance
- `location` - S3 key where error was stored

**Used By:**
- [deliverDemandRecords](#deliverdemandrecords) - Returns array of ArchiveErrorDelivery

---

### ArchiveError

**Category:** TypeScript Class (extends Error)

```typescript
export class ArchiveError extends Error {
  public originalEvents: string[]

  constructor(public message: string, ...originalEvents: string[])
}
```

**Exported From:** `src/delivery/ArchiveDelivery.ts`

**Description:** Error class that preserves original JSON event strings for debugging.

**Fields:**
- `message` - Error message
- `originalEvents` - Array of original JSON strings that failed processing

**Used For:**
- Parse errors (invalid JSON, invalid schema)
- Validation errors (schema validation failures)
- Delivery errors (S3 write failures)

---

### StorageRecord

**Category:** TypeScript Interface

```typescript
export interface StorageRecord {
  type: string
  key: string
}
```

**Exported From:** `src/delivery/Storage.ts`

**Description:** Base interface for storage location metadata.

**Fields:**
- `type` - Storage type identifier
- `key` - Storage key/path

**Extended By:**
- [S3Record](#s3record)

---

### S3Record

**Category:** TypeScript Interface

```typescript
export interface S3Record extends StorageRecord {
  bucket: string
}
```

**Exported From:** `src/delivery/S3Storage.ts`

**Description:** S3-specific storage record with bucket information.

**Fields:**
- `type` - Always `'s3'`
- `key` - S3 object key
- `bucket` - S3 bucket name

**Extends:** [StorageRecord](#storagerecord)

---

### Storage<TRecord>

**Category:** TypeScript Interface (Generic)

```typescript
export interface Storage<TRecord extends StorageRecord = StorageRecord> {
  deliver(
    recordType: DemandRecordType,
    partitionDate: string,
    container: Buffer
  ): Promise<Result<TRecord>>

  deliverError(error: ArchiveError): Promise<Result<TRecord>>
}
```

**Exported From:** `src/delivery/Storage.ts`

**Description:** Interface for storage implementations (S3, local file system, etc.).

**Methods:**
- `deliver()` - Delivers a serialized container of records
- `deliverError()` - Delivers error information

**Implementations:**
- [S3Storage](#s3storage)

---

### S3Storage

**Category:** TypeScript Class

```typescript
export class S3Storage implements Storage<S3Record> {
  private s3: S3Client

  public constructor(private config: S3Config)

  public deliver(
    recordType: DemandRecordType,
    partitionDate: string,
    container: Buffer
  ): Promise<Result<S3Record>>

  public deliverError(error: ArchiveError): Promise<Result<S3Record>>
}
```

**Exported From:** `src/delivery/S3Storage.ts`

**Description:** S3 implementation of the Storage interface.

**Constructor Params:**
- `config` - [S3Config](#s3config)

**Implements:** [Storage<S3Record>](#storagetrecord)

**Delivery Path Format:**
- Data: `{prefix.data}/{recordType}/partition_date={partitionDate}/{timestamp}-{uuid}.avro`
- Errors: `{prefix.errors}/{timestamp}-{uuid}.json`

---

### S3Config

**Category:** TypeScript Interface

```typescript
export interface S3Config extends Pick<S3ClientConfig, 'credentials' | 'region'> {
  bucket: string
  prefix: {
    data: string,
    errors: string
  }
}
```

**Exported From:** `src/delivery/S3Storage.ts`

**Description:** Configuration for S3 storage.

**Fields:**
- `bucket` - S3 bucket name
- `prefix.data` - Prefix for data objects
- `prefix.errors` - Prefix for error objects
- `credentials` - AWS credentials (from S3ClientConfig)
- `region` - AWS region (from S3ClientConfig)

**Used By:**
- [S3Storage](#s3storage)

---

## Parsing & Processing Types

### ParsedRecord

**Category:** TypeScript Type Alias

```typescript
export type ParsedRecord = {
  json: string
  record: DemandRecord
}
```

**Exported From:** `src/core/parse.ts`

**Description:** Represents a successfully parsed record, preserving original JSON.

**Fields:**
- `json` - Original JSON string from DynamoDB stream
- `record` - Parsed and validated DemandRecord

**Generated By:** `parseImageJSON(format: Format, json: string): Result<ParsedRecord, ArchiveError>`

**Used By:**
- [deliverDemandRecords](#deliverdemandrecords) - Groups parsed records for delivery

---

### ArchiveDeliveryBatch

**Category:** TypeScript Type Alias

```typescript
export type ArchiveDeliveryBatch = {
  errors: ArchiveErrorDelivery[]
  deliveries: ArchiveDelivery[]
}
```

**Exported From:** `src/core/deliverDemandRecords.ts`

**Description:** Result type for batch delivery operations.

**Fields:**
- `errors` - Array of errors that occurred during processing
- `deliveries` - Array of successful deliveries

**Returned By:** [deliverDemandRecords](#deliverdemandrecords)

---

## Format & Serialization Types

### Format

**Category:** TypeScript Interface

```typescript
export interface Format {
  toContainer: <T extends DemandRecord>(
    records: T[]
  ) => Promise<Result<Buffer>>

  validate: (recordType: DemandRecordType, record: unknown) => Result<DemandRecord>
}
```

**Exported From:** `src/format/index.ts`

**Description:** Interface for serialization format implementations (Avro, Parquet).

**Methods:**
- `toContainer()` - Serializes records to container format (Avro/Parquet)
- `validate()` - Validates a record against its schema

**Implementations:**
- `format/avro/index.ts` - Avro implementation
- `format/parquet/index.ts` - Parquet implementation

---

## Service Configuration Types

### Services

**Category:** TypeScript Interface

```typescript
export interface Services {
  config: Config
  logger: Logger
  deliverDemandRecords: ReturnType<typeof DeliverDemandRecords>
}
```

**Exported From:** `src/services.ts`

**Description:** Service container for dependency injection.

**Fields:**
- `config` - Application configuration
- `logger` - Logger instance
- `deliverDemandRecords` - Delivery function with bound dependencies

**Built By:** `buildServices(): Services`

---

### Config

**Category:** TypeScript Type

```typescript
type Config = {
  format: 'avro' | 'parquet'
  s3: Pick<S3Config, 'bucket' | 'prefix'>
  dynamodb: { tableName: string }
}
```

**Defined In:** `src/services.ts`

**Description:** Application configuration loaded from environment.

**Fields:**
- `format` - Serialization format to use
- `s3.bucket` - S3 bucket name
- `s3.prefix` - S3 prefix for data
- `dynamodb.tableName` - DynamoDB table name

---

## Type Dependency Graph

```
DemandRecord (Union Type)
  ├─ Demand (Interface)
  │   ├─ SystemId (Nested Type)
  │   │   └─ id: string
  │   │   └─ databaseId: string
  │   │   └─ memberId: string
  │   └─ Reference (Nested Type)
  │       └─ id: string (composite: {eventId}_{saleId}_{fanId})
  │       └─ timestamp: string
  ├─ Notification (Interface)
  │   └─ Reference (Nested Type)
  │       └─ id: string (composite: {eventId}_{saleId}_{fanId})
  │       └─ timestamp: string
  ├─ Event (Interface)
  │   └─ Reference (Nested Type)
  │       └─ id: string ({eventId})
  │       └─ timestamp: string
  └─ Sale (Interface)
      └─ Reference (Nested Type)
          └─ id: string (composite: {eventId}_{saleId})
          └─ timestamp: string

ParsedRecord
  ├─ json: string (original)
  └─ record: DemandRecord (parsed)

ArchiveDelivery
  ├─ type: DemandRecordType
  ├─ partitionDate: string
  ├─ records: DemandRecord[]
  ├─ container: Buffer
  └─ location: StorageRecord
      └─ S3Record (Implementation)
          ├─ type: 's3'
          ├─ key: string
          └─ bucket: string

ArchiveErrorDelivery
  ├─ error: ArchiveError
  │   ├─ message: string
  │   └─ originalEvents: string[]
  └─ location: string

Storage<TRecord> (Interface)
  └─ S3Storage (Implementation)
      └─ config: S3Config
          ├─ bucket: string
          ├─ prefix.data: string
          ├─ prefix.errors: string
          ├─ credentials: ...
          └─ region: string

Format (Interface)
  ├─ Avro Implementation (src/format/avro)
  └─ Parquet Implementation (src/format/parquet)
```

---

## Avro Schema Enums

### Demand Type Enums

**demandType** (demand.json)
```
symbols: ["remind", "invite"]
```

**contactMethod** (demand.json, notification.json)
```
symbols: ["sms", "email"]
```

### Notification Status Enum

**statusId** (notification.json)
```
symbols: ["CREATED", "TRIGGERED", "QUEUED", "SENT", "DELIVERED", "FAILED"]
```

### Event/Venue/Attraction Type Enum

**venueType / attractionType** (event.json)
```
symbols: ["event", "venue", "attraction", "null"]
```

---

## Key Constants

### demandRecordTypes

```typescript
export const demandRecordTypes: DemandRecordType[] = [
  'demand',
  'event',
  'notification',
  'sale'
]
```

**Exported From:** `src/demand/DemandRecord.ts`

**Description:** Array of all valid record type discriminators. Used for type validation.

### scrubbedFields

```typescript
const scrubbedFields = ['phoneNumber', 'email', 'messageBody']
```

**Defined In:** `src/demand/DemandRecord.ts`

**Description:** Fields that contain PII and should be redacted when marking records as deleted.
