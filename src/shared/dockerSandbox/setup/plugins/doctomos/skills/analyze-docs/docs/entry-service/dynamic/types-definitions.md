# Type Definitions - entry-service

## GraphQL Types

### Query Types

#### entries_fanscore
**Category:** GraphQL Query

```graphql
query entries_fanscore($globalUserId: ID, $memberId: ID) {
  api {
    accountFanscore(memberId: $memberId, globalUserId: $globalUserId) {
      rawScore
    }
  }
}
```

**Input Parameters:**
- `globalUserId` (ID, optional) - Global user identifier
- `memberId` (ID, optional) - Member identifier

**Output Type:** `accountFanscore` object
- `rawScore` - The raw fanscore value

**Source:** [/app/graphql/queries/fanscore.graphql](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/graphql/queries/fanscore.graphql)

---

## JSON Schema Types

### assignCodes
**Category:** JSON Schema

```json
{
  "id": "assignCodes",
  "type": "array",
  "minItems": 1,
  "maxItems": 1000,
  "uniqueItems": true,
  "items": {
    "type": "object",
    "properties": {
      "userId": {
        "type": "string",
        "minLength": 24,
        "maxLength": 24
      },
      "code": {
        "type": "string",
        "minLength": 1
      },
      "date": {
        "type": "object",
        "properties": {
          "start": { "type": "string", "minLength": 1 },
          "end": { "type": "string" },
          "revealCode": { "type": "string" },
          "created": { "type": "string" }
        },
        "required": ["start"]
      }
    },
    "required": ["userId", "date"]
  }
}
```

**Source:** [/app/schemas/assignCodes.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/schemas/assignCodes.js)

