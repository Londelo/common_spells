# Coding Conventions - code-service

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `managerCtx`, `campaignId`, `fileKey` |
| Functions | camelCase | `findAndReserveCodes`, `uploadCodes`, `countCodesByStatus` |
| Classes | PascalCase | `Collection`, `Router`, `Koa` |
| Files | camelCase | `findAndReserveCodes.js`, `readAndStoreCodes.js` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES`, `STATUS_QUERY`, `CODE_TYPE` |
| Functional Factories | PascalCase | `UpdateCodes`, `FilterAndCountByType`, `InstrumentDatastores` |

**Note:** File names consistently use camelCase (e.g., `InstrumentDatastores.js`, `KoaCtxToManagerCtx.js`) rather than kebab-case.

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single (enforced by ESLint) |
| Semicolons | Required (enforced by ESLint) |
| Trailing commas | Never (comma-dangle: never) |
| Line length | 120 characters |
| Max file length | 200 lines |
| Brace style | Stroustrup |
| Object curly spacing | Always (e.g., `{ foo }` not `{foo}`) |
| Space before function paren | Never (e.g., `function()` not `function ()`) |

## ESLint Rules (Key)

### Functional Programming (Enforced via eslint-plugin-fp)

| Rule | Setting | Impact |
|------|---------|--------|
| fp/no-class | error | Classes are prohibited |
| fp/no-let | error | `let` is prohibited (use `const`) |
| fp/no-loops | error | Traditional loops prohibited (use functional alternatives) |
| fp/no-mutation | error | Mutation prohibited (with exceptions for Koa ctx/context and Ramda) |
| fp/no-mutating-methods | error | Array mutating methods prohibited (except for Ramda operations) |
| fp/no-mutating-assign | error | Object.assign mutations prohibited |

**Note:** The codebase requires explicit ESLint disable comments when mutation is necessary (e.g., `// eslint-disable-line fp/no-mutation`).

### Code Quality & Complexity

| Rule | Setting | Impact |
|------|---------|--------|
| complexity | error, max 7 | Functions must have cyclomatic complexity ≤ 7 |
| max-depth | error, max 2 | Maximum nesting depth of 2 |
| max-lines | error, 200 | Files cannot exceed 200 lines |
| max-len | error, 120 | Lines cannot exceed 120 characters |
| id-length | error, min 2 | Identifiers must be at least 2 characters |

### Code Style

| Rule | Setting |
|------|---------|
| prefer-const | error |
| no-var | error |
| arrow-parens | error, as-needed |
| arrow-body-style | error, as-needed |
| prefer-arrow-callback | error |
| prefer-template | error |
| object-shorthand | error |
| no-console | error |
| consistent-return | error |
| curly | error |
| eqeqeq | error |
| no-else-return | error |
| no-nested-ternary | error |
| no-param-reassign | error, props: false |
| no-plusplus | error |
| no-shadow | error |

### ES6+ Features

| Rule | Setting |
|------|---------|
| no-duplicate-imports | error |
| no-restricted-syntax | error (prohibits for/while/switch) |
| prefer-rest-params | error |
| prefer-spread | error |
| no-iterator | error |

## Import Organization

Imports are organized in the following order:

1. **External dependencies** (npm packages)
   - Framework imports (Koa, Ramda, etc.)
   - Utility libraries

2. **Internal shared libraries** (@verifiedfan packages)
   - Config and utilities
   - Middleware helpers
   - Shared services

3. **Local project imports**
   - Config files
   - Lib utilities
   - App-specific modules

4. **Relative imports** (same directory)

**Example:**
```javascript
import Koa from 'koa';
import * as R from 'ramda';
import { middlewares } from '@verifiedfan/lib';
import config from '../lib/config';
import Log from '../lib/Log';
import router from './router';
```

## File Structure

Files follow a consistent structure:

1. **Imports** - Organized by category (external → internal → local)
2. **Constants** - Configuration values, enums, lookup maps
3. **Helper functions** - Pure functions, selectors, transformations
4. **Main logic** - Primary exports and implementations
5. **Default export** - Single default export at the end

