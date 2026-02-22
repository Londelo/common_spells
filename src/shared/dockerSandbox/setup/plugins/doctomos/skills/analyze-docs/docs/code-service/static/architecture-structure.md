# Architecture Structure - code-service

## Directory Layout

```
code-service/
├── app/                         # Application core logic
│   ├── datastore/              # Data access layer (MongoDB)
│   │   ├── mongo/              # MongoDB connection utilities
│   │   └── codes.js            # Code entity CRUD operations
│   ├── managers/               # Business logic layer
│   │   └── codes/              # Code management business logic
│   │       ├── findAndReserveCodes.js
│   │       ├── readAndStoreCodes.js
│   │       ├── findCodesCounts.js
│   │       ├── enums.js        # Code types and statuses
│   │       └── errors.js       # Domain-specific errors
│   ├── router/                 # Route definitions
│   │   └── index.js            # API endpoints for code operations
│   ├── services/               # External service integrations
│   │   └── s3/                 # AWS S3 client for code file uploads
│   ├── errors/                 # Application-level errors
│   └── index.js                # Koa app bootstrap
├── lib/                        # Shared utilities and infrastructure
│   ├── middlewares/            # Koa middleware chain
│   │   ├── prometheus/         # Metrics collection
│   │   ├── tracing/            # Distributed tracing
│   │   ├── validators/         # Request validation
│   │   ├── jwt.js              # JWT authentication
│   │   ├── correlation.js      # Request correlation IDs
│   │   ├── accessLog.js        # HTTP access logging
│   │   ├── errorFormatter.js   # Error response formatting
│   │   └── responseFormatter.js # Success response formatting
│   ├── Router/                 # Router factory
│   │   ├── development/        # Dev-only endpoints (token generation)
│   │   └── heartbeat.js        # Health check endpoint
│   ├── error/                  # Error utilities
│   ├── config.js               # Configuration loader
│   ├── Log.js                  # Structured logging
│   └── KoaCtxToManagerCtx.js   # Context adapter (Koa -> Manager)
├── features/                   # Cucumber BDD tests
│   ├── scenarios/              # Feature files
│   ├── step_definitions/       # Test step implementations
│   ├── lib/                    # Test utilities
│   └── hooks/                  # Test lifecycle hooks
├── integrationTests/           # Integration test suite
├── tools/                      # CLI utilities
│   ├── jwt/                    # JWT token generation tools
│   └── mongo/                  # MongoDB index creation
├── configs/                    # Environment configurations
├── kube/                       # Kubernetes deployment manifests
└── package.json                # Dependencies and scripts
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Application core - contains all business logic and domain code |
| `app/datastore/` | Data access layer - MongoDB operations for code entities |
| `app/managers/` | Business logic layer - domain rules and orchestration |
| `app/router/` | API route definitions - maps HTTP endpoints to manager functions |
| `app/services/` | External service integrations (S3 for file storage) |
| `lib/` | Shared infrastructure - middleware, config, logging, utilities |
| `lib/middlewares/` | Koa middleware chain - auth, logging, tracing, formatting |
| `lib/Router/` | Router factory and system endpoints (heartbeat, metrics) |
| `features/` | BDD acceptance tests using Cucumber |
| `tools/` | CLI utilities for development and operations |
| `configs/` | Environment-specific configuration files |
| `kube/` | Kubernetes deployment configurations |

## Entry Points

| File | Purpose |
|------|---------|
| `app/index.js` | **Main application entry** - bootstraps Koa server, applies middleware chain, starts HTTP listener on port 8080 |
| `app/router/index.js` | **API route definitions** - defines all code management endpoints (upload, reserve, assign, release, count) |
| `lib/Router/index.js` | **System endpoints** - configures `/metrics`, `/heartbeat`, and optional `/dev` routes |
| `package.json` | Defines `main: "index.js"` (though actual entry is `app/index.js` when running the service) |

## File Organization Pattern

**Layered Architecture with Functional Boundaries**

The codebase follows a **layered architecture** pattern with clear separation of concerns:

1. **Presentation Layer** (`app/router/`, `lib/middlewares/`)
   - HTTP request handling
   - Request/response formatting
   - Authentication and validation

2. **Business Logic Layer** (`app/managers/`)
   - Domain rules and validation
   - Orchestration of datastore and service calls
   - Business-specific error handling

3. **Data Access Layer** (`app/datastore/`)
   - MongoDB CRUD operations
   - Query construction
   - Data transformation

4. **External Services Layer** (`app/services/`)
   - AWS S3 integration
   - External API clients

5. **Infrastructure Layer** (`lib/`)
   - Cross-cutting concerns (logging, tracing, metrics)
   - Configuration management
   - Shared utilities

**Organization Principles:**
- **By Feature** within `app/managers/` - each domain concept (codes) has its own directory
- **By Type** within `lib/` - utilities grouped by technical function (middlewares, error, config)
- **Dependency Direction** - clean downward flow: `router → manager → datastore/services`
- **Context Adaptation** - `KoaCtxToManagerCtx` isolates framework-specific code from business logic

**Naming Conventions:**
- Lowercase directories with no separators: `datastore`, `managers`
- Camelcase files: `readAndStoreCodes.js`, `findCodesCounts.js`
- Index files for barrel exports: `index.js` aggregates and re-exports
