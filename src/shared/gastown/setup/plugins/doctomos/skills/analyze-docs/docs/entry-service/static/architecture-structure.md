# Architecture Structure - entry-service

## Directory Layout

```
entry-service/
├── app/                          # Main application code
│   ├── datastore/               # Data access layer (MongoDB)
│   │   ├── entries/             # Entry data operations
│   │   ├── scoring/             # Scoring data operations
│   │   ├── stats/               # Statistics data operations
│   │   ├── shares/              # Shares data operations
│   │   ├── invites/             # Invites data operations
│   │   └── mongo/               # MongoDB connection utilities
│   ├── managers/                # Business logic layer
│   │   ├── entries/             # Entry domain logic
│   │   │   ├── validators/      # Entry validation logic
│   │   │   ├── normalizers/     # Data normalization
│   │   │   ├── onUpserted/      # Post-upsert hooks
│   │   │   ├── saveEntries/     # Entry persistence logic
│   │   │   ├── confirmPhone/    # Phone confirmation logic
│   │   │   ├── selectors/       # Data selectors
│   │   │   └── enums/           # Entry enums
│   │   ├── scoring/             # Scoring domain logic
│   │   │   ├── validators/      # Scoring validation
│   │   │   ├── normalizers/     # Score normalization
│   │   │   ├── format/          # Score formatting
│   │   │   ├── selectors/       # Scoring selectors
│   │   │   └── EnrichRecord/    # Record enrichment
│   │   ├── stats/               # Statistics logic
│   │   ├── shares/              # Shares logic
│   │   ├── scores/              # Scores management
│   │   └── groups/              # Groups management
│   ├── services/                # External service integrations
│   │   ├── users/               # User service client
│   │   ├── campaigns/           # Campaign service client
│   │   ├── appsync/             # AWS AppSync integration
│   │   ├── campaignDataStream/  # Campaign data streaming
│   │   ├── sfmc/                # Salesforce Marketing Cloud
│   │   └── retryScoresQueue/    # Retry queue for scores
│   ├── router/                  # HTTP routing layer
│   ├── graphql/                 # GraphQL queries
│   ├── schemas/                 # JSON schemas
│   └── errors/                  # Error definitions
├── lib/                         # Shared libraries
│   ├── middlewares/             # Koa middleware
│   │   ├── prometheus/          # Metrics middleware
│   │   └── validators/          # Request validators
│   ├── Router/                  # Custom router utilities
│   └── vendor/                  # Third-party utilities
├── features/                    # Cucumber BDD tests
│   ├── scenarios/               # Test scenarios
│   ├── step_definitions/        # Test steps
│   ├── lib/                     # Test utilities
│   └── schemas/                 # Test schemas
├── tools/                       # Utility scripts
│   ├── jwt/                     # JWT tools
│   ├── mongo/                   # MongoDB tools
│   ├── attachCustomScore/       # Score attachment tools
│   └── upsertInvitesList/       # Invites management
├── configs/                     # Environment configurations
└── kube/                        # Kubernetes deployment configs
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| app/ | Core application code organized in layers |
| app/datastore/ | MongoDB data access layer - handles all database operations |
| app/managers/ | Business logic layer - implements domain rules and orchestration |
| app/services/ | External service clients - abstracts HTTP/SDK calls to other services |
| app/router/ | HTTP routing - maps URLs to manager functions |
| lib/ | Shared libraries and middleware used across the application |
| features/ | BDD acceptance tests using Cucumber |
| tools/ | Utility scripts for operations and maintenance |
| configs/ | Environment-specific YAML configurations |
| kube/ | Kubernetes deployment manifests |

## Entry Points

| File | Purpose |
|------|---------|
| app/index.js | Main application entry - Koa server setup with middleware chain |
| app/router/index.js | Main router - defines all HTTP endpoints |
| app/router/v2.js | V2 API router for versioned endpoints |
| app/router/users.js | User-specific routes |

## File Organization Pattern

The codebase follows a **layered architecture** pattern with clear separation:

### Layer Organization

1. **Router Layer** (`app/router/`)
   - HTTP endpoint definitions
   - Request parameter extraction
   - Route-to-manager delegation

2. **Manager Layer** (`app/managers/`)
   - Business logic implementation
   - Domain rules enforcement
   - Orchestration of datastore and service calls
   - Organized by domain (entries, scoring, stats, shares)
   - Each domain has subdirectories for validators, normalizers, selectors, etc.

3. **Datastore Layer** (`app/datastore/`)
   - MongoDB collection wrappers
   - Query builders
   - CRUD operations
   - One subdirectory per collection

4. **Services Layer** (`app/services/`)
   - External API clients
   - SDK integrations
   - Instrumented for observability

### Feature Organization

Within each domain (e.g., `app/managers/entries/`), code is organized by function:

- **validators/** - Input validation and business rule checks
- **normalizers/** - Data transformation and formatting
- **selectors/** - Data extraction utilities
- **enums/** - Constants and enumerations
- Specific feature modules at the root level (e.g., `upsert.js`, `confirmPhone.js`)

This organization supports:
- Easy navigation by feature or layer
- Clear dependency direction (router → manager → datastore/services)
- Testability through isolated modules
- Code reuse through shared utilities
