# Code Complexity - fan-identity-workers

## Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Avg function length | ~20-30 lines | Enforced by ESLint `max-lines: 200` and complexity rules |
| Max nesting depth | 2 | Enforced by ESLint `max-depth: 2` |
| Max cyclomatic complexity | 6 | Enforced by ESLint `complexity: 6` |
| Avg file size | ~50-80 lines | Worker files: 26-123 lines; shared utilities: 2-159 lines |
| Largest files | 157-159 lines | `Worker.ts` (type definitions), `processSQSRecords.ts` (middleware) |
| Smallest files | 2-10 lines | Utility files (`object.ts`, `constants.js`) |

## File Size Distribution

### Worker Files (`apps/`)
```
  26 lines - scoreUsers/index.ts
  29 lines - enqueueFromVfStream/index.ts
  30 lines - startBotOrNotImport/index.ts
  36 lines - enqueueFromStream/index.ts, lookupArai/index.ts
  56 lines - checkLiveness/index.ts, enqueueFromPurchaseStream/index.ts
  64 lines - validateToken/index.ts
  73 lines - getArmScore/index.ts
 123 lines - ProcessAccountScores.ts (most complex worker logic)
```

**Average worker file: 48 lines**

### Shared Utilities (`shared/`)
```
   2 lines - util/object.ts
   5 lines - constants.js, ComposeMiddlewares.js
  10 lines - config/resolveWorkerConfig.js, enums.js
  26 lines - config/index.js
  31 lines - util/date.ts, setRecordCorrelations.js
  88 lines - services/queue/QueueManager.ts
 120 lines - services/identity/rules/index.ts
 157 lines - appResolver/Worker.ts (type definitions)
 159 lines - middlewares/processSQSRecords.ts
```

**Average shared file: 52 lines**

## Complexity Observations

### Simple Areas

#### 1. **Worker Entry Points** (apps/)
Most worker files are exceptionally simple, following a consistent pattern:

**Example: `apps/scoring/enqueueFromStream/index.ts` (36 lines)**
- Single exported function
- No branching logic
- Delegates to helper functions
- Clear input → process → output flow

**Characteristics:**
- Linear execution (no loops or conditionals)
- Minimal dependencies (1-3 injected services)
- Pure business logic extraction
- Type-safe interfaces

**Complexity score: 1-2** (cyclomatic complexity)

#### 2. **Utility Functions** (shared/util/)
Small, focused, single-purpose functions:

**Example: `shared/util/date.ts` (31 lines)**
- 2 exported functions
- No complex conditionals
- Simple arithmetic operations

**Example: `shared/util/normalizers.ts` (13 lines)**
- Single function with 3 branches for type checking
- No nesting

**Complexity score: 2-3** (cyclomatic complexity)

#### 3. **Type Definitions** (*.d.ts, Worker.ts)
Purely declarative TypeScript types with no logic:

**Example: `shared/appResolver/Worker.ts` (157 lines)**
- All type definitions
- No executable code
- Zero complexity

#### 4. **Configuration Files** (shared/config/)
Simple data loading and transformation:

**Example: `shared/config/index.js` (26 lines)**
- Straightforward config loading
- No complex logic
- Environment variable checks

**Complexity score: 1-2**

### Moderate Complexity Areas

#### 1. **Service Factories** (shared/services/)

**Example: `shared/services/queue/QueueManager.ts` (88 lines)**
- Factory pattern with currying
- Uses Ramda composition (`R.pipe`)
- Error handling with try/catch
- Async batch processing

**Complexity drivers:**
- Higher-order functions (factory returns functions)
- Ramda pipeline transformations
- Async/Promise handling

**Complexity score: 4-5** (per function)

#### 2. **Middleware Orchestration** (shared/middlewares/)

**Example: `shared/middlewares/processSQSRecords.ts` (159 lines)**
- Generic processing pipeline
- Error boundary around processing
- Result aggregation with reduce
- Multiple code paths (processed vs unprocessed)

**Complexity drivers:**
- Generic types (`<TRecord>`)
- Higher-order functions (takes processing function as input)
- Accumulator pattern in reduce

