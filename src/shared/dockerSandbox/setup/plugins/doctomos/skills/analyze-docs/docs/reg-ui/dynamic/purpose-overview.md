# Purpose - reg-ui

## What This Does

reg-ui is a fan registration and campaign management web application that enables music fans to sign up for presale access to concert tickets. It serves as the user-facing interface for Ticketmaster's Verified Fan platform, allowing fans to register for artist tour campaigns, select their preferred concert markets, manage opt-in preferences, and receive unique presale access codes.

## Business Context

The application exists to solve the ticketing scalping and bot problem by creating a verified fan ecosystem. Instead of general on-sale where bots can purchase tickets in bulk, artists and promoters can require fans to register ahead of time, proving they are legitimate fans. This enables fair ticket distribution by allocating presale codes to verified fans before general public sales.

The system addresses several pain points:
- **Fan frustration**: Legitimate fans often lose out to bots and scalpers in general on-sales
- **Artist control**: Artists want to ensure their true fans get first access to tickets
- **Revenue protection**: Promoters and venues lose revenue when tickets are resold at inflated prices
- **Market demand insight**: Registration data provides valuable intelligence on geographic demand before tickets go on sale

## Target Users/Consumers

**Primary Users (End Fans)**:
- Music fans who want presale access to concert tickets
- Fans who are members of artist fan clubs (LNAA - Live Nation Artist Alliance)
- Mobile app users accessing campaigns through the Ticketmaster mobile application

**Secondary Consumers (Systems)**:
- **Campaign Service**: Provides campaign configuration data (cached in Redis)
- **Identity/Auth Service**: Handles user authentication and session management
- **AppSync GraphQL API**: Backend service for entries, fan data, and LNAA membership
- **CDN/Caching Layer**: Distributes static assets and caches responses

**Business Stakeholders**:
- Artists and their management teams
- Concert promoters and venues
- Ticketmaster operations and marketing teams

## Key Business Capabilities

- **Campaign Registration**: Fans can register for specific artist tour presale campaigns by selecting concert markets and providing consent
- **Multi-Market Selection**: Fans can register for multiple concert markets within a single tour campaign
- **Presale Code Generation**: System generates unique presale codes per market for registered fans
- **Fan Club Integration**: LNAA (Live Nation Artist Alliance) members can activate membership benefits during registration
- **Identity Verification**: Optional identity verification (IDV) gate for high-demand campaigns requiring additional verification
- **Linked Campaign Support**: Ability to link related campaigns (e.g., fan club campaigns linked to general presale campaigns)
- **Multilingual Support**: Full internationalization with locale-specific content, terms, and privacy policies across 20+ locales
- **Campaign State Management**: Handles open, closed, draft, and preview campaign states with appropriate UI responses
- **Entry Modification**: Allows fans to edit their market selections and preferences before campaign closes
- **Real-Time Availability**: Shows campaign countdown, open/close times, and presale windows
- **Promotional Opt-Ins**: Manages consent for artist marketing, Live Nation marketing, SMS communications, and promoter-specific opt-ins

## Business Requirements & Constraints

### Functional Requirements

- **REQ-001**: Fans must authenticate through Ticketmaster Identity before registering for campaigns
- **REQ-002**: Each fan may only register once per campaign (one entry per fan per campaign)
- **REQ-003**: Fans must select at least one market to complete registration
- **REQ-004**: System must generate unique presale codes for each market selection
- **REQ-005**: Campaign must respect configured open/close dates with timezone accuracy
- **REQ-006**: All user consent (opt-ins) must be explicitly captured and stored
- **REQ-007**: Fans must be able to modify their entry (markets/opt-ins) until campaign closes
- **REQ-008**: Confirmation page must display selected markets and generated presale codes
- **REQ-009**: LNAA members must be able to activate membership during registration if campaign is LNAA-enabled
- **REQ-010**: Campaign content (FAQs, hero images, terms) must adapt to user's locale preference

### Technical Requirements

- **REQ-011**: Campaign data must be cached in Redis with 1-week TTL for performance
- **REQ-012**: Application must load campaigns by URL slug pattern (e.g., `/artist-name-tour`)
- **REQ-013**: All GraphQL mutations must validate campaign state (open/closed) before accepting entries
- **REQ-014**: Application must support both draft (preview) and production campaigns
- **REQ-015**: Campaign pages must load within 2 seconds (p95) with cached data
- **REQ-016**: Client-side state must sync with server state (entries) on page load
- **REQ-017**: Application must expose Prometheus metrics for monitoring

