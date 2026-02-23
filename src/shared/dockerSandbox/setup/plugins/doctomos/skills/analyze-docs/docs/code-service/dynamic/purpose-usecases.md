# Use Cases & Workflows - code-service

## Primary Use Cases

### Use Case 1: Campaign Manager Uploads Promotional Codes

**Actor**: Campaign Admin (supreme-authenticated user)

**Goal**: Bulk upload thousands of unique promotional codes for a new campaign

**Preconditions**:
- CSV file with codes exists in S3 bucket at path: `codes/{campaignId}/{type}/{filename}`
- User has supreme authentication token
- Campaign ID exists

**Main Flow**:
1. Admin uploads CSV file (50,000 codes) to S3 following naming convention
2. Admin posts upload request to `POST /:campaignId/codes` with fileKey
3. Service validates:
   - User has supreme permissions
   - File key matches regex pattern `codes/{campaignId}/{type}/...`
   - Code type is valid (tm or external)
4. Service streams CSV from S3, parses codes (trimming whitespace)
5. Service upserts codes to MongoDB in batches of 50,000
6. Service returns count: `{in: 50000, inserted: 48000, updated: 2000}`

**Postconditions**:
- All codes stored in MongoDB with status "available"
- Codes are associated with campaignId and type
- Previously uploaded codes retain their status (reserved/assigned dates preserved)

**Business Rules Applied**:
- Only supreme users can upload codes
- Duplicate codes are updated (not rejected) to allow re-uploads
- Whitespace is trimmed from all codes
- Empty lines are skipped

---

### Use Case 2: Verification Service Reserves Codes for User Flow

**Actor**: User Verification Service (automated system)

**Goal**: Reserve a batch of codes for users entering verification flow

**Preconditions**:
- Campaign has available codes of requested type
- Verification service has supreme authentication

**Main Flow**:
1. Verification service requests: `GET /:campaignId/reserve?count=5&type=tm`
2. Service validates parameters (count > 0, type is valid)
3. Service queries MongoDB for available codes (never reserved OR reserved > 24 hours ago)
4. Service attempts to reserve codes with unique reserveId
5. If concurrent write conflict occurs:
   - Query actual reserved codes by reserveId
   - Calculate missing count
   - Retry up to 3 times
6. Service sets `date.reserved` and `reserveId` on code documents
7. Service returns array of reserved code strings: `["CODE001", "CODE002", ...]`

**Postconditions**:
- Requested codes have status "reserved"
- Codes have `date.reserved` timestamp (current time)
- Codes have unique `reserveId` for this reservation batch
- Codes automatically expire after 24 hours

**Business Rules Applied**:
- Reserved codes expire after 24 hours
- Concurrent reservations use retry logic with race condition handling
- Only codes without assigned date can be reserved
- Reservations are atomic per batch (reserveId groups them)

---

### Use Case 3: Verification Service Assigns Codes to Verified Users

**Actor**: User Verification Service (automated system)

**Goal**: Permanently assign codes to users who completed verification

**Preconditions**:
- Codes were previously reserved for this verification batch
- Users completed verification successfully
- Reservation is still within 24-hour window (or codes still exist)

**Main Flow**:
1. Verification service posts: `POST /:campaignId/assign` with body `{codes: ["CODE001", "CODE002"]}`
2. Service validates:
   - User is supreme-authenticated
   - codes is non-empty array
3. Service updates MongoDB: set `date.assigned` to current timestamp
4. Service returns: `{count: {in: 2, updated: 2}}`

**Postconditions**:
- Codes have status "assigned" (have assigned date)
- Codes are permanently assigned (cannot be released)
- Codes can be queried by assigned status

**Business Rules Applied**:
- Only supreme users can assign codes
- Assignment is permanent (no unassign operation exists)
- Codes can be assigned even if reservation expired

---

### Use Case 4: Verification Service Releases Unused Reservations

**Actor**: User Verification Service (automated system)

**Goal**: Return reserved codes back to available pool when users don't complete verification

**Preconditions**:
- Codes were previously reserved
- Users abandoned verification flow or didn't qualify
- Codes have NOT been assigned

**Main Flow**:
1. Verification service posts: `POST /:campaignId/release` with body `{codes: ["CODE003", "CODE004"]}`
2. Service validates codes array
3. Service updates MongoDB: remove `date.reserved` field
4. Update only affects codes that:
   - Match campaign and code values
   - Have NO assigned date
   - Have a reserved date (exist)
5. Service returns: `{count: {in: 2, updated: 2}}`

**Postconditions**:
- Codes return to "available" status
- Codes can be reserved again immediately
- reserveId is removed

**Business Rules Applied**:
- Only reserved codes (not assigned) can be released
- Release operation is idempotent
- Assigned codes are never released

---

### Use Case 5: Campaign Manager Checks Code Inventory

**Actor**: Campaign Admin (supreme-authenticated user)

