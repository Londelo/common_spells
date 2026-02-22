# Type Definitions - vf-lib

## Overview

This library is a TypeScript-based monorepo containing reusable packages for AWS services, Kafka messaging, tracing/observability, PagerDuty integration, locale handling, crypto utilities, and more. All major types are explicitly defined using TypeScript interfaces, type aliases, and enums.

---

## AWS Package Types

### Core AWS Service Types

The AWS package provides type-safe wrappers for AWS services via the `@verifiedfan/aws` module.

#### DynamoDBParams
**Category:** TypeScript Interface

```typescript
export type DynamoDBParams = {
  tableName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  endpoint?: string;
  requestHandlerConfig?: {
    socketTimeout?: number;
    maxSockets?: number;
    keepAlive?: boolean;
  };
};
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Used By:**
- [DynamoDB factory function](#dynamodb-client-interface) (configuration parameter)

**Description:** Configuration parameters for initializing a DynamoDB client.

---

#### DynamoDB
**Category:** TypeScript Interface (Client Interface)

```typescript
export type DynamoDB = {
  name: string,
  get: (key: { key: DataAndKeyValue }) => Promise<GetCommandOutput>
  getMany: (keys: DataAndKeyValue[]) => Promise<any>
  fullIndexScan: (params: ScanInput) => Promise<ScanCommandOutput>
  query: (params: QueryInput) => Promise<QueryCommandOutput>
  delete: (params: DeleteInput) => Promise<DeleteCommandOutput>
  deleteMany: (keys: DataAndKeyValue[]) => Promise<any>
  put: (params: PutInput) => Promise<PutCommandOutput>
  putMany: (keys: DataAndKeyValue[]) => Promise<any>
  update: (params: UpdateArgs) => Promise<UpdateCommandOutput>
  updateMany: <T extends UpdateArgs>(params: T[]) => Promise<Record<'UnprocessedItems', UpdateTryCatchFailure<T>[]>>
};
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Referenced By:**
- [DynamoDB factory](#dynamodb-client-interface) (return type)

**Dependencies:**
- [QueryInput](#queryinput) - Query operation parameters
- [ScanInput](#scaninput) - Scan operation parameters
- [DeleteInput](#deleteinput) - Delete operation parameters
- [PutInput](#putinput) - Put operation parameters
- [UpdateArgs](#updateargs) - Update operation parameters
- [DataAndKeyValue](#dataandkeyvalue) - Generic record type
- [UpdateTryCatchFailure](#updatetrycatchfailure) - Error handling type

**Description:** Interface representing a DynamoDB client with type-safe CRUD operations.

---

#### DataAndKeyValue
**Category:** TypeScript Type Alias

```typescript
export type DataAndKeyValue = Record<string, unknown>;
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Referenced By:**
- [DynamoDB](#dynamodb) - Used throughout for keys and data
- [FormatGetManyDataParams](#formatgetmanydataparams)
- [QueryInput](#queryinput)
- [DeleteInput](#deleteinput)
- [PutInput](#putinput)

**Description:** Generic key-value record type for DynamoDB items.

---

#### QueryInput
**Category:** TypeScript Interface

```typescript
export type QueryInput = {
  keyConditionExpression: string;
  filterExpression?: string;
  expressionAttributeNames?: { [key: string]: string };
  expressionAttributeValues?: { [key: string]: string };
  projectionExpression?: string;
  indexName?: string;
  limit?: number;
  select?: Select;
  startKey?: DataAndKeyValue;
  scanIndexForward?: boolean;
};
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Used By:**
- [DynamoDB.query](#dynamodb) method parameter

**References:**
- [DataAndKeyValue](#dataandkeyvalue) - For startKey field
- `Select` - Imported from `@aws-sdk/client-dynamodb`

**Description:** Parameters for querying a DynamoDB table.

---

#### ScanInput
**Category:** TypeScript Interface

```typescript
export type ScanInput = {
  indexName: string;
  limit?: number;
  select?: Select;
  startKey?: DataAndKeyValue;
  projectionExpression?: string;
  filterExpression?: string;
  expressionAttributeNames?: { [key: string]: string };
  expressionAttributeValues?: { [key: string]: string };
  consistentRead?: boolean
}
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Used By:**
- [DynamoDB.fullIndexScan](#dynamodb) method parameter

**References:**
- [DataAndKeyValue](#dataandkeyvalue) - For startKey field

---

#### DeleteInput
**Category:** TypeScript Interface

```typescript
export type DeleteInput = {
  key: DataAndKeyValue;
  returnValues?: ReturnValue;
  conditionExpression?: string;
};
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Used By:**
- [DynamoDB.delete](#dynamodb) method parameter

**References:**
- [DataAndKeyValue](#dataandkeyvalue)

---

#### PutInput
**Category:** TypeScript Interface

```typescript
export type PutInput = {
  data: DataAndKeyValue;
  conditionExpression?: string;
};
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Used By:**
- [DynamoDB.put](#dynamodb) method parameter

**References:**
- [DataAndKeyValue](#dataandkeyvalue)

---

#### UpdateArgs
**Category:** TypeScript Interface

```typescript
export type UpdateArgs = {
  key: Record<string, unknown>;
  values: Record<string, unknown>;
  expressionAttributeNames?: Record<string, string>;
  updateExpression: string;
  conditionExpression?: string;
  returnValues?: ReturnValue;
};
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Used By:**
- [DynamoDB.update](#dynamodb) method parameter
- [DynamoDB.updateMany](#dynamodb) method parameter

**Description:** Parameters for updating a DynamoDB item.

---

#### UpdateTryCatchFailure
**Category:** TypeScript Generic Interface

```typescript
export type UpdateTryCatchFailure<T> = {
  params: T,
  error: string
}
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Used By:**
- [DynamoDB.updateMany](#dynamodb) - Return type for failed items

**Description:** Represents a failed update operation in batch updates.

---

#### FormatBatchWriteCommandsParams
**Category:** TypeScript Interface

```typescript
export type FormatBatchWriteCommandsParams = {
  isDelete: boolean;
  TableName: string;
  data?: DataAndKeyValue[];
  keys?: DataAndKeyValue[];
};
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**References:**
- [DataAndKeyValue](#dataandkeyvalue)

**Description:** Internal type for formatting batch write commands.

---

#### FormatGetManyDataParams
**Category:** TypeScript Interface

```typescript
export type FormatGetManyDataParams = {
  TableName: string;
  keys: DataAndKeyValue[];
};
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**References:**
- [DataAndKeyValue](#dataandkeyvalue)

**Description:** Internal type for formatting batch get commands.

---

#### BatchCommand
**Category:** TypeScript Type Alias

```typescript
export type BatchCommand = Command<
  ServiceInputTypes,
  ServiceInputTypes,
  ServiceOutputTypes,
  ServiceOutputTypes,
  SmithyResolvedConfiguration<HttpHandlerOptions>
>;
```

**Exported From:** `/packages/aws/src/dynamodb/types.ts`

**Description:** Type alias for AWS SDK batch commands.

---

### S3 Types

#### S3
**Category:** TypeScript Interface

```typescript
export type S3 = {
  name: string,
  uploadBase64Image: (params: any) => Promise<any>,
  uploadFile: (params: any) => Promise<any>,
  uploadFromStream: (params: any) => Promise<any>,
  uploadData: (params: any) => Promise<any>,
  getObject: (key: any) => Promise<any>,
  getReadStreamForObject: (key: any) => Promise<any>,
  headObject: (key: any) => Promise<any>,
  copyObject: (params: any) => Promise<any>,
  generateSignedUrl: (params: any) => Promise<any>,
  listObjectsByPrefix: (Prefix: any) => Promise<any>,
  listObjects: (params: any) => Promise<any>,
  deleteObjects: (input: any) => Promise<any>
}
```

**Exported From:** `/packages/aws/src/s3/types.ts`

**Description:** S3 client interface with file operations. Currently uses `any` for flexibility but can be refined with specific parameter types.

---

### SNS Types

#### MessageAttributeInput
**Category:** TypeScript Interface

```typescript
export type MessageAttributeInput = {
  name: string;
  value: string | number | boolean | null | Binary | StringArray;
};
```

**Exported From:** `/packages/aws/src/sns/types.ts`

**Referenced By:**
- [SNSMessage](#snsmessage)

**Dependencies:**
- `Binary` - Type alias for `Buffer | Uint8Array`
- `StringArray` - Type alias for `Array<string | number | boolean | null>`

---

#### SNSMessage
**Category:** TypeScript Interface

```typescript
export type SNSMessage = {
  id: string,
  message: string,
  messageAttributes?: Array<MessageAttributeInput>
  messageDeduplicationId?: string,
  messageGroupId?: string
}
```

**Exported From:** `/packages/aws/src/sns/types.ts`

**Used By:**
- [SNS.publishMessage](#sns) - Single message parameter
- [SNS.publishMessageBatch](#sns) - Batch array element

**References:**
- [MessageAttributeInput](#messageattributeinput)

---

#### SNS
**Category:** TypeScript Interface

```typescript
export type SNS = {
    name: string;
    publishMessage: (params: SNSMessage) => Promise<PublishCommandOutput>;
    publishMessageBatch: (batch: Array<SNSMessage>) => Promise<PublishBatchCommandOutput>;
};
```

**Exported From:** `/packages/aws/src/sns/types.ts`

**References:**
- [SNSMessage](#snsmessage)

**Description:** SNS client interface for publishing messages.

---

### SQS Types

#### SQS
**Category:** TypeScript Interface

```typescript
export type SQS = {
  name: string,
  sendMessage: (params: any) => Promise<any>,
  sendMessageBatch: (batch: any) => Promise<any>
  redriveQueueMessages: (params: RedriveParams) => Promise<RedriveResult>
}
```

**Exported From:** `/packages/aws/src/sqs/types.ts`

**References:**
- `RedriveParams` - Internal type for redrive operations
- `RedriveResult` - Internal type for redrive results

---

### Other AWS Service Types

#### Athena
**Category:** TypeScript Interface

```typescript
export type Athena = {
  name: string,
  kickOffQuery: (params: any) => Promise<any>
  query: (params: any) => Promise<any>
}
```

**Exported From:** `/packages/aws/src/athena/types.ts`

---

#### CloudWatch
**Category:** TypeScript Interface

```typescript
export type CloudWatch = {
  name: string,
  putMetricData: (params: any) => Promise<any>
}
```

**Exported From:** `/packages/aws/src/cloudwatch/types.ts`

---

#### Lambda
**Category:** TypeScript Interface

```typescript
export type Lambda = {
  name: string,
  invoke: (params: any) => Promise<any>
}
```

**Exported From:** `/packages/aws/src/lambda/types.ts`

---

#### Kinesis
**Category:** TypeScript Interface

```typescript
export type Kinesis = {
  name: string,
  describeStream: () => Promise<any>
  isOnDemand: () => Promise<boolean>
  listShards: () => Promise<any>
  put: (params: any) => Promise<any>
  putMany: (params: any) => Promise<any>
}
```

**Exported From:** `/packages/aws/src/kinesis/types.ts`

---

#### Firehose
**Category:** TypeScript Interface

```typescript
export type Firehose = {
  name: string,
  put: (params: any) => Promise<any>
  putMany: (params: any) => Promise<any>
}
```

**Exported From:** `/packages/aws/src/firehose/types.ts`

---

#### StepFunctions
**Category:** TypeScript Interface

```typescript
export type StepFunctions = {
  name: string,
  startExecution: (params: any) => Promise<any>
}
```

**Exported From:** `/packages/aws/src/stepfunctions/types.ts`

---

#### SecretsManager
**Category:** TypeScript Interface

```typescript
export type SecretsManager = {
  name: string;
  getSecret: (params?: GetSecretInput) => Promise<GetSecretValueCommandOutput>;
}
```

**Exported From:** `/packages/aws/src/secretsManager/types.ts`

**References:**
- [GetSecretInput](#getsecretinput)

---

#### GetSecretInput
**Category:** TypeScript Interface

```typescript
export type GetSecretInput = {
  versionId?: string
  versionStage?: string
}
```

**Exported From:** `/packages/aws/src/secretsManager/types.ts`

**Used By:**
- [SecretsManager.getSecret](#secretsmanager)

---

#### SecretsConfig
**Category:** TypeScript Interface

```typescript
export type SecretsConfig = {
  region: string;
  secretsId: string,
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  requestHandlerConfig?: {
    socketTimeout?: number;
    maxSockets?: number;
    keepAlive?: boolean;
  };
} & { [key: string]: string; }
```

**Exported From:** `/packages/aws/src/secretsManager/types.ts`

**Description:** Configuration for Secrets Manager client with extensible string properties.

---

## Kafka Package Types

### Core Kafka Types

#### KafkaMessage
**Category:** TypeScript Interface

```typescript
export type KafkaMessage = {
  key? : string,
  value: Record<string, any>
}
```

**Exported From:** `/packages/kafka/src/types.ts`

**Used By:**
- [Producer.sendMessages](#producer)
- [KafkaClient.sendMessages](#kafkaclient)

**Description:** Represents a message to be sent to Kafka.

---

#### Format
**Category:** TypeScript Type Alias (Function Type)

```typescript
export type Format = (message: Record<string, unknown>) => Buffer | Promise<Buffer>
```

**Exported From:** `/packages/kafka/src/types.ts`

**Used By:**
- [KafkaProducerConfig](#kafkaproducerconfig) - Optional formatter parameter

**Description:** Function type for custom message formatters.

---

#### SecureConnectionOptions
**Category:** TypeScript Interface

```typescript
export type SecureConnectionOptions = {
  ca: string,
  cert: string,
  key: string,
  rejectUnauthorized?: boolean
}
```

**Exported From:** `/packages/kafka/src/types.ts`

**Referenced By:**
- [SSLConfig](#sslconfig)

**Description:** SSL/TLS connection configuration.

---

#### SSLConfig
**Category:** TypeScript Type Alias (Union Type)

```typescript
export type SSLConfig = SecureConnectionOptions | ((param?: unknown) => Promise<SecureConnectionOptions>);
```

**Exported From:** `/packages/kafka/src/types.ts`

**Used By:**
- [KafkaProducerConfig](#kafkaproducerconfig)

**References:**
- [SecureConnectionOptions](#secureconnectionoptions)

**Description:** SSL configuration as object or async factory function.

---

#### Registry
**Category:** TypeScript Interface

```typescript
export type Registry = {
  decode: (message: Buffer) => Promise<unknown>
  encode: (message: Record<string, unknown>) => Promise<Buffer>
  registerSchema: (
    { type, subject, schema, compatibility }: {
      type: ConfluentSchemaType,
      subject: string,
      schema: Record<string, unknown>,
      compatibility?: COMPATIBILITY
    }
  ) => Promise<unknown>
}
```

**Exported From:** `/packages/kafka/src/types.ts`

**Referenced By:**
- [KafkaClient](#kafkaclient)

**Description:** Confluent Schema Registry operations interface.

---

#### Producer
**Category:** TypeScript Interface

```typescript
export type Producer = {
  sendMessages: (messages: KafkaMessage[]) => Promise<RecordMetadata[]>
  disconnect: () => Promise<void>
}
```

**Exported From:** `/packages/kafka/src/types.ts`

**Referenced By:**
- [KafkaClient](#kafkaclient)

**References:**
- [KafkaMessage](#kafkamessage)

**Description:** Kafka producer operations.

---

#### KafkaClient
**Category:** TypeScript Type Alias (Intersection Type)

```typescript
export type KafkaClient = Producer & Registry
```

**Exported From:** `/packages/kafka/src/types.ts`

**Extends:**
- [Producer](#producer)
- [Registry](#registry)

**Description:** Combined Kafka producer and schema registry client.

---

#### KafkaProducerConfig
**Category:** TypeScript Interface

```typescript
export type KafkaProducerConfig = {
  registryUrl: string,
  clientId: string,
  brokers: string[],
  topic: string,
  formatter?: Format
  retry?: RetryOptions
  ssl?: SSLConfig
}
```

**Exported From:** `/packages/kafka/src/types.ts`

**Used By:**
- Kafka factory function (configuration parameter)

**References:**
- [Format](#format)
- [SSLConfig](#sslconfig)

**Description:** Configuration parameters for initializing a Kafka producer.

---

## Tracing Package Types

### Core Tracing Types

#### TracedAsyncFnParams
**Category:** TypeScript Generic Interface

```typescript
export type TracedAsyncFnParams<Params extends unknown[], Result extends Promise<unknown>> = {
  asyncFn: AsyncFn<Params, Result>,
  operationName: string,
  attributes?: Attributes,
  attributesSelector?: AttributesSelector<Params, Awaited<Result>>,
  tracerName: string,
  isBackgroundSpan?: boolean
};
```

**Exported From:** `/packages/tracing/src/types.ts`

**Used By:**
- [TracedAsyncFn](#tracedasyncfn-function) factory function

**References:**
- [AsyncFn](#asyncfn)
- [AttributesSelector](#attributesselector)

**Description:** Configuration for wrapping async functions with tracing.

---

#### TracedSdkParams
**Category:** TypeScript Generic Interface

```typescript
export type TracedSdkParams<SDK extends object, FnName extends keyof SDK> = {
  sdk: SDK,
  serviceName: string,
  traceFunctions?: FnName[],
  attributes?: Attributes,
  tracerName: string
};
```

**Exported From:** `/packages/tracing/src/types.ts`

**Used By:**
- [TracedSdk](#tracedsdk-function) factory function

**Description:** Configuration for wrapping SDK clients with tracing.

---

#### GlobalTracerParams
**Category:** TypeScript Interface

```typescript
export type GlobalTracerParams = {
  tracerName: string,
  serviceName: string,
  serviceNamespace: string,
  productGroup: string,
  productCode: string,
  env: string,
  region: string,
  collectorHost: string,
  collectorPort: string | number
};
```

**Exported From:** `/packages/tracing/src/types.ts`

**Used By:**
- [GlobalTracer](#globaltracer-function) factory function

**Description:** Configuration for global OpenTelemetry tracer initialization.

---

#### Request
**Category:** TypeScript Type Alias (Function Type)

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

**Exported From:** `/packages/tracing/src/types.ts`

**Used By:**
- [TracedRequest](#tracedrequest-function)

**References:**
- `RequestBody` - Internal union type
- `Response` - Internal type

**Description:** HTTP request function type with tracing support.

---

#### AttributesSelector
**Category:** TypeScript Generic Type Alias

```typescript
export type AttributesSelector<Params, Result> = (
  input: { params?: Params, error?: unknown, result?: Result }
) => Attributes | undefined
```

**Exported From:** `/packages/tracing/src/types.ts`

**Referenced By:**
- [TracedAsyncFnParams](#tracedasyncfnparams)

**Description:** Function type for selecting trace attributes from operation context.

---

#### AsyncFn
**Category:** TypeScript Generic Type Alias

```typescript
export type AsyncFn<
  Params extends unknown[] = unknown[],
  Result extends Promise<unknown> = Promise<unknown>
> = (...params: Params) => Result
```

**Exported From:** `/packages/tracing/src/types.ts`

**Referenced By:**
- [TracedAsyncFnParams](#tracedasyncfnparams)

**Description:** Generic async function type.

---

## PagerDuty Package Types

### Event Types

#### Severity
**Category:** TypeScript Enum

```typescript
export enum Severity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}
```

**Exported From:** `/packages/pager-duty/src/types/event.ts`

**Used By:**
- [TriggerEvent](#triggerevent)
- PagerDuty API functions

**Description:** Severity levels for PagerDuty incidents.

---

#### EventAction
**Category:** TypeScript Enum

```typescript
export enum EventAction {
  TRIGGER = 'trigger',
  ACKNOWLEDGE = 'acknowledge',
  RESOLVE = 'resolve'
}
```

**Exported From:** `/packages/pager-duty/src/types/event.ts`

**Used By:**
- [TriggerEvent](#triggerevent)
- [AckOrResolveEvent](#ackorresolvevent)

**Description:** Action types for PagerDuty events.

---

#### TriggerEvent
**Category:** TypeScript Interface (Intersection Type)

```typescript
export type TriggerEvent = EventBody & {
  event_action: EventAction.TRIGGER
  dedup_key?: string
}
```

**Exported From:** `/packages/pager-duty/src/types/event.ts`

**Used By:**
- [TriggerRequest](#triggerrequest-function)

**References:**
- [EventAction](#eventaction)
- `EventBody` - Internal type containing payload

**Description:** Event structure for triggering a PagerDuty incident.

---

#### AckOrResolveEvent
**Category:** TypeScript Interface

```typescript
export type AckOrResolveEvent = {
  event_action: EventAction.ACKNOWLEDGE | EventAction.RESOLVE
  dedup_key: string
}
```

**Exported From:** `/packages/pager-duty/src/types/event.ts`

**Used By:**
- [ResolveOrAckRequest](#resolveorackrequest-function)

**References:**
- [EventAction](#eventaction)

**Description:** Event structure for acknowledging or resolving incidents.

---

### API Types

#### ConfigParams
**Category:** TypeScript Interface

```typescript
export type ConfigParams = {
  routingKey: string,
  client?: string,
  clientUrl?: string
  baseUrl?: string,
}
```

**Exported From:** `/packages/pager-duty/src/request.ts`

**Used By:**
- PagerDuty API functions
- [PagerDuty](#pagerduty-function) factory function

**Description:** Configuration for PagerDuty client.

---

#### PagerDutyClient
**Category:** TypeScript Type Alias (Inferred Type)

```typescript
type PagerDutyClient = ReturnType<typeof PagerDuty>;
```

**Exported From:** `/packages/pager-duty/src/index.ts`

**Description:** Type representing the PagerDuty client instance with methods:
- `triggerIncident`
- `resolveIncident`
- `acknowledgeIncident`

---

## Locale Package Types

#### languagesByCountryMap
**Category:** TypeScript Const Object (Frozen)

```typescript
export const languagesByCountryMap = Object.freeze({
  US: ['en'],
  GB: ['en'],
  CA: ['fr', 'en'],
  MX: ['en', 'es'],
  // ... (25 total countries)
} as const);
```

**Exported From:** `/packages/locale/src/enums.ts`

**Description:** Mapping of country codes to supported languages.

---

## Crypto Package Types

#### TypedArray
**Category:** TypeScript Type Alias (Union Type)

```typescript
type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;
```

**Exported From:** `/packages/crypto/src/index.ts`

**Used By:**
- X509Certificate function parameter

**Description:** Union of all JavaScript typed array types.

---

## Map-Utils Package Types

#### MapFunction
**Category:** TypeScript Generic Type Alias

```typescript
export type MapFunction<Item, Result> = (item: Item) => Promise<Result>;
```

**Exported From:** `/packages/map-utils/src/index.ts`

**Used By:**
- [MapAsyncSerial](#mapasyncserial-function)
- [MapAsyncParallel](#mapasyncparallel-function)

**Description:** Generic async mapping function type.

---

## AWS Enums and Constants

#### MAX_BATCH_SIZE
**Category:** Constant Object

```typescript
export const MAX_BATCH_SIZE = {
  KINESIS_WRITE: 500,
  KINESIS_ON_DEMAND_SHARD_COUNT: 12,
  DYNAMODB_WRITE: 25,
  DYNAMODB_READ: 100,
  S3_DELETE: 1000,
  SQS: 10,
  SNS: 10
};
```

**Exported From:** `/packages/aws/src/enums.ts`

**Description:** Maximum batch sizes for AWS service operations.

---

#### FIREHOSE
**Category:** Constant Object

```typescript
export const FIREHOSE = {
  RECORDS_PER_SECOND: 5000,
  MAX_BATCH_PUT: 500
};
```

**Exported From:** `/packages/aws/src/enums.ts`

**Description:** Firehose service limits.

---

## Type Dependency Graph

```
AWS Services
├─ DynamoDB
│   ├─ DynamoDBParams (config)
│   ├─ QueryInput
│   │   └─ DataAndKeyValue
│   ├─ ScanInput
│   │   └─ DataAndKeyValue
│   ├─ DeleteInput
│   │   └─ DataAndKeyValue
│   ├─ PutInput
│   │   └─ DataAndKeyValue
│   ├─ UpdateArgs
│   └─ UpdateTryCatchFailure<T>
├─ SNS
│   ├─ SNSMessage
│   │   └─ MessageAttributeInput
│   └─ PublishCommandOutput (AWS SDK)
├─ S3 (loosely typed - any)
├─ SQS (loosely typed - any)
├─ Kinesis (loosely typed - any)
├─ Firehose (loosely typed - any)
├─ Lambda (loosely typed - any)
├─ CloudWatch (loosely typed - any)
├─ Athena (loosely typed - any)
├─ StepFunctions (loosely typed - any)
└─ SecretsManager
    ├─ SecretsConfig
    └─ GetSecretInput

Kafka
├─ KafkaClient (Producer & Registry)
│   ├─ Producer
│   │   └─ KafkaMessage
│   └─ Registry
├─ KafkaProducerConfig
│   ├─ Format (function type)
│   └─ SSLConfig
│       └─ SecureConnectionOptions

Tracing
├─ TracedAsyncFnParams<Params, Result>
│   ├─ AsyncFn<Params, Result>
│   └─ AttributesSelector<Params, Result>
├─ TracedSdkParams<SDK, FnName>
├─ GlobalTracerParams
└─ Request (function type)

PagerDuty
├─ TriggerEvent
│   ├─ EventAction (enum)
│   └─ Severity (enum)
├─ AckOrResolveEvent
│   └─ EventAction (enum)
├─ ConfigParams
└─ PagerDutyClient

Utilities
├─ MapFunction<Item, Result> (map-utils)
├─ TypedArray (crypto)
├─ languagesByCountryMap (locale)
└─ MAX_BATCH_SIZE / FIREHOSE (aws enums)
```

---

## Summary

This library provides comprehensive TypeScript types for:

1. **AWS Services** - Type-safe wrappers for DynamoDB (fully typed), SNS (fully typed), S3, SQS, Kinesis, Firehose, Lambda, CloudWatch, Athena, StepFunctions, and Secrets Manager.

2. **Kafka** - Complete type definitions for Kafka producers with Confluent Schema Registry integration.

3. **Tracing** - Generic types for wrapping async functions and SDKs with OpenTelemetry tracing.

4. **PagerDuty** - Type-safe incident management API client.

5. **Utilities** - Locale handling, crypto functions, and async mapping utilities.

**Type Coverage:**
- **High Coverage**: DynamoDB, Kafka, Tracing, PagerDuty, SNS, Secrets Manager
- **Moderate Coverage**: Map-Utils, Locale, Crypto
- **Low Coverage (any types)**: S3, SQS, Kinesis, Firehose, Lambda, CloudWatch, Athena, StepFunctions

Most services use strict TypeScript types with the exception of some AWS services that use `any` for flexibility with the AWS SDK.
