# API Usage - user-service

## Overview

This document provides practical examples for using the user-service API, including authentication flows, common operations, and error handling patterns.

---

## Authentication

### JWT Authentication

Most endpoints require a valid JWT token in the Authorization header.

**Header Format:**
```
Authorization: Bearer <jwt_token>
```

### Getting a JWT Token

#### User Authentication Flow

1. Obtain a Ticketmaster token from the Ticketmaster authentication system
2. Exchange it for a user-service JWT:

```bash
curl -X POST https://user-service.example.com/auth \
  -H "Content-Type: application/json" \
  -d '{
    "tm_token": "your_ticketmaster_token",
    "tmuo": "ticketmaster_user_origin"
  }'
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "auth": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "integrations": {
    "ticketmaster": {
      "id": "tm123456",
      "token": "tm_token_value",
      "origin": "tm.com"
    }
  },
  "date": {
    "created": 1609459200000,
    "updated": 1609459200000
  }
}
```

#### Worker Authentication Flow

For service-to-service authentication:

```bash
curl -X POST https://user-service.example.com/auth/workers \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "your_app_id",
    "petition": "signed_petition_token"
  }'
```

---

## Common Usage Examples

### 1. Get Current User Profile

Retrieve the authenticated user's complete profile:

```bash
curl -X GET https://user-service.example.com/me \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "integrations": {
    "ticketmaster": { "id": "tm123456" },
    "facebook": { "id": "fb123456" }
  },
  "auth": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "date": {
    "created": 1609459200000,
    "updated": 1609459200000
  }
}
```

### 2. Update User Profile

Update the current user's profile information:

```bash
curl -X POST https://user-service.example.com/me \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com",
    "first_name": "Jane",
    "phone": "+1987654321"
  }'
```

### 3. Find User by Code

Look up a user using their verification code:

```bash
curl -X GET "https://user-service.example.com/?code=ABC123" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 4. Lookup User IDs

#### By Ticketmaster IDs

```bash
curl -X GET "https://user-service.example.com/users/ids?tmIds=tm123,tm456,tm789" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### By Email Addresses

```bash
curl -X GET "https://user-service.example.com/users/ids?emails=user1@example.com,user2@example.com" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

#### By Global User IDs

```bash
curl -X GET "https://user-service.example.com/users/ids?globalUserIds=guid1,guid2&limit=10&offset=0" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response Format:**
```json
{
  "results": [
    {
      "userId": "507f1f77bcf86cd799439011",
      "ticketmasterId": "tm123",
      "globalUserId": "guid1",
      "email": "user@example.com"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 50
  }
}
```

### 5. Get User Contacts

Retrieve contact information for multiple users:

```bash
curl -X GET "https://user-service.example.com/users/contacts?userIds=userId1,userId2&limit=20" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 6. Find User by Any ID

Search for a user using any identifier type:

```bash
curl -X GET "https://user-service.example.com/users/find?id=tm123456" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

The `id` parameter can be:
- User ID (MongoDB ObjectId)
- Ticketmaster ID
- Email address
- Global User ID

### 7. Get User Wallet

Retrieve the authenticated user's fan wallet:

```bash
curl -X GET https://user-service.example.com/me/wallet \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 8. Get Integration Details

Get details for a specific third-party integration:

```bash
curl -X GET https://user-service.example.com/me/integration/facebook \
  -H "Authorization: Bearer $JWT_TOKEN"
```

Supported provider IDs: `facebook`, `twitter`, `tumblr`, `youtube`

---

## Managing Integrations

### Add Facebook Integration

```bash
curl -X POST https://user-service.example.com/me \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fb_token": "facebook_access_token"
  }'
```

### Add Twitter Integration

```bash
curl -X POST https://user-service.example.com/me \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "twitter_token": "twitter_access_token",
    "twitter_secret": "twitter_secret"
  }'
```

### Remove an Integration

```bash
curl -X POST https://user-service.example.com/me \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remove_integration": "facebook"
  }'
```

Supported integration types: `facebook`, `twitter`, `tumblr`, `youtube`

---

## Campaign Permissions

### Get All Campaign Permissions

Retrieve all campaign permissions for a user:

```bash
# For current user
curl -X GET https://user-service.example.com/me/campaigns \
  -H "Authorization: Bearer $JWT_TOKEN"

# For another user (requires appropriate permissions)
curl -X GET https://user-service.example.com/507f1f77bcf86cd799439011/campaigns \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
[
  {
    "userId": "507f1f77bcf86cd799439011",
    "campaignId": "camp123",
    "actions": ["read", "write", "delete"],
    "date": {
      "created": 1609459200000,
      "updated": 1609459200000
    }
  }
]
```

### Get Specific Campaign Permissions

```bash
curl -X GET https://user-service.example.com/me/campaigns/camp123 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Update Campaign Permissions

