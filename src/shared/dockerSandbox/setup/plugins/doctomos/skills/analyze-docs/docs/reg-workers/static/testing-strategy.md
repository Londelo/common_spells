# Testing Strategy - reg-workers

## Overview

The registration workers repository employs a multi-layered testing strategy combining unit tests (Jest), integration tests (Cucumber BDD), and E2E tests (Cucumber BDD). The strategy emphasizes functional programming principles with strict ESLint enforcement and provides comprehensive coverage across all Lambda workers and shared utilities.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| `**/*.spec.ts` | TypeScript unit tests | 20 |
| `**/*.spec.js` | JavaScript unit tests | 38 |
| `features/integrationTests/` | Cucumber integration tests | 15 features |
| `features/e2eTests/` | Cucumber E2E tests | Unknown |
| **Total Unit Tests** | **Jest** | **58** |
| **Total Feature Files** | **Cucumber** | **15** |

### Unit Test Locations

Unit tests are co-located with source files:
- `apps/registration/**/*.spec.ts` - Registration domain tests
- `apps/replication/**/*.spec.ts` - Replication domain tests
- `apps/selection/**/*.spec.ts` - Selection domain tests
- `apps/dataPipeline/**/*.spec.ts` - Data pipeline tests
- `shared/**/*.spec.{ts,js}` - Shared utilities, middlewares, services

### Integration Test Locations

Integration tests are organized in `features/integrationTests/`:
- `checkEligibility.feature` - Eligibility validation
- `enqueueEntries.feature` - Entry queueing from DynamoDB streams
- `saveEntries.feature` - Entry replication to Entry Service
- `enqueueMarketSelections.feature` - Market selection processing
- `refreshSelections.feature` - Selection refresh logic
- `markAssignedCodes.feature` - Code assignment tracking
- `processData.feature` - Data pipeline processing
- `planSends.feature` - Notification planning
- `triggerReminderEmail.feature` - Reminder email triggers
- `getMarketsToNotify.feature` - Market notification logic
- `notificationGenerator.feature` - Notification generation

## Frameworks Used

| Framework | Purpose | Version |
|-----------|---------|---------|
| **Jest** | Unit testing framework | ^25.1.0 |
| **Babel Jest** | Transpile tests with Babel | ^25.1.0 |
| **Cucumber** | BDD integration/E2E tests | ^6.0.5 |
| **Chai** | Assertion library (Cucumber) | ^4.1.2 |
| **@verifiedfan/test-utils** | Internal test utilities | ^3.7.0 |
| **@verifiedfan/cucumber-features** | Shared Cucumber features | ^1.3.0 |

### Additional Testing Dependencies

- **chai-json-schema-ajv** - JSON schema validation
- **chai-subset** - Subset assertions
- **cucumber-html-reporter** - HTML test reports
- **cucumber-pretty** - Pretty console output

## Running Tests

### All Unit Tests
```bash
npx run tests:unit
```

### Unit Tests by Directory
```bash
# Apps only (workers)
npx run tests:unit ./apps

# Shared only (utilities and middlewares)
npx run tests:unit ./shared
```

### Integration Tests
```bash
npx run tests:integration

# With retries and fail-fast
npx run tests:integration ' --retry 2 --fail-fast'
```

### E2E Tests
```bash
npx run tests:e2e
```

### By Scenario Name
```bash
npx run tests:scenario "Scenario name here"
```

### By Cucumber Tags
```bash
npx run tests:tags @tagName
```

### Generate HTML Report
```bash
npx run tests:generateReport
```

### Linting
```bash
# Check for issues
npx run eslint:lint

# Auto-fix issues
npx run eslint:fix

# Table format (used in CI)
npx run eslint:lint '-f table'
```

### Type Checking
```bash
npx run types:check
```

## Test Patterns

### Unit Tests

#### Jest Configuration

Tests use **Jest 25.1.0** with Babel transpilation:
- **Babel config**: `babel.config.json`
- **Target**: Node 18.18.2
- **Presets**: `@babel/preset-env`, `@babel/preset-typescript`
- **Plugins**: Object rest spread, nullish coalescing, optional chaining

#### Test Structure Pattern

