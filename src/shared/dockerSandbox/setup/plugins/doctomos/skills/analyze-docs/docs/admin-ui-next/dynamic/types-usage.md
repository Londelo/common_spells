# Type Usage Patterns - admin-ui-next

## Function Signatures

### Exported Functions with Object Parameters

#### useCampaignsList
**Confidence:** 95-100% High

```typescript
function useCampaignsList(currentPage: number): {
  data: CampaignRes[];
  error: ApolloError | undefined;
}
```

**Source:** [lib/hooks/graphql/useCampaignsList.ts](../lib/hooks/graphql/useCampaignsList.ts:4)

**Parameter Shape:**
- `currentPage` (number, required) - Current page number for pagination

**Return Type:** Object with:
- `data` - Array<[CampaignRes](../lib/graphql/queries/getCampaign.ts)>
- `error` - ApolloError | undefined

**Called By:**
- [Campaigns page component](../app/campaigns/page.tsx) (page rendering)

**Calls:**
- `useSuspenseQuery<CampaignsListRes>` (Apollo Client hook)

**Confidence Note:** Explicit TypeScript types with generics

---

#### useGetCampaign
**Confidence:** 95-100% High

```typescript
function useGetCampaign(campaignId: string): {
  data: {
    campaign: CampaignRes;
    markets: MarketRes[];
  };
  error: ApolloError | undefined;
}
```

**Source:** [lib/hooks/graphql/useGetCampaign.ts](../lib/hooks/graphql/useGetCampaign.ts:12)

**Parameter Shape:**
- `campaignId` (string, required) - Campaign ID to fetch

**Return Type:** Object with:
- `data.campaign` - [CampaignRes](../lib/graphql/queries/getCampaign.ts)
- `data.markets` - Array<[MarketRes](../lib/graphql/fragments/marketObject.ts)>
- `error` - ApolloError | undefined

**Called By:**
- [Campaign layout component](../app/campaigns/[campaignId]/layout.tsx)
- [Campaign page component](../app/campaigns/[campaignId]/page.tsx)

**Calls:**
- `useSuspenseQuery<Viewer>` (Apollo Client hook)
- `cleanTypename` (utility function)

**Confidence Note:** Explicit TypeScript types

---

#### useGetPromoters
**Confidence:** 95-100% High

```typescript
function useGetPromoters(): {
  promoters: Promoter[];
  error: ApolloError | undefined;
}
```

**Source:** [lib/hooks/graphql/useGetPromoters.ts](../lib/hooks/graphql/useGetPromoters.ts:10)

**Return Type:** Object with:
- `promoters` - Array<[Promoter](../lib/graphql/fragments/promoterFields.ts)>
- `error` - ApolloError | undefined

**Called By:**
- [Promoters page component](../app/promoters/page.tsx)
- [EventForm component](../components/EventForm/index.tsx)

**Calls:**
- `useSuspenseQuery<GetPromoters>` (Apollo Client hook)
- `cleanTypename` (utility function)

**Confidence Note:** Explicit TypeScript types

---

#### useUpsertMarket
**Confidence:** 95-100% High

```typescript
function useUpsertMarket(): {
  upsertMarket: (market: MarketInput) => Promise<FetchResult>;
  loading: boolean;
  error: ApolloError | undefined;
}
```

**Source:** [lib/hooks/graphql/useUpsertMarket.ts](../lib/hooks/graphql/useUpsertMarket.ts) (inferred)

**Return Type:** Object with:
- `upsertMarket` - Function accepting [MarketInput](../lib/types/campaign.ts)
- `loading` - boolean
- `error` - ApolloError | undefined

**Called By:**
- [useEventForm](../components/EventForm/useEventForm.ts:148)

**Calls:**
- `useMutation` (Apollo Client hook)

**Confidence Note:** Explicit TypeScript types

---

#### useUpsertPromoter
**Confidence:** 95-100% High

```typescript
function useUpsertPromoter(): {
  upsertPromoter: (promoter: PromoterInput) => Promise<FetchResult>;
  loading: boolean;
  error: ApolloError | undefined;
}
```

