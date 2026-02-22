# Coding Conventions - vf-api-workers

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `campaignId`, `currentCount` |
| Functions | PascalCase (exported), camelCase (internal) | `UpdateDynamo`, `selectCampaignId` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_WRITE_SIZE`, `META_COUNTS` |
| Files | PascalCase for components, camelCase for utilities | `BatchUpdateRegistrations.js`, `normalizers.js` |
| Private constants | camelCase | `noScoringColor`, `postColor` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single (except JSX - double) |
| Semicolons | Required (always) |
| Trailing commas | Never |
| Line length | 120 characters |
| Max file length | 200 lines |
| Object curly spacing | Always (e.g., `{ foo }`) |
| Brace style | Stroustrup (else on new line) |

## ESLint Rules (Key Enforcements)

### Strictness
| Rule | Setting | Impact |
|------|---------|--------|
| complexity | error (max: 6) | Functions must be simple, max cyclomatic complexity of 6 |
| max-depth | error (max: 2) | Max nesting depth of 2 levels |
| max-lines | error (max: 200) | Files cannot exceed 200 lines |
| id-length | error (min: 2) | Variable names must be at least 2 characters |

### Functional Programming (fp plugin)
| Rule | Setting | Impact |
|------|---------|--------|
| fp/no-class | error | No ES6 classes allowed |
| fp/no-loops | error | No for/while loops - use map/reduce/filter |
| fp/no-let | error | Only const allowed, no let |
| fp/no-mutation | error | Immutability enforced (with exceptions for ctx/context) |
| fp/no-mutating-methods | error | No array.push(), array.sort() - use Ramda alternatives |

### Code Quality
| Rule | Setting |
|------|---------|
| prefer-const | error |
| no-var | error |
| prefer-arrow-callback | error |
| prefer-template | error |
| no-console | error |
| eqeqeq | error (strict equality required) |
| no-else-return | error |
| consistent-return | error |

## Import Organization

**Pattern observed:**
1. Third-party libraries (Debug, Ramda)
2. Internal @verifiedfan packages
3. Local relative imports (./normalizers, ./enums)
4. Named exports preferred

**Example:**
```javascript
import Debug from 'debug';
import * as R from 'ramda';
import { MapAsyncParallel } from '@verifiedfan/map-utils';
import { normalizeResults, filterByCampaignId } from './normalizers';
import PostDetailsToSlack from './PostDetailsToSlack';
```

## File Structure

**Standard pattern:**
1. Imports (grouped as above)
2. Constants (private, lowercase)
3. Helper functions (internal, often curried)
4. Main exported function (default export at bottom)

**Example from verdictReporter/index.js:**
- Imports first
- Private helpers (AddCurrentCountToRecords, LookupAndMergeCurrentCounts)
- Main function (verdictReporter)
- Default export last

## Comment Style

- **JSDoc**: Used for TypeScript type definitions
- **Inline comments**: Rare - code is self-documenting
- **Debug statements**: Extensive use of `debug()` for runtime logging
- **ESLint disable comments**: Used when mutation is necessary (e.g., `// eslint-disable-next-line fp/no-mutation`)

## Consistency Assessment

**Highly Consistent:**
- ✅ Functional programming style (Ramda everywhere)
- ✅ No classes, no loops, immutability
- ✅ Currying pattern for dependency injection
- ✅ PascalCase for exported workers/components

**Moderately Consistent:**
- ⚠️ Function naming varies (PascalCase for some internal functions, camelCase for others)
- ⚠️ File sizes mostly under 200 lines but enforcement varies

**Inconsistent:**
- ❌ Some files have mixed abstraction levels (e.g., NormalizeAndCombineByKeys.js line 83 has eslint-disable for mutation)

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | Strong | Shared normalizers, selectors, utilities extracted to shared/ directory |
| **Functional Programming** | Very Strong | Ramda everywhere, no classes, no loops, immutability enforced via ESLint |
| **KISS** | Strong | Functions avg 15-30 lines, simple logic, max complexity 6 enforced |
| **YAGNI** | Strong | Minimal abstractions, focused on specific use cases |
| **Single Responsibility** | Strong | Each function does one thing (e.g., selectCampaignId, formatCurrentCount) |
| **Composition** | Very Strong | Heavy use of R.pipe, R.pipeP, R.compose for function composition |
| **Pure Functions** | Strong | Most functions are pure, side effects isolated in workers |
| **Immutability** | Very Strong | Enforced via fp/no-mutation ESLint rule |
| **Dependency Injection** | Strong | Currying pattern for Services, correlation, jwt |

