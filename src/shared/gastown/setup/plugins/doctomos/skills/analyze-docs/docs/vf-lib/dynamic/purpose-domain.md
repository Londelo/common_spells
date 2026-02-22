# Domain Concepts - vf-lib

## Core Entities

| Entity | Description |
|--------|-------------|
| **Package** | Independent, versioned NPM module within the monorepo (e.g., `@verifiedfan/spotify`, `@verifiedfan/kafka`) |
| **Library Client** | Consuming microservice that imports and uses one or more packages from vf-lib |
| **Access Token** | OAuth 2.0 bearer token for authenticating with third-party APIs (Spotify, Apple Music, TM Accounts) |
| **Schema** | Avro schema definition registered in Confluent Schema Registry for Kafka message validation |
| **Trace Span** | Unit of work in distributed tracing representing an operation (database query, API call, message publish) |
| **Normalizer** | Pure function that transforms raw user input into standardized format (email, phone, name) |
| **Message Attributes** | Key-value metadata attached to SNS/SQS messages for routing and filtering |
| **TMUO** | Ticketmaster Unified Identifier for users across TM systems (format: `tmuo_{region}_{id}`) |
| **Event Payload** | JSON or Avro-encoded data structure published to Kafka topic or SNS topic |
| **Cache Entry** | Key-value pair stored in Redis with TTL (time-to-live) for expiration |
| **Request Handler** | HTTP client wrapper that adds authentication, retry logic, and error handling to API requests |
| **Worker Auth** | Service-to-service authentication mechanism for internal API calls |
| **Presigned URL** | Time-limited, signed URL for temporary access to S3 objects without AWS credentials |
| **Message Deduplication ID** | Unique identifier for SQS/SNS FIFO messages to prevent duplicate processing |
| **Message Group ID** | Grouping key for SQS/SNS FIFO messages to ensure ordered processing within group |
| **Connection Pool** | Reusable set of persistent connections to databases (MongoDB, Redis) or message brokers (Kafka) |
| **Batch Processor** | Component that collects and sends multiple messages/records in a single operation for efficiency |
| **Retry Policy** | Configuration defining retry attempts, backoff strategy, and timeout for failed operations |
| **Service Discovery** | Mechanism for resolving service endpoints based on environment and region (TM PACMAN integration) |

## Business Rules

- **Semantic Versioning**: All package version changes must follow semver (MAJOR.MINOR.PATCH) - breaking changes increment MAJOR
- **Automatic Reconnection**: Database and message broker clients must attempt reconnection up to 3 times with exponential backoff (250ms, 750ms, 2000ms) before failing
- **Token Refresh**: OAuth clients must refresh access tokens proactively when >90% of TTL has elapsed to prevent auth failures
- **FIFO Message Deduplication**: Messages sent to .fifo topics/queues must include deduplication ID (default: hash of message body) to prevent duplicates within 5-minute window
- **Schema Compatibility**: New Kafka message schemas must be BACKWARD or FULL compatible with previous version to allow gradual consumer upgrades
- **Null Safety**: Data normalizers must return `null` for invalid inputs rather than throwing exceptions to support graceful degradation
- **Case-Insensitive Email**: All email addresses must be stored and compared in lowercase to prevent duplicate accounts
- **E.164 Phone Format**: Phone numbers must be normalized to E.164 international format (+{country_code}{number}) for consistent SMS delivery
- **Read Replica Routing**: Redis read operations may use read replica (`usePrimary: false`) for eventually consistent data; writes always use primary
- **TTL Enforcement**: All Redis cache entries must have explicit TTL to prevent memory exhaustion from stale data
- **Structured Logging**: Log entries must be JSON objects with standardized fields (timestamp, level, serviceName, message, metadata)
- **Trace Propagation**: All service-to-service calls must propagate trace context (trace ID, span ID) in headers for distributed tracing
- **Credential Rotation**: AWS clients must support credentials from environment variables, IAM roles, or Secrets Manager (never hardcoded)
- **Rate Limit Respect**: Third-party API clients must implement exponential backoff on 429 (rate limit) responses
- **Connection Timeout**: All HTTP requests must have timeout (default: 30 seconds) to prevent indefinite hangs
- **Batch Size Limits**: Kafka batch sends limited to 100 messages, SQS batch sends limited to 10 messages per API call
- **Region-Aware Routing**: TM Accounts API calls must route to correct regional endpoint based on TMUO prefix (US, EU, APAC)
- **Idempotent Operations**: S3 put, DynamoDB put, and Kafka send operations must be idempotent (safe to retry on failure)

