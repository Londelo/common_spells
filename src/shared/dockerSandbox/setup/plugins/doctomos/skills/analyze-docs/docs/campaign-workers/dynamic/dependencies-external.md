# External Dependencies - campaign-workers

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @opentelemetry/api | ^1.8.0 | OpenTelemetry API for distributed tracing |
| @types/node | ^18.16.3 | TypeScript type definitions for Node.js |
| add | ^2.0.6 | Addition utility (likely unused) |
| avsc | ^5.4.7 | Avro schema validation and serialization |
| awaity | ^1.0.0 | Promise utility helpers |
| debug | ^4.1.0 | Flexible debugging utility |
| fs-extra | ^8.1.0 | Enhanced file system operations |
| moment | ^2.24.0 | Date manipulation library |
| moment-timezone | ^0.5.27 | Timezone support for moment.js |
| ramda | ^0.27.0 | Functional programming utilities |
| saslprep | ^1.0.1 | SASL string preparation (MongoDB auth) |
| splunk-sdk | ^1.8.4 | Splunk logging integration |
| uuid | ^3.2.1 | UUID generation |
| yarn | ^1.16.0 | Package manager (unusual as dependency) |
| zip-a-folder | ^0.0.9 | Folder compression utility |

## Development Dependencies

### Build & Transpilation
| Package | Version | Purpose |
|---------|---------|---------|
| @babel/cli | ^7.13.0 | Babel command-line interface |
| @babel/core | ^7.13.0 | Babel compiler core |
| @babel/preset-env | ^7.22.0 | Smart preset for modern JavaScript |
| @babel/preset-typescript | ^7.21.4 | TypeScript support for Babel |
| @babel/register | ^7.13.0 | Runtime Babel registration |
| typescript | ^4.9.5 | TypeScript compiler |
| ts-node | ^10.9.1 | TypeScript execution engine |

### Babel Plugins
| Package | Version | Purpose |
|---------|---------|---------|
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Do expression syntax support |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Object spread/rest operator |
| @babel/plugin-proposal-throw-expressions | ^7.25.9 | Throw expressions syntax |
| @babel/plugin-transform-nullish-coalescing-operator | ^7.23.4 | Nullish coalescing (??) support |
| @babel/plugin-transform-optional-chaining | ^7.23.4 | Optional chaining (?.) support |
| @babel/plugin-transform-runtime | ^7.13.0 | Runtime helpers optimization |

### Linting & Formatting
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^7.26.0 | JavaScript/TypeScript linter |
| @typescript-eslint/eslint-plugin | ^5.59.0 | TypeScript-specific ESLint rules |
| @typescript-eslint/parser | ^5.10.2 | TypeScript parser for ESLint |
| eslint-plugin-fp | ^2.3.0 | Functional programming linting rules |
| eslint-plugin-import | ^2.23.3 | Import/export linting |
| eslint-import-resolver-typescript | ^3.5.5 | TypeScript path resolution for ESLint |
| babel-eslint | ^10.1.0 | Babel parser for ESLint |
| prettier-eslint-cli | ^4.7.1 | Code formatting with Prettier |

### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^29.5.0 | Testing framework |
| @types/jest | ^25.1.0 | TypeScript types for Jest |
| babel-jest | ^25.1.0 | Babel integration for Jest |
| chai | ^4.1.2 | Assertion library |
| chai-json-schema-ajv | ^2.0.0 | JSON schema validation assertions |
| chai-match | ^1.1.1 | Pattern matching assertions |
| chai-subset | ^1.6.0 | Subset matching assertions |
| cucumber | ^6.0.5 | BDD testing framework |
| cucumber-html-reporter | ^5.1.0 | HTML reporting for Cucumber |
| cucumber-pretty | ^6.0.0 | Pretty printing for Cucumber |

### Build Tools
| Package | Version | Purpose |
|---------|---------|---------|
| webpack | ^5.100.0 | Module bundler |
| webpack-cli | ^6.0.1 | Webpack command-line interface |
| babel-loader | ^8.0.0 | Babel loader for Webpack |
| html-loader | ^5.1.0 | HTML file loader for Webpack |
| markdown-loader | ^8.0.0 | Markdown loader for Webpack |
| string-replace-loader | ^2.3.0 | String replacement loader |
| js-yaml-loader | ^1.0.1 | YAML file loader |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| @babel/traverse | ^7.11.5 | AST traversal utilities |
| @babel/types | ^7.11.5 | AST type definitions |
| @types/aws-lambda | ^8.10.114 | TypeScript types for AWS Lambda |
| @types/debug | ^4.1.7 | TypeScript types for debug |
| @types/node | ^18.16.3 | TypeScript types for Node.js |
| @types/ramda | ^0.27.0 | TypeScript types for ramda |
| babel-plugin-inline-import | ^3.0.0 | Inline file imports |
| colors | ^1.1.2 | Terminal color output |
| csv-parse | ^4.4.1 | CSV parsing |
| csv-stringify | ^5.3.0 | CSV generation |
| ls | ^0.2.1 | Directory listing utility |
| runjs | ^4.3.2 | Task runner framework |
| source-map-support | ^0.5.9 | Source map support for stack traces |

## No Peer Dependencies

This project does not declare any peer dependencies.

## Notes

- **moment.js** versions (2.24.0) are quite old - moment is now in maintenance mode, consider migrating to date-fns or luxon
- **uuid** version 3.2.1 is very outdated (current is v9+)
- **yarn** as a production dependency is unusual - typically it's only used as a package manager
- **add** package (v2.0.6) appears to be a simple addition utility and is likely unnecessary
- Heavy use of Babel plugins suggests complex transpilation requirements
- Dual build system with both Babel and TypeScript
