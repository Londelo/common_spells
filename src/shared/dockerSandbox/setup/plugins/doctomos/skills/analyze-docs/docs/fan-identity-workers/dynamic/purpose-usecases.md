# Use Cases & Workflows - fan-identity-workers

## Primary Use Cases

### Use Case 1: Real-Time User Risk Scoring on Activity

**Actor**: Automated system (event-driven)

**Goal**: Calculate and update a user's fraud risk score whenever they perform account activities

**Preconditions**:
- User has a valid `globalUserId`
- Activity is one of the scorable types (login, create_account, update_email, etc.)
- Activity result is `success`

**Main Flow**:
1. User performs account activity (e.g., logs in, updates phone number)
2. Activity event published to Kafka `user-activity-stream`
3. `enqueueFromStream` worker filters for scorable activities (successful actions from approved list)
4. Filtered activities sent to `accountActivityQueue` (FIFO queue)
5. `lookupArai` worker fetches Account Risk Activity Intelligence from TM Accounts API
6. ARAI response cached in DynamoDB `fan-identity-table`
7. DynamoDB stream (via Kinesis) triggers `scoreUsers` worker
8. Worker extracts ARAI data and calls Databricks scoring model
9. ML model returns fraud risk score (0-1 scale, where 1 = highest risk)
10. Score saved to DynamoDB with model version and timestamp
11. Score now available to downstream systems (demand service, purchase flow)

**Postconditions**:
- User has updated risk score in `fan-identity-table`
- Score reflects latest behavioral patterns and account signals
- Other services can query current score for fraud prevention decisions

**Business Rules Applied**:
- RULE-001: Only successful activities trigger scoring
- RULE-002: Only specific activity types are scorable
- RULE-005: Duplicate ARAI cache entries are filtered
- RULE-014: Score dateCreated only set on first write

**Typical Timing**: 2-5 seconds from activity to updated score

---

### Use Case 2: Identity Verification via Liveness Check

**Actor**: VerifiedFan user (through GraphQL API)

**Goal**: Prove they are a real person by completing liveness detection

**Preconditions**:
- User is authenticated (has valid SOTC token)
- User has initiated a Persona inquiry session
- GraphQL client has session ID from Persona

**Main Flow**:
1. User opens VerifiedFan app and starts identity verification flow
2. Frontend calls AppSync GraphQL API with authorization header (API key + SOTC)
3. `validateToken` worker validates API key and extracts user info from TM Accounts
4. User context (globalUserId, email) added to GraphQL resolver context
5. Frontend initiates Persona liveness session and captures selfie video
6. Liveness events streamed to GraphQL via `handleEvent` mutation
7. Worker forwards events to Persona Identity Service
8. Persona processes video frames for liveness indicators (blinks, head movement, lighting analysis)
9. Worker returns updated session status and confidence score
10. Once liveness passes threshold, frontend calls `checkLiveness` query
11. Worker requests final liveness decision from Persona
12. Persona returns decision (isLive: true/false, confidence, audit images)
13. Decision returned to frontend to proceed with identity verification flow

**Postconditions**:
- User's liveness status verified by Persona
- Audit trail created for compliance
- User can proceed to next verification step (if passed) or retry (if failed)

**Business Rules Applied**:
- RULE-006: Liveness checks require valid session ID
- RULE-007: Invalid events return `InvalidEvent` error
- RULE-008: IDV errors normalized to GraphQL format

**Typical Timing**: 15-60 seconds for full liveness check

---

### Use Case 3: Scheduled Rescoring After Purchase

**Actor**: Automated system (event-driven)

**Goal**: Recalculate user risk scores after purchases to detect fraud patterns

**Preconditions**:
- Purchase activity published to Kafka `purchaserequests` topic
- Purchase status is `SUCCESS`
- Customer has valid `globalUserId`

**Main Flow**:
1. User completes ticket purchase
2. Purchase event published to Kafka
3. `enqueueFromPurchaseStream` worker filters successful purchases with valid globalUserId
4. Worker extracts unique globalUserIds from purchase batch
5. Worker checks DynamoDB for existing pending rescore records (same user + date)
6. For users without pending rescores, creates new rescore record with:
   - PK: `g:{globalUserId}`
   - SK: `rescore:{YYYY-MM-DD}` (5 days in future)
   - TTL: Unix timestamp (5 days from now)
