# API Usage - monoql

## Overview

MonoQL is a GraphQL API for campaign management and presale registration. This guide covers authentication, common operations, and best practices.

---

## Endpoints

| Environment | Endpoint |
|------------|----------|
| Local | `http://localhost:9090/graphql` |
| Dev | `https://graphql-dev1-us-east-1.titan.nonprod-tmaws.io/graphql` |
| Preprod | `https://registration.tmus.preprod.ticketmaster.net/graphql` |
| Production | `https://registration.ticketmaster.com/graphql` |

**GraphiQL IDE**: Add `/graphiql` to the endpoint URL when enabled in environment.

---

## Authentication

### Overview

MonoQL uses JWT tokens issued by Ticketmaster Identity for authentication. The API supports both authenticated and anonymous viewer contexts.

### Authentication Flow

1. **Anonymous Access**: Most queries work without authentication (returns anonymous `Viewer`)
2. **Sign In/Sign Up**: Use the `authenticate` mutation with Ticketmaster Identity credentials
3. **Authenticated Requests**: Include JWT token in subsequent requests

### Authenticate Mutation

```graphql
mutation authenticate($credentials: IdentityAuth) {
  viewer: authenticate(credentials: $credentials) {
    id
    isLoggedIn
    isAdmin
    firstName
    lastName
    email
    phone
    auth {
      token
      expiresAt
      permissions {
        campaignId
        actions
      }
    }
  }
}
```

