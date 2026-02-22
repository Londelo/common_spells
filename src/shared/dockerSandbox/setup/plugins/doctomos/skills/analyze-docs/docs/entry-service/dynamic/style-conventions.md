# Coding Conventions - entry-service

## Project Overview
- **Language**: JavaScript (ES6+)
- **Framework**: Koa.js (REST API service)
- **Style**: Functional Programming with Ramda
- **Total Source Files**: 203
- **Average File Size**: ~58 lines

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `managerCtx`, `campaignId` |
| Functions | camelCase | `findByCampaignAndUser`, `validatePreferences` |
| Exported Functions | camelCase | `upsert`, `saveEntries` |
| Higher-Order Functions | PascalCase | `ValidateLinkableAttribute`, `NormalizePresale` |
| Files | camelCase | `forUser.js`, `listByCampaign.js` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_LIST_LIMIT`, `LOG_TAG` |
| Enum Objects | SCREAMING_SNAKE_CASE keys | `EMAIL: 'email'`, `PHONE: 'phone'` |
| Minimum Identifier Length | 2 characters | `id` ✓, `i` ✗ |

**Special Patterns:**
- Selector functions prefix with `select`: `selectAuthUserId`, `selectCampaignId`
- Boolean checks prefix with `has`: `has_facebook`, `has_twitter`
- Validators prefix with `validate` or `throwIf`: `validateFields`, `throwIfIneligible`
- Factory functions prefix with `make`: `makeNew`, `makeUserLink`

## Formatting Rules

| Rule | Setting | Notes |
|------|---------|-------|
| Indentation | 2 spaces | Enforced by ESLint |
| Quotes | Single `'` | Double for JSX attributes |
| Semicolons | Required | Always |
| Trailing commas | Never | `comma-dangle: never` |
| Line length | 120 characters | `max-len: 120` |
| Max file lines | 200 lines | `max-lines: 200` (disabled for some files) |
| Brace style | Stroustrup | `else` on new line |
| Arrow parens | As needed | `x => x` not `(x) => x` |
| Arrow body style | As needed | Implicit return when possible |
| Object spacing | Spaced | `{ foo: 'bar' }` |
| Multiple empty lines | Max 1 | `max: 1` |
| Trailing spaces | Not allowed | |
| End of line | Required | Always end with newline |

## ESLint Rules (Key Enforcements)

### Functional Programming (eslint-plugin-fp)
| Rule | Impact |
|------|--------|
| `fp/no-class` | **Classes prohibited** - pure functions only |
| `fp/no-let` | **`let` prohibited** - use `const` only |
| `fp/no-loops` | **Loops prohibited** - use `.map`, `.reduce`, `.filter` |
| `fp/no-mutation` | **Mutations restricted** - exceptions for `ctx`, `context` |
| `fp/no-mutating-assign` | No `Object.assign` mutations |
| `fp/no-mutating-methods` | No array mutations (except Ramda `R.*`) |
| `fp/no-delete` | No `delete` operator |
| `fp/no-get-set` | No getters/setters |
| `fp/no-arguments` | No `arguments` object |

### Code Quality
| Rule | Enforcement |
|------|------------|
| `complexity` | **Max 7** - cyclomatic complexity limit |
| `max-depth` | **Max 2** - nesting depth limit |
| `max-lines` | **200 lines** per file (some exceptions) |
| `prefer-const` | Required for non-reassigned variables |
| `no-var` | `var` prohibited, use `const` |
| `no-console` | Error - use logging library |
| `eqeqeq` | Strict equality `===` required |
| `consistent-return` | All paths must return consistently |
| `no-else-return` | Early returns preferred |
| `no-shadow` | No variable shadowing |
| `no-param-reassign` | No parameter mutations (props allowed) |
| `no-plusplus` | No `++`/`--` operators |
| `no-nested-ternary` | No nested ternaries |
| `no-unreachable` | Dead code prohibited |

