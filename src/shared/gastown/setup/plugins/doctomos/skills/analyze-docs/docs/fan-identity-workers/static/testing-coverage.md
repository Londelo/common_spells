# Test Coverage - fan-identity-workers

## Coverage Summary

The repository contains **70 test files** covering critical worker functionality across three testing tiers. While no automated coverage metrics are currently collected, the test suite provides comprehensive validation of core features.

## Test Distribution

| Domain | Unit Tests | Integration Tests | Feature Tests | Total |
|--------|------------|-------------------|---------------|-------|
| **Auth** | 2 | 0 | 1 | 3 |
| **Scoring** | 19 | 0 | 10 | 29 |
| **IDV** | 6 | 1 | 2 | 9 |
| **Clustering** | 1 | 0 | 0 | 1 |
| **Shared Libraries** | 23 | 1 | 0 | 24 |
| **Middlewares** | 4 | 0 | 0 | 4 |
| **Total** | **55** | **2** | **13** | **70** |

## Well-Tested Areas

### Scoring System (29 tests)

**Coverage**: Extensive unit and feature tests

- **Stream processing**: All enqueue workers have unit + feature tests
  - `enqueueFromDemandStream` - DLQ event processing
  - `enqueueFromPurchaseStream` - Purchase event filtering
  - `enqueueFromSQJourneyStream` - Customer journey events
  - `enqueueFromStream` - Base Kafka stream consumer
  - `enqueueFromVfStream` - VerifiedFan event processing

- **Scoring logic**: Core scoring functionality validated
  - `getArmScore` - ARM score retrieval
  - `lookupArai` - ARAI lookup and caching (`LookupAndCacheArai.spec.ts`)
  - `processRescoreEvents` - Rescoring workflow
  - `scoreUsers` - User scoring pipeline (`ProcessAccountScores.spec.ts`)

- **Shared scoring utilities**:
  - `SaveRescoreUsers.spec.ts` - Rescoring persistence
  - `isScorableUserActivity.spec.ts` - Activity filtering
  - `scoringModel/index.spec.ts` - ML model integration

**Strengths**:
- Every scoring worker has both unit and feature tests
- Validates filtering logic (scorable vs. unscorable activities)
- Tests queue integration and failure scenarios

### Identity Verification (9 tests)

**Coverage**: Unit, integration, and feature tests

- **Liveness checks**: Comprehensive integration testing
  - `checkLiveness.spec.ts` (integration) - 290 lines covering:
    - Rule engine validation
    - ARM score thresholds
    - Account score requirements
    - Session management and expiration
    - Multi-tier verification logic (high, low, ASU)

- **Event handling**:
  - `handleEvent/index.spec.ts` - Vendor webhook processing
  - Integration test validates end-to-end flow

- **Rules engine**: Extensive unit coverage
  - `rules/armScore.spec.ts` - ARM score decision logic
  - `rules/history.spec.ts` - Verification history checks
  - `rules/index.spec.ts` - Rule composition
  - `rules/nesting.spec.ts` - Nested rule evaluation
  - `rules/random.spec.ts` - Randomized sampling rules

**Strengths**:
- Integration tests use real DynamoDB
- Validates complex multi-factor decision logic
- Tests session lifecycle management

### Shared Libraries (24 tests)

**Coverage**: Strong unit testing of reusable components

- **Middleware pipeline**:
  - `ComposeMiddlewares.spec.js` - Middleware composition ("Russian nesting doll" pattern)
  - `SQSResultHandler.spec.js` - SQS batch response handling
  - `processSQSRecords.spec.ts` - SQS record processing
  - `transformInput/**/*.spec.js` - Event transformation for Kafka, Kinesis

- **Configuration**:
  - `config/config.spec.js` - Config loading
  - `config/overrideDefaults.spec.js` - Environment overrides
  - `config/trimForBundle.spec.js` - Config bundling

- **Stream utilities**:
  - `PutManyToFirehoseStream.spec.js` - Firehose batching
  - `PutManyToKinesisStream.spec.js` - Kinesis batching

- **Services**:
  - `QueueManager.spec.ts` - Queue abstraction
  - `identity/vendor/persona/validateSignature.spec.ts` - Webhook signature validation
  - `identity/token/jwt.spec.ts` - JWT token handling
  - `identity/resolveCurrentSession.spec.ts` - Session resolution

**Strengths**:
- Tests foundational patterns used across all workers
- Validates middleware composition order (critical for Lambda execution)
- Covers AWS service abstractions

### Authentication (3 tests)

**Coverage**: Unit and feature tests

- `validateToken/helpers.spec.ts` - JWT validation helpers
- `validateToken/index.spec.ts` - Token validation worker
- `validateToken.feature` - End-to-end token validation

**Strengths**:
- JWT validation logic fully covered
- Feature test validates integration

## Testing Gaps

### No Coverage Metrics

**Gap**: No automated code coverage tracking

**Impact**: Cannot identify untested code paths or measure coverage percentage

**Recommendation**: Add Jest coverage reporting

```bash
# Add to package.json scripts
"test:coverage": "jest --coverage --coverageDirectory=coverage"
```

