# Coding Conventions - admin-ui

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `campaignId`, `userInfo` |
| Functions | camelCase | `loadCampaignsList`, `uploadFile` |
| Constants | SCREAMING_SNAKE_CASE | `INIT_APP`, `UPLOAD_BLACKLIST` |
| React Components | PascalCase | `NavBar`, `Sidebar` |
| Files (Components) | PascalCase | `NavBar/index.js` |
| Files (Utilities) | camelCase | `dateTimeUtils.js`, `campaignOptionsUtils.js` |
| Action Types | SCREAMING_SNAKE_CASE | `LOAD_CAMPAIGN_SUCCESS` |
| GraphQL Operations | camelCase | `uploadBlacklist`, `loadCampaignsList` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single quotes (JavaScript), Double quotes (JSX) |
| Semicolons | Required (always) |
| Trailing commas | Never |
| Line length | 120 characters |
| Arrow parens | As needed |
| Arrow body style | As needed |
| Object curly spacing | Always (e.g., `{ foo: bar }`) |
| Brace style | 1TBS (one true brace style) |

## ESLint Rules (Key Enforcements)

| Rule | Setting | Reference |
|------|---------|-----------|
| no-var | error | ES6: Use `const` or `let` |
| prefer-const | error | Immutability preference |
| no-console | warn | Use Debug library instead |
| eqeqeq | error | Strict equality (`===`) required |
| arrow-spacing | error | Consistent arrow function spacing |
| comma-dangle | error (never) | No trailing commas |
| curly | error | Always use braces for conditionals |
| no-nested-ternary | error | Avoid nested ternaries |
| no-plusplus | error | Avoid `++`/`--` operators |
| no-param-reassign | error | Immutable parameters |
| prefer-template | error | Use template literals |
| prefer-arrow-callback | error | Arrow functions for callbacks |
| prefer-rest-params | error | Use rest params over `arguments` |
| prefer-spread | error | Use spread over `.apply()` |
| object-shorthand | error | Object method/property shorthand |
| dot-notation | error | Use dot notation when possible |
| id-length | error (min: 2) | Descriptive identifiers |
| no-restricted-syntax | error | No `for`, `while`, `switch`, `do-while` loops |
| no-duplicate-imports | error | Single import per module |
| no-shadow | error | No variable shadowing |
| space-before-function-paren | error (never) | No space before function parens |

## Import Organization

Imports follow a clear grouping pattern:

1. **External libraries** (React, Redux, third-party)
2. **Internal modules** (actions, selectors, utilities)
3. **Local components** (relative imports)

Example:
```javascript
import { takeLatest, put, call } from 'redux-saga/effects';
import { delay } from 'redux-saga';
import { LOAD_CAMPAIGNS_LIST } from 'actions/types';
import { loadCampaignsList } from 'actions';
import { getCampaignsListQuery } from 'selectors';
import { campaignsList } from 'graphql';
```

## File Structure

### Component Structure
```
ComponentName/
  index.js         # Container/export file
  ComponentName.js # Component logic
  styled.js        # Styled components
  utils.js         # Component utilities (if needed)
```

### Typical File Organization
1. Imports (grouped as above)
2. Constants/configuration
3. Helper functions (small utilities)
4. Main function/component
5. Exports

Example:
```javascript
// Imports
import Debug from 'debug';
import { put, select, takeLatest } from 'redux-saga/effects';

// Constants
const debug = Debug('titan:dashboard:fe:sagas:uploadFile');

// Helper functions
const uploadMapping = { ... };

// Main logic
export function* uploadFile({ payload, uploadType }) { ... }

// Exports
export default uploadFileSagas;
```

## Comment Style

- **Debug statements**: Uses `Debug` library extensively throughout (not console.log)
- **Inline comments**: Minimal; code is self-documenting
- **JSDoc**: Not consistently used
- **TODO/FIXME**: Not observed
- **Deprecated markers**: Used (e.g., `// FAQ to be removed`)

## Consistency Assessment

**Overall: Good**

The codebase demonstrates strong adherence to ESLint rules with consistent patterns:

- ✅ **Naming conventions** are uniformly applied across the codebase
- ✅ **Formatting rules** are consistently enforced by ESLint
- ✅ **Import organization** follows a predictable pattern
- ✅ **File structure** is consistent, especially for React components
- ⚠️ **Comments** are sparse; relies heavily on descriptive names
- ✅ **ES6+ features** are used throughout (arrow functions, destructuring, spread)

