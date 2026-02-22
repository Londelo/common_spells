# Domain Concepts - admin-ui

## Core Entities

| Entity | Description |
|--------|-------------|
| **Campaign** | A presale registration campaign for an artist/event. Contains all configuration, content, dates, markets, and options. Two types: Registration (standard) and Fanlist (invite-only). |
| **Market** | Geographic or logical grouping within a campaign (e.g., US, Canada, specific city). Each market has its own quota, distribution settings, and selection rules. |
| **Artist** | Performer or band associated with campaign. Contains name, discovery ID, image URL, fanclub information. |
| **Viewer** | End-user (fan) who registers for a campaign. Contains profile, entry data, verification status, selection verdict. |
| **Entry** | A fan's registration in a campaign. Contains entry date, attributes (preferences, survey responses), verification status. |
| **Code** | Presale access code assigned to a selected fan. Types include "offer" (code + offer ID), "presale" (plain code). Status: available, assigned, expired. |
| **Wave** | Scheduled notification batch sent to selected fans with their codes. Contains notification date, recipient list, send status. |
| **WavePrep** | Process of assigning codes to selected fans for a specific date/market. Configures assignment rules (reassign, random, ordering). |
| **Selection** | Process of choosing which registered fans will receive presale access. Uses scoring, market quotas, and business rules to determine verdicts. |
| **Stat** | Metrics record for a campaign (entries, selections, distributions). Aggregated by campaign, market, date, type. Status: pending, processing, completed. |
| **Export** | Asynchronous data export request. Types: entries, selection, distribution. Contains export URL when completed. |
| **Blacklist** | List of phone numbers or emails excluded from campaigns due to fraud/violations. Global across all campaigns. |
| **Locale** | Language/country combination for campaign content (e.g., en_US, fr_CA, es_MX). Campaigns support multiple locales. |
| **Content** | Localized text for campaign pages (landing, confirmation, started, closed, finished, ineligible). Rich HTML supported. |
| **Image** | Campaign branding image. Types: main (desktop), mobile, email, secondary. Stored in CDN, referenced by URL. |
| **FAQ** | Frequently asked questions displayed on campaign pages. Configurable per page state (landing, confirmation) and campaign state (open, closed, active presale). |
| **Identity** | Admin user authentication. Contains user profile, permissions, session token. |

---

## Business Rules

### Campaign Lifecycle Rules

- **State Progression**: Campaigns move through states: `draft` → `open` → `closed` → `finished`. Some states are automatic (close at configured close date).
- **Draft Visibility**: Draft campaigns are not visible to end users. Only "open" campaigns accept registrations.
- **Edit Restrictions**: Certain fields cannot be changed after campaign opens (e.g., campaign type, identifier type).
- **Close Automation**: Campaigns automatically close at configured close date/time (timezone-aware).

### Selection Rules

- **Eligibility**: Only verified fans who registered before close date are eligible for selection.
- **Quota Enforcement**: Total selected fans across all markets cannot exceed campaign capacity. Individual market quotas also enforced.
- **Scoring Priority**: When quotas are limited, higher-scored fans are selected first (if scoring is enabled).
- **Blacklist Exclusion**: Fans on the global blacklist are automatically excluded from selection, regardless of score.
- **Precheck Requirement**: If campaign has "requirePrecheck" option, fans must have been selected in a specified past campaign to be eligible.
- **One-Time Selection**: Once selection runs, it cannot be re-run without manual intervention (prevents accidental re-selection).

### Code Assignment Rules

- **Single Assignment**: Each code can only be assigned to one fan. Once assigned, it cannot be reassigned (unless explicitly configured in wave prep).
- **Type Matching**: Code type must match campaign configuration (offer codes require categoryId, presale codes are plain text).
- **Market Linkage**: Codes are linked to specific markets. Cross-market assignment is restricted.
- **Blacklist Enforcement**: Fans on blacklist cannot receive code assignments, even if selected.

### Wave Scheduling Rules

- **Edit Window**: Waves cannot be edited or cancelled within a certain time window before the scheduled send time (default: 2-4 hours, varies by implementation).
- **Timezone Awareness**: Wave notifications are sent in recipient local timezone if specified, otherwise campaign reference timezone.
- **Single Send**: Once a wave is sent, it cannot be re-sent (prevents duplicate notifications).
- **Processing Delay**: Uploaded waves show "processing" status for several seconds to minutes while backend validates and queues.

### Content Localization Rules

- **Fallback Logic**: If content for a specific locale is missing, system falls back to en_US (default locale).
- **Current Locale**: Campaign has a "currentLocale" which determines what content is shown in admin preview.
- **Multi-Locale Support**: Campaigns can have content for multiple locales (en_US, en_CA, en_GB, fr_CA, en_MX, es_MX, en_IE).

### Market Rules

- **Quota Tracking**: Each market tracks registered, selected, and assigned counts. Quotas prevent over-selection.
- **Transfer on Delete**: When a market is deleted, its assigned fans can be transferred to another market (if specified).
- **Market Cloning**: Markets from one campaign can be cloned to another campaign (useful for recurring tours).

