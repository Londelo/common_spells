# Architecture Patterns - appsync

## Architecture Style

**Identified Style**: **Serverless + Event-Driven + Pipeline Architecture**

**Evidence**:
- AWS AppSync managed GraphQL service (serverless)
- Lambda function integrations for external services (`datasources.tf` shows Lambda data sources)
- EventBridge integration for asynchronous event processing (`upsert_user` data source)
- Pipeline resolver pattern with function composition (`resolvers.tf` shows resolver pipelines)
- DynamoDB as primary data store (serverless database)
- No traditional application servers or containers
- Infrastructure entirely defined in Terraform

This is a **hybrid serverless architecture** that combines:
1. **AWS AppSync GraphQL** as the API layer
2. **Pipeline resolvers** for orchestrating multi-step operations
3. **Lambda functions** for external service integration
4. **EventBridge** for event-driven workflows
5. **DynamoDB** for data persistence

## Design Patterns Used

### 1. Pipeline Pattern (Primary Pattern)

**Location**: `terraform/resolvers.tf`, all resolver and function files

**Implementation**:
AppSync Pipeline Resolvers chain together multiple functions to handle complex operations. Each function in the pipeline:
- Has `request()` to prepare the operation
- Has `response()` to process results
- Uses `ctx.stash` to share data between functions
- Can use `runtime.earlyReturn()` to short-circuit the pipeline

**Example** (`accountFanscore` query):
```typescript
// Pipeline composition in resolvers.tf
pipeline = [
  getAccountFanscoreGlobalUserId,  // Step 1: Lookup user identity
  getAccountFanscoreMemberId,      // Step 2: Fetch fanscore from DB
  getArmScore,                      // Step 3: Get ARM risk score
  getDiscoEventId,                  // Step 4: Resolve event mapping
  getEventDemandRecord,             // Step 5: Get event-specific data
  getBotOrNotCursor,                // Step 6: Setup bot detection
  getBotOrNot,                      // Step 7: Fetch bot score
  calcAccountScore                  // Step 8: Calculate final score
]
```

Each function can:
- Exit early if conditions met (`getAccountFanscoreMemberId.ts` checks if score already set)
- Transform and enrich data in `ctx.stash`
- Query different data sources (DynamoDB, Lambda, HTTP)

### 2. Template Method Pattern

**Location**: `app/src/shared.ts` - `lambdaRequest`, `lambdaResponse`, `defaultResponseTemplate`

**Implementation**:
Shared templates provide consistent request/response handling for Lambda invocations and error handling:

```typescript
// Standard Lambda request wrapper
export function lambdaRequest(ctx: Context) {
  return {
    version: '2018-05-29',
    operation: 'Invoke',
    payload: ctx
  };
}

// Standard error handling for Lambda responses
export function lambdaResponse(ctx: Context) {
  if (ctx.error) util.error(ctx.error.message, ctx.error.type);
  // ... consistent error handling across all Lambda calls
}
```

### 3. Early Return Pattern

**Location**: Throughout function implementations (e.g., `getAccountFanscoreMemberId.ts`)

**Implementation**:
Functions use `runtime.earlyReturn()` to exit pipelines early when conditions are met, avoiding unnecessary downstream calls:

```typescript
// In getAccountFanscoreMemberId.ts
export function request(ctx: Context) {
  if (ctx.prev.result?.score !== undefined) {
    runtime.earlyReturn(ctx.prev.result);  // Score already found, skip DB lookup
  }
  // ... proceed with DB query
}
```

### 4. Data Access Object (DAO) Pattern

**Location**: Function layer with DynamoDB data sources

**Implementation**:
Functions abstract data access operations, mapping logical queries to DynamoDB operations:
- `getAccountFanscoreMemberId` - Query account_fanscore table
- `getDemandEventRecord` - Query demand table by event
- `saveEntryRecord` - Persist entry records

Each function encapsulates:
- Table access logic
- Query construction
- Data transformation
- Error handling

### 5. Service Proxy Pattern

**Location**: Lambda data sources in `datasources.tf`

**Implementation**:
External services are accessed via Lambda proxies that provide:
- Authentication/authorization
- Request transformation
- Error handling
- Service abstraction

Examples:
- `proxy_campaign_service` - Campaign service integration
- `proxy_tm_account_service` - Ticketmaster account service
- `arm_scoring` - ARM risk scoring service
- `idv_check_liveness` - Identity verification service

### 6. Event Sourcing Pattern (Partial)

**Location**: EventBridge integration (`upsert_user` data source)

**Implementation**:
The `upsertUser` function emits events to EventBridge rather than directly mutating state:

```typescript
// In functions.tf
"upsertUser" = {
  data_source = aws_appsync_datasource.upsert_user.name  // EventBridge
}
```

This enables:
- Asynchronous processing
- Decoupled components
- Event-driven workflows
- Audit trail of user actions

### 7. Stash Pattern (Context Sharing)

**Location**: All pipeline functions use `ctx.stash`

**Implementation**:
The `ctx.stash` object serves as a shared context for passing data between pipeline functions without polluting the response:

