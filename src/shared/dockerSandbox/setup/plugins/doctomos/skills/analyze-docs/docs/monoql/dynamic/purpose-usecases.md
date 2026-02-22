# Use Cases & Workflows - monoql

## Primary Use Cases

### Use Case 1: Fan Registers for Presale Campaign

**Actor**: Fan (end user)

**Goal**: Register for an artist presale campaign to gain access to priority ticket purchasing

**Preconditions**:
- Campaign is open (current time between date.open and date.close)
- Fan has valid Ticketmaster account
- Fan has not already registered for this campaign

**Main Flow**:
1. Fan navigates to campaign landing page via domain URL
2. System loads campaign details (artist, dates, markets, content) via `viewer.campaign` query
3. Fan reviews campaign information and clicks registration button
4. Fan authenticates via Ticketmaster identity (OAuth flow) - `authenticate` mutation
5. System checks registration eligibility via `eligibility` query
6. Fan completes registration form (selects market preferences, provides additional info)
7. Fan submits entry via `upsertViewerEntry` mutation
8. System validates entry data and saves to Entry Service
9. System triggers phone confirmation flow if required (`submitConfirm` mutation with phoneJwt)
10. Fan receives confirmation email and access to campaign status page

**Postconditions**:
- Entry record created in Entry Service
- Fan can view entry status on campaign page
- Fan becomes eligible for selection algorithm when campaign closes

**Business Rules Applied**:
- Duplicate prevention: one entry per identifier type (email/memberId/globalUserId)
- Gating validation: credit card/linked account/IDV checks if required
- Phone confirmation: must complete within campaign window
- Locale handling: content displayed based on fan's selected locale

---

### Use Case 2: Admin Creates New Campaign

**Actor**: Campaign Administrator

**Goal**: Launch new artist presale registration campaign

**Preconditions**:
- Admin has authenticated with appropriate permissions
- Artist metadata exists in Discovery service
- Campaign dates and venue information are finalized

**Main Flow**:
1. Admin searches for artist via `searchArtists` query
2. Admin creates campaign draft via `upsertCampaign` mutation with initial config
3. Admin configures campaign settings:
   - Sets campaign type (registration/fanlist)
   - Defines presale window dates (open/close/finish)
   - Configures content for multiple locales (landing page copy, emails, FAQs)
   - Uploads campaign images (main/mobile/email)
4. Admin adds markets via `upsertMarket` mutation for each venue
5. Admin configures market events (event IDs, dates, venue details, presale links)
6. Admin sets gating requirements (credit card types, linked accounts, IDV tier)
7. Admin adds campaign contacts via `saveCampaignContacts`
8. Admin saves and publishes campaign
9. System validates all required fields and generates shareable domain URLs

**Postconditions**:
- Campaign accessible via public domain URL
- Campaign appears in campaigns list
- Fans can begin registration when campaign opens
- Slack notifications sent to configured channels (if enabled)

**Business Rules Applied**:
- Domain uniqueness: campaign domain must be globally unique
- Date validation: close date must be after open date
- Locale requirements: at least one default locale required
- Content validation: required content fields must be populated per locale
- Permission enforcement: admin must have write access to create campaigns

---

### Use Case 3: Admin Triggers Fan Selection Wave

**Actor**: Campaign Administrator

**Goal**: Select eligible fans and assign presale access codes for upcoming ticket sale

**Preconditions**:
- Campaign registration period has closed
- Eligible entries exist in Entry Service
- Access codes have been uploaded to Code Service
- Market allocation limits defined

**Main Flow**:
1. Admin queries eligible fan counts via `eligibileCounts` query with score filters
2. Admin reviews eligibility breakdown by market and preference rank
3. Admin uploads wave preparation configuration file (market allocations, code mappings)
4. Admin triggers wave prep via `triggerWavePrep` mutation with parameters:
   - dateKey: identifier for this selection wave
   - reassign: whether to include previously selected fans
   - orderByPreference: prioritize fans' top market choices
   - randomSelection: enable random vs score-based selection
   - minScore/maxScore: filter by fan scoring thresholds
5. System processes wave preparation asynchronously:
   - Fetches eligible entries from Entry Service
   - Applies scoring and preference ranking logic
   - Allocates fans to markets based on capacity limits
   - Assigns access codes from Code Service inventory
