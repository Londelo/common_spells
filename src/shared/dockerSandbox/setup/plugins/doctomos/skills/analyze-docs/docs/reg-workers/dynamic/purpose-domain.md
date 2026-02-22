# Domain Concepts - Registration Workers

## Core Entities

| Entity | Description |
|--------|-------------|
| **Campaign** | A registration period for an event or tour. Defines rules, gates, markets, and registration window. Status: ACTIVE, TRANSFERRING, CLOSED. |
| **Entry** | A fan's registration submission for a campaign. Contains user identity, market selections, entry fields (phone, postal code, preferences). Stored in DynamoDB and replicated to Entry Service (MongoDB). |
| **Market** | A geographic or venue-specific presale segment within a campaign. Has event IDs, presale date/time, code pool, and capacity. |
| **Scoring Record** | A fan's eligibility and priority ranking for selection. Contains score (priority value), verdict (selected/rejected), and assigned codes. |
| **Access Code** | A unique or shared presale code granting ticket purchase access. Reserved from Code Service, assigned to winners, marked as assigned after use. |
| **Campaign Gate** | An eligibility requirement for registration. Types: invite-only (email/globalUserId/memberId list), identity verification (IDV), linked campaign (prerequisite registration). |
| **Verdict** | Winner/loser decision for a fan in a market. `true` = selected and assigned code, `false` = not selected. |
| **Notification Record** | A scheduled SMS reminder for a selected fan. Contains localized message, presale details, access code. Written to DynamoDB for downstream SMS delivery. |
| **User Info** | Fan profile data (name, email, phone, preferences). Upserted to User Service for enrichment and marketing use. |
| **Data Pipeline Record** | An analytics event for Kafka publishing. Types: CAMPAIGN, EVENT_MAPPING, MARKET, REGISTERED_MARKET, REGISTRATION. Schema-validated before publishing. |

---

## Business Rules

### Campaign Status Rules

- **ACTIVE**: Campaign accepts new registrations. Eligibility checks pass for valid entries.
- **TRANSFERRING**: Campaign accepts linked transfers from prerequisite campaigns. New registrations from non-linked fans rejected.
- **CLOSED**: No new registrations accepted. Selection processes can run. Notification scheduling enabled if `options.automatedReminders: true`.
- **DRAFT**: Campaign not visible to fans, no registrations accepted (admin-only editing).

### Gate Validation Rules

- **Invite-Only Gate**:
  - Fan must have email, globalUserId, or memberId on campaign invite list
  - Invite list stored in DynamoDB `demand-table` with TTL (default 30 days)
  - Missing invite list rejects all registrations with `reason: NOT_INVITED`

- **Identity Verification (IDV) Gate**:
  - Fan must complete identity verification process (separate IDV service)
  - IDV status checked via external service before accepting registration
  - Incomplete verification returns `reason: IDV_NOT_VERIFIED`

- **Linked Campaign Gate**:
  - Fan must have existing entry in prerequisite campaign (checked via Entry Service)
  - Only valid if `doTransfer: true` flag provided in registration request
  - Eligible fan entry includes `linkedFrom: prerequisiteCampaignId` attribute
  - Transfer allowed even if current campaign is invite-only

### Entry Field Validation Rules

- **Required Fields**: Campaign defines which fields are required (e.g., phone, postal code)
- **Phone Number**:
  - Normalized to E.164 format (+1XXXXXXXXXX for US)
  - US phone numbers validated with PhoneScore service for fraud detection
  - International numbers accepted but excluded from SMS notifications
- **Postal Code**:
  - Format validated against campaign country requirements
  - US: 5-digit ZIP or ZIP+4 format
  - Canada: A1A 1A1 format
- **Markets**:
  - At least one market selection required (unless campaign allows zero)
  - Market IDs must reference valid markets in campaign
  - Multi-market selection allowed (fan enters lottery for all selected markets)

### Replication Rules

- **Replication Trigger**:
  - Entry marked `needsReplication: true` OR
  - Entry modified by fan (has `date.fanModified` timestamp)
- **Replication Validation**:
  - Compare stream event timestamp vs current DynamoDB timestamp
  - Reject if current timestamp is newer (race condition detected)
  - Reject if entry no longer exists in DynamoDB (deleted)
- **Replication Retry**:
  - Retry failed Entry Service calls 3 times with exponential backoff
  - After 3 failures, return `batchItemFailures` for SQS-level retry
  - Success: unflag `needsReplication` in DynamoDB
- **Replication Scope**:
  - Replicate INSERT, MODIFY, REMOVE operations
  - Skip system-only modifications (no `date.fanModified`)

### Selection Rules

