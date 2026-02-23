# Data Flow - appsync

## Primary Flow

This AppSync GraphQL API uses a **pipeline resolver pattern** where GraphQL requests flow through multiple chained functions, each performing specific operations and sharing data via context.

```
GraphQL Request
    ↓
AppSync Gateway (authentication, authorization)
    ↓
Resolver (field-specific entry point)
    ↓
Pipeline Functions (chain of operations)
    ├─> Function 1: request() → Data Source → response()
    ├─> Function 2: request() → Data Source → response()
    ├─> Function 3: request() → Data Source → response()
    └─> Function N: request() → Data Source → response()
    ↓
Final Response (aggregated from ctx.stash and ctx.result)
    ↓
GraphQL Response
```

## Request/Response Cycle

### Query Flow Example: `VFApi.accountFanscore`

This query demonstrates the full pipeline pattern for calculating a fan's account score:

**1. Client Request**
```graphql
query {
  api {
    accountFanscore(globalUserId: "user123", eventId: "evt456") {
      score
      rawScore
      boosts {
        arm
        event
        model
      }
    }
  }
}
```

**2. Pipeline Execution** (from `resolvers.tf`)

```
Resolver: apiAccountFanscore
    ↓
[1] getAccountFanscoreGlobalUserId
    Data Source: fan_identity_table (DynamoDB)
    Action: Query fan_identity by globalUserId
    Stash: ctx.stash.score (if found)
    Early Exit: If score found, skip step 2
    ↓
[2] getAccountFanscoreMemberId
    Data Source: account_fanscore_table (DynamoDB)
    Action: Query account_fanscore by memberId
    Stash: ctx.stash.score, ctx.stash.rawScore
    Early Exit: If score already set by step 1
    ↓
[3] getArmScore
    Data Source: arm_scoring (Lambda)
    Action: Call ARM risk scoring service
    Stash: ctx.stash.armScore, ctx.stash.armBoost
    ↓
[4] getDiscoEventId
    Data Source: demand_table (DynamoDB)
    Action: Map event ID to internal discovery event ID
    Stash: ctx.stash.discoEventId
    ↓
[5] getEventDemandRecord
    Data Source: demand_table (DynamoDB)
    Action: Query event-specific demand data
    Stash: ctx.stash.eventData
    ↓
[6] getBotOrNotCursor
    Data Source: fan_identity_table (DynamoDB)
    Action: Setup cursor for bot detection query
    Stash: ctx.stash.botCursor
    ↓
[7] getBotOrNot
    Data Source: fan_identity_table (DynamoDB)
    Action: Fetch bot/not-bot score
    Stash: ctx.stash.botScore
    ↓
[8] calcAccountScore
    Data Source: none (pure computation)
    Action: Calculate final score with all boosts
    Result: {score, rawScore, boosts{arm, event, model}}
```

**3. Response Assembly**

The final function returns the computed result with all accumulated data:
```json
{
  "score": 87,
  "rawScore": 75,
  "boosts": {
    "arm": 5,
    "event": 4,
    "model": 3
  }
}
```

### Mutation Flow Example: `demandRecordSave`

**1. Client Request**
```graphql
mutation {
  demandRecordSave(input: {
    eventId: "evt123"
    saleId: "sale456"
    email: "fan@example.com"
  }) {
    status
    record { ... }
  }
}
```

**2. Pipeline Execution**

```
Resolver: demandMutationTemplate
    ↓
[1] tmAccountInfo
    Data Source: proxy_tm_account_service (Lambda)
    Action: Fetch Ticketmaster account info
    Stash: ctx.stash.userInfo {global_user_id, member_id, email}
    Error: 401 if not logged in
    ↓
[2] getDemandSaleRecord
    Data Source: demand_table (DynamoDB)
    Action: Query existing sale records
    Stash: ctx.stash.existingSaleRecord
    ↓
[3] getDemandEventRecord
    Data Source: demand_table (DynamoDB)
    Action: Query existing event records
    Stash: ctx.stash.eventRecord
    ↓
[4] saveDemandRecord
    Data Source: demand_table (DynamoDB)
    Action: PutItem with merged data
    Keys: PK=fan:{global_user_id}, SK=demand#{eventId}-{saleId}
    Result: {status: "SUCCESS", record: {...}}
```

**3. Response**
```json
{
  "status": "SUCCESS",
  "record": {
    "eventId": "evt123",
    "saleId": "sale456",
    "fanId": "user123"
  }
}
```

## State Management

### Context (`ctx`) Object

AppSync provides a context object that flows through the entire pipeline:

**Key Context Properties**:
- `ctx.args` - GraphQL field arguments
- `ctx.identity` - Authentication/authorization info (JWT claims)
- `ctx.stash` - Shared data between functions (mutable)
- `ctx.prev.result` - Previous function's result
- `ctx.result` - Current data source operation result
- `ctx.error` - Error from data source or previous function

**Stash Pattern** (primary state management):
```typescript
// Function 1: Store user info
export function response(ctx: Context) {
  ctx.stash.userInfo = {
    global_user_id: ctx.result.globalUserId,
    member_id: ctx.result.memberId
  };
  return ctx.result;
}

// Function 2: Use stored user info
export function request(ctx: Context) {
  const userId = ctx.stash.userInfo.global_user_id;
  return {
    operation: 'Query',
    query: { expression: 'userId = :userId', ... }
  };
}
```

### Early Return Mechanism

Functions can short-circuit the pipeline using `runtime.earlyReturn()`:

