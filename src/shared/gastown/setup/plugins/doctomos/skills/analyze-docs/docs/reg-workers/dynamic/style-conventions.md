# Coding Conventions - reg-workers

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `campaignId`, `userInfo` |
| Functions | camelCase | `validateEntry`, `getCampaign` |
| Types/Interfaces | PascalCase | `Campaign`, `ValidatorPayload` |
| Files | camelCase | `ProcessEntries.ts`, `utils.ts` |
| Directories | camelCase | `checkEligibility`, `saveEntries` |
| Constants (exported) | SCREAMING_SNAKE | `ERROR_METRIC`, `LOG_TAG` |
| Enums | PascalCase (types), SCREAMING_SNAKE (values) | `ErrorType.VALIDATION_ERROR` |

**Notes:**
- File names use camelCase for TypeScript (`.ts`) and JavaScript (`.js`) files
- Worker entry points typically named `index.ts`
- Test files use `.spec.ts` suffix with same base name as tested file

## Formatting

| Rule | Setting | Notes |
|------|---------|-------|
| Indentation | 2 spaces | Required by ESLint |
| Quotes | Single (`'`) | Double quotes for JSX attributes |
| Semicolons | Required | Always terminate statements |
| Trailing commas | Never | `comma-dangle: never` |
| Line length | 120 chars | Max enforced by ESLint |
| Max lines per file | 200 lines | Strict limit enforced |
| Brace style | Stroustrup | Opening brace on same line, else/catch on new line |
| Arrow parens | As needed | `(x) => x + 1` vs `x => x + 1` |
| Arrow body style | As needed | Implicit return when possible |
| Object spacing | Always | `{ key: value }` not `{key: value}` |

**Example formatting:**
```typescript
const myFunction = async({ param1, param2 }) => {
  const result = await someOperation();

  if (result.error) {
    return { isValid: false };
  }
  else {
    return { isValid: true };
  }
};
```

## ESLint Rules (Key Enforced Standards)

### Functional Programming (Strict Enforcement)

| Rule | Setting | Impact |
|------|---------|--------|
| `fp/no-let` | error | No mutable variables - use `const` only |
| `fp/no-mutation` | error | No object mutation - use spread operators |
| `fp/no-loops` | error | No for/while/do-while - use `.map()`, `.filter()`, `.reduce()` |
| `fp/no-class` | error | No classes - use functions and closures |
| `fp/no-mutating-methods` | error | No array methods that mutate (`.push()`, `.splice()`) |
| `fp/no-mutating-assign` | error | No `Object.assign()` to mutate objects |

**Exceptions:**
- `fp/no-let` and `fp/no-mutation` disabled in test files (`.spec.ts`)
- `fp/no-mutating-methods` allows Ramda operations (safe mutations)
- Context objects (`ctx`, `context`) allowed for Koa middleware

### Complexity Limits (Enforced)

| Rule | Setting | Purpose |
|------|---------|---------|
| `complexity` | 6 | Maximum cyclomatic complexity per function |
| `max-depth` | 2 | Maximum nesting depth for conditionals/loops |
| `max-lines` | 200 | Maximum lines per file |
| `max-len` | 120 | Maximum characters per line |
| `id-length` | min: 2 | No single-character variable names (except in closures) |

### Code Quality

| Rule | Setting | Rationale |
|------|---------|-----------|
| `no-console` | error | Use `Log()` utility instead |
| `prefer-const` | error | Immutability by default |
| `no-var` | error | Use `const` or (if needed) `let` |
| `prefer-arrow-callback` | error | Functional style enforcement |
| `prefer-template` | error | Template literals over string concatenation |
| `no-unused-expressions` | error | Prevent side-effect-free code |
| `consistent-return` | error | All code paths must return values |
| `eqeqeq` | error | Strict equality only (`===` not `==`) |
| `curly` | error | Always use braces for blocks |
| `no-else-return` | error | Remove unnecessary else after return |

### TypeScript Specific

| Rule | Setting | Notes |
|------|---------|-------|
| `@typescript-eslint/no-unused-vars` | error | Allow `_` prefix for intentionally unused |
| `@typescript-eslint/no-shadow` | error | Prevent variable shadowing |
| `@typescript-eslint/no-explicit-any` | off (tests) | Allowed in test files only |

### Import/Module Management

| Rule | Setting | Purpose |
|------|---------|---------|
| `no-duplicate-imports` | error | Single import per module |
| `import/no-anonymous-default-export` | error | Named exports preferred |

## Import Organization

