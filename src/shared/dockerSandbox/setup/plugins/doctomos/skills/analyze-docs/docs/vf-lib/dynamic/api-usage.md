# API Usage - vf-lib

This document provides practical examples and usage patterns for the VerifiedFan library APIs.

---

## Installation

```bash
# Install main library
npm install @verifiedfan/lib

# Or install individual packages
npm install @verifiedfan/aws
npm install @verifiedfan/kafka
npm install @verifiedfan/log
```

---

## AWS Services

### S3 Usage

```javascript
import { aws } from '@verifiedfan/lib';

// Create S3 client
const s3 = aws.S3({
  bucketName: 'my-bucket',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Upload a file
const result = await s3.uploadFile({
  filePath: '/path/to/file.jpg',
  contentType: 'image/jpeg',
  fileKey: 'uploads/file.jpg',
  cacheControl: 3600,
  acl: 'public-read'
});
console.log(result.url); // https://s3.amazonaws.com/my-bucket/uploads/file.jpg

// Upload base64 image
await s3.uploadBase64Image({
  base64: 'data:image/png;base64,iVBORw0KG...',
  contentType: 'image/png',
  fileKey: 'images/photo.png',
  cacheControl: 86400
});

// Get object
const content = await s3.getObject('path/to/file.txt');

// Generate signed URL
const signedUrl = await s3.generateSignedUrl({
  fileKey: 'private/document.pdf',
  ttlSecs: 3600
});

// List objects with pagination
const { Contents, NextContinuationToken } = await s3.listObjects({
  prefix: 'uploads/',
  continuationToken: previousToken
});

// Delete multiple objects
await s3.deleteObjects(['file1.txt', 'file2.txt', 'file3.txt']);
```

### DynamoDB Usage

```javascript
import { aws } from '@verifiedfan/lib';

// Create DynamoDB client
const dynamodb = aws.DynamoDB({
  tableName: 'users',
  region: 'us-east-1'
});

// Put item
await dynamodb.put({
  data: {
    userId: '123',
    email: 'user@example.com',
    name: 'John Doe'
  }
});

// Put with condition
await dynamodb.put({
  data: { userId: '456', email: 'test@example.com' },
  conditionExpression: 'attribute_not_exists(userId)'
});

// Get item
const { Item } = await dynamodb.get({
  key: { userId: '123' }
});

// Get many items
const items = await dynamodb.getMany([
  { userId: '123' },
  { userId: '456' },
  { userId: '789' }
]);

// Query with key condition
const { Items, LastEvaluatedKey } = await dynamodb.query({
  keyConditionExpression: 'userId = :userId',
  expressionAttributeValues: { ':userId': '123' },
  indexName: 'email-index',
  limit: 10
});

// Update item
await dynamodb.update({
  key: { userId: '123' },
  updateExpression: 'SET #name = :name, updatedAt = :now',
  expressionAttributeNames: { '#name': 'name' },
  values: {
    ':name': 'Jane Doe',
    ':now': Date.now()
  }
});

// Update many items
const result = await dynamodb.updateMany([
  {
    key: { userId: '123' },
    updateExpression: 'SET lastLogin = :now',
    values: { ':now': Date.now() }
  },
  {
    key: { userId: '456' },
    updateExpression: 'SET lastLogin = :now',
    values: { ':now': Date.now() }
  }
]);

// Check for unprocessed items
if (result.UnprocessedItems.length > 0) {
  console.log('Failed updates:', result.UnprocessedItems);
}

// Delete item
await dynamodb.delete({
  key: { userId: '123' },
  returnValues: 'ALL_OLD'
});

// Batch operations
await dynamodb.putMany([
  { userId: '100', name: 'User 1' },
  { userId: '101', name: 'User 2' },
  { userId: '102', name: 'User 3' }
]);

await dynamodb.deleteMany([
  { userId: '100' },
  { userId: '101' }
]);
```

### Other AWS Services

