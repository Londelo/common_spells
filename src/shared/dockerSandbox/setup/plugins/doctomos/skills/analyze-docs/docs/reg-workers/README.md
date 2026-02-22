# reg-workers

> Comprehensive AI-queryable documentation for the VerifiedFan Registration Workers repository

## Metadata

- **Generated**: 2026-02-13
- **Source Repository**: `/Users/Brodie.Balser/Documents/TM/vf/registration/workers`
- **Classification**: worker
- **Documentation Version**: 1.0.0

## Overview

Registration Workers is a serverless AWS Lambda-based microservices platform that manages the complete lifecycle of VerifiedFan event registrations, from eligibility validation and entry submission through winner selection and fan notification. It ensures eventual consistency across multiple data stores, publishes analytics data to Kafka, and orchestrates reminder notifications for presale events.

**Business Value**: Enables promoters to sell tickets to verified, eligible fans while maintaining system reliability during high-traffic presales. Supports campaigns with invite-only gates, identity verification requirements, and linked campaign transfers.

**Architecture**: Serverless event-driven microservices with 15 Lambda workers across 5 domains (registration, replication, selection, dataPipeline, notification).

## Documentation Index

### Core Documentation

Essential documents describing what the system does and how it's structured:

- **[Purpose Overview](dynamic/purpose-overview.md)** - What the system does and why it exists
- **[Architecture Structure](static/architecture-structure.md)** - Directory layout, file organization, entry points
- **[Dependencies External](dynamic/dependencies-external.md)** - External npm packages and versions

### Technical Documentation

Detailed technical specifications and implementation details:

- **[API Contracts](dynamic/api-contracts.md)** - Worker APIs, types, input/output contracts
- **[API Usage](dynamic/api-usage.md)** - Request examples, authentication, error handling
- **[Types Definitions](dynamic/types-definitions.md)** - All explicit type definitions with categorization
- **[Types Usage](dynamic/types-usage.md)** - Implicit types from function signatures and patterns
- **[Infrastructure Resources](static/infrastructure-resources.md)** - AWS resources, databases, queues
- **[Infrastructure Deployment](static/infrastructure-deployment.md)** - CI/CD pipeline, deployment process
- **[Infrastructure Operations](static/infrastructure-operations.md)** - Monitoring, alerting, runbooks
- **[Testing Strategy](static/testing-strategy.md)** - Testing approach, frameworks, patterns
- **[Testing Coverage](static/testing-coverage.md)** - Coverage metrics, gaps, recommendations
- **[Style Conventions](dynamic/style-conventions.md)** - Naming, formatting, linting rules
- **[Style Complexity](dynamic/style-complexity.md)** - Code complexity analysis

### Architecture Documentation

Deep dive into system architecture and design:

- **[Architecture Structure](static/architecture-structure.md)** - Directory tree, file organization (11K)
- **[Architecture Patterns](static/architecture-patterns.md)** - Design patterns, architectural decisions (15K)
- **[Architecture Dataflow](static/architecture-dataflow.md)** - How data moves through the system (18K)

### Business & Domain Documentation

Understanding the business context and domain concepts:

- **[Purpose Overview](dynamic/purpose-overview.md)** - Business context, capabilities, requirements (13K)
- **[Purpose Use Cases](dynamic/purpose-usecases.md)** - User stories, workflows, scenarios (22K)
- **[Purpose Domain](dynamic/purpose-domain.md)** - Domain entities, business rules, terminology (18K)

### Dependencies Documentation

External and internal package dependencies:

- **[Dependencies External](dynamic/dependencies-external.md)** - npm packages by category (5.5K)
- **[Dependencies Internal](dynamic/dependencies-internal.md)** - @verifiedfan/* packages, coupling analysis (6.8K)
- **[Dependencies Analysis](dynamic/dependencies-analysis.md)** - Risk assessment, outdated packages, recommendations (9.2K)

## Agent Status

| Agent | Status | Files Generated |
|-------|--------|-----------------|
| Architecture | ✅ Success | 3 files (44K) |
| Dependencies | ✅ Success | 3 files (21.5K) |
| Infrastructure | ✅ Success | 3 files (42K) |
| API | ✅ Success | 2 files (27K) |
| Purpose | ✅ Success | 3 files (53K) |
| Testing | ✅ Success | 2 files (25K) |
| Coding Style | ✅ Success | 2 files (34K) |
| Types | ✅ Success | 2 files (64K) |

**Summary**: 8/8 agents succeeded | 20 documentation files generated | Total size: ~310KB

## Quick Start

### For AI Assistants

All documentation files are optimized for AI consumption with:
- Structured markdown with clear hierarchies
- Bidirectional cross-references between related concepts
- Explicit typing information with confidence ratings
- Source code locations (file:line) for traceability
- Business context alongside technical details

**Recommended Query Patterns**:
- "How does eligibility validation work?" → See `dynamic/purpose-usecases.md` + `dynamic/api-contracts.md`
- "What AWS resources are used?" → See `static/infrastructure-resources.md`
- "What are the testing gaps?" → See `static/testing-coverage.md`
- "How are types structured?" → See `dynamic/types-definitions.md` + dependency graph
- "What are the business rules?" → See `dynamic/purpose-domain.md`
- "How do I deploy?" → See `static/infrastructure-deployment.md`

### For Human Developers

Start with these documents in order:
1. **[Purpose Overview](dynamic/purpose-overview.md)** - Understand what the system does
2. **[Architecture Structure](static/architecture-structure.md)** - Learn the codebase layout
3. **[Testing Strategy](static/testing-strategy.md)** - Run tests and understand patterns
4. **[Infrastructure Operations](static/infrastructure-operations.md)** - Debug and monitor in production

## Repository Insights

### Technology Stack
- **Runtime**: Node.js 18.18.2 + TypeScript 5.2.2
- **Framework**: AWS Lambda with serverless architecture
- **Data**: DynamoDB, MongoDB (Entry Service), Redis, Kafka
- **Messaging**: SQS, SNS, EventBridge, Step Functions
- **Testing**: Jest 25.1.0 + Cucumber 6.0.5
- **Deployment**: Terraform + GitLab CI/CD

### Key Metrics
- **Workers**: 15 Lambda functions across 5 domains
- **Test Coverage**: ~45-50% (estimated)
- **Code Quality**: 9.5/10 (ESLint enforced functional programming)
- **Dependencies**: 15 production + 39 dev packages
- **Internal Dependencies**: 19 @verifiedfan/* packages

### Critical Integration Points
- **Campaign Service** - Configuration source
- **Entry Service** - MongoDB replication target
- **User Service** - Fan profile management
- **Code Service** - Access code reservation
- **Kafka** - Analytics data pipeline (5 topics)

## Documentation Structure

```
~/.vf-docs/reg-workers/
├── README.md                          # This file
├── static/                            # Rarely-changing documentation
│   ├── architecture-*.md              # System architecture (3 files)
│   ├── infrastructure-*.md            # AWS resources, deployment, operations (3 files)
│   └── testing-*.md                   # Testing strategy and coverage (2 files)
└── dynamic/                           # Frequently-changing documentation
    ├── api-*.md                       # API contracts and usage (2 files)
    ├── dependencies-*.md              # Dependency analysis (3 files)
    ├── purpose-*.md                   # Business purpose and domain (3 files)
    ├── style-*.md                     # Coding style and complexity (2 files)
    └── types-*.md                     # Type definitions and usage (2 files)
```

## Maintenance

This documentation was generated by automated analysis of the source repository. To regenerate:

```bash
/document-repos /path/to/workers reg-workers worker
```

**When to Regenerate**:
- After major architectural changes
- When adding new workers or domains
- After significant dependency updates
- Quarterly as part of maintenance cycle

## Footer

---

**Generated by TM Repository Documentation System**
*Automated AI-queryable documentation for enterprise codebases*

Last updated: 2026-02-13
