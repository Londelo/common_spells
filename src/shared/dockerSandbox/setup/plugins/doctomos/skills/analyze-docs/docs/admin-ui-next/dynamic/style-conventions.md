# Coding Conventions - admin-ui-next

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `currentPage`, `isSelected` |
| Functions | camelCase | `useGetPromoters`, `handleSearch` |
| React Components | PascalCase | `Campaign`, `SimpleTable` |
| React Hooks | camelCase with `use` prefix | `useBoolean`, `useFuzzySearch` |
| Types/Interfaces | PascalCase | `UseBooleanReturn`, `TableProps` |
| Files (Components) | PascalCase | `Campaign.tsx`, `SimpleTable.tsx` |
| Files (Utilities) | camelCase | `validators.ts`, `createSelector.ts` |
| Files (Styled) | kebab-case or camelCase | `styled.ts`, `styled.tsx` |
| Constants | camelCase | `redirectMap` (local) |
| GraphQL Queries | SCREAMING_SNAKE | `GET_PROMOTERS`, `UPSERT_MARKET` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single |
| Semicolons | Required |
| Trailing commas | None |
| Line length | 120 characters |
| Arrow function parens | Avoid when single param |
| Tab width | 2 |

## TypeScript Configuration

| Setting | Value |
|---------|-------|
| Strict mode | Enabled |
| Target | ES2017 |
| Module resolution | bundler |
| JSX | preserve |
| No emit | true |
| Skip lib check | true |
| Isolated modules | true |

## ESLint Rules (Key)

### Functional Programming (FP Plugin)

| Rule | Setting | Purpose |
|------|---------|---------|
| fp/no-arguments | error | No `arguments` object |
| fp/no-class | error | No ES6 classes |
| fp/no-delete | error | No delete operator |
| fp/no-get-set | error | No getters/setters |
| fp/no-loops | error | No for/while loops |
| fp/no-let | error | No `let`, use `const` |
| fp/no-mutating-assign | error | No Object.assign mutations |
| fp/no-mutating-methods | error | No array mutation methods (except R, router) |
| fp/no-mutation | error | No object property mutations (except `this`, ctx, context) |

### Code Quality

| Rule | Setting | Purpose |
|------|---------|---------|
| complexity | error (max: 6) | Cyclomatic complexity limit |
| max-lines | error (200) | Maximum file length |
| max-depth | error (2) | Maximum nesting depth |
| no-console | error | No console.log |
| no-nested-ternary | error | No nested ternaries |
| prefer-const | error | Use const over let |
| prefer-arrow-callback | error | Arrow functions preferred |
| id-length | error (min: 2, except _, t) | Variable name length |

### Code Style

| Rule | Setting |
|------|---------|
| curly | error |
| eqeqeq | error |
| dot-notation | error |
| object-shorthand | error |
| prefer-template | error |
| prefer-spread | error |
| no-else-return | error |
| no-unneeded-ternary | error |
| consistent-return | error |

### Import/Export

| Rule | Setting |
|------|---------|
| import/no-anonymous-default-export | error |
| no-duplicate-imports | error |

## Import Organization

Imports are organized in the following groups (with blank lines between groups):

1. **External libraries** (React, Next.js, third-party)
2. **Internal modules** (lib/, components/, configs/)
3. **Type imports** (when separate from value imports)
4. **Relative imports** (./styled, ./types)

Example:
```typescript
// External
import { useSuspenseQuery } from '@apollo/client';
import { useState, useCallback } from 'react';

// Internal
import { cleanTypename } from 'lib/graphql/apollo/ApolloWrapper';
import { Promoter } from 'lib/graphql/fragments/promoterFields';

// Relative
import { Container } from './styled';
```

## File Structure

### React Components

1. Imports
2. Type definitions (Props, etc.)
3. Helper functions/constants (if small)
4. Main component function
5. Styled components (if inline) or export statement
6. HOC wrappers (e.g., `WithSuspense`)

Example:
```typescript
'use client';

import { FC } from 'react';
import styled from 'styled-components';

type Props = {
  title: string;
};

const Component: FC<Props> = ({ title }) => {
  return <Container>{title}</Container>;
};

const Container = styled.div`
  padding: 16px;
`;

export default Component;
```

### Custom Hooks

1. Imports
2. Type definitions
3. Hook function
4. Export (default or named)

