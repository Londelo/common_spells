# Purpose - fan-identity-workers

## What This Does

This repository provides serverless event-driven workers that power the VerifiedFan identity verification and fraud prevention system. It continuously monitors user activity, performs identity verification checks, calculates risk scores to detect bots and fraudulent behavior, and provides authentication services for the GraphQL API.

## Business Context

Ticketmaster's VerifiedFan platform needs to protect against bots, scalpers, and fraudulent accounts to ensure tickets reach real fans. This system exists to:

- **Detect and prevent fraud** - Continuously score user accounts based on behavioral patterns, purchase history, and account activity to identify high-risk users before they can purchase tickets
- **Verify fan identities** - Integrate with Persona identity verification service to validate that users are real people through liveness detection and government ID checks
- **Enable real-time security decisions** - Provide risk scores and identity verification status to other systems (demand management, purchasing) so they can block or challenge suspicious users
- **Support compliance** - Maintain audit trails of identity verification and fraud detection activities for regulatory and business requirements

Without this system, VerifiedFan drops and ticket sales would be vulnerable to automated attacks, account takeovers, and coordinated fraud rings.

## Target Users/Consumers

### Direct Consumers
- **AppSync GraphQL API** - Authentication/authorization, liveness verification, ARM score queries
- **Internal VerifiedFan Systems** - Demand management, campaign enrollment, purchase flows consume risk scores
- **Admin/Ops Teams** - Monitor scoring performance, troubleshoot identity verification issues

### Data Producers (Event Sources)
- **Kafka Streams** - User activity stream (logins, account updates), purchase activity, SmartQueue journey events
- **DynamoDB Streams** - Fan identity table changes (ARAI cache, score updates, rescore requests), demand table (registration changes)
- **Kinesis Streams** - VerifiedFan login events
- **S3 Uploads** - Bot detection datasets, clustering model data
- **AWS Glue** - Data import workflows for ML model inputs

## Key Business Capabilities

- **Real-Time Fraud Scoring** - Continuously calculates risk scores (0-1 scale) for user accounts based on behavioral signals, enabling proactive fraud prevention during ticket drops
- **Identity Verification** - Validates user identities through Persona integration (liveness detection + government ID verification) to ensure only real fans can participate in high-demand events
- **Bot Detection** - Ingests bot detection model data from S3 and makes it available for risk scoring
- **User Clustering** - Processes clustering data to identify coordinated fraud rings and related accounts
- **Authentication Services** - Validates API keys and user session tokens (SOTC) for GraphQL API requests, providing user context to downstream resolvers
- **Account Risk Intelligence (ARAI)** - Fetches and caches comprehensive account risk data from Ticketmaster Accounts service, including activity history, device signals, and historical fraud indicators
- **ARM Risk Scoring** - Retrieves Account Risk Management (ARM) scores from dedicated Redis cluster, providing holistic risk assessment from Ticketmaster's ARM team

## Business Requirements & Constraints

### Performance Requirements
- **REQ-001**: Score calculation must complete within seconds of user activity to support real-time purchasing decisions
- **REQ-002**: System must handle 1000+ user activities per second during peak ticket drops
- **REQ-003**: Identity verification checks must complete within 2 minutes for acceptable user experience
- **REQ-004**: GraphQL API authorization must complete in <200ms to avoid request timeouts

### Accuracy Requirements
- **REQ-005**: Score calculations must use most recent ARAI data (max staleness: 5 minutes)
- **REQ-006**: Rescore requests must deduplicate to prevent redundant scoring
- **REQ-007**: Failed scoring operations must retry up to 2 times before alerting

### Data Requirements
- **REQ-008**: All score updates must include model version for audit/rollback purposes
- **REQ-009**: Rescore records must expire after 5 days to prevent unbounded DynamoDB growth
- **REQ-010**: ARM scores must be whole numbers 1-5 (invalid scores logged as warnings)

