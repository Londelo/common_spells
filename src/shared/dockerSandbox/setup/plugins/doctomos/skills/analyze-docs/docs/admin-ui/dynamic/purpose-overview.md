# Purpose - admin-ui

## What This Does

Admin-UI is the internal administrative dashboard for Ticketmaster's Verified Fan (VF) platform. It provides campaign management, distribution control, metrics tracking, and selection operations for presale ticketing campaigns. This is a backend admin tool used by campaign managers and operations teams to configure, monitor, and control fan registration campaigns for artist presales.

## Business Context

Verified Fan is Ticketmaster's platform that manages presale access to high-demand concert tickets. When artists want to reward their true fans (not bots or scalpers), they create registration campaigns where fans must sign up and get verified before receiving presale access codes. This admin dashboard is the control center where campaign managers configure those campaigns, manage distribution of access codes, track campaign performance, and select which registered fans receive presale opportunities.

The dashboard serves as the operational nerve center - without it, campaign managers couldn't create campaigns, distribute codes to qualified fans, or monitor registration and selection metrics.

## Target Users/Consumers

**Primary Users:**
- **Campaign Managers** - Create and configure fan registration campaigns for artist presales
- **Operations Teams** - Monitor campaign health, manage code distributions, handle exceptions
- **Marketing Teams** - Track campaign metrics, export data for analysis

**System Consumers:**
- Communicates with **monoql** GraphQL API (backend service handling campaign data)
- Integrates with **fan-ui** (consumer-facing registration portal)
- Integrates with **reg-ui** (registration interface)

## Key Business Capabilities

- **Campaign Creation & Management** - Create, edit, and configure registration campaigns with artist branding, dates, markets, content localization
- **Code Distribution** - Upload presale access codes, assign codes to verified fans via automated waves or manual distribution
- **Fan Selection** - Trigger selection algorithms to choose which registered fans receive presale access based on scoring, quotas, and market constraints
- **Metrics & Reporting** - Real-time visibility into registration counts, selection results, code assignments, and campaign performance
- **Blacklist Management** - Upload and manage blacklisted users who should be excluded from campaigns
- **Market Management** - Configure geographic markets with quotas, distributions, and local settings
- **Wave Management** - Schedule and send SMS/email notification waves to selected fans with presale codes

## Business Requirements & Constraints

- REQ-001: Campaign managers must be able to create campaigns with open/close dates, artist branding, and market configurations
- REQ-002: System must support localized content for multiple countries (US, CA, GB, MX, IE) and languages
- REQ-003: Code assignments must be trackable - every code must be traceable to a specific fan and assignment date
- REQ-004: Selection processes must respect market quotas and scoring rules to ensure fair distribution
- REQ-005: Notifications (SMS/email waves) must be schedulable in advance with timezone awareness
- REQ-006: Campaign metrics must be available in real-time for monitoring registration and selection progress
- REQ-007: Exports must support data analysis - campaign managers need CSV/JSON exports of registrants, selections, and distributions
- REQ-008: System must prevent blacklisted users from receiving codes or selection
- REQ-009: Campaign drafts must be savable without publishing to allow iterative configuration
- REQ-010: Authentication required - only authorized Ticketmaster personnel can access admin functions

## Core Business Rules

- **Campaign Lifecycle**: Campaigns progress through states: Draft → Open → Closed → Finished. Operations are restricted based on state.
- **Selection Rules**: Fans must be registered and verified before selection. Selection respects scoring algorithms (if configured), market quotas, and min/max score thresholds.
- **Code Assignment**: Each code can only be assigned once. Codes are linked to specific markets and campaigns. Assignment cannot be undone once a wave is sent.
- **Wave Scheduling**: Waves cannot be edited or cancelled within a certain time window before the scheduled send time (business rule to prevent operational errors).
- **Market Quotas**: Total selected fans across all markets cannot exceed campaign capacity. Individual markets have their own quotas.
- **Blacklist Enforcement**: Blacklisted phone numbers or emails are automatically excluded during selection and code assignment processes.
- **Scoring Logic**: Campaigns can use custom scoring (fanlist uploads with scores) or default algorithms. Higher scores receive priority during selection when quotas are limited.
- **Timezone Handling**: All campaign dates use a configurable reference timezone. Wave notifications respect recipient local timezones when specified.

