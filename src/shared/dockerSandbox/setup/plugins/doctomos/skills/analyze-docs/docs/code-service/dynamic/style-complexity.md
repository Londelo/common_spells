# Code Complexity - code-service

## Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Avg function length | ~25 lines | Most functions 15-40 lines |
| Max nesting depth | 2 | Enforced by ESLint (max-depth: 2) |
| Max file size | 200 lines | Enforced by ESLint (max-lines: 200) |
| Largest file | ~130 lines | `app/datastore/codes.js` |
| Cyclomatic complexity | ≤7 | Enforced by ESLint (complexity: 7) |
| Min identifier length | 2 chars | Enforced by ESLint (id-length: min 2) |
| Max line length | 120 chars | Enforced by ESLint |

## File Size Distribution

Based on sampled files:

| Size Range | Count | Examples |
|------------|-------|----------|
| < 20 lines | Common | Middleware wrappers, simple exports |
| 20-50 lines | Most common | Managers, utilities, route handlers |
| 50-100 lines | Frequent | Complex managers, datastore operations |
| 100-200 lines | Rare | Main datastore (`codes.js` ~129 lines) |
| > 200 lines | Prohibited | ESLint enforces max-lines: 200 |

**Examples:**
- `lib/middlewares/responseFormatter.js`: 8 lines
- `app/managers/codes/enums.js`: 17 lines
- `lib/middlewares/correlation.js`: 9 lines
- `app/managers/codes/findAndReserveCodes.js`: 49 lines
- `app/managers/codes/index.js`: 105 lines
- `app/datastore/codes.js`: ~129 lines

## Complexity Observations

### Simple Areas

**1. Middleware Setup Files**
- **Location:** `lib/middlewares/` directory
- **Characteristics:**
  - 5-15 lines each
  - Single responsibility: import → configure → export
  - Zero complexity
  - Examples: `correlation.js`, `responseFormatter.js`, `errorFormatter.js`, `accessLog.js`

**2. Configuration Files**
- **Location:** `lib/config.js`, `app/managers/codes/enums.js`
- **Characteristics:**
  - Simple constants and enumerations
  - No logic, just declarations
  - Clear, flat structure

**3. Simple Route Handlers**
- **Location:** `lib/Router/heartbeat.js`
- **Characteristics:**
  - 17 lines
  - Single try-catch block
  - Clear linear flow
  - No nested logic

**4. Instrumentation Wrappers**
- **Location:** `app/datastore/InstrumentDatastores.js`, `app/services/InstrumentServices.js`
- **Characteristics:**
  - 20-50 lines
  - Higher-order functions
  - Clear composition patterns
  - Ramda pipelines for readability

**5. Error Definitions**
- **Location:** `app/managers/codes/errors.js`
- **Characteristics:**
  - Plain object exports
  - No logic
  - Factory functions for dynamic errors

### Moderately Complex Areas

**1. Router Layer**
- **Location:** `app/router/index.js` (75 lines)
- **Complexity:** Medium
- **Reasons:**
  - Multiple route definitions
  - Context transformation
  - Parameter extraction logic
  - Higher-order function usage (UpdateCodes factory)
- **Mitigating factors:**
  - Well-organized structure
  - Clear separation of concerns
  - Use of selector functions

**2. Manager Functions**
- **Location:** `app/managers/codes/index.js` (105 lines)
- **Complexity:** Medium
- **Reasons:**
  - Multiple exported functions
  - Input validation logic
  - Permission checks
  - Factory pattern for code updates
- **Mitigating factors:**
  - Each function focused on single task
  - Clear error handling
  - Consistent patterns

**3. Data Stream Processing**
- **Location:** `app/managers/codes/readAndStoreCodes.js` (56 lines)
- **Complexity:** Medium
- **Reasons:**
  - Stream composition
  - CSV parsing
  - Batch processing
  - Promise-based async handling
  - Error handling in nested callbacks
- **Mitigating factors:**
  - Clear variable names
  - Linear flow
  - Well-documented stream pipeline

**4. Recursive Logic**
- **Location:** `app/managers/codes/findAndReserveCodes.js` (49 lines)
- **Complexity:** Medium
- **Reasons:**
  - Recursive function for retries
  - Multiple async operations
  - Conditional branching
  - Race condition handling
