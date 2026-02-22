# Use Cases & Workflows - user-service

## Primary Use Cases

### Use Case 1: Fan Authentication for Campaign Access

**Actor**: Verified fan using web or mobile application

**Goal**: Authenticate with Ticketmaster credentials to access Verified Fan campaigns

**Preconditions**:
- User has valid Ticketmaster account
- User possesses a valid tm_token from Ticketmaster authentication
- Campaign exists and is active

**Main Flow**:
1. User provides tm_token to client application
2. Application sends POST /auth request with tm_token
3. Service validates token with Ticketmaster Accounts API
4. Service creates or updates user record in MongoDB with TM profile data
5. Service checks if user has supreme status in userSupremes collection
6. Service fetches user's campaign permissions from permissions collection
7. Service generates JWT token embedding user ID, permissions, and supreme status
8. Service publishes vfLogin event to Campaign Data Stream (Kinesis)
9. Service returns user profile with embedded auth token
10. Application stores JWT for subsequent authenticated requests

**Postconditions**:
- User profile is current in MongoDB
- JWT token is valid for authenticated API calls
- Login event is recorded in analytics pipeline
- User can access campaigns based on embedded permissions

**Business Rules Applied**:
- Token must be validated against TM Accounts API before issuing JWT
- Supreme users automatically bypass campaign permission checks
- JWT includes campaign-specific actions (INVITE, VIEW, etc.) for authorization
- Login event must include globalUserId for campaign analytics

---

### Use Case 2: Campaign Administrator Grants User Permissions

**Actor**: Campaign administrator (user with INVITE action on campaign)

**Goal**: Grant another user permissions to manage or view a specific campaign

**Preconditions**:
- Administrator is authenticated with JWT containing INVITE action for target campaign
- Target user exists in the system
- Campaign ID is valid

**Main Flow**:
1. Administrator specifies target userId, campaignId, and actions to grant (e.g., ["VIEW", "INVITE"])
2. Application sends POST /:userId/campaigns/:campaignId with actions array
3. Service validates administrator's JWT contains INVITE action for campaignId
4. Service validates actions array contains only valid permission types
5. Service checks if target user exists (throws error if not found)
6. Service upserts permissions record in permissions collection with compound ID (userId + campaignId)
7. Service returns updated permissions with flattened compound ID

**Postconditions**:
- Target user's permissions are updated for the specified campaign
- Target user's next authentication will include new permissions in JWT
- Permission change is timestamped for audit purposes

**Business Rules Applied**:
- Only users with INVITE action can grant permissions to others
- Supreme users can grant any permissions without INVITE action
- Permissions are campaign-specific and don't transfer across campaigns
- Empty actions array is rejected (must specify at least one action)

---

### Use Case 3: User Updates Profile with Social Integration

**Actor**: Authenticated fan

**Goal**: Link Facebook account to Verified Fan profile for engagement and verification

**Preconditions**:
- User is authenticated with valid JWT
- User has valid Facebook access token
- Facebook account is not already linked to another user

**Main Flow**:
1. User provides facebook_token to application
2. Application sends POST /me with fb_token parameter
3. Service validates JWT and extracts userId
4. Service validates tm_token signature matches cached signature (prevents token mismatch)
5. Service fetches user record from MongoDB
6. Service validates Facebook token by calling Facebook Graph API
7. Service checks if Facebook account already linked to different user (throws conflict error if exists)
8. Service updates user's integrations.facebook field with Facebook profile data
9. Service extracts email from Facebook profile and saves to email contact list
10. Service returns updated user profile with Facebook integration

**Postconditions**:
- User profile includes Facebook ID, name, email, and access token
- Facebook email is added to user's email contact list
- User can leverage Facebook identity for campaign verification

**Business Rules Applied**:
- Each Facebook account can only link to one Verified Fan user
- Facebook email automatically becomes a validated contact method
- Integration conflicts (same social account on multiple users) are rejected
- Removing integration (via remove_integration parameter) requires integration doesn't currently exist

---

### Use Case 4: Worker Service Authenticates for User Lookup

**Actor**: Backend worker service (e.g., CCPA compliance worker, data export worker)

**Goal**: Obtain JWT token to access user data via API

**Preconditions**:
- Worker service has private RSA key (.pem file)
- Corresponding public key is registered in MongoDB workers collection with appId
- Worker knows the appId assigned to it

**Main Flow**:
1. Worker generates "petition" by signing payload with private RSA key
2. Worker sends POST /auth/workers with appId and petition
3. Service looks up public key from workers collection using appId
4. Service verifies petition signature using stored public key
5. Service generates JWT token with worker's appId and permissions
6. Service returns JWT token to worker
7. Worker uses JWT token in Authorization header for subsequent requests

