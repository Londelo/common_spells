# Type Definitions - admin-ui

This document provides comprehensive documentation of all type definitions in the admin-ui repository, extracted from the GraphQL schema.

## Type Sources

- **GraphQL Schema**: `/schema.graphql` (primary type source)
- **GraphQL Operations**: `/frontend/src/graphql/` (queries, mutations, fragments)
- **Language**: JavaScript (no TypeScript types found)

---

## GraphQL Types

### Input Types

#### CampaignInput
**Category:** Input Type

```graphql
input CampaignInput {
  id: ID
  type: CampaignType
  name: String
  tour: CampaignTourInput
  artist: CampaignArtistInput
  domain: CampaignDomainInput
  status: String
  categoryId: String
  trackers: [TrackerInput]
  style: JSON
  content: CampaignContentInput
  image: CampaignImagesInput
  preferences: [FieldInput]
  faqs: CampaignPageFAQInput
  markets: [MarketInput]
  currentLocale: LocaleInput
  locales: [LocaleInput]
  entry: JSON
  date: CampaignDateInput
  referenceTimezone: String
  login_types: [String]
  slack: CampaignSlackOptionsInput
  options: CampaignOptionsInput
  eventIds: [ID]
  scoring: FanlistScoring
  identifier: FanIdentifier
  schema: CampaignSchemaInput
  subType: CampaignSubtype
}
```

**Used By:**
- `upsertCampaign` mutation (argument: `campaign`)

