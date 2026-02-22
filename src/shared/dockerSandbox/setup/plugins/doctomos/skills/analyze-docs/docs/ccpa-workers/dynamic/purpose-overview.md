# Purpose - ccpa-workers

## What This Does

The CCPA Workers repository processes California Consumer Privacy Act (CCPA) privacy requests from fans, handling data access, deletion, opt-out, and disclosure compliance through serverless Lambda functions that communicate with Ticketmaster's Privacy Core platform.

## Business Context

This system exists to ensure Ticketmaster's Verified Fan platform complies with CCPA regulations requiring businesses to respond to consumer privacy requests within legally mandated timeframes. It automates the processing of fan data requests that would otherwise require manual intervention across multiple databases and systems. The system acts as the bridge between Ticketmaster's Privacy Core platform (which receives consumer requests) and Verified Fan's user databases, campaign systems, and verification tables.

## Target Users/Consumers

**Primary Consumers:**
- **Privacy Core Platform**: Ticketmaster's centralized privacy request management system that sends privacy requests to this service
- **Verified Fan Database Systems**: User service, entries service, DynamoDB tables, and MongoDB collections that store fan data

**Indirect Beneficiaries:**
- **Fans/Consumers**: Individuals exercising their CCPA rights to access, delete, or control use of their personal information
- **Legal/Compliance Teams**: Teams responsible for meeting CCPA compliance deadlines and maintaining audit trails
- **Customer Support**: Teams handling escalated privacy requests

## Key Business Capabilities

- **Privacy Request Processing**: Automatically receives and routes CCPA privacy requests (GET_INFO, ERASE, DO_NOT_SELL, UNSUBSCRIBE) from Privacy Core to appropriate handlers
- **Personal Data Access**: Retrieves and formats all PII (Personally Identifiable Information) associated with a fan across verification entries, campaigns, and user records
- **Right to Erasure**: Deletes fan data across distributed systems including user databases, DynamoDB verification/demand tables, MongoDB fanscore records, and identity records
- **Marketing Opt-Out Management**: Processes "Do Not Sell" requests by updating fan preferences to prevent marketing communications (VF notifications, LiveNation emails, third-party marketing)
- **Data Disclosure Tracking**: Records and publishes disclosure events when fan PII is shared with third parties (campaign contacts, artists)
- **Compliance Reporting**: Publishes status updates, PII data, and completion confirmations back to Privacy Core for audit trails

## Business Requirements & Constraints

**CCPA Compliance Requirements:**
- REQ-001: Privacy requests must be acknowledged and processed within CCPA-mandated timeframes
- REQ-002: System must provide verifiable audit trail of all privacy request handling to Privacy Core
- REQ-003: All PII types defined by CCPA must be identifiable and retrievable (NAME, EMAIL, PHONE, ADDRESS, IP_ADDRESS, etc.)
- REQ-004: Fan deletions must cascade across all Verified Fan systems (user service, DynamoDB, MongoDB, fanscore, identity)
- REQ-005: Opt-out requests must prevent future marketing communications while preserving transactional communication capabilities

**Technical Constraints:**
- CONST-001: Must authenticate with Privacy Core using mutual TLS certificates that expire regularly (requires cert rotation workflow)
- CONST-002: All communications with Privacy Core occur via Kafka topics with Avro schema validation
- CONST-003: Lambda functions operate in VPC with limited execution time (configured timeout)
- CONST-004: Fan identification may use multiple identifiers (memberId, globalUserId, userId, email) requiring cross-system lookups
- CONST-005: Must handle fans who exist in Account Fanscore DB but not in main User service

**Data Processing Constraints:**
- CONST-006: Disclosure processing for bulk campaigns requires streaming CSV files (batches of 5000 rows) to avoid memory limits
- CONST-007: User ID lookups for email batches limited to 200 emails at a time
- CONST-008: System must handle missing data gracefully (fan not found, partial data availability)

## Core Business Rules

**Request Routing Rules:**
- GET_INFO requests → fanInfoQueue → Retrieve all PII and send to Privacy Core
- ERASE requests → deleteFanQueue → Delete fan from all systems and confirm to Privacy Core
- DO_NOT_SELL requests → keepPrivateQueue → Opt out of marketing emails (allow_marketing = false)
- UNSUBSCRIBE requests → optOutQueue → Opt out of VF notifications AND LiveNation emails (allow_notification = false, allow_livenation = false)
- ERASE_PREFLIGHT_CHECK → Immediate response with "READY" status (no actual processing)

**Fan Identity Resolution:**
- Priority 1: Look up fan by any identifier (email, memberId, globalUserId) in Ticketmaster User Service
- Priority 2: If not found in User Service, search Account Fanscore DynamoDB table
- Priority 3: If still not found, send minimal user data (email or memberId/globalUserId only) to processing queue
- Rule: Email identifiers are detected by pattern and handled separately from member IDs

**Data Deletion Cascade:**
- Fan deletion must remove records from:
  1. DynamoDB verification table (by memberId, globalUserId, email)
  2. Account Fanscore MongoDB (flag records by memberId)
  3. Identity records DynamoDB (flag by globalUserId)
  4. User Service database (delete by userId) - includes registration data
  5. Demand DynamoDB table (remove by fanId/globalUserId)

**PII Handling:**
- All PII must be categorized using CCPA-defined types (NAME, EMAIL, PHONE, ADDRESS, IP_ADDRESS, UNIQUE_IDENTIFIER, etc.)
- Fan info responses must return structured PII data with type classifications
- Disclosure records must identify all PII types present in shared data

