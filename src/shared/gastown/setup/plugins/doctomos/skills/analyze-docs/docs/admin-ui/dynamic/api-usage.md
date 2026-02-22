# API Usage - admin-ui

## Overview

This document provides practical examples and usage patterns for the Titan Admin UI GraphQL API. The API manages Ticketmaster's Verified Fan campaigns, markets, and fan data.

---

## Authentication

### Authentication Flow

The API uses token-based authentication with cookie session management.

#### 1. Authenticate with Token

```graphql
mutation Authenticate($token: String!) {
  authenticate(credentials: { token: $token }) {
    id
    isLoggedIn
    isAdmin
    firstName
    lastName
    email
    auth {
      token
      isSupreme
      expiresAt
      permissions {
        campaignId
        actions
      }
    }
  }
}
```

**Variables:**
```json
{
  "token": "your-auth-token-here"
}
```

**Response:**
```json
{
  "data": {
    "authenticate": {
      "id": "user123",
      "isLoggedIn": true,
      "isAdmin": true,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@ticketmaster.com",
      "auth": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "isSupreme": true,
        "expiresAt": 1735689600,
        "permissions": [
          {
            "campaignId": "camp123",
            "actions": ["read", "write", "admin"]
          }
        ]
      }
    }
  }
}
```

#### 2. Check Current User Status

```graphql
query GetViewer {
  viewer {
    id
    isLoggedIn
    isAdmin
    firstName
    lastName
    email
  }
}
```

#### 3. Logout

```graphql
mutation Logout {
  logout
}
```

### Client Configuration

The Apollo client is configured with cookie-based credentials:

```javascript
import ApolloClient from 'apollo-client';
import { createUploadLink } from 'apollo-upload-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

const client = new ApolloClient({
  link: createUploadLink({
    uri: 'http://localhost:9090/graphql',
    credentials: 'include',  // Important: enables cookie-based auth
    headers: {
      'tm-id-version': '2'  // Optional: TM Identity version
    }
  }),
  cache: new InMemoryCache()
});
```

---

## Campaign Operations

### List Campaigns

```graphql
query ListCampaigns($limit: Int, $skip: Int, $type: CampaignType) {
  viewer {
    campaigns {
      list(limit: $limit, skip: $skip, type: $type) {
        id
        name
        type
        artist {
          name
          image_url
        }
        date {
          open
          close
        }
      }
    }
  }
}
```

**Variables:**
```json
{
  "limit": 50,
  "skip": 0,
  "type": "registration"
}
```

### Get Single Campaign

```graphql
query GetCampaign($id: String!) {
  viewer {
    campaign(id: $id, showAllLocales: true) {
      id
      name
      type
      status
      artist {
        id
        name
        image_url
        fanclubName
      }
      date {
        created
        open
        close
        finish
      }
      domain {
        site
        share
        preview
      }
      markets {
        id
        name
        city
        state
        event {
          name
          date
          venue {
            name
          }
        }
      }
      options {
        allowIntlPhones
        requirePassword
        gate {
          card
          linkedAccount
        }
      }
      locales {
        id
        is_default
      }
    }
  }
}
```

### Create/Update Campaign

```graphql
mutation UpsertCampaign($campaign: CampaignInput!) {
  upsertCampaign(campaign: $campaign) {
    id
    name
    type
    artist {
      name
    }
    date {
      open
      close
    }
  }
}
```

**Variables (Create New Campaign):**
```json
{
  "campaign": {
    "type": "registration",
    "name": "Taylor Swift 2025 Tour Registration",
    "artist": {
      "id": "artist123",
      "name": "Taylor Swift",
      "image_url": "https://example.com/taylor.jpg"
    },
    "categoryId": "cat456",
    "referenceTimezone": "America/New_York",
    "date": {
      "open": "2025-01-15T10:00:00Z",
      "close": "2025-01-20T23:59:59Z"
    },
    "domain": {
      "site": "taylor-vf.verifiedfan.ticketmaster.com"
    },
    "options": {
      "allowIntlPhones": true,
      "promptConfirmPhone": true,
      "requirePassword": false
    }
  }
}
```

**Variables (Update Existing Campaign):**
```json
{
  "campaign": {
    "id": "camp789",
    "name": "Updated Campaign Name",
    "date": {
      "close": "2025-01-25T23:59:59Z"
    }
  }
}
```

---

## Market Operations

### Get Markets for Campaign

Markets are nested within campaign queries (see Get Single Campaign example above).

### Create/Update Market

