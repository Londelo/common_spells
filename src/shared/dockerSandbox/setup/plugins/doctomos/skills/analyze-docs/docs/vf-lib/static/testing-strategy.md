# Testing Strategy - vf-lib

## Overview

The vf-lib repository uses **Jest** as its primary testing framework for both unit and integration tests. Tests are organized within each package in the monorepo structure, with clear separation between unit tests (located in `src/` directories) and integration tests (located in `integrationTests/` directories). The repository contains 84+ test files covering AWS services, database operations, third-party integrations, and utility functions.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| packages/*/src/**/*.spec.js | JavaScript Unit Tests | 58 |
| packages/*/src/**/*.spec.ts | TypeScript Unit Tests | 12 |
| packages/*/integrationTests/*.spec.js | JavaScript Integration Tests | 13 |
| packages/*/integrationTests/*.spec.ts | TypeScript Integration Tests | 3 |
| **Total** | **All Tests** | **86** |

### Test Distribution by Package

Tests are distributed across multiple packages including:

- **AWS Services**: DynamoDB, S3, Lambda, Kinesis, Firehose, CloudWatch, Athena, SNS, SQS, Secrets Manager
- **Database**: MongoDB operations (find, insert, update, delete)
- **Third-Party APIs**: Spotify, Apple Music, Facebook, Bitly, PagerDuty, SFMC
- **Ticketmaster Services**: Discovery API, Orders, Users, Accounts, SMS, Wallet, PacMan
- **Utilities**: JWT, Crypto, Kafka, Request handling, Normalizers, Object utilities, Logging
- **Streaming**: Batch Transform Stream, CSV Write Stream, Flatten Transform Stream, Reduce Lines
- **Testing Utilities**: Test data generators, Lambda input mocks

## Frameworks and Tools Used

| Framework/Tool | Purpose | Version |
|----------------|---------|---------|
| Jest | Unit & Integration Testing | ^29.7.0 |
| Babel Jest | JavaScript transpilation for tests | ^29.7.0 |
| ts-jest | TypeScript transpilation for tests | ^29.1.1 |
| @types/jest | TypeScript type definitions | ^29.5.5 |
| jest-environment-node-debug | Debugging support | ^2.0.0 |
| Lerna | Monorepo test orchestration | ^4.0.0 |

## Running Tests

### All Tests
```bash
# Run all unit and integration tests
npm test
```

### Unit Tests Only
```bash
# Via runjs task
npx run tests:unit

# Direct Jest command
npx jest packages/*/src/**

# With options (e.g., watch mode)
npx run tests:unit --watch
```

### Integration Tests Only
```bash
# Via runjs task (runs serially with --runInBand)
npx run tests:integration

# Direct Jest command
npx jest --runInBand packages/*/integrationTests/

# With options
npx run tests:integration --verbose
```

### Package-Specific Tests
```bash
# Test a specific package
npx jest packages/aws/