Example:
```typescript
import { useState, useCallback } from 'react';

type UseBooleanReturn = [value: boolean, setTrue: () => void, setFalse: () => void];

export function useBoolean(defaultValue = false): UseBooleanReturn {
  const [value, setValue] = useState(defaultValue);

  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return [value, setTrue, setFalse];
}
```

## Comment Style

### JSDoc Comments

**Used sparingly** - only for complex functions or public APIs. Type definitions in TypeScript often eliminate need for JSDoc.

### Inline Comments

- Used to explain **why**, not **what**
- Appears above code block, not inline
- Generally minimal due to intention-revealing names

Example:
```typescript
// helps avoid no-op state changes
const sameSet = <T>(setA: Set<T>, setB: Set<T>) =>
  setA.size === setB.size && [...setA].every(el => setB.has(el));
```

### Disable Comments

ESLint disable comments are used sparingly:
- At file level for legitimate violations (e.g., external code, fp/no-loops in zustand utility)
- Inline for specific lines when unavoidable (e.g., mutation in middleware)

Example:
```typescript
/* eslint-disable fp/no-loops */
/* eslint-disable fp/no-mutation */
// External code from zustand docs
```

## Consistency Assessment

### Strong Consistency

- **Naming**: Extremely consistent camelCase/PascalCase usage
- **Formatting**: Prettier enforces consistent formatting throughout
- **Functional style**: fp plugin rules enforced across entire codebase
- **File naming**: Clear patterns for components (PascalCase) vs utilities (camelCase)
- **Import style**: Single quotes, arrow functions, consistent patterns

### Minor Variations

- **Styled components**: Mix of inline vs separate `styled.ts` files
- **Export style**: Mix of default exports and named exports
- **Type location**: Sometimes inline, sometimes in separate files
- **ESLint disables**: Used only when absolutely necessary (e.g., external code, specific mutations)

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| DRY | Strong | Shared hooks (`useBoolean`, `useFuzzySearch`, `useTableControls`), utility functions, GraphQL fragments |
| KISS | Strong | Functions average 15-30 lines, simple abstractions, clear logic flow |
| YAGNI | Strong | No speculative abstractions, focused on current needs |
| Single Responsibility | Strong | Each hook/component has one clear purpose |
| Open/Closed | Weak | Limited extension points, components tightly coupled to design system |
| Liskov Substitution | Moderate | HOC pattern used (`WithSuspense`), but limited inheritance overall |
| Interface Segregation | Strong | Focused type definitions, no god objects |
| Dependency Inversion | Weak | Direct dependencies on concrete implementations (Apollo, Zustand) |
| WET | Weak | Minimal duplication, some in test setup but production code is DRY |
| AHA | Strong | Abstractions emerge from real needs (e.g., `useTableControls` from repeated patterns) |

### Examples

#### DRY (Strong)
- **`lib/hooks/useBoolean.ts`** - Reusable boolean state hook used across 10+ components
- **`lib/hooks/useFuzzySearch.ts`** - Generic search functionality extracted into reusable hook
- **`lib/hooks/useTableControls/`** - Complex table behavior abstracted into single reusable hook
- **`lib/graphql/fragments/`** - GraphQL fragments shared across queries to avoid duplication
- **`components/common/WithSuspense.tsx`** - HOC pattern eliminates Suspense boundary duplication

#### KISS (Strong)
- **`lib/hooks/useBoolean.ts:5-24`** - Simple, clear state management for boolean values
- **`lib/date/index.ts:3-9`** - Straightforward date utility functions, no over-engineering
- **`middleware.ts:8-18`** - Simple redirect logic, easy to understand
- **`lib/config/client.ts:4-6`** - Minimal config parsing, just what's needed

#### YAGNI (Strong)
- No unused abstractions or "just in case" code
- GraphQL fragments only exist when shared (e.g., `promoterFields` used by multiple queries)
- Utilities created only when pattern repeats (e.g., `usePageParam` after pagination needed in multiple places)

#### Single Responsibility (Strong)
- **`lib/hooks/useBoolean.ts`** - Only manages boolean state
- **`lib/hooks/useFuzzySearch.ts`** - Only handles fuzzy search logic
- **`lib/hooks/graphql/useGetPromoters.ts`** - Only fetches promoters data
- **`components/common/SimpleTable.tsx`** - Only renders tables, no business logic

#### Open/Closed (Weak)
- Components tightly coupled to TM1 design system (`@tm1/design-system-react`)
- Limited plugin/extension architecture
- Changes often require modifying existing components rather than extending

