# code-service Documentation

**Generated**: 2026-02-13
**Source Repository**: `/Users/Brodie.Balser/Documents/TM/titan/code-service`
**Classification**: `service`

---

## Overview

The code-service manages promotional and access codes for campaigns within the Ticketmaster/VerifiedFan ecosystem. It handles the complete lifecycle of codes from bulk upload through reservation to assignment, enabling campaigns to distribute unique codes to verified fans for ticket access or promotional purposes.

### Key Capabilities

- **Bulk Code Import**: Ingest and store large CSV files (50,000+ codes per batch) from S3 with deduplication
- **Code Reservation**: Temporarily reserve codes for 24 hours to support multi-step workflows
- **Code Assignment**: Permanently assign codes to verified fans
- **Code Release**: Release expired or unused reservations back to available pool
- **Inventory Tracking**: Real-time count of codes by status (available/reserved/assigned) and type (TM/external)

### Architecture

- **Platform**: Kubernetes on AWS
- **Framework**: Koa (Node.js)
- **Database**: MongoDB Atlas
- **Storage**: AWS S3
- **CI/CD**: GitLab CI with Helm deployments
- **Style**: Functional programming with strict ESLint rules

---

## Documentation Index

### Core Documentation

| Document | Description |
|----------|-------------|
| [Purpose & Overview](dynamic/purpose-overview.md) | What the service does and why it exists |
| [Architecture & Structure](static/architecture-structure.md) | Directory layout, entry points, file organization |
| [Architecture Patterns](static/architecture-patterns.md) | Design patterns, architecture style, layer separation |
| [Architecture Data Flow](static/architecture-dataflow.md) | How data moves through the system |
| [External Dependencies](dynamic/dependencies-external.md) | npm packages, framework dependencies |
| [Internal Dependencies](dynamic/dependencies-internal.md) | @verifiedfan/* packages and coupling analysis |
| [Dependency Analysis](dynamic/dependencies-analysis.md) | Risk assessment, updates needed, recommendations |

### Technical Documentation

| Document | Description |
|----------|-------------|
| [API Contracts](dynamic/api-contracts.md) | REST endpoints, request/response formats, data models |
| [API Usage](dynamic/api-usage.md) | Authentication, examples, error handling, workflows |
| [Type Definitions](dynamic/types-definitions.md) | JSDoc types, enums, MongoDB schemas, constants |
| [Type Usage](dynamic/types-usage.md) | Function signatures, call relationships, patterns |
| [Infrastructure Resources](static/infrastructure-resources.md) | AWS resources, Kubernetes configuration, database |
| [Infrastructure Deployment](static/infrastructure-deployment.md) | CI/CD pipeline, environment configuration, commands |
| [Infrastructure Operations](static/infrastructure-operations.md) | Monitoring, logging, alerting, runbooks |
| [Testing Strategy](static/testing-strategy.md) | Test organization, frameworks, patterns, CI config |
| [Testing Coverage](static/testing-coverage.md) | Coverage metrics, well-tested areas, gaps, recommendations |
| [Coding Conventions](dynamic/style-conventions.md) | Naming, formatting, ESLint rules, engineering principles |
| [Code Complexity](dynamic/style-complexity.md) | Metrics, simple/complex areas, recommendations |

### Business Documentation

| Document | Description |
|----------|-------------|
| [Use Cases & Workflows](dynamic/purpose-usecases.md) | User stories, workflows, scenarios |
| [Domain Concepts](dynamic/purpose-domain.md) | Core entities, business rules, terminology |

---

## Agent Status

All documentation agents completed successfully:

| Agent | Status | Files Generated |
|-------|--------|----------------|
| **Architecture** | ✅ Success | architecture-structure.md, architecture-patterns.md, architecture-dataflow.md |
| **Dependencies** | ✅ Success | dependencies-external.md, dependencies-internal.md, dependencies-analysis.md |
| **Infrastructure** | ✅ Success | infrastructure-resources.md, infrastructure-deployment.md, infrastructure-operations.md |
| **API** | ✅ Success | api-contracts.md, api-usage.md |
| **Purpose** | ✅ Success | purpose-overview.md, purpose-usecases.md, purpose-domain.md |
| **Testing** | ✅ Success | testing-strategy.md, testing-coverage.md |
| **Coding Style** | ✅ Success | style-conventions.md, style-complexity.md |
| **Types** | ✅ Success | types-definitions.md, types-usage.md |

**Documentation Status**: ✅ Complete (8/8 agents succeeded)

---

## Quick Facts

### Technology Stack
- **Language**: JavaScript (Node.js)
- **Framework**: Koa 2.5.0
- **Database**: MongoDB Atlas (3-node replica sets)
- **Storage**: AWS S3
- **Observability**: Prometheus, Fluentd, Elasticsearch, LightStep
- **Testing**: Jest 21.2.1, Cucumber 6.0.5

### Code Statistics
- **Programming Style**: Functional programming (enforced by ESLint)
- **Average Function Length**: ~25 lines
- **Max Complexity**: 7 (enforced)
- **Max Nesting Depth**: 2 (enforced)
- **Readability Rating**: Excellent

### Deployment
- **Environments**: QA, Dev, Preprod, Prod
- **Container Registry**: AWS ECR
- **Orchestration**: Kubernetes with Helm
- **Scaling**: 3-12 pods (autoscaling)
- **CI/CD Stages**: 17 pipeline stages

### API Overview
- **Endpoints**: 5 production + 4 development + 2 system
- **Authentication**: JWT with supreme user requirement
- **Code Types**: TM (Ticketmaster), External (third-party)
- **Code Statuses**: Available, Reserved, Assigned

---

## Health Status

### Strengths ✅
- Excellent code readability and consistency
- Strong functional programming discipline
- Comprehensive infrastructure automation
- Good observability and monitoring
- Well-documented API contracts

### Areas for Improvement ⚠️
- **Dependencies**: Most packages from 2017-2018 (5-6 years old)
  - Babel 6.x → needs upgrade to 7.x
  - Webpack 3.x → needs upgrade to 5.x
  - ESLint 4.x → needs upgrade to 8.x
  - Jest 21.x → needs upgrade to 29.x
- **Testing**: Low unit test coverage (gaps in managers, routes, middleware)
- **Security**: Using deprecated `request-promise-native` library

**Overall Health Score**: 5.5/10 (functional but needs modernization)

---

## Getting Started

### Prerequisites
- Node.js 8.x
- MongoDB Atlas connection
- AWS credentials (S3 access)
- Supreme user JWT token

### Running Locally
```bash
# Install dependencies
npm install

# Run tests
npm test

# Start service
npm start
```

### Deployment
```bash
# Deploy to dev
npm run deploy:dev

# Deploy to prod (requires manual approval in CI)
npm run deploy:prod
```

---

## Additional Resources

- **Code Repository**: `/Users/Brodie.Balser/Documents/TM/titan/code-service`
- **Default Branch**: `develop`
- **CI/CD**: GitLab CI (`.gitlab-ci.yml`)
- **Infrastructure**: Helm chart (TM/webservice v11.6.0)

---

**📚 Generated by TM Repository Documentation System**
*Last Updated: 2026-02-13*
