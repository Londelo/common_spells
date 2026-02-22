# Data Flow - vf-lib

## Primary Flow

**Library Consumption Flow**: This is NOT a service with request/response cycles. Instead, it's a collection of libraries consumed by other VerifiedFan applications.

```
Consumer Application
    ↓
Imports @verifiedfan/<package>
    ↓
Library provides functionality
    ↓
(May make external API calls, database queries, etc.)
    ↓
Returns data to consumer
```

## Package Data Flow Patterns

### 1. API Client Pattern (Spotify, Apple Music, Bitly, Facebook, TM Services)

**Flow**: Consumer → Factory → Request Wrapper → External API → Response Normalization → Consumer

```
Application Code
    ↓
Import & Initialize Client
const spotify = Spotify({ version, appId, appSecret })
    ↓
Call Method
const user = await spotify.getUser({ accessToken })
    ↓
[LIBRARY INTERNAL]
    ├── Request Module (packages/request)
    │   ├── Normalize parameters
    │   ├── Add auth headers
    │   ├── Add correlation IDs
    │   └── Retry logic (3 attempts, exponential backoff)
    ↓
External API Call (e.g., Spotify API)
    ↓
[LIBRARY INTERNAL]
    ├── Response received
    ├── Apply normalizers (if configured)
    └── Log success/failure
    ↓
Return data to application
```

**Example Packages**:
- `@verifiedfan/spotify`: Spotify Web API
- `@verifiedfan/apple-music`: Apple Music API
- `@verifiedfan/bitly`: Bitly URL shortening
- `@verifiedfan/tm-accounts`: Ticketmaster Accounts API
- `@verifiedfan/tm-discovery`: Ticketmaster Discovery API
- `@verifiedfan/tm-orders`: Ticketmaster Orders API
- `@verifiedfan/tm-users`: Ticketmaster Users API
- `@verifiedfan/tm-wallet`: Ticketmaster Wallet API

### 2. AWS Service Client Pattern

**Flow**: Consumer → AWS Client Wrapper → AWS SDK → AWS Service

```
Application Code
    ↓
Import AWS Client
import { S3, DynamoDB, Lambda } from '@verifiedfan/aws'
    ↓
Call AWS Operation
const result = await S3.getObject({ Bucket, Key })
    ↓
[LIBRARY INTERNAL]
    ├── AWS Client Wrapper
    │   ├── Configure AWS SDK
    │   ├── Handle credentials
    │   └── Add tracing spans (if configured)
    ↓
AWS SDK Call
    ↓
AWS Service (S3, DynamoDB, Lambda, SQS, SNS, Kinesis, Firehose, etc.)
    ↓
Response → Application
```

**Sub-modules in aws package**:
- S3: Object storage operations
- DynamoDB: NoSQL database operations
- Lambda: Function invocations
- SQS: Queue operations
- SNS: Notification publishing
- Kinesis: Stream operations
- Firehose: Data delivery
- StepFunctions: Workflow orchestration
- CloudWatch: Logging/metrics
- Athena: SQL queries
- SecretsManager: Secret retrieval

### 3. Stream Processing Pattern

**Flow**: Input Stream → Transform → Output Stream

```
Input Data Stream
    ↓
Import Transform Stream
import FlattenTransformStream from '@verifiedfan/flatten-transform-stream'
    ↓
Pipe through transform
inputStream.pipe(new FlattenTransformStream()).pipe(outputStream)
    ↓
[LIBRARY INTERNAL]
    ├── Read chunks from input
    ├── Apply transformation logic
    │   └── (flatten arrays, batch records, reduce lines, etc.)
    ├── Write transformed chunks to output
    └── Handle backpressure
    ↓
Output Data Stream
```

**Stream Packages**:
- `flatten-transform-stream`: Flattens nested arrays in stream
- `batch-transform-stream`: Batches stream items
- `reduce-lines-from-stream`: Reduces line-by-line processing
- `csv-write-stream`: Writes CSV formatted output

### 4. Authentication/Authorization Flow (JWT)

