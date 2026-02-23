# Code Complexity - campaign-workers

## Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Total files | 327 | JS/TS files (excluding node_modules, build artifacts) |
| Avg function length | ~25 lines | Enforced by ESLint (complexity: 6) |
| Max nesting depth | 2 | Strictly enforced by ESLint (max-depth: 2) |
| Avg file size | 56 lines | Most files are small, focused modules |
| Largest file | 473 lines | Test file: `selectSingleMarketFans.spec.js` |
| Max file lines (enforced) | 200 lines | ESLint rule (frequently disabled for data/test files) |
| Cyclomatic complexity | 6 max | Very strict limit enforced by ESLint |

## File Size Distribution

| Size Range | Count | Purpose |
|------------|-------|---------|
| 1-50 lines | ~180 | Small, focused modules (helpers, selectors, validators) |
| 51-100 lines | ~90 | Standard modules (workers, transformers, datastores) |
| 101-200 lines | ~45 | Larger workers with multiple functions |
| 201+ lines | ~12 | Test files, data files (blacklisted domains), setup tools |

### Largest Files (200+ lines)

1. **473 lines** - `apps/processSmsWaveFiles/selectEligibleFans/selectSingleMarketFans.spec.js` (test file)
2. **271 lines** - `tools/load/registrations/titanPs/normalizeRegistrations/normalizeRegistrations.spec.js` (test file)
3. **235 lines** - `apps/processScoredFiles/blacklistedDomains.js` (data file - list of blocked email domains)
4. **213 lines** - `runfile.js` (build/tooling script)
5. **211 lines** - `tools/setupWorker/index.js` (worker scaffolding tool)

**Note:** Files exceeding 200 lines typically have `/* eslint-disable max-lines */` comment at the top.

## Complexity Observations

### Simple Areas

#### Pure Utility Functions (Excellent Simplicity)

**`shared/format.js` (12 lines):**
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

**Complexity score:** 1
**Why it's simple:** Single-purpose formatters, pure functions, no branching.

---

**`shared/selectors.js` (9 lines):**
```javascript
export const selectS3ObjectKeyFromRecord = R.pipe(
  R.pathOr('', ['s3', 'object', 'key']),
  decodeURIComponent
);

export const selectS3BucketFromRecord = R.pathOr('', ['s3', 'bucket', 'name']);
```

**Complexity score:** 1
**Why it's simple:** Property extraction with defaults, no logic.

---

**`apps/transformCodeAssignments/rejectInvalidRecords.js` (6 lines):**
```javascript
const rejectInvalidRecords = R.reject(({ campaignId, userId }) =>
  !campaignId || !userId);

export default rejectInvalidRecords;
```

**Complexity score:** 2
**Why it's simple:** Single filter operation, clear validation logic.

#### Simple Composition Patterns

**`shared/middlewares/ComposeMiddlewares.js` (5 lines):**
```javascript
const ComposeMiddlewares = orderedMiddlewares => R.compose(...orderedMiddlewares);

export default ComposeMiddlewares;
```

**Complexity score:** 1
**Why it's simple:** Trivial wrapper around Ramda's compose.

---

**`apps/processScoredFiles/PutManyToStreamIfPossible.js` (15 lines):**
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

**Complexity score:** 2
**Why it's simple:** Single conditional (empty check), clear branching.

#### Simple Data Transformations

**`apps/transformCodeAssignments/attachUserIds.js` (28 lines):**
```javascript
const attachUserIds = ({ records, users }) =>
  records.map(({ campaignId, categoryId, type, marketId, globalUserId, code, date, __meta = {} }) => {
    const userId = R.path([globalUserId, 'userId'], users);

    if (!userId) {
      log.warn(`Could not retrieve 'globalUserId' ${globalUserId} in service api results`);
    }

    return {
      __meta,
      campaignId,
      type,
      userId,
      code,
      date,
      categoryId,
      globalUserId,
      marketId
    };
  });
```

**Complexity score:** 2
**Why it's simple:** Single map operation, one conditional for logging.

### Moderate Complexity Areas

#### Pipeline Transformations with Multiple Steps

