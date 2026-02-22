# Architecture Structure - dmd-pipeline

## Overview

The demand-pipeline is a TypeScript-based data pipeline that processes DynamoDB change records from Kinesis, transforms them into Avro or Parquet format, and stores them in S3 for analytics and querying with AWS Athena.

## Directory Layout

```
demand-pipeline/
├── src/                          # Source code
│   ├── lambda/                   # Lambda function handlers
│   │   └── deliveryWorker/       # Kinesis consumer handler
│   ├── core/                     # Core business logic
│   │   ├── deliverDemandRecords.ts  # Main delivery orchestration
│   │   └── parse.ts              # DynamoDB record parsing
│   ├── delivery/                 # Storage delivery implementations
│   │   ├── S3Storage.ts          # S3 storage implementation
│   │   ├── Storage.ts            # Storage interface
│   │   └── ArchiveDelivery.ts    # Delivery result types
│   ├── format/                   # Data format encoders
│   │   ├── avro/                 # Avro encoding
│   │   │   ├── index.ts          # Avro format implementation
│   │   │   └── schemas/          # Avro schema definitions
│   │   └── parquet/              # Parquet encoding
│   │       ├── index.ts          # Parquet format implementation
│   │       └── schemas/          # Parquet schema definitions
│   ├── demand/                   # Domain models
│   │   ├── DemandRecord.ts       # Record type definitions
│   │   ├── reference.ts          # Reference field logic
│   │   └── systemId.ts           # System ID field logic
│   ├── athena/                   # Athena table schemas
│   │   └── schemas/              # Athena schema definitions
│   ├── util/                     # Utility functions
│   ├── tasks/                    # CLI tasks
│   │   ├── backfill.ts           # Backfill operations
│   │   └── console.ts            # Console tasks
│   ├── services.ts               # Dependency injection container
│   └── logger.ts                 # Logging configuration
├── test/                         # Test suites
│   ├── e2e/                      # End-to-end tests
│   ├── integration/              # Integration tests
│   ├── support/                  # Test utilities
│   │   ├── fixtures/             # Test data
│   │   ├── DynamoDBConnection.ts # Test DB connection
│   │   └── records.ts            # Test record builders
│   └── config/                   # Test environment configs
├── terraform/                    # Infrastructure as code
│   ├── tm-nonprod/               # Non-prod environments
│   │   ├── dev1/                 # Dev environment
│   │   └── qa1/                  # QA environment
│   ├── tm-prod/                  # Production environments
│   │   ├── preprod1/             # Pre-production
│   │   └── prod1/                # Production
│   ├── lambda.tf                 # Lambda configuration
│   ├── kinesis.tf                # Kinesis stream reference
│   ├── s3.tf                     # S3 bucket configuration
│   ├── athena.tf                 # Athena table setup
│   ├── dynamodb.tf               # DynamoDB reference
│   └── iam.tf                    # IAM policies
├── config/                       # Environment configurations
├── package.json                  # Dependencies & scripts
└── README.md                     # Project documentation
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/lambda/` | Lambda function entry points and handlers |
| `src/core/` | Core domain logic for processing and delivering records |
| `src/delivery/` | Storage abstraction and S3 implementation |
| `src/format/` | Data format encoders (Avro/Parquet) with schemas |
| `src/demand/` | Domain models and type definitions for demand records |
| `src/athena/` | Athena table schema definitions for querying |
| `src/util/` | Shared utility functions |
| `src/tasks/` | Command-line operational tasks |
| `test/e2e/` | End-to-end integration tests |
| `test/integration/` | Component integration tests |
| `test/support/` | Test fixtures and utilities |
| `terraform/` | Infrastructure as code for all environments |
| `config/` | Environment-specific configuration files |

## Entry Points

| File | Purpose |
|------|---------|
| `src/lambda/deliveryWorker/index.ts` | Lambda handler for Kinesis stream processing |
| `src/services.ts` | Service container for dependency injection |
| `src/core/deliverDemandRecords.ts` | Main business logic entry point |
| `src/tasks/backfill.ts` | Backfill operations entry point |
| `src/tasks/console.ts` | Console tasks entry point |

## File Organization Pattern

The codebase follows a **modular layered architecture** organized by technical concern:

### By Function
- **Lambda handlers** (`src/lambda/`) - Entry points for serverless functions
- **Core logic** (`src/core/`) - Business logic and orchestration
- **Infrastructure** (`src/delivery/`, `src/format/`) - Technical implementations
- **Domain** (`src/demand/`) - Domain models and types

### By Type
Each major module contains:
- Interface definitions (e.g., `Storage.ts`)
- Concrete implementations (e.g., `S3Storage.ts`)
- Related types and errors (e.g., `ArchiveDelivery.ts`)

### Schema Organization
Schemas are co-located with their implementations:
- `src/format/avro/schemas/` - Avro schemas for encoding
- `src/format/parquet/schemas/` - Parquet schemas for encoding
- `src/athena/schemas/` - Athena table schemas for querying

### Test Organization
Tests mirror the source structure:
- Unit tests: Co-located with source (`.test.ts` files)
- Integration tests: `test/integration/`
- E2E tests: `test/e2e/`
- Test fixtures: `test/support/fixtures/`

### Configuration Management
- Runtime config: `config/` directory with environment-specific files
- Infrastructure: `terraform/` organized by account and environment
- Test config: `test/config/` for test environment setup

## Build Artifacts

| Directory | Purpose |
|-----------|---------|
| `dist/` | Compiled TypeScript output (not in repo) |
| `.yarn/` | Yarn package manager cache |

## Dependencies

Key external dependencies:
- **AWS SDK**: S3, DynamoDB, Kinesis, Athena clients
- **@ticketmaster/lambda**: Lambda framework and utilities
- **avsc**: Apache Avro implementation
- **parquets**: Apache Parquet implementation
- **winston**: Logging framework
- **jest**: Testing framework
- **typescript**: Language compiler
