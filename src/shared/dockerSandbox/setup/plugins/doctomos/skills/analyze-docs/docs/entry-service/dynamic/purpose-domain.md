# Domain Concepts - entry-service

## Core Entities

| Entity | Description |
|--------|-------------|
| **Entry** | A fan's registration for a specific campaign. Contains personal data, market preferences, opt-ins, timestamps, phone confirmation status, and fraud scoring. Unique per campaignId + userId. |
| **Scoring Record** | Third-party scoring data for a fan in a campaign. Includes eligibility score, verdict (pass/fail), market preferences, and selection codes. Used to rank fans for ticket allocation. Linked to entries via phone number. |
| **Campaign** | Campaign configuration retrieved from campaign-service. Defines registration gates, markets, phone confirmation requirements, and eligibility rules. Not stored in entry-service. |
| **Market** | A venue/location option within a campaign (e.g., "New York", "Los Angeles"). Fans rank up to 4 market preferences. Markets retrieved from campaign-service. |
| **User** | Fan account information retrieved from user-service. Includes userId, email, linked social accounts, verification codes, and payment card status. |
| **Phone Confirmation** | Verification process using SMS one-time codes. Ensures phone uniqueness per campaign and prevents duplicate registrations. Tracked via `date.phoneConfirmed` timestamp. |
| **Referrer** | Information about how fan discovered campaign (direct link, social share, influencer code). Stored with entry for attribution tracking. |
| **Invite** | Unique code required for invite-only campaigns. Validated against campaign's invite list during registration eligibility check. |
| **Code Assignment** | Ticket/access code allocated to a selected fan. Stored in both entries and scoring collections. Indicates fan has been selected for offer. |
| **Verdict** | Binary eligibility flag in scoring records. True = eligible for selection, False = filtered out (fraud, duplicates, etc.). |

## Business Rules

### Entry Management Rules
- **ENT-001**: Entry IDs are composite keys: `{ campaign_id, user_id }`
- **ENT-002**: Entries can only be created if campaign status allows registration
- **ENT-003**: Entry updates preserve creation date but update `date.updated` timestamp
- **ENT-004**: Phone number changes on updates reset `date.phoneConfirmed` to null if PPC enabled
- **ENT-005**: Entry market preferences stored as array: `[primary, optional1, optional2, optional3]`
- **ENT-006**: Maximum 4 market preferences per entry (1 primary + 3 optional)
- **ENT-007**: Entries track fraud scores from Nudetect and account fanscores
- **ENT-008**: Entry locale determined by campaign configuration, not fan profile

### Phone Confirmation Rules
- **PHN-001**: Phone confirmation required if campaign has `needsPhoneConfirmation` flag
- **PHN-002**: Confirmed phone numbers must be unique per campaign
- **PHN-003**: Phone confirmation uses encrypted JWT tokens with expiration
- **PHN-004**: Confirmation validates JWT contains matching phone, campaign, and is not expired
- **PHN-005**: Existing phone confirmation by another user blocks new confirmation attempts
- **PHN-006**: Mexican phone numbers normalized to handle +521 vs +52 variants
- **PHN-007**: Receipts only sent after phone confirmation (or if PPC disabled)

### Eligibility Rules
- **ELIG-001**: Existing entries always eligible for updates (skip gate checks)
- **ELIG-002**: New entries must pass all campaign gate validations
- **ELIG-003**: Linked account gates check specific platforms (Facebook, Twitter, Tumblr, Spotify)
- **ELIG-004**: Invite-only gates require valid invite code matching campaign
- **ELIG-005**: Card gates require verified payment card on user account
- **ELIG-006**: Past participation gates check user's entry history
- **ELIG-007**: Users without referral codes rejected if campaign enforces codes

### Scoring Rules
- **SCR-001**: Scoring records identified by composite key: `{ campaign_id, globalUserId }`
- **SCR-002**: Scoring records can only be created for phone-confirmed entries
- **SCR-003**: Phone numbers used to match scoring uploads to existing entries
- **SCR-004**: Scoring enrichment adds entry fields: userId, name, email, phone, marketIds
- **SCR-005**: Scoring queries filter by verdict = true unless specified otherwise
- **SCR-006**: Score ranges are inclusive (minScore <= score <= maxScore)
- **SCR-007**: Market eligibility checks if marketId exists in scoring.marketIds array (any rank)
- **SCR-008**: Previous selection status determined by presence of codes in scoring record
- **SCR-009**: Random selection uses `randomScore` field instead of actual score
- **SCR-010**: Scoring tags support custom filtering (e.g., filter lists, exclusions)

