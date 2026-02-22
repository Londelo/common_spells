# Use Cases & Workflows - campaign-service

## Primary Use Cases

### Use Case 1: Create a New Presale Campaign

**Actor**: Supreme Admin User

**Goal**: Launch a new branded presale campaign for an artist's tour with specific markets and events

**Preconditions**:
- User has supreme permissions
- Artist exists in Ticketmaster Discovery API
- Campaign domain is unique and available

**Main Flow**:
1. Admin creates campaign with POST /campaigns
   - Specifies artist ID, campaign name, domain.site, tour name
   - Sets campaign type (registration or fanlist)
   - Defines open/close dates for campaign lifecycle
   - Optionally sets presaleWindowStart/End dates
2. System validates campaign data against campaignV2 JSON schema
3. System checks domain.site uniqueness (sparse index allows null for inactive)
4. System creates campaign with DRAFT status
5. System publishes campaign data to Kinesis Campaign Data Stream
6. System caches campaign in Redis
7. Campaign returns with generated MongoDB _id

**Postconditions**:
- Campaign exists in DRAFT status
- Domain is reserved exclusively for this campaign
- Campaign data available via GET /campaigns?domain=<domain>

**Business Rules Applied**:
- Supreme-only operation (non-supreme users rejected)
- Domain uniqueness enforced via MongoDB sparse unique index
- Schema validation rejects invalid payloads

---

### Use Case 2: Add Markets to Campaign

**Actor**: Campaign Manager (with campaign permission) or Supreme Admin

**Goal**: Define geographical markets with Ticketmaster event IDs for presale access

**Preconditions**:
- Campaign exists
- User has edit permissions (authUserActions includes campaign ID or user is supreme)
- Market data includes required fields: name, campaign_id, city, state, timezone

**Main Flow**:
1. User submits POST /campaigns/:campaignId/markets/:byCampaignId with market data
   - Market name (e.g., "Los Angeles Show")
   - City, state, timezone
   - GeoJSON point coordinates
   - Event IDs from Ticketmaster
   - Optional: presaleDateTime, venue info, category IDs, promoter IDs
2. System validates user has edit permission for campaign
3. System validates market data against market.json schema
4. System checks market name uniqueness within campaign
5. System saves market to MongoDB with generated _id
6. System publishes market data to SQS Data Pipeline Queue
7. System publishes event mapping to Kinesis Campaign Data Stream
8. System returns saved market with _id

**Postconditions**:
- Market linked to campaign via campaign_id
- Market queryable via GET /campaigns/:campaignId/markets/:byCampaignId
- Event IDs mapped to campaign in data stream
- Data pipeline receives market creation event

**Business Rules Applied**:
- Permission check: throwIfCampaignInaccessible validates authUserActions
- Market name must be unique per campaign (not globally)
- Schema validation enforces required fields

---

### Use Case 3: Automatic Campaign Status Transitions

**Actor**: System (triggered by scheduled job or admin refresh)

**Goal**: Transition campaigns through lifecycle states based on scheduled dates

**Preconditions**:
- Campaign has date.open and/or date.close defined
- Current time has passed scheduled transition date
- Supreme admin triggers POST /campaigns/refresh

**Main Flow**:
1. System queries campaigns where status IN [DRAFT, PREVIEW] AND date.open <= NOW
   - Transitions matching campaigns to OPEN status
   - Sets date.opened to current timestamp
   - Clears date.open (no longer needed)
   - Clears domain.preview (preview domains released)
2. System queries campaigns where status = OPEN AND date.close <= NOW
   - Transitions matching campaigns to CLOSED status
   - Sets date.closed to current timestamp
   - Clears date.close
3. System queries campaigns where status = CLOSED AND date.closed <= 30 days ago
   - Transitions to INACTIVE status
   - Unsets domain.site (frees domain for reuse)
   - Sets date.inactivated
4. For each transitioned campaign:
   - Updates Redis cache (or deletes if PREVIEW→OPEN or INACTIVE)
   - Updates artist extension in GitLab
   - Triggers Fastly cache purge for domain changes
5. System returns counts: {opened: N, closed: M, deactivated: K}

**Postconditions**:
- Campaigns reflect current status based on dates
- Domains freed for INACTIVE campaigns (domain.site = null)
- Caches updated to reflect new statuses
- CDN purged for affected domains

**Business Rules Applied**:
- Auto-open: DRAFT/PREVIEW → OPEN when date.open reached
- Auto-close: OPEN → CLOSED when date.close reached
- Auto-deactivate: CLOSED → INACTIVE 30 days after date.closed
- Domain release: INACTIVE campaigns cannot hold exclusive domains

---

### Use Case 4: Query Campaigns by Event ID

**Actor**: Internal Service or Admin