- **Eligibility for Selection**:
  - Entry must be in campaign
  - Entry must have selected the market being processed
  - Entry must not already have assigned code for the market
  - Entry must have valid score (priority ranking)
- **Code Reservation**:
  - TM ticketer: Reserve 1 shared code for entire market
  - Non-TM ticketer: Reserve unique code per selected fan
  - Minimum reserve count: 500 (configurable via `minimumCodeReserveCount`)
  - Reservation failure aborts selection with `status: FAILED`
- **Winner Selection**:
  - Sort eligible fans by score (descending = highest priority first)
  - Select top N fans up to market capacity or code availability
  - Assign codes via Entry Service: `POST /campaignId/entries/codes`
- **Verdict Assignment**:
  - Winners: `verdict: true`, `codes: [{ id, marketId }]`
  - Losers: `verdict: false`, `codes: []` (or unchanged if no codes)
  - Write verdicts to DynamoDB in batch (max 25 per batch)
- **Stats Reporting**:
  - Before selection: `status: PROCESSING`, `total: eligibleCount`
  - After selection: `status: FINISHED`, `processed: selectedCount`, `failed: rejectedCount`
  - On error: `status: FAILED`, `error: errorMessage`

### Notification Rules

- **Notification Eligibility**:
  - Market must have `options.automatedReminders: true` (campaign-level setting)
  - Campaign status must be `CLOSED`
  - Market must have configured presale date/time
  - Fan must have `verdict: true` (selected winner)
  - Fan must have assigned code for the market
  - Fan must have confirmed US phone number (starts with "+1")
- **Notification Timing**:
  - Target: 1 hour before presale start time
  - High volume adjustment: Start earlier to complete sends on time (target rate: 1000/hour)
  - Normal volume: Center notifications around 1-hour mark
  - Overlap prevention: Shift timing if consecutive presales conflict
- **Notification Content**:
  - Localized message body based on fan's locale (campaign default: English)
  - Message includes: artist name, event date, presale link, access code, presale time
  - Invalid locale or missing data: Skip notification (no message body)
- **Duplicate Prevention**:
  - Check `date.notified` before generation → skip if already notified
  - Set `date.notified` after successful generation → prevent re-run
- **Email Reminders**:
  - Triggered day before presale (separate from SMS, which is ~1 hour before)
  - Exports Service generates email files for CRM distribution
  - Trigger times configured in `date.sendReminderEmails` array

### Data Pipeline Rules

- **Record Type Validation**:
  - Must be one of: `CAMPAIGN`, `EVENT_MAPPING`, `MARKET`, `REGISTERED_MARKET`, `REGISTRATION`
  - Invalid types rejected without retry (logged for investigation)
- **Data Payload Validation**:
  - Must not be empty (null or {})
  - Empty payloads rejected without retry (logged)
- **Schema Validation**:
  - Each record type has corresponding JSON schema
  - Validate against schema before Kafka publish
  - Schema validation failures rejected without retry (logged)
- **Deduplication**:
  - Use `dedupe.id` and `dedupe.timestamp` to create unique identifier
  - Kafka publishing detects duplicates via identifier comparison
  - Prevents duplicate events in analytics pipeline
- **Fan-Out Architecture**:
  - SNS publishes to type-specific SQS queues
  - Each queue has dedicated `sendData` worker for isolation
  - Failures retry at SQS level (per-type isolation)

---

## Terminology

