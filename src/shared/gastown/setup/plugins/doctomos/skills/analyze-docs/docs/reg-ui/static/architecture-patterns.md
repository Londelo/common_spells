# Architecture Patterns - reg-ui

## Architecture Style

**Identified Style**: **Hybrid: Next.js App Router + Component-Based Frontend + Functional Programming**

**Evidence**:
- Next.js 14 App Router structure with `app/` directory and React Server Components
- Server-side rendering with client-side hydration pattern
- Catch-all dynamic routing (`[...path]`) for multi-tenant campaign pages
- Component-based UI architecture with strict functional programming constraints
- Clear separation between server components (data fetching) and client components (interactivity)
- Not strictly layered (MVC/Clean/Hexagonal), but organized by feature/domain

**Why this style**:
- Multi-tenant SaaS application serving many campaigns from a single deployment
- SEO-optimized with server-side rendering for campaign landing pages
- Strict functional programming enforces immutability and testability
- Next.js App Router provides file-based routing and optimal performance

## Design Patterns Used

### 1. Server-Side Rendering (SSR) with React Server Components

**Location**: `app/[...path]/page.tsx`

**Implementation**:
- Server components fetch campaign data from Redis cache on the server
- Campaign lookup, locale resolution, and transformation happen server-side
- Client receives pre-rendered HTML with data embedded
- Client components marked with `'use client'` directive for interactivity

**Example**:
```typescript
// app/[...path]/page.tsx (Server Component)
export default async function Page(pageParams: PageParams) {
  const campaign = await lookupCampaign({ slug, draft, targetLocale });
  const linkedCampaign = await lookupLinkedCampaign({ campaign, draft, targetLocale });

  return (
    <ClientConfigProvider config={parseClientConfig(config)}>
      <Theme baseStyle={campaign.style}>
        <View /> {/* Client component */}
      </Theme>
    </ClientConfigProvider>
  );
}
```

### 2. Repository Pattern (Redis Cache)

**Location**: `lib/cache.ts`

**Implementation**:
- Abstraction layer over Redis with `getCampaign`, `setCampaign`, `getPromoters`
- Encapsulates cache key generation and TTL management
- Supports primary + read-replica Redis instances
- Graceful error handling returns `null` on failures

**Example**:
```typescript
// lib/cache.ts
const Cache = (): RegCache => ({
  getCampaign: async (slug: string): Promise<Campaign | null> => {
    const key = generateCacheKey(slug);
    const result = await cache.get({ key, usePrimary: false });
    return result || null;
  }
});
```

### 3. Global State Management with Zustand

**Location**: `lib/store/index.ts`

**Implementation**:
- Centralized state store for campaign, user, form, and UI state
- Functional selectors pattern via `createSelectors` for optimized re-renders
- Actions encapsulate state mutations
- Immutable updates using spread operators

**Example**:
```typescript
// lib/store/index.ts
const useStoreBase = create<Store & Actions>()(set => ({
  form: initialFormState,
  user: initialUserState,
  updateForm: (value: Partial<Form>) => set(state => ({ form: { ...state.form, ...value } }))
}));
```

### 4. Provider Pattern (React Context)

**Location**: `context/ClientConfigProvider.tsx`, `components/SWRProvider/`, `components/Theme/`

**Implementation**:
- Layered providers wrap the application tree
- Each provider encapsulates specific concerns (config, data fetching, theming)
- Nested composition in `page.tsx` creates dependency hierarchy

**Example**:
```typescript
// app/[...path]/page.tsx
<ClientConfigProvider config={parseClientConfig(config)}>
  <SWRProvider>
    <Theme baseStyle={campaign.style}>
      {children}
    </Theme>
  </SWRProvider>
</ClientConfigProvider>
```

### 5. Custom Hook Pattern

**Location**: `hooks/` directory (15+ custom hooks)