**Source:** [lib/hooks/graphql/useUpsertPromoter.ts](../lib/hooks/graphql/useUpsertPromoter.ts:14)

**Return Type:** Object with:
- `upsertPromoter` - Function accepting [PromoterInput](../lib/graphql/mutations/upsertPromoter.ts)
- `loading` - boolean
- `error` - ApolloError | undefined

**Called By:**
- [usePromoterForm](../components/Promoters/PromoterForm/usePromoterForm.ts:51)

**Calls:**
- `useMutation<Promoter, UpsertPromoterInput>` (Apollo Client hook)

**Confidence Note:** Explicit TypeScript types with generics

---

#### useDeletePromoter
**Confidence:** 95-100% High

```typescript
function useDeletePromoter(): {
  deletePromoter: (promoterId: string) => Promise<FetchResult>;
  loading: boolean;
  error: ApolloError | undefined;
}
```

**Source:** [lib/hooks/graphql/useDeletePromoter.ts](../lib/hooks/graphql/useDeletePromoter.ts:11)

**Parameter Shape (deletePromoter function):**
- `promoterId` (string, required) - ID of promoter to delete

**Return Type:** Object with:
- `deletePromoter` - Function
- `loading` - boolean
- `error` - ApolloError | undefined

**Called By:**
- [Promoters page component](../app/promoters/page.tsx) (deletion confirmation)

**Calls:**
- `useMutation<DeletePromoterResult, DeletePromoterInput>` (Apollo Client hook)

**Confidence Note:** Explicit TypeScript types

---

#### useDeleteMarket
**Confidence:** 95-100% High

```typescript
function useDeleteMarket(): {
  deleteMarket: (marketId: string) => Promise<FetchResult>;
  loading: boolean;
  error: ApolloError | undefined;
}
```

**Source:** [lib/hooks/graphql/useDeleteMarket.ts](../lib/hooks/graphql/useDeleteMarket.ts) (inferred)

**Parameter Shape (deleteMarket function):**
- `marketId` (string, required) - ID of market to delete

**Called By:**
- [Events page component](../app/campaigns/[campaignId]/events/page.tsx)

**Calls:**
- `useMutation` (Apollo Client hook)

**Confidence Note:** Explicit TypeScript types

---

#### useVenueSearch
**Confidence:** 95-100% High

```typescript
function useVenueSearch(queryStr: string): {
  venues: VenueRes[];
  loading: boolean;
  error: ApolloError | undefined;
}
```

**Source:** [lib/hooks/graphql/useVenueSearch.ts](../lib/hooks/graphql/useVenueSearch.ts) (inferred)

**Parameter Shape:**
- `queryStr` (string, required) - Search query for venues

**Return Type:** Object with:
- `venues` - Array<[VenueRes](../lib/graphql/queries/searchVenues.ts)>
- `loading` - boolean
- `error` - ApolloError | undefined

**Called By:**
- [VenueSearchField component](../components/EventForm/VenueSearchField.tsx)

**Calls:**
- `useLazyQuery` (Apollo Client hook)

**Confidence Note:** Explicit TypeScript types

---

#### useEventForm
**Confidence:** 95-100% High

```typescript
function useEventForm(
  campaignId: string,
  market?: MarketRes
): {
  form: UseFormReturn<FormValues>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  formState: FormState<FormValues>;
}
```

**Source:** [components/EventForm/useEventForm.ts](../components/EventForm/useEventForm.ts:145)

**Parameter Shape:**
- `campaignId` (string, required) - Campaign ID for the event
- `market` ([MarketRes](../lib/graphql/fragments/marketObject.ts), optional) - Existing market data for edit mode

**Return Type:** Object with:
- `form` - React Hook Form instance for [FormValues](../components/EventForm/useEventForm.ts:11)
- `handleSubmit` - Form submission handler
- `formState` - Form state object

**Called By:**
- [EventForm component](../components/EventForm/index.tsx:45)

**Calls:**
- `useForm<FormValues>` (React Hook Form)
- `useUpsertMarket` (custom hook)
- `createSubmitPayload` (internal transform function)

