# Code Complexity - vf-api-workers

## Metrics

| Metric | Value | Enforcement |
|--------|-------|-------------|
| Avg function length | ~15-30 lines | Not enforced |
| Max cyclomatic complexity | 6 | **Enforced** (.eslintrc.yml:38-40) |
| Max nesting depth | 2 | **Enforced** (.eslintrc.yml:84-86) |
| Max file length | 200 lines | **Enforced** (.eslintrc.yml:81-83) |
| Avg file size | ~40-80 lines | Not enforced |
| Largest file observed | 200 lines (test file) | Within limit |

## ESLint Complexity Enforcement

The codebase enforces very strict complexity limits via ESLint:

```yaml
complexity: [error, 6]        # Max cyclomatic complexity
max-depth: [error, 2]         # Max nesting depth
max-lines: [error, 200]       # Max file lines
```

**Impact:**
- Forces small, focused functions
- Prevents deeply nested conditionals
- Encourages functional composition over imperative logic
- Files must be split when they grow large

## Complexity Observations

### Very Simple Areas (Cyclomatic Complexity: 1-2)

**Small utility functions:**
1. **`shared/middlewares/ComposeMiddlewares.js`** (5 lines total)
   - Simply wraps R.compose
   - Zero branching

2. **`apps/saveEntryScoring/getMarkets.js`** (8 lines total)
   - Single memoization wrapper
   - No branching

3. **`shared/constants.js`** (5 lines total)
   - Pure constant exports
   - No logic

4. **`apps/verdictReporter/normalizers.js:25`** - `selectCampaignId`
   - Single R.prop call
   - Complexity: 1

**Selectors and formatters:**
5. **`shared/selectors.js`** (9 lines total)
   - Two simple pipe functions
   - Complexity: 1 each

6. **`apps/verdictReporter/formatSlack.js:22-26`** - Count selectors
   - Simple path extraction
   - Complexity: 1 each

### Simple Areas (Cyclomatic Complexity: 3-6)

**Data transformation pipelines:**
1. **`apps/verdictReporter/normalizers.js:27-29`** - `filterByCampaignId`
   - R.pipe with 2 operations
   - Complexity: ~3 (due to filter predicate)

2. **`apps/verdictReporter/normalizers.js:48-52`** - `formatCurrentCount`
   - R.applySpec with 3 fields
   - Complexity: 1 (no branching in applySpec)

3. **`apps/verdictReporter/CheckMetaSlackCounts.js:17-27`**
   - R.pipeP with 4 steps
   - R.ifElse adds branching: Complexity ~4

4. **`apps/loadScoresToDynamoDB/BatchUpdateRegistrations.js:12-20`** - `UpdateDynamo`
   - Single if statement
   - Complexity: 2

**Main worker functions:**
5. **`apps/verdictReporter/index.js:58-65`** - `verdictReporter`
   - R.pipeP with 6 steps
   - No branching in main flow: Complexity ~2
   - Complexity hidden in composed functions

6. **`shared/appResolver/index.js:5-16`** - `App`
   - Two if statements (validation)
   - Complexity: 3

### Moderately Complex Areas (Cyclomatic Complexity: 7-10)

**These would typically violate ESLint complexity:6 rule but are kept simple via decomposition:**

1. **`apps/verdictReporter/index.js:42-56`** - `RequeueOrPostToSlack`
   - R.ifElse with nested R.unless
   - Apparent complexity: ~5
   - **Kept under limit by:** Breaking logic into CheckMetaSlackCounts, PostDetailsToSlack, RequeueMessage

2. **`apps/loadScoresToStream/NormalizeAndCombineByKeys.js:77-87`** - `LookupByKey`
   - Reduce with conditional inside
   - Apparent complexity: ~4
   - **Note:** Uses mutation (eslint-disable comment)

3. **`apps/loadScoresToStream/NormalizeAndCombineByKeys.js:15-64`** - `normalizeRecord`
   - Large destructuring, multiple field mappings
   - **Kept simple by:** No branching, just data transformation
   - Complexity: ~2

### Complex Areas - Well Managed

**The codebase has NO files exceeding complexity limits because:**

1. **Functional composition** - Complex logic is split across multiple small functions then composed
2. **Ramda abstractions** - Conditionals are expressed via R.ifElse, R.unless, R.when
3. **Strict ESLint enforcement** - Complexity:6 limit forces refactoring

**Example of complexity management:**
```javascript
// apps/verdictReporter/index.js:42-56
// Instead of one complex function:
//   if (hasMatchingCounts) {
//     if (checkMeta !== STATUS.BYPASS) {
//       postToSlack();
//     }
//     return { slack: result };
//   } else {
//     requeue();
//     return { requeue: result };
//   }
//
// Decomposed into:
const RequeueOrPostToSlack = ctx => R.ifElse(
  R.prop('hasMatchingCounts'),
  R.pipeP(
    CheckMetaSlackCounts(ctx),      // Separate function
    R.unless(
      R.equals(STATUS.BYPASS),
      PostDetailsToSlack(ctx)        // Separate function
    ),
    R.objOf(REPORTER_TYPE.SLACK)
  ),
  R.pipeP(
    RequeueMessage(ctx),             // Separate function
    R.objOf(REPORTER_TYPE.REQUEUE)
  )
);
```

## File Size Distribution

Based on sampled files:

| Size Range | Example Files | Typical Content |
|------------|---------------|-----------------|
| 5-20 lines | `ComposeMiddlewares.js` (5), `constants.js` (5), `getMarkets.js` (8) | Constants, simple utilities |
| 20-50 lines | `CheckMetaSlackCounts.js` (29), `BatchUpdateRegistrations.js` (32) | Single worker components |
| 50-100 lines | `verdictReporter/index.js` (68), `normalizers.js` (72), `NormalizeAndCombineByKeys.js` (95) | Main workers, multi-function modules |
| 100-200 lines | `normalizers.spec.js` (200), `Worker.ts` (96) | Test files, type definitions |