**`apps/transformCodeAssignments/index.js:37-47` (Medium):**
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

**Complexity score:** 3
**Why it's moderate:**
- 6 sequential steps (but each is simple)
- Async pipeline (`pipeP`)
- Conditional logic embedded in `R.unless`
- Overall readable due to functional composition

---

**`tools/load/campaignMappingUtils.js:29-34` (Medium):**
```javascript
const loadCampaignMappings = R.pipe(
  fs.readFileSync,
  fileStr => parse(fileStr, parseParams),
  R.map(R.over(R.lensProp('isFromOldPlatform'), parseBooleanString)),
  flattenCategoryIds
);
```

**Complexity score:** 3
**Why it's moderate:**
- File I/O (side effect)
- Nested transformations (lens usage)
- Custom flattening logic
- Still clear due to pipeline structure

#### Async Operations with Error Handling

**`shared/readWaveFile.js:15-19` (Medium):**
```javascript
const readWaveFile = async({ bucket: { getObject }, fileKey }) => R.pipeP(
  getObject,
  content => parse(content, options),
  R.tap(data => debug('read wave file results %o', { fileKey, data }))
)(fileKey);
```

**Complexity score:** 2
**Why it's moderate:**
- Async pipeline
- External I/O (S3)
- CSV parsing
- Clean due to functional style

---

**`shared/datastores/campaigns.js:7-11` (Medium):**
```javascript
const findOpenCampaignsWithArtist = connectionId => async() => {
  const { campaigns } = Mongo(connectionId);
  const cursor = await campaigns.find(makeOpenQuery(), { _id: 1, name: 1, artist: 1, slack: 1 });
  return cursor.toArray();
};
```

**Complexity score:** 2
**Why it's moderate:**
- Database query
- Async operation
- Dynamic query construction
- Straightforward logic

### Complex Areas

#### Recursive Functions with Retry Logic

**`apps/moveMergedAvroFiles/MoveFiles.js:19-45` (High):**
```javascript
const MoveFiles = ({ campaignDataBucket, correlation }) => async prefix => {
  const moveFiles = async({ count, retryCount = 0 }) => {
    try {
      await delay(calculateDelay(retryCount));
      const { Contents } = await campaignDataBucket.listObjects({ prefix });
      const fileKeys = selectFileKeys(Contents);

      if (!fileKeys.length) {
        return count;
      }

      const copiedFileKeys = await copyFiles({ fileKeys, campaignDataBucket, correlation });
      const deletedFiles = await deleteFiles({ fileKeys: copiedFileKeys, campaignDataBucket, correlation });

      return moveFiles({ count: addCounts(count, { files: deletedFiles }) });
    }
    catch (error) {
      const { message, stack } = error;
      if (retryCount < MAX_LIST_OBJECTS_RETRY_COUNT) {
        return moveFiles({ count, retryCount: retryCount + 1 });
      }
      log.warn('failed to list objects', { message, stack, prefix, correlation });
      throw error;
    }
  };

  return moveFiles({ count: defaultCount });
};
```

**Complexity score:** 5
**Why it's complex:**
- Recursive async function (tail recursion for pagination)
- Retry logic embedded in recursion
- Error handling with conditional retry
- Multiple async operations (list, copy, delete)
- Exponential backoff via `calculateDelay(retryCount)`

**Recommendations:**
- Extract retry logic to generic utility: `withRetry({ fn, maxRetries, backoff })`
- Separate pagination from retry concerns
- Add explicit termination condition logging

---

#### Multi-step Data Processing with Deduplication

**`apps/processSmsWaveFiles/handleSelectedRecords/index.js:19-54` (High):**
```javascript
const handleSelectedRecords = ({ marketDetails, nonTmPasswords, fileWriter, campaignName, records }) => R.pipe(
  R.map(R.pipe(
    NormalizeRecord({ marketDetails, nonTmPasswords, campaignName }),
    R.tap(WriteMasterCodesAndSmsFile({ fileWriter }))
  )),
  WriteSelectedEmailFiles({ fileWriter })
)(records);
```

