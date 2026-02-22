# Architecture Structure - campaign-service

## Directory Layout

```
campaign-service/
├── app/                          # Application source code
│   ├── router/                   # HTTP route definitions (REST endpoints)
│   │   ├── index.js              # Main router aggregating all routes
│   │   ├── campaigns.js          # Campaign CRUD endpoints
│   │   ├── markets.js            # Market endpoints
│   │   ├── marketsByCampaignId.js # Nested market routes
│   │   ├── events.js             # Event endpoints
│   │   ├── artists.js            # Artist search endpoints
│   │   ├── venues.js             # Venue search endpoints
│   │   ├── promoters.js          # Promoter management
│   │   └── contacts.js           # Contact management
│   ├── managers/                 # Business logic layer
│   │   ├── campaigns/            # Campaign business logic
│   │   │   ├── index.js          # Core campaign operations
│   │   │   ├── format.js         # Response formatting
│   │   │   ├── selectors.js      # Data extraction helpers
│   │   │   ├── normalizers.js    # Input normalization
│   │   │   ├── enums.js          # Campaign constants/enums
│   │   │   ├── cache.js          # Caching logic
│   │   │   ├── errors.js         # Error definitions
│   │   │   ├── saveCampaign.js   # Campaign save orchestration
│   │   │   ├── refresh.js        # Status refresh operations
│   │   │   ├── extensions.js     # Campaign extension handling
│   │   │   ├── validators/       # Business rule validators
│   │   │   │   ├── index.js
│   │   │   │   ├── normalizeAndValidateCampaign.js
│   │   │   │   ├── throwIfInvalidCampaign.js
│   │   │   │   ├── throwIfInvalidPermissions.js
│   │   │   │   ├── throwIfInvalidPassword.js
│   │   │   │   ├── throwIfCampaignInaccessible.js
│   │   │   │   ├── locales.js
│   │   │   │   └── preferences.js
│   │   │   └── triggerPostUpdateOperations/
│   │   │       ├── index.js
│   │   │       ├── sendToDataPipeline.js
│   │   │       ├── saveToCampaignPipeline.js
│   │   │       └── purgeFastlyCache/
│   │   ├── markets/              # Market business logic
│   │   │   ├── index.js
│   │   │   ├── formatters.js
│   │   │   ├── normalizers.js
│   │   │   ├── selectors.js
│   │   │   ├── enums.js
│   │   │   ├── errors.js
│   │   │   ├── utils.js
│   │   │   ├── validators/
│   │   │   └── helpers/
│   │   │       ├── saveMarket.js
│   │   │       ├── findByMarketId.js
│   │   │       ├── sendToDataPipeline.js
│   │   │       ├── saveToCampaignPipeline.js
│   │   │       └── saveToAttendancePipeline.js
│   │   ├── events/               # Event management
│   │   ├── artists/              # Artist operations
│   │   ├── venues/               # Venue operations
│   │   ├── promoters/            # Promoter management
│   │   └── contacts/             # Contact management
│   ├── datastore/                # Database access layer
│   │   ├── index.js              # Datastore factory
│   │   ├── default.js            # Base datastore operations
│   │   ├── campaigns.js          # Campaign DB operations
│   │   ├── markets.js            # Market DB operations
│   │   ├── events.js             # Event DB operations
│   │   ├── contacts.js           # Contact DB operations
│   │   ├── promoters.js          # Promoter DB operations
│   │   ├── InstrumentDatastores.js # Observability wrapper
│   │   └── mongo/
│   │       ├── index.js          # MongoDB client setup
│   │       ├── indexMap.js       # Index definitions
│   │       └── instrumentFn.js   # Tracing instrumentation
│   ├── services/                 # External integration layer
│   │   ├── index.js              # Service factory
│   │   ├── InstrumentServices.js # Observability wrapper
│   │   ├── discovery/            # Ticketmaster Discovery API
│   │   ├── tmDiscovery/          # TM Discovery wrapper
│   │   ├── fastly/               # CDN cache management
│   │   ├── redis/                # Redis caching service
│   │   ├── gitlab/               # GitLab API integration
│   │   ├── campaignDataStream/   # AWS Kinesis integration
│   │   └── queue/                # SQS queue services
│   ├── errors/                   # Application error types
│   │   └── authErrors.js
│   └── index.js                  # Application entry point (Koa server)
├── lib/                          # Shared library code
│   ├── middlewares/              # Koa middleware functions
│   │   ├── index.js
│   │   ├── accessLog.js          # Request logging
│   │   ├── correlation.js        # Correlation ID tracking
│   │   ├── responseFormatter.js  # Response formatting
│   │   ├── errorFormatter.js     # Error handling
│   │   ├── jwt.js                # JWT authentication
│   │   ├── telemetry.js          # OpenTelemetry tracing
│   │   ├── prometheus/           # Prometheus metrics
│   │   └── validators/
│   ├── Router/                   # Router factory with dev helpers
│   │   └── development/
│   ├── utils/                    # Utility functions
│   ├── error/                    # Error utilities
│   ├── config.js                 # Configuration loader
│   ├── Log.js                    # Logging factory
│   ├── ValidateSchema.js         # JSON schema validator
│   ├── KoaCtxToManagerCtx.js     # Context transformer
│   ├── InstrumentedAsyncOperation.js # Tracing helper
│   └── collectDefaultPrometheusMetrics.js
├── configs/                      # Environment configurations
│   ├── dev.yml
│   ├── qa.yml
│   ├── preprod.yml
│   ├── prod.yml
│   ├── prodw.yml
│   └── schema.yml                # Config validation schema
├── schemas/                      # JSON validation schemas
│   ├── campaignV1.json
│   ├── campaignV2.json
│   ├── campaignDraft.json
│   ├── fanlistCampaign.json
│   ├── market.json
│   ├── promoter.json
│   ├── faqs.json
│   ├── terms.json
│   └── artistQuery.json
├── features/                     # BDD integration tests
│   ├── scenarios/                # Gherkin feature files
│   ├── step_definitions/         # Cucumber step definitions
│   ├── lib/                      # Test helpers
│   ├── hooks/                    # Test hooks
│   ├── examples/                 # Test examples
│   └── cucumberSetup.js
├── tools/                        # Development/maintenance scripts
│   ├── mongo/
│   │   ├── seed/                 # Database seeding scripts
│   │   ├── createIndexes.js
│   │   └── send*ToDataPipeline.js
│   └── jwt/
│       ├── generateToken.js
│       └── parseToken.js
├── build/                        # Build scripts
├── kube/                         # Kubernetes deployment configs
├── package.json                  # NPM package definition
├── runfile.js                    # Task runner definitions
├── webpack.config.babel.js       # Webpack bundling config
├── babel.config.json             # Babel transpilation config
├── .eslintrc.yml                 # ESLint configuration
├── nodemon.json                  # Nodemon dev config
└── docker-compose.yml            # Docker compose config
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Main application code organized in 4 layers |
| `app/router/` | HTTP route definitions with JWT auth |
| `app/managers/` | Business logic, validation, orchestration |
| `app/datastore/` | MongoDB CRUD operations |
| `app/services/` | External API integrations |
| `lib/` | Shared utilities and middleware |
| `configs/` | Environment-specific YAML configurations |
| `schemas/` | JSON schema definitions for validation |
| `features/` | Cucumber BDD integration tests |
| `tools/` | Development and maintenance scripts |

## Entry Points

| File | Purpose |
|------|---------|
| `app/index.js` | Application bootstrap - creates Koa server, registers middleware, starts listening on port 8080 |
| `app/router/index.js` | Route aggregator - combines all resource routers into single router tree |
| `lib/KoaCtxToManagerCtx.js` | Context transformer - converts Koa request context into manager context with correlation, JWT, datastore, and services |
| `package.json` (main) | Points to `index.js` as entry point for the module |

## File Organization Pattern

The codebase follows a **functional domain-driven structure** with strict layer separation:

### Manager Pattern (Feature Slices)
Each resource (campaigns, markets, events, etc.) has a dedicated manager directory with standard modules:
- `index.js` - Main business logic functions
- `format.js` / `formatters.js` - Response formatting
- `selectors.js` - Data extraction utilities
- `normalizers.js` - Input data normalization
- `validators/` - Business rule validation (throwIf* pattern)
- `errors.js` - Domain-specific error definitions
- `enums.js` - Constants and enumerations
- `helpers/` - Sub-operations and utilities

### File Naming Conventions
- **Validators**: `throwIf*` prefix (e.g., `throwIfInvalidPermissions.js`)
- **Selectors**: `select*` prefix (e.g., `selectStatus.js`)
- **Formatters**: `format*` prefix (e.g., `formatCampaign.js`)
- **Tests**: `*.spec.js` co-located with source files
- **Features**: `*.feature` Gherkin files for BDD tests

### Strict File Size Limits
ESLint enforces maximum 200 lines per file, promoting decomposition into focused modules.

## Testing Organization

| Test Type | Location | Runner |
|-----------|----------|--------|
| Unit tests | `*.spec.js` files alongside source code | Jest |
| Integration tests | `features/scenarios/*.feature` | Cucumber |
| Test utilities | `features/lib/` | N/A |
| Schemas for validation | `features/schemas/` | Chai JSON Schema |
