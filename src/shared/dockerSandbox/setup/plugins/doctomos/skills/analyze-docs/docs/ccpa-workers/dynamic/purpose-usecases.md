# Use Cases & Workflows - ccpa-workers

## Primary Use Cases

### Use Case 1: Fan Requests Personal Information (GET_INFO)

**Actor**: Fan (consumer) → Privacy Core → CCPA Workers

**Goal**: Fan wants to know what personal information Verified Fan has collected about them (CCPA "Right to Know")

**Preconditions**:
- Fan has submitted GET_INFO request through Privacy Core interface
- Fan is identifiable by email, memberId, or globalUserId
- Privacy Core has published request to processRequest SQS queue

**Main Flow**:
1. **processRequest Lambda** receives privacy request event from SQS
2. System attempts to resolve fan identity by looking up user in Ticketmaster User Service
3. If fan found, system queues request to **fanInfoQueue** with userId
4. **fanInfo Lambda** fetches all user entries from Entries Service
5. System extracts and categorizes PII from entries (NAME, EMAIL, PHONE, ADDRESS, etc.)
6. System formats PII data according to Privacy Core's expected schema
7. System publishes completed response with PII data to Privacy Core Kafka topic
8. Privacy Core delivers PII information to fan

**Postconditions**:
- Fan receives structured list of all PII Verified Fan stores about them
- Privacy Core records successful completion with audit trail
- Entry count and PII type counts logged for monitoring

**Business Rules Applied**:
- If userId not found, send default empty response (0 entries) but still mark as completed
- All PII must be categorized using CCPA-defined types
- Response must include entry count and PII type breakdown

**Error Scenarios**:
- Entries Service unavailable → Publish FAILED response to Privacy Core
- Invalid user data → Publish FAILED response to Privacy Core
- Fan not found → Publish COMPLETED response with empty PII data (not an error)

---

### Use Case 2: Fan Requests Data Deletion (ERASE)

**Actor**: Fan (consumer) → Privacy Core → CCPA Workers

**Goal**: Fan wants all their personal information permanently deleted from Verified Fan systems (CCPA "Right to Deletion")

**Preconditions**:
- Fan has submitted ERASE request through Privacy Core
- Fan identity can be resolved to memberId, globalUserId, userId, and/or email
- Privacy Core has published request to processRequest SQS queue
- System has completed preflight check (if required)

**Main Flow**:
1. **processRequest Lambda** receives ERASE request from SQS
2. System resolves fan identity across multiple identifier types (userId, memberId, globalUserId, email)
3. System queues deletion request to **deleteFanQueue** with all resolved identifiers
4. **deleteFan Lambda** executes deletion cascade across all systems:
   - Removes records from DynamoDB verification table (by memberId, globalUserId, email)
   - Flags records in MongoDB Account Fanscore (by memberId)
   - Flags identity records in DynamoDB (by globalUserId)
   - Calls User Service DELETE endpoint to remove user from registration database (by userId)
   - Removes demand records from DynamoDB (by globalUserId/fanId)
5. System collects deletion counts from each operation
6. System publishes completed response with deletion summary to Privacy Core Kafka topic

**Postconditions**:
- Fan data removed or flagged across all Verified Fan systems
- Privacy Core records successful deletion with audit trail
- Deletion counts logged: verification table records, demand records, user registration data
- Fan cannot be reconstituted from remaining data

**Business Rules Applied**:
- Deletion must cascade across all systems (verification, demand, fanscore, identity, user service)
- If userId exists, user must be deleted from User Service
- Account fanscore records are flagged (not deleted) for audit purposes
- Identity records are flagged (not deleted) for audit purposes
- Any failure in cascade triggers FAILED response to Privacy Core

**Error Scenarios**:
- User Service deletion fails → Publish FAILED response, log error with memberId/userId
- DynamoDB operations fail → Publish FAILED response
- MongoDB flagging fails → Publish FAILED response
- Partial deletion (some systems succeed, others fail) → Publish FAILED response (data may be inconsistent)