7. Rescore record saved to DynamoDB
8. Five days pass (debounce period for activity bursts)
9. DynamoDB TTL service deletes expired rescore record
10. DynamoDB stream REMOVE event triggers `processRescoreEvents` worker
11. Worker extracts globalUserId from deleted record
12. Worker sends activity to `accountActivityQueue`
13. Normal scoring flow proceeds (lookupArai → scoreUsers)
14. Updated score reflects post-purchase behavior patterns

**Postconditions**:
- User rescored 5 days after purchase
- New score captures any suspicious post-purchase activity (bulk reselling, chargebacks, etc.)
- Fraud patterns detected for future prevention

**Business Rules Applied**:
- RULE-003: Only successful purchases with globalUserId trigger rescore
- RULE-004: Rescores scheduled 5 days in future
- RULE-005: Duplicate rescore requests filtered
- RULE-009: DynamoDB TTL automatically triggers rescore
- RULE-015: REMOVE events in DynamoDB stream initiate scoring

**Typical Timing**: 5 days + 2-5 seconds (rescore lag + scoring latency)

---

### Use Case 4: GraphQL API Authorization

**Actor**: External client (VerifiedFan app, partner integrations)

**Goal**: Securely access GraphQL API with optional user context

**Preconditions**:
- Client has valid AppSync API key
- Optionally, user has logged-in session (SOTC token)

**Main Flow - API Key Only**:
1. Client makes GraphQL request with `Authorization: {apiKey}` header
2. AppSync invokes `validateToken` authorizer Lambda
3. Worker splits token (no SOTC present, only API key)
4. Worker validates API key matches configured value
5. If valid, returns `isAuthorized: true, isLoggedIn: false`
6. AppSync allows request to proceed to resolver
7. Resolver receives context indicating no authenticated user

**Main Flow - API Key + SOTC Token**:
1. Client makes GraphQL request with `Authorization: {apiKey}:{sotc}` header
2. AppSync invokes `validateToken` authorizer Lambda
3. Worker splits token to extract API key and SOTC
4. Worker validates API key matches configured value
5. Worker calls TM Accounts API to get user info using SOTC as access token
6. TM Accounts returns user profile (globalUserId, email, name)
7. Worker normalizes user info and returns:
   - `isAuthorized: true`
   - `isLoggedIn: true`
   - `resolverContext: { globalUserId, email, env }`
8. AppSync allows request and passes user context to resolver
9. Resolver can access current user's globalUserId for queries/mutations

**Alternate Flow - Invalid API Key**:
1. Client provides incorrect API key
2. Worker validates and finds mismatch
3. Returns `isAuthorized: false`
4. AppSync rejects request with 401 Unauthorized

**Alternate Flow - Invalid SOTC Token**:
1. Client provides expired/invalid SOTC token
2. TM Accounts API returns 401 error
3. Worker catches error and returns default response (isLoggedIn: false)
4. AppSync allows request but resolver sees no authenticated user

**Postconditions**:
- Valid requests proceed to GraphQL resolvers
- Invalid requests rejected at authorization layer
- User context available to resolvers when logged in

**Business Rules Applied**:
- RULE-009: API key validation is mandatory
- RULE-010: Missing SOTC returns isLoggedIn: false but still authorized
- RULE-011: 401 errors treated as invalid token
- RULE-012: Non-401 errors set ttlOverride: 0

**Typical Timing**: 50-150ms for authorization check

---

### Use Case 5: ARM Score Retrieval for Risk Assessment

**Actor**: Internal system or admin tool (via GraphQL API)

**Goal**: Retrieve holistic Account Risk Management score from ARM team's Redis cluster

**Preconditions**:
- ARM Redis cluster URLs configured in environment
- User exists in ARM scoring system
- Valid GraphQL authorization

**Main Flow**:
1. Client queries GraphQL API: `{ getArmScore(globalUserId: "user-123") { armScore } }`
2. `validateToken` authorizer validates request
3. AppSync routes to `getArmScore` resolver Lambda
4. Worker constructs Redis key: `user:{globalUserId}`
5. Worker queries ARM Redis cluster using configured connection
6. Redis returns user data object with `arm_risk` field
7. Worker validates ARM score is number between 1-5
8. Worker returns `{ armScore: 3 }`
9. Client receives ARM team's risk assessment for user

