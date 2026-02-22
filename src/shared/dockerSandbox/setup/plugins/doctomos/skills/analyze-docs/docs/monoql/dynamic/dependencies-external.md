# External Dependencies - monoql

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **Web Framework & Server** | | |
| koa | ^2.4.1 | Core web framework for Node.js |
| koa-bodyparser | ^4.2.0 | HTTP request body parser middleware |
| koa-compress | ^2.0.0 | Compression middleware for responses |
| koa-router | ^7.3.0 | Router middleware for Koa |
| koa-session | ^5.5.0 | Session middleware |
| koa-unless | ^1.0.7 | Conditional middleware execution |
| koa2-cors | ^2.0.4 | CORS middleware |
| **GraphQL** | | |
| apollo-server-koa | ^1.2.0 | Apollo GraphQL server integration for Koa |
| graphql | ^0.12.0 | GraphQL query language implementation |
| graphql-tools | ^2.6.1 | Tools for building GraphQL schemas |
| graphql-type-json | ^0.1.4 | JSON scalar type for GraphQL |
| graphql-upload | 8.0.7 | File upload support for GraphQL |
| **Utilities** | | |
| ramda | ^0.27.0 | Functional programming utility library |
| dataloader | ^1.3.0 | Data batching and caching layer |
| crypto-js | ^3.1.9-1 | Cryptographic operations |
| moment-timezone | ^0.5.27 | Date/time manipulation with timezone support |
| dns-cache | ^2.0.0 | DNS caching for improved performance |
| request-promise-native | ^1.0.5 | Simplified HTTP request client with promises |
| **Testing (in production deps)** | | |
| chai | ^4.1.2 | Assertion library (should be devDependency) |
| chai-json-equal | ^0.0.1 | JSON equality assertions (should be devDependency) |
| chai-json-schema-ajv | 3.0.0 | JSON schema validation (should be devDependency) |
| **Observability** | | |
| @opentelemetry/api | ^1.9.0 | OpenTelemetry API for distributed tracing |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **Testing** | | |
| jest | ^21.2.1 | JavaScript testing framework |
| chai | ^4.1.2 | Assertion library |
| chai-match | ^1.1.1 | Pattern matching assertions |
| chai-subset | ^1.6.0 | Subset comparison assertions |
| cucumber | ^6.0.5 | BDD testing framework |
| cucumber-html-reporter | ^5.1.0 | HTML report generation for Cucumber |
| cucumber-pretty | 6.0.0 | Pretty formatter for Cucumber |
| jest-environment-node-debug | ^2.0.0 | Debug environment for Jest |
| **Build Tools** | | |
| babel-cli | ^6.26.0 | Babel command line interface |
| babel-core | ^6.26.0 | Babel compiler core |
| babel-loader | ^7.1.2 | Webpack loader for Babel |
| babel-register | ^6.24.1 | Runtime Babel transpilation |
| babel-polyfill | ^6.26.0 | Polyfills for newer JS features |
| babel-preset-env | ^1.6.1 | Smart preset for target environments |
| webpack | ^3.10.0 | Module bundler |
| webpack-merge | ^4.1.0 | Webpack configuration merging |
| yaml-loader | ^0.5.0 | YAML file loader for Webpack |
| **Babel Plugins** | | |
| babel-plugin-inline-import | ^2.0.6 | Inline file imports |
| babel-plugin-syntax-async-functions | ^6.13.0 | Async function syntax |
| babel-plugin-transform-do-expressions | ^6.22.0 | Do expression transformation |
| babel-plugin-transform-object-rest-spread | ^6.23.0 | Object spread operator |
| babel-plugin-transform-runtime | ^6.23.0 | Runtime helpers |
| **Code Quality** | | |
| eslint | ^4.14.0 | JavaScript linter |
| eslint-loader | 2.0.0 | Webpack ESLint loader |
| eslint-plugin-css-modules | 2.7.5 | CSS modules linting |
| eslint-plugin-fp | ^2.3.0 | Functional programming linting |
| eslint-plugin-graphql | ^3.0.3 | GraphQL query linting |
| eslint-plugin-import | ^2.8.0 | Import/export linting |
| eslint-plugin-react | ^7.4.0 | React-specific linting rules |
| babel-eslint | ^8.1.2 | Babel parser for ESLint |
| prettier-eslint | ^8.8.1 | Prettier + ESLint integration |
| prettier-eslint-cli | ^4.7.1 | CLI for prettier-eslint |
| **Development Tools** | | |
| nodemon | ^1.14.7 | Auto-restart on file changes |
| husky | ^0.14.3 | Git hooks |
| debug | ^3.1.0 | Debugging utility |
| source-map-support | ^0.5.0 | Source map support for stack traces |
| **Utilities** | | |
| colors | ^1.1.2 | Console color output |
| copy-paste | ^1.3.0 | Clipboard operations |
| form-data | ^2.5.1 | Form data handling |
| node-fetch | ^2.6.0 | Fetch API for Node.js |
| timeout-as-promise | ^1.0.0 | Promise-based timeouts |

## Peer Dependencies

None specified.

## Package Resolutions

| Package | Forced Version | Reason |
|---------|----------------|--------|
| fs-capacitor | 3.0.0 | Dependency resolution override |

## Notable Observations

### Misplaced Dependencies
The following testing libraries are listed as production dependencies but should be devDependencies:
- chai
- chai-json-equal
- chai-json-schema-ajv

### Very Old Versions
Several core dependencies are significantly outdated:
- graphql: ^0.12.0 (released 2017, current is 16.x)
- apollo-server-koa: ^1.2.0 (very old, deprecated package)
- babel 6.x packages (babel 7+ is current)
- webpack: ^3.10.0 (webpack 5.x is current)
- jest: ^21.2.1 (jest 29.x is current)
- koa-router: ^7.3.0 (koa-router 12.x is current)
