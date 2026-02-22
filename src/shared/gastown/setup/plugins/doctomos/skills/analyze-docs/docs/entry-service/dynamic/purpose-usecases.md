# Use Cases & Workflows - entry-service

## Primary Use Cases

### Use Case 1: Fan Registers for Campaign

**Actor**: Fan (authenticated user)

**Goal**: Register for a Verified Fan campaign to be considered for ticket allocation

**Preconditions**:
- Fan has valid user account
- Fan is authenticated (JWT token)
- Campaign status allows registration
- Fan meets campaign gate requirements (invite code, linked account, card, etc.)

**Main Flow**:
1. Fan navigates to campaign registration page
2. Fan fills out registration form (market preferences, opt-ins, referral code)
3. System validates campaign status and fan eligibility
4. System checks for existing entry (create vs update path)
5. System validates form fields (required fields, format, duplicates)
6. System validates referrer information if referral code provided
7. System creates/updates entry in MongoDB with user data, preferences, timestamps
8. System queries Nudetect for fraud scoring
9. System queries fanscore for account reputation score
10. System updates entry with fraud and fanscore data
11. System publishes registration data to Kinesis stream
12. System sends receipt email if phone auto-confirmed or PPC disabled
13. System returns formatted entry data to fan

**Postconditions**:
- Entry record exists in database with fan preferences
- Registration event published to downstream systems
- Receipt email sent if applicable

**Business Rules Applied**:
- Campaign must have valid status (not ended/disabled)
- Fan cannot register if blocked by eligibility gates
- Phone number change on update triggers phone confirmation reset if PPC enabled
- Market preferences validated against campaign's available markets
- Duplicate phone-confirmed entries rejected

---

### Use Case 2: Fan Confirms Phone Number

**Actor**: Fan (authenticated user)

**Goal**: Verify phone number ownership via one-time SMS code

**Preconditions**:
- Fan has registered for campaign with phone number
- Campaign has phone confirmation enabled
- Fan has not yet confirmed phone for this campaign
- Fan received SMS with confirmation code

**Main Flow**:
1. Fan enters confirmation code from SMS
2. System decrypts and validates JWT containing phone number and campaign ID
3. System checks if another user already confirmed this phone for campaign
4. If phone already confirmed by other user, reject with error
5. If valid, update entry with phoneConfirmed timestamp
6. System sends receipt email to fan
7. System returns success confirmation

**Postconditions**:
- Entry marked as phone-confirmed with timestamp
- Receipt email sent to fan
- Phone number locked to this fan for this campaign

**Business Rules Applied**:
- Phone numbers must be unique per campaign after confirmation
- JWT token must be valid and contain matching phone/campaign
- Confirmation can only happen once per entry

---

### Use Case 3: Admin Uploads Scoring Records

**Actor**: Campaign Administrator (supreme user)

**Goal**: Upload batch scoring results to determine fan eligibility for ticket selection

**Preconditions**:
- Admin has supreme user privileges
- Scoring records have phone numbers matching campaign entries
- Entries have phone-confirmed status

**Main Flow**:
1. Admin uploads CSV/JSON with scoring data (phone, score, verdict, marketIds)
2. System validates records have required fields (phone, score)
3. System normalizes phone numbers to standard format
4. System queries entries by campaign and phone numbers
5. System enriches scoring records with entry data (userId, name, email, etc.)
6. System formats records with campaign ID and globalUserId
7. System performs bulk upsert to scoring collection
8. System logs any records missing matching entries
9. System returns summary (input count, scoring count, entries found, inserted, updated)

**Postconditions**:
- Scoring records created/updated in database
- Records linked to entry data via phone number match
- Admin sees summary of upload results

**Business Rules Applied**:
- Only phone-confirmed entries included in scoring
- Missing entries generate warnings but don't fail upload
- Records without userId stored but flagged

---

### Use Case 4: Admin Queries Eligible Fans for Selection

**Actor**: Campaign Administrator (supreme user)

**Goal**: Retrieve list of fans eligible for ticket allocation based on score and preferences

**Preconditions**:
- Admin has supreme user privileges
- Campaign has scoring records
- Selection criteria defined (marketIds, score range, etc.)

