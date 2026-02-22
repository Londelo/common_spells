# Use Cases & Workflows - vf-lib

## Primary Use Cases

### Use Case 1: Verify Fan Music Listening History

**Actor**: Verification Service (microservice)

**Goal**: Validate that a user is a genuine fan of an artist by analyzing their Spotify or Apple Music listening history

**Preconditions**:
- User has granted OAuth permission to access their music streaming account
- Service has valid access token for the music platform API
- Service has imported `@verifiedfan/spotify` or `@verifiedfan/apple-music` package

**Main Flow**:
1. Service calls `spotify.getUser(accessToken)` to fetch user profile and validate token
2. Service calls `spotify.getSavedTracks(accessToken)` and `spotify.getTopArtists(accessToken)` to retrieve listening data
3. Library makes authenticated HTTPS requests to Spotify API with retry logic and rate limiting
4. Library normalizes API response into consistent format using built-in normalizers
5. Service receives standardized fan engagement data (top artists, saved tracks, listening frequency)
6. Service applies business logic to determine if user meets verification criteria (e.g., artist in top 10, >50 saved tracks)

**Postconditions**:
- User's fan status is determined based on objective listening data
- All API calls are logged with structured metadata for audit trail

**Business Rules Applied**:
- Automatic token refresh if access token expires during request
- Retry failed API calls up to 3 times with exponential backoff
- Return normalized data structures regardless of source platform (Spotify vs Apple Music)

---

### Use Case 2: Publish Fan Verification Event to Event Stream

**Actor**: Verification Service (microservice)

**Goal**: Notify downstream systems that a user has completed fan verification

**Preconditions**:
- Kafka broker connection details configured
- Schema Registry URL provided
- Event schema registered in Schema Registry
- Service has imported `@verifiedfan/kafka` package

**Main Flow**:
1. Service creates verification event payload: `{ userId, artistId, verifiedAt, verificationMethod, status: 'verified' }`
2. Service calls `kafka.sendMessages([{ key: userId, value: eventPayload }])`
3. Library retrieves latest schema ID from Confluent Schema Registry
4. Library encodes message value against schema (validates structure, serializes to Avro)
5. Library sends encoded message to Kafka topic with partition key based on userId
6. Kafka acknowledges successful write
7. Library returns metadata (partition, offset, timestamp) to service

**Postconditions**:
- Event is durably stored in Kafka topic with schema validation
- Downstream services (analytics, campaign triggers, reporting) receive event notification
- Event can be replayed for audit or recovery purposes

**Business Rules Applied**:
- Producer must reconnect automatically if connection is lost (retry up to 3 times)
- FIFO topic messages must include message deduplication ID to prevent duplicates
- All events must conform to registered schema version (backward/forward compatibility enforced)

---

### Use Case 3: Cache User Profile Data in Redis

**Actor**: User Service (microservice)

**Goal**: Store frequently accessed user profile data in cache to reduce database load and improve response times

**Preconditions**:
- Redis cluster URL configured (primary and optional read replica)
- Service has imported `@verifiedfan/redis` package
- User profile exists in source database

**Main Flow**:
1. Service receives request for user profile by userId
2. Service calls `redis.get({ key: 'user:12345', usePrimary: false })` to check cache
3. If cache hit: Library returns parsed JSON object, service responds immediately (cache hit path)
4. If cache miss: Service fetches from database, then calls `redis.set({ key: 'user:12345', value: userProfile, ttl: 3600, newOnly: false })` to populate cache
5. Library serializes value to JSON, sets TTL (1 hour), writes to Redis primary
6. Subsequent requests for same user read from cache (fast path)

**Postconditions**:
- User profile data available in cache for 1 hour
- Database query load reduced by ~90% for hot profiles
- Read operations routed to read replica for load distribution

**Business Rules Applied**:
- Reads can use read replica for eventually consistent data (`usePrimary: false`)
- Writes always go to primary for strong consistency
- TTL must be set on all cached values to prevent stale data
- Library must reconnect automatically on connection failures (retry logic)
- Values stored as JSON strings for cross-language compatibility

---

### Use Case 4: Normalize User Registration Input

**Actor**: Registration Service (microservice)

**Goal**: Clean and standardize user-submitted registration data (name, email, phone) before database storage