**Goal**: View how many codes are available, reserved, or assigned for a campaign

**Preconditions**:
- Campaign has codes uploaded
- User has supreme authentication

**Main Flow**:
1. Admin requests: `GET /:campaignId/codes/count?type=tm&status=available`
2. Service validates type and status parameters
3. Service queries MongoDB with status-specific filters:
   - available: no assigned date AND (no reserved date OR reserved > 24 hours)
   - reserved: no assigned date AND reserved date within 24 hours
   - assigned: has assigned date
4. Service returns count for each status
5. If status omitted, returns all three counts

**Postconditions**: None (read-only operation)

**Business Rules Applied**:
- Counts reflect real-time status (including expired reservations)
- Type parameter is required
- Status parameter is optional (omit for all statuses)

## User Journey Map

**Campaign Code Lifecycle Journey**:
1. Campaign Manager prepares codes → Uploads CSV to S3 → Service ingests codes (status: available)
2. Verification flow starts → Service reserves codes (status: reserved, 24hr expiration)
3. User completes verification → Service assigns codes (status: assigned, permanent)
4. OR User abandons → Service releases codes (status: available again)
5. Campaign Manager monitors → Service provides real-time counts by status

## Key Workflows

### Workflow 1: Bulk Code Upload and Re-upload
**Process**: Admin uploads codes → Service validates → Stream from S3 → Parse CSV → Batch upsert → Return counts

**Key Points**:
- Supports re-uploading same file (updates existing codes)
- Preserves reserved/assigned dates on re-upload
- Processes in 50k batches for memory efficiency
- Whitespace sanitization prevents duplicate issues

### Workflow 2: Code Reservation with Concurrency Handling
**Process**: Service requests reservation → Find available codes → Attempt atomic update → Handle race conditions → Retry up to 3 times → Return reserved codes

**Key Points**:
- Uses unique reserveId per reservation batch
- Handles concurrent reservations across multiple instances
- Automatic retry with missing count calculation
- Returns empty array if insufficient codes available

### Workflow 3: Automatic Code Expiration
**Process**: Background logic (no explicit cron) → Status queries treat reserved > 24hrs as available → Expired codes automatically included in next reservation

**Key Points**:
- No explicit cleanup job needed
- Query logic defines status based on timestamp comparison
- Expired codes seamlessly re-enter available pool
- reserveId and reserved date persist until re-reserved

### Workflow 4: Code Assignment and Permanent Lock
**Process**: Verification completes → Service assigns codes → Set assigned timestamp → Codes permanently locked

**Key Points**:
- Assigned codes cannot be released
- Assignment timestamp persists forever
- Codes can be assigned after reservation expires
- No unassign operation exists

## Example Scenarios

### Scenario 1: High-Volume Campaign Launch
"Campaign manager uploads 100,000 TM codes for new tour → Service processes CSV in 2 batches (50k each) → Returns {in: 100000, inserted: 100000, updated: 0} → First 5,000 fans enter verification → Service reserves 5,000 codes across 1,000 concurrent requests → 4,800 fans complete verification within 1 hour → Service assigns 4,800 codes → 200 codes auto-release after 24 hours → Campaign manager checks inventory: available: 95,200, reserved: 0, assigned: 4,800"

### Scenario 2: Re-upload with Status Preservation
"Campaign manager uploads 10,000 codes → Service creates all as available → Verification service reserves 1,000 codes → 500 codes assigned to verified fans → Campaign manager re-uploads same file (correcting format issues) → Service updates all 10,000 codes with new saved date → 500 assigned codes retain assigned status → 500 reserved codes retain reserved status (if within 24hrs) → 9,000 codes remain available"

### Scenario 3: Reservation Expiration and Reuse
"8:00 AM: Service reserves 100 codes for verification batch → 11:00 AM: 60 codes assigned, 40 unused → 8:01 AM next day: Reserved timestamp now > 24 hours → Service receives new reserve request → Query finds 40 expired codes as available → Service reserves same 40 codes with new reserveId → Old reservation data overwritten"

### Scenario 4: Concurrent Reservation Race Condition
"Two verification instances simultaneously request 10 codes each → Both query and find same 15 available codes → Instance A reserves codes 1-10 successfully → Instance B attempts to reserve codes 1-10 but some already taken → Instance B queries by reserveId, finds only 7 reserved → Instance B retries for 3 missing codes → Instance B reserves codes 11-13 → Both instances return 10 codes successfully"

### Scenario 5: Mixed Code Types for Multi-Tier Campaign
"Campaign has both TM codes (premium access) and external codes (partner promotions) → Manager uploads 5,000 TM codes to codes/CAMP123/tm/batch1.csv → Manager uploads 20,000 external codes to codes/CAMP123/external/batch1.csv → Premium verification flow requests type=tm → Standard verification flow requests type=external → Code pools remain separate → Campaign manager queries counts for each type independently"