**Flow**: Token Generation → Signing → Verification → Permission Check

```
Service A (Token Issuer)
    ↓
Import JWT utilities
import JWT from '@verifiedfan/jwt'
    ↓
Generate Token
const token = JWT.MakeToken({ userId, permissions, expiresIn })
    ↓
[LIBRARY INTERNAL]
    ├── Build payload with claims
    ├── Sign with secret key (jsonwebtoken)
    └── Return signed JWT
    ↓
Send token to client
    ↓
──────────────────────────────────────────
    ↓
Service B (Token Consumer)
    ↓
Receive token from request
    ↓
Verify Token
const decoded = JWT.Verify({ token, secret })
    ↓
[LIBRARY INTERNAL]
    ├── Verify signature
    ├── Check expiration
    ├── Validate claims
    └── Return decoded payload
    ↓
Check Permissions
const authorized = decoded.permissions.includes('read:campaigns')
    ↓
Grant/Deny Access
```

**Sub-modules**:
- `jwt.js`: Token signing and verification
- `permissions.js`: MakeToken and ReadToken helpers
- `workerAuth/`: Worker-to-worker authentication

### 5. Tracing Flow (OpenTelemetry)

**Flow**: Initialize Global Tracer → Instrument Code → Spans Exported

```
Application Startup
    ↓
Import Tracing
import { GlobalTracer, TracedAsyncFn } from '@verifiedfan/tracing'
    ↓
Initialize Global Tracer (once per process)
GlobalTracer({
  tracerName: 'my-service',
  serviceName: 'verified-fan-api',
  collectorHost: 'otel-collector.local',
  collectorPort: 4318
})
    ↓
[LIBRARY INTERNAL]
    ├── Create NodeTracerProvider
    ├── Configure OTLP HTTP Exporter
    ├── Register BatchSpanProcessor
    └── Store in global.nodeTraceProvider (singleton)
    ↓
Application Code
    ↓
Wrap Async Functions
const tracedFn = TracedAsyncFn({
  tracer,
  spanName: 'fetchUserData',
  fn: async () => { ... }
})
    ↓
Execute Function
await tracedFn()
    ↓
[LIBRARY INTERNAL]
    ├── Start span with context
    ├── Execute function
    ├── Capture errors if thrown
    ├── End span
    └── Send to OTLP collector
    ↓
OpenTelemetry Collector
    ↓
Observability Backend (Splunk, Datadog, etc.)
```

**Tracing Utilities**:
- `GlobalTracer`: Initialize once per process
- `TracedAsyncFn`: Wrap async functions with automatic span creation
- `TracedRequest`: Wrap HTTP requests with tracing
- `TracedSdk`: Wrap SDK calls with spans

### 6. Logging Flow

**Flow**: Application Code → Logger → Structured Output → CloudWatch/Stdout

```
Application Code
    ↓
Import Logger
import log from '@verifiedfan/log'
    ↓
Log Message
log.info('User logged in', { userId, timestamp })
    ↓
[LIBRARY INTERNAL]
    ├── Winston logger instance
    ├── Attach metadata (correlation IDs, service name)
    ├── Format as JSON (structured logging)
    └── Write to stdout
    ↓
Container/Lambda Environment
    ↓
CloudWatch Logs (via stdout capture)
```

**Related Packages**:
- `@verifiedfan/log`: Winston-based structured logging
- `@verifiedfan/access-log`: Fastly access log formatting
- `@verifiedfan/cloudwatch-stdout`: CloudWatch stdout utilities

### 7. Test Data Generation Flow

**Flow**: Test Setup → Generate Mock Data → Use in Tests

```
Test File
    ↓
Import Test Utils
import testUtils from '@verifiedfan/test-utils'
    ↓
Generate Test Data
const user = testUtils.generateUser()
const campaign = testUtils.generateCampaign()
const lambdaEvent = testUtils.makeDynamoDBStreamInput([...])
    ↓
[LIBRARY INTERNAL]
    ├── Generate random but valid data
    │   ├── generateEmail()
    │   ├── generatePhone()
    │   ├── generateMongoObjectIdAsString()
    │   └── getRandomInt()
    ├── Build complex objects (campaigns, events, users)
    └── Format as AWS Lambda event structures
    ↓
Return test data
    ↓
Use in assertions
expect(processUser(user)).toBeTruthy()
```

