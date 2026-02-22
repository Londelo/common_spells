# Coding Conventions - fan-identity-workers

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `userActivity`, `scorableActivities`, `globalUserId` |
| Functions | camelCase | `enqueueFromStream`, `selectScorableActivities`, `lookupPredictions` |
| Classes | N/A (Classes prohibited by ESLint `fp/no-class`) | - |
| Files | camelCase | `ProcessAccountScores.ts`, `QueueManager.ts`, `checkLiveness.ts` |
| Constants | SCREAMING_SNAKE_CASE | `BATCH_SIZE`, `MAX_WRITE_COUNT`, `LOG_TAG` |
| Types/Interfaces | PascalCase | `ProcessingResult`, `LivenessSession`, `QueueManager` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single (except JSX uses double) |
| Semicolons | Required |
| Trailing commas | Never |
| Line length | 120 characters |
| Brace style | Stroustrup (else on new line) |
| Arrow function parens | As needed |
| Arrow function bodies | As needed (implicit return when possible) |
| Object spacing | Always (`{ foo: 'bar' }`) |
| Padded blocks | Never |

## ESLint Rules (Key)

### Functional Programming (Strict)

| Rule | Setting | Impact |
|------|---------|--------|
| fp/no-mutation | error | No direct property assignment |
| fp/no-let | error | Must use `const` |
| fp/no-loops | error | Must use `map`, `filter`, `reduce` |
| fp/no-class | error | Classes prohibited |
| fp/no-mutating-methods | error (Ramda allowed) | No `.push()`, `.splice()`, etc. |
| fp/no-mutating-assign | error | No `Object.assign()` mutation |

### Code Quality

| Rule | Setting | Impact |
|------|---------|--------|
| complexity | error (max: 6) | Functions must have cyclomatic complexity ≤ 6 |
| max-depth | error (max: 2) | Maximum 2 levels of nesting |
| max-lines | error (max: 200) | Files limited to 200 lines |
| max-len | error (max: 120) | Lines limited to 120 characters |
| id-length | error (min: 2) | Variable names must be ≥ 2 characters |

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
| arrow-body-style | error (as-needed) |

### Error Prevention

| Rule | Setting |
|------|---------|
| no-unused-vars | error (TypeScript variant, `_` prefix allowed) |
| consistent-return | error |
| no-else-return | error |
| eqeqeq | error |
| curly | error |
| no-console | error |
| no-shadow | error |

## Import Organization

Imports follow a consistent pattern with grouped sections:

1. **External dependencies** (alphabetical)
   - Node built-ins (`path`, etc.)
   - Third-party packages (`ramda`, `uuid`, etc.)
   - Organization packages (`@verifiedfan/*`)

2. **Internal shared modules** (by depth)
   - Shared utilities (`../../../shared/Log`)
   - Shared types (`../../../shared/appResolver/Worker`)
   - Services (`../../../shared/services`)

3. **Local imports** (relative)
   - Same directory (`./helpers`)
   - Types (`./types`)

**Example:**
```typescript
import * as R from 'ramda';
import Debug from 'debug';
import { toISOString } from '@verifiedfan/date';
import Log from '../../../shared/Log';
import { Services } from '../../../shared/services';
import { formatError } from '../../../shared/util/error';
import { UserAccountActivity } from './types';
```

## File Structure

**Typical file organization:**

1. **Imports** (grouped as above)
2. **Constants** (top-level, uppercase)
3. **Type definitions** (if TypeScript)
4. **Helper functions** (pure functions, alphabetical or logical order)
5. **Main export** (worker function or service factory)
6. **Default export** (last line)

**Example pattern:**
```typescript
// Imports
import * as R from 'ramda';
import Log from '../../../shared/Log';

// Constants
const LOG_TAG = 'verifiedfan:apps:scoring:enqueueFromStream';
const BATCH_SIZE = 10;

// Logger
const log = Log(LOG_TAG);

// Type definitions
export type EnqueueResult = {
  queued: number;
  failed: number;
}

// Helper functions
const selectScorableActivities = (messages) =>
  messages.filter(isScorableUserActivity);

// Main function
const enqueueFromStream = async({ input, Services }) => {
  const activities = selectScorableActivities(input);
  return accountActivityQueueManager.sendMessages(activities);
};

// Default export
export default enqueueFromStream;
```

