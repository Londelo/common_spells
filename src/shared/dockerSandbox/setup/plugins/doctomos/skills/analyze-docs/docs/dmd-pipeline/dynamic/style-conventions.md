# Coding Conventions - dmd-pipeline

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `recordsJson`, `partitionDate` |
| Functions | camelCase | `parseImageJSON`, `deliverDemandRecords` |
| Classes | PascalCase | `S3Storage`, `ArchiveError` |
| Types/Interfaces | PascalCase | `DemandRecord`, `Storage`, `Format` |
| Files | camelCase or PascalCase | `parse.ts`, `DemandRecord.ts`, `S3Storage.ts` |
| Constants | SCREAMING_SNAKE | Not commonly used; prefers `const` with camelCase |
| Private Class Members | camelCase | `s3`, `config` |

**Notes:**
- Interface names are clean without `I` prefix (e.g., `Storage` not `IStorage`)
- Type unions are PascalCase (e.g., `DemandRecord`, `Reference`)
- ID length rule enforced: minimum 2 characters except for loop variables `i`, `j`

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single quotes (with avoidEscape: true) |
| Semicolons | Not required (disabled) |
| Trailing commas | Never |
| Line length | 100 characters (ignores comments, strings, templates) |
| Object curly spacing | Required `{ space inside }` |

## ESLint Rules (Key Configurations)

| Rule | Setting | Purpose |
|------|---------|---------|
| `quotes` | error, single | Enforce single quotes |
| `semi` | off | TypeScript handles semicolons |
| `@typescript-eslint/semi` | error, never | Explicitly disallow semicolons |
| `comma-dangle` | error, never | No trailing commas |
| `object-curly-spacing` | error, always | Spaces inside object braces |
| `id-length` | error, min 2 | Variable names >= 2 chars (except i, j) |
| `indent` | error, 2 | 2-space indentation |
| `max-len` | error, 100 | Max line length 100 |
| `import/order` | error | Enforced import grouping order |

**Import Organization Order:**
1. External packages (e.g., `@aws-sdk`, `avsc`)
2. Node built-ins (e.g., `util`, `stream`)
3. Internal modules (e.g., `../demand`, `../../services`)
4. Sibling imports (same directory)
5. Parent imports
6. Index imports

## TypeScript Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| target | es2022 | Modern JavaScript features |
| module | node16 | Node.js ESM support |
| moduleResolution | node16 | Node.js module resolution |
| strict | true | **All strict checks enabled** |
| sourceMap | true | Debug support |
| esModuleInterop | true | CommonJS interop |
| forceConsistentCasingInFileNames | true | Case-sensitive imports |
| experimentalDecorators | true | Decorator support |
| skipLibCheck | true | Skip .d.ts checks |
| resolveJsonModule | true | Import JSON files |

## File Structure

**Typical file organization pattern:**

1. **Imports** - Grouped by import/order rule
2. **Type Definitions** - Interfaces and types at the top
3. **Helper/Private Functions** - Lower-level utilities
4. **Public Functions** - Main exported functions
5. **Export Statement** - Clean exports at bottom

**Example from `DemandRecord.ts`:**
```typescript
// 1. Imports
import { putReference, Reference } from './reference'

// 2. Type Definitions
export type DemandRecord = Demand | Notification | Event | Sale
export interface Demand extends Record<string, unknown> { ... }

// 3. Helper Functions
const scrubbedFields = ['phoneNumber', 'email', 'messageBody']
export const scrub = (record: DemandRecord): DemandRecord => { ... }

// 4. Public Functions
export const markDeleted = (record: DemandRecord): DemandRecord => { ... }
export const buildRecord = (record: DemandRecord): DemandRecord => { ... }
```

## Comment Style

**JSDoc Comments:**
- Used sparingly for complex or non-obvious logic
- Present for public functions that need context
- Example: `deliverDemandRecords.ts:19-29` documents the main workflow

**Inline Comments:**
- Used to explain "why" not "what"
- Reference external documentation when applicable
- Example: `systemId.ts:10` includes Confluence link for system user ID format

**Comment Examples:**

Good (explains WHY):
```typescript
// Use `noAnonymousTypes` options to enforce Avro spec: https://github.com/mtth/avsc/issues/139
const type = avro.Type.forSchema(schema, { noAnonymousTypes: true })
```

Good (documents behavior):
```typescript
/**
 * Patched ParquetTransformer to propogate errors to the stream.
 * https://github.com/kbajalc/parquets/pull/26
 */
class PatchedParquetTransformer<T> extends ParquetTransformer<T> { ... }
```

