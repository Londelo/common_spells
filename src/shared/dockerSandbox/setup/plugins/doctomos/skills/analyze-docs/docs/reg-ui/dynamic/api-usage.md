# API Usage - reg-ui

## Overview

This document provides practical examples and guidance for using the reg-ui APIs. The primary API is GraphQL (via AWS AppSync), with supporting REST endpoints for monitoring and logging.

---

## Authentication

### SOTC (Session of the Customer) Token

The primary authentication mechanism uses SOTC tokens stored in cookies:

**Cookie Name:** `SOTC`

**Usage:**
1. User logs in via Ticketmaster authentication
2. SOTC token stored in secure HTTP-only cookie
3. Token automatically sent with requests

**GraphQL Authorization Header:**
```
Authorization: ${APPSYNC_API_KEY}:${sotc}
```

**Additional Header:**
```
sotc: ${sotc}
```

### Protected Operations

The following operations require authentication (valid SOTC token):

**Queries:**
- `fan` - Get authenticated user information
- Any nested queries under `fan`

**Mutations:**
- `upsertEntry` - Save/update campaign entry
- `deleteEntry` - Delete entry
- `activateLNAA` - Activate LNAA membership
- `checkLiveness` - Initiate liveness verification
- `demandRecordSave` - Save demand notification
- `demandRecordDelete` - Delete demand notification

---

## GraphQL API Usage

### Base URLs

**Production:**
- Configured via `APPSYNC_URL` environment variable
- Format: `https://{appsync-id}.appsync-api.{region}.amazonaws.com/graphql`

**Development (Mock):**
- Local: `https://localhost.tktm.io:1045/api/graphql`
- Set `SHOULD_MOCK=true` to enable

### Making Requests

#### Using fetch (Browser)

```javascript
const query = `
  query GetCampaign($domain: String!, $locale: String) {
    viewer {
      campaign(domain: $domain, locale: $locale) {
        id
        name
      }
    }
  }
`;

const response = await fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include SOTC cookie
  body: JSON.stringify({
    query,
    variables: {
      domain: 'example-campaign',
      locale: 'en-US'
    }
  })
});

const result = await response.json();
```

#### Using graphql-request (Server-side)

```typescript
import { GraphQLClient } from 'graphql-request';
import { getSdk } from './generated/appsync';

const client = new GraphQLClient('/graphql', {
  credentials: 'include',
  errorPolicy: 'all'
});

const sdk = getSdk(client);

// Query with type safety
const result = await sdk.fetchCampaign({
  domain: 'example-campaign',
  locale: 'en-US'
});
```

### Common Query Examples

#### 1. Fetch Campaign Information

```graphql
query FetchCampaign($domain: String!, $locale: String, $password: String) {
  viewer {
    campaign(domain: $domain, locale: $locale, password: $password) {
      id
      name
      status
    }
  }
}
```

**Variables:**
```json
{
  "domain": "my-campaign-slug",
  "locale": "en-US"
}
```

**Use Case:** Load campaign by domain/slug to display registration form.

---

#### 2. Get User Entry Record

```graphql
query GetEntryRecord($campaignId: ID!) {
  fan {
    firstName
    lastName
    email
    isLoggedIn
    location {
      latitude
      longitude
    }
    entryRecord(campaignId: $campaignId) {
      campaignId
      locale
      fields
      codes {
        id
        marketId
      }
      date {
        fanModified
      }
    }
  }
}
```

**Variables:**
```json
{
  "campaignId": "123abc"
}
```

**Use Case:** Check if user has already registered for a campaign.

---

#### 3. Check LNAA Membership Status

```graphql
query GetLNAAMemberStatus {
  fan {
    isLNAAMember
  }
}
```

**Use Case:** Determine if user should see LNAA opt-in checkbox.

---

#### 4. Get Verification Status