**Postconditions**:
- Worker has valid JWT for authenticated API access
- Worker can call user lookup, deletion, or other protected endpoints
- Worker's access is logged and traceable via appId

**Business Rules Applied**:
- Worker keys must be pre-registered in MongoDB via insertMongoWorkerKey tool
- Public/private key pair ensures only legitimate workers can authenticate
- Worker JWTs have different permission structure than user JWTs
- Worker access doesn't require user-level permissions

---

### Use Case 5: User Requests Wallet Information

**Actor**: Authenticated fan viewing payment methods

**Goal**: Retrieve stored payment instruments from Ticketmaster wallet

**Preconditions**:
- User is authenticated with valid JWT
- User has Ticketmaster member_id in profile
- User has at least one payment instrument in TM Wallet

**Main Flow**:
1. User requests wallet data from application
2. Application sends GET /me/wallet with JWT
3. Service extracts userId from JWT
4. Service fetches user record to get Ticketmaster member_id
5. Service checks wallet.date.updated timestamp
6. If wallet data is older than 30 seconds, service calls TM Wallet API with member_id
7. Service fetches fan wallet including payment_instrument_token, funding sources, billing addresses
8. Service formats wallet data (removes sensitive fields, structures billing_address)
9. Service updates user record with fresh wallet data and current timestamp
10. Service marks inactive wallet items (items in DB but not in fresh API response)
11. Service returns active wallet items to application

**Postconditions**:
- User profile contains current wallet data (within 30-second TTL)
- Application displays payment methods available for ticket purchases
- Inactive payment instruments are marked but retained for history

**Business Rules Applied**:
- Wallet data must be refreshed if older than 30 seconds
- Only active payment instruments are returned by default
- Wallet items must include payment_instrument_token as unique identifier
- 404 from TM Wallet API is acceptable (user may not have wallet)

---

### Use Case 6: Supreme User Deletes User Account

**Actor**: Platform administrator with supreme user privileges

**Goal**: Completely remove user and all associated data for compliance (e.g., GDPR, CCPA)

**Preconditions**:
- Administrator is authenticated with supreme user status
- Target userId is valid
- Services for exports and entries are accessible

**Main Flow**:
1. Administrator specifies userId to delete
2. Application sends DELETE /users/:userId with supreme user JWT
3. Service validates JWT contains isSupreme flag
4. Service throws error if requester is not supreme user
5. Service calls Export Service to delete all user exports via HTTP
6. Service calls Entry Service to delete all user entries and scoring via HTTP
7. Service deletes user record from users collection
8. Service returns deletion summary: userDeleted, exports deleted count, entries deleted count, scoring deleted count

**Postconditions**:
- User record is permanently removed from users collection
- All user exports are deleted from export service
- All user entries and scoring are deleted from entry service
- Deletion is logged for audit compliance

**Business Rules Applied**:
- Only supreme users can delete user accounts
- Deletion must cascade to all related data (exports, entries, scoring)
- Deletion is permanent and cannot be undone
- All deletion counts are returned for verification

---

### Use Case 7: Batch User ID Lookup by Email

**Actor**: Campaign service needing to resolve multiple emails to user IDs

**Goal**: Convert list of email addresses to Verified Fan user IDs for campaign enrollment

**Preconditions**:
- Requester is authenticated with valid JWT
- Email list contains 1-1000 valid email addresses

**Main Flow**:
1. Service provides comma-separated list of emails
2. Service sends GET /users/ids?emails=user1@example.com,user2@example.com
3. Service validates emails are well-formed
4. Service queries users collection for email.list.account matching provided emails
5. Service returns array of { userId, tmId, email } for matched users
6. Paging parameters (limit, offset) control result size

**Postconditions**:
- Requester has user IDs corresponding to email addresses
- Requester can enroll users in campaigns or send notifications

**Business Rules Applied**:
- Maximum 1000 emails per request
- Emails must be valid format (validated via isValidEmail)
- Only returns users who have the email in their email.list
- Paging is enforced to prevent large result sets

## User Journey Map

**Typical Fan Journey**:
1. Fan discovers Verified Fan presale for concert → Logs in with Ticketmaster account → Application authenticates via user-service → Fan receives JWT token with permissions → Fan accesses campaign dashboard → Fan updates profile (email, phone, social links) → Fan views wallet payment methods → Fan is eligible for ticket presale

