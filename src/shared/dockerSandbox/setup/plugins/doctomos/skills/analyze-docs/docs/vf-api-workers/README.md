# vf-api-workers

## Metadata

- **Generated**: 2026-02-13
- **Source Repository**: `/Users/Brodie.Balser/Documents/TM/vf/vf-api/workers`
- **Classification**: worker
- **Documentation System**: TM Repository Documentation System v1.0

---

## Overview

This repository processes and manages fan verification scoring data for Ticketmaster's Verified Fan platform. It consumes scoring data from various sources, stores it in DynamoDB, tracks verification status changes, and notifies stakeholders about scoring results.

The Verified Fan program requires real-time processing of fan scoring data to determine which fans are verified and eligible for ticket purchasing opportunities. This system exists to ingest scored fan data, maintain accurate verification states, update counts, and ensure visibility into scoring operations through Slack notifications. It bridges the gap between the scoring pipeline (which generates fan scores) and the operational systems (which use that data to grant ticket access).

**Key Capabilities:**
- Real-time Score Processing: Ingests fan scoring data from S3 files and processes thousands of records in batches
- Verification State Management: Tracks and maintains fan verification status (verified, rejected, selected) across campaigns
- Automated Reporting: Notifies stakeholders via Slack when scoring completes and verification counts change
- Data Distribution: Publishes scoring events to Kinesis streams for downstream consumption
- Count Reconciliation: Maintains accurate counts of verified, rejected, and selected fans per campaign

---

## Documentation Index

### Core Documentation

**Purpose & Business Context**
- [Purpose Overview](dynamic/purpose-overview.md) - What this system does and why it exists
- [Use Cases & Workflows](dynamic/purpose-usecases.md) - Primary use cases, user journeys, and business scenarios
- [Domain Concepts](dynamic/purpose-domain.md) - Core entities, business rules, and terminology

**Architecture & Structure**
- [Architecture Structure](static/architecture-structure.md) - Directory layout and file organization
- [Architecture Patterns](static/architecture-patterns.md) - Design patterns and architectural decisions
- [Data Flow](static/architecture-dataflow.md) - How data moves through the system

**Dependencies**
- [External Dependencies](dynamic/dependencies-external.md) - npm packages and external libraries
- [Internal Dependencies](dynamic/dependencies-internal.md) - @verifiedfan/* packages and coupling analysis
- [Dependency Analysis](dynamic/dependencies-analysis.md) - Risk assessment and update recommendations

### Technical Documentation

**Infrastructure & Deployment**
- [Infrastructure Resources](static/infrastructure-resources.md) - AWS resources, Lambda functions, DynamoDB tables
- [Infrastructure Deployment](static/infrastructure-deployment.md) - CI/CD pipeline and deployment process
- [Infrastructure Operations](static/infrastructure-operations.md) - Monitoring, alerting, and runbooks

**Testing & Quality**
- [Testing Strategy](static/testing-strategy.md) - Test organization, frameworks, and patterns
- [Testing Coverage](static/testing-coverage.md) - Coverage metrics and testing gaps

**Code Style & Standards**
- [Coding Conventions](dynamic/style-conventions.md) - Naming, formatting, and linting rules
- [Code Complexity](dynamic/style-complexity.md) - Complexity analysis and recommendations

**Type Definitions**
- [Type Definitions](dynamic/types-definitions.md) - All explicit type definitions with categorization
- [Type Usage](dynamic/types-usage.md) - Implicit types from function signatures and usage patterns

---

## Agent Status

| Agent | Status | Files Generated |
|-------|--------|-----------------|
| Architecture | ✅ Success | 3 files |
| Dependencies | ✅ Success | 3 files |
| Infrastructure | ✅ Success | 3 files |
| API | ✅ Success | Not applicable (no API definitions) |
| Purpose | ✅ Success | 3 files |
| Testing | ✅ Success | 2 files |
| Coding Style | ✅ Success | 2 files |
| Types | ✅ Success | 2 files |

**Summary**: 8/8 agents succeeded, 18 documentation files generated

---

## Quick Start

**Most Important Documents for New Team Members:**
1. [Purpose Overview](dynamic/purpose-overview.md) - Start here to understand what this system does
2. [Architecture Structure](static/architecture-structure.md) - Understand the codebase organization
3. [Infrastructure Resources](static/infrastructure-resources.md) - Learn about the AWS infrastructure
4. [Use Cases & Workflows](dynamic/purpose-usecases.md) - See real-world usage scenarios

**For Debugging Issues:**
1. [Infrastructure Operations](static/infrastructure-operations.md) - Runbooks and debugging guides
2. [Data Flow](static/architecture-dataflow.md) - Trace how data moves through the system
3. [Testing Strategy](static/testing-strategy.md) - Understand test coverage

**For Development:**
1. [Coding Conventions](dynamic/style-conventions.md) - Follow existing code patterns
2. [Type Definitions](dynamic/types-definitions.md) - Reference type system
3. [Dependencies Analysis](dynamic/dependencies-analysis.md) - Check for dependency issues

---

_Generated by TM Repository Documentation System_
