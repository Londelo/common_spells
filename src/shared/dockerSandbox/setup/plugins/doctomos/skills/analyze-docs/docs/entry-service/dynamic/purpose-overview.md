# Purpose - entry-service

## What This Does

Entry-service manages fan registrations (entries) for Verified Fan campaigns. It handles the complete lifecycle of fan entries including registration, validation, phone confirmation, scoring updates, market preference tracking, and eligibility determination for ticket allocations.

## Business Context

This service solves the critical business problem of managing fan registrations at scale for high-demand events. It ensures fair and verifiable fan participation by:
- Validating fan eligibility before allowing registration
- Tracking market (venue) preferences for multi-city tours
- Managing phone confirmation workflows to prevent duplicate/fraudulent entries
- Integrating with scoring systems to rank fans for ticket allocation
- Publishing registration data to downstream systems for analytics and selection

Without this service, the Verified Fan platform cannot accept registrations, track fan preferences, or determine who is eligible for ticket offers.

## Target Users/Consumers

**Primary Users:**
- **Fans**: End users who register for campaigns to get access to tickets/experiences
- **Campaign Administrators**: Staff who manage campaigns and monitor registration metrics

**System Consumers:**
- **campaign-service**: Provides campaign configuration and market definitions
- **user-service**: Provides fan account information
- **scoring-service**: Consumes registration data for fan scoring/ranking
- **selection-service**: Queries eligibility data to allocate tickets
- **analytics pipelines**: Consume registration events via Kinesis for reporting

## Key Business Capabilities

- **Fan Registration Management**: Create and update fan entries with market preferences, opt-ins, and personal data
- **Eligibility Validation**: Determine if fans can register based on campaign gates (invite-only, linked accounts, card verification)
- **Phone Confirmation**: Verify fan phone numbers via one-time codes to prevent duplicate registrations
- **Market Preference Tracking**: Track up to 4 market (venue) preferences per fan for multi-city campaigns
- **Scoring Integration**: Sync entry data with scoring system and query eligible fan pools for selection
- **Entry Transfer**: Move entries between markets (e.g., when venues change or are added)
- **Registration Analytics**: Count and breakdown registrations by market, status, and preference rank

## Business Requirements & Constraints

- REQ-001: Fans must confirm phone numbers within the campaign timeframe if phone confirmation is enabled
- REQ-002: System must prevent duplicate phone-confirmed registrations within a campaign
- REQ-003: Entry modifications that change phone numbers must unset phone confirmation status
- REQ-004: Entries can only be created if campaign status allows registration
- REQ-005: Market preference changes must preserve rank order integrity
- REQ-006: Scoring records must be linked to phone-confirmed entries only
- REQ-007: Supreme (admin) users required for administrative operations (transfer, bulk updates, etc.)
- REQ-008: System must track entry creation/update timestamps for audit and analytics
- REQ-009: Failed phone confirmations by other users must block registration with that phone number
- REQ-010: Registration data must be published to Kinesis stream for downstream consumers

## Core Business Rules

- "Phone confirmation is required if campaign has `needsPhoneConfirmation` flag enabled"
- "Entry phone numbers must be unique per campaign after confirmation"
- "Fans can register for campaigns with linked account gates only if they have connected social accounts"
- "Invite-only campaigns require a valid invite code"
- "Card gates require verified payment card on fan account"
- "Market preferences are stored as an array with first item being primary preference"
- "Scoring records can only be created for entries with confirmed phones"
- "Eligibility queries filter by score ranges, market preferences, and selection status"
- "Entry transfers move entire registration from one market to another, updating market preference arrays"
- "Receipts are sent only after successful registration if phone auto-confirmed or PPC disabled"
- "Nudetect fraud detection is invoked for all entry creations/updates"
- "Fanscore (account scoring) is queried and stored on each entry upsert"

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Entry created/updated | Send registration data | Kinesis campaignDataStream | Immediately after upsert |
| Entry created (phone confirmed) | Send receipt email | Email service (via sendReceipt) | After successful creation if eligible |
| Phone confirmed | Update entry confirmation date | MongoDB entries collection | When JWT validation succeeds |
| Scoring records upserted | Save scoring data | MongoDB scoring collection | When admin uploads scoring results |
| Entry missing scores | Queue retry request | SQS retryScoresQueue | If entry lacks scoring after creation |
| Fraud check | Send entry data | Nudetect service | On every entry create/update |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Fan client | POST /:campaignId/entries | Create/update entry | Real-time during registration |
| Fan client | POST /:campaignId/entries/confirm | Confirm phone number | Real-time after receiving SMS code |
| Admin tool | POST /:campaignId/entries/scoring | Bulk upload scoring records | Batch operation |
| Admin tool | POST /:campaignId/entries/transfer | Transfer entries between markets | On-demand market changes |
| Admin tool | GET /:campaignId/entries/eligibility | Query eligible fan counts | Pre-selection analysis |
| Admin tool | GET /:campaignId/entries/scoring | Query eligible fans for selection | During ticket allocation |

### Service Dependencies

**Required Services:**
- **campaign-service**: Retrieve campaign configuration, gates, markets
- **user-service**: Fetch fan account details, linked accounts, codes
- **MongoDB**: Primary datastore for entries and scoring collections
- **Kinesis**: Campaign data stream for downstream consumers
- **SQS**: Retry queue for scoring operations
- **Nudetect**: Fraud detection scoring
- **AppSync**: GraphQL API for real-time updates (optional)
- **SFMC**: Marketing Cloud for receipt emails

## Success Metrics

- Entry creation success rate > 99% (excluding business rule violations)
- Phone confirmation success rate > 95% for campaigns with PPC enabled
- API response time < 300ms (p95) for entry retrieval
- API response time < 500ms (p95) for entry upsert
- Zero duplicate phone-confirmed entries per campaign
- Kinesis publish success rate > 99.9%
- Scoring eligibility query response time < 2s for 100k+ entry campaigns