**Preconditions**:
- Service has imported `@verifiedfan/normalizers` package
- User has submitted registration form with raw input

**Main Flow**:
1. Service receives registration payload: `{ firstName: ' JOHN ', lastName: 'O\'Connor', email: ' User@Example.COM ', phone: '5551234567' }`
2. Service calls normalizers:
   - `normalizers.email(email)` → `'user@example.com'` (trimmed, lowercased)
   - `normalizers.nameObj(firstName, lastName)` → `{ full: 'John O\'Connor', first: 'John', last: 'O\'Connor' }` (title case, accents preserved)
   - `normalizers.phone(phone)` → `'+15551234567'` (E.164 international format)
3. Service validates normalized outputs are not null (null indicates invalid input)
4. Service stores normalized values in database with consistent formatting
5. Service returns success response with cleaned data

**Postconditions**:
- All user data stored in consistent format across database
- Email lookups are case-insensitive (all lowercase)
- Phone numbers are in international format for SMS delivery
- Names handle special characters and accents correctly

**Business Rules Applied**:
- Email must be trimmed and lowercased for deduplication
- Phone must include country code prefix (default +1 for US)
- Name must preserve accents and special characters but remove unsafe content
- Invalid inputs return `null` (never throw exceptions)
- Minimum phone length is 7 digits

---

### Use Case 5: Query Ticketmaster User Account Information

**Actor**: Fan Engagement Service (microservice)

**Goal**: Retrieve user profile and activity data from Ticketmaster Accounts system (ACOE/ARAI)

**Preconditions**:
- Service has imported `@verifiedfan/tm-accounts` package
- TM Accounts API credentials configured (client ID, client secret)
- User has a Ticketmaster account (TMUO identifier)

**Main Flow**:
1. Service initializes TM Accounts client: `tmAccounts = TmAccounts({ env: 'prod', integratorId: 'verifiedfan', auum: { clientId, clientSecret }, acoe: { clientId }, arai: { username, password } })`
2. Service calls `tmAccounts.getUserInfo({ tmuo: 'tmuo_123456' })` to fetch user profile from ACOE
3. Library constructs authenticated request with OAuth credentials, region routing
4. Library makes HTTPS request to TM Accounts API with retry logic
5. Library returns normalized user profile (email, name, address, purchase history)
6. Service calls `tmAccounts.getUserActivity({ tmuo: 'tmuo_123456' })` to fetch activity from ARAI
7. Library returns user activity data (event attendance, ticket purchases, preferences)

**Postconditions**:
- Service has complete user profile and activity data from Ticketmaster systems
- All API calls authenticated with service credentials
- User data available for personalization, targeting, or verification

**Business Rules Applied**:
- Automatic region routing based on TMUO prefix (US, EU, APAC)
- OAuth token generation and refresh handled automatically
- Failed requests retry up to 3 times with exponential backoff
- Rate limiting respected via backoff on 429 responses

---

### Use Case 6: Send CloudWatch Logs and Metrics

**Actor**: Any Verified Fan microservice

**Goal**: Emit structured logs and custom metrics for operational visibility

**Preconditions**:
- Service has imported `@verifiedfan/log` and `@verifiedfan/aws` packages
- CloudWatch Logs group and metrics namespace configured
- AWS credentials available via IAM role or environment

**Main Flow**:
1. Service initializes logger: `log = Log({ level: 'info', serviceName: 'verification-service' })`
2. During operation, service calls `log.info('User verified', { userId, artistId, duration: 1234 })`
3. Library formats log entry as JSON with timestamp, level, message, metadata
4. Library writes to stdout (captured by CloudWatch Logs agent)
5. Service records custom metric: `cloudwatch = AWS.CloudWatch({ region: 'us-east-1' })` then `cloudwatch.putMetrics({ namespace: 'VerifiedFan', metricName: 'VerificationsCompleted', value: 1, dimensions: { Artist: artistId } })`
6. Library sends metric to CloudWatch Metrics API

**Postconditions**:
- All application logs centralized in CloudWatch Logs for querying
- Custom business metrics available in CloudWatch dashboards
- Logs include structured metadata for filtering and alerting

**Business Rules Applied**:
- Log level controls verbosity (debug/info/warn/error)
- Structured JSON format enables log parsing and aggregation
- Metrics include dimensions for filtering (environment, service, artist)
- Async logging to avoid blocking application threads

