# Use Cases & Workflows - admin-ui

## Primary Use Cases

### Use Case 1: Campaign Manager Creates a New Presale Campaign

**Actor**: Campaign Manager (internal Ticketmaster employee)

**Goal**: Create and configure a new Verified Fan registration campaign for an upcoming artist presale

**Preconditions**:
- Campaign manager is authenticated and authorized
- Artist details are available (name, image, tour information)
- Presale dates and market information are known

**Main Flow**:
1. Campaign manager navigates to campaigns list and clicks "New Campaign"
2. System presents campaign creation form with version selection (registration or fanlist campaign)
3. Campaign manager enters:
   - Campaign name
   - Artist information (search for artist via Discovery API)
   - Campaign dates (open, close, presale window, general onsale)
   - Reference timezone
   - Markets with quotas
   - Campaign content (localized text for landing pages, confirmation emails)
   - Branding images (main, mobile, email)
   - Campaign options (password protection, gates, linked accounts)
4. System uploads images to CDN and validates form data
5. Campaign manager saves campaign as draft
6. System calls `upsertCampaign` GraphQL mutation
7. System redirects to campaign detail view
8. Campaign manager previews campaign on fan-facing UI
9. When ready, campaign manager changes status to "Open"
10. Campaign is now live and accepting registrations

**Postconditions**:
- Campaign exists in system with status "Open"
- Campaign is visible in campaigns list
- Fans can begin registering via fan-ui
- Campaign metrics tracking begins

**Business Rules Applied**:
- Draft campaigns are not visible to end users
- Campaign open date must be before close date
- Campaign close date must be before or on presale window start
- Image uploads must complete before campaign can be saved
- Markets must have valid quotas configured

---

### Use Case 2: Operations Team Uploads and Assigns Presale Codes

**Actor**: Operations Team (internal Ticketmaster operations staff)

**Goal**: Upload presale access codes and distribute them to selected verified fans

**Preconditions**:
- Campaign exists and has closed (registration period ended)
- Fan selection has been completed (fans have been chosen)
- Presale codes have been generated externally or provided by artist/promoter

**Main Flow**:
1. Operations team member navigates to campaign distribution section
2. Clicks "Code Assignments" tab
3. Uploads CSV file containing presale codes (code list with type: offer, presale, etc.)
4. System validates file format and uploads codes to campaign
5. System counts available codes by type and status
6. Operations team creates a "Wave Prep" to assign codes:
   - Selects assignment date/market
   - Chooses configuration options (reassign existing codes? order by preference? random selection?)
   - Triggers wave prep build
7. System processes wave prep:
   - Identifies eligible fans (selected, not already assigned)
   - Assigns codes from pool to fans
   - Respects market quotas
   - Applies blacklist filtering
8. System updates code assignment count and changes status to "assigned"
9. Operations team schedules notification wave:
   - Uploads recipient list (fan contacts with assigned codes)
   - Sets notification date/time and timezone
   - Specifies whether to generate offer codes automatically
10. System schedules wave for send
11. At scheduled time, wave notification is sent (SMS/email with codes)

**Postconditions**:
- Codes are assigned to specific fans in database
- Fans will receive notification with their unique code
- Code status changes from "available" to "assigned"
- Wave appears in wave list with "scheduled" or "sent" status

**Business Rules Applied**:
- Codes can only be assigned once
- Blacklisted fans are automatically excluded from code assignments
- Market quotas constrain total assignments per market
- Wave notifications cannot be cancelled within X hours of send time
- Code types must match campaign configuration

---

### Use Case 3: Campaign Manager Triggers Fan Selection

**Actor**: Campaign Manager

**Goal**: Run the selection algorithm to choose which registered fans will receive presale access

**Preconditions**:
- Campaign has closed (registration period ended)
- Fans have registered and been verified
- Market quotas are configured
- Scoring data is available (if using scored selection)

**Main Flow**:
1. Campaign manager navigates to campaign Selection tab
2. Reviews eligibility counts by market
3. Clicks "Trigger Selection"
4. System displays confirmation modal with selection parameters
5. Campaign manager confirms selection
6. System triggers `triggerSelection` GraphQL mutation with campaignId and marketIds
7. Backend processing begins (asynchronous):
   - Applies scoring algorithm (if configured)
   - Filters out blacklisted fans
   - Respects market quotas
   - Applies min/max score thresholds
   - Marks selected fans as "selected" in database
8. Admin UI polls selection stats every 3 seconds
9. System displays progress: "Processing..." with timestamp
10. Selection completes
11. System displays final selection stats by market:
    - Total registered
    - Total selected
    - Available codes
    - Selection completion timestamp
12. Campaign manager reviews results

**Postconditions**:
- Selected fans are marked in database with selection verdict
- Selection stats are updated and visible
- Campaign is ready for code assignment phase
- Selection cannot be re-run (unless manually cleared)

