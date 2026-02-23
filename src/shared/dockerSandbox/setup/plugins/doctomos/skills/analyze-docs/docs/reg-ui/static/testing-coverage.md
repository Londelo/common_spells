# Test Coverage - reg-ui

## Coverage Overview

The reg-ui codebase has **21 test files** covering core utility functions, campaign transformation logic, logging infrastructure, and select React hooks. Coverage is generated using Jest with v8 coverage provider, outputting to the `coverage/` directory.

### Coverage Metrics

Test coverage is automatically collected during test runs (`npm test`). View detailed coverage reports:

```bash
# Generate coverage
npm test

# View HTML report
open coverage/lcov-report/index.html
```

**Note**: Precise coverage percentages are available in the HTML report (`coverage/lcov-report/index.html`) which breaks down coverage by file, statements, branches, functions, and lines.

## Well-Tested Areas

### 1. Campaign Transformation & Localization (9 tests)

**Files**:
- `lib/utils/campaign/transform/normalizeContent/normalizeContent.spec.ts`
- `lib/utils/campaign/transform/normalizePreferences/normalizePreferences.spec.ts`
- `lib/utils/campaign/transform/transformCampaign.spec.ts`
- `lib/utils/campaign/locales/locales.spec.ts`
- `lib/utils/campaign/locales/getUrlsByLocale.spec.ts`
- `lib/utils/campaign/locales/getPrivacyUrlByLocale.spec.ts`
- `lib/utils/campaign/redirect/getBestViewingLocale.spec.ts`
- `lib/utils/campaign/redirect/getRedirectTo.spec.ts`

**Coverage Highlights**:
- Content normalization across locales (en-US, en-CA fallback logic)
- Preference normalization and transformation
- Complete campaign data transformation pipeline
- Locale-specific URL generation (privacy policy, terms of service)
- Redirect logic for best viewing locale
- Custom locale mapping and fallback behavior

**Why Well-Tested**: Campaign transformation is mission-critical; incorrect locale handling or data transformation directly impacts user experience across multilingual campaigns.

### 2. Utility Functions (6 tests)

**Files**:
- `lib/utils/calculateDistance.spec.ts`
- `lib/utils/calculateProgressBetweenDates.spec.ts`
- `lib/utils/partitionMarketsByDistance.spec.ts`
- `lib/utils/replaceTemplate.spec.ts`
- `lib/utils/hasAccents.spec.ts`
- `lib/utils/determineCopyByTicketers.spec.ts`

**Coverage Highlights**:
- Geolocation distance calculations (Haversine formula)
- Date-based progress calculations
- Market partitioning by geographic proximity
- Template string replacement with validation
- Accent detection in text
- Conditional copy selection based on ticketer configuration

**Why Well-Tested**: These are pure utility functions with clear inputs/outputs, making them ideal candidates for comprehensive unit testing. They form building blocks for higher-level features.

### 3. Logging Infrastructure (3 tests)

**Files**:
- `lib/logs/tests/clientLogger.spec.ts`
- `lib/utils/tests/consoleLogger.spec.ts`
- `lib/utils/tests/clientErrorHandler.spec.ts`
- `app/api/log/route.spec.ts`

**Coverage Highlights**:
- Client-side logger initialization and configuration
- Console logging wrapper behavior
- Error handler integration
- API route for client-side log submission (validation, error handling)

**Why Well-Tested**: Logging is critical for debugging production issues; tests ensure logs are properly formatted and transmitted.

### 4. Form Validation & Component Logic (2 tests)

**Files**:
- `components/SignupForm/useSignupFormState.spec.ts`
- `components/TermsOfUse/links.spec.ts`

**Coverage Highlights**:
- Form validation logic (market selection, LNAA opt-in requirements)
- LNAA (Live Nation All Access) conditional display logic
- Terms of Use link generation and internationalization

**Why Well-Tested**: Form validation directly affects user registration success; comprehensive tests prevent broken registration flows.

### 5. Shared Utilities (1 test)

**Files**:
- `shared/intlDateFormat.spec.ts`

**Coverage Highlights**:
- Internationalized date formatting across locales

## Testing Gaps

### 1. Component Testing (High Priority)

**Gap**: Minimal testing of React UI components.

**Untested Areas**:
- Visual component rendering (SignupForm, Market selection, OptIn checkboxes, etc.)
- User interactions (button clicks, form submissions, checkbox toggling)
- Conditional rendering logic (campaign phases, entry status, error states)
- Styled-components theme integration
- Client-side state management (Zustand store interactions)

**Impact**: UI regressions may go undetected; manual testing burden increases.

**Recommendation**:
- Add tests for `components/SignupForm/`, `components/MarketSelection/`, `components/ProgressBar/`
- Use `@testing-library/react` for user-centric component tests
- Mock Zustand store and SWR hooks for isolated component testing

### 2. GraphQL Integration Testing (High Priority)

**Gap**: No tests for GraphQL queries/mutations or data fetching logic.

**Untested Areas**:
- AppSync query/mutation execution
- Error handling for GraphQL failures
- Campaign data fetching and caching
- Entry creation and update flows
- Authentication/authorization integration

**Impact**: GraphQL API changes may break the application without early detection.