### Functional Programming Patterns (Very Strong)

**Evidence:**
1. **Ramda usage in every file** - `apps/verdictReporter/index.js:2`, `apps/verdictReporter/normalizers.js:1`, `shared/middlewares/ComposeMiddlewares.js:1`
2. **Currying for dependency injection** - `apps/verdictReporter/index.js:31` - `LookupAndMergeCurrentCounts = ({ aws: { demandTable } }) => records =>`
3. **Point-free style** - `apps/verdictReporter/normalizers.js:27` - `filterByCampaignId = R.pipe(R.uniqBy(selectCampaignId), R.filter(selectCampaignId))`
4. **No loops enforced** - `.eslintrc.yml:52` - `fp/no-loops: error`
5. **No classes enforced** - `.eslintrc.yml:49` - `fp/no-class: error`
6. **Immutability enforced** - `.eslintrc.yml:59` - `fp/no-mutation: error`

### DRY (Strong)

**Evidence:**
1. **Shared selectors** - `shared/selectors.js:3-8` - `selectS3ObjectKeyFromRecord`, `selectS3BucketFromRecord` reused across workers
2. **Shared normalizers** - `apps/verdictReporter/normalizers.js` - extracted to separate file, imported by multiple consumers
3. **Centralized constants** - `shared/constants.js:1-5` - ERROR_METRIC shared across workers
4. **Shared config** - `shared/config/index.js` - centralized configuration loading

### KISS (Strong)

**Evidence:**
1. **Max complexity 6** - `.eslintrc.yml:38-40` - `complexity: [error, 6]` enforced
2. **Max nesting 2** - `.eslintrc.yml:84-86` - `max-depth: [error, 2]`
3. **Small functions** - `apps/saveEntryScoring/getMarkets.js:3-8` - 6 lines, simple memoization
4. **Simple helpers** - `shared/middlewares/ComposeMiddlewares.js:3-5` - 3 lines, wraps R.compose

### Single Responsibility (Strong)

**Examples:**
1. **`selectCampaignId`** - `apps/verdictReporter/normalizers.js:25` - Only extracts campaignId
2. **`formatCurrentCount`** - `apps/verdictReporter/normalizers.js:48-52` - Only formats count structure
3. **`CheckMetaSlackCounts`** - `apps/verdictReporter/CheckMetaSlackCounts.js:17-27` - Only checks if counts match
4. **`PostDetailsToSlack`** - Called separately, only responsible for Slack posting
5. **`RequeueMessage`** - Called separately, only responsible for requeuing

### Composition (Very Strong)

**Evidence:**
1. **R.pipe for data transformation** - `apps/verdictReporter/normalizers.js:27-29` - Chains uniqBy and filter
2. **R.pipeP for async flows** - `apps/verdictReporter/index.js:31-40` - Chains Promise operations
3. **R.compose for middleware** - `shared/middlewares/ComposeMiddlewares.js:3` - Composes middleware stack
4. **Converge pattern** - `apps/verdictReporter/CheckMetaSlackCounts.js:9-15` - Uses R.converge for comparison
5. **ApplySpec for data shaping** - `apps/verdictReporter/normalizers.js:48-52` - Uses R.applySpec

### Dependency Injection (Strong)

**Pattern:** Curried functions that accept dependencies, then return worker function

**Examples:**
1. `apps/verdictReporter/index.js:31` - `LookupAndMergeCurrentCounts = ({ aws: { demandTable } }) => records =>`
2. `apps/verdictReporter/index.js:42` - `RequeueOrPostToSlack = ctx => R.ifElse(...)`
3. `apps/loadScoresToDynamoDB/BatchUpdateRegistrations.js:12` - `UpdateDynamo = ({ Services: { aws: { demandTable } }, correlation }) =>`
4. `apps/verdictReporter/CheckMetaSlackCounts.js:17` - `CheckMetaSlackCounts = ({ Services: { aws: { demandTable } } }) =>`

