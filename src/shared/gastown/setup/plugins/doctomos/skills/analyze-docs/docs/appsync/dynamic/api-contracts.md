# API Contracts - appsync

## Overview

The Verified Fan AppSync GraphQL API is an AWS AppSync service that provides fan verification, identity scoring, event demand tracking, and liveness verification functionality. The API uses GraphQL with multiple authentication methods (AWS IAM, API Key, Lambda authorizer).

---

## Authentication Types

The API supports three authentication methods:

| Method | Usage | Directives |
|--------|-------|------------|
| AWS IAM | Primary authentication | Default for all fields |
| API Key | Public access (demand tracking) | `@aws_api_key` |
| Lambda Authorizer | Custom token-based auth | `@aws_lambda` |

Fields marked with `@aws_api_key` and `@aws_lambda` support multiple auth methods.

---

## GraphQL Schema

### Root Types

#### Query

| Query Field | Type | Auth | Description |
|-------------|------|------|-------------|
| `api` | `VFApi` | IAM/Lambda | Verified Fan API operations (fanscore, campaigns, verification) |
| `phone` | `Phone` | IAM/Lambda | Phone number information and scoring |
| `demand` | `Demand` | API Key/Lambda | Event demand and registration tracking |
| `fan` | `Fan` | Lambda | Current authenticated fan information |

#### Mutation

| Mutation | Arguments | Returns | Auth | Description |
|----------|-----------|---------|------|-------------|
| `demandRecordSave` | `options: DemandRecordInput` | `DemandRecordChangeResponse` | API Key/Lambda | Save demand record for an event sale |
| `demandRecordDelete` | `options: DemandRecordInput` | `DemandRecordChangeResponse` | API Key/Lambda | Delete demand record |
| `livenessStatus` | `vendorId: String!`, `payload: String!`, `signature: String` | `LivenessSession` | API Key/Lambda | Update liveness verification status (webhook) |
| `checkLiveness` | `options: LivenessOptions` | `CheckLivenessResult` | API Key/Lambda | Check if liveness verification required |
| `upsertEntry` | `entry: AWSJSON!`, `slug: String!`, `locale: String!`, `doTransfer: Boolean` | `EntryRecord` | Lambda | Create/update registration entry |
| `activateLNAA` | (none) | `ActivateLNAAResponse` | API Key/Lambda | Activate LNAA membership |

#### Subscription

| Subscription | Arguments | Triggers | Auth | Description |
|--------------|-----------|----------|------|-------------|
| `livenessStatusUpdate` | `id: String!` | `livenessStatus` mutation | API Key/Lambda | Real-time liveness status updates |

---

## Types

### VFApi (Verified Fan API)

Top-level object for fan verification and scoring operations.

#### Fields

| Field | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `accountFanscore` | `globalUserId: ID`, `memberId: ID`, `eventId: ID`, `market: String` | `AccountFanscore` | Get fan trust score for account |
| `campaigns` | `eventId: String!` | `[Campaign]` | List campaigns for event |
| `verificationStatus` | `campaignId: ID!`, `memberId: ID`, `globalUserId: ID`, `email: AWSEmail` | `VerificationStatus` | Check verification status for campaign |
| `cluster` | `globalUserId: ID!` | `Cluster` | Get identity cluster information |

### AccountFanscore

Fan trust score with fraud indicators.

```graphql
type AccountFanscore {
  globalUserId: ID
  memberId: ID
  score: Float             # Normalized score (0-1)
  rawScore: Float          # Raw score before normalization
  armScore: Int            # ARM model score
  email: String
  version: String          # Score model version
  isBot: Boolean           # Bot detection flag
  tags: [ScoreTags]        # Model testing tags
}
```

### VerificationStatus

Campaign verification status for a fan.

```graphql
type VerificationStatus {
  memberId: ID
  globalUserId: ID
  campaignId: ID
  localFanscore: Float @deprecated  # Use `score` instead
  score: Float                      # Campaign-specific score
  rawScore: Float
  armScore: Int
  isVerified: Boolean               # Verification status
  verdict: Boolean                  # Final verification decision
  events: [VerifiedEvents]          # Verified event history
}
```