### Restricted Syntax
**Prohibited constructs:**
- `for`, `for...in`, `for...of`, `while`, `do...while` loops
- `switch` statements
- `delete` operator
- `with` statement

**Reason**: Enforces functional programming style using array methods and Ramda functions.

## Import Organization

**Standard Pattern:**
```javascript
// 1. External libraries (Ramda first if used)
import * as R from 'ramda';
import { error, pagingUtils, enums } from '@verifiedfan/lib';

// 2. Internal utilities/configs
import Log from '../../../lib/Log';
import config from '../../lib/config';

// 3. Local modules (same directory or subdirectories)
import normalize from './normalizers/forUser';
import upsert from './upsert';

// 4. Error definitions
import { notLoggedIn, supremeUserRequired } from '../../errors/auth';
```

**Import Styles:**
- Ramda: `import * as R from 'ramda'` (namespace import)
- Destructuring for specific exports: `import { error } from '@verifiedfan/lib'`
- Default exports: `import normalize from './normalizers/forUser'`
- No duplicate imports enforced

## File Structure

**Typical Function Module:**
```javascript
// 1. Imports
import * as R from 'ramda';
import { error } from '@verifiedfan/lib';
import Log from '../../../lib/Log';

// 2. Constants and configuration
const log = Log('module:path');
const MAX_LIMIT = 100;

// 3. Helper functions (private)
const helperFunction = ({ param }) => {
  // implementation
};

// 4. Main exported function(s)
const mainFunction = async(managerCtx, { param1, param2 }) => {
  // implementation
};

// 5. Export statement
export default mainFunction;
```

**Router/Index Files:**
- Export multiple related functions
- Group logical operations together
- Use destructuring for exports: `export { fn1, fn2, fn3 }`

**Enum Files:**
- Simple object with string constants
- Export default object

## Comment Style

**Function Documentation:**
```javascript
/**
 * Brief description of what function does
 * @param managerCtx
 * @param campaignId
 * @param userId
 * @param data
 * @returns {Promise.<EntryObject>}
 */
```

**Inline Comments:**
- Explain WHY, not WHAT
- Rare - code should be self-documenting
- Used for temporary fixes: `// temp twitter handle fix`
- Used for TODO items: `// TODO: cache result for 60 seconds`

**ESLint Directives:**
```javascript
/* eslint-disable max-lines */ // For exceptions to file size
/* eslint-disable-next-line max-len */ // For specific line exceptions
```

## Consistency Assessment

**Highly Consistent:**
- ✅ Functional programming style - 100% compliance
- ✅ No classes used anywhere in codebase
- ✅ Ramda used extensively for data transformations
- ✅ `const` only - no `let` or `var`
- ✅ Naming conventions followed uniformly
- ✅ Arrow functions preferred over `function` keyword
- ✅ Single/double quote usage consistent

**Areas with Exceptions:**
- ⚠️ Some files exceed 200 line limit (disabled with eslint directive)
  - `app/router/index.js`: 382 lines
  - `app/datastore/scoring/index.js`: 355 lines
  - `app/datastore/entries/index.js`: 295 lines
- ⚠️ Context object mutations allowed for Koa: `ctx`, `context`

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | Strong | Extensive use of shared utilities, selectors, normalizers across modules |
| **KISS** | Strong | Functions avg ~20-30 lines, max complexity 7, max nesting 2 |
| **YAGNI** | Strong | No speculative code, focused domain logic |
| **Single Responsibility** | Strong | Each module has focused purpose (validators/, normalizers/, managers/) |
| **Open/Closed** | Moderate | Plugin pattern via validator/normalizer maps, but limited extension points |
| **Liskov Substitution** | N/A | No inheritance (no classes) |
| **Interface Segregation** | Strong | Focused function signatures, destructured parameters |
| **Dependency Inversion** | Weak | Direct dependencies on datastores/services, passed via context |
| **Functional Programming** | Excellent | Pure functions, immutability, composition, higher-order functions |
| **WET** | Not Observed | Minimal duplication found |
| **AHA** | Moderate | Some abstractions delayed, but many utility functions exist |