```typescript
// Function 1 puts data in stash
ctx.stash.userInfo = { global_user_id: '123' };

// Function 2 reads from stash
const userId = ctx.stash.userInfo.global_user_id;
```

Used extensively for:
- User identity information
- Event IDs and metadata
- Intermediate calculation results
- Cursor/pagination state

### 8. Validation Chain Pattern

**Location**: Registration pipeline (`resolvers.tf` - `upsertEntry`)

**Implementation**:
Multiple validation functions chained together, each checking different constraints:

```typescript
pipeline = [
  checkRegistrationEligibility,   // Validate registration allowed
  checkEntryPhoneUniqueness,      // Validate phone not already used
  getEntryRecord,                 // Check existing entry
  getAccountFanscoreGlobalUserId, // Validate user identity
  saveEntryRecord,                // Persist if valid
  deleteLinkedEntry               // Cleanup old entries
]
```

Each validator can fail fast with `util.error()`.

## Layer Separation

### Presentation Layer (GraphQL Schema)
- **Location**: `app/schema/types/*.graphql`
- **Responsibility**: Define API contract, types, queries, mutations
- **Dependencies**: None (pure schema definitions)

### Resolver Layer
- **Location**: `app/src/resolvers/*.ts`
- **Responsibility**: Handle GraphQL field resolution, orchestrate pipelines
- **Dependencies**: Functions, shared utilities, AppSync runtime
- **Pattern**: Each resolver exports `request()` and `response()` functions

### Function Layer (Business Logic)
- **Location**: `app/src/functions/*.ts`
- **Responsibility**: Reusable business logic, data access, external integrations
- **Dependencies**: Data sources (DynamoDB, Lambda, HTTP), shared utilities
- **Pattern**: Each function exports `request()` and `response()` functions

### Data Access Layer
- **Location**: Terraform data source definitions, function implementations
- **Responsibility**: Abstract data source access (DynamoDB, Lambda, HTTP, EventBridge)
- **Dependencies**: AWS services
- **Pattern**: Functions map to data sources via `functions.tf`

### Infrastructure Layer
- **Location**: `terraform/*.tf`
- **Responsibility**: AWS resource provisioning and configuration
- **Dependencies**: None (declarative infrastructure)

## Dependency Direction

The architecture follows **clean dependency rules**:

```
GraphQL Schema (presentation)
    ↓
Resolvers (orchestration)
    ↓
Functions (business logic)
    ↓
Data Sources (data/external services)
```

**Key principles**:
1. **Resolvers depend on Functions** - Resolvers compose functions but don't contain business logic
2. **Functions depend on Data Sources** - Functions interact with data but don't know about GraphQL
3. **Shared utilities are pure** - `shared.ts` and `utils/` provide reusable helpers with no external dependencies
4. **Infrastructure is separate** - Terraform layer is completely independent of application code

**No circular dependencies**: The pipeline pattern and clear layer separation prevent circular dependencies. Functions are atomic units that don't depend on each other - the resolver orchestrates their execution order.

## Deviations & Tech Debt

### 1. Legacy `lib/` Directory
**Issue**: Contains older JavaScript utilities not yet migrated to TypeScript
**Impact**: Inconsistent code style, lack of type safety
**Location**: `lib/` directory

### 2. Mixed Response Handling
**Issue**: Some resolvers use `shared.ts` templates, others have custom logic
**Impact**: Inconsistent error handling across resolvers
**Example**: Compare `phonescore.ts` (simple) vs `demandMutationTemplate.ts` (complex)

### 3. Spec Files in Source
**Issue**: `*.spec.ts` files are co-located with source in `app/src/`
**Impact**: Build must explicitly exclude them, risk of accidental inclusion
**Better Practice**: Separate `test/` directory mirroring `src/` structure

### 4. Implicit Stash Contract
**Issue**: No TypeScript types define what goes in `ctx.stash` - relies on convention
**Impact**: Easy to misuse, hard to refactor, no IDE autocomplete
**Location**: All functions using `ctx.stash`

### 5. Feature Tests on Live Environments
**Issue**: Cucumber tests run against real QA/dev deployments, not local/mocked
**Impact**: Tests are slow, can affect shared environment, require deployment to test
**Location**: `features/` directory

### 6. Terraform Module Duplication
**Issue**: `appsync_functions` and `appsync_resolvers` modules are nearly identical
**Impact**: Maintenance burden, code duplication
**Location**: `terraform/modules/`

### 7. No Domain Boundaries in Functions
**Issue**: All functions in flat `app/src/functions/` directory (40+ files)
**Impact**: Hard to navigate, unclear domain ownership
**Better Practice**: Group functions by domain (e.g., `functions/fanscore/`, `functions/demand/`)

### 8. Inconsistent Naming
**Issue**: Some functions use `get*` prefix, others use domain-specific names
**Example**: `getAccountFanscoreMemberId` vs `calcAccountScore` vs `tmAccountInfo`
**Impact**: Harder to understand function purpose at a glance
