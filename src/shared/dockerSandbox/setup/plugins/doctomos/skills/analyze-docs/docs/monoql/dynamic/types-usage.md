# Type Usage Patterns - monoql

## Overview

This document catalogs implicit type definitions inferred from function signatures, resolver implementations, and usage patterns in the monoql codebase. These complement the explicit GraphQL type definitions in types-definitions.md.

## GraphQL Resolver Implementations

### Campaign Resolvers

#### upsertCampaign
**Confidence:** 95% High

```javascript
async (root, { campaign }, ctx) => {
  const result = await ctx.service.campaigns.upsert({
    jwt: ctx.jwt,
    ...normalizeCampaignInput(campaign)
  });
  return normalizeCampaignOutput({ campaign: result });
}
```

**Source:** [app/graphql/schema/resolvers/Campaign/index.js:133-136](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/index.js:133)

**Parameter Shape:**
- `root` (any, GraphQL root)
- `{ campaign }` (object, required)
  - `campaign` (CampaignInput from GraphQL schema)
- `ctx` (object, required) - GraphQL context
  - `ctx.jwt` (string) - JWT authentication token
  - `ctx.service.campaigns.upsert` (function) - Campaign service method

**Return Type:** Promise<Campaign> (RegistrationCampaign or FanlistCampaign)

**Transformation Flow:**
- Input campaign → `normalizeCampaignInput()` → Campaign service
- Service result → `normalizeCampaignOutput()` → GraphQL response

