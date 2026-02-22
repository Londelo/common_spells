# Code Complexity - dmd-workers

## Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Total source files | 189 | .js and .ts files |
| Avg function length | ~15 lines | Short, focused functions |
| Max nesting depth | 2 | Enforced by ESLint (max-depth: 2) |
| Max cyclomatic complexity | 6 | Enforced by ESLint (complexity: 6) |
| Avg file size | ~70 lines | Most files well under 200-line limit |
| Largest production file | 194 lines | `normalizeEventDetails.js` |
| Largest test file | 464 lines | `normalizeEventDetails.spec.js` |
| Max file size (enforced) | 200 lines | ESLint max-lines rule |

## Distribution Analysis

### File Size Distribution

| Range | Count | Examples |
|-------|-------|----------|
| 1-50 lines | ~110 | Most utility files, helpers |
| 51-100 lines | ~45 | Standard worker files |
| 101-150 lines | ~20 | Complex workers, larger specs |
| 151-200 lines | ~10 | Near-limit files |
| 200+ lines | ~4 | Test files (specs exempt from limit) |

### Complexity Hot Spots

**Top 10 Largest Production Files:**
1. `shared/GetAndCacheEventDetails/normalizeEventDetails.js` - 194 lines
2. `shared/middlewares/index.js` - 113 lines
3. `shared/PutManyToStream/utils.js` - 111 lines
4. `apps/notificationScheduler/index.js` - 113 lines
5. `apps/notificationGenerator/GenerateNotifications.js` - 132 lines
6. `shared/GetAndCacheEventDetails/CacheEventDetails.js` - 99 lines
7. `shared/middlewares/SQSResultHandler.js` - 96 lines
8. `shared/format.js` - 79 lines
9. `shared/instrumentation.js` - 75 lines
10. `shared/GetAndCacheEventDetails/selectors/selectIsSuppressed.js` - 80 lines

Most files are **well under** the 200-line limit. The few that approach it are complex business logic modules (event normalization, sale processing).

## Complexity Observations

### Simple Areas

These areas demonstrate excellent simplicity and are easy to understand:

#### 1. **Middleware Composition System**
- **Files:** `shared/middlewares/ComposeMiddlewares.js` (5 lines)
- **Complexity:** Very Low
- **Why Simple:** Pure function composition using Ramda, single responsibility
- **Example:** `const ComposeMiddlewares = orderedMiddlewares => R.compose(...orderedMiddlewares);`

#### 2. **Configuration Resolution**
- **Files:** `shared/config/resolveWorkerConfig.js` (10 lines)
- **Complexity:** Very Low
- **Why Simple:** Single-purpose, straightforward data transformation
- **Example:** Takes worker name, returns config object - no conditionals, no side effects

#### 3. **Simple Workers (Template Pattern)**
- **Files:**
  - `apps/shortenEventUrl/index.js` - 48 lines
  - `shared/selectors.js` - 11 lines
  - `apps/shortenEventUrl/predicates.js` - 6 lines
- **Complexity:** Low
- **Why Simple:**
  - Clear data pipeline: input → validate → transform → output
  - Each step is a named function
  - Early returns for edge cases
  - No deep nesting (max depth: 1)

#### 4. **Utility Functions**
- **Files:** Most files in `shared/` under 50 lines
- **Complexity:** Low
- **Why Simple:**
  - Single-purpose functions
  - Heavy use of Ramda for data manipulation
  - Declarative style eliminates imperative complexity
  - **Example:** `shared/format.js:67-75` - Pure data transformation using R.pipe

#### 5. **Predicates and Selectors**
- **Files:** `apps/*/predicates.js`, `shared/selectors.js`
- **Complexity:** Very Low
- **Why Simple:**
  - One-liners or simple compositions
  - Clear names reveal behavior
  - **Example:** `export const hasShortUrl = HasProp('shortUrl');`

### Complex Areas

These areas are more challenging to understand and maintain:

#### 1. **Event Details Normalization** ⚠️
- **Files:** `shared/GetAndCacheEventDetails/normalizeEventDetails.js` (194 lines)
- **Complexity:** High
- **Why Complex:**
  - Business logic for normalizing Ticketmaster API responses
  - Multiple transformations: events, sales, presales, campaigns
  - Conditional logic for suppression, artist campaigns, sale types
  - Sale type parsing with keyword matching
  - Duplicate handling
  - Mix of synchronous and asynchronous operations
  - 15+ helper functions with interdependencies
- **Cyclomatic Complexity:** ~10-12 (near threshold)
- **Key Functions:**
  - `normalizeSales` - Orchestrates public sale and presale normalization
  - `normalizePresale` - Complex logic for campaign overlap, suppression
  - `SelectValidPresales` - Validation with multiple conditions
  - `getOverlappingActiveCampaign` - Date range calculations