**Alternate Flow - User Not Found**:
1. Redis query returns null (user not in ARM system)
2. Worker returns `{ armScore: null }`
3. Client interprets as "no ARM score available"

**Alternate Flow - Invalid Score**:
1. Redis returns user data but `arm_risk` is outside valid range or wrong type
2. Worker logs warning with details (globalUserId, invalid value, full userData)
3. Worker returns `{ armScore: null }`
4. Ops team alerted to investigate data quality issue

**Postconditions**:
- Client has ARM risk score for holistic risk assessment
- Invalid scores logged for investigation
- Graceful handling of missing data

**Business Rules Applied**:
- RULE-010: ARM scores must be whole numbers 1-5

**Typical Timing**: 10-50ms (Redis query)

---

## User Journey Map

### VerifiedFan User Registration & Scoring Journey

1. **User creates account** → `create_account` activity → Scored immediately via real-time flow → Initial risk score assigned
2. **User logs in** → `login` activity → Rescored to detect account takeover patterns → Score updated
3. **User updates email** → `update_email` activity → Rescored to detect suspicious changes → Score updated
4. **User registers for drop** → Demand table updated → Rescore scheduled (5 days) → Future score update queued
5. **User purchases tickets** → Purchase event → Rescore scheduled (5 days) → Post-purchase behavior monitored
6. **High-risk user flagged** → Score consumed by demand service → User challenged with identity verification
7. **User completes liveness check** → Persona verifies identity → User's verified status updated
8. **User passes verification** → Allowed to proceed with purchase → Fraud risk mitigated

### Backend Scoring Lifecycle

1. **Activity detected** → Filtered for scorability → Queued to SQS
2. **ARAI lookup** → TM Accounts API called → Response cached in DynamoDB
3. **Score calculation** → ML model invoked with ARAI data → Score prediction returned
4. **Score saved** → DynamoDB updated with score + version → Available to consumers
5. **Rescore triggered** → TTL expires or new activity → Cycle repeats

---

## Key Workflows

### Workflow 1: Continuous Fraud Scoring Pipeline

```
[User Activity]
    → Kafka: user-activity-stream
    → enqueueFromStream (filter scorable)
    → SQS: accountActivityQueue
    → lookupArai (fetch ARAI)
    → DynamoDB: cache ARAI response
    → DynamoDB Stream (Kinesis)
    → scoreUsers (ML model inference)
    → DynamoDB: save score
    → [Score available to consumers]
```

**Business Value**: Real-time fraud prevention during ticket drops

---

### Workflow 2: Multi-Source Rescore Orchestration

```
[Purchase Event] → Kafka
    → enqueueFromPurchaseStream
    → DynamoDB: create rescore record (TTL=5 days)

[SmartQueue Join] → Kafka
    → enqueueFromSQJourneyStream
    → DynamoDB: create rescore record (TTL=5 days)

[Demand Registration] → DynamoDB demand-table
    → enqueueFromDemandStream
    → DynamoDB: create rescore record (TTL=5 days)

[5 days pass] → DynamoDB TTL expires
    → DynamoDB Stream: REMOVE event
    → processRescoreEvents
    → SQS: accountActivityQueue
    → [Standard scoring flow]
```

**Business Value**: Captures evolving fraud patterns after key events

---

### Workflow 3: Identity Verification Flow

```
[User Starts IDV]
    → GraphQL: validateToken (authorize request)
    → [User authenticated with context]

[User Submits Liveness Video]
    → GraphQL Mutation: handleEvent
    → Persona Identity Service
    → [Session updated with liveness data]

[User Completes Liveness]
    → GraphQL Query: checkLiveness
    → Persona Identity Service
    → [Liveness decision returned]

[Decision: Passed]
    → [User proceeds to purchase]

[Decision: Failed]
    → [User prompted to retry or contact support]
```

**Business Value**: Ensures only verified humans can purchase high-demand tickets

---

### Workflow 4: ML Model Data Import

```
[Data Team Uploads Bot Detection Dataset]
    → S3: bot-detection bucket
    → startBotOrNotImport (S3 trigger)
    → AWS Glue: botornot workflow
    → [Data processed and available for scoring]

[Data Team Uploads Clustering Data]
    → S3: clustering bucket (filename includes date=YYYY-MM-DD)
    → startClusterImport (parse date, S3 trigger)
    → AWS Glue: clustering workflow
    → [Clustering data processed for fraud ring detection]
```