**Test Utilities**:
- Generators: `generateUser`, `generateCampaign`, `generateEntry`, `generateEvent`, etc.
- Lambda Inputs: `makeDynamoDBStreamInput`, `makeSqsInput`, `makeKinesisInput`, `makeFirehoseInput`
- HTTP: `request`, `requestWithJWT` for testing HTTP endpoints

## State Management

**This library collection does NOT manage application state**. Each package is stateless except for:

### Stateful Components

1. **Global Tracer Singleton** (`@verifiedfan/tracing`)
   - Stores OpenTelemetry provider in `global.nodeTraceProvider`
   - Initialized once per Node.js process
   - Ensures single tracer instance across all imports

2. **Connection Pools** (MongoDB, Redis, Kafka, AWS clients)
   - Packages may maintain connection pools internally
   - Consumer is responsible for initialization and cleanup
   - State is per-instance, not global

3. **Logger Instances** (`@verifiedfan/log`)
   - Winston logger instances may be cached
   - Configured once per application

## Event Processing

**This library does NOT process events itself**. However, it provides utilities for event-driven applications:

### Event Input Builders (Test Utils)

Packages provide functions to build AWS Lambda event structures:

```
Test Code
    ↓
Generate DynamoDB Stream Event
const event = MakeDynamoDBStreamInput([
  { eventName: 'INSERT', keys: { userId: '123' }, newImage: { ... } }
])
    ↓
[LIBRARY INTERNAL]
    ├── Build eventID, eventSourceARN
    ├── Format DynamoDB JSON (M, S, N types)
    ├── Wrap in Records array
    └── Return AWS Lambda event structure
    ↓
Pass to Lambda Handler
await handler(event, context)
```

**Supported Event Types**:
- **DynamoDB Streams**: `MakeDynamoDBStreamInput` (INSERT, MODIFY, REMOVE)
- **Kinesis**: `makeKinesisInput` (base64-encoded data records)
- **SQS**: `makeSqsInput` (message batches)
- **Firehose**: `makeFirehoseInput` (delivery stream records)

## External Integrations

### Third-Party APIs

| Package | Service | Direction | Purpose |
|---------|---------|-----------|---------|
| spotify | Spotify Web API | Read | Fetch user library, playlists, playback state |
| apple-music | Apple Music API | Read | Fetch catalog artists, albums, songs |
| bitly | Bitly API | Read/Write | Shorten URLs, retrieve link analytics |
| facebook | Facebook Graph API | Read | Fetch user profile, page data |
| kafka | Kafka Cluster | Read/Write | Produce/consume messages |
| mongodb | MongoDB | Read/Write | Document database operations |
| redis | Redis | Read/Write | Key-value caching and data structures |
| snowflake | Snowflake | Read | Data warehouse queries |

### Ticketmaster Internal APIs

| Package | Service | Direction | Purpose |
|---------|---------|-----------|---------|
| tm-accounts | TM Accounts Service | Read/Write | Manage Ticketmaster user accounts |
| tm-discovery | TM Discovery API | Read | Search events, venues, attractions |
| tm-orders | TM Orders Service | Read/Write | Retrieve and process ticket orders |
| tm-users | TM Users Service | Read/Write | User profile management |
| tm-wallet | TM Wallet Service | Read/Write | Manage user wallets and passes |
| tm-pacman | TM PACMAN Service | Write | Generate passwords (e.g., for Snowflake) |
| tm-sms | TM SMS Service | Write | Send SMS notifications |

### AWS Services

