# Coding Conventions - ccpa-workers

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `memberId`, `requestEvent` |
| Functions | camelCase | `getUserByAnyId`, `selectPrivacyRequestId` |
| Classes | PascalCase | `BatchTransformStream` (rare - FP style preferred) |
| Files | camelCase | `resolveWorkerConfig.js`, `telemetry.ts` |
| Constants | SCREAMING_SNAKE_CASE | `LOG_TAG`, `MAX_BATCH_SIZE` |
| Private functions | camelCase (leading capital for factories) | `GetUserIds`, `CreateDisclosureBatch` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single |
| Semicolons | Required |
| Trailing commas | Never |
| Line length | 120 characters |
| Max file length | 200 lines |
| Max nesting depth | 2 |
| Brace style | Stroustrup |
| Object curly spacing | Always (e.g., `{ foo }`) |
| Padded blocks | Never |

## Key ESLint Rules

### Critical Rules (Errors)

| Rule | Setting | Purpose |
|------|---------|---------|
| `complexity` | max 6 | Limits cyclomatic complexity |
| `max-depth` | max 2 | Limits nesting depth |
| `max-lines` | max 200 | Limits file size |
| `fp/no-let` | error | Enforces immutability |
| `fp/no-loops` | error | Enforces functional patterns |
| `fp/no-class` | error | Prevents OOP, promotes FP |
| `fp/no-mutation` | error (with exceptions) | Prevents mutations except ctx/context |
| `no-console` | error | Prevents console usage (use Log) |
| `no-var` | error | Enforces const/let over var |
| `prefer-const` | error | Enforces immutability |
| `no-else-return` | error | Simplifies control flow |
| `no-nested-ternary` | error | Improves readability |
| `consistent-return` | error | Ensures predictable returns |
| `eqeqeq` | error | Requires === over == |
| `arrow-body-style` | as-needed | Concise arrow functions |
| `prefer-arrow-callback` | error | Enforces arrow functions |

### Import Rules

| Rule | Setting |
|------|---------|
| `no-duplicate-imports` | error |
| `import/no-anonymous-default-export` | error |

## Import Organization

**Pattern observed:**
1. External dependencies (grouped by type)
   - Node built-ins first
   - npm packages
2. Internal shared utilities (`@verifiedfan/*`)
3. Local project imports (relative paths)
4. Configuration imports

**Example from `apps/saveDisclosures/index.js`:**
```javascript
import * as R from 'ramda';
import Debug from 'debug';
import Log from '../../shared/Log';
import parseCSV from 'csv-parse/lib/es5';
import config from '../../shared/config';
import BatchTransformStream from '@verifiedfan/batch-transform-stream';
import { MapAsyncParallel } from '@verifiedfan/map-utils';
```

## File Structure

**Typical file organization:**
1. Imports
2. Constants (LOG_TAG, configurations)
3. Helper functions (pure, small)
4. Main logic functions
5. Default export (main handler/service)

**TypeScript files:**
1. Imports (types first, then values)
2. Type definitions
3. Implementation
4. Exports

## Comment Style

- **Debug tags:** `const LOG_TAG = 'verifiedfan:apps:processRequest';`
- **JSDoc:** Not consistently used
- **Inline comments:** Sparingly used, mainly for:
  - Business logic explanations
  - TODO markers
  - ESLint disable comments (rare, with justification)
- **Type comments:** TypeScript type annotations preferred over JSDoc in `.ts` files

## Consistency Assessment

**✅ Strong Adherence:**
- Functional programming style (Ramda usage, immutability)
- camelCase for variables/functions
- 2-space indentation
- Single quotes
- Semicolons
- No console.log (use Log utility)
- Arrow functions
- const over let

**⚠️ Mixed Adherence:**
- File length: Most files < 200 lines, but some exceed (e.g., `setupWorker/index.js` at 274 lines)
- Complexity: Generally low, but some files have complex nested logic
- TypeScript: Mixed `.js` and `.ts` usage - gradual migration in progress

**🔍 Observations:**
- ESLint rules are strict and well-configured
- Functional programming is heavily enforced via `eslint-plugin-fp`
- Configuration prevents common errors (loops, mutations, classes)
- TypeScript strict mode enabled but `noImplicitAny: false`

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **Functional Programming** | Strong | Ramda everywhere, no loops/classes, immutability enforced via ESLint |
| **DRY** | Strong | Shared utilities (`@verifiedfan/*`), helper functions extracted |
| **KISS** | Strong | Functions avg 15-25 lines, clear purpose |
| **YAGNI** | Strong | Minimal abstractions, focused on current needs |
| **Single Responsibility** | Strong | Each file/function has one clear purpose |
| **Composition over Inheritance** | Strong | Functions composed with Ramda (pipe, compose) |
| **Pure Functions** | Strong | Most functions are pure, side effects isolated |
| **Immutability** | Strong | ESLint enforces no mutations (except Koa context) |
| **Open/Closed** | Moderate | Middleware pattern allows extension, but direct modification common |
| **Interface Segregation** | Moderate | Services object has focused APIs |
| **Dependency Inversion** | Weak | Direct dependencies on concrete implementations |
| **WET** | Weak | Minimal duplication observed |
| **AHA** | Moderate | Abstractions delayed until patterns emerge |

### Examples