```typescript
import { functionToTest } from './module';

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('describes expected behavior', () => {
      const input = { foo: 'bar' };
      const result = functionToTest(input);
      expect(result).toEqual({ expected: 'value' });
    });
  });
});
```

#### Mock Pattern for Services

```typescript
const mockService = jest.fn(() => Promise.resolve(mockData));

const mockServices = {
  entryService: { post: mockService },
  aws: { dynamodb: mockDynamoDB }
};

// Test with mocked services
const result = await worker({ Services: mockServices, event });
expect(mockService).toHaveBeenCalledWith(expectedArgs);
```

#### Config Mocking Pattern

```javascript
jest.mock('../config', () => {
  const { Map } = require('immutable');
  return Map({
    verifiedfan: Map({
      workers: Map({
        workerName: Map({ /* config */ })
      })
    })
  });
});
```

### Integration Tests

#### Cucumber Feature Structure

Integration tests use **Gherkin syntax** with BDD scenarios:

```gherkin
@workerName
Feature: Worker Name
  As a developer
  I want to test worker behavior with real services

  @tagName @cleanupDynamo
  Scenario: Successful case
    Given I update the redis cache with the campaign input
    And I write to the entries collection with the entry input
    When I invoke the workerName worker with the event input
    Then the result matches the expected result
```

#### Common Step Patterns

- **Given** steps: Set up data in Redis, MongoDB, DynamoDB
- **When** steps: Invoke workers with test payloads
- **Then** steps: Assert results match expected outputs

#### Test Data Management

Test data stored in `features/integrationTests/` directories:
- JSON fixtures for inputs
- Expected result fixtures
- Reusable test data across scenarios

### Mocking Strategy

#### AWS Service Mocking

```typescript
const mockDynamoDB = {
  batchWrite: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => Promise.resolve({ Items: [] }))
};

const mockSQS = {
  sendMessageBatch: jest.fn(() => Promise.resolve())
};
```

#### HTTP Service Mocking

```typescript
jest.mock('@verifiedfan/request', () => ({
  TitanRequest: jest.fn(() => ({
    post: jest.fn(() => Promise.resolve({ data: mockData })),
    get: jest.fn(() => Promise.resolve({ data: mockData }))
  }))
}));
```

#### Date/Time Mocking

```typescript
jest.mock('@verifiedfan/date', () => ({
  toISOString: jest.fn(() => '2025-01-01T00:00:00.000Z')
}));

global.Date.now = jest.fn(() => 12345);
```

#### MongoDB ObjectId Mocking

```typescript
jest.mock('@verifiedfan/mongodb', () => ({
  makeObjectId: jest.fn(id => id)
}));
```

## CI Configuration

### Pipeline Stages (`.gitlab-ci.yml`)

1. **Install** - `yarn install`
2. **Pre-bundle tests** - Unit tests, linting, type checking
3. **Bundle** - Webpack bundling
4. **QA/Dev/Preprod/Prod Deploy** - Terraform deployments
5. **Check AWS** - Verify AWS resources exist
6. **Integration tests** - Cucumber integration tests per environment
7. **E2E tests** - Cucumber E2E tests per environment

### Pre-Bundle Test Jobs

```yaml
apps unit tests:
  stage: pre-bundle tests
  script:
    - npx run tests:unit ./apps

lib unit tests:
  stage: pre-bundle tests
  script:
    - npx run tests:unit ./shared

eslint:
  stage: pre-bundle tests
  script:
    - npx run eslint:lint '-f table'

types check:
  stage: pre-bundle tests
  script:
    - npx run types:check
```

### Integration Test Jobs (Per Environment)

```yaml
qa integration tests:
  stage: qa integration tests
  script:
    - npx run tests:integration ' --retry 2 --fail-fast'
  artifacts:
    paths:
      - reports
```

### E2E Test Jobs

E2E tests run from separate pipeline repository:

```yaml
qa e2e tests:
  script:
    - git clone $E2E_PIPELINE_GIT_URL
    - cd pipelines
    - yarn
    - NODE_ENV=$CONFIG_ENV npx run tests:tags @${E2E_TAG}
  artifacts:
    paths:
      - e2eTests/reports
```

### Test Artifacts

- **Unit tests**: No artifacts (fail fast)
- **Integration tests**: HTML reports in `reports/` directory
- **E2E tests**: HTML reports in `e2eTests/reports/` directory