## Comment Style

**Minimal comments** - Code is expected to be self-documenting through:
- Descriptive function/variable names
- Type annotations (TypeScript)
- Small, focused functions

**When comments appear:**
- **JSDoc** for complex service factories or public APIs (rare)
- **Inline explanations** for non-obvious business logic
- **Disabled ESLint rules** always accompanied by explanation

**Examples:**
```typescript
// eslint-disable-next-line max-len
updateExpression: 'SET #score = :score, dateUpdated = :dateUpdated'

/* eslint-disable fp/no-loops, no-restricted-syntax, no-await-in-loop */
// Sequential async execution required for rule short-circuit behavior
for (const rule of rules) {
  const decision = await rule.check(options);
  if (!decision.requiresVerification) {
    return decision;
  }
}
/* eslint-enable */
```

## Consistency Assessment

**Overall consistency: Strong**

The codebase demonstrates excellent adherence to conventions:

✅ **Highly Consistent:**
- Functional programming patterns (immutability, pure functions)
- Naming conventions (camelCase functions, SCREAMING_SNAKE constants)
- File structure (imports → constants → helpers → main)
- Use of Ramda for functional operations
- TypeScript type annotations
- Factory pattern for service creation
- Error handling with try/catch and explicit return values

⚠️ **Minor Inconsistencies:**
- Mix of `.ts` and `.js` files (migration in progress, newer code uses TypeScript)
- Some files use `Debug` logger alongside `Log` (pattern varies by domain)
- ESLint rule exceptions vary (some files disable `fp/no-let` in specific sections)
- Test files have relaxed rules (expected, documented in ESLint config)

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| DRY | Strong | Shared utilities in `shared/`, middleware composition, factory patterns |
| KISS | Strong | Small functions (avg 15-30 lines), single responsibility, minimal abstractions |
| YAGNI | Strong | No speculative code, focused on current requirements, minimal feature flags |
| Single Responsibility | Strong | Each worker/service has clear single purpose (e.g., `enqueueFromStream` only enqueues) |
| Open/Closed | Moderate | Middleware system extensible, but vendor abstraction is only implementation |
| Liskov Substitution | Weak | Limited inheritance (classes prohibited), mostly factory functions |
| Interface Segregation | Strong | Focused TypeScript interfaces (e.g., `QueueManager<T>`, `IDVVendor`) |
| Dependency Inversion | Strong | Services injected via middleware, abstractions over implementations |
| WET | Weak | Minimal duplication, DRY is strongly enforced |
| AHA | Moderate | Some delayed abstractions (e.g., vendor interface with single implementation) |
| **Functional Programming** | **Very Strong** | Immutability enforced, no classes, pure functions, composition patterns |

### Examples

#### DRY (Strong)
**`shared/middlewares/ComposeMiddlewares.js`** - Single middleware composition pattern reused by all 11 worker types
```javascript
const middlewares = ({ type, appName }) =>
  ComposeMiddlewares(resolveMiddlewares(type, appName));
```

**`shared/services/queue/QueueManager.ts:60-63`** - `aggregateCounts` helper reused across all queue operations
```typescript
const aggregateCounts = R.reduce(
  R.mergeWith(R.add),
  DEFAULT_COUNT
);
```

**`shared/util/error.ts`** - Single error formatting function used throughout codebase

#### KISS (Strong)
**`apps/scoring/enqueueFromStream/index.ts:12-13`** - Simple, pure function with clear intent
```typescript
export const selectScorableActivities = (messages: TransformedKafkaMessage[]): ScorableUserActivity[] =>
  messages.map(message => message.value).filter(isScorableUserActivity);
```

**`apps/scoring/scoreUsers/index.ts:14-15`** - Single-purpose data extraction
```typescript
export const selectAraiResponses = (records: DynamoDbChangeRecord[]): UserAccountActivity[] =>
  records.map(({ newItem: { araiResponse } }) => araiResponse);
```

**`shared/util/normalizers.ts:3-13`** - Simple type conversion, no clever abstractions
```typescript
export const convertToStringValues = (value: PrimitiveTypes | Array<unknown> | Record<string, unknown>): string => {
  if (Array.isArray(value)) return value.toString();
  if (value instanceof Object) return JSON.stringify(value);
  return value.toString();
};
```

