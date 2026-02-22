# Domain Concepts - campaign-service

## Core Entities

| Entity | Description |
|--------|-------------|
| **Campaign** | A presale registration campaign for an artist or tour. Contains configuration, branding, domain, dates, and content. Has lifecycle status (DRAFT/PREVIEW/OPEN/CLOSED/INACTIVE). |
| **Market** | A geographical market within a campaign, linked to specific Ticketmaster event IDs. Represents a city/region where presale access is offered. |
| **Artist** | Artist metadata (ID, name, Discovery ID, image URL) fetched from Ticketmaster Discovery API. Campaigns are artist-scoped. |
| **Venue** | Venue metadata (ID, name, Discovery ID) fetched from Ticketmaster Discovery API. Markets reference venues. |
| **Promoter** | Promoter entity with contact information. Markets can be associated with promoter IDs. |
| **Contact** | Contact person for a campaign (email, role). Campaigns have an array of contact IDs. |
| **Event** | Ticketmaster event represented by Discovery API event ID. Markets link to events via event.ids array. |

## Business Rules

### Campaign Lifecycle Rules

- **Auto-Open Rule**: Campaigns with status DRAFT or PREVIEW automatically transition to OPEN when date.open is reached. The date.open field is cleared and date.opened is set to the transition timestamp.

- **Auto-Close Rule**: Campaigns with status OPEN automatically transition to CLOSED when date.close is reached. The date.close field is cleared and date.closed is set to the transition timestamp.

- **Auto-Deactivate Rule**: Campaigns with status CLOSED automatically transition to INACTIVE 30 days after date.closed. When deactivated, the domain.site field is unset (set to null) to free the domain for reuse.

- **Domain Uniqueness Rule**: The domain.site field has a unique sparse index. Only one active campaign can hold a specific domain at any time. When campaigns become INACTIVE, their domain is released (null), allowing the domain to be assigned to a new campaign.

- **Presale Window Rule**: Campaigns must define date.presaleWindowStart and date.presaleWindowEnd to be eligible for event-based queries. Campaigns without presale windows are excluded from GET /campaigns/events results.

### Permission Rules

- **Supreme User Rule**: Users with isSupreme=true in JWT have unrestricted access to all campaigns and all system operations (create, refresh, delete, etc.).

- **Campaign Manager Rule**: Non-supreme users can only access campaigns explicitly listed in their JWT's campaignIds array. Attempting to access unauthorized campaigns throws campaignInaccessible error.

- **Edit Permission Rule**: Edit operations (create market, update campaign, update content) require toEdit=true permission check. This validates user has write access to the campaign.

- **Read Permission Rule**: Read operations validate user has campaignId in their authUserActions or is supreme before returning campaign data.

### Market Rules

- **Market Name Uniqueness Rule**: Market names must be unique within a campaign but can repeat across different campaigns. Attempting to create a duplicate market name in the same campaign throws marketNameExists error.

- **Market Schema Validation Rule**: All market data must validate against the market.json schema. Required fields: name, campaign_id, city, state, timezone. Invalid data is rejected before database write.

- **Market-Campaign Association Rule**: Markets are linked to campaigns via campaign_id field. Markets cannot exist independently; they must belong to a campaign.

- **Presale Date Change Rule**: If a market's presale date/time is updated, the system automatically enqueues a message to the Refresh Selections Queue to notify dependent systems.

### Notification Rules

- **Notification Eligibility Rule**: Only markets belonging to campaigns with options.automatedReminders = true are eligible for automated presale notifications.

- **Notification Window Rule**: The GET /markets/upcoming endpoint returns markets with presaleDateTime between NOW+2 hours and NOW+27 hours, filtered by automatedReminders setting.

- **Notification Date Validation Rule**: When setting notification dates via POST /markets/notifyDate, the notificationDate must be within an acceptable range (validated by isWithinDateRange function).

- **Notified Tracking Rule**: After a notification is sent, the market's notification.notified field is set to the current timestamp. Markets with notification.notified set are excluded from future GET /markets/notifiable queries.

### Schema Validation Rules

- **Campaign Schema Rule**: Campaigns must validate against campaignV1.json, campaignV2.json, campaignDraft.json, or fanlistCampaign.json depending on version and type. Schema validation occurs before save.

- **Content Schema Rule**: FAQ content must validate against faqs.json schema; terms content must validate against terms.json schema. Invalid content throws invalidFaqsSchema or invalidTermsSchema error.