### Data Requirements

- **REQ-018**: Campaign data structure must follow schema version 2.x format
- **REQ-019**: Entry records must include: campaignId, locale, selected markets, opt-in preferences, codes, and modification timestamps
- **REQ-020**: Fan profile must capture: firstName, lastName, email, location (lat/long), login status
- **REQ-021**: Market data must include: event date, venue, timezone, presale datetime, ticketing link, promoter IDs

### Business Logic Constraints

- **CONSTRAINT-001**: Cannot modify entry after campaign closes
- **CONSTRAINT-002**: Cannot register for closed campaigns
- **CONSTRAINT-003**: Cannot access campaign without authentication (except for unauthenticated preview mode)
- **CONSTRAINT-004**: Cannot register for invite-only campaigns without valid invite
- **CONSTRAINT-005**: Cannot register for linked campaigns without entry in parent campaign
- **CONSTRAINT-006**: LNAA activation requires authenticated LNAA membership status

### Compliance Requirements

- **REQ-022**: Must display locale-specific privacy policy links for opt-ins
- **REQ-023**: Must display promoter-specific privacy policies when promoter opt-ins exist
- **REQ-024**: Must provide terms of use accessible from all pages
- **REQ-025**: Must respect user consent preferences and not send communications without explicit opt-in

## Core Business Rules

### Campaign Access Rules

- **Closed Campaigns**: Fans can view confirmation page if they have existing entry, but cannot register or modify entries
- **Draft Campaigns**: Only accessible via preview URL with draft token (e.g., `?draft=true`)
- **Invite-Only Campaigns**: Require valid invite token or entry in linked campaign to access
- **IDV-Gated Campaigns**: Require identity verification through IDV SDK before registration completes
- **Linked Campaigns**: Must have valid entry in parent/linked campaign to register in child campaign

### Registration Rules

- **One Entry Per Campaign**: Each authenticated fan can register exactly once per campaign (updates are modifications, not new entries)
- **Market Selection Required**: Must select at least one market to submit registration form
- **Auto-Submit Behavior**: If only one market exists and all opt-ins are required, form auto-submits on identity verification
- **Entry Transfer**: Fans can transfer entry data (markets, opt-ins) from linked campaign to current campaign via `doTransfer` flag

### Code Generation Rules

- **Unique Codes Per Market**: Each market selection generates a unique presale code
- **Code Persistence**: Codes remain stable across entry modifications (not regenerated on update)
- **Shared Codes**: Some markets use shared presale codes (sharedCode field) instead of unique per-fan codes

### Time-Based Rules

- **Campaign Open/Close**: Registration only allowed when `status = OPEN` and current time is between `date.open` and `date.close`
- **Presale Window**: Confirmation page displays presale window (`date.presaleWindowStart` to `date.presaleWindowEnd`)
- **Timezone Handling**: All date/time calculations respect campaign's `referenceTimezone`
- **Countdown Timer**: Shows time remaining until campaign closes when open, or time until opens when in future

### LNAA (Fan Club) Rules

- **LNAA Activation**: LNAA-enabled campaigns allow opt-in to activate dormant memberships during registration
- **Member Status Check**: System verifies LNAA membership status via GraphQL query before showing LNAA opt-in
- **Linked Campaign Priority**: LNAA campaigns often serve as linked campaigns (parent) for general presale campaigns

### Opt-In Rules

- **Required vs Optional**: Preferences marked `is_optional: false` must be checked to submit form
- **Default States**: Marketing and Live Nation opt-ins default to `true`, artist SMS defaults to `false`
- **Promoter Opt-Ins**: Dynamically generated based on selected markets' associated promoters
- **Privacy Policy Display**: Each opt-in displays appropriate privacy policy link based on user's locale

### Locale/Internationalization Rules

- **Locale Resolution**: System determines best viewing locale from campaign's supported locales and user's browser preference
- **Locale Fallback**: Falls back to default locale (`en-US`) for missing translations via `@verifiedfan/locale` package
- **Content Transformation**: Campaign content (FAQs, body text, terms) transforms to target locale on server before rendering
- **URL Localization**: Privacy policies, ticketing links, and artist URLs resolve to locale-specific versions when available

### Validation Rules

