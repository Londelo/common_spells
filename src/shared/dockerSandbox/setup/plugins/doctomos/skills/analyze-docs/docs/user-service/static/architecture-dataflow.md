# Data Flow - user-service

## Primary Flow

The user-service follows a **request-response** pattern for authentication and user management operations. Data flows through a middleware stack, then through layered architecture (router → manager → datastore), with external service calls made as needed.

```
┌─────────────────────────────────────────────────────────────┐
│                       HTTP Request                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Stack                         │
│  • Compression                                              │
│  • Tracing (OpenTelemetry)                                  │
│  • Body Parser                                              │
│  • Prometheus Metrics                                       │
│  • Correlation ID                                           │
│  • Access Logging                                           │
│  • Error Formatting                                         │
│  • JWT Authentication (except /auth, /metrics, /heartbeat)  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Router Layer                            │
│  • Route matching (/auth, /me, /users, etc.)               │
│  • Extract request parameters                               │
│  • Transform ctx → managerCtx                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Manager Layer                            │
│  • Business logic execution                                 │
│  • Validation                                               │
│  • Orchestration of multiple operations                     │
│  • Permission checks                                        │
└─────────────────────────────────────────────────────────────┘
          ↓                              ↓
┌────────────────────┐       ┌──────────────────────┐
│  Datastore Layer   │       │   Services Layer     │
│  • MongoDB queries │       │  • Ticketmaster API  │
│  • CRUD operations │       │  • Facebook API      │
│  • Data validation │       │  • Entries service   │
└────────────────────┘       │  • Exports service   │
          ↓                  │  • SLA service       │
┌────────────────────┐       └──────────────────────┘
│    MongoDB         │                 ↓
│  • users           │       ┌──────────────────────┐
│  • permissions     │       │  External Systems    │
│  • userSupremes    │       │  • tm.com API        │
│  • workers         │       │  • Facebook Graph    │
│  • emailTokens     │       │  • Other Titan svcs  │
│  • codeAlphas      │       └──────────────────────┘
└────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│                  Response Formatter                         │
│  • Normalize data format                                    │
│  • Add metadata                                             │
│  • Apply consistent structure                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Response                           │
└─────────────────────────────────────────────────────────────┘
```

## Request/Response Cycles

### 1. User Authentication Flow

**Endpoint**: `POST /auth`

**Purpose**: Authenticate user with Ticketmaster token, upsert user data, generate JWT

```
Client (Ticketmaster token)
    ↓
POST /auth { tm_token, tmuo }
    ↓
[Middleware: bodyParser, logging, tracing]
    ↓
Router: app/router/auth.js
    ↓
Manager: authenticate(managerCtx, { tm_token, tmuo })
    ↓
Manager: authenticateAndUpsertUser()
    ├─→ Service: tmAccountsV2.getInfo(tm_token, origin)
    │       ↓
    │   Ticketmaster API: Validate token, fetch user profile
    │       ↓
    │   Return: { name, globalUserId, email, phone, member_id, ... }
    │
    └─→ Datastore: users.upsertWithTM({ tmUser, codes })
            ↓
        MongoDB: Upsert user document (by globalUserId or member_id)
            ↓
        Return: user object
    ↓
Manager: Check permissions & supreme status
    ├─→ Datastore: userSupremes.isUserSupreme({ userId })
    └─→ Datastore: permissions.lookupUserPermissionsMap({ userId })
    ↓
Manager: Generate JWT token with makeToken({ user, isAdmin, isSupreme, permissions })
    ↓
Manager: Attach token to user object
    ↓
Response Formatter: Normalize user object
    ↓
HTTP Response: { user, auth: { token } }
```

### 2. Get Current User (Self) Flow

**Endpoint**: `GET /me`

**Purpose**: Retrieve current authenticated user's profile

