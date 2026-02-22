# Testing Strategy - appsync

## Overview

The Verified Fan AppSync GraphQL API employs a comprehensive testing strategy that combines unit testing for individual resolver/function logic with end-to-end feature testing using Cucumber. The testing approach ensures that both isolated components and complete GraphQL request/response flows are validated.

## Test Organization

| Location | Type | Count |
|----------|------|-------|
| app/src/functions/*.spec.ts | Unit tests (Functions) | 29 |
| app/src/resolvers/*.spec.ts | Unit tests (Resolvers) | 11 |
| app/src/utils/*.spec.ts | Unit tests (Utilities) | 2 |
| features/scenarios/*.feature | Cucumber E2E | 6 |
| **Total Test Files** | | **48** |

### Test File Structure

Unit tests are co-located with source code using the `.spec.ts` naming convention:
- `app/src/functions/getCluster.ts` → `app/src/functions/getCluster.spec.ts`
- `app/src/resolvers/phonescore.ts` → `app/src/resolvers/phonescore.spec.ts`
- `app/src/utils/applyScoreModelBoost.ts` → `app/src/utils/applyScoreModelBoost.spec.ts`

Feature tests are organized by functional area:
- `features/scenarios/api.feature` - VF API queries
- `features/scenarios/demand.feature` - Demand tracking
- `features/scenarios/eventDetails.feature` - Event details
- `features/scenarios/idv.feature` - Identity verification
- `features/scenarios/phone.feature` - Phone verification
- `features/scenarios/registration.feature` - Registration flows

## Frameworks Used

| Framework | Purpose | Version |
|-----------|---------|---------|
| Jest | Unit testing | ^29.6.2 |
| ts-jest | TypeScript support for Jest | ^29.1.2 |
| Cucumber | BDD/E2E testing | 3.2.0 |
| AWS AppSync Client | AppSync code evaluation | ^3.391.0 |

### Framework Details

**Jest**: Configured to run tests on all `*.spec.ts` files in the `app/` directory with TypeScript support via ts-jest.

**Cucumber**: Used for behavior-driven development with feature files written in Gherkin syntax. Tests run against deployed environments (qa/dev) to validate full GraphQL API behavior.

**AWS AppSync Client**: Unit tests use the `EvaluateCodeCommand` to test resolver and function code using AWS's actual AppSync JavaScript runtime, ensuring test accuracy.

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npm run test -- app/src/resolvers/phonescore.spec.ts
```

### Feature Tests (All)
```bash
npm run features
```

### Feature Tests by Tag
```bash
npm run features:tags @api-verification-status
```

### Feature Tests by Scenario Name
```bash
npm run features:scenario "Query returns null when no record is found"
```

### Watch Mode (Build Only)
```bash
npm run esbuildWatch
```
*Note: Watches and rebuilds TypeScript files on changes. Does not auto-run tests.*

### Test Timeout
Jest tests run with a 10-second timeout (`--testTimeout=10000`).

## Test Patterns

### Unit Tests

Unit tests follow a consistent pattern:

1. **Import test utilities**: Tests import `evaluateCode` from `spec/support.ts`
2. **Describe blocks**: Group related tests using Jest's `describe()`
3. **Test structure**: Each test (`it()`) sets up context, calls `evaluateCode()`, and asserts results
4. **Separation of concerns**: Tests for both `request()` and `response()` handlers are grouped separately

**Example Pattern (Functions)**:
```typescript
describe('getCluster', () => {
  const functionName = 'getCluster';

  describe('request', () => {
    it('correctly calls getCluster with globalUserId', async() => {
      const context = { arguments: { globalUserId: 'user-id' } };
      const { result, error } = await evaluateCode({ context, functionName });

      expect(error).toBeUndefined();
      expect(result).toEqual({ /* expected DynamoDB operation */ });
    });
  });

  describe('response', () => {
    it('returns cluster data', async() => {
      const context = { result: { /* DynamoDB result */ } };
      const { result, error } = await evaluateCode({
        context,
        functionName,
        handler: 'response'
      });

      expect(result).toEqual({ /* expected GraphQL result */ });
    });
  });
});
```

**Example Pattern (Resolvers)**:
```typescript
describe('phonescore request', () => {
  const resolverName = 'phonescore';

  it('correctly calls phonescore', async() => {
    const context = { arguments: { phoneNumber: '+12345678' } };
    const { result, error } = await evaluateCode({ context, resolverName });

    expect(error).toBeUndefined();
    expect(result).toEqual({});
  });

  it('returns invalid params error when phoneNumber has non digit characters', async() => {
    const context = { arguments: { phoneNumber: '(123) 345-4678' } };
    const { error } = await evaluateCode({ context, resolverName });

    expect(error).toEqual({ message: 'Invalid phone number format' });
  });
});
```

**Example Pattern (Utilities)**:
```typescript
describe('applyScoreModelBoost', () => {
  const boostEnabledCtx = { env: { SCORE_MODEL_BOOST_ENABLED: 'true' } } as Context;

  it('returns original score when disabled', () => {
    const result = applyScoreModelBoost(boostDisabledCtx, 0.6);
    expect(result.score).toEqual(0.6);
    expect(result.tag).toBeUndefined();
  });

  it('returns boosted score when eligible and selected', () => {
    const result = applyScoreModelBoost(boostEnabledCtx, 0.6, 0);
    expect(result.score).toBeGreaterThanOrEqual(0.9);
    expect(result.tag).toEqual('pas_model_testing');
  });
});
```

### Feature Tests (Cucumber)

Feature tests use the Gherkin syntax for behavior-driven development:

**Example Structure**:
```gherkin
@api
Feature: Feature tests for VF API queries

  @api-null-result
  Scenario Outline: Query returns null when no record is found
    When I call the <appsyncQuery> graphql operation with the <queryInput> input
    Then the result includes the <resultType> result

    Examples:
      | appsyncQuery                | queryInput             | resultType              |
      | appsync_verificationStatus  | getVerificationStatus  | verificationStatusNull  |
      | appsync_apiAccountFanscore  | globalUserAndMemberId  | noScoreFanscoreResult   |

  @api-verification-status @verification-status
  Scenario Outline: Query verification or demand table for existing verification
    Given I put an item in the dynamodb table <tableName> with the <verificationRecordType> input
    When I call the appsync_verificationStatus graphql operation with the <verificationQueryType> input
    Then the result includes the verificationStatus result

    Examples:
      | tableName    | verificationRecordType                | verificationQueryType              |
      | demandTable  | putTestDemandVerificationStatus       | getVerificationStatus              |
      | demandTable  | putGlobalUserIdTestDemandVerificationStatus | getVerificationStatusGlobalUserId |
