# user-service

## Metadata

**Generated:** 2026-02-13
**Source Repository:** /Users/Brodie.Balser/Documents/TM/titan/user-service
**Classification:** service

## Overview

The **user-service** is a central identity and authentication service for Ticketmaster's Verified Fan platform. It manages user profiles, authentication tokens, campaign-specific permissions, social media integrations, and payment wallet data. The service acts as the primary gateway for user authentication and authorization across the Verified Fan ecosystem.

**Key Capabilities:**
- User authentication via Ticketmaster tokens → JWT generation with embedded permissions
- Campaign-specific permission management (VIEW, INVITE actions)
- Social media integration (Facebook, Twitter, Tumblr, YouTube)
- Payment wallet data caching from TM Wallet API
- Worker service authentication via RSA keys
- Login event streaming to Kinesis for analytics

## Documentation

### Core Documentation

#### [Purpose & Overview](dynamic/purpose-overview.md)
What the service does, why it exists, business context, and key capabilities.

#### [Architecture Structure](static/architecture-structure.md)
Directory layout, entry points, and file organization patterns.

#### [Dependencies - External](dynamic/dependencies-external.md)
External npm packages, versions, and purposes (23 production, 31 dev dependencies).

#### [Dependencies - Internal](dynamic/dependencies-internal.md)
Internal @verifiedfan/* packages and coupling analysis (14 packages documented).

### Technical Documentation

#### [API Contracts](dynamic/api-contracts.md)
REST API endpoints, request/response schemas, and data models (20+ endpoints documented).

#### [API Usage](dynamic/api-usage.md)
Practical examples, authentication flows, and integration patterns.

#### [Infrastructure Resources](static/infrastructure-resources.md)
Kubernetes resources, MongoDB Atlas database, AWS resources, and observability stack.

#### [Infrastructure Deployment](static/infrastructure-deployment.md)
GitLab CI/CD pipeline (17 stages), Helm deployment, and environment configurations.

#### [Infrastructure Operations](static/infrastructure-operations.md)
Monitoring, logging, distributed tracing, runbooks, and disaster recovery.

#### [Testing Strategy](static/testing-strategy.md)
Test organization, frameworks (Jest + Cucumber), and CI configuration.

#### [Testing Coverage](static/testing-coverage.md)
Coverage metrics, testing gaps, and recommendations.

#### [Coding Conventions](dynamic/style-conventions.md)
Naming conventions, formatting rules, ESLint configuration, and engineering principles.

#### [Code Complexity](dynamic/style-complexity.md)
Complexity metrics, simple/complex areas analysis, and refactoring recommendations.

### Business Documentation

#### [Use Cases & Workflows](dynamic/purpose-usecases.md)
Primary use cases, user journey maps, key workflows, and real-world scenarios.

#### [Domain Concepts](dynamic/purpose-domain.md)
Core entities, business rules, terminology, and data models.

### Additional Analysis

#### [Architecture Patterns](static/architecture-patterns.md)
Design patterns, architecture style (Event-Driven Monolith), and layer separation.

#### [Architecture Data Flow](static/architecture-dataflow.md)
Primary data flow, request/response cycles, event processing, and external integrations.

#### [Dependency Analysis](dynamic/dependencies-analysis.md)
Risk assessment, outdated packages, security considerations, and update recommendations.

## Agent Execution Status

| Agent | Status | Output Files |
|-------|--------|--------------|
| architecture | ✅ success | architecture-structure.md, architecture-patterns.md, architecture-dataflow.md |
| dependencies | ✅ success | dependencies-external.md, dependencies-internal.md, dependencies-analysis.md |
| infrastructure | ✅ success | infrastructure-resources.md, infrastructure-deployment.md, infrastructure-operations.md |
| api | ✅ success | api-contracts.md, api-usage.md |
| purpose | ✅ success | purpose-overview.md, purpose-usecases.md, purpose-domain.md |
| testing | ✅ success | testing-strategy.md, testing-coverage.md |
| coding-style | ✅ success | style-conventions.md, style-complexity.md |
| types | ✅ success | Not applicable - no type definition sources found |

**Total:** 8/8 agents succeeded

## Quick Facts

### Technology Stack
- **Runtime:** Node.js 18.18.2
- **Framework:** Koa.js
- **Language:** JavaScript (ES6+) with Babel
- **Paradigm:** Functional Programming (Ramda)
- **Database:** MongoDB Atlas
- **Testing:** Jest 30.0.4 + Cucumber 6.0.5
- **Deployment:** Kubernetes + Helm
- **CI/CD:** GitLab CI/CD

### Infrastructure
- **Platform:** Kubernetes with Helm charts
- **Environments:** 5 environments across 4 clusters
- **Regions:** Multi-region (us-east-1, us-west-2)
- **Autoscaling:** 3-12 pods (production)
- **Monitoring:** Prometheus + Fluentd + OpenTelemetry

### Integration Points
- **Outbound:** Kinesis (login events), Entry Service, Export Service
- **Inbound:** TM Accounts API, TM Wallet API
- **Social:** Facebook, Twitter, Tumblr, YouTube

### Key Metrics
- **API Endpoints:** 20+ REST endpoints
- **Dependencies:** 23 production, 31 dev, 14 internal
- **Test Files:** 8 unit tests, 17 E2E feature files
- **Estimated Coverage:** 25-35%

---

**Generated by TM Repository Documentation System**