## Terminology

| Term | Definition |
|------|------------|
| **Monorepo** | Single Git repository containing multiple independently versioned NPM packages managed by Lerna |
| **Lerna** | Monorepo management tool that handles package bootstrapping, versioning, and publishing |
| **Symlink** | Symbolic link enabling local packages to reference each other during development without publishing |
| **Semantic Release** | Automated versioning and changelog generation based on conventional commit messages |
| **Conventional Commits** | Commit message format (feat/fix/docs/chore) that drives semantic versioning |
| **OAuth 2.0** | Authorization framework for obtaining access tokens to third-party APIs |
| **JWT (JSON Web Token)** | Compact token format for transmitting claims between parties, used for user authentication |
| **Avro** | Binary serialization format with schema for compact, efficient Kafka messages |
| **Schema Registry** | Confluent service storing and versioning Avro schemas for Kafka topics |
| **FIFO (First-In-First-Out)** | SQS/SNS mode guaranteeing message ordering and exactly-once processing |
| **TTL (Time-To-Live)** | Expiration time for cached data or temporary URLs |
| **Presale** | Early ticket sales period for verified fans before general public on-sale |
| **Verified Fan** | User who has proven genuine fandom through listening history, social engagement, or other criteria |
| **TMUO** | Ticketmaster Unified Identifier for users (format: tmuo_us_12345, tmuo_eu_67890) |
| **Integrator ID** | Identifier for the team/channel making TM API requests (e.g., 'verifiedfan') |
| **Placement ID** | Identifier for the context/location where user interaction occurs (e.g., 'presale-widget') |
| **OpenTelemetry** | Vendor-neutral observability framework for collecting traces, metrics, and logs |
| **Span** | Unit of work in distributed tracing with start time, end time, and operation metadata |
| **Trace ID** | Unique identifier for a request as it flows through multiple services |
| **Span Context** | Data structure containing trace ID, span ID, and flags for propagation across process boundaries |
| **Producer** | Kafka client that publishes messages to topics |
| **Consumer** | Kafka client that subscribes to topics and processes messages |
| **Partition** | Ordered, immutable sequence of Kafka messages within a topic |
| **Offset** | Unique identifier for a message position within a Kafka partition |
| **Consumer Group** | Set of consumers sharing workload by processing different partitions |
| **Dead Letter Queue** | SQS queue for messages that repeatedly fail processing |
| **Exponential Backoff** | Retry strategy increasing delay between attempts (e.g., 250ms, 750ms, 2000ms) |
| **Circuit Breaker** | Pattern that stops sending requests to failing service to allow recovery |
| **Connection Pool** | Reusable set of database/broker connections to avoid reconnection overhead |
| **Read Replica** | Read-only database instance for load distribution (eventually consistent) |
| **Strong Consistency** | Guarantee that reads reflect all previous writes (via primary database) |
| **Eventual Consistency** | Guarantee that reads will eventually reflect writes after replication delay (via replicas) |
| **Idempotency** | Property that operation produces same result when executed multiple times |
| **Base64** | Encoding scheme for binary data in text format (used for SNS binary attributes) |
| **E.164** | International phone number format standard (+{country_code}{number}) |
| **Title Case** | Capitalization style where first letter of each word is uppercase (e.g., John O'Connor) |
| **Sanitization** | Process of removing unsafe characters from user input |
| **Normalization** | Process of converting data to standardized format |
| **Deduplication** | Process of identifying and removing duplicate records |

## Data Models

### Kafka Message Structure
```typescript
{
  key: string;           // Partition key (e.g., userId) for routing
  value: object;         // Event payload (encoded via Avro schema)
  // Example value:
  // {
  //   userId: "12345",
  //   artistId: "artist-789",
  //   verifiedAt: "2026-02-13T10:30:00Z",
  //   verificationMethod: "spotify-listening",
  //   status: "verified"
  // }
}
```

### SNS Message Structure
```typescript
{
  message: object | string;           // Message body (JSON or string)
  messageAttributes: Array<{          // Optional metadata for filtering
    name: string;
    value: string | number | Buffer;
  }>;
  messageGroupId?: string;            // Required for FIFO topics
  messageDeduplicationId?: string;    // Required for FIFO topics
}
```

### SQS Message Structure
```typescript
{
  data: object | string;              // Message body (JSON or string)
  delaySeconds?: number;              // Delay before message visible (0-900)
  messageAttributes?: object;         // Optional metadata
  messageGroupId?: string;            // Required for FIFO queues
  messageDeduplicationId?: string;    // Required for FIFO queues
}
```

### Normalized User Name
```typescript
{
  full: string;              // "John O'Connor"
  first: string;             // "John"
  last: string;              // "O'Connor"
  lowercase?: {              // Optional lowercase versions
    first: string;           // "john"
    last: string;            // "o'connor"
  }
}
```

### Redis Cache Entry
```typescript
{
  key: string;               // Cache key (e.g., "user:12345")
  value: object | string;    // Cached data (serialized as JSON)
  ttl: number;               // Time-to-live in seconds
  newOnly: boolean;          // Only set if key doesn't exist (NX flag)
}
```

### JWT Token Structure
```typescript
{
  userId: string;                     // User identifier
  email: string;                      // User email
  permissions: string[];              // Permission scopes (e.g., ["read:profile", "write:preferences"])
  iat: number;                        // Issued at timestamp
  exp: number;                        // Expiration timestamp
}
```

### OpenTelemetry Trace Context
```typescript
{
  traceId: string;           // Unique identifier for request flow (16 bytes hex)
  spanId: string;            // Unique identifier for this span (8 bytes hex)
  traceFlags: number;        // Sampling flags (1 = sampled)
  attributes: {              // Span metadata
    "service.name": string;
    "service.namespace": string;
    "tm.product_code": string;
    "tm.env": string;
    "aws.region": string;
    "http.method": string;
    "http.url": string;
    "db.system": string;
    "db.operation": string;
  };
}
```

### TM Accounts User Info (ACOE Response)
```typescript
{
  tmuo: string;              // Ticketmaster Unified ID (e.g., "tmuo_us_12345")
  email: string;             // User email
  firstName: string;         // User first name
  lastName: string;          // User last name
  address: {                 // User address
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  phone: string;             // User phone in E.164 format
  createdAt: string;         // Account creation timestamp
}
```

### Spotify User Profile (Normalized)
```typescript
{
  id: string;                // Spotify user ID
  displayName: string;       // User display name
  email: string;             // User email
  country: string;           // User country code
  product: string;           // Subscription tier ("free", "premium")
  images: Array<{            // Profile images
    url: string;
    width: number;
    height: number;
  }>;
}
```

### Spotify Saved Track (Normalized)
```typescript
{
  id: string;                // Track ID
  name: string;              // Track name
  artists: Array<{           // Track artists
    id: string;
    name: string;
  }>;
  album: {                   // Album information
    id: string;
    name: string;
    releaseDate: string;
  };
  addedAt: string;           // Timestamp when track was saved
}
```

### AWS S3 Presigned URL Parameters
```typescript
{
  bucket: string;            // S3 bucket name
  key: string;               // Object key (path)
  expiresIn: number;         // Expiration time in seconds (default: 3600)
  operation: string;         // Operation type ("getObject", "putObject")
}
```

### DynamoDB Item Structure (Flexible)
```typescript
{
  [key: string]: any;        // Key-value pairs (attributes)
  // Example:
  // {
  //   userId: "12345",       // Partition key
  //   timestamp: 1676280000, // Sort key
  //   status: "verified",
  //   metadata: { ... }
  // }
}
```

### MongoDB Document (Flexible)
```typescript
{
  _id: string | ObjectId;    // Document identifier
  [key: string]: any;        // Flexible schema
  // Example:
  // {
  //   _id: "507f1f77bcf86cd799439011",
  //   userId: "12345",
  //   email: "user@example.com",
  //   profile: { ... },
  //   createdAt: ISODate("2026-02-13T10:30:00Z")
  // }
}
```

### CloudWatch Metric Data
```typescript
{
  namespace: string;         // Metric namespace (e.g., "VerifiedFan")
  metricName: string;        // Metric name (e.g., "VerificationsCompleted")
  value: number;             // Metric value
  unit: string;              // Unit (e.g., "Count", "Milliseconds")
  timestamp?: Date;          // Timestamp (default: current time)
  dimensions?: Array<{       // Metric dimensions for filtering
    name: string;
    value: string;
  }>;
}
```

### Structured Log Entry
```typescript
{
  timestamp: string;         // ISO 8601 timestamp
  level: string;             // Log level ("debug", "info", "warn", "error")
  serviceName: string;       // Service identifier
  message: string;           // Human-readable message
  metadata?: {               // Additional context
    userId?: string;
    requestId?: string;
    duration?: number;
    errorCode?: string;
    [key: string]: any;
  };
}
```

### Retry Policy Configuration
```typescript
{
  retries: number;           // Maximum retry attempts (default: 3)
  factor: number;            // Backoff multiplier (default: 3)
  minTimeout: number;        // Minimum delay in ms (default: 250)
  maxTimeout: number;        // Maximum delay in ms (default: 2000)
  randomize: boolean;        // Add jitter to delays (default: false)
}
```

### Package Dependency Graph
```
@verifiedfan/kafka          → @verifiedfan/map-utils
@verifiedfan/aws            → @verifiedfan/log, @verifiedfan/delay, @verifiedfan/string-utils
@verifiedfan/spotify        → @verifiedfan/request, @verifiedfan/date, @verifiedfan/log
@verifiedfan/tm-accounts    → @verifiedfan/request
@verifiedfan/facebook       → @verifiedfan/normalizers
@verifiedfan/cucumber-features → @verifiedfan/kafka, @verifiedfan/mongodb, @verifiedfan/redis, @verifiedfan/aws
```

### TM Accounts Service Structure
```typescript
{
  auum: {                    // Account User Management
    createSingleUser(userData);
    generateAccessToken(credentials);
  };
  acoe: {                    // Account Consumer Experience
    getUserInfo(tmuo);
  };
  arai: {                    // Account Reporting Analytics Intelligence
    getUserActivity(tmuo);
  };
}
```

### Data Flow: Fan Verification Event
```
User Action
  ↓
[Spotify OAuth] → Access Token
  ↓
[@verifiedfan/spotify] → getTopArtists(token)
  ↓
[Spotify API] → Raw JSON Response
  ↓
[@verifiedfan/spotify/normalizers] → Normalized Artist Array
  ↓
[Business Logic] → Verification Decision (verified/rejected)
  ↓
[@verifiedfan/kafka] → Encode with Schema
  ↓
[Schema Registry] → Validate Structure
  ↓
[Kafka Topic] → fan.verified Event Published
  ↓
[Downstream Consumers] → Analytics, Campaign, Reporting
  ↓
[User Outcome] → Presale Access Granted
```

### Relationship: Package → Dependencies → Infrastructure
```
Package Layer:
  @verifiedfan/spotify, @verifiedfan/kafka, @verifiedfan/aws
    ↓ (depends on)
Utility Layer:
  @verifiedfan/normalizers, @verifiedfan/log, @verifiedfan/request
    ↓ (interacts with)
Infrastructure Layer:
  Spotify API, Kafka Brokers, AWS Services (S3, DynamoDB, SNS, SQS)
```
