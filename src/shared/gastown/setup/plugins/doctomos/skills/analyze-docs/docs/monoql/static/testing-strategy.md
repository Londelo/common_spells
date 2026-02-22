# Testing Strategy - monoql

## Overview

The monoql repository uses a dual testing approach combining unit tests with Jest for code-level testing and Cucumber for BDD-style end-to-end feature testing. The testing strategy emphasizes comprehensive coverage of GraphQL resolvers, utility functions, and complete user-facing features through behavioral scenarios.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| app/**/*.spec.js | Unit tests (resolvers) | 4 |
| lib/**/*.spec.js | Unit tests (lib utilities) | 6 |
| features/scenarios/*.feature | Cucumber BDD/E2E | 22 |
| features/step_definitions/*.js | Cucumber step definitions | ~15 |
| features/lib/**/*.js | Cucumber test utilities | ~30 |

## Frameworks Used

| Framework | Purpose | Version |
|-----------|---------|---------|
| Jest | Unit testing | ^21.2.1 |
| Cucumber | BDD/E2E testing | ^6.0.5 |
| Chai | Assertions | ^4.1.2 |
| @verifiedfan/cucumber-features | Cucumber test utilities | ^1.0.4 |
| @verifiedfan/test-utils | Test utilities | ^3.8.1 |

## Running Tests

```bash
# Unit tests - server/app code
npx run server:test

# Unit tests - library code
npx run lib:test

# Specific test pattern
yarn jest lib --testPathPattern=config

# E2E/BDD tests (Cucumber features)
npx run features

# E2E tests with fail-fast
DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'

# Linting
npx run eslint

# Docker-based E2E tests
npx run docker:features reports/all
npx run docker:features reports/verifyAfter "--tags @verifyAfter"
```

## Test Patterns

### Unit Tests

Unit tests are co-located with source files using the `.spec.js` naming convention. Jest is configured via Babel to transpile modern JavaScript features.

**Example structure:**
```
app/graphql/schema/resolvers/Identity.spec.js
lib/config.spec.js
lib/featureUtils.spec.js
```

**Common patterns:**
- Testing GraphQL resolvers for correct URL selection and data transformation
- Testing utility functions with various input scenarios
- Testing configuration loading from environment-specific YAML files
- Using async/await patterns for asynchronous operations

**Sample test (from Identity.spec.js):**
- Tests identity URL selection based on different host configurations
- Validates URL mapping for different domains (TM, LiveNation, Canada, Mexico)
- Ensures fallback to default URL for unknown hosts

### Integration Tests

Integration tests are not explicitly separated but are embedded within the unit test structure, particularly for configuration validation.

**Configuration testing pattern (config.spec.js):**
- Dynamically loads all environment config files
- Validates each environment configuration can be loaded successfully
- Excludes certain configs like 'build' and 'default' from testing

### BDD/E2E Tests (Cucumber)

Comprehensive feature tests cover the entire GraphQL API surface through behavioral scenarios.

**Feature coverage:**
- Campaign management (get, list, update)
- Authentication and eligibility
- Waves and exports
- Contact management
- File uploads (images, files)
- Artist and venue search
- Metrics and statistics
- Entry management
- Promoter operations
- Infrastructure health checks

**Tag-based organization:**
```
@fan - Fan-facing features
@anonymous - Anonymous user scenarios
@campaign-anonymous - Anonymous campaign access
@password-protected - Password-protected campaigns
@gated-campaign - Gated eligibility campaigns
@wallet-user - Wallet integration tests
@verifyAfter - Post-deployment verification
```

**Scenario structure:**
- Given: Setup context (authentication, campaign creation)
- When: Execute GraphQL operation
- Then: Validate response against schema and expected results

**Example scenario (from eligibility.feature):**
```gherkin
@non-gated-campaign @anonymous-eligible
Scenario: Anonymous is eligible for non gated campaign
  Given I have a new campaign with markets
  And I log out by clearing my jwt
  When I call the eligibility monoql operation with the newCampaignById input
  Then the path data.viewer.campaign.eligibility in the result matches the eligible result
```