**Example Pattern:**
```javascript
// Imports
import * as R from 'ramda';
import Log from '../../../lib/Log';

// Constants
const log = Log('titan:app:managers:codes:findAndReserve');
const MAX_RETRIES = 2;

// Helper functions
const selectIds = R.pluck('_id');
const selectCodes = R.map(R.path(['_id', 'code']));

// Main logic
const findAndReserveCodes = async(managerCtx, { ... }) => {
  // implementation
};

// Export
export default findAndReserveCodes;
```

## Comment Style

- **JSDoc comments** used for function documentation (when present)
- **Inline comments** for business logic explanations
- **TODO comments** formatted as `// TODO: description`
- **ESLint disable comments** for necessary rule violations

**Examples:**
```javascript
/**
 * Creates a manager context from a koa context
 * @param {KoaContext} ctx
 * @param {Datastore} Datastore datastore to be instrumented
 * @param {Services} Services services to be instrumented
 * @returns {ManagerContext}
 */

// handles CRUD for db.codes data

// eslint-disable-next-line fp/no-let
```

## Consistency Assessment

**Overall: Strong Consistency**

✅ **Consistent patterns:**
- Functional programming principles applied uniformly
- camelCase naming for functions and variables
- ESLint rules strictly followed (evidence of inline disable comments where necessary)
- Ramda used consistently for functional operations (`R.pipe`, `R.compose`, `R.map`, etc.)
- Higher-order functions and currying patterns throughout
- Error handling via error factory pattern
- Instrumentation pattern applied uniformly to datastores and services

✅ **Architectural consistency:**
- Clean separation: Router → Manager → Datastore layers
- Middleware applied uniformly across the app
- Context transformation pattern (`KoaCtxToManagerCtx`) used consistently
- Dependency injection via instrumentation wrappers

⚠️ **Minor inconsistencies:**
- Some files have more detailed comments than others
- Test files may have different patterns than production code
- Feature test files use different variable naming (snake_case in some regex patterns)

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| DRY | Strong | Shared utilities, instrumentation wrappers, higher-order functions for code reuse |
| KISS | Strong | Small, focused functions; avg 20-30 lines per function |
| YAGNI | Strong | No speculative code; focused on current requirements |
| Single Responsibility | Strong | Each manager, datastore, and service has single purpose |
| Open/Closed | Moderate | Instrumentation pattern allows extension; some tight coupling |
| Liskov Substitution | Not Applicable | No class inheritance (classes prohibited by ESLint) |
| Interface Segregation | Strong | Focused, minimal interfaces; no god objects |
| Dependency Inversion | Strong | Dependencies injected via instrumentation pattern |
| WET | Weak | Minimal duplication; strong DRY adherence |
| AHA | Moderate | Some abstractions in place; balance between concrete and abstract |

### DRY (Strong)

**Evidence:**
- **Instrumentation wrappers** (`InstrumentDatastores.js`, `InstrumentServices.js`) - Applied to all datastores and services to add tracing and correlation
- **Higher-order functions** - `UpdateCodes` factory in `app/router/index.js:27` creates multiple route handlers from single pattern
- **Middleware composition** - `app/index.js:38-51` reuses standard middleware across all routes
- **Error factory pattern** - `app/managers/codes/errors.js` centralizes error object creation

**Examples:**

1. **`app/router/index.js:27-34` - UpdateCodes factory**
   ```javascript
   const UpdateCodes = updateFn => ctx => {
     const managerCtx = koaCtxToManagerCtx({ ctx });
     return updateFn(managerCtx, {
       campaignId: selectCampaignId(ctx),
       codes: selectCodes(ctx),
       isAuthSupreme: selectIsUserSupreme({ ctx })
     });
   };
   ```
   Used to create both `assignCodes` and `releaseCodes` handlers with zero duplication.

2. **`app/managers/codes/index.js:82-100` - Generic update function factory**
   ```javascript
   const UpdateCodes = updateFnName => async(managerCtx, { isAuthSupreme, campaignId, codes }) => {
     // ... validation logic ...
     return { count: await managerCtx.datastore.codes[updateFnName]({ campaignId, codes }) };
   };

   export const assignCodes = UpdateCodes('assignCodes');
   export const releaseCodes = UpdateCodes('releaseCodes');
   ```

