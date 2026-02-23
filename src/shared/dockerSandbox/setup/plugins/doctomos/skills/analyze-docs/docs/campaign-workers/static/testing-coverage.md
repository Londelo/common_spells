# Test Coverage - campaign-workers

## Coverage Metrics

**Note:** No automated coverage reporting is configured for this repository. The following analysis is based on manual code inspection and test file organization.

| Metric | Status |
|--------|--------|
| Automated Coverage Reports | Not configured |
| Coverage Enforcement | None |
| Coverage Goals | Not defined |

## Well-Tested Areas

### 1. SMS Wave Processing
**Location:** `apps/smsWaveSend/`, `apps/smsWaveScheduler/`

- **Unit Tests:** Handler logic, notification processing, error handling
- **Integration Tests:** End-to-end wave sending scenarios
- **Coverage Highlights:**
  - SMS/email fallback logic
  - doNotText flag handling
  - Notification config processing
  - Result counting and statistics

### 2. Code Assignment Processing
**Location:** `apps/transformCodeAssignments/`, `apps/loadCodeAssignmentsToStream/`, `apps/generateSmsWaveCodes/`

- **Unit Tests:**
  - User ID lookup and attachment
  - Campaign ID lookup and attachment
  - Code validation logic
  - Code generation and upload
- **Integration Tests:** Full code assignment pipeline
- **Coverage Highlights:**
  - Multi-source code assignment normalization (Strobe, Titan, MySQL)
  - Batch processing logic
  - External code reservation

### 3. Scoring and Selection
**Location:** `apps/processScoredFiles/`, `apps/translateRanksToScores/`, `apps/processSmsWaveFiles/`

- **Unit Tests:**
  - Score assignment algorithms (band-based randomization)
  - Statistics aggregation
  - Rank-to-score transformation
  - Fan selection logic per market
  - Eligible fan filtering
- **Integration Tests:** Complete scoring pipeline
- **Coverage Highlights:**
  - Score band generation (HIGH_BAND, MID_BAND, LOW_BAND)
  - Format parsing and validation
  - Market-based selection
  - Single vs multi-market selection

### 4. Avro File Processing
**Location:** `apps/mergeAvroFiles/`, `shared/mergeAvroUtils.spec.js`

- **Unit Tests:**
  - Record normalization
  - File validation
  - Merge helper functions
- **Integration Tests:** File merging workflows
- **Coverage Highlights:**
  - Avro schema handling
  - File validation rules
  - Record deduplication

### 5. Shared Utilities
**Location:** `shared/`

- **Unit Tests:**
  - SQS record processing middleware
  - Config management (overrideDefaults, trimForBundle)
  - Kinesis/Firehose stream writers (PutManyToStream)
  - Input transformation middleware
  - Object utilities
  - Verdict queue operations

### 6. Data Loading Tools
**Location:** `tools/load/`

- **Unit Tests:**
  - Code assignment normalization (all sources)
  - Registration normalization (all sources)
  - Date/time conversion (toISOString)
- **Coverage Highlights:**
  - Strobe, Titan, TitanPS, MySQL data sources
  - Depeche registration handling
  - ISO timestamp conversion

### 7. Utility Tools
**Location:** `tools/`

- **Unit Tests:**
  - Athena query utilities
  - Member ID decryption
  - Code assignment normalization across platforms

## Testing Gaps

### 1. No Coverage Reporting
**Impact:** High
**Description:** No automated coverage measurement means untested code paths are not identified

**Recommendations:**
- Add Jest coverage configuration to package.json
- Generate coverage reports in CI
- Set minimum coverage thresholds (e.g., 80% for critical paths)
- Add coverage badges to repository