**Confidence Note:** Explicit TypeScript types

---

#### usePromoterForm
**Confidence:** 95-100% High

```typescript
function usePromoterForm(promoter?: Promoter): {
  form: UseFormReturn<PromoterFormValues>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  formState: FormState<PromoterFormValues>;
}
```

**Source:** [components/Promoters/PromoterForm/usePromoterForm.ts](../components/Promoters/PromoterForm/usePromoterForm.ts:45)

**Parameter Shape:**
- `promoter` ([Promoter](../lib/graphql/fragments/promoterFields.ts), optional) - Existing promoter for edit mode

**Return Type:** Object with:
- `form` - React Hook Form instance for [PromoterFormValues](../components/Promoters/PromoterForm/usePromoterForm.ts:9)
- `handleSubmit` - Form submission handler
- `formState` - Form state object

**Called By:**
- [PromoterForm component](../components/Promoters/PromoterForm/index.tsx:30)

**Calls:**
- `useForm<PromoterFormValues>` (React Hook Form)
- `useUpsertPromoter` (custom hook)
- `createSubmitPayload` (internal transform function)
- `hasLocaleDuplicates` (validation function)

**Confidence Note:** Explicit TypeScript types

---

#### useTableControls
**Confidence:** 95-100% High

```typescript
function useTableControls<T extends { id: string }>(
  options: UseTableControlsOptions<T>
): UseTableControlsReturn<T>
```

**Source:** [lib/hooks/useTableControls/index.tsx](../lib/hooks/useTableControls/index.tsx) (inferred)

**Parameter Shape:**
- `options` - [UseTableControlsOptions<T>](../lib/hooks/useTableControls/types.ts:3)
  - `itemName` (string, optional) - Display name for items
  - `items` (T[], optional) - List of items to manage
  - `deleteAction` ((id: string) => void, optional) - Delete callback
  - `addAction` (() => void, optional) - Add callback
  - `disableExpand` (boolean, optional) - Disable expand/collapse
  - `disableDeleteAll` (boolean, optional) - Disable bulk delete
  - `filterKey` (keyof T, optional) - Key for search filtering

**Return Type:** [UseTableControlsReturn<T>](../lib/hooks/useTableControls/types.ts:49)

**Generic Parameter:**
- `T extends { id: string }` - Item type with required `id` field

**Called By:**
- [PromotersTable component](../components/Promoters/PromotersTable/index.tsx)
- [EventsList component](../components/EventsList/index.tsx)

**Calls:**
- `useBoolean` (custom hook)
- `useBooleanSet` (custom hook)
- `useFuzzySearch` (custom hook)

**Confidence Note:** Explicit TypeScript types with generics

---

#### parseClientConfig
**Confidence:** 95-100% High

```typescript
function parseClientConfig(config: unknown): ClientConfig
```

**Source:** [lib/config/client.ts](../lib/config/client.ts:4)

**Parameter Shape:**
- `config` (unknown, required) - Raw configuration object to validate

**Return Type:** [ClientConfig](../lib/config/client.ts:6)

**Called By:**
- Configuration initialization code

**Calls:**
- `ClientConfigSchema.parse` (Zod validation)

**Confidence Note:** Explicit TypeScript types with Zod validation

---

#### createSubmitPayload (EventForm)
**Confidence:** 95-100% High

```typescript
function createSubmitPayload(
  form: FormValues,
  campaignId: string
): MarketInput
```

**Source:** [components/EventForm/useEventForm.ts](../components/EventForm/useEventForm.ts:99)

**Parameter Shape:**
- `form` - [FormValues](../components/EventForm/useEventForm.ts:11)
  - `id` (string, required)
  - `city` (string, required)
  - `state` (string, required)
  - `timezone` (string, required)
  - `isAddedShow` (boolean, required)
  - `promoterFields` ({ id: string }[], required)
  - `point` ({ latitude: number; longitude: number } | undefined, optional)
  - `eventIds` (string[], required)
  - `showDate` (string, required)
  - `presaleDate` (string, required)
  - `ticketer` (string, required)
  - `link` (string, required)
  - `venue` (VenueRes | undefined, optional)
  - `search` (string, required)
  - `sharedCode` (string, required)
  - `hasSplitAllocation` (boolean, required)
  - `splitAllocationType` (string, required)
  - `splitAllocationLink` (string, required)
  - `splitAllocationIsActive` (boolean, required)