```
Client (with JWT)
    ↓
GET /me (Authorization: Bearer <token>)
    ↓
[Middleware: JWT validation, extract userId from token]
    ↓
Router: app/router/me.js
    ↓
Manager: findSelf(managerCtx, { userId, token, tmSig })
    ↓
Datastore: users.findById({ userId })
    ↓
MongoDB: db.users.findOne({ _id: ObjectId(userId) })
    ↓
Manager: Check token signature & expiry
    ├─ If expired or mismatched → Re-authenticate with Ticketmaster
    └─ If valid → Return cached user
    ↓
Response: { user, auth: { token } }
```

### 3. Update Current User Flow

**Endpoint**: `PATCH /me`

**Purpose**: Update user profile (name, contacts, integrations)

```
Client (with JWT)
    ↓
PATCH /me { firstName, lastName, email, phone, facebookToken, ... }
    ↓
[Middleware: JWT validation]
    ↓
Router: app/router/me.js
    ↓
Manager: updateSelf(managerCtx, { userId, token, params })
    ↓
Datastore: users.findById({ userId })
    ↓
[Conditional operations based on params]
    ├─→ Remove integration: removeIntegration({ type })
    │       ↓
    │   Datastore: users.removeIntegration(type, user)
    │       ↓
    │   MongoDB: $unset integration field
    │
    ├─→ Add Facebook integration: integrateFacebook({ token, user })
    │       ↓
    │   Service: facebook.getProfile(facebookToken)
    │       ↓
    │   Facebook Graph API: Fetch profile
    │       ↓
    │   Datastore: users.updateIntegration('facebook', account, user)
    │       ↓
    │   MongoDB: $set integrations.facebook
    │
    ├─→ Update contacts: saveContact({ type: 'email', account, user })
    │       ↓
    │   Validate contact format
    │       ↓
    │   Check for duplicates
    │       ↓
    │   Datastore: users.updateContact() or users.addContact()
    │       ↓
    │   MongoDB: $push or $set contact in list
    │
    └─→ Update name: users.updateName(nameObj, user)
            ↓
        MongoDB: $set name fields
    ↓
Datastore: findByUserIdFromPrimary({ userId })  [Read from primary for consistency]
    ↓
Response: { user, auth: { token } }
```

### 4. User Lookup by Code Flow

**Endpoint**: `GET /?code=<code>`

**Purpose**: Find user by alpha code (requires authentication)

```
Client (with JWT)
    ↓
GET /?code=ABC123
    ↓
[Middleware: JWT validation, extract authUserId]
    ↓
Router: app/router/index.js (root route)
    ↓
Manager: findUserBy(managerCtx, { code, authUserId })
    ↓
Validate authUserId exists (authorization check)
    ↓
Datastore: users.findByCode(code)
    ↓
MongoDB: db.users.findOne({ codes: code })
    ↓
Response: { _id: "..." }
```

### 5. User Deletion Flow

**Endpoint**: `DELETE /users/:userId`

**Purpose**: Delete user and all associated data (supreme users only)

```
Client (with JWT, supreme user)
    ↓
DELETE /users/:userId
    ↓
[Middleware: JWT validation]
    ↓
Router: app/router/users.js
    ↓
Manager: deleteUser(managerCtx, { jwt, isSupremeUser, userId })
    ↓
Check isSupremeUser permission
    ↓
[Parallel deletion operations]
    ├─→ Service: exports.deleteUserExports({ jwt, userId })
    │       ↓
    │   Exports Service API: DELETE user exports
    │
    ├─→ Service: entries.deleteUserEntries({ jwt, userId })
    │       ↓
    │   Entries Service API: DELETE user entries & scoring
    │
    └─→ Datastore: users.deleteUser({ userId })
            ↓
        MongoDB: db.users.deleteOne({ _id: ObjectId(userId) })
    ↓
Response: { userDeleted: true, deletedCount: { ... } }
```

### 6. Worker Authentication Flow

**Endpoint**: `POST /auth/workers`

**Purpose**: Authenticate service-to-service workers with RSA signature