---

### Use Case 7: Generate and Validate JWT Tokens

**Actor**: Authentication Service (microservice)

**Goal**: Issue JWT tokens for authenticated users and validate tokens on protected endpoints

**Preconditions**:
- Service has imported `@verifiedfan/jwt` package
- Signing secret configured securely
- User has authenticated via username/password or OAuth

**Main Flow**:
1. User authenticates successfully with credentials
2. Service calls `jwt.MakeToken({ userId, email, permissions: ['read:profile', 'write:preferences'], expiresIn: '24h' })`
3. Library signs JWT payload with secret, includes expiration timestamp
4. Service returns JWT token to client in response header
5. Client includes token in Authorization header for subsequent requests
6. Service calls `jwt.ReadToken(token)` to extract and validate claims
7. Library verifies signature, checks expiration, decodes payload
8. If valid, service allows request to proceed with user context
9. If invalid/expired, service returns 401 Unauthorized

**Postconditions**:
- User has valid session token for 24 hours
- All requests include verified user identity and permissions
- Expired tokens are rejected automatically

**Business Rules Applied**:
- Token expiration enforced at validation time (no expired tokens accepted)
- Signature verification prevents token tampering
- Permissions encoded in token for stateless authorization
- Worker authentication supported for service-to-service calls

---

### Use Case 8: Execute Integration Tests with Cucumber

**Actor**: CI/CD Pipeline or Developer

**Goal**: Run end-to-end integration tests against deployed services using reusable test utilities

**Preconditions**:
- Test suite has imported `@verifiedfan/cucumber-features` package
- Test environment deployed with real dependencies (Kafka, MongoDB, Redis, AWS)
- Feature files written in Gherkin syntax

**Main Flow**:
1. Cucumber loads feature files (e.g., `user-verification.feature`)
2. Step definitions import helpers from `@verifiedfan/cucumber-features`
3. Test setup calls `cucumber.setupKafka()`, `cucumber.setupMongoDB()`, `cucumber.setupRedis()` to initialize test clients
4. Test step sends test event: `await cucumber.sendKafkaMessage(topic, eventPayload)`
5. Test step waits for event processing: `await cucumber.waitForMongoRecord({ collection: 'users', query: { userId } })`
6. Test step validates result: `expect(result).to.matchSchema(userSchema)`
7. Test teardown cleans up test data: `await cucumber.cleanupMongoDB()`

**Postconditions**:
- Integration tests validate end-to-end workflows across services
- Test data isolated and cleaned up after each scenario
- Schema validation ensures API contract compliance

**Business Rules Applied**:
- Tests run against real infrastructure (not mocks) for confidence
- Test data must be cleaned up to prevent pollution
- Assertions use Chai matchers for clear failure messages
- Async operations have timeouts to prevent hanging tests

## User Journey Map

**Developer Integration Journey**:
1. Developer identifies need for common capability (e.g., "need to send Kafka events")
2. Developer searches internal NPM registry or README for relevant package (`@verifiedfan/kafka`)
3. Developer adds package to service `package.json` dependencies
4. Developer runs `npm install` to fetch and symlink via Lerna
5. Developer reads package source or tests to understand API
6. Developer imports package and configures with environment-specific parameters
7. Developer implements business logic using library abstractions
8. Developer runs unit tests with library's test utilities
9. Developer commits code, CI/CD publishes new service version
10. Service runs in production with library handling infrastructure complexity

## Key Workflows

### Workflow 1: Event-Driven Fan Verification

1. **User authenticates**: Frontend redirects to Spotify OAuth → user grants permission → callback returns access token
2. **Service verifies listening**: Service calls `@verifiedfan/spotify` to fetch user's top artists and saved tracks → library normalizes data
3. **Service evaluates criteria**: Business logic checks if target artist is in top 10 artists or user has >50 saved tracks
4. **Service publishes event**: Service uses `@verifiedfan/kafka` to publish `fan.verified` event with user ID, artist ID, verification method
5. **Downstream systems react**:
   - Analytics service consumes event → updates fan metrics dashboard
   - Campaign service consumes event → triggers email with presale code
   - Reporting service consumes event → logs verification for compliance
