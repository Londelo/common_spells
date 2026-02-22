# Purpose - upload-service

## What This Does

The upload-service is a centralized API that manages file and image uploads to AWS S3 buckets across the Ticketmaster Verified Fan platform. It provides secure upload capabilities for various file types (images, CSV, JSON, text) and enables administrative users to list, retrieve, and delete files from designated S3 buckets. Additionally, it serves as a trigger endpoint to invoke AWS Lambda functions and Step Functions for downstream processing workflows.

## Business Context

This service solves the problem of secure, centralized file management across multiple systems within the Ticketmaster ecosystem. By providing a unified API for uploads, it:

- Ensures consistent authentication and authorization for file operations (Supreme user verification)
- Abstracts AWS S3 complexity from frontend and other services
- Enables secure file storage for various business processes (CCPA requests, SMS wave processing, scheduling, scoring data)
- Provides a controlled entry point for triggering downstream data processing workflows

The service addresses the pain point of managing file uploads across multiple buckets (images, general files, TMOL, scoring QA) with different access patterns and security requirements.

## Target Users/Consumers

**Primary Users:**
- **Supreme Users** (Admin/System users): Full access to all file operations (upload, list, delete) and trigger capabilities
- **Internal Services**: Services that need to upload files programmatically
- **Batch Processing Systems**: Systems that trigger Lambda/Step Functions for data processing

**Specific Use Cases by User:**
- Admins managing images (event photos, marketing assets)
- Admins uploading CSV/JSON files for SMS wave campaigns
- Compliance systems uploading CCPA request data
- Scoring systems managing fan scoring data files
- Notification systems triggering wave processing

## Key Business Capabilities

- **Secure File Upload**: Enable authenticated users to upload files to S3 with appropriate access controls
- **Image Management**: Handle base64-encoded images for web uploads with automatic file naming and cache control
- **File Discovery**: Provide listing capabilities to browse files by prefix/folder structure
- **File Content Retrieval**: Parse and return CSV/JSON file contents directly from S3
- **Administrative Control**: Allow deletion of files from buckets for data cleanup
- **Workflow Triggering**: Initiate downstream processing workflows (CCPA, SMS waves, scheduled notifications, selection processes)

## Business Requirements & Constraints

**Authentication & Authorization:**
- REQ-001: All file operations (upload, list, delete) require Supreme user authentication
- REQ-002: Trigger endpoint for CCPA processing allows unauthenticated access for compliance reasons
- REQ-003: All other trigger functions require Supreme user authentication

**File Handling:**
- REQ-004: Image uploads must support gif, png, and jpeg formats only
- REQ-005: File size limit enforced via configuration (maxFileSize setting)
- REQ-006: Files must be stored with ACL set to 'private' for security
- REQ-007: Uploaded files default to 'no-cache' control unless specified

**Data Processing:**
- REQ-008: List/data endpoint supports CSV and JSON file parsing only
- REQ-009: Files larger than 1MB cannot be read via list/data endpoint (returns error)
- REQ-010: List operations support pagination (skip/limit parameters)

**Integration:**
- REQ-011: Must support multiple S3 buckets (images, files, TMOL, scoring QA)
- REQ-012: TMOL bucket access requires STS assume role authentication
- REQ-013: Must integrate with 5 AWS clients (4 Lambdas, 1 Step Function)

## Core Business Rules

**File Upload Rules:**
- Empty files (size = 0) are rejected with error
- File names are preserved except for images which get UUID appended
- Upload prefix is normalized to ensure trailing slash for folder structure
- Images without explicit filename default to "image_{uuid}.{extension}"

**Access Control Rules:**
- Supreme user status determined by JWT token validation
- Non-supreme users receive NON_SUPREME_USER error for protected operations
- CCPA trigger function bypasses authentication requirement for regulatory compliance

**Bucket Selection Rules:**
- Default buckets defined in config (separate for images vs files)
- Bucket selection overridden by explicit bucketName parameter
- TMOL bucket automatically triggers STS role assumption for cross-account access

**File Listing Rules:**
- Files listed by S3 prefix (folder path)
- Results sorted by LastModified date (descending - newest first)
- Pagination applied after sorting
- File content parsing skipped for unsupported types (non-CSV/JSON)

**Trigger Rules:**
- Invalid trigger function names return INVALID_LAMBDA_FUNCTION error
- Empty or missing data payload returns INVALID_TRIGGER_DATA error
- Trigger failures return success:false without throwing error (allows graceful degradation)

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| File uploaded | S3 PutObject | AWS S3 buckets (images/files/TMOL/scoringQA) | Immediately on upload request |
| Trigger endpoint called | Lambda Invoke | processCcpaRequestLambda | On-demand via POST /trigger/ccpa |
| Trigger endpoint called | Lambda Invoke | processSmsWaveFilesLambda | On-demand via POST /trigger/waveprep |
| Trigger endpoint called | Lambda Invoke | processScheduledLambda | On-demand via POST /trigger/process-scheduled |
| Trigger endpoint called | Lambda Invoke | generateSmsWaveCodesLambda | On-demand via POST /trigger/gen-sms-wave-codes |
| Trigger endpoint called | Step Function Start | selectionStepFn | On-demand via POST /trigger/selection |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Admin UI | POST /images | Upload base64 image to S3 | Synchronous HTTP request |
| Admin UI | POST /files | Upload file to S3 | Synchronous HTTP request |
| Admin UI | GET /files/list | List files in bucket by prefix | Synchronous HTTP request |
| Admin UI | GET /files/list/data | Retrieve and parse file contents | Synchronous HTTP request |
| Admin UI | DELETE /files | Delete files from bucket | Synchronous HTTP request |
| External System | POST /trigger/{function} | Invoke Lambda/StepFunction | Synchronous HTTP request |

### Service Dependencies

**AWS Services:**
- S3 (multiple buckets for different file types)
- Lambda (4 functions: CCPA processing, SMS wave processing, scheduled processing, code generation)
- Step Functions (selection workflow orchestration)
- STS (for cross-account role assumption to TMOL bucket)

**Internal Services:**
- Authentication Service (JWT token validation for supreme user status)
- MongoDB (implied by config schema, likely for audit logging)

**Shared Libraries:**
- @verifiedfan/aws (AWS SDK wrappers)
- @verifiedfan/lib (common utilities, error handling)
- @verifiedfan/log (logging infrastructure)
- @verifiedfan/prometheus (metrics collection)

## Success Metrics

**Operational Metrics:**
- File upload success rate > 99.5%
- API response time < 500ms (p95) for uploads under 5MB
- File listing requests < 1000ms (p95)
- Zero data loss for successful upload responses

**Security Metrics:**
- 100% authentication enforcement for supreme-only operations
- Zero unauthorized access to file operations
- All files stored with private ACL

**Data Quality:**
- File parsing success rate > 98% for CSV/JSON files under size limit
- Zero file corruption during upload/retrieval cycles
