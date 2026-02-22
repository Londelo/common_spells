# External Dependencies - admin-ui

## Production Dependencies

### Build Tools & Transpilation

| Package | Version | Purpose |
|---------|---------|---------|
| @babel/cli | ^7.13.0 | Babel command line interface for transpilation |
| @babel/core | ^7.13.0 | Core Babel transpiler |
| @babel/node | ^7.22.19 | Babel Node.js runtime for ES6+ execution |
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Babel plugin for do-expressions syntax |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Babel plugin for object spread/rest |
| @babel/plugin-transform-runtime | ^7.13.0 | Babel runtime transformer |
| @babel/polyfill | ^7.12.1 | Polyfills for older browsers (deprecated) |
| @babel/preset-env | ^7.13.0 | Smart Babel preset for target environments |
| @babel/preset-react | ^7.23.3 | Babel preset for React JSX |
| @babel/preset-stage-0 | ^7.8.3 | Babel preset for experimental features |
| @babel/register | ^7.13.0 | Babel require hook |
| babel-loader | ^8.0.0 | Webpack loader for Babel |
| babel-plugin-inline-react-svg | ^2.0.2 | Inline SVG in React components |
| babel-plugin-ramda | ^2.1.1 | Tree-shaking optimization for Ramda |
| source-map-support | ^0.4.18 | Source map support for stack traces |

### GraphQL & Apollo

| Package | Version | Purpose |
|---------|---------|---------|
| apollo-cache-inmemory | ^1.1.7 | Apollo in-memory cache implementation |
| apollo-client | ^2.6.10 | GraphQL client for React |
| apollo-link-http | ^1.3.3 | HTTP link for Apollo Client |
| apollo-upload-client | ^11.0.0 | File upload support for Apollo |
| graphql | ^0.13.0 | GraphQL query language implementation |
| graphql-tag | ^2.7.3 | GraphQL query parser |

### Linting & Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^4.9.0 | JavaScript linter |
| babel-eslint | ^8.0.3 | Babel parser for ESLint |
| eslint-loader | ^4.0.2 | Webpack loader for ESLint |
| eslint-plugin-css-modules | 2.7.5 | CSS modules linting |
| eslint-plugin-graphql | ^1.4.1 | GraphQL query linting |
| eslint-plugin-import | ^2.8.0 | ES6 import/export linting |
| eslint-plugin-react | ^7.4.0 | React-specific linting rules |
| eslint-plugin-require-path-exists | ^1.1.7 | Verify import paths exist |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| ramda | ^0.29.1 | Functional programming utility library |
| date-fns | ^4.1.0 | Modern date utility library |
| isomorphic-fetch | ^3.0.0 | Universal fetch API |
| async-retry | ^1.3.3 | Retry async operations with exponential backoff |
| randomstring | ^1.1.5 | Random string generation |
| request-promise-native | ^1.0.5 | HTTP request library with promises |

### Data Processing & Export

| Package | Version | Purpose |
|---------|---------|---------|
| export-to-csv | ^1.3.0 | CSV export functionality |
| papaparse | ^5.4.1 | CSV parsing library |

### Development & Testing

| Package | Version | Purpose |
|---------|---------|---------|
| nodemon | ^1.12.1 | Auto-restart Node.js on file changes |
| cucumber-html-reporter | ^7.1.1 | Generate HTML reports for Cucumber tests |

## Dev Dependencies

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^30.0.5 | JavaScript testing framework |
| babel-jest | ^30.0.5 | Babel transformer for Jest |
| jest-environment-jsdom | ^30.1.1 | JSDOM environment for Jest |
| jest-transform-yaml | ^1.2.0 | YAML transformer for Jest |

### Build & Bundling

| Package | Version | Purpose |
|---------|---------|---------|
| webpack | ^5.72.0 | Module bundler |
| webpack-cli | ^4.10.0 | Webpack command line interface |
| webpack-dev-server | ^4.8.1 | Development server with hot reload |
| copy-webpack-plugin | 6.4.1 | Copy files during webpack build |
| terser-webpack-plugin | ^5.3.1 | JavaScript minification |

### Loaders

| Package | Version | Purpose |
|---------|---------|---------|
| json-loader | ^0.5.7 | Load JSON files as modules |
| yaml-loader | 0.6.0 | Load YAML files as modules |

### Development Tools

| Package | Version | Purpose |
|---------|---------|---------|
| runjs | ^4.4.2 | Task runner for build scripts |
| eslint-import-resolver-webpack | ^0.13.2 | Resolve webpack aliases in ESLint |
| husky | ^0.14.3 | Git hooks manager |

## Peer Dependencies

None specified.

## Category Summary

- **Build & Transpilation**: 15 packages (Babel ecosystem)
- **GraphQL**: 6 packages (Apollo v2)
- **Linting**: 8 packages (ESLint ecosystem)
- **Utilities**: 6 packages (Ramda, date-fns, etc.)
- **Testing**: 4 packages (Jest)
- **Webpack**: 6 packages (Webpack 5)
- **Development Tools**: 4 packages

**Total External Dependencies**: 28 production + 10 dev = 38 packages
