# Type Usage Patterns - dmd-workers

## Overview

This document captures implicit types from function signatures, parameter destructuring, and actual usage patterns in the codebase. These types are inferred from implementation code and provide concrete examples of how data flows through the system.

---

## Worker Function Signatures

### notificationSend
**Confidence:** 95% High

```javascript
const notificationSend = async({
  input,
  Services: { sms, aws: { demandTable } },
  correlation
}) => { /* ... */ }
```

**Source:** [notificationSend](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationSend/index.js:13)

**Parameter Shape:**
- `input` (Array, required) - Array of DynamoDB stream records
  - `input[].data.newItem` (object) - New notification item from DynamoDB
    - `PK` (string) - Partition key: `fan:{fanId}`
    - `SK` (string) - Sort key: `notification#{eventId}-{saleId}#{contactMethod}`
    - `phoneNumber` (string) - Fan's phone number
    - `messageBody` (string) - SMS message text
    - `status` (object) - Status object
    - `sendAttempts` (number) - Number of send attempts
- `Services.sms` (object, required) - SMS service client
- `Services.aws.demandTable` (DynamoDB, required) - DynamoDB client
- `correlation` (object, required) - Correlation IDs

**Return Type:** Promise<{ count: { in: number } }>

**Confidence Note:** Explicit TypeScript Worker type combined with JavaScript implementation

**Called By:**
- Lambda handler (via middleware chain)
- Triggered by DynamoDB stream events

