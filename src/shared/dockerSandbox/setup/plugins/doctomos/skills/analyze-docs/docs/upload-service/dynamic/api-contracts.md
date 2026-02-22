# API Contracts - upload-service

## Overview

The upload-service is a REST API built with Koa.js that provides file and image upload capabilities to AWS S3, along with file management operations and AWS Lambda/Step Functions triggering functionality.

**Base URL**: Configured via environment (typically runs on port 8080)
**Authentication**: JWT Bearer tokens (RS256)
**Framework**: Koa.js with koa-router

---

## REST Endpoints

### Images

#### POST /images
Upload a base64-encoded image to S3.

**Authentication**: Required (Supreme user privileges)

**Request**:
- Content-Type: `application/x-www-form-urlencoded` or `multipart/form-data`
- Fields:
  - `base64` (required): Base64-encoded image content
  - `contentType` (required): MIME type - must be one of:
    - `image/gif`
    - `image/png`
    - `image/jpeg`
  - `fileName` (optional): Desired filename (will be appended with UUID)
  - `cacheControl` (optional): S3 cache-control header value
  - `bucketName` (optional): Target S3 bucket name (defaults to configured images bucket)

**Response** (200 OK):
```json
{
  "url": "https://s3.amazonaws.com/bucket/image_uuid.png",
  "name": "image_uuid.png"
}
```

**Errors**:
- `400 Bad Request`: Invalid content type, missing base64 field
- `403 Forbidden`: Supreme user privileges required

---

### Files

#### POST /files
Upload a file to S3.

**Authentication**: Required (Supreme user privileges)

**Request**:
- Content-Type: `multipart/form-data`
- Fields:
  - `file` (required): File to upload (multipart file upload)
  - `prefix` (optional): S3 key prefix for the uploaded file
  - `bucketName` (optional): Target S3 bucket name (defaults to configured files bucket)

**Response** (200 OK):
```json
{
  "url": "https://s3.amazonaws.com/bucket/prefix/filename.ext",
  "key": "prefix/filename.ext"
}
```

**Errors**:
- `400 Bad Request`: Missing file, empty file
- `403 Forbidden`: Supreme user privileges required

---

#### GET /files/list
List S3 objects by prefix.

**Authentication**: Required (Supreme user privileges)

**Query Parameters**:
- `prefix` (optional): S3 key prefix to filter objects
- `bucketName` (optional): Target S3 bucket name

**Response** (200 OK):
```json
[
  {
    "key": "path/to/file1.txt",
    "date": "2023-01-15T10:30:00.000Z"
  },
  {
    "key": "path/to/file2.pdf",
    "date": "2023-01-14T09:15:00.000Z"
  }
]
```

**Note**: Results are sorted by last modified date (descending).

**Errors**:
- `403 Forbidden`: Supreme user privileges required

---

#### GET /files/list/data
List S3 objects with pagination and detailed metadata.

**Authentication**: Required (Supreme user privileges)

**Query Parameters**:
- `prefix` (optional): S3 key prefix to filter objects
- `bucketName` (optional): Target S3 bucket name
- `page` (optional): Page number for pagination (default: 1)
- `perPage` (optional): Items per page (default: 10)