### Mocking Strategy

- **GraphQL API mocking**: Uses @verifiedfan/cucumber-features for GraphQL query/mutation execution
- **Authentication**: JWT token generation and parsing utilities (`features/lib/jwt.js`)
- **External services**: Client mocks in `features/lib/clients/`
- **Data fixtures**: Template-based campaign and market creation (`features/templates/`)

### Test Data Management

- **Templates**: Pre-configured campaign templates (`newCampaign.js`, `newFanlistCampaignTemplate.js`, `newMarket.js`)
- **Inputs**: Reusable GraphQL input builders (`features/lib/inputs/`)
- **Results**: Expected result schemas (`features/lib/results/`)
- **Services**: Test service wrappers for campaign, entries, users (`features/lib/services/`)

## CI Configuration

Tests are executed in the GitLab CI pipeline across multiple stages:

### Test Stage (Parallel Execution)

**eslint** - Code linting
```yaml
stage: test
script: npx run eslint '-f table'
```

**yaml lint** - YAML configuration validation
```yaml
stage: test
image: portenez/yamllint
script: yamllint -c yamllint.config.yml .
```

**server-uts** - Server/app unit tests
```yaml
stage: test
script: npx run server:test
```

**lib-uts** - Library unit tests
```yaml
stage: test
script: npx run lib:test
```

### Features Stage (Docker-based)

**features** - Full E2E test suite
```yaml
stage: features
image: docker-builder:focal-node18-latest
script:
  - npx run docker:compose pull
  - npx run docker:features reports/all
  - npx run docker:features reports/verifyAfter "--tags @verifyAfter"
retry: 1
artifacts:
  - reports/
  - docker-logs.txt
```

### Post-Deploy Features (Environment-specific)

**dev features** - Run against dev environment
```yaml
stage: dev post deploy
variables: NODE_ENV=dev
script: DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'
```

**preprod features** - Run against preprod environment
```yaml
stage: preprod post deploy
variables: NODE_ENV=preprod
script: DEBUG='titan:lib:config' DEBUG_DEPTH=8 npx run features ' --fail-fast'
```

### Coverage Requirements

- No explicit coverage thresholds configured in Jest
- Pipeline does not enforce coverage gates
- Artifacts include test reports for analysis

## Docker Testing Environment

E2E tests run in a containerized environment using Docker Compose:

- **Image**: `tmhub.io/verifiedfan/docker-builder:focal-node18-latest`
- **Setup**: `npx run docker:compose pull` to prepare environment
- **Execution**: Tests run against containerized monoql service
- **Cleanup**: Automatic cleanup via `npx run docker:clean`
- **Logs**: Docker logs captured to `docker-logs.txt` for debugging

## Test Configuration Files

### Babel Configuration (.babelrc)
- Transpiles ES6+ code for Jest
- Plugins: transform-object-rest-spread, inline-import, async-functions
- Target: Current Node version

### Cucumber Configuration
- Setup: `features/cucumberSetup.js`
- World: Custom context in `features/hooks/world.js`
- Reporters: cucumber-pretty, cucumber-html-reporter
- Config: Environment-specific settings from `features/lib/config.js`

## Test Utilities and Helpers

### Custom Utilities (`features/lib/utils/`)
- **commons.js**: Object manipulation utilities (renameKeys, getValueAtPath, setPropPathToVal)
- **api.js**: API request helpers
- **create.js**: Test data creation utilities
- **errorResponses.js**: Error validation helpers

### Assertion Libraries
- **chai**: Base assertion library
- **chai-json-equal**: JSON comparison
- **chai-json-schema-ajv**: Schema validation (v3.0.0)
- **chai-match**: Pattern matching
- **chai-subset**: Partial object matching

### GraphQL Testing
- **features/lib/graphql/**: GraphQL query builders and selectors
- **features/lib/graphql/queries/**: Operation definitions
- **features/lib/graphql/selectors/**: Response path selectors