```javascript
import { aws } from '@verifiedfan/lib';

// Kinesis
const kinesis = aws.Kinesis({ streamName: 'my-stream', region: 'us-east-1' });
await kinesis.putRecord({ data: { event: 'user.created' }, partitionKey: 'user-123' });

// SQS
const sqs = aws.SQS({ queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue' });
await sqs.sendMessage({ messageBody: JSON.stringify({ data: 'test' }) });

// SNS
const sns = aws.SNS({ region: 'us-east-1' });
await sns.publish({
  topicArn: 'arn:aws:sns:us-east-1:123456789:my-topic',
  message: 'Hello SNS'
});

// Secrets Manager
const secretsManager = aws.SecretsManager({ region: 'us-east-1' });
const secret = await secretsManager.getSecretValue({ secretId: 'my-secret' });
```

---

## Kafka

### Basic Usage

```javascript
import Kafka from '@verifiedfan/kafka';

// Create Kafka producer
const producer = Kafka({
  registryUrl: 'https://schema-registry.example.com',
  clientId: 'my-service',
  brokers: ['kafka-1:9092', 'kafka-2:9092'],
  topic: 'events',
  retry: {
    retries: 5,
    factor: 2
  }
});

// Send messages
await producer.sendMessages([
  {
    key: 'user-123',
    value: { event: 'user.created', userId: '123', timestamp: Date.now() }
  },
  {
    key: 'user-456',
    value: { event: 'user.updated', userId: '456', timestamp: Date.now() }
  }
]);

// Clean up
await producer.disconnect();
```

### With Custom Formatter

```javascript
import Kafka, { jsonFormat } from '@verifiedfan/kafka';

const producer = Kafka({
  registryUrl: 'https://schema-registry.example.com',
  clientId: 'my-service',
  brokers: ['kafka:9092'],
  topic: 'events',
  formatter: jsonFormat // Use JSON instead of Avro
});

await producer.sendMessages([
  { value: { type: 'test', data: 'hello' } }
]);
```

### With SSL

```javascript
const producer = Kafka({
  registryUrl: 'https://schema-registry.example.com',
  clientId: 'my-service',
  brokers: ['kafka:9093'],
  topic: 'events',
  ssl: {
    ca: fs.readFileSync('./ca-cert.pem', 'utf-8'),
    cert: fs.readFileSync('./client-cert.pem', 'utf-8'),
    key: fs.readFileSync('./client-key.pem', 'utf-8'),
    rejectUnauthorized: true
  }
});
```

### Schema Registry

```javascript
// Register schema
await producer.registerSchema({
  type: 'AVRO',
  subject: 'events-value',
  schema: {
    type: 'record',
    name: 'Event',
    fields: [
      { name: 'userId', type: 'string' },
      { name: 'event', type: 'string' },
      { name: 'timestamp', type: 'long' }
    ]
  }
});

// Decode message
const decoded = await producer.decode(messageBuffer);
```

---

## MongoDB

```javascript
import { Mongo } from '@verifiedfan/lib';

// Create MongoDB connection
const mongo = Mongo({
  config: {
    port: 27017,
    hostUrls: ['mongo-1.example.com', 'mongo-2.example.com'],
    username: 'admin',
    password: process.env.MONGO_PASSWORD,
    options: {
      replicaSet: 'rs0',
      dbName: 'myapp',
      authSource: 'admin',
      readPreference: 'secondaryPreferred'
    }
  }
});

// Ensure connected
await mongo.throwIfNotConnected();

// Get collection
const users = mongo.Collection('users');

// Insert
await users.insertOne({ name: 'John', email: 'john@example.com' });

// Find
const user = await users.findOne({ email: 'john@example.com' });

// Update
await users.updateOne(
  { email: 'john@example.com' },
  { $set: { lastLogin: new Date() } }
);

// Create indexes
const indexCreator = mongo.CreateIndexes();
await indexCreator.createIndex('users', { email: 1 }, { unique: true });

// Close connection
await mongo.closeDb();
```

---

## Redis

