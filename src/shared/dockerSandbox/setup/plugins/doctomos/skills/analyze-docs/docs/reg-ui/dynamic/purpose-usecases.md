# Use Cases & Workflows - reg-ui

## Primary Use Cases

### Use Case 1: Fan Registers for Concert Presale

**Actor**: Music fan (end user)

**Goal**: Register for artist tour presale to receive unique presale codes for selected concert markets

**Preconditions**:
- Campaign is in OPEN status
- Current time is within campaign's open/close window
- Fan has Ticketmaster account (or creates one during process)
- Campaign data cached in Redis

**Main Flow**:
1. Fan navigates to campaign URL (e.g., `https://verifiedfan.ticketmaster.com/taylor-swift-tour`)
2. System loads campaign from Redis cache and validates it's open for registration
3. System redirects fan to Ticketmaster Identity login/signup if not authenticated
4. Fan returns to campaign after authentication
5. System checks for existing entry via GraphQL `getEntry` query
6. Fan views registration page with artist hero image, campaign description, countdown timer
7. Fan selects one or more concert markets from available list (checkboxes with venue, date, city)
8. Fan reviews opt-in preferences (artist marketing, Live Nation marketing, SMS, promoter opt-ins)
9. Fan checks required opt-ins and optionally checks optional marketing preferences
10. Fan clicks "Submit" button
11. System validates selections (at least one market, required opt-ins checked)
12. System calls GraphQL `upsertEntry` mutation with market selections and opt-in preferences
13. Backend generates unique presale codes for each selected market
14. System transitions to confirmation page (client state changes from `REGISTRATION` to `CONFIRMATION` page)
15. Fan views confirmation page with selected markets, presale codes, presale window dates, and next steps
16. System sends page view event to Google Analytics

**Postconditions**:
- Entry record created in backend database
- Unique presale codes generated and displayed to fan
- Fan can access confirmation page by returning to campaign URL (redirects to confirmation if entry exists)
- Fan receives confirmation email with presale details (sent by backend service)

**Business Rules Applied**:
- One entry per fan per campaign
- Market selection is required (minimum 1)
- Required opt-ins must be checked
- Campaign must be open for registration to succeed
- Presale codes are unique per fan per market (or shared code if configured)

**Alternative Flows**:
- **Campaign Closed**: Fan sees "Registration Closed" message, cannot submit form
- **Existing Entry**: Fan redirected to confirmation page showing existing selections
- **Validation Errors**: Form displays inline errors for missing markets or required opt-ins
- **API Failure**: Error modal displays with retry option

---

### Use Case 2: Fan Modifies Existing Entry

**Actor**: Registered fan (already has entry in campaign)

**Goal**: Update market selections or opt-in preferences before campaign closes

**Preconditions**:
- Fan has existing entry in open campaign
- Campaign has not yet closed
- Fan is authenticated with same account used for original registration

**Main Flow**:
1. Fan navigates to campaign URL
2. System loads campaign and detects existing entry via `getEntry` query
3. System pre-populates form with existing market selections and opt-in preferences
4. Fan views registration page with "Edit Your Registration" context
5. Fan changes market selections (adds new markets, unchecks previous markets)
6. Fan updates opt-in preferences
7. Fan clicks "Update" button
8. System validates updated selections
9. System calls `upsertEntry` mutation with updated data
10. Backend updates entry record, generates new codes for newly added markets, retains codes for unchanged markets
11. System transitions to confirmation page
12. Fan views updated confirmation with all selected markets and codes

**Postconditions**:
- Entry record updated with new selections and timestamp (`date.fanModified`)
- New presale codes generated only for newly added markets
- Original codes preserved for markets that remained selected

**Business Rules Applied**:
- Can only modify while campaign is open
- Must maintain at least one market selection
- Cannot modify after campaign closes (shows read-only confirmation)
- Code persistence (existing codes not regenerated)

---

### Use Case 3: LNAA Member Activates Membership During Registration

