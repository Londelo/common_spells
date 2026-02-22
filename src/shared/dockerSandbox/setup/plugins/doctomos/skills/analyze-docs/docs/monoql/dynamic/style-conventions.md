# Coding Conventions - monoql

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `campaignId`, `dataLoaders`, `tmToken` |
| Functions | camelCase | `authenticate`, `normalizeCampaignInput`, `selectUserAgent` |
| Constants | SCREAMING_SNAKE_CASE | `CAMPAIGN_TYPE`, `DEFAULT_CAMPAIGN_TYPE`, `TM_COOKIES`, `VERSION_HEADER` |
| Files | camelCase | `ResolveCorsOrigin.js`, `DataLoaders/index.js` |
| Import aliases | PascalCase for factories | `ResolveCors` (factory function), `Debug` (module) |
| Exported selectors | camelCase with prefix | `selectGraphql`, `putJWT`, `selectAppContext` |

**Notable Pattern**: Functional selector/action naming with clear prefixes:
- `select*` - retrieves data
- `put*` - sets/mutates data
- `make*` - creates new values
- `normalize*` - transforms data format

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single (except JSX attributes use double) |
| Semicolons | Required |
| Trailing commas | Never (explicit no-comma-dangle) |
| Max line length | 120 characters |
| Max file length | 200 lines (enforced) |
| Brace style | Stroustrup (else/catch on new line) |
| Object spacing | Always spaces in braces `{ foo }` |
| Arrow params | As-needed (omit for single param) |

## ESLint Rules (Key Enforcements)

| Rule | Setting | Impact |
|------|---------|--------|
| **Functional Programming** | | |
| fp/no-let | error | No `let` - use `const` only |
| fp/no-loops | error | No for/while loops - use map/reduce |
| fp/no-mutation | error | Immutable by default (ctx exceptions) |
| fp/no-mutating-methods | error | No array.push/sort (Ramda allowed) |
| fp/no-class | error | No ES6 classes |
| **Complexity** | | |
| complexity | error (7) | Max cyclomatic complexity = 7 |
| max-depth | error (3) | Max nesting depth = 3 |
| max-len | error (120) | Max line length = 120 chars |
| max-lines | error (200) | Max file length = 200 lines |
| **Code Quality** | | |
| no-console | error | No console.log (use Debug module) |
| no-else-return | error | Eliminate unnecessary else |
| no-nested-ternary | error | No nested ternaries |
| prefer-const | error | Const over let |
| prefer-arrow-callback | error | Arrow functions preferred |
| prefer-template | error | Template literals over concatenation |
| id-length | error (min 2) | Variable names ≥ 2 chars |

## Import Organization

**Pattern**: Organized in logical groups, separated by blank lines

1. **External dependencies** (npm packages)
2. **Internal lib/shared code** (from `../lib/`)
3. **Local modules** (relative imports)
4. **Named destructured imports** grouped by source

**Example**:
```javascript
import Debug from 'debug';
import * as R from 'ramda';
import DataLoader from 'dataloader';

import config from '../../../lib/config';
import { error } from '@verifiedfan/lib';

import { selectAuthTmSig } from '../../../context/selectors/jwt';
import authenticate from './Viewer/authenticate';
```

## File Structure

**Index files** act as aggregators/exports:
- Merge/compose multiple modules
- Re-export grouped functionality
- Minimal logic - mostly imports and composition

**Implementation files**:
1. Imports (organized as above)
2. Constants/configuration
3. Helper functions (private)
4. Main exports (public API)
5. Default export at end

**Common pattern**:
```javascript
// Imports
import { dependencies } from 'packages';

// Constants
const CONFIG = { ... };

// Helpers
const helperFn = () => { ... };

// Public API
export const publicFn = () => { ... };

// Default export
export default mainExport;
```

## Comment Style

**Minimal comments** - code is self-documenting through:
- Descriptive function names
- Clear variable names
- Functional composition (Ramda pipes)

