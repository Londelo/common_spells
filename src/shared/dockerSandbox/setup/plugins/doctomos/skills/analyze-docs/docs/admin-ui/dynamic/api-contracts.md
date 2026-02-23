# API Contracts - admin-ui

## Overview

This is a **GraphQL API** for the Titan Admin UI application. The API manages campaigns, markets, venues, artists, fan data, and various administrative operations for Ticketmaster's Verified Fan program.

**API Endpoint**: `http://localhost:9090/graphql` (development)

**GraphQL Schema Version**: Source schema timestamp: Mon Aug 04 2025 15:45:57 GMT-0400

---

## GraphQL Schema

### Root Query Type

The main entry point for read operations.

| Query | Arguments | Returns | Description |
|-------|-----------|---------|-------------|
| identity | - | Identity | Get identity/authentication configuration |
| ppc | - | Ppc | Get PPC (pre-purchase code) information |
| viewer | auth: IdentityAuth | Viewer | Get current viewer/user information and associated campaigns |
| campaignExportList | campaignId: String!, limit: Int, skip: Int, exportType: String | [Export] | List exports for a campaign |
| campaignExport | campaignId: String!, exportId: String! | Export | Get specific export by ID |
| campaignScoredList | campaignId: String! | [Scored] | List scored entries for a campaign |
| wavePrepList | campaignId: ID! | [WavePrep] | List wave preparation batches |
| waveList | campaignId: ID | [Wave] | List waves for a campaign |
| metrics | - | Metrics | Access metrics data (see Metrics type) |
| stats | campaignId: ID!, marketId: ID, dateId: String, type: StatsType! | [Stat] | Get statistics for campaigns/markets |
| searchArtists | query: String!, limit: Int = 20, skip: Int = 0 | [DiscoveryArtist] | Search for artists by name |
| searchContacts | query: String!, limit: Int = 10, skip: Int = 0 | [JSON] | Search contacts |
| searchVenues | query: String!, limit: Int = 20, skip: Int = 0 | [DiscoveryVenue] | Search for venues by name |
| codes | - | Codes | Access codes information |

### Root Mutation Type

The main entry point for write operations.

| Mutation | Arguments | Returns | Description |
|----------|-----------|---------|-------------|
| authenticate | credentials: IdentityAuth, viewerInput: ViewerInput | Viewer | Authenticate user with token |
| logout | - | Boolean | Log out current user |
| upsertCampaign | campaign: CampaignInput! | Campaign | Create or update a campaign |
| upsertMarket | market: MarketInput! | Market | Create or update a market |
| deleteMarket | campaignId: String!, marketId: String!, transferMarketId: String | JSON | Delete a market |
| cloneMarkets | fromCampaignId: String!, toCampaignId: String! | [Market] | Clone markets from one campaign to another |
| saveCampaignContacts | contacts: [JSON]!, campaignId: ID! | [String] | Save contacts for a campaign |
| upsertViewerEntry | entry: JSON!, campaignId: String!, locale: String! | Viewer | Create/update viewer entry |
| submitConfirm | campaignId: String!, phoneJwt: String! | JSON | Confirm phone number submission |
| refreshEntryAttribute | campaignId: ID!, attribute: LinkableAttributeType! | JSON | Refresh linked entry attribute |
| uploadImage | base64: String!, contentType: String!, fileName: String, cacheControl: String | Image | Upload an image (base64 encoded) |
| uploadBlacklist | file: Upload!, fileSize: Int!, fileName: String | File | Upload a blacklist file |
| uploadCodes | file: Upload!, fileSize: Int!, campaignId: String!, type: String! | UploadCodesCount | Upload access codes for a campaign |
| uploadScored | file: Upload!, fileSize: Int!, campaignId: String!, campaignName: String! | File | Upload scored fan data |
| uploadFanlist | file: Upload!, fileSize: Int!, campaignId: String! | File | Upload fanlist data |
| uploadWavePrepFile | file: Upload!, fileSize: Int!, campaignId: ID!, dateKey: String!, type: WavePrepFileType! | File | Upload wave preparation file |
| uploadWave | file: Upload, fileSize: Int, fileName: String!, config: WaveConfigInput! | JSON | Upload wave configuration |
| cancelWave | fileName: String!, campaignId: ID | JSON | Cancel a wave |
| scheduleExport | campaignId: String!, type: String!, dateKey: String | Export | Schedule an export |
| triggerWavePrep | campaignId: ID!, dateKey: String!, reassign: Boolean, orderByPreference: Boolean, singleMarket: Boolean, randomSelection: Boolean, minScore: Float | JSON | Trigger wave preparation process |
| triggerSelection | campaignId: ID!, marketIds: [ID]! | JSON | Trigger selection for markets |
| addTags | campaignId: String!, fileRecords: [String]!, targetField: String!, tagName: String! | UpdatedCount | Add tags to records |
| flipVerdicts | campaignId: String!, tagName: String!, filterType: FilterType! | UpdatedCount | Flip verdicts for tagged records |
| upsertStat | campaignId: ID!, marketId: ID, dateId: String!, type: StatsType!, status: String, meta: JSON, count: JSON | Stat | Create/update a statistic |

