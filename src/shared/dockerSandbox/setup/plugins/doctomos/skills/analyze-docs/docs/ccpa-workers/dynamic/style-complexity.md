# Code Complexity - ccpa-workers

## Metrics

| Metric | Value | ESLint Limit | Status |
|--------|-------|--------------|--------|
| Avg function length | ~18 lines | N/A | ✅ Good |
| Max function length | ~100 lines | N/A | ⚠️ Some long functions |
| Max nesting depth | 2 | 2 | ✅ Enforced |
| Avg file size | ~75 lines | 200 | ✅ Good |
| Largest file | 274 lines | 200 | ⚠️ Exceeds limit |
| Cyclomatic complexity | Low (≤6) | 6 | ✅ Enforced |
| Function count per file | ~3-8 | N/A | ✅ Good |

### File Size Distribution

**Analysis of 110+ source files:**

| Size Range | Count | Percentage |
|------------|-------|------------|
| < 50 lines | ~60% | Majority |
| 50-100 lines | ~25% | Common |
| 100-200 lines | ~12% | Acceptable |
| > 200 lines | ~3% | Rare (violation) |

**Largest files:**
- `tools/setupWorker/index.js` - 274 lines (⚠️ exceeds limit)
- `shared/services/privacyCore/index.js` - 176 lines
- `runfile.js` - 156 lines
- `apps/saveDisclosures/index.js` - 145 lines
- `shared/middlewares/telemetry.ts` - 144 lines

## Complexity Observations

### Simple Areas ✅

#### 1. Pure Utility Functions
**Location:** `shared/selectors.js`, `shared/constants.js`, `tools/camelToSpinalCase.js`

**Characteristics:**
- Single responsibility
- Pure functions (no side effects)
- Clear input → output mapping
- Easily testable

**Example - `shared/selectors.js`:**
```javascript
export const selectPrivacyRequestId = R.prop('privacyRequestId');
export const selectInput = R.head;
export const selectOptOutEntries = R.prop('totalEntriesUpdated');
```

**Complexity Score:** Very Low (1-2/10)
- No nesting
- No branching
- No state management
- Clear Ramda composition

#### 2. Service Wrappers
**Location:** `shared/services/secretsManager/index.ts`, `shared/services/request/index.ts`

**Characteristics:**
- Thin wrappers around external libraries
- Basic error handling
- Simple caching (secretsManager)
- Type definitions in TypeScript

**Example - `shared/services/secretsManager/index.ts`:**
```typescript
export const getSecretValue = async(secret: SecretsManager): Promise<unknown> => {
  try {
    const secretName = secret.name;
    const cachedSecret = nodeCache.get(secretName);
    if (cachedSecret) {
      return cachedSecret;
    }
    const secretResult = await secret.getSecret();
    const secretString = secretResult.SecretString;
    nodeCache.set(secretName, secretString);
    return secretString;
  }
  catch (error) {
    log.error('get secret value error', formatError(error));
    return null;
  }
};
```

**Complexity Score:** Low (3/10)
- Simple caching logic
- Clear error handling
- Linear flow

#### 3. Simple Lambda Handlers
**Location:** `apps/templates/template/index.ts`

**Characteristics:**
- Minimal logic
- Template for new workers
- Type-safe signatures

**Example:**
```typescript
const handler: Worker<string, string> = async() => {
  debug('run {{workerName}} app');
  return 'Hello, from {{workerName}}!';
};
```

**Complexity Score:** Very Low (1/10)

### Moderate Complexity ⚙️

#### 1. Business Logic Handlers
**Location:** `apps/optOut/index.js`, `apps/fanInfo/index.js`, `apps/keepPrivate/index.js`

**Characteristics:**
- Multiple service interactions
- Error handling with retry/fallback
- Privacy platform integration
- 40-65 lines per file

**Example - `apps/optOut/index.js` structure:**
```javascript
const optOut = async({ input = [], Services, jwt }) => {
  // 1. Extract services
  const { entries, privacyCore } = Services;

  // 2. Parse input
  const { userId, requestEvent } = selectInput(input);

  // 3. Early return for missing data
  if (!userId) {
    await privacyCore.publishPrivacyResponse({ payload: requestEvent });
    return { optOuts: { ln: null, vf: null } };
  }

  // 4. Execute business logic
  try {
    const optOuts = {
      vf: await optOutAndSelectCount(OPT_IN_FIELD.VF),
      ln: await optOutAndSelectCount(OPT_IN_FIELD.LN)
    };
    await privacyCore.publishPrivacyResponse({ payload: requestEvent });
    return { optOuts };
  }
  catch (error) {
    // 5. Error handling
    log.error('Opt out process failed.', { userId });
    await privacyCore.publishPrivacyResponse({ payload: requestEvent, error: true });
    throw error;
  }
};
```