**Calls:**
- [normalizeCampaignInput](#normalizecampaigninput) (in same file via import)
- [normalizeCampaignOutput](#normalizecampaignoutput) (in same file via import)
- `ctx.service.campaigns.upsert` (campaign service)

**Called By:**
- GraphQL Mutation.upsertCampaign

---

#### campaign (Viewer field resolver)
**Confidence:** 95% High

```javascript
async (root, { domain, password, locale: dirtyLocale, id: campaignId, showAllLocales }, ctx) => {
  const { jwt, cookies } = ctx;
  const locale = normalizeLocale(dirtyLocale);

  const passwordMap = getPasswordMapFromCookies(cookies);
  const campaignPassword = password || passwordMap[domain];

  const campaign = campaignId ?
    await ctx.dataLoaders.campaignsById.load({ jwt, campaignId, locale, showAllLocales })
    : await ctx.dataLoaders.campaignsByDomain.load({ jwt, domain, locale, showAllLocales, password: campaignPassword });

  const normalized = normalizeCampaignOutput({ campaign });
  putStatus(ctx, normalized.status);

  if (password) {
    const updatedPasswordMap = { ...passwordMap, [domain]: password };
    setPasswordCookie({ cookies, passwordMap: updatedPasswordMap });
  }
  return normalized;
}
```

**Source:** [app/graphql/schema/resolvers/Campaign/index.js:86-108](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/index.js:86)

**Parameter Shape:**
- `root` (Viewer object)
- `{ domain, password, locale, id, showAllLocales }` (object)
  - `domain` (string, optional) - Campaign domain to lookup
  - `password` (string, optional) - Password for protected campaigns
  - `locale` (string, optional) - Content locale (e.g., 'en-US', 'fr_CA')
  - `id` (string, optional) - Campaign ID (campaignId)
  - `showAllLocales` (boolean, optional) - Return all locale content
- `ctx` (object, required)
  - `ctx.jwt` (string) - JWT token
  - `ctx.cookies` (object) - Koa cookies object
  - `ctx.dataLoaders.campaignsById.load` (function)
  - `ctx.dataLoaders.campaignsByDomain.load` (function)

**Return Type:** Promise<Campaign> (RegistrationCampaign or FanlistCampaign)

**Logic:**
- Normalizes locale format (underscore to dash)
- Retrieves password from cookies if not provided
- Loads campaign by ID or domain
- Normalizes output
- Sets campaign status in context
- Stores password in cookie if provided

**Calls:**
- [normalizeLocale](#normalizelocale)
- [getPasswordMapFromCookies](#getpasswordmapfromcookies)
- [normalizeCampaignOutput](#normalizecampaignoutput)
- `putStatus` (context selector)
- [setPasswordCookie](#setpasswordcookie)

**Called By:**
- GraphQL Viewer.campaign field

---

#### saveCampaignContacts
**Confidence:** 95% High

```javascript
async (root, { contacts, campaignId }, { service, jwt }) => {
  const result = await service.campaigns.saveCampaignContacts({ jwt, contacts, campaignId });
  return result;
}
```

**Source:** [app/graphql/schema/resolvers/Campaign/index.js:137-142](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/index.js:137)

**Parameter Shape:**
- `root` (any)
- `{ contacts, campaignId }` (object, required)
  - `contacts` (array of JSON, required) - Contact objects
  - `campaignId` (ID, required)
- `{ service, jwt }` (context destructured)
  - `service.campaigns.saveCampaignContacts` (function)
  - `jwt` (string)

**Return Type:** Promise<[String]> (array of contact IDs)

**Calls:**
- `service.campaigns.saveCampaignContacts` (campaign service)

**Called By:**
- GraphQL Mutation.saveCampaignContacts

---

### Market Resolvers

#### upsertMarket
**Confidence:** 95% High

```javascript
async (root, { market }, ctx) => {
  const normalized = normalizeInput(market);
  const result = await ctx.service.campaigns.upsertMarket({ jwt: ctx.jwt, ...normalized });
  return normalizeOutput(result);
}
```

**Source:** [app/graphql/schema/resolvers/Markets.js:54-60](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Markets.js:54)

**Parameter Shape:**
- `root` (any)
- `{ market }` (object, required)
  - `market` (MarketInput from GraphQL schema)
- `ctx` (object, required)
  - `ctx.jwt` (string)
  - `ctx.service.campaigns.upsertMarket` (function)

**Return Type:** Promise<Market>

**Transformation Flow:**
```javascript
// Input GeoPoint: { latitude: 34.05, longitude: -118.24 }
// Normalized: { point: { type: 'Point', coordinates: [34.05, -118.24] } }
// Output GeoPoint: { latitude: 34.05, longitude: -118.24 }
```

**Calls:**
- `normalizeInput` (local function using Ramda)
- `normalizeOutput` (local function using Ramda)
- `ctx.service.campaigns.upsertMarket`

**Called By:**
- GraphQL Mutation.upsertMarket

---

#### deleteMarket
**Confidence:** 95% High

```javascript
async (root, { campaignId, marketId, transferMarketId }, ctx) => {
  const transferResult = transferMarketId ? await ctx.service.entries.transferEntries({
    jwt: ctx.jwt,
    campaignId,
    fromMarketId: marketId,
    toMarketId: transferMarketId
  }) : {};
  const deleteResult = await ctx.service.campaigns.deleteMarket({ jwt: ctx.jwt, campaignId, marketId });
  return { ...deleteResult, ...transferResult };
}
```

**Source:** [app/graphql/schema/resolvers/Markets.js:61-73](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Markets.js:61)

**Parameter Shape:**
- `root` (any)
- `{ campaignId, marketId, transferMarketId }` (object, required)
  - `campaignId` (String, required)
  - `marketId` (String, required)
  - `transferMarketId` (String, optional) - Target market for entry transfer
- `ctx` (object, required)
  - `ctx.jwt` (string)
  - `ctx.service.entries.transferEntries` (function)
  - `ctx.service.campaigns.deleteMarket` (function)

**Return Type:** Promise<JSON> (combined transfer and delete results)

**Logic:**
- Optionally transfers entries to another market before deletion
- Deletes market
- Returns merged results

**Calls:**
- `ctx.service.entries.transferEntries`
- `ctx.service.campaigns.deleteMarket`

**Called By:**
- GraphQL Mutation.deleteMarket

---

#### cloneMarkets
**Confidence:** 95% High

```javascript
async (root, { fromCampaignId, toCampaignId }, ctx) => {
  const result = await ctx.service.campaigns.cloneMarkets({ jwt: ctx.jwt, fromCampaignId, toCampaignId });
  return (result || []).map(normalizeOutput);
}
```

**Source:** [app/graphql/schema/resolvers/Markets.js:74-79](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Markets.js:74)

**Parameter Shape:**
- `root` (any)
- `{ fromCampaignId, toCampaignId }` (object, required)
  - `fromCampaignId` (String, required) - Source campaign
  - `toCampaignId` (String, required) - Target campaign
- `ctx` (object, required)

**Return Type:** Promise<[Market]>

**Logic:**
- Clones all markets from source to target campaign
- Normalizes GeoPoint transformations for each market

**Calls:**
- `ctx.service.campaigns.cloneMarkets`
- `normalizeOutput` (for each market)

**Called By:**
- GraphQL Mutation.cloneMarkets

---

### Entry Resolvers

#### upsertViewerEntry
**Confidence:** 95% High

```javascript
async (root, { entry, campaignId, locale }, ctx) => {
  await throwIfTokenMismatch({ root, ctx });
  const entryCtx = selectEntryContext({ ctx });
  const result = await ctx.service.entries.create({
    jwt: ctx.jwt,
    campaignId,
    entry: {
      ...entryCtx,
      ...entry
    },
    locale
  });
  return result;
}
```

**Source:** [app/graphql/schema/resolvers/Entry/index.js:22-32](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Entry/index.js:22)

**Parameter Shape:**
- `root` (any)
- `{ entry, campaignId, locale }` (object, required)
  - `entry` (JSON, required) - Entry data from user
  - `campaignId` (String, required)
  - `locale` (String, required)
- `ctx` (object, required)
  - `ctx.jwt` (string)
  - `ctx.service.entries.create` (function)

**Return Type:** Promise<Viewer>

**Entry Context Enrichment:**
```javascript
const entryCtx = {
  user_agent: ctx.request.headers['user-agent'],
  ip: ctx.request.ip,
  ip_country: ctx.request.headers['cf-ipcountry'],
  forwarded_for: ctx.request.headers['x-forwarded-for'],
  session_id: ctx.request.headers['x-nudetect-session-id']
}
```

**Logic:**
- Validates JWT token matches session
- Extracts request context (IP, user agent, etc.)
- Merges entry data with context
- Creates entry in entries service

**Calls:**
- [throwIfTokenMismatch](#throwiftokenmismatch)
- [selectEntryContext](#selectentrycontext)
- `ctx.service.entries.create`

**Called By:**
- GraphQL Mutation.upsertViewerEntry

---

#### submitConfirm
**Confidence:** 95% High

```javascript
async (root, { campaignId, phoneJwt }, ctx) => {
  await throwIfTokenMismatch({ root, ctx });
  const result = await ctx.service.entries.submitConfirm({ jwt: ctx.jwt, campaignId, phoneJwt });
  return result;
}
```

**Source:** [app/graphql/schema/resolvers/Entry/index.js:34-39](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Entry/index.js:34)

**Parameter Shape:**
- `root` (any)
- `{ campaignId, phoneJwt }` (object, required)
  - `campaignId` (String, required)
  - `phoneJwt` (String, required) - JWT token from phone verification
- `ctx` (object, required)

**Return Type:** Promise<JSON>

**Logic:**
- Validates session token
- Confirms phone number for campaign entry

**Calls:**
- [throwIfTokenMismatch](#throwiftokenmismatch)
- `ctx.service.entries.submitConfirm`

**Called By:**
- GraphQL Mutation.submitConfirm

---

#### refreshEntryAttribute
**Confidence:** 95% High

```javascript
async (root, { campaignId, attribute }, ctx) => {
  await throwIfTokenMismatch({ root, ctx });
  const result = await ctx.service.entries.refreshEntryAttribute({ jwt: ctx.jwt, campaignId, attribute });
  return result;
}
```

**Source:** [app/graphql/schema/resolvers/Entry/index.js:41-46](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Entry/index.js:41)

**Parameter Shape:**
- `root` (any)
- `{ campaignId, attribute }` (object, required)
  - `campaignId` (ID, required)
  - `attribute` (LinkableAttributeType enum, required) - e.g., 'card_citi', 'card_amex'
- `ctx` (object, required)

**Return Type:** Promise<JSON>

**Logic:**
- Validates session token
- Refreshes linked account attribute (e.g., credit card verification)

**Calls:**
- [throwIfTokenMismatch](#throwiftokenmismatch)
- `ctx.service.entries.refreshEntryAttribute`

**Called By:**
- GraphQL Mutation.refreshEntryAttribute

---

### Viewer Resolvers

#### authenticate
**Confidence:** 95% High

```javascript
async (root, { credentials: { token: tmToken } = {} }, ctx) => {
  const viewer = await ctx.dataLoaders.authenticate.load({
    tmToken: tmToken || ctx.cookies.get(TM_COOKIES.SOTC),
    tmuo: ctx.cookies.get(TM_COOKIES.TMUO),
    version: 'v2'
  });
  putJWT(ctx, viewer.auth.token);
}
```

**Source:** [app/graphql/schema/resolvers/Viewer/authenticate.js:4-11](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Viewer/authenticate.js:4)

**Parameter Shape:**
- `root` (any)
- `{ credentials }` (object, optional)
  - `credentials.token` (string, optional) - Ticketmaster token
- `ctx` (object, required)
  - `ctx.cookies` (object) - Koa cookies
  - `ctx.dataLoaders.authenticate.load` (function)

**Cookie Constants:**
```javascript
TM_COOKIES = {
  SOTC: 'sotc',  // Ticketmaster authentication token
  TMUO: 'tmuo'   // Ticketmaster user options
}
```

**Return Type:** Promise<Viewer>

**Logic:**
- Uses token from parameter or SOTC cookie
- Loads TMUO cookie for user options
- Authenticates with identity service v2
- Stores JWT in context

**Calls:**
- `ctx.dataLoaders.authenticate.load`
- `putJWT` (context mutation)

**Called By:**
- GraphQL Mutation.authenticate
- GraphQL Query.viewer (when auth provided)
- [compareAndUpdateToken](#compareandupdatetoken) (internal)

---

## Utility Functions

### normalizeCampaignInput
**Confidence:** 95% High

```javascript
const normalizeCampaignInput = ({
  content, locales = [], preferences = [], currentLocale, ...campaign
}) => ({
  schema: { version: '1' },
  ...campaign,
  content: content && normalizeContentInput(content),
  preferences: preferences.map(({ label, additional: { defaultLabel, ...additional } = {}, ...preference }) => ({
    ...preference,
    additional: {
      ...additional,
      ...(defaultLabel ? {
        defaultLabel: normalizeLocalizedInput(defaultLabel)
      } : {})
    },
    label: normalizeLocalizedInput(label)
  })),
  locales: locales.map(({ id, ...locale }) => ({
    ...locale,
    id: normalizeLocale(id)
  }))
})
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:64-84](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:64)

**Parameter Shape:**
- `{ content, locales, preferences, currentLocale, ...campaign }` (object)
  - `content` (CampaignContentInput, optional)
  - `locales` (array of LocaleInput, optional, defaults to [])
  - `preferences` (array of FieldInput, optional, defaults to [])
  - `currentLocale` (LocaleInput, optional)
  - `...campaign` (remaining CampaignInput fields)

**Return Type:** object (normalized for backend API)

**Transformations:**
- Sets schema.version to '1'
- Normalizes content: localized array → keyed locale objects, underscores → dashes
- Normalizes preference labels and defaultLabels
- Normalizes locale IDs
- Removes currentLocale (computed by backend)

**Calls:**
- [normalizeContentInput](#normalizecontentinput)
- [normalizeLocalizedInput](#normalizelocalizedinput)
- [normalizeLocale](#normalizelocale)

**Called By:**
- [upsertCampaign](#upsertcampaign)

---

### normalizeCampaignOutput
**Confidence:** 95% High

```javascript
const normalizeCampaignOutput = ({
  campaign: { preferences = [], content, locales = [], currentLocale, ...campaign }
}) => ({
  ...campaign,
  ...(currentLocale ? { currentLocale: { id: normalizeLocale(currentLocale, '_') } } : {}),
  content: content && normalizeContentOutput(content),
  locales: locales.map(({ id, ...availLocale }) => ({
    ...availLocale,
    id: normalizeLocale(id, '_')
  })),
  preferences: preferences.map(
    ({ label, additional: { defaultLabel, ...additional } = {}, ...preference }) =>
      ({
        ...preference,
        additional: {
          ...additional,
          ...(defaultLabel ? {
            defaultLabel: normalizeLocalizedOutput(defaultLabel)
          } : {})
        },
        label: label && normalizeLocalizedOutput(label)
      })
  )
})
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:86-108](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:86)

**Parameter Shape:**
- `{ campaign }` (object, required)
  - `campaign` (object from backend API)

**Return Type:** object (normalized for GraphQL output)

**Transformations:**
- Normalizes content: keyed locale objects → localized array, dashes → underscores
- Normalizes locale IDs (dashes → underscores)
- Normalizes currentLocale if present
- Normalizes preference labels

**Calls:**
- [normalizeContentOutput](#normalizecontentoutput)
- [normalizeLocalizedOutput](#normalizelocalizedoutput)
- [normalizeLocale](#normalizelocale)

**Called By:**
- [upsertCampaign](#upsertcampaign)
- [campaign (Viewer field resolver)](#campaign-viewer-field-resolver)
- `Campaigns.list` resolver

---

### normalizeLocale
**Confidence:** 95% High

```javascript
const normalizeLocale = (locale, sep = '-') => {
  if (!locale) {
    return locale;
  }
  const arr = locale.replace('_', '-').split('-');
  return arr[1] ? `${arr[0]}${sep}${arr[1].toUpperCase()}` : arr[0];
}
```

**Source:** [app/graphql/schema/resolvers/util.js:55-62](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:55)

**Parameter Shape:**
- `locale` (string, required) - Locale string (e.g., 'en-US', 'en_US', 'fr-CA')
- `sep` (string, optional, default: '-') - Separator character

**Return Type:** string (normalized locale)

**Examples:**
```javascript
normalizeLocale('en-US')      // 'en-US'
normalizeLocale('en_US')      // 'en-US'
normalizeLocale('en-us')      // 'en-US' (uppercases country)
normalizeLocale('en_us', '_') // 'en_US'
normalizeLocale('en')         // 'en'
normalizeLocale(null)         // null
```

**Called By:**
- [normalizeCampaignInput](#normalizecampaigninput)
- [normalizeCampaignOutput](#normalizecampaignoutput)
- [campaign (Viewer field resolver)](#campaign-viewer-field-resolver)

---

### normalizeContentInput
**Confidence:** 95% High

```javascript
const normalizeContentInput = R.pipe(
  normalizeLocalizedInput,
  R.map(maybeConvertFaqsFromArray)
)
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:49-52](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:49)

**Parameter Shape:**
- `content` (CampaignContentInput) - Content with localized array

**Return Type:** object (content with keyed locales and FAQ objects)

**Transformation Pipeline:**
1. Convert localized array to keyed locale objects
2. Convert FAQ arrays to keyed objects

**Calls:**
- [normalizeLocalizedInput](#normalizelocalizedinput)
- [maybeConvertFaqsFromArray](#maybeconvertfaqsfromarray)

**Called By:**
- [normalizeCampaignInput](#normalizecampaigninput)

---

### normalizeContentOutput
**Confidence:** 95% High

```javascript
const normalizeContentOutput = R.pipe(
  R.map(maybeConvertFaqsToArray),
  normalizeLocalizedOutput
)
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:59-62](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:59)

**Parameter Shape:**
- `content` (object) - Content with keyed locales from backend

**Return Type:** CampaignContent (with localized array and FAQ arrays)

**Transformation Pipeline:**
1. Convert FAQ keyed objects to arrays
2. Convert keyed locale objects to localized array

**Calls:**
- [maybeConvertFaqsToArray](#maybeconvertfaqstoarray)
- [normalizeLocalizedOutput](#normalizelocalizedoutput)

**Called By:**
- [normalizeCampaignOutput](#normalizecampaignoutput)

---

### normalizeLocalizedInput
**Confidence:** 95% High

```javascript
const normalizeLocalizedInput = R.pipe(
  ({ localized = [], ...rest } = {}) => ({
    ...rest,
    ...localizedArrayToKeyedLocales(localized)
  }),
  localesKeyToDash
)
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:40-47](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:40)

**Parameter Shape:**
- `{ localized, ...rest }` (object)
  - `localized` (array, optional) - Array of { locale, value } objects
  - `...rest` (object) - Legacy keyed locale fields (en_US, fr_CA, etc.)

**Return Type:** object (keyed locales with dash separators)

**Transformation:**
```javascript
// Input:
{
  localized: [
    { locale: 'en-US', value: { ... } },
    { locale: 'fr-CA', value: { ... } }
  ],
  en_US: { ... }  // legacy, will be overwritten
}

// Output:
{
  'en-US': { ... },
  'fr-CA': { ... }
}
```

**Calls:**
- [localizedArrayToKeyedLocales](#localizedarraytokeyedlocales)
- [localesKeyToDash](#localeskeytodash)

**Called By:**
- [normalizeContentInput](#normalizecontentinput)
- [normalizeCampaignInput](#normalizecampaigninput)

---

### normalizeLocalizedOutput
**Confidence:** 95% High

```javascript
const normalizeLocalizedOutput = R.pipe(
  keyedLocalesToLocalizedArray,
  localesKeyToUnderscore
)
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:54-57](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:54)

**Parameter Shape:**
- `keyedLocales` (object) - Object with locale keys (e.g., { 'en-US': {...}, 'fr-CA': {...} })

**Return Type:** object with localized array and legacy keyed fields

**Transformation:**
```javascript
// Input:
{
  'en-US': { body: { ... } },
  'fr-CA': { body: { ... } }
}

// Output:
{
  localized: [
    { locale: 'en_US', value: { body: { ... } } },
    { locale: 'fr_CA', value: { body: { ... } } }
  ],
  en_US: { body: { ... } },
  fr_CA: { body: { ... } }
}
```

**Calls:**
- [keyedLocalesToLocalizedArray](#keyedlocalestolocalizedarray)
- [localesKeyToUnderscore](#localeskeytounderscore)

**Called By:**
- [normalizeContentOutput](#normalizecontentoutput)
- [normalizeCampaignOutput](#normalizecampaignoutput)

---

### throwIfTokenMismatch
**Confidence:** 95% High

```javascript
const throwIfTokenMismatch = async ({ root, ctx }) => {
  const tmToken = ctx.cookies.get(TM_COOKIES.SOTC);
  const authUserId = selectAuthUserId(ctx);
  const updatedAuthUserId = await compareAndUpdateToken({ root, ctx, tmToken });
  if (authUserId !== updatedAuthUserId) {
    throw error(invalidSession);
  }
}
```

**Source:** [app/graphql/schema/resolvers/util.js:119-126](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:119)

**Parameter Shape:**
- `{ root, ctx }` (object, required)
  - `root` (any) - GraphQL root value
  - `ctx` (object) - GraphQL context
    - `ctx.cookies` (object) - Koa cookies

**Return Type:** Promise<void> (throws on mismatch)

**Logic:**
- Retrieves Ticketmaster token from SOTC cookie
- Gets current authenticated user ID from context
- Compares token signatures, re-authenticates if different
- Throws invalidSession error if user ID changed

**Error Thrown:**
- `invalidSession` - When token user doesn't match authenticated user

**Calls:**
- `selectAuthUserId` (context selector)
- [compareAndUpdateToken](#compareandupdatetoken)
- `error` (error factory)

**Called By:**
- [upsertViewerEntry](#upsertviewerentry)
- [submitConfirm](#submitconfirm)
- [refreshEntryAttribute](#refreshentryattribute)

---

### compareAndUpdateToken
**Confidence:** 95% High

```javascript
const compareAndUpdateToken = async ({ root, ctx, tmToken }) => {
  if (selectAuthTmSig(ctx) !== selectTokenSignature(tmToken)) {
    await authenticate(root, { credentials: { token: tmToken } }, ctx);
  }
  return selectAuthUserId(ctx);
}
```

**Source:** [app/graphql/schema/resolvers/util.js:112-117](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:112)

**Parameter Shape:**
- `{ root, ctx, tmToken }` (object, required)
  - `root` (any)
  - `ctx` (object) - GraphQL context
  - `tmToken` (string) - Ticketmaster token from cookie

**Return Type:** Promise<string> (user ID)

**Logic:**
- Extracts token signature (last part after '.')
- Compares stored signature with current token signature
- Re-authenticates if signatures don't match
- Returns authenticated user ID

**Calls:**
- `selectAuthTmSig` (context selector)
- `selectTokenSignature` (local function)
- [authenticate](#authenticate)
- `selectAuthUserId` (context selector)

**Called By:**
- [throwIfTokenMismatch](#throwiftokenmismatch)

---

### selectEntryContext
**Confidence:** 95% High

```javascript
const selectEntryContext = R.applySpec({
  user_agent: selectUserAgent,
  ip: selectIp,
  ip_country: selectCountry,
  forwarded_for: selectXForwardedFor,
  session_id: selectNuDetectSessionId
})
```

**Source:** [app/graphql/schema/resolvers/Entry/index.js:14-20](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Entry/index.js:14)

**Parameter Shape:**
- `{ ctx }` (object, required)
  - `ctx` (GraphQL context with request headers)

**Return Type:** object (entry context metadata)

```javascript
{
  user_agent: string,        // e.g., 'Mozilla/5.0...'
  ip: string,                // e.g., '192.168.1.1'
  ip_country: string,        // e.g., 'US' (from Cloudflare header)
  forwarded_for: string,     // e.g., '203.0.113.1, 198.51.100.1'
  session_id: string         // NuDetect session ID for fraud prevention
}
```

**Calls:**
- `selectUserAgent` (context selector)
- `selectIp` (context selector)
- `selectCountry` (context selector)
- `selectXForwardedFor` (context selector)
- `selectNuDetectSessionId` (context selector)

**Called By:**
- [upsertViewerEntry](#upsertviewerentry)

---

### localizedArrayToKeyedLocales
**Confidence:** 95% High

```javascript
const localizedArrayToKeyedLocales = R.reduce(
  (keyedLocales, { locale, value }) =>
    R.assoc(locale, value, keyedLocales),
  {}
)
```

**Source:** [app/graphql/schema/resolvers/util.js:85-86](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:85)

**Parameter Shape:**
- `localized` (array) - Array of { locale, value } objects

**Return Type:** object (keyed by locale)

**Example:**
```javascript
// Input:
[
  { locale: 'en-US', value: { body: 'Hello' } },
  { locale: 'fr-CA', value: { body: 'Bonjour' } }
]

// Output:
{
  'en-US': { body: 'Hello' },
  'fr-CA': { body: 'Bonjour' }
}
```

**Called By:**
- [normalizeLocalizedInput](#normalizelocalizedinput)

---

### keyedLocalesToLocalizedArray
**Confidence:** 95% High

```javascript
const keyedLocalesToLocalizedArray = keyedLocales => R.pipe(
  R.toPairs,
  R.map(([locale, value]) => ({ locale, value })),
  localized => ({
    localized,
    ...keyedLocales
  })
)(keyedLocales)
```

**Source:** [app/graphql/schema/resolvers/util.js:76-83](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:76)

**Parameter Shape:**
- `keyedLocales` (object) - Object with locale keys

**Return Type:** object with localized array AND original keys

**Example:**
```javascript
// Input:
{
  'en-US': { body: 'Hello' },
  'fr-CA': { body: 'Bonjour' }
}

// Output:
{
  localized: [
    { locale: 'en-US', value: { body: 'Hello' } },
    { locale: 'fr-CA', value: { body: 'Bonjour' } }
  ],
  'en-US': { body: 'Hello' },
  'fr-CA': { body: 'Bonjour' }
}
```

**Notes:**
- Preserves original keyed structure for backward compatibility
- Adds localized array for new GraphQL API

**Called By:**
- [normalizeLocalizedOutput](#normalizelocalizedoutput)

---

### localesKeyToUnderscore
**Confidence:** 95% High

```javascript
const localesKeyToUnderscore = (obWithDashedKeys = {}, sep = '_') =>
  Object.entries(obWithDashedKeys).reduce(
    (ob, [lanKey, content]) => {
      ob[normalizeLocale(lanKey, sep)] = content;
      return ob;
    }, {}
  )
```

**Source:** [app/graphql/schema/resolvers/util.js:64-71](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:64)

**Parameter Shape:**
- `obWithDashedKeys` (object, optional, default: {}) - Object with dash-separated locale keys
- `sep` (string, optional, default: '_') - Separator to use

**Return Type:** object (with normalized locale keys)

**Example:**
```javascript
// Input:
{ 'en-US': {...}, 'fr-CA': {...} }

// Output:
{ 'en_US': {...}, 'fr_CA': {...} }
```

**Called By:**
- [normalizeLocalizedOutput](#normalizelocalizedoutput)
- [localesKeyToDash](#localeskeytodash)

---

### localesKeyToDash
**Confidence:** 95% High

```javascript
const localesKeyToDash = objWithUnderscore =>
  localesKeyToUnderscore(objWithUnderscore, '-')
```

**Source:** [app/graphql/schema/resolvers/util.js:73-74](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:73)

**Parameter Shape:**
- `objWithUnderscore` (object) - Object with underscore-separated locale keys

**Return Type:** object (with dash-separated locale keys)

**Example:**
```javascript
// Input:
{ 'en_US': {...}, 'fr_CA': {...} }

// Output:
{ 'en-US': {...}, 'fr-CA': {...} }
```

**Called By:**
- [normalizeLocalizedInput](#normalizelocalizedinput)

---

### maybeConvertFaqsFromArray
**Confidence:** 95% High

```javascript
const maybeConvertFaqsFromArray = content => {
  if (content.faqs) {
    return {
      ...content,
      faqs: convertArrayIdsToObjectKeys(content.faqs)
    };
  }
  return content;
}
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:30-38](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:30)

**Parameter Shape:**
- `content` (Content object)
  - `content.faqs` (array, optional) - Array of FAQ objects with `id` field

**Return Type:** Content (with FAQs as keyed object)

**Transformation:**
```javascript
// Input:
{
  faqs: [
    { id: 'faq-1', question: 'Q1', answer: 'A1' },
    { id: 'faq-2', question: 'Q2', answer: 'A2' }
  ]
}

// Output:
{
  faqs: {
    'faq-1': { question: 'Q1', answer: 'A1' },
    'faq-2': { question: 'Q2', answer: 'A2' }
  }
}
```

**Calls:**
- [convertArrayIdsToObjectKeys](#convertarrayidstoobjectkeys)

**Called By:**
- [normalizeContentInput](#normalizecontentinput)

---

### maybeConvertFaqsToArray
**Confidence:** 95% High

```javascript
const maybeConvertFaqsToArray = content => {
  if (content.faqs) {
    return {
      ...content,
      faqs: convertObjectKeysToArrayIds(content.faqs)
    };
  }
  return content;
}
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:20-28](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:20)

**Parameter Shape:**
- `content` (Content object)
  - `content.faqs` (object, optional) - Keyed FAQ objects

**Return Type:** Content (with FAQs as array)

**Transformation:**
```javascript
// Input:
{
  faqs: {
    'faq-1': { question: 'Q1', answer: 'A1' },
    'faq-2': { question: 'Q2', answer: 'A2' }
  }
}

// Output:
{
  faqs: [
    { id: 'faq-1', question: 'Q1', answer: 'A1' },
    { id: 'faq-2', question: 'Q2', answer: 'A2' }
  ]
}
```

**Calls:**
- [convertObjectKeysToArrayIds](#convertobjectkeystoarrayids)

**Called By:**
- [normalizeContentOutput](#normalizecontentoutput)

---

### convertArrayIdsToObjectKeys
**Confidence:** 95% High

```javascript
const convertArrayIdsToObjectKeys = array => array.reduce(
  (obj, { id, ...rest }) => {
    obj[id] = rest;
    return obj;
  }, {}
)
```

**Source:** [app/graphql/schema/resolvers/util.js:95-100](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:95)

**Parameter Shape:**
- `array` (array) - Array of objects with `id` field

**Return Type:** object (keyed by id)

**Called By:**
- [maybeConvertFaqsFromArray](#maybeconvertfaqsfromarray)

---

### convertObjectKeysToArrayIds
**Confidence:** 95% High

```javascript
const convertObjectKeysToArrayIds = obj => Object.entries(obj).reduce(
  (arr, [id, rest]) => {
    arr.push({ ...rest, id });
    return arr;
  }, []
)
```

**Source:** [app/graphql/schema/resolvers/util.js:88-93](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:88)

**Parameter Shape:**
- `obj` (object) - Object with string keys

**Return Type:** array (objects with id field)

**Called By:**
- [maybeConvertFaqsToArray](#maybeconvertfaqstoarray)

---

### getPasswordMapFromCookies
**Confidence:** 95% High

```javascript
const getPasswordMapFromCookies = cookies => {
  try {
    const encodedCookie = cookies.get(passwordCookieKey);
    const decodedCookie = base64Decode(encodedCookie);
    return JSON.parse(decodedCookie);
  }
  catch (err) {
    return {};
  }
}
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:128-137](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:128)

**Parameter Shape:**
- `cookies` (object) - Koa cookies object

**Return Type:** object (map of domain → password)

**Example:**
```javascript
// Cookie value (base64): eyJhcnRpc3QtZG9tYWluLmNvbSI6InBhc3N3b3JkMTIzIn0=
// Decoded: {"artist-domain.com":"password123"}

// Return:
{
  'artist-domain.com': 'password123',
  'another-domain.com': 'secret456'
}
```

**Logic:**
- Retrieves password cookie
- Base64 decodes
- Parses JSON
- Returns empty object on error (cookie not set or invalid)

**Calls:**
- [base64Decode](#base64decode)

**Called By:**
- [campaign (Viewer field resolver)](#campaign-viewer-field-resolver)

---

### setPasswordCookie
**Confidence:** 95% High

```javascript
const setPasswordCookie = ({ cookies, passwordMap }) => {
  const encodedCookie = base64Encode(JSON.stringify(passwordMap));
  cookies.set(passwordCookieKey, encodedCookie, {
    httpOnly: true
  });
}
```

**Source:** [app/graphql/schema/resolvers/Campaign/util.js:121-126](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:121)

**Parameter Shape:**
- `{ cookies, passwordMap }` (object, required)
  - `cookies` (object) - Koa cookies object
  - `passwordMap` (object) - Map of domain → password

**Return Type:** void

**Logic:**
- Stringifies password map
- Base64 encodes
- Sets httpOnly cookie (not accessible via JavaScript)

**Calls:**
- [base64Encode](#base64encode)

**Called By:**
- [campaign (Viewer field resolver)](#campaign-viewer-field-resolver)

---

### base64Encode
**Confidence:** 95% High

```javascript
const base64Encode = value => {
  const encodedObject = CryptoJS.enc.Utf8.parse(value);
  return CryptoJS.enc.Base64.stringify(encodedObject);
}
```

**Source:** [app/graphql/schema/resolvers/util.js:102-105](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:102)

**Parameter Shape:**
- `value` (string) - String to encode

**Return Type:** string (base64 encoded)

**Called By:**
- [setPasswordCookie](#setpasswordcookie)

---

### base64Decode
**Confidence:** 95% High

```javascript
const base64Decode = value => {
  const decodedObject = CryptoJS.enc.Base64.parse(value);
  return CryptoJS.enc.Utf8.stringify(decodedObject);
}
```

**Source:** [app/graphql/schema/resolvers/util.js:107-110](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:107)

**Parameter Shape:**
- `value` (string) - Base64 encoded string

**Return Type:** string (decoded UTF-8)

**Called By:**
- [getPasswordMapFromCookies](#getpasswordmapfromcookies)

---

### makeScoringFilename
**Confidence:** 95% High

```javascript
const makeScoringFilename = ({ campaignId, campaignName }) => {
  const date = moment().tz('America/Los_Angeles').format(FILE_DATE_FORMAT);
  return `${campaignId}.${normalizeCampaignName(campaignName)}.${date}.uploaded.csv`;
}
```

**Source:** [app/graphql/schema/resolvers/util.js:30-33](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:30)

**Parameter Shape:**
- `{ campaignId, campaignName }` (object, required)
  - `campaignId` (string)
  - `campaignName` (string)

**Return Type:** string (filename)

**Constants:**
```javascript
FILE_DATE_FORMAT = 'YYYYMMDDHHmm'  // e.g., '202601211430'
```

**Example:**
```javascript
makeScoringFilename({
  campaignId: 'camp-123',
  campaignName: 'Taylor Swift - Eras Tour'
})
// Returns: 'camp-123.TaylorSwiftErasTour.202601211430.uploaded.csv'
```

**Logic:**
- Uses Pacific time zone for timestamp
- Removes non-alphanumeric characters from campaign name
- Formats: `{id}.{normalizedName}.{timestamp}.uploaded.csv`

**Calls:**
- `normalizeCampaignName` (local function)

---

### makeFanlistManifestPath
**Confidence:** 95% High

```javascript
const makeFanlistManifestPath = ({ campaignId }) =>
  `${makeFanlistPrefix({ campaignId })}/manifest.json`

const makeFanlistPrefix = ({ campaignId }) =>
  `fanlist/uploaded/${campaignId}`
```

**Source:** [app/graphql/schema/resolvers/util.js:43-45](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/util.js:43)

**Parameter Shape:**
- `{ campaignId }` (object, required)

**Return Type:** string (S3 object path)

**Example:**
```javascript
makeFanlistManifestPath({ campaignId: 'camp-123' })
// Returns: 'fanlist/uploaded/camp-123/manifest.json'
```

**Called By:**
- `FanlistCampaign.uploads` resolver (to load upload history)

---

## Common Patterns

### Pattern: Locale Normalization

**Description:** Consistent transformation of locale identifiers between formats

**Flow:**
```
GraphQL Input (dash)     Backend (dash)           GraphQL Output (underscore)
    'en-US'       →      'en-US'         →            'en_US'
    'fr_CA'       →      'fr-CA'         →            'fr_CA'
```

**Usage:**
- Input normalization: Convert any format to dash-separated
- Output normalization: Convert to underscore-separated for deprecated fields
- Localized arrays: Use for modern API, keyed locales for backward compatibility

**Found In:**
- [normalizeLocale](#normalizelocale) - Core transformation
- [localesKeyToDash](#localeskeytodash) - Input transformation
- [localesKeyToUnderscore](#localeskeytounderscore) - Output transformation
- [normalizeCampaignInput](#normalizecampaigninput) - Campaign input
- [normalizeCampaignOutput](#normalizecampaignoutput) - Campaign output

---

### Pattern: GeoPoint Coordinate Transformation

**Description:** Transform between GraphQL and MongoDB GeoJSON formats

**Flow:**
```
GraphQL Input                  Backend (MongoDB GeoJSON)           GraphQL Output
{ latitude: 34.05,      →     { type: 'Point',             →      { latitude: 34.05,
  longitude: -118.24 }          coordinates: [34.05, -118.24] }     longitude: -118.24 }
```

**Implementation:**
```javascript
// Input transformation (Markets.js:22-28)
const fromPoint = R.applySpec({
  coordinates: R.props(['latitude', 'longitude'])
});
const normalizePointsInput = market => R.set(
  pointLens,
  R.assoc('type', 'Point', fromPoint(R.view(pointLens, market))),
  market
);

// Output transformation (Markets.js:10-13)
const toPoint = R.applySpec({
  latitude: R.path(['coordinates', 0]),
  longitude: R.path(['coordinates', 1])
});
const normalizePointsOutput = market => R.set(
  pointLens,
  toPoint(R.view(pointLens, market)),
  market
);
```

**Found In:**
- [app/graphql/schema/resolvers/Markets.js:10-32](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Markets.js:10)
- [app/graphql/schema/resolvers/Campaign/util.js:110-117](/Users/Brodie.Balser/Documents/TM/titan/monoql/app/graphql/schema/resolvers/Campaign/util.js:110) - Venue coordinates

---

### Pattern: Token Validation and Re-authentication

**Description:** Validate user session integrity and re-authenticate when tokens change

**Flow:**
```
1. Extract TM token from cookie
2. Compare token signature with stored auth signature
3. If different: re-authenticate with identity service
4. Verify user ID matches
5. Throw error if user changed (session hijacking prevention)
```

**Implementation:**
```javascript
const throwIfTokenMismatch = async ({ root, ctx }) => {
  const tmToken = ctx.cookies.get(TM_COOKIES.SOTC);
  const authUserId = selectAuthUserId(ctx);
  const updatedAuthUserId = await compareAndUpdateToken({ root, ctx, tmToken });
  if (authUserId !== updatedAuthUserId) {
    throw error(invalidSession);
  }
}
```

**Security Purpose:**
- Prevents session hijacking
- Ensures token and authenticated user match
- Re-authenticates on token rotation

**Found In:**
- [throwIfTokenMismatch](#throwiftokenmismatch)
- [compareAndUpdateToken](#compareandupdatetoken)
- Used by all entry mutation resolvers

---

### Pattern: Request Context Enrichment

**Description:** Augment user-submitted data with request metadata for audit and fraud prevention

**Context Fields:**
```javascript
{
  user_agent: string,     // Browser/client identifier
  ip: string,             // Request IP address
  ip_country: string,     // Country from Cloudflare header
  forwarded_for: string,  // X-Forwarded-For chain
  session_id: string      // NuDetect fraud detection session
}
```

**Usage:**
```javascript
const entryCtx = selectEntryContext({ ctx });
const entry = {
  ...entryCtx,      // Request metadata
  ...userEntry      // User-submitted fields
};
```

**Purpose:**
- Fraud detection
- Audit trails
- Geolocation analysis
- Bot detection

**Found In:**
- [selectEntryContext](#selectentrycontext)
- [upsertViewerEntry](#upsertviewerentry)

---

### Pattern: FAQ Array ↔ Object Transformation

**Description:** Convert between array format (GraphQL) and keyed object format (backend storage)

**Flow:**
```
GraphQL (Array with IDs)        Backend (Keyed Object)
[                        →      {
  { id: 'faq-1',                   'faq-1': {
    question: '...',                 question: '...',
    answer: '...' },                 answer: '...'
  { id: 'faq-2', ... }             },
]                                  'faq-2': { ... }
                                 }
```

**Purpose:**
- Backend: O(1) lookup by ID, easier updates
- GraphQL: Array preserves order, more natural API

**Found In:**
- [maybeConvertFaqsFromArray](#maybeconvertfaqsfromarray) - Input
- [maybeConvertFaqsToArray](#maybeconvertfaqstoarray) - Output
- [convertArrayIdsToObjectKeys](#convertarrayidstoobjectkeys) - Generic helper
- [convertObjectKeysToArrayIds](#convertobjectkeystoarrayids) - Generic helper

---

### Pattern: Localized Content Dual Format

**Description:** Support both new (localized array) and legacy (keyed) locale access patterns

**Output Structure:**
```javascript
{
  localized: [
    { locale: 'en_US', value: { body: { ... } } },
    { locale: 'fr_CA', value: { body: { ... } } }
  ],
  en_US: { body: { ... } },  // Deprecated but preserved
  fr_CA: { body: { ... } }   // Deprecated but preserved
}
```

**Purpose:**
- New clients use `localized` array (clean API, supports any locale)
- Legacy clients use keyed fields (`en_US`, `fr_CA`, etc.)
- Smooth migration path

**Implementation:**
- [keyedLocalesToLocalizedArray](#keyedlocalestolocalizedarray) - Generates both formats
- GraphQL schema marks keyed fields as `@deprecated`

**Found In:**
- CampaignContent type
- FieldLabel type
- Content type

---

### Pattern: Password Cookie Management

**Description:** Securely store campaign passwords in encrypted httpOnly cookies

**Flow:**
```
1. User submits password for protected campaign
2. Password validated against campaign
3. Password stored in cookie: { domain → password } map
4. Cookie is base64-encoded, httpOnly (JavaScript can't access)
5. Future requests auto-retrieve password from cookie
```

**Security:**
- httpOnly prevents XSS attacks
- Base64 encoding (not encryption, but obfuscation)
- Per-domain password storage

**Found In:**
- [getPasswordMapFromCookies](#getpasswordmapfromcookies)
- [setPasswordCookie](#setpasswordcookie)
- [campaign (Viewer field resolver)](#campaign-viewer-field-resolver)

---

## Type Confidence Legend

- **95-100% High Confidence**: Explicit TypeScript types or detailed GraphQL schema definitions
- **70-94% Medium Confidence**: JSDoc annotations with detailed type information
- **50-69% Low Confidence**: Inferred from default values, usage patterns, or sample data

All resolver functions in this document are High Confidence (95-100%) as they implement explicit GraphQL schema definitions.
