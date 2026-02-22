# Coding Conventions - campaign-workers

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `fileKey`, `workerName`, `campaignId` |
| Functions | camelCase | `createWorker`, `attachCampaignIds`, `selectEmail` |
| Classes | PascalCase | `MoveFiles`, `NormalizeRecord`, `PutManyToStreamIfPossible` |
| Files | camelCase | `triggerWorker.js`, `makeInventoryCode.js` |
| Constants | SCREAMING_SNAKE | `MAX_LIST_OBJECTS_RETRY_COUNT`, `LOG_TAG`, `KINESIS_CONSUMER` |
| Enums | SCREAMING_SNAKE | `FAN_IDENTIFIERS`, `SELECTED` |

**Note:** File naming is consistently camelCase for source files, with specialized naming patterns:
- Test files: `*.spec.js`
- Index files: `index.js` or `index.ts`
- Config files: `*.config.yml`

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single |
| Semicolons | Required (always) |
| Trailing commas | Never (no trailing commas) |
| Line length | 120 characters |
| Max file lines | 200 lines |
| Brace style | Stroustrup (else on new line) |
| Arrow parens | As needed |
| Arrow body style | As needed |
| Object spacing | Always (spaces inside braces) |

## ESLint Rules (Key)

### Functional Programming (fp plugin)

This codebase heavily enforces **functional programming principles** via the `fp` ESLint plugin:

| Rule | Setting | Impact |
|------|---------|--------|
| fp/no-class | error | **No ES6 classes allowed** - use functions and closures |
| fp/no-let | error | **No `let` declarations** - use `const` only |
| fp/no-loops | error | **No for/while loops** - use array methods (map, filter, reduce) |
| fp/no-mutation | error | Prevent mutation (exceptions: `this`, `ctx/context` for Koa) |
| fp/no-mutating-methods | error | No array/object mutation (`.push()`, `.sort()`, etc.) - Ramda exempted |
| fp/no-mutating-assign | error | No `Object.assign` that mutates |
| fp/no-delete | error | No `delete` operator |
| fp/no-get-set | error | No getters/setters |
| fp/no-arguments | error | No `arguments` object - use rest params |

### Complexity & Quality

| Rule | Setting | Notes |
|------|---------|-------|
| complexity | error (max 6) | **Very strict** - functions limited to 6 cyclomatic complexity |
| max-depth | error (max 2) | **Very strict** - maximum 2 levels of nesting |
| max-lines | error (max 200) | Files cannot exceed 200 lines |
| max-len | error (max 120) | Line length capped at 120 characters |
| id-length | error (min 2) | Variable names must be at least 2 characters |

### Modern JavaScript

| Rule | Setting |
|------|---------|
| no-var | error |
| prefer-const | error |
| prefer-arrow-callback | error |
| prefer-template | error |
| prefer-rest-params | error |
| prefer-spread | error |
| object-shorthand | error |
| arrow-spacing | error |
| arrow-body-style | error (as-needed) |

### Code Quality

| Rule | Setting |
|------|---------|
| eqeqeq | error |
| consistent-return | error |
| no-console | error |
| no-else-return | error |
| no-unused-expressions | error (allow ternary) |
| no-unreachable | error |
| no-param-reassign | error (props: false) |
| no-plusplus | error |
| no-nested-ternary | error |
| no-return-await | error |
| no-await-in-loop | error |

### Restricted Syntax

The following constructs are **completely banned**:

- `DoWhileStatement`
- `ForStatement`
- `ForInStatement`
- `ForOfStatement`
- `SwitchCase`
- `SwitchStatement`
- `WhileStatement`
- `WithStatement`
- `delete` operator

## Import Organization

Imports follow a consistent pattern:

1. **External dependencies** (npm packages)
2. **Internal shared modules** (relative imports from `shared/`)
3. **Local modules** (relative imports from same directory)

```javascript
// External
import * as R from 'ramda';
import Debug from 'debug';
import config from 'aws-sdk';

// Internal shared
import config from '../../shared/config';
import Log from '../../shared/Log';
import dataTypes from '../../shared/dataTypes';

// Local
import validators from './validators';
import makeInventoryCode from '../makeInventoryCode';
```

## File Structure

### Typical Module Pattern

1. **Imports** (external → internal → local)
2. **Constants** (LOG_TAG, configurations)
3. **Helper functions** (pure, single-purpose)
4. **Main logic** (composed from helpers)
5. **Export** (default export for main function)

### Example Structure

