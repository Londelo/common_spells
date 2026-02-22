# Data Flow - admin-ui-next

## Primary Flow

This Next.js application follows a **Server-First → Client Hydration → GraphQL Data Fetching** pattern:

```
1. Server Request
   → Next.js Server receives request
   → Middleware checks route (redirects / → /campaigns)
   → Server renders page with providers

2. Client Hydration
   → React hydrates on client
   → Context providers initialize:
      - ClientConfigProvider (config)
      - ApolloWrapper (GraphQL client)
      - ThemeProvider (styled-components)
      - LazyAuthProvider (wraps AuthProvider)

3. Authentication Check
   → AuthProvider queries INIT_APP (GraphQL)
   → Checks isLoggedIn + isAdmin flags
   → If not logged in → redirects to login
   → If not admin → logs out
   → If authenticated → renders children

4. Page Component Mounts
   → Page component (e.g., Campaigns)
   → Custom hook fetches data (e.g., useCampaignsList)
   → Apollo Client suspends rendering
   → WithSuspense shows loading state

5. GraphQL Data Fetch
   → Apollo Client makes GraphQL query
   → Query includes credentials (cookies)
   → Response cached in Apollo InMemoryCache
   → Component renders with data

6. User Interaction
   → User clicks button/link
   → Event handler triggers:
      - Navigation (Next.js router)
      - GraphQL mutation (Apollo)
      - Local state update (Zustand)
   → UI updates reactively
```

## Request/Response Cycle

### Page Load Flow

```
User navigates to /campaigns
  ↓
Next.js middleware (middleware.ts)
  → If path = "/" → redirect to "/campaigns"
  ↓
Server renders app/layout.tsx
  → Initializes provider tree
  → Returns HTML + hydration data
  ↓
Browser receives HTML
  → React hydrates component tree
  ↓
ClientConfigProvider
  → Provides config to child components
  ↓
ApolloWrapper
  → Creates Apollo Client instance
  → Connects to GRAPHQL_URL with credentials
  ↓
ThemeProvider
  → Injects styled-components theme
  ↓
LazyAuthProvider (client-only)
  → Wraps AuthProvider
  ↓
AuthProvider
  → Runs INIT_APP query via useSuspenseQuery
  → Validates user is logged in + is admin
  → If auth fails → redirects to login/logout
  ↓
PreloadQueries
  → Preloads common GraphQL queries
  ↓
Page Component (e.g., app/campaigns/page.tsx)
  → Renders RootCanvasContainer
  → Mounts Campaigns component
  ↓
Campaigns component
  → Wrapped with WithSuspense HOC
  → Calls useCampaignsList hook
  ↓
useCampaignsList hook
  → Calls useSuspenseQuery(CAMPAIGNS_LIST)
  → Suspends rendering until data loads
  ↓
Apollo Client
  → Fetches from GraphQL API
  → Caches response in InMemoryCache
  ↓
Component re-renders with data
  → Maps data to table rows
  → Renders CampaignsTable
```

### User Action Flow (e.g., Create Promoter)

```
User clicks "Create Promoter"
  ↓
Next.js router navigates to /promoters/create
  ↓
app/promoters/create/page.tsx renders
  ↓
PromoterForm component mounts
  → react-hook-form initializes form state
  → zod schema defines validation rules
  ↓
User fills form fields
  → Controlled inputs via react-hook-form
  → Real-time validation via zod
  ↓
User submits form
  ↓
Form onSubmit handler
  → Validates form data
  → Calls GraphQL mutation hook
  ↓
Apollo Client
  → Sends CREATE_PROMOTER mutation
  → Includes form data as variables
  → Includes credentials (cookies)
  ↓
GraphQL API processes mutation
  ↓
Apollo Client receives response
  → Updates InMemoryCache
  → Triggers related query refetch (if configured)
  ↓
UI updates
  → Success banner shows
  → Redirects to promoters list
  ↓
Promoters list page
  → usePromotersList refetches
  → New promoter appears in table
```

### Pagination Flow

```
User clicks "Next Page"
  ↓
incrementPage() called (from usePageParam)
  ↓
URL parameter updated (?page=2)
  ↓
Component re-renders
  → currentPage = 2
  ↓
useCampaignsList(currentPage)
  → Recalculates skip: (2-1) * 10 = 10
  → Apollo useSuspenseQuery with new variables
  ↓
Apollo Client
  → Checks cache for query with variables {skip: 10, limit: 10}
  → If not cached → fetches from API
  → If cached → returns cached data
  ↓
Table re-renders with page 2 data
```

## State Management

### Server State (GraphQL via Apollo)
- **Location**: Apollo InMemoryCache
- **Managed by**: Apollo Client
- **Scope**: Application-wide
- **Examples**:
  - Campaigns list
  - Campaign details
  - Promoters list
  - Events list
  - User authentication state
- **Strategy**: Cache-first with automatic refetching

### Client State (Zustand)
- **Location**: `lib/store/`
- **Scope**: Application-wide
- **Examples**:
  - Recent campaigns (for quick access)
- **Strategy**: Minimal client state, most data in GraphQL cache

