# Architecture Structure - dmd-workers

## Directory Layout

```
/Users/Brodie.Balser/Documents/TM/demand-capture/workers/
├── apps/                          # Individual Lambda worker functions
│   ├── demandStreamToSqs/        # DynamoDB stream → SQS processor
│   ├── eventDetails/             # AppSync resolver for event details
│   ├── notificationGenerator/    # Scheduled notification creator
│   ├── notificationScheduler/    # Scheduled notification scheduler
│   ├── notificationSend/         # DynamoDB stream → SMS sender
│   ├── proxyTmAccountService/    # AppSync resolver for TM accounts
│   ├── shortenEventUrl/          # SQS consumer for URL shortening
│   ├── smsStatusConsumer/        # Kinesis consumer for SMS status
│   ├── template/                 # Template for new workers
│   └── templates/                # Additional worker templates
├── configs/                       # YAML configuration per environment
│   ├── default.config.yml        # Default configuration
│   ├── dev.config.yml            # Dev environment overrides
│   ├── local-dev.config.yml      # Local development config
│   ├── preprod.config.yml        # Pre-production config
│   ├── prod.config.yml           # Production config
│   ├── qa.config.yml             # QA environment config
│   └── schema.yml                # Configuration schema
├── features/                      # Cucumber BDD integration tests
│   ├── integrationTests/         # Feature files per worker
│   ├── lib/                      # Test utilities and fixtures
│   │   ├── inputs/               # Mock inputs for tests
│   │   ├── results/              # Expected test results
│   │   └── shared/               # Shared test records/proxies
│   ├── step_definitions/         # Cucumber step definitions
│   └── cucumberSetup.js          # Test framework setup
├── gitlab-ci/                     # CI/CD configuration
├── shared/                        # Shared utilities and infrastructure
│   ├── appResolver/              # Worker discovery and loading
│   │   ├── index.js              # App resolution logic
│   │   ├── map.js                # App name → module mapping
│   │   ├── registerTsNode.js     # TypeScript support
│   │   └── Worker.ts             # Worker type definitions
│   ├── config/                   # Configuration management
│   │   ├── index.js              # Config loader
│   │   ├── resolveWorkerConfig.js # Worker-specific config
│   │   ├── overrideDefaults.js   # Environment overrides
│   │   └── trimForBundle.js      # Config bundling for Lambda
│   ├── entryFiles/               # Lambda entry points
│   │   └── lambda.js             # Main Lambda handler
│   ├── middlewares/              # Middleware pipeline
│   │   ├── index.js              # Middleware composition
│   │   ├── ComposeMiddlewares.js # Middleware chaining
│   │   ├── correlation.js        # Request correlation IDs
│   │   ├── telemetry.ts          # OpenTelemetry tracing
│   │   ├── services.js           # Service injection
│   │   ├── transformInput/       # Event source transformations
│   │   │   ├── kinesis/          # Kinesis stream transforms
│   │   │   ├── dynamodb/         # DynamoDB stream transforms
│   │   │   ├── sqs/              # SQS message transforms
│   │   │   ├── kafka/            # Kafka message transforms
│   │   │   ├── appsync/          # AppSync resolver transforms
│   │   │   ├── firehose/         # Firehose record transforms
│   │   │   ├── s3/               # S3 event transforms
│   │   │   └── sns/              # SNS notification transforms
│   │   ├── resultHandler.js      # Standard result handling
│   │   ├── batchItemResultHandler.js # Batch processing results
│   │   └── firehoseResultHandler.js # Firehose-specific results
│   ├── services/                 # External service clients
│   │   ├── aws/                  # AWS SDK clients
│   │   ├── mongo/                # MongoDB client
│   │   ├── redis/                # Redis client
│   │   ├── accounts/             # TM Accounts API
│   │   ├── discovery/            # TM Discovery API
│   │   ├── bitly/                # Bitly URL shortening
│   │   ├── sms/                  # SMS service
│   │   └── request/              # HTTP request utilities
│   ├── GetAndCacheEventDetails/  # Event details caching logic
│   ├── ShortenEventUrl/          # URL shortening utilities
│   ├── Log.js                    # Logging wrapper
│   ├── enums.js                  # Shared constants
│   └── instrumentation.js        # Observability instrumentation
├── terraform/                     # Infrastructure as Code
│   ├── lambda.tf                 # Lambda function resources
│   ├── iam.tf                    # IAM roles and policies
│   ├── event_source.tf           # Event source mappings
│   ├── cloudwatch.tf             # CloudWatch logs/alarms
│   ├── modules/                  # Reusable Terraform modules
│   ├── tm-nonprod/               # Non-prod environment configs
│   └── tm-prod/                  # Production environment configs
├── tools/                         # Developer tooling
│   ├── setupWorker/              # Worker creation tool
│   ├── invokeWorker.js           # Local invocation utility
│   ├── publishSuppression/       # Suppression management
│   └── findAwsResources.js       # AWS resource discovery
├── package.json                   # Node.js dependencies
├── webpack.config.babel.js       # Bundle configuration
├── babel.config.json             # Babel transpilation
├── tsconfig.json                 # TypeScript configuration
├── .eslintrc.yml                 # Linting rules
└── runfile.js                    # Task runner definitions
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `apps/` | Individual Lambda workers - each subfolder is a separate AWS Lambda function |
| `configs/` | YAML configuration files with environment-specific overrides |
| `features/` | BDD integration tests using Cucumber |
| `shared/` | Reusable code shared across all workers (middlewares, services, utilities) |
| `shared/appResolver/` | Worker discovery and bootstrapping logic |
| `shared/config/` | Configuration loading and resolution |
| `shared/entryFiles/` | Lambda handler entry point |
| `shared/middlewares/` | Middleware pipeline for request processing |
| `shared/services/` | External service clients (AWS, MongoDB, Redis, APIs) |
| `terraform/` | Infrastructure as Code for AWS resources |
| `tools/` | Developer utilities and scripts |

## Entry Points

| File | Purpose |
|------|---------|
| `shared/entryFiles/lambda.js` | Main AWS Lambda handler - entry point for all deployed workers |
| `apps/*/index.js` | Worker-specific business logic (invoked by middleware pipeline) |
| `shared/appResolver/index.js` | Resolves `APP_NAME` environment variable to correct worker module |
| `webpack.config.babel.js` | Bundles workers into deployable Lambda packages |

## File Organization Pattern

The repository follows a **serverless multi-function monorepo** pattern:

- **Worker isolation**: Each worker in `apps/` is self-contained with its own business logic
- **Shared infrastructure**: Common code in `shared/` provides middleware, services, and utilities
- **Configuration-driven**: Worker behavior is configured via YAML files in `configs/`
- **Middleware-based**: All workers follow a consistent middleware pipeline pattern
- **Event source polymorphism**: Same worker code can handle different AWS event sources (Kinesis, DynamoDB, SQS, etc.) via middleware transforms

## File Naming Conventions

- **Worker names**: camelCase (e.g., `notificationGenerator`, `demandStreamToSqs`)
- **Config keys**: camelCase matching worker names
- **Inventory codes**: kebab-case abbreviations (e.g., `ntfcn-gnrtr`, `stream-to-sqs`)
- **Terraform resources**: Use inventory codes in AWS resource names
- **Test files**: `*.spec.js` for unit tests, `*.feature` for integration tests
- **TypeScript**: Mixed `.ts` and `.js` - newer code uses TypeScript, legacy uses JavaScript
