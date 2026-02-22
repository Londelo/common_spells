# API Contracts - vf-lib

This document describes all exported APIs, functions, classes, and types from the VerifiedFan library monorepo.

## Main Library Exports

From the root package (`@verifiedfan/lib`):

| Export | Type | Description |
|--------|------|-------------|
| Build | Namespace | Build utilities and Runfile |
| Cache | Class | Caching utilities |
| Config | Class | Configuration management |
| Discovery | Class | Service discovery |
| Facebook | Class | Facebook API client |
| Fastly | Class | Fastly CDN client |
| Instrumentation | Namespace | Instrumentation utilities |
| Log | Function | Logging factory function |
| Metrics | Class | Metrics collection |
| Mongo | Class | MongoDB connection wrapper |
| Objects | Namespace | Object utility functions |
| Request | Function | HTTP request with retry |
| Runfile | Class | Build file execution |
| SchemaValidator | Class | JSON schema validation |
| SfmcClient | Class | Salesforce Marketing Cloud client |
| Spotify | Class | Spotify API client |
| AppleMusic | Class | Apple Music API client |
| TmOrders | Class | Ticketmaster Orders service client |
| TmUsers | Class | Ticketmaster Users service client |
| WorkerAuth | Namespace | Worker authentication utilities |
| aws | Object | AWS service clients collection |
| awsUtils | Namespace | AWS utility functions |
| cacheUtils | Namespace | Cache utility functions |
| correlation | Object | Request correlation utilities |
| date | Namespace | Date/time utilities |
| enums | Object | Enumerated constants |
| error | Function | Error creation utility |
| VFError | Class | VerifiedFan custom error class |
| jwt | Object | JWT token utilities |
| kafka | Function | Kafka client factory |
| middlewares | Object | Express/Fastify middleware collection |
| normalizers | Object | Data normalization functions |
| pagingUtils | Namespace | Pagination utilities |
| paramUtils | Namespace | Parameter utilities |
| permissions | Namespace | Permission utilities |
| schemaDefs | Object | Schema definitions |
| selectors | Object | Data selectors |
| templateVars | Namespace | Template variable processors |
| testUtils | Object | Testing utilities |
| timer | Function | Timer utilities |
| validators | Namespace | Validation functions |

---

## AWS Services (`@verifiedfan/aws`)

### S3 Client

Factory function that creates an S3 client with file operations.

**Constructor Parameters:**
```typescript
{
  bucketName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region: string;
  endpoint?: string;
  requestHandlerConfig?: object;
}
```

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| uploadBase64Image | ({ base64, contentType, fileKey, cacheControl?, acl? }) => Promise<S3Result> | Upload base64 encoded image |
| uploadFile | ({ filePath, contentType, fileKey, cacheControl?, acl? }) => Promise<S3Result> | Upload file from filesystem |
| uploadFromStream | ({ contentType, fileKey, passThroughStream, cacheControl?, acl? }) => Promise<S3Result> | Upload from stream |
| uploadData | ({ data, contentType, fileKey, cacheControl?, acl? }) => Promise<S3Result> | Upload raw data |
| getObject | (key: string) => Promise<string> | Get object as UTF-8 string |
| getReadStreamForObject | (key: string) => Promise<ReadStream> | Get object as readable stream |
| headObject | (key: string) => Promise<HeadObjectOutput> | Get object metadata |
| copyObject | ({ sourceBucket?, sourceKey, destKey }) => Promise<CopyObjectOutput> | Copy object |
| generateSignedUrl | ({ fileKey, ttlSecs }) => Promise<string> | Generate pre-signed URL |
| listObjectsByPrefix | (prefix: string) => Promise<ListObjectsOutput> | List objects by prefix (deprecated) |
| listObjects | ({ prefix, continuationToken? }) => Promise<ListObjectsOutput> | List objects with pagination |
| deleteObjects | (keys: string[]) => Promise<DeleteObjectsOutput> | Delete multiple objects |

