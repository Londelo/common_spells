# Internal Dependencies - vf-lib

## @verifiedfan/* Packages

**No internal @verifiedfan/* dependencies found.**

This library serves as a foundational utility package and does not depend on other internal @verifiedfan packages.

## Internal Modules

This repository is structured as a monorepo with multiple internal modules:

### Core Modules (from index.js exports)

| Module | Purpose |
|--------|---------|
| aws | AWS utilities and integrations |
| build | Build and deployment utilities (Runfile) |
| cacheUtils | Caching utilities (Cache class) |
| config | Configuration management |
| correlation | Request correlation and tracing |
| datastore | Database connections (Mongo) |
| date | Date manipulation utilities |
| discovery | Service discovery |
| enums | Enumeration definitions |
| Error/VFError | Error handling and custom error types |
| fastly | Fastly CDN integration |
| facebook | Facebook API integration |
| instrumentation | Application instrumentation |
| jwt | JWT authentication utilities |
| kafka | Kafka messaging integration |
| log | Logging utilities |
| metrics | Metrics collection and parsing |
| middlewares | Koa/Express middleware collection |
| normalizers | Data normalization utilities |
| objects | Object manipulation utilities |
| pagingUtils | Pagination utilities |
| paramUtils | Parameter parsing utilities |
| permissions | Permission management |
| processors/templateVars | Template variable processing |
| request | HTTP request utilities |
| schemas | JSON schema validation |
| selectors | Data selector utilities (Kinesis) |
| sfmc | Salesforce Marketing Cloud client |
| spotify | Spotify API integration |
| tmOrders | Ticketmaster Orders integration |
| tmUsers | Ticketmaster Users integration |
| appleMusic | Apple Music API integration |
| testUtils | Testing utilities |
| timer | Timer utilities |
| validators | Input validation utilities |
| workerAuth | Worker authentication |
| awsUtils | AWS utility functions |

## Coupling Analysis

### Independence Level: **High**

**Characteristics:**
- Zero external @verifiedfan/* dependencies
- Self-contained utility library
- Provides foundational functionality for other services

**Implications:**
- Can be updated independently
- No risk of circular dependencies
- Serves as a foundation for other @verifiedfan packages
- Changes here may impact many downstream consumers

### Internal Module Relationships

The library is organized as a flat collection of utilities with minimal inter-module dependencies:

**High Internal Coupling:**
- Error module used by most utility functions
- Debug/Log modules used throughout for diagnostics
- Config module used by integration modules

**Low Internal Coupling:**
- Most modules are independent utilities
- Service integrations (Spotify, Facebook, etc.) are isolated
- Middlewares are standalone

### Consumer Impact

Since this is a shared library, changes here will affect:
- All services that import `verifiedfan-lib`
- Direct consumers of individual utilities
- Downstream packages that depend on these patterns

**Recommendation**: Maintain strict semantic versioning and comprehensive testing to prevent breaking changes.