3. **Ramda composition** - `app/datastore/codes.js:8-9` defines reusable selectors
   ```javascript
   const selectIds = R.pluck('_id');
   const selectCodes = R.map(R.path(['_id', 'code']));
   ```

### KISS (Strong)

**Evidence:**
- Average function length: ~25 lines
- Most functions have single, clear purpose
- Minimal nesting (max-depth: 2 enforced)
- Cyclomatic complexity ≤ 7 enforced by ESLint
- Simple, linear control flow in most functions

**Examples:**

1. **`lib/middlewares/responseFormatter.js:1-8` - Simple wrapper**
   ```javascript
   import { middlewares } from '@verifiedfan/lib';
   import Log from '../Log';

   const { ResponseFormatter } = middlewares;
   const responseFormatter = ResponseFormatter(Log('responseFormatter'));
   export default responseFormatter;
   ```
   Clear, minimal, focused on single responsibility.

2. **`app/managers/codes/findCodesCounts.js:1-14` - Concise functional pipeline**
   Simple composition using Ramda to map statuses to counts.

3. **`lib/Router/heartbeat.js:6-17` - Straightforward endpoint**
   Clear try-catch, simple status check, minimal logic.

### YAGNI (Strong)

**Evidence:**
- No unused functions or speculative abstractions
- Features directly map to API endpoints
- Configuration loaded only as needed
- No "future-proofing" code patterns

### Single Responsibility (Strong)

**Evidence:**
- **Managers** handle business logic (`findAndReserveCodes`, `uploadCodes`)
- **Datastores** handle data persistence (`codes.js`)
- **Services** handle external integrations (`s3/index.js`)
- **Routers** handle HTTP routing only
- **Middlewares** handle cross-cutting concerns (auth, logging, tracing)

**Examples:**

1. **`app/managers/codes/findAndReserveCodes.js`** - Single purpose: find and reserve codes with retry logic
2. **`app/datastore/codes.js`** - Single purpose: CRUD operations for codes collection
3. **`lib/middlewares/errorFormatter.js`** - Single purpose: format errors for HTTP responses

### Open/Closed (Moderate)

**Evidence:**
- ✅ Instrumentation pattern allows extension without modification
- ✅ Middleware architecture supports adding new middleware
- ⚠️ Some direct coupling in router to specific managers

**Examples:**

1. **`app/datastore/InstrumentDatastores.js:10-23`** - Wraps any datastore with tracing/correlation
2. **`app/services/InstrumentServices.js:6-46`** - Wraps any service with instrumentation

### Interface Segregation (Strong)

**Evidence:**
- Each datastore exposes only methods needed for its domain
- Services have minimal, focused APIs
- Managers export specific, named functions
- No "god objects" with dozens of methods

### Dependency Inversion (Strong)

**Evidence:**
- Dependencies injected via instrumentation pattern
- Datastores and services passed to managers via context
- No direct imports of concrete implementations in managers
- Configuration abstracted via config module

**Examples:**

1. **`lib/KoaCtxToManagerCtx.js:17-36`** - Injects datastore and service dependencies into manager context
2. **`app/index.js`** - Middleware injected into Koa app, not hardcoded

### AHA (Moderate)

**Evidence:**
- Some abstractions in place (instrumentation wrappers, factories)
- Balance between concrete implementations and abstract patterns
- Abstractions emerged from actual needs (e.g., UpdateCodes factory after code duplication)

## Code Readability

**Overall Rating:** Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function names clearly express intent; variables named descriptively |
| Narrative Flow | Excellent | Code reads top-to-bottom; logical organization |
| Abstraction Consistency | Excellent | Functions maintain consistent abstraction levels |
| Self-Documentation | Excellent | Code is self-explanatory; minimal need for comments |

### Intention-Revealing Names (Excellent)

**Examples:**

1. **`app/managers/codes/findAndReserveCodes.js`** - Function name tells complete story
   - `findAndReserveCodes` - Clear intent
   - `selectIds`, `selectCodes` - Obvious purpose
   - `MAX_RETRIES` - Self-documenting constant

2. **`app/datastore/codes.js:36-46`** - `findAvailableCodes`
   - Method name makes intent crystal clear
   - No need to read implementation to understand purpose

