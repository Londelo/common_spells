# API Contracts - monoql

## Overview

MonoQL is a GraphQL API service for campaign management, presale registration, and fan engagement. It provides comprehensive campaign lifecycle management including registration, fanlist uploads, code distribution, wave preparation, and analytics.

**Base Endpoint**: `/graphql`
**GraphQL IDE**: `/graphiql` (when enabled)
**Authentication**: JWT tokens via Ticketmaster Identity

---

## GraphQL Schema

### Root Types

#### Query
Entry point for read operations.

#### Mutation
Entry point for write operations.

#### Campaign Interface
Base interface implemented by `RegistrationCampaign` and `FanlistCampaign`.

---

## Queries

### Authentication & Identity

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `viewer` | `auth: IdentityAuth` | `Viewer` | Get current user context (logged in or anonymous) |
| `identity` | - | `Identity` | Get Ticketmaster Identity environment config |
| `ppc` | - | `Ppc` | Get Privacy and Consent configuration |

### Campaign Queries

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `viewer.campaign` | `domain: String, id: String, locale: String, showAllLocales: Boolean, password: String` | `Campaign` | Get campaign by domain or ID |
| `viewer.campaigns.list` | `limit: Int, skip: Int, sort: String, query: String, type: CampaignType, artistId: ID, version: String` | `[Campaign]` | List campaigns with pagination and filters |
| `viewer.campaigns.categoryIds` | `presaleQueryStartDate: String!, presaleQueryEndDate: String!` | `[ID]` | Get category IDs for presale date range |

### Discovery & Search

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `searchArtists` | `query: String!, limit: Int = 20, skip: Int = 0` | `[DiscoveryArtist]` | Search for artists by name |
| `searchVenues` | `query: String!, limit: Int = 20, skip: Int = 0` | `[DiscoveryVenue]` | Search for venues by name |
| `searchContacts` | `query: String!, limit: Int = 10, skip: Int = 0` | `[JSON]` | Search for contacts |

### Exports & Uploads

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `campaignExportList` | `campaignId: String!, limit: Int, skip: Int, exportType: String` | `[Export]` | List campaign exports |
| `campaignExport` | `campaignId: String!, exportId: String!` | `Export` | Get specific export by ID |
| `campaignScoredList` | `campaignId: String!` | `[Scored]` | List scored fanlist uploads |

### Wave Management

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `wavePrepList` | `campaignId: ID!` | `[WavePrep]` | List wave preparation runs |
| `waveList` | `campaignId: ID` | `[Wave]` | List waves |

### Codes & Metrics

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `codes.count` | `campaignId: ID!, type: String!, status: String` | `CodeCount` | Count available/assigned/reserved codes |
| `metrics.entriesByMarketPreference` | `campaignId: ID!` | `[MarketPreferenceCounts]` | Get entry counts by market preference |
| `metrics.eligibleByMarketPreference` | `campaignId: ID!, includePrevSelected: Boolean, minScore: Float, maxScore: Float` | `[MarketPreferenceCounts]` | Get eligible counts by market preference |
| `metrics.verifiedCountByMarket` | `campaignId: ID!, minScore: Float, maxScore: Float` | `[MarketEligibilityCount]` | Get verified counts by market |
| `metrics.totalSelectedByMarket` | `campaignId: ID!` | `[MarketEligibilityCount]` | Get total selected by market |

### Stats & Promoters

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| `stats` | `campaignId: ID!, marketId: ID, dateId: String, type: StatsType!` | `[Stat]` | Get campaign statistics |
| `promoters` | - | `[Promoter]` | List all promoters |

---

## Mutations

### Authentication

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `authenticate` | `credentials: IdentityAuth, viewerInput: ViewerInput` | `Viewer` | Sign in or sign up user via TM Identity |
| `logout` | - | `Boolean` | Log out current user |