```graphql
query GetVerificationStatus($campaignId: ID!, $email: AWSEmail) {
  api {
    verificationStatus(campaignId: $campaignId, email: $email) {
      campaignId
      globalUserId
      isVerified
      verdict
      score
      events {
        id
        rank
      }
    }
  }
}
```

**Variables:**
```json
{
  "campaignId": "123abc",
  "email": "user@example.com"
}
```

**Use Case:** Check user's verification status for Verified Fan sale.

---

#### 5. Get Account Fanscore

```graphql
query GetAccountFanscore($eventId: ID, $memberId: ID) {
  api {
    accountFanscore(eventId: $eventId, memberId: $memberId) {
      score
      rawScore
      armScore
      isBot
      tags
      version
    }
  }
}
```

**Variables:**
```json
{
  "eventId": "789def",
  "memberId": "user-member-id"
}
```

**Use Case:** Retrieve fan engagement score for event access decisions.

---

### Common Mutation Examples

#### 1. Save/Update Campaign Entry

```graphql
mutation UpsertEntry(
  $slug: String!
  $locale: String!
  $entry: AWSJSON!
  $doTransfer: Boolean
) {
  upsertEntry(
    slug: $slug
    locale: $locale
    entry: $entry
    doTransfer: $doTransfer
  ) {
    campaignId
    locale
    fields
    date {
      fanModified
    }
  }
}
```

**Variables:**
```json
{
  "slug": "my-campaign",
  "locale": "en-US",
  "doTransfer": false,
  "entry": {
    "fields": {
      "markets": ["market-id-1", "market-id-2"],
      "allow_marketing": true,
      "allow_artist_sms": false
    }
  }
}
```

**Use Case:** Submit registration form with market selections and opt-ins.

**Fields Structure:**
- `markets`: Array of market IDs selected by user
- `allow_marketing`: Marketing email opt-in
- `allow_artist_sms`: Artist SMS opt-in
- `allow_livenation`: Live Nation marketing opt-in

---

#### 2. Activate LNAA Membership

```graphql
mutation ActivateLNAA {
  activateLNAA {
    success
  }
}
```

**Use Case:** Opt-in user to Live Nation Audience Alliance program.

---

#### 3. Initiate Liveness Check

```graphql
mutation CheckLiveness($options: LivenessOptions) {
  checkLiveness(options: $options) {
    decision {
      requiresVerification
      token
      session {
        id
        status
        vendorSessionId
      }
    }
    error {
      ... on LivenessCheckFailedError {
        message
        sessionId
        expiresAt
      }
      ... on UnauthorizedError {
        message
      }
    }
  }
}
```

**Variables:**
```json
{
  "options": {
    "appId": "campaign-app-id",
    "subjectId": "user-global-id",
    "tier": "high",
    "verificationType": "selfie"
  }
}
```

**Use Case:** Start identity verification process for high-demand events.

---

#### 4. Save Demand Notification Request

```graphql
mutation SaveDemandRecord($options: DemandRecordInput) {
  demandRecordSave(options: $options) {
    status
    error {
      code
      message
    }
  }
}
```

**Variables:**
```json
{
  "options": {
    "eventId": "event-123",
    "saleId": "sale-456",
    "locale": "en-US"
  }
}
```

**Use Case:** Sign up user for ticket availability notifications.

---

#### 5. Update Cached Campaign (Development Only)

```graphql
mutation UpdateCachedCampaign($fileName: String) {
  updateCachedCampaign(fileName: $fileName)
}
```

**Variables:**
```json
{
  "fileName": "test-campaign"
}
```

**Use Case:** Load mock campaign data into Redis cache for local testing.

**File Location:** `lib/mocks/campaign/{fileName}.json`

---

### Subscription Examples

#### Subscribe to Liveness Status Updates

```graphql
subscription LivenessStatusUpdate($id: String!) {
  livenessStatusUpdate(id: $id) {
    id
    status
    vendorSessionId
    date {
      updated
      approved
      declined
    }
  }
}
```

**Variables:**
```json
{
  "id": "session-id-from-checkLiveness"
}
```

