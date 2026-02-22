# Use Cases & Workflows - Registration Workers

## Primary Use Cases

### Use Case 1: Fan Registers for Event Presale

**Actor**: Fan (end user via web application)

**Goal**: Submit registration for presale access to high-demand event

**Preconditions**:
- Campaign exists with `status: ACTIVE`
- Fan has valid Ticketmaster account (globalUserId)
- Campaign registration window is open

**Main Flow**:
1. Fan submits registration form with: email, name, phone, postal code, market selections, marketing preferences
2. AppSync GraphQL mutation `upsertEntry` triggers `checkEligibility` pipeline function
3. Worker fetches cached campaign from Redis
4. Worker validates campaign status is `ACTIVE` or `TRANSFERRING`
5. Worker validates campaign gate (invite-only check, IDV verification, linked campaign eligibility)
6. Worker validates entry fields against campaign requirements (required fields, format validation)
7. Worker returns eligibility decision with normalized entry fields or ineligibility reason
8. If eligible, AppSync resolver writes entry to DynamoDB `demand-table` with `needsReplication: true`
9. Entry propagates through replication pipeline to Entry Service (MongoDB)
10. User Service receives async update with fan profile data

**Postconditions**:
- Entry stored in DynamoDB and replicated to Entry Service
- Fan profile updated in User Service
- Entry available for selection process

**Business Rules Applied**:
- Campaign must be active to accept new registrations
- Fan must pass gate requirements (invite validation, IDV completion)
- Entry fields must match campaign field requirements
- Phone numbers normalized to E.164 format
- Markets must reference valid campaign markets

**Alternative Flows**:
- **Ineligible - Closed Campaign**: Return `reason: CAMPAIGN_CLOSED`
- **Ineligible - Not Invited**: Return `reason: NOT_INVITED` with gate type
- **Ineligible - IDV Incomplete**: Return `reason: IDV_NOT_VERIFIED`
- **Ineligible - Invalid Entry**: Return `reason: INVALID_ENTRY` with field detail

---

### Use Case 2: Campaign Manager Runs Winner Selection

**Actor**: Campaign Manager (admin user via selection tool) / Step Function (automated)

**Goal**: Select winners for oversubscribed market and assign access codes

**Preconditions**:
- Campaign status is `CLOSED` (registration window ended)
- Market has eligible registrations exceeding available inventory
- Code Service has sufficient code pool for market
- Selection criteria configured (selection ratio, market capacity)

**Main Flow**:
1. Campaign Manager triggers selection for specific market via Step Function
2. `enqueueMarketSelections` worker fetches eligible entry count from Entry Service
3. Worker reports campaign stats with `status: PROCESSING` and `total: eligibleCount`
4. Worker fetches unassigned scoring records for market (eligible fans ranked by score)
5. Worker validates scoring records (rejects records missing globalUserId)
6. Worker reserves codes from Code Service: calls `/campaignId/codes/reserve` with required count
7. Worker creates selection messages pairing `{ globalUserId, marketId, code }` for winners
8. Worker queues selection messages to `saveSelectionQueue` in batches
9. Worker reports final stats with `status: FINISHED`, `PROCESSED: selectedCount`, `FAILED: rejectedCount`
10. `saveSelections` worker processes queue: assigns codes via Entry Service `POST /campaignId/entries/codes`
11. Worker updates verdicts in DynamoDB: `verdict: true` for winners, `verdict: false` for losers
12. Worker enqueues verdict counts to `verdictReporterQueue` for stats aggregation
13. DynamoDB stream triggers `markAssignedCodes` worker
14. Worker notifies Code Service codes are assigned: `POST /campaignId/assign`

**Postconditions**:
- Winners have `verdict: true` and assigned access codes
- Losers have `verdict: false` with no codes
- Code Service marks codes as assigned (no longer available for other campaigns)
- Campaign stats reflect processed selection counts

**Business Rules Applied**:
- Selection based on fan score (priority algorithm)
- Code reservation must succeed before assignment (prevents overselling)
- TM ticketer markets use shared code for all winners
- Non-TM ticketers require unique code per winner
- Minimum code reserve count: 500 for non-TM markets
- Failed selections report with `FAILED` status

**Alternative Flows**:
- **Insufficient Codes**: Code Service returns error, selection aborts, reports `FAILED` status
- **Entry Service Timeout**: Retry code assignment 3 times, mark failed records in `batchItemFailures`
- **DynamoDB Write Failure**: Return failed verdict updates in `batchItemFailures` for SQS retry

