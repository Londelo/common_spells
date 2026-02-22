# Architecture Structure - appsync

## Directory Layout

```
appsync/
├── app/                          # Application source code
│   ├── schema/                   # GraphQL schema definitions
│   │   ├── external/             # AWS-specific directives & scalars
│   │   └── types/                # Schema type partials (*.graphql)
│   └── src/                      # TypeScript source code
│       ├── functions/            # Reusable pipeline functions
│       ├── resolvers/            # Top-level GraphQL resolvers
│       ├── types/                # TypeScript type definitions
│       └── utils/                # Utility functions and helpers
├── terraform/                    # Infrastructure as Code
│   ├── modules/                  # Reusable Terraform modules
│   │   ├── appsync_functions/    # Module for AppSync functions
│   │   └── appsync_resolvers/    # Module for AppSync resolvers
│   ├── tm-nonprod/              # Non-production environments
│   │   ├── dev1/                # Dev environment 1
│   │   ├── qa1/                 # QA environment 1
│   │   └── qa2/                 # QA environment 2
│   └── tm-prod/                 # Production environments
│       ├── preprod1/            # Pre-production environment
│       └── prod1/               # Production environment
├── features/                     # Cucumber/Gherkin feature tests
│   ├── scenarios/               # Feature test scenarios
│   ├── step_definitions/        # Test step implementations
│   ├── lib/                     # Test utilities
│   │   ├── graphql/            # GraphQL query/mutation templates
│   │   ├── inputs/             # Test input generators
│   │   └── results/            # Test result handlers
│   └── schemas/                # JSON schemas for validation
├── configs/                     # Configuration files
├── lib/                         # Legacy JavaScript utilities
├── spec/                        # Additional test specifications
└── tools/                       # Build and development tools
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/src/resolvers/` | Top-level GraphQL field resolvers (request/response handlers) |
| `app/src/functions/` | Pipeline functions for multi-step resolver orchestration |
| `app/schema/types/` | GraphQL schema type definitions split by domain |
| `app/schema/external/` | AWS AppSync-specific directives and scalars |
| `terraform/` | Infrastructure definitions and environment configurations |
| `terraform/modules/` | Reusable Terraform modules for AppSync components |
| `features/` | End-to-end Cucumber/BDD feature tests |
| `lib/` | Legacy utilities (mostly for older resolvers) |

## Entry Points

| File | Purpose |
|------|---------|
| `app/src/resolvers/*.ts` | GraphQL resolver entry points (exported `request` and `response` functions) |
| `app/src/functions/*.ts` | Pipeline function entry points (exported `request` and `response` functions) |
| `terraform/resolvers.tf` | Resolver configuration and pipeline definitions |
| `terraform/functions.tf` | Function-to-datasource mappings |
| `terraform/datasources.tf` | AWS data source definitions (DynamoDB, Lambda, HTTP, EventBridge) |
| `build.mjs` | Build script for bundling TypeScript and merging GraphQL schemas |

## File Organization Pattern

The codebase follows a **domain-oriented structure** with clear separation of concerns:

### By Layer
- **Presentation Layer**: GraphQL schema files in `app/schema/types/` define the API contract
- **Resolver Layer**: Resolvers in `app/src/resolvers/` handle GraphQL field resolution
- **Business Logic Layer**: Functions in `app/src/functions/` contain reusable logic components
- **Infrastructure Layer**: Terraform files in `terraform/` define AWS resources

### By Domain
Within each layer, code is organized by business domain:
- **API domain** (`api.graphql`, `apiAccountFanscore.ts`): Fan verification API
- **Demand domain** (`demand.graphql`, `demandRecordQuery.ts`): Demand/event tracking
- **Phone domain** (`phonescore.ts`, phone-related functions): Phone verification scoring
- **Liveness domain** (`liveness.graphql`, `checkLiveness.ts`): Identity verification via liveness detection
- **Fan domain** (`fan.graphql`, `identity.ts`): Fan identity and profile management
- **Registration domain** (`registration.graphql`, registration functions): Event registration and entry management
- **LNAA domain** (`lnaa.graphql`, `activateLnaa.ts`): Live Nation Artists & Attractions membership

### Naming Conventions
- **Resolvers**: Named after the GraphQL field they resolve (e.g., `phonescore.ts` resolves `Phone.score`)
- **Functions**: Named with verb prefix describing their action (e.g., `getAccountFanscoreMemberId`, `saveDemandRecord`)
- **Test Files**: Co-located with source as `*.spec.ts` for unit tests
- **GraphQL Schema**: Named after the type they define (e.g., `demand.graphql` defines `Demand` type)

### Build Output
- All TypeScript is compiled to `dist/` directory
- GraphQL schema partials are merged into single `dist/schema.graphql`
- Build excludes `*.spec.ts` test files
