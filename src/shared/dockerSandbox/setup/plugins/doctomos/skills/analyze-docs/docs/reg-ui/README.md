# reg-ui

## Metadata

**Generated**: 2026-02-13
**Source Repository**: /Users/Brodie.Balser/Documents/TM/titan/reg-ui
**Classification**: frontend
**Documentation Version**: 1.0

---

## Overview

reg-ui is a fan registration and campaign management web application that enables music fans to sign up for presale access to concert tickets. It serves as the user-facing interface for Ticketmaster's Verified Fan platform, allowing fans to register for artist tour campaigns, select their preferred concert markets, manage opt-in preferences, and receive unique presale access codes.

The application exists to solve the ticketing scalping and bot problem by creating a verified fan ecosystem. Instead of general on-sale where bots can purchase tickets in bulk, artists and promoters can require fans to register ahead of time, proving they are legitimate fans. This enables fair ticket distribution by allocating presale codes to verified fans before general public sales.

**Key Technologies**: Next.js 14, React 18, TypeScript, GraphQL (AppSync), Redis, Kubernetes

---

## Documentation Links

### Core Documentation

- **[Purpose & Overview](dynamic/purpose-overview.md)** - What the application does and why it exists
- **[Architecture & Structure](static/architecture-structure.md)** - Directory layout and file organization
- **[Dependencies - External](dynamic/dependencies-external.md)** - External npm packages and libraries

### Technical Documentation

- **[API Contracts](dynamic/api-contracts.md)** - GraphQL schema and REST endpoints
- **[API Usage](dynamic/api-usage.md)** - API usage examples and patterns
- **[Type Definitions](dynamic/types-definitions.md)** - Complete type system documentation
- **[Type Usage](dynamic/types-usage.md)** - Type usage patterns and transformations
- **[Infrastructure Resources](static/infrastructure-resources.md)** - AWS resources and Kubernetes configuration
- **[Infrastructure Deployment](static/infrastructure-deployment.md)** - CI/CD pipeline and deployment process
- **[Infrastructure Operations](static/infrastructure-operations.md)** - Monitoring, logging, and runbooks
- **[Testing Strategy](static/testing-strategy.md)** - Testing approach and frameworks
- **[Testing Coverage](static/testing-coverage.md)** - Test coverage analysis

### Architecture & Design

- **[Architecture Patterns](static/architecture-patterns.md)** - Design patterns and architectural decisions
- **[Architecture Data Flow](static/architecture-dataflow.md)** - How data flows through the system
- **[Purpose - Use Cases](dynamic/purpose-usecases.md)** - User stories and workflows
- **[Purpose - Domain](dynamic/purpose-domain.md)** - Business domain concepts and terminology

### Code Quality & Standards

- **[Style Conventions](dynamic/style-conventions.md)** - Coding standards and naming conventions
- **[Style Complexity](dynamic/style-complexity.md)** - Code complexity metrics
- **[Dependencies - Internal](dynamic/dependencies-internal.md)** - Internal @verifiedfan packages
- **[Dependencies - Analysis](dynamic/dependencies-analysis.md)** - Dependency health and risk assessment

---

## Agent Status

| Agent | Status | Files Generated |
|-------|--------|----------------|
| Architecture | ✅ Success | 3 files (structure, patterns, dataflow) |
| Dependencies | ✅ Success | 3 files (external, internal, analysis) |
| Infrastructure | ✅ Success | 3 files (resources, deployment, operations) |
| API | ✅ Success | 2 files (contracts, usage) |
| Purpose | ✅ Success | 3 files (overview, usecases, domain) |
| Testing | ✅ Success | 2 files (strategy, coverage) |
| Coding Style | ✅ Success | 2 files (conventions, complexity) |
| Types | ✅ Success | 2 files (definitions, usage) |

**Total**: 8/8 agents succeeded, 20 documentation files generated

---

## Quick Reference

### What Questions Can This Documentation Answer?

- **Business Questions**: What does reg-ui do? Who uses it? What business problems does it solve?
- **Architecture Questions**: How is the code organized? What patterns are used? How does data flow?
- **API Questions**: What GraphQL queries/mutations exist? How do I call the API? What types are available?
- **Infrastructure Questions**: How is it deployed? What AWS resources does it use? How do I troubleshoot?
- **Development Questions**: What dependencies does it use? What coding standards apply? How is testing done?
- **Type Questions**: What types are defined? How do types transform? What are the GraphQL schemas?

### Most Useful Starting Points

1. **New to the project?** Start with [purpose-overview.md](dynamic/purpose-overview.md)
2. **Want to understand the code?** Read [architecture-structure.md](static/architecture-structure.md)
3. **Need to use the API?** Check [api-contracts.md](dynamic/api-contracts.md) and [api-usage.md](dynamic/api-usage.md)
4. **Debugging production?** See [infrastructure-operations.md](static/infrastructure-operations.md)
5. **Contributing code?** Review [style-conventions.md](dynamic/style-conventions.md) and [testing-strategy.md](static/testing-strategy.md)

---

## Repository Highlights

### Technology Stack
- **Frontend Framework**: Next.js 14.1.4 with App Router and React Server Components
- **UI**: React 18, styled-components, functional programming (Ramda)
- **State Management**: Zustand with strict functional constraints
- **API**: GraphQL (Apollo Client, graphql-request, code generation)
- **Deployment**: Kubernetes (Helm), Docker, multi-region
- **Caching**: Redis ElastiCache, Fastly CDN
- **Observability**: Prometheus, Jaeger, Fluentd

### Key Features
- Campaign registration for artist tours
- Multi-market selection and presale code generation
- LNAA (fan club) membership activation
- Identity verification with liveness checks
- Demand event tracking
- Phone verification and scoring
- Real-time GraphQL subscriptions
- Internationalization (20+ locales)

### Code Quality
- **Functional Programming**: Classes and mutation forbidden via ESLint
- **Type Safety**: TypeScript strict mode with 100% type coverage
- **Testing**: Jest with 21 test suites
- **Complexity**: Low (avg 30 lines/function, max nesting depth 2)
- **Dependencies**: Well-maintained, modern stack

---

**Generated by TM Repository Documentation System**
For questions or issues with this documentation, contact the VF team.
