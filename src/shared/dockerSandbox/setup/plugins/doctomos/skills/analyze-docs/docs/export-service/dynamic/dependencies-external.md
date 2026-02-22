# External Dependencies - export-service

## Production Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| @opentelemetry/api | ^1.9.0 | OpenTelemetry API for distributed tracing | Observability |
| chai | ^4.1.2 | BDD/TDD assertion library | Testing |
| chai-json-equal | ^0.0.1 | JSON equality assertions for Chai | Testing |
| csv-parse | ^4.15.4 | CSV parsing library | Data Processing |
| csv-write-stream | ^2.0.0 | CSV writing stream | Data Processing |
| dns-cache | ^2.0.0 | DNS caching for improved performance | Performance |
| jszip | ^3.10.1 | Create and read zip files | Data Processing |
| koa | ^2.4.1 | Web framework for Node.js | Framework |
| koa-bodyparser | ^4.2.0 | Body parser middleware for Koa | Framework |
| koa-compress | ^2.0.0 | Compression middleware for Koa | Framework |
| koa-router | ^7.3.0 | Router middleware for Koa | Framework |
| koa-unless | ^1.0.7 | Conditional middleware execution | Framework |
| moment | ^2.24.0 | Date/time manipulation library | Utility |
| moment-timezone | ^0.5.14 | Timezone support for Moment.js | Utility |
| ramda | ^0.27.0 | Functional programming utility library | Utility |
| uuid | ^3.3.2 | UUID generation | Utility |

## Dev Dependencies

### Build & Transpilation

| Package | Version | Purpose |
|---------|---------|---------|
| @babel/cli | ^7.13.0 | Babel command line interface |
| @babel/core | ^7.13.0 | Babel compiler core |
| @babel/node | ^7.22.19 | Babel Node.js runtime |
| @babel/plugin-proposal-do-expressions | ^7.13.0 | Babel plugin for do expressions |
| @babel/plugin-proposal-object-rest-spread | ^7.13.0 | Object rest/spread properties |
| @babel/plugin-transform-runtime | ^7.13.0 | Babel runtime helpers |
| @babel/preset-env | ^7.13.0 | Babel preset for target environments |
| @babel/register | ^7.13.0 | Babel require hook |
| webpack | ^5.90.1 | Module bundler |
| webpack-cli | ^5.1.4 | Webpack command line interface |
| webpack-merge | ^4.1.0 | Merge webpack configurations |

### Linting & Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^7.0.0 | JavaScript linter |
| babel-eslint | ^8.0.0 | Babel parser for ESLint |
| eslint-loader | ^4.0.2 | Webpack ESLint loader |
| eslint-plugin-css-modules | 2.7.5 | CSS modules ESLint plugin |
| eslint-plugin-fp | ^2.3.0 | Functional programming ESLint rules |
| eslint-plugin-graphql | ^1.4.1 | GraphQL ESLint rules |
| eslint-plugin-import | ^2.8.0 | Import/export syntax validation |
| eslint-plugin-react | ^7.4.0 | React ESLint rules |

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^25.1.0 | JavaScript testing framework |
| jest-environment-node-debug | ^2.0.0 | Jest debug environment |
| cucumber | ^6.0.5 | BDD testing framework |
| cucumber-html-reporter | ^5.1.0 | HTML reporting for Cucumber |
| cucumber-pretty | 6.0.0 | Pretty formatter for Cucumber |
| chai-json-schema-ajv | 3.0.0 | JSON schema validation for Chai |
| chai-match | ^1.1.1 | String matching assertions |
| chai-subset | ^1.6.0 | Subset matching assertions |
| deep-equal-in-any-order | ^1.1.4 | Deep equality with order flexibility |

### Development Tools

| Package | Version | Purpose |
|---------|---------|---------|
| nodemon | ^3.0.3 | Auto-restart on file changes |
| runjs | ^4.4.2 | Task automation tool |
| husky | ^0.14.3 | Git hooks |
| debug | ^3.1.0 | Debug logging utility |
| colors | ^1.1.2 | Terminal color output |
| copy-paste | ^1.3.0 | Clipboard operations |
| source-map-support | ^0.5.0 | Source map support for stack traces |

### Webpack Loaders

| Package | Version | Purpose |
|---------|---------|---------|
| babel-loader | ^9.1.3 | Babel loader for Webpack |
| babel-plugin-inline-import | ^3.0.0 | Inline file imports |
| html-loader | ^5.0.0 | HTML file loader |
| js-yaml-loader | ^1.0.1 | YAML file loader |
| markdown-loader | ^8.0.0 | Markdown file loader |
| string-replace-loader | ^2.3.0 | String replacement in modules |

## Peer Dependencies

None specified.

## Package Manager

- **Yarn**: ^4.0.2 (specified via packageManager field)

## Resolutions

| Package | Version | Reason |
|---------|---------|--------|
| mongodb | ^6.17.0 | Force specific MongoDB driver version (likely for @verifiedfan/mongodb compatibility) |
