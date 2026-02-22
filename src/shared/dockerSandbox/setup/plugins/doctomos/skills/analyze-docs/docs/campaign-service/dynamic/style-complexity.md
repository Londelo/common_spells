# Code Complexity - campaign-service

## Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Total source files | 95 | Excluding test files |
| Total lines of code | 10,966 | Excluding test files |
| Avg file size | ~115 lines | Well below 200-line ESLint limit |
| Avg function length | ~20-30 lines | Estimated from sampling |
| Max nesting depth | 2 | Enforced by ESLint (max-depth: 2) |
| Max cyclomatic complexity | 7 | Enforced by ESLint (complexity: 7) |
| Largest file | 313 lines | `app/datastore/campaigns.js` |

## File Size Distribution

| Size Range | Count | Examples |
|------------|-------|----------|
| 0-50 lines | ~30 | `selectors.js`, `enums.js`, simple helpers |
| 51-100 lines | ~35 | Most managers, formatters, small datastores |
| 101-200 lines | ~25 | Complex managers, router files |
| 201+ lines | ~5 | `campaigns.js` (313), `errors.js` (281), validators |

## Complexity Observations

### Simple Areas

#### **Selector Modules** (20-40 lines)
**Files:** `app/managers/markets/selectors.js`, `app/managers/campaigns/selectors.js`

**Why Simple:**
- Pure functions using Ramda `R.path()` and `R.prop()`
- Single responsibility: extract data from objects
- No branching logic
- Highly predictable and testable

**Example:**
```javascript
// app/managers/markets/selectors.js (32 lines total)
export const selectId = R.path(['market', 'id']);
export const selectMarketName = R.path(['market', 'name']);
export const selectCity = R.path(['market', 'city']);
```

#### **Router Layer** (30-190 lines per router)
**Files:** `app/router/campaigns.js` (190 lines), `app/router/marketsByCampaignId.js`

**Why Simple:**
- Thin layer: parameter extraction + manager call
- No business logic
- Consistent pattern across all routes
- Single responsibility: HTTP request handling

**Example:**
```javascript
router.get('/:campaignId', ctx => {
  const campaignId = selectCampaignId(ctx);
  const managerCtx = koaCtxToManagerCtx({ ctx });
  return campaignManager.findById(managerCtx, { campaignId, authUserActions });
});
```

#### **Simple Managers** (50-100 lines)
**Files:** `app/managers/promoters/index.js`, `app/managers/venues/index.js`

**Why Simple:**
- Clear orchestration of datastore operations
- Limited branching
- Functional composition with Ramda
- Straightforward error handling

### Moderate Complexity Areas

#### **Main Manager Modules** (100-200 lines)
**Files:** `app/managers/campaigns/index.js` (191 lines), `app/managers/markets/index.js` (196 lines)

**Characteristics:**
- Multiple exported functions (10-15 per file)
- Each function 10-20 lines
- Mix of simple and moderately complex operations
- Some conditional logic but stays within complexity limits

**Complexity Factors:**
- Parameter validation
- Permission checks
- Data transformation pipelines
- Multiple datastore calls

**Example:**
```javascript
// app/managers/campaigns/index.js:116-140 - findByPermissions
// Moderate complexity: 25 lines, multiple branches, but clear logic
export const findByPermissions = async(managerCtx, {
  campaignIds, artistId, isAuthSupreme, skip, limit, sortKey, query, type, version
}) => {
  if (!campaignIds && !isAuthSupreme) {
    return [];
  }

  if (type && !validCampaignTypes.has(type)) {
    throw error(errors.InvalidCampaignType({ campaignType: type }));
  }

  const campaignIdsFiltered = (!isAuthSupreme) ? campaignIds : null;

  const campaigns = await managerCtx.datastore.campaigns.findByPermission({
    ...validatePaging({ skip, limit: limit || defaultLimit, maxLimit: maxPageSize }),
    sortSpec: validateSort({ sortKey, sortKeyMap }),
    campaignIds: campaignIdsFiltered,
    query: trimIfNotNil(query),
    type,
    artistId,
    version
  });
  return campaigns.map(campaign => formatCampaign({ campaign }));
};
```

#### **Datastore Modules** (90-313 lines)
**Files:** `app/datastore/campaigns.js` (313 lines), `app/datastore/markets.js` (216 lines)

**Characteristics:**
- Many small query functions (5-15 lines each)
- MongoDB query construction
- Cursor management
- Projection specifications

**Complexity Factors:**
- Complex query object construction
- Dynamic query building based on parameters
- Date field manipulation
- Aggregation pipelines