### Campaign Management

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `upsertCampaign` | `campaign: CampaignInput!` | `Campaign` | Create or update campaign |
| `upsertMarket` | `market: MarketInput!` | `Market` | Create or update market |
| `deleteMarket` | `campaignId: String!, marketId: String!, transferMarketId: String` | `JSON` | Delete market (with optional transfer) |
| `cloneMarkets` | `fromCampaignId: String!, toCampaignId: String!` | `[Market]` | Clone markets between campaigns |
| `saveCampaignContacts` | `contacts: [JSON]!, campaignId: ID!` | `[String]` | Save campaign contacts |

### Entry Management

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `upsertViewerEntry` | `entry: JSON!, campaignId: String!, locale: String!` | `Viewer` | Create or update viewer's campaign entry |
| `submitConfirm` | `campaignId: String!, phoneJwt: String!` | `JSON` | Confirm phone number for entry |
| `refreshEntryAttribute` | `campaignId: ID!, attribute: LinkableAttributeType!` | `JSON` | Refresh linked attribute (e.g., credit card) |

### Upload Operations

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `uploadCodes` | `file: Upload!, fileSize: Int!, campaignId: String!, type: String!` | `UploadCodesCount` | Upload presale codes |
| `uploadImage` | `base64: String!, contentType: String!, fileName: String, cacheControl: String` | `Image` | Upload and process image |
| `uploadBlacklist` | `file: Upload!, fileSize: Int!, fileName: String` | `File` | Upload blacklist file |
| `uploadScored` | `file: Upload!, fileSize: Int!, campaignId: String!, campaignName: String!` | `File` | Upload scored fanlist |
| `uploadFanlist` | `file: Upload!, fileSize: Int!, campaignId: String!` | `File` | Upload fanlist |
| `uploadWavePrepFile` | `file: Upload!, fileSize: Int!, campaignId: ID!, dateKey: String!, type: WavePrepFileType!` | `File` | Upload wave prep file (markets/codes) |
| `uploadWave` | `file: Upload, fileSize: Int, fileName: String!, config: WaveConfigInput!` | `JSON` | Upload wave file |

### Wave & Selection Operations

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `triggerWavePrep` | `campaignId: ID!, dateKey: String!, reassign: Boolean, orderByPreference: Boolean, singleMarket: Boolean, randomSelection: Boolean, minScore: Float` | `JSON` | Trigger wave preparation process |
| `triggerSelection` | `campaignId: ID!, marketIds: [ID]!` | `JSON` | Trigger selection process |
| `cancelWave` | `fileName: String!, campaignId: ID` | `JSON` | Cancel scheduled wave |

### Export Operations

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `scheduleExport` | `campaignId: String!, type: String!, dateKey: String` | `Export` | Schedule campaign data export |

### Filter & Tag Operations

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `addTags` | `campaignId: String!, fileRecords: [String]!, targetField: String!, tagName: String!` | `UpdatedCount` | Add tags to entries |
| `flipVerdicts` | `campaignId: String!, tagName: String!, filterType: FilterType!` | `UpdatedCount` | Flip allow/block verdicts |

### Stats Management

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `upsertStat` | `campaignId: ID!, marketId: ID, dateId: String!, type: StatsType!, status: String, meta: JSON, count: JSON` | `Stat` | Create or update statistics |

### Promoter Management

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| `upsertPromoter` | `promoter: PromoterInput!` | `Promoter` | Create or update promoter |
| `deletePromoter` | `promoterId: String!` | `JSON` | Delete promoter |

---

## Core Types

### Campaign Types

