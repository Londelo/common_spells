# Infrastructure Resources - appsync

## AWS AppSync GraphQL API

**API Type**: AWS AppSync GraphQL API
**Authentication Methods**:
- Primary: AWS IAM
- Additional: API Key (365-day rotation)
- Additional: Lambda Authorizer (custom token validation)

**Caching Configuration**:
- Per-resolver caching enabled
- Cache type: SMALL (nonprod), LARGE (prod)
- Default TTL: 300 seconds (5 minutes)
- At-rest encryption: Enabled
- Transit encryption: Enabled

**Lambda Authorizer**:
- Function: `prd2011-{env}-fanid-auth-token`
- Result TTL: 3600 seconds (1 hour)
- Used for custom authentication flows

## DynamoDB Tables

| Table | Purpose | Partition Key | Sort Key | GSIs |
|-------|---------|--------------|----------|------|
| `prd2011-{env}-us-east-1-acct-fanscore-table` | Account fan scores and member data | memberId | - | Used for scoring and verification |
| `prd2011-{env}-us-east-1-fan-identity-table` | Fan identity, phonescores, bot detection, liveness sessions | globalUserId | - | Stores identity verification data |
| `prd2011-{env}-us-east-1-verification-table` | Verification status records | - | - | Tracks verification states |
| `prd3292-{env}-us-east-1-demand-table` | Demand records, event registrations, entry records | - | - | Event demand and registration tracking |

**Notes**:
- Tables use environment tag format: `{base_name}-{environment_tag}`
- All tables support Query, Scan, GetItem, PutItem, UpdateItem, DeleteItem, BatchWriteItem, BatchGetItem operations
- GSI details available in respective service repositories

## Lambda Functions

### Proxy Services

| Function | Purpose | Environment Variable Name |
|----------|---------|---------------------------|
| `prd2011-{env}-proxy-cmp-srvc` | Campaign service proxy | `proxy_campaign_service_function_name` |
| `prd3292-{env}-prxy-acct` | TM Account service proxy | `proxy_tm_account_service_function_name` |
| `prd3292-{env}-evnt-dtls` | Event details lookup | `event_details_function_name` |

### Scoring & Verification

| Function | Purpose | Environment Variable Name |
|----------|---------|---------------------------|
| `prd2011-{env}-api-phone-scr` | Updated phonescore retrieval | `get_updated_phonescore_function_name` |
| `prd2011-{env}-acct-scrng-get-arm` | ARM scoring calculation | `arm_scoring_function_name` |
| `prd2011-{env}-idv-event` | Identity verification event handler | `idv_handle_event_worker_name` |
| `prd2011-{env}-idv-liveness` | Liveness check processor | `idv_check_liveness_worker_name` |
| `prd2011-{env}-reg-eligibility` | Registration eligibility checker | `check_eligibility_worker_name` |

## EventBridge

**Event Bus**: Default EventBridge event bus
**Data Source**: `upsert_user`
**Purpose**: Used for user update events and inter-service communication

## HTTP Data Sources

### Live Nation All Access API

**Endpoint**:
- Nonprod: `https://loyalty-user.staging.livenationapi.com`
- Prod: `https://loyalty-user.livenationapi.com`

**Data Source Name**: `lnaa_api`
**Purpose**: Live Nation loyalty program integration

## Custom Domain

**Format**: `appsync-{env}.fanid.{zone}`

**Nonprod Zones**:
- Public: `nonprod-tmaws.io`
- Private: `nonprod-tmaws.io`

**Prod Zones**:
- Public: `pub-tmaws.io`
- Private: `prod-tmaws.io`

**SSL/TLS**:
- ACM certificates with DNS validation
- Certificate transparency logging enabled
- CloudFront distribution for AppSync domain mapping

## IAM Roles & Policies

### AppSync Execution Role

**Role**: `{product_code}.{env}.{region}.tmaws-appsync`

**Attached Policies**:
- **PublishCloudwatch**: Permissions to write logs and metrics to CloudWatch
- **InvokeLambda**: Permission to invoke Lambda functions (account-wide)
- **DynamoPolicy**: Full CRUD access to all DynamoDB tables listed above
- **EventBridgePolicy**: Permission to put events to default event bus

