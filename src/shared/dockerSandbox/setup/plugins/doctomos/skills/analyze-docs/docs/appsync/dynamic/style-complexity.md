# Code Complexity - appsync

## Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Avg function length** | ~30 lines | Measured across resolvers and functions |
| **Max function length** | 147 lines | `saveEntryRecord.ts` (includes DynamoDB expression building) |
| **Typical function length** | 20-45 lines | 80% of functions fall in this range |
| **Max nesting depth** | 2 levels | Enforced by ESLint (`max-depth: 2`) |
| **Cyclomatic complexity** | Max 7 | Enforced by ESLint (`complexity: 7`) |
| **Avg file size** | ~40 lines | Non-test files |
| **Max file size** | 147 lines | `saveEntryRecord.ts` |
| **Largest spec file** | 199 lines | `activateLnaa.spec.ts` |
| **Files > 200 lines** | 0 | Enforced by ESLint (`max-lines: 200`) |

## Complexity Distribution

### Simple Functions (< 20 lines)
**Count:** ~40% of codebase

**Examples:**
- `resolvers/identity.ts` - 24 lines - Extract identity from context
- `resolvers/checkLiveness.ts` - 10 lines - Passthrough resolver
- `resolvers/apiAccountFanscore.ts` - 15 lines - Validation-only resolver
- `resolvers/demandMutationTemplate.ts` - 17 lines - Extract request headers to stash
- `functions/getBotOrNotCursor.ts` - ~15 lines - Calculate cursor date

**Characteristics:**
- Single responsibility
- Minimal branching logic
- Direct data transformation
- No nested conditions

### Medium Functions (20-50 lines)
**Count:** ~50% of codebase

**Examples:**
- `resolvers/phonescore.ts` - 37 lines - Phone validation with multiple checks
- `functions/getAccountFanscoreMemberId.ts` - 42 lines - DynamoDB query with early returns
- `functions/getBotOrNot.ts` - 33 lines - Conditional data fetching
- `functions/calcVerificationScore.ts` - 27 lines - Score adjustment pipeline
- `resolvers/activateLnaa.ts` - 45 lines - HTTP request with validation

**Characteristics:**
- 2-3 logical branches
- Early return patterns
- Clear input validation
- Minimal state management

### Complex Functions (50-100 lines)
**Count:** ~8% of codebase

**Examples:**
- `functions/calcAccountScore.ts` - 78 lines - Multi-step score calculation pipeline
- `functions/saveDemandRecord.ts` - 85 lines - Complex DynamoDB update with many fields
- `resolvers/demandRecordQuery.ts` - 92 lines - Multiple query path handling

**Characteristics:**
- Sequential pipeline steps
- Multiple data transformations
- Complex DynamoDB operations
- Well-commented to maintain readability

### Very Complex Functions (100+ lines)
**Count:** ~2% of codebase

**Examples:**
- `functions/saveEntryRecord.ts` - 147 lines - Comprehensive entry record creation

**Complexity Drivers:**
- **Lines 36-68:** Header extraction (33 lines)
  - Origin object construction from request headers
  - Multiple nested objects (nudetect, ip, os, browser, detection)
- **Lines 72-101:** DynamoDB expression building (30 lines)
  - Conditional expression based on `savedEntry` flag
  - Separate `expressionNames` and `expressionValues` objects
- **Lines 103-130:** Expression values assembly (28 lines)
  - Conditional spread operator for update vs create

**Mitigation Strategies in Use:**
- Clear section comments
- Consistent naming patterns
- Grouped related logic
- Extracted helper functions where possible

## Complexity Observations

### Simple Areas

#### 1. Identity & Authentication
Files: `resolvers/identity.ts`, `resolvers/noop.ts`, `shared.ts:96-100`

**Why Simple:**
- Direct data extraction from context
- No branching logic
- Simple object destructuring and reassembly

**Example Pattern:**
```typescript
export function response(ctx: Context) {
  const { resolverContext } = ctx.identity as FanIdentity;
  return {
    ...resolverContext,
    location: { latitude, longitude }
  };
}
```

