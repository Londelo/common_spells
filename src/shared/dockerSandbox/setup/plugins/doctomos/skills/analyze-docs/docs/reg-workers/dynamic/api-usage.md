# API Usage - reg-workers

## Overview

This document provides usage examples, authentication patterns, error handling, and operational guidance for the registration workers API.

---

## Authentication

### AppSync Resolver (checkEligibility)

**JWT Token Authentication:**

The `checkEligibility` worker validates JWT tokens via the `appsyncResolver` middleware. The JWT is automatically extracted from the AppSync context and validated.

**Token Structure:**
```typescript
{
  sub: string           // User subject/ID
  email: string         // User email
  exp: number          // Expiration timestamp
  iat: number          // Issued at timestamp
  // ... additional claims
}
```

### Internal Worker Authentication

Internal workers (SQS consumers, DynamoDB stream processors, etc.) use **AWS IAM-based authentication**:
- Lambda execution role must have permissions for:
  - DynamoDB (read/write on demand-table)
  - SQS (send/receive/delete messages)
  - SNS (publish to topics)
  - Secrets Manager (read secrets)
  - Kinesis (read streams)

---

## Request Examples

### checkEligibility (AppSync)

**GraphQL Query (Example):**
```graphql
mutation CheckEligibility($input: CheckEligibilityInput!) {
  checkEligibility(input: $input) {
    isEligible
    reason
    campaignId
    fields
    linkedCampaignId
  }
}
```

**Variables:**
```json
{
  "input": {
    "body": {
      "slug": "artist-presale-2024",
      "entry": {
        "email": "fan@example.com",
        "markets": ["market-123", "market-456"],
        "ticket_count": 2,
        "opt_in": true
      },
      "userInfo": {
        "email": "fan@example.com",
        "phoneNumber": "+15551234567",
        "firstName": "Jane",
        "lastName": "Doe",
        "globalUserId": "global-user-123",
        "memberId": "member-456",
        "postalCode": "90210",
        "countryCode": "US",
        "locale": "en-US",
        "env": "prod",
        "isLoggedIn": "true"
      },
      "doTransfer": false
    }
  }
}
```

**Success Response:**
```json
{
  "data": {
    "checkEligibility": {
      "isEligible": true,
      "campaignId": "campaign-789",
      "fields": {
        "email": "fan@example.com",
        "markets": ["market-123", "market-456"],
        "ticket_count": 2,
        "opt_in": true
      },
      "linkedCampaignId": null
    }
  }
}
```

**Ineligible Response:**
```json
{
  "data": {
    "checkEligibility": {
      "isEligible": false,
      "reason": "CAMPAIGN_CLOSED",
      "campaignId": "campaign-789"
    }
  }
}
```

**Validation Error Response:**
```json
{
  "data": {
    "checkEligibility": {
      "isEligible": false,
      "reason": "INVALID_ENTRY",
      "campaignId": "campaign-789",
      "detail": {
        "field": "ticket_count"
      }
    }
  }
}
```

---

### Invoking Workers Locally

**Using npm script:**
```bash
# Set environment
export CONFIG_ENV=local-dev

# Invoke checkEligibility worker
npx run workers:invoke checkEligibility '{
  "body": {
    "slug": "test-campaign",
    "entry": { "email": "test@example.com" },
    "userInfo": {
      "email": "test@example.com",
      "phoneNumber": "+15551234567",
      "firstName": "Test",
      "lastName": "User",
      "globalUserId": "test-user-123",
      "postalCode": "12345",
      "countryCode": "US",
      "locale": "en-US",
      "env": "dev",
      "isLoggedIn": "true"
    }
  }
}'

# Invoke selection worker
npx run workers:invoke enqueueMarketSelections '{
  "campaignId": "campaign-123",
  "dateId": "2024-03-01",
  "marketId": "market-456"
}'
```

---

### SQS Message Format

**upsertUsers Queue:**
```json
{
  "Records": [
    {
      "messageId": "msg-123",
      "body": {
        "globalUserId": "user-123",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Smith",
        "phoneNumber": "+15551234567"
      },
      "attributes": {
        "ApproximateReceiveCount": "1"
      }
    }
  ]
}
```

