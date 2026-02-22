# Data Flow - reg-workers

## Primary Flow

The registration workers implement an event-driven data flow with five primary domains, each triggered by AWS events:

1. **Fan Registration** → User submits registration via AppSync → `checkEligibility` validates → Entry created in DynamoDB
2. **Entry Replication** → DynamoDB Stream → `enqueueEntries` filters → SQS → `saveEntries` replicates to Entry Service
3. **Winner Selection** → Step Function → `enqueueMarketSelections` reserves codes → SQS → `saveSelections` assigns codes
4. **Data Publishing** → SQS → `processData` formats → SNS fan-out → `sendData` publishes to Kafka
5. **Email Notifications** → EventBridge schedule → `planSends` / `triggerReminderEmail` send reminders

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Registration Domain                                │
└─────────────────────────────────────────────────────────────────────────────┘

  AppSync GraphQL
       │
       ▼
  checkEligibility (AppSync Resolver)
       │
       ├─→ Redis (campaign cache)
       ├─→ MongoDB (campaign data)
       ├─→ Entry Service (check gate / invite-only)
       │
       └─→ Returns: { isEligible, campaignId, fields }

  ┌─→ Fan submits entry → DynamoDB (demand-table)
  │                            │
  │                            ▼
  │                    DynamoDB Stream (INSERT/MODIFY)
  │                            │
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Replication Domain                                  │
└─────────────────────────────────────────────────────────────────────────────┘
  │
  ▼
enqueueEntries (DynamoDB Kinesis Stream Consumer)
  │
  ├─→ Filters records with needsReplication = true
  │
  ├─→ Enqueues to saveEntriesQueue (SQS)
  │
  ▼
saveEntries (SQS Batch Consumer)
  │
  ├─→ Validates operation against current DynamoDB state
  ├─→ Batch upsert/delete to Entry Service (MongoDB)
  ├─→ Unflags needsReplication in DynamoDB
  │
  └─→ Returns: { batchItemFailures, count }

  ┌─→ If Entry Service score update fails
  │
retryScore (SQS Consumer)
  │
  └─→ Refreshes user scores in Entry Service


┌─────────────────────────────────────────────────────────────────────────────┐
│                           Selection Domain                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  Step Function (Direct Invocation)
       │
       ▼
  enqueueMarketSelections (SDK Invoked)
       │
       ├─→ Fetches campaign/market data from Campaign Service
       ├─→ Reserves access codes from Code Service (batch)
       ├─→ Reports campaign stats (PROCESSING → FINISHED)
       ├─→ Enqueues selections to saveSelectionQueue (SQS)
       │
       └─→ Returns: { stats, errors }

  ┌─→ saveSelectionQueue (SQS)
  │
  ▼
saveSelections (SQS Batch Consumer)
  │
  ├─→ Assigns codes to winners via Entry Service
  ├─→ Updates verdicts in DynamoDB (demand-table)
  ├─→ Enqueues verdict counts to verdictReporterQueue
  │
  └─→ Returns: { batchItemFailures, count }

  ┌─→ DynamoDB Stream (MODIFY - verdict changes)
  │
markAssignedCodes (DynamoDB Kinesis Stream Consumer)
  │
  └─→ Marks codes as assigned in Code Service

  ┌─→ refreshSelectionQueue (SQS)
  │
refreshSelections (SQS Consumer)
  │
  └─→ Refreshes existing selections for a market


┌─────────────────────────────────────────────────────────────────────────────┐
│                        Data Pipeline Domain                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  dataQueue (SQS)
       │
       ▼
  processData (SQS Batch Consumer)
       │
       ├─→ Formats data by type (CAMPAIGN, MARKET, REGISTRATION)
       ├─→ Publishes to dataSns (SNS topic with type attribute)
       │
       └─→ Returns: { batchItemFailures, count }

  ┌─→ SNS fan-out to type-specific SQS queues
  │    (e.g., campaign-queue, market-queue, registration-queue)
  │
  ▼
sendData (SQS Batch Consumer)
  │
  ├─→ Validates data against JSON schemas (shared/types/dataPipeline/)
  ├─→ Fetches Kafka certificates from Secrets Manager
  ├─→ Publishes to Kafka topics (prd2011.dmnd.<type>)
  │
  └─→ Returns: { batchItemFailures, count }