### Transfer Rules
- **XFR-001**: Transfers only allowed by supreme users
- **XFR-002**: Transfers preserve overall preference structure (move market, don't delete)
- **XFR-003**: If primary market = source AND target not in optionals: move to primary
- **XFR-004**: If primary market = source AND target in optionals: move to primary, remove from optionals
- **XFR-005**: If source in optionals AND target already present: remove source from optionals
- **XFR-006**: If source in optionals AND target not present: replace source with target in optionals
- **XFR-007**: All transferred entries get updated `date.updated` timestamp

### Data Publication Rules
- **PUB-001**: All entry creates/updates publish to Kinesis campaignDataStream
- **PUB-002**: Kinesis records partitioned by campaignId + phoneNumber
- **PUB-003**: Published data includes user, entry, market, campaign, and fraud (nudetect) data
- **PUB-004**: Kinesis publish failures logged but don't fail entry operation
- **PUB-005**: Scoring retry queue message sent if entry lacks scores after creation

## Terminology

| Term | Definition |
|------|------------|
| **Entry** | A fan's registration record for a specific campaign |
| **PPC** | Phone Per Campaign - requirement that fans confirm phone via SMS |
| **Market** | A venue/location option within a campaign (e.g., city, stadium) |
| **Market Preference** | Fan's ranked choice of markets (primary + up to 3 optionals) |
| **Verdict** | Eligibility flag in scoring (true = eligible, false = filtered) |
| **Supreme User** | Admin user with elevated privileges for campaign management |
| **Gate** | Eligibility requirement for registration (invite, linked account, card) |
| **Fanscore** | Account-level reputation score from user's behavior history |
| **Nudetect** | Fraud detection service that scores entries for suspicious activity |
| **Referrer** | Source attribution for how fan discovered campaign |
| **Invite Code** | Unique code required for invite-only campaign access |
| **Code Assignment** | Ticket/access code allocated to selected fan |
| **Scoring Record** | Third-party eligibility/ranking data for fan in campaign |
| **globalUserId** | Universal fan identifier across campaigns |
| **Phone Confirmation** | SMS verification process to ensure phone ownership |
| **Filter Type** | Entry list category (winners, codeless, blocked, verified) |
| **Registration Eligibility** | Determination if fan can register for campaign |
| **Selection** | Process of allocating tickets/codes to eligible fans |
| **Transfer** | Moving entries from one market to another |
| **Optional Markets** | Secondary venue preferences beyond primary choice |

## Data Models

### Entry Document Schema

```javascript
{
  _id: {
    campaign_id: String,  // Campaign identifier
    user_id: String       // Fan user identifier
  },
  fields: {
    email: String,
    first_name: String,
    last_name: String,
    phone: String,        // E.164 format
    market: String,       // Primary market preference
    optional_markets: [String],  // Up to 3 additional preferences
    optin_email: Boolean,
    optin_sms: Boolean,
    optin_share: Boolean,
    // Additional custom campaign fields
  },
  date: {
    created: Date,
    updated: Date,
    phoneConfirmed: Date,  // Null until phone confirmed
    receipt: Date          // When receipt email sent
  },
  code: String,           // User's referral code
  link: String,           // User's referral link
  referrer: {
    code: String,         // Referrer's code if referred
    userId: String        // Referrer's user ID
  },
  locale: String,         // Campaign locale (e.g., "en-US")
  score: Number,          // Aggregate score from bonuses
  accountFanscore: Number, // User account reputation score
  nudetect: {             // Fraud detection data
    score: Number,
    signals: Object
  },
  attributes: {           // Gate-specific attributes
    linkedAccount: Object,
    inviteOnly: String,
    card: Object
  },
  presale: {
    codes: [{
      code: String,
      codeConfigId: String,
      date: Date
    }]
  },
  review: {
    isBlocked: Boolean,
    date: Date
  }
}
```

### Scoring Record Schema

```javascript
{
  _id: {
    campaign_id: String,
    globalUserId: String  // Universal fan identifier
  },
  user_id: String,        // Campaign-specific user ID
  memberId: String,       // TM member ID if linked
  name: {
    first: String,
    last: String
  },
  email: String,
  phone: {
    number: String,       // E.164 format
    type: String          // "mobile", "landline", etc.
  },
  score: Number,          // Eligibility/ranking score
  randomScore: Number,    // Random score for lottery selection
  verdict: Boolean,       // True = eligible, False = filtered
  locale: String,
  marketIds: [String],    // Ranked market preferences from entry
  codes: [{               // Allocated codes/tickets
    id: String,
    marketId: String
  }],
  tags: {                 // Custom filter tags
    [tagName]: Boolean
  }
}
```

### Market Preference Array

```javascript
// Entry fields.market + fields.optional_markets
// Logical structure:
[
  "market1",    // Rank 0 (Primary preference)
  "market2",    // Rank 1 (First optional)
  "market3",    // Rank 2 (Second optional)
  "market4"     // Rank 3 (Third optional)
]

// Stored as:
{
  "fields.market": "market1",
  "fields.optional_markets": ["market2", "market3", "market4"]
}
```

### API Request/Response Models

**Upsert Entry Request:**
```javascript
POST /:campaignId/entries
{
  email: String,
  first_name: String,
  last_name: String,
  phone: String,
  market: String,
  optional_markets: [String],
  optin_email: Boolean,
  optin_sms: Boolean,
  referralCode: String,  // Optional referrer code
  locale: String,
  // Custom campaign fields...
}
```

**Entry Response:**
```javascript
{
  id: String,
  email: String,
  firstName: String,
  lastName: String,
  phone: String,
  market: String,
  optionalMarkets: [String],
  optinEmail: Boolean,
  optinSms: Boolean,
  phoneConfirmed: Boolean,
  dateCreated: String,
  dateUpdated: String,
  code: String,
  link: String,
  score: Number,
  is_new: Boolean  // True if just created
}
```

**Eligibility Query Response:**
```javascript
GET /:campaignId/entries/eligibility
{
  count: Number,           // Total eligible fans
  byMarket: [{
    marketId: String,
    count: Number,
    countsByPreferenceRank: [
      { rank: 0, count: Number },  // Primary preference
      { rank: 1, count: Number },  // First optional
      { rank: 2, count: Number },  // Second optional
      { rank: 3, count: Number }   // Third optional
    ]
  }]
}
```

**Scoring Upsert Request:**
```javascript
POST /:campaignId/entries/scoring
{
  records: [{
    phone: String,         // Required - matches to entry
    score: Number,         // Required
    verdict: Boolean,      // Optional - defaults true
    randomScore: Number    // Optional - for lottery
  }]
}
```

**Scoring Query Response:**
```javascript
GET /:campaignId/entries/scoring?marketId=X&minScore=Y&maxScore=Z
{
  list: [{
    _id: { globalUserId: String },
    user_id: String,
    name: { first: String, last: String },
    email: String,
    phone: { number: String, type: String },
    score: Number,
    verdict: Boolean,
    locale: String,
    marketIds: [String],
    codes: [Object]
  }],
  counts: {
    total: Number
  }
}
```

## Entity Relationships

```
Campaign (external)
  ↓ defines
Entry (1:N with User)
  - stores fan registration
  - linked by campaign_id + user_id
  - contains market preferences
  - has phone confirmation status
  ↓ matched by phone
Scoring Record (1:1 with Entry)
  - stores eligibility/ranking data
  - linked by campaign_id + globalUserId
  - enriched with entry data
  - used for selection queries

User (external)
  ↓ owns
Entry (N per user across campaigns)
  ↓ generates
Kinesis Event (published on create/update)
  ↓ consumed by
Analytics/Scoring Systems (downstream)

Market (external)
  ↓ selected by
Entry (N:M - entries can select multiple markets)
  ↓ ranked in
Market Preference Array (stored in entry.fields)
```

## Key Data Transformations

### Entry Creation Flow
```
User Input (form data)
  → Validate campaign status
  → Validate eligibility gates
  → Validate/format fields (phone E.164, email lowercase)
  → Resolve phone auto-confirmation (if qualified)
  → Create entry document with timestamps
  → Insert to MongoDB
  ↓
Entry Document
  → Query Nudetect for fraud score
  → Query user service for fanscore
  → Update entry with scores
  ↓
Enriched Entry
  → Format for Kinesis (add market, campaign data)
  → Publish to campaignDataStream
  → Send receipt email (if phone confirmed)
  ↓
Final Entry Response (normalized for client)
```

### Scoring Upload Flow
```
Admin CSV Upload
  → Parse records (phone, score, verdict)
  → Normalize phone numbers (E.164)
  → Filter confirmed phones only
  ↓
Phone List
  → Query entries by campaign + phones
  → Match records to entries
  ↓
Matched Records
  → Enrich with entry data (userId, name, email, marketIds)
  → Format for scoring collection
  ↓
Scoring Documents
  → Bulk upsert to MongoDB
  → Log unmatched records
  ↓
Upload Summary Response
```

### Eligibility Query Flow
```
Admin Selection Criteria
  → market(s), score range, selection status
  ↓
MongoDB Aggregation Query
  → Filter by campaign_id
  → Filter by verdict = true (unless specified)
  → Filter by score >= minScore AND score <= maxScore
  → Filter by marketId in marketIds array
  → Filter by codes presence (if selectedOnly/reassign)
  → Sort by score descending (or randomScore)
  → Apply pagination (skip, limit)
  ↓
Eligible Fan List
  → Project needed fields (user, contact, score)
  → Return with count metadata
```

### Market Transfer Flow
```
Admin Transfer Request
  → fromMarketId, toMarketId, campaignId
  ↓
MongoDB Bulk Operations
  → Find entries with primary = from, no target in optionals
    - Set primary = target
  → Find entries with primary = from, target in optionals
    - Set primary = target
    - Remove target from optionals
  → Find entries with from in optionals, target already present
    - Remove from from optionals
  → Find entries with from in optionals, target not present
    - Replace from with target in optionals
  → Update all matched with updated timestamp
  ↓
Transfer Complete
  → Return count of modified entries
```
