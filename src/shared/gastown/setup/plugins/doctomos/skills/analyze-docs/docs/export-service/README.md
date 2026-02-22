# export-service Documentation

**Generated:** 2026-02-13
**Source Repository:** /Users/Brodie.Balser/Documents/TM/titan/export-service
**Classification:** service

---

## Overview

The **export-service** is a Node.js Koa-based REST API that extracts campaign data from Verified Fan MongoDB and generates CSV/ZIP exports stored in S3. It processes 15 different export types including entries, codes, scoring data, waitlists, and reminder emails. The service implements queue-based processing to prevent database overload and routes exports to 4 different S3 buckets based on consumer requirements (SFMC, ticketing platforms, scoring systems, analytics tools).

**Key Business Capabilities:**
- Data export in 15 formats (entries, codes, scoring, opt-in lists, reminder emails)
- Queue-based processing (one export at a time)
- S3 storage with automatic routing by export type
- SFMC integration with regional segmentation (NA, UK)
- CCPA compliance with selective deletion
- Permission-based access control

**Technical Highlights:**
- Functional JavaScript (Ramda) with strict ESLint rules
- Stream-based CSV/ZIP generation for memory efficiency
- MongoDB aggregation pipelines to avoid N+1 queries
- Containerized deployment on EC2 with auto-scaling
- Comprehensive E2E testing with Cucumber

---

## Documentation

### Core Documentation

#### [Purpose & Overview](dynamic/purpose-overview.md)
What the export-service does, business context, key capabilities, integration points, and success metrics.

#### [Architecture & Structure](static/architecture-structure.md)
Directory layout, file organization patterns, entry points, and code structure.

#### [Dependencies](dynamic/dependencies-external.md)
External npm packages, internal @verifiedfan/* packages, version analysis, and risk assessment.

### Technical Documentation

#### [API Contracts](dynamic/api-contracts.md)
REST endpoints, request/response schemas, export types, and error formats.

#### [Type Definitions](dynamic/types-definitions.md)
Enums, error types, JSDoc types, data structures, and type dependency graphs.

#### [Type Usage Patterns](dynamic/types-usage.md)
Function signatures, call relationships, implicit patterns, and field access patterns.

#### [Infrastructure Resources](static/infrastructure-resources.md)
AWS resources (EC2, ELB, S3, Kinesis), monitoring setup (CloudWatch, Prometheus), and logging (ELK).

#### [Testing Strategy](static/testing-strategy.md)
Test organization, frameworks (Jest, Cucumber), test patterns, and CI integration.

#### [Coding Conventions](dynamic/style-conventions.md)
Naming conventions, formatting rules, ESLint configuration, engineering principles, and code readability.

### Additional Resources

- [Architecture Patterns](static/architecture-patterns.md) - Design patterns and architecture style
- [Architecture Data Flow](static/architecture-dataflow.md) - How data moves through the system
- [Dependencies (Internal)](dynamic/dependencies-internal.md) - @verifiedfan/* package analysis
- [Dependencies Analysis](dynamic/dependencies-analysis.md) - Risk assessment and recommendations
- [Infrastructure Deployment](static/infrastructure-deployment.md) - CI/CD pipeline and deployment process
- [Infrastructure Operations](static/infrastructure-operations.md) - Monitoring, alerting, and runbooks
- [API Usage](dynamic/api-usage.md) - Authentication, examples, and troubleshooting
- [Purpose Use Cases](dynamic/purpose-usecases.md) - Workflows and scenarios
- [Purpose Domain](dynamic/purpose-domain.md) - Domain concepts and business rules
- [Testing Coverage](static/testing-coverage.md) - Coverage metrics and testing gaps
- [Code Complexity](dynamic/style-complexity.md) - Complexity analysis and metrics

---

## Agent Status

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

**Summary:** 8/8 agents succeeded

---

## Quick Reference

### Export Types Supported
1. Entries (entries, verified-entries)
2. Codes (codes, code-assignments, code-wave)
3. Scoring (scoring, opt-in-scoring, vf-scoring)
4. Waitlist & Fanlist
5. Opt-in Lists (artist, sms, promoter, livenation)
6. Reminder Emails (standard, sample, automated)

### S3 Buckets
- **exportsS3** - General exports (entries, codes, waitlists)
- **scoringS3** - Scoring data (verified entries, scoring exports)
- **vfScoringS3** - VF-specific scoring
- **sfmcS3** - Reminder emails for SFMC integration

### API Endpoints
- POST `/campaigns/:campaignId/exports` - Queue export
- GET `/campaigns/:campaignId/exports/:exportId` - Check status
- GET `/campaigns/:campaignId/exports` - List exports
- DELETE `/ccpa/users/:userId` - CCPA deletion

### Key Technologies
- **Framework:** Koa.js (Node.js)
- **Language:** JavaScript ES6+ with Ramda (functional)
- **Database:** MongoDB
- **Storage:** AWS S3
- **Deployment:** Docker containers on EC2 Auto Scaling
- **CI/CD:** GitLab + Terraform (Terramisu)
- **Testing:** Jest (unit) + Cucumber (E2E)
- **Monitoring:** CloudWatch, Prometheus, ELK

---

## Common Tasks

### Run Tests
```bash
# All tests
yarn test

# Unit tests only
yarn test:unit

# E2E tests
yarn test:e2e

# With coverage
yarn test:coverage
```

### Deploy
```bash
# Deploy to dev
yarn deploy:dev

# Deploy to qa
yarn deploy:qa

# Deploy to preprod
yarn deploy:preprod

# Deploy to prod
yarn deploy:prod
```

### Local Development
```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Lint code
yarn lint

# Format code
yarn format
```

---

## Need Help?

- **Infrastructure Issues:** See [infrastructure-operations.md](static/infrastructure-operations.md) for runbooks
- **API Questions:** See [api-usage.md](dynamic/api-usage.md) for examples and troubleshooting
- **Testing:** See [testing-strategy.md](static/testing-strategy.md) for test execution
- **Code Standards:** See [style-conventions.md](dynamic/style-conventions.md) for coding rules

---

**Generated by TM Repository Documentation System**
*AI-Queryable Documentation for Complete Codebase Understanding*