### DynamoDB Client

Factory function that creates a DynamoDB document client.

**Constructor Parameters:**
```typescript
{
  tableName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  endpoint?: string;
  requestHandlerConfig?: object;
}
```

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| get | ({ key }) => Promise<GetOutput> | Get single item |
| getMany | (keys: DataAndKeyValue[]) => Promise<Item[]> | Batch get items |
| query | (params: QueryInput) => Promise<QueryOutput> | Query with key conditions |
| fullIndexScan | (params: ScanInput) => Promise<ScanOutput> | Scan entire index |
| put | ({ data, conditionExpression? }) => Promise<PutOutput> | Put single item |
| putMany | (data: DataAndKeyValue[]) => Promise<BatchWriteOutput> | Batch put items |
| update | (params: UpdateArgs) => Promise<UpdateOutput> | Update single item |
| updateMany | (data: UpdateArgs[]) => Promise<UpdateManyResult> | Batch update items |
| delete | ({ key, returnValues?, conditionExpression? }) => Promise<DeleteOutput> | Delete single item |
| deleteMany | (keys: DataAndKeyValue[]) => Promise<BatchWriteOutput> | Batch delete items |

### Other AWS Services

| Service | Module | Description |
|---------|--------|-------------|
| Kinesis | aws.Kinesis | Kinesis stream operations |
| Firehose | aws.Firehose | Firehose delivery stream operations |
| Lambda | aws.Lambda | Lambda function invocation |
| CloudWatch | aws.CloudWatch | CloudWatch metrics and logs |
| SQS | aws.SQS | SQS queue operations |
| Athena | aws.Athena | Athena query execution |
| StepFunctions | aws.StepFunctions | Step Functions execution |
| SNS | aws.SNS | SNS topic publishing |
| SecretsManager | aws.SecretsManager | Secrets Manager operations |

---

## Kafka Client (`@verifiedfan/kafka`)

Factory function that creates a Kafka producer with schema registry support.

**Constructor Parameters:**
```typescript
{
  registryUrl: string;
  clientId: string;
  brokers: string[];
  topic: string;
  formatter?: Format;
  retry?: RetryOptions;
  ssl?: SSLConfig;
}
```

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| sendMessages | (messages: KafkaMessage[]) => Promise<RecordMetadata[]> | Send messages to topic |
| disconnect | () => Promise<void> | Disconnect producer |
| decode | (message: Buffer) => Promise<unknown> | Decode Avro message |
| encode | (message: object) => Promise<Buffer> | Encode message with schema |
| registerSchema | (params: RegisterSchemaParams) => Promise<unknown> | Register schema in registry |

**Types:**

```typescript
type KafkaMessage = {
  key?: string;
  value: Record<string, any>;
}

type Format = (message: Record<string, unknown>) => Buffer | Promise<Buffer>

type SSLConfig = SecureConnectionOptions | (() => Promise<SecureConnectionOptions>)

type SecureConnectionOptions = {
  ca: string;
  cert: string;
  key: string;
  rejectUnauthorized?: boolean;
}
```

---

## MongoDB Client (`@verifiedfan/mongodb`)

Factory function that creates a MongoDB connection with collection and index management.

**Constructor Parameters:**
```typescript
{
  config: {
    port: number;
    hostUrls: string[];
    username?: string;
    password?: string;
    options?: {
      replicaSet?: string;
      dbName: string;
      authSource?: string;
      readPreference?: string;
      waitQueueTimeoutMS?: number;
      maxIdleTimeMS?: number;
    }
  };
  instrumentFn?: Function;
}
```

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| throwIfNotConnected | () => Promise<boolean> | Check connection status |
| closeDb | () => Promise<void> | Close database connection |
| CreateIndexes | (params) => IndexCreator | Get index creation helper |
| Collection | (collectionName: string) => CollectionWrapper | Get collection wrapper |