**Complexity score: 5-6** (per function)

#### 3. **Data Transformation** (apps/scoring/scoreUsers/)

**Example: `ProcessAccountScores.ts` (123 lines)**
- Multiple transformation steps
- Async retry logic
- Database operations
- Error handling per operation

**Complexity drivers:**
- Sequential async operations
- Multiple data sources (model, database)
- Error recovery paths

**Complexity score: 5-6** (main function)

### Complex Areas

#### 1. **Rules Engine** (shared/services/identity/rules/)

**File: `shared/services/identity/rules/index.ts` (120 lines)**

**Complexity drivers:**
- Combinator pattern (`All`, `Any`, `WithTier`)
- Recursive rule evaluation
- Sequential async with early exit (requires imperative loop)
- Accumulation of decisions across multiple rules
- Detail merging from nested structures

**Specific complex sections:**

**`All` combinator (lines 64-89):**
```typescript
export const All = (rules: LivenessRules[]): LivenessRules => ({
  check: async options => {
    const decisions: LivenessRuleDecision[] = [];

    /* eslint-disable fp/no-loops, no-restricted-syntax, no-await-in-loop */
    for (const rule of rules) {
      const decision = await rule.check(options);

      if (!decision.requiresVerification) {
        return decision;  // Short-circuit on first negative
      }

      decisions.push(decision);
    }
    /* eslint-enable */

    return {
      requiresVerification: true,
      rule: 'all',
      details: { ...mergeDetails(decisions) },
      verificationType: decisions.find(decision => decision.verificationType)?.verificationType
    };
  }
});
```

**Why it's complex:**
- Must execute rules sequentially (not parallel) for short-circuit behavior
- Violates FP conventions (uses imperative loop, mutation)
- Merges nested decision details
- Finds first `verificationType` in decisions

**Complexity score: 6** (at ESLint limit)

**`mergeDetails` helper (lines 38-58):**
```typescript
const mergeDetails = (decisions: LivenessRuleDecision[]): Record<string, unknown> =>
  decisions.reduce(
    (acc, decision) => {
      const details = decision.details;
      const rule = decision.rule;
      const childRules = details?.rules;
      const hasChildRules = Array.isArray(childRules);

      const allRules = [
        ...(acc.rules as string[]),
        ...(hasChildRules ? childRules : [rule])
      ];

      return {
        ...acc,
        ...details,
        rules: [...new Set(allRules)]
      };
    },
    { rules: [] as string[] }
  );
```

**Why it's complex:**
- Recursive structure (decisions can have nested child decisions)
- Conditional array handling
- Spread operations at multiple levels
- Set deduplication

**Complexity score: 5**

**Overall file complexity: 7-8** (combination of functions)

#### 2. **Vendor Integration** (shared/services/identity/vendor/persona/)

**File: `PersonaIDVVendor.ts` (159 lines)**

**Complexity drivers:**
- HTTP request handling with error cases
- JSON parsing and validation
- Multiple response status codes
- Signature validation integration
- Type coercion and mapping

**Specific complex sections:**

**`createSession` method (lines 85-125):**
- Constructs complex request body
- Handles 201 vs error responses
- Parses JSON response
- Transforms vendor format to internal format

**Complexity score: 5**

**`isValidPersonaEvent` guard (lines 73-74):**
```typescript
const isValidPersonaEvent = (payload: unknown): payload is PersonaEvent =>
  payload !== null && typeof payload === 'object' && 'data' in payload;
```

**Why it's complex (despite being 2 lines):**
- TypeScript type guard
- Runtime type checking
- Chained boolean logic

**Complexity score: 3**

**Overall file complexity: 6-7**

#### 3. **Stream Processing** (shared/PutManyToStream/)

**File: `PutManyToKinesisStream.js` (52 lines)**

**Complexity drivers:**
- Ramda async pipeline (`R.pipeP`)
- Dynamic shard count calculation
- Memoization
- Parallel batch processing
- Nested transformations

