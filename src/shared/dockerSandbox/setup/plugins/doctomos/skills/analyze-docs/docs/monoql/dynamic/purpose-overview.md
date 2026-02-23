# Purpose - monoql

## What This Does

MonoQL is the unified GraphQL API gateway for Ticketmaster's Verified Fan platform. It consolidates access to fan registration campaigns, presale eligibility, ticket allocations, and fan engagement tracking through a single GraphQL interface that serves both end-users (fans) and administrative tools.

## Business Context

Ticketmaster's Verified Fan system requires fans to pre-register for concert/event presales to combat bots and scalpers. MonoQL exists as the central API that orchestrates multiple backend services (campaign management, user authentication, entry tracking, ticket code distribution) into one cohesive interface. Without this layer, client applications would need to integrate with 4+ separate microservices, creating complexity and inconsistency. MonoQL provides a unified data model and authentication layer that simplifies frontend development while maintaining security and performance.

## Target Users/Consumers

- **Fans**: End users registering for presales, checking eligibility, confirming phone numbers, viewing campaign details
- **Campaign Administrators**: Marketing teams and event promoters managing campaigns, viewing metrics, exporting fan data, configuring ticket allocations
- **Frontend Applications**: Web and mobile apps (registration portals, admin dashboards) that consume the GraphQL API
- **Analytics/Reporting Systems**: Internal tools that query campaign performance and fan engagement metrics

## Key Business Capabilities

- **Fan Registration Management**: Enables fans to discover campaigns, submit registration entries with preferences, verify contact information
- **Campaign Configuration**: Allows admins to create/update campaigns, configure gating rules (credit card verification, linked accounts, identity verification), set presale windows, manage multi-locale content
- **Eligibility & Selection**: Determines which fans qualify for presale codes based on registration data, scoring algorithms, and capacity constraints across multiple markets/venues
- **Ticket Code Distribution**: Manages access code inventory, assigns codes to selected fans, tracks redemption across ticketing platforms
- **Market & Venue Management**: Handles geographic targeting with venue assignments, population sizing, and event-specific allocation rules
- **Data Export & Analytics**: Provides exportable datasets of fan entries, eligibility metrics, selection results for business intelligence and promoter reporting

## Business Requirements & Constraints

- REQ-001: System must authenticate users via Ticketmaster identity service before allowing campaign interactions
- REQ-002: Campaign data must support localization for US, Canada, UK, Ireland, and Mexico markets (English/French/Spanish)
- REQ-003: Phone verification must be confirmed within campaign window to maintain eligibility
- REQ-004: Access code assignments must be idempotent to prevent duplicate code distribution
- REQ-005: Campaign permissions model must support granular access control for multi-team management
- REQ-006: All fan data handling must comply with GDPR/CCPA requirements (do-not-sell flags, data export)
- REQ-007: API must handle concurrent campaign launches with 10K+ registrations per minute
- REQ-008: Export operations must not block interactive queries (async processing required)

## Core Business Rules

- **Registration Eligibility**: Fans can only enter open campaigns; closed/finished campaigns reject new entries
- **Phone Confirmation Window**: Fans must verify phone numbers before campaign close date or entry is invalidated
- **Duplicate Prevention**: One entry per user per campaign (identified by email/globalUserId/memberId depending on campaign config)
- **Gating Requirements**: Campaigns can require credit card verification (Visa/Amex/etc), linked accounts (Verizon/Citi), or identity verification (ASU tier) before entry acceptance
- **Market Preference Ranking**: Fans rank venue preferences; selection algorithms prioritize higher-ranked choices
- **Code Assignment Logic**: Selected fans receive codes tied to specific events; codes may be single-use or account-bound
- **Selection Reassignment**: Previously selected fans can be excluded from future waves or included for multiple allocations
- **Score Filtering**: Admins can set min/max fan scores for eligibility (fraud prevention/priority ranking)

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Fan registers | Submit entry data | Entry Service | Immediately on form submission |
| Campaign created/updated | Save campaign config | Campaign Service | On admin save action |
| Eligibility check | Query entry eligibility | Entry Service | When campaign loads for viewer |
| Code assignment | Reserve/assign codes | Code Service | During wave preparation/selection |
| Data export | Generate export file | Export Service (S3) | On admin export request |
| User authentication | Validate JWT token | User Service | On every authenticated request |
| Artist/venue search | Query discovery data | Campaign Service | On admin search input |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| User Service | Authentication token | Establish session context | Per request |
| Campaign Service | Campaign data response | Normalize and return to client | Real-time |
| Entry Service | Entry/eligibility data | Calculate metrics, format results | Real-time |
| Code Service | Code count/status | Display inventory to admins | Real-time |
| Upload Service | File processing status | Update export/upload state | Async polling |

### Service Dependencies

MonoQL acts as an orchestration layer that depends on these backend services:
- **Campaign Service**: Campaign CRUD, market management, artist/venue search, promoter config
- **Entry Service**: Fan entry management, eligibility logic, selection algorithms, scoring
- **User Service**: Authentication, profile management, permissions
- **Code Service**: Access code inventory, assignment tracking
- **Upload/Export Service**: File storage (S3), async data processing
- **Discovery Service** (via Campaign Service): Artist and venue metadata

## Success Metrics

- API response time < 500ms (p95) for query operations
- Campaign registration submission success rate > 99.5%
- Zero duplicate code assignments per campaign wave
- Authentication failure rate < 0.1%
- Export job completion within 15 minutes for 100K+ entries
- GraphQL error rate < 0.5% of total requests