#### 2. Pipeline Orchestration
Files: `resolvers/apiAccountFanscore.ts`, `resolvers/demandMutationTemplate.ts`

**Why Simple:**
- Minimal logic, just setting up context
- Data extraction and validation only
- Delegates complexity to pipeline functions

**Example Pattern:**
```typescript
export function request(ctx: Context) {
  ctx.stash.eventId = ctx.args.options.eventId;
  ctx.stash.saleId = ctx.args.options.saleId;
  return {};
}
```

#### 3. Data Fetching Functions
Files: `functions/getCluster.ts`, `functions/getBotOrNotCursor.ts`

**Why Simple:**
- Single DynamoDB operation
- Early return for edge cases
- Straightforward response mapping

### Complex Areas

#### 1. Score Calculation Pipeline
File: `functions/calcAccountScore.ts` (78 lines)

**Complexity Sources:**
- Multiple sequential transformations
- Conditional logic for each step
- Feature flags and A/B testing logic
- Integration of 5 different adjustments

**Complexity Management:**
- Each step extracted to named function
- Clear comments numbering pipeline steps
- Pure functions for testability
- Exported helper functions for reuse

**Readability Rating:** Good (despite complexity, well-structured)

#### 2. DynamoDB Update Expressions
Files: `functions/saveEntryRecord.ts` (147 lines), `functions/saveDemandRecord.ts` (85 lines)

**Complexity Sources:**
- Large number of fields (15-20 per record)
- Conditional field updates based on create vs update
- DynamoDB expression syntax requirements
- Header extraction and transformation

**Complexity Management:**
- Grouped related fields together
- Used object destructuring for headers
- Separated expression, names, and values
- Helper functions for key generation

**Readability Rating:** Fair (high line count but organized)

#### 3. Query Path Branching
File: `resolvers/demandRecordQuery.ts` (92 lines)

**Complexity Sources:**
- Multiple query paths based on args
- Different DynamoDB query expressions per path
- Optional filter conditions
- Response transformation

**Complexity Management:**
- Early returns for auth check
- Consistent query structure reuse
- Clear if-else progression
- Shared operation template

**Readability Rating:** Good (branching is clear)

### Testing Complexity

**Unit Test Size:** Average 80-120 lines per spec file
**Largest Test:** 199 lines (`activateLnaa.spec.ts`)

**Test Patterns:**
- Multiple test cases per function (typically 4-6)
- Clear arrange-act-assert structure
- Descriptive test names
- Reusable test helper (`evaluateCode`)

**Test Complexity Drivers:**
- Complex context object setup
- Multiple edge cases to cover
- Mock data construction

## Areas Demonstrating Good Complexity Control

### 1. Early Return Pattern
**Used extensively to avoid nesting**

Example from `functions/getAccountFanscoreMemberId.ts:4-8`:
```typescript
if (ctx.prev.result?.score !== undefined) {
  runtime.earlyReturn(ctx.prev.result);
}

if (!memberId) {
  runtime.earlyReturn();
}
```

**Impact:**
- Reduces nesting from 3 levels to 1
- Makes happy path obvious
- Improves readability significantly

### 2. Helper Function Extraction
**Utility functions prevent duplication and reduce complexity**

Examples:
- `shared.ts:20-23` - `demandRecordKeys()` - Centralizes key generation
- `utils/index.ts:45-52` - `applyArmAdjustment()` - Encapsulates scoring logic
- `functions/calcAccountScore.ts:8-18` - Helper functions for each transformation

**Impact:**
- Functions stay under 50 lines
- Complexity hidden behind intention-revealing names
- Easier unit testing

### 3. Functional Composition
**Pipeline pattern for complex transformations**

Example from `functions/calcAccountScore.ts:45-67`:
```typescript
let score = baseScore;
score = applyArmAdjustment(ctx, score, armScore);
score = applyRandomization(score);
if (hasDemandRecord) {
  score = applyEventBoost(score);
}
score = applyBotZeroing(score, isBot);
const boostResult = applyScoreModelBoost(ctx, score);
score = boostResult.score;
```

**Impact:**
- Linear flow, easy to follow
- Each step independently testable
- Can add/remove steps easily
- Clear separation of concerns

