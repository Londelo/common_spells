# Purpose - vf-lib

## What This Does

The Verified Fan Library (vf-lib) is a monorepo of shared NPM packages that provides standardized integrations, utilities, and infrastructure abstractions for Ticketmaster's Verified Fan platform and related services.

## Business Context

This library exists to eliminate code duplication across Verified Fan microservices by providing battle-tested, reusable modules for common operations. It enables rapid development of new services while ensuring consistent behavior across the platform for critical functions like authentication, data validation, logging, event streaming, and third-party integrations.

The library reduces integration complexity and maintenance burden by centralizing AWS service clients, music platform APIs (Spotify, Apple Music), Ticketmaster internal APIs, messaging systems (Kafka, SNS/SQS), and data transformation utilities into a single, versioned source of truth.

## Target Users/Consumers

- **Internal Developers**: Engineers building Verified Fan microservices (verification flows, fan engagement, campaign management)
- **Other Services**: Node.js microservices within the Ticketmaster ecosystem that need to integrate with Verified Fan systems
- **Testing Frameworks**: Cucumber-based integration tests that validate service behavior across the platform

## Key Business Capabilities

- **Third-Party Music Platform Integration**: Access user listening data from Spotify, Apple Music, and Facebook to verify fan engagement and preferences
- **Ticketmaster API Integration**: Unified clients for TM Accounts (AUUM, ACOE, ARAI), TM Orders, TM Discovery, TM Users, TM Wallet, TM SMS, and TM PACMAN services
- **AWS Infrastructure Abstraction**: Simplified interfaces for S3, DynamoDB, Kinesis, Firehose, Lambda, SNS, SQS, CloudWatch, Athena, Step Functions, and Secrets Manager
- **Event-Driven Architecture Support**: Kafka producer/consumer with schema registry, SNS topic publishing, SQS queue operations
- **Data Validation and Normalization**: Consistent formatting of user inputs (emails, phone numbers, names, addresses) across all services
- **Authentication and Authorization**: JWT token generation/validation, worker authentication, permission management
- **Observability and Monitoring**: OpenTelemetry distributed tracing, structured logging, CloudWatch metrics, Prometheus metrics, PagerDuty alerting
- **Data Persistence**: MongoDB client, Redis caching with retry logic, Snowflake data warehouse integration
- **Testing and Quality Assurance**: Cucumber test utilities, mock factories, assertion helpers

## Business Requirements & Constraints

- REQ-001: All packages must be independently versioned and publishable to allow selective updates
- REQ-002: Breaking changes must follow semantic versioning to prevent downstream service disruption
- REQ-003: AWS clients must handle credential rotation and token refresh automatically
- REQ-004: Music platform integrations must handle token expiration and refresh flows
- REQ-005: All network operations must include retry logic with exponential backoff for resilience
- REQ-006: Data normalizers must handle international formats (phone numbers, addresses, names with accents)
- REQ-007: Logging must support structured JSON format for centralized log aggregation
- REQ-008: All packages must be compatible with Node.js >= 12.14

## Core Business Rules