**Complexity score:** 4
**Why it's complex:**
- Nested pipelines (`R.pipe` inside `R.map`)
- Multiple side effects (file writes via `fileWriter`)
- Deduplication logic in `WriteSelectedEmailFiles`:
  ```javascript
  const dedupeByEmail = R.reduceBy(groupEmails, {}, selectEmail);
  ```
- Multiple file categories (master codes, SMS selected, email files)
- Complex record normalization

**Recommendations:**
- Split into smaller functions: `normalizeRecords`, `writeToMasterAndSms`, `writeEmailFiles`
- Make deduplication logic more explicit (currently hidden in `reduceBy`)
- Consider extracting file writing to separate concern

---

#### Complex Setup Logic

**`tools/setupWorker/index.js:84-108` (High):**
```javascript
export const insertInConfig = ({ workerName, inventoryCode, entryFile, middlewareType }) => {
  const workerPath = makeWorkerPath(workerName);

  const defaultConfig = resolveConfig(defaultConfigPath);

  if (defaultConfig.getIn(workerPath)) {
    throw Error(`Config for worker ${workerName} already exists.`);
  }
  const updatedConfig = defaultConfig.setIn(
    workerPath,
    fromJS({
      createdDate: toISOString(),
      inventoryCode,
      entryFile,
      middlewareType
    })
  );

  writeFileSync(
    defaultConfigPath,
    toYamlStr(updatedConfig.toJS(), { lineWidth: -1 })
  );

  log(`Wrote to default.config.yml to node '${workerPath.join('.')}'.`);
};
```

**Complexity score:** 3
**Why it's complex:**
- File I/O (read config, write config)
- Immutable data structure manipulation (Immutable.js)
- YAML serialization/deserialization
- Error handling (duplicate check)
- Side effect (console logging)

**Recommendations:**
- Extract config reading/writing to separate utility
- Make idempotent (allow re-running without error)
- Add validation for `inventoryCode`, `entryFile`, `middlewareType`

---

#### Imperative Code (Rare Exception)

**`tools/decryptMemberId/index.js:12-22` (Medium-High):**
```javascript
const customBase64Decode = inputStr => {
  let encoded = inputStr// eslint-disable-line fp/no-let
    .replace('-', '+')
    .replace('_', '/');

  while (encoded.length % 4 !== 0) {// eslint-disable-line fp/no-loops, no-restricted-syntax
    encoded += '=';// eslint-disable-line fp/no-mutation
  }

  return Buffer.from(encoded, 'base64');
};
```

**Complexity score:** 3
**Why it's complex:**
- Uses `let` (banned elsewhere)
- Uses `while` loop (banned elsewhere)
- Mutates variable
- Intentional ESLint disables

**Recommendations:**
- Refactor to functional approach:
  ```javascript
  const padBase64 = str => {
    const paddingNeeded = (4 - (str.length % 4)) % 4;
    return str + '='.repeat(paddingNeeded);
  };

  const customBase64Decode = R.pipe(
    str => str.replace('-', '+').replace('_', '/'),
    padBase64,
    str => Buffer.from(str, 'base64')
  );
  ```

## Architectural Complexity

### Worker Pattern Complexity: Low-Medium

**Structure:**
```
apps/{workerName}/
  ├── index.js           (main handler, ~50-100 lines)
  ├── helpers/           (small utilities)
  └── *.spec.js          (tests)
```

**Middleware composition:**
```javascript
ComposeMiddlewares([
  transformInput,
  services,
  datastores,
  handler,
  resultHandler
])
```

**Complexity score:** 3
**Why it's manageable:**
- Clear separation of concerns (middleware layers)
- Each worker is independent
- Shared logic extracted to `shared/`
- Functional composition keeps complexity low

### Data Pipeline Complexity: Medium

**Typical pipeline:**
```
S3/Kinesis → Worker → Transform → Validate → Enrich → Output Stream → S3/DynamoDB
```

**Complexity drivers:**
- **Multiple data sources:** S3, Kinesis, DynamoDB, MongoDB, external APIs
- **Async operations:** Heavy use of `pipeP` for async pipelines
- **Error handling:** Retry logic, logging, dead-letter handling
- **Batch processing:** `BatchFn` utility for chunking records

