# Type Usage Patterns - ccpa-workers

## Function Signatures

### Exported Functions with Object Parameters

#### saveDisclosures
**Confidence:** High (95-100%)

```typescript
async function saveDisclosures({
  input: {
    event: {
      fileKey: string,
      campaignId: string
    }
  },
  Services: {
    campaigns: { getCampaignContacts },
    users: { getUserIds },
    privacyCore: { publishDisclosureData },
    aws: { exportServiceBucket }
  },
  jwt: string
}): Promise<{ rows: number, contacts: number, disclosures: number }>
```

**Source:** [apps/saveDisclosures/index.js](apps/saveDisclosures/index.js:99)

**Parameter Shape:**
- `input.event` (object, required)
  - `fileKey` (string, required) - S3 key for CSV file
  - `campaignId` (string, required) - Campaign identifier
- `Services` (Services, required) - Service container
- `jwt` (string, required) - JWT authentication token

**Return Type:** Promise<{ rows: number, contacts: number, disclosures: number }>

**Description:** Processes CSV file from S3 to create disclosure records for Privacy Core

**Calls:**
- `campaigns.getCampaignContacts` - Fetches target contacts for campaign
- `aws.exportServiceBucket.getReadStreamForObject` - Gets S3 read stream
- `users.getUserIds` - Retrieves user IDs by email (batched)
- `privacyCore.publishDisclosureData` - Publishes disclosure records to Kafka

**Confidence Note:** Explicit parameter destructuring in function signature

---

#### optOut
**Confidence:** High (95-100%)

```typescript
async function optOut({
  input: Array<{
    userId?: string,
    requestEvent: {
      privacyRequestId: string,
      [key: string]: unknown
    }
  }>,
  Services: {
    entries: {
      optOutUser: (params: { jwt: string, userId: string, field: string }) => Promise<{ totalEntriesUpdated: number }>
    },
    privacyCore: {
      publishPrivacyResponse: (params: { payload: unknown, error?: boolean }) => Promise<unknown>
    }
  },
  jwt?: string
}): Promise<{ optOuts: { vf: number | null, ln: number | null } }>
```

**Source:** [apps/optOut/index.js](apps/optOut/index.js:15)

**Parameter Shape:**
- `input` (array, required, default: []) - Privacy request input array
  - `userId` (string, optional) - User identifier
  - `requestEvent` (object, required) - Privacy platform request
- `Services` (Services, required)
  - `entries` (object, required) - Entries service
  - `privacyCore` (object, required) - Privacy Core service
- `jwt` (string, optional) - JWT token

**Return Type:** Promise<{ optOuts: { vf: number | null, ln: number | null } }>

**Description:** Opts out user from VerifiedFan and LiveNation marketing

**Calls:**
- `selectInput` (shared/selectors.js:12) - Extracts first element of input
- `selectPrivacyRequestId` (shared/selectors.js:10) - Extracts privacy request ID
- `entries.optOutUser` - Updates user opt-out preferences
- `selectOptOutEntries` (shared/selectors.js:14) - Extracts count of updated entries
- `privacyCore.publishPrivacyResponse` - Sends response to Privacy Core

**Confidence Note:** Explicit parameter destructuring with defaults

---

#### keepPrivate
**Confidence:** High (95-100%)

```typescript
async function keepPrivate({
  input: Array<{
    userId?: string,
    requestEvent: {
      privacyRequestId: string,
      [key: string]: unknown
    }
  }>,
  Services: {
    entries: {
      optOutUser: (params: { jwt: string, userId: string, field: string }) => Promise<unknown>
    },
    privacyCore: {
      publishPrivacyResponse: (params: { payload: unknown, error?: boolean }) => Promise<unknown>
    }
  },
  jwt?: string
}): Promise<{ entries: number | null }>
```

**Source:** [apps/keepPrivate/index.js](apps/keepPrivate/index.js:9)

**Parameter Shape:**
- `input` (array, required, default: []) - Privacy request input array
- `Services` (Services, required)
- `jwt` (string, optional)

**Return Type:** Promise<{ entries: number | null }>

**Description:** Opts user out of marketing (DO_NOT_SELL request)

**Calls:**
- `selectInput` (shared/selectors.js:12)
- `selectPrivacyRequestId` (shared/selectors.js:10)
- `entries.optOutUser` - Updates allow_marketing field
- `selectOptOutEntries` (shared/selectors.js:14)
- `privacyCore.publishPrivacyResponse`

**Confidence Note:** Similar pattern to optOut, explicit destructuring

---

#### deleteFan
**Confidence:** High (95-100%)