**When comments appear**:
- JSDoc for complex functions (rare)
- Inline `// eslint-disable-line` for intentional rule violations
- TODO comments: `// TODO fix the api on existing entry`
- Business context: `// backwards compatibility; when admin-ui using localized...`

**Debug statements** preferred over comments:
```javascript
debug('fetched campaigns %O normalized %O', campaigns, normalized);
```

## Consistency Assessment

**Highly Consistent** ✓

The codebase demonstrates exceptional consistency:
- **ESLint enforcement** is strict - rules are followed uniformly
- **Functional patterns** (Ramda) used consistently across all files
- **Naming conventions** strictly adhered to
- **Import organization** follows same pattern everywhere
- **File size limits** enforced - no files exceed 200 lines significantly

**Minor Deviations**:
- Some test files exempt from complexity rules
- `ctx.appContext` mutations allowed (Koa context pattern)
- Ramda mutations explicitly allowed via ESLint config
- ESLint disable comments used sparingly for valid reasons (e.g., single-char query params like `q`)

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **Functional Programming** | **Strong** | Entire codebase built on FP principles - no classes, no mutations, no loops |
| DRY | Strong | Extensive use of utilities (`lib/` directory), DataLoaders pattern, selector reuse |
| KISS | Strong | Functions avg 15-20 lines, clear single-purpose functions |
| YAGNI | Moderate | Some abstraction layers (ResolveCorsOrigin factory) may be pre-emptive |
| Single Responsibility | Strong | Each resolver/client handles one domain, files stay under 200 lines |
| Open/Closed | Moderate | Factory pattern used (campaigns, entries clients), but limited extension points |
| Interface Segregation | Strong | Small, focused modules - no god objects |
| Dependency Inversion | Weak | Direct dependencies on concrete implementations (DataLoader, specific clients) |
| Composition over Inheritance | **Strong** | No classes exist - pure function composition via Ramda pipes |
| Immutability | **Strong** | Enforced via ESLint fp/* rules, only ctx mutations allowed |
| AHA | Moderate | Balanced abstraction - normalizers show delayed abstraction pattern |

### Functional Programming (Strong) ★★★★★

**Core FP paradigm** - This is a functional-first codebase:

**Evidence from ESLint config**:
```yaml
fp/no-let: error
fp/no-loops: error
fp/no-mutation: error
fp/no-mutating-methods: error
fp/no-class: error
```

**Examples**:

1. **`app/DataLoaders/index.js:6-7`** - Composition via Ramda
```javascript
const pseudoBatch = apiFn => R.pipe(R.map(apiFn), promises => Promise.all(promises));
const makeDataLoader = R.pipe(pseudoBatch, fn => new DataLoader(fn));
```

2. **`lib/clients/users/Selectors.js:3-10`** - Pure function pipelines
```javascript
export const selectPhoneNumbers = R.pipe(
  R.path(['phone', 'list']),
  R.defaultTo([]),
  R.map(R.applySpec({
    account: R.prop('account'),
    is_confirmed: R.pipe(R.path(['date', 'confirmed']), R.isNil, R.not)
  }))
);
```

3. **No classes anywhere** - All logic in pure functions

### DRY (Strong)

**Shared utilities** heavily utilized:

1. **`app/graphql/schema/resolvers/util.js`** - Reusable transformations:
   - `normalizeLocale` - locale format conversion
   - `base64Encode/Decode` - crypto utilities
   - `convertObjectKeysToArrayIds` - data structure transforms

2. **DataLoaders pattern** (`app/DataLoaders/index.js:15-44`) - Single data fetching abstraction for all GraphQL resolvers

3. **Client factories** - Campaigns, entries, users all follow same pattern:
```javascript
const campaigns = ({ request }) => ({
  byDomain: ({ jwt, domain, ...}) => request({ ...baseParams, endpoint: '/campaigns' }),
  byCampaignId: ({ jwt, campaignId, ...}) => request({ ...baseParams, endpoint: `/campaigns/${campaignId}` })
});
```

### KISS (Strong)

**Simple, focused functions**:

1. **`app/responses/error.js:1-10`** - 10 lines, single purpose
```javascript
const error = (ctx, status, message, rest = {}) => {
  ctx.status = status;
  ctx.body = { status, message, ...rest };
};
```

2. **`app/context/selectors/appContext.js:1`** - 1 line selector
```javascript
export const selectAppContext = ctx => ctx.appContext = ctx.appContext || {};
```

3. **Average function length**: 15-20 lines
4. **Complexity limit**: 7 (enforced by ESLint)

### Single Responsibility (Strong)

**Clear domain separation**:

1. **Resolvers by domain**: `Campaign/`, `Entry/`, `Viewer/`, `Wave/` - each handles one GraphQL type
2. **Clients by service**: `clients/campaigns/`, `clients/entries/`, `clients/users/`
3. **Middleware separation**: `jwt.js`, `cors/`, `sessions.js` - single concerns
4. **200-line file limit** enforces small, focused modules

### YAGNI (Moderate)

**Some speculative abstraction**:

⚠️ **`lib/ResolveCorsOrigin.js`** - Factory pattern for CORS that may be over-engineered for single use
⚠️ **`lib/InstrumentedAsyncOperation.js`** - Complex async operation wrapper used sparingly

✓ **Mostly focused**: Most code directly solves current needs (campaigns, entries, GraphQL API)

### Composition over Inheritance (Strong) ★★★★★

**No classes exist** - Pure function composition:

1. **Ramda pipes** for data transformation
2. **Factory functions** for service clients
3. **Higher-order functions** for middleware
4. **DataLoader composition** for data fetching

**Example** - `app/graphql/schema/resolvers/index.js:20-40`:
```javascript
const resolvers = [
  Campaign, Markets, Codes, /* ... */
].reduce((acc, curr) => mergeDeepRight(acc, curr), {});
```

### Immutability (Strong) ★★★★★

**Strictly enforced**:

```yaml
fp/no-mutation:
  - error
  - allowThis: true
    commonjs: true
    exceptions:
      - object: ctx  # for koa context
      - object: context
