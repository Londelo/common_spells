# Code Complexity - export-service

## Metrics Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total source files | 75 | 📊 |
| Total test files | 15 | ✅ Test coverage present |
| Average file size | ~109 lines | ✅ Under 200-line limit |
| Largest file | 195 lines | ⚠️ Near limit |
| Max allowed file size | 200 lines | ESLint rule |
| Max nesting depth | 2 | ESLint rule |
| Max cyclomatic complexity | 7 | ESLint rule |
| Avg function length | ~25-30 lines | ✅ Reasonable |

## File Size Distribution

### Largest Files

| File | Lines | Status | Notes |
|------|-------|--------|-------|
| `managers/exports/index.js` | 195 | ⚠️ Near limit | Main export orchestration |
| `managers/exports/formatReminderEmailData/formatEmailRow.js` | 191 | ⚠️ Near limit | 50+ selector functions |
| `managers/exports/formatReminderEmailData/extractEventsData.js` | 176 | ✅ Under limit | Event data extraction |
| `managers/exports/formatReminderEmailData/testingMockData.js` | 139 | ✅ Under limit | Test fixtures |
| `managers/queue/process.js` | 135 | ✅ Under limit | Queue processing logic |
| `managers/exports/utils/index.js` | 123 | ✅ Under limit | Shared utilities |
| `managers/exports/enums.js` | 121 | ✅ Under limit | Constants/enums |
| `errors/index.js` | 115 | ✅ Under limit | Error definitions |

### File Size Categories

| Category | File Count | Percentage |
|----------|------------|------------|
| Small (1-50 lines) | ~35 | 47% |
| Medium (51-100 lines) | ~25 | 33% |
| Large (101-200 lines) | ~15 | 20% |
| **Exceeds limit (200+)** | **0** | **0%** |

**Observation:** The codebase stays within the 200-line limit, though two files are very close (195, 191 lines). This indicates discipline in following the ESLint rule.

## Complexity Observations

### Simple Areas (Low Complexity)

These modules are straightforward, easy to understand, and follow simple patterns:

#### 1. **Datastore Modules** (Average: 20-40 lines)

**Example: `datastore/campaigns.js` (15 lines)**
```javascript
const collectionName = 'campaigns';
const DataStore = defaultDataStore(collectionName);

const campaigns = {
  ...DataStore,
  findById: DataStore.findByObjectIdStr
};

export default campaigns;
```
**Why simple:**
- Minimal abstraction over base datastore
- Clear single responsibility
- No complex logic

**Example: `datastore/entries.js` (74 lines)**
- Extends base datastore with specialized queries
- Uses MongoDB aggregation pipelines
- Clear separation of concerns
- Each function has one purpose

#### 2. **Service Configuration Modules**

**Example: `services/exportsS3/index.js` (9 lines)**
```javascript
import config from '../../../lib/config';
import aws from '@verifiedfan/aws';

const { aws: { clients: { exportServiceBucket:
  { key, secret, bucketName, region } } } } = config.get('titan').toJS();

const exportsS3 = aws.S3({ bucketName, accessKeyId: key, secretAccessKey: secret, region });

export default exportsS3;
```
**Why simple:**
- Configuration extraction
- No business logic
- Direct S3 client initialization

#### 3. **Error Definitions**

**Example: `errors/index.js` (115 lines)**
- Factory functions for error objects
- Consistent pattern: `{ status, message, payload }`
- No logic, just data structures
- Self-documenting error names

#### 4. **Small Utility Modules**

**Example: `datastore/InstrumentDatastores.js` (27 lines)**
```javascript
const InstrumentDatastores = ({ datastores = {} }) => ({ correlation }) =>
  R.mapObjIndexed(
    (datastore, datastoreName) => TracedSdk({
      sdk: datastore,
      serviceName: prependDatastorePrefix(datastoreName),
      attributes: {
        'db.user': R.always(dbUser),
        'db.name': R.always(dbName),
        'tm.correlation_id': correlation.id
      },
      tracerName
    }),
    datastores
  );
```
**Why simple:**
- Single transformation function
- Clear purpose (add tracing to datastores)
- Ramda makes it concise

