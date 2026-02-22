# Test Coverage - export-service

## Coverage Metrics

**Note**: Explicit coverage reports are not configured in the current Jest setup. Coverage metrics can be generated using:

```bash
yarn jest --coverage
```

### Test File Distribution

| Category | Test Files | Source Files Covered |
|----------|-----------|---------------------|
| Export Managers | 9 files | CSV writers, email formatting, deletion logic, zip utilities |
| Library Utilities | 6 files | Row formatters, config, feature flags, validators |
| E2E Features | 15 files | All export endpoints, permissions, infrastructure |
| **Total** | **30 test files** | **Critical business logic** |

## Well-Tested Areas

### Export File Generation (High Coverage)

**CSV Writing and Segmentation**
- ✓ File creation with correct naming
- ✓ Row limit enforcement and multi-file splitting
- ✓ Stream management (write, end, cleanup)
- ✓ Directory creation and file existence checks
- ✓ File deletion after processing
- ✓ Row count tracking across segments

Test: `app/managers/exports/csv/SegmentedCSVFileWriter.spec.js`

**ZIP File Creation**
- ✓ Multi-file archiving
- ✓ Stream-based zip generation
- ✓ File indexing and retrieval

Test: `app/managers/exports/zip/MultiFileZipper.spec.js`

### Data Formatting (High Coverage)

**Row Formatters for Multiple Export Types**
- ✓ Entries export format (standard fields, custom fields, opt-ins)
- ✓ Scoring export format (fanscore, nudata, geolocation)
- ✓ Code assignments format (event, user, code mapping)
- ✓ Artist opt-in format (email, demographics, location)
- ✓ Artist SMS opt-in format (phone, demographics)
- ✓ LiveNation opt-in format (consent data)
- ✓ Codes export format (code, assignment status)
- ✓ Phone confirmation handling (conditional field inclusion)
- ✓ Fallback name resolution (entry vs user document)

Test: `lib/RowFormatter/RowFormatter.spec.js` (218 lines)

**Reminder Email Data Processing**
- ✓ Event data extraction from markets
- ✓ Email row formatting with campaign details
- ✓ Locale handling and localization
- ✓ Alternative link and passcode formatting
- ✓ Campaign type customization (standard vs fanclub)

Tests:
- `app/managers/exports/formatReminderEmailData/index.spec.js`
- `app/managers/exports/formatReminderEmailData/extractEventsData.spec.js`
- `app/managers/exports/formatReminderEmailData/formatEmailRow.spec.js`

### Export Business Logic (Good Coverage)

**Promoter Email Opt-Ins**
- ✓ Promoter and market data retrieval
- ✓ Entry zipping/grouping logic

Tests:
- `app/managers/exports/exportPromoterEmailOptIns/getPromotersAndMarkets.spec.js`
- `app/managers/exports/exportPromoterEmailOptIns/zipPromoterEntries.spec.js`

**Reminder Email Sampling**
- ✓ Sample export generation

Test: `app/managers/exports/exportReminderEmailSample.spec.js`

**Export Deletion**
- ✓ S3 bucket key mapping by export type

Test: `app/managers/exports/deleteExports/mapBucketTypeToKeys.spec.js`

**Utility Functions**
- ✓ Export helper utilities
- ✓ File naming conventions for emails

Tests:
- `app/managers/exports/utils/index.spec.js`
- `app/managers/exports/utils/makeFileNameForEmails.spec.js`

### Library Components (Good Coverage)

**Configuration Management**
- ✓ Config loading and validation

Test: `lib/config.spec.js`

**Feature Flags**
- ✓ Feature utility functions

Test: `lib/featureUtils.spec.js`

**Validation Middleware**
- ✓ Request validation logic

Test: `lib/middlewares/validators/ValidatorMiddleware.spec.js`

### End-to-End Scenarios (Comprehensive Coverage)

**Export Lifecycle**
- ✓ Export scheduling (all types: entries, scoring, codeAssignments, artistOptIn, livenationOptIn, codeWaves, fanlist)
- ✓ Re-scheduling existing exports
- ✓ Status polling and completion
- ✓ S3 upload verification
- ✓ Row count validation
- ✓ Export count accuracy
- ✓ CSV header validation
- ✓ Content row validation

Feature: `features/scenarios/entries.export.feature`

**Export Types**
- ✓ Entries export (basic user data)
- ✓ Code export (access codes)
- ✓ Fanlist export (fan database)
- ✓ Promoter email opt-ins
- ✓ Reminder emails (standard and auto)
- ✓ Verified entries (filtered by verification status)
- ✓ Waitlist exports

Features: `entries.export.feature`, `codes.export.feature`, `fanlist.export.feature`, etc.

**Infrastructure and Permissions**
- ✓ Health check endpoints
- ✓ Authentication and authorization
- ✓ Permission-based access control

Features: `infrastructure.feature`, `permissions.feature`

**Data Scenarios**
- ✓ Additional markets selection
- ✓ Supreme user handling
- ✓ Error handling and validation
- ✓ Edge cases (empty datasets, phone confirmation, name fallbacks)