### Campaign

Event campaign configuration.

```graphql
type Campaign {
  id: ID
  type: CampaignType              # registration | fanlist
  name: String
  date: CampaignDate
  categoryId: ID
  slug: String
  identifier: FanIdentifier!      # memberId | globalUserId | email
}
```

### Cluster

Identity cluster for fraud detection.

```graphql
type Cluster {
  id: ID!
  globalUserId: ID!
  type: ClusterType               # exact | inferred
  size: Int                       # Number of related identities
  refreshDate: String!            # Last update timestamp
}
```

---

## Demand Types

Event demand tracking and notification signup.

### Demand

```graphql
type Demand {
  eventDetails(eventId: ID!): DemandEvent
  fan: DemandFan
}
```

### DemandEvent

Event details with sales information.

```graphql
type DemandEvent {
  id: ID
  name: String
  startDateTime: AWSDateTime
  venue: TMVenue
  isSuppressed: Boolean           # Event visibility flag
  sales: [DemandEventSale]
  marketEventId: String
}
```

### TMVenue

Ticketmaster venue information.

```graphql
type TMVenue {
  id: ID
  name: String
  timezone: String
  city: String
  state: String
  country: String
  countryCode: String
}
```

### DemandRecord

User demand signup record.

```graphql
type DemandRecord {
  eventId: ID
  saleId: ID
  artistId: ID
  eventName: String
  saleName: String
  artistName: String
  contactMethod: ContactMethod     # sms | email
  requestedDateTime: AWSDateTime
  notifiedDateTime: AWSDateTime    # When notification was sent
}
```

### Input Types

#### DemandRecordInput

```graphql
input DemandRecordInput {
  eventId: ID!
  saleId: ID!
  locale: String
}
```

---

## Liveness Verification Types

Identity verification via selfie/document check.

### LivenessOptions

```graphql
input LivenessOptions {
  appId: String!
  subjectId: String!
  tier: LivenessTier!              # always | high | medium | low | asu
  verificationType: VerificationType  # selfie | selfieAndGovID
}
```

### CheckLivenessResult

Response from liveness check request.

```graphql
type CheckLivenessResult {
  decision: LivenessDecision       # Decision if successful
  error: CheckLivenessError        # Error if failed (union type)
}
```

### LivenessDecision

```graphql
type LivenessDecision {
  requiresVerification: Boolean!   # Whether verification is needed
  session: LivenessSession         # Session details if verification required
  token: String                    # Authorization token for verification
}
```

### LivenessSession

Active verification session.

```graphql
type LivenessSession {
  id: ID!
  vendorId: String!
  vendorSessionId: ID!
  verificationType: VerificationType
  status: LivenessSessionStatus!   # created | pending | completed | approved | declined | failed | expired | needs_review
  date: LivenessStatusDate!
  token: String
}
```

### LivenessSessionStatus

```graphql
enum LivenessSessionStatus {
  created
  pending
  completed
  expired
  failed
  needs_review
  approved
  declined
}
```

### LivenessStatusDate

Timestamps for session lifecycle.

```graphql
type LivenessStatusDate {
  created: AWSDateTime
  updated: AWSDateTime!
  expiresAt: AWSDateTime
  pending: AWSDateTime
  completed: AWSDateTime
  expired: AWSDateTime
  failed: AWSDateTime
  needs_review: AWSDateTime
  approved: AWSDateTime
  declined: AWSDateTime
}
```

### Error Types

```graphql
# Union type for different error scenarios
union CheckLivenessError =
  LivenessCheckFailedError
  | VendorRequestFailedError
  | UnauthorizedError

interface LivenessError {
  message: String!
}

type LivenessCheckFailedError implements LivenessError {
  message: String!
  sessionId: ID
  expiresAt: AWSDateTime
}

type VendorRequestFailedError implements LivenessError {
  message: String!
}

type UnauthorizedError {
  message: String!
}
```

---

## Registration Types

Campaign registration entries.

### EntryRecord

User registration entry for a campaign.

