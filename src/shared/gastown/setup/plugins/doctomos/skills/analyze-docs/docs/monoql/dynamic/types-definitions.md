# Type Definitions - monoql

## Overview

This document catalogs all explicit type definitions in the monoql GraphQL API. The API follows a consistent pattern of pairing Input types (for mutations/queries) with Output types (for responses), with transformations occurring in resolver functions.

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

**Transforms To:** [RegistrationCampaign](#registrationcampaign) or [FanlistCampaign](#fanlistcampaign) (output types)

**Data Flow:**
```
CampaignInput → upsertCampaign mutation → normalizeCampaignInput → Campaign Service → normalizeCampaignOutput → RegistrationCampaign/FanlistCampaign
```

**Transformation Logic:**
- Normalizes localized content (converts between localized arrays and keyed objects)
- Converts locale separators (dash to underscore)
- Sets schema version to '1'
- Transforms FAQ structures (array IDs to object keys)

---

#### CampaignTourInput
**Category:** Nested Input Type

```graphql
input CampaignTourInput {
  name: String
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**Transforms To:** [CampaignTour](#campaigntour)

---

#### CampaignArtistInput
**Category:** Nested Input Type

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

**Referenced By:**
- [CampaignInput](#campaigninput)

**Transforms To:** [CampaignArtist](#campaignartist)

---

#### CampaignDomainInput
**Category:** Nested Input Type

```graphql
input CampaignDomainInput {
  site: String
  share: String
  preview: String
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**Transforms To:** [CampaignDomain](#campaigndomain)

---

#### TrackerInput
**Category:** Nested Input Type

```graphql
input TrackerInput {
  type: String
  id: String
  src: String
  additional: JSON
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**Transforms To:** [Tracker](#tracker)

---

#### CampaignContentInput
**Category:** Nested Input Type

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

**Referenced By:**
- [CampaignInput](#campaigninput)

**References:**
- [LocalizedContentInput](#localizedcontentinput)
- [ContentInput](#contentinput)

**Transforms To:** [CampaignContent](#campaigncontent)

**Transformation Notes:**
- Localized array is converted to keyed locale objects
- Locale keys use dashes in input, underscores in output
- Deprecated locale-specific fields supported for backwards compatibility

---

#### LocalizedContentInput
**Category:** Nested Input Type

```graphql
input LocalizedContentInput {
  locale: String
  value: ContentInput
}
```

**Referenced By:**
- [CampaignContentInput](#campaigncontentinput)

**References:**
- [ContentInput](#contentinput)

**Transforms To:** [LocalizedContent](#localizedcontent)

---

#### ContentInput
**Category:** Nested Input Type

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

**Referenced By:**
- [LocalizedContentInput](#localizedcontentinput)
- [CampaignContentInput](#campaigncontentinput)

**References:**
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
**Category:** Nested Input Type

```graphql
input ContentBodyInput {
  started: ContentStartedInput
  finished: ContentFinishedInput
  terms: ContentTermsInput
  signup: ContentSignupInput
  faqs: [ContentFAQInput]
}
```

**Referenced By:**
- [ContentInput](#contentinput)

**References:**
- [ContentStartedInput](#contentstartedinput)
- [ContentFinishedInput](#contentfinishedinput)
- [ContentTermsInput](#contenttermsinput)
- [ContentSignupInput](#contentsignupinput)
- [ContentFAQInput](#contentfaqinput)

**Transforms To:** [ContentBody](#contentbody)

---

#### ContentStartedInput
**Category:** Nested Input Type

```graphql
input ContentStartedInput {
  welcome: ContentStartedWelcomeInput
  registration: ContentStartedRegistrationInput
  entry: ContentStartedEntryInput
}
```

**Referenced By:**
- [ContentBodyInput](#contentbodyinput)

**References:**
- [ContentStartedWelcomeInput](#contentstartedwelcomeinput)
- [ContentStartedRegistrationInput](#contentstartedregistrationinput)
- [ContentStartedEntryInput](#contentstartedentryinput)

**Transforms To:** [ContentStarted](#contentstarted)

---

#### ContentStartedWelcomeInput
**Category:** Nested Input Type

```graphql
input ContentStartedWelcomeInput {
  above_button: String
  below_button: String
  header: String
  sign_in_button_content: String
  footer_content: String
}
```

**Referenced By:**
- [ContentStartedInput](#contentstartedinput)

**Transforms To:** [ContentStartedWelcome](#contentstarted welcome)

---

#### ContentStartedRegistrationInput
**Category:** Nested Input Type

```graphql
input ContentStartedRegistrationInput {
  above_form: String
  below_form: String
  header: String
  above_button: String
  submit_button_content: String
}
```

**Referenced By:**
- [ContentStartedInput](#contentstartedinput)

**Transforms To:** [ContentStartedRegistration](#contentstartedregistration)

---

#### ContentStartedEntryInput
**Category:** Nested Input Type

```graphql
input ContentStartedEntryInput {
  header: String
  top: String
  attributes: String
  main: String
}
```

**Referenced By:**
- [ContentStartedInput](#contentstartedinput)

**Transforms To:** [ContentStartedEntry](#contentstartedentry)

---

#### ContentFinishedInput
**Category:** Nested Input Type

```graphql
input ContentFinishedInput {
  welcome: ContentFinishedWelcomeInput
}
```

**Referenced By:**
- [ContentBodyInput](#contentbodyinput)

**References:**
- [ContentFinishedWelcomeInput](#contentfinishedwelcomeinput)

**Transforms To:** [ContentFinished](#contentfinished)

---

#### ContentFinishedWelcomeInput
**Category:** Nested Input Type

```graphql
input ContentFinishedWelcomeInput {
  main: String
  header: String
}
```

**Referenced By:**
- [ContentFinishedInput](#contentfinishedinput)

**Transforms To:** [ContentFinishedWelcome](#contentfinishedwelcome)

---

#### ContentTermsInput
**Category:** Nested Input Type

```graphql
input ContentTermsInput {
  main: String
}
```

**Referenced By:**
- [ContentBodyInput](#contentbodyinput)

**Transforms To:** [ContentTerms](#contentterms)

---

#### ContentSignupInput
**Category:** Nested Input Type

```graphql
input ContentSignupInput {
  infoBody: String
}
```

**Referenced By:**
- [ContentBodyInput](#contentbodyinput)

**Transforms To:** [ContentSignup](#contentsignup)

---

#### ContentFAQInput
**Category:** Nested Input Type

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

**Referenced By:**
- [ContentInput](#contentinput)
- [ContentBodyInput](#contentbodyinput)

**References:**
- [ContentFAQQuestionInput](#contentfaqquestioninput)

**Transforms To:** [ContentFAQ](#contentfaq)

**Transformation Notes:**
- Array IDs are converted to object keys in the backend

---

#### ContentFAQQuestionInput
**Category:** Nested Input Type

```graphql
input ContentFAQQuestionInput {
  hash_id: String
  question: String
  answer: String
}
```

**Referenced By:**
- [ContentFAQInput](#contentfaqinput)

**Transforms To:** [ContentFAQQuestion](#contentfaqquestion)

---

#### ContentImagesInput
**Category:** Nested Input Type

```graphql
input ContentImagesInput {
  share: ImageInput
  background: ImageInput
  logo: ImageInput
}
```

**Referenced By:**
- [ContentInput](#contentinput)

**References:**
- [ImageInput](#imageinput)

**Transforms To:** [ContentImages](#contentimages)

---

#### ContentEmailInput
**Category:** Nested Input Type

```graphql
input ContentEmailInput {
  subject: ContentEmailSubjectInput
  template: ContentEmailTemplateInput
  from: ContentEmailFromInput
}
```

**Referenced By:**
- [ContentInput](#contentinput)

**References:**
- [ContentEmailSubjectInput](#contentemailsubjectinput)
- [ContentEmailTemplateInput](#contentemailtemplateinput)
- [ContentEmailFromInput](#contentemailfrominput)

**Transforms To:** [ContentEmail](#contentemail)

---

#### ContentEmailSubjectInput
**Category:** Nested Input Type

```graphql
input ContentEmailSubjectInput {
  receipt: String
}
```

**Referenced By:**
- [ContentEmailInput](#contentemailinput)

**Transforms To:** [ContentEmailSubject](#contentemailsubject)

---

#### ContentEmailTemplateInput
**Category:** Nested Input Type

```graphql
input ContentEmailTemplateInput {
  confirm: String
  receipt: String
  share: String
}
```

**Referenced By:**
- [ContentEmailInput](#contentemailinput)

**Transforms To:** [ContentEmailTemplate](#contentemailtemplate)

---

#### ContentEmailFromInput
**Category:** Nested Input Type

```graphql
input ContentEmailFromInput {
  name: String
  account: String
}
```

**Referenced By:**
- [ContentEmailInput](#contentemailinput)

**Transforms To:** [ContentEmailFrom](#contentemailfrom)

---

#### ContentShareInput
**Category:** Nested Input Type

```graphql
input ContentShareInput {
  template: ContentShareTemplateInput
}
```

**Referenced By:**
- [ContentInput](#contentinput)

**References:**
- [ContentShareTemplateInput](#contentsharetemplateinput)

**Transforms To:** [ContentShare](#contentshare)

---

#### ContentShareTemplateInput
**Category:** Nested Input Type

```graphql
input ContentShareTemplateInput {
  twitter: String
  default: String
  facebook: String
  email_subject: String
  email_body: String
}
```

**Referenced By:**
- [ContentShareInput](#contentshareinput)

**Transforms To:** [ContentShareTemplate](#contentsharetemplate)

---

#### ContentPhoneInput
**Category:** Nested Input Type

```graphql
input ContentPhoneInput {
  account: String
}
```

**Referenced By:**
- [ContentInput](#contentinput)

**Transforms To:** [ContentPhone](#contentphone)

---

#### ContentErrorInput
**Category:** Nested Input Type

```graphql
input ContentErrorInput {
  code: String
  message: String
}
```

**Referenced By:**
- [ContentInput](#contentinput)

**Transforms To:** [ContentError](#contenterror)

---

#### CampaignImagesInput
**Category:** Nested Input Type

```graphql
input CampaignImagesInput {
  main: ImageInput
  mobile: ImageInput
  email: ImageInput
  secondary: ImageInput
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**References:**
- [ImageInput](#imageinput)

**Transforms To:** [CampaignImages](#campaignimages)

---

#### ImageInput
**Category:** Nested Input Type

```graphql
input ImageInput {
  url: String
  width: Int
  height: Int
  alt_text: String
}
```

**Referenced By:**
- [CampaignImagesInput](#campaignimagesinput)
- [ContentImagesInput](#contentimagesinput)

**Transforms To:** [Image](#image)

**Differences from Output:**
- Input doesn't include `name` field (added by upload mutation)

---

#### FieldInput
**Category:** Nested Input Type

```graphql
input FieldInput {
  id: String
  type: String
  is_optional: Boolean
  label: FieldLabelInput
  additional: JSON
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**References:**
- [FieldLabelInput](#fieldlabelinput)

**Transforms To:** [Field](#field)

---

#### FieldLabelInput
**Category:** Nested Input Type

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

**Referenced By:**
- [FieldInput](#fieldinput)

**References:**
- [LocalizedFieldLabelInput](#localizedfieldlabelinput)

**Transforms To:** [FieldLabel](#fieldlabel)

---

#### LocalizedFieldLabelInput
**Category:** Nested Input Type

```graphql
input LocalizedFieldLabelInput {
  locale: String
  value: String
}
```

**Referenced By:**
- [FieldLabelInput](#fieldlabelinput)

**Transforms To:** [LocalizedFieldLabel](#localizedfieldlabel)

---

#### CampaignPageFAQInput
**Category:** Nested Input Type

```graphql
input CampaignPageFAQInput {
  landing: CampaignPageStateFAQInput
  confirmation: CampaignPageStateFAQInput
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**References:**
- [CampaignPageStateFAQInput](#campaignpagestatefaqinput)

**Transforms To:** [CampaignPageFAQ](#campaignpagefaq)

---

#### CampaignPageStateFAQInput
**Category:** Nested Input Type

```graphql
input CampaignPageStateFAQInput {
  open: [ID]
  closed: [ID]
  activePresale: [ID]
}
```

**Referenced By:**
- [CampaignPageFAQInput](#campaignpagefaqinput)

**Transforms To:** [CampaignPageStateFAQ](#campaignpagestatefaq)

---

#### MarketInput
**Category:** Nested Input Type

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
- Referenced by [CampaignInput](#campaigninput)

**References:**
- [GeoPointInput](#geopointinput)
- [MarketEventInput](#marketeventinput)

**Transforms To:** [Market](#market)

**Transformation Logic:**
- GeoPoint coordinates array is converted to object with latitude/longitude

---

#### GeoPointInput
**Category:** Nested Input Type

```graphql
input GeoPointInput {
  latitude: Float
  longitude: Float
}
```

**Referenced By:**
- [MarketInput](#marketinput)

**Transforms To:** [GeoPoint](#geopoint)

**Transformation Logic:**
```javascript
// Input: { latitude: 34.05, longitude: -118.24 }
// Backend: { type: 'Point', coordinates: [34.05, -118.24] }
// Output: { latitude: 34.05, longitude: -118.24 }
```

---

#### MarketEventInput
**Category:** Nested Input Type

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

**Referenced By:**
- [MarketInput](#marketinput)

**References:**
- [MarketVenueInput](#marketvenueinput)
- [SplitAllocationInput](#splitallocationinput)

**Transforms To:** [MarketEvent](#marketevent)

---

#### MarketVenueInput
**Category:** Nested Input Type

```graphql
input MarketVenueInput {
  name: String
}
```

**Referenced By:**
- [MarketEventInput](#marketeventinput)

**Transforms To:** [MarketVenue](#marketvenue)

---

#### SplitAllocationInput
**Category:** Nested Input Type

```graphql
input SplitAllocationInput {
  type: SplitAllocationType!
  link: String
  isActive: Boolean
}
```

**Referenced By:**
- [MarketEventInput](#marketeventinput)

**Transforms To:** [SplitAllocation](#splitallocation)

---

#### LocaleInput
**Category:** Nested Input Type

```graphql
input LocaleInput {
  id: String
  is_default: Boolean
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**Transforms To:** [Locale](#locale)

**Transformation Notes:**
- Locale IDs are normalized (dash to underscore conversion)

---

#### CampaignDateInput
**Category:** Nested Input Type

```graphql
input CampaignDateInput {
  created: String
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
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**Transforms To:** [CampaignDate](#campaigndate)

**Differences from Output:**
- Output includes additional fields: `updated`, `opened`, `closed`

---

#### CampaignSlackOptionsInput
**Category:** Nested Input Type

```graphql
input CampaignSlackOptionsInput {
  channels: CampaignSlackChannelsInput
  noAlert: Boolean
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**References:**
- [CampaignSlackChannelsInput](#campaignslackchannelsinput)

**Transforms To:** [CampaignSlackOptions](#campaignslackoptions)

---

#### CampaignSlackChannelsInput
**Category:** Nested Input Type

```graphql
input CampaignSlackChannelsInput {
  stats: [String]
}
```

**Referenced By:**
- [CampaignSlackOptionsInput](#campaignslackoptionsinput)

**Transforms To:** [CampaignSlackChannels](#campaignslackchannels)

---

#### CampaignOptionsInput
**Category:** Nested Input Type

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

**Referenced By:**
- [CampaignInput](#campaigninput)

**References:**
- [CampaignPrecheckOptionsInput](#campaignprecheckoptionsinput)
- [CampaignGateInput](#campaigngateinput)

**Transforms To:** [CampaignOptions](#campaignoptions)

---

#### CampaignPrecheckOptionsInput
**Category:** Nested Input Type

```graphql
input CampaignPrecheckOptionsInput {
  pastCampaignId: ID
}
```

**Referenced By:**
- [CampaignOptionsInput](#campaignoptionsinput)

**Transforms To:** [CampaignPrecheckOptions](#campaignprecheckoptions)

---

#### CampaignGateInput
**Category:** Nested Input Type

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

**Referenced By:**
- [CampaignOptionsInput](#campaignoptionsinput)

**Transforms To:** [CampaignGate](#campaigngate)

---

#### CampaignSchemaInput
**Category:** Nested Input Type

```graphql
input CampaignSchemaInput {
  version: String
}
```

**Referenced By:**
- [CampaignInput](#campaigninput)

**Transforms To:** [CampaignSchema](#campaignschema)

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

---

#### PromoterInput
**Category:** Input Type

```graphql
input PromoterInput {
  id: String
  name: String!
  privacyUrls: [LocalizedUrlInput]
}
```

**Used By:**
- `upsertPromoter` mutation (argument: `promoter`)

**References:**
- [LocalizedUrlInput](#localizedurlinput)

**Transforms To:** [Promoter](#promoter)

---

#### LocalizedUrlInput
**Category:** Nested Input Type

```graphql
input LocalizedUrlInput {
  locale: String!
  url: String!
  is_default: Boolean
}
```

**Referenced By:**
- [PromoterInput](#promoterinput)

**Transforms To:** [LocalizedUrl](#localizedurl)

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

**Transforms To:** [Wave](#wave) (after processing)

---

### Output Types

#### Campaign (Interface)
**Category:** Interface

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

**Used By:**
- `upsertCampaign` mutation (return type)
- `viewer.campaign` query
- `viewer.campaigns.list` query

---

#### RegistrationCampaign
**Category:** Output Type (implements Campaign)

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
- `upsertCampaign` mutation
- `viewer.campaign` query (when type is 'registration')
- `viewer.campaigns.list` query

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

**Transformed From:** [CampaignInput](#campaigninput)

**Differences from Input:**
- Adds `status` field (computed from state)
- Adds computed fields: `entry`, `eligibility`, `eligibileCounts`
- Adds `market` and `markets` field resolvers (loaded from backend)
- `currentLocale` computed from backend state
- Content is transformed with localization normalization

---

#### FanlistCampaign
**Category:** Output Type (implements Campaign)

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
- `upsertCampaign` mutation
- `viewer.campaign` query (when type is 'fanlist')
- `viewer.campaigns.list` query

**References:**
- [CampaignArtist](#campaignartist)
- [CampaignDate](#campaigndate)
- [FanlistUpload](#fanlistupload)
- [Export](#export)
- [CampaignSchema](#campaignschema)

**Transformed From:** [CampaignInput](#campaigninput)

**Differences from RegistrationCampaign:**
- Fanlist-specific fields: `eventIds`, `scoring`, `uploads`, `exports`
- No markets, preferences, content, images
- Simpler structure focused on data upload and export

---

#### CampaignTour
**Category:** Nested Output Type

```graphql
type CampaignTour {
  name: String
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**Transformed From:** [CampaignTourInput](#campaigntourinput)

---

#### CampaignArtist
**Category:** Nested Output Type

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

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)
- [FanlistCampaign](#fanlistcampaign)
- Campaign interface

**Transformed From:** [CampaignArtistInput](#campaignartistinput)

---

#### CampaignDate
**Category:** Nested Output Type

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
  sendEmailReminders: String
  sendReminderEmails: [String]
  triggeredEmailReminders: String
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)
- [FanlistCampaign](#fanlistcampaign)
- Campaign interface

**Transformed From:** [CampaignDateInput](#campaigndateinput)

**Differences from Input:**
- Adds `updated`, `opened`, `closed` fields (set by backend)

---

#### CampaignDomain
**Category:** Nested Output Type

```graphql
type CampaignDomain {
  site: String
  share: String
  preview: String
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**Transformed From:** [CampaignDomainInput](#campaigndomaininput)

---

#### Tracker
**Category:** Nested Output Type

```graphql
type Tracker {
  type: String
  id: String
  src: String
  additional: JSON
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**Transformed From:** [TrackerInput](#trackerinput)

---

#### CampaignContent
**Category:** Nested Output Type

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

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**References:**
- [LocalizedContent](#localizedcontent)
- [Content](#content)

**Transformed From:** [CampaignContentInput](#campaigncontentinput)

**Transformation Notes:**
- Deprecated locale-specific fields maintained for backwards compatibility
- Localized array is primary access pattern

---

#### LocalizedContent
**Category:** Nested Output Type

```graphql
type LocalizedContent {
  locale: String
  value: Content
}
```

**Referenced By:**
- [CampaignContent](#campaigncontent)

**References:**
- [Content](#content)

**Transformed From:** [LocalizedContentInput](#localizedcontentinput)

---

#### Content
**Category:** Nested Output Type

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

**Referenced By:**
- [LocalizedContent](#localizedcontent)
- [CampaignContent](#campaigncontent)

**References:**
- [ContentBody](#contentbody)
- [ContentFAQ](#contentfaq)
- [ContentImages](#contentimages)
- [ContentEmail](#contentemail)
- [ContentShare](#contentshare)
- [ContentPhone](#contentphone)
- [ContentError](#contenterror)

**Transformed From:** [ContentInput](#contentinput)

**Special Fields:**
- `body` accepts `onlyCurrent` parameter to filter content by version

---

#### ContentBody
**Category:** Nested Output Type

```graphql
type ContentBody {
  started: ContentStarted
  finished: ContentFinished
  terms: ContentTerms
  signup: ContentSignup
  faqs: [ContentFAQ]
}
```

**Referenced By:**
- [Content](#content)

**References:**
- [ContentStarted](#contentstarted)
- [ContentFinished](#contentfinished)
- [ContentTerms](#contentterms)
- [ContentSignup](#contentsignup)
- [ContentFAQ](#contentfaq)

**Transformed From:** [ContentBodyInput](#contentbodyinput)

**Schema Version Notes:**
- V1 schema: `started`, `finished`, `terms`
- V2 schema: `signup`, `faqs`

---

#### ContentStarted
**Category:** Nested Output Type

```graphql
type ContentStarted {
  welcome: ContentStartedWelcome
  registration: ContentStartedRegistration
  entry: ContentStartedEntry
}
```

**Referenced By:**
- [ContentBody](#contentbody)

**References:**
- [ContentStartedWelcome](#contentstartedwelcome)
- [ContentStartedRegistration](#contentstartedregistration)
- [ContentStartedEntry](#contentstartedentry)

**Transformed From:** [ContentStartedInput](#contentstartedinput)

---

#### ContentStartedWelcome
**Category:** Nested Output Type

```graphql
type ContentStartedWelcome {
  above_button: String
  below_button: String
  header: String
  sign_in_button_content: String
  footer_content: String
}
```

**Referenced By:**
- [ContentStarted](#contentstarted)

**Transformed From:** [ContentStartedWelcomeInput](#contentstartedwelcomeinput)

---

#### ContentStartedRegistration
**Category:** Nested Output Type

```graphql
type ContentStartedRegistration {
  above_form: String
  below_form: String
  header: String
  above_button: String
  submit_button_content: String
}
```

**Referenced By:**
- [ContentStarted](#contentstarted)

**Transformed From:** [ContentStartedRegistrationInput](#contentstartedregistrationinput)

---

#### ContentStartedEntry
**Category:** Nested Output Type

```graphql
type ContentStartedEntry {
  header: String
  top: String
  attributes: String
  main: String
}
```

**Referenced By:**
- [ContentStarted](#contentstarted)

**Transformed From:** [ContentStartedEntryInput](#contentstartedentryinput)

---

#### ContentFinished
**Category:** Nested Output Type

```graphql
type ContentFinished {
  welcome: ContentFinishedWelcome
}
```

**Referenced By:**
- [ContentBody](#contentbody)

**References:**
- [ContentFinishedWelcome](#contentfinishedwelcome)

**Transformed From:** [ContentFinishedInput](#contentfinishedinput)

---

#### ContentFinishedWelcome
**Category:** Nested Output Type

```graphql
type ContentFinishedWelcome {
  main: String
  header: String
}
```

**Referenced By:**
- [ContentFinished](#contentfinished)

**Transformed From:** [ContentFinishedWelcomeInput](#contentfinishedwelcomeinput)

---

#### ContentTerms
**Category:** Nested Output Type

```graphql
type ContentTerms {
  main: String
}
```

**Referenced By:**
- [ContentBody](#contentbody)

**Transformed From:** [ContentTermsInput](#contenttermsinput)

---

#### ContentSignup
**Category:** Nested Output Type

```graphql
type ContentSignup {
  infoBody: String
}
```

**Referenced By:**
- [ContentBody](#contentbody)

**Transformed From:** [ContentSignupInput](#contentsignupinput)

---

#### ContentFAQ
**Category:** Nested Output Type

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

**Referenced By:**
- [Content](#content)
- [ContentBody](#contentbody)

**References:**
- [ContentFAQQuestion](#contentfaqquestion)

**Transformed From:** [ContentFAQInput](#contentfaqinput)

---

#### ContentFAQQuestion
**Category:** Nested Output Type

```graphql
type ContentFAQQuestion {
  hash_id: String
  question: String
  answer: String
}
```

**Referenced By:**
- [ContentFAQ](#contentfaq)

**Transformed From:** [ContentFAQQuestionInput](#contentfaqquestioninput)

---

#### ContentImages
**Category:** Nested Output Type

```graphql
type ContentImages {
  share: Image
  background: Image
  logo: Image
}
```

**Referenced By:**
- [Content](#content)

**References:**
- [Image](#image)

**Transformed From:** [ContentImagesInput](#contentimagesinput)

---

#### ContentEmail
**Category:** Nested Output Type

```graphql
type ContentEmail {
  subject: ContentEmailSubject
  template: ContentEmailTemplate
  from: ContentEmailFrom
}
```

**Referenced By:**
- [Content](#content)

**References:**
- [ContentEmailSubject](#contentemailsubject)
- [ContentEmailTemplate](#contentemailtemplate)
- [ContentEmailFrom](#contentemailfrom)

**Transformed From:** [ContentEmailInput](#contentemailinput)

---

#### ContentEmailSubject
**Category:** Nested Output Type

```graphql
type ContentEmailSubject {
  receipt: String
}
```

**Referenced By:**
- [ContentEmail](#contentemail)

**Transformed From:** [ContentEmailSubjectInput](#contentemailsubjectinput)

---

#### ContentEmailTemplate
**Category:** Nested Output Type

```graphql
type ContentEmailTemplate {
  confirm: String
  receipt: String
  share: String
}
```

**Referenced By:**
- [ContentEmail](#contentemail)

**Transformed From:** [ContentEmailTemplateInput](#contentemailtemplateinput)

---

#### ContentEmailFrom
**Category:** Nested Output Type

```graphql
type ContentEmailFrom {
  name: String
  account: String
}
```

**Referenced By:**
- [ContentEmail](#contentemail)

**Transformed From:** [ContentEmailFromInput](#contentemailfrominput)

---

#### ContentShare
**Category:** Nested Output Type

```graphql
type ContentShare {
  template: ContentShareTemplate
}
```

**Referenced By:**
- [Content](#content)

**References:**
- [ContentShareTemplate](#contentsharetemplate)

**Transformed From:** [ContentShareInput](#contentshareinput)

---

#### ContentShareTemplate
**Category:** Nested Output Type

```graphql
type ContentShareTemplate {
  twitter: String
  default: String
  facebook: String
  email_subject: String
  email_body: String
}
```

**Referenced By:**
- [ContentShare](#contentshare)

**Transformed From:** [ContentShareTemplateInput](#contentsharetemplateinput)

---

#### ContentPhone
**Category:** Nested Output Type

```graphql
type ContentPhone {
  account: String
}
```

**Referenced By:**
- [Content](#content)

**Transformed From:** [ContentPhoneInput](#contentphoneinput)

---

#### ContentError
**Category:** Nested Output Type

```graphql
type ContentError {
  code: String
  message: String
}
```

**Referenced By:**
- [Content](#content)

**Transformed From:** [ContentErrorInput](#contenterrorinput)

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

**References:**
- [Image](#image)

**Transformed From:** [CampaignImagesInput](#campaignimagesinput)

---

#### Image
**Category:** Nested Output Type

```graphql
type Image {
  url: String
  name: String
  width: Int
  height: Int
  alt_text: String
}
```

**Referenced By:**
- [CampaignImages](#campaignimages)
- [ContentImages](#contentimages)

**Returned By:**
- `uploadImage` mutation

**Transformed From:** [ImageInput](#imageinput)

**Differences from Input:**
- Output includes `name` field (added during upload)

---

#### Field
**Category:** Nested Output Type

```graphql
type Field {
  id: String
  type: String
  is_optional: Boolean
  label: FieldLabel
  additional: JSON
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**References:**
- [FieldLabel](#fieldlabel)

**Transformed From:** [FieldInput](#fieldinput)

---

#### FieldLabel
**Category:** Nested Output Type

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

**Referenced By:**
- [Field](#field)

**References:**
- [LocalizedFieldLabel](#localizedfieldlabel)

**Transformed From:** [FieldLabelInput](#fieldlabelinput)

---

#### LocalizedFieldLabel
**Category:** Nested Output Type

```graphql
type LocalizedFieldLabel {
  locale: String
  value: String
}
```

**Referenced By:**
- [FieldLabel](#fieldlabel)

**Transformed From:** [LocalizedFieldLabelInput](#localizedfieldlabelinput)

---

#### CampaignPageFAQ
**Category:** Nested Output Type

```graphql
type CampaignPageFAQ {
  landing: CampaignPageStateFAQ
  confirmation: CampaignPageStateFAQ
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**References:**
- [CampaignPageStateFAQ](#campaignpagestatefaq)

**Transformed From:** [CampaignPageFAQInput](#campaignpagefaqinput)

---

#### CampaignPageStateFAQ
**Category:** Nested Output Type

```graphql
type CampaignPageStateFAQ {
  open: [ID]
  closed: [ID]
  activePresale: [ID]
}
```

**Referenced By:**
- [CampaignPageFAQ](#campaignpagefaq)

**Transformed From:** [CampaignPageStateFAQInput](#campaignpagestatefaqinput)

---

#### Market
**Category:** Nested Output Type

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

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign) (via `market` and `markets` fields)

**Returned By:**
- `upsertMarket` mutation
- `cloneMarkets` mutation

**References:**
- [GeoPoint](#geopoint)
- [MarketEvent](#marketevent)

**Transformed From:** [MarketInput](#marketinput)

---

#### GeoPoint
**Category:** Nested Output Type

```graphql
type GeoPoint {
  latitude: Float
  longitude: Float
}
```

**Referenced By:**
- [Market](#market)
- [DiscoveryVenue](#discoveryvenue)

**Transformed From:** [GeoPointInput](#geopointinput)

---

#### MarketEvent
**Category:** Nested Output Type

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

**Referenced By:**
- [Market](#market)

**References:**
- [MarketVenue](#marketvenue)
- [SplitAllocation](#splitallocation)

**Transformed From:** [MarketEventInput](#marketeventinput)

---

#### MarketVenue
**Category:** Nested Output Type

```graphql
type MarketVenue {
  name: String
}
```

**Referenced By:**
- [MarketEvent](#marketevent)

**Transformed From:** [MarketVenueInput](#marketvenueinput)

---

#### SplitAllocation
**Category:** Nested Output Type

```graphql
type SplitAllocation {
  link: String
  type: SplitAllocationType
  isActive: Boolean
}
```

**Referenced By:**
- [MarketEvent](#marketevent)

**Transformed From:** [SplitAllocationInput](#splitallocationinput)

---

#### Locale
**Category:** Nested Output Type

```graphql
type Locale {
  id: String
  is_default: Boolean
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**Transformed From:** [LocaleInput](#localeinput)

---

#### CampaignEntry
**Category:** Nested Output Type

```graphql
type CampaignEntry {
  date: JSON
  attributes: JSON
  fields: JSON
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**Notes:**
- Loaded from entries service (not directly from input)

---

#### CampaignSlackOptions
**Category:** Nested Output Type

```graphql
type CampaignSlackOptions {
  channels: CampaignSlackChannels
  noAlert: Boolean
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**References:**
- [CampaignSlackChannels](#campaignslackchannels)

**Transformed From:** [CampaignSlackOptionsInput](#campaignslackoptionsinput)

---

#### CampaignSlackChannels
**Category:** Nested Output Type

```graphql
type CampaignSlackChannels {
  stats: [String]
}
```

**Referenced By:**
- [CampaignSlackOptions](#campaignslackoptions)

**Transformed From:** [CampaignSlackChannelsInput](#campaignslackchannelsinput)

---

#### CampaignOptions
**Category:** Nested Output Type

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
  isLNAA: Boolean
  gate: CampaignGate
  linkableAttributes: [LinkableAttributeType]
  automatedReminders: Boolean
  waitingRoomDuration: Int
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)

**References:**
- [CampaignPrecheckOptions](#campaignprecheckoptions)
- [CampaignGate](#campaigngate)

**Transformed From:** [CampaignOptionsInput](#campaignoptionsinput)

---

#### CampaignPrecheckOptions
**Category:** Nested Output Type

```graphql
type CampaignPrecheckOptions {
  pastCampaignId: ID
}
```

**Referenced By:**
- [CampaignOptions](#campaignoptions)

**Transformed From:** [CampaignPrecheckOptionsInput](#campaignprecheckoptionsinput)

---

#### CampaignGate
**Category:** Nested Output Type

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

**Referenced By:**
- [CampaignOptions](#campaignoptions)

**Transformed From:** [CampaignGateInput](#campaigngateinput)

---

#### CampaignSchema
**Category:** Nested Output Type

```graphql
type CampaignSchema {
  version: String
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign)
- [FanlistCampaign](#fanlistcampaign)
- Campaign interface

**Transformed From:** [CampaignSchemaInput](#campaignschemainput)

---

#### FanlistUpload
**Category:** Nested Output Type

```graphql
type FanlistUpload {
  date: String
  rows: Int
  rowsIn: Int
  status: String
}
```

**Referenced By:**
- [FanlistCampaign](#fanlistcampaign)

**Notes:**
- Loaded from S3 manifest file (not directly from input)

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

**References:**
- [ViewerAuth](#viewerauth)
- [Account](#account)
- [CurrentPhone](#currentphone)
- [Campaign](#campaign)
- [Campaigns](#campaigns)

**Partially Updated From:** [ViewerInput](#viewerinput)

---

#### ViewerAuth
**Category:** Nested Output Type

```graphql
type ViewerAuth {
  token: String
  isSupreme: Boolean
  expiresAt: Int
  permissions: [CampaignPermissions]
}
```

**Referenced By:**
- [Viewer](#viewer)

**References:**
- [CampaignPermissions](#campaignpermissions)

---

#### CampaignPermissions
**Category:** Nested Output Type

```graphql
type CampaignPermissions {
  campaignId: String
  actions: [String]
}
```

**Referenced By:**
- [ViewerAuth](#viewerauth)

---

#### Account
**Category:** Nested Output Type

```graphql
type Account {
  account: String
  is_confirmed: Boolean
}
```

**Referenced By:**
- [Viewer](#viewer)

---

#### CurrentPhone
**Category:** Nested Output Type

```graphql
type CurrentPhone {
  masked: String
  country: String
  type: String
}
```

**Referenced By:**
- [Viewer](#viewer)

---

#### Campaigns
**Category:** Nested Output Type

```graphql
type Campaigns {
  list(limit: Int, skip: Int, sort: String, query: String, type: CampaignType, artistId: ID, version: String): [Campaign]
  categoryIds(presaleQueryStartDate: String!, presaleQueryEndDate: String!): [ID]
}
```

**Referenced By:**
- [Viewer](#viewer)

**Notes:**
- Not a standalone type, but a resolver namespace

---

#### Eligibility
**Category:** Nested Output Type

```graphql
type Eligibility {
  isEligible: Boolean!
  reason: ID
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign) (via `eligibility` field)

---

#### EligibleCounts
**Category:** Nested Output Type

```graphql
type EligibleCounts {
  count: Int
  byMarket: [EligibleCountsByMarket]
}
```

**Referenced By:**
- [RegistrationCampaign](#registrationcampaign) (via `eligibileCounts` field)

**References:**
- [EligibleCountsByMarket](#eligiblecountsbymarket)

---

#### EligibleCountsByMarket
**Category:** Nested Output Type

```graphql
type EligibleCountsByMarket {
  marketId: ID!
  count: Int
  countsByPreferenceRank: [EligibleCountsByMarketPreferenceRank]
}
```

**Referenced By:**
- [EligibleCounts](#eligiblecounts)

**References:**
- [EligibleCountsByMarketPreferenceRank](#eligiblecountsbymarketpreferencerank)

---

#### EligibleCountsByMarketPreferenceRank
**Category:** Nested Output Type

```graphql
type EligibleCountsByMarketPreferenceRank {
  rank: Int
  count: Int
}
```

**Referenced By:**
- [EligibleCountsByMarket](#eligiblecountsbymarket)

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
  country: String
  zip: String
  timezone: String
  point: GeoPoint
}
```

**Returned By:**
- `searchVenues` query

**References:**
- [GeoPoint](#geopoint)

**Transformation Logic:**
```javascript
// Backend returns: { point: { coordinates: [lng, lat] } }
// Output returns: { point: { latitude: lat, longitude: lng } }
```

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

**Notes:**
- Configuration for Ticketmaster Identity service

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

**Notes:**
- Configuration for PPC (Presence Presence Configuration) service

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
- `scheduleExport` mutation
- `campaignExportList` query
- `campaignExport` query
- Referenced by [FanlistCampaign](#fanlistcampaign) (via `exports` field)

**References:**
- [ExportDate](#exportdate)
- [ExportError](#exporterror)

---

#### ExportDate
**Category:** Nested Output Type

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

**Referenced By:**
- [Export](#export)

---

#### ExportError
**Category:** Nested Output Type

```graphql
type ExportError {
  message: String
  payload: String
  stack: String
}
```

**Referenced By:**
- [Export](#export)

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

**References:**
- [WaveDate](#wavedate)

**Transformed From:** [WaveConfigInput](#waveconfiginput) (partial)

---

#### WaveDate
**Category:** Nested Output Type

```graphql
type WaveDate {
  scheduled: String
  notify: String
  begin: String
  end: String
}
```

**Referenced By:**
- [Wave](#wave)

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

**References:**
- [WavePrepDate](#waveprepdate)
- [WavePrepError](#wavepreperror)
- [WavePrepCount](#waveprepcount)

---

#### WavePrepDate
**Category:** Nested Output Type

```graphql
type WavePrepDate {
  started: String
  finished: String
}
```

**Referenced By:**
- [WavePrep](#waveprep)

---

#### WavePrepError
**Category:** Nested Output Type

```graphql
type WavePrepError {
  message: String
}
```

**Referenced By:**
- [WavePrep](#waveprep)

---

#### WavePrepCount
**Category:** Nested Output Type (Recursive)

```graphql
type WavePrepCount {
  name: String
  eligible: Int
  selected: Int
  waitlisted: Int
  markets: [WavePrepCount]
}
```

**Referenced By:**
- [WavePrep](#waveprep)
- [WavePrepCount](#waveprepcount) (self-reference for nested markets)

**Notes:**
- Recursive type for nested market counts

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
- `upsertStat` mutation
- `stats` query

**References:**
- [StatsDate](#statsdate)
- [StatsError](#statserror)

---

#### StatsDate
**Category:** Nested Output Type

```graphql
type StatsDate {
  created: String!
  updated: String
}
```

**Referenced By:**
- [Stat](#stat)

---

#### StatsError
**Category:** Nested Output Type

```graphql
type StatsError {
  message: String
}
```

**Referenced By:**
- [Stat](#stat)

---

#### Promoter
**Category:** Output Type

```graphql
type Promoter {
  id: String
  name: String
  privacyUrls: [LocalizedUrl]
  date: PromoterDate
}
```

**Returned By:**
- `upsertPromoter` mutation
- `promoters` query

**References:**
- [LocalizedUrl](#localizedurl)
- [PromoterDate](#promoterdate)

**Transformed From:** [PromoterInput](#promoterinput)

---

#### LocalizedUrl
**Category:** Nested Output Type

```graphql
type LocalizedUrl {
  locale: String
  url: String
  is_default: Boolean
}
```

**Referenced By:**
- [Promoter](#promoter)

**Transformed From:** [LocalizedUrlInput](#localizedurlinput)

---

#### PromoterDate
**Category:** Nested Output Type

```graphql
type PromoterDate {
  created: String
  updated: String
}
```

**Referenced By:**
- [Promoter](#promoter)

**Differences from Input:**
- Date fields added by backend on creation/update

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

**References:**
- [CodeCount](#codecount)

**Notes:**
- Not a standalone type, but a resolver namespace

---

#### CodeCount
**Category:** Nested Output Type

```graphql
type CodeCount {
  available: Int
  assigned: Int
  reserved: Int
}
```

**Referenced By:**
- [Codes](#codes)

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

**References:**
- [MarketPreferenceCounts](#marketpreferencecounts)
- [MarketEligibilityCount](#marketeligibilitycount)

**Notes:**
- Not a standalone type, but a resolver namespace

---

#### MarketPreferenceCounts
**Category:** Nested Output Type

```graphql
type MarketPreferenceCounts {
  id: ID
  counts: [Int]
}
```

**Referenced By:**
- [Metrics](#metrics)

---

#### MarketEligibilityCount
**Category:** Nested Output Type

```graphql
type MarketEligibilityCount {
  id: ID
  count: Int
}
```

**Referenced By:**
- [Metrics](#metrics)

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
- `upsertCampaign` mutation
- `campaigns.list` query filter

**Used As Output By:**
- [RegistrationCampaign](#registrationcampaign)
- [FanlistCampaign](#fanlistcampaign)
- Campaign interface

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
- `upsertCampaign` mutation (via [CampaignInput](#campaigninput))

**Used As Output By:**
- [FanlistCampaign](#fanlistcampaign)

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
- `upsertCampaign` mutation (via [CampaignInput](#campaigninput))
- [CampaignGateInput](#campaigngateinput)

**Used As Output By:**
- [RegistrationCampaign](#registrationcampaign)
- [FanlistCampaign](#fanlistcampaign)
- [CampaignGate](#campaigngate)
- Campaign interface

---

#### CampaignSubtype
**Category:** Enum

```graphql
enum CampaignSubtype {
  fanclub
}
```

**Used As Input By:**
- `upsertCampaign` mutation (via [CampaignInput](#campaigninput))

**Used As Output By:**
- [RegistrationCampaign](#registrationcampaign)
- [FanlistCampaign](#fanlistcampaign)
- Campaign interface

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
- [CampaignGateInput](#campaigngateinput)

**Used As Output By:**
- [CampaignGate](#campaigngate)

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
- [CampaignGateInput](#campaigngateinput)

**Used As Output By:**
- [CampaignGate](#campaigngate)

---

#### IDVTier
**Category:** Enum

```graphql
enum IDVTier {
  asu
}
```

**Used As Input By:**
- [CampaignGateInput](#campaigngateinput)

**Used As Output By:**
- [CampaignGate](#campaigngate)

**Notes:**
- IDV = Identity Verification

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
- [CampaignOptionsInput](#campaignoptionsinput)
- `refreshEntryAttribute` mutation

**Used As Output By:**
- [CampaignOptions](#campaignoptions)

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
- [SplitAllocationInput](#splitallocationinput)

**Used As Output By:**
- [SplitAllocation](#splitallocation)

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
- `flipVerdicts` mutation

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
- [Wave](#wave)

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
- `uploadWavePrepFile` mutation

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
- `upsertStat` mutation
- `stats` query

**Used As Output By:**
- [Stat](#stat)

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
- [Stat](#stat)

---

### Scalars

#### JSON
**Category:** Scalar

Custom scalar type for arbitrary JSON data.

**Used By:**
- Campaign `style`, `entry` fields
- Field `additional` field
- Content `meta` field
- CampaignEntry fields
- Stat `meta`, `count` fields
- Various dynamic/flexible fields throughout the API

---

#### Upload
**Category:** Scalar

Custom scalar type for file uploads.

**Used By:**
- `uploadCodes` mutation
- `uploadBlacklist` mutation
- `uploadScored` mutation
- `uploadFanlist` mutation
- `uploadWavePrepFile` mutation
- `uploadWave` mutation

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
  │   │       │   │   ├─ ContentStartedWelcomeInput
  │   │       │   │   ├─ ContentStartedRegistrationInput
  │   │       │   │   └─ ContentStartedEntryInput
  │   │       │   ├─ ContentFinishedInput (Nested Input)
  │   │       │   │   └─ ContentFinishedWelcomeInput
  │   │       │   ├─ ContentTermsInput
  │   │       │   ├─ ContentSignupInput
  │   │       │   └─ ContentFAQInput (Nested Input)
  │   │       │       └─ ContentFAQQuestionInput
  │   │       ├─ ContentFAQInput (Nested Input)
  │   │       ├─ ContentImagesInput (Nested Input)
  │   │       │   └─ ImageInput
  │   │       ├─ ContentEmailInput (Nested Input)
  │   │       │   ├─ ContentEmailSubjectInput
  │   │       │   ├─ ContentEmailTemplateInput
  │   │       │   └─ ContentEmailFromInput
  │   │       ├─ ContentShareInput (Nested Input)
  │   │       │   └─ ContentShareTemplateInput
  │   │       ├─ ContentPhoneInput
  │   │       └─ ContentErrorInput
  │   └─ ContentInput (direct reference)
  ├─ CampaignImagesInput (Nested Input)
  │   └─ ImageInput
  ├─ FieldInput (Nested Input)
  │   └─ FieldLabelInput (Nested Input)
  │       └─ LocalizedFieldLabelInput
  ├─ CampaignPageFAQInput (Nested Input)
  │   └─ CampaignPageStateFAQInput
  ├─ MarketInput (Nested Input)
  │   ├─ GeoPointInput
  │   └─ MarketEventInput (Nested Input)
  │       ├─ MarketVenueInput
  │       └─ SplitAllocationInput
  ├─ LocaleInput
  ├─ CampaignDateInput
  ├─ CampaignSlackOptionsInput (Nested Input)
  │   └─ CampaignSlackChannelsInput
  ├─ CampaignOptionsInput (Nested Input)
  │   ├─ CampaignPrecheckOptionsInput
  │   └─ CampaignGateInput
  └─ CampaignSchemaInput
     ↓ transforms to ↓
RegistrationCampaign (Output) [implements Campaign]
  ├─ CampaignTour (Nested Output)
  ├─ CampaignArtist (Nested Output)
  ├─ CampaignDate (Nested Output) [+ updated, opened, closed]
  ├─ CampaignDomain (Nested Output)
  ├─ Tracker (Nested Output)
  ├─ CampaignContent (Nested Output)
  │   ├─ LocalizedContent (Nested Output)
  │   │   └─ Content (Nested Output)
  │   │       ├─ ContentBody (resolver with onlyCurrent param)
  │   │       │   ├─ ContentStarted
  │   │       │   │   ├─ ContentStartedWelcome
  │   │       │   │   ├─ ContentStartedRegistration
  │   │       │   │   └─ ContentStartedEntry
  │   │       │   ├─ ContentFinished
  │   │       │   │   └─ ContentFinishedWelcome
  │   │       │   ├─ ContentTerms
  │   │       │   ├─ ContentSignup
  │   │       │   └─ ContentFAQ
  │   │       │       └─ ContentFAQQuestion
  │   │       ├─ ContentFAQ
  │   │       ├─ ContentImages
  │   │       │   └─ Image [+ name field]
  │   │       ├─ ContentEmail
  │   │       │   ├─ ContentEmailSubject
  │   │       │   ├─ ContentEmailTemplate
  │   │       │   └─ ContentEmailFrom
  │   │       ├─ ContentShare
  │   │       │   └─ ContentShareTemplate
  │   │       ├─ ContentPhone
  │   │       └─ ContentError
  │   └─ Content (direct reference)
  ├─ CampaignImages
  │   └─ Image [+ name field]
  ├─ Field
  │   └─ FieldLabel
  │       └─ LocalizedFieldLabel
  ├─ CampaignPageFAQ
  │   └─ CampaignPageStateFAQ
  ├─ Market (resolver - loaded from backend)
  │   ├─ GeoPoint (coordinate transformation)
  │   └─ MarketEvent
  │       ├─ MarketVenue
  │       └─ SplitAllocation
  ├─ Locale (normalized locale IDs)
  ├─ CampaignEntry (resolver - loaded from entries service)
  ├─ Eligibility (resolver - computed)
  ├─ EligibleCounts (resolver - computed)
  │   └─ EligibleCountsByMarket
  │       └─ EligibleCountsByMarketPreferenceRank
  ├─ CampaignSlackOptions
  │   └─ CampaignSlackChannels
  ├─ CampaignOptions
  │   ├─ CampaignPrecheckOptions
  │   └─ CampaignGate
  └─ CampaignSchema

FanlistCampaign (Output) [implements Campaign] [simpler variant]
  ├─ CampaignArtist
  ├─ CampaignDate
  ├─ FanlistUpload (resolver - from S3 manifest)
  ├─ Export (resolver - loaded from backend)
  │   ├─ ExportDate
  │   └─ ExportError
  └─ CampaignSchema

MarketInput (Input)
  ├─ GeoPointInput
  └─ MarketEventInput
      ├─ MarketVenueInput
      └─ SplitAllocationInput
     ↓ transforms to ↓
Market (Output)
  ├─ GeoPoint [coordinates array → {lat, lng} object]
  └─ MarketEvent
      ├─ MarketVenue
      └─ SplitAllocation

ViewerInput (Input) [partial update]
     ↓ updates ↓
Viewer (Output)
  ├─ ViewerAuth
  │   └─ CampaignPermissions
  ├─ Account
  ├─ CurrentPhone
  ├─ Campaign (resolver)
  └─ Campaigns (resolver namespace)

PromoterInput (Input)
  └─ LocalizedUrlInput
     ↓ transforms to ↓
Promoter (Output)
  ├─ LocalizedUrl
  └─ PromoterDate [+ created, updated fields]

WaveConfigInput (Input)
     ↓ transforms to ↓
Wave (Output)
  └─ WaveDate
```

### Legend
- (Input) - Used as mutation/query input
- (Output) - Returned from queries/mutations
- (Nested Input/Output) - Referenced by other types
- [+ field] - Additional fields vs input
- (resolver) - Loaded via field resolver, not direct mapping
- [coordinate transformation] - Data structure change during transformation