**Actor**: Fan who is dormant LNAA (Live Nation Artist Alliance) member

**Goal**: Register for LNAA presale campaign and activate dormant membership to receive member benefits

**Preconditions**:
- Campaign is LNAA-enabled (`options.isLNAA = true`)
- Fan is authenticated with account linked to LNAA membership
- LNAA membership exists but is in dormant state
- Campaign is open for registration

**Main Flow**:
1. Fan navigates to LNAA campaign URL
2. System authenticates fan and loads campaign
3. System queries GraphQL `getLNAAMemberStatus` to check membership status
4. System detects fan has LNAA membership but is dormant
5. System displays LNAA opt-in checkbox: "Activate your [Artist Name] fan club membership"
6. Fan selects concert markets
7. Fan checks LNAA activation opt-in (required for LNAA campaigns)
8. Fan checks other required opt-ins
9. Fan submits form
10. System calls `upsertEntry` mutation to register entry
11. System calls `activateLNAA` mutation to activate membership
12. Backend activates LNAA membership and applies member benefits
13. System transitions to confirmation page
14. Fan views confirmation with "Fan Club Member" badge and member-specific messaging

**Postconditions**:
- Entry created with LNAA activation flag
- LNAA membership activated (status changed from dormant to active)
- Fan gains access to member benefits (priority presale access, exclusive content)
- Fan can access linked general presale campaigns due to LNAA entry

**Business Rules Applied**:
- LNAA opt-in required for LNAA campaigns
- LNAA activation only available to authenticated members
- Membership status checked before displaying opt-in
- LNAA entry grants access to linked campaigns

---

### Use Case 4: Fan Attempts to Register for Linked Campaign

**Actor**: Fan attempting to register for child campaign

**Goal**: Register for general presale campaign that requires prior entry in linked parent campaign (e.g., LNAA campaign)

**Preconditions**:
- Campaign has `options.gate.linkedCampaign` configured (e.g., LNAA campaign ID)
- Fan is authenticated
- Linked parent campaign exists and is cached

**Main Flow (Success Path - Fan Has Parent Entry)**:
1. Fan navigates to general presale campaign URL
2. System loads campaign and detects `linkedCampaign` gate
3. System queries for fan's entry in parent campaign (via `linkedCampaignId`)
4. System finds valid entry in parent LNAA campaign
5. System displays registration page with option to transfer entry from linked campaign
6. Fan selects markets (can keep markets from LNAA entry or select new ones)
7. Fan submits form with `doTransfer: true` flag
8. System creates entry in current campaign using transferred data
9. System transitions to confirmation page

**Main Flow (Failure Path - No Parent Entry)**:
1. Fan navigates to general presale campaign URL
2. System loads campaign and detects `linkedCampaign` gate
3. System queries for fan's entry in parent campaign
4. System finds no entry in parent LNAA campaign
5. System displays error modal: "You must register for [Artist Name] Fan Club presale first"
6. Fan clicks link to parent campaign
7. Fan redirected to parent LNAA campaign to register

**Postconditions (Success)**:
- Entry created in child campaign
- Market selections and opt-ins transferred from parent entry
- Fan has entries in both parent and child campaigns

**Postconditions (Failure)**:
- No entry created in child campaign
- Fan directed to register in parent campaign first

**Business Rules Applied**:
- Linked campaign gate enforces parent entry requirement
- Entry transfer copies markets and opt-ins from parent to child
- Fan must complete parent campaign registration before accessing child campaign

---

### Use Case 5: Fan Views Confirmation After Campaign Closes

**Actor**: Registered fan returning to closed campaign

**Goal**: View registration confirmation and presale access codes after campaign registration closes

**Preconditions**:
- Fan registered during campaign's open period
- Campaign status is now CLOSED
- Fan is authenticated with same account