**Mitigation:**
- Well-tested (464-line spec file)
- Broken into small helper functions
- Uses R.applySpec for declarative transformations
- Clear separation between normalization steps

#### 2. **Notification Scheduler** ⚠️
- **Files:** `apps/notificationScheduler/index.js` (113 lines)
- **Complexity:** Moderate-High
- **Why Complex:**
  - Async pipeline with 10+ steps
  - Database queries with time-range filtering
  - Batch processing with parallel execution
  - Error handling across multiple async operations
  - Sale scheduling logic with timezone considerations
  - Complex R.pipeP chain with nested transformations
- **Key Functions:**
  - `ProcessScheduledSales` - 14-step async pipeline
  - `QueryCachedSalesByTimeRange` - DynamoDB query with date logic
  - `makeSchedule` - Time window calculation
  - `FilterSalesBySchedule` - Temporal filtering

**Mitigation:**
- Each step is a named function
- Batch size limited (25) to control concurrency
- Logging at key points
- Error handling in query operations

#### 3. **Notification Generator** ⚠️
- **Files:** `apps/notificationGenerator/GenerateNotifications.js` (132 lines)
- **Complexity:** Moderate
- **Why Complex:**
  - Multiple notification types (SMS, email)
  - Template variable formatting
  - Locale-specific message generation (i18n)
  - Date/time formatting with timezones
  - Contact method parsing
  - Artist name normalization (accent removal for English)
  - Memoization for performance
- **Key Functions:**
  - `generateMessageByLocale` - Memoized i18n message generation
  - `GenerateNotifications` - Multi-step pipeline: query → map → flatten
  - `normalizeSales` - Complex data transformation
  - Multiple date formatters: `parseSaleStartTime`, `parseEventStartTime`, etc.

**Mitigation:**
- Clear separation between SMS and email generation
- R.applySpec for declarative data shaping
- Memoization prevents repeated i18n lookups
- Well-tested (109-line spec)

#### 4. **Message Sending with Retry Logic** ⚠️
- **Files:** `apps/notificationSend/SendMessage.js` (84 lines)
- **Complexity:** Moderate
- **Why Complex:**
  - Retry logic with exponential backoff
  - Error classification (retryable vs permanent)
  - Multiple error paths (500 errors, RETRYABLE_REASONS, max attempts)
  - Status transformations (CREATED → TRIGGERED/RETRY/FAILED)
  - Async-retry library with custom options
  - Complex error destructuring in catch block
  - Two app IDs based on notification type
- **Key Functions:**
  - `SendMessage` - Main function with try/catch, retry, state updates
  - `normalizeNotificationRecord` - Record transformation with defaults
  - Error handling logic buried in catch block

**Mitigation:**
- Helper functions for record transformations
- Status transformers extracted to utils
- Retry config externalized
- Well-tested (87-line spec with retry scenarios)

#### 5. **Middleware System** ⚠️
- **Files:** `shared/middlewares/index.js` (113 lines)
- **Complexity:** Moderate
- **Why Complex:**
  - 10+ middleware types (Kinesis, DynamoDB, SQS, Kafka, etc.)
  - Different middleware chains per type
  - Order-dependent composition
  - Mix of record transformers, service injectors, result handlers
  - Type-based routing
- **Key Functions:**
  - `MiddlewaresByType` - Large object mapping types to middleware arrays
  - `resolveMiddlewares` - Type-based middleware resolution
  - `middlewares` - Composition orchestrator

**Mitigation:**
- Each middleware type clearly documented
- Consistent middleware signature
- Middleware composition is pure function composition
- Clear separation of concerns (transform, correlate, trace, handle)

#### 6. **Sale Suppression Logic**
- **Files:** `shared/GetAndCacheEventDetails/selectors/selectIsSuppressed.js` (80 lines)
- **Complexity:** Moderate
- **Why Complex:**
  - Multiple suppression criteria (sale types, keywords, artist IDs)
  - Boolean logic combining different checks
  - Keyword matching with case-insensitive comparison
  - SALE_TYPE_KEYWORDS array with nested arrays

**Mitigation:**
- Clear predicate functions
- Boolean logic using R.either, R.allPass
- Well-tested (90-line spec)

## Complexity Trends

### What Keeps Complexity Low

1. **Functional Programming**
   - No mutable state reduces cognitive load
   - Pure functions are easier to reason about
   - Composition over imperative logic

2. **Strict ESLint Rules**
   - Complexity limit (6) prevents complex functions
   - Max depth (2) prevents deep nesting
   - Max lines (200) prevents large files
   - No loops forces declarative style

3. **Ramda Library**
   - Declarative data transformations
   - Pipeline style reveals data flow
   - R.applySpec eliminates manual object building

4. **Small Files**
   - Most files under 100 lines
   - Single responsibility per file
   - Easy to understand in isolation

5. **Factory Pattern**
   - Consistent structure across workers
   - Dependencies injected, not imported
   - Testability built-in