- **Mitigating factors:**
  - Clear recursion termination
  - Descriptive variable names
  - Ramda helpers for data extraction

### Complex Areas

**1. Datastore Operations**
- **Location:** `app/datastore/codes.js` (~129 lines)
- **Complexity:** High (but manageable)
- **Reasons:**
  - 10+ exported methods
  - Complex MongoDB query construction
  - Dynamic query building (STATUS_QUERY map)
  - Bulk operations
  - Multiple cursor operations
- **Mitigating factors:**
  - Each method well-isolated
  - Helper functions for query construction
  - Clear separation between query definition and execution
  - Consistent patterns across all methods

**Example of complexity:**
```javascript
const STATUS_QUERY = {
  [STATUS.AVAILABLE]: () => ({
    $or: [
      { 'date.reserved': { $exists: false } },
      { 'date.reserved': { $lte: getReservedExpiration() } }
    ],
    'date.assigned': { $exists: false }
  }),
  [STATUS.ASSIGNED]: () => ({ 'date.assigned': { $exists: true } }),
  [STATUS.RESERVED]: () => ({
    'date.assigned': { $exists: false },
    'date.reserved': { $gt: getReservedExpiration() }
  })
};
```
While complex, the pattern makes query logic reusable and testable.

**2. Context Transformation**
- **Location:** `lib/KoaCtxToManagerCtx.js` (39 lines)
- **Complexity:** Medium-High
- **Reasons:**
  - Multiple selector functions
  - Complex return object
  - Dependency injection
  - Instrumented operation factory
- **Mitigating factors:**
  - Clear JSDoc documentation
  - Well-defined return type
  - Consistent pattern used throughout

**3. Application Bootstrap**
- **Location:** `app/index.js` (56 lines)
- **Complexity:** Medium
- **Reasons:**
  - 10+ middleware registrations
  - Order-dependent setup
  - Multiple imports
  - Configuration extraction
- **Mitigating factors:**
  - Linear flow
  - Clear middleware ordering
  - Single responsibility per line
  - Descriptive variable names

**4. Service Instrumentation**
- **Location:** `app/services/InstrumentServices.js` (49 lines)
- **Complexity:** Medium-High
- **Reasons:**
  - Higher-order functions
  - Nested Ramda operations
  - Multiple instrumentation layers (timing + tracing)
  - Request decoration
- **Mitigating factors:**
  - Well-commented
  - Follows consistent pattern
  - Clear separation of concerns

## Functional Programming Patterns

The codebase heavily uses functional programming, which affects complexity perception:

### Positive Impacts on Complexity

1. **Immutability** - Reduces side effects and mental overhead
2. **Pure functions** - Easier to reason about and test
3. **Composition** - Breaks complex operations into simple pieces
4. **Higher-order functions** - Reduces code duplication

**Example:**
```javascript
const selectIds = R.pluck('_id');
const selectCodes = R.map(R.path(['_id', 'code']));
```
Clear, testable, reusable - low complexity despite functional style.

### Learning Curve Considerations

1. **Ramda library** - Requires familiarity with functional patterns
2. **Point-free style** - Can be less obvious to imperative programmers
3. **Currying** - Function signatures may be unclear without documentation

**Example of point-free style:**
```javascript
const findCodesCounts = ({ managerCtx, statuses, ...props }) => R.pipeP(
  MapAsyncParallel(
    async status => {
      const count = await managerCtx.datastore.codes.countCodesByStatus({ ...props, status });
      return [ status, count];
    }
  ),
  R.fromPairs
)(statuses);
```
Concise and elegant for FP practitioners, but may require adaptation for others.

## Nesting and Control Flow

### Nesting Depth Analysis

**Maximum nesting depth: 2** (enforced by ESLint)

This constraint forces flat, readable code:

**Example - Flat error handling:**
```javascript
export const uploadCodes = async(managerCtx, { isAuthSupreme, fileKey }) => {
  const found = fileKey && fileKey.match(uploadFileKeyRegex);

  if (!found) {
    throw error(invalidFileKey);
  }

  const { groups: { campaignId, type } } = found;

  if (!isAuthSupreme) {
    throw error(supremeUserRequired);
  }
  if (!typeSet.has(type)) {
    throw error(InvalidType({ type }));
  }

  return readAndStoreCodes(managerCtx, { campaignId, type, fileKey });
};
```

