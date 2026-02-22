# Type Usage Patterns - entry-service

## Function Signatures

### Exported Functions with Object Parameters

#### upsert
**Confidence:** 95% High

```javascript
async function upsert(managerCtx, {
  campaignId: string,
  userId: string,
  token: string,
  data: object
}): Promise<NormalizedEntry>
```

**Source:** [/app/managers/entries/upsert.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/upsert.js:144)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required) - Manager context with datastore, services, correlation
- `campaignId` (string, required) - Campaign MongoDB ObjectId
- `userId` (string, required) - User MongoDB ObjectId
- `token` (string, required) - JWT authentication token
- `data` (object, required) - Entry field values and metadata
  - `data[inputParamMap.LOCALE]` (string, optional) - User's locale preference
  - `data.fields` (object) - Campaign field values (validated by validateFields)
  - `data.ref_code` (string, optional) - Referral code
  - `data.ref_url` (string, optional) - Referral URL
  - `data.ip` (string, optional) - User IP address
  - `data.user_agent` (string, optional) - User agent string

**Return Type:** Promise<NormalizedEntry>
- Flattened entry document with compound ID split
- nudetect score removed
- Premature presale codes hidden

**Called By:**
- Entry API endpoint handlers

**Calls:**
- [validateFields](#validatefields) - Field validation
- [validateReferrerInfo](#validatereferrerinfo) - Referrer validation
- [registrationEligibility](#registrationeligibility) - Gate checks
- [makeNew](#makenew) or [update](#update) - Create/update entry
- [normalize](#normalize) - Response normalization

**Confidence Note:** Explicit parameter destructuring with JSDoc comments

---

#### makeNew
**Confidence:** 98% High

```javascript
function makeNew(managerCtx, {
  campaignId: string,
  user: object,
  fields: object,
  code: string,
  link?: string,
  referrer?: object,
  ip?: string,
  os?: string,
  browser?: string,
  device?: string,
  locale: string,
  phoneConfirmedDate?: Date,
  attributes?: object
}): EntryDocument
```

**Source:** [/app/managers/entries/makeNew.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/makeNew.js:34)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `campaignId` (string, required) - Campaign ID
- `user` (object, required) - User object
  - `user.id` (string) - User MongoDB ObjectId
- `fields` (object, required) - Validated campaign fields
- `code` (string, required) - User's unique referral code
- `link` (string, optional) - User's share link
- `referrer` (object, optional, default: {}) - Referrer information
- `ip` (string, optional, default: null) - User IP address
- `os` (string, optional, default: null) - Operating system
- `browser` (string, optional, default: null) - Browser name
- `device` (string, optional, default: null) - Device type
- `locale` (string, required) - Locale code
- `phoneConfirmedDate` (Date, optional) - Phone confirmation timestamp
- `attributes` (object, optional, default: null) - Gated attributes

**Return Type:** EntryDocument
- Complete MongoDB entry document ready for insertion
- Includes composite `_id`, computed dates, integration flags

**Called By:**
- [upsert (create branch)](#upsert)

**Calls:**
- `make_id` - Create composite MongoDB ID
- `checkIntegrations` - Check user's social integrations
- `makeDateObj` - Generate timestamp object
- `makeOrigin` - Package device/IP info

**Confidence Note:** Explicit TypeScript-style parameter destructuring with defaults

---

#### validateFields
**Confidence:** 90% High

```javascript
async function validateFields(managerCtx, {
  campaign: object,
  user: object,
  token: string,
  data: object,
  existingEntry?: object
}): Promise<object>
```

**Source:** [/app/managers/entries/validators/fields.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/validators/fields.js:27)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `campaign` (object, required) - Campaign document
- `user` (object, required) - User document
- `token` (string, required) - JWT token
- `data` (object, required) - User input data
- `existingEntry` (object, optional) - Existing entry if updating

**Return Type:** Promise<object>
- Validated and normalized field values
- Email/phone may be overridden from user integrations
- All fields validated per campaign preferences

**Called By:**
- [upsert (create)](#upsert)
- [upsert (update)](#upsert)

**Calls:**
- [validatePreferences](#validatepreferences) - Validate each field
- `maybeOverrideFields` - Override with TM profile data
- [throwIfPhoneConfirmationInvalid](#throwifphoneconfirmationinvalid) - PPC validation

**Confidence Note:** JSDoc comments with explicit parameter types

---

#### listByCampaign
**Confidence:** 95% High

```javascript
async function listByCampaign(managerCtx, {
  campaignId: string,
  isSupremeUser: boolean,
  filterType?: string,
  market?: string,
  codeConfigId?: string,
  skip?: number,
  limit?: number
}): Promise<Array<NormalizedEntry>>
```

**Source:** [/app/managers/entries/listByCampaign.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/listByCampaign.js:38)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `campaignId` (string, required) - Campaign MongoDB ObjectId
- `isSupremeUser` (boolean, required) - User permission flag
- `filterType` (string, optional, default: null) - Entry filter (WINNERS/CODELESS/BLOCKED/VERIFIED)
- `market` (string, optional, default: null) - Filter by market ID
- `codeConfigId` (string, optional, default: null) - Filter by code config
- `skip` (number, optional, default: null) - Pagination offset
- `limit` (number, optional, default: null) - Pagination limit (max 10000)

**Return Type:** Promise<Array<NormalizedEntry>>
- Array of normalized entry documents
- Filtered by specified criteria
- Paginated results

**Called By:**
- Entry list API endpoint handlers

**Calls:**
- `validateFilter` - Validate filter type
- `validatePaging` - Validate pagination params
- `datastore.entries.listByCampaign` - Query database
- [normalizeList](#normalizelist) - Normalize results

**Confidence Note:** Explicit parameter destructuring with JSDoc comments

---

#### assignCodesByCampaignAndUsers
**Confidence:** 95% High

```javascript
async function assignCodesByCampaignAndUsers(managerCtx, {
  campaignId: string,
  isSupremeUser: boolean,
  assignments: Array<{
    userId: string,
    code?: string,
    date: {
      start: string,
      end?: string,
      revealCode?: string,
      created?: string
    },
    codeConfigId: string,
    globalUserId?: string
  }>
}): Promise<{
  count: {
    input: number,
    assigned: number,
    scoring: object
  }
}>
```

**Source:** [/app/managers/entries/assignCodes.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/assignCodes.js:43)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `campaignId` (string, required) - Campaign MongoDB ObjectId
- `isSupremeUser` (boolean, required) - User permission flag
- `assignments` (array, required) - Array of code assignments
  - `assignments[].userId` (string, required, 24 chars) - User MongoDB ObjectId
  - `assignments[].code` (string, optional) - Presale code (auto-generated if missing)
  - `assignments[].date` (object, required) - Date configuration
    - `date.start` (string, required) - Presale start date (ISO format)
    - `date.end` (string, optional) - Presale end date
    - `date.revealCode` (string, optional) - Code reveal date
    - `date.created` (string, optional) - Assignment creation date
  - `assignments[].codeConfigId` (string, required) - Code configuration ID
  - `assignments[].globalUserId` (string, optional) - Global user ID for scoring

**Return Type:** Promise<CountResult>
- `count.input` - Number of assignments submitted
- `count.assigned` - Number of entries updated
- `count.scoring` - Scoring system update result

**Called By:**
- Bulk code assignment API endpoint

**Calls:**
- `throwIfInvalidCodeAssignments` - Schema validation
- `maybePopulateCode` - Generate codes if missing
- `filterValidAssignments` - Remove invalid assignments
- `datastore.entries.assignCodesByCampaignAndUsers` - Update entries
- `datastore.scoring.upsertCodes` - Update scoring records

**Confidence Note:** Explicit parameter destructuring with schema validation

---

#### saveVerdictsByCampaignAndUsers
**Confidence:** 95% High

```javascript
async function saveVerdictsByCampaignAndUsers(managerCtx, {
  campaignId: string,
  isSupremeUser: boolean,
  verdicts: Array<{
    userId: string,
    date: string,
    isBlocked: boolean
  }>
}): Promise<{
  count: {
    input: number,
    saved: number
  }
}>
```

**Source:** [/app/managers/entries/saveVerdicts.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/saveVerdicts.js:30)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `campaignId` (string, required) - Campaign MongoDB ObjectId
- `isSupremeUser` (boolean, required) - User permission flag
- `verdicts` (array, required) - Array of user verdicts
  - `verdicts[].userId` (string, required, 24 chars) - User MongoDB ObjectId
  - `verdicts[].date` (string, required) - Verdict date (ISO format)
  - `verdicts[].isBlocked` (boolean, required) - Block status

**Return Type:** Promise<CountResult>
- `count.input` - Number of verdicts submitted
- `count.saved` - Number of entries updated

**Called By:**
- Bulk verdict save API endpoint

**Calls:**
- `throwIfInvalidSchema` - Schema validation
- `throwIfInvalidDates` - Date format validation
- `datastore.entries.saveVerdictsByCampaignAndUsers` - Update entries

**Confidence Note:** Explicit parameter destructuring with schema validation

---

#### AttachUsers
**Confidence:** 92% High

```javascript
function AttachUsers({
  managerCtx: ManagerContext,
  token: string,
  ensureExists?: boolean
}): (records: Array<{entry: object}>) => Promise<Array<{
  entry: object,
  user: {
    id: string,
    integrations: {
      ticketmaster: {
        globalUserId: string,
        phone: string
      }
    }
  }
}>>
```

**Source:** [/app/managers/entries/saveEntries/normalize.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/saveEntries/normalize.js:48)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `token` (string, required) - JWT token
- `ensureExists` (boolean, optional, default: true) - Create users if missing

**Return Type:** Function that transforms records
- Input: Array of `{entry: object}` records
- Output: Promise<Array> with user data attached

**Called By:**
- Entry batch save operations

**Calls:**
- `GetAndMergeUsers` - Batch fetch user IDs
- `mergeEntriesWithUserIds` - Merge user data into records

**Confidence Note:** Ramda pipeline with explicit function composition

---

#### AttachCampaigns
**Confidence:** 92% High

```javascript
function AttachCampaigns({
  managerCtx: ManagerContext,
  token: string
}): (records: Array<{
  entry: object,
  user?: object
}>) => Promise<Array<{
  entry: object,
  user?: object,
  campaign: object
}>>
```

**Source:** [/app/managers/entries/saveEntries/normalize.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/saveEntries/normalize.js:58)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)
- `token` (string, required) - JWT token

**Return Type:** Function that transforms records
- Input: Array of records with entry and optional user
- Output: Promise<Array> with campaign data attached

**Called By:**
- Entry batch save operations

**Calls:**
- `MemoizedGetCampaign` - Cached campaign fetcher
- `managerCtx.service.campaigns.getCampaign` - Campaign service call

**Confidence Note:** Ramda pipeline with memoization

---

#### AttachExistingEntry
**Confidence:** 95% High

```javascript
async function AttachExistingEntry({
  managerCtx: ManagerContext
}): ({
  entry: object,
  user: {id: string},
  ...rest: object
}) => Promise<{
  entry: object,
  user: {id: string},
  existingEntry?: object,
  ...rest: object
}>
```

**Source:** [/app/managers/entries/saveEntries/normalize.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/saveEntries/normalize.js:69)

**Parameter Shape:**
- `managerCtx` (ManagerContext, required)

**Return Type:** Async function that transforms a record
- Input: Record with entry and user
- Output: Promise<Record> with existingEntry attached (if found)

**Called By:**
- Entry batch save operations

**Calls:**
- `datastore.entries.findByCampaignAndUser` - Find existing entry

**Confidence Note:** Explicit async function with parameter destructuring

---

## Validation Functions

### typeValidationFns
**Confidence:** 98% High

Object mapping preference types to validation functions.

**Source:** [/app/managers/entries/validators/preferences/typeValidationFns.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/validators/preferences/typeValidationFns.js:79)

#### EMAIL Validator
```javascript
async (managerCtx, {
  inputVal: string,
  preferenceId: string
}): Promise<string>
```
- Validates email format
- Normalizes to lowercase
- Throws `EntryInvalidField` if invalid

#### PHONE Validator
```javascript
async (managerCtx, {
  inputVal: string,
  preferenceId: string
}): Promise<string>
```
- Validates phone format (E.164)
- Normalizes phone number
- Throws `EntryInvalidField` if invalid

#### NAME Validator
```javascript
(managerCtx, {
  inputVal: string,
  preferenceId: string
}): string
```
- Validates name is non-empty after trim
- Throws `EntryEmptyField` if empty

#### ZIP Validator
```javascript
(managerCtx, {
  inputVal: string,
  preferenceId: string
}): string
```
- Validates ZIP/postal code is non-empty after trim
- Returns trimmed value
- Throws `EntryInvalidField` if empty

#### MARKET_SELECT Validator
```javascript
async (managerCtx, {
  inputVal: string,
  campaign: object,
  jwt: string
}): Promise<string>
```
- Validates market ID exists in campaign
- Queries campaign service for valid markets
- Throws `EntryInvalidDestinationCity` if invalid

#### ADDITIONAL_MARKETS_SELECT Validator
```javascript
async (managerCtx, {
  inputVal: string[] | null,
  campaign: object,
  preference: object,
  jwt: string
}): Promise<string[]>
```
- Validates array of market IDs
- Checks max length constraint
- Checks for duplicates
- Validates all markets exist in campaign
- Returns empty array if falsey input
- Throws various errors for validation failures

#### TICKET_COUNT Validator
```javascript
(managerCtx, {
  inputVal: string | number,
  preferenceId: string,
  preference: {
    additional: {
      min: number,
      max: number
    }
  }
}): number
```
- Validates integer value
- Checks min/max range
- Throws `EntryInvalidTicketCount` or `EntryInvalidTicketCountInRange`

#### BOOLEAN_SELECT Validator
```javascript
async (managerCtx, {
  inputVal: any,
  preferenceId: string
}): Promise<boolean>
```
- Normalizes to boolean
- Accepts: true, false, 'true', 'false', 1, 0
- Throws `EntryInvalidBoolean` if invalid

#### FREEFORM_TEXT Validator
```javascript
(managerCtx, {
  inputVal: string,
  preferenceId: string,
  preference: {
    additional: {
      minLength: number,
      maxLength: number
    }
  }
}): string
```
- Validates text length range
- UTF-8 encodes the text
- Throws `EntryEmptyField` or `EntryInvalidFreeFormTextInRange`

#### CHECKLIST Validator
```javascript
(managerCtx, {
  inputVal: string[],
  preferenceId: string,
  preference: {
    additional: {
      items: Array<{id: string}>
    }
  }
}): string[]
```
- Validates checklist values against allowed items
- Normalizes (trims, removes empty)
- Throws `CampaignMissingChecklistItems` or `EntryInvalidChecklistVals`

#### OPT_IN Validator
```javascript
async (managerCtx, {
  inputVal: any,
  preferenceId: string
}): Promise<boolean>
```
- Same as BOOLEAN_SELECT validator
- Validates opt-in checkbox values

**Called By:**
- [validatePreferences](#validatepreferences)

**Confidence Note:** Explicit function signatures with JSDoc

---

## Datastore Functions

### findByCampaignAndUser
**Confidence:** 100% High

```javascript
async function findByCampaignAndUser({
  campaignId: string,
  userId: string
}): Promise<EntryDocument | null>
```

**Source:** [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:58)

**Parameter Shape:**
- `campaignId` (string, required) - Campaign MongoDB ObjectId
- `userId` (string, required) - User MongoDB ObjectId

**Return Type:** Promise<EntryDocument | null>
- Entry document if found
- null if not found

**Called By:**
- [upsert](#upsert) - Check for existing entry
- [AttachExistingEntry](#attachexistingentry)

**Calls:**
- `DataStore.findOne` - MongoDB findOne query

**Query:**
```javascript
{ _id: { campaign_id: campaignId, user_id: userId } }
```

**Confidence Note:** Explicit function signature

---

### modifyEntry
**Confidence:** 100% High

```javascript
async function modifyEntry(
  _id: {campaign_id: string, user_id: string},
  setProps: object,
  scoreDiff?: number
): Promise<EntryDocument>
```

**Source:** [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:95)

**Parameter Shape:**
- `_id` (object, required) - Composite MongoDB ID
  - `campaign_id` (string) - Campaign ID
  - `user_id` (string) - User ID
- `setProps` (object, required) - Fields to update via $set
- `scoreDiff` (number, optional, default: 0) - Score increment/decrement

**Return Type:** Promise<EntryDocument>
- Updated entry document

**Called By:**
- [update](#update) (from upsert.js)

**Calls:**
- `DataStore.findOneAndUpdate` - MongoDB findOneAndUpdate

**Update Operation:**
```javascript
{
  $set: { ...setProps, 'date.updated': new Date() },
  ...(scoreDiff && { $inc: { score: scoreDiff } })
}
```

**Confidence Note:** Explicit function signature with JSDoc

---

### insertEntry
**Confidence:** 100% High

```javascript
async function insertEntry({
  entry: EntryDocument
}): Promise<EntryDocument>
```

**Source:** [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:60)

**Parameter Shape:**
- `entry` (EntryDocument, required) - Complete entry document

**Return Type:** Promise<EntryDocument>
- Inserted document

**Called By:**
- [create](#create) (from upsert.js)

**Calls:**
- `DataStore.insertOne` - MongoDB insertOne
- `selectInsertedDocument` - Extract result

**Confidence Note:** Explicit function signature

---

### listByCampaign
**Confidence:** 100% High

```javascript
async function listByCampaign({
  campaignId: string,
  market?: string,
  codeConfigId?: string,
  filterType?: string,
  skip?: number,
  limit?: number
}): Promise<EntryDocument[]>
```

**Source:** [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:103)

**Parameter Shape:**
- `campaignId` (string, required) - Campaign MongoDB ObjectId
- `market` (string, optional, default: null) - Market ID filter
- `codeConfigId` (string, optional, default: null) - Code config filter
- `filterType` (string, optional, default: null) - Entry filter type
- `skip` (number, optional, default: 0) - Pagination offset
- `limit` (number, optional, default: 0) - Pagination limit (0 = no limit)

**Return Type:** Promise<EntryDocument[]>
- Array of matching entries

**Called By:**
- [listByCampaign manager function](#listbycampaign)

**Query Construction:**
```javascript
{
  '_id.campaign_id': campaignId,
  ...(filterType && queryByFilter[filterType]),
  ...(codeConfigId && { 'presale.codes.codeConfigId': codeConfigId }),
  ...(market && { 'fields.market': market })
}
```

**Confidence Note:** Explicit function signature with JSDoc

---

## Normalizer Functions

### normalize (forUser)
**Confidence:** 95% High

```javascript
function normalize({
  entry: EntryDocument
}): NormalizedEntry
```

**Source:** [/app/managers/entries/normalizers/forUser.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/normalizers/forUser.js:55)

**Parameter Shape:**
- `entry` (EntryDocument, required) - Raw entry document

**Return Type:** NormalizedEntry
- Entry with compound ID flattened
- nudetect score removed
- Premature presale codes hidden
- First presale code backfilled to root level

**Called By:**
- [upsert](#upsert) - Before returning to user

**Pipeline Steps:**
1. `R.prop('entry')` - Extract entry from wrapper
2. `flattenCompoundId` - Split `_id` into `campaign_id` and `user_id`
3. `retractNudetectScore` - Remove `nudetect` field
4. `overwritePresaleCodes` - Filter out premature codes
5. `backfillPresaleCode` - Copy first code to root level

**Confidence Note:** Ramda pipeline with explicit transformations

---

### normalizeList (forList)
**Confidence:** 90% Medium

```javascript
function normalizeList({
  entries: EntryDocument[],
  codeConfigId?: string
}): NormalizedEntry[]
```

**Source:** Referenced in [/app/managers/entries/listByCampaign.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/listByCampaign.js:52)

**Parameter Shape:**
- `entries` (array, required) - Array of entry documents
- `codeConfigId` (string, optional) - Code config ID for filtering

**Return Type:** NormalizedEntry[]
- Array of normalized entries

**Called By:**
- [listByCampaign](#listbycampaign)

**Confidence Note:** Inferred from usage, actual implementation not read

---

## Common Patterns

### Pattern: Composite MongoDB ID

**Description:** Entry documents use a composite primary key combining campaign ID and user ID. This enforces one entry per user per campaign at the database level.

**Example Usage:**
```javascript
// Creating composite ID
const _id = make_id({ campaignId, userId });
// Result: { campaign_id: "507f1f77bcf86cd799439011", user_id: "507f191e810c19729de860ea" }

// Querying by composite ID
await DataStore.findOne({ _id: make_id({ campaignId, userId }) });

// Querying by campaign
await DataStore.find({ '_id.campaign_id': campaignId });

// Querying by user
await DataStore.find({ '_id.user_id': userId });
```

**Found In:**
- [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:27)
- [/app/managers/entries/makeNew.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/makeNew.js:53)

---

### Pattern: Validation Pipeline

**Description:** Entry field validation uses a pipeline that validates each preference field using type-specific validation functions, then applies overrides from user's Ticketmaster profile.

**Example Usage:**
```javascript
// 1. Validate each preference field against campaign spec
const validatedFields = await validatePreferences(managerCtx, {
  jwt: token,
  data,
  campaign,
  existingEntry
});

// 2. Override email/phone from TM profile if applicable
const overrideFields = maybeOverrideFields({ campaign, user });

// 3. Merge: existing → validated → overrides
const fields = {
  ...existingEntry && existingEntry.fields,
  ...validatedFields,
  ...overrideFields
};

// 4. Phone confirmation validation
await throwIfPhoneConfirmationInvalid(managerCtx, {
  fields,
  campaign,
  user,
  existingEntry
});

// 5. Sync back to user service
await managerCtx.service.users.updateFromEntryFields({ fields, token });
```

**Found In:**
- [/app/managers/entries/validators/fields.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/validators/fields.js)

---

### Pattern: Batch Operations with MongoDB Bulk API

**Description:** Bulk update operations use MongoDB's UnorderedBulk API for efficient batch processing of code assignments, verdicts, and transfers.

**Example Usage:**
```javascript
// Create bulk operation
const bulk = await DataStore.UnorderedBulk();

// Add multiple operations
assignments.forEach(({ code, codeConfigId, userId, date }) => {
  bulk
    .find({
      _id: make_id({ campaignId, userId }),
      'presale.codes.code': { $ne: code }  // Only if code not already assigned
    })
    .updateOne({
      $push: { 'presale.codes': { code, codeConfigId, date: normalizeDates(date) } }
    });
});

// Execute all operations
const result = await bulk.execute();
return result.modifiedCount;
```

**Found In:**
- [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:111) - assignCodesByCampaignAndUsers
- [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:126) - saveVerdictsByCampaignAndUsers
- [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:150) - transferEntries

---

### Pattern: JSON Schema Validation

**Description:** Request payloads for bulk operations are validated against JSON schemas using the @verifiedfan/lib SchemaValidator.

**Example Usage:**
```javascript
// Define schema (JS or YAML)
const schema = {
  id: 'assignCodes',
  type: 'array',
  minItems: 1,
  maxItems: 1000,
  items: {
    properties: {
      userId: { type: 'string', minLength: 24, maxLength: 24 },
      code: { type: 'string', minLength: 1 },
      date: { /* ... */ }
    },
    required: ['userId', 'date']
  }
};

// Validate
try {
  validateSchema(assignments, 'assignCodes');
} catch (schemaValidatorError) {
  throw error(InvalidCodeAssignments({
    error: selectSchemaValidatorError({ schemaValidatorError })
  }));
}
```

**Found In:**
- [/app/managers/entries/assignCodes.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/assignCodes.js:12)
- [/app/managers/entries/saveVerdicts.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/saveVerdicts.js:6)
- [/app/schemas/](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/schemas/)

---

### Pattern: Ramda Functional Pipelines

**Description:** Data transformation uses Ramda's functional composition for declarative data processing pipelines.

**Example Usage:**
```javascript
// Normalize and dedupe entries
export const dedupeAndNormalizeEntries = R.pipe(
  R.sort(byUpdatedDate),                    // Sort by date.updated (descending)
  R.uniqBy(selectCampaignFanId),           // Remove duplicates by [campaignId, fanId]
  R.map(R.objOf('entry'))                   // Wrap each in {entry: ...}
);

// Split records by user ID presence
export const partitionByUserId = R.partition(R.path(['user', 'id']));
// Returns: [recordsWithUserId, recordsWithoutUserId]

// Format failed records
export const formatFailedRecords = R.applySpec({
  recordId: R.path(['entry', 'recordId']),
  errorMessage: 'missing user id'
});
```

**Found In:**
- [/app/managers/entries/saveEntries/normalize.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/saveEntries/normalize.js:76)
- [/app/managers/entries/normalizers/forUser.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/managers/entries/normalizers/forUser.js:55)

---

### Pattern: Middleware Validator

**Description:** Koa middleware pattern for conditional request validation using predicate functions.

**Example Usage:**
```javascript
const ValidatorMiddleware = ({ predicate, errorFn }) => R.ifElse(
  predicate,
  (ctx, next) => next(),      // If predicate passes, continue
  ctx => { throw errorFn(ctx); }  // If fails, throw error
);

// Usage example:
const requireAuth = ValidatorMiddleware({
  predicate: ctx => ctx.state.user && ctx.state.user.isAuthenticated,
  errorFn: ctx => notLoggedIn
});
```

**Found In:**
- [/lib/middlewares/validators/ValidatorMiddleware.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/lib/middlewares/validators/ValidatorMiddleware.js)

---

### Pattern: Mexican Phone Number Normalization

**Description:** Special handling for Mexican phone numbers which may have an extra '1' digit after the country code.

**Example Usage:**
```javascript
// Mexican phone formats:
// +52 1 234 567 8901  (with '1')
// +52 234 567 8901    (without '1')

const formatPhoneNumberQueryParam = phoneNumber => {
  const parsedNumber = parseNumberFromMexicanPhone(phoneNumber);
  if (parsedNumber) {
    // Query matches both formats
    return { $in: [`+52${parsedNumber}`, `+521${parsedNumber}`] };
  }
  return phoneNumber;
};

// Usage in query
await DataStore.find({
  'fields.phone': formatPhoneNumberQueryParam(phoneNumber)
});
```

**Found In:**
- [/app/datastore/entries/index.js](/Users/Brodie.Balser/Documents/TM/titan/entry-service/app/datastore/entries/index.js:19)

---

## Function Call Relationships

### upsert Call Graph
```
upsert (entry-service/app/managers/entries/upsert.js:144)
├─ Calls:
│  ├─ service.campaigns.getCampaign (external)
│  ├─ throwIfInvalidCampaignStatus
│  ├─ registrationEligibility
│  ├─ throwIfIneligible
│  ├─ service.users.getUser (external)
│  ├─ datastore.entries.findByCampaignAndUser
│  ├─ getEligibleLinkedAttributes
│  ├─ create (if new) OR update (if existing)
│  └─ normalize
└─ Called By:
   └─ Entry API endpoint handlers (not shown)

create (entry-service/app/managers/entries/upsert.js:63)
├─ Calls:
│  ├─ throwIfNoPastParticipation
│  ├─ makeUserLink
│  ├─ validateFields
│  │  ├─ validatePreferences
│  │  │  └─ typeValidationFns[type] (for each field)
│  │  ├─ maybeOverrideFields
│  │  ├─ throwIfPhoneConfirmationInvalid
│  │  └─ service.users.updateFromEntryFields
│  ├─ validateReferrerInfo
│  ├─ makeNew
│  ├─ datastore.entries.insertEntry
│  ├─ onUpserted (async)
│  └─ normalize
└─ Called By:
   └─ upsert

update (entry-service/app/managers/entries/upsert.js:110)
├─ Calls:
│  ├─ validateFields (same as create)
│  ├─ validateManualReferralCode
│  ├─ maybeUnsetPhoneConfirmedDate
│  ├─ datastore.entries.modifyEntry
│  ├─ onUpserted (async)
│  └─ normalize
└─ Called By:
   └─ upsert

listByCampaign (entry-service/app/managers/entries/listByCampaign.js:38)
├─ Calls:
│  ├─ validateFilter
│  ├─ validatePaging
│  ├─ datastore.entries.listByCampaign
│  └─ normalizeList
└─ Called By:
   └─ Entry list API endpoint handlers

assignCodesByCampaignAndUsers (entry-service/app/managers/entries/assignCodes.js:43)
├─ Calls:
│  ├─ throwIfInvalidCodeAssignments
│  ├─ maybePopulateCode
│  ├─ filterValidAssignments
│  ├─ datastore.entries.assignCodesByCampaignAndUsers
│  └─ datastore.scoring.upsertCodes
└─ Called By:
   └─ Bulk code assignment API endpoint

saveVerdictsByCampaignAndUsers (entry-service/app/managers/entries/saveVerdicts.js:30)
├─ Calls:
│  ├─ throwIfInvalidSchema
│  ├─ throwIfInvalidDates
│  └─ datastore.entries.saveVerdictsByCampaignAndUsers
└─ Called By:
   └─ Bulk verdict save API endpoint
```