```typescript
async function deleteFan({
  input: Array<{
    userId?: string,
    memberId?: string,
    globalUserId?: string,
    email?: string,
    requestEvent: {
      privacyRequestId: string,
      [key: string]: unknown
    }
  }>,
  Services: {
    users: {
      deleteFan: (params: { jwt: string, userId: string }) => Promise<{ userDeleted: boolean, deletedCount: Record<string, number> }>
    },
    privacyCore: {
      publishPrivacyResponse: (params: { payload: unknown, error?: boolean }) => Promise<unknown>
    },
    aws: {
      demandTable: DynamoDB,
      verificationTable: DynamoDB
    }
  },
  jwt?: string
}): Promise<{
  ids: { memberId?: string, globalUserId?: string, userId?: string },
  userDeleted: boolean,
  acctFanscoreFlagged: unknown,
  counts: {
    registration?: Record<string, number>,
    dynamo: {
      verification: number,
      demand: number,
      identity: number
    }
  }
}>
```

**Source:** [apps/deleteFan/index.js](apps/deleteFan/index.js:25)

**Parameter Shape:**
- `input` (array, required, default: []) - Privacy request input with multiple ID types
- `Services` (Services, required)
- `jwt` (string, optional)

**Return Type:** Promise with deletion results and counts

**Description:** Deletes fan data across all systems (ERASE request)

**Calls:**
- `selectInput` (shared/selectors.js:12)
- `selectPrivacyRequestId` (shared/selectors.js:10)
- `removeFromVerificationTable` (apps/deleteFan/removeFromVerificationTable.js)
- `removeFromDemandTable` (apps/deleteFan/removeFromDemandTable.js)
- `flagAccountFanscore` (apps/deleteFan/flagAccountFanscore.js)
- `flagIdentityRecords` (apps/deleteFan/flagIdentityRecords.js)
- `users.deleteFan` - Deletes user from registration service
- `privacyCore.publishPrivacyResponse`

**Confidence Note:** Explicit destructuring with multiple ID types

---

#### fanInfo
**Confidence:** High (95-100%)

```typescript
async function fanInfo({
  input: Array<{
    userId?: string,
    memberId?: string,
    requestEvent: {
      privacyRequestId: string,
      [key: string]: unknown
    }
  }>,
  Services: {
    entries: {
      getUserEntries: (params: { jwt: string, userId: string }) => Promise<Array<UserEntry>>
    },
    privacyCore: {
      publishPrivacyResponse: (params: {
        payload: unknown,
        error?: boolean,
        piiData?: { array: Array<{ type: string, subtype: null, value: { string: string } }> }
      }) => Promise<unknown>
    }
  },
  jwt?: string
}): Promise<{ entries: number, piiTypes: Record<string, number> | null }>
```

**Source:** [apps/fanInfo/index.js](apps/fanInfo/index.js:11)

**Parameter Shape:**
- `input` (array, required, default: [])
- `Services` (Services, required)
- `jwt` (string, optional)

**Return Type:** Promise<{ entries: number, piiTypes: Record<string, number> | null }>

**Description:** Retrieves fan PII data for GET_INFO request

**Calls:**
- `selectInput` (shared/selectors.js:12)
- `selectPrivacyRequestId` (shared/selectors.js:10)
- `entries.getUserEntries` - Fetches user entry data
- `formatPIIData` (apps/fanInfo/formatPIIData.js:67) - Transforms entries to PII format
- `privacyCore.publishPrivacyResponse` - Sends PII data to Privacy Core

**Confidence Note:** Explicit destructuring

---

#### processRequest
**Confidence:** High (95-100%)

```typescript
async function processRequest({
  input: {
    event: {
      fanIdentity: {
        id: string
      },
      requestType: string,
      privacyRequestId: string,
      [key: string]: unknown
    }
  },
  jwt: string,
  Services: {
    users: {
      getUserByAnyId: (params: { jwt: string, id: string }) => Promise<Array<UserIdData>>
    },
    privacyCore: {
      publishPrivacyResponse: (params: { payload: unknown, error?: boolean, isPreFlight?: boolean }) => Promise<unknown>
    },
    aws: {
      acctFanscoreTable: DynamoDB,
      fanInfoQueue: SQS,
      keepPrivateQueue: SQS,
      deleteFanQueue: SQS,
      optOutQueue: SQS
    }
  }
}): Promise<{
  userIdFound: boolean,
  queued: string | false,
  requestType: string,
  queuedCount?: number
}>
```

**Source:** [apps/processRequest/index.js](apps/processRequest/index.js:54)

