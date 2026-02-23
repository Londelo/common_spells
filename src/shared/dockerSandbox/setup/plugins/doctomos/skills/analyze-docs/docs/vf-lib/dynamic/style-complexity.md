# Code Complexity - vf-lib

## Metrics Overview

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Avg function length | ~20 lines | < 30 | ✅ Good |
| Max function length | ~50 lines | < 50 | ✅ Good |
| Max nesting depth | 2-3 | ≤ 2 | ⚠️ Occasional violations |
| Avg file size | ~60 lines | < 200 | ✅ Excellent |
| Largest file | 286 lines | < 200 | ⚠️ Few violations |
| Cyclomatic complexity | ~3-5 | ≤ 7 | ✅ Good |
| Package count | 48 | N/A | High modularity |

## File Size Analysis

### Distribution
```
< 10 lines:    ~15% (very simple utilities)
10-50 lines:   ~60% (ideal size)
50-100 lines:  ~20% (manageable)
100-200 lines: ~4%  (approaching limit)
> 200 lines:   ~1%  (violations)
```

### Largest Files

| File | Lines | Status | Reason |
|------|-------|--------|--------|
| `aws/dynamodb/index.ts` | 286 | ⚠️ Exceeds limit | Complex SDK wrapper, many methods |
| `log/src/index.js` | 130 | ⚠️ Approaching | Winston logger configuration |
| `normalizers/src/index.js` | 138 | ⚠️ Approaching | Many small normalizer functions |
| `request/src/index.js` | 105 | ⚠️ Approaching | Retry logic and error handling |
| `tm-pacman/censoredWords.js` | 2956 | ❌ Major violation | Data file (not code) |

**Note:** `censoredWords.js` is a data file containing word lists, not executable code. Should be moved to JSON/YAML.

## Function Complexity Analysis

### Simple Functions (< 10 lines)
**Examples:**
- `delay/src/index.js` - 1 line implementation
- `crypto/simpleUniqueId` - 4 lines
- `jwt/Verify` - 1 line
- `jwt/SignPayload` - 1 line
- `date/toSeconds` - 1 line
- Most utility functions in `date/`, `string-utils/`

**Characteristics:**
- Pure functions
- Single responsibility
- No branching logic
- Point-free style with Ramda

### Moderate Functions (10-30 lines)
**Examples:**
- `normalizers/nameSafe` - 15 lines with regex logic
- `object-utils/flatten` - 16 lines with recursion
- `TimedAsyncFn` - 46 lines with try-catch
- `TracedAsyncFn` - 53 lines with OpenTelemetry setup

**Characteristics:**
- Clear logic flow
- 1-2 branches
- Error handling included
- Still readable at a glance

### Complex Functions (30+ lines or high cyclomatic complexity)
**Examples:**

**1. `normalizers/phone` (15 lines, high complexity)**
```javascript
export const phone = input => { // eslint-disable-line complexity
  // Multiple normalization attempts with fallbacks
  // Cyclomatic complexity: ~8
```
**Complexity drivers:**
- Multiple fallback strategies (4 attempts)
- Nested conditionals
- Boolean chains

**2. `normalizers/nameObj` (10 lines, moderate complexity)**
```javascript
export const nameObj = (first, last = null, includeLowerCase = false) => {
  // Conditional mutation based on flag
  // Cyclomatic complexity: ~3
```
**Complexity drivers:**
- Conditional behavior flag
- Array manipulation
- Object construction + mutation

**3. `request/src/index.js:retryRequest` (20 lines, moderate complexity)**
```javascript
export const retryRequest = async({ normalizedParams, bail }) => {
  try {
    // Success path
  } catch (err) {
    // Error classification logic
    // Cyclomatic complexity: ~4
  }
};
```
**Complexity drivers:**
- Try-catch error handling
- Status code classification
- Conditional retry logic

**4. `aws/dynamodb/index.ts:formatBatchWriteCommands` (20 lines, high nesting)**
```typescript
const formatBatchWriteCommands = ({ isDelete, TableName, data, keys }) => R.pipe(
  () => data || keys,
  R.defaultTo([]),
  R.splitEvery(MAX_BATCH_SIZE.DYNAMODB_WRITE),
  R.map(
    R.pipe(
      R.ifElse<DataAndKeyValue[][], unknown, unknown>(
        () => isDelete,
        R.map(Key => ({ DeleteRequest: { Key } })),
        R.map(Item => ({ PutRequest: { Item } }))
      ),
      // More nesting...
    )
  )
)();
```
**Complexity drivers:**
- Nested `R.pipe` calls
- Conditional transformation within map
- Multiple levels of data wrapping