```graphql
interface Campaign {
  id: ID
  type: CampaignType
  name: String
  artist: CampaignArtist
  categoryId: ID
  referenceTimezone: String
  date: CampaignDate
  contacts: [JSON]
  identifier: FanIdentifier
  schema: CampaignSchema
  subType: CampaignSubtype
}

type RegistrationCampaign implements Campaign {
  id: ID
  type: CampaignType
  name: String
  tour: CampaignTour
  artist: CampaignArtist
  categoryId: ID
  referenceTimezone: String
  date: CampaignDate
  contacts: [JSON]
  status: String
  domain: CampaignDomain
  trackers: [Tracker]
  style: JSON
  content: CampaignContent
  image: CampaignImages
  preferences: [Field]
  faqs: CampaignPageFAQ
  market(marketId: String!): Market
  markets: [Market]
  currentLocale: Locale
  locales: [Locale]
  entry: CampaignEntry
  eligibility: Eligibility
  eligibileCounts(marketIds: [ID], includePrevSelected: Boolean, minScore: Float, maxScore: Float): EligibleCounts
  login_types: [String]
  slack: CampaignSlackOptions
  options: CampaignOptions
  identifier: FanIdentifier
  schema: CampaignSchema
  subType: CampaignSubtype
}

type FanlistCampaign implements Campaign {
  id: ID
  type: CampaignType
  name: String
  artist: CampaignArtist
  categoryId: ID
  referenceTimezone: String
  date: CampaignDate
  contacts: [JSON]
  eventIds: [ID]
  scoring: FanlistScoring
  uploads: [FanlistUpload]
  exports: [Export]
  identifier: FanIdentifier
  schema: CampaignSchema
  subType: CampaignSubtype
}

type CampaignArtist {
  id: String
  discovery_id: String
  name: String
  image_url: String
  needs_id: Boolean
  fanclubName: String
}

type CampaignDate {
  created: String
  updated: String
  opened: String
  closed: String
  open: String
  close: String
  finish: String
  presaleWindowStart: String
  presaleWindowEnd: String
  generalOnsale: String
  sendEmailReminders: String
  sendReminderEmails: [String]
  triggeredEmailReminders: String
}

type CampaignOptions {
  allowIntlPhones: Boolean
  promptConfirmPhone: Boolean
  showAccessCode: Boolean
  useGenericBranding: Boolean
  requirePassword: Boolean
  passwordValue: String
  queueId: ID
  requirePrecheck: CampaignPrecheckOptions
  hideFaq: Boolean
  isLNAA: Boolean
  gate: CampaignGate
  linkableAttributes: [LinkableAttributeType]
  automatedReminders: Boolean
  waitingRoomDuration: Int
}

type CampaignGate {
  card: CampaignCardGate
  inviteOnly: FanIdentifier
  linkedAccount: CampaignLinkedAccountGate
  campaignId: ID
  linkedCampaign: ID
  idv: IDVTier
}
```

### Viewer & Authentication

```graphql
type Viewer {
  id: String
  isLoggedIn: Boolean
  isAdmin: Boolean
  firstName: String
  lastName: String
  email: String
  zip: String
  auth: ViewerAuth
  phones: [Account]
  phone: String
  currentPhone: CurrentPhone
  doNotSell: Boolean
  campaign(domain: String, id: String, locale: String, showAllLocales: Boolean, password: String): Campaign
  campaigns: Campaigns
}

type ViewerAuth {
  token: String
  isSupreme: Boolean
  expiresAt: Int
  permissions: [CampaignPermissions]
}

type CampaignPermissions {
  campaignId: String
  actions: [String]
}

input IdentityAuth {
  token: String
}
```

### Market Types

```graphql
type Market {
  id: String
  city: String
  state: String
  population: Int
  timezone: String
  point: GeoPoint
  event: MarketEvent
  name: String
  isAddedShow: Boolean
  promoterIds: [String]
}

type MarketEvent {
  id: ID
  ids: [ID]
  name: String
  date: String
  presaleDateTime: String
  ticketer: String
  venue: MarketVenue
  link: String
  sharedCode: String
  splitAllocation: SplitAllocation
}

type GeoPoint {
  latitude: Float
  longitude: Float
}
```

### Content Types