**Business Rules Applied**:
- Selection respects market quotas (cannot exceed quota)
- Scoring priority: higher scores selected first when quota is limited
- Blacklist enforcement: blacklisted fans are never selected
- Previous campaign verification: if "requirePrecheck" is enabled, fans must have been selected in a prior campaign
- Random selection: optional random selection mode ignores scores
- Single market mode: optional constraint to select fans for single market only

---

### Use Case 4: Campaign Manager Monitors Campaign Metrics

**Actor**: Campaign Manager

**Goal**: Track real-time campaign performance and registration metrics

**Preconditions**:
- Campaign exists and is open or closed

**Main Flow**:
1. Campaign manager navigates to campaign Metrics tab
2. Selects "Entries" sub-tab to view registration metrics
3. System loads and displays:
   - Total entries by market
   - Entries over time (chart)
   - Entry counts by status (verified, pending, rejected)
   - Breakdown by country, phone type, attributes
4. Campaign manager switches to "Scoring" sub-tab
5. System displays scoring distribution:
   - Score histogram
   - Average score by market
   - Top scorers
6. Campaign manager filters metrics by date or market
7. System re-queries and updates display
8. Metrics auto-refresh every few seconds if campaign is active

**Postconditions**:
- Campaign manager has visibility into registration progress
- Can identify issues (low registration, verification failures)
- Can make data-driven decisions (extend campaign, adjust selection quotas)

**Business Rules Applied**:
- Metrics reflect current state with < 5 second lag
- Metrics are aggregated by market for quota tracking
- Score data only available for scored campaigns (fanlist or custom scoring)

---

### Use Case 5: Operations Team Manages Blacklist

**Actor**: Operations Team

**Goal**: Upload or update blacklist to prevent specific users from receiving presale codes

**Preconditions**:
- Operations team has list of phone numbers or emails to blacklist (due to fraud, violations, etc.)

**Main Flow**:
1. Operations team member navigates to "Blacklist" section
2. Prepares CSV file with blacklisted identifiers (phone numbers or emails)
3. Uploads blacklist file
4. System validates file format
5. System calls `uploadBlacklist` GraphQL mutation
6. Backend processes file and updates blacklist table
7. System confirms upload success
8. Blacklist is now active for all future selections and code assignments

**Postconditions**:
- Blacklisted users are excluded from selection processes
- Existing selections for blacklisted users remain (historical data)
- Future operations automatically filter blacklisted users

**Business Rules Applied**:
- Blacklist is global (applies to all campaigns)
- Blacklist is additive (uploading new list appends, does not replace)
- Blacklist matching is exact (phone number or email must match exactly)

---

### Use Case 6: Campaign Manager Exports Campaign Data

**Actor**: Campaign Manager

**Goal**: Export campaign registration and selection data for external analysis

**Preconditions**:
- Campaign has registrations and/or selections

**Main Flow**:
1. Campaign manager navigates to campaign Exports tab
2. Clicks "Schedule Export"
3. Selects export type:
   - Entries export (all registrants)
   - Selection export (selected fans)
   - Distribution export (code assignments)
4. Optionally filters by date or market
5. System triggers `scheduleExport` GraphQL mutation
6. Backend begins generating export file asynchronously
7. Admin UI polls export list every few seconds
8. When export is ready, status changes to "completed"
9. Campaign manager clicks download link
10. Browser downloads CSV/JSON file
11. Campaign manager opens file in spreadsheet software for analysis

**Postconditions**:
- Export file contains requested data
- Campaign manager can analyze data offline
- Export remains available for future downloads

**Business Rules Applied**:
- Exports are asynchronous (large datasets take time)
- Exports include PII (phone, email) - access is restricted to authorized users
- Export data reflects point-in-time snapshot (not real-time)

---

## User Journey Map

**Campaign Lifecycle Journey:**

1. **Planning Phase** → Campaign manager receives artist presale request from marketing team
2. **Setup Phase** → Campaign manager creates campaign in admin-ui, configures markets, content, branding
3. **Testing Phase** → Campaign manager previews campaign on fan-ui, tests registration flow
4. **Launch Phase** → Campaign manager opens campaign, fans begin registering
5. **Monitoring Phase** → Campaign manager tracks registration metrics, adjusts if needed
6. **Close Phase** → Campaign closes automatically at configured close date
7. **Selection Phase** → Campaign manager triggers selection algorithm
8. **Distribution Phase** → Operations team uploads codes, assigns codes to selected fans
9. **Notification Phase** → Operations team schedules and sends waves with codes
10. **Presale Phase** → Fans use codes to access presale tickets on ticketmaster.com
11. **Analysis Phase** → Campaign manager exports data, generates reports for stakeholders

---

## Key Workflows

### Workflow 1: End-to-End Campaign Setup and Execution

