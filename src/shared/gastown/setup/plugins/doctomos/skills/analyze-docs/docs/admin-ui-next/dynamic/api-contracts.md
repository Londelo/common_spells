# API Contracts - admin-ui-next

## Overview

This Next.js frontend application consumes both GraphQL and REST APIs. The primary API is a GraphQL backend accessed via Apollo Client, with two minimal REST endpoints for health and metrics.

---

## GraphQL API

### Configuration

**Endpoint**: Configured via `GRAPHQL_URL` environment variable
- Default: `https://monoql-dev.vf.nonprod9.us-east-1.tktm.io/graphql`
- Credentials: Included (cookie-based authentication)
- Client: Apollo Client with InMemoryCache

### Queries

#### admin_initApp
**Purpose**: Initialize application with identity and viewer data

**Arguments**: None

**Returns**:
```typescript
{
  identity: {
    url: string;
    version: string;
    integratorId: string;
    placementId: string;
  };
  viewer: {
    isAdmin: boolean;
    isLoggedIn: boolean;
    firstName: string;
    lastName: string;
    email: string;
  };
}
```

**Description**: Fetches application identity information and current viewer (user) details. Used on app initialization.

---

#### admin_campaignsList
**Purpose**: List campaigns with filtering and pagination

**Arguments**:
- `limit: Int` - Maximum number of results
- `skip: Int` - Number of results to skip (pagination)
- `sort: String` - Sort order
- `query: String` - Search query
- `type: CampaignType` - Filter by campaign type
- `version: String` - Filter by schema version

**Returns**:
```typescript
{
  viewer: {
    campaigns: {
      list: Array<{
        id: string;
        name: string;
        status: string;
        date: {
          created: string;
          updated: string;
          presaleWindowStart?: string;
          presaleWindowEnd?: string;
          open?: string;
          close?: string;
        };
        schema: {
          version: string;
        };
        domain: {
          site: string;
        };
        tour: {
          name: string;
        };
      }>
    };
  };
}
```

**Description**: Retrieves a paginated list of campaigns with optional filtering by type, version, and search query.

---

#### admin_campaign
**Purpose**: Get detailed campaign information

**Arguments**:
- `domain: String` - Campaign domain
- `id: String` - Campaign ID
- `locale: String` - Locale for content
- `showAllLocales: Boolean` - Include all locale variants

**Returns**:
```typescript
{
  viewer: {
    campaign: {
      id: string;
      type: string;
      name: string;
      date: {
        created: string;
        open: string;
        close: string;
        finish: string;
        presaleWindowStart: string;
        presaleWindowEnd: string;
        generalOnsale: string;
      };
      referenceTimezone: string;
      artist: {
        id: string;
        name: string;
        image_url: string;
        discovery_id: string;
        needs_id: boolean;
        fanclubName: string;
      };
      categoryId: string;
      locales: Array<{ id: string; is_default: boolean }>;
      domain: {
        site: string;
      };
      tour: {
        name: string;
      };
      status: string;
      schema: {
        version: string;
      };
      markets: Array<MarketObject>;
      style: {
        theme: {
          primary: string;
          mix70: string;
          mix40: string;
          mix30: string;
          mix20: string;
        };
        pageBackground: {
          primary: string;
        };
      };
    };
  };
}
```

**Description**: Fetches complete campaign details including artist, dates, markets, and styling. Supports both RegistrationCampaign and FanlistCampaign types.

---

#### promoters
**Purpose**: Get all promoters

**Arguments**: None

**Returns**:
```typescript
Array<{
  id: string;
  name: string;
  privacyUrls: Array<{
    locale: string;
    url: string;
    is_default?: boolean;
  }>;
  date: {
    created: string;
    updated: string;
  };
}>
```

**Description**: Retrieves list of all promoters with their privacy policy URLs.

---

#### admin_searchVenues
**Purpose**: Search for venues

**Arguments**:
- `queryStr: String!` - Search query string (required)
- `skip: Int` - Pagination offset
- `limit: Int` - Maximum results

**Returns**:
```typescript
Array<{
  id: string;
  discovery_id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  point: {
    latitude: number;
    longitude: number;
  };
}>
```

**Description**: Searches for venues by name, city, or other attributes. Returns venue details with geolocation.

---

### Mutations

#### admin_upsertMarket
**Purpose**: Create or update a market

**Arguments**:
- `market: MarketInput!` - Market data to upsert

**Returns**: `MarketObject`

**Description**: Creates a new market or updates an existing one. Returns the complete market object.

---

#### admin_deleteMarket
**Purpose**: Delete a market

**Arguments**:
- `campaignId: String!` - Campaign ID
- `marketId: String!` - Market ID to delete
- `transferMarketId: String` - Optional ID to transfer data to

**Returns**: `Boolean`

**Description**: Deletes a market from a campaign with optional data transfer to another market.

---

#### upsertPromoter
**Purpose**: Create or update a promoter

**Arguments**:
```typescript
{
  promoter: {
    id?: string;
    name: string;
    privacyUrls: Array<{
      locale: string;
      url: string;
      is_default?: boolean;
    }>;
  }
}
```

**Returns**: `PromoterObject`

