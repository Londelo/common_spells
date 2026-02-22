# Domain Concepts - ccpa-workers

## Core Entities

| Entity | Description |
|--------|-------------|
| **Privacy Request** | A CCPA compliance request from Privacy Core containing fan identity, request type (GET_INFO, ERASE, DO_NOT_SELL, UNSUBSCRIBE), privacy request ID, and timestamp. The central entity that triggers all processing workflows. |
| **Fan Identity** | A composite identifier for a Verified Fan user, potentially including: userId (Ticketmaster User Service ID), memberId (Verified Fan member ID), globalUserId (cross-system global identifier), and email. Different systems may know the fan by different identifiers. |
| **PII (Personally Identifiable Information)** | Any data classified under CCPA-defined categories: NAME, EMAIL, PHONE, ADDRESS, IP_ADDRESS, UNIQUE_IDENTIFIER, BIOMETRIC_DATA, BROWSING_HISTORY, GEOLOCATION_DATA, etc. The protected data subject to privacy rights. |
| **User Entry** | A record of a fan's participation in a campaign or interaction with Verified Fan system. Contains PII fields and campaign association. Retrieved from Entries Service. Multiple entries exist per fan (one per campaign participation). |
| **Disclosure Record** | An audit record documenting when fan PII was shared with a third party. Contains fan identity, target recipient, PII types shared, timestamp, justification (MARKETING), source (VF), and disclosure type (DISCLOSED). |
| **Privacy Response** | The result message published to Privacy Core after processing a privacy request. Contains application identifier (VF), privacy request ID, request status (COMPLETED/FAILED), timestamp, optional PII data, optional error details, and optional preflight check status. |
| **Third-Party Contact** | An external entity (artist, management team, campaign partner) who receives fan PII for marketing purposes. Identified by email address and ID. Tracked in data dictionary and disclosure records. |
| **Data Dictionary** | A metadata document published to Privacy Core describing what PII types Verified Fan collects, third-party contacts who may receive data, and the endpoint to deliver privacy requests. Updated when third-party contact list changes. |
| **Worker Lambda** | A serverless function dedicated to processing one type of privacy request: processRequest (routing), fanInfo (data access), deleteFan (erasure), keepPrivate (do-not-sell), optOut (unsubscribe), saveDisclosures (disclosure tracking), updateDictionary (metadata updates). |
| **Verification Record** | A DynamoDB record tracking fan's verification status for campaigns. Stored in verificationTable. Contains memberId, globalUserId, email. Deleted during ERASE operations. |
| **Demand Record** | A DynamoDB record tracking fan's demand/interest in tickets. Stored in demandTable. Contains fanId (globalUserId). Deleted during ERASE operations. |
| **Fanscore Record** | A MongoDB record tracking fan engagement scoring for account-level analytics. Stored in Account Fanscore collection. Contains memberId. Flagged (not deleted) during ERASE for audit purposes. |
| **Identity Record** | A DynamoDB record linking different fan identifiers across systems. Stored in identity table. Contains globalUserId. Flagged (not deleted) during ERASE for audit purposes. |
| **Certificate** | TLS certificate used for mutual authentication with Privacy Core Kafka. Consists of cert, key, and CA chain. Stored in AWS Secrets Manager. Must be rotated before expiration (~30-day warning threshold). |

---

## Business Rules

### Privacy Request Processing Rules

- **BRule-001**: Every privacy request received from Privacy Core MUST receive exactly one response (COMPLETED or FAILED) published back to Privacy Core, regardless of processing outcome
- **BRule-002**: Privacy request routing is determined by requestType field: GET_INFO → fanInfoQueue, ERASE → deleteFanQueue, DO_NOT_SELL → keepPrivateQueue, UNSUBSCRIBE → optOutQueue, ERASE_PREFLIGHT_CHECK → immediate response (no queue)
- **BRule-003**: If fan cannot be found in User Service, system MUST search Account Fanscore DynamoDB table as fallback
- **BRule-004**: If fan cannot be found in any system, process request with minimal data (email or memberId only) and send COMPLETED response with empty results (not a failure condition)
- **BRule-005**: ERASE_PREFLIGHT_CHECK requests MUST return immediate "READY" status without performing any data access or validation

### Fan Identity Resolution Rules

