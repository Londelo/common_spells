# Architecture Structure - campaign-workers

## Directory Layout

```
campaign-pipeline/workers/
├── apps/                          # Individual Lambda worker functions
│   ├── generateSmsWaveCodes/      # Generate offer codes for SMS waves
│   ├── loadCodeAssignmentsToStream/ # Stream code assignments to Kinesis
│   ├── mergeAvroFiles/            # Merge daily/monthly Avro registration files
│   ├── moveMergedAvroFiles/       # Archive processed Avro files
│   ├── processScheduledWave/      # Process scheduled SMS wave CSV files
│   ├── processScoredFiles/        # Process data science scored registrants
│   ├── processSmsWaveFiles/       # Prepare SMS wave files with market data
│   ├── saveCampaignData/          # Encode and save campaign data to S3
│   ├── saveSelection/             # Save code assignments and selections
│   ├── saveStats/                 # Calculate and save admin stats
│   ├── slackStats/                # Send campaign stats to Slack
│   ├── smsWaveScheduler/          # Schedule SMS wave notifications
│   ├── smsWaveSend/               # Send SMS via SMS service
│   ├── template/                  # Template for new workers
│   ├── transformCodeAssignments/  # Transform and validate code assignments
│   └── translateRanksToScores/    # Convert fanlist ranks to scores
├── shared/                        # Shared code and utilities
│   ├── appResolver/               # App discovery and middleware resolution
│   ├── avro/                      # Avro schemas for data serialization
│   ├── config/                    # Configuration management
│   ├── datastores/                # Database connections (MongoDB)
│   ├── entryFiles/                # Lambda entry point handlers
│   ├── examples/                  # Example data for testing
│   ├── middlewares/               # Lambda middleware pipeline
│   │   ├── transformInput/        # Transform AWS event sources
│   │   └── telemetry/             # OpenTelemetry tracing
│   ├── PutManyToStream/          # Kinesis stream batch utilities
│   ├── putToVerdictQueue/        # SQS verdict queue utilities
│   ├── services/                  # External service integrations
│   │   ├── aws/                   # AWS SDK clients
│   │   ├── campaigns/             # Campaign service API
│   │   ├── codes/                 # Code service API
│   │   ├── entries/               # Entry service API
│   │   ├── pacman/                # Pacman code generation API
│   │   ├── sfmc/                  # Salesforce Marketing Cloud
│   │   ├── slack/                 # Slack notifications
│   │   ├── sms/                   # SMS service API
│   │   └── users/                 # User service API
│   └── smsWave/                   # SMS wave utilities
├── configs/                       # Environment-specific YAML configs
│   ├── default.config.yml         # Default configuration
│   ├── dev.config.yml             # Dev environment overrides
│   ├── local-dev.config.yml       # Local development
│   ├── preprod.config.yml         # Preprod environment
│   ├── prod.config.yml            # Production environment
│   ├── qa.config.yml              # QA environment
│   └── schema.yml                 # Configuration schema
├── features/                      # Cucumber integration tests
│   ├── hooks/                     # Test lifecycle hooks
│   ├── integrationTests/          # Feature files
│   ├── lib/                       # Test utilities
│   ├── schemas/                   # Test data schemas
│   └── step_definitions/          # Cucumber step definitions
├── terraform/                     # Infrastructure as Code
│   ├── modules/                   # Terraform modules
│   ├── tm-nonprod/                # Non-prod environment configs
│   ├── tm-prod/                   # Production environment configs
│   ├── iam.tf                     # IAM roles and policies
│   ├── lambda.tf                  # Lambda function definitions
│   ├── cloudwatch.tf              # CloudWatch alarms and logs
│   └── event_source.tf            # Event source mappings
├── tools/                         # Development and operations tools
│   ├── load/                      # Data loading utilities
│   │   ├── codeAssignments/       # Load code assignments from sources
│   │   ├── registrations/         # Load registrations from sources
│   │   ├── scorings/              # Load scoring data
│   │   ├── campaignMappings/      # Load campaign mappings
│   │   └── marketMappings/        # Load market mappings
│   ├── athena/                    # Athena query utilities
│   ├── decryptMemberId/           # Member ID decryption
│   ├── setupWorker/               # Worker setup scripts
│   └── triggerWorker.js           # Manual worker invocation
├── types/                         # TypeScript type definitions
├── gitlab-ci/                     # GitLab CI/CD configuration
├── package.json                   # NPM dependencies and scripts
├── webpack.config.babel.js        # Webpack bundling configuration
├── tsconfig.json                  # TypeScript configuration
├── babel.config.json              # Babel transpilation configuration
└── runfile.js                     # Task runner definitions
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `apps/` | Individual Lambda worker functions, each in its own directory |
| `shared/` | Reusable code, utilities, and configurations shared across workers |
| `shared/middlewares/` | Middleware pipeline for Lambda execution (tracing, services, input transformation) |
| `shared/services/` | External service client wrappers (AWS, campaigns, codes, entries, etc.) |
| `shared/avro/` | Avro schema definitions for data serialization |
| `shared/entryFiles/` | Lambda handler entry points |
| `configs/` | Environment-specific YAML configuration files |
| `terraform/` | Infrastructure as Code for Lambda deployment |
| `features/` | Cucumber integration tests |
| `tools/` | Development tools, data loaders, and utilities |

## Entry Points

| File | Purpose |
|------|---------|
| `shared/entryFiles/lambda.js` | AWS Lambda handler entry point |
| `shared/appResolver/index.js` | Resolves worker app from APP_NAME env variable |
| `shared/middlewares/index.js` | Composes middleware pipeline based on middleware type |
| `apps/{workerName}/index.js` | Worker-specific business logic |

## File Organization Pattern

**Organization: Serverless by Function**

Each worker function is organized as an independent Lambda:

1. **Function-per-directory**: Each Lambda worker lives in `apps/{workerName}/`
2. **Worker isolation**: Each worker has its own:
   - Business logic (`index.js`)
   - Tests (`*.spec.js`)
   - Supporting modules (utilities, validators, etc.)
   - Configuration (defined in `configs/default.config.yml`)
3. **Shared code extracted**: Common functionality lives in `shared/`
4. **Middleware composition**: Workers declare their middleware type, which determines execution pipeline
5. **Environment-based config**: YAML configs in `configs/` define worker behavior per environment

## Worker Configuration

Each worker is configured in `configs/default.config.yml` with:
- `inventoryCode`: AWS Lambda function name (e.g., `cmp-save-data`)
- `middlewareType`: Event source handler type (kinesisConsumer, s3Consumer, scheduled, etc.)
- `entryFile`: Entry point handler (typically `lambda`)
- Worker-specific settings (batch sizes, retries, etc.)

## Build Process

Workers are bundled using Webpack:
1. Source code is transpiled with Babel (TypeScript/ES6+ to ES5)
2. Dependencies are bundled into single `dist/lambda.js` file per worker
3. Source maps included for debugging
4. APP_NAME environment variable determines which worker to load at runtime
