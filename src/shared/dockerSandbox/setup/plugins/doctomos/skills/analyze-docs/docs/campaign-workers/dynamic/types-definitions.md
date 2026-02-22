# Type Definitions - campaign-workers

## TypeScript Types

### Worker Function Types

#### WorkerWithInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithInputTransformation<Event, Result = void> =
  (input: AppParamsWithInputTransformation<Event>) => Promise<Result>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/appResolver/index.d.ts`

**Description:** Function type for workers that receive pre-transformed input events.

**Generic Parameters:**
- `Event` - The type of the input event
- `Result` - The return type (defaults to `void`)

**References:**
- [AppParamsWithInputTransformation](#appparamswithinputtransformation)

**Used By:**
- Template workers that expect transformed input

---

#### WorkerWithoutInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithoutInputTransformation<Event, Result = void> =
  (input: AppParamsWithoutInputTransformation<Event>) => Promise<Result>
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/appResolver/index.d.ts`

**Description:** Function type for workers that receive raw Lambda events and context.

**Generic Parameters:**
- `Event` - The type of the Lambda event
- `Result` - The return type (defaults to `void`)

**References:**
- [AppParamsWithoutInputTransformation](#appparamswithoutinputtransformation)

**Used By:**
- [smsWaveSend](#smswavesend-worker)
- [smsWaveScheduler](#smswavescheduler-worker)
- Most worker implementations in the codebase

---

### Worker Input/Output Types

#### AppParamsWithInputTransformation
**Category:** TypeScript Type Alias

```typescript
type AppParamsWithInputTransformation<Event> = {
  input: Event
  Services: Services
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/appResolver/index.d.ts`

**Description:** Input parameters for workers with pre-transformed events.

**Fields:**
- `input` (Event, required) - The transformed event data
- `Services` ([Services](#services), required) - Available service clients

**Referenced By:**
- [WorkerWithInputTransformation](#workerwithinputtransformation)

---

#### AppParamsWithoutInputTransformation
**Category:** TypeScript Type Alias

```typescript
type AppParamsWithoutInputTransformation<Event> = {
  input: {
    event: Event
    context: Context
  }
  Services: Services
  correlation: Correlation
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/appResolver/index.d.ts`

**Description:** Input parameters for workers that receive raw Lambda events.

**Fields:**
- `input` (object, required)
  - `event` (Event, required) - Raw Lambda event
  - `context` (Context, required) - Lambda execution context
- `Services` ([Services](#services), required) - Available service clients
- `correlation` ([Correlation](#correlation), required) - Request correlation data

**References:**
- [Services](#services)
- [Correlation](#correlation)
- `Context` from `aws-lambda` package

**Referenced By:**
- [WorkerWithoutInputTransformation](#workerwithoutinputtransformation)

---

#### Correlation
**Category:** TypeScript Type Alias

```typescript
type Correlation = {
  id: string;
  awsRequestId: string;
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/appResolver/index.d.ts`

**Description:** Correlation identifiers for request tracking.

**Fields:**
- `id` (string, required) - Correlation ID for tracing
- `awsRequestId` (string, required) - AWS Lambda request ID

**Referenced By:**
- [AppParamsWithoutInputTransformation](#appparamswithoutinputtransformation)
- All worker implementations for logging and tracing

---

### Service Types

#### Services
**Category:** TypeScript Interface

```typescript
export type Services = {
  aws: any
  campaigns: any
  codes: any
  users: any
  entries: any
  sms: SmsService
  sfmc: any
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/services/index.d.ts`

**Description:** Collection of service clients available to workers.

**Fields:**
- `aws` (any, required) - AWS service clients (S3 buckets, SQS queues, DynamoDB tables)
- `campaigns` (any, required) - Campaign service client
- `codes` (any, required) - Code service client
- `users` (any, required) - User service client
- `entries` (any, required) - Entry service client
- `sms` ([SmsService](#smsservice), required) - SMS service client
- `sfmc` (any, required) - Salesforce Marketing Cloud service client

**References:**
- [SmsService](#smsservice)

**Referenced By:**
- [AppParamsWithInputTransformation](#appparamswithinputtransformation)
- [AppParamsWithoutInputTransformation](#appparamswithoutinputtransformation)

**Notes:**
- Most fields use `any` type - actual types would need to be inferred from usage
- Only `sms` has explicit type definition

---

#### SmsService
**Category:** TypeScript Interface

```typescript
export interface SmsService {
  sendMessage(message: Message & { correlationId: string }): Promise<void>
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/services/sms/index.d.ts`

**Description:** Service for sending SMS messages.

**Methods:**
- `sendMessage(message)` - Sends an SMS message
  - Parameter: `message` ([Message](#message) with correlationId)
  - Returns: `Promise<void>`

**References:**
- [Message](#message)

**Referenced By:**
- [Services](#services)
- [smsWaveSend worker](#smswavesend-worker)

---

#### Message
**Category:** TypeScript Type Alias

```typescript
type Message = {
  message: {
    to: {
      phoneNumber: string
    }
    text: string
    groupId: string
    messageId: string
    appMetadata: Record<string, AppMetadataValue>,
    appId: string,
    vendorId: string
  }
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/services/sms/index.d.ts`

**Description:** SMS message structure.

**Fields:**
- `message` (object, required)
  - `to` (object, required)
    - `phoneNumber` (string, required) - Recipient phone number
  - `text` (string, required) - Message body
  - `groupId` (string, required) - Message group identifier
  - `messageId` (string, required) - Unique message identifier
  - `appMetadata` (Record<string, [AppMetadataValue](#appmetadatavalue)>, required) - Custom metadata
  - `appId` (string, required) - Application identifier
  - `vendorId` (string, required) - Vendor identifier

**References:**
- [AppMetadataValue](#appmetadatavalue)

**Referenced By:**
- [SmsService](#smsservice)

---

#### AppMetadataValue
**Category:** TypeScript Type Alias

```typescript
export type AppMetadataValue = string | number | boolean | AppMetadataValue[] | { [key: string]: AppMetadataValue }
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/services/sms/index.d.ts`

**Description:** Recursive type for SMS message metadata values.

**Allowed Types:**
- `string`
- `number`
- `boolean`
- Array of AppMetadataValue
- Object with AppMetadataValue values

**Referenced By:**
- [Message](#message)

---

#### SFMC
**Category:** TypeScript Interface

```typescript
export interface SFMC {
  sendMessage(email: EmailDetail): Promise<Record<string, any>>
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/services/sfmc/index.d.ts`

**Description:** Salesforce Marketing Cloud service for sending emails.

**Methods:**
- `sendMessage(email)` - Sends an email message
  - Parameter: `email` ([EmailDetail](#emaildetail))
  - Returns: `Promise<Record<string, any>>`

**References:**
- [EmailDetail](#emaildetail)

**Referenced By:**
- [Services](#services) (as `sfmc` field)

---

### SQS Processing Types

#### SQSResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type SQSResultHandlerOutput = {
  unprocessed: TransformedSQSRecord[]
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/SQSResultHandler.d.ts`

**Description:** Output from handlers using the SQSResultHandler middleware. Contains records that should be retried.

**Fields:**
- `unprocessed` (Array<[TransformedSQSRecord](#transformedsqsrecord)>, required) - Records to retry

**References:**
- [TransformedSQSRecord](#transformedsqsrecord)

**Usage:**
- Returned by SQS consumer workers to indicate which records need retry

---

#### TransformedSQSRecord
**Category:** TypeScript Type Alias (Generic)

```typescript
export type TransformedSQSRecord<T = unknown> = T & {
  shouldRetry?: boolean
  __meta: any
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/SQSResultHandler.d.ts`

**Description:** SQS record with added retry metadata.

**Generic Parameters:**
- `T` - The actual record data type (defaults to `unknown`)

**Fields:**
- All fields from type `T`
- `shouldRetry` (boolean, optional) - Whether the record should be retried
- `__meta` (any, required) - Metadata added by middleware

**Referenced By:**
- [SQSResultHandlerOutput](#sqsresulthandleroutput)
- [ProcessSQSRecords](#processsqsrecords)

---

#### ProcessingResult
**Category:** TypeScript Type Alias

```typescript
export type ProcessingResult = {
  status: ProcessingResultStatus
  detail?: Record<string, string>
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts`

**Description:** Result of processing a single SQS record.

**Fields:**
- `status` ([ProcessingResultStatus](#processingresultstatus), required) - Processing outcome
- `detail` (Record<string, string>, optional) - Additional context about the result

**References:**
- [ProcessingResultStatus](#processingresultstatus)

**Referenced By:**
- [ProcessSQSRecords](#processsqsrecords)
- Worker record processing functions

---

#### ProcessingResultStatus
**Category:** TypeScript Type Alias (String Literal)

```typescript
export type ProcessingResultStatus = 'processed' | 'unprocessed'
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts`

**Description:** Status of a processed SQS record.

**Values:**
- `'processed'` - Record processed successfully (remove from queue)
- `'unprocessed'` - Record failed processing (retry later)

**Referenced By:**
- [ProcessingResult](#processingresult)

---

#### SQSAggregateResults
**Category:** TypeScript Type Alias (Generic)

```typescript
export type SQSAggregateResults<TRecord> = {
  unprocessed: TransformedSQSRecord<TRecord>[]
  count: {
    received: number
    processed: number
    unprocessed: number
    detail?: ProcessingDetail
  }
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts`

**Description:** Aggregated results from processing multiple SQS records.

**Generic Parameters:**
- `TRecord` - The type of the SQS records

**Fields:**
- `unprocessed` (Array<[TransformedSQSRecord](#transformedsqsrecord)<TRecord>>, required) - Records that need retry
- `count` (object, required)
  - `received` (number, required) - Total records received
  - `processed` (number, required) - Successfully processed count
  - `unprocessed` (number, required) - Failed processing count
  - `detail` ([ProcessingDetail](#processingdetail), optional) - Detailed breakdown

**References:**
- [TransformedSQSRecord](#transformedsqsrecord)
- [ProcessingDetail](#processingdetail)

**Referenced By:**
- [ProcessSQSRecords](#processsqsrecords)

---

#### ProcessingDetail
**Category:** TypeScript Type Alias

```typescript
export type ProcessingDetail = {
  [key: string]: {
    [detail: string]: number
  }
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/processingDetail.ts`

**Description:** Nested object for tracking processing details with counts.

**Structure:**
- Top-level keys: Processing categories (e.g., "sms", "email")
- Second-level keys: Processing outcomes (e.g., "sent", "failed")
- Values: Count of occurrences

**Example:**
```typescript
{
  sms: { sent: 150, failed: 5 },
  email: { sent: 20, failed: 2 }
}
```

**Referenced By:**
- [SQSAggregateResults](#sqsaggregateresults)

---

### SMS Wave Types

#### Wave
**Category:** TypeScript Type Alias

```typescript
export type Wave = {
  name: string
  date: string
  fileKey: string
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/smsWave/wave.ts`

**Description:** SMS notification wave metadata.

**Fields:**
- `name` (string, required) - Wave name
- `date` (string, required) - Wave date (ISO format)
- `fileKey` (string, required) - S3 key to registrant CSV file

**Referenced By:**
- [smsWaveSend worker](#smswavesend-worker)
- [sendNotification function](#sendnotification)

---

#### Registrant
**Category:** TypeScript Type Alias

```typescript
export type Registrant = {
  code?: string
  doNotText: 'true' | 'false'
  email: string
  firstName: string
  lastName: string
  link?: string
  locale?: string
  marketId?: string
  globalUserId: string
  mobileNumber: string
  smsText?: string
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/smsWave/wave.ts`

**Description:** SMS wave registrant data.

**Fields:**
- `code` (string, optional) - Offer code for registrant
- `doNotText` ('true' | 'false', required) - Whether to skip SMS sending
- `email` (string, required) - Registrant email
- `firstName` (string, required) - Registrant first name
- `lastName` (string, required) - Registrant last name
- `link` (string, optional) - Link to include in message
- `locale` (string, optional) - Locale for message formatting
- `marketId` (string, optional) - Market identifier
- `globalUserId` (string, required) - User global identifier
- `mobileNumber` (string, required) - Mobile phone number
- `smsText` (string, optional) - SMS message text template

**Referenced By:**
- [smsWaveSend worker](#smswavesend-worker)
- [sendNotification function](#sendnotification)
- [createEmailRequest function](#createemailrequest)

---

#### NotificationConfig
**Category:** TypeScript Type Alias

```typescript
export type NotificationConfig = {
  categoryId: number,
  campaignId: string,
  totalLimit: number,
  generateOfferCode: boolean,
  tiedToAccount: boolean,
  notifyDate: string
  key: string
  waveName: string
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/smsWave/notificationConfig.ts`

**Description:** Configuration for SMS wave notifications.

**Fields:**
- `categoryId` (number, required) - Category identifier
- `campaignId` (string, required) - Campaign identifier
- `totalLimit` (number, required) - Maximum notifications to send
- `generateOfferCode` (boolean, required) - Whether to generate offer codes
- `tiedToAccount` (boolean, required) - Whether codes are tied to accounts
- `notifyDate` (string, required) - When to send notifications (ISO format)
- `key` (string, required) - S3 key to config file
- `waveName` (string, required) - Wave name

**Referenced By:**
- [smsWaveScheduler worker](#smswavescheduler-worker)

---

#### EmailDetail
**Category:** TypeScript Type Alias

```typescript
export type EmailDetail = {
  fromEmail: string,
  fromName: string,
  template: string,
  email: string,
  attributes: EmailAttributes
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/smsWave/emailDetail.ts`

**Description:** Email message details for SFMC.

**Fields:**
- `fromEmail` (string, required) - Sender email address
- `fromName` (string, required) - Sender name
- `template` (string, required) - Email template identifier
- `email` (string, required) - Recipient email address
- `attributes` ([EmailAttributes](#emailattributes), required) - Template attributes

**References:**
- [EmailAttributes](#emailattributes)

**Referenced By:**
- [SFMC](#sfmc)

---

#### EmailAttributes
**Category:** TypeScript Type Alias

```typescript
type EmailAttributes = Omit<EmailRequest, 'email' | 'code'> & {
  password?: string
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/smsWave/emailDetail.ts`

**Description:** Email template attributes.

**Fields:**
- All fields from [EmailRequest](#emailrequest) except `email` and `code`
- `password` (string, optional) - Password field

**References:**
- [EmailRequest](#emailrequest)

**Referenced By:**
- [EmailDetail](#emaildetail)

---

#### EmailRequest
**Category:** TypeScript Type Alias

```typescript
export type EmailRequest = {
  email: string,
  firstName?: string,
  lastName?: string,
  link?: string,
  code?: string,
  locale?: string,
  smsMessage?: string
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/smsWave/emailDetail.ts`

**Description:** Email request data to be queued.

**Fields:**
- `email` (string, required) - Recipient email address
- `firstName` (string, optional) - Recipient first name
- `lastName` (string, optional) - Recipient last name
- `link` (string, optional) - Link to include
- `code` (string, optional) - Offer code
- `locale` (string, optional) - Locale for formatting
- `smsMessage` (string, optional) - SMS message text

**Referenced By:**
- [EmailAttributes](#emailattributes)
- [sendEmail function](#sendemail)
- [createEmailRequest function](#createemailrequest)

---

### Logging Types

#### Logger
**Category:** TypeScript Type Alias

```typescript
export type Logger = {
  [key in LogLevels]: LeveledLogMethod
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/Log.d.ts`

**Description:** Logger instance with level methods.

**Methods:**
- `error` (LeveledLogMethod) - Error level logging
- `warn` (LeveledLogMethod) - Warning level logging
- `info` (LeveledLogMethod) - Info level logging
- `verbose` (LeveledLogMethod) - Verbose level logging
- `debug` (LeveledLogMethod) - Debug level logging
- `silly` (LeveledLogMethod) - Silly level logging

**References:**
- [LogLevels](#loglevels)
- `LeveledLogMethod` from `winston` package

**Referenced By:**
- All worker implementations

---

#### LogLevels
**Category:** TypeScript Type Alias (String Literal)

```typescript
type LogLevels =
  'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/Log.d.ts`

**Description:** Available log levels.

**Values:**
- `'error'` - Error messages
- `'warn'` - Warning messages
- `'info'` - Informational messages
- `'verbose'` - Verbose messages
- `'debug'` - Debug messages
- `'silly'` - Silly/trace messages

**Referenced By:**
- [Logger](#logger)
- [LogConfig](#logconfig)

---

#### LogConfig
**Category:** TypeScript Type Alias

```typescript
export type LogConfig = {
  level?: LogLevels,
  secretKeys?: string[],
  rootFieldsWhitelist?: string[]
}
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/Log.d.ts`

**Description:** Logger configuration.

**Fields:**
- `level` ([LogLevels](#loglevels), optional) - Minimum log level
- `secretKeys` (string[], optional) - Keys to redact from logs
- `rootFieldsWhitelist` (string[], optional) - Root fields to include in logs

**References:**
- [LogLevels](#loglevels)

**Used By:**
- `buildLog` function

---

#### LoggerProvider
**Category:** TypeScript Type Alias

```typescript
export type LoggerProvider = (context: string) => Logger
```

**Exported From:** `/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/Log.d.ts`

**Description:** Function that creates loggers with context.

**Parameters:**
- `context` (string) - Log context/tag

**Returns:**
- [Logger](#logger)

**Referenced By:**
- Default export from Log module

---

## Type Dependency Graph

```
WorkerWithoutInputTransformation<Event, Result>
  └─ AppParamsWithoutInputTransformation<Event>
      ├─ Services
      │   ├─ SmsService
      │   │   └─ Message
      │   │       └─ AppMetadataValue (recursive)
      │   └─ SFMC
      │       └─ EmailDetail
      │           ├─ EmailAttributes
      │           │   └─ EmailRequest
      │           └─ EmailRequest
      └─ Correlation

WorkerWithInputTransformation<Event, Result>
  └─ AppParamsWithInputTransformation<Event>
      └─ Services (same as above)

SQS Processing Types:
SQSResultHandlerOutput
  └─ TransformedSQSRecord<T>

SQSAggregateResults<TRecord>
  ├─ TransformedSQSRecord<TRecord>
  └─ ProcessingDetail

ProcessingResult
  └─ ProcessingResultStatus

SMS Wave Types:
Wave (standalone)

Registrant
  └─ EmailRequest (transforms to)

NotificationConfig (standalone)

Logging Types:
LoggerProvider
  └─ Logger
      └─ LogLevels

LogConfig
  └─ LogLevels
```
