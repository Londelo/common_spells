# Testing Strategy - upload-service

## Overview

The upload-service uses a hybrid testing approach with unit tests via Jest and comprehensive BDD/E2E tests via Cucumber. The testing strategy emphasizes behavior validation through feature scenarios while maintaining focused unit tests for critical utility functions and middleware.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| lib/**/*.spec.js | Unit tests | 3 |
| features/scenarios/ | Cucumber BDD/E2E | 7 feature files |

### Test Files Breakdown

**Unit Tests:**
- `/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/config.spec.js` - Configuration loading validation
- `/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/featureUtils.spec.js` - Common utility functions
- `/Users/Brodie.Balser/Documents/TM/titan/upload-service/lib/middlewares/validators/ValidatorMiddleware.spec.js` - Middleware validation logic

**Cucumber Features:**
- `features/scenarios/files.feature` - File upload and deletion flows
- `features/scenarios/files.list.data.feature` - File listing data operations
- `features/scenarios/files.list.feature` - File listing scenarios
- `features/scenarios/images.feature` - Image upload scenarios
- `features/scenarios/infrastructure.feature` - Health checks and metrics
- `features/scenarios/supremes.feature` - Supreme bucket operations
- `features/scenarios/trigger.feature` - Trigger operations

## Frameworks Used

| Framework | Purpose | Version |
|-----------|---------|---------|
| Jest | Unit testing | 25.1.0 |
| Cucumber | BDD/E2E testing | 4.2.1 |
| Chai | Assertions | 4.1.2 |

**Additional Testing Libraries:**
- `chai-json-equal` - JSON equality assertions
- `chai-json-schema-ajv` - Schema validation
- `chai-match` - Pattern matching
- `chai-subset` - Subset matching
- `cucumber-html-reporter` - HTML reporting

## Running Tests

```bash
# Unit tests - Server code
npx run server:test

# Unit tests - Library code
npx run lib:test

# Linting
npx run eslint '-f table'

# YAML linting
yamllint -c yamllint.config.yml .

# Cucumber features (requires Docker)
npx run docker:features reports/all

# Infrastructure-specific features
npx run docker:features reports/infrastructure "--tags @infrastructure"
```

## Test Patterns

### Unit Tests

Unit tests follow standard Jest patterns with:
- **Arrange-Act-Assert** structure
- **Mock-based isolation** using `jest.fn()` for dependencies
- **Focused testing** on pure functions and middleware logic
- **Configuration testing** validates environment configs can be loaded

**Example from ValidatorMiddleware.spec.js:**
```javascript
it('throws the result of errorFn if predicate fails', () => {
  const mockNext = jest.fn();
  const mockContext = { foo: 'baz' };
  const middleware = ValidatorMiddleware({
    predicate: R.propEq('foo', 'bar'),
    errorFn: ctx => new Error(`invalid foo value`)
  });
  expect(() => middleware(mockContext, mockNext).toThrowError());
  expect(mockNext).not.toBeCalled();
});
```

### BDD/E2E Tests (Cucumber)

Cucumber features test complete user flows:
- **Gherkin syntax** for readable business scenarios
- **Tag-based organization** (@fileUpload, @infrastructure, @filesDelete)
- **Docker-based execution** for isolated test environments
- **AWS integration** tests against S3, DynamoDB, Kinesis, Firehose
- **Schema validation** using JSON schema assertions

**Example from files.feature:**
```gherkin
@fileUpload-scoring-flow
Scenario: Uploading a file to scoring bucket returns an s3 url
  When I upload the text file with name "justTest.txt"
  Then the result matches the imageUpload schema
  And the s3 bucket filesBucket contains the justTest.txt record
  And the s3 contents match the testFileContent result
```

### Mocking Strategy

- **External AWS services** are real integrations in feature tests (S3, DynamoDB)
- **Middleware validation** uses Jest mocks for context and next functions
- **Configuration loading** tests against actual YAML config files
- **Step definitions** use @verifiedfan/cucumber-features and @verifiedfan/test-utils

### Docker-Based Testing

Feature tests run in Docker Compose:
```bash
# Pull latest image and run features
npx run docker:compose pull
npx run docker:features reports/all

# Generate HTML reports
Reports saved to reports/ directory
```

## CI Configuration

### GitLab CI Pipeline Stages

**Test Stage:**
1. **eslint** - Code quality checks
2. **yaml lint** - YAML configuration validation
3. **server-uts** - Server unit tests
4. **lib-uts** - Library unit tests

**Features Stage:**
1. **features** - Docker-based Cucumber tests
   - Runs after bundle and dockerize
   - Generates HTML reports
   - Uses @infrastructure tags for infrastructure-only tests
   - Retries once on failure
   - Artifacts expire in 8h

**Environment-Specific Feature Tests:**
- **dev features** - Tests against dev environment
- **preprod features** - Tests against preprod environment
- **dev monoql features** - MonoQL integration tests (dev)
- **preprod monoql features** - MonoQL integration tests (preprod)

### Test Execution Requirements

- All unit tests must pass before bundling
- Feature tests run in isolated Docker containers
- Environment-specific tests validate deployments
- Tests use tagged scenarios for selective execution

## Test Coverage

No explicit coverage thresholds configured. Coverage is implied through:
- Unit tests for critical utility functions
- Comprehensive E2E scenarios covering main user flows
- Infrastructure tests validating health and metrics
- Integration tests with AWS services