**References (Nested Input Types):**
- [CampaignTourInput](#campaigntourinput)
- [CampaignArtistInput](#campaignartistinput)
- [CampaignDomainInput](#campaigndomaininput)
- [TrackerInput](#trackerinput)
- [CampaignContentInput](#campaigncontentinput)
- [CampaignImagesInput](#campaignimagesinput)
- [FieldInput](#fieldinput)
- [CampaignPageFAQInput](#campaignpagefaqinput)
- [MarketInput](#marketinput)
- [LocaleInput](#localeinput)
- [CampaignDateInput](#campaigndateinput)
- [CampaignSlackOptionsInput](#campaignslackoptionsinput)
- [CampaignOptionsInput](#campaignoptionsinput)
- [CampaignSchemaInput](#campaignschemainput)

**Transforms To:** [Campaign](#campaign) (interface) → [RegistrationCampaign](#registrationcampaign) or [FanlistCampaign](#fanlistcampaign)

**Data Flow:**
```
CampaignInput → upsertCampaign Mutation → Database → Campaign (RegistrationCampaign or FanlistCampaign)
```

---

#### MarketInput
**Category:** Input Type

```graphql
input MarketInput {
  id: String
  name: String
  campaignId: String!
  city: String
  state: String
  timezone: String
  population: Int
  point: GeoPointInput
  event: MarketEventInput
  isAddedShow: Boolean
  promoterIds: [String]
}
```

**Used By:**
- `upsertMarket` mutation (argument: `market`)
- `CampaignInput` (field: `markets`)

**References (Nested Input Types):**
- [GeoPointInput](#geopointinput)
- [MarketEventInput](#marketeventinput)

**Transforms To:** [Market](#market)

**Differences from Output:**
- Output adds computed fields from database
- Nested event type enriched with venue data

---

#### CampaignArtistInput
**Category:** Input Type

```graphql
input CampaignArtistInput {
  id: String
  discovery_id: String
  name: String
  image_url: String
  needs_id: Boolean
  fanclubName: String
}
```

**Used By:**
- `CampaignInput` (field: `artist`)

**Transforms To:** [CampaignArtist](#campaignartist)

**Data Flow:**
```
CampaignArtistInput → CampaignInput → Campaign.artist
```

---

#### CampaignTourInput
**Category:** Input Type

```graphql
input CampaignTourInput {
  name: String
}
```

**Used By:**
- `CampaignInput` (field: `tour`)

**Transforms To:** [CampaignTour](#campaigntour)

---

#### CampaignDomainInput
**Category:** Input Type

```graphql
input CampaignDomainInput {
  site: String
  share: String
  preview: String
}
```

**Used By:**
- `CampaignInput` (field: `domain`)

**Transforms To:** [CampaignDomain](#campaigndomain)

---

#### CampaignDateInput
**Category:** Input Type

```graphql
input CampaignDateInput {
  created: String
  open: String
  close: String
  finish: String
  presaleWindowStart: String
  presaleWindowEnd: String
  generalOnsale: String
  sendReminderEmails: [String]
  triggeredEmailReminders: String
}
```

**Used By:**
- `CampaignInput` (field: `date`)

**Transforms To:** [CampaignDate](#campaigndate)

**Differences from Output:**
- Output adds `opened`, `closed`, `updated` fields (computed from system)
- All dates stored as ISO 8601 strings

---

#### CampaignContentInput
**Category:** Input Type

```graphql
input CampaignContentInput {
  localized: [LocalizedContentInput]
  en_US: ContentInput
  en_CA: ContentInput
  en_GB: ContentInput
  fr_CA: ContentInput
  en_MX: ContentInput
  es_MX: ContentInput
  en_IE: ContentInput
}
```

**Used By:**
- `CampaignInput` (field: `content`)

**References (Nested Input Types):**
- [LocalizedContentInput](#localizedcontentinput)
- [ContentInput](#contentinput)

**Transforms To:** [CampaignContent](#campaigncontent)

**Note:** Legacy locale fields (en_US, en_CA, etc.) are deprecated in favor of `localized` array.

---

#### ContentInput
**Category:** Input Type

```graphql
input ContentInput {
  meta: JSON
  body: ContentBodyInput
  faqs: [ContentFAQInput]
  image: ContentImagesInput
  email: ContentEmailInput
  share: ContentShareInput
  phone: ContentPhoneInput
  errors: [ContentErrorInput]
}
```

**Used By:**
- `CampaignContentInput`
- `LocalizedContentInput` (field: `value`)

**References (Nested Input Types):**
- [ContentBodyInput](#contentbodyinput)
- [ContentFAQInput](#contentfaqinput)
- [ContentImagesInput](#contentimagesinput)
- [ContentEmailInput](#contentemailinput)
- [ContentShareInput](#contentshareinput)
- [ContentPhoneInput](#contentphoneinput)
- [ContentErrorInput](#contenterrorinput)

**Transforms To:** [Content](#content)

---

#### ContentBodyInput
**Category:** Input Type

```graphql
input ContentBodyInput {
  started: ContentStartedInput
  finished: ContentFinishedInput
  terms: ContentTermsInput
  signup: ContentSignupInput
  faqs: [ContentFAQInput]
}
```

**Used By:**
- `ContentInput` (field: `body`)

**References (Nested Input Types):**
- [ContentStartedInput](#contentstartedinput)
- [ContentFinishedInput](#contentfinishedinput)
- [ContentTermsInput](#contenttermsinput)
- [ContentSignupInput](#contentsignupinput)
- [ContentFAQInput](#contentfaqinput)

**Transforms To:** [ContentBody](#contentbody)

---

#### ContentStartedInput
**Category:** Input Type

```graphql
input ContentStartedInput {
  welcome: ContentStartedWelcomeInput
  registration: ContentStartedRegistrationInput
  entry: ContentStartedEntryInput
}
```

**Used By:**
- `ContentBodyInput` (field: `started`)

**References (Nested Input Types):**
- [ContentStartedWelcomeInput](#contentstarted welcomeinput)
- [ContentStartedRegistrationInput](#contentstartedregistrationinput)
- [ContentStartedEntryInput](#contentstartedenryinput)

**Transforms To:** [ContentStarted](#contentstarted)

---

#### ContentStartedWelcomeInput
**Category:** Input Type

```graphql
input ContentStartedWelcomeInput {
  above_button: String
  below_button: String
  header: String
  sign_in_button_content: String
  footer_content: String
}
```

**Used By:**
- `ContentStartedInput` (field: `welcome`)

**Transforms To:** [ContentStartedWelcome](#contentstartedwelcome)

---

#### ContentStartedRegistrationInput
**Category:** Input Type

```graphql
input ContentStartedRegistrationInput {
  above_form: String
  below_form: String
  header: String
  above_button: String
  submit_button_content: String
}
```

**Used By:**
- `ContentStartedInput` (field: `registration`)

**Transforms To:** [ContentStartedRegistration](#contentstartedregistration)

---

#### ContentStartedEntryInput
**Category:** Input Type

```graphql
input ContentStartedEntryInput {
  header: String
  top: String
  attributes: String
  main: String
}
```

**Used By:**
- `ContentStartedInput` (field: `entry`)

**Transforms To:** [ContentStartedEntry](#contentstartedentry)

---

#### ContentFinishedInput
**Category:** Input Type

```graphql
input ContentFinishedInput {
  welcome: ContentFinishedWelcomeInput
}
```

**Used By:**
- `ContentBodyInput` (field: `finished`)

**References:** [ContentFinishedWelcomeInput](#contentfinishedwelcomeinput)

**Transforms To:** [ContentFinished](#contentfinished)

---

#### ContentFinishedWelcomeInput
**Category:** Input Type

```graphql
input ContentFinishedWelcomeInput {
  main: String
  header: String
}
```

**Used By:**
- `ContentFinishedInput` (field: `welcome`)

**Transforms To:** [ContentFinishedWelcome](#contentfinishedwelcome)

---

#### ContentTermsInput
**Category:** Input Type

```graphql
input ContentTermsInput {
  main: String
}
```

**Used By:**
- `ContentBodyInput` (field: `terms`)

**Transforms To:** [ContentTerms](#contentterms)

---

#### ContentSignupInput
**Category:** Input Type

```graphql
input ContentSignupInput {
  infoBody: String
}
```

**Used By:**
- `ContentBodyInput` (field: `signup`)

**Transforms To:** [ContentSignup](#contentsignup)

---

#### ContentFAQInput
**Category:** Input Type

```graphql
input ContentFAQInput {
  id: ID
  question: String
  answer: String
  hash_id: String
  title: String
  questions: [ContentFAQQuestionInput]
}
```

**Used By:**
- `ContentBodyInput` (field: `faqs`)
- `ContentInput` (field: `faqs`)

**References:** [ContentFAQQuestionInput](#contentfaqquestioninput)

**Transforms To:** [ContentFAQ](#contentfaq)

---

#### ContentFAQQuestionInput
**Category:** Input Type

```graphql
input ContentFAQQuestionInput {
  hash_id: String
  question: String
  answer: String
}
```

**Used By:**
- `ContentFAQInput` (field: `questions`)

**Transforms To:** [ContentFAQQuestion](#contentfaqquestion)

---

#### ContentImagesInput
**Category:** Input Type

```graphql
input ContentImagesInput {
  share: ImageInput
  background: ImageInput
  logo: ImageInput
}
```

**Used By:**
- `ContentInput` (field: `image`)

**References:** [ImageInput](#imageinput)

**Transforms To:** [ContentImages](#contentimages)

---

#### ContentEmailInput
**Category:** Input Type

```graphql
input ContentEmailInput {
  subject: ContentEmailSubjectInput
  template: ContentEmailTemplateInput
  from: ContentEmailFromInput
}
```

**Used By:**
- `ContentInput` (field: `email`)

**References (Nested Input Types):**
- [ContentEmailSubjectInput](#contentemailsubjectinput)
- [ContentEmailTemplateInput](#contentemailtemplatingput)
- [ContentEmailFromInput](#contentemailfrominput)

**Transforms To:** [ContentEmail](#contentemail)

---

#### ContentEmailSubjectInput
**Category:** Input Type

```graphql
input ContentEmailSubjectInput {
  receipt: String
}
```

**Used By:**
- `ContentEmailInput` (field: `subject`)

**Transforms To:** [ContentEmailSubject](#contentemailsubject)

---

#### ContentEmailTemplateInput
**Category:** Input Type

```graphql
input ContentEmailTemplateInput {
  confirm: String
  receipt: String
  share: String
}
```

**Used By:**
- `ContentEmailInput` (field: `template`)

**Transforms To:** [ContentEmailTemplate](#contentemailtemplate)

---

#### ContentEmailFromInput
**Category:** Input Type

```graphql
input ContentEmailFromInput {
  name: String
  account: String
}
```

**Used By:**
- `ContentEmailInput` (field: `from`)

**Transforms To:** [ContentEmailFrom](#contentemailfrom)

---

#### ContentShareInput
**Category:** Input Type

```graphql
input ContentShareInput {
  template: ContentShareTemplateInput
}
```

**Used By:**
- `ContentInput` (field: `share`)

**References:** [ContentShareTemplateInput](#contentsharetemplatingput)

**Transforms To:** [ContentShare](#contentshare)

---

#### ContentShareTemplateInput
**Category:** Input Type

```graphql
input ContentShareTemplateInput {
  twitter: String
  default: String
  facebook: String
  email_subject: String
  email_body: String
}
```

**Used By:**
- `ContentShareInput` (field: `template`)

**Transforms To:** [ContentShareTemplate](#contentsharetemplate)

---

#### ContentPhoneInput
**Category:** Input Type

```graphql
input ContentPhoneInput {
  account: String
}
```

**Used By:**
- `ContentInput` (field: `phone`)

**Transforms To:** [ContentPhone](#contentphone)

---

#### ContentErrorInput
**Category:** Input Type

```graphql
input ContentErrorInput {
  code: String
  message: String
}
```

**Used By:**
- `ContentInput` (field: `errors`)

**Transforms To:** [ContentError](#contenterror)

---

#### CampaignImagesInput
**Category:** Input Type

```graphql
input CampaignImagesInput {
  main: ImageInput
  mobile: ImageInput
  email: ImageInput
  secondary: ImageInput
}
```

**Used By:**
- `CampaignInput` (field: `image`)

**References:** [ImageInput](#imageinput)

**Transforms To:** [CampaignImages](#campaignimages)

---

#### ImageInput
**Category:** Input Type

```graphql
input ImageInput {
  url: String
  width: Int
  height: Int
  alt_text: String
}
```

**Used By:**
- `CampaignImagesInput` (fields: `main`, `mobile`, `email`, `secondary`)
- `ContentImagesInput` (fields: `share`, `background`, `logo`)

**Transforms To:** [Image](#image)

**Differences from Output:**
- Output adds `name` field (derived from URL)

---

#### FieldInput
**Category:** Input Type

```graphql
input FieldInput {
  id: String
  type: String
  is_optional: Boolean
  label: FieldLabelInput
  additional: JSON
}
```

**Used By:**
- `CampaignInput` (field: `preferences`)

**References:** [FieldLabelInput](#fieldlabelinput)

**Transforms To:** [Field](#field)

---

#### FieldLabelInput
**Category:** Input Type

```graphql
input FieldLabelInput {
  localized: [LocalizedFieldLabelInput]
  en_US: String
  en_CA: String
  en_GB: String
  fr_CA: String
  en_MX: String
  es_MX: String
  en_IE: String
}
```

**Used By:**
- `FieldInput` (field: `label`)

**References:** [LocalizedFieldLabelInput](#localizedfieldlabelinput)

**Transforms To:** [FieldLabel](#fieldlabel)

**Note:** Legacy locale fields (en_US, etc.) deprecated in favor of `localized` array.

---

#### LocalizedFieldLabelInput
**Category:** Input Type

```graphql
input LocalizedFieldLabelInput {
  locale: String
  value: String
}
```

**Used By:**
- `FieldLabelInput` (field: `localized`)

**Transforms To:** [LocalizedFieldLabel](#localizedfieldlabel)

---

#### CampaignPageFAQInput
**Category:** Input Type

```graphql
input CampaignPageFAQInput {
  landing: CampaignPageStateFAQInput
  confirmation: CampaignPageStateFAQInput
}
```

**Used By:**
- `CampaignInput` (field: `faqs`)

**References:** [CampaignPageStateFAQInput](#campaignpagestatefaqinput)

**Transforms To:** [CampaignPageFAQ](#campaignpagefaq)

---

#### CampaignPageStateFAQInput
**Category:** Input Type

```graphql
input CampaignPageStateFAQInput {
  open: [ID]
  closed: [ID]
  activePresale: [ID]
}
```

**Used By:**
- `CampaignPageFAQInput` (fields: `landing`, `confirmation`)

**Transforms To:** [CampaignPageStateFAQ](#campaignpagestatefaq)

---

#### LocaleInput
**Category:** Input Type

```graphql
input LocaleInput {
  id: String
  is_default: Boolean
}
```

**Used By:**
- `CampaignInput` (fields: `currentLocale`, `locales`)

**Transforms To:** [Locale](#locale)

---

#### LocalizedContentInput
**Category:** Input Type

```graphql
input LocalizedContentInput {
  locale: String
  value: ContentInput
}
```

**Used By:**
- `CampaignContentInput` (field: `localized`)

**References:** [ContentInput](#contentinput)

**Transforms To:** [LocalizedContent](#localizedcontent)

---

#### CampaignSlackOptionsInput
**Category:** Input Type

```graphql
input CampaignSlackOptionsInput {
  channels: CampaignSlackChannelsInput
  noAlert: Boolean
}
```

**Used By:**
- `CampaignInput` (field: `slack`)

**References:** [CampaignSlackChannelsInput](#campaignslackchannelsinput)

**Transforms To:** [CampaignSlackOptions](#campaignslackoptions)

---

#### CampaignSlackChannelsInput
**Category:** Input Type

```graphql
input CampaignSlackChannelsInput {
  stats: [String]
}
```

**Used By:**
- `CampaignSlackOptionsInput` (field: `channels`)

**Transforms To:** [CampaignSlackChannels](#campaignslackchannels)

---

#### CampaignOptionsInput
**Category:** Input Type

```graphql
input CampaignOptionsInput {
  allowIntlPhones: Boolean
  promptConfirmPhone: Boolean
  showAccessCode: Boolean
  useGenericBranding: Boolean
  requirePassword: Boolean
  passwordValue: String
  queueId: ID
  requirePrecheck: CampaignPrecheckOptionsInput
  hideFaq: Boolean
  gate: CampaignGateInput
  linkableAttributes: [LinkableAttributeType]
  automatedReminders: Boolean
  waitingRoomDuration: Int
  isLNAA: Boolean
}
```

**Used By:**
- `CampaignInput` (field: `options`)

**References (Nested Input Types):**
- [CampaignPrecheckOptionsInput](#campaignprecheckoptionsinput)
- [CampaignGateInput](#campaigngateinput)

**Transforms To:** [CampaignOptions](#campaignoptions)

---

#### CampaignPrecheckOptionsInput
**Category:** Input Type

```graphql
input CampaignPrecheckOptionsInput {
  pastCampaignId: ID
}
```

**Used By:**
- `CampaignOptionsInput` (field: `requirePrecheck`)

**Transforms To:** [CampaignPrecheckOptions](#campaignprecheckoptions)

---

#### CampaignGateInput
**Category:** Input Type

```graphql
input CampaignGateInput {
  card: CampaignCardGate
  inviteOnly: FanIdentifier
  linkedAccount: CampaignLinkedAccountGate
  campaignId: ID
  linkedCampaign: ID
  idv: IDVTier
}
```

**Used By:**
- `CampaignOptionsInput` (field: `gate`)

**Transforms To:** [CampaignGate](#campaigngate)

---

#### CampaignSchemaInput
**Category:** Input Type

```graphql
input CampaignSchemaInput {
  version: String
}
```

**Used By:**
- `CampaignInput` (field: `schema`)

**Transforms To:** [CampaignSchema](#campaignschema)

---

#### TrackerInput
**Category:** Input Type

```graphql
input TrackerInput {
  type: String
  id: String
  src: String
  additional: JSON
}
```

**Used By:**
- `CampaignInput` (field: `trackers`)

**Transforms To:** [Tracker](#tracker)

---

#### GeoPointInput
**Category:** Input Type

```graphql
input GeoPointInput {
  latitude: Float
  longitude: Float
}
```

**Used By:**
- `MarketInput` (field: `point`)

**Transforms To:** [GeoPoint](#geopoint)

---

#### MarketEventInput
**Category:** Input Type

```graphql
input MarketEventInput {
  id: String
  ids: [ID]
  name: String
  date: String
  presaleDateTime: String
  ticketer: String
  venue: MarketVenueInput
  link: String
  sharedCode: String
  splitAllocation: SplitAllocationInput
}
```

**Used By:**
- `MarketInput` (field: `event`)

**References (Nested Input Types):**
- [MarketVenueInput](#marketvenueinput)
- [SplitAllocationInput](#splitallocationinput)

**Transforms To:** [MarketEvent](#marketevent)

---

#### MarketVenueInput
**Category:** Input Type

```graphql
input MarketVenueInput {
  name: String
}
```

**Used By:**
- `MarketEventInput` (field: `venue`)

**Transforms To:** [MarketVenue](#marketvenue)

---

#### SplitAllocationInput
**Category:** Input Type

```graphql
input SplitAllocationInput {
  type: SplitAllocationType!
  link: String
  isActive: Boolean
}
```

**Used By:**
- `MarketEventInput` (field: `splitAllocation`)

**Transforms To:** [SplitAllocation](#splitallocation)

---

#### ViewerInput
**Category:** Input Type

```graphql
input ViewerInput {
  firstName: String
  lastName: String
  email: String
  phone: String
  zip: String
}
```

**Used By:**
- `authenticate` mutation (argument: `viewerInput`)

**Transforms To:** [Viewer](#viewer) (partial update)

---

#### IdentityAuth
**Category:** Input Type

```graphql
input IdentityAuth {
  token: String
}
```

**Used By:**
- `authenticate` mutation (argument: `credentials`)
- `viewer` query (argument: `auth`)

**Purpose:** Authentication token wrapper for securing GraphQL operations.

---

#### WaveConfigInput
**Category:** Input Type

```graphql
input WaveConfigInput {
  categoryId: Int
  campaignId: ID
  totalLimit: Int
  generateOfferCode: Boolean!
  tiedToAccount: Boolean
  notifyDate: String!
}
```

**Used By:**
- `uploadWave` mutation (argument: `config`)

**Transforms To:** [Wave](#wave) (partial - wave creation config)

---

### Output Types

#### Campaign
**Category:** Interface (Abstract Output Type)

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

**Implemented By:**
- [RegistrationCampaign](#registrationcampaign)
- [FanlistCampaign](#fanlistcampaign)

**Returned By:**
- `viewer.campaign` query
- `upsertCampaign` mutation

**Transformed From:** [CampaignInput](#campaigninput)

**Differences from Input:**
- All fields are read-only
- Contains computed/enriched data from database
- Polymorphic type (interface) resolved to concrete implementation

---

#### RegistrationCampaign
**Category:** Output Type (implements Campaign interface)

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
  eligibileCounts(marketIds: [ID], includePrevSelected: Boolean, minScore: Float, maxScore: Float): EligibleCounts
  login_types: [String]
  slack: CampaignSlackOptions
  options: CampaignOptions
  identifier: FanIdentifier
  schema: CampaignSchema
  subType: CampaignSubtype
}
```

**Returned By:**
- `viewer.campaign` query (when campaign type is `registration`)
- `upsertCampaign` mutation (when creating/updating registration campaign)

**Transformed From:** [CampaignInput](#campaigninput)

**Additional Fields vs Input:**
- `market(marketId: String!): Market` - field resolver for single market lookup
- `entry: CampaignEntry` - computed entry data
- `eligibility: Eligibility` - computed eligibility status
- `eligibileCounts(...)` - computed eligibility metrics

**References (Nested Output Types):**
- [CampaignTour](#campaigntour)
- [CampaignArtist](#campaignartist)
- [CampaignDate](#campaigndate)
- [CampaignDomain](#campaigndomain)
- [Tracker](#tracker)
- [CampaignContent](#campaigncontent)
- [CampaignImages](#campaignimages)
- [Field](#field)
- [CampaignPageFAQ](#campaignpagefaq)
- [Market](#market)
- [Locale](#locale)
- [CampaignEntry](#campaignentry)
- [Eligibility](#eligibility)
- [EligibleCounts](#eligiblecounts)
- [CampaignSlackOptions](#campaignslackoptions)
- [CampaignOptions](#campaignoptions)
- [CampaignSchema](#campaignschema)

---

#### FanlistCampaign
**Category:** Output Type (implements Campaign interface)

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

**Returned By:**
- `viewer.campaign` query (when campaign type is `fanlist`)
- `upsertCampaign` mutation (when creating/updating fanlist campaign)

**Transformed From:** [CampaignInput](#campaigninput)

**Additional Fields vs Input:**
- `uploads: [FanlistUpload]` - upload history
- `exports: [Export]` - export history

**Unique Fields (not in RegistrationCampaign):**
- `eventIds: [ID]` - associated event IDs
- `scoring: FanlistScoring` - scoring algorithm type

**References (Nested Output Types):**
- [CampaignArtist](#campaignartist)
- [CampaignDate](#campaigndate)
- [FanlistUpload](#fanlistupload)
- [Export](#export)
- [CampaignSchema](#campaignschema)

---

#### CampaignArtist
**Category:** Output Type

```graphql
type CampaignArtist {
  id: String
  discovery_id: String
  name: String
  image_url: String
  needs_id: Boolean
  fanclubName: String
}
```

**Returned By:**
- `Campaign.artist` field
- `RegistrationCampaign.artist` field
- `FanlistCampaign.artist` field

**Transformed From:** [CampaignArtistInput](#campaignartistinput)

---

#### CampaignTour
**Category:** Output Type

```graphql
type CampaignTour {
  name: String
}
```

**Returned By:**
- `RegistrationCampaign.tour` field

**Transformed From:** [CampaignTourInput](#campaigntourinput)

---

#### CampaignDate
**Category:** Output Type

```graphql
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
```

**Returned By:**
- `Campaign.date` field

**Transformed From:** [CampaignDateInput](#campaigndateinput)

**Differences from Input:**
- Adds `updated` field (auto-updated timestamp)
- Adds `opened` field (computed when campaign opens)
- Adds `closed` field (computed when campaign closes)

---

#### CampaignDomain
**Category:** Output Type

```graphql
type CampaignDomain {
  site: String
  share: String
  preview: String
}
```

**Returned By:**
- `RegistrationCampaign.domain` field

**Transformed From:** [CampaignDomainInput](#campaigndomaininput)

---

#### CampaignContent
**Category:** Output Type

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
```

**Returned By:**
- `RegistrationCampaign.content` field

**Transformed From:** [CampaignContentInput](#campaigncontentinput)

**References:** [LocalizedContent](#localizedcontent), [Content](#content)

**Note:** Legacy locale fields deprecated in favor of `localized` array approach.

---

#### Content
**Category:** Output Type

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
```

**Returned By:**
- `CampaignContent.localized[].value` field
- Legacy locale fields in `CampaignContent`

**Transformed From:** [ContentInput](#contentinput)

**References (Nested Output Types):**
- [ContentBody](#contentbody)
- [ContentFAQ](#contentfaq)
- [ContentImages](#contentimages)
- [ContentEmail](#contentemail)
- [ContentShare](#contentshare)
- [ContentPhone](#contentphone)
- [ContentError](#contenterror)

---

#### ContentBody
**Category:** Output Type

```graphql
type ContentBody {
  started: ContentStarted
  finished: ContentFinished
  terms: ContentTerms
  signup: ContentSignup
  faqs: [ContentFAQ]
}
```

**Returned By:**
- `Content.body` field (with optional `onlyCurrent` filter)

**Transformed From:** [ContentBodyInput](#contentbodyinput)

**References (Nested Output Types):**
- [ContentStarted](#contentstarted)
- [ContentFinished](#contentfinished)
- [ContentTerms](#contentterms)
- [ContentSignup](#contentsignup)
- [ContentFAQ](#contentfaq)

---

#### ContentStarted
**Category:** Output Type

```graphql
type ContentStarted {
  welcome: ContentStartedWelcome
  registration: ContentStartedRegistration
  entry: ContentStartedEntry
}
```

**Returned By:**
- `ContentBody.started` field

**Transformed From:** [ContentStartedInput](#contentstartedinput)

---

#### ContentStartedWelcome
**Category:** Output Type

```graphql
type ContentStartedWelcome {
  above_button: String
  below_button: String
  header: String
  sign_in_button_content: String
  footer_content: String
}
```

**Returned By:**
- `ContentStarted.welcome` field

**Transformed From:** [ContentStartedWelcomeInput](#contentstartedwelcomeinput)

---

#### ContentStartedRegistration
**Category:** Output Type

```graphql
type ContentStartedRegistration {
  above_form: String
  below_form: String
  header: String
  above_button: String
  submit_button_content: String
}
```

**Returned By:**
- `ContentStarted.registration` field

**Transformed From:** [ContentStartedRegistrationInput](#contentstartedregistrationinput)

---

#### ContentStartedEntry
**Category:** Output Type

```graphql
type ContentStartedEntry {
  header: String
  top: String
  attributes: String
  main: String
}
```

**Returned By:**
- `ContentStarted.entry` field

**Transformed From:** [ContentStartedEntryInput](#contentstartedenryinput)

---

#### ContentFinished
**Category:** Output Type

```graphql
type ContentFinished {
  welcome: ContentFinishedWelcome
}
```

**Returned By:**
- `ContentBody.finished` field

**Transformed From:** [ContentFinishedInput](#contentfinishedinput)

---

#### ContentFinishedWelcome
**Category:** Output Type

```graphql
type ContentFinishedWelcome {
  main: String
  header: String
}
```

**Returned By:**
- `ContentFinished.welcome` field

**Transformed From:** [ContentFinishedWelcomeInput](#contentfinishedwelcomeinput)

---

#### ContentTerms
**Category:** Output Type

```graphql
type ContentTerms {
  main: String
}
```

**Returned By:**
- `ContentBody.terms` field

**Transformed From:** [ContentTermsInput](#contenttermsinput)

---

#### ContentSignup
**Category:** Output Type

```graphql
type ContentSignup {
  infoBody: String
}
```

**Returned By:**
- `ContentBody.signup` field

**Transformed From:** [ContentSignupInput](#contentsignupinput)

---

#### ContentFAQ
**Category:** Output Type

```graphql
type ContentFAQ {
  id: ID
  question: String
  answer: String
  hash_id: String
  title: String
  questions: [ContentFAQQuestion]
}
```

**Returned By:**
- `Content.faqs` field
- `ContentBody.faqs` field

**Transformed From:** [ContentFAQInput](#contentfaqinput)

**References:** [ContentFAQQuestion](#contentfaqquestion)

---

#### ContentFAQQuestion
**Category:** Output Type

```graphql
type ContentFAQQuestion {
  hash_id: String
  question: String
  answer: String
}
```

**Returned By:**
- `ContentFAQ.questions` field

**Transformed From:** [ContentFAQQuestionInput](#contentfaqquestioninput)

---

#### ContentImages
**Category:** Output Type

```graphql
type ContentImages {
  share: Image
  background: Image
  logo: Image
}
```

**Returned By:**
- `Content.image` field

**Transformed From:** [ContentImagesInput](#contentimagesinput)

**References:** [Image](#image)

---

#### ContentEmail
**Category:** Output Type

```graphql
type ContentEmail {
  subject: ContentEmailSubject
  template: ContentEmailTemplate
  from: ContentEmailFrom
}
```

**Returned By:**
- `Content.email` field

**Transformed From:** [ContentEmailInput](#contentemailinput)

**References (Nested Output Types):**
- [ContentEmailSubject](#contentemailsubject)
- [ContentEmailTemplate](#contentemailtemplate)
- [ContentEmailFrom](#contentemailfrom)

---

#### ContentEmailSubject
**Category:** Output Type

```graphql
type ContentEmailSubject {
  receipt: String
}
```

**Returned By:**
- `ContentEmail.subject` field

**Transformed From:** [ContentEmailSubjectInput](#contentemailsubjectinput)

---

#### ContentEmailTemplate
**Category:** Output Type

```graphql
type ContentEmailTemplate {
  confirm: String
  receipt: String
  share: String
}
```

**Returned By:**
- `ContentEmail.template` field

**Transformed From:** [ContentEmailTemplateInput](#contentemailtemplatingput)

---

#### ContentEmailFrom
**Category:** Output Type

```graphql
type ContentEmailFrom {
  name: String
  account: String
}
```

**Returned By:**
- `ContentEmail.from` field

**Transformed From:** [ContentEmailFromInput](#contentemailfrominput)

---

#### ContentShare
**Category:** Output Type

```graphql
type ContentShare {
  template: ContentShareTemplate
}
```

**Returned By:**
- `Content.share` field

**Transformed From:** [ContentShareInput](#contentshareinput)

**References:** [ContentShareTemplate](#contentsharetemplate)

---

#### ContentShareTemplate
**Category:** Output Type

```graphql
type ContentShareTemplate {
  twitter: String
  default: String
  facebook: String
  email_subject: String
  email_body: String
}
```

**Returned By:**
- `ContentShare.template` field

**Transformed From:** [ContentShareTemplateInput](#contentsharetemplatingput)

---

#### ContentPhone
**Category:** Output Type

```graphql
type ContentPhone {
  account: String
}
```

**Returned By:**
- `Content.phone` field

**Transformed From:** [ContentPhoneInput](#contentphoneinput)

---

#### ContentError
**Category:** Output Type

```graphql
type ContentError {
  code: String
  message: String
}
```

**Returned By:**
- `Content.errors` field

**Transformed From:** [ContentErrorInput](#contenterrorinput)

---

#### CampaignImages
**Category:** Output Type

```graphql
type CampaignImages {
  main: Image
  mobile: Image
  email: Image
  secondary: Image
}
```

**Returned By:**
- `RegistrationCampaign.image` field

**Transformed From:** [CampaignImagesInput](#campaignimagesinput)

**References:** [Image](#image)

---

#### Image
**Category:** Output Type

```graphql
type Image {
  url: String
  name: String
  width: Int
  height: Int
  alt_text: String
}
```

**Returned By:**
- Various image fields throughout the schema

**Transformed From:** [ImageInput](#imageinput)

**Differences from Input:**
- Adds `name` field (derived from URL or upload metadata)

---

#### Field
**Category:** Output Type

```graphql
type Field {
  id: String
  type: String
  is_optional: Boolean
  label: FieldLabel
  additional: JSON
}
```

**Returned By:**
- `RegistrationCampaign.preferences` field

**Transformed From:** [FieldInput](#fieldinput)

**References:** [FieldLabel](#fieldlabel)

---

#### FieldLabel
**Category:** Output Type

```graphql
type FieldLabel {
  localized: [LocalizedFieldLabel]
  en_US: String @deprecated(reason: "Use localized instead")
  en_CA: String @deprecated(reason: "Use localized instead")
  en_GB: String @deprecated(reason: "Use localized instead")
  fr_CA: String @deprecated(reason: "Use localized instead")
  en_MX: String @deprecated(reason: "Use localized instead")
  es_MX: String @deprecated(reason: "Use localized instead")
  en_IE: String @deprecated(reason: "Use localized instead")
}
```

**Returned By:**
- `Field.label` field

**Transformed From:** [FieldLabelInput](#fieldlabelinput)

**References:** [LocalizedFieldLabel](#localizedfieldlabel)

---

#### LocalizedFieldLabel
**Category:** Output Type

```graphql
type LocalizedFieldLabel {
  locale: String
  value: String
}
```

**Returned By:**
- `FieldLabel.localized` field

**Transformed From:** [LocalizedFieldLabelInput](#localizedfieldlabelinput)

---

#### CampaignPageFAQ
**Category:** Output Type

```graphql
type CampaignPageFAQ {
  landing: CampaignPageStateFAQ
  confirmation: CampaignPageStateFAQ
}
```

**Returned By:**
- `RegistrationCampaign.faqs` field

**Transformed From:** [CampaignPageFAQInput](#campaignpagefaqinput)

**References:** [CampaignPageStateFAQ](#campaignpagestatefaq)

---

#### CampaignPageStateFAQ
**Category:** Output Type

```graphql
type CampaignPageStateFAQ {
  open: [ID]
  closed: [ID]
  activePresale: [ID]
}
```

**Returned By:**
- `CampaignPageFAQ.landing` field
- `CampaignPageFAQ.confirmation` field

**Transformed From:** [CampaignPageStateFAQInput](#campaignpagestatefaqinput)

---

#### Market
**Category:** Output Type

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
```

**Returned By:**
- `RegistrationCampaign.markets` field
- `RegistrationCampaign.market(marketId)` field
- `upsertMarket` mutation

**Transformed From:** [MarketInput](#marketinput)

**References (Nested Output Types):**
- [GeoPoint](#geopoint)
- [MarketEvent](#marketevent)

---

#### GeoPoint
**Category:** Output Type

```graphql
type GeoPoint {
  latitude: Float
  longitude: Float
}
```

**Returned By:**
- `Market.point` field
- `DiscoveryVenue.point` field

**Transformed From:** [GeoPointInput](#geopointinput)

---

#### MarketEvent
**Category:** Output Type

```graphql
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
```

**Returned By:**
- `Market.event` field

**Transformed From:** [MarketEventInput](#marketeventinput)

**References (Nested Output Types):**
- [MarketVenue](#marketvenue)
- [SplitAllocation](#splitallocation)

---

#### MarketVenue
**Category:** Output Type

```graphql
type MarketVenue {
  name: String
}
```

**Returned By:**
- `MarketEvent.venue` field

**Transformed From:** [MarketVenueInput](#marketvenueinput)

---

#### SplitAllocation
**Category:** Output Type

```graphql
type SplitAllocation {
  link: String
  type: SplitAllocationType
  isActive: Boolean
}
```

**Returned By:**
- `MarketEvent.splitAllocation` field

**Transformed From:** [SplitAllocationInput](#splitallocationinput)

---

#### Locale
**Category:** Output Type

```graphql
type Locale {
  id: String
  is_default: Boolean
}
```

**Returned By:**
- `RegistrationCampaign.currentLocale` field
- `RegistrationCampaign.locales` field

**Transformed From:** [LocaleInput](#localeinput)

---

#### LocalizedContent
**Category:** Output Type

```graphql
type LocalizedContent {
  locale: String
  value: Content
}
```

**Returned By:**
- `CampaignContent.localized` field

**Transformed From:** [LocalizedContentInput](#localizedcontentinput)

**References:** [Content](#content)

---

#### CampaignSlackOptions
**Category:** Output Type

```graphql
type CampaignSlackOptions {
  channels: CampaignSlackChannels
  noAlert: Boolean
}
```

**Returned By:**
- `RegistrationCampaign.slack` field

**Transformed From:** [CampaignSlackOptionsInput](#campaignslackoptionsinput)

**References:** [CampaignSlackChannels](#campaignslackchannels)

---

#### CampaignSlackChannels
**Category:** Output Type

```graphql
type CampaignSlackChannels {
  stats: [String]
}
```

**Returned By:**
- `CampaignSlackOptions.channels` field

**Transformed From:** [CampaignSlackChannelsInput](#campaignslackchannelsinput)

---

#### CampaignOptions
**Category:** Output Type

```graphql
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
```

**Returned By:**
- `RegistrationCampaign.options` field

**Transformed From:** [CampaignOptionsInput](#campaignoptionsinput)

**References (Nested Output Types):**
- [CampaignPrecheckOptions](#campaignprecheckoptions)
- [CampaignGate](#campaigngate)

---

#### CampaignPrecheckOptions
**Category:** Output Type

```graphql
type CampaignPrecheckOptions {
  pastCampaignId: ID
}
```

**Returned By:**
- `CampaignOptions.requirePrecheck` field

**Transformed From:** [CampaignPrecheckOptionsInput](#campaignprecheckoptionsinput)

---

#### CampaignGate
**Category:** Output Type

```graphql
type CampaignGate {
  card: CampaignCardGate
  inviteOnly: FanIdentifier
  linkedAccount: CampaignLinkedAccountGate
  campaignId: ID
  linkedCampaign: ID
  idv: IDVTier
}
```

**Returned By:**
- `CampaignOptions.gate` field

**Transformed From:** [CampaignGateInput](#campaigngateinput)

---

#### CampaignSchema
**Category:** Output Type

```graphql
type CampaignSchema {
  version: String
}
```

**Returned By:**
- `Campaign.schema` field

**Transformed From:** [CampaignSchemaInput](#campaignschemainput)

---

#### Tracker
**Category:** Output Type

```graphql
type Tracker {
  type: String
  id: String
  src: String
  additional: JSON
}
```

**Returned By:**
- `RegistrationCampaign.trackers` field

**Transformed From:** [TrackerInput](#trackerinput)

---

#### CampaignEntry
**Category:** Output Type (Computed)

```graphql
type CampaignEntry {
  date: JSON
  attributes: JSON
  fields: JSON
}
```

**Returned By:**
- `RegistrationCampaign.entry` field (computed)

**Purpose:** Represents viewer's entry data for the campaign (not directly input)

---

#### Eligibility
**Category:** Output Type (Computed)

```graphql
type Eligibility {
  isEligible: Boolean!
  reason: ID
}
```

**Returned By:**
- `RegistrationCampaign.eligibility` field (computed)

**Purpose:** Computed eligibility status for current viewer

---

#### EligibleCounts
**Category:** Output Type (Computed)

```graphql
type EligibleCounts {
  count: Int
  byMarket: [EligibleCountsByMarket]
}
```

**Returned By:**
- `RegistrationCampaign.eligibileCounts` field (computed with filters)

**References:** [EligibleCountsByMarket](#eligiblecountsbymarket)

---

#### EligibleCountsByMarket
**Category:** Output Type (Computed)

```graphql
type EligibleCountsByMarket {
  marketId: ID!
  count: Int
  countsByPreferenceRank: [EligibleCountsByMarketPreferenceRank]
}
```

**Returned By:**
- `EligibleCounts.byMarket` field

**References:** [EligibleCountsByMarketPreferenceRank](#eligiblecountsbymarketpreferencerank)

---

#### EligibleCountsByMarketPreferenceRank
**Category:** Output Type (Computed)

```graphql
type EligibleCountsByMarketPreferenceRank {
  rank: Int
  count: Int
}
```

**Returned By:**
- `EligibleCountsByMarket.countsByPreferenceRank` field

---

#### FanlistUpload
**Category:** Output Type

```graphql
type FanlistUpload {
  date: String
  rows: Int
  rowsIn: Int
  status: String
}
```

**Returned By:**
- `FanlistCampaign.uploads` field

**Purpose:** Represents fanlist upload metadata

---

#### Export
**Category:** Output Type

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
```

**Returned By:**
- `FanlistCampaign.exports` field
- `scheduleExport` mutation
- `campaignExportList` query
- `campaignExport` query

**References (Nested Output Types):**
- [ExportDate](#exportdate)
- [ExportError](#exporterror)

---

#### ExportDate
**Category:** Output Type

```graphql
type ExportDate {
  created: String!
  started: String
  triggered: String
  pending: String
  finished: String
  failed: String
  expired: String
}
```

**Returned By:**
- `Export.date` field

---

#### ExportError
**Category:** Output Type

```graphql
type ExportError {
  message: String
  payload: String
  stack: String
}
```

**Returned By:**
- `Export.error` field

---

#### Viewer
**Category:** Output Type

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
```

**Returned By:**
- `viewer` query
- `authenticate` mutation
- `upsertViewerEntry` mutation

**References (Nested Output Types):**
- [ViewerAuth](#viewerauth)
- [Account](#account)
- [CurrentPhone](#currentphone)
- [Campaign](#campaign)
- [Campaigns](#campaigns)

---

#### ViewerAuth
**Category:** Output Type

```graphql
type ViewerAuth {
  token: String
  isSupreme: Boolean
  expiresAt: Int
  permissions: [CampaignPermissions]
}
```

**Returned By:**
- `Viewer.auth` field

**References:** [CampaignPermissions](#campaignpermissions)

---

#### CampaignPermissions
**Category:** Output Type

```graphql
type CampaignPermissions {
  campaignId: String
  actions: [String]
}
```

**Returned By:**
- `ViewerAuth.permissions` field

---

#### Account
**Category:** Output Type

```graphql
type Account {
  account: String
  is_confirmed: Boolean
}
```

**Returned By:**
- `Viewer.phones` field

---

#### CurrentPhone
**Category:** Output Type

```graphql
type CurrentPhone {
  masked: String
  country: String
  type: String
}
```

**Returned By:**
- `Viewer.currentPhone` field

---

#### Campaigns
**Category:** Output Type

```graphql
type Campaigns {
  list(limit: Int, skip: Int, sort: String, query: String, type: CampaignType, artistId: ID, version: String): [Campaign]
  categoryIds(presaleQueryStartDate: String!, presaleQueryEndDate: String!): [ID]
}
```

**Returned By:**
- `Viewer.campaigns` field

**Purpose:** Provides filtered campaign list and category IDs

---

#### DiscoveryArtist
**Category:** Output Type

```graphql
type DiscoveryArtist {
  id: String
  discovery_id: String
  name: String
  image_url: String
  needs_id: Boolean
}
```

**Returned By:**
- `searchArtists` query

**Purpose:** Artist search results from discovery service

---

#### DiscoveryVenue
**Category:** Output Type

```graphql
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

**Returned By:**
- `searchVenues` query

**References:** [GeoPoint](#geopoint)

**Purpose:** Venue search results from discovery service

---

#### Identity
**Category:** Output Type

```graphql
type Identity {
  url: String
  version: ID
  integratorId: ID
  placementId: ID
}
```

**Returned By:**
- `identity` query

**Purpose:** Identity service configuration

---

#### Ppc
**Category:** Output Type

```graphql
type Ppc {
  url: String
  id: ID
  token: ID
}
```

**Returned By:**
- `ppc` query

**Purpose:** PPC (Pre-purchase Check) service configuration

---

#### Codes
**Category:** Output Type

```graphql
type Codes {
  count(campaignId: ID!, type: String!, status: String): CodeCount
}
```

**Returned By:**
- `codes` query

**References:** [CodeCount](#codecount)

---

#### CodeCount
**Category:** Output Type

```graphql
type CodeCount {
  available: Int
  assigned: Int
  reserved: Int
}
```

**Returned By:**
- `Codes.count` field

---

#### Metrics
**Category:** Output Type

```graphql
type Metrics {
  entriesByMarketPreference(campaignId: ID!): [MarketPreferenceCounts]
  eligibleByMarketPreference(campaignId: ID!, includePrevSelected: Boolean, minScore: Float, maxScore: Float): [MarketPreferenceCounts]
  verifiedCountByMarket(campaignId: ID!, minScore: Float, maxScore: Float): [MarketEligibilityCount]
  totalSelectedByMarket(campaignId: ID!): [MarketEligibilityCount]
}
```

**Returned By:**
- `metrics` query

**References (Nested Output Types):**
- [MarketPreferenceCounts](#marketpreferencecounts)
- [MarketEligibilityCount](#marketeligibilitycount)

---

#### MarketPreferenceCounts
**Category:** Output Type

```graphql
type MarketPreferenceCounts {
  id: ID
  counts: [Int]
}
```

**Returned By:**
- `Metrics.entriesByMarketPreference` field
- `Metrics.eligibleByMarketPreference` field

---

#### MarketEligibilityCount
**Category:** Output Type

```graphql
type MarketEligibilityCount {
  id: ID
  count: Int
}
```

**Returned By:**
- `Metrics.verifiedCountByMarket` field
- `Metrics.totalSelectedByMarket` field

---

#### Scored
**Category:** Output Type

```graphql
type Scored {
  date: String!
  count: Int
  verifiedCount: Int
  path: String
}
```

**Returned By:**
- `campaignScoredList` query

**Purpose:** Scored list metadata for a campaign

---

#### WavePrep
**Category:** Output Type

```graphql
type WavePrep {
  date: WavePrepDate
  status: String!
  dateKey: String!
  error: WavePrepError
  path: String
  count: WavePrepCount
}
```

**Returned By:**
- `wavePrepList` query

**References (Nested Output Types):**
- [WavePrepDate](#waveprepdate)
- [WavePrepError](#wavepreperror)
- [WavePrepCount](#waveprepcount)

---

#### WavePrepDate
**Category:** Output Type

```graphql
type WavePrepDate {
  started: String
  finished: String
}
```

**Returned By:**
- `WavePrep.date` field

---

#### WavePrepError
**Category:** Output Type

```graphql
type WavePrepError {
  message: String
}
```

**Returned By:**
- `WavePrep.error` field

---

#### WavePrepCount
**Category:** Output Type

```graphql
type WavePrepCount {
  name: String
  eligible: Int
  selected: Int
  waitlisted: Int
  markets: [WavePrepCount]
}
```

**Returned By:**
- `WavePrep.count` field

**Note:** Recursive type - `markets` field contains nested `WavePrepCount` objects

---

#### Wave
**Category:** Output Type

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
```

**Returned By:**
- `waveList` query

**References (Nested Output Types):**
- [WaveDate](#wavedate)

---

#### WaveDate
**Category:** Output Type

```graphql
type WaveDate {
  scheduled: String
  notify: String
  begin: String
  end: String
}
```

**Returned By:**
- `Wave.date` field

---

#### Stat
**Category:** Output Type

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
```

**Returned By:**
- `stats` query
- `upsertStat` mutation

**References (Nested Output Types):**
- [StatsDate](#statsdate)
- [StatsError](#statserror)

---

#### StatsDate
**Category:** Output Type

```graphql
type StatsDate {
  created: String!
  updated: String
}
```

**Returned By:**
- `Stat.date` field

---

#### StatsError
**Category:** Output Type

```graphql
type StatsError {
  message: String
}
```

**Returned By:**
- `Stat.errors` field

---

#### File
**Category:** Output Type

```graphql
type File {
  url: String!
  name: String
  contentType: String
}
```

**Returned By:**
- `uploadBlacklist` mutation
- `uploadScored` mutation
- `uploadFanlist` mutation
- `uploadWavePrepFile` mutation

---

#### UploadCodesCount
**Category:** Output Type

```graphql
type UploadCodesCount {
  in: Int
  inserted: Int
  updated: Int
}
```

**Returned By:**
- `uploadCodes` mutation

---

#### UpdatedCount
**Category:** Output Type

```graphql
type UpdatedCount {
  count: Int
}
```

**Returned By:**
- `addTags` mutation
- `flipVerdicts` mutation

---

### Enums

#### CampaignType
**Category:** Enum

```graphql
enum CampaignType {
  registration
  fanlist
}
```

**Used As Input By:**
- `CampaignInput` (field: `type`)
- `Campaigns.list` query (argument: `type`)

**Used As Output By:**
- `Campaign.type` field

**Purpose:** Discriminator for Campaign interface implementation

---

#### CampaignSubtype
**Category:** Enum

```graphql
enum CampaignSubtype {
  fanclub
}
```

**Used As Input By:**
- `CampaignInput` (field: `subType`)

**Used As Output By:**
- `Campaign.subType` field

---

#### CampaignCardGate
**Category:** Enum

```graphql
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
```

**Used As Input By:**
- `CampaignGateInput` (field: `card`)

**Used As Output By:**
- `CampaignGate.card` field

**Purpose:** Credit card network gating options

---

#### CampaignLinkedAccountGate
**Category:** Enum

```graphql
enum CampaignLinkedAccountGate {
  VERIZON
  CITI
}
```

**Used As Input By:**
- `CampaignGateInput` (field: `linkedAccount`)

**Used As Output By:**
- `CampaignGate.linkedAccount` field

**Purpose:** Linked account provider gating options

---

#### IDVTier
**Category:** Enum

```graphql
enum IDVTier {
  asu
}
```

**Used As Input By:**
- `CampaignGateInput` (field: `idv`)

**Used As Output By:**
- `CampaignGate.idv` field

**Purpose:** Identity verification tier for gating

---

#### FanIdentifier
**Category:** Enum

```graphql
enum FanIdentifier {
  memberId
  globalUserId
  email
}
```

**Used As Input By:**
- `CampaignInput` (field: `identifier`)
- `CampaignGateInput` (field: `inviteOnly`)

**Used As Output By:**
- `Campaign.identifier` field
- `CampaignGate.inviteOnly` field

**Purpose:** Fan identification strategy for campaigns

---

#### FanlistScoring
**Category:** Enum

```graphql
enum FanlistScoring {
  raw
  xnum
}
```

**Used As Input By:**
- `CampaignInput` (field: `scoring`)

**Used As Output By:**
- `FanlistCampaign.scoring` field

**Purpose:** Fanlist scoring algorithm selection

---

#### LinkableAttributeType
**Category:** Enum

```graphql
enum LinkableAttributeType {
  card_citi
  card_amex
  card_capitalone
}
```

**Used As Input By:**
- `CampaignOptionsInput` (field: `linkableAttributes`)
- `refreshEntryAttribute` mutation (argument: `attribute`)

**Used As Output By:**
- `CampaignOptions.linkableAttributes` field

**Purpose:** Attributes that can be linked to fan accounts

---

#### SplitAllocationType
**Category:** Enum

```graphql
enum SplitAllocationType {
  concurrent
  sequential
}
```

**Used As Input By:**
- `SplitAllocationInput` (field: `type`)

**Used As Output By:**
- `SplitAllocation.type` field

**Purpose:** Split allocation strategy for events

---

#### WaveStatus
**Category:** Enum

```graphql
enum WaveStatus {
  scheduled
  triggered
  completed
  processing
  failed
}
```

**Used As Output By:**
- `Wave.status` field

**Purpose:** Wave processing status

---

#### WavePrepFileType
**Category:** Enum

```graphql
enum WavePrepFileType {
  markets
  tmCodes
  nonTmCodes
}
```

**Used As Input By:**
- `uploadWavePrepFile` mutation (argument: `type`)

**Purpose:** Type of wave prep file being uploaded

---

#### StatsType
**Category:** Enum

```graphql
enum StatsType {
  filterList
  selection
}
```

**Used As Input By:**
- `stats` query (argument: `type`)
- `upsertStat` mutation (argument: `type`)

**Used As Output By:**
- `Stat.type` field

**Purpose:** Type of statistics being tracked

---

#### StatsStatus
**Category:** Enum

```graphql
enum StatsStatus {
  PENDING
  PROCESSING
  FINISHED
  FAILED
}
```

**Used As Output By:**
- `Stat.status` field

**Purpose:** Statistics processing status

---

#### FilterType
**Category:** Enum

```graphql
enum FilterType {
  allow
  block
}
```

**Used As Input By:**
- `flipVerdicts` mutation (argument: `filterType`)

**Purpose:** Filter verdict type for flipping

---

### Scalars

#### JSON
**Category:** Custom Scalar

```graphql
scalar JSON
```

**Used Throughout Schema:**
- `CampaignInput.style`
- `CampaignInput.entry`
- `Content.meta`
- `Field.additional`
- `Tracker.additional`
- `Stat.meta`
- `Stat.count`
- Many other JSON fields

**Purpose:** Generic JSON data storage

---

#### Upload
**Category:** Custom Scalar

```graphql
scalar Upload
```

**Used As Input By:**
- `uploadCodes` mutation
- `uploadBlacklist` mutation
- `uploadScored` mutation
- `uploadFanlist` mutation
- `uploadWavePrepFile` mutation
- `uploadWave` mutation

**Purpose:** File upload handling (multipart form data)

---

## Type Dependency Graph

```
CampaignInput (Input)
  ├─ CampaignTourInput (Nested Input)
  ├─ CampaignArtistInput (Nested Input)
  ├─ CampaignDomainInput (Nested Input)
  ├─ TrackerInput (Nested Input)
  ├─ CampaignContentInput (Nested Input)
  │   ├─ LocalizedContentInput (Nested Input)
  │   │   └─ ContentInput (Nested Input)
  │   │       ├─ ContentBodyInput (Nested Input)
  │   │       │   ├─ ContentStartedInput (Nested Input)
  │   │       │   │   ├─ ContentStartedWelcomeInput (Nested Input)
  │   │       │   │   ├─ ContentStartedRegistrationInput (Nested Input)
  │   │       │   │   └─ ContentStartedEntryInput (Nested Input)
  │   │       │   ├─ ContentFinishedInput (Nested Input)
  │   │       │   │   └─ ContentFinishedWelcomeInput (Nested Input)
  │   │       │   ├─ ContentTermsInput (Nested Input)
  │   │       │   ├─ ContentSignupInput (Nested Input)
  │   │       │   └─ ContentFAQInput (Nested Input)
  │   │       │       └─ ContentFAQQuestionInput (Nested Input)
  │   │       ├─ ContentFAQInput (Nested Input) [duplicate reference]
  │   │       ├─ ContentImagesInput (Nested Input)
  │   │       │   └─ ImageInput (Nested Input)
  │   │       ├─ ContentEmailInput (Nested Input)
  │   │       │   ├─ ContentEmailSubjectInput (Nested Input)
  │   │       │   ├─ ContentEmailTemplateInput (Nested Input)
  │   │       │   └─ ContentEmailFromInput (Nested Input)
  │   │       ├─ ContentShareInput (Nested Input)
  │   │       │   └─ ContentShareTemplateInput (Nested Input)
  │   │       ├─ ContentPhoneInput (Nested Input)
  │   │       └─ ContentErrorInput (Nested Input)
  │   └─ ContentInput (legacy locale fields, deprecated)
  ├─ CampaignImagesInput (Nested Input)
  │   └─ ImageInput (Nested Input)
  ├─ FieldInput (Nested Input)
  │   └─ FieldLabelInput (Nested Input)
  │       └─ LocalizedFieldLabelInput (Nested Input)
  ├─ CampaignPageFAQInput (Nested Input)
  │   └─ CampaignPageStateFAQInput (Nested Input)
  ├─ MarketInput (Nested Input)
  │   ├─ GeoPointInput (Nested Input)
  │   └─ MarketEventInput (Nested Input)
  │       ├─ MarketVenueInput (Nested Input)
  │       └─ SplitAllocationInput (Nested Input)
  ├─ LocaleInput (Nested Input)
  ├─ CampaignDateInput (Nested Input)
  ├─ CampaignSlackOptionsInput (Nested Input)
  │   └─ CampaignSlackChannelsInput (Nested Input)
  ├─ CampaignOptionsInput (Nested Input)
  │   ├─ CampaignPrecheckOptionsInput (Nested Input)
  │   └─ CampaignGateInput (Nested Input)
  └─ CampaignSchemaInput (Nested Input)
     ↓ transforms to ↓
Campaign (Interface)
  → RegistrationCampaign (Output) [+ markets, entry, eligibility, options]
  │   ├─ CampaignTour (Nested Output)
  │   ├─ CampaignArtist (Nested Output)
  │   ├─ CampaignDate (Nested Output) [+ updated, opened, closed fields]
  │   ├─ CampaignDomain (Nested Output)
  │   ├─ Tracker (Nested Output)
  │   ├─ CampaignContent (Nested Output)
  │   │   └─ LocalizedContent (Nested Output)
  │   │       └─ Content (Nested Output)
  │   │           ├─ ContentBody (Nested Output)
  │   │           │   ├─ ContentStarted (Nested Output)
  │   │           │   ├─ ContentFinished (Nested Output)
  │   │           │   ├─ ContentTerms (Nested Output)
  │   │           │   ├─ ContentSignup (Nested Output)
  │   │           │   └─ ContentFAQ (Nested Output)
  │   │           ├─ ContentImages (Nested Output)
  │   │           │   └─ Image (Nested Output) [+ name field]
  │   │           ├─ ContentEmail (Nested Output)
  │   │           ├─ ContentShare (Nested Output)
  │   │           ├─ ContentPhone (Nested Output)
  │   │           └─ ContentError (Nested Output)
  │   ├─ CampaignImages (Nested Output)
  │   │   └─ Image (Nested Output)
  │   ├─ Field (Nested Output)
  │   │   └─ FieldLabel (Nested Output)
  │   │       └─ LocalizedFieldLabel (Nested Output)
  │   ├─ CampaignPageFAQ (Nested Output)
  │   │   └─ CampaignPageStateFAQ (Nested Output)
  │   ├─ Market (Nested Output)
  │   │   ├─ GeoPoint (Nested Output)
  │   │   └─ MarketEvent (Nested Output)
  │   │       ├─ MarketVenue (Nested Output)
  │   │       └─ SplitAllocation (Nested Output)
  │   ├─ Locale (Nested Output)
  │   ├─ CampaignSlackOptions (Nested Output)
  │   ├─ CampaignOptions (Nested Output)
  │   │   ├─ CampaignPrecheckOptions (Nested Output)
  │   │   └─ CampaignGate (Nested Output)
  │   ├─ CampaignSchema (Nested Output)
  │   ├─ CampaignEntry (Nested Output) [computed]
  │   ├─ Eligibility (Nested Output) [computed]
  │   └─ EligibleCounts (Nested Output) [computed]
  │       └─ EligibleCountsByMarket (Nested Output)
  │           └─ EligibleCountsByMarketPreferenceRank (Nested Output)
  → FanlistCampaign (Output) [+ eventIds, scoring, uploads, exports]
      ├─ CampaignArtist (Nested Output)
      ├─ CampaignDate (Nested Output)
      ├─ FanlistUpload (Nested Output)
      ├─ Export (Nested Output)
      │   ├─ ExportDate (Nested Output)
      │   └─ ExportError (Nested Output)
      └─ CampaignSchema (Nested Output)

MarketInput (Input)
  ├─ GeoPointInput (Nested Input)
  └─ MarketEventInput (Nested Input)
      ├─ MarketVenueInput (Nested Input)
      └─ SplitAllocationInput (Nested Input)
     ↓ transforms to ↓
Market (Output)
  ├─ GeoPoint (Nested Output)
  └─ MarketEvent (Nested Output)
      ├─ MarketVenue (Nested Output)
      └─ SplitAllocation (Nested Output)

ViewerInput (Input)
     ↓ partial update to ↓
Viewer (Output)
  ├─ ViewerAuth (Nested Output)
  │   └─ CampaignPermissions (Nested Output)
  ├─ Account (Nested Output)
  ├─ CurrentPhone (Nested Output)
  ├─ Campaign (Interface reference)
  └─ Campaigns (Nested Output)
```

### Legend
- (Input) - Used as mutation/query input
- (Output) - Returned from queries/mutations
- (Interface) - Abstract type resolved to concrete implementation
- (Nested Input/Output) - Referenced by other types
- [+ field] - Additional fields vs input
- [computed] - Calculated/derived field (not directly stored)
