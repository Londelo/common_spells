# Testing Strategy - dmd-pipeline

## Overview

The dmd-pipeline project uses a comprehensive three-tier testing strategy:
- **Unit tests** located in `src/` alongside source code
- **Integration tests** in `test/integration/` for AWS service interactions
- **E2E tests** in `test/e2e/` for full pipeline validation

Tests run automatically in CI/CD pipeline before deployments to dev1, qa1, preprod, and prod environments.

## Test Organization

| Location | Type | Count | Description |
|----------|------|-------|-------------|
| src/**/*.test.ts | Unit tests | 5 | Tests for core logic, parsing, and lambda handlers |
| test/integration/ | Integration tests | 1 | AWS S3 storage integration tests |
| test/e2e/ | End-to-end tests | 4 | Full pipeline tests with DynamoDB → Kinesis → S3 → Athena |

## Frameworks Used

| Framework | Purpose | Configuration |
|-----------|---------|---------------|
| Jest | Unit, integration, and E2E testing | jest.config.ts |
| ts-jest | TypeScript transformation | Inline in jest.config.ts |
| @aws-sdk/* | AWS service mocking and real integrations | Test setup files |

## Test File Inventory

### Unit Tests (src/)
1. `src/core/parse.test.ts` - DynamoDB record parsing and validation
2. `src/core/deliverDemandRecords.test.ts` - Record delivery orchestration
3. `src/lambda/deliveryWorker/index.test.ts` - Lambda handler for Kinesis processing
4. `src/format/avro/index.test.ts` - Avro serialization
5. `src/format/parquet/index.test.ts` - Parquet serialization

### Integration Tests (test/integration/)
1. `test/integration/S3Storage.test.ts` - S3 bucket operations with real AWS credentials

### E2E Tests (test/e2e/)
1. `test/e2e/demand.test.ts` - Demand record pipeline flow
2. `test/e2e/sale.test.ts` - Sale record pipeline flow
3. `test/e2e/event.test.ts` - Event record pipeline flow
4. `test/e2e/notification.test.ts` - Notification record pipeline flow

## Running Tests

### Local Development

```bash
# Run all unit tests
npm test

# Run integration tests (requires AWS credentials)
npm run test:integration

# Run E2E tests (requires AWS credentials)
npm run test:e2e

# Run linting
npm run lint
```

### Environment Requirements

**Unit tests**: No external dependencies required

**Integration tests**:
- AWS credentials with S3 access
- IAM role assumption capability
- Environment variable `TEST_ENV` set to target environment (dev1, qa1, preprod1)
- Environment variable `AWS_REGION` set to us-east-1

**E2E tests**:
- AWS credentials with DynamoDB, Kinesis, S3, and Athena access
- IAM role assumption capability
- Environment variables `TEST_ENV` and `AWS_REGION` configured
- Test timeout extended to 600 seconds (10 minutes)

## Test Patterns

### Unit Tests

Unit tests focus on isolated logic without external dependencies:

**Pattern**: Pure function testing with mocked dependencies

```typescript
// Example from src/lambda/deliveryWorker/index.test.ts
const deliverDemandRecords = jest.fn().mockResolvedValue({
  deliveries: [],
  errors: []
})
const handler = DeliveryWorker({ deliverDemandRecords })
```

**Key characteristics**:
- Use Jest mocks for AWS SDK clients
- Test both success and error paths
- Validate data transformations
- Test record parsing with fixtures from `test/support/fixtures/`

### Integration Tests

Integration tests verify interactions with real AWS services:

**Pattern**: Real AWS service calls with test-specific prefixes and cleanup

```typescript
// Example from test/integration/S3Storage.test.ts
beforeEach(() => {
  const credentials = assumeRoleCredentials(config.aws.assumeRole)
  s3Storage = new S3Storage({ credentials, bucket, prefix: 'data-pipeline/test' })
})

afterAll(async () => {
  // Clean up test objects from S3
})
```

**Key characteristics**:
- Uses IAM role assumption for secure credential management
- Isolates test data with dedicated prefixes
- Cleans up resources after test execution
- Tests actual AWS service behavior

### E2E Tests

E2E tests validate the complete data pipeline:

**Pattern**: Write to DynamoDB → Poll Athena for results

```typescript
// Example from test/e2e/demand.test.ts
await test.dynamodb.put(demand)

const results = await pollAthena(async () => {
  await test.athena.executeQuery('MSCK REPAIR TABLE demand')
  return await test.athena.executeQuery(`SELECT * FROM demand WHERE eventid = '${demand.eventId}'`)
})
```

**Key characteristics**:
- Tests full pipeline: DynamoDB Streams → Kinesis → Lambda → S3 → Athena
- Uses polling to wait for asynchronous pipeline completion
- Validates data appears correctly in Athena
- Tests both creation and deletion flows
- Extended timeout (10 minutes) to accommodate pipeline latency

### Mocking Strategy

**Unit tests**: Mock all external dependencies
- AWS SDK clients mocked with Jest
- File system operations use real test fixtures
- Result types from `@ticketmaster/lambda/result` for error handling

**Integration tests**: Real AWS services with test isolation
- Assume IAM roles for credentials
- Use dedicated test prefixes in S3
- Clean up resources after tests

**E2E tests**: Real services with dedicated test environments
- Deploy to non-prod environments (dev1, qa1, preprod1)
- Use environment-specific configurations
- Poll for eventual consistency

## Test Configuration

### Main Jest Config (jest.config.ts)

```typescript
{
  moduleFileExtensions: ['ts', 'js'],
  transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
  testMatch: ['**/src/**/*.test.(ts|js)'],
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
}
```

**Purpose**: Unit tests in source directory

### E2E Jest Config (test/e2e/jest.config.ts)

```typescript
{
  ...defaultConfig,
  testMatch: ['<rootDir>/**/*.test.ts'],
  globalSetup: '<rootDir>/../globalSetup.ts',
  setupFilesAfterEnv: ['<rootDir>/setup.ts']
}
```

**Setup**: 10-minute timeout for async pipeline operations

### Integration Jest Config (test/integration/jest.config.ts)

Same structure as E2E config but runs tests in `test/integration/`.

## CI Configuration

### Pipeline Stages

From `.gitlab-ci.yml`:

1. **Build Stage**: Compile TypeScript (`yarn build`)
2. **Test Stage**:
   - `unit-tests`: Run unit tests (`yarn test`)
   - `lint`: Run ESLint (`yarn lint`)
3. **Environment Deploy Stages**: qa1, dev1, preprod, prod
4. **E2E Test Stages**: Run after each environment deployment
   - `integration-test-{env}`: Run integration tests
   - `e2e-test-{env}`: Run E2E tests

### Test Execution in CI

**Unit tests** (`unit-tests` job):
```yaml
stage: test
script: yarn test
tags: tm-nonprod cicd test
```

**Integration tests** (per environment):
```yaml
stage: e2e-test-{env}
script: yarn test:integration
variables:
  AWS_REGION: us-east-1
  TEST_ENV: {env}