```graphql
type EntryRecord {
  campaignId: ID
  date: EntryRecordDate
  locale: String
  fields: AWSJSON              # Form field data (JSON)
  attributes: AWSJSON          # Custom attributes (JSON)
  codes: [EntryCode]           # Generated entry codes
}
```

### EntryCode

Access code generated for entry.

```graphql
type EntryCode {
  id: ID
  marketId: ID
}
```

### EntryRecordDate

```graphql
type EntryRecordDate {
  created: AWSDateTime
  updated: AWSDateTime
  fanModified: AWSDateTime     # Last user modification
}
```

---

## Phone Identity Types

Phone number validation and risk scoring.

### Phone

```graphql
type Phone {
  info(phoneNumber: String!, globalUserId: ID): PhoneInfo
  score(phoneNumber: String!, globalUserId: ID): PhoneScore
}
```

### PhoneInfo

Phone number metadata.

```graphql
type PhoneInfo {
  phoneNumber: String
  phoneType: PhoneType         # MOBILE | FIXED_LINE | VOIP | etc.
  carrier: String
  location: PhoneLocation
  dateUpdated: AWSDateTime
}
```

### PhoneScore

Phone risk assessment.

```graphql
type PhoneScore {
  phoneNumber: String
  phoneType: PhoneType
  carrier: String
  location: PhoneLocation
  risk: PhoneRisk
  dateUpdated: AWSDateTime
}
```

### PhoneRisk

```graphql
type PhoneRisk {
  level: String                # Risk level description
  recommendation: RiskRecommendation  # allow | flag | block
  score: Int                   # Risk score (0-100)
}
```

### PhoneType

```graphql
enum PhoneType {
  FIXED_LINE
  MOBILE
  VOIP
  INVALID
  PAGER
  RESTRICTED_PREMIUM
  PREPAID
  TOLL_FREE
  PAYPHONE
  PERSONAL
  VOICEMAIL
  OTHER
  BLOCK_LIST
}
```

---

## Fan Type

Current authenticated fan context.

```graphql
type Fan {
  email: String
  firstName: String
  lastName: String
  isLoggedIn: Boolean
  isLNAAMember: Boolean        # Live Nation All Access member
  location: FanLocation
  entryRecord(campaignId: ID!): EntryRecord
  livenessSession(sessionId: ID!): LivenessSession
}
```

---

## Common Enums

### CampaignType
```graphql
enum CampaignType {
  registration
  fanlist
}
```

### FanIdentifier
```graphql
enum FanIdentifier {
  memberId       # Legacy TM member ID
  globalUserId   # Global user ID
  email          # Email address
}
```

### ContactMethod
```graphql
enum ContactMethod {
  sms
  email
}
```

### ClusterType
```graphql
enum ClusterType {
  exact          # Exact identity match
  inferred       # Inferred relationship
}
```

### RiskRecommendation
```graphql
enum RiskRecommendation {
  allow
  flag
  block
}
```

### LivenessTier
```graphql
enum LivenessTier {
  always         # Always require verification
  high           # High risk threshold
  medium         # Medium risk threshold
  low            # Low risk threshold
  asu            # ASU (Arizona State University) specific tier
}
```

### VerificationType
```graphql
enum VerificationType {
  selfie
  selfieAndGovID
}
```

---

## AWS Scalar Types

Custom scalar types provided by AWS AppSync:

- `AWSDateTime` - ISO 8601 datetime string
- `AWSDate` - ISO 8601 date string (YYYY-MM-DD)
- `AWSTime` - ISO 8601 time string (HH:mm:ss.SSS)
- `AWSTimestamp` - Unix epoch timestamp (seconds)
- `AWSEmail` - Email address validation
- `AWSJSON` - JSON object as string
- `AWSURL` - URL validation
- `AWSPhone` - Phone number validation
- `AWSIPAddress` - IP address validation

---

## Data Sources

The API connects to multiple backend data sources:

| Type | Purpose |
|------|---------|
| DynamoDB | `account_fanscore`, `fan_identity`, `verification`, `demand`, `fan_artists` tables |
| Lambda | Proxy services for external integrations |
| HTTP | Campaign service, TM account service |
| NONE | Pure computation resolvers |