- `campaignId` (string, required) - Campaign ID

**Return Type:** [MarketInput](../lib/types/campaign.ts:26)

**Called By:**
- [useEventForm](../components/EventForm/useEventForm.ts:151) (handleSubmit)

**Calls:**
- `buildMarketName` (internal function)
- `formClockToUTC` (date utility)
- `R.pluck` (Ramda utility)
- `R.reject` (Ramda utility)

**Transformation Logic:**
- Converts form dates from local timezone to UTC
- Builds market name from venue, city, state, and date
- Filters empty promoter IDs
- Conditionally includes split allocation based on `hasSplitAllocation`
- Removes nil values before submission

**Confidence Note:** Explicit TypeScript types

---

#### createSubmitPayload (PromoterForm)
**Confidence:** 95-100% High

```typescript
function createSubmitPayload(
  form: PromoterFormValues
): PromoterInput
```

**Source:** [components/Promoters/PromoterForm/usePromoterForm.ts](../components/Promoters/PromoterForm/usePromoterForm.ts:15)

**Parameter Shape:**
- `form` - [PromoterFormValues](../components/Promoters/PromoterForm/usePromoterForm.ts:9)
  - `id` (string, optional)
  - `name` (string, required)
  - `privacyUrls` (LocalizedUrl[], required)
    - `url` (string, required)
    - `locale` (string, required)
    - `is_default` (boolean, optional)

**Return Type:** [PromoterInput](../lib/graphql/mutations/upsertPromoter.ts:14)

**Called By:**
- [usePromoterForm](../components/Promoters/PromoterForm/usePromoterForm.ts:54) (handleSubmit)

**Transformation Logic:**
- Sets first privacy URL as default (`is_default: true`)
- Removes undefined `id` if not present

**Confidence Note:** Explicit TypeScript types

---

#### buildMarketName
**Confidence:** 95-100% High

```typescript
function buildMarketName(form: FormValues): string
```

**Source:** [components/EventForm/useEventForm.ts](../components/EventForm/useEventForm.ts:44)

**Parameter Shape:**
- `form` - [FormValues](../components/EventForm/useEventForm.ts:11)
  - `venue` (VenueRes | undefined, optional)
  - `search` (string, required)
  - `city` (string, required)
  - `state` (string, required)
  - `showDate` (string, required)
  - `timezone` (string, required)

**Return Type:** string

**Called By:**
- [createSubmitPayload](../components/EventForm/useEventForm.ts:106) (EventForm)

**Transformation Logic:**
- Formats date as MM/dd in venue timezone
- Combines: `MM/dd - City, State - Venue Name`
- Filters out empty values

**Confidence Note:** Explicit TypeScript types

---

#### setDefaultFormValues
**Confidence:** 95-100% High

```typescript
function setDefaultFormValues(market: MarketRes): Partial<FormValues>
```

**Source:** [components/EventForm/useEventForm.ts](../components/EventForm/useEventForm.ts:72)

**Parameter Shape:**
- `market` - [MarketRes](../lib/graphql/fragments/marketObject.ts:35)

**Return Type:** Partial<[FormValues](../components/EventForm/useEventForm.ts:11)>

**Called By:**
- [useEventForm](../components/EventForm/useEventForm.ts:146) (initialization)

**Transformation Logic:**
- Converts UTC dates to local timezone for form display
- Extracts nested venue name
- Converts promoter IDs to form field objects
- Determines `hasSplitAllocation` based on type and ticketer

**Uses Ramda:**
- `R.applySpec` - Builds object from spec
- `R.pathOr` - Safe path extraction with defaults

**Confidence Note:** Explicit TypeScript types

---

## Data Transformation Flows

### EventForm: FormValues → MarketInput → Market

