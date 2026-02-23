# Architecture Structure - export-service

## Directory Layout

```
export-service/
├── app/                      # Application source code
│   ├── datastore/           # Data access layer (MongoDB)
│   │   ├── mongo/           # MongoDB connection & utilities
│   │   ├── campaigns.js     # Campaign data operations
│   │   ├── entries.js       # Entry data operations
│   │   ├── exports.js       # Export data operations
│   │   ├── markets.js       # Market data operations
│   │   ├── promoters.js     # Promoter data operations
│   │   ├── scoring.js       # Scoring data operations
│   │   └── users.js         # User data operations
│   ├── errors/              # Custom error definitions
│   ├── managers/            # Business logic layer
│   │   ├── exports/         # Export management logic
│   │   └── queue/           # Queue processing logic
│   ├── router/              # HTTP routing layer
│   │   ├── index.js         # Main router configuration
│   │   └── exports.js       # Export-specific routes
│   ├── services/            # External service integrations
│   │   ├── athena/          # AWS Athena integration
│   │   ├── codes/           # Code service client
│   │   ├── entries/         # Entry service client
│   │   ├── exportsS3/       # Exports S3 bucket operations
│   │   ├── scoringS3/       # Scoring S3 bucket operations
│   │   ├── sfmc/            # Salesforce Marketing Cloud integration
│   │   └── vfScoringS3/     # VerifiedFan scoring S3 operations
│   └── index.js             # Application entry point
├── configs/                  # Configuration files
├── features/                 # Cucumber BDD tests
│   ├── lib/                 # Test utilities & helpers
│   ├── scenarios/           # Feature files
│   ├── schemas/             # JSON schemas for validation
│   └── step_definitions/    # Test step implementations
├── lib/                      # Shared libraries & utilities
│   ├── middlewares/         # Koa middleware
│   │   ├── prometheus/      # Metrics middleware
│   │   └── validators/      # Request validators
│   ├── athena/              # Athena SQL templates & utilities
│   ├── Router/              # Custom router extensions
│   └── RowFormatter/        # CSV row formatting logic
├── terraform/                # Infrastructure as code
│   ├── tm-nonprod/          # Non-production environments
│   └── tm-prod/             # Production environments
└── tools/                    # Development utilities
    ├── jwt/                  # JWT token tools
    └── mongo/                # MongoDB utilities
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| app/ | Main application source code |
| app/datastore/ | MongoDB data access layer with domain-specific datastores |
| app/managers/ | Business logic and orchestration layer |
| app/managers/exports/ | Export generation logic for 14+ export types |
| app/managers/queue/ | Background queue processing for async export jobs |
| app/router/ | HTTP routing and request handling |
| app/services/ | External service integrations (S3, Athena, SFMC, etc.) |
| lib/ | Shared utilities, middlewares, and formatting logic |
| lib/middlewares/ | Koa middleware (JWT, tracing, Prometheus, logging) |
| lib/RowFormatter/ | CSV row formatting for different export types |
| features/ | BDD integration tests using Cucumber |
| terraform/ | Infrastructure definitions for AWS deployment |
| tools/ | Development and debugging utilities |

## Entry Points

| File | Purpose |
|------|---------|
| app/index.js | Main application bootstrap - starts Koa server and queue processor |
| app/router/index.js | Root router configuration |
| app/managers/queue/process.js | Background queue processor invoked via setInterval |

## File Organization Pattern

**Layered Architecture by Function:**

- **Datastore Layer** (`app/datastore/`): Domain-specific data access modules (exports, campaigns, entries, markets, promoters, scoring, users)
- **Manager Layer** (`app/managers/`): Business logic orchestration, isolated by domain (exports, queue)
- **Router Layer** (`app/router/`): HTTP endpoint definitions and request parameter extraction
- **Service Layer** (`app/services/`): External integrations wrapped in service abstractions
- **Shared Libraries** (`lib/`): Cross-cutting concerns (middlewares, formatters, utilities)

**Export Types Organization:**

Within `app/managers/exports/`, each export type has its own module:
- `exportEntries.js` - Base entries export
- `exportCodes.js` - Codes export
- `exportWaitlist/` - Waitlist export (subdirectory)
- `exportReminderEmail/` - Reminder email export (subdirectory)
- `exportPromoterEmailOptIns/` - Promoter opt-ins export (subdirectory)
- And 9+ other export type modules

Complex export types use subdirectories with supporting utilities, while simple ones are single files.

## Module Boundaries

- **Clear separation of concerns**: Routers handle HTTP → Managers handle logic → Datastores handle data → Services handle external calls
- **Dependency direction**: Router → Manager → Datastore/Service (no circular dependencies)
- **Shared code**: Common utilities isolated in `lib/` directory
- **Domain isolation**: Each export type is self-contained within `app/managers/exports/`
