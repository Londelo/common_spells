# API Contracts - campaign-service

## Overview

This is a RESTful API service built with Koa.js that manages campaigns, markets, events, contacts, artists, venues, and promoters for the Verified Fan platform.

**Base URL**: Service runs on port 8080 (default)
**Authentication**: JWT Bearer tokens (except `/metrics` and `/heartbeat` endpoints)
**Response Format**: JSON

---

## REST Endpoints

### Campaigns

| Method | Path | Purpose | Auth | Version Support |
|--------|------|---------|------|----------------|
| GET | /campaigns | Get campaign by domain query param | JWT | v1, v2 |
| GET | /campaigns/status | Get campaign status by domain | JWT | v1, v2 |
| POST | /campaigns | Create new campaign | JWT (Supreme) | v1, v2 |
| POST | /campaigns/refresh | Refresh campaign data | JWT (Supreme) | v1, v2 |
| GET | /campaigns/categoryIds | Find category IDs from presale query | JWT | v1, v2 |
| GET | /campaigns/eventIds | Find event IDs from presale query | JWT | v1, v2 |
| GET | /campaigns/list | List campaigns by permissions | JWT | v1, v2 |
| GET | /campaigns/ids | Find campaign IDs by category IDs | JWT | v1, v2 |
| GET | /campaigns/events | Find campaigns by event ID | JWT | v1, v2 |
| GET | /campaigns/:campaignId | Get campaign by ID | JWT | v1, v2 |
| POST | /campaigns/:campaignId | Update campaign | JWT | v1, v2 |
| GET | /campaigns/:campaignId/status | Get campaign status | JWT | v1, v2 |
| GET | /campaigns/:campaignId/faqs | Get campaign FAQs | JWT | v1, v2 |
| POST | /campaigns/:campaignId/faqs | Update campaign FAQs | JWT | v1, v2 |
| GET | /campaigns/:campaignId/terms | Get campaign terms | JWT | v1, v2 |
| POST | /campaigns/:campaignId/terms | Update campaign terms | JWT | v1, v2 |
| GET | /campaigns/:campaignId/contacts | Get campaign contacts | JWT | v1, v2 |
| POST | /campaigns/:campaignId/contacts | Update campaign contacts | JWT | v1, v2 |

**Query Parameters (various endpoints)**:
- `domain` - Campaign domain name (required for domain-based lookups)
- `locale` - Locale code (e.g., 'en', 'en-US')
- `showAllLocales` - Boolean to show all locale content
- `password` - Password for password-protected campaigns
- `q` - Search query string
- `type` - Campaign type filter
- `version` - Campaign version filter (v1 or v2)
- `artistId` - Artist ID filter
- `eventId` - Event ID filter
- `categoryIds` - Comma-separated category IDs
- `presaleQueryStartDate` - ISO date string for presale window start
- `presaleQueryEndDate` - ISO date string for presale window end
- `sortBy` - Sort field
- `sortDirection` - Sort direction (asc/desc)
- `page` - Page number for pagination
- `pageSize` - Page size for pagination

### Markets

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /markets/upcoming | Get upcoming markets | JWT (Supreme) |
| POST | /markets/notifyDate | Set market notification date | JWT (Supreme) |
| GET | /markets/notifiable | Get markets ready to notify | JWT (Supreme) |
| POST | /markets/notified | Mark markets as notified | JWT (Supreme) |
| GET | /campaigns/:campaignId/markets | Get markets for campaign | JWT |
| POST | /campaigns/:campaignId/markets | Create market for campaign | JWT |
| POST | /campaigns/:campaignId/markets/clones | Clone markets to campaign | JWT |
| GET | /campaigns/:campaignId/markets/:marketId | Get market by ID | JWT |
| POST | /campaigns/:campaignId/markets/:marketId | Update market | JWT |
| DELETE | /campaigns/:campaignId/markets/:marketId | Delete market | JWT |

**Query Parameters**:
- `useGeoJson` - Boolean to return GeoJSON format

