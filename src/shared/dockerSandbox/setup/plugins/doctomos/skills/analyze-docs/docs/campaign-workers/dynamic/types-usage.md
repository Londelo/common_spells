# Type Usage Patterns - campaign-workers

## Worker Functions

### smsWaveSend

#### handler
**Confidence:** 95-100% High

```typescript
const handler: WorkerWithoutInputTransformation<SmsWaveSendInput, SmsWaveSendOutput> = async({
  Services: { sms, aws: { scoringBucket, smsWaveEmailQueue } },
  input: { event: { waveName } },
  correlation: { id: correlationId }
}) => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:94)

**Input Type:** [SmsWaveSendInput](#smswavesendinput)

**Return Type:** Promise<[SmsWaveSendOutput](#smswavesendoutput)>

**Parameter Shape:**
- `Services.sms` (SmsService, required) - SMS service client
- `Services.aws.scoringBucket` (any, required) - S3 bucket for scoring data
- `Services.aws.smsWaveEmailQueue` (SQSClient, required) - SQS queue for email fallback
- `input.event.waveName` (string, required) - Name of the SMS wave to send
- `correlation.id` (string, required) - Correlation ID for tracing

**Calls:**
- [getWave](#getwave) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:69)
- [SendNotification](#sendnotification-constructor) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:57)
- [SendBatch](#sendbatch) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:64)
- `pipeline` from Node.js streams (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:106)

**Called By:**
- AWS Lambda runtime (triggered from campaign SMS wave step function)

**Confidence Note:** Explicit TypeScript types with type annotation on the handler function.

---

#### SmsWaveSendInput
**Category:** Inline Type Definition

```typescript
type SmsWaveSendInput = {
  waveName: string
}
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:80)

**Fields:**
- `waveName` (string, required) - Identifier for the SMS wave to process

**Used By:**
- [handler](#handler) (smsWaveSend)

---

#### SmsWaveSendOutput
**Category:** Inline Type Definition

```typescript
type SmsWaveSendOutput = { count: SendResults } & SmsWaveSendInput
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:84)

**Fields:**
- `waveName` (string, required) - Inherited from SmsWaveSendInput
- `count` (SendResults, required) - Processing results

**Composition:**
- Extends [SmsWaveSendInput](#smswavesendinput)
- Adds [SendResults](#sendresults)

**Used By:**
- [handler](#handler) (smsWaveSend)

---

#### SendResults
**Category:** Inline Type Definition

```typescript
type SendResults = {
  total: number
  ok: number
  failed: number
  detail: ProcessingDetail
}
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:15)

**Fields:**
- `total` (number, required) - Total messages processed
- `ok` (number, required) - Successfully sent count
- `failed` (number, required) - Failed to send count
- `detail` (ProcessingDetail, required) - Detailed breakdown by category