#### Liskov Substitution (Moderate)
- **`components/common/WithSuspense.tsx:4-14`** - HOC correctly wraps components maintaining props interface
- Limited inheritance used overall, relies more on composition

#### Interface Segregation (Strong)
- **`lib/hooks/useTableControls/types.ts:3-47`** - Focused options interface, each field optional and purposeful
- **`components/common/SimpleTable.tsx:5-13`** - Minimal, focused TableProps
- No bloated interfaces requiring implementers to handle unused properties

#### Dependency Inversion (Weak)
- Direct coupling to Apollo Client (`useSuspenseQuery`)
- Direct coupling to Zustand store
- No abstraction layer for state management or data fetching
- Makes testing/mocking more difficult

#### WET (Weak)
- **Minimal duplication found** - Most common patterns extracted
- Some duplication in test setup (`jest.setup.ts`) but acceptable
- Styled component patterns sometimes repeated but within acceptable limits

#### AHA (Strong)
- **`lib/hooks/useTableControls/`** - Abstraction emerged after table pattern repeated in 3+ places
- **`lib/hooks/useBooleanSet.ts`** - Created when managing multiple boolean states became common pattern
- **`components/common/WithSuspense.tsx`** - HOC created after manually writing Suspense boundaries multiple times
- Abstractions have clear motivations documented in commit history

## Code Readability

**Overall Rating:** Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function/variable names clearly express purpose and intent |
| Narrative Flow | Excellent | Code reads top-to-bottom, high-level orchestration before details |
| Abstraction Consistency | Excellent | Functions maintain consistent abstraction levels |
| Self-Documentation | Excellent | Code structure and naming eliminate need for most comments |

### Highly Readable Examples

#### 1. **`lib/hooks/useBoolean.ts:5-24`** - Perfect intention-revealing names
```typescript
export function useBoolean(defaultValue = false): UseBooleanReturn {
  const [value, setValue] = useState(defaultValue);

  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  const toggle = useCallback(() => setValue(bool => !bool), []);

  return [value, setTrue, setFalse, toggle];
}
```
- Function names (`setTrue`, `setFalse`, `toggle`) reveal exact intent
- No comments needed - names tell complete story
- Return tuple structure is self-explanatory

#### 2. **`lib/hooks/useFuzzySearch.ts:4-20`** - Clear narrative flow
```typescript
const useFuzzySearch = <T extends string | object>(items: T[], propName = 'name' as keyof T) => {
  const [searchData, setSearchData] = useState({ searchText: '', searchResults: [] as T[] });

  const handleSearch = useCallback((searchText: string) => {
    const searchResults = search(searchText, items, { keySelector: obj => obj[propName] as string });
    setSearchData({ searchText, searchResults });
  }, [items, propName]);

  const { searchText, searchResults } = searchData;
  const results = searchText ? searchResults : items;
  return { items: results, handleSearch };
};
```
- Reads like prose: store search data → handle search → return results
- Each line builds on previous
- Variable names explain purpose without comments

#### 3. **`lib/hooks/usePageParam.ts:6-32`** - Abstraction consistency
```typescript
const usePageParam = (key = 'page') => {
  const currentPage = useMemo(() => {
    const page = searchParams.get(key);
    return page ? Math.max(1, parseInt(page, 10)) : 1;
  }, [searchParams, key]);

  const setPage = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, String(page));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, key]);

  const incrementPage = useCallback(() => setPage(currentPage + 1), [currentPage, setPage]);
  const decrementPage = useCallback(() => setPage(Math.max(1, currentPage - 1)), [currentPage, setPage]);

  return { currentPage, incrementPage, decrementPage };
};
```
- All functions at same abstraction level (URL param management)
- High-level operations (`incrementPage`) built on lower-level (`setPage`)
- No mixing of URL parsing with business logic

#### 4. **`components/Campaigns/index.tsx:16-54`** - Self-documenting structure
```typescript
const CampaignsTable = () => {
  const { currentPage, incrementPage, decrementPage } = usePageParam();
  const { data } = useCampaignsList(currentPage);
  const { Controls, EmptyState } = useTableControls({...});

  const columns = ['Created', 'Name & Tour', 'Slug', ...];
  const tableData = data.map(campaign => ({...}));

  return (
    <Container>
      {hasCampaigns && Controls}
      <StyledTable columns={columns} data={tableData} />
      {!hasCampaigns && EmptyState}
      <PageButtons>...</PageButtons>
    </Container>
  );
};
```
- Setup phase clearly separated from render
- Each section has single responsibility
- Variable names explain content (`tableData`, `Controls`)

