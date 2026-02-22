# dmd-pipeline

> Comprehensive AI-queryable documentation for the demand-pipeline repository

## Metadata

- **Generated**: 2026-02-13
- **Source Repository**: `/Users/Brodie.Balser/Documents/TM/demand-capture/data-pipeline`
- **Classification**: pipeline
- **Documentation Version**: 1.0.0

## Overview

The demand-pipeline is a real-time data warehousing system that captures changes to demand-related records from DynamoDB and archives them in S3 for analytical querying via AWS Athena. It transforms live operational data into queryable historical records for business intelligence and reporting.

This pipeline processes four types of records (Demand, Notification, Event, Sale) from DynamoDB Streams through Kinesis, transforms them to Avro/Parquet formats, and stores them in date-partitioned S3 buckets for efficient querying through AWS Athena.

## Documentation Structure

Documentation is organized into two categories:

- **Static**: Architecture, infrastructure, and testing documentation that changes infrequently
- **Dynamic**: Dependencies, API, types, purpose, and coding style that evolve with code changes

## Core Documentation

### Purpose & Business Context
- [**Purpose Overview**](dynamic/purpose-overview.md) - What the pipeline does and why it exists
- [**Use Cases & Workflows**](dynamic/purpose-usecases.md) - Business workflows and user scenarios
- [**Domain Concepts**](dynamic/purpose-domain.md) - Domain entities, business rules, and terminology

### Architecture & Design
- [**Architecture Structure**](static/architecture-structure.md) - Directory layout and file organization
- [**Architecture Patterns**](static/architecture-patterns.md) - Design patterns and architectural decisions
- [**Data Flow**](static/architecture-dataflow.md) - How data moves through the pipeline

### Infrastructure & Deployment
- [**Infrastructure Resources**](static/infrastructure-resources.md) - AWS resources (Lambda, DynamoDB, S3, Kinesis, Glue, Athena)
- [**Infrastructure Deployment**](static/infrastructure-deployment.md) - CI/CD pipeline and deployment process
- [**Infrastructure Operations**](static/infrastructure-operations.md) - Monitoring, alerting, and runbooks

## Technical Documentation

### Dependencies & Packages
- [**External Dependencies**](dynamic/dependencies-external.md) - npm packages and external libraries
- [**Internal Dependencies**](dynamic/dependencies-internal.md) - @ticketmaster/* framework packages
- [**Dependency Analysis**](dynamic/dependencies-analysis.md) - Risk assessment and update recommendations

### Type System
- [**Type Definitions**](dynamic/types-definitions.md) - All TypeScript interfaces, types, and Avro schemas
- [**Type Usage**](dynamic/types-usage.md) - Function signatures and type usage patterns

### Code Quality
- [**Coding Conventions**](dynamic/style-conventions.md) - Naming, formatting, and engineering principles
- [**Code Complexity**](dynamic/style-complexity.md) - Complexity metrics and readability assessment
- [**Testing Strategy**](static/testing-strategy.md) - Test organization and frameworks
- [**Testing Coverage**](static/testing-coverage.md) - Coverage metrics and testing gaps

## Quick Reference

### Key Components

**Lambda Function**
- `deliveryWorker` - Processes Kinesis stream events containing DynamoDB change records

**Record Types**
- Demand - Primary demand capture records
- Notification - Fan notification events
- Event - Ticketing event records
- Sale - Transaction/sale records

**Storage Architecture**
- S3 buckets: 4 environments (dev1, qa1, preprod1, prod1)
- Formats: Avro (primary) + Parquet (parallel)
- Partitioning: `record_type={type}/partition_date={YYYY-MM-DD}/`

**Data Flow**
```
DynamoDB → DynamoDB Streams → Kinesis → Lambda → S3 → Glue Catalog → Athena
```

### Key Technologies

**Runtime & Language**
- Node.js 18.x
- TypeScript (strict mode)

**AWS Services**
- Lambda, DynamoDB Streams, Kinesis Data Streams
- S3, Glue Data Catalog, Athena
- IAM, CloudWatch

**Infrastructure**
- Terraform (>=1.5.6)
- GitLab CI/CD (9-stage pipeline)

**Testing**
- Jest + ts-jest
- Unit, integration, and E2E tests

### Environments

| Environment | Purpose | Region | Account |
|-------------|---------|--------|---------|
| dev1 | Development | us-east-1 | dev |
| qa1 | QA testing | us-east-1 | qa |
| preprod1 | Pre-production validation | us-east-1 | preprod |
| prod1 | Production | us-east-1 | prod |

## Agent Status

All documentation agents completed successfully:

| Agent | Status | Files Generated |
|-------|--------|-----------------|
| ✅ Architecture | Success | 3 files (structure, patterns, dataflow) |
| ✅ Dependencies | Success | 3 files (external, internal, analysis) |
| ✅ Infrastructure | Success | 3 files (resources, deployment, operations) |
| ✅ API | Success | Not applicable (no API surface area) |
| ✅ Purpose | Success | 3 files (overview, usecases, domain) |
| ✅ Testing | Success | 2 files (strategy, coverage) |
| ✅ Coding Style | Success | 2 files (conventions, complexity) |
| ✅ Types | Success | 2 files (definitions, usage) |

**Total**: 8/8 agents succeeded, 18 documentation files generated

## Documentation Files Summary

### Static Files (7 files)
Files that rarely change:
- architecture-structure.md
- architecture-patterns.md
- architecture-dataflow.md
- infrastructure-resources.md
- infrastructure-deployment.md
- infrastructure-operations.md
- testing-strategy.md
- testing-coverage.md

### Dynamic Files (10 files)
Files that change frequently with code:
- dependencies-external.md
- dependencies-internal.md
- dependencies-analysis.md
- purpose-overview.md
- purpose-usecases.md
- purpose-domain.md
- style-conventions.md
- style-complexity.md
- types-definitions.md
- types-usage.md

## Key Insights

### Code Quality
- **Overall Rating**: Excellent (5/5 stars)
- **Readability**: Excellent - Intention-revealing names, clear narrative flow
- **Complexity**: Low - 85% of functions have cyclomatic complexity < 5
- **Test Coverage**: ~50-60% (estimated, no reporting enabled)

### Architecture
- **Style**: Serverless Event-Driven Pipeline
- **Pattern**: Functional programming with Result types for error handling
- **Principles**: Strong adherence to DRY, KISS, YAGNI, and SOLID

### Dependencies
- **Production**: 11 packages
- **Development**: 17 packages
- **Internal**: 1 framework (@ticketmaster/lambda)
- **Critical Issues**: 1 (uuid imported but not declared)

### Infrastructure
- **Deployment**: GitLab CI/CD with 9 stages
- **Environments**: 4 (dev1, qa1, preprod1, prod1)
- **Resources**: 1 Lambda, 4 S3 buckets, 4 Glue databases, Kinesis streams

## Using This Documentation

This documentation enables AI assistants to answer any question about the codebase without accessing the actual code. Each document is structured for:

1. **Human readability** - Clear sections, tables, and examples
2. **AI queryability** - Comprehensive context and cross-references
3. **Searchability** - Keywords, file paths, and line numbers
4. **Maintainability** - Regenerate anytime with fresh analysis

## Regenerating Documentation

To update this documentation after code changes:

```bash
/bb:document-repos /path/to/repo <name> <classification>
```

Example:
```bash
/bb:document-repos ~/Documents/TM/demand-capture/data-pipeline dmd-pipeline pipeline
```

---

**Generated by** TM Repository Documentation System
**Session Cost**: Run `/cost` to view token usage and API costs