**Parameter Shape:**
- `input.event` (object, required) - Privacy Core request payload
  - `fanIdentity.id` (string, required) - User identifier (email or member ID)
  - `requestType` (string, required) - Type of privacy request
  - `privacyRequestId` (string, required) - Request tracking ID
- `jwt` (string, required)
- `Services` (Services, required)

**Return Type:** Promise with routing results

**Description:** Routes incoming privacy requests to appropriate SQS queues

**Calls:**
- `selectPrivacyRequestId` (shared/selectors.js:10)
- `selectIdFromPayload` (inline: R.path(['fanIdentity', 'id']))
- `GetUserIdsInAcctFanDB` (apps/processRequest/GetUserIdsInAcctFanDB.js)
- `users.getUserByAnyId` - Attempts to find user in TM systems
- `aws[queueName].sendMessage` - Sends to appropriate SQS queue

**Confidence Note:** Explicit parameter destructuring

---

#### formatPIIData
**Confidence:** High (95-100%)

```typescript
function formatPIIData({
  userEntries: Array<{
    fields: {
      first_name?: string,
      last_name?: string,
      email?: string,
      phone?: string,
      zip?: string,
      [key: string]: unknown
    },
    origin?: {
      ip?: {
        address?: string
      }
    }
  }>,
  userId: string
}): {
  array: Array<{
    type: string,
    subtype: null,
    value: { string: string }
  }>
}
```

**Source:** [apps/fanInfo/formatPIIData.js](apps/fanInfo/formatPIIData.js:67)

**Parameter Shape:**
- `userEntries` (array, required, default: []) - User entry records
- `userId` (string, required) - User identifier

**Return Type:** { array: Array<PiiObject> }

**Description:** Transforms user entries into Privacy Core PII format

**Called By:**
- [fanInfo](apps/fanInfo/index.js:42)

**Calls:**
- Various Ramda functions for data transformation

**Confidence Note:** Explicit parameter destructuring with JSDoc comments

---

### Helper Functions

#### getConfig
**Confidence:** High (95-100%)

```typescript
export const getConfig: <TConfig = Record<string, string>>(
  theConfig: Config,
  ...path: string[]
) => TConfig
```

**Source:** [shared/config/index.d.ts](shared/config/index.d.ts:11)

**Description:** Retrieves configuration value by path with generic type casting

---

#### getConfigValue
**Confidence:** High (95-100%)

```typescript
export const getConfigValue: <TValue extends ConfigValue>(
  theConfig: Config,
  ...path: string[]
) => TValue
```

**Source:** [shared/config/index.d.ts](shared/config/index.d.ts:15)

**Description:** Retrieves configuration value by path with ConfigValue constraint

---

#### formatError
**Confidence:** High (95-100%)

```typescript
export const formatError = (
  error: unknown
): {
  message: string,
  stack?: string,
  status?: number,
  errorMessage?: string,
  reason?: string
} | undefined
```

**Source:** [shared/format.ts](shared/format.ts:20)

**Description:** Normalizes error objects to standard format

**Called By:**
- Telemetry middleware
- Privacy Core service error handlers

---

#### formatBatchFailureIdentifiers
**Confidence:** High (95-100%)

```typescript
export const formatBatchFailureIdentifiers = <T extends RecordWithId[]>(
  records: T
): FailureIdentifier[]
```

**Source:** [shared/format.ts](shared/format.ts:7)

**Description:** Converts records with recordId to failure identifiers for batch processing

---

## Service Function Signatures

### Users Service

#### authenticateWorker
**Confidence:** High (95-100%)

```typescript
authenticateWorker: (params: {
  appId: string,
  petition: string
}) => Promise<{ token: string }>
```

**Source:** [shared/services/users/index.js](shared/services/users/index.js:47)

**Description:** Authenticates worker with user service

---

#### getUserIds
**Confidence:** High (95-100%)

```typescript
getUserIds: (params: {
  jwt: string,
  tmIds?: string,
  emails?: string
}) => Promise<Array<UserIdMapping>>
```

**Source:** [shared/services/users/index.js](shared/services/users/index.js:74)

**Description:** Retrieves user IDs by TM IDs or emails (comma-separated)

**Called By:**
- [saveDisclosures](apps/saveDisclosures/index.js) via `getUserIdByEmail`

---

#### getUserByAnyId
**Confidence:** High (95-100%)

```typescript
getUserByAnyId: (params: {
  jwt: string,
  id: string
}) => Promise<Array<{
  userId?: string,
  memberId?: string,
  globalUserId?: string,
  email?: string
}>>
```