## Consistency Assessment

**High Consistency Areas:**
- Naming conventions uniformly applied across all modules
- ESLint rules strictly followed (automated via `lint` script)
- Import ordering consistent in all files
- 2-space indentation universally used
- Single quotes everywhere
- No semicolons anywhere

**Observations:**
- The codebase shows excellent consistency with linting rules
- TypeScript strict mode is enabled and followed
- No style violations detected in sampled files
- Automated linting (`eslint . --ext .ts --quiet --fix`) enforces standards

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | Strong | Shared utilities in `util/`, `format/` abstraction, single source of truth for schemas |
| **KISS** | Strong | Functions average 20-30 lines, clear single purposes, minimal complexity |
| **YAGNI** | Strong | Focused feature set, no speculative code, lean abstractions |
| **Single Responsibility** | Strong | Each module has clear purpose: `parse.ts` parses, `S3Storage.ts` handles S3 |
| **Open/Closed** | Moderate | `Format` interface allows extensions (avro/parquet), but limited plugin architecture |
| **Liskov Substitution** | Strong | `Format` implementations (avro/parquet) are truly substitutable |
| **Interface Segregation** | Strong | Small, focused interfaces like `Storage`, `Format` |
| **Dependency Inversion** | Strong | Depends on abstractions (`Format`, `Storage`) not concrete implementations |
| **WET** | Not Observed | No significant code duplication found |
| **AHA** | Moderate | Abstractions created when patterns emerge (e.g., `Format` interface) |

### Detailed Evidence

#### DRY (Strong)
**Examples of shared, reusable code:**

1. **`util/index.ts`** - Shared utility functions:
   - `groupResults()` - Used across test and core modules to partition Result types
   - `groupBy()` - Generic array grouping used in delivery logic
   - `toISODateString()` - Single date formatting function used everywhere

2. **Format abstraction** (`format/index.ts`):
   - Single `Format` interface with two implementations (avro, parquet)
   - `intoBuffer()` and `intoArray()` stream utilities shared by both formats
   - No duplication between format implementations

3. **Schema handling** - Each format has `getSchema()` function with same structure:
   ```typescript
   export const getSchema = (type: DemandRecordType): Schema => {
     switch (type) {
       case 'demand': return require('./schemas/demand.json')
       case 'notification': return require('./schemas/notification.json')
       // ...
     }
   }
   ```

4. **Reference generation** (`demand/reference.ts`):
   - Single source of truth for creating unique IDs per record type
   - `makeReference()` handles all record types with consistent logic

#### KISS (Strong)
**Simple, understandable code:**

1. **`util/index.ts`** - Pure functions averaging 5 lines:
   ```typescript
   export const toISODateString = (dateString: string) =>
     new Date(dateString).toISOString().substring(0, 10)
   ```

2. **`DemandRecord.ts:84-99`** - `selectDate()` is clear switch statement, no nesting:
   ```typescript
   export const selectDate = (record: DemandRecord): string => {
     switch (record.type) {
       case 'demand': return toISODateString(record.date.requested)
       case 'notification': return toISODateString(record.date.created)
       // ...
     }
   }
   ```

3. **`S3Storage.ts:21-25`** - Helper function is straightforward:
   ```typescript
   const makeKey = (prefix: string, extension = ''): string => {
     const objectDate = new Date().toISOString().substring(0, 19).replace(/T|:/g, '-')
     const objectId = uuidV4()
     return `${prefix}/${objectDate}-${objectId}.${extension}`
   }
   ```

4. **Average file length: 56 lines** - Small, focused modules
5. **Average function length: ~20-30 lines** - Easy to understand at a glance
6. **Max nesting depth: 2-3** - Rarely exceeds simple if/switch statements

#### YAGNI (Strong)
**No speculative features:**

1. **Minimal Format interface** (`format/index.ts:4-10`):
   - Only two methods: `toContainer()` and `validate()`
   - No unused extension points or future-proofing

2. **Services** (`services.ts`):
   - Only exposes what's actually used: `config`, `logger`, `deliverDemandRecords`
   - No "framework" or over-engineering

3. **Storage interface** (`delivery/Storage.ts:10-18`):
   - Two methods: `deliver()` and `deliverError()`
   - No abstract base classes or complex hierarchies