---

## Redis Client (`@verifiedfan/redis`)

Factory function that creates a Redis client with automatic reconnection.

**Constructor Parameters:**
```typescript
{
  url: string;
  readOnlyUrl?: string;
  socket?: SocketOptions;
  username?: string;
  password?: string;
  name?: string;
  database?: string;
}
```

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| get | ({ key, usePrimary? }) => Promise<any> | Get value by key |
| mget | ({ keys, usePrimary? }) => Promise<any[]> | Get multiple values |
| set | ({ key, value, ttl, newOnly? }) => Promise<string \| null> | Set value with TTL |
| delete | ({ key }) => Promise<number> | Delete key |
| quit | () => Promise<void> | Close connections |
| on | (eventType, listener) => void | Add event listener |

---

## Request Client (`@verifiedfan/request`)

HTTP request function with automatic retry for 5xx errors.

**Function Signature:**
```typescript
request({
  serviceName: string;
  baseUrl: string;
  endpoint?: string;
  accessPath?: string;
  method?: string;
  headers?: object;
  json?: boolean;
  jwt?: string;
  correlation?: object;
  resolveWithFullResponse?: boolean;
  [key: string]: any;
}) => Promise<Response>
```

**Exports:**

| Export | Type | Description |
|--------|------|-------------|
| default | Function | Main request function with retry |
| RequestWithJWT | Function | Request with JWT token |
| generateSignedRequest | Function | Generate signed request |
| TitanRequest | Class | Titan-specific request wrapper |

---

## JWT Utilities (`@verifiedfan/jwt`)

JWT token creation and verification.

**Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| MakeToken | (payload, options) => string | Generate JWT token (user service) |
| ReadToken | (token) => object | Read/decode JWT token |
| SignPayload | (payload, secret) => string | Sign payload with secret |
| Verify | (token, secret) => object | Verify and decode token |

**WorkerAuth Namespace:**

Worker-specific authentication utilities.

---

## Logging (`@verifiedfan/log`)

Winston-based logging factory with configurable transports.

**Factory Function:**
```typescript
Log({
  level?: string;          // Default: 'info'
  depth?: number;          // Default: 8
  secretKeys?: string[];   // Default: ['password', 'user_secret']
  file?: object;           // File transport config
  console?: object;        // Console transport config
  rootFieldsWhitelist?: string[];
}) => (context: string) => Logger
```

**Logger Methods:**

| Method | Signature | Description |
|--------|-----------|-------------|
| error | (message: string, fields?: object) => void | Log error |
| warn | (message: string, fields?: object) => void | Log warning |
| info | (message: string, fields?: object) => void | Log info |
| verbose | (message: string, fields?: object) => void | Log verbose |
| debug | (message: string, fields?: object) => void | Log debug |
| silly | (message: string, fields?: object) => void | Log silly |

---

## Crypto Utilities (`@verifiedfan/crypto`)

Cryptographic utility functions.

**Exports:**

| Function | Signature | Description |
|----------|-----------|-------------|
| simpleUniqueId | (length?: number) => string | Generate random hex ID (default 24 chars) |
| uuid | (options?: RandomUUIDOptions) => string | Generate UUID v4 |
| X509Certificate | (cert: string \| Buffer) => X509Certificate | Create X509 certificate object |

---

## Date Utilities (`@verifiedfan/date`)

Date and time manipulation functions.

**Exports:**