### Form State (React Hook Form)
- **Location**: Form components
- **Scope**: Component-local
- **Examples**:
  - EventForm
  - PromoterForm
- **Strategy**: Uncontrolled forms with validation via zod schemas

### UI State (React useState/hooks)
- **Location**: Component-local hooks
- **Scope**: Component-local
- **Examples**:
  - Table expand/collapse state (useTableControls)
  - Boolean toggles (useBoolean)
  - Fuzzy search state (useFuzzySearch)
- **Strategy**: Local component state for UI interactions

### URL State (Next.js router)
- **Location**: URL query parameters
- **Scope**: Page-level
- **Examples**:
  - Current page number (`?page=2`)
  - Campaign ID (dynamic route `/campaigns/[campaignId]`)
- **Strategy**: URL as source of truth for navigation state

## Event Processing

### Client-Side Events

**User Interactions**:
- Click events → Button handlers → Navigation or mutations
- Form submissions → react-hook-form handlers → Validation → GraphQL mutations
- Input changes → Controlled inputs → Form state updates

**Navigation Events**:
- Next.js router handles navigation
- Middleware intercepts and may redirect
- Page transitions trigger data fetching

**GraphQL Events**:
- Query result → Apollo cache update → Component re-render
- Mutation result → Cache invalidation → Related queries refetch
- Error → Error policy handles (errorPolicy: 'all')

### Server-Side Events

**API Route Events**:
- `/metrics` endpoint → Prometheus metrics collection
- `/heartbeat` endpoint → Health check response

**Middleware Events**:
- Request interception → Path matching → Redirect if needed

## External Integrations

| Integration | Direction | Purpose | Protocol |
|-------------|-----------|---------|----------|
| GraphQL API | Read/Write | Primary data source for campaigns, events, promoters | GraphQL over HTTP (POST) |
| Authentication Service | Read | User authentication via login/logout flows | HTTP redirects + cookies |
| Design System (@tm1/design-system) | Client Import | UI components and styling | NPM package import |
| Ticketmaster Global DS | Client Import | Additional UI components | NPM package import |
| Prometheus | Write | Metrics export for monitoring | HTTP GET /metrics |

### GraphQL API Communication

**Connection Details**:
- URL configured via `config.GRAPHQL_URL`
- Credentials sent via cookies (`credentials: 'include'`)
- Apollo HttpLink handles HTTP transport

**Query Types**:
- **Queries**: Fetch data (campaigns, promoters, events)
  - Example: `CAMPAIGNS_LIST`, `INIT_APP`, `GET_CAMPAIGN`
- **Mutations**: Modify data (create/update/delete)
  - Example: `CREATE_PROMOTER`, `UPDATE_EVENT`
- **Fragments**: Reusable query parts
  - Example: Campaign fragments, Event fragments

**Caching Strategy**:
- InMemoryCache stores query results
- Normalized cache with `__typename` and `id` fields
- `cleanTypename` utility removes `__typename` before sending mutations
- Queries can use `fetchPolicy: 'no-cache'` (e.g., INIT_APP for auth)

**Error Handling**:
- `errorPolicy: 'all'` - returns data + errors
- Components check error state and handle appropriately
- Authentication errors trigger logout

### Authentication Flow

```
User not authenticated
  ↓
AuthProvider detects isLoggedIn = false
  ↓
useLogin().login() called
  ↓
Redirects to external auth service
  ↓
User authenticates
  ↓
Auth service redirects back with session cookie
  ↓
App reloads, AuthProvider queries INIT_APP
  ↓
INIT_APP returns viewer with isLoggedIn + isAdmin
  ↓
If isAdmin = false → logout and deny access
  ↓
If isAdmin = true → render application
```

### Build-Time Configuration

**Environment-Based Builds**:
- `BUILD_ENV` determines which config to load
- Configs in `configs/` directory (YAML files)
- Build scripts generate appropriate bundles:
  - `npm run build-dev` → DEV config
  - `npm run build-qa` → QA config
  - `npm run build-preprod` → PREPROD config
  - `npm run build-prod` → PROD config

**Configuration Flow**:
```
Build time:
  configs/{env}.yml
    ↓
  lib/config/server.ts (server-side)
    ↓
  parseClientConfig() (strips server-only values)
    ↓
  ClientConfigProvider (injects into React tree)
    ↓
  useClientConfig() hook (components access config)
```

## Performance Considerations

**Server-Side Rendering**:
- Next.js pre-renders pages on server
- HTML sent to client for fast initial paint
- React hydrates for interactivity

**Code Splitting**:
- Next.js automatically splits by route
- Dynamic imports for lazy-loaded components
- LazyAuthProvider defers auth check to client

**GraphQL Optimization**:
- useSuspenseQuery enables concurrent rendering
- Apollo cache prevents duplicate requests
- Fragments reduce query duplication

**Caching Strategies**:
- Apollo InMemoryCache for GraphQL data
- Next.js caches static assets
- Service worker not currently implemented

**Bundle Optimization**:
- Tree shaking via webpack/turbopack
- Design system aliases reduce duplication
- Standalone output mode for Docker