**Complexity Score:** Moderate (5/10)
- Clear structure: validate → process → respond
- Error handling adds branching
- Async coordination

#### 2. Orchestration Functions
**Location:** `apps/deleteFan/index.js`, `apps/processRequest/index.js`

**Characteristics:**
- Coordinates multiple sub-operations
- Parallel execution (Promise.all)
- Aggregates results
- 65-95 lines per file

**Example - `apps/deleteFan/index.js` (simplified):**
```javascript
const deleteFan = async({ input = [], Services, jwt }) => {
  // Extract identifiers
  const { userId, memberId, globalUserId, email, requestEvent } = selectInput(input);

  try {
    // Execute deletions in parallel
    const vfTableIds = { memberId, globalUserId, email };
    const verificationsRemoved = await removeFromVerificationTable({ ids: vfTableIds, verificationTable });
    const acctFanscoreFlagged = await flagAccountFanscore({ memberId, Services });
    const identityRecordsFlagged = await flagIdentityRecords({ globalUserId, Services });
    const { userDeleted, deletedCount } = await deleteVFUser({ jwt, userId, Services });
    const demandRecordsRemoved = await removeFromDemandTable({ ids: { fanId: globalUserId }, demandTable });

    // Notify privacy platform
    await privacyCore.publishPrivacyResponse({ payload: requestEvent });

    // Aggregate results
    return {
      ids: { memberId, globalUserId, userId },
      userDeleted,
      acctFanscoreFlagged,
      counts: {
        ...userDeleted && { registration: { ...deletedCount } },
        dynamo: {
          verification: verificationsRemoved,
          demand: demandRecordsRemoved,
          identity: identityRecordsFlagged
        }
      }
    };
  }
  catch (error) {
    log.error('Fan deletion failed.', { memberId, userId });
    await privacyCore.publishPrivacyResponse({ payload: requestEvent, error: true });
    throw error;
  }
};
```

**Complexity Score:** Moderate-High (6/10)
- Multiple async operations
- Result aggregation
- Error handling
- But: Linear flow, clear steps

#### 3. Functional Pipelines
**Location:** `apps/deleteFan/removeFromVerificationTable.js`, `apps/saveDisclosures/index.js`

**Characteristics:**
- Ramda composition (pipe, pipeP)
- Data transformation chains
- Higher-order functions

**Example - `removeFromVerificationTable.js`:**
```javascript
const FindItems = ({ verificationTable }) => R.pipeP(
  ids => Promise.resolve(ids),
  transformIdsIntoPKs,
  R.map(formatQueryParams),
  R.map(verificationTable.query),
  promises => Promise.all(promises),
  normalizeQueryResults
);
```

**Complexity Score:** Moderate (5/10)
- Functional composition is elegant but requires FP knowledge
- Each step is simple, but understanding the whole requires mental model
- Testable, but debugging can be challenging

### Complex Areas ⚠️

#### 1. Stream Processing with Batching
**Location:** `apps/saveDisclosures/index.js` (145 lines)

**Characteristics:**
- CSV parsing
- Stream transformation
- Batch processing
- Error handling per batch
- Promise-based stream control

**Complexity factors:**
```javascript
const saveDisclosures = async({ input: { event: { fileKey, campaignId } }, Services, jwt }) => {
  // 1. Fetch campaign data
  const targetContacts = await campaigns.getCampaignContacts({ jwt, campaignId });

  // 2. Setup stream processing
  const s3ReadStream = await aws.exportServiceBucket.getReadStreamForObject(fileKey);
  const createDisclosureBatch = CreateDisclosureBatch({ userService: users, targetContacts });

  // 3. Batch transform with side effects
  const batchTransformStream = BatchTransformStream({
    batchSize: readBatchSize,
    transformFn: async rows => {
      count.rows = count.rows + rows.length; // Mutation (allowed by ESLint)
      try {
        const disclosureRecords = await createDisclosureBatch(rows);
        count.disclosures = count.disclosures + disclosureRecords.length;
        await privacyCore.publishDisclosureData({ disclosureRecords });
      }
      catch ({ name, statusCode, message }) {
        log.error('error handling disclosure batch', { fileKey, campaignId, name, statusCode, message });
      }
    }
  }).resume();

  // 4. Promise-based stream control
  return new Promise((resolve, reject) => s3ReadStream
    .on('error', reject)
    .pipe(parseCSV(parseOptions))
    .on('error', reject)
    .pipe(batchTransformStream)
    .on('error', reject)
    .on('finish', () => resolve(count))
  );
};
```

