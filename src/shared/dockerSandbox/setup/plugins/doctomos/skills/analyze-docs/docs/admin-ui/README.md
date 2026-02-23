# admin-ui Documentation

**Generated**: February 13, 2026
**Source Repository**: `/Users/Brodie.Balser/Documents/TM/titan/admin-ui`
**Classification**: Frontend
**Repository URL**: https://git.tmaws.io/Titan/admin-ui

---

## Overview

Admin-UI is the internal administrative dashboard for Ticketmaster's Verified Fan (VF) platform. It provides campaign management, distribution control, metrics tracking, and selection operations for presale ticketing campaigns. This is a backend admin tool used by campaign managers and operations teams to configure, monitor, and control fan registration campaigns for artist presales.

Verified Fan is Ticketmaster's platform that manages presale access to high-demand concert tickets. When artists want to reward their true fans (not bots or scalpers), they create registration campaigns where fans must sign up and get verified before receiving presale access codes. This admin dashboard is the control center where campaign managers configure those campaigns, manage distribution of access codes, track campaign performance, and select which registered fans receive presale opportunities.

The dashboard serves as the operational nerve center - without it, campaign managers couldn't create campaigns, distribute codes to qualified fans, or monitor registration and selection metrics.

---

## Documentation Index

### Core Documentation

Essential reading to understand the system:

- **[Purpose & Overview](dynamic/purpose-overview.md)** - What the system does, business context, and key capabilities
- **[Architecture & Structure](static/architecture-structure.md)** - Repository organization and component structure
- **[External Dependencies](dynamic/dependencies-external.md)** - Third-party packages and libraries

### Technical Deep-Dives

Detailed technical specifications:

- **[API Contracts](dynamic/api-contracts.md)** - Complete GraphQL schema and operation definitions
- **[API Usage Examples](dynamic/api-usage.md)** - Query/mutation examples and patterns
- **[Type Definitions](dynamic/types-definitions.md)** - Complete catalog of 120+ GraphQL types
- **[Type Usage Patterns](dynamic/types-usage.md)** - How types are used throughout the codebase
- **[Infrastructure Resources](static/infrastructure-resources.md)** - AWS resources, Kubernetes, and deployment architecture
- **[Infrastructure Deployment](static/infrastructure-deployment.md)** - CI/CD pipeline and deployment process
- **[Testing Strategy](static/testing-strategy.md)** - Testing approach and framework overview
- **[Coding Conventions](dynamic/style-conventions.md)** - Code style, patterns, and organization

### Business Context

Understanding the domain and use cases:

- **[Use Cases & Workflows](dynamic/purpose-usecases.md)** - User journeys and operational workflows
- **[Domain Concepts](dynamic/purpose-domain.md)** - Business entities, rules, and terminology

### Analysis & Recommendations

Code quality, dependencies, and architectural insights:

- **[Dependency Analysis](dynamic/dependencies-analysis.md)** - Health assessment (score: 4/10), risks, and upgrade paths
- **[Testing Coverage](static/testing-coverage.md)** - Coverage analysis and testing gaps
- **[Code Complexity](dynamic/style-complexity.md)** - Complexity metrics and readability analysis
- **[Architecture Patterns](static/architecture-patterns.md)** - Design patterns and architectural decisions
- **[Data Flow](static/architecture-dataflow.md)** - How data flows through the system

### Operations

Infrastructure and internal dependencies:

- **[Infrastructure Operations](static/infrastructure-operations.md)** - Monitoring, logging, and operational procedures
- **[Internal Dependencies](dynamic/dependencies-internal.md)** - Shared libraries and internal packages

---

## Repository Summary

### Technology Stack

- **Type**: React Single Page Application (SPA) with Koa backend
- **Frontend Framework**: React 16.8.6 with Redux + Redux Saga
- **State Management**: Redux with Immutable.js for state trees
- **API Communication**: GraphQL via Apollo Client v2
- **Functional Programming**: Ramda.js for data transformations
- **Build Tools**: Webpack with Babel transpilation
- **Testing**: Jest (unit), Cucumber (E2E), Selenium WebDriver

### Deployment

- **Container Platform**: Kubernetes with Helm charts
- **Environments**: nonprod9, preprod9, prod9
- **Cloud Provider**: AWS (S3 for static assets)
- **CI/CD**: GitLab CI/CD pipeline

### Dependencies

- **Total**: 38 dependencies (28 production, 10 development)
- **Key Libraries**: React, Redux, Apollo Client, Immutable.js, Ramda, Koa
- **GraphQL Version**: v0.13 (outdated - v16 current)
- **Apollo Client**: v2 (end-of-life - v3 recommended)

---

## Critical Findings

### ⚠️ Concerns

- **Low Unit Test Coverage** - Only 5 unit test files found; minimal coverage for Redux actions, reducers, and sagas
- **Outdated GraphQL Version** - Using v0.13 from 2018; current version is v16 (major upgrades needed)
- **Apollo Client v2 End-of-Life** - Using deprecated v2 client; migration to v3 recommended for security patches
- **Dependency Health Score**: 4/10 (low) - Multiple critical and high-severity outdated dependencies