### Complex Areas (Higher Complexity)

These modules require deeper understanding and have higher cognitive load:

#### 1. **`managers/exports/formatReminderEmailData/formatEmailRow.js` (191 lines)**

**Complexity factors:**
- **50+ selector functions** using Ramda compositions
- **Complex data transformations** with nested `R.pipe`, `R.converge`
- **Cryptography logic** for subscriber key generation
- **Locale/region mapping** with multiple lookup tables
- **Validation and error throwing** embedded in selectors

**Example of complexity:**
```javascript
export const selectCampaignArtistName = R.ifElse(
  isFanClub,
  R.pipe(
    validateArtistFanClubName,
    selectArtistFanClubName,
  ),
  selectArtistName
);

export const findCodeByMarketId = ({ marketId, scoringRecord }) => R.pipe(
  R.sortBy(R.prop('id')),
  R.uniqBy(R.prop('marketId')),
  R.find(R.propEq('marketId', marketId)),
  R.prop('id'),
  R.when(
    isNilOrEmpty,
    () => {
      throw error(MissingCodeFromMarket({ marketId, ...selectScoringRecordId(scoringRecord) }));
    }
  )
)(selectCodes(scoringRecord));
```

**Issues:**
- Requires deep Ramda knowledge
- Selector functions mix extraction with validation
- Hard to understand data flow without tracing through multiple selectors
- Constants mixed with logic (SFMC_CLIENT_CODE mapping)

**Estimated cyclomatic complexity:** 4-6 per function (within limit)

#### 2. **`managers/exports/index.js` (195 lines)**

**Complexity factors:**
- **Export type routing** with lookup table (`exportByType`)
- **Multiple export paths** (processed vs non-processed)
- **Async orchestration** with `Promise.all`
- **Queue management** logic
- **Error handling and status tracking**
- **S3 upload coordination**

**Example of complexity:**
```javascript
export const exportAndSave = async(managerCtx, exportObj) => {
  const { campaignName, campaignId, date: { created: createdDate }, exportType } = exportObj;
  const exportFn = exportByType[exportType];

  if (nonProcessedExportTypes.has(exportType)) {
    return exportFn(managerCtx, { exportObj });
  }

  const passThroughStream = new stream.PassThrough();
  const rowFormatter = RowFormatter({ type: exportType });
  const fileExt = rowFormatter.fileExtension;
  const bucketType = resolveBucketByType(exportType);

  try {
    const [{ key }, count ] = await Promise.all([
      managerCtx.service[bucketType].uploadFromStream({...}),
      exportFn(managerCtx, { rowFormatter, passThroughStream, exportObj })
    ]);
    return { key, count };
  }
  finally {
    passThroughStream.end();
  }
};
```

**Issues:**
- Multiple responsibilities (routing, streaming, uploading)
- Parallel async operations require careful coordination
- Stream lifecycle management in try/finally
- Type-specific branching logic

**Estimated cyclomatic complexity:** 5-7 (at or near limit)

#### 3. **`managers/exports/exportEntries.js` (85 lines)**

**Complexity factors:**
- **Nested async iteration** (markets → entries)
- **Conditional additional market rows** logic
- **Database aggregations** with MongoDB lookups
- **Multiple interdependent async operations**

**Example of complexity:**
```javascript
const writeEntries = ({...}) => MapAsyncSerial(
  async market => {
    const userEntries = await datastore.entries.findUserEntries({...});
    // eslint-disable-next-line no-restricted-syntax,no-unused-vars,fp/no-loops
    for await (const entry of userEntries) {
      const user = entry.user;
      await writer.write({ user, entry, campaign, market });
      if (useAdditionalMarketRows) {
        await writeAdditionalMarketRows({...});
      }
    }
  }
)(campaignMarkets);
```

