# External Dependencies - code-service

## Production Dependencies

| Package | Version | Purpose | Usage Pattern |
|---------|---------|---------|---------------|
| koa | ^2.4.1 | Web application framework | Core HTTP server framework for routing and middleware |
| koa-bodyparser | ^4.2.0 | Request body parsing | Middleware for parsing JSON/form request bodies |
| koa-compress | ^2.0.0 | Response compression | Middleware for gzip/deflate compression of responses |
| koa-router | ^7.3.0 | HTTP routing | Core routing functionality for API endpoints |
| koa-unless | ^1.0.7 | Conditional middleware | Used to conditionally skip middleware execution |
| ramda | ^0.27.0 | Functional programming utilities | Heavily used throughout codebase for data transformations, composition, and functional patterns |
| csv-parse | ^4.8.9 | CSV file parsing | Used in code upload functionality to parse CSV files |
| opentracing | ^0.14.4 | Distributed tracing API | Standard interface for distributed tracing |
| lightstep-tracer | ^0.28.0 | Tracing implementation | Lightstep-specific implementation of OpenTracing for distributed tracing |
| dns-cache | ^2.0.0 | DNS caching | Performance optimization for DNS lookups |
| request-promise-native | ^1.0.5 | HTTP client library | Promise-based HTTP request library (deprecated) |
| chai | ^4.1.2 | Assertion library | Used in tests (should be devDependency) |
| chai-json-equal | ^0.0.1 | JSON equality assertions | Test utility for JSON comparison (should be devDependency) |

## Dev Dependencies

### Testing Frameworks & Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| cucumber | ^6.0.5 | BDD testing framework |
| cucumber-html-reporter | ^5.1.0 | HTML test reporting |
| cucumber-pretty | 6.0.0 | Pretty-printed test output |
| jest | ^21.2.1 | JavaScript testing framework |
| jest-environment-node-debug | ^2.0.0 | Debugging environment for Jest |
| chai-json-schema-ajv | 3.0.0 | JSON schema validation for tests |
| chai-match | ^1.1.1 | Pattern matching assertions |
| chai-subset | ^1.6.0 | Subset matching assertions |

### Build & Transpilation

| Package | Version | Purpose |
|---------|---------|---------|
| babel-cli | ^6.26.0 | Babel command-line interface |
| babel-core | ^6.26.0 | Babel core transpiler |
| babel-loader | ^7.1.2 | Webpack Babel loader |
| babel-register | ^6.24.1 | Babel require hook |
| babel-polyfill | ^6.26.0 | ES2015+ polyfills |
| babel-preset-env | ^1.6.1 | Smart preset for target environments |
| babel-plugin-transform-runtime | ^6.23.0 | Runtime transformation plugin |
| babel-plugin-transform-object-rest-spread | ^6.23.0 | Object spread operator support |
| babel-plugin-transform-do-expressions | ^6.22.0 | Do expression transformation |
| babel-plugin-inline-import | ^2.0.6 | Import file contents as strings |
| webpack | ^3.8.1 | Module bundler |
| webpack-merge | ^4.1.0 | Webpack configuration merging |

### Code Quality & Linting

| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^4.9.0 | JavaScript linter |
| eslint-loader | 2.0.0 | ESLint loader for webpack |
| babel-eslint | ^8.0.0 | Babel parser for ESLint |
| eslint-plugin-css-modules | 2.7.5 | CSS modules linting |
| eslint-plugin-fp | ^2.3.0 | Functional programming linting rules |
| eslint-plugin-graphql | ^1.4.1 | GraphQL query linting |
| eslint-plugin-import | ^2.8.0 | Import/export syntax linting |
| eslint-plugin-react | ^7.4.0 | React-specific linting rules |
| prettier-eslint | ^8.8.1 | Code formatting integration |
| prettier-eslint-cli | ^4.7.1 | CLI for prettier-eslint |

### Development Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| nodemon | ^1.12.1 | Auto-restart development server |
| debug | ^3.1.0 | Debug utility |
| husky | ^0.14.3 | Git hooks management |
| source-map-support | ^0.5.0 | Source map support for stack traces |
| colors | ^1.1.2 | Terminal color output |
| copy-paste | ^1.3.0 | Clipboard utilities |

### Webpack Loaders & Plugins

| Package | Version | Purpose |
|---------|---------|---------|
| string-replace-loader | ^2.3.0 | String replacement in bundles |
| yaml-loader | ^0.5.0 | YAML file loading |

## Peer Dependencies

None declared.

## Framework Analysis

### Web Framework Stack
- **Koa 2.x**: Modern, lightweight web framework using async/await
- **Complete middleware ecosystem**: Body parsing, compression, routing
- **Well-established stack** from 2017-2018 era

### Testing Stack
- **Dual testing approach**: Jest for unit tests, Cucumber for BDD/integration tests
- **Rich assertion library**: Chai with multiple plugins for various assertion styles
- **HTML reporting**: For test results visualization

### Build Toolchain
- **Babel 6.x**: Older but stable transpilation (circa 2017)
- **Webpack 3.x**: Module bundling from 2017 era
- **Full ES2015+ support**: Via presets and polyfills

## Notable Observations

### Misplaced Dependencies
- `chai` and `chai-json-equal` are listed as production dependencies but only used in tests
- Should be moved to devDependencies

### Deprecated Libraries
- `request-promise-native`: This library is deprecated. Should migrate to modern alternatives like `axios` or `node-fetch`

### Age of Dependencies
- Most dependencies are from 2017-2018 era
- Babel 6 is significantly outdated (current version is Babel 7)
- Webpack 3 is outdated (current version is Webpack 5)
- ESLint 4 is outdated (current version is ESLint 8+)