- **BRule-006**: Email addresses are detected by pattern (contains '@' and domain) and treated differently from numeric/alphanumeric member IDs
- **BRule-007**: Fan identity resolution priority: (1) Ticketmaster User Service, (2) Account Fanscore DynamoDB, (3) Minimal data fallback
- **BRule-008**: If fan has multiple records in Account Fanscore (e.g., duplicate entries), each record MUST be queued separately for processing
- **BRule-009**: All fan identifiers (userId, memberId, globalUserId, email) MUST be passed to worker Lambdas when available to ensure complete data operations

### Data Deletion Rules

- **BRule-010**: Fan deletion MUST cascade across all systems in sequence: verification table → fanscore (flag) → identity (flag) → user service (delete) → demand table
- **BRule-011**: Fanscore records MUST be flagged (not deleted) to preserve audit trail
- **BRule-012**: Identity records MUST be flagged (not deleted) to preserve audit trail
- **BRule-013**: Verification table records MUST be completely deleted (no audit retention)
- **BRule-014**: User Service deletion only occurs if userId is present; absence of userId is not an error
- **BRule-015**: Demand table records MUST be deleted based on fanId matching globalUserId
- **BRule-016**: If any step in deletion cascade fails, publish FAILED response immediately (no partial success reporting)

### PII Handling Rules

- **BRule-017**: All PII extracted from user entries MUST be categorized using CCPA-defined PII types (NAME, EMAIL, PHONE, ADDRESS, IP_ADDRESS, etc.)
- **BRule-018**: GET_INFO responses MUST include both entry count and breakdown of PII types: `{ entries: <count>, piiTypes: { NAME: <count>, EMAIL: <count>, ... } }`
- **BRule-019**: Unknown PII fields SHOULD be categorized as "OTHER" rather than omitted
- **BRule-020**: PII data sent to Privacy Core MUST follow Avro schema defined in privacyRequestStatus.json

### Opt-Out Rules

- **BRule-021**: DO_NOT_SELL requests affect only `allow_marketing` field (single opt-out)
- **BRule-022**: UNSUBSCRIBE requests affect BOTH `allow_notification` (VF) AND `allow_livenation` (LN) fields (dual opt-out)
- **BRule-023**: Opt-out operations MUST apply to ALL user entries, not selectively
- **BRule-024**: If user has no entries (userId not found), opt-out completes successfully with null counts (not a failure)

### Disclosure Tracking Rules

- **BRule-025**: Disclosure records MUST be created for every combination of fan and third-party contact in campaign
- **BRule-026**: Disclosure ID format: `{idType}-{tmId}-{source}-{target}` where idType="MEMBER_ID", source=product code (VF), target=third-party email
- **BRule-027**: Disclosure type MUST be "DISCLOSED" with justification "MARKETING"
- **BRule-028**: PII types in disclosure record derived from CSV column headers: "first name"/"last name"/"name" → NAME, "email"/"fanclub email" → EMAIL, "mobile phone"/"phone" → PHONE, "zip code" → ADDRESS, "ip address"/"ip" → IP_ADDRESS
- **BRule-029**: Disclosure CSV processing MUST use streaming (not load full file into memory) with batch size 5000 rows
- **BRule-030**: User ID lookups for disclosure processing MUST batch emails into groups of 200 to avoid rate limits

### Kafka Communication Rules

- **BRule-031**: All messages to Privacy Core Kafka MUST use Avro schema serialization with Content-Type: application/vnd.kafka.avro.v2+json
- **BRule-032**: Privacy responses published to `privacyRequestUpdateKakfaTopic` (configured in config)
- **BRule-033**: Disclosure data published to `disclosureDataKafkaTopic` (configured in config)
- **BRule-034**: Data dictionary published to `dataDictionaryKafkaTopic` (configured in config)
- **BRule-035**: All Kafka requests MUST use mutual TLS authentication with cert, key, and CA from Secrets Manager
- **BRule-036**: Kafka certificate MUST be fetched fresh for each request (no caching) to support hot cert rotation
- **BRule-037**: All Kafka messages MUST include key schema and value schema in request body

### Certificate Management Rules

