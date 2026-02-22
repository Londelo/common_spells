# monoql Documentation

**Generated**: 2026-02-13
**Source Repository**: `/Users/Brodie.Balser/Documents/TM/titan/monoql`
**Classification**: service

---

## Overview

MonoQL is Ticketmaster's unified GraphQL API gateway for the Verified Fan presale registration platform. It orchestrates campaign management, fan registration, eligibility checking, and presale ticket code distribution through a single, comprehensive GraphQL API.

**Core Function**: Provides a single GraphQL interface that coordinates with multiple backend microservices (campaigns, entries, users, codes, uploads, exports) to deliver end-to-end presale management capabilities.

**Key Capabilities**:
- Campaign creation and management (registration and fanlist types)
- Multi-locale content support
- Fan registration and eligibility checking
- Market-based fan selection and code distribution
- Wave-based selection processing
- Data export and reporting
- Promoter management
- File upload processing (codes, fanlists, blacklists)

**Technology Stack**: Node.js, Koa, Apollo Server (v1), GraphQL, Kubernetes/Docker

---

## Documentation Index

### Core Documentation

#### [Purpose & Overview](dynamic/purpose-overview.md)
Business purpose, context, capabilities, and success metrics. Understand what MonoQL does and why it exists.

#### [Architecture Structure](static/architecture-structure.md)
Directory layout, file organization, and entry points. See how the codebase is organized.

#### [Dependencies](dynamic/dependencies-external.md)
External npm packages, internal @verifiedfan libraries, and dependency analysis. **Critical**: 7 years of technical debt identified.

### Technical Documentation

#### [API Contracts](dynamic/api-contracts.md)
Complete GraphQL schema: 19 queries, 49 mutations, 120+ types. All queries, mutations, and type definitions documented.

#### [Type Definitions](dynamic/types-definitions.md)
Comprehensive type catalog with 100+ GraphQL types, input/output transformations, and dependency graphs.

#### [Type Usage Patterns](dynamic/types-usage.md)
Implicit types from resolver implementations, function signatures, and common patterns.

#### [Infrastructure Resources](static/infrastructure-resources.md)
Kubernetes deployment, Docker containers, AWS resources (ECR, IAM, ALB, S3), and service dependencies.

#### [Infrastructure Deployment](static/infrastructure-deployment.md)
GitLab CI/CD pipeline (15 stages), Helm deployment, multi-region configuration, and rollback procedures.

#### [Infrastructure Operations](static/infrastructure-operations.md)
Monitoring (Prometheus), logging (Fluentd/Elasticsearch), health checks, auto-scaling, runbooks, and incident response.

#### [Testing Strategy](static/testing-strategy.md)
Jest unit tests, Cucumber E2E tests, CI integration, and Docker-based testing environment.

#### [Coding Conventions](dynamic/style-conventions.md)
Naming conventions, formatting rules, ESLint configuration, and engineering principles (Functional Programming paradigm).

### Business Documentation

#### [Use Cases & Workflows](dynamic/purpose-usecases.md)
Primary use cases, user journeys, key workflows, and example scenarios.

#### [Domain Concepts](dynamic/purpose-domain.md)
Core entities, business rules, terminology, and data models.

#### [Testing Coverage](static/testing-coverage.md)
Coverage analysis, well-tested areas, testing gaps, and recommendations.

#### [Code Complexity](dynamic/style-complexity.md)
Complexity metrics, simple/complex areas, and improvement recommendations.

### Additional Documentation