- **Automatic Reconnection**: Kafka, Redis, and MongoDB clients must automatically reconnect on connection failures (3 retries with exponential backoff)
- **Token Management**: Spotify and TM API clients must refresh OAuth tokens before expiration to prevent auth failures
- **Data Sanitization**: All user input normalizers must remove unsafe characters and return null for invalid data rather than throwing errors
- **FIFO Queue Handling**: SQS/SNS clients must automatically include message deduplication IDs and group IDs when targeting FIFO queues
- **Schema Validation**: Kafka messages must be validated against Confluent Schema Registry before publishing
- **Credential Security**: AWS credentials and API secrets must be loaded from environment variables or Secrets Manager, never hardcoded
- **Error Transparency**: All HTTP request failures must preserve original error codes and messages for upstream debugging
- **Cache Consistency**: Redis operations must support read replica routing with fallback to primary for consistency

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Application event | Publish event message | Kafka topics | Real-time during business operations |
| System notification | Publish SNS message | SNS topics | Real-time for system events |
| Queue message | Send SQS message | SQS queues | Asynchronous task distribution |
| Telemetry data | Export trace spans | OpenTelemetry Collector (Splunk) | Continuous during operations |
| Log entries | Stream logs | CloudWatch Logs | Real-time application logging |
| Metrics | Publish metrics | Prometheus/CloudWatch | Periodic metric collection |
| Critical alerts | Create incident | PagerDuty | On-demand for production issues |
| Data storage | Write records | S3, DynamoDB, MongoDB | Application-driven persistence |
| Analytics data | Stream records | Kinesis Firehose → Snowflake | Real-time data pipeline |
| Short URLs | Generate link | Bitly API | On-demand for marketing |
| Marketing emails | Send campaign | Salesforce Marketing Cloud (SFMC) | Scheduled or triggered |
| Notifications | Send alert | Slack channels | Event-driven notifications |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Kafka topics | Application events | Consume and decode from Schema Registry | Real-time stream processing |
| SQS queues | Queue messages | Receive and process messages | Polling-based consumption |
| Spotify API | User profile, listening history, saved tracks | Fetch and normalize fan data | On-demand API calls |
| Apple Music API | User library, listening preferences | Fetch and normalize fan data | On-demand API calls |
| Facebook API | User profile data | Fetch and normalize user info | On-demand API calls |
| TM Accounts (AUUM/ACOE/ARAI) | User authentication, activity | Validate and fetch user info | Real-time auth flows |
| TM Orders | Order status, purchase history | Query order details | On-demand queries |
| TM Discovery | Event discovery | Search events and venues | On-demand searches |
| TM Users | User profile management | CRUD user operations | On-demand operations |
| TM Wallet | Payment methods | Manage payment info | On-demand operations |
| AWS Secrets Manager | Secret rotation | Fetch updated credentials | Periodic/on-demand |
| S3 | File operations | Read/write/presign objects | On-demand file operations |
| DynamoDB | Database operations | Query/scan/put/delete items | On-demand data access |
| Redis | Cache operations | Get/set/delete cached values | High-frequency cache access |
| MongoDB | Document operations | CRUD operations | On-demand database access |

### Service Dependencies

**Infrastructure Services (AWS)**:
- S3 (file storage), DynamoDB (NoSQL database), Kinesis (data streaming), Firehose (data delivery), Lambda (serverless functions), CloudWatch (logging/metrics), SQS (queuing), SNS (pub/sub), Athena (analytics queries), Step Functions (orchestration), Secrets Manager (credential management)

**Data Services**:
- Kafka (event streaming with Confluent Schema Registry), Redis (caching), MongoDB (document database), Snowflake (data warehouse)

**External APIs**:
- Spotify (music streaming data), Apple Music (music streaming data), Facebook (social profile data), Bitly (URL shortening)

**Ticketmaster Internal APIs**:
- TM Accounts (AUUM, ACOE, ARAI - authentication/user management), TM Orders (order processing), TM Discovery (event search), TM Users (user profiles), TM Wallet (payments), TM SMS (text messaging), TM PACMAN (API gateway/routing)

**Observability Services**:
- OpenTelemetry Collector (distributed tracing), Prometheus (metrics), PagerDuty (alerting), Slack (notifications), Salesforce Marketing Cloud (email campaigns)

## Success Metrics

- **Library Adoption**: Number of consuming services and package download counts from internal NPM registry
- **API Reliability**: 99.9% success rate for third-party API integrations with automatic retry handling
- **Dependency Freshness**: Security vulnerabilities addressed within 7 days of disclosure
- **Breaking Change Impact**: Zero unplanned production incidents from library updates (via semantic versioning compliance)
- **Test Coverage**: >80% code coverage across all packages with integration test suite
- **Build Success Rate**: >95% successful CI/CD pipeline runs
- **Developer Productivity**: Reduced time to implement common integrations (e.g., Kafka producer from hours to minutes)