```javascript
import Redis from '@verifiedfan/redis';

// Create Redis client
const redis = Redis({
  url: 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  database: 0
});

// With read replica
const redisWithReplica = Redis({
  url: 'redis://primary:6379',
  readOnlyUrl: 'redis://replica:6379'
});

// Set value
await redis.set({
  key: 'user:123',
  value: { name: 'John', email: 'john@example.com' },
  ttl: 3600, // 1 hour
  newOnly: false
});

// Get value
const user = await redis.get({ key: 'user:123' });

// Get from primary
const freshUser = await redis.get({ key: 'user:123', usePrimary: true });

// Get multiple values
const users = await redis.mget({
  keys: ['user:123', 'user:456', 'user:789']
});

// Delete
await redis.delete({ key: 'user:123' });

// Event listeners
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Connected to Redis'));
redis.on('ready', () => console.log('Redis ready'));

// Close connection
await redis.quit();
```

---

## HTTP Requests

```javascript
import { Request } from '@verifiedfan/lib';

// Basic request
const response = await Request({
  serviceName: 'user-service',
  baseUrl: 'https://api.example.com',
  endpoint: '/users/123',
  accessPath: 'data',
  method: 'GET',
  correlation: { requestId: 'req-123' }
});

console.log(response.statusCode); // 200
console.log(response.body); // Parsed JSON

// POST request
await Request({
  serviceName: 'user-service',
  baseUrl: 'https://api.example.com',
  endpoint: '/users',
  accessPath: 'data',
  method: 'POST',
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request with JWT
import { RequestWithJWT } from '@verifiedfan/request';

const response = await RequestWithJWT({
  serviceName: 'protected-service',
  baseUrl: 'https://api.example.com',
  endpoint: '/protected-resource',
  accessPath: 'data',
  jwt: 'eyJhbGciOiJIUzI1NiIs...'
});
```

### Automatic Retry

The request client automatically retries on 5xx errors:
- 3 retries
- Exponential backoff (factor: 2)
- Minimum timeout: 1000ms

Non-5xx errors (4xx) are not retried and will throw immediately.

---

## Logging

```javascript
import { Log } from '@verifiedfan/lib';

// Create logger factory
const createLogger = Log({
  level: 'info',
  depth: 8,
  secretKeys: ['password', 'token', 'secret'],
  console: {
    colorize: true,
    timestamp: true
  }
});

// Create logger for module
const log = createLogger('my-app/services/users');

// Log messages
log.info('User created', { userId: '123', email: 'user@example.com' });
log.warn('Rate limit approaching', { remaining: 10, limit: 100 });
log.error('Database connection failed', { error: err.message, retries: 3 });

// Sensitive data is automatically sanitized
log.info('User authenticated', {
  userId: '123',
  password: 'secret123' // Will be sanitized in logs
});

// Debug logs (only if level is 'debug' or lower)
log.debug('Detailed operation info', { operation: 'find', query: { userId: '123' } });
```

---

## JWT

```javascript
import { jwt } from '@verifiedfan/lib';

// Create token
const token = jwt.MakeToken(
  { userId: '123', email: 'user@example.com' },
  { expiresIn: '24h', algorithm: 'HS256' }
);

// Verify token
const payload = jwt.Verify(token, process.env.JWT_SECRET);
console.log(payload.userId); // '123'

// Read token (without verification)
const decoded = jwt.ReadToken(token);

// Sign custom payload
const signature = jwt.SignPayload(
  { data: 'important' },
  process.env.SECRET_KEY
);
```

---

## Date Utilities

