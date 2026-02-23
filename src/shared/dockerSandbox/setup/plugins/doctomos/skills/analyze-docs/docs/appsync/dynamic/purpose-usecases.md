# Use Cases & Workflows - AppSync

## Primary Use Cases

### Use Case 1: Fan Queries Their Account Score

**Actor**: Authenticated fan via web/mobile app

**Goal**: Retrieve their current Verified Fan score to understand their eligibility for presale access

**Preconditions**:
- Fan is logged in with valid JWT token
- Fan has either a globalUserId or memberId
- Account fanscore record exists in DynamoDB

**Main Flow**:
1. Frontend calls `api.accountFanscore` GraphQL query with fan's globalUserId or memberId
2. System looks up fan identity record in fan_identity_table by globalUserId
3. If globalUserId score found and valid, return it; otherwise lookup by memberId
4. System applies score randomization (+/- 10%) for fairness
5. If eventId provided, system checks for event-specific engagement and applies boost
6. System queries bot detection service and flags account if bot detected
7. Return normalized score (0-1 range), ARM score (1-5), and bot status

**Postconditions**: Fan receives current score reflecting account history, event engagement, and risk signals

**Business Rules Applied**:
- GlobalUserId lookup prioritized over memberId
- Scores randomized within +/- 10% range
- Event engagement boosts applied when eventId provided
- Bot detection flags override positive signals
- Expired scores (with TTL) excluded from results

**Data Flow & Transformations**:
- **Input**: `{ globalUserId, memberId?, eventId?, market? }`
- **Lookup**: DynamoDB query on `fan_identity_table` (PK: `g:{globalUserId}`, SK: `score#account`)
- **Transform**: Apply randomization, calculate ARM-adjusted score, add event boost
- **Enrich**: Fetch bot score from external service
- **Output**: `{ globalUserId, memberId, score, rawScore, armScore, isBot, version, tags }`

---

### Use Case 2: Fan Registers for Presale Campaign

**Actor**: Authenticated fan via campaign registration form

**Goal**: Submit registration entry for an upcoming Verified Fan presale campaign

**Preconditions**:
- Fan is logged in with valid JWT token
- Campaign is open (within presale window)
- Campaign metadata cached in Redis
- Fan has not previously registered with same phone number

**Main Flow**:
1. Frontend calls `upsertEntry` mutation with campaign slug, locale, registration form fields
2. System retrieves campaign configuration from Redis cache
3. System validates fan is logged in and extracts globalUserId from token
4. System checks phone uniqueness: queries DynamoDB for existing entries with same phone number in campaign
5. If duplicate found, return error; otherwise proceed
6. System fetches fan's current account fanscore
7. System saves entry record to DynamoDB demand_table with registration fields, timestamps, and fanscore snapshot
8. If `doTransfer` flag set and linked campaigns exist, delete entry from linked campaign
9. Return entry record with campaignId, entry codes, created/updated timestamps

**Postconditions**: Fan registration saved, entry codes generated, old linked entries removed if transfer requested

**Business Rules Applied**:
- Campaign must be open (checked against Redis cache)
- Phone number must be unique per campaign
- Entry records store snapshot of fanscore at registration time
- Linked campaign transfers delete old entry when saving new one
- Fan can update existing entry (fanModified timestamp tracks user changes)

**Data Flow & Transformations**:
- **Input**: `{ entry: JSON, slug: string, locale: string, doTransfer: boolean }`
- **Validate**: Check campaign open status (Redis), check phone uniqueness (DynamoDB query)
- **Enrich**: Fetch current fanscore, extract user info from JWT token
- **Transform**: Format entry record with timestamps, codes, attributes
- **Write**: DynamoDB PutItem to `demand_table` (PK: `e:{campaignId}`, SK: `entry#{globalUserId}`)
- **Cleanup**: If doTransfer=true, delete linked campaign entry
- **Output**: `{ campaignId, date: { created, updated, fanModified }, fields, attributes, codes }`

---

### Use Case 3: Fan Saves Demand Reminder for Event

**Actor**: Authenticated fan browsing event listings

**Goal**: Subscribe to SMS reminder when tickets for a specific event/sale become available

**Preconditions**:
- Fan is logged in with valid authentication token
- Event and sale information exist in demand_table
- Fan has phone number associated with TM account

**Main Flow**:
1. Frontend calls `demandRecordSave` mutation with eventId, saleId, locale
2. System validates fan is logged in (extracts globalUserId from JWT)
3. System queries demand_table for event details (name, venue, start time)
4. System queries demand_table for sale details (name, sale types, date range)
5. If event or sale not found, return error status with code "FAILED"
6. System fetches user info from TM Account Service (email, phone, systemUserId)
7. System writes demand record to DynamoDB with contact method (SMS), artist info, timestamps
8. Demand record indexed by fanId and timestamp for future notification processing
9. Return success status "SAVED"

**Postconditions**: Demand record saved, fan will receive SMS when sale opens

**Business Rules Applied**:
- Only logged-in users can save demand records
- Event and sale must exist before accepting demand record
- Contact method defaults to SMS
- RequestedDateTime captured at record creation (not updated on subsequent saves)
- Artist ID/name pulled from first attraction in event

