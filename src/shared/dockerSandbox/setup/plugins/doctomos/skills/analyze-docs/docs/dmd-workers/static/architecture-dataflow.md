# Data Flow - dmd-workers

## Primary Flow

The demand-capture workers process demand-related events through an event-driven pipeline. Data flows through multiple AWS services and workers, with each worker performing a specific transformation or action:

```
External Events → AWS Event Sources → Lambda Workers → External Services → Storage/Queues
```

**Key Characteristics**:
- **Asynchronous**: Workers react to events, not synchronous requests
- **Event-driven**: Data flows through streams, queues, and scheduled triggers
- **Loosely coupled**: Workers communicate via AWS services, not direct calls
- **Scalable**: Each Lambda scales independently based on event volume

## Worker-Specific Data Flows

### 1. Demand Stream Processing Flow

**Worker**: `demandStreamToSqs`

**Trigger**: DynamoDB Stream (from demand table)

```
DynamoDB Table (demand-table)
    ↓ (stream of changes)
DynamoDB Kinesis Stream
    ↓ (change data capture)
demandStreamToSqs Worker
    ↓ (extract new items)
Transform: selectNewItems → dedupById → formatSQSRecord
    ↓ (batch write)
SQS Queue (shortUrlQueue)
    ↓ (consumed by next worker)
shortenEventUrl Worker
```

**Data Transformation**:
- **Input**: DynamoDB stream records with `newItem` and `oldItem`
- **Processing**: Extract `newItem`, deduplicate by ID, format as SQS message
- **Output**: SQS messages with `{ data: { id }, id }` structure

**Purpose**: Decouples demand table changes from URL shortening; enables retry and backpressure

---

### 2. URL Shortening Flow

**Worker**: `shortenEventUrl`

**Trigger**: SQS Queue (`shortUrlQueue`)

```
SQS Queue (shortUrlQueue)
    ↓ (messages with event IDs)
shortenEventUrl Worker
    ↓ (fetch event details)
Get Event from DynamoDB
    ↓ (extract event URL)
Bitly API (shorten URL)
    ↓ (shortened URL)
Update DynamoDB (store shortened URL)
```

**Data Transformation**:
- **Input**: SQS message `{ data: { id } }`
- **Processing**: Fetch event, call Bitly API, update event record
- **Output**: DynamoDB record updated with `shortUrl` field

**Purpose**: Generates short URLs for events to use in notifications

---

### 3. Notification Generation Flow

**Worker**: `notificationGenerator`

**Trigger**: CloudWatch Scheduled Event (cron-based)

```
CloudWatch Event (scheduled)
    ↓ (trigger with saleId/eventId)
notificationGenerator Worker
    ↓ (fetch message template)
DynamoDB Query (get sale and event details)
    ↓ (shorten event URL if needed)
Bitly API (via ShortenEventUrl utility)
    ↓ (generate notifications per recipient)
GenerateNotifications (create notification records)
    ↓ (batch write - 5000 per batch)
DynamoDB (demand-table) - write notification records
```

**Data Transformation**:
- **Input**: CloudWatch event `{ eventId, saleId }`
- **Processing**:
  1. Fetch message info (template, recipients)
  2. Shorten event URL
  3. Generate notification records (one per recipient)
  4. Batch write to DynamoDB
- **Output**: Multiple notification records in DynamoDB with status `pending`

**Purpose**: Creates notification records that will be sent via SMS/email

---

### 4. Notification Scheduling Flow

**Worker**: `notificationScheduler`

**Trigger**: CloudWatch Scheduled Event (periodic)

```
CloudWatch Event (scheduled)
    ↓ (periodic trigger)
notificationScheduler Worker
    ↓ (query pending notifications)
DynamoDB Scan/Query (find unsent notifications)
    ↓ (schedule for sending)
Update Notification Status (pending → scheduled)
    ↓ (trigger next step)
(Implicit: triggers notificationSend via DynamoDB stream)
```

