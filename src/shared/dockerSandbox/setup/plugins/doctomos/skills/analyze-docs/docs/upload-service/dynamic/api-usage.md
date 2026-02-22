# API Usage - upload-service

## Authentication

### Obtaining a JWT Token

The upload-service uses RS256 JWT tokens for authentication. Tokens must be obtained from your organization's authentication service.

**Required JWT Claims**:
```json
{
  "userId": "user-123",
  "isSupreme": true
}
```

### Using Authentication

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer eyJhbGc..." https://api.example.com/files/list
```

**Note**: Most endpoints require the `isSupreme: true` claim in the JWT.

---

## Request Examples

### Upload Base64 Image

```bash
# Using curl
curl -X POST https://upload-service.example.com/images \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "base64=iVBORw0KGgoAAAANSUhEUgAAAAUA..." \
  -F "contentType=image/png" \
  -F "fileName=my-image" \
  -F "cacheControl=max-age=31536000"
```

```javascript
// Using JavaScript fetch
const response = await fetch('https://upload-service.example.com/images', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    base64: imageBase64String,
    contentType: 'image/png',
    fileName: 'my-image',
    cacheControl: 'max-age=31536000',
    bucketName: 'custom-bucket' // optional
  })
});

const result = await response.json();
console.log('Uploaded:', result.url);
// Output: { url: "https://s3.amazonaws.com/bucket/my-image_abc123.png", name: "my-image_abc123.png" }
```

---

### Upload File (Multipart)

```bash
# Using curl
curl -X POST https://upload-service.example.com/files \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "prefix=documents/2023" \
  -F "bucketName=my-files-bucket"
```

```javascript
// Using JavaScript with FormData
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('prefix', 'documents/2023');
formData.append('bucketName', 'my-files-bucket');

const response = await fetch('https://upload-service.example.com/files', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  },
  body: formData
});

const result = await response.json();
console.log('Uploaded:', result.url);
// Output: { url: "https://...", key: "documents/2023/document.pdf" }
```

---

### List Files

```bash
# List all files with a specific prefix
curl -X GET "https://upload-service.example.com/files/list?prefix=documents/2023&bucketName=my-bucket" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

```javascript
// Using JavaScript
const response = await fetch(
  'https://upload-service.example.com/files/list?prefix=documents/2023',
  {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  }
);

const files = await response.json();
// Output: [{ key: "documents/2023/file1.pdf", date: "2023-01-15T..." }, ...]
```

---

### List Files with Pagination

```bash
# Get page 2 with 20 items per page
curl -X GET "https://upload-service.example.com/files/list/data?prefix=documents&page=2&perPage=20" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

```javascript
// Using JavaScript with pagination
const page = 2;
const perPage = 20;

const response = await fetch(
  `https://upload-service.example.com/files/list/data?prefix=documents&page=${page}&perPage=${perPage}`,
  {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  }
);

const result = await response.json();
console.log('Files:', result.data);
console.log('Pagination:', result.pagination);
// Output: { data: [...], pagination: { page: 2, perPage: 20, total: 100, totalPages: 5 } }
```

---

### Delete Files

```bash
# Delete multiple files
curl -X DELETE "https://upload-service.example.com/files?fileKeys=path/file1.txt,path/file2.pdf&bucketName=my-bucket" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

```javascript
// Using JavaScript
const keysToDelete = ['path/file1.txt', 'path/file2.pdf'];

const response = await fetch(
  `https://upload-service.example.com/files?fileKeys=${keysToDelete.join(',')}&bucketName=my-bucket`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  }
);

const result = await response.json();
console.log('Deleted:', result.deleted);
// Output: { deleted: ["path/file1.txt", "path/file2.pdf"] }
```

---

### Trigger Lambda/Step Function

```bash
# Trigger a Lambda function
curl -X POST https://upload-service.example.com/trigger/ProcessImage \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageKey": "images/photo.jpg",
    "operations": ["resize", "watermark"]
  }'
```

```javascript
// Using JavaScript to trigger Step Functions
const response = await fetch(
  'https://upload-service.example.com/trigger/ImageProcessingWorkflow',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageKey: 'images/photo.jpg',
      operations: ['resize', 'watermark']
    })
  }
);

