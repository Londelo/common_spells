# Coding Conventions - export-service

## Overview

This codebase is a **Node.js service** using ES6+ JavaScript with strong functional programming influences (Ramda library) and strict ESLint rules. It enforces immutability principles and prohibits imperative loops, classes, and mutations.

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `campaignId`, `exportObj`, `rowFormatter` |
| Functions | camelCase | `exportEntries`, `getCampaignAndMarkets`, `makeFileName` |
| Constants | SCREAMING_SNAKE_CASE | `STATUS`, `EXPORT_TYPE`, `DEFAULT_BUCKET` |
| Files | camelCase | `exportEntries.js`, `CsvWriter.js`, `InstrumentDatastores.js` |
| Minimum identifier length | 2 characters | Enforced by `id-length` rule (exceptions for loop variables) |
| Descriptive names | Required | Functions use intention-revealing names like `generateSubscriberKey`, `validateMarket` |

**File Naming Pattern:**
- Most files: camelCase (e.g., `exportEntries.js`, `normalizers.js`)
- Some classes/constructors: PascalCase (e.g., `CsvWriter.js`, `MultiFileZipper.js`)
- Index files: `index.js` for barrel exports

## Formatting

| Rule | Setting | Notes |
|------|---------|-------|
| Indentation | 2 spaces | Hard requirement |
| Quotes | Single (`'`) | Double quotes only for JSX |
| Semicolons | Required | Always |
| Trailing commas | Never | `comma-dangle: never` |
| Brace style | Stroustrup | Opening brace on same line, `else` on new line |
| Line length | 120 characters | Maximum |
| File length | 200 lines | Maximum (warning level) |
| Max nesting depth | 2 | Enforced strictly |
| Complexity limit | 7 | Cyclomatic complexity per function |
| Multiple empty lines | Maximum 1 | `no-multiple-empty-lines: { max: 1 }` |
| End of file | Newline required | `eol-last: always` |
| Padded blocks | Never | No padding inside blocks |

**Spacing Rules:**
- Arrow functions: space before/after arrow (`arrow-spacing: error`)
- Object curly braces: spaces inside `{ like: 'this' }`
- Comma spacing: after comma only, not before
- Keyword spacing: required (e.g., `if (condition)`)
- Infix operators: spaces required (e.g., `a + b`)

## Functional Programming Rules (eslint-plugin-fp)

This codebase enforces **strict functional programming principles**:

| Rule | Enforcement | Impact |
|------|-------------|--------|
| `fp/no-class` | error | **No classes allowed** - use factory functions |
| `fp/no-let` | error | **No `let` declarations** - use `const` only |
| `fp/no-loops` | error | **No loops** - use map/reduce/filter |
| `fp/no-mutation` | error | **No direct property mutation** - exceptions for Koa `ctx`/`context` |
| `fp/no-mutating-methods` | error | No `push`, `pop`, `splice` - exceptions for Ramda (`R`) |
| `fp/no-mutating-assign` | error | No `Object.assign` mutations |
| `fp/no-arguments` | error | No `arguments` object - use rest params |
| `fp/no-delete` | error | No `delete` operator |
| `fp/no-get-set` | error | No getters/setters |

**Mutations are disabled except:**
- Koa context objects (`ctx`, `context`)
- Ramda operations (safe mutations)

**ESLint Overrides Required:**
Many files use `eslint-disable` comments for specific cases:
- `// eslint-disable-next-line fp/no-let` - when counters needed
- `// eslint-disable-next-line fp/no-loops` - when async iteration required
- `// eslint-disable-next-line fp/no-mutation` - when incrementing counters
- `// eslint-disable-next-line no-await-in-loop` - for sequential async operations
- `// eslint-disable-next-line no-plusplus` - for counter increments

## Import Organization

**Standard Pattern:**
1. External libraries (Node built-ins, npm packages)
2. Internal shared libraries (`@verifiedfan/*`)
3. Local project files (relative imports)