**Largest files tend to be:**
- Test/spec files (many test cases)
- Type definition files (.ts, .d.ts)
- Index files that compose multiple workers

## Nesting Depth Analysis

**Max depth enforced: 2**

**Observed patterns:**
1. **Most functions: Depth 0-1**
   - Functional pipelines (R.pipe, R.pipeP) - Depth 0
   - Single-level functions - Depth 1

2. **Depth 2 examples:**
   - `apps/loadScoresToStream/NormalizeAndCombineByKeys.js:77-87` - Reduce with if/else inside: Depth 2
   - `shared/entryFiles/lambda.js:18-35` - Try-catch with if inside: Depth 2

3. **Zero depth 3+ observed** - ESLint prevents it

## Function Length Analysis

**Typical function sizes:**

| Function Type | Lines | Example |
|---------------|-------|---------|
| Selectors | 1-3 | `selectCampaignId` (1 line) |
| Simple utilities | 3-8 | `getMarkets` (6 lines) |
| Normalizers | 8-15 | `formatCurrentCount` (5 lines), `normalizeCountsKeys` (1 line) |
| Workers/handlers | 15-40 | `verdictReporter` (8 lines), `UpdateDynamo` (9 lines) |
| Complex transformations | 30-60 | `normalizeRecord` (49 lines - mostly destructuring) |

**Longest functions observed:**
1. `apps/loadScoresToStream/NormalizeAndCombineByKeys.js:15-64` - `normalizeRecord` (49 lines)
   - Large destructuring and field mapping
   - Low complexity despite length (no branching)

2. `shared/entryFiles/lambda.js:18-35` - Lambda handler (18 lines)
   - Try-catch wrapper
   - Includes logging and error handling

## Cyclomatic Complexity Breakdown

Based on ESLint enforcement and observed patterns:

| Complexity | Function Count Estimate | Examples |
|------------|-------------------------|----------|
| 1-2 | ~60% | Selectors, formatters, simple utilities |
| 3-4 | ~30% | Normalizers, single-conditional functions |
| 5-6 | ~10% | Complex conditionals (at ESLint limit) |
| 7+ | **0%** | **Not allowed** (ESLint error) |

## Functional Programming Impact on Complexity

**Reduces apparent complexity:**
1. **R.pipe/R.pipeP** - No branching visible in pipeline
2. **R.ifElse** - Replaces if/else, counts as 1 function call
3. **R.unless/R.when** - Conditional execution without branching syntax
4. **R.applySpec** - Complex object building without explicit logic

**Example:**
```javascript
// Imperative (Complexity: 3-4)
function filterAndIndex(items) {
  const unique = [];
  const seen = {};
  for (let item of items) {
    const id = item.campaignId;
    if (id && !seen[id]) {
      seen[id] = true;
      unique.push(item);
    }
  }
  return unique.filter(item => item.campaignId);
}

// Functional (Complexity: 1)
const filterByCampaignId = R.pipe(
  R.uniqBy(selectCampaignId),
  R.filter(selectCampaignId)
);
```

## Test File Complexity

**Test files are longer but still manageable:**
- `apps/verdictReporter/normalizers.spec.js` (200 lines)
  - Multiple describe/it blocks
  - Each test is simple (1-3 lines)
  - Complexity per test: 1

**Pattern:**
- Test setup/fixtures: 50-100 lines
- Test cases: 1-5 lines each
- Total: 100-200 lines (at ESLint limit)

## Recommendations

### Continue Current Practices

1. ✅ **Keep ESLint complexity enforcement** - The complexity:6 limit is working well
2. ✅ **Maintain functional decomposition** - Breaking complex logic into composed functions works
3. ✅ **Use Ramda for conditionals** - R.ifElse, R.unless keep nesting low

### Minor Improvements

1. **⚠️ Address mutation in NormalizeAndCombineByKeys.js:83**
   - Current: Uses `eslint-disable-next-line fp/no-mutation`
   - Suggestion: Refactor to use R.assoc or build new object
   ```javascript
   // Instead of:
   globalUserIdMap[lookupKey] = existingRecord ? ... : newRecord;

   // Use:
   return R.assoc(lookupKey, existingRecord ? ... : newRecord, globalUserIdMap);
   ```

2. **Consider splitting normalizeRecord (49 lines)**
   - Currently just below 50-line "sweet spot"
   - Could extract `selectNudataFields`, event parsing to separate functions
   - Not urgent - function is simple despite length

3. **Clean up commented code in Worker.ts**
   - Lines 48-63 have commented-out type definitions
   - Remove or implement

### Potential Concerns

**None identified.** The codebase is very well-managed for complexity:
- Strict ESLint enforcement prevents complexity creep
- Functional style naturally reduces nesting and branching
- Files are small and focused
- Test files are the only ones approaching 200-line limit

## Complexity Comparison: Imperative vs Functional

**This codebase demonstrates how functional programming reduces measured complexity:**

| Pattern | Imperative Complexity | Functional Complexity |
|---------|----------------------|----------------------|
| Conditional execution | +1 per if/else | +0 (R.ifElse counts as function call) |
| Loops | +1 per loop, +nesting | +0 (map/reduce/filter count as function call) |
| Multiple operations | +1 per operation | +0 (pipe combines without branching) |
| Null checks | +1 per check | +0 (R.propOr, R.pathOr handle gracefully) |

**Result:** Apparent complexity of 2-6 for logic that might be 8-12 in imperative style.