---

### Use Case 3: Fan Opts Out of Data Selling (DO_NOT_SELL)

**Actor**: Fan (consumer) → Privacy Core → CCPA Workers

**Goal**: Fan wants to prevent Verified Fan from selling or sharing their personal information for marketing purposes (CCPA "Right to Opt-Out")

**Preconditions**:
- Fan has submitted DO_NOT_SELL request through Privacy Core
- Fan has userId in User Service
- Privacy Core has published request to processRequest SQS queue

**Main Flow**:
1. **processRequest Lambda** receives DO_NOT_SELL request from SQS
2. System resolves fan identity to userId
3. System queues request to **keepPrivateQueue**
4. **keepPrivate Lambda** calls Entries Service to opt out user from marketing: `POST /users/{userId}/optout` with field: `allow_marketing`
5. Entries Service updates fan's marketing preference to false
6. System retrieves count of updated entries
7. System publishes completed response to Privacy Core Kafka topic

**Postconditions**:
- Fan's `allow_marketing` preference set to false across all entries
- Fan will not receive third-party marketing communications
- Privacy Core records successful opt-out with audit trail
- Entry update count logged for monitoring

**Business Rules Applied**:
- If userId not found, send default response with null entry count (still mark as completed)
- Only `allow_marketing` field is modified (VF notifications and LN emails unaffected)
- Opt-out must apply to all user entries (not selective)

**Error Scenarios**:
- Entries Service unavailable → Publish FAILED response to Privacy Core
- Opt-out operation fails → Publish FAILED response, log error with userId

---

### Use Case 4: Fan Unsubscribes from Communications (UNSUBSCRIBE)

**Actor**: Fan (consumer) → Privacy Core → CCPA Workers

**Goal**: Fan wants to stop receiving all marketing communications from Verified Fan and LiveNation

**Preconditions**:
- Fan has submitted UNSUBSCRIBE request through Privacy Core
- Fan has userId in User Service
- Privacy Core has published request to processRequest SQS queue

**Main Flow**:
1. **processRequest Lambda** receives UNSUBSCRIBE request from SQS
2. System resolves fan identity to userId
3. System queues request to **optOutQueue**
4. **optOut Lambda** executes two opt-out operations sequentially:
   - Opt out of Verified Fan notifications: `POST /users/{userId}/optout` with field: `allow_notification`
   - Opt out of LiveNation emails: `POST /users/{userId}/optout` with field: `allow_livenation`
5. Entries Service updates both preference fields to false
6. System retrieves counts of updated entries for each opt-out type
7. System publishes completed response to Privacy Core Kafka topic

**Postconditions**:
- Fan's `allow_notification` preference set to false (VF notifications stopped)
- Fan's `allow_livenation` preference set to false (LN emails stopped)
- Privacy Core records successful unsubscribe with audit trail
- Opt-out counts logged for both VF and LN: `{ vf: <count>, ln: <count> }`

**Business Rules Applied**:
- UNSUBSCRIBE affects TWO separate preferences (VF notifications AND LN emails)
- If userId not found, send default response with null opt-out counts
- Both opt-outs must complete; partial success should be handled gracefully

**Error Scenarios**:
- Entries Service unavailable → Publish FAILED response to Privacy Core
- Either opt-out operation fails → Publish FAILED response, log error with userId
- Fan not found → Publish COMPLETED response with null opt-outs (not an error)

---

### Use Case 5: Pre-Deletion System Availability Check (ERASE_PREFLIGHT_CHECK)

**Actor**: Privacy Core → CCPA Workers

**Goal**: Privacy Core verifies CCPA Workers system is ready to process a fan deletion before scheduling the actual deletion

