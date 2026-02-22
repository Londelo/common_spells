# Type Definitions - admin-ui-next

## GraphQL Types

### Output Types (Query Results)

#### Campaign
**Category:** Output Type - Base Interface

```graphql
fragment campaignObject on Campaign {
  id: ID!
  type: String!
  name: String!
  date: CampaignDate!
  referenceTimezone: String
  artist: Artist!
  categoryId: String
}
```

**Returned By:**
- `admin_campaign` query
- Base type for `RegistrationCampaign` and `FanlistCampaign`

**References (Nested Output Types):**
- [CampaignDate](#campaigndate)
- [Artist](#artist)

---

#### RegistrationCampaign
**Category:** Output Type - Campaign Implementation

```graphql
fragment regCampaignObject on RegistrationCampaign {
  id: ID!
  name: String!
  domain: Domain
  artist: Artist!
  date: CampaignDate!
  status: String!
  referenceTimezone: String
  tour: Tour
  login_types: [String]
  trackers: [Tracker]
  style: JSON
  content: LocalizedContent
  image: CampaignImages
  faqs: FAQ
  preferences: [Preference]
  locales: [Locale]
  markets: [Market]
  options: CampaignOptions
  slack: SlackSettings
  schema: Schema
  subType: String
}
```

**Returned By:**
- `admin_campaign` query (when campaign is RegistrationCampaign)
- `admin_campaignsList` query

**References (Nested Output Types):**
- [Domain](#domain)
- [Artist](#artist)
- [CampaignDate](#campaigndate)
- [Tour](#tour)
- [Tracker](#tracker)
- [LocalizedContent](#localizedcontent)
- [CampaignImages](#campaignimages)
- [FAQ](#faq)
- [Preference](#preference)
- [Locale](#locale)
- [Market](#market)
- [CampaignOptions](#campaignoptions)
- [SlackSettings](#slacksettings)
- [Schema](#schema)

**TypeScript Type:** [CampaignRes](../lib/graphql/queries/getCampaign.ts)

---

#### FanlistCampaign
**Category:** Output Type - Campaign Implementation

```graphql
fragment fanlistCampaignObject on FanlistCampaign {
  eventIds: [String]
  scoring: JSON
  identifier: String
  uploads: [Upload]
  exports: [Export]
}
```

**Returned By:**
- `admin_campaign` query (when campaign is FanlistCampaign)

**References (Nested Output Types):**
- [Upload](#upload)
- [Export](#export)

---

#### Market
**Category:** Output Type

```graphql
fragment marketObject on Market {
  id: ID!
  name: String!
  city: String!
  state: String!
  population: Int!
  timezone: String!
  point: GeoPoint
  event: MarketEvent!
  isAddedShow: Boolean!
  promoterIds: [String]!
}
```

**Returned By:**
- `upsertMarket` mutation
- Nested in `Campaign.markets` field

**References (Nested Output Types):**
- [GeoPoint](#geopoint)
- [MarketEvent](#marketevent)

**TypeScript Type:** [MarketRes](../lib/graphql/fragments/marketObject.ts)

**Transformed From:** [MarketInput](#marketinput) (input type)

**Differences from Input:**
- All fields guaranteed non-null in output
- `id` always present in output (generated if not in input)
- Nested types fully populated from database

---

#### Promoter
**Category:** Output Type

```graphql
fragment PromoterFields on Promoter {
  id: ID!
  name: String!
  privacyUrls: [LocalizedUrl]!
  date: PromoterDate!
}
```

**Returned By:**
- `upsertPromoter` mutation
- `promoters` query

**References (Nested Output Types):**
- [LocalizedUrl](#localizedurl)
- [PromoterDate](#promoterdate)

**TypeScript Type:** [Promoter](../lib/graphql/fragments/promoterFields.ts)

**Transformed From:** [PromoterInput](#promoterinput) (input type)

**Differences from Input:**
- Adds `id` field (generated)
- Adds `date` field with `created` and `updated` timestamps
- All fields non-null

---

#### Venue
**Category:** Output Type

```graphql
type Venue {
  id: ID!
  discovery_id: String!
  name: String!
  city: String!
  state: String!
  country: String!
  timezone: String!
  point: GeoPoint!
}
```

**Returned By:**
- `admin_searchVenues` query

**References (Nested Output Types):**
- [GeoPoint](#geopoint)

**TypeScript Type:** [VenueRes](../lib/graphql/queries/searchVenues.ts)

---

#### Viewer
**Category:** Output Type

```graphql
fragment adminUser on Viewer {
  isAdmin: Boolean!
  isLoggedIn: Boolean!
  firstName: String!
  lastName: String!
  email: String!
}
```

**Returned By:**
- `admin_initApp` query

**Used By:**
- Authentication and user context

---

#### Identity
**Category:** Output Type

```graphql
type Identity {
  url: String!
  version: String!
  integratorId: String!
  placementId: String!
}
```

**Returned By:**
- `admin_initApp` query

**TypeScript Type:** Part of [InitAppRes](../lib/graphql/queries/initApp.ts)

---

### Nested Output Types

#### Artist
**Category:** Nested Output Type

```graphql
type Artist {
  id: ID!
  name: String!
  image_url: String!
  discovery_id: String!
  needs_id: String
  fanclubName: String
}
```

**Referenced By:**
- [Campaign](#campaign)
- [RegistrationCampaign](#registrationcampaign)

**TypeScript Type:** [Artist](../lib/graphql/queries/getCampaign.ts)

---

#### CampaignDate
**Category:** Nested Output Type

```graphql
type CampaignDate {
  created: String!
  updated: String
  open: String
  close: String
  finish: String
  presaleWindowStart: String
  presaleWindowEnd: String
  generalOnsale: String
}
```

**Referenced By:**
- [Campaign](#campaign)
- [RegistrationCampaign](#registrationcampaign)

**TypeScript Type:** [CampaignDates](../lib/types/campaign.ts)

---

#### Domain
**Category:** Nested Output Type

```graphql
type Domain {
  preview: String
  site: String!
  share: String
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

---

#### Tour
**Category:** Nested Output Type

```graphql
type Tour {
  name: String!
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

---

#### GeoPoint
**Category:** Nested Output Type

```graphql
type GeoPoint {
  latitude: Float!
  longitude: Float!
}
```

**Referenced By:**
- [Market](#market)
- [Venue](#venue)

**TypeScript Type:** [ClientGeoPoint](../lib/types/campaign.ts)

---

#### MarketEvent
**Category:** Nested Output Type

```graphql
type MarketEvent {
  ids: [String]!
  name: String!
  date: String!
  presaleDateTime: String!
  ticketer: String!
  link: String!
  venue: VenueRef!
  sharedCode: String!
  splitAllocation: SplitAllocation
}
```

**Referenced By:**
- [Market](#market)

**References (Nested Types):**
- [VenueRef](#venueref)
- [SplitAllocation](#splitallocation)

**TypeScript Type:** [MarketEvent](../lib/types/campaign.ts)

---

#### VenueRef
**Category:** Nested Output Type

```graphql
type VenueRef {
  name: String!
}
```

**Referenced By:**
- [MarketEvent](#marketevent)

---

#### SplitAllocation
**Category:** Nested Output Type

```graphql
type SplitAllocation {
  isActive: Boolean!
  link: String!
  type: String!
}
```

**Referenced By:**
- [MarketEvent](#marketevent)

**Type Values:**
- `concurrent`
- `sequential`

---

#### LocalizedUrl
**Category:** Nested Output Type

```graphql
type LocalizedUrl {
  locale: String!
  is_default: Boolean
  url: String!
}
```

**Referenced By:**
- [Promoter](#promoter)

**TypeScript Type:** [LocalizedUrl](../lib/graphql/fragments/promoterFields.ts)

---

#### PromoterDate
**Category:** Nested Output Type

```graphql
type PromoterDate {
  created: String!
  updated: String!
}
```

**Referenced By:**
- [Promoter](#promoter)

---

#### Tracker
**Category:** Nested Output Type

```graphql
type Tracker {
  id: String!
  type: String!
  src: String!
  additional: JSON
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

---

#### LocalizedContent
**Category:** Nested Output Type

```graphql
type LocalizedContent {
  localized: [LocalizedValue]
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**References (Nested Types):**
- [LocalizedValue](#localizedvalue)

---

#### LocalizedValue
**Category:** Nested Output Type

```graphql
type LocalizedValue {
  locale: String!
  value: Content!
}
```

**Referenced By:**
- [LocalizedContent](#localizedcontent)

**References (Nested Types):**
- [Content](#content)

---

#### Content
**Category:** Nested Output Type

```graphql
fragment allSharedContent on Content {
  meta: JSON
  email: EmailContent
}

fragment allV1Content on Content {
  body: BodyContent
  share: ShareContent
  image: ContentImages
  errors: [ErrorContent]
}

fragment allV2Content on Content {
  body: BodyContentV2
  faqs: [FAQ]
}
```

**Referenced By:**
- [LocalizedValue](#localizedvalue)

**References (Nested Types):**
- [EmailContent](#emailcontent)
- [BodyContent](#bodycontent)
- [ShareContent](#sharecontent)
- [ContentImages](#contentimages)
- [ErrorContent](#errorcontent)
- [FAQ](#faq)

---

#### Image
**Category:** Nested Output Type

```graphql
fragment imageFields on Image {
  url: String!
  width: Int!
  height: Int!
  alt_text: String
}
```

**Referenced By:**
- Multiple image fields in Campaign and Content types

---

#### CampaignImages
**Category:** Nested Output Type

```graphql
type CampaignImages {
  main: Image
  mobile: Image
  email: Image
  secondary: Image
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**References (Nested Types):**
- [Image](#image)

---

#### Preference
**Category:** Nested Output Type

```graphql
type Preference {
  id: String!
  is_optional: Boolean!
  type: String!
  label: LocalizedLabel!
  additional: JSON
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**TypeScript Type:** [Preference](../lib/types/campaign.ts)

---

#### Locale
**Category:** Nested Output Type

```graphql
type Locale {
  id: String!
  is_default: Boolean!
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**TypeScript Type:** [CampaignLocale](../lib/types/campaign.ts)

---

#### CampaignOptions
**Category:** Nested Output Type

```graphql
type CampaignOptions {
  allowIntlPhones: Boolean
  linkableAttributes: [String]
  showAccessCode: Boolean
  useGenericBranding: Boolean
  isLNAA: Boolean
  requirePassword: Boolean
  passwordValue: String
  queueId: String
  hideFaq: Boolean
  requirePrecheck: RequirePrecheck
  gate: Gate
  automatedReminders: JSON
  waitingRoomDuration: Int
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

---

#### SlackSettings
**Category:** Nested Output Type

```graphql
type SlackSettings {
  channels: SlackChannels
  noAlert: Boolean
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

---

#### Schema
**Category:** Nested Output Type

```graphql
type Schema {
  version: String!
}
```

**Referenced By:**
- [Campaign](#campaign)
- [RegistrationCampaign](#registrationcampaign)

---

#### Upload
**Category:** Nested Output Type

```graphql
type Upload {
  date: String!
  rows: Int!
  rowsIn: Int!
  status: String!
}
```

**Referenced By:**
- [FanlistCampaign](#fanlistcampaign)

---

#### Export
**Category:** Nested Output Type

```graphql
fragment exportObject on Export {
  id: ID!
  campaignId: String!
  exportType: String!
  date: ExportDate!
  status: String!
  count: Int!
  path: String
  error: ExportError
}
```

**Referenced By:**
- [FanlistCampaign](#fanlistcampaign)

**References (Nested Types):**
- [ExportDate](#exportdate)
- [ExportError](#exporterror)

---

#### ExportDate
**Category:** Nested Output Type

```graphql
type ExportDate {
  created: String!
  started: String
  finished: String
}
```

**Referenced By:**
- [Export](#export)

---

#### ExportError
**Category:** Nested Output Type

```graphql
type ExportError {
  message: String!
  payload: JSON
  stack: String
}
```

**Referenced By:**
- [Export](#export)

---

### Input Types (Mutation Arguments)

#### MarketInput
**Category:** Input Type

```typescript
type MarketInput = {
  id?: string;
  name?: string;
  campaignId: string;
  city?: string;
  state?: string;
  timezone?: string;
  population?: number;
  point?: ClientGeoPoint;
  event?: MarketEvent;
  isAddedShow?: boolean;
  promoterIds?: string[];
}
```

**Used By:**
- `admin_upsertMarket` mutation (argument: `market`)

**References (Nested Input Types):**
- [ClientGeoPoint](#clientgeopoint)
- [MarketEvent](#marketevent)

**Transforms To:** [Market](#market) (output type)

**Source:** [MarketInput](../lib/types/campaign.ts)

**Data Flow:**
```
MarketInput → upsertMarket Mutation → Database → Market
```

---

#### PromoterInput
**Category:** Input Type

```typescript
type PromoterInput = {
  id?: string;
  name: string;
  privacyUrls: LocalizedUrl[];
}
```

**Used By:**
- `upsertPromoter` mutation (argument: `promoter`)

**References (Nested Input Types):**
- [LocalizedUrl](#localizedurl)

**Transforms To:** [Promoter](#promoter) (output type)

**Source:** [PromoterInput](../lib/graphql/mutations/upsertPromoter.ts)

**Data Flow:**
```
PromoterInput → upsertPromoter Mutation → Database → Promoter (+ id, date fields)
```

**Differences in Output:**
- Adds `id` field (generated if not provided)
- Adds `date` object with `created` and `updated` timestamps

---

### Enums

#### CampaignType
**Category:** Enum

```graphql
enum CampaignType {
  REGISTRATION
  FANLIST
}
```

**Used As Input By:**
- `admin_campaignsList` query (argument: `type`)

**Used As Output By:**
- [Campaign](#campaign) type (field: `type`)

---

#### CampaignStatus
**Category:** TypeScript Enum

```typescript
enum CampaignStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PREVIEW = 'PREVIEW',
  INACTIVE = 'INACTIVE'
}
```

**Used As Output By:**
- [RegistrationCampaign](#registrationcampaign) (field: `status`)

**Source:** [CampaignStatus](../lib/types/campaign.ts)

---

#### MarketStatus
**Category:** TypeScript Enum

```typescript
enum MarketStatus {
  INCOMPLETE_ERROR = 'INCOMPLETE_ERROR',
  INCOMPLETE_WARNING = 'INCOMPLETE_WARNING',
  COMPLETE = 'COMPLETE'
}
```

**Source:** [MarketStatus](../lib/types/campaign.ts)

**Used For:**
- Client-side validation and status display

---

#### OptInId
**Category:** TypeScript Enum

```typescript
enum OptInId {
  allow_marketing = 'allow_marketing',
  allow_livenation = 'allow_livenation',
  allow_artist_sms = 'allow_artist_sms'
}
```

**Source:** [OptInId](../lib/types/campaign.ts)

**Used For:**
- Preference identification

---

#### PreferenceType
**Category:** TypeScript Enum

```typescript
enum PreferenceType {
  opt_in = 'opt_in',
  markets = 'markets'
}
```

**Source:** [PreferenceType](../lib/types/campaign.ts)

**Used For:**
- Categorizing campaign preferences

---

## TypeScript Types

### Interfaces

#### UseTableControlsOptions
**Category:** TypeScript Interface - Hook Configuration

```typescript
export type UseTableControlsOptions<T extends { id: string }> = {
  itemName?: string;
  items?: T[];
  deleteAction?: (id: string) => void;
  addAction?: () => void;
  disableExpand?: boolean;
  disableDeleteAll?: boolean;
  filterKey?: Extract<keyof T, string>;
}
```

**Exported From:** [lib/hooks/useTableControls/types.ts](../lib/hooks/useTableControls/types.ts)

**Referenced By:**
- [useTableControls](../lib/hooks/useTableControls/index.tsx) (hook parameter type)

**Generic Parameter:**
- `T extends { id: string }` - Item type must have an `id` field

---

#### UseTableControlsReturn
**Category:** TypeScript Interface - Hook Return Type

```typescript
export type UseTableControlsReturn<T extends { id: string }> = {
  isSelected: (id: string) => boolean;
  setIsSelected: (id: string, nextValue: boolean) => void;
  isExpanded: (id: string) => boolean;
  setIsExpanded: (id: string, nextValue: boolean) => void;
  confirmDelete: (ids: string[]) => void;
  filteredItems: T[];
  Controls: ReactElement;
  EmptyState: ReactElement;
}
```

**Exported From:** [lib/hooks/useTableControls/types.ts](../lib/hooks/useTableControls/types.ts)

**Referenced By:**
- [useTableControls](../lib/hooks/useTableControls/index.tsx) (hook return type)

---

#### FormValues
**Category:** TypeScript Type - Event Form State

```typescript
export type FormValues = {
  id: string;
  search: string;
  venue: VenueRes | undefined;
  city: string;
  state: string;
  timezone: string;
  showDate: string;
  showTime: string;
  presaleDate: string;
  presaleTime: string;
  link: string;
  ticketer: string;
  sharedCode: string;
  eventIds: string[];
  name: string;
  hasSplitAllocation: boolean;
  splitAllocationType: string;
  splitAllocationLink: string;
  splitAllocationIsActive: boolean;
  isAddedShow: boolean;
  promoterFields: { id: string }[];
  point: { latitude: number; longitude: number } | undefined;
}
```

**Exported From:** [components/EventForm/useEventForm.ts](../components/EventForm/useEventForm.ts)

**Used By:**
- [useEventForm](../components/EventForm/useEventForm.ts) hook
- EventForm component

**Transforms To:** [MarketInput](#marketinput) via `createSubmitPayload`

---

#### PromoterFormValues
**Category:** TypeScript Type - Promoter Form State

```typescript
export type PromoterFormValues = {
  id?: string;
  name: string;
  privacyUrls: LocalizedUrl[];
}
```

**Exported From:** [components/Promoters/PromoterForm/usePromoterForm.ts](../components/Promoters/PromoterForm/usePromoterForm.ts)

**Used By:**
- [usePromoterForm](../components/Promoters/PromoterForm/usePromoterForm.ts) hook
- PromoterForm component

**Transforms To:** [PromoterInput](#promoterinput) via `createSubmitPayload`

---

#### Option
**Category:** TypeScript Type - Select Option

```typescript
export type Option = {
  id: string;
  value: string;
}
```

**Exported From:** [components/EventForm/constants.ts](../components/EventForm/constants.ts)

**Used By:**
- Timezone selector
- Ticketer selector

---

### Type Aliases

#### StoreSlice
**Category:** TypeScript Type Alias - Zustand Slice Creator

```typescript
export type StoreSlice<T> = StateCreator<Store, [], [], T>;
```

**Exported From:** [lib/store/types.ts](../lib/store/types.ts)

**Used By:**
- State slice definitions

---

#### Store
**Category:** TypeScript Type Alias - Global Store

```typescript
export type Store = RecentCampaignsSlice;
```

**Exported From:** [lib/store/types.ts](../lib/store/types.ts)

**Composed Of:**
- [RecentCampaignsSlice](#recentcampaignsslice)

---

#### RecentCampaignsSlice
**Category:** TypeScript Type - Store Slice

```typescript
export type RecentCampaignsSlice = {
  recentCampaigns: { id: string; name: string }[];
  insertRecentCampaign: (campaign: CampaignRes) => void;
}
```

**Exported From:** [lib/store/slices/recentCampaigns.ts](../lib/store/slices/recentCampaigns.ts)

**Used By:**
- Global store

---

#### ClientConfig
**Category:** TypeScript Type Alias - Zod Inferred

```typescript
export type ClientConfig = z.infer<typeof ClientConfigSchema>;
```

**Exported From:** [lib/config/client.ts](../lib/config/client.ts)

**Schema:**
```typescript
z.object({
  ACCOUNT_URL: z.string(),
  GRAPHQL_URL: z.string(),
  ADMIN_URL: z.string(),
  INTEGRATOR_ID: z.string(),
  PLACEMENT_ID: z.string(),
  REG_UI_URL: z.string()
})
```

---

## Validation Schemas (Zod)

### ClientConfigSchema
**Category:** Zod Schema

```typescript
export const ClientConfigSchema = z.object({
  ACCOUNT_URL: z.string(),
  GRAPHQL_URL: z.string(),
  ADMIN_URL: z.string(),
  INTEGRATOR_ID: z.string(),
  PLACEMENT_ID: z.string(),
  REG_UI_URL: z.string()
});
```

**Source:** [configs/schema/client.mjs](../configs/schema/client.mjs)

**Inferred Type:** [ClientConfig](#clientconfig)

**Used By:**
- [parseClientConfig](../lib/config/client.ts) function

---

### ServerConfigSchema
**Category:** Zod Schema

```typescript
export const ServerConfigSchema = z.object({
  LOCAL_HOST: z.string(),
  LOCAL_PORT: z.number(),
  BUILD_ENV: z.enum(['dev', 'qa', 'preprod', 'stage', 'prod'])
});
```

**Source:** [configs/schema/server.mjs](../configs/schema/server.mjs)

**Used By:**
- Server configuration parsing

---

### ConfigSchema
**Category:** Zod Schema - Merged

```typescript
export const ConfigSchema = ClientConfigSchema.merge(ServerConfigSchema);
```

**Source:** [configs/schema/server.mjs](../configs/schema/server.mjs)

**Combines:**
- [ClientConfigSchema](#clientconfigschema)
- [ServerConfigSchema](#serverconfigschema)

---

## Type Dependency Graph

```
Query: admin_campaign
  └─ Campaign (Output)
      ├─ CampaignDate (Nested Output)
      ├─ Artist (Nested Output)
      └─ implements ↓
          ├─ RegistrationCampaign (Output)
          │   ├─ Domain (Nested Output)
          │   ├─ CampaignDate (Nested Output)
          │   ├─ Artist (Nested Output)
          │   ├─ Tour (Nested Output)
          │   ├─ Tracker (Nested Output)
          │   ├─ LocalizedContent (Nested Output)
          │   │   └─ LocalizedValue (Nested Output)
          │   │       └─ Content (Nested Output)
          │   │           ├─ EmailContent (Nested Output)
          │   │           ├─ BodyContent (Nested Output)
          │   │           ├─ ShareContent (Nested Output)
          │   │           ├─ ContentImages (Nested Output)
          │   │           └─ FAQ (Nested Output)
          │   ├─ CampaignImages (Nested Output)
          │   │   └─ Image (Nested Output)
          │   ├─ Preference (Nested Output)
          │   ├─ Locale (Nested Output)
          │   ├─ Market (Nested Output)
          │   │   ├─ GeoPoint (Nested Output)
          │   │   └─ MarketEvent (Nested Output)
          │   │       ├─ VenueRef (Nested Output)
          │   │       └─ SplitAllocation (Nested Output)
          │   ├─ CampaignOptions (Nested Output)
          │   ├─ SlackSettings (Nested Output)
          │   └─ Schema (Nested Output)
          └─ FanlistCampaign (Output)
              ├─ Upload (Nested Output)
              └─ Export (Nested Output)
                  ├─ ExportDate (Nested Output)
                  └─ ExportError (Nested Output)

Mutation: admin_upsertMarket
  ├─ MarketInput (Input) →
  │   ├─ ClientGeoPoint (Nested Input)
  │   └─ MarketEvent (Nested Input)
  │       ├─ VenueRef (Nested Input)
  │       └─ SplitAllocation (Nested Input)
  └─ transforms to ↓
      Market (Output) [+ id, fully populated fields]

Mutation: upsertPromoter
  ├─ PromoterInput (Input) →
  │   └─ LocalizedUrl (Nested Input)
  └─ transforms to ↓
      Promoter (Output) [+ id, date object]

Query: admin_searchVenues
  └─ Venue (Output)
      └─ GeoPoint (Nested Output)

Query: promoters
  └─ Promoter (Output)
      ├─ LocalizedUrl (Nested Output)
      └─ PromoterDate (Nested Output)

Query: admin_initApp
  ├─ Identity (Output)
  └─ Viewer (Output)

Query: admin_campaignsList
  └─ RegistrationCampaign (Output) [subset of fields]
```

### Legend
- (Input) - Used as mutation/query input
- (Output) - Returned from queries/mutations
- (Nested Input/Output) - Referenced by other types
- [+ field] - Additional fields vs input
- → transforms to - Shows input to output transformation