- **BRule-038**: Kafka certificates MUST be rotated before 30-day expiration warning threshold
- **BRule-039**: Certificate expiration check MUST run daily via scheduled GitLab job on `alert-cert-expiry` branch
- **BRule-040**: Certificate generation MUST use techops credentials for certificate authority access
- **BRule-041**: New certificates MUST be committed to git and deployed via CI/CD (no manual Lambda updates)
- **BRule-042**: `alert-cert-expiry` branch MUST be rebased with main after cert updates to ensure monitoring uses latest certs

### Error Handling Rules

- **BRule-043**: Any unhandled exception in worker Lambda MUST trigger FAILED response to Privacy Core with error type "OTHER" and message "Cannot complete request. Internal error"
- **BRule-044**: Service unavailability (User Service, Entries Service, DynamoDB, MongoDB) MUST result in FAILED response (not retry within Lambda)
- **BRule-045**: Kafka publish failures MUST be logged with full context (privacy request ID, error details) but MUST still throw exception to trigger Lambda failure
- **BRule-046**: Partial disclosure batch failures (some rows fail user lookup) MUST log error but continue processing remaining batches

### Data Dictionary Rules

- **BRule-047**: Data dictionary MUST include complete list of third-party contacts who may receive fan PII
- **BRule-048**: Data dictionary MUST specify endpoint for Privacy Core to deliver privacy requests: `{uploadsServiceUrl}/trigger/ccpa`
- **BRule-049**: Data dictionary updates MUST merge base dictionary structure with dynamic third-party contact list
- **BRule-050**: Product code (VF) MUST be included in all data dictionary publications

---

## Terminology