```javascript
// Imports
import * as R from 'ramda';
import Debug from 'debug';
import config from '../../shared/config';

// Constants
const LOG_TAG = 'verifiedfan:campaignPipeline:moduleName';
const debug = Debug(LOG_TAG);

// Helper functions
const selectId = R.prop('id');
const formatRecord = R.pick(['id', 'name', 'email']);

// Main logic
const processRecords = ({ input, services }) => R.pipe(
  R.filter(selectId),
  R.map(formatRecord)
)(input);

// Export
export default processRecords;
```

## Comment Style

### Minimal Comments Philosophy

Code is largely **self-documenting** through:
- Descriptive function names
- Clear variable names
- Composition patterns (Ramda pipelines)

### When Comments Appear

1. **JSDoc for complex functions** (rare)
2. **Inline explanations for business logic** (e.g., "reduce by email with TM priority over NON_TM")
3. **ESLint disable comments** for intentional rule violations (e.g., `/* eslint-disable max-lines */` for data files)
4. **Module headers** (brief descriptions like "represents a mongoDB connection configurable for use by any datastore")

### Examples

```javascript
/**
 * represents a mongoDB connection configurable for use by any datastore
 */

// reduce by email with TM priority over NON_TM
const groupEmails = (acc, record) => R.unless(
  R.prop('isTMTicketType'),
  R.always(record),
)(acc);

/* eslint-disable max-lines, no-multi-spaces */
const blacklistedDomains = { ... };
```

## Consistency Assessment

### Strengths

- **Highly consistent adherence to functional programming principles** across all files
- **Uniform import ordering** (external → internal → local)
- **Consistent file naming** (camelCase for source, *.spec.js for tests)
- **Strong naming conventions** (camelCase functions, PascalCase classes/constructors)
- **Heavy use of Ramda** for data transformation (R.pipe, R.map, R.filter, etc.)

### Inconsistencies

- **Mix of `.js` and `.ts` files** - TypeScript adoption is partial (tsconfig exists but most files are JS)
- **Some ESLint rule violations in specific files** (e.g., `/* eslint-disable max-lines */` in data files)
- **Test files exempt from `fp/no-let` and `fp/no-mutation`** (intentional for testing convenience)
- **Variable naming in config paths** - some use nested object access patterns vs. flat structures

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | Strong | Heavy use of shared utilities (`shared/` directory), Ramda composition, helper function extraction |
| **KISS** | Strong | Functions avg 25 lines, clear single-purpose functions, minimal abstractions |
| **YAGNI** | Strong | No speculative code, focused on specific AWS Lambda workers for campaign pipeline |
| **Single Responsibility** | Strong | Each module/function has single clear purpose (e.g., `attachCampaignIds.js`, `rejectInvalidRecords.js`) |
| **Open/Closed** | Moderate | Middleware composition pattern allows extension, but some hardcoded logic exists |
| **Interface Segregation** | Strong | Small, focused functions rather than god objects; Ramda encourages function composition |
| **Dependency Inversion** | Moderate | Some abstraction via Services pattern, but many direct AWS SDK dependencies |
| **Functional Purity** | Excellent | ESLint enforces immutability, no classes, no loops - pure functional style throughout |
| **Composition over Inheritance** | Excellent | No classes/inheritance; heavy use of function composition via Ramda pipes |

### Detailed Examples

#### DRY (Strong)

**Evidence:**
- Shared utilities in `shared/` directory (109+ shared modules)
- Reusable patterns: `Log()`, `PutManyToKinesisStream()`, `ComposeMiddlewares()`
- Config management centralized in `shared/config/`

**Example from `shared/format.js`:**
```javascript
export const formatDynamoDBPartitionKey = R.pipe(
  R.prop('memberid'),
  R.concat('m:')
);

export const formatDynamoDBSortKey = R.pipe(
  R.prop('campaign_id'),
  R.concat('c:')
);
```

These formatters are reused across multiple workers to ensure consistent DynamoDB key formatting.

**Example from `shared/selectors.js`:**
```javascript
export const selectS3ObjectKeyFromRecord = R.pipe(
  R.pathOr('', ['s3', 'object', 'key']),
  decodeURIComponent
);
```

S3 key extraction logic is extracted once and reused everywhere S3 events are processed.

#### KISS (Strong)

**Evidence:**
- Average function length: 25 lines
- Max nesting depth enforced at 2 levels
- Small, focused modules (avg 56 lines per file)
- Clear function names that explain intent

**Example from `rejectInvalidRecords.js`:**
```javascript
const rejectInvalidRecords = R.reject(({ campaignId, userId }) =>
  !campaignId || !userId);

export default rejectInvalidRecords;
```

Simple, clear, does one thing.

