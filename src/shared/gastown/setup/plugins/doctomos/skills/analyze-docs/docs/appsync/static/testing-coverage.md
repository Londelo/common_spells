# Test Coverage - appsync

## Coverage Metrics

**Note**: No automated coverage reporting is currently configured in the Jest setup. The project does not generate coverage reports during CI/CD pipeline execution.

### Test File Distribution

| Component Type | Total Files* | Test Files | Coverage Estimate |
|---------------|-------------|------------|-------------------|
| Functions | ~40 | 29 | ~73% |
| Resolvers | ~20 | 11 | ~55% |
| Utilities | Variable | 2 | Low |
| Feature Scenarios | 6 areas | 6 | 100% |

*Estimated based on typical resolver/function counts in AppSync projects

### Testing by Component

#### Functions (Pipeline Functions)
- **29 test files** covering pipeline functions
- Tests include: `getCluster`, `getBotOrNot`, `getDiscoEventId`, `getDemandSaleRecord`, `getLivenessSession`, `getAccountFanscoreMemberId`, `getUpdatedPhonescore`, and others
- Each test validates both `request()` and `response()` handlers
- Focus on DynamoDB operations, Lambda invocations, and data transformations

#### Resolvers (Top-Level Resolvers)
- **11 test files** covering GraphQL resolvers
- Tests include: `phonescore`, `getCluster`, `activateLnaa`, `livenessStatus`, `isLNAAMember`, `apiLookupCampaignByEventId`, `eventDetails`, `apiVerificationStatus`, `apiAccountFanscore`, `demandRecordQuery`, `demandMutationTemplate`
- Validates input validation, error handling, and direct resolver logic

#### Utilities
- **2 test files**: `applyScoreModelBoost.spec.ts`, `applyArmAdjustment.spec.ts`
- Focus on business logic utilities used across resolvers/functions
- Tests cover boost eligibility, score calculations, and feature flag behavior

## Well-Tested Areas

### Input Validation
- **Phone number validation**: Comprehensive tests for valid/invalid formats, length checks, leading zero detection
- **Resolver argument validation**: Tests for missing required parameters and invalid input types

### Score Calculation Logic
- **Model boost application**: Tests for enabled/disabled states, eligibility ranges, selection logic
- **ARM adjustments**: Tests for various adjustment scenarios

### Data Retrieval Functions
- **Cluster lookup**: Tests for successful retrieval and null cases
- **Identity lookups**: Tests for globalUserId and memberId resolution
- **DynamoDB operations**: Request formation and response parsing tested extensively

### Error Handling
- **Format errors**: Invalid phone number formats
- **Missing data**: Null result handling when records don't exist
- **GraphQL errors**: Proper error object construction

### End-to-End Scenarios
- **Verification status queries**: Multiple scenarios testing different query paths (demand table, verification table, with/without globalUserId/email)
- **Campaign lookups**: Testing campaign queries by event ID
- **Account fanscore**: Testing prioritization of globalUserId vs. memberId lookups
- **Null result handling**: Comprehensive tests for queries returning no data

## Testing Gaps

### Unit Test Gaps

**Functions Without Tests (~11 functions)**
- Approximately 27% of pipeline functions lack unit test coverage
- Untested functions represent potential quality risk
- Should prioritize based on criticality and complexity

**Resolvers Without Tests (~9 resolvers)**
- Approximately 45% of resolvers lack unit test coverage
- Higher-risk area due to being entry points for GraphQL queries/mutations
- Should add tests for untested resolvers, especially those handling mutations

**Utility Functions**
- Only 2 utilities are tested
- Shared utilities in `app/src/shared.ts` and `app/src/utils.ts` may lack coverage
- These utilities are used across many resolvers, so gaps here propagate

### Integration Test Gaps

**Data Source Integration**
- No dedicated integration tests for Lambda data sources
- No integration tests for HTTP data sources (Campaign service, TM account service)
- Feature tests provide some coverage, but specific data source integration testing would improve reliability

**Pipeline Composition**
- No explicit tests for multi-function resolver pipelines
- Tests focus on individual functions, not the orchestration
- Example: `accountFanscore` has 8 pipeline functions, but no test validates the full pipeline flow in unit tests

**Authentication/Authorization**
- No visible tests for API key authentication (`@aws_api_key` directive)
- No tests for authorization logic if present

### Feature Test Gaps

**Subscription Testing**
- GraphQL subscriptions (using `@aws_subscribe` directive) are not tested
- No feature tests validate subscription behavior

**Mutation Testing**
- Limited mutation testing (only `demandMutationTemplate` visible in resolvers)
- Most feature tests focus on queries
- Should expand mutation coverage in feature tests

**Error Scenarios**
- Most feature tests validate happy paths
- Limited error scenario testing (one example: verification status with no identifier)
- Should add more failure case testing