**Example:**
```javascript
// External Node built-ins
import fs from 'fs';
import Debug from 'debug';

// External npm packages
import * as R from 'ramda';
import moment from 'moment-timezone';

// Internal libraries
import { error, normalizers } from '@verifiedfan/lib';
import aws from '@verifiedfan/aws';

// Local files
import config from '../../../lib/config';
import CsvWriter from './CsvWriter';
import { EXPORT_TYPE } from './enums';
```

**Named vs Default Exports:**
- Ramda: Always imported as `* as R` (namespace import)
- Utilities: Often destructured from `@verifiedfan/lib` (e.g., `{ error, normalizers }`)
- Local modules: Default exports common (e.g., `export default exportEntries`)
- Constants/enums: Named exports (e.g., `export const STATUS = {...}`)

## File Structure

**Typical file organization:**
1. **Imports** - organized by external → internal → local
2. **Constants/Configuration** - extracted from config or defined locally
3. **Helper functions** - private utility functions (not exported)
4. **Selectors** - Ramda-based data extraction functions (e.g., `R.prop`, `R.path`)
5. **Validators** - input validation functions
6. **Main functions** - primary exported functionality
7. **Default export** - the main function or object

**Example structure (from `exportEntries.js`):**
```javascript
// Imports
import Debug from 'debug';
import { error } from '@verifiedfan/lib';
import * as R from 'ramda';

// Constants
const debug = Debug('titan:exports:manager:exportEntries');
const marketIdPath = R.prop('_id');

// Helper functions
export const getCampaignAndMarkets = async({ datastore, campaignId }) => {...};
const writeEntries = ({...}) => {...};

// Main function
const exportEntries = async(managerCtx, {...}) => {...};

// Default export
export default exportEntries;
```

## ESLint Key Rules

### Error Level Rules (Must Follow)

| Rule | Setting | Purpose |
|------|---------|---------|
| `complexity` | max 7 | Limit cyclomatic complexity |
| `max-len` | 120 chars | Line length limit |
| `max-lines` | 200 lines | File size limit |
| `max-depth` | 2 | Nesting depth limit |
| `no-console` | error | No console statements (use Log) |
| `no-var` | error | Use `const`/`let` only |
| `prefer-const` | error | Immutable by default |
| `prefer-arrow-callback` | error | Use arrow functions for callbacks |
| `prefer-template` | error | Use template literals over concatenation |
| `eqeqeq` | error | Use `===` and `!==` only |
| `curly` | error | Braces required for all control statements |
| `consistent-return` | error | Functions must return consistently |
| `no-else-return` | error | Return early instead of else blocks |
| `no-nested-ternary` | error | No nested ternaries |
| `no-param-reassign` | error | Don't reassign function parameters |
| `no-shadow` | error | No variable shadowing |
| `no-unused-expressions` | error | No useless expressions (except ternaries) |
| `no-restricted-syntax` | error | **Prohibits:** loops, switch statements, with statements |
| `import/no-anonymous-default-export` | error | Named exports preferred for non-default |

### Key Differences from Standard JavaScript

1. **No loops** - use Ramda or array methods
2. **No classes** - use factory functions
3. **No mutations** - create new objects/arrays
4. **No `let`** - use `const` everywhere (disabled where necessary)
5. **No `switch` statements** - use object lookups or if/else
6. **Arrow functions preferred** - for callbacks and most functions

## Comment Style

**Patterns observed:**
- **JSDoc-style comments** for file headers (rare, but present):
  ```javascript
  /**
   * handles CRUD for db.ps_lists data
   */
  ```
- **Inline comments** for business logic explanations
- **ESLint directive comments** - very common for overriding FP rules
- **Debug labels** - used for logging contexts
- **TODO/FIXME** - not observed in sampled files

**Comment philosophy:**
- Comments are sparse
- Code is expected to be self-documenting through function names
- When comments exist, they explain *why* not *what*

## Consistency Assessment

### Adherence to Rules: **High**

The codebase generally follows its own strict rules, though with notable exceptions:

**Consistent:**
- Single quotes everywhere
- 2-space indentation universally applied
- Semicolons always present
- Ramda usage for functional transformations
- Import organization follows pattern
- No classes found
- Stroustrup brace style