### Detailed Evidence

#### DRY (Strong)
**Shared Selectors:** `app/services/campaigns/selectors.js` provides 30+ reusable selector functions:
```javascript
export const selectShareDomain = R.path(['campaign', 'domain', 'share']);
export const selectPreferencesSpec = R.path(['campaign', 'preferences']);
export const selectStatus = R.path(['campaign', 'status']);
```
Used across 15+ files to extract campaign data consistently.

**Shared Normalizers:** `app/managers/entries/normalizers/` directory:
- `forUser.js`: Normalizes entry data for user responses
- `forList.js`: Normalizes entry data for admin lists
- Reused throughout entry management logic

**Shared Validators:** `app/managers/entries/validators/` directory:
- Modular validation functions
- Composable validation logic
- Reused in create and update flows

**Datastore Abstraction:** `app/datastore/` provides single point of database access:
- `entries/index.js`: All entry database operations
- `scoring/index.js`: All scoring database operations
- Prevents duplicate query logic

#### KISS (Strong)
**Function Length Analysis:**
- Average: 20-30 lines per function
- Enforced max complexity: 7 (cyclomatic)
- Enforced max nesting: 2 levels
- Single purpose per function

**Examples:**
```javascript
// app/managers/entries/listByCampaign.js:17-24 (8 lines)
const validateFilter = ({ filterType }) => {
  const type = filterType && filterType.toUpperCase();
  if (type && !entryFilterTypes[type]) {
    throw error(InvalidFilterType({ type, validTypes }));
  }
  debug('valid filter type %s', type);
  return type;
};
```

```javascript
// app/managers/entries/makeNew.js:15-24 (10 lines)
const makeDateObj = ({ fields, has_facebook, has_twitter, phoneConfirmedDate: phoneConfirmed }) => {
  const now = new Date();
  return {
    created: now,
    updated: now,
    ...(phoneConfirmed && { phoneConfirmed }),
    ...(fields[params.ALLOW_MARKETING] && { marketing: now }),
    ...(has_facebook && { facebook: now }),
    ...(has_twitter && { twitter: now })
  };
};
```

#### YAGNI (Strong)
- No unused features detected
- No speculative abstractions
- Direct, focused implementations
- Domain-driven functionality only
- No generic frameworks built

#### Single Responsibility (Strong)
**Directory Organization:**
```
app/managers/entries/
  ├── validators/          # All validation logic
  ├── normalizers/         # All data transformation
  ├── saveEntries/         # Batch save operations
  ├── confirmPhone/        # Phone confirmation logic
  └── enums/              # Constant definitions
```

**Each Module Has One Job:**
- `upsert.js`: Create or update entries only
- `listByCampaign.js`: List entries with filters only
- `assignCodes.js`: Assign presale codes only
- `transferEntries.js`: Transfer entries between markets only

#### Functional Programming (Excellent)
**Pure Functions with Ramda:**
```javascript
// app/managers/entries/normalizers/forUser.js:9
const retractNudetectScore = entry => R.dissoc('nudetect', entry);

// app/managers/entries/normalizers/forUser.js:55-62
const normalize = R.pipe(
  R.prop('entry'),
  R.tap(entry => debug('entry to normalize %O', entry)),
  flattenCompoundId,
  retractNudetectScore,
  overwritePresaleCodes,
  backfillPresaleCode
);
```

**Immutability:**
```javascript
// app/managers/entries/makeNew.js:52-64
return {
  _id: make_id({ campaignId, userId: user.id }),
  date: makeDateObj({ fields, has_facebook, has_twitter, phoneConfirmedDate }),
  fields,
  code,
  referrer,
  has_twitter,
  has_facebook,
  ...(link && { link }),
  origin: makeOrigin({ ip, os, browser, device }),
  locale,
  attributes
};
```

