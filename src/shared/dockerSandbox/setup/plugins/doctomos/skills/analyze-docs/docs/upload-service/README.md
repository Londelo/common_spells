# upload-service

## Metadata

- **Generated**: February 13, 2026
- **Source Repository**: `/Users/Brodie.Balser/Documents/TM/titan/upload-service`
- **Classification**: service
- **Documentation Version**: 1.0

---

## Overview

The **upload-service** is a centralized API that manages file and image uploads to AWS S3 buckets across the Ticketmaster Verified Fan platform. It provides secure upload capabilities for various file types (images, CSV, JSON, text) and enables administrative users to list, retrieve, and delete files from designated S3 buckets. Additionally, it serves as a trigger endpoint to invoke AWS Lambda functions and Step Functions for downstream processing workflows.

### Why This Service Exists

This service solves the problem of secure, centralized file management across multiple systems within the Ticketmaster ecosystem by:

- Ensuring consistent authentication and authorization for file operations (Supreme user verification)
- Abstracting AWS S3 complexity from frontend and other services
- Enabling secure file storage for various business processes (CCPA requests, SMS wave processing, scheduling, scoring data)
- Providing a controlled entry point for triggering downstream data processing workflows

### Key Capabilities

- **Secure File Upload**: Enable authenticated users to upload files to S3 with appropriate access controls
- **Image Management**: Handle base64-encoded images for web uploads with automatic file naming and cache control
- **File Discovery**: Provide listing capabilities to browse files by prefix/folder structure
- **File Content Retrieval**: Parse and return CSV/JSON file contents directly from S3
- **Administrative Control**: Allow deletion of files from buckets for data cleanup
- **Workflow Triggering**: Initiate downstream processing workflows (CCPA, SMS waves, scheduled notifications, selection processes)

---

## Documentation Index

### Core Documentation

Foundational information about the service's purpose, structure, and dependencies.