```javascript
import { date } from '@verifiedfan/lib';

// Current time
const now = date.now(); // 1708000000000

// Parse date string
const timestamp = date.parse('2024-01-15T12:00:00Z');

// Convert to seconds
const seconds = date.toSeconds(); // Current time in seconds
const secondsFromMillis = date.toSecondsFromMillis(1708000000000);

// Convert to ISO string
const isoString = date.toISOString(1708000000000);
// '2024-02-15T10:13:20.000Z'

// Time calculations
const yesterdayTimestamp = date.yesterday();
const tomorrowTimestamp = date.tomorrow();

// Check TTL
const isExpired = date.IsNotWithinTTL(3600000)(createdAt); // 1 hour TTL

// Time constants
const { SECOND, MINUTE, HOUR, DAY, WEEK } = date.timeInMilliseconds;
const ttl = 7 * DAY; // 1 week in milliseconds
```

---

## Normalizers

```javascript
import { normalizers } from '@verifiedfan/lib';

// Email normalization
const email = normalizers.email('  User@Example.COM  ');
// 'user@example.com'

// Phone normalization
const phone = normalizers.phone('+1 (555) 123-4567');
// '+15551234567'

const phone2 = normalizers.phone('555-123-4567');
// '+15551234567'

// Name normalization
const fullName = normalizers.name('  JOHN   DOE  ');
// 'John Doe'

const nameObj = normalizers.nameObj('john', 'doe', true);
// { full: 'John Doe', first: 'John', last: 'Doe', lowercase: { first: 'john', last: 'doe' } }

const parts = normalizers.splitNameParts('Doe, John Michael');
// ['John', 'Michael', 'Doe']

// String transformations
const title = normalizers.titleCase('hello world');
// 'Hello World'

const urlSafe = normalizers.urlSafe('Hello World!@#');
// 'HelloWorld'

// Boolean normalization
normalizers.boolean(1); // true
normalizers.boolean('yes'); // true
normalizers.boolean(0); // false
normalizers.boolean('no'); // false
normalizers.boolean('invalid'); // null
```

---

## Crypto

```javascript
import { crypto } from '@verifiedfan/lib';

// Generate unique ID
const id = crypto.simpleUniqueId(); // 24 chars hex
const shortId = crypto.simpleUniqueId(12); // 12 chars hex

// Generate UUID
const uuid = crypto.uuid(); // 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

// X509 Certificate
const certPem = fs.readFileSync('./cert.pem');
const cert = crypto.X509Certificate(certPem);
console.log(cert.subject);
console.log(cert.issuer);
console.log(cert.validFrom);
console.log(cert.validTo);
```

---

## Middlewares (Express/Fastify)

```javascript
import express from 'express';
import { middlewares } from '@verifiedfan/lib';

const app = express();

// Correlation ID middleware
app.use(middlewares.Correlation());

// JWT authentication
app.use(middlewares.Jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256']
}));

// Lazy JWT (only validates if present)
app.use(middlewares.JwtLazy({
  secret: process.env.JWT_SECRET
}));

// Request counter
app.use(middlewares.requestCounter());

// Access logging
app.use(middlewares.AccessLog());

// Response formatting
app.use(middlewares.ResponseFormatter());

// Error formatting
app.use(middlewares.ErrorFormatter());

// Routes
app.get('/users/:id', (req, res) => {
  res.json({ user: { id: req.params.id } });
});
```

---

## Tracing

```javascript
import { GlobalTracer, TracedAsyncFn } from '@verifiedfan/tracing';

// Initialize global tracer
const tracer = GlobalTracer({
  tracerName: 'my-service',
  serviceName: 'user-service',
  serviceNamespace: 'production',
  productGroup: 'platform',
  productCode: 'users',
  env: 'prod',
  region: 'us-east-1',
  collectorHost: 'otel-collector.example.com',
  collectorPort: 4318
});

// Trace async function
const getUserById = TracedAsyncFn(tracer, 'getUserById', async (userId) => {
  // This function is automatically traced
  const user = await db.users.findOne({ id: userId });
  return user;
});

// Use traced function
const user = await getUserById('123');
```

---

## Test Utilities