4. **Type definitions** (`DemandRecord.ts`):
   - Records defined with exact fields needed
   - No placeholder or "reserved for future use" fields

#### Single Responsibility (Strong)

1. **`parse.ts`** - Only handles parsing DynamoDB stream records:
   - `selectImage()` - Extracts the correct image (new vs old)
   - `parseJSON()` - JSON parsing
   - `parseImageJSON()` - Orchestrates parsing

2. **`S3Storage.ts`** - Only handles S3 operations:
   - `deliver()` - Uploads data files
   - `deliverError()` - Uploads error files
   - No business logic mixing

3. **`deliverDemandRecords.ts`** - Orchestrates delivery workflow:
   - Doesn't know about S3 or Avro specifics
   - Works with abstractions (`Format`, `Storage`)

4. **`reference.ts`** - Only generates reference IDs:
   - One function per record type: `demandId()`, `saleId()`, etc.
   - `makeReference()` orchestrates but delegates to type-specific functions

#### Open/Closed (Moderate)

**Extension points that exist:**

1. **Format interface** (`format/index.ts`):
   - Can add new formats (e.g., JSON, CSV) without modifying core code
   - Currently has `avro` and `parquet` implementations
   - Example: `services.ts:23-30` selects format via config

2. **Storage interface** (`delivery/Storage.ts`):
   - Can add new storage backends (e.g., GCS, Azure Blob) without changing delivery logic
   - Currently only has `S3Storage` implementation

**Why Moderate, not Strong:**
- Only two abstractions for extensibility (`Format`, `Storage`)
- No plugin system or dynamic loading
- Most modules are concrete implementations, not extensible
- Limited use of inheritance or composition for extension

#### Liskov Substitution (Strong)

1. **Format implementations** (`avro/index.ts`, `parquet/index.ts`):
   - Both implement `Format` interface identically
   - Can swap between avro and parquet via config change
   - Same Result types, same error handling patterns
   - Example: `services.ts:23-30` switches format without type issues

2. **Both formats:**
   ```typescript
   export const format: Format = {
     toContainer,  // Same signature
     validate      // Same signature
   }
   ```

#### Interface Segregation (Strong)

**Small, focused interfaces:**

1. **`Format`** (`format/index.ts:4-10`):
   - Only 2 methods: `toContainer()`, `validate()`
   - Clients only depend on what they need

2. **`Storage`** (`delivery/Storage.ts:10-18`):
   - Only 2 methods: `deliver()`, `deliverError()`
   - Clean separation of concerns

3. **`Services`** (`services.ts:14-18`):
   - Only exposes 3 properties used by consumers
   - No god object with dozens of methods

4. **Type definitions:**
   - `StorageRecord` - Minimal interface with just `type` and `key`
   - `Reference` - Just `id` and `timestamp`

**No god objects or bloated interfaces found.**

#### Dependency Inversion (Strong)

**Depends on abstractions, not concretions:**

1. **`deliverDemandRecords.ts`** depends on:
   - `Format` interface (not `avroFormat` or `parquetFormat` directly)
   - `Storage` interface (not `S3Storage` directly)
   - Example: Function signature at line 16-17:
     ```typescript
     export const DeliverDemandRecords = (format: Format, storage: Storage)
     ```

2. **`services.ts`** handles dependency injection:
   - Constructs concrete implementations (`avroFormat`, `S3Storage`)
   - Injects them into functions expecting abstractions
   - Core business logic never knows about concrete types

3. **Lambda handler** (`lambda/deliveryWorker/index.ts:16-36`):
   - Receives `deliverDemandRecords` function (already configured)
   - Doesn't know about S3, Avro, or any concrete implementations

4. **Test files** use this pattern too:
   - `deliverDemandRecords.test.ts:14-22` mocks `Storage` interface
   - Tests work with abstractions, not implementations

#### WET (Not Observed)

**No significant code duplication found.**

Checked for duplication in:
- Schema loading patterns (DRY via `getSchema()` functions)
- Error handling (consistent use of Result type)
- Logging patterns (consistent use of `createLogger()`)
- Stream processing (shared `intoBuffer()` and `intoArray()` utilities)

#### AHA (Moderate - Abstraction at the Right Time)

**Abstractions created when patterns emerged:**

1. **`Format` interface**:
   - Created after need for multiple formats (avro, parquet) became clear
   - Not prematurely abstracted before second format existed

2. **`Storage` interface**:
   - Created with single S3 implementation
   - Positioned for future extension but not over-engineered