| Term | Definition |
|------|------------|
| **CCPA** | California Consumer Privacy Act - California state law giving consumers rights to access, delete, and control use of their personal information. Ticketmaster must comply for California residents. |
| **Privacy Core** | Ticketmaster's centralized privacy request management platform. Receives consumer privacy requests from web portal/API and distributes to product teams (like Verified Fan) for processing. Aggregates responses for audit and reporting. |
| **Privacy Request** | A formal request from a consumer exercising CCPA rights. Contains request type (GET_INFO, ERASE, DO_NOT_SELL, UNSUBSCRIBE), fan identity, privacy request ID (UUID), and timestamp. |
| **Privacy Request ID** | Unique identifier (UUID) assigned by Privacy Core to track a specific privacy request throughout its lifecycle. Used for audit trail and correlation across systems. |
| **Request Type** | The CCPA right being exercised: GET_INFO (Right to Know), ERASE (Right to Deletion), DO_NOT_SELL (Right to Opt-Out of Sale), UNSUBSCRIBE (Right to Opt-Out of Communications), ERASE_PREFLIGHT_CHECK (System Availability Check). |
| **Fan** | A Ticketmaster/Verified Fan user who participates in presale campaigns for concert tickets. The data subject in CCPA privacy requests. |
| **Member ID** | Verified Fan's internal identifier for a fan account. Format: "VF-{number}". Used across VF systems (verification, fanscore, campaigns). |
| **Global User ID** | Cross-platform identifier linking fan across Ticketmaster properties (Verified Fan, Ticketmaster.com, LiveNation). Used for demand records and identity linking. |
| **User ID** | Ticketmaster User Service's internal identifier. Required for user service operations (deletion, entry retrieval, opt-out). Numeric or UUID format. |
| **PII (Personally Identifiable Information)** | Data that can identify a specific individual. CCPA defines 27+ categories including NAME, EMAIL, PHONE, ADDRESS, IP_ADDRESS, BIOMETRIC_DATA, BROWSING_HISTORY, GEOLOCATION_DATA, etc. |
| **Entry** | A record of fan's registration/participation in a Verified Fan campaign. Contains PII, campaign ID, registration timestamp, preferences. One fan may have entries across multiple campaigns. |
| **Verification Table** | DynamoDB table storing fan verification status for campaign presales. Keys: memberId, globalUserId, email. Used to validate fan eligibility during ticket sale windows. |
| **Demand Table** | DynamoDB table tracking fan interest/demand for specific events. Used for analytics and campaign targeting. Keys: fanId (globalUserId), eventId. |
| **Account Fanscore** | MongoDB collection storing fan engagement scores at account level. Used for VIP identification and targeting. Indexed by memberId. |
| **Identity Table** | DynamoDB table linking different fan identifiers (memberId, globalUserId, email, userId) across systems. Enables cross-system fan lookups. |
| **Disclosure** | A CCPA-required audit record documenting when fan PII was shared with a third party. Must include: who (fan identity), what (PII types), when (timestamp), why (justification), to whom (target). |
| **Third-Party Contact** | An external entity who receives fan PII for marketing purposes. Examples: artist management teams, record labels, tour promoters. Must be tracked in data dictionary and disclosures. |
| **Data Dictionary** | Metadata document describing what PII Verified Fan collects, third-party contacts who may receive it, and system integration details. Published to Privacy Core for regulatory reporting. |
| **Preflight Check** | A system health verification before executing a destructive operation (ERASE). Privacy Core sends ERASE_PREFLIGHT_CHECK to confirm system can accept deletion request before committing to consumer timeline. |
| **Worker Lambda** | A serverless AWS Lambda function dedicated to one privacy processing task. Triggered by SQS queue messages. Examples: processRequest, fanInfo, deleteFan, keepPrivate, optOut. |
| **SQS Queue** | AWS Simple Queue Service - message queue for asynchronous Lambda invocation. One queue per worker type: fanInfoQueue, deleteFanQueue, keepPrivateQueue, optOutQueue. |
| **Kafka Topic** | Apache Kafka message topic for publishing data to Privacy Core. Three topics: privacyRequestUpdate (responses), disclosureData (audit records), dataDictionary (metadata). |
| **Avro Schema** | Apache Avro data serialization format. Privacy Core requires Avro-encoded messages with key schema and value schema. Schemas defined in JSON files: key.json, privacyRequestStatus.json, disclosureData.json, dataDictionary.json. |
| **Mutual TLS** | Two-way TLS authentication where both client (CCPA Workers) and server (Privacy Core Kafka) verify each other's certificates. Requires cert, key, and CA chain. |
| **Certificate Rotation** | Process of replacing TLS certificates before expiration. CCPA Workers certs must be regenerated from certificate authority and deployed via CI/CD every ~365 days. |
| **Allow Marketing** | Fan preference field controlling whether fan data can be shared with third parties for marketing purposes. Set to false during DO_NOT_SELL opt-out. |
| **Allow Notification** | Fan preference field controlling whether fan receives Verified Fan campaign notifications. Set to false during UNSUBSCRIBE opt-out. |
| **Allow LiveNation** | Fan preference field controlling whether fan receives LiveNation marketing emails. Set to false during UNSUBSCRIBE opt-out. |
| **Opt-Out** | User action to stop receiving communications or prevent data sharing. CCPA provides Right to Opt-Out of Sale (DO_NOT_SELL) and general unsubscribe (UNSUBSCRIBE). |
| **Deletion Cascade** | Process of deleting or flagging fan data across multiple systems in sequence. CCPA Workers must cascade deletions to: verification table, fanscore, identity, user service, demand table. |
| **Product Code** | Identifier for Verified Fan product in Ticketmaster ecosystem. Value: "VF". Used in Kafka messages, disclosure records, and Privacy Core routing. |
| **Request Event** | The original privacy request payload from Privacy Core. Passed through processing pipeline and included in final response for correlation. |
| **Petition** | Cryptographic challenge used in worker authentication. Worker must sign petition with private key to prove identity to User Service. |
| **JWT (JSON Web Token)** | Authentication token issued by User Service after successful worker authentication. Included in Authorization header for all service-to-service requests. |
| **S3 Export Bucket** | AWS S3 bucket storing campaign CSV files for disclosure processing. Lambda triggered when new file uploaded. |
| **Campaign** | A Verified Fan presale event where fans register for ticket access. Campaign has associated third-party contacts who receive fan PII. Identified by campaignId. |
| **Batch Processing** | Technique for handling large datasets in chunks to avoid memory limits. CCPA Workers uses batching for: CSV rows (5000), email lookups (200), disclosure publishing. |
| **Streaming** | Data processing technique where data is read incrementally (not loaded fully into memory). CCPA Workers streams CSV files to handle large campaign datasets. |

---

## Data Models

### Privacy Request Event Structure

```json
{
  "privacyRequestId": "uuid-string",
  "requestTimestamp": 1234567890000,
  "requestType": "GET_INFO | ERASE | DO_NOT_SELL | UNSUBSCRIBE | ERASE_PREFLIGHT_CHECK",
  "fanIdentity": {
    "id": "email@example.com OR memberId",
    "idType": "MEMBER_ID | EMAIL",
    "property": null,
    "encryptedProfile": null
  }
}
```

