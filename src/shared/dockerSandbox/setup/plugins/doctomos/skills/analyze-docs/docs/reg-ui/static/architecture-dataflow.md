# Data Flow - reg-ui

## Primary Flow

The reg-ui application follows a **server-first, client-hydration** data flow pattern for campaign registration pages. Data flows from external sources (Redis, AppSync) through the server layer, into client state, and back to external services on user interactions.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          User Browser                                │
│  ┌────────────┐      ┌──────────────┐      ┌─────────────────┐    │
│  │  URL Visit │ ───> │ Next.js SSR  │ ───> │ Hydrated Client │    │
│  │  /campaign │      │   (Server)   │      │   Components    │    │
│  └────────────┘      └──────────────┘      └─────────────────┘    │
│                             │                        │              │
└─────────────────────────────┼────────────────────────┼──────────────┘
                              │                        │
                   ┌──────────▼──────────┐  ┌─────────▼─────────┐
                   │   Redis Cache       │  │  AppSync GraphQL  │
                   │  (Campaign Data)    │  │ (Mutations/User)  │
                   └─────────────────────┘  └───────────────────┘
```

## Request/Response Cycle (Campaign Page Load)

### Phase 1: Middleware Processing
**Location**: `middleware.ts`

1. Next.js receives incoming request for campaign URL (e.g., `/taylor-swift`)
2. Middleware intercepts request before routing
3. Middleware normalizes URL:
   - Reads `X-HOST` header for custom domain support
   - Removes port from URL
   - Sets `REQUEST_URL` header with normalized URL
4. Middleware sets `SURROGATE_KEY` header for CDN cache purging
5. Request continues to App Router

### Phase 2: Server-Side Campaign Lookup
**Location**: `app/[...path]/page.tsx`, `lib/utils/campaign/lookupCampaign.ts`

1. App Router matches catch-all route `[...path]`
2. `page.tsx` server component executes:
   - Extracts campaign slug from URL path
   - Reads `draft` query parameter if present
3. `i18n.ts` request handler determines locale:
   - Fetches campaign from Redis cache (by slug)
   - Calls `getBestViewingLocale(campaign)` to determine target locale
   - Falls back to `DEFAULT_LOCALE` if campaign not found
   - Loads translation messages for locale
4. `lookupCampaign` executes:
   - Calls `cache.getCampaign(slug)` to fetch from Redis
   - Validates campaign is V2 format
   - Checks user access permissions (`userHasAccess`)
   - Transforms campaign to target locale (`transformCampaign`)
   - Validates timezone settings
5. If campaign not found → returns `notFound()` (404 page)
6. If redirect needed → calls `redirect(redirectTo)` (301/302)
7. `lookupLinkedCampaign` fetches linked campaign if configured

### Phase 3: Server-Side Rendering
**Location**: `app/[...path]/page.tsx`

1. Campaign data available, server component renders:
   - `ClientConfigProvider` wraps tree with sanitized config
   - `SWRProvider` configures data fetching behavior
   - `Theme` provider applies campaign-specific styles
   - `ContentWrapper` receives campaign + linkedCampaign as props
2. Server renders HTML with embedded data
3. Next.js serializes server component output
4. Response sent to browser with:
   - Pre-rendered HTML
   - JSON payload with server component data
   - Client-side JavaScript bundles

### Phase 4: Client Hydration
**Location**: `components/ContentWrapper/`, `app/[...path]/View.tsx`

1. Browser receives HTML and JavaScript
2. React hydrates server-rendered HTML:
   - Client components mount with `'use client'` directive
   - `ContentWrapper` executes custom hooks:
     - `useLoadCampaignData({ campaign, linkedCampaign })` → loads campaign into Zustand store
     - `useLoadFanData(campaign)` → fetches user entry data via SWR + GraphQL
     - `useLoadIsMobileApp()` → detects mobile app context
3. If `useLoadFanData` is loading → renders empty fragment (shows server HTML)
4. Once data loaded → renders children (Header, View, Footer, Modals)
5. `View.tsx` determines which page to render:
   - Reads `ui.page` from Zustand store
   - Renders `<Registration />` or `<Confirmation />`

### Phase 5: User Interaction (Registration Flow)
**Location**: `components/SignupForm/`, `components/SignupForm/useProcessForm.ts`

1. User interacts with registration form:
   - Selects markets → `updateForm({ markets: [...] })`
   - Toggles opt-ins → `updateForm({ allow_marketing: true })`
   - All updates stored in Zustand global state
2. User clicks "Sign Up" button:
   - Form validation checks (`isFormValid`)
   - `useProcessForm` hook executes:
     - Sets `isSubmitting: true` in store
     - Prepares entry payload with form data
     - Calls `graphqlFetcher` with `upsertEntry` mutation
3. GraphQL mutation sent to `/graphql` endpoint:
   - Client includes `X-VFSID` session cookie for auth
   - Server proxies to AppSync GraphQL API
   - AppSync validates user session, processes mutation
   - AppSync returns entry record with confirmation
4. On success:
   - `updateUser({ hasEntry: true })`
   - `setPage(UiPage.CONFIRMATION)`
   - `sendPageViewEvent('confirmation')`
   - UI transitions to confirmation page
5. On error:
   - `openModal(ModalType.ERROR, { code: errorCode })`
   - Error modal displays with user-friendly message
   - Form remains editable for retry

## State Management

### Global State (Zustand Store)
**Location**: `lib/store/index.ts`

**State Structure**:
```typescript
{
  campaign: Campaign,           // Campaign configuration and settings
  linkedCampaign: LinkedCampaign | null,  // Optional linked campaign
  user: {
    isLoggedIn: boolean,
    hasEntry: boolean,
    isLNAAMember: boolean,
    email: string | null,
    codeByMarket: Map<string, string>,
    location: ClientGeoPoint | null
  },
  form: {
    markets: string[],
    allow_marketing: boolean,
    allow_livenation: boolean,
    allow_artist_sms: boolean,
    promoterOptIns: string[],
    lnaaOptIn: boolean
  },
  ui: {
    page: 'registration' | 'confirmation',
    modal: Modal | null,
    locale: string,
    isSubmitting: boolean,
    isStoreLoaded: boolean,
    scrollTo: ElementId | null,
    isMobileApp: boolean
  }
}
```

**Update Flow**:
1. Component calls action: `updateForm({ markets: ['NYC'] })`
2. Zustand action executes: `set(state => ({ form: { ...state.form, markets: ['NYC'] } }))`
3. Store notifies subscribers (components using selectors)
4. Only components using affected selectors re-render (via `createSelectors` optimization)

### Local Component State
- Minimal local state (ephemeral UI only)
- Examples: accordion open/closed, form field focus
- Persisted state lives in Zustand

### SWR Cache (Data Fetching)
**Location**: `components/SWRProvider/`, `hooks/useLoadFanData.ts`

**Pattern**:
```typescript
const { data, error, isLoading } = useSWR(
  ['getEntry', campaign.id],
  () => graphqlFetcher([GetEntryQuery, { campaignId: campaign.id }])
);
```

**Benefits**:
- Automatic deduplication of requests
- Background revalidation
- Focus revalidation
- Optimistic updates

## Event Processing (User Actions)

### Form Submission Flow
```
User Clicks Submit
  │
  ├─> useProcessForm hook
  │     ├─> Validate form (`isFormValid`)
  │     ├─> Set `isSubmitting: true`
  │     ├─> Build entry payload
  │     │     ├─> Read from Zustand store: form, campaign
  │     │     ├─> Include Nudetect session data
  │     │     └─> Format markets, opt-ins
  │     │
  │     ├─> graphqlFetcher([UpsertEntryMutation, payload])
  │     │     ├─> POST /graphql
  │     │     ├─> Headers: X-VFSID (session)
  │     │     └─> AppSync processes mutation
  │     │
  │     ├─> On Success:
  │     │     ├─> updateUser({ hasEntry: true })
  │     │     ├─> setPage('confirmation')
  │     │     ├─> sendPageViewEvent('confirmation')
  │     │     └─> scrollTo(ElementId.INFO)
  │     │
  │     └─> On Error:
  │           ├─> Parse error code
  │           ├─> openModal('error', { code })
  │           └─> setIsSubmitting(false)
