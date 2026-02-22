# API Contracts - entry-service

## Overview

The entry-service provides both REST and GraphQL APIs for managing campaign entries, scoring, and statistics in the Verified Fan system. The service uses JWT authentication and is built with Koa.js framework.

---

## GraphQL API

### Queries

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| accountFanscore | memberId: ID, globalUserId: ID | AccountFanscore | Retrieve account fanscore for a user |

### Types

```graphql
type AccountFanscore {
  rawScore: Int
}
```

**Query Example:**
```graphql
query entries_fanscore($globalUserId: ID, $memberId: ID) {
  api {
    accountFanscore(memberId: $memberId, globalUserId: $globalUserId) {
      rawScore
    }
  }
}
```

---

## REST API

### Base Routes

All endpoints are prefixed with the base URL of the service (typically running on port 8080).

### Authentication

- **Type**: JWT (JSON Web Token)
- **Header**: `Authorization: Bearer <token>`
- **Protected Routes**: All routes except `/metrics`, `/heartbeat`, and `/dev/token`
- **User Roles**: Regular users and Supreme users (admin-level access)

### API Versioning

The service supports multiple API versions:
- **V1 API**: Base routes (e.g., `/:campaignId/entries`)
- **V2 API**: Enhanced routes under `/v2` prefix
- **Users API**: User-specific routes under `/users` prefix

---

## Entries API

### Campaign Entries

| Method | Path | Purpose | Auth | Supreme Only |
|--------|------|---------|------|--------------|
| GET | `/:campaignId/entries` | Get entry for logged-in fan | JWT | No |
| POST | `/:campaignId/entries` | Save/update entry for logged-in fan | JWT | No |
| GET | `/:campaignId/entries/counts` | Get entry counts by market | JWT | Supreme Check |
| POST | `/:campaignId/entries/confirm` | Confirm entry (PPC) for logged-in fan | JWT | No |
| POST | `/:campaignId/entries/transfer` | Move entries from one market to another | JWT | Yes |
| GET | `/:campaignId/entries/registrationEligibility` | Check if fan is eligible to register | JWT | No |
| GET | `/:campaignId/refreshattribute` | Update specified attribute on entry | JWT | No |
| GET | `/:campaignId/entries/:filterType` | Retrieve filtered list of entries | JWT | Supreme Check |

### Eligibility & Scoring

| Method | Path | Purpose | Auth | Supreme Only |
|--------|------|---------|------|--------------|
| GET | `/:campaignId/entries/eligibility` | Get eligibility counts from scoring records | JWT | Supreme Check |
| GET | `/:campaignId/entries/eligibility/breakdown` | Get eligibility counts by market preference | JWT | Supreme Check |
| GET | `/:campaignId/entries/eligibility/verifiedCount` | Get total verified count by market | JWT | Supreme Check |
| GET | `/:campaignId/entries/eligibility/totalSelected` | Get total selected count by market | JWT | Supreme Check |
| GET | `/:campaignId/entries/scoring` | Get list of eligible fans from scoring | JWT | Supreme Check |
| POST | `/:campaignId/entries/scoring` | Save batch of scoring records | JWT | Yes |
| POST | `/:campaignId/scoring/tags` | Save tags to scoring documents | JWT | Yes |
| POST | `/:campaignId/scoring/flipVerdicts` | Flip scoring verdicts based on tags | JWT | Yes |

### Verdicts & Codes

| Method | Path | Purpose | Auth | Supreme Only |
|--------|------|---------|------|--------------|
| POST | `/:campaignId/entries/verdicts` | Save batch of verdicts (verified status) | JWT | Yes |
| POST | `/:campaignId/entries/codes` | Save batch of assigned codes | JWT | Yes |

---

## Statistics API

| Method | Path | Purpose | Auth | Supreme Only |
|--------|------|---------|------|--------------|
| GET | `/:campaignId/stats/:type` | Query campaign statistics | JWT | Supreme Check |
| POST | `/:campaignId/stats/:type` | Create/update statistics | JWT | Yes |

**Supported Stats Types:**
- Custom types defined per campaign
- Requires `type` parameter in path
- Optional query params: `marketId`, `dateId`

---

## V2 API (`/v2`)

| Method | Path | Purpose | Auth | Supreme Only |
|--------|------|---------|------|--------------|
| POST | `/v2/entries` | Batch save/delete entries | JWT | Yes |
| POST | `/v2/refreshScores` | Refresh phone score and account fanscore | JWT | Yes |

**Request Body for `/v2/entries`:**
```json
{
  "entries": [
    {
      "campaignId": "string",
      "userId": "string",
      "fields": {}
    }
  ],
  "deletions": [
    {
      "campaignId": "string",
      "userId": "string"
    }
  ]
}
```

**Request Body for `/v2/refreshScores`:**
```json
{
  "entries": [
    {
      "campaignId": "string",
      "userId": "string"
    }
  ]
}
```

