# Purpose - Registration Workers

## What This Does

Registration Workers is a serverless AWS Lambda-based microservices platform that manages the complete lifecycle of VerifiedFan event registrations, from eligibility validation and entry submission through winner selection and fan notification. It ensures eventual consistency across multiple data stores, publishes analytics data to Kafka, and orchestrates reminder notifications for presale events.

## Business Context

**Problem Solved**: Live event promoters need to manage high-demand ticket sales fairly and efficiently. The traditional "first-come, first-served" approach creates website crashes, scalper opportunities, and poor fan experiences. VerifiedFan registrations solve this by:

1. **Pre-qualifying fans** - Validating eligibility before presale access
2. **Fair selection** - Running lottery-based selection processes for oversubscribed events
3. **Access control** - Assigning unique access codes to selected fans
4. **Fan engagement** - Notifying winners before presale starts

**Business Value**: Enables promoters to sell tickets to verified, eligible fans while maintaining system reliability during high-traffic presales. Supports campaigns with invite-only gates, identity verification requirements, and linked campaign transfers.

## Target Users/Consumers

**Primary Users**:
- **Fans** - Submit registrations, receive eligibility decisions, get presale notifications
- **Campaign Managers** - Configure campaign rules, monitor registration stats, trigger selection processes
- **Presale Systems** - Consume registration data to control ticket access

**System Consumers**:
- **Campaign Service** - Provides campaign configuration, market definitions
- **Entry Service** - Stores normalized registration entries (MongoDB)
- **User Service** - Stores fan profile data
- **Code Service** - Manages access code pools and assignment
- **Exports Service** - Generates email reminder files for CRM distribution
- **Analytics Systems** - Consume Kafka events for reporting

## Key Business Capabilities

### Registration Management
- **Eligibility validation** - Real-time checks against campaign rules, invite lists, identity verification gates
- **Entry normalization** - Validates and normalizes registration data (phone numbers, postal codes, market selections)
- **Duplicate prevention** - Deduplicates entries by user identity across campaign submissions

### Data Replication & Consistency
- **Eventual consistency** - Replicates entries from DynamoDB (`demand-table`) to Entry Service (MongoDB)
- **Change validation** - Compares stream events against current state to prevent race conditions
- **Score refresh** - Retries failed score calculations for fan prioritization

### Winner Selection
- **Market-based selection** - Processes selections per geographic market with configurable selection ratios
- **Code reservation** - Reserves access codes from Code Service before assignment
- **Verdict tracking** - Updates winner/loser verdicts in DynamoDB and Entry Service
- **Stats reporting** - Tracks processing status (PROCESSING → FINISHED/FAILED) with eligible/selected counts

### Analytics Pipeline
- **Multi-entity publishing** - Publishes CAMPAIGN, EVENT_MAPPING, MARKET, REGISTERED_MARKET, REGISTRATION data to Kafka
- **Schema validation** - Validates all Kafka messages against JSON schemas before publishing
- **Fan-out architecture** - Routes data through SNS → SQS → Kafka for reliability

### Fan Notifications
- **Reminder scheduling** - Plans SMS notification timing based on presale volume (targets 1 hour before presale)
- **Localized messages** - Generates region-specific reminder text with presale details
- **Email reminders** - Triggers Exports Service to generate email files for CRM distribution

## Business Requirements & Constraints

**Eligibility Requirements**:
- REQ-001: Campaign must have status `ACTIVE` or `TRANSFERRING` to accept registrations
- REQ-002: Invite-only campaigns require fan to be on invite list (by email, globalUserId, or memberId)
- REQ-003: Identity verification (IDV) gates require fan to complete verification process
- REQ-004: Linked campaign gates allow transfer from prerequisite campaign registration

**Data Consistency Requirements**:
- REQ-005: All registration changes must replicate to Entry Service within retry window (3 attempts)
- REQ-006: Replication must validate against current `demand-table` state to prevent stale updates
- REQ-007: Failed replications must not unflag `needsReplication` indicator