**Recommendation**:
- Add integration tests for GraphQL operations in `graphql/operations/*.gql`
- Mock AppSync responses for predictable testing
- Test error scenarios (network failures, invalid responses, rate limiting)

### 3. Redis Cache Layer (Medium Priority)

**Gap**: Cache interactions (`lib/cache.ts`) are not tested.

**Untested Areas**:
- Campaign caching/retrieval from Redis
- Cache key generation
- TTL behavior (8-hour expiration)
- Fallback behavior on cache miss
- Redis connection error handling

**Impact**: Cache-related issues may cause performance degradation or stale data bugs.

**Recommendation**:
- Add unit tests for `lib/cache.ts` with mocked Redis client
- Test cache hit/miss scenarios
- Verify error handling when Redis is unavailable

### 4. Middleware & Request Handling (Medium Priority)

**Gap**: No tests for Next.js middleware or request normalization logic.

**Untested Areas**:
- URL normalization (`middleware.ts`)
- Custom hostname handling (`X-HOST` header)
- Surrogate key generation for CDN cache purging
- Request/response header manipulation

**Impact**: Broken middleware could affect all requests; CDN caching issues may be hard to debug.

**Recommendation**:
- Add tests for `middleware.ts` with mocked NextRequest/NextResponse
- Test edge cases (missing headers, malformed URLs)

### 5. Server-Side Configuration (Medium Priority)

**Gap**: Configuration loading and parsing logic is not tested.

**Untested Areas**:
- YAML config file loading (`lib/config/readConfig.ts`)
- Client config parsing (`lib/config/parseClientConfig.ts`)
- Environment-specific configuration merging (dev, qa, preprod, prod)
- Required environment variable validation

**Impact**: Configuration errors may only surface in production environments.

**Recommendation**:
- Add tests for `lib/config/` with mock YAML files
- Validate correct config merging across environments
- Test missing/malformed config scenarios

### 6. Route Handlers (Low Priority)

**Gap**: Limited testing of Next.js API routes (only `/api/log` tested).

**Untested Areas**:
- GraphQL mock server (`/api/graphql`)
- Health check endpoint (`/heartbeat`)
- Metrics endpoint (`/metrics`)

**Impact**: API route bugs may go unnoticed until runtime.

**Recommendation**:
- Add tests for remaining API routes
- Mock external dependencies (Redis, GraphQL)

### 7. Custom Hooks (Low Priority)

**Gap**: Many custom React hooks lack tests.

**Untested Areas**:
- `hooks/useGetEntryData.ts`
- `hooks/useSetIsLNAAMember.ts`
- `hooks/useClientLogger.ts`
- Other custom hooks in `hooks/`

**Impact**: Hook bugs may cause unexpected component behavior.

**Recommendation**:
- Use `@testing-library/react-hooks` to test custom hooks in isolation
- Mock Zustand store and external dependencies

### 8. End-to-End (E2E) Testing (Low Priority)

**Gap**: No automated E2E tests.

**Untested Areas**:
- Complete user registration flows (form fill, submission, success/error states)
- Multi-step campaign navigation
- Cross-browser compatibility
- Mobile responsive behavior
- Localization switching

**Impact**: Full integration issues may only be caught manually.

**Recommendation**:
- Introduce E2E testing framework (Playwright, Cypress)
- Automate critical user journeys (registration, entry lookup, market selection)
- Run E2E tests in CI pipeline against test environment

## Coverage Improvement Plan

### Phase 1: High-Priority Gaps (Sprint 1-2)

1. Add component tests for `SignupForm` and `MarketSelection`
2. Add GraphQL operation tests with mocked responses
3. Test Redis cache layer (`lib/cache.ts`)

**Expected Outcome**: Increase coverage for user-facing features and critical data flows.

### Phase 2: Medium-Priority Gaps (Sprint 3-4)

1. Test middleware and request handling
2. Test configuration loading and parsing
3. Add tests for remaining API routes

**Expected Outcome**: Improve confidence in infrastructure and request pipeline.

### Phase 3: Low-Priority Gaps (Sprint 5+)

1. Test remaining custom hooks
2. Introduce E2E testing framework
3. Automate critical user journeys

**Expected Outcome**: Comprehensive test coverage across all layers.

## Testing Philosophy

### Why These Priorities?

**Unit Tests First**: Pure functions and utilities are easiest to test and provide immediate value (high ROI). The current test suite reflects this philosophy.

**Component Tests Second**: UI components are the user's interface; ensuring they render correctly and handle interactions is critical for user experience.

**Integration Tests Third**: GraphQL and cache interactions are harder to test but catch bugs that unit tests miss.

**E2E Tests Last**: E2E tests are expensive to maintain and slow to run but essential for validating complete user workflows.

### Functional Programming Benefits

The codebase's functional programming constraints (`eslint-plugin-fp`) make testing easier:
- Pure functions have predictable outputs (no side effects)
- Immutability reduces test complexity (no state mutation)
- Composition enables focused, granular tests

### Next Steps

- Review this document with the team
- Prioritize gaps based on business impact and development velocity
- Integrate test writing into feature development (TDD when possible)
- Monitor coverage trends over time (aim for 80%+ coverage on new code)
