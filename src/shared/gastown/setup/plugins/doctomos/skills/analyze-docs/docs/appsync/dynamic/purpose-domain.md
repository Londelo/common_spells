# Domain Concepts - AppSync

## Core Entities

| Entity | Description |
|--------|-------------|
| **AccountFanscore** | Normalized trust score (0-1) for a fan account based on historical behavior, event engagement, and risk signals |
| **Fan** | Authenticated Ticketmaster user identified by globalUserId or memberId with associated email, location, and login status |
| **FanIdentity** | Identity record linking globalUserId to account fanscore data and verification history |
| **Campaign** | Verified Fan presale campaign with registration form, presale window, and fan identifier requirements (memberId, globalUserId, or email) |
| **EntryRecord** | Fan's registration submission for a campaign, including form fields, timestamps, entry codes, and fanscore snapshot |
| **DemandRecord** | Fan's expressed interest in a specific event/sale, stored with contact preferences for notification when tickets available |
| **LivenessSession** | Identity verification session tracking selfie or government ID verification status through external vendor |
| **VerificationStatus** | Comprehensive verification state for a fan in a campaign, combining registration, score, verdict, and selected events |
| **DemandEvent** | Event details including name, venue, start time, sales list, and suppression status |
| **DemandEventSale** | Specific sale window for an event with name, sale types, start/end times |
| **PhoneScore** | Risk assessment for phone number including type (mobile/VOIP), carrier, location, and fraud risk level |
| **Cluster** | Group of potentially related accounts (exact or inferred) identified by shared device, IP, or household signals |

## Business Rules

- **Score Prioritization**: "When querying accountFanscore, globalUserId lookup takes precedence over memberId lookup. If globalUserId score exists and is valid (score > 0, not expired), return it; otherwise fallback to memberId score."

- **Score Randomization**: "All returned fanscores are randomized within +/- 10% range to prevent gaming and add fairness variance. Raw score stored separately for audit purposes."

- **Event Boost Application**: "When eventId provided in accountFanscore query, system queries demand_table for fan's event-specific engagement (demand records, entry records, past attendance). Boost multiplier (typically +0.05 to +0.20) added to base score."

- **Bot Override**: "If bot detection service returns isBot=true with confidence > 0.85, account score capped at 0.20 regardless of other positive signals. isBot flag included in all fanscore responses."

- **ARM Score Tiers**: "ARM (Account Risk Model) score ranges 1-5: 1=always pass (whitelist), 2=very low risk, 3=medium risk, 4=high risk (requires verification), 5=highest risk (manual review). ARM score influences liveness tier requirements."

- **Liveness Verification Requirements**:
  - "Tier 'always': Verification required (selfie + government ID)"
  - "Tier 'ASU': Verification required (selfie + government ID)"
  - "Tier 'high': Verification required (selfie only)"
  - "Tier 'medium': Verification required (selfie only)"
  - "Tier 'low': Verification optional unless ARM score >= 4 or bot detected"

- **Session Expiration**: "Liveness sessions expire within vendor-specified timeframe (typically 24-48 hours). Expired sessions cannot be completed; fan must start new session."

- **Demand Record Ownership**: "Fans can only save or delete demand records for their own account (authenticated globalUserId). Attempts to modify other fan's records rejected with authentication error."

- **Phone Uniqueness Per Campaign**: "Entry records enforce phone number uniqueness within campaign scope. If phone already registered for campaign, mutation returns error 'duplicate phone'. Phone can be reused across different campaigns."

- **Linked Campaign Transfers**: "When doTransfer=true on upsertEntry mutation, system deletes fan's entry from all linked campaigns before saving new entry. Ensures fan only registered for one variant of multi-market campaign."

- **Entry Timestamp Tracking**: "Entry records maintain three timestamp fields: created (first save), updated (last system update), fanModified (last user edit). fanModified only updates when fan changes form fields, not when system updates attributes."

- **Score Archival**: "Fanscore records with TTL/archiveTtl/expiresOn attribute are considered archived and excluded from queries. Prevents returning outdated scores from previous campaigns."

- **Verification Verdict Calculation**: "Verdict true/false determined by comparing final boosted score against campaign-specific threshold (typically 0.50-0.70). isVerified flag indicates successful liveness verification completion."

- **Event Suppression**: "Events with isSuppressed=true are excluded from public queries and demand tracking. Used for cancelled or postponed events."

- **Contact Method**: "Demand records default to contactMethod='sms' for event/sale notifications. System requires fan phone number to save demand record."

## Terminology