**Data Transformation**:
- **Input**: CloudWatch scheduled event
- **Processing**: Query notifications ready to send, update status
- **Output**: Notification records with status updated

**Purpose**: Time-gates notification sending; enforces rate limits

---

### 5. Notification Sending Flow

**Worker**: `notificationSend`

**Trigger**: DynamoDB Kinesis Stream (from demand table, filtered for notifications)

```
DynamoDB Table (demand-table)
    ↓ (stream of notification record changes)
DynamoDB Kinesis Stream
    ↓ (filter for scheduled notifications)
notificationSend Worker
    ↓ (extract notification details)
Parse Notification (template, recipient, message)
    ↓ (send via SMS)
SMS Service API (send message)
    ↓ (record result)
Update DynamoDB (status: sent/failed, attempts)
```

**Data Transformation**:
- **Input**: DynamoDB stream record with notification data
- **Processing**:
  1. Extract template variables and recipient
  2. Render message body
  3. Call SMS service API
  4. Update notification status based on result
- **Output**: SMS sent, DynamoDB record updated with status and attempt count

**Purpose**: Delivers notifications to recipients via SMS

---

### 6. SMS Status Tracking Flow

**Worker**: `smsStatusConsumer`

**Trigger**: Kinesis Stream (from SMS service)

```
SMS Service
    ↓ (publishes status events)
Kinesis Stream (SMS status updates)
    ↓ (delivery status, errors)
smsStatusConsumer Worker
    ↓ (extract status)
Parse Status Event (delivered, failed, etc.)
    ↓ (update notification record)
DynamoDB Update (final status, delivery timestamp)
```

**Data Transformation**:
- **Input**: Kinesis record with SMS status `{ messageId, status, timestamp }`
- **Processing**: Parse status, correlate with notification record
- **Output**: DynamoDB notification record updated with delivery confirmation

**Purpose**: Tracks SMS delivery status; enables retry logic for failures

---

### 7. Account Service Proxy Flow

**Worker**: `proxyTmAccountService`

**Trigger**: AppSync GraphQL Query

```
AppSync GraphQL API
    ↓ (query for account info)
proxyTmAccountService Worker
    ↓ (authenticate and call TM API)
TM Accounts API (ACOE)
    ↓ (account data)
Transform Response (normalize format)
    ↓ (return to GraphQL)
AppSync Response
```

**Data Transformation**:
- **Input**: AppSync GraphQL query with account parameters
- **Processing**: Authenticate, call TM Accounts API, transform response
- **Output**: Normalized account data returned to GraphQL client

**Purpose**: Proxies TM Account Service calls; adds authentication and caching

---

### 8. Event Details Retrieval Flow

**Worker**: `eventDetails`

**Trigger**: AppSync GraphQL Query

```
AppSync GraphQL API
    ↓ (query for event details)
eventDetails Worker
    ↓ (check cache)
Redis (event cache)
    ↓ (cache miss)
TM Discovery API (fetch event details)
    ↓ (store in cache)
Redis (cache event for 24h)
    ↓ (return to GraphQL)
AppSync Response
```

**Data Transformation**:
- **Input**: AppSync query `{ eventId }`
- **Processing**:
  1. Check Redis cache
  2. If miss, call TM Discovery API
  3. Cache result in Redis (TTL: 24 hours)
  4. Return event details
- **Output**: Event details (name, date, venue, etc.)

**Purpose**: Provides cached event details for notifications and UI

---

## Event Processing Cycle

All stream/queue-based workers follow this generalized flow:

```
1. AWS Event Source
   ↓
2. Lambda Invocation (shared/entryFiles/lambda.js)
   ↓
3. App Resolution (resolve APP_NAME → worker module)
   ↓
4. Middleware Pipeline:
   - Correlation ID generation
   - OpenTelemetry tracing
   - Event transformation (decode, normalize)
   - Service injection
   - Record correlation
   ↓
5. Worker Business Logic (apps/*/index.js)
   ↓
6. Result Handling:
   - Batch item results (for streams/queues)
   - Standard results (for AppSync/scheduled)
   - Firehose results (if applicable)
   ↓
7. Lambda Response (success/partial failure/error)
```

## State Management

### DynamoDB as State Store

**Table**: `prd3292-<env>-us-east-1-demand-table`

**Records Stored**:
- **Demand records**: Sale and event associations
- **Notification records**: Individual notification items with status tracking
- **Event metadata**: Cached event details

**Status Transitions**:
```
Notification Lifecycle:
  (not created) → pending → scheduled → sent → delivered
                     ↓
                   failed (with retry count)
```

### Redis as Cache

**Purpose**: Event details caching

**TTL**: 24 hours (configurable)

**Keys**: Event IDs

**Values**: Full event details from TM Discovery API

---

### MongoDB as Campaign Store

**Database**: `campaigns`

**Purpose**: Campaign configuration and audience segmentation (used by notification workers)

**Collections**: (Inferred from `shared/services/mongo/campaigns.ts`)

---

## External Integrations

| Integration | Direction | Purpose | Workers Using It |
|-------------|-----------|---------|------------------|
| **DynamoDB** | Read/Write | Demand and notification storage | All workers |
| **Kinesis** | Read | SMS status updates | `smsStatusConsumer` |
| **DynamoDB Streams** | Read | Change data capture | `notificationSend`, `demandStreamToSqs` |
| **SQS** | Write → Read | URL shortening queue | `demandStreamToSqs` → `shortenEventUrl` |
| **Bitly API** | Write | URL shortening | `shortenEventUrl`, `notificationGenerator` |
| **SMS Service API** | Write | Send SMS notifications | `notificationSend` |
| **TM Accounts API (ACOE)** | Read | Account details lookup | `proxyTmAccountService` |
| **TM Discovery API** | Read | Event details lookup | `eventDetails` |
| **Redis** | Read/Write | Event detail caching | `eventDetails` |
| **MongoDB** | Read | Campaign configuration | `notificationGenerator` (inferred) |
| **AppSync** | Respond | GraphQL API | `proxyTmAccountService`, `eventDetails` |
| **CloudWatch** | Triggered by | Scheduled events | `notificationScheduler`, `notificationGenerator` |
| **OpenTelemetry Collector** | Write | Distributed tracing | All workers (via telemetry middleware) |

---

## Data Flow Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         External Event Sources                          │
├──────────────────────┬──────────────────────┬──────────────────────────┤
│  DynamoDB Streams    │  SQS Queues          │  CloudWatch Events       │
│  (Change Capture)    │  (Async Processing)  │  (Scheduled Triggers)    │
└──────────┬───────────┴──────────┬───────────┴──────────┬───────────────┘
           │                      │                      │
           ▼                      ▼                      ▼
  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
  │ notification   │    │ shortenEventUrl│    │ notification   │
  │ Send           │    │                │    │ Scheduler      │
  └────────┬───────┘    └────────┬───────┘    └────────┬───────┘
           │                      │                      │
           │ (send SMS)           │ (shorten URL)        │ (schedule)
           │                      │                      │
           ▼                      ▼                      ▼
  ┌────────────────────────────────────────────────────────────┐
  │                   External Services                        │
  ├────────────────────┬───────────────────┬───────────────────┤
  │  SMS Service       │  Bitly API        │  DynamoDB         │
  └────────────────────┴───────────────────┴───────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         AppSync GraphQL Layer                           │
