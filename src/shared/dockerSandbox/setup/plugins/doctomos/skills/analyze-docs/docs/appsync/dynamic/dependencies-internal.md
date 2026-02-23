# Internal Dependencies - appsync

## @verifiedfan/* Packages

All internal packages are in `devDependencies` since AppSync resolvers don't have runtime dependencies - everything is bundled at build time or used only in tests.

### Testing & Infrastructure

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/test-utils | ^2.6.0 | Shared test utilities and helpers for feature tests |
| @verifiedfan/cucumber-features | ^1.0.4 | Shared Cucumber step definitions and BDD test framework |
| @verifiedfan/configs | ^1.2.4 | Configuration management for different environments |

**Usage in Code:**
- `features/cucumberSetup.js`: Imports `initStepDefinitions` and `SHORT_TIMEOUT` from cucumber-features
- `features/lib/config.js`: Uses configs package for environment configuration
- `features/step_definitions/`: Multiple files use test-utils for test data generation and cucumber-features for assertions/utilities

### Data Access & Integration

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/aws | ^1.8.0 | AWS service wrappers and utilities |
| @verifiedfan/redis | ^1.4.2 | Redis client and caching utilities |
| @verifiedfan/tm-accounts | ^2.3.0 | Ticketmaster accounts API client |
| @verifiedfan/tm-users | ^2.0.3 | Ticketmaster users API client |
| @verifiedfan/spotify | ^1.1.2 | Spotify API integration |

**Usage in Code:**
- `features/lib/redis.js`: Redis client for cache operations in tests
- `features/lib/tmUsers.js`: TM Users client for identity management in tests
- `features/step_definitions/identity.js`: Uses TM Accounts for account operations
- AWS package likely used in feature tests for DynamoDB/Lambda interactions

### Utilities & Helpers

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/object-utils | ^1.2.0 | Object manipulation utilities |
| @verifiedfan/batch-fn | ^1.1.0 | Batch function utilities for data processing |
| @verifiedfan/log | ^1.4.1 | Logging utilities |
| @verifiedfan/yaml | ^1.2.0 | YAML parsing and manipulation |
| @verifiedfan/schemas | ^1.3.0 | Shared data schemas and validation |

**Usage in Code:**
- Likely used throughout the codebase for utility functions
- Log package for structured logging
- Schemas for data validation in tests

### Date Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/date* | (via cucumber-features) | Date manipulation (imported as `toISOString` in campaigns.js) |

**Usage in Code:**
- `features/step_definitions/campaigns.js`: Imports `toISOString` for date formatting

## Coupling Analysis

### Dependency Intensity: Medium-Low

**Why Medium-Low:**
- Internal packages are **only used in tests/build**, not in production AppSync resolvers
- AppSync resolvers are self-contained JavaScript functions that run on AWS infrastructure
- No runtime coupling to internal services

### Test Infrastructure Coupling: High

**Primary Dependencies:**
- `@verifiedfan/cucumber-features`: Core BDD testing framework
- `@verifiedfan/test-utils`: Shared test helpers
- `@verifiedfan/configs`: Environment configuration

**Impact:** Tightly coupled to VF test infrastructure. Changes to these packages may require test updates.

### Integration Testing Coupling: Medium

**Service Integrations:**
- `@verifiedfan/tm-accounts`: TM account service integration
- `@verifiedfan/tm-users`: TM user service integration
- `@verifiedfan/redis`: Cache layer (shared infrastructure)
- `@verifiedfan/spotify`: Spotify integration (verification data)

**Impact:** Feature tests interact with real services using these clients. Breaking changes in these packages require test updates.

### Production Runtime Coupling: None

**Key Point:** AppSync resolvers have **zero runtime dependencies** on @verifiedfan packages. All code is:
- Compiled to standalone JavaScript at build time
- Deployed to AWS AppSync service
- Runs in AWS-managed AppSync JavaScript runtime

**Architecture Benefit:** This service can be deployed/scaled independently without coordinating with other VF services.

## Version Health

### Version Patterns
All packages use caret (^) version ranges, allowing minor/patch updates:
- Test frameworks: 1.x - 2.x versions
- Service clients: 1.x - 2.x versions
- Utilities: 1.x versions

### No Obvious Version Issues
- All packages appear to be on relatively modern 1.x or 2.x versions
- No pre-1.0 packages (stability indicator)
- No wildcard (*) versions (good dependency discipline)

### Recommendation
Since these are only dev dependencies, version mismatches are lower risk. However:
- Consider periodic updates to stay current with test framework improvements
- Watch for breaking changes in service client packages (tm-accounts, tm-users)
- Keep config package in sync with environment changes

## Dependency Usage Breakdown

### Only in Feature Tests (Cucumber)
- All 11 @verifiedfan packages
- Used for setting up test data, making API calls, and asserting results
- No presence in `app/src/` (resolver/function code)

### Not in Resolvers
- AppSync resolvers (`app/src/`) have no @verifiedfan imports
- Resolvers only import from `@aws-appsync/utils`
- Complete isolation from internal package ecosystem

### Build-Time Only
- Configuration and utility packages may be used in build scripts
- No evidence of runtime usage in deployed code
