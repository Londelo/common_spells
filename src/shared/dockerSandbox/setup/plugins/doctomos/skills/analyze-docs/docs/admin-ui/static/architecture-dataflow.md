# Data Flow - admin-ui

## Primary Flow

The admin-ui follows the **Redux/Saga unidirectional data flow pattern** for a React single-page application with server-side rendering:

**High-Level Flow**:
```
User Interaction (UI)
  ↓
Action Dispatched (Redux)
  ↓
Saga Intercepts (Side Effects) ──→ GraphQL API Call
  ↓                                       ↓
Action Dispatched (Success/Error) ←───────┘
  ↓
Reducer Updates State
  ↓
Selectors Read State
  ↓
Components Re-render
  ↓
User Sees Updated UI
```

## Application Initialization Flow

**1. Server Start** (`server/src/index.js`):
```
Koa Server Starts
  ↓
Middleware Chain Loaded
  ↓
Router Registered
  ↓
Server Listens on Port 8990
```

**2. User Navigates to `/ui`**:
```
HTTP Request
  ↓
Koa Router (server/src/router/index.js)
  ↓
`home` Route Handler
  ↓
Handlebars Template Rendered
  ↓
HTML with React App + window.titanConf
  ↓
Browser Receives HTML
```

**3. Frontend Bootstrap** (`frontend/src/index.jsx`):
```
index.jsx Executes
  ↓
getStore() Creates Redux Store
  ├─ Combines Reducers (main + form)
  ├─ Applies Saga Middleware
  └─ Runs Root Saga
  ↓
ReactDOM.render(<App store={store} />)
  ↓
store.dispatch(initApp({}))
  ↓
initApp Saga Runs
  ├─ Calls GraphQL initApp query
  ├─ Fetches user info
  └─ Dispatches INIT_APP_SUCCESS
  ↓
App Component Renders Routes
  ↓
React Router Matches Current URL
  ↓
Appropriate Component Renders
```

## Request/Response Cycle (Frontend Data Fetching)

### Example: Loading a Campaign

**User Action**: User clicks on a campaign in the list

**1. Navigation**:
```
User Clicks Campaign Link
  ↓
React Router Navigation
  ↓
URL Changes to /ui/campaigns/:id/edit/details
  ↓
Route Matches → CampaignContent Component Mounts
```

**2. Data Loading**:
```
Component useEffect / componentDidMount
  ↓
Dispatch LOAD_CAMPAIGN Action
  ↓
loadCampaign Saga Intercepts
  ↓
saga calls getCampaign({ id }) (graphql/index.js)
  ↓
GraphQL Client (Apollo) Makes HTTP Request
  ↓
External GraphQL API Responds
  ↓
Saga Processes Response
  ↓
Dispatch LOAD_CAMPAIGN_SUCCESS with campaign data
  ↓
Reducer Handles Action (reducers/index.js)
  ↓
State Updated via setCurrentCampaign(state, payload)
  ↓
Selector Returns Campaign from State
  ↓
Component Re-renders with Campaign Data
  ↓
User Sees Campaign Details
```

### Example: Saving a Campaign

**User Action**: User edits campaign and clicks "Save"

**1. Form Submission**:
```
User Clicks Save Button
  ↓
Form onSubmit Handler
  ↓
Dispatch SAVE_CAMPAIGN Action (with campaign data)
  ↓
saveCampaign Saga Intercepts
```

**2. Saga Orchestration** (`sagas/saveCampaign.js`):
```
saveCampaign Saga Runs
  ↓
Show Loading Spinner (dispatch LOADING)
  ↓
Upload Images (if any) → uploadImages utility
  ├─ Converts images to base64
  ├─ Calls uploadImage GraphQL mutation
  └─ Returns image URLs
  ↓
Prepare Campaign Payload
  ↓
Call upsertCampaign GraphQL Mutation
  ↓
GraphQL API Saves Campaign
  ↓
Saga Receives Response
  ↓
Handle Success:
  ├─ Hide Loading Spinner
  ├─ Show Success Message (dispatch SET_ALERT)
  ├─ Reload Campaign Data (dispatch LOAD_CAMPAIGN)
  └─ Navigate to Campaign View
```

**3. State Update**:
```
LOAD_CAMPAIGN_SUCCESS Dispatched
  ↓
Reducer Updates currentCampaign in State
  ↓
Components Re-render
  ↓
User Sees Saved Campaign
```

## State Management

### Redux Store Structure

