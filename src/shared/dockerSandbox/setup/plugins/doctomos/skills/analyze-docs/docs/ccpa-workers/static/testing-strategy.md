# Testing Strategy - ccpa-workers

## Overview

The CCPA workers repository implements a comprehensive testing strategy that combines unit testing with Jest and integration/E2E testing with Cucumber. The testing approach emphasizes behavioral testing for critical user workflows while maintaining solid unit test coverage for individual components and business logic.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| `apps/**/*.spec.js` | Unit tests (Apps) | 5 |
| `shared/**/*.spec.js` | Unit tests (Shared) | 13 |
| `features/integrationTests/*.feature` | Cucumber Integration Tests | 7 |

**Total Unit Tests:** 18
**Total Integration Tests:** 7 Cucumber scenarios

### Test File Distribution

**Application Tests:**
- `apps/deleteFan/` - 3 test files (flagIdentityRecords, removeFromVerificationTable, calcDeleteCount)
- `apps/fanInfo/` - 1 test file (formatPIIData)
- `apps/processRequest/` - 2 test files (GetUserIdsInAcctFanDB, index)

**Shared Library Tests:**
- `shared/PutManyToStream/` - 2 test files (Firehose & Kinesis stream handlers)
- `shared/config/` - 3 test files (config, overrideDefaults, trimForBundle)
- `shared/middlewares/` - 8 test files (middleware composition, SQS handlers, input transformers)

**Cucumber Features:**
- `features/integrationTests/` - 7 feature files covering end-to-end workflows

## Frameworks Used

| Framework | Purpose | Version |
|-----------|---------|---------|
| Jest | Unit testing | ^30.0.4 |
| Cucumber | BDD/Integration tests | ^6.0.5 |
| @verifiedfan/cucumber-features | Shared step definitions | ^1.2.5 |
| @verifiedfan/test-utils | Testing utilities | ^3.4.2 |
| Chai | Assertions (Cucumber) | ^4.1.2 |

## Running Tests

### Via NPX/Run Commands

```bash
# All unit tests
npx run tests:unit

# Unit tests for apps only
npx run tests:unit ./apps

# Unit tests for shared libraries only
npx run tests:unit ./shared

# Integration tests (Cucumber)
npx run tests:integration

# Integration tests with retry
npx run tests:integration ' --retry 2 --fail-fast'

# E2E tests
npx run tests:e2e

# Run specific scenario by name
npx run tests:scenario "Scenario name"

# Run tests by tag
npx run tests:tags @deleteFan

# Generate HTML test report
npx run tests:generateReport
```

### Via Direct Commands

```bash
# Jest unit tests
yarn jest --passWithNoTests

# Cucumber with specific options
npx cucumber-js ./features/integrationTests \
  --format-options '{"colorsEnabled": true}' \
  --require-module @babel/register \
  --tags 'not @ignore' \
  -f summary \
  -f progress \
  -f node_modules/cucumber-pretty \
  -f json:reports/cucumber.json \
  --exit
```

## Test Patterns

### Unit Tests

**Framework:** Jest with Babel transpilation

**Structure:**
- Test files located alongside source files with `.spec.js` extension
- Uses `describe()` blocks for test suites
- Uses `it()` for individual test cases
- Jest mocking for dependencies (`jest.fn()`, `jest.mock()`)
- `afterEach()` for cleanup (typically `jest.clearAllMocks()`)

**Example Pattern:**
```javascript
import { functionToTest } from './module';

describe('functionToTest', () => {
  const mockDependency = {
    method: jest.fn()
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('describes expected behavior', async () => {
    mockDependency.method.mockResolvedValue({ result: 'value' });

    await functionToTest({ dependency: mockDependency });

    expect(mockDependency.method).toHaveBeenCalledTimes(1);
    expect(mockDependency.method).toHaveBeenCalledWith(expectedArgs);
  });
});
```

**Common Testing Patterns:**
- **Retry Logic Testing:** Validates retry behavior with unprocessed items (e.g., DynamoDB batch operations)
- **Middleware Testing:** Tests middleware chains with mock services and input/output validation
- **Error Handling:** Tests both success and failure paths
- **Configuration Testing:** Validates YAML config loading for all environments

