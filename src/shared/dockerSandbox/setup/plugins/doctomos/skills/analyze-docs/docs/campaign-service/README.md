# campaign-service

## Repository Documentation

**Generated:** 2026-02-13
**Source Repository:** `/Users/Brodie.Balser/Documents/TM/titan/campaign-service`
**Classification:** service

---

## Overview

The **campaign-service** is a presale campaign lifecycle management system that orchestrates artist presale campaigns for Ticketmaster. It manages the complete campaign lifecycle from draft through deactivation, coordinates market-to-event mappings, and streams data to analytics pipelines.

**Key Business Capabilities:**
- Presale campaign creation and lifecycle management with automatic status transitions
- Market-to-event mapping with geolocation and venue coordination
- Multi-locale content support with JSON schema validation
- Permission-based access control (supreme users vs campaign managers)
- Real-time data streaming to Kinesis and SQS for analytics

**Technical Architecture:**
- **Platform:** Koa.js REST API on Kubernetes (EKS)
- **Database:** MongoDB Atlas replica set with Redis ElastiCache
- **Messaging:** AWS Kinesis + SQS queues
- **Deployment:** Helm 3 charts via GitLab CI/CD
- **Observability:** Prometheus metrics, Elasticsearch logs, OpenTelemetry tracing
- **Auto-scaling:** 3-12 replicas based on CPU utilization

---

## Core Documentation

### Purpose & Business

- **[Purpose Overview](dynamic/purpose-overview.md)** - What the service does, business context, key capabilities, integration points
- **[Use Cases & Workflows](dynamic/purpose-usecases.md)** - Primary use cases, user journeys, example scenarios
- **[Domain Concepts](dynamic/purpose-domain.md)** - Core entities, business rules, terminology, data models

### Architecture & Structure

- **[Architecture Structure](static/architecture-structure.md)** - Directory layout, entry points, file organization
- **[Architecture Patterns](static/architecture-patterns.md)** - Design patterns, architecture style, layer separation
- **[Data Flow](static/architecture-dataflow.md)** - Request/response cycle, event processing, external integrations

### Dependencies

- **[External Dependencies](dynamic/dependencies-external.md)** - 58 npm packages with risk assessment
- **[Internal Dependencies](dynamic/dependencies-internal.md)** - 17 @verifiedfan packages with coupling analysis
- **[Dependency Analysis](dynamic/dependencies-analysis.md)** - Update recommendations, security considerations

---

## Technical Documentation

### API Contracts

- **[API Contracts](dynamic/api-contracts.md)** - 42 REST endpoints, schemas, type definitions
- **[API Usage](dynamic/api-usage.md)** - Authentication guide, request examples, error handling

### Infrastructure & Operations

- **[Infrastructure Resources](static/infrastructure-resources.md)** - Kubernetes cluster, MongoDB, Redis, Kinesis, SQS
- **[Deployment](static/infrastructure-deployment.md)** - GitLab CI/CD pipeline (17 stages), Helm charts, environments
- **[Operations](static/infrastructure-operations.md)** - Monitoring, logging, troubleshooting runbooks, disaster recovery

### Testing & Quality

- **[Testing Strategy](static/testing-strategy.md)** - Jest unit tests, 29 Cucumber BDD features, CI configuration
- **[Testing Coverage](static/testing-coverage.md)** - Coverage analysis, well-tested areas, gaps, recommendations

### Code Style & Conventions

- **[Coding Conventions](dynamic/style-conventions.md)** - Naming conventions, ESLint rules, engineering principles, readability
- **[Code Complexity](dynamic/style-complexity.md)** - Complexity metrics, problem areas, recommendations

---

## Agent Execution Status