**Source:** [shared/services/users/index.js](shared/services/users/index.js:84)

**Description:** Finds user by any identifier (email, member ID, user ID)

**Called By:**
- [processRequest](apps/processRequest/index.js:74) via `GetTmUserIds`

---

#### deleteFan
**Confidence:** High (95-100%)

```typescript
deleteFan: (params: {
  jwt: string,
  userId: string
}) => Promise<{
  userDeleted: boolean,
  deletedCount: Record<string, number>
}>
```

**Source:** [shared/services/users/index.js](shared/services/users/index.js:91)

**Description:** Deletes user and returns deletion counts by data category

**Called By:**
- [deleteFan](apps/deleteFan/index.js:38) via `deleteVFUser`

---

### Entries Service

#### getUserEntries
**Confidence:** High (95-100%)

```typescript
getUserEntries: (params: {
  jwt: string,
  userId: string
}) => Promise<Array<{
  fields: Record<string, unknown>,
  origin?: {
    ip?: {
      address?: string
    }
  }
}>>
```

**Source:** [shared/services/entries/index.js](shared/services/entries/index.js:33)

**Description:** Retrieves all campaign entry records for a user

**Called By:**
- [fanInfo](apps/fanInfo/index.js:36)

---

#### optOutUser
**Confidence:** High (95-100%)

```typescript
optOutUser: (params: {
  jwt: string,
  userId: string,
  field: string
}) => Promise<{
  totalEntriesUpdated: number
}>
```

**Source:** [shared/services/entries/index.js](shared/services/entries/index.js:39)

**Description:** Opts user out of specified marketing field

**Called By:**
- [optOut](apps/optOut/index.js:43)
- [keepPrivate](apps/keepPrivate/index.js:31)

---

### Privacy Core Service

#### publishPrivacyResponse
**Confidence:** Medium (70-94%)

```typescript
publishPrivacyResponse: (params: {
  payload: {
    privacyRequestId: string,
    requestTimestamp: string,
    [key: string]: unknown
  },
  error?: boolean,
  isPreFlight?: boolean,
  piiData?: {
    array: Array<{
      type: string,
      subtype: null,
      value: { string: string }
    }>
  } | null
}) => Promise<unknown>
```

**Source:** [shared/services/privacyCore/index.js](shared/services/privacyCore/index.js:96)

**Description:** Publishes privacy request response to Kafka topic

**Called By:**
- All privacy request handlers (fanInfo, optOut, keepPrivate, deleteFan, processRequest)

**Calls:**
- `sendMessageToKafka` - Sends Avro-encoded message to Privacy Core Kafka

**Confidence Note:** JSDoc annotations with detailed parameter descriptions

---

#### publishDataDictionary
**Confidence:** Medium (70-94%)

```typescript
publishDataDictionary: (params: {
  payload: {
    application: string,
    [key: string]: unknown
  }
}) => Promise<unknown>
```

**Source:** [shared/services/privacyCore/index.js](shared/services/privacyCore/index.js:144)

**Description:** Publishes data dictionary to Privacy Core

**Confidence Note:** JSDoc annotation

---

#### publishDisclosureData
**Confidence:** Medium (70-94%)

```typescript
publishDisclosureData: (params: {
  disclosureRecords: Array<{
    key: { id: string },
    value: {
      fanIdentity: {
        id: string,
        idType: string,
        property: null,
        encryptedProfile: null
      },
      source: string,
      timestamp: number,
      embeddedThirdParty: null,
      PII: string[],
      justification: string,
      type: string,
      sharedIdentifiers: null,
      target: string
    }
  }>
}) => Promise<unknown>
```

**Source:** [shared/services/privacyCore/index.js](shared/services/privacyCore/index.js:162)

**Description:** Publishes disclosure records to Privacy Core

**Called By:**
- [saveDisclosures](apps/saveDisclosures/index.js:121)

**Confidence Note:** JSDoc annotation with complex nested structure

---

### Campaigns Service

#### getCampaignContacts
**Confidence:** Low (50-69%)

```typescript
getCampaignContacts: (params: {
  jwt?: string,
  campaignId?: string
}) => Promise<Array<{
  id: string,
  email: string
}>>
```

**Source:** [shared/services/campaigns/index.js](shared/services/campaigns/index.js:54)

**Description:** Retrieves target contacts for a campaign (currently returns mock data)

**Called By:**
- [saveDisclosures](apps/saveDisclosures/index.js:103)

**Confidence Note:** Currently mocked implementation, inferred from usage and mock return value

---

### Mongo Service