### Integration Requirements
- **REQ-011**: Workers must process events from multiple Kafka topics (user activity, purchases, queue journeys)
- **REQ-012**: System must support both FIFO and standard SQS queues for different processing guarantees
- **REQ-013**: Authentication must support both API-key-only and API-key+SOTC token combinations

## Core Business Rules

### Scoring Rules
- **RULE-001**: Only successful user activities trigger scoring (failed actions ignored)
- **RULE-002**: Scorable activities: `add_phone`, `create_account`, `login`, `reset_password`, `update_account`, `update_email`, `update_phone`, `verify_otp`, `verify_otp_mfa`
- **RULE-003**: Purchase events only score if status is `SUCCESS` and customer has valid `globalUserId`
- **RULE-004**: Rescore requests scheduled 5 days in future to debounce frequent activity bursts
- **RULE-005**: Duplicate rescore requests for same user+date are automatically filtered

### Identity Verification Rules
- **RULE-006**: Liveness checks require valid session ID from previous Persona inquiry
- **RULE-007**: Invalid liveness events return `InvalidEvent` error type
- **RULE-008**: IDV errors are normalized to GraphQL error format (message + errorType)

### Authentication Rules
- **RULE-009**: API key validation is mandatory - invalid keys return `isAuthorized: false`
- **RULE-010**: Missing SOTC token (no logged-in user) returns `isLoggedIn: false` but still authorized
- **RULE-011**: 401 errors from TM Accounts treated as invalid token (not system failure)
- **RULE-012**: Non-401 auth errors set `ttlOverride: 0` to prevent caching bad responses

### Data Processing Rules
- **RULE-013**: ARAI lookups batch process SQS records with partial failure support
- **RULE-014**: Score updates use conditional write to set `dateCreated` only on first write
- **RULE-015**: DynamoDB stream REMOVE events for rescore records trigger new scoring cycle
- **RULE-016**: Clustering/BotOrNot imports extract date from S3 object key (`date=YYYY-MM-DD` pattern)

## Integration Points

### Outbound (what we send/notify to other systems)

| Trigger | Event/Action | Recipient | When | Purpose |
|---------|-------------|-----------|------|---------|
| User activity detected | Send to `accountActivityQueue` | lookupArai worker | Immediately | Trigger ARAI fetch and scoring |
| User activity detected | Send to `onDemandScoringQueue` | lookupArai worker | On VerifiedFan login | Real-time scoring for active users |
| ARAI data cached | Update DynamoDB `fan-identity-table` | scoreUsers/stagingScoreUsers (via stream) | Immediately | Cache ARAI response for scoring |
| Score calculated | Update DynamoDB `fan-identity-table` with score | Downstream consumers | Immediately | Make score available to other systems |
| Rescore scheduled | Create DynamoDB rescore record | processRescoreEvents (via stream deletion) | 5 days later | Schedule future rescoring |
| Rescore record deleted | Send to `accountActivityQueue` | lookupArai worker | When TTL expires | Trigger rescore cycle |
| S3 file uploaded | Start AWS Glue workflow | Glue data import jobs | Immediately | Process bot detection / clustering data |

### Inbound (what events we respond to)

