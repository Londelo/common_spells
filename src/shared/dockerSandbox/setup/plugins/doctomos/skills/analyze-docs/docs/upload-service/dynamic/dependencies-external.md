# External Dependencies - upload-service

## Production Dependencies

| Package | Version | Purpose | Usage Confirmed |
|---------|---------|---------|-----------------|
| **chai** | ^4.1.2 | Testing assertion library | ⚠️ In production deps (should be dev) |
| **chai-json-equal** | ^0.0.1 | JSON equality assertions | ⚠️ In production deps (should be dev) |
| **csv-parse** | 4.8.6 | CSV file parsing | ✓ Used in file upload processing |
| **dns-cache** | ^2.0.0 | DNS resolution caching | ✓ Network performance |
| **koa** | ^2.4.1 | Web framework (Node.js) | ✓ Core application framework |
| **koa-better-body** | ^3.3.9 | Body parsing middleware | ✓ File upload handling |
| **koa-compress** | ^2.0.0 | Compression middleware | ✓ Response compression |
| **koa-router** | ^7.3.0 | Routing middleware | ✓ API routing |
| **koa-unless** | ^1.0.7 | Conditional middleware execution | ✓ Route-specific middleware |
| **lightstep-tracer** | ^0.28.0 | Distributed tracing (LightStep) | ✓ APM integration |
| **opentracing** | ^0.14.4 | OpenTracing API | ✓ Tracing abstraction |
| **ramda** | ^0.27.0 | Functional programming utilities | ✓ Heavily used throughout |
| **request-promise-native** | ^1.0.5 | HTTP client (promises) | ✓ External API calls |

### Koa Ecosystem
The service uses Koa as its web framework with several middleware packages:
- **koa**: Core framework
- **koa-router**: Route handling
- **koa-better-body**: Request body/file parsing
- **koa-compress**: Response compression
- **koa-unless**: Conditional middleware

### Observability Stack
- **lightstep-tracer**: Distributed tracing backend
- **opentracing**: Vendor-neutral tracing API
- Combined with internal `@verifiedfan/prometheus` for metrics

### Utilities
- **ramda**: Functional programming - used extensively across the codebase
- **csv-parse**: CSV file processing for bulk uploads
- **dns-cache**: DNS caching for improved network performance
- **request-promise-native**: HTTP client for service-to-service communication

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@babel/cli** | ^7.8.3 | Babel command-line interface |
| **@babel/core** | ^7.8.3 | Babel compiler core |
| **@babel/node** | ^7.8.3 | Babel Node.js runtime |
| **@babel/plugin-proposal-do-expressions** | ^7.8.3 | Do expressions syntax |
| **@babel/plugin-proposal-object-rest-spread** | ^7.8.3 | Object spread/rest operators |
| **@babel/plugin-transform-optional-chaining** | ^7.8.3 | Optional chaining (?.) |
| **@babel/plugin-transform-runtime** | ^7.8.3 | Babel runtime helpers |
| **@babel/preset-env** | ^7.8.3 | Smart preset for target environments |
| **@babel/register** | ^7.8.3 | Require hook for Babel |
| **aws-sdk** | ^2.190.0 | AWS SDK (for testing) |
| **babel-eslint** | ^10.1.0 | Babel parser for ESLint |
| **babel-loader** | ^8.0.0 | Webpack Babel loader |
| **chai-json-schema-ajv** | 3.0.0 | JSON schema validation |
| **chai-match** | ^1.1.1 | Pattern matching assertions |
| **chai-subset** | ^1.6.0 | Subset matching assertions |
| **colors** | ^1.1.2 | Console color output |
| **copy-paste** | ^1.3.0 | Clipboard utilities |
| **cucumber** | 4.2.1 | BDD testing framework |
| **cucumber-html-reporter** | ^7.1.1 | Cucumber HTML reports |
| **debug** | ^3.1.0 | Debug logging utility |
| **eslint** | ^4.9.0 | JavaScript linter |
| **eslint-loader** | 2.0.0 | Webpack ESLint loader |
| **eslint-plugin-css-modules** | 2.7.5 | CSS Modules linting |
| **eslint-plugin-fp** | ^2.3.0 | Functional programming linting |
| **eslint-plugin-graphql** | ^1.4.1 | GraphQL linting |
| **eslint-plugin-import** | ^2.8.0 | ES6 import/export linting |
| **eslint-plugin-react** | ^7.4.0 | React linting (⚠️ unused?) |
| **husky** | ^0.14.3 | Git hooks |
| **jest** | ^25.1.0 | Testing framework |
| **jest-environment-node-debug** | ^2.0.0 | Jest debugging environment |
| **nodemon** | ^1.12.1 | Auto-restart for development |
| **prettier-eslint** | ^8.8.1 | Code formatting |
| **prettier-eslint-cli** | ^4.7.1 | Prettier CLI with ESLint |
| **runjs** | ^4.4.2 | Task runner |
| **source-map-support** | ^0.5.0 | Source map support for stack traces |
| **string-replace-loader** | ^2.3.0 | Webpack string replacement |
| **webpack** | ^3.8.1 | Module bundler |
| **webpack-merge** | ^4.1.0 | Webpack config merging |
| **yaml-loader** | ^0.5.0 | YAML file loader |

### Testing Stack
- **cucumber**: BDD testing (4.2.1)
- **jest**: Unit testing (25.1.0)
- **chai**: Assertion library (with multiple plugins)
- **aws-sdk**: AWS mocking/testing

### Build Tools
- **Babel 7**: Modern JavaScript transpilation
- **Webpack 3**: Module bundling
- **ESLint 4**: Code linting
- **Prettier**: Code formatting

### Development Tools
- **nodemon**: Auto-restart on file changes
- **runjs**: Task automation
- **husky**: Git hooks for quality checks

## Peer Dependencies

None explicitly declared.

## Version Pinning Strategy

- Most packages use caret ranges (^) allowing minor/patch updates
- **csv-parse** is pinned to exact version 4.8.6
- **cucumber** is pinned to exact version 4.2.1
- Mix of flexible and strict versioning
