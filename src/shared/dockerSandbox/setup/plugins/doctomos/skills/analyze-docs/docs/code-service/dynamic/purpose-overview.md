# Purpose - code-service

## What This Does

The code-service manages promotional and access codes for campaigns within the Ticketmaster/VerifiedFan ecosystem. It handles the complete lifecycle of codes from bulk upload through reservation to assignment, enabling campaigns to distribute unique codes to verified fans for ticket access or promotional purposes.

## Business Context

This service solves the problem of managing large volumes (50,000+ per batch) of unique codes that need to be distributed to fans for campaign-based ticket access. It exists to:
- Provide centralized code inventory management across all campaigns
- Prevent code conflicts and ensure unique code distribution
- Enable time-bound reservations to support multi-stage verification workflows
- Track code status throughout their lifecycle (available → reserved → assigned)

## Target Users/Consumers

**Primary Consumers**: Other backend services in the Titan/VerifiedFan platform
- Campaign service (manages campaigns requiring code-based access)
- User verification service (reserves/assigns codes during fan verification)
- Admin tools (supreme-authenticated users managing code inventories)

**Authentication Model**: JWT-based with supreme user requirement for all operations

## Key Business Capabilities

- **Bulk Code Import**: Ingest and store large CSV files (50,000+ codes per batch) from S3 with deduplication
- **Code Reservation**: Temporarily reserve codes for 24 hours to support multi-step workflows
- **Code Assignment**: Permanently assign codes to verified fans
- **Code Release**: Release expired or unused reservations back to available pool
- **Inventory Tracking**: Real-time count of codes by status (available/reserved/assigned) and type (TM/external)

## Business Requirements & Constraints

- REQ-001: Only supreme-authenticated users can perform any code operations
- REQ-002: System must support two code types: TM (Ticketmaster internal) and external (third-party)
- REQ-003: Reserved codes must automatically expire after 24 hours if not assigned
- REQ-004: System must process code uploads in batches of up to 50,000 codes
- REQ-005: Codes must be unique within a campaign
- REQ-006: Code uploads must support CSV format with whitespace sanitization
- REQ-007: System must handle concurrent reservation attempts with retry logic (up to 3 retries)

## Core Business Rules

**Code Status Lifecycle**:
- Codes start as "available" upon upload
- "Reserved" codes expire after 24 hours and revert to "available"
- "Assigned" codes are permanent and cannot be released
- Only "reserved" codes (not assigned) can be released back to available

**Reservation Logic**:
- Available codes include: never-reserved codes OR codes with reservation date older than 24 hours
- Reservations use a unique reserveId to track each reservation batch
- Concurrent reservation conflicts trigger automatic retry (max 3 attempts)

**Code Type Separation**:
- TM and external codes are stored separately per campaign
- File upload paths encode code type: `codes/{campaignId}/{type}/{filename}`
- Reservations and queries must specify code type

**Data Sanitization**:
- CSV parsing trims whitespace from all codes
- Empty lines and lines with empty values are skipped
- Only first column of CSV is used as the code value

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Codes uploaded | Return count summary | Calling service | Immediately after processing |
| Codes reserved | Return list of reserved codes | Calling service | Immediately after reservation |
| Codes assigned | Update code status | MongoDB | Immediately after assignment |
| Codes released | Update code status | MongoDB | Immediately after release |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Campaign/Admin Service | POST /:campaignId/codes | Read CSV from S3 and upsert codes | Real-time, batch processing |
| Verification Service | GET /:campaignId/reserve | Reserve N codes for verification flow | Real-time with retry logic |
| Verification Service | POST /:campaignId/assign | Mark codes as assigned to users | Real-time |
| Verification Service | POST /:campaignId/release | Release unused reservations | Real-time |
| Campaign/Admin Service | GET /:campaignId/codes/count | Return inventory counts | Real-time query |

### Service Dependencies

**Required Services**:
- **AWS S3**: Stores CSV files with codes before processing (scoringBucket)
- **MongoDB**: Persistent storage for code records with status tracking
- **JWT Auth Service**: Validates supreme user authentication for all operations

**Shared Libraries**:
- @verifiedfan/mongodb: MongoDB connection and operations
- @verifiedfan/batch-transform-stream: Streaming batch processing for large CSV files
- @verifiedfan/aws: S3 client for reading code files

## Success Metrics

**Operational**:
- Code upload processing throughput: 50,000 codes per batch
- Reservation success rate > 99% (including retries)
- API response time < 500ms for reservation requests (p95)
- Database write throughput: handle concurrent operations across multiple campaigns

**Business**:
- Zero duplicate code assignments within campaigns
- Code inventory accuracy: 100% (status tracking matches actual state)
- Reserved code expiration: automatic cleanup after 24 hours
- Upload error rate < 1% (excluding invalid input)