### ✅ Strengths

- **Strong E2E Coverage** - 14 comprehensive Cucumber feature files covering critical workflows
- **Well-Organized Architecture** - Clear separation of concerns with Redux patterns
- **Comprehensive GraphQL Schema** - 120+ types documented with detailed field definitions
- **Domain-Driven Design** - Business logic well-modeled in state management layer
- **Production-Ready Infrastructure** - Mature Kubernetes deployment with Helm charts

---

## Agent Status

All documentation agents completed successfully:

| Agent | Status | Files Generated | Description |
|-------|--------|-----------------|-------------|
| **Architecture** | ✅ Success | 3 files | Repository structure, patterns, and data flow |
| **Dependencies** | ✅ Success | 3 files | External packages, internal libraries, and health analysis |
| **Infrastructure** | ✅ Success | 3 files | AWS resources, deployment pipeline, and operations |
| **API** | ✅ Success | 2 files | GraphQL schema and usage examples |
| **Purpose** | ✅ Success | 3 files | Business context, use cases, and domain concepts |
| **Testing** | ✅ Success | 2 files | Testing strategy and coverage analysis |
| **Coding Style** | ✅ Success | 2 files | Conventions and complexity metrics |
| **Types** | ✅ Success | 2 files | GraphQL type definitions and usage patterns |

**Total Documentation**: 20 files + 7 metadata files + 1 README

---

## Documentation Files by Directory

### Dynamic Documentation (`dynamic/`)

Files that analyze code-level details and may change as code evolves:

- `api-contracts.md` - GraphQL schema definitions
- `api-usage.md` - API query/mutation examples
- `dependencies-external.md` - Third-party dependencies
- `dependencies-internal.md` - Internal library dependencies
- `dependencies-analysis.md` - Dependency health and risk assessment
- `purpose-overview.md` - System purpose and business context
- `purpose-usecases.md` - User workflows and use cases
- `purpose-domain.md` - Domain concepts and business rules
- `style-conventions.md` - Coding style and conventions
- `style-complexity.md` - Code complexity analysis
- `types-definitions.md` - Complete type catalog
- `types-usage.md` - Type usage patterns

### Static Documentation (`static/`)

Files that analyze architectural structure and patterns:

- `architecture-structure.md` - Repository organization
- `architecture-patterns.md` - Design patterns used
- `architecture-dataflow.md` - Data flow through the system
- `infrastructure-resources.md` - AWS and Kubernetes resources
- `infrastructure-deployment.md` - CI/CD and deployment process
- `infrastructure-operations.md` - Monitoring and operations
- `testing-strategy.md` - Testing approach and frameworks
- `testing-coverage.md` - Test coverage analysis

---

## Quick Reference

### Primary Use Cases

1. **Campaign Creation** - Create and configure Verified Fan presale campaigns
2. **Code Management** - Upload and distribute presale access codes to fans
3. **Fan Selection** - Trigger selection algorithms to choose eligible fans
4. **Metrics Monitoring** - Track campaign performance and registration metrics
5. **Wave Management** - Schedule and send SMS/email notifications with codes

### Key Users

- **Campaign Managers** - Create and manage campaigns
- **Operations Teams** - Monitor health and handle exceptions
- **Marketing Teams** - Export data and track metrics

### Critical Dependencies

- **monoql** - GraphQL API backend (all data operations)
- **Identity Service** - Authentication and authorization
- **Image CDN** - Campaign image storage

---

## Metadata

This documentation was generated by the **TM Repository Documentation System**, powered by **Claude Code AI Documentation Agents**.

- **Generation Date**: February 13, 2026
- **Agents Used**: 8 specialized documentation agents
- **Model**: Claude Sonnet 4.5
- **Output Format**: Markdown (optimized for both AI consumption and human browsing)

---

## Next Steps

### For Developers

1. Start with [Purpose & Overview](dynamic/purpose-overview.md) to understand business context
2. Review [Architecture & Structure](static/architecture-structure.md) for codebase organization
3. Study [API Contracts](dynamic/api-contracts.md) for GraphQL schema
4. Check [Dependency Analysis](dynamic/dependencies-analysis.md) for upgrade recommendations

### For Operations

1. Review [Infrastructure Resources](static/infrastructure-resources.md) for deployment architecture
2. Check [Infrastructure Operations](static/infrastructure-operations.md) for monitoring setup
3. Study [Testing Coverage](static/testing-coverage.md) for quality assessment

### For Business Stakeholders

1. Read [Purpose & Overview](dynamic/purpose-overview.md) for system capabilities
2. Review [Use Cases & Workflows](dynamic/purpose-usecases.md) for user journeys
3. Check [Domain Concepts](dynamic/purpose-domain.md) for business rules

---

**📁 Documentation Location**: `~/.vf-docs/admin-ui/`
**📊 Files Generated**: 21 total (20 docs + README)
**✅ Status**: Complete
