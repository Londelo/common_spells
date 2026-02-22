# Domain Concepts - monoql

## Core Entities

| Entity | Description |
|--------|-------------|
| **Campaign** | A registration or fanlist initiative for an artist/event, containing configuration, dates, content, and markets. Two subtypes: RegistrationCampaign (standard presale registration) and FanlistCampaign (ongoing fan tracking). |
| **Viewer** | Authenticated user context representing either a fan or admin, with associated profile data, permissions, and session information. |
| **Entry** | A fan's registration submission for a specific campaign, including preferences, attributes, and verification status. |
| **Market** | A geographic target venue/location for an event, with associated population limits, event details, and allocation rules. |
| **Artist** | Performer entity with metadata (name, discovery_id, image, fanclub info) linked to campaigns. |
| **Venue** | Physical location entity with geographic coordinates, timezone, and ticketing platform details. |
| **Wave** | A batch of fan selections and code assignments for a specific campaign and time period, with scheduling and notification configuration. |
| **WavePrep** | Asynchronous processing job that calculates fan eligibility and prepares selection allocations before wave execution. |
| **Export** | Asynchronous data extraction job that generates downloadable campaign/entry datasets for reporting. |
| **Code** | Presale access code (offer code) with status tracking (available/assigned/reserved), tied to events and optionally to fan accounts. |
| **Tracker** | Analytics tag configuration (Google Analytics, Facebook Pixel, etc.) embedded in campaign pages. |
| **Promoter** | Event promoter entity with privacy policy URLs, associated with campaigns for compliance and reporting. |
| **Locale** | Language/region configuration (e.g., en_US, es_MX) with localized content translations. |
| **Field** | Custom form field definition for campaign registration (text, checkbox, dropdown, etc.) with localized labels. |
| **Stat** | Aggregate metrics record for campaign performance (filter lists, selection counts) by date and market. |

## Business Rules

- **Campaign Status Lifecycle**: Campaigns progress through states (not started → open → closed → finished). Fans can only submit entries when status is "open".
- **One Entry Per Fan**: A fan can only register once per campaign, identified by the campaign's configured identifier type (email, globalUserId, or memberId).
- **Phone Confirmation Requirement**: If campaign options specify phone confirmation, fans must verify their phone number before campaign close or entry becomes invalid.
- **Gating Enforcement**: Campaign gates (credit card type, linked account, IDV tier) are validated during entry submission; non-qualifying fans are rejected.
- **Market Preference Ranking**: Fans rank markets in order of preference (1st choice, 2nd choice, etc.); selection algorithms prioritize higher-ranked preferences when allocating codes.
- **Score-Based Eligibility**: Entries have implicit scores (calculated by Entry Service); campaigns can filter selections by minScore/maxScore thresholds.
- **Code Assignment Idempotency**: Once a code is assigned to a fan for a specific wave, reassignment attempts return the same code (prevents duplicates).
- **Locale Fallback**: If requested locale content is unavailable, system returns default locale content (typically en_US).
- **Permission Hierarchies**: "Supreme" admins have all permissions; non-supreme admins require explicit campaign-level permissions for write operations.
- **Export Expiration**: Scheduled exports generate time-limited S3 URLs; after expiration, files remain but URLs must be regenerated.
- **Wave Status Progression**: Waves move through statuses (scheduled → processing → triggered → completed/failed); only completed waves trigger code notifications.
- **Split Allocation Types**:
  - **Concurrent**: Multiple events share a single code pool simultaneously (first-come-first-served across events).
  - **Sequential**: Events access separate code pools in defined order (event A gets codes first, then event B).
- **Reassignment Logic**: If `reassign=true` in wave prep, previously selected fans can be selected again; if false, they're excluded.

## Terminology

