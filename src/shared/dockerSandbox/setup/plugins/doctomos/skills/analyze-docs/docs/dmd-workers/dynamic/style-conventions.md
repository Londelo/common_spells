# Coding Conventions - dmd-workers

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `demandTable`, `correlation` |
| Functions | camelCase | `shortenEventUrl`, `getEvent` |
| Constants (uppercase) | PascalCase | `SendMessage`, `GetMessageInfo` |
| Constants (config values) | camelCase with const | `maxSendAttempts`, `halfHour` |
| Constants (enums) | SCREAMING_SNAKE | `NOTIFICATION_STATUS`, `MAX_SEND_ATTEMPTS_EXCEEDED_ERROR` |
| Files (apps) | camelCase | `SendMessage.js`, `GetMessageInfo.js` |
| Files (shared) | camelCase | `resolveWorkerConfig.js`, `ComposeMiddlewares.js` |
| Directories | camelCase | `notificationSend/`, `notificationGenerator/` |
| TypeScript Types | PascalCase | `Worker`, `TransformedSQSRecord` |

**Notes:**
- Function-as-constant pattern: Functions returned from factories use PascalCase (e.g., `SendMessage`, `GetDemandRecords`)
- Standard functions and variables use camelCase
- Configuration constants use camelCase with `const` keyword
- Enum-style constants use SCREAMING_SNAKE_CASE

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single (string literals), Double (JSX) |
| Semicolons | Required (always) |
| Trailing commas | Never |
| Line length | 120 characters |
| Max file length | 200 lines |
| Max nesting depth | 2 |
| Brace style | Stroustrup (else on new line) |
| Arrow parens | As needed |
| Arrow body style | As needed (implicit return preferred) |
| Space before function paren | Never |
| Object curly spacing | Always (with spaces) |
| Padded blocks | Never |
| EOL | Always (newline at end of file) |

## ESLint Rules (Key Enforcements)

### Functional Programming (FP Plugin)
| Rule | Setting | Impact |
|------|---------|--------|
| fp/no-let | error | Must use `const` - no `let` |
| fp/no-loops | error | No for/while loops - use map/filter/reduce |
| fp/no-mutation | error | Immutability enforced (with exceptions for Ramda `R`, `ctx`, `context`) |
| fp/no-mutating-methods | error | No `.push()`, `.pop()`, etc. (except Ramda) |
| fp/no-class | error | No ES6 classes |
| fp/no-arguments | error | No `arguments` object |

### Code Quality
| Rule | Setting | Impact |
|------|---------|--------|
| complexity | error (max: 6) | Low cyclomatic complexity enforced |
| max-depth | error (max: 2) | Maximum 2 levels of nesting |
| max-len | error (120 chars) | Strict line length |
| max-lines | error (200 lines) | Files must be under 200 lines |
| id-length | error (min: 2) | Descriptive names required (min 2 chars) |
| no-console | error | No console.log (use logger) |

### Modern JavaScript
| Rule | Setting |
|------|---------|
| no-var | error |
| prefer-const | error |
| prefer-arrow-callback | error |
| prefer-template | error |
| prefer-spread | error |
| prefer-rest-params | error |
| object-shorthand | error |
| arrow-spacing | error |
| no-nested-ternary | error |
| no-unneeded-ternary | error |

### Forbidden Syntax
| Rule | Setting |
|------|---------|
| no-restricted-syntax | error (blocks loops, switch, with) |
| Forbidden constructs | `for`, `while`, `do-while`, `for-in`, `for-of`, `switch`, `with` |

## Import Organization

Imports are grouped in the following order:
1. **External libraries** - npm packages (Ramda, moment, etc.)
2. **Shared modules** - Internal shared utilities (`../../shared/...`)
3. **Local modules** - Same-directory imports (`./...`)

**Example:**
```javascript
import * as R from 'ramda';
import Debug from 'debug';
import asyncRetry from 'async-retry';
import Log from '../../shared/Log';
import config from '../../shared/config';
import { getNotificationStatusTransformers } from './utils';
import { MAX_SEND_ATTEMPTS_EXCEEDED_ERROR, RETRYABLE_REASONS } from './enums';
```

