# Code Complexity - admin-ui

## Metrics

| Metric | Value |
|--------|-------|
| Total source files | 417 JavaScript files |
| Total lines of code | ~16,700 lines |
| Non-empty lines | ~14,650 lines |
| Avg function length | ~20-25 lines |
| Max nesting depth | 3-4 levels |
| Avg file size | ~40 lines |
| Median file size | ~30 lines |
| Largest files | 400+ lines (ReactTable component) |
| Typical component | 50-150 lines |

## Complexity Observations

### Architecture Overview

The codebase follows a **Redux + Redux Saga** architecture:

- **Actions**: Pure action creators and constants
- **Reducers**: State management via Immutable.js
- **Sagas**: Side effect orchestration (API calls, routing, etc.)
- **Selectors**: Derived state and memoization
- **Components**: React presentation layer
- **GraphQL**: Apollo Client for API communication

### Simple Areas

**1. Configuration and Constants** (Excellent)
- `frontend/src/config/index.js` - 14 lines, dead simple
- `frontend/src/shared/enums.js` - Clear constant definitions
- Action type constants - straightforward string definitions

**2. Utility Functions** (Good)
- `frontend/src/shared/Pipe.js` - 8 lines, elegant functional composition
- `frontend/src/shared/formatError.js` - 33 lines, clear error handling
- `frontend/src/shared/utils/campaignOptionsUtils.js` - Simple configuration objects

**3. Server Middleware** (Good)
- `server/src/middlewares/auth.js` - 19 lines, clear authentication logic
- `server/src/router/index.js` - 27 lines, straightforward routing
- Express/Koa middleware follows standard patterns

**4. Action Creators** (Excellent)
- Factory pattern eliminates boilerplate
- Each action creator is 1 line due to abstraction
- Clear, predictable structure

**5. Simple Selectors** (Good)
- Many selectors are 1-3 lines using `createSelector`
- Clear data derivation without side effects

### Moderately Complex Areas

**1. Redux Sagas** (Moderate Complexity)

**Characteristics:**
- Average saga: 30-50 lines
- Generator functions with yield statements
- Error handling with try/catch/finally
- State selection and action dispatching

**Example complexity patterns:**
- `frontend/src/sagas/uploadFile.js` - 106 lines
  - Orchestrates 3 different upload types
  - Proper error boundaries
  - Loading state management
  - Form reset after upload

**Complexity factors:**
- Generator function syntax (yields)
- Redux saga effects (put, select, call, takeLatest)
- Asynchronous control flow
- Multiple levels of abstraction

**Mitigation:**
- Well-structured with configuration objects
- Clear separation of concerns
- Consistent patterns across sagas

**2. Redux Reducer** (Moderate Complexity)

**File:** `frontend/src/reducers/index.js` (170 lines)

**Complexity factors:**
- Handles 40+ action types in single reducer
- Object-based dispatch pattern: `{[ACTION_TYPE]: handler}[type]()`
- Immutable.js operations (`setIn`, `getIn`)
- Ramda pipe compositions for complex state updates

**Example:**
```javascript
const reducer = (state, { type, payload, error }) => ({
  [LOADING]: () => setLoadingMessage(setLoading(state, ...)),
  [SET_ALERT]: () => setAlert(state, payload),
  // ... 40+ more cases
}[type] || noop)() || state;
```

**Why it works:**
- Consistent pattern throughout
- Each handler delegated to selector function
- Avoids deep nesting

**3. State Selectors with Ramda** (Moderate)

**Complexity factors:**
- Functional composition with Ramda (`R.pipe`, `R.propOr`, `R.reduce`)
- Immutable.js access patterns
- Memoization with `createSelector`

**Example:** `frontend/src/selectors/campaignMetrics.js`
- Uses higher-order functions
- Factory patterns for selector generation
- Requires functional programming understanding

**4. GraphQL Client Setup** (Moderate)

**File:** `lib/graphql/index.js` (50 lines)

**Complexity factors:**
- Apollo Client configuration
- Fragment matching
- Custom data ID generation
- Data normalization pipeline

