# API Usage - appsync

## Overview

This document provides practical examples and guidance for using the Verified Fan AppSync GraphQL API. The API provides fan verification, identity scoring, event demand tracking, and liveness verification.

---

## Authentication

The API supports three authentication methods:

### 1. AWS IAM (Primary)

Use AWS Signature Version 4 to sign requests with IAM credentials.

```javascript
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';

const signer = new SignatureV4({
  service: 'appsync',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  sha256: Sha256
});

const request = {
  method: 'POST',
  protocol: 'https:',
  hostname: 'your-api-id.appsync-api.us-east-1.amazonaws.com',
  path: '/graphql',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query, variables })
};

const signedRequest = await signer.sign(request);
```

### 2. API Key

For public endpoints (demand tracking, liveness webhooks). Include API key in header:

```bash
curl -X POST https://your-api-id.appsync-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"query": "...", "variables": {}}'
```

### 3. Lambda Authorizer (Custom Token)

For custom authentication with user session tokens. The API uses a Lambda authorizer that validates custom tokens.

Format: `Authorization: {apiKey}:{sessionToken}`

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `${apiKey}:${userSessionToken}`
};
```

---

## GraphQL Endpoint

```
https://your-api-id.appsync-api.us-east-1.amazonaws.com/graphql
```

Replace `your-api-id` with your AppSync API ID from the deployed environment.

---

## Query Examples

### Get Account Fanscore

Retrieve trust score for a fan account. Use `globalUserId`, `memberId`, or both as identifiers.

```graphql
query GetAccountFanscore($globalUserId: ID, $memberId: ID, $eventId: ID) {
  api {
    accountFanscore(
      globalUserId: $globalUserId
      memberId: $memberId
      eventId: $eventId
    ) {
      globalUserId
      memberId
      score
      rawScore
      armScore
      email
      version
      isBot
      tags
    }
  }
}
```

**Variables:**
```json
{
  "globalUserId": "12345",
  "eventId": "vvG1iZ9xk6lw9"
}
```

**Response:**
```json
{
  "data": {
    "api": {
      "accountFanscore": {
        "globalUserId": "12345",
        "memberId": "67890",
        "score": 0.85,
        "rawScore": 0.82,
        "armScore": 750,
        "email": "fan@example.com",
        "version": "v2.1",
        "isBot": false,
        "tags": []
      }
    }
  }
}
```

**Score Interpretation:**
- `score`: 0.0-1.0 (higher = more trusted)
- `isBot`: true if bot detection triggered
- `armScore`: Alternative risk model score (0-1000)

---

### Get Verification Status

Check if a fan is verified for a specific campaign.

```graphql
query GetVerificationStatus(
  $campaignId: ID!
  $globalUserId: ID
  $email: AWSEmail
) {
  api {
    verificationStatus(
      campaignId: $campaignId
      globalUserId: $globalUserId
      email: $email
    ) {
      campaignId
      globalUserId
      memberId
      score
      rawScore
      armScore
      isVerified
      verdict
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
  "campaignId": "1234",
  "globalUserId": "12345"
}
```

**Response:**
```json
{
  "data": {
    "api": {
      "verificationStatus": {
        "campaignId": "1234",
        "globalUserId": "12345",
        "memberId": "67890",
        "score": 0.92,
        "rawScore": 0.89,
        "armScore": 820,
        "isVerified": true,
        "verdict": true,
        "events": [
          { "id": "evt1", "rank": 1 },
          { "id": "evt2", "rank": 3 }
        ]
      }
    }
  }
}
```

**Verdict Interpretation:**
- `isVerified`: Whether fan has passed verification
- `verdict`: Final decision (true = approved for sale)
- `events`: Previous verified event attendance with rank

---

### List Campaigns for Event

Retrieve available campaigns for an event.

```graphql
query GetCampaigns($eventId: String!) {
  api {
    campaigns(eventId: $eventId) {
      id
      type
      name
      categoryId
      slug
      identifier
      date {
        created
        presaleWindowStart
      }
    }
  }
}
```

**Variables:**
```json
{
  "eventId": "vvG1iZ9xk6lw9"
}
```

---

### Get Event Details (Demand)

Retrieve event and sales information for demand tracking.

```graphql
query GetEventDetails($eventId: ID!) {
  demand {
    eventDetails(eventId: $eventId) {
      id
      name
      startDateTime
      isSuppressed
      marketEventId
      venue {
        id
        name
        city
        state
        country
        timezone
      }
      sales {
        id
        name
        saleTypes
        startDateTime
        endDateTime
      }
    }
  }
}
```

**Variables:**
```json
{
  "eventId": "vvG1iZ9xk6lw9"
}
```

---

### Get Demand Records for Fan

Retrieve all demand signup records for the authenticated fan.

```graphql
query GetDemandRecords($eventId: ID, $saleId: ID) {
  demand {
    fan {
      isLoggedIn
      demandRecords(eventId: $eventId, saleId: $saleId) {
        eventId
        saleId
        eventName
        saleName
        artistName
        contactMethod
        requestedDateTime
        notifiedDateTime
      }
    }
  }
}
```

**Auth:** Requires Lambda authorizer with user session token.

---

### Get Identity Cluster

Retrieve identity cluster information for fraud detection.

```graphql
query GetCluster($globalUserId: ID!) {
  api {
    cluster(globalUserId: $globalUserId) {
      id
      globalUserId
      type
      size
      refreshDate
    }
  }
}
```

**Variables:**
```json
{
  "globalUserId": "12345"
}
```

**Cluster Types:**
- `exact`: Direct identity matches (same device, IP, payment method)
- `inferred`: Suspected related accounts

---

### Phone Number Scoring

Get risk assessment for a phone number.

```graphql
query GetPhoneScore($phoneNumber: String!, $globalUserId: ID) {
  phone {
    score(phoneNumber: $phoneNumber, globalUserId: $globalUserId) {
      phoneNumber
      phoneType
      carrier
      location {
        city
        state
        country {
          name
          iso2
        }
      }
      risk {
        level
        recommendation
        score
      }
      dateUpdated
    }
  }
}
```

**Variables:**
```json
{
  "phoneNumber": "+15551234567"
}
```

**Risk Recommendations:**
- `allow`: Low risk, proceed
- `flag`: Medium risk, review
- `block`: High risk, deny

---

## Mutation Examples

### Save Demand Record

Sign up for event sale notifications.

```graphql
mutation SaveDemandRecord(
  $eventId: ID!
  $saleId: ID!
  $locale: String
) {
  demandRecordSave(
    options: {
      eventId: $eventId
      saleId: $saleId
      locale: $locale
    }
  ) {
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
  "eventId": "vvG1iZ9xk6lw9",
  "saleId": "12345",
  "locale": "en-us"
}
```

**Response (Success):**
```json
{
  "data": {
    "demandRecordSave": {
      "status": "SAVED",
      "error": null
    }
  }
}
```

**Response (Error):**
```json
{
  "data": {
    "demandRecordSave": {
      "status": "FAILED",
      "error": {
        "code": "401",
        "message": "User not logged in"
      }
    }
  }
}
```

**Auth:** Requires API Key + Lambda authorizer (user must be logged in).

---

### Delete Demand Record

Remove event sale notification signup.

```graphql
mutation DeleteDemandRecord($eventId: ID!, $saleId: ID!) {
  demandRecordDelete(
    options: {
      eventId: $eventId
      saleId: $saleId
    }
  ) {
    status
    error {
      code
      message
    }
  }
}
```

**Auth:** Requires API Key + Lambda authorizer (user must be logged in).

---

### Check Liveness Requirement

Determine if identity verification is required for a user.

```graphql
mutation CheckLiveness(
  $appId: String!
  $subjectId: String!
  $tier: LivenessTier!
  $verificationType: VerificationType!
) {
  checkLiveness(
    options: {
      appId: $appId
      subjectId: $subjectId
      tier: $tier
      verificationType: $verificationType
    }
  ) {
    decision {
      requiresVerification
      token
      session {
        id
        status
        vendorId
        vendorSessionId
        token
        date {
          created
          expiresAt
        }
      }
    }
    error {
      __typename
      ... on LivenessCheckFailedError {
        message
        sessionId
        expiresAt
      }
      ... on VendorRequestFailedError {
        message
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
  "appId": "myapp",
  "subjectId": "user-12345",
  "tier": "medium",
  "verificationType": "selfie"
}
```

**Response (Verification Not Required):**
```json
{
  "data": {
    "checkLiveness": {
      "decision": {
        "requiresVerification": false,
        "token": null,
        "session": null
      },
      "error": null
    }
  }
}
```

**Response (Verification Required):**
```json
{
  "data": {
    "checkLiveness": {
      "decision": {
        "requiresVerification": true,
        "token": "auth-token-xyz",
        "session": {
          "id": "sess-123",
          "status": "created",
          "vendorId": "vendor-abc",
          "vendorSessionId": "vendor-sess-456",
          "token": "vendor-token",
          "date": {
            "created": "2025-01-15T10:30:00Z",
            "expiresAt": "2025-01-15T11:30:00Z"
          }
        }
      },
      "error": null
    }
  }
}
```

**Liveness Tiers:**
- `always`: All users require verification
- `high`: High risk users only
- `medium`: Medium+ risk users
- `low`: Low+ risk users
- `asu`: Arizona State University specific logic

---

### Save Registration Entry

Create or update a campaign registration entry.

```graphql
mutation SaveEntry(
  $entry: AWSJSON!
  $slug: String!
  $locale: String!
  $doTransfer: Boolean
) {
  upsertEntry(
    entry: $entry
    slug: $slug
    locale: $locale
    doTransfer: $doTransfer
  ) {
    campaignId
    locale
    fields
    attributes
    codes {
      id
      marketId
    }
    date {
      created
      updated
      fanModified
    }
  }
}
```

**Variables:**
```json
{
  "entry": "{\"firstName\": \"John\", \"lastName\": \"Doe\", \"email\": \"john@example.com\"}",
  "slug": "summer-tour-2025",
  "locale": "en-us",
  "doTransfer": false
}
```

**Auth:** Requires Lambda authorizer (user must be logged in).

---

### Activate LNAA Membership

Activate Live Nation All Access membership for the authenticated fan.

```graphql
mutation ActivateLNAA {
  activateLNAA {
    success
  }
}
```

**Auth:** Requires API Key + Lambda authorizer (user must be logged in).

---

## Subscription Example

### Subscribe to Liveness Status Updates

Real-time updates for liveness verification session status changes.

```graphql
subscription OnLivenessUpdate($id: String!) {
  livenessStatusUpdate(id: $id) {
    id
    status
    vendorId
    vendorSessionId
    date {
      updated
      completed
      approved
      declined
      failed
    }
  }
}
```

**Variables:**
```json
{
  "id": "sess-123"
}
```

**Usage Flow:**
1. Call `checkLiveness` mutation to create session
2. Subscribe to `livenessStatusUpdate` with session ID
3. Send user to vendor verification UI
4. Receive real-time status updates: `pending` → `completed` → `approved`/`declined`

**Auth:** Requires API Key + Lambda authorizer.

---

## Error Handling

### GraphQL Errors

Standard GraphQL error format:

```json
{
  "errors": [
    {
      "message": "User not logged in",
      "errorType": "401",
      "data": {},
      "errorInfo": {
        "code": "NOT_LOGGED_IN"
      }
    }
  ],
  "data": null
}
```

### Common Error Codes

| Code | Type | Description |
|------|------|-------------|
| 400 | Bad Request | Invalid query parameters |
| 401 | Unauthorized | User not logged in or invalid token |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

### Mutation Response Errors

Mutations like `demandRecordSave` return errors in the response body:

```json
{
  "data": {
    "demandRecordSave": {
      "status": "FAILED",
      "error": {
        "code": "404",
        "message": "Not Found"
      }
    }
  }
}
```

**Status Values:**
- `SAVED`: Operation succeeded
- `DELETED`: Operation succeeded (for delete)
- `FAILED`: Operation failed (check `error` field)

---

## Rate Limits

AppSync enforces rate limits per authentication method:

| Auth Type | Default Limit |
|-----------|---------------|
| API Key | 1000 requests/second |
| IAM | 2000 requests/second |
| Lambda Authorizer | 1000 requests/second |

Rate limit headers are not included in responses. Monitor CloudWatch metrics for throttling.

---

## Best Practices

### 1. Use Specific Fields

Request only the fields you need to reduce response size and improve performance:

```graphql
# Good
query {
  api {
    accountFanscore(globalUserId: "123") {
      score
      isBot
    }
  }
}

# Avoid requesting unnecessary fields
```

### 2. Handle Null Values

GraphQL fields can return `null`. Always check for null values:

```javascript
const score = data?.api?.accountFanscore?.score;
if (score !== null && score !== undefined) {
  // Use score
}
```

### 3. Use Variables

Always use variables instead of inline values in queries:

```graphql
# Good
query GetScore($userId: ID!) {
  api {
    accountFanscore(globalUserId: $userId) {
      score
    }
  }
}

# Avoid inline values
query {
  api {
    accountFanscore(globalUserId: "123") {
      score
    }
  }
}
```

### 4. Implement Retry Logic

Implement exponential backoff for transient errors:

```javascript
async function queryWithRetry(query, variables, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await graphqlClient.query(query, variables);
    } catch (error) {
      if (error.statusCode === 500 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
        continue;
      }
      throw error;
    }
  }
}
```

### 5. Cache Responses

Use AppSync's built-in caching for frequently accessed data:

- Cache TTL: 300 seconds (5 minutes) default
- Per-resolver caching enabled
- Use `x-api-key` header for consistent cache keys

### 6. Monitor Performance

Key CloudWatch metrics to monitor:

- `4XXError`: Client errors (authentication, validation)
- `5XXError`: Server errors (resolver failures)
- `Latency`: Query execution time
- `Throttles`: Rate limit breaches

---

## Testing

### Using GraphQL Playground

AppSync provides a built-in GraphQL IDE:

1. Navigate to AppSync console
2. Select your API
3. Click "Queries" in left sidebar
4. Set authentication type
5. Execute queries interactively

### Using cURL

```bash
# API Key authentication
curl -X POST \
  https://your-api-id.appsync-api.us-east-1.amazonaws.com/graphql \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "query": "query { demand { eventDetails(eventId: \"123\") { name } } }",
    "variables": {}
  }'
```

### Using Postman

1. Create POST request to GraphQL endpoint
2. Set headers:
   - `Content-Type: application/json`
   - `x-api-key: YOUR_API_KEY` (or appropriate auth)
3. Body (raw JSON):
```json
{
  "query": "query GetScore($userId: ID!) { api { accountFanscore(globalUserId: $userId) { score } } }",
  "variables": {
    "userId": "12345"
  }
}
```

---

## Environment-Specific Endpoints

| Environment | API Endpoint |
|-------------|--------------|
| QA1 | `https://{api-id}-tm-nonprod-qa1.appsync-api.us-east-1.amazonaws.com/graphql` |
| QA2 | `https://{api-id}-tm-nonprod-qa2.appsync-api.us-east-1.amazonaws.com/graphql` |
| Dev1 | `https://{api-id}-tm-nonprod-dev1.appsync-api.us-east-1.amazonaws.com/graphql` |
| Preprod1 | `https://{api-id}-tm-nonprod-preprod1.appsync-api.us-east-1.amazonaws.com/graphql` |
| Prod1 | `https://{api-id}-tm-prod-prod1.appsync-api.us-east-1.amazonaws.com/graphql` |

Contact the Verified Fan team for API IDs and keys for each environment.

---

## Support and Resources

### Documentation
- [AWS AppSync Developer Guide](https://docs.aws.amazon.com/appsync/latest/devguide/)
- [GraphQL Specification](https://spec.graphql.org/)

### Repository
- Source: Internal GitLab repository
- Feature tests: `features/scenarios/*.feature`
- Example queries: `features/lib/graphql/queries/*.graphql`

### Contacts
- Team: Verified Fan Engineering
- Slack: #verified-fan-engineering (internal)