| Term | Definition |
|------|------------|
| **GlobalUserId** | Ticketmaster's universal user identifier across all systems (format: base64 encoded string) |
| **MemberId** | Legacy Ticketmaster account identifier (numeric string) |
| **SystemUserId** | Internal Ticketmaster system user ID used for account service integrations |
| **ARM Score** | Account Risk Model score (1-5 integer) indicating fraud/bot risk level |
| **Verified Fan** | Fan who has completed required verification steps (registration + optional liveness) for presale eligibility |
| **Fanscore** | Normalized trust score (0-1 float) representing fan's authenticity and engagement |
| **Raw Score** | Unmodified fanscore before randomization or event boosts applied |
| **Liveness Tier** | Verification requirement level (always/high/medium/low/ASU) determining if selfie/ID check required |
| **Liveness Session** | Identity verification transaction with external vendor tracking status from created → pending → completed → approved/declined |
| **Entry Record** | Fan's registration submission for a campaign (also called "campaign entry") |
| **Demand Record** | Fan's "remind me" subscription for event/sale notifications |
| **Campaign Slug** | URL-friendly campaign identifier (e.g., "taylor-swift-eras-tour-nyc") |
| **Presale Window** | Time range when verified fans can purchase tickets before general public sale |
| **Cluster** | Group of accounts potentially operated by same person/bot based on device fingerprinting, IP, household data |
| **Cluster Type** | Classification of cluster relationship: "exact" (definite match) or "inferred" (probable match) |
| **Market** | Geographic or venue-specific campaign variant (e.g., separate campaigns for NYC/LA shows) |
| **Placement ID** | Identifier for campaign placement/context (e.g., artist page, email link, social media) |
| **AppId** | Application identifier for request source (e.g., web, iOS, Android) |
| **VendorId** | External liveness verification vendor identifier (e.g., "Onfido", "Jumio") |
| **Vendor Session ID** | External vendor's unique session identifier for verification transaction |
| **Bot Detection Cursor** | Pagination token for batched bot detection API requests |
| **Event Boost** | Score increase applied when fan has demonstrated engagement with specific event (saved demand, previous registration) |
| **LNAA** | "Livenation Access Anywhere" - premium membership program with verification benefits |

## Data Models

### AccountFanscore Data Model

```typescript
{
  globalUserId: string       // TM universal user identifier
  memberId: string          // Legacy TM account ID
  score: float              // Normalized score 0-1 (randomized)
  rawScore: float           // Original score before randomization
  armScore: int             // Account Risk Model score 1-5
  email: string             // Fan's email address
  version: string           // Score model version identifier
  isBot: boolean            // Bot detection flag
  tags: string[]            // Special flags (e.g., "pas_model_testing")
}
```

**Storage**: DynamoDB fan_identity_table (PK: `g:{globalUserId}`, SK: `score#account`) or account_fanscore_table (PK: `m:{memberId}`)

**Relationships**:
- Fan → AccountFanscore (1:1)
- VerificationStatus → AccountFanscore (N:1, includes fanscore in verification response)

---

### EntryRecord Data Model

```typescript
{
  campaignId: string        // Campaign identifier
  date: {
    created: ISO8601        // First registration timestamp
    updated: ISO8601        // Last system update
    fanModified: ISO8601    // Last fan edit timestamp
  }
  locale: string            // Language/region code
  fields: JSON              // Campaign form field responses
  attributes: JSON          // System-calculated metadata (score, origin, etc.)
  codes: [                  // Entry access codes
    { id: string, marketId: string }
  ]
}
```

**Storage**: DynamoDB demand_table (PK: `e:{campaignId}`, SK: `entry#{globalUserId}`)

**Relationships**:
- Fan → EntryRecord (1:N, fan can have entries for multiple campaigns)
- Campaign → EntryRecord (1:N, campaign has many fan entries)

---

### DemandRecord Data Model

```typescript
{
  eventId: string           // Event identifier
  saleId: string            // Sale identifier
  artistId: string          // Primary artist identifier
  eventName: string         // Event display name
  saleName: string          // Sale display name
  artistName: string        // Primary artist name
  contactMethod: "sms" | "email"
  requestedDateTime: ISO8601
  notifiedDateTime: ISO8601 | null
}
```

**Storage**: DynamoDB demand_table (PK: `fan#{globalUserId}`, SK: `demand#{eventId}#{saleId}`, LSIK_1: `demand#{timestamp}`)

**Relationships**:
- Fan → DemandRecord (1:N, fan can save reminders for multiple events)
- DemandEvent → DemandRecord (1:N, event can have many fan reminders)
- DemandEventSale → DemandRecord (1:N, sale can have many fan reminders)

---

### LivenessSession Data Model

```typescript
{
  id: string                // Internal session identifier
  vendorId: string          // Vendor name (e.g., "Onfido")
  vendorSessionId: string   // Vendor's session ID
  verificationType: "selfie" | "selfieAndGovID"
  status: "created" | "pending" | "completed" | "expired" | "failed" | "needs_review" | "approved" | "declined"
  date: {
    created: ISO8601
    updated: ISO8601
    expiresAt: ISO8601      // Session expiration timestamp
    pending: ISO8601        // Status change timestamps
    completed: ISO8601
    expired: ISO8601
    failed: ISO8601
    needs_review: ISO8601
    approved: ISO8601
    declined: ISO8601
  }
  token: string             // Vendor SDK token for frontend
}
```