No blank lines between groups. Imports are sorted roughly alphabetically within groups.

## File Structure

**Typical file organization:**
1. **Imports** - All dependencies at the top
2. **Constants** - LOG_TAG, configuration values, magic numbers
3. **Private helper functions** - Internal utilities (lowercase if pure functions)
4. **Main exported functions** - Primary logic (PascalCase if factory pattern)
5. **Default export** - The main function/component

**Example pattern:**
```javascript
// 1. Imports
import * as R from 'ramda';
import Log from '../../shared/Log';

// 2. Constants
const LOG_TAG = 'demand:apps:example';
const log = Log(LOG_TAG);
const MAX_RETRIES = 3;

// 3. Helper functions
const formatInput = R.pipe(
  R.prop('data'),
  R.map(normalizeRecord)
);

// 4. Main function (factory pattern)
const ProcessData = ({ service, correlation }) => async input => {
  const data = formatInput(input);
  return service.process(data);
};

// 5. Default export
export default ProcessData;
```

## Comment Style

**Documentation:**
- TypeScript types use JSDoc-style comments
- Complex algorithms get explanatory comments
- "Why" comments preferred over "what" comments

**Examples:**
```typescript
/**
 * Some middlewares lift transformed event directly to the `input` property
 * and do not provide `correlation` property.
 */
type AppParamsWithInputTransformation<Event, Services> = { ... }
```

```javascript
// removing accents, Twilio overwrites them in english
const normalizeArtistName = (messageInfo, locale) => { ... }
```

**Style notes:**
- Inline comments use `//` with space after
- Comments explain business logic, not code mechanics
- ESLint rule references in comments: `// eslint-disable-line no-unused-vars`

## Consistency Assessment

### Strong Consistency
- **Functional programming**: Strict adherence to FP principles via ESLint
- **Ramda usage**: Pervasive use of R.pipe, R.applySpec, R.prop throughout
- **Import organization**: Consistent grouping across all files
- **Factory pattern**: Consistent use for main worker functions
- **Naming**: camelCase for variables/functions, PascalCase for factory returns

### Areas of Variation
- **File naming**: Mix of camelCase and lowercase with hyphens in directories
- **Constant naming**: Inconsistency between camelCase and SCREAMING_SNAKE_CASE
- **Function size**: Some files (normalizeEventDetails.js at 194 lines) exceed typical patterns
- **TypeScript adoption**: Mixed .js and .ts files, gradual migration in progress

### Overall
The codebase demonstrates **strong internal consistency** with functional programming paradigms enforced via tooling. The strict ESLint rules ensure uniformity in code style, immutability patterns, and complexity limits.

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **Functional Programming** | **Very Strong** | Ramda pervasive, no classes/loops enforced, pure functions dominant |
| DRY | **Strong** | Shared utilities in `shared/`, reusable middlewares, composition patterns |
| KISS | **Strong** | Max complexity: 6, max depth: 2, small focused functions |
| YAGNI | **Strong** | No speculative code, focused on current worker patterns |
| Single Responsibility | **Strong** | Each worker module has single purpose, small focused files |
| Open/Closed | **Moderate** | Middleware system extensible, but some areas require direct modification |
| Liskov Substitution | **Moderate** | Worker types follow consistent signatures, but varies by middleware |
| Interface Segregation | **Moderate** | Focused interfaces (Worker types), but some god-object configs |
| Dependency Inversion | **Strong** | Dependencies injected via Services, workers depend on abstractions |
| Composition over Inheritance | **Very Strong** | R.pipe/R.compose everywhere, middleware composition, zero classes |
| WET | **Weak** | Minimal duplication, most logic abstracted to shared utilities |
| AHA | **Moderate** | Some premature abstractions in middleware system, but generally pragmatic |

### Principle Deep-Dive

#### Functional Programming (Very Strong)
This codebase is **fundamentally functional**. It's not just using FP concepts - it enforces them via ESLint.