**Main pipeline (lines 40-49):**
```javascript
const PutManyToKinesisStream = ({ stream, makePartitionKey, __meta }) => R.pipeP(
  records => Promise.resolve(records),
  FormatRecords({ __meta, makePartitionKey }),
  list => splitInChunks({ list, stream }),
  MapAsyncParallel(
    BatchFn({ fn: PutMany({ stream }), batchSize: MAX_WRITE_COUNT })
  ),
  R.unnest,
  aggregateCounts
);
```

**Why it's complex:**
- 7-step async pipeline
- Higher-order functions (`MapAsyncParallel`, `BatchFn`)
- Curried function composition
- Implicit data flow (no intermediate variables)

**Complexity score: 6-7**

**`getMemoizedShardCount` (lines 23-26):**
```javascript
export const getMemoizedShardCount = R.memoizeWith(
  R.propOr('genericStream', 'name'),
  stream => getShardCount(stream)
);
```

**Why it's complex:**
- Ramda memoization
- Dynamic cache key extraction
- Async function memoization

**Complexity score: 4**

**Overall file complexity: 8** (high due to functional composition density)

## Nesting Depth Analysis

The codebase adheres strictly to `max-depth: 2`, but achieves this through different strategies:

### Strategy 1: Early Returns (Preferred)
```typescript
// apps/auth/validateToken/index.ts:30-36
if (apiKey !== APPSYNC_KEY) {
  return { ...DEFAULT_RESPONSE, isAuthorized: false };
}

if (!sotc) {
  return DEFAULT_RESPONSE;
}
```

**Benefits:**
- Reduces nesting
- Makes error paths explicit
- Improves readability

### Strategy 2: Function Extraction
```typescript
// Instead of nested conditionals, extract to helper functions
const scorableActivities = selectScorableActivities(input);
const sendResult = await accountActivityQueueManager.sendMessages(scorableActivities);
```

**Benefits:**
- Each function stays shallow
- Testable in isolation
- Self-documenting names

### Strategy 3: Ternary Operators (Used Sparingly)
```typescript
// shared/util/date.ts:28
const intervalInMilliseconds = typeof interval === 'number' ? interval : timeInMilliseconds(interval);
```

**Benefits:**
- Single level of nesting
- Clear for simple branching

**Caution:** `no-nested-ternary` rule prevents deep ternary trees

### Strategy 4: ESLint Disable (Rare)
```typescript
// shared/services/identity/rules/index.ts:68-78
/* eslint-disable fp/no-loops, no-restricted-syntax, no-await-in-loop */
for (const rule of rules) {
  const decision = await rule.check(options);
  if (!decision.requiresVerification) {
    return decision;
  }
  decisions.push(decision);
}
/* eslint-enable */
```

**Used when:**
- Functional approach would be less clear
- Performance is critical (avoid creating all promises upfront)
- Sequential async with early exit required

## Function Length Analysis

Most functions stay well under the 200-line file limit by following single responsibility:

### Short Functions (1-10 lines): ~70% of codebase
**Examples:**
```typescript
// shared/util/object.ts (2 lines)
export const omitUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined)) as Partial<T>;

// apps/scoring/scoreUsers/index.ts:14-15 (2 lines)
export const selectAraiResponses = (records: DynamoDbChangeRecord[]): UserAccountActivity[] =>
  records.map(({ newItem: { araiResponse } }) => araiResponse);
```

### Medium Functions (10-30 lines): ~25% of codebase
**Examples:**
```typescript
// shared/services/queue/QueueManager.ts:34-58 (25 lines)
export const SendMessageBatch = (queue: SQSClient) =>
  async(messages: SQSMessage[]): Promise<SendMessageBatchOutput> => {
    // ... implementation
  };

// apps/auth/validateToken/index.ts:19-62 (44 lines)
const handler: AppSyncAuthorizerWorker<ResolverContext, Services> = async({ input, Services }) => {
  // ... implementation
};
```