**saveEntriesQueue:**
```json
{
  "Records": [
    {
      "messageId": "msg-456",
      "body": {
        "entry": {
          "pk": "CAMPAIGN#campaign-123",
          "sk": "USER#user-456",
          "globalUserId": "user-456",
          "campaignId": "campaign-123",
          "fields": "{\"email\":\"fan@example.com\"}",
          "score": 850,
          "createdAt": "2024-01-15T10:30:00Z",
          "updatedAt": "2024-01-15T10:30:00Z"
        },
        "operation": "INSERT"
      }
    }
  ]
}
```

---

### DynamoDB Stream Records

**enqueueEntries Stream Event:**
```json
{
  "Records": [
    {
      "eventName": "INSERT",
      "dynamodb": {
        "Keys": {
          "pk": { "S": "CAMPAIGN#campaign-123" },
          "sk": { "S": "USER#user-456" }
        },
        "NewImage": {
          "pk": { "S": "CAMPAIGN#campaign-123" },
          "sk": { "S": "USER#user-456" },
          "globalUserId": { "S": "user-456" },
          "campaignId": { "S": "campaign-123" },
          "needsReplication": { "BOOL": true },
          "fields": { "S": "{\"email\":\"fan@example.com\"}" }
        }
      }
    }
  ]
}
```

---

## Service Integration Examples

### Campaign Service

**Fetching Campaign by Slug:**
```typescript
const campaign = await Services.campaigns.getCampaignBySlug(slug);
```

**Fetching Market by ID:**
```typescript
const market = await Services.campaigns.getMarketById(campaignId, marketId);
```

---

### Entry Service

**Fetching Scoring Records:**
```typescript
const scoringRecords = await Services.entries.fetchScoringRecords({
  campaignId,
  marketId,
  limit: 1000
});
```

**Upserting Entries:**
```typescript
const result = await Services.entries.upsertMany(campaignId, entries);
// Returns: { success: boolean, upsertedCount: number }
```

**Updating Stats:**
```typescript
await Services.entries.upsertStats(campaignId, {
  totalRegistrations: 5000,
  winnerCount: 500,
  status: 'FINISHED'
});
```

---

### Code Service

**Reserving Codes:**
```typescript
const codes = await Services.codes.reserveCodes({
  campaignId,
  marketId,
  count: 100
});
// Returns: Array<string> (access codes)
```

**Marking Codes as Assigned:**
```typescript
await Services.codes.markAssigned({
  codes: ['CODE-123', 'CODE-456'],
  campaignId,
  marketId
});
```

---

### User Service

**Batch Upserting Users:**
```typescript
const result = await Services.users.upsertMany([
  {
    globalUserId: 'user-123',
    email: 'user1@example.com',
    firstName: 'John',
    lastName: 'Doe'
  },
  {
    globalUserId: 'user-456',
    email: 'user2@example.com',
    firstName: 'Jane',
    lastName: 'Smith'
  }
]);
```

---

### DynamoDB Operations

