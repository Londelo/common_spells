# External Dependencies - ccpa-workers

## Production Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| @babel/eslint-parser | ^7.26.8 | ESLint parser for Babel-compiled code | Tooling |
| @opentelemetry/api | ^1.8.0 | OpenTelemetry API for distributed tracing | Observability |
| async-retry | ^1.3.3 | Retry failed async operations | Utility |
| awaity | ^1.0.0 | Promise utilities | Utility |
| csv-parse | ^4.14.1 | CSV parsing | Data Processing |
| debug | ^4.1.0 | Debugging utility | Development |
| moment | ^2.24.0 | Date/time manipulation | Date/Time |
| node-cache | ^5.1.2 | In-memory caching | Performance |
| ramda | ^0.27.0 | Functional programming utilities | Utility |
| raw-loader | ^4.0.2 | Webpack loader for raw files | Build Tool |
| readline-sync | ^1.4.10 | Synchronous readline for CLI | CLI |
| ts-node | ^10.9.1 | TypeScript execution engine | Development |
| typescript | ^5.2.2 | TypeScript compiler | Language |
| uuid | ^3.2.1 | UUID generation | Utility |

**Verified Usage:**
- `async-retry`: Used in `/shared/middlewares/telemetry.ts` for retry logic
- `ramda`: Used in `/shared/middlewares/telemetry.ts` for functional operations
- `debug`: Used in `/apps/templates/template/index.ts` for debugging
- `node-cache`: Used in `/shared/services/secretsManager/index.ts` for caching secrets
- `@opentelemetry/api`: Used in `/shared/middlewares/telemetry.ts` for tracing context

## Dev Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| @babel/cli | ^7.13.0 | Babel command line interface | Build Tool |
| @babel/core | ^7.13.0 | Babel transpiler core | Build Tool |
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Babel plugin for do expressions | Build Tool |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Babel plugin for object spread | Build Tool |
| @babel/plugin-transform-nullish-coalescing-operator | ^7.23.4 | Babel plugin for ?? operator | Build Tool |
| @babel/plugin-transform-optional-chaining | ^7.23.4 | Babel plugin for ?. operator | Build Tool |
| @babel/plugin-transform-runtime | ^7.13.0 | Babel runtime helper transformation | Build Tool |
| @babel/preset-env | ^7.13.0 | Babel preset for target environments | Build Tool |
| @babel/preset-typescript | ^7.23.0 | Babel preset for TypeScript | Build Tool |
| @babel/register | ^7.13.0 | Babel require hook | Build Tool |
| @types/aws-lambda | ^8.10.124 | TypeScript definitions for AWS Lambda | Type Definitions |
| @types/debug | ^4.1.9 | TypeScript definitions for debug | Type Definitions |
| @types/jest | ^29.5.5 | TypeScript definitions for Jest | Type Definitions |
| @types/ramda | ^0.29.6 | TypeScript definitions for Ramda | Type Definitions |
| @typescript-eslint/eslint-plugin | ^6.7.5 | ESLint plugin for TypeScript | Linting |
| @typescript-eslint/parser | ^6.7.5 | ESLint parser for TypeScript | Linting |
| babel-eslint | ^10.1.0 | ESLint parser for Babel | Linting |
| babel-jest | ^25.1.0 | Jest transformer for Babel | Testing |
| babel-loader | ^8.0.0 | Webpack loader for Babel | Build Tool |
| babel-plugin-inline-import | ^2.0.6 | Babel plugin to inline imports | Build Tool |
| chai | ^4.1.2 | BDD/TDD assertion library | Testing |
| chai-json-schema-ajv | ^2.0.0 | JSON schema validation for Chai | Testing |
| chai-match | ^1.1.1 | Pattern matching for Chai | Testing |
| chai-subset | ^1.6.0 | Subset matching for Chai | Testing |
| colors | ^1.1.2 | Console color output | CLI |
| cucumber | ^6.0.5 | BDD testing framework | Testing |
| cucumber-html-reporter | ^5.1.0 | HTML reporter for Cucumber | Testing |
| cucumber-pretty | ^6.0.0 | Pretty formatter for Cucumber | Testing |
| eslint | ^7.26.0 | JavaScript linter | Linting |
| eslint-import-resolver-typescript | ^3.6.1 | TypeScript import resolver for ESLint | Linting |
| eslint-plugin-fp | ^2.3.0 | ESLint plugin for functional programming | Linting |
| eslint-plugin-import | ^2.23.3 | ESLint plugin for import/export syntax | Linting |
| immutable | ^4.3.4 | Immutable data structures | Utility |
| jest | ^30.0.4 | Testing framework | Testing |
| js-yaml-loader | ^1.0.1 | Webpack loader for YAML | Build Tool |
| ls | ^0.2.1 | List files utility | Utility |
| prettier-eslint-cli | ^4.7.1 | Code formatter CLI | Formatting |
| runjs | ^4.3.2 | Task runner | Build Tool |
| source-map-support | ^0.5.9 | Source map support for stack traces | Development |
| webpack | ^5.0.0 | Module bundler | Build Tool |
| webpack-cli | ^5.0.0 | Webpack command line interface | Build Tool |

## Package Manager

**Yarn**: Version 4.0.2 (specified in `packageManager` field)

## Notable Configurations

### Babel Plugins
The project uses several Babel plugins for modern JavaScript features:
- Nullish coalescing operator (`??`)
- Optional chaining (`?.`)
- Object rest/spread
- Do expressions (experimental)

### Testing Stack
- **Framework**: Jest with Babel transformer
- **BDD**: Cucumber with HTML reporting
- **Assertions**: Chai with multiple plugins (JSON schema, pattern matching, subset matching)

### Build Tools
- **Bundler**: Webpack 5
- **Transpiler**: Babel 7 with TypeScript preset
- **Task Runner**: runjs
