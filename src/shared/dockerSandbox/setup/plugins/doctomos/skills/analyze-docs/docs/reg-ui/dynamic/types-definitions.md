# Type Definitions - reg-ui

## GraphQL Types

### Output Types

#### Campaign
**Category:** Output Type (GraphQL)

```graphql
type Campaign {
  categoryId: ID
  date: CampaignDate
  id: ID
  identifier: FanIdentifier!
  name: String
  slug: String
  type: CampaignType
}
```

**Returned By:**
- `api.campaigns` query

**References:**
- [CampaignDate](#campaigndate)
- [FanIdentifier](#fanidentifier)
- [CampaignType](#campaigntype)

---

#### EntryRecord
**Category:** Output Type (GraphQL)

```graphql
type EntryRecord {
  attributes: AWSJSON
  campaignId: ID
  codes: [EntryCode]
  date: EntryRecordDate
  fields: AWSJSON
  locale: String
}
```

**Returned By:**
- `fan.entryRecord` query
- `entry` query
- `entries` query
- `upsertEntry` mutation
- `deleteEntry` mutation

**References:**
- [EntryCode](#entrycode)
- [EntryRecordDate](#entryrecorddate)

---

#### Fan
**Category:** Output Type (GraphQL)

```graphql
type Fan {
  email: String
  entryRecord(campaignId: ID!): EntryRecord
  firstName: String
  isLNAAMember: Boolean
  isLoggedIn: Boolean
  lastName: String
  livenessSession(sessionId: ID!): LivenessSession
  location: FanLocation
}
```

**Returned By:**
- `fan` query

**References:**
- [EntryRecord](#entryrecord)
- [LivenessSession](#livenesssession)
- [FanLocation](#fanlocation)

---

#### LivenessSession
**Category:** Output Type (GraphQL)

```graphql
type LivenessSession {
  date: LivenessStatusDate!
  id: ID!
  status: LivenessSessionStatus!
  token: String
  vendorId: String!
  vendorSessionId: ID!
  verificationType: VerificationType
}
```

**Returned By:**
- `livenessStatus` mutation
- `fan.livenessSession` query
- `livenessStatusUpdate` subscription

**References:**
- [LivenessStatusDate](#livenessstatusdate)
- [LivenessSessionStatus](#livenes ssessionstatus)
- [VerificationType](#verificationtype)

---

#### AccountFanscore
**Category:** Output Type (GraphQL)

```graphql
type AccountFanscore {
  armScore: Int
  email: String
  globalUserId: ID
  isBot: Boolean
  memberId: ID
  rawScore: Float
  score: Float
  tags: [ScoreTags]
  version: String
}
```

**Returned By:**
- `api.accountFanscore` query

**References:**
- [ScoreTags](#scoretags)

---

#### DemandEvent
**Category:** Output Type (GraphQL)

```graphql
type DemandEvent {
  id: ID
  isSuppressed: Boolean
  marketEventId: String
  name: String
  sales: [DemandEventSale]
  startDateTime: AWSDateTime
  venue: TMVenue
}
```

**Returned By:**
- `demand.eventDetails` query

**References:**
- [DemandEventSale](#demandeventsale)
- [TMVenue](#tmvenue)

---

#### VerificationStatus
**Category:** Output Type (GraphQL)

```graphql
type VerificationStatus {
  armScore: Int
  campaignId: ID
  events: [VerifiedEvents]
  globalUserId: ID
  isVerified: Boolean
  localFanscore: Float @deprecated
  memberId: ID
  rawScore: Float
  score: Float
  verdict: Boolean
}
```

**Returned By:**
- `api.verificationStatus` query

**References:**
- [VerifiedEvents](#verifiedevents)

**Deprecated Fields:**
- `localFanscore` - Use `score` instead

---

### Input Types

#### DemandRecordInput
**Category:** Input Type (GraphQL)

```graphql
input DemandRecordInput {
  eventId: ID!
  locale: String
  saleId: ID!
}
```

**Used By:**
- `demandRecordSave` mutation
- `demandRecordDelete` mutation

**Transforms To:** [DemandRecordChangeResponse](#demandrecordchangeresponse) (output type)

---

#### LivenessOptions
**Category:** Input Type (GraphQL)

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
- [LivenessTier](#livenesstier)
- [VerificationType](#verificationtype)

**Transforms To:** [CheckLivenessResult](#checklivenessresult) (output type)

---

### Enums

#### CampaignType
**Category:** Enum (GraphQL)

```graphql
enum CampaignType {
  fanlist
  registration
}
```

**Used As Output By:**
- `Campaign` type (field: `type`)

---

#### FanIdentifier
**Category:** Enum (GraphQL)

```graphql
enum FanIdentifier {
  email
  globalUserId
  memberId
}
```

**Used As Output By:**
- `Campaign` type (field: `identifier`)

---

#### LivenessSessionStatus
**Category:** Enum (GraphQL)

```graphql
enum LivenessSessionStatus {
  approved
  completed
  created
  declined
  expired
  failed
  needs_review
  pending
}
```

**Used As Output By:**
- `LivenessSession` type (field: `status`)

---

#### LivenessTier
**Category:** Enum (GraphQL)

```graphql
enum LivenessTier {
  always
  asu
  high
  low
  medium
}
```

**Used As Input By:**
- `LivenessOptions` input type (field: `tier`)

---

#### VerificationType
**Category:** Enum (GraphQL)

```graphql
enum VerificationType {
  selfie
  selfieAndGovID
}
```

**Used By:**
- `LivenessOptions` input type (field: `verificationType`)
- `LivenessSession` output type (field: `verificationType`)

---

#### ContactMethod
**Category:** Enum (GraphQL)

```graphql
enum ContactMethod {
  email
  sms
}
```

**Used As Output By:**
- `DemandRecord` type (field: `contactMethod`)

---

#### RecordChangeStatus
**Category:** Enum (GraphQL)

```graphql
enum RecordChangeStatus {
  DELETED
  FAILED
  SAVED
}
```

**Used As Output By:**
- `DemandRecordChangeResponse` type (field: `status`)

---

#### PhoneType
**Category:** Enum (GraphQL)

```graphql
enum PhoneType {
  BLOCK_LIST
  FIXED_LINE
  INVALID
  MOBILE
  OTHER
  PAGER
  PAYPHONE
  PERSONAL
  PREPAID
  RESTRICTED_PREMIUM
  TOLL_FREE
  VOICEMAIL
  VOIP
}
```

**Used As Output By:**
- `PhoneInfo` type (field: `phoneType`)
- `PhoneScore` type (field: `phoneType`)

---

#### ClusterType
**Category:** Enum (GraphQL)

```graphql
enum ClusterType {
  exact
  inferred
}
```

**Used As Output By:**
- `Cluster` type (field: `type`)

---

#### RiskRecommendation
**Category:** Enum (GraphQL)

```graphql
enum RiskRecommendation {
  allow
  block
  flag
}
```

**Used As Output By:**
- `PhoneRisk` type (field: `recommendation`)

---

#### ScoreTags
**Category:** Enum (GraphQL)

```graphql
enum ScoreTags {
  pas_model_testing
}
```

**Used As Output By:**
- `AccountFanscore` type (field: `tags`)

---

### Unions

#### CheckLivenessError
**Category:** Union (GraphQL)

```graphql
union CheckLivenessError = LivenessCheckFailedError | UnauthorizedError | VendorRequestFailedError
```

**Used By:**
- `CheckLivenessResult` type (field: `error`)

**Possible Types:**
- [LivenessCheckFailedError](#livenesscheckfailederror)
- [UnauthorizedError](#unauthorizederror)
- [VendorRequestFailedError](#vendorrequestfailederror)

---

### Interfaces

#### LivenessError
**Category:** Interface (GraphQL)

```graphql
interface LivenessError {
  message: String!
}
```

**Implemented By:**
- [LivenessCheckFailedError](#livenesscheckfailederror)
- [VendorRequestFailedError](#vendorrequestfailederror)

---

### Scalars

#### AWSDateTime
**Category:** Scalar (GraphQL)

Extended ISO 8601 DateTime string. Accepts format `YYYY-MM-DDThh:mm:ss.SSSZ` with optional nanoseconds field (1-9 digits). Time zone offset is required (either `Z` or `±hh:mm:ss`).

**Used By:** Date fields throughout schema (e.g., `created`, `updated`, `presaleDateTime`)

---

#### AWSEmail
**Category:** Scalar (GraphQL)

Email address string complying with RFC 822.

**Used By:** Email fields in queries and mutations

---

#### AWSJSON
**Category:** Scalar (GraphQL)

JSON string complying with RFC 8259. Automatically parsed as Maps, Lists, or Scalar values.

**Used By:**
- `EntryRecord.attributes`
- `EntryRecord.fields`
- `upsertEntry` mutation input

---

#### JSON
**Category:** Scalar (GraphQL)

Generic JSON scalar.

**Used By:**
- `readCachedCampaign` query return
- `updateCachedCampaign` mutation return
- `updateCachedPromoters` mutation return

---

## TypeScript Types

### Interfaces

#### Campaign
**Category:** TypeScript Interface (extends CachedCampaign)

```typescript
export interface Campaign extends CachedCampaign {
  artist: Artist & { detail?: ArtistDetail };
  content: Content;
  currentLocale: CampaignLocale;
  adminStatus: CampaignStatus;
  promoters: Record<string, Promoter>;
  options: CachedCampaign['options'] & {
    isLNAA: boolean;
  };
}
```

**Exported From:** `lib/types/campaign.ts`

**Extends:** [CachedCampaign](#cachedcampaign)

**Referenced By:**
- [Store](#store) (state property)
- [useLoadCampaignData](../types-usage.md#useloadcampaigndata) (parameter)
- [transformCampaign](../types-usage.md#transformcampaign) (return type)

**Description:** Fully transformed campaign with normalized content, promoters, and artist details. Used in the application state after transformation from `CachedCampaign`.

---

#### CachedCampaign
**Category:** TypeScript Type Alias

```typescript
export type CachedCampaign = {
  type: 'presaleSignUp' | 'registration';
  id: string;
  domain: {
    site: string;
    preview?: string;
  };
  artist: Artist;
  schema: {
    version: string;
  };
  tour: {
    name: string;
  };
  options: {
    gate: CampaignGate;
    isLNAA?: boolean;
  };
  referenceTimezone: string;
  date: CampaignDates;
  locales: CampaignLocale[];
  markets: Market[];
  faqs: Faqs;
  content: PartialContent;
  status: CampaignStatus;
  preferences: Preference[];
  style: CampaignStyles;
  image: CampaignImage;
  subType: CampaignSubtype;
};
```

**Exported From:** `lib/types/campaign.ts`

**Referenced By:**
- [Campaign](#campaign) (extends this)
- [RegCache](#regcache) (cache operations)
- [transformCampaign](../types-usage.md#transformcampaign) (input type)

**Description:** Raw campaign data from Redis cache before transformation. Contains partial content for non-default locales.

---

#### Store
**Category:** TypeScript Interface (Zustand Store)

```typescript
export interface Store {
  form: Form;
  user: User;
  ui: Ui;
  campaign: Campaign;
  linkedCampaign: LinkedCampaign | null;
}
```

**Exported From:** `lib/store/index.ts`

**References:**
- [Form](#form)
- [User](#user)
- [Ui](#ui)
- [Campaign](#campaign)
- [LinkedCampaign](#linkedcampaign)

**Description:** Global application state managed by Zustand. Combines form data, user information, UI state, and campaign data.

---

#### GraphqlError
**Category:** TypeScript Interface (extends ClientError)

```typescript
export interface GraphqlError extends ClientError {
  response: ClientError['response'] & { errors?: ErrorItem[] };
}
```

**Exported From:** `graphql/types.ts`

**References:**
- [ErrorItem](#erroritem)

**Description:** Extended GraphQL error type with structured error codes for known error scenarios.

---

#### RegCache
**Category:** TypeScript Type Alias

```typescript
export type RegCache = {
  setCampaign: ({ slug, campaign }: SetCampaignParams) => Promise<Campaign | null>;
  getCampaign: (slug: string) => Promise<Campaign | null>;
  getCampaignSlugById: (campaignId: string) => Promise<string | null>;
  getPromoters: (promoterIds: string[]) => Promise<Promoter[]>;
  setPromoter: (promoter: Promoter) => Promise<Promoter | null>;
  quit: () => Promise<void>;
};
```

**Exported From:** `lib/types/cache.ts`

**References:**
- [SetCampaignParams](#setcampaignparams)
- [Campaign](#campaign)
- [Promoter](#promoter)

**Description:** Redis cache interface for campaign and promoter data operations.

---

#### DigitalData
**Category:** TypeScript Interface

```typescript
export interface DigitalData {
  version: string;
  category?: string;
  action?: string;
  label?: EventLabel;
  value?: string | number | boolean;
  page: {
    attributes: {
      discovery: {
        attraction: DiscoveryAttraction[];
      };
      artistID: string;
      artistName: string;
    };
    category: {
      organization: string;
    };
    pageInfo: {
      destinationURL: string;
      environment: string;
      isTestEntity: string;
      language: string;
      pageChannel: string;
      pageExperience?: string;
      pageName: string;
      pageType: string;
      pageID: string;
      pageVariant?: string;
      platform: string;
      publisher: string;
      publisherDivision: string;
      referringURL: string;
    };
  };
}
```

**Exported From:** `lib/types/digitalData.d.ts`

**Description:** Google Tag Manager digital data layer structure for analytics tracking.

---

### Type Aliases

#### Form
**Category:** TypeScript Type Alias

```typescript
export type Form = {
  markets: string[];
  allow_marketing: boolean;
  allow_livenation: boolean;
  allow_artist_sms: boolean;
  promoterOptIns?: string[];
  lnaaOptIn: boolean;
};
```

**Exported From:** `lib/store/index.ts`

**Description:** User form data state including market selections and opt-in preferences.

---

#### User
**Category:** TypeScript Type Alias

```typescript
export type User = {
  isLoggedIn: boolean;
  hasEntry: boolean;
  isLNAAMember: boolean;
  name: string | null;
  email: string | null;
  codeByMarket: Map<string, string>;
  doTransfer?: boolean | undefined;
  location: ClientGeoPoint | null;
  entryDate?: {
    fanModified: string;
  };
};
```

**Exported From:** `lib/store/index.ts`

**References:**
- [ClientGeoPoint](#clientgeopoint)

**Description:** User authentication and entry status state.

---

#### Ui
**Category:** TypeScript Type Alias

```typescript
export type Ui = {
  page: UiPage;
  modal: Modal | ErrorModal | null;
  locale: string;
  isSubmitting: boolean;
  isStoreLoaded: boolean;
  scrollTo: ElementId | null;
  isMobileApp: boolean;
};
```

**Exported From:** `lib/store/index.ts`

**References:**
- [UiPage](#uipage)
- [Modal](#modal)
- [ErrorModal](#errormodal)

**Description:** UI state including current page, modals, and loading states.

---

#### Market
**Category:** TypeScript Type Alias

```typescript
export type Market = {
  id: string;
  campaign_id: string;
  name: string;
  city: string;
  state: string;
  timezone: string;
  date: {
    created: string;
    updated: string;
  };
  event: MarketEvent;
  point: MarketGeoPoint;
  isAddedShow?: boolean;
  promoterIds: string[];
};
```

**Exported From:** `lib/types/campaign.ts`

**References:**
- [MarketEvent](#marketevent)
- [MarketGeoPoint](#marketgeopoint)

**Description:** Event market with venue, date, and geographic information.

---

#### MarketEvent
**Category:** TypeScript Type Alias

```typescript
export type MarketEvent = {
  date: string;
  presaleDateTime: string;
  ids: string[];
  link: string;
  ticketer: string;
  venue: {
    name: string;
  };
  sharedCode?: string;
  splitAllocation?: SplitAllocation;
};
```

**Exported From:** `lib/types/campaign.ts`

**References:**
- [SplitAllocation](#splitallocation)

**Description:** Event details within a market including ticketing information.

---

#### Preference
**Category:** TypeScript Type Alias (Generic)

```typescript
export type Preference<T = string> = {
  id: T;
  type: PreferenceType;
  is_optional: boolean;
  additional: {
    max_length?: number;
  };
  label: {
    'en-US': string;
    [locale: string]: string;
  };
};
```

**Exported From:** `lib/types/campaign.ts`

**References:**
- [PreferenceType](#preferencetype)

**Description:** Generic campaign preference/opt-in configuration with localized labels.

---

#### Artist
**Category:** TypeScript Type Alias

```typescript
export type Artist = {
  id: string;
  discovery_id: string;
  name: string;
  image_url: string;
  adpUrl?: string;
  fanclubName?: string;
};
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Artist information for campaign.

---

#### ArtistDetail
**Category:** TypeScript Type Alias

```typescript
export type ArtistDetail = {
  name: string;
  type: string;
  id: string;
  test: boolean;
  url: string;
  locale: string;
  externalLinks: ExternalLinks;
  images: Image[];
};
```

**Exported From:** `lib/types/campaign.ts`

**References:**
- [ExternalLinks](#externallinks)
- [Image](#image)

**Description:** Extended artist details from Discovery API.

---

#### Promoter
**Category:** TypeScript Type Alias

```typescript
export type Promoter = {
  id: string;
  name: string;
  privacyUrls: LocalizedUrl[];
};
```

**Exported From:** `lib/types/campaign.ts`

**References:**
- [LocalizedUrl](#localizedurl)

**Description:** Event promoter with localized privacy policy URLs.

---

#### Content
**Category:** TypeScript Type Alias

```typescript
export type Content = {
  'en-US': LocaleContent;
  [locale: string]: LocaleContent;
};
```

**Exported From:** `lib/types/campaign.ts`

**References:**
- [LocaleContent](#localecontent)

**Description:** Fully normalized campaign content with complete data for all locales.

---

#### PartialContent
**Category:** TypeScript Type Alias

```typescript
export type PartialContent = {
  'en-US': LocaleContent;
  [locale: string]: Partial<LocaleContent>;
};
```

**Exported From:** `lib/types/campaign.ts`

**References:**
- [LocaleContent](#localecontent)

**Description:** Campaign content from cache where non-default locales may have partial data.

---

#### LocaleContent
**Category:** TypeScript Type Alias

```typescript
export type LocaleContent = {
  faqs: {
    [key: string]: FaqItem;
  };
  landing: object;
  confirmation: object;
  email: object;
  body?: object | undefined;
};
```

**Exported From:** `lib/types/campaign.ts`

**References:**
- [FaqItem](#faqitem)

**Description:** Content structure for a single locale including FAQs and page content.

---

#### LinkedCampaign
**Category:** TypeScript Type Alias

```typescript
export type LinkedCampaign = Pick<Campaign, 'artist' | 'domain' | 'tour' | 'subType'>;
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Subset of campaign data for linked fanclub campaigns (used for gating).

---

#### CampaignStyles
**Category:** TypeScript Type Alias

```typescript
export type CampaignStyles = {
  theme: {
    primary: string;
    mix70: string;
    mix40: string;
    mix30: string;
    mix20: string;
  };
  border: {
    primary: string;
  };
  pageBackground: {
    primary: string;
  };
  text: {
    primary: string;
    secondary: string;
  };
  checkbox: {
    default: { fill: string; border: string; };
    hover: { fill: string; };
    active: { fill: string; };
    checked: { fill: string; };
    checkedHover: { fill: string; };
    disabled: { fill: string; border: string; };
  };
};
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Campaign theming and color configuration.

---

#### ClientGeoPoint
**Category:** TypeScript Type Alias

```typescript
export type ClientGeoPoint = {
  latitude: number;
  longitude: number;
};
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Geographic coordinates for user location.

---

#### MarketGeoPoint
**Category:** TypeScript Type Alias

```typescript
export type MarketGeoPoint = {
  coordinates: [number, number];
};
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Geographic coordinates for market/venue location (GeoJSON format).

---

#### EntryCode
**Category:** TypeScript Type Alias

```typescript
export type EntryCode = {
  id: string;
  marketId: string;
};
```

**Exported From:** `lib/types/entry.ts`

**Description:** Entry code assigned to user for a specific market.

---

#### ErrorItem
**Category:** TypeScript Type Alias

```typescript
export type ErrorItem = {
  errorInfo: { code: KnownErrorCodes };
};
```

**Exported From:** `graphql/types.ts`

**References:**
- [KnownErrorCodes](#knownerrorcodes)

**Description:** Structured error item with known error code.

---

#### LogFields
**Category:** TypeScript Type Alias

```typescript
export type LogFields = {
  readonly [key: string]: any;
};
```

**Exported From:** `lib/types/log.ts`

**Description:** Flexible key-value fields for logging.

---

#### TranslationFunction
**Category:** TypeScript Type Alias

```typescript
export type TranslationFunction = ReturnType<typeof useTranslations<string>>;
```

**Exported From:** `lib/types/i18n.ts`

**Description:** Type for next-intl translation function.

---

### Enums

#### ModalType
**Category:** TypeScript Enum

```typescript
export enum ModalType {
  ERROR = 'error',
  TERMS_OF_USE = 'termsOfUse'
}
```

**Exported From:** `lib/store/index.ts`

**Description:** Available modal types in the application.

---

#### UiPage
**Category:** TypeScript Enum

```typescript
export enum UiPage {
  REGISTRATION = 'registration',
  CONFIRMATION = 'confirmation'
}
```

**Exported From:** `lib/store/index.ts`

**Description:** Application pages.

---

#### KnownErrorCodes
**Category:** TypeScript Enum

```typescript
export enum KnownErrorCodes {
  DUPLICATE_PHONE = 'DUPLICATE_PHONE',
  CAMPAIGN_CLOSED = 'CAMPAIGN_CLOSED',
  CAMPAIGN_CLOSED_ON_EDIT = 'CAMPAIGN_CLOSED_ON_EDIT',
  LIVENESS_CHECK_FAILED_ERROR = 'LIVENESS_CHECK_FAILED_ERROR',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  NOT_LOGGED_IN = 'NOT_LOGGED_IN',
  NO_INVITE = 'NO_INVITE',
  LINKED_ENTRY = 'LINKED_ENTRY'
}
```

**Exported From:** `lib/store/index.ts`

**Description:** Known error codes from GraphQL mutations.

---

#### CampaignStatus
**Category:** TypeScript Enum

```typescript
export enum CampaignStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PREVIEW = 'PREVIEW'
}
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Campaign status values.

---

#### CampaignSubtype
**Category:** TypeScript Enum

```typescript
export enum CampaignSubtype {
  FANCLUB = 'fanclub'
}
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Campaign subtype (currently only fanclub).

---

#### PreferenceType
**Category:** TypeScript Enum

```typescript
export enum PreferenceType {
  opt_in = 'opt_in',
  markets = 'markets'
}
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Types of campaign preferences.

---

#### OptInId
**Category:** TypeScript Enum

```typescript
export enum OptInId {
  allow_marketing = 'allow_marketing',
  allow_livenation = 'allow_livenation',
  allow_artist_sms = 'allow_artist_sms'
}
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Standard opt-in preference IDs.

---

#### SplitAllocationType
**Category:** TypeScript Enum

```typescript
export enum SplitAllocationType {
  CONCURRENT = 'concurrent',
  SEQUENTIAL = 'sequential'
}
```

**Exported From:** `lib/types/campaign.ts`

**Description:** Split allocation types for shared entry codes.

---

## Type Dependency Graph

```
Campaign (TypeScript - Application State)
  ├─ Artist (includes ArtistDetail enrichment)
  │   └─ ArtistDetail
  │       ├─ ExternalLinks
  │       └─ Image[]
  ├─ Content (normalized from PartialContent)
  │   └─ LocaleContent
  │       └─ FaqItem
  ├─ Market[]
  │   ├─ MarketEvent
  │   │   └─ SplitAllocation
  │   └─ MarketGeoPoint
  ├─ Preference[]
  ├─ CampaignStyles
  ├─ CampaignImage
  ├─ CampaignDates
  ├─ CampaignLocale
  ├─ CampaignStatus (enum)
  ├─ CampaignSubtype (enum)
  └─ Promoter[] (Record<string, Promoter>)
      └─ LocalizedUrl[]

Store (Zustand State)
  ├─ Form
  ├─ User
  │   └─ ClientGeoPoint
  ├─ Ui
  │   ├─ UiPage (enum)
  │   └─ Modal | ErrorModal
  │       └─ KnownErrorCodes (enum)
  ├─ Campaign (see above)
  └─ LinkedCampaign (subset of Campaign)

GraphQL Types:
  Campaign (GraphQL)
    ├─ CampaignDate
    ├─ FanIdentifier (enum)
    └─ CampaignType (enum)

  EntryRecord
    ├─ EntryCode
    └─ EntryRecordDate

  Fan
    ├─ EntryRecord
    ├─ LivenessSession
    │   ├─ LivenessStatusDate
    │   ├─ LivenessSessionStatus (enum)
    │   └─ VerificationType (enum)
    └─ FanLocation

  DemandEvent
    ├─ DemandEventSale
    └─ TMVenue

  VerificationStatus
    └─ VerifiedEvents

  LivenessOptions (Input)
    ├─ LivenessTier (enum)
    └─ VerificationType (enum)
    ↓ transforms to ↓
  CheckLivenessResult (Output)
    ├─ LivenessDecision
    │   └─ LivenessSession
    └─ CheckLivenessError (Union)
        ├─ LivenessCheckFailedError
        ├─ UnauthorizedError
        └─ VendorRequestFailedError

  DemandRecordInput (Input)
    ↓ transforms to ↓
  DemandRecordChangeResponse (Output)
    ├─ RecordChangeError
    └─ RecordChangeStatus (enum)
```

### Legend
- TypeScript types - Used in application code
- GraphQL types - Used in API communication
- (Input) - Mutation/query input type
- (Output) - Query/mutation return type
- (enum) - Enumeration type
- [] - Array of type
- ? - Optional field