### Complex Areas

#### **1. Campaign Datastore** (`app/datastore/campaigns.js`) - 313 lines
**Complexity Score: High**

**Issues:**
- Exceeds 200-line ESLint limit (has `eslint-disable max-lines`)
- 25+ exported functions
- Complex query builders mixing logic
- `refresh()` and `deactivateCampaigns()` functions have nested operations

**Most Complex Function: `refresh()` (lines 41-74)**
```javascript
const refresh = async({ toStatus, fromStatuses }) => {
  const dateStatusKeys = dateFieldKeys[toStatus];  // Object lookup

  const query = {
    status: { $in: fromStatuses },
    [dateStatusKeys.scheduled]: { $gte: new Date(0), $lte: new Date() }
  };

  const cursor = await DataStore.find(query, { _id: 1, domain: 1, status: 1 });
  const campaignsToBeUpdated = await cursor.toArray();

  // Complex updateMany with $set and date manipulation
  const result = await DataStore.updateMany(query, {
    $set: {
      status: toStatus,
      'domain.preview': null,
      [dateStatusKeys.scheduled]: null,
      [dateStatusKeys.historic]: new Date()
    }
  });

  return {
    count: result.modifiedCount,
    domains: campaignsToBeUpdated.map(selectSiteDomain),
    originalCampaigns: campaignsToBeUpdated
  };
};
```

**Complexity Factors:**
- Dynamic property paths (`dateFieldKeys[toStatus]`)
- Multiple async operations with side effects
- MongoDB cursor handling
- Computed field keys in `$set` operations

**Recommendation:**
- Split into smaller focused modules
- Extract query builders
- Create dedicated refresh service

#### **2. Campaign Validators** (`app/managers/campaigns/validators/`) - Multiple 100+ line files
**Complexity Score: High**

**Most Complex: `throwIfInvalidRegistrationCampaign.js` (156 lines)**

**Issues:**
- Deep nesting of validation checks
- Multiple error conditions
- Schema validation mixed with business rules
- Long conditional chains

**Complexity Factors:**
- Preference field validation with type checking
- Nested object traversal
- Dynamic error message generation
- Array iteration with early exits

**Example:**
```javascript
// Nested validation with multiple concerns
preferences.forEach((preference, preferencesIndex) => {
  const { type, id } = preference;

  if (!validTypes.has(type)) {
    throw error(errors.InvalidPreferenceCampaignSchemaType({
      nodePath, type, id, preferencesIndex
    }));
  }

  // More nested validation...
});
```

**Recommendation:**
- Extract validation functions for each preference type
- Use validation schema library (e.g., Joi, Yup)
- Separate schema validation from business rule validation

#### **3. Error Definitions** (`app/managers/campaigns/errors.js`) - 281 lines
**Complexity Score: Moderate (Repetitive, not Complex)**

**Issues:**
- Very long file due to 40+ error definitions
- Repetitive structure across errors
- Mix of static errors and factory functions
- No abstraction/DRY violation

**Example:**
```javascript
// Repetitive pattern repeated 40+ times
export const campaignNotFound = {
  status: 404,
  message: 'Campaign not found.',
  payload: 'There is no campaign with the requested id.'
};

export const invalidCampaignId = {
  status: 404,
  message: 'Invalid campaign id.',
  payload: 'You must enter a valid campaign id.'
};
```

**Recommendation:**
- Create error factory: `createError({ status, message, payload })`
- Group related errors in objects
- Consider using error class or library

#### **4. Complex Formatters** (`app/managers/campaigns/format.js`) - 115 lines
**Complexity Score: Moderate-High**

**Issues:**
- `filterByLocale()` function handles multiple concerns
- Nested object destructuring makes data flow unclear
- Locale resolution mixed with data filtering

**Most Complex Function: `filterByLocale()` (lines 29-46)**
```javascript
const filterByLocale = ({ campaign, locale, showAllLocales = false }) => {
  if (showAllLocales) {
    return campaign;
  }
  const contentLocale = resolveLocale({ campaign, locale });
  const { content = {}, preferences = [], ...props } = campaign;
  return {
    ...props,
    content: { [contentLocale]: content[contentLocale] },
    currentLocale: contentLocale,
    preferences: preferences.map(
      ({ label, ...field }) => ({
        ...field,
        label: { [contentLocale]: label && label[contentLocale] }
      })
    )
  };
};
```

**Complexity Factors:**
- Conditional logic with early return
- Nested object restructuring
- Array mapping with destructuring
- Multiple data transformations