```bash
curl -X POST https://user-service.example.com/me/campaigns/camp123 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actions": ["read", "write"]
  }'
```

---

## Supreme User Management

Supreme users have elevated permissions across the system.

### Check Supreme Status

```bash
curl -X GET https://user-service.example.com/me/supremes \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "isSupreme": true,
  "date": {
    "created": 1609459200000,
    "updated": 1609459200000
  }
}
```

### Grant Supreme Permissions

**Note:** Requires current user to have supreme permissions

```bash
curl -X POST https://user-service.example.com/507f1f77bcf86cd799439011/supremes \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doDisable": false
  }'
```

### Revoke Supreme Permissions

```bash
curl -X POST https://user-service.example.com/507f1f77bcf86cd799439011/supremes \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doDisable": true
  }'
```

---

## Administrative Operations

### Upsert Multiple Users

**Note:** Requires supreme user permissions

```bash
curl -X POST https://user-service.example.com/users/upsert \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "email": "user1@example.com",
      "firstName": "User",
      "lastName": "One",
      "ticketmasterId": "tm123"
    },
    {
      "email": "user2@example.com",
      "firstName": "User",
      "lastName": "Two",
      "ticketmasterId": "tm456"
    }
  ]'
```

### Delete User

**Note:** Requires supreme user permissions

```bash
curl -X DELETE https://user-service.example.com/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## Error Handling

### Standard Error Response Format

All errors follow this consistent structure:

```json
{
  "status": 400,
  "message": "Human-readable error message",
  "payload": "Detailed error information"
}
```

### Common Error Codes

| Status Code | Error Type | Description |
|-------------|-----------|-------------|
| 400 | Bad Request | Invalid input or missing required fields |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Requested resource does not exist |
| 500 | Internal Server Error | Server-side error |

### Error Examples

#### 400 - Invalid User ID

```json
{
  "status": 400,
  "message": "Invalid user id.",
  "payload": "The user id '12345' is not valid."
}
```

#### 401 - Token Mismatch

```json
{
  "status": 400,
  "message": "Unexpected token signature.",
  "payload": "The token does not match the expected signature."
}
```

#### 401 - User Not Supreme

```json
{
  "status": 401,
  "message": "User not supreme.",
  "payload": "The author user does not have supreme access."
}
```

#### 401 - Code Lookup Not Authorized

```json
{
  "status": 401,
  "message": "User must be logged in to search by code.",
  "payload": "User id not present in token."
}
```

#### 403 - Integration Removal Conflict

```json
{
  "status": 403,
  "message": "You may not remove and add your facebook account at the same time.",
  "payload": "Removal and integration conflict."
}
```

#### 404 - User Not Found

```json
{
  "status": 404,
  "message": "User not found.",
  "payload": "There is no user with the requested id."
}
```

#### 404 - Unknown User Lookup

```json
{
  "status": 404,
  "message": "Unknown user lookup.",
  "payload": "The user lookup was unsuccessful."
}
```

---

## Best Practices

### 1. Token Management

- Store JWT tokens securely (never in localStorage for web apps)
- Refresh tokens before they expire
- Include tokens in the Authorization header for all authenticated requests

### 2. Error Handling

- Always check the `status` field in responses
- Handle common error codes (401, 403, 404) gracefully
- Log error `payload` for debugging purposes

### 3. Pagination

- Use `limit` and `offset` parameters for large result sets
- Default limit is typically 10-20 items
- Check `pagination.total` to know the full result count

### 4. Rate Limiting

- Respect rate limits (details provided via response headers)
- Implement exponential backoff for retries
- Cache responses when appropriate

### 5. Request Body Validation

- Always validate input before sending requests
- Use proper field names (snake_case as shown in examples)
- Include Content-Type header for POST requests

### 6. Security

- Always use HTTPS in production
- Never log or expose JWT tokens
- Validate token expiration on the client side
- Use supreme permissions sparingly

---

## Monitoring and Health

### Health Check

```bash
curl -X GET https://user-service.example.com/heartbeat
```

### Prometheus Metrics

```bash
curl -X GET https://user-service.example.com/metrics
```

Returns metrics in Prometheus format including:
- Request duration histograms
- Request counters by endpoint
- System resource usage
- DNS cache statistics

---

## Environment Configuration

The service behavior can be configured via environment variables:

- `PORT` - Service port (default: 8080)
- `DNS_CACHE_TTL` - DNS cache TTL in milliseconds (default: 3600000)
- JWT configuration (private/public keys)
- Database connection settings
- Tracing and monitoring configuration

---

## SDK and Client Libraries

For production use, consider using the official client libraries:
- `@verifiedfan/lib` - Core utilities and helpers
- `@verifiedfan/titan-request` - Request helpers for Titan services

These libraries handle authentication, error handling, and request formatting automatically.