### Long Functions (30-60 lines): ~5% of codebase
**Examples:**
```typescript
// shared/middlewares/processSQSRecords.ts:46-66 (21 lines)
// Complex reduce with mutation
return results.reduce((acc, { result, record }) => {
  // ... implementation
}, emptyResults<TRecord>());

// shared/services/identity/rules/index.ts:64-89 (26 lines)
export const All = (rules: LivenessRules[]): LivenessRules => ({
  check: async options => {
    // ... implementation with loop
  }
});
```

## Cyclomatic Complexity Hotspots

Files that push the `complexity: 6` limit:

### 1. `shared/services/identity/rules/index.ts`
**Complexity: 6-7 per combinator**

**Drivers:**
- Multiple conditional branches (if/else in loop)
- Early returns
- Optional chaining (`?.`)
- Array operations with conditionals

### 2. `shared/middlewares/processSQSRecords.ts`
**Complexity: 5-6 per function**

**Drivers:**
- Status enum branching (`processed` vs `unprocessed`)
- Conditional detail merging
- Error handling paths
- Accumulator updates

### 3. `apps/scoring/scoreUsers/ProcessAccountScores.ts`
**Complexity: 5-6 for main function**

**Drivers:**
- Multiple async operations
- Null checks
- Error handling per stage
- Conditional result construction

### 4. `shared/util/date.ts` (line 3: `/* eslint-disable complexity */`)
**Complexity: 6**

**Drivers:**
- Accumulation of 6 optional time units
- Multiple null coalescing operators (`??`)

```typescript
export const timeInMilliseconds = (interval: TimeInterval): number => {
  const { SECOND, MINUTE, HOUR, DAY, WEEK } = intervalMilliseconds;
  let milliseconds = 0;

  milliseconds += (interval.milliseconds ?? 0);
  milliseconds += (interval.seconds ?? 0) * SECOND;
  milliseconds += (interval.minutes ?? 0) * MINUTE;
  milliseconds += (interval.hours ?? 0) * HOUR;
  milliseconds += (interval.days ?? 0) * DAY;
  milliseconds += (interval.weeks ?? 0) * WEEK;

  return milliseconds;
};
```

**Note:** This exceeds complexity limit, but ESLint is disabled because the linear accumulation pattern is clearer than alternatives.

## Test Complexity

Test files have relaxed rules:
- `fp/no-let: off`
- `fp/no-mutation: off`
- `@typescript-eslint/no-explicit-any: off`

**Rationale:** Tests prioritize readability and setup convenience over functional purity.

**Typical test structure:**
```typescript
describe('feature', () => {
  let services: jest.Mocked<Partial<Services>>;
  let mockQueue: jest.Mocked<QueueManager<GlobalUserIdActivity>>;

  beforeEach(() => {
    mockQueue = { sendMessages: jest.fn().mockReturnValue({ failed: 0, queued: 2 }) };
    services = { accountActivityQueueManager: mockQueue };
  });

  it('handles success case', async() => {
    const result = await worker({ input, Services: services });
    expect(result).toEqual({ queued: 2, failed: 0 });
  });
});
```

**Test complexity: Low** (1-3 per test)

## Recommendations

### 1. **Reduce Ramda Pipeline Density**
**Current state:** Heavy use of `R.pipeP` and `R.pipe` in stream processing makes debugging difficult.

**Recommendation:** Use intermediate variables for complex pipelines:
```javascript
// Instead of:
const PutManyToKinesisStream = ({ stream, makePartitionKey, __meta }) => R.pipeP(
  records => Promise.resolve(records),
  FormatRecords({ __meta, makePartitionKey }),
  list => splitInChunks({ list, stream }),
  MapAsyncParallel(BatchFn({ fn: PutMany({ stream }), batchSize: MAX_WRITE_COUNT })),
  R.unnest,
  aggregateCounts
);

// Consider:
const PutManyToKinesisStream = ({ stream, makePartitionKey, __meta }) =>
  async(records) => {
    const formatted = FormatRecords({ __meta, makePartitionKey })(records);
    const chunks = await splitInChunks({ list: formatted, stream });
    const batchResults = await MapAsyncParallel(
      BatchFn({ fn: PutMany({ stream }), batchSize: MAX_WRITE_COUNT })
    )(chunks);
    return aggregateCounts(R.unnest(batchResults));
  };
```

