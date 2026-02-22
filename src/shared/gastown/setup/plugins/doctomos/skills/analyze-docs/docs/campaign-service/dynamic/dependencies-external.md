# External Dependencies - campaign-service

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @opentelemetry/api | ^1.9.0 | OpenTelemetry distributed tracing API |
| chai | ^4.1.2 | Assertion library for testing (misplaced in deps) |
| chai-json-equal | ^0.0.1 | JSON equality assertions (misplaced in deps) |
| dns-cache | ^2.0.0 | DNS caching for improved performance |
| graphql | ^0.11.7 | GraphQL query language implementation |
| graphql-tools | ^2.6.1 | GraphQL schema building utilities |
| graphql-type-json | ^0.1.4 | JSON scalar type for GraphQL |
| koa | ^2.4.1 | Web framework (Express alternative) |
| koa-bodyparser | ^4.2.0 | Body parsing middleware for Koa |
| koa-compress | ^2.0.0 | Compression middleware for Koa |
| koa-router | ^7.3.0 | Router middleware for Koa |
| koa-unless | ^1.0.7 | Conditional middleware execution |
| nid | ^0.3.2 | Node ID generator |
| ramda | ^0.27.0 | Functional programming utility library |
| random-ip | ^0.0.1 | Random IP address generator |
| request-promise-native | ^1.0.5 | Promise-based HTTP client wrapper |
| yamlparser | ^0.0.2 | YAML parsing utility |

## Dev Dependencies

### Build & Transpilation
| Package | Version | Purpose |
|---------|---------|---------|
| @babel/core | ^7.24.6 | JavaScript transpiler core |
| @babel/node | ^7.22.19 | Babel Node.js CLI |
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Babel plugin for do expressions |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Babel plugin for object spread |
| @babel/plugin-transform-runtime | ^7.24.6 | Babel runtime helpers |
| @babel/preset-env | ^7.24.6 | Babel preset for modern JS |
| @babel/register | ^7.13.0 | Babel require hook |
| webpack | ^5.90.1 | Module bundler |
| webpack-cli | ^5.1.4 | Webpack command line interface |
| webpack-merge | ^4.1.0 | Webpack configuration merging |

### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| chai | ^4.1.2 | Assertion library |
| chai-json-equal | ^0.0.1 | JSON equality assertions |
| chai-json-schema-ajv | 3.0.0 | JSON schema validation for Chai |
| chai-match | ^1.1.1 | Regex matching for Chai |
| chai-subset | ^1.6.0 | Subset matching for Chai |
| cucumber | ^6.0.5 | BDD testing framework |
| cucumber-html-reporter | ^5.1.0 | HTML reporter for Cucumber |
| cucumber-pretty | 6.0.0 | Pretty formatter for Cucumber |
| jest | ^25.1.0 | JavaScript testing framework |
| jest-environment-node-debug | ^2.0.0 | Debug environment for Jest |

### Code Quality & Linting
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^4.9.0 | JavaScript linter |
| eslint-loader | ^4.0.2 | ESLint loader for Webpack |
| eslint-plugin-css-modules | 2.7.5 | CSS modules linting |
| eslint-plugin-fp | ^2.3.0 | Functional programming linting rules |
| eslint-plugin-graphql | ^1.4.1 | GraphQL linting |
| eslint-plugin-import | ^2.8.0 | Import/export linting |
| eslint-plugin-react | ^7.4.0 | React linting rules |
| babel-eslint | ^8.0.0 | Babel parser for ESLint |
| prettier-eslint | ^8.8.1 | Prettier formatting with ESLint |
| prettier-eslint-cli | ^4.7.1 | CLI for Prettier + ESLint |

### Build Tools & Loaders
| Package | Version | Purpose |
|---------|---------|---------|
| babel-loader | ^9.1.3 | Babel loader for Webpack |
| babel-plugin-inline-import | ^3.0.0 | Inline file imports |
| html-loader | ^5.0.0 | HTML loader for Webpack |
| js-yaml-loader | ^1.0.1 | YAML loader for Webpack |
| markdown-loader | ^8.0.0 | Markdown loader for Webpack |
| string-replace-loader | ^3.1.0 | String replacement loader |

### Development Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| aws-sdk | ^2.429.0 | AWS SDK for development/testing |
| colors | ^1.1.2 | Terminal color output |
| copy-paste | ^1.3.0 | Clipboard operations |
| debug | ^3.1.0 | Debug utility |
| husky | ^0.14.3 | Git hooks automation |
| nodemon | ^1.12.1 | Auto-restart on file changes |
| runjs | ^4.4.2 | Task runner (used by runfile.js) |
| source-map-support | ^0.5.0 | Source map support for debugging |

## Peer Dependencies

No peer dependencies declared.

## Package Resolutions

| Package | Resolved Version | Reason |
|---------|------------------|--------|
| mongodb | ^6.17.0 | Explicitly pinned for compatibility |

## Notes

### Misplaced Dependencies
- `chai` and `chai-json-equal` are in `dependencies` but should be in `devDependencies` (testing only)

### GraphQL Stack
Uses an older GraphQL v0.11.7 stack:
- `graphql` ^0.11.7
- `graphql-tools` ^2.6.1
- `graphql-type-json` ^0.1.4

### Web Framework
Built on Koa.js (not Express):
- Middleware-based architecture
- Async/await native support
- Lighter weight than Express