# Test a specific file
npx jest packages/jwt/src/jwt.spec.js
```

## Test Patterns

### Unit Tests

Unit tests are located alongside source code in `packages/*/src/**/*.spec.js` or `*.spec.ts` files. They follow these patterns:

#### Mocking Strategy
- **AWS SDK Mocking**: Uses Jest mocks to intercept AWS SDK v3 commands (e.g., `PutCommand`, `GetCommand`, `QueryCommand`)
- **Manual Mocks**: Creates mock implementations of SDK clients with Jest spies
- **Return Value Mocking**: Defines expected response shapes for each command type

**Example from DynamoDB tests:**
```javascript
jest.mock('@aws-sdk/lib-dynamodb', () => {
  const commandSpies = {
    PutCommand: jest.fn(),
    GetCommand: jest.fn(),
    // ... other commands
  };

  const DynamoDBDocumentClient = jest.fn().mockImplementation(() => ({
    send: jest.fn(command => {
      // Match command type and return mock response
      return Promise.resolve(mockResponse);
    })
  }));

  return { DynamoDBDocumentClient, ...commandSpies };
});
```

#### Test Structure
- **AAA Pattern**: Arrange, Act, Assert structure
- **Descriptive Tests**: Clear test descriptions using `it('can [action] [resource]', ...)`
- **Expect Matchers**: Uses `toHaveBeenCalledWith`, `toEqual`, `toBeCalledTimes` for assertions

**Example test structure:**
```javascript
describe('DynamoDB', () => {
  afterEach(jest.clearAllMocks);

  it('can put data into the given table', async() => {
    // Arrange
    const dynamodb = DynamoDB({ tableName: 'cats' });
    const testData = { foo: 'bar', bar: 12 };

    // Act
    await dynamodb.put({ data: testData });

    // Assert
    expect(PutCommand).toHaveBeenCalledWith({
      TableName: 'cats',
      Item: testData
    });
  });
});
```

### Integration Tests

Integration tests are located in `packages/*/integrationTests/**/*.spec.js` or `*.spec.ts` files. They test real interactions with external services.

#### Setup/Teardown Pattern
- **beforeAll**: Initialize connections, create test data
- **beforeEach**: Reset state between tests
- **afterAll**: Cleanup test data, close connections
- **Extended Timeouts**: Uses `jest.setTimeout()` for longer-running operations

**Example from MongoDB integration tests:**
```javascript
beforeAll(async() => {
  testRun.client = await MongoDB({ config, instrumentFn });
  testRun.collection = testRun.client.Collection(collectionName);
  await testRun.collection.deleteMany({ campaign_id: testCampaignId });
  await testRun.collection.insertMany(testDocuments);
  jest.setTimeout(10000);
});

afterAll(async() => {
  await testRun.collection.deleteMany({ campaign_id: testCampaignId });
  await testRun.client.closeDb();
  jest.setTimeout(5000);
});
```

#### Real Service Testing
- **MongoDB**: Tests CRUD operations against real MongoDB instance
- **Third-Party APIs**: Tests Spotify, Apple Music, Facebook, etc. with real credentials
- **AWS Services**: Tests DynamoDB, other AWS services in non-prod environments
- **Kafka**: Tests message production/consumption with real Kafka brokers

### Mocking Strategy

The codebase employs sophisticated mocking strategies:

1. **Module-Level Mocks**: Entire AWS SDK modules mocked with `jest.mock()`
2. **Command Spies**: Each AWS command is a separate spy for granular testing
3. **Dynamic Response Matching**: Mock responses matched based on command instance types
4. **Batch Operation Testing**: Validates behavior with multiple commands (e.g., 50 items split into batches of 25)

### Error Handling Tests

Tests verify proper error handling for:
- Conditional expressions (e.g., `attribute_not_exists`)
- Unprocessed items in batch operations
- Invalid inputs and edge cases

## CI Configuration

### Pipeline Stages

The GitLab CI pipeline has three stages:

1. **install**: Install dependencies and build packages
2. **test**: Run linting, unit tests, and integration tests in parallel
3. **release**: Publish packages (master branch only)

### Test Jobs

#### Unit Tests Job
```yaml
unit tests:
  tags:
    - tm-prod cicd build
  stage: test
  script:
    - npx run tests:unit
```

- **Runner**: Production CICD build runner
- **Parallel**: Runs in parallel with other test jobs
- **Failure**: Fails the pipeline if tests fail

#### Integration Tests Job
```yaml
integration tests:
  tags:
    - tm-prod-preprod cicd test
  stage: test
  script:
    - npx run tests:integration
  allow_failure: true
```

- **Runner**: Production/preprod CICD test runner
- **Serial Execution**: Uses `--runInBand` to prevent race conditions
- **Failure Tolerance**: `allow_failure: true` means integration test failures don't block the pipeline
- **Environment Access**: Has access to MongoDB and other services for integration testing

#### ESLint Job
```yaml
eslint:
  tags:
    - tm-prod cicd build
  stage: test
  script:
    - npx run eslint:lint
