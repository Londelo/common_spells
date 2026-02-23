# Type Definitions - reg-workers

## TypeScript Types

### Core Worker Types

#### Worker
**Category:** TypeScript Type Alias

```typescript
export type Worker<Event = unknown, Result = void, Services = unknown> =
  WorkerWithoutInputTransformation<Event, Result, Services>
  | WorkerWithInputTransformation<Event, Result, Services>
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:46)

**Description:** Base type signature for a worker, including input `Event`, output `Result`, and provided `Services`. Worker middleware implementation is configured via config file.

**Union Types:**
- [WorkerWithoutInputTransformation](#workerwithoutinputtransformation)
- [WorkerWithInputTransformation](#workerwithinputtransformation)

---

#### WorkerWithInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithInputTransformation<Event, Result = void, Services = unknown> =
  (input: AppParamsWithInputTransformation<Event, Services>) => Promise<Result>
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:33)

**Description:** Worker type where middleware lifts transformed event directly to the `input` property.

**References:**
- [AppParamsWithInputTransformation](#appparamswithinputtransformation)

---

#### WorkerWithoutInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type WorkerWithoutInputTransformation<Event, Result = void, Services = unknown> =
  (input: AppParamsWithoutInputTransformation<Event, Services>) => Promise<Result>
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:36)

**Description:** Worker type where middleware preserves event in `input.event` property and provides `correlation` property.

**References:**
- [AppParamsWithoutInputTransformation](#appparamswithoutinputtransformation)

---

#### AppParamsWithInputTransformation
**Category:** TypeScript Type Alias

```typescript
type AppParamsWithInputTransformation<Event, Services> = {
  input: Event
  Services: Services
  jwt: string
}
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:7)

**Description:** Parameters for workers where middlewares lift transformed event directly to the `input` property (no `correlation` property).

---

#### AppParamsWithoutInputTransformation
**Category:** TypeScript Type Alias

```typescript
export type AppParamsWithoutInputTransformation<Event, Services> = {
  input: {
    event: Event
    context: Context
  }
  Services: Services
  correlation: Correlation,
  jwt: string
}
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:23)

**Description:** Parameters for workers where middlewares preserve event in `input.event` property and provide `correlation` property.

**References:**
- [Correlation](#correlation)

---

#### Correlation
**Category:** TypeScript Type Alias

```typescript
export type Correlation = {
  id: string;
  awsRequestId: string;
}
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:18)

**Description:** Correlation tracking for distributed tracing across worker invocations.

---

### SQS Worker Types

#### SQSWorker
**Category:** TypeScript Type Alias

```typescript
export type SQSWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<TransformedSQSRecord<Message>[], SQSResultHandlerOutput<Result>, Services>
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:50)

**Description:** Worker type for processing SQS messages with result handler (supports unprocessed records retry).

**References:**
- [TransformedSQSRecord](#transformedsqsrecord)
- [SQSResultHandlerOutput](#sqsresulthandleroutput)

---

#### SQSBatchWorker
**Category:** TypeScript Type Alias

```typescript
export type SQSBatchWorker<Message, Result, Services = unknown> =
  WorkerWithInputTransformation<TransformedSQSRecord<Message>[], SQSBatchItemResultHandlerOutput<Result>, Services>
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:53)

**Description:** Worker type for processing SQS messages with batch item failures support (partial retry).

**References:**
- [TransformedSQSRecord](#transformedsqsrecord)
- [SQSBatchItemResultHandlerOutput](#sqsbatchitemresulthandleroutput)

---

#### TransformedSQSRecord
**Category:** TypeScript Type Alias

```typescript
export type TransformedSQSRecord<Message = unknown> = Message & SQSRecordExtensions
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:80)

**Description:** SQS record with additional metadata added by middleware transformation.

**References:**
- [SQSRecordExtensions](#sqsrecordextensions)

---

#### SQSRecordExtensions
**Category:** TypeScript Type Alias

```typescript
export type SQSRecordExtensions = {
  shouldRetry?: boolean
  sqsMessageId: string
  __meta: Record<string, unknown>
  sqsMessageAttributes: SQSMessageAttributes | Record<string, never>
  sqsEventSourceARN: string
}
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:72)

**Description:** Metadata fields added to SQS messages by middleware.

---

#### SQSResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type SQSResultHandlerOutput<Result = unknown> = Result & {
  unprocessed: TransformedSQSRecord[]
}
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:68)

