# Purpose - AppSync

## What This Does

Verified Fan AppSync is a GraphQL API service that provides fan verification, scoring, identity management, and demand tracking capabilities for Ticketmaster's Verified Fan program. The API enables secure fan registration, liveness verification, ticket demand notification, and fan scoring to help distinguish authentic fans from bots and scalpers.

## Business Context

This service exists to support Ticketmaster's Verified Fan program, which aims to protect high-demand ticket sales from bots, scalpers, and fraudulent buyers. By providing real-time fan scoring, identity verification, and demand tracking, the API enables presale campaigns to prioritize genuine fans who have demonstrated authentic interest in artists and events. The service integrates fan data from multiple sources (TM accounts, phone verification, behavioral signals) to produce trust scores that drive access decisions for exclusive ticket sales.

## Target Users/Consumers

- **Frontend Applications**: Web and mobile apps consuming GraphQL queries/mutations for fan registration and status checks
- **Campaign Service**: Downstream service managing Verified Fan campaigns and presale workflows
- **TM Account Service**: Integration point for Ticketmaster user identity and authentication
- **Event Services**: Systems querying event details and managing ticket sale information
- **Admin Tools**: Internal dashboards and tools monitoring fan verification status and demand metrics
- **Liveness Verification Vendors**: External ID verification services (selfie + government ID checks)

## Key Business Capabilities

- **Fan Scoring & Risk Assessment**: Calculate trust scores for fan accounts based on historical behavior, phone risk, bot detection, and event-specific engagement
- **Identity Verification & Liveness Detection**: Initiate and track selfie-based and government ID verification sessions to confirm fan identity
- **Demand Tracking & Notification**: Allow fans to express interest in specific events/sales and enable SMS/email notifications when tickets become available
- **Campaign Registration Management**: Store and retrieve fan registration data for presale campaigns, including custom form fields and entry codes
- **Cluster Detection**: Identify potentially fraudulent account clusters (multiple accounts from same household/device)
- **Phone Intelligence**: Validate phone numbers, detect VOIP/burner phones, assess fraud risk

## Business Requirements & Constraints

- REQ-001: System must calculate fan scores in real-time (< 1 second) to support high-traffic presale launches
- REQ-002: Liveness verification sessions must expire within configured timeframes (typically 24-48 hours)
- REQ-003: Demand records must be saved/deleted atomically to prevent duplicate notifications
- REQ-004: Phone uniqueness must be enforced per campaign to prevent duplicate registrations
- REQ-005: All fan identity lookups must support both globalUserId and memberId identifiers
- REQ-006: Verification status queries must prioritize current campaign records over legacy data
- REQ-007: GraphQL API must support both API key and Lambda (JWT) authentication
- REQ-008: Entry records must track timestamps for fan modifications vs system updates

## Core Business Rules

- "Account fanscores lookup prioritizes globalUserId over memberId when both are available"
- "Scores are randomized within +/- 10% range to prevent gaming and add fairness variance"
- "Event-specific engagement boosts are applied on top of base account scores"
- "ARM (Account Risk Model) scores range from 1 (always pass) to 5 (high risk)"
- "Bot detection flags override other positive signals and mark accounts as high-risk"
- "Liveness verification requires selfie matching for medium/high risk tiers, selfie + government ID for always/ASU tiers"
- "Demand records can only be saved/deleted by logged-in users for their own accounts"
- "Phone numbers flagged as VOIP, prepaid, or on block lists receive lower risk scores"
- "Expired or archived fanscore records (with TTL set) are excluded from queries"
- "Entry records with duplicate phone numbers within same campaign are rejected"
- "Linked campaign entries can be transferred when fans register for a different variant"

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Entry record saved | Update campaign registration | Campaign Service (via Lambda) | Immediately after registration |
| Liveness status updated | Subscription notification | Frontend clients | Real-time via GraphQL subscription |
| Demand record saved/deleted | Update notification preferences | Internal demand tracking | Immediately after mutation |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Campaign Service | Campaign metadata query | Return campaign list for event | On-demand via GraphQL |
| TM Account Service | User account info query | Fetch email, phone, identity | On-demand via HTTP datasource |
| Liveness Vendor | Verification status webhook | Update session status | Real-time webhook handler |
| Frontend Client | Fan registration mutation | Save entry record to DynamoDB | Immediate transaction |

### Service Dependencies

**Required Dependencies:**
- **Campaign Service**: Provides campaign metadata (presale windows, slugs, identifiers)
- **TM Account Service**: Source of truth for user email, phone number, and system identity
- **Liveness Verification Vendor**: External service for selfie and government ID verification
- **DynamoDB Tables**: account_fanscore, fan_identity, verification, demand, fan_artists
- **Redis Cache**: Campaign configuration and presale window data

**Optional Integrations:**
- **Bot Detection Service**: Provides bot/not-bot scoring signals
- **Phone Intelligence Service**: Validates phone numbers and assesses fraud risk
- **Event Discovery Service**: Maps internal event IDs to market/placement identifiers

## Success Metrics

- Fanscore query response time < 200ms (p95)
- Liveness check initiation success rate > 99%
- Demand record mutation success rate > 99.5%
- GraphQL API availability > 99.9%
- Zero duplicate registrations per campaign (phone uniqueness enforcement)
- Accurate cluster detection (low false positive rate for legitimate household accounts)