```

- Runs in parallel with test jobs
- Enforces code style and quality standards

### Environment Variables

Required CI environment variables:
- `MONGO_USERNAME`: MongoDB credentials for integration tests
- `SSH_PRIVATE_KEY`: For Git operations in release stage
- `NPM_TOKEN`: For publishing to npm registry
- `GIT_EMAIL`, `GIT_NAME`: Git configuration

### Caching

Cache configuration optimizes CI performance:
```yaml
cache:
  key: $CI_COMMIT_REF_SLUG
  paths:
    - node_modules
    - packages/*/node_modules
```

## Test Configuration

### Jest Configuration (package.json)

```json
{
  "jest": {
    "testPathIgnorePatterns": [
      "/node_modules/",
      "/dist/"
    ],
    "testEnvironment": "node",
    "transform": {
      "^.+\\.(js|jsx)$": ["babel-jest"],
      "^.+\\.(ts|tsx)$": [
        "ts-jest",
        {
          "tsconfig": "tsconfig.json"
        }
      ]
    }
  }
}
```

**Configuration Details:**
- **Test Environment**: Node.js environment (no browser/DOM)
- **Ignored Paths**: Excludes `node_modules` and built `dist` directories
- **Transformers**:
  - Babel for JavaScript files
  - ts-jest for TypeScript files with tsconfig support

### Monorepo Testing with Lerna

The repository uses Lerna to manage testing across multiple packages:
- Each package can have its own `package.json` with test scripts
- Root-level commands execute tests across all packages
- Lerna bootstraps dependencies before running tests in CI

## Testing Best Practices

### Observed Patterns

1. **Clear Test Descriptions**: Tests use descriptive `it()` statements that read like documentation
2. **Mock Cleanup**: `afterEach(jest.clearAllMocks)` ensures test isolation
3. **Batch Testing**: Validates operations with multiple items (e.g., 25, 50 items)
4. **Return Value Validation**: Tests verify returned data structures
5. **Condition Testing**: Tests include conditional expressions and error scenarios
6. **Real Data Patterns**: Integration tests use realistic test data with cleanup

### TypeScript Testing

TypeScript tests (`.spec.ts` files) benefit from:
- Type checking during test execution
- IDE autocomplete for test data and assertions
- Compile-time validation of test structure
- Import of actual types from source code

**Example:**
```typescript
import { UpdateArgs } from './types';

const testParams: UpdateArgs[] = [
  { key: { id: 1 }, updateExpression: '...' },
  // Type-checked test data
];
```

## Coverage Considerations

While no coverage reports are explicitly configured in the CI pipeline, the repository demonstrates:

- **Comprehensive Unit Coverage**: Core packages like DynamoDB, JWT, MongoDB have extensive unit tests
- **Critical Path Testing**: Integration tests cover key workflows (user operations, data persistence)
- **Batch Operations**: Special attention to batch processing logic (25-item chunks)
- **Error Scenarios**: Conditional expressions, unprocessed items, and failure cases

## Development Workflow

### Pre-commit Hooks

Husky is configured with pre-push hooks:
```json
{
  "scripts": {
    "prepush": "run eslint:lint && validate-commit-msg"
  }
}
```

- Runs ESLint before pushing
- Validates commit messages follow conventional commit format

### Commit Message Validation

Configured with `validate-commit-msg`:
- Enforces conventional commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `ci`
- Max subject length: 100 characters
- Fails on invalid format (not just warns)

## Debugging Tests

### Debug Mode

Uses `jest-environment-node-debug` for debugging capabilities:
```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output

```bash
# Run tests with verbose output
npx run tests:unit --verbose

# Show individual test results
npx jest --verbose
```

### Watch Mode

```bash
# Watch mode for TDD
npx jest --watch

# Watch only changed files
npx jest --watch --onlyChanged
```

## Future Recommendations

1. **Coverage Reports**: Add coverage collection with `--coverage` flag
2. **Coverage Thresholds**: Set minimum coverage requirements in Jest config
3. **Integration Test Reliability**: Address `allow_failure: true` by stabilizing integration tests
4. **Parallel Integration Tests**: Investigate if integration tests can run in parallel safely
5. **Test Data Management**: Consider shared test fixtures/factories for consistency
6. **E2E Testing**: Consider adding end-to-end tests for complete workflows
7. **Performance Testing**: Add benchmarks for critical operations like batch processing