---

## Users API (`/users`)

| Method | Path | Purpose | Auth | Supreme Only |
|--------|------|---------|------|--------------|
| GET | `/users/:userId/entries` | Get all entries for a specific user | JWT | Self or Supreme |
| POST | `/users/:userId/optout` | Opt out user from campaigns | JWT | Yes |
| DELETE | `/users/:userId` | Delete all entries for a user | JWT | Yes |

---

## Request/Response Models

### Entry Object

```typescript
interface Entry {
  _id: {
    campaign_id: string;
    user_id: string;
  };
  fields: {
    [preferenceId: string]: any;
    // Common fields:
    email?: string;
    phone?: string;
    market?: string;           // Primary market preference
    optional_markets?: string[]; // Additional market preferences
    twitter_handle?: string;
  };
  score?: number;
  presale?: {
    codes?: {
      code: string | null;
    };
  };
  review?: {
    isBlocked?: boolean;
  };
  date: {
    created: Date;
    updated: Date;
    phoneConfirmed?: Date;
  };
  originHost?: string;
  originalUrl?: string;
}
```

### Scoring Record

```typescript
interface ScoringRecord {
  userId: string;
  marketId: string;
  score: number;
  verified: boolean;
  selected: boolean;
  tags?: {
    [tagName: string]: any;
  };
}
```

### Campaign Stats Object

```typescript
interface CampaignStats {
  _id: {
    campaignId: string;
    marketId?: string;
    dateId?: string;
    type: string;
  };
  count: {
    [key: string]: number;
  };
  status: 'PENDING' | 'PROCESSING' | 'FINISHED' | 'FAILED';
  date: {
    created: Date;
    updated: Date;
  };
  meta?: any;
  errors?: any[];
}
```

---

## Query Parameters

### Pagination Parameters

Common pagination parameters used across list endpoints:

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | number | Maximum number of results | 50 |
| `offset` | number | Number of results to skip | 0 |
| `page` | number | Page number (alternative to offset) | 1 |

### Filter Parameters (Eligibility Endpoints)

| Parameter | Type | Description |
|-----------|------|-------------|
| `marketIds` | string | Comma-separated market IDs |
| `minScore` | number | Minimum fanscore threshold |
| `maxScore` | number | Maximum fanscore threshold |
| `reassign` | boolean | Include previously selected fans |
| `randomSelection` | boolean | Randomize selection order |
| `singleMarketSelection` | boolean | Limit to single market |
| `excludeIntlPhone` | boolean | Exclude international phone numbers |
| `selectedOnly` | boolean | Return only selected fans |
| `orderByPreference` | boolean | Order by market preference |

### Filter Types (Entry List)

Supported filter types for `/:campaignId/entries/:filterType`:

| Filter Type | Description |
|-------------|-------------|
| `winners` | Entries with assigned codes, not blocked |
| `codeless` | Entries without codes, not blocked |
| `blocked` | Blocked entries |
| `verified` | All verified entries (not blocked) |

---

## Error Codes

### Entry Errors

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ENTRY_NOT_FOUND` | 404 | Entry not found for specified user |
| `ENTRY_FLAGGED` | 404 | Entry was flagged and excluded |
| `NO_PAST_PARTICIPATION` | 400 | User lacks required past participation |

### Validation Errors

All validation errors return HTTP 400 with descriptive error messages including:

- Missing required fields
- Invalid field values
- Invalid market selections
- Invalid preference types
- Invalid ticket counts
- Field constraints violations

---

## Preference Field Types

The service supports various preference field types for campaign entries:

| Type | Validation | Description |
|------|------------|-------------|
| `email` | Email format | User email address |
| `phone` | Phone format | User phone number (E.164 format) |
| `text` | String | Free-form text field |
| `checkbox` | Boolean | Boolean checkbox value |
| `radio` | String | Single selection from options |
| `checklist` | Array | Multiple selections from options |
| `destination_city` | String | Market/venue selection |
| `additional_markets` | Array | Additional market preferences |
| `ticket_count` | Number | Desired number of tickets |

---

## Special Features

### Mexican Phone Number Support

The service includes special handling for Mexican phone numbers:
- Accepts both `+52XXXXXXXXXX` and `+521XXXXXXXXXX` formats
- Normalizes queries to handle both variants

### Market Preference System

Entries support a hierarchical market preference system:
- **Primary Market**: User's first choice venue/city (`market` field)
- **Additional Markets**: Up to 3 additional preferences (`optional_markets` field)
- Validation ensures no overlap between primary and additional markets

### Referral System

Entries can include referrer codes:
- Users cannot refer themselves
- Referrer codes are validated against existing entries
- Codes cannot be changed once set

---

## Data Models Summary

### Collections

| Collection | Purpose |
|------------|---------|
| `entries` | Campaign entry records |
| `scoring` | Fan scoring and eligibility records |
| `campaign_stats` | Aggregated campaign statistics |