**Relationships:**
- Privacy Request → Fan Identity (one-to-one)
- Privacy Request → Request Type (enumeration)

---

### Fan Identity Resolution Model

```javascript
{
  userId: "12345",           // Ticketmaster User Service ID (optional)
  memberId: "VF-67890",      // Verified Fan member ID (optional)
  globalUserId: "GLB-12345", // Cross-system global identifier (optional)
  email: "fan@example.com"   // Email address (optional)
}
```

**Relationships:**
- Fan Identity → User Service (userId lookup)
- Fan Identity → Account Fanscore (memberId lookup)
- Fan Identity → Verification Table (memberId, globalUserId, email lookups)
- Fan Identity → Identity Table (globalUserId lookup)
- Fan Identity → Demand Table (globalUserId as fanId)

**Business Rules:**
- At least one identifier must be present (email OR memberId)
- userId may be null if fan not in User Service
- All identifiers refer to same physical person

---

### PII Data Model

```json
{
  "array": [
    {
      "type": "NAME | EMAIL | PHONE | ADDRESS | IP_ADDRESS | ...",
      "value": "string | null",
      "metadata": {}
    }
  ]
}
```

**CCPA PII Type Enumeration:**
- NAME, ALIAS, ADDRESS, UNIQUE_IDENTIFIER, IP_ADDRESS, EMAIL, PHONE, ACCOUNT_NAME
- SOCIAL_SECURITY_NUMBER, DRIVERS_LICENSE_NUMBER, PASSPORT_NUMBER
- RACE, ETHNICITY, GENDER
- COMMERCIAL_INFORMATION, RECORDS_OF_PROPERTY, PRODUCTS_PROVIDED, SERVICES_PROVIDED
- PURCHASING_HISTORIES_OR_TENDENCIES, CONSUMING_HISTORIES_OR_TENDENCIES
- BIOMETRIC_DATA, BROWSING_HISTORY, SEARCH_HISTORY, GEOLOCATION_DATA
- AUDIO_INFORMATION, ELECTRONIC_INFORMATION, VISUAL_INFORMATION, THERMAL_INFORMATION, OLFACTORY_INFORMATION
- PROFESSIONAL_OR_EMPLOYMENT_RELATED_INFORMATION, EDUCATION_INFORMATION, OTHER

**Relationships:**
- PII → User Entry (PII extracted from entries)
- PII → Disclosure Record (PII types shared with third parties)
- PII → Privacy Response (PII data returned to Privacy Core)

---

### Privacy Response Model

```json
{
  "application": "VF",
  "privacyRequestId": "uuid-string",
  "requestStatus": "COMPLETED | FAILED",
  "timestamp": 1234567890000,
  "piiData": {
    "array": [ /* PII objects */ ]
  } || null,
  "erasePreflightCheck": {
    "com.tm.privacy.wirefmt.ErasePreflightCheck": {
      "status": "READY",
      "reason": null
    }
  } || null,
  "error": {
    "com.tm.privacy.wirefmt.Error": {
      "errorType": "OTHER",
      "errorMessage": "Cannot complete request. Internal error"
    }
  } || null,
  "partial": null
}
```

**Relationships:**
- Privacy Response → Privacy Request (privacyRequestId correlation)
- Privacy Response → PII Data (optional, only for GET_INFO)
- Privacy Response → Error (optional, only for FAILED status)
- Privacy Response → Preflight Check (optional, only for ERASE_PREFLIGHT_CHECK)

**Business Rules:**
- Exactly one response per request
- piiData only present for successful GET_INFO
- erasePreflightCheck only present for ERASE_PREFLIGHT_CHECK
- error only present when requestStatus = FAILED

---

### Disclosure Record Model

```json
{
  "key": {
    "id": "MEMBER_ID-{tmId}-VF-{targetEmail}"
  },
  "value": {
    "fanIdentity": {
      "id": "tmId",
      "idType": "MEMBER_ID",
      "property": null,
      "encryptedProfile": null
    },
    "source": "VF",
    "target": "thirdparty@email.com",
    "timestamp": 1234567890000,
    "embeddedThirdParty": null,
    "PII": ["NAME", "EMAIL", "PHONE", "ADDRESS"],
    "justification": "MARKETING",
    "type": "DISCLOSED",
    "sharedIdentifiers": null
  }
}
```