- **Locale Validation Rule**: When updating localized content (FAQs, terms), the locale parameter must match a valid locale code and exist in the campaign's content structure.

### Data Stream Rules

- **Campaign Event Mapping Rule**: When campaigns or markets are created/updated, event mapping data (campaignId → eventIds) is published to the Kinesis Campaign Data Stream for downstream analytics.

- **Market Pipeline Rule**: All market create/update/delete operations publish the full market document to the SQS Data Pipeline Queue for analytics ingestion.

- **Cache Invalidation Rule**: Campaign status changes, domain updates, or content modifications trigger Redis cache updates and Fastly CDN cache purges to ensure downstream systems see current data.

## Terminology

| Term | Definition |
|------|------------|
| **Campaign** | A time-bound registration campaign for an artist's tour or event series. |
| **Market** | A geographic region (city/state) with associated event IDs and presale timing. |
| **Presale** | Early ticket sales opportunity offered to registered fans before public sale. |
| **Domain** | Unique subdomain (e.g., "erastour.verifiedfan.com") assigned to a campaign for branded registration. |
| **Discovery API** | Ticketmaster's API for searching and retrieving artist, venue, and event metadata. |
| **Discovery ID** | Ticketmaster's unique identifier for artists and venues in the Discovery API. |
| **Event ID** | Ticketmaster's unique identifier for a specific event (show) in their system. |
| **Category ID** | Ticketmaster's event category identifier (e.g., music genre classification). |
| **Supreme User** | Admin user with unrestricted access to all campaigns and system operations. |
| **Campaign Manager** | Non-supreme user with limited access to assigned campaigns only. |
| **Auth User Actions** | JWT claim containing array of campaign IDs user has permission to access. |
| **Presale Window** | Time period (date.presaleWindowStart to date.presaleWindowEnd) when fans can register for presale access. |
| **Presale DateTime** | Specific date/time when presale tickets become available for a market's events. |
| **Automated Reminders** | System feature that sends notifications to fans before a market's presale starts (requires options.automatedReminders = true). |
| **Fan Identifier** | User identifier type (memberId, globalUserId, or email) used to link fans to campaigns. |
| **Campaign Type** | Either "registration" (default) or "fanlist" - determines campaign behavior and schema. |
| **Status History** | Array tracking all status changes for a campaign, with type and date for each transition. |
| **Locale** | Language/region code (e.g., "en-us", "fr-ca") for localized campaign content. |
| **Reference Timezone** | Timezone used for date/time display in the campaign UI (e.g., "America/New_York"). |
| **Sparse Index** | MongoDB index that allows multiple null values but enforces uniqueness for non-null values (used for domain.site). |
| **Correlation ID** | Request tracking ID passed through all layers (router → manager → datastore → services) for distributed tracing. |
| **Manager Context** | Object containing datastore, services, correlation ID, and JWT for request processing. |
| **Campaign Data Stream** | Kinesis stream receiving event mapping data for analytics and downstream processing. |
| **Data Pipeline Queue** | SQS queue receiving market CRUD events for analytics ingestion. |
| **Refresh Selections Queue** | SQS queue notified when market presale dates change, triggering selection refresh in dependent systems. |
| **Promoter** | Third-party organization promoting an event, associated with markets. |
| **Venue** | Physical location where an event takes place (concert hall, arena, etc.). |
| **GeoJSON Point** | Geographic coordinate format (longitude, latitude) used to represent market location. |
| **Shared Code** | Code shared across multiple markets for presale access. |

## Data Models

### Campaign Model

```javascript
{
  _id: ObjectId,
  type: "registration" | "fanlist",
  status: "DRAFT" | "PREVIEW" | "OPEN" | "CLOSED" | "INACTIVE",
  name: String,
  identifier: String,
  artist: {
    id: String,
    name: String,
    discovery_id: String,
    image_url: String,
    adpUrl: String,
    fanclubName: String
  },
  domain: {
    site: String (unique, sparse),
    preview: String
  },
  tour: {
    name: String
  },
  date: {
    created: Date,
    updated: Date,
    open: Date | null,       // Scheduled open date
    opened: Date | null,     // Actual opened timestamp
    close: Date | null,      // Scheduled close date
    closed: Date | null,     // Actual closed timestamp
    inactivated: Date | null,
    presaleWindowStart: Date | null,
    presaleWindowEnd: Date | null
  },
  options: {
    useGenericBranding: Boolean,
    showAccessCode: Boolean,
    automatedReminders: Boolean
  },
  referenceTimezone: String,
  content: {
    [locale]: {
      body: {
        faqs: Array,
        terms: String
      }
    }
  },
  contacts: [String],        // Array of contact IDs
  eventIds: [String],        // Campaign-level event associations
  categoryId: String,
  schema: {
    version: String
  },
  score: Object,
  limit: Object,
  videos: Object,
  share: Object,
  email: Object,
  stores: Array,
  groups: Array
}
```