```javascript
import { testUtils } from '@verifiedfan/lib';

// Generate test data
const email = testUtils.generateEmail(); // 'test-abc123@example.com'
const phone = testUtils.generatePhone(); // '+15551234567'
const userId = testUtils.generateGlobalUserId(); // 'user-abc123...'

// Generate test objects
const user = testUtils.generateUser({
  email: 'custom@example.com',
  firstName: 'John',
  lastName: 'Doe'
});

const event = testUtils.generateEvent({
  name: 'Test Concert',
  date: new Date('2024-12-31')
});

// Lambda event inputs
const kinesisEvent = testUtils.makeKinesisInput([
  { userId: '123', action: 'created' },
  { userId: '456', action: 'updated' }
]);

const dynamoEvent = testUtils.MakeDynamoDBStreamInput([
  {
    Keys: { userId: { S: '123' } },
    NewImage: { userId: { S: '123' }, name: { S: 'John' } },
    eventName: 'INSERT'
  }
]);

const sqsEvent = testUtils.makeSqsInput([
  { message: 'hello' },
  { message: 'world' }
]);

// Random data
const randomInt = testUtils.getRandomInt(1, 100);
const randomFloat = testUtils.getRandomFloat(0, 1);
const randomBool = testUtils.getRandomBoolean();
```

---

## Error Handling

All library functions use consistent error handling:

### AWS Services

```javascript
import { aws } from '@verifiedfan/lib';

try {
  const result = await dynamodb.get({ key: { userId: '123' } });
} catch (error) {
  if (error.name === 'ResourceNotFoundException') {
    console.error('Table not found');
  } else if (error.name === 'ValidationException') {
    console.error('Invalid parameters:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Request Client

```javascript
import { Request } from '@verifiedfan/lib';

try {
  const response = await Request({
    serviceName: 'api',
    baseUrl: 'https://api.example.com',
    endpoint: '/users/123',
    accessPath: 'data'
  });
} catch (error) {
  // 4xx errors throw immediately
  if (error.statusCode === 404) {
    console.error('User not found');
  } else if (error.statusCode >= 400 && error.statusCode < 500) {
    console.error('Client error:', error.message);
  }
  // 5xx errors are retried 3 times before throwing
  else if (error.statusCode >= 500) {
    console.error('Server error after retries:', error.message);
  }
}
```

### Kafka

```javascript
import Kafka from '@verifiedfan/kafka';

try {
  await producer.sendMessages([
    { value: { event: 'test' } }
  ]);
} catch (error) {
  if (error.message.includes('disconnected')) {
    // Automatic reconnection will be attempted
    console.warn('Producer disconnected, will retry');
  } else {
    console.error('Failed to send messages:', error);
  }
}
```

---

## Best Practices

### Connection Management

```javascript
// Create connections once and reuse
const dynamodb = aws.DynamoDB({ tableName: 'users', region: 'us-east-1' });
const redis = Redis({ url: process.env.REDIS_URL });
const kafka = Kafka({ /* config */ });

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
  await kafka.disconnect();
  await mongo.closeDb();
  process.exit(0);
});
```

### Logging

```javascript
// Use context-specific loggers
const createLogger = Log({ level: process.env.LOG_LEVEL || 'info' });
const userServiceLog = createLogger('app/services/users');
const authServiceLog = createLogger('app/services/auth');

// Always include correlation IDs
log.info('Processing request', {
  correlationId: req.correlation.id,
  userId: req.user.id
});
```

### Error Handling

```javascript
// Handle errors at appropriate levels
try {
  const user = await getUserById(userId);
  return user;
} catch (error) {
  log.error('Failed to get user', {
    userId,
    error: error.message,
    stack: error.stack
  });
  throw new VFError('USER_NOT_FOUND', { userId });
}
```

### Configuration

```javascript
// Use environment variables for configuration
const s3 = aws.S3({
  bucketName: process.env.S3_BUCKET,
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Never hardcode secrets
const kafka = Kafka({
  brokers: process.env.KAFKA_BROKERS.split(','),
  ssl: process.env.KAFKA_SSL_ENABLED === 'true' ? {
    ca: fs.readFileSync(process.env.KAFKA_CA_PATH, 'utf-8')
  } : undefined
});
```