**Response** (200 OK):
```json
{
  "data": [
    {
      "key": "path/to/file.txt",
      "lastModified": "2023-01-15T10:30:00.000Z",
      "size": 1024,
      "etag": "\"abc123\"",
      "storageClass": "STANDARD"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Errors**:
- `403 Forbidden`: Supreme user privileges required

---

#### DELETE /files
Delete multiple files from S3.

**Authentication**: Required (Supreme user privileges)

**Query Parameters**:
- `fileKeys` (required): Comma-separated list of S3 object keys to delete
- `bucketName` (optional): Target S3 bucket name

**Request Example**:
```
DELETE /files?fileKeys=path/file1.txt,path/file2.pdf&bucketName=my-bucket
```

**Response** (200 OK):
```json
{
  "deleted": [
    "path/file1.txt",
    "path/file2.pdf"
  ]
}
```

**Errors**:
- `400 Bad Request`: Missing fileKeys, deletion failure
- `403 Forbidden`: Supreme user privileges required

---

### Trigger

#### POST /trigger/:function
Trigger an AWS Lambda function or Step Functions state machine.

**Authentication**: Required (Supreme user privileges)

**Path Parameters**:
- `function` (required): Name of the Lambda function or Step Functions state machine to invoke

**Request**:
- Content-Type: `application/json` or `application/x-www-form-urlencoded`
- Body: Arbitrary JSON data to pass to the triggered function

**Request Example**:
```json
{
  "key": "value",
  "data": {
    "nested": "object"
  }
}
```

**Response** (200 OK):
```json
{
  "executionArn": "arn:aws:states:us-east-1:123456789:execution:StateMachine:uuid",
  "startDate": "2023-01-15T10:30:00.000Z"
}
```

**Errors**:
- `403 Forbidden`: Supreme user privileges required
- `500 Internal Server Error`: Function invocation failure

---

## Middleware & Infrastructure Endpoints

### GET /metrics
Prometheus metrics endpoint (no authentication required).

**Response**: Prometheus text format metrics including:
- HTTP request duration
- Request counter by status code
- Default Node.js process metrics

---

### GET /heartbeat
Health check endpoint (no authentication required).

**Response** (200 OK):
```json
{
  "status": "ok"
}
```

---

### POST /dev/token
Development-only endpoint for generating JWT tokens (no authentication required).

**Note**: Only available when `devEndpoints` is enabled in configuration.

---

## Authentication

### JWT Structure

The service uses RS256 JWT tokens with the following claims:

**Required claims**:
- `userId`: User identifier
- `isSupreme`: Boolean flag indicating supreme user privileges

**Header**:
```
Authorization: Bearer <jwt_token>
```

### Anonymous Access

Anonymous access can be enabled via configuration (`titan.jwt.allowAnon`), but most endpoints require supreme user privileges regardless.

---

## Authorization Levels

### Supreme User
- **Required for**: All upload, delete, list, and trigger operations
- **Claim**: `isSupreme: true` in JWT
- **Error**: 403 Forbidden if not present

### Regular User
- Limited access (most endpoints require supreme privileges)

### Anonymous
- Only accessible if `allowAnon` is configured
- No access to protected endpoints

---

## Special Bucket Support

### TMOL Bucket
The service supports special handling for the "tmolBucket" which uses AWS STS AssumeRole:
- Automatically assumes the configured TMOL IAM role
- Uses temporary credentials for S3 operations
- Role ARN configured via `titan.aws.roles.tmolS3`

---

## Content Type Restrictions

### Images Endpoint
Only accepts:
- `image/gif` → saves as `.gif`
- `image/png` → saves as `.png`
- `image/jpeg` → saves as `.jpg`

Case-insensitive matching.

---

## File Naming

### Images
Format: `{fileName}_{uuid}.{extension}`
- If `fileName` not provided: `image_{uuid}.{extension}`
- UUID v4 ensures uniqueness

### Files
Preserves original filename from multipart upload.

---

## Response Format

All successful responses follow this structure (unless noted otherwise):
```json
{
  "data": { ... },
  "meta": { ... }
}
```

Formatted by `responseFormatter` middleware (except `/metrics` and `/heartbeat`).

---

## Configuration Dependencies

The service requires the following configuration keys:
- `titan.aws.key`: AWS access key ID
- `titan.aws.secret`: AWS secret access key
- `titan.aws.default.region`: Default AWS region
- `titan.aws.defaultBucketsUpload.images`: Default images bucket
- `titan.aws.defaultBucketsUpload.files`: Default files bucket
- `titan.jwt.privateKey`: JWT private key (RS256)
- `titan.jwt.publicKey`: JWT public key (RS256)
- `titan.jwt.allowAnon`: Allow anonymous access (boolean)
- `titan.service.port`: Service port (default: 8080)
- `titan.service.maxFileSize`: Max file size for uploads
- `titan.service.dnsCacheTTL`: DNS cache TTL in milliseconds