**Description:** Output format for SQSResultHandler middleware - supports marking records as unprocessed for retry.

---

#### SQSBatchItemResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type SQSBatchItemResultHandlerOutput<Result = unknown> = Result & SQSBatchResponse
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:99)

**Description:** Output format for SQS batch item failures (AWS Lambda SQS partial batch response).

**References:** AWS Lambda `SQSBatchResponse` type

---

### Kinesis Worker Types

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

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:56)

**Description:** Worker type for processing Kinesis stream messages with batch item failures support.

**References:**
- [TransformedKinesisMessage](#transformedkinesismessage)
- [KinesisBatchItemResultHandlerOutput](#kinesisbatchitemresulthandleroutput)

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

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:82)

**Description:** Kinesis stream record with metadata added by middleware transformation.

---

#### KinesisBatchItemResultHandlerOutput
**Category:** TypeScript Type Alias

```typescript
export type KinesisBatchItemResultHandlerOutput<Result = unknown> = Result & KinesisStreamBatchResponse
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:100)

**Description:** Output format for Kinesis batch item failures (AWS Lambda Kinesis partial batch response).

**References:** AWS Lambda `KinesisStreamBatchResponse` type

---

### Batch Processing Types

#### FailureIdentifier
**Category:** TypeScript Type Alias

```typescript
export type FailureIdentifier = {
  itemIdentifier: string
};
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:89)

**Description:** Identifier for a failed batch item (used in SQS and Kinesis partial batch responses).

**Used By:**
- SQS batch workers (identifies failed messages by `messageId`)
- Kinesis batch workers (identifies failed records by `recordId`)
- DynamoDB stream workers (identifies failed records by `recordId`)

---

#### EnqueueFromStreamOutput
**Category:** TypeScript Type Alias

```typescript
export type EnqueueFromStreamOutput = {
  in: number,
  rejected: number,
  batchItemFailures: FailureIdentifier[]
}
```

**Source:** [shared/appResolver/Worker.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/appResolver/Worker.ts:93)

**Description:** Output format for workers that enqueue records from DynamoDB streams to SQS.

**Used By:**
- [enqueueEntries](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/apps/replication/enqueueEntries)

---

### Services Type

#### Services
**Category:** TypeScript Interface

```typescript
export type Services = {
  aws: AWS
  kafka: Kafka
  request: Request
  redis: RedisClient
  campaigns: CampaignService
  codes: CodeService
  entries: EntryService
  exportsService: ExportsService
  users: UserService
  saveEntriesQueueManager: SaveEntriesQueue
  saveSelectionQueueManager: SaveSelectionQueue
  dataTopicManager: DataTopic
  mongo: Mongo
};
```

**Source:** [shared/services/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/services/index.ts:17)

**Description:** All available services injected into workers. Services include AWS clients, HTTP API clients, and queue/topic managers.

**Service Categories:**
- **Infrastructure:** `aws`, `kafka`, `mongo`, `redis`
- **HTTP Clients:** `request`, `campaigns`, `codes`, `entries`, `exportsService`, `users`
- **Queue/Topic Managers:** `saveEntriesQueueManager`, `saveSelectionQueueManager`, `dataTopicManager`

---

## Campaign Domain Types

### Campaign
**Category:** TypeScript Interface

