# API Usage - fan-identity-workers

## Overview

This document provides practical examples for consuming the fan identity workers APIs. All AppSync GraphQL resolvers require authentication via API key and optionally user tokens.

---

## Authentication

### AppSync Authorization

All GraphQL requests must include an authorization token in the header:

```
Authorization: <apiKey>:<userToken>
```

- **apiKey**: Required for all requests (validates against `config.verifiedfan.shared.aws.appsync.apiKey`)
- **userToken**: Optional SOTC (Single Origin Token Concept) for authenticated user requests

### Anonymous Requests (API Key Only)

```bash
curl -X POST https://appsync-endpoint.amazonaws.com/graphql \
  -H "Authorization: sk-abc123xyz:" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { getArmScore(globalUserId: \"user123\") { armScore } }"}'
```

### Authenticated Requests (API Key + User Token)

```bash
curl -X POST https://appsync-endpoint.amazonaws.com/graphql \
  -H "Authorization: sk-abc123xyz:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { checkLiveness(...) { ... } }"}'
```

### TMUO Header (Optional)

For user-specific requests, include Ticketmaster User Origin header:

```bash
curl -X POST https://appsync-endpoint.amazonaws.com/graphql \
  -H "Authorization: sk-abc123xyz:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "tmuo: tm-us" \
  -H "Content-Type: application/json"
```

---

## GraphQL Examples

### Identity Verification

#### Check Liveness (Tier: Always)

Request verification for a user with `always` tier (always require verification):

```graphql
mutation CheckLiveness {
  checkLiveness(
    options: {
      tier: "always"
      appId: "ticket-transfer"
      subjectId: "transfer-12345"
      verificationType: "selfie"
    }
    armScore: 3
    accountScore: 0.75
  ) {
    decision {
      requiresVerification
      rule
      verificationType
      token
      session {
        id
        status
        vendorSessionId
        date {
          created
          expiresAt
        }
      }
    }
  }
}
```

**Response (Verification Required)**:
```json
{
  "data": {
    "decision": {
      "requiresVerification": true,
      "rule": "always",
      "verificationType": "selfie",
      "token": null,
      "session": {
        "id": "sess_abc123",
        "status": "created",
        "vendorSessionId": "inq_xyz789",
        "date": {
          "created": "2025-01-15T10:00:00Z",
          "expiresAt": "2025-01-16T10:00:00Z"
        }
      }
    }
  }
}
```

#### Check Liveness (Tier: Low, Verification Not Required)

```graphql
mutation CheckLivenessLow {
  checkLiveness(
    options: {
      tier: "low"
      appId: "ticket-purchase"
      subjectId: "order-67890"
    }
    accountScore: 0.95
  ) {
    decision {
      requiresVerification
      rule
      token
      session {
        id
      }
    }
  }
}
```

**Response (Token Granted Without Verification)**:
```json
{
  "data": {
    "decision": {
      "requiresVerification": false,
      "rule": "low:accountScore",
      "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "session": null
    }
  }
}
```

#### Check Liveness (ASU Tier - Dynamic Verification Type)

ASU (Adaptive Step Up) tier determines verification type based on ARM score:

```graphql
mutation CheckLivenessASU {
  checkLiveness(
    options: {
      tier: "asu"
      appId: "high-value-purchase"
      subjectId: "purchase-99999"
    }
    armScore: 5
    accountScore: 0.45
  ) {
    decision {
      requiresVerification
      rule
      verificationType
      details
      session {
        verificationType
      }
    }
  }
}
```

**Response (High Risk - Government ID Required)**:
```json
{
  "data": {
    "decision": {
      "requiresVerification": true,
      "rule": "asu:armScore:5",
      "verificationType": "selfieAndGovID",
      "details": {
        "armScore": 5,
        "threshold": 4
      },
      "session": {
        "verificationType": "selfieAndGovID"
      }
    }
  }
}
```

#### Handle IDV Vendor Webhook Event

Process webhook callback from IDV vendor (Persona):

```graphql
mutation HandleIDVEvent {
  handleEvent(
    vendorId: "persona"
    payload: "{\"type\":\"inquiry.completed\",\"data\":{\"id\":\"inq_xyz789\",\"attributes\":{\"status\":\"completed\"}}}"
    signature: "sha256=abc123..."
  ) {
    session {
      id
      status
      token
      date {
        completed
        updated
      }
    }
  }
}
```

**Response (Verification Completed)**:
```json
{
  "data": {
    "session": {
      "id": "sess_abc123",
      "status": "completed",
      "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "date": {
        "completed": "2025-01-15T10:05:30Z",
        "updated": "2025-01-15T10:05:30Z"
      }
    }
  }
}
```

#### Error Handling - Failed Session

When user has a failed verification session within cooldown period:

```graphql
mutation CheckLivenessFailed {
  checkLiveness(
    options: {
      tier: "high"
      appId: "ticket-transfer"
      subjectId: "transfer-11111"
    }
  ) {
    error {
      __typename
      message
      sessionId
      expiresAt
    }
  }
}
```

