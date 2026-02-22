# Testing Strategy - admin-ui

## Overview

The admin-ui repository follows a multi-layered testing approach that combines unit testing with Jest and end-to-end testing using Cucumber/Nightwatch. This strategy provides both rapid feedback during development through unit tests and comprehensive validation of user workflows through behavior-driven feature tests.

## Test Organization

| Location | Type | Count | Description |
|----------|------|-------|-------------|
| `frontend/src/**/*.spec.js` | Unit tests | 5 | Jest-based unit tests for React components and Redux logic |
| `frontend/src/**/*.test.js` | Unit tests | 5 | Jest-based unit tests for utility functions and sagas |
| `features/scenarios/**/*.feature` | BDD E2E tests | 14 | Cucumber feature files organized by domain |
| `features/step_definitions/**/*.js` | Step definitions | 22 | Nightwatch-based Cucumber step implementations |

### Feature Test Organization

Feature tests are organized into domain-specific directories:

- **campaign/** - Campaign editor functionality (3 features)
- **campaignModal/** - Campaign modal interactions (2 features)
- **distribution/** - Email/SMS notifications and wave preparation (3 features)
- **files/** - File uploaders and exporters (4 features)
- **infrastructure/** - Infrastructure-related tests (1 feature)
- **misc/** - Landing page and miscellaneous (1 feature)

## Frameworks Used

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| Jest | Unit testing | `jest.config.js` |
| Babel Jest | Transform ES6+ and JSX | `babel-jest` |
| Nightwatch | Browser automation | `features/nightwatch.conf.js` |
| Cucumber | BDD/E2E testing | Integrated with Nightwatch |
| jsdom | DOM environment for unit tests | Jest test environment |

## Running Tests

### Unit Tests

```bash
# Run all Jest unit tests
npx jest

# Run Jest with coverage
npx jest --coverage

# Run specific test file
npx jest frontend/src/selectors/campaignContent.spec.js

# Run in watch mode
npx jest --watch
```

### Feature Tests (E2E)

```bash
# Run all feature tests
npx run features:all --headless --launchReport

# Run specific feature group
npx run features:group campaign --headless --launchReport
npx run features:group distribution --headless --launchReport

# Run by tags
npx run features:tags @campaign-editor --headless --launchReport

# Available feature groups:
# - campaign
# - campaignModal
# - distribution
# - files
# - misc
# - infrastructure
```

## Test Patterns

### Unit Tests

**Testing Redux Selectors**

Unit tests for Redux selectors verify state transformation logic:

```javascript
// Example from campaignContent.spec.js
import { getEditorLocale } from './campaignContent';

describe('getEditorLocale', () => {
  it('returns the explicitly set editorLocale', () => {
    const state = createMockState({ editorLocale: 'de_AT' });
    expect(getEditorLocale(state)).toBe('de_AT');
  });
});
```

**Testing Utility Functions**

Utility tests focus on data transformation and normalization:

```javascript
// Example from campaign.test.js
describe('sanitizeLinkedAttributes', () => {
  it('removes linkableAttributes if array is empty', () => {
    const result = sanitizeLinkedAttributes({
      ...testCampaign,
      options: { linkableAttributes: [] }
    });
    expect(result.options.linkableAttributes).toBeUndefined();
  });
});
```

### BDD/Feature Tests

**Cucumber Feature Structure**

Features follow the Given-When-Then pattern:

```gherkin
@campaign-editor
Feature: Campaign Editor

  Background:
    Given I navigate to the login page
    And I login to the app
    And I create a registration campaign

  Scenario: Verify the artist is loaded by default
    Then I expect that the artist is in the tinyMCE
```

**Step Definitions**

Step definitions are organized by page/feature area:
- `campaignForm.js` - Campaign form interactions
- `campaignModal.js` - Modal operations
- `uploaders.js` - File upload scenarios
- `smsNotificationsPage.js` - SMS notification features
- `wavePrep.js` - Wave preparation flows

### Mocking Strategy

**Jest Mocking**

The codebase uses Jest's mock system for dependencies:

```javascript
// Mock external modules
jest.mock('shared/utils/campaignPageUtils', () => ({
  SIGNUP: 'signup',
  CONFIRMATION: 'confirmation'
}));

// Mock functions with behavior
jest.mock('@verifiedfan/locale', () => ({
  getFallbackLocale: jest.fn(locale => locale.split('_')[0])
}));
```

**Feature Test Mocking**

Feature tests run against live environments (dev/qa/testing) and do not use mocks. They test full integration paths.

## CI Configuration

### GitLab CI Pipeline

Tests are executed in the following CI stages:

**Test Stage**
```yaml
eslint:
  stage: test
  script:
    - npx run eslint '-f table'

jest test:
  stage: test
  script:
    - npx jest
```

**Features Stage**

Feature tests run in parallel by group after deployment to testing environment:

```yaml
features campaign:
  stage: features
  variables:
    featureGroup: campaign
  script:
    - npx run features:group "${featureGroup}" --headless --launchReport
  retry: 2
```

**CI Test Execution Flow**

1. **install** - Install dependencies with yarn
2. **test** - Run eslint and jest in parallel
3. **bundle** - Build production assets
4. **dockerize** - Create Docker image
5. **qa environments** - Deploy testing environment
6. **features** - Run Cucumber tests against deployed environment
7. **features breakdown** - Destroy testing environment

### CI-Specific Configuration

- Retry count: 2 attempts for feature tests
- Browser: Chrome in headless mode
- Test environment URL: `admin-tests-${CI_COMMIT_REF_NAME}.vf.nonprod9.us-east-1.tktm.io`
- Artifacts: Feature test reports saved to `features/reports` (1 day retention)

## Test Environment Configuration

**Jest Configuration**

- Module mapper for path aliases (actions, components, selectors, etc.)
- Transform: babel-jest for JS/JSX, jest-transform-yaml for YAML
- Test environment: jsdom (simulated browser environment)
- Coverage collection from `src/**/*.{js,jsx}`

**Nightwatch/Cucumber Configuration**

- Browser: Chrome with headless support
- WebDriver: ChromeDriver on port 9515
- Launch URL: Configurable via `titan.service.selfUrl`
- Page objects: Defined in `features/pageObjects/`
- Globals: Custom test utilities in `features/globals/globals.js`

## Coverage Requirements

No explicit coverage thresholds are enforced in CI, but coverage can be collected locally:

```bash
npx jest --coverage
```

Coverage is collected from all source files in `src/` directories.
