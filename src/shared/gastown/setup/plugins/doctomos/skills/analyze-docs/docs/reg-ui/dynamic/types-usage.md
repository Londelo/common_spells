# Type Usage Patterns - reg-ui

## Function Signatures

### Exported Functions with Object Parameters

#### transformCampaign
**Confidence:** 95-100% High

```typescript
const transformCampaign = async ({ campaign, targetLocale }: TransformParams): Promise<Campaign>
```

**Source:** [lib/utils/campaign/transform/transformCampaign.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/transformCampaign.ts:34)

**Parameter Shape:**
- `campaign` (CachedCampaign, required) - Raw campaign from Redis cache
- `targetLocale` (string, optional) - Target locale for transformation

**Return Type:** Promise<[Campaign](../types-definitions.md#campaign)>

**Called By:**
- [lookupCampaign](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/lookupCampaign.ts) (server-side campaign loading)
- [app/[...path]/page.tsx](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/app/[...path]/page.tsx) (route handler)

**Calls:**
- [getArtistData](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/getArtistData.ts) (fetch artist details)
- [getPromoterData](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/getPromoterData.ts) (fetch promoters)
- [normalizeContent](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/normalizeContent/index.ts) (normalize content)
- [normalizePreferences](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/normalizePreferences/index.ts) (normalize preferences)

**Confidence Note:** Explicit TypeScript types with inline type alias

**Transformation Logic:**
```typescript
// Transforms cached campaign to application campaign:
const transformCampaign = async ({ campaign, targetLocale }: TransformParams) => {
  // 1. Resolve locale (target or default)
  const locale = targetLocale || selectDefaultLocale(campaign);

  // 2. Enrich artist with Discovery API data
  const artistDetail = await getArtistData(campaign.artist.discovery_id, targetLocale);
  const normalizedArtist = artistDetail ? normalizeArtist(artist, artistDetail) : artist;

  // 3. Fetch promoter details
  const promoters = await getPromoterData(campaign);

  // 4. Normalize markets (remove sensitive data like sharedCode)
  const normalizedMarkets = normalizeMarkets(markets);

  // 5. Normalize content and preferences for locale fallback
  const normalizedContent = normalizeContent(campaign.content, fallbackLocalePairings);
  const normalizedPreferences = normalizePreferences(campaign.preferences, fallbackLocalePairings);

  // 6. Determine LNAA eligibility based on locale
  const normalizedOptions = normalizeOptions(campaign.options, locale);

  // 7. Return transformed campaign with enriched data
  return { ...campaign, artist: normalizedArtist, content: normalizedContent, ... };
};
```

**Fields Added:**
- `artist.detail` - Artist details from Discovery API
- `artist.adpUrl` - Artist detail page URL
- `currentLocale` - Resolved current locale
- `adminStatus` - Original campaign status (before transformation)
- `promoters` - Promoter details mapped by ID
- `options.isLNAA` - Computed LNAA eligibility

**Fields Removed:**
- `markets[].event.sharedCode` - Security: Entry codes removed from client

---

#### useLoadCampaignData
**Confidence:** 95-100% High

```typescript
const useLoadCampaignData = ({
  campaign,
  linkedCampaign
}: {
  campaign: Campaign;
  linkedCampaign: LinkedCampaign | null;
}) => void
```

**Source:** [hooks/useLoadCampaignData.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/hooks/useLoadCampaignData.ts:6)

**Parameter Shape:**
- `campaign` (Campaign, required) - Transformed campaign data
- `linkedCampaign` (LinkedCampaign | null, required) - Linked fanclub campaign if gated

**Return Type:** void (React hook with side effects)

**Called By:**
- [app/[...path]/View.tsx](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/app/[...path]/View.tsx) (client component initialization)

**Calls:**
- `useStore.use.setCampaign()` - Updates global state with campaign
- `useStore.use.setLinkedCampaign()` - Updates global state with linked campaign

**Confidence Note:** Explicit TypeScript types

**Side Effects:**
- Loads campaign into Zustand store on mount
- Extracts only needed fields from linkedCampaign (`artist`, `domain`, `tour`, `subType`)

---

#### normalizeArtist
**Confidence:** 95-100% High

```typescript
const normalizeArtist = (artist: Artist, detail: ArtistDetail) => Artist & { detail?: ArtistDetail }
```

**Source:** [lib/utils/campaign/transform/transformCampaign.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/transformCampaign.ts:17)

**Parameter Shape:**
- `artist` (Artist, required) - Base artist data from campaign
- `detail` (ArtistDetail, required) - Extended artist data from Discovery API

**Return Type:** Artist & { detail?: ArtistDetail }

**Called By:**
- [transformCampaign](#transformcampaign)

**Confidence Note:** Explicit TypeScript types

**Transformation Logic:**
```typescript
// Merges artist detail into artist object:
const normalizeArtist = (artist: Artist, detail: ArtistDetail) => ({
  ...artist,
  adpUrl: detail?.url,  // Add artist detail page URL
  detail               // Add full detail object
});
```

---

#### normalizeMarkets
**Confidence:** 95-100% High

```typescript
const normalizeMarkets = (markets: Market[]): Market[]
```

**Source:** [lib/utils/campaign/transform/transformCampaign.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/transformCampaign.ts:23)

**Parameter Shape:**
- `markets` (Market[], required) - Array of market objects

**Return Type:** Market[]

**Called By:**
- [transformCampaign](#transformcampaign)

**Confidence Note:** Explicit TypeScript types

**Transformation Logic:**
```typescript
// Removes sharedCode from each market for security:
const normalizeMarkets = (markets: Market[]): Market[] =>
  markets.map(market => R.dissocPath(['event', 'sharedCode'], market));
```

**Fields Removed:**
- `market.event.sharedCode` - Entry codes should not be exposed to client

---

#### isLNAA
**Confidence:** 95-100% High

```typescript
const isLNAA = (options: CachedCampaign['options'], locale: string): boolean
```

**Source:** [lib/utils/campaign/transform/transformCampaign.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/transformCampaign.ts:26)

**Parameter Shape:**
- `options` (CachedCampaign['options'], required) - Campaign options
- `locale` (string, required) - Current locale

**Return Type:** boolean

**Called By:**
- normalizeOptions (internal to transformCampaign)

**Confidence Note:** Explicit TypeScript types

**Logic:**
```typescript
// Determines if LNAA should be enabled:
// 1. Campaign must have isLNAA flag set
// 2. Locale's country must have a LiveNation domain mapping
const isLNAA = (options, locale) =>
  options?.isLNAA === true && !!lnCountryCodeToDomain[extractCountry(locale)];
```

---

### Store Actions

#### setPage
**Confidence:** 95-100% High

```typescript
setPage: (page: UiPage) => void
```

**Source:** [lib/store/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/store/index.ts:133)

**Parameter Shape:**
- `page` (UiPage, required) - Target page

**Side Effects:**
- Updates `ui.page` in store
- Sends Google Tag Manager page view event

**Called By:**
- SignupForm submit handler
- Back navigation handlers

**Confidence Note:** Explicit TypeScript types

---

#### updateForm
**Confidence:** 95-100% High

```typescript
updateForm: (value: Partial<Form>) => void
```

**Source:** [lib/store/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/store/index.ts:142)

**Parameter Shape:**
- `value` (Partial<Form>, required) - Form field updates

**Side Effects:**
- Merges updates into `form` state

**Called By:**
- Market selection handlers
- Opt-in checkbox handlers

**Confidence Note:** Explicit TypeScript types with Partial utility type

---

#### updateUser
**Confidence:** 95-100% High

```typescript
updateUser: (value: Partial<User>) => void
```

**Source:** [lib/store/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/store/index.ts:143)

**Parameter Shape:**
- `value` (Partial<User>, required) - User field updates

**Side Effects:**
- Merges updates into `user` state

**Called By:**
- Login handlers
- Entry record loaders

**Confidence Note:** Explicit TypeScript types with Partial utility type

---

#### openModal
**Confidence:** 95-100% High

```typescript
openModal: (type: ModalType, modalProps?: ErrorModal['modalProps']) => void
```

**Source:** [lib/store/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/store/index.ts:139)

**Parameter Shape:**
- `type` (ModalType, required) - Modal type to open
- `modalProps` (ErrorModal['modalProps'], optional) - Error modal props (code)

**Side Effects:**
- Updates `ui.modal` state

**Called By:**
- Error handlers
- Terms of use link handlers

**Confidence Note:** Explicit TypeScript types

---

### GraphQL Resolvers

#### upsertEntry Mutation Handler

**Mutation:** `Mutation.upsertEntry`

**Source:** GraphQL API (AppSync)

**Input Type:** [MutationUpsertEntryArgs](../types-definitions.md#mutationupsertentryargs)

**Fields Accessed:**
```typescript
// From mutation arguments:
const { entry, locale, slug, doTransfer } = args;
```

**Transformation Logic:**
```typescript
// Server processes entry data:
// 1. Validates campaign is open
// 2. Checks user authentication
// 3. Transforms entry AWSJSON to structured data
// 4. Checks for duplicate phone numbers
// 5. Validates market selections
// 6. Generates entry codes for selected markets
// 7. Stores entry in database
// 8. Returns EntryRecord with codes
```

**Output Type:** [EntryRecord](../types-definitions.md#entryrecord)

**Fields Added:**
- `codes[]` - Generated entry codes for each selected market
- `date.created` - Entry creation timestamp
- `date.updated` - Entry last update timestamp

---

#### checkLiveness Mutation Handler

**Mutation:** `Mutation.checkLiveness`

**Source:** GraphQL API (AppSync)

**Input Type:** [LivenessOptions](../types-definitions.md#livenessoptions)

**Fields Accessed:**
```typescript
// From mutation options:
const { appId, subjectId, tier, verificationType } = args.options;
```

**Transformation Logic:**
```typescript
// Server determines if liveness check required:
// 1. Check tier level (always, high, medium, low, asu)
// 2. Evaluate user's risk score
// 3. If verification needed:
//    - Create liveness session with vendor
//    - Return session token
// 4. If not needed:
//    - Return decision with requiresVerification: false
```

**Output Type:** [CheckLivenessResult](../types-definitions.md#checklivenessresult)

**Decision Flow:**
```
LivenessOptions (Input)
  ├─ tier: 'always' → Always require verification
  ├─ tier: 'high' → Require if risk score > threshold_high
  ├─ tier: 'medium' → Require if risk score > threshold_medium
  ├─ tier: 'low' → Require if risk score > threshold_low
  └─ tier: 'asu' → Adaptive scoring unit determines

Output:
  LivenessDecision
    ├─ requiresVerification: true → User must complete liveness check
    │   └─ session: LivenessSession (with token)
    └─ requiresVerification: false → User approved without check
```

---

#### fan.entryRecord Query Handler

**Query:** `Query.fan.entryRecord`

**Source:** GraphQL API (AppSync)

**Input Type:** `{ campaignId: ID! }`

**Fields Accessed:**
```typescript
// From query arguments:
const { campaignId } = args;
```

**Transformation Logic:**
```typescript
// Server retrieves entry:
// 1. Authenticate user from context
// 2. Query DynamoDB for entry by campaignId + userId
// 3. Decode entry codes for each market
// 4. Return entry record with codes
```

**Output Type:** [EntryRecord](../types-definitions.md#entryrecord)

**Fields Included:**
- `campaignId` - Campaign ID
- `codes[]` - Entry codes for selected markets (id, marketId)
- `fields` - User-submitted form data (AWSJSON)
- `attributes` - System attributes (AWSJSON)
- `locale` - Entry locale
- `date.created` - Creation timestamp
- `date.updated` - Last update timestamp
- `date.fanModified` - Last user modification timestamp

---

## Common Patterns

### Pattern: Campaign Loading Flow

**Description:** Server-side campaign loading, transformation, and hydration

**Example Usage:**
```typescript
// 1. Lookup campaign from Redis cache
const cachedCampaign = await cache.getCampaign(slug);

// 2. Transform campaign (normalize, enrich, localize)
const campaign = await transformCampaign({
  campaign: cachedCampaign,
  targetLocale: locale
});

// 3. Load linked campaign if gated
const linkedCampaign = campaign.options.gate.linkedCampaign
  ? await lookupLinkedCampaign(campaign.options.gate.linkedCampaign)
  : null;

// 4. Pass to client component for state hydration
<View campaign={campaign} linkedCampaign={linkedCampaign} />
```

**Found In:**
- [app/[...path]/page.tsx](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/app/[...path]/page.tsx:45)
- [lib/utils/campaign/lookupCampaign.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/lookupCampaign.ts:15)

---

### Pattern: Zustand Store Selectors

**Description:** Type-safe state selection with custom selector hook

**Example Usage:**
```typescript
// Create typed selectors from store
export const useStore = createSelectors(useStoreBase);

// Use in components:
const campaign = useStore.use.campaign();
const markets = useStore.use.form().markets;
const updateForm = useStore.use.updateForm();

// Instead of:
const campaign = useStore(state => state.campaign);
```

**Found In:**
- [lib/store/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/store/index.ts:151)
- [lib/store/createSelector.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/store/createSelector.ts:1)
- All components using store

---

### Pattern: Locale Fallback Chain

**Description:** Resolves missing translations/content through locale fallback

**Example Usage:**
```typescript
// Get fallback pairings: es-MX → es-US → en-US
const fallbackLocalePairings = getFallbackLocalePairings(campaign.locales);
// Returns: { 'es-MX': ['es-US', 'en-US'], ... }

// Normalize content with fallback
const normalizedContent = normalizeContent(campaign.content, fallbackLocalePairings);

// For missing es-MX content, falls back to es-US, then en-US
```

**Found In:**
- [lib/utils/campaign/locales/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/locales/index.ts:25)
- [lib/utils/campaign/transform/normalizeContent/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/normalizeContent/index.ts:10)
- [lib/utils/campaign/transform/normalizePreferences/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/normalizePreferences/index.ts:10)

---

### Pattern: GraphQL Error Handling

**Description:** Structured error handling with known error codes

**Example Usage:**
```typescript
try {
  await upsertEntryMutation({ ... });
} catch (error) {
  const graphqlError = error as GraphqlError;
  const errorCode = graphqlError.response?.errors?.[0]?.errorInfo?.code;

  if (errorCode === KnownErrorCodes.DUPLICATE_PHONE) {
    // Handle duplicate phone
  } else if (errorCode === KnownErrorCodes.CAMPAIGN_CLOSED) {
    // Handle closed campaign
  } else {
    // Handle unexpected error
  }
}
```

**Found In:**
- [graphql/types.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/graphql/types.ts:4)
- [lib/store/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/store/index.ts:44) (KnownErrorCodes enum)
- Form submission handlers

---

### Pattern: Market Distance Calculation

**Description:** Calculate distance between user location and market venues

**Example Usage:**
```typescript
import calculateDistance from 'lib/utils/calculateDistance';

// User location from geolocation API
const userLocation: ClientGeoPoint = { latitude: 40.7128, longitude: -74.0060 };

// Market venues from campaign
const markets = campaign.markets.map(market => ({
  ...market,
  distance: calculateDistance(
    userLocation,
    {
      latitude: market.point.coordinates[1],
      longitude: market.point.coordinates[0]
    }
  )
}));

// Sort markets by distance
const sortedMarkets = markets.sort((a, b) => a.distance - b.distance);
```

**Found In:**
- [lib/utils/calculateDistance.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/calculateDistance.ts:1)
- [hooks/useGetIndexedMarkets.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/hooks/useGetIndexedMarkets.ts:15)

---

### Pattern: Redis Cache Operations

**Description:** Campaign and promoter caching with TTL

**Example Usage:**
```typescript
// Get cached campaign
const campaign = await cache.getCampaign(slug);

// Set campaign in cache (8 hour TTL)
await cache.setCampaign({ slug, campaign });

// Get campaign ID by slug
const slug = await cache.getCampaignSlugById(campaignId);

// Get multiple promoters in one call
const promoters = await cache.getPromoters(['promoter1', 'promoter2']);

// Set promoter in cache
await cache.setPromoter(promoter);

// Close connections
await cache.quit();
```

**Found In:**
- [lib/cache.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/cache.ts:1)
- [lib/types/cache.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/types/cache.ts:1) (RegCache interface)
- [lib/utils/campaign/lookupCampaign.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/lookupCampaign.ts:10)

---

### Pattern: Functional Programming with Ramda

**Description:** Pure functional transformations using Ramda library

**Example Usage:**
```typescript
import * as R from 'ramda';

// Remove field from object (immutable)
const withoutSharedCode = R.dissocPath(['event', 'sharedCode'], market);

// Pick specific fields
const linkedCampaignSubset = R.pick(['artist', 'domain', 'tour', 'subType'], linkedCampaign);

// Merge objects
const merged = R.mergeDeepRight(baseContent, localeContent);

// Check if value exists
const hasGate = R.has('gate', campaign.options);

// Path-based access with default
const primaryColor = R.pathOr('#000000', ['style', 'theme', 'primary'], campaign);
```

**Found In:**
- Throughout codebase (enforced by ESLint functional programming rules)
- [lib/utils/campaign/transform/transformCampaign.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/transformCampaign.ts:24)
- [hooks/useLoadCampaignData.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/hooks/useLoadCampaignData.ts:20)

---

## Type Transformations

### CachedCampaign → Campaign

**Transformation:** `transformCampaign` function

**Key Changes:**
1. **Content Normalization:**
   - `PartialContent` → `Content` (all locales fully populated with fallback)

2. **Artist Enrichment:**
   - `Artist` → `Artist & { detail?: ArtistDetail }` (adds Discovery API data)
   - Adds `artist.adpUrl` field

3. **Promoter Addition:**
   - Empty → `Record<string, Promoter>` (promoter details loaded and indexed)

4. **Market Security:**
   - Removes `market.event.sharedCode` field (security)

5. **Options Enhancement:**
   - `options.isLNAA?: boolean` → `options.isLNAA: boolean` (computed based on locale)

6. **Status Handling:**
   - Original `status` → `adminStatus`
   - `status` set to OPEN if not closed

7. **Locale Resolution:**
   - Adds `currentLocale` field with resolved locale

**Source:** [lib/utils/campaign/transform/transformCampaign.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/transform/transformCampaign.ts:34)

---

### Form State → Entry AWSJSON

**Transformation:** Form submission handler

**Key Changes:**
1. **Markets Array:**
   - `Form.markets: string[]` → `entry.fields.markets: string[]` (market IDs)

2. **Opt-ins Flattening:**
   - `Form.allow_marketing: boolean` → `entry.fields.allow_marketing: boolean`
   - `Form.allow_livenation: boolean` → `entry.fields.allow_livenation: boolean`
   - `Form.allow_artist_sms: boolean` → `entry.fields.allow_artist_sms: boolean`
   - `Form.promoterOptIns?: string[]` → `entry.fields.promoterOptIns: string[]`

3. **LNAA Opt-in:**
   - `Form.lnaaOptIn: boolean` → `entry.fields.lnaaOptIn: boolean`

**Source:** SignupForm submit handlers

---

### EntryRecord → User State

**Transformation:** Entry record loader

**Key Changes:**
1. **Codes Mapping:**
   - `EntryRecord.codes: EntryCode[]` → `User.codeByMarket: Map<string, string>`
   - Indexed by market ID for O(1) lookup

2. **Entry Status:**
   - Entry exists → `User.hasEntry: true`

3. **Entry Date:**
   - `EntryRecord.date.fanModified` → `User.entryDate.fanModified`

**Source:** Entry loading hooks

---

## GraphQL Type Mappings

### GraphQL → TypeScript Generated Types

The `graphql/types.ts` file is auto-generated from GraphQL schema via `graphql-codegen`. Key mappings:

**Scalars:**
- `AWSDateTime` → `any` (parsed as ISO string)
- `AWSJSON` → `any` (parsed as JSON object)
- `AWSEmail` → `any` (validated as email string)
- `ID` → `string`

**Enums:** Direct 1:1 mapping (e.g., `LivenessSessionStatus`)

**Types:** Generated as TypeScript interfaces with `__typename` field

**Mutations/Queries:** Generated as typed functions with variables and return types

**Source:** [lib/types/appsync.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/types/appsync.ts:1) (auto-generated)

---

## Validation Schemas

This project does not use explicit validation schemas (Joi/Yup/Zod). Validation is handled through:

1. **TypeScript type checking** at compile time
2. **GraphQL schema validation** on server
3. **Runtime checks** in business logic

Example runtime validation:
```typescript
// Campaign status validation
export const isClosedStatus = (campaign: Campaign): boolean =>
  campaign.adminStatus === CampaignStatus.CLOSED;

export const isPreviewStatus = (campaign: Campaign): boolean =>
  campaign.adminStatus === CampaignStatus.PREVIEW;

// Market selection validation
const validateMarketSelection = (markets: string[], campaign: Campaign): boolean =>
  markets.length > 0 && markets.every(id =>
    campaign.markets.some(m => m.id === id)
  );
```

**Source:** [lib/utils/campaign/index.ts](file:///Users/Brodie.Balser/Documents/TM/titan/reg-ui/lib/utils/campaign/index.ts:1)