**Preconditions**:
- Privacy Core has received ERASE request from fan
- Privacy Core wants to verify system health before committing to deletion timeline
- Privacy Core has published ERASE_PREFLIGHT_CHECK to processRequest SQS queue

**Main Flow**:
1. **processRequest Lambda** receives ERASE_PREFLIGHT_CHECK request from SQS
2. System immediately publishes preflight response to Privacy Core Kafka topic with status: "READY"
3. No actual data processing or deletion occurs

**Postconditions**:
- Privacy Core receives confirmation that CCPA Workers can accept deletion requests
- No fan data is modified or deleted
- System logs preflight check but does not queue to deleteFanQueue

**Business Rules Applied**:
- Preflight checks require immediate response without validation or processing
- Always return "READY" status (no system health checks performed in current implementation)
- No fan identity resolution or data access required

---

### Use Case 6: Campaign Disclosure Tracking (Bulk PII Sharing)

**Actor**: Marketing Team/Campaign System → CCPA Workers

**Goal**: Record and report to Privacy Core when fan PII is shared with third-party contacts (artists, campaign targets) for marketing campaigns

**Preconditions**:
- Campaign has been executed and fan data shared with third-party contacts
- CSV file containing campaign fan list uploaded to S3 Export Bucket
- Lambda triggered with S3 file key and campaignId
- Campaign has associated third-party contact list

**Main Flow**:
1. **saveDisclosures Lambda** receives event with S3 file key and campaignId
2. System fetches third-party contact list for campaign from Campaigns Service
3. System creates S3 read stream for CSV file
4. System processes CSV in batches of 5000 rows:
   - Parse CSV row to extract Email column
   - Batch collect 200 unique emails and look up userIds in User Service
   - For each fan row, create disclosure records for each third-party contact
   - Disclosure record includes: fanIdentity, source (VF), target (third-party email), PII types, timestamp, justification (MARKETING)
5. System publishes disclosure batches to Privacy Core disclosure Kafka topic
6. System tracks total rows processed, contacts shared with, and disclosures published

**Postconditions**:
- All PII sharing events recorded in Privacy Core for audit and reporting
- Disclosure records stored with unique ID: `{idType}-{tmId}-{source}-{target}`
- Count returned: `{ rows: <CSV rows>, contacts: <target count>, disclosures: <total records> }`

**Business Rules Applied**:
- PII types extracted from CSV column headers mapped to CCPA categories (e.g., "name" → NAME, "email" → EMAIL, "mobile phone" → PHONE)
- Disclosure type: "DISCLOSED" with justification: "MARKETING"
- Source is always product code (VF) extracted from config
- idType is "MEMBER_ID"
- Each fan-contact combination creates one disclosure record

**Error Scenarios**:
- User Service lookup fails → Log error but continue processing remaining batches
- Kafka publish fails → Log error with file key and campaignId but continue processing
- CSV parse error → Reject batch and continue with next

---

### Use Case 7: Update Privacy Data Dictionary

**Actor**: System Administrator / Scheduled Job → CCPA Workers

**Goal**: Update Privacy Core with current list of third-party contacts (artists) who may receive fan PII, enabling Privacy Core to track and report all data sharing relationships

**Preconditions**:
- Third-party contact list may have changed (new artists, updated emails)
- Manual trigger or scheduled job invokes updateDictionary Lambda

**Main Flow**:
1. **updateDictionary Lambda** invoked (no input required)
2. System fetches current list of artist contacts from Campaigns Service (currently returns empty array in mock)
3. System merges base data dictionary with third-party email list
4. System adds endpoint URL for Privacy Core to deliver privacy requests: `/trigger/ccpa` on uploads service
5. System publishes complete data dictionary to Privacy Core dictionary Kafka topic

**Postconditions**:
- Privacy Core has updated list of all third-party contacts who may receive fan PII
- Privacy Core knows endpoint to deliver future privacy requests
- Data dictionary registered confirmation logged

