# External Dependencies - vf-api-workers

## Production Dependencies

| Package | Version | Purpose | Usage Level |
|---------|---------|---------|-------------|
| **ramda** | ^0.27.0 | Functional programming utilities | **HIGH** - Used 57+ times across codebase |
| **debug** | ^4.1.0 | Debugging utility for logging | **HIGH** - Used 18+ times for debug logging |
| **typescript** | ^5.2.2 | TypeScript compiler | **MEDIUM** - Type checking and compilation |
| **ts-node** | ^10.9.1 | TypeScript execution for Node.js | **MEDIUM** - Runtime execution |
| **moment** | ^2.24.0 | Date/time manipulation | **LOW** - Legacy date library (consider migration) |
| **uuid** | ^3.2.1 | UUID generation | **LOW** - Used for unique identifiers |
| **csv-parse** | 4.8.6 | CSV parsing | **LOW** - Data processing |
| **async-retry** | ^1.3.3 | Retry logic for async operations | **LOW** - Used 2+ times for resilience |
| **awaity** | ^1.0.0 | Promise utilities | **LOW** - Async helper |
| **@babel/eslint-parser** | ^7.26.8 | Babel ESLint parser | **MEDIUM** - Code linting |
| **@opentelemetry/api** | ^1.8.0 | OpenTelemetry API | **MEDIUM** - Observability/tracing |

## Dev Dependencies

### Build & Compilation
| Package | Version | Purpose |
|---------|---------|---------|
| **@babel/cli** | ^7.13.0 | Babel command line interface |
| **@babel/core** | ^7.13.0 | Babel compiler core |
| **@babel/preset-env** | ^7.13.0 | Babel preset for modern JS |
| **@babel/preset-typescript** | ^7.23.0 | TypeScript support for Babel |
| **@babel/register** | ^7.13.0 | Runtime Babel registration |
| **babel-loader** | ^8.0.0 | Webpack loader for Babel |
| **webpack** | ^4.47.0 | Module bundler |
| **webpack-cli** | ^4.10.0 | Webpack command line |

### Babel Plugins
| Package | Version | Purpose |
|---------|---------|---------|
| **@babel/plugin-proposal-do-expressions** | ^7.13.0 | Do expressions support |
| **@babel/plugin-proposal-object-rest-spread** | ^7.13.0 | Object spread operator |
| **@babel/plugin-transform-nullish-coalescing-operator** | ^7.23.4 | Nullish coalescing (??) |
| **@babel/plugin-transform-optional-chaining** | ^7.23.4 | Optional chaining (?.) |
| **@babel/plugin-transform-runtime** | ^7.13.0 | Runtime helpers |
| **babel-plugin-inline-import** | ^2.0.6 | Inline file imports |

### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| **jest** | ^25.1.0 | Testing framework |
| **babel-jest** | ^25.1.0 | Babel transformer for Jest |
| **@types/jest** | ^29.5.5 | TypeScript types for Jest |
| **chai** | ^4.1.2 | Assertion library |
| **chai-json-schema-ajv** | ^2.0.0 | JSON schema assertions |
| **chai-match** | ^1.1.1 | Pattern matching for Chai |
| **chai-subset** | ^1.6.0 | Subset matching for Chai |
| **cucumber** | ^6.0.5 | BDD testing framework |
| **cucumber-html-reporter** | ^5.1.0 | HTML reports for Cucumber |
| **cucumber-pretty** | ^6.0.0 | Pretty Cucumber output |

### Linting & Code Quality
| Package | Version | Purpose |
|---------|---------|---------|
| **eslint** | ^7.26.0 | JavaScript linter |
| **@typescript-eslint/eslint-plugin** | ^6.7.5 | TypeScript ESLint rules |
| **@typescript-eslint/parser** | ^6.7.5 | TypeScript parser for ESLint |
| **eslint-plugin-fp** | ^2.3.0 | Functional programming rules |
| **eslint-plugin-import** | ^2.23.3 | Import/export rules |
| **eslint-import-resolver-typescript** | ^3.6.1 | TypeScript import resolution |
| **babel-eslint** | ^10.1.0 | Babel parser for ESLint |
| **prettier-eslint-cli** | ^4.7.1 | Code formatting with Prettier |

### TypeScript Types
| Package | Version | Purpose |
|---------|---------|---------|
| **@types/aws-lambda** | ^8.10.124 | AWS Lambda types |
| **@types/debug** | ^4.1.9 | Debug library types |
| **@types/ramda** | ^0.29.6 | Ramda types |

### Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| **runjs** | ^4.3.2 | Task runner |
| **immutable** | ^4.3.4 | Immutable data structures |
| **colors** | ^1.1.2 | Terminal color output |
| **js-yaml-loader** | ^1.0.1 | YAML loader for webpack |
| **source-map-support** | ^0.5.9 | Source map support for stack traces |
| **ls** | ^0.2.1 | Directory listing utility |

## Peer Dependencies

None explicitly defined.

## Notes

### Security Considerations
- **moment** (^2.24.0) is a legacy dependency with known performance issues. The Moment.js team recommends migrating to modern alternatives like `date-fns` or native `Intl` APIs.
- **uuid** (^3.2.1) is several major versions behind (current is v10+). Consider upgrading for security patches.
- **webpack** (^4.47.0) is outdated (current is v5+). Webpack 4 reached end-of-life in 2020.
- **jest** (^25.1.0) is significantly outdated (current is v29+). Missing security updates and new features.

### Maintenance Concerns
- **cucumber** (^6.0.5) has been superseded by @cucumber/cucumber (v8+)
- **babel-eslint** (^10.1.0) is deprecated in favor of @babel/eslint-parser (which is already included)
- Multiple Babel packages are at ^7.13.0, several years old. Current is ^7.26.x