```

**Key Characteristics**:
- **Tags**: Used for filtering test execution (e.g., `@api`, `@verification-status`)
- **Scenario Outlines**: Enable data-driven testing with example tables
- **Step Definitions**: Steps are defined in JavaScript files under `features/lib/`
- **Real Environment**: Tests run against actual deployed AppSync APIs (qa1, qa2, dev1)

### Mocking Strategy

**Unit Tests**:
- **No external mocks needed**: Unit tests use AWS AppSync's `EvaluateCodeCommand` which runs resolver/function code in an isolated runtime
- **Context mocking**: Tests construct mock `Context` objects with required properties (arguments, stash, env)
- **Compiled code testing**: Tests run against built JavaScript files in `dist/` rather than TypeScript source

**Feature Tests**:
- **No mocking**: Feature tests run against real deployed environments with actual data sources
- **Test data setup**: Tests use DynamoDB and other services to set up test data via step definitions
- **Environment isolation**: Tests target non-production environments (qa/dev)

## CI Configuration

### Pipeline Structure

The GitLab CI pipeline (`.gitlab-ci.yml`) runs tests at multiple stages:

**Stage: unit tests**
```yaml
unit tests:
  stage: unit tests
  script:
    - npx run test
  allow_failure: false
```
- Runs after build stage
- Blocks deployment if tests fail
- Runs on all branches

**Stage: features nonprod**
```yaml
qa features:
  stage: features nonprod
  script:
    - DEBUG='verifiedfan:*' DEBUG_DEPTH=8 npx run features
  retry: 1
  except:
    - develop
```
- Runs after deployment to qa1 (feature branches)
- Tests against deployed API
- Enables debug logging
- Retries once on failure

```yaml
dev features:
  stage: features nonprod
  script:
    - DEBUG='verifiedfan:*' DEBUG_DEPTH=8 npx run features
  only:
    - develop
```
- Runs after deployment to dev1 (develop branch)
- Same configuration as qa features

### Test Execution Flow

**Feature Branch**:
1. `yarn` - Install dependencies
2. `eslint` - Lint checks
3. `build` - Build TypeScript and schema
4. `unit tests` - Run Jest tests (blocking)
5. Manual deploy to qa1 (required)
6. `qa features` - Run Cucumber tests against qa1

**Develop Branch**:
1. `yarn` - Install dependencies
2. `eslint` - Lint checks
3. `build` - Build TypeScript and schema
4. `unit tests` - Run Jest tests (blocking)
5. Auto-deploy to qa1, dev1, preprod1
6. `dev features` - Run Cucumber tests against dev1

### Coverage Requirements

No explicit coverage thresholds are configured in Jest, but the CI pipeline enforces:
- All unit tests must pass before deployment
- Feature tests must pass after deployment to validate the deployed API
- ESLint checks must pass

### Artifacts

Feature tests generate artifacts:
```yaml
artifacts:
  paths:
    - reports
```
- Contains Cucumber JSON reports
- Can be used for HTML report generation
- Available for 30 days (default)

## Testing AppSync Code

### Evaluation Approach

The `spec/support.ts` helper provides the `evaluateCode()` function which:
1. Loads compiled JavaScript from `dist/functions/` or `dist/resolvers/`
2. Sends code to AWS AppSync's `EvaluateCodeCommand`
3. Executes the code using AppSync's JavaScript runtime
4. Returns the result, error, and stash

This approach ensures tests run against the actual AppSync runtime environment, validating:
- JavaScript syntax compatibility
- AppSync utility function behavior (`util.error()`, `runtime.earlyReturn()`, etc.)
- Context manipulation and stash usage
- Request/response handler logic

### Test Dependencies

Tests require:
- Built JavaScript files in `dist/` (generated by `npx run build`)
- AWS credentials for AppSync API calls (uses default AWS SDK credential chain)
- TypeScript definitions from `@aws-appsync/utils`

## Test Data Management

### Unit Tests
- Use inline test data in spec files
- Create mock context objects with required properties
- No external test data files

### Feature Tests
- Use input files in `features/lib/inputs/` (implied by step definitions)
- Set up test data in DynamoDB tables via step definitions
- Clean up test data after scenarios (best practice)

## Continuous Improvement

### Adding New Tests

**For New Functions/Resolvers**:
1. Create `.spec.ts` file alongside source file
2. Test both `request()` and `response()` handlers
3. Include edge cases and error scenarios
4. Run `npx run test` locally before committing

**For New Features**:
1. Add scenarios to appropriate `.feature` file
2. Implement step definitions in `features/lib/`
3. Run `npx run features` locally against qa environment
4. Ensure scenarios have appropriate tags for filtering

### Test Maintenance

- Keep test data minimal and focused
- Update tests when resolvers/functions change
- Remove obsolete tests when features are deprecated
- Monitor CI test execution time and optimize slow tests
