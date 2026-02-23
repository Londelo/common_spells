# Test Coverage - admin-ui-next

## Coverage Status

**Coverage data not available** - No recent test coverage report was found. The project has Jest configured with `collectCoverage: true` and `coverageProvider: 'v8'`, but no coverage directory exists.

To generate a coverage report, run:

```bash
npm test
```

This will create a `coverage/` directory with detailed coverage reports.

## Current Test Statistics

| Metric | Count | Percentage of Codebase |
|--------|-------|------------------------|
| **Test Files** | 2 | 1.6% of source files |
| **Source Files** | 125 | TypeScript files (excluding declarations) |
| **Component Files** | ~40 | Estimated React components |
| **Tested Files** | 2 | lib/index.ts, components/EventsList/EventsListRow/helpers.ts |

### Test File Breakdown

1. **lib/index.spec.ts**
   - 1 test suite
   - 1 test case
   - Tests: Example function

2. **components/EventsList/EventsListRow/helpers.spec.ts**
   - 3 test suites (getBadgeStatus, getShouldShowError, selectPromoterNamesStr)
   - ~30 test cases
   - Tests: Validation logic, status badge helpers, error display logic, promoter name selection

## Estimated Coverage by Area

Since no coverage report exists, here's an estimation based on test file analysis:

| Area | Tested Files | Total Files | Est. Coverage | Status |
|------|--------------|-------------|---------------|--------|
| **lib/** | 1 | ~15 | <10% | Critical gap |
| **components/** | 1 | ~40 | <5% | Critical gap |
| **app/** (pages) | 0 | ~15 | 0% | No coverage |
| **hooks/** | 0 | ~8 | 0% | No coverage |
| **middleware** | 0 | 1 | 0% | No coverage |
| **API routes** | 0 | ~3 | 0% | No coverage |
| **GraphQL** | 0 | ~10 | 0% | No coverage |
| **configs** | 0 | ~5 | 0% | No coverage |

### Coverage Heatmap

```
Legend: █ Well-tested | ▓ Partially tested | ░ Minimal testing | ○ No tests

app/                           ○○○○○○○○○○ 0%
├── campaigns/                 ○○○○○○○○○○ 0%
├── promoters/                 ○○○○○○○○○○ 0%
├── metrics/                   ○○○○○○○○○○ 0%
└── heartbeat/                 ○○○○○○○○○○ 0%

components/                    ░○○○○○○○○○ ~5%
├── EventsList/                ░░░░░░░░○○ ~40%  (only helpers)
├── Promoters/                 ○○○○○○○○○○ 0%
├── CampaignList/              ○○○○○○○○○○ 0%
└── (other components)         ○○○○○○○○○○ 0%

lib/                           ░○○○○○○○○○ ~7%
├── index.ts                   ████████░░ 80%  (1 function)
├── graphql/                   ○○○○○○○○○○ 0%
├── types/                     ○○○○○○○○○○ 0%
└── utils/                     ○○○○○○○○○○ 0%

hooks/                         ○○○○○○○○○○ 0%
middleware.ts                  ○○○○○○○○○○ 0%
configs/                       ○○○○○○○○○○ 0%
```

## Well-Tested Areas

### ✓ EventsListRow Helpers (components/EventsList/EventsListRow/helpers.ts)

**Coverage: ~90% estimated**

This is the best-tested file in the codebase with comprehensive test coverage for:

1. **getBadgeStatus()** - Status badge determination
   - ✓ Complete status scenarios
   - ✓ Incomplete warning scenarios
   - ✓ Incomplete error scenarios
   - ✓ Edge cases (missing venue, point, dates)
   - ✓ Ticketer-specific logic (TM vs others)

2. **getShouldShowError()** - Error display logic
   - ✓ All field validation
   - ✓ Default value handling
   - ✓ Ticketer-conditional logic
   - ✓ Point/venue validation

3. **selectPromoterNamesStr()** - Promoter name selection
   - ✓ Empty input handling
   - ✓ Invalid ID handling
   - ✓ Multiple ID processing
   - ✓ Default value returns

**Test Quality:**
- Uses factory functions for mock data
- Type-safe with TypeScript
- Covers edge cases thoroughly
- Well-organized with nested describe blocks

### ✓ lib/index.ts (Minimal)

**Coverage: ~80% estimated (1 function)**

- Basic example test
- Verifies function return value
- Serves as proof-of-concept for testing setup

## Testing Gaps

### Critical Gaps (High Impact, No Coverage)

#### 1. Campaign Management (0% coverage)

**Impact**: Critical business functionality

**Files needing tests:**
- `app/campaigns/page.tsx` - Campaign list page
- `app/campaigns/[campaignId]/page.tsx` - Campaign detail page
- `app/campaigns/[campaignId]/events/page.tsx` - Events list
- `app/campaigns/[campaignId]/events/create/page.tsx` - Event creation
- `components/CampaignList/` - Campaign list components

**Risks:**
- Campaign creation/editing bugs
- Data display issues
- Navigation problems
- Form validation failures

#### 2. Promoter Management (0% coverage)

**Impact**: Core feature with complex forms

**Files needing tests:**
- `components/Promoters/PromoterForm/index.tsx` - Main form component
- `components/Promoters/PromoterForm/PromoterFormFields.tsx` - Form fields
- `components/Promoters/PromoterForm/useBanner.tsx` - Banner hook
- `components/Promoters/PromotersTable/index.tsx` - Table component
- `app/promoters/page.tsx` - Promoters list page
- `app/promoters/create/page.tsx` - Create promoter page

**Risks:**
- Form validation bugs
- Data submission errors
- Table sorting/filtering issues
- Banner display problems

#### 3. GraphQL Layer (0% coverage)

**Impact**: All data fetching and mutations

**Areas needing tests:**
- GraphQL queries
- GraphQL mutations
- Apollo Client setup
- Error handling
- Loading states
- Cache updates

**Risks:**
- Data fetching failures
- Incorrect query parameters
- Cache inconsistencies
- Poor error handling

#### 4. Custom Hooks (0% coverage)

**Impact**: Reusable logic across components

**Files needing tests:**
- `components/Promoters/PromoterForm/useBanner.tsx`
- Any other custom hooks in the codebase

**Risks:**
- Hook logic bugs
- State management issues
- Memory leaks
- Infinite re-renders

#### 5. API Routes (0% coverage)

**Impact**: Server-side functionality

**Files needing tests:**
- `app/metrics/route.ts` - Metrics endpoint
- `app/heartbeat/route.ts` - Health check endpoint

**Risks:**
- Endpoint failures
- Incorrect response formats
- Performance issues

### Moderate Gaps (Medium Impact)

#### 6. EventsList Components (Partial coverage)

**Current Coverage**: Only helpers tested (~40% estimated)

**Files needing tests:**
- `components/EventsList/EventsListRow/index.tsx` - Row component
- `components/EventsList/index.tsx` - List component

**Already Tested:**
- ✓ helpers.ts (badge status, error display, promoter selection)

#### 7. Middleware (0% coverage)

**Impact**: Request/response handling

**File needing tests:**
- `middleware.ts`

**Risks:**
- Authentication issues
- Routing problems
- Request handling bugs

#### 8. Utility Functions (0% coverage)

**Impact**: Shared logic across application

**Areas needing tests:**
- Date/time utilities
- Formatting functions
- Validation utilities
- Helper functions in lib/

### Low Priority Gaps

#### 9. Type Definitions (Not testable)

**Files:**
- Type definition files (*.d.ts)
- Interface declarations

**Note**: These don't require direct tests but should be validated through usage in tests.

#### 10. Configuration (Low priority)

**Files:**
- Config files
- Constants

**Note**: Tested indirectly through feature tests.

## Specific Files Needing Urgent Test Coverage

### Priority 1 (Critical Business Logic)

1. `components/Promoters/PromoterForm/index.tsx`
   - Complex form with validation
   - Multiple field types
   - Submission logic

2. `components/EventsList/EventsListRow/index.tsx`
   - Uses tested helpers
   - Rendering logic needs coverage

3. `app/campaigns/[campaignId]/events/create/page.tsx`
   - Event creation flow
   - Form handling

### Priority 2 (Core Features)

4. `components/Promoters/PromotersTable/index.tsx`
   - Table rendering
   - Sorting/filtering
   - User interactions

5. GraphQL queries and mutations
   - Data fetching
   - Error states
   - Loading states

6. `components/Promoters/PromoterForm/useBanner.tsx`
   - Custom hook logic
   - State management

### Priority 3 (Infrastructure)

7. `middleware.ts`
   - Request handling
   - Authentication

8. `app/metrics/route.ts` and `app/heartbeat/route.ts`
   - API endpoints
   - Response formats

## Recommendations

### Step 1: Generate Coverage Report

Run tests with coverage to get accurate metrics:

```bash
npm test
```

Then review the coverage report in `coverage/lcov-report/index.html`.

### Step 2: Set Coverage Thresholds

Add to `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    statements: 60,
    branches: 55,
    functions: 60,
    lines: 60
  }
}
```

Start with achievable targets and increase over time.

### Step 3: Add Coverage to CI

Update `.gitlab-ci.yml` to:
- Generate coverage reports
- Upload coverage artifacts
- Fail builds below threshold
- Display coverage badges

Example:

```yaml
test:
  script:
    - npm test -- --coverage --coverageReporters=text --coverageReporters=lcov
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

### Step 4: Test Critical Paths First

Focus initial testing efforts on:
1. PromoterForm component (most complex)
2. EventsList components (partially tested)
3. Campaign pages (critical flows)
4. GraphQL queries (data layer)

### Step 5: Create Testing Infrastructure

Before writing many tests:
1. Set up MSW for API mocking
2. Create Apollo MockedProvider wrapper
3. Build test data factories
4. Create custom render function with providers

### Step 6: Incremental Coverage Improvement

Target: **Increase coverage by 10% per sprint**

- Sprint 1: 2% → 12% (add PromoterForm tests)
- Sprint 2: 12% → 22% (add EventsList component tests)
- Sprint 3: 22% → 32% (add Campaign page tests)
- Sprint 4: 32% → 42% (add GraphQL tests)
- Sprint 5: 42% → 52% (add hook tests)
- Sprint 6: 52% → 62% (add remaining component tests)

### Step 7: Prevent Coverage Regression

- Require tests for new features
- Run coverage in CI
- Review coverage in code reviews
- Block PRs that decrease coverage