const result = await response.json();
console.log('Execution:', result.executionArn);
// Output: { executionArn: "arn:aws:states:...", startDate: "2023-..." }
```

---

## Error Handling

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "status": 400,
    "message": "Human-readable error message",
    "payload": "Detailed error information"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Missing required fields, invalid content type, empty file |
| 401 | Unauthorized | Missing or invalid JWT token, no userId in JWT |
| 403 | Forbidden | Supreme user privileges required (`isSupreme: false` or missing) |
| 404 | Not Found | Invalid route |
| 500 | Internal Server Error | AWS service errors, configuration issues |

### Common Error Examples

#### Missing Supreme Privileges
```json
{
  "error": {
    "status": 403,
    "message": "Supreme privileges required.",
    "payload": "Not authorized to call this endpoint."
  }
}
```

#### Invalid Content Type (Images)
```json
{
  "error": {
    "status": 400,
    "message": "The provided content type is not accepted.",
    "payload": "Invalid content type: 'image/bmp'."
  }
}
```

#### Missing Required Field
```json
{
  "error": {
    "status": 400,
    "message": "Missing image content.",
    "payload": "The 'base64' field is required."
  }
}
```

#### Not Logged In
```json
{
  "error": {
    "status": 401,
    "message": "This action requires you to be logged in.",
    "payload": "Did not receive jwt with userId"
  }
}
```

---

## Rate Limits

The service does not implement rate limiting at the application level. Rate limiting should be handled by:
- API Gateway / Load Balancer
- Infrastructure-level rate limiting
- Organizational authentication service

---

## Best Practices

### File Uploads

1. **Validate file size client-side** before uploading
   - Check against `maxFileSize` configuration (obtained from service configuration)

2. **Use appropriate content types** for images
   - Only `image/gif`, `image/png`, `image/jpeg` are accepted

3. **Organize files with prefixes**
   ```javascript
   // Good: Organized structure
   prefix: 'users/123/documents/2023'

   // Avoid: Flat structure
   prefix: ''
   ```

4. **Handle large files**
   - Consider chunking for files approaching size limits
   - Use multipart upload directly to S3 for very large files (outside this service)

### Authentication

1. **Store JWT securely**
   - Use HttpOnly cookies or secure storage
   - Never expose in client-side code or URLs

2. **Handle token expiration**
   ```javascript
   async function authenticatedRequest(url, options) {
     const token = await getValidToken(); // Refresh if needed
     return fetch(url, {
       ...options,
       headers: {
         ...options.headers,
         'Authorization': `Bearer ${token}`
       }
     });
   }
   ```

3. **Check supreme privileges**
   - Ensure user has `isSupreme: true` before attempting protected operations
   - Handle 403 errors gracefully

### Error Handling

1. **Implement retry logic** for transient errors (500, 503)
   ```javascript
   async function uploadWithRetry(file, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await uploadFile(file);
       } catch (error) {
         if (error.status >= 500 && i < maxRetries - 1) {
           await sleep(Math.pow(2, i) * 1000); // Exponential backoff
           continue;
         }
         throw error;
       }
     }
   }
   ```

2. **Display user-friendly error messages**
   ```javascript
   const ERROR_MESSAGES = {
     400: 'Invalid file or missing required information',
     401: 'Please log in to continue',
     403: 'You do not have permission to perform this action',
     500: 'Service temporarily unavailable. Please try again.'
   };
   ```

### Performance

1. **List operations with pagination**
   - Always use `/files/list/data` with pagination for large result sets
   - Avoid `/files/list` for buckets with many objects

2. **Batch delete operations**
   - Delete multiple files in a single request when possible
   - Example: `fileKeys=file1.txt,file2.txt,file3.txt`

3. **Use appropriate cache headers** for images
   ```javascript
   // Long-term caching for immutable images
   cacheControl: 'public, max-age=31536000, immutable'

   // No caching for frequently updated content
   cacheControl: 'no-cache, no-store, must-revalidate'
   ```

---

## SDK / Client Libraries

No official SDK is currently provided. Use standard HTTP client libraries:

### Node.js
- `axios`
- `node-fetch`
- `got`

### Browser
- `fetch` API
- `axios`

### Python
- `requests`
- `httpx`

### Example Wrapper Class (TypeScript)

```typescript
class UploadServiceClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string>
  ) {}

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return response.json();
  }

  async uploadImage(base64: string, contentType: string, fileName?: string) {
    const formData = new URLSearchParams({
      base64,
      contentType,
      ...(fileName && { fileName })
    });

    return this.request('/images', {
      method: 'POST',
      body: formData
    });
  }

  async uploadFile(file: File, prefix?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (prefix) formData.append('prefix', prefix);

    return this.request('/files', {
      method: 'POST',
      body: formData
    });
  }

  async listFiles(prefix?: string, page = 1, perPage = 10) {
    const params = new URLSearchParams({
      ...(prefix && { prefix }),
      page: String(page),
      perPage: String(perPage)
    });

    return this.request(`/files/list/data?${params}`);
  }

  async deleteFiles(fileKeys: string[]) {
    const params = new URLSearchParams({
      fileKeys: fileKeys.join(',')
    });

    return this.request(`/files?${params}`, {
      method: 'DELETE'
    });
  }

  async trigger(functionName: string, data: any) {
    return this.request(`/trigger/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}

// Usage
const client = new UploadServiceClient(
  'https://upload-service.example.com',
  () => getJwtToken()
);

const result = await client.uploadImage(base64Data, 'image/png', 'logo');
```

---

## Monitoring & Observability

### Metrics Endpoint

The service exposes Prometheus metrics at `/metrics`:

```bash
curl http://upload-service.example.com/metrics
```

**Available metrics**:
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_total` - Total request counter (labeled by status code)
- Node.js process metrics (memory, CPU, etc.)

### Health Check

```bash
curl http://upload-service.example.com/heartbeat
```

Returns `200 OK` with `{"status": "ok"}` if the service is healthy.

### Distributed Tracing

The service supports distributed tracing via:
- **LightStep** integration (configured via `@verifiedfan/tracing`)
- **OpenTracing** compatible
- Automatic trace context propagation

Trace headers are automatically added to all AWS SDK calls.

### Logging

The service uses structured logging (`@verifiedfan/log`) with the following log levels:
- `info` - Normal operations, successful uploads
- `warn` - Recoverable errors, missing optional fields
- `error` - Failed operations, AWS errors
- `debug` - Detailed debugging information

**Correlation ID**: Each request receives a unique correlation ID for log aggregation.

---

## Environment-Specific Notes

### Development

- `/dev/token` endpoint available for local JWT generation
- Set `titan.devEndpoints=true` in configuration

### Production

- Ensure JWT keys are properly configured (RS256 key pair)
- Configure appropriate S3 bucket permissions
- Set DNS cache TTL appropriately
- Monitor `/metrics` endpoint for performance insights
- Disable `devEndpoints` in configuration