**Selection Requirements**:
- REQ-008: Selection must reserve sufficient codes before assignment (minimum 500 for non-TM ticketers)
- REQ-009: Code assignments must be atomic - either all codes assigned or none
- REQ-010: Selection must process markets in Step Function workflow with failure isolation

**Notification Requirements**:
- REQ-011: Notifications must send 1 hour before presale (±30 minutes for high volume)
- REQ-012: Only send to fans with confirmed US phone numbers (+1) and assigned codes
- REQ-013: Email reminders trigger day before presale
- REQ-014: Prevent duplicate notifications via `date.notified` flag

**Performance Requirements**:
- REQ-015: Support batch processing up to 25,000 entries per worker invocation
- REQ-016: Process DynamoDB streams with eventual consistency (no immediate read-after-write guarantee)
- REQ-017: Kafka publishing must validate schemas without blocking replication pipeline

## Core Business Rules

**Eligibility Rules**:
- Campaign status determines registration acceptance: `ACTIVE` allows new entries, `TRANSFERRING` allows linked transfers, `CLOSED` rejects new registrations
- Entry fields must match campaign field requirements (postal code format, phone number format, required vs optional)
- Market selections must reference valid markets within the campaign

**Replication Rules**:
- Only replicate records marked `needsReplication: true` or with operation type INSERT/MODIFY
- Skip replication for records modified by system (non-fan modifications)
- Validate operation against current state: if record changed since stream event, reject replication
- Retry failed operations 3 times before marking as permanent failure

**Selection Rules**:
- Select winners based on score (fan priority) and market selection
- Reserve codes per market before assigning to fans
- Shared codes (TM ticketer) use single code for all selected fans in market
- Non-TM ticketers require unique codes per fan
- Failed selections must report stats with `FAILED` status

**Notification Rules**:
- Calculate notification time based on eligible fan count: high volume markets start earlier to complete sends by presale
- Only notify fans with `verdict: true` (selected winner) and valid phone number
- Mark markets as notified after successful generation to prevent duplicate sends
- Unset notification time for markets past presale window (cleanup mechanism)

**Data Pipeline Rules**:
- Validate record type matches expected schema before processing
- Reject records with empty data payloads
- Publish to Kafka only after schema validation passes
- Use deduplication identifiers to prevent duplicate Kafka messages

## Integration Points

### Outbound (Events/Data We Publish)

| Trigger | Event/Action | Recipient | When | Format |
|---------|-------------|-----------|------|--------|
| Registration created/updated | Replicate entry | Entry Service (MongoDB) | Immediately via DynamoDB stream → SQS | HTTP POST `/campaignId/entries` |
| Campaign data change | Publish CAMPAIGN event | Kafka `campaign` topic | After validation | JSON schema-validated |
| Market registered | Publish REGISTERED_MARKET event | Kafka `registered-market` topic | After validation | JSON schema-validated |
| Registration submitted | Publish REGISTRATION event | Kafka `registration` topic | After validation | JSON schema-validated |
| Winner selected | Assign codes | Entry Service | Via SQS `saveSelectionQueue` | HTTP POST `/campaignId/entries/codes` |
| Winner selected | Mark codes assigned | Code Service | Via DynamoDB stream | HTTP POST `/campaignId/assign` |
| Winner selected | Update verdict | DynamoDB `demand-table` | Via SQS batch write | DynamoDB PutItem |
| Notification scheduled | Generate reminders | DynamoDB `demand-table` | Step Function invocation | DynamoDB PutItem (notification record) |
| Email reminder due | Trigger export | Exports Service | EventBridge schedule (15 min) | HTTP POST `/exports` |

### Inbound (Events We Consume)

