# External Dependencies - reg-workers

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @opentelemetry/api | ^1.8.0 | OpenTelemetry distributed tracing API |
| ajv | ^8.17.1 | JSON Schema validation |
| async-retry | ^1.3.3 | Retry logic for async operations |
| awaity | ^1.0.0 | Promise utilities |
| date-fns | ^3.6.0 | Date/time manipulation |
| debug | ^4.1.0 | Debug logging utility |
| i18n | ^0.15.1 | Internationalization support |
| jsonwebtoken | ^9.0.3 | JWT token generation and validation |
| node-cache | ^5.1.2 | In-memory caching |
| ramda | ^0.27.0 | Functional programming utilities (immutable transformations) |
| remove-accents | ^0.5.0 | String normalization (remove diacritics) |
| ts-node | ^10.9.1 | TypeScript execution for Node.js |
| typescript | ^5.2.2 | TypeScript compiler |
| utf8 | ^3.0.0 | UTF-8 encoding/decoding |
| uuid | ^3.2.1 | UUID generation |

### Type Definitions (Production)
| Package | Version | Purpose |
|---------|---------|---------|
| @types/async-retry | ^1.4.8 | Type definitions for async-retry |

## Development Dependencies

### Build Tools
| Package | Version | Purpose |
|---------|---------|---------|
| @babel/cli | ^7.13.0 | Babel command line interface |
| @babel/core | ^7.13.0 | Babel compiler core |
| @babel/register | ^7.13.0 | Babel require hook |
| @babel/preset-env | ^7.13.0 | Babel preset for environment-specific transforms |
| @babel/preset-typescript | ^7.23.0 | Babel TypeScript support |
| babel-loader | ^8.0.0 | Webpack Babel loader |
| webpack | ^5.0.0 | Module bundler |
| webpack-cli | ^5.0.0 | Webpack command line interface |

### Babel Plugins (Dev)
| Package | Version | Purpose |
|---------|---------|---------|
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Do expressions syntax support |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Object spread operator support |
| @babel/plugin-transform-nullish-coalescing-operator | ^7.23.4 | Nullish coalescing operator (??) |
| @babel/plugin-transform-optional-chaining | ^7.23.4 | Optional chaining operator (?.) |
| @babel/plugin-transform-runtime | ^7.13.0 | Runtime helpers |
| babel-plugin-inline-import | ^2.0.6 | Inline file imports |

### Testing Framework
| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^25.1.0 | Testing framework |
| babel-jest | ^25.1.0 | Jest Babel integration |
| chai | ^4.1.2 | BDD/TDD assertion library |
| chai-json-schema-ajv | ^2.0.0 | JSON schema assertions for Chai |
| chai-match | ^1.1.1 | Pattern matching assertions |
| chai-subset | ^1.6.0 | Subset matching assertions |
| cucumber | ^6.0.5 | BDD testing framework |
| cucumber-html-reporter | ^5.1.0 | Cucumber HTML report generator |
| cucumber-pretty | ^6.0.0 | Pretty Cucumber output formatter |

### Linting & Code Quality
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^7.26.0 | JavaScript/TypeScript linter |
| @typescript-eslint/eslint-plugin | ^6.7.5 | TypeScript-specific ESLint rules |
| @typescript-eslint/parser | ^6.7.5 | TypeScript parser for ESLint |
| eslint-import-resolver-typescript | ^3.6.1 | TypeScript import resolution for ESLint |
| eslint-plugin-fp | ^2.3.0 | Functional programming ESLint rules |
| eslint-plugin-import | ^2.23.3 | ES6 import/export linting |
| babel-eslint | ^10.1.0 | Babel parser for ESLint |
| prettier-eslint-cli | ^4.7.1 | Code formatting with Prettier + ESLint |

### Type Definitions (Dev)
| Package | Version | Purpose |
|---------|---------|---------|
| @types/aws-lambda | ^8.10.124 | AWS Lambda types |
| @types/debug | ^4.1.9 | Debug library types |
| @types/jest | ^29.5.5 | Jest testing framework types |
| @types/jsonwebtoken | ^8 | JWT library types |
| @types/node | ^20.12.7 | Node.js core types |
| @types/ramda | ^0.29.6 | Ramda functional library types |
| @types/readline-sync | ^1.4.8 | Readline-sync library types |
| @types/utf8 | ^3 | UTF-8 library types |

### Development Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| colors | ^1.1.2 | Terminal color output |
| copy-paste | ^2.1.1 | Clipboard operations |
| csv-parse | ^4.4.1 | CSV parsing |
| husky | ^9.1.7 | Git hooks management |
| immutable | ^4.3.4 | Immutable data structures |
| json-schema-to-typescript | ^15.0.4 | Generate TypeScript types from JSON schemas |
| js-yaml-loader | ^1.0.1 | YAML loader for Webpack |
| ls | ^0.2.1 | Directory listing utility |
| readline-sync | ^1.4.10 | Synchronous readline for CLI |
| runjs | ^4.3.2 | Task runner |
| source-map-support | ^0.5.9 | Source map support for stack traces |

## Peer Dependencies

None declared.

## Categorization by Purpose

### Core Runtime (Production)
- TypeScript execution: `typescript`, `ts-node`
- Observability: `@opentelemetry/api`
- Data validation: `ajv`, `jsonwebtoken`
- Functional programming: `ramda`, `awaity`
- Date handling: `date-fns`
- Utilities: `uuid`, `utf8`, `remove-accents`, `node-cache`, `debug`, `i18n`
- Async control flow: `async-retry`

### Build Pipeline (Dev)
- Transpilation: Babel ecosystem (core, presets, plugins)
- Bundling: Webpack
- Task automation: `runjs`

### Testing (Dev)
- Unit testing: Jest, Chai
- BDD/Integration: Cucumber
- Test utilities from internal packages

### Code Quality (Dev)
- Linting: ESLint with TypeScript and FP plugins
- Formatting: Prettier
- Git hooks: Husky
- Type generation: `json-schema-to-typescript`

### CLI/Dev Tools (Dev)
- Interactive CLI: `readline-sync`
- Terminal output: `colors`
- Data processing: `csv-parse`
- Clipboard: `copy-paste`
