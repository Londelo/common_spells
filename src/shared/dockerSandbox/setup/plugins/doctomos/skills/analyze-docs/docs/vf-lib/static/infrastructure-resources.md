# Infrastructure Resources - vf-lib

## Overview

This is a **library repository** that publishes npm packages. It does not deploy cloud resources or services. The infrastructure consists of the build and release pipeline only.

## NPM Packages

This is a Lerna monorepo publishing 48+ independent npm packages under the `@verifiedfan` scope.

### Package Management

- **Tool**: Lerna v4.0.0
- **Versioning**: Independent versioning per package
- **Registry**: npmjs.org
- **Conventional Commits**: Enabled for automated versioning

### Key Packages (Sample)

The repository contains the following package categories:

**Authentication & Security**
- `jwt` - JWT token handling
- `crypto` - Cryptographic utilities

**AWS Integration**
- `aws` - AWS SDK utilities

**Data Processing**
- `avro` - Avro format handling
- `batch-fn` - Batch processing functions
- `batch-transform-stream` - Stream batch transformations
- `flatten-transform-stream` - Stream flattening
- `reduce-lines-from-stream` - Stream line reduction
- `csv-write-stream` - CSV writing utilities

**Third-Party Integrations**
- `apple-music` - Apple Music API integration
- `bitly` - Bitly URL shortener integration
- `facebook` - Facebook API integration

**Utilities**
- `date` - Date handling utilities
- `delay` - Delay/timeout utilities
- `normalizers` - Data normalization
- `locale` - Localization utilities
- `configs` - Configuration management

**Logging & Monitoring**
- `access-log` - Access logging utilities
- `cloudwatch-stdout` - CloudWatch stdout integration
- `tracing` - Distributed tracing utilities

**Testing**
- `test-utils` - Testing utilities
- `cucumber-features` - Cucumber BDD features

### Package Discovery

To see all packages:
```bash
ls packages/
```

Each package has its own:
- `package.json` with independent versioning
- `src/` directory with source code
- `dist/` directory with compiled output (after build)
- Optional `integrationTests/` directory

## Build Artifacts

**Artifact Storage**: GitLab CI artifacts (1 day retention)

**Artifacts Include**:
- `node_modules/` (root and per-package)
- `packages/*/dist/` (compiled JavaScript/TypeScript)
- `packages/*/package.json`
- `packages/*/package-lock.json`

## No Cloud Resources

This repository does NOT provision or manage:
- Lambda functions
- Databases (DynamoDB, RDS, etc.)
- Message queues (SQS, Kinesis, etc.)
- Storage buckets (S3)
- API Gateways
- Load balancers
- VPCs or networking resources

All packages are consumed as npm dependencies by other services.