- **Campaign Version**: Only campaigns with `schema.version = 2.x` are supported (v1 campaigns return 404)
- **Timezone Validation**: Invalid timezones are corrected to valid IANA timezone identifiers
- **User Access Validation**: Validates user has appropriate access level (draft token for preview, invite for invite-only, etc.)

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Fan registers | `upsertEntry` mutation | AppSync GraphQL API | Immediately on form submission |
| Fan modifies entry | `upsertEntry` mutation | AppSync GraphQL API | Immediately when editing existing entry |
| LNAA member activates | `activateLNAA` mutation | AppSync GraphQL API | When LNAA opt-in checked during registration |
| Page view | Page view event | Google Tag Manager / Analytics | On page transitions (registration → confirmation) |
| Client-side error | Log entry | `/api/log` endpoint | When client-side errors occur |
| Campaign loaded | Increment campaign view metric | Prometheus metrics (`/metrics`) | On each campaign page load |

### Inbound (what events we respond to)

| Source | Event/Data | Action | Timing |
|--------|-----------|--------|--------|
| Campaign Service | Campaign data cached in Redis | Load campaign by slug | 8-hour cache, on-demand refresh |
| Identity/Auth Service | User authentication session | Fetch user profile, determine login state | On page load |
| AppSync GraphQL API | Entry record (via `getEntry` query) | Populate form with existing selections | On page load for authenticated users |
| AppSync GraphQL API | LNAA membership status | Show/hide LNAA opt-in checkbox | When `getLNAAMemberStatus` query returns |
| AppSync GraphQL API | Fan profile data | Pre-populate confirmation with name/email | After successful registration |
| Browser navigation | URL path (campaign slug) | Look up campaign from cache | On each route |
| Browser navigation | Query params (`draft`, `queueit`, etc.) | Modify campaign access logic | On route parse |

### Service Dependencies

**Critical Dependencies** (app cannot function without these):
- **Redis Cache**: Primary data source for campaign configurations (primary + read-replica)
- **AppSync GraphQL API**: Backend for fan entries, LNAA membership, entry mutations
- **Ticketmaster Identity Service**: User authentication and session management
- **Environment Config Service**: Provides `REDIS_URL`, `APPSYNC_ENDPOINT`, API keys via environment variables

**Optional Dependencies** (graceful degradation):
- **Artist Discovery Service**: Provides artist detail data (social links, images) for confirmation page - falls back to basic artist data if unavailable
- **Promoter Service**: Provides promoter metadata (names, privacy policies) for opt-ins - falls back to promoter IDs if unavailable
- **NuData**: Fraud detection service integrated client-side - registration continues if unavailable
- **Queue-it**: Virtual waiting room for high-demand campaigns - bypassed if not configured

**Related Repositories**:
- **campaign-service**: Manages campaign CRUD operations and publishes campaigns to Redis cache
- **entry-service**: Backend service powering AppSync GraphQL API for entry management
- **identity-service**: Handles user authentication, session tokens, profile data
- **idv-sdk** (`@verifiedfan/idv-sdk`): Client-side identity verification SDK for IDV-gated campaigns
- **global-design-system** (`@ticketmaster/global-design-system`): Shared UI component library

## Success Metrics

### Performance Metrics

- **Campaign Load Time**: < 2 seconds (p95) with cached data
- **API Response Time**: GraphQL mutations complete within 500ms (p95)
- **Cache Hit Rate**: > 95% for campaign lookups (Redis cache effectiveness)
- **Availability**: 99.9% uptime during campaign registration windows

### Business Metrics

- **Registration Completion Rate**: % of users who start registration and successfully submit
- **Entry Modification Rate**: % of fans who return to modify their entry before campaign closes
- **Multi-Market Selection**: Average number of markets selected per fan
- **LNAA Activation Rate**: % of eligible LNAA members who activate during LNAA campaigns
- **Opt-In Consent Rate**: % of fans who consent to marketing communications

### Data Quality Metrics

- **Valid Email Rate**: 100% (enforced by authentication)
- **Market Selection Accuracy**: 100% (validated before submission)
- **Code Generation Success**: 100% (codes generated for all registered markets)

### User Experience Metrics

- **Mobile Responsiveness**: 100% feature parity between desktop and mobile web
- **Internationalization Coverage**: All supported locales display fully localized content
- **Error Rate**: < 1% of registration attempts result in errors requiring user retry
- **Client-Side Error Rate**: Monitored via `/api/log` endpoint - target < 0.5% of sessions

### Technical Health Metrics

- **Redis Connection Stability**: < 1% connection errors or timeouts
- **GraphQL Success Rate**: > 99.5% of mutations succeed
- **CDN Cache Effectiveness**: > 90% of static assets served from CDN cache
- **Build Success Rate**: 100% of CI/CD builds pass linting, type checking, and tests