Early returns and flat if-statements instead of nested conditions.

### Control Flow Patterns

**Prohibited patterns (via ESLint):**
- `for`, `for...in`, `for...of` loops
- `while`, `do...while` loops
- `switch` statements

**Required patterns:**
- Functional iteration (map, filter, reduce)
- Async/await for asynchronous flow
- Guard clauses instead of nested ifs

## Async Complexity

### Async Patterns Used

1. **Async/await** - Primary pattern throughout
2. **Promise chains** - For stream processing
3. **Recursive async** - For retry logic
4. **Parallel execution** - Using `MapAsyncParallel`

**Example of clean async:**
```javascript
const findAndReserveCodes = async(managerCtx, { campaignId, count, type, reserveId, reservedCodes = [], counter = 0 }) => {
  if (counter > MAX_RETRIES) {
    return reservedCodes;
  }
  const codes = await managerCtx.datastore.codes.findAvailableCodes({ campaignId, count, type });
  const codesCount = codes.length;
  if (!codesCount) {
    return reservedCodes;
  }
  // ... more logic
};
```

Clear, sequential async operations with early returns.

## Dependencies and Coupling

### External Dependencies

- **Ramda** - Heavy usage for functional operations
- **Koa** - Web framework
- **@verifiedfan/* packages** - Internal shared libraries
- **MongoDB** - Database operations

### Coupling Analysis

**Low coupling:**
- Managers independent of HTTP layer
- Datastores abstracted behind interfaces
- Services injected via context

**Moderate coupling:**
- Heavy reliance on @verifiedfan libraries
- Ramda deeply integrated
- Configuration centralized but accessed widely

**High cohesion:**
- Related functions grouped in modules
- Clear domain boundaries (codes, auth, router)

## Recommendations

### Maintain Current Strengths

✅ **Keep enforcing:**
- Max complexity of 7
- Max nesting depth of 2
- Max file size of 200 lines
- Functional programming patterns

✅ **Continue using:**
- Small, focused functions
- Descriptive naming conventions
- Higher-order functions for reuse
- Early returns for clarity

### Consider for Improvement

1. **Add JSDoc comments to complex functions**
   - Particularly for functions using advanced Ramda patterns
   - Document expected types for better IDE support
   - Example: `InstrumentedAsyncOperation`, `InstrumentServices`

2. **Extract complex query builders**
   - `STATUS_QUERY` in `codes.js` could be its own module
   - Would improve testability of query logic
   - Current approach is acceptable but could be more modular

3. **Consider TypeScript migration**
   - Would add type safety to functional patterns
   - Reduce mental overhead of understanding function signatures
   - Make Ramda pipelines more obvious
   - Better IDE support for curried functions

4. **Document Ramda patterns**
   - For team members less familiar with functional programming
   - Add comments to complex pipelines
   - Consider a team guide for common Ramda patterns used

5. **Test complex recursive logic thoroughly**
   - `findAndReserveCodes` has retry logic that could fail edge cases
   - Add tests for race conditions
   - Document retry behavior

### Areas to Monitor

⚠️ **Watch for creep:**
- File size approaching 200-line limit
- Functions approaching complexity 7
- Deep object destructuring making code harder to follow

⚠️ **Potential refactoring candidates:**
- `app/datastore/codes.js` at 129 lines - consider splitting if it grows
- Stream processing in `readAndStoreCodes.js` - complex but necessary; document well

## Conclusion

**Overall complexity: Low to Medium**

The codebase maintains excellent complexity control through:
- Strong ESLint rules enforcing simplicity
- Functional programming reducing side effects
- Clear separation of concerns
- Small, focused functions and files

The main complexity comes from:
- Functional programming paradigm (learning curve)
- MongoDB query construction
- Async stream processing
- Retry and race condition handling

Despite these areas, the code is highly readable and maintainable due to consistent patterns, descriptive naming, and architectural discipline.