```

### LNAA Membership Check Flow
```
Component Mount (ContentWrapper)
  │
  ├─> useSetIsLNAAMember hook
  │     ├─> Check if LNAA enabled in campaign
  │     ├─> useSWR fetch: getLNAAMemberStatus
  │     │     └─> graphqlFetcher([GetLNAAMemberStatusQuery])
  │     │
  │     ├─> On data received:
  │     │     └─> updateUser({ isLNAAMember: true/false })
  │     │
  │     └─> On error:
  │           └─> Log warning, default to false
```

### Liveness Check Flow (Identity Verification)
```
User Clicks "Verify Identity"
  │
  ├─> useCheckEntryLiveness hook
  │     ├─> Set `isSubmitting: true`
  │     ├─> Call IDV SDK: startLivenessCheck()
  │     │     ├─> Opens IDV modal
  │     │     ├─> User completes face scan
  │     │     └─> IDV SDK returns session token
  │     │
  │     ├─> graphqlFetcher([VerifyLivenessQuery, { token }])
  │     │     └─> AppSync validates liveness
  │     │
  │     ├─> On Success:
  │     │     ├─> updateUser({ hasEntry: true })
  │     │     ├─> setPage('confirmation')
  │     │     └─> Close modal
  │     │
  │     └─> On Failure:
  │           ├─> openModal('error', { code: 'LIVENESS_CHECK_FAILED' })
  │           └─> Allow retry
