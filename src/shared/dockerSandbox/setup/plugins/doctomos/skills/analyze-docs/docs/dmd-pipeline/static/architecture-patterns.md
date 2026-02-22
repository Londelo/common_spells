# Architecture Patterns - dmd-pipeline

## Architecture Style

**Identified Style**: **Serverless Event-Driven Pipeline**

**Evidence**:
- Single Lambda function (`deliveryWorker`) triggered by Kinesis stream events
- Event source mapping configured in `terraform/lambda.tf` with Kinesis as trigger
- No long-running processes - execution is event-driven
- Stateless processing with external storage (S3, DynamoDB)
- Infrastructure defined as code in Terraform
- Filter criteria on event source mapping to process specific record types

This is a classic AWS serverless data pipeline architecture for Change Data Capture (CDC) from DynamoDB to a data warehouse.

## Design Patterns Used

### 1. Strategy Pattern
**Location**: `src/format/` directory
**Implementation**:
- Common `Format` interface in `src/format/index.ts`
- Interchangeable implementations: `avro/index.ts` and `parquet/index.ts`
- Runtime selection in `src/services.ts` based on configuration

**Example**:
```typescript
// Format interface
export interface Format {
  toContainer: <T extends DemandRecord>(records: T[]) => Promise<Result<Buffer>>
  validate: (recordType: DemandRecordType, record: unknown) => Result<DemandRecord>
}

// Selected at runtime
const format = config.format === 'avro' ? avroFormat : parquetFormat
```

### 2. Repository Pattern
**Location**: `src/delivery/` directory
**Implementation**:
- `Storage` interface defines storage contract
- `S3Storage` provides concrete AWS S3 implementation
- Abstracts storage details from core business logic

**Example**:
```typescript
// Storage interface
export interface Storage {
  deliver: (recordType, partitionDate, container) => Promise<Result<S3Record>>
  deliverError: (error: ArchiveError) => Promise<Result<S3Record>>
}

// S3 implementation
export class S3Storage implements Storage { ... }
```

### 3. Dependency Injection
**Location**: `src/services.ts` and `src/lambda/deliveryWorker/index.ts`
**Implementation**:
- `buildServices()` function constructs all dependencies
- Services passed to Lambda handler via `@ticketmaster/lambda` boot function
- Enables testing with mock services

**Example**:
```typescript
export const handler = boot(
  buildServices,
  Instrument,
  DeliveryWorker
)
```

### 4. Result Type (Railway-Oriented Programming)
**Location**: Throughout codebase using `@ticketmaster/lambda/result`
**Implementation**:
- All operations return `Result<T, E>` type
- Explicit error handling without exceptions
- `ok()` and `err()` constructors for success/failure

**Example**:
```typescript
export const parseImageJSON = (
  format: Format,
  json: string
): Result<ParsedRecord, ArchiveError> => {
  // Returns ok(value) or err(error)
}
```

### 5. Batch Processing with Grouping
**Location**: `src/core/deliverDemandRecords.ts`
**Implementation**:
- Groups records by type and partition date using `groupBy`
- Processes each group in parallel
- Optimizes S3 writes by batching similar records

**Example**:
```typescript
const groupedRecords = groupBy(records, parsed => makeKey(parsed.record))
const deliveryResults = await Promise.all(
  Object.entries(groupedRecords).map(async ([key, records]) => {
    return deliverGroup(format, storage, getKeyType(key), getKeyDate(key), records)
  })
)
```

### 6. Builder Pattern (Domain Models)
**Location**: `src/demand/DemandRecord.ts`
**Implementation**:
- `buildRecord()` enriches records with computed fields
- Applies reference and system ID transformations
- Ensures consistent record construction

**Example**:
```typescript
export const buildRecord = (record: DemandRecord): DemandRecord => {
  switch (record.type) {
    case 'demand':
      return putReference(putSystemId(record))
    default:
      return putReference(record)
  }
}
```

### 7. Schema Registry Pattern
**Location**: `src/format/avro/` and `src/format/parquet/`
**Implementation**:
- Each format module contains schema registry
- `getSchema(type)` retrieves appropriate schema for record type
- Schemas stored as JSON files in `schemas/` subdirectories

**Example**:
```typescript
export const getSchema = (type: DemandRecordType): avro.Schema => {
  switch (type) {
    case 'demand': return require('./schemas/demand.json')
    case 'notification': return require('./schemas/notification.json')
    case 'event': return require('./schemas/event.json')
    case 'sale': return require('./schemas/sale.json')
  }
}
```

## Layer Separation

