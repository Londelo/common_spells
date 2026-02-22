# Architecture Structure - fan-identity-workers

## Directory Layout

```
fan-identity-workers/
├── apps/                        # Individual Lambda worker functions
│   ├── auth/                   # Authentication domain
│   │   └── validateToken/      # JWT token validation worker
│   ├── botornot/               # Bot detection domain
│   │   └── startBotOrNotImport/
│   ├── clustering/             # Data clustering domain
│   │   └── startClusterImport/
│   ├── idv/                    # Identity verification domain
│   │   ├── checkLiveness/      # Liveness check worker
│   │   └── handleEvent/        # IDV event handler
│   ├── scoring/                # User scoring domain (primary)
│   │   ├── enqueueFromDemandStream/
│   │   ├── enqueueFromPurchaseStream/
│   │   ├── enqueueFromSQJourneyStream/
│   │   ├── enqueueFromStream/  # Kafka stream ingestion
│   │   ├── enqueueFromVfStream/
│   │   ├── getArmScore/        # AppSync resolver for ARM scores
│   │   ├── lookupArai/         # ARAI lookup service
│   │   ├── processRescoreEvents/
│   │   ├── scoreUsers/         # Main user scoring worker
│   │   └── stagingScoreUsers/  # Staging environment scoring
│   └── templates/              # Worker scaffolding templates
│       └── template/
├── shared/                      # Shared code library
│   ├── appResolver/            # Worker resolution and dependency injection
│   │   ├── index.js            # App loader and middleware orchestration
│   │   ├── map.js              # Worker name-to-module mapping
│   │   └── Worker.ts           # TypeScript type definitions
│   ├── config/                 # Configuration management
│   │   ├── index.js            # Config loader (Immutable.js)
│   │   ├── resolveWorkerConfig.js
│   │   └── overrideDefaults.js
│   ├── entryFiles/             # Lambda entry points
│   │   └── lambda.js           # Main Lambda handler
│   ├── middlewares/            # Middleware pipeline
│   │   ├── index.js            # Middleware type definitions
│   │   ├── ComposeMiddlewares.js # Middleware composition (Ramda)
│   │   ├── correlation.js      # Request correlation IDs
│   │   ├── telemetry.ts        # OpenTelemetry tracing
│   │   ├── services.js         # Service injection
│   │   ├── transformInput/     # Event source transformations
│   │   │   ├── kinesis/        # Kinesis stream decoding
│   │   │   ├── dynamodb/       # DynamoDB stream parsing
│   │   │   ├── sqs/            # SQS message parsing
│   │   │   ├── kafka/          # Kafka message parsing
│   │   │   ├── s3/             # S3 event parsing
│   │   │   ├── sns/            # SNS notification parsing
│   │   │   └── firehose/       # Kinesis Firehose parsing
│   │   ├── resultHandler.js    # Generic result handling
│   │   ├── SQSResultHandler.js # SQS batch response handling
│   │   ├── batchItemResultHandler.js
│   │   ├── firehoseResultHandler.js
│   │   ├── appSyncAuthorizerResultHandler.js
│   │   └── fanout.js           # Fan-out pattern controller
│   ├── services/               # Service layer abstractions
│   │   ├── index.ts            # Services type definitions
│   │   ├── aws/                # AWS SDK clients (DynamoDB, SQS)
│   │   ├── armRedis/           # ARM Redis client
│   │   ├── featureFlags/       # Unleash feature flag client
│   │   ├── identity/           # Identity service integration
│   │   ├── queue/              # SQS queue managers
│   │   ├── request/            # HTTP request client
│   │   ├── scoringModel/       # ML model integration
│   │   └── tmAccounts/         # Ticketmaster accounts service
│   ├── scoring/                # Scoring domain logic
│   ├── types/                  # Shared TypeScript types
│   ├── util/                   # Utility functions
│   ├── Log.js                  # Logging abstraction
│   └── instrumentation.js      # OpenTelemetry instrumentation
├── configs/                     # Environment-specific configs
│   ├── default.config.yml      # Default configuration
│   ├── local-dev.config.yml    # Local development
│   ├── dev.config.yml          # Development environment
│   ├── qa.config.yml           # QA environment
│   ├── preprod.config.yml      # Pre-production
│   ├── prod.config.yml         # Production (East)
│   ├── prodw.config.yml        # Production (West)
│   └── schema.yml              # Configuration schema
├── features/                    # Cucumber BDD tests
│   ├── integrationTests/       # Integration test scenarios
│   │   ├── idv/
│   │   └── scoring/
│   ├── lib/                    # Test helpers
│   │   ├── inputs/             # Test input generators
│   │   └── results/            # Test result validators
│   ├── step_definitions/       # Cucumber step definitions
│   │   ├── general/
│   │   └── scoring/
│   └── cucumberSetup.js        # Cucumber configuration
├── terraform/                   # Infrastructure as code
│   ├── stacks/                 # Deployment stacks
│   │   ├── auth/               # Auth stack infrastructure
│   │   ├── botornot/           # Bot detection stack
│   │   ├── clustering/         # Clustering stack
│   │   ├── idv/                # IDV stack
│   │   └── scoring/            # Scoring stack (primary)
│   └── templates/              # Terraform templates
│       ├── lambda/             # Lambda resource templates
│       └── stack/              # Stack templates
├── test/                        # Unit and integration tests
│   └── integration/            # Integration tests
│       └── services/           # Service integration tests
├── tools/                       # Development tooling
│   ├── setupWorker/            # Worker scaffolding tool
│   ├── invokeWorker.js         # Local worker invocation
│   └── findAwsResources.js     # AWS resource discovery
├── gitlab-ci/                   # CI/CD pipeline definitions
├── package.json                 # NPM dependencies
├── webpack.config.babel.js      # Webpack build config
├── babel.config.json            # Babel transpilation config
├── tsconfig.json                # TypeScript config
└── runfile.js                   # RunJS task runner
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `apps/` | Individual Lambda worker functions organized by business domain (auth, botornot, clustering, idv, scoring). Each subdirectory contains one worker with an `index.ts` entry point. |
| `shared/` | Shared code library used across all workers. Contains middleware pipeline, service abstractions, configuration management, logging, and utility functions. |
| `shared/middlewares/` | Middleware pipeline components that transform inputs, inject services, handle tracing, and format outputs for different AWS event sources. |
| `shared/services/` | Service layer providing abstractions over AWS clients (DynamoDB, SQS), external APIs (identity, TM accounts), and feature flags. |
| `shared/appResolver/` | Worker resolution system that maps APP_NAME environment variable to worker modules and orchestrates middleware pipeline. |
| `shared/entryFiles/` | Lambda entry point that bootstraps the worker with middleware and handles pre-warming. |
| `configs/` | Hierarchical YAML configuration files for each environment (dev, qa, preprod, prod). Loaded via Immutable.js. |
| `features/` | Cucumber BDD test suite with feature files, step definitions, and test helpers. |
| `terraform/stacks/` | Infrastructure as Code organized by deployment stack, matching the `apps/` structure. |
| `tools/` | Development tools for creating workers, invoking them locally, and managing AWS resources. |
| `gitlab-ci/` | CI/CD pipeline definitions per stack for automated testing and deployment. |

## Entry Points

| File | Purpose |
|------|---------|
| `shared/entryFiles/lambda.js` | Main Lambda handler entry point. Receives AWS events and delegates to instrumented app via middleware pipeline. |
| `apps/<domain>/<workerName>/index.ts` | Individual worker handler function. Exports default function typed as Worker<Event, Result, Services>. |
| `shared/appResolver/index.js` | App resolver that loads worker by APP_NAME and applies middleware based on MIDDLEWARE_TYPE. |

## Worker Entry Point Pattern

Every worker follows this structure:

```
apps/<domain>/<workerName>/
└── index.ts                 # Worker handler (exports default Worker function)
```

Entry points export a typed worker function:

```typescript
import { KinesisWorker } from '../../../shared/appResolver/Worker';
import { Services } from '../../../shared/services';

const handler: KinesisWorker<InputType, OutputType, Services> =
  async({ input, Services }) => {
    // Worker logic here
    return result;
  };

export default handler;
```

## File Organization Pattern

**By Domain + By Function**

The repository uses a hybrid organization pattern:

1. **Top-level domain separation** (`apps/<domain>/`) - Workers grouped by business capability (auth, botornot, clustering, idv, scoring)
2. **Worker-level function isolation** (`apps/<domain>/<workerName>/`) - Each worker is self-contained with its own directory
3. **Shared code library** (`shared/`) - Common functionality organized by technical concern (middlewares, services, config, utilities)

This pattern enables:
- **Domain cohesion**: Related workers (e.g., all scoring workers) are co-located
- **Worker isolation**: Each worker can be deployed and tested independently
- **Code reuse**: Shared middleware and services are centralized to avoid duplication
- **Terraform alignment**: Infrastructure stacks in `terraform/stacks/` mirror the `apps/` structure for deployment consistency