┌─────────────────────────────────────────────────────────────────────────────┐
│                         Notification Domain                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  EventBridge Schedule (daily)
       │
       ▼
  notificationGenerator (Scheduled)
       │
       ├─→ Identifies campaigns needing reminders
       ├─→ Generates notification data (markets, users)
       │
       └─→ Returns: { marketCount, userCount }

  EventBridge Schedule (hourly)
       │
       ▼
  planSends (Scheduled)
       │
       ├─→ Fetches markets to notify via getMarketsToNotify
       ├─→ Plans email sends with rate limiting (targetRate: 10/sec)
       ├─→ Enqueues email jobs to User Service
       │
       └─→ Returns: { plannedCount, errors }

  EventBridge Schedule (configurable)
       │
       ▼
  triggerReminderEmail (Scheduled)
       │
       └─→ Triggers reminder emails via User Service
```

## Request/Response Cycle

### Registration Flow (checkEligibility)

```
1. Client → AppSync GraphQL
   Payload: { slug, entry, userInfo, doTransfer }

2. AppSync → checkEligibility Lambda
   Middleware: correlation → tracing → transformAppSyncInput → services → resultHandler

3. checkEligibility Handler
   ├─→ Redis.get(`campaign:${slug}`)
   │   └─→ Cache hit? Return cached campaign
   │       Cache miss? ▼
   │
   ├─→ MongoDB.campaigns.findOne({ slug })
   │   └─→ Cache campaign in Redis (TTL: 1 hour)
   │
   ├─→ validateCampaign(campaign)
   │   └─→ Check status (OPEN), check dates (open → close)
   │
   ├─→ validateGate(gate, userInfo)
   │   └─→ If invite-only: Entry Service.checkInvite(campaignId, email)
   │
   ├─→ validateEntry(campaign, entry)
   │   └─→ Validate required fields, field types, field constraints
   │
   └─→ Return: { isEligible, campaignId, fields, linkedCampaignId? }

4. AppSync → Client
   Response: { isEligible, campaignId, fields, reason? }
```

### Replication Flow (saveEntries)

```
1. DynamoDB (demand-table) → DynamoDB Stream
   Event: INSERT / MODIFY / REMOVE
   Payload: { newImage, oldImage, eventName, keys }

2. DynamoDB Stream → enqueueEntries Lambda
   Middleware: correlation → tracing → transformDynamoDBKinesisRecords → services → batchItemResultHandler

3. enqueueEntries Handler
   ├─→ Filter records: needsReplication === true
   │
   └─→ SQS.sendMessageBatch(saveEntriesQueue, filteredRecords)

4. saveEntriesQueue (SQS) → saveEntries Lambda
   Middleware: correlation → tracing → transformSQSRecords → services → authentication → batchItemResultHandler

5. saveEntries Handler
   ├─→ normalizeRecords(input)
   │   └─→ Extract entry from newImage (INSERT/MODIFY) or oldImage (REMOVE)
   │
   ├─→ validateOperation(normalizedRecords)
   │   └─→ Fetch current DynamoDB state and compare with stream event
   │       (prevents race conditions)
   │
   ├─→ splitByOperations(validRecords)
   │   └─→ Group by operation: { puts, deletions }
   │
   ├─→ processEntries(entries)
   │   ├─→ Entry Service.batchUpsert(puts) [max 25 per request]
   │   └─→ Entry Service.batchDelete(deletions) [max 25 per request]
   │
   ├─→ DynamoDB.updateItem(demand-table, { needsReplication: false })
   │
   └─→ Return: { batchItemFailures, count }

6. SQS receives batchItemFailures → Retries failed messages
```

### Selection Flow (enqueueMarketSelections)

```
1. Step Function → Direct Lambda Invocation
   Payload: { campaignId, marketId, selectionCount }

2. Step Function → enqueueMarketSelections Lambda
   Middleware: correlation → tracing → services → authentication → resultHandler