**Storage**: DynamoDB (liveness session table, structure TBD from infrastructure)

**Relationships**:
- Fan → LivenessSession (1:N, fan can have multiple verification attempts)
- LivenessSession → Fan (N:1, session belongs to one fan)

---

### VerificationStatus Data Model

```typescript
{
  memberId: string
  globalUserId: string
  campaignId: string
  score: float              // Final boosted fanscore
  rawScore: float           // Pre-boost score
  armScore: int             // Account Risk Model score
  isVerified: boolean       // Liveness verification completed
  verdict: boolean          // Pass/fail eligibility decision
  events: [                 // Selected/ranked events
    { id: string, rank: int }
  ]
}
```

**Computed at Query Time**: Combines data from verification_table/demand_table + AccountFanscore + LivenessSession

**Relationships**:
- Fan → VerificationStatus (1:N per campaign)
- Campaign → VerificationStatus (1:N, many fans per campaign)
- VerificationStatus includes AccountFanscore data

---

### DemandEvent Data Model

```typescript
{
  id: string                // Event identifier
  name: string              // Event display name
  startDateTime: ISO8601    // Event start time
  venue: {
    id: string
    name: string
    timezone: string
    city: string
    state: string
    country: string
    countryCode: string
  }
  isSuppressed: boolean     // Excluded from public queries
  sales: [                  // Associated sale windows
    {
      id: string
      name: string
      saleTypes: string[]   // e.g., ["presale", "general"]
      startDateTime: ISO8601
      endDateTime: ISO8601
    }
  ]
  marketEventId: string     // External market identifier
}
```

**Storage**: DynamoDB demand_table (PK: `event#{eventId}`, SK: `event`)

**Relationships**:
- DemandEvent → DemandEventSale (1:N, event has multiple sale windows)
- DemandEvent → DemandRecord (1:N, event can have many fan reminders)

---

### PhoneScore Data Model

```typescript
{
  phoneNumber: string       // E.164 format
  phoneType: "MOBILE" | "VOIP" | "FIXED_LINE" | "PREPAID" | "INVALID" | "BLOCK_LIST" | ...
  carrier: string           // Carrier name
  location: {
    city: string
    state: string
    zip: string
    metro_code: string
    county: string
    country: { iso2: string, iso3: string, name: string }
    coordinates: { latitude: float, longitude: float }
  }
  risk: {
    level: string           // Risk level description
    recommendation: "allow" | "flag" | "block"
    score: int              // Numeric risk score (0-100)
  }
  dateUpdated: ISO8601
}
```

**Computed at Query Time**: Fetched from external phone intelligence service (not stored in AppSync database)

**Relationships**:
- Fan → PhoneScore (1:1 based on account phone number)
- EntryRecord includes phone validation check

---

### Cluster Data Model

```typescript
{
  id: string                // Cluster identifier
  globalUserId: string      // Primary user in cluster
  type: "exact" | "inferred"
  size: int                 // Number of accounts in cluster
  refreshDate: string       // Last cluster calculation date
}
```

**Storage**: External cluster detection service (not stored in AppSync database)

**Relationships**:
- Fan → Cluster (N:1, multiple fans can belong to same cluster)

---

## Key Data Relationships

```
Fan
├── AccountFanscore (1:1)
├── FanIdentity (1:1)
├── EntryRecord (1:N) → Campaign (N:1)
├── DemandRecord (1:N) → DemandEvent (N:1) → DemandEventSale (N:1)
├── LivenessSession (1:N)
├── VerificationStatus (1:N per campaign)
├── PhoneScore (1:1)
└── Cluster (N:1)

Campaign
├── EntryRecord (1:N)
├── VerificationStatus (1:N)
└── Campaign (N:N) [linked campaigns for multi-market tours]

DemandEvent
├── DemandEventSale (1:N)
└── DemandRecord (1:N)
```

## Domain Invariants

- A Fan must have at least one identifier (globalUserId OR memberId OR email) to be queryable
- An EntryRecord cannot exist without a valid Campaign and authenticated Fan
- A DemandRecord cannot exist without a valid DemandEvent and DemandEventSale
- A LivenessSession must have a unique vendorSessionId per vendor
- AccountFanscore with score=null or score<=0 is considered invalid and excluded from queries
- PhoneType "BLOCK_LIST" or "INVALID" results in PhoneScore.risk.recommendation="block"
- Cluster size must be >= 2 (single account not considered a cluster)
- VerificationStatus.verdict can only be true if isVerified=true OR score exceeds threshold