```graphql
type Content {
  meta: JSON
  body(onlyCurrent: Boolean = true): ContentBody
  faqs: [ContentFAQ]
  image: ContentImages
  email: ContentEmail
  share: ContentShare
  phone: ContentPhone
  errors: [ContentError]
}

type CampaignContent {
  localized: [LocalizedContent]
  en_US: Content @deprecated(reason: "Use localized instead")
  en_CA: Content @deprecated(reason: "Use localized instead")
  en_GB: Content @deprecated(reason: "Use localized instead")
  fr_CA: Content @deprecated(reason: "Use localized instead")
  en_MX: Content @deprecated(reason: "Use localized instead")
  es_MX: Content @deprecated(reason: "Use localized instead")
  en_IE: Content @deprecated(reason: "Use localized instead")
}

type LocalizedContent {
  locale: String
  value: Content
}
```

### Export & Upload Types

```graphql
type Export {
  id: String!
  campaignId: String!
  exportType: String
  date: ExportDate!
  status: String!
  count: Int
  requesterUserId: String!
  error: ExportError
  path: String
  dateKey: String
}

type ExportDate {
  created: String!
  started: String
  triggered: String
  pending: String
  finished: String
  failed: String
  expired: String
}

type File {
  url: String!
  name: String
  contentType: String
}

type Scored {
  date: String!
  count: Int
  verifiedCount: Int
  path: String
}
```

### Wave Types

```graphql
type Wave {
  name: String
  status: WaveStatus
  date: WaveDate
  totalLimit: Int
  generateOfferCode: Boolean
  tiedToAccount: Boolean
  singleUse: Boolean
  categoryId: ID
  campaignId: ID
}

type WavePrep {
  date: WavePrepDate
  status: String!
  dateKey: String!
  error: WavePrepError
  path: String
  count: WavePrepCount
}

type WavePrepCount {
  name: String
  eligible: Int
  selected: Int
  waitlisted: Int
  markets: [WavePrepCount]
}

enum WaveStatus {
  scheduled
  triggered
  completed
  processing
  failed
}
```

### Statistics Types

```graphql
type Stat {
  campaignId: ID!
  marketId: ID
  dateId: String!
  date: StatsDate
  type: StatsType!
  meta: JSON
  count: JSON
  errors: [StatsError]
  status: StatsStatus
}

enum StatsType {
  filterList
  selection
}

enum StatsStatus {
  PENDING
  PROCESSING
  FINISHED
  FAILED
}
```

### Promoter Types

```graphql
type Promoter {
  id: String
  name: String
  privacyUrls: [LocalizedUrl]
  date: PromoterDate
}

type LocalizedUrl {
  locale: String
  url: String
  is_default: Boolean
}
```

---

## Enums

### Campaign Enums

```graphql
enum CampaignType {
  registration
  fanlist
}

enum CampaignSubtype {
  fanclub
}

enum FanIdentifier {
  memberId
  globalUserId
  email
}

enum CampaignCardGate {
  VISA
  AMEX
  DISCOVER
  MASTERCARD
  CAPITALONE
  CITI
  CHASE
  BARCLAYS
  BOFA
}

enum CampaignLinkedAccountGate {
  VERIZON
  CITI
}

enum LinkableAttributeType {
  card_citi
  card_amex
  card_capitalone
}
```

### Scoring & Selection Enums

```graphql
enum FanlistScoring {
  raw
  xnum
}

enum FilterType {
  allow
  block
}

enum SplitAllocationType {
  concurrent
  sequential
}

enum IDVTier {
  asu
}
```

### File & Wave Enums

```graphql
enum WavePrepFileType {
  markets
  tmCodes
  nonTmCodes
}
```

---

## Scalars

```graphql
scalar JSON
scalar Upload
```

- **JSON**: Custom scalar for arbitrary JSON data
- **Upload**: File upload scalar for multipart form data