**Higher-Order Functions:**
```javascript
// app/managers/entries/validators/linkableAttributes/ValidateLinkableAttribute.js:19
const ValidateLinkableAttribute = ({ managerCtx, token, campaignId, userId }) => async attribute => {
  // Returns a function that validates attributes
};

// tools/attachCustomScore/mapFunctions.js:32
export const MapMemberIdToScore = entriesUserIdToScore => R.pipe(
  R.toPairs,
  R.reduce(
    (acc, [userId, memberId]) => R.set(R.lensProp(memberId), entriesUserIdToScore[userId], acc),
    {}
  )
);
```

**Composition:**
- Extensive use of `R.pipe` for data transformation pipelines
- Small, composable functions
- Point-free style where appropriate

#### Open/Closed (Moderate)
**Extension via Configuration:**
```javascript
// app/managers/entries/validators/preferences/index.js:36-45
const validateOnePreference = async(managerCtx, { jwt, type, preference, inputVal, preferenceId, campaign }) => {
  if (!isValidPreferenceType({ type })) {
    throw error(EntryUnknownField({ field: type }));
  }
  // Type-based dispatch
  return typeValidationFns[type](managerCtx, { jwt, inputVal, preferenceId, preference, campaign });
};
```

```javascript
// app/managers/entries/validators/linkableAttributes/ValidateLinkableAttribute.js:15-17
const attributeValidators = {
  card: validateCardAttribute
  // Add new validators here
};
```

**Limitation**: Most code requires modification for new features rather than extension.

#### Interface Segregation (Strong)
**Focused Function Parameters:**
```javascript
// Functions take exactly what they need via destructuring
const findByCampaignAndUser = async(managerCtx, { campaignId, userId }) => { }
const listByCampaign = async(managerCtx, { campaignId, isSupremeUser, filterType, market, skip, limit }) => { }
```

**No God Objects**: Each function receives focused context, not entire application state.

#### Dependency Inversion (Weak)
**Direct Dependencies:**
```javascript
// app/managers/entries/index.js:37-47
const { datastore: { entries } } = managerCtx;
const entry = await entries.findByCampaignAndUser({ campaignId, userId });
```

Services/datastores passed via `managerCtx` but are concrete implementations, not abstractions. No interface/protocol definitions.

## Code Readability

**Overall Rating:** Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function names clearly express intent at domain level |
| Narrative Flow | Excellent | Top-down organization, main story first, details below |
| Abstraction Consistency | Excellent | Functions stay at single abstraction level |
| Self-Documentation | Excellent | Code reads like prose, minimal comments needed |

### Highly Readable Examples

