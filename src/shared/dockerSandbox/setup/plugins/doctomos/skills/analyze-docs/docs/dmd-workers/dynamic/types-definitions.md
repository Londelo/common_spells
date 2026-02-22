# Type Definitions - dmd-workers

## Overview

This repository uses TypeScript for type definitions with JavaScript implementation. Type definitions are primarily located in `shared/` directory and define worker function signatures, service interfaces, and data structures for AWS Lambda-based notification and demand capture workers.

---

## TypeScript Types

### Worker Function Types

#### Worker
**Category:** TypeScript Type Alias

```typescript
export type Worker<Event = unknown, Result = void, Services = unknown> =
  WorkerWithoutInputTransformation<Event, Result, Services>
  | WorkerWithInputTransformation<Event, Result, Services>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Core type signature for a worker function. Workers can either preserve the raw event structure (`WorkerWithoutInputTransformation`) or receive transformed input (`WorkerWithInputTransformation`). The middleware configuration determines which variant is used.

**Generic Parameters:**
- `Event` - Type of the incoming event/message
- `Result` - Type of the return value (default: `void`)
- `Services` - Type of injected service dependencies (default: `unknown`)

**Union Types:**
- [WorkerWithoutInputTransformation](#workerwithoutinputtransformation)
- [WorkerWithInputTransformation](#workerwithinputtransformation)

**Used By:**
- All worker implementations in `apps/` directory
- Worker resolver and middleware chain

---

#### WorkerWithoutInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithoutInputTransformation<Event, Result = unknown, Services = unknown> =
  (input: AppParamsWithoutInputTransformation<Event, Services>) => Promise<Result>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Worker variant that receives the original event structure. The middleware preserves the event in `input.event` and provides correlation information.

**Parameter Shape:**
- `input.input.event` (Event) - Original Lambda event
- `input.input.context` (Context) - AWS Lambda context
- `input.Services` (Services) - Injected services
- `input.correlation` ([Correlation](#correlation)) - Request correlation data

**Examples:**
- `notificationScheduler` - Receives scheduled event structure
- `eventDetails` - Receives AppSync resolver event

---

#### WorkerWithInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithInputTransformation<Event, Result = unknown, Services = unknown> =
  (input: AppParamsWithInputTransformation<Event, Services>) => Promise<Result>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Worker variant that receives transformed/lifted event data. Middleware extracts and transforms the event before passing to the worker.

**Parameter Shape:**
- `input.input` (Event) - Transformed event data (lifted by middleware)
- `input.Services` (Services) - Injected services
- `input.jwt` (string, optional) - JWT token if auth middleware applied

**Examples:**
- `demandStreamToSqs` - Receives array of DynamoDB stream records
- `notificationSend` - Receives array of notification records

---

#### SQSWorker
**Category:** TypeScript Type Alias

```typescript
export type SQSWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<
    TransformedSQSRecord<Message>[],
    SQSBatchItemResultHandlerOutput<Result>,
    Services
  >
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Specialized worker type for SQS message consumers. Receives transformed SQS records and returns batch processing results.

**Generic Parameters:**
- `Message` - Type of the message body
- `Result` - Custom result type (merged with SQS batch response)
- `Services` - Service dependencies