**Issues:**
- Nested async iteration (`MapAsyncSerial` → `for await`)
- Sequential writes (potential performance bottleneck)
- Conditional branching inside loop
- Multiple eslint-disable comments indicate FP rule conflicts

**Estimated cyclomatic complexity:** 4-5

#### 4. **`managers/queue/process.js` (135 lines)**

**Complexity factors:**
- **State machine logic** (PENDING → TRIGGERED → FINISHED/FAILED/EXPIRED)
- **Error handling** with graceful degradation
- **Timeout/expiration logic**
- **Distributed tracing integration**
- **Preliminary count optimization**

**Example of complexity:**
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
    await markAsFinished(managerCtx, { exportObj: {...}, key });
  }
  catch (err) {
    await markAsFailed(managerCtx, { exportObj: pending, err });
  }
};
```

**Why complex:**
- Multiple state transitions
- Conditional logic based on database state
- Error recovery paths
- Timeout handling
- Integration with tracing system

**Estimated cyclomatic complexity:** 5-6

#### 5. **`managers/exports/utils/index.js` (123 lines)**

**Complexity factors:**
- **File naming strategies** for 10+ export types
- **Region/locale mapping logic**
- **Date formatting** with timezone handling
- **Multiple lookup tables**
- **Complex string transformations**

**Example:**
```javascript
export const makeFileNameForAutoReminderEmail = ({ campaignId, artistName, locale, campaign }) => {
  const now = new Date();
  const day = now.toLocaleDateString('en', { day: '2-digit' });
  const month = now.toLocaleDateString('en', { month: '2-digit' });
  const year = now.toLocaleDateString('en', { year: 'numeric' });
  const hh = now.toLocaleTimeString('en', { hour: '2-digit', hour12: false });
  const mm = now.toLocaleTimeString('en', { minute: '2-digit' });

  const region = selectLocaleRegion(locale, { isLNAA: campaign?.options?.isLNAA });
  const MID = SFMCMIDByRegion[region];
  const prefix = SFMCPrefixByRegion[region] || `TMInternational/${MID}/DM_ArtistPresale/DM_ArtistPresale_V03`;

  return `${prefix}_${normalizeArtistName(artistName)}_${campaignId}_${year}${month}${day}${hh}${mm}.csv`;
};
```

**Issues:**
- Business logic embedded in utility functions
- Date formatting is verbose
- Multiple string operations
- Region-specific rules

**Estimated cyclomatic complexity:** 3-5 per function

### Ramda Pipeline Complexity

**High cognitive load areas:**

Many files use deep Ramda compositions that are concise but require FP expertise to understand:

```javascript
// From normalizers.js
const normalizeExport = R.pipeP(
  setSignedUrl,
  normalizers.stringifyObjectId
);

// From index.js
return R.pipeP(
  exportsDataStore.findByCampaignIdAndType,
  R.defaultTo([]),
  R.map(exportObj => normalizeExport(managerCtx, exportObj)),
  promises => Promise.all(promises)
)({ campaignId, exportType });

// From formatEmailRow.js
export const selectArtistFanClubName = R.converge(
  (artistName, fanClubName) => (R.includes(artistName, fanClubName) ? fanClubName : `${artistName} ${fanClubName}`),
  [selectArtistName, selectFanClubName]
);
```

**Complexity assessment:**
- **Pros:** Concise, declarative, composable
- **Cons:** Requires Ramda knowledge, hard to debug, difficult to trace execution flow

## Nesting Depth Analysis

**ESLint enforces max depth of 2**, which is **very strict**.

**Examples of depth-2 code:**

```javascript
// Depth 2: if → for await → if
if (queuedExports.length) {          // depth 1
  return formatUpsertedExport(queuedExports[0]);
}