---

### Use Case 3: System Replicates Entry Changes to Entry Service

**Actor**: System (automated via DynamoDB stream)

**Goal**: Maintain eventual consistency between DynamoDB (`demand-table`) and Entry Service (MongoDB)

**Preconditions**:
- Entry exists in DynamoDB `demand-table`
- Fan modified entry (indicated by `date.fanModified` timestamp) OR `needsReplication: true`
- DynamoDB stream enabled on table

**Main Flow**:
1. Fan updates registration (e.g., changes market selections) → DynamoDB MODIFY operation
2. DynamoDB stream emits change record to `enqueueEntries` worker
3. Worker filters records: keeps only fan-modified entries or entries with `needsReplication: true`
4. Worker normalizes stream record: extracts operation type (INSERT/MODIFY/REMOVE) and entry payload
5. Worker queues record to `saveEntriesQueue` with SQS messageId as `recordId`
6. `saveEntries` worker receives batched queue messages
7. Worker validates each change: fetches current state from `demand-table` to detect race conditions
8. Worker compares stream record timestamp vs current record timestamp
9. If current state differs (race condition), reject replication for that record
10. Worker splits validated records into `puts` (upserts) and `deletions`
11. Worker sends `puts` to Entry Service: `POST /campaignId/entries` (batch upsert, max 25 items)
12. Worker sends `deletions` to Entry Service: `DELETE /campaignId/entries` (batch delete)
13. Worker retries failed operations up to 3 times with exponential backoff
14. For successful replications, worker unflags `needsReplication` in DynamoDB
15. For permanent failures (3 retries exhausted), worker returns `batchItemFailures` for SQS retry

**Postconditions**:
- Entry Service (MongoDB) reflects current entry state from DynamoDB
- `needsReplication` flag cleared for successfully replicated entries
- Failed entries remain in SQS queue for retry

**Business Rules Applied**:
- Only replicate fan-modified changes (system changes skip replication)
- Validate operation against current state to prevent stale updates
- Retry failed replications 3 times before permanent failure
- Maintain `recordId` for SQS batch failure tracking
- Eventual consistency model (no immediate read-after-write guarantee)

**Alternative Flows**:
- **Race Condition Detected**: Skip replication, log warning, count as rejected
- **Entry Service Unavailable**: Retry 3 times, then return `batchItemFailures`
- **Validation Failure**: Reject record, log error, count as rejected
- **DynamoDB Read Failure**: Unable to validate, reject replication for safety

---

### Use Case 4: System Sends Presale Reminder Notifications

**Actor**: System (automated via EventBridge schedule + Step Function)

**Goal**: Notify selected winners 1 hour before presale with localized reminder message

**Preconditions**:
- Market presale date/time configured in MongoDB
- Market has `options.automatedReminders: true`
- Campaign status is `CLOSED`
- Selected fans have `verdict: true` and assigned codes
- Fans have confirmed US phone number (+1)

**Main Flow**:
1. **Planning Phase** (daily at midnight PT):
   - `planSends` worker queries MongoDB for markets with presales starting in 2-27 hours
   - Worker filters markets without `date.notification` set (not yet planned)
   - Worker filters for campaigns with `status: CLOSED` and `options.automatedReminders: true`
   - Worker fetches eligible entry counts from Entry Service (excludes international phones)
   - Worker calculates optimal notification time per market based on volume:
     - Target: 1 hour before presale
     - High volume (>target rate): Start earlier to complete sends on time
     - Normal volume: Center notifications around 1 hour before
   - Worker sets `date.notification` in MongoDB for each market with calculated trigger time
   - Worker adjusts timing to prevent overlap between consecutive presales

2. **Polling Phase** (every 5 minutes via Step Function):
   - `getMarketsToNotify` worker queries MongoDB for markets where `date.notification <= now`
   - Worker filters markets with presale at least 5 minutes in future
   - Worker identifies markets past presale window (cleanup) and unsets `date.notification`
   - Worker returns list of markets ready for notification generation