### Export Rules

- **Asynchronous Generation**: Exports are generated asynchronously. Large exports can take 5-10 minutes.
- **PII Access**: Exports contain PII (phone, email). Only authorized admin users can download.
- **Point-in-Time Snapshot**: Export data reflects state at time of export request, not real-time.

---

## Terminology

| Term | Definition |
|------|------------|
| **Verified Fan** | A fan who has completed registration and been verified (identity, phone, eligibility checks passed). |
| **Presale** | Time-limited early access to purchase tickets before general public onsale. |
| **General Onsale** | Public ticket sale date/time when anyone can purchase (no presale code required). |
| **Campaign Window** | Time period between campaign open date and close date when fans can register. |
| **Presale Window** | Time period between presale start and end when selected fans can use codes to purchase tickets. |
| **Selection Verdict** | Result of selection algorithm for a fan: selected (eligible for code), not selected (ineligible), pending. |
| **Wave** | Batch notification sent to fans (SMS or email) containing their presale code. |
| **Wave Prep** | Process of assigning codes to fans in preparation for wave send. |
| **Offer Code** | Presale code that includes an offer ID (specific ticket inventory allocation). |
| **Plain Code** | Simple presale access code (no specific inventory tied). |
| **Fanlist** | Pre-approved list of fans (e.g., official fan club members) who have priority access. |
| **Fanlist Campaign** | Campaign type where only fanlist members can register (invite-only). |
| **Registration Campaign** | Standard campaign type where any fan can register (public). |
| **Market** | Geographic or logical segment within a campaign (e.g., New York, Los Angeles, Canada). |
| **Quota** | Maximum number of fans who can be selected for a given market or campaign. |
| **Scoring** | Numerical value assigned to fans based on loyalty, activity, or other factors. Higher scores = higher priority. |
| **Blacklist** | List of banned phone numbers or emails excluded from all campaigns. |
| **Reference Timezone** | Primary timezone for campaign (used for open/close times). Usually artist's home market or venue timezone. |
| **Category ID** | Ticketmaster event category identifier. Used to link campaign to specific ticket inventory. |
| **Discovery ID** | Artist or venue identifier in Ticketmaster Discovery API. |
| **Gate** | Restriction or requirement for campaign access (e.g., password gate, linked account gate, card gate). |
| **Linked Account Gate** | Requires fan to have linked account with partner (e.g., Verizon, Citi) to access campaign. |
| **Card Gate** | Requires fan to have specific credit card type (e.g., Citi card) to access presale. |
| **IDV Tier** | Identity verification tier required for campaign (e.g., ASU - age and identity verification). |
| **LNAA** | "Last Name And Address" verification method. |
| **Draft Status** | Campaign state where configuration is in progress but not yet live. |
| **Automated Reminders** | System-scheduled reminder emails sent to fans before presale window. |
| **Queue ID** | Identifier for virtual waiting room (if campaign uses queuing for presale access). |

---

## Data Models

### Campaign Data Structure

```
Campaign
├── id (String)
├── type (CampaignType: registration | fanlist)
├── subType (CampaignSubtype: fanclub | null)
├── name (String)
├── status (String: draft | open | closed | finished)
├── artist (CampaignArtist)
│   ├── id (String)
│   ├── discovery_id (String)
│   ├── name (String)
│   ├── image_url (String)
│   └── fanclubName (String)
├── categoryId (ID) - Ticketmaster event category
├── referenceTimezone (String) - e.g., "America/New_York"
├── date (CampaignDate)
│   ├── created (String - ISO timestamp)
│   ├── updated (String)
│   ├── open (String - when registration opens)
│   ├── close (String - when registration closes)
│   ├── finish (String - when campaign ends)
│   ├── presaleWindowStart (String)
│   ├── presaleWindowEnd (String)
│   ├── generalOnsale (String)
│   └── sendReminderEmails ([String] - scheduled reminder dates)
├── markets ([Market])
│   ├── id (ID)
│   ├── name (String)
│   ├── quota (Int)
│   ├── assignedCount (Int)
│   └── distributionSettings (JSON)
├── content (CampaignContent)
│   └── localized ([LocalizedContent])
│       ├── locale (String - e.g., "en_US")
│       ├── landing (ContentLanding)
│       ├── confirmation (ContentConfirmation)
│       ├── started (ContentStarted)
│       └── closed (ContentClosed)
├── image (CampaignImages)
│   ├── main (Image) - desktop hero image
│   ├── mobile (Image) - mobile hero image
│   ├── email (Image) - email header image
│   └── secondary (Image) - additional branding
├── options (CampaignOptions)
│   ├── allowIntlPhones (Boolean)
│   ├── requirePassword (Boolean)
│   ├── passwordValue (String)
│   ├── gate (CampaignGate)
│   │   ├── card (CampaignCardGate: VISA | AMEX | MASTERCARD | ...)
│   │   ├── linkedAccount (CampaignLinkedAccountGate: VERIZON | CITI)
│   │   ├── inviteOnly (FanIdentifier: phone | email)
│   │   └── idv (IDVTier: asu)
│   ├── automatedReminders (Boolean)
│   └── waitingRoomDuration (Int - minutes)
├── preferences ([Field]) - custom survey questions
├── faqs (CampaignPageFAQ)
│   ├── landing ([ID] - FAQ IDs shown on landing page)
│   └── confirmation ([ID] - FAQ IDs shown on confirmation page)
├── locales ([Locale])
└── identifier (FanIdentifier: phone | email) - how fans are uniquely identified
```

