# Testing Strategy - campaign-workers

## Overview

The campaign-workers repository implements a comprehensive testing strategy using both unit tests (Jest) and integration/E2E tests (Cucumber). Testing is split across multiple stages in the CI pipeline with environment-specific test runs for QA, Dev, Preprod, and Prod environments.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| apps/**/*.spec.{js,ts} | Unit tests - Application logic | 26 |
| tools/**/*.spec.{js,ts} | Unit tests - Tools/utilities | 19 |
| shared/**/*.spec.{js,ts} | Unit tests - Shared libraries | 9 |
| features/integrationTests/*.feature | Cucumber integration tests | 15 |
| **Total** | **All tests** | **69** |

### Test File Distribution

**Unit Tests by Language:**
- JavaScript (.spec.js): 49 files
- TypeScript (.spec.ts): 5 files

**Integration Tests:**
- Cucumber feature files: 15 scenarios covering end-to-end worker flows

## Frameworks Used

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| Jest | Unit testing framework | Inline in package.json (via babel-jest) |
| Babel Jest | Transpile ES6/TypeScript for tests | @babel/register used via runjs |
| Cucumber | BDD/E2E integration testing | features/ directory with custom setup |
| Cucumber HTML Reporter | Test reporting | Generates HTML reports in reports/ directory |

## Running Tests

### Unit Tests

```bash
# All unit tests (apps, tools, shared)
npx run tests:unit

# App-specific unit tests
npx run tests:unit ./apps

# Tools unit tests
npx run tests:unit ./tools

# Shared library unit tests
npx run tests:unit ./shared

# With specific patterns
yarn jest --passWithNoTests <pattern>
```

### Integration Tests

```bash
# All integration tests
NODE_ENV=<env> SHOULD_MOCK_TEST_DATA=true npx run tests:integration

# By tag
npx run tests:tags @<tagName>

# By scenario name
npx run tests:scenario "scenario name"

# Generate HTML report
npx run tests:generateReport
```

### E2E Tests

```bash
# External E2E test suite (from separate repository)
NODE_ENV=<env> npx run tests:tags @cmp
```

## Test Patterns

### Unit Tests

**TypeScript Tests (Jest with mocking):**
- Use `jest.fn()` for mocking functions and services
- Use `jest.Mocked<Type>` for typed mocks
- Structure: Arrange-Act-Assert pattern
- Mock external dependencies (AWS services, databases, APIs)

**Example pattern:**
```typescript
describe('worker name', () => {
  let mockService: jest.Mocked<ServiceType>;

  beforeEach(() => {
    mockService = { method: jest.fn() };
  });

  it('describes behavior', async () => {
    mockService.method.mockResolvedValue(result);
    const result = await handler({ Services: { mockService } });
    expect(result).toMatchObject(expected);
  });
});
```

**JavaScript Tests (Traditional Jest):**
- Pure function testing with mock data
- Math.random() mocking for deterministic tests
- Focus on data transformation and business logic

### Integration Tests (Cucumber)

**BDD Structure:**
- Given-When-Then scenarios
- Reusable step definitions in features/step_definitions/
- Test data management via features/lib/
- Hooks for setup/teardown in features/hooks/

**Testing Strategy:**
- Tests run against mocked AWS resources (SHOULD_MOCK_TEST_DATA=true)
- S3, DynamoDB, Kinesis interactions are simulated
- Full worker invocation with realistic payloads
- Result validation against expected schemas

**Example feature:**
```gherkin
@workerTag @cleanup
Feature: Worker name
  As a developer
  I want to verify worker behavior

  Scenario: Process valid input
    Given the s3 bucket exists
    And I save the input to the bucket
    When I invoke the worker with input
    Then the result matches expected output
```

## Mocking Strategy

### Unit Test Mocking

**AWS Services:**
- S3: Mock `getObject`, `getReadStreamForObject`, `putObject`
- SQS: Mock `sendMessage` for queue operations
- Kinesis: Mock stream writes
- DynamoDB: Mocked via @verifiedfan/test-utils

**External APIs:**
- SMS Service: Mock `sendMessage` for SMS notifications
- Slack: Mock webhook calls
- MongoDB: Mock database operations

**Patterns:**
- Dependency injection via `Services` object
- All external dependencies injected as constructor parameters
- Jest mocks reset between test cases using `beforeEach`

### Integration Test Mocking

**Test Data Management:**
- `SHOULD_MOCK_TEST_DATA=true` enables full mocking mode
- Test fixtures stored in features/lib/
- Custom utilities for data creation (features/lib/utils/)
- Result validators for different worker types

**Resource Cleanup:**
- `@s3DeleteTestRecords` tag triggers S3 cleanup
- DynamoDB cleanup via cucumber-features library
- Automatic cleanup in test hooks

## CI Configuration

### Pipeline Stages

**Pre-Bundle Tests (stage: pre-bundle tests):**
- App unit tests
- Tools unit tests
- Shared library unit tests
- ESLint validation
- YAML linting

**Environment-Specific Integration Tests:**

| Environment | Stage | Runner | Trigger |
|-------------|-------|--------|---------|
| QA | qa integration tests | nonprod terraformer | All branches |
| Dev | dev integration tests | nonprod terraformer | develop only |
| Preprod | preprod integration tests | prod terraformer preprod | develop only |
| Prod | (no integration tests) | - | - |

**E2E Tests:**
- Separate external test suite cloned from verifiedfan/e2e-tests/pipelines
- Tagged with `@cmp` to run campaign pipeline tests
- Runs after each environment deployment
- Tests against live environment resources

### Test Execution Details

**Unit Tests:**
```yaml
script:
  - npx run tests:unit ./apps
  - npx run tests:unit ./tools
  - npx run tests:unit ./shared
```

**Integration Tests:**
```yaml
script:
  - NODE_ENV=${NODE_ENV} SHOULD_MOCK_TEST_DATA=true npx run tests:integration ' --retry 2 --fail-fast'
retry: 1
artifacts:
  paths:
    - reports
```

**E2E Tests:**
```yaml
script:
  - git clone $E2E_PIPELINE_GIT_URL
  - cd pipelines && yarn
  - NODE_ENV=${NODE_ENV} npx run tests:tags @${E2E_TAG}
retry: 1
```

## Test Configuration Files

**Key Files:**
- `runfile.js` - Defines all test commands via runjs task runner
- `features/cucumberSetup.js` - Cucumber initialization
- `features/hooks/world.js` - Cucumber world context
- `babel.config.js` (implicit) - Transpilation config for tests
- `.gitlab-ci.yml` - CI/CD test orchestration

**Test Utilities:**
- `@verifiedfan/test-utils` - Shared testing utilities
- `@verifiedfan/cucumber-features` - Cucumber step libraries
- Custom test helpers in features/lib/

## Coverage Requirements

**Coverage Enforcement:**
- No explicit coverage thresholds configured in Jest
- Coverage not enforced in CI pipeline
- No coverage reports generated automatically

**Current Approach:**
- Focus on critical path testing
- Business logic heavily tested (data transformations, scoring)
- Worker handlers tested via integration tests
- Utility functions have comprehensive unit tests

## Test Data Management

**Unit Test Data:**
- Inline test fixtures in spec files
- Mock data generated per test case
- No external test data files

**Integration Test Data:**
- JSON/CSV test fixtures in features/lib/
- Reusable test schemas in features/schemas/
- Test data cleared between scenarios using tags

**Environment-Specific:**
- QA/Dev/Preprod have isolated test resources
- Mocking enabled to avoid external dependencies
- Real AWS resources used only in E2E tests
