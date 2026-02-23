# Coding Conventions - upload-service

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `bucketService`, `fileKey` |
| Functions | camelCase | `uploadFile`, `getBucketService` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_READ_FILE_BYTES`, `DEFAULT_LIMIT` |
| Files | camelCase / lowercase | `index.js`, `listData.js` |
| Higher-Order Functions | PascalCase | `SelectFileProp`, `GetDataFromObject` |
| React-style Selectors | camelCase with 'select' prefix | `selectFileName`, `selectIsUserSupreme` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single (enforced) |
| Semicolons | Required (always) |
| Trailing commas | Never |
| Line length | 120 characters max |
| Max file lines | 200 lines |
| Max nesting depth | 2 levels |
| Object spacing | Always spaces inside braces: `{ foo }` |
| Brace style | Stroustrup (else on new line) |
| Function parens | No space before: `function()` not `function ()` |
| Arrow parens | As needed: `x => x` not `(x) => x` |
| Arrow body | As needed (implicit return preferred) |
| EOL | Always end with newline |

## ESLint Rules (Key)

| Rule | Setting | Purpose |
|------|---------|---------|
| **Functional Programming** |
| fp/no-let | error | Enforce `const` over `let` |
| fp/no-loops | error | Use functional iteration (map/filter/reduce) |
| fp/no-mutation | error | Prevent object mutation (allows `this`, `ctx`, `context`) |
| fp/no-mutating-methods | error | Prevent array mutations (allows Ramda) |
| fp/no-class | error | Enforce functional style over OOP |
| fp/no-arguments | error | Use rest params instead |
| **Code Quality** |
| complexity | error (max 7) | Cyclomatic complexity limit |
| max-depth | error (max 2) | Prevent deep nesting |
| max-len | error (120) | Line length limit |
| max-lines | error (200) | File size limit |
| id-length | error (min 2) | Descriptive variable names |
| **Modern JavaScript** |
| no-var | error | Use `const`/`let` only |
| prefer-const | error | Immutability first |
| prefer-arrow-callback | error | Arrow functions for callbacks |
| prefer-template | error | Template literals over concatenation |
| prefer-rest-params | error | Rest params over `arguments` |
| prefer-spread | error | Spread over `.apply()` |
| object-shorthand | error | ES6 object shorthand |
| **Safety** |
| eqeqeq | error | Strict equality (`===`) |
| no-console | error | No console statements |
| no-await-in-loop | error | Prevent sequential async ops |
| no-param-reassign | error | Immutable function parameters |
| no-shadow | error | Prevent variable shadowing |
| **Syntax Restrictions** |
| no-restricted-syntax | error | Bans loops, switch statements, delete operator |
| no-nested-ternary | error | Readability |
| no-plusplus | error | Use `+= 1` instead |
| **Import/Export** |
| no-duplicate-imports | error | Consolidate imports |
| import/no-anonymous-default-export | error | Named exports preferred |

## Import Organization

Imports follow a consistent pattern:
1. **External dependencies** (npm packages)
2. **Internal shared libraries** (`@verifiedfan/*`)
3. **Local project modules** (relative imports)
4. **Configuration and logging**

Example from `app/managers/files/index.js`:
```javascript
// External
import * as R from 'ramda';
import { error } from '@verifiedfan/lib';

// Errors (project-local)
import { missingFile, emptyFile } from '../../errors/s3';

// Config and utilities
import config from '../../../lib/config';
import Log from '../../../lib/Log';
import Debug from 'debug';
```

## File Structure

Files follow a consistent top-to-bottom narrative:

1. **Imports** (grouped as above)
2. **Constants and configuration** (UPPER_CASE)
3. **Private helper functions** (lowercase, unexported)
4. **Ramda pipelines and data transformers** (functional composition)
5. **Public exported functions** (exported with `export`)

Example pattern:
```javascript
// Imports
import * as R from 'ramda';
import config from '../config';

// Constants
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;

// Private helpers
const validateInput = input => { ... };

// Ramda transformers
const normalizeData = R.pipe(
  R.prop('data'),
  R.filter(R.isNil),
  R.map(transform)
);

// Public exports
export const processData = async(ctx, params) => { ... };
```

## Comment Style

The codebase demonstrates **minimal commenting** philosophy - the code should be self-documenting through:
- Intention-revealing function names
- Ramda pipelines that read like prose
- Small, focused functions

Comments are used sparingly for:
- **JSDoc-style function documentation** (rare, only on complex public APIs)
- **Inline explanations** for non-obvious business logic
- **TODO markers** for future work

Examples:
```javascript
// Good: Self-documenting through naming
const selectLastModifiedDate = R.prop('LastModified');
const normalizeAndSortByModifiedDate = R.pipe(
  R.sort(byLastModified),
  R.map(normalizeS3ObjectsList)
);

// Inline comment explaining WHY
// For now, creating a new trace with the traceId of the parent as a tag
// (Waiting for Jaeger issue #460 to be resolved)
const span = parentSpan.tracer().startSpan(operationName);
```

## Consistency Assessment

**Overall: Very Strong** - The codebase shows excellent adherence to established conventions.

### Strengths:
- **Functional programming style** is consistently applied across all modules
- **Ramda usage** is pervasive and follows functional composition patterns
- **No classes or loops** anywhere in the production code
- **Consistent file structure** with imports, constants, helpers, exports
- **ESLint rules are strictly enforced** (complexity, nesting, line length)

### Minor Inconsistencies:
- Some files use `snake_case` for config keys while others use `camelCase`
- A few eslint-disable comments for legitimate reasons (see exceptions below)
- Feature test files have slightly looser rules than production code

### Legitimate Rule Exceptions:
The codebase includes intentional ESLint overrides in specific contexts:
- **Koa middleware context mutation** (`ctx.request`, `ctx.response`) - allowed via `fp/no-mutation` exceptions
- **Ramda mutation operations** - allowed as they're safe immutable operations
- **Test files** use loops in some integration tests (`features/lib/aws/s3.js`)

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY (Don't Repeat Yourself)** | **Strong** | Extensive use of shared utilities in `@verifiedfan/*` packages. Reusable Ramda pipelines (e.g., `normalizeAndSortByModifiedDate` used in multiple managers). Configuration centralized in `lib/config.js`. |
| **KISS (Keep It Simple)** | **Strong** | Functions average 20-30 lines. Max complexity set to 7. Max nesting depth of 2. Ramda pipelines break complex logic into simple steps. |
| **YAGNI (You Aren't Gonna Need It)** | **Strong** | No speculative features. Code is focused on current requirements. Commented-out code includes TODO notes explaining future needs. |
| **Single Responsibility** | **Strong** | Each manager handles one domain (files, images, trigger). Services separated by AWS service type (S3, Lambda, StepFunctions). Routers map cleanly to managers. |
| **Open/Closed** | **Moderate** | Instrumentation wrappers (`InstrumentServices`, `InstrumentDatastores`) provide extension points. However, most business logic is direct implementation rather than abstracted. |
| **Liskov Substitution** | **N/A** | No inheritance or class hierarchies - functional style eliminates this concern. |
| **Interface Segregation** | **Strong** | Manager contexts provide focused interfaces (`managerCtx.service`, `managerCtx.datastore`). Each service exposes only needed methods. |
| **Dependency Inversion** | **Moderate** | Services are injected via `InstrumentServices` and `InstrumentDatastores`. However, some concrete AWS SDK usage rather than full abstraction. |
| **Functional Composition** | **Excellent** | Heavy use of Ramda for function composition. Pipelines like `R.pipeP` for async flows. Point-free style where appropriate. |
| **Immutability** | **Excellent** | Enforced via ESLint `fp/no-mutation` and `fp/no-let`. All data transformations create new objects. Const-only variable declarations. |

### Examples:

#### DRY (Strong)
- **`lib/KoaCtxToManagerCtx.js:17-38`** - Centralized context transformation used by all routes
- **`app/managers/shared.js:6-13`** - `getBucketConfigOrDefault` reused across files and images managers
- **`app/services/InstrumentServices.js`** - Single instrumentation pattern for all services

#### KISS (Strong)
- **`app/managers/files/index.js:32-48`** - Simple Ramda pipelines for data transformation
  ```javascript
  const normalizeAndSortByModifiedDate = R.pipe(
    R.sort(byLastModified),
    R.map(normalizeS3ObjectsList)
  );
  ```
- **`app/router/images.js:16-23`** - 8-line route handler with clear data flow
- **`lib/config.js:4-9`** - 6 lines to handle config loading with environment detection

#### YAGNI (Strong)
- **`features/lib/aws/s3.js:18-28`** - Commented-out date filtering with explanation for future use
- No unused dependencies in `package.json`
- No speculative abstractions or "framework" code

#### Single Responsibility (Strong)
- **`app/managers/files/index.js`** - Handles file uploads, listing, and deletion (S3 files domain)
- **`app/managers/images/index.js`** - Handles base64 image uploads only (image domain)
- **`app/managers/trigger/index.js`** - Handles Lambda/StepFunction triggers only
- Each manager has clear domain boundaries

#### Functional Composition (Excellent)
- **`app/managers/files/index.js:37-43`** - Point-free style with Ramda
  ```javascript
  const parseFileKeys = R.pipe(
    R.split(','),
    R.map(R.trim),
    R.reject(R.isEmpty)
  );
  ```
- **`app/managers/files/listData.js:35-43`** - Higher-order function composition
  ```javascript
  const ListAndSortObjects = ({ bucketService, skip, limit }) =>
    R.pipeP(
      bucketService.listObjectsByPrefix,
      selectContents,
      R.sort(byLastModified),
      R.slice(start, end)
    );
  ```

#### Immutability (Excellent)
- **ESLint enforcement**: `fp/no-let`, `fp/no-mutation`, `prefer-const` all set to error
- **All data transformations** use Ramda functions that return new objects
- **Exception handling** for Koa context (`ctx`) and Ramda operations explicitly documented

## Code Readability

**Overall Rating:** **Excellent**

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Intention-Revealing Names** | **Excellent** | Function names clearly express intent: `getBucketService`, `uploadBase64Image`, `normalizeAndSortByModifiedDate` |
| **Narrative Flow** | **Excellent** | Files read top-to-bottom: imports → constants → helpers → exports. Ramda pipelines read like prose. |
| **Abstraction Consistency** | **Excellent** | Each function stays at one level of abstraction. Higher-order functions clearly separate orchestration from implementation. |
| **Self-Documentation** | **Excellent** | Minimal comments needed. Code explains itself through naming and structure. |

### Highly Readable Examples:

#### 1. **`app/managers/files/index.js:90-108`** - Perfect narrative flow
```javascript
export const getObjectsList = async(managerCtx, {
  isAuthSupreme, prefix, bucketName
}) => {
  if (!isAuthSupreme) {
    throw error(supremeUserRequired);
  }
  const bucketService = await getBucketService({ managerCtx, bucketName });
  log.info('file prefix for lookup', { prefix });

  const result = await R.pipeP(
    bucketService.listObjectsByPrefix,
    R.propOr([], 'Contents'),
    normalizeAndSortByModifiedDate
  )(prefix);

  log.info('list files result', { result });
  return result;
};
```
- Function name reveals complete intent
- Steps read like prose: validate → get service → log → transform → return
- Ramda pipeline is self-explanatory

#### 2. **`app/managers/files/index.js:32-48`** - Intention-revealing transformers
```javascript
const selectLastModifiedDate = R.prop('LastModified');
const selectKey = R.prop('Key');

export const byLastModified = R.descend(selectLastModifiedDate);

const normalizeS3ObjectsList = R.applySpec({
  date: selectLastModifiedDate,
  key: selectKey
});

const normalizeAndSortByModifiedDate = R.pipe(
  R.sort(byLastModified),
  R.map(normalizeS3ObjectsList)
);
```
- Each function name explains its purpose
- Composition builds from simple to complex
- No comments needed

#### 3. **`lib/KoaCtxToManagerCtx.js:17-38`** - Clear abstraction
```javascript
const KoaCtxToManagerCtx = ({ Datastore, Services }) => ({ ctx }) => {
  const span = selectSpan({ ctx });
  const correlation = selectCorrelation({ ctx });
  const jwt = selectToken({ ctx });

  return {
    span,
    correlation,
    jwt,
    datastore: Datastore({ span, correlation }),
    service: Services({ span, correlation, jwt }),
    InstrumentedAsyncOperation: InstrumentedAsyncOperation({
      span, correlation, jwt, Datastore, Services
    })
  };
};
```
- Higher-order function with clear purpose
- Transformation logic is obvious
- Function signature documents dependencies

#### 4. **`app/router/files.js:11-20`** - Ramda selector composition
```javascript
const SelectFileProp = field => R.pipe(
  R.path(['ctx', 'request', 'fields', 'file']),
  R.head,
  R.path([field])
);

const selectFileName = SelectFileProp('name');
const selectFilePath = SelectFileProp('path');
const selectFileType = SelectFileProp('type');
const selectFileSize = SelectFileProp('size');
```
- Generic helper function creates specific selectors
- DRY principle applied elegantly
- Each selector's purpose is immediately clear

### Areas with Room for Improvement:

#### **Needs Improvement:**

1. **`features/lib/aws/s3.js:99-111`** - Low-level loop breaks functional style
   ```javascript
   for (const Key of recentKeys) { // eslint-disable-line
     const candidate = await R.pipeP( // eslint-disable-line
       findInBucket,
       R.ifElse(
         findInputRecordById({ recordId }),
         R.identity,
         R.F
       ))({ Key });
     if (candidate) {
       return candidate;
     }
   }
   ```
   - **Issue**: Imperative loop in otherwise functional codebase
   - **Context**: This is in test/feature code, not production
   - **Suggestion**: Could use `R.find` with async handling or explain necessity

2. **`app/index.js:24-26`** - Mutation for middleware setup
   ```javascript
   responseFormatter.unless = unless; //eslint-disable-line
   jwt.unless = unless; //eslint-disable-line
   tracing.unless = unless; //eslint-disable-line
   ```
   - **Issue**: Direct property assignment
   - **Context**: Required by `koa-unless` library API
   - **Status**: Acceptable - external library constraint with explicit comment

### Readability Strengths:

1. **Ramda pipelines tell stories** - Each transformation step is clear
2. **Higher-order functions** separate "what" from "how"
3. **Consistent patterns** - Once you learn one manager, you understand all
4. **Logging at key points** - Aids debugging without cluttering logic
5. **Error objects as data** - `app/errors/s3.js` defines errors declaratively

## Anti-Pattern Avoidance

The codebase successfully avoids common JavaScript anti-patterns:

### ✅ **Avoided Anti-Patterns:**
- **Callback hell** - Uses async/await and Ramda's `pipeP`
- **Global state** - All state passed through contexts
- **God objects** - Each module has single responsibility
- **Primitive obsession** - Uses Ramda specs for structured data
- **Magic numbers** - All constants named and defined at top
- **Deep nesting** - ESLint enforces max depth of 2

### ⚠️ **Acceptable Deviations:**
- **Imperative loops in tests** - Documented with eslint-disable comments
- **Koa context mutation** - Required by framework, explicitly allowed in config