| Function | Signature | Description |
|----------|-----------|-------------|
| now | () => number | Current time in milliseconds |
| parse | (dateStr: string) => number | Parse date string to milliseconds |
| toSeconds | (time?: Date) => number | Convert to seconds |
| toSecondsFromMillis | (epochMillis: number) => number | Convert milliseconds to seconds |
| toHours | (seconds: number) => number | Convert seconds to hours |
| toMilliseconds | (date: number) => number | Convert seconds to milliseconds |
| toISOString | (epochMilliseconds?: number) => string | Convert to ISO string |
| yesterday | () => number | Yesterday timestamp |
| tomorrow | () => number | Tomorrow timestamp |
| millisElapsedSince | (start: Date) => number | Milliseconds elapsed since date |
| IsWithinTTL | (ttl: number) => (date: Date) => boolean | Check if within TTL |
| IsNotWithinTTL | (ttl: number) => (date: Date) => boolean | Check if not within TTL |
| timeInMilliseconds | object | Time constants (SECOND, MINUTE, HOUR, DAY, etc.) |
| timeInSeconds | object | Time constants in seconds |

---

## Normalizers (`@verifiedfan/normalizers`)

Data normalization and sanitization functions.

**Exports:**

| Function | Signature | Description |
|----------|-----------|-------------|
| email | (email: string) => string | Normalize email (lowercase, trim) |
| phone | (phone: string) => string \| null | Normalize phone number |
| zip | (zip: string) => string \| null | Extract 5-digit zip code |
| titleCase | (str: string) => string | Convert to title case |
| lowerCase | (str: string) => string | Convert to lowercase |
| upperCase | (str: string) => string | Convert to uppercase |
| nameSafe | (str: string) => string \| null | Make string name-safe |
| singleSpaces | (str: string) => string | Replace multiple spaces with single space |
| namePart | (str: string) => string \| null | Normalize name part (first/last) |
| name | (str: string) => string \| null | Normalize full name |
| nameObj | (first: string, last?: string, includeLowerCase?: boolean) => NameObject | Create name object |
| splitNameParts | (fullStr: string) => string[] \| null | Split full name into parts |
| boolean | (val: any) => boolean \| null | Normalize to boolean |
| isFalsey | (val: any) => boolean | Check if falsey |
| isUrlSafe | (input: string) => boolean | Check if URL-safe |
| urlSafe | (input: string) => string | Make string URL-safe |
| trimStr | (str: string) => string | Trim string |
| userAgent | object | User agent normalization utilities |

---

## Middlewares (`@verifiedfan/middlewares`)

Express/Fastify middleware collection.

**Exports:**

| Middleware | Type | Description |
|------------|------|-------------|
| Jwt | Function | JWT validation middleware |
| JwtLazy | Function | Lazy JWT validation middleware |
| Correlation | Function | Request correlation middleware |
| context | Function | Context middleware |
| path | Function | Path middleware |
| AccessLog | Function | Access logging middleware |
| requestCounter | Function | Request counter middleware |
| fastly | Function | Fastly context middleware |
| makeRequestMiddleware | Function | Request middleware factory |
| ResponseFormatter | Function | Response formatting middleware |
| ErrorFormatter | Function | Error formatting middleware |
| TitanAccessLog | Function | Titan access log middleware |

---

## Tracing (`@verifiedfan/tracing`)

OpenTelemetry tracing support.

**Factory Function:**
```typescript
GlobalTracer({
  tracerName: string;
  serviceName: string;
  serviceNamespace: string;
  productGroup: string;
  productCode: string;
  env: string;
  region: string;
  collectorHost: string;
  collectorPort: number;
}) => Tracer
```

**Exports:**

| Export | Type | Description |
|--------|------|-------------|
| GlobalTracer | Function | Create global tracer |
| TracedAsyncFn | Function | Wrap async function with tracing |
| TracedRequest | Function | Traced HTTP request |
| TracedSdk | Class | Traced SDK wrapper |
| traceUtils | Namespace | Tracing utilities |

---

## Test Utilities (`@verifiedfan/test-utils`)

Testing helper functions for generating test data and lambda inputs.

**Exports:**

