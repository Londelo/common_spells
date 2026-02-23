# Code Complexity - entry-service

## Overall Metrics

| Metric | Value | Enforcement |
|--------|-------|-------------|
| **Total source files** | 203 | (excluding node_modules, tests) |
| **Avg function length** | ~20-30 lines | Enforced by complexity rules |
| **Max nesting depth** | 2 levels | ESLint: `max-depth: 2` |
| **Max cyclomatic complexity** | 7 | ESLint: `complexity: 7` |
| **Avg file size** | 58 lines | Calculated from app/ directory |
| **Max file length** | 200 lines | ESLint: `max-lines: 200` (with exceptions) |
| **Largest file** | 382 lines | `app/router/index.js` |

## File Size Distribution

### Largest Files (Exceptions to 200-line rule)

| File | Lines | Reason for Exception |
|------|-------|---------------------|
| `lib/vendor/nudetect-clientlib.min.js` | 9153 | Vendor library (minified) |
| `app/router/index.js` | 382 | Route definitions (largely repetitive) |
| `app/datastore/scoring/index.js` | 355 | Database queries (repetitive patterns) |
| `features/lib/utils/api.js` | 345 | Test utilities |
| `app/datastore/entries/index.js` | 295 | Database queries (repetitive patterns) |
| `app/managers/shares/index.js` | 257 | Manager functions (many similar operations) |

**Note**: These files use `/* eslint-disable max-lines */` directive. Most have repetitive patterns rather than complex logic.

### Typical File Sizes

Most files fall into these categories:
- **Small utilities**: 10-30 lines (selectors, enums, helpers)
- **Standard modules**: 40-80 lines (validators, normalizers, managers)
- **Complex modules**: 100-180 lines (upsert logic, datastore operations)

## Complexity Observations

### Simple Areas (Well-Structured)

#### 1. **Enum Definitions** (Extremely Simple)
```javascript
// app/managers/entries/enums/preferences.js (14 lines)
export default {
  EMAIL: 'email',
  PHONE: 'phone',
  NAME: 'name',
  ZIP: 'zip',
  OPT_IN: 'opt_in',
  MARKET_SELECT: 'market_select',
  // ...
};
```
**Complexity**: Minimal - simple object definitions

#### 2. **Selector Functions** (Simple)
```javascript
// app/services/campaigns/selectors.js
export const selectShareDomain = R.path(['campaign', 'domain', 'share']);
export const selectPreferencesSpec = R.path(['campaign', 'preferences']);
export const selectStatus = R.path(['campaign', 'status']);
```
**Complexity**: Minimal - single Ramda path operations
**Count**: 30+ selector functions, avg 1 line each

#### 3. **Simple Helpers** (Low Complexity)
```javascript
// app/managers/entries/makeNew.js:27-32 (6 lines)
const makeOrigin = ({ ip, os, browser, device }) => ({
  ...(ip && { ip }),
  ...(os && { os }),
  ...(browser && { browser }),
  ...(device && { device })
});
```
**Complexity**: Low - simple object construction with conditionals

#### 4. **Error Definitions** (Simple)
```javascript
// app/errors/entry.js
export const entryNotFound = {
  status: 404,
  message: 'Entry not found for specified user.',
  payload: 'No entry with provided list id and user id.',
  code: codes.ENTRY_NOT_FOUND
};
```
**Complexity**: Minimal - static object definitions

#### 5. **Validation Guards** (Low Complexity)
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
**Complexity**: Low - single conditional, clear logic
**Nesting**: 1 level
**Cyclomatic Complexity**: ~3

