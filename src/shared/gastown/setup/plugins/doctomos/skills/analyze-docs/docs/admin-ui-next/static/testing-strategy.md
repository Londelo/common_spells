# Testing Strategy - admin-ui-next

## Overview

The admin-ui-next project has a minimal testing setup with basic unit tests using Jest. The repository contains 2 test files covering utility functions and helpers, representing a very limited testing footprint for a Next.js frontend application with 125+ TypeScript files.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| lib/index.spec.ts | Unit test (example) | 1 |
| components/EventsList/EventsListRow/helpers.spec.ts | Unit test (helpers) | 1 |
| **Total** | | **2** |

### Test Coverage by Area

- **lib/**: 1 basic example test
- **components/**: 1 helper function test covering validation logic
- **app/**: No tests
- **hooks/**: No tests
- **API routes/**: No tests
- **middleware**: No tests

## Frameworks Used

| Framework | Purpose | Version |
|-----------|---------|---------|
| Jest | Unit testing | 30.0.3 |
| @testing-library/react | React component testing | 16.3.0 |
| @testing-library/jest-dom | DOM matchers | 6.6.3 |
| jest-environment-jsdom | Browser simulation | 30.0.2 |
| jest-transform-yaml | YAML file transformation | 0.1.2 |

## Running Tests

```bash
# All tests
npm test

# Running tests directly with Jest
npx jest

# Watch mode (not configured)
npx jest --watch

# With coverage
npx jest --coverage
```

## Test Configuration

### Jest Setup (jest.config.js)

- **Test environment**: jsdom (browser simulation)
- **Coverage provider**: v8
- **Coverage collection**: Enabled by default
- **Coverage directory**: `./coverage`
- **Setup files**: `jest.setup.ts` (imports @testing-library/jest-dom)
- **Module name mapping**: Path aliases for app, lib, components, configs, public
- **Transform**: YAML files transformed via jest-transform-yaml
- **Module extensions**: yaml, yml, ts, tsx, js, jsx
- **Transform ignore patterns**: Configured to handle @react-hook ESM modules

### Setup File (jest.setup.ts)

The setup file imports `@testing-library/jest-dom` which provides custom matchers for DOM assertions:

```typescript
import '@testing-library/jest-dom';
```

This enables matchers like:
- `toBeInTheDocument()`
- `toHaveTextContent()`
- `toBeVisible()`
- `toBeDisabled()`

## Test Patterns

### Unit Tests

The existing unit tests follow these patterns:

#### 1. Basic Function Testing (lib/index.spec.ts)

Simple test verifying that a function returns expected output:

```typescript
describe('lib tests', () => {
  it('should return the example function string', () => {
    expect(exampleFunction()).toBe('This is an example function');
  });
});
```

#### 2. Helper Function Testing (components/EventsList/EventsListRow/helpers.spec.ts)

More comprehensive testing with:
- Multiple test suites using nested `describe` blocks
- Mock data creation using factory functions
- TypeScript type safety with `DeepPartial<T>` for mocks
- Edge case testing
- Validation logic testing

Example pattern:

```typescript
describe('getBadgeStatus', () => {
  const createMockMarket = (overrides: DeepPartial<MarketRes> = {}): MarketRes => {
    // Factory function for test data
  };

  describe('returns COMPLETE status', () => {
    it('when all required fields are present', () => {
      const market = createMockMarket();
      expect(getBadgeStatus(market)).toBe(MarketStatus.COMPLETE);
    });
  });

  describe('returns INCOMPLETE_ERROR status', () => {
    it('when venue is missing', () => {
      const market = createMockMarket({ event: { venue: {} } });
      expect(getBadgeStatus(market)).toBe(MarketStatus.INCOMPLETE_ERROR);
    });
  });
});
```

### Component Tests

No React component tests exist currently. The project has @testing-library/react installed but unused.

Typical patterns would include:
- Rendering components with test data
- Simulating user interactions
- Asserting on rendered output
- Testing hooks and state management

### Integration Tests

No integration tests exist.

### End-to-End Tests

No E2E tests exist.

### Mocking Strategy

Currently minimal. The existing tests use:
- Mock data factories for creating test objects
- No API mocking setup
- No module mocking examples
- No GraphQL mocking (despite Apollo Client being used)

## CI Configuration

### Pipeline Stage: verify

From `.gitlab-ci.yml`:

```yaml
test:
  extends:
    - .default_runner
    - .use_npm_cache
  stage: verify
  needs: ['install']
  before_script: *npm_ci
  script:
    - npm run test
```

**CI Test Execution:**
- Runs in the `verify` stage (parallel with prettier, lint, typecheck)
- Uses cached npm dependencies for faster execution
- Required to pass before dockerization
- No coverage requirements enforced
- No coverage reports uploaded

**Other Verification Steps in CI:**
- `prettier:check` - Code formatting
- `lint:check` - ESLint validation
- `typecheck` - TypeScript type checking
- `test` - Jest unit tests

## Testing Gaps

### Major Gaps

1. **No Component Tests**: Despite React Testing Library being installed, there are no component tests
2. **No React Hook Tests**: Custom hooks like `useBanner.tsx` are untested
3. **No Integration Tests**: No tests verifying component integration or data flow
4. **No E2E Tests**: No end-to-end tests for critical user flows
5. **No API Route Tests**: API routes (metrics, heartbeat) have no tests
6. **No GraphQL Tests**: Apollo Client queries/mutations are untested
7. **No Middleware Tests**: No tests for middleware.ts

### Coverage Gaps by Feature Area

- **Authentication/Authorization**: No tests
- **Campaign Management**: No tests for pages or components
- **Promoter Management**: No tests for PromoterForm or PromoterTable
- **Event Management**: No tests for EventsList or event pages
- **Form Validation**: Only partial helper testing
- **Routing/Navigation**: No tests
- **Error Handling**: No tests
- **State Management**: No tests (Zustand used but untested)

### Technical Gaps

1. **No mock setup for**:
   - Apollo Client / GraphQL
   - Next.js router
   - Server components
   - Environment variables
   - External APIs

2. **No test utilities for**:
   - Common test data factories
   - Reusable render functions
   - Custom matchers

3. **No visual regression testing**

4. **No accessibility testing** (despite having UI components)

5. **No performance testing**

## Recommendations

### Immediate Priorities

1. **Set up component testing infrastructure**
   - Create test utilities for rendering with providers (Apollo, Zustand)
   - Add MSW (Mock Service Worker) for API mocking
   - Write tests for critical components (forms, tables, lists)

2. **Add GraphQL mocking**
   - Use Apollo Client's MockedProvider
   - Create mock resolvers for common queries
   - Test loading, error, and success states

3. **Test critical user flows**
   - Campaign creation and editing
   - Promoter management
   - Event list interactions
   - Form submissions

4. **Establish coverage baseline**
   - Run coverage report to establish current baseline
   - Set minimum coverage thresholds (e.g., 60% statements)
   - Add coverage reporting to CI

### Medium-Term Improvements

5. **Add integration tests**
   - Test page-level functionality
   - Test data flow between components
   - Test form validation end-to-end

6. **Set up E2E testing**
   - Evaluate Playwright or Cypress
   - Test critical user journeys
   - Run in CI for main branch

7. **Improve test organization**
   - Co-locate tests with components
   - Create shared test utilities
   - Document testing patterns

8. **Add CI enhancements**
   - Upload coverage reports
   - Enforce minimum coverage thresholds
   - Run tests in parallel
   - Add coverage badges to README

### Long-Term Goals

9. **Implement visual regression testing**
   - Screenshot testing for components
   - Prevent unintended UI changes

10. **Add accessibility testing**
    - Use jest-axe or similar
    - Test keyboard navigation
    - Test screen reader compatibility

11. **Performance testing**
    - Test bundle sizes
    - Test rendering performance
    - Test API response times

12. **Establish TDD culture**
    - Write tests before implementation
    - Pair programming on test coverage
    - Regular code reviews focusing on tests