```

## External Integrations

| Integration | Direction | Purpose | Location |
|-------------|-----------|---------|----------|
| **Redis** | Read | Campaign data cache | `lib/cache.ts` → Redis cluster |
| **Redis** | Write | Campaign updates (admin tool) | External service → Redis |
| **AppSync GraphQL** | Query | Fetch user entry data | `graphqlFetcher` → `/graphql` → AppSync |
| **AppSync GraphQL** | Mutation | Upsert entry, verify liveness | Client → `/graphql` → AppSync |
| **Nudata** | Bidirectional | Fraud detection session | `components/Nudata/` → Nudata API |
| **Google Tag Manager** | Outbound | Analytics events | `lib/utils/gtm.ts` → GTM |
| **Identity SDK** | Bidirectional | Liveness verification | `@verifiedfan/idv-sdk` → IDV service |
| **Queue-it** | Inbound | Waiting room integration | `components/Queueit/` → Queue-it script |
| **Transifex** | Build-time | Translation sync | `npm run tx` → Transifex API |

## Data Flow Diagram (Full Request Lifecycle)

```
┌─────────────┐
│   Browser   │
│ /campaign   │
└──────┬──────┘
       │ 1. HTTP GET
       ▼
┌─────────────────────────────────────────────────────┐
│                  Next.js Server                      │
│                                                      │
│  ┌───────────────┐     ┌──────────────────┐        │
│  │  middleware   │────>│  i18n.ts         │        │
│  │  (normalize)  │     │  (locale lookup) │        │
│  └───────────────┘     └─────────┬────────┘        │
│                                   │                 │
│                                   ▼                 │
│                        ┌─────────────────────┐     │
│                        │ app/[...path]/page  │     │
│                        │  (Server Component) │     │
│                        └──────────┬──────────┘     │
│                                   │                 │
│                        ┌──────────▼──────────┐     │
│                        │  lookupCampaign     │     │
│                        │  (from Redis)       │────────> Redis Cache
│                        └──────────┬──────────┘     │       (Read)
│                                   │                 │
│                                   ▼                 │
│                        ┌─────────────────────┐     │
│                        │  Render Server      │     │
│                        │  Components         │     │
│                        │  (SSR HTML)         │     │
│                        └──────────┬──────────┘     │
└───────────────────────────────────┼────────────────┘
                                    │ 2. HTML + JSON
                                    ▼
                          ┌────────────────┐
                          │   Browser      │
                          │   (Hydration)  │
                          └────────┬───────┘
                                   │ 3. Mount Client Components
                                   ▼
                     ┌──────────────────────────┐
                     │  ContentWrapper          │
                     │  - useLoadCampaignData   │
                     │  - useLoadFanData        │────────> AppSync GraphQL
                     └──────────┬───────────────┘          (Query: getEntry)
                                │
                                ▼
                     ┌─────────────────────┐
                     │  View.tsx           │
                     │  (Route to page)    │
                     └──────────┬──────────┘
                                │
                     ┌──────────▼───────────┐
                     │  Registration Page   │
                     │  - SignupForm        │
                     │  - Markets           │
                     │  - OptIns            │
                     └──────────┬───────────┘
                                │ 4. User Submits Form
                                ▼
                     ┌─────────────────────┐
                     │  useProcessForm     │────────> AppSync GraphQL
                     │  (Submit Entry)     │          (Mutation: upsertEntry)
                     └──────────┬──────────┘
                                │ 5. Success Response
                                ▼
                     ┌─────────────────────┐
                     │  Zustand Store      │
                     │  - hasEntry: true   │
                     │  - page: confirm    │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │  Confirmation Page  │
                     │  - Show codes       │
                     │  - Display success  │
                     └─────────────────────┘
```

## Performance Optimizations

### Server-Side
- **Redis Caching**: Campaigns cached with 8-hour TTL, reduces database load
- **Read Replicas**: Redis read-replica support for read-heavy operations
- **Server Components**: Data fetching happens on server, reduces client bundle size
- **Static Asset CDN**: `public/` assets served via CDN with cache headers

### Client-Side
- **SWR Deduplication**: Multiple components requesting same data trigger single request
- **Zustand Selectors**: Fine-grained subscriptions prevent unnecessary re-renders
- **Code Splitting**: Next.js automatically splits routes and dynamic imports
- **Image Optimization**: Campaign images served via Next.js Image component

### Build-Time
- **GraphQL Codegen**: Types generated at build time, not runtime
- **YAML Config**: Parsed once at build, not on every request
- **Translation Bundling**: Only active locale loaded per request

## Error Handling Flow

```
Error Occurs (Network, Validation, Business Logic)
  │
  ├─> graphqlFetcher catches exception
  │     ├─> Parse GraphQL error response
  │     ├─> Extract error code (if present)
  │     └─> Throw structured error
  │
  ├─> useProcessForm catches error
  │     ├─> Determine error type:
  │     │     ├─> DUPLICATE_PHONE
  │     │     ├─> CAMPAIGN_CLOSED
  │     │     ├─> LIVENESS_CHECK_FAILED
  │     │     └─> UNEXPECTED_ERROR
  │     │
  │     ├─> openModal(ModalType.ERROR, { code })
  │     ├─> setIsSubmitting(false)
  │     └─> Log error to backend (useClientLogger)
  │
  └─> ErrorModal renders
        ├─> Display user-friendly message (i18n)
        ├─> Provide retry button (if applicable)
        └─> Log to analytics (GTM event)
```
