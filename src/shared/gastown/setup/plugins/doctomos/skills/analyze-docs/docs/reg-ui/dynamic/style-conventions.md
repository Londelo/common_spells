# Coding Conventions - reg-ui

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `targetDate`, `clientGeoPoint` |
| Functions | camelCase | `calculateDistance`, `getDurationToNow` |
| React Components | PascalCase | `ArtistSocials`, `MarketInfo` |
| Custom Hooks | camelCase with `use` prefix | `useCountdownTimer`, `useScrollTo` |
| Types/Interfaces | PascalCase | `LatitudeLongitude`, `Duration` |
| Enums | PascalCase | `ModalType`, `UiPage` |
| Enum Values | SCREAMING_SNAKE_CASE | `ERROR`, `REGISTRATION` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_NEARBY_DISTANCE`, `MAX_NEARBY_DISTANCE` |
| Files (components) | PascalCase | `ArtistSocials/index.tsx` |
| Files (utilities) | camelCase | `calculateDistance.ts`, `partitionMarketsByDistance.ts` |
| Styled Components | PascalCase | `MarketInfoGrid`, `HeaderContainer` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single quotes |
| Semicolons | Required |
| Trailing commas | None |
| Line length | 120 characters |
| Arrow function parens | Avoid (single param) |
| Print width | 120 |

## ESLint Rules (Key Functional Programming)

### Prohibited Patterns

| Rule | Setting | Description |
|------|---------|-------------|
| fp/no-class | error | Classes forbidden - use functions |
| fp/no-loops | error | Loops forbidden - use `.map()`, `.filter()`, `.reduce()` |
| fp/no-let | error | `let` forbidden - use `const` |
| fp/no-mutation | error | Object/array mutation forbidden |
| fp/no-mutating-methods | error | Mutating methods forbidden (except Ramda `R.*`) |
| fp/no-delete | error | `delete` operator forbidden |
| fp/no-arguments | error | `arguments` object forbidden - use rest params |
| fp/no-get-set | error | Getters/setters forbidden |
| no-restricted-syntax | error | `switch`, loops, `with` forbidden |
| no-plusplus | error | `++`/`--` forbidden - use `+= 1` |

### Code Quality Rules

| Rule | Setting | Description |
|------|---------|-------------|
| complexity | error (max 6) | Cyclomatic complexity limit |
| max-lines | error (200) | File length limit |
| max-depth | error (2) | Nesting depth limit |
| id-length | error (min 2) | Identifier length (exceptions: `_`, `t`) |
| no-console | warn | Console logging warned (not error) |
| no-nested-ternary | error | Nested ternaries forbidden |
| no-await-in-loop | error | Await in loops forbidden - use `Promise.all()` |

### Required Patterns

| Rule | Setting | Description |
|------|---------|-------------|
| prefer-const | error | Use `const` over `let` |
| prefer-arrow-callback | error | Arrow functions required |
| prefer-template | error | Template literals over concatenation |
| prefer-spread | error | Spread operator over `.apply()` |
| prefer-rest-params | error | Rest params over `arguments` |
| curly | error | Curly braces required for all blocks |
| eqeqeq | error | Strict equality (`===`) required |
| consistent-return | error | Consistent return values |
| no-else-return | error | No `else` after `return` |

## Import Organization

Imports are grouped in the following order:

1. **External libraries** - React, Next.js, third-party packages
2. **Internal components** - From `components/`
3. **Internal utilities** - From `lib/`, `hooks/`, `context/`, `shared/`
4. **Types** - Type imports
5. **Styled components** - From local `styled.ts` or `styled.tsx`

Example:
```typescript
// External
import { useState } from 'react';
import { useTranslations } from 'next-intl';

// Components
import Markets from './Markets';
import OptIns from './OptIns';

// Utilities
import { ModalType, useStore } from 'lib/store';
import useScrollTo from 'hooks/useScrollTo';

// Types
import type { Market } from 'lib/types/campaign';

// Styled
import { Form, SelectMarketsHeader } from './styled';
```

## File Structure

### Component Files

Components follow a standard structure:
- **`index.tsx`** - Main component file
- **`styled.tsx` or `styled.ts`** - Styled components (co-located)
- **`ComponentName.spec.tsx`** - Tests (optional)

Components are organized within their own directories.

### Utility Files

Utilities are single-purpose modules:
- One default export per file
- File named after the function (e.g., `calculateDistance.ts`)
- Tests co-located (e.g., `calculateDistance.spec.ts`)

### React Component Structure

Components follow this pattern:

1. `'use client'` directive (if client component)
2. Imports
3. Type definitions
4. Helper functions / constants
5. Main component function
6. Export (possibly wrapped with HOC)

Example:
```typescript
'use client';

import { useState } from 'react';
import { StyledContainer } from './styled';