```graphql
mutation UpsertMarket($market: MarketInput!) {
  upsertMarket(market: $market) {
    id
    name
    city
    state
    timezone
    event {
      name
      date
      venue {
        name
      }
    }
  }
}
```

**Variables:**
```json
{
  "market": {
    "campaignId": "camp789",
    "name": "New York City",
    "city": "New York",
    "state": "NY",
    "timezone": "America/New_York",
    "population": 8000000,
    "point": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "event": {
      "name": "Madison Square Garden Show",
      "date": "2025-03-15T20:00:00Z",
      "venue": {
        "name": "Madison Square Garden"
      },
      "ticketer": "TM",
      "link": "https://ticketmaster.com/event/123"
    }
  }
}
```

### Delete Market

```graphql
mutation DeleteMarket(
  $campaignId: String!
  $marketId: String!
  $transferMarketId: String
) {
  deleteMarket(
    campaignId: $campaignId
    marketId: $marketId
    transferMarketId: $transferMarketId
  )
}
```

**Variables:**
```json
{
  "campaignId": "camp789",
  "marketId": "market123",
  "transferMarketId": "market456"
}
```

### Clone Markets

```graphql
mutation CloneMarkets($fromCampaignId: String!, $toCampaignId: String!) {
  cloneMarkets(
    fromCampaignId: $fromCampaignId
    toCampaignId: $toCampaignId
  ) {
    id
    name
    city
    state
  }
}
```

---

## Search Operations

### Search Artists

```graphql
query SearchArtists($query: String!, $limit: Int) {
  searchArtists(query: $query, limit: $limit) {
    id
    discovery_id
    name
    image_url
  }
}
```

**Variables:**
```json
{
  "query": "Taylor",
  "limit": 10
}
```

### Search Venues

```graphql
query SearchVenues($query: String!, $limit: Int) {
  searchVenues(query: $query, limit: $limit) {
    id
    discovery_id
    name
    city
    state
    timezone
    point {
      latitude
      longitude
    }
  }
}
```

**Variables:**
```json
{
  "query": "Madison Square",
  "limit": 10
}
```

---

## File Upload Operations

### Upload Image

```graphql
mutation UploadImage(
  $base64: String!
  $contentType: String!
  $cacheControl: String
) {
  uploadImage(
    base64: $base64
    contentType: $contentType
    cacheControl: $cacheControl
  ) {
    url
    width
    height
  }
}
```

**Variables:**
```json
{
  "base64": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "contentType": "image/png",
  "cacheControl": "public, max-age=31536000"
}
```

### Upload Access Codes

```graphql
mutation UploadCodes(
  $file: Upload!
  $fileSize: Int!
  $campaignId: String!
  $type: String!
) {
  uploadCodes(
    file: $file
    fileSize: $fileSize
    campaignId: $campaignId
    type: $type
  ) {
    in
    inserted
    updated
  }
}
```

**Usage (multipart/form-data):**
```javascript
const formData = new FormData();
formData.append('operations', JSON.stringify({
  query: `mutation UploadCodes($file: Upload!, $fileSize: Int!, $campaignId: String!, $type: String!) {
    uploadCodes(file: $file, fileSize: $fileSize, campaignId: $campaignId, type: $type) {
      in
      inserted
      updated
    }
  }`,
  variables: {
    file: null,
    fileSize: file.size,
    campaignId: 'camp789',
    type: 'presale'
  }
}));
formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
formData.append('0', file);

fetch('http://localhost:9090/graphql', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});
```

### Upload Fanlist

```graphql
mutation UploadFanlist(
  $file: Upload!
  $fileSize: Int!
  $campaignId: String!
) {
  uploadFanlist(file: $file, fileSize: $fileSize, campaignId: $campaignId) {
    url
    name
  }
}
```

### Upload Scored Data

```graphql
mutation UploadScored(
  $file: Upload!
  $fileSize: Int!
  $campaignId: String!
  $campaignName: String!
) {
  uploadScored(
    file: $file
    fileSize: $fileSize
    campaignId: $campaignId
    campaignName: $campaignName
  ) {
    url
    name
  }
}
```

---

## Export Operations

### Schedule Export

```graphql
mutation ScheduleExport(
  $campaignId: String!
  $type: String!
  $dateKey: String
) {
  scheduleExport(campaignId: $campaignId, type: $type, dateKey: $dateKey) {
    id
    exportType
    status
    date {
      created
      scheduled
    }
  }
}
```

**Variables:**
```json
{
  "campaignId": "camp789",
  "type": "entries",
  "dateKey": "2025-01-15"
}
```

### List Exports

