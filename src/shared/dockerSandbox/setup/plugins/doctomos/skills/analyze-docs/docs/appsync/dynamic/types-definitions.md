# Type Definitions - appsync

## GraphQL Types

### Query Types (Top-Level)

#### Query
**Category:** Root Query Type

```graphql
type Query {
  api: VFApi
  phone: Phone
  demand: Demand @aws_api_key @aws_lambda
  fan: Fan @aws_lambda
}
```

**Entry Points:**
- `api` - Verified Fan API operations (fanscore, campaigns, verification)
- `phone` - Phone number info and scoring
- `demand` - Event demand tracking and fan records
- `fan` - Fan profile and identity operations

---

### VFApi (Verified Fan API)

#### VFApi
**Category:** Output Type

```graphql
type VFApi {
  accountFanscore(globalUserId: ID, memberId: ID, eventId: ID, market: String): AccountFanscore
  campaigns(eventId: String!): [Campaign]
  verificationStatus(campaignId: ID!, memberId: ID, globalUserId: ID, email: AWSEmail): VerificationStatus
  cluster(globalUserId: ID!): Cluster
}
```

**Query Fields:**
- `accountFanscore` - Retrieve fan score for account (identity lookup, bot detection, event boost)
- `campaigns` - Lookup campaigns by event ID
- `verificationStatus` - Check if fan is verified for campaign
- `cluster` - Get fan cluster information (exact vs inferred)

