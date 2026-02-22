# Use Cases & Workflows - admin-ui-next

## Primary Use Cases

### Use Case 1: Create and Configure a New Campaign

**Actor**: Campaign Manager (Admin User)

**Goal**: Set up a new Verified Fan registration campaign for an artist's tour

**Preconditions**:
- User is authenticated with admin privileges
- Artist information exists in the system
- Tour dates and venues are confirmed

**Main Flow**:
1. Admin navigates to Campaigns page via sidebar navigation
2. Admin searches for existing campaigns or prepares to create a new one
3. Admin configures campaign metadata:
   - Campaign name and artist
   - Campaign open/close dates
   - Presale window dates
   - General onsale date
   - Reference timezone
   - Locales/countries
   - Domain slug (URL identifier)
4. Admin configures campaign styling (theme colors, images)
5. System validates configuration and saves to backend via GraphQL mutation
6. Campaign appears in campaigns list with status indicator

**Postconditions**:
- New campaign is created and visible to other admins
- Campaign is accessible via unique domain slug
- Campaign status reflects current state (upcoming/active/closed)

**Business Rules Applied**:
- Campaign must have unique domain slug
- Reference timezone determines how all date windows are interpreted
- Campaign window must encompass presale window
- Only admin users can create campaigns

---

### Use Case 2: Add Events (Markets) to Campaign

**Actor**: Campaign Manager (Admin User)

**Goal**: Link specific concert events to a registration campaign

**Preconditions**:
- Campaign already exists
- Ticketmaster event IDs are available
- Venue information is known

**Main Flow**:
1. Admin navigates to campaign detail page
2. Admin clicks to Events tab/section in campaign sidebar
3. Admin clicks "Add Event" button
4. Admin searches for venue using venue search (autocomplete)
5. Admin enters event details:
   - Event name
   - Event date and presale date
   - Ticketmaster event IDs (comma-separated)
   - Venue information (populated from search)
   - City, state, timezone
   - Ticketer (TM/AXS/etc)
   - Event link URL
   - Presale code information
   - Split allocation settings (if applicable)
6. Admin selects associated promoters from dropdown
7. System validates event data
8. System calls `upsertMarket` GraphQL mutation
9. Event appears in campaign's events list

**Postconditions**:
- Event is linked to campaign
- Event data is saved with all metadata
- Promoter associations are established
- Event is visible in campaign events table

**Business Rules Applied**:
- Events must have valid Ticketmaster event IDs
- Event dates should align with campaign windows
- Multiple promoters can be associated with single event
- Event timezone may differ from campaign reference timezone

---

### Use Case 3: Manage Promoters

**Actor**: Operations Administrator

**Goal**: Create or update promoter records with privacy policy URLs

**Preconditions**:
- User has admin access
- Promoter legal information is available

**Main Flow**:
1. Admin navigates to Promoters page via sidebar
2. Admin views list of existing promoters with names and privacy URLs
3. Admin clicks "Create Promoter" or selects existing promoter to edit
4. Admin enters/updates promoter information:
   - Promoter name
   - Privacy policy URLs for each required locale (e.g., en_US, fr_CA, es_MX)
   - Default locale flag
5. System validates that at least one default locale URL exists
6. System calls `upsertPromoter` GraphQL mutation
7. Promoter record is saved
8. Promoter becomes available for association with events

**Postconditions**:
- Promoter record exists with localized privacy URLs
- Promoter appears in promoters list
- Promoter is available for selection when creating events
- Privacy policies are accessible via correct locale URLs

**Business Rules Applied**:
- At least one privacy URL must be marked as default
- Privacy URLs must be valid HTTP/HTTPS URLs
- Promoters can be reused across multiple campaigns and events

---

### Use Case 4: Monitor Campaign Status and Lifecycle

**Actor**: Campaign Manager, Support Staff

**Goal**: Track campaign progress through its lifecycle and identify issues

**Preconditions**:
- Campaigns exist in the system
- User has admin access

**Main Flow**:
1. Admin navigates to Campaigns list page
2. System displays table with campaigns showing:
   - Campaign name and tour name
   - Domain slug
   - Created date
   - Campaign window dates
   - Presale window dates
   - Status badge (visual indicator)
3. Admin uses search/filter to find specific campaigns
4. Admin uses pagination to browse large campaign lists
5. Admin clicks campaign name to view detailed information
6. Campaign detail page shows:
   - Full date timeline
   - Artist and tour information
   - Locales and countries
   - Theme colors
   - Associated events count
7. Admin identifies campaigns needing attention based on status

**Postconditions**:
- Admin has visibility into campaign health
- Time-sensitive campaigns are identified
- Issues or configuration gaps are visible

**Business Rules Applied**:
- Status reflects current date relative to campaign windows
- Campaigns sorted by creation date by default
- Recent campaigns appear in sidebar for quick access

---

### Use Case 5: Delete or Modify Events

**Actor**: Campaign Manager

**Goal**: Remove events from campaign or update event details

**Preconditions**:
- Campaign exists with events
- User has admin privileges

**Main Flow**:
1. Admin navigates to campaign events list
2. Admin selects event(s) via checkbox
3. Admin clicks delete button
4. System prompts for confirmation
5. Admin confirms deletion
6. System calls `deleteMarket` GraphQL mutation
7. Event is removed from campaign
8. Events list refreshes without deleted event

**Alternate Flow - Edit Event**:
1. Admin clicks "Edit" link on event row
2. Event form pre-populates with current data
3. Admin modifies event details
4. System calls `upsertMarket` mutation with updated data
5. Event data is updated in backend
6. Events list shows updated information

