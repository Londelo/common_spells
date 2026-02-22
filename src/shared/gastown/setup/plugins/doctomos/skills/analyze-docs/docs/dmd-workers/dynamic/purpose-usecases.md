# Use Cases & Workflows - dmd-workers

## Primary Use Cases

### Use Case 1: Fan Receives Ticket Sale Reminder (Happy Path)

**Actor**: Ticketed event fan who opted in for notifications

**Goal**: Receive timely notification before ticket sale starts so they can purchase tickets

**Preconditions**:
- Fan has registered for event notifications
- Event data exists in Ticketmaster Discovery API
- Sale start time is within 30 minutes
- Event is not suppressed (supported artist, valid sale type, supported country)

**Main Flow**:
1. **Schedule Check** - System queries cached sales data for current 30-minute window
2. **Event Validation** - System fetches event details from Discovery API, validates against suppression rules
3. **Cache Update** - Event details cached in DynamoDB for future lookups
4. **URL Shortening** - Short URL created via Bitly for SMS compatibility
5. **Notification Generation** - System queries demand records, generates personalized messages per fan preference (SMS/email)
6. **Delivery** - Notification written to DynamoDB, triggering stream consumer
7. **Send** - SMS/email sent via SMS Service with retry logic
8. **Confirmation** - Status updates flow back via Kinesis, marking notification as DELIVERED

**Postconditions**:
- Fan receives notification 30 minutes before sale starts
- Notification record marked DELIVERED in database
- Fan clicks short URL and lands on ticket purchase page

**Business Rules Applied**:
- Notifications sent only in scheduled 30-minute windows
- Maximum 3 delivery attempts for transient failures
- Duplicate prevention via DynamoDB conditional writes
- Message localized per event locale

---

### Use Case 2: Bulk Notification Generation for Major Event

**Actor**: System scheduler (automated)

**Goal**: Generate and deliver thousands of notifications for high-demand event sale

**Preconditions**:
- Popular event (e.g., Taylor Swift, Beyoncé) with 10,000+ opt-ins
- Sale scheduled for upcoming window
- Event cached with short URL already available

**Main Flow**:
1. **Scheduler Trigger** - EventBridge triggers notificationScheduler at 30-minute interval
2. **Sale Query** - System queries all sales in time window, finds major event sale
3. **Batch Processing** - Event details fetched once, shared across all notifications
4. **Parallel Generation** - 5,000 notifications generated in parallel batches
5. **Conditional Write** - Each notification written with conditional check to prevent duplicates
6. **Stream Processing** - DynamoDB stream triggers notificationSend worker
7. **Serial Delivery** - Notifications sent serially to SMS service with rate limiting
8. **Status Tracking** - Delivery status tracked per notification

**Postconditions**:
- All eligible fans receive notifications
- System processes 10,000+ notifications within 10-minute window
- Failed notifications logged for retry

**Business Rules Applied**:
- Batch size limits enforced (5,000 parallel writes)
- Deduplication per fan+sale+contact method
- Retry logic for transient failures
- Failed attempts logged with error details

---

### Use Case 3: Handle Failed SMS Delivery with Retry

**Actor**: System (automated retry logic)

**Goal**: Retry failed SMS delivery for transient errors without exceeding max attempts

**Preconditions**:
- Notification created and triggered
- SMS service returns 500 error or retryable error code
- Notification has fewer than 3 send attempts

**Main Flow**:
1. **Initial Send** - notificationSend worker calls SMS service
2. **Failure Detection** - SMS service returns 500 status code
3. **Status Update** - Worker updates notification record with error details, increments sendAttempts
4. **Stream Trigger** - DynamoDB stream re-triggers notificationSend worker
5. **Retry Attempt** - Worker checks sendAttempts count, attempts delivery again
6. **Success** - Second attempt succeeds, notification marked TRIGGERED
7. **Delivery Confirmation** - SMS service sends status update via Kinesis, final status DELIVERED

**Postconditions**:
- Notification eventually delivered
- Retry count logged (sendAttempts = 2)
- Delivery status timeline preserved

**Business Rules Applied**:
- Maximum 3 send attempts enforced
- Retryable errors identified by status code or specific error messages
- Non-retryable errors (invalid phone, blocked) immediately fail
- Error history preserved in notification record

---

### Use Case 4: Suppress Notification for Registration Sale

**Actor**: System (automated suppression logic)

**Goal**: Prevent notifications for registration-only sales that don't require reminders

**Preconditions**:
- Event with sale type containing "registration" keyword
- Fans have opted in for notifications

**Main Flow**:
1. **Schedule Check** - notificationScheduler queries sales in window
2. **Event Fetch** - GetAndCacheEventDetails retrieves event from Discovery API
3. **Sale Type Analysis** - System parses sale names, identifies "registration" keyword
4. **Suppression Applied** - Event marked as suppressed (isSuppressed: true)
5. **Early Exit** - No notifications generated for suppressed sale
6. **Logging** - Suppressed sale logged for monitoring

**Postconditions**:
- No notifications sent to fans
- Sale recorded as suppressed in logs
- Fans do not receive unnecessary reminders

