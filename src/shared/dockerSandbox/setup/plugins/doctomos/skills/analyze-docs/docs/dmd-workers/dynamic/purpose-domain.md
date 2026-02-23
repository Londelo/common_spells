# Domain Concepts - dmd-workers

## Core Entities

| Entity | Description |
|--------|-------------|
| **Fan** | A user who has opted in to receive ticket sale notifications. Identified by fan ID, contains contact preferences (phone number, email). Stored with PK pattern `fan:{fanId}`. |
| **Event** | A live entertainment event (concert, show, game) with associated metadata: artist/attraction, venue, date/time, locale. Primary key pattern `event:{eventId}`. Source of truth: Ticketmaster Discovery API. |
| **Sale** | A ticket sale opportunity for an event. Each sale has a start date/time, name, and type (presale, public). Multiple sales can exist per event. Stored with PK pattern `event:{eventId}`, SK pattern `sale#{saleId}`. |
| **Notification** | A generated reminder message targeted to a specific fan for a specific sale. Includes message content, delivery status, contact method, and retry tracking. Key pattern: `fan:{fanId}` + `notification#{eventId}-{saleId}#{contactMethod}`. |
| **Demand Record** | A fan's opt-in preference linking fan to event/sale. Indicates which contact methods the fan prefers (SMS, email, or both). |
| **Artist/Attraction** | The performer or team associated with an event. Has name and unique ID. Some artists are suppressed (no notifications sent). |
| **Venue** | Physical location where event takes place. Includes name, city, state, timezone. |
| **Short URL** | Abbreviated URL (via Bitly) for event ticket page. Required for SMS messages due to character limits. |

## Business Rules

### Notification Rules
- **NR-001**: Notifications must be sent 30 minutes before sale start time (configurable window)
- **NR-002**: One notification per fan per sale per contact method (deduplication enforced)
- **NR-003**: Conditional writes prevent duplicate notification records in DynamoDB
- **NR-004**: Notifications require short URL before generation (URL shortening prerequisite)
- **NR-005**: Failed deliveries retry up to 3 times for transient errors
- **NR-006**: Non-retryable errors (invalid phone, blocked) immediately fail without retry

### Sale Type Rules
- **ST-001**: Public sales omit presale name in notification message
- **ST-002**: Presales include sale-specific name (e.g., "Verified Fan Presale", "Amex Presale")
- **ST-003**: Sales containing "registration" keyword are suppressed (no notifications)
- **ST-004**: Multiple sale types can apply to a single sale (e.g., CC + AMEX)

### Suppression Rules
- **SR-001**: Events with suppressed artist IDs do not generate notifications (configured list)
- **SR-002**: Events outside supported countries (US, CA) are suppressed by default
- **SR-003**: Events with classifications other than music/theater are suppressed by default
- **SR-004**: Sales with type SUPPRESS are never notified

### Message Formatting Rules
- **MF-001**: SMS messages must use short URLs (bit.ly domain)
- **MF-002**: SMS messages include brand name (Ticketmaster or Live Nation)
- **MF-003**: Messages localized per event locale (en-us, en-ca, fr-ca)
- **MF-004**: Artist names in English messages have accents removed (Twilio compatibility)
- **MF-005**: Email notifications use template variables (not pre-rendered message body)

### Status Transition Rules
- **STS-001**: Notification status follows state machine: CREATED → TRIGGERED → QUEUED → SENT → DELIVERED
- **STS-002**: FAILED status can occur from any state
- **STS-003**: Status transitions are immutable (no backwards transitions)
- **STS-004**: Each status has associated timestamp (date.created, date.triggered, date.sent, etc.)

### Scheduling Rules
- **SCH-001**: Scheduler runs every 30 minutes
- **SCH-002**: Query window aligned to half-hour boundaries (e.g., 10:00-10:30, 10:30-11:00)
- **SCH-003**: Sales cached by date (saleStartDate) for efficient querying
- **SCH-004**: Only sales starting within current window are processed

## Terminology

| Term | Definition |
|------|------------|
| **Demand Record** | A fan's opt-in registration for event notifications, linking fan ID to event/sale preferences |
| **Presale** | A ticket sale offering early access to specific groups (credit card holders, fan club members, Verified Fan) |
| **Public Sale** | The general on-sale period open to all fans without restrictions |
| **Notification Window** | The 30-minute time period before a sale starts when notifications are sent |
| **Short URL** | Abbreviated URL created via Bitly (e.g., bit.ly/3xYZ) pointing to event ticket page |
| **Contact Method** | Communication channel preference: SMS, email, or both |
| **Sale Start DateTime** | The precise moment when tickets become available for purchase (ISO 8601 format) |
| **Suppressed Event** | An event excluded from notifications due to business rules (artist, sale type, geography) |
| **Send Attempts** | Counter tracking how many times delivery was attempted for a notification |
| **Message Body** | Pre-rendered SMS text content stored with notification record |
| **Template Variables** | Structured data for email rendering (artist name, venue, time, URL) |
| **Locale** | Language and regional setting (en-us, en-ca, fr-ca) for message localization |
| **Brand** | Platform name derived from market ID (Ticketmaster for TM_US, Live Nation for LN_US) |
| **Market ID** | Ticketmaster market identifier (e.g., TM_US, TM_CA, LN_US) |
| **Event ID** | Unique identifier for event in Ticketmaster system (e.g., Z7r9jZ1A7...) |
| **Sale ID** | Unique identifier for a specific sale within an event |
| **Fan ID** | Unique identifier for a fan who opted in for notifications |
| **Group ID** | Correlation identifier for related notifications (uses SK value) |
| **Message ID** | Unique identifier for SMS message sent via SMS service |
| **Correlation ID** | Tracing identifier for request chains across services |
| **Inventory Code** | Abbreviated identifier for worker resources (e.g., ntfcn-gnrtr, ntfcn-snd) |
| **DynamoDB Stream** | Change data capture mechanism triggering workers on database writes |
| **Kinesis Stream** | Event stream for SMS status updates from external service |