```graphql
query CampaignExportList(
  $campaignId: String!
  $limit: Int
  $skip: Int
  $exportType: String
) {
  campaignExportList(
    campaignId: $campaignId
    limit: $limit
    skip: $skip
    exportType: $exportType
  ) {
    id
    campaignId
    exportType
    status
    count
    date {
      created
      started
      finished
    }
    path
  }
}
```

### Get Single Export

```graphql
query CampaignExport($campaignId: String!, $exportId: String!) {
  campaignExport(campaignId: $campaignId, exportId: $exportId) {
    id
    exportType
    status
    count
    date {
      created
      started
      finished
    }
    error {
      message
      stack
    }
    path
  }
}
```

---

## Wave Operations

### Upload Wave

```graphql
mutation UploadWave(
  $file: Upload
  $fileSize: Int
  $fileName: String!
  $config: WaveConfigInput!
) {
  uploadWave(
    file: $file
    fileSize: $fileSize
    fileName: $fileName
    config: $config
  )
}
```

**Variables:**
```json
{
  "fileName": "wave-2025-01-15.csv",
  "config": {
    "categoryId": 12345,
    "campaignId": "camp789",
    "totalLimit": 10000,
    "generateOfferCode": true,
    "tiedToAccount": true,
    "notifyDate": "2025-01-15T10:00:00Z"
  }
}
```

### Trigger Wave Prep

```graphql
mutation TriggerWavePrep(
  $campaignId: ID!
  $dateKey: String!
  $reassign: Boolean
  $orderByPreference: Boolean
  $singleMarket: Boolean
  $randomSelection: Boolean
  $minScore: Float
) {
  triggerWavePrep(
    campaignId: $campaignId
    dateKey: $dateKey
    reassign: $reassign
    orderByPreference: $orderByPreference
    singleMarket: $singleMarket
    randomSelection: $randomSelection
    minScore: $minScore
  )
}
```

**Variables:**
```json
{
  "campaignId": "camp789",
  "dateKey": "2025-01-15",
  "orderByPreference": true,
  "minScore": 0.5
}
```

### List Waves

```graphql
query WaveList($campaignId: ID) {
  waveList(campaignId: $campaignId) {
    name
    status
    date {
      scheduled
      notify
      begin
      end
    }
    totalLimit
    generateOfferCode
    campaignId
  }
}
```

### Cancel Wave

```graphql
mutation CancelWave($fileName: String!, $campaignId: ID) {
  cancelWave(fileName: $fileName, campaignId: $campaignId)
}
```

---

## Metrics & Analytics

### Get Market Preference Metrics

```graphql
query EntriesByMarketPreference($campaignId: ID!) {
  metrics {
    entriesByMarketPreference(campaignId: $campaignId) {
      id
      counts
    }
  }
}
```

### Get Eligible Counts

```graphql
query EligibleByMarketPreference(
  $campaignId: ID!
  $includePrevSelected: Boolean
  $minScore: Float
  $maxScore: Float
) {
  metrics {
    eligibleByMarketPreference(
      campaignId: $campaignId
      includePrevSelected: $includePrevSelected
      minScore: $minScore
      maxScore: $maxScore
    ) {
      id
      counts
    }
  }
}
```

### Get Verified Counts by Market

```graphql
query VerifiedCountByMarket(
  $campaignId: ID!
  $minScore: Float
  $maxScore: Float
) {
  metrics {
    verifiedCountByMarket(
      campaignId: $campaignId
      minScore: $minScore
      maxScore: $maxScore
    ) {
      id
      count
    }
  }
}
```

---

## Statistics Operations

### Get Campaign Statistics

```graphql
query GetStats(
  $campaignId: ID!
  $marketId: ID
  $dateId: String
  $type: StatsType!
) {
  stats(
    campaignId: $campaignId
    marketId: $marketId
    dateId: $dateId
    type: $type
  ) {
    campaignId
    marketId
    dateId
    type
    status
    date {
      created
      updated
    }
    count
    meta
    errors {
      message
    }
  }
}
```

**Variables:**
```json
{
  "campaignId": "camp789",
  "type": "selection",
  "dateId": "2025-01-15"
}
```

### Upsert Statistic

```graphql
mutation UpsertStat(
  $campaignId: ID!
  $marketId: ID
  $dateId: String!
  $type: StatsType!
  $status: String
  $meta: JSON
  $count: JSON
) {
  upsertStat(
    campaignId: $campaignId
    marketId: $marketId
    dateId: $dateId
    type: $type
    status: $status
    meta: $meta
    count: $count
  ) {
    campaignId
    type
    status
    count
  }
}
```

---

## Tagging & Filtering