**Business Rules Applied**:
- Sales containing "registration" keyword are suppressed
- Suppressed artist IDs blocked (configured list)
- Non-supported countries suppressed by default
- Classification filters (music/theater only)

---

### Use Case 5: Generate Short URL for New Event

**Actor**: System (automated URL shortening)

**Goal**: Create shortened URL for event to fit SMS character limits

**Preconditions**:
- New event cached in DynamoDB
- Event record missing shortUrl field
- Event ID written to SQS queue

**Main Flow**:
1. **Stream Trigger** - demandStreamToSqs consumes DynamoDB stream
2. **SQS Write** - Event ID written to shortUrlQueue
3. **Queue Consumer** - shortenEventUrl worker processes SQS message
4. **Event Lookup** - Worker fetches event from DynamoDB cache
5. **Bitly Request** - Worker calls Bitly API with event URL
6. **Cache Update** - Short URL written back to event record in DynamoDB
7. **Availability** - Short URL available for notification generation

**Postconditions**:
- Event record contains shortUrl field
- Short URL (e.g., bit.ly/3xYZ) ready for SMS messages
- Original URL preserved for reference

**Business Rules Applied**:
- Delay introduced to avoid Bitly rate limits
- Failed shortening retries up to 2 times
- Event notifications blocked until short URL available

---

### Use Case 6: Query Event Details via GraphQL API

**Actor**: External client (mobile app, web frontend)

**Goal**: Fetch real-time event details including sales, venues, artists

**Preconditions**:
- Client authenticated with AppSync
- Valid event ID provided

**Main Flow**:
1. **GraphQL Request** - Client queries eventDetails with event ID and market ID
2. **Lambda Resolver** - AppSync triggers eventDetails worker
3. **Cache Check** - Worker queries DynamoDB for cached event
4. **Cache Miss** - Event not found, worker calls Discovery API
5. **Normalization** - Event data normalized and enriched
6. **Cache Write** - Event stored in DynamoDB for future lookups
7. **Response** - Formatted event details returned to client

**Postconditions**:
- Client receives event details (artist, venue, sales, dates)
- Event cached for future queries
- Response time < 500ms

**Business Rules Applied**:
- Cache-first strategy (DynamoDB before Discovery API)
- Country code defaults to TM_US if not provided
- Error handling for invalid event IDs
- Suppression status included in response

---

### Use Case 7: Update Notification Status from SMS Service

**Actor**: SMS Service (external system)

**Goal**: Track SMS delivery status (queued, sent, delivered, failed)

**Preconditions**:
- Notification triggered and sent to SMS service
- SMS service posts status update to Kinesis stream

**Main Flow**:
1. **SMS Status Event** - SMS service publishes status update to Kinesis
2. **Stream Consumer** - smsStatusConsumer worker processes Kinesis record
3. **Status Extraction** - Worker parses status and timestamps from event payload
4. **Batch Update** - Worker updates notification records in DynamoDB (batch of 25)
5. **Preliminary Timestamps** - Worker updates preliminary delivery timestamps
6. **Final Status** - Notification record reflects current delivery state

**Postconditions**:
- Notification status updated (e.g., QUEUED → SENT → DELIVERED)
- Timestamps preserved (date.queued, date.sent, date.delivered)
- Delivery timeline available for analytics

**Business Rules Applied**:
- Status transitions follow valid state machine
- Timestamps preserved for each state
- Failed status includes error details
- Batch processing for efficiency

## User Journey Map

**Fan Discovers Event → Opts In → Receives Notification → Purchases Tickets**

1. **Discovery** - Fan browses Ticketmaster for favorite artist's tour
2. **Opt-In** - Fan enables "Remind Me" notifications for specific event
3. **Registration** - Fan details (phone/email, event preference) stored in demand system
4. **Wait Period** - Days/weeks pass until sale date approaches
5. **Notification Generated** - System detects upcoming sale, generates personalized reminder
6. **Delivery** - Fan receives SMS/email 30 minutes before sale starts
7. **Action** - Fan clicks short URL in notification
8. **Purchase** - Fan lands on Ticketmaster purchase page, buys tickets
9. **Success** - Fan attends event, positive experience increases brand loyalty

## Key Workflows

### 1. Notification Lifecycle Workflow

**Event-Driven Pipeline: Sale Scheduled → Notification Generated → Delivered → Confirmed**

```
Scheduler (every 30min)
  ↓
notificationScheduler: Query sales in window
  ↓
GetAndCacheEventDetails: Fetch event from Discovery API → Cache in DynamoDB
  ↓
shortenEventUrl: Generate short URL via Bitly → Update cache
  ↓
notificationGenerator: Query demand records → Generate personalized messages → Write to DynamoDB
  ↓ (DynamoDB Stream trigger)
notificationSend: Send via SMS service → Update status
  ↓ (Kinesis stream from SMS service)
smsStatusConsumer: Process delivery updates → Update final status
```

### 2. Event Caching Workflow

**API-First Strategy: Fetch from Discovery → Normalize → Cache → Reuse**

