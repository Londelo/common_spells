# Internal Dependencies - dmd-pipeline

## @ticketmaster/* Packages

| Package | Version | Purpose | Key Exports Used |
|---------|---------|---------|------------------|
| @ticketmaster/lambda | ^0.0.2 | Lambda framework and utilities | `boot`, `HandlerProvider`, `loadConfig` |
| @ticketmaster/lambda/logger | ^0.0.2 | Structured logging | `createLogger`, `logger`, `Logger` type |
| @ticketmaster/lambda/result | ^0.0.2 | Result/Either monad for error handling | `Result`, `ok`, `err`, `asError`, `unwrap`, `unwrapErr` |
| @ticketmaster/lambda/middleware | ^0.0.2 | Lambda middleware (instrumentation) | `Instrument` |
| @ticketmaster/lambda/config | ^0.0.2 | Configuration loading | `loadConfig` |

## Usage Analysis

### @ticketmaster/lambda
**Version**: ^0.0.2
**Purpose**: Core Lambda framework providing handler bootstrapping and infrastructure

**Usage Locations**:
- `src/lambda/deliveryWorker/index.ts` - Lambda handler bootstrapping with `boot()`
- `src/services.ts` - Configuration loading via `loadConfig()`

**Key Patterns**:
```typescript
// Handler bootstrapping
export const handler = boot(
  buildServices,
  Instrument,
  DeliveryWorker
)

// Service provider pattern
type HandlerServices = Pick<Services, 'deliverDemandRecords'>
export const DeliveryWorker: HandlerProvider<HandlerServices, KinesisStreamHandler> =
  ({ deliverDemandRecords }) => async (event) => { ... }
```

### @ticketmaster/lambda/logger
**Version**: ^0.0.2
**Purpose**: Structured logging with context

**Usage Locations**:
- `src/lambda/deliveryWorker/index.ts` - Lambda handler logging
- `src/core/deliverDemandRecords.ts` - Core business logic logging
- `src/delivery/S3Storage.ts` - S3 delivery logging
- `src/format/avro/index.ts` - Avro format logging
- `src/format/parquet/index.ts` - Parquet format logging
- `src/services.ts` - Service initialization logging

**Key Patterns**:
```typescript
const logger = createLogger({ name: 's3' })
logger.info('message', { metadata })
logger.error('error', { error })
```

### @ticketmaster/lambda/result
**Version**: ^0.0.2
**Purpose**: Type-safe error handling using Result monad (Railway-Oriented Programming)

**Usage Locations**:
- `src/core/parse.ts` - Parsing and validation results
- `src/core/deliverDemandRecords.ts` - Delivery operation results
- `src/delivery/S3Storage.ts` - S3 operation results
- `src/delivery/Storage.ts` - Storage interface results
- `src/format/avro/index.ts` - Avro encoding/decoding results
- `src/format/parquet/index.ts` - Parquet encoding/decoding results
- `src/format/index.ts` - Format interface results
- `src/util/index.ts` - Utility function results
- Test files - Unwrapping results for assertions

**Key Patterns**:
```typescript
// Return Result types
const deliver = async (...): Promise<Result<S3Record>> => {
  try {
    // ... operation
    return ok(value)
  } catch (error) {
    return err(asError(error))
  }
}

// Chain results
if (!result.ok) {
  return err(new ArchiveError(result.error.message))
}
return ok(result.value)

// Testing
const result = unwrap(someOperation())
const error = unwrapErr(failingOperation())
```

### @ticketmaster/lambda/middleware
**Version**: ^0.0.2
**Purpose**: Lambda middleware for instrumentation, monitoring, and cross-cutting concerns

**Usage Locations**:
- `src/lambda/deliveryWorker/index.ts` - Applied via `Instrument` middleware in `boot()`

**Key Patterns**:
```typescript
export const handler = boot(
  buildServices,
  Instrument,  // Adds instrumentation middleware
  DeliveryWorker
)
```

### @ticketmaster/lambda/config
**Version**: ^0.0.2
**Purpose**: Configuration loading from environment variables

**Usage Locations**:
- `src/services.ts` - Loads config for S3, DynamoDB, and format settings

**Key Patterns**:
```typescript
type Config = {
  format: 'avro' | 'parquet'
  s3: Pick<S3Config, 'bucket' | 'prefix'>
  dynamodb: { tableName: string }
}

const config: Config = loadConfig()
```

## Coupling Analysis

### Tight Coupling Areas
1. **Error Handling Pattern** - Heavy reliance on `Result` monad across all modules
2. **Logging Infrastructure** - All modules use `@ticketmaster/lambda/logger`
3. **Lambda Handler Pattern** - Handler follows framework's `HandlerProvider` pattern

### Benefits of Current Architecture
- **Consistent Error Handling**: Result monad eliminates exceptions and provides type-safe error paths
- **Standardized Logging**: Structured logging with consistent context propagation
- **Framework Integration**: Seamless middleware and instrumentation support

### Decoupling Considerations
- **Result Monad**: Could be replaced with native `Promise` rejection or custom Result type, but would lose type safety
- **Logger**: Could swap with standard Winston/Pino, but would lose framework integration
- **Handler Pattern**: Tightly coupled to `@ticketmaster/lambda` - would require refactoring to use different framework

### Risk Assessment
- **Dependency Health**: Version ^0.0.2 indicates early development phase (pre-1.0)
- **Breaking Changes Risk**: High - semantic versioning not yet stable
- **Migration Difficulty**: Moderate to High - Result monad pattern permeates codebase

## Recommendation
The tight coupling to `@ticketmaster/lambda` is intentional and appropriate for an internal Ticketmaster service. The framework provides valuable patterns (Result monad, structured logging) that improve code quality. However, the ^0.0.2 version indicates this is an unstable API - coordinate with framework maintainers on upgrade paths.