**Use Case:** Real-time updates during identity verification process.

---

## REST API Usage

### Health Check

```bash
curl https://api.example.com/heartbeat
```

**Response:**
```json
{
  "status": "OK"
}
```

**Use Case:** Load balancer health checks, monitoring.

---

### Prometheus Metrics

```bash
curl https://api.example.com/metrics
```

**Response:**
```
# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 123456789

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 98765432
...
```

**Use Case:** Application performance monitoring, alerting.

---

### Client-Side Logging

```bash
curl -X POST https://api.example.com/api/log \
  -H "Content-Type: application/json" \
  -d '{
    "context": "components:Form:submit",
    "level": "error",
    "description": "Form submission failed",
    "fields": {
      "errorCode": "NETWORK_ERROR",
      "campaignSlug": "example-campaign"
    }
  }'
```

**Response:** `200 OK` (empty body)

**JavaScript Example:**
```javascript
const logger = {
  log: async (level, context, description, fields = {}) => {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, level, description, fields })
    });
  }
};

// Usage
logger.log('error', 'components:Form:submit', 'Validation failed', {
  field: 'email',
  value: 'invalid@'
});
```

**Use Case:** Centralized logging for client-side errors and events.

---

### Generate Open Graph Image

```bash
curl https://api.example.com/api/og --output preview.png
```

**Use Case:** Social media preview images for campaign pages.

**HTML Meta Tag:**
```html
<meta property="og:image" content="https://api.example.com/api/og" />
```

---

## Error Handling

### GraphQL Error Format

**Standard GraphQL Error:**
```json
{
  "data": null,
  "errors": [
    {
      "message": "User is not authenticated",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

**Union Error Types:**
```json
{
  "data": {
    "checkLiveness": {
      "decision": null,
      "error": {
        "__typename": "LivenessCheckFailedError",
        "message": "Verification session expired",
        "sessionId": "session-123",
        "expiresAt": "2024-01-15T10:00:00Z"
      }
    }
  }
}
```

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `UNAUTHENTICATED` | Missing or invalid SOTC token | Redirect to login |
| `VALIDATION_ERROR` | Invalid input data | Show form validation errors |
| `NOT_FOUND` | Campaign or resource not found | Show 404 page |
| `INTERNAL_ERROR` | Server error | Show error message, retry |

---

## Rate Limits

**Note:** Rate limiting is handled at the AWS AppSync level and CDN (Fastly) level. Specific limits are not exposed by this API.

**Best Practices:**
- Implement exponential backoff for retries
- Cache campaign data client-side where appropriate
- Use SWR or React Query for automatic caching and revalidation

---

## Development & Testing

### Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure hosts file:**
   ```bash
   echo "127.0.0.1 localhost.tktm.io" | sudo tee -a /etc/hosts
   ```

3. **Start mock server:**
   ```bash
   npm run mock-local
   ```

4. **Access GraphQL Playground:**
   ```
   https://localhost.tktm.io:1045/api/graphql
   ```

### Loading Test Data

1. **Prepare campaign JSON:**
   - Place in `lib/mocks/campaign/my-test-campaign.json`

2. **Load into cache via GraphQL:**
   ```graphql
   mutation {
     updateCachedCampaign(fileName: "my-test-campaign")
   }
   ```

3. **Verify cached data:**
   ```graphql
   query {
     readCachedCampaign(slug: "my-campaign-slug")
   }
   ```

4. **Access campaign:**
   ```
   https://localhost.tktm.io:1045/my-campaign-slug
   ```

### Using the useClientLogger Hook

```typescript
import { useClientLogger } from 'hooks/useClientLogger';