## Code Quality Enforcement

### ESLint Functional Programming Rules

The codebase enforces **strict functional programming** via ESLint:

#### Mandatory Rules
- `fp/no-let` - No mutable variables (use `const`)
- `fp/no-mutation` - No object mutation
- `fp/no-loops` - No `for`/`while` loops (use `.map()`, `.filter()`, `.reduce()`)
- `fp/no-class` - No classes (use functions)
- `fp/no-arguments` - No `arguments` keyword
- `fp/no-delete` - No `delete` operator
- `fp/no-get-set` - No getters/setters

#### Complexity Limits
- **Max cyclomatic complexity**: 6
- **Max depth**: 2
- **Max lines per file**: 200
- **Max line length**: 120

#### Code Style
- Single quotes
- Semicolons required
- 2-space indentation
- Trailing commas not allowed
- Arrow functions preferred

### Impact on Tests

Tests must also follow functional programming rules:
- Use `const` for all variables
- No mutation of test data
- Use Ramda helpers for transformations
- Mock functions as immutable objects

## Test Coverage

Coverage is **not explicitly tracked** in CI pipeline. There is no Jest coverage configuration in `package.json` or `.gitlab-ci.yml`.

### Recommendations for Coverage

To enable coverage tracking:

1. Add Jest coverage scripts to `package.json`:
```json
"test:coverage": "jest --coverage"
```

2. Add coverage thresholds to `babel.config.json` or separate `jest.config.js`:
```json
"jest": {
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 75,
      "functions": 80,
      "lines": 80
    }
  }
}
```

3. Add coverage reporting to CI pipeline

## Test Execution Flow

### Local Development

1. Write unit tests co-located with source files
2. Run `npx run tests:unit` to verify
3. Run `npx run eslint:lint` to check code quality
4. Run `npx run types:check` to verify TypeScript types
5. Commit and push

### CI/CD Pipeline

1. **Pre-bundle tests** run in parallel:
   - Apps unit tests
   - Shared unit tests
   - ESLint
   - TypeScript type checking
   - YAML linting
2. **Bundle** workers with Webpack
3. **Deploy** to QA environment
4. **Integration tests** run against QA
5. **E2E tests** run against QA
6. Repeat for Dev → Preprod → Prod

### Test Failure Handling

- **Unit tests**: Fail fast, block deployment
- **ESLint**: Fail fast, block deployment
- **Type errors**: Fail fast, block deployment
- **Integration tests**: Retry 2 times with `--fail-fast`
- **E2E tests**: Retry 1 time

## Best Practices

### Writing Unit Tests

1. **Test pure functions**: Focus on testing pure functions with predictable inputs/outputs
2. **Mock external dependencies**: Always mock AWS services, HTTP clients, databases
3. **Use descriptive test names**: `it('should return eligible when campaign is open')`
4. **Avoid mutation in tests**: Use spread operators and Ramda helpers
5. **Clear mocks after each test**: `afterEach(jest.clearAllMocks)`

### Writing Integration Tests

1. **Use meaningful feature names**: `@checkEligibility Feature: Check eligibility`
2. **Tag scenarios appropriately**: `@entryValidation @cleanupDynamo`
3. **Clean up test data**: Use `@cleanupDynamo` tag for cleanup
4. **Use descriptive Given/When/Then**: Make scenarios readable
5. **Reuse step definitions**: Leverage existing step definitions in `features/step_definitions/`

### Avoiding Common Pitfalls

1. **Don't mutate test data**: Create new objects instead of modifying existing ones
2. **Don't use `let` in tests**: ESLint will fail
3. **Don't test implementation details**: Test behavior, not internals
4. **Don't skip cleanup**: Always clean up DynamoDB/MongoDB/Redis after integration tests
5. **Don't hardcode values**: Use constants and fixtures

## Future Improvements

1. **Add coverage tracking**: Enable Jest coverage with thresholds
2. **Add coverage reports to CI**: Publish coverage artifacts
3. **Add unit test count badges**: Show test count in README
4. **Add E2E test documentation**: Document E2E test structure and patterns
5. **Add performance tests**: Test Lambda cold start and execution times
6. **Add contract tests**: Validate API contracts with external services