#### Functional Programming (Strong)
- **`apps/processRequest/index.js:31-38`** - Composable functions
```javascript
export const GetUserIds = ({ getUserIdsInAcctFanDB, getTmUserIds }) => async({ id, jwt }) => {
  const tmUserIds = await getTmUserIds({ jwt, id });
  const userData = tmUserIds.length ? tmUserIds : await getUserIdsInAcctFanDB(id);
  return {
    userIdFound: !!tmUserIds.length,
    userData: userData.length ? userData : selectMinUserData(id)
  };
};
```

- **`apps/deleteFan/removeFromVerificationTable.js:32-36`** - Ramda pipelines
```javascript
export const normalizeQueryResults = R.pipe(
  R.pluck('Items'),
  R.flatten,
  Items => ({ Items, Count: Items.length })
);
```

- **`apps/saveDisclosures/index.js:41-52`** - Complex composition
```javascript
const getUserIdByEmail = ({ userService, rows }) => R.pipeP(
  () => Promise.resolve(rows),
  R.pluck('Email'),
  R.uniq,
  R.splitEvery(getIdsEmailBatchSize),
  MapAsyncParallel(R.pipe(
    R.join(','),
    emails => userService.getUserIds({ emails })
  )),
  R.flatten,
  indexUsersByEmail
)();
```

#### DRY (Strong)
- **Shared utilities:** `@verifiedfan/aws`, `@verifiedfan/batch-fn`, `@verifiedfan/date`
- **Selectors:** `shared/selectors.js` - Reused across multiple apps
- **Service abstraction:** `shared/services/index.ts` - Centralized service initialization

#### KISS (Strong)
- **`shared/format.ts:7-9`** - Simple, clear purpose
```typescript
export const formatBatchFailureIdentifiers = <T extends RecordWithId[]>(records: T): FailureIdentifier[] => records.map(
  ({ recordId }) => ({ itemIdentifier: recordId })
);
```

- **`shared/constants.js`** - Simple constant definition
```javascript
export const ERROR_METRIC = {
  name: 'error_count',
  unit: 'count',
  value: 1
};
```

#### Single Responsibility (Strong)
- **`apps/optOut/index.js`** - Handles only opt-out logic
- **`apps/deleteFan/flagAccountFanscore.js`** - Only flags account fanscore records
- **`shared/services/secretsManager/index.ts`** - Only retrieves secrets

#### ⚠️ Complexity Warning
- **`shared/middlewares/telemetry.ts:74-90`** - Complex retry logic with error handling
```typescript
const safeForceFlush = () => asyncRetry(
  async bail => {
    try {
      await flush();
    }
    catch (errs) {
      const errors = errs as Error[];
      if (R.any(isRetryableError, errors)) {
        log.warn(RETRYABLE_ERROR_MESSAGE);
        throw (errs);
      }
      bail(errs as Error);
      return;
    }
  },
  retryOptions
).catch(err => log.error('trace force flush error', err));
```

## Code Readability

**Overall Rating:** Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function names clearly express intent (e.g., `getUserByAnyId`, `removeFromVerificationTable`, `formatBatchFailureIdentifiers`) |
| Narrative Flow | Excellent | Functions read top-to-bottom, main logic at top, helpers below |
| Abstraction Consistency | Good | Most functions stay at one level of abstraction |
| Self-Documentation | Excellent | Code is self-explanatory due to descriptive names and functional composition |

### Highly Readable Examples

1. **`apps/optOut/index.js:41-52`** - Perfect narrative flow
   - Function name `optOut` tells complete story
   - Steps read like prose: extract services → validate user → opt out → notify
   - Each helper function name reveals its purpose
   - Error handling is clear and explicit

2. **`shared/selectors.js`** - Intention-revealing names
   - `selectPrivacyRequestId`, `selectOptOutEntries` - crystal clear intent
   - Ramda composition makes data flow obvious
   - No comments needed to understand purpose

3. **`apps/deleteFan/index.js:25-66`** - Clear orchestration
   - Main function `deleteFan` orchestrates the deletion process
   - Each step is a well-named function call
   - Return structure matches the business domain

4. **`tools/camelToSpinalCase.js`** - Pure functional elegance
   - Complex transformation expressed clearly through Ramda composition
   - Each step in the pipeline has a clear purpose
   - No comments needed

### Needs Improvement

1. **⚠️ `tools/setupWorker/index.js:1-274`** - File exceeds 200 line limit
   - Suggestion: Extract sections into separate modules

2. **⚠️ TypeScript mixed usage** - Some `.ts` files with minimal typing
   - `shared/services/mongo/campaigns.ts:4-5` - Uses `any` type
   - Suggestion: Add proper types for better documentation

## Functional Programming Characteristics

This codebase exemplifies functional programming in JavaScript/TypeScript:

1. **No classes, no loops** - Enforced via ESLint
2. **Immutability** - Enforced via `eslint-plugin-fp`
3. **Pure functions** - Most functions are pure
4. **Composition** - Heavy use of Ramda's `pipe`, `compose`, `pipeP`
5. **Higher-order functions** - Factory functions that return functions
6. **No side effects** - Side effects isolated to I/O boundaries

**Example of FP factory pattern:**
```javascript
const GetUserIds = ({ getUserIdsInAcctFanDB, getTmUserIds }) => async({ id, jwt }) => {
  // Implementation
};
```

This pattern:
- Injects dependencies
- Returns a configured function
- Maintains testability
- Enables composition
