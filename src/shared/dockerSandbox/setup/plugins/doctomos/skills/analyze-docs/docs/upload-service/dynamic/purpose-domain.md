# Domain Concepts - upload-service

## Core Entities

| Entity | Description |
|--------|-------------|
| UploadedFile | A file stored in S3 with metadata (key, size, lastModified, contentType, url) |
| ImageUpload | A base64-encoded image uploaded and stored in S3 as a file |
| FileKey | S3 object key (path) identifying a specific file in a bucket |
| BucketConfig | Configuration for an S3 bucket including name, region, credentials |
| UploadPrefix | Folder path prefix used to organize files within buckets |
| TriggerFunction | Named configuration for invoking a Lambda or Step Function |
| SupremeUser | Authenticated user with administrative privileges for all operations |

## Business Rules

### Authentication & Authorization
- **Supreme User Requirement**: All file operations (upload, list, delete) require JWT token with Supreme user flag set to true
- **CCPA Exception**: The CCPA trigger endpoint allows unauthenticated access for regulatory compliance
- **Non-Supreme Error**: Attempts by non-supreme users result in NON_SUPREME_USER error response

### File Upload Rules
- **Empty File Rejection**: Files with size=0 are rejected with EMPTY_FILE error
- **Missing File Rejection**: Upload requests without file data rejected with MISSING_FILE error
- **Content Type Validation**: Images must be image/gif, image/png, or image/jpeg; others rejected with INVALID_CONTENT_TYPE
- **Filename Preservation**: Original filename preserved for regular files; images get UUID appended
- **Default Filename**: Images without explicit filename use "image_{uuid}.{extension}"
- **ACL Default**: All uploaded files set to ACL='private' for security
- **Cache Control Default**: Files default to 'no-cache' unless explicitly specified

### Prefix Normalization
- **Trailing Slash**: Upload prefixes automatically normalized to end with "/" for folder structure
- **Empty Prefix**: Missing or empty prefix results in file at bucket root
- **Path Construction**: Final S3 key = {normalizedPrefix}{fileName}

### Bucket Selection
- **Default Buckets**: Configuration defines default buckets for images and files separately
- **Explicit Override**: BucketName parameter overrides default bucket selection
- **TMOL Special Case**: TMOL bucket automatically triggers STS assume role for cross-account access

### File Listing Rules
- **Prefix Filtering**: List operations filter by S3 prefix (folder path)
- **Sort Order**: Results always sorted by LastModified date descending (newest first)
- **Pagination**: Skip/limit parameters applied AFTER sorting
- **Metadata Only**: Basic list endpoint returns only key and date; no content retrieval

### File Content Retrieval Rules
- **Supported Formats**: Only CSV and JSON files can be parsed for content
- **Size Limit**: Files over 1MB (1,000,000 bytes) return error instead of content
- **Parse Failure Handling**: Parse errors return graceful error object, not thrown exception
- **CSV Parsing**: CSV files parsed with column headers as object keys
- **Unsupported Types**: Non-CSV/JSON files return error message about unsupported type

### File Deletion Rules
- **Key Requirement**: At least one file key must be provided; empty results in MISSING_FILE_KEYS error
- **Batch Delete**: Multiple file keys parsed from comma-separated string
- **Failure Handling**: Deletion failures throw DELETE_OBJECTS_FAILURE error
- **No Partial Success**: Either all deletes succeed or error thrown

### Trigger Invocation Rules
- **Function Mapping**: Trigger function names map to specific Lambda/StepFunction configurations
- **Invalid Function**: Unknown function names return INVALID_LAMBDA_FUNCTION error
- **Data Requirement**: Empty or missing data payload returns INVALID_TRIGGER_DATA error
- **Graceful Degradation**: Lambda invocation failures return success:false without throwing error
- **Synchronous Response**: Trigger endpoint returns immediately after starting invocation (does not wait)

## Terminology

| Term | Definition |
|------|------------|
| Supreme User | An authenticated admin user with elevated privileges to perform file operations; identified by JWT token claim |
| Base64 Image | An image encoded as base64 string for transmission in JSON payload |
| Upload Prefix | A folder path (e.g., "notification-scheduler/campaign-123") used to organize files in S3 buckets |
| File Key | The full S3 object key/path including prefix (e.g., "sms-waves/campaign-456/recipients.csv") |
| Content Type | MIME type of uploaded file (e.g., "image/jpeg", "text/csv", "application/json") |
| Bucket Name | Identifier for an S3 bucket; maps to actual bucket configuration via config |
| Cache Control | HTTP header controlling browser caching behavior (e.g., "public, max-age=31536000") |
| ACL | Access Control List defining who can access the S3 object (e.g., "private", "public-read") |
| TMOL | Ticketmaster Online system; requires special cross-account S3 access via STS assume role |
| Trigger Function | Named endpoint to invoke specific Lambda or Step Function (e.g., "waveprep", "ccpa", "selection") |
| Wave Prep | SMS campaign wave file processing workflow triggered via Lambda |
| CCPA | California Consumer Privacy Act; deletion request processing workflow |
| Scheduled Processing | Lambda function to process scheduled notification waves |
| Selection Step Function | AWS Step Function orchestrating fan selection workflow |
| STS Assume Role | AWS Security Token Service temporary credential mechanism for cross-account access |
| File Extension | Suffix of filename indicating file type (e.g., ".csv", ".json", ".png") used to determine parser |
| Pagination | Skip/limit parameters to retrieve subset of results (e.g., skip=0, limit=100) |

## Data Models