**Example from `PutManyToStreamIfPossible.js`:**
```javascript
const selectId = R.prop('globalUserId');

const PutManyToStreamIfPossible = ({ Services }) => R.ifElse(
  R.isEmpty,
  () => ({ in: 0, failed: 0, out: 0 }),
  PutManyToKinesisStream({
    stream: Services.aws.inputStream,
    makePartitionKey: selectId
  })
);
```

Clear branching logic - if empty, return zeros; otherwise, put to stream.

#### YAGNI (Strong)

**Evidence:**
- No speculative abstractions
- Code focused on current requirements (AWS Lambda workers for Verified Fan campaign pipeline)
- No unused utility functions or "just in case" code
- Terraform configs per environment, no over-engineering

**Counter-example (avoided):**
No evidence of unused abstractions, dead code, or speculative features.

#### Single Responsibility (Strong)

**Evidence:**
Each file/module does one thing clearly stated in its name.

**Examples:**
- `attachCampaignIds.js` - only attaches campaign IDs to records
- `attachUserIds.js` - only attaches user IDs to records
- `rejectInvalidRecords.js` - only filters out invalid records
- `readWaveFile.js` - only reads and parses wave files

**From `attachCampaignIds.js`:**
```javascript
const attachCampaignIds = ({ records, campaigns }) =>
  records.map(({ categoryId, campaignId, type, userId, marketId, globalUserId, code, date, __meta = {} }) => ({
    __meta,
    campaignId: campaignId || getCampaignIdFromApiResults({ categoryId, campaigns }),
    type,
    userId,
    code,
    date,
    categoryId,
    globalUserId,
    marketId
  }));
```

This function **only** attaches campaign IDs - nothing else.

#### Functional Purity (Excellent)

**Evidence:**
- ESLint rules enforce: no `let`, no mutations, no classes, no loops
- Heavy use of Ramda for pure transformations
- Async operations handled via `R.pipeP`
- No side effects in business logic (side effects isolated to I/O boundaries)

**Example from `campaignMappingUtils.js`:**
```javascript
export const makeCampaignIdToCategoryIdMap = R.pipe(
  loadCampaignMappings,
  R.indexBy(selectCampaignId),
  R.map(selectCategoryId)
);

export const makeContestTitleToCategoryIdMap = R.pipe(
  loadCampaignMappings,
  R.indexBy(selectContestTitle),
  R.map(selectCategoryId)
);
```

Pure transformations - same input always produces same output.

**Example from `readWaveFile.js`:**
```javascript
const readWaveFile = async({ bucket: { getObject }, fileKey }) => R.pipeP(
  getObject,
  content => parse(content, options),
  R.tap(data => debug('read wave file results %o', { fileKey, data }))
)(fileKey);
```

Side effects (logging) isolated to `R.tap` - main pipeline remains pure.

#### Composition over Inheritance (Excellent)

**Evidence:**
- No ES6 classes (banned by ESLint)
- Heavy function composition via Ramda
- Middleware composition pattern

**Example from `transformCodeAssignments/index.js`:**
```javascript
const BatchProcessRecords = ({ Services, stream, jwt }) => R.pipeP(
  LookupAndAttachUserIds({ Services, jwt }),
  LookupAndAttachCampaignIds({ Services, jwt }),
  rejectInvalidRecords,
  R.tap(records => debug('records for kinesis %O', records)),
  R.unless(
    R.isEmpty,
    PutManyToKinesisStream({ stream, makePartitionKey })
  ),
  R.tap(result => debug('result from kinesis %O', result))
);
```

Functions composed together via `R.pipeP` - each step is a pure transformation.

**Example from `ComposeMiddlewares.js`:**
```javascript
const ComposeMiddlewares = orderedMiddlewares => R.compose(...orderedMiddlewares);
```

Middleware functions composed functionally rather than via class inheritance.

## Code Readability

**Overall Rating:** Good

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | Function names clearly express intent (`attachCampaignIds`, `rejectInvalidRecords`, `makePartitionKey`) |
| Narrative Flow | Good | Ramda pipelines read top-to-bottom; helper functions extracted for clarity |
| Abstraction Consistency | Good | Most functions stay at single abstraction level; Ramda encourages consistent style |
| Self-Documentation | Excellent | Code is highly self-documenting due to descriptive names and functional style |

### Highly Readable Examples

#### 1. **`rejectInvalidRecords.js`** - Crystal clear intent

```javascript
const rejectInvalidRecords = R.reject(({ campaignId, userId }) =>
  !campaignId || !userId);

export default rejectInvalidRecords;
```

**Why it's readable:**
- Function name tells exactly what it does
- Implementation is trivial to understand
- Single purpose, single file

#### 2. **`readWaveFile.js`** - Clear pipeline narrative