```
Worker Service
    ↓
POST /auth/workers { appId, petition }
    ↓
[Middleware: bodyParser, logging (NO JWT required)]
    ↓
Router: app/router/auth.js
    ↓
Manager: workers.authenticate(managerCtx, { appId, petition })
    ↓
Resolve public key for appId
    ├─→ Datastore: workers.resolveAppPublicKey({ appId })
    │       ↓
    │   MongoDB: db.workers.findOne({ appId })
    │       ↓
    │   OR: Read from workerKeys/ directory (file-based fallback)
    │
    └─→ Verify RSA signature of petition with public key
            ↓
        If valid: Generate JWT with worker permissions
            ↓
        Response: { token }
```

## State Management

**Stateless Service**: The user-service is stateless. Each request is self-contained.

**State Storage**:
- **User state**: Stored in MongoDB `users` collection
- **Session state**: Encoded in JWT (token includes userId, permissions, timestamps)
- **Permissions**: Stored in MongoDB `permissions` and `userSupremes` collections
- **Worker keys**: Stored in MongoDB `workers` collection or file system

**Caching Strategy**:
- **User profile**: 30-second TTL for `/me` endpoint (avoids repeated Ticketmaster API calls)
- **DNS cache**: Configurable TTL for DNS lookups (default 1 hour)
- **No application-level cache**: Direct database reads for consistency

## Event Processing

**Synchronous Request-Response**: The service does not process events asynchronously. All operations are synchronous request-response flows.

**Side Effects**:
- Campaign data updates sent to `campaignDataStream` service (fire-and-forget)
- Wallet updates via `@verifiedfan/tm-wallet` library

## External Integrations

| Integration | Direction | Purpose | Location |
|-------------|-----------|---------|----------|
| **Ticketmaster API v2** | Outbound | User authentication, profile sync | `app/services/ticketmaster/v2/` |
| **Facebook Graph API** | Outbound | Link Facebook accounts, fetch profile | `app/services/facebook/` |
| **Entries Service** | Outbound | Delete user entries (GDPR) | `app/services/entries/` |
| **Exports Service** | Outbound | Delete user exports (GDPR) | `app/services/exports/` |
| **SLA Service** | Outbound | Service-level agreement tracking | `app/services/slas/` |
| **Campaign Data Stream** | Outbound | Stream user campaign data | `app/services/campaignDataStream/` |
| **MongoDB** | Bidirectional | Persistent data storage | `app/datastore/mongo/` |

## Data Model Overview

**MongoDB Collections**:

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles, contacts, integrations | `_id`, `integrations.ticketmaster`, `email.list`, `phone.list`, `wallet`, `codes` |
| `permissions` | User permissions for campaigns/organizations | `userId`, `campaignId`, `permissions` |
| `userSupremes` | Supreme (admin) users | `userId` |
| `workers` | Service-to-service authentication | `appId`, `publicKey` |
| `emailTokens` | Email verification tokens | `email`, `token`, `expiry` |
| `codeAlphas` | Alpha code generation tracking | `code`, `userId` |

## Data Flow Patterns

### 1. Authentication Data Flow
```
Ticketmaster Token → Validate with TM API → Upsert User → Check Permissions → Generate JWT → Return
```

### 2. User Update Data Flow
```
Request Params → Validate → Find User → Update MongoDB → Notify External Services → Re-fetch User → Return
```

### 3. Lookup Data Flow
```
Query Params → Authorize → Query MongoDB → Transform Response → Return
```

### 4. Integration Data Flow
```
Third-party Token → Validate with Provider API → Extract Profile → Store in User Document → Return
```

## Performance Considerations

**N+1 Query Prevention**:
- Batch lookups for multiple users (`findByUserIds`, `findByTicketmasterIds`)
- Single query for user + permissions instead of separate queries

**Read Preference**:
- Most reads from MongoDB secondary (eventual consistency acceptable)
- `/me` updates force read from primary for strong consistency

**Connection Pooling**:
- MongoDB connection pool managed by driver
- HTTP clients reuse connections (via `request-promise-native`)

**DNS Caching**:
- Configurable DNS cache TTL to reduce DNS lookup overhead