**Deviations observed:**
- Occasional `console.log` statements in reducers (with eslint-disable comments)
- Some deprecated code still present with comments

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | Strong | Extensive use of utility functions, shared helpers (`Pipe.js`, `omitDeep.js`, `dateTimeUtils.js`), and abstracted GraphQL operations |
| **KISS** | Moderate | Functions average 20-30 lines, but some complex areas with Redux saga orchestration and state management |
| **YAGNI** | Strong | No speculative code observed; focused on current requirements. Deprecated code marked for removal |
| **Single Responsibility** | Strong | Clear separation: sagas for side effects, reducers for state, selectors for derived state, components for UI |
| **Open/Closed** | Weak | Limited extension points; direct modification common (action creator pattern doesn't enable extension) |
| **Liskov Substitution** | Not Applicable | Minimal use of inheritance; functional/compositional approach |
| **Interface Segregation** | Moderate | Focused action creators and selectors, but large reducer handles many action types |
| **Dependency Inversion** | Moderate | Components depend on Redux abstractions (connect, selectors), but some concrete dependencies |
| **WET** | Weak | Minimal duplication; abstractions used effectively (e.g., `createAction` factory) |
| **AHA** | Strong | Abstractions appear after patterns emerge (e.g., `uploadFile` saga handles three upload types after pattern recognition) |

### DRY (Strong)

**Evidence:**
- `frontend/src/shared/Pipe.js` - Functional composition utility used across multiple files
- `frontend/src/shared/omitDeep.js` - Deep object manipulation shared in GraphQL and components
- `frontend/src/actions/index.js:61-67` - `createAction` factory eliminates duplication for 50+ action creators
- `frontend/src/sagas/uploadFile.js:21-43` - `uploadMapping` configuration object DRYs upload logic
- `frontend/src/shared/utils/dateTimeUtils.js` - Date formatting shared across 15+ components

**Counter-examples:**
- Action type constants defined separately from action creators (could be co-located)

### KISS (Moderate)

**Evidence:**
- `frontend/src/config/index.js` - Simple configuration object (14 lines)
- `frontend/src/shared/Pipe.js` - Simple 3-line pipe implementation
- `frontend/src/server/src/middlewares/auth.js` - Clear 19-line auth middleware

**Complex areas:**
- `frontend/src/reducers/index.js:80-162` - 80+ line reducer with object dispatch pattern
- `frontend/src/sagas/loadCampaignsList.js` - Complex saga with debouncing, selectors, error handling
- Redux saga orchestration involves multiple levels of indirection

### YAGNI (Strong)

**Evidence:**
- No unused utilities or speculative abstractions observed
- Configuration is minimal (`config/index.js` only has used properties)
- Deprecated FAQ code explicitly marked: `// FAQ to be removed`
- No "just in case" functionality

### Single Responsibility (Strong)

**Evidence:**
- `frontend/src/sagas/` - Each saga file handles one concern (e.g., `uploadFile.js` only uploads)
- `frontend/src/actions/types.js` - Pure constant definitions
- `frontend/src/actions/index.js` - Pure action creators
- `frontend/src/reducers/index.js` - State updates only
- `frontend/src/selectors/` - Data derivation only
- Clear separation between presentation (components) and logic (sagas/reducers)

### Open/Closed (Weak)

**Evidence:**
- Adding new action types requires modifying multiple files (types.js, actions/index.js, reducer, saga)
- No plugin architecture or extension points
- `uploadFile.js:21-43` - Upload types hardcoded in mapping object (requires modification to extend)

### Interface Segregation (Moderate)

**Evidence:**
- Action creators are focused (each does one thing)
- ⚠️ `frontend/src/reducers/index.js` - Single reducer handles 40+ action types (large interface)
- Selectors are focused and composable
- Components receive specific props via `mapStateToProps`

### Dependency Inversion (Moderate)

**Evidence:**
- Components depend on Redux abstractions (`connect`, `bindActionCreators`)
- Sagas depend on Redux saga abstractions (`put`, `select`, `call`)
- ⚠️ Direct imports of GraphQL operations in sagas (concrete dependency)
- ⚠️ Direct imports of action types throughout

### AHA (Strong)

**Evidence:**
- `frontend/src/sagas/uploadFile.js:21-43` - Abstraction created after three similar upload functions emerged
- `frontend/src/actions/index.js:61-67` - `createAction` factory created after pattern of success/error actions repeated
- Ramda's `pipe` used directly initially, then custom `Pipe.js` created when different behavior needed
- Code shows evolution from concrete to abstract

## Code Readability

**Overall Rating:** Good

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function and variable names clearly express intent and domain concepts |
| Narrative Flow | Good | Most files read logically top-to-bottom, though saga orchestration can be complex |
| Abstraction Consistency | Good | Clear separation of concerns; each file stays at consistent abstraction level |
| Self-Documentation | Excellent | Minimal comments needed; code explains itself through naming and structure |

### Highly Readable Examples

**1. `frontend/src/sagas/initApp.js:12-17` - Clear intention-revealing names**
```javascript
const initViewer = function* ({ viewer, identity }) {
  if (viewer.isLoggedIn) {
    return viewer;
  }
  return yield signInUpViewer(identity);
};
```
- Function name `initViewer` tells complete story
- Logic is self-explanatory: check if logged in, sign in if not

**2. `frontend/src/shared/utils/dateTimeUtils.js:22-28` - Excellent function composition**
```javascript
const DateStringToIso = endOfDay => Pipe(
  setToMomentObj,
  mmt => (endOfDay ? mmt.endOf('day') : mmt).toISOString()
);

export const simpleToTimezonedIso = ({ date, timezone, dateFormat = DATE_TIME_FORMAT, endOfDay }) =>
  date && DateStringToIso(endOfDay)({ date, timezone, dateFormat });
```
- Clear transformation pipeline
- Descriptive function names explain what happens at each step

**3. `frontend/src/actions/index.js:61-67` - Perfect abstraction**
```javascript
const createAction = type => Object.assign(
  payload => ({ type, payload }),
  {
    success: payload => ({ type: `${type}_SUCCESS`, payload }),
    error: payload => ({ type: `${type}_ERROR`, payload, error: true })
  }
);
```
- Intent obvious from name and structure
- No comments needed

**4. `frontend/src/sagas/uploadFile.js:45-73` - Good narrative flow**
```javascript
export function* uploadFile({ payload, uploadType }) {
  yield put(loading());
  const { loadingMessage, gqlUpload, uploadAction, alertMessage, formName } = uploadMapping[uploadType];
  try {
    debug('payload %O', payload);
    yield put(loading({ message: loadingMessage }));
    const file = payload.get('file');
    const fileSize = file.size;
    const campaignId = yield select(getCampaignId);
    const campaignName = yield select(getCampaignName);
    const result = yield gqlUpload({ file, fileSize, campaignId, campaignName });
    yield put(uploadAction.success({ result, campaignId }));
    yield put(setAlert({ success: true, message: alertMessage }));
    yield put(reset(formName));
    debug('result %O', result);
  } catch (error) {
    yield put(uploadAction.error({ FORM_NAME: formName, error }));
  } finally {
    yield put(loading({ toggle: false }));
  }
}
```
- Reads like a story: show loading → upload → show success → reset form → stop loading
- Clear error handling
- Each step is obvious

### Needs Improvement

**1. ⚠️ `frontend/src/reducers/index.js:80-162` - Large object dispatch pattern**
```javascript
const reducer = (state, { type, payload, error }) => ({
  [LOADING]: () => setLoadingMessage(setLoading(state, (payload || {}).toggle), (payload || {}).message),
  [SET_ALERT]: () => setAlert(state, payload),
  [INIT_APP_SUCCESS]: () => setUserInfo(state, payload),
  // ... 40+ more action types
}[type] || noop)() || state;
```
- Hard to scan visually (80+ lines of object literal)
- Pattern is clever but reduces readability
- **Suggestion:** Consider switch statement or separate reducer composition for better clarity

**2. ⚠️ `frontend/src/sagas/loadCampaignsList.js:17-46` - Multiple abstraction levels**
```javascript
export function* load({ payload = {} }) {
  const prevQuery = yield select(getCampaignsListQuery);
  const {
    skip, limit = LIMIT,
    type = yield select(getCampaignsListType),
    version = yield select(getCampaignsListVersion),
    sort = yield select(getCampaignsListSort),
    query = prevQuery
  } = payload;

  try {
    if (query !== prevQuery) {
      yield call(delay, DEBOUNCE_DELAY);
    }

    const request = yield campaignsList({ limit, skip, sort, query, type, version });
    const { viewer: { campaigns: { list: campaignsListArray } } } = request;

    yield put(loadCampaignsList.success({
      items: campaignsListArray,
      skip, sort, query, type, version
    }));
  } catch (error) {
    yield put(loadCampaignsList.error(error));
  }
}
```
- Mixes parameter extraction, debouncing logic, API call, and response handling
- Deep destructuring of response reduces clarity
- **Suggestion:** Extract helper functions for parameter resolution and response parsing

**3. ⚠️ Variable naming: single letters**
```javascript
// From reducers/index.js:80
const reducer = (state, { type, payload, error }) => ({ ... }[type] || noop)() || state;
```
- While this is a standard Redux pattern, the multiple fallback operators (`||`) reduce clarity
- **Suggestion:** Add intermediate variable to clarify intent