3. **Generation Phase** (Step Function Map state per market):
   - `notificationGenerator` worker receives market object
   - Worker checks if market already notified (`date.notified` exists) → skip if true
   - Worker fetches campaign details from Campaign Service
   - Worker queries MongoDB scoring collection for eligible fans:
     - Filter: `code.marketId = marketId` (has code for this market)
     - Filter: `phoneNumber` starts with "+1" (US confirmed number)
     - Filter: `verdict = true` (selected winner)
   - Worker generates notification records for each eligible fan:
     - Localized message body with presale date/time, access code, event link
     - Record format: `PK: fan:{globalUserId}`, `SK: asu#{campaignId}-{marketId}#reminder`
   - Worker writes notification records to DynamoDB `demand-table` in batches of 25
   - Worker filters out records without message bodies (invalid locale/missing data)
   - On success, worker marks market as notified: sets `date.notified` to prevent duplicates
   - On total failure, worker triggers PagerDuty incident

4. **Email Reminder Phase** (every 15 minutes):
   - `triggerReminderEmail` worker queries MongoDB campaigns for `date.sendReminderEmails <= now`
   - Worker selects earliest reminder date from `date.sendReminderEmails` array
   - Worker triggers Exports Service to generate email reminder files: `POST /exports`
   - Exports Service generates files and uploads to CRM team's S3 bucket
   - On success, worker removes processed date from `date.sendReminderEmails` array
   - Worker sets `date.triggeredEmailReminders` to track completion

**Postconditions**:
- SMS notification records written to DynamoDB (separate SMS worker sends via mobile service)
- Email reminder files delivered to CRM S3 bucket for distribution
- Markets marked as notified to prevent duplicate sends

**Business Rules Applied**:
- Notifications target 1 hour before presale (±30 minutes for high volume)
- Only notify fans with confirmed US phone numbers (+1)
- Only notify selected winners with assigned codes
- Prevent duplicate notifications via `date.notified` flag
- Email reminders trigger day before presale (separate from SMS)
- Cleanup mechanism: unset `date.notification` for markets past presale window

**Alternative Flows**:
- **Market Already Notified**: Skip generation, return success
- **Campaign Not Found**: Log error, skip market
- **No Eligible Fans**: Write zero records, mark as notified
- **DynamoDB Write Failure**: Retry batch, return failures in count
- **Total Failure**: Trigger PagerDuty incident for manual investigation

---

### Use Case 5: Analytics System Consumes Registration Data

**Actor**: Data Pipeline (automated via DynamoDB triggers + SQS)

**Goal**: Publish registration events to Kafka for downstream analytics and reporting

**Preconditions**:
- Campaign/market/registration data exists in MongoDB or DynamoDB
- Data pipeline enabled for campaign
- Kafka cluster available and authenticated

**Main Flow**:
1. Triggering system writes record to `dataQueue` with type and data payload:
   - Type: `CAMPAIGN`, `EVENT_MAPPING`, `MARKET`, `REGISTERED_MARKET`, or `REGISTRATION`
   - Data: Entity payload matching type schema
2. `processData` worker receives batched queue messages
3. Worker validates each record:
   - Check `type` is valid data pipeline type
   - Check `data` payload is non-empty
4. Worker groups records by validity (`valid` vs `invalid`)
5. Worker formats valid records using type-specific formatter:
   - Adds `recordId` for deduplication tracking
   - Transforms payload to match Kafka schema
6. Worker publishes formatted records to `dataSns` topic in batches
7. SNS fans out to type-specific SQS queues (one queue per data type)
8. `sendData` worker receives typed messages from SQS
9. Worker extracts record type from SQS message attributes
10. Worker validates each record against JSON schema for its type
11. Worker formats valid records into Kafka messages with deduplication identifiers
12. Worker publishes to corresponding Kafka topic using type-specific client:
    - `CAMPAIGN` → `campaign` topic
    - `REGISTRATION` → `registration` topic
    - etc.
13. Worker collects unprocessed messages (Kafka publish failures)
14. Worker returns `batchItemFailures` for failed records to enable SQS retry

**Postconditions**:
- Registration events available in Kafka for analytics consumers
- Schema-validated data ensures downstream reliability
- Failed publishes automatically retry via SQS

**Business Rules Applied**:
- All Kafka messages must pass JSON schema validation
- Invalid records rejected without retry (logged for investigation)
- Empty data payloads rejected without retry
- Deduplication identifiers prevent duplicate Kafka messages
- Fan-out via SNS → SQS enables type isolation and retry granularity

**Alternative Flows**:
- **Invalid Record Type**: Reject record, log error, skip Kafka publish
- **Empty Data Payload**: Reject record, log error, skip Kafka publish
- **Schema Validation Failure**: Reject record, log error, skip Kafka publish
- **Kafka Publish Failure**: Return `batchItemFailures`, SQS retries delivery
- **Kafka Client Unavailable**: Return all records in `batchItemFailures`

