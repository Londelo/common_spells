# API Contracts - reg-ui

## Overview

This repository exposes both **GraphQL** and **REST** APIs. The GraphQL API is the primary interface for campaign management and user registration, while REST endpoints provide supporting services like health checks, metrics, and logging.

---

## GraphQL API

The application uses AWS AppSync as the GraphQL backend with authentication via API key and SOTC (Session of the Customer) token.

### Schema Location
- **Production Schema**: `/graphql/schema.graphql`
- **Mock Schema**: `/graphql/mockSchema.graphql` (local development)
- **Operations**: `/graphql/operations/*.gql`

### Authentication
- **Header**: `Authorization: ${APPSYNC_API_KEY}:${sotc}`
- **Cookie**: `SOTC` cookie value required for authenticated operations
- **Type**: API Key + Session Token (SOTC)

### Queries

| Query | Arguments | Returns | Description | Auth Required |
|-------|-----------|---------|-------------|---------------|
| `viewer` | - | `Viewer` | Access campaign viewer operations | No |
| `fan` | - | `Fan` | Get authenticated fan information | Yes |
| `entries` | - | `[EntryRecord]` | List all entry records | No |
| `entry` | `id: ID!` | `EntryRecord` | Get specific entry record by ID | No |
| `readSotc` | - | `SOTC` | Read current SOTC token | No |
| `readCachedCampaign` | `slug: String` | `JSON` | Retrieve cached campaign data | No |
| `api` | - | `VFApi` | Access Verified Fan API operations | No |
| `demand` | - | `Demand` | Access demand/notification operations | No |
| `phone` | - | `Phone` | Access phone verification operations | No |

### Nested Query Operations

#### Viewer
```graphql
viewer {
  campaign(
    domain: String
    id: String
    locale: String
    password: String
    showAllLocales: Boolean
  ): RegistrationCampaign
}
```

#### Fan (Authenticated)
```graphql
fan {
  email: String
  firstName: String
  lastName: String
  isLoggedIn: Boolean
  isLNAAMember: Boolean
  location { latitude, longitude }
  entryRecord(campaignId: ID!): EntryRecord
  livenessSession(sessionId: ID!): LivenessSession
}
```

#### VFApi (Verified Fan API)
```graphql
api {
  accountFanscore(
    eventId: ID
    globalUserId: ID
    market: String
    memberId: ID
  ): AccountFanscore

  campaigns(eventId: String!): [Campaign]

  cluster(globalUserId: ID!): Cluster

  verificationStatus(
    campaignId: ID!
    email: AWSEmail
    globalUserId: ID
    memberId: ID
  ): VerificationStatus
}
```

#### Demand
```graphql
demand {
  eventDetails(eventId: ID!): DemandEvent
  fan {
    demandRecords(eventId: ID, saleId: ID, saleName: String): [DemandRecord]
    isLoggedIn: Boolean
  }
}
```

#### Phone
```graphql
phone {
  info(globalUserId: ID, phoneNumber: String!): PhoneInfo
  score(globalUserId: ID, phoneNumber: String!): PhoneScore
}
```

### Mutations

| Mutation | Arguments | Returns | Description | Auth Required |
|----------|-----------|---------|-------------|---------------|
| `upsertEntry` | `slug: String!`, `locale: String!`, `entry: AWSJSON!`, `doTransfer: Boolean` | `EntryRecord` | Create or update campaign entry | Yes |
| `deleteEntry` | `id: ID!` | `EntryRecord` | Delete entry record | Yes |
| `activateLNAA` | - | `ActivateLNAAResponse` | Activate Live Nation Audience Alliance membership | Yes |
| `updateCachedCampaign` | `fileName: String` | `JSON` | Update cached campaign (dev/mock only) | No |
| `updateCachedPromoters` | `fileName: String` | `JSON` | Update cached promoters (dev/mock only) | No |
| `checkLiveness` | `options: LivenessOptions` | `CheckLivenessResult` | Initiate liveness verification check | Yes |
| `livenessStatus` | `payload: String!`, `signature: String`, `vendorId: String!` | `LivenessSession` | Update liveness session status | No |
| `demandRecordSave` | `options: DemandRecordInput` | `DemandRecordChangeResponse` | Save demand/notification record | Yes |
| `demandRecordDelete` | `options: DemandRecordInput` | `DemandRecordChangeResponse` | Delete demand/notification record | Yes |

### Subscriptions

| Subscription | Arguments | Description |
|--------------|-----------|-------------|
| `livenessStatusUpdate` | `id: String!` | Subscribe to liveness session status updates |

### Key Types

#### Campaign
```graphql
type Campaign {
  id: ID
  identifier: FanIdentifier!
  name: String
  slug: String
  type: CampaignType
  categoryId: ID
  date: CampaignDate
}

enum CampaignType {
  fanlist
  registration
}
```

#### EntryRecord
```graphql
type EntryRecord {
  campaignId: ID
  locale: String
  fields: AWSJSON         # JSON containing markets, opt-ins
  attributes: AWSJSON
  codes: [EntryCode]
  date: EntryRecordDate
}
```

#### Fan
```graphql
type Fan {
  email: String
  firstName: String
  lastName: String
  isLoggedIn: Boolean
  isLNAAMember: Boolean
  location: FanLocation
  entryRecord(campaignId: ID!): EntryRecord
  livenessSession(sessionId: ID!): LivenessSession
}
```

#### VerificationStatus
```graphql
type VerificationStatus {
  campaignId: ID
  globalUserId: ID
  memberId: ID
  isVerified: Boolean
  verdict: Boolean
  score: Float
  rawScore: Float
  armScore: Int
  events: [VerifiedEvents]
}
```