- [Architecture Patterns](static/architecture-patterns.md) - Design patterns and architecture style
- [Architecture Data Flow](static/architecture-dataflow.md) - How data moves through the system
- [Dependencies (Internal)](dynamic/dependencies-internal.md) - @verifiedfan/* package analysis
- [Dependencies Analysis](dynamic/dependencies-analysis.md) - Risk assessment and migration plan
- [API Usage](dynamic/api-usage.md) - Authentication, examples, error handling
- [Style Complexity](dynamic/style-complexity.md) - Code complexity analysis

---

## Quick Reference

### Architecture
- **Style**: Monolithic GraphQL API gateway with functional programming paradigm
- **Framework**: Koa + Apollo Server (v1)
- **Data Flow**: GraphQL Request → Resolvers → Service Clients → Backend Services → Response
- **Key Patterns**: Functional composition, pure functions, immutability, Ramda-based utilities

### Deployment
- **Platform**: Kubernetes on AWS EKS
- **Regions**: us-east-1 (primary), us-west-2 (secondary)
- **Environments**: QA, Dev, Preprod, Production (East + West)
- **CI/CD**: GitLab CI with Helm 3 deployments
- **Scaling**: HPA configured (5-15 replicas in production)

### Key Integrations
- **Backend Services**: campaign-service, entry-service, user-service, code-service, upload-service, export-service
- **External Systems**: Ticketmaster Identity/OAuth, Discovery Service, S3 Storage, Slack API
- **Infrastructure**: ECR, ALB, CloudWatch, Fluentd, Elasticsearch, Prometheus

### Public Endpoints (Production)
- `registration.ticketmaster.{com, ca, com.mx}`
- `registration.livenation.com`
- `verifiedfan.ticketmaster.{com, ca, com.mx}`
- `verifiedfan.livenation.com`

---

## Agent Status

All documentation agents completed successfully:

| Agent | Status | Files Generated |
|-------|--------|-----------------|
| Architecture | ✅ Success | architecture-structure.md, architecture-patterns.md, architecture-dataflow.md |
| Dependencies | ✅ Success | dependencies-external.md, dependencies-internal.md, dependencies-analysis.md |
| Infrastructure | ✅ Success | infrastructure-resources.md, infrastructure-deployment.md, infrastructure-operations.md |
| API | ✅ Success | api-contracts.md, api-usage.md |
| Purpose | ✅ Success | purpose-overview.md, purpose-usecases.md, purpose-domain.md |
| Testing | ✅ Success | testing-strategy.md, testing-coverage.md |
| Coding Style | ✅ Success | style-conventions.md, style-complexity.md |
| Types | ✅ Success | types-definitions.md, types-usage.md |

**Total Files Generated**: 20 markdown documents + 8 metadata files

---

## Critical Findings

### ⚠️ Technical Debt (CRITICAL Priority)

**GraphQL Stack**: 7 years outdated
- `graphql: ^0.12.0` (current: 16.x)
- `apollo-server-koa: ^1.2.0` (deprecated)
- Missing years of security patches

**Build Tools**: 5-6 years outdated
- Babel 6.x (current: 7.x)
- Webpack 3.x (current: 5.x)
- Jest 21.x (current: 29.x)

**Recommended Action**: 10-week phased migration plan detailed in `dependencies-analysis.md`

### ✅ Strengths

**Code Quality**: Excellent
- Functional programming paradigm with strict enforcement
- Average function length: 18 lines
- Max complexity: 7 (enforced)
- Excellent readability (intention-revealing names)

**Testing Coverage**: Good E2E coverage
- 22 Cucumber feature files
- Comprehensive behavioral scenarios
- Automated post-deploy verification

**Infrastructure**: Modern & Scalable
- Kubernetes-based with HPA
- Multi-region deployment
- Comprehensive monitoring and logging
- Well-documented runbooks

---

## Getting Started

### For Developers
1. Start with [Purpose & Overview](dynamic/purpose-overview.md) to understand what MonoQL does
2. Review [Architecture Structure](static/architecture-structure.md) to understand code organization
3. Study [API Contracts](dynamic/api-contracts.md) to learn the GraphQL schema
4. Read [Coding Conventions](dynamic/style-conventions.md) before making changes

### For Product Managers
1. Read [Use Cases & Workflows](dynamic/purpose-usecases.md) for business context
2. Review [Domain Concepts](dynamic/purpose-domain.md) for terminology
3. Check [API Usage](dynamic/api-usage.md) for examples

### For Operations/SRE
1. Review [Infrastructure Operations](static/infrastructure-operations.md) for runbooks
2. Study [Infrastructure Deployment](static/infrastructure-deployment.md) for deployment procedures
3. Check [Testing Strategy](static/testing-strategy.md) for validation procedures

### For Architects
1. Read [Architecture Patterns](static/architecture-patterns.md) for design decisions
2. Review [Architecture Data Flow](static/architecture-dataflow.md) for integration patterns
3. Study [Dependencies Analysis](dynamic/dependencies-analysis.md) for technical debt assessment

---

## Maintenance

This documentation is automatically generated by the TM Repository Documentation System. To regenerate:

```bash
/document-repos /Users/Brodie.Balser/Documents/TM/titan/monoql monoql service
```

**Recommendation**: Regenerate documentation after significant architectural changes or quarterly for dependency updates.

---

## Related Systems

### Backend Microservices
- **campaign-service**: Campaign CRUD and management
- **entry-service**: Fan entry storage and querying
- **user-service**: User data and authentication
- **code-service**: Presale code generation and assignment
- **upload-service**: File upload processing
- **export-service**: Data export generation

### External Integrations
- **Ticketmaster Identity**: OAuth authentication and user data
- **Discovery Service**: Venue and artist information
- **S3 Storage**: File storage and export delivery
- **Slack API**: Operational notifications

---

*Generated by TM Repository Documentation System*
*Documentation Version: 2026-02-13*
