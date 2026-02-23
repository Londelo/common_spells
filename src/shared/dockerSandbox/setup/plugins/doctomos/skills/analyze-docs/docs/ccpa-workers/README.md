# ccpa-workers

**Repository Documentation Hub**

---

## Overview

The CCPA Workers repository processes California Consumer Privacy Act (CCPA) privacy requests from fans, handling data access, deletion, opt-out, and disclosure compliance through serverless Lambda functions that communicate with Ticketmaster's Privacy Core platform.

This system exists to ensure Ticketmaster's Verified Fan platform complies with CCPA regulations requiring businesses to respond to consumer privacy requests within legally mandated timeframes. It automates the processing of fan data requests that would otherwise require manual intervention across multiple databases and systems.

### Key Capabilities

- **Privacy Request Processing**: Automatically receives and routes CCPA privacy requests (GET_INFO, ERASE, DO_NOT_SELL, UNSUBSCRIBE)
- **Personal Data Access**: Retrieves and formats all PII associated with a fan across verification entries, campaigns, and user records
- **Right to Erasure**: Deletes fan data across distributed systems
- **Marketing Opt-Out Management**: Processes "Do Not Sell" requests by updating fan preferences
- **Data Disclosure Tracking**: Records and publishes disclosure events when fan PII is shared with third parties
- **Compliance Reporting**: Publishes status updates and completion confirmations to Privacy Core for audit trails

---

## Metadata

| Property | Value |
|----------|-------|
| **Generated** | 2026-02-13 |
| **Source Repo** | `/Users/Brodie.Balser/Documents/TM/vf/ccpa/workers` |
| **Classification** | Worker (Background Job / Event Processing) |
| **Documentation Path** | `~/.vf-docs/ccpa-workers` |

---

## Documentation Categories

### Core Documentation

Fundamental information about what the system is and how it's built:

- **[Purpose & Overview](dynamic/purpose-overview.md)** - Business purpose, capabilities, integration points, success metrics
- **[Use Cases & Workflows](dynamic/purpose-usecases.md)** - Privacy request workflows, user journeys, example scenarios
- **[Domain Concepts](dynamic/purpose-domain.md)** - Core entities, business rules, terminology
- **[Architecture Structure](static/architecture-structure.md)** - Directory layout, entry points, file organization
- **[Architecture Patterns](static/architecture-patterns.md)** - Design patterns, architecture style, dependency direction
- **[Data Flow](static/architecture-dataflow.md)** - How data moves through the system, event processing
- **[External Dependencies](dynamic/dependencies-external.md)** - NPM packages, frameworks, libraries
- **[Internal Dependencies](dynamic/dependencies-internal.md)** - @verifiedfan/* packages, coupling analysis
- **[Dependency Analysis](dynamic/dependencies-analysis.md)** - Risk assessment, outdated packages, recommendations

### Technical Documentation

Implementation details, infrastructure, and operations:

- **[Infrastructure Resources](static/infrastructure-resources.md)** - AWS Lambda functions, SQS queues, Kinesis streams, DynamoDB tables, IAM roles
- **[Deployment](static/infrastructure-deployment.md)** - CI/CD pipeline (GitLab), environment configuration, deployment commands
- **[Operations](static/infrastructure-operations.md)** - Monitoring, logging, alerting, runbooks, debugging procedures
- **[API Contracts](dynamic/api-contracts.md)** - Lambda function signatures, service interfaces, type definitions
- **[API Usage](dynamic/api-usage.md)** - Usage examples, authentication, error handling, configuration
- **[Type Definitions](dynamic/types-definitions.md)** - TypeScript interfaces, enums, type aliases, dependency graph
- **[Type Usage](dynamic/types-usage.md)** - Function signatures, validation schemas, usage patterns
- **[Testing Strategy](static/testing-strategy.md)** - Test organization, frameworks (Jest, Cucumber), running tests, CI configuration
- **[Test Coverage](static/testing-coverage.md)** - Coverage analysis, well-tested areas, gaps, recommendations
- **[Coding Conventions](dynamic/style-conventions.md)** - Naming, formatting, ESLint rules, engineering principles, readability
- **[Code Complexity](dynamic/style-complexity.md)** - Complexity metrics, simple vs complex areas, recommendations

---

## Agent Status

All documentation agents completed successfully:

| Agent | Status | Output Files |
|-------|--------|--------------|
| **Architecture** | ✅ Success | architecture-structure.md, architecture-patterns.md, architecture-dataflow.md |
| **Dependencies** | ✅ Success | dependencies-external.md, dependencies-internal.md, dependencies-analysis.md |
| **Infrastructure** | ✅ Success | infrastructure-resources.md, infrastructure-deployment.md, infrastructure-operations.md |
| **API** | ✅ Success | api-contracts.md, api-usage.md |
| **Purpose** | ✅ Success | purpose-overview.md, purpose-usecases.md, purpose-domain.md |
| **Testing** | ✅ Success | testing-strategy.md, testing-coverage.md |
| **Coding Style** | ✅ Success | style-conventions.md, style-complexity.md |
| **Types** | ✅ Success | types-definitions.md, types-usage.md |

**Generation Result**: 8/8 agents succeeded

---

## Quick Reference

### System Overview

- **Type**: AWS Lambda-based event processing system
- **Runtime**: Node.js 18.x
- **Infrastructure**: Terraform-managed serverless architecture
- **Primary Functions**: 7 Lambda workers (processRequest, fanInfo, deleteFan, optOut, keepPrivate, updateDictionary, saveDisclosures)
- **Event Sources**: Privacy Core Kafka, SQS queues, Kinesis data streams, CloudWatch cron

### Key Technologies

- **AWS Services**: Lambda, SQS, Kinesis, DynamoDB, S3, CloudWatch, Secrets Manager
- **Messaging**: Apache Kafka (Privacy Core), SQS with DLQ pattern
- **Testing**: Jest (unit tests), Cucumber (integration tests)
- **Code Style**: Functional programming with Ramda, ESLint enforcement
- **Dependencies**: 14 production packages, 15 internal @verifiedfan packages

### Critical Integration Points

**Inbound**:
- Privacy Core Kafka (privacy requests)
- SQS queues (request routing)
- Kinesis streams (event processing)
- S3 (disclosure CSV files)

**Outbound**:
- Privacy Core Kafka (responses, PII data, disclosures)
- User Service (authentication, user management)
- Entries Service (verification entries, opt-outs)
- DynamoDB (verification, demand, identity tables)
- MongoDB (fanscore)

---

## Navigation Tips

- **New to the system?** Start with [Purpose & Overview](dynamic/purpose-overview.md) and [Use Cases](dynamic/purpose-usecases.md)
- **Understanding the code?** See [Architecture Structure](static/architecture-structure.md) and [Type Definitions](dynamic/types-definitions.md)
- **Deploying changes?** Review [Deployment](static/infrastructure-deployment.md) and [Operations](static/infrastructure-operations.md)
- **Investigating an issue?** Check [Operations Runbooks](static/infrastructure-operations.md) and [Test Coverage](static/testing-coverage.md)
- **Planning updates?** Review [Dependency Analysis](dynamic/dependencies-analysis.md) and [Code Complexity](dynamic/style-complexity.md)

---

*Generated by TM Repository Documentation System*