```

**Only Koa context** allowed to mutate (framework requirement)

**Examples**:
- `app/index.js:40-41` - Explicit disable for Koa: `// eslint-disable-line fp/no-mutation`
- All data transforms use Ramda's immutable operations

## Code Readability

**Overall Rating:** Excellent ★★★★★

This is exceptionally readable code due to FP patterns, strict conventions, and careful naming.

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent ★★★★★ | Function names clearly express intent (`normalizeCampaignOutput`, `selectPhoneNumbers`) |
| Narrative Flow | Good ★★★★☆ | Files read top-to-bottom, though Ramda pipes require FP familiarity |
| Abstraction Consistency | Excellent ★★★★★ | Each function stays at one level, utilities cleanly separated |
| Self-Documentation | Excellent ★★★★★ | Code explains itself via composition, minimal comments needed |

### Highly Readable Examples

#### 1. **`app/responses/error.js:1-10`** - Crystal clear intent
```javascript
const error = (ctx, status, message, rest = {}) => {
  ctx.status = status;
  ctx.body = { status, message, ...rest };
};
```
**Why it's readable**: Function name + params tell complete story, no surprises

#### 2. **`app/graphql/schema/resolvers/Entry/index.js:14-20`** - Self-documenting selector
```javascript
const selectEntryContext = R.applySpec({
  user_agent: selectUserAgent,
  ip: selectIp,
  ip_country: selectCountry,
  forwarded_for: selectXForwardedFor,
  session_id: selectNuDetectSessionId
});
```
**Why it's readable**: Declarative structure shows exactly what data is selected