| Source | Event/Topic | Action | Worker | Timing |
|--------|-------------|--------|--------|--------|
| Kafka | `user-activity-stream` topic | Filter scorable activities → queue | enqueueFromStream | Real-time |
| Kafka | `purchaserequests` topic | Extract globalUserIds → schedule rescore | enqueueFromPurchaseStream | Real-time |
| Kafka | `queue.journey` topic | Extract globalUserIds → schedule rescore | enqueueFromSQJourneyStream | Real-time |
| Kinesis | VerifiedFan login stream | Filter users with globalUserId → queue | enqueueFromVfStream | Real-time |
| DynamoDB Stream | `demand-table` changes | Extract globalUserIds → schedule rescore | enqueueFromDemandStream | Near real-time (seconds) |
| DynamoDB Stream (Kinesis) | `fan-identity-table` ARAI inserts | Extract ARAI → call scoring model → save score | scoreUsers / stagingScoreUsers | Near real-time (seconds) |
| DynamoDB Stream (Kinesis) | `fan-identity-table` rescore REMOVE | Extract globalUserIds → queue for scoring | processRescoreEvents | When TTL expires (5 days) |
| SQS | `accountActivityQueue` | Fetch ARAI from TM Accounts → cache in DynamoDB | lookupArai | Batched (10-50 records) |
| S3 | Clustering data upload | Parse date from key → start Glue workflow | startClusterImport | Immediate |
| S3 | BotOrNot data upload | Extract filename → start Glue workflow | startBotOrNotImport | Immediate |
| AppSync | `authorization` header validation | Validate API key + optional SOTC token | validateToken | Per GraphQL request |
| AppSync | `livenessEvent` mutation | Process liveness event via Persona | handleEvent | Per GraphQL request |
| AppSync | `checkLiveness` query | Verify liveness decision via Persona | checkLiveness | Per GraphQL request |
| AppSync | `getArmScore` query | Fetch ARM score from Redis | getArmScore | Per GraphQL request |

### Service Dependencies

This repository integrates with:

| Service | Purpose | Authentication | Configuration |
|---------|---------|----------------|---------------|
| **TM Accounts (ARAI API)** | Fetch account risk activity intelligence | Username/password + client ID | `tm.accounts.arai` config |
| **TM Accounts (User Info API)** | Get user profile from SOTC token | Bearer token | `tm.accounts.aupo` / `tm.accounts.auum` config |
| **Persona Identity Verification** | Liveness detection and government ID verification | API key + webhook secret | `persona` config section |
| **Databricks Scoring Model** | ML model inference for account risk scoring | Model endpoint | `databricks.servingEndpoints.accountScoring` |
| **Unleash Feature Flags** | Feature toggles for gradual rollouts | Instance ID + environment | `featureFlags` config section |
| **ARM Redis Cluster** | Account Risk Management scores from ARM team | Environment variables | `ARM_REDIS_URL` (required), `ARM_REDIS_READ_ONLY_URL` (optional) |
| **AWS DynamoDB** | `fan-identity-table` - Primary data store for scores, ARAI cache, rescore schedules | IAM role | `aws.clients.fanIdentityTable` |
| **AWS SQS** | `accountActivityQueue` (FIFO), `onDemandScoringQueue` (standard) | IAM role | `aws.clients` config |
| **AWS Kinesis** | VerifiedFan login events, DynamoDB streams | IAM role | Event source mappings |
| **AWS S3** | Bot detection / clustering dataset uploads | IAM role | Event notifications |
| **AWS Glue** | Data import workflows | IAM role | `glue.workflowName` config |
| **Kafka (Confluent)** | User activity, purchase, SmartQueue journey streams | TLS + Schema Registry | `kafka` config sections |

### Related Repositories

- **fan-identity/api** - GraphQL API that calls these workers for authentication and identity verification
- **fan-identity/demand-service** - Consumes risk scores to make enrollment decisions
- **workers-template** - Template repository for shared Lambda infrastructure code
- **@verifiedfan/* npm packages** - Shared libraries for AWS clients, Kafka, tracing, logging

## Success Metrics

### Operational Health
- Scoring latency p95 < 5 seconds (from activity to score available)
- ARAI lookup success rate > 99%
- Score calculation success rate > 99.5%
- Identity verification API availability > 99.9%

### Data Quality
- Score coverage: >95% of active users have current scores
- Rescore cycle completion rate > 98%
- ARAI cache hit rate > 90% (reduces API calls)
- ARM score availability > 85% (depends on ARM team's Redis)

### Performance
- GraphQL authorization latency p95 < 150ms
- Liveness check latency p95 < 2 seconds
- Queue processing throughput: >1000 messages/second during peaks
- DynamoDB throttle rate < 1% of requests
