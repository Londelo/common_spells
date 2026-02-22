# Code Complexity - reg-ui

## Metrics

| Metric | Value |
|--------|-------|
| Total source files | 209 (excluding tests, type definitions) |
| Avg function length | ~20-40 lines |
| Avg file size | ~57 lines |
| Max file size | 980 lines (`lib/types/appsync.ts` - auto-generated) |
| Max nesting depth | 2 (enforced by ESLint) |
| Max cyclomatic complexity | 6 (enforced by ESLint) |
| Largest component | ~150 lines (`components/ErrorModal/index.tsx`) |
| Largest styled file | ~267 lines (`components/SignupForm/styled.tsx`) |

## File Size Distribution

| Size Range | Count | Examples |
|------------|-------|----------|
| < 50 lines | ~60% | Most utilities, small components |
| 50-100 lines | ~25% | Medium components, complex hooks |
| 100-200 lines | ~10% | Large components, complex utilities |
| > 200 lines | ~5% | Type definitions, styled components, mock API |

**Largest Files:**
- `lib/types/appsync.ts` (980 lines) - Auto-generated GraphQL types
- `lib/types/campaign.ts` (272 lines) - TypeScript type definitions
- `components/SignupForm/styled.tsx` (267 lines) - Styled components
- `components/Selections/styled.tsx` (248 lines) - Styled components
- `app/api/graphql/route.ts` (171 lines) - Mock GraphQL server
- `lib/store/index.ts` (151 lines) - Zustand store with types

## Complexity Observations

### Simple Areas

**Utilities in `lib/utils/`**
- Most utilities are single-purpose, 10-50 lines
- Clear inputs, outputs, no side effects
- Examples:
  - `calculateDistance.ts` (11 lines) - Pure function
  - `url.ts` (41 lines) - Simple URL manipulation
  - `element.ts` (short file) - DOM utilities
  - `splitToLines.tsx` (small) - Text processing

**Custom Hooks in `hooks/`**
- Well-scoped, focused on single concern
- Average 30-50 lines per hook
- Examples:
  - `useInterval.ts` (23 lines) - Clean interval management
  - `useCountdownTimer.ts` (37 lines) - Timer logic
  - `useScrollTo.ts` (small) - Scroll behavior
  - `useTabLock.ts` (small) - Tab locking

**Small Components**
- Header/Footer (20-100 lines) - Simple layout components
- `ArtistName` (small) - Display component
- `MarketInfo` (48 lines) - Data display
- `Logo` (small) - Static component

### Moderate Complexity

**Medium Components**
- `ArtistSocials` (35 lines component, 145 lines styles) - Multiple hooks, conditional rendering
- `Footer` (100 lines) - Multiple subcomponents, localization logic
- `SignupForm` (80 lines component, 267 lines styles) - Form orchestration, multiple hooks
- `Selections` (moderate) - Market selection logic

**Complex Utilities**
- `partitionMarketsByDistance.ts` (80 lines) - Geographic partitioning algorithm
  - Multiple helper functions
  - Ramda composition
  - Recursive logic in `findSplitIndex`
- `getBestViewingLocale.ts` (136 lines) - Locale resolution logic
  - Country mapping
  - Distance calculations
  - Multiple conditional branches
- `getUrlsByLocale.ts` (137 lines) - URL mapping by locale

**State Management**
- `lib/store/index.ts` (151 lines) - Zustand store
  - Multiple slices (campaign, user, form, UI)
  - Action creators
  - Selector functions

### Complex Areas

**Type Definitions**
- `lib/types/appsync.ts` (980 lines) - **Auto-generated**, not written by developers
  - Contains all GraphQL schema types
  - Should not be manually edited
- `lib/types/campaign.ts` (272 lines) - Complex domain types
  - Nested structures for campaigns, markets, artists
  - Union types for various states
  - Well-organized but lengthy due to domain complexity

**Styled Components**
- Large styled component files (200-270 lines)
  - Multiple component definitions
  - Media queries
  - Theme-based styles
  - Not algorithmically complex, just verbose
- Examples:
  - `components/SignupForm/styled.tsx` (267 lines)
  - `components/Selections/styled.tsx` (248 lines)
  - `components/ArtistSocials/styled.tsx` (145 lines)

**Mock GraphQL Server**
- `app/api/graphql/route.ts` (171 lines)
  - Apollo Server setup
  - Resolver definitions
  - Mock data integration
  - Used only in local development

**Campaign Transformation**
- Files in `lib/utils/campaign/` handle complex business logic:
  - Locale resolution
  - Campaign data transformation
  - Redirect logic
  - Cache integration

### Nesting Depth

**Enforced Maximum: 2 levels**

The codebase adheres to this exceptionally well due to ESLint enforcement:

```typescript
// Typical pattern - max 2 levels
if (condition1) {
  if (condition2) {
    doSomething();
  }
}
```

**How complexity is managed:**
- Early returns to avoid nesting
- Extraction to helper functions
- Ramda composition to flatten logic
- Guard clauses to reduce nesting

