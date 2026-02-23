# Testing Strategy - entry-service

## Overview

The entry-service employs a comprehensive multi-layered testing approach combining unit tests with Jest and end-to-end behavioral tests using Cucumber/BDD. The testing strategy covers business logic validation, integration flows, and API contract verification across multiple deployment environments.

## Test Organization

| Location | Type | Count | Purpose |
|----------|------|-------|---------|
| app/**/*.spec.js | Unit tests | 25 | Business logic, data transformations, validators |
| lib/**/*.spec.js | Library tests | - | Shared utilities and middleware |
| tools/**/*.spec.js | Tool tests | - | CLI tools and scripts |
| features/scenarios/**/*.feature | Cucumber BDD | 25 | End-to-end API scenarios |

**Test File Distribution:**
- **Datastore layer**: 3 files (mxPhone, stats, utils)
- **Managers layer**: 15 files (entries, scoring logic, validators, normalizers)
- **Services layer**: 1 file (campaignDataStream)
- **Lib/middleware**: 2 files (config, validators)
- **Tools**: 3 files (attachCustomScore utilities)

## Frameworks Used

| Framework | Version | Purpose |
|-----------|---------|---------|
| Jest | ^25.1.0 | Unit testing runner and assertion library |
| Cucumber | ^6.0.5 | BDD/E2E feature tests with Gherkin syntax |
| Chai | ^4.1.2 | Assertion library (extended with plugins) |
| cucumber-html-reporter | ^5.1.0 | HTML test report generation |

**Chai Extensions:**
- `chai-json-schema-ajv` - JSON schema validation
- `chai-json-equal` - Deep JSON comparison
- `chai-match` - Pattern matching assertions
- `chai-subset` - Partial object matching

## Running Tests

### Unit Tests

```bash
# All unit tests (app + lib)
yarn jest

# Server-layer unit tests only
npx run server:test

# Library unit tests only
npx run lib:test

# Run specific test file
yarn jest path/to/file.spec.js

# Watch mode
yarn jest --watch
```

### Cucumber/BDD Tests

```bash
# All feature tests
npx run features

# Run specific feature scenario by name
npx run features:scenario "Create entry success"

# Run tests by tag
npx run features:tags "@entries-create"

# Generate HTML report from existing results
npx run features:generateReport
```

### CI Pipeline Tests

```bash
# Linting
npx run eslint '-f table'

# YAML validation
yamllint -c yamllint.config.yml .

# Unit tests are run via GitLab CI stages
```

## Test Patterns

### Unit Tests

**Structure:**
- Tests are co-located with source files using `.spec.js` extension
- Use Jest's `describe` blocks for logical grouping
- Use `it` blocks for individual test cases
- Mock external dependencies using `jest.fn()` and `jest.mock()`

**Example Pattern:**
```javascript
import { functionToTest } from './';

// Mock dependencies
const mockDependency = jest.fn();

const testContext = {
  datastore: { /* mock datastore */ },
  correlation: 'test-id'
};

afterEach(() => jest.clearAllMocks());

describe('functionToTest', () => {
  it('handles expected case', () => {
    mockDependency.mockReturnValue(expectedValue);
    const result = functionToTest(testContext, input);
    expect(result).toEqual(expectedOutput);
    expect(mockDependency).toHaveBeenCalledWith(expectedParams);
  });
});
```

**Common Assertions:**
- `expect(result).toEqual(expected)` - Deep equality
- `expect(mock).toHaveBeenCalledWith(params)` - Mock verification
- `expect(array).toContain(item)` - Array membership

### Cucumber/BDD Tests

**Structure:**
- Feature files use Gherkin syntax (Given/When/Then)
- Organized by domain area: entry (create/read/update/delete), scoring, stats, misc
- Tagged for selective execution (`@entries-create`, `@paysys`, `@linkedAccount`)
- Step definitions provided by `@verifiedfan/cucumber-features` package

**Example Pattern:**
```gherkin
@entries-create
Feature: Create entry
  As a user
  I want to be able to create an entry
  for a campaign

  @create-entry-success
  Scenario: Create entry success
    Given I am logged in
    And I create an open campaign
    When I submit an entry
    Then the result matches the entry schema
```

**Common Tags:**
- `@entries-create`, `@entries-read`, `@entries-update`, `@entries-delete` - Entry operations
- `@paysys` - PaySys/payment-related tests
- `@linkedAccount` - Linked account functionality
- `@verifyAfter` - Verification tests run separately

### Mocking Strategy

**Unit Tests:**
- **Datastore mocking**: Mock MongoDB operations with `jest.fn()` returning test data
- **External services**: Mock HTTP clients (request-promise-native) and AWS SDK
- **Manager context**: Provide minimal context objects with mocked dependencies
- **Date/time**: Use fixed timestamps for date-based logic testing

**Example:**
```javascript
const managerCtx = {
  datastore: {
    entries: {
      findScoringFieldsByCampaignIdAndPhoneNumbers: jest.fn()
    },
    scoring: {
      upsertScoring: jest.fn()
    }
  },
  correlation: 'test-id'
};
```

**Cucumber Tests:**
- Tests run against real service instances (local Docker or deployed environments)
- Use test data fixtures and cleanup hooks
- Mock external dependencies at the service boundary (campaign-service, payment services)

## CI Configuration

### GitLab CI Pipeline

**Test Stages:**
1. **Install** - `yarn` dependency installation with caching
2. **Test** - Parallel execution:
   - `eslint` - Code linting with table format
   - `yaml lint` - YAML file validation
   - `server-uts` - Server unit tests
   - `lib-uts` - Library unit tests
3. **Features** - Dockerized Cucumber tests (7 parallel jobs by feature group)
   - `features entryCreate`
   - `features entryRead`
   - `features entryUpdate`
   - `features entryDelete`
   - `features misc`
   - `features scoring`
   - `features stats`

**Post-Deploy Testing:**
- Dev environment: Full feature suite + monoql integration tests
- Preprod environment: Full feature suite + monoql integration tests
- Features run with `--fail-fast` and retry logic (up to 2 retries)

**Test Artifacts:**
- Unit test results: Not persisted (CI job logs only)
- Cucumber reports: HTML reports in `reports/` directory (expire in 8h-1week)
- Docker logs: Captured on failure for debugging

### Docker-based Feature Testing

```bash
# Pull built image
npx run docker:compose pull

# Run features in Docker container
npx run docker:features reports/all "entry/create"

# Verify-after tests
npx run docker:features reports/verifyAfter "" "--tags @verifyAfter"
```

## Test Data Management

**Unit Tests:**
- Inline test data in spec files
- Fixture constants for common scenarios (phone numbers, user records, campaign configs)

**Cucumber Tests:**
- Test data generated dynamically via step definitions
- Cleanup hooks ensure test isolation
- Some fixtures in `@verifiedfan/test-utils` package

## Environment-Specific Testing

| Environment | Unit Tests | Feature Tests | Integration Tests |
|-------------|-----------|---------------|-------------------|
| Local Dev | ✓ | ✓ (Docker) | - |
| CI/PR | ✓ | ✓ (Docker) | - |
| Dev | - | ✓ (Deployed) | ✓ (monoql) |
| Preprod | - | ✓ (Deployed) | ✓ (monoql) |
| Production | - | - | - |

**Environment Variables:**
- `NODE_ENV` - Controls target environment (dev/preprod/prod)
- `DEBUG` - Enables debug logging (`titan:lib:config`)
- Test-specific configs loaded from `@verifiedfan/configs`
