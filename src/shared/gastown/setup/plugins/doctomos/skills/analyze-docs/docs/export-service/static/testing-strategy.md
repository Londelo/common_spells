# Testing Strategy - export-service

## Overview

The export-service employs a dual-layer testing approach combining unit tests for business logic and end-to-end BDD tests for integration scenarios. The testing strategy emphasizes data export correctness, file generation validation, and API contract testing across multiple export types (entries, scoring, code assignments, opt-ins, etc.).

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| app/**/*.spec.js | Unit tests | 9 |
| lib/**/*.spec.js | Unit tests | 6 |
| features/scenarios/ | Cucumber E2E | 15 |
| Total Test Files | Combined | 30 |

### Unit Test Coverage

**Export Managers** (`app/managers/exports/`)
- CSV file writing and segmentation
- Zip file creation for multi-file exports
- Promoter email opt-in data processing
- Reminder email data formatting and extraction
- Export deletion bucket key mapping

**Library Utilities** (`lib/`)
- Row formatters for various export types
- Configuration management
- Feature flag utilities
- Validation middleware

### E2E Test Coverage

**Export Types Tested**
- Entries export (standard user registration data)
- Scoring export (fanscore and fraud detection data)
- Code assignments (access code distribution)
- Artist opt-in (marketing consent - email)
- Artist SMS opt-in (marketing consent - SMS)
- LiveNation opt-in (promotional consent)
- Fanlist export
- Reminder email exports
- Auto-reminder email exports

**Integration Scenarios**
- Export scheduling and status tracking
- S3 upload verification
- CSV/ZIP file generation
- Permissions and authorization
- Data validation and formatting
- Multi-market support
- Verified entries filtering
- Waitlist management
- Supreme user handling

## Frameworks Used

| Framework | Purpose | Version |
|-----------|---------|---------|
| Jest | Unit testing | ^25.1.0 |
| Cucumber | BDD/E2E testing | ^6.0.5 |
| Chai | Assertions | ^4.1.2 |
| chai-json-schema-ajv | JSON schema validation | 3.0.0 |

### Supporting Test Libraries

- `@verifiedfan/test-utils` (^3.8.1) - Custom test utilities for VerifiedFan platform
- `@verifiedfan/cucumber-features` (^1.4.1) - Shared Cucumber features and step definitions
- `cucumber-html-reporter` (^5.1.0) - HTML report generation
- `cucumber-pretty` (6.0.0) - Console output formatting
- `chai-json-equal`, `chai-match`, `chai-subset` - Extended assertion libraries
- `deep-equal-in-any-order` - Order-agnostic deep comparison

## Running Tests

### Unit Tests

```bash
# All unit tests
npm test

# Server unit tests only (app/)
npx run server:test

# Library unit tests only (lib/)
npx run lib:test

# With watch mode
yarn jest --watch

# Single test file
yarn jest path/to/file.spec.js
```

### E2E/Integration Tests (Cucumber)

```bash
# Run Cucumber features in Docker
npx run docker:features reports/all

# Run verification-tagged features
npx run docker:features reports/verifyAfter "--tags @verifyAfter"

# Run specific feature
npx run features ' --fail-fast'

# Environment-specific features
DEBUG='titan:lib:config' DEBUG_DEPTH=8 NODE_ENV=dev npx run features
```

### CI Pipeline Tests

Tests run automatically in GitLab CI across multiple stages:

1. **Test Stage** - Linting and unit tests
   - `eslint` - Code quality checks
   - `yaml lint` - YAML configuration validation
   - `server-uts` - Server unit tests
   - `lib-uts` - Library unit tests

2. **Features Stage** - E2E tests in Docker
   - Spins up containerized environment
   - Runs full Cucumber suite
   - Generates HTML reports
   - Artifacts: `reports/`, `docker-logs.txt`

3. **Environment Post-Deploy** - Smoke tests
   - Dev environment features
   - Preprod environment features
   - MonoQL integration features