| Term | Definition |
|------|------------|
| **VerifiedFan** | Ticketmaster's presale access system. Fans register for presale eligibility, system selects winners, assigns codes for ticket purchase access. |
| **Presale** | A time-limited ticket sale period before general public sale. Requires access code from registration selection. |
| **Eligibility** | Whether a fan can submit a registration. Determined by campaign status, gate requirements, entry field validation. |
| **Gate** | An entry barrier requiring additional validation. Types: invite-only, identity verification (IDV), linked campaign transfer. |
| **Score** | A numeric priority value for fan selection. Higher score = higher priority. Used to rank fans when demand exceeds supply. |
| **Verdict** | Winner/loser decision. `true` = selected and assigned code, `false` = not selected or rejected. |
| **Access Code** | A presale code granting ticket purchase access. Can be unique per fan or shared across market. |
| **Market** | A presale segment within a campaign. Typically geographic (city/state) or venue-specific. Has event IDs, presale date/time, code pool. |
| **Replication** | Copying entry data from DynamoDB (`demand-table`) to Entry Service (MongoDB) for eventual consistency. |
| **Race Condition** | When multiple updates occur rapidly, stream events may arrive out of order. Replication validates against current state to prevent stale updates. |
| **Batch Item Failures** | SQS mechanism for partial batch retry. Failed records returned as `batchItemFailures` list, SQS retries only those records. |
| **needsReplication** | Flag indicating entry requires replication to Entry Service. Set on write, cleared after successful replication. |
| **fanModified** | Timestamp indicating when fan last modified entry. Used to filter replication for fan-initiated changes vs system changes. |
| **Invite List** | A list of email addresses, globalUserIds, or memberIds allowed to register for invite-only campaigns. Stored in DynamoDB with TTL. |
| **Global User ID** | Ticketmaster's unique fan identifier across systems. Used as primary key for entries and user profiles. |
| **Fan ID** | Legacy identifier for fans. Still stored but globalUserId is primary. |
| **Campaign Stats** | Counts and status for selection processing. Fields: `total` (eligible), `processed` (selected), `failed` (rejected), `status` (PROCESSING/FINISHED/FAILED). |
| **Step Function** | AWS orchestration service. Used for selection workflow (per-market processing) and notification workflow (polling + generation). |
| **Middleware Pipeline** | Composable handler chain wrapping workers. Handles correlation IDs, tracing, input transformation, service initialization, result formatting. |
| **Middleware Type** | Worker trigger mechanism. Examples: `sqsBatchConsumer`, `dynamodbKinesisConsumer`, `appsyncResolver`, `sdkInvoked`, `scheduled`. |
| **Inventory Code** | Tagging pattern for AWS resources. Format: `<repo-abbreviation>-<stack-abbreviation>` (e.g., `reg-replica`, `reg-sel`). |
| **Name Tag** | Short kebab-case identifier for AWS resource names (e.g., `eligibility`, `save-entries`). |

---

## Data Models

### Entry Record (DynamoDB `demand-table`)

```typescript
{
  type: 'registration', // Partition key prefix
  campaignId: string, // Campaign UUID
  globalUserId: string, // Fan identifier (primary)
  fanId: string, // Legacy fan ID
  systemUserId: string, // Ticketmaster system user ID
  firstName: string,
  lastName: string,
  email: string,
  phoneNumber: string, // E.164 format
  postalCode: string | number,
  locale: string, // e.g., 'en-US', 'es-MX'

  fields: {
    email: string,
    firstName: string,
    lastName: string,
    postalCode: string,
    phone: string,
    allow_artist_sms: boolean, // Opt-in for artist SMS
    allow_livenation: boolean, // Opt-in for LiveNation marketing
    allow_marketing: boolean, // Opt-in for general marketing
    markets: string[] // Selected market IDs
  },

  date: {
    created: string, // ISO 8601
    updated: string, // ISO 8601
    fanModified?: string // ISO 8601, present if fan modified entry
  },

  origin: {
    userAgent: string,
    forwardedFor: string,
    sessionId: string,
    ip: { address, country },
    os: { type, version },
    browser: { type, version },
    nudetect: { score, scoreBand, statusCode } // Fraud detection
  },

  attributes: Record<string, unknown>, // Custom campaign attributes
  tags?: string, // Comma-separated tags

  // Selection fields
  score?: number, // Priority ranking
  verdict?: boolean, // Winner (true) or loser (false)
  accountScore?: number, // User account quality score
  codes?: Array<{ id: string, marketId: string }>, // Assigned access codes

  // Replication control
  needsReplication?: boolean, // Flag for replication pipeline

  // Linked campaign transfer
  linkedFrom?: string // Prerequisite campaign ID if transferred
}
```

### Scoring Record (Entry Service MongoDB)

```typescript
{
  _id: ObjectId,
  campaignId: string,
  globalUserId: string,
  score: number, // Priority ranking
  verdict: boolean, // Selected (true) or rejected (false)
  phoneNumber: string, // E.164 format
  codes: Array<{ id: string, marketId: string }>, // Assigned codes
  markets: string[], // Selected market IDs
  date: {
    created: string,
    updated: string
  }
}
```

### Campaign Stats Record (Entry Service MongoDB `campaign_stats` collection)

```typescript
{
  _id: ObjectId,
  campaignId: string,
  marketId: string,
  dateId: string, // Presale date identifier
  status: 'PROCESSING' | 'FINISHED' | 'FAILED',
  count: {
    total: number, // Eligible entries
    processed: number, // Selected winners
    failed: number // Rejected entries
  },
  error?: string, // Error message if FAILED
  date: {
    created: string,
    updated: string
  }
}
```

### Notification Record (DynamoDB `demand-table`)