3. **Result type**:
   - Uses existing `@ticketmaster/lambda/result` instead of custom abstraction
   - Waited for established pattern before adopting

4. **Utility functions** (`util/index.ts`):
   - `groupResults()` and `groupBy()` extracted after repeated use
   - Not created speculatively

**Balance of concrete and abstract:**
- Most code is concrete, focused implementations
- Abstractions introduced only where proven beneficial
- No "framework" mentality - pragmatic abstractions

## Code Readability

**Overall Rating:** Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function and variable names clearly express purpose and domain concepts |
| Narrative Flow | Excellent | Code reads top-to-bottom naturally with clear orchestration |
| Abstraction Consistency | Excellent | Functions stay at consistent abstraction levels |
| Self-Documentation | Excellent | Code is self-explanatory; comments explain WHY, not WHAT |

### Highly Readable Examples

#### 1. **`deliverDemandRecords.ts:30-66`** - Excellent narrative flow

The function reads like a story from top to bottom:

```typescript
export const deliverDemandRecords = async (
  format: Format,
  storage: Storage,
  recordsJson: string[]
): Promise<ArchiveDeliveryBatch> => {
  // Step 1: Parse all records
  const demandRecordResults = recordsJson.map(json => parseImageJSON(format, json))

  // Step 2: Separate successes from failures
  const { errors: parseErrors, values: records } = groupResults(demandRecordResults)

  // Step 3: Log successful records
  records.forEach(({ record }) => logger.info('demandRecord.received', { record }))

  // Step 4: Group by type and date
  const groupedRecords = groupBy(records, parsed => makeKey(parsed.record))

  // Step 5: Deliver each group
  const deliveryResults = await Promise.all(...)

  // Step 6: Handle errors
  const errorsToDeliver = [...parseErrors, ...deliveryErrors]
  const errorDeliveryResults = await Promise.all(...)

  return { deliveries, errors: deliveredErrors }
}
```

**Why this is excellent:**
- Linear progression through steps
- Each variable name tells you exactly what it contains
- No jumping between abstraction levels
- Clear separation of concerns

#### 2. **`reference.ts:20-61`** - Intention-revealing names

```typescript
export const makeReference = (record: DemandRecord): Reference => {
  switch (record.type) {
    case 'demand':
      return {
        id: demandId(record),
        timestamp: (
          record.date.deleted
          ?? record.date.notified
          ?? record.date.triggered
          ?? record.date.requested
          ?? new Date().toISOString()
        )
      }
    // ... other cases
  }
}
```

**Why this is excellent:**
- Function name `makeReference` clearly states intent
- Helper functions `demandId()`, `notificationId()` are self-explanatory
- Timestamp fallback logic is obvious from the cascading `??` operators
- No comments needed to understand what's happening

#### 3. **`S3Storage.ts:36-61`** - Clear separation of concerns

```typescript
public deliver = async (
  recordType: DemandRecordType,
  partitionDate: string,
  container: Buffer
): Promise<Result<S3Record>> => {
  // 1. Generate S3 key
  const key = makeKey(`${this.config.prefix.data}/${recordType}/partition_date=${partitionDate}`, 'avro')

  try {
    // 2. Upload to S3
    await this.s3.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: container,
      ContentType: 'avro/binary'
    }))

    // 3. Return success result
    return ok({ type: 's3', bucket: this.config.bucket, key })
  } catch (error) {
    // 4. Log and return error
    logger.error('s3.deliver.failed', { error })
    return err(asError(error))
  }
}
```

**Why this is excellent:**
- Three clear steps: generate key → upload → return result
- Error handling is explicit and includes logging
- No magic - every step is visible
- Parameters have descriptive names (`recordType`, `partitionDate`, not `type`, `date`)

#### 4. **`parse.ts:14-40`** - Abstraction consistency

```typescript
const selectImage = (
  format: Format,
  { dynamodb, eventName }: DynamoDBStreamRecord
): Result<DemandRecord> => {
  // 1. Choose correct image based on operation
  const image = eventName === OperationType.REMOVE ? dynamodb?.OldImage : dynamodb?.NewImage

  if (!image) {
    return err(new Error('Missing image'))
  }

  // 2. Unmarshall DynamoDB record
  const record = unmarshall(image)

  // 3. Validate record type
  if (!isValidType(record.type)) {
    return err(new Error(`Invalid demand record type - ${inspect(record)}`))
  }

  // 4. Validate record structure
  const validationResult = format.validate(record.type, record)
  if (!validationResult.ok) {
    return validationResult
  }

  // 5. Handle deletion if needed
  if (eventName === OperationType.REMOVE) {
    return ok(markDeleted(validationResult.value))
  }
  return validationResult
}
```