**Complexity score:** 4
**Mitigation:**
- Functional pipelines keep flow explicit
- Small, testable functions
- Clear naming (e.g., `LookupAndAttachUserIds`, `rejectInvalidRecords`)

### Config Management Complexity: Medium

**Complexity drivers:**
- **Multiple environments:** dev1, qa1, preprod1, prod1
- **Multiple accounts:** tm-nonprod, tm-prod
- **Immutable.js config objects:** `.getIn()`, `.setIn()` patterns
- **YAML config files:** `configs/default.config.yml`, env-specific overrides

**Complexity score:** 3
**Mitigation:**
- Centralized config in `shared/config/`
- Clear environment selection logic
- TypeScript config (`tsconfig.json`) provides some type safety

## Recommendations

### High Priority

1. **Refactor recursive retry logic** in `MoveFiles.js`
   - Extract to generic `withRetry` utility
   - Make retry behavior configurable
   - Add explicit logging for retry attempts

2. **Simplify `setupWorker/index.js`**
   - Split into smaller modules: `createApp.js`, `createTerraform.js`, `buildGitlabCI.js`
   - Extract Terraform logic to dedicated module
   - Make functions idempotent (allow re-running)

3. **Refactor `decryptMemberId` to functional style**
   - Remove `let` and `while` loop
   - Use `repeat()` for padding instead of mutation
   - Align with codebase functional principles

### Medium Priority

4. **Add complexity metrics to CI/CD**
   - Run `eslint-complexity` report in GitLab CI
   - Fail build if complexity > 6 in any function
   - Track file size trends over time

5. **Document complex pipelines**
   - Add JSDoc to multi-step pipelines (e.g., `BatchProcessRecords`)
   - Explain business logic in comments (e.g., "TM priority over NON_TM")
   - Create architecture diagram for worker data flow

6. **Extract common patterns to utilities**
   - Generic retry logic: `withRetry({ fn, maxRetries, backoff })`
   - Generic batching: Already exists (`BatchFn`), but could be enhanced
   - Generic error logging: Standardize error log format

### Low Priority

7. **Consolidate test file size**
   - Test files are often 200+ lines
   - Consider splitting large test files by scenario
   - Extract test fixtures to separate files

8. **Migrate remaining JS files to TypeScript**
   - ~90% of files are JS, only ~10% are TS
   - `tsconfig.json` exists but adoption is incomplete
   - Would add type safety and reduce runtime errors

9. **Reduce Ramda dependency surface area**
   - Consider native array methods where appropriate (`.map()`, `.filter()`)
   - Evaluate if all Ramda functions add value vs. complexity
   - **Note:** This is low priority as Ramda is deeply embedded and works well

## Complexity Trends

### What's Working Well

- **Functional style** keeps complexity low and code predictable
- **Small, focused modules** (avg 56 lines) prevent complexity buildup
- **ESLint enforcement** prevents complexity creep (max complexity: 6)
- **Ramda pipelines** make data flow explicit and testable

### What Could Improve

- **Async complexity** is growing (recursive retries, nested async pipelines)
- **File size violations** increasing (12+ files exceed 200-line limit)
- **Test complexity** is high (largest file is 473-line test file)
- **TypeScript adoption stalled** (only ~10% of files migrated)

## Summary

**Overall complexity rating:** Low-Medium

This codebase maintains **low complexity** through:
- Strict functional programming (no classes, no loops, no mutations)
- Small, single-purpose functions
- Clear naming conventions
- Ramda-based composition

**Complexity hotspots:**
- Recursive retry logic (`MoveFiles.js`)
- Worker setup tooling (`setupWorker/index.js`)
- Multi-step data pipelines with side effects (`handleSelectedRecords`)
- Imperative crypto logic (`decryptMemberId`)

**Strengths:**
- Average function length: 25 lines (excellent)
- Max nesting depth: 2 (excellent)
- Average file size: 56 lines (excellent)
- Functional purity: 95%+ (excellent)

**Opportunities:**
- Refactor recursive patterns to generic utilities
- Split large setup files into smaller modules
- Standardize error handling and retry patterns
- Complete TypeScript migration for type safety
