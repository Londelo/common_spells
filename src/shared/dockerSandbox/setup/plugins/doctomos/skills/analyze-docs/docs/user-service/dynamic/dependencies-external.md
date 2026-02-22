# External Dependencies - user-service

## Production Dependencies

| Package | Version | Purpose | Usage Status |
|---------|---------|---------|--------------|
| @opentelemetry/api | ^1.9.0 | OpenTelemetry API for distributed tracing | Used |
| Base64 | ^1.0.1 | Base64 encoding/decoding | Unknown |
| blueimp-md5 | ^2.10.0 | MD5 hashing | Used (likely for legacy systems) |
| chai | ^4.1.2 | Assertion library (should be dev dependency) | Used in tests |
| chai-json-equal | ^0.0.1 | JSON comparison for chai | Used in tests |
| dns-cache | ^2.0.0 | DNS caching to improve performance | Unknown |
| fb | ^2.0.0 | Facebook API client | Used for Facebook integration |
| fuel-rest | ^2.0.5 | RESTful API utilities | Unknown |
| googleapis | ^25.0.0 | Google APIs client library | Used for Google integration |
| js-sha1 | ^0.6.0 | SHA1 hashing | Unknown |
| js-yaml-loader | ^1.2.2 | YAML file loader | Used for configuration |
| jsonwebtoken | ^8.5.0 | JWT token handling | Used for authentication |
| koa | ^2.4.1 | Web framework | Used (core framework) |
| koa-bodyparser | ^4.2.0 | Request body parsing middleware | Used |
| koa-compress | ^2.0.0 | Response compression middleware | Used |
| koa-router | ^7.3.0 | Routing middleware | Used extensively |
| koa-unless | ^1.0.7 | Conditional middleware execution | Used |
| libphonenumber-js | ^1.10.30 | Phone number parsing and validation | Used for contact validation |
| node-rsa | ^0.4.2 | RSA encryption/decryption | Used for worker keys |
| ramda | ^0.27.0 | Functional programming utilities | Used extensively throughout |
| rand-token | ^0.4.0 | Random token generation | Unknown |
| request-promise-native | ^1.0.9 | HTTP request library (deprecated) | Used for external API calls |
| tumblr.js | ^1.1.1 | Tumblr API client | Used for Tumblr integration |
| twitter | ^1.7.1 | Twitter API client | Used for Twitter integration |

## Dev Dependencies

| Package | Version | Purpose | Usage Status |
|---------|---------|---------|--------------|
| @babel/core | ^7.24.6 | Babel transpiler core | Used for ES6+ support |
| @babel/node | ^7.22.19 | Babel Node.js CLI | Used for running babel scripts |
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Babel plugin for do expressions | Used |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Babel plugin for spread operator | Used |
| @babel/plugin-transform-runtime | ^7.24.6 | Babel runtime helpers | Used |
| @babel/preset-env | ^7.24.6 | Babel environment preset | Used |
| @babel/register | ^7.13.0 | Babel require hook | Used |
| @babel/runtime | ^7.27.6 | Babel runtime polyfills | Used |
| babel-eslint | ^8.0.0 | Babel parser for ESLint | Used for linting |
| babel-loader | ^9.1.3 | Webpack Babel loader | Used |
| babel-plugin-inline-import | ^3.0.0 | Import files as strings | Used |
| chai-json-schema-ajv | 3.0.0 | JSON schema validation for chai | Used in tests |
| chai-match | ^1.1.1 | Pattern matching for chai | Used in tests |
| chai-subset | ^1.6.0 | Subset matching for chai | Used in tests |
| colors | ^1.1.2 | Terminal colors | Used for logging |
| copy-paste | ^1.3.0 | Clipboard operations | Unknown |
| cucumber | ^6.0.5 | BDD testing framework | Used for integration tests |
| cucumber-html-reporter | ^5.1.0 | HTML reports for Cucumber | Used |
| cucumber-pretty | 6.0.0 | Pretty formatter for Cucumber | Used |
| debug | ^3.1.0 | Debug logging utility | Used extensively |
| eslint | ^4.9.0 | JavaScript linter | Used |
| eslint-loader | 2.0.0 | Webpack ESLint loader | Used |
| eslint-plugin-css-modules | 2.7.5 | ESLint plugin for CSS modules | Used |
| eslint-plugin-fp | ^2.3.0 | ESLint functional programming rules | Used |
| eslint-plugin-graphql | ^1.4.1 | ESLint GraphQL rules | Used |
| eslint-plugin-import | ^2.8.0 | ESLint import rules | Used |
| eslint-plugin-react | ^7.4.0 | ESLint React rules | Used |
| html-loader | ^5.0.0 | Webpack HTML loader | Used |
| husky | ^0.14.3 | Git hooks | Used for pre-push hooks |
| jest | ^30.0.4 | Testing framework | Used for unit tests |
| jest-environment-node-debug | ^2.0.0 | Jest debugging environment | Used |
| markdown-loader | ^8.0.0 | Webpack markdown loader | Used |
| nodemon | ^1.12.1 | Auto-restart development server | Used |
| prettier-eslint | ^8.8.1 | Code formatter with ESLint | Used |
| prettier-eslint-cli | ^4.7.1 | CLI for prettier-eslint | Used |
| runjs | ^4.4.2 | Task runner | Used (see runfile.js) |
| source-map-support | ^0.5.0 | Source map support for stack traces | Used |
| string-replace-loader | ^3.1.0 | Webpack string replacement | Used |
| webpack | ^5.90.1 | Module bundler | Used |
| webpack-cli | ^5.1.4 | Webpack CLI | Used |
| webpack-merge | ^4.1.0 | Webpack config merging | Used |

## Security & Age Concerns

### Very Outdated Packages
- **koa** (^2.4.1): Released 2017, current is 2.15.x - Security risk
- **koa-router** (^7.3.0): Released 2017, current is 12.x - Major versions behind
- **jsonwebtoken** (^8.5.0): Released 2019, current is 9.x
- **googleapis** (^25.0.0): Released 2018, current is 130+
- **eslint** (^4.9.0): Released 2017, current is 9.x
- **husky** (^0.14.3): Released 2017, current is 9.x

### Deprecated Packages
- **request-promise-native**: Deprecated since 2020, should migrate to axios, node-fetch, or built-in fetch
- **babel-eslint**: Deprecated in favor of @babel/eslint-parser

### Misplaced Dependencies
- **chai** and **chai-json-equal**: Should be in devDependencies, not production dependencies

### Social Media API Clients
The service includes integration with multiple social platforms:
- Facebook (fb)
- Google (googleapis)
- Twitter (twitter)
- Tumblr (tumblr.js)

These packages need regular updates to maintain API compatibility.