```

**E2E tests** (per environment):
```yaml
stage: e2e-test-{env}
script: yarn test:e2e
variables:
  AWS_REGION: us-east-1
  TEST_ENV: {env}
```

### Environment Test Flow

1. **dev1**: Tests run automatically after every merge to `main`
2. **qa1**: Tests run automatically after every merge to `main`
3. **preprod**: Tests run automatically after every merge to `main`
4. **prod**: Manual deployment trigger, no automated tests in prod

### Coverage Requirements

No explicit coverage thresholds configured in Jest or CI pipeline. Coverage reporting is not currently enabled.

## Test Data Management

### Fixtures

Test fixtures stored in `test/support/fixtures/`:
- `event.json` - Sample event record
- `event2.json` - Event record without classification type

### Test Support Utilities

Located in `test/support/`:
- `records.ts` - Factory functions for test data (demand, sale, event)
- `poll.ts` - Polling utility for async operations
- `assumeRole.ts` - AWS IAM role assumption helper
- `DynamoDBConnection.ts` - DynamoDB test client

### Environment-Specific Configuration

Test configurations per environment in `test/config/`:
- `dev1.ts`
- `qa1.ts`
- `preprod1.ts`
- `index.ts` - Config loader based on `TEST_ENV`

## Key Testing Scenarios

### Record Parsing
- Valid demand, sale, event records
- Invalid records (error handling)
- REMOVE events (soft deletes)
- System ID extraction
- Reference ID generation

### Data Formats
- Avro container serialization
- Parquet file generation

### Pipeline Flow
- DynamoDB Streams trigger
- Kinesis event processing
- S3 delivery with partitioning
- Athena table availability
- Record deletion flow

### AWS Integration
- S3 bucket operations
- IAM role assumption
- Multi-account access patterns
