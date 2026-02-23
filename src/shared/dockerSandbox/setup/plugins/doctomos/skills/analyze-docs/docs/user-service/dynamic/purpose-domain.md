# Domain Concepts - user-service

## Core Entities

| Entity | Description |
|--------|-------------|
| **User** | A verified fan with Ticketmaster credentials, profile data, and permissions. Primary identity record. |
| **UserSupreme** | A special privilege record indicating platform administrator status with unrestricted access. |
| **Permission** | Campaign-specific authorization granting actions (VIEW, INVITE, etc.) to a user. |
| **Worker** | A backend service authenticated via RSA keys for programmatic API access. |
| **Contact** | Email or phone number associated with a user, maintaining chronological history. |
| **Integration** | Social media account (Facebook, Twitter, Tumblr, YouTube) linked to a user profile. |
| **Wallet** | Payment instruments and billing details from Ticketmaster Wallet API, cached in user profile. |
| **JWT Token** | Signed authentication token embedding user identity, permissions, and supreme status. |
| **Campaign** | A verified fan program (presale, contest, etc.) that users can access with permissions. |
| **Code Alpha** | A user-generated alphanumeric code for quick user lookup and identification. |

## Business Rules

- **BR-001: User Identity**: Every user must have a unique Ticketmaster ID (tmId) and MongoDB ObjectId (_id)
- **BR-002: Authentication Requirement**: All protected endpoints require valid JWT token in Authorization header (except /auth, /heartbeat, /metrics)
- **BR-003: Supreme User Privilege**: Supreme users bypass all permission checks and can perform any operation on any user or campaign
- **BR-004: Permission Specificity**: Permissions are scoped to specific campaigns; a user's permissions on Campaign A don't apply to Campaign B
- **BR-005: Permission Actions**: Valid permission actions are INVITE, VIEW, and potentially others defined in @verifiedfan/lib permissions enums
- **BR-006: Token Signature Validation**: /me endpoint requires tm_token signature to match cached token signature to prevent token replay attacks
- **BR-007: Wallet Cache TTL**: Wallet data older than 30 seconds must be refreshed from TM Wallet API
- **BR-008: Contact Uniqueness**: Email addresses must be unique per user but can exist across multiple users (same email can't appear twice in one user's list)
- **BR-009: Integration Exclusivity**: Each social media account (identified by social provider ID) can only link to one user at a time
- **BR-010: Worker Authentication**: Workers must authenticate using RSA-signed petitions with public keys registered in MongoDB
- **BR-011: User Deletion Cascade**: Deleting a user must also delete all exports (Export Service) and entries (Entry Service)
- **BR-012: Contact Validation**: Email addresses must pass isValidEmail check; phone numbers must pass libphonenumber-js validation
- **BR-013: Campaign Permission Requirement**: Granting permissions requires requester to have INVITE action on the campaign (unless supreme user)
- **BR-014: Login Event Guarantee**: Every successful authentication must publish a vfLogin event to Campaign Data Stream
- **BR-015: Token Refresh on Stale Data**: If user data is older than 30 seconds at /me endpoint, re-authenticate with Ticketmaster to refresh

## Terminology

| Term | Definition |
|------|------------|
| **Verified Fan** | A fan who has authenticated via Ticketmaster and is eligible to participate in presales/campaigns |
| **tm_token** | JWT token issued by Ticketmaster Accounts API representing authenticated Ticketmaster session |
| **tmId** | Ticketmaster user identifier from TM Accounts system (integrations.ticketmaster.id) |
| **globalUserId** | Ticketmaster global user identifier used across TM systems (integrations.ticketmaster.globalUserId) |
| **authUserId** | The user ID extracted from the requesting user's JWT token (who is making the request) |
| **Supreme User** | Platform administrator with unrestricted access to all users and campaigns |
| **Campaign Actions** | Specific permissions within a campaign (e.g., INVITE allows granting permissions to others) |
| **Worker Key** | RSA public key registered for a backend service to enable service-to-service authentication |
| **Petition** | RSA-signed payload used by worker services to prove identity during authentication |
| **Contact Type** | Email or phone; contact information types that can be associated with users |
| **Integration Type** | Social media platform (facebook, twitter, tumblr, youtube) that can be linked to user profile |
| **Wallet Item** | Payment instrument (credit card, payment method) stored in Ticketmaster Wallet |
| **Funding Source** | Type of payment method (e.g., credit card, debit card, PayPal) |
| **Payment Instrument Token** | Unique identifier for a payment method in TM Wallet system |
| **Member ID** | Ticketmaster member identifier used for wallet lookups (integrations.ticketmaster.member_id) |
| **Code Alpha** | User-generated alphanumeric code for quick user identification (like a vanity code) |
| **Campaign Data Stream** | Kinesis stream receiving vfLogin events for campaign analytics |
| **Compound ID** | MongoDB _id structure combining multiple fields (e.g., { user_id, campaign_id }) for permissions |
| **Flattened Compound ID** | Compound ID transformed to single-level object for API responses |
| **ReadPreference.PRIMARY** | MongoDB read from primary replica to ensure most current data (not cached secondary) |