## Code Readability

**Overall Rating:** Good

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function names clearly express intent (`filterByCampaignId`, `normalizeResults`, `CheckMetaSlackCounts`) |
| Narrative Flow | Good | Most files read top-to-bottom with main logic at bottom and helpers above |
| Abstraction Consistency | Good | Functions stay at consistent abstraction levels, Ramda compositions maintain clarity |
| Self-Documentation | Excellent | Code is highly self-documenting due to descriptive names and functional style |

### Highly Readable Examples

1. **`apps/verdictReporter/normalizers.js:27-29`** - Perfect self-documenting code
   ```javascript
   export const filterByCampaignId = R.pipe(
     R.uniqBy(selectCampaignId),
     R.filter(selectCampaignId)
   );
   ```
   - Name tells complete story: "filter by campaign ID"
   - Implementation shows: unique by campaign ID, then filter out null IDs
   - No comments needed

2. **`apps/verdictReporter/formatSlack.js:3`** - Intention-revealing names
   ```javascript
   export const formatMessage = ({ campaignId, campaignName, env }) =>
     `*${campaignName}*: ${campaignId} (${env})`;
   ```
   - Function name clearly states purpose
   - Parameters are descriptive
   - Implementation is obvious

3. **`apps/verdictReporter/index.js:58-65`** - Excellent narrative flow
   ```javascript
   const verdictReporter = ({ input = [], Services, correlation, jwt }) => R.pipeP(
     () => Promise.resolve(input),
     filterByCampaignId,
     LookupAndMergeCurrentCounts(Services),
     MapAsyncParallel(RequeueOrPostToSlack({ Services, correlation, jwt })),
     R.tap(results => debug('results received from requeue or post to slack %o', { results })),
     results => normalizeResults({ results, inputLength: input.length })
   )();
   ```
   - Reads like a story: filter → lookup → process → log → normalize
   - Each step has clear intent
   - Pipeline pattern makes flow obvious

4. **`apps/loadScoresToStream/selectors.js:10-15`** - Clear single responsibility
   ```javascript
   export const selectRank = ({ globalUserId, id }) => {
     if (globalUserId === id) {
       return '0';
     }
     return SelectRankFromId(globalUserId)(id);
   };
   ```
   - Name reveals purpose: "select rank"
   - Logic is straightforward
   - Edge case (rank 0) is explicit

### Needs Improvement

1. **⚠️ `apps/loadScoresToStream/NormalizeAndCombineByKeys.js:77-87`** - ESLint disable indicates mutation
   ```javascript
   const LookupByKey = ({ correlation }) => R.reduce(
     (globalUserIdMap, record) => {
       const newRecord = normalizeRecord({ ...record, correlation });
       const lookupKey = formatLookupKey(newRecord);
       const existingRecord = globalUserIdMap[lookupKey];
       // eslint-disable-next-line fp/no-mutation
       globalUserIdMap[lookupKey] = existingRecord ? combineWithExisting(...) : newRecord;
       return globalUserIdMap;
     },
     {}
   );
   ```
   - Mutation inside reduce (not pure functional)
   - ESLint disable suggests this violates project standards
   - **Suggestion:** Use R.assoc or build new object instead of mutating accumulator

2. **⚠️ `shared/appResolver/Worker.ts:1-96`** - Mixed TypeScript/JSDoc comments
   - Extensive type comments that could be more concise
   - Some commented-out code (lines 48-63)
   - **Suggestion:** Clean up commented code, consolidate type definitions

## TypeScript Usage

**Pattern:**
- TypeScript used primarily for type definitions (`.ts` and `.d.ts` files)
- Most implementation is JavaScript
- `tsconfig.json` has `strict: true` but `noImplicitAny: false`
- Type definitions focus on Worker interfaces and AWS Lambda types

**Example:** `shared/appResolver/Worker.ts` defines comprehensive worker type system