**Example Jest Config:**
```json
{
  "jest": {
    "collectCoverage": true,
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "lcov", "html"],
    "collectCoverageFrom": [
      "apps/**/*.{js,ts}",
      "shared/**/*.{js,ts}",
      "tools/**/*.{js,ts}",
      "!**/*.spec.{js,ts}"
    ],
    "coverageThresholds": {
      "global": {
        "branches": 70,
        "functions": 75,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### 2. Limited Error Path Testing
**Impact:** Medium
**Description:** While happy paths are well-tested, some error handling scenarios may lack coverage

**Areas Potentially Affected:**
- Network failure scenarios
- Partial batch failures in stream operations
- S3 read/write errors
- MongoDB connection failures
- Malformed input validation

**Recommendations:**
- Add negative test cases for each worker
- Test retry logic under failure conditions
- Verify error messages and logging
- Test timeout scenarios

### 3. Integration Test Mocking
**Impact:** Medium
**Description:** Integration tests run with `SHOULD_MOCK_TEST_DATA=true`, not against real AWS services

**Trade-offs:**
- **Pros:** Fast, isolated, no AWS costs
- **Cons:** May miss AWS-specific issues, IAM problems, service limits

**Recommendations:**
- Keep mocked integration tests for speed
- Add optional smoke tests against real QA environment
- Run E2E tests against real resources (already done)

### 4. No Load/Performance Testing
**Impact:** Medium
**Description:** No tests verify behavior under high load or large data volumes

**Recommendations:**
- Add performance benchmarks for critical paths
- Test with realistic data volumes
- Verify memory usage for large file processing
- Test concurrent worker invocations

### 5. Limited Step Definition Coverage
**Impact:** Low
**Description:** Cucumber step definitions are not directly unit tested (they're tested via features)

**Recommendation:**
- Consider this acceptable - step definitions are tested through feature execution
- Ensure comprehensive feature coverage instead

### 6. Missing Tests for Some Workers
**Impact:** Variable
**Description:** Not all workers have corresponding integration tests

**Workers with Integration Tests:**
- generateSmsWaveCodes
- loadCodeAssignments
- mergeAvroFiles
- moveMergedAvroFiles
- processScheduledWave
- processScoredFiles
- processSmsWaveFiles
- saveCampaignData
- saveSelection
- saveStats
- slackStats
- smsWaveScheduler
- smsWaveSend
- transformCodeAssignments
- translateRanksToScores

**Recommendation:**
- Audit remaining workers for integration test needs
- Add integration tests for critical workers without coverage

## Coverage by Component Type

### Workers (Lambda Handlers)
**Coverage:** Mixed

| Component | Unit Tests | Integration Tests |
|-----------|------------|-------------------|
| generateSmsWaveCodes | 2 unit tests | Yes |
| loadCodeAssignmentsToStream | 1 unit test | Yes |
| mergeAvroFiles | 3 unit tests | Yes |
| processScoredFiles | 4 unit tests | Yes |
| processSmsWaveFiles | 5 unit tests | Yes |
| saveSelection | 1 unit test | Yes |
| slackStats | 2 unit tests | Yes |
| smsWaveScheduler | 1 unit test | Yes |
| smsWaveSend | 2 unit tests | Yes |
| transformCodeAssignments | 4 unit tests | Yes |
| translateRanksToScores | 3 unit tests | Yes |

### Shared Libraries
**Coverage:** Good

- Config utilities: 3 unit tests
- Middleware: 3 unit tests
- Stream utilities: 2 unit tests
- Object utilities: 1 unit test
- Queue operations: 1 unit test
- Avro utilities: 1 unit test

### Tools/Scripts
**Coverage:** Good

- Data loaders: 9 unit tests across multiple source types
- Athena utilities: 1 unit test
- Decryption utilities: 1 unit test

## Recommendations

### High Priority

1. **Enable Coverage Reporting**
   - Configure Jest to collect and report coverage
   - Add coverage reports to CI artifacts
   - Publish coverage to Sonar or similar tool

2. **Set Coverage Baselines**
   - Measure current coverage for all components
   - Set realistic improvement targets
   - Prevent coverage regression in CI

3. **Add Error Scenario Tests**
   - Test AWS service failures
   - Test malformed input handling
   - Test timeout scenarios

### Medium Priority

4. **Add Performance Tests**
   - Benchmark critical data transformations
   - Test with production-scale data volumes
   - Verify memory efficiency

5. **Document Test Data Requirements**
   - Create test data generation scripts
   - Document required test fixtures
   - Standardize test data patterns

6. **Integration Test Against Real Resources**
   - Add optional non-mocked test mode
   - Run weekly against QA environment
   - Catch AWS-specific issues

### Low Priority

7. **Add Visual Test Reports**
   - Publish Cucumber HTML reports to artifact storage
   - Create test history dashboard
   - Track flaky tests

8. **Test Contract Validation**
   - Add schema validation for all inputs/outputs
   - Test backward compatibility
   - Verify API contracts

## Testing Best Practices Currently Followed

1. **Isolated Unit Tests** - Each test is independent with proper mocking
2. **Descriptive Test Names** - Tests clearly describe expected behavior
3. **Arrange-Act-Assert Pattern** - Clear test structure
4. **Mock Reset Between Tests** - Clean state via beforeEach hooks
5. **Integration Test Isolation** - Cleanup tags ensure no test pollution
6. **Retry Logic** - CI retries flaky tests (retry: 1, --retry 2)
7. **Fast Feedback** - Unit tests run before bundling
8. **Environment Isolation** - Tests run in isolated environments per stage

## Summary

The campaign-workers repository has a solid testing foundation with good coverage of critical business logic through unit tests and comprehensive end-to-end validation via Cucumber integration tests. The primary gap is the lack of automated coverage reporting, which should be prioritized to identify untested code paths and prevent regressions.

**Strengths:**
- 54 unit test files covering core logic
- 15 integration test scenarios covering end-to-end flows
- Well-organized test structure
- Good mocking strategy
- Multi-environment testing in CI

**Areas for Improvement:**
- No automated coverage metrics
- Limited error scenario testing
- No performance/load testing
- Integration tests use mocks rather than real AWS services (by design)
