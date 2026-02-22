# Architecture Structure - user-service

## Directory Layout

```
user-service/
├── app/                          # Main application code
│   ├── datastore/                # Data access layer (MongoDB)
│   │   ├── mongo/                # MongoDB connection & utilities
│   │   ├── users.js              # User CRUD operations
│   │   ├── permissions.js        # Permission data access
│   │   ├── workers.js            # Worker authentication data
│   │   ├── userSupremes.js       # Supreme user management
│   │   ├── emailTokens.js        # Email token storage
│   │   ├── codeAlphas.js         # Alpha code management
│   │   ├── clients.js            # Client data access
│   │   └── index.js              # Datastore aggregator
│   ├── managers/                 # Business logic layer
│   │   ├── users/                # User management logic
│   │   │   ├── index.js          # User operations (auth, update, delete)
│   │   │   ├── contacts.js       # Email/phone contact management
│   │   │   ├── wallet.js         # User wallet operations
│   │   │   ├── integrations.js   # Third-party integrations
│   │   │   ├── linkedAccounts.js # Linked account handling
│   │   │   ├── lookups.js        # User lookup operations
│   │   │   └── upsertUsers.js    # User creation/update logic
│   │   ├── permissions/          # Permission management
│   │   │   ├── index.js          # Permission operations
│   │   │   └── selectors.js      # Permission data selectors
│   │   └── workers/              # Worker authentication
│   │       └── index.js          # Worker auth logic
│   ├── services/                 # External service integrations
│   │   ├── ticketmaster/v2/      # Ticketmaster API v2 client
│   │   ├── facebook/             # Facebook API integration
│   │   ├── entries/              # Entries service client
│   │   ├── exports/              # Exports service client
│   │   ├── slas/                 # SLA service client
│   │   ├── campaignDataStream/   # Campaign data streaming
│   │   └── index.js              # Service aggregator
│   ├── router/                   # HTTP routing layer
│   │   ├── index.js              # Main router configuration
│   │   ├── auth.js               # Authentication endpoints
│   │   ├── me.js                 # Current user endpoints
│   │   ├── users.js              # User management endpoints
│   │   ├── campaigns.js          # Campaign-related endpoints
│   │   └── permissions.js        # Permission endpoints
│   ├── errors/                   # Custom error definitions
│   │   └── authErrors.js         # Authentication errors
│   ├── koaCtxToManagerCtx.js     # Context transformation
│   └── index.js                  # Application entry point
├── lib/                          # Shared utilities
│   ├── middlewares/              # Koa middleware components
│   │   ├── validators/           # Request validation
│   │   ├── prometheus/           # Metrics middleware
│   │   ├── accessLog.js          # Access logging
│   │   ├── jwt.js                # JWT authentication
│   │   ├── responseFormatter.js  # Response formatting
│   │   ├── errorFormatter.js     # Error formatting
│   │   ├── correlation.js        # Request correlation
│   │   └── telemetry.js          # Tracing/telemetry
│   ├── rsa/                      # RSA cryptography utilities
│   ├── alphaCodes/               # Alpha code generation
│   ├── error/                    # Error utilities
│   ├── Router/                   # Custom router wrapper
│   ├── config.js                 # Configuration loader
│   ├── Log.js                    # Logging utility
│   └── Jwt.js                    # JWT generation
├── configs/                      # Configuration files
├── features/                     # Cucumber BDD tests
│   ├── scenarios/                # Feature files (*.feature)
│   ├── step_definitions/         # Test step implementations
│   ├── lib/                      # Test utilities
│   │   ├── identity/             # Identity test helpers
│   │   ├── utils/                # Common test utilities
│   │   ├── results/              # Result validators
│   │   └── inputs/               # Test input generators
│   ├── hooks/                    # Cucumber hooks
│   └── client/                   # API client for tests
├── tools/                        # Utility scripts
│   ├── jwt/                      # JWT generation/parsing scripts
│   └── mongo/                    # MongoDB utility scripts
└── workerKeys/                   # Worker authentication keys
    ├── dev/                      # Development keys
    ├── preprod/                  # Pre-production keys
    └── prod/                     # Production keys
```

## Key Directories

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `app/` | Main application code | `index.js` (entry point) |
| `app/datastore/` | MongoDB data access layer | `users.js`, `permissions.js`, `workers.js` |
| `app/managers/` | Business logic and domain operations | `users/index.js`, `permissions/index.js` |
| `app/services/` | External service integrations | `ticketmaster/v2/`, `facebook/` |
| `app/router/` | HTTP route definitions | `index.js`, `auth.js`, `me.js`, `users.js` |
| `lib/` | Shared utilities and libraries | `middlewares/`, `config.js`, `Jwt.js` |
| `lib/middlewares/` | Koa middleware stack | `jwt.js`, `responseFormatter.js`, `errorFormatter.js` |
| `features/` | Cucumber BDD test suite | `scenarios/*.feature`, `step_definitions/` |
| `configs/` | Environment configuration files | Various YAML/JSON configs |
| `tools/` | Utility scripts for development | `jwt/`, `mongo/` |

## Entry Points

| File | Purpose | Type |
|------|---------|------|
| `app/index.js` | Main application entry - initializes Koa server | HTTP Server |
| `package.json` | npm entry point (`main: "index.js"`) | Package Metadata |
| `features/cucumberSetup.js` | Cucumber test suite initialization | Test Runner |

## File Organization Pattern

The codebase follows a **layered architecture** with clear separation of concerns:

1. **Routing Layer** (`app/router/`) - HTTP request handling, route definitions
2. **Business Logic Layer** (`app/managers/`) - Domain logic, orchestration, validation
3. **Data Access Layer** (`app/datastore/`) - MongoDB operations, data persistence
4. **External Services Layer** (`app/services/`) - Third-party API integrations
5. **Infrastructure Layer** (`lib/`) - Cross-cutting concerns (middleware, logging, JWT, config)

Files are organized **by feature and layer**:
- Each layer has clear boundaries and responsibilities
- Related functionality is grouped together (e.g., `managers/users/` contains all user business logic)
- Each module exports a focused API surface
- Dependencies flow downward (router → managers → datastore)

## Testing Structure

| Directory | Purpose |
|-----------|---------|
| `features/scenarios/` | BDD feature files written in Gherkin |
| `features/step_definitions/` | Cucumber step implementations |
| `features/lib/` | Test helpers, utilities, and mock data generators |
| `*.spec.js` files | Unit tests co-located with source files |

## Configuration Management

Configuration is loaded via `@verifiedfan/lib` Config utility:
- YAML/JSON files stored in `configs/` directory
- Environment-specific configs loaded based on environment variables
- Configuration accessed via immutable data structure
- Supports webpack bundling for deployment