**Goal**: Find all campaigns associated with a specific Ticketmaster event ID

**Preconditions**:
- Event ID exists in Ticketmaster system
- Markets or campaigns have been linked to this event ID

**Main Flow**:
1. Service calls GET /campaigns/events?eventId=<TM_EVENT_ID>
2. System queries markets collection for event.ids containing eventId
3. System extracts distinct campaign_id values from matching markets
4. System queries campaigns collection for:
   - Campaigns where _id IN (campaignIds from step 3) OR eventIds contains eventId
   - Status NOT IN [DRAFT, PREVIEW] (excludes non-eligible campaigns)
   - date.presaleWindowStart exists
5. System formats and returns campaigns with presale window dates

**Postconditions**:
- Service receives list of eligible campaigns for event
- Can determine which campaigns offer presale for this event

**Business Rules Applied**:
- Only campaigns with presaleWindowStart are eligible for event queries
- Excludes auto-open statuses (DRAFT/PREVIEW) from results
- Supports both market-level event association and campaign-level eventIds

---

### Use Case 5: Schedule Market Presale Notifications

**Actor**: Supreme Admin

**Goal**: Set notification dates for upcoming markets to trigger automated fan reminders

**Preconditions**:
- Markets exist with presaleDateTime in next 2-27 hours
- Parent campaigns have options.automatedReminders = true
- User is supreme admin

**Main Flow**:
1. Admin queries GET /markets/upcoming
   - System finds markets with presaleDateTime between NOW+2h and NOW+27h
   - Filters to campaigns with automatedReminders enabled
   - Returns matching markets
2. Admin reviews markets and calls POST /markets/notifyDate
   - Provides marketIds array and notificationDate
3. System validates notificationDate is within acceptable range
4. System updates markets with notification.date field
5. System returns updated market count

**Later Flow** (separate process):
1. Notification service queries GET /markets/notifiable
   - Returns markets where notification.date <= NOW AND notification.notified is null
2. After sending notifications, service calls POST /markets/notified
   - Provides marketIds array
3. System sets notification.notified to current timestamp
4. Markets excluded from future notifiable queries

**Postconditions**:
- Markets have notification.date set
- External notification service can query notifiable markets
- After notification sent, markets marked as notified

**Business Rules Applied**:
- Only supreme users can set/query notifications
- Notification date must be within valid range (validation: isWithinDateRange)
- Only campaigns with automatedReminders qualify

---

### Use Case 6: Update Campaign FAQs or Terms by Locale

**Actor**: Campaign Manager (with edit permission)

**Goal**: Add or update localized content (FAQs/Terms) for a campaign

**Preconditions**:
- Campaign exists
- User has edit permission
- Locale is valid (e.g., 'en-us', 'fr-ca')
- Content matches faqs.json or terms.json schema

**Main Flow**:
1. User calls POST /campaigns/:campaignId/faqs?locale=en-us with FAQ data
2. System validates user has edit permission
3. System validates locale exists and is valid
4. System validates FAQ data against faqs.json schema
5. System updates campaign document: content.en-us.body.faqs = <data>
6. System returns updated FAQ content

**Alternative Flow (Terms)**:
- Same process for POST /campaigns/:campaignId/terms?locale=en-us

**Postconditions**:
- Campaign content updated for specified locale
- Content queryable via GET /campaigns/:campaignId/faqs?locale=en-us
- Changes not published to data stream (content is internal only)

**Business Rules Applied**:
- Permission check: toEdit=true enforces write access
- Schema validation prevents malformed content
- Locale must exist in campaign content structure

---

## User Journey Map

**Artist Team Plans Campaign** → **Admin Creates Campaign in System** → **Admin Adds Markets with Event IDs** → **Campaign Auto-Opens on Schedule** → **Fans Register via Branded Domain** → **Campaign Auto-Closes After Tour** → **Campaign Deactivates After 30 Days, Domain Released**

At each stage:
- Discovery API lookups enrich artist/venue data
- Markets define presale access per geography
- Notifications alert fans before presale starts
- Data streams to analytics for reporting
- Caches updated for performance

---

## Key Workflows

### Workflow 1: Campaign Lifecycle (Automated Status Management)

1. **Creation**: Admin creates campaign with date.open = 2 weeks from now, date.close = 3 months from now
2. **Draft Period**: Campaign exists in DRAFT, admin adds markets, updates content, tests preview
3. **Auto-Open**: Scheduled job runs, detects date.open reached → transitions to OPEN status
4. **Open Period**: Fans register via domain, markets control presale access
5. **Auto-Close**: Scheduled job runs, detects date.close reached → transitions to CLOSED status
6. **Closed Period**: Campaign locked, no new registrations, data retained for 30 days
7. **Auto-Deactivate**: Scheduled job runs, detects 30 days since date.closed → transitions to INACTIVE, releases domain