## Data Models

### User Document (MongoDB users collection)

```javascript
{
  _id: ObjectId("60a1b2c3d4e5f6789abcdef0"),  // Unique user identifier
  name: {
    first: "John",
    last: "Doe"
  },
  email: {
    current: "john.doe@example.com",           // Most recent email
    list: [                                     // Chronological email history
      {
        account: "john.doe@example.com",
        date: { added: 1621500000000, updated: 1621500000000 }
      }
    ]
  },
  phone: {
    current: "+15551234567",                   // Most recent phone
    list: [                                     // Chronological phone history
      {
        account: "+15551234567",
        date: { added: 1621500000000, updated: 1621500000000 }
      }
    ]
  },
  integrations: {
    ticketmaster: {
      id: "12345",                              // tmId
      globalUserId: "guid-12345",               // Global TM identifier
      member_id: "mem-12345",                   // For wallet lookups
      email: "tm.email@example.com",
      token: "eyJhbGciOi...",                   // Cached tm_token
      origin: "accounts.ticketmaster.com",
      date: { added: 1621500000000 }
    },
    facebook: {
      id: "fb-987654",
      name: "John Doe",
      email: "john.fb@example.com",
      token: "EAAB...",
      date: { added: 1621500000000 }
    }
    // twitter, tumblr, youtube follow similar structure
  },
  wallet: {
    list: [
      {
        payment_instrument_token: "pi-token-123",
        funding_source: "credit_card",
        instrument_token: "inst-token-456",
        active: true,
        validated: true,
        expiration_month: "12",
        expiration_year: "2025",
        billing_address: {
          name_on_card: "John Doe",
          address_line1: "123 Main St",
          city: "Los Angeles",
          state: "CA",
          postal_code: "90001"
        },
        date: { added: 1621500000000, updated: 1621500000000 }
      }
    ],
    date: { updated: 1621500000000 }            // Last wallet refresh timestamp
  },
  auth: {
    // Internal auth fields (password hashes if applicable)
  },
  date: {
    created: 1621500000000,
    updated: 1621500000000
  }
}
```

### Permission Document (MongoDB permissions collection)

```javascript
{
  _id: {
    user_id: ObjectId("60a1b2c3d4e5f6789abcdef0"),  // Compound key
    campaign_id: "taylor-swift-2024"                 // Compound key
  },
  actions: ["VIEW", "INVITE"],                       // Granted permissions
  date: {
    changed: 1621500000000                           // Last permission change
  },
  history: [                                          // Audit trail
    {
      author: ObjectId("60a1b2c3d4e5f6789abcdef1"),
      actions: ["VIEW"],
      date: { changed: 1621400000000 }
    }
  ]
}
```

### UserSupreme Document (MongoDB userSupremes collection)

```javascript
{
  _id: {
    user_id: ObjectId("60a1b2c3d4e5f6789abcdef0")   // Compound key (user only)
  },
  isDisabled: false,                                 // Can be temporarily disabled
  date: {
    changed: 1621500000000                           // Last status change
  },
  history: [                                          // Audit trail
    {
      author: ObjectId("60a1b2c3d4e5f6789abcdef2"),
      isDisabled: false,
      date: { changed: 1621400000000 }
    }
  ]
}
```

### Worker Document (MongoDB workers collection)

```javascript
{
  _id: ObjectId("60a1b2c3d4e5f6789abcdef3"),
  appId: "ccpaWorkers",                              // Unique worker identifier
  publicKey: "-----BEGIN PUBLIC KEY-----\n...",      // RSA public key PEM format
  date: {
    created: 1621500000000
  }
}
```

### JWT Token Structure

```javascript
{
  // Header
  alg: "HS256",  // or RS256 for workers
  typ: "JWT"

  // Payload
  user: {
    id: "60a1b2c3d4e5f6789abcdef0",               // userId
    keys: { /* auth keys */ },
    tmSig: "signature-from-tm-token"              // For signature validation
  },
  isAdmin: true,                                   // true if isSupreme or has permissions
  isSupreme: false,
  permissions: {
    "taylor-swift-2024": ["VIEW", "INVITE"],     // Campaign-specific actions
    "beyonce-tour": ["VIEW"]
  },
  iat: 1621500000,                                // Issued at
  exp: 1621501800                                 // Expires (typically 30 minutes)

  // Signature
  // HMACSHA256(base64UrlEncode(header) + "." + base64UrlEncode(payload), secret)
}
```