```typescript
{
  PK: 'fan:{globalUserId}', // Partition key
  SK: 'asu#{campaignId}-{marketId}#reminder', // Sort key
  type: 'notification',
  globalUserId: string,
  campaignId: string,
  marketId: string,
  messageBody: string, // Localized SMS message
  code: string, // Access code
  presaleDateTime: string, // ISO 8601
  eventLink: string, // Presale URL
  locale: string,
  date: {
    created: string
  }
}
```

### Market Configuration (MongoDB)

```typescript
{
  _id: ObjectId,
  id: string, // Market UUID
  campaign_id: string,
  name: string, // e.g., "Los Angeles"
  city: string,
  state: string,
  country: string,
  timezone: string, // e.g., "America/Los_Angeles"

  event: {
    ids: string[], // Event IDs for this market
    presaleDateTime: string, // ISO 8601
    link: string, // Presale URL
    ticketer: string // 'TM' (Ticketmaster) or other
  },

  date: {
    notification?: string, // Calculated trigger time for notification
    notified?: string // Timestamp when notifications generated
  },

  options: {
    automatedReminders: boolean // Enable/disable notifications
  }
}
```

### Campaign Configuration (MongoDB + Redis Cache)

```typescript
{
  _id: ObjectId,
  id: string, // Campaign UUID
  slug: string, // URL-friendly identifier
  name: string,
  status: 'DRAFT' | 'ACTIVE' | 'TRANSFERRING' | 'CLOSED',

  date: {
    start: string, // Registration window start
    end: string, // Registration window end
    sendReminderEmails: string[], // Email reminder trigger times
    triggeredEmailReminders?: string // Completion timestamp
  },

  fields: Array<{
    name: string,
    type: string,
    required: boolean,
    options?: unknown
  }>,

  gate?: {
    type: 'invite' | 'idv' | 'linked',
    config: {
      // Invite gate
      inviteType?: 'email' | 'globalUserId' | 'memberId',
      // Linked gate
      linkedCampaignId?: string
    }
  },

  options: {
    automatedReminders: boolean // Enable notification scheduling
  },

  markets: Array<{ id, name, city, state, event }> // Market definitions
}
```

### Data Pipeline Kafka Schema (REGISTRATION Type Example)

```typescript
{
  dedupe: {
    id: string, // Unique identifier for deduplication
    timestamp: string // ISO 8601
  },
  data: {
    campaignId: string,
    globalUserId: string,
    email: string,
    firstName: string,
    lastName: string,
    phone: string,
    postalCode: string,
    markets: string[],
    marketingPreferences: {
      allow_artist_sms: boolean,
      allow_livenation: boolean,
      allow_marketing: boolean
    },
    origin: {
      ip: string,
      country: string,
      userAgent: string,
      fraudScore: number
    },
    date: {
      created: string,
      updated: string
    }
  }
}
```

---

## Domain Relationships

### Campaign → Markets → Entries

- A **Campaign** has many **Markets** (one-to-many)
- A **Market** belongs to one **Campaign** (many-to-one)
- An **Entry** references one **Campaign** (many-to-one)
- An **Entry** can select multiple **Markets** (many-to-many via `fields.markets` array)

### Entry → Scoring Record → Verdict

- An **Entry** in DynamoDB maps to a **Scoring Record** in Entry Service (one-to-one)
- A **Scoring Record** has one **Verdict** per market (boolean flag)
- A **Verdict** determines if **Access Codes** are assigned (one-to-many codes if winner)

### Campaign → Gate → Eligibility

- A **Campaign** may have zero or one **Gate** (one-to-one optional)
- A **Gate** validates **Eligibility** for all entries to the campaign
- **Invite-Only Gate**: Requires fan on invite list (stored in DynamoDB)
- **IDV Gate**: Requires identity verification completion (external service)
- **Linked Gate**: Requires prerequisite campaign entry (Entry Service lookup)

### Market → Notification → Fan

- A **Market** with `automatedReminders: true` triggers **Notification** generation
- A **Notification** targets one **Fan** (globalUserId) for one **Market**
- **Notifications** written to DynamoDB as records for downstream SMS delivery

### Entry → Replication → Entry Service

- An **Entry** in DynamoDB marked `needsReplication: true` triggers replication
- Replication creates/updates corresponding **Entry** in Entry Service (MongoDB)
- Replication clears `needsReplication` flag after success
- Race condition validation compares stream event vs current DynamoDB state

### Data Record → Kafka Topic → Analytics

- A **Data Record** (CAMPAIGN, REGISTRATION, MARKET, etc.) flows through pipeline
- `processData` formats record and publishes to **SNS Topic**
- SNS fans out to type-specific **SQS Queues**
- `sendData` validates schema and publishes to **Kafka Topic**
- Analytics systems consume Kafka topics for reporting and insights
