# Code Complexity - admin-ui-next

## Metrics

| Metric | Value |
|--------|-------|
| Avg function length | ~20-25 lines |
| Max nesting depth | 2 (enforced by ESLint) |
| Avg file size | ~50-80 lines |
| Largest files | 189 lines (useTableControls), 163 lines (useEventForm) |
| Max file size | 200 lines (enforced by ESLint) |
| Cyclomatic complexity | Max 6 (enforced by ESLint) |
| Total source files | ~70 TypeScript/TSX files |

## File Size Distribution

| Size Range | Count | Examples |
|------------|-------|----------|
| < 50 lines | ~40% | `useBoolean.ts` (25), `validators.ts` (2), `client.ts` (7) |
| 50-100 lines | ~35% | `useBooleanSet.ts` (95), `SimpleTable.tsx` (108) |
| 100-150 lines | ~15% | `Campaign.tsx` (134), `recentCampaigns.ts` (28) |
| 150-200 lines | ~10% | `useTableControls/index.tsx` (189), `useEventForm.ts` (163) |

## Complexity Observations

### Simple Areas (Excellent)

These areas demonstrate **outstanding code simplicity and clarity**:

#### 1. **Custom Hooks (lib/hooks/)**

**`lib/hooks/useBoolean.ts`** (25 lines)
- Single responsibility: manage boolean state
- 4 simple functions, no nesting
- Perfect example of KISS principle
- Complexity: **1/10**

**`lib/hooks/useFuzzySearch.ts`** (21 lines)
- Clean abstraction over fuzzy search library
- Simple state management
- Complexity: **2/10**

**`lib/hooks/usePageParam.ts`** (33 lines)
- URL parameter management
- Clear separation of concerns
- Memoization used appropriately
- Complexity: **2/10**

**`lib/hooks/graphql/useGetPromoters.ts`** (20 lines)
- Simple data fetching hook
- Error handling included
- Clean GraphQL integration
- Complexity: **1/10**

#### 2. **Configuration (lib/config/)**

**`lib/config/client.ts`** (7 lines)
- Minimal config parsing
- Type-safe with Zod schema
- Complexity: **1/10**

**`lib/config/readConfig.ts`** (minimal)
- Simple config reading logic
- Complexity: **1/10**

#### 3. **Utilities (lib/utils/)**

**`lib/utils/validators.ts`** (2 lines)
- Single regex export
- No logic, just pattern
- Complexity: **0/10**

**`lib/date/index.ts`** (10 lines)
- 3 simple date formatting functions
- Clear input/output transformations
- Edge case handling without complexity
- Complexity: **1/10**

#### 4. **GraphQL Queries/Mutations**

**`lib/graphql/mutations/upsertMarket.ts`** (13 lines)
- Simple GraphQL mutation definition
- Fragment composition
- Complexity: **0/10**

**`lib/graphql/mutations/deleteMarket.ts`** (similar pattern)
- Consistent, simple structure
- Complexity: **0/10**

#### 5. **Simple Components**

**`components/Promoters/index.tsx`** (11 lines)
- Wrapper component with HOC
- Single responsibility
- Complexity: **0/10**

**`middleware.ts`** (24 lines)
- Simple redirect map
- Clear conditional logic
- Complexity: **1/10**

### Moderate Complexity Areas (Good)

These areas are more complex but **well-managed and maintainable**:

#### 1. **`lib/hooks/useBooleanSet.ts`** (95 lines)
- Manages set of boolean states
- Multiple helper functions
- Memoization and optimization logic
- Minimal nesting (max depth 2)
- Complexity: **5/10**
- **Notes**: Well-structured despite length, clear separation of concerns

#### 2. **`components/common/SimpleTable.tsx`** (108 lines)
- Table rendering with loading states
- Styled components at bottom
- Clear structure: types → component → styles
- Complexity: **3/10**
- **Notes**: Length mostly from styled components, logic is simple

#### 3. **`components/Campaigns/Campaign.tsx`** (134 lines)
- Multiple sub-components
- Data transformation logic
- Some nested conditions
- Complexity: **5/10**
- **Notes**: Could be split into smaller components but manageable

