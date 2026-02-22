# External Dependencies - entry-service

## Production Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| koa | ^2.4.1 | Web framework for Node.js | Framework |
| koa-bodyparser | ^4.2.0 | HTTP request body parsing middleware | Framework |
| koa-compress | ^2.0.0 | Compression middleware | Framework |
| koa-router | ^7.3.0 | Routing middleware | Framework |
| koa-unless | ^1.0.7 | Conditional middleware execution | Framework |
| @opentelemetry/api | ^1.9.0 | OpenTelemetry API for distributed tracing | Observability |
| ramda | ^0.27.0 | Functional programming utility library | Utility |
| escape-html | ^1.0.3 | HTML escaping utility | Security |
| utf8 | ^3.0.0 | UTF-8 encoding/decoding | Utility |
| nl2br | ^0.0.3 | Newline to `<br>` tag converter | Utility |
| dns-cache | ^2.0.0 | DNS caching for improved performance | Performance |
| fuel-rest | ^2.0.5 | Salesforce Marketing Cloud Fuel SDK | Integration |
| request-promise-native | ^1.0.5 | HTTP request library with promises | HTTP Client |
| chai | ^4.1.2 | Assertion library (typically devDep) | Testing |
| chai-json-equal | ^0.0.1 | JSON equality assertions | Testing |
| fb | ^2.0.0 | Facebook API SDK | Social Media |
| twitter | ^1.7.1 | Twitter API SDK | Social Media |
| tumblr.js | ^1.1.1 | Tumblr API SDK | Social Media |

## Dev Dependencies

### Build Tools
| Package | Version | Purpose |
|---------|---------|---------|
| @babel/cli | ^7.13.0 | Babel command line interface |
| @babel/core | ^7.13.0 | Babel compiler core |
| @babel/node | ^7.22.19 | Babel Node.js runtime |
| @babel/preset-env | ^7.13.0 | Babel preset for environment-specific transforms |
| @babel/register | ^7.13.0 | Babel require hook |
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Babel plugin for do expressions |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Babel plugin for object rest/spread |
| @babel/plugin-transform-runtime | ^7.13.0 | Babel runtime transform plugin |
| babel-eslint | ^8.0.0 | Babel parser for ESLint |
| babel-loader | ^8.0.0 | Webpack loader for Babel |
| babel-plugin-inline-import | ^3.0.0 | Babel plugin for inline imports |
| webpack | ^5.0.0 | Module bundler |
| webpack-cli | ^5.0.0 | Webpack command line interface |
| webpack-merge | ^4.1.0 | Webpack configuration merger |
| copy-webpack-plugin | ^4.2.0 | Webpack plugin to copy files |

### Testing Tools
| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^25.1.0 | JavaScript testing framework |
| jest-environment-node-debug | ^2.0.0 | Jest debugging environment |
| cucumber | ^6.0.5 | BDD testing framework |
| cucumber-html-reporter | ^5.1.0 | Cucumber HTML report generator |
| cucumber-pretty | 6.0.0 | Cucumber pretty formatter |
| chai-json-schema-ajv | 3.0.0 | JSON schema validation for Chai |
| chai-match | ^1.1.1 | Pattern matching assertions |
| chai-subset | ^1.6.0 | Subset matching assertions |

### Code Quality
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^4.9.0 | JavaScript linter |
| eslint-loader | 2.0.0 | Webpack ESLint loader |
| eslint-plugin-css-modules | 2.7.5 | ESLint plugin for CSS modules |
| eslint-plugin-fp | ^2.3.0 | ESLint plugin for functional programming |
| eslint-plugin-graphql | ^1.4.1 | ESLint plugin for GraphQL |
| eslint-plugin-import | ^2.8.0 | ESLint plugin for import/export |
| eslint-plugin-react | ^7.4.0 | ESLint plugin for React |
| prettier-eslint | ^8.8.1 | Prettier formatter with ESLint |
| prettier-eslint-cli | ^4.7.1 | Prettier ESLint CLI |

### Development Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| nodemon | ^1.12.1 | Auto-restart Node.js on file changes |
| runjs | ^4.4.2 | Task runner for JavaScript |
| husky | ^0.14.3 | Git hooks manager |
| aws-sdk | ^2.190.0 | AWS SDK for JavaScript |
| debug | ^3.1.0 | Debugging utility |
| colors | ^1.1.2 | Console colors |
| copy-paste | ^1.3.0 | Clipboard utility |
| nid | * | Node ID generator |
| source-map-support | ^0.5.0 | Source map support for stack traces |

### Loaders & Parsers
| Package | Version | Purpose |
|---------|---------|---------|
| html-loader | ^5.1.0 | Webpack HTML loader |
| js-yaml-loader | ^1.2.2 | Webpack YAML loader |
| markdown-loader | ^8.0.0 | Webpack Markdown loader |
| string-replace-loader | ^2.3.0 | Webpack string replacement loader |
| csv-parse | ^4.4.5 | CSV parsing library |

## Peer Dependencies

None explicitly declared.

## Usage Analysis

### Heavily Used
- **koa** + ecosystem: Primary web framework, used extensively throughout the app
- **ramda**: Functional programming utilities used in data transformations and managers
- **@opentelemetry/api**: Distributed tracing infrastructure

### Social Media Integration
- **fb**, **twitter**, **tumblr.js**: Social sharing functionality (currently commented out in shares manager)
- Note: Social sharing code is disabled but dependencies remain installed

### Testing Stack
- **jest**: Primary test runner
- **cucumber**: BDD/integration testing
- **chai**: Assertion library with various plugins

### Build Toolchain
- **Babel 7**: Modern JavaScript transpilation
- **Webpack 5**: Module bundling
- **ESLint 4**: Code quality enforcement