**Error Handling:**
- Any processing failure must publish error response to Privacy Core with requestType: "FAILED"
- Privacy Core must receive completion status for every request (success or failure)
- Failed deletions should not leave partial data (though current implementation may not be fully transactional)

**Disclosure Rules:**
- Disclosures recorded when fan data shared with third-party contacts (artists, campaign targets)
- Disclosure ID format: `{idType}-{tmId}-{source}-{target}` (e.g., "MEMBER_ID-12345-VF-artist@email.com")
- Disclosure type: "DISCLOSED" with justification: "MARKETING"
- Source is always "VF" (Verified Fan product code)

**Preflight Check:**
- ERASE_PREFLIGHT_CHECK requests require immediate "READY" response without performing deletion
- Allows Privacy Core to verify system availability before scheduling actual deletion

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Privacy request processed successfully | Publish privacy response (status: COMPLETED) | Privacy Core Kafka topic | Immediately after completing GET_INFO, ERASE, DO_NOT_SELL, UNSUBSCRIBE |
| Privacy request processing failed | Publish privacy response (status: FAILED) | Privacy Core Kafka topic | Immediately upon catching any error |
| Fan info retrieved | Publish PII data with privacy response | Privacy Core Kafka topic | After collecting all user entries |
| Preflight check received | Publish preflight response (status: READY) | Privacy Core Kafka topic | Immediately (no processing) |
| Disclosure data collected from campaign | Publish disclosure records | Privacy Core disclosure Kafka topic | In batches during CSV processing |
| Data dictionary updated | Publish complete data dictionary | Privacy Core dictionary Kafka topic | When third-party contacts list changes |
| User deletion requested | DELETE /users/{userId} | Ticketmaster User Service | During fan deletion process |
| Opt-out requested | POST /users/{userId}/optout | Entries Service | During DO_NOT_SELL or UNSUBSCRIBE |
| Fan deletion completed | Queue messages to downstream workers | SQS queues (fanInfoQueue, deleteFanQueue, etc.) | After routing in processRequest |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Privacy Core | Privacy request event (via SQS) | Route to appropriate worker (processRequest) | Real-time (Lambda triggered by SQS) |
| Privacy Core | GET_INFO request | Fetch user entries and return PII | Within Lambda timeout (configured) |
| Privacy Core | ERASE request | Delete fan from all systems | Within Lambda timeout |
| Privacy Core | DO_NOT_SELL request | Opt out of marketing (allow_marketing) | Within Lambda timeout |
| Privacy Core | UNSUBSCRIBE request | Opt out of VF + LN notifications | Within Lambda timeout |
| Privacy Core | ERASE_PREFLIGHT_CHECK | Return READY status immediately | Within seconds |
| Export Service S3 Bucket | Campaign disclosure file uploaded | Process CSV and publish disclosures | Streaming (batched processing) |
| Scheduled trigger | Manual invocation | Update data dictionary with third-party contacts | On-demand or scheduled |

### Service Dependencies

**Required Services (system will fail without these):**
- **Privacy Core Kafka**: All privacy responses and disclosure data published here; system cannot fulfill CCPA obligations without it
- **Ticketmaster User Service**: Primary source for fan identity resolution and deletion; required for DELETE operations
- **Entries Service**: Required for fetching fan PII (GET_INFO) and opt-out management (DO_NOT_SELL, UNSUBSCRIBE)
- **AWS DynamoDB**: Stores verification table, demand table, account fanscore, identity records; required for ERASE operations
- **AWS Secrets Manager**: Stores Kafka TLS certificates; required for all Privacy Core communication
- **AWS SQS**: Queues route privacy requests to worker Lambdas; required for request processing

**Optional/Mock Services:**
- **Campaigns Service**: Used for fetching third-party contact emails (currently mocked with hardcoded data)
- **MongoDB**: Used for campaign-related queries (currently operational but campaigns service is mocked)

**External Dependencies:**
- **Kafka Certificate Authority**: Issues TLS certs that must be rotated before 30-day expiration warning
- **VPC Networking**: Lambda functions require VPC access to reach internal services
- **S3 Export Bucket**: Stores campaign disclosure CSV files for batch processing

## Success Metrics

**CCPA Compliance Metrics:**
- Privacy request processing success rate: > 99% (failures require manual escalation)
- Privacy Core response delivery rate: 100% (every request must receive success/failure response)
- Request processing time: < Lambda timeout threshold (currently configured timeout value)

**Data Integrity Metrics:**
- Fan deletion completeness: 100% (all systems must be updated in ERASE operations)
- PII data accuracy: 100% (all PII returned in GET_INFO must be complete and accurate)
- Opt-out enforcement: 100% (fans opted out must not receive marketing communications)

**System Health Metrics:**
- Certificate expiration monitoring: Alert 30 days before expiration (automated via scheduled GitLab job)
- Lambda execution success rate: > 99%
- Queue processing lag: < 5 minutes (privacy requests should not accumulate in queues)
- Kafka message delivery success rate: 100% (all messages to Privacy Core must be acknowledged)

**Operational Metrics:**
- Disclosure batch processing throughput: 5000 rows per batch without memory errors
- User ID lookup batch size: 200 emails per request (to avoid service rate limits)
- Request routing accuracy: 100% (correct queue for each privacy request type)
