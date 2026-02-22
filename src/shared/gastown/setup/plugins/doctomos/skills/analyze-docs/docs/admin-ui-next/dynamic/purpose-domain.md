# Domain Concepts - admin-ui-next

## Core Entities

| Entity | Description |
|--------|-------------|
| **Campaign** | A Verified Fan registration campaign for an artist or tour. Contains metadata, date windows, content, styling, and associated events. Campaigns have distinct types: RegistrationCampaign, FanlistCampaign. |
| **Market** | An individual concert event within a campaign. Represents a specific show date, venue, and location. Also called "Event" in the UI. Contains Ticketmaster event IDs, venue details, promoter associations, and presale information. |
| **Promoter** | An entity responsible for promoting events (e.g., Live Nation, AEG, local promoters). Contains name and localized privacy policy URLs required for fan data compliance. |
| **Artist** | The performer associated with a campaign. Contains name, images, Discovery ID (Ticketmaster artist catalog ID), and fanclub name. |
| **Venue** | Physical location where an event occurs. Contains name, address, geographic coordinates, timezone. Searchable via venue search API. |
| **Viewer** | The authenticated admin user. Contains identity information, admin status flag, and campaign access permissions. |
| **Locale** | Language/country combination (e.g., en_US, fr_CA). Campaigns support multiple locales for international accessibility. |

## Business Rules

- **Authentication & Authorization**: Only users with `viewer.isAdmin = true` can access the Admin UI. Non-admin users are redirected to logout.
- **Campaign Lifecycle**: Campaigns progress through states based on date windows: upcoming → open → presale active → closed
- **Date Window Hierarchy**: Campaign window must encompass presale window. Presale window must occur before or during general onsale.
- **Timezone Handling**: All campaign dates interpret relative to the campaign's `referenceTimezone`. Individual markets can have different timezones.
- **Locale Requirements**: Campaigns must have at least one locale. One locale must be marked as `is_default`.
- **Promoter Privacy Compliance**: Each promoter must have privacy policy URLs. At least one URL must be marked as default locale. URLs must be accessible to fans based on their selected locale.
- **Market-Promoter Association**: Markets can have multiple promoters (many-to-many relationship via `promoterIds` array).
- **Event ID Format**: Markets store Ticketmaster event IDs as string arrays to support events spanning multiple inventory systems or split allocations.
- **Domain Slug Uniqueness**: Each campaign's `domain.site` value must be unique as it forms the URL path for the registration UI.
- **Campaign Status**: Status values include: active, closed, upcoming (system-derived based on current date vs. campaign windows)
- **Audit Trail**: All campaigns, markets, and promoters maintain `date.created` and `date.updated` timestamps.
- **Recent Campaigns Cache**: System maintains client-side cache of recently viewed campaigns for quick navigation in sidebar.

## Terminology

| Term | Definition |
|------|------------|
| **Verified Fan** | Ticketmaster's fan verification program that authenticates real fans for presale access, preventing bot purchases. |
| **Campaign** | A registration period during which fans can sign up for presale access to specific tour dates. |
| **Market** | A single concert event/show within a campaign. Represents one city/venue/date combination. |
| **Presale Window** | The time period when verified fans can purchase tickets before general public onsale. |
| **General Onsale** | The date/time when tickets become available to the general public (non-Verified Fan). |
| **Campaign Window** | The overall time period when the registration campaign is open for fan signups. |
| **Domain/Slug** | The unique URL identifier for a campaign (e.g., "taylorswift-2024" in reg-ui.com/taylorswift-2024). |
| **Reference Timezone** | The primary timezone used to interpret campaign date/time windows (e.g., "America/New_York"). |
| **Locale** | Language and country code combination (e.g., en_US = English/United States, fr_CA = French/Canada). |
| **Split Allocation** | Ticket inventory distributed across multiple access points or codes. Indicated by `splitAllocation.isActive` flag on markets. |
| **Shared Code** | A presale access code shared across multiple events in a campaign. |
| **Tour** | A series of concert dates typically marketed together. Campaigns often correspond to a tour. |
| **Integrator ID** | Ticketmaster's identifier for Verified Fan integration. Used for authentication handoff. |
| **Placement ID** | Specific placement identifier for Verified Fan within Ticketmaster's ecosystem. |
| **Schema Version** | Version identifier for campaign data structure (v1, v2, etc.). Affects content fields and validation. |
| **Content Localization** | Campaign content (text, images, FAQs) stored per locale for international support. |
| **Promoter** | Concert promoter/organizer entity (e.g., Live Nation, AEG). Each has territorial rights and compliance requirements. |
| **Event IDs** | Ticketmaster's unique identifiers for ticketable events. Markets can have multiple IDs for split allocations. |
| **Ticketer** | The ticketing system handling sales (Ticketmaster, AXS, etc.). |
| **LNAA** | Live Nation Artists & Attractions. Flag indicates Live Nation-promoted events requiring specific integrations. |
| **monoql** | The backend GraphQL API service providing campaign data and mutations. |
| **Reg UI** | The public-facing registration interface where fans sign up. Admin UI configures campaigns that Reg UI displays. |