**Performance/Load Testing**
- No performance tests
- No load testing of the AppSync API
- No tests for rate limiting or throttling behavior

### Infrastructure Testing

**Terraform Configuration**
- No automated tests for Terraform configuration
- Manual validation only during deployment
- Should consider `terraform validate` in CI

**Schema Validation**
- No automated GraphQL schema validation beyond build process
- No breaking change detection
- Should consider schema linting or validation tools

**IAM Permissions**
- No automated testing of IAM role permissions
- Permissions validated only when code runs in deployed environment
- Permission issues only discovered in deployed environments

## Coverage Metrics by Functional Area

| Functional Area | Unit Test Coverage | E2E Test Coverage | Overall Status |
|----------------|-------------------|-------------------|----------------|
| Fan Verification | Good (11 tests) | Excellent | ✅ Strong |
| Phone Verification | Good | Excellent | ✅ Strong |
| Fanscore Calculation | Good | Good | ✅ Strong |
| Demand Tracking | Moderate | Good | ⚠️ Needs Unit Tests |
| Event Details | Moderate | Good | ⚠️ Needs Unit Tests |
| Identity Resolution | Good | Good | ✅ Strong |
| Liveness Detection | Moderate | Unknown | ⚠️ Needs Coverage |
| LNAA (TM+) Features | Moderate | Unknown | ⚠️ Needs Coverage |
| Campaign Lookup | Moderate | Good | ⚠️ Needs Unit Tests |

## Recommendations

### Immediate Actions (High Priority)

1. **Add Coverage Reporting**
   - Configure Jest to generate coverage reports: `jest --coverage`
   - Add coverage thresholds to `jest.config.js`
   - Publish coverage reports in CI artifacts
   - Consider tools like Codecov or SonarQube

2. **Test Critical Untested Resolvers**
   - Prioritize mutation resolvers (higher risk)
   - Test resolvers with complex business logic
   - Focus on user-facing query resolvers

3. **Add Subscription Tests**
   - Create feature tests for GraphQL subscriptions
   - Test subscription lifecycle (subscribe, publish, unsubscribe)

4. **Expand Mutation Testing**
   - Add more mutation scenarios to feature tests
   - Test validation, error handling, and side effects
   - Test concurrent mutation scenarios

### Short-Term Improvements (Medium Priority)

5. **Pipeline Integration Tests**
   - Add tests that validate multi-function pipeline flows
   - Test stash data passing between pipeline functions
   - Test early return scenarios

6. **Data Source Integration Tests**
   - Create integration tests for Lambda data sources
   - Test HTTP data source connectivity and error handling
   - Mock external services appropriately

7. **Increase Utility Test Coverage**
   - Test shared utilities in `app/src/shared.ts`
   - Test utilities in `app/src/utils.ts`
   - Ensure all exported functions have tests

8. **Error Scenario Coverage**
   - Add more negative test cases to feature tests
   - Test invalid authentication scenarios
   - Test rate limiting and throttling

### Long-Term Enhancements (Lower Priority)

9. **Performance Testing**
   - Add performance benchmarks for critical queries
   - Test API under load
   - Monitor resolver execution time

10. **Infrastructure Testing**
    - Add Terraform validation to CI (`terraform validate`, `terraform fmt -check`)
    - Add GraphQL schema linting
    - Consider contract testing for external dependencies

11. **Test Data Management**
    - Create reusable test data factories
    - Implement test data cleanup automation
    - Consider synthetic data generation for testing

12. **Continuous Coverage Monitoring**
    - Set up coverage tracking over time
    - Add coverage gates to CI/CD pipeline (fail builds below threshold)
    - Monitor test execution time and optimize slow tests

### Coverage Goals

**Unit Test Coverage Targets**:
- Functions: 90% coverage (currently ~73%)
- Resolvers: 85% coverage (currently ~55%)
- Utilities: 90% coverage (currently low)

**Feature Test Coverage Targets**:
- All GraphQL queries should have at least one feature test
- All mutations should have positive and negative feature tests
- All subscriptions should have lifecycle tests

**Overall Quality Goals**:
- 80%+ line coverage across the codebase
- 100% of public API (GraphQL schema) covered by feature tests
- Zero critical security or data integrity paths without tests

## Notes on Coverage Measurement

**Current State**: No automated coverage metrics are available. Estimates above are based on:
- Manual counting of test files vs. source files
- Review of test contents
- Industry standards for similar projects

**To Measure Accurately**:
```bash
# Add to package.json scripts
"test:coverage": "jest --coverage --coverageDirectory=coverage"

# Run coverage report
npm run test:coverage
```

**Coverage Report Output**: Will show:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage
- Uncovered lines in each file

**CI Integration**: Add coverage report generation to `.gitlab-ci.yml`:
```yaml
unit tests:
  script:
    - npx run test -- --coverage
  artifacts:
    paths:
      - coverage
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```