3. **`app/managers/codes/index.js:22-39`** - `uploadCodes`
   - Clear what the function does from name alone
   - Parameter names explain their role: `isAuthSupreme`, `fileKey`

4. **Selector functions** throughout codebase
   - `selectFileKey`, `selectCodes`, `selectCampaignId`
   - Naming convention makes selectors immediately recognizable

### Narrative Flow (Excellent)

Files consistently follow logical top-to-bottom structure:

1. **`app/router/index.js`** - Perfect narrative
   - Import dependencies
   - Set up infrastructure (router, context transformer)
   - Define route handlers
   - Register routes
   - Log configuration
   - Export

2. **`app/managers/codes/findAndReserveCodes.js`** - Story-like progression
   - Imports
   - Constants and configuration
   - Helper functions (data extraction)
   - Main recursive function
   - Export
   - Each step logically follows previous

3. **`app/index.js`** - Application bootstrap narrative
   - Import framework and config
   - Log startup
   - Configure DNS cache
   - Create app
   - Apply middleware (in order)
   - Start server
   - Clear, linear flow

### Abstraction Consistency (Excellent)

Functions stay at consistent abstraction levels:

**Example: `app/managers/codes/index.js:22-39` - uploadCodes**
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

High-level orchestration:
- Parse input
- Validate permissions
- Validate type
- Delegate to detailed implementation

No mixing of high-level logic with low-level details. The actual CSV parsing and storing happens in `readAndStoreCodes`, keeping abstractions clean.

**Example: `app/datastore/codes.js`**
- All database operations at same abstraction level
- Query construction separated from execution
- Cursor operations explicit and clear

### Self-Documentation (Excellent)

Code explains itself through names and structure:

**Example: `app/managers/codes/readAndStoreCodes.js:20-53`**
```javascript
const readAndStoreCodes = async(managerCtx, { campaignId, type, fileKey }) => {
  let count = { in: 0, inserted: 0, updated: 0 };

  const { service: { scoringBucket: s3Client }, datastore: { codes: codesStore }, correlation } = managerCtx;
  const s3ReadStream = await s3Client.getReadStreamForObject(fileKey);

  const batchTransformStream = BatchTransformStream({
    batchSize,
    transformFn: async codes => {
      try {
        const result = await codesStore.upsertCodes({ campaignId, type, codes: R.flatten(codes || []) });
        count = updateCount(count, result);
      }
      catch ({ message, code }) {
        log.error('uploadCodes mongo error', { message, code, correlation });
      }
    }
  }).resume();

  return new Promise((resolve, reject) => s3ReadStream
    .on('error', reject)
    .pipe(parseCSV(parseOptions))
    .on('error', reject)
    .pipe(batchTransformStream)
    .on('error', reject)
    .on('finish', () => resolve({ count }))
  );
};
```

No comments needed - the code tells the story:
1. Initialize count tracking
2. Get S3 client and datastore from context
3. Create read stream from S3
4. Set up batch transform with upsert logic
5. Chain streams with error handling
6. Return promise that resolves with count

**Example: Functional composition clarity**
```javascript
const FilterAndCountByType = type => R.pipe(
  R.filter(R.propEq('type', type)),
  R.length
);
```
Ramda pipeline reads like English: "filter by type property, then get length"

### Highly Readable Examples

1. **`lib/error/index.js:9-13` - Error factory**
   - Single expression clearly builds error object
   - Conditional fields added transparently

2. **`app/managers/codes/enums.js` - Enumerations**
   - Constants defined clearly
   - Set construction explicit and obvious

3. **`lib/middlewares/correlation.js:1-8` - Middleware setup**
   - Three lines, crystal clear purpose
   - Import, configure, export

### Areas Needing Comments (Few)

Most comments in the codebase are:
1. **JSDoc** for API documentation
2. **Business rule explanations** (rare, only when truly necessary)
3. **ESLint disable justifications**
4. **TODO markers** for future work

**Example of necessary comment:**
```javascript
// TODO: Change to creating a span that "followsFrom" the parent when the following issue is resolved:
// https://github.com/jaegertracing/jaeger/pull/460
```
This explains a technical limitation requiring future refactoring - appropriate use of comments.
