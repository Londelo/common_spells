# API Contracts - user-service

## Overview

The user-service is a Koa-based REST API that manages user authentication, profiles, permissions, and integrations with third-party services. The service provides endpoints for user operations, campaign permissions, and supreme user management.

**Framework:** Koa.js
**Authentication:** JWT (JSON Web Tokens)
**Port:** 8080 (default)

---

## REST Endpoints

### Root Endpoints

#### Find User by Code

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/` | Find user by verification code | JWT |

**Query Parameters:**
- `code`: Verification code for user lookup

**Response:** User object with stringified ObjectId

---

### Authentication Endpoints (`/auth`)

#### User Authentication

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/auth` | Authenticate user with Ticketmaster token | None |

**Request Body:**
```json
{
  "tm_token": "string (Ticketmaster token)",
  "tmuo": "string (Ticketmaster user origin)",
  "version": "string (optional)"
}
```

**Response:**
```json
{
  "id": "string",
  "auth": {
    "token": "string (JWT)"
  },
  "integrations": {},
  "date": {
    "created": "timestamp",
    "updated": "timestamp"
  }
}
```

#### Worker Authentication

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/auth/workers` | Authenticate service workers | None |

**Request Body:**
```json
{
  "appId": "string",
  "petition": "string"
}
```

---

### Current User Endpoints (`/me`)

#### Get Current User Profile

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/me` | Get authenticated user's profile | JWT |

**Response:** Complete user profile with authentication token

#### Get User Wallet

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/me/wallet` | Get user's fan wallet information | JWT |

**Response:** Fan wallet details

#### Get User Integration

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/me/integration/:providerId` | Get specific integration details | JWT |

**Path Parameters:**
- `providerId`: Integration provider identifier

#### Update Current User

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/me` | Update authenticated user's profile | JWT |

**Request Body:**
```json
{
  "email": "string (optional)",
  "phone": "string (optional)",
  "first_name": "string (optional)",
  "last_name": "string (optional)",
  "fb_token": "string (optional - Facebook token)",
  "twitter_token": "string (optional)",
  "twitter_secret": "string (optional)",
  "tumblr_token": "string (optional)",
  "tumblr_secret": "string (optional)",
  "youtube_token": "string (optional)",
  "remove_integration": "string (optional - integration type to remove)",
  "list_id": "string (optional)"
}
```

---

### User Management Endpoints (`/users`)

#### Get User IDs

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/users/ids` | Lookup user IDs by various identifiers | JWT |

**Query Parameters:**
- `tmIds`: Comma-separated Ticketmaster IDs
- `userIds`: Comma-separated user IDs
- `emails`: Comma-separated email addresses
- `globalUserIds`: Comma-separated global user IDs
- `ensureExists`: Boolean flag
- `limit`: Pagination limit
- `offset`: Pagination offset

**Response:** List of user ID mappings

#### Get User Contacts

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/users/contacts` | Retrieve contact information for users | JWT |

**Query Parameters:**
- `userIds`: Comma-separated user IDs
- `limit`: Pagination limit
- `offset`: Pagination offset

#### Find User by Any ID

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/users/find` | Find user by any identifier type | JWT |

**Query Parameters:**
- `id`: Any user identifier (userId, tmId, email, etc.)

#### Upsert Users

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/users/upsert` | Create or update multiple users | JWT (Supreme) |

**Request Body:**
```json
[
  {
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "ticketmasterId": "string"
  }
]
```

**Authorization:** Requires supreme user permissions

#### Delete User

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| DELETE | `/users/:userId` | Delete a user account | JWT (Supreme) |

**Path Parameters:**
- `userId`: User ID to delete

**Authorization:** Requires supreme user permissions

---

### Campaign Permission Endpoints (`/:userId/campaigns`)

#### Get All User Permissions

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/:userId/campaigns` | Get all campaign permissions for user | JWT |

**Path Parameters:**
- `userId`: User ID (use `me` for current user)

**Response:** Array of campaign permissions with flattened compound IDs

#### Get Campaign Permissions

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/:userId/campaigns/:campaignId` | Get permissions for specific campaign | JWT |

**Path Parameters:**
- `userId`: User ID (use `me` for current user)
- `campaignId`: Campaign identifier

#### Save Campaign Permissions

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/:userId/campaigns/:campaignId` | Save user permissions for campaign | JWT |

**Path Parameters:**
- `userId`: User ID (use `me` for current user)
- `campaignId`: Campaign identifier

**Request Body:**
```json
{
  "actions": ["string array of permission actions"]
}
```

---

### Supreme User Endpoints (`/:userId/supremes`)

#### Get Supreme User Status

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/:userId/supremes` | Check if user has supreme permissions | JWT |

**Path Parameters:**
- `userId`: User ID (use `me` for current user)

**Response:** Supreme user status object

#### Set Supreme User Status

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/:userId/supremes` | Enable or disable supreme permissions | JWT (Supreme) |

**Path Parameters:**
- `userId`: User ID (use `me` for current user)

**Request Body:**
```json
{
  "doDisable": "boolean (true to disable, false to enable)"
}
```

**Authorization:** Requires supreme user permissions

---

## Common Response Fields

### User Object

```json
{
  "id": "string (MongoDB ObjectId)",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "integrations": {
    "ticketmaster": {
      "id": "string",
      "token": "string",
      "origin": "string"
    },
    "facebook": {
      "id": "string",
      "token": "string"
    },
    "twitter": {
      "id": "string",
      "token": "string",
      "secret": "string"
    },
    "tumblr": {
      "id": "string",
      "token": "string",
      "secret": "string"
    },
    "youtube": {
      "id": "string",
      "token": "string"
    }
  },
  "auth": {
    "token": "string (JWT)",
    "keys": []
  },
  "date": {
    "created": "number (timestamp)",
    "updated": "number (timestamp)"
  }
}
```

### Permission Object

```json
{
  "userId": "string",
  "campaignId": "string",
  "actions": ["string array"],
  "date": {
    "created": "number",
    "updated": "number"
  }
}
```

### JWT Token Claims

```json
{
  "user": {
    "id": "string (user ID)",
    "keys": ["string array"],
    "tmSig": "string (Ticketmaster token signature)"
  },
  "isAdmin": "boolean",
  "isSupreme": "boolean",
  "permissions": {
    "campaignId": ["actions"]
  }
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "status": "number (HTTP status code)",
  "message": "string (human-readable message)",
  "payload": "string (detailed error information)"
}
```

---

## Special Routes

### Health Check

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/heartbeat` | Health check endpoint | None |

### Metrics

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/metrics` | Prometheus metrics endpoint | None |

**Note:** These endpoints bypass JWT authentication and response formatting middleware.

---

## Middleware Stack

The service applies the following middleware in order:

1. **Compression** - Response compression
2. **Tracing** - OpenTelemetry tracing (except /metrics, /heartbeat)
3. **Body Parser** - JSON request body parsing
4. **Prometheus Metrics** - Request duration and counter
5. **Context** - Request context initialization
6. **Correlation** - Request correlation IDs
7. **Access Log** - Request logging
8. **Error Formatter** - Standardized error responses
9. **Path** - Path normalization
10. **Response Formatter** - Standardized response format (except /metrics, /heartbeat)
11. **JWT** - JWT authentication (except /metrics, /heartbeat, /dev/token, /auth, /auth/workers)
12. **Router** - Request routing