**Business Rules Applied**:
- Data dictionary includes privacy metadata with third-party emails and request delivery endpoint
- Base dictionary structure merged with dynamic third-party contact list
- Product code (VF) embedded in dictionary

---

## User Journey Map

**Fan Exercises Privacy Rights:**
1. Fan submits privacy request through Privacy Core web portal or API
2. Privacy Core validates request and publishes event to CCPA Workers SQS queue
3. CCPA Workers processes request asynchronously through appropriate Lambda worker
4. Worker retrieves/modifies data across Verified Fan systems
5. Worker publishes completion status (success/failure) to Privacy Core Kafka topic
6. Privacy Core delivers result to fan (within CCPA-mandated timeline)

**Marketing Campaign Disclosure Flow:**
1. Marketing team plans campaign and identifies third-party contacts to share fan data with
2. Campaign system exports fan list to CSV and uploads to S3
3. CCPA Workers saveDisclosures Lambda processes CSV and publishes disclosure records
4. Privacy Core stores disclosure audit trail for compliance reporting
5. If fan later requests "Right to Know", Privacy Core can report all historical data sharing

## Key Workflows

### 1. Privacy Request Routing Workflow

**Process**: Centralized request intake → Identity resolution → Queue-based distribution → Type-specific processing

**Steps**:
1. Privacy Core publishes request to processRequest SQS queue
2. processRequest Lambda triggered by SQS message
3. System extracts fan identifier (email or memberId) and request type from payload
4. System attempts identity resolution:
   - First: Look up in Ticketmaster User Service (GET /users/find?id={id})
   - Second: If not found, query Account Fanscore DynamoDB table
   - Third: If still not found, use minimal data (email or memberId only)
5. System determines target queue based on request type:
   - GET_INFO → fanInfoQueue
   - ERASE → deleteFanQueue
   - DO_NOT_SELL → keepPrivateQueue
   - UNSUBSCRIBE → optOutQueue
   - ERASE_PREFLIGHT_CHECK → Immediate response (no queue)
6. System sends message to target queue with resolved user identifiers + original request event
7. Type-specific Lambda processes request from its queue
8. Result published to Privacy Core

**Key Decision Point**: If fan has multiple records (e.g., multiple entries in Account Fanscore), queue separate messages for each record to process independently.

---

### 2. Fan Data Deletion Cascade Workflow

**Process**: Multi-system coordinated deletion with rollback-on-failure

