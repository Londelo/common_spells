# External Dependencies - reg-ui

## Production Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| **@apollo/server** | ^4.10.4 | GraphQL server for mock API endpoint | GraphQL |
| **@as-integrations/next** | ^3.0.0 | Apollo Server integration for Next.js API routes | GraphQL |
| **@react-hook/media-query** | ^1.1.1 | React hook for media query matching | UI Utilities |
| **@react-hook/resize-observer** | ^2.0.2 | React hook for resize observation | UI Utilities |
| **@react-hook/window-size** | ^3.1.1 | React hook for window size tracking | UI Utilities |
| **@svgr/webpack** | ^8.1.0 | SVG to React component webpack loader | Build Tools |
| **@ticketmaster/global-design-system** | ^19.18.0 | Ticketmaster's official design system components | UI Components |
| **@types/ramda** | ^0.29.12 | TypeScript type definitions for Ramda | Type Definitions |
| **date-fns** | ^3.6.0 | Modern JavaScript date utility library | Date/Time |
| **deepmerge** | ^4.3.1 | Deep object merging utility | Utilities |
| **graphql** | ^16.8.1 | JavaScript reference implementation for GraphQL | GraphQL |
| **graphql-request** | ^6.1.0 | Minimal GraphQL client for AppSync queries | GraphQL |
| **graphql-tag** | ^2.12.6 | Template literal tag for parsing GraphQL queries | GraphQL |
| **graphql-type-json** | ^0.3.2 | JSON scalar type for GraphQL | GraphQL |
| **html-react-parser** | ^5.2.6 | HTML string to React element parser | Utilities |
| **jest-transform-yaml** | ^1.1.2 | Jest transformer for YAML files | Testing |
| **js-yaml** | ^4.1.0 | YAML parser and dumper | Configuration |
| **next** | 14.1.4 | React framework with App Router and RSC | Framework |
| **next-intl** | ^3.14.1 | Internationalization library for Next.js | i18n |
| **next-plugin-yaml** | ^1.0.1 | Next.js plugin to import YAML files | Build Tools |
| **polished** | ^4.3.1 | Lightweight CSS-in-JS toolkit | Styling |
| **prom-client** | ^15.1.3 | Prometheus metrics client for Node.js | Monitoring |
| **ramda** | ^0.29.1 | Functional programming utility library | Utilities |
| **react** | ^18 | JavaScript library for building user interfaces | Framework |
| **react-dom** | ^18 | React package for working with the DOM | Framework |
| **server-only** | ^0.0.1 | Marker package to prevent server code bundling to client | Build Tools |
| **styled-components** | ^6.1.8 | CSS-in-JS library for component styling | Styling |
| **swr** | ^2.2.5 | React hooks for data fetching with caching | Data Fetching |
| **zod** | ^3.23.8 | TypeScript-first schema validation library | Validation |
| **zustand** | ^4.5.2 | Lightweight state management library | State Management |

## Dev Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| **@graphql-codegen/add** | ^5.0.3 | GraphQL code generator plugin to add content | GraphQL Tooling |
| **@graphql-codegen/cli** | ^5.0.2 | CLI for GraphQL code generation from schema | GraphQL Tooling |
| **@graphql-codegen/schema-ast** | ^4.0.2 | Schema AST plugin for GraphQL codegen | GraphQL Tooling |
| **@testing-library/jest-dom** | ^6.4.5 | Custom Jest matchers for DOM testing | Testing |
| **@testing-library/react** | ^15.0.7 | React testing utilities | Testing |
| **@types/jest** | ^29.5.12 | TypeScript type definitions for Jest | Type Definitions |
| **@types/node** | ^20 | TypeScript type definitions for Node.js | Type Definitions |
| **@types/react** | ^18 | TypeScript type definitions for React | Type Definitions |
| **@types/react-dom** | ^18 | TypeScript type definitions for React DOM | Type Definitions |
| **@types/styled-components** | ^5.1.34 | TypeScript type definitions for styled-components | Type Definitions |
| **@typescript-eslint/eslint-plugin** | ^6.21.0 | ESLint plugin for TypeScript linting rules | Linting |
| **babel-plugin-styled-components** | ^2.1.4 | Babel plugin for styled-components SSR/debugging | Build Tools |
| **dotenv** | ^16.4.5 | Load environment variables from .env files | Configuration |
| **eslint** | ^8 | JavaScript/TypeScript linting utility | Linting |
| **eslint-config-next** | 14.1.4 | ESLint configuration for Next.js projects | Linting |
| **eslint-config-prettier** | ^9.1.0 | Disables ESLint rules that conflict with Prettier | Linting |
| **eslint-import-resolver-typescript** | ^3.6.1 | TypeScript path resolution for ESLint imports | Linting |
| **eslint-plugin-fp** | ^2.3.0 | ESLint rules for functional programming patterns | Linting |
| **eslint-plugin-import** | ^2.29.1 | ESLint plugin for ES6+ import/export syntax | Linting |
| **husky** | ^9.0.11 | Git hooks management tool | Git Tools |
| **jest** | ^29.7.0 | JavaScript testing framework | Testing |
| **jest-environment-jsdom** | ^29.7.0 | jsdom environment for Jest browser testing | Testing |
| **lint-staged** | ^15.2.2 | Run linters on git staged files | Git Tools |
| **prettier** | ^3.2.5 | Opinionated code formatter | Formatting |
| **typescript** | ^5 | TypeScript language and compiler | Language |

## Peer Dependencies

None explicitly declared in package.json.

## Usage Notes

### Critical Dependencies

**Next.js 14.1.4**: The application uses Next.js App Router with React Server Components. This version is pinned (not using caret) to maintain stability. Node.js 18.17+ is required.

**React 18**: Leverages concurrent rendering features and React Server Components via Next.js integration.

**Styled-Components v6**: Used throughout for all component styling. SSR configuration handled via babel plugin.

**Zustand**: Primary state management solution for global application state (campaign data, user entry status, form state).

### GraphQL Ecosystem

The application has a comprehensive GraphQL setup:
- **Production**: Uses `graphql-request` for AppSync queries
- **Development**: Mock server built with `@apollo/server` and `@as-integrations/next`
- **Code Generation**: `@graphql-codegen/*` packages generate TypeScript types from `.gql` files
- Operations defined in `graphql/operations/` directory

### Functional Programming

**Ramda**: Core utility library used extensively for functional operations. ESLint rules allow Ramda functions to mutate (exception to `fp/no-mutation` rule).

**ESLint-Plugin-FP**: Enforces strict FP patterns (no classes, no loops, no mutations, no `let` declarations).

### Internationalization

**next-intl v3.14.1**: Handles all i18n with locale-based routing and message translation. Works with translation files managed via Transifex.

### Testing Infrastructure

- **Jest 29**: Test runner with jsdom environment for DOM testing
- **Testing Library**: React Testing Library for component tests
- **Coverage**: Configured to output to `/coverage` directory

### Build Tools

- **@svgr/webpack**: Converts SVG files to React components
- **next-plugin-yaml**: Enables importing YAML config files
- **graphql-tag**: Webpack loader for `.gql` files

### Monitoring

**prom-client**: Exposes Prometheus metrics at `/metrics` endpoint for observability.