## Test Patterns

### Unit Tests

**Module Mocking**
- Extensive use of Jest mocks for external dependencies
- File system operations mocked with `jest.mock('fs')`
- Database interactions isolated through mocking
- Stream-based processing tested with mock streams

```javascript
jest.mock('fs', () => ({
  createWriteStream: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));
```

**Data-Driven Testing**
- Row formatter tests use shared test data generators
- Multiple scenarios tested with same logic
- Test data factories for entries, codes, and campaigns

**Assertion Style**
- Jest matchers for equality and type checking
- Custom matchers for complex data structures
- Schema validation for JSON responses

### Integration Tests (Cucumber)

**Gherkin Feature Structure**
```gherkin
Feature: Create exports
  Background: Setup campaign and permissions
  Scenario Outline: Test multiple export types
    Examples: Different export formats
```

**Step Definitions Organization**
- Located in `features/step_definitions/`
- Reusable steps across multiple scenarios
- Schema validation for API responses
- S3 download and content verification

**Test Data Management**
- Dynamic entry creation (configurable counts)
- Opt-in type variations
- Market and event data fixtures
- Campaign customization (standard, fanclub)

**Verification Layers**
1. **Schema Validation** - API response structure
2. **Status Checking** - Export lifecycle states (PENDING → TRIGGERED → FINISHED)
3. **File Content** - CSV row counts and column headers
4. **Data Accuracy** - Field values match expected formats

### Mocking Strategy

**External Services**
- S3 operations mocked in unit tests, real in E2E
- MongoDB queries isolated in unit tests
- HTTP requests stubbed for external APIs

**File System**
- Write streams mocked for CSV generation tests
- Temporary file creation verified without actual I/O
- Cleanup operations tested for proper resource management

**Configuration**
- Environment variables controlled per test
- Feature flags toggled for conditional logic
- Campaign options customized for specific scenarios

## CI Configuration

### GitLab CI Pipeline

**Test Execution Flow**
1. **Install Stage** - Dependencies and ECR setup
2. **Test Stage** (Parallel)
   - ESLint code quality
   - YAML linting
   - Server unit tests
   - Library unit tests
3. **Bundle Stage** - Application bundling
4. **Dockerize Stage** - Container build
5. **Features Stage** - Cucumber E2E tests

**Test Artifacts**
- Reports preserved for 8 hours (features)
- Test results uploaded for review
- Docker logs captured on failure
- HTML reports generated via cucumber-html-reporter

**Environment Testing**
- Dev environment: Post-deploy smoke tests
- Preprod environment: Full feature suite
- Production: Pre-deploy database index verification

**Retry Policy**
- Feature tests retry once on failure
- Unit tests fail immediately (no retry)

## Test Configuration

### Jest Configuration (package.json)

```json
{
  "jest": {
    "testEnvironment": "node"
  }
}
```

### Cucumber Configuration

- Setup script: `features/cucumberSetup.js`
- Docker environment: `features/Dockerfile`
- Helper script: `features/wfc.sh` (wait for container)
- Test execution: `features/wfcAndRunFeatures.sh`

### Coverage Requirements

No explicit coverage thresholds configured in package.json, but the CI pipeline requires:
- All unit tests passing before deployment
- Critical path E2E tests passing for environment promotion
- Zero ESLint errors/warnings for code quality

## Key Testing Practices

1. **Isolation** - Unit tests mock all external dependencies
2. **Reusability** - Shared test utilities from `@verifiedfan` packages
3. **Scenarios** - Cucumber scenario outlines for testing multiple variations
4. **Validation** - JSON schema validation for API contracts
5. **Real Data** - E2E tests use actual MongoDB and S3 services
6. **Cleanup** - Proper teardown of test resources (files, database records)
7. **Debugging** - Debug flags available (`DEBUG='titan:lib:config'`)