### What Increases Complexity

1. **Business Logic Complexity**
   - Ticketmaster API normalization has inherent complexity
   - Sale suppression rules are domain-specific
   - Notification scheduling involves time calculations

2. **Async Pipelines**
   - R.pipeP chains can be hard to debug
   - Error handling in long async pipelines
   - Parallel execution adds concurrency concerns

3. **External Integrations**
   - SMS service with retry logic
   - DynamoDB queries with complex filters
   - Discovery service for event lookups

4. **Multi-Step Transformations**
   - Event → Sales → Presales → Notifications
   - Each step adds complexity
   - Interdependencies between steps

## Complexity by Layer

| Layer | Avg Complexity | Notes |
|-------|---------------|-------|
| **Apps (Workers)** | Low-Moderate | Most workers 50-100 lines, clear purpose |
| **Shared Utilities** | Very Low | Single-purpose helpers, 5-50 lines |
| **Shared Config** | Low | Straightforward configuration resolution |
| **Shared Middlewares** | Low-Moderate | Simple individual middlewares, complex composition |
| **GetAndCacheEventDetails** | High | Business logic complexity, well-isolated |
| **Test Files** | Variable | Some tests complex due to mocking requirements |

## Recommendations

### ✅ Keep Doing

1. **Maintain strict ESLint rules** - Complexity limits prevent technical debt
2. **Use Ramda pipelines** - Declarative style aids comprehension
3. **Small, focused files** - Current file sizes are excellent
4. **Factory pattern for workers** - Consistent, testable structure
5. **Pure functions** - Functional paradigm working well

### 🔄 Consider Improving

1. **Event Normalization Complexity**
   - Consider breaking `normalizeEventDetails.js` into sub-modules
   - Extract sale type logic to separate file
   - Document business rules more thoroughly

2. **Long Async Pipelines**
   - Add inline comments to R.pipeP chains explaining each step
   - Consider intermediate variables for clarity in complex pipelines
   - Example: `notificationScheduler/index.js:82-96`

3. **Error Handling**
   - Extract error classification logic to reusable utilities
   - Document which errors are retryable and why
   - Example: `notificationSend/SendMessage.js:73-81`

4. **Documentation**
   - Add JSDoc to complex functions explaining business logic
   - Document the "why" behind suppression rules
   - Explain campaign overlap logic

5. **Type Safety**
   - Continue TypeScript migration for complex modules
   - Add types to worker signatures
   - Type the Services object

### ❌ Avoid

1. **Don't relax ESLint rules** - Current limits are working
2. **Don't create god objects** - Keep files focused
3. **Don't bypass functional patterns** - Consistency is key
4. **Don't nest callbacks** - Use R.pipeP for async operations
5. **Don't duplicate business logic** - Already well-abstracted

## Complexity Score by Module

| Module | Score | Justification |
|--------|-------|---------------|
| `apps/shortenEventUrl` | ⭐ (Simple) | Clear pipeline, 48 lines, no complex logic |
| `apps/notificationSend` | ⭐⭐ (Low) | Retry logic adds some complexity, but well-structured |
| `apps/notificationGenerator` | ⭐⭐⭐ (Moderate) | Multiple transformations, i18n, but manageable |
| `apps/notificationScheduler` | ⭐⭐⭐ (Moderate) | Async pipeline, time logic, batch processing |
| `shared/middlewares` | ⭐⭐⭐ (Moderate) | Many types, but each middleware is simple |
| `shared/GetAndCacheEventDetails` | ⭐⭐⭐⭐ (High) | Complex business logic, near limits, but well-tested |
| `shared/config` | ⭐ (Simple) | Straightforward configuration management |
| `shared/format` | ⭐⭐ (Low) | Date formatting, mostly pure transformations |
| `shared/utils` | ⭐ (Simple) | Simple helper functions |

**Legend:**
- ⭐ (Simple): 1-50 lines, low cyclomatic complexity, easy to understand
- ⭐⭐ (Low): 51-100 lines, some conditional logic, straightforward
- ⭐⭐⭐ (Moderate): 101-150 lines, multiple concerns, requires focus to understand
- ⭐⭐⭐⭐ (High): 150+ lines, complex business logic, multiple interdependencies

## Summary

The dmd-workers codebase demonstrates **excellent complexity management** through:
- Strict ESLint enforcement
- Functional programming paradigm
- Small, focused files
- Clear separation of concerns
- Heavy use of composition

**Areas of high complexity are isolated** to business-critical modules (event normalization, notification scheduling) and are well-tested. The functional style, while occasionally challenging for long pipelines, generally keeps complexity low by eliminating mutable state and imperative logic.

**Overall Grade: A-**

The codebase successfully manages complexity through tooling and patterns. The few areas of higher complexity are justified by business requirements and are appropriately isolated and tested.
