# Purpose - user-service

## What This Does

The user-service is the central identity and authentication system for Ticketmaster's Verified Fan platform. It manages user profiles, authentication tokens, social media integrations, campaign permissions, and payment wallet information for fans participating in verified fan programs.

## Business Context

Verified Fan programs require secure identification and authentication of fans before they can access presales, purchase tickets, or participate in campaigns. This service exists to:
- Authenticate fans using Ticketmaster credentials and generate secure JWT tokens
- Maintain unified user profiles across multiple campaigns and events
- Control access to campaigns through role-based permissions
- Enable social media integrations for fan engagement and verification
- Provide wallet integration for payment instrument management
- Stream user login activity to campaign analytics pipelines

## Target Users/Consumers

**Primary Consumers:**
- **Frontend Applications**: Web and mobile apps that require user authentication and profile management
- **Campaign Service**: Manages campaign-specific permissions and user eligibility
- **Entry Service**: Verifies user identity for contest entries and presales
- **Export Service**: Handles user data exports for reporting and compliance
- **Analytics Pipeline**: Consumes user login events for campaign analytics
- **Worker Services**: Backend processes that need authenticated access via RSA key-based JWT tokens

**End Users:**
- Verified fans authenticating to access presales and campaigns
- Campaign administrators managing user permissions
- Supreme users (platform admins) with elevated privileges

## Key Business Capabilities

- **User Authentication & Token Generation**: Validates Ticketmaster credentials, creates JWT tokens with embedded permissions
- **Unified Profile Management**: Consolidates user identity, contacts (email/phone), social integrations, and wallet data
- **Campaign Permission Management**: Controls which users can invite, manage, or view specific campaigns
- **Social Media Integration**: Links Facebook, Twitter, Tumblr, and YouTube accounts for fan verification and engagement
- **Payment Wallet Integration**: Fetches and caches Ticketmaster wallet data including payment instruments and billing details
- **User Lookup & Resolution**: Finds users by Ticketmaster ID, email, global user ID, or custom user codes
- **Worker Authentication**: Enables service-to-service communication via RSA-signed JWT tokens
- **Login Event Streaming**: Publishes user login events to Kinesis for campaign analytics

## Business Requirements & Constraints

- **REQ-001**: All authenticated requests must include a valid JWT token signed by the service
- **REQ-002**: User tokens must embed campaign permissions to enable authorization at API boundaries
- **REQ-003**: Social media integrations must not conflict (same social account cannot link to multiple users)
- **REQ-004**: Wallet data must be refreshed from Ticketmaster Wallet API if cached data is older than 30 seconds
- **REQ-005**: User deletion requires supreme user privileges and must cascade to related exports and entries
- **REQ-006**: Contact information (email/phone) must be validated before saving
- **REQ-007**: Worker services must authenticate using RSA-signed petitions with registered public keys
- **REQ-008**: Login events must be published to campaign data stream within request lifecycle
- **REQ-009**: User IDs must be MongoDB ObjectIds, validated on all lookup operations
- **REQ-010**: Token signatures must match between stored Ticketmaster token and request token for /me endpoint

## Core Business Rules

- **Authentication Flow**: User provides tm_token → Service validates with TM Accounts → Creates/updates user → Checks supreme status and permissions → Generates JWT with embedded roles
- **Token Refresh Policy**: /me endpoint returns cached user if updated within 30 seconds, otherwise re-authenticates with Ticketmaster
- **Supreme User Hierarchy**: Supreme users bypass all permission checks and can manage any user's permissions
- **Permission Requirements**: Campaign actions (INVITE, VIEW, etc.) must be validated against JWT claims before granting access
- **Wallet Caching**: Payment instruments are fetched from TM Wallet API and cached in MongoDB with 30-second TTL
- **Contact Priority**: Email and phone contacts maintain chronological lists with "current" indicator for most recent
- **Integration Ownership**: Each social media account can only be linked to one user at a time
- **Worker Key Management**: Worker public keys are stored in MongoDB and matched by appId during authentication

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| User login | Publish vfLogin event | Campaign Data Stream (Kinesis) | During authentication flow |
| User created/updated | Upsert user data | MongoDB users collection | On authentication or profile update |
| Contact added | Update contact list | MongoDB users collection | When email/phone is added/updated |
| Social integration | Fetch social profile | Facebook/Twitter/Tumblr/YouTube APIs | When user links social account |
| Wallet request | Fetch payment instruments | TM Wallet API | When user wallet is accessed |
| User deletion | Delete user exports | Export Service (via HTTP) | When supreme user deletes a user |
| User deletion | Delete user entries | Entry Service (via HTTP) | When supreme user deletes a user |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Client apps | POST /auth | Authenticate user with TM token | Real-time (synchronous) |
| Worker services | POST /auth/workers | Authenticate worker via RSA petition | Real-time (synchronous) |
| Client apps | GET /me | Return cached or refreshed user profile | Real-time (synchronous) |
| Client apps | POST /me | Update user profile, contacts, integrations | Real-time (synchronous) |
| Admin apps | POST /:userId/campaigns/:campaignId | Grant/revoke campaign permissions | Real-time (synchronous) |
| Admin apps | POST /:userId/supremes | Enable/disable supreme user status | Real-time (synchronous) |

### Service Dependencies

**Critical Dependencies:**
- **TM Accounts API (v2)**: Validates Ticketmaster tokens and fetches user profile data
- **TM Wallet API**: Retrieves payment instruments and billing details
- **MongoDB**: Primary data store for users, permissions, worker keys
- **Kinesis (Campaign Data Stream)**: Receives user login events for analytics
- **Entry Service**: Handles user entry deletion during user removal
- **Export Service**: Handles user export deletion during user removal

**Social Media APIs:**
- **Facebook Graph API**: Validates Facebook tokens and fetches profile data
- **Twitter API**: (Integration code present but details not fully traced)
- **Tumblr API**: (Integration code present but details not fully traced)
- **YouTube/Google API**: (Integration code present but details not fully traced)

## Success Metrics

- **Authentication Success Rate**: >99% of valid TM token authentication requests succeed
- **API Response Time**: p95 latency <500ms for authentication, <200ms for cached user lookups
- **JWT Token Validity**: 100% of issued tokens are correctly signed and decodable
- **Wallet Data Accuracy**: 100% of wallet data matches TM Wallet API (within cache TTL)
- **Permission Enforcement**: 100% of permission checks correctly authorize or deny access
- **Login Event Delivery**: >99% of login events successfully published to Kinesis
- **Data Consistency**: 100% of user profile updates are persisted to MongoDB