```typescript
export function request(ctx: Context) {
  // If score already found, skip remaining pipeline
  if (ctx.stash.score !== undefined) {
    runtime.earlyReturn({ score: ctx.stash.score });
  }
  // Otherwise, proceed with data source operation
  return { operation: 'Query', ... };
}
```

This optimizes performance by skipping unnecessary operations.

## Event Processing

### Asynchronous Event Flow (EventBridge)

The `upsertUser` function demonstrates event-driven architecture:

**1. Synchronous Request**
```
GraphQL Mutation: upsertEntry
    ↓
Pipeline Function: upsertUser
    ↓
Data Source: EventBridge (upsert_user)
    ↓
Event Published: "user.upsert" event
    ↓
Immediate Return (fire-and-forget)
```

**2. Asynchronous Processing**
```
EventBridge
    ↓
EventBridge Rule (downstream consumers)
    ↓
Multiple Lambda Functions (event handlers)
    ├─> Update user profiles
    ├─> Trigger notifications
    └─> Sync to external systems
```

**Key Characteristics**:
- **Non-blocking**: GraphQL mutation returns immediately
- **Decoupled**: Consumers are independent of the API
- **Scalable**: EventBridge handles fan-out and retry logic
- **Auditable**: Events provide audit trail

### Liveness Check Flow (Synchronous Events)

The `checkLiveness` mutation shows synchronous event handling:

```
GraphQL Mutation: checkLiveness
    ↓
Pipeline Functions:
    [1] getAccountFanscoreGlobalUserId (lookup user)
    [2] getArmScore (get risk score)
    [3] checkLiveness (call IDV service)
    ↓
Data Source: idv_check_liveness (Lambda)
    ↓
Lambda: Synchronous invocation
    ├─> Start AWS Rekognition liveness session
    ├─> Store session in DynamoDB
    └─> Return session ID
    ↓
Response: {sessionId, status}
```

## External Integrations

### Integration Patterns

The API integrates with external systems using different patterns based on requirements:

| Integration | Direction | Type | Purpose | Pattern |
|-------------|-----------|------|---------|---------|
| **DynamoDB Tables** | Read/Write | Database | Primary data persistence | Direct data source |
| **Lambda Functions** | Invoke | Compute | External service proxies | Lambda data source |
| **HTTP Endpoints** | Call | External API | LNAA API integration | HTTP data source |
| **EventBridge** | Publish | Event Bus | Asynchronous workflows | EventBridge data source |
| **Campaign Service** | Read | REST API | Campaign lookup | Lambda proxy |
| **TM Account Service** | Read | REST API | User account info | Lambda proxy |
| **ARM Scoring** | Read | REST API | Risk scoring | Lambda proxy |
| **IDV Service** | Read/Write | REST API | Identity verification | Lambda proxy |
| **Phone Scoring** | Read | REST API | Phone number validation | Lambda proxy |

### Data Source Categories

**1. DynamoDB Tables (Primary Storage)**
- `account_fanscore_table` - Fan scoring data
- `fan_identity_table` - Fan identity and profile
- `verification_table` - Verification status records
- `demand_table` - Event demand and entry records

**2. Lambda Proxies (External Services)**
- `proxy_campaign_service` - Campaign management
- `proxy_tm_account_service` - Ticketmaster accounts
- `arm_scoring` - Anti-fraud risk scoring
- `idv_check_liveness` - Identity verification
- `get_updated_phonescore` - Phone number validation
- `check_eligibility` - Registration eligibility
- `event_details` - Event information

**3. HTTP Endpoints (Direct API Calls)**
- `lnaa_api` - Live Nation Artists & Attractions API

**4. EventBridge (Event Publishing)**
- `upsert_user` - User update events

### Authentication & Authorization Flow

```
GraphQL Request with Auth Token
    ↓
AppSync API Gateway
    ├─> Validate JWT token (Cognito User Pool)
    ├─> Check API key (for public endpoints)
    └─> Extract identity claims
    ↓
ctx.identity populated with:
    - username
    - sub (user ID)
    - claims (JWT payload)
    - sourceIp
    ↓
Resolver/Function: Access ctx.identity for authorization
    ├─> Check user permissions
    ├─> Validate ownership
    └─> Filter data based on identity
    ↓
Continue pipeline or error
```

**Authorization Patterns**:
1. **Login-required**: Use `throwIfNotLoggedIn()` from `shared.ts`
2. **Owner-only**: Compare `ctx.identity.sub` with resource owner
3. **Public**: Allow any authenticated user
4. **API key**: Allow public access with rate limiting

### Error Propagation

Errors flow upward through the pipeline:

```
Function N: Error occurs
    ↓
util.error(message, code)
    ↓
Pipeline stops immediately
    ↓
AppSync Gateway
    ↓
GraphQL Error Response:
{
  "errors": [{
    "message": "User not logged in",
    "errorType": "401",
    "errorInfo": { "code": "NOT_LOGGED_IN" }
  }]
}
```

**Error Handling Strategies**:
1. **Early validation**: Check preconditions in first functions
2. **Graceful degradation**: Use early return with partial data
3. **Structured errors**: Include error codes and info for client handling
4. **Lambda errors**: `lambdaResponse()` template handles Lambda invocation errors

### Caching Strategy

AppSync caching is configured at the resolver level:

```terraform
# In resolvers.tf
caching_config = {
  keys = ["$context.arguments.eventId"]  # Cache key
  ttl  = 300                              # 5 minutes
}
```

**Example**: `Demand.eventDetails` resolver caches event data for 5 minutes per eventId

**Benefits**:
- Reduced Lambda invocations
- Lower DynamoDB read costs
- Faster response times
- Better user experience