## Data Models

### Notification Record Schema

```typescript
{
  PK: string;                    // "fan:{fanId}"
  SK: string;                    // "notification#{eventId}-{saleId}#{contactMethod}"
  type: string;                  // "notification" or "test-notification"
  eventId: string;               // Event identifier
  saleId: string;                // Sale identifier
  saleName: string;              // Sale display name
  contactMethod: "sms" | "email";
  phoneNumber?: string;          // If SMS
  email?: string;                // If email
  messageBody?: string;          // Pre-rendered SMS text
  templateVariables?: {          // Email template data
    artistName: string;
    saleTime: string;
    eventDay: string;
    eventDate: string;
    eventTime: string;
    url: string;
    venueName: string;
    venueCity: string;
    venueStateCode: string;
  };
  status: {
    id: NotificationStatus;      // Current state
    date: string;                // Timestamp (ISO 8601)
  };
  date: {
    created: string;
    triggered?: string;
    queued?: string;
    sent?: string;
    delivered?: string;
  };
  sendAttempts: number;          // 0-3
  errors: Array<{
    statusCode?: number;
    reason: string;
    timestamp: string;
  }>;
  messageId?: string;            // SMS service message ID
  groupId?: string;              // Notification group identifier
  appId?: string;                // SMS service app ID
}
```

### Event Record Schema

```typescript
{
  PK: string;                    // "event:{eventId}"
  SK: string;                    // "event#{eventId}"
  id: string;                    // Event ID
  type: "event";
  name: string;                  // Event name
  url: string;                   // Ticketmaster event URL
  shortUrl?: string;             // bit.ly short URL
  locale: string;                // e.g., "en-us"
  attractions: Array<{
    id: string;
    name: string;
  }>;
  venues: Array<{
    name: string;
    city: { name: string };
    state: { stateCode: string };
  }>;
  eventDate: {
    start: { dateTime: string };
    timezone: string;
  };
  isSuppressed?: boolean;
  saleStartDate?: string;        // Indexed for querying
  saleStartDateTime?: string;    // Indexed for range queries
}
```

### Sale Record Schema

```typescript
{
  PK: string;                    // "event:{eventId}"
  SK: string;                    // "sale#{saleId}"
  id: string;                    // Sale ID
  type: "sale";
  name: string;                  // Sale name (e.g., "Amex Presale")
  saleStartDateTime: string;     // ISO 8601
  saleStartDate: string;         // Date only (for indexing)
  saleTypes: string[];           // Inferred types (PUBLIC, VF, AMEX, etc.)
  eventId: string;               // Parent event
}
```

### Demand Record Schema

```typescript
{
  PK: string;                    // "fan:{fanId}"
  SK: string;                    // "demand#{eventId}-{saleId}"
  type: "demand";
  fanId: string;
  eventId: string;
  saleId: string;
  phoneNumber?: string;
  email?: string;
  contactMethod: string;         // "sms", "email", or "sms,email"
  marketId: string;              // e.g., "TM_US"
}
```

### Entity Relationships

```
Event (1) ──< (N) Sales
  │
  ├── cached in DynamoDB
  └── source: Discovery API

Sale (1) ──< (N) Demand Records ──> (1) Fan
  │
  └── triggers Notifications

Fan (1) ──< (N) Notifications
  │
  ├── contains contact preferences
  └── deduplication key: fan + sale + contactMethod

Notification (1) ──> (1) Sale
Notification (1) ──> (1) Event
Notification (1) ──> (1) Fan

Event (1) ──> (0..1) Short URL
  └── prerequisite for notification generation
```

### Key DynamoDB Access Patterns

**1. Query sales by time window**
- Index: `sales` (GSI)
- Key: `saleStartDate = "2024-01-15" AND saleStartDateTime BETWEEN "2024-01-15T10:00:00Z" AND "2024-01-15T10:30:00Z"`

**2. Get event details**
- Primary key: `PK = "event:{eventId}" AND SK = "event#{eventId}"`

**3. Get all sales for event**
- Primary key: `PK = "event:{eventId}" AND SK BEGINS_WITH "sale#"`

**4. Get demand records for sale**
- GSI or scan: `eventId = {eventId} AND saleId = {saleId}`

**5. Get fan's notifications**
- Primary key: `PK = "fan:{fanId}" AND SK BEGINS_WITH "notification#"`

**6. Prevent duplicate notification**
- Conditional write: `attribute_not_exists(messageBody) AND attribute_not_exists(templateVariables)`

### Data Flow Transformations

**Discovery API → Event Cache:**
- Parse nested attractions, venues arrays
- Extract timezone from eventDate.timezone
- Generate saleStartDate from sale dates for indexing
- Apply suppression rules (isSuppressed flag)
- Enrich with short URL (asynchronous)

**Event + Sale → Notification:**
- Merge event details (artist, venue) with sale info (time, name)
- Format dates per timezone and locale
- Generate message body (SMS) or template variables (email)
- Apply brand logic (TM vs LN)
- Remove accents for English locales

**SMS Status Event → Notification Update:**
- Parse status from Kinesis record
- Map to internal status enum
- Extract timestamps
- Batch update DynamoDB records
- Preserve error history

**Demand Record → Multiple Notifications:**
- Split contactMethod by comma (e.g., "sms,email" → ["sms", "email"])
- Generate separate notification per method
- Shared event/sale details
- Unique keys per fan+sale+method