#### 1. **Perfect Intention-Revealing Names** - `app/managers/entries/upsert.js:45-51`
```javascript
const makeUserLink = ({ code, campaign }) => {
  const domain = selectShareDomain({ campaign });
  if (domain) {
    return `https://${domain}/${code}`;
  }
  return null;
};
```
**Why Excellent:**
- Function name `makeUserLink` tells complete story
- Parameter names `code`, `campaign` are clear
- Helper `selectShareDomain` reveals intent
- Logic flows naturally without comments

#### 2. **Excellent Narrative Flow** - `app/managers/entries/index.js:37-47`
```javascript
export const findByCampaignAndUser = async(managerCtx, { campaignId, userId }) => {
  if (!userId) {
    throw error(notLoggedIn);
  }

  const { datastore: { entries } } = managerCtx;
  const entry = await entries.findByCampaignAndUser({ campaignId, userId });
  throwIfInvalidEntry({ entry, correlation: managerCtx.correlation });

  return normalize({ entry });
};
```
**Why Excellent:**
- Guard clause first (security check)
- Get dependencies
- Fetch data
- Validate
- Transform and return
- Reads top-to-bottom like a story

#### 3. **Abstraction Consistency** - `app/managers/entries/validators/preferences/index.js:79-111`
```javascript
const validatePreferences = async(managerCtx, { jwt, data, campaign, existingEntry = null }) => {
  const prefSpec = selectPreferencesSpec({ campaign });
  const hasPref = preferenceId => typeof data[preferenceId] !== 'undefined' && !R.isEmpty(data[preferenceId]);

  const missingPreferenceIds = prefSpec
    .filter(({ id, is_optional }) => !hasPref(id) && !is_optional)
    .map(({ id }) => id);

  const hasContactField = !!(prefSpec.filter(({ id, type }) => hasPref(id) && isContactPreferenceType({ type })));

  const validationsByPreferenceId = await prefSpec.reduce(async(validatedMapPromise, preference) => {
    // ... validation logic
  }, Promise.resolve({}));

  if (!existingEntry) {
    throwIfCreateFieldsInvalid({ missingPreferenceIds, hasContactField });
  }
  throwIfDependentFieldsInvalid({
    campaign,
    validatedMap: { ...(existingEntry ? existingEntry.fields : {}), ...validationsByPreferenceId }
  });

  return validationsByPreferenceId;
};
```
**Why Excellent:**
- All operations at same level: defining helpers, checking requirements, validating, returning
- Clear separation: setup → validate → check constraints → return
- Helper function `hasPref` at same abstraction as `missingPreferenceIds`

#### 4. **Self-Documenting Code** - `app/managers/entries/refreshAttribute.js:15-42`
```javascript
const validateAndLinkAttribute = async({ managerCtx, campaignId, userId, token, attribute, existingEntry }) => {
  const { correlation, datastore: { entries } } = managerCtx;

  const validateLinkableAttribute = ValidateLinkableAttribute({ campaignId, userId, token, managerCtx });
  const canAttachAttribute = await validateLinkableAttribute(attribute);
  if (!canAttachAttribute) {
    log.info('cannot link attribute', { campaignId, userId, attribute, correlation });
    return IS_NOT_LINKED;
  }

  try {
    const newAttributes = {
      ...existingEntry.attributes,
      [attribute]: true
    };
    const modifiedEntry = await entries.modifyEntry(existingEntry._id, { attributes: newAttributes });
    if (!modifiedEntry) {
      return IS_NOT_LINKED;
    }
  }
  catch (err) {
    const { message, stack } = err;
    log.error('Failed to update entry', { campaignId, userId, correlation, message, stack });
    return IS_NOT_LINKED;
  }

  return IS_LINKED;
};
```
**Why Excellent:**
- No comments needed
- Variable names explain purpose: `canAttachAttribute`, `newAttributes`, `modifiedEntry`
- Constants `IS_LINKED`, `IS_NOT_LINKED` self-document return values
- Logic flow clear: validate → update → return status

#### 5. **Functional Composition** - `tools/attachCustomScore/mapFunctions.js:7-38`
```javascript
export const toUserIdString = R.pipe(
  selectUserId,
  id => id.toString()
);

const indexByUserId = R.indexBy(toUserIdString);

export const mapUserIdToMemberId = R.pipe(
  indexByUserId,
  R.map(selectMemberId)
);

export const mapUserIdToScore = R.pipe(
  indexByEntryUserId,
  R.map(selectScore)
);

export const MapMemberIdToScore = entriesUserIdToScore => R.pipe(
  R.toPairs,
  R.reduce(
    (acc, [userId, memberId]) => R.set(R.lensProp(memberId), entriesUserIdToScore[userId], acc),
    {}
  )
);
```
**Why Excellent:**
- Small, composable functions
- Each function name describes transformation
- Pipeline style shows data flow
- Point-free style where appropriate

### Summary of Readability Patterns

**Consistent Patterns Make Code Predictable:**
1. **Validation Pattern**: Guard clauses → fetch data → validate → process
2. **Manager Pattern**: `async(managerCtx, { params })` signature
3. **Selector Pattern**: `const selectX = R.path([...])`
4. **Normalizer Pattern**: `R.pipe(fn1, fn2, fn3)`
5. **Error Pattern**: `throw error(errorObject)` with predefined errors

**What Makes This Code Readable:**
- Strict functional programming removes side effects
- Ramda pipelines show transformation steps
- Descriptive names at domain level
- Consistent patterns throughout
- Small, focused functions
- Clear separation of concerns