#### Single Responsibility (Strong)
**`apps/scoring/enqueueFromStream/index.ts`** - Only enqueues scorable activities (36 lines)
- Does NOT score users
- Does NOT validate activities (delegates to `isScorableUserActivity`)
- Does NOT manage queue lifecycle

**`shared/services/queue/QueueManager.ts`** - Only manages queue operations (88 lines)
- Does NOT process messages
- Does NOT define message formats (receives typed messages)
- Does NOT handle business logic

**`shared/middlewares/processSQSRecords.ts`** - Only orchestrates SQS record processing (159 lines)
- Does NOT define business logic (receives processing function)
- Does NOT handle queue operations
- Does NOT transform records (delegates to middleware)

#### Dependency Inversion (Strong)
**`apps/scoring/scoreUsers/ProcessAccountScores.ts:98-100`** - Factory accepts abstractions
```typescript
const ProcessAccountScores = (
  { scoringModel, fanIdentityTable }: ProcessAccountScoresServices
): (userActivities: UserAccountActivity[]) => Promise<processedResult>
```

**`shared/services/identity/index.ts:22-51`** - Service factory with injected dependencies
```typescript
export const createIdentityService = ({
  vendor,
  db,
  tokenService,
  rules
}: IdentityServiceDependencies): IdentityService
```

**`shared/middlewares/index.js:24-112`** - Middleware types receive services, not concrete implementations

#### Interface Segregation (Strong)
**`shared/services/queue/QueueManager.ts:25-27`** - Focused interface
```typescript
export type QueueManager<Message> = {
  sendMessages: (messages: Message[], batchSize?: number) => Promise<SendMessageBatchOutput>
}
```

**`shared/services/identity/vendor/index.ts`** - IDV vendor interface only defines vendor operations, not session management or rules

**`shared/appResolver/Worker.ts:157`** - Worker types define specific event/result contracts per AWS service

#### Functional Programming (Very Strong)
**Immutability everywhere:**
```typescript
// apps/scoring/scoreUsers/ProcessAccountScores.ts:24-25
const dedupeById = R.uniqBy(R.prop('globalUserId'));
const hasId = R.prop('globalUserId');
```

**Pure functions:**
```typescript
// apps/scoring/enqueueFromStream/index.ts:12-13
export const selectScorableActivities = (messages) =>
  messages.map(message => message.value).filter(isScorableUserActivity);
```

**Factory pattern over classes:**
```typescript
// shared/services/queue/QueueManager.ts:65-87
export const AccountActivityQueueManager = ({ queue, isFIFO }) => ({
  sendMessages: async(activities, batchSize = BATCH_SIZE) =>
    R.pipe(R.map(makeMessage), BatchFn(...), R.andThen(aggregateCounts))(activities)
});
```

**Composition:**
```typescript
// shared/PutManyToStream/PutManyToKinesisStream.js:40-49
const PutManyToKinesisStream = ({ stream, makePartitionKey, __meta }) => R.pipeP(
  records => Promise.resolve(records),
  FormatRecords({ __meta, makePartitionKey }),
  list => splitInChunks({ list, stream }),
  MapAsyncParallel(BatchFn({ fn: PutMany({ stream }), batchSize: MAX_WRITE_COUNT })),
  R.unnest,
  aggregateCounts
);
```

#### YAGNI (Strong)
- No speculative abstractions (e.g., vendor interface has single implementation - Persona)
- Configuration only includes used values
- Feature flags used sparingly (only 2-3 active flags in codebase)
- No generic "framework" code - each worker does exactly what it needs

⚠️ **Areas with slight over-engineering:**
- `shared/middlewares/transformInput/` has 8 different input transformers, but only 6 are actively used
- Some TypeScript generic types are overly complex for single-use cases

#### AHA (Moderate)
**Delayed abstraction example:**
```typescript
// shared/services/identity/vendor/index.ts - Interface defined only after Persona implementation
// Interface matches Persona's actual needs, not speculative "what vendor might need"
export type IDVVendor = {
  vendorId: string;
  createSession: (globalUserId: string, verificationType: VerificationType) => Promise<IDVVendorSession>;
  handleEvent: (event: LivenessEvent) => Promise<IDVVendorSession>;
  validateSignature: (event: LivenessEvent) => Promise<void>;
}
```

