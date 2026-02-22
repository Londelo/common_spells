# API Contracts - reg-workers

## Overview

This repository contains AWS Lambda workers for the VerifiedFan registration system. The workers expose various internal APIs for fan eligibility checking, user data processing, entry replication, winner selection, and data pipeline publishing.

**Primary API Type:** Lambda Worker Functions (AppSync Resolver + Event-Driven SQS/DynamoDB/Kafka consumers)

---

## Worker APIs

### Registration Domain

#### checkEligibility (AppSync Resolver)

**Purpose:** Validates fan eligibility before registration entry submission

**Trigger:** AppSync Pipeline Function (GraphQL)

**Input Type:**
```typescript
{
  body: {
    slug: string                    // Campaign slug/identifier
    entry: Record<string, unknown>  // Registration entry fields (with optional idvToken)
    userInfo: {
      email: string
      phoneNumber: string
      firstName: string
      lastName: string
      globalUserId: string
      memberId?: string
      postalCode: string
      countryCode: string
      locale: string
      env: string
      isLoggedIn: string
    }
    doTransfer?: boolean            // Transfer from linked campaign
  }
}
```

**Output Type:**
```typescript
{
  isEligible: boolean
  reason?: INELIGIBLE_REASON        // If not eligible
  campaignId?: string
  fields?: Record<string, string | number | string[] | boolean>
  linkedCampaignId?: string
}
```

**Ineligibility Reasons:**
- `CAMPAIGN_NOT_FOUND` - Campaign doesn't exist
- `CAMPAIGN_CLOSED` - Campaign registration closed
- `INTERNAL_SERVER_ERROR` - Server error occurred
- `INVALID_ENTRY` - Entry fields failed validation
- `INELIGIBLE_ENTRY` - Entry doesn't meet requirements
- `NO_INVITE` - Invite-only campaign, no invite found
- `LINKED_ENTRY` - Already registered in linked campaign
- `IDV_REQUIRED` - Identity verification required

---

#### upsertUsers (SQS Batch Consumer)

**Purpose:** Batch upsert user information to User Service

**Trigger:** SQS Queue

**Input Type:**
```typescript
Array<TransformedSQSRecord<UserInfoMessage>>

// UserInfoMessage shape (inferred from service types)
{
  globalUserId: string
  email?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  // ... additional user fields
}
```

**Output Type:**
```typescript
{
  batchItemFailures: Array<{ itemIdentifier: string }>
  count: {
    received: number
    processed: number
    unprocessed: number
  }
}
```

---

### Replication Domain

#### enqueueEntries (DynamoDB Kinesis Stream Consumer)

**Purpose:** Filters entries needing replication and queues them for processing

**Trigger:** DynamoDB Stream (demand-table changes)

**Input Type:** DynamoDB Stream Records (INSERT, MODIFY, REMOVE operations)

**Output Type:**
```typescript
{
  in: number                        // Records processed
  rejected: number                  // Records rejected
  batchItemFailures: Array<{ itemIdentifier: string }>
}
```

---

#### saveEntries (SQS Batch Consumer)

**Purpose:** Replicates demand-table entries to Entry Service MongoDB

**Trigger:** SQS Queue (`saveEntriesQueue`)

**Input Type:**
```typescript
Array<TransformedSQSRecord<SaveEntryQueuePayload>>

// SaveEntryQueuePayload contains:
{
  entry: DynamoDbEntryRecord        // Entry data from DynamoDB
  operation: 'INSERT' | 'MODIFY' | 'REMOVE'
}
```

**Output Type:**
```typescript
{
  batchItemFailures: Array<{ itemIdentifier: string }>
  count: {
    received: number
    rejected: number
    failed: number
    upsertedCount: number
    deletedCount: number
  }
}
```

---

#### retryScore (SQS Batch Consumer)

**Purpose:** Refreshes user scores in Entry Service after failures

**Trigger:** SQS Queue

**Input Type:** Array of SQS records with retry scoring payloads

**Output Type:** SQS batch response with failure identifiers

---

### Selection Domain

#### enqueueMarketSelections (SDK Invoked)

**Purpose:** Processes market selections, reserves codes, and queues winner assignments