**Usage:**
- Validates bulk code assignment operations
- Used by: [assignCodesByCampaignAndUsers](#assigncodesbycampaignandusers)

**Constraints:**
- Minimum 1 item, maximum 1000 items
- All items must be unique
- userId must be exactly 24 characters (MongoDB ObjectId)
- date.start is required

---

### verdicts
**Category:** JSON Schema (YAML)

```yaml
id: "verdicts"
type: "array"
uniqueItems: true
minItems: 1
maxItems: 1000
items:
  required:
    - "userId"
    - "isBlocked"
    - "date"
  properties:
    userId:
      type: "string"
      minLength: 24
      maxLength: 24
    isBlocked:
      type: "boolean"
    date:
      type: "string"
      minLength: 1
  additionalProperties: false
```

**Source:** [/schemas/verdicts.yml](/Users/Brodie.Balser/Documents/TM/titan/entry-service/schemas/verdicts.yml)

**Usage:**
- Validates bulk verdict save operations
- Used by: [saveVerdictsByCampaignAndUsers](#saveverdictsbycampaignandusers)

**Constraints:**
- Minimum 1 item, maximum 1000 items
- All items must be unique
- userId must be exactly 24 characters
- date must be valid ISO date string
- No additional properties allowed

---

## Enums

### preferences
**Category:** Enum

```javascript
{
  EMAIL: 'email',
  PHONE: 'phone',
  NAME: 'name',
  ZIP: 'zip',
  OPT_IN: 'opt_in',
  MARKET_SELECT: 'market_select',
  ADDITIONAL_MARKETS_SELECT: 'additional_markets_select',
  TICKET_COUNT: 'ticket_count',
  BOOLEAN_SELECT: 'boolean_select',
  FREEFORM_TEXT: 'freeform_text',
  CHECKLIST: 'checklist'
}
```

**Source:** [/app/managers/entries/enums/preferences.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/enums/preferences.js)

**Usage:**
- Defines all available campaign preference field types
- Used for field validation in entry forms
- Referenced by: [typeValidationFns](#typevalidationfns)

---

### gateTypes
**Category:** Enum

```javascript
{
  LINKED_ACCOUNT: 'linkedAccount',
  INVITE_ONLY: 'inviteOnly',
  CARD: 'card'
}
```

**Source:** [/app/managers/entries/enums/gateTypes.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/enums/gateTypes.js)

**Usage:**
- Defines campaign registration gate types
- Used for eligibility validation
- Referenced by: registration eligibility validators

---

### optIn
**Category:** Enum

```javascript
{
  ARTIST: 'allow_marketing',
  LN: 'allow_livenation',
  VF: 'allow_notification'
}
```

**Source:** [/app/managers/entries/enums/optIn.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/enums/optIn.js)

**Usage:**
- Defines opt-in field names for marketing preferences
- Used for tracking user consent
- ARTIST: Artist mailing list opt-in
- LN: Live Nation marketing opt-in
- VF: Verified Fan notifications opt-in

---

### params
**Category:** Enum

```javascript
{
  REF_CODE: 'ref_code',
  REF_URL: 'ref_url',
  REF_TAG: 'ref_tag',
  IP: 'ip',
  IP_COUNTRY: 'ip_country',
  FORWARDED_FOR: 'forwarded_for',
  USER_AGENT: 'user_agent',
  LOCALE: 'locale'
}
```

**Source:** [/app/managers/entries/enums/params.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/enums/params.js)

**Usage:**
- Defines parameter names for entry metadata
- Used for tracking referral and device information

---

### entryFilterTypes
**Category:** Enum (from @verifiedfan/lib)

**Values:**
- `WINNERS` - Entries with assigned codes, not blocked
- `CODELESS` - Entries without codes, not blocked
- `BLOCKED` - Entries marked as blocked
- `VERIFIED` - All non-blocked entries

**Usage:**
- Filters entries by status
- Used by: [listByCampaign](#listbycampaign)

**Query Mappings:**
```javascript
{
  WINNERS: {
    'presale.codes.code': { $ne: null },
    'review.isBlocked': { $ne: true }
  },
  CODELESS: {
    'presale.codes.code': null,
    'review.isBlocked': { $ne: true }
  },
  BLOCKED: {
    'review.isBlocked': true
  },
  VERIFIED: {
    'review.isBlocked': { $ne: true }
  }
}
```

**Source:** [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:31-49)

---

## MongoDB Document Types

### Entry Document
**Category:** MongoDB Document

```javascript
{
  _id: {
    campaign_id: string,  // Campaign MongoDB ObjectId
    user_id: string       // User MongoDB ObjectId
  },
  date: {
    created: Date,
    updated: Date,
    phoneConfirmed?: Date,
    marketing?: Date,
    facebook?: Date,
    twitter?: Date,
    receipt?: Date
  },
  fields: {
    email: string,
    phone: string,
    first_name: string,
    last_name: string,
    zip?: string,
    market?: string,
    optional_markets?: string[],
    wants_ticket_count?: number,
    wants_vip?: boolean,
    freeform_text?: string,
    checklist?: string[],
    allow_marketing?: boolean,
    allow_livenation?: boolean,
    allow_notification?: boolean
  },
  code: string,           // User's unique referral code
  link?: string,          // User's share link
  referrer?: {
    code?: string,        // Referrer code used
    // ... referrer details
  },
  has_twitter: boolean,
  has_facebook: boolean,
  origin?: {
    ip?: string,
    os?: string,
    browser?: string,
    device?: string
  },
  locale: string,
  attributes?: object,
  presale?: {
    codes?: Array<{
      code: string,
      codeConfigId: string,
      date: {
        start: Date,
        end?: Date,
        revealCode?: Date,
        created?: Date
      }
    }>
  },
  review?: {
    date: Date,
    isBlocked: boolean
  },
  score?: number,
  accountFanscore?: object,
  nudetect?: object       // Internal only, not exposed to users
}
```

**Composite ID:**
- Primary key: `{ campaign_id, user_id }` - Enforces one entry per user per campaign

**Source:** Inferred from [/app/managers/entries/makeNew.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/makeNew.js) and [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js)

**Created By:** [makeNew](#makenew)

**Queried By:**
- [findByCampaignAndUser](#findbycampaignanduser)
- [findByUser](#findbyuser)
- [listByCampaign](#listbycampaign)

**Modified By:**
- [modifyEntry](#modifyentry)
- [assignCodesByCampaignAndUsers](#assigncodesbycampaignandusers)
- [saveVerdictsByCampaignAndUsers](#saveverdictsbycampaignandusers)
- [transferEntries](#transferentries)

---

## Type Dependency Graph

```
Entry Creation Flow:
  User Input Data
    ├─ fields (Object)
    │   ├─ email (string) [validated by typeValidationFns.EMAIL]
    │   ├─ phone (string) [validated by typeValidationFns.PHONE]
    │   ├─ first_name (string) [validated by typeValidationFns.NAME]
    │   ├─ last_name (string) [validated by typeValidationFns.NAME]
    │   ├─ zip (string) [validated by typeValidationFns.ZIP]
    │   ├─ market (string) [validated by typeValidationFns.MARKET_SELECT]
    │   ├─ optional_markets (array) [validated by typeValidationFns.ADDITIONAL_MARKETS_SELECT]
    │   ├─ wants_ticket_count (number) [validated by typeValidationFns.TICKET_COUNT]
    │   ├─ wants_vip (boolean) [validated by typeValidationFns.BOOLEAN_SELECT]
    │   ├─ freeform_text (string) [validated by typeValidationFns.FREEFORM_TEXT]
    │   ├─ checklist (array) [validated by typeValidationFns.CHECKLIST]
    │   └─ opt-in fields (boolean) [validated by typeValidationFns.OPT_IN]
    ├─ referrer (Object) [validated by validateReferrerInfo]
    ├─ origin (Object)
    │   ├─ ip (string) [from validateIpInfo]
    │   ├─ os (string) [from validateUserAgent]
    │   ├─ browser (string) [from validateUserAgent]
    │   └─ device (string) [from validateUserAgent]
    └─ attributes (Object) [from getEligibleLinkedAttributes]
     ↓ transforms via makeNew ↓
  Entry Document (MongoDB)
    └─ Additional computed fields added:
        ├─ _id (composite key)
        ├─ date (Object with timestamps)
        ├─ code (string from user.code)
        ├─ link (string, computed)
        ├─ has_twitter (boolean)
        └─ has_facebook (boolean)
     ↓ normalized via forUser ↓
  Entry Response (to user)
    ├─ Flattened compound ID
    ├─ nudetect score removed
    ├─ Premature presale codes hidden
    └─ First presale code backfilled to root

Code Assignment Flow:
  assignCodes Schema (JSON)
    └─ Array of assignments
        ├─ userId (string, 24 chars)
        ├─ code (string)
        └─ date (Object)
            └─ start (string, required)
     ↓ processed by assignCodesByCampaignAndUsers ↓
  Entry Document Updates
    └─ presale.codes array updated

Verdict Flow:
  verdicts Schema (YAML)
    └─ Array of verdicts
        ├─ userId (string, 24 chars)
        ├─ isBlocked (boolean)
        └─ date (string, ISO format)
     ↓ processed by saveVerdictsByCampaignAndUsers ↓
  Entry Document Updates
    └─ review object updated

Fanscore Query Flow:
  entries_fanscore Query (GraphQL)
    ├─ globalUserId (ID)
    └─ memberId (ID)
     ↓ queries external API ↓
  accountFanscore Response
    └─ rawScore (number)
```