**Description**: Creates a new promoter or updates an existing one. Privacy URLs must be provided for at least one locale.

---

#### deletePromoter
**Purpose**: Delete a promoter

**Arguments**:
- `promoterId: String!` - Promoter ID to delete

**Returns**: `Boolean`

**Description**: Permanently deletes a promoter.

---

### GraphQL Fragments

#### adminUser
```graphql
fragment adminUser on Viewer {
  isAdmin
  isLoggedIn
  firstName
  lastName
  email
}
```

#### campaignObject
```graphql
fragment campaignObject on Campaign {
  id
  type
  name
  date {
    created
    open
    close
    finish
    presaleWindowStart
    presaleWindowEnd
    generalOnsale
  }
  referenceTimezone
  artist {
    id
    name
    image_url
    discovery_id
    needs_id
    fanclubName
  }
  categoryId
}
```

#### marketObject
```graphql
fragment marketObject on Market {
  id
  name
  city
  state
  population
  timezone
  point {
    latitude
    longitude
  }
  event {
    ids
    name
    date
    presaleDateTime
    ticketer
    link
    venue {
      name
    }
    splitAllocation {
      isActive
      link
      type
    }
    sharedCode
  }
  isAddedShow
  promoterIds
}
```

#### PromoterFields
```graphql
fragment PromoterFields on Promoter {
  id
  name
  privacyUrls {
    locale
    url
    is_default
  }
  date {
    created
    updated
  }
}
```

---

## GraphQL Type Definitions

### Market
```typescript
type Market = {
  id: string;
  name: string;
  city: string;
  state: string;
  population: number;
  timezone: string;
  point?: {
    latitude: number;
    longitude: number;
  };
  event: {
    ids: string[];
    name: string;
    date: string;
    presaleDateTime: string;
    ticketer: string;
    link: string;
    venue: {
      name: string;
    };
    splitAllocation?: {
      isActive: boolean;
      link: string;
      type: string;
    };
    sharedCode: string;
  };
  isAddedShow: boolean;
  promoterIds: string[];
};
```

### Promoter
```typescript
type Promoter = {
  id: string;
  name: string;
  privacyUrls: LocalizedUrl[];
  date: {
    created: string;
    updated: string;
  };
};

type LocalizedUrl = {
  locale: string;
  is_default?: boolean;
  url: string;
};
```

### Campaign
```typescript
type Campaign = {
  id: string;
  type: string;
  name: string;
  artist: Artist;
  locales: { id: string; is_default: boolean }[];
  date: {
    created: string;
    updated: string;
    presaleWindowStart?: string;
    presaleWindowEnd?: string;
    open?: string;
    close?: string;
    generalOnsale?: string;
  };
  referenceTimezone?: string;
  domain?: {
    site: string;
  };
  tour?: {
    name: string;
  };
  status?: string;
  schema?: {
    version: string;
  };
  markets?: Market[];
  style: {
    theme: {
      primary: string;
      mix70: string;
      mix40: string;
      mix30: string;
      mix20: string;
    };
    pageBackground: {
      primary: string;
    };
  };
};
```

### Artist
```typescript
type Artist = {
  id: string;
  discovery_id: string;
  name: string;
  image_url: string;
  adpUrl?: string;
  fanclubName?: string;
};
```

### Venue
```typescript
type Venue = {
  id: string;
  discovery_id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  point: {
    latitude: number;
    longitude: number;
  };
};
```

---

## REST Endpoints

### GET /heartbeat
**Purpose**: Health check endpoint

**Authentication**: None required

**Request**: None

**Response**:
```json
{
  "status": "OK"
}
```

**Status Codes**:
- 200: Service is healthy

**Description**: Simple health check endpoint for load balancers and monitoring systems.

---

### GET /metrics
**Purpose**: Prometheus metrics endpoint

**Authentication**: None required

**Request**: None

**Response**: Prometheus text format metrics
```
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 0.123456

# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 12345678
...
```

**Content-Type**: `text/plain; version=0.0.4; charset=utf-8`

**Status Codes**:
- 200: Metrics retrieved successfully

**Description**: Exposes default Node.js metrics in Prometheus format for monitoring and observability. Uses `prom-client` library to collect process, V8, and system metrics.

---

## API Configuration

### Environment Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `GRAPHQL_URL` | string | GraphQL API endpoint | `https://monoql-dev.vf.nonprod9.us-east-1.tktm.io/graphql` |
| `ACCOUNT_URL` | string | Identity/account service URL | `https://identity.tktm.io` |
| `ADMIN_URL` | string | Admin UI base URL | `https://admin-dev.vf.nonprod9.us-east-1.tktm.io` |
| `REG_UI_URL` | string | Registration UI URL | `https://reg-ui-dev.vf.nonprod9.us-east-1.tktm.io` |
| `INTEGRATOR_ID` | string | Identity service integrator ID | `prd1541.verifiedFan` |
| `PLACEMENT_ID` | string | Identity service placement ID | `verifiedFan` |

### Authentication

**GraphQL API**: Cookie-based session authentication
- Credentials included in all requests (`credentials: 'include'`)
- Managed by `ACCOUNT_URL` identity service
- No explicit tokens in requests

**REST Endpoints**: No authentication required (health/metrics endpoints)
