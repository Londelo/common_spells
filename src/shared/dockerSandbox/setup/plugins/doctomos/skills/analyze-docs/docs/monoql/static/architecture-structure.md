# Architecture Structure - monoql

## Directory Layout

```
monoql/
├── app/                          # Main application code
│   ├── context/                  # Context selectors and utilities
│   │   └── selectors/           # Context extraction utilities (graphql, jwt, appContext)
│   ├── DataLoaders/             # DataLoader implementations for batching/caching
│   ├── errors/                  # Custom error definitions
│   ├── graphql/                 # GraphQL server setup
│   │   └── schema/              # GraphQL schema definitions
│   │       ├── resolvers/       # Query/mutation resolvers by domain
│   │       │   ├── Campaign/
│   │       │   ├── Viewer/
│   │       │   ├── Entry/
│   │       │   ├── Wave/
│   │       │   ├── Exports/
│   │       │   ├── Upload/
│   │       │   ├── Metrics/
│   │       │   └── ...
│   │       └── types/           # GraphQL type definitions
│   ├── middlewares/             # Application-specific middlewares
│   │   └── cors/                # CORS configuration
│   ├── responses/               # Response formatting utilities
│   ├── router/                  # Route definitions
│   └── services/                # Service layer initialization
├── lib/                         # Shared libraries and utilities
│   ├── clients/                 # HTTP clients for external services
│   │   ├── campaigns/          # Campaign service client
│   │   ├── entries/            # Entry service client
│   │   ├── exports/            # Export service client
│   │   ├── uploads/            # Upload service client
│   │   ├── users/              # User service client
│   │   └── codes/              # Codes service client
│   ├── middlewares/            # Framework-level middlewares
│   │   ├── prometheus/         # Metrics middleware
│   │   └── validators/         # Request validators
│   └── Router/                 # Base router with standard endpoints
│       └── development/        # Development-only endpoints
├── configs/                    # Environment-specific configurations
├── features/                   # BDD test suite (Cucumber)
│   ├── scenarios/              # Feature files
│   ├── step_definitions/       # Step implementations
│   ├── lib/                    # Test utilities
│   └── schemas/                # JSON schemas for validation
├── kube/                       # Kubernetes deployment configs
│   ├── nonprod9.us-east-1/
│   ├── preprod9.us-east-1/
│   ├── prod9.us-east-1/
│   └── prod10.us-west-2/
├── tools/                      # Developer utilities
│   └── jwt/                    # JWT generation/parsing tools
└── build/                      # Build scripts and tooling
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Main application layer - GraphQL server, resolvers, middlewares |
| `app/graphql/schema/resolvers/` | Domain-specific GraphQL resolvers (Campaign, Viewer, Entry, etc.) |
| `app/DataLoaders/` | DataLoader instances for efficient data fetching with batching |
| `lib/` | Shared libraries, HTTP clients, and framework utilities |
| `lib/clients/` | HTTP clients for microservices (campaigns, entries, exports, uploads, users, codes) |
| `lib/middlewares/` | Reusable Koa middlewares (auth, logging, metrics, validation) |
| `configs/` | Environment configurations (dev, qa, preprod, prod) |
| `features/` | BDD acceptance tests using Cucumber |
| `kube/` | Kubernetes deployment manifests per environment |

## Entry Points

| File | Purpose |
|------|---------|
| `app/index.js` | Main application entry - Koa server bootstrap with middleware stack |
| `app/router/index.js` | Route registration - GraphQL endpoint, GraphiQL, heartbeat |
| `app/graphql/index.js` | GraphQL server initialization with Apollo Server Koa |
| `app/graphql/schema/index.js` | GraphQL schema construction (types + resolvers) |
| `lib/Router/index.js` | Base router with standard endpoints (/metrics, /heartbeat) |
| `package.json` | Node.js project metadata - entry point: `index.js` (refers to built file) |

## File Organization Pattern

**Layer-based with domain grouping:**

- **Top level** separates application code (`app/`) from shared libraries (`lib/`)
- **app/** follows a vertical slice by GraphQL domain (Campaign, Entry, Wave, Viewer)
- **lib/** is organized horizontally by technical concern (clients, middlewares, utilities)
- **Resolvers** are grouped by GraphQL type/domain rather than operation type (Query/Mutation)
- **Clients** mirror backend microservice boundaries (campaigns, entries, exports, etc.)

**Patterns:**
- Each resolver domain has its own directory with an `index.js` barrel export
- Middleware follows plugin pattern - each exports a function that returns Koa middleware
- Clients follow factory pattern - exported functions that accept dependencies and return API methods
- Tests co-located with implementation (`.spec.js` files adjacent to source)