**Requires Frequent Overrides:**
- **FP rules** are heavily violated with `eslint-disable` comments
  - `fp/no-let` - violated in ~20% of files for counters
  - `fp/no-loops` - violated for async iteration
  - `fp/no-mutation` - violated for counter increments
  - `no-await-in-loop` - violated for sequential async operations
  - `no-plusplus` - violated for counter increments

**Files exceeding limits:**
- `formatReminderEmailData/formatEmailRow.js`: **191 lines** (exceeds 200 max)
- `managers/exports/index.js`: **195 lines** (exceeds 200 max)
- These likely have lint warnings but are accepted

**Observation:**
The strict FP rules create tension with practical async/await patterns. The codebase maintains functional purity where possible, but pragmatically disables rules when async iteration or counter-based logic is necessary. This suggests the rules serve as guardrails rather than absolute constraints.

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | **Strong** | Extensive shared utilities in `@verifiedfan/*` packages, no duplicate logic patterns |
| **KISS** | **Moderate** | Functions average ~25-30 lines, but some exports have complex Ramda pipelines |
| **YAGNI** | **Strong** | No speculative features, focused on export functionality only |
| **Single Responsibility** | **Strong** | Each module has clear single purpose (e.g., `CsvWriter`, `exportEntries`, `normalizers`) |
| **Open/Closed** | **Weak** | Extension via new export types, but limited abstraction for extension points |
| **Interface Segregation** | **Moderate** | Small focused modules, but some large option objects passed through call chains |
| **Dependency Inversion** | **Weak** | Direct dependencies on MongoDB, S3, specific services (not abstracted) |
| **Functional Composition** | **Strong** | Heavy use of Ramda's `pipe`, `compose`, `converge` for transformations |
| **Immutability** | **Strong** | Enforced by ESLint rules, mutations only allowed in specific contexts |

### Detailed Principle Analysis

#### DRY (Don't Repeat Yourself) - **Strong**

**Evidence:**
- `@verifiedfan/lib` provides shared error handling, normalization, parameter mapping
- Utilities extracted to dedicated modules:
  - `/app/managers/exports/utils/index.js` - shared export utilities
  - `/app/managers/exports/normalizers.js` - data normalization
  - `/app/managers/exports/formatReminderEmailData/formatEmailRow.js` - email formatting
- Datastore abstraction via `InstrumentDatastores.js` wraps all datastores consistently
- Service abstraction via `InstrumentServices.js` applies tracing to all services

**Examples:**
- `makeFileName` - single source of truth for file naming across all export types (line 115 in `utils/index.js`)
- `normalizeExport` - single normalization pipeline for all exports (`normalizers.js:31-34`)
- MongoDB collection pattern - `Collection(collectionName)` factory used by all datastores

#### KISS (Keep It Simple, Stupid) - **Moderate**

**Simple areas:**
- `entries.js` datastore (74 lines) - straightforward CRUD operations
- `campaigns.js` datastore (15 lines) - minimal wrapper around base datastore
- `services/exportsS3/index.js` (9 lines) - simple AWS S3 configuration

**Complex areas:**
- `formatEmailRow.js` (191 lines) - 50+ selector functions, complex Ramda compositions
- `exportEntries.js` - nested async iteration with market/entry relationships
- `normalizers.js` - `R.pipeP` combining async operations

**Assessment:**
Functions are generally short (25-30 lines average), but **Ramda pipelines can be cryptic**:
```javascript
export const selectCampaignArtistName = R.ifElse(
  isFanClub,
  R.pipe(
    validateArtistFanClubName,
    selectArtistFanClubName,
  ),
  selectArtistName
);
```

#### YAGNI (You Aren't Gonna Need It) - **Strong**

**Evidence:**
- No speculative abstractions
- Export types only support existing business needs
- No generic "framework" code
- Configuration is loaded from environment, not over-engineered
- Test files are focused and practical

#### Single Responsibility Principle - **Strong**

**Evidence:**
- `CsvWriter.js` - only writes CSV files
- `exportEntries.js` - only handles entry export logic
- `normalizers.js` - only normalizes export objects
- `throwIfInvalid.js` - only validates input parameters
- Each datastore handles one collection