**Flow:**

1. **User Input** → [FormValues](../components/EventForm/useEventForm.ts:11)
   - Form captures raw user input with local dates/times
   - Includes UI-specific fields like `search`, `hasSplitAllocation`

2. **Transform** → [MarketInput](../lib/types/campaign.ts:26)
   - Via `createSubmitPayload` function
   - Converts local dates to UTC
   - Builds market name from components
   - Filters empty promoter IDs
   - Removes UI-specific fields

3. **Mutation** → Database
   - `admin_upsertMarket` mutation
   - GraphQL sends `MarketInput` to server

4. **Response** → [Market](../lib/graphql/fragments/marketObject.ts:35)
   - Server returns fully populated `Market` object
   - Includes generated `id` (if new)
   - All nested objects expanded

**Key Transformations:**
- `showDate` + `showTime` → `event.date` (UTC)
- `presaleDate` + `presaleTime` → `event.presaleDateTime` (UTC)
- `venue.name` or `search` → `event.venue.name`
- `promoterFields[].id` → `promoterIds[]` (filtered)

---

### PromoterForm: PromoterFormValues → PromoterInput → Promoter

**Flow:**

1. **User Input** → [PromoterFormValues](../components/Promoters/PromoterForm/usePromoterForm.ts:9)
   - Form captures promoter name and privacy URLs
   - Multiple localized URLs supported

2. **Transform** → [PromoterInput](../lib/graphql/mutations/upsertPromoter.ts:14)
   - Via `createSubmitPayload` function
   - Sets first URL as default
   - Preserves all privacy URLs

3. **Mutation** → Database
   - `upsertPromoter` mutation
   - GraphQL sends `PromoterInput` to server

4. **Response** → [Promoter](../lib/graphql/fragments/promoterFields.ts:9)
   - Server returns `Promoter` with:
     - Generated `id` (if new)
     - `date.created` timestamp
     - `date.updated` timestamp

**Key Transformations:**
- First `privacyUrls` entry gets `is_default: true`
- Server adds `id`, `date.created`, `date.updated`

---

### Market Edit: Market → FormValues → MarketInput → Market

**Round-Trip Flow:**

1. **Fetch** → [Market](../lib/graphql/fragments/marketObject.ts:35)
   - Query fetches existing market from database
   - Dates in UTC

2. **Initialize Form** → [FormValues](../components/EventForm/useEventForm.ts:11)
   - Via `setDefaultFormValues` function
   - Converts UTC dates to local timezone
   - Splits date/time into separate fields
   - Extracts nested values to flat structure

3. **User Edit** → Modified [FormValues](../components/EventForm/useEventForm.ts:11)
   - User makes changes in form

4. **Submit** → [MarketInput](../lib/types/campaign.ts:26)
   - Via `createSubmitPayload` function
   - Same transformations as create flow

5. **Update** → Updated [Market](../lib/graphql/fragments/marketObject.ts:35)
   - Server returns updated market

**Key Round-Trip Considerations:**
- UTC ↔ Local timezone conversions
- Flat form structure ↔ Nested API structure
- UI fields (search, hasSplitAllocation) ↔ API data

---

## Validation Patterns

### Zod Schema Validation

#### ClientConfigSchema
**Type:** Zod Object Schema

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

**Source:** [configs/schema/client.mjs](../configs/schema/client.mjs:3)

**Used By:**
- [parseClientConfig](../lib/config/client.ts:4) (validation function)

**Validation Rules:**
- All fields required strings
- Throws if any field missing or wrong type

---

#### ServerConfigSchema
**Type:** Zod Object Schema

```typescript
z.object({
  LOCAL_HOST: z.string(),
  LOCAL_PORT: z.number(),
  BUILD_ENV: z.enum(['dev', 'qa', 'preprod', 'stage', 'prod'])
})
```

**Source:** [configs/schema/server.mjs](../configs/schema/server.mjs:6)

**Validation Rules:**
- `LOCAL_HOST` - required string
- `LOCAL_PORT` - required number
- `BUILD_ENV` - must be one of 5 allowed values

