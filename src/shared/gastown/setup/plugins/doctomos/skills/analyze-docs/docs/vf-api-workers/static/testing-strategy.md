# Testing Strategy - vf-api-workers

## Overview

The vf-api-workers repository uses a multi-layered testing approach combining unit tests (Jest) and integration tests (Cucumber/BDD). This testing strategy ensures both individual component functionality and end-to-end workflow validation across AWS Lambda workers that process fan verification and scoring data.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| `apps/**/*.spec.js` | Unit tests (Workers) | 14 |
| `shared/**/*.spec.js` | Unit tests (Shared libs) | 15 |
| `features/integrationTests/` | Cucumber Integration | 8 |
| Total Unit Tests | Jest specs | 29 |

## Frameworks Used

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| **Jest** | Unit testing framework | Configured via `babel.config.json` with `babel-jest` |
| **Cucumber** | BDD integration testing | Version 6.0.5 with custom reporters |
| **Chai** | Assertion library | Used with Cucumber steps for integration tests |

### Supporting Test Libraries

- `@verifiedfan/test-utils` - Shared test utilities
- `@verifiedfan/cucumber-features` - Reusable Cucumber step definitions
- `chai-json-schema-ajv` - JSON schema validation
- `chai-subset` - Partial object matching
- `cucumber-html-reporter` - HTML test reports
- `cucumber-pretty` - Colorized console output

## Running Tests

### Unit Tests

```bash
# All unit tests
yarn jest --passWithNoTests

# App workers only
npx run tests:unit ./apps

# Shared libraries only
npx run tests:unit ./shared

# Tools only
npx run tests:unit ./tools
```

### Integration Tests

```bash
# All integration tests
npx run tests:integration

# With retry on failure
npx run tests:integration ' --retry 2 --fail-fast'

# Run specific scenario by name
npx run tests:scenario "Valid data gets put to the scores stream"

# Run by tags
npx run tests:tags @loadScoresToStream

# Generate HTML report
npx run tests:generateReport
```

### CI Pipeline Tests

```bash
# Run all pre-bundle tests
npm test  # Runs unit tests for apps, tools, and libs
```

## Test Patterns

### Unit Tests

Unit tests follow Jest conventions with `.spec.js` extensions. Tests are co-located with source files.

**Example pattern from middleware tests:**

```javascript
describe('records middleware', () => {
  afterEach(jest.clearAllMocks);

  it('should decode kinesis data and add __meta prop', async() => {
    const mockApp = jest.fn();
    await transformKinesisRecords(mockApp)(baseInput);

    const [[appParams]] = mockApp.mock.calls;
    expect(appParams.input[0]).toEqual(expected);
  });
});
```

**Common patterns:**
- Mock AWS SDK clients
- Use `jest.fn()` for function mocks
- Test async workflows with `async/await`
- Validate data transformations and middleware composition

### Integration Tests

Integration tests use Cucumber BDD syntax with Gherkin `.feature` files. Tests validate end-to-end worker execution against real AWS services.

**Example from `loadScoresToStream.feature`:**

```gherkin
@loadScoresToStream
Feature: Load Scored Files To Dynamo DB
  As a developer
  I want to be able to load scored files
  and put to the scores stream

  Background:
    Given the s3 bucket scoringBucket exists

  @loadScoresToStream-success
  Scenario: Valid data gets put to the scores stream
    Given I save the scrubbedRegistrants input to s3
    When I invoke the loadScoresToStream worker
    Then the result matches the loadScoresToStreamSuccess result
    And I iterate through Kinesis shards to find records
```

**Integration test features:**
- `loadScoresToStream` - S3 → Lambda → Kinesis pipeline
- `loadScoresToDynamoDB` - Kinesis → Lambda → DynamoDB
- `saveEntryScoring` - Scoring data processing
- `saveFanlistScores` - Fanlist data ingestion
- `verdictReporter` - SQS → Lambda → Slack notifications
- `lookupPhoneScore` - Phone scoring lookups
- `lookupCampaignsByEventId` - Campaign service proxy
- `processSavedScores` - DynamoDB streams processing

### Mocking Strategy

**Unit tests:**
- AWS SDK methods mocked via `@verifiedfan/test-utils`
- External HTTP calls mocked with Jest
- Time-based tests use `jest.fn()` to mock `Date.now()`

**Integration tests:**
- Tests run against actual AWS services (in non-prod environments)
- Mock data loaded from fixtures
- `SHOULD_MOCK_TEST_DATA=true` environment variable controls test data behavior

## CI Configuration

### Pre-Bundle Tests (GitLab CI)

Tests run in the `pre-bundle tests` stage before deployment:

```yaml
# Unit tests run in parallel
app unit tests:
  script: npx run tests:unit ./apps

tools unit tests:
  script: npx run tests:unit ./tools

lib unit tests:
  script: npx run tests:unit ./shared

# Code quality checks
eslint:
  script: npx run eslint:lint '-f table'

yamllint:
  script: yamllint -c yamllint.config.yml .
```

### Environment-Specific Integration Tests

Integration tests run after deployment to each environment:

```yaml
# QA environment
qa integration tests:
  stage: qa integration tests
  script: npx run tests:integration ' --retry 2 --fail-fast'
  variables:
    CONFIG_ENV: qa

# Dev environment (main branch only)
dev integration tests:
  stage: dev integration tests
  script: npx run tests:integration ' --retry 2 --fail-fast'
  variables:
    CONFIG_ENV: dev

# Preprod environment (main branch only)
preprod integration tests:
  stage: preprod integration tests
  script: npx run tests:integration ' --retry 2 --fail-fast'
  variables:
    CONFIG_ENV: preprod
```

**Test features:**
- Retry failed tests up to 2 times
- Fail fast on critical errors
- Generate HTML reports as artifacts
- Run only on main branch for dev/preprod

### E2E Tests

External E2E tests from separate pipeline repository:

```yaml
qa e2e tests:
  script:
    - git clone $E2E_PIPELINE_GIT_URL
    - cd pipelines
    - NODE_ENV=$CONFIG_ENV npx run tests:tags @${E2E_TAG}
  variables:
    E2E_TAG: api
```

## Test Execution Flow

1. **Pre-deployment** → Unit tests validate individual components
2. **Post-deployment** → Integration tests validate worker execution
3. **Environment validation** → E2E tests validate full API behavior

## Key Testing Utilities

### Worker Invocation

`tools/invokeWorker.js` - Utility to invoke Lambda workers for testing

```bash
npx run workers:invoke <workerName>
```

### AWS Resource Validation

```bash
npx run aws:findResources
```

Used in CI to verify AWS resources exist after deployment.

### HTML Report Generation

Integration tests generate HTML reports with:
- Scenario pass/fail status
- Step execution details
- Test duration metrics
- Color-coded results

Reports saved to `reports/index.html` after test execution.

## Testing Conventions

1. **File naming**: `*.spec.js` for all test files
2. **Co-location**: Unit tests placed next to source files
3. **Isolation**: Each test should be independent
4. **Cleanup**: Use `afterEach` hooks to reset mocks
5. **Assertions**: Prefer explicit expectations over truthy checks
6. **Async**: Always use `async/await` for async operations
7. **Tags**: Cucumber scenarios tagged with feature and test type