```typescript
export type Campaign = {
  type: 'registration';
  id: string;
  domain: {
    site: string;
  };
  artist: Artist;
  schema: {
    version: string;
  };
  tour: {
    name: string;
  };
  referenceTimezone: string;
  date: CampaignDates;
  locales: CampaignLocale[];
  markets: Market[];
  faqs: Faqs;
  content: Content;
  status: CampaignStatus;
  preferences: Preference[];
  style: CampaignStyles;
  image: CampaignImage;
  options?: CampaignOptions
};
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:100)

**Description:** Complete campaign definition with all configuration, preferences, markets, and content.

**References (Nested Types):**
- [Artist](#artist)
- [CampaignDates](#campaigndates)
- [CampaignLocale](#campaignlocale)
- [Market](#market)
- [Faqs](#faqs)
- [Content](#content)
- [CampaignStatus](#campaignstatus) (enum)
- [Preference](#preference)
- [CampaignStyles](#campaignstyles)
- [CampaignImage](#campaignimage)
- [CampaignOptions](#campaignoptions)

**Used By:**
- `checkEligibility` worker (validates campaign eligibility)
- Campaign validation functions
- Redis cache (campaign caching)

---

#### Artist
**Category:** TypeScript Type Alias

```typescript
export type Artist = {
  discovery_id: string;
  name: string;
  adpUrl?: string;
}
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:94)

---

#### CampaignDates
**Category:** TypeScript Type Alias

```typescript
export type CampaignDates = {
  created: string;
  updated: string;
  open: string;
  close: string;
  presaleWindowStart: string;
  presaleWindowEnd: string;
  sendReminderEmails?: [string];
};
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:18)

**Description:** Campaign lifecycle dates including registration window and presale window.

---

#### CampaignLocale
**Category:** TypeScript Type Alias

```typescript
export type CampaignLocale = {
  is_default: boolean;
  id: string;
};
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:28)

---

#### CampaignStatus
**Category:** TypeScript Enum

```typescript
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PREVIEW = 'PREVIEW'
}
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:33)

**Description:** Campaign lifecycle status states.

---

#### Preference
**Category:** TypeScript Type Alias

```typescript
export type Preference = {
  id: string;
  type: CAMPAIGN_PREFERENCE;
  is_optional: boolean;
  additional: {
    maxLength?: number;
    minLength?: number;
    min?: number;
    max?: number;
    items?: string[]
  };
};
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:5)

**Description:** Campaign registration field preference configuration (e.g., email, phone, markets).

**References:**
- [CAMPAIGN_PREFERENCE](#campaign_preference) (enum)

---

#### CampaignStyles
**Category:** TypeScript Type Alias

```typescript
export type CampaignStyles = {
  theme: {
    primary: string;
    mix70: string;
    mix40: string;
    mix20: string;
  };
  border: {
    primary: string;
  };
  pageBackground: {
    primary: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
};
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:40)

---

#### CampaignImage
**Category:** TypeScript Type Alias

```typescript
export type CampaignImage = {
  main: Url;
  secondary?: Url;
  mobile?: Url;
  email?: Url;
};
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:61)

---

#### CampaignOptions
**Category:** TypeScript Type Alias

```typescript
export type CampaignOptions = {
  gate?: CampaignGate
  waitingRoomDuration?: number
} & Record<string, unknown>
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:89)

**References:**
- [CampaignGate](#campaigngate)

---

#### Faqs
**Category:** TypeScript Type Alias

```typescript
export type Faqs = {
  landing: { open: string[]; closed: string[] };
  confirmation: { open: string[]; closed: string[]; activePresale: string[] };
};
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:68)

---

#### Content
**Category:** TypeScript Type Alias

```typescript
export type Content = {
  'en-US': LocaleContent;
  [locale: string]: LocaleContent;
};
```

**Source:** [shared/types/campaign.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/campaign.ts:84)

---

## Market Domain Types

### Market
**Category:** TypeScript Type Alias

```typescript
export type Market = {
  id: string;
  campaign_id: string;
  name: string;
  city: string;
  state: string;
  timezone: string;
  date: {
    created: string;
    updated: string;
    notification?: string;
    notified?: string;
  };
  event: MarketEvent;
  accessCode?: string;
  isAddedShow?: boolean;
  promoterIds?: string[];
};
```

**Source:** [shared/types/market.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/market.ts:18)

**Description:** Individual market (venue/event) within a campaign.