6. **User receives presale access**: Email delivered via SFMC integration, user can purchase tickets

---

### Workflow 2: User Registration with Data Normalization

1. **User submits form**: Frontend posts registration data (name, email, phone, address) to API
2. **Service normalizes input**: Service uses `@verifiedfan/normalizers` to clean and standardize all fields
3. **Service validates format**: Service checks that normalized values are not null (invalid inputs)
4. **Service checks duplicates**: Service queries MongoDB using normalized email (lowercase) to check existing account
5. **Service creates user**: Service writes normalized user record to database
6. **Service caches profile**: Service uses `@verifiedfan/redis` to cache user profile for fast lookups
7. **Service sends confirmation**: Service triggers email via SFMC with verification link
8. **User verifies email**: User clicks link, service marks email as verified in database

---

### Workflow 3: Distributed Tracing for Debugging

1. **Request enters system**: API gateway receives user request, generates trace ID
2. **Service starts trace**: Service calls `@verifiedfan/tracing` to create root span with operation name
3. **Service calls dependency**: Service makes database query → library creates child span for MongoDB operation
4. **Service calls external API**: Service calls Spotify API → library creates child span for HTTP request
5. **Service publishes event**: Service sends Kafka message → library creates child span for message publish
6. **Spans exported**: All spans sent to OpenTelemetry Collector → forwarded to Splunk
7. **Developer views trace**: Developer queries Splunk by trace ID → sees complete request flow with timing
8. **Issue diagnosed**: Developer identifies slow database query causing latency spike

---

### Workflow 4: AWS Resource Operations

1. **Service needs file storage**: Service initializes `@verifiedfan/aws` S3 client with bucket name
2. **Service uploads file**: Service calls `s3.putObject({ key: 'users/report.csv', body: csvData })` → library streams data to S3
3. **Service generates presigned URL**: Service calls `s3.getPresignedUrl({ key: 'users/report.csv', expiresIn: 3600 })` → library returns temporary download URL
4. **Service shares URL**: URL included in email to user → user downloads report directly from S3
5. **Service stores metadata**: Service uses `@verifiedfan/aws` DynamoDB client to write file metadata (key, size, timestamp)
6. **Service triggers processing**: Service invokes Lambda function via `lambda.invoke()` to process uploaded file
7. **Service tracks progress**: Service updates Step Functions state machine via `stepFunctions.sendTaskSuccess()` to mark workflow step complete

## Example Scenarios

**Scenario 1: High-Volume Presale Verification**
- Campaign launches for popular artist → 50,000 fans attempt verification simultaneously
- Services use `@verifiedfan/redis` for fast user profile lookups (cache hit rate >90%)
- Services use `@verifiedfan/spotify` with connection pooling to handle API rate limits
- Services use `@verifiedfan/kafka` to publish verification events → downstream systems consume at their own pace
- Result: All verifications complete within 10 minutes with no service degradation

**Scenario 2: International User Registration**
- User in France registers with French address, EU phone number, accented name
- Service uses `@verifiedfan/normalizers` to handle international phone format (+33...) and accented characters (François)
- Service uses `@verifiedfan/tm-accounts` with automatic region routing to TMUO EU endpoints
- Result: User profile created correctly, routed to appropriate regional systems

**Scenario 3: Production Incident Investigation**
- PagerDuty alert fires for elevated error rate in verification service
- SRE queries CloudWatch Logs using structured log metadata (serviceName, errorCode)
- SRE identifies failing Spotify API calls with 401 errors
- SRE checks distributed traces in Splunk → sees token refresh logic failing
- Root cause: Spotify client ID rotated, environment variable not updated
- Fix: Update client ID in Secrets Manager, redeploy service
- Result: Service recovers within 15 minutes, incident postmortem references trace IDs

**Scenario 4: Schema Evolution for Event**
- Product adds new field to `fan.verified` event schema: `verificationScore` (numeric confidence rating)
- Team registers new schema version in Confluent Schema Registry with BACKWARD compatibility
- Producers upgrade `@verifiedfan/kafka` package → start including `verificationScore` in events
- Old consumers continue working (ignore new field)
- New consumers upgrade → start reading `verificationScore` for enhanced analytics
- Result: Zero-downtime schema migration across 12 consuming services