**Permissions Summary**:
```
Lambda: lambda:InvokeFunction (all functions in account)
DynamoDB: GetItem, PutItem, UpdateItem, Query, Scan, DeleteItem, BatchWriteItem, BatchGetItem
CloudWatch: CreateLogGroup, CreateLogStream, PutLogEvents, PutMetricData
EventBridge: PutEvents (default bus)
```

### CloudWatch Logs Role

**Role**: `{product_code}.{env}.{region}.tmaws-log-appsync`

**Purpose**: CloudWatch log subscription filter to Kinesis

**Permissions**:
- `kinesis:PutRecord` to Kinesis log stream

## AppSync Pipeline Functions

**Total Functions**: 29 pipeline functions

**Function-to-DataSource Mapping**:

| Function Name | Data Source Type | Backend Resource |
|---------------|------------------|------------------|
| `deleteDemandRecord` | DynamoDB | demand_table |
| `getAccountFanscoreGlobalUserId` | DynamoDB | fan_identity_table |
| `getAccountFanscoreMemberId` | DynamoDB | account_fanscore_table |
| `getDemandEventRecord` | DynamoDB | demand_table |
| `getDemandSaleRecord` | DynamoDB | demand_table |
| `saveDemandRecord` | DynamoDB | demand_table |
| `tmAccountInfo` | Lambda | proxy_tm_account_service |
| `getUpdatedPhonescore` | Lambda | get_updated_phonescore |
| `readCachedPhonescore` | DynamoDB | fan_identity_table |
| `saveAccountPhonescore` | DynamoDB | fan_identity_table |
| `checkLiveness` | Lambda | idv_check_liveness |
| `getClusterCursor` | DynamoDB | fan_identity_table |
| `getCluster` | DynamoDB | fan_identity_table |
| `getBotOrNotCursor` | DynamoDB | fan_identity_table |
| `getBotOrNot` | DynamoDB | fan_identity_table |
| `checkEntryPhoneUniqueness` | DynamoDB | demand_table |
| `checkRegistrationEligibility` | Lambda | check_eligibility |
| `getEntryRecord` | DynamoDB | demand_table |
| `saveEntryRecord` | DynamoDB | demand_table |
| `deleteLinkedEntry` | DynamoDB | demand_table |
| `upsertUser` | EventBridge | default event bus |
| `getDemandVerificationStatusRecord` | DynamoDB | demand_table |
| `getApiVerificationStatus` | DynamoDB | verification_table |
| `getEventDemandRecord` | DynamoDB | demand_table |
| `getDiscoEventId` | DynamoDB | demand_table |
| `getArmScore` | Lambda | arm_scoring |
| `calcAccountScore` | NONE | Pure computation |
| `calcVerificationScore` | NONE | Pure computation |
| `getLivenessSession` | DynamoDB | fan_identity_table |
| `updateLivenessSessionSubmitted` | DynamoDB | fan_identity_table |

## GraphQL Resolvers

**Resolver Types**:
- **Direct Resolvers**: Single data source invocation
- **Pipeline Resolvers**: Chain multiple functions together

**Example Pipeline**: `VFApi.accountFanscore`
```
getAccountFanscoreGlobalUserId
  → getAccountFanscoreMemberId
  → getArmScore
  → getDiscoEventId
  → getEventDemandRecord
  → getBotOrNotCursor
  → getBotOrNot
  → calcAccountScore
```

**Caching Example**: `Demand.eventDetails`
- Cache keys: `$context.arguments.eventId`
- TTL: 300 seconds

## Resource Naming Convention

**Format**: `{product_code}-{environment_tag}-{resource_identifier}`

**Environment Tags**:
- qa1, qa2 (QA environments)
- dev1 (Development)
- preprod1 (Pre-production)
- prod1 (Production)

**Product Codes**:
- PRD2011: Verified Fan core services
- PRD3292: Demand/event services

**Region**: us-east-1 (primary region)

## Infrastructure-as-Code

**Tool**: Terraform
**Module Structure**:
- Core resources: `appsync.tf`, `datasources.tf`, `iam.tf`, `cloudwatch.tf`, `domain.tf`
- Resolver/Function modules: `modules/appsync_resolvers/`, `modules/appsync_functions/`
- Configuration management: `resolvers.tf`, `functions.tf`
- Environment configs: `tm-nonprod/{qa1,qa2,dev1}/`, `tm-prod/{preprod1,prod1}/`

**Deployment Tool**: Terramisu (Terraform wrapper)
