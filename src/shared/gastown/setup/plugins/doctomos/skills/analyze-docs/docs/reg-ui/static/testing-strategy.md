# Testing Strategy - reg-ui

## Overview

reg-ui uses **Jest** as the primary testing framework with **jsdom** environment for component and unit testing. The test suite focuses on utility functions, campaign transformation logic, logging, and React hooks, following functional programming principles consistent with the codebase's ESLint rules. Tests are co-located with their source files using the `.spec.ts` naming convention.

## Test Organization

| Location | Type | Count | Description |
|----------|------|-------|-------------|
| `lib/utils/**/*.spec.ts` | Unit tests | 14 | Pure utility functions (distance calculation, template replacement, campaign transformation) |
| `components/**/*.spec.ts` | Component tests | 2 | React component and hook tests (SignupForm state, TermsOfUse links) |
| `lib/logs/**/*.spec.ts` | Unit tests | 1 | Client-side logging functionality |
| `app/api/**/*.spec.ts` | API route tests | 1 | Next.js API route handlers (log endpoint) |
| `shared/**/*.spec.ts` | Shared tests | 1 | Cross-platform utilities (date formatting) |
| **Total** | | **21** | |

### Test Distribution by Feature Area

- **Campaign Transformation** (9 tests) - Locale handling, content normalization, redirects, URL generation
- **Utilities** (6 tests) - Distance calculation, market partitioning, progress calculation, template replacement, accent detection
- **Logging** (3 tests) - Client logger, console logger, error handler, API route
- **Components/Hooks** (2 tests) - Form validation, LNAA opt-in logic, Terms of Use link generation
- **Shared** (1 test) - Internationalized date formatting

## Frameworks Used

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| **Jest** | Test runner and assertion library | `jest.config.js` |
| **@testing-library/react** | React component and hook testing | Used in component tests |
| **@testing-library/jest-dom** | Custom DOM matchers | Imported in `jest.setup.ts` |
| **jest-transform-yaml** | YAML file transformation | Configured in `jest.config.js` |

## Running Tests

### Basic Commands

```bash
# Run all tests with coverage
npm test

# Run specific test file
npx jest <filename>

# Run tests in watch mode
npx jest --watch

# Run tests for changed files only
npx jest --onlyChanged
```

### CI/CD Integration

Tests run automatically in GitLab CI pipeline (`.gitlab-ci.yml`):

```yaml
test:
  stage: verify
  script:
    - npm run test
```

- **Stage**: `verify` (runs after `install`)
- **Coverage**: Automatically collected to `coverage/` directory
- **Blocking**: Test failures prevent progression to dockerization stage

## Test Patterns

### Unit Tests

**Pattern**: Tests for pure utility functions follow a straightforward arrange-act-assert pattern.

**Example**: Distance Calculation (`lib/utils/calculateDistance.spec.ts`)

```typescript
import calculateDistance, { LatitudeLongitude } from './calculateDistance';

describe('CalculateDistance', () => {
  const startingPoint: LatitudeLongitude = [0, 0];

  it('calculate distance with the same point (0)', () => {
    expect(calculateDistance(startingPoint, [0, 0])).toEqual(0);
  });

  it('calculate distance [0, 0] to [3, 4] (5)', () => {
    expect(calculateDistance(startingPoint, [3, 4])).toEqual(5);
  });
});
```

### Component/Hook Tests

**Pattern**: React hooks are tested using `@testing-library/react`'s `renderHook` utility with comprehensive mocking of dependencies.

**Example**: Form Validation Hook (`components/SignupForm/useSignupFormState.spec.ts`)

```typescript
import { renderHook } from '@testing-library/react';
import { useIsFormValid } from './useSignupFormState';

jest.mock('lib/store');
jest.mock('hooks/useGetEntryData');

describe('useIsFormValid', () => {
  it('should return true when LNAA required and checked', () => {
    mockStoreUse({ ...mockForm, lnaaOptIn: true });
    Mocks.useFormHasLNMarket.mockReturnValue(true);
    Mocks.useGetLNAAProperties.mockReturnValue({ isLNAARequired: true });

    expect(renderHook(() => useIsFormValid()).result.current).toBe(true);
  });
});
```