### Add Tags

```graphql
mutation AddTags(
  $campaignId: String!
  $fileRecords: [String]!
  $targetField: String!
  $tagName: String!
) {
  addTags(
    campaignId: $campaignId
    fileRecords: $fileRecords
    targetField: $targetField
    tagName: $tagName
  ) {
    count
  }
}
```

**Variables:**
```json
{
  "campaignId": "camp789",
  "fileRecords": ["rec1", "rec2", "rec3"],
  "targetField": "email",
  "tagName": "vip"
}
```

### Flip Verdicts

```graphql
mutation FlipVerdicts(
  $campaignId: String!
  $tagName: String!
  $filterType: FilterType!
) {
  flipVerdicts(
    campaignId: $campaignId
    tagName: $tagName
    filterType: $filterType
  ) {
    count
  }
}
```

**Variables:**
```json
{
  "campaignId": "camp789",
  "tagName": "vip",
  "filterType": "allow"
}
```

---

## Error Handling

### GraphQL Error Response Format

```json
{
  "errors": [
    {
      "message": "Campaign not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["viewer", "campaign"],
      "extensions": {
        "code": "NOT_FOUND"
      }
    }
  ],
  "data": {
    "viewer": {
      "campaign": null
    }
  }
}
```

### Common Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| UNAUTHENTICATED | User is not authenticated | Missing or invalid auth token |
| FORBIDDEN | User lacks permission | Insufficient permissions for operation |
| NOT_FOUND | Resource not found | Invalid campaign/market ID |
| BAD_USER_INPUT | Invalid input provided | Validation errors in mutation input |
| INTERNAL_SERVER_ERROR | Server error | Unexpected server-side error |

### Client-Side Error Handling

```javascript
import { useMutation } from '@apollo/client';

const [upsertCampaign, { data, error, loading }] = useMutation(UPSERT_CAMPAIGN);

try {
  const result = await upsertCampaign({
    variables: { campaign: campaignData },
    errorPolicy: 'all'  // Return both data and errors
  });

  if (result.errors) {
    // Handle GraphQL errors
    result.errors.forEach(err => {
      console.error('GraphQL Error:', err.message);
    });
  }

  if (result.data) {
    // Process successful response
    console.log('Campaign saved:', result.data.upsertCampaign);
  }
} catch (networkError) {
  // Handle network/Apollo errors
  console.error('Network Error:', networkError);
}
```

---

## Rate Limits

**Note**: Rate limiting details are not explicitly defined in the schema. Contact the API team for current rate limit policies.

---

## Best Practices

### 1. Request Only Needed Fields

Use GraphQL field selection to minimize payload size:

```graphql
# ❌ BAD - Over-fetching
query {
  viewer {
    campaigns {
      list {
        id
        name
        type
        artist { ... }
        markets { ... }
        content { ... }
        # ... all fields
      }
    }
  }
}

# ✅ GOOD - Request only what's needed
query {
  viewer {
    campaigns {
      list {
        id
        name
        type
      }
    }
  }
}
```

### 2. Use Fragments for Reusability

```graphql
fragment CampaignSummary on Campaign {
  id
  name
  type
  artist {
    name
    image_url
  }
  date {
    open
    close
  }
}

query {
  viewer {
    campaigns {
      list {
        ...CampaignSummary
      }
    }
  }
}
```

### 3. Handle Deprecated Fields

Avoid using deprecated fields (marked with `@deprecated` in schema):

```graphql
# ❌ AVOID - Deprecated
content {
  en_US {
    body { ... }
  }
}

# ✅ USE - Modern approach
content {
  localized {
    locale
    value {
      body { ... }
    }
  }
}
```

### 4. Batch Operations

Use batch mutations when available:

```graphql
mutation CloneMarkets($from: String!, $to: String!) {
  cloneMarkets(fromCampaignId: $from, toCampaignId: $to) {
    id
    name
  }
}
```

---

## Development vs Production

### Endpoint URLs

- **Development**: `http://localhost:9090/graphql`
- **Local Server**: `http://localhost:8080/graphql`
- **Production**: Contact DevOps for production URL

### Environment-Specific Configuration

```javascript
const GRAPHQL_ENDPOINT = process.env.NODE_ENV === 'production'
  ? 'https://api.verifiedfan.ticketmaster.com/graphql'
  : 'http://localhost:9090/graphql';
```

---

## Additional Resources

- **GraphQL Playground**: Available at endpoint URL in development
- **Schema Introspection**: Use GraphQL tools to explore the full schema
- **Apollo Client Documentation**: https://www.apollographql.com/docs/react/