**Standard Pattern:**
1. External dependencies (npm packages)
2. Internal shared utilities/types
3. Local utilities/types
4. Constants and enums

**Example:**
```typescript
import * as R from 'ramda';
import asyncRetry from 'async-retry';
import Debug from 'debug';

import { WorkerHandler } from '../../../shared/appResolver/Worker';
import { Services } from '../../../shared/services';
import { formatError } from '../../../shared/util/error';
import Log from '../../../shared/Log';

import { Campaign } from '../../../shared/types/campaign';
import { DEFAULT_ELIGIBLE, INELIGIBLE_REASON } from '../../../shared/enums';

import { getCampaign } from './utils';
import validateEntry from './validation/validateEntry';
```

**Notes:**
- Ramda (`import * as R from 'ramda'`) is heavily used throughout
- Relative imports use explicit paths (no path aliases)
- Type imports may use `import type` syntax

## File Structure

**Worker Entry Points (`index.ts`):**
1. Imports (organized as above)
2. Constants (`LOG_TAG`, debug instances)
3. Helper functions (private to module)
4. Main handler function (exported as default)

**Utility Modules:**
1. Imports
2. Type definitions
3. Helper functions
4. Main exported functions

**Example Structure:**
```typescript
// Imports
import * as R from 'ramda';
import Log from '../../../shared/Log';

// Constants
const LOG_TAG = 'registration:apps:worker';
const log = Log(LOG_TAG);

// Private helpers
const selectStatus = R.prop('status');
const isOpen = R.equals('OPEN');

// Exported utilities
export const getCampaign = ({ slug, redis }) => {
  const key = generateCacheKey(slug);
  return GetCachedValue({ redis })(key);
};

// Main handler (worker entry points)
const handler: WorkerHandler = async({ input, Services }) => {
  // Implementation
};

export default handler;
```

## Comment Style

**Minimal Comments - Code Should Be Self-Documenting:**
- Function/variable names are descriptive and intention-revealing
- Comments explain **why**, not **what**
- No JSDoc unless exporting public API
- Complex business logic may have explanatory comments

**Inline Comments (when used):**
```typescript
// Extracts single parent. Opentelemetry does not support multiple parents.
const lambdaContext = params.input?.event?.headers
  ? getContext(params.input.event.headers)
  : context.active();
```

**ESLint Disable Comments:**
Used sparingly when functionality requires breaking FP rules (e.g., generators, prototype manipulation):
```typescript
/* eslint-disable fp/no-loops, fp/no-let, no-await-in-loop */
export async function* paginateRecords({ pageFn, limit }) {
  // Generator implementation
}
/* eslint-enable fp/no-loops, fp/no-let, no-await-in-loop */
```

## TypeScript Configuration

**Compiler Settings (`tsconfig.json`):**
- **Target:** ES2022
- **Module:** node16
- **Strict mode:** Enabled (`strict: true`)
- **Force consistent casing:** Enabled
- **Source maps:** Enabled
- **Resolve JSON modules:** Enabled
- **No implicit any:** Disabled (`noImplicitAny: false`)

## Consistency Assessment

**Overall: Strong** - The codebase demonstrates excellent consistency across all analyzed files.

**Strengths:**
- ESLint rules are strictly followed (functional programming enforced)
- Naming conventions are uniform across all domains
- File organization is consistent (imports, constants, helpers, handlers)
- Ramda usage is standardized throughout
- Error handling patterns are consistent (try/catch with formatError)

**Minor Variations:**
- Some older JavaScript files (`.js`) exist alongside TypeScript
- Test files have relaxed rules (appropriate for testing context)
- A few utility files disable specific FP rules for valid reasons (generators, error prototypes)

**No Violations Found:**
- Complexity limits are respected (no files over 200 lines in production code)
- Max depth of 2 is followed
- All files use single quotes, semicolons, 2-space indentation

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | Strong | Shared utilities in `shared/util/`, `shared/services/` minimize duplication. Common patterns like error formatting, pagination, and service initialization are abstracted. |
| **KISS** | Strong | Functions average 20-30 lines, clear purpose per function. Most workers are 60-90 lines of straightforward logic. Complexity limit of 6 enforced. |
| **YAGNI** | Strong | No speculative features. Code is focused on current requirements. Worker scaffolding tool prevents over-engineering. |
| **Single Responsibility** | Strong | Each worker has one job (e.g., `checkEligibility` validates, `saveEntries` replicates). Functions do one thing well. |
| **Open/Closed** | Moderate | Middleware system allows extension without modification. Worker types are predefined but extensible. Some hardcoded logic in validators. |
| **Liskov Substitution** | Not Applicable | No class hierarchies or inheritance (classes prohibited by `fp/no-class`). |
| **Interface Segregation** | Strong | TypeScript types are focused and minimal (e.g., `Services`, `WorkerHandler`). No god objects in type definitions. |
| **Dependency Inversion** | Strong | All dependencies injected via `Services` parameter. Workers depend on abstractions (`CampaignService`, `EntryService`) not concrete implementations. |
| **Functional Composition** | Strong | Ramda `pipe` and `compose` used extensively. Middleware pattern composes behavior. Functions are small and composable. |
| **Immutability** | Strong | Enforced by ESLint (`fp/no-let`, `fp/no-mutation`). All data transformations use spread operators or Ramda. |