#### 5. **`lib/date/index.ts:3-9`** - Clear utility functions
```typescript
const getUserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const formClockToUTC = (dateTimeString: string, timezone = getUserTimezone()) =>
  dateTimeString ? fromZonedTime(dateTimeString.replace('Z', ''), timezone).toISOString() : '';

export const UTCToFormClock = (dateTimeString: string, timezone = getUserTimezone()) =>
  dateTimeString ? formatInTimeZone(dateTimeString, timezone, "yyyy-MM-dd'T'HH:mm:ss'.000Z'") : '';
```
- Function names describe complete transformation (source → destination)
- Helper function (`getUserTimezone`) has obvious purpose
- Edge cases handled without cluttering logic

### Needs Improvement

#### 1. **⚠️ `lib/graphql/apollo/ApolloWrapper.tsx:9-18`** - Abstraction inconsistency
```typescript
export function cleanTypename<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map(cleanTypename) as any;
  }
  if (data && typeof data === 'object') {
    const { __typename: _, ...rest } = data as any;
    return Object.fromEntries(Object.entries(rest).map(([key, val]) => [key, cleanTypename(val)])) as any;
  }
  return data;
}
```
- Function mixes type checking (high-level) with data transformation (low-level)
- Multiple `as any` casts indicate type safety compromises
- Recursive logic could be more clearly separated
- **Suggestion**: Extract type guard functions, separate recursion logic

#### 2. **⚠️ `lib/store/slices/recentCampaigns.ts:9-24`** - Side effects in business logic
```typescript
insertRecentCampaign: ({ id, name }: CampaignRes) =>
  set(state => {
    const newList = [{ id, name }, ...state.recentCampaigns]
      .filter((cmp, index, arr) => arr.findIndex(curr => curr.id === cmp.id) === index)
      .slice(0, 4);

    window?.localStorage?.setItem('recentCampaigns', JSON.stringify(newList));

    return { ...state, recentCampaigns: newList };
  })
```
- Mixes state update logic with localStorage persistence
- Makes testing harder (localStorage side effect)
- **Suggestion**: Separate persistence logic into middleware or effect

#### 3. **⚠️ `lib/hooks/useTableControls/index.tsx:1-189`** - File exceeds simplicity threshold
- 189 lines with multiple responsibilities
- Could be split into smaller hooks:
  - `useDeleteDialog` (already separated but internal)
  - `useTableSelection`
  - `useTableExpansion`
  - `useTableControls` (orchestrator)
- **Note**: Marked with `/* eslint-disable complexity */` acknowledging the issue
- **Suggestion**: Extract sub-hooks to separate files

#### 4. **⚠️ `components/EventsList/EventsListRow/helpers.ts:72-87`** - Function name doesn't reveal complexity
```typescript
export const getBadgeStatus = ({ event, point, city, state, timezone }: MarketRes): MarketStatus => {
  // Multiple nested conditions checking various field combinations
}
```
- Function name suggests simple lookup but contains complex validation logic
- Marked with `/* eslint-disable complexity */`
- **Suggestion**: Rename to `validateMarketCompleteness` or extract validation rules to separate functions

## Special Conventions

### Functional Programming

This codebase follows **strict functional programming principles**:

- No classes (fp/no-class)
- No loops - use array methods (fp/no-loops)
- No `let` - only `const` (fp/no-let)
- No mutations (fp/no-mutation) except:
  - `this` (in class-like patterns)
  - Context objects (`ctx`, `context`)
  - Ramda operations (`R`)
  - Router mutations (`router`)
- Arrow functions preferred

### React Patterns

- **Hooks**: Custom hooks for reusable stateful logic
- **HOC**: `WithSuspense` wrapper for loading states
- **Composition**: Prefer composition over inheritance
- **Client/Server**: Explicit `'use client'` directives for client components

### GraphQL

- Fragments in `lib/graphql/fragments/` for reusable field sets
- Mutations in `lib/graphql/mutations/`
- Queries in `lib/graphql/queries/`
- Constants for query/mutation names: `SCREAMING_SNAKE_CASE`

### State Management

- **Zustand** for global state
- **React hooks** for local state
- **Apollo Client** for server state (GraphQL)
- Store slices in `lib/store/slices/`

### Styled Components

- Inline styled components at bottom of component file
- Or separate `styled.ts`/`styled.tsx` file
- Use theme provider for global styles
- Prefix transient props with `$` (e.g., `$isOpen`)