**Implementation**:
- Encapsulates reusable stateful logic
- Follows `use*` naming convention
- Pure functions with no side effects (adhering to functional programming rules)
- Examples: `useLoadCampaignData`, `useSignupFormState`, `useProcessForm`

**Example**:
```typescript
// hooks/useSignupFormState.ts
export const useSignupFormState = () => {
  const form = useStore.use.form();
  const campaign = useStore.use.campaign();
  const hasEntry = useStore.use.user().hasEntry;

  return { form, preferences: campaign.settings.preferences, hasEntry };
};
```

### 6. Facade Pattern (GraphQL Client)

**Location**: `graphql/client.ts`

**Implementation**:
- Wraps `graphql-request` library with session management
- Automatically injects `X-VFSID` header for authentication
- Provides simple interface: `graphqlFetcher([query, variables, headers])`

**Example**:
```typescript
// graphql/client.ts
const graphQLClient = new GraphQLClient('/graphql', {
  headers: () => ({ 'X-VFSID': getSessionId() })
});
```

### 7. Strategy Pattern (Campaign Transformation)

**Location**: `lib/utils/campaign/transform/`

**Implementation**:
- Multiple transformation strategies for adapting campaign data to target locale
- `transformCampaign` orchestrates locale-specific transformations
- Each transformation is a pure function

### 8. Dependency Injection (Configuration)

**Location**: `lib/config/server.ts`, `lib/config/client.ts`

**Implementation**:
- Environment-specific configuration loaded from YAML files
- `BUILD_ENV` determines which config file to use at build time
- Server config includes sensitive data (Redis URLs, API keys)
- Client config is sanitized subset exposed to browser

### 9. Mock Object Pattern (Local Development)

**Location**: `app/api/graphql/route.ts`, `lib/mocks/`

**Implementation**:
- Mock Apollo Server with in-memory data store for local development
- Only enabled in non-Fastly environments (controlled by `isNonFastlyEnv()`)
- Supports full GraphQL schema with resolvers for testing

### 10. Middleware Pattern

**Location**: `middleware.ts`

**Implementation**:
- Runs on every request before routing
- Normalizes request URLs, sets CDN cache headers
- Follows Next.js middleware conventions

## Layer Separation

**Not strictly layered**, but concerns are separated functionally:

### Presentation Layer (React Components)
- **Location**: `components/`, `app/[...path]/View.tsx`
- **Responsibility**: UI rendering, user interactions, styling
- **Dependencies**: Hooks, store, utilities
- **Pattern**: Client components (`'use client'`) consume hooks and global state

### Data Layer (Server Components + Cache)
- **Location**: `app/[...path]/page.tsx`, `lib/cache.ts`
- **Responsibility**: Data fetching, campaign lookup, server-side rendering
- **Dependencies**: Redis cache, GraphQL (for mutations)
- **Pattern**: Server components fetch data, pass to client via props

### Business Logic Layer (Utilities + Hooks)
- **Location**: `lib/utils/`, `hooks/`
- **Responsibility**: Campaign transformation, form processing, validation
- **Dependencies**: Pure functions, no external dependencies
- **Pattern**: Pure utility functions, custom hooks encapsulate logic

### State Management Layer (Zustand)
- **Location**: `lib/store/`
- **Responsibility**: Global state, actions, selectors
- **Dependencies**: None (self-contained)
- **Pattern**: Centralized store with functional selectors

### Integration Layer (GraphQL + Redis)
- **Location**: `graphql/`, `lib/cache.ts`
- **Responsibility**: External service communication
- **Dependencies**: AppSync (GraphQL), Redis
- **Pattern**: Abstraction over external services

## Dependency Direction

**General Flow**: Presentation → Business Logic → Data/Integration

- **Components** depend on **Hooks** and **Store**
- **Hooks** depend on **Store** and **Utilities**
- **Server Components** depend on **Cache** and **Config**
- **Utilities** have no dependencies (pure functions)
- **Store** is self-contained (no external dependencies)