**Data Flow**:
- Each status change publishes to Kinesis Campaign Data Stream
- Cache updated (OPEN campaigns cached hot, INACTIVE campaigns removed)
- CDN purged for domain changes

---

### Workflow 2: Market Creation and Event Mapping

1. **Admin Selects Campaign**: Queries campaign by domain or ID
2. **Admin Defines Market**: Submits market with city, state, timezone, event IDs
3. **Validation**: System validates schema, checks name uniqueness, verifies campaign exists
4. **Save**: Market inserted into MongoDB with generated _id
5. **Stream to Kinesis**: Event mapping (campaignId → eventIds) published to Campaign Data Stream
6. **Queue to SQS**: Full market data sent to Data Pipeline Queue
7. **Optional**: If presale date set, enqueue to Refresh Selections Queue

**Result**: Other services can now query campaigns by eventId and find this campaign

---

### Workflow 3: Permission-Based Campaign Access

1. **User Authenticates**: JWT issued with campaignIds array and isSupreme flag
2. **User Requests Campaign**: GET /campaigns/list or GET /campaigns/:campaignId
3. **Permission Check**:
   - If isSupreme=true → access granted to all campaigns
   - If isSupreme=false → filter to campaignIds from JWT
4. **Data Returned**: Only campaigns user has permission to view
5. **Edit Operations**: Additional check for edit permissions (authUserActions includes campaignId)

**Enforcement**: throwIfCampaignInaccessible checks permissions before any read/write operation

---

## Example Scenarios

### Scenario 1: Artist Tour Launch

**Setup**: Artist "Taylor Swift" launching "Eras Tour" with 50 markets across North America

1. Supreme admin creates campaign:
   - Name: "Taylor Swift Eras Tour Presale"
   - Domain: "erastour.verifiedfan.com"
   - Artist ID: Discovery API ID for Taylor Swift
   - Type: "registration"
   - date.open: 2026-03-01
   - date.close: 2026-08-31
   - presaleWindowStart: 2026-03-15
   - presaleWindowEnd: 2026-08-20

2. Admin adds 50 markets:
   - Each market = one city (e.g., "Los Angeles", "New York", "Chicago")
   - Each market links to 1-3 Ticketmaster event IDs for that city's shows
   - Each market has presaleDateTime matching local presale start

3. Admin configures localized content:
   - English FAQs: Registration rules, eligibility, presale process
   - French-Canadian FAQs: Translated for Quebec markets

4. Campaign auto-opens on 2026-03-01:
   - Status → OPEN
   - Fans visit erastour.verifiedfan.com
   - Registration flow queries campaign service for campaign config

5. Presale notifications:
   - 24 hours before each market's presaleDateTime
   - System queries markets where presaleDateTime between NOW+2h and NOW+27h
   - Filters to markets with automatedReminders enabled
   - External service sends reminder emails

6. Campaign auto-closes on 2026-08-31:
   - Status → CLOSED
   - Domain remains reserved for 30 more days

7. Campaign deactivates on 2026-09-30:
   - Status → INACTIVE
   - Domain "erastour.verifiedfan.com" released for future campaigns

---

### Scenario 2: Event-Based Campaign Query

**Setup**: Ticketing system needs to validate if event ID "G5vYZ9rHlvCyJ" has associated presale campaigns

1. Ticketing service calls: GET /campaigns/events?eventId=G5vYZ9rHlvCyJ

2. Campaign service:
   - Queries markets where event.ids contains "G5vYZ9rHlvCyJ"
   - Finds 3 markets (Los Angeles, San Diego, Las Vegas)
   - Extracts campaignIds from those markets
   - Queries campaigns with those IDs + status eligible + presale window exists
   - Returns 2 campaigns: "Eras Tour" and "VIP Experience"

3. Ticketing service:
   - Uses campaign data to show presale options
   - Links to campaign domains for registration

---

### Scenario 3: Multi-Campaign Manager Access

**Setup**: Manager "Jane" assigned to 5 specific campaigns via JWT

1. Jane authenticates, receives JWT with:
   - campaignIds: ["abc123", "def456", "ghi789", "jkl012", "mno345"]
   - isSupreme: false

2. Jane calls GET /campaigns/list:
   - System filters campaigns to only those 5 IDs
   - Returns Jane's 5 campaigns

3. Jane tries to access unassigned campaign:
   - GET /campaigns/xyz999
   - System checks authUserActions for xyz999 → not found
   - throwIfCampaignInaccessible throws error
   - Returns 403 or campaign not found error

4. Jane updates assigned campaign:
   - POST /campaigns/abc123 with updated content
   - Permission check passes (abc123 in her campaignIds)
   - Update succeeds

**Result**: Jane isolated to her assigned campaigns, cannot see or edit others