**Steps**:
1. deleteFan Lambda receives request with memberId, globalUserId, userId, email, requestEvent
2. **Verification Table Cleanup**: Delete all records in DynamoDB verificationTable where memberId, globalUserId, or email matches
3. **Fanscore Flagging**: Flag MongoDB Account Fanscore records by memberId (mark for audit, don't delete)
4. **Identity Flagging**: Flag DynamoDB identity records by globalUserId (mark for audit, don't delete)
5. **User Service Deletion**: If userId exists, call DELETE /users/{userId} → Returns deletion counts for registration data
6. **Demand Table Cleanup**: Delete DynamoDB demand records where fanId matches globalUserId
7. **Publish Response**: Collect all deletion counts and publish to Privacy Core
8. **Error Handling**: If ANY step fails, publish FAILED response to Privacy Core (partial deletions may occur)

**Important**: Deletion is NOT fully transactional. If step 5 succeeds but step 6 fails, fan is partially deleted.

---

### 3. PII Data Collection and Formatting Workflow

**Process**: Retrieve raw user entries → Extract PII → Categorize → Format for Privacy Core

**Steps**:
1. fanInfo Lambda calls Entries Service: GET /users/{userId}/entries
2. System receives array of user entry objects (each entry represents a campaign participation or interaction)
3. For each entry, system extracts PII fields and maps to CCPA categories:
   - Name fields → "NAME"
   - Email addresses → "EMAIL"
   - Phone numbers → "PHONE"
   - Addresses → "ADDRESS"
   - IP addresses → "IP_ADDRESS"
   - Other fields → "UNIQUE_IDENTIFIER" or "OTHER"
4. System creates PII data structure with array of categorized PII types
5. System counts entries and groups by PII type: `{ NAME: 5, EMAIL: 5, PHONE: 3, ... }`
6. System publishes formatted PII data with privacy response to Privacy Core

---

### 4. Opt-Out Preference Management Workflow

**Process**: Update fan communication preferences across Verified Fan systems

**Steps** (keepPrivate - DO_NOT_SELL):
1. keepPrivate Lambda calls Entries Service: POST /users/{userId}/optout with body: `{ field: 'allow_marketing' }`
2. Entries Service updates all fan entries to set allow_marketing = false
3. System receives count of updated entries
4. System publishes completed response to Privacy Core

**Steps** (optOut - UNSUBSCRIBE):
1. optOut Lambda calls Entries Service twice:
   - First: POST /users/{userId}/optout with body: `{ field: 'allow_notification' }` (VF notifications)
   - Second: POST /users/{userId}/optout with body: `{ field: 'allow_livenation' }` (LN emails)
2. Entries Service updates entries for each field separately
3. System collects counts for both opt-outs: `{ vf: <vf_count>, ln: <ln_count> }`
4. System publishes completed response to Privacy Core

---

### 5. Disclosure Batch Processing Workflow

**Process**: Stream large CSV files → Batch process → Publish disclosure events

**Steps**:
1. saveDisclosures Lambda receives S3 file key and campaignId
2. Fetch campaign third-party contacts from Campaigns Service
3. Create S3 read stream for CSV file (avoids loading entire file into memory)
4. Pipe stream through CSV parser (columns: Email, First Name, Last Name, etc.)
5. Pipe parsed rows through batch transform stream (batch size: 5000 rows)
6. For each batch:
   - Extract unique email addresses from batch
   - Split emails into chunks of 200 and lookup userIds in User Service (parallel requests)
   - Index users by email for fast lookup
   - For each row, retrieve userId and create disclosure records for ALL third-party contacts
   - Disclosure record format: `{ key: { id: "MEMBER_ID-{tmId}-VF-{target}" }, value: { fanIdentity, source, target, PII, justification, timestamp, type: "DISCLOSED" } }`
7. Publish batch of disclosure records to Privacy Core disclosure Kafka topic
8. Continue streaming until entire CSV processed
9. Return final counts: `{ rows: <total>, contacts: <contact_count>, disclosures: <total_records> }`

**Memory Optimization**: Streaming approach prevents OOM errors on large campaign files (10,000+ fans).

---

## Example Scenarios

### Scenario 1: Premium Fan Requests Data Access Before Ticket Sale

**Context**: Fan wants to verify Verified Fan has correct information before participating in high-demand ticket sale.

**Flow**:
- Fan submits GET_INFO request through Privacy Core 2 hours before sale starts
- processRequest resolves fan's userId from email address
- fanInfo retrieves 12 entries (from various campaigns: Taylor Swift, Beyoncé, festival presales)
- System extracts PII: NAME (first, last), EMAIL, PHONE (mobile), ADDRESS (zip code), IP_ADDRESS (from past registrations)
- System publishes PII data to Privacy Core: `{ entries: 12, piiTypes: { NAME: 12, EMAIL: 12, PHONE: 8, ADDRESS: 10, IP_ADDRESS: 12 } }`
- Privacy Core delivers structured PII report to fan within 15 minutes
- Fan confirms data is accurate and proceeds with ticket sale registration

---

### Scenario 2: Fan Wants Complete Account Deletion After Bad Experience

**Context**: Fan had negative customer service experience and wants all data deleted from Ticketmaster systems.

**Flow**:
- Fan submits ERASE request through Privacy Core
- Privacy Core sends ERASE_PREFLIGHT_CHECK → CCPA Workers responds "READY" immediately
- Privacy Core schedules deletion for next business day (CCPA-compliant timeline)
- processRequest resolves fan to: userId=987654, memberId=VF-12345, globalUserId=GLB-12345, email=fan@example.com
- deleteFan Lambda executes cascade:
  - Removes 8 verification records from DynamoDB (memberId, globalUserId, email matches)
  - Flags 3 fanscore records in MongoDB (memberId match)
  - Flags 1 identity record in DynamoDB (globalUserId match)
  - Deletes user from User Service → Returns: `{ userDeleted: true, deletedCount: { entries: 12, campaigns: 5 } }`
  - Removes 2 demand records from DynamoDB (fanId match)
- System publishes COMPLETED with deletion summary to Privacy Core
- Privacy Core confirms to fan: "Your data has been permanently deleted from Verified Fan"
- Fan receives confirmation email within 30 minutes

---

### Scenario 3: Fan Opts Out of Marketing After Concert

**Context**: Fan attended concert and now receiving too many promotional emails from third parties; wants to stop data sharing.

**Flow**:
- Fan submits DO_NOT_SELL request through Privacy Core
- processRequest resolves fan's userId
- keepPrivate Lambda calls Entries Service: optout with field='allow_marketing'
- Entries Service updates 8 entries (from past campaigns) to set allow_marketing=false
- System publishes COMPLETED response: `{ entries: 8 }`
- Privacy Core confirms to fan: "Your data will no longer be shared for marketing purposes"
- Fan stops receiving third-party promotional emails within 48 hours
- Fan can still receive transactional emails (order confirmations, account updates)

---

### Scenario 4: Marketing Team Shares 50,000 Fan Records with Artist Team

**Context**: Major artist campaign requires sharing fan contact information with artist's management for exclusive presale communication.

**Flow**:
- Campaign system exports 50,000 fan records to CSV: columns include Email, Name, Mobile Phone, Zip Code, IP Address
- CSV uploaded to S3 export bucket with event trigger
- saveDisclosures Lambda invoked with file key and campaignId
- System fetches target contacts: `[{ id: 'artist-mgmt@example.com', email: 'artist-mgmt@example.com' }, { id: 'promo-team@example.com', email: 'promo-team@example.com' }]`
- System streams CSV in batches of 5000 rows (10 batches total)
- For each batch:
  - Lookup userIds for unique emails (batches of 200 emails → 250 API calls per batch)
  - Create disclosure records: 50,000 fans × 2 contacts = 100,000 disclosure records
  - Publish disclosure batch to Privacy Core Kafka
- Processing completes in ~10 minutes: `{ rows: 50000, contacts: 2, disclosures: 100000 }`
- Privacy Core has audit trail of all PII shared with artist team
- If any fan later submits GET_INFO request, Privacy Core can report: "Your data was shared with artist-mgmt@example.com and promo-team@example.com on [date] for marketing purposes"

---

### Scenario 5: Certificate Expiration Triggers Renewal Workflow

**Context**: Kafka TLS certificate for Privacy Core communication will expire in 25 days; automated monitoring detects this.

**Flow**:
- GitLab scheduled job runs daily on `alert-cert-expiry` branch
- alertCertExpiration.js script reads prod certificate from `/shared/services/privacyCore/certs`
- Script calculates expiration: 25 days remaining (threshold: 30 days)
- Script sends Slack alert to ops team: "⚠️ Privacy Core certificate expires in 25 days"
- Engineer runs: `npx run generateCerts`
- Script prompts for techops username and password
- New certificates generated and saved to `/shared/services/privacyCore/certs` directory
- Engineer commits and pushes changes to git
- CI/CD pipeline deploys updated certificates to Lambda functions
- Engineer rebases `alert-cert-expiry` branch with main to ensure monitoring uses new certs
- Next day's alert confirms: "✅ Privacy Core certificate valid for 365 days"
- Privacy Core communication continues without interruption