### Complex Areas

**1. ReactTable Component** (High Complexity)

**File:** `frontend/src/components/shared/ReactTable/index.js` (424 lines)

**Complexity factors:**
- Large file size
- Multiple responsibilities (sorting, pagination, filtering, rendering)
- Complex state management
- Nested component structure
- Many props and configuration options

**Recommendation:** Consider breaking into smaller components

**2. Localization Utilities** (Moderate-High)

**File:** `frontend/src/shared/utils/localizationUtils.js` (369 lines)

**Complexity factors:**
- Multiple locale handling
- String interpolation
- Nested object traversal
- Many edge cases

**3. Saga Orchestration** (Moderate-High)

**File:** `frontend/src/sagas/campaignMarkets.js` (195 lines)

**Complexity factors:**
- Complex workflow: save campaign → navigate → reload
- Multiple saga compositions
- State coordination across actions
- Error recovery logic

**4. Campaign Content Selectors** (High Complexity)

**File:** `frontend/src/selectors/campaignContent.spec.js` (233 lines of tests)

**Complexity factors:**
- Deep object transformations
- Multiple content versions (V1, V2)
- Localization handling
- Complex data structures

### Nesting Depth Analysis

**Maximum observed nesting:** 3-4 levels

**Common patterns:**

1. **Saga error handling** (3 levels):
```javascript
function* saga() {
  try {
    if (condition) {
      yield doSomething();
    }
  } catch (error) {
    yield handleError();
  }
}
```

2. **Reducer object dispatch** (2 levels):
```javascript
const reducer = (state, action) => ({
  [TYPE]: () => {
    if (condition) { return newState; }
    return state;
  }
}[action.type] || noop)();
```

3. **Component render methods** (3-4 levels):
```javascript
return (
  <Container>
    {items.map(item => (
      <Item key={item.id}>
        {item.active && <Badge />}
      </Item>
    ))}
  </Container>
);
```

**Deeply nested conditionals:** Rare; ESLint prevents excessive nesting

### Function Length Distribution

**Breakdown:**
- **1-10 lines**: 40% (utilities, simple selectors, action creators)
- **11-30 lines**: 35% (typical business logic, middleware, components)
- **31-60 lines**: 20% (complex sagas, form handlers)
- **61-100 lines**: 4% (orchestration sagas, complex components)
- **100+ lines**: 1% (ReactTable, localization utils)

**Outliers:**
- `ReactTable/index.js`: 424 lines
- `localizationUtils.js`: 369 lines
- `graphql/index.js` (combined operations): 268 lines

### Cyclomatic Complexity

**Estimated by file type:**

- **Action creators**: 1 (no branching)
- **Simple utilities**: 1-2
- **Middleware**: 2-4
- **Sagas**: 3-6 (try/catch adds branches)
- **Reducers**: 1 per handler, but 40+ handlers
- **Components**: 3-8 (conditional rendering)
- **ReactTable**: 15+ (many conditionals)

### Code Organization Quality

**Strengths:**
- Clear separation of concerns (Redux pattern)
- Consistent file structure
- Predictable naming conventions
- Utility functions well abstracted
- No "God objects" or monolithic files (except ReactTable)

**Weaknesses:**
- Single large reducer handles all actions (could be split by domain)
- Some utility files growing large (localization)
- ReactTable needs refactoring

## Complexity by Technology

### Redux Saga Complexity

**Inherent complexity:**
- Generator function syntax
- Effect creators (put, call, select)
- Asynchronous orchestration
- Error boundaries

**Mitigation in codebase:**
- Consistent patterns (takeLatest, try/catch/finally)
- Clear naming conventions
- Configuration-driven logic (uploadMapping)
- Well-structured workflows

**Learning curve:** Medium-High for developers unfamiliar with generators

### Immutable.js Complexity

**Inherent complexity:**
- Different API from native JavaScript
- getIn/setIn path-based access
- toJS() conversions
- fromJS() wrapper

**Impact:**
- Adds cognitive overhead
- Requires understanding of immutable data structures
- Performance benefits for large state trees