| Agent | Status | Files Generated | Notes |
|-------|--------|-----------------|-------|
| **Architecture** | ✅ Success | 3 files | Documented structure, patterns, data flow |
| **Dependencies** | ✅ Success | 3 files | Analyzed 75 packages (17 internal, 58 external) |
| **Infrastructure** | ✅ Success | 3 files | Kubernetes + Helm deployment, MongoDB, Redis |
| **API** | ✅ Success | 2 files | 42 REST endpoints, authentication, schemas |
| **Purpose** | ✅ Success | 3 files | Business context, use cases, domain concepts |
| **Testing** | ✅ Success | 2 files | 29 Cucumber features, Jest unit tests |
| **Coding Style** | ✅ Success | 2 files | Functional programming, ESLint rules, complexity |
| **Types** | ✅ Success | 0 files | Not applicable (JSON Schema validation, no TS/GraphQL) |

**Total Files Generated:** 18 documentation files

---

## Key Insights

### Architecture
- **Style:** 3-tier service (Router → Manager → Datastore) with functional programming
- **Pattern:** Koa.js REST API with strict functional composition (Ramda)
- **Data Flow:** Request → Router → Manager → Datastore → MongoDB/Redis → Response
- **Coding Philosophy:** Immutability enforced, no classes/loops/mutation allowed

### Dependencies & Risks
- **Health Score:** 4/10 (many outdated packages)
- **Critical Issues:**
  - `request-promise-native` deprecated with CVE-2023-28155
  - GraphQL stack 7+ major versions behind
  - ESLint 5 major versions behind with security advisories
- **High Coupling:** `@verifiedfan/lib`, `@verifiedfan/mongodb`, `@verifiedfan/date`

### Infrastructure
- **Deployment:** Multi-environment (QA, Dev, Preprod, Prod East/West)
- **Scaling:** Auto-scales 3-12 replicas based on CPU (25% target)
- **Observability:** Prometheus + Elasticsearch + OpenTelemetry
- **Multi-region:** Primary (us-east-1) + Secondary (us-west-2)

### Testing
- **Approach:** Dual strategy (Jest unit + Cucumber BDD)
- **Coverage:** 75-80% statements, 65-70% branches (estimated)
- **Feature Coverage:** Excellent (29 comprehensive BDD features)
- **Gaps:** No performance testing, limited security testing, observability gaps

### Code Quality
- **Average File Size:** 115 lines (well under 200-line limit)
- **Average Function Length:** ~25 lines
- **Complexity:** Max 7 cyclomatic complexity enforced
- **Readability:** Good - excellent intention-revealing names
- **Engineering Principles:** Strong DRY, Single Responsibility, YAGNI, Functional Composition

---

## Quick Start

### Running the Service Locally
```bash
# Install dependencies
npm install

# Run tests
npm test

# Run integration tests
npm run test:integration

# Start development server
npm run dev
```

### Deployment
```bash
# Deploy to dev environment
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

### Common Operations
```bash
# Health check
curl http://localhost:3000/health

# Prometheus metrics
curl http://localhost:3000/metrics

# View logs (Kubernetes)
kubectl logs -f deployment/campaign-service -n vf-prod
```

---

## Related Services

**Upstream Dependencies:**
- Ticketmaster Discovery API (event/venue data)
- Ticketmaster Publish API (artist data)

**Downstream Consumers:**
- Analytics pipelines (via Kinesis Campaign Data Stream)
- Data warehouse (via SQS Data Pipeline)
- Selection refresh workers (via SQS Refresh Selections)

**Shared Infrastructure:**
- Redis ElastiCache (caching layer)
- MongoDB Atlas (primary data store)
- Fastly CDN (content delivery)

---

## Contributing

This is an auto-generated documentation repository. For code contributions, please refer to the source repository at:
`/Users/Brodie.Balser/Documents/TM/titan/campaign-service`

---

## Maintenance

**Documentation Updates:** Re-run the documentation generator to refresh after significant code changes:
```bash
/bb:document-repos campaign-service
```

**Recommended Refresh Triggers:**
- Major architecture changes
- New API endpoints added
- Dependency updates
- Infrastructure changes
- After major refactoring

---

*Generated by TM Repository Documentation System*
