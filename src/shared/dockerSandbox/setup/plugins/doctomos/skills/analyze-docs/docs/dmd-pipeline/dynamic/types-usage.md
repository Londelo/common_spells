# Type Usage Patterns - dmd-pipeline

## Overview

This document describes how types are used throughout the pipeline, including function signatures, call relationships, and data flow patterns.

---

## Exported Functions with Type Signatures

### deliverDemandRecords

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const deliverDemandRecords = async (
  format: Format,
  storage: Storage,
  recordsJson: string[]
): Promise<ArchiveDeliveryBatch>
```

**Source:** [src/core/deliverDemandRecords.ts](../src/core/deliverDemandRecords.ts:30)

**Description:** Main processing function. Parses DynamoDB modification records from JSON strings, groups by type and partition date, converts to Avro/Parquet containers, and delivers to S3.

**Parameter Types:**
- `format` ([Format](types-definitions.md#format)) - Serialization format (Avro or Parquet)
- `storage` ([Storage](types-definitions.md#storagetrecord)) - Storage implementation (S3Storage)
- `recordsJson` (string[]) - Array of JSON strings from DynamoDB stream

**Return Type:** Promise<[ArchiveDeliveryBatch](types-definitions.md#archivedeliverybatch)>
- `deliveries` - Array of successful deliveries
- `errors` - Array of errors with original JSON preserved

**Called By:**
- [DeliveryWorker Lambda Handler](../src/lambda/deliveryWorker/index.ts:23)

**Calls:**
- [parseImageJSON](#parseimagejson) - Parse each JSON string to DemandRecord
- [groupBy](#groupby) - Group records by type/date
- [deliverGroup](#delivergroup) - Deliver each group to storage
- [deliverError](#delivererror) - Deliver errors to storage

**Processing Flow:**
1. Parse all JSON strings to DemandRecord instances
2. Separate parse successes from errors
3. Group valid records by `{type}/{partitionDate}`
4. Deliver each group as a container file
5. Deliver all errors as JSON files
6. Return batch result with deliveries and errors

---

### DeliverDemandRecords

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const DeliverDemandRecords = (format: Format, storage: Storage) =>
  (recordsJson: string[]) => deliverDemandRecords(format, storage, recordsJson)
```

**Source:** [src/core/deliverDemandRecords.ts](../src/core/deliverDemandRecords.ts:16)

**Description:** Higher-order function that binds format and storage dependencies to create a delivery function.

