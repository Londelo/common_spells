# Architecture Patterns - admin-ui-next

## Architecture Style

**Identified Style**: **Next.js App Router with Feature-Driven Architecture** (hybrid of Monolith + Event-Driven)

**Evidence**:
- Uses Next.js 15 App Router pattern with file-based routing in `app/` directory
- Features are organized by domain (`Campaigns`, `Promoters`, `EventForm`) rather than technical layers
- Single deployable application (monolith) with all features bundled together
- Server-side rendering (SSR) with React Server Components
- GraphQL client architecture for data fetching with Apollo Client
- State management via Zustand for client-side state
- Route handlers for API endpoints (`/metrics`, `/heartbeat`)

**Additional patterns**:
- **Client-Server Component Split**: Next.js RSC pattern with 'use client' directives for interactive components
- **Provider Pattern**: Multiple context providers wrapped in root layout (Auth, Config, Theme, GraphQL)
- **Custom Hooks Pattern**: Data fetching and UI logic abstracted into reusable hooks

## Design Patterns Used

### 1. Context Provider Pattern
- **Location**: `lib/context/`
- **Implementation**: Multiple React Context providers for cross-cutting concerns
- **Examples**:
  - `AuthProvider.tsx` - Authentication state and user verification
  - `ClientConfigProvider.tsx` - Client-side configuration injection
  - `ApolloWrapper.tsx` - GraphQL client provider
  - `ThemeProvider.tsx` - Styled-components theme
- **Provider Composition**: All providers composed in `app/layout.tsx` in a specific order:
  ```
  ClientConfig → Apollo → Theme → LazyAuth → PreloadQueries → Page Content
  ```

### 2. Custom Hooks Pattern
- **Location**: `lib/hooks/`
- **Implementation**: Encapsulates data fetching, UI state, and business logic
- **Examples**:
  - `useCampaignsList.ts` - Fetches campaigns list with pagination via GraphQL
  - `useTableControls` - Manages table UI state (expand/collapse, empty state)
  - `usePageParam` - URL parameter management for pagination
  - `useLogin` - Authentication flow management
  - `useBoolean`, `useBooleanSet` - UI state helpers
  - `useFuzzySearch` - Client-side fuzzy search functionality

### 3. Compound Component Pattern
- **Location**: `components/common/`, `components/layout/`
- **Implementation**: Components that work together as a cohesive unit
- **Examples**:
  - `CanvasCard` - Card wrapper with title and content
  - `ObjectHeader` with `StatusBadge` - Header components that compose together
  - `SimpleTable` - Table component with column/data props
  - `useTableControls` returns `Controls` and `EmptyState` components

### 4. Higher-Order Component (HOC) Pattern
- **Location**: `components/common/WithSuspense.tsx`
- **Implementation**: Wraps components with React Suspense boundaries
- **Example**:
  ```tsx
  export default WithSuspense(Campaigns, 'Loading Campaigns');
  ```
- **Purpose**: Provides loading states for async data fetching components

### 5. Render Props Pattern
- **Location**: Form components in `components/EventForm/`, `components/Promoters/`
- **Implementation**: React Hook Form integration with controlled components
- **Purpose**: Form state management and validation with `react-hook-form` + `zod`

### 6. Repository Pattern (GraphQL)
- **Location**: `lib/graphql/`
- **Implementation**: GraphQL operations separated by type
- **Structure**:
  - `queries/` - Data fetching operations
  - `mutations/` - Data modification operations
  - `fragments/` - Reusable GraphQL fragments
  - `apollo/` - Apollo Client configuration
- **Example**: `useCampaignsList` hook wraps the `CAMPAIGNS_LIST` query

### 7. State Management Pattern (Zustand)
- **Location**: `lib/store/`
- **Implementation**: Zustand store with slices pattern
- **Example**:
  - `slices/recentCampaigns` - Slice for recent campaigns state
  - `createSelector.ts` - Memoized selector creator
  - Store composed from slices in `index.ts`
