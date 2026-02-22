# Internal Dependencies - campaign-workers

## @verifiedfan/* Packages

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/avro | ^2.0.0 | Avro schema validation and record handling |
| @verifiedfan/aws | ^2.7.0 | AWS service utilities and helpers |
| @verifiedfan/batch-fn | ^1.2.1 | Batch processing function utilities |
| @verifiedfan/batch-transform-stream | ^0.2.3 | Stream transformation in batches |
| @verifiedfan/cloudwatch-stdout | ^2.0.0 | CloudWatch metrics via stdout |
| @verifiedfan/configs | ^1.2.4 | Configuration management |
| @verifiedfan/csv-write-stream | ^2.0.3 | CSV file writing streams |
| @verifiedfan/date | ^1.2.1 | Date parsing and formatting utilities |
| @verifiedfan/delay | ^1.2.1 | Async delay/sleep utility |
| @verifiedfan/flatten-transform-stream | ^0.2.0 | Stream flattening transformations |
| @verifiedfan/jwt | ^0.1.1 | JWT authentication utilities |
| @verifiedfan/locale | ^1.1.0 | Locale and internationalization helpers |
| @verifiedfan/log | ^1.4.1 | Logging utilities |
| @verifiedfan/map-utils | ^1.3.1 | Async mapping utilities (MapAsyncParallel, MapAsyncSerial) |
| @verifiedfan/mongodb | ^2.1.0 | MongoDB connection and utilities |
| @verifiedfan/request | ^3.5.1 | HTTP request utilities (TitanRequest) |
| @verifiedfan/schemas | ^1.3.1 | Schema validation utilities |
| @verifiedfan/sfmc | ^1.1.0 | Salesforce Marketing Cloud integration |
| @verifiedfan/slack | ^1.1.0 | Slack messaging integration |
| @verifiedfan/string-utils | ^1.1.1 | String manipulation utilities |
| @verifiedfan/tm-pacman | ^1.1.0 | Ticketmaster Pacman integration |
| @verifiedfan/tm-sms | ^1.2.0 | Ticketmaster SMS integration |
| @verifiedfan/tracing | 3.0.1 | Distributed tracing utilities (exact version) |
| @verifiedfan/yaml | ^1.2.1 | YAML parsing utilities |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @verifiedfan/cucumber-features | ^1.2.0 | Shared Cucumber test features |
| @verifiedfan/test-utils | ^3.2.0 | Testing utilities and helpers |

## Usage Analysis

Based on code examination, these internal packages are actively used throughout the codebase:

### Core Infrastructure
- **@verifiedfan/aws** - AWS SDK wrappers, used for DynamoDB, S3, Kinesis, Firehose
- **@verifiedfan/configs** - Configuration loading from files
- **@verifiedfan/log** - Logging throughout all workers
- **@verifiedfan/tracing** - OpenTelemetry distributed tracing (TracedSdk, GlobalTracer)
- **@verifiedfan/cloudwatch-stdout** - Metrics emission (putMetric, TimedSdk, TimedRequest)

### Data Processing
- **@verifiedfan/avro** - Avro validation in code assignment transformations
- **@verifiedfan/batch-fn** - Batching operations for efficiency
- **@verifiedfan/batch-transform-stream** - Stream processing in batches
- **@verifiedfan/flatten-transform-stream** - Flattening nested data structures
- **@verifiedfan/csv-write-stream** - CSV file generation
- **@verifiedfan/map-utils** - Heavily used for parallel and serial async operations

### Date & Time
- **@verifiedfan/date** - Used throughout for ISO string conversion, parsing, time calculations
  - `toISOString()`, `parse()`, `now()`, `timeInMilliseconds()`

### Utilities
- **@verifiedfan/delay** - Async delays, retry logic, rate limiting
- **@verifiedfan/locale** - Locale fallback handling
- **@verifiedfan/string-utils** - String manipulation
- **@verifiedfan/yaml** - YAML schema reading
- **@verifiedfan/schemas** - Schema validation

### External Integrations
- **@verifiedfan/jwt** - Authentication with WorkerAuth
- **@verifiedfan/mongodb** - Database operations
- **@verifiedfan/request** - HTTP requests with TitanRequest
- **@verifiedfan/sfmc** - Salesforce Marketing Cloud
- **@verifiedfan/slack** - Slack notifications
- **@verifiedfan/tm-pacman** - Ticketmaster code generation (generatePasswords)
- **@verifiedfan/tm-sms** - SMS wave sending

## Coupling Analysis

### High Coupling Areas

**Stream Processing Pipeline:**
The workers are tightly coupled to the VerifiedFan stream processing ecosystem:
- Multiple stream transform packages (batch, flatten)
- CSV and data processing utilities
- Avro schema validation

**AWS Infrastructure:**
Deep integration with AWS services through @verifiedfan/aws:
- Kinesis and Firehose streaming
- DynamoDB data access
- S3 file operations

**Observability Stack:**
Standardized on VerifiedFan observability tools:
- @verifiedfan/tracing for distributed tracing
- @verifiedfan/cloudwatch-stdout for metrics
- @verifiedfan/log for structured logging

### Medium Coupling

**Business Logic:**
- Ticketmaster integrations (tm-pacman, tm-sms)
- Campaign-specific data processing
- SFMC email campaigns

### Low Coupling

**Utilities:**
Most utility packages (date, delay, string-utils) could be replaced with external alternatives, though internal versions likely provide consistency.

## Dependency Health

### Well-Maintained Packages
- @verifiedfan/aws (v2.7.0) - Core infrastructure, likely actively maintained
- @verifiedfan/tracing (3.0.1) - Modern version number, pinned exactly
- @verifiedfan/request (v3.5.1) - Higher version suggests active development
- @verifiedfan/test-utils (v3.2.0) - Active testing infrastructure

### Potentially Stale Packages
- @verifiedfan/jwt (v0.1.1) - Very low version number
- @verifiedfan/flatten-transform-stream (v0.2.0) - Pre-1.0 version
- @verifiedfan/batch-transform-stream (v0.2.3) - Pre-1.0 version

## Total Internal Dependency Count

- **Production:** 24 packages
- **Development:** 2 packages
- **Total:** 26 @verifiedfan packages

This represents significant coupling to the VerifiedFan internal ecosystem, which provides consistency but reduces portability.