---

### Custom Validation Functions

#### hasLocaleDuplicates
**Type:** Validation Function

```typescript
function hasLocaleDuplicates(data: PromoterFormValues): boolean
```

**Source:** [components/Promoters/PromoterForm/usePromoterForm.ts](../components/Promoters/PromoterForm/usePromoterForm.ts:43)

**Logic:**
- Extracts `locale` from all `privacyUrls`
- Checks if any locale appears more than once
- Uses Ramda: `R.pipe`, `R.prop`, `R.map`, `R.uniq`

**Used By:**
- [usePromoterForm](../components/Promoters/PromoterForm/usePromoterForm.ts:56) (handleSubmit validation)

**Error Handling:**
- Throws error: "Duplicate locales are not allowed"

---

#### checkHasSplitAllocation
**Type:** Validation Function

```typescript
function checkHasSplitAllocation(market: MarketRes): boolean
```

**Source:** [components/EventForm/useEventForm.ts](../components/EventForm/useEventForm.ts:69)

**Logic:**
- Checks if `splitAllocation.type` is 'concurrent' or 'sequential'
- Checks if `ticketer` field is populated
- Returns true only if both conditions met

**Used By:**
- [setDefaultFormValues](../components/EventForm/useEventForm.ts:85) (form initialization)

---

## React Hook Form Integration

### FormValues Type Pattern

Both `FormValues` and `PromoterFormValues` follow this pattern:

**Structure:**
```typescript
type FormValues = {
  // Identity
  id?: string;

  // Form fields (flat structure)
  field1: type1;
  field2: type2;

  // Nested objects (flattened for form)
  nestedField1: type3;
  nestedField2: type4;
}
```

**Usage:**
```typescript
const form = useForm<FormValues>({
  defaultValues: {...},
  mode: 'all' | 'onBlur'
});
```

**Transform Pattern:**
```typescript
const handleSubmit = form.handleSubmit(async (data: FormValues) => {
  const payload = createSubmitPayload(data);
  await mutationHook(payload);
});
```

---

## GraphQL Query Response Types

### Pattern: Query → Response Type → Normalized Data

#### useCampaignsList
**Query Variables:**
```typescript
{
  limit: number;
  skip: number;
  sort: string;
  query: string;
  type: string;
  version: string;
}
```

**Raw Response:** [CampaignsListRes](../lib/graphql/queries/campaignsList.ts:44)
```typescript
{
  viewer: {
    campaigns: {
      list: Campaign[];
    }
  }
}
```

**Normalized Return:**
```typescript
{
  data: Campaign[];
  error?: ApolloError;
}
```

---

#### useGetCampaign
**Query Variables:**
```typescript
{
  id: string;
  showAllLocales: boolean;
}
```

**Raw Response:** Viewer wrapper
```typescript
{
  viewer: {
    campaign: CampaignRes;
  }
}
```

**Normalized Return:**
```typescript
{
  data: {
    campaign: CampaignRes;
    markets: MarketRes[];
  };
  error?: ApolloError;
}
```

**Transformation:**
- Extracts `campaign` from `viewer.campaign`
- Extracts `markets` from `campaign.markets` (or empty array)
- Runs `cleanTypename` to remove GraphQL `__typename` fields

---

#### useGetPromoters
**Query Variables:** None

**Raw Response:** [GetPromoters](../lib/hooks/graphql/useGetPromoters.ts:6)
```typescript
{
  promoters: Promoter[];
}
```

**Normalized Return:**
```typescript
{
  promoters: Promoter[];
  error?: ApolloError;
}
```

**Transformation:**
- Runs `cleanTypename` to remove `__typename` fields
- Returns promoters array directly (or empty array)

---

## Common Patterns

### Pattern: Apollo Hook Wrapper

**Description:** Wraps Apollo Client hooks with type-safe, normalized return values

**Example Usage:**
```typescript
const useCustomQuery = (param: string) => {
  const { data: original, error } = useSuspenseQuery<ResponseType>(
    QUERY,
    { variables: { param }, errorPolicy: 'all' }
  );

  const data = cleanTypename(original);
  const normalized = transformData(data);

  return { data: normalized, error };
};
```