#### 6. **Normalizer Pipelines** (Moderate but Clear)
```javascript
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
**Complexity**: Moderate - but highly readable due to functional composition
**Each step**: Simple transformation

### Complex Areas (Higher Cognitive Load)

#### 1. **Entry Upsert Logic** (Highest Business Complexity)
**File**: `app/managers/entries/upsert.js` (178 lines)

**Main Function** (`upsert`):
```javascript
const upsert = async(managerCtx, { campaignId, userId, token, data }) => {
  // 1. Auth check
  if (!userId) { throw error(notLoggedIn); }

  // 2. Fetch campaign
  const campaign = await managerCtx.service.campaigns.getCampaign({ ... });
  throwIfInvalidCampaignStatus({ campaign });

  // 3. Check eligibility
  const eligibility = await registrationEligibility({ ... });
  throwIfIneligible(eligibility);

  // 4. Get user
  const user = await managerCtx.service.users.getUser({ token });

  // 5. Check existing entry
  const existingEntry = await managerCtx.datastore.entries.findByCampaignAndUser({ ... });

  // 6. Validate linked attributes
  const attributes = await getEligibleLinkedAttributes({ ... });

  // 7. Create or update
  if (!existingEntry) {
    return create(managerCtx, { campaign, user, data, token, attributes });
  }
  return update(managerCtx, { campaign, user, data, existingEntry, token, attributes });
};
```

**Complexity Factors:**
- **Multiple async calls**: 5+ database/service calls
- **Decision tree**: Create vs update path
- **Validation layers**: Campaign status, eligibility, attributes
- **Orchestration**: Coordinates multiple subsystems

**Mitigations:**
- Well-named functions hide complexity
- Clear sequential flow (no nesting)
- Delegated to focused `create` and `update` functions
- Each step is clear and at same abstraction level

**Cyclomatic Complexity**: ~4 (within limit of 7)

#### 2. **Preference Validation** (Complex Async Logic)
**File**: `app/managers/entries/validators/preferences/index.js` (114 lines)

**Function**: `validatePreferences`
```javascript
const validatePreferences = async(managerCtx, { jwt, data, campaign, existingEntry = null }) => {
  const prefSpec = selectPreferencesSpec({ campaign });
  const hasPref = preferenceId => typeof data[preferenceId] !== 'undefined' && !R.isEmpty(data[preferenceId]);

  const missingPreferenceIds = prefSpec
    .filter(({ id, is_optional }) => !hasPref(id) && !is_optional)
    .map(({ id }) => id);

  const hasContactField = !!(prefSpec.filter(({ id, type }) => hasPref(id) && isContactPreferenceType({ type })));

  const validationsByPreferenceId = await prefSpec.reduce(async(validatedMapPromise, preference) => {
    const { type, id: preferenceId } = preference;
    if (hasPref(preferenceId)) {
      return {
        ...await validatedMapPromise,
        [preferenceId]: await validateOnePreference(managerCtx, {
          jwt, type, preference, inputVal: data[preferenceId], preferenceId, campaign
        })
      };
    }
    return validatedMapPromise;
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

**Complexity Factors:**
- **Async reduce pattern**: Accumulating async validations
- **Multiple validation types**: Different validators per preference type
- **Conditional checks**: Create vs update, optional vs required
- **Dependent field validation**: Cross-field constraints

**Cyclomatic Complexity**: ~6 (within limit of 7)

**Mitigations:**
- Extracted `validateOnePreference` for single field validation
- Extracted constraint checks to separate functions
- Clear separation: collect data → validate → check constraints

#### 3. **Database Query Aggregations** (Technical Complexity)
**File**: `app/datastore/entries/index.js` (295 lines)

**Function**: `countByMarketPreference`
```javascript
countByMarketPreference: async({ campaignId }) => {
  const cursor = await DataStore.aggregate([
    { $match: { '_id.campaign_id': campaignId, 'date.phoneConfirmed': { $ne: null } } },
    { $project: {
      _id: 0,
      market: {
        $slice: [{ $concatArrays: [
          ['$fields.market'],
          { $ifNull: ['$fields.optional_markets', []] }
        ] }, 4]
      }
    } },
    { $unwind: { path: '$market', includeArrayIndex: 'idx' } },
    { $group: {
      _id: '$market',
      0: { $sum: { $cond: { if: { $eq: ['$idx', 0] }, then: 1, else: 0 } } },
      1: { $sum: { $cond: { if: { $eq: ['$idx', 1] }, then: 1, else: 0 } } },
      2: { $sum: { $cond: { if: { $eq: ['$idx', 2] }, then: 1, else: 0 } } },
      3: { $sum: { $cond: { if: { $eq: ['$idx', 3] }, then: 1, else: 0 } } }
    } }
  ]);
  return (await cursor.toArray());
}
```

**Complexity Factors:**
- **MongoDB aggregation pipeline**: Multiple stages
- **Array manipulation**: Concat, slice, unwind
- **Conditional aggregation**: Counting by index position
- **Database-specific syntax**: Requires MongoDB knowledge

**Mitigation:**
- Encapsulated in datastore layer
- Single responsibility: count market preferences
- Not mixed with business logic

#### 4. **Router File** (Repetitive but Long)
**File**: `app/router/index.js` (382 lines)

**Pattern (Repeated ~20 times):**
```javascript
router.get('/:campaignId/entries', async ctx => {
  const userId = selectAuthUserId({ ctx });
  const campaignId = selectCampaignId({ ctx });
  const managerCtx = koaCtxToManagerCtx({ ctx });

  return entriesManager.findByCampaignAndUser(managerCtx, {
    campaignId,
    userId
  });
});
```

**Complexity**: Low per route, but high file size
- Each route: 5-10 lines
- Pattern: Extract params → build context → call manager → return result
- **Not complex, just repetitive**

## Nesting Depth Analysis

### Enforced Maximum: 2 Levels

**Most functions**: 0-1 levels of nesting

**Example of Max Nesting (2 levels):**
```javascript
// app/managers/entries/validators/preferences/index.js:89-100
const validationsByPreferenceId = await prefSpec.reduce(async(validatedMapPromise, preference) => {
  const { type, id: preferenceId } = preference;
  if (hasPref(preferenceId)) {  // Level 1
    return {                     // Level 2
      ...await validatedMapPromise,
      [preferenceId]: await validateOnePreference(managerCtx, {
        jwt, type, preference, inputVal: data[preferenceId], preferenceId, campaign
      })
    };
  }
  return validatedMapPromise;
}, Promise.resolve({}));
```

**Benefits of Max-2 Rule:**
- Forces extraction of complex logic
- Encourages early returns
- Prevents deeply nested conditionals
- Improves readability

### Common Nesting Patterns

**0 Levels** (Guard clauses + sequential code):
```javascript
const findByCampaignAndUser = async(managerCtx, { campaignId, userId }) => {
  if (!userId) {
    throw error(notLoggedIn);
  }
  const { datastore: { entries } } = managerCtx;
  const entry = await entries.findByCampaignAndUser({ campaignId, userId });
  throwIfInvalidEntry({ entry, correlation: managerCtx.correlation });
  return normalize({ entry });
};
```

**1 Level** (Single conditional):
```javascript
const makeUserLink = ({ code, campaign }) => {
  const domain = selectShareDomain({ campaign });
  if (domain) {  // Level 1
    return `https://${domain}/${code}`;
  }
  return null;
};
```

## Cyclomatic Complexity

### Distribution (Estimated from Sampling)

| Complexity Range | Percentage | Type |
|-----------------|------------|------|
| 1-2 (Simple) | ~60% | Selectors, helpers, guards |
| 3-4 (Low) | ~25% | Validators, normalizers |
| 5-6 (Moderate) | ~10% | Orchestration functions |
| 7 (Max) | ~5% | Complex validation/aggregation |

### Examples by Complexity Level

**Level 1-2** (Simplest):
- Selector functions
- Simple transforms
- Object factories
- Error definitions

**Level 3-4** (Low):
- Single validation with conditionals
- Guards with 2-3 branches
- Simple async operations

**Level 5-6** (Moderate):
- Multi-step validation
- Create/update orchestration
- Async reduce operations

**Level 7** (Maximum Allowed):
- Complex validation with dependent checks
- Multi-path async flows
- Aggregation queries

**Above 7**: Not allowed by ESLint - forces refactoring

## Functional Programming Impact on Complexity

### Complexity Reduction Techniques

**1. Ramda Composition Reduces Imperative Logic:**
```javascript
// Instead of:
function normalize(data) {
  let entry = data.entry;
  entry = flattenCompoundId(entry);
  entry = retractNudetectScore(entry);
  entry = overwritePresaleCodes(entry);
  entry = backfillPresaleCode(entry);
  return entry;
}

// Using R.pipe (actual code):
const normalize = R.pipe(
  R.prop('entry'),
  flattenCompoundId,
  retractNudetectScore,
  overwritePresaleCodes,
  backfillPresaleCode
);
```
**Benefit**: Lower cyclomatic complexity, no intermediate variables

**2. No Loops = Reduced Nesting:**
```javascript
// Prohibited (would be 2+ levels nesting):
for (const item of items) {
  if (item.valid) {
    result.push(transform(item));
  }
}

// Required (1 level nesting):
const result = items
  .filter(item => item.valid)
  .map(transform);
```

**3. Pure Functions = Easier to Reason About:**
- No side effects
- Predictable outputs
- Testable in isolation
- Lower cognitive load

**4. Immutability = No State Tracking:**
- No need to track mutations
- Clearer data flow
- Fewer bugs from shared state

## Complexity Hotspots (Recommendations)

### 1. **Entry Upsert Flow** (Moderate Complexity)
**Current**: 178 lines, multiple async calls, create/update branching

**Status**: ✅ Well-managed
- Clear separation of concerns
- Good function names
- Delegated complexity to subfunctions

**No action needed** - complexity is inherent to domain logic

### 2. **Preference Validation** (Moderate-High Complexity)
**Current**: Async reduce for validation, dependent field checks

**Status**: ⚠️ Consider watching
- Async reduce pattern is advanced
- Multiple validation types add complexity

**Potential improvement**:
- Consider extracting async reduce to utility
- Document the async accumulation pattern

**Priority**: Low (code is working and readable)

### 3. **Router File Size** (High Line Count, Low Complexity)
**Current**: 382 lines, repetitive route definitions

**Status**: ⚠️ Consider refactoring
- Not complex, just long
- Repetitive pattern suggests abstraction opportunity

**Potential improvement**:
```javascript
// Extract route registration helper
const registerCRUDRoutes = ({ router, path, manager, selectParams }) => {
  router.get(path, async ctx => {
    const params = selectParams(ctx);
    const managerCtx = koaCtxToManagerCtx({ ctx });
    return manager.find(managerCtx, params);
  });
  // ... similar for POST, PUT, DELETE
};
```

**Priority**: Low (working fine, would be optimization)

### 4. **Datastore Aggregations** (Technical Complexity)
**Current**: Complex MongoDB pipelines embedded in datastore

**Status**: ✅ Correctly abstracted
- Encapsulated in datastore layer
- Not mixed with business logic
- Single responsibility

**No action needed** - complexity is database-specific

## Summary

### Strengths
✅ **Strict complexity limits enforced**: Max complexity 7, max nesting 2
✅ **Functional programming reduces complexity**: No loops, pure functions, immutability
✅ **Good separation of concerns**: Validators, normalizers, managers separate
✅ **Small file sizes**: 58 lines average
✅ **Consistent patterns**: Reduces cognitive load

### Areas of Managed Complexity
⚠️ **Entry upsert logic**: Inherently complex business logic, well-organized
⚠️ **Async validation patterns**: Advanced but readable
⚠️ **Database aggregations**: Complex but encapsulated

### Potential Optimizations (Low Priority)
💡 **Router abstraction**: Reduce repetition in route definitions
💡 **Async validation utility**: Extract async reduce pattern for reuse

### Overall Assessment
**Code complexity is well-managed.** The strict ESLint rules enforce low complexity, and functional programming reduces typical sources of complexity (loops, mutations, side effects). The complex areas are either:
1. Inherent business logic complexity (well-organized)
2. Technical complexity (properly encapsulated)
3. Repetition without complexity (could be optimized)

**No critical complexity issues found.**
