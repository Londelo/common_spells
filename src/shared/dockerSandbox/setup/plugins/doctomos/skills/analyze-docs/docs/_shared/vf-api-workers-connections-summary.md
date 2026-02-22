# vf-api-workers Connection Detection Summary

**Repository**: vf-api-workers
**Classification**: worker
**Generated**: 2026-01-24T17:30:00Z
**Agent**: Connection Detection Agent

---

## Overview

The **vf-api-workers** repository is a serverless Lambda-based worker system that processes fan scoring and verification data. It serves as a critical bridge between the campaign pipeline's scoring output and downstream services like entry-service and AppSync.

**Key Role**: Score ingestion, verification management, and operations visibility through automated Slack notifications.

---

## Connections Discovered

### 1. Service Dependencies

**Depends On**:
- `campaign-service` - Proxied for AppSync campaign queries
- `entry-service` - Receives rank-0 fan scores
- `user-service` - Provides user profile context
- **External**: Slack API (notifications), Telesign API (phone scoring)

**Depended By**: None (leaf worker in the dependency graph)

### 2. Data Flow Connections

#### Kinesis Streams

**Publishes To**:
- `prd2011-{env}-api-scores-stream` - Internal score processing loop
  - Publisher: `loadScoresToStream` worker
  - Consumer: `loadScoresToDynamoDB` worker (same repo)
- `prd2011-{env}-vf1-input-stream` - Rank-0 scores for campaign pipeline
  - Publisher: `saveEntryScoring` worker
  - Consumer: `campaign-pipeline-workers`

**Consumes From**:
- `prd2011-{env}-api-scores-stream` - Internal score stream

#### DynamoDB Tables

**Shared Tables** (Read/Write):
- `prd2011-{env}-us-east-1-verification-table`
  - Also used by: `appsync`, `entry-service`
  - Purpose: Verification records for IDV and liveness checks

- `prd2011-{env}-us-east-1-fan-identity-table`
  - Also used by: `appsync`, `entry-service`
  - Purpose: Fan identity and fanscore data

- `prd3292-{env}-us-east-1-demand-table`
  - Also used by: `registration-workers`, `demand-workers`, `campaign-pipeline-workers`
  - Purpose: Event interest tracking and notification sign-ups

**DynamoDB Streams Consumed**:
- `prd3292-{env}-dmnd-table-stream` - Triggers `processSavedScores` for count aggregation

#### SQS Queues

**Consumes From**:
- `prd2011-{env}-us-east-1-api-queue-vdct` (verdict-reporter-queue)
  - Publisher: `campaign-pipeline-workers`
  - Consumer: `verdictReporter` worker
  - Purpose: Verdict notifications for Slack reporting
  - **Note**: Resolves previously orphaned queue anomaly

#### S3 Buckets

**Reads From**:
- `prd2011.{env}.us.east.1.vf-scoring.tmaws`
  - Also used by: `campaign-pipeline-workers`
  - Workers: `loadScoresToStream`, `saveFanlistScores`
  - Purpose: Scored CSV files from data science/campaign pipeline

### 3. AppSync Integration

**Lambda Resolvers Provided**:
- `proxyCampaignService` - Proxies campaign-service for AppSync GraphQL queries
- `lookupPhoneScore` - Provides phone score lookups via Telesign integration

**Integration Type**: Direct Lambda function resolvers for AppSync GraphQL API

### 4. Library Usage