**Fetching Entry:**
```typescript
const entry = await Services.aws.demandTable.get({
  pk: `CAMPAIGN#${campaignId}`,
  sk: `USER#${globalUserId}`
});
```

**Updating Entry:**
```typescript
await Services.aws.demandTable.update({
  pk: `CAMPAIGN#${campaignId}`,
  sk: `USER#${globalUserId}`,
  updates: {
    needsReplication: false,
    replicatedAt: new Date().toISOString()
  }
});
```

**Batch Writing:**
```typescript
await Services.aws.demandTable.batchWrite({
  puts: [
    { pk: 'KEY1', sk: 'SORT1', data: {...} },
    { pk: 'KEY2', sk: 'SORT2', data: {...} }
  ],
  deletes: [
    { pk: 'KEY3', sk: 'SORT3' }
  ]
});
```

---

### Redis Caching

**Getting Campaign from Cache:**
```typescript
const cachedCampaign = await Services.redis.get(`campaign:${slug}`);
if (!cachedCampaign) {
  // Fetch from MongoDB and cache
  const campaign = await Services.mongo.campaigns.findOne({ slug });
  await Services.redis.set(`campaign:${slug}`, JSON.stringify(campaign), 'EX', 3600);
}
```

---

### Kafka Publishing

**Publishing to Kafka Topic:**
```typescript
await Services.kafka.send({
  topic: 'registration.data',
  messages: [
    {
      key: campaignId,
      value: JSON.stringify({
        type: 'REGISTRATION',
        data: registrationPayload
      })
    }
  ]
});
```

---

## Error Handling

### Worker Error Patterns

**SQS Batch Failures:**
```typescript
// Mark specific messages for retry
return {
  batchItemFailures: failedRecords.map(record => ({
    itemIdentifier: record.messageId
  })),
  count: {
    received: records.length,
    processed: successCount,
    failed: failedRecords.length
  }
};
```

**Validation Errors:**
```typescript
// Return ineligible response with reason
if (!isValidCampaign) {
  return {
    isEligible: false,
    reason: INELIGIBLE_REASON.CAMPAIGN_NOT_FOUND
  };
}
```

**Service Call Errors:**
```typescript
try {
  const result = await Services.entries.upsertMany(campaignId, entries);
} catch (error) {
  log.error('Entry service error', formatError(error));
  // Return failure for retry
  return { batchItemFailures: [{ itemIdentifier: record.messageId }] };
}
```

---

### Error Codes

| Error Code | Meaning | Recovery Action |
|-----------|---------|-----------------|
| `CAMPAIGN_NOT_FOUND` | Campaign doesn't exist | Check slug, verify campaign is published |
| `CAMPAIGN_CLOSED` | Registration period ended | Wait for next campaign |
| `INTERNAL_SERVER_ERROR` | Unexpected server error | Retry request, check logs |
| `INVALID_ENTRY` | Entry validation failed | Fix entry fields, check campaign preferences |
| `INELIGIBLE_ENTRY` | Entry doesn't meet requirements | Review campaign eligibility rules |
| `NO_INVITE` | Invite-only campaign, no invite | Obtain invite or wait for open registration |
| `LINKED_ENTRY` | Already registered in linked campaign | Cannot register in both campaigns |
| `IDV_REQUIRED` | Identity verification required | Complete IDV process first |

---

### HTTP Error Codes (Service Calls)

| Status Code | Meaning | Typical Cause |
|------------|---------|---------------|
| 400 | Bad Request | Invalid payload or parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists or state conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected service error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Rate Limits

### SQS Processing

- **Max batch size:** 10 messages per invocation (configurable)
- **Visibility timeout:** 30 seconds (configurable)
- **Max receive count:** 3 attempts before DLQ

### DynamoDB

- **Batch operations:** Max 25 items per batch
- **Throughput:** On-demand scaling (no hard limits)

### Service APIs

- **Entry Service:** 100 requests/second per campaign
- **Code Service:** 50 requests/second for reservations
- **Campaign Service:** 200 requests/second (cached)

---

## Observability

### OpenTelemetry Tracing

All workers are instrumented with OpenTelemetry spans:

**Trace Context:**
- `correlation.id` - Request correlation ID
- `correlation.awsRequestId` - AWS Lambda request ID
- `span.campaignId` - Campaign being processed
- `span.workerName` - Worker function name

**Custom Spans:**
```typescript
await Services.tracer.startActiveSpan('validateEntry', async (span) => {
  // Validation logic
  span.setAttribute('entry.campaignId', campaignId);
  span.setAttribute('entry.userId', globalUserId);
  span.end();
});
```

---

### CloudWatch Logs

**Log Structure:**
```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "INFO",
  "tag": "registration:apps:checkEligibility",
  "message": "Eligibility check completed",
  "correlationId": "correlation-123",
  "data": {
    "campaignId": "campaign-789",
    "isEligible": true
  }
}
```

**Log Levels:**
- `ERROR` - Errors requiring attention
- `WARN` - Warnings (non-critical issues)
- `INFO` - Informational messages
- `DEBUG` - Debug-level details (dev/qa only)

---

## Deployment

### Terraform Stacks

Workers are deployed via Terraform stacks:

```bash
cd terraform/stacks/registration
terramisu apply -e tm-nonprod/qa
```

**Available Stacks:**
- `registration` - checkEligibility, upsertUsers
- `replication` - enqueueEntries, saveEntries, retryScore
- `selection` - enqueueMarketSelections, saveSelections, refreshSelections, markAssignedCodes
- `dataPipeline` - processData, sendData
- `notification` - notificationGenerator, getMarketsToNotify

---

### Environment Variables

**Required:**
- `CONFIG_ENV` - Environment name (dev, qa, preprod, prod)
- `APP_NAME` - Worker name (e.g., `checkEligibility`)
- `AWS_REGION` - AWS region (e.g., `us-east-1`)

**Optional:**
- `LOG_LEVEL` - Logging level (DEBUG, INFO, WARN, ERROR)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry collector endpoint

---

## Testing

### Unit Tests

```bash
npx run tests:unit
```

### Integration Tests

```bash
# Requires AWS credentials and running services
npx run tests:integration
```

### E2E Tests

```bash
# Full workflow testing
npx run tests:e2e
```

---

## Common Use Cases

### 1. Checking Fan Eligibility

**Scenario:** Frontend calls AppSync to validate fan before registration submission

**Flow:**
1. Frontend → AppSync → `checkEligibility` resolver
2. Worker fetches campaign from Redis cache
3. Worker validates campaign status (OPEN)
4. Worker checks campaign gate (invite-only, card gate, etc.)
5. Worker validates entry fields against campaign preferences
6. Worker returns eligibility result

---

### 2. Replicating Entries to Entry Service

**Scenario:** Eventual consistency between DynamoDB and MongoDB

**Flow:**
1. Entry created/updated in DynamoDB (demand-table)
2. DynamoDB stream triggers `enqueueEntries`
3. Worker filters entries with `needsReplication=true`
4. Worker enqueues to `saveEntriesQueue`
5. `saveEntries` worker processes queue
6. Worker validates current state vs stream event
7. Worker calls Entry Service to upsert/delete
8. Worker updates DynamoDB to unset `needsReplication`

---

### 3. Selecting Winners and Assigning Codes

**Scenario:** Campaign closes, winners are selected and assigned access codes

**Flow:**
1. Step Function invokes `enqueueMarketSelections` per market
2. Worker fetches scoring records from Entry Service
3. Worker reserves codes from Code Service
4. Worker enqueues selections to `saveSelectionQueue`
5. `saveSelections` worker processes selections
6. Worker assigns codes via Entry Service
7. Worker updates verdicts in DynamoDB
8. `markAssignedCodes` marks codes as assigned in Code Service

---

### 4. Publishing Data to Kafka

**Scenario:** Registration data published to analytics pipeline

**Flow:**
1. Data event queued to `processDataQueue`
2. `processData` worker formats and publishes to SNS
3. SNS fans out to type-specific SQS queues
4. `sendData` worker validates against JSON schemas
5. Worker publishes to Kafka topic (`registration.data`)
6. Analytics consumers process Kafka events

---

## Troubleshooting

### Worker Not Processing Messages

**Checks:**
1. Verify queue has messages: `aws sqs get-queue-attributes`
2. Check Lambda concurrency limits
3. Review CloudWatch logs for errors
4. Check DLQ for failed messages
5. Verify IAM permissions

---

### Replication Lag

**Checks:**
1. Monitor `saveEntriesQueue` depth
2. Check Entry Service response times
3. Review failed replication attempts in logs
4. Verify MongoDB availability
5. Check for race conditions (stale stream events)

---

### Code Reservation Failures

**Checks:**
1. Verify Code Service has available codes
2. Check code pool exhaustion
3. Review code reservation logs
4. Verify campaign/market mapping
5. Check for concurrent reservation conflicts

---

## Support and Documentation

- **Repository:** `git@git.tmaws.io:verifiedfan/registration/workers.git`
- **CLAUDE.md:** Comprehensive developer guide in repository root
- **Runfile:** `npx run` for available commands
- **Terraform:** `terraform/stacks/<stack>/` for infrastructure