3. enqueueMarketSelections Handler
   ├─→ Campaign Service.getCampaign(campaignId)
   ├─→ Campaign Service.getMarket(marketId)
   │
   ├─→ Code Service.reserveCodes({ campaignId, marketId, count })
   │   └─→ Reserves access codes (batch: 20,000)
   │
   ├─→ Campaign Service.reportCampaignStats({ status: PROCESSING })
   │
   ├─→ Format selections (winner entries + reserved codes)
   │
   ├─→ SQS.sendMessageBatch(saveSelectionQueue, selections)
   │   └─→ Batch size: 25 messages per request
   │
   └─→ Campaign Service.reportCampaignStats({ status: FINISHED })

4. saveSelectionQueue (SQS) → saveSelections Lambda
   Middleware: correlation → tracing → transformSQSRecords → services → authentication → batchItemResultHandler

5. saveSelections Handler
   ├─→ Entry Service.assignCodes({ campaignId, entries })
   │   └─→ Assigns codes to winner entries (batch: 25 per request)
   │
   ├─→ DynamoDB.batchWriteItem(demand-table, verdictUpdates)
   │   └─→ Updates verdict (WINNER, LOSER, WAITLIST)
   │
   ├─→ SQS.sendMessage(verdictReporterQueue, verdictCounts)
   │
   └─→ Return: { batchItemFailures, count }

6. DynamoDB Stream (MODIFY) → markAssignedCodes Lambda
   Middleware: correlation → tracing → transformDynamoDBKinesisRecords → services → batchItemResultHandler

7. markAssignedCodes Handler
   ├─→ Filter records: verdict changed to WINNER
   │
   └─→ Code Service.markAssigned({ campaignId, codes })
```

### Data Pipeline Flow (processData → sendData)

```
1. dataQueue (SQS) → processData Lambda
   Payload: { type, data }
   Types: CAMPAIGN, MARKET, REGISTRATION, EVENT_MAPPING, REGISTERED_MARKET

2. processData Handler
   ├─→ Format data by type (formatCampaignArtifacts, formatMarketArtifacts, etc.)
   │
   └─→ SNS.publish(dataSns, { data, attributes: { type } })

3. SNS fan-out → type-specific SQS queues
   (SNS subscription filters by message attributes)

4. Type-specific queue → sendData Lambda
   Middleware: correlation → tracing → transformSQSRecords → services → batchItemResultHandler

5. sendData Handler
   ├─→ Validate data against JSON schema (shared/types/dataPipeline/<type>.d.ts)
   │
   ├─→ Secrets Manager.getSecret(kafkaCertSecret)
   │   └─→ Fetches TLS certificate for Kafka authentication
   │
   ├─→ Kafka.producer.send({
   │     topic: prd2011.dmnd.<type>,
   │     messages: [{ key, value }]
   │   })
   │
   └─→ Return: { batchItemFailures, count }
```

### Notification Flow (planSends)

```
1. EventBridge Schedule (hourly) → planSends Lambda
   Middleware: correlation → tracing → services → authentication → resultHandler

2. planSends Handler
   ├─→ Direct invocation: getMarketsToNotify()
   │   └─→ Returns: { marketIds, campaignIds }
   │
   ├─→ For each market:
   │   ├─→ Entry Service.getEntriesByMarket(marketId)
   │   │   └─→ Returns: { entries[] }
   │   │
   │   ├─→ Rate limiting: Batch entries by targetRate (10/sec)
   │   │
   │   └─→ User Service.enqueueEmailJobs({
   │         campaignId, marketId, entries, templateId
   │       })
   │
   └─→ Return: { plannedCount, errors }