### vfLogin Event (Kinesis)

```javascript
{
  type: "vfLogin",
  globalUserId: "guid-12345",                     // Partition key
  tmId: "12345",
  email: "john.doe@example.com",
  firstName: "John",
  lastName: "Doe",
  // Additional user profile fields (non-null values only)
}
```

## Data Flow Diagrams

### Authentication Flow Data Transformation

```
Client Request
  ↓
{ tm_token: "eyJhbGc..." }
  ↓
TM Accounts API Validation
  ↓
{
  id: "12345",
  globalUserId: "guid-12345",
  email: "user@example.com",
  name: { first: "John", last: "Doe" }
}
  ↓
MongoDB Upsert (users collection)
  ↓
{
  _id: ObjectId("..."),
  name: { first: "John", last: "Doe" },
  integrations: {
    ticketmaster: {
      id: "12345",
      globalUserId: "guid-12345",
      email: "user@example.com",
      token: "eyJhbGc...",
      origin: "accounts.ticketmaster.com"
    }
  }
}
  ↓
Parallel Lookups: isUserSupreme + lookupUserPermissionsMap
  ↓
{
  isSupreme: false,
  permissions: { "campaign-1": ["VIEW"], "campaign-2": ["VIEW", "INVITE"] }
}
  ↓
JWT Generation
  ↓
{
  user: { id: "...", tmSig: "..." },
  isAdmin: true,
  isSupreme: false,
  permissions: { "campaign-1": ["VIEW"], "campaign-2": ["VIEW", "INVITE"] }
}
  ↓
Kinesis Publish (async)
  ↓
{ type: "vfLogin", globalUserId: "guid-12345", tmId: "12345", ... }
  ↓
Client Response
  ↓
{
  _id: "...",
  name: { first: "John", last: "Doe" },
  email: { current: "user@example.com", list: [...] },
  integrations: { ticketmaster: {...} },
  auth: { token: "eyJhbGc..." }  // JWT embedded
}
```

### Wallet Refresh Data Transformation

```
Client Request: GET /me/wallet
  ↓
JWT → userId: "60a1b2c3d4e5f6789abcdef0"
  ↓
MongoDB Lookup (users collection)
  ↓
{
  wallet: { date: { updated: 1621500000000 }, list: [...] },
  integrations: { ticketmaster: { member_id: "mem-12345" } }
}
  ↓
Check TTL: (now - wallet.date.updated) > 30000ms ? → YES, refresh needed
  ↓
TM Wallet API Call with member_id: "mem-12345"
  ↓
{
  wallet_items: [
    {
      payment_instrument_token: "pi-token-123",
      funding_source: "credit_card",
      funding_source_details: {
        instrument_token: "inst-token-456",
        active: true,
        customer_details: {
          billing_address: {
            name_on_card: "John Doe",
            address_line1: "123 Main St",
            ...
          }
        }
      }
    }
  ]
}
  ↓
Format Wallet Items (flatten structure, extract billing_address)
  ↓
[
  {
    payment_instrument_token: "pi-token-123",
    funding_source: "credit_card",
    instrument_token: "inst-token-456",
    active: true,
    billing_address: { name_on_card: "John Doe", ... },
    date: { added: ..., updated: ... }
  }
]
  ↓
Compare with cached wallet → Mark inactive items
  ↓
MongoDB Update: wallet.list + wallet.date.updated
  ↓
Filter active items only
  ↓
Client Response
  ↓
[
  {
    payment_instrument_token: "pi-token-123",
    funding_source: "credit_card",
    active: true,
    ...
  }
]
```

### Permission Grant Data Transformation

```
Admin Request: POST /:userId/campaigns/:campaignId
  ↓
{ actions: ["VIEW", "INVITE"] }
  ↓
JWT Validation → authUserId, authCampaignActions
  ↓
Validate: authCampaignActions.includes("INVITE") ? → YES
  ↓
MongoDB Lookup: User exists?
  ↓
MongoDB Upsert (permissions collection)
  ↓
{
  _id: {
    user_id: ObjectId("60a1b2c3d4e5f6789abcdef0"),
    campaign_id: "taylor-swift-2024"
  },
  actions: ["VIEW", "INVITE"],
  date: { changed: 1621500000000 },
  history: [...]
}
  ↓
Flatten Compound ID for response
  ↓
{
  user_id: "60a1b2c3d4e5f6789abcdef0",
  campaign_id: "taylor-swift-2024",
  actions: ["VIEW", "INVITE"],
  date: { changed: 1621500000000 }
}
  ↓
Client Response
```