**Evidence:**
- `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/.eslintrc.yml:49-63` - fp/* rules block classes, loops, let, mutations
- `shared/middlewares/ComposeMiddlewares.js:3` - Pure composition: `R.compose(...orderedMiddlewares)`
- `apps/notificationGenerator/GenerateNotifications.js:120-130` - R.pipeP for async pipeline
- `apps/shortenEventUrl/index.js:8-16` - R.pipe for data transformation
- **Zero ES6 classes in entire codebase** (fp/no-class enforced)
- **Zero imperative loops** (fp/no-loops enforced)
- **Immutability enforced** except for specific contexts (ctx, context, Ramda)

**Anti-patterns prevented by tooling:**
```javascript
// ❌ BLOCKED by fp/no-let
let counter = 0;

// ❌ BLOCKED by fp/no-loops
for (const item of items) { ... }

// ❌ BLOCKED by fp/no-mutation
array.push(item);

// ❌ BLOCKED by fp/no-class
class UserService { ... }
```

**Approved patterns:**
```javascript
// ✅ Pure composition
const process = R.pipe(
  R.map(transform),
  R.filter(validate),
  R.reduce(aggregate, {})
);

// ✅ Factory pattern
const Worker = ({ service }) => async input => {
  return R.pipeP(parse, service.process)(input);
};
```

#### DRY (Strong)
**Evidence:**
- `shared/config/` - Centralized configuration system used by all workers
- `shared/middlewares/` - 15+ reusable middleware components
- `shared/format.js:8-19` - Shared date formatting used across 10+ files
- `shared/GetAndCacheEventDetails/` - Event normalization reused by multiple workers
- Ramda utility wrappers eliminate data manipulation duplication

**No significant duplication found.** Test files have some repetition (setup code), but production code is DRY.

#### KISS (Strong)
**Evidence:**
- `.eslintrc.yml:39-41` - Complexity limited to 6 (very strict)
- `.eslintrc.yml:85-87` - Max depth limited to 2
- `.eslintrc.yml:82-84` - Max 200 lines per file
- `apps/notificationSend/SendMessage.js:49-82` - 34-line function, clear logic flow
- `shared/middlewares/ComposeMiddlewares.js:1-5` - 5 lines total (simplicity exemplified)

**Simple areas:**
- Most utility functions: 5-15 lines
- Helper functions use R.pipe for clarity
- Clear separation of concerns

**Complex areas:**
- ⚠️ `shared/GetAndCacheEventDetails/normalizeEventDetails.js:1-194` - 194 lines (near limit)
- ⚠️ `apps/notificationScheduler/index.js:82-96` - Complex pipeline with nested R.pipeP

#### Single Responsibility (Strong)
**Evidence:**
- `apps/notificationSend/SendMessage.js` - Only sends SMS notifications
- `apps/notificationGenerator/GenerateNotifications.js` - Only generates notification records
- `apps/shortenEventUrl/index.js` - Only shortens event URLs
- `shared/config/resolveWorkerConfig.js` - Only resolves worker configuration
- Each worker does one thing, delegates to Services

**Every module has clear, focused purpose.** No god objects or multi-purpose files (except config files).

#### Dependency Inversion (Strong)
**Evidence:**
- `apps/notificationSend/SendMessage.js:49` - Takes `{ sms, correlation }` as dependencies
- `apps/notificationGenerator/GenerateNotifications.js:120` - Takes `{ demandTable }` as dependency
- `shared/middlewares/services.js` - Injects Services abstraction
- Workers receive Services, don't import concrete implementations

**Pattern:**
```javascript
// Worker depends on abstraction (Services), not concrete DB client
const Worker = ({ demandTable }) => async input => {
  return demandTable.query({ ... });
};
```

#### Composition over Inheritance (Very Strong)
**Evidence:**
- `shared/middlewares/index.js:111` - Middleware composition system
- `shared/middlewares/ComposeMiddlewares.js:3` - Pure function composition
- R.pipe/R.pipeP used in 40+ files
- R.applySpec for data transformation in 20+ files
- Zero inheritance hierarchies (no classes exist)

**This is a hallmark of the codebase.** Everything composes functions, nothing inherits.

#### Open/Closed (Moderate)
**Evidence:**
- ✅ `shared/middlewares/index.js:23-106` - New middleware types can be added without modifying existing
- ✅ Worker factory pattern allows extension
- ⚠️ `shared/enums.js:53-102` - SALE_TYPE_KEYWORDS requires modification to add new sale types
- ⚠️ Some configuration requires direct modification rather than extension

**Extensible areas:**
- Middleware system
- Worker types
- Service abstractions

**Requires modification:**
- Sale type parsing
- Suppressed artist lists
- Configuration schemas

## Code Readability

**Overall Rating:** Good

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function/variable names clearly express intent |
| Narrative Flow | Good | Most files read top-to-bottom, pipeline style aids comprehension |
| Abstraction Consistency | Fair | Some functions mix abstraction levels, especially in complex transforms |
| Self-Documentation | Good | Code structure reveals intent, minimal comments needed |

### Highly Readable Examples

#### 1. `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/shortenEventUrl/index.js:18-46`
Perfect narrative flow with intention-revealing names.

**Why it's readable:**
- Function name `shortenEventUrl` tells complete story
- Clear sequential steps: selectInput → getEvent → shortenAndUpdateEventUrl
- Each helper function name reveals its purpose
- Early returns for edge cases
- Result object is self-explanatory

```javascript
const shortenEventUrl = async({ input = [], Services: { bitly, aws: { demandTable } }, correlation }) => {
  const eventId = selectInput(input);
  log.info('input received', { input });

  const defaultResult = { eventId, found: false, updated: false };

  if (!eventId) {
    return defaultResult;
  }

  const cachedEvt = await getEvent({ demandTable, correlation, eventId });

  if (R.isNil(cachedEvt)) {
    return defaultResult;
  }

  const updatedEvt = await shortenAndUpdateEventUrl({
    bitly,
    demandTable,
    correlation,
    cachedEvt
  });

  return {
    eventId,
    found: true,
    updated: hasShortUrl(updatedEvt)
  };
};
```

#### 2. `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/middlewares/ComposeMiddlewares.js:1-5`
Simplicity exemplified.

**Why it's readable:**
- Name reveals intent: ComposeMiddlewares
- Implementation is obvious from name
- No comments needed

```javascript
import * as R from 'ramda';

const ComposeMiddlewares = orderedMiddlewares => R.compose(...orderedMiddlewares);

export default ComposeMiddlewares;
```

#### 3. `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationGenerator/GetMessageInfo.js:37-52`
Clear data retrieval and transformation pipeline.

**Why it's readable:**
- Function name `GetMessageInfo` is clear
- Pipeline: query → selectEventInfo → selectSale → merge results
- Helper function names (selectEventInfo, selectSale) reveal purpose
- Data flow is obvious: records → eventInfo + saleRecord → merged result

```javascript
const GetMessageInfo = ({ demandTable }) => async({ saleId, eventId }) => {
  const { Items: records } = await demandTable.query({
    keyConditionExpression: 'PK = :PK',
    expressionAttributeValues: { ':PK': `event:${eventId}`, ':eventId': eventId, ':saleId': saleId },
    filterExpression: 'id = :eventId OR id = :saleId'
  });

  const eventInfo = selectEventInfo(records);
  const saleRecord = selectSale(records);
  return {
    eventId,
    saleId,
    ...eventInfo,
    ...selectSaleInfo({ ...saleRecord, timezone: eventInfo.timezone })
  };
};
```

### Needs Improvement

#### 1. ⚠️ `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/shared/GetAndCacheEventDetails/normalizeEventDetails.js:156-173`
Abstraction inconsistency and complex logic.

**Issues:**
- `normalizeSales` function jumps between high-level orchestration and low-level details
- Conditional logic mixed with data selection
- Variables like `publicSaleStartDateTime` obscure intent
- Hard to understand the "why" of normalization rules

**Suggestion:**
- Extract business rules to named functions
- Separate "what to normalize" from "how to normalize"
- Add comments explaining business logic (why we check activeCampaigns, etc.)

```javascript
const normalizeSales = ({
  sales: { public: publicSale, presales } = {},
  id: eventId,
  countryCode,
  ...rest
}) => {
  const artistId = selectArtistId(rest);
  const publicSaleStartDateTime = selectStartDateTime(publicSale);
  const normalizedPublicSale = publicSaleStartDateTime ?
    normalizePublicSale({ ...publicSale, eventId, countryCode }) : {};

  const activeCampaigns = selectArtistActiveCampaigns(rest);
  const normalizedPresales = mapAndFilterPresales({
    presales, eventId, countryCode, publicSaleStartDateTime, artistId, activeCampaigns
  });

  return selectSalesResult([ normalizedPublicSale, normalizedPresales ]);
};
```

#### 2. ⚠️ `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationScheduler/index.js:82-96`
Complex pipeline with poor naming.

**Issues:**
- `ProcessScheduledSales` is a long pipeline with nested operations
- Helper function calls obscure what's happening
- Hard to understand data flow without reading all helpers
- Mix of high-level (logFailedAndSuppressedSales) and low-level (R.flatten) operations

**Suggestion:**
- Break into smaller, named steps
- Add intermediate variable names that reveal intent
- Consider adding pipeline comments

```javascript
export const ProcessScheduledSales = ({ demandTable, correlation, discovery, schedule }) => R.pipeP(
  cachedSales => Promise.resolve(cachedSales),
  R.uniqBy(R.prop('eventId')),
  BatchFn({
    fn: MapAsyncParallel(GetAndCacheEventDetails({ correlation, discovery, demandTable })),
    batchSize: BATCH_PARALLEL_READ_SIZE
  }),
  R.flatten,
  R.tap(logFailedAndSuppressedSales),
  R.reject(R.either(R.has('error'), R.prop('isSuppressed'))),
  R.pluck('sales'),
  R.flatten,
  FilterSalesBySchedule({ schedule }),
  normalizeResults
);
```

#### 3. ⚠️ `/Users/Brodie.Balser/Documents/TM/demand-capture/workers/apps/notificationSend/SendMessage.js:49-82`
Function does too much, unclear error handling.

**Issues:**
- `SendMessage` handles normalization, retries, error classification, and state updates
- Error handling logic is buried in catch block
- Hard to understand retry vs fail logic without reading RETRYABLE_REASONS
- Multiple responsibilities violate SRP

**Suggestion:**
- Extract error classification logic to separate function
- Extract retry logic to separate concern
- Add comments explaining business rules (why 500 errors are retryable)

```javascript
const SendMessage = ({ sms, correlation }) => async record => {
  const notificationRecord = normalizeNotificationRecord({ record });
  const {
    updateRecordAsFailed, updateRecordAsTriggered, updateRecordAsRetry
  } = getNotificationStatusTransformers(notificationRecord);

  if (record.sendAttempts >= maxSendAttempts) {
    return updateRecordAsFailed(MAX_SEND_ATTEMPTS_EXCEEDED_ERROR);
  }

  const body = formatSmsMessageBody(notificationRecord);
  debug('notification message body %O', body);

  try {
    await asyncRetry(
      () => sms.sendMessage({ correlationId: correlation.id, message: body }),
      retryOptions
    );

    const { messageId, groupId } = notificationRecord;
    log.info('notification triggered', { messageId, groupId, correlation });

    return updateRecordAsTriggered();
  }
  catch ({ statusCode, message, error: { error: { detail } = {} } = {} }) {
    const reason = detail || message;
    log.error('send message error', { statusCode, reason, body, correlation });

    if (statusCode === 500 || RETRYABLE_REASONS.has(reason)) {
      return updateRecordAsRetry({ statusCode, reason });
    }
    return updateRecordAsFailed({ statusCode, reason });
  }
};
```

### Summary

**Strengths:**
- Function names are exceptionally clear and intention-revealing
- Small, focused functions are the norm
- Pipeline style (R.pipe) creates natural narrative flow
- Minimal comments needed - code structure reveals intent

**Weaknesses:**
- Some complex transformations mix abstraction levels
- Long pipelines can be hard to parse without reading all helpers
- Business logic sometimes buried in conditionals without explanation
- Error handling can be implicit and hard to follow

**Overall:** The functional programming style creates highly readable code when done well (short pipelines, clear names), but can hurt readability when pipelines get long or business logic gets complex. The strict linting helps maintain quality.