**Key Principle**: Utilities and core logic never depend on React or Next.js specifics, maintaining testability.

## Functional Programming Constraints

**Enforced via ESLint** (`eslint-plugin-fp`):

### Prohibited Patterns
- **Classes** - Only functional components and pure functions
- **Loops** - Use `.map()`, `.filter()`, `.reduce()` instead
- **`let` declarations** - Use `const` exclusively
- **Mutation** - No direct property assignment (use spread operators)
- **`switch` statements** - Use object lookups or if/else
- **`++`/`--` operators** - Use `+= 1` or `-= 1`

### Example Enforcement
```typescript
// ❌ PROHIBITED
let count = 0;
for (const item of items) {
  count++;
}

// ✅ ALLOWED
const count = items.length;
const processedItems = items.map(item => transform(item));
```

### Impact on Architecture
- All state updates use immutable patterns
- Higher-order functions preferred over imperative code
- Ramda library used for functional utilities (exempted from mutation rules)
- Maximum cyclomatic complexity of 6 enforced
- Maximum nesting depth of 2 enforced

## Configuration Management

**Pattern**: Environment-based YAML configuration

- **Build-time**: `BUILD_ENV` environment variable determines config file
- **Server**: `lib/config/server.ts` loads full config with secrets
- **Client**: `lib/config/client.ts` provides sanitized subset
- **Provider**: `ClientConfigProvider` makes client config available to components

**Why YAML**:
- Human-readable format for non-developers
- Deep merge support for inheritance (default.config.yml → env-specific)
- Type-safe via Zod schema validation

## GraphQL Integration Pattern

**Dual-Mode**: Production + Local Mock

- **Production**: Routes to AppSync GraphQL API via `/graphql` endpoint
- **Local**: Mock Apollo Server at `/api/graphql` with in-memory data
- **Switch**: Controlled by `SHOULD_MOCK` environment variable
- **Code Generation**: `graphql-codegen` generates TypeScript types from schema

## Deviations & Tech Debt

### 1. Mixed JavaScript/TypeScript
**Location**: `components/Info/` (`.jsx` files)

**Issue**: Some legacy components still in JavaScript

**Impact**: Reduced type safety in Info components

**Reason**: Incremental migration from older codebase

### 2. Global State Overuse
**Location**: `lib/store/index.ts`

**Issue**: Store contains both global state (campaign, user) and local UI state (modal, scrollTo)

**Impact**: Some state could be component-local, leading to unnecessary re-renders

**Reason**: Convenience of centralized state management

### 3. Server Component Limitations
**Location**: `app/[...path]/page.tsx`

**Issue**: Cannot use hooks or interactive logic in server components

**Workaround**: Split into server component (page.tsx) + client component (View.tsx)

**Impact**: Additional component wrapper needed

**Reason**: Next.js App Router constraint

### 4. Styled-Components SSR Configuration
**Location**: `app/layout.tsx`, `next.config.js`

**Issue**: Requires custom webpack configuration and registry for SSR

**Impact**: Additional build complexity

**Reason**: styled-components not fully optimized for App Router

### 5. Mock Server Mutation Patterns
**Location**: `app/api/graphql/route.ts`

**Issue**: ESLint rules disabled for mutation (`/* eslint-disable fp/no-mutation */`)

**Impact**: Violates functional programming principles in mock server

**Reason**: Apollo Server and in-memory mock data require mutation

### 6. Campaign Lookup Caching
**Location**: `lib/utils/campaign/lookupCampaign.ts`

**Issue**: Campaign data fetched on every request (no in-memory cache)

**Impact**: Redis network call on every page load

**Potential**: Consider in-process cache with short TTL for frequently accessed campaigns

### 7. Type Generation Dependency
**Location**: `graphql/types.ts`, `lib/types/appsync.ts`

**Issue**: Generated types must be committed to Git

**Impact**: Merge conflicts when schema changes

**Reason**: Build process requires types to exist before TypeScript compilation
