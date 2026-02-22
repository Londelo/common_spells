# Testing Strategy - code-service

## Overview

The code-service uses a dual testing approach combining unit tests with Jest and end-to-end behavior testing with Cucumber. The testing strategy emphasizes integration testing through BDD scenarios that verify the service's API contracts and business logic while using unit tests to validate specific utilities and middleware components.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| app/managers/codes/index.spec.js | Unit test | 1 |
| lib/config.spec.js | Unit test | 1 |
| lib/featureUtils.spec.js | Unit test | 1 |
| lib/middlewares/validators/ValidatorMiddleware.spec.js | Unit test | 1 |
| features/scenarios/*.feature | Cucumber BDD | 6 |

**Total Unit Test Files**: 4 (approximately 164 lines of test code)
**Total Feature Files**: 6 feature files covering core business scenarios

## Frameworks Used

| Framework | Purpose | Version |
|-----------|---------|---------|
| Jest | Unit testing | ^21.2.1 |
| Cucumber | BDD/E2E testing | ^6.0.5 |
| Chai | Assertions | ^4.1.2 |
| @verifiedfan/cucumber-features | Shared Cucumber utilities | ^0.25.9 |
| @verifiedfan/test-utils | Testing helpers | ^2.3.0 |

## Running Tests

### Unit Tests

The service uses custom script runners via the `run` command (likely from @verifiedfan/configs):

```bash
# Server unit tests
run server:test

# Library unit tests
run lib:test

# Linting (pre-push hook)
run eslint
```

### Integration/E2E Tests (Cucumber)

```bash
# Run all features
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run features

# Run features with fail-fast
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run features ' --fail-fast'

# Docker-based feature tests (for CI)
run docker:features reports/all
run docker:features reports/verifyAfter "--tags @verifyAfter"
```

## Test Patterns

### Unit Tests

**Regex Pattern Testing** (`app/managers/codes/index.spec.js`)
- Tests regex patterns for parsing S3 file keys
- Validates named group extraction (campaignId, type)
- Example: `codes/5ec2fa1a276dca5916a19b15/tm/20200704005334.csv`

**Configuration Loading** (`lib/config.spec.js`)
- Validates that all environment config files can be loaded successfully
- Tests: dev, docker, local-dev, preprod, prod, qa configurations
- Ensures config schema compliance across environments

**Utility Functions** (`lib/featureUtils.spec.js`)
- Tests common utility functions used in feature tests
- Functions include: renameKeys, getValueAtPath, setPropPathToVal, removePath
- Focuses on object manipulation helpers for test data

**Middleware Validation** (`lib/middlewares/validators/ValidatorMiddleware.spec.js`)
- Tests predicate-based validation middleware
- Uses Ramda for functional predicates
- Verifies error throwing when validation fails
- Ensures next() is called when validation passes

### Cucumber BDD Tests

**Test Structure**:
- Feature files in `features/scenarios/`
- Step definitions in `features/step_definitions/`
- Shared utilities from `@verifiedfan/cucumber-features`
- Custom inputs and results in `features/lib/`

**Covered Scenarios**:
1. **codes.count.feature** - Code counting operations
2. **codes.reserve.feature** - Code reservation logic
3. **codes.update.feature** - Code updates
4. **codes.upload.feature** - CSV upload and parsing
5. **infrastructure.feature** - Health checks and infrastructure
6. **supremes.feature** - Supreme user permissions

**Common Test Patterns**:
- Permission-based testing (authenticated vs supreme users)
- S3 integration testing with mocked buckets
- MongoDB collection validation
- Error response validation
- CSV parsing and sanitization (whitespace, mixed formats)
- Reserved code date retention

### Mocking Strategy

**Unit Tests**:
- Jest mocks for function spies (`jest.fn()`)
- `jest.clearAllMocks()` in beforeEach hooks

**Cucumber Tests**:
- AWS S3 mocking via test utilities
- MongoDB test collections
- Authentication/authorization mocking through custom hooks
- World object pattern for shared test context

## CI Configuration

Tests are integrated into GitLab CI pipeline:

### Unit Test Stage (`test`)
```yaml
eslint:
  - run eslint '-f table'

server-uts:
  - run server:test

lib-uts:
  - run lib:test
```

### Feature Test Stage (`features`)
- Runs in Docker containers
- Uses docker-compose for service orchestration
- Generates HTML reports in `reports/` directory
- Tests tagged with `@verifyAfter` run separately
- Artifacts retained for 8 hours
- Retry enabled (1 attempt)

### Post-Deployment Testing

Feature tests run after deployment to each environment:

**Dev Environment** (`dev post deploy`):
- Full Cucumber feature suite
- Tests against deployed dev service
- Validates dev environment configuration

**Preprod Environment** (`preprod post deploy`):
- Full Cucumber feature suite
- Tests against deployed preprod service
- Includes monoql integration tests

**No Production Feature Tests**:
- Production deployments do not run automated tests
- Manual verification required

## Test Data Management

- **Inputs**: Stored in `features/lib/inputs/`
- **Expected Results**: Stored in `features/lib/results/`
- **Test Campaigns**: Use dedicated test campaign IDs
- **S3 Files**: Test CSV files uploaded to scoring bucket during tests
- **MongoDB**: Test documents inserted into codes collection

## Coverage Configuration

No explicit coverage tooling configured in package.json. Coverage metrics would need to be gathered manually or added to the Jest configuration.

## Test Execution Environment

- **Docker Image**: `tmhub.io/verifiedfan/docker-builder:xenial-node12-latest`
- **Node Version**: 12.14 (Alpine Linux)
- **Required Services**: MongoDB, S3 (via AWS)
- **Tracing**: LightStep tracing available during tests