---

## Core Types

### Campaign Types

**Campaign Interface** - Base interface for all campaigns

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
```

**RegistrationCampaign** - Campaign for registration flows

```graphql
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
  eligibileCounts(
    marketIds: [ID]
    includePrevSelected: Boolean
    minScore: Float
    maxScore: Float
  ): EligibleCounts
  login_types: [String]
  slack: CampaignSlackOptions
  options: CampaignOptions
  identifier: FanIdentifier
  schema: CampaignSchema
  subType: CampaignSubtype
}
```

**FanlistCampaign** - Campaign for fanlist operations

```graphql
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
```

### Campaign Supporting Types

```graphql
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
  sendReminderEmails: [String]
  triggeredEmailReminders: String
}

type CampaignDomain {
  site: String
  share: String
  preview: String
}

type CampaignImages {
  main: Image
  mobile: Image
  email: Image
  secondary: Image
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
  gate: CampaignGate
  linkableAttributes: [LinkableAttributeType]
  automatedReminders: Boolean
  waitingRoomDuration: Int
  isLNAA: Boolean
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

### Enums

```graphql
enum CampaignType {
  registration
  fanlist
}

enum CampaignSubtype {
  fanclub
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

enum FanIdentifier {
  memberId
  globalUserId
  email
}

enum FanlistScoring {
  raw
  xnum
}

enum LinkableAttributeType {
  card_citi
  card_amex
  card_capitalone
}

enum IDVTier {
  asu
}
```

---

## Market Types

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

type MarketVenue {
  name: String
}

type GeoPoint {
  latitude: Float
  longitude: Float
}

type SplitAllocation {
  link: String
  type: SplitAllocationType
  isActive: Boolean
}

enum SplitAllocationType {
  concurrent
  sequential
}
```

---

## Content & Localization Types

```graphql
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

type ContentBody {
  started: ContentStarted
  finished: ContentFinished
  terms: ContentTerms
  signup: ContentSignup
  faqs: [ContentFAQ]
}

type ContentFAQ {
  id: ID
  question: String
  answer: String
  hash_id: String
  title: String
  questions: [ContentFAQQuestion]
}

type Locale {
  id: String
  is_default: Boolean
}
```

---

## Viewer/User Types

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
  campaign(
    domain: String
    id: String
    locale: String
    showAllLocales: Boolean
    password: String
  ): Campaign
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

type Account {
  account: String
  is_confirmed: Boolean
}

type CurrentPhone {
  masked: String
  country: String
  type: String
}
```

---

## Discovery Types

```graphql
type DiscoveryArtist {
  id: String
  discovery_id: String
  name: String
  image_url: String
  needs_id: Boolean
}

type DiscoveryVenue {
  id: String
  discovery_id: String
  name: String
  image_url: String
  needs_id: Boolean
  locale: String
  city: String
  state: String
  zip: String
  timezone: String
  point: GeoPoint
}
```

---

## Export Types

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

type ExportError {
  message: String
  payload: String
  stack: String
}
```

---

## Wave Types

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

type WaveDate {
  scheduled: String
  notify: String
  begin: String
  end: String
}

enum WaveStatus {
  scheduled
  triggered
  completed
  processing
  failed
}

type WavePrep {
  date: WavePrepDate
  status: String!
  dateKey: String!
  error: WavePrepError
  path: String
  count: WavePrepCount
}

type WavePrepDate {
  started: String
  finished: String
}

enum WavePrepFileType {
  markets
  tmCodes
  nonTmCodes
}
```

---

## Metrics Types

```graphql
type Metrics {
  entriesByMarketPreference(campaignId: ID!): [MarketPreferenceCounts]
  eligibleByMarketPreference(
    campaignId: ID!
    includePrevSelected: Boolean
    minScore: Float
    maxScore: Float
  ): [MarketPreferenceCounts]
  verifiedCountByMarket(
    campaignId: ID!
    minScore: Float
    maxScore: Float
  ): [MarketEligibilityCount]
  totalSelectedByMarket(campaignId: ID!): [MarketEligibilityCount]
}

type MarketPreferenceCounts {
  id: ID
  counts: [Int]
}

type MarketEligibilityCount {
  id: ID
  count: Int
}

type EligibleCounts {
  count: Int
  byMarket: [EligibleCountsByMarket]
}

type EligibleCountsByMarket {
  marketId: ID!
  count: Int
  countsByPreferenceRank: [EligibleCountsByMarketPreferenceRank]
}

type Eligibility {
  isEligible: Boolean!
  reason: ID
}
```

---

## Statistics Types

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

type StatsDate {
  created: String!
  updated: String
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

---

## Utility Types

```graphql
scalar JSON
scalar Upload

type Image {
  url: String
  name: String
  width: Int
  height: Int
  alt_text: String
}

type File {
  url: String!
  name: String
  contentType: String
}

type Field {
  id: String
  type: String
  is_optional: Boolean
  label: FieldLabel
  additional: JSON
}

type Tracker {
  type: String
  id: String
  src: String
  additional: JSON
}

type UpdatedCount {
  count: Int
}

type UploadCodesCount {
  in: Int
  inserted: Int
  updated: Int
}

type CodeCount {
  available: Int
  assigned: Int
  reserved: Int
}

type Codes {
  count(campaignId: ID!, type: String!, status: String): CodeCount
}

enum FilterType {
  allow
  block
}
```

---

## Input Types Summary

All mutation operations accept corresponding Input types. Key input types include:

- `CampaignInput` - For creating/updating campaigns
- `MarketInput` - For creating/updating markets
- `ViewerInput` - For user information
- `IdentityAuth` - For authentication (contains token)
- `CampaignContentInput` - For campaign content with localization
- `WaveConfigInput` - For wave configuration
- Various supporting input types matching their corresponding output types

---

## Authentication

The API uses token-based authentication via the `IdentityAuth` input:

```graphql
input IdentityAuth {
  token: String
}
```

Authentication is managed through:
- `authenticate` mutation - accepts credentials and returns Viewer with auth token
- Cookie-based session management (credentials: 'include' in Apollo config)
- TM Identity version header (`tm-id-version`) for versioning support

---

## Notes

- All dates are represented as ISO 8601 strings
- The `JSON` scalar allows arbitrary JSON objects for flexible data structures
- The `Upload` scalar handles file uploads via multipart requests
- Deprecated fields (marked with `@deprecated`) should not be used; prefer newer alternatives
- The schema uses GraphQL interfaces for polymorphic campaign types
