# Testing Strategy - user-service

## Overview

The user-service employs a dual-testing strategy combining unit tests (Jest) and end-to-end tests (Cucumber). Unit tests validate individual functions and modules, while Cucumber feature tests verify complete user workflows and API behaviors in a containerized environment.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| app/**/*.spec.js | Unit tests (App) | 4 |
| lib/**/*.spec.js | Unit tests (Lib) | 4 |
| features/scenarios/*.feature | Cucumber E2E | 17 |
| features/step_definitions/*.js | Cucumber Steps | 13 |

## Frameworks Used

| Framework | Version | Purpose |
|-----------|---------|---------|
| Jest | 30.0.4 | Unit testing framework |
| Cucumber | 6.0.5 | BDD-style E2E testing |
| @verifiedfan/cucumber-features | 1.2.0 | Shared step definitions |
| @verifiedfan/test-utils | 3.2.0 | Testing utilities |
| Chai | 4.1.2 | Assertion library |

## Running Tests

### Unit Tests

```bash
# Run all server tests (app directory)
npx run server:test

# Run all library tests (lib directory)
npx run lib:test

# Run tests with Jest directly
yarn jest app          # Server tests only
yarn jest lib          # Library tests only
yarn jest              # All unit tests
```

### E2E/Feature Tests

```bash
# Run all features (local environment)
npx run features

# Run specific scenario by name
npx run features:scenario "scenario name"

# Run features by tags
npx run features:tags "@contact-sharing"

# Generate HTML report from existing results
npx run features:generateReport
```

### CI Environment

```bash
# Docker-based feature tests (used in CI)
npx run docker:features reports/all
npx run docker:features reports/verifyAfter "--tags @verifyAfter"

# Deployed environment tests
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'
```

## Test Patterns

### Unit Tests

**Location**: Co-located with source code (e.g., `wallet.js` → `wallet.spec.js`)

**Structure**:
- Use Jest's `describe` blocks for grouping related tests
- Use `test.each` for parameterized/data-driven tests
- Mock external dependencies with `jest.fn()`
- Clear mocks between tests with `jest.clearAllMocks()`

**Example Pattern**:
```javascript
describe('Module Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('functionName', () => {
    it('should do something specific', () => {
      const result = functionName(input);
      expect(result).toEqual(expected);
    });
  });
});
```

### E2E/Feature Tests

**Location**: `features/scenarios/*.feature`

**Structure**:
- Gherkin syntax (Given/When/Then)
- Organized by feature area (authentication, contacts, lookups, permissions)
- Use tags for categorization (`@contact-sharing`, `@verifyAfter`, `@me`)
- Step definitions in `features/step_definitions/`

**Key Feature Areas**:
- Authentication (TM credentials, worker auth, JWT)
- User management (CRUD operations, lookups)
- Contacts (email/phone sharing)
- Wallet integration
- Linked accounts (social login)
- Permissions and access control

**Example Pattern**:
```gherkin
@tag-name
Feature: Feature Name

  Scenario: Descriptive scenario name
    Given I have a precondition
    When I perform an action
    Then I expect a result
```

### Mocking Strategy

**Unit Tests**:
- Use `jest.fn()` for function mocks
- Use `jest.mock()` for module mocks
- Avoid mocking internal implementation details

**E2E Tests**:
- Use real MongoDB for data persistence
- Run in Docker Compose with all dependencies
- Use `@verifiedfan/cucumber-features` for shared step definitions
- Test against real service endpoints

## Test Data Management

**E2E Tests**:
- Tests use dynamic user creation (`I insert a new user`, `I have a new ticketmaster user`)
- MongoDB data is managed through step definitions
- Each test scenario is independent and isolated
- Cleanup handled by test framework

## CI Configuration

### Pipeline Stages

The GitLab CI pipeline includes three test stages:

**1. Test Stage** (fast feedback):
- `eslint`: Code linting with ESLint
- `yaml lint`: YAML configuration validation
- `server-uts`: Server unit tests (`npx run server:test`)
- `lib-uts`: Library unit tests (`npx run lib:test`)

**2. Features Stage** (Docker-based E2E):
- Runs after bundle and dockerize stages
- Pulls Docker images from ECR
- Executes: `npx run docker:compose pull`
- Runs all features: `npx run docker:features reports/all`
- Runs verify-after features: `npx run docker:features reports/verifyAfter "--tags @verifyAfter"`
- Retries once on failure
- Generates HTML reports
- Artifacts: `reports/`, `docker-logs.txt` (8h expiry)

**3. Environment-Specific Tests** (post-deploy):
- **Dev**: Runs after dev deployment
- **Preprod**: Runs after preprod deployment
- Tests run against deployed services
- Command: `DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'`
- Reports stored for 1 day

### Test Execution Flow

```
[Code Push]
    ↓
[Install Dependencies] → yarn
    ↓
[Test Stage]
    ├─ ESLint
    ├─ YAML Lint
    ├─ Server Unit Tests
    └─ Library Unit Tests
    ↓
[Bundle] → Build application
    ↓
[Dockerize] → Build and push Docker images
    ↓
[Features Stage] → Docker-based E2E tests
    ↓
[Deploy Dev] → dev1 environment
    ↓
[Dev Features] → Test deployed dev service
    ↓
[Deploy Preprod] → preprod1 environment
    ↓
[Preprod Features] → Test deployed preprod service
    ↓
[Production Kick-off] → Manual approval
    ↓
[Production Deploy] → prod1, prod1w environments
```

### Failure Handling

- Unit tests must pass for pipeline to continue
- Feature tests retry once on failure
- Deployed environment tests retry once
- Failed test artifacts preserved for debugging (8h-1 day)

## Test Configuration Files

**Cucumber Configuration**:
- `features/cucumberSetup.js`: Cucumber Before hooks and initialization
- `build/features.js`: Feature test runner and HTML report generation
- Uses `@babel/register` for ES6+ support

**Jest Configuration**:
- Configured through runjs scripts in `runfile.js`
- Runs tests in `app/` and `lib/` directories separately
- No explicit jest.config.js file (uses defaults)

**Docker Test Environment**:
- `features/Dockerfile`: Docker image for running Cucumber tests
- Includes all dependencies and test setup
- Isolated from host environment

## Reporting

**Unit Tests**:
- Console output via Jest
- Exit code indicates pass/fail

**Feature Tests**:
- Cucumber Pretty formatter for console output
- JSON output: `reports/cucumber.json`
- HTML reports: `reports/index.html` (generated via cucumber-html-reporter)
- Bootstrap-themed HTML with:
  - Test environment metadata
  - Scenario-level reporting
  - Pass/fail statistics
  - Execution timestamps
  - Can auto-launch in browser

**CI Artifacts**:
- Feature test reports preserved for 8 hours
- Docker logs captured on failure
- Environment test reports preserved for 1 day

## Test Isolation

**Unit Tests**:
- Each test file is independent
- Mocks cleared between tests
- No shared state between test suites

**Feature Tests**:
- Each scenario creates its own test data
- MongoDB collections used for isolation
- Step definitions handle cleanup
- Tests can run in parallel (when properly isolated)

## Known Testing Practices

**Unit Test Subjects**:
- Data normalizers (wallet, contacts)
- Service utilities (URL parsing, system ID parsing)
- Middleware validators
- Configuration loading
- Feature flags (alphaCodes)

**Feature Test Coverage**:
- Authentication flows (TM, OAuth, worker)
- User CRUD operations
- Contact management (email/phone sharing)
- User lookups (by ID, email, TM ID, global user ID)
- Wallet integration
- Linked accounts (Facebook, Google, Tumblr, Twitter)
- Permission systems
- Infrastructure health checks

**Tags Used**:
- `@me`: User profile operations
- `@contact-sharing`: Contact sharing features
- `@verifyAfter`: Tests that verify system state after operations
- `@supreme`: Admin/elevated permission tests