**Internal @verifiedfan/* Libraries** (17 packages):

| Library | Version | Also Used By |
|---------|---------|--------------|
| @verifiedfan/aws | 2.11.1 | entry-service, appsync, campaign-pipeline-workers, demand-workers, export-service, upload-service |
| @verifiedfan/batch-fn | 1.2.1 | appsync, campaign-pipeline-workers, demand-workers |
| @verifiedfan/configs | 1.2.4 | campaign-service, entry-service, appsync, campaign-pipeline-workers, demand-workers, user-service, code-service, export-service |
| @verifiedfan/log | 1.4.1 | campaign-service, entry-service, monoql, appsync, user-service, code-service, export-service, upload-service |
| @verifiedfan/tracing | 3.0.1 | campaign-service, entry-service, monoql, campaign-pipeline-workers, demand-workers, user-service, export-service |

**Version Alignment**: Most libraries align well with other repos. No major version drift detected.

### 5. Technology Stack Patterns

**Matches Patterns**:
- `serverless-event-driven` - With registration-workers, appsync, campaign-pipeline-workers
- `typescript-node18` - With registration-workers
- `dynamodb-users` - With registration-workers, entry-service, appsync, campaign-pipeline-workers
- `ramda-functional` - Functional programming style shared across 10 repos
- `bdd-testing` - Jest + Cucumber like 9 other repos
- `kinesis-publishers` - With campaign-service, entry-service, campaign-pipeline-workers, user-service
- `kinesis-consumers` - With demand-workers, campaign-pipeline-workers
- `lambda-integrations` - With appsync, campaign-pipeline-workers, upload-service
- `terraform-infrastructure` - With appsync

---

## Anomalies & Resolutions

### Resolved

**Orphaned Queue Resolution**:
- **Original Anomaly**: campaign-pipeline-workers publishes to `verdict-reporter-queue` but no known consumers documented
- **Resolution**: vf-api-workers consumes this queue via `verdictReporter` worker
- **Status**: ✅ Resolved

### New Anomalies Detected

**None** - All connections appear documented and accounted for.

### Library Version Analysis

**Healthy Dependencies**:
- All 17 internal @verifiedfan/* libraries use versions consistent with other repos
- No major version drift detected
- Modern versions aligned with other serverless workers

**Outdated External Libraries** (from dependency analysis):
- ⚠️ **uuid v3.2.1** - 6+ major versions behind, security vulnerabilities
- ⚠️ **moment v2.24.0** - Deprecated, should migrate to date-fns or dayjs
- ⚠️ **ramda v0.27.0** - Several versions behind (heavily used in 30+ files)

---

## Data Pipeline Position

```
┌─────────────────────────────────────────────────────────────────┐
│                     Campaign Data Pipeline                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │ Data Science Scoring │
                    │   (External Team)    │
                    └──────────┬───────────┘
                              ↓
                    ┌─────────────────────┐
                    │  S3: vf-scoring     │
                    │  (scored CSV files) │
                    └──────────┬───────────┘
                              ↓
            ┌─────────────────────────────────────┐
            │      vf-api-workers (THIS REPO)     │
            ├─────────────────────────────────────┤
            │ • loadScoresToStream                │
            │ • loadScoresToDynamoDB              │
            │ • saveFanlistScores                 │
            │ • saveEntryScoring                  │
            │ • processSavedScores                │
            │ • verdictReporter                   │
            └─────┬───────────┬───────────┬───────┘
                  ↓           ↓           ↓
         ┌────────────┐  ┌─────────┐  ┌───────┐
         │ DynamoDB   │  │ Kinesis │  │ Slack │
         │ Tables     │  │ Streams │  │  API  │
         └─────┬──────┘  └────┬────┘  └───────┘
               ↓              ↓
         ┌─────────────┐  ┌──────────────────┐
         │ entry-      │  │ campaign-        │
         │ service     │  │ pipeline-workers │
         └─────────────┘  └──────────────────┘
```

---

## Integration Summary

### Upstream (Produces for)
- **campaign-pipeline-workers** - Rank-0 scores via vf1-input-stream
- **entry-service** - Score updates via Kinesis
- **appsync** - Campaign data proxy + phone score lookups
- **Slack** - Operations notifications

### Downstream (Consumes from)
- **campaign-pipeline-workers** - Scored CSV files (S3), verdict notifications (SQS)
- **Data Science Team** - Scored CSV files (S3)
- **DynamoDB Streams** - Demand table changes

### Peer Relationships
- **appsync** - Shares DynamoDB tables (verification, fan-identity)
- **registration-workers** - Shares demand-table
- **demand-workers** - Shares demand-table

---

## Repository Patterns

### Similar Architecture
- `registration-workers` - Serverless, Node.js 18, TypeScript, event-driven
- `demand-workers` - Lambda workers, notification processing
- `campaign-pipeline-workers` - Score processing, Lambda-based

### Shared Technology Stack
- **Runtime**: Node.js 18.x (shared with registration-workers)
- **Language**: JavaScript ES6 + TypeScript (shared with multiple repos)
- **Paradigm**: Functional Programming with Ramda (10 repos)
- **Testing**: Jest + Cucumber BDD (9 repos)
- **Infrastructure**: Terraform (shared with appsync)
- **CI/CD**: GitLab CI (standard across VF)

---

## Recommendations

### Immediate Actions
None required - all connections are healthy and documented.

### Future Considerations

1. **Library Updates**: Plan upgrades for outdated dependencies (uuid, moment, ramda)
2. **Monitoring**: Track shared DynamoDB table patterns with appsync and entry-service
3. **Documentation**: Continue documenting external service dependencies as they're discovered

---

## Files Updated

### Shared Knowledge Base
- ✅ `/Users/Brodie.Balser/.vf-docs/_shared/repo-index.json`
  - Added vf-api-workers entry
  - Updated cross_repo_patterns with new repo
  - Added to 14 pattern categories

- ✅ `/Users/Brodie.Balser/.vf-docs/_shared/connections-vf-api-workers-update.json`
  - Documented all data flow connections
  - Resolved verdict-reporter-queue anomaly
  - Tracked library version usage

### Repository Documentation
- ✅ `/Users/Brodie.Balser/.vf-docs/vf-api-workers/README.md`
  - Added "Related Repositories" section
  - Documented upstream/downstream connections
  - Listed shared infrastructure
  - Provided pipeline position diagram

---

## Summary Statistics

**Connections Found**:
- 3 service dependencies (campaign-service, entry-service, user-service)
- 2 external API integrations (Slack, Telesign)
- 3 shared DynamoDB tables
- 2 Kinesis streams (1 internal, 1 external)
- 1 SQS queue consumed
- 1 S3 bucket read
- 2 AppSync Lambda resolvers
- 17 internal @verifiedfan/* libraries

**Linked to Repos**:
- Direct: campaign-service, entry-service, user-service, campaign-pipeline-workers, appsync
- Indirect: registration-workers, demand-workers (via shared tables)

**Anomalies Detected**: 0 new, 1 resolved

**Status**: ✅ Success - All connections documented