**Trigger:** Direct Lambda invocation (Step Function)

**Input Type:**
```typescript
{
  campaignId: string
  dateId: string
  marketId: string
}
```

**Output Type:**
```typescript
{
  campaignId: string
  marketId: string
  eventIds: string[]
  count: {
    queued: number
    failed: number
    batchItemFailures: Array<{ itemIdentifier: string }>
  }
}
```

---

#### saveSelections (SQS Batch Consumer)

**Purpose:** Assigns access codes to winners via Entry Service

**Trigger:** SQS Queue (`saveSelectionQueue`)

**Input Type:**
```typescript
Array<TransformedSQSRecord<{
  campaignId: string
  marketId: string
  eventIds: string[]
  scoringRecords: Array<ScoringRecord>
  codes?: Array<string>
}>>

// ScoringRecord:
{
  userId: string
  globalUserId: string
  memberId: string
  name: {
    first: string
    last: string
  }
  email: string
  phone: string
  score?: number
  verdict: boolean
  locale: string
  marketIds: string[]
  codes?: Array<{
    id: string
    marketId?: string
  }>
}
```

**Output Type:** SQS batch response with count metrics

---

#### refreshSelections (SQS Batch Consumer)

**Purpose:** Refreshes existing selections for a market

**Trigger:** SQS Queue

**Input Type:** Similar to saveSelections

**Output Type:** SQS batch response

---

#### markAssignedCodes (DynamoDB Kinesis Stream Consumer)

**Purpose:** Marks codes as assigned in Code Service after DynamoDB updates

**Trigger:** DynamoDB Stream (MODIFY events on demand-table)

**Input Type:** DynamoDB Stream Records

**Output Type:** Kinesis batch response with failure identifiers

---

### Data Pipeline Domain

#### processData (SQS Batch Consumer)

**Purpose:** Formats registration data and fans out to type-specific queues

**Trigger:** SQS Queue

**Input Type:** Array of data pipeline payloads

**Output Type:** SQS batch response

---

#### sendData (SNS → SQS Batch Consumer)

**Purpose:** Validates data against JSON schemas and publishes to Kafka

**Trigger:** SQS Queue (subscribed to SNS topic)

**Input Type:** Array of data pipeline messages (CAMPAIGN, EVENT_MAPPING, MARKET, REGISTERED_MARKET, REGISTRATION)

**Data Types:**

**CAMPAIGN:**
```typescript
{
  campaignId: string
  name?: string
  categoryId?: string
  type?: string
  subType?: string
  identifier?: string
  status?: string
  referenceTimezone?: string
  domain?: { site?: string }
  tour?: { name?: string }
  date?: {
    created?: string
    updated?: string
    open?: string
    close?: string
    presaleWindowStart?: string
    presaleWindowEnd?: string
  }
  artist?: {
    id?: string
    name?: string
    discoveryId?: string
    fanclubName?: string
  }
  preferences?: Array<{
    id?: string
    type?: string
    is_optional?: boolean
    additional?: Record<string, any>
  }>
  options?: {
    useGenericBranding?: boolean
    showAccessCode?: boolean
    automatedReminders?: boolean
    waitingRoomDuration?: number
    isLNAA?: boolean
  }
  dedupe: { id: string, timestamp: string }
}
```

**REGISTRATION:**
```typescript
{
  campaignId: string
  globalUserId: string
  system?: {
    id?: string
    databaseId?: string
    memberId?: string
  }
  fields?: string
  score?: {
    account?: number
    registration?: number
    final?: number
    tags?: string
  }
  optIn?: {
    artistEmail?: boolean
    artistSMS?: boolean
  }
  date?: {
    created?: string
    updated?: string
    fanModified?: string
  }
  ip?: {
    address?: string
    city?: string
    country?: string
    latitude?: string
    longitude?: string
    postalCode?: string
    region?: string
  }
  nudetect?: {
    sessionId?: string
    statusCode?: string
    score?: number
    scoreBand?: string
  }
  isDeleted?: boolean
  dedupe: { id: string, timestamp: string }
}
```

**Output Type:** SQS batch response

---

### Notification Domain

#### notificationGenerator (Scheduled)

**Purpose:** Generates reminder email notifications for campaigns