**References:**
- [MarketEvent](#marketevent)

---

#### MarketEvent
**Category:** TypeScript Type Alias

```typescript
export type MarketEvent = {
  date: string;
  presaleDateTime: string;
  ids: string[];
  link: string;
  ticketer: string;
  venue: {
    name: string;
  };
  sharedCode?: string;
  splitAllocation?: {
    isActive?: boolean;
    type?: string;
    link?: string;
  };
};
```

**Source:** [shared/types/market.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/market.ts:1)

**Description:** Event details for a market including venue, presale information, and ticketing.

---

## Gate Domain Types

### CampaignGate
**Category:** TypeScript Type Alias

```typescript
export type CampaignGate = {
  campaignId?: string,
  card?: CampaignCardGate,
  inviteOnly?: FanIdentifier,
  linkedAccount?: CampaignLinkedAccountGate,
  linkedCampaign?: string,
  idv?: IDVTier
};
```

**Source:** [shared/types/gate.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/gate.ts:1)

**Description:** Campaign gating configuration (controls who can register).

**Gate Types:**
- **inviteOnly** - Requires fan to be on invite list
- **card** - Requires specific credit card type
- **linkedAccount** - Requires linked account (Verizon, Citi)
- **linkedCampaign** - Requires prior registration in another campaign
- **idv** - Requires identity verification

**References:**
- [CampaignCardGate](#campaigncardgate)
- [FanIdentifier](#fanidentifier)
- [CampaignLinkedAccountGate](#campaignlinkedaccountgate)
- [IDVTier](#idvtier)

---

#### CampaignGateType
**Category:** TypeScript Enum

```typescript
export enum CampaignGateType {
  campaignId = 'campaignId',
  card = 'card',
  inviteOnly = 'inviteOnly',
  linkedAccount = 'linkedAccount',
  linkedCampaign = 'linkedCampaign',
  idv = 'idv'
}
```

**Source:** [shared/types/gate.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/gate.ts:10)

---

#### CampaignCardGate
**Category:** TypeScript Type Alias

```typescript
export type CampaignCardGate =
'VISA' |
'AMEX' |
'DISCOVER' |
'MASTERCARD' |
'CAPITALONE' |
'CITI' |
'CHASE' |
'BARCLAYS' |
'BOFA';
```

**Source:** [shared/types/gate.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/gate.ts:19)

**Description:** Supported credit card types for card gating.

---

#### CampaignLinkedAccountGate
**Category:** TypeScript Type Alias

```typescript
export type CampaignLinkedAccountGate = 'VERIZON' | 'CITI';
```

**Source:** [shared/types/gate.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/gate.ts:30)

**Description:** Supported linked account providers.

---

#### FanIdentifier
**Category:** TypeScript Type Alias

```typescript
export type FanIdentifier = 'email' | 'globalUserId' | 'memberId';
```

**Source:** [shared/types/gate.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/gate.ts:32)

**Description:** Identifier types for invite-only gating.

---

#### IDVTier
**Category:** TypeScript Type Alias

```typescript
export type IDVTier = 'asu';
```

**Source:** [shared/types/gate.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/gate.ts:34)

**Description:** Identity verification tier levels.

---

## DynamoDB Entry Types

### DynamoDbEntry
**Category:** TypeScript Type Alias

```typescript
export type DynamoDbEntry = DynamoDbRecord<Entry>;
```

**Source:** [shared/types/dynamoDb.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dynamoDb.ts:91)

**Description:** Entry record stored in DynamoDB demand-table.

**References:**
- [DynamoDbRecord](#dynamodbrecord)
- [Entry](#entry) (internal type)

---

#### DynamoDbRecord
**Category:** TypeScript Generic Type

```typescript
export type DynamoDbRecord<T> = T & { PK: string, SK: string, type: string };
```

**Source:** [shared/types/dynamoDb.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dynamoDb.ts:89)

**Description:** Generic DynamoDB record wrapper adding partition key (PK), sort key (SK), and type.

---

#### DynamoDbOperation
**Category:** TypeScript Type Alias

```typescript
export type DynamoDbOperation = 'INSERT' | 'MODIFY' | 'REMOVE';
```

**Source:** [shared/types/dynamoDb.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dynamoDb.ts:87)

**Description:** DynamoDB stream event operation types.

---

#### EntryFields
**Category:** TypeScript Type Alias

```typescript
export type EntryFields = {
  email: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  phone: string;
  allow_artist_sms: boolean;
  allow_livenation: boolean;
  allow_marketing: boolean;
  markets: string[];
};
```

**Source:** [shared/types/dynamoDb.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dynamoDb.ts:1)

**Description:** Fan-submitted registration fields.

---

#### EntryOrigin
**Category:** TypeScript Type Alias

```typescript
export type EntryOrigin = {
  userAgent: string;
  forwardedFor: string;
  sessionId: string;
  ip: {
    address: string;
    country: string;
  };
  os: {
    type: string;
    version: string;
  };
  browser: {
    type: string;
    version: string;
  };
  nudetect: {
    forwarded_for: string;
    ip: string;
    pmd: string;
    user_agent: string;
    session_id: string;
    statusCode: string;
    statusMessage: string;
    score: number;
    scoreBand: string;
  }
};
```

**Source:** [shared/types/dynamoDb.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dynamoDb.ts:13)

**Description:** Request origin metadata including IP, browser, OS, and fraud detection (Nudetect).

---

#### Code
**Category:** TypeScript Type Alias

```typescript
export type Code = { id: string, marketId: string };
```

**Source:** [shared/types/dynamoDb.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dynamoDb.ts:54)

**Description:** Access code assignment for a specific market.

---

## Selection Domain Types

### SaveSelectionQueueMessage
**Category:** TypeScript Type Alias

```typescript
export type SaveSelectionQueueMessage = SelectionSQSMessage | SelectionRefreshSQSMessage;
```

**Source:** [shared/types/sqs/saveSelectionQueue.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/sqs/saveSelectionQueue.ts:23)

**Description:** Union type for selection queue messages (either new selection or refresh).

**Union Types:**
- [SelectionSQSMessage](#selectionsqsmessage)
- [SelectionRefreshSQSMessage](#selectionrefreshsqsmessage)

---

#### SelectionSQSMessage
**Category:** TypeScript Type Alias

```typescript
export type SelectionSQSMessage = AssignmentMessage &
{ type: SaveSelectionMessage.SELECTION, code?: string | undefined, codeConfigId?: string; };
```

**Source:** [shared/types/sqs/saveSelectionQueue.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/sqs/saveSelectionQueue.ts:18)

**Description:** Message for assigning a code to a selected winner.

**References:**
- [AssignmentMessage](#assignmentmessage)
- [SaveSelectionMessage](#saveselectionmessage) (enum)

---

#### SelectionRefreshSQSMessage
**Category:** TypeScript Type Alias

```typescript
export type SelectionRefreshSQSMessage = AssignmentMessage & { type: SaveSelectionMessage.SELECTION_REFRESH };
```

**Source:** [shared/types/sqs/saveSelectionQueue.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/sqs/saveSelectionQueue.ts:21)

**Description:** Message for refreshing an existing selection.

---

#### AssignmentMessage
**Category:** TypeScript Type Alias

```typescript
export type AssignmentMessage = {
  campaignId: string;
  globalUserId: string;
  marketId: string;
  eventIds: string[];
  userId: string;
  memberId?: string;
  date: {
    created: string;
  }
}
```

**Source:** [shared/types/sqs/saveSelectionQueue.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/sqs/saveSelectionQueue.ts:6)

**Description:** Base assignment information for code assignment and selection refresh.

---

#### SaveSelectionMessage
**Category:** TypeScript Enum

```typescript
export enum SaveSelectionMessage {
  SELECTION = 'selection',
  SELECTION_REFRESH = 'selectionRefresh'
}
```

**Source:** [shared/types/sqs/saveSelectionQueue.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/sqs/saveSelectionQueue.ts:1)

---

## Scoring Domain Types

### ScoringRecord
**Category:** TypeScript Type Alias

```typescript
export type ScoringRecord = {
  readonly userId: string;
  readonly globalUserId: string;
  readonly memberId: string;
  readonly name: Name;
  readonly email: string;
  readonly phone: string;
  readonly score?: number | undefined;
  readonly verdict: boolean;
  readonly locale: string;
  readonly marketIds: Array<string>;
  readonly codes?: Array<Code>;
};
```

**Source:** [shared/types/scoring.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/scoring.ts:11)

**Description:** Fan scoring and verdict record for winner selection.

**References:**
- [Code](#code-1)

---

#### Code (Scoring)
**Category:** TypeScript Type Alias

```typescript
export type Code = {
  readonly id: string;
  readonly marketId?: string;
}
```

**Source:** [shared/types/scoring.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/scoring.ts:6)

---

## Stats Domain Types

### UpsertStats
**Category:** TypeScript Type Alias

```typescript
export type UpsertStats = {
  readonly campaignId: string;
  readonly dateId: string;
  readonly status: StatsStatus;
  readonly marketId?: string;
  readonly count?: StatsRecordsCount;
  readonly error?: StatsErrorMessage | undefined;
};
```

**Source:** [shared/types/stats.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/stats.ts:1)

**Description:** Statistics record for selection processing status.

**References:**
- [StatsStatus](#statsstatus) (enum)
- [StatsRecordsCount](#statsrecordscount)
- [StatsErrorMessage](#statserrormessage)

---

#### StatsStatus
**Category:** TypeScript Enum

```typescript
export enum StatsStatus {
  PROCESSING = 'PROCESSING',
  FINISHED = 'FINISHED',
  FAILED = 'FAILED'
}
```

**Source:** [shared/types/stats.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/stats.ts:25)

---

#### StatsRecordsCount
**Category:** TypeScript Type Alias

```typescript
export type StatsRecordsCount = {
  readonly total?: number,
  readonly processed?: number,
  readonly failed?: number
};
```

**Source:** [shared/types/stats.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/stats.ts:19)

---

## Notification Domain Types

### NotificationRecord
**Category:** TypeScript Type Alias

```typescript
export type NotificationRecord = {
  PK: string;
  SK: string;
  type: RecordType;
  eventId: string;
  saleId?: string;
  saleName?: string;
  messageId?: string;
  groupId?: string;
  messageBody: string;
  contactMethod: string;
  phoneNumber: string;
  email: string;
  sendAttempts: number;
  status: Status
  notificationType: NotificationType;
  errors: NotificationError[];
  date: NotificationDate
}
```

**Source:** [shared/types/notification.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/notification.ts:44)

**Description:** Notification record for reminder emails.

**References:**
- [RecordType](#recordtype) (enum)
- [Status](#status)
- [NotificationType](#notificationtype) (enum)
- [NotificationError](#notificationerror)
- [NotificationDate](#notificationdate)

---

#### NotificationStatus
**Category:** TypeScript Enum

```typescript
export enum NotificationStatus {
  Created = 'CREATED',
  Triggered = 'TRIGGERED',
  Queued = 'QUEUED',
  Send = 'SENT',
  Delivered = 'DELIVERED',
  Failed = 'FAILED'
}
```

**Source:** [shared/types/notification.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/notification.ts:1)

---

#### NotificationType
**Category:** TypeScript Enum

```typescript
export enum NotificationType {
  Reminder = 'reminder'
}
```

**Source:** [shared/types/notification.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/notification.ts:10)

---

## Data Pipeline Types

### DataPipelineSchemaTypes
**Category:** TypeScript Interface

```typescript
export interface DataPipelineSchemaTypes {
  [DATA_PIPELINE_TYPES.CAMPAIGN]: Campaign;
  [DATA_PIPELINE_TYPES.EVENT_MAPPING]: EventMapping;
  [DATA_PIPELINE_TYPES.MARKET]: Market;
  [DATA_PIPELINE_TYPES.REGISTERED_MARKET]: RegisteredMarket;
  [DATA_PIPELINE_TYPES.REGISTRATION]: Registration;
}
```

**Source:** [shared/types/dataPipeline/index.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dataPipeline/index.ts:8)

**Description:** Mapping of data pipeline types to their schema definitions for Kafka publishing.

**References:**
- [DATA_PIPELINE_TYPES](#data_pipeline_types) (enum)
- [Campaign](#campaign-1) (data pipeline schema)
- [Market](#market-1) (data pipeline schema)
- [Registration](#registration) (data pipeline schema)

---

#### Campaign (Data Pipeline)
**Category:** TypeScript Interface

```typescript
export interface Campaign {
  campaignId: string
  name?: string | null
  categoryId?: string | null
  type?: string | null
  status?: string | null
  referenceTimezone?: string | null
  domain?: { site?: string | null } | null
  tour?: { name?: string | null } | null
  date?: { created?: string | null, updated?: string | null, ... } | null
  artist?: { id?: string | null, name?: string | null, ... } | null
  preferences?: ({...}[] | null)
  options?: {...} | null
  locales?: ({...}[] | null)
  image?: {...} | null
  dedupe: { id: string, timestamp: string }
}
```

**Source:** [shared/types/dataPipeline/campaign.d.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dataPipeline/campaign.d.ts:3)

**Description:** Campaign data pipeline schema (published to Kafka for analytics).

**Differences from Campaign type:**
- All fields except `campaignId` and `dedupe` are nullable
- Flattened structure for analytics
- Includes `dedupe` field for idempotent publishing

---

#### Market (Data Pipeline)
**Category:** TypeScript Interface

```typescript
export interface Market {
  campaignId: string
  marketId: string
  city?: string | null
  state?: string | null
  timezone?: string | null
  name?: string | null
  point?: { coordinates?: { latitude?: number, longitude?: number } } | null
  date?: { created?: string | null, updated?: string | null, ... } | null
  event?: { ids?: string[], venue?: string, ... } | null
  isAddedShow?: boolean | null
  isDeleted?: boolean | null
  dedupe: { id: string, timestamp: string }
}
```

**Source:** [shared/types/dataPipeline/market.d.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dataPipeline/market.d.ts:3)

**Description:** Market data pipeline schema (published to Kafka for analytics).

---

#### Registration (Data Pipeline)
**Category:** TypeScript Interface

```typescript
export interface Registration {
  campaignId: string
  globalUserId: string
  system?: { id?: string | null, databaseId?: string | null, ... } | null
  fields?: string | null
  score?: { account?: number, registration?: number, final?: number, ... } | null
  optIn?: { artistEmail?: boolean, artistSMS?: boolean } | null
  date?: { created?: string, updated?: string, fanModified?: string } | null
  ip?: { address?: string, city?: string, country?: string, ... } | null
  nudetect?: { sessionId?: string, statusCode?: string, score?: number, ... } | null
  phonescore?: { phoneType?: string, carrier?: string, location?: {...}, risk?: {...} } | null
  os?: { type?: string, version?: string } | null
  browser?: { type?: string, version?: string } | null
  isDeleted?: boolean | null
  dedupe: { id: string, timestamp: string }
}
```

**Source:** [shared/types/dataPipeline/registration.d.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/types/dataPipeline/registration.d.ts:3)

**Description:** Registration data pipeline schema (published to Kafka for analytics).

---

## Logging Types

### Logger
**Category:** TypeScript Type Alias

```typescript
export type Logger = {
  [key in LogLevels]: LeveledLogMethod
}
```

**Source:** [shared/Log.d.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/Log.d.ts:6)

**Description:** Winston logger with typed log level methods.

**References:**
- [LogLevels](#loglevels)

---

#### LogLevels
**Category:** TypeScript Type Alias

```typescript
type LogLevels =
  'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'
```

**Source:** [shared/Log.d.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/Log.d.ts:3)

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

**Source:** [shared/Log.d.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/Log.d.ts:10)

---

#### LoggerProvider
**Category:** TypeScript Type Alias

```typescript
export type LoggerProvider = (context: string) => Logger
```

**Source:** [shared/Log.d.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/Log.d.ts:16)

---

## Shared Enums

### CAMPAIGN_PREFERENCE
**Category:** TypeScript Enum

```typescript
export enum CAMPAIGN_PREFERENCE {
  EMAIL = 'email',
  PHONE = 'phone',
  NAME = 'name',
  ZIP = 'zip',
  OPT_IN = 'opt_in',
  MARKETS = 'markets',
  TICKET_COUNT = 'ticket_count',
  BOOLEAN_SELECT = 'boolean_select',
  FREEFORM_TEXT = 'freeform_text',
  CHECKLIST = 'checklist',
  PROMOTER_OPT_INS = 'promoterOptIns'
}
```

**Source:** [shared/enums.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/enums.ts:13)

**Description:** Campaign preference field types for registration forms.

---

### INELIGIBLE_REASON
**Category:** TypeScript Enum

```typescript
export enum INELIGIBLE_REASON {
  NOT_FOUND = 'CAMPAIGN_NOT_FOUND',
  CLOSED = 'CAMPAIGN_CLOSED',
  SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INVALID_ENTRY = 'INVALID_ENTRY',
  INELIGIBLE_ENTRY = 'INELIGIBLE_ENTRY',
  NO_INVITE = 'NO_INVITE',
  LINKED_ENTRY = 'LINKED_ENTRY',
  IDV_REQUIRED = 'IDV_REQUIRED'
}
```

**Source:** [shared/enums.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/enums.ts:27)

**Description:** Eligibility check failure reasons.

---

### DATA_PIPELINE_TYPES
**Category:** TypeScript Enum

```typescript
export enum DATA_PIPELINE_TYPES {
  CAMPAIGN = 'campaign',
  EVENT_MAPPING = 'eventMapping',
  MARKET = 'market',
  REGISTERED_MARKET = 'registeredMarket',
  REGISTRATION = 'registration'
}
```

**Source:** [shared/enums.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/enums.ts:38)

**Description:** Data pipeline message types for Kafka publishing.

---

### DYNAMO_EVENT_NAME
**Category:** TypeScript Enum

```typescript
export enum DYNAMO_EVENT_NAME {
  INSERT = 'INSERT',
  MODIFY = 'MODIFY',
  REMOVE = 'REMOVE'
}
```

**Source:** [shared/enums.ts](/Users/Brodie.Balser/Documents/TM/vf/registration/workers/shared/enums.ts:49)

**Description:** DynamoDB stream event types.

---

## Type Dependency Graph

```
Worker<Event, Result, Services>
  ├─ WorkerWithInputTransformation<Event, Result, Services>
  │   └─ AppParamsWithInputTransformation<Event, Services>
  │       └─ Services
  └─ WorkerWithoutInputTransformation<Event, Result, Services>
      └─ AppParamsWithoutInputTransformation<Event, Services>
          ├─ Correlation
          └─ Services

SQSBatchWorker<Message, Result, Services>
  └─ TransformedSQSRecord<Message>[]
      └─ SQSRecordExtensions
  └─ SQSBatchItemResultHandlerOutput<Result>
      └─ SQSBatchResponse (AWS Lambda)

KinesisWorker<Message, Result, Services>
  └─ TransformedKinesisMessage<Message>[]
  └─ KinesisBatchItemResultHandlerOutput<Result>
      └─ KinesisStreamBatchResponse (AWS Lambda)

Campaign
  ├─ Artist
  ├─ CampaignDates
  ├─ CampaignLocale
  ├─ Market
  │   └─ MarketEvent
  ├─ Preference
  │   └─ CAMPAIGN_PREFERENCE (enum)
  ├─ CampaignStyles
  ├─ CampaignImage
  ├─ CampaignOptions
  │   └─ CampaignGate
  │       ├─ CampaignCardGate
  │       ├─ FanIdentifier
  │       ├─ CampaignLinkedAccountGate
  │       └─ IDVTier
  ├─ Faqs
  ├─ Content
  │   └─ LocaleContent
  └─ CampaignStatus (enum)

DynamoDbEntry
  └─ DynamoDbRecord<Entry>
      ├─ EntryFields
      ├─ EntryOrigin
      └─ Code

SaveSelectionQueueMessage
  ├─ SelectionSQSMessage
  │   └─ AssignmentMessage
  └─ SelectionRefreshSQSMessage
      └─ AssignmentMessage

DataPipelineSchemaTypes
  ├─ Campaign (data pipeline)
  ├─ Market (data pipeline)
  └─ Registration (data pipeline)
```