### Principle Examples

#### DRY (Strong)
**Evidence:**
- `shared/util/error.ts:12-21` - Centralized error formatting used by all workers
- `shared/services/index.ts:48-67` - Service initialization abstracted and reused
- `shared/middlewares/ComposeMiddlewares.js:3` - Generic middleware composition
- `apps/registration/checkEligibility/utils.ts:13-18` - Reusable validation predicates

**Impact:** Minimal code duplication. Changes to common patterns (error handling, service calls) require updates in only one location.

#### KISS (Strong)
**Evidence:**
- `apps/registration/checkEligibility/index.ts:35-87` - Main handler is 52 lines, single clear flow
- `apps/replication/enqueueEntries/index.ts:34-60` - Worker is 26 lines: filter → parse → enqueue
- `shared/middlewares/ComposeMiddlewares.js:1-5` - Entire file is 5 lines, does one thing
- `apps/selection/sendSelectionsToQueue.ts:45-57` - 12 lines: map → send → log

**Impact:** Code is easy to understand at a glance. New developers can quickly grasp worker purpose and flow.

#### YAGNI (Strong)
**Evidence:**
- No unused configuration options or "future-proofing"
- Worker scaffolding creates minimal boilerplate (no speculative features)
- Type definitions only include fields actually used (e.g., `CheckEligibilityInput:7` has 4 fields, all required)
- Complexity limit of 6 prevents over-engineering

**Impact:** Codebase stays lean. No dead code or abandoned experiments.

#### Single Responsibility (Strong)
**Evidence:**
- `apps/registration/checkEligibility/` - Only validates eligibility, doesn't store or process
- `apps/replication/saveEntries/` - Only replicates to Entry Service, doesn't validate business rules
- `shared/services/redis/index.ts` - Only handles Redis connections, no business logic
- Each validator function (`typeValidationFns.ts`) validates one field type

**Impact:** Clear boundaries between components. Easy to test and modify in isolation.

#### Dependency Inversion (Strong)
**Evidence:**
- `apps/registration/checkEligibility/index.ts:38` - Receives `Services` as parameter
- `shared/services/index.ts:17-31` - All external dependencies abstracted behind interfaces
- `apps/selection/sendSelectionsToQueue.ts:45-47` - Depends on `saveSelectionQueueManager` abstraction
- No direct AWS SDK calls in workers (all via `Services.aws`)

**Impact:** Workers are testable (services can be mocked). Implementation changes don't affect workers.

#### Functional Composition (Strong)
**Evidence:**
- `apps/registration/checkEligibility/utils.ts:15-18` - Ramda `pipe` chains transformations
- `shared/middlewares/ComposeMiddlewares.js:3` - `R.compose` for middleware chain
- `apps/replication/enqueueEntries/index.ts:22-26` - Chained filter predicates
- `apps/registration/checkEligibility/validation/typeValidationFns.ts:33-42` - `R.pipe` for normalization

**Impact:** Data transformations are declarative and composable. Easy to add/remove steps in pipelines.

#### Immutability (Strong)
**Evidence:**
- ESLint enforces `fp/no-let`, `fp/no-mutation` across entire codebase
- `apps/selection/sendSelectionsToQueue.ts:39-40` - Uses `.concat()` not `.push()`
- `apps/dataPipeline/publishToKakfa.ts:51` - Uses spread operator for accumulation
- `apps/registration/checkEligibility/utils.ts` - All functions return new values, never mutate inputs

**Impact:** Predictable data flow. No unexpected side effects. Thread-safe by default.

## Code Readability

