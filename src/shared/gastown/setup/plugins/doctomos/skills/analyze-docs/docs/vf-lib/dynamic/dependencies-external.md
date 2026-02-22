# External Dependencies - vf-lib

## Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| debug | ^3.0.1 | Debugging utility for logging namespaced debug output |
| ramda | ^0.27.0 | Functional programming utility library |

### Usage Details

**debug (v3.0.1)**
- Used in: `src/Debug.js`, `src/pagingUtils/exhaustAllPages.js`, `src/rest/request.js`
- Purpose: Provides namespaced debugging with conditional output
- Status: ⚠️ **Very outdated** - Current version is 4.x (released 2021)

**ramda (v0.27.0)**
- Used extensively across codebase (15+ files)
- Purpose: Functional programming utilities (curry, identity, compose, etc.)
- Key modules: Debug, selectors, middlewares, cache utils, metrics
- Status: ⚠️ **Outdated** - Current version is 0.30.x

## Dev Dependencies

### Build & Compilation

| Package | Version | Purpose |
|---------|---------|---------|
| @babel/cli | ^7.23.0 | Babel command line interface |
| @babel/core | ^7.23.2 | Babel core compiler |
| @babel/eslint-parser | ^7.22.15 | ESLint parser for Babel syntax |
| @babel/plugin-proposal-do-expressions | ^7.22.5 | Babel plugin for do expressions |
| @babel/plugin-transform-object-rest-spread | ^7.22.15 | Babel plugin for object spread |
| @babel/plugin-transform-runtime | ^7.23.2 | Babel runtime transform |
| @babel/preset-env | ^7.23.2 | Babel preset for environment targets |
| @babel/register | ^7.22.15 | Babel require hook |
| babel-jest | ^29.7.0 | Jest transformer using Babel |
| babel-plugin-inline-import | ^2.0.6 | Babel plugin for inline imports |

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^29.7.0 | Testing framework |
| @types/jest | ^29.5.5 | TypeScript types for Jest |
| jest-environment-node-debug | ^2.0.0 | Jest debugging environment |
| ts-jest | ^29.1.1 | TypeScript preprocessor for Jest |

### TypeScript

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.2.2 | TypeScript compiler |
| @types/ramda | ^0.29.7 | TypeScript types for Ramda |
| ts-node | ^10.9.1 | TypeScript execution engine |

### Linting & Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^7.26.0 | JavaScript linting |
| @typescript-eslint/eslint-plugin | ^6.8.0 | TypeScript ESLint plugin |
| @typescript-eslint/parser | ^6.8.0 | TypeScript parser for ESLint |
| eslint-import-resolver-typescript | ^3.6.1 | TypeScript import resolver |
| eslint-plugin-fp | ^2.3.0 | Functional programming ESLint rules |
| eslint-plugin-import | ^2.28.1 | Import/export linting |
| eslint-plugin-require-path-exists | ^1.1.9 | Path validation plugin |
| prettier-eslint-cli | ^5.0.1 | Prettier + ESLint CLI |

### Release & Versioning

| Package | Version | Purpose |
|---------|---------|---------|
| semantic-release | ^19.0.5 | Automated versioning and changelog |
| @semantic-release/changelog | ^6.0.3 | Changelog generation |
| @semantic-release/git | ^6.0.3 | Git plugin for semantic-release |
| @semantic-release/gitlab | ^9.5.1 | GitLab integration for semantic-release |

### Git Hooks & Commit Standards

| Package | Version | Purpose |
|---------|---------|---------|
| husky | ^0.14.3 | Git hooks manager |
| commitizen | ^4.2.3 | Standardized commit messages |
| cz-conventional-changelog | ^2.1.0 | Conventional changelog adapter |
| validate-commit-msg | ^2.14.0 | Commit message validation |

### Build Tools

| Package | Version | Purpose |
|---------|---------|---------|
| lerna | ^4.0.0 | Monorepo management |
| runjs | ^4.3.3 | Task runner (used in build scripts) |

## Peer Dependencies

None specified.

## External Dependencies Summary

- **Total Production Dependencies**: 2
- **Total Dev Dependencies**: 37
- **Most Critical**: debug, ramda (used throughout codebase)
- **Build System**: Babel 7.x + TypeScript 5.x
- **Testing**: Jest 29.x
- **Linting**: ESLint 7.x (outdated)
- **Monorepo Tool**: Lerna 4.x