- **Usage**: Minimal client state (most data fetched via GraphQL)

### 8. Middleware Pattern
- **Location**: `middleware.ts`
- **Implementation**: Next.js middleware for request interception
- **Purpose**: Route redirects (e.g., `/` → `/campaigns`)

### 9. Lazy Loading Pattern
- **Location**: `lib/context/LazyAuthProvider.tsx`
- **Implementation**: Defers authentication check until client-side
- **Purpose**: Prevents server-side auth issues with cookies

### 10. Dependency Injection Pattern
- **Location**: `lib/config/`
- **Implementation**: Configuration injected via context provider
- **Flow**: Server config → Client config parser → ClientConfigProvider → Components
- **Example**: `parseClientConfig(config)` in root layout

## Layer Separation

**Presentation Layer** (app/ + components/):
- Next.js pages and API routes in `app/`
- React components in `components/`
- Styled components for UI styling
- Server Components (RSC) by default, 'use client' for interactive components

**Business Logic Layer** (lib/):
- Custom hooks for data fetching and UI logic
- GraphQL operations (queries, mutations)
- State management (Zustand store)
- Utility functions and helpers

**Data Layer**:
- Apollo Client for GraphQL communication
- GraphQL API (external service)
- Client-side cache via Apollo InMemoryCache

**Configuration Layer**:
- Server-side config in `lib/config/server.ts`
- Client-side config in `lib/config/client.ts`
- Build-time environment variables (BUILD_ENV)

## Dependency Direction

**Clean dependency flow**:
- `app/` pages import from `components/` and `lib/`
- `components/` import from `lib/` and other `components/`
- `lib/` is self-contained (no imports from `app/` or `components/`)
- GraphQL hooks (`lib/hooks/graphql/`) depend on GraphQL operations (`lib/graphql/queries/`)
- Context providers wrap the entire app tree in root layout

**Dependency graph**:
```
app/campaigns/page.tsx
  → components/Campaigns/index.tsx
    → lib/hooks/graphql/useCampaignsList.ts
      → lib/graphql/queries/campaignsList.ts
        → Apollo Client
```

**No circular dependencies detected**: Clean unidirectional flow from pages → components → lib

## Deviations & Tech Debt

### 1. Mixed Server/Client Components
- **Issue**: Some components that could be Server Components use 'use client' unnecessarily
- **Location**: Several page-level components
- **Impact**: Larger client bundle, missed SSR optimization opportunities

### 2. Inline Styled Components
- **Issue**: Some styled components defined in component files rather than separate `styled.tsx` files
- **Location**: Various components (e.g., `components/Campaigns/index.tsx` has inline `Container` styled component)
- **Impact**: Inconsistency in code organization

### 3. Minimal Type Safety in GraphQL
- **Issue**: GraphQL responses use generated types but not fully type-safe
- **Location**: GraphQL query results often typed with `any` or loosely typed
- **Recommendation**: Consider GraphQL Code Generator for full type safety

### 4. Limited Error Boundaries
- **Issue**: Error handling relies on Suspense boundaries but lacks granular error boundaries
- **Location**: App-wide error handling not evident
- **Recommendation**: Add React Error Boundaries for better error isolation

### 5. Props Drilling in Some Components
- **Issue**: Some components pass props through multiple levels
- **Location**: Form components with many fields
- **Recommendation**: Consider compound components or form context for complex forms

### 6. Global CSS and Styled Components Mix
- **Issue**: Uses both styled-components and external design system CSS
- **Location**: `lib/theme/GlobalStyles.tsx` + TM1 design system
- **Impact**: Potential style conflicts, larger bundle size

### 7. Hardcoded Values
- **Issue**: Some magic numbers and strings not in constants
- **Location**: Pagination limit (10) in `useCampaignsList.ts`
- **Recommendation**: Extract to configuration constants