#### findOpenCampaignIds
**Confidence:** High (95-100%)

```typescript
findOpenCampaignIds: () => Promise<string[]>
```

**Source:** [shared/services/mongo/campaigns.ts](shared/services/mongo/campaigns.ts:8)

**Description:** Finds all campaign IDs with status 'OPEN'

**Confidence Note:** Explicit TypeScript signature with implementation

---

## Selector Functions

### selectInput
**Confidence:** High (95-100%)

```typescript
export const selectInput = R.head
```

**Source:** [shared/selectors.js](shared/selectors.js:12)

**Description:** Extracts first element from input array

**Called By:**
- fanInfo, optOut, keepPrivate, deleteFan, processRequest

---

### selectPrivacyRequestId
**Confidence:** High (95-100%)

```typescript
export const selectPrivacyRequestId = R.prop('privacyRequestId')
```

**Source:** [shared/selectors.js](shared/selectors.js:10)

**Description:** Extracts privacyRequestId from request event

**Called By:**
- fanInfo, optOut, keepPrivate, deleteFan, processRequest

---

### selectOptOutEntries
**Confidence:** High (95-100%)

```typescript
export const selectOptOutEntries = R.prop('totalEntriesUpdated')
```

**Source:** [shared/selectors.js](shared/selectors.js:14)

**Description:** Extracts total entries updated count from opt-out response

**Called By:**
- optOut, keepPrivate

---

## Common Patterns

### Pattern: Privacy Request Handler

**Description:** Standard pattern for handling Privacy Core requests

**Example Usage:**
```javascript
const handler = async({ input = [], Services, jwt }) => {
  const { privacyCore } = Services;
  const { userId, requestEvent } = selectInput(input);
  const privacyRequestId = selectPrivacyRequestId(requestEvent);

  if (!userId) {
    await privacyCore.publishPrivacyResponse({ payload: requestEvent });
    return { /* empty result */ };
  }

  try {
    // Perform operation
    const result = await performOperation({ userId, jwt, Services });

    // Send success response
    await privacyCore.publishPrivacyResponse({ payload: requestEvent });

    return result;
  }
  catch (error) {
    log.error('Operation failed', { userId });
    // Send error response
    await privacyCore.publishPrivacyResponse({ payload: requestEvent, error: true });
    throw error;
  }
};
```

**Found In:**
- [fanInfo](apps/fanInfo/index.js:11)
- [optOut](apps/optOut/index.js:15)
- [keepPrivate](apps/keepPrivate/index.js:9)
- [deleteFan](apps/deleteFan/index.js:25)

---

### Pattern: Service Request Wrapper

**Description:** Normalizes HTTP requests and extracts results from response body

**Example Usage:**
```javascript
const NormalizeAndMakeRequest = ({ request }) => async({
  endpoint,
  accessPath,
  jwt,
  method = 'GET',
  body,
  qs
}) => {
  const result = await request({
    baseUrl,
    endpoint,
    accessPath,
    serviceName,
    method,
    json: true,
    jwt,
    body,
    qs
  });

  const { error, results } = selectResultsFromBody(result);
  if (error) {
    throw error;
  }
  return results;
};
```

**Found In:**
- [users service](shared/services/users/index.js:25)
- [entries service](shared/services/entries/index.js:10)
- [campaigns service](shared/services/campaigns/index.js:13) (commented out)

---

### Pattern: Ramda Pipeline Composition

**Description:** Uses Ramda's pipe/pipeP for functional data transformations

**Example Usage:**
```javascript
const optOutAndSelectCount = R.pipeP(
  field => entries.optOutUser({ jwt, userId, field }),
  selectOptOutEntries
);

const result = await optOutAndSelectCount('allow_notification');
```

**Found In:**
- [optOut](apps/optOut/index.js:41)
- [formatPIIData](apps/fanInfo/formatPIIData.js:55)
- [users service](shared/services/users/index.js:20)

---

### Pattern: Batch Processing with Transform Stream

**Description:** Processes large datasets in batches using stream transformations

**Example Usage:**
```javascript
const batchTransformStream = BatchTransformStream({
  batchSize: 5000,
  transformFn: async rows => {
    const results = await processBatch(rows);
    await publishResults(results);
  }
}).resume();

return new Promise((resolve, reject) =>
  s3ReadStream
    .on('error', reject)
    .pipe(parseCSV(parseOptions))
    .on('error', reject)
    .pipe(batchTransformStream)
    .on('error', reject)
    .on('finish', () => resolve(count))
);
```

**Found In:**
- [saveDisclosures](apps/saveDisclosures/index.js:112)