**Business Value**: Integrates ML model updates into scoring pipeline

---

## Example Scenarios

### Scenario 1: High-Volume Ticket Drop - 10,000 concurrent users

**Timeline**:
- T+0s: Ticket drop begins, 10,000 users hit "Join Queue" button
- T+0s-2s: 10,000 Kafka activity events published
- T+0s-3s: `enqueueFromStream` processes events, 9,500 scorable activities queued (500 rejected for missing globalUserId)
- T+1s-5s: `lookupArai` workers (parallel instances) fetch ARAI for users in batches of 50
- T+3s-8s: ARAI responses cached in DynamoDB, triggering Kinesis stream
- T+4s-10s: `scoreUsers` workers calculate risk scores using ML model (parallel processing)
- T+5s-12s: Scores saved to DynamoDB
- T+12s: All 9,500 users have current risk scores
- T+12s+: Demand service queries scores to make enrollment decisions (high-risk users challenged or blocked)

**Outcome**: 95% of users scored within 12 seconds, enabling real-time fraud prevention

---

### Scenario 2: Sophisticated Fraud Ring - 50 coordinated accounts

**Detection Timeline**:
- Day 1: Fraud ring creates 50 accounts with synthetic identities
  - Initial scores: 0.2-0.4 (moderate risk due to new accounts)
- Day 3: Accounts perform coordinated "normal" activity (logins, profile updates)
  - Rescored, scores remain moderate: 0.3-0.5
- Day 7: Clustering data updated via S3 upload
  - `startClusterImport` triggers Glue workflow
  - Clustering algorithm identifies accounts as related (shared IPs, device fingerprints)
- Day 8: Next scoring cycle incorporates clustering data
  - Scores spike to 0.8-0.9 (high risk due to cluster association)
- Day 10: Fraud ring attempts to enter ticket drop
  - Demand service queries scores
  - All 50 accounts blocked due to high risk scores
  - Manual review queue populated for investigation

**Outcome**: Coordinated fraud detected before ticket purchase, saving high-value inventory

---

### Scenario 3: Legitimate User Account Takeover - Recovered account

**Recovery Timeline**:
- Day 1, 10:00 AM: User's account compromised, attacker changes password
  - `reset_password` activity → Scored immediately
  - ARAI shows: suspicious login location, new device, rapid password change
  - Score increases from 0.1 to 0.7
- Day 1, 10:15 AM: Attacker attempts to purchase tickets
  - Demand service challenges with identity verification
  - Attacker fails liveness check (stock photo used)
  - Purchase blocked
- Day 1, 2:00 PM: Legitimate user contacts support
  - Support verifies identity and restores account
  - User completes liveness check successfully
  - Account marked as verified in Persona
- Day 1, 2:30 PM: User logs in with new password
  - `login` activity → Rescored
  - ARAI shows: return to normal location, successful verification
  - Score drops to 0.2 (low risk)
- Day 1, 3:00 PM: User successfully purchases tickets
  - Demand service allows purchase based on low score

**Outcome**: Fraud blocked in real-time, legitimate user restored and able to purchase

---

### Scenario 4: New User with No Activity History

**Initial Experience**:
- User creates account via VerifiedFan app
  - `create_account` activity → Scored
  - ARAI response: minimal history (new account)
  - Initial score: 0.4 (moderate risk due to newness)
- User immediately attempts to register for high-demand drop
  - Demand service sees moderate risk score
  - User challenged with identity verification
- User completes liveness check + government ID verification
  - Identity verified via Persona
  - Verification status stored
- User re-enters drop registration
  - Demand service considers: moderate score BUT verified identity
  - User allowed to proceed (verification overrides moderate risk)
- User successfully enters lottery and purchases tickets
  - Purchase event → Rescore scheduled (5 days)
- Day 6: Rescore cycle runs
  - ARAI now includes: successful purchase, no chargebacks, verified identity
  - Score drops to 0.15 (low risk)
- Future drops: User experiences frictionless entry due to established low-risk profile

**Outcome**: New users can build trust through verification and successful transaction history