### Infrastructure Layer
- **Components**: Lambda handlers, AWS SDK clients, S3Storage
- **Responsibilities**: AWS service interaction, external I/O
- **Location**: `src/lambda/`, `src/delivery/S3Storage.ts`

### Application Layer
- **Components**: Core business logic, orchestration
- **Responsibilities**: Record parsing, grouping, delivery coordination, error handling
- **Location**: `src/core/`

### Domain Layer
- **Components**: Domain models, types, business rules
- **Responsibilities**: Record definitions, validation, transformations
- **Location**: `src/demand/`

### Technical Services Layer
- **Components**: Format encoders, utilities, logging
- **Responsibilities**: Data encoding/decoding, cross-cutting concerns
- **Location**: `src/format/`, `src/util/`, `src/logger.ts`

## Dependency Direction

The architecture follows **Clean Architecture principles** with dependencies pointing inward:

```
Infrastructure → Application → Domain
   (Lambda)    →    (Core)    → (Demand)
   (S3Storage) →              ↗
   (Format)    → ---------------
```

**Clean Dependencies**:
- Lambda handlers depend on core logic (not vice versa)
- Core logic depends on domain models
- Infrastructure implementations depend on interfaces
- Domain layer has no external dependencies

**Key Insight**: The domain (`src/demand/`) is dependency-free, while infrastructure adapters (`S3Storage`, format encoders) implement interfaces defined in higher layers.

## Configuration Strategy

**Multi-Environment Configuration**:
- Environment configs in `config/` directory
- Loaded via `@ticketmaster/lambda/config` library
- Supports: dev1, qa1, preprod1, prod1, test
- Configuration includes format selection (avro/parquet), S3 paths, table names

**Infrastructure as Code**:
- Terraform modules per environment
- Shared base configuration in root `terraform/`
- Environment-specific overrides in `tm-nonprod/` and `tm-prod/`

## Data Pipeline Flow

1. **Ingestion**: DynamoDB Streams → Kinesis → Lambda Event Source Mapping (with filters)
2. **Parsing**: Extract NewImage/OldImage from DynamoDB change records
3. **Validation**: Validate against Avro/Parquet schemas
4. **Transformation**: Mark deletions, enrich with computed fields
5. **Grouping**: Group by record type and partition date
6. **Encoding**: Convert to Avro or Parquet container format
7. **Delivery**: Write to S3 with partitioned keys
8. **Error Handling**: Deliver failed records to error prefix

## Error Handling Strategy

**Explicit Error Management**:
- All operations return `Result<T, E>` type
- Errors accumulated and delivered separately
- Parse errors don't stop batch processing
- Delivery errors logged and stored with original records

**Error Delivery**:
- Failed records written to `{prefix}/errors/` in S3
- Includes original JSON, timestamp, and error message
- Enables replay and debugging

**Error Types**:
- `ArchiveError`: Wraps delivery/encoding errors with original events
- Schema validation errors: Caught during format validation
- S3 errors: Wrapped and returned as Results

## Deviations & Tech Debt

### 1. Extension Hardcoded in S3Storage
**Location**: `src/delivery/S3Storage.ts:41`
**Issue**: File extension hardcoded to `.avro` even for Parquet format
**Impact**: Parquet files incorrectly labeled with `.avro` extension

### 2. Patched Parquet Transformer
**Location**: `src/format/parquet/index.ts:29-38`
**Issue**: Upstream library doesn't propagate stream errors
**Workaround**: Local patch class `PatchedParquetTransformer`
**Tech Debt**: Should contribute fix upstream or switch libraries

### 3. Mixed Responsibility in DemandRecord
**Location**: `src/demand/DemandRecord.ts`
**Issue**: Domain model includes data scrubbing logic (PII redaction)
**Impact**: Domain logic mixed with data protection concerns
**Better Approach**: Separate concern into dedicated module

### 4. Avro NoAnonymousTypes Workaround
**Location**: `src/format/avro/index.ts:65`
**Issue**: Requires `noAnonymousTypes` option due to library behavior
**Workaround**: Explicitly set option on type creation
**Reference**: https://github.com/mtth/avsc/issues/139

### 5. Schema Duplication
**Location**: `src/format/{avro,parquet}/schemas/` and `src/athena/schemas/`
**Issue**: Similar schemas maintained in three places
**Risk**: Schema drift between encoder and Athena table definitions
**Mitigation**: Generate Athena schemas from format schemas

### 6. Single Lambda Function
**Observation**: All processing in one Lambda function
**Trade-off**: Simplicity vs. granular scaling/monitoring
**Current Scale**: Appropriate for current volume
**Future**: May need function per record type at higher scale
