# Architecture Structure - vf-api-workers

## Directory Layout

```
vf-api-workers/
├── apps/                          # Individual Lambda worker functions
│   ├── loadScoresToDynamoDB/     # Kinesis consumer - saves scores to DynamoDB
│   ├── loadScoresToStream/       # S3 consumer - loads scores to Kinesis
│   ├── lookupPhoneScore/         # AppSync resolver - phone score lookup
│   ├── processSavedScores/       # DynamoDB stream consumer - count aggregation
│   ├── proxyCampaignService/     # AppSync resolver - campaign service proxy
│   ├── saveEntryScoring/         # Kinesis consumer - saves to entry service
│   ├── saveFanlistScores/        # Kinesis consumer - fanlist scoring
│   ├── templates/                # Worker template for new functions
│   └── verdictReporter/          # SQS consumer - Slack notifications
├── configs/                       # Environment-specific configuration
│   ├── default.config.yml        # Default configuration
│   ├── dev.config.yml            # Development environment
│   ├── qa.config.yml             # QA environment
│   ├── preprod.config.yml        # Pre-production environment
│   ├── prod.config.yml           # Production environment
│   ├── local-dev.config.yml      # Local development
│   └── schema.yml                # Configuration schema
├── shared/                        # Shared utilities and middleware
│   ├── appResolver/              # App loading and middleware composition
│   ├── config/                   # Configuration resolution
│   ├── entryFiles/               # Lambda handler entry points
│   ├── middlewares/              # Middleware pipeline components
│   │   ├── transformInput/       # Event source transformers
│   │   │   ├── kinesis/          # Kinesis stream transformation
│   │   │   ├── dynamodb/         # DynamoDB stream transformation
│   │   │   ├── kafka/            # Kafka event transformation
│   │   │   ├── sqs/              # SQS message transformation
│   │   │   ├── s3/               # S3 event transformation
│   │   │   ├── sns/              # SNS notification transformation
│   │   │   ├── appsync/          # AppSync resolver transformation
│   │   │   └── firehose/         # Firehose transformation
│   │   ├── ComposeMiddlewares.js # Middleware composition utility
│   │   ├── correlation.js        # Correlation ID tracking
│   │   ├── services.js           # Service injection
│   │   ├── telemetry.ts          # OpenTelemetry tracing
│   │   ├── resultHandler.js      # Result processing and error handling
│   │   ├── authentication.js     # JWT authentication
│   │   ├── fanout.js             # Fan-out controller
│   │   └── index.js              # Middleware type resolver
│   ├── services/                 # External service clients
│   │   ├── aws/                  # AWS client wrappers
│   │   ├── campaigns/            # Campaign service client
│   │   ├── entries/              # Entry service client
│   │   ├── users/                # User service client
│   │   ├── slack/                # Slack client
│   │   ├── telesign/             # TeleSign client
│   │   └── request/              # HTTP request utilities
│   ├── PutManyToStream/          # Stream batching utilities
│   ├── putToVerdictQueue/        # SQS queue utilities
│   ├── ValidateSchema/           # Schema validation
│   ├── utils/                    # General utilities
│   └── *.js                      # Shared modules
├── features/                      # Cucumber BDD tests
│   ├── lib/                      # Test utilities
│   ├── step_definitions/         # Test step implementations
│   └── hooks/                    # Test hooks
├── terraform/                     # Infrastructure as code
│   ├── tm-nonprod/               # Non-production environments
│   ├── tm-prod/                  # Production environments
│   ├── templates/                # Terraform templates
│   └── modules/                  # Reusable Terraform modules
├── tools/                         # Development and build tools
│   ├── setupWorker/              # Worker scaffolding tool
│   ├── invokeWorker.js           # Local worker invocation
│   ├── fanLookup.js              # Fan data lookup utility
│   └── *.js                      # Various tooling scripts
└── gitlab-ci/                     # CI/CD pipeline scripts
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| apps/ | Individual Lambda worker implementations, each with its own business logic |
| shared/ | Reusable code shared across all workers (middleware, utilities, services) |
| shared/middlewares/ | Pipeline stages that wrap worker logic (input transformation, services, result handling) |
| shared/services/ | External service clients (AWS, HTTP APIs, third-party integrations) |
| configs/ | Environment-specific YAML configuration files |
| terraform/ | Infrastructure definitions for deploying workers to AWS |
| features/ | Cucumber BDD integration tests |
| tools/ | Developer utilities for creating, testing, and managing workers |

## Entry Points

| File | Purpose |
|------|---------|
| shared/entryFiles/lambda.js | Main Lambda handler entry point - routes to instrumented app |
| shared/appResolver/index.js | Resolves worker app by APP_NAME and wraps with middleware |
| shared/appResolver/map.js | Auto-generates map of worker names to their implementations |
| apps/{workerName}/index.js | Individual worker business logic (default export) |

## File Organization Pattern

**By Feature (Per Worker)**
- Each worker is a self-contained directory under `apps/`
- Worker contains its business logic, normalization functions, and tests
- Worker name maps to configuration in `configs/default.config.yml`

**By Layer (Shared Code)**
- Middleware organized by responsibility (input transformation, services, results)
- Services organized by integration type (AWS, HTTP APIs, third-party)
- Configuration centralized in `configs/` directory
- Entry point and app resolution centralized in `shared/`

**Configuration-Driven**
- Worker behavior defined in YAML configuration files
- Environment-specific overrides in separate config files
- Middleware type determines processing pipeline
- APP_NAME environment variable selects active worker

**Monorepo Structure**
- Multiple Lambda functions in single repository
- Shared code maximizes reusability
- Independent deployment per worker via Terraform
- Unified build and test tooling