for await (const entry of userEntries) {  // depth 1
  if (useAdditionalMarketRows) {          // depth 2
    await writeAdditionalMarketRows({...});
  }
}
```

**Workarounds for depth limit:**
- **Early returns** to avoid deep nesting
- **Extract functions** when logic gets complex
- **Guard clauses** at function start
- **Ramda pipelines** to flatten control flow

**Example of early return pattern:**
```javascript
const throwIfInvalid = (managerCtx, { exportType, ...params }) => {
  if (!validators[exportType]) {
    return;  // Early return avoids nesting
  }
  validators[exportType](managerCtx, params);
};
```

## Function Length Analysis

**Typical function length:** 15-30 lines

**Shorter functions (5-15 lines):**
- Selector functions (Ramda compositions)
- Simple transformations
- Configuration loaders
- Error factory functions

**Medium functions (15-40 lines):**
- Export handlers (`exportEntries`, `exportCodes`)
- Datastore queries
- Route handlers
- Normalization functions

**Longer functions (40-60 lines):**
- `exportAndSave` (managers/exports/index.js) - ~35 lines
- `ProcessQueue` (managers/queue/process.js) - ~35 lines
- `makeFileNameForAutoReminderEmail` - ~20 lines

**Observation:** Even "long" functions are still reasonable (under 60 lines). The codebase favors **many small focused functions** over large monolithic ones.

## Performance Considerations

### Potential Bottlenecks

#### 1. **Sequential Async Iteration**

**Location:** `exportEntries.js`, `exportCodes.js`, `writeAdditionalMarketRows.js`

**Pattern:**
```javascript
for await (const entry of userEntries) {
  await writer.write({ user, entry, campaign, market });
  if (useAdditionalMarketRows) {
    await writeAdditionalMarketRows({...});
  }
}
```

**Issue:** Each entry is processed sequentially. For large datasets (thousands of entries), this could be slow.

**Mitigation:** Using streams likely allows backpressure management, so this is intentional for memory efficiency.

#### 2. **N+1 Query Pattern** (Avoided)

The codebase **correctly avoids N+1 queries** using MongoDB aggregation:

```javascript
// Good: Single aggregation with $lookup
findUserEntries: async({ campaignId, marketId, filterEntries }) => DataStore.aggregate([
  {
    $match: {
      '_id.campaign_id': campaignId,
      'fields.market': marketId
    }
  },
  {
    $lookup: {
      from: 'users',
      let: { userObjectId: { $toObjectId: '$_id.user_id' } },
      pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$userObjectId'] } } }],
      as: 'users'
    }
  }
])
```

**Observation:** This is **well-optimized** - fetches users with entries in single query.

#### 3. **Stream Usage for Memory Efficiency**

**Pattern:**
```javascript
const passThroughStream = new stream.PassThrough();
const [{ key }, count ] = await Promise.all([
  managerCtx.service[bucketType].uploadFromStream({
    passThroughStream,
    contentType: makeContentType({ fileExt }),
    fileKey: makeFileName({...}),
    acl: resolveAclByType(exportType)
  }),
  exportFn(managerCtx, { rowFormatter, passThroughStream, exportObj })
]);
```

**Observation:** Exports stream data directly to S3 without loading entire file into memory. This is **excellent for scalability**.

#### 4. **Pagination Pattern**

**Location:** `exportCodes.js`

```javascript
async function* paginateCodes(codesService, { params, limit }) {
  let skip = 0;
  let codes = [];
  do {
    codes = codesService.getCodes({ ...params, limit, skip });
    skip += codes.length;
    yield codes;
  } while (codes.length === limit);
}
```

**Observation:** Generator-based pagination prevents loading all codes at once. **Good for memory efficiency**.

### Performance Best Practices Observed

✅ **Strengths:**
- Streams used for large data exports
- MongoDB aggregations prevent N+1 queries
- Pagination for large datasets
- Parallel operations with `Promise.all` where appropriate
- Minimal object copying (functional updates are efficient with modern JS engines)

⚠️ **Potential concerns:**
- Sequential async iteration (intentional for backpressure)
- Ramda compositions have some overhead (acceptable for readability trade-off)
- Multiple selector functions called repeatedly (could be memoized, but likely not a bottleneck)

## Test File Complexity

**Test file count:** 15 (20% of source files have tests)

**Test patterns:**
- Jest as test framework
- Heavy use of mocks (`jest.mock`)
- BDD-style describe/it blocks
- Test files generally 100-166 lines

**Example test structure (SegmentedCSVFileWriter.spec.js):**
- 11 test cases
- Comprehensive mocking of fs, path modules
- Tests cover happy path and edge cases
- Clear test naming

**Observation:** Tests exist for complex modules (CsvWriter, MultiFileZipper, formatters), but **coverage appears incomplete** (only 15 test files for 75 source files).

## Recommendations

### Reduce Complexity

1. **Break up `formatEmailRow.js`**
   - Group selectors into namespaces (`CampaignSelectors`, `MarketSelectors`)
   - Extract SFMC mapping constants to separate file
   - Split validation logic from selectors

2. **Simplify `managers/exports/index.js`**
   - Extract export routing logic to separate module
   - Create dedicated modules for stream handling and S3 uploads
   - Reduce responsibilities

3. **Add JSDoc comments to complex Ramda pipelines**
   ```javascript
   /**
    * Normalizes export object by adding signed URL and stringifying ObjectIds
    * @param {Object} managerCtx - Manager context with services
    * @param {Object} exportObj - Export object to normalize
    * @returns {Promise<Object>} Normalized export object
    */
   const normalizeExport = R.pipeP(
     setSignedUrl,
     normalizers.stringifyObjectId
   );
   ```

4. **Consider memoization for repeated selector calls**
   ```javascript
   const memoizedSelectCampaignArtistName = R.memoizeWith(
     campaign => campaign._id,
     selectCampaignArtistName
   );
   ```

### Improve Testability

1. **Increase test coverage** - aim for 50%+ coverage (currently ~20%)
2. **Add integration tests** for export workflows
3. **Mock MongoDB/S3 at service boundaries** for faster tests

### Performance Optimizations

1. **Profile async iteration** - measure if parallelization would help
2. **Monitor Ramda overhead** - benchmark hot paths if performance issues arise
3. **Consider batch writes** - if writer supports batching, accumulate rows before writing

### Maintainability

1. **Document complex business rules** - especially SFMC region logic
2. **Create architecture diagram** - show flow from queue → export → S3
3. **Add examples to README** - demonstrate adding new export types

## Summary

### Strengths

✅ **Well-controlled complexity:**
- No files exceed 200-line limit
- Average function length is reasonable (25-30 lines)
- Nesting depth stays at 2 or less
- Cyclomatic complexity within limits

✅ **Good architectural patterns:**
- Clear separation of concerns
- Datastore abstraction
- Service instrumentation
- Stream-based processing for scalability

✅ **Performance-conscious:**
- Avoids N+1 queries
- Uses streams for memory efficiency
- Pagination for large datasets

### Challenges

⚠️ **Ramda complexity:**
- Pipelines are concise but hard to debug
- Requires FP expertise to maintain
- Error messages can be cryptic

⚠️ **Large concentrated modules:**
- `formatEmailRow.js` has 50+ functions
- `managers/exports/index.js` has multiple responsibilities
- Some files approaching line limits

⚠️ **Test coverage:**
- Only 20% of files have tests
- Integration tests missing
- Could benefit from more comprehensive testing

### Overall Assessment

**Complexity Rating: Moderate**

The export-service codebase maintains **good complexity discipline** through strict ESLint rules (max 200 lines, max depth 2, max complexity 7). Most code is straightforward and well-organized.

The primary complexity comes from:
1. **Functional programming patterns** (Ramda) - increases cognitive load but reduces bugs
2. **Business domain complexity** - email formatting, region logic, export types
3. **Async orchestration** - streams, queues, parallel operations

The codebase successfully balances **functional purity with pragmatic async patterns**, using eslint-disable when necessary. This is a **mature, disciplined codebase** that prioritizes maintainability through strict conventions.