### API Route Tests

**Pattern**: Next.js API routes are tested by mocking the global `Response` object and directly invoking route handlers.

**Example**: Log API Route (`app/api/log/route.spec.ts`)

```typescript
describe('POST handler', () => {
  it('should return 200 for valid request body', async () => {
    const req = {
      json: async () => ({
        context: 'valid context',
        level: 'info',
        description: 'valid description'
      })
    };

    const response = await POST(req as NextRequest);
    expect(response.status).toBe(200);
  });
});
```

### Campaign Transformation Tests

**Pattern**: Complex transformation logic uses test data files and validates deep object transformations.

**Example**: Content Normalization (`lib/utils/campaign/transform/normalizeContent/normalizeContent.spec.ts`)

```typescript
import { contentCustomCA, expectedContentCustomCA } from './testData';
import normalizeContent from '.';

describe('normalize content', () => {
  it('normalizes content with custom en-CA body and FAQ', async () => {
    const result = normalizeContent(contentCustomCA, localeMapCA);
    expect(result).toEqual(expectedContentCustomCA);
  });
});
```

## Mocking Strategy

### External Dependencies

Tests mock external dependencies to ensure isolation:

- **Zustand Store** (`lib/store`) - Mocked in component/hook tests
- **Custom Hooks** - Mocked when testing components that depend on them
- **Next.js Modules** - Server components and request objects mocked as needed
- **Logger** - Mocked to prevent actual logging during tests

### next-intl (Internationalization)

Global mock configured in `jest.setup.ts`:

```typescript
jest.mock('next-intl', () => ({
  useTranslations: namespace => key => messages[namespace][key]
}));
```

### ESLint Accommodations

Tests include ESLint rule overrides where necessary (e.g., `fp/no-class`, `fp/no-mutation`) since mocking and test setup sometimes require imperative patterns.

## Configuration

### jest.config.js

```javascript
{
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  transform: {
    '\\.ya?ml$': 'jest-transform-yaml'
  },
  moduleFileExtensions: ['yaml', 'yml', 'ts', 'tsx', 'js', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^app/(.*)': '<rootDir>/app/$1',
    '^lib/(.*)': '<rootDir>/lib/$1',
    '^components/(.*)': '<rootDir>/components/$1',
    // ... additional path aliases
  },
  transformIgnorePatterns: ['node_modules/(?!(@react-hook)/)']
}
```

**Key Configuration Points**:

- **jsdom environment**: Required for React component testing
- **YAML transformation**: Enables importing config YAML files in tests
- **Path aliases**: Matches TypeScript path mappings for imports
- **Transform ignore patterns**: Allows ESM modules like `@react-hook` to be transformed
- **Setup file**: Configures jest-dom and next-intl mocks globally

### jest.setup.ts

```typescript
import '@testing-library/jest-dom';
import messages from './messages/en_US.json';

jest.mock('next-intl', () => ({
  useTranslations: namespace => key => messages[namespace][key]
}));
```

## Coverage Reporting

### Output Formats

Jest generates multiple coverage report formats:

- **coverage-final.json** - Raw coverage data
- **lcov.info** - LCOV format for CI/CD tooling
- **clover.xml** - Clover format
- **lcov-report/** - HTML report for local viewing

### Viewing Coverage

```bash
# Generate coverage report
npm test

# View HTML report
open coverage/lcov-report/index.html
```

## Best Practices

### Test Naming

- Use descriptive test names that explain the scenario and expected outcome
- Follow pattern: `"should [expected behavior] when [condition]"`
- Example: `"should return false when LNAA required and not checked"`

### Test Structure

- **Arrange**: Set up test data and mocks
- **Act**: Execute the function/hook under test
- **Assert**: Verify expected outcomes

### Pure Functions

- Prioritize testing pure utility functions over complex components
- Pure functions are easier to test and align with functional programming principles

### Co-location

- Tests live alongside the code they test (`.spec.ts` files next to source files)
- Makes tests easy to find and maintain

### Mocking Depth

- Mock at module boundaries, not internal implementation details
- Use `jest.mock()` for entire modules rather than partial mocks when possible

## Testing Gaps

See **testing-coverage.md** for identified gaps in test coverage.