### Market Model

```javascript
{
  _id: ObjectId,
  name: String,
  campaign_id: String (24-char campaign ObjectId),
  city: String,
  state: String,
  timezone: String,
  point: {
    type: "Point",
    coordinates: [Number, Number]  // [longitude, latitude]
  },
  population: Number,
  event: {
    ids: [String],                   // Ticketmaster event IDs
    name: String,
    date: String,
    presaleDateTime: String,
    ticketer: String,
    category_ids: [String],
    venue: {
      id: String,
      name: String
    },
    sharedCode: String
  },
  promoterIds: [String],
  notification: {
    date: Date,
    notified: Date
  },
  date: {
    created: Date,
    updated: Date
  }
}
```

### Relationships

- **Campaign → Markets**: One-to-many. Campaign has many markets via markets.campaign_id foreign key.
- **Campaign → Artist**: Many-to-one. Campaign references one artist via artist.id (Discovery API ID).
- **Campaign → Contacts**: Many-to-many. Campaign has array of contact IDs; contacts stored separately.
- **Market → Events**: Many-to-many. Market has event.ids array linking to Ticketmaster event IDs.
- **Market → Venue**: Many-to-one. Market references one venue via event.venue.id.
- **Market → Promoters**: Many-to-many. Market has promoterIds array linking to promoter documents.
- **Campaign → Events**: Many-to-many (optional). Campaign can have eventIds array for blanket event association.

### Data Flow

**Inbound**:
- Campaign create/update request → Schema validation → Permission check → MongoDB write → Cache update → Kinesis publish → Return result

**Outbound**:
- Campaign status change → MongoDB update → Redis cache update → Fastly purge → Artist extension update → Kinesis publish
- Market create/update → MongoDB write → SQS Data Pipeline Queue → Kinesis Campaign Data Stream → (conditional) SQS Refresh Selections Queue

**Query**:
- Campaign lookup by domain → Redis cache check → (miss) MongoDB query → Cache populate → Format response
- Campaign lookup by event ID → Markets query by eventId → Extract campaignIds → Campaigns query → Format response

### Indexes

Key indexes for performance:

- `domain.site`: Unique sparse index (enforces uniqueness for non-null values, allows multiple nulls)
- `status`: Non-unique index for status transition queries
- `date.open`: Index for auto-open queries
- `date.close`: Index for auto-close queries
- `date.closed`: Index for auto-deactivate queries (with status filter)
- `date.presaleWindowStart`: Index for presale window queries
- `categoryId`: Index for category-based campaign lookups
- Markets: `campaign_id`, `event.ids`, `event.presaleDateTime` indexes

### Status State Machine

```
DRAFT → PREVIEW → OPEN → CLOSED → INACTIVE
  ↓       ↓         ↓       ↓
  └───────┴─────────┘       ↓
   (can transition           ↓
    directly to OPEN)        ↓
                             ↓
                        (30 days after closed)
```

- **DRAFT**: Initial creation state, campaign not visible to public
- **PREVIEW**: Campaign in preview mode with preview domain
- **OPEN**: Campaign accepting registrations, domain active
- **CLOSED**: Campaign closed, no new registrations, domain still reserved
- **INACTIVE**: Campaign archived, domain released for reuse

### Fan Identifier Types

```javascript
fanIdentifiers = {
  MEMBER_ID: 'memberId',       // Internal member system ID
  GLOBAL_USER_ID: 'globalUserId', // Cross-system user ID
  EMAIL: 'email'               // Email address
}
```

Default: `MEMBER_ID`

Campaigns can specify which identifier type to use for fan association.

### Campaign Types

```javascript
campaignTypes = {
  REGISTRATION: 'registration',  // Standard registration campaign (default)
  FAN_LIST: 'fanlist'           // Fan list building campaign
}
```

Different campaign types use different JSON schemas for validation.