| Package | Service | Direction | Purpose |
|---------|---------|-----------|---------|
| aws/s3 | Amazon S3 | Read/Write | Object storage |
| aws/dynamodb | Amazon DynamoDB | Read/Write | NoSQL database |
| aws/lambda | AWS Lambda | Invoke | Trigger functions |
| aws/sqs | Amazon SQS | Read/Write | Message queuing |
| aws/sns | Amazon SNS | Write | Publish notifications |
| aws/kinesis | Amazon Kinesis | Write | Stream data ingestion |
| aws/firehose | Amazon Kinesis Firehose | Write | Stream data delivery to S3/Redshift |
| aws/stepfunctions | AWS Step Functions | Invoke | Orchestrate workflows |
| aws/cloudwatch | Amazon CloudWatch | Write | Logging and metrics |
| aws/athena | Amazon Athena | Read | Query S3 data with SQL |
| aws/secretsManager | AWS Secrets Manager | Read | Retrieve secrets |

### Observability & Alerting

| Package | Service | Direction | Purpose |
|---------|---------|-----------|---------|
| tracing | OTLP Collector | Write | Send OpenTelemetry spans |
| prometheus | Prometheus | Expose | Metrics scraping endpoint |
| pager-duty | PagerDuty API | Write | Send alerts and incidents |
| slack | Slack API | Write | Send messages to channels |
| sfmc | Salesforce Marketing Cloud | Write | Email campaign management |

## Request/Response Cycle

**For HTTP-based libraries** (API clients using `@verifiedfan/request`):

```
1. Consumer calls library method
   Example: spotify.getUser({ accessToken })

2. Library prepares request
   - Normalize parameters (baseUrl + endpoint)
   - Add authentication headers (Bearer token, API key, etc.)
   - Add correlation ID from context (if available)
   - Set JSON parsing, timeout, etc.

3. Execute request with retry logic
   - Initial attempt
   - If 5xx error → Retry (3 attempts, exponential backoff)
   - If 4xx error → Fail immediately (no retry)
   - If network error → Retry

4. Process response
   - Parse JSON (if json: true)
   - Apply normalizers (convert API format to internal format)
   - Log request/response details (debug level)

5. Return to consumer
   - Success: Return response body or full response object
   - Failure: Throw error with status code and message
```

**Correlation ID Propagation**:
- Request library accepts `correlation` parameter
- Adds correlation IDs as headers for tracing across services
- Used by VerifiedFan services for distributed tracing

## Data Persistence

**This library does NOT directly persist data**. However, it provides clients for data stores:

### Database Operations

**MongoDB** (`@verifiedfan/mongodb`):
```
Application → MongoDB Client Wrapper → MongoDB Driver → MongoDB Cluster
```

**DynamoDB** (`@verifiedfan/aws` → DynamoDB):
```
Application → DynamoDB Wrapper → AWS SDK → DynamoDB Service
```

**Redis** (`@verifiedfan/redis`):
```
Application → Redis Client Wrapper → Redis Driver → Redis Cluster
```

**Snowflake** (`@verifiedfan/snowflake`):
```
Application → Snowflake Client → Snowflake Driver → Snowflake Warehouse
```

### Consumer Responsibility

- **Connection Management**: Consumer must initialize clients with credentials
- **Connection Pooling**: Consumers should reuse client instances
- **Error Handling**: Consumers must handle database errors (timeouts, retries, etc.)
- **Data Modeling**: Libraries provide low-level operations; consumers define schemas

## Batch Processing Flow

**For batch/stream utilities**:

```
Large Dataset (CSV, JSON lines, etc.)
    ↓
Read as Stream
const inputStream = fs.createReadStream('data.csv')
    ↓
Apply Batch Transform
const batchStream = new BatchTransformStream({ batchSize: 100 })
inputStream.pipe(batchStream)
    ↓
[LIBRARY INTERNAL]
    ├── Buffer records until batch size reached
    ├── Emit batch as array
    └── Continue reading
    ↓
Process Batch
batchStream.on('data', async (batch) => {
  await processBatch(batch)
})
    ↓
Write Output (optional)
batchStream.pipe(outputStream)
```

**Benefits**:
- Memory-efficient processing of large files
- Backpressure handling (pause/resume streams)
- Error isolation (batch-level error handling)