### Events

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /events | Find event IDs | JWT (Supreme) |
| POST | /events/:eventId | Update event status | JWT (Supreme) |

**Query Parameters**:
- `status` - Event status filter
- `until` - Date filter (ISO string)

### Contacts

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /contacts | Search contacts | JWT (Supreme) |

**Query Parameters**:
- `q` - Search query string
- `page` - Page number
- `pageSize` - Page size

### Artists

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /artists | Search artists | JWT |

**Query Parameters**:
- `q` - Search query string
- `page` - Page number
- `pageSize` - Page size

### Venues

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /venues | Search venues | JWT |

**Query Parameters**:
- `q` - Search query string
- `page` - Page number
- `pageSize` - Page size

### Promoters

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /promoters | Get all promoters | JWT (Supreme) |
| POST | /promoters | Create promoter | JWT (Supreme) |
| POST | /promoters/:promoterId | Update promoter | JWT (Supreme) |
| DELETE | /promoters/:promoterId | Delete promoter | JWT (Supreme) |

### System Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /heartbeat | Health check | None |
| GET | /metrics | Prometheus metrics | None |

---

## Type Definitions

### Campaign (V2 Schema)

```json
{
  "id": "string (24 chars)",
  "type": "string",
  "status": "DRAFT | PREVIEW | OPEN | CLOSED | INACTIVE",
  "artist": {
    "id": "string (required)",
    "name": "string",
    "discovery_id": "string",
    "image_url": "string",
    "adpUrl": "string",
    "fanclubName": "string"
  },
  "domain": {
    "site": "string (required, min 1 char)"
  },
  "tour": {
    "name": "string (required, min 1 char)"
  },
  "name": "string (required, min 1 char)",
  "identifier": "string (required, min 1 char)",
  "options": {
    "useGenericBranding": "boolean",
    "showAccessCode": "boolean"
  },
  "referenceTimezone": "string | null",
  "date": {
    "created": "string (required, ISO date)",
    "updated": "string (ISO date)",
    "open": "string | null (ISO date)",
    "close": "string | null (ISO date)",
    "presaleWindowStart": "string | null (ISO date)",
    "presaleWindowEnd": "string | null (ISO date)",
    "sendReminderEmails": "array<string> | null (ISO dates)"
  },
  "style": {
    "theme": {
      "primary": "string (required, color)",
      "mix70": "string (color)",
      "mix40": "string (color)",
      "mix20": "string (color)"
    },
    "border": {
      "primary": "string (required, color)"
    },
    "pageBackground": {
      "primary": "string (required, color)"
    },
    "text": {
      "primary": "string (required, color)",
      "secondary": "string (color)"
    }
  },
  "image": {
    "main": {
      "url": "string (required)"
    },
    "mobile": {
      "url": "string"
    },
    "secondary": {
      "url": "string"
    }
  },
  "share": {
    "x": { "url": "string" },
    "instagram": { "url": "string" },
    "facebook": { "url": "string" },
    "youtube": { "url": "string" },
    "tiktok": { "url": "string" },
    "artist": { "url": "string" }
  },
  "content": {
    "[locale]": {
      "faqs": {
        "[uuid]": {
          "question": "string (required)",
          "answer": "string (required)"
        }
      },
      "landing": "object",
      "confirmation": "object",
      "email": {
        "subject": {
          "receipt": "string (min 1 char)"
        },
        "template": {
          "receipt": "string (min 1 char)"
        },
        "from": {
          "name": "string (min 1 char)",
          "account": "string (min 1 char)"
        }
      }
    }
  },
  "faqs": {
    "landing": {
      "open": "array<string> (FAQ UUIDs)",
      "closed": "array<string> (FAQ UUIDs)"
    },
    "confirmation": {
      "open": "array<string> (FAQ UUIDs)",
      "closed": "array<string> (FAQ UUIDs)",
      "activePresale": "array<string> (FAQ UUIDs)"
    }
  },
  "preferences": [
    {
      "id": "string (required, min 1 char)",
      "type": "string (required, min 1 char)",
      "is_optional": "boolean (required)",
      "additional": {
        "initial_value": "boolean"
      },
      "label": {
        "[locale]": "string (min 1 char)"
      }
    }
  ],
  "locales": [
    {
      "id": "string (required, min 1 char, format: xx or xx-XX)",
      "is_default": "boolean"
    }
  ],
  "contacts": [
    {
      "_id": "string",
      "name": "string",
      "keyword": ["string"]
    }
  ],
  "slack": {
    "channels": {
      "stats": ["string (channel names)"]
    },
    "noAlert": "boolean"
  },
  "trackers": [
    {
      "type": "string (required, min 1 char)",
      "id": "string (min 1 char)"
    }
  ],
  "schema": {
    "version": "string (required)"
  }
}
```

