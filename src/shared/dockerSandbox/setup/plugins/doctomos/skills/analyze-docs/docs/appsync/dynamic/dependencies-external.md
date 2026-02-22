# External Dependencies - appsync

## Production Dependencies

**Note:** This project has no production dependencies. All dependencies are development/build-time dependencies since AppSync resolvers are deployed as JavaScript code to AWS AppSync service.

## Development Dependencies

### AWS AppSync Core

| Package | Version | Purpose |
|---------|---------|---------|
| @aws-appsync/eslint-plugin | ^1.2.1 | ESLint rules for AppSync resolver development |
| @aws-appsync/utils | ^1.2.5 | AppSync JavaScript runtime utilities (Context, util, runtime) |
| @aws-sdk/client-appsync | ^3.391.0 | AWS SDK v3 client for AppSync service operations |

**Usage:** Core dependencies for AWS AppSync JavaScript resolver runtime. The `@aws-appsync/utils` package is heavily used across all resolvers and functions for context handling, error management, and runtime operations.

### Build Tools

| Package | Version | Purpose |
|---------|---------|---------|
| esbuild | ^0.19.2 | Fast JavaScript bundler for TypeScript compilation |
| esbuild-plugin-eslint | ^0.3.7 | ESLint integration for esbuild |
| typescript | 5.1.6 | TypeScript compiler and language support |
| ts-node | ^10.9.1 | TypeScript execution for Node.js (used in build scripts) |
| webpack | ^4.23.0 | Module bundler (legacy, may be unused) |

**Usage:** Build pipeline for compiling TypeScript resolvers/functions to JavaScript that runs on AppSync.

### Babel Ecosystem (Legacy)

| Package | Version | Purpose |
|---------|---------|---------|
| babel-cli | ^6.26.0 | Babel command line interface |
| babel-core | ^6.26.3 | Babel compiler core |
| babel-loader | ^7.1.5 | Webpack loader for Babel |
| babel-polyfill | ^6.26.0 | ES6+ polyfills |
| babel-preset-env | ^1.7.0 | Babel preset for environment-specific transforms |
| babel-register | ^6.26.0 | Runtime Babel compilation |
| @babel/eslint-parser | ^7.22.10 | Babel parser for ESLint |

**Plugins:**
- babel-plugin-inline-import (2.0.6): Inline file imports
- babel-plugin-transform-do-expressions (^6.22.0): Do expression syntax
- babel-plugin-transform-object-rest-spread (^6.26.0): Object spread operator
- babel-plugin-transform-runtime (^6.23.0): Runtime helpers

**Status:** Babel 6.x is very outdated (released 2015-2016). This is likely legacy tooling that may not be actively used since the project uses esbuild. Consider removing if not needed.

### Testing Framework

| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^29.6.2 | JavaScript testing framework |
| @types/jest | ^29.5.11 | TypeScript type definitions for Jest |
| ts-jest | ^29.1.2 | Jest transformer for TypeScript |
| chai | ^4.2.0 | BDD/TDD assertion library |
| chai-json-schema-ajv | ^3.0.0 | JSON schema validation for Chai |
| chai-match | ^1.1.1 | Pattern matching assertions |
| chai-subset | ^1.6.0 | Deep subset assertions |

**Usage:** Jest for unit tests (`.spec.ts` files). Chai for BDD-style assertions in Cucumber feature tests.

### Cucumber/BDD Testing

| Package | Version | Purpose |
|---------|---------|---------|
| cucumber | 3.2.0 | BDD testing framework (Gherkin feature files) |
| cucumber-html-reporter | 3.0.4 | HTML report generation for Cucumber tests |

**Status:** Cucumber 3.2.0 is quite old (released 2018). Current version is 10.x. This is a major version gap that may cause compatibility issues.

### Linting & Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^8.56.0 | JavaScript/TypeScript linter |
| @typescript-eslint/eslint-plugin | ^6.4.1 | TypeScript-specific ESLint rules |
| @typescript-eslint/parser | ^6.4.1 | TypeScript parser for ESLint |
| @graphql-eslint/eslint-plugin | ^3.20.1 | GraphQL schema linting rules |
| eslint-import-resolver-typescript | ^3.6.1 | TypeScript import resolution for ESLint |
| eslint-plugin-fp | ^2.3.0 | Functional programming linting rules |
| eslint-plugin-import | ^2.14.0 | ES6 import/export linting |

**Usage:** Comprehensive linting for TypeScript, JavaScript, and GraphQL schema files.

### GraphQL Tools

| Package | Version | Purpose |
|---------|---------|---------|
| graphql | ^16.8.1 | GraphQL query language implementation |
| @graphql-tools/load-files | ^7.0.0 | Load GraphQL schema files from filesystem |
| @graphql-tools/merge | ^9.0.1 | Merge multiple GraphQL schemas into one |

**Usage:** Build process loads and merges GraphQL schema partials from `app/schema/` into single `dist/schema.graphql`.

### AWS SDK

| Package | Version | Purpose |
|---------|---------|---------|
| aws-sdk | ^2.1438.0 | AWS SDK v2 (legacy) |

**Status:** AWS SDK v2 is in maintenance mode. AWS recommends migrating to SDK v3 (which is already used for AppSync client). This v2 dependency may be used in feature tests or build scripts.

### Utility Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| ramda | ^0.26.1 | Functional programming utilities |
| glob | ^9.3.5 | File pattern matching |
| runjs | 3.4.1 | Task runner for build scripts |

**Usage:** Ramda for functional programming patterns, glob for file operations in build, runjs for task orchestration.

## Dependency Health Summary

### Outdated Major Versions
- **Cucumber**: 3.2.0 → 10.x (5+ years behind)
- **Babel ecosystem**: 6.x → 7.x (7+ years behind)
- **Webpack**: 4.x → 5.x (potentially unused)
- **AWS SDK**: v2 → v3 (maintenance mode)

### Moderate Outdated
- **Ramda**: 0.26.1 → 0.30.x (minor versions behind)
- **Chai**: 4.2.0 → 5.x (major version behind)

### Up to Date
- **Jest**: 29.x (current)
- **TypeScript**: 5.1.6 (modern)
- **ESLint**: 8.x (current stable)
- **esbuild**: 0.19.2 (modern)
- **GraphQL**: 16.x (current)