1. **Create Campaign**: Campaign manager creates campaign with artist, dates, markets, content
2. **Configure Options**: Set password gates, linked account requirements, scoring rules
3. **Upload Assets**: Upload branding images (artist photo, tour logo)
4. **Save as Draft**: Save campaign without publishing
5. **Preview**: Preview campaign on fan-facing UI
6. **Open Campaign**: Change status to "Open" to accept registrations
7. **Monitor Registrations**: Track metrics in real-time
8. **Close Campaign**: Campaign closes automatically at close date
9. **Upload Scoring** (optional): Upload fanlist with custom scores if using scored selection
10. **Trigger Selection**: Run selection algorithm to choose fans
11. **Upload Codes**: Upload presale codes to campaign
12. **Assign Codes**: Create wave prep to assign codes to selected fans
13. **Schedule Notifications**: Schedule SMS/email waves to notify fans
14. **Send Waves**: Waves are sent at scheduled time
15. **Monitor Distribution**: Track code assignment and notification delivery
16. **Export Data**: Generate reports for stakeholders

---

### Workflow 2: Code Distribution with Wave Scheduling

1. **Upload Codes**: Operations team uploads CSV file with codes to campaign
2. **System Validates**: Codes are parsed and stored with type (offer, presale, etc.)
3. **Create Wave Prep**: Operations team configures wave prep for specific date/market
4. **System Assigns Codes**: Backend assigns codes from pool to selected fans
5. **Review Assignments**: Operations team verifies assignment counts
6. **Schedule Wave**: Operations team uploads recipient list and schedules notification
7. **System Queues Wave**: Wave is queued for send at specified time
8. **Send Notification**: At scheduled time, SMS/email sent to fans with codes
9. **Update Status**: Wave status changes to "sent", code status changes to "distributed"
10. **Monitor Results**: Operations team checks delivery reports

---

### Workflow 3: Campaign Metrics Monitoring

1. **Open Metrics Tab**: Campaign manager navigates to campaign metrics
2. **View Entries**: System displays registration counts by market
3. **Analyze Trends**: Campaign manager reviews entry trend chart
4. **Check Scoring**: If scored campaign, review score distribution
5. **Filter by Market**: Focus on specific geographic markets
6. **Export Snapshot**: Download metrics for offline analysis
7. **Identify Issues**: Spot low registration rates or verification problems
8. **Adjust Strategy**: If needed, extend campaign dates or increase marketing

---

## Example Scenarios

### Scenario 1: High-Demand Artist Presale (Taylor Swift Tour)

- **Context**: Taylor Swift announces stadium tour. Expected 500K+ registrations. Limited to 50K presale codes.
- **Campaign Setup**: Campaign manager creates campaign with 10 markets (US cities), 5K quota per market. Scoring enabled to prioritize superfans.
- **Registration Phase**: Fans register over 7-day period. Campaign manager monitors daily registration counts.
- **Selection**: After close, campaign manager triggers selection. Algorithm selects top 5K fans per market based on fan score.
- **Distribution**: Operations team uploads 50K unique presale codes, assigns via wave prep.
- **Notification**: Scheduled wave sent 2 days before presale. Fans receive SMS with unique code.
- **Outcome**: 50K fans get presale access. Campaign metrics exported for marketing analysis.

---

### Scenario 2: Fanlist-Only Presale (Small Venue)

- **Context**: Indie artist playing small 500-capacity venue. Only official fanlist members should get codes.
- **Campaign Setup**: Campaign manager creates fanlist campaign type. Uploads CSV of fanlist members with scores (1-100 based on membership tier).
- **Registration**: Fanlist members register. Non-members cannot access (invite-only gate).
- **Selection**: Campaign manager triggers selection. Top 500 scorers selected.
- **Distribution**: Operations team assigns codes, sends notification immediately.
- **Outcome**: Only verified fanlist members receive codes. Fair distribution based on loyalty score.

---

### Scenario 3: Multi-Market International Campaign

- **Context**: Artist touring North America (US, Canada, Mexico). Need separate quotas and localized content per country.
- **Campaign Setup**: Campaign manager creates campaign with 3 markets (US, CA, MX). Content localized in English, French, Spanish.
- **Selection**: Different quotas per market (US: 10K, CA: 3K, MX: 2K).
- **Distribution**: Separate wave preps per market to respect local timezones.
- **Notification**: Waves scheduled at 9am local time per market timezone.
- **Outcome**: Fans receive codes in their local language and time.

---

### Scenario 4: Emergency Blacklist Upload

- **Context**: Operations team identifies fraudulent accounts registering for multiple campaigns.
- **Action**: Operations team compiles list of fraudulent phone numbers.
- **Blacklist Upload**: Uploads CSV to admin-ui blacklist section.
- **Immediate Effect**: Backend processes upload within minutes.
- **Selection Re-run**: Campaign manager re-runs selection for active campaign.
- **Outcome**: Fraudulent accounts excluded. Codes not wasted on bots/scalpers.

---

### Scenario 5: Campaign Extension Due to Low Registration

- **Context**: Campaign manager notices registration rate is below target 3 days before close.
- **Action**: Campaign manager edits campaign to extend close date by 5 days.
- **System Update**: Campaign close date updated. Fans now have more time to register.
- **Marketing Push**: Marketing team increases promotion during extended period.
- **Outcome**: Registration reaches target quota. Selection can proceed as planned.