**Found In:**
- [useCampaignsList](../lib/hooks/graphql/useCampaignsList.ts)
- [useGetCampaign](../lib/hooks/graphql/useGetCampaign.ts)
- [useGetPromoters](../lib/hooks/graphql/useGetPromoters.ts)

---

### Pattern: Form Transform Functions

**Description:** Transform form state to API input types

**Example Usage:**
```typescript
const createSubmitPayload = (form: FormValues): ApiInput => {
  return {
    // Remove UI-only fields
    // Transform nested structures
    // Convert data formats (dates, etc.)
  };
};
```

**Found In:**
- [createSubmitPayload (EventForm)](../components/EventForm/useEventForm.ts:99)
- [createSubmitPayload (PromoterForm)](../components/Promoters/PromoterForm/usePromoterForm.ts:15)

---

### Pattern: Ramda Data Transformation

**Description:** Use Ramda utilities for functional data transformation

**Example Usage:**
```typescript
const transform = R.pipe(
  R.prop('field'),
  R.map(R.objOf('key')),
  R.reject(R.isEmpty)
);
```

**Found In:**
- [setPromoterFields](../components/EventForm/useEventForm.ts:60)
- [setDefaultFormValues](../components/EventForm/useEventForm.ts:72)
- [hasLocaleDuplicates](../components/Promoters/PromoterForm/usePromoterForm.ts:43)

**Common Ramda Functions:**
- `R.pipe` - Function composition
- `R.pathOr` - Safe nested property access with default
- `R.applySpec` - Build object from specification
- `R.map` - Array transformation
- `R.reject` - Filter out values
- `R.pluck` - Extract property from objects
- `R.uniq` - Remove duplicates

---

### Pattern: Date Conversion (UTC ↔ Local)

**Description:** Convert between UTC (API) and local timezone (UI)

**API → Form:**
```typescript
const dateToFormClock = (datePath: Path) => (market: MarketRes): string => {
  const date = R.path<string>(datePath, market);
  const tz = R.path<string>(['timezone'], market);
  return UTCToFormClock(date, tz);
};
```

**Form → API:**
```typescript
const utcDate = formClockToUTC(showDate, timezone);
```

**Found In:**
- [useEventForm](../components/EventForm/useEventForm.ts:36-42)
- [useEventForm](../components/EventForm/useEventForm.ts:118-119)

---

### Pattern: Generic Table Controls

**Description:** Reusable table state management with TypeScript generics

**Example Usage:**
```typescript
const { isSelected, setIsSelected, Controls, EmptyState, filteredItems } =
  useTableControls<ItemType>({
    items: data,
    itemName: 'promoter',
    deleteAction: handleDelete,
    addAction: handleAdd,
    filterKey: 'name'
  });
```

**Generic Constraint:**
- `T extends { id: string }` - All items must have `id` field

**Found In:**
- [useTableControls](../lib/hooks/useTableControls/index.tsx)
- Used by [PromotersTable](../components/Promoters/PromotersTable/index.tsx)
- Used by [EventsList](../components/EventsList/index.tsx)

---

## Type-Safe Mutation Patterns

### Pattern: Typed Mutation Hooks

**Description:** Type-safe Apollo mutation wrappers with automatic cache updates

**Example:**
```typescript
const useCustomMutation = () => {
  const [mutationFn, { loading, error }] = useMutation<
    ResultType,
    InputType
  >(MUTATION);

  const mutation = (input: InputType) =>
    mutationFn({
      variables: { input },
      errorPolicy: 'all',
      refetchQueries: [{ query: RELATED_QUERY }]
    });

  return { mutation, loading, error };
};
```

**Found In:**
- [useUpsertPromoter](../lib/hooks/graphql/useUpsertPromoter.ts:14)
- [useDeletePromoter](../lib/hooks/graphql/useDeletePromoter.ts:11)

**Benefits:**
- Type safety on input and output
- Automatic cache invalidation via `refetchQueries`
- Consistent error handling