**Overall Rating:** Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Intention-Revealing Names** | Excellent | Function/variable names clearly express purpose (e.g., `filterRecords`, `validateCampaign`, `getCampaign`) |
| **Narrative Flow** | Excellent | Code reads top-to-bottom like a story. Main handlers orchestrate high-level flow, delegate to named helpers. |
| **Abstraction Consistency** | Excellent | Functions stay at one abstraction level. High-level orchestration separated from low-level details. |
| **Self-Documentation** | Excellent | Code is self-explanatory. Minimal need for comments. Type signatures document intent. |

### Highly Readable Examples

#### 1. **`apps/registration/checkEligibility/index.ts:35-87`** - Perfect Narrative Flow
**Why it's readable:**
- Function name `handler` clearly indicates entry point
- Steps read like prose: getCampaign → validateCampaign → checkGate → validateEntry
- Each helper function name reveals its purpose (`validateCampaign`, `checkGate`)
- Error handling is explicit and returns meaningful results
- Type signatures document expected inputs/outputs

**Structure:**
```typescript
const handler = async({ input, Services }) => {
  try {
    const campaign = await getCampaign({ slug, redis });

    const campaignValidationResult = validateCampaign(campaign);
    if (!isValid) {
      return { ...DEFAULT_INELIGIBLE, ...validationResult };
    }

    const gateValidationResult = await checkGate(...);
    if (!gateValidationResult.isEligible) {
      return { ...gateValidationResult, campaignId };
    }

    const { fields, error } = validateEntry({ campaign, entry });
    if (error) {
      return { ...DEFAULT_INELIGIBLE, reason: INELIGIBLE_REASON.INVALID_ENTRY };
    }

    return { ...DEFAULT_ELIGIBLE, campaignId, fields };
  }
  catch (error) {
    return { ...DEFAULT_INELIGIBLE, reason: INELIGIBLE_REASON.SERVER_ERROR };
  }
};
```

#### 2. **`apps/registration/checkEligibility/utils.ts:25-31`** - Intention-Revealing Names
**Why it's readable:**
- `getCampaign` - name tells exactly what it does
- Parameters are clear: `{ slug, redis }`
- Implementation uses helper `generateCacheKey` with obvious purpose
- Guard clause handles null case first
- Type signature documents return value: `null | Promise<Campaign>`

#### 3. **`apps/replication/enqueueEntries/index.ts:34-58`** - Abstraction Consistency
**Why it's readable:**
- High-level flow: filter → parse → enqueue → return result
- Helper functions (`filterRecords`, `parseRecords`) handle details
- Each step stays at same abstraction level
- Result structure clearly documents counts (in/rejected/failed/queued)

#### 4. **`apps/selection/sendSelectionsToQueue.ts:32-43`** - Functional Elegance
**Why it's readable:**
- `mapToSelectionSqsMessages` - name describes transformation clearly
- Uses Ramda `zipWith` for elegant pairing of records with codes
- Helper function `CreateSelectionMessage` encapsulates message structure
- No complex conditional logic, just data transformation

### Examples Demonstrating Self-Documentation

#### Type Signatures Document Intent
```typescript
// No comments needed - type tells the story
export const filterRecords = (records: TransformedKinesisMessage<DynamoDbEntryChangeRecord>[]) =>
  records.filter(record => ...);
```

#### Ramda Pipelines Read Like Prose
```typescript
// Each step is a verb phrase describing transformation
export const isValidStatus = R.pipe(
  selectCampaignStatus,      // Get the status
  R.anyPass([isOpen, isClosed, isPreview])  // Check if it matches valid states
);
```

#### Explicit Error Handling
```typescript
// Instead of generic catch-all:
try {
  const result = await operation();
}
catch (error) {
  log.error('check eligibility error', formatError(error));
  return { ...DEFAULT_INELIGIBLE, reason: INELIGIBLE_REASON.SERVER_ERROR };
}
```

### Readability Anti-Patterns (None Found)

The codebase avoids common anti-patterns:
- ❌ No cryptic variable names (e.g., `proc()`, `tmp`, `x`)
- ❌ No deeply nested conditionals (max depth: 2)
- ❌ No god functions (complexity limit: 6)
- ❌ No mixed abstraction levels
- ❌ No commented-out code
- ❌ No magic numbers (constants are named)

### Factors Contributing to Excellent Readability

1. **Strict ESLint Rules** - Enforce simplicity and consistency
2. **Functional Programming** - Pure functions, predictable data flow
3. **TypeScript** - Type signatures document intent
4. **Ramda** - Declarative data transformations
5. **Small Functions** - Average 20-30 lines, single responsibility
6. **Worker Pattern** - Consistent structure across all workers
7. **Dependency Injection** - Clear parameter names (`Services`, `Config`)
8. **Middleware Composition** - Separates cross-cutting concerns