### UploadRequest (POST /files)
```javascript
{
  file: {
    name: string,        // Original filename
    path: string,        // Temporary file path on server
    size: number,        // File size in bytes
    type: string         // Content type (MIME)
  },
  prefix?: string,       // Optional S3 folder path
  bucketName?: string    // Optional bucket override
}
```

### ImageUploadRequest (POST /images)
```javascript
{
  base64: string,           // Base64-encoded image data
  contentType: string,      // Must be image/gif, image/png, or image/jpeg
  fileName?: string,        // Optional filename (UUID appended)
  cacheControl?: string,    // Optional cache header
  bucketName?: string       // Optional bucket override
}
```

### UploadResponse
```javascript
{
  url: string,    // S3 URL of uploaded file
  name: string    // Final filename in S3
}
```

### FileListRequest (GET /files/list)
```javascript
{
  prefix?: string,       // S3 folder path filter
  bucketName?: string    // Bucket to query
}
```

### FileListResponse
```javascript
[
  {
    key: string,           // S3 object key
    date: Date             // LastModified timestamp
  }
]
```

### FileDataRequest (GET /files/list/data)
```javascript
{
  prefix?: string,       // S3 folder path filter
  bucketName?: string,   // Bucket to query
  skip?: number,         // Pagination offset (default: 0)
  limit?: number         // Max results (default: 100)
}
```

### FileDataResponse
```javascript
[
  {
    key: string,              // S3 object key
    size: number,             // File size in bytes
    lastModifiedDate: Date,   // Timestamp
    content?: Array<Object>,  // Parsed CSV/JSON data (if supported)
    error?: {                 // Present if file cannot be parsed
      message: string         // Error description
    }
  }
]
```

### DeleteRequest (DELETE /files)
```javascript
{
  fileKeys: string,      // Comma-separated list of S3 keys
  bucketName?: string    // Bucket to delete from
}
```

### DeleteResponse
```javascript
{
  deleted: [             // Array of deleted file info
    {
      Key: string        // S3 key that was deleted
    }
  ]
}
```

### TriggerRequest (POST /trigger/:function)
```javascript
// Request body: any JSON object with data
{
  [key: string]: any    // Function-specific payload
}
```

### TriggerResponse
```javascript
{
  success: boolean      // True if invocation started, false if failed
}
```

### BucketConfiguration
```javascript
{
  type: 'bucket',           // Config type identifier
  bucketName: string,       // Actual S3 bucket name
  region?: string           // Optional region override
}
```

### LambdaConfiguration
```javascript
{
  type: 'lambda',           // Config type identifier
  functionName: string      // Lambda function name
}
```

### StepFunctionConfiguration
```javascript
{
  type: 'stepFunction',           // Config type identifier
  stateMachineArn: string         // Step Function ARN
}
```

### ErrorResponse (Standard)
```javascript
{
  error: {
    code: string,         // Error code (e.g., "NON_SUPREME_USER")
    message: string,      // Human-readable error
    details?: Object      // Optional additional context
  }
}
```

## Domain Relationships

### File Upload Flow
```
UploadRequest -> Authentication Check -> Bucket Selection -> S3 Upload -> UploadResponse
```

### File Listing Flow
```
FileListRequest -> Authentication Check -> S3 List Operation -> Sort by LastModified -> FileListResponse
```

### File Data Retrieval Flow
```
FileDataRequest -> Authentication Check -> S3 List -> Sort -> Paginate -> Parse Each File -> FileDataResponse
```

### Trigger Invocation Flow
```
TriggerRequest -> Authentication Check (conditional) -> Function Mapping -> AWS Client Invoke -> TriggerResponse
```

### Bucket Access Flow
```
BucketName (or Default) -> Bucket Config Lookup ->
  IF TMOL: STS Assume Role -> Temporary Credentials
  ELSE: Standard AWS Credentials
-> S3 Client Initialized
```

## Key Domain Concepts

### Supreme User Concept
A Supreme User is an administrative role identified by a JWT claim. The system uses a selector `selectIsUserSupreme` to extract this flag from the JWT token. This flag controls access to:
- All file upload operations
- All file listing operations
- All file deletion operations
- All trigger functions (except CCPA which allows unauthenticated access)

Non-supreme users are rejected immediately with `NON_SUPREME_USER` error before any S3 operations occur.

### Bucket Abstraction
The service abstracts S3 bucket complexity by:
1. Defining default buckets for images vs files in configuration
2. Allowing bucket override via request parameter
3. Mapping bucket names to actual S3 bucket names and regions
4. Automatically handling TMOL bucket cross-account access via STS

This allows clients to use logical bucket names (e.g., "imagesBucket") without knowing actual S3 bucket names or regions.

### Prefix-Based Organization
Files are organized using S3 prefixes (virtual folders):
- Prefixes act as folder paths (e.g., "notification-scheduler/campaign-123/")
- The system automatically normalizes prefixes to ensure trailing slash
- Listing operations filter by prefix to show files in specific folders
- Deletion requires exact file keys, not prefixes (no recursive delete)

### Trigger Abstraction
The trigger endpoint provides a unified interface to invoke various AWS services:
- Maps friendly names ("ccpa", "waveprep") to specific Lambda/StepFunction configs
- Abstracts Lambda vs Step Function differences (both use invoke() pattern)
- Provides consistent error handling across all trigger types
- Returns success/failure without exposing AWS-specific errors

### File Parsing Strategy
The service intelligently handles file content retrieval:
1. Determines file type from extension (.csv, .json)
2. Checks file size against 1MB limit
3. Downloads content from S3
4. Applies appropriate parser (csv-parse for CSV, JSON.parse for JSON)
5. Returns parsed data or graceful error
6. Continues processing remaining files even if one fails

This allows admins to preview file contents without manual download and parsing.