**Main Flow**:
1. Fan navigates to campaign URL (or returns via bookmark/email)
2. System loads campaign from cache and validates status is CLOSED
3. System queries for fan's existing entry
4. System finds entry and loads confirmation page with closed campaign context
5. Fan views "Signup Closed" hero message
6. Fan views their selected markets with presale codes
7. Fan views presale window dates and ticketing links
8. Fan views timeline showing: Registration Closed → Presale Window → General Onsale
9. Fan can click ticketing links to access presale pages (during presale window)

**Postconditions**:
- Fan has access to presale codes even after campaign closes
- Fan can return to confirmation page anytime while campaign exists

**Business Rules Applied**:
- Campaign closure prevents new registrations and modifications
- Existing entries remain accessible after closure
- Presale codes remain valid for use during presale window
- Confirmation page content adapts to closed state

---

### Use Case 6: Fan Completes Identity Verification Gate

**Actor**: Fan registering for high-demand IDV-gated campaign

**Goal**: Complete identity verification (IDV) process to register for presale

**Preconditions**:
- Campaign has `options.gate.idv` configured
- Fan is authenticated
- Campaign is open for registration

**Main Flow**:
1. Fan navigates to IDV-gated campaign
2. System loads campaign and detects IDV gate requirement
3. System initializes IDV SDK (`@verifiedfan/idv-sdk`)
4. Fan clicks "Verify Identity" button
5. IDV SDK launches verification flow (facial recognition, liveness check)
6. Fan completes identity verification steps in IDV modal
7. IDV SDK returns success status to application
8. System enables registration form (previously disabled)
9. Fan selects markets and opt-ins
10. Fan submits registration
11. System creates entry with IDV verification flag
12. System transitions to confirmation page

**Alternative Flow (IDV Failure)**:
1. Steps 1-6 as above
2. IDV SDK returns failure status (liveness check failed, image quality issues)
3. System displays error modal: "Identity Verification Failed"
4. Fan can retry IDV process or exit campaign
5. Registration form remains disabled until IDV succeeds

**Postconditions (Success)**:
- Entry created with IDV verification marker
- Fan granted presale access after passing IDV
- IDV verification result stored for campaign

**Postconditions (Failure)**:
- No entry created
- Fan must retry IDV or cannot register

**Business Rules Applied**:
- IDV gate blocks registration until verification succeeds
- Failed IDV attempts allow retry with user intervention
- IDV verification required for high-demand campaigns to prevent fraud

---

## User Journey Map

### Standard Fan Registration Journey

1. **Discovery**: Fan learns about presale opportunity via artist social media, email, or word of mouth
2. **Campaign Access**: Fan visits campaign URL or clicks link from marketing email
3. **Authentication**: Fan logs in or creates Ticketmaster account (if not already authenticated)
4. **Campaign View**: Fan lands on registration page, sees artist branding, hero image, campaign description
5. **Information Review**: Fan reads FAQs, reviews timeline, checks presale window dates
6. **Market Selection**: Fan browses available concert markets, selects preferred shows by city/date
7. **Opt-In Review**: Fan reviews marketing opt-ins, privacy policies, terms of use
8. **Consent**: Fan checks required opt-ins, optionally opts into marketing communications
9. **Submission**: Fan submits registration form
10. **Confirmation**: Fan views success confirmation with presale codes displayed prominently
11. **Retention**: Fan bookmarks confirmation page or saves presale codes
12. **Reminder**: Fan receives confirmation email with presale details (sent by backend)
13. **Presale Access**: Fan returns during presale window, uses codes to access presale tickets
14. **Purchase**: Fan clicks ticketing link, enters presale code, purchases tickets

### Returning Fan Journey (Entry Modification)

1. **Return**: Fan navigates back to campaign URL before campaign closes
2. **Entry Detection**: System detects existing entry, pre-fills form with selections
3. **Review**: Fan reviews current market selections
4. **Modification**: Fan adds or removes markets, updates opt-ins
5. **Update**: Fan submits updated form
6. **Re-Confirmation**: Fan views updated confirmation with new/retained codes