---

## User Journey Map

### Fan Journey - Registration to Presale Access

1. **Discovery** - Fan learns about event campaign via artist marketing, social media, email
2. **Registration** - Fan visits registration page, submits entry with personal details and market preferences
3. **Eligibility Check** - System validates fan eligibility in real-time (invite status, IDV verification)
4. **Confirmation** - Fan receives immediate confirmation of registration submission
5. **Waiting Period** - Campaign remains open for registration window (days to weeks)
6. **Selection** - Campaign closes, system runs winner selection process
7. **Notification** - Selected fans receive SMS/email notification with access code (1 hour before presale)
8. **Presale Access** - Fan uses access code to purchase tickets during presale window
9. **Purchase** - Fan completes ticket purchase, access code marked as redeemed

### Campaign Manager Journey - Campaign Lifecycle

1. **Campaign Setup** - Manager configures campaign in Campaign Service (markets, rules, dates)
2. **Registration Opens** - System begins accepting fan registrations
3. **Monitoring** - Manager monitors registration stats, eligible counts per market
4. **Registration Closes** - Campaign transitions to `CLOSED` status
5. **Selection Trigger** - Manager initiates selection process via Step Function
6. **Selection Processing** - System selects winners per market, assigns codes
7. **Notification Planning** - System calculates optimal notification timing
8. **Notification Delivery** - System sends reminders to selected fans
9. **Presale Event** - Fans access presale with codes
10. **Post-Event Analysis** - Analytics team reviews registration/selection data from Kafka

---

## Key Workflows

### Workflow 1: End-to-End Registration Flow

```
Fan Submits Entry
    ↓
AppSync: checkEligibility (pipeline function)
    ↓ (validates campaign, gate, entry fields)
Entry Written to DynamoDB demand-table
    ↓ (needsReplication: true)
DynamoDB Stream → enqueueEntries
    ↓ (filters fan-modified entries)
SQS saveEntriesQueue → saveEntries
    ↓ (validates against current state)
Entry Service: POST /campaignId/entries
    ↓ (batch upsert to MongoDB)
Entry Service: Unflags needsReplication in DynamoDB
    ↓
SQS userInfoQueue → upsertUsers
    ↓
User Service: Batch upsert fan profiles
```

### Workflow 2: Selection and Code Assignment

```
Campaign Manager Triggers Selection (Step Function)
    ↓
enqueueMarketSelections: Report stats (PROCESSING)
    ↓
Entry Service: Fetch eligible counts and scoring records
    ↓
Code Service: Reserve codes (/campaignId/codes/reserve)
    ↓
Queue to saveSelectionQueue (batch of selections)
    ↓
saveSelections: Assign codes via Entry Service
    ↓
Entry Service: POST /campaignId/entries/codes
    ↓
saveSelections: Update verdicts in DynamoDB
    ↓ (verdict: true for winners, false for losers)
DynamoDB Stream (MODIFY) → markAssignedCodes
    ↓
Code Service: Mark codes assigned (/campaignId/assign)
    ↓
enqueueMarketSelections: Report stats (FINISHED)
```

### Workflow 3: Notification Scheduling and Delivery

```
Daily Midnight PT: planSends scheduled trigger
    ↓
MongoDB Query: Markets with presales in 2-27 hours
    ↓ (filter: CLOSED campaigns, automatedReminders: true)
Entry Service: Fetch eligible entry counts per market
    ↓
Calculate notification times (target: 1 hour before presale)
    ↓
MongoDB Update: Set date.notification per market
    ↓
--- Polling Phase (every 5 minutes) ---
Step Function: getMarketsToNotify
    ↓
MongoDB Query: Markets where date.notification <= now
    ↓ (filter: presale at least 5 minutes in future)
Return list of markets ready for notification
    ↓
--- Generation Phase (Map state per market) ---
Step Function: notificationGenerator (per market)
    ↓
MongoDB Query: Fetch eligible fans (verdict: true, US phone, has code)
    ↓
Generate localized notification records
    ↓
DynamoDB: Write notification records (batch of 25)
    ↓
MongoDB Update: Set date.notified (prevent duplicates)
    ↓
--- Email Phase (every 15 minutes) ---
triggerReminderEmail: Query campaigns with sendReminderEmails <= now
    ↓
Exports Service: Generate email reminder files
    ↓
S3 Upload: CRM team bucket for distribution
    ↓
MongoDB Update: Remove processed date, set triggeredEmailReminders
```