**Concrete before abstract:**
- Workers written as standalone files first
- Middleware system created after patterns emerged from 3-4 workers
- `ProcessSQSRecords` helper extracted after duplicating pattern in 2 workers

## Code Readability

**Overall Rating:** Good

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function names clearly express intent (e.g., `selectScorableActivities`, `lookupPredictions`, `aggregateCounts`) |
| Narrative Flow | Good | Most files read top-to-bottom logically, though some service files mix factory and helpers |
| Abstraction Consistency | Good | Functions generally stay at one level of abstraction, with clear separation between orchestration and details |
| Self-Documentation | Excellent | Code is self-explanatory through naming and types, minimal comments needed |

### Highly Readable Examples

#### 1. **`apps/scoring/enqueueFromStream/index.ts:18-34`** - Perfect narrative flow
Function name `enqueueFromStream` tells complete story:
```typescript
const enqueueFromStream: KafkaWorker<TransformedKafkaMessage, EnqueueFromActivityStreamOutput, Services> =
  async({ input, Services: { accountActivityQueueManager } }) => {
    log.debug('events received', input);

    const scorableActivities = selectScorableActivities(input);

    log.debug('sending scorable user activities to queue', scorableActivities);
    logActivityActions(scorableActivities);

    const sendResult = await accountActivityQueueManager.sendMessages(scorableActivities);

    return {
      ...sendResult,
      in: input.length,
      rejected: input.length - scorableActivities.length
    };
  };
```
**Why it's readable:**
- Top-down narrative: receive → filter → log → enqueue → return
- Each step has a descriptive variable name
- No nested conditionals or loops
- Helper functions have clear single purposes

#### 2. **`shared/util/date.ts:27-31`** - Intention-revealing names
```typescript
export const shiftDate = (date: Date, interval: TimeInterval | number): Date => {
  const intervalInMilliseconds = typeof interval === 'number' ? interval : timeInMilliseconds(interval);
  return new Date(date.getTime() + intervalInMilliseconds);
};
```
**Why it's readable:**
- Function name `shiftDate` clearly states what it does
- Parameters are self-explanatory (`date` to shift, `interval` to shift by)
- No comments needed - the code explains itself