**File organization supports SRP:**
```
managers/exports/
  ├── exportEntries.js      # Entries export
  ├── exportCodes.js        # Codes export
  ├── exportFanlist.js      # Fanlist export
  ├── CsvWriter.js          # CSV writing
  ├── normalizers.js        # Normalization
  └── throwIfInvalid.js     # Validation
```

#### Functional Composition - **Strong**

**Evidence:**
Ramda is used extensively for:
- **Data extraction**: `R.prop`, `R.path`, `R.pathOr`
- **Transformation pipelines**: `R.pipe`, `R.pipeP`, `R.compose`
- **Conditional logic**: `R.ifElse`, `R.when`, `R.unless`, `R.cond`
- **Data manipulation**: `R.map`, `R.filter`, `R.reduce`, `R.groupBy`, `R.indexBy`

**Examples:**
```javascript
// Complex selector composition (formatEmailRow.js:80-83)
export const selectArtistFanClubName = R.converge(
  (artistName, fanClubName) => (R.includes(artistName, fanClubName) ? fanClubName : `${artistName} ${fanClubName}`),
  [selectArtistName, selectFanClubName]
);

// Pipeline composition (normalizers.js:31-34)
const normalizeExport = R.pipeP(
  setSignedUrl,
  normalizers.stringifyObjectId
);

// Async transformation (index.js:61-66)
return R.pipeP(
  exportsDataStore.findByCampaignIdAndType,
  R.defaultTo([]),
  R.map(exportObj => normalizeExport(managerCtx, exportObj)),
  promises => Promise.all(promises)
)({ campaignId, exportType });
```

#### Immutability - **Strong**

**Enforcement:**
- ESLint rules prohibit mutations
- Spread operators used for updates: `{ ...exportObj, status }`
- Ramda lens operations for nested updates: `R.set(marketLensPath, marketId, entry)`
- No array mutating methods (push, pop, splice)

**Pragmatic exceptions:**
- Counters in loops (when FP alternative is impractical)
- Koa context mutations (framework requirement)
- Jest mocks in test files

## Code Readability

**Overall Rating:** **Good**

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | **Excellent** | Functions clearly express intent |
| Narrative Flow | **Good** | Most files read top-to-bottom, though Ramda pipelines require FP knowledge |
| Abstraction Consistency | **Good** | Functions stay at consistent abstraction levels |
| Self-Documentation | **Good** | Code mostly self-explanatory, minimal comments needed |

### Highly Readable Examples

#### 1. **`throwIfInvalid.js`** - Crystal clear validation pattern
```javascript
const validators = {
  [EXPORT_TYPE.CODE_WAVES]: (managerCtx, { dateKey }) => {
    if (!dateKey) {
      throw error(MissingDateKey);
    }
    const dateKeyType = typeof dateKey;
    if (dateKeyType !== VALID_DATEKEY_TYPE) {
      throw error(InvalidDateKeyType({ type: dateKeyType }));
    }
    if (hasNonDigits(dateKey)) {
      throw error(InvalidDateKey({ dateKey }));
    }
  }
};

const throwIfInvalid = (managerCtx, { exportType, ...params }) => {
  if (!validators[exportType]) {
    return;
  }
  validators[exportType](managerCtx, params);
};
```
**Why readable:**
- Clear validator map by export type
- Descriptive error names
- Simple conditional logic
- Intention-revealing function names

#### 2. **`entries.js`** - Elegant datastore pattern
```javascript
const DataStore = defaultDataStore(collectionName);

const entries = {
  ...DataStore,
  findByPromoterOptIns: async({ campaignId, promoterId }) =>
    DataStore.find({ '_id.campaign_id': campaignId, 'fields.promoterOptIns': promoterId }),

  findByCampaign: async({ campaignId }) =>
    (await DataStore.find({ '_id.campaign_id': campaignId })).toArray()
};
```
**Why readable:**
- Extends base datastore with spread
- Arrow functions for simple queries
- Consistent parameter destructuring
- Clear query intent