#### 4. **`components/Campaigns/index.tsx`** (71 lines)
- Table setup and pagination
- Multiple hooks orchestration
- Data transformation for display
- Complexity: **4/10**
- **Notes**: Good orchestration pattern, clear flow

#### 5. **`lib/store/slices/recentCampaigns.ts`** (28 lines)
- Zustand store slice
- List manipulation logic
- LocalStorage side effects
- Complexity: **4/10**
- **Notes**: Side effect mixing increases complexity slightly

#### 6. **`lib/graphql/apollo/ApolloWrapper.tsx`** (45 lines)
- Apollo Client setup
- Recursive type cleaning function
- Uses `any` types for flexibility
- Complexity: **5/10**
- **Notes**: `cleanTypename` function has hidden complexity

### Complex Areas (Needs Attention)

These areas have **higher complexity and could benefit from refactoring**:

#### 1. **⚠️ `lib/hooks/useTableControls/index.tsx`** (189 lines)

**Complexity: 7/10**

**Issues:**
- File explicitly disables complexity linting: `/* eslint-disable complexity */`
- Multiple responsibilities bundled together:
  - Delete confirmation dialog
  - Selection state management
  - Expansion state management
  - Button rendering logic
  - Empty state rendering
  - Internationalization formatting
- Approaches 200-line file limit

**Strengths:**
- Well-organized internal structure
- Clear helper hook (`useDeleteDialog`)
- Good JSDoc on types
- Comprehensive feature set

**Recommendation:**
- Extract `useDeleteDialog` to separate file
- Split into focused hooks:
  - `useTableSelection.ts` - selection state
  - `useTableExpansion.ts` - expansion state
  - `useTableControls.tsx` - UI orchestration
- Keep under 150 lines per file

#### 2. **⚠️ `components/EventsList/EventsListRow/helpers.ts`** (117 lines)

**Complexity: 6/10**

**Issues:**
- `getBadgeStatus` function disables complexity rule: `/* eslint-disable complexity */`
- Complex validation logic with deeply nested conditions
- Multiple fields to validate simultaneously
- Not immediately clear what "badge status" means

**Code snippet:**
```typescript
export const getBadgeStatus = ({ event, point, city, state, timezone }: MarketRes): MarketStatus => {
  const { ticketer, venue, date, presaleDateTime, link, ids: eventIds } = event;
  const { latitude, longitude } = point || {};

  if (
    !(venue && venue.name && latitude && longitude && date && presaleDateTime && city && state && timezone && ticketer)
  ) {
    return MarketStatus.INCOMPLETE_ERROR;
  }
  if (!link || (ticketer === 'TM' && !eventIds.length)) {
    return MarketStatus.INCOMPLETE_WARNING;
  }
  return MarketStatus.COMPLETE;
};
```

**Recommendation:**
- Extract validation rules to separate functions:
  - `hasRequiredVenueInfo()`
  - `hasRequiredEventInfo()`
  - `hasValidTicketerInfo()`
- Use validation result objects instead of nested if statements
- Rename to `validateMarketCompleteness()` for clarity

#### 3. **⚠️ `components/EventForm/useEventForm.ts`** (163 lines)

**Complexity: 6/10**

**Issues:**
- Large form management hook
- Multiple field dependencies
- Transformation logic mixed with state management

**Recommendation:**
- Extract field groups to separate hooks:
  - `useVenueFields()`
  - `usePromoterFields()`
  - `usePresaleFields()`
- Keep `useEventForm` as orchestrator

#### 4. **⚠️ `components/common/Combobox.tsx`** (181 lines)

**Complexity: 7/10**

**Issues:**
- Generic combobox with many features
- Multiple interaction patterns
- Search, selection, and display logic combined

**Recommendation:**
- Extract search logic to hook
- Separate display/rendering concerns
- Consider if simpler components could cover 80% of use cases

#### 5. **⚠️ `components/EventsList/EventsListRow/helpers.spec.ts`** (238 lines)

**Complexity: N/A (Test file)**