## Data Models

### Campaign Data Structure

```typescript
Campaign {
  id: string
  type: "registration" | "fanlist"
  name: string
  status: string // derived from current date vs. windows

  // Date Windows
  date: {
    created: string (ISO 8601)
    updated: string (ISO 8601)
    open: string (ISO 8601)
    close: string (ISO 8601)
    presaleWindowStart: string (ISO 8601)
    presaleWindowEnd: string (ISO 8601)
    generalOnsale: string (ISO 8601)
  }

  referenceTimezone: string // e.g., "America/Los_Angeles"

  // Artist Info
  artist: {
    id: string
    name: string
    image_url: string
    discovery_id: string // TM artist catalog ID
    needs_id: string
    fanclubName: string
  }

  // URL Configuration
  domain: {
    site: string // unique slug
    preview: string
    share: string
  }

  // Tour Association
  tour: {
    name: string
  }

  // Internationalization
  locales: [
    {
      id: string // e.g., "en_US"
      is_default: boolean
    }
  ]

  // Styling
  style: {
    theme: {
      primary: string // hex color
      mix70: string
      mix40: string
      mix30: string
      mix20: string
    }
    pageBackground: {
      primary: string
    }
  }

  // Associated Events
  markets: Market[]

  // Schema Versioning
  schema: {
    version: string // "v1", "v2"
  }
}
```

### Market (Event) Data Structure

```typescript
Market {
  id: string
  name: string // event name
  city: string
  state: string
  population: number
  timezone: string // event-specific timezone

  point: {
    latitude: number
    longitude: number
  }

  event: {
    ids: string[] // TM event IDs
    name: string
    date: string (ISO 8601)
    presaleDateTime: string (ISO 8601)
    ticketer: string // "TM", "AXS", etc.
    link: string // event URL

    venue: {
      name: string
    }

    splitAllocation: {
      isActive: boolean
      link: string
      type: string
    }

    sharedCode: string // presale access code
  }

  isAddedShow: boolean // indicates manually added vs. original tour dates
  promoterIds: string[] // associated promoter IDs
}
```

### Promoter Data Structure

```typescript
Promoter {
  id: string
  name: string

  privacyUrls: [
    {
      locale: string // e.g., "en_US"
      url: string // privacy policy URL
      is_default: boolean
    }
  ]

  date: {
    created: string (ISO 8601)
    updated: string (ISO 8601)
  }
}
```

### Viewer (Admin User) Data Structure

```typescript
Viewer {
  isAdmin: boolean // MUST be true to access system
  isLoggedIn: boolean
  firstName: string
  lastName: string
  email: string
}
```

## Data Transformations

### Campaign List Query → Display Table
**Entry Point**: User loads Campaigns page

**Input**: GraphQL `admin_campaignsList` query returns array of campaign objects

**Transformations**:
1. Extract campaign data fields (name, tour, dates, status, domain)
2. Format dates using `date-fns` for display (convert ISO 8601 to readable format)
3. Derive date ranges from start/end pairs (presale window, campaign window)
4. Map status string to visual status badge component with color coding
5. Generate "Edit" link URLs using campaign ID
6. Apply search filter if user entered search query (fuzzy match on name/tour)
7. Apply pagination (skip/limit) to slice dataset
8. Sort by created date descending by default

**Output**: Table rows rendered in UI with formatted dates, status badges, clickable links

**Business Logic**:
- Status badge color: green=active, yellow=upcoming, gray=closed
- Date ranges show "N/A" if start or end missing
- Search matches against campaign name and tour name fields