#### LivenessSession
```graphql
type LivenessSession {
  id: ID!
  vendorSessionId: ID!
  vendorId: String!
  status: LivenessSessionStatus!
  verificationType: VerificationType
  token: String
  date: LivenessStatusDate!
}

enum LivenessSessionStatus {
  created
  pending
  completed
  approved
  declined
  failed
  expired
  needs_review
}

enum VerificationType {
  selfie
  selfieAndGovID
}
```

#### DemandRecord
```graphql
type DemandRecord {
  eventId: ID
  eventName: String
  artistId: ID
  artistName: String
  saleId: ID
  saleName: String
  contactMethod: ContactMethod
  requestedDateTime: AWSDateTime
  notifiedDateTime: AWSDateTime
}

enum ContactMethod {
  email
  sms
}
```

#### PhoneScore
```graphql
type PhoneScore {
  phoneNumber: String
  phoneType: PhoneType
  carrier: String
  location: PhoneLocation
  risk: PhoneRisk
  dateUpdated: AWSDateTime
}

type PhoneRisk {
  level: String
  score: Int
  recommendation: RiskRecommendation
}

enum RiskRecommendation {
  allow
  block
  flag
}
```

### Custom Scalars

```graphql
scalar AWSJSON        # JSON string (RFC 8259)
scalar AWSDateTime    # ISO 8601 datetime
scalar AWSEmail       # RFC 822 email address
scalar JSON           # Generic JSON type
```

### AWS AppSync Directives

The schema includes AWS AppSync authorization directives:

- `@aws_api_key` - API key authorization
- `@aws_cognito_user_pools` - Cognito user pool authorization
- `@aws_iam` - IAM/SigV4 authorization
- `@aws_lambda` - Lambda authorizer
- `@aws_oidc` - OIDC token authorization
- `@aws_subscribe` - Subscription triggers

---

## REST API Endpoints

### Health & Monitoring

| Method | Path | Purpose | Auth | Response Type |
|--------|------|---------|------|---------------|
| GET | `/heartbeat` | Health check endpoint | None | JSON |
| GET | `/metrics` | Prometheus metrics | None | Text (Prometheus format) |

**Heartbeat Response:**
```json
{
  "status": "OK"
}
```

**Metrics Response:**
- Format: Prometheus text-based exposition format
- Includes: Node.js default metrics (memory, CPU, event loop, etc.)

### Logging

| Method | Path | Purpose | Auth | Request Type | Response Type |
|--------|------|---------|------|--------------|---------------|
| POST | `/api/log` | Client-side log aggregation | None | JSON | JSON (empty) |

**Request Schema:**
```typescript
{
  context: string;        // Max 50 chars, e.g., "components:MyComponent:function"
  level: "info" | "warn" | "error";
  description: string;
  fields?: Record<string, any>;  // Optional metadata
}
```

**Response:**
- 200: Empty body (success)
- 400: Validation error
- 500: Internal server error

### Images

| Method | Path | Purpose | Auth | Response Type |
|--------|------|---------|------|---------------|
| GET | `/api/og` | Generate Open Graph image | None | PNG Image |

**Response:**
- Generates 1200x630px PNG with Ticketmaster logo
- Used for social media previews

### GraphQL Proxy

| Method | Path | Purpose | Auth | Request Type | Response Type |
|--------|------|---------|------|--------------|---------------|
| GET | `/graphql` | GraphQL proxy to AppSync | SOTC Cookie | JSON | JSON |
| POST | `/graphql` | GraphQL proxy to AppSync | SOTC Cookie | JSON | JSON |

**Request:**
```json
{
  "query": "query { ... }",
  "variables": { ... }
}
```

**Authentication:**
- Cookie: `SOTC` (Session of the Customer token)
- Header: `Authorization: ${APPSYNC_API_KEY}:${sotc}`

**Behavior:**
- Production: Proxies to AWS AppSync
- Mock mode (`SHOULD_MOCK=true`): Redirects to `/api/graphql`

### Mock GraphQL Server (Development Only)

| Method | Path | Purpose | Auth | Response Type |
|--------|------|---------|------|---------------|
| GET | `/api/graphql` | Apollo Server mock endpoint | Cookie | JSON |
| POST | `/api/graphql` | Apollo Server mock endpoint | Cookie | JSON |

**Availability:**
- Only available in non-Fastly environments (local, dev)
- Returns 404 in higher environments

**Features:**
- Apollo Server with GraphQL Playground
- In-memory data store
- CORS enabled for Apollo Sandbox

---

## Input Types

### DemandRecordInput
```graphql
input DemandRecordInput {
  eventId: ID!
  saleId: ID!
  locale: String
}
```

### LivenessOptions
```graphql
input LivenessOptions {
  appId: String!
  subjectId: String!
  tier: LivenessTier!
  verificationType: VerificationType
}

enum LivenessTier {
  always
  high
  medium
  low
  asu
}
```

---

## Error Types

### GraphQL Errors

#### UnauthorizedError
```graphql
type UnauthorizedError {
  message: String!
}
```

#### LivenessCheckFailedError
```graphql
type LivenessCheckFailedError implements LivenessError {
  message: String!
  sessionId: ID
  expiresAt: AWSDateTime
}
```

#### VendorRequestFailedError
```graphql
type VendorRequestFailedError implements LivenessError {
  message: String!
}
```

### REST Error Responses

**Validation Error (400):**
```json
{
  "error": "Invalid request body",
  "details": [
    {
      "path": ["field"],
      "message": "error message"
    }
  ]
}
```

**Internal Error (500):**
```json
{
  "error": "Internal server error"
}
```
