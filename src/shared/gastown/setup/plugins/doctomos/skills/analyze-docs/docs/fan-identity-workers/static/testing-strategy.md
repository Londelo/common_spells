# Testing Strategy - fan-identity-workers

## Overview

The fan-identity-workers repository employs a comprehensive three-tier testing strategy combining **unit tests**, **integration tests**, and **BDD feature tests**. Tests run automatically in CI/CD across multiple environments (QA, DEV, PreProd, Prod).

## Test Organization

| Location | Type | Count | Framework |
|----------|------|-------|-----------|
| `apps/**/*.spec.ts` | Unit tests (TypeScript) | 20 | Jest + ts-jest |
| `apps/**/*.spec.js` | Unit tests (JavaScript) | 12 | Jest + Babel |
| `shared/**/*.spec.ts` | Shared library unit tests (TypeScript) | 11 | Jest + ts-jest |
| `shared/**/*.spec.js` | Shared library unit tests (JavaScript) | 12 | Jest + Babel |
| `test/integration/**/*.spec.ts` | Integration tests | 2 | Jest |
| `features/integrationTests/**/*.feature` | Feature/BDD tests | 13 | Cucumber |
| **Total** | | **70 files** | |

## Frameworks Used

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| **Jest** | Unit and integration testing | Babel + ts-jest via `babel.config.json` |
| **Cucumber** | BDD feature tests | `@verifiedfan/cucumber-features` |
| **Chai** | Assertion library | Used in Cucumber step definitions |
| **ts-jest** | TypeScript support | Transpiles `.ts` test files |
| **Babel** | JavaScript transpilation | Node 18.18.2 target |

## Running Tests

### Unit Tests

Unit tests exclude integration tests by default:

```bash
# All unit tests (apps + shared libraries)
npx run tests:unit

# Only app-level unit tests
npx run tests:unit ./apps

# Only shared library unit tests
npx run tests:unit ./shared

# Specific test path
npx run tests:unit path/to/test
```

**Jest configuration**: Runs via `babel.config.json` with TypeScript support through `@babel/preset-typescript`.

### Integration Tests

Integration tests interact with real AWS services (DynamoDB, SQS, etc.) in non-prod environments:

```bash
# Run integration tests
npx run tests:integration

# With retry (CI configuration)
npx run tests:integration ' --retry 2 --fail-fast'
```

**Environment**: Tests read from `CONFIG_ENV` environment variable to select configuration (qa, dev, preprod).

### Feature Tests (Cucumber BDD)

Feature tests validate end-to-end worker behavior using Gherkin scenarios:

```bash
# All feature tests
npx run tests:feature

# Specific scenario by name
npx run tests:scenario "scenario name"

# By tag
npx run tests:tags "@tagName"

# With retry (CI configuration)
npx run tests:feature ' --retry 2 --fail-fast'

# Generate HTML report
npx run tests:generateReport
```

**Reports**: HTML reports generated in `reports/index.html` after each run.

## Test Patterns

### Unit Tests

Unit tests follow Jest conventions with TypeScript or JavaScript:

- **File naming**: `*.spec.ts` or `*.spec.js` alongside source files
- **Mocking**: Uses `jest.fn()` for dependency injection
- **Structure**: `describe` blocks with `beforeEach` setup
- **Assertions**: Jest matchers (`expect(...).toEqual(...)`)

**Example** (`apps/scoring/enqueueFromStream/index.spec.ts`):

```typescript
describe('enqueueFromStream', () => {
  let services: jest.Mocked<Partial<Services>>;
  let queueManagerMock: jest.Mocked<QueueManager<GlobalUserIdActivity>>;

  beforeEach(() => {
    queueManagerMock = {
      sendMessages: jest.fn().mockReturnValue({ failed: 0, queued: 2 })
    };
    services = { accountActivityQueueManager: queueManagerMock };
  });

  it('sends account scoring events to queue', async() => {
    const sendResult = await enqueueFromStream({
      input: messages,
      Services: services as Services
    });
    expect(sendResult).toEqual({ in: 2, rejected: 0, failed: 0, queued: 2 });
  });
});
```

### Integration Tests

Integration tests use real AWS resources and DynamoDB:

- **Location**: `test/integration/services/**/*.spec.ts`
- **Setup**: Uses `beforeEach` to create test records
- **Cleanup**: Uses `afterEach` to delete test data
- **Configuration**: Reads from `shared/config` with environment-specific overrides

**Example** (`test/integration/services/identity/checkLiveness.spec.ts`):

- Tests identity verification liveness checks
- Creates/deletes DynamoDB sessions
- Validates rules engine behavior
- Tests ARM score thresholds and verification requirements

