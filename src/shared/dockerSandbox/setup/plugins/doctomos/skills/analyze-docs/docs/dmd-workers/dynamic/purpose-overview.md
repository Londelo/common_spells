# Purpose - dmd-workers

## What This Does

The demand-workers repository is an event-driven notification system that sends timely SMS and email reminders to fans when tickets for concerts and events are about to go on sale. It monitors upcoming ticket sales (presales and public sales), generates personalized notifications, and delivers them to fans who have opted in to receive reminders.

## Business Context

In the competitive live entertainment market, fans need timely notifications when tickets become available for their favorite artists and events. Missing a sale window—especially for popular events with limited tickets—means fans lose their chance to attend. This system exists to:

- **Increase ticket sales** by ensuring fans don't miss sale start times
- **Improve fan experience** by providing convenient, personalized reminders
- **Support multiple sale types** including presales (VIP, credit card, Verified Fan) and public sales
- **Handle high volume** for major events where thousands of fans need simultaneous notifications

The system bridges the gap between Ticketmaster's event management systems and fan communication channels (SMS, email).

## Target Users/Consumers

**Primary Users:**
- **Fans** who have signed up to receive ticket sale reminders for specific events
- Opt-in via Ticketmaster/Live Nation websites and apps
- Receive SMS and/or email notifications before sales start

**System Consumers:**
- **Ticketmaster Discovery API** (event data source)
- **SMS Service** (message delivery platform)
- **DynamoDB Streams** (internal data change triggers)
- **AWS AppSync** (GraphQL API clients)

## Key Business Capabilities

- **Automated Sale Monitoring** - Continuously tracks upcoming ticket sales and schedules notifications based on sale start times
- **Multi-Channel Notifications** - Delivers reminders via SMS and email based on fan preferences
- **Personalized Messaging** - Generates localized messages with event-specific details (artist, venue, time, direct ticket link)
- **Sale Type Intelligence** - Identifies and handles different sale types (presales, public sales, Verified Fan, credit card offers)
- **High-Volume Processing** - Processes thousands of notifications in batch for major event sales
- **Delivery Tracking** - Monitors notification status from creation through delivery, with retry logic for failures
- **Event Data Caching** - Maintains efficient local cache of event details to minimize external API calls

## Business Requirements & Constraints

**Functional Requirements:**
- REQ-001: System must deliver notifications 30 minutes before ticket sale start time (configurable window)
- REQ-002: Notifications must include artist name, venue, sale time, and direct purchase link
- REQ-003: System must support multiple languages (English US, English CA, French CA)
- REQ-004: Failed notification delivery must retry up to 3 times before marking as failed
- REQ-005: System must suppress notifications for specific artist IDs and sale types (registration-only, suppressed artists)
- REQ-006: Short URLs must be generated for all event links to fit SMS character limits
- REQ-007: Notifications must not be sent more than once per fan per sale

**Technical Constraints:**
- CONST-001: SMS messages limited to 160 characters (requires URL shortening via Bitly)
- CONST-002: DynamoDB conditional writes prevent duplicate notifications
- CONST-003: AWS Lambda execution time limits (300 seconds max per function)
- CONST-004: Batch processing limits (SQS max 10 messages, DynamoDB max 25 items per batch write)
- CONST-005: Must operate within AWS VPC for security compliance

**Performance Requirements:**
- PERF-001: Process up to 50,000 notifications per major event
- PERF-002: Generate and enqueue notifications within scheduled time window (30-minute slots)
- PERF-003: Delivery attempt must complete within 30 seconds or retry

## Core Business Rules

**Sale Scheduling:**
- Notifications are scheduled in 30-minute time windows (e.g., 10:00-10:30, 10:30-11:00)
- System queries sales by date and time range from cached data
- Only sales starting within the current window are processed

**Notification Generation:**
- One notification per fan per sale (deduplication by fan ID + sale ID + contact method)
- Message content varies by sale type: public sales omit presale name, presales include specific name
- Short URLs are required before notification generation
- Template variables populated from event data: artist, venue, date, time, timezone

**Delivery Logic:**
- Notifications transition through states: CREATED → TRIGGERED → QUEUED → SENT → DELIVERED (or FAILED)
- Maximum 3 send attempts per notification
- Retryable errors (500 status, specific error codes) trigger retry
- Non-retryable errors (invalid phone number, blocked recipient) immediately mark as FAILED
- Status updates from SMS service consumed via Kinesis stream

**Suppression Rules:**
- Events with suppressed artist IDs do not generate notifications
- Sales containing "registration" keyword are suppressed
- Events outside supported countries (US, CA) are suppressed by default
- Non-music and non-theater events are suppressed by default

**Message Formatting:**
- SMS: Plain text with brand name (Ticketmaster/Live Nation), shortened URL
- Email: Template-based with structured variables for rendering
- Localization: Messages formatted per event locale (en-us, en-ca, fr-ca)
- English messages have accents removed from artist names (Twilio limitation)

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Notification ready | Send SMS | SMS Service | When notification record created in DynamoDB |
| Event URL missing | Create short URL | Bitly API | When event cached without shortUrl |
| SMS delivery status change | Update status | DynamoDB | Upon receiving status webhook from SMS service |

### Inbound (what events we respond to)

| Source | Event | Action | Timing |
|--------|-------|--------|--------|
| Scheduler (EventBridge) | Scheduled event | Query sales in upcoming window, generate notifications | Every 30 minutes |
| DynamoDB Stream | New demand record | Write to SQS for URL shortening | Real-time (stream consumer) |
| DynamoDB Stream | New notification record | Send SMS/email | Real-time (stream consumer) |
| SMS Service Kinesis | SMS status update | Update notification delivery status | Real-time (stream consumer) |
| SQS Queue | Short URL request | Fetch event from cache, call Bitly, update cache | Batch (10 messages) |
| AppSync GraphQL | Query event details | Fetch from Discovery API, cache result, return formatted data | On-demand API call |

### Service Dependencies

**Critical Dependencies:**
- **Ticketmaster Discovery API** - Source of truth for event data (artist, venue, dates, sales)
- **DynamoDB** - Primary data store (demand records, event cache, sales, notifications)
- **SMS Service** - Delivery platform for SMS notifications
- **Bitly** - URL shortening service (required for SMS character limits)

**Supporting Dependencies:**
- **AWS Kinesis** - Event streaming for DynamoDB changes and SMS status updates
- **AWS SQS** - Queue for short URL generation requests
- **AWS Lambda** - Serverless compute runtime for all workers
- **Redis** - Caching layer for event data (read-only replica available)
- **MongoDB** - Legacy data access (minimal usage)
- **AppSync** - GraphQL API layer for external queries

## Success Metrics

**Operational Metrics:**
- Notification delivery rate > 95%
- Average notification delivery time < 2 minutes from trigger
- Failed notification rate < 5%
- URL shortening success rate > 99%

**Business Metrics:**
- On-time notification delivery (within scheduled window) > 98%
- Duplicate notification rate < 0.1%
- API response time (eventDetails query) < 500ms (p95)
- Event data cache hit rate > 90%

**Reliability Metrics:**
- Lambda execution success rate > 99%
- DynamoDB write success rate > 99.9%
- SMS service availability > 99.5%
- Discovery API availability > 99% (with fallback caching)