```javascript
const readWaveFile = async({ bucket: { getObject }, fileKey }) => R.pipeP(
  getObject,
  content => parse(content, options),
  R.tap(data => debug('read wave file results %o', { fileKey, data }))
)(fileKey);
```

**Why it's readable:**
- Reads like a story: get object → parse content → log results
- Each step is clear and distinct
- Side effects (logging) isolated to `R.tap`

#### 3. **`PutManyToStreamIfPossible.js`** - Intentional naming

```javascript
const selectId = R.prop('globalUserId');

const PutManyToStreamIfPossible = ({ Services }) => R.ifElse(
  R.isEmpty,
  () => ({ in: 0, failed: 0, out: 0 }),
  PutManyToKinesisStream({
    stream: Services.aws.inputStream,
    makePartitionKey: selectId
  })
);
```

**Why it's readable:**
- "IfPossible" in name signals conditional logic
- Clear branching: empty → zero results, otherwise → put to stream
- Helper `selectId` explains partition key strategy

#### 4. **`campaignMappingUtils.js`** - Composition clarity

```javascript
export const makeCampaignIdToCategoryIdMap = R.pipe(
  loadCampaignMappings,
  R.indexBy(selectCampaignId),
  R.map(selectCategoryId)
);
```

**Why it's readable:**
- Function name describes output
- Pipeline shows transformation steps clearly
- Each step is a simple, named operation

### Needs Improvement

#### 1. **⚠️ `setupWorker/index.js:1-212`** - File too long

**Issues:**
- 212 lines (exceeds 200-line limit, has disable comment)
- Multiple responsibilities (create app, create terraform, build GitLab CI)
- Complex nested logic in `forEachTerraformEnv`

**Suggestion:**
- Split into separate modules: `createApp.js`, `createTerraform.js`, `buildGitlabCI.js`
- Extract terraform logic to dedicated module

#### 2. **⚠️ `decryptMemberId/index.js:17-19`** - While loop with mutation

```javascript
while (encoded.length % 4 !== 0) {// eslint-disable-line fp/no-loops
  encoded += '=';// eslint-disable-line fp/no-mutation
}
```

**Issues:**
- Uses `while` loop (banned in rest of codebase)
- Mutates `encoded` variable
- Intentional ESLint disables

**Suggestion:**
- Refactor to functional approach:
```javascript
const padBase64 = str => {
  const paddingNeeded = (4 - (str.length % 4)) % 4;
  return str + '='.repeat(paddingNeeded);
};
```

#### 3. **⚠️ `MoveFiles.js:20-45`** - Nested async recursion

```javascript
const moveFiles = async({ count, retryCount = 0 }) => {
  try {
    // ... logic ...
    return moveFiles({ count: addCounts(count, { files: deletedFiles }) });
  }
  catch (error) {
    if (retryCount < MAX_LIST_OBJECTS_RETRY_COUNT) {
      return moveFiles({ count, retryCount: retryCount + 1 });
    }
    // ...
  }
};
```

**Issues:**
- Recursive function with retry logic embedded
- Mixing concerns (moving files + retry logic)
- Could be clearer with explicit retry wrapper

**Suggestion:**
- Extract retry logic to generic retry utility
- Keep move logic simple and pure

## Special Patterns

### Ramda Heavy Usage

This codebase is **Ramda-first**. Nearly every data transformation uses Ramda functions:

**Common patterns:**
- `R.pipe()` / `R.pipeP()` - sequential transformations
- `R.map()` / `R.filter()` / `R.reject()` - array operations
- `R.prop()` / `R.path()` / `R.pathOr()` - property access
- `R.pick()` / `R.omit()` / `R.dissoc()` - object manipulation
- `R.indexBy()` - array to object conversion
- `R.curry()` / `R.curryN()` - function currying
- `R.tap()` - side effects in pipelines

### Higher-Order Functions

Functions frequently return functions:

```javascript
const MoveFiles = ({ campaignDataBucket, correlation }) => async prefix => {
  // implementation
};
```

This currying pattern allows partial application and dependency injection.

### Debug Logging Pattern

Consistent logging via the `debug` package:

```javascript
const LOG_TAG = 'verifiedfan:campaignPipeline:moduleName';
const debug = Debug(LOG_TAG);

// Usage in pipeline
R.tap(data => debug('read wave file results %o', { fileKey, data }))
```

### Middleware Composition

Workers compose behavior via middleware:

```javascript
const ComposeMiddlewares = orderedMiddlewares => R.compose(...orderedMiddlewares);
```

Middleware types: `kinesisConsumer`, `dynamodbConsumer`, `s3Consumer`, `scheduledConsumer`, etc.