**Notes:**
- Test file, high line count expected
- Comprehensive test coverage is good
- Consider if tests could be more concise

### Zustand Special Case

**`lib/store/createSelector.ts`** (26 lines)

**Complexity: 5/10**

**Special Notes:**
- Code imported from Zustand documentation
- Multiple ESLint disables for legitimate reasons:
  - `@typescript-eslint/no-explicit-any`
  - `no-restricted-syntax`
  - `fp/no-loops`
  - `fp/no-mutation`
- External code pattern, complexity accepted
- Well-documented source in comments

## Complexity Patterns

### What Makes Code Simple Here

1. **Functional programming**: No loops, no mutations, pure functions
2. **Single responsibility**: Each hook/component does one thing
3. **Shallow nesting**: Max depth 2 enforced by ESLint
4. **Small functions**: Most functions under 20 lines
5. **Intention-revealing names**: Names explain purpose clearly
6. **Early returns**: Avoid deep nesting with guard clauses
7. **Composition**: Build complex behavior from simple pieces

### What Increases Complexity

1. **Multiple responsibilities**: When one function does too many things
2. **UI + logic mixing**: When rendering and business logic aren't separated
3. **Deep destructuring**: Nested object access patterns
4. **Type complexity**: Generic types with multiple constraints
5. **Side effects**: localStorage, API calls mixed with logic
6. **Conditional rendering**: Multiple branches in JSX

## ESLint Complexity Enforcement

The codebase uses **strict ESLint rules** to prevent complexity:

| Rule | Limit | Purpose |
|------|-------|---------|
| complexity | 6 | Cyclomatic complexity (branches/paths) |
| max-lines | 200 | File length |
| max-depth | 2 | Nesting depth |
| fp/no-loops | - | No for/while loops |
| no-nested-ternary | - | No nested ternaries |

**Files with explicit complexity disables:**
1. `lib/hooks/useTableControls/index.tsx` - Line 1
2. `components/EventsList/EventsListRow/helpers.ts` - Line 72
3. `lib/store/createSelector.ts` - Lines 6-9 (external code)

## Recommendations

### High Priority

1. **Refactor `useTableControls`**
   - Split into 3-4 focused hooks
   - Extract `useDeleteDialog` to separate file
   - Target: Each file under 100 lines

2. **Simplify `getBadgeStatus`**
   - Extract validation predicates
   - Use validation object pattern
   - Remove complexity disable

3. **Split `useEventForm`**
   - Group related fields into sub-hooks
   - Keep orchestration separate from field logic

### Medium Priority

4. **Review `Combobox.tsx`**
   - Consider simpler alternatives for common cases
   - Extract search logic

5. **Address side effects in store slices**
   - Separate localStorage persistence from state updates
   - Use Zustand middleware or effects

### Low Priority (Acceptable As-Is)

6. **Test files with high line counts**
   - Comprehensive coverage is valuable
   - Consider test organization if they grow beyond 300 lines

7. **Styled component files over 100 lines**
   - Acceptable if logic remains simple
   - Style definitions don't add cognitive complexity

## Complexity Trends

### Positive Trends

- **New hooks are small**: Recent additions follow 20-30 line pattern
- **Functional style enforced**: No violations of FP rules in new code
- **Consistent patterns**: New code follows established patterns

### Areas to Watch

- **Table-related code**: Tends toward higher complexity
- **Form management**: Multiple field interactions increase complexity
- **GraphQL integration**: Type transformations can get complex

## Testing Complexity

Most test files are appropriately sized:
- `lib/index.spec.ts` - 8 lines (simple example test)
- Test complexity generally matches source complexity
- Good use of `describe` blocks for organization

## Overall Assessment

**Complexity Rating: 2.5/10 (Excellent)**

This codebase demonstrates **excellent complexity management**:

- 90%+ of files under 100 lines
- Clear functional programming patterns
- Strong linting enforcement prevents complexity creep
- Most functions are simple and focused
- Only 3-4 files exceed complexity thresholds
- Those complex files are well-documented and have clear reasons

The enforced limits (complexity: 6, max-lines: 200, max-depth: 2) are **working effectively** to maintain code quality.
