# External Dependencies - fan-identity-workers

Generated: 2026-02-16

## Production Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| `@aws-sdk/client-glue` | ^3.575.0 | AWS Glue client for data catalog/ETL operations | AWS Integration |
| `@opentelemetry/api` | ^1.8.0 | Distributed tracing and observability | Monitoring |
| `@types/node` | ^20.11.29 | TypeScript type definitions for Node.js | Type Definitions |
| `@types/uuid` | ^9.0.8 | TypeScript type definitions for uuid | Type Definitions |
| `async-retry` | ^1.3.3 | Retry logic for async operations | Utility |
| `awaity` | ^1.0.0 | Promise utilities and helpers | Utility |
| `debug` | ^4.1.0 | Debugging utility with namespaces | Development |
| `jsonwebtoken` | ^9.0.2 | JWT token creation and verification | Security |
| `moment` | ^2.24.0 | Date/time manipulation library | Utility |
| `ramda` | ^0.27.0 | Functional programming utilities | Utility |
| `ts-node` | ^10.9.1 | TypeScript execution for Node.js | Runtime |
| `typescript` | ^5.2.2 | TypeScript language compiler | Language |
| `unleash-client` | 5.5.0 | Feature flag management client | Feature Flags |
| `uuid` | ^3.2.1 | UUID generation | Utility |

## Dev Dependencies

### Build & Transpilation

| Package | Version | Purpose |
|---------|---------|---------|
| `@babel/cli` | ^7.13.0 | Babel command-line interface |
| `@babel/core` | ^7.13.0 | Babel core compiler |
| `@babel/plugin-proposal-do-expressions` | ^7.13.0 | Babel plugin for do-expressions syntax |
| `@babel/plugin-proposal-object-rest-spread` | ^7.13.0 | Object spread/rest operator support |
| `@babel/plugin-transform-class-properties` | ^7.23.3 | Class properties transform |
| `@babel/plugin-transform-nullish-coalescing-operator` | ^7.23.4 | Nullish coalescing (??) support |
| `@babel/plugin-transform-optional-chaining` | ^7.23.4 | Optional chaining (?.) support |
| `@babel/plugin-transform-private-methods` | ^7.23.3 | Private class methods transform |
| `@babel/plugin-transform-private-property-in-object` | ^7.23.4 | Private property in object support |
| `@babel/plugin-transform-runtime` | ^7.13.0 | Babel runtime helper optimization |
| `@babel/preset-env` | ^7.13.0 | Smart preset for target environments |
| `@babel/preset-typescript` | ^7.23.0 | TypeScript support in Babel |
| `@babel/register` | ^7.13.0 | Runtime Babel transpilation |
| `babel-eslint` | ^10.1.0 | Babel parser for ESLint |
| `babel-jest` | ^29.7.0 | Jest transformer using Babel |
| `babel-loader` | ^8.0.0 | Webpack Babel loader |
| `babel-plugin-inline-import` | ^2.0.6 | Import files inline during build |
| `webpack` | ^5.0.0 | Module bundler |
| `webpack-cli` | ^5.0.0 | Webpack command-line interface |
| `ts-jest` | ^29.1.1 | TypeScript preprocessor for Jest |

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.7.0 | Testing framework |
| `@types/jest` | ^29.5.5 | TypeScript types for Jest |
| `cucumber` | ^6.0.5 | BDD testing framework |
| `cucumber-html-reporter` | ^5.1.0 | HTML report generation for Cucumber |
| `cucumber-pretty` | ^6.0.0 | Pretty formatter for Cucumber |
| `chai` | ^4.1.2 | Assertion library |
| `chai-json-schema-ajv` | ^2.0.0 | JSON schema assertions |
| `chai-match` | ^1.1.1 | Pattern matching assertions |
| `chai-subset` | ^1.6.0 | Subset assertions for objects |

### Linting & Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^7.26.0 | JavaScript/TypeScript linter |
| `@typescript-eslint/eslint-plugin` | ^6.7.5 | TypeScript ESLint rules |
| `@typescript-eslint/parser` | ^6.7.5 | TypeScript parser for ESLint |
| `eslint-import-resolver-typescript` | ^3.6.1 | TypeScript import resolution for ESLint |
| `eslint-import-resolver-webpack` | ^0.13.8 | Webpack import resolution for ESLint |
| `eslint-plugin-fp` | ^2.3.0 | Functional programming ESLint rules |
| `eslint-plugin-import` | ^2.23.3 | Import/export linting rules |
| `prettier-eslint-cli` | ^4.7.1 | Code formatting with Prettier + ESLint |

### Type Definitions

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/aws-lambda` | ^8.10.124 | TypeScript types for AWS Lambda |
| `@types/debug` | ^4.1.9 | TypeScript types for debug |
| `@types/jsonwebtoken` | ^9 | TypeScript types for jsonwebtoken |
| `@types/ramda` | ^0.29.6 | TypeScript types for Ramda |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `colors` | ^1.1.2 | Console color output |
| `immutable` | ^4.3.4 | Immutable data structures |
| `js-yaml-loader` | ^1.0.1 | YAML loader for Webpack |
| `ls` | ^0.2.1 | Directory listing utility |
| `runjs` | ^4.3.2 | Task runner |
| `source-map-support` | ^0.5.9 | Source map support for stack traces |

## Package Manager

- **Yarn**: v4.0.2 (managed via `packageManager` field)

## Peer Dependencies

None explicitly defined.

## Usage Patterns

### Most Used External Libraries

Based on grep analysis across TypeScript files:

1. **Ramda** (20+ files) - Functional programming utilities used extensively for data transformation
2. **@aws-sdk/client-glue** (3 files) - AWS Glue integration in bot detection and clustering workers
3. **AWS SDK** - Used via `@verifiedfan/aws` wrapper (indirect usage)
4. **moment** - Date manipulation (via shared utilities)
5. **jsonwebtoken** - JWT handling in authentication flows
6. **unleash-client** - Feature flag evaluation

### Critical Dependencies

**Security-Sensitive:**
- `jsonwebtoken` ^9.0.2 - JWT validation for authentication

**Performance-Critical:**
- `ramda` ^0.27.0 - Core functional utilities used in hot paths
- `async-retry` ^1.3.3 - Retry logic for external API calls

**Infrastructure:**
- `@opentelemetry/api` ^1.8.0 - Observability across all workers
- `unleash-client` 5.5.0 - Feature flag evaluation affects runtime behavior