### 4. Type Safety
**TypeScript types reduce cognitive complexity**

Examples:
- `FanIdentity` type makes identity structure explicit
- `Context` type from `@aws-appsync/utils` provides IDE support
- Custom types like `UpsertEntryInput` document function contracts

**Impact:**
- Fewer runtime checks needed
- Clear data structure expectations
- Better IDE autocomplete and error detection

## Complexity Trends

### Low Complexity Trend
**90% of files under 100 lines**

The codebase shows discipline in keeping individual files small and focused. ESLint enforcement of `max-lines: 200` and `max-depth: 2` prevents complexity creep.

### Complexity Isolation
**Complex operations are contained**

When complexity is unavoidable (DynamoDB expressions, score pipelines), it's isolated to specific functions with clear boundaries. The pipeline architecture ensures complex logic doesn't leak across the codebase.

### Functional Decomposition
**Complexity managed through composition**

Rather than building monolithic functions, the codebase composes small, focused functions. Example: The `accountFanscore` pipeline chains 8 functions, each under 50 lines.

## Recommendations

### Maintain Current Practices ✅

1. **Continue enforcing ESLint rules**
   - `max-lines: 200` prevents file bloat
   - `max-depth: 2` keeps nesting manageable
   - `complexity: 7` maintains cyclomatic complexity

2. **Keep using early returns**
   - Pattern works exceptionally well
   - Prevents nested conditionals
   - Makes code easier to follow

3. **Extract helper functions**
   - Current balance is good (not over-abstracted)
   - Utility functions are well-named
   - Prevents duplication

### Minor Improvements 🔧

1. **Consider extracting DynamoDB expression builders**

   Current: Expression building inline in functions (50-80 lines)

   Suggestion: Create reusable expression builder utilities
   ```typescript
   // utils/dynamodb.ts
   export const buildUpdateExpression = (fields, options) => {
     // Centralize expression building logic
   };
   ```

   **Benefit:** Reduce duplication in `saveEntryRecord.ts` and `saveDemandRecord.ts`

2. **Document complex pipeline orchestration**

   Files like `calcAccountScore.ts` are well-commented, but adding a high-level overview comment would help:
   ```typescript
   /**
    * Calculates final fanscore by applying transformations in order:
    * 1. ARM adjustment (risk-based scoring)
    * 2. Randomization (±10% variance)
    * 3. Event boost (+0.025 if demand exists)
    * 4. Bot zeroing (0 if bot detected)
    * 5. Model boost (A/B test variant)
    */
   ```

3. **Split large test files**

   Test files approaching 200 lines (`activateLnaa.spec.ts` at 199 lines) could be split by test suite:
   ```
   activateLnaa.request.spec.ts
   activateLnaa.response.spec.ts
   activateLnaa.validation.spec.ts
   ```

### Not Recommended ❌

1. **Don't add abstraction layers prematurely**
   - Current direct AWS SDK usage is appropriate for AppSync resolvers
   - Adding DAL/repository pattern would increase complexity without benefit

2. **Don't consolidate similar resolvers**
   - Small, focused files are easier to understand
   - Combining would violate single responsibility principle

3. **Don't reduce TypeScript strictness**
   - Current `noImplicitAny: false` setting is reasonable for AWS SDK integration
   - Increasing strictness may add type gymnastics without readability benefit

## Conclusion

**Overall Complexity Rating: Low to Moderate**

The appsync codebase demonstrates excellent complexity management:
- **90% of functions are simple to medium complexity**
- **Complex areas are well-isolated and documented**
- **Functional patterns prevent complexity propagation**
- **ESLint rules enforce maintainability**

The few complex areas (DynamoDB operations, score calculation) are inherently complex problems and are handled as well as possible given the constraints. The architecture's use of pipeline composition and functional decomposition prevents these complex areas from affecting the broader codebase.

**Key Success Factors:**
1. Strict enforcement of complexity limits
2. Consistent use of early returns
3. Function extraction at appropriate granularity
4. Clear separation of concerns via pipeline architecture
5. Strong naming conventions that reduce cognitive load