```

## State Management

### DynamoDB (demand-table)

**Primary State Store**: Fan registration entries and verdicts.

**Schema**:
```typescript
{
  PK: 'ENTRY#<campaignId>#<globalUserId>',
  SK: 'ENTRY',
  campaignId: string,
  globalUserId: string,
  entry: { ...fields },
  verdict: 'PENDING' | 'WINNER' | 'LOSER' | 'WAITLIST',
  accessCode?: string,
  needsReplication: boolean,
  createdAt: string,
  updatedAt: string
}
```

**Streams Enabled**: Captures INSERT, MODIFY, REMOVE events for replication and side effects.

### Redis (Campaign Cache)

**Purpose**: Cache campaign data to reduce MongoDB load and improve response times.

**Keys**:
- `campaign:<slug>` → Campaign object (TTL: 1 hour)
- `campaign:<id>` → Campaign object (TTL: 1 hour)

**Cache Strategy**: Cache-aside pattern (read-through with fallback to MongoDB).

### MongoDB (Campaigns Database)

**Purpose**: Authoritative source for campaign configuration.

**Collections**:
- `campaigns` → Campaign definitions (name, slug, dates, status, gates)
- `markets` → Market definitions (event, venue, pricing tiers)
- `gates` → Eligibility gates (invite-only, geo-restrictions)

**Access Pattern**: Read-only from workers (writes via Campaign Service).

### SQS Queues (Asynchronous Processing)

**Queues**:
- `saveEntriesQueue` → Replication jobs (DynamoDB → Entry Service)
- `saveSelectionQueue` → Selection jobs (code assignment)
- `dataQueue` → Data pipeline jobs (Kafka publishing)
- `refreshSelectionQueue` → Selection refresh jobs
- `retryScoreQueue` → Score retry jobs
- `userInfoQueue` → User info upsert jobs

**Dead Letter Queues**: Each queue has a DLQ for failed messages (max 3 retries).

### Kafka Topics (Analytics Events)

**Topics**:
- `prd2011.dmnd.campaigns` → Campaign state changes
- `prd2011.dmnd.markets` → Market state changes
- `prd2011.dmnd.registrations` → Registration entries
- `prd2011.dmnd.event-mappings` → Event mappings
- `prd2011.dmnd.registered-markets` → Registered market stats

**Schema Registry**: Kafka Schema Registry enforces data schemas for each topic.

## Event Processing

### Event Source Triggers

| Event Source | Workers | Trigger Type | Batch Size |
|--------------|---------|--------------|------------|
| AppSync | checkEligibility | Synchronous (pipeline resolver) | 1 |
| DynamoDB Streams | enqueueEntries, markAssignedCodes | Asynchronous | 100 |
| SQS | saveEntries, saveSelections, processData, sendData, etc. | Asynchronous | 10-25 |
| EventBridge | notificationGenerator, planSends, triggerReminderEmail | Scheduled | 1 |
| Step Function | enqueueMarketSelections | Direct invocation | 1 |

### Retry and Error Handling

**SQS Batch Item Failures**:
- Workers return `{ batchItemFailures: [{ itemIdentifier: messageId }] }`
- SQS retries only failed messages (not entire batch)
- After 3 failures → message moved to DLQ

**DynamoDB Stream Retry**:
- Lambda retries failed records automatically
- After max retries → records sent to DLQ (enqueueEntriesDlq, markAssignedCodesDlq)

**HTTP Service Retry**:
- TitanRequest client retries transient errors (429, 503) with exponential backoff
- After 3 retries → worker returns failure (triggers SQS/DDB retry)

**Kafka Publish Retry**:
- Kafka producer retries on network errors
- After max retries → message marked as failed (returned in batchItemFailures)

## External Integrations

| Integration | Direction | Purpose | Authentication |
|-------------|-----------|---------|----------------|
| Campaign Service | Read/Write | Campaign/market configuration, stats reporting | JWT (app-to-app) |
| Entry Service | Read/Write | Entry replication, code assignment, queries | JWT (app-to-app) |
| User Service | Read/Write | User info upsert, email job scheduling | JWT (app-to-app) |
| Code Service | Read/Write | Code reservation, assignment, marking | JWT (app-to-app) |
| Export Service | Read | Export data retrieval | JWT (app-to-app) |
| DynamoDB (demand-table) | Read/Write | Entry storage, verdict updates | IAM role |
| Redis (campaign cache) | Read/Write | Campaign caching | No auth (VPC) |
| MongoDB (campaigns) | Read | Campaign/market queries | Username/password |
| Kafka (analytics) | Write | Event publishing (data pipeline) | TLS certificate (mTLS) |
| Secrets Manager | Read | Kafka certificate retrieval | IAM role |
| SQS | Read/Write | Queue operations (send, receive, delete) | IAM role |
| SNS | Write | Topic publishing (data fan-out) | IAM role |

**Data Flow Summary**:
- **Inbound**: AppSync (GraphQL), DynamoDB Streams, SQS, EventBridge, Step Functions
- **Outbound**: HTTP services (Campaign, Entry, User, Code), Kafka, SQS, SNS, DynamoDB, Redis, MongoDB
- **Authentication**: JWT for HTTP services, IAM for AWS services, TLS certificates for Kafka