**Response (Error)**:
```json
{
  "data": {
    "error": {
      "__typename": "LivenessCheckFailedError",
      "message": "Previous verification failed. Please wait before retrying.",
      "sessionId": "sess_failed_123",
      "expiresAt": "2025-01-15T11:00:00Z"
    }
  }
}
```

---

### User Scoring

#### Get ARM Risk Score

Retrieve ARM (Account Risk Model) score for a user:

```graphql
query GetArmScore {
  getArmScore(globalUserId: "user_abc123") {
    armScore
  }
}
```

**Response (Score Found)**:
```json
{
  "data": {
    "armScore": 3
  }
}
```

**Response (User Not Found)**:
```json
{
  "data": {
    "armScore": null
  }
}
```

---

## Event-Driven Worker Patterns

### Kinesis Stream Events

Workers consuming from Kinesis streams receive batched records:

#### User Activity Stream Event

```json
{
  "Records": [
    {
      "kinesis": {
        "data": "base64_encoded_data",
        "partitionKey": "user_abc123",
        "sequenceNumber": "49234567890123456789"
      },
      "eventSource": "aws:kinesis",
      "eventName": "aws:kinesis:record"
    }
  ]
}
```

**Decoded Data**:
```json
{
  "action": "login",
  "result": "success",
  "globalUserId": "user_abc123",
  "timestamp": "2025-01-15T10:00:00Z",
  "ipAddress": "192.0.2.1"
}
```

#### Purchase Activity Stream Event