**Postconditions**:
- Event is removed from or updated in campaign
- Campaign events count is updated
- Changes persist across page refreshes

**Business Rules Applied**:
- Deleting event does not delete underlying Ticketmaster event, only the campaign association
- Multiple events can be deleted in batch
- Event history is maintained in backend audit logs

---

## User Journey Map

**Campaign Creation Journey:**
1. Admin logs in via Ticketmaster Identity
2. System verifies admin status and grants access
3. Admin browses existing campaigns to check for duplicates
4. Admin creates new campaign with artist and tour information
5. Admin configures campaign windows, locales, and styling
6. Admin adds events (markets) one by one or in bulk
7. Admin associates promoters with each event
8. Admin reviews complete campaign configuration
9. Admin shares campaign preview URL with stakeholders
10. Campaign goes live according to configured open date
11. Admin monitors campaign during active period
12. Campaign closes automatically or is manually closed

## Key Workflows

### Workflow 1: Multi-Market Tour Setup
**Business Process**: Configure a national/international tour with 20+ cities

1. **Campaign Creation**: Admin creates parent campaign with tour details, date range spanning all tour dates
2. **Batch Event Entry**: Admin methodically adds each tour stop as a market:
   - Searches venue
   - Enters show-specific dates and event IDs
   - Associates local promoters
   - Configures market-specific presale codes
3. **Regional Promoter Mapping**: Admin ensures correct promoters are linked based on territorial rights
4. **Locale Configuration**: Admin enables appropriate locales for international shows (e.g., French for Canadian dates)
5. **Quality Check**: Admin reviews events list to verify all markets are configured correctly
6. **Preview and Launch**: Admin uses preview URLs to validate campaign appearance before open date

### Workflow 2: Campaign Monitoring and Support
**Business Process**: Daily operations monitoring active campaigns

1. **Daily Dashboard Review**: Admin opens campaigns list to see all active campaigns
2. **Status Triage**: Admin identifies campaigns approaching presale windows or close dates
3. **Event Issue Resolution**: Admin receives report of incorrect event ID → navigates to campaign → edits event → updates ID → saves
4. **Promoter Privacy Update**: Legal team updates privacy policy → Admin opens promoter record → updates URL → saves
5. **Campaign Extension**: Artist adds show dates → Admin adds new markets to existing campaign
6. **Reporting**: Admin uses campaign detail view to gather metrics for stakeholder reports

### Workflow 3: Promoter Compliance Management
**Business Process**: Maintain promoter privacy policy compliance across regions

1. **Quarterly Compliance Audit**: Admin reviews all promoter records
2. **URL Validation**: Admin clicks through privacy URLs to verify they're accessible
3. **Locale Updates**: New regions require new locales → Admin adds locale-specific privacy URLs to promoter records
4. **Promoter Consolidation**: Promoter company merges → Admin updates promoter associations on affected events
5. **New Promoter Onboarding**: New venue partnership → Admin creates new promoter record → associates with upcoming events

## Example Scenarios

### Scenario 1: High-Profile Artist Tour Launch
**Context**: Major artist announces 30-city North American tour. Verified Fan campaign needed in 3 days.

**Workflow**:
- Day 1: Campaign manager creates campaign, configures main settings (windows, locales, theme matching artist brand colors)
- Day 2: Operations team adds all 30 markets, each with specific event IDs, venues, presale dates
- Day 2: Team associates promoters with events based on regional territories (e.g., Live Nation events in certain markets, AEG in others)
- Day 3: QA team reviews campaign in preview mode, validates all event links and dates
- Day 3: Campaign goes live at configured open date - fans begin registering
- Week 1-2: Campaign manager monitors through presale window, makes no changes to avoid disrupting active registrations
- Post-presale: Campaign auto-closes, team archives and begins next campaign

### Scenario 2: Event ID Correction During Active Campaign
**Context**: Campaign is live. Support ticket reports wrong Ticketmaster event ID for Chicago show - fans receiving wrong event in confirmation emails.

**Workflow**:
- Support escalates to campaign operations
- Admin logs into Admin UI, navigates to campaign → Events
- Admin locates Chicago market in events list
- Admin clicks Edit, sees current (incorrect) event IDs
- Admin updates event IDs field with correct Ticketmaster event ID
- Admin saves, triggering `upsertMarket` mutation
- Backend updates event association immediately
- Future registrations now link to correct event
- Support team coordinates with fans who registered during error window

### Scenario 3: International Campaign with Multi-Locale Setup
**Context**: Artist tour spans US, Canada, Mexico, requiring English, French, and Spanish locales.

**Workflow**:
- Admin creates campaign with all three locales enabled (en_US, fr_CA, es_MX)
- Admin configures US events with US-based promoters (English privacy policies)
- Admin configures Canadian events with Canadian promoters, ensuring promoter has both en_CA and fr_CA privacy URLs
- Admin configures Mexico events with Mexico promoters (es_MX privacy URLs)
- Admin verifies each locale by clicking preview links with ?lang= parameter
- Campaign serves correct language and privacy policies based on user's locale selection

### Scenario 4: Emergency Campaign Window Extension
**Context**: Campaign scheduled to close tonight. Artist announces additional show dates. Marketing requests extension.

**Workflow**:
- Admin navigates to campaign detail
- Admin edits campaign close date, extending by 2 weeks
- Admin adds new show events to campaign events list
- Admin saves changes, which update immediately via GraphQL mutations
- Campaign remains open, fans can continue registering
- New shows appear in campaign event list for fans to select
