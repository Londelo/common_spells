# External Dependencies - dmd-workers

## Production Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| @opentelemetry/api | ^1.8.0 | OpenTelemetry API for distributed tracing | Observability |
| async-retry | ^1.3.3 | Async retry utilities | Utility |
| awaity | ^1.0.0 | Promise utilities | Utility |
| aws4 | ^1.11.0 | AWS signature version 4 signing | AWS Integration |
| debug | ^4.1.0 | Debugging utilities | Development/Debugging |
| i18n | ^0.15.1 | Internationalization support | Localization |
| moment | ^2.24.0 | Date/time manipulation | Date/Time |
| moment-timezone | ^0.5.43 | Timezone support for moment | Date/Time |
| ramda | ^0.27.0 | Functional programming utilities | Utility |
| remove-accents | ^0.5.0 | Text normalization | Text Processing |
| ts-node | ^10.9.1 | TypeScript execution environment | TypeScript |
| typescript | ^5.2.2 | TypeScript language | TypeScript |
| uuid | ^3.2.1 | UUID generation | Utility |

## Dev Dependencies

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| @types/jest | ^29.5.5 | TypeScript types for Jest |
| jest | ^30.0.4 | Testing framework |
| babel-jest | ^25.1.0 | Babel integration for Jest |
| chai | ^4.1.2 | Assertion library |
| chai-json-schema-ajv | ^2.0.0 | JSON schema validation for Chai |
| chai-match | ^1.1.1 | Pattern matching for Chai |
| chai-subset | ^1.6.0 | Subset matching for Chai |

### BDD/E2E Testing

| Package | Version | Purpose |
|---------|---------|---------|
| cucumber | ^6.0.5 | BDD testing framework |
| cucumber-html-reporter | ^5.1.0 | HTML reporter for Cucumber |
| cucumber-pretty | ^6.0.0 | Pretty formatter for Cucumber |

### Linting/Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^7.26.0 | JavaScript/TypeScript linter |
| @typescript-eslint/eslint-plugin | ^6.7.5 | TypeScript ESLint rules |
| @typescript-eslint/parser | ^6.7.5 | TypeScript parser for ESLint |
| eslint-import-resolver-typescript | ^3.6.1 | TypeScript import resolver |
| eslint-plugin-fp | ^2.3.0 | Functional programming linting rules |
| eslint-plugin-import | ^2.23.3 | Import/export linting |
| eslint-plugin-jest | ^27.9.0 | Jest-specific linting rules |
| prettier-eslint-cli | ^4.7.1 | Prettier and ESLint integration |

### Build Tools

| Package | Version | Purpose |
|---------|---------|---------|
| webpack | ^5.90.1 | Module bundler |
| webpack-cli | ^5.0.0 | Webpack command line interface |
| babel-loader | ^8.0.0 | Babel loader for Webpack |

### Babel/Transpilation

| Package | Version | Purpose |
|---------|---------|---------|
| @babel/cli | ^7.13.0 | Babel command line interface |
| @babel/core | ^7.13.0 | Babel core compiler |
| @babel/eslint-parser | ^7.26.8 | Babel parser for ESLint |
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Do expressions syntax support |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Object rest/spread support |
| @babel/plugin-transform-nullish-coalescing-operator | ^7.23.4 | Nullish coalescing operator support |
| @babel/plugin-transform-optional-chaining | ^7.23.4 | Optional chaining support |
| @babel/plugin-transform-runtime | ^7.13.0 | Runtime helper optimization |
| @babel/preset-env | ^7.13.0 | Environment-specific Babel presets |
| @babel/preset-typescript | ^7.23.0 | TypeScript preset for Babel |
| @babel/register | ^7.13.0 | Babel require hook |

### TypeScript Type Definitions

| Package | Version | Purpose |
|---------|---------|---------|
| @types/aws-lambda | ^8.10.124 | AWS Lambda types |
| @types/debug | ^4.1.9 | Debug package types |
| @types/ramda | ^0.29.6 | Ramda functional library types |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| colors | ^1.1.2 | Console color output |
| immutable | ^4.3.4 | Immutable data structures |
| js-yaml-loader | ^1.0.1 | YAML loader for Webpack |
| ls | ^0.2.1 | File listing utility |
| runjs | ^4.3.2 | Task runner |
| source-map-support | ^0.5.9 | Source map support for stack traces |

## Package Manager

- **Yarn**: v4.0.2 (specified in `packageManager` field)

## Dependency Categories Summary

- **AWS Integration**: 1 package (aws4)
- **Date/Time**: 2 packages (moment, moment-timezone)
- **Functional Programming**: 1 package (ramda)
- **Testing**: 10 packages (Jest, Chai, Cucumber ecosystem)
- **Build/Transpilation**: 17 packages (Babel, Webpack)
- **Linting**: 7 packages (ESLint ecosystem)
- **Observability**: 1 package (OpenTelemetry)
- **Utilities**: 8 packages (uuid, debug, async-retry, etc.)
- **TypeScript**: 6 packages (including type definitions)