---

### Campaign Detail Query → Campaign Configuration View
**Entry Point**: User clicks campaign from list or navigates to `/campaigns/:id`

**Input**: GraphQL `admin_campaign` query with campaign ID returns full campaign object with nested markets, artist, style

**Transformations**:
1. Extract campaign metadata (artist, domain, status, timezone, dates)
2. Parse `style.theme` object to extract color hex codes
3. Generate color swatches for visual theme preview
4. Extract and map locales array to country names using Intl.DisplayNames API
5. Build locale preview links by appending `?lang=` parameter to Reg UI URL
6. Format all timestamps using configured timezone
7. Calculate date ranges for display
8. Load markets array into separate events table component
9. Cache campaign in recent campaigns store for sidebar quick access

**Output**: Multi-section detail view with campaign info card, theme swatches, locale links, and nested events table

**Business Logic**:
- Theme colors display with visual swatches alongside hex values
- Locale links open Reg UI in new tab with correct language parameter
- Timezone affects how all dates/times render (converted to referenceTimezone)
- Recent campaigns store maintains last 5 viewed for sidebar navigation

---

### Event Creation Form → Market Upsert Mutation
**Entry Point**: User fills out "Create Event" form and clicks Save

**Input**: Form fields (venue, name, date, event IDs, presale date, promoters, timezone, etc.)

**Transformations**:
1. Validate all required fields are populated
2. Parse event IDs input (comma-separated string) into string array
3. Convert date/time inputs from form format to ISO 8601 strings
4. Lookup selected venue data from venue search to populate venue object
5. Convert geographic coordinates to point object { latitude, longitude }
6. Map selected promoter dropdown values to promoterIds array
7. Construct MarketInput object matching GraphQL schema
8. Execute `upsertMarket` mutation with constructed input
9. On success, refresh campaign events list query
10. Add new market to local cache

**Output**: New market record created in backend, appears in events table

**Business Logic**:
- Event IDs field accepts comma-separated values to support split allocations
- Presale date must be before event date (validated)
- Timezone defaults to venue's timezone but can be overridden
- Mutation uses same operation for create and update (upsert pattern)
- Empty event IDs array allowed for placeholder markets (to be filled later)

---

### Promoter Management → Localized Privacy URLs
**Entry Point**: User creates/updates promoter with privacy policy URLs for multiple regions

**Input**: Form with promoter name and array of locale/URL pairs

**Transformations**:
1. Validate promoter name is non-empty
2. For each locale entry:
   - Validate URL format (must be valid HTTP/HTTPS)
   - Validate locale format (e.g., en_US, fr_CA)
   - Check at least one entry marked as default
3. Construct privacyUrls array with locale objects
4. Execute `upsertPromoter` mutation
5. On success, refresh promoters list query
6. Update promoter dropdown options cache for event forms

**Output**: Promoter record with localized privacy URLs persisted, available for event associations

**Business Logic**:
- At least one privacy URL must be marked is_default=true
- Default URL serves as fallback if fan's locale not found
- When fan registers and selects locale, system displays correct privacy policy
- Promoter can be associated with markets in multiple campaigns
- Privacy URLs must remain accessible (no validation of URL reachability in UI)

---

### Authentication Flow → Admin Access Gate
**Entry Point**: User navigates to any Admin UI route

**Input**: Request includes browser cookies with Ticketmaster Identity session

**Transformations**:
1. Apollo client makes `admin_initApp` GraphQL query with credentials
2. Backend validates session cookie and returns viewer object with isAdmin flag
3. React AuthProvider component receives query response
4. Check `viewer.isLoggedIn` flag
5. Check `viewer.isAdmin` flag
6. If not logged in → redirect to Ticketmaster Identity login page with callback URL
7. If logged in but not admin → logout user and show error
8. If logged in and admin → render application content
9. Store viewer data in auth context for access throughout app

**Output**: Authenticated admin user gains access to application, or unauthorized users are redirected

**Business Logic**:
- Authentication uses httpOnly cookies for security (not accessible to JavaScript)
- Admin flag checked on every page load (not cached client-side)
- Non-admin users with valid TM accounts still cannot access (must have admin privilege)
- Logout redirects to Ticketmaster Identity logout endpoint
- Login callback returns to Admin UI home page (/campaigns)
