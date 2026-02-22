# Test Coverage - dmd-workers

## Coverage Metrics

**Note**: Coverage metrics are not automatically generated in the CI pipeline. Coverage can be generated locally using Jest's built-in coverage reporter.

```bash
# Generate coverage report locally
yarn jest --coverage
```

Current metrics are not tracked in version control or CI artifacts.

## Well-Tested Areas

### Middleware Components
Extensive unit test coverage for middleware layer:
- **SQS Result Handler** - `shared/middlewares/SQSResultHandler.spec.js`
- **Record Processing** - `shared/middlewares/records/records.spec.js`
- **Kinesis Stream Processing**:
  - `decodeInplace.spec.js` - Base64 decoding
  - `setMetaFieldIfDoesNotExist.spec.js` - Metadata enrichment
- **Kafka Input Transformation**:
  - `kafka/index.spec.js` - Kafka message decoding
  - `kafka/index.error.spec.js` - Error handling scenarios
- **Transform Input Orchestration** - `transformInput/index.spec.js`
- **Middleware Composition** - `ComposeMiddlewares.spec.js`

### Stream Output Components
- **Kinesis Output** - `PutManyToKinesisStream.spec.js`
- **Firehose Output** - `PutManyToFirehoseStream.spec.js`

### Business Logic Components
- **URL Shortening** - `ShortenEventUrl.spec.js`
  - Bitly integration
  - Tag generation
  - URL normalization
  - Tracking parameter appending
- **Event Details Caching**:
  - `parseSaleTypes.spec.js` - Sale type parsing
  - `CacheEventDetails.spec.js` - Caching logic
- **Account Service Utils** - `services/accounts/utils.spec.js`
- **Formatting** - `format.spec.js`

### Configuration Management
- **Config Loading** - `config/config.spec.js`
  - Tests loading all environment configs (qa, dev, preprod, prod)
  - Validates YAML config parsing
- **Config Utilities**:
  - `overrideDefaults.spec.js` - Default overriding logic
  - `trimForBundle.spec.js` - Bundle optimization

### Integration Test Coverage
8 Cucumber feature files covering end-to-end worker flows:
1. **demandStreamToSqs** - Demand stream processing to SQS
2. **eventDetails** - Event detail retrieval and caching
3. **notificationGenerator** - Notification generation from events
4. **notificationScheduler** - Scheduling notifications for delivery
5. **notificationSend** - Sending notifications to users
6. **notificationStatusConsumer** - Processing notification status updates
7. **proxyTmAccountService** - Proxying Ticketmaster account service
8. **shortenEventUrl** - URL shortening workflow

## Testing Gaps

### No Unit Tests for Workers
- Individual worker Lambda handlers (in `apps/` directory) lack direct unit tests
- Workers are only tested via integration tests
- **Impact**: Lower confidence in individual worker logic changes
- **Recommendation**: Add unit tests for worker handler functions

### Limited App-Level Testing
- Worker applications are tested primarily through integration tests
- No isolated tests for worker initialization and setup
- **Impact**: Harder to test worker configuration and initialization logic
- **Recommendation**: Add unit tests for worker entry points

### No Code Coverage Tracking
- No coverage thresholds enforced in CI
- No coverage reports generated or tracked over time
- **Impact**: Unclear which code paths are untested
- **Recommendation**:
  - Add Jest coverage configuration to CI pipeline
  - Set minimum coverage thresholds (e.g., 80% lines, 75% branches)
  - Store coverage artifacts in CI

### No E2E Test Visibility
- E2E tests run in external pipeline (`verifiedfan/e2e-tests/pipelines`)
- E2E test scenarios not visible in this repository
- **Impact**: Unclear what E2E scenarios cover
- **Recommendation**: Document E2E scenarios or reference external docs

### Integration Test Data Mocking
- Integration tests use `SHOULD_MOCK_TEST_DATA=true` flag
- Tests may not catch issues with actual AWS service integrations
- **Impact**: Integration tests don't verify real AWS behavior
- **Recommendation**: Consider adding some tests against localstack or test AWS environment

### No Performance Tests
- No load testing or performance benchmarks
- No tests for worker timeout scenarios
- No tests for large batch processing
- **Impact**: Unknown behavior under load
- **Recommendation**: Add performance tests for critical workers

### TypeScript Coverage
- Repository uses TypeScript but tests are in JavaScript (`.spec.js`)
- Type checking runs separately (`npx run types:check`)
- **Impact**: Type errors may not be caught in test scenarios
- **Recommendation**: Consider migrating tests to TypeScript (`.spec.ts`)

### Terraform/Infrastructure Tests
- No tests for Terraform configurations
- Infrastructure changes not validated in tests
- **Impact**: Infrastructure bugs only caught in deployment
- **Recommendation**: Add Terraform validation or terratest

### Error Handling Scenarios
- Limited testing of error paths (only 1 `.error.spec.js` file found)
- Edge cases and failure modes may be undertested
- **Impact**: Production errors may not be handled gracefully
- **Recommendation**: Add error scenario tests for each worker

## Recommendations

### Priority 1: Enable Coverage Tracking
```javascript
// Add to package.json
"scripts": {
  "test:coverage": "jest --coverage --coverageDirectory=coverage"
}

// Add jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Priority 2: Add Worker Unit Tests
Create unit tests for worker handlers in `apps/`:
```javascript
// Example: apps/demandStreamToSqs/__tests__/handler.spec.js
describe('demandStreamToSqs handler', () => {
  it('processes kinesis records correctly', async () => {
    // Test handler logic
  });
});
```

### Priority 3: Improve Error Coverage
Add comprehensive error scenario tests:
```javascript
describe('error handling', () => {
  it('handles missing event URL', async () => {
    await expect(handler(invalidEvent)).rejects.toThrow();
  });

  it('retries on transient failures', async () => {
    // Test retry logic
  });
});
```

### Priority 4: Document E2E Scenarios
Create documentation linking to E2E test scenarios:
- What scenarios are covered
- Where to find E2E test code
- How to run E2E tests locally

### Priority 5: Add Integration with Real Services
Consider adding tests that use localstack or dedicated test AWS resources:
```bash
# Example: Use localstack for integration tests
docker run --rm -it -p 4566:4566 localstack/localstack
```

## Test Execution Metrics

### CI Pipeline Test Times
- Unit tests: Fast (apps + libs run in parallel stages)
- Integration tests: ~minutes (depends on environment)
- E2E tests: Longest running, includes retry logic

### Retry Strategy
- Integration tests: 2 retries with `--fail-fast`
- E2E tests: 1 retry (GitLab CI level)

## Coverage Improvement Roadmap

1. **Month 1**: Enable coverage tracking, set baseline thresholds
2. **Month 2**: Add unit tests for all worker handlers (apps/)
3. **Month 3**: Expand error scenario coverage to 90%+
4. **Month 4**: Add performance tests for critical workers
5. **Ongoing**: Maintain 80%+ coverage for new code
