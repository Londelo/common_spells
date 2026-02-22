# dmd-workers

## Metadata

- **Generated:** February 13, 2026 at 9:57 PM PST
- **Source Repository:** `/Users/Brodie.Balser/Documents/TM/demand-capture/workers`
- **Classification:** Worker
- **Documentation Version:** 1.0

---

## Overview

The demand-workers repository is an event-driven notification system that sends timely SMS and email reminders to fans when tickets for concerts and events are about to go on sale. It monitors upcoming ticket sales (presales and public sales), generates personalized notifications, and delivers them to fans who have opted in to receive reminders.

The system bridges the gap between Ticketmaster's event management systems and fan communication channels (SMS, email), helping increase ticket sales by ensuring fans don't miss sale start times.

**Key Capabilities:**
- Monitors upcoming sales via scheduled queries (30-minute windows)
- Generates personalized messages with artist, venue, time, and URLs
- Delivers notifications via SMS/email with retry logic
- Handles high-volume events (50,000+ notifications for popular artists)
- Tracks delivery status through multiple state transitions

---

## Documentation

### Core Documentation

- **[Purpose & Overview](dynamic/purpose-overview.md)** - What this system does and why it exists
- **[Architecture Structure](static/architecture-structure.md)** - Directory layout and organization
- **[Dependencies - External](dynamic/dependencies-external.md)** - External npm packages

### Technical Documentation

- **[Architecture Patterns](static/architecture-patterns.md)** - Design patterns and architectural style
- **[Architecture Data Flow](static/architecture-dataflow.md)** - How data moves through the system
- **[Dependencies - Internal](dynamic/dependencies-internal.md)** - Internal @verifiedfan packages
- **[Dependencies - Analysis](dynamic/dependencies-analysis.md)** - Risk assessment and recommendations
- **[Infrastructure Resources](static/infrastructure-resources.md)** - AWS resources and configuration
- **[Infrastructure Deployment](static/infrastructure-deployment.md)** - CI/CD pipeline and deployment process
- **[Infrastructure Operations](static/infrastructure-operations.md)** - Monitoring, logging, and runbooks
- **[Testing Strategy](static/testing-strategy.md)** - Testing approach and frameworks
- **[Testing Coverage](static/testing-coverage.md)** - Coverage metrics and gaps
- **[Coding Conventions](dynamic/style-conventions.md)** - Code style and engineering principles
- **[Code Complexity](dynamic/style-complexity.md)** - Complexity analysis
- **[Type Definitions](dynamic/types-definitions.md)** - TypeScript types and enums
- **[Type Usage](dynamic/types-usage.md)** - Function signatures and patterns

### Business Documentation

- **[Use Cases & Workflows](dynamic/purpose-usecases.md)** - User stories and business workflows
- **[Domain Concepts](dynamic/purpose-domain.md)** - Business rules and terminology

---

## Agent Status

All documentation agents completed successfully:

| Agent | Status | Files Generated |
|-------|--------|-----------------|
| Architecture | ✅ Success | architecture-structure.md, architecture-patterns.md, architecture-dataflow.md |
| Dependencies | ✅ Success | dependencies-external.md, dependencies-internal.md, dependencies-analysis.md |
| Infrastructure | ✅ Success | infrastructure-resources.md, infrastructure-deployment.md, infrastructure-operations.md |
| API | ✅ Success | Not applicable (no API definitions found - worker repository) |
| Purpose | ✅ Success | purpose-overview.md, purpose-usecases.md, purpose-domain.md |
| Testing | ✅ Success | testing-strategy.md, testing-coverage.md |
| Coding Style | ✅ Success | style-conventions.md, style-complexity.md |
| Types | ✅ Success | types-definitions.md, types-usage.md |

**Summary:** 8/8 agents succeeded, 18 documentation files generated

---

## Quick Reference

### Key Workers

- **notificationScheduler** - Queries upcoming sales every 30 minutes
- **notificationGenerator** - Generates personalized notification messages
- **notificationSend** - Sends SMS/email via external service
- **demandStreamToSqs** - Forwards records to SQS queue
- **shortenEventUrl** - Creates short URLs via Bitly
- **smsStatusConsumer** - Tracks SMS delivery status
- **eventDetails** - Fetches and caches event data
- **proxyTmAccountService** - Proxies TM account requests

### Key Technologies

- **Language:** JavaScript (Node.js 18.x)
- **Paradigm:** Strict functional programming with Ramda
- **Framework:** Serverless (AWS Lambda)
- **Testing:** Jest + Cucumber
- **Infrastructure:** Terraform via Terramisu wrapper
- **CI/CD:** GitLab CI with 35-stage pipeline

### Key AWS Resources

- **Lambda Functions:** 8 workers
- **DynamoDB:** Demand capture table with streams
- **SQS:** Event URL shortening queue
- **Kinesis:** Stream processing for logs and events
- **ElastiCache:** Redis clusters (primary + read-replica)
- **CloudWatch:** Logs, metrics, and EventBridge scheduling

---

## Architecture Highlights

**Style:** Event-Driven Serverless Microservices
- Lambda-based workers triggered by AWS events
- DynamoDB Streams for change data capture
- Kinesis for high-throughput event processing
- SQS for reliable message queuing
- Functional programming paradigm throughout

**Deployment:** Progressive Promotion
- QA → Dev → Preprod → Prod
- Automated testing gates between environments
- Manual approval required for production
- Terraform-managed infrastructure

**Operational Characteristics:**
- 7-day log retention for cost optimization
- Structured JSON logging for queryability
- OpenTelemetry distributed tracing
- No production alerting (opportunity for improvement)

---

## Critical Dependencies

### Internal (@verifiedfan/*)
- `@verifiedfan/aws` - AWS utilities (DynamoDB, SQS, Kinesis)
- `@verifiedfan/log` - Structured logging
- `@verifiedfan/kafka` - Kafka integration
- `@verifiedfan/map-utils` - Data transformation utilities

### External (High Priority Updates)
- ⚠️ **moment.js** - Deprecated, needs migration to date-fns/dayjs
- ⚠️ **uuid** - 6 major versions behind (v3 → v11)
- ⚠️ **jest/babel-jest** - Version mismatch (30 vs 25)

---

## Business Context

**Product:** Ticket Sale Notifications (PRD3292)
**Business Value:**
- Increases ticket sales conversion
- Improves fan experience and engagement
- Supports multi-channel delivery (SMS/email)
- Handles international markets (en-us, en-ca, fr-ca)

**Success Metrics:**
- Notification delivery rate > 99%
- SMS delivery < 5 seconds
- Event processing < 2 seconds
- Zero dropped notifications

---

_Generated by TM Repository Documentation System_
_For updates, run: `/bb:document-repos` with the repository path_