Example from `partitionMarketsByDistance.ts`:
```typescript
// Early return pattern to avoid nesting
if (!markets.length) {
  return [[], []];
}

// Recursive function to avoid loop nesting
const findSplitIndex = ({ marketsByDistanceAsc, limits, index, prevDistance = 0 }) => {
  if (distance < limits.dMax && (index < limits.nearbyTargetCount || distance === prevDistance)) {
    return findSplitIndex({ marketsByDistanceAsc, limits, index: index + 1, prevDistance: distance });
  }
  return index;
};
```

### Cyclomatic Complexity

**Enforced Maximum: 6**

Most functions stay well below this limit. Occasional exceptions are explicitly marked:

```typescript
// eslint-disable-next-line complexity
const MarketInfo = (market: Market) => {
  // Component with multiple conditional branches
};
```

**Strategies to keep complexity low:**
1. **Extract conditions to variables**
   ```typescript
   const shouldShowCookies = !isMobile && !isLNAA;
   ```

2. **Use guard clauses**
   ```typescript
   if (!markets.length) return [[], []];
   ```

3. **Functional composition**
   ```typescript
   const transform = R.pipe(R.map(fn1), R.filter(fn2));
   ```

4. **Separate concerns**
   - Break complex components into smaller ones
   - Extract logic to custom hooks
   - Move calculations to utilities

## Functional Programming Impact on Complexity

**Positive Effects:**
- **No loops** - Forces use of `.map()`, `.filter()`, `.reduce()` which are clearer
- **Immutability** - Eliminates mutation-related bugs and side effects
- **Pure functions** - Easier to test and reason about
- **Composition** - Ramda pipes make data transformations readable
- **No classes** - Simpler mental model, no inheritance complexity

**Example of functional approach reducing complexity:**

Instead of:
```typescript
// Imperative (forbidden)
let result = [];
for (let i = 0; i < items.length; i++) {
  if (items[i].distance < MAX) {
    result.push(transform(items[i]));
  }
}
```

The code uses:
```typescript
// Functional (enforced)
const result = R.pipe(
  R.filter(item => item.distance < MAX),
  R.map(transform)
)(items);
```

This reduces cognitive load by expressing "what" not "how".

## Technical Debt Indicators

**Minimal Technical Debt:**

1. **Max lines violations** - Some files exceed 200 lines:
   - `lib/types/appsync.ts` (980) - Auto-generated, acceptable
   - Type definition files - Complex domain requires detailed types
   - Styled component files - Verbose but not complex
   - **Impact:** Low - Most violations are in non-algorithmic code

2. **Complexity disables** - Rare occurrences of `eslint-disable complexity`
   - Usually in UI components with multiple display branches
   - **Impact:** Low - Isolated to specific components

3. **Console logging** - Set to `warn` not `error`
   - Allows console logging during development
   - **Impact:** Minimal - Disabled in production

**Good Practices Observed:**

1. **Consistent structure** - Predictable file organization
2. **Strong typing** - TypeScript strict mode prevents type-related bugs
3. **Test coverage** - Spec files co-located with implementation
4. **Small functions** - Easier to test and maintain
5. **Clear dependencies** - Import structure reveals dependencies
6. **Functional purity** - No hidden side effects

## Recommendations

### Maintain Current Standards

**Keep doing:**
- Enforce max complexity and nesting limits
- Continue extracting complex logic to utilities
- Maintain functional programming discipline
- Keep components small and focused

### Consider Improvements

1. **Type definition files**
   - Consider splitting `lib/types/campaign.ts` into domain-specific modules
   - Example: `lib/types/market.ts`, `lib/types/artist.ts`, `lib/types/promoter.ts`

2. **Styled component files**
   - Large styled files (200+ lines) could be split
   - Group related styled components into sub-files
   - Example: `SignupForm/styled/Form.ts`, `SignupForm/styled/OptIns.ts`

3. **JSDoc comments**
   - Add JSDoc to public API functions
   - Document complex algorithms like `partitionMarketsByDistance`
   - Helps IDE autocomplete and developer understanding

4. **Complexity exceptions**
   - Review components with `eslint-disable complexity`
   - Consider breaking into smaller sub-components
   - Extract conditional logic to hooks or utilities

### Low Priority Improvements

1. **Import ordering**
   - Consider automated import sorting (e.g., `eslint-plugin-import` rules)
   - Would make imports more scannable

2. **File naming**
   - Minor inconsistency in `styled.ts` vs `styled.tsx`
   - Low impact but could standardize

### Areas of Excellence (Continue)

1. **Functional programming discipline** - Zero violations across codebase
2. **Small function size** - Excellent adherence to simplicity
3. **Type safety** - Strong TypeScript usage prevents runtime errors
4. **Test coverage** - Spec files present for complex logic
5. **Code readability** - Excellent naming and structure

## Complexity Trends

**Trajectory: Stable & Healthy**

The codebase shows signs of mature engineering practices:
- Consistent patterns throughout
- Well-enforced complexity limits
- Clear separation of concerns
- Minimal technical debt

**Risk Factors: Low**
- No legacy code patterns
- No sprawling functions or classes
- No deeply nested structures
- No mutation-related bugs possible

**Maintainability: High**
- New developers can understand code quickly
- Changes are localized due to good separation
- Functional approach prevents common bug classes
- Strong typing catches errors at compile time
