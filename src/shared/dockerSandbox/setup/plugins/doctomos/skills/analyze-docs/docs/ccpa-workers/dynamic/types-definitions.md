# Type Definitions - ccpa-workers

## TypeScript Types

### Interfaces

#### Config
**Category:** TypeScript Type Alias

```typescript
export type Config = Map<string, ConfigValue>;
```

**Exported From:** `shared/config/index.d.ts`

**Description:** Immutable Map for configuration values

**References:**
- [ConfigValue](#configvalue)

---

#### ConfigValue
**Category:** TypeScript Type Alias (Recursive)

```typescript
type ConfigValue = string | number | ConfigValue[] | Map<string, ConfigValue>;
```

**Exported From:** `shared/config/index.d.ts`

**Description:** Recursive type for configuration values supporting strings, numbers, arrays, and nested maps

---

#### AppParamsWithInputTransformation
**Category:** TypeScript Interface

```typescript
type AppParamsWithInputTransformation<Event, Services> = {
  input: Event
  Services: Services
  jwt?: string
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker parameters when middleware transforms the input event directly

**Generic Parameters:**
- `Event` - Input event type
- `Services` - Services type

---

#### AppParamsWithoutInputTransformation
**Category:** TypeScript Interface

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

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker parameters when middleware preserves original event structure

**Generic Parameters:**
- `Event` - Input event type
- `Services` - Services type

**References:**
- [Correlation](#correlation)

---

#### Correlation
**Category:** TypeScript Interface

```typescript
type Correlation = {
  id: string;
  awsRequestId: string;
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Correlation data for request tracking

**Fields:**
- `id` (string, required) - Correlation ID
- `awsRequestId` (string, required) - AWS request ID

---

#### Worker
**Category:** TypeScript Type Alias (Union)

```typescript
export type Worker<Event = unknown, Result = void, Services = unknown> =
  WorkerWithoutInputTransformation<Event, Result, Services>
  | WorkerWithInputTransformation<Event, Result, Services>
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Base worker type signature supporting both input transformation modes

**Generic Parameters:**
- `Event` (default: `unknown`) - Input event type
- `Result` (default: `void`) - Return type
- `Services` (default: `unknown`) - Services type

**References:**
- [WorkerWithInputTransformation](#workerwithinputtransformation)
- [WorkerWithoutInputTransformation](#workerwithoutinputtransformation)

**Used By:**
- Template worker (`apps/templates/template/index.ts`)

---

#### WorkerWithInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithInputTransformation<Event, Result = unknown, Services = unknown> =
  (input: AppParamsWithInputTransformation<Event, Services>) => Promise<Result>
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker function signature with input transformation

**References:**
- [AppParamsWithInputTransformation](#appparamswithinputtransformation)

---

#### WorkerWithoutInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithoutInputTransformation<Event, Result = unknown, Services = unknown> =
  (input: AppParamsWithoutInputTransformation<Event, Services>) => Promise<Result>
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Worker function signature without input transformation

**References:**
- [AppParamsWithoutInputTransformation](#appparamswithoutinputtransformation)

---

#### SQSWorker
**Category:** TypeScript Type Alias

```typescript
export type SQSWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<TransformedSQSRecord<Message>[], SQSResultHandlerOutput<Result>, Services>
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Specialized worker type for SQS message processing

**Generic Parameters:**
- `Message` - SQS message payload type
- `Result` - Return type
- `Services` (default: `unknown`) - Services type

**References:**
- [TransformedSQSRecord](#transformedsqsrecord)
- [SQSResultHandlerOutput](#sqsresulthandleroutput)

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

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Specialized worker type for Kinesis stream processing

**Generic Parameters:**
- `Message` - Kinesis message payload type
- `Result` - Return type
- `Services` (default: `unknown`) - Services type

**References:**
- [TransformedKinesisMessage](#transformedkinesismessage)
- [KinesisBatchItemResultHandlerOutput](#kinesisbatchitemresulthandleroutput)

---

#### TransformedSQSRecord
**Category:** TypeScript Type Alias

```typescript
export type TransformedSQSRecord<Message = unknown> = Message & {
  shouldRetry?: boolean
  __meta: any
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** SQS record after middleware transformation with retry flag and metadata

**Generic Parameters:**
- `Message` (default: `unknown`) - Original message type

**Fields:**
- Inherits all fields from `Message`
- `shouldRetry` (boolean, optional) - Indicates if record should be retried
- `__meta` (any, required) - Metadata from middleware processing

---

#### TransformedKinesisMessage
**Category:** TypeScript Type Alias

```typescript
export type TransformedKinesisMessage<Message = unknown> = {
  data: Message
  recordId: string
  __meta: any
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Kinesis message after middleware transformation

**Generic Parameters:**
- `Message` (default: `unknown`) - Original message type

**Fields:**
- `data` (Message, required) - Actual message data
- `recordId` (string, required) - Kinesis record identifier
- `__meta` (any, required) - Metadata from middleware processing

---

#### FailureIdentifier
**Category:** TypeScript Interface

```typescript
export type FailureIdentifier = {
  itemIdentifier: string
};
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Identifies failed items in batch processing

**Fields:**
- `itemIdentifier` (string, required) - Unique identifier for failed item

---

#### SQSResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type SQSResultHandlerOutput<Result = unknown> = Result & {
  unprocessed: TransformedSQSRecord[]
}
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** SQS worker output with unprocessed records

**Generic Parameters:**
- `Result` (default: `unknown`) - Result type

**Fields:**
- Inherits all fields from `Result`
- `unprocessed` (TransformedSQSRecord[], required) - Records that failed processing

---

#### SQSBatchItemResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type SQSBatchItemResultHandlerOutput<Result = unknown> = Result & SQSBatchResponse
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** SQS batch result with AWS Lambda batch response structure

---

#### KinesisBatchItemResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type KinesisBatchItemResultHandlerOutput<Result = unknown> = Result & KinesisStreamBatchResponse
```

**Exported From:** `shared/appResolver/Worker.ts`

**Description:** Kinesis batch result with AWS Lambda batch response structure

---

#### VFError
**Category:** TypeScript Interface

```typescript
export type VFError = {
  message: string,
  stack?: string,
  status?: number,
  statusCode?: number,
  error_message?: string,
  developer_message?: string
}
```

**Exported From:** `shared/format.ts`

**Description:** Standard error format for VerifiedFan applications

**Fields:**
- `message` (string, required) - Error message
- `stack` (string, optional) - Stack trace
- `status` (number, optional) - HTTP status code
- `statusCode` (number, optional) - Alternative HTTP status code field
- `error_message` (string, optional) - User-facing error message
- `developer_message` (string, optional) - Developer-facing error details

---

#### AWS
**Category:** TypeScript Interface

```typescript
export type AWS = {
  'campaignDataBucket': S3,
  'exportServiceBucket': S3,
  'scoringBucket': S3,
  'campaignDataAthena': Athena,
  'acctFanscoreTable': DynamoDB,
  'verificationTable': DynamoDB,
  'fanIdentityTable': DynamoDB,
  'demandTable': DynamoDB,
  'fanInfoQueue': SQS,
  'keepPrivateQueue': SQS,
  'deleteFanQueue': SQS,
  'optOutQueue': SQS,
  'kafkaCertSecret': SecretsManager
}
```

**Exported From:** `shared/services/aws/index.ts`

**Description:** AWS service clients mapping for CCPA worker operations

**Fields:**
- `campaignDataBucket` (S3, required) - S3 bucket for campaign data
- `exportServiceBucket` (S3, required) - S3 bucket for exports
- `scoringBucket` (S3, required) - S3 bucket for scoring data
- `campaignDataAthena` (Athena, required) - Athena client for campaign queries
- `acctFanscoreTable` (DynamoDB, required) - DynamoDB table for account fanscores
- `verificationTable` (DynamoDB, required) - DynamoDB table for verifications
- `fanIdentityTable` (DynamoDB, required) - DynamoDB table for fan identities
- `demandTable` (DynamoDB, required) - DynamoDB table for demand data
- `fanInfoQueue` (SQS, required) - SQS queue for fan info requests
- `keepPrivateQueue` (SQS, required) - SQS queue for keep private requests
- `deleteFanQueue` (SQS, required) - SQS queue for fan deletion requests
- `optOutQueue` (SQS, required) - SQS queue for opt-out requests
- `kafkaCertSecret` (SecretsManager, required) - Secrets Manager for Kafka certificates

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

**Exported From:** `shared/services/request/index.ts`

**Description:** HTTP request function signature

**Parameters:**
- `serviceName` (string, required) - Name of service being called
- `method` ('GET' | 'POST' | 'PUT' | 'DELETE', required) - HTTP method
- `baseUrl` (string, required) - Base URL for the request
- `endpoint` (string, optional) - Endpoint path
- `accessPath` (string, optional) - Access path for logging
- `headers` (Record<string, string>, optional) - Additional headers
- Plus fields from [RequestBody](#requestbody)

**Returns:** Promise<[Response](#response)>

---

#### RequestBody
**Category:** TypeScript Type Alias (Union)

```typescript
type RequestBody = { body?: string, json: false } | { body: Record<string, unknown>, json: true }
```

**Exported From:** `shared/services/request/index.ts`

**Description:** Request body type supporting both JSON and string bodies

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

**Exported From:** `shared/services/request/index.ts`

**Description:** HTTP response structure

**Fields:**
- `statusCode` (number, required) - HTTP status code
- `body` (unknown, required) - Response body
- `headers` (Record<string, string>, required) - Response headers

---

#### Campaigns
**Category:** TypeScript Interface

```typescript
export type Campaigns = {
  findOpenCampaignIds: () => Promise<any>
}
```

**Exported From:** `shared/services/mongo/campaigns.ts`

**Description:** MongoDB campaigns service interface

**Methods:**
- `findOpenCampaignIds` - Returns array of open campaign IDs as strings

---

#### Mongo
**Category:** TypeScript Interface

```typescript
export type Mongo = {
  campaigns: Campaigns
}
```

**Exported From:** `shared/services/mongo/index.ts`

**Description:** MongoDB services interface

**References:**
- [Campaigns](#campaigns)

---

#### Services
**Category:** TypeScript Interface

```typescript
export type Services = {
  aws: AWS
  request: Request
  mongo: Mongo
}
```

**Exported From:** `shared/services/index.ts`

**Description:** Main services container for worker applications

**Fields:**
- `aws` (AWS, required) - AWS service clients
- `request` (Request, required) - HTTP request function
- `mongo` (Mongo, required) - MongoDB services

**References:**
- [AWS](#aws)
- [Request](#request)
- [Mongo](#mongo)

---

## Enums

### PRIVACY_CORE_REQUEST_TYPE
**Category:** JavaScript Enum (Object)

```javascript
export const PRIVACY_CORE_REQUEST_TYPE = {
  GET_INFO: 'GET_INFO',
  ERASE: 'ERASE',
  ERASE_PREFLIGHT_CHECK: 'ERASE_PREFLIGHT_CHECK',
  DO_NOT_SELL: 'DO_NOT_SELL',
  UN_DO_NOT_SELL: 'UN_DO_NOT_SELL',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  FULL_RESTRICT: 'FULL_RESTRICT',
  PARTIAL_RESTRICT: 'PARTIAL_RESTRICT',
  UNRESTRICT: 'UNRESTRICT',
  TRACE: 'TRACE'
}
```

**Exported From:** `shared/enums.js`

**Description:** Privacy request types from Privacy Core platform

**Used By:**
- `processRequest` app (to route requests to correct queue)

---

### PII
**Category:** JavaScript Enum (Array)

```javascript
export const PII = [
  'NAME', 'ALIAS', 'ADDRESS', 'UNIQUE_IDENTIFIER', 'IP_ADDRESS',
  'EMAIL', 'PHONE', 'ACCOUNT_NAME', 'SOCIAL_SECURITY_NUMBER',
  'DRIVERS_LICENSE_NUMBER', 'PASSPORT_NUMBER', 'RACE', 'ETHNICITY',
  'GENDER', 'COMMERCIAL_INFORMATION', 'RECORDS_OF_PROPERTY',
  'PRODUCTS_PROVIDED', 'SERVICES_PROVIDED', 'PURCHASING_HISTORIES_OR_TENDENCIES',
  'CONSUMING_HISTORIES_OR_TENDENCIES', 'BIOMETRIC_DATA', 'BROWSING_HISTORY',
  'SEARCH_HISTORY', 'GEOLOCATION_DATA', 'AUDIO_INFORMATION',
  'ELECTRONIC_INFORMATION', 'VISUAL_INFORMATION', 'THERMAL_INFORMATION',
  'OLFACTORY_INFORMATION', 'PROFESSIONAL_OR_EMPLOYMENT_RELATED_INFORMATION',
  'EDUCATION_INFORMATION', 'OTHER'
]
```

**Exported From:** `shared/enums.js`

**Description:** Valid PII (Personally Identifiable Information) types

**Used By:**
- `formatPIIData` function (to categorize user data)
- `saveDisclosures` app (to map CSV columns to PII types)

---

### Middleware Types
**Category:** JavaScript Enum (Constants)

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

**Exported From:** `shared/middlewares/types.js`

**Description:** Valid worker middleware types

**Used By:**
- Worker configuration validation
- Telemetry middleware (to map middleware type to OpenTelemetry span kind)

---

## Type Dependency Graph

```
Worker<Event, Result, Services> (Type Alias)
  ├─ WorkerWithInputTransformation<Event, Result, Services>
  │   └─ AppParamsWithInputTransformation<Event, Services>
  │       ├─ Event (generic)
  │       ├─ Services (generic)
  │       └─ jwt (optional)
  └─ WorkerWithoutInputTransformation<Event, Result, Services>
      └─ AppParamsWithoutInputTransformation<Event, Services>
          ├─ Event (generic)
          ├─ Services (generic)
          └─ Correlation
              ├─ id (string)
              └─ awsRequestId (string)

SQSWorker<Message, Result, Services>
  ├─ TransformedSQSRecord<Message>[]
  │   ├─ Message (generic + intersection)
  │   ├─ shouldRetry (optional)
  │   └─ __meta
  └─ SQSResultHandlerOutput<Result>
      ├─ Result (generic + intersection)
      └─ unprocessed (TransformedSQSRecord[])

KinesisWorker<Message, Result, Services>
  ├─ TransformedKinesisMessage<Message>[]
  │   ├─ data (Message)
  │   ├─ recordId (string)
  │   └─ __meta
  └─ KinesisBatchItemResultHandlerOutput<Result>

Services (Interface)
  ├─ AWS
  │   ├─ campaignDataBucket (S3)
  │   ├─ exportServiceBucket (S3)
  │   ├─ scoringBucket (S3)
  │   ├─ campaignDataAthena (Athena)
  │   ├─ acctFanscoreTable (DynamoDB)
  │   ├─ verificationTable (DynamoDB)
  │   ├─ fanIdentityTable (DynamoDB)
  │   ├─ demandTable (DynamoDB)
  │   ├─ fanInfoQueue (SQS)
  │   ├─ keepPrivateQueue (SQS)
  │   ├─ deleteFanQueue (SQS)
  │   ├─ optOutQueue (SQS)
  │   └─ kafkaCertSecret (SecretsManager)
  ├─ Request (Function Type)
  │   ├─ Parameters (object)
  │   └─ Returns: Promise<Response>
  └─ Mongo
      └─ Campaigns
          └─ findOpenCampaignIds (Function)

Config (Type Alias)
  └─ Map<string, ConfigValue>
      └─ ConfigValue (recursive)
          ├─ string
          ├─ number
          ├─ ConfigValue[]
          └─ Map<string, ConfigValue> * [circular reference]

VFError (Interface)
  ├─ message (string)
  ├─ stack (optional string)
  ├─ status (optional number)
  ├─ statusCode (optional number)
  ├─ error_message (optional string)
  └─ developer_message (optional string)
```

### Legend
- (Type Alias) - TypeScript type alias
- (Interface) - TypeScript interface
- (Function Type) - Function signature type
- (generic) - Generic type parameter
- (optional) - Optional field
- * - Circular reference