```javascript
{
  main: {                          // Main application state
    loading: Boolean,              // Global loading state
    loadingMessage: String,        // Loading message text
    alert: Object,                 // Alert/toast message state
    userInfo: Object,              // Current user information
    config: Object,                // Application configuration
    data: {
      campaigns: {
        list: Array,               // Campaign list
        current: Object,           // Currently loaded campaign
        default: Object,           // Default campaign template
      },
      exports: Array,              // Campaign exports list
      scoredLists: Array,          // Scored list uploads
      wavePrepList: Array,         // Wave prep uploads
      waveList: Array,             // SMS waves
      fanlistUploads: Array,       // Fanlist uploads
      codesCount: Object,          // Code distribution counts
      metrics: {
        entries: Object,           // Entry metrics
        scoring: Object,           // Scoring metrics
      },
      selection: Array,            // Selection list data
      faqList: Array,              // FAQ items (deprecated)
      searchSuggestions: Object,   // Search autocomplete data
    },
    editor: {
      page: String,                // Current editor page
      locale: String,              // Current locale in editor
    }
  },
  form: {}                         // Redux-form state
}
```

### Key Selectors (Read State)

| Selector | Purpose |
|----------|---------|
| `getCampaigns` | Get campaign list |
| `getCurrentCampaign` | Get currently loaded campaign |
| `getDefaultCampaign` | Get default campaign template |
| `getEntriesReports` | Get campaign exports |
| `getCodesCount` | Get code distribution counts |
| `getMetrics` | Get campaign metrics |
| `getUserInfo` | Get current user info |
| `isLoading` | Check if loading |

### State Update Flow

```
Action Dispatched
  ↓
All Reducers Check Action Type
  ↓
Matching Reducer Executes
  ↓
Reducer Returns New State (Immutable Update)
  ↓
Store Updates
  ↓
React-Redux notifies Connected Components
  ↓
Selectors Re-run
  ↓
Components Re-render if Selected Data Changed
```

## Event Processing

### Saga Effects Used

The app uses Redux-Saga for handling side effects with these common effects:

| Effect | Usage | Example |
|--------|-------|---------|
| `takeEvery` | Listen for actions, run saga for each | `takeEvery(LOAD_CAMPAIGN, loadCampaignSaga)` |
| `takeLatest` | Cancel previous, run latest | `takeLatest(SAVE_CAMPAIGN, saveCampaignSaga)` |
| `call` | Call async function | `call(getCampaign, { id })` |
| `put` | Dispatch action | `put({ type: LOAD_CAMPAIGN_SUCCESS, payload })` |
| `select` | Read from state | `select(getCurrentCampaign)` |
| `fork` | Start non-blocking task | `fork(pollLoggedIn)` |
| `all` | Run multiple effects in parallel | `all([effect1, effect2])` |

### Example: File Upload Flow

```
User Selects File
  ↓
File Input onChange Event
  ↓
Dispatch UPLOAD_FILE Action (with file, fileType)
  ↓
uploadFile Saga Intercepts
  ↓
Parse File → call(parseFile, { file, fileType })
  ├─ CSV/Excel: PapaParse library
  └─ Returns parsed data
  ↓
Validate Data
  ↓
Show Loading (dispatch LOADING)
  ↓
Call Upload GraphQL Mutation
  ├─ uploadCodes (for promo codes)
  ├─ uploadScored (for scored lists)
  ├─ uploadFanlist (for fanlist)
  └─ uploadWavePrepFile (for wave prep)
  ↓
GraphQL API Processes File
  ↓
Saga Receives Upload Result
  ↓
Dispatch Success Action (e.g., UPLOAD_CODES_SUCCESS)
  ↓
Show Success Message
  ↓
Reload Related List (dispatch LOAD_LIST action)
  ↓
Components Update
```

## External Integrations

### GraphQL API

**Primary Integration**: External GraphQL API (backend service)

| Operation Type | Purpose | Examples |
|----------------|---------|----------|
| Queries | Read data | `initApp`, `getCampaign`, `campaignsList`, `campaignExport` |
| Mutations | Write data | `upsertCampaign`, `upsertMarket`, `uploadCodes`, `uploadImage` |
| Fragments | Reusable query parts | `graphql/fragments/` |

**Connection Setup**:
```javascript
// frontend/src/graphql/index.js
const { uri, tmIdVersion } = window.titanConf.graphql;
const headers = { 'tm-id-version': tmIdVersion };
const { query, mutation } = GraphQL({ uri, headers });
```

**Configuration Source**: `window.titanConf` injected by server during SSR

### Integration Details

