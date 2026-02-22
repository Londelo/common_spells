# Coding Conventions - campaign-service

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `campaignId`, `managerCtx` |
| Functions | camelCase | `findById`, `formatCampaign`, `saveCampaign` |
| Factory Functions | PascalCase | `FindEventIdsFromPresaleWindow`, `KoaCtxToManagerCtx` |
| Constants | SCREAMING_SNAKE | `LOG_PATH`, `SITE_DOMAIN_KEY` |
| Files | camelCase | `campaigns.js`, `formatters.js`, `selectors.js` |
| Test Files | camelCase + .spec | `normalizers.spec.js` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single (JSX: double) |
| Semicolons | Required |
| Trailing commas | Never (comma-dangle: never) |
| Line length | 120 characters |
| Brace style | Stroustrup (else on new line) |
| Arrow parens | As needed |
| Space before function paren | Never |
| Object curly spacing | Always (`{ key: value }`) |
| Padded blocks | Never |

## ESLint Rules (Key Enforced Rules)

| Rule | Setting | Impact |
|------|---------|--------|
| **Functional Programming** | | |
| fp/no-class | error | No ES6 classes allowed |
| fp/no-let | error | Must use `const` only |
| fp/no-loops | error | No for/while loops (use Ramda) |
| fp/no-mutation | error | No object/array mutation |
| fp/no-mutating-methods | error | No `.push()`, `.splice()`, etc. |
| **Complexity Limits** | | |
| complexity | error (max: 7) | Cyclomatic complexity ≤ 7 |
| max-lines | error (max: 200) | Files ≤ 200 lines |
| max-depth | error (max: 2) | Nesting depth ≤ 2 |
| max-len | error (max: 120) | Line length ≤ 120 chars |
| **Code Quality** | | |
| no-console | error | Must use `Log()` instead |
| no-var | error | Use const/let only |
| prefer-const | error | Immutable by default |
| no-param-reassign | error | Don't mutate params |
| eqeqeq | error | Strict equality only |
| consistent-return | error | All branches must return |
| no-else-return | error | Return early pattern |
| no-nested-ternary | error | Simple ternaries only |

## Import Organization