**Calls:**
- [SendMessage](#sendmessage) - Sends SMS for each notification
- [UpdateNotificationRecords](#updatenotificationrecords) - Updates status in DynamoDB

---

### demandStreamToSqs
**Confidence:** 95% High

```javascript
const demandStreamToSqs = ({
  input,
  Services: { aws: { shortUrlQueue } },
  correlation
}) => { /* ... */ }
```

**Source:** [demandStreamToSqs](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/demandStreamToSqs/index.js:66)

**Parameter Shape:**
- `input` (Array, required) - Array of DynamoDB stream records
  - `input[].data.newItem` (object) - New demand item
    - `id` (string) - Demand record ID
- `Services.aws.shortUrlQueue` (SQS, required) - SQS client for short URL queue
- `correlation` (object, required) - Correlation IDs

**Return Type:** Promise<{ in: number, out: number, failed: number }>

**Confidence Note:** Explicit parameter destructuring with usage patterns

**Called By:**
- Lambda handler (via middleware chain)
- Triggered by DynamoDB stream for demand table

**Calls:**
- `formatRecordsForSqs` - Formats records for SQS
- `BatchWriteSqsRecords` - Writes records to SQS in batches

---

### notificationScheduler
**Confidence:** 95% High

```javascript
const notificationScheduler = ({
  Services: { aws: { demandTable }, discovery },
  input: {
    event: {
      schedule = makeSchedule()
    }
  },
  correlation
}) => { /* ... */ }
```

**Source:** [notificationScheduler](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationScheduler/index.js:97)

**Parameter Shape:**
- `Services.aws.demandTable` (DynamoDB, required) - DynamoDB client
- `Services.discovery` (object, required) - Discovery API service
- `input.event.schedule` (object, optional) - Schedule configuration
  - `startDateTime` (string, ISO format) - Start of time window
  - `endDateTime` (string, ISO format) - End of time window
  - Defaults to next 30-minute window via `makeSchedule()`
- `correlation` (object, required) - Correlation IDs

**Return Type:** Promise<Array<{ saleId: string, eventId: string }>> | Promise<void>

**Confidence Note:** Explicit parameter destructuring with default values

**Called By:**
- Lambda handler (via middleware chain)
- Triggered by CloudWatch Events (scheduled)

**Calls:**
- [QueryCachedSalesByTimeRange](#querycachedsalesbytimerange) - Queries sales by time
- [ProcessScheduledSales](#processscheduledsales) - Processes and enriches sales

---

### eventDetails
**Confidence:** 95% High

```javascript
const eventDetails = async({
  input,
  Services: { aws: { demandTable }, discovery },
  correlation
}) => { /* ... */ }
```

**Source:** [eventDetails](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/eventDetails/index.js:26)

**Parameter Shape:**
- `input` (object, required) - AppSync resolver input
  - `arguments.eventId` (string) - Ticketmaster event ID
  - `arguments.tmMarketId` (string, optional) - Market ID (default: 'TM_US')
- `Services.aws.demandTable` (DynamoDB, required) - DynamoDB client
- `Services.discovery` (object, required) - Discovery API service
- `correlation` (object, required) - Correlation IDs

**Return Type:** Promise<EventDetails>
- `eventId` (string)
- `eventName` (string)
- `venueName` (string)
- `venueCity` (string)
- `sales` (Array) - Array of sale objects

**Confidence Note:** Explicit TypeScript types plus Ramda function composition

**Called By:**
- AppSync resolver (via middleware chain)
- GraphQL query: `eventDetails(eventId: ID!, tmMarketId: String)`

**Calls:**
- [GetAndCacheEventDetails](#getandcacheeventdetails) - Fetches and caches event data
- `formatAppSyncEventDetails` - Formats for AppSync response

---

## Utility Function Signatures

### SendMessage
**Confidence:** 90% Medium-High

```javascript
const SendMessage = ({ sms, correlation }) => async notification => { /* ... */ }
```

**Source:** [SendMessage](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationSend/SendMessage.js)

**Parameter Shape:**
- `sms` (object, required) - SMS service client
  - `sms.send` (function) - Send SMS function
- `correlation` (object, required) - Correlation IDs

**Returns:** Function that accepts:
- `notification` (object, required)
  - `phoneNumber` (string) - Recipient phone number
  - `messageBody` (string) - SMS message text
  - `PK` (string) - DynamoDB partition key
  - `SK` (string) - DynamoDB sort key

**Return Type:** Promise<object> - Notification with updated status

**Confidence Note:** Function signature inferred from implementation

**Called By:**
- [notificationSend](#notificationsend)

**Calls:**
- `sms.send()` - External SMS service

---

### UpdateNotificationRecords
**Confidence:** 90% Medium-High

```javascript
const UpdateNotificationRecords = ({ demandTable, correlation }) => async notifications => { /* ... */ }
```

**Source:** [UpdateNotificationRecords](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationSend/UpdateNotificationRecords.js)

**Parameter Shape:**
- `demandTable` (DynamoDB, required) - DynamoDB client
- `correlation` (object, required) - Correlation IDs

**Returns:** Function that accepts:
- `notifications` (Array, required) - Array of notification objects

**Return Type:** Promise<Array> - Updated notifications

**Confidence Note:** Function signature inferred from implementation

**Called By:**
- [notificationSend](#notificationsend)

**Calls:**
- `demandTable.batchWrite()` - Batch update to DynamoDB

---

### GenerateNotifications
**Confidence:** 90% Medium-High

```javascript
const GenerateNotifications = ({ demandTable }) => messageInfo => { /* ... */ }
```

**Source:** [GenerateNotifications](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationGenerator/GenerateNotifications.js:120)

**Parameter Shape:**
- `demandTable` (DynamoDB, required) - DynamoDB client

**Returns:** Function that accepts:
- `messageInfo` (object, required)
  - `saleId` (string) - Sale ID
  - `eventId` (string) - Event ID
  - `saleName` (string) - Sale name
  - `artist` (string) - Artist name
  - `url` (string) - Event URL
  - `venueName` (string) - Venue name
  - `venueCity` (string) - Venue city
  - `venueStateCode` (string) - Venue state code
  - `saleStartDateTime` (string, ISO format) - Sale start time
  - `eventStartDateTime` (string, ISO format) - Event start time

**Return Type:** Promise<Array> - Array of generated notification records

**Confidence Note:** Function signature inferred from applySpec usage

**Called By:**
- `notificationGenerator` worker

**Calls:**
- [GetDemandRecords](#getdemandrecords) - Fetches demand records for sale
- `generateSms` - Generates SMS notification
- `generateEmail` - Generates email notification

---

### GetAndCacheEventDetails
**Confidence:** 90% Medium-High

```javascript
const GetAndCacheEventDetails = ({
  correlation,
  discovery,
  demandTable
}) => async({ eventId, countryCode = 'US' }) => { /* ... */ }
```

**Source:** [GetAndCacheEventDetails](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/GetAndCacheEventDetails/index.js)

**Parameter Shape:**
- `correlation` (object, required) - Correlation IDs
- `discovery` (object, required) - Discovery API service
- `demandTable` (DynamoDB, required) - DynamoDB client

**Returns:** Function that accepts:
- `eventId` (string, required) - Ticketmaster event ID
- `countryCode` (string, optional) - Country code (default: 'US')

**Return Type:** Promise<object>
- `eventId` (string)
- `eventName` (string)
- `artist` (string)
- `venueName` (string)
- `venueCity` (string)
- `venueStateCode` (string)
- `eventStartDateTime` (string, ISO format)
- `sales` (Array)
- `url` (string)
- `error` (Error, optional) - If fetch failed
- `isSuppressed` (boolean, optional) - If artist is suppressed

**Confidence Note:** Function signature inferred from implementation and callers

**Called By:**
- [eventDetails](#eventdetails)
- [ProcessScheduledSales](#processscheduledsales)

**Calls:**
- `GetEventDetailsFromCache` - Checks DynamoDB cache
- `GetEventDetailsFromDiscovery` - Fetches from Discovery API
- `CacheEventDetails` - Writes to DynamoDB cache

---

### QueryCachedSalesByTimeRange
**Confidence:** 95% High

```javascript
const QueryCachedSalesByTimeRange = ({
  demandTable,
  correlation
}) => async({ startDateTime, endDateTime }) => { /* ... */ }
```

**Source:** [QueryCachedSalesByTimeRange](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationScheduler/index.js:33)

**Parameter Shape:**
- `demandTable` (DynamoDB, required) - DynamoDB client
- `correlation` (object, required) - Correlation IDs

**Returns:** Function that accepts:
- `startDateTime` (string, ISO format, required) - Start of time range
- `endDateTime` (string, ISO format, required) - End of time range

**Return Type:** Promise<Array> - Array of cached sale records

**Confidence Note:** Explicit query parameters and DynamoDB structure

**Called By:**
- [notificationScheduler](#notificationscheduler)

**Calls:**
- `demandTable.query()` - Queries DynamoDB GSI 'sales'

---

### ProcessScheduledSales
**Confidence:** 95% High

```javascript
export const ProcessScheduledSales = ({
  demandTable,
  correlation,
  discovery,
  schedule
}) => R.pipeP(/* ... */)
```

**Source:** [ProcessScheduledSales](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationScheduler/index.js:82)

**Parameter Shape:**
- `demandTable` (DynamoDB, required) - DynamoDB client
- `correlation` (object, required) - Correlation IDs
- `discovery` (object, required) - Discovery API service
- `schedule` (object, required)
  - `startDateTime` (string, ISO format)
  - `endDateTime` (string, ISO format)

**Returns:** Function that accepts:
- `cachedSales` (Array, required) - Array of cached sale records

**Return Type:** Promise<Array<{ saleId: string, eventId: string }>>

**Confidence Note:** Explicit Ramda pipeline composition

**Called By:**
- [notificationScheduler](#notificationscheduler)

**Calls:**
- [GetAndCacheEventDetails](#getandcacheeventdetails) - Enriches with event details
- `FilterSalesBySchedule` - Filters by time window

---

### GetDemandRecords
**Confidence:** 90% Medium-High

```javascript
const GetDemandRecords = ({ demandTable }) => async({ saleId, eventId }) => { /* ... */ }
```

**Source:** [GetDemandRecords](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationGenerator/GetDemandRecords.js)

**Parameter Shape:**
- `demandTable` (DynamoDB, required) - DynamoDB client

**Returns:** Function that accepts:
- `saleId` (string, required) - Sale ID
- `eventId` (string, required) - Event ID

**Return Type:** Promise<Array> - Array of demand records
- Each record:
  - `fanId` (string)
  - `phoneNumber` (string)
  - `email` (string)
  - `contactMethod` (string) - Comma-separated: 'sms,email'

**Confidence Note:** Function signature inferred from query structure

**Called By:**
- [GenerateNotifications](#generatenotifications)

**Calls:**
- `demandTable.query()` - Queries demand records by event and sale

---

## Data Transformation Patterns

### Pattern: DynamoDB Stream Record Transformation

**Description:** Middleware transforms DynamoDB stream records by extracting `newImage` and parsing DynamoDB types.

**Example Usage:**
```javascript
// Raw DynamoDB Stream Record
{
  eventID: "1",
  eventName: "INSERT",
  dynamodb: {
    NewImage: {
      PK: { S: "fan:123" },
      SK: { S: "notification#456-789#sms" },
      phoneNumber: { S: "+1234567890" },
      messageBody: { S: "Your event is soon!" }
    }
  }
}

// Transformed to:
{
  data: {
    newItem: {
      PK: "fan:123",
      SK: "notification#456-789#sms",
      phoneNumber: "+1234567890",
      messageBody: "Your event is soon!"
    }
  },
  recordId: "1",
  __meta: { /* original record */ }
}
```

**Found In:**
- [demandStreamToSqs](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/demandStreamToSqs/index.js:6)
- [notificationSend](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationSend/index.js:6)

---

### Pattern: SQS Batch Result Handling

**Description:** Workers return result object with count statistics that gets merged with SQS batch failure response.

**Example Usage:**
```javascript
// Worker returns:
{
  count: {
    in: 10,      // Input count
    out: 8,      // Successfully processed
    failed: 2    // Failed count
  }
}

// Merged with SQS batch response:
{
  count: {
    in: 10,
    out: 8,
    failed: 2
  },
  batchItemFailures: [
    { itemIdentifier: "id1" },
    { itemIdentifier: "id2" }
  ]
}
```

**Found In:**
- [demandStreamToSqs](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/demandStreamToSqs/index.js:34)
- Result handler middleware

---

### Pattern: Curried Service Injection

**Description:** Higher-order functions that accept service dependencies and return functions accepting business data.

**Example Usage:**
```javascript
// Define curried function
const ProcessData = ({ demandTable, correlation }) => async(data) => {
  // Function has closure over demandTable and correlation
  await demandTable.put(data);
  log.info('Processed', { correlation });
};

// Inject services
const processData = ProcessData({
  demandTable: services.aws.demandTable,
  correlation: { id: '123', awsRequestId: 'abc' }
});

// Use with business data
await processData({ id: '456', value: 'test' });
```

**Found In:**
- [GenerateNotifications](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationGenerator/GenerateNotifications.js:120)
- [SendMessage](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationSend/SendMessage.js)
- [UpdateNotificationRecords](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationSend/UpdateNotificationRecords.js)
- [GetAndCacheEventDetails](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/GetAndCacheEventDetails/index.js)

---

### Pattern: Ramda Pipeline Composition

**Description:** Functional composition using Ramda's `R.pipe` and `R.pipeP` for synchronous and asynchronous data transformations.

**Example Usage:**
```javascript
// Synchronous pipeline
export const formatRecordsForSqs = R.pipe(
  selectNewItems,           // Extract newItem from each record
  dedupById,                // Remove duplicates by id
  R.map(formatSQSRecord)    // Format each record for SQS
);

// Asynchronous pipeline
const processRecords = R.pipeP(
  fetchFromDatabase,        // Promise<Array>
  R.map(transform),         // Transform each item
  saveToDatabase            // Promise<Result>
);
```

**Found In:**
- [demandStreamToSqs](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/demandStreamToSqs/index.js:21)
- [notificationScheduler](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationScheduler/index.js:82)
- [eventDetails](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/eventDetails/index.js:26)

---

### Pattern: Notification Record Structure

**Description:** Consistent structure for notification records stored in DynamoDB.

**Example Usage:**
```javascript
// SMS Notification Record
{
  PK: "fan:123",
  SK: "notification#eventId-saleId#sms",
  eventId: "event123",
  saleId: "sale456",
  saleName: "General Sale",
  contactMethod: "sms",
  phoneNumber: "+1234567890",
  type: "notification",
  messageBody: "The Black Keys tickets go on sale at 10:00 AM!",
  sendAttempts: 0,
  errors: [],
  status: {
    id: "CREATED",
    date: "2024-01-15T10:00:00.000Z"
  },
  date: {
    created: "2024-01-15T10:00:00.000Z"
  }
}

// Email Notification Record
{
  PK: "fan:123",
  SK: "notification#eventId-saleId#email",
  eventId: "event123",
  saleId: "sale456",
  saleName: "General Sale",
  contactMethod: "email",
  email: "fan@example.com",
  type: "notification",
  templateVariables: {
    artistName: "The Black Keys",
    saleTime: "10:00 AM",
    eventDay: "FRI",
    eventDate: "MAR 15",
    eventTime: "8:00 PM",
    url: "https://tm.com/event/123",
    venueName: "Madison Square Garden",
    venueCity: "New York",
    venueStateCode: "NY"
  },
  sendAttempts: 0,
  errors: [],
  status: {
    id: "CREATED",
    date: "2024-01-15T10:00:00.000Z"
  },
  date: {
    created: "2024-01-15T10:00:00.000Z"
  }
}
```

**Found In:**
- [GenerateNotifications](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationGenerator/GenerateNotifications.js:60)

---

### Pattern: Schedule Window Generation

**Description:** Generates 30-minute time windows aligned to the hour for scheduling notifications.

**Example Usage:**
```javascript
// Current time: 2024-01-15 14:23:45

// makeSchedule() generates:
{
  startDateTime: "2024-01-15T14:30:00.000Z",  // Next 30-min boundary
  endDateTime: "2024-01-15T15:29:59.000Z"     // One hour window minus 1 second
}

// Used to query sales starting in that time window
```

**Found In:**
- [notificationScheduler](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationScheduler/index.js:23)

---

### Pattern: Error Result vs Thrown Error

**Description:** Functions return error objects rather than throwing, allowing pipeline to continue with error handling.

**Example Usage:**
```javascript
// Function returns error object instead of throwing
const fetchData = async(id) => {
  try {
    return await api.get(id);
  } catch (error) {
    return { error };  // Return error as object
  }
};

// Caller checks for error property
const result = await fetchData('123');
if (result.error) {
  // Handle error case
  log.error('Failed to fetch', result.error);
  return null;
}
// Continue with success case
processData(result);
```

**Found In:**
- [GetAndCacheEventDetails](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/GetAndCacheEventDetails/index.js)
- [eventDetails](file:///Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/eventDetails/index.js:21)

---

## Common Implicit Type Patterns

### DynamoDB Record Keys

**Pattern:** Consistent key structure for DynamoDB records

```javascript
// Demand Records
{
  PK: "event:{eventId}",
  SK: "demand#{fanId}#sale#{saleId}"
}

// Notification Records
{
  PK: "fan:{fanId}",
  SK: "notification#{eventId}-{saleId}#{contactMethod}"
}

// Event Cache Records
{
  PK: "event:{eventId}",
  SK: "event#details"
}

// Sale Cache Records (GSI)
{
  saleStartDate: "2024-01-15",           // Partition key for GSI
  saleStartDateTime: "2024-01-15T10:00:00.000Z"  // Sort key for GSI
}
```

**Used Throughout:** All DynamoDB operations

---

### Correlation Object Structure

**Pattern:** Consistent correlation object for distributed tracing

```javascript
{
  id: "correlation-uuid-123",
  awsRequestId: "aws-lambda-request-id-456"
}
```

**Used Throughout:** All worker functions and logged operations

---

### Service Method Patterns

**Pattern:** Service methods follow consistent patterns

```javascript
// DynamoDB operations
demandTable.query({
  indexName: 'sales',
  keyConditionExpression: 'saleStartDate = :saleStartDate',
  expressionAttributeValues: { ':saleStartDate': '2024-01-15' }
});

demandTable.put(item);
demandTable.batchWrite(items);

// SQS operations
shortUrlQueue.sendMessageBatch([
  { id: '1', data: { ... } },
  { id: '2', data: { ... } }
]);

// SMS service
sms.send({
  phoneNumber: '+1234567890',
  messageBody: 'Your notification message'
});
```

**Used Throughout:** Service interaction code