**Data Flow & Transformations**:
- **Input**: `{ eventId, saleId, locale }`
- **Validate**: User logged in, event exists, sale exists (early return if validation fails)
- **Lookup**: Query event record (PK: `event#{eventId}`, SK: `event`), query sale record (PK: `event#{eventId}`, SK: `sale#{saleId}`)
- **Enrich**: Fetch user info from TM Account Service (phone, email, systemUserId)
- **Transform**: Build demand record with event name, artist name, sale name, contact preferences
- **Write**: DynamoDB UpdateItem (PK: `fan#{globalUserId}`, SK: `demand#{eventId}#{saleId}`, LSIK_1: `demand#{timestamp}`)
- **Output**: `{ status: "SAVED" }` or `{ status: "FAILED", error: { code, message } }`

---

### Use Case 4: System Initiates Liveness Verification

**Actor**: Authenticated fan requiring identity verification

**Goal**: Start selfie-based or government ID verification process to confirm fan identity

**Preconditions**:
- Fan is logged in with valid JWT token
- Liveness tier determined by business rules (always/high/medium/low/ASU)
- External liveness vendor API available
- Fan has not completed recent successful verification

**Main Flow**:
1. Frontend calls `checkLiveness` mutation with appId, subjectId, tier, verificationType
2. System validates fan is logged in (extracts globalUserId)
3. System determines if verification required based on tier and recent verification history
4. If verification not required (low tier + no red flags), return decision with requiresVerification=false
5. If verification required, invoke external liveness vendor Lambda to create session
6. Vendor returns sessionId, vendorSessionId, token, expiration timestamp
7. System saves liveness session record to DynamoDB with status "created", timestamps
8. Return decision with requiresVerification=true, session details, token for frontend SDK
9. Frontend loads vendor SDK with token, guides fan through selfie/ID capture
10. Vendor posts status updates via webhook, system updates session status to pending/completed/approved/declined
11. GraphQL subscription pushes status updates to frontend in real-time

**Postconditions**: Liveness session created, fan completes verification via vendor UI, verification status tracked and available for score boost

**Business Rules Applied**:
- Tier determines verification requirement (always=required, low=optional unless flagged)
- VerificationType: "selfie" for medium/high tiers, "selfieAndGovID" for always/ASU tiers
- Session expires within vendor-specified timeframe (typically 24-48 hours)
- Hardcoded test users can bypass requirements or force specific ARM scores
- Completed verification boosts account fanscore and ARM score

**Data Flow & Transformations**:
- **Input**: `{ appId, subjectId, tier: "always"|"high"|"medium"|"low"|"asu", verificationType: "selfie"|"selfieAndGovID" }`
- **Validate**: User logged in, check if verification required based on tier
- **Decision Logic**: If tier=low and no red flags → return { requiresVerification: false }
- **Create Session**: Invoke liveness vendor Lambda with { armScore, accountScore, tier, verificationType }
- **Transform**: Vendor response → internal session record with status="created", date timestamps
- **Write**: DynamoDB PutItem to liveness session table
- **Output**: `{ decision: { requiresVerification: true, session: { id, vendorId, status, token }, token } }`
- **Webhook Updates**: Vendor posts status changes → update session record status and timestamp fields
- **Subscription**: Publish session updates via GraphQL subscription `livenessStatusUpdate`

---

### Use Case 5: Admin Queries Verification Status for Fan

**Actor**: Internal admin tool or campaign service

**Goal**: Check if a fan has completed verification for a specific campaign

**Preconditions**:
- Fan has memberId, globalUserId, or email to identify them
- Verification record may exist in verification_table or demand_table
- Campaign ID provided to scope the verification check

**Main Flow**:
1. Admin tool calls `api.verificationStatus` query with campaignId and fan identifier (memberId, globalUserId, or email)
2. System validates at least one identifier provided; returns error if all missing
3. System looks up verification record by campaignId in verification_table or demand_table
4. System retrieves fan's current account fanscore (with ARM score)
5. System fetches verification status: isVerified flag, verdict (pass/fail)
6. If fan completed liveness verification, system applies score boost
7. System returns selected events (ranked by eligibility) if applicable
8. Return verification status with score, verdict, isVerified flag, ranked events

**Postconditions**: Admin receives comprehensive verification status including score, verdict, and event rankings

**Business Rules Applied**:
- At least one identifier (memberId, globalUserId, email) required
- Verification status checked in demand_table first (current campaign records)
- Fanscore calculated with event-specific boosts if applicable
- Verdict and isVerified flags indicate pass/fail for campaign access

**Data Flow & Transformations**:
- **Input**: `{ campaignId, memberId?, globalUserId?, email? }`
- **Validate**: At least one identifier present (error if all null)
- **Lookup**: Query verification record (demand_table: PK: `e:{campaignId}`, SK: `entry#{fanId}`)
- **Enrich**: Fetch account fanscore (with ARM score, bot detection)
- **Transform**: Combine verification flags with fanscore data
- **Calculate**: Apply event boosts, determine verdict based on threshold
- **Output**: `{ memberId, globalUserId, campaignId, score, rawScore, armScore, isVerified, verdict, events: [{ id, rank }] }`

