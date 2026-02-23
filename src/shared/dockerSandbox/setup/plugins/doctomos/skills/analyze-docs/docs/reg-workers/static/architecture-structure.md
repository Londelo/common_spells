# Architecture Structure - reg-workers

## Directory Layout

```
/Users/Brodie.Balser/Documents/TM/vf/registration/workers/
├── apps/                       # Worker Lambda functions organized by domain
│   ├── dataPipeline/          # Data pipeline workers (Kafka publishing)
│   │   ├── processData/       # Formats data and fans out to SNS
│   │   └── sendData/          # Validates and publishes to Kafka
│   ├── notification/          # Email notification workers
│   │   ├── getMarketsToNotify/    # Identifies markets needing notifications
│   │   ├── notificationGenerator/ # Generates notification data
│   │   ├── planSends/             # Plans email send schedule
│   │   └── triggerReminderEmail/  # Sends reminder emails
│   ├── registration/          # Fan registration and eligibility
│   │   ├── checkEligibility/  # Validates fan eligibility (AppSync)
│   │   └── upsertUsers/       # Batch user info updates (SQS)
│   ├── replication/           # DynamoDB → Entry Service replication
│   │   ├── enqueueEntries/    # Filters and queues entries (DDB Stream)
│   │   ├── retryScore/        # Retries failed score updates (SQS)
│   │   └── saveEntries/       # Replicates to Entry Service (SQS)
│   ├── selection/             # Winner selection and code assignment
│   │   ├── enqueueMarketSelections/ # Processes selections (Step Function)
│   │   ├── markAssignedCodes/       # Marks codes as used (DDB Stream)
│   │   ├── refreshSelections/       # Refreshes existing selections (SQS)
│   │   └── saveSelections/          # Assigns codes to winners (SQS)
│   └── templates/             # Worker template scaffolding
├── configs/                   # Multi-environment configuration
│   ├── default.config.yml     # Base config (worker registry, AWS clients)
│   ├── dev.config.yml         # Dev environment overrides
│   ├── qa.config.yml          # QA environment overrides
│   ├── preprod.config.yml     # Preprod environment overrides
│   └── prod.config.yml        # Production environment overrides
├── features/                  # Cucumber BDD integration tests
│   ├── integrationTests/      # Worker integration tests
│   ├── e2eTests/              # End-to-end workflow tests
│   ├── lib/                   # Test helper utilities
│   │   ├── inputs/            # Test input generators
│   │   └── results/           # Test result validators
│   ├── step_definitions/      # Cucumber step implementations
│   └── cucumberSetup.js       # Test environment setup
├── shared/                    # Shared libraries and utilities
│   ├── appResolver/           # Worker discovery and loading
│   │   ├── map.js             # Auto-imports workers from apps/
│   │   └── Worker.ts          # TypeScript worker type definitions
│   ├── config/                # Configuration management
│   │   ├── index.js           # Config loader (@verifiedfan/configs)
│   │   └── resolveWorkerConfig.js # Worker-specific config resolver
│   ├── middlewares/           # Middleware pipeline components
│   │   ├── index.js           # Middleware composer (by type)
│   │   ├── ComposeMiddlewares.js  # Pipeline orchestrator
│   │   ├── correlation.js     # Correlation ID injection
│   │   ├── services.js        # Service dependency injection
│   │   ├── authentication.js  # JWT validation
│   │   ├── resultHandler.js   # Response formatting
│   │   ├── batchItemResultHandler.js # SQS partial failure handling
│   │   ├── telemetry/         # OpenTelemetry tracing
│   │   └── transformInput/    # Event source transformers
│   ├── services/              # External service clients
│   │   ├── index.ts           # Service registry and initialization
│   │   ├── aws/               # AWS SDK clients (DynamoDB, SQS, SNS)
│   │   ├── campaigns.ts       # Campaign Service HTTP client
│   │   ├── codes.ts           # Code Service HTTP client
│   │   ├── entries.ts         # Entry Service HTTP client
│   │   ├── users.ts           # User Service HTTP client
│   │   ├── exports.ts         # Export Service HTTP client
│   │   ├── kafka/             # Kafka producer clients
│   │   ├── redis.ts           # Redis cache client
│   │   ├── mongo.ts           # MongoDB client
│   │   └── queue/             # SQS queue managers
│   ├── types/                 # TypeScript type definitions
│   │   ├── campaign.ts        # Campaign domain types
│   │   ├── market.ts          # Market domain types
│   │   ├── scoring.ts         # Scoring/selection types
│   │   ├── notification.ts    # Notification types
│   │   ├── dynamoDb.ts        # DynamoDB record types
│   │   └── dataPipeline/      # Data pipeline schemas
│   ├── util/                  # Shared utility functions
│   │   ├── generator.ts       # Async generator utilities
│   │   ├── result.ts          # Result monad pattern
│   │   ├── error.ts           # Error formatting
│   │   └── paginateRecords.ts # Pagination helpers
│   ├── workerConfig.js        # Worker config reader
│   ├── constants.js           # Application constants
│   └── enums.js               # Shared enumerations
├── terraform/                 # Infrastructure as Code
│   └── stacks/                # Terraform modules per domain
│       ├── registration/      # Registration stack (checkEligibility, upsertUsers)
│       ├── replication/       # Replication stack (saveEntries, etc.)
│       ├── selection/         # Selection stack (enqueueMarketSelections, etc.)
│       ├── dataPipeline/      # Data pipeline stack
│       └── notification/      # Notification stack
├── tools/                     # Operational CLI tools
│   ├── setupWorker/           # Worker scaffolding generator
│   ├── invokeWorker.js        # Local worker invocation
│   ├── uploadInvites/         # Invite list uploader
│   ├── generateCerts/         # Kafka cert generator
│   ├── addNewShows/           # Show configuration tool
│   └── refreshRegistration/   # Registration refresh utility
├── gitlab-ci/                 # GitLab CI/CD pipeline configs
│   └── stacks/                # Per-stack deployment jobs
├── types/                     # Root-level type definitions
│   └── index.d.ts             # Global type declarations
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── webpack.config.babel.js    # Webpack bundler config
├── babel.config.json          # Babel transpiler config
├── .eslintrc.yml              # ESLint rules (functional programming)
├── runfile.js                 # Runjs task runner
└── README.md                  # Repository documentation
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `apps/` | Lambda function handlers organized by domain (registration, replication, selection, dataPipeline, notification) |
| `shared/` | Reusable libraries: middleware, services, types, utilities |
| `configs/` | Environment-specific YAML configuration files |
| `features/` | Cucumber BDD integration and E2E tests |
| `terraform/` | Infrastructure as Code (Terraform modules per stack) |
| `tools/` | Operational CLI utilities for development and maintenance |
| `gitlab-ci/` | CI/CD pipeline definitions for automated testing and deployment |
| `shared/middlewares/` | Composable middleware components for Lambda event processing |
| `shared/services/` | External service clients (HTTP, AWS, Kafka, Redis, MongoDB) |
| `shared/types/` | TypeScript type definitions for domain models |

## Entry Points

| File | Purpose | Middleware Type |
|------|---------|----------------|
| `apps/registration/checkEligibility/index.ts` | Validates fan eligibility before registration | AppSync Resolver |
| `apps/registration/upsertUsers/index.ts` | Batch upserts user info to User Service | SQS Batch Consumer |
| `apps/replication/enqueueEntries/index.ts` | Filters DynamoDB changes and queues for replication | DynamoDB Kinesis Stream Consumer |
| `apps/replication/saveEntries/index.ts` | Replicates entries to Entry Service with validation | SQS Batch Consumer |
| `apps/replication/retryScore/index.ts` | Retries failed score updates in Entry Service | SQS Batch Consumer |
| `apps/selection/enqueueMarketSelections/index.ts` | Processes market selections and reserves codes | SDK Invoked (Step Function) |
| `apps/selection/saveSelections/index.ts` | Assigns codes to winners via Entry Service | SQS Batch Consumer |
| `apps/selection/refreshSelections/index.ts` | Refreshes existing market selections | SQS Batch Consumer |
| `apps/selection/markAssignedCodes/index.ts` | Marks codes as assigned in Code Service | DynamoDB Kinesis Stream Consumer |
| `apps/dataPipeline/processData/index.ts` | Formats and fans out data to type-specific queues | SQS Batch Consumer |
| `apps/dataPipeline/sendData/index.ts` | Validates and publishes data to Kafka topics | SQS Batch Consumer |
| `apps/notification/notificationGenerator/index.ts` | Generates notification data for campaigns | Scheduled (EventBridge) |
| `apps/notification/planSends/index.ts` | Plans email send schedule with rate limiting | Scheduled (EventBridge) |
| `apps/notification/triggerReminderEmail/index.ts` | Triggers reminder emails for campaigns | Scheduled (EventBridge) |
| `apps/notification/getMarketsToNotify/index.ts` | Identifies markets requiring notifications | SDK Invoked |

All workers are exported as `default` and dynamically loaded by `shared/appResolver/map.js` based on the `APP_NAME` environment variable.

## File Organization Pattern

**By Domain**: Workers are organized into feature-based domains (registration, replication, selection, dataPipeline, notification), each representing a bounded context in the event-driven architecture.

**By Worker**: Each worker is a self-contained directory under its domain with:
- `index.ts` - Main handler function
- `types.ts` - Worker-specific TypeScript types
- Helper modules (business logic, validation, formatting)
- `*.spec.ts` - Unit tests (co-located with implementation)

**Shared Code**: Common functionality is extracted to `shared/`:
- **Horizontal concerns** (middleware, services) are in `shared/middlewares/` and `shared/services/`
- **Domain models** are in `shared/types/`
- **Utilities** are in `shared/util/`

**Configuration as Code**: Workers are registered in `configs/default.config.yml` with metadata (nameTag, inventoryCode, middlewareType, stack). This registry enables:
- Auto-discovery by `shared/appResolver/map.js`
- Per-worker config resolution via `shared/config/resolveWorkerConfig.js`
- Terraform resource generation

**No Barrel Exports**: The codebase avoids index.ts barrel exports to reduce bundle size. Each module is imported directly from its file path.

**Functional File Structure**: Files are small (max 200 lines per ESLint config) and focused on single responsibilities, supporting the functional programming paradigm enforced by ESLint rules.