**Complexity Score:** High (7/10)
- Stream control with events
- Nested async operations
- Error handling at multiple levels
- State mutation (count object)
- Resource management (streams)

**Mitigating factors:**
- Well-structured with helper functions
- Clear comments
- Batch size limits complexity

#### 2. Telemetry Middleware
**Location:** `shared/middlewares/telemetry.ts` (144 lines)

**Characteristics:**
- OpenTelemetry integration
- Retry logic with backoff
- Adaptive delays based on Lambda timeout
- Span management
- Context propagation

**Complexity factors:**
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
        throw (errs); // Retry
      }
      bail(errs as Error); // Don't retry
      return;
    }
  },
  retryOptions
).catch(err => log.error('trace force flush error', err));

const adaptiveDelay = async remainingTime => {
  const remainingTimeInMillis = Math.max(remainingTime - MIN_EXECUTION_TIMEOUT_BUFFER, 0);
  const delayTime = Math.min(MAX_FLUSH_DELAY, remainingTimeInMillis);
  await delay(delayTime);
  return true;
};

// In main middleware:
const remainingTime = getRemainingTime(params);
const isFlushDelayed = await Promise.race([adaptiveDelay(remainingTime), safeForceFlush()]);
```

**Complexity Score:** High (7-8/10)
- Race conditions with timeout
- Retry logic with conditional bail
- OpenTelemetry context management
- Ramda composition for extracting remaining time

**Mitigating factors:**
- Well-commented
- Constants defined at top
- Extracted into helper functions

#### 3. Worker Setup Tooling
**Location:** `tools/setupWorker/index.js` (274 lines)

**Characteristics:**
- File system operations
- Template string replacement
- YAML parsing/manipulation
- Interactive CLI prompts
- Multiple validation steps

**Complexity Score:** High (8/10)
- **Violation:** Exceeds 200 line limit
- Multiple concerns: validation, file creation, config updates
- Heavy use of side effects

**Recommendation:**
- Split into modules:
  - `setupWorker/validators.js` ✅ (already exists)
  - `setupWorker/fileOperations.js` (create)
  - `setupWorker/configUpdates.js` (create)
  - `setupWorker/index.js` (orchestration only)

## Complexity by Category

| Category | Avg Complexity | Common Patterns |
|----------|----------------|-----------------|
| Utilities/Selectors | 1-2/10 | Pure functions, Ramda composition |
| Service Wrappers | 2-3/10 | Simple async, basic error handling |
| Lambda Handlers | 4-6/10 | Orchestration, service calls, error handling |
| Data Processing | 5-7/10 | Functional pipelines, transformations |
| Middleware | 6-8/10 | Context management, cross-cutting concerns |
| Tooling/Scripts | 7-9/10 | CLI interaction, file system operations |

## Recommendations

### Immediate Actions

1. **Refactor `tools/setupWorker/index.js`** (274 → <200 lines)
   - Extract file operations into separate module
   - Extract config manipulation into separate module
   - Keep index.js as orchestration only

2. **Add comments to complex pipelines**
   - `apps/saveDisclosures/index.js` stream processing
   - `shared/middlewares/telemetry.ts` flush logic
   - Document the "why" not the "what"

3. **Consider extracting shared patterns**
   - Privacy response error handling (appears in multiple apps)
   - User ID validation/fallback logic

### Longer-Term Improvements

1. **Type safety enhancements**
   - Replace `any` types in TypeScript files
   - Add JSDoc types to complex JavaScript functions
   - Enable `noImplicitAny` in tsconfig.json

2. **Testing focus areas**
   - Stream processing logic (high complexity)
   - Telemetry middleware (race conditions)
   - Retry logic (edge cases)

3. **Monitoring/Observability**
   - Complex areas already have good logging (Log, Debug)
   - Consider metrics for batch processing performance
   - Add tracing for multi-step orchestrations (already in place via telemetry)

## Complexity Score Legend

| Score | Description | Characteristics |
|-------|-------------|-----------------|
| 1-3 | Very Low | Pure functions, no branching, simple I/O |
| 4-5 | Low-Moderate | Some branching, basic async, simple error handling |
| 6-7 | Moderate-High | Multiple concerns, composition, advanced async |
| 8-9 | High | Race conditions, streams, complex state management |
| 10 | Very High | Multiple high-complexity factors combined |

**Overall Assessment:** Most code is in the 1-6 range (Low to Moderate complexity), with only a few areas reaching 7-8. No code exceeds 8/10. The functional programming style keeps complexity manageable.
