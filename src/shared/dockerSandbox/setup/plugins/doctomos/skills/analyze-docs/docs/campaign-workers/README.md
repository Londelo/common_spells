# campaign-workers

> **Generated:** 2026-02-13
> **Source:** /Users/Brodie.Balser/Documents/TM/vf/campaign-pipeline/workers
> **Classification:** worker

---

## Overview

This repository contains AWS Lambda workers that automate the campaign pipeline for Verified Fan. It processes fan data through multiple stages - from scoring fans based on their activity to generating access codes, preparing SMS wave files, and sending notifications. These workers handle the operational workflow that determines which fans get selected for campaigns and how they're notified.

When Ticketmaster runs a Verified Fan campaign (presales, exclusive offers, etc.), thousands or millions of fans register. This system exists to solve the problem of fairly selecting and notifying eligible fans at scale. It automates the entire pipeline from analyzing fan eligibility, scoring their likelihood of being genuine fans, generating unique access codes, and delivering SMS/email notifications with those codes.

---

## Documentation

### Core Documentation

| Document | Description |
|----------|-------------|
| [Purpose & Overview](dynamic/purpose-overview.md) | What this system does and why it exists |
| [Use Cases & Workflows](dynamic/purpose-usecases.md) | Business use cases and user journeys |
| [Domain Concepts](dynamic/purpose-domain.md) | Business entities, rules, and terminology |
| [Architecture Structure](static/architecture-structure.md) | Directory layout, entry points, file organization |
| [Architecture Patterns](static/architecture-patterns.md) | Design patterns and architecture style |
| [Data Flow](static/architecture-dataflow.md) | How data moves through the system |

### Dependencies

| Document | Description |
|----------|-------------|
| [External Dependencies](dynamic/dependencies-external.md) | npm packages and third-party libraries |
| [Internal Dependencies](dynamic/dependencies-internal.md) | @verifiedfan/* packages and coupling analysis |
| [Dependency Analysis](dynamic/dependencies-analysis.md) | Risk assessment and update recommendations |

### Infrastructure & Deployment

| Document | Description |
|----------|-------------|
| [Infrastructure Resources](static/infrastructure-resources.md) | AWS resources (Lambda, DynamoDB, SQS, S3, etc.) |
| [Deployment Process](static/infrastructure-deployment.md) | CI/CD pipeline and deployment commands |
| [Operations & Monitoring](static/infrastructure-operations.md) | Monitoring, logging, alerting, and runbooks |

### Code & Types

| Document | Description |
|----------|-------------|
| [Type Definitions](dynamic/types-definitions.md) | TypeScript interfaces, types, and enums |
| [Type Usage Patterns](dynamic/types-usage.md) | Function signatures and implicit types |
| [Coding Conventions](dynamic/style-conventions.md) | Naming, formatting, linting rules, and engineering principles |
| [Code Complexity](dynamic/style-complexity.md) | Complexity metrics and recommendations |

### Testing

| Document | Description |
|----------|-------------|
| [Testing Strategy](static/testing-strategy.md) | Test organization, frameworks, and patterns |
| [Test Coverage](static/testing-coverage.md) | Coverage metrics, gaps, and recommendations |

---

## Agent Status

| Agent | Status | Files Generated |
|-------|--------|----------------|
| Architecture | ✓ Success | 3 files |
| Dependencies | ✓ Success | 3 files |
| Infrastructure | ✓ Success | 3 files |
| API | ✓ Success (N/A) | API documentation not applicable |
| Purpose | ✓ Success | 3 files |
| Testing | ✓ Success | 2 files |
| Coding Style | ✓ Success | 2 files |
| Types | ✓ Success | 2 files |

**Summary:** 8/8 agents succeeded • 18 markdown files generated

---

## Quick Start

**Understanding the System:**
1. Start with [Purpose & Overview](dynamic/purpose-overview.md) to understand what this does
2. Review [Use Cases](dynamic/purpose-usecases.md) to see how it's used
3. Check [Architecture Structure](static/architecture-structure.md) to understand the codebase organization

**For Developers:**
1. Review [Coding Conventions](dynamic/style-conventions.md) for style guidelines
2. Check [Type Definitions](dynamic/types-definitions.md) for available types
3. See [Testing Strategy](static/testing-strategy.md) for how to write tests

**For Operations:**
1. Review [Infrastructure Resources](static/infrastructure-resources.md) for AWS resources
2. Check [Operations & Monitoring](static/infrastructure-operations.md) for runbooks
3. See [Deployment Process](static/infrastructure-deployment.md) for deployment procedures

---

## Key Capabilities

- **Fan Scoring & Validation** - Analyzes fan data to assign eligibility scores and detect fraud
- **Code Generation & Assignment** - Creates unique access codes for campaigns
- **SMS Wave Processing** - Prepares batches of fans for notification delivery
- **Multi-Channel Notifications** - Delivers codes via SMS, email, and mobile push
- **Data Quality Management** - Validates, consolidates, and archives campaign data
- **Operational Monitoring** - Tracks campaign execution with Slack notifications

---

## Technology Stack

**Runtime:** AWS Lambda (Node.js 16.x)
**Language:** TypeScript + JavaScript
**Build:** Babel + webpack
**Testing:** Jest + Cucumber
**Deployment:** Terraform (via Terramisu) + GitLab CI/CD
**Data:** S3, DynamoDB, Kinesis, SQS, Athena

---

**Generated by TM Repository Documentation System**