**Used By:**
- [combineResults](#combineresults) (returns this type)
- [SmsWaveSendOutput](#smswavesendoutput)

---

### smsWaveScheduler

#### handler
**Confidence:** 95-100% High

```typescript
const handler: WorkerWithoutInputTransformation<unknown, SmsWaveSchedulerOutput> =
  async({ Services: { aws: { scoringBucket } } }) => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:67)

**Input Type:** `unknown` (no specific input expected)

**Return Type:** Promise<[SmsWaveSchedulerOutput](#smswavescheduleroutput)>

**Parameter Shape:**
- `Services.aws.scoringBucket` (any, required) - S3 bucket with SMS wave configs

**Calls:**
- `scoringBucket.listObjects` (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:71)
- [getNotificationConfigs](#getnotificationconfigs) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:38)
- [isReadyForNotification](#isreadyfornotification) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:54)

**Called By:**
- AWS Lambda runtime (scheduled CloudWatch event)

**Confidence Note:** Explicit TypeScript types with type annotation on the handler function.

---

#### SmsWaveSchedulerOutput
**Category:** Type Alias

```typescript
type SmsWaveSchedulerOutput = string[]
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:65)

**Description:** Array of wave names that are ready for notification.

**Used By:**
- [handler](#handler-1) (smsWaveScheduler)

---

### processSmsWaveFiles

#### processSmsWaveFiles
**Confidence:** 70-94% Medium

```typescript
const processSmsWaveFiles = async({
  input: { event: { campaignId, dateKey, ...options } },
  Services: { aws: { scoringBucket }, campaigns: campaignService, entries: entryService, codes: codeService },
  correlation,
  jwt
}) => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:77)

**Input Shape:**
- `input.event.campaignId` (string, required) - Campaign identifier
- `input.event.dateKey` (string, required) - Date key for wave prep
- `input.event.options` (object, optional) - Additional processing options
- `Services.aws.scoringBucket` (any, required) - S3 bucket for scoring data
- `Services.campaigns` (any, required) - Campaign service client
- `Services.entries` (any, required) - Entry service client
- `Services.codes` (any, required) - Code service client
- `correlation` (Correlation, required) - Correlation data
- `jwt` (string, required) - JWT token for authentication

**Return Type:** Promise<{ key: string }>

**Calls:**
- [readWavePrepStatusFile](#readwaveprepstatusfile) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:85)
- [UploadStatus](#uploadstatus) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:59)
- [createOutputDirs](#createoutputdirs) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:34)
- [getAndMapMarketData](#getandmapmapmarketdata) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:103)
- [readMarketDetails](#readmarketdetails) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:104)
- [combineMarketDetailsAndData](#combinemarketdetailsanddata) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:105)
- [reserveExternalCodes](#reserveexternalcodes) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:107)
- [FileWriter](#filewriter) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:114)
- [selectEligibleFans](#selecteligiblefans) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:118)
- [handleSelectedRecords](#handleselectedrecords) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:126)
- [uploadZip](#uploadzip) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:43)
- [removeFiles](#removefiles) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:71)

**Called By:**
- AWS Lambda runtime (triggered from step function)

**Confidence Note:** JSDoc-style parameters inferred from destructuring. No explicit type annotations but clear parameter structure.

---

### generateSmsWaveCodes

#### generateSmsWaveCodes
**Confidence:** 70-94% Medium

```typescript
const generateSmsWaveCodes = async({
  input: { event: { waveFilePrefix, config: initConfig } },
  Services: { aws: { scoringBucket: bucket }, pacman },
  correlation
}) => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:27)

**Input Shape:**
- `input.event.waveFilePrefix` (string, required) - Prefix for wave file in S3
- `input.event.config` (object, required) - Wave configuration
  - `notifyDate` (string, required) - ISO date string for notification
  - `generateOfferCode` (boolean, required) - Whether to generate codes
  - ... other config fields from NotificationConfig
- `Services.aws.scoringBucket` (any, required) - S3 bucket for scoring data
- `Services.pacman` (any, required) - Pacman service for code generation
- `correlation` (Correlation, required) - Correlation data

**Return Type:** Promise<{ waveFilePrefix: string, generateOfferCode: boolean, count: { in: number, out: number, errors: number } }>

**Calls:**
- [expandConfigDates](#expandconfigdates) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:16)
- [uploadNormalizedConfigFile](#uploadnormalizedconfigfile) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:38)
- [createWaveFileKey](#createwavefilekey) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:9)
- [readWaveFile](#readwavefile) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:40)
- [generateCodes](#generatecodes) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:41)
- [uploadWaveFile](#uploadwavefile) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:42)

**Called By:**
- AWS Lambda runtime (triggered from step function)

**Confidence Note:** JSDoc-style parameters inferred from destructuring. Clear input/output structure.

---

### saveCampaignData

#### saveCampaignData
**Confidence:** 70-94% Medium

```typescript
const saveCampaignData = ({ Services: { aws: { campaignDataBucket } }, input, correlation }) =>
  R.pipeP(...)()
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js:13)

**Input Shape:**
- `Services.aws.campaignDataBucket` (any, required) - S3 bucket for campaign data
- `input` (Array<object>, required) - Array of campaign records
  - `type` (string, required) - Record type (used for grouping)
  - ... other fields vary by record type
- `correlation` (Correlation, required) - Correlation data

**Return Type:** Promise<{ count: { in: number, out: number } }>

**Calls:**
- [isRecordTypeValid](#isrecordtypevalid) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js:15)
- [setDedupeInfo](#setdedupeinfo) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js:11)
- [trimLeaves](#trimleaves) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js:11)
- [encodeRecordsByType](#encoderecordsbytype) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js:20)
- [saveEncodedStreamByType](#saveencodedstreambytype) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js:24)

**Called By:**
- AWS Lambda runtime (likely triggered from Kinesis or DynamoDB stream)

**Confidence Note:** Functional programming style with Ramda. Clear input structure from destructuring.

---

### saveSelection

#### saveSelection
**Confidence:** 70-94% Medium

```typescript
const saveSelection = async({
  Services: { entries, campaigns, aws: { demandTable, verdictReporterQueue } },
  input,
  correlation,
  jwt
}) => R.pipeP(...)()
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveSelection/index.js](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveSelection/index.js:49)

**Input Shape:**
- `Services.entries` (any, required) - Entry service client
- `Services.campaigns` (any, required) - Campaign service client
- `Services.aws.demandTable` (any, required) - DynamoDB table for demand tracking
- `Services.aws.verdictReporterQueue` (any, required) - SQS queue for verdict reporting
- `input` (Array<object>, required) - Array of code assignment records
  - `campaignId` (string, required) - Campaign identifier
  - ... other assignment fields
- `correlation` (Correlation, required) - Correlation data
- `jwt` (string, required) - JWT token for authentication

**Return Type:** Promise<object> (aggregated result counts)

**Calls:**
- [groupByCampaignId](#groupbycampaignid) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveSelection/index.js:54)
- [assignCodesByCampaignId](#assigncodesbycampaignid) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveSelection/index.js:17)
- [aggregateResultCounts](#aggregateresultcounts) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveSelection/index.js:70)

**Called By:**
- AWS Lambda runtime (likely triggered from stream or queue)

**Confidence Note:** Functional programming style with Ramda. Clear input structure from destructuring.

---

## Helper Functions

### sendNotification

#### sendNotification
**Confidence:** 95-100% High

```typescript
export const sendNotification = async(
  sms: SmsService,
  emailQueue: SQSClient,
  wave: Wave,
  registrant: Registrant,
  correlationId: string
): Promise<Result> => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:104)

**Parameter Shape:**
- `sms` (SmsService, required) - SMS service client
- `emailQueue` (SQSClient, required) - SQS queue for email fallback
- `wave` (Wave, required) - Wave metadata
- `registrant` (Registrant, required) - Registrant data
- `correlationId` (string, required) - Correlation ID

**Return Type:** Promise<[Result](#result)>

**Calls:**
- [createEmailRequest](#createemailrequest) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:95)
- [isNorthAmericaNumber](#isnorthamericanumber) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:10)
- [sendSMS](#sendsms) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:50)
- [sendEmail](#sendemail) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:24)

**Called By:**
- [SendNotification constructor](#sendnotification-constructor) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:60)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

#### Result
**Category:** Inline Type Definition

```typescript
export type Result = {
  ok: boolean,
  detail: {
    sms?: 'sent' | 'failed'
    email?: 'sent' | 'failed'
  }
}
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:16)

**Fields:**
- `ok` (boolean, required) - Whether sending succeeded
- `detail` (object, required)
  - `sms` ('sent' | 'failed', optional) - SMS sending result
  - `email` ('sent' | 'failed', optional) - Email sending result

**Used By:**
- [sendNotification](#sendnotification)
- [sendSMS](#sendsms)
- [sendEmail](#sendemail)
- [combineResults](#combineresults)

---

#### SQSClient
**Category:** Interface

```typescript
export interface SQSClient {
  sendMessage(message: { data: Record<string, any> }): Promise<void>
}
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:11)

**Methods:**
- `sendMessage(message)` - Sends message to SQS queue
  - Parameter: `message` with `data` field (Record<string, any>)
  - Returns: `Promise<void>`

**Used By:**
- [sendEmail](#sendemail)
- [sendNotification](#sendnotification)

---

### sendSMS

#### sendSMS
**Confidence:** 95-100% High

```typescript
const sendSMS = async(
  sms: SmsService,
  wave: Wave,
  registrant: Registrant,
  emailRequest: EmailRequest,
  correlationId: string
): Promise<Result> => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:50)

**Parameter Shape:**
- `sms` (SmsService, required) - SMS service client
- `wave` (Wave, required) - Wave metadata
- `registrant` (Registrant, required) - Registrant data
- `emailRequest` (EmailRequest, required) - Email request for metadata
- `correlationId` (string, required) - Correlation ID

**Return Type:** Promise<[Result](#result)>

**Calls:**
- [selectAndNormalizePhoneNumber](#selectandnormalizephonenumber) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:42)
- `sms.sendMessage` (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:81)

**Called By:**
- [sendNotification](#sendnotification) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:116)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### sendEmail

#### sendEmail
**Confidence:** 95-100% High

```typescript
const sendEmail = async(
  emailQueue: SQSClient,
  registrant: Registrant,
  emailRequest: EmailRequest
): Promise<Result> => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:24)

**Parameter Shape:**
- `emailQueue` (SQSClient, required) - SQS queue client
- `registrant` (Registrant, required) - Registrant data
- `emailRequest` (EmailRequest, required) - Email request data

**Return Type:** Promise<[Result](#result)>

**Calls:**
- `emailQueue.sendMessage` (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:30)

**Called By:**
- [sendNotification](#sendnotification) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:113)
- [sendNotification](#sendnotification) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:122)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### createEmailRequest

#### createEmailRequest
**Confidence:** 95-100% High

```typescript
const createEmailRequest = ({
  email, firstName, lastName, link, locale, code, smsText
}: Registrant): EmailRequest => ({ ... })
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:95)

**Parameter Shape:**
- Destructured [Registrant](#registrant) fields

**Return Type:** [EmailRequest](#emailrequest)

**Called By:**
- [sendNotification](#sendnotification) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:111)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### selectAndNormalizePhoneNumber

#### selectAndNormalizePhoneNumber
**Confidence:** 95-100% High

```typescript
export const selectAndNormalizePhoneNumber: (registrant: Registrant) => string = R.pipe(
  R.prop('mobileNumber'),
  R.unless(R.startsWith('+'), R.concat<string>('+'))
)
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:42)

**Parameter Shape:**
- `registrant` (Registrant, required) - Registrant with mobileNumber

**Return Type:** string (normalized phone number with + prefix)

**Called By:**
- [sendSMS](#sendsms) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:64)

**Confidence Note:** Explicit TypeScript types with function signature annotation.

---

### isNorthAmericaNumber

#### isNorthAmericaNumber
**Confidence:** 95-100% High

```typescript
export const isNorthAmericaNumber = R.test(/^\+?1/)
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:10)

**Parameter Shape:**
- `phoneNumber` (string, required) - Phone number to test

**Return Type:** boolean (true if North America number)

**Called By:**
- [sendNotification](#sendnotification) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:112)

**Confidence Note:** Explicit function using Ramda test.

---

### getWave

#### getWave
**Confidence:** 70-94% Medium

```typescript
const getWave = async(scoringBucket: any, waveName: string): Promise<Wave> => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:69)

**Parameter Shape:**
- `scoringBucket` (any, required) - S3 bucket client with getObject method
- `waveName` (string, required) - Name of the wave

**Return Type:** Promise<[Wave](#wave)>

**Calls:**
- [getWaveConfigKey](#getwaveconfigkey) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:70)
- [getWaveRegistrantFileKey](#getwaveregistrantfilekey) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:75)
- `scoringBucket.getObject` (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:71)

**Called By:**
- [handler](#handler) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:101)

**Confidence Note:** Explicit TypeScript parameter and return type annotations. One parameter uses `any` type.

---

### getNotificationConfigs

#### getNotificationConfigs
**Confidence:** 95-100% High

```typescript
const getNotificationConfigs = async(
  getObject: (key: string) => Promise<string>,
  s3objects: S3Object[],
): Promise<NotificationConfig[]> => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:38)

**Parameter Shape:**
- `getObject` (function, required) - Function to fetch S3 object contents
  - Parameter: `key` (string) - S3 object key
  - Returns: Promise<string>
- `s3objects` (S3Object[], required) - Array of S3 object metadata

**Return Type:** Promise<NotificationConfig[]>

**Calls:**
- [getNotificationConfig](#getnotificationconfig) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:43)

**Called By:**
- [handler](#handler-1) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:79)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### getNotificationConfig

#### getNotificationConfig
**Confidence:** 95-100% High

```typescript
const getNotificationConfig = async(
  getObject: (key: string) => Promise<string>,
  { Key }: S3Object
): Promise<NotificationConfig | undefined> => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:19)

**Parameter Shape:**
- `getObject` (function, required) - Function to fetch S3 object contents
- Destructured S3Object with `Key` field (string)

**Return Type:** Promise<NotificationConfig | undefined>

**Calls:**
- `getObject` (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:24)
- [getWaveName](#getwavename) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:31)

**Called By:**
- [getNotificationConfigs](#getnotificationconfigs) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:43)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### isReadyForNotification

#### isReadyForNotification
**Confidence:** 95-100% High

```typescript
export const isReadyForNotification = (notificationConfig: NotificationConfig): boolean => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:54)

**Parameter Shape:**
- `notificationConfig` (NotificationConfig, required) - Wave configuration

**Return Type:** boolean

**Calls:**
- `parse` from @verifiedfan/date (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:59)
- `now` from @verifiedfan/date (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:60)

**Called By:**
- [handler](#handler-1) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:82)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

## Middleware Functions

### ProcessSQSRecords

#### ProcessSQSRecords
**Confidence:** 95-100% High

```typescript
export const ProcessSQSRecords = <TRecord extends TransformedSQSRecord>(
  options: { logTag: string },
  fn: (record: TRecord) => ProcessingResult | Promise<ProcessingResult>,
): (records: TRecord[]) => Promise<SQSAggregateResults<TRecord>> => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts:99)

**Description:** Higher-order function that creates a worker processing function for SQS records. Provides retry handling and result aggregation.

**Generic Parameters:**
- `TRecord` - Type of SQS records (must extend TransformedSQSRecord)

**Parameter Shape:**
- `options` (object, required)
  - `logTag` (string, required) - Tag for logging
- `fn` (function, required) - Record processing function
  - Parameter: `record` (TRecord) - Record to process
  - Returns: ProcessingResult | Promise<ProcessingResult>

**Return Type:** Function that takes TRecord[] and returns Promise<SQSAggregateResults<TRecord>>

**Calls:**
- [ProcessRecord](#processrecord) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts:104)
- [mergeDetail](#mergedetail) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts:118)

**Usage Pattern:**
```typescript
const processRecords = ProcessSQSRecords(
  { logTag: 'my-worker' },
  (record) => {
    // Process record
    return processed({ category: 'success' })
  }
)
const results = await processRecords(sqsRecords)
```

**Confidence Note:** Explicit TypeScript types with full generic type parameters.

---

### Tracing

#### Tracing
**Confidence:** 95-100% High

```typescript
export const Tracing = ({ workerName }) => app => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/telemetry.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/telemetry.ts:99)

**Description:** Middleware that adds OpenTelemetry tracing to worker functions.

**Parameter Shape:**
- `workerName` (string, required) - Name of the worker for tracing

**Return Type:** Middleware function that wraps worker app function

**Structure:**
- Returns function that takes `app` (worker function)
- Returns async function that takes `params` (worker parameters)
- Wraps execution in OpenTelemetry span

**Calls:**
- [resolveWorkerConfig](#resolveworkerconfig) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/telemetry.ts:100)
- `GlobalTracer` (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/telemetry.ts:103)
- `tracer.startActiveSpan` (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/telemetry.ts:120)
- [safeForceFlush](#safeforceflush) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/telemetry.ts:136)

**Confidence Note:** TypeScript with explicit type imports. Parameter types inferred from usage.

---

## Utility Functions

### mergeDetail

#### mergeDetail
**Confidence:** 95-100% High

```typescript
export const mergeDetail = (
  detail: ProcessingDetail,
  resultDetail: Record<string, string>
): ProcessingDetail => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/processingDetail.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/processingDetail.ts:15)

**Parameter Shape:**
- `detail` (ProcessingDetail, required) - Existing processing detail
- `resultDetail` (Record<string, string>, required) - New detail to merge

**Return Type:** ProcessingDetail

**Description:** Merges result detail into existing processing detail, incrementing counts.

**Calls:**
- Ramda functions (`R.over`, `R.lensPath`) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/processingDetail.ts:17)

**Called By:**
- [ProcessSQSRecords](#processsqsrecords) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts:118)
- [combineResults](#combineresults) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:47)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### processed

#### processed
**Confidence:** 95-100% High

```typescript
export const processed = (detail?: Record<string, string>): ProcessingResult => ({
  status: 'processed',
  detail
})
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts:31)

**Parameter Shape:**
- `detail` (Record<string, string>, optional) - Processing detail context

**Return Type:** [ProcessingResult](#processingresult) with status 'processed'

**Description:** Helper to create a successful processing result.

**Usage:**
```typescript
return processed({ category: 'success' })
```

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### unprocessed

#### unprocessed
**Confidence:** 95-100% High

```typescript
export const unprocessed = (detail?: Record<string, string>): ProcessingResult => ({
  status: 'unprocessed',
  detail
})
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/shared/middlewares/processSQSRecords.ts:36)

**Parameter Shape:**
- `detail` (Record<string, string>, optional) - Processing detail context

**Return Type:** [ProcessingResult](#processingresult) with status 'unprocessed'

**Description:** Helper to create a failed processing result (for retry).

**Usage:**
```typescript
return unprocessed({ category: 'failed' })
```

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

### combineResults

#### combineResults
**Confidence:** 95-100% High

```typescript
const combineResults = async(
  source: AsyncIterable<Result[]>
): Promise<SendResults> => { ... }
```

**Source:** [/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts](file:///Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:23)

**Parameter Shape:**
- `source` (AsyncIterable<Result[]>, required) - Async iterable of result batches

**Return Type:** Promise<[SendResults](#sendresults)>

**Description:** Aggregates batches of send results into total counts.

**Calls:**
- [mergeDetail](#mergedetail) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:47)

**Called By:**
- Used in pipeline in [handler](#handler) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:110)

**Confidence Note:** Explicit TypeScript types with full type annotations.

---

## Common Patterns

### Pattern: Worker Parameter Destructuring

**Description:** Workers use destructuring to extract Services, input, correlation, and jwt from parameters.

**Example Usage:**
```typescript
const handler = async({
  Services: { sms, aws: { scoringBucket } },
  input: { event: { waveName } },
  correlation: { id: correlationId }
}) => {
  // Worker implementation
}
```

**Found In:**
- [smsWaveSend](#handler) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:94)
- [smsWaveScheduler](#handler-1) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:67)
- [processSmsWaveFiles](#processsmswafiles) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/processSmsWaveFiles/index.js:77)
- [generateSmsWaveCodes](#generatesmswavecodes) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:27)

---

### Pattern: Functional Pipeline with Ramda

**Description:** Workers use Ramda's `R.pipeP` or `R.pipe` to compose transformation functions.

**Example Usage:**
```typescript
const worker = ({ Services, input, correlation }) => R.pipeP(
  () => Promise.resolve(input),
  R.filter(isValid),
  R.map(transform),
  R.groupBy(selectKey),
  processGroups,
  aggregateResults
)()
```

**Found In:**
- [saveCampaignData](#savecampaigndata) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js:13)
- [saveSelection](#saveselection) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveSelection/index.js:51)

---

### Pattern: Result Aggregation

**Description:** Workers return count objects with `in` and `out` fields to track record counts.

**Example Usage:**
```typescript
return {
  count: {
    in: inputRecords.length,
    out: outputRecords.length
  }
}
```

**Found In:**
- [saveCampaignData](#savecampaigndata) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/saveCampaignData/index.js:33)
- [generateSmsWaveCodes](#generatesmswavecodes) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/generateSmsWaveCodes/index.js:45)

---

### Pattern: SMS/Email Fallback

**Description:** Workers attempt SMS first, then fall back to email on failure.

**Example Usage:**
```typescript
const smsResult = await sendSMS(...)
if (smsResult.ok) {
  return smsResult
}
const emailResult = await sendEmail(...)
return {
  ...emailResult,
  detail: { ...emailResult.detail, ...smsResult.detail }
}
```

**Found In:**
- [sendNotification](#sendnotification) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/sendNotification.ts:116)

---

### Pattern: S3 Wave Configuration

**Description:** SMS wave configuration stored in S3 with states: scheduled, triggered, failed.

**File Structure:**
```
smsWaves/
  scheduled/{waveName}_csv.json
  triggered/{waveName}_csv.json
  failed/{waveName}_csv.json
  csv/{waveName}.csv
```

**Found In:**
- [getWaveConfigKey](#getwaveconfigkey) (defined in shared/smsWave/wave.ts)
- [smsWaveScheduler](#handler-1) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveScheduler/index.ts:15)

---

### Pattern: Processing Detail Tracking

**Description:** Nested objects track counts by category and outcome.

**Example Usage:**
```typescript
const detail: ProcessingDetail = {
  sms: { sent: 150, failed: 5 },
  email: { sent: 20, failed: 2 }
}
```

**Found In:**
- [ProcessingDetail](#processingdetail) type
- [mergeDetail](#mergedetail) function
- [combineResults](#combineresults) (/Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers/apps/smsWaveSend/index.ts:30)