**Impact:** Improves debuggability and stack traces without sacrificing correctness.

### 2. **Extract Helper Functions for Complex Reduces**
**Current state:** `processSQSRecords.ts` and `rules/index.ts` have complex reduce logic.

**Recommendation:** Extract accumulator update logic:
```typescript
// Instead of inline reduce:
return results.reduce((acc, { result, record }) => {
  // 20 lines of mutation
}, emptyResults());

// Extract:
const updateAccumulator = (acc, { result, record }) => ({
  unprocessed: addIfUnprocessed(acc.unprocessed, result, record),
  count: updateCount(acc.count, result)
});

return results.reduce(updateAccumulator, emptyResults());
```

### 3. **Add Complexity Budget Tracking**
**Current state:** Complexity is enforced at file/function level but not tracked globally.

**Recommendation:** Add complexity metrics to CI/CD:
- Track average complexity per commit
- Flag PRs that increase complexity
- Set budget for complexity growth

### 4. **Document Rationale for ESLint Disables**
**Current state:** Some ESLint disables lack explanation.

**Recommendation:** Always include comment explaining why:
```typescript
// Good:
/* eslint-disable fp/no-loops, no-restricted-syntax, no-await-in-loop */
// Sequential async execution required for rule short-circuit behavior
for (const rule of rules) {
  // ...
}
/* eslint-enable */

// Bad:
/* eslint-disable complexity */
export const timeInMilliseconds = (interval: TimeInterval): number => {
  // ... (no explanation why complexity is acceptable)
};
```

### 5. **Consider Splitting Large Service Files**
**Current state:** `PersonaIDVVendor.ts` (159 lines) combines HTTP logic, parsing, and validation.

**Recommendation:** Split by responsibility:
- `PersonaIDVVendor.ts` - Core vendor interface implementation
- `PersonaPayloadParser.ts` - JSON parsing and validation
- `PersonaRequestBuilder.ts` - HTTP request construction

**Benefit:** Each file stays under 100 lines, easier to understand and test.

### 6. **Standardize Error Handling Patterns**
**Current state:** Mix of try/catch, `.then()`, and `async-retry`.

**Recommendation:** Document standard patterns:
- Use `async-retry` for transient failures (network, rate limits)
- Use try/catch for validation failures (don't retry)
- Always log errors before returning fallback values

### 7. **Add Complexity Examples to CLAUDE.md**
**Current state:** CLAUDE.md documents architecture but not complexity patterns.

**Recommendation:** Add section with examples:
- How to keep functions under complexity: 6
- When to extract helpers
- When ESLint disables are acceptable
- Ramda composition best practices

## Strengths

✅ **Enforced limits work well**
- `max-depth: 2` forces better structure
- `complexity: 6` prevents overly complex functions
- `max-lines: 200` keeps files focused

✅ **Functional style reduces cognitive load**
- Immutability eliminates mutation bugs
- Pure functions are predictable
- Composition is explicit

✅ **Consistent patterns**
- All workers follow same structure
- Middleware system is uniform
- Factory pattern for services

✅ **Good separation of concerns**
- Workers delegate to services
- Services delegate to utilities
- Clear dependency boundaries

## Weaknesses

⚠️ **Ramda over-reliance**
- `R.pipeP` and `R.pipe` create dense, hard-to-debug code
- Stack traces are unhelpful
- Not all team members may know Ramda well

⚠️ **Type complexity**
- Generic types (`Worker<Event, Result, Services>`) add cognitive overhead
- TypeScript error messages can be cryptic
- New developers need time to understand type system

⚠️ **Imperative escape hatches**
- Some files disable FP rules for performance
- Creates inconsistency in codebase
- Not always clear when to use imperative vs functional

⚠️ **Limited inline documentation**
- Self-documenting code works for simple cases
- Complex patterns (rules engine, combinators) need more explanation
- ESLint disables don't always explain rationale
