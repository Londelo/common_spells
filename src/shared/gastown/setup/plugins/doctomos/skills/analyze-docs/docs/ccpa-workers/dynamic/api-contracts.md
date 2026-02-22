# API Contracts - ccpa-workers

## Overview

This repository provides internal Lambda worker functions and service interfaces for CCPA privacy compliance. It exposes:
- **Worker Functions**: Lambda handlers for processing privacy requests
- **Internal Services**: Service clients for interacting with external APIs
- **Shared Types**: TypeScript interfaces and type definitions

---

## Worker Functions (Lambda Handlers)

Each worker is a Lambda function that processes specific types of CCPA privacy requests.

### Worker Signatures

All workers follow a common interface:

```typescript
type WorkerHandler = (params: {
  input: any;
  Services: Services;
  jwt: string;
}) => Promise<WorkerResult>;
```

### Available Workers

| Worker | Purpose | Input | Output |
|--------|---------|-------|--------|
| `processRequest` | Routes privacy requests to appropriate queues | `{ event: PrivacyRequest }` | `{ userIdFound: boolean, queued: string, requestType: string, queuedCount: number }` |
| `fanInfo` | Retrieves user PII data | `{ userId, memberId, requestEvent }` | `{ entries: number, piiTypes: object }` |
| `deleteFan` | Deletes user data across systems | `{ userId, memberId, globalUserId, email, requestEvent }` | `{ ids, userDeleted: boolean, counts: object }` |
| `optOut` | Opts user out of notifications | `{ userId, requestEvent }` | `{ optOuts: { vf, ln } }` |
| `keepPrivate` | Opts user out of marketing | `{ userId, requestEvent }` | `{ entries: number }` |
| `updateDictionary` | Updates data dictionary in PrivacyCore | None | `"Data Dictionary Registered"` |
| `saveDisclosures` | Processes disclosure CSV files | `{ event: { fileKey, campaignId } }` | `{ rows, contacts, disclosures }` |

---

## Internal Service APIs

### Services Type Definition

```typescript
type Services = {
  aws: AWS;
  request: Request;
  mongo: Mongo;
  users: UserService;
  entries: EntryService;
  campaigns: CampaignService;
  privacyCore: PrivacyCoreService;
}
```

---

## User Service

Communicates with the VerifiedFan Users API.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `authenticate` | `({ isAuthEnabled, petition, ...params }) => Promise<{ auth }>` | Authenticates worker with JWT |
| `getUserIds` | `({ jwt, tmIds?, emails? }) => Promise<User[]>` | Get user IDs by TM IDs or emails |
| `getUserByAnyId` | `({ jwt, id }) => Promise<User[]>` | Find user by any identifier |
| `deleteFan` | `({ jwt, userId }) => Promise<{ userDeleted, deletedCount }>` | Delete user account |

### Request Format

```typescript
{
  baseUrl: string;
  endpoint: string;
  accessPath: string;
  jwt: string;
  serviceName: "Users";
  json: true;
  method: "GET" | "POST" | "DELETE";
  body?: object;
  qs?: object;
}
```

---

## Entry Service

Manages user entry data and opt-out preferences.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getUserEntries` | `({ jwt, userId }) => Promise<Entry[]>` | Get all entries for a user |
| `optOutUser` | `({ jwt, userId, field }) => Promise<{ results }>` | Opt user out of specific field |

### Opt-Out Fields

```typescript
type OptOutField =
  | "allow_notification"  // VerifiedFan notifications
  | "allow_livenation"    // LiveNation notifications
  | "allow_marketing";    // Marketing communications
```

---

## PrivacyCore Service

Publishes privacy responses and data to PrivacyCore Kafka topics.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `publishPrivacyResponse` | `({ payload, error?, isPreFlight?, piiData? }) => Promise<KafkaResponse>` | Publish privacy request status |
| `publishDataDictionary` | `({ payload }) => Promise<KafkaResponse>` | Publish data dictionary |
| `publishDisclosureData` | `({ disclosureRecords }) => Promise<KafkaResponse>` | Publish disclosure records |

### Privacy Response Schema

```typescript
interface PrivacyResponse {
  application: string;        // Product code (e.g., "VF")
  privacyRequestId: string;
  requestStatus: "COMPLETED" | "FAILED";
  timestamp: number;
  piiData: PIIData | null;
  erasePreflightCheck: ErasePreflightCheck | null;
  error: Error | null;
  partial: null;
}
```

### PII Data Format

```typescript
interface PIIData {
  array: Array<{
    type: string;      // PII type
    value: string;     // PII value
  }>;
}
```

---

## Campaign Service

Manages campaign and artist contact data.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getArtistContacts` | `({ jwt }) => Promise<Contact[]>` | Get artist third-party contacts |
| `getCampaignContacts` | `({ jwt, campaignId }) => Promise<Contact[]>` | Get campaign target contacts |