**Main Flow**:
1. Admin specifies selection criteria (marketId(s), minScore, maxScore, reassign flag, etc.)
2. System queries scoring collection with eligibility filters
3. System filters by market preference (fans who selected the target market in any rank)
4. System filters by score range if specified
5. System filters by previous selection status (include/exclude already selected)
6. System optionally orders by market preference rank
7. System applies pagination (skip, limit)
8. System returns list of fans with userId, email, phone, score, marketIds, selection codes

**Postconditions**:
- Admin receives paginated list of eligible fans
- Fans can be exported for ticket allocation process

**Business Rules Applied**:
- Only verified (verdict=true) fans returned unless specified
- Market filtering matches any rank in fan's preference array
- Score filtering inclusive of min/max bounds
- Selection status filtering based on `codes` field presence

---

### Use Case 5: Admin Transfers Entries Between Markets

**Actor**: Campaign Administrator (supreme user)

**Goal**: Move fan entries from one market to another (e.g., when venue changes or is added)

**Preconditions**:
- Admin has supreme user privileges
- Campaign has entries in source market
- Target market exists in campaign

**Main Flow**:
1. Admin specifies campaignId, fromMarketId, toMarketId
2. System validates admin privileges
3. System performs bulk update on entries matching source market
4. For entries with primary preference = fromMarket and toMarket not in optional preferences:
   - Set primary preference to toMarket
5. For entries with primary preference = fromMarket and toMarket in optional preferences:
   - Set primary preference to toMarket
   - Remove toMarket from optional preferences
6. For entries with fromMarket in optional preferences and toMarket already present:
   - Remove fromMarket from optional preferences
7. For entries with fromMarket in optional preferences but toMarket not present:
   - Replace fromMarket with toMarket in optional preferences array
8. Update all modified entries with current timestamp
9. Return count of modified entries

**Postconditions**:
- Entries moved to target market
- Market preference arrays updated consistently
- Timestamps updated for audit trail

**Business Rules Applied**:
- Market transfers preserve preference rank structure
- Duplicate markets removed from preference arrays
- All modifications logged with updated timestamp

---

### Use Case 6: System Determines Registration Eligibility

**Actor**: System (on behalf of fan request)

**Goal**: Check if fan is allowed to register based on campaign gates

**Preconditions**:
- Fan authenticated
- Campaign exists and has gate configuration

**Main Flow**:
1. Fan initiates registration
2. System checks if fan already has entry (if yes, eligible to update)
3. If no entry, system retrieves campaign gate configuration
4. System evaluates gate types:
   - **linkedAccount**: Check if fan has required social connection (FB, Twitter, Tumblr)
   - **inviteOnly**: Validate invite code provided by fan
   - **card**: Check if fan has verified payment card on account
5. System checks "past participation" requirement if configured
6. System checks market capacity if configured (not yet selected)
7. System returns eligibility result and reason if ineligible

**Postconditions**:
- Eligibility determination returned to client
- Fan allowed to proceed or shown rejection reason

**Business Rules Applied**:
- Existing entries always eligible for updates
- Gate requirements must all pass for new entries
- Past participation validated via user service history
- Specific gate requirements defined per campaign

---

## User Journey Map

**Typical Fan Registration Journey:**

1. **Discovery**: Fan clicks campaign link from artist announcement
2. **Authentication**: Fan logs in or creates Verified Fan account
3. **Gate Validation**: System checks eligibility (invite code, linked accounts, card)
4. **Registration**: Fan selects market preferences, opts into emails/texts, enters referral
5. **Phone Entry**: Fan provides phone number (if PPC enabled)
6. **Phone Confirmation**: Fan receives SMS, enters code (if PPC enabled)
7. **Confirmation**: Fan sees success page and receives receipt email
8. **Scoring**: Backend system processes entry for fraud and reputation scoring
9. **Waiting Period**: Fan waits for selection window
10. **Selection**: Backend queries eligible fans and allocates tickets
11. **Notification**: Fan receives offer or "not selected" message

**Admin Campaign Management Journey:**