| Term | Definition |
|------|------------|
| **Verified Fan** | Ticketmaster's registered fan who has completed profile verification (email, phone, optionally ID verification). |
| **Presale** | Priority ticket purchasing window for registered fans before general public on-sale. |
| **Registration Campaign** | Time-bound campaign where fans register for potential presale access (with selection process). |
| **Fanlist Campaign** | Ongoing fan engagement tracking without time constraints or code allocation (used for marketing lists). |
| **Entry** | A fan's completed registration form submission for a campaign. |
| **Eligibility** | Fan's qualification status for presale selection, based on entry validity, scoring, and gating requirements. |
| **Selection** | The algorithmic process of choosing eligible fans to receive presale codes, typically after campaign close. |
| **Wave** | A batch of selected fans who receive codes at a scheduled time (campaigns may have multiple waves). |
| **Access Code / Offer Code** | Alphanumeric code that grants fan access to presale ticket purchasing on ticketing platform. |
| **Market** | A geographic venue location where an event occurs (e.g., "Los Angeles - Crypto.com Arena"). |
| **Gating** | Access restriction requirements for campaign entry (e.g., must have Visa card, Verizon account, or IDV verification). |
| **Identity Verification (IDV)** | Third-party verification of fan identity (e.g., "ASU" tier for Arizona State University student verification). |
| **Linked Account** | External account integration required for entry (e.g., Verizon wireless account, Citi credit card). |
| **Scoring** | Numerical ranking of entry quality/fraud risk (higher scores = more legitimate fans). |
| **Locale** | Language and region code (ISO format, e.g., en_US, fr_CA) determining displayed content language. |
| **Domain** | Unique URL subdomain for campaign access (e.g., "taylor-swift-2024.verifiedfan.ticketmaster.com"). |
| **Supreme Admin** | Super-user with unrestricted access to all campaigns and operations. |
| **Category ID** | Ticketmaster event category identifier used to associate campaigns with ticketing platform events. |
| **Event ID** | Ticketmaster event identifier for specific show/date within a tour. |
| **Presale Window** | Date/time range when presale codes are valid for ticket purchasing (between presaleWindowStart and presaleWindowEnd). |
| **General Onsale** | Public ticket sale date (after presale ends). |
| **Reference Timezone** | Campaign's base timezone for date/time operations (e.g., "America/Los_Angeles"). |
| **Waiting Room** | Virtual queue system that delays campaign access for traffic management (waitingRoomDuration in minutes). |
| **LNAA** | "Let No Artist Alone" - special campaign flag for collaborative tours (metadata tag). |
| **Filter List** | Export of fans excluded from selection (blocked/tagged as ineligible). |

## Data Models

### Campaign Data Flow

```
Campaign
├── Basic Info: id, name, type, status, categoryId
├── Artist: artist metadata (id, name, image, fanclubName)
├── Dates: open, close, finish, presaleWindowStart, presaleWindowEnd
├── Domain: site URL, share URL, preview URL
├── Content (per locale):
│   ├── Body: started/finished page content
│   ├── Email: confirmation/receipt templates
│   ├── Images: main/mobile/email/secondary
│   ├── FAQs: landing/confirmation page questions
│   └── Errors: custom error messages
├── Markets: [Market]
│   ├── Market Info: id, city, state, timezone, population
│   ├── Event: eventId, name, date, presaleDateTime, venue, link
│   └── Split Allocation: type (concurrent/sequential), link, isActive
├── Options:
│   ├── Gating: gate config (card type, linkedAccount, campaignId, idv tier)
│   ├── Behavior: allowIntlPhones, requirePassword, showAccessCode
│   └── Queue: queueId, waitingRoomDuration
├── Preferences: [Field] - custom form fields
└── Permissions: [CampaignPermissions] - admin access control
```

### Entry Data Flow

```
Entry (from Entry Service)
├── Fan Identity: user ID (email/globalUserId/memberId)
├── Date: created, updated
├── Attributes: linked account data, card verification, IDV status
├── Fields: custom field responses (market preferences, fan questions)
├── Status: confirmed/unconfirmed (phone verification)
├── Score: calculated eligibility score
├── Selection: selected market, assigned code, wave dateKey
└── Eligibility: isEligible flag, reason code
```