├──────────────────────┬──────────────────────────────────────────────────┤
│  proxyTmAccount      │  eventDetails                                    │
│  Service             │                                                  │
└──────────┬───────────┴──────────┬───────────────────────────────────────┘
           │                      │
           │ (proxy request)      │ (fetch + cache)
           │                      │
           ▼                      ▼
  ┌────────────────┐    ┌────────────────────────┐
  │ TM Accounts    │    │ Redis + TM Discovery   │
  │ API (ACOE)     │    │ API                    │
  └────────────────┘    └────────────────────────┘
```

---

## Critical Data Paths

### High-Volume Path: Demand Changes → Notifications

1. **Demand record created/updated** in DynamoDB
2. **DynamoDB Stream** captures change
3. **demandStreamToSqs** worker extracts new items
4. **SQS queue** buffers URL shortening requests
5. **shortenEventUrl** worker processes URLs (if not cached)
6. **Bitly API** generates short URL
7. **DynamoDB** updated with short URL
8. **notificationGenerator** (scheduled) creates notification records
9. **DynamoDB Stream** captures new notifications
10. **notificationSend** worker sends SMS
11. **SMS Service** delivers message
12. **Kinesis Stream** receives delivery status
13. **smsStatusConsumer** updates final status

**Latency**: Asynchronous; notification delivery within seconds to minutes of demand creation

**Throughput**: Batch processing supports thousands of notifications per run

---

### Low-Latency Path: AppSync Queries

1. **AppSync GraphQL query** received
2. **Lambda worker** invoked synchronously (AppSync resolver)
3. **Redis cache check** (for `eventDetails`) or **TM API call** (for `proxyTmAccountService`)
4. **Response returned** to GraphQL client

**Latency**: Sub-second for cached responses; 1-2 seconds for API calls

**Throughput**: Limited by Lambda concurrency and external API rate limits

---

## Error Handling and Retry

### Stream Processing Errors
- **Behavior**: Lambda returns partial batch item failures
- **Retry**: Failed records reprocessed by AWS (Kinesis/DynamoDB Streams)
- **DLQ**: Not configured (improvement opportunity)

### Queue Processing Errors
- **Behavior**: SQS visibility timeout
- **Retry**: Configurable retry count (e.g., `shortenEventUrl` has `maxRetryCount: 2`)
- **DLQ**: Should be configured for expired messages

### Scheduled Worker Errors
- **Behavior**: CloudWatch logs error; next scheduled run occurs normally
- **Retry**: None (idempotent design required)
- **Monitoring**: CloudWatch alarms on error logs

### AppSync Resolver Errors
- **Behavior**: Error returned to GraphQL client
- **Retry**: Client-side responsibility
- **Fallback**: No built-in fallback (improvement opportunity)

---

## Observability

### Tracing
- **OpenTelemetry** spans created by `telemetry.ts` middleware
- **Collector**: `otel.nonprod.use1.nonprod-tmaws.io:4318`
- **Service Name**: `vf.dmnd.workers`
- **Span Context**: Propagated through correlation IDs

### Logging
- **CloudWatch Logs**: All Lambda output
- **Structured Logging**: JSON logs via `shared/Log.js`
- **Correlation IDs**: Included in all log entries

### Metrics
- **Lambda Metrics**: Duration, errors, throttles (CloudWatch automatic)
- **Custom Metrics**: Not currently implemented (improvement opportunity)

---

## Scalability Considerations

### Bottlenecks

1. **DynamoDB Throughput**: Demand table supports streams; may require provisioned capacity for high volume
2. **Bitly API Rate Limits**: URL shortening is rate-limited by Bitly; consider caching or alternative service
3. **SMS Service Throughput**: SMS delivery rate-limited; `notificationSend` uses `maxSendAttempts: 3`
4. **Lambda Concurrency**: Each worker has reserved concurrency limits (configured in Terraform)

### Scaling Strategy

- **Horizontal**: Lambda auto-scales with event volume
- **Batch Processing**: Workers use batch processing to maximize throughput
- **Caching**: Redis caches event details to reduce Discovery API calls
- **Async Decoupling**: SQS queue decouples demand changes from URL shortening
