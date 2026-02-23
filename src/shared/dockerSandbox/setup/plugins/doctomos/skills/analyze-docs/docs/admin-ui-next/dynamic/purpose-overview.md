# Purpose - admin-ui-next

## What This Does

Admin UI Next is a web-based administrative interface for managing Verified Fan campaigns, events, and promoters. It provides internal staff and administrators with tools to configure, monitor, and manage fan registration campaigns for concert tours and ticketing events.

## Business Context

Verified Fan is Ticketmaster's fan verification platform that helps artists and promoters ensure that real fans get access to presale tickets rather than bots and scalpers. This admin interface exists to give campaign managers and internal operations teams the ability to create and configure these fan verification campaigns, link them to Ticketmaster events, and manage the associated promoter information.

The system solves the operational challenge of campaign configuration at scale - allowing administrators to manage hundreds of concurrent campaigns across multiple artists, tours, and markets without needing direct database access or developer intervention.

## Target Users/Consumers

- **Internal Ticketmaster Staff**: Campaign managers, operations teams, and support staff who configure and manage Verified Fan campaigns
- **Admin Users**: Verified by `isAdmin` flag - only authenticated admin users can access the system
- **Campaign Operators**: Staff responsible for setting up multi-city tours with market-specific event configurations

## Key Business Capabilities

- **Campaign Management**: View, search, and monitor all active and historical Verified Fan registration campaigns with detailed metadata (dates, status, tour information, artist details)
- **Event Configuration**: Link Ticketmaster events to campaigns by creating and managing "markets" (event entries) with venue, date, presale information, and promoter associations
- **Promoter Administration**: Create, update, and delete promoter records with localized privacy policy URLs for compliance
- **Multi-locale Support**: Configure campaigns for multiple countries/languages with locale-specific content
- **Campaign Monitoring**: Track campaign status, dates (open/close windows, presale windows, general onsale), and configuration details
- **Venue Search Integration**: Search and select venues from Ticketmaster's venue database when creating events

## Business Requirements & Constraints

- REQ-001: Only authenticated users with `isAdmin=true` can access the system
- REQ-002: All campaign modifications must persist to the backend GraphQL API
- REQ-003: System must support multiple deployment environments (dev, QA, preprod, prod) with environment-specific configurations
- REQ-004: Must integrate with Ticketmaster Identity service for authentication
- REQ-005: Campaign data must display in real-time without requiring page refreshes
- REQ-006: Must support campaigns across multiple timezones and locales
- REQ-007: Event markets must link to Ticketmaster event IDs for ticket inventory integration

## Core Business Rules

- Users must be authenticated via Ticketmaster Identity service and have admin privileges to access any functionality
- Campaigns can have multiple "markets" (events), each representing a specific show/venue/date combination
- Markets can be associated with multiple promoters (many-to-many relationship)
- Each campaign has a "referenceTimezone" that determines how date/time windows are interpreted
- Campaigns have distinct lifecycle windows: campaign open/close, presale window, and general onsale date
- Promoter privacy URLs must support multiple locales to comply with regional privacy regulations
- Campaign status reflects the current state in the lifecycle: active, closed, upcoming, etc.
- Events can have "split allocation" settings for inventory distribution
- Campaigns maintain audit trails with created/updated timestamps

## Integration Points

### Outbound (what we send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Campaign updated | GraphQL mutation | Backend API (monoql) | Immediately when admin saves changes |
| Event created | GraphQL mutation (upsertMarket) | Backend API | When admin creates/updates event market |
| Promoter created/updated | GraphQL mutation (upsertPromoter) | Backend API | When admin manages promoter records |
| Event deleted | GraphQL mutation (deleteMarket) | Backend API | When admin removes event from campaign |
| Promoter deleted | GraphQL mutation (deletePromoter) | Backend API | When admin removes promoter |

### Inbound (what events we respond to)

This application is primarily query-driven with no event consumption. Data is fetched on-demand via GraphQL queries:

| Source | Query | Action | Timing |
|--------|-------|--------|--------|
| Backend API (monoql) | admin_campaignsList | Display campaign list | On page load, pagination, search |
| Backend API (monoql) | admin_campaign | Display campaign details | When viewing specific campaign |
| Backend API (monoql) | admin_initApp | Verify authentication | On app initialization |
| Backend API (monoql) | getPromoters | Display promoter list | On promoters page load |
| Backend API (monoql) | searchVenues | Venue autocomplete | When admin searches for venues during event creation |

### Service Dependencies

**Critical Dependencies:**
- **monoql GraphQL API** (`monoql-dev.vf.nonprod9.us-east-1.tktm.io/graphql`): Primary data source for all campaign, event, and promoter data
- **Ticketmaster Identity Service** (`identity.tktm.io`): Authentication and authorization provider
- **Reg UI** (`reg-ui-dev.vf.nonprod9.us-east-1.tktm.io`): Campaign preview URLs link to the public-facing registration interface

**Technology Stack:**
- Next.js 15 (React 18) - Server-side rendering framework
- Apollo Client - GraphQL data fetching
- Ticketmaster Design Systems (@tm1/design-system-react, @ticketmaster/global-design-system)
- Styled Components - UI styling
- Zustand - Client state management

## Success Metrics

- **Authentication Success Rate**: 100% of authorized admins can log in without errors
- **API Response Time**: GraphQL queries complete within < 2 seconds (p95)
- **Data Accuracy**: Campaign configuration changes persist correctly 100% of the time
- **System Availability**: Admin interface accessible 99.9% during business hours
- **User Task Completion**: Admins can create/configure a campaign with events in < 5 minutes