---

## Key Workflows

### Workflow 1: Campaign Loading and Cache Hydration

**Purpose**: Load campaign data efficiently from Redis cache and prepare for rendering

**Steps**:
1. **URL Parsing**: Next.js catch-all route `[...path]` captures campaign slug from URL path
2. **Slug Extraction**: System extracts slug and query params (draft, queueit)
3. **Locale Resolution**: System determines target locale from campaign settings and user browser preference
4. **Cache Lookup**: System calls `cache.getCampaign(slug)` to retrieve campaign from Redis
5. **Cache Miss**: If campaign not in cache, return 404 (campaigns populated by external service)
6. **Campaign Validation**: System validates campaign schema version (must be v2.x)
7. **Campaign Transformation**: System transforms campaign content to target locale using `transformCampaign()`
8. **Linked Campaign Lookup**: If campaign has linked campaign gate, fetch linked campaign from cache
9. **Access Validation**: System validates user has access (draft token for preview, etc.)
10. **Redirect Logic**: System checks if user should be redirected to different locale or confirmation page
11. **Server Rendering**: System renders page with campaign data via React Server Components
12. **Client Hydration**: Client-side store hydrated with campaign data on page load

**Data Transformations**:
- Campaign content (FAQs, landing, confirmation) transformed from multi-locale object to single target locale
- Date fields formatted according to campaign's reference timezone
- Privacy URLs resolved to locale-specific versions
- Market events enriched with promoter data

---

### Workflow 2: Fan Entry Creation and Code Generation

**Purpose**: Register fan for presale, generate unique codes, persist entry

**Steps**:
1. **Form Validation**: Client validates market selection (>= 1) and required opt-ins checked
2. **Submission Start**: User clicks submit, system sets `isSubmitting` state to disable form
3. **Entry Payload Build**: System constructs entry object with selected markets, opt-ins, locale
4. **GraphQL Mutation**: System calls `upsertEntry` mutation with entry payload
5. **Backend Validation**: AppSync validates campaign is open, fan authenticated, entry valid
6. **Code Generation**: Backend generates unique presale codes for each selected market
7. **Entry Persistence**: Backend writes entry record to database with codes
8. **Response Return**: Backend returns entry record with generated codes
9. **State Update**: Client updates Zustand store with user data (codes, markets, hasEntry: true)
10. **Page Transition**: Client transitions from REGISTRATION to CONFIRMATION page
11. **Analytics Event**: Client sends page view event to Google Tag Manager
12. **Confirmation Render**: Client renders confirmation page with codes displayed

**Data Flow**:
- **Input**: Form state (markets: string[], opt-ins: boolean[])
- **Transformation**: Form data → GraphQL entry payload (JSON string)
- **Output**: Entry record with codes (campaignId, markets, codes[], date.fanModified)
- **Display**: Confirmation page shows codes mapped to market names

---

### Workflow 3: LNAA Membership Activation

**Purpose**: Activate dormant LNAA membership during campaign registration

**Steps**:
1. **Membership Check**: On page load, system queries `getLNAAMemberStatus` if campaign is LNAA-enabled
2. **Status Resolution**: System determines if fan is non-member, active member, or dormant member
3. **UI Update**: If dormant member, display LNAA opt-in checkbox; if active, show member badge
4. **Opt-In Selection**: Fan checks LNAA activation checkbox during registration
5. **Form Submission**: Fan submits form with LNAA opt-in selected
6. **Entry Creation**: System calls `upsertEntry` mutation to register entry with LNAA flag
7. **Activation Call**: System calls `activateLNAA` mutation to activate membership
8. **Backend Processing**: Backend activates membership in LNAA system, updates member status
9. **Confirmation**: System displays confirmation with LNAA member badge and messaging
10. **Linked Access**: Fan gains access to linked general presale campaigns due to LNAA entry

---