### Mocking Strategy

- **Services layer**: Mocked via Jest's `jest.Mocked<T>` type
- **AWS clients**: Mocked in unit tests, real in integration tests
- **External APIs**: Mocked via custom test fixtures
- **Queue managers**: Mocked with `jest.fn().mockReturnValue(...)`

### Functional Programming in Tests

The codebase enforces functional programming, but **tests have relaxed linting**:

- `fp/no-let` disabled in tests
- `fp/no-mutation` disabled in tests
- Allows imperative setup/teardown in `beforeEach`/`afterEach`

## Feature Tests (Cucumber/BDD)

### Structure

Feature tests use Gherkin syntax:

```gherkin
@enqueueFromStream
Feature: Stream user activities
  As a developer
  I want to be able to stream user activities from the kafka topic
  and send them to the user activity queue

  @enqueueFromStream-success
  Scenario: All received user activities sends to queue
    When I invoke the enqueueFromStream worker with the scorableKafkaInput input
    Then the result matches the enqueueFromStreamAll result
```

### Step Definitions

Step definitions live in `@verifiedfan/cucumber-features` package and are initialized in `features/cucumberSetup.js`:

- **Inputs**: Defined in `features/lib/inputs/`
- **Expected results**: Defined in `features/lib/results/`
- **Setup**: Uses `Before` hook to inject config and fixtures

### Coverage

Feature tests exist for:

- **Auth**: Token validation (`validateToken.feature`)
- **IDV**: Liveness checks, event handling (`checkLiveness.feature`, `handleEvent.feature`)
- **Scoring**: All scoring workers (9 feature files covering enqueue, lookup, scoring, rescoring)

## CI Configuration

Tests run in GitLab CI across environments via `.gitlab-ci.yml`:

### Test Stages

| Stage | Environment | Tests Run | Notes |
|-------|-------------|-----------|-------|
| **pre-bundle tests** | CI runner | Unit tests (apps, shared), eslint, yamllint | Runs before bundling |
| **qa integration tests** | QA1 (nonprod) | Integration tests | Uses `CONFIG_ENV=qa` |
| **qa feature tests** | QA1 (nonprod) | Cucumber feature tests | Auto on main, manual otherwise |
| **dev integration tests** | DEV1 (nonprod) | Integration tests | Only on main branch |
| **dev feature tests** | DEV1 (nonprod) | Cucumber feature tests | Only on main branch |
| **preprod integration tests** | PreProd1 (prod) | Integration tests | Only on main branch |
| **preprod feature tests** | PreProd1 (prod) | Cucumber feature tests | Only on main branch |

### Coverage Requirements

- **Pre-merge**: Unit tests + linting must pass
- **Post-deploy**: Integration and feature tests validate deployment
- **Retries**: Integration and feature tests retry up to 2 times with `--fail-fast`

## Test Infrastructure

### Dependencies

From `package.json`:

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "babel-jest": "^29.7.0",
    "@types/jest": "^29.5.5",
    "cucumber": "^6.0.5",
    "cucumber-html-reporter": "^5.1.0",
    "cucumber-pretty": "^6.0.0",
    "@verifiedfan/cucumber-features": "^1.0.1",
    "@verifiedfan/test-utils": "^2.3.2",
    "chai": "^4.1.2",
    "chai-json-schema-ajv": "^2.0.0",
    "chai-subset": "^1.6.0"
  }
}
```

### Build Process

1. **Transpilation**: Babel + TypeScript preset
2. **Module resolution**: Webpack resolver for absolute imports
3. **Test runner**: Jest with Babel/ts-jest transformers
4. **Cucumber**: Uses `@babel/register` for runtime transpilation

## Best Practices

### Unit Testing

- **Co-location**: Tests live alongside source files
- **Isolation**: Mock all external dependencies
- **Focus**: Test single units of functionality
- **Complexity**: Keep tests under 200 lines (enforced via ESLint)

### Integration Testing

- **Cleanup**: Always delete test data in `afterEach`
- **Isolation**: Use unique test IDs to avoid conflicts
- **Environment**: Never run against production
- **Idempotency**: Tests should be runnable multiple times

### Feature Testing

- **Scenarios**: One scenario per feature aspect
- **Tags**: Use `@ignore` to skip broken tests temporarily
- **Data**: Define inputs/results as reusable fixtures
- **Reporting**: Always generate HTML reports for debugging

## Notes

- Tests run with Node.js 18.18.2 target
- All test files use strict linting except `fp/no-let` and `fp/no-mutation`
- Pre-push hook runs `npx run eslint:lint` to catch issues early
- HTML test reports open automatically via `launchReport: true`
