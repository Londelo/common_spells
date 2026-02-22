# Type Usage Patterns - vf-lib

## Overview

This document captures implicit types from function signatures, implementation patterns, and usage contexts throughout the vf-lib library.

---

## Exported Factory Functions

### DynamoDB Factory

#### DynamoDB
**Confidence:** High (95-100%)

```typescript
export const DynamoDB = ({
  tableName: TableName,
  accessKeyId,
  secretAccessKey,
  region,
  endpoint,
  requestHandlerConfig,
  ...rest
}: DynamoDBParams): DynamoDBType
```

**Source:** [/packages/aws/src/dynamodb/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/aws/src/dynamodb/index.ts:80)

**Parameter Shape:** [DynamoDBParams](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#dynamodbparams)

**Return Type:** [DynamoDB](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#dynamodb)

**Called By:**
- AWS package default export
- Consumer applications

**Calls:**
- `DynamoDBClient` (AWS SDK constructor)
- `DynamoDBDocumentClient.from` (AWS SDK)

**Confidence Note:** Explicit TypeScript types with full parameter and return type annotations.

---

### Kafka Factory

#### Kafka
**Confidence:** High (95-100%)

```typescript
const Kafka = (
  { registryUrl, clientId, brokers, topic, retry, formatter, ssl }: KafkaProducerConfig
): KafkaClient
```

**Source:** [/packages/kafka/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/kafka/src/index.ts:67)

**Parameter Shape:** [KafkaProducerConfig](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#kafkaproducerconfig)

**Return Type:** [KafkaClient](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#kafkaclient)

**Called By:**
- Consumer applications

**Calls:**
- `KafkaJS` constructor
- `ConfluentSchemaRegistry` constructor
- `MapAsyncParallel` (from @verifiedfan/map-utils)

**Confidence Note:** Explicit TypeScript types with full parameter and return type annotations.

---

### GlobalTracer Factory

#### GlobalTracer
**Confidence:** High (95-100%)

```typescript
export const GlobalTracer = ({
  tracerName, serviceName, serviceNamespace, productGroup,
  productCode, env, region, collectorHost, collectorPort
}: GlobalTracerParams) => Tracer
```

**Source:** [/packages/tracing/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/index.ts:15)

**Parameter Shape:** [GlobalTracerParams](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#globaltracerparams)

**Return Type:** `Tracer` (from `@opentelemetry/api`)

**Called By:**
- Application initialization code

**Calls:**
- `NodeTracerProvider` constructor
- `OTLPTraceExporter` constructor
- `BatchSpanProcessor` constructor
- `getTracer` utility

**Confidence Note:** Explicit TypeScript types with full parameter annotation.

---

### TracedAsyncFn Factory

#### TracedAsyncFn
**Confidence:** High (95-100%)

```typescript
const TracedAsyncFn = <Params extends unknown[], Result extends Promise<unknown>>({
  asyncFn,
  operationName,
  attributes = {},
  attributesSelector = () => ({}),
  tracerName,
  isBackgroundSpan = false
}: TracedAsyncFnParams<Params, Result>) => (...params: Params): Promise<Awaited<Result>>
```

**Source:** [/packages/tracing/src/TracedAsyncFn.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedAsyncFn.ts:7)

**Parameter Shape:** [TracedAsyncFnParams](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#tracedasyncfnparams)

**Return Type:** Generic async function `(...params: Params) => Promise<Awaited<Result>>`

**Called By:**
- [TracedSdk](#tracedsdk)
- [TracedRequest](#tracedrequest)
- Consumer applications

**Calls:**
- `trace.getSpan` (OpenTelemetry)
- `getTracer` utility
- `tracer.startActiveSpan` (OpenTelemetry)
- `asyncFn` (user-provided function)

**Confidence Note:** Explicit generic TypeScript types with full type safety.

---

### TracedSdk Factory

#### TracedSdk
**Confidence:** High (95-100%)

```typescript
const TracedSdk = <SDK extends object, FnName extends keyof SDK>({
  sdk,
  serviceName,
  traceFunctions = [],
  attributes = {},
  tracerName
}: TracedSdkParams<SDK, FnName>): SDK
```

**Source:** [/packages/tracing/src/TracedSdk.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedSdk.ts:5)

**Parameter Shape:** [TracedSdkParams](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#tracedsdkparams)

**Return Type:** Generic `SDK` type (same as input SDK)

**Called By:**
- Consumer applications wrapping AWS SDKs or other service clients

**Calls:**
- [TracedAsyncFn](#tracedasyncfn) (for each function in SDK)
- `R.mapObjIndexed` (Ramda)

**Confidence Note:** Explicit generic TypeScript types with full type safety.

---

### TracedRequest Factory

#### TracedRequest
**Confidence:** High (95-100%)

```typescript
const TracedRequest = (request: Request, tracerName: string): Request
```

**Source:** [/packages/tracing/src/TracedRequest.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedRequest.ts:20)

**Parameter Shape:**
- `request` ([Request](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#request) function type)
- `tracerName` (string)

**Return Type:** [Request](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#request) function type

**Called By:**
- Consumer applications

**Calls:**
- [TracedAsyncFn](#tracedasyncfn)
- `setContext` utility

**Confidence Note:** Explicit TypeScript types.

---

### PagerDuty Factory

#### PagerDuty
**Confidence:** High (95-100%)

```typescript
const PagerDutyWrapper = ({ routingKey, baseUrl = url, ...rest }: ConfigParams) => ({
  triggerIncident: Function,
  resolveIncident: Function,
  acknowledgeIncident: Function
})
```

**Source:** [/packages/pager-duty/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/pager-duty/src/index.ts:16)

**Parameter Shape:** [ConfigParams](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#configparams)

**Return Type:** [PagerDutyClient](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#pagerdutyclient)

**Called By:**
- Consumer applications

**Calls:**
- `TriggerIncident` function
- `ResolveIncident` function
- `AcknowledgeIncident` function

**Confidence Note:** Explicit TypeScript types with ConfigParams interface.

---

### Redis Factory

#### Redis
**Confidence:** Medium (70-94%)

```typescript
const Redis = ({ url, readOnlyUrl, socket, username, password, name, database }) => ({
  get: Function,
  mget: Function,
  set: Function,
  delete: Function,
  quit: Function,
  on: Function
})
```

**Source:** [/packages/redis/src/index.js](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/redis/src/index.js:67)

**Parameter Shape (JSDoc):**
- `url` (string, optional) - Redis connection URL
- `readOnlyUrl` (string, optional) - Read-only replica URL
- `socket` (object, optional) - Socket connection properties
  - `socket.port` (number, optional)
  - `socket.host` (string, optional)
  - `socket.family` (number, optional) - IP Stack version (4, 6, or 0)
  - `socket.path` (string, optional) - Path to UNIX Socket
  - `socket.connectTimeout` (number, optional) - Connection Timeout (ms)
  - `socket.keepAlive` (number, optional)
  - `socket.tls` (boolean, optional)
  - `socket.reconnectStrategy` (function, optional)
- `username` (string, optional) - ACL username
- `password` (string, optional) - ACL password
- `name` (string, optional) - Connection name
- `database` (string, optional) - Redis database number

**Return Type (inferred):**
```typescript
{
  get: ({ key, usePrimary }: { key: string, usePrimary?: boolean }) => Promise<any>
  mget: ({ keys, usePrimary }: { keys: string[], usePrimary?: boolean }) => Promise<any[]>
  set: ({ key, value, ttl, newOnly }: { key: string, value: any, ttl?: number, newOnly?: boolean }) => Promise<string | null>
  delete: ({ key }: { key: string }) => Promise<number>
  quit: () => Promise<void>
  on: (eventType: 'connect' | 'ready' | 'end' | 'error' | 'reconnecting', listener: Function) => void
}
```

**Called By:**
- Consumer applications

**Calls:**
- `createClient` (from `redis` package)
- `withRetry` internal utility

**Confidence Note:** Medium confidence based on JSDoc annotations and implementation analysis. No explicit TypeScript types.

---

## Utility Functions

### MapAsyncSerial

#### MapAsyncSerial
**Confidence:** High (95-100%)

```typescript
export const MapAsyncSerial = <Item, Result>(fn: MapFunction<Item, Result>) =>
  async(records: Item[]): Promise<Awaited<Result>[]>
```

**Source:** [/packages/map-utils/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/map-utils/src/index.ts:18)

**Parameter Shape:**
- `fn` ([MapFunction](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#mapfunction))

**Return Type:** Function that takes `Item[]` and returns `Promise<Awaited<Result>[]>`

**Called By:**
- Consumer applications for sequential async operations

**Calls:**
- User-provided `fn` function (sequentially in a loop)
- `throwIfInvalidParams` validation

**Confidence Note:** Explicit generic TypeScript types.

---

### MapAsyncParallel

#### MapAsyncParallel
**Confidence:** High (95-100%)

```typescript
export const MapAsyncParallel = <Item, Result>(fn: MapFunction<Item, Result>) =>
  async(records: Item[]): Promise<Awaited<Result>[]>
```

**Source:** [/packages/map-utils/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/map-utils/src/index.ts:32)

**Parameter Shape:**
- `fn` ([MapFunction](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#mapfunction))

**Return Type:** Function that takes `Item[]` and returns `Promise<Awaited<Result>[]>`

**Called By:**
- DynamoDB batch operations
- Kafka message encoding
- Consumer applications for parallel async operations

**Calls:**
- User-provided `fn` function (mapped over array)
- `Promise.all`
- `throwIfInvalidParams` validation

**Confidence Note:** Explicit generic TypeScript types.

---

### getFallbackLocale

#### getFallbackLocale
**Confidence:** High (95-100%)

```typescript
const getFallbackLocale = (locale: string, options?: Partial<Options>): string
```

**Source:** [/packages/locale/src/getFallbackLocale.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/locale/src/getFallbackLocale.ts:19)

**Parameter Shape:**
- `locale` (string, required) - Input locale string (e.g., "en-US", "fr_CA")
- `options` (object, optional)
  - `options.outputDelimiter` (string, optional) - Delimiter for output ('_' or '-')

**Return Type:** string (normalized locale)

**Called By:**
- Consumer applications for locale normalization

**Calls:**
- `detectDelimiter` internal utility
- `validateDelimiter` internal utility
- `FallbackRules` internal utility

**Confidence Note:** Explicit TypeScript types with inline Options type.

---

### Crypto Utilities

#### simpleUniqueId
**Confidence:** High (95-100%)

```typescript
const simpleUniqueId = (length = 24): string
```

**Source:** [/packages/crypto/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/crypto/src/index.ts:16)

**Parameter Shape:**
- `length` (number, optional, default: 24) - Length of generated ID

**Return Type:** string (hexadecimal ID)

**Called By:**
- Consumer applications for unique ID generation

**Calls:**
- `crypto.randomBytes`

**Confidence Note:** Explicit TypeScript types with default parameter.

---

#### uuid
**Confidence:** High (95-100%)

```typescript
const uuid = (options: RandomUUIDOptions): string
```

**Source:** [/packages/crypto/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/crypto/src/index.ts:22)

**Parameter Shape:**
- `options` (RandomUUIDOptions from crypto module)

**Return Type:** string (UUID)

**Called By:**
- Consumer applications for UUID generation

**Calls:**
- `crypto.randomUUID`

**Confidence Note:** Explicit TypeScript types using Node.js crypto types.

---

#### X509Certificate
**Confidence:** High (95-100%)

```typescript
const X509Certificate = (cert: string | TypedArray | Buffer | DataView): crypto.X509Certificate
```

**Source:** [/packages/crypto/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/crypto/src/index.ts:24)

**Parameter Shape:**
- `cert` (string | [TypedArray](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#typedarray) | Buffer | DataView)

**Return Type:** crypto.X509Certificate

**Called By:**
- Consumer applications for certificate parsing

**Calls:**
- `crypto.X509Certificate` constructor

**Confidence Note:** Explicit TypeScript types.

---

## PagerDuty API Functions

### TriggerIncident

#### TriggerIncident
**Confidence:** High (95-100%)

```typescript
export const TriggerIncident = (params: ConfigParams) =>
  ({ dedupKey, severity, summary, source, component, customDetails }: TriggerParams) => Promise<any>
```

**Source:** [/packages/pager-duty/src/api.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/pager-duty/src/api.ts:16)

**Parameter Shape (TriggerParams):**
- `severity` ([Severity](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#severity) enum, required)
- `summary` (string, required)
- `source` (string, required)
- `customDetails` (Record<string, unknown>, optional)
- `component` (string, optional)
- `dedupKey` (string, optional)

**Return Type:** Promise (PagerDuty API response)

**Called By:**
- [PagerDuty](#pagerduty) factory function

**Calls:**
- `TriggerRequest` function

**Confidence Note:** Explicit TypeScript types with TriggerParams interface.

---

### ResolveIncident

#### ResolveIncident
**Confidence:** High (95-100%)

```typescript
export const ResolveIncident = (params: ConfigParams) =>
  ({ dedupKey }: ResolveParams) => Promise<any>
```

**Source:** [/packages/pager-duty/src/api.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/pager-duty/src/api.ts:50)

**Parameter Shape (ResolveParams):**
- `dedupKey` (string, required)

**Return Type:** Promise (PagerDuty API response)

**Called By:**
- [PagerDuty](#pagerduty) factory function

**Calls:**
- `ResolveOrAckRequest` function

**Confidence Note:** Explicit TypeScript types with ResolveParams interface.

---

### AcknowledgeIncident

#### AcknowledgeIncident
**Confidence:** High (95-100%)

```typescript
export const AcknowledgeIncident = (params: ConfigParams) =>
  ({ dedupKey }: ResolveParams) => Promise<any>
```

**Source:** [/packages/pager-duty/src/api.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/pager-ery/src/api.ts:51)

**Parameter Shape (ResolveParams):**
- `dedupKey` (string, required)

**Return Type:** Promise (PagerDuty API response)

**Called By:**
- [PagerDuty](#pagerduty) factory function

**Calls:**
- `ResolveOrAckRequest` function

**Confidence Note:** Explicit TypeScript types with ResolveParams interface.

---

## Internal Utility Functions

### DynamoDB Utilities

#### formatGetManyData
**Confidence:** High (95-100%)

```typescript
const formatGetManyData = ({ TableName, keys }: FormatGetManyDataParams): BatchGetCommandInput
```

**Source:** [/packages/aws/src/dynamodb/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/aws/src/dynamodb/index.ts:47)

**Parameter Shape:** [FormatGetManyDataParams](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#formatgetmanydataparams)

**Return Type:** `BatchGetCommandInput` (AWS SDK type)

**Called By:**
- DynamoDB.getMany method

**Calls:**
- Ramda utility functions

**Confidence Note:** Explicit TypeScript types.

---

#### formatBatchWriteCommands
**Confidence:** High (95-100%)

```typescript
const formatBatchWriteCommands = ({ isDelete, TableName, data, keys }: FormatBatchWriteCommandsParams) => BatchCommand[]
```

**Source:** [/packages/aws/src/dynamodb/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/aws/src/dynamodb/index.ts:56)

**Parameter Shape:** [FormatBatchWriteCommandsParams](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#formatbatchwritecommandsparams)

**Return Type:** Array of [BatchCommand](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#batchcommand)

**Called By:**
- DynamoDB.deleteMany method
- DynamoDB.putMany method

**Calls:**
- Ramda utility functions

**Confidence Note:** Explicit TypeScript types.

---

### Kafka Utilities

#### jsonFormat
**Confidence:** High (95-100%)

```typescript
export const jsonFormat: Format = (message: Record<string, unknown>): Buffer
```

**Source:** [/packages/kafka/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/kafka/src/index.ts:65)

**Parameter Shape:**
- `message` (Record<string, unknown>, required)

**Return Type:** Buffer (JSON-serialized message)

**Called By:**
- Kafka default formatter
- Consumer applications

**Calls:**
- `JSON.stringify`
- `Buffer.from`

**Confidence Note:** Explicit TypeScript type annotation with Format type.

---

#### getSSLConfig
**Confidence:** High (95-100%)

```typescript
const getSSLConfig = (params: { topic: string, ssl?: SSLConfig }) => Promise<SecureConnectionOptions | undefined>
```

**Source:** [/packages/kafka/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/kafka/src/index.ts:50)

**Parameter Shape:**
- `topic` (string, required)
- `ssl` ([SSLConfig](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#sslconfig), optional)

**Return Type:** Promise<[SecureConnectionOptions](/Users/Brodie.Balser/.vf-docs/vf-lib/dynamic/types-definitions.md#secureconnectionoptions) | undefined>

**Called By:**
- Kafka factory function (memoized)

**Calls:**
- `R.memoizeWith` (Ramda)
- `ssl` function if it's a function

**Confidence Note:** Explicit TypeScript types.

---

## Middleware Functions

### context Middleware

#### context
**Confidence:** Medium (70-94%)

```typescript
export const context = async(ctx, next) => {
  ctx.appContext = {
    startDate: Date
  };
  await next();
}
```

**Source:** [/packages/vf-lib/src/middlewares/context.js](file:///Users/Brodie.Balser/Documents/TM/vf/lib/src/middlewares/context.js:6)

**Parameter Shape (inferred from JSDoc):**
- `ctx` (object, required) - Koa context object
  - Mutated to add `ctx.appContext` property
- `next` (function, required) - Next middleware function

**Return Type:** Promise<void>

**Called By:**
- Koa application middleware chain

**Calls:**
- `next()` middleware function

**Confidence Note:** Medium confidence based on JSDoc comment and common Koa middleware patterns. No explicit types.

---

## Implementation Patterns

### Retry Pattern

**Pattern:** Async retry with exponential backoff

**Found In:**
- [/packages/redis/src/index.js](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/redis/src/index.js:14)
- [/packages/kafka/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/kafka/src/index.ts:29)

**Implementation:**
```typescript
const retryOptions = {
  retries: 3,
  factor: 3,
  minTimeout: 250,
  maxTimeout: 2000,
  randomize: false
};

const withRetry = (client, op) => asyncRetry(
  async bail => {
    try {
      return await op();
    }
    catch (error) {
      // Retry on connection errors, bail on other errors
      if (isConnectionError(error)) {
        await client.connect();
        throw (error);
      }
      bail(error);
    }
  },
  retryOptions
);
```

**Usage Pattern:**
```typescript
await withRetry(client, async () => client.get(key));
```

**Common Across:**
- Redis client operations
- Kafka producer operations

---

### Batch Processing Pattern

**Pattern:** Split array into batches and process in parallel

**Found In:**
- [/packages/aws/src/dynamodb/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/aws/src/dynamodb/index.ts:56)

**Implementation:**
```typescript
const formatBatchWriteCommands = ({ isDelete, TableName, data, keys }) =>
  R.pipe(
    () => data || keys,
    R.defaultTo([]),
    R.splitEvery(MAX_BATCH_SIZE.DYNAMODB_WRITE),  // Split into batches of 25
    R.map(
      R.pipe(
        items => createBatchCommand(items),
        items => new BatchWriteCommand(items)
      )
    )
  )();
```

**Batch Sizes:**
- DynamoDB Write: 25 items
- DynamoDB Read: 100 items
- Kinesis Write: 500 records
- Firehose: 500 records
- S3 Delete: 1000 objects
- SQS: 10 messages
- SNS: 10 messages

---

### Memoization Pattern

**Pattern:** Cache expensive computations (schema lookups, SSL config)

**Found In:**
- [/packages/kafka/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/kafka/src/index.ts:50)

**Implementation:**
```typescript
const getSchemaId = R.memoizeWith(
  R.identity,
  (topicName: string) => registry.getLatestSchemaId(`${topicName}-value`)
);

const getSSLConfig = R.memoizeWith(
  R.always(params.topic),
  async({ ssl }) => {
    if (R.is(Function, ssl)) {
      return ssl();
    }
    return ssl;
  }
);
```

**Usage:**
- Schema ID lookups (memoized by topic name)
- SSL configuration (memoized by topic name)

---

### Higher-Order Function Pattern

**Pattern:** Return configured function from factory

**Found In:**
- [/packages/map-utils/src/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/map-utils/src/index.ts)
- [/packages/tracing/src/TracedAsyncFn.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedAsyncFn.ts)
- [/packages/pager-duty/src/api.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/pager-duty/src/api.ts)

**Implementation:**
```typescript
// Map utilities
export const MapAsyncParallel = <Item, Result>(fn: MapFunction<Item, Result>) =>
  async(records: Item[]) => {
    const promises = records.map(record => fn(record));
    return Promise.all(promises);
  };

// PagerDuty API
export const TriggerIncident = (params: ConfigParams) =>
  ({ severity, summary, source, ... }: TriggerParams) => {
    const request = TriggerRequest(params);
    return request({ endpoint, body });
  };
```

**Pattern Benefits:**
- Configuration separation
- Partial application
- Reusable configured instances

---

### Tracing Wrapper Pattern

**Pattern:** Wrap async functions with OpenTelemetry spans

**Found In:**
- [/packages/tracing/src/TracedAsyncFn.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedAsyncFn.ts)
- [/packages/tracing/src/TracedSdk.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedSdk.ts)
- [/packages/tracing/src/TracedRequest.ts](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedRequest.ts)

**Implementation:**
```typescript
const TracedAsyncFn = ({ asyncFn, operationName, tracerName, ... }) =>
  async(...params) => {
    return await tracer.startActiveSpan(operationName, options, async span => {
      try {
        const result = await asyncFn(...params);
        span.setAttributes(attributesSelector({ result }));
        return result;
      }
      catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      }
      finally {
        span.end();
      }
    });
  };
```

**Usage:**
```typescript
const tracedFunction = TracedAsyncFn({
  asyncFn: myAsyncFunction,
  operationName: 'MyOperation',
  tracerName: 'my-service'
});
```

---

## Function Call Relationships

### DynamoDB.getMany → formatGetManyData

**Caller:** DynamoDB.getMany
**Source:** [/packages/aws/src/dynamodb/index.ts:191](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/aws/src/dynamodb/index.ts:191)

**Called Function:** formatGetManyData
**Source:** [/packages/aws/src/dynamodb/index.ts:47](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/aws/src/dynamodb/index.ts:47)

**Relationship:** DynamoDB.getMany uses formatGetManyData to transform keys array into AWS SDK BatchGetCommand input format.

---

### Kafka.sendMessages → MapAsyncParallel

**Caller:** Kafka.sendMessages
**Source:** [/packages/kafka/src/index.ts:116](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/kafka/src/index.ts:116)

**Called Function:** MapAsyncParallel
**Source:** [/packages/map-utils/src/index.ts:32](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/map-utils/src/index.ts:32)

**Relationship:** Kafka.sendMessages uses MapAsyncParallel to encode messages in parallel before sending.

---

### TracedSdk → TracedAsyncFn

**Caller:** TracedSdk
**Source:** [/packages/tracing/src/TracedSdk.ts:13](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedSdk.ts:13)

**Called Function:** TracedAsyncFn
**Source:** [/packages/tracing/src/TracedAsyncFn.ts:7](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedAsyncFn.ts:7)

**Relationship:** TracedSdk wraps each function in an SDK object using TracedAsyncFn to add tracing spans.

---

### TracedRequest → TracedAsyncFn

**Caller:** TracedRequest
**Source:** [/packages/tracing/src/TracedRequest.ts:20](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedRequest.ts:20)

**Called Function:** TracedAsyncFn
**Source:** [/packages/tracing/src/TracedAsyncFn.ts:7](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/tracing/src/TracedAsyncFn.ts:7)

**Relationship:** TracedRequest uses TracedAsyncFn to wrap HTTP request functions with tracing.

---

### PagerDuty → TriggerIncident

**Caller:** PagerDuty factory
**Source:** [/packages/pager-duty/src/index.ts:8](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/pager-duty/src/index.ts:8)

**Called Function:** TriggerIncident
**Source:** [/packages/pager-duty/src/api.ts:16](file:///Users/Brodie.Balser/Documents/TM/vf/lib/packages/pager-duty/src/api.ts:16)

**Relationship:** PagerDuty factory creates client instance with triggerIncident method from TriggerIncident function.

---

## Summary

### Confidence Distribution

**High Confidence (95-100%):**
- All TypeScript factory functions (DynamoDB, Kafka, Tracing, PagerDuty)
- All TypeScript utility functions (map-utils, crypto, locale)
- PagerDuty API functions
- Internal DynamoDB utilities
- Kafka utilities

**Medium Confidence (70-94%):**
- Redis factory function (JSDoc-based)
- Middleware functions (JSDoc-based)

**Low Confidence (50-69%):**
- None in this analysis

### Type Coverage Summary

**Explicit TypeScript Types:**
- DynamoDB: Full coverage with detailed input/output types
- Kafka: Full coverage with generic types
- Tracing: Full coverage with advanced generic types
- PagerDuty: Full coverage with enum and interface types
- Utilities: Full coverage (map-utils, crypto, locale)

**JSDoc-Based Types:**
- Redis: Good JSDoc documentation with parameter descriptions
- Middleware: Basic JSDoc with minimal type info

**Implementation Patterns:**
- Retry with exponential backoff (Redis, Kafka)
- Batch processing (DynamoDB)
- Memoization (Kafka schema registry)
- Higher-order functions (map-utils, PagerDuty)
- Tracing wrappers (OpenTelemetry integration)

This library demonstrates excellent type safety in TypeScript packages with consistent patterns for async operations, error handling, and observability.