6. Admin monitors wave prep status via `wavePrepList` query
7. Upon completion, admin triggers selection via `triggerSelection` mutation
8. System sends notification emails to selected fans with access codes

**Postconditions**:
- Selected fans have assigned access codes
- Code inventory depleted accordingly
- Export files generated for promoter reporting
- Fan campaign status updated to show selection results

**Business Rules Applied**:
- Score filtering: only fans within min/max score range selected
- Market capacity: selections cannot exceed venue allocation limits
- Preference prioritization: fans' higher-ranked markets prioritized when possible
- Code tying: codes tied to fan account if campaign requires (tiedToAccount flag)
- Single-use enforcement: codes marked as single-use if configured
- Reassignment logic: previous selections excluded unless reassign=true

---

### Use Case 4: Admin Exports Campaign Data

**Actor**: Campaign Administrator / Business Analyst

**Goal**: Export fan entry data for reporting, promoter reconciliation, or analytics

**Preconditions**:
- Campaign has entry data to export
- Admin has export permissions for campaign

**Main Flow**:
1. Admin navigates to campaign export page
2. Admin selects export type (entries, selected fans, eligibility breakdown)
3. Admin triggers export via `scheduleExport` mutation with dateKey identifier
4. System creates export job and queues for async processing
5. Export Service:
   - Fetches requested data from Entry/Campaign services
   - Formats as CSV/JSON with all entry fields
   - Uploads to S3 with signed URL
6. Admin polls export status via `campaignExport` query
7. When status reaches 'finished', admin downloads file via provided S3 path
8. Admin uses exported data for promoter reporting or business intelligence

**Postconditions**:
- Export record stored with metadata (count, date, status)
- Export file available via S3 for configured retention period
- Export appears in campaign export history

**Business Rules Applied**:
- Permission enforcement: only authorized admins can export
- Data privacy: export includes fan PII (requires GDPR compliance)
- Async processing: large exports do not block interactive queries
- Expiration: export URLs expire after configured time period

---

### Use Case 5: Fan Checks Presale Eligibility

**Actor**: Fan (end user)

**Goal**: Determine if eligible for presale codes and view selection status

**Preconditions**:
- Fan has previously registered for campaign
- Campaign registration period has closed
- Fan is authenticated

**Main Flow**:
1. Fan logs into Ticketmaster account
2. Fan navigates to campaign domain URL
3. System authenticates fan via JWT token
4. System queries `viewer.campaign.entry` to fetch fan's entry details
5. System queries `viewer.campaign.eligibility` to check selection status
6. System displays:
   - Registration confirmation (entry date, market preferences)
   - Eligibility status (eligible/selected/not selected)
   - Access code details if selected (code value, event link, presale date)
   - Waiting list status if applicable
7. Fan can access presale link with code when presale window opens

**Postconditions**:
- Fan informed of selection status
- If selected, fan has access code for ticket purchase
- Entry viewed in admin metrics (optional tracking)

**Business Rules Applied**:
- Authentication required: only fan who registered can view entry
- Status accuracy: eligibility reflects latest selection run
- Code visibility: codes only shown to selected fans during appropriate window
- Market mapping: displays fan's assigned market from preference rankings

---

## User Journey Map

**Campaign Lifecycle - Fan Perspective**:
1. Fan discovers campaign via social media/email/artist website
2. Fan clicks registration link → Lands on campaign page
3. Fan views artist info, presale dates, venue options
4. Fan authenticates with Ticketmaster account
5. Fan completes registration form with market preferences
6. Fan confirms phone number (if required)
7. Fan receives email confirmation
8. Fan waits for campaign close date
9. **Selection Period**: Fan receives notification of selection results
10. **If Selected**: Fan receives access code and presale link
11. Fan purchases tickets during presale window using access code
12. Fan attends event

**Campaign Lifecycle - Admin Perspective**:
1. Admin receives campaign request from artist/promoter
2. Admin creates campaign configuration in system
3. Admin sets up markets, venues, event dates
4. Admin configures content and branding
5. Admin tests campaign in preview mode
6. Admin publishes campaign → Registration opens
7. Admin monitors registration metrics and entry counts
8. **Registration closes** → Admin reviews eligibility data
9. Admin uploads code inventory from ticketing platform
10. Admin triggers wave preparation and selection
11. Admin reviews selection results and exports data
12. Admin sends reports to promoters
13. Campaign marked as finished