Standard pattern across files:
1. External packages (npm)
2. Internal packages (@verifiedfan/*)
3. Project libraries (../../../lib/*)
4. Manager modules (./[module])
5. Named exports at top, default export at bottom

Example:
```javascript
import * as R from 'ramda';
import { pagingUtils } from '@verifiedfan/lib';
import config from '../../../lib/config';
import Log from '../../../lib/Log';
import * as errors from './errors';
import formatCampaign from './format';
import { selectStatus } from './selectors';
```

## File Structure

### Manager Files
Standard structure for manager modules:
- `index.js` - Main exported functions
- `format.js` - Response formatting
- `selectors.js` - Data extraction (Ramda paths)
- `validators.js` - Business rule validation
- `errors.js` - Error definitions
- `normalizers.js` - Data normalization
- `enums.js` - Constants

### Code Organization Within Files
1. Imports (grouped as above)
2. Constants/configuration
3. Private helper functions (lowercase)
4. Public factory functions (PascalCase)
5. Exported functions (camelCase)
6. Default export (if applicable)

## Function Naming Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| `find*` | Read operations | `findById`, `findByDomain` |
| `select*` | Extract values from objects | `selectCampaignId`, `selectStatus` |
| `format*` | Transform for response | `formatCampaign`, `formatGeoJson` |
| `throwIf*` | Validation that throws | `throwIfInvalidPermissions` |
| `normalize*` | Data normalization | `normalizeIdentifier` |
| `make*` | Build objects/queries | `makeOpenQuery`, `makeTemplate` |
| `*Lens` | Ramda lenses | `campaignIdLens` |

## Comment Style

- Minimal comments; code is self-documenting via descriptive names
- JSDoc used sparingly, mainly for complex utility functions
- Comments explain WHY, not WHAT
- Example: `// eslint-disable-line id-length` for MongoDB write concern

## Consistency Assessment

**Overall: STRONG** - The codebase demonstrates excellent consistency:

✅ **Strengths:**
- Strict ESLint enforcement ensures uniformity
- Functional programming patterns applied consistently
- File organization follows predictable structure
- Naming conventions rigorously followed
- Import organization standardized

⚠️ **Minor Inconsistencies:**
- Some files exceed 200 lines (e.g., `campaigns.js` at 313 lines) with `eslint-disable max-lines`
- `errors.js` files often exceed limits due to error definitions
- Factory functions sometimes PascalCase, sometimes camelCase

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | Strong | Extensive code reuse via Ramda utilities, shared selector/formatter modules, centralized error definitions |
| **KISS** | Moderate | Functions average ~25 lines and stay focused, but some complex areas in validators/normalizers |
| **YAGNI** | Strong | No speculative code; all features serve current requirements; no unused abstractions |
| **Single Responsibility** | Strong | Each file/function has single clear purpose (selectors extract, formatters transform, validators check) |
| **Open/Closed** | Weak | Direct modification common; few extension points; tightly coupled to MongoDB/Koa |
| **Liskov Substitution** | N/A | No class inheritance (classes forbidden by ESLint) |
| **Interface Segregation** | Moderate | Manager functions accept focused parameter objects, but some "god objects" (managerCtx) |
| **Dependency Inversion** | Weak | Dependencies on concrete implementations (MongoDB, Koa); no abstraction layers |
| **Functional Composition** | Strong | Heavy use of `R.pipe`, `R.pipeP`, function composition for data transformations |
| **Immutability** | Strong | Enforced by ESLint; all data transformations return new objects; no mutation allowed |

### Principle Examples

#### DRY (Strong)
**Evidence:**
- `app/managers/campaigns/selectors.js` - Reusable path selectors used across 10+ files
- `lib/Log.js` - Centralized logging configuration shared by all modules
- `app/managers/campaigns/errors.js` - Single source of truth for error definitions
- Ramda utilities (`R.map`, `R.pipe`, `R.path`) eliminate repetitive iteration code

**Example:**
```javascript
// app/managers/markets/selectors.js - Reused throughout markets module
export const selectId = R.path(['market', 'id']);
export const selectMarketName = R.path(['market', 'name']);
export const selectEventTicketer = R.path(['market', 'event', 'ticketer']);
```

#### KISS (Moderate)
**Strong Areas:**
- `app/managers/campaigns/saveCampaign.js:16-38` - Clear 3-step process (fetch, upsert, cache)
- `app/managers/markets/selectors.js` - Simple, focused selector functions
- `app/router/campaigns.js` - Straightforward route handlers, single responsibility

**Complex Areas:**
- ⚠️ `app/datastore/campaigns.js:41-74` - Complex refresh logic with multiple date field manipulations
- ⚠️ `app/managers/campaigns/validators/throwIfInvalidRegistrationCampaign.js` - 156 lines of nested validation
- ⚠️ `app/managers/campaigns/format.js:29-46` - Multi-level filtering logic across locales/preferences

#### YAGNI (Strong)
**Evidence:**
- No unused utility functions found
- No speculative abstractions or frameworks
- Features directly map to API requirements
- Commented-out code is minimal (e.g., `/*authUserId,*/` at line 40 in saveCampaign.js)

#### Single Responsibility (Strong)
**Evidence:**
- `app/managers/campaigns/format.js` - Only formatting logic
- `app/managers/campaigns/selectors.js` - Only data extraction
- `app/managers/campaigns/validators/` - Each validator file handles one validation concern
- `app/datastore/campaigns.js` - Only MongoDB operations

**Example:**
```javascript
// Each selector does ONE thing
export const selectId = R.path(['market', 'id']);
export const selectMarketName = R.path(['market', 'name']);
export const selectCity = R.path(['market', 'city']);
```

#### Functional Composition (Strong)
**Evidence:**
- Heavy use of `R.pipe` and `R.pipeP` for async composition
- Point-free style throughout
- Function composition over imperative logic

**Example:**
```javascript
// app/managers/campaigns/index.js:42-46
const FindEventIdsFromPresaleWindow = managerCtx => R.pipeP(
  managerCtx.datastore.campaigns.findCampaignIdsByPresaleWindowDates,
  R.map(({ _id }) => _id.toString()),
  campaignIds => managerCtx.datastore.markets.findEventIdsByCampaignIds({ campaignIds })
);
```

#### Immutability (Strong)
**Evidence:**
- ESLint `fp/no-let` and `fp/no-mutation` strictly enforced
- All array operations use Ramda (`.map()` instead of loops)
- Object spreading for updates
- No in-place modifications

**Example:**
```javascript
// app/managers/campaigns/format.js:72-85
const formatCampaign = ({ campaign, locale = null, showAllLocales = false }) => {
  const normalizedCampaign = normalizeIdentifier(campaign);

  const formatted = {
    ...normalizedCampaign,  // Spread, not mutate
    score: {},
    ...makeTemplate(normalizedCampaign),
    ...formatStatus(normalizedCampaign)
  };

  return normalizers.stringifyObjectId(
    filterByLocale({ campaign: formatted, locale, showAllLocales })
  );
};
```

#### Interface Segregation (Moderate)
**Good:**
- Manager functions accept focused parameter objects
- Route handlers extract only needed params

**Needs Improvement:**
- `managerCtx` is a "god object" containing datastore, service, correlation, jwt
- Could be split into focused contexts

**Example:**
```javascript
// app/managers/campaigns/index.js:60-63
// ✅ Focused parameters
export const findById = async(managerCtx, { campaignId, authUserActions, locale, showAllLocales }) => {
  const campaign = await throwIfCampaignInaccessible(managerCtx, { campaignId, authUserActions });
  return formatCampaign({ campaign, locale, showAllLocales });
};
```

#### Dependency Inversion (Weak)
**Evidence:**
- Direct MongoDB queries in datastore layer
- Koa context passed directly to managers
- No abstraction over external services
- Hard-coded dependencies on `@verifiedfan/*` packages

**Example:**
```javascript
// app/datastore/campaigns.js - Direct MongoDB dependency
const cursor = await DataStore.find(query, { _id: 1, domain: 1, status: 1 });
```

## Code Readability

**Overall Rating:** Good

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function/variable names clearly express intent and domain concepts |
| Narrative Flow | Good | Most files read top-to-bottom; some complex validators jump abstraction levels |
| Abstraction Consistency | Good | Ramda composition keeps functions at similar abstraction levels |
| Self-Documentation | Excellent | Minimal comments needed; code structure and names tell the story |

### Highly Readable Examples

#### 1. **`app/managers/campaigns/saveCampaign.js:16-38`** - Perfect narrative flow
**Why it's readable:**
- Function name `saveCampaign` tells complete story
- Steps read like prose: fetch original → upsert → delete cache → update linked → cache
- Each helper function name reveals its purpose
- Error handling is explicit and meaningful

```javascript
const saveCampaign = async(managerCtx, { campaign, campaignId = null }) => {
  try {
    const original = campaignId ? await managerCtx.datastore.campaigns.findById(campaignId) : null;
    const upserted = await managerCtx.datastore.campaigns.upsertCampaign({ campaign, campaignId });

    if (!upserted) {
      return Promise.reject(error(errors.campaignUpsertFailed));
    }

    await deleteCachedCampaign(managerCtx, { campaign: original });
    await updateLinkedCampaign(managerCtx, { original, upserted });
    await cacheCampaign(managerCtx, { originalCampaign: original, campaign: upserted });

    return normalizers.stringifyObjectId(upserted);
  }
  catch (err) {
    log.error('campaign upsert failed', { message: err.message, stack: err.stack });
    throw error(errors.campaignUpsertFailed);
  }
};
```

#### 2. **`app/managers/markets/selectors.js`** - Intention-revealing names
**Why it's readable:**
- Each selector name describes exactly what data it extracts
- Consistent naming pattern (`select*`, `*Lens`)
- Ramda `R.path()` makes data navigation explicit
- No comments needed to understand purpose

```javascript
export const selectId = R.path(['market', 'id']);
export const selectMarketName = R.path(['market', 'name']);
export const selectEventTicketer = R.path(['market', 'event', 'ticketer']);
export const selectCity = R.path(['market', 'city']);
export const selectState = R.path(['market', 'state']);
```

#### 3. **`app/router/campaigns.js:119-126`** - Clean separation of concerns
**Why it's readable:**
- Route handler extracts parameters with descriptive selectors
- Single line calls manager with clear intent
- No business logic in router layer
- Data flow is obvious: extract params → build context → call manager

```javascript
router.get('/:campaignId', ctx => {
  const campaignId = selectCampaignId(ctx);
  const locale = selectLocale(ctx);
  const showAllLocales = selectShowAllLocales(ctx);
  const authUserActions = selectCampaignActions({ ctx, campaignId });
  const managerCtx = koaCtxToManagerCtx({ ctx });
  return campaignManager.findById(managerCtx, { campaignId, authUserActions, locale, showAllLocales });
});
```

#### 4. **`app/managers/campaigns/index.js:42-46`** - Functional composition clarity
**Why it's readable:**
- Factory function name describes its purpose
- `R.pipeP` makes async data flow explicit
- Each step is self-explanatory
- Point-free style removes noise

```javascript
const FindEventIdsFromPresaleWindow = managerCtx => R.pipeP(
  managerCtx.datastore.campaigns.findCampaignIdsByPresaleWindowDates,
  R.map(({ _id }) => _id.toString()),
  campaignIds => managerCtx.datastore.markets.findEventIdsByCampaignIds({ campaignIds })
);
```

### Needs Improvement

#### 1. **⚠️ `app/datastore/campaigns.js:41-74`** - Complex abstraction mixing
**Issues:**
- `refresh` function mixes high-level orchestration with low-level date field mapping
- Variable names like `dateStatusKeys` don't reveal intent
- Nested object property paths are hard to follow
- MongoDB query construction mixed with logging

**Suggestion:**
- Extract `makeDateFieldKeys()` helper
- Extract `buildRefreshQuery()` helper
- Separate logging concerns

#### 2. **⚠️ `app/managers/campaigns/format.js:29-46`** - Abstraction inconsistency
**Issues:**
- `filterByLocale` function handles both content filtering AND preference transformation
- Nested destructuring with spreading makes data flow unclear
- Mixing locale resolution with data filtering

**Suggestion:**
- Split into `filterContentByLocale()` and `filterPreferencesByLocale()`
- Extract locale resolution to separate function
- Simplify destructuring patterns

#### 3. **⚠️ `app/managers/campaigns/errors.js`** - Verbose error definitions
**Issues:**
- 281 lines of repetitive error object definitions
- Each error follows identical structure but no abstraction
- Factory functions for dynamic errors mixed with static definitions

**Suggestion:**
- Create error factory function to reduce repetition
- Group related errors
- Extract error creation pattern