1. **Campaign Setup**: Admin configures campaign in campaign-service
2. **Registration Period**: Monitor entry counts, market distribution via dashboard
3. **Scoring Upload**: Admin uploads third-party scoring data (Spotify, social, etc.)
4. **Eligibility Analysis**: Query eligible counts by market, score range, preference rank
5. **Selection**: Generate fan lists for ticket allocation
6. **Market Adjustments**: Transfer entries if venues change
7. **Post-Selection**: Review stats (registrations, confirmations, selections by market)

## Key Workflows

### Workflow 1: Entry Creation with Phone Confirmation

```
Fan submits registration form
  → Validate campaign status
  → Validate eligibility gates
  → Validate form fields
  → Validate referrer/invite code
  → Create new entry in DB
  → Query Nudetect fraud score
  → Query fanscore
  → Update entry with scores
  → Publish to Kinesis stream
  → Return success (no receipt sent yet)

Fan receives SMS with code

Fan submits confirmation code
  → Validate JWT token
  → Check phone uniqueness
  → Update entry with phoneConfirmed timestamp
  → Send receipt email
  → Return confirmation success
```

### Workflow 2: Entry Update (Existing Registration)

```
Fan modifies registration
  → Retrieve existing entry
  → Validate new market preferences
  → Validate referral code if changed
  → Detect phone number change
  → If phone changed and PPC enabled:
    - Unset phoneConfirmed timestamp
  → Update entry in DB
  → Query Nudetect fraud score
  → Query fanscore
  → Update entry with scores
  → Publish to Kinesis stream
  → Return updated entry
```

### Workflow 3: Scoring Upload and Fan Selection

```
Admin uploads scoring file
  → Validate CSV/JSON format
  → Normalize phone numbers
  → Query phone-confirmed entries
  → Enrich records with entry data
  → Bulk upsert to scoring collection
  → Return upload summary

Admin queries eligible fans
  → Specify market(s) and score range
  → Query scoring collection with filters
  → Filter by market preference
  → Filter by score thresholds
  → Filter by selection status
  → Order by score descending
  → Apply pagination
  → Return fan list with contact info

Admin exports fan list
  → Pass to selection/allocation system
```

### Workflow 4: Entry Transfer Between Markets

```
Admin initiates market transfer
  → Validate supreme user privileges
  → Build bulk update operations
  → Update primary market preferences
  → Update optional market preferences
  → Remove duplicate markets
  → Set updated timestamps
  → Execute bulk write to DB
  → Return modified count
```

## Example Scenarios

**Scenario 1: Stadium Tour with Market Preferences**
- Campaign: Artist announces 10-city North American tour
- Fan registers: Selects NYC as first choice, Boston as second, Philadelphia as third
- Phone confirmation: Fan confirms via SMS
- Scoring: Admin uploads Spotify listener data (top listeners get higher scores)
- Selection: Admin queries fans who chose NYC (any rank), score > 80
- Result: Fan included in NYC eligible pool, ranked by score within preference tiers

**Scenario 2: Invite-Only Event**
- Campaign: VIP fan club pre-sale with invite gate
- Fan attempts registration: Provides invite code from email
- System validates: Checks invite code against campaign's valid codes
- Registration proceeds: Fan completes form with market preference
- Confirmation: Receipt sent immediately (no PPC required for VIP)

**Scenario 3: Market Venue Change**
- Campaign: Festival announces venue change from Stadium A to Stadium B in same city
- Admin transfers: Moves all entries from MarketA (Stadium A) to MarketB (Stadium B)
- System updates: 5,000 entries updated with new primary market
- Preservation: Fans' other market preferences remain intact
- Notification: External system sends update emails to affected fans

**Scenario 4: Duplicate Phone Prevention**
- Fan A: Registers for campaign, confirms phone +1-555-1234
- Fan B: Attempts registration with same phone +1-555-1234
- Fan B confirms: Enters confirmation code
- System blocks: Detects phone already confirmed by Fan A
- Result: Fan B receives error, must use different phone number

**Scenario 5: Multi-Gate Campaign**
- Campaign: Requires linked Spotify account AND verified credit card
- Fan attempts: Logs in, starts registration
- System checks: Fan has Spotify linked ✓, no card on file ✗
- Eligibility blocked: Fan sees message to add payment card
- Fan adds card: Returns to registration, now eligible
- Registration succeeds: Both gates passed