### Workflow 4: Multi-Locale Content Transformation

**Purpose**: Serve campaign content in user's preferred language/locale

**Steps**:
1. **Locale Detection**: System reads `Accept-Language` header from browser
2. **Campaign Locales**: System loads supported locales from campaign configuration
3. **Locale Matching**: System finds best match using `@verifiedfan/locale` fallback logic (e.g., `fr-CA` → `fr-FR` → `en-US`)
4. **Content Transformation**: System extracts content for target locale from campaign.content object
5. **FAQ Transformation**: System extracts FAQs for target locale, falls back to en-US for missing entries
6. **URL Transformation**: System resolves privacy URLs, terms URLs to locale-specific versions
7. **Custom Terms**: System applies locale-specific terminology overrides from `messages/terms/`
8. **Translation Loading**: Next-intl loads translation messages from `messages/{locale}.json`
9. **Rendering**: System renders page with localized content, dates formatted per locale conventions
10. **Client Display**: User sees campaign entirely in their preferred language

**Supported Locales** (20+ languages):
- North America: `en-US`, `en-CA`, `fr-CA`, `es-MX`
- Europe: `en-GB`, `de-DE`, `fr-FR`, `es-ES`, `it-IT`, `nl-NL`, `pl-PL`, `pt-PT`
- Latin America: `es-AR`, `es-CL`, `es-CO`, `pt-BR`
- Asia-Pacific: `en-AU`, `en-NZ`

---

### Workflow 5: Promoter Opt-In Dynamic Generation

**Purpose**: Display promoter-specific opt-in checkboxes based on selected markets

**Steps**:
1. **Market Selection**: Fan selects one or more concert markets
2. **Promoter Extraction**: System extracts unique promoter IDs from selected markets' `promoterIds` arrays
3. **Promoter Lookup**: System queries Redis cache for promoter metadata using `cache.getPromoters(promoterIds)`
4. **Promoter Enrichment**: System enriches markets with promoter names and privacy URLs
5. **Opt-In Generation**: System generates opt-in checkbox for each unique promoter
6. **Privacy Policy Resolution**: System resolves promoter privacy policy URL to user's locale
7. **UI Update**: Client displays promoter opt-ins below standard marketing opt-ins
8. **Selection Change**: If fan deselects markets, associated promoter opt-ins auto-update
9. **Form Submission**: System includes promoter opt-in selections in entry payload
10. **Backend Persistence**: Backend stores promoter opt-in consents linked to entry

**Example**:
- Fan selects markets: Chicago (Live Nation), Los Angeles (AEG)
- System displays opt-ins: "☐ Receive updates from Live Nation" and "☐ Receive updates from AEG Presents"
- Each opt-in links to respective promoter's privacy policy

---

## Example Scenarios

### Scenario 1: Taylor Swift Eras Tour Registration

**Context**: High-demand stadium tour with multi-market registration, LNAA presale followed by general presale

**Flow**:
1. Fan visits `https://verifiedfan.ticketmaster.com/taylorswift-eras-tour`
2. Campaign loads with Taylor Swift branding, hero image, countdown timer showing 3 days until close
3. Fan logs in with Ticketmaster account
4. Fan views 50+ available concert markets across North America
5. Fan selects 4 markets: Los Angeles (2 shows), Chicago, Nashville
6. Fan checks required opt-ins: Artist Marketing, Live Nation Marketing
7. Fan submits registration
8. System generates 4 unique presale codes (one per selected market/show)
9. Fan views confirmation: "You're Registered! Check your email for presale details."
10. Confirmation displays 4 markets with codes: `LA-NIGHT1-ABC123`, `LA-NIGHT2-DEF456`, `CHICAGO-GHI789`, `NASH-JKL012`
11. Fan receives confirmation email with presale access instructions
12. Three days later: Campaign closes, fan can still view confirmation
13. Presale window opens: Fan uses codes to access presale on Ticketmaster.com
14. Fan successfully purchases tickets for 2 shows using presale codes