**Why this is excellent:**
- All operations at same abstraction level
- Delegates to well-named helpers: `unmarshall()`, `isValidType()`, `markDeleted()`
- Early returns for error cases
- Linear flow through validation steps

#### 5. **`DemandRecord.ts:111-122`** - Self-documenting code

```typescript
export const markDeleted = (record: DemandRecord): DemandRecord => {
  const recordWithDeletedAt = {
    ...record,
    isDeleted: true,
    date: {
      ...record.date ?? {},
      deleted: new Date().toISOString()
    }
  }

  return scrub(recordWithDeletedAt as DemandRecord)
}
```

**Why this is excellent:**
- Function name `markDeleted` tells you exactly what it does
- Variable name `recordWithDeletedAt` explains the intermediate state
- Calls `scrub()` to remove PII - obvious from context
- No comments needed - the code tells the story

### Areas of Excellence

#### Consistent Error Handling Pattern

Throughout the codebase, errors use `Result<T, E>` type consistently:

```typescript
// parse.ts:42-48
const parseJSON = (json: string): Result<DynamoDBStreamRecord> => {
  try {
    return ok(JSON.parse(json))
  } catch (error) {
    return err(error as Error)
  }
}
```

Every function either:
1. Returns `Result<T>` for operations that can fail
2. Throws for truly exceptional cases
3. Uses early returns for error cases

This makes error handling predictable and easy to follow.

#### Logging with Context

Logging statements always include context:

```typescript
logger.info('demandRecord.received', { record })
logger.error('s3.deliver.failed', { error })
logger.info('backfill.batch.complete', { errors, deliveries, count })
```

The first parameter is a dot-separated identifier (like a breadcrumb trail), and the second is structured data. This makes logs searchable and debugging straightforward.

#### Type-Driven Design

TypeScript types guide the code structure:

```typescript
export type DemandRecord = Demand | Notification | Event | Sale
```

Union types enable exhaustive pattern matching with switch statements, and TypeScript ensures all cases are handled.

### Minor Improvement Opportunities

#### 1. **`backfill.ts:64-85`** - Generator function could use more comments

The `scanBatches` async generator is powerful but dense:

```typescript
const scanBatches = async function* (
  dynamodb: DynamoDBClient,
  tableName: string,
  options: Options
): AsyncGenerator<Record<string, unknown>[]> {
  let lastKey: Record<string, AttributeValue> | undefined

  do {
    const { Items, LastEvaluatedKey } = await dynamodb.send(new ScanCommand({
      ...scanInput(options),
      TableName: tableName,
      ExclusiveStartKey: lastKey,
      Limit: options.maxBatchSize
    }))

    lastKey = LastEvaluatedKey

    if (Items && Items.length) {
      yield Items
    }
  } while (lastKey !== undefined)
}
```

**Suggestion:** Add a brief comment explaining the pagination pattern:
```typescript
/**
 * Yields batches of items from DynamoDB table scan using pagination.
 * Continues until all items matching the filter are retrieved.
 */
```

#### 2. **`parquet/index.ts:29-38`** - Complex inheritance override

The `PatchedParquetTransformer` class overrides `_transform` in a non-obvious way. This is well-commented (links to GitHub issue), but the code itself requires careful reading:

```typescript
class PatchedParquetTransformer<T> extends ParquetTransformer<T> {
  _transform(row: any, _encoding: string, callback: stream.TransformCallback) {
    if (row) {
      this.writer.appendRow(row).then(() => callback(), err => callback(err))
    } else {
      callback()
    }
  }
}
```

This is about as good as it can be given the library limitation, and the comment explains why it exists.

## Summary of Readability Strengths

1. **Consistent naming patterns** - camelCase for functions/variables, PascalCase for types
2. **Small, focused functions** - Average ~20-30 lines
3. **Clear abstractions** - `Format`, `Storage`, `Result<T>` types
4. **Linear narrative flow** - Top-to-bottom reading
5. **Explicit error handling** - No hidden failures
6. **Type-driven design** - TypeScript guides correctness
7. **Minimal comments** - Code explains itself
8. **When comments exist** - They explain WHY, not WHAT, and often link to external docs

**The code reads like well-written prose, not cryptic instructions.**