### Selection Stats Data Structure

```
Stat
├── campaignId (ID)
├── marketId (ID | null) - null = campaign-wide
├── dateId (String) - e.g., "2025-01-15"
├── type (StatsType: SELECTION | ENTRY | DISTRIBUTION)
├── status (String: pending | processing | completed | error)
├── count (JSON)
│   ├── registered (Int)
│   ├── selected (Int)
│   ├── eligible (Int)
│   └── excluded (Int)
├── meta (JSON)
│   ├── startTime (String)
│   ├── endTime (String)
│   └── parameters (JSON - selection config)
└── date (JSON)
    ├── created (String)
    └── updated (String)
```

### Code Assignment Data Structure

```
Code
├── id (ID)
├── campaignId (ID)
├── marketId (ID)
├── code (String) - the actual presale code
├── type (String: offer | presale)
├── status (String: available | assigned | expired)
├── assignedTo (ID | null) - viewer ID if assigned
├── assignedDate (String | null)
└── offerId (ID | null) - if type = offer
```

### Wave Data Structure

```
Wave
├── name (String) - filename of uploaded wave
├── campaignId (ID)
├── notifyDate (String - ISO timestamp)
├── status (String: pending | processing | scheduled | sent | cancelled | error)
├── config (JSON)
│   ├── categoryId (ID | null)
│   ├── generateOfferCode (Boolean)
│   ├── totalLimit (Int | null)
│   └── tiedToAccount (Boolean | null)
├── recipientCount (Int)
├── sentCount (Int)
└── uploadDate (String)
```

---

## Data Flow Examples

### Campaign Creation Data Flow

1. **Input**: Campaign manager fills form in admin-ui
2. **Image Upload**: Images uploaded to CDN, URLs returned
3. **Form Transformation**: Frontend normalizes form data (dates, markets, content)
4. **GraphQL Mutation**: `upsertCampaign` called with normalized data
5. **Backend Validation**: GraphQL API validates schema and business rules
6. **Database Write**: Campaign saved to database with generated ID
7. **Response**: Campaign object returned with ID
8. **Redirect**: Frontend redirects to campaign detail view
9. **Output**: Campaign visible in campaigns list, fans can register if status = "open"

---

### Selection Process Data Flow

1. **Input**: Campaign manager clicks "Trigger Selection" button
2. **GraphQL Mutation**: `triggerSelection` called with campaignId and marketIds
3. **Backend Processing**:
   - Query all verified registrants for campaign
   - Filter out blacklisted fans
   - Apply scoring (if configured)
   - Apply market quotas
   - Apply min/max score thresholds
   - Mark selected fans with verdict = "selected"
   - Update stat records with counts
4. **Admin UI Polling**: Frontend polls `stats` query every 3 seconds
5. **Status Updates**: Stat status changes: pending → processing → completed
6. **Output**: Selection complete, selected fans ready for code assignment

---

### Code Assignment Data Flow

1. **Input**: Operations team uploads codes CSV file
2. **GraphQL Mutation**: `uploadCodes` called with file and campaignId
3. **Backend Processing**:
   - Parse CSV file
   - Validate code format
   - Save codes to database with status = "available"
4. **Wave Prep**: Operations team creates wave prep (dateKey, market, options)
5. **GraphQL Mutation**: `triggerWavePrep` called with campaignId, dateKey, options
6. **Backend Processing**:
   - Query selected fans for specified date/market
   - Filter out blacklisted fans
   - Filter out already-assigned fans (unless reassign = true)
   - Apply ordering (by preference, random, etc.)
   - Assign codes from available pool to fans
   - Update code status = "assigned"
   - Update fan assignedCode field
7. **Admin UI Polling**: Frontend polls `wavePrepList` query
8. **Status Updates**: Wave prep status changes: pending → processing → completed
9. **Output**: Codes assigned to fans, ready for notification wave

---

### Wave Notification Data Flow

1. **Input**: Operations team uploads wave recipient CSV and sets notification date
2. **GraphQL Mutation**: `uploadWave` called with file, fileName, notifyDate, config
3. **Backend Processing**:
   - Parse CSV file (fan identifiers + codes)
   - Validate recipients exist and have codes
   - Schedule notification job for specified notifyDate
   - Save wave to database with status = "scheduled"
4. **Scheduled Execution**: At notifyDate, backend job runs
5. **Notification Send**:
   - Query recipients from wave
   - Generate SMS/email content with codes
   - Send via notification service (SMS gateway, email service)
   - Update wave status = "sent"
   - Update sentCount
6. **Admin UI Polling**: Frontend polls `waveList` query
7. **Output**: Fans receive SMS/email with presale codes
