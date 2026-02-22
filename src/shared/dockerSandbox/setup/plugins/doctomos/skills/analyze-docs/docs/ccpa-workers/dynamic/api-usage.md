# API Usage - ccpa-workers

## Overview

This document provides usage examples for the CCPA workers and internal service APIs.

---

## Worker Invocation

### General Pattern

Workers are invoked as Lambda functions with standardized input:

```javascript
const handler = require('./apps/workerName').default;

const result = await handler({
  input: [...], // Event-specific input array
  Services: await services(),
  jwt: token
});
```

### Environment Configuration

Required environment variables:

```bash
APP_NAME=workerName          # Name of the worker to run
MIDDLEWARE_TYPE=sqs          # Event source type
AWS_REGION=us-east-1         # AWS region
STAGE=dev|staging|prod       # Deployment stage
```

---

## Worker Usage Examples

### 1. Process Request Worker

Routes incoming privacy requests to appropriate queues.

```javascript
const processRequest = require('./apps/processRequest').default;

const result = await processRequest({
  input: {
    event: {
      privacyRequestId: "PR-12345",
      requestTimestamp: 1234567890000,
      requestType: "ERASE",
      fanIdentity: {
        id: "user@example.com"
      }
    }
  },
  Services: services,
  jwt: workerToken
});

// Result:
// {
//   userIdFound: true,
//   queued: "deleteFanQueue",
//   requestType: "ERASE",
//   queuedCount: 1
// }
```

**Supported Request Types**:
- `GET_INFO` → Routes to fanInfoQueue
- `DO_NOT_SELL` → Routes to keepPrivateQueue
- `UNSUBSCRIBE` → Routes to optOutQueue
- `ERASE` → Routes to deleteFanQueue
- `ERASE_PREFLIGHT_CHECK` → Immediate response (no queue)

---

### 2. Fan Info Worker

Retrieves all PII data for a user.

```javascript
const fanInfo = require('./apps/fanInfo').default;

const result = await fanInfo({
  input: [{
    userId: "usr_123",
    memberId: "mem_456",
    requestEvent: {
      privacyRequestId: "PR-12345",
      requestTimestamp: 1234567890000
    }
  }],
  Services: services,
  jwt: workerToken
});

// Result:
// {
//   entries: 42,
//   piiTypes: {
//     "EMAIL": 1,
//     "NAME": 1,
//     "PHONE": 1,
//     "ADDRESS": 2
//   }
// }
```

**Notes**:
- If `userId` is not found, returns `{ entries: 0, piiTypes: null }`
- Automatically publishes PII data to PrivacyCore
- Handles errors by publishing error response to PrivacyCore

---

### 3. Delete Fan Worker

Deletes user data across all systems.

```javascript
const deleteFan = require('./apps/deleteFan').default;

const result = await deleteFan({
  input: [{
    userId: "usr_123",
    memberId: "mem_456",
    globalUserId: "gid_789",
    email: "user@example.com",
    requestEvent: {
      privacyRequestId: "PR-12345",
      requestTimestamp: 1234567890000
    }
  }],
  Services: services,
  jwt: workerToken
});

// Result:
// {
//   ids: {
//     memberId: "mem_456",
//     globalUserId: "gid_789",
//     userId: "usr_123"
//   },
//   userDeleted: true,
//   acctFanscoreFlagged: true,
//   counts: {
//     registration: {
//       entries: 15,
//       campaigns: 3
//     },
//     dynamo: {
//       verification: 2,
//       demand: 1,
//       identity: 1
//     }
//   }
// }
```

**Actions Performed**:
1. Removes records from verification table
2. Flags account fanscore records
3. Flags identity records
4. Deletes user via Users service
5. Removes demand records
6. Publishes completion to PrivacyCore

---

### 4. Opt-Out Worker

Opts user out of notifications.

```javascript
const optOut = require('./apps/optOut').default;

const result = await optOut({
  input: [{
    userId: "usr_123",
    requestEvent: {
      privacyRequestId: "PR-12345",
      requestTimestamp: 1234567890000
    }
  }],
  Services: services,
  jwt: workerToken
});

// Result:
// {
//   optOuts: {
//     vf: 5,  // Entries updated for VerifiedFan notifications
//     ln: 3   // Entries updated for LiveNation notifications
//   }
// }
```

**Opt-Out Fields**:
- `allow_notification` - VerifiedFan notifications
- `allow_livenation` - LiveNation notifications

---

### 5. Keep Private Worker

Opts user out of marketing communications.

```javascript
const keepPrivate = require('./apps/keepPrivate').default;

const result = await keepPrivate({
  input: [{
    userId: "usr_123",
    requestEvent: {
      privacyRequestId: "PR-12345",
      requestTimestamp: 1234567890000
    }
  }],
  Services: services,
  jwt: workerToken
});

// Result:
// {
//   entries: 8  // Number of entries updated
// }
```

**Field Updated**: `allow_marketing`

---

### 6. Update Dictionary Worker

Publishes the data dictionary to PrivacyCore.