**Referenced Types:**
- [AccountFanscore](#accountfanscore)
- [Campaign](#campaign)
- [VerificationStatus](#verificationstatus)
- [Cluster](#cluster)

---

#### AccountFanscore
**Category:** Output Type

```graphql
type AccountFanscore {
  globalUserId: ID
  memberId: ID
  score: Float
  rawScore: Float
  armScore: Int
  email: String
  version: String
  isBot: Boolean
  tags: [ScoreTags]
}
```

**Returned By:**
- `VFApi.accountFanscore` query

**Pipeline Functions:**
- `getAccountFanscoreGlobalUserId` - Lookup user identity
- `getAccountFanscoreMemberId` - Fetch fanscore from DynamoDB
- `randomizeScore` - Apply randomization
- `getDiscoEventId` - Resolve event mapping
- `addEventScoreBoost` - Apply event-specific boost
- `getBotOrNotCursor` - Setup bot detection
- `getBotOrNot` - Fetch bot score
- `addScoreModelBoost` - Apply model boost (PAS testing)

**Field Details:**
- `score` - Final adjusted fanscore (0.0-1.0)
- `rawScore` - Score before ARM adjustment
- `armScore` - Account Risk Model score (0-10+, higher = riskier)
- `isBot` - Bot detection flag from BotOrNot service
- `tags` - Pipeline tags (e.g., `pas_model_testing`)

**References:**
- [ScoreTags](#scoretags) (enum)

---

#### VerificationStatus
**Category:** Output Type

```graphql
type VerificationStatus {
  memberId: ID
  globalUserId: ID
  campaignId: ID
  localFanscore: Float @deprecated(reason: "`localFanscore` is deprecated. Use `score` instead.")
  score: Float
  rawScore: Float
  armScore: Int
  isVerified: Boolean
  verdict: Boolean
  events: [VerifiedEvents]
}
```

**Returned By:**
- `VFApi.verificationStatus` query

**Field Details:**
- `isVerified` - Whether fan is verified for this campaign
- `verdict` - Verification decision (true = verified, false = not verified)
- `score` - Current fanscore for this verification
- `events` - List of events fan is verified for with rank

**References:**
- [VerifiedEvents](#verifiedevents)

**Deprecated Fields:**
- `localFanscore` - Use `score` instead

---

#### VerifiedEvents
**Category:** Nested Output Type

```graphql
type VerifiedEvents {
  id: ID
  rank: Int
}
```

**Referenced By:**
- [VerificationStatus](#verificationstatus) (field: `events`)

**Field Details:**
- `id` - Event ID
- `rank` - Fan's rank/position for this event

---

#### Campaign
**Category:** Output Type

```graphql
type Campaign {
  id: ID
  type: CampaignType
  name: String
  date: CampaignDate
  categoryId: ID
  slug: String
  identifier: FanIdentifier!
}
```

**Returned By:**
- `VFApi.campaigns` query

**References:**
- [CampaignType](#campaigntype) (enum)
- [CampaignDate](#campaigndate) (nested type)
- [FanIdentifier](#fanidentifier) (enum)

---

#### CampaignDate
**Category:** Nested Output Type

```graphql
type CampaignDate {
  created: AWSDateTime
  presaleWindowStart: AWSDateTime
}
```

**Referenced By:**
- [Campaign](#campaign) (field: `date`)

**Field Details:**
- `created` - Campaign creation timestamp
- `presaleWindowStart` - When presale window opens

---

#### Cluster
**Category:** Output Type

```graphql
type Cluster {
  id: ID!
  globalUserId: ID!
  type: ClusterType
  size: Int
  refreshDate: String!
}
```

**Returned By:**
- `VFApi.cluster` query

**References:**
- [ClusterType](#clustertype) (enum)

**Field Details:**
- `type` - Whether cluster is exact match or inferred
- `size` - Number of accounts in cluster
- `refreshDate` - Last cluster recalculation date

---

### Phone Operations

#### Phone
**Category:** Output Type

```graphql
type Phone {
  info(phoneNumber: String!, globalUserId: ID): PhoneInfo
  score(phoneNumber: String!, globalUserId: ID): PhoneScore
}
```

**Query Fields:**
- `info` - Basic phone number information (type, carrier, location)
- `score` - Phone risk scoring with recommendation

**Referenced Types:**
- [PhoneInfo](#phoneinfo)
- [PhoneScore](#phonescore)

---

#### PhoneInfo
**Category:** Output Type

```graphql
type PhoneInfo {
  phoneNumber: String
  phoneType: PhoneType
  carrier: String
  location: PhoneLocation
  dateUpdated: AWSDateTime
}
```

**Returned By:**
- `Phone.info` query

**References:**
- [PhoneType](#phonetype) (enum)
- [PhoneLocation](#phonelocation)

---

#### PhoneScore
**Category:** Output Type

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

**Returned By:**
- `Phone.score` query

**References:**
- [PhoneType](#phonetype) (enum)
- [PhoneLocation](#phonelocation)
- [PhoneRisk](#phonerisk)

---

#### PhoneRisk
**Category:** Nested Output Type

```graphql
type PhoneRisk {
  level: String
  recommendation: RiskRecommendation
  score: Int
}
```

**Referenced By:**
- [PhoneScore](#phonescore) (field: `risk`)

**References:**
- [RiskRecommendation](#riskrecommendation) (enum)

**Field Details:**
- `level` - Risk level description (e.g., "high", "medium", "low")
- `recommendation` - Action recommendation (allow/flag/block)
- `score` - Numeric risk score

---

#### PhoneLocation
**Category:** Nested Output Type

```graphql
type PhoneLocation {
  city: String
  state: String
  zip: String
  metro_code: String
  county: String
  country: Country
  coordinates: Coordinates
}
```

**Referenced By:**
- [PhoneInfo](#phoneinfo) (field: `location`)
- [PhoneScore](#phonescore) (field: `location`)

**References:**
- [Country](#country)
- [Coordinates](#coordinates)

---

#### Country
**Category:** Nested Output Type

```graphql
type Country {
  iso2: String
  iso3: String
  name: String
}
```

**Referenced By:**
- [PhoneLocation](#phonelocation) (field: `country`)

---

#### Coordinates
**Category:** Nested Output Type

```graphql
type Coordinates {
  latitude: Float
  longitude: Float
}
```

**Referenced By:**
- [PhoneLocation](#phonelocation) (field: `coordinates`)

---

### Demand Operations

#### Demand
**Category:** Output Type

```graphql
type Demand @aws_api_key @aws_lambda {
  eventDetails(eventId: ID!): DemandEvent
  fan: DemandFan
}
```

**Query Fields:**
- `eventDetails` - Get event details for demand tracking
- `fan` - Fan's demand records

**Referenced Types:**
- [DemandEvent](#demandevent)
- [DemandFan](#demandfan)

---

#### DemandFan
**Category:** Output Type

```graphql
type DemandFan @aws_api_key @aws_lambda {
  isLoggedIn: Boolean
  demandRecords(eventId: ID, saleName: String, saleId: ID): [DemandRecord]
}
```

**Returned By:**
- `Demand.fan` query

**Referenced Types:**
- [DemandRecord](#demandrecord)

---

#### DemandEvent
**Category:** Output Type

```graphql
type DemandEvent @aws_api_key @aws_lambda {
  id: ID
  name: String
  startDateTime: AWSDateTime
  venue: TMVenue
  isSuppressed: Boolean
  sales: [DemandEventSale]
  marketEventId: String
}
```

**Returned By:**
- `Demand.eventDetails` query

**References:**
- [TMVenue](#tmvenue)
- [DemandEventSale](#demandeventsale)

---

#### TMVenue
**Category:** Nested Output Type

```graphql
type TMVenue @aws_api_key @aws_lambda {
  id: ID
  name: String
  timezone: String
  city: String
  state: String
  country: String
  countryCode: String
}
```

**Referenced By:**
- [DemandEvent](#demandevent) (field: `venue`)

---

#### DemandEventSale
**Category:** Nested Output Type

```graphql
type DemandEventSale @aws_api_key @aws_lambda {
  id: ID
  name: String
  saleTypes: [ID]
  startDateTime: AWSDateTime
  endDateTime: AWSDateTime
}
```

**Referenced By:**
- [DemandEvent](#demandevent) (field: `sales`)

---

#### DemandRecord
**Category:** Output Type

```graphql
type DemandRecord @aws_api_key @aws_lambda {
  eventId: ID
  saleId: ID
  artistId: ID
  eventName: String
  saleName: String
  artistName: String
  contactMethod: ContactMethod
  requestedDateTime: AWSDateTime
  notifiedDateTime: AWSDateTime
}
```

**Returned By:**
- `DemandFan.demandRecords` query

**References:**
- [ContactMethod](#contactmethod) (enum)

**Field Details:**
- `contactMethod` - How fan wants to be notified (sms/email)
- `requestedDateTime` - When demand record was created
- `notifiedDateTime` - When fan was notified (if applicable)

---

### Fan Operations

#### Fan
**Category:** Output Type

```graphql
type Fan @aws_lambda {
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

**Query Fields:**
- `email` - Fan email address
- `firstName` - Fan first name
- `lastName` - Fan last name
- `isLoggedIn` - Whether fan is currently logged in
- `isLNAAMember` - Whether fan is Live Nation Artist Alliance member
- `location` - Fan's geographic location
- `entryRecord` - Get entry record for specific campaign
- `livenessSession` - Get liveness verification session

**Referenced Types:**
- [FanLocation](#fanlocation)
- [EntryRecord](#entryrecord)
- [LivenessSession](#livenesssession)

---

#### FanLocation
**Category:** Nested Output Type

```graphql
type FanLocation @aws_lambda {
  longitude: Float
  latitude: Float
}
```

**Referenced By:**
- [Fan](#fan) (field: `location`)

---

#### EntryRecord
**Category:** Output Type

```graphql
type EntryRecord @aws_lambda {
  campaignId: ID
  date: EntryRecordDate
  locale: String
  fields: AWSJSON
  attributes: AWSJSON
  codes: [EntryCode]
}
```

**Returned By:**
- `Fan.entryRecord` query
- `upsertEntry` mutation

**References:**
- [EntryRecordDate](#entryrecorddate)
- [EntryCode](#entrycode)

**Field Details:**
- `fields` - JSON object with campaign-specific entry fields
- `attributes` - JSON object with additional attributes
- `codes` - Entry codes for markets

---

#### EntryRecordDate
**Category:** Nested Output Type

```graphql
type EntryRecordDate @aws_lambda {
  created: AWSDateTime
  updated: AWSDateTime
  fanModified: AWSDateTime
}
```

**Referenced By:**
- [EntryRecord](#entryrecord) (field: `date`)

---

#### EntryCode
**Category:** Nested Output Type

```graphql
type EntryCode @aws_lambda {
  id: ID
  marketId: ID
}
```

**Referenced By:**
- [EntryRecord](#entryrecord) (field: `codes`)

---

### Liveness Verification

#### LivenessSession
**Category:** Output Type

```graphql
type LivenessSession @aws_api_key @aws_lambda {
  id: ID!
  vendorId: String!
  vendorSessionId: ID!
  verificationType: VerificationType
  status: LivenessSessionStatus!
  date: LivenessStatusDate!
  token: String
}
```

**Returned By:**
- `livenessStatus` mutation
- `Fan.livenessSession` query
- [LivenessDecision](#livenessdecision) (field: `session`)

**Subscription:**
- `livenessStatusUpdate` - Subscribe to session status updates

**References:**
- [VerificationType](#verificationtype) (enum)
- [LivenessSessionStatus](#livenesssessionstatus) (enum)
- [LivenessStatusDate](#livenessstatusdate)

**Field Details:**
- `vendorId` - Liveness verification vendor identifier
- `vendorSessionId` - Vendor's internal session ID
- `status` - Current session status (created, pending, completed, etc.)
- `token` - Session token for vendor SDK

---

#### CheckLivenessResult
**Category:** Output Type

```graphql
type CheckLivenessResult @aws_api_key @aws_lambda {
  decision: LivenessDecision
  error: CheckLivenessError
}
```

**Returned By:**
- `checkLiveness` mutation

**References:**
- [LivenessDecision](#livenessdecision)
- [CheckLivenessError](#checklivenesseerror) (union)

---

#### LivenessDecision
**Category:** Output Type

```graphql
type LivenessDecision @aws_api_key @aws_lambda {
  requiresVerification: Boolean!
  session: LivenessSession
  token: String
}
```

**Referenced By:**
- [CheckLivenessResult](#checklivenesresult) (field: `decision`)

**References:**
- [LivenessSession](#livenesssession)

**Field Details:**
- `requiresVerification` - Whether fan needs to complete liveness check
- `session` - Liveness session if verification required
- `token` - Token for liveness SDK

---

#### LivenessStatusDate
**Category:** Nested Output Type

```graphql
type LivenessStatusDate @aws_api_key @aws_lambda {
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

**Referenced By:**
- [LivenessSession](#livenesssession) (field: `date`)

**Field Details:**
- Each field represents timestamp when status was reached
- Tracks full lifecycle of liveness verification session

---

### Liveness Error Types

#### CheckLivenessError
**Category:** Union Type

```graphql
union CheckLivenessError =
  LivenessCheckFailedError
  | VendorRequestFailedError
  | UnauthorizedError
```

**Referenced By:**
- [CheckLivenessResult](#checklivenesresult) (field: `error`)

**Union Members:**
- [LivenessCheckFailedError](#livenesscheckfailederror)
- [VendorRequestFailedError](#vendorrequestfailederror)
- [UnauthorizedError](#unauthorizederror)

---

#### LivenessError
**Category:** Interface

```graphql
interface LivenessError {
  message: String!
}
```

**Implemented By:**
- [LivenessCheckFailedError](#livenesscheckfailederror)
- [VendorRequestFailedError](#vendorrequestfailederror)

---

#### LivenessCheckFailedError
**Category:** Error Type (implements LivenessError)

```graphql
type LivenessCheckFailedError implements LivenessError @aws_api_key @aws_lambda {
  message: String!
  sessionId: ID
  expiresAt: AWSDateTime
}
```

**Implements:** [LivenessError](#livenesserror)

**Union Member Of:** [CheckLivenessError](#checklivenesseerror)

---

#### VendorRequestFailedError
**Category:** Error Type (implements LivenessError)

```graphql
type VendorRequestFailedError implements LivenessError @aws_api_key @aws_lambda {
  message: String!
}
```

**Implements:** [LivenessError](#livenesserror)

**Union Member Of:** [CheckLivenessError](#checklivenesseerror)

---

#### UnauthorizedError
**Category:** Error Type

```graphql
type UnauthorizedError @aws_api_key @aws_lambda {
  message: String!
}
```

**Union Member Of:** [CheckLivenessError](#checklivenesseerror)

---

### Mutation Types

#### Mutation
**Category:** Root Mutation Type

```graphql
type Mutation {
  demandRecordSave(options: DemandRecordInput): DemandRecordChangeResponse @aws_api_key @aws_lambda
  demandRecordDelete(options: DemandRecordInput): DemandRecordChangeResponse @aws_api_key @aws_lambda
  livenessStatus(vendorId: String!, payload: String!, signature: String): LivenessSession @aws_api_key @aws_lambda
  checkLiveness(options: LivenessOptions): CheckLivenessResult @aws_api_key @aws_lambda
  upsertEntry(entry: AWSJSON!, slug: String!, locale: String!, doTransfer: Boolean): EntryRecord @aws_lambda
  activateLNAA: ActivateLNAAResponse @aws_api_key @aws_lambda
}
```

**Mutations:**
- `demandRecordSave` - Create/update demand record
- `demandRecordDelete` - Delete demand record
- `livenessStatus` - Update liveness verification status (webhook from vendor)
- `checkLiveness` - Check if liveness verification required
- `upsertEntry` - Create/update campaign entry record
- `activateLNAA` - Activate Live Nation Artist Alliance membership

**Input Types:**
- [DemandRecordInput](#demandrecordinput)
- [LivenessOptions](#livenessoptions)

**Return Types:**
- [DemandRecordChangeResponse](#demandrecordchangeresponse)
- [LivenessSession](#livenesssession)
- [CheckLivenessResult](#checklivenesresult)
- [EntryRecord](#entryrecord)
- [ActivateLNAAResponse](#activatelnaaresponse)

---

#### DemandRecordChangeResponse
**Category:** Output Type

```graphql
type DemandRecordChangeResponse @aws_api_key @aws_lambda {
  status: RecordChangeStatus!
  error: RecordChangeError
}
```

**Returned By:**
- `demandRecordSave` mutation
- `demandRecordDelete` mutation

**References:**
- [RecordChangeStatus](#recordchangestatus) (enum)
- [RecordChangeError](#recordchangeerror)

---

#### RecordChangeError
**Category:** Nested Output Type

```graphql
type RecordChangeError @aws_api_key @aws_lambda {
  code: ID
  message: String
}
```

**Referenced By:**
- [DemandRecordChangeResponse](#demandrecordchangeresponse) (field: `error`)

---

#### ActivateLNAAResponse
**Category:** Output Type

```graphql
type ActivateLNAAResponse @aws_api_key @aws_lambda {
  success: Boolean!
}
```

**Returned By:**
- `activateLNAA` mutation

---

### Subscription Types

#### Subscription
**Category:** Root Subscription Type

```graphql
type Subscription @aws_api_key @aws_lambda {
  livenessStatusUpdate(id: String!): LivenessSession @aws_subscribe(mutations: ["livenessStatus"])
}
```

**Subscriptions:**
- `livenessStatusUpdate` - Subscribe to liveness session status updates

**Triggered By:**
- `livenessStatus` mutation

**Returns:**
- [LivenessSession](#livenesssession)

---

## Input Types

### DemandRecordInput
**Category:** Input Type

```graphql
input DemandRecordInput {
  eventId: ID!
  saleId: ID!
  locale: String
}
```

**Used By:**
- `demandRecordSave` mutation (argument: `options`)
- `demandRecordDelete` mutation (argument: `options`)

**Field Details:**
- `eventId` - Event to track demand for (required)
- `saleId` - Sale/offer ID for the event (required)
- `locale` - User's locale preference (optional)

---

### LivenessOptions
**Category:** Input Type

```graphql
input LivenessOptions {
  appId: String!
  subjectId: String!
  tier: LivenessTier!
  verificationType: VerificationType
}
```

**Used By:**
- `checkLiveness` mutation (argument: `options`)

**References:**
- [LivenessTier](#livenesstier) (enum)
- [VerificationType](#verificationtype) (enum)

**Field Details:**
- `appId` - Application identifier requesting verification
- `subjectId` - Subject being verified (fan identifier)
- `tier` - Verification tier (always, high, medium, low, asu)
- `verificationType` - Type of verification (selfie or selfieAndGovID)

---

## Enums

### ScoreTags
**Category:** Enum

```graphql
enum ScoreTags {
  pas_model_testing
}
```

**Used As Output By:**
- [AccountFanscore](#accountfanscore) (field: `tags`)

**Purpose:** Indicates which scoring pipeline features are active

---

### ClusterType
**Category:** Enum

```graphql
enum ClusterType {
  exact
  inferred
}
```

**Used As Output By:**
- [Cluster](#cluster) (field: `type`)

**Values:**
- `exact` - Exact match cluster based on verified data
- `inferred` - Inferred cluster based on behavioral/pattern analysis

---

### CampaignType
**Category:** Enum

```graphql
enum CampaignType {
  registration
  fanlist
}
```

**Used As Output By:**
- [Campaign](#campaign) (field: `type`)

**Values:**
- `registration` - Registration campaign (fans register for presale access)
- `fanlist` - Fan list campaign (ongoing fan tracking)

---

### FanIdentifier
**Category:** Enum

```graphql
enum FanIdentifier {
  memberId
  globalUserId
  email
}
```

**Used As Output By:**
- [Campaign](#campaign) (field: `identifier`)

**Purpose:** Indicates which identifier type is required for this campaign

---

### PhoneType
**Category:** Enum

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

**Used As Output By:**
- [PhoneInfo](#phoneinfo) (field: `phoneType`)
- [PhoneScore](#phonescore) (field: `phoneType`)

---

### RiskRecommendation
**Category:** Enum

```graphql
enum RiskRecommendation {
  allow
  flag
  block
}
```

**Used As Output By:**
- [PhoneRisk](#phonerisk) (field: `recommendation`)

**Values:**
- `allow` - Phone is low risk, allow usage
- `flag` - Phone is medium risk, flag for review
- `block` - Phone is high risk, block usage

---

### ContactMethod
**Category:** Enum

```graphql
enum ContactMethod @aws_api_key @aws_lambda {
  sms
  email
}
```

**Used As Output By:**
- [DemandRecord](#demandrecord) (field: `contactMethod`)

**Purpose:** How fan prefers to be contacted about demand/presale notifications

---

### LivenessTier
**Category:** Enum

```graphql
enum LivenessTier {
  always
  high
  medium
  low
  asu
}
```

**Used As Input By:**
- [LivenessOptions](#livenessoptions) (field: `tier`)

**Values:**
- `always` - Always require liveness verification
- `high` - High likelihood verification required
- `medium` - Medium likelihood verification required
- `low` - Low likelihood verification required
- `asu` - ASU (Arizona State University) specific tier

---

### VerificationType
**Category:** Enum

```graphql
enum VerificationType {
  selfie
  selfieAndGovID
}
```

**Used As Input By:**
- [LivenessOptions](#livenessoptions) (field: `verificationType`)

**Used As Output By:**
- [LivenessSession](#livenesssession) (field: `verificationType`)

**Values:**
- `selfie` - Selfie-only verification
- `selfieAndGovID` - Selfie plus government ID verification

---

### LivenessSessionStatus
**Category:** Enum

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

**Used As Output By:**
- [LivenessSession](#livenesssession) (field: `status`)

**Lifecycle:**
1. `created` - Session created, awaiting submission
2. `pending` - Verification submitted, awaiting vendor processing
3. `completed` - Vendor processing complete
4. `needs_review` - Manual review required
5. `approved` - Verification approved
6. `declined` - Verification declined
7. `expired` - Session expired before completion
8. `failed` - Verification failed

---

### RecordChangeStatus
**Category:** Enum

```graphql
enum RecordChangeStatus {
  SAVED
  DELETED
  FAILED
}
```

**Used As Output By:**
- [DemandRecordChangeResponse](#demandrecordchangeresponse) (field: `status`)

---

## AWS Scalar Types

### AWSDateTime
**Category:** Scalar

```graphql
scalar AWSDateTime
```

**Format:** ISO 8601 date-time string (e.g., `2023-12-01T15:30:00.000Z`)

**Used By:** Multiple types for timestamp fields

---

### AWSDate
**Category:** Scalar

```graphql
scalar AWSDate
```

**Format:** ISO 8601 date string (e.g., `2023-12-01`)

---

### AWSTime
**Category:** Scalar

```graphql
scalar AWSTime
```

**Format:** ISO 8601 time string (e.g., `15:30:00.000Z`)

---

### AWSTimestamp
**Category:** Scalar

```graphql
scalar AWSTimestamp
```

**Format:** Unix timestamp (seconds since epoch)

---

### AWSEmail
**Category:** Scalar

```graphql
scalar AWSEmail
```

**Format:** Valid email address string

**Used By:**
- `VFApi.verificationStatus` query (argument: `email`)

---

### AWSJSON
**Category:** Scalar

```graphql
scalar AWSJSON
```

**Format:** Stringified JSON object

**Used By:**
- [EntryRecord](#entryrecord) (fields: `fields`, `attributes`)
- `upsertEntry` mutation (argument: `entry`)

---

### AWSURL
**Category:** Scalar

```graphql
scalar AWSURL
```

**Format:** Valid URL string

---

### AWSPhone
**Category:** Scalar

```graphql
scalar AWSPhone
```

**Format:** Valid phone number string

---

### AWSIPAddress
**Category:** Scalar

```graphql
scalar AWSIPAddress
```

**Format:** Valid IPv4 or IPv6 address

---

## Type Dependency Graph

```
Query (Root)
├─ VFApi
│   ├─ AccountFanscore
│   │   └─ ScoreTags (enum)
│   ├─ Campaign
│   │   ├─ CampaignType (enum)
│   │   ├─ CampaignDate
│   │   └─ FanIdentifier (enum)
│   ├─ VerificationStatus
│   │   └─ VerifiedEvents
│   └─ Cluster
│       └─ ClusterType (enum)
├─ Phone
│   ├─ PhoneInfo
│   │   ├─ PhoneType (enum)
│   │   └─ PhoneLocation
│   │       ├─ Country
│   │       └─ Coordinates
│   └─ PhoneScore
│       ├─ PhoneType (enum)
│       ├─ PhoneLocation [same as above]
│       └─ PhoneRisk
│           └─ RiskRecommendation (enum)
├─ Demand
│   ├─ DemandEvent
│   │   ├─ TMVenue
│   │   └─ DemandEventSale
│   └─ DemandFan
│       └─ DemandRecord
│           └─ ContactMethod (enum)
└─ Fan
    ├─ FanLocation
    ├─ EntryRecord
    │   ├─ EntryRecordDate
    │   └─ EntryCode
    └─ LivenessSession
        ├─ VerificationType (enum)
        ├─ LivenessSessionStatus (enum)
        └─ LivenessStatusDate

Mutation (Root)
├─ demandRecordSave
│   ├─ INPUT: DemandRecordInput
│   └─ OUTPUT: DemandRecordChangeResponse
│       ├─ RecordChangeStatus (enum)
│       └─ RecordChangeError
├─ demandRecordDelete [same input/output as above]
├─ livenessStatus
│   └─ OUTPUT: LivenessSession [see above]
├─ checkLiveness
│   ├─ INPUT: LivenessOptions
│   │   ├─ LivenessTier (enum)
│   │   └─ VerificationType (enum)
│   └─ OUTPUT: CheckLivenessResult
│       ├─ LivenessDecision
│       │   └─ LivenessSession [see above]
│       └─ CheckLivenessError (union)
│           ├─ LivenessCheckFailedError (implements LivenessError)
│           ├─ VendorRequestFailedError (implements LivenessError)
│           └─ UnauthorizedError
├─ upsertEntry
│   └─ OUTPUT: EntryRecord [see above]
└─ activateLNAA
    └─ OUTPUT: ActivateLNAAResponse

Subscription (Root)
└─ livenessStatusUpdate
    └─ OUTPUT: LivenessSession [see above]
```

### Legend
- (enum) - Enumeration type
- INPUT - Used as mutation/query input
- OUTPUT - Returned from queries/mutations
- [see above] - Type defined earlier in graph
- (union) - Union of multiple types
- (implements Interface) - Implements GraphQL interface
