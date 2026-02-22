# Test Coverage - admin-ui

## Coverage Overview

The admin-ui application has **limited unit test coverage** but **comprehensive end-to-end test coverage** through Cucumber/Nightwatch feature tests. The testing strategy prioritizes user workflow validation over code-level coverage metrics.

## Coverage Metrics

**Unit Test Coverage**

No coverage report was found in the repository, and coverage metrics are not enforced in CI. Based on the test file inventory:

- **Unit test files**: 5 files covering selectors, sagas, and utility functions
- **Estimated coverage**: Low (<20% of application code)
- **Coverage collection**: Configured but not enforced

**Feature Test Coverage**

| Domain Area | Feature Files | Coverage Description |
|-------------|---------------|----------------------|
| Campaign Editor | 2 files | Core campaign editing workflows, form validation, image requirements |
| Campaign Modal | 2 files | Campaign modal interactions, locale management |
| Distribution | 3 files | Email/SMS notifications, wave preparation |
| File Management | 4 files | Blacklist uploader, exporter, scoring uploader, scoring filter |
| Infrastructure | 1 file | Infrastructure testing |
| Misc | 1 file | Landing page |
| **Total** | **14 feature files** | **Comprehensive E2E coverage** |

## Well-Tested Areas

### Strongly Covered by Feature Tests

1. **Campaign Creation and Editing**
   - Artist metadata loading
   - Form field configuration
   - Confirmation page setup
   - Default text validation
   - Linkable attributes
   - Publication validation (images required)

2. **Campaign Localization**
   - Multi-locale support
   - Locale switching in editor
   - Fallback locale handling

3. **File Upload Workflows**
   - Blacklist file uploads
   - Scoring file uploads
   - Scoring filter uploads
   - Data export functionality

4. **Distribution Features**
   - Email notification configuration
   - SMS notification setup
   - Wave preparation workflows

### Moderately Covered by Unit Tests

1. **Redux Selectors**
   - `campaignContent.spec.js` - 20+ test cases for editor locale selection
   - `campaignSelection.spec.js` - Campaign selection logic

2. **Campaign Utilities**
   - `campaign.test.js` - 15+ test cases for data normalization and sanitization

3. **Form Normalization**
   - `normalization.spec.js` - Input normalization functions

4. **Default Campaign Data**
   - `defaultRegistrationV2.spec.js` - Default registration campaign structure

## Testing Gaps

### Critical Gaps (High Priority)

1. **No Unit Test Coverage for Components**
   - React components are not unit tested
   - UI component behavior is only validated through E2E tests
   - No snapshot tests for UI components

2. **No Unit Test Coverage for Redux Actions**
   - No tests for action creators
   - Saga logic has minimal coverage (1 test file)

3. **No Unit Test Coverage for Reducers**
   - State management logic is untested at the unit level
   - State transitions are only validated through integration tests

4. **Missing API Layer Tests**
   - GraphQL queries/mutations are not tested
   - Apollo client integration is untested
   - API error handling is not validated at unit level

### Moderate Gaps

5. **Incomplete Selector Coverage**
   - Only 2 selector files have tests (`campaignContent`, `campaignSelection`)
   - Many other selectors in `frontend/src/selectors/` are untested

6. **Limited Utility Function Coverage**
   - Only campaign utilities have comprehensive tests
   - Other utility modules lack coverage

7. **No Test Coverage for Shared Components**
   - Shared/reusable components are untested
   - Form components lack unit tests

8. **No Performance/Load Tests**
   - No tests for handling large datasets
   - No tests for concurrent user scenarios

### Lower Priority Gaps

9. **No Accessibility Tests**
   - No automated a11y testing
   - WCAG compliance not validated

10. **No Visual Regression Tests**
    - UI changes are not automatically detected
    - No screenshot comparison tests

11. **Limited Error Boundary Testing**
    - Error recovery scenarios are not tested
    - Error UI components are untested

## Recommendations

### Short-Term (High Impact)

1. **Add Component Unit Tests**
   - Start with critical components (campaign editor, form fields)
   - Use React Testing Library for component tests
   - Aim for 50% coverage of components

2. **Test Redux Actions and Reducers**
   - Add tests for all action creators
   - Test reducer state transitions
   - Target 80% coverage for state management

3. **Expand Selector Test Coverage**
   - Test all remaining selectors
   - Focus on complex data transformation logic

### Medium-Term

4. **Add API Layer Tests**
   - Mock GraphQL responses
   - Test error handling paths
   - Validate request/response transforms

5. **Test Saga Logic**
   - Add comprehensive saga tests
   - Test success and failure paths
   - Mock external dependencies

6. **Implement Snapshot Tests**
   - Add snapshot tests for stable components
   - Update snapshots as part of PR review process

### Long-Term

7. **Add Visual Regression Testing**
   - Integrate visual diff tool (Percy, Chromatic, or similar)
   - Screenshot critical user flows

8. **Add Accessibility Tests**
   - Integrate jest-axe or similar tool
   - Add automated a11y checks to CI

9. **Performance Testing**
   - Add tests for large dataset rendering
   - Test pagination and lazy loading

10. **Coverage Enforcement**
    - Set minimum coverage thresholds in Jest config
    - Fail CI builds if coverage drops below threshold
    - Start with 50% overall, increase incrementally

## Test Quality Assessment

### Strengths

- **Feature tests are well-organized** - Clear domain separation
- **E2E tests validate real workflows** - Tests run against actual deployments
- **Retry logic for flaky tests** - CI configured with retry: 2
- **Good mocking patterns** - Unit tests show proper dependency mocking

### Weaknesses

- **Very low unit test coverage** - Only 5 test files for entire frontend
- **No coverage enforcement** - Coverage can decrease without visibility
- **Limited test documentation** - Test patterns not documented
- **No test data factories** - Tests create data inline, reducing reusability

## Coverage Improvement Plan

**Phase 1 (Weeks 1-4)**: Foundational Coverage
- Add 30+ component tests (critical components)
- Add 20+ reducer tests (all reducers)
- Add 15+ action creator tests

**Phase 2 (Weeks 5-8)**: State Management
- Complete saga test coverage
- Complete selector test coverage
- Add integration tests for Redux flow

**Phase 3 (Weeks 9-12)**: API and Integration
- Add GraphQL query/mutation tests
- Test Apollo client integration
- Add API error handling tests

**Phase 4 (Weeks 13-16)**: Quality and Automation
- Implement snapshot testing
- Add accessibility tests
- Configure coverage enforcement
- Document testing patterns

**Success Metrics**
- Unit test coverage: 50% overall, 70% for critical paths
- All new code includes tests (enforced in PR reviews)
- Test execution time: <5 minutes for unit tests
- Feature test reliability: >95% success rate