#### 3. **`process.js`** - Clear state machine flow
```javascript
const ProcessQueue = managerCtx => async() => {
  const triggered = await exportsDatastore.findOldest({ status: STATUS.TRIGGERED });
  if (triggered) {
    await expireIfNecessary(managerCtx, { exportObj: triggered });
    return;
  }
  const pending = await exportsDatastore.findOldest({ status: STATUS.PENDING });
  if (!pending) {
    return;
  }
  try {
    const exportObj = await markAsTriggered(managerCtx, { exportObj: pending });
    const { key, count, meta } = await exportAndSave(managerCtx, exportObj);
    await markAsFinished(managerCtx, { exportObj: { ...exportObj, count, meta }, key });
  }
  catch (err) {
    await markAsFailed(managerCtx, { exportObj: pending, err });
  }
};
```
**Why readable:**
- Clear state transitions (PENDING → TRIGGERED → FINISHED/FAILED)
- Early returns for clarity
- Named functions describe actions (`markAsTriggered`, `markAsFinished`)
- Try-catch clearly handles failure path

### Areas Needing Improvement

#### 1. **`formatEmailRow.js` (191 lines)** - Too many selectors

**Issue:**
- 50+ selector functions
- Hard to understand which selectors are used where
- Mix of simple and complex compositions

**Suggestion:**
```javascript
// Group related selectors
export const CampaignSelectors = {
  selectTourName: R.path(['tour', 'name']),
  selectArtistColor: R.path(['style', 'theme', 'primary']),
  selectArtistName: R.path(['artist', 'name'])
};

export const MarketSelectors = {
  selectVenueName: R.pathOr('', ['event', 'venue', 'name']),
  selectEventDate: R.path(['event', 'date']),
  selectCityAndState: R.pick(['city', 'state'])
};
```

#### 2. **`CsvWriter.js`** - Mutation and mixed abstraction levels

**Issue (lines 22-39):**
```javascript
let numberOfRowsWritten = 0; // eslint-disable-line fp/no-let

return {
  write: async params => new Promise(resolve => {
    const row = makeRow(params);
    writeStream.write(row, resolve);
    ++numberOfRowsWritten; // eslint-disable-line no-plusplus, fp/no-mutation
  })
};
```

**Suggestion:**
Extract counter to closure or use stream event counting.

#### 3. **`exportEntries.js`** - Complex nested async iteration

**Issue (lines 45-52):**
```javascript
// eslint-disable-next-line no-restricted-syntax,no-unused-vars,fp/no-loops
for await (const entry of userEntries) {
  const user = entry.user;
  await writer.write({ user, entry, campaign, market }); // eslint-disable-line
  if (useAdditionalMarketRows) {
    await writeAdditionalMarketRows({ writer, user, entry, campaign, market, marketMap }); // eslint-disable-line
  }
}
```

**Issue:**
- Multiple eslint-disable comments indicate conflict with coding standards
- Sequential await in loop (performance concern)
- Variable naming (`user = entry.user`) redundant

**Suggestion:**
```javascript
// Use async iterator transform
const processEntry = async(entry) => {
  await writer.write({ user: entry.user, entry, campaign, market });
  if (useAdditionalMarketRows) {
    await writeAdditionalMarketRows({ writer, user: entry.user, entry, campaign, market, marketMap });
  }
};

// Process sequentially if order matters
for await (const entry of userEntries) {
  await processEntry(entry);
}
```

## Summary

The export-service codebase demonstrates:

✅ **Strengths:**
- Strict functional programming style with Ramda
- Strong immutability and purity principles
- Excellent single responsibility principle adherence
- Consistent code formatting
- Descriptive naming conventions
- Good DRY principles via shared utilities

⚠️ **Challenges:**
- Ramda compositions can be cryptic for those unfamiliar with FP
- Frequent eslint-disable comments indicate tension between FP rules and async patterns
- Some files exceed line count limits
- Complex selector files could benefit from grouping
- Abstraction for external dependencies (MongoDB, S3) is limited

🎯 **Overall Assessment:**
This is a **well-structured functional codebase** with clear conventions and strong engineering principles. The tension between strict FP rules and practical async/await patterns is managed pragmatically. The code prioritizes immutability and composition while remaining practical about when to disable strict rules.