### Workflow 4: Data Pipeline to Kafka

```
Trigger Event (campaign change, registration, market update)
    ↓
Write to dataQueue with type and data payload
    ↓
processData: Validate type and data presence
    ↓
Format records with type-specific formatter
    ↓
Publish batch to dataSns (SNS topic)
    ↓ (fan-out architecture)
SNS → Type-specific SQS queues
    ↓
sendData: Extract type from message attributes
    ↓
Validate records against JSON schema
    ↓
Kafka Client: Publish to topic (campaign, registration, market, etc.)
    ↓
Analytics Consumers: Process Kafka events for reporting
```

---

## Example Scenarios

### Scenario 1: High-Demand Event with 50,000 Registrations

**Context**: Major artist tour announcement, single market (Los Angeles), 500 available presale slots

**Flow**:
1. Campaign opens Monday, 50,000 fans register by Friday
2. Campaign Manager closes registration Friday evening
3. Campaign Manager triggers selection Saturday morning
4. System fetches 50,000 eligible scoring records from Entry Service
5. System reserves 500 codes from Code Service for Los Angeles market
6. System selects top 500 fans by score, assigns codes via Entry Service
7. System updates DynamoDB: 500 winners with `verdict: true`, 49,500 losers with `verdict: false`
8. System reports stats: `PROCESSED: 500`, `TOTAL: 50000`
9. Monday 9am PT presale: `planSends` calculates notification time
   - Volume: 500 fans, target rate: 1000/hour → can complete in 30 minutes
   - Notification time: Monday 9:30am (1 hour before 10:30am presale)
10. Monday 9:30am: `notificationGenerator` writes 500 notification records to DynamoDB
11. SMS worker sends 500 reminders over 30-minute window (separate system)
12. Monday 10:30am: Fans access presale with codes

**Outcome**: Fair selection, 500 fans notified 1 hour before presale, smooth presale access

---

### Scenario 2: Invite-Only Campaign with Linked Transfer

**Context**: VIP presale requiring invite, allows transfer from previous campaign

**Flow**:
1. Campaign configured with invite-only gate: list of 1,000 email addresses
2. Campaign also configured with linked campaign gate: prerequisite campaign XYZ
3. Fan A (invited) registers: `checkEligibility` validates email on invite list → eligible
4. Fan B (not invited, but registered in campaign XYZ) attempts to register with `doTransfer: true`
5. `checkEligibility` validates linked campaign gate: finds Fan B's entry in campaign XYZ → eligible
6. `checkEligibility` returns `isEligible: true` with `linkedCampaignId: XYZ`
7. AppSync resolver writes Fan B's entry with `linkedFrom: XYZ` attribute
8. Fan C (not invited, not in campaign XYZ) attempts to register → ineligible
9. `checkEligibility` returns `isEligible: false`, `reason: NOT_INVITED`, `detail: { gateType: 'invite' }`

**Outcome**: Invite-only access enforced, but transfer allowed for fans from prerequisite campaign

---

### Scenario 3: Race Condition Prevents Stale Replication

**Context**: Fan rapidly updates market selections, DynamoDB stream events overlap

**Flow**:
1. Fan submits entry at 10:00:00 with markets [A, B] → DynamoDB writes with `date.updated: 2024-01-01T10:00:00Z`
2. DynamoDB stream emits MODIFY event to `enqueueEntries` (event1)
3. Fan immediately updates to markets [A, C] at 10:00:05 → DynamoDB writes with `date.updated: 2024-01-01T10:00:05Z`
4. DynamoDB stream emits second MODIFY event (event2)
5. `saveEntries` processes event2 first (SQS ordering not guaranteed):
   - Validates: fetches current DynamoDB state showing markets [A, C] and `date.updated: 10:00:05`
   - Stream event shows markets [A, C] and `date.updated: 10:00:05` → match, proceed
   - Replicates markets [A, C] to Entry Service → success
6. `saveEntries` processes event1 later:
   - Validates: fetches current DynamoDB state showing markets [A, C] and `date.updated: 10:00:05`
   - Stream event shows markets [A, B] and `date.updated: 10:00:00` → mismatch (stale)
   - Rejects replication, logs warning, counts as rejected
7. Final state: Entry Service correctly has markets [A, C], not stale [A, B]

**Outcome**: Race condition detected, stale update prevented, data consistency maintained