**Campaign Administrator Journey**:
1. Administrator logs in with Ticketmaster account → user-service validates credentials → JWT includes campaign permissions (e.g., INVITE) → Administrator views campaign user list → Administrator grants permissions to new team member → New team member can now manage campaign

**Worker Service Journey**:
1. Worker starts up → Loads private RSA key from secure storage → Authenticates with user-service using petition → Receives JWT token → Uses JWT to lookup user data for CCPA deletion request → Calls user deletion endpoint → User data removed across all systems

## Key Workflows

### Workflow 1: User Authentication & Token Generation
**Steps**: Client obtains tm_token → Sends to user-service /auth → Service validates with TM Accounts → Creates/updates user in MongoDB → Checks supreme status and permissions → Generates JWT with embedded roles → Publishes login event to Kinesis → Returns JWT to client

**Data Transformations**:
- TM Accounts API response → Normalized user profile (name, email, tmId, globalUserId)
- User profile + permissions + supreme status → Signed JWT token
- User profile → vfLogin event payload → Kinesis stream

---

### Workflow 2: Campaign Permission Management
**Steps**: Administrator requests permission change → Service validates requester has INVITE action → Service validates target user exists → Service upserts permission record (compound key: userId + campaignId) → Returns updated permissions → Next user authentication includes new permissions in JWT

**Data Transformations**:
- Request body { actions: ["VIEW", "INVITE"] } → MongoDB permissions document with compound _id
- MongoDB permissions array → Flattened permissions map in JWT claims

---

### Workflow 3: Social Integration Linking
**Steps**: User provides social token → Service validates JWT → Service calls social API to validate token → Service checks for account conflicts → Service saves integration data to user.integrations → Extracts email and saves to contact list → Returns updated user profile

**Data Transformations**:
- Facebook token → Facebook Graph API → Profile data (id, name, email)
- Facebook profile → user.integrations.facebook document
- Facebook email → email.list contact object with timestamps

---

### Workflow 4: Wallet Data Refresh
**Steps**: User requests wallet → Service checks cached wallet age → If stale, calls TM Wallet API → Service formats wallet data (removes sensitive fields) → Service compares with cached data to identify inactive items → Service updates user.wallet with fresh data → Returns active wallet items

**Data Transformations**:
- TM Wallet API response → Formatted wallet items (payment_instrument_token, funding_source, billing_address)
- Fresh wallet vs. cached wallet → Inactive items marked (active: false)
- Wallet list → Filtered active items for response

## Example Scenarios

### Scenario 1: Fan Authentication for Taylor Swift Presale
**Story**: Fan visits presale site → Logs in with TM credentials → Application sends tm_token to user-service → Service validates token → Creates user profile with tmId "12345", email "fan@example.com", globalUserId "guid-12345" → Checks permissions for campaign "taylor-swift-2024" → Generates JWT with VIEW permission → Publishes vfLogin event to analytics → Returns JWT to application → Fan accesses presale with 30-minute token validity

---

### Scenario 2: Campaign Manager Grants Team Access
**Story**: Manager authenticated with INVITE permission for "beyonce-tour" campaign → Manager adds new team member userId "60a1b2c3d4e5f6789abcdef0" → Sends POST /:userId/campaigns/beyonce-tour with actions ["VIEW", "INVITE"] → Service validates manager's JWT → Updates permissions collection → New team member logs in → Receives JWT with VIEW and INVITE actions for beyonce-tour → Can now manage campaign users

---

### Scenario 3: User Links Multiple Social Accounts
**Story**: User logs in → Sends POST /me with fb_token → Service validates Facebook token → Links Facebook account "fb-987654" → User later sends POST /me with twitter_token and twitter_secret → Service links Twitter account "twitter-456789" → User profile now has integrations.facebook and integrations.twitter → Campaign can verify user via multiple social channels

---

### Scenario 4: CCPA Worker Deletes User Data
**Story**: User submits CCPA deletion request → CCPA worker authenticates with RSA petition → Receives worker JWT → Worker calls DELETE /users/60a1b2c3d4e5f6789abcdef0 → Service cascades deletion: 15 exports deleted, 42 entries deleted, 8 scoring records deleted, user record deleted → Worker logs completion for compliance audit

---

### Scenario 5: Bulk User Lookup for Campaign Enrollment
**Story**: Campaign service has 500 emails from presale registration → Calls GET /users/ids?emails=email1@example.com,email2@example.com,... → Service resolves 487 emails to user IDs → 13 emails not found (new users) → Campaign service enrolls 487 existing users → Creates new user records for 13 emails via separate flow