| Integration | Direction | Purpose | Implementation |
|-------------|-----------|---------|----------------|
| GraphQL API | Bidirectional | All campaign, metrics, distribution data | Apollo Client in `lib/graphql/` |
| Identity Service | Read/Write | User authentication (v1 & v2) | `frontend/src/identity/` |
| File Storage | Write | Image uploads (S3) | `uploadImage` mutation |
| Metrics Service | Write | Application metrics | `lib/metrics.js` |
| Logging Service | Write | Server logs | `lib/Log/` |

### Authentication Flow

```
User Not Authenticated
  ↓
Server Redirects to Identity Service
  ↓
User Authenticates
  ↓
Identity Service Returns Token
  ↓
Token Stored in Session (server-side)
  ↓
Frontend Dispatches upsertUser({ token })
  ↓
Saga Calls upsertUser Mutation
  ↓
GraphQL API Validates Token
  ↓
User Info Returned
  ↓
Store Updated (INIT_APP_SUCCESS)
  ↓
App Renders Authenticated Views
```

**Session Polling**:
```
pollLoggedIn Saga Runs (background)
  ↓
Every 30 seconds:
  ├─ Call pollLoggedIn Query
  ├─ Check if still authenticated
  └─ If not authenticated:
      ├─ Dispatch LOGOUT
      └─ Redirect to login
```

## Client-Side Routing Flow

```
User Clicks Link / Types URL
  ↓
React Router Matches Route (App.jsx)
  ↓
Route Component Loads
  ├─ Modal Routes (overlay on top)
  │   ├─ EditCampaignModal (/campaigns/:id/edit)
  │   ├─ WaveModal (/distribution/sms/edit-wave)
  │   └─ Various Upload Modals
  └─ Page Routes (main view)
      ├─ Campaigns List (/campaigns/v1, /campaigns/v2)
      ├─ CampaignContent (/campaigns/:id/edit/details)
      ├─ CampaignDistribution (/campaigns/:id/distribution/*)
      ├─ CampaignMetrics (/campaigns/:id/metrics/*)
      ├─ CampaignScoring (/campaigns/:id/scoring/*)
      ├─ CampaignSelection (/campaigns/:id/selection)
      ├─ CampaignExports (/campaigns/:id/exports)
      ├─ FanlistCampaign (/fanlists/:id)
      ├─ SmsNotifications (/scheduler)
      └─ BlacklistUploader (/blacklist)
  ↓
Component Mounts
  ↓
useEffect / componentDidMount Runs
  ↓
Dispatch Data Loading Actions
  ↓
Sagas Fetch Data
  ↓
Components Render with Data
```

## Data Flow Optimizations

### Caching Strategy
- **GraphQL Fetch Policy**: `network-only` for most queries (always fetch fresh data)
- **No client-side caching**: Every navigation refetches data
- **Rationale**: Admin tools prioritize data freshness over performance

### Loading States
```
Action Dispatched
  ↓
Saga Dispatches LOADING({ toggle: true, message: "Loading..." })
  ↓
Reducer Sets loading: true
  ↓
SpinLoader Component Shows Spinner
  ↓
Async Operation Completes
  ↓
Saga Dispatches LOADING({ toggle: false })
  ↓
Spinner Hides
```

### Error Handling
```
Saga calls GraphQL API
  ↓
API Returns Error
  ↓
Saga Catches Error
  ↓
Dispatch SET_ALERT({ message: error, type: 'error' })
  ↓
MessageAlert Component Shows Toast
  ↓
Dispatch LOADING({ toggle: false })
```

## Concurrent Operations

### Parallel Data Loading
Some sagas load multiple datasets concurrently:

```javascript
// Example: Loading campaign with related data
yield all([
  call(getCampaign, { id }),
  call(codesCount, { campaignId: id }),
  call(wavePrepList, { campaignId: id }),
  call(waveList, { campaignId: id })
]);
```

### Background Tasks
- **Session Polling**: `pollLoggedIn` saga runs in background, checking auth every 30s
- **File Processing**: Large file uploads processed asynchronously via sagas

## Summary

The admin-ui data flow follows a **strict unidirectional pattern** with clear separation of concerns:

- **User interactions** trigger Redux actions
- **Sagas** handle side effects (API calls, navigation, file processing)
- **Reducers** update state based on action results
- **Selectors** provide computed views of state
- **Components** render based on selected state
- **GraphQL API** serves as the primary data source
- **Server** provides SSR and static asset serving

This architecture ensures **predictable state management**, **testable side effects**, and **clear data flow** for a complex admin dashboard application.