#### 3. **`lib/clients/campaigns/index.js:9-22`** - Clear API pattern
```javascript
const campaigns = ({ request }) => ({
  byDomain: ({ jwt, domain, locale, showAllLocales, password }) => request({
    ...baseParams,
    method: 'GET',
    endpoint: '/campaigns',
    accessPath: '/campaigns',
    qs: { domain, locale, showAllLocales, password },
    jwt
  }),
  // ...more methods
});
```
**Why it's readable**: Consistent pattern repeated, all params visible, clear structure

### Areas Requiring FP Knowledge

#### ⚠️ **Ramda pipes need functional programming familiarity**

**`lib/clients/users/Selectors.js:3-10`**:
```javascript
export const selectPhoneNumbers = R.pipe(
  R.path(['phone', 'list']),
  R.defaultTo([]),
  R.map(R.applySpec({
    account: R.prop('account'),
    is_confirmed: R.pipe(R.path(['date', 'confirmed']), R.isNil, R.not)
  }))
);
```
**Challenge**: Requires understanding of:
- `R.pipe` execution order
- `R.applySpec` for object building
- Point-free style
- Nested pipes

**Mitigation**: Once familiar with Ramda, this pattern is extremely clear and reusable

#### ⚠️ **`app/graphql/schema/resolvers/Campaign/util.js:40-47`** - Dense transformation
```javascript
export const normalizeLocalizedInput = R.pipe(
  ({ localized = [], ...rest } = {}) => ({
    ...rest,
    ...localizedArrayToKeyedLocales(localized)
  }),
  localesKeyToDash
);
```
**Challenge**: Multiple transformations composed, requires tracing data flow

**Strength**: Once understood, this is safer than imperative alternatives (no mutations)

### Self-Documentation Through Naming

**Selector prefixes** make intent obvious:
- `selectUserAgent` - retrieves user agent
- `putJWT` - stores JWT
- `makeDataLoader` - creates data loader
- `normalizeCampaignInput` - transforms campaign data

**Function names tell complete story**:
- `convertObjectKeysToArrayIds` - exactly what it does
- `throwIfTokenMismatch` - clear side effect (throws)
- `ListObjectsData` - capital L indicates factory/constructor pattern

### Complexity Management

**200-line file limit** keeps modules digestible:
- Longest file: `app/graphql/schema/resolvers/Campaign/util.js` (137 lines)
- Most files: 50-100 lines
- Forces logical decomposition

**Max nesting depth = 3** prevents arrow code:
- Enforced by ESLint
- Encourages early returns
- Promotes extraction to named functions

## Special Patterns

### Debug Module Usage

**Consistent debugging pattern** instead of console.log:

```javascript
import Debug from 'debug';
const debug = Debug('titan:graphql:resolvers:campaign');

debug('fetched campaigns %O normalized %O', campaigns, normalized);
```

**Benefits**:
- Namespaced logging (`titan:graphql:resolvers:*`)
- Can be enabled/disabled per namespace
- Production-safe (disabled by default)

### Koa Context Mutations (Intentional Exceptions)

**Framework requirement** - Koa context must be mutated:

```javascript
// app/index.js:40-41
// eslint-disable-next-line fp/no-mutation
app.proxy = true;

// app/context/selectors/appContext.js:1
export const selectAppContext = ctx => ctx.appContext = ctx.appContext || {};
```

**Pattern**: Isolated to context accessors, documented with disable comments

### DataLoaders Pattern

**Single abstraction** for all GraphQL data fetching:

```javascript
// app/DataLoaders/index.js
const DataLoaders = ctx => {
  const { users, campaigns, entries, exports, uploads } = ctx.service;

  const dataLoaders = R.map(makeDataLoader, {
    me: () => users.me({ jwt: ctx.jwt }),
    campaignsById: campaigns.byCampaignId,
    entries: campaignId => entries.getMine({ jwt: ctx.jwt, campaignId })
  });

  return dataLoaders;
};
```

**Benefits**:
- Batching built-in
- Caching per-request
- Consistent API for all resolvers