### Wave Execution Flow

```
WavePrep Trigger (via triggerWavePrep mutation)
  → Entry Service fetches eligible entries
  → Apply scoring filters (minScore/maxScore)
  → Group entries by market preferences
  → Apply capacity limits per market
  → Rank fans by score/preference/randomization
  → Assign fans to markets
  → Reserve codes from Code Service
  → Generate allocation files (saved to S3)
  → Update WavePrep status: finished

Wave Trigger (via triggerSelection mutation)
  → Load allocation data from WavePrep
  → Assign codes to selected fans (Code Service)
  → Update entry records with selection status
  → Queue notification emails to fans
  → Update Wave status: triggered → completed
  → Generate selection export files
```

### Code Management Flow

```
Code Upload (via uploadCodes mutation)
  → Parse CSV/Excel file with codes
  → Validate format (code, type, campaignId)
  → Store in Code Service
  → Update inventory counts (available, assigned, reserved)

Code Assignment (during selection)
  → Query Code Service for available codes by type
  → Reserve code for fan
  → Mark code as assigned
  → Link code to fan account (if tiedToAccount=true)
  → Set code metadata (event, market, wave dateKey)

Code Counts (via codes.count query)
  → Query Code Service inventory
  → Return counts by status:
    - Available: unassigned codes
    - Assigned: codes given to fans
    - Reserved: codes held for pending selections
```

### Authentication & Authorization Flow

```
User Authentication
  → Client sends TM OAuth token (tm_token) or ID token (id_token)
  → Mutation: authenticate({ credentials: { token } })
  → User Service validates token
  → User Service returns JWT with permissions
  → JWT stored in session cookie
  → JWT included in all subsequent GraphQL requests

Permission Check (per mutation)
  → Extract JWT from request context
  → Parse JWT to get userId and permissions map
  → Check campaign permissions: permissions[campaignId] includes required action
  → If isSupreme=true, allow all actions
  → If no permission, reject with error
```

### Export Processing Flow

```
Export Request (via scheduleExport mutation)
  → Create Export record (status: pending)
  → Queue async job in Export Service
  → Return exportId to admin

Export Processing (async)
  → Update status: processing
  → Fetch campaign/entry data from services
  → Apply filters (date range, eligibility, market)
  → Format as CSV/JSON
  → Upload to S3 with campaign-specific path
  → Generate signed URL (1-hour expiration)
  → Update Export record: status=finished, path=S3_URL

Export Retrieval
  → Admin polls campaignExport query with exportId
  → When status=finished, client downloads from S3 path
  → If URL expired, admin re-generates via scheduleExport
```

### Locale Content Resolution

```
Content Query (fan requests campaign content)
  → Client specifies locale (e.g., "es_MX") or uses browser locale
  → Query: viewer.campaign(locale: "es_MX")
  → Campaign content.localized array: [{ locale: "en_US", value: Content }, { locale: "es_MX", value: Content }]
  → System finds matching locale in array
  → If match found: return value
  → If no match: return default locale (is_default=true)
  → Client renders localized text from Content object
```

### Metrics & Stats Aggregation

```
Metrics Query (admin requests campaign metrics)
  → Query: metrics.entriesByMarketPreference(campaignId)
  → Entry Service aggregates entries:
    - Group by marketId
    - Group by preference rank (1st, 2nd, 3rd choice)
    - Count entries per group
  → Return: [{ id: marketId, counts: [count1stChoice, count2ndChoice, ...] }]

Stats Tracking (via upsertStat mutation)
  → Admin or system creates Stat record
  → Type: filterList (excluded fans) or selection (selected fans)
  → Store counts: { total: 1000, selected: 500, waitlisted: 300 }
  → Associate with dateKey and marketId (optional)
  → Query stats via stats query for historical trend analysis
```