#### 3. **`shared/services/queue/QueueManager.ts:34-58`** - Clear abstraction levels
```typescript
export const SendMessageBatch = (queue: SQSClient) =>
  async(messages: SQSMessage[]): Promise<SendMessageBatchOutput> => {
    debug('sending message batch', { messages });

    try {
      const sendResult = await queue.sendMessageBatch(messages);

      if (sendResult.Failed) {
        log.info('failed to send some messages to queue', { BatchResultErrorEntry: sendResult.Failed });
      }

      return {
        failed: sendResult.Failed?.length ?? 0,
        queued: sendResult.Successful?.length ?? 0
      };
    }
    catch (error) {
      log.error('failed to send message batch', error);

      return {
        failed: messages.length,
        queued: 0
      };
    }
  };
```
**Why it's readable:**
- Single responsibility: send batch and report results
- Error handling is explicit and clear
- Return shape is consistent in both success and failure paths
- No mixed abstraction levels (doesn't manipulate message contents)

#### 4. **`apps/scoring/scoreUsers/ProcessAccountScores.ts:60-79`** - Self-documenting data transformation
```typescript
const makeUpdateQueries = (scores: Score[]) => {
  const isoString = toISOString();
  return scores.map(score => ({
    key: {
      PK: `g:${score.globalUserId}`,
      SK: accountSK
    },
    updateExpression: 'SET #score = :score, dateUpdated = :dateUpdated, version = :version, dateCreated = if_not_exists(dateCreated, :dateCreated)',
    values: {
      ':score': score.score,
      ':dateUpdated': isoString,
      ':version': score.version,
      ':dateCreated': isoString
    },
    expressionAttributeNames: {
      '#score': 'score'
    }
  }));
};
```
**Why it's readable:**
- Function name describes transformation: `makeUpdateQueries`
- Clear input/output types
- DynamoDB query structure is self-explanatory
- No clever abstractions, just straightforward mapping

### Needs Improvement

#### 1. **⚠️ `shared/PutManyToStream/PutManyToKinesisStream.js:40-49`** - Poor narrative flow
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
**Issues:**
- Heavy Ramda composition obscures flow
- `R.pipeP` requires understanding of Ramda async pipeline
- `Promise.resolve(records)` is redundant
- Function composition makes debugging difficult
- No intermediate variable names to guide reader

**Suggestion:** Break into named steps:
```javascript
const PutManyToKinesisStream = ({ stream, makePartitionKey, __meta }) =>
  async(records) => {
    const formattedRecords = FormatRecords({ __meta, makePartitionKey })(records);
    const chunks = await splitInChunks({ list: formattedRecords, stream });
    const batchResults = await MapAsyncParallel(
      BatchFn({ fn: PutMany({ stream }), batchSize: MAX_WRITE_COUNT })
    )(chunks);
    const flatResults = R.unnest(batchResults);
    return aggregateCounts(flatResults);
  };
```

#### 2. **⚠️ `shared/services/identity/rules/index.ts:68-78`** - Abstraction inconsistency
```typescript
/* eslint-disable fp/no-loops, no-restricted-syntax, no-await-in-loop, fp/no-mutating-methods */
for (const rule of rules) {
  const decision = await rule.check(options);

  if (!decision.requiresVerification) {
    return decision;
  }

  decisions.push(decision);
}
/* eslint-enable fp/no-loops, no-restricted-syntax, no-await-in-loop, fp/no-mutating-methods */
```
**Issues:**
- Disables functional programming rules (necessary for sequential async)
- Uses imperative loop in otherwise functional codebase
- `decisions.push()` mutates array

**Why it's needed:** Sequential execution with early exit isn't easily expressible in functional style without creating all promises upfront (which defeats the short-circuit optimization).

**Mitigation:** The inconsistency is well-documented with ESLint disable comments, and the tradeoff (performance) is reasonable.

#### 3. **⚠️ `shared/middlewares/processSQSRecords.ts:46-66`** - Mutation in reduce
```typescript
return results.reduce((acc, { result, record }) => {
  /* eslint-disable fp/no-mutation, fp/no-mutating-methods */
  if (result.status === 'unprocessed') {
    acc.unprocessed.push({ ...record, shouldRetry: true });
  }
  acc.count.received += 1;
  acc.count[result.status] += 1;

  if (result.detail) {
    acc.count.detail = mergeDetail(acc.count.detail ?? {}, result.detail);
  }

  /* eslint-enable */
  return acc;
}, emptyResults<TRecord>());
```
**Issues:**
- Uses mutation inside `reduce` (disables ESLint rules)
- Mixed high-level (`mergeDetail`) and low-level (`+=`) operations

**Suggestion:** Use immutable update pattern:
```typescript
return results.reduce((acc, { result, record }) => ({
  unprocessed: result.status === 'unprocessed'
    ? [...acc.unprocessed, { ...record, shouldRetry: true }]
    : acc.unprocessed,
  count: {
    ...acc.count,
    received: acc.count.received + 1,
    [result.status]: acc.count[result.status] + 1,
    ...(result.detail && { detail: mergeDetail(acc.count.detail ?? {}, result.detail) })
  }
}), emptyResults<TRecord>());
```

#### 4. **⚠️ `shared/services/identity/vendor/persona/PersonaIDVVendor.ts:56-65`** - Cryptic data extraction
```typescript
const selectInquiryProps = (inquiry: PersonaInquiry) => {
  const { id, attributes } = inquiry;
  const { status, updatedAt, ipAddress, referenceId } = attributes;
  return {
    globalUserId: referenceId!,
    status: mapPersonaStatus(status),
    statusTimestamp: new Date(updatedAt),
    vendorSessionId: id,
    ipAddress
  };
};
```
**Issues:**
- Non-null assertion (`referenceId!`) without explanation
- Multiple destructuring levels makes it hard to trace data flow
- `mapPersonaStatus` does nothing (just casts) - misleading name

**Suggestion:** Add validation or comment explaining why `referenceId` is guaranteed to exist:
```typescript
const selectInquiryProps = (inquiry: PersonaInquiry) => {
  const { id, attributes } = inquiry;
  const { status, updatedAt, ipAddress, referenceId } = attributes;

  // referenceId is always present - set during inquiry creation
  if (!referenceId) {
    throw new Error('Missing referenceId in Persona inquiry');
  }

  return {
    globalUserId: referenceId,
    status: status as LivenessSessionStatus,
    statusTimestamp: new Date(updatedAt),
    vendorSessionId: id,
    ipAddress
  };
};
```