Configure coverage thresholds in `jest.config.js`:

```javascript
module.exports = {
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
};
```

### Limited Integration Tests

**Gap**: Only 2 integration test files vs. 30+ workers

**Covered**:
- `identity/checkLiveness.spec.ts` - IDV liveness checks
- `identity/db/dynamo.spec.ts` - DynamoDB operations

**Not Covered**:
- Clustering workers (`startClusterImport`)
- Bot detection workers (no tests in `apps/botornot/`)
- Most scoring workers lack integration tests (rely on feature tests)

**Impact**: Integration-level failures may only surface in deployed environments

**Recommendation**: Add integration tests for:
- DynamoDB stream processing
- SQS queue interactions
- S3 event handling
- Kafka consumer/producer flows

### No E2E Tests

**Gap**: E2E test infrastructure exists (`features/e2eTests/`) but no test files found

**Impact**: No validation of multi-worker workflows or cross-system integration

**Recommendation**: Create E2E tests for critical user journeys:
- Complete scoring pipeline (stream → enqueue → score → store)
- IDV flow (check → create session → handle event → verify)
- Bot detection → scoring → decision pipeline

### Bot Detection Coverage

**Gap**: No unit or feature tests found in `apps/botornot/` directory

**Impact**: Bot detection logic unvalidated

**Recommendation**: Add unit tests for bot detection algorithms and decision logic

### Clustering Coverage

**Gap**: Only 1 unit test for `startClusterImport`

**Impact**: Clustering/batch processing logic minimally validated

**Recommendation**: Add tests for:
- Glue job triggering
- Batch processing logic
- Error handling and retries

### Error Handling Tests

**Gap**: Limited tests for failure scenarios

**Examples of missing coverage**:
- Network timeouts
- AWS service throttling
- Malformed event payloads
- Partial batch failures

**Recommendation**: Add negative test cases for each worker:

```typescript
it('handles malformed Kafka messages', async() => {
  const invalidMessages = [{ invalid: 'structure' }];
  await expect(worker(invalidMessages)).rejects.toThrow();
});

it('handles SQS partial batch failures', async() => {
  queueManagerMock.sendMessages.mockReturnValue({ failed: 2, queued: 3 });
  const result = await worker(input, services);
  expect(result.batchItemFailures).toHaveLength(2);
});
```

## Recommendations

### Immediate Priorities

1. **Enable Jest coverage**: Track coverage metrics in CI/CD
2. **Integration test expansion**: Add integration tests for each worker domain
3. **Bot detection tests**: Create unit tests for `apps/botornot/`
4. **Error scenario coverage**: Add negative test cases

### Medium-term Improvements

1. **E2E test suite**: Build end-to-end tests for critical workflows
2. **Load testing**: Validate performance under realistic load
3. **Contract testing**: Validate external service integrations (TM Accounts, Persona, etc.)
4. **Snapshot testing**: Use Jest snapshots for complex data structures

### Long-term Enhancements

1. **Mutation testing**: Use Stryker to validate test quality
2. **Property-based testing**: Use `fast-check` for complex algorithms
3. **Chaos testing**: Simulate AWS service failures
4. **Performance regression tests**: Track worker execution time

## Coverage by Worker Type

### Kafka Workers

| Worker | Unit Tests | Feature Tests | Integration Tests |
|--------|------------|---------------|-------------------|
| enqueueFromStream | ✅ | ✅ | ❌ |
| enqueueFromDemandStream | ✅ | ✅ | ❌ |
| enqueueFromPurchaseStream | ✅ | ✅ | ❌ |
| enqueueFromSQJourneyStream | ✅ | ✅ | ❌ |
| enqueueFromVfStream | ✅ | ✅ | ❌ |

### SQS Workers

| Worker | Unit Tests | Feature Tests | Integration Tests |
|--------|------------|---------------|-------------------|
| processRescoreEvents | ✅ | ✅ | ❌ |
| scoreUsers | ✅ | ✅ | ❌ |

### AppSync Workers

| Worker | Unit Tests | Feature Tests | Integration Tests |
|--------|------------|---------------|-------------------|
| getArmScore | ✅ | ✅ | ❌ |
| lookupArai | ✅ | ✅ | ❌ |
| checkLiveness | ✅ | ✅ | ✅ |
| handleEvent | ✅ | ✅ | ❌ |

### Authorizer Workers

| Worker | Unit Tests | Feature Tests | Integration Tests |
|--------|------------|---------------|-------------------|
| validateToken | ✅ | ✅ | ❌ |

### S3 Workers

| Worker | Unit Tests | Feature Tests | Integration Tests |
|--------|------------|---------------|-------------------|
| startClusterImport | ✅ | ❌ | ❌ |

## Notes

- **Test line count**: ~4,400 lines of test code
- **Test-to-source ratio**: Estimated 1:3 (test:source)
- **CI enforcement**: All unit tests must pass before merge
- **Environment coverage**: Tests run in QA, DEV, and PreProd environments
- **Retry logic**: Integration/feature tests retry up to 2 times in CI