**Input Type:** Array of [TransformedSQSRecord](#transformedsqsrecord)`<Message>`

**Output Type:** [SQSBatchItemResultHandlerOutput](#sqsbatchitemresulthandleroutput)`<Result>`

**Used By:**
- Workers configured with `middlewareType: 'SQS_CONSUMER'`

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

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Specialized worker type for Kinesis stream consumers. Receives transformed Kinesis records and returns batch processing results.

**Generic Parameters:**
- `Message` - Type of the stream message data
- `Result` - Custom result type (merged with Kinesis batch response)
- `Services` - Service dependencies

**Input Type:** Array of [TransformedKinesisMessage](#transformedkinesismessage)`<Message>`

**Output Type:** [KinesisBatchItemResultHandlerOutput](#kinesisbatchitemresulthandleroutput)`<Result>`

**Used By:**
- Workers configured with `middlewareType: 'KINESIS_CONSUMER'`

---

#### TransformedSQSRecord
**Category:** TypeScript Interface

```typescript
export type TransformedSQSRecord<Message = unknown> = {
  body: Message
  recordId: string
  __meta: any
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Transformed SQS record structure. Middleware parses the SQS message and extracts the body, adding metadata.

**Fields:**
- `body` (Message) - Parsed message body (JSON deserialized)
- `recordId` (string) - Unique identifier for the record
- `__meta` (any) - Metadata from the original SQS record

**Transformation:** Raw SQS Record → JSON.parse(body) → TransformedSQSRecord

---

#### TransformedKinesisMessage
**Category:** TypeScript Interface

```typescript
export type TransformedKinesisMessage<Message = unknown> = {
  data: Message
  recordId: string
  __meta: any
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Transformed Kinesis record structure. Middleware decodes the base64 data and parses JSON.

**Fields:**
- `data` (Message) - Parsed message data (base64 decoded + JSON deserialized)
- `recordId` (string) - Unique identifier for the record
- `__meta` (any) - Metadata from the original Kinesis record

**Transformation:** Raw Kinesis Record → base64 decode → JSON.parse → TransformedKinesisMessage

---

#### Correlation
**Category:** TypeScript Interface

```typescript
type Correlation = {
  id: string;
  awsRequestId: string;
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Correlation identifiers for tracing and logging across distributed systems.

**Fields:**
- `id` (string) - Custom correlation ID for request tracking
- `awsRequestId` (string) - AWS Lambda request ID

**Used By:**
- [WorkerWithoutInputTransformation](#workerwithoutinputtransformation) - Passed in `correlation` parameter
- Logging and telemetry middleware
- Distributed tracing (OpenTelemetry)

---

#### FailureIdentifier
**Category:** TypeScript Interface

```typescript
export type FailureIdentifier = {
  itemIdentifier: string
};
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Identifies a failed item in batch processing (SQS/Kinesis).

**Fields:**
- `itemIdentifier` (string) - ID of the failed item

**Used By:**
- SQS and Kinesis batch result handlers
- Partial batch failure responses

---

#### SQSBatchItemResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type SQSBatchItemResultHandlerOutput<Result = unknown> = Result & SQSBatchResponse
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Merges custom worker result with AWS SQS batch response structure.

**Composition:** Custom `Result` + AWS Lambda `SQSBatchResponse`

**Fields from SQSBatchResponse:**
- `batchItemFailures` (Array of `{ itemIdentifier: string }`) - Failed message IDs

**Used By:**
- [SQSWorker](#sqsworker) return type

---

#### KinesisBatchItemResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type KinesisBatchItemResultHandlerOutput<Result = unknown> = Result & KinesisStreamBatchResponse
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/appResolver/Worker.ts`

**Description:** Merges custom worker result with AWS Kinesis batch response structure.

**Composition:** Custom `Result` + AWS Lambda `KinesisStreamBatchResponse`

**Fields from KinesisStreamBatchResponse:**
- `batchItemFailures` (Array of `{ itemIdentifier: string }`) - Failed record IDs

**Used By:**
- [KinesisWorker](#kinesisworker) return type

---

### Service Types

#### Services
**Category:** TypeScript Interface

```typescript
export type Services = {
  aws: AWS
  request: Request
  mongo: Mongo
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/services/index.ts`

**Description:** Container for all injected service dependencies provided to workers.

**Fields:**
- `aws` ([AWS](#aws)) - AWS service clients (DynamoDB, SQS)
- `request` ([Request](#request)) - HTTP request client
- `mongo` ([Mongo](#mongo)) - MongoDB client wrapper

**Extended By:**
- Additional services added via `InstrumentedServices`: `redis`, `discovery`, `bitly`, `sms`, `accounts`

**Used By:**
- All worker functions receive `Services` in parameter object
- Service initialization in `shared/services/index.ts`

---

#### AWS
**Category:** TypeScript Interface

```typescript
export type AWS = {
  demandTable: DynamoDB
  shortUrlQueue: SQS
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/services/aws/index.ts`

**Description:** AWS service client instances for DynamoDB and SQS.

**Fields:**
- `demandTable` (DynamoDB) - DynamoDB client for demand table operations
- `shortUrlQueue` (SQS) - SQS client for short URL queue

**Referenced By:**
- [Services](#services) - `aws` field

**Used By Workers:**
- `demandStreamToSqs` - Uses `shortUrlQueue`
- `notificationSend` - Uses `demandTable`
- `notificationScheduler` - Uses `demandTable`

---

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

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/services/request/index.ts`

**Description:** HTTP request function for calling internal services.

**Parameter Shape:**
- `serviceName` (string, required) - Name of the service being called
- `method` (string, required) - HTTP method: 'GET' | 'POST' | 'PUT' | 'DELETE'
- `baseUrl` (string, required) - Base URL for the service
- `endpoint` (string, optional) - API endpoint path
- `accessPath` (string, optional) - Access path for nested resources
- `headers` (Record<string, string>, optional) - Custom HTTP headers
- Plus fields from [RequestBody](#requestbody)

**Return Type:** Promise<[Response](#response)>

**Referenced By:**
- [Services](#services) - `request` field

---

#### RequestBody
**Category:** TypeScript Type Alias

```typescript
type RequestBody =
  | { body?: string, json: false }
  | { body: Record<string, unknown>, json: true }
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/services/request/index.ts`

**Description:** Union type for request body. Either raw string body with `json: false` or object body with `json: true`.

**Variants:**
- String body: `{ body?: string, json: false }`
- JSON body: `{ body: Record<string, unknown>, json: true }`

**Used By:**
- [Request](#request) - Extends parameter shape

---

#### Response
**Category:** TypeScript Interface

```typescript
export type Response = {
  statusCode: number
  body: unknown
  headers: Record<string, string>
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/services/request/index.ts`

**Description:** HTTP response structure returned by Request function.

**Fields:**
- `statusCode` (number) - HTTP status code
- `body` (unknown) - Response body (parsed JSON or raw)
- `headers` (Record<string, string>) - Response headers

**Returned By:**
- [Request](#request) function

---

#### Mongo
**Category:** TypeScript Interface

```typescript
export type Mongo = {
  campaigns: Campaigns
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/services/mongo/index.ts`

**Description:** MongoDB service wrapper with domain-specific collections.

**Fields:**
- `campaigns` ([Campaigns](#campaigns)) - Campaign collection operations

**Referenced By:**
- [Services](#services) - `mongo` field

---

#### Campaigns
**Category:** TypeScript Interface

```typescript
export type Campaigns = {
  findOpenCampaignIds: () => Promise<any>
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/services/mongo/campaigns.ts`

**Description:** Campaign collection operations.

**Methods:**
- `findOpenCampaignIds()` - Queries MongoDB for campaigns with status 'OPEN' and returns array of campaign IDs

**Referenced By:**
- [Mongo](#mongo) - `campaigns` field

**Implementation:**
```javascript
const cursor = await campaigns.find({ status: 'OPEN' }, { _id: 1 });
const openCampaignIds = await cursor.toArray();
return openCampaignIds.map(campaign => campaign._id.toString());
```

---

### Configuration Types

#### Config
**Category:** TypeScript Type Alias

```typescript
type ConfigValue = string | number | ConfigValue[] | Map<string, ConfigValue>;

export type Config = Map<string, ConfigValue>;
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/config/index.d.ts`

**Description:** Immutable configuration structure using Immutable.js Map. Supports nested configuration values.

**Recursive Type:** `ConfigValue` can contain nested arrays or Maps of `ConfigValue`

**Functions:**
- `getConfig<TConfig = Record<string, string>>(theConfig: Config, ...path: string[]): TConfig` - Get nested config as typed object
- `getConfigValue<TValue extends ConfigValue>(theConfig: Config, ...path: string[]): TValue` - Get specific config value

**Used By:**
- All workers and middleware access configuration
- `shared/enums.js` - Reads product and environment config
- `shared/middlewares/telemetry.ts` - Reads tracing config

---

## JavaScript Enums

### NOTIFICATION_STATUS
**Category:** JavaScript Object (Enum-like)

```javascript
export const NOTIFICATION_STATUS = {
  CREATED: 'CREATED',
  TRIGGERED: 'TRIGGERED',
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED'
};
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/enums.js`

**Values:**
- `CREATED` - Initial state when notification record is created
- `TRIGGERED` - Notification scheduling has been triggered
- `QUEUED` - Notification is queued for sending
- `SENT` - Notification sent to provider (SMS/Email)
- `DELIVERED` - Confirmation of delivery received
- `FAILED` - Notification failed to send or deliver

**Used By:**
- `notificationGenerator` - Sets initial status to `CREATED`
- `notificationSend` - Updates status to `SENT` or `FAILED`
- Status tracking and reporting

---

### CONTACT_METHODS
**Category:** JavaScript Object (Enum-like)

```javascript
export const CONTACT_METHODS = {
  SMS: 'sms',
  EMAIL: 'email'
};
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/enums.js`

**Values:**
- `SMS` - SMS text message
- `EMAIL` - Email notification

**Used By:**
- `notificationGenerator` - Determines which notification type to generate
- `notificationSend` - Routes to appropriate sending service

---

### SALE_TYPES
**Category:** JavaScript Object (Enum-like)

```javascript
export const SALE_TYPES = {
  GENERAL: 'GENERAL',
  PUBLIC: 'PUBLIC',
  SUPPRESS: 'SUPPRESS',
  CC: 'CC',
  RESALE: 'RESALE',
  VF: 'VF',
  PLAT: 'PLAT',
  VIP: 'VIP',
  LN: 'LN',
  AMEX: 'AMEX',
  CITI: 'CITI',
  VERIZON: 'VERIZON',
  CAPITALONE: 'CAPITALONE',
  CHASE: 'CHASE',
  SIGNUP: 'SIGNUP',
  ARTIST_PRESALE: 'ARTIST_PRESALE'
};
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/enums.js`

**Description:** Sale type classifications for ticket sales (presales, public sales, credit card presales, etc.)

**Used By:**
- Sale detection and classification logic
- `SALE_TYPE_KEYWORDS` mapping to identify sale types from names

---

### RECORD_TYPES
**Category:** JavaScript Object (Enum-like)

```javascript
export const RECORD_TYPES = {
  NOTIFICATION: 'notification',
  DEMAND: 'demand',
  EVENT: 'event',
  SALE: 'sale'
};
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/enums.js`

**Values:**
- `NOTIFICATION` - Notification record type
- `DEMAND` - Demand record type (fan interest)
- `EVENT` - Event record type
- `SALE` - Sale record type

**Used By:**
- Record type identification in DynamoDB
- Type field in notification records

---

## Type Dependency Graph

```
Worker<Event, Result, Services> (Union Type)
  ├─ WorkerWithoutInputTransformation<Event, Result, Services>
  │   └─ AppParamsWithoutInputTransformation
  │       ├─ input.input.event (Event)
  │       ├─ input.input.context (AWS Context)
  │       ├─ input.Services (Services)
  │       └─ input.correlation (Correlation)
  │           ├─ id: string
  │           └─ awsRequestId: string
  └─ WorkerWithInputTransformation<Event, Result, Services>
      └─ AppParamsWithInputTransformation
          ├─ input.input (Event - transformed)
          ├─ input.Services (Services)
          └─ input.jwt?: string

SQSWorker<Message, Result, Services>
  ├─ WorkerWithInputTransformation
  ├─ Input: TransformedSQSRecord<Message>[]
  │   └─ TransformedSQSRecord
  │       ├─ body: Message
  │       ├─ recordId: string
  │       └─ __meta: any
  └─ Output: SQSBatchItemResultHandlerOutput<Result>
      └─ Result & SQSBatchResponse

KinesisWorker<Message, Result, Services>
  ├─ WorkerWithInputTransformation
  ├─ Input: TransformedKinesisMessage<Message>[]
  │   └─ TransformedKinesisMessage
  │       ├─ data: Message
  │       ├─ recordId: string
  │       └─ __meta: any
  └─ Output: KinesisBatchItemResultHandlerOutput<Result>
      └─ Result & KinesisStreamBatchResponse

Services (Dependency Injection Container)
  ├─ aws: AWS
  │   ├─ demandTable: DynamoDB
  │   └─ shortUrlQueue: SQS
  ├─ request: Request
  │   ├─ (params: RequestParams & RequestBody) => Promise<Response>
  │   └─ Response
  │       ├─ statusCode: number
  │       ├─ body: unknown
  │       └─ headers: Record<string, string>
  └─ mongo: Mongo
      └─ campaigns: Campaigns
          └─ findOpenCampaignIds: () => Promise<any>

Config (Immutable.js Map)
  └─ ConfigValue (recursive)
      ├─ string
      ├─ number
      ├─ ConfigValue[]
      └─ Map<string, ConfigValue>
```

### Legend
- (Union Type) - TypeScript union type
- (Dependency Injection Container) - Service container
- (Immutable.js Map) - Immutable data structure
- (recursive) - Recursive type definition