Features: `entries.additionalMarkets.feature`, `supremes.feature`, `errors.feature`

## Testing Gaps

### Unit Test Gaps

**API Route Handlers**
- ❌ No unit tests for HTTP route handlers (`app/routes/`)
- ❌ Request/response middleware chain not tested in isolation
- ❌ Authentication/authorization middleware lacks unit tests

**Export Orchestration**
- ⚠️ Main export manager orchestration logic may lack unit tests
- ⚠️ S3 upload retry logic not explicitly tested
- ⚠️ Export status state machine transitions not unit tested

**Database Layer**
- ❌ MongoDB query builders not unit tested
- ❌ Database connection and retry logic not tested
- ❌ Index creation utilities lack tests (although used in CI)

**Error Handling**
- ⚠️ Error boundary and recovery logic may not be comprehensively tested
- ⚠️ Partial failure scenarios (e.g., some files uploaded, others failed)

### Integration Test Gaps

**Performance and Load**
- ❌ No load testing for large exports (>10k rows)
- ❌ No timeout or memory limit testing
- ❌ No concurrent export request testing

**External Service Failures**
- ⚠️ Limited testing of S3 failures (timeouts, connection errors)
- ⚠️ MongoDB connection failure scenarios
- ⚠️ Network partition or degradation scenarios

**Edge Cases**
- ❌ No tests for extremely large datasets (100k+ entries)
- ❌ Unicode and special character handling in exports
- ❌ CSV injection prevention testing
- ⚠️ Time zone edge cases (DST transitions, international campaigns)

**Multi-Tenancy**
- ⚠️ Cross-campaign data leakage prevention not explicitly tested
- ⚠️ Resource isolation between simultaneous exports

### Coverage Reporting Gaps

**No Automated Coverage Reports**
- Coverage metrics not collected in CI pipeline
- No coverage thresholds enforced
- No coverage trend tracking over time

**Missing Coverage Types**
- No branch coverage measurement
- No mutation testing
- No code path analysis

## Recommendations

### High Priority

1. **Enable Jest Coverage Reports**
   ```bash
   # Add to package.json scripts
   "test:coverage": "jest --coverage --coverageDirectory=coverage"
   ```
   - Set minimum coverage thresholds (e.g., 80% statements, 70% branches)
   - Integrate coverage reports into CI pipeline
   - Generate HTML reports for review

2. **Add Unit Tests for API Routes**
   - Test each route handler in isolation
   - Mock database and S3 operations
   - Verify request validation and error responses
   - Target: 80%+ coverage for route handlers

3. **Test Database Layer**
   - Add tests for query builders and aggregation pipelines
   - Test connection retry logic
   - Verify index creation scripts
   - Mock MongoDB client for isolation

4. **Comprehensive Error Handling Tests**
   - Test all error paths (network, database, S3 failures)
   - Verify error messages and status codes
   - Test partial failure recovery
   - Add chaos engineering tests for resilience

### Medium Priority

5. **Performance and Load Testing**
   - Add load tests for large exports (10k, 50k, 100k rows)
   - Test concurrent export requests
   - Measure memory usage and cleanup
   - Verify timeout handling

6. **Security Testing**
   - Add CSV injection prevention tests
   - Test cross-campaign data isolation
   - Verify permission enforcement at data layer
   - Add input sanitization tests

7. **Edge Case Coverage**
   - Unicode and emoji handling in names/emails
   - Time zone edge cases (DST, international)
   - Empty dataset handling
   - Malformed input data

### Low Priority (Nice-to-Have)

8. **Mutation Testing**
   - Use Stryker or similar tool to verify test effectiveness
   - Identify weak test assertions

9. **Contract Testing**
   - Add Pact or similar for API contract verification
   - Ensure frontend/backend compatibility

10. **Visual Regression Testing**
    - If service generates reports with formatting, add visual tests

## Coverage Improvement Roadmap

### Phase 1: Measurement (Week 1-2)
- Enable Jest coverage collection
- Generate baseline coverage report
- Set up CI integration for coverage tracking

### Phase 2: Critical Gaps (Week 3-6)
- Add API route handler tests
- Add database layer tests
- Add error handling tests
- Target: 70% statement coverage

### Phase 3: Advanced Testing (Week 7-10)
- Add performance tests
- Add security tests
- Add edge case tests
- Target: 80% statement coverage, 70% branch coverage

### Phase 4: Optimization (Week 11-12)
- Mutation testing
- Test refactoring for maintainability
- Documentation of testing patterns
- Target: 85% statement coverage, 75% branch coverage

## Monitoring and Maintenance

### Ongoing Practices

1. **Coverage Enforcement**
   - Block PRs that decrease coverage
   - Require tests for all new features
   - Regular coverage audits (monthly)

2. **Test Health**
   - Monitor flaky test rates
   - Fix or quarantine unstable tests
   - Keep test execution time under 5 minutes

3. **Documentation**
   - Maintain testing guidelines
   - Document complex test scenarios
   - Share testing patterns with team

4. **Tool Updates**
   - Keep Jest and Cucumber up to date
   - Evaluate new testing tools annually
   - Migrate to newer assertion libraries as needed