**Note**: Currently returns mock data. Actual API calls are commented out.

---

## AWS Service Clients

AWS resource clients configured per environment.

### AWS Type Definition

```typescript
type AWS = {
  campaignDataBucket: S3;
  exportServiceBucket: S3;
  scoringBucket: S3;
  campaignDataAthena: Athena;
  acctFanscoreTable: DynamoDB;
  verificationTable: DynamoDB;
  fanIdentityTable: DynamoDB;
  demandTable: DynamoDB;
  fanInfoQueue: SQS;
  keepPrivateQueue: SQS;
  deleteFanQueue: SQS;
  optOutQueue: SQS;
  kafkaCertSecret: SecretsManager;
}
```

### Resource Usage

| Resource | Used By | Purpose |
|----------|---------|---------|
| `fanInfoQueue` | processRequest | Queue fan info requests |
| `keepPrivateQueue` | processRequest | Queue keep private requests |
| `deleteFanQueue` | processRequest | Queue deletion requests |
| `optOutQueue` | processRequest | Queue opt-out requests |
| `acctFanscoreTable` | deleteFan | Flag account fanscore records |
| `verificationTable` | deleteFan | Remove verification records |
| `fanIdentityTable` | deleteFan | Flag identity records |
| `demandTable` | deleteFan | Remove demand records |
| `exportServiceBucket` | saveDisclosures | Read disclosure CSV files |
| `kafkaCertSecret` | privacyCore | Authenticate with Kafka |

---

## MongoDB Service

Access to MongoDB collections.

### Mongo Type

```typescript
type Mongo = {
  campaigns: Campaigns;
}

type Campaigns = {
  findOpenCampaignIds: () => Promise<string[]>;
}
```

---

## Privacy Request Types

```typescript
enum PRIVACY_CORE_REQUEST_TYPE {
  GET_INFO = "GET_INFO";
  DO_NOT_SELL = "DO_NOT_SELL";
  UNSUBSCRIBE = "UNSUBSCRIBE";
  ERASE = "ERASE";
  ERASE_PREFLIGHT_CHECK = "ERASE_PREFLIGHT_CHECK";
}
```

### Request Type to Queue Mapping

| Request Type | Target Queue |
|--------------|--------------|
| `GET_INFO` | fanInfoQueue |
| `DO_NOT_SELL` | keepPrivateQueue |
| `UNSUBSCRIBE` | optOutQueue |
| `ERASE` | deleteFanQueue |

---

## Shared Type Definitions

### PrivacyRequest

```typescript
interface PrivacyRequest {
  privacyRequestId: string;
  requestTimestamp: number;
  requestType: PRIVACY_CORE_REQUEST_TYPE;
  fanIdentity: {
    id: string;
    idType?: string;
    property?: string | null;
    encryptedProfile?: string | null;
  };
}
```

### WorkerInput

```typescript
interface WorkerInput {
  userId?: string;
  memberId?: string;
  globalUserId?: string;
  email?: string;
  requestEvent: PrivacyRequest;
}
```

### User

```typescript
interface User {
  tmId?: string;
  email: string;
  userId?: string;
  memberId?: string;
  globalUserId?: string;
}
```

### Entry

```typescript
interface Entry {
  type: string;
  [key: string]: any;
}
```

### DisclosureData

```typescript
interface DisclosureData {
  fanIdentity: {
    id: string;
    idType: string;
    property: null;
    encryptedProfile: null;
  };
  source: string;
  timestamp: number;
  embeddedThirdParty: null;
  PII: string[];
  justification: "MARKETING";
  type: "DISCLOSED";
  sharedIdentifiers: null;
  target: string;
}
```

---

## Kafka Message Schemas

### Key Schema

```json
{
  "type": "record",
  "name": "Key",
  "fields": [
    {"name": "id", "type": "string"}
  ]
}
```

### Privacy Request Status Schema

Published to: `privacyRequestUpdateKakfaTopic`

### Data Dictionary Schema

Published to: `dataDictionaryKafkaTopic`

### Disclosure Data Schema

Published to: `disclosureDataKafkaTopic`

---

## Middleware Types

Workers support multiple event source types via middleware:

| Middleware Type | Source |
|-----------------|--------|
| `appsync` | AWS AppSync |
| `dynamodb` | DynamoDB Streams |
| `firehose` | Kinesis Firehose |
| `kafka` | Kafka |
| `s3` | S3 Events |
| `sns` | SNS |
| `sqs` | SQS |

Middleware transforms event source format into standard worker input format.