**Relationships:**
- Disclosure → Fan Identity (fanIdentity field)
- Disclosure → Third-Party Contact (target field)
- Disclosure → Campaign (implicit via batch processing)
- Disclosure → PII Types (PII array)

**Business Rules:**
- One disclosure record per fan-contact combination
- Disclosure ID must be unique: `{idType}-{tmId}-{source}-{target}`
- Type always "DISCLOSED", justification always "MARKETING"
- Source always product code (VF)

---

### Data Dictionary Model

```json
{
  "privacy": {
    "com.tm.privacy.wirefmt.PrivacyMeta": {
      "thirdPartyEmails": [
        { "id": "email1@example.com", "email": "email1@example.com" },
        { "id": "email2@example.com", "email": "email2@example.com" }
      ],
      "endpointDeliverPrivacyRequest": {
        "string": "https://uploads-service.com/trigger/ccpa"
      }
    }
  }
  /* merged with baseDataDictionary.json */
}
```

**Relationships:**
- Data Dictionary → Third-Party Contacts (thirdPartyEmails array)
- Data Dictionary → Privacy Core (endpointDeliverPrivacyRequest integration)

**Business Rules:**
- Must be updated when third-party contact list changes
- Endpoint URL must be absolute and accessible to Privacy Core
- Product code (VF) included in base dictionary

---

### Worker Processing Model

```
Privacy Request
    ↓
processRequest Lambda (router)
    ↓
Fan Identity Resolution
    ├→ User Service lookup (GET /users/find?id={id})
    ├→ Account Fanscore lookup (if User Service fails)
    └→ Minimal data fallback (if all lookups fail)
    ↓
SQS Queue Message
    ↓
Worker Lambda (fanInfo | deleteFan | keepPrivate | optOut)
    ↓
Service Operations
    ├→ User Service (DELETE /users/{userId}, GET /users/ids)
    ├→ Entries Service (GET /users/{userId}/entries, POST /users/{userId}/optout)
    ├→ DynamoDB (verification, demand, identity tables)
    └→ MongoDB (account fanscore)
    ↓
Privacy Response
    ↓
Kafka Topic (Privacy Core)
```

**Relationships:**
- Privacy Request → processRequest Lambda (SQS trigger)
- processRequest Lambda → Worker Lambda (SQS message)
- Worker Lambda → External Services (HTTP/API calls)
- Worker Lambda → Privacy Response (Kafka publish)

---

### System Integration Data Flow

```
Fan → Privacy Core Web Portal
    ↓ (Kafka or API)
Privacy Core Platform
    ↓ (SQS)
CCPA Workers (processRequest)
    ↓ (SQS)
CCPA Workers (fanInfo | deleteFan | keepPrivate | optOut)
    ↓ (HTTP/API)
├→ Ticketmaster User Service
├→ Entries Service
├→ DynamoDB Tables
└→ MongoDB Collections
    ↓ (Kafka)
Privacy Core Platform
    ↓ (Email/Web)
Fan
```

**Key Integration Points:**
1. **Inbound**: Privacy Core → SQS → Lambda
2. **Processing**: Lambda → Services (User, Entries, DynamoDB, MongoDB)
3. **Outbound**: Lambda → Kafka → Privacy Core
4. **Certification**: Lambda → Secrets Manager → Kafka TLS
5. **Disclosure**: S3 → Lambda → User Service → Kafka

---

### Certificate Authentication Model

```
Lambda Function
    ↓
Get Certificate from Secrets Manager
    ├→ cert (client certificate PEM)
    ├→ key (client private key PEM)
    └→ ca (certificate authority chain PEM)
    ↓
Create HTTPS Agent with mutual TLS
    ↓
Kafka HTTP Request (with agent)
    ↓
Privacy Core Kafka Broker
    ├→ Verify client certificate
    └→ Establish encrypted connection
    ↓
Avro-encoded message published
```

**Relationships:**
- Lambda → Secrets Manager (certificate retrieval)
- Secrets Manager → Certificate Authority (cert issuance)
- Lambda → Kafka (mutual TLS handshake)

**Business Rules:**
- Certificates must be fetched for each Kafka request (no caching)
- Certificate must include cert, key, and ca fields
- Certificate must be signed by trusted CA
- Certificate must not be expired