**Recommendation:**
- Split into `filterContentByLocale()` and `filterPreferencesByLocale()`
- Extract preference label filtering

#### **5. Complex Pipeline Operations** (`app/managers/markets/helpers/sendToDataPipeline.js`) - 153 lines
**Complexity Score: Moderate-High**

**Issues:**
- Multiple async operations
- External service calls
- Error handling across service boundaries
- Data transformation pipelines

**Recommendation:**
- Extract helper functions for each pipeline stage
- Improve error recovery strategy

## Nesting Depth Analysis

**ESLint Enforcement:** Max depth of 2

**Observation:** The codebase adheres well to the max-depth: 2 rule. Deep nesting is avoided through:
- Early returns
- Guard clauses
- Function extraction
- Ramda composition (avoids loops)

**Example of Proper Depth Management:**
```javascript
// app/managers/campaigns/index.js:60-63
export const findById = async(managerCtx, { campaignId, authUserActions, locale, showAllLocales }) => {
  const campaign = await throwIfCampaignInaccessible(managerCtx, { campaignId, authUserActions });
  return formatCampaign({ campaign, locale, showAllLocales });
};
```

## Cyclomatic Complexity Analysis

**ESLint Enforcement:** Max complexity of 7

**Observation:** Most functions stay well below the limit through:
- Single responsibility principle
- Function extraction for complex logic
- Use of Ramda for data transformations (avoids explicit conditionals)
- Early returns to reduce branching

**High Complexity Functions (approaching limit):**
1. `app/datastore/campaigns.js:refresh()` - Estimated 6-7
2. `app/managers/campaigns/validators/throwIfInvalidRegistrationCampaign.js` - Various functions 5-7
3. `app/managers/campaigns/format.js:filterByLocale()` - Estimated 5-6

## Functional Programming Impact on Complexity

**Positive Impacts:**
- **No loops:** Ramda `.map()`, `.filter()`, `.reduce()` replace loops, reducing cyclomatic complexity
- **No mutation:** Eliminates side effects and temporal coupling
- **Composition:** `R.pipe` and `R.pipeP` create clear data transformation pipelines
- **Pure functions:** Most selectors/formatters are pure, making them simple and testable

**Example:**
```javascript
// Instead of imperative loops with multiple branches:
const FindEventIdsFromPresaleWindow = managerCtx => R.pipeP(
  managerCtx.datastore.campaigns.findCampaignIdsByPresaleWindowDates,
  R.map(({ _id }) => _id.toString()),
  campaignIds => managerCtx.datastore.markets.findEventIdsByCampaignIds({ campaignIds })
);
```

## Recommendations

### High Priority

1. **Split `app/datastore/campaigns.js`** (313 lines)
   - Extract refresh operations to `app/datastore/campaigns/refresh.js`
   - Extract query builders to `app/datastore/campaigns/queries.js`
   - Keep main file under 200 lines

2. **Refactor validators** (`app/managers/campaigns/validators/`)
   - Use validation schema library (Joi, Yup, Zod)
   - Extract preference validation to dedicated module
   - Reduce nesting through validation composition

3. **Create error factory** (`app/managers/campaigns/errors.js`)
   - Reduce repetition with `createError({ status, message, payload })`
   - Group related errors
   - Reduce file from 281 to <150 lines

### Medium Priority

4. **Simplify `filterByLocale()`** (`app/managers/campaigns/format.js`)
   - Split into focused functions
   - Extract preference filtering

5. **Extract pipeline helpers** (`app/managers/markets/helpers/sendToDataPipeline.js`)
   - Create pipeline stage functions
   - Improve error handling

### Low Priority

6. **Add complexity metrics to CI/CD**
   - Track average function length over time
   - Alert on files approaching 200 lines
   - Monitor cyclomatic complexity trends

## Summary

**Overall Assessment: GOOD**

The codebase maintains good complexity management through:
- ✅ Strict ESLint enforcement
- ✅ Functional programming patterns
- ✅ Small, focused functions (avg 20-30 lines)
- ✅ Clear separation of concerns
- ✅ Consistent patterns across modules

**Areas for Improvement:**
- ⚠️ Few files exceed 200-line limit (with eslint-disable)
- ⚠️ Some validators have high complexity
- ⚠️ Error definitions are repetitive
- ⚠️ Large datastore files could be split

**Complexity Risk Level: LOW** - The enforced ESLint rules prevent complexity from creeping in, making the codebase maintainable and understandable.
