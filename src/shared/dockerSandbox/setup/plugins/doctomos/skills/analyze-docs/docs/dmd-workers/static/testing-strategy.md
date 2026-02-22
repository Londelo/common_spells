# Testing Strategy - dmd-workers

## Overview

The demand-capture workers repository uses a multi-layered testing approach combining unit tests, integration tests, and end-to-end tests. The testing strategy ensures reliability across AWS Lambda workers that process demand data streams, handle notifications, and manage event information caching.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| shared/**/*.spec.js | Unit tests (JavaScript) | 34 |
| features/integrationTests/*.feature | Integration tests (Cucumber BDD) | 8 |
| features/e2eTests/ | End-to-end tests (Cucumber) | N/A |

## Frameworks Used

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| Jest | Unit testing | package.json scripts |
| Cucumber (v6.0.5) | BDD integration & E2E tests | runfile.js |
| Babel Jest | JavaScript/TypeScript transpilation | babel.config |
| Chai | Assertion library | Used with Cucumber |

## Running Tests

### Local Development

```bash
# All unit tests
npx run tests:unit

# Unit tests for apps only
npx run tests:unit ./apps

# Unit tests for shared libraries only
npx run tests:unit ./shared

# Integration tests (Cucumber)
npx run tests:integration

# Run specific scenario by name
npx run tests:scenario "scenario name"

# Run tests by tags
npx run tests:tags @dmnd-stream-sqs

# Generate HTML report
npx run tests:generateReport
```

### CI Pipeline Tests

```bash
# Via GitLab CI (see .gitlab-ci.yml)
# Stage: pre-bundle tests
# - app unit tests: npx run tests:unit ./apps
# - lib unit tests: npx run tests:unit ./shared
# - eslint: npx run eslint:lint '-f table'
# - yamllint: yamllint -c yamllint.config.yml .

# Stage: integration tests (per environment)
# - qa/dev/preprod: npx run tests:integration ' --retry 2 --fail-fast'

# Stage: e2e tests (per environment)
# - Uses external E2E pipeline from verifiedfan/e2e-tests/pipelines.git
```

## Test Patterns

### Unit Tests (Jest)

**Location**: `shared/**/*.spec.js`

**Structure**:
- Tests are co-located with source code
- Naming convention: `[filename].spec.js`
- Use Jest's `describe` and `it` blocks
- Mock external dependencies using `jest.fn()` and `jest.mock()`

**Example Pattern**:
```javascript
describe('ShortenEventUrl', () => {
  const shortenEventUrl = ShortenEventUrl({ bitly });

  afterEach(() => jest.clearAllMocks());

  it('replaces event url with bitly generated link', async() => {
    const actual = await shortenEventUrl(event);
    expect(createLink).toHaveBeenCalledWith(bitlyParams);
    expect(actual).toStrictEqual(shortUrlEvent);
  });
});
```

### Integration Tests (Cucumber)

**Location**: `features/integrationTests/*.feature`

**Features Covered**:
- demandStreamToSqs - Stream to SQS processing
- eventDetails - Event detail caching
- notificationGenerator - Notification generation
- notificationScheduler - Notification scheduling
- notificationSend - Notification sending
- notificationStatusConsumer - Status consumption
- proxyTmAccountService - Account service proxy
- shortenEventUrl - URL shortening via Bitly

**Structure**:
- Given-When-Then BDD format
- Step definitions in `features/step_definitions/`
- Scenario-based testing of worker behavior
- Tagged for selective execution (e.g., `@dmnd-stream-sqs`)

**Example Pattern**:
```gherkin
@dmnd-stream-sqs
Feature: Demand stream to sqs worker
  Scenario: Read from stream and write to shortUrlQueue
    When I invoke the demandStreamToSqs worker with the demandStreamRecords input
    Then the result matches the demandStreamToSqs result
```

### Mocking Strategy

**External Dependencies**:
- AWS services (Kinesis, SQS, DynamoDB) - Mocked in integration tests with `SHOULD_MOCK_TEST_DATA=true`
- Configuration - Mocked via `jest.mock('./shared/config')`
- Third-party APIs (Bitly) - Mocked with `jest.fn()` returning expected responses
- Kafka Schema Registry - Mocked for Avro deserialization tests

**Configuration Mocking**:
```javascript
jest.mock('../../../config', () => ({
  __esModule: true,
  default: {
    getIn: jest.fn().mockReturnValue({
      toJS: jest.fn().mockReturnValue({ /* config */ })
    })
  }
}));
```

## CI Configuration

### Pre-Bundle Tests Stage
- Runs on: `tm-prod cicd build` runners
- Executes before bundling Lambda functions
- Includes unit tests for both apps and shared libraries
- Code quality checks (ESLint, YAMLlint)

### Integration Tests Per Environment
- Runs on environment-specific runners (nonprod, preprod, prod)
- Tests deployed infrastructure
- Retries failed tests up to 2 times
- Fails fast on errors
- Generates HTML reports stored in `reports/` directory

### E2E Tests Per Environment
- Conditionally runs when `E2E_TAG=dmnd` is set
- Uses external pipeline repository
- Tests full user flows across services
- Runs in qa, dev, and preprod environments
- Manual trigger for non-main branches

## Test Utilities

### Custom Test Utilities
- `@verifiedfan/test-utils` (v3.4.2) - VF-specific test helpers
- `@verifiedfan/cucumber-features` (v1.2.5) - Shared Cucumber features and utilities
- `cucumber-html-reporter` - Generates Bootstrap-themed HTML reports
- `cucumber-pretty` - Colorized console output

### DynamoDB Test Utilities
- `ClearTablesByTmIdList` - Clears test data from DynamoDB tables
- Available via `npx run aws:clearTables <comma-separated-tmIds>`

## Type Checking

```bash
# Run TypeScript type checks (no emit)
npx run types:check
```

## Report Generation

After running integration tests, an HTML report is automatically generated:
- JSON report: `reports/cucumber.json`
- HTML report: `reports/index.html`
- Theme: Bootstrap
- Auto-launches in browser