**Parameter Types:**
- `format` ([Format](types-definitions.md#format)) - Serialization format
- `storage` ([Storage](types-definitions.md#storagetrecord)) - Storage implementation

**Return Type:** `(recordsJson: string[]) => Promise<ArchiveDeliveryBatch>`

**Called By:**
- [buildServices](#buildservices)

**Calls:**
- [deliverDemandRecords](#deliverdemandrecords)

**Usage Pattern:** Dependency injection / partial application

---

### parseImageJSON

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const parseImageJSON = (
  format: Format,
  json: string
): Result<ParsedRecord, ArchiveError>
```

**Source:** [src/core/parse.ts](../src/core/parse.ts:55)

**Description:** Parses a DynamoDB stream record JSON string into a validated DemandRecord.

**Parameter Types:**
- `format` ([Format](types-definitions.md#format)) - For schema validation
- `json` (string) - Raw JSON string from DynamoDB stream

**Return Type:** `Result<ParsedRecord, ArchiveError>`
- On success: `{ json: string, record: DemandRecord }`
- On error: `ArchiveError` with original JSON

**Called By:**
- [deliverDemandRecords](#deliverdemandrecords)

**Calls:**
- [parseJSON](#parsejson) - Parse JSON string
- [selectImage](#selectimage) - Extract and validate image
- [buildRecord](#buildrecord) - Build final record with reference

**Processing Flow:**
1. Parse JSON string to object
2. Extract appropriate image (NewImage or OldImage)
3. Validate record type
4. Validate against schema
5. Mark as deleted if REMOVE event
6. Build record with system ID and reference
7. Return ParsedRecord with original JSON

---

### buildRecord

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const buildRecord = (record: DemandRecord): DemandRecord
```

**Source:** [src/demand/DemandRecord.ts](../src/demand/DemandRecord.ts:135)

**Description:** Builds a complete record by adding system ID (for demands) and reference fields.

**Parameter Type:** [DemandRecord](types-definitions.md#demandrecord)

**Return Type:** [DemandRecord](types-definitions.md#demandrecord) (with enriched fields)

**Called By:**
- [parseImageJSON](#parseimagejson)

**Calls:**
- [putSystemId](#putsystemid) - Parse systemUserId (for Demand records)
- [putReference](#putreference) - Generate reference field

**Logic:**
```typescript
switch (record.type) {
  case 'demand':
    return putReference(putSystemId(record))
  default:
    return putReference(record)
}
```

---

### putReference

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const putReference = (record: DemandRecord): DemandRecord
```

**Source:** [src/demand/reference.ts](../src/demand/reference.ts:63)

**Description:** Adds a `reference` field to the record for deduplication.

**Parameter Type:** [DemandRecord](types-definitions.md#demandrecord)

**Return Type:** [DemandRecord](types-definitions.md#demandrecord) (with reference field)

**Called By:**
- [buildRecord](#buildrecord)

**Calls:**
- [makeReference](#makereference) - Generate reference object

---

### makeReference

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const makeReference = (record: DemandRecord): Reference
```

**Source:** [src/demand/reference.ts](../src/demand/reference.ts:20)

**Description:** Generates a reference object with composite ID and timestamp.

**Parameter Type:** [DemandRecord](types-definitions.md#demandrecord)

**Return Type:** [Reference](types-definitions.md#reference)

**Called By:**
- [putReference](#putreference)

**Calls:**
- [demandId](#demandid) - For demand records
- [notificationId](#notificationid) - For notification records
- [eventId](#eventid) - For event records
- [saleId](#saleid) - For sale records

**ID Generation Logic:**
- **Demand:** `{eventId}_{saleId}_{fanId}`
- **Notification:** `{eventId}_{saleId}_{fanId}`
- **Event:** `{eventId}`
- **Sale:** `{eventId}_{saleId}`

**Timestamp Selection (in priority order):**
- **Demand:** `date.deleted` → `date.notified` → `date.triggered` → `date.requested` → `now()`
- **Notification:** `date.deleted` → `date.updated` → `now()`
- **Event:** `date.deleted` → `date.updated` → `now()`
- **Sale:** `date.deleted` → `saleStartDateTime` → `now()`

---

### putSystemId

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const putSystemId = (demand: Demand): DemandRecord
```

**Source:** [src/demand/systemId.ts](../src/demand/systemId.ts:32)

**Description:** Parses the `systemUserId` string into structured `system` object.

**Parameter Type:** [Demand](types-definitions.md#demand)

**Return Type:** [DemandRecord](types-definitions.md#demandrecord) (with system field)

**Called By:**
- [buildRecord](#buildrecord)

**Calls:**
- [parseSystemUserId](#parsesystemuserid)

---

### parseSystemUserId

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const parseSystemUserId = (systemUserId?: string): SystemId | undefined
```

**Source:** [src/demand/systemId.ts](../src/demand/systemId.ts:14)

**Description:** Parses system user ID string using regex pattern.

**Parameter Type:** string (optional)

**Return Type:** [SystemId](types-definitions.md#systemid) | undefined

**Regex Pattern:** `/(?<systemId>\w+)-(?<databaseId>\w+)\.(?<memberId>.+)/`

**Example Input:** `"archtics-70.12345"`
**Example Output:**
```typescript
{
  id: "archtics",
  databaseId: "70",
  memberId: "12345"
}
```

**Called By:**
- [putSystemId](#putsystemid)

---

### markDeleted

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const markDeleted = (record: DemandRecord): DemandRecord
```

**Source:** [src/demand/DemandRecord.ts](../src/demand/DemandRecord.ts:111)

**Description:** Marks a record as deleted by setting `isDeleted: true`, adding deletion timestamp, and scrubbing PII.

**Parameter Type:** [DemandRecord](types-definitions.md#demandrecord)

**Return Type:** [DemandRecord](types-definitions.md#demandrecord) (with deletion markers and scrubbed PII)

**Called By:**
- [selectImage](#selectimage) (when processing REMOVE events)

**Calls:**
- [scrub](#scrub)

**Processing:**
1. Set `isDeleted: true`
2. Add `date.deleted: new Date().toISOString()`
3. Scrub PII fields

---

### scrub

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const scrub = (record: DemandRecord): DemandRecord
```

**Source:** [src/demand/DemandRecord.ts](../src/demand/DemandRecord.ts:126)

**Description:** Redacts PII fields by replacing values with `'[redacted]'`.

**Parameter Type:** [DemandRecord](types-definitions.md#demandrecord)

**Return Type:** [DemandRecord](types-definitions.md#demandrecord) (with PII redacted)

**Scrubbed Fields:**
- `phoneNumber`
- `email`
- `messageBody`

**Called By:**
- [markDeleted](#markdeleted)

---

### selectDate

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const selectDate = (record: DemandRecord): string
```

**Source:** [src/demand/DemandRecord.ts](../src/demand/DemandRecord.ts:84)

**Description:** Selects the appropriate date field for partitioning, returns YYYY-MM-DD format.

**Parameter Type:** [DemandRecord](types-definitions.md#demandrecord)

**Return Type:** string (ISO date string, YYYY-MM-DD)

**Called By:**
- [makeKey](#makekey) (for grouping records)

**Calls:**
- [toISODateString](#toisodatestring)

**Date Selection Logic:**
- **Demand:** `date.requested`
- **Notification:** `date.created`
- **Event:** `date.firstSeen` → `eventDate.start.dateTime` → `now()`
- **Sale:** `saleStartDateTime`

---

### isValidType

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const isValidType = (recordType: unknown): recordType is DemandRecordType
```

**Source:** [src/demand/DemandRecord.ts](../src/demand/DemandRecord.ts:108)

**Description:** Type guard function to check if a value is a valid DemandRecordType.

**Parameter Type:** unknown

**Return Type:** boolean (type predicate)

**Called By:**
- [selectImage](#selectimage)

**Validation:** Checks if value is in `demandRecordTypes` array: `['demand', 'event', 'notification', 'sale']`

---

## Utility Functions

### groupBy

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const groupBy = <TValue, TKey extends string>(
  arr: TValue[],
  fn: (value: TValue) => TKey
): Record<TKey, TValue[]>
```

**Source:** [src/util/index.ts](../src/util/index.ts:14)

**Description:** Groups array elements by a key extracted via callback function.

**Parameter Types:**
- `arr` - Array of values to group
- `fn` - Function to extract grouping key from each value

**Return Type:** Record mapping keys to arrays of values

**Called By:**
- [deliverDemandRecords](#deliverdemandrecords)

**Usage Example:**
```typescript
groupBy(records, parsed => makeKey(parsed.record))
// Groups: { "demand/2025-01-15": [...], "event/2025-01-15": [...] }
```

---

### groupResults

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const groupResults = <TValue, TError>(
  results: Result<TValue, TError>[]
): { errors: TError[], values: TValue[]}
```

**Source:** [src/util/index.ts](../src/util/index.ts:3)

**Description:** Separates Result union types into successes and failures.

**Parameter Type:** Array of Result<TValue, TError> (discriminated union)

**Return Type:** Object with `errors` and `values` arrays

**Called By:**
- [deliverDemandRecords](#deliverdemandrecords) (multiple times)

**Usage Pattern:** Processes arrays of results from parsing, validation, or delivery operations.

---

### toISODateString

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const toISODateString = (dateString: string) =>
  new Date(dateString).toISOString().substring(0, 10)
```

**Source:** [src/util/index.ts](../src/util/index.ts:26)

**Description:** Converts ISO datetime string to YYYY-MM-DD date string.

**Parameter Type:** string (ISO datetime)

**Return Type:** string (YYYY-MM-DD format)

**Called By:**
- [selectDate](#selectdate)

**Example:**
- Input: `"2025-01-15T14:30:00.000Z"`
- Output: `"2025-01-15"`

---

## Storage Implementation Functions

### S3Storage.deliver

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
public deliver = async (
  recordType: DemandRecordType,
  partitionDate: string,
  container: Buffer
): Promise<Result<S3Record>>
```

**Source:** [src/delivery/S3Storage.ts](../src/delivery/S3Storage.ts:36)

**Description:** Delivers a serialized container to S3 with partitioned key structure.

**Parameter Types:**
- `recordType` - DemandRecordType ('demand', 'event', 'notification', 'sale')
- `partitionDate` - Partition date in YYYY-MM-DD format
- `container` - Serialized Avro or Parquet buffer

**Return Type:** `Result<S3Record>`

**Called By:**
- [deliverGroup](#delivergroup)

**S3 Key Format:** `{prefix.data}/{recordType}/partition_date={partitionDate}/{timestamp}-{uuid}.avro`

**Example Key:** `data/avro/demand/partition_date=2025-01-15/2025-01-15-14-30-00-abc123.avro`

---

### S3Storage.deliverError

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
public deliverError = async (error: ArchiveError): Promise<Result<S3Record>>
```

**Source:** [src/delivery/S3Storage.ts](../src/delivery/S3Storage.ts:63)

**Description:** Delivers error information to S3 as JSON.

**Parameter Type:** [ArchiveError](types-definitions.md#archiveerror)

**Return Type:** `Result<S3Record>`

**Called By:**
- [deliverError](#delivererror)

**S3 Key Format:** `{prefix.errors}/{timestamp}-{uuid}.json`

**Example Key:** `data/errors/2025-01-15-14-30-00-abc123.json`

**JSON Body Structure:**
```typescript
{
  timestamp: string,      // ISO timestamp
  error: {
    message: string       // Error message
  },
  events: string[]        // Original JSON strings
}
```

---

## Format Implementation Functions

### Format.toContainer (Avro)

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const toContainer = async <T extends DemandRecord>(
  records: T[]
): Promise<Result<Buffer>>
```

**Source:** [src/format/avro/index.ts](../src/format/avro/index.ts:25)

**Description:** Serializes records to Avro container format using avsc library.

**Parameter Type:** Array of DemandRecord (homogeneous type)

**Return Type:** `Result<Buffer>` (Avro container)

**Called By:**
- [deliverGroup](#delivergroup) (via Format interface)

**Calls:**
- [getSchema](#getschema-avro) - Get Avro schema for record type
- `avro.streams.BlockEncoder` - Avro encoding stream
- [intoBuffer](#intobuffer) - Collect stream into buffer

**Processing:**
1. Get schema for record type
2. Create BlockEncoder with schema
3. Stream records through encoder
4. Collect output into Buffer

---

### Format.toContainer (Parquet)

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const toContainer = async <T extends DemandRecord>(
  records: T[]
): Promise<Result<Buffer>>
```

**Source:** [src/format/parquet/index.ts](../src/format/parquet/index.ts:40)

**Description:** Serializes records to Parquet format using parquets library.

**Parameter Type:** Array of DemandRecord (homogeneous type)

**Return Type:** `Result<Buffer>` (Parquet file)

**Called By:**
- [deliverGroup](#delivergroup) (via Format interface)

**Calls:**
- [getSchema](#getschema-parquet) - Get Parquet schema definition
- `PatchedParquetTransformer` - Custom Parquet transformer (with error propagation fix)
- [intoBuffer](#intobuffer) - Collect stream into buffer

**Note:** Uses a patched ParquetTransformer that properly propagates errors to the stream (fixes upstream bug).

---

### Format.validate (Avro)

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const validate = (
  recordType: DemandRecordType,
  record: unknown
): Result<DemandRecord>
```

**Source:** [src/format/avro/index.ts](../src/format/avro/index.ts:74)

**Description:** Validates a record against its Avro schema.

**Parameter Types:**
- `recordType` - Type discriminator
- `record` - Record to validate

**Return Type:** `Result<DemandRecord>`

**Called By:**
- [selectImage](#selectimage)

**Validation Process:**
1. Get schema for record type
2. Parse schema with `noAnonymousTypes` option (enforces Avro spec)
3. Call `type.isValid()` with error hook
4. Collect validation errors
5. Return error or validated record

---

### Format.validate (Parquet)

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const validate = (
  recordType: DemandRecordType,
  record: unknown
): Result<DemandRecord>
```

**Source:** [src/format/parquet/index.ts](../src/format/parquet/index.ts:73)

**Description:** Validates a record against its Parquet schema.

**Parameter Types:**
- `recordType` - Type discriminator
- `record` - Record to validate

**Return Type:** `Result<DemandRecord>`

**Called By:**
- [selectImage](#selectimage)

**Validation Process:**
1. Get schema definition for record type
2. Create ParquetSchema
3. Call `schema.shredRecord()` (throws on invalid)
4. Catch errors and return Result

---

### getSchema (Avro)

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const getSchema = (type: DemandRecordType): avro.Schema
```

**Source:** [src/format/avro/index.ts](../src/format/avro/index.ts:12)

**Description:** Loads Avro schema JSON for a given record type.

**Parameter Type:** DemandRecordType

**Return Type:** avro.Schema (parsed JSON schema)

**Schema Locations:**
- `demand` → `./schemas/demand.json`
- `notification` → `./schemas/notification.json`
- `event` → `./schemas/event.json`
- `sale` → `./schemas/sale.json`

---

### getSchema (Parquet)

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const getSchema = (type: DemandRecordType): SchemaDefinition
```

**Source:** [src/format/parquet/index.ts](../src/format/parquet/index.ts:11)

**Description:** Loads Parquet schema definition for a given record type.

**Parameter Type:** DemandRecordType

**Return Type:** SchemaDefinition (Parquet schema object)

**Schema Locations:**
- `demand` → `./schemas/demand.json`
- `notification` → `./schemas/notification.json`
- `event` → `./schemas/event.json`
- `sale` → `./schemas/sale.json`

---

### intoBuffer

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const intoBuffer = async (source: AsyncIterable<Buffer>): Promise<Buffer>
```

**Source:** [src/format/index.ts](../src/format/index.ts:12)

**Description:** Collects an async iterable of Buffers into a single Buffer.

**Parameter Type:** AsyncIterable<Buffer>

**Return Type:** Promise<Buffer>

**Called By:**
- [toContainer (Avro)](#formattocontainer-avro)
- [toContainer (Parquet)](#formattocontainer-parquet)

**Implementation:** Collects all chunks into array, then calls `Buffer.concat()`.

---

### intoArray

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const intoArray = async <T>(source: AsyncIterable<T>): Promise<Array<T>>
```

**Source:** [src/format/index.ts](../src/format/index.ts:20)

**Description:** Collects an async iterable into an array.

**Parameter Type:** AsyncIterable<T>

**Return Type:** Promise<Array<T>>

**Called By:**
- `fromContainer` functions (for decoding containers back to records)

---

## Service Builder Functions

### buildServices

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const buildServices = (): Services
```

**Source:** [src/services.ts](../src/services.ts:20)

**Description:** Builds the service container with all dependencies.

**Return Type:** [Services](types-definitions.md#services)

**Called By:**
- [Lambda handler bootstrap](#deliveryworker-lambda-handler)

**Calls:**
- `loadConfig()` - Load configuration from environment
- [DeliverDemandRecords](#deliverdemandrecords) - Create delivery function
- `new S3Storage()` - Create storage instance

**Construction Process:**
1. Load config from environment
2. Select format implementation (avro or parquet)
3. Create S3Storage with config
4. Create delivery function with format and storage
5. Return services object

---

## Lambda Handler Functions

### DeliveryWorker Lambda Handler

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
export const DeliveryWorker: HandlerProvider<HandlerServices, KinesisStreamHandler> =
  ({ deliverDemandRecords }) =>
    async (event) => {
      const recordsJson = event.Records.map(
        record => Buffer.from(record.kinesis.data, 'base64').toString('utf8')
      )

      logger.info('deliverDemandRecords.start', { records: recordsJson })

      const { deliveries, errors } = await deliverDemandRecords(recordsJson)

      errors.forEach(error =>
        logger.error('deliverDemandRecords.error', error)
      )

      logger.info('deliverDemandRecords.complete', { deliveries })
    }
```

**Source:** [src/lambda/deliveryWorker/index.ts](../src/lambda/deliveryWorker/index.ts:16)

**Description:** AWS Lambda handler for processing Kinesis stream events containing DynamoDB CDC records.

**Event Type:** KinesisStreamHandler (from aws-lambda types)

**Parameter Type:** KinesisStreamEvent
- `Records` - Array of Kinesis records
- `Records[].kinesis.data` - Base64-encoded DynamoDB stream record JSON

**Calls:**
- [deliverDemandRecords](#deliverdemandrecords)

**Processing Flow:**
1. Decode base64 data from each Kinesis record
2. Convert to UTF-8 JSON strings
3. Call deliverDemandRecords with batch
4. Log errors
5. Log completion with delivery info

**Bootstrap:**
```typescript
export const handler = boot(
  buildServices,
  Instrument,
  DeliveryWorker
)
```

Uses `@ticketmaster/lambda` framework for initialization, instrumentation, and error handling.

---

## Private/Internal Functions

### selectImage

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
const selectImage = (
  format: Format,
  { dynamodb, eventName }: DynamoDBStreamRecord
): Result<DemandRecord>
```

**Source:** [src/core/parse.ts](../src/core/parse.ts:14)

**Description:** Extracts and validates the appropriate image (NewImage or OldImage) from a DynamoDB stream record.

**Parameter Types:**
- `format` - Format implementation for validation
- `dynamodb` - StreamRecord from DynamoDB
- `eventName` - OperationType (INSERT, MODIFY, REMOVE)

**Return Type:** `Result<DemandRecord>`

**Called By:**
- [parseImageJSON](#parseimagejson)

**Calls:**
- [isValidType](#isvalidtype)
- [format.validate](#formatvalidate-avro)
- [markDeleted](#markdeleted) (for REMOVE events)

**Logic:**
1. Select NewImage (for INSERT/MODIFY) or OldImage (for REMOVE)
2. Unmarshall DynamoDB AttributeValue format to JavaScript object
3. Validate record type
4. Validate against schema
5. Mark as deleted if REMOVE event
6. Return validated record

---

### parseJSON

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
const parseJSON = (json: string): Result<DynamoDBStreamRecord>
```

**Source:** [src/core/parse.ts](../src/core/parse.ts:42)

**Description:** Parses JSON string to DynamoDBStreamRecord, catching parse errors.

**Parameter Type:** string (JSON)

**Return Type:** `Result<DynamoDBStreamRecord>`

**Called By:**
- [parseImageJSON](#parseimagejson)

**Error Handling:** Catches JSON.parse exceptions and returns err(Error).

---

### deliverGroup

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
const deliverGroup = async (
  format: Format,
  storage: Storage,
  recordType: DemandRecordType,
  partitionDate: string,
  records: ParsedRecord[]
): Promise<Result<ArchiveDelivery, ArchiveError>>
```

**Source:** [src/core/deliverDemandRecords.ts](../src/core/deliverDemandRecords.ts:72)

**Description:** Serializes a group of records to a container and delivers to storage.

**Parameter Types:**
- `format` - Format implementation
- `storage` - Storage implementation
- `recordType` - Type for this group
- `partitionDate` - Partition date for this group
- `records` - ParsedRecord array (all same type)

**Return Type:** `Result<ArchiveDelivery, ArchiveError>`

**Called By:**
- [deliverDemandRecords](#deliverdemandrecords)

**Calls:**
- [format.toContainer](#formattocontainer-avro)
- [storage.deliver](#s3storagedeliver)

**Processing:**
1. Extract DemandRecord array from ParsedRecord array
2. Serialize records to container format
3. Deliver container to storage
4. Return ArchiveDelivery with metadata

---

### deliverError

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
const deliverError = async (
  storage: Storage,
  error: ArchiveError
): Promise<Result<ArchiveErrorDelivery>>
```

**Source:** [src/core/deliverDemandRecords.ts](../src/core/deliverDemandRecords.ts:111)

**Description:** Delivers error information to storage.

**Parameter Types:**
- `storage` - Storage implementation
- `error` - ArchiveError with original JSON

**Return Type:** `Result<ArchiveErrorDelivery>`

**Called By:**
- [deliverDemandRecords](#deliverdemandrecords)

**Calls:**
- [storage.deliverError](#s3storagedelivererror)

---

### makeKey

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
const makeKey = (record: DemandRecord) => `${record.type}/${selectDate(record)}`
```

**Source:** [src/core/deliverDemandRecords.ts](../src/core/deliverDemandRecords.ts:68)

**Description:** Creates a grouping key from record type and partition date.

**Parameter Type:** DemandRecord

**Return Type:** string (format: `"{type}/{YYYY-MM-DD}"`)

**Called By:**
- [deliverDemandRecords](#deliverdemandrecords) (via groupBy)

**Calls:**
- [selectDate](#selectdate)

**Example Output:** `"demand/2025-01-15"`

---

### getKeyType

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
const getKeyType = (key: string): DemandRecordType =>
  key.split('/').at(0)! as DemandRecordType
```

**Source:** [src/core/deliverDemandRecords.ts](../src/core/deliverDemandRecords.ts:69)

**Description:** Extracts record type from grouping key.

**Parameter Type:** string (grouping key)

**Return Type:** DemandRecordType

**Called By:**
- [deliverDemandRecords](#deliverdemandrecords)

---

### getKeyDate

**Confidence:** 95-100% High (Explicit TypeScript types)

```typescript
const getKeyDate = (key: string): string =>
  key.split('/').at(1)!
```

**Source:** [src/core/deliverDemandRecords.ts](../src/core/deliverDemandRecords.ts:70)

**Description:** Extracts partition date from grouping key.

**Parameter Type:** string (grouping key)

**Return Type:** string (YYYY-MM-DD)

**Called By:**
- [deliverDemandRecords](#deliverdemandrecords)

---

## Data Flow Summary

### End-to-End Record Processing

```
1. DynamoDB Stream Event (CDC)
   ↓
2. Kinesis Stream Record (base64 encoded JSON)
   ↓
3. DeliveryWorker Lambda Handler
   - Decode base64 → JSON string
   ↓
4. deliverDemandRecords
   - Parse JSON → DynamoDB StreamRecord
   - Extract image → Raw record object
   - Validate type and schema
   - Mark deleted (if REMOVE event)
   - Build record (add systemId, reference)
   - Result: ParsedRecord { json, record }
   ↓
5. Group by type/date
   - Key: "{type}/{YYYY-MM-DD}"
   - Groups: Record<string, ParsedRecord[]>
   ↓
6. deliverGroup (per group)
   - Extract DemandRecord[]
   - Serialize to Avro/Parquet container
   - Result: Buffer
   ↓
7. S3Storage.deliver
   - Generate S3 key with partition
   - Upload to S3
   - Result: S3Record { type, bucket, key }
   ↓
8. Return ArchiveDeliveryBatch
   - deliveries: ArchiveDelivery[]
   - errors: ArchiveErrorDelivery[]
```

### Type Transformations

```
string (JSON)
  → DynamoDBStreamRecord
    → AttributeValue (DynamoDB format)
      → Record<string, unknown> (unmarshalled)
        → DemandRecord (validated, typed)
          → DemandRecord (with systemId, reference)
            → ParsedRecord { json, record }
              → Buffer (Avro/Parquet container)
                → S3Record (storage location)
```

### Error Handling Flow

```
Parse Error → ArchiveError (with original JSON)
  ↓
deliverError
  ↓
storage.deliverError
  ↓
S3: errors/{timestamp}-{uuid}.json
  - timestamp
  - error.message
  - events[] (original JSON strings)
```

---

## Common Patterns

### Pattern: Result Type for Error Handling

**Description:** Functions return `Result<T, E>` type (discriminated union) instead of throwing exceptions.

**Example Usage:**
```typescript
const result = parseImageJSON(format, json)

if (!result.ok) {
  // Handle error: result.error
  return err(new ArchiveError(result.error.message, json))
}

// Use success value: result.value
const { record } = result.value
```

**Found In:**
- [parseImageJSON](#parseimagejson)
- [selectImage](#selectimage)
- [deliverGroup](#delivergroup)
- [deliverError](#delivererror)
- All format and storage operations

**Benefits:**
- Explicit error handling (no uncaught exceptions)
- Type-safe error values
- Easy error propagation

---

### Pattern: Discriminated Union with Type Guards

**Description:** DemandRecord is a discriminated union with a `type` field. Type guards ensure type safety.

**Example Usage:**
```typescript
const record: DemandRecord = ...

if (record.type === 'demand') {
  // TypeScript knows: record is Demand
  console.log(record.systemUserId) // OK
}

// Type guard function
if (isValidType(recordType)) {
  // TypeScript knows: recordType is DemandRecordType
}
```

**Found In:**
- [buildRecord](#buildrecord)
- [selectDate](#selectdate)
- [makeReference](#makereference)
- [isValidType](#isvalidtype)

---

### Pattern: Higher-Order Function for Dependency Injection

**Description:** Create partially-applied functions that bind dependencies, enabling testability and composition.

**Example Usage:**
```typescript
// Bind dependencies
const deliverDemandRecords = DeliverDemandRecords(format, storage)

// Use bound function
const result = await deliverDemandRecords(recordsJson)
```

**Found In:**
- [DeliverDemandRecords](#deliverdemandrecords)
- Lambda handler bootstrap

---

### Pattern: Stream Processing with Pipelines

**Description:** Use Node.js stream pipelines for efficient processing of large data sets.

**Example Usage:**
```typescript
const buffer = await pipeline(
  stream.Readable.from(records),
  encoder,
  intoBuffer
)
```

**Found In:**
- [toContainer (Avro)](#formattocontainer-avro)
- [toContainer (Parquet)](#formattocontainer-parquet)
- [intoBuffer](#intobuffer)

**Benefits:**
- Memory-efficient (streaming)
- Backpressure handling
- Error propagation through pipeline

---

### Pattern: Grouping and Batch Processing

**Description:** Group records by key, process each group independently, collect results.

**Example Usage:**
```typescript
const grouped = groupBy(records, parsed => makeKey(parsed.record))
// { "demand/2025-01-15": [...], "event/2025-01-15": [...] }

const results = await Promise.all(
  Object.entries(grouped).map(([key, records]) =>
    deliverGroup(format, storage, getKeyType(key), getKeyDate(key), records)
  )
)

const { errors, values } = groupResults(results)
```

**Found In:**
- [deliverDemandRecords](#deliverdemandrecords)

**Benefits:**
- Partition data by type and date
- Parallel processing of groups
- Efficient S3 storage structure

---

### Pattern: Transformation Pipeline

**Description:** Chain transformation functions to build final record structure.

**Example Usage:**
```typescript
// For Demand records:
const record = putReference(putSystemId(demand))

// For other records:
const record = putReference(otherRecord)
```

**Found In:**
- [buildRecord](#buildrecord)
- [putReference](#putreference)
- [putSystemId](#putsystemid)

**Benefits:**
- Composable transformations
- Clear data flow
- Easy to test individual steps