const MyComponent = () => {
  const logger = useClientLogger('components:MyComponent:handleSubmit');

  const handleSubmit = async (data) => {
    logger.info('Form submitted', { fields: Object.keys(data) });

    try {
      await saveData(data);
      logger.info('Save successful');
    } catch (error) {
      logger.error('Save failed', {
        errorMessage: error.message,
        errorCode: error.code
      });
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

**Context Format:** `scope:component:function`

**Console Logging:**
- Enabled by default in local/dev
- Controlled via `CONSOLE_LOGGING_ENABLED` environment variable

---

## Code Generation

Generate TypeScript types from GraphQL schema:

```bash
npm run generate
```

**Output:** `lib/types/appsync.ts`

**What it does:**
1. Introspects AppSync schema
2. Generates types for all queries, mutations, subscriptions
3. Creates typed SDK functions
4. Updates local schema file

**Usage:**
```typescript
import { GetEntryRecordQuery, GetEntryRecordQueryVariables } from 'lib/types/appsync';

const variables: GetEntryRecordQueryVariables = {
  campaignId: '123'
};

const result: GetEntryRecordQuery = await sdk.GetEntryRecord(variables);
```

---

## Environment Configuration

### Required Environment Variables

**Production:**
```bash
APPSYNC_URL=https://xxx.appsync-api.us-east-1.amazonaws.com/graphql
APPSYNC_API_KEY=da2-xxxxxxxxxxxxx
REDIS_PRIMARY_ENDPOINT=redis-primary.cache.amazonaws.com:6379
REDIS_READER_ENDPOINT=redis-reader.cache.amazonaws.com:6379
BUILD_ENV=prod
```

**Local Development:**
```bash
SHOULD_MOCK=true
BUILD_ENV=local
CONSOLE_LOGGING_ENABLED=true
```

### Configuration Files

- **Base:** `configs/default.config.yml`
- **Environment-specific:** `configs/{dev|qa|preprod|prod}.config.yml`

**Loading:**
```typescript
import config from 'lib/config/server';

console.log(config.APPSYNC_URL);
```

---

## Caching Strategy

### Redis Campaign Cache

**TTL:** 8 hours

**Key Format:** `campaign:{slug}`

**Operations:**
```typescript
import cache from 'lib/cache';

// Get campaign
const campaign = await cache.getCampaign('my-campaign');

// Set campaign
await cache.setCampaign({
  slug: 'my-campaign',
  campaign: campaignData
});
```

**Fallback:**
- Primary Redis endpoint fails → Read replica
- Both fail → Returns `null` (graceful degradation)

---

## Security Considerations

### Credential Management
- ✅ All secrets in environment variables
- ✅ No hardcoded API keys in code
- ✅ SOTC tokens in HTTP-only secure cookies

### Input Validation
- ✅ Zod schema validation on REST endpoints
- ✅ GraphQL type validation
- ✅ Server-side validation of all mutations

### CORS
- Apollo Server: Allows `sandbox.embed.apollographql.com` (dev only)
- Production: Restrictive CORS via AWS AppSync

### Rate Limiting
- Handled at CDN (Fastly) and AWS AppSync levels
- No application-level rate limiting

---

## Support & Troubleshooting

### Common Issues

**Issue:** "User is not authenticated"
- **Cause:** Missing or expired SOTC token
- **Solution:** Redirect user to login

**Issue:** Campaign not found
- **Cause:** Cache miss or invalid slug
- **Solution:** Check Redis cache, verify slug spelling

**Issue:** GraphQL playground not accessible
- **Cause:** Not in mock mode
- **Solution:** Set `SHOULD_MOCK=true` and restart server

**Issue:** Metrics endpoint returns 404
- **Cause:** Build configuration issue
- **Solution:** Ensure Next.js route is properly deployed

### Logs & Debugging

**Server logs:**
```bash
# Check application logs
tail -f logs/app.log
```

**Client logs:**
- Browser DevTools Console (when `CONSOLE_LOGGING_ENABLED=true`)
- Aggregated via `/api/log` endpoint

**GraphQL debugging:**
- Enable `introspection: true` in Apollo Server (dev only)
- Use GraphQL Playground at `/api/graphql`
- Check network tab for request/response details