```javascript
const updateDictionary = require('./apps/updateDictionary').default;

const result = await updateDictionary({
  Services: services,
  jwt: workerToken
});

// Result: "Data Dictionary Registered"
```

**Purpose**:
- Registers PII types with PrivacyCore
- Includes third-party email contacts
- Provides privacy request endpoint URL

---

### 7. Save Disclosures Worker

Processes CSV files containing disclosure data.

```javascript
const saveDisclosures = require('./apps/saveDisclosures').default;

const result = await saveDisclosures({
  input: {
    event: {
      fileKey: "disclosures/campaign-123.csv",
      campaignId: "cmp_789"
    }
  },
  Services: services,
  jwt: workerToken
});

// Result:
// {
//   rows: 1000,        // CSV rows processed
//   contacts: 5,       // Target contacts
//   disclosures: 5000  // Total disclosure records created
// }
```

**CSV Format**:
```csv
Email,First Name,Last Name,Mobile Phone,Zip Code
user@example.com,John,Doe,555-1234,90210
```

**Supported PII Columns**:
- `first name`, `last name`, `name` → NAME
- `email`, `fanclub email` → EMAIL
- `mobile phone`, `phone` → PHONE
- `zip code` → ADDRESS
- `ip address`, `ip` → IP_ADDRESS

---

## Service Usage Examples

### User Service

#### Authenticate Worker

```javascript
const { users } = Services;

const { auth } = await users.authenticate({
  isAuthEnabled: true,
  petition: {
    appId: "ccpa-workers",
    secret: process.env.WORKER_SECRET
  }
});

// Use auth.token for subsequent requests
```

#### Get User by Any ID

```javascript
const users = await users.getUserByAnyId({
  jwt: token,
  id: "user@example.com"  // Email, memberId, or userId
});

// Returns: [{ tmId, email, memberId, globalUserId }]
```

#### Delete Fan

```javascript
const result = await users.deleteFan({
  jwt: token,
  userId: "usr_123"
});

// Returns: { userDeleted: true, deletedCount: { entries: 15, campaigns: 3 } }
```

---

### Entry Service

#### Get User Entries

```javascript
const { entries } = Services;

const userEntries = await entries.getUserEntries({
  jwt: token,
  userId: "usr_123"
});

// Returns: Array of entry objects
```

#### Opt-Out User

```javascript
const result = await entries.optOutUser({
  jwt: token,
  userId: "usr_123",
  field: "allow_marketing"
});

// Returns: { results: [...updated entries] }
```

---

### PrivacyCore Service

#### Publish Privacy Response

```javascript
const { privacyCore } = Services;

// Success response
await privacyCore.publishPrivacyResponse({
  payload: {
    privacyRequestId: "PR-12345",
    requestTimestamp: 1234567890000
  },
  piiData: {
    array: [
      { type: "EMAIL", value: "user@example.com" },
      { type: "NAME", value: "John Doe" }
    ]
  }
});

// Error response
await privacyCore.publishPrivacyResponse({
  payload: requestEvent,
  error: true
});

// Preflight check response
await privacyCore.publishPrivacyResponse({
  payload: requestEvent,
  isPreFlight: true
});
```

#### Publish Data Dictionary

```javascript
await privacyCore.publishDataDictionary({
  payload: {
    privacy: {
      "com.tm.privacy.wirefmt.PrivacyMeta": {
        thirdPartyEmails: ["partner@example.com"],
        endpointDeliverPrivacyRequest: {
          string: "https://api.example.com/trigger/ccpa"
        }
      }
    },
    // ... PII type definitions
  }
});
```

#### Publish Disclosure Data

```javascript
await privacyCore.publishDisclosureData({
  disclosureRecords: [
    {
      key: { id: "MEMBER_ID-mem_123-VF-target_1" },
      value: {
        fanIdentity: {
          id: "mem_123",
          idType: "MEMBER_ID",
          property: null,
          encryptedProfile: null
        },
        source: "VF",
        timestamp: Date.now(),
        embeddedThirdParty: null,
        PII: ["EMAIL", "NAME"],
        justification: "MARKETING",
        type: "DISCLOSED",
        sharedIdentifiers: null,
        target: "target_1"
      }
    }
  ]
});
```

---

### AWS Service Clients

#### SQS Queue

```javascript
const { aws } = Services;

// Send message to queue
await aws.fanInfoQueue.sendMessage({
  data: {
    userId: "usr_123",
    memberId: "mem_456",
    requestEvent: { ... }
  }
});
```

#### DynamoDB Table

```javascript
// Flag account fanscore
await aws.acctFanscoreTable.updateItem({
  Key: { memberId: "mem_456" },
  UpdateExpression: "SET deleted = :true",
  ExpressionAttributeValues: { ":true": true }
});

// Remove from verification table
await aws.verificationTable.deleteItem({
  Key: { email: "user@example.com" }
});
```

#### S3 Bucket

```javascript
// Get read stream for CSV processing
const stream = await aws.exportServiceBucket.getReadStreamForObject(
  "disclosures/campaign-123.csv"
);
```

---

## Error Handling

All workers follow a consistent error handling pattern:

```javascript
try {
  // Process request
  const result = await processData();

  // Publish success
  await privacyCore.publishPrivacyResponse({
    payload: requestEvent
  });

  return result;
} catch (error) {
  log.error('Processing failed', { error });

  // Publish error
  await privacyCore.publishPrivacyResponse({
    payload: requestEvent,
    error: true
  });

  throw error;
}
```

**Error Response Format**:
```json
{
  "errorType": "OTHER",
  "errorMessage": "Cannot complete request. Internal error"
}
```

---

## Authentication

### Worker Authentication

Workers authenticate with external services using JWT tokens:

```javascript
const { auth } = await users.authenticate({
  isAuthEnabled: true,
  petition: {
    appId: "ccpa-workers",
    secret: process.env.WORKER_SECRET
  }
});

// Use auth.token for service requests
const result = await users.getUserByAnyId({
  jwt: auth.token,
  id: userId
});
```

### Kafka Authentication

PrivacyCore service authenticates with Kafka using certificates:

```javascript
// Certificates stored in AWS Secrets Manager
const certSecret = aws.kafkaCertSecret;

// Automatically retrieved and used by privacyCore service
await privacyCore.publishPrivacyResponse({ ... });
```

---

## Testing

### Local Invocation

```bash
# Set environment
export APP_NAME=fanInfo
export MIDDLEWARE_TYPE=sqs
export STAGE=dev

# Run worker
npx run invoke:worker --input '{"userId":"usr_123"}'
```

### Unit Testing

```javascript
const fanInfo = require('./apps/fanInfo').default;

describe('fanInfo', () => {
  it('retrieves user PII', async () => {
    const mockServices = {
      entries: {
        getUserEntries: jest.fn().mockResolvedValue([...])
      },
      privacyCore: {
        publishPrivacyResponse: jest.fn().mockResolvedValue({})
      }
    };

    const result = await fanInfo({
      input: [{ userId: 'usr_123', requestEvent: {...} }],
      Services: mockServices,
      jwt: 'mock-token'
    });

    expect(result.entries).toBe(42);
  });
});
```

---

## Monitoring

### CloudWatch Logs

Workers use structured logging:

```javascript
log.info('privacy request id', { privacyRequestId });
log.error('Processing failed', { error, userId });
```

**Log Tags**:
- `verifiedfan:apps:deleteFan`
- `verifiedfan:apps:fanInfo`
- `verifiedfan:apps:optOut`
- `verifiedfan:apps:keepPrivate`
- `verifiedfan:apps:processRequest`
- `verifiedfan:apps:updateDictionary`
- `verifiedfan:apps:saveDisclosures`

### Metrics

Key metrics to monitor:
- Request processing time
- Queue depth (SQS)
- Error rate by worker
- Privacy response publish success rate
- User lookup success rate

---

## Configuration

### Worker Configuration

Workers are configured via YAML files in `/configs/workers/`:

```yaml
workerName: fanInfo
middlewareType: sqs
stack: null
```

### Service URLs

Configured in `/configs/shared/services.yml`:

```yaml
verifiedfan:
  shared:
    services:
      users:
        url: https://users-api.verifiedfan.com
      entries:
        url: https://entries-api.verifiedfan.com
      privacyCore:
        url: https://kafka.privacycore.com
        privacyRequestUpdateKakfaTopic: /topics/privacy-request-status
        dataDictionaryKafkaTopic: /topics/data-dictionary
        disclosureDataKafkaTopic: /topics/disclosure-data
```

---

## Rate Limits

### External Services

- **Users API**: 100 requests/second
- **Entries API**: 100 requests/second
- **PrivacyCore Kafka**: No explicit limit, but batch when possible

### Best Practices

1. **Batch Operations**: Use `getUserIds` with multiple emails
2. **Retry Logic**: Built into `@verifiedfan/request` library
3. **Circuit Breaking**: Automatic via request wrapper

---

## Security Considerations

### Credentials

- Never log JWT tokens
- Store certificates in AWS Secrets Manager
- Rotate worker secrets regularly

### PII Handling

- PII is only logged in debug mode (disabled in production)
- All PII transmission uses HTTPS/TLS
- PII is encrypted at rest in DynamoDB and S3

### Kafka Communication

- mTLS authentication required
- Certificate validation enforced
- Self-signed certificates rejected (except for local dev)

---

## Troubleshooting

### Common Issues

**Worker not found**:
```
Error: Unknown app. The APP_NAME must correspond to a directory within the apps folder.
```
→ Verify `APP_NAME` environment variable matches a worker directory

**Authentication failed**:
```
Error: User-service request error
```
→ Check worker secret in environment variables

**Kafka publish failed**:
```
Error: Error from kafka ====> [details]
```
→ Verify certificates are valid and not expired
→ Check network connectivity to Kafka endpoint

**User not found**:
```
{ userIdFound: false, ... }
```
→ User may not exist in Users service
→ Falls back to checking DynamoDB acctFanscoreTable

---

## Support

For issues or questions:
- **Slack**: #vf-ccpa-workers
- **Wiki**: http://verifiedfan.git.tmaws.io/docs/architecture/ccpa/
- **On-call**: PagerDuty rotation for production issues