| Document | Description | Location |
|----------|-------------|----------|
| [Purpose & Overview](dynamic/purpose-overview.md) | Business context, use cases, and domain concepts | `dynamic/` |
| [Use Cases & Workflows](dynamic/purpose-usecases.md) | User stories and business workflows | `dynamic/` |
| [Domain Concepts](dynamic/purpose-domain.md) | Business entities, rules, and terminology | `dynamic/` |
| [Architecture Structure](static/architecture-structure.md) | Directory layout and file organization | `static/` |
| [Architecture Patterns](static/architecture-patterns.md) | Design patterns and architectural decisions | `static/` |
| [Architecture Data Flow](static/architecture-dataflow.md) | How data moves through the system | `static/` |
| [External Dependencies](dynamic/dependencies-external.md) | npm packages and external libraries | `dynamic/` |
| [Internal Dependencies](dynamic/dependencies-internal.md) | @verifiedfan/* packages | `dynamic/` |
| [Dependency Analysis](dynamic/dependencies-analysis.md) | Risk assessment and update recommendations | `dynamic/` |

### Technical Documentation

In-depth technical details for developers working with the codebase.

| Document | Description | Location |
|----------|-------------|----------|
| [API Contracts](dynamic/api-contracts.md) | REST endpoints, request/response schemas | `dynamic/` |
| [API Usage Guide](dynamic/api-usage.md) | Authentication, examples, error handling | `dynamic/` |
| [Type Definitions](dynamic/types-definitions.md) | All type definitions with dependencies | `dynamic/` |
| [Type Usage Patterns](dynamic/types-usage.md) | Function signatures and implicit types | `dynamic/` |
| [Infrastructure Resources](static/infrastructure-resources.md) | AWS resources (EC2, S3, ELB, etc.) | `static/` |
| [Infrastructure Deployment](static/infrastructure-deployment.md) | CI/CD pipeline and deployment process | `static/` |
| [Infrastructure Operations](static/infrastructure-operations.md) | Monitoring, alerting, runbooks | `static/` |
| [Testing Strategy](static/testing-strategy.md) | Test frameworks, organization, and patterns | `static/` |
| [Testing Coverage](static/testing-coverage.md) | Coverage metrics and testing gaps | `static/` |
| [Coding Conventions](dynamic/style-conventions.md) | Naming, formatting, linting rules, principles | `dynamic/` |
| [Code Complexity](dynamic/style-complexity.md) | Complexity metrics and analysis | `dynamic/` |

---

## Quick Links

### For New Developers
Start here to understand the service:
1. [Purpose & Overview](dynamic/purpose-overview.md) - What does this do?
2. [Architecture Structure](static/architecture-structure.md) - How is it organized?
3. [API Contracts](dynamic/api-contracts.md) - What endpoints exist?
4. [Testing Strategy](static/testing-strategy.md) - How do I run tests?

### For API Consumers
Using the service:
1. [API Usage Guide](dynamic/api-usage.md) - Examples and authentication
2. [Type Definitions](dynamic/types-definitions.md) - Request/response types
3. [API Contracts](dynamic/api-contracts.md) - Endpoint reference

### For DevOps/SRE
Operating the service:
1. [Infrastructure Resources](static/infrastructure-resources.md) - AWS resources
2. [Infrastructure Deployment](static/infrastructure-deployment.md) - Deployment process
3. [Infrastructure Operations](static/infrastructure-operations.md) - Runbooks and monitoring

### For Code Reviewers
Maintaining code quality:
1. [Coding Conventions](dynamic/style-conventions.md) - Style guide and principles
2. [Testing Coverage](static/testing-coverage.md) - Testing gaps
3. [Dependency Analysis](dynamic/dependencies-analysis.md) - Update recommendations

---

## Agent Status

All documentation agents completed successfully:

| Agent | Status | Files Generated |
|-------|--------|-----------------|
| Architecture | ✅ Success | 3 files (structure, patterns, dataflow) |
| Dependencies | ✅ Success | 3 files (external, internal, analysis) |
| Infrastructure | ✅ Success | 3 files (resources, deployment, operations) |
| API | ✅ Success | 2 files (contracts, usage) |
| Purpose | ✅ Success | 3 files (overview, usecases, domain) |
| Testing | ✅ Success | 2 files (strategy, coverage) |
| Coding Style | ✅ Success | 2 files (conventions, complexity) |
| Types | ✅ Success | 2 files (definitions, usage) |

**Total**: 8/8 agents succeeded, 20 markdown files generated

---

## Technology Stack

**Language**: JavaScript (Node.js)
**Framework**: Koa.js 2.4.1
**Runtime**: Docker containers on EC2
**AWS Services**: S3, Lambda, Step Functions, ELB, Kinesis
**Testing**: Jest (unit), Cucumber (E2E)
**Infrastructure**: Terraform (via Terramisu)
**Monitoring**: CloudWatch, Prometheus, ELK

---

## Repository Health

**Dependencies**: ⚠️ Grade F (3.4/10) - Multiple outdated packages, security concerns
**Testing**: ⚠️ Limited unit test coverage, strong E2E coverage
**Code Quality**: ✅ Grade A - Excellent functional programming discipline
**Infrastructure**: ✅ Well-documented and managed via Terraform

See [Dependency Analysis](dynamic/dependencies-analysis.md) for critical updates needed.

---

## Getting Started

### Prerequisites
- Node.js 8.x or higher
- AWS credentials with S3, Lambda, Step Functions access
- Docker (for containerized deployment)
- Terraform (for infrastructure changes)

### Quick Start
```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Run locally
yarn start

# Deploy to environment
npm run deploy:dev
```

See [Infrastructure Deployment](static/infrastructure-deployment.md) for complete deployment instructions.

---

## Contributing

When making changes to this service:

1. **Review** [Coding Conventions](dynamic/style-conventions.md) for style guidelines
2. **Test** your changes - see [Testing Strategy](static/testing-strategy.md)
3. **Update** relevant documentation when adding features
4. **Check** [Dependency Analysis](dynamic/dependencies-analysis.md) before adding new dependencies
5. **Follow** the deployment process in [Infrastructure Deployment](static/infrastructure-deployment.md)

---

## Support & Contact

**Team**: Verified Fan Platform Team
**Repository**: Titan/upload-service
**Documentation Location**: `~/.vf-docs/upload-service/`

For questions about:
- **Business logic**: See [Purpose & Overview](dynamic/purpose-overview.md)
- **API usage**: See [API Usage Guide](dynamic/api-usage.md)
- **Operations**: See [Infrastructure Operations](static/infrastructure-operations.md)
- **Development**: See [Architecture Structure](static/architecture-structure.md)

---

*Generated by TM Repository Documentation System - AI-Powered Codebase Analysis*
*For questions about this documentation system, contact the AI Engineering team.*