### Integration Tests

**Framework:** Cucumber (BDD) with custom step definitions

**Structure:**
- Feature files in Gherkin syntax (`.feature`)
- Custom step definitions from `@verifiedfan/cucumber-features`
- Test setup in `features/cucumberSetup.js`
- Test inputs/outputs in `features/lib/`

**Step Definition Pattern:**
```gherkin
Given I write to the users collection with the userInput input
And I save the result into the users prop
And I put items in the dynamodb table verificationTable with the fanVerifications input
When I invoke the deleteFan worker with the deleteFanRequest input
Then the result matches the deleteFanCount result
```

**Available Tags:**
- `@deleteFan` - Delete fan workflows
- `@cleanDbEntries` - Tests requiring database cleanup
- `@delete-all` - Full deletion scenarios
- `@ignore` - Skip test execution

### Mocking Strategy

**Unit Tests:**
- **AWS Services:** Mocked using `jest.fn()` for SQS, DynamoDB, Kinesis, Firehose
- **Configuration:** Mocked using `jest.mock()` with Immutable.js Map structures
- **External Dependencies:** Full module mocks with `jest.mock('../module')`

**Integration Tests:**
- **Real AWS Resources:** Uses actual DynamoDB tables and SQS queues in test environments
- **MongoDB:** Real MongoDB connections with test data
- **Test Fixtures:** Input/output fixtures in `features/lib/inputs` and `features/lib/results`

## CI Configuration

### Pipeline Stages

Tests run in multiple stages of the GitLab CI/CD pipeline:

1. **Pre-Bundle Tests** (Stage: `pre-bundle tests`)
   - `app unit tests` - Jest tests for `/apps`
   - `lib unit tests` - Jest tests for `/shared`
   - `eslint` - Linting
   - `yamllint` - YAML validation

2. **Environment Integration Tests** (After deployment)
   - `qa integration tests` - Run in QA environment
   - `dev integration tests` - Run in Dev environment (main branch only)
   - `preprod integration tests` - Run in Preprod environment (main branch only)

3. **E2E Tests** (Optional, tag-based)
   - `qa e2e tests` - External E2E test suite
   - `dev e2e tests` - Dev E2E suite
   - `preprod e2e tests` - Preprod E2E suite

### Test Execution Details

**Unit Tests (CI):**
```yaml
app unit tests:
  script:
    - npx run tests:unit ./apps

lib unit tests:
  script:
    - npx run tests:unit ./shared
```

**Integration Tests (CI):**
```yaml
qa integration tests:
  script:
    - npx run tests:integration ' --retry 2 --fail-fast'
  variables:
    CONFIG_ENV: qa
  artifacts:
    paths:
      - reports
```

**E2E Tests (CI):**
- Cloned from external repository (`verifiedfan/e2e-tests/pipelines`)
- Tag-based execution (`@ccpa`)
- Retry configured (1 automatic retry)

### Test Dependencies

- Unit tests depend on `yarn` job (node_modules installation)
- Integration tests depend on `yarn` and environment deployment
- E2E tests depend on `yarn` and environment deployment
- All tests run in Docker container: `tmhub.io/verifiedfan/node18-base:18.18.2-alpine-latest`

### Test Reports

- **Format:** Cucumber generates JSON and HTML reports
- **Location:** `reports/cucumber.json` and `reports/index.html`
- **Artifacts:** Reports stored as CI artifacts with 1-week retention
- **Viewer:** HTML reports auto-generated with bootstrap theme

## Test Coverage Philosophy

While this repository doesn't enforce coverage metrics via tooling, the testing strategy prioritizes:

1. **Critical Path Coverage:** All CCPA request processing workflows have integration tests
2. **Business Logic:** Core business logic (deletion, opt-out, data retrieval) has unit tests
3. **Middleware/Infrastructure:** Common middleware patterns are well-tested
4. **Configuration:** All environment configs validated on load

The combination of unit tests for individual components and Cucumber integration tests for end-to-end workflows provides confidence in system behavior across environments.