## Nesting Depth Analysis

### Target: ≤ 2 levels (enforced by ESLint)

### Violations Found

**1. `object-utils/flatten.js` - Acceptable depth (2 levels)**
```javascript
return Object.entries(obj)
  .filter(([key]) => obj.hasOwnProperty(key))
  .reduce((acc, [key, value]) => ({    // Level 1
    ...acc,
    ...flatten(value, nextPath(key), separator)  // Recursion, not nesting
  }), {});
```
**Status:** ✅ Within limit (recursion doesn't count as nesting)

**2. `aws/dynamodb/index.ts` - High nesting (3-4 levels)**
```typescript
R.map(                                 // Level 1
  R.pipe(                             // Level 2
    R.ifElse<DataAndKeyValue[][], unknown, unknown>(  // Level 3
      () => isDelete,
      R.map(Key => ({ ... })),        // Level 4
      R.map(Item => ({ ... }))
    ),
    requestItems => ({ ... })
  )
)
```
**Status:** ⚠️ Exceeds limit in functional pipeline

**3. `normalizers/splitNameParts` - Moderate nesting (2-3 levels)**
```javascript
if (fullStr.indexOf(',') > -1) {       // Level 1
  const parts = fullStr.split(',');
  const lastName = parts.shift();
  parts.push(lastName);
  return splitNamePartsOnSpace(parts.join(' '));
}
```
**Status:** ✅ Within limit

## Complexity Observations

### Simple Areas

**1. Pure Utility Functions**
- `delay/`, `crypto/`, `date/` packages
- No state, no side effects
- 1-5 lines per function
- Trivial to understand and test

**Example:**
```javascript
export const yesterday = () => now() - DAY;
export const tomorrow = () => now() + DAY;
export const toMilliseconds = date => SECOND * date;
```

**2. Higher-Order Function Wrappers**
- `TimedAsyncFn`, `TracedAsyncFn`, `BatchFn`
- Clear separation of concerns
- Wraps any function with additional behavior
- 30-50 lines but well-structured

**Example:**
```javascript
const TimedAsyncFn = ({ namespace, metricName, asyncFn, customTagResolversMap = {} }) =>
  async(...params) => {
    const endTimer = startTimerSeconds();
    try {
      const result = await asyncFn(...params);
      putMetric({ /* timing data */ });
      return result;
    } catch (error) {
      putMetric({ /* error timing */ });
      throw error;
    }
  };
```
**Why it's simple:**
- Clear try-catch structure
- No nested conditions
- Single responsibility (add timing)

**3. Functional Pipelines**
- Heavy use of `R.pipe`, `R.compose`
- Declarative data transformations
- No loops or conditionals
- Easy to trace data flow

**Example:**
```javascript
const clean = R.cond([
  [R.isNil, emptyObject],
  [isString, R.trim],
  [isNonArrayObject, R.pipe(
    R.defaultTo({}),
    R.map(val => clean(val)),
    removeEmptyProperties
  )],
  [R.T, R.identity]
]);
```
**Why it's simple:**
- Pattern matching with `R.cond`
- Each case is independent
- Recursive but not nested

### Complex Areas

**1. Data Normalization (`normalizers/src/index.js`)**
**Lines:** 138
**Complexity drivers:**
- Multiple regex patterns
- String manipulation edge cases
- Phone number international format handling
- Name parsing with special characters

**Most complex function:**
```javascript
export const phone = input => { // eslint-disable-line complexity
  // 4 different normalization attempts
  // Boolean chains for fallbacks
  // Edge case handling
};
```

**Why complex:**
- Domain complexity (phone numbers are hard)
- Multiple formats to support
- Fallback strategy chains
- Input validation scattered

**Recommendation:**
- Extract each normalization strategy to named function
- Use `R.cond` or `R.find` for fallback selection
- Add JSDoc explaining each strategy

**2. AWS SDK Wrappers (`aws/dynamodb/index.ts`, `aws/s3/index.js`)**
**Lines:** 286, 187
**Complexity drivers:**
- AWS SDK v3 API complexity
- Batch operation handling
- Error handling and retries
- Parameter transformation

**Example complexity:**
```typescript
const formatBatchWriteCommands = ({ isDelete, TableName, data, keys }) => R.pipe(
  // 4 levels of nested transformations
  // Conditional logic within map
  // Type assertions for AWS SDK
)();
```

**Why complex:**
- AWS SDK has complex types
- Batching logic requires splitting/merging
- Must handle UnprocessedItems
- Type assertions needed for SDK compatibility

**Recommendation:**
- Already well-organized despite size
- Extract `formatBatchWriteCommands` to separate file
- Add explicit type annotations to reduce assertions
- Consider splitting into separate modules (query, write, batch)

**3. Request/Retry Logic (`request/src/index.js`)**
**Lines:** 105
**Complexity drivers:**
- Async retry strategy
- Error classification (5xx vs others)
- Parameter normalization
- Correlation tracking

**Example complexity:**
```javascript
const retryRequest = async({ normalizedParams, bail }) => {
  try {
    const response = await _request(normalizedParams);
    return response;
  } catch (err) {
    const { statusCode, status, error, message } = err;
    const errorStatus = statusCode || status;

    // Don't retry 4xx errors
    if (errorStatus && !R.startsWith('5', errorStatus.toString())) {
      bail(err);
      return;
    }
    throw error;
  }
};
```

**Why complex:**
- Error classification logic
- Retry strategy configuration
- Multiple error shapes to handle
- Bail logic for non-retryable errors

**Recommendation:**
- Extract error classification to `isRetryableError(err)` function
- Add explicit error type guards
- Document retry strategy in comments

**4. Logging Configuration (`log/src/index.js`)**
**Lines:** 130
**Complexity drivers:**
- Winston transport configuration
- Field sanitization
- Context formatting
- Multiple log levels

**Example complexity:**
```javascript
const separateWhitelistedFields = ({ rootFieldsWhitelistMap, fields = {} }) => Object
  .entries(fields)
  .reduce((acc, [field, value]) => {
    const selectedFields = rootFieldsWhitelistMap[field] ? acc.whitelistedFields : acc.additionalFields;
    selectedFields[field] = value; // eslint-disable-line fp/no-mutation
    return acc;
  }, { whitelistedFields: {}, additionalFields: {} });
```

**Why complex:**
- Winston configuration API is verbose
- Field whitelisting/sanitization logic
- Side-effecting reduce (mutation disable)
- Multiple transport types

**Recommendation:**
- Split into separate files: `transports.js`, `formatting.js`, `sanitization.js`
- Remove mutation with functional approach
- Extract transport factories to separate module

## Cyclomatic Complexity Analysis

### Distribution
```
Complexity 1-2:   ~70% (simple, linear)
Complexity 3-5:   ~25% (moderate, some branching)
Complexity 6-7:   ~4%  (complex, near limit)
Complexity 8+:    ~1%  (violations with disable comments)
```

### Functions Exceeding Limit

**1. `normalizers/phone` - Complexity ~8**
```javascript
export const phone = input => { // eslint-disable-line complexity
```
**Branches:**
- Input validation
- 4 normalization attempts
- Length checks
- Null returns

**2. `normalizers/nameObj` - Complexity ~5**
```javascript
export const nameObj = (first, last = null, includeLowerCase = false) => {
```
**Branches:**
- Parameter validation
- Array mapping with fallbacks
- Conditional lowercase addition

### Strategies to Reduce Complexity

**Use `R.cond` for multiple branches:**
```javascript
// Instead of:
if (condition1) return result1;
if (condition2) return result2;
if (condition3) return result3;
return default;

// Use:
const fn = R.cond([
  [condition1, () => result1],
  [condition2, () => result2],
  [condition3, () => result3],
  [R.T, () => default]
]);
```

**Extract branches to named functions:**
```javascript
// Instead of:
if (normalized && normalized.length && normalized[0]) return normalized[0];
if (normalizedIntl && normalizedIntl.length && normalizedIntl[0]) return normalizedIntl[0];

// Use:
const firstValid = R.find(isValidNormalization, [
  normalized,
  normalizedIntl,
  normalizedPlusOne,
  fallbackNormalization
]);
return firstValid || null;
```

## Testing Complexity

### Test File Patterns
- Tests co-located with source: `*.spec.js`, `*.spec.ts`
- Integration tests: `integrationTests/` directories
- Test utilities: `@verifiedfan/test-utils` package

### Test File Sizes
Most test files are **smaller than source files**, indicating:
- ✅ Good test organization
- ✅ Focused test cases
- ✅ Minimal setup/teardown

### Example Test Structure
```javascript
import { SignPayload, Verify } from './jwt';

describe('jwt', () => {
  describe('SignPayload', () => {
    it('should sign payload with private key', () => { ... });
  });

  describe('Verify', () => {
    it('should verify token with public key', () => { ... });
  });
});
```

**Characteristics:**
- Clear describe/it structure
- One assertion per test
- Minimal mocking
- Pure function testing (easy to test)

## Package Architecture Complexity

### Monorepo Structure
- **48 packages** in `packages/` directory
- Managed with **Lerna**
- Independent versioning
- Shared development dependencies

### Package Interdependencies
```
Low coupling:
- Most packages are independent utilities
- Few cross-package dependencies
- Clear separation of concerns

Example dependency chains:
@verifiedfan/timer
  └─ @verifiedfan/cloudwatch-stdout
      └─ Used in services

@verifiedfan/map-utils
  ├─ @verifiedfan/batch-fn
  ├─ @verifiedfan/aws (DynamoDB)
  └─ Multiple other packages
```

### Package Complexity Tiers

**Tier 1 - Simple Utilities (0 dependencies on internal packages)**
- `delay`, `crypto`, `date`, `string-utils`, `object-utils`
- Pure functions
- No state
- No side effects

**Tier 2 - Composed Utilities (1-2 internal dependencies)**
- `normalizers` (uses `string-utils`)
- `batch-fn` (uses `map-utils`)
- `cloudwatch-stdout` (uses `timer`)

**Tier 3 - SDK Wrappers (external dependencies)**
- `aws`, `mongodb`, `kafka`
- Wrap third-party SDKs
- Configuration management
- Error handling

**Tier 4 - Service Clients (multiple dependencies)**
- `tm-wallet`, `tm-accounts`, `tm-users`, etc.
- Use `request`, `jwt`, `normalizers`
- Business logic integration

## Recommendations

### High Priority

1. **Move `tm-pacman/censoredWords.js` to JSON/YAML**
   - Current: 2956 lines of JavaScript arrays
   - Should be: Data file loaded at runtime
   - Impact: Reduces "code" size by ~3000 lines

2. **Refactor `normalizers/phone` function**
   - Extract each normalization strategy
   - Use `R.find` for first valid result
   - Add JSDoc documentation
   - Current complexity: ~8 → Target: ~4

3. **Split `aws/dynamodb/index.ts` into modules**
   - `dynamodb/query.ts` - Query/Scan operations
   - `dynamodb/write.ts` - Put/Update/Delete
   - `dynamodb/batch.ts` - Batch operations
   - `dynamodb/index.ts` - Main export
   - Current: 286 lines → Target: 4 files × ~70 lines

### Medium Priority

4. **Split `log/src/index.js` into modules**
   - `log/transports.js` - Transport factories
   - `log/sanitization.js` - Field sanitization
   - `log/formatting.js` - Log formatting
   - Current: 130 lines → Target: 3 files × ~45 lines

5. **Refactor mutation-heavy functions**
   - `log/separateWhitelistedFields` - Use functional approach
   - `normalizers/nameObj` - Remove conditional mutation
   - Replace `reduce` with mutations to pure transformations

6. **Add explicit error types**
   - `request/retryRequest` - Create `RetryableError` type
   - Improve error classification logic
   - Add type guards for error shapes

### Low Priority

7. **Enable TypeScript `noImplicitAny`**
   - Currently disabled despite `strict: true`
   - Add explicit type annotations
   - Gradual migration approach

8. **Reduce Ramda nesting depth**
   - Extract nested pipelines to named functions
   - `aws/dynamodb/formatBatchWriteCommands` - Break into steps
   - Improve readability without sacrificing functional style

9. **Document complex algorithms**
   - Add JSDoc to phone normalization
   - Explain retry strategies
   - Document batch size limits

## Summary

The vf-lib codebase maintains **excellent overall complexity metrics** with a strong functional programming foundation. Most code is simple, focused, and easy to understand.

**Key Strengths:**
- ✅ Small, focused functions (avg ~20 lines)
- ✅ Small files (avg ~60 lines)
- ✅ Low cyclomatic complexity (avg ~3-5)
- ✅ Functional pipelines are clear
- ✅ Pure functions dominate
- ✅ High modularity (48 packages)

**Areas to Address:**
- ⚠️ 3-4 files exceed 200-line limit
- ⚠️ 2-3 functions exceed complexity limit
- ⚠️ Some nested functional pipelines hard to follow
- ⚠️ Data file (censoredWords) should be external
- ⚠️ A few mutation-heavy functions fight FP style

**Overall Assessment:** The complexity is **well-managed** with clear patterns and strong enforcement of simplicity through ESLint. The few violations are documented with disable comments and have clear justifications. The codebase prioritizes readability and maintainability through functional programming principles.