**Business Value**: 3+ million fans registered across tour, fair distribution of presale access, demand data informs tour routing

---

### Scenario 2: Indie Artist Fan Club Exclusive Presale (LNAA)

**Context**: Small theater tour with LNAA fan club members getting exclusive presale access

**Flow**:
1. Fan who purchased fan club membership last year (now dormant) visits campaign URL
2. Campaign loads with "Fan Club Presale" branding
3. Fan authenticates with Ticketmaster account
4. System detects dormant LNAA membership, displays: "Activate your [Artist] Fan Club membership to access presale"
5. Fan selects 3 intimate venue markets: Brooklyn, Seattle, Portland
6. Fan checks LNAA activation opt-in: "Activate my fan club membership" (required)
7. Fan checks optional artist SMS opt-in for setlist updates
8. Fan submits form
9. System creates entry and activates LNAA membership
10. Confirmation displays: "Welcome Back, Fan Club Member!" with member badge
11. Fan receives priority presale codes and early access (24 hours before general presale)
12. Two days later: General presale campaign opens for non-members
13. Fan's LNAA entry grants automatic access to general presale campaign (linked campaign)
14. Fan can register for additional shows in general presale without re-verifying

**Business Value**: Fan club revenue increases, loyal fans rewarded with priority access, artist builds direct fan relationships

---

### Scenario 3: Arena Tour with Split Allocation and Shared Codes

**Context**: Large arena tour with multiple artists, some markets have split presale allocations (concurrent vs sequential)

**Flow**:
1. Fan visits campaign for "Summer Festival Tour"
2. Campaign displays 20 markets, fan notices some markets show "Split Presale" badge
3. Fan selects Chicago market (concurrent split allocation: 50% via Ticketmaster presale code, 50% via venue website)
4. Fan selects Denver market (sequential split allocation: presale 1 on Monday, presale 2 on Wednesday)
5. Fan selects Dallas market (single shared presale code for all registrants)
6. Fan submits registration
7. **Chicago**: System generates unique presale code + displays: "50% of tickets available via this code, 50% via venue link"
8. **Denver**: System generates code for presale 1 + shows presale 2 access instructions: "If unsuccessful on Oct 15, access presale 2 on Oct 17"
9. **Dallas**: System displays shared code used by all fans: `SUMMER2024` (not unique)
10. Confirmation page explains split allocation rules for each market
11. Fan uses unique code for Chicago on Ticketmaster (competes for 50% of allocation)
12. If unsuccessful, fan clicks venue link to access remaining 50% allocation
13. Fan uses sequential codes for Denver presale 1, then presale 2 if needed

**Business Value**: Complex presale configurations supported, multiple ticketing partners accommodated, clear fan communication reduces confusion

---

### Scenario 4: International Tour with Locale-Specific Content

**Context**: Global stadium tour with region-specific campaigns in multiple languages

**Flow**:
1. **France**: Fan visits campaign, browser locale is `fr-FR`
2. System loads campaign, transforms content to French locale
3. Fan sees: Hero text in French, FAQs in French, privacy policy links to French GDPR-compliant policy
4. Fan selects Paris market, reviews opt-ins in French
5. Fan submits registration with French consent language
6. **Mexico**: Fan visits same tour campaign, browser locale is `es-MX`
7. System transforms campaign content to Mexican Spanish
8. Fan sees: Mexico City market, Spanish FAQs, privacy policy compliant with Mexican data protection laws
9. Fan registers with Spanish locale, receives confirmation email in Spanish
10. **Canada**: Fan in Quebec visits with `fr-CA` locale
11. System falls back to `fr-FR` for missing French-Canadian translations
12. Fan sees bilingual market names (Montreal - Montréal), Canadian privacy policy
13. Fan registers, receives codes, confirmation in Canadian French

**Business Value**: Global scalability, regulatory compliance per region, improved fan experience in native language