**Trigger:** EventBridge scheduled event

**Batch Size:** 15000 records per execution

---

#### getMarketsToNotify (SDK Invoked)

**Purpose:** Retrieves markets requiring notification

**Trigger:** Direct Lambda invocation

---

## Shared Types

### Campaign

```typescript
{
  type: 'registration'
  id: string
  domain: { site: string }
  artist: {
    discovery_id: string
    name: string
    adpUrl?: string
  }
  schema: { version: string }
  tour: { name: string }
  referenceTimezone: string
  date: {
    created: string
    updated: string
    open: string
    close: string
    presaleWindowStart: string
    presaleWindowEnd: string
    sendReminderEmails?: string[]
  }
  locales: Array<{ is_default: boolean, id: string }>
  markets: Market[]
  faqs: {
    landing: { open: string[], closed: string[] }
    confirmation: { open: string[], closed: string[], activePresale: string[] }
  }
  content: {
    'en-US': LocaleContent
    [locale: string]: LocaleContent
  }
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'PREVIEW'
  preferences: Array<Preference>
  style: CampaignStyles
  image: {
    main: { url: string }
    secondary?: { url: string }
    mobile?: { url: string }
    email?: { url: string }
  }
  options?: {
    gate?: CampaignGate
    waitingRoomDuration?: number
  }
}
```

### Market

```typescript
{
  id: string
  campaign_id: string
  name: string
  city: string
  state: string
  timezone: string
  date: {
    created: string
    updated: string
    notification?: string
    notified?: string
  }
  event: {
    date: string
    presaleDateTime: string
    ids: string[]
    link: string
    ticketer: string
    venue: { name: string }
    sharedCode?: string
    splitAllocation?: {
      isActive?: boolean
      type?: string
      link?: string
    }
  }
  accessCode?: string
  isAddedShow?: boolean
  promoterIds?: string[]
}
```

### CampaignGate

```typescript
{
  campaignId?: string
  card?: 'VISA' | 'AMEX' | 'DISCOVER' | 'MASTERCARD' | 'CAPITALONE' | 'CITI' | 'CHASE' | 'BARCLAYS' | 'BOFA'
  inviteOnly?: 'email' | 'globalUserId' | 'memberId'
  linkedAccount?: 'VERIZON' | 'CITI'
  linkedCampaign?: string
  idv?: 'asu'
}
```

### Preference

```typescript
{
  id: string
  type: 'email' | 'phone' | 'name' | 'zip' | 'opt_in' | 'markets' | 'ticket_count' | 'boolean_select' | 'freeform_text' | 'checklist' | 'promoterOptIns'
  is_optional: boolean
  additional: {
    maxLength?: number
    minLength?: number
    min?: number
    max?: number
    items?: string[]
  }
}
```

---

## Worker Middleware Types

All workers follow the middleware pattern with specific trigger types:

| Middleware Type | Description | Return Type |
|----------------|-------------|-------------|
| `appsyncResolver` | AppSync Pipeline Function | Custom result type |
| `sqsBatchConsumer` | SQS with batch item failures | `{ batchItemFailures: [...], count: {...} }` |
| `dynamodbKinesisConsumer` | DynamoDB stream via Kinesis | `{ batchItemFailures: [...] }` |
| `sdkInvoked` | Direct Lambda invocation | Custom result type |
| `scheduled` | EventBridge scheduled event | void or custom |

---

## Authentication & Authorization

- **AppSync Resolvers:** JWT token validation via middleware
- **Internal Workers:** AWS IAM-based invocation
- **Service Calls:** Uses TitanRequest pattern with OpenTelemetry tracing

---

## Error Handling

All SQS/Kinesis workers return partial failure responses:

```typescript
{
  batchItemFailures: Array<{ itemIdentifier: string }>
}
```

This enables AWS to retry only failed messages, not the entire batch.

---

## Configuration

Workers are registered in `configs/default.config.yml` with properties:
- `nameTag` - Short identifier for AWS resources
- `inventoryCode` - Repository and stack abbreviation
- `entryFile` - Entry point (typically `lambda`)
- `middlewareType` - Trigger type
- `stack` - Terraform stack name
- `batchSize` - Optional processing batch size