type ComponentProps = {
  title: string;
};

const Component = ({ title }: ComponentProps) => {
  const [count, setCount] = useState(0);

  return <StyledContainer>{title}</StyledContainer>;
};

export default Component;
```

## Comment Style

### JSDoc Comments

Not consistently used across the codebase. Most code relies on TypeScript types for documentation.

### Inline Comments

Used sparingly to explain:
- Complex algorithms
- Business logic
- Why certain patterns are used
- ESLint rule disables

Examples:
```typescript
// Euclidean distance formula is used for simplicity, keep for now
const calculateDistance = ...

// eslint-disable-next-line fp/no-mutation
savedCallback.current = callback;
```

## TypeScript Usage

### Type Definitions

- Use `type` for object shapes and unions
- Use `interface` for extensible contracts (rare in this codebase)
- Use `enum` for known constants
- Export types from component files when needed by consumers

### Type Safety

| Setting | Status |
|---------|--------|
| strict | Enabled |
| noEmit | Enabled |
| isolatedModules | Enabled |

### Common Patterns

**Functional component types:**
```typescript
const Component = ({ prop }: { prop: string }) => { ... };
```

**Ramda typed functions:**
```typescript
import * as R from 'ramda';
const transform = R.pipe(
  R.map(transform),
  R.filter(predicate)
);
```

**Store selectors:**
```typescript
const value = useStore.use.propertyName();
const derived = useStore(selectorFunction);
```

## Consistency Assessment

### Strong Adherence

- **Naming conventions** - camelCase/PascalCase rules consistently followed
- **File organization** - Components in directories with index.tsx
- **Functional programming** - No classes, no loops, no `let` throughout
- **TypeScript strictness** - Strong typing with strict mode enabled
- **Formatting** - Prettier config followed uniformly

### Minor Inconsistencies

- **Import ordering** - Generally grouped but not always alphabetized within groups
- **JSDoc comments** - Not consistently present; reliance on TypeScript types
- **Component prop destructuring** - Mix of inline vs separate type definitions
- **File naming** - Mostly consistent but some variation (e.g., `styled.ts` vs `styled.tsx`)

### Notable Deviations

- **Max lines limit (200)** - Several files exceed this:
  - `lib/types/appsync.ts` (980 lines - auto-generated)
  - `lib/types/campaign.ts` (272 lines - type definitions)
  - Styled component files (200-270 lines)
- **Complexity rule (max 6)** - Occasionally disabled with `eslint-disable complexity`
- **Console logging** - Set to `warn` not `error`, allowed in development

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| DRY (Don't Repeat Yourself) | **Strong** | Shared utilities in `lib/utils/`, hooks extracted to `hooks/`, minimal duplication |
| KISS (Keep It Simple, Stupid) | **Strong** | Functions average ~20-40 lines, single responsibility, clear purpose |
| YAGNI (You Aren't Gonna Need It) | **Strong** | No speculative code, focused on current requirements |
| Single Responsibility | **Strong** | Each function/component has one clear purpose (e.g., `calculateDistance`, `useCountdownTimer`) |
| Open/Closed | **Moderate** | Some extension via HOCs (`WithHideInMobileApp`), but limited plugin architecture |
| Liskov Substitution | Not Applicable | No class inheritance (classes forbidden by ESLint) |
| Interface Segregation | **Moderate** | Types are focused but some complex types in `lib/types/campaign.ts` |
| Dependency Inversion | **Moderate** | Dependency injection via React Context, but some concrete dependencies |
| Functional Composition | **Strong** | Heavy use of Ramda's `pipe`, `compose`, currying throughout |
| Immutability | **Strong** | Enforced by ESLint `fp/*` rules, const-only, no mutation |

**Examples:**

### DRY (Strong)
- **`lib/utils/calculateDistance.ts`** - Distance calculation shared across multiple features
- **`hooks/useCountdownTimer.ts`** - Timer logic extracted to reusable hook
- **`lib/utils/partitionMarketsByDistance.ts`** - Complex partitioning logic centralized

### KISS (Strong)
- **`lib/utils/calculateDistance.ts` (11 lines)** - Simple Euclidean distance formula
- **`hooks/useInterval.ts` (23 lines)** - Clean interval hook implementation
- **`components/Header/index.tsx` (19 lines)** - Straightforward header component

### YAGNI (Strong)
- No abstract base classes or over-engineered inheritance hierarchies
- Components only implement required features
- Utilities solve specific problems without excessive generalization

### Single Responsibility (Strong)
- **`calculateDistance.ts`** - Only calculates distance between two points
- **`useCountdownTimer.ts`** - Only manages countdown state
- **`MarketInfo/index.tsx`** - Only displays market information

### Functional Composition (Strong)
- **`partitionMarketsByDistance.ts:29`** - Ramda pipe composition:
  ```typescript
  const getTargetNearbyCount = R.pipe(R.min(TARGET_NEARBY_CEIL), R.max(TARGET_NEARBY_FLOOR));
  ```
- **`getBestViewingLocale.ts:49-54`** - Multiple pipe compositions for data transformation
- **`partitionMarketsByDistance.ts:52-53`** - Complex data transformation via composition

### Immutability (Strong)
- All state updates via `setState` (React hooks)
- Ramda functions for data transformation (non-mutating)
- ESLint enforces `const` and prevents object mutation
- Exception: React ref mutations allowed (`savedCallback.current = ...`)

### Open/Closed (Moderate)
- **`hoc/WithHideInMobileApp.tsx`** - HOC pattern allows extension
- Limited use of strategy pattern or plugin architecture
- Most extension happens via component composition

### Dependency Inversion (Moderate)
- **Context providers** - `ClientConfigProvider`, `SWRProvider` inject dependencies
- **Config abstraction** - `lib/config/server.ts` vs `lib/config/client.ts`
- Some concrete dependencies (Redis client, GraphQL client)

## Code Readability

**Overall Rating:** Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | **Excellent** | Function names clearly express intent (`calculateDistance`, `partitionMarketsByDistance`, `getDurationToNow`) |
| Narrative Flow | **Excellent** | Code reads top-to-bottom naturally, helper functions follow main logic |
| Abstraction Consistency | **Good** | Functions generally stay at one abstraction level, occasional mixing in complex utilities |
| Self-Documentation | **Excellent** | Code is self-explanatory due to descriptive names and TypeScript types |

**Highly Readable Examples:**

### 1. **`calculateDistance.ts`** - Perfect simplicity and clarity
```typescript
const calculateDistance = ([latitude1, longitude1], [latitude2, longitude2]) => {
  const distanceLatitude = latitude2 - latitude1;
  const distanceLongitude = longitude2 - longitude1;
  const distance = Math.sqrt(Math.pow(distanceLatitude, 2) + Math.pow(distanceLongitude, 2));
  return distance;
};
```
- Variable names explain each step
- Mathematical intent is clear
- No comments needed

### 2. **`useCountdownTimer.ts`** - Excellent narrative flow
```typescript
const useCountdownTimer = (targetDate: Date): Duration => {
  const [duration, setDuration] = useState(getDurationToNow(targetDate));
  useInterval(
    () => {
      setDuration(getDurationToNow(targetDate));
    },
    isFuture(targetDate) ? 1000 : null
  );
  return duration;
};
```
- Reads like a story: "Get duration, update it every second if future, return it"
- Function name `getDurationToNow` reveals its purpose
- Conditional logic is self-explanatory

### 3. **`partitionMarketsByDistance.ts:29-30`** - Clear functional composition
```typescript
const getTargetNearbyCount = R.pipe(R.min(TARGET_NEARBY_CEIL), R.max(TARGET_NEARBY_FLOOR));
const sortByDistance = R.sortBy(R.prop('distance'));
```
- Function names describe transformation
- Composition is readable left-to-right
- Constants explain business rules

### 4. **`ArtistSocials/index.tsx`** - Self-documenting React component
```typescript
const ArtistSocials = ({ detail: { name, images, externalLinks } }: { detail: ArtistDetail }) => {
  const t = useTranslations('ArtistSocials');
  const { url, hasImage, imgRef } = useIdealImage(images);
  const { scaledStyles, textLines, resizeRef, containerRef, textRef } = useScaleTextToContainer(name);
```
- Destructuring reveals data structure
- Custom hooks have clear names (`useIdealImage`, `useScaleTextToContainer`)
- Variable names explain purpose

### 5. **`url.ts`** - Clear utility functions
```typescript
export const hasAutoSubmitParam = () => hasUrlParam(AUTO_SUBMIT_PARAM, 'true');
export const deleteAutoSubmitParam = () => deleteUrlParam(AUTO_SUBMIT_PARAM);
export const setAutoSubmitOnWindow = () => {
  const params = new URLSearchParams(window.location.search);
  setAutoSubmitParam(params);
  window.location.search = params.toString();
};
```
- Function names explain exact behavior
- Composition builds on lower-level functions
- Constants make magic strings meaningful

**Characteristics Contributing to Readability:**

1. **Short functions** - Average 20-40 lines, easy to understand at a glance
2. **Descriptive naming** - Names reveal intent without needing comments
3. **Functional composition** - Ramda pipes read like data transformations
4. **TypeScript types** - Types document expected inputs/outputs
5. **Consistent patterns** - Hooks, components, utilities follow predictable structures
6. **Minimal nesting** - Max depth of 2 enforced by ESLint keeps code flat
7. **No side effects** - Functional programming makes behavior predictable
