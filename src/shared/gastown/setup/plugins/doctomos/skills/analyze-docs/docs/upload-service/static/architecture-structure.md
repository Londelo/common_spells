# Architecture Structure - upload-service

## Directory Layout

```
upload-service/
├── app/                    # Application core (domain + routing)
│   ├── datastore/          # Data persistence layer
│   │   └── mongo/          # MongoDB implementation
│   ├── errors/             # Domain-specific errors
│   ├── managers/           # Business logic layer
│   │   ├── files/          # File upload/management logic
│   │   ├── images/         # Image upload/management logic
│   │   └── trigger/        # AWS Lambda/Step Function triggers
│   ├── router/             # Route definitions
│   └── services/           # External service integrations
│       ├── lambda/         # AWS Lambda clients
│       ├── s3/             # AWS S3 clients
│       └── stepFunctions/  # AWS Step Functions clients
├── lib/                    # Shared libraries and utilities
│   ├── middlewares/        # Koa middleware components
│   │   ├── prometheus/     # Metrics collection
│   │   ├── tracing/        # Distributed tracing (Lightstep)
│   │   └── validators/     # Request validation
│   └── Router/             # Base router with utilities
│       └── development/    # Development-only routes
├── configs/                # Environment configuration files
├── features/               # BDD test suite (Cucumber)
│   ├── lib/                # Test utilities
│   ├── scenarios/          # Cucumber feature files
│   ├── schemas/            # JSON schemas for validation
│   └── step_definitions/   # Cucumber step implementations
├── terraform/              # Infrastructure as Code (Fargate/ECS)
├── terraform-s3/           # S3 bucket infrastructure
├── build/                  # Build scripts and Docker
├── tools/                  # Development utilities
│   ├── jwt/                # JWT token generation
│   └── mongo/              # MongoDB utilities
└── integrationTests/       # Integration test suite
```

## Key Directories

| Directory | Purpose | Entry Points |
|-----------|---------|--------------|
| `app/` | Core application logic | `app/index.js` |
| `app/router/` | HTTP route definitions | `app/router/index.js` |
| `app/managers/` | Business logic layer (orchestrates services) | Manager modules per domain |
| `app/services/` | External AWS service clients | Service factory modules |
| `app/datastore/` | Data persistence abstractions | `app/datastore/index.js` |
| `lib/` | Shared utilities and middleware | Various exports |
| `lib/middlewares/` | Koa middleware stack | `lib/middlewares/index.js` |
| `configs/` | YAML configuration per environment | `*.config.yml` files |
| `features/` | Cucumber BDD tests | `features/cucumberSetup.js` |
| `terraform/` | ECS/Fargate infrastructure | Terraform modules |

## Entry Points

| File | Purpose | Type |
|------|---------|------|
| `app/index.js` | Main Koa application bootstrap | Application Entry |
| `package.json` | NPM package definition, main: "index.js" | Package Entry |
| `app/router/index.js` | Route registration and composition | Router Entry |
| `lib/config.js` | Configuration loader | Config Entry |
| `webpack.config.babel.js` | Build configuration for Lambda deployment | Build Entry |

## File Organization Pattern

The codebase follows a **three-layer architecture** organized by technical concern:

### Layer 1: HTTP/Transport (`app/router/`)
- Route definitions per resource (`files.js`, `images.js`, `trigger.js`)
- Request parameter extraction
- Response handling
- Delegates to managers

### Layer 2: Business Logic (`app/managers/`)
- Domain-specific orchestration
- Authorization checks
- Business rule enforcement
- Coordinates between services and datastores
- Pure business logic, framework-agnostic

### Layer 3: Infrastructure (`app/services/`, `app/datastore/`)
- AWS service clients (S3, Lambda, Step Functions)
- Database operations (MongoDB)
- External integrations
- Instrumented for observability

### Cross-Cutting Concerns (`lib/`)
- Middleware (auth, tracing, logging, metrics, validation)
- Shared utilities
- Configuration management
- Context transformation (`KoaCtxToManagerCtx`)

## Configuration Management

- **Strategy**: YAML-based hierarchical configuration
- **Location**: `configs/` directory
- **Environments**: `default`, `local-dev`, `dev`, `qa`, `preprod`, `prod`
- **Loading**: Via `@verifiedfan/lib` Config utility
- **Schema**: Defined in `configs/schema.yml`

## Testing Strategy

### BDD Tests (`features/`)
- Framework: Cucumber.js
- Feature files in Gherkin syntax
- Step definitions for API scenarios
- JSON schema validation
- Test utilities for AWS/MongoDB mocking

### Integration Tests (`integrationTests/`)
- End-to-end service testing
- Configuration: `integrationTests/config.js`

### Unit Tests
- Framework: Jest (`.spec.js` files)
- Co-located with implementation
- Example: `lib/middlewares/validators/ValidatorMiddleware.spec.js`

## Build & Deployment

- **Build Tool**: Webpack with Babel transpilation
- **Runtime**: Node.js with ES6+ features
- **Containerization**: Docker (Dockerfile in root)
- **Infrastructure**: AWS ECS Fargate (Terraform definitions)
- **CI/CD**: GitLab CI (`.gitlab-ci.yml`)

## Naming Conventions

- **Files**: camelCase for modules (`uploadFile.js`), PascalCase for classes
- **Directories**: Lowercase, sometimes hyphenated (`step_definitions`)
- **Routes**: RESTful paths (`/files`, `/images`, `/trigger/:function`)
- **Configs**: `{env}.config.yml` pattern
- **Tests**: `*.spec.js` for unit, `*.feature` for BDD

## Import Patterns

- **Internal imports**: Relative paths from file location
- **Shared libraries**: Absolute from `lib/` directory
- **Vendor libraries**: Scoped `@verifiedfan/*` packages
- **Config**: Imported from `lib/config`
- **No barrel exports**: Direct imports from specific files