### Market

```json
{
  "id": "string (24 chars)",
  "name": "string (required, min 1 char)",
  "campaign_id": "string (required, 24 chars)",
  "city": "string (required, min 1 char)",
  "state": "string (required, min 1 char)",
  "point": {
    "type": "string (required, e.g., 'Point')",
    "coordinates": [
      "number (longitude)",
      "number (latitude)"
    ]
  },
  "population": "number",
  "timezone": "string (required, min 1 char)",
  "event": {
    "ids": ["string (min 1 item)"],
    "name": "string",
    "date": "string (ISO date)",
    "presaleDateTime": "string (ISO date)",
    "ticketer": "string (min 1 char)",
    "category_ids": ["string (unique items)"],
    "venue": {
      "id": "string (min 1 char)",
      "name": "string (required, min 1 char)"
    },
    "sharedCode": "string"
  },
  "promoterIds": ["string"]
}
```

### Promoter

```json
{
  "id": "string (24 chars)",
  "name": "string (required, min 1 char)",
  "privacyUrls": [
    {
      "locale": "string (required)",
      "url": "string (required, URI format)",
      "is_default": "boolean | null"
    }
  ],
  "date": {
    "created": "string (required, min 1 char)",
    "updated": "string"
  }
}
```

**Note**: One privacy URL must have `is_default: true`

---

## Campaign Status Lifecycle

Campaigns transition through the following statuses:

1. **DRAFT** - Initial creation state
2. **PREVIEW** - Ready for preview (manual transition)
3. **OPEN** - Active (auto-opens when `date.open` is reached)
4. **CLOSED** - Ended (auto-closes when `date.close` is reached)
5. **INACTIVE** - Archived (auto-inactivates 30 days after closing)

**Status Transitions**:
- When status becomes `INACTIVE`, the `domain.site` field is unset to free the domain for reuse
- `domain.site` has a unique sparse index allowing multiple inactive campaigns to have null domains

---

## Permission Model

### JWT Claims

The JWT token contains:
- `userId` - Authenticated user ID
- `supreme` - Boolean indicating supreme/admin privileges
- `campaignActions` - Map of campaign IDs to allowed actions

### Required Permissions

- **Supreme Required**: Endpoints marked "JWT (Supreme)" require `supreme: true` in JWT
- **Campaign Actions**: Campaign-specific endpoints check for required actions:
  - `read` - View campaign data
  - `write` - Modify campaign data
  - `admin` - Full administrative access

### Permission Checking

The manager layer validates permissions using:
- `throwIfInvalidPermissions({ campaign, authUserActions })`
- `throwIfInvalidPassword({ campaign, password })`

---

## Schema Validation

All request bodies are validated against JSON schemas in `/schemas`:

- `campaignV1.json` - Version 1 campaign schema
- `campaignV2.json` - Version 2 campaign schema
- `campaignDraft.json` - Draft campaign schema
- `fanlistCampaign.json` - Fanlist campaign schema
- `market.json` - Market schema
- `promoter.json` - Promoter schema
- `faqs.json` - FAQ schema
- `terms.json` - Terms schema
- `artistQuery.json` - Artist query schema

Schema validation is performed in the manager layer using:
```javascript
ValidateSchema(schemaName)(data)
```