```json
{
  "status": "SUCCESS",
  "customer": {
    "globalUserId": "user_xyz789",
    "email": "user@example.com"
  },
  "orderId": "order-12345",
  "items": [
    {
      "eventId": "evt-999",
      "quantity": 2,
      "price": 150.00
    }
  ],
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

### SQS Queue Messages

Workers consuming from SQS receive messages with metadata:

#### Account Activity Queue Message

```json
{
  "globalUserId": "user_abc123",
  "action": "update_email",
  "result": "success",
  "shouldRetry": false,
  "__meta": {
    "messageId": "msg-abc123",
    "receiptHandle": "AQEBxxx...",
    "attributes": {
      "ApproximateReceiveCount": "1"
    }
  }
}
```

#### Retry Logic

When processing fails, workers can mark messages for retry:

```typescript
// Worker returns unprocessed messages
return {
  processed: 5,
  errors: 1,
  unprocessed: [
    {
      ...failedMessage,
      shouldRetry: true
    }
  ]
}
```

---

### DynamoDB Stream Events

Workers triggered by DynamoDB streams receive change records:

#### ARAI Response Change Event

```json
{
  "Records": [
    {
      "eventName": "INSERT",
      "dynamodb": {
        "NewImage": {
          "globalUserId": { "S": "user_abc123" },
          "araiResponse": {
            "M": {
              "globalUserId": { "S": "user_abc123" },
              "firstName": { "S": "John" },
              "lastName": { "S": "Doe" },
              "emailAddress": { "S": "john.doe@example.com" },
              "loginActivities": {
                "L": [
                  {
                    "M": {
                      "result": { "S": "success" },
                      "at": { "S": "2025-01-15T10:00:00Z" }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  ]
}
```

---

## Token Verification

### JWT Token Structure

Tokens returned by identity verification have the following structure:

**Header**:
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "iss": "fan-identity",
  "sub": "user_abc123",
  "iat": 1705312800,
  "exp": 1705316400,
  "decisions": [
    {
      "appId": "ticket-transfer",
      "subjectId": "transfer-12345",
      "tier": "high",
      "requiresVerification": true,
      "verificationType": "selfie",
      "rule": "high:notInLast:30d",
      "timestamp": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Token Validation (Node.js)

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const publicKey = fs.readFileSync('public-key.pem');

try {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'fan-identity'
  });

  console.log('Token valid for user:', decoded.sub);
  console.log('Decisions:', decoded.decisions);
} catch (error) {
  console.error('Token verification failed:', error.message);
}
```

---

## Error Handling

### Common Error Responses

#### Authentication Error

```json
{
  "error": {
    "message": "Unauthorized",
    "errorType": "UnauthorizedException"
  }
}
```

#### Validation Error

```json
{
  "error": {
    "message": "Invalid tier value. Must be one of: always, high, medium, low, asu, test-always, test-never",
    "errorType": "ValidationException",
    "data": {
      "field": "tier",
      "value": "invalid-tier"
    }
  }
}
```

#### Vendor Service Error

```json
{
  "error": {
    "message": "IDV vendor service unavailable. Bypass token issued.",
    "errorType": "VendorRequestFailedError",
    "errorInfo": {
      "bypass": true,
      "requiresVerification": true
    }
  }
}
```

#### Session Error

```json
{
  "data": {
    "error": {
      "__typename": "LivenessCheckFailedError",
      "message": "Previous verification failed. Please wait before retrying.",
      "name": "LivenessCheckFailedError",
      "sessionId": "sess_failed_123",
      "expiresAt": "2025-01-15T11:00:00Z"
    }
  }
}
```

---

## Rate Limits

### AppSync Throttling

- Default: 1000 requests per second per AWS account per Region
- Burst: 2000 requests per second
- Configurable via API-level throttling settings

### Lambda Concurrency

- Per-function concurrent execution limits configurable via Terraform
- Default: 1000 concurrent executions per account per region
- Reserved concurrency can be set per worker

---

## Monitoring & Observability

### OpenTelemetry Tracing

All workers are instrumented with OpenTelemetry for distributed tracing:

**Trace Context Headers**:
```
X-Correlation-ID: <uuid>
X-Amzn-Trace-Id: Root=1-63c1...; Parent=abc123; Sampled=1
```

### CloudWatch Logs

Workers emit structured logs with correlation IDs:

```json
{
  "level": "info",
  "message": "authorizing request",
  "requestId": "req-abc123",
  "queryString": "checkLiveness",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### CloudWatch Metrics

Key metrics published:

- `WorkerInvocations` - Total worker invocations
- `WorkerErrors` - Error count
- `WorkerDuration` - Execution duration (ms)
- `StreamRecordsProcessed` - Records processed from streams
- `QueueMessagesProcessed` - Messages processed from SQS

---

## Testing

### Local Worker Invocation

Invoke a worker locally with test data:

```bash
npx run workers:invoke validateToken '[{
  "authorizationToken": "sk-test:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requestContext": {
    "requestId": "test-req-123",
    "queryString": "checkLiveness",
    "variables": {}
  },
  "requestHeaders": {
    "tmuo": "tm-us"
  }
}]'
```

### Integration Tests

Run integration tests that simulate full event flows:

```bash
# All integration tests
npx run tests:integration

# Specific integration test
npx run tests:integration -- test/integration/checkLiveness.spec.ts
```

### Feature/E2E Tests (Cucumber)

Run BDD scenarios:

```bash
# All feature tests
npx run tests:feature

# Specific scenario
npx run tests:scenario "User completes liveness verification"

# By tags
npx run tests:tags "@idv"
```

---

## Configuration Management

### Environment-Specific Configuration

Configuration is loaded from YAML files in `configs/`:

```yaml
# configs/dev.config.yml
verifiedfan:
  shared:
    aws:
      appsync:
        apiKey: "sk-dev-key-abc123"
  identity:
    features:
      livenessCheckEnabled: true
    rules:
      high:
        notInLastDays: 30
      medium:
        notInLastDays: 90
      low:
        accountScoreThreshold: 0.5
```

### Accessing Configuration in Workers

```typescript
import config from '../../../shared/config';

const apiKey = config.getIn(['verifiedfan', 'shared', 'aws', 'appsync', 'apiKey']);
const notInLastDays = config.getIn(['verifiedfan', 'identity', 'rules', 'high', 'notInLastDays']);
```

---

## Deployment

### Terraform Stacks

Workers are deployed in stacks organized by domain:

```bash
# Deploy auth stack
cd terraform/stacks/auth
terraformer tm-nonprod/dev apply

# Deploy idv stack
cd terraform/stacks/idv
terraformer tm-nonprod/qa apply

# Deploy scoring stack
cd terraform/stacks/scoring
terraformer tm-prod/prod apply
```

### Individual Worker Deployment

Deploy specific worker using GitLab CI target:

```yaml
# gitlab-ci/stacks/idv.yml
checkLiveness deploy qa:
  extends:
    - .idv_variables
    - .qa_manual_target_deploy
  variables:
    TARGET: module.checkLiveness
```

---

## Best Practices

### 1. Authentication

- Always include API key in authorization header
- Use HTTPS/TLS for all requests
- Rotate API keys regularly
- Never expose tokens in client-side code

### 2. Retry Logic

- Implement exponential backoff for transient errors
- Respect rate limits and throttling responses
- Use SQS DLQ for failed messages
- Set appropriate Lambda timeout values

### 3. Token Management

- Cache JWT tokens until expiration
- Validate token signatures server-side
- Check token expiration before use
- Handle token refresh gracefully

### 4. Error Handling

- Parse error types from `__typename` or `errorType`
- Display user-friendly messages for client errors
- Log detailed error information for debugging
- Implement circuit breakers for upstream dependencies

### 5. Monitoring

- Track correlation IDs across requests
- Monitor CloudWatch metrics for anomalies
- Set up alarms for error thresholds
- Use X-Ray for distributed tracing

---

## Support

For questions or issues:

- **Repository**: Internal GitLab repository
- **Slack**: #fan-identity channel
- **Documentation**: Confluence wiki
- **Incidents**: PagerDuty rotation
