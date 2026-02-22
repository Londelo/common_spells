# Testing Strategy - campaign-service

## Overview

The campaign-service uses a **dual testing approach** combining unit tests with Jest and comprehensive BDD integration tests with Cucumber. Unit tests are embedded alongside source code for quick validation, while Cucumber features provide end-to-end testing of the complete API.

## Test Organization

| Location | Type | Count | Purpose |
|----------|------|-------|---------|
| `app/**/*.spec.js` | Unit tests (server) | Variable | Tests manager, router, and datastore layers |
| `lib/**/*.spec.js` | Unit tests (library) | Variable | Tests utility libraries and shared functions |
| `features/scenarios/` | Cucumber BDD | 29 features | End-to-end integration tests |
| `features/step_definitions/` | Step definitions | Multiple | Reusable test steps for Cucumber |

### Feature File Structure

```
features/
├── scenarios/
│   ├── campaign/
│   │   ├── create/        (Campaign creation tests)
│   │   ├── read/          (Campaign retrieval tests)
│   │   ├── update/        (Campaign updates & gates)
│   │   └── extensions/    (Campaign extension features)
│   ├── markets/           (Market management)
│   ├── search/            (Artist & venue search)
│   ├── events/            (Event integration)
│   ├── contacts/          (Contact management)
│   ├── promoters/         (Promoter features)
│   └── misc/              (Auth, FAQs, terms, infrastructure)
├── step_definitions/
│   ├── campaign/          (Campaign-specific steps)
│   └── general/           (Shared test steps)
├── lib/                   (Test utilities)
├── hooks/                 (Before/After hooks)
├── schemas/               (JSON schemas for validation)
└── examples/              (Sample test data)
```

## Frameworks Used

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| Jest | Unit testing | `package.json` (jest.testEnvironment: "node") |
| Cucumber | BDD/E2E | `build/features.js`, `cucumberSetup.js` |
| Chai | Assertions | Used with both Jest and Cucumber |
| chai-json-schema-ajv | Schema validation | JSON schema validation in features |

## Running Tests

### Local Development

```bash
# All unit tests (server + lib)
run server:test       # Unit tests for app/ directory
run lib:test          # Unit tests for lib/ directory

# Specific test file
yarn jest -- <path>

# With additional Jest options
run server:test '--watch'
run lib:test '--verbose'

# Cucumber BDD tests
run features:test                    # All feature tests
run features:group <group>           # Specific group (e.g., campaign/create)
run features:scenario '<name>'       # Specific scenario by name
run features:tags '<tags>'           # By tags (e.g., '@campaign-v2')

# Generate HTML report
run features:generateReport
```

### CI Pipeline Tests

```bash
# Linting
npx run eslint '-f table'           # ESLint validation (pre-push hook)
yamllint -c yamllint.config.yml .   # YAML configuration validation

# Unit tests (runs in parallel)
npx run server:test                 # Server layer tests
npx run lib:test                    # Library tests

# Integration tests (runs after deployment)
npx run features ' --fail-fast'     # All features
npx run docker:features <group>     # Docker-based feature tests
```

## Test Patterns

### Unit Tests (Jest)

**Location**: Co-located with source code (`*.spec.js` alongside implementation files)

**Structure**:
- Functional style following FP principles (no classes)
- Uses Ramda for data transformations
- Immutable data patterns
- Mock external dependencies (MongoDB, Redis, external APIs)

**Example Pattern**:
```javascript
// app/managers/campaigns/validators.spec.js
import { throwIfInvalidPermissions } from './validators';

describe('throwIfInvalidPermissions', () => {
  it('should throw error when user lacks permission', () => {
    const ctx = { jwt: { roles: ['user'] } };
    expect(() => throwIfInvalidPermissions(ctx))
      .toThrow('INSUFFICIENT_PERMISSIONS');
  });
});
```

### Integration Tests (Cucumber)

**Location**: `features/scenarios/` organized by feature domain

**Structure**:
- Gherkin syntax (Given/When/Then)
- Tag-based organization for selective test runs
- Schema validation using JSON schemas
- Reusable step definitions
- Full stack testing (API → MongoDB → Redis → External services)

**Example Pattern**:
```gherkin
@campaign-v2
Scenario: Create v2 campaign
  Given I create 1 OPEN v2 campaign
  Then the result matches the campaignV2 schema
```

**Common Tags**:
- `@campaign-v2` - V2 campaign features
- `@campaign-create` - Campaign creation tests
- `@campaign-cache` - Redis caching tests
- `@campaign-pipeline-s3` - S3/data pipeline integration
- `@verifyAfter` - Tests that verify eventual consistency

### Mocking Strategy

**Unit Tests**:
- Mock MongoDB operations at datastore layer
- Mock Redis for caching tests
- Mock external APIs (Discovery API, Fastly, AWS services)
- Use dependency injection via manager context

**Integration Tests**:
- Use Docker containers for real MongoDB and Redis
- Mock external services only (Discovery API via test stubs)
- Test with actual network calls to service

### Test Data Management

**Inputs**: `features/examples/` contains sample campaign data

**Schemas**: `features/schemas/` contains JSON schemas for validation

**Test Fixtures**: Generated dynamically in step definitions with factory functions

**Cleanup**: After hooks handle test data cleanup to maintain isolation

## CI Configuration

### GitLab CI Pipeline Stages

**Test Stage** (runs on all branches):
1. **ESLint** - Code quality and FP compliance
2. **YAML Lint** - Configuration file validation
3. **Server Unit Tests** - App layer tests
4. **Library Unit Tests** - Lib layer tests

**Features Stage** (runs after dockerization):
- Parallel execution by feature group:
  - `campaign/create`
  - `campaign/update`
  - `campaign/read`
  - `campaign/extensions`
  - `markets`
  - `search`
  - `misc`
  - `events`
  - `contacts`
  - `promoters`

**Post-Deploy Stage** (runs after environment deployment):
- Smoke tests against deployed environment
- `@verifyAfter` tagged scenarios for eventual consistency

### Docker-Based Feature Tests

Features run in isolated Docker environment with:
- MongoDB container for data persistence
- Redis container for caching
- Service container running the application
- Test container executing Cucumber

Configuration: `docker-compose.yml`, `Dockerfile` in features directory

### Coverage Requirements

No explicit coverage percentage enforced, but:
- All manager functions should have unit tests
- All API endpoints should have feature tests
- All error cases should be tested (both unit and integration)

## Test Isolation

**Unit Tests**:
- Pure functions tested independently
- Mocked dependencies via function parameters
- No shared state between tests

**Integration Tests**:
- Each scenario generates unique test data
- Cleanup hooks remove test data after scenarios
- Retry strategy (2 retries) for flaky external dependencies

## Performance Testing

Not explicitly configured in this service. Performance testing handled at system level.

## Debugging Tests

```bash
# Run single test file with debug output
DEBUG='*' yarn jest -- app/managers/campaigns/index.spec.js

# Debug Cucumber features
DEBUG='titan:*' run features:scenario 'Create v2 campaign'

# Debug specific feature group
DEBUG='titan:lib:config' DEBUG_DEPTH=8 run features:group campaign/create
```