## Integration Points

### Outbound (what we notify/send to other systems)

| Trigger | Event/Action | Recipient | When |
|---------|-------------|-----------|------|
| Campaign saved | Save campaign data | MonoQL GraphQL API | On every campaign create/update |
| Code upload | Upload codes to campaign | MonoQL GraphQL API | When campaign manager uploads code CSV |
| Selection triggered | Trigger fan selection process | MonoQL GraphQL API | Manual trigger by campaign manager |
| Wave scheduled | Schedule notification wave | MonoQL GraphQL API | When wave is scheduled for future send |
| Wave cancelled | Cancel scheduled wave | MonoQL GraphQL API | When campaign manager cancels wave before send |
| Export scheduled | Request data export | MonoQL GraphQL API | When campaign manager requests export |
| Blacklist uploaded | Upload blacklist file | MonoQL GraphQL API | When operations team uploads blacklist CSV |
| Image uploaded | Upload campaign images | Image CDN (via GraphQL) | When campaign manager uploads branding images |
| Stats updated | Update campaign statistics | MonoQL GraphQL API | Real-time as metrics change |

### Inbound (what events we respond to)

This is a **poll-based frontend application**. The admin UI does not consume events directly, but rather polls the GraphQL API to check for state changes:

| Source | Data Polled | Action | Timing |
|--------|-------------|--------|--------|
| MonoQL API | Campaign list | Refresh campaign table | On page load, after create/update |
| MonoQL API | Campaign details | Load campaign for editing | When campaign manager selects campaign |
| MonoQL API | Selection stats | Display selection progress | Poll every 3 seconds during active selection |
| MonoQL API | Wave status | Show wave processing state | Poll every 1-10 seconds during upload/processing |
| MonoQL API | Metrics data | Display entry/scoring metrics | Poll every few seconds when metrics page open |
| MonoQL API | Export status | Check if export ready for download | Poll periodically after export request |
| MonoQL API | User authentication | Verify admin login status | On app init, periodic polling |

### Service Dependencies

**Critical Dependencies:**
- **MonoQL GraphQL API** - All data operations (CRUD campaigns, metrics, selections, distributions)
- **Identity Service** (via GraphQL) - User authentication and authorization
- **Image CDN** - Campaign image storage (main, mobile, email images)

**Operational Dependencies:**
- **fan-ui** - Campaign managers need to preview fan-facing registration pages (links generated)
- **reg-ui** - Alternative registration interface (links generated)

**Deployment Dependencies:**
- **AWS S3** - Static asset hosting
- **Kubernetes** - Container orchestration (kube configs present)
- **Prometheus** - Metrics collection (system metrics exported)

## Success Metrics

**Operational Metrics:**
- Campaign creation success rate > 99% (no errors during save)
- API response time < 500ms (p95) for campaign loads
- Selection processing completes within 30 minutes for campaigns with <100K registrants
- Wave upload and scheduling success rate > 99.5%

**Business Metrics:**
- Campaign managers can create and launch campaigns in < 30 minutes (measured by avg time from draft to open)
- Zero unauthorized code distributions (blacklist enforcement 100% effective)
- Real-time metrics lag < 5 seconds (stats reflect current state)
- Export generation completes within 10 minutes for standard exports

**User Experience:**
- Admin users can find campaigns via search in < 3 seconds
- Form validation prevents invalid campaign configurations before save
- Loading indicators appear for all async operations > 1 second
- Error messages provide actionable guidance for remediation