| Function | Description |
|----------|-------------|
| request | Make test request |
| requestWithJWT | Make test request with JWT |
| generateEmail | Generate random test email |
| generatePhone | Generate random test phone |
| getRandomInt | Get random integer |
| getRandomFloat | Get random float |
| getRandomBoolean | Get random boolean |
| generateMongoObjectIdAsString | Generate MongoDB ObjectId string |
| generateMemberId | Generate member ID |
| generateGlobalUserId | Generate global user ID |
| getInvalidEmail | Get invalid email for testing |
| getRandomPurchaseCode | Get random purchase code |
| getRandomExecutionTime | Get random execution time |
| prefixStrForTest | Prefix string for test |
| makeKinesisInput | Create Kinesis lambda input |
| MakeDynamoDBStreamInput | Create DynamoDB stream input |
| makeSqsInput | Create SQS lambda input |
| makeFirehoseInput | Create Firehose lambda input |
| generateCampaign | Generate test campaign |
| generateCode | Generate test code |
| generateCodes | Generate multiple test codes |
| generateFanlistCampaign | Generate fanlist campaign |
| generateEntry | Generate test entry |
| generateEvent | Generate test event |
| generateEvents | Generate multiple test events |
| generateFaqs | Generate test FAQs |
| generateMarket | Generate test market |
| generateMarkets | Generate multiple test markets |
| generateScoring | Generate test scoring |
| generateScorings | Generate multiple test scorings |
| generatePromoter | Generate test promoter |
| generatePromoters | Generate multiple test promoters |
| generateToken | Generate test token |
| generateUser | Generate test user |
| makeContactObj | Create test contact object |
| fbTestUtils | Facebook test utilities |

---

## Additional Packages

| Package | Description |
|---------|-------------|
| @verifiedfan/access-log | Access log formatting |
| @verifiedfan/apple-music | Apple Music API client |
| @verifiedfan/avro | Avro schema utilities |
| @verifiedfan/batch-fn | Batch function execution |
| @verifiedfan/batch-transform-stream | Batch transform stream |
| @verifiedfan/bitly | Bitly URL shortener client |
| @verifiedfan/cloudwatch-stdout | CloudWatch stdout integration |
| @verifiedfan/configs | Configuration utilities |
| @verifiedfan/csv-write-stream | CSV writing stream |
| @verifiedfan/cucumber-features | Cucumber test features |
| @verifiedfan/delay | Delay/sleep utility |
| @verifiedfan/facebook | Facebook API client |
| @verifiedfan/flatten-transform-stream | Flatten transform stream |
| @verifiedfan/locale | Locale utilities |
| @verifiedfan/map-utils | Map/collection utilities |
| @verifiedfan/object-utils | Object manipulation utilities |
| @verifiedfan/pager-duty | PagerDuty integration |
| @verifiedfan/prometheus | Prometheus metrics |
| @verifiedfan/reduce-lines-from-stream | Stream line reducer |
| @verifiedfan/schemas | JSON schema definitions |
| @verifiedfan/sfmc | Salesforce Marketing Cloud client |
| @verifiedfan/slack | Slack API client |
| @verifiedfan/snowflake | Snowflake data warehouse client |
| @verifiedfan/spotify | Spotify API client |
| @verifiedfan/string-utils | String manipulation utilities |
| @verifiedfan/timer | Timer utilities |
| @verifiedfan/titan-request | Titan-specific request client |
| @verifiedfan/tm-accounts | Ticketmaster Accounts service |
| @verifiedfan/tm-discovery | Ticketmaster Discovery API |
| @verifiedfan/tm-orders | Ticketmaster Orders service |
| @verifiedfan/tm-pacman | Ticketmaster Pacman service |
| @verifiedfan/tm-sms | Ticketmaster SMS service |
| @verifiedfan/tm-users | Ticketmaster Users service |
| @verifiedfan/tm-wallet | Ticketmaster Wallet service |
| @verifiedfan/vf-error | VerifiedFan custom error class |
| @verifiedfan/yaml | YAML parsing utilities |