---

## User Journey Map

**Fan discovers presale opportunity** → Checks if Verified Fan program required → Logs into TM account → Queries current fanscore (may see "build your score" prompt if low) → Completes liveness verification if required (selfie + ID) → Registers for campaign with form fields → Saves demand reminder for event → Receives SMS when tickets available → Accesses presale with priority queue position based on score

**Admin monitors campaign** → Queries verification status for registered fans → Reviews fraud/bot flags → Adjusts eligibility thresholds → Exports registration data with scores → Tracks conversion rates from registration to purchase

## Key Workflows

### Workflow 1: High-Risk Account Verification Flow
1. Fan attempts registration → System calculates low account fanscore (< 0.3) → System checks ARM score (4-5 indicates high risk) → System requires liveness verification (tier: "high", verificationType: "selfieAndGovID") → Fan completes selfie + government ID capture → Vendor AI evaluates match and authenticity → Session status updated to "approved" or "declined" → If approved, account score boosted and registration allowed → If declined, registration blocked with error message

### Workflow 2: Event-Specific Demand Tracking
1. Event announced with limited presale availability → Fans browse event listing → Fan clicks "Remind Me" button → System saves demand record (eventId, saleId, contactMethod: SMS) → Sale date approaches → Backend batch job queries all demand records for upcoming sale → System sends SMS notifications to fans via external service → Fans receive link to presale access → Demand record updated with notifiedDateTime → Fan purchases tickets or misses window

### Workflow 3: Duplicate Registration Prevention
1. Fan A registers for campaign with phone number 555-1234 → Entry saved with phone uniqueness index → Fan B (different account) attempts registration with same phone 555-1234 → System queries demand_table for existing entry with phone 555-1234 in campaign → Match found → Mutation returns error: "Phone number already registered for this campaign" → Frontend displays error message → Fan B must use different phone number or contact support

### Workflow 4: Score Calculation Pipeline
1. Request for account fanscore arrives → System looks up globalUserId in fan_identity_table → Retrieves base score (calculated from historical behavior) → Applies randomization (+/- 10%) → If eventId provided, queries demand_table for event engagement (demand records, entry records) → Calculates event boost multiplier → Applies boost to base score → Queries bot detection service with cursor → If bot detected, sets isBot=true and lowers score → Calculates ARM score (1-5 based on account age, phone risk, past fraud flags) → Returns final normalized score, raw score, ARM score, bot flag, version

### Workflow 5: Linked Campaign Transfer
1. Artist announces tour with multiple markets → Campaign system creates linked campaigns (one per market) → Fan registers for "NYC show" campaign → Later decides to switch to "LA show" → Fan submits registration for "LA show" with doTransfer=true → System validates both campaigns linked → System saves new entry to "LA show" → System deletes old entry from "NYC show" → System updates entry codes to reflect new campaign → Fan receives confirmation with new entry details

## Example Scenarios

**Scenario 1: New fan with low score**
- "New user creates TM account for popular artist presale → System calculates fanscore: 0.15 (no history, new account) → ARM score: 3 (medium risk) → Liveness tier: 'medium' → Fan required to complete selfie verification → Selfie approved → Score boosted to 0.45 → Fan registers for campaign → Enters presale with mid-tier queue priority → Successfully purchases 2 tickets"

**Scenario 2: Power fan with high score**
- "Long-time TM user with purchase history for artist → System calculates fanscore: 0.82 (strong signals) → ARM score: 2 (low risk) → Event boost applied (+0.10 for previous demand records) → Final score: 0.92 → No liveness verification required → Fan auto-approved for presale access → Top 10% queue priority → Completes purchase within first 5 minutes"

**Scenario 3: Bot/scalper blocked**
- "Suspicious account created yesterday with 50 demand records → System queries bot detection service → Bot score: 0.95 (highly likely bot) → Account flagged with isBot=true → Liveness tier forced to 'always' → Selfie verification fails (deepfake detected) → Session status: 'declined' → Registration mutation blocked with error → Account marked for review → No presale access granted"

**Scenario 4: Family household with multiple accounts**
- "Cluster detection identifies 4 accounts from same IP/device → All accounts have legitimate purchase history → System calculates individual scores → Cluster type: 'exact' → Cluster size: 4 → Each fan can still register independently → No automatic blocking → Campaign rules may limit 1 registration per household → System provides cluster ID for downstream enforcement"

**Scenario 5: Fan saves multiple demand reminders**
- "Fan browses upcoming tour dates → Saves demand reminders for 5 different shows (5 separate demandRecordSave mutations) → Each record stored with unique eventId+saleId → 3 days before first show, batch job identifies upcoming sale → SMS sent to fan: 'Tickets for Artist at Venue go on sale tomorrow at 10am' → Fan clicks link → Presale access granted based on existing registration and score → Process repeats for each show → Fan notified 5 times total"