## Key Workflows

### Workflow 1: Campaign Content Localization
1. Admin defines supported locales for campaign (e.g., en_US, es_MX, fr_CA)
2. Admin enters localized content for each locale:
   - Landing page headers/body text
   - Email templates (confirmation, receipt, reminder)
   - FAQ sections
   - Form field labels
3. System stores localized content in nested structure
4. Fan's browser locale or manual selection determines displayed content
5. System falls back to default locale if requested locale unavailable

### Workflow 2: Market Capacity Management
1. Admin creates markets for each venue in tour
2. Admin assigns population limit per market (venue capacity allocation)
3. Fans register and rank market preferences
4. Admin uploads market allocation file (event IDs, code counts per market)
5. Selection algorithm distributes fans across markets:
   - Prioritizes fans' top preferences
   - Respects market capacity limits
   - Handles oversubscribed markets with scoring/randomization
6. System generates allocation report showing fill rates per market

### Workflow 3: Fan Scoring & Fraud Prevention
1. Entry Service calculates fan score based on:
   - Historical attendance data
   - Account age and activity
   - Verification completeness (phone, email)
   - Fraud indicators (duplicate accounts, suspicious patterns)
2. Admin sets minimum score threshold for eligibility
3. Selection algorithm filters out low-scoring entries
4. Admin can manually tag entries for allow/block via `addTags` mutation
5. Admin can flip verdicts (change allowed to blocked) via `flipVerdicts` mutation
6. Blocked entries excluded from selection regardless of score

### Workflow 4: Phone Confirmation Flow
1. Fan submits registration with phone number
2. System sends SMS verification code to phone
3. Fan enters code on confirmation page
4. Fan submits code via `submitConfirm` mutation with phoneJwt token
5. System validates JWT signature and phone match
6. Entry status updated to "confirmed"
7. Unconfirmed entries marked ineligible when campaign closes

### Workflow 5: Split Allocation Management
1. Campaign configured with multiple markets for same tour
2. Admin sets split allocation strategy per market:
   - **Concurrent**: Multiple events use shared code pool simultaneously
   - **Sequential**: Events access code pools in order (first come first served)
3. Admin uploads separate code files per allocation type
4. Selection algorithm respects split allocation rules when assigning codes
5. Fans receive codes tied to appropriate split allocation group

## Example Scenarios

**Scenario 1: Taylor Swift Stadium Tour Presale**
- Admin creates "Taylor Swift - Eras Tour" registration campaign
- Campaign includes 50 North American cities (50 markets)
- Gating requirement: Verified Visa cardholder check
- Fans have 72-hour registration window (100K+ entries expected)
- Each fan ranks top 3 preferred cities
- Admin triggers selection after close: 25K fans selected across all markets
- Priority given to fans' first-choice cities where possible
- Selected fans receive unique presale codes tied to Ticketmaster accounts
- Codes activate 48 hours before general on-sale per market

**Scenario 2: Exclusive Fan Club Presale**
- Artist fan club requests invite-only presale for members
- Admin creates "fanclub" subtype campaign
- Gating: linked account (memberId identifier required)
- Admin uploads member list (10K members)
- Campaign opens only to users with valid memberId
- No market preferences (single venue event)
- All eligible members receive codes (no selection lottery)
- Codes sent 7 days before presale window opens

**Scenario 3: Multi-Locale Festival Registration (UK/Ireland)**
- Admin creates campaign for European festival with UK and Ireland dates
- Content localized for en_GB and en_IE
- Currency and timezone handling per locale
- Fans in UK see Wembley Stadium option; fans in Ireland see Dublin venue
- Separate promoter contacts per market for GDPR compliance
- Admin exports separate datasets for UK vs Ireland promoters
- Respects local privacy regulations (different email templates per region)

**Scenario 4: Capacity-Constrained Broadway Show**
- Small venue (1,500 seats) with 20K+ expected registrations
- Admin sets aggressive min score threshold (fraud prevention priority)
- Admin enables randomSelection to ensure fairness among qualified fans
- Selection limited to 2,000 fans (codes with buffer for no-shows)
- Admin schedules multiple waves: initial selection + waitlist waves
- Previously selected fans excluded via reassign=false in subsequent waves
- Admin exports no-show tracking data after first wave to determine second wave size
