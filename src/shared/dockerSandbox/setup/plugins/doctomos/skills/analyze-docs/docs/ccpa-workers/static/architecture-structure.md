# Architecture Structure - ccpa-workers

## Directory Layout

```
ccpa-workers/
├── apps/                        # Individual Lambda worker applications
│   ├── deleteFan/              # Worker: Delete user data (CCPA erasure)
│   ├── fanInfo/                # Worker: Retrieve user data (CCPA disclosure)
│   ├── keepPrivate/            # Worker: Do-not-sell opt-out
│   ├── optOut/                 # Worker: Unsubscribe from communications
│   ├── processRequest/         # Worker: Initial request router
│   ├── saveDisclosures/        # Worker: Save disclosure data
│   ├── updateDictionary/       # Worker: Update data dictionary
│   └── templates/              # Template for creating new workers
├── shared/                      # Shared infrastructure and utilities
│   ├── appResolver/            # Worker discovery and loading
│   ├── config/                 # Configuration management
│   ├── entryFiles/             # Lambda entry point (handler)
│   ├── middlewares/            # Middleware pipeline components
│   │   └── transformInput/     # Event source transformers (SQS, Kinesis, etc.)
│   ├── services/               # External service clients
│   │   ├── aws/               # AWS service clients
│   │   ├── mongo/             # MongoDB client
│   │   ├── privacyCore/       # Privacy platform integration
│   │   ├── users/             # User service client
│   │   ├── entries/           # Entries service client
│   │   ├── campaigns/         # Campaigns service client
│   │   └── slack/             # Slack notifications
│   └── PutManyToStream/        # Kinesis/Firehose batch utilities
├── configs/                     # Environment configurations (YAML)
│   ├── default.config.yml      # Base configuration
│   ├── dev.config.yml          # Development overrides
│   ├── qa.config.yml           # QA overrides
│   ├── preprod.config.yml      # Pre-production overrides
│   └── prod.config.yml         # Production overrides
├── terraform/                   # Infrastructure as code
│   ├── tm-nonprod/             # Non-production Lambda deployments
│   ├── tm-prod/                # Production Lambda deployments
│   ├── templates/              # Terraform templates for workers
│   └── stacks/                 # Reusable infrastructure stacks
├── tools/                       # Developer utilities
│   ├── setupWorker/            # CLI tool to create new workers
│   ├── invokeWorker.js         # Local worker invocation
│   └── findAwsResources.js     # AWS resource discovery
├── features/                    # Cucumber BDD tests
│   ├── lib/                    # Test fixtures and utilities
│   └── step_definitions/       # Test step implementations
└── gitlab-ci/                   # CI/CD pipeline definitions
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| **apps/** | Individual Lambda worker applications - each subdirectory is a deployable function |
| **shared/** | Common infrastructure shared by all workers (entry point, middleware, services) |
| **shared/middlewares/** | Composable middleware pipeline for event processing |
| **shared/services/** | Service layer for external integrations (AWS, MongoDB, HTTP services) |
| **configs/** | Environment-specific YAML configurations merged at runtime |
| **terraform/** | Infrastructure provisioning per worker and environment |
| **tools/** | Developer CLI utilities for creating and testing workers |
| **features/** | Cucumber BDD integration tests |

## Entry Points

| File | Purpose |
|------|---------|
| **shared/entryFiles/lambda.js** | AWS Lambda handler - entry point for all deployed workers |
| **shared/appResolver/index.js** | Resolves APP_NAME environment variable to specific worker implementation |
| **apps/*/index.js** | Individual worker implementation (business logic) |

## File Organization Pattern

**Per-Worker Structure**: Each worker lives in its own directory under `apps/` with:
- **index.js**: Main worker logic (business logic entry point)
- **Supporting modules**: Helper functions specific to that worker
- **Tests**: Co-located `.spec.js` files

**Shared Infrastructure Pattern**: Common functionality extracted to `shared/`:
- **Middleware pipeline**: Composable functions that wrap workers
- **Service layer**: Abstracted external dependencies
- **Configuration**: Environment-aware config resolution

**Event Source Separation**: Different event sources (SQS, Kinesis, SNS, etc.) have dedicated input transformers in `shared/middlewares/transformInput/`

**Configuration-Driven Deployment**: Each worker's deployment characteristics defined in YAML configs:
- `middlewareType`: Determines which event source and middleware pipeline
- `queueName`: Associated SQS queue (for queue-based workers)
- `entryFile`: Lambda handler type
- `inventoryCode`: Unique identifier for infrastructure

## Worker Discovery Mechanism

Workers are dynamically loaded based on the `APP_NAME` environment variable:
1. Lambda handler calls `InstrumentedApp()` from `shared/appResolver/`
2. App resolver looks up `APP_NAME` in worker map
3. Loads corresponding worker module from `apps/{APP_NAME}/index.js`
4. Wraps with middleware pipeline based on worker's `middlewareType` config
5. Returns instrumented, middleware-wrapped worker function
