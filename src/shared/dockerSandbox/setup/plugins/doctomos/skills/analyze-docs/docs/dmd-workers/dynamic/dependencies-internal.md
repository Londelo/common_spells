# Internal Dependencies - dmd-workers

## @verifiedfan/* Packages

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| @verifiedfan/aws | ^2.8.0 | AWS service abstractions (DynamoDB, S3, SQS, etc.) | Infrastructure |
| @verifiedfan/batch-fn | ^1.2.1 | Batch processing utilities | Data Processing |
| @verifiedfan/bitly | ^1.1.0 | Bitly URL shortening integration | External Service |
| @verifiedfan/cloudwatch-stdout | ^2.0.0 | CloudWatch logging for stdout | Observability |
| @verifiedfan/configs | ^1.2.4 | Shared configuration utilities | Configuration |
| @verifiedfan/cucumber-features | ^1.2.5 | Shared Cucumber/BDD features | Testing (dev) |
| @verifiedfan/date | ^1.3.0 | Date/time utilities | Utility |
| @verifiedfan/delay | ^1.2.6 | Delay/throttling utilities | Utility |
| @verifiedfan/kafka | ^1.1.3 | Kafka messaging integration | Messaging |
| @verifiedfan/log | ^1.4.1 | Logging utilities | Observability |
| @verifiedfan/map-utils | ^1.3.1 | Functional map/collection utilities | Utility |
| @verifiedfan/mongodb | ^2.1.0 | MongoDB abstractions | Database |
| @verifiedfan/redis | ^1.2.0 | Redis cache abstractions | Cache |
| @verifiedfan/request | ^3.4.0 | HTTP request utilities | HTTP |
| @verifiedfan/schemas | ^1.3.1 | Shared data schemas | Data |
| @verifiedfan/test-utils | ^3.4.2 | Testing utilities and helpers | Testing (dev) |
| @verifiedfan/tm-discovery | ^2.12.0 | Ticketmaster Discovery API integration | External Service |
| @verifiedfan/tm-sms | ^1.1.0 | SMS sending service | Communication |
| @verifiedfan/tracing | 3.0.1 | Distributed tracing (OpenTelemetry) | Observability |
| @verifiedfan/yaml | ^1.2.1 | YAML parsing utilities | Configuration |

## Dependency Breakdown by Category

### Infrastructure (3)
- **@verifiedfan/aws**: Core AWS service abstractions
- **@verifiedfan/mongodb**: Database layer
- **@verifiedfan/redis**: Caching layer

### Observability (3)
- **@verifiedfan/cloudwatch-stdout**: Logging output
- **@verifiedfan/log**: Application logging
- **@verifiedfan/tracing**: Distributed tracing

### External Service Integration (3)
- **@verifiedfan/bitly**: URL shortening
- **@verifiedfan/tm-discovery**: Ticketmaster API
- **@verifiedfan/tm-sms**: SMS notifications

### Messaging (1)
- **@verifiedfan/kafka**: Event streaming

### Data Processing (2)
- **@verifiedfan/batch-fn**: Batch operations
- **@verifiedfan/map-utils**: Collection utilities

### Configuration (2)
- **@verifiedfan/configs**: Configuration management
- **@verifiedfan/yaml**: YAML processing

### Data/Schema (1)
- **@verifiedfan/schemas**: Shared data models

### Communication (1)
- **@verifiedfan/tm-sms**: SMS service

### Utilities (3)
- **@verifiedfan/date**: Date handling
- **@verifiedfan/delay**: Timing/throttling
- **@verifiedfan/request**: HTTP requests

### Testing (2 - dev only)
- **@verifiedfan/cucumber-features**: BDD features
- **@verifiedfan/test-utils**: Test helpers

## Coupling Analysis

### Strong Coupling (High Usage)
- **@verifiedfan/aws**: Core infrastructure dependency for DynamoDB, SQS, Lambda - used extensively
- **@verifiedfan/log**: Used throughout for logging
- **@verifiedfan/map-utils**: Functional utilities used in data processing
- **@verifiedfan/batch-fn**: Used in notification generation for batch operations

### Moderate Coupling
- **@verifiedfan/mongodb**: Database operations
- **@verifiedfan/redis**: Caching operations
- **@verifiedfan/kafka**: Event streaming
- **@verifiedfan/schemas**: Data validation
- **@verifiedfan/tracing**: Observability

### Minimal Coupling (Specific Features)
- **@verifiedfan/bitly**: URL shortening (limited to specific workers)
- **@verifiedfan/tm-discovery**: Ticketmaster API (event details worker)
- **@verifiedfan/tm-sms**: SMS sending (notification workers)
- **@verifiedfan/cloudwatch-stdout**: Logging infrastructure
- **@verifiedfan/configs**: Configuration loading
- **@verifiedfan/yaml**: Configuration parsing
- **@verifiedfan/date**: Date utilities
- **@verifiedfan/delay**: Throttling/retry logic
- **@verifiedfan/request**: HTTP utilities

## Architecture Implications

### Microservices Architecture
This repository follows a worker-based microservices pattern where:
- Each worker (in `/apps`) is a discrete Lambda function
- Workers share common infrastructure through `@verifiedfan/*` packages
- Strong coupling to AWS services (Lambda, DynamoDB, SQS, Kinesis)

### Infrastructure Dependencies
The codebase is heavily dependent on:
1. **AWS ecosystem** (@verifiedfan/aws for DynamoDB, SQS, etc.)
2. **Event-driven architecture** (@verifiedfan/kafka for streaming)
3. **Observability stack** (@verifiedfan/log, @verifiedfan/tracing, @verifiedfan/cloudwatch-stdout)

### Upgrade Coordination
Many @verifiedfan packages are at similar minor versions (~1.x, ~2.x), suggesting:
- Regular coordinated updates across internal packages
- Shared versioning strategy
- Potential for bulk upgrades when internal packages are updated

## Version Consistency Notes

Most packages use caret (^) versioning, allowing minor/patch updates automatically. The only exception:
- **@verifiedfan/tracing**: Pinned to `3.0.1` (no caret), suggesting:
  - Potential breaking changes in newer versions
  - Deliberate version lock for stability
  - May need attention when upgrading

## Testing Dependencies

Two internal testing packages in devDependencies:
- **@verifiedfan/cucumber-features**: Shared BDD scenarios
- **@verifiedfan/test-utils**: Common test helpers

This suggests standardized testing practices across VerifiedFan repositories.