**Variables**:
```json
{
  "credentials": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response**:
```json
{
  "data": {
    "viewer": {
      "id": "user123",
      "isLoggedIn": true,
      "isAdmin": false,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+12025551234",
      "auth": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expiresAt": 1735689600,
        "permissions": [
          {
            "campaignId": "campaign123",
            "actions": ["read", "write"]
          }
        ]
      }
    }
  }
}
```

### Using JWT Tokens

After authentication, include the JWT token in request headers:

**HTTP Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Or pass via GraphQL query argument:
```graphql
query {
  viewer(auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }) {
    isLoggedIn
    email
  }
}
```

### Logout

```graphql
mutation {
  logout
}
```

---

## Common Operations

### 1. Get Current Viewer

```graphql
query viewer {
  viewer {
    isLoggedIn
    isAdmin
    id
    firstName
    lastName
    email
    phone
    doNotSell
  }
}
```

### 2. List Campaigns

```graphql
query campaigns {
  viewer {
    campaigns {
      list(limit: 10, skip: 0, type: registration) {
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
        status
      }
    }
  }
}
```

### 3. Get Campaign by Domain

```graphql
query getCampaign($domain: String!) {
  viewer {
    campaign(domain: $domain) {
      id
      name
      type
      artist {
        name
        image_url
      }
      domain {
        site
        share
      }
      date {
        open
        close
        presaleWindowStart
        presaleWindowEnd
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
      content {
        localized {
          locale
          value {
            body {
              started {
                welcome {
                  header
                  above_button
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Variables**:
```json
{
  "domain": "artist-presale.ticketmaster.com"
}
```

### 4. Create Campaign

```graphql
mutation createCampaign($campaign: CampaignInput!) {
  upsertCampaign(campaign: $campaign) {
    id
    name
    type
    status
  }
}
```

**Variables**:
```json
{
  "campaign": {
    "name": "Artist Tour 2025",
    "type": "registration",
    "artist": {
      "id": "artist123",
      "name": "Example Artist",
      "image_url": "https://example.com/artist.jpg"
    },
    "date": {
      "open": "2025-03-01T00:00:00Z",
      "close": "2025-03-15T23:59:59Z",
      "presaleWindowStart": "2025-03-20T10:00:00Z",
      "presaleWindowEnd": "2025-03-20T22:00:00Z"
    },
    "referenceTimezone": "America/New_York",
    "domain": {
      "site": "artist-presale.ticketmaster.com"
    },
    "identifier": "email"
  }
}
```

### 5. Search Artists

```graphql
query searchArtists($query: String!) {
  searchArtists(query: $query, limit: 20) {
    id
    discovery_id
    name
    image_url
  }
}
```

**Variables**:
```json
{
  "query": "Taylor"
}
```

### 6. Create Market

```graphql
mutation createMarket($market: MarketInput!) {
  upsertMarket(market: $market) {
    id
    name
    city
    state
    event {
      id
      name
      date
      venue {
        name
      }
    }
  }
}
```

**Variables**:
```json
{
  "market": {
    "campaignId": "campaign123",
    "name": "New York, NY",
    "city": "New York",
    "state": "NY",
    "timezone": "America/New_York",
    "population": 8000000,
    "point": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "event": {
      "id": "event456",
      "name": "Artist Concert",
      "date": "2025-04-15T20:00:00Z",
      "presaleDateTime": "2025-03-20T10:00:00Z",
      "venue": {
        "name": "Madison Square Garden"
      },
      "link": "https://ticketmaster.com/event/event456"
    }
  }
}
```

### 7. Submit User Entry

```graphql
mutation submitEntry($entry: JSON!, $campaignId: String!, $locale: String!) {
  upsertViewerEntry(entry: $entry, campaignId: $campaignId, locale: $locale) {
    id
    email
    campaign(id: $campaignId) {
      ... on RegistrationCampaign {
        entry {
          date
          attributes
          fields
        }
        eligibility {
          isEligible
          reason
        }
      }
    }
  }
}
```

**Variables**:
```json
{
  "campaignId": "campaign123",
  "locale": "en_US",
  "entry": {
    "preferences": ["market1", "market2", "market3"],
    "fanclub_member": true,
    "custom_field": "value"
  }
}
```

### 8. Upload Codes

```graphql
mutation uploadCodes($file: Upload!, $fileSize: Int!, $campaignId: String!, $type: String!) {
  uploadCodes(file: $file, fileSize: $fileSize, campaignId: $campaignId, type: $type) {
    in
    inserted
    updated
  }
}
```

**Note**: File uploads require `multipart/form-data` content type.

### 9. Schedule Export

```graphql
mutation scheduleExport($campaignId: String!, $type: String!) {
  scheduleExport(campaignId: $campaignId, type: $type) {
    id
    campaignId
    exportType
    status
    date {
      created
      triggered
    }
  }
}
```

**Variables**:
```json
{
  "campaignId": "campaign123",
  "type": "entries"
}
```

### 10. Get Metrics

```graphql
query campaignMetrics($campaignId: ID!) {
  metrics {
    entriesByMarketPreference(campaignId: $campaignId) {
      id
      counts
    }
    eligibleByMarketPreference(campaignId: $campaignId) {
      id
      counts
    }
    verifiedCountByMarket(campaignId: $campaignId) {
      id
      count
    }
  }
}
```

### 11. Trigger Wave Prep

```graphql
mutation triggerWavePrep($campaignId: ID!, $dateKey: String!) {
  triggerWavePrep(
    campaignId: $campaignId
    dateKey: $dateKey
    orderByPreference: true
    randomSelection: false
  )
}
```

**Variables**:
```json
{
  "campaignId": "campaign123",
  "dateKey": "2025-03-20"
}
```

### 12. Get Campaign Statistics

```graphql
query campaignStats($campaignId: ID!, $type: StatsType!) {
  stats(campaignId: $campaignId, type: $type) {
    campaignId
    marketId
    dateId
    type
    status
    count
    date {
      created
      updated
    }
  }
}
```

**Variables**:
```json
{
  "campaignId": "campaign123",
  "type": "selection"
}
```

---

## File Uploads

MonoQL supports file uploads for various operations (codes, images, fanlists, etc.) using GraphQL Upload scalar.

### Upload Methods

#### 1. Using graphql-upload (Node.js)

```javascript
import { createReadStream } from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

const uploadCodes = async (campaignId, filePath) => {
  const form = new FormData();

  const operations = JSON.stringify({
    query: `
      mutation uploadCodes($file: Upload!, $fileSize: Int!, $campaignId: String!, $type: String!) {
        uploadCodes(file: $file, fileSize: $fileSize, campaignId: $campaignId, type: $type) {
          in
          inserted
          updated
        }
      }
    `,
    variables: {
      file: null,
      fileSize: 1024,
      campaignId: campaignId,
      type: "presale"
    }
  });

  const map = JSON.stringify({
    "0": ["variables.file"]
  });

  form.append('operations', operations);
  form.append('map', map);
  form.append('0', createReadStream(filePath));

  const response = await fetch('https://registration.ticketmaster.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
    },
    body: form
  });

  return response.json();
};
```

#### 2. Using curl

```bash
curl -X POST https://registration.ticketmaster.com/graphql \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F operations='{"query": "mutation uploadCodes($file: Upload!, $fileSize: Int!, $campaignId: String!, $type: String!) { uploadCodes(file: $file, fileSize: $fileSize, campaignId: $campaignId, type: $type) { in inserted updated } }", "variables": {"file": null, "fileSize": 1024, "campaignId": "campaign123", "type": "presale"}}' \
  -F map='{"0": ["variables.file"]}' \
  -F 0=@codes.csv
```

### Supported Upload Operations

| Mutation | Purpose | File Format |
|----------|---------|-------------|
| `uploadCodes` | Upload presale codes | CSV |
| `uploadImage` | Upload campaign images | Base64 encoded image |
| `uploadBlacklist` | Upload blacklist | CSV |
| `uploadScored` | Upload scored fanlist | CSV |
| `uploadFanlist` | Upload fanlist | CSV |
| `uploadWavePrepFile` | Upload wave prep file | CSV |
| `uploadWave` | Upload wave file | CSV |

---

## Error Handling

### GraphQL Error Response Format

```json
{
  "errors": [
    {
      "message": "Campaign not found",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["viewer", "campaign"],
      "extensions": {
        "code": "NOT_FOUND",
        "campaignId": "invalid123"
      }
    }
  ],
  "data": null
}
```

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `UNAUTHENTICATED` | Missing or invalid JWT token | Authenticate via `authenticate` mutation |
| `UNAUTHORIZED` | Insufficient permissions | Check campaign permissions in viewer.auth.permissions |
| `NOT_FOUND` | Resource not found | Verify campaign/market/entity ID |
| `VALIDATION_ERROR` | Invalid input data | Review input validation messages |
| `RATE_LIMITED` | Too many requests | Implement exponential backoff |
| `INTERNAL_ERROR` | Server error | Retry or contact support |

### Campaign-Specific Errors

MonoQL includes campaign-specific error messages in the `Content.errors` field:

```graphql
query {
  viewer {
    campaign(id: "campaign123") {
      ... on RegistrationCampaign {
        content {
          localized {
            locale
            value {
              errors {
                code
                message
              }
            }
          }
        }
      }
    }
  }
}
```

**Error Response**:
```json
{
  "errors": [
    {
      "code": "CAMPAIGN_CLOSED",
      "message": "This campaign has closed and is no longer accepting entries."
    },
    {
      "code": "INELIGIBLE",
      "message": "You are not eligible for this presale."
    }
  ]
}
```

---

## Rate Limits

MonoQL implements rate limiting on a per-user and per-IP basis.

- **Anonymous requests**: 100 requests per minute
- **Authenticated requests**: 500 requests per minute
- **Upload operations**: 10 requests per minute

**Rate limit headers** (if implemented):
```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1735689600
```

---

## Best Practices

### 1. Query Naming

Always name your queries for tracking in Apollo Engine and Prometheus:

```graphql
# ✅ Good - Named query
query campaigns_listActive {
  viewer {
    campaigns {
      list(type: registration) {
        id
        name
      }
    }
  }
}

# ❌ Bad - Anonymous query
query {
  viewer {
    campaigns {
      list(type: registration) {
        id
        name
      }
    }
  }
}
```

**Naming convention**: `${client}_${description}`

Examples:
- `campaigns_initApp`
- `campaigns_getCampaignById`
- `entry_submitRegistration`

### 2. Field Selection

Request only the fields you need to reduce response size:

```graphql
# ✅ Good - Specific fields
query campaigns_listNames {
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

# ❌ Bad - Requesting everything
query campaigns_listAll {
  viewer {
    campaigns {
      list {
        id
        name
        type
        artist {
          id
          name
          image_url
          discovery_id
          needs_id
          fanclubName
        }
        content {
          localized {
            locale
            value {
              # ... everything
            }
          }
        }
        # ... all fields
      }
    }
  }
}
```

### 3. Pagination

Use `limit` and `skip` for large result sets:

```graphql
query campaigns_paginated($limit: Int!, $skip: Int!) {
  viewer {
    campaigns {
      list(limit: $limit, skip: $skip) {
        id
        name
      }
    }
  }
}
```

### 4. Error Handling

Always check for errors in responses:

```javascript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables })
});

const result = await response.json();

if (result.errors) {
  // Handle GraphQL errors
  console.error('GraphQL errors:', result.errors);
  result.errors.forEach(error => {
    console.error(`Error: ${error.message}`, error.extensions);
  });
}

if (result.data) {
  // Process data
  console.log('Data:', result.data);
}
```

### 5. Fragment Reuse

Use fragments for repeated field selections:

```graphql
fragment CampaignBasic on Campaign {
  id
  name
  type
  artist {
    name
    image_url
  }
}

query campaigns_list {
  viewer {
    campaigns {
      list {
        ...CampaignBasic
      }
    }
  }
}

query campaigns_getById($id: String!) {
  viewer {
    campaign(id: $id) {
      ...CampaignBasic
      markets {
        id
        name
      }
    }
  }
}
```

### 6. Locale Handling

Prefer the `localized` field over deprecated locale-specific fields:

```graphql
# ✅ Good - Using localized
query campaign_content {
  viewer {
    campaign(id: "campaign123") {
      ... on RegistrationCampaign {
        content {
          localized {
            locale
            value {
              body {
                started {
                  welcome {
                    header
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

# ❌ Deprecated - Locale-specific fields
query campaign_content_deprecated {
  viewer {
    campaign(id: "campaign123") {
      ... on RegistrationCampaign {
        content {
          en_US {  # Deprecated
            body {
              started {
                welcome {
                  header
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 7. Type Discrimination

Use inline fragments for interface types (Campaign):

```graphql
query campaign_byType($id: String!) {
  viewer {
    campaign(id: $id) {
      id
      name
      type

      ... on RegistrationCampaign {
        markets {
          id
          name
        }
        eligibility {
          isEligible
          reason
        }
      }

      ... on FanlistCampaign {
        scoring
        uploads {
          date
          rows
          status
        }
      }
    }
  }
}
```

---

## Tools & Development

### GraphQL CLI

Install and use graphql-cli for schema introspection:

```bash
npm install -g graphql-cli@3
```

Update local schema:
```bash
graphql get-schema http://localhost:9090/graphql
```

### .graphqlconfig.yaml

Configure endpoints in your project:

```yaml
schemaPath: schema.graphql
extensions:
  endpoints:
    default: 'http://localhost:9090/graphql'
    dev: 'https://graphql-dev1-us-east-1.titan.nonprod-tmaws.io/graphql'
    preprod: 'https://registration.tmus.preprod.ticketmaster.net/graphql'
    prod: 'https://registration.ticketmaster.com/graphql'
```

### ESLint Plugin

Use eslint-plugin-graphql to validate queries:

```bash
npm install --save-dev eslint-plugin-graphql
```

**.eslintrc.js**:
```javascript
module.exports = {
  plugins: ['graphql'],
  rules: {
    'graphql/template-strings': ['error', {
      env: 'apollo',
      schemaJson: require('./schema.json')
    }]
  }
};
```

### GraphQL Playground

Use GraphQL Playground for interactive development:

```bash
npm install -g graphql-playground
graphql-playground
```

Point to MonoQL endpoint and start exploring the API.

---

## Monitoring & Observability

### Prometheus Metrics

MonoQL exposes Prometheus metrics at `/metrics`:

```
http://localhost:9090/metrics
```

Key metrics:
- `graphql_request_duration_seconds` - Request latency
- `graphql_requests_total` - Request count by query name
- `graphql_errors_total` - Error count by type

### Tracing

MonoQL includes distributed tracing headers:

**Request headers**:
```
X-Correlation-Id: abc123-def456-ghi789
X-Trace-Id: trace-xyz-123
```

**Response headers**:
```
X-Correlation-Id: abc123-def456-ghi789
X-Response-Time: 234ms
```

### Health Check

Check service health at `/heartbeat`:

```bash
curl http://localhost:9090/heartbeat
```

---

## Support & Resources

- **Schema Documentation**: http://titan.git.tmaws.io/docs/graphql/#schemagraphql
- **GraphQL Spec**: https://graphql.org/learn/
- **Apollo Client Docs**: https://www.apollographql.com/docs/react/