**Mitigation:**
- Selectors abstract complexity
- Consistent patterns in reducers
- Clear state shape

### Ramda Complexity

**Usage patterns:**
- Pipe compositions
- Point-free style
- Functional utilities (propOr, reduce, converge)

**Impact:**
- Requires functional programming knowledge
- Can reduce readability for imperative programmers
- Powerful for data transformations

**Prevalence:** Moderate; used heavily in selectors and utilities

## Recommendations

### High Priority

**1. Refactor ReactTable Component**
- **Current:** 424 lines, multiple responsibilities
- **Recommendation:** Extract into smaller components:
  - `TableHeader` - sorting, column configuration
  - `TableBody` - row rendering
  - `TablePagination` - pagination controls
  - `TableFilters` - filtering logic
- **Benefit:** Improved maintainability, testability, reusability

**2. Split Main Reducer**
- **Current:** Single reducer with 40+ action handlers
- **Recommendation:** Use `combineReducers` with domain-specific slices:
  - `campaignReducer` - campaign CRUD
  - `uiReducer` - loading, alerts, editor state
  - `uploadsReducer` - file uploads (blacklist, scored, fanlist)
  - `metricsReducer` - entries and scoring metrics
- **Benefit:** Better organization, easier to reason about, potential performance improvements

### Medium Priority

**3. Extract Complex Saga Logic**
- **Files:** `campaignMarkets.js`, `sagaRouter.js`
- **Recommendation:** Break into smaller, composable sagas
- **Benefit:** Easier testing, clearer workflows

**4. Add JSDoc Comments to Complex Functions**
- **Target:** Selectors with Ramda, complex sagas
- **Recommendation:** Document parameters, return types, and purpose
- **Benefit:** Improved onboarding, better IDE support

**5. Consider Reducer State Shape**
- **Current:** Deep nesting (e.g., `['main', 'campaign', 'metrics', 'scoring']`)
- **Recommendation:** Flatten where possible
- **Benefit:** Simpler selectors, better performance

### Low Priority

**6. Consolidate GraphQL Operations**
- **Current:** Scattered across multiple files
- **Recommendation:** Central GraphQL operations module with clear organization
- **Benefit:** Single source of truth, easier schema evolution

**7. Standardize Error Handling**
- **Current:** Mix of patterns across sagas
- **Recommendation:** Consistent error handling utility
- **Benefit:** Predictable error states, better UX

**8. Extract Localization Logic**
- **Current:** 369-line utility file
- **Recommendation:** Consider i18n library or break into smaller modules
- **Benefit:** Standard tooling, community support, reduced maintenance

## Complexity Trends

### Positive Trends

✅ **Consistent patterns** - Redux, sagas, components follow predictable structures
✅ **Functional composition** - Utilities leverage composition over inheritance
✅ **Abstraction** - Boilerplate reduced through factories and utilities
✅ **Type safety** - PropTypes used (though not TypeScript)
✅ **Separation of concerns** - Clear boundaries between layers

### Areas to Watch

⚠️ **Reducer growth** - Adding actions increases main reducer size
⚠️ **Saga complexity** - Complex workflows can become hard to test
⚠️ **Immutable.js learning curve** - New developers need ramp-up time
⚠️ **ReactTable** - Already complex; avoid adding more features

## Overall Assessment

**Complexity Level: Moderate**

The codebase demonstrates mature engineering practices with reasonable complexity for a production application. The Redux + Redux Saga architecture introduces inherent complexity, but it's well-managed through consistent patterns and clear organization.

**Key Strengths:**
- Clear separation of concerns
- Consistent coding standards
- Good abstraction where it matters
- Minimal technical debt

**Key Challenges:**
- Learning curve for Redux Saga + Immutable.js
- A few files need refactoring (ReactTable, main reducer)
- Functional programming style may challenge imperative programmers

**Maintainability: Good**
The codebase is maintainable by developers familiar with the React/Redux ecosystem. New features can be added following established patterns. Onboarding requires understanding of Redux Saga and Immutable.js.