| Source | Event | Action | Timing | Details |
|--------|-------|--------|--------|---------|
| DynamoDB `demand-table` stream | INSERT/MODIFY/REMOVE | Enqueue for replication | Real-time stream | `enqueueEntries` worker filters by `needsReplication` |
| SQS `saveEntriesQueue` | Entry change record | Replicate to Entry Service | Batch processing | `saveEntries` validates and replicates |
| SQS `retryScoresQueue` | Score refresh request | Refresh user scores | Batch processing | `retryScore` calls Entry Service |
| Step Function | Selection request | Process market selection | Orchestrated workflow | `enqueueMarketSelections` reserves codes and queues assignments |
| SQS `saveSelectionQueue` | Code assignment | Assign codes and update verdicts | Batch processing | `saveSelections` updates DynamoDB and Entry Service |
| SQS `refreshSelectionQueue` | Refresh selection | Re-process existing selections | Batch processing | `refreshSelections` fetches scoring records and re-queues |
| DynamoDB `demand-table` stream | MODIFY with new codes | Mark codes assigned | Real-time stream | `markAssignedCodes` notifies Code Service |
| SQS `dataQueue` | Data pipeline record | Format and fan-out | Batch processing | `processData` validates type and publishes to SNS |
| SQS (per data type) | Typed data record | Validate and publish to Kafka | Batch processing | `sendData` validates schema and publishes |
| EventBridge schedule | Daily midnight PT | Plan notification sends | Scheduled daily | `planSends` calculates notification times |
| Step Function | Every 5 minutes | Get markets to notify | Scheduled polling | `getMarketsToNotify` queries MongoDB |
| Step Function | Per market | Generate notifications | Orchestrated per market | `notificationGenerator` writes notification records |
| EventBridge schedule | Every 15 minutes | Trigger email reminders | Scheduled polling | `triggerReminderEmail` triggers Exports Service |
| AppSync | GraphQL mutation | Check eligibility | Synchronous request | `checkEligibility` validates campaign and gate |
| SQS `userInfoQueue` | User info batch | Upsert user profiles | Batch processing | `upsertUsers` calls User Service |

### Service Dependencies

**Required Services** (system cannot function without):
- **Campaign Service** - Campaign configuration, market definitions, event details
- **Entry Service** - Registration entry storage (MongoDB), scoring records, stats reporting
- **DynamoDB `demand-table`** - Primary registration data store, source of truth for entries
- **Redis** - Campaign caching layer for fast eligibility checks

**Selection Dependencies** (required for winner selection):
- **Code Service** - Access code pools, reservation, assignment tracking

**Notification Dependencies** (required for reminders):
- **MongoDB** - Campaign/market queries for notification scheduling
- **Exports Service** - Email reminder file generation

**Analytics Dependencies** (required for reporting):
- **Kafka** - Event streaming for analytics consumers
- **SNS/SQS** - Message routing and fan-out for data pipeline

**User Management Dependencies** (optional for enhanced functionality):
- **User Service** - Fan profile storage, enrichment data

## Success Metrics

**Registration Processing**:
- Entry replication success rate > 99.9% (3 retry attempts)
- Eligibility check response time < 500ms (p95)
- Campaign cache hit rate > 95% (Redis)

**Selection Processing**:
- Selection completion rate 100% (with retry on failure)
- Code reservation success rate 100% (pre-validation ensures sufficient pool)
- Verdict update latency < 30 seconds (from selection to DynamoDB write)

**Data Pipeline**:
- Kafka publishing success rate > 99.5%
- Schema validation pass rate 100% (rejects invalid records)
- End-to-end latency < 5 minutes (entry change → Kafka message)

**Notification Delivery**:
- Notification generation success rate > 99%
- SMS send timing accuracy within ±15 minutes of target (1 hour before presale)
- Email reminder trigger rate 100% (for eligible campaigns)

**Data Consistency**:
- Entry Service synchronization lag < 30 seconds (p99)
- DynamoDB → MongoDB consistency 100% (eventual with retry)
- Change validation rejection rate < 1% (race condition detection)
