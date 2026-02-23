# Purpose - export-service

## What This Does

Export Service extracts campaign data (fan entries, codes, waitlists, email lists) from Verified Fan's MongoDB database and exports them as CSV or ZIP files to various S3 buckets for downstream consumption by marketing systems, ticketing platforms, and analytics tools.

## Business Context

Verified Fan campaigns generate millions of fan entries across campaigns for concerts, tours, and events. Promoters, artists, venues, and marketing partners need access to this data in standardized formats to run presales, send reminder emails, analyze fan engagement, and manage waitlists. Export Service bridges the gap between Verified Fan's operational database and external systems that consume this data for business operations.

## Target Users/Consumers

**Internal Users:**
- Campaign administrators requesting exports via API
- Supreme users managing CCPA data deletion

**External Systems (Primary Consumers):**
- Salesforce Marketing Cloud (SFMC) - consumes reminder email data
- Ticketing platforms - consume code assignments and entries
- Scoring systems - consume verified entries and scoring data
- Analytics/reporting tools - consume campaign performance data

## Key Business Capabilities

- **On-Demand Data Export**: Generate campaign exports in multiple formats (entries, codes, waitlists, opt-ins) on request
- **Queue-Based Processing**: Handles export requests asynchronously via polling queue to prevent overwhelming the database
- **Multi-Region Email Distribution**: Segments reminder email exports by region (NA, UK, etc.) and locale for international campaigns
- **Data Privacy Compliance**: Supports CCPA deletion workflows by removing user export data
- **Multiple S3 Bucket Routing**: Routes exports to appropriate S3 buckets based on export type and consumer requirements

## Business Requirements & Constraints

- REQ-001: Exports must process asynchronously to avoid blocking API responses
- REQ-002: System must support 15 distinct export types (entries, codes, scoring, opt-ins, waitlists, reminder emails, etc.)
- REQ-003: Exports must timeout after configured duration (default: timeoutMillis) to prevent hung jobs
- REQ-004: Queue must process one export at a time to prevent database overload
- REQ-005: CCPA-compliant exports must exclude certain export types (verified entries, scoring, auto reminder emails)
- REQ-006: Reminder email exports must segment by region and locale per Salesforce Marketing Cloud requirements
- REQ-007: Exports must support permission-based access control (REPORT permission required)
- REQ-008: System must track export status (PENDING → TRIGGERED → FINISHED/FAILED/EXPIRED)
- REQ-009: Scoring exports must have bucket-owner-full-control ACL; others must be private
- REQ-010: Waitlist exports must exclude members already scheduled in SMS waves

## Core Business Rules

- **Export Lifecycle**: Exports transition through states: PENDING (queued) → TRIGGERED (processing) → FINISHED/FAILED/EXPIRED
- **Single Active Export**: Only one export can be TRIGGERED at a time; others remain PENDING in queue
- **Duplicate Prevention**: If a PENDING or TRIGGERED export already exists for the same campaign/type/date, return existing export instead of creating duplicate
- **Timeout Management**: Exports TRIGGERED longer than timeoutMillis are marked EXPIRED and removed from queue
- **Market Data Required**: Entry exports require campaign markets; fail with NoMarketsFound if none exist
- **CCPA Filtering**: CCPA deletion requests skip VERIFIED_ENTRIES, SCORING, and AUTO_REMINDER_EMAIL export types
- **ACL Assignment**: Scoring exports use "bucket-owner-full-control"; all others use "private" ACL
- **Preliminary Count**: System counts entries before processing most exports (except disabled types) for progress tracking
- **Regional Segmentation**: Reminder email exports group by country code (US/CA → NA, GB → UK) and generate separate ZIP folders
- **SMS Wave Exclusion**: Waitlist exports query existing scheduled SMS waves and exclude those members from export
- **Locale Transformation**: Entry locales are transformed to SFMC-compatible locales per international market requirements

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Export completed | Upload CSV/ZIP file | S3 bucket (exportsS3, scoringS3, vfScoringS3, sfmcS3) | Immediately after export processing completes |
| Entry export | CSV file with fan entries | exportsS3 | On-demand request |
| Scoring export | CSV file with scoring data | scoringS3 | On-demand request |
| Verified entries | CSV file to VF scoring bucket | vfScoringS3 | On-demand request |
| Reminder email export | Segmented ZIP with regional CSVs | exportsS3 | On-demand request |
| Auto reminder email | CSV files for SFMC automation | sfmcS3 | On-demand request |
| Codes export | CSV with access codes | exportsS3 | On-demand request |
| Code assignments export | CSV with code-to-entry mappings | exportsS3 | On-demand request |
| Waitlist export | CSV of unselected scoring records | exportsS3 | On-demand request |
| Opt-in exports | CSV of marketing consent data | exportsS3 | On-demand request |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| API request | POST /campaigns/:campaignId/exports | Queue new export | Immediate response (202) |
| API request | GET /campaigns/:campaignId/exports/:exportId | Return export status/metadata | Real-time |
| API request | GET /campaigns/:campaignId/exports | List exports for campaign | Real-time |
| API request | DELETE /ccpa/users/:userId | Delete user exports across campaigns | Real-time |
| Internal polling | Queue processor interval | Process oldest PENDING export | Every pollingInterval (default: 1000ms) |

### Service Dependencies

**Required Services:**
- MongoDB - campaign, entry, market, scoring, user, export metadata storage
- S3 (multiple buckets) - export file storage and delivery
- Salesforce Marketing Cloud (SFMC) - consumes auto reminder email exports

**Internal Dependencies:**
- @verifiedfan packages - AWS, MongoDB, logging, tracing, authentication, permissions

## Success Metrics

**Operational Metrics:**
- Export success rate > 99%
- Export processing time < 5 minutes (p95) for standard campaigns
- Queue processing latency < 2 seconds between exports
- Export timeout rate < 1%

**Business Metrics:**
- Zero duplicate exports for same campaign/type/date combination
- CCPA deletion completion within 24 hours
- Regional export accuracy 100% (correct locale/region segmentation)
