# Purpose - campaign-service

## What This Does

Campaign Service manages presale campaigns for artists and tours, enabling artists to create branded registration sites, define markets with event-specific presale access, and control when fans can register for presale codes. It orchestrates campaign lifecycle from draft through opening, closing, and eventual deactivation while coordinating with Ticketmaster's Discovery API for event data.

## Business Context

Artists and promoters need to generate demand and collect fan registrations before tickets go on public sale. Presale campaigns allow artists to build their own branded registration experiences tied to specific events/tours, capturing fan interest early and enabling controlled access to presale opportunities. This system serves as the central authority for campaign configuration, status management, and event-to-campaign mappings.

## Target Users/Consumers

- **Admin Users (Supreme)**: Create and manage campaigns, configure markets, refresh campaign statuses, access system-wide operations
- **Campaign Managers**: Update assigned campaigns, manage markets and content within their authorized campaigns
- **Internal Services**: Other Titan microservices query campaign data to validate presale eligibility, retrieve event mappings, and coordinate fan registration flows
- **Data Pipeline**: Consumes campaign and market changes for analytics and reporting

## Key Business Capabilities

- **Campaign Lifecycle Management**: Automatically transition campaigns between DRAFT → PREVIEW → OPEN → CLOSED → INACTIVE based on scheduled dates
- **Market-Event Mapping**: Associate geographical markets with specific Ticketmaster event IDs, enabling location-based presale access
- **Domain Management**: Assign unique branded domains to active campaigns, automatically reclaiming domains when campaigns deactivate
- **Presale Window Control**: Define when fans can register for each market, supporting automated reminder notifications
- **Multi-locale Content**: Manage FAQs, terms, and campaign content across multiple locales for international campaigns
- **Discovery Integration**: Fetch real-time artist and venue data from Ticketmaster's Discovery API for campaign setup

## Business Requirements & Constraints

- **REQ-001**: Each active campaign must have a unique domain.site value (enforced via sparse unique index)
- **REQ-002**: Campaigns must automatically open when date.open is reached and close when date.close is reached
- **REQ-003**: Closed campaigns must automatically deactivate 30 days after closing, freeing their domain for reuse
- **REQ-004**: Only supreme users can create campaigns, refresh statuses, and access system-wide operations
- **REQ-005**: Campaign managers can only access campaigns explicitly granted in their JWT permissions
- **REQ-006**: All campaign and market changes must be streamed to the data pipeline via Kinesis
- **REQ-007**: Markets must validate against JSON schema before save (campaign_id, name, city, state, timezone required)
- **REQ-008**: Campaign status transitions must be atomic and preserve status history
- **REQ-009**: Market updates that change presale date/time must trigger refresh-selections queue notification

## Core Business Rules

- **Status Lifecycle**: DRAFT/PREVIEW campaigns auto-open on schedule; OPEN campaigns auto-close on schedule; CLOSED campaigns auto-deactivate after 30 days
- **Domain Exclusivity**: Active campaigns (DRAFT/PREVIEW/OPEN/CLOSED) hold exclusive domain names; INACTIVE campaigns release their domain (set to null)
- **Permission Model**: Supreme users have global access; regular users limited to campaigns in their JWT campaignIds array
- **Market Uniqueness**: Market names must be unique within a campaign (but can repeat across campaigns)
- **Presale Window Validation**: Presale query start/end dates must be provided together (enforced validation)
- **Notification Eligibility**: Only markets with automatedReminders enabled in parent campaign qualify for automated notifications
- **Event Association**: Markets link to Ticketmaster events via event.ids array; campaigns can also declare eventIds for blanket event association

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Campaign created/updated | Send event mapping data | Campaign Data Stream (Kinesis) | Immediately after save |
| Market created/updated/deleted | Send market data | Data Pipeline Queue (SQS) | Immediately after operation |
| Market presale date changed | Refresh selections request | Refresh Selections Queue (SQS) | On market update if date changes |
| Campaign status changed | Cache update | Redis (read replica support) | After status transitions |
| Campaign domain changes | CDN cache purge | Fastly | After domain-related updates |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Admin trigger | POST /campaigns/refresh | Auto-open/close/deactivate campaigns | On-demand |
| Scheduled job (external) | Periodic refresh trigger | Update campaign statuses based on dates | Periodic (likely cron) |
| Discovery API | Artist/Venue lookups | Cache and return formatted data | On campaign creation/update |
| Admin operations | Create/update requests | Validate schema, update DB, trigger downstream | Real-time |

### Service Dependencies

- **Ticketmaster Discovery API**: Fetch artist and venue metadata by discovery ID, search for artists/venues
- **Redis**: Cache campaign data, support read replica for high-availability reads
- **Fastly CDN**: Purge cache when campaign domains or content change
- **AWS Kinesis**: Campaign Data Stream for event mappings
- **AWS SQS**: Data Pipeline Queue (markets), Refresh Selections Queue (presale updates)
- **MongoDB**: Primary data store for campaigns, markets, contacts, promoters
- **GitLab API**: Possibly for deployment or configuration management (service exists)

## Success Metrics

- Campaign transition accuracy: 100% of campaigns transition on scheduled dates within 1 minute
- Domain uniqueness: Zero conflicts on active campaign domains
- API response time: < 200ms (p95) for campaign lookup by domain
- Data pipeline delivery: 100% of campaign/market changes delivered to Kinesis/SQS
- Permission enforcement: Zero unauthorized access to campaigns
- Schema validation: 100% rejection of invalid campaign/market data before DB write