```
Trigger: AppSync query OR scheduled sale
  ↓
Check DynamoDB cache
  ↓
Cache Hit? → Return cached data
  ↓
Cache Miss? → Fetch from Discovery API
  ↓
Normalize event data (sales, venues, artists)
  ↓
Apply suppression rules
  ↓
Write to DynamoDB cache
  ↓
Enqueue short URL generation (if missing)
  ↓
Return event details
```

### 3. Error Handling and Retry Workflow

**Resilient Delivery: Attempt → Detect Failure → Classify → Retry or Fail**

```
notificationSend: Attempt SMS delivery
  ↓
SMS Service Response?
  ↓
Success → Update status to TRIGGERED → Track delivery via Kinesis
  ↓
Transient Error (500, timeout)? → Update sendAttempts → Re-trigger via DynamoDB stream
  ↓
sendAttempts < 3? → Retry delivery
  ↓
sendAttempts >= 3? → Mark as FAILED → Log error
  ↓
Permanent Error (invalid number)? → Mark as FAILED immediately → No retry
```

### 4. Bulk Processing Workflow

**High-Volume Sale: Schedule → Batch Generate → Parallel Deliver**

```
notificationScheduler: Detect major event sale
  ↓
Fetch event details (single API call)
  ↓
Query demand records for event (thousands of fans)
  ↓
Batch generate notifications (5,000 parallel writes)
  ↓
DynamoDB stream fans out to notificationSend workers
  ↓
Serial delivery to SMS service (rate-limited)
  ↓
Status tracking via Kinesis
  ↓
Monitor success/failure metrics
```

## Example Scenarios

### Scenario 1: Premium User - Verified Fan Sale Reminder

**Context**: User verified for Taylor Swift Verified Fan presale

- **Trigger**: Sale starts at 10:00 AM PST
- **Notification Window**: 9:30-10:00 AM PST
- **Process**: notificationScheduler runs at 9:30 AM → Event fetched from cache → Message generated: "It's almost time! Tickets for Taylor Swift Verified Fan Presale in Los Angeles will be going on sale at 10:00 AM PST. Get your tickets with Ticketmaster: bit.ly/3xYZ"
- **Delivery**: SMS sent at 9:31 AM via SMS service
- **Outcome**: User receives notification, clicks link at 9:50 AM, purchases tickets at 10:00 AM

### Scenario 2: Public Sale with Multiple Contact Methods

**Context**: User opted for both SMS and email for public sale

- **Event**: Beyoncé Renaissance Tour - Los Angeles
- **Sale Type**: Public sale
- **Process**: Two notifications generated (SMS + email) → SMS sent immediately, email queued → Both delivered within 2 minutes
- **Message**: SMS omits presale name ("It's almost time! Tickets for Beyoncé in Los Angeles will be going on sale at 10:00 AM..."), email includes formatted template with event poster
- **Outcome**: User receives both, clicks SMS link (faster), buys tickets

### Scenario 3: Failed Delivery - Invalid Phone Number

**Context**: User changed phone number after opting in

- **Trigger**: Notification generated for upcoming sale
- **Attempt 1**: SMS service returns "Invalid phone number" error
- **Decision**: Error classified as non-retryable (permanent failure)
- **Result**: Notification immediately marked FAILED, no retry
- **Logging**: Error logged with reason: "Invalid phone number"
- **User Impact**: User does not receive notification, must manually check sale time

### Scenario 4: Suppressed Artist - No Notification Sent

**Context**: Event for suppressed artist (e.g., Coldplay)

- **Trigger**: notificationScheduler detects sale in window
- **Process**: GetAndCacheEventDetails fetches event → Artist ID matches suppressed list → Event marked isSuppressed: true
- **Decision**: No notifications generated
- **Outcome**: Fans do not receive reminders (intentionally suppressed per business rule)

### Scenario 5: High-Volume Event - 50,000 Notifications

**Context**: Beyoncé tour announcement, 50,000 fans opted in

- **Trigger**: Sale starts at 12:00 PM EST
- **Notification Window**: 11:30-12:00 PM EST
- **Process**:
  - 11:30 AM: notificationScheduler runs → Detects high-volume sale
  - 11:31 AM: Event details cached (single fetch)
  - 11:32 AM: 50,000 notifications generated in 10 batches (5,000 each)
  - 11:33-11:40 AM: notificationSend workers process stream in parallel
  - 11:40 AM: 48,000 notifications delivered, 2,000 in retry
  - 11:42 AM: All retries completed, 49,500 delivered, 500 failed (invalid numbers)
- **Metrics**: 99% delivery rate, average delivery time 8 minutes

### Scenario 6: AppSync Query - Mobile App Event Lookup

**Context**: Mobile app user browsing event details

- **Request**: User taps event tile, app queries `eventDetails(eventId: "Z7r9jZ1A7...")` via GraphQL
- **Process**:
  - AppSync routes to eventDetails Lambda
  - Lambda checks DynamoDB cache → Cache hit
  - Event details returned (artist, venue, sales, suppression status)
- **Response Time**: 150ms
- **Result**: App displays event details with "Remind Me" button (if not suppressed)
