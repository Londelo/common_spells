# Type Definitions - vf-api-workers

## TypeScript Types

### Worker Types

#### Worker
**Category:** TypeScript Type Alias

```typescript
export type Worker<Event = unknown, Result = void, Services = unknown> =
  WorkerWithoutInputTransformation<Event, Result, Services>
  | WorkerWithInputTransformation<Event, Result, Services>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Type signature for a worker, including input `Event`, output `Result`, and provided `Services`. Worker middleware implementation is configured via a config file, and can't be guaranteed at compile time.

**Union Composition:** Can be either:
- [WorkerWithoutInputTransformation](#workerwithouttinputtransformation) - Preserves event in `input.event` with correlation
- [WorkerWithInputTransformation](#workerwithinputtransformation) - Transforms event directly to `input` without correlation

**Generic Parameters:**
- `Event` - The event type (default: unknown)
- `Result` - The return type (default: void)
- `Services` - Injected services type (default: unknown)

**Used By:**
- Template worker implementations
- All app workers in `/apps` directory

---

#### WorkerWithInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithInputTransformation<Event, Result = unknown, Services = unknown> =
  (input: AppParamsWithInputTransformation<Event, Services>) => Promise<Result>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Worker function where middlewares lift transformed event directly to the `input` property and do not provide `correlation` property.

**Referenced By:**
- [Worker](#worker) (union member)
- [SQSWorker](#sqsworker)
- [KinesisWorker](#kinesisworker)

**Function Signature:**
- **Parameter:** [AppParamsWithInputTransformation](#appparamswithinputtransformation)
- **Returns:** `Promise<Result>`

---

#### WorkerWithoutInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithoutInputTransformation<Event, Result = unknown, Services = unknown> =
  (input: AppParamsWithoutInputTransformation<Event, Services>) => Promise<Result>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Worker function where middlewares preserve event in `input.event` property and provide `correlation` property.

**Referenced By:**
- [Worker](#worker) (union member)

**Function Signature:**
- **Parameter:** [AppParamsWithoutInputTransformation](#appparamswithoutinputtransformation)
- **Returns:** `Promise<Result>`

---

#### AppParamsWithInputTransformation
**Category:** TypeScript Type Alias

```typescript
type AppParamsWithInputTransformation<Event, Services> = {
  input: Event
  Services: Services
  jwt?: string
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Parameters for workers that receive transformed event directly in `input` property.

**Fields:**
- `input` (Event, required) - The transformed event data
- `Services` (Services, required) - Injected services (AWS clients, HTTP request, etc.)
- `jwt` (string, optional) - JWT authentication token

**Used By:**
- [WorkerWithInputTransformation](#workerwithinputtransformation)

---

#### AppParamsWithoutInputTransformation
**Category:** TypeScript Type Alias

```typescript
type AppParamsWithoutInputTransformation<Event, Services> = {
  input: {
    event: Event
    context: Context
  }
  Services: Services
  correlation: Correlation
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Parameters for workers that preserve the original event structure and include correlation data.

**Fields:**
- `input` (object, required)
  - `input.event` (Event, required) - The AWS Lambda event
  - `input.context` (Context, required) - AWS Lambda context from `aws-lambda` package
- `Services` (Services, required) - Injected services
- `correlation` ([Correlation](#correlation), required) - Correlation tracking data

**Used By:**
- [WorkerWithoutInputTransformation](#workerwithouttinputtransformation)

---

#### Correlation
**Category:** TypeScript Type Alias

```typescript
type Correlation = {
  id: string;
  awsRequestId: string;
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Correlation identifiers for tracing and logging.

**Fields:**
- `id` (string, required) - Correlation ID for distributed tracing
- `awsRequestId` (string, required) - AWS Lambda request ID

**Referenced By:**
- [AppParamsWithoutInputTransformation](#appparamswithoutinputtransformation)

---

#### SQSWorker
**Category:** TypeScript Type Alias

```typescript
export type SQSWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<
    TransformedSQSRecord<Message>[],
    SQSResultHandlerOutput<Result>,
    Services
  >
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Specialized worker type for SQS message consumers using the SQSResultHandler middleware.

**Generic Parameters:**
- `Message` - The message body type
- `Result` - The result type
- `Services` - Injected services (default: unknown)

**Input Type:** Array of [TransformedSQSRecord](#transformedsqsrecord)`<Message>`

**Output Type:** [SQSResultHandlerOutput](#sqsresulthandleroutput)`<Result>`

---

#### KinesisWorker
**Category:** TypeScript Type Alias

```typescript
export type KinesisWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<
    TransformedKinesisMessage<Message>[],
    KinesisBatchItemResultHandlerOutput<Result>,
    Services
  >
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Specialized worker type for Kinesis stream consumers.

**Generic Parameters:**
- `Message` - The message data type
- `Result` - The result type
- `Services` - Injected services (default: unknown)

**Input Type:** Array of [TransformedKinesisMessage](#transformedkinesismessage)`<Message>`

**Output Type:** [KinesisBatchItemResultHandlerOutput](#kinesisbatchitemresulthandleroutput)`<Result>`

---

#### TransformedSQSRecord
**Category:** TypeScript Type Alias

```typescript
export type TransformedSQSRecord<Message = unknown> = Message & {
  shouldRetry?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __meta: any
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Transformed SQS record with message body merged at root level and metadata fields.

**Fields:**
- `...Message` - All fields from the message body type
- `shouldRetry` (boolean, optional) - Flag indicating if record should be retried
- `__meta` (any, required) - Metadata from the SQS record (message attributes, etc.)

**Referenced By:**
- [SQSWorker](#sqsworker) (input array element)
- [SQSResultHandlerOutput](#sqsresulthandleroutput) (unprocessed records)

---

#### TransformedKinesisMessage
**Category:** TypeScript Type Alias

```typescript
export type TransformedKinesisMessage<Message = unknown> = {
  data: Message
  recordId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __meta: any
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Transformed Kinesis stream message with decoded data.

**Fields:**
- `data` (Message, required) - The decoded message data
- `recordId` (string, required) - Kinesis record ID for failure tracking
- `__meta` (any, required) - Kinesis record metadata

**Referenced By:**
- [KinesisWorker](#kinesisworker) (input array element)

---

#### SQSResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type SQSResultHandlerOutput<Result = unknown> = Result & {
  unprocessed: TransformedSQSRecord[]
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Result object for SQS workers. Records in the `unprocessed` property will be retried.

**Fields:**
- `...Result` - All fields from the result type
- `unprocessed` (Array<[TransformedSQSRecord](#transformedsqsrecord)>, required) - Records that should be retried

**Referenced By:**
- [SQSWorker](#sqsworker) (return type)

---

#### SQSBatchItemResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type SQSBatchItemResultHandlerOutput<Result = unknown> = Result & SQSBatchResponse
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Result type for SQS batch item result handler middleware.

**Extends:**
- Generic `Result` type
- `SQSBatchResponse` from `aws-lambda`

---

#### KinesisBatchItemResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type KinesisBatchItemResultHandlerOutput<Result = unknown> = Result & KinesisStreamBatchResponse
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Result type for Kinesis batch item result handler middleware.

**Extends:**
- Generic `Result` type
- `KinesisStreamBatchResponse` from `aws-lambda`

**Referenced By:**
- [KinesisWorker](#kinesisworker) (return type)

---

#### FailureIdentifier
**Category:** TypeScript Type Alias

```typescript
export type FailureIdentifier = {
  itemIdentifier: string
};
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/appResolver/Worker.ts`

**Description:** Identifier for failed batch items in AWS Lambda responses.

**Fields:**
- `itemIdentifier` (string, required) - The identifier of the failed item (typically a record ID)

**Used By:**
- `formatBatchFailureIdentifiers` function in `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/format.ts`

---

### Request/Response Types

#### Request
**Category:** TypeScript Type Alias

```typescript
export type Request = (params: {
  serviceName: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  baseUrl: string
  endpoint?: string
  accessPath?: string
  headers?: Record<string, string>
} & RequestBody) => Promise<Response>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/services/request/index.ts`

**Description:** HTTP request function type for making service calls.

**Parameter Shape:**
- `serviceName` (string, required) - Name of the service for instrumentation
- `method` ('GET' | 'POST' | 'PUT' | 'DELETE', required) - HTTP method
- `baseUrl` (string, required) - Base URL of the service
- `endpoint` (string, optional) - Endpoint path
- `accessPath` (string, optional) - Access path for nested response data
- `headers` (Record<string, string>, optional) - HTTP headers
- `...RequestBody` - Either `{ body?: string, json: false }` or `{ body: Record<string, unknown>, json: true }`

**Returns:** Promise<[Response](#response)>

**Referenced By:**
- [Services](#services) type

---

#### RequestBody
**Category:** TypeScript Type Alias

```typescript
type RequestBody = { body?: string, json: false } | { body: Record<string, unknown>, json: true }
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/services/request/index.ts`

**Description:** Union type for request body - either raw string or JSON object.

**Union Members:**
- String body: `{ body?: string, json: false }`
- JSON body: `{ body: Record<string, unknown>, json: true }`

---

#### Response
**Category:** TypeScript Type Alias

```typescript
export type Response = {
  statusCode: number
  body: unknown
  headers: Record<string, string>
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/services/request/index.ts`

**Description:** HTTP response structure from service calls.

**Fields:**
- `statusCode` (number, required) - HTTP status code
- `body` (unknown, required) - Response body (parsed JSON or raw)
- `headers` (Record<string, string>, required) - Response headers

**Referenced By:**
- [Request](#request) type (return type)

---

### Services Types

#### Services
**Category:** TypeScript Interface

```typescript
export type Services = {
  aws: AWS
  request: Request
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/services/index.ts`

**Description:** Core services injected into workers by middleware.

**Fields:**
- `aws` ([AWS](#aws), required) - AWS service clients
- `request` ([Request](#request), required) - Instrumented HTTP request function

**Referenced By:**
- All worker type definitions (generic `Services` parameter)

---

#### AWS
**Category:** TypeScript Interface

```typescript
export type AWS = {
  verdictReporterQueue: SQS,
  campaignDataStream: Kinesis,
  scoresStream: Kinesis,
  verificationsTable: DynamoDB,
  fanIdentityTable: DynamoDB,
  demandTable: DynamoDB,
  scoringBucket: S3
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/services/aws/index.ts`

**Description:** AWS service clients constructed via config file. Mapping of client names to AWS SDK implementations.

**Important Note:** AWS services are constructed via a config file and can't be guaranteed at compile time. This mapping must be aligned with the config file and `clientNames` array.

**Fields:**
- `verdictReporterQueue` (SQS, required) - SQS queue for verdict reports
- `campaignDataStream` (Kinesis, required) - Kinesis stream for campaign data
- `scoresStream` (Kinesis, required) - Kinesis stream for scoring data
- `verificationsTable` (DynamoDB, required) - DynamoDB table for verifications
- `fanIdentityTable` (DynamoDB, required) - DynamoDB table for fan identity
- `demandTable` (DynamoDB, required) - DynamoDB table for demand data
- `scoringBucket` (S3, required) - S3 bucket for scoring data

**Type Imports:**
- `SQS` from `@verifiedfan/aws/types`
- `DynamoDB` from `@verifiedfan/aws/types`
- `Kinesis` from `@verifiedfan/aws/types`
- `S3` from `@verifiedfan/aws/types`

**Referenced By:**
- [Services](#services)

---

### Config Types

#### Config
**Category:** TypeScript Type Alias (Declaration)

```typescript
export type Config = Map<string, ConfigValue>;
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/config/index.d.ts`

**Description:** Immutable.js Map containing configuration values.

**Type:** `Map<string, ConfigValue>`

**Referenced By:**
- `getConfig` function
- `getConfigValue` function
- Default export

---

#### ConfigValue
**Category:** TypeScript Type Alias (Declaration)

```typescript
type ConfigValue = string | number | ConfigValue[] | Map<string, ConfigValue>;
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/config/index.d.ts`

**Description:** Recursive type for configuration values - can be primitives, arrays, or nested Maps.

**Union Members:**
- `string` - String value
- `number` - Numeric value
- `ConfigValue[]` - Array of config values
- `Map<string, ConfigValue>` - Nested configuration object

**Referenced By:**
- [Config](#config)
- Self-referential (recursive type)

---

## YAML Schema Types

### ConfigSchema
**Schema ID:** `config-schema`

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/configs/schema.yml`

**Description:** Root configuration schema for worker applications.

```yaml
type: object
required: [verifiedfan]
```

**Properties:**
- `verifiedfan` ([VerifiedFanConfig](#verifiedfanconfig), required)
- `meta` ([MetaConfig](#metaconfig), optional)

---

### VerifiedFanConfig
**Schema Type:** object

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/configs/schema.yml`

**Description:** VerifiedFan platform configuration section.

```yaml
type: object
required: [shared]
additionalProperties: true
```

**Properties:**
- `shared` ([SharedConfig](#sharedconfig), required)
- Additional properties allowed

---

### SharedConfig
**Schema Type:** object

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/configs/schema.yml`

**Description:** Shared configuration values across all workers.

```yaml
type: object
required: [product, env, log, tracing]
additionalProperties: true
```

**Properties:**
- `product` ([ProductConfig](#productconfig), required) - Product identification
- `env` (string, required) - Environment name (dev, qa, preprod, prod)
- `log` ([LogConfig](#logconfig), required) - Logging configuration
- `tracing` ([TracingConfig](#tracingconfig), required) - Distributed tracing configuration
- Additional properties allowed

---

### ProductConfig
**Schema Type:** object

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/configs/schema.yml`

**Description:** Product identification metadata.

```yaml
type: object
required: [acronym, code, name, group]
additionalProperties: false
```

**Properties:**
- `acronym` (string, required) - Product acronym (e.g., "vf")
- `code` (string, required) - Product code
- `name` (string, required) - Full product name
- `group` (string, required) - Product group

---

### LogConfig
**Schema Type:** object

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/configs/schema.yml`

**Description:** Logging output configuration.

```yaml
type: object
required: [file, console, level]
additionalProperties: false
```

**Properties:**
- `level` (string, required) - Log level (debug, info, warn, error)
- `file` (object | boolean, required) - File logging configuration or enabled flag
- `console` (object | boolean, required) - Console logging configuration or enabled flag

---

### TracingConfig
**Schema Type:** object

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/configs/schema.yml`

**Description:** OpenTelemetry distributed tracing configuration.

```yaml
type: object
required: [serviceName, collectorHost, collectorPort, collectorEncryption]
additionalProperties: false
```

**Properties:**
- `serviceName` (string, required) - Service name for traces
- `collectorHost` (string, required) - OpenTelemetry collector hostname
- `collectorPort` (number, required) - OpenTelemetry collector port
- `collectorEncryption` (string, required) - Encryption protocol

---

### MetaConfig
**Schema Type:** object

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/configs/schema.yml`

**Description:** Metadata configuration section.

```yaml
type: object
required: [config]
```

**Properties:**
- `config` (object, required) - Config metadata object

---

## JavaScript Constants/Enums

### FAN_IDENTIFIERS
**Type:** Object Literal

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/enums.js`

**Description:** Fan identifier types used across the system.

```javascript
export const FAN_IDENTIFIERS = {
  EMAIL: 'email',
  GLOBAL_USER_ID: 'globalUserId',
  MEMBER_ID: 'memberId'
};
```

**Values:**
- `EMAIL` = 'email'
- `GLOBAL_USER_ID` = 'globalUserId'
- `MEMBER_ID` = 'memberId'

---

### REPO_NAMESPACE
**Type:** String

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/enums.js`

**Description:** Repository namespace for instrumentation, constructed from product code, acronym, group, and environment.

**Format:** `{productCode}/{productAcronym}-{groupName}/{env}`

**Example:** `vf-api/vf-workers/dev`

---

### ERROR_METRIC
**Type:** Object Literal

**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/constants.js`

**Description:** Standard error metric for CloudWatch.

```javascript
export const ERROR_METRIC = {
  name: 'error_count',
  unit: 'count',
  value: 1
};
```

**Fields:**
- `name` = 'error_count'
- `unit` = 'count'
- `value` = 1

---

### Middleware Types
**Source:** `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers/shared/middlewares/types.js`

**Description:** Constants for middleware type identification.

```javascript
export const KINESIS_CONSUMER = 'kinesisConsumer';
export const DYNAMODB_KINESIS_CONSUMER = 'dynamodbKinesisConsumer';
export const APPSYNC_RESOLVER = 'appsyncResolver';
export const DYNAMODB_CONSUMER = 'dynamodbConsumer';
export const FANOUT_CONTROLLER = 'fanoutController';
export const SQS_CONSUMER = 'sqsConsumer';
export const S3_CONSUMER = 's3Consumer';
export const SDK_INVOKED = 'sdkInvoked';
export const SCHEDULED = 'scheduled';
export const FIREHOSE_PROCESSOR = 'firehoseProcessor';
export const SNS_SUBSCRIBER = 'snsSubscriber';
export const KAFKA_CONSUMER = 'kafkaConsumer';
```

**Values:**
- `KINESIS_CONSUMER` = 'kinesisConsumer'
- `DYNAMODB_KINESIS_CONSUMER` = 'dynamodbKinesisConsumer'
- `APPSYNC_RESOLVER` = 'appsyncResolver'
- `DYNAMODB_CONSUMER` = 'dynamodbConsumer'
- `FANOUT_CONTROLLER` = 'fanoutController'
- `SQS_CONSUMER` = 'sqsConsumer'
- `S3_CONSUMER` = 's3Consumer'
- `SDK_INVOKED` = 'sdkInvoked'
- `SCHEDULED` = 'scheduled'
- `FIREHOSE_PROCESSOR` = 'firehoseProcessor'
- `SNS_SUBSCRIBER` = 'snsSubscriber'
- `KAFKA_CONSUMER` = 'kafkaConsumer'

**Used By:**
- Telemetry middleware for mapping to OpenTelemetry SpanKind

---

## Type Dependency Graph

```
Worker<Event, Result, Services> (Type Alias)
  ├─ WorkerWithInputTransformation<Event, Result, Services> (Type Alias)
  │   └─ AppParamsWithInputTransformation<Event, Services>
  │       ├─ input: Event
  │       ├─ Services: Services
  │       └─ jwt?: string
  └─ WorkerWithoutInputTransformation<Event, Result, Services> (Type Alias)
      └─ AppParamsWithoutInputTransformation<Event, Services>
          ├─ input: { event: Event, context: Context }
          ├─ Services: Services
          └─ correlation: Correlation
              ├─ id: string
              └─ awsRequestId: string

SQSWorker<Message, Result, Services> (Specialized Worker)
  ├─ extends: WorkerWithInputTransformation
  ├─ input: TransformedSQSRecord<Message>[]
  │   ├─ ...Message fields
  │   ├─ shouldRetry?: boolean
  │   └─ __meta: any
  └─ output: SQSResultHandlerOutput<Result>
      ├─ ...Result fields
      └─ unprocessed: TransformedSQSRecord[]

KinesisWorker<Message, Result, Services> (Specialized Worker)
  ├─ extends: WorkerWithInputTransformation
  ├─ input: TransformedKinesisMessage<Message>[]
  │   ├─ data: Message
  │   ├─ recordId: string
  │   └─ __meta: any
  └─ output: KinesisBatchItemResultHandlerOutput<Result>

Services (Service Container)
  ├─ aws: AWS
  │   ├─ verdictReporterQueue: SQS
  │   ├─ campaignDataStream: Kinesis
  │   ├─ scoresStream: Kinesis
  │   ├─ verificationsTable: DynamoDB
  │   ├─ fanIdentityTable: DynamoDB
  │   ├─ demandTable: DynamoDB
  │   └─ scoringBucket: S3
  └─ request: Request
      ├─ params: { serviceName, method, baseUrl, endpoint?, headers?, ...RequestBody }
      └─ returns: Promise<Response>
          ├─ statusCode: number
          ├─ body: unknown
          └─ headers: Record<string, string>

Config (Immutable Configuration)
  └─ Map<string, ConfigValue>
      └─ ConfigValue = string | number | ConfigValue[] | Map<string, ConfigValue> [recursive]
```

### Legend
- (Type Alias) - TypeScript type alias
- (Interface) - TypeScript interface
- (Specialized Worker) - Specific worker implementation type
- (Service Container) - Dependency injection container
- [recursive] - Self-referential type definition
