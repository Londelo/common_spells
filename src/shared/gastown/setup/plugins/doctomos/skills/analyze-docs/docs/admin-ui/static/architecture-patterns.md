# Architecture Patterns - admin-ui

## Architecture Style

**Identified Styles**: **Monolithic React/Redux SPA** + **Server-Side Rendering (SSR)**

**Evidence**:
- Single frontend application in `frontend/src/` with all features bundled together
- Redux state management with centralized store (`getStore.js`)
- Redux-saga middleware for side effects (`sagas/`)
- Server-side rendering via Koa.js (`server/src/index.js`) serving the React app
- Webpack-based build producing bundled assets (`webpack.config.babel.js`)
- All routes handled by React Router within single app (`App.jsx` with `<Router>`)
- GraphQL client integrated directly into frontend (`frontend/src/graphql/`)

**Why This Style**:
This is a classic **internal admin dashboard** architecture pattern:
- Monolithic approach simplifies deployment and development for internal tools
- SSR improves initial page load and enables server-side route handling
- Redux provides predictable state management for complex admin workflows
- GraphQL centralizes data fetching for various campaign, metrics, and distribution features

**No microservices or serverless patterns** - this is a traditional single-page application backed by a Node.js server.

## Design Patterns Used

### 1. Redux Architecture Pattern
- **Location**: `frontend/src/`
- **Implementation**:
  - Unidirectional data flow: Actions → Reducers → Store → Components
  - Immutable state using ImmutableJS (`redux-immutablejs`, `immutable`)
  - Centralized store configuration in `getStore.js`
- **Example**:
  ```javascript
  // frontend/src/getStore.js
  const reducers = combineReducers(Map({ main: reducer, form }));
  const sagaMiddleWare = createSagaMiddleware();
  store = createStore(reducers, Map({ main: initialState }),
    composeEnhancers(applyMiddleware(sagaMiddleWare)));
  ```

### 2. Saga Pattern (Redux-Saga)
- **Location**: `frontend/src/sagas/`
- **Implementation**:
  - Side effects managed through generator functions
  - Effects include API calls, routing, file uploads, state synchronization
  - Root saga forks all feature sagas (`sagas/index.js`)
- **Example**:
  ```javascript
  // sagas/index.js - centralized saga orchestration
  const sagas = [initApp, saveCampaign, loadCampaignsList, ...];
  export default function* root() {
    yield all(sagas.map(saga => fork(saga)));
  }
  ```
- **Key Sagas**:
  - `initApp.js` - Application initialization
  - `saveCampaign.js` - Campaign save orchestration
  - `loadCampaign.js` - Campaign data loading
  - `wave.js`, `wavePrep.js` - Wave distribution logic
  - `uploadFile.js` - File upload handling

### 3. Selector Pattern
- **Location**: `frontend/src/selectors/`
- **Implementation**:
  - Encapsulate state access logic
  - ImmutableJS getIn operations abstracted
  - Computed values derived from state
- **Example**: State selectors provide clean API for components to access specific slices

### 4. Component Composition Pattern
- **Location**: `frontend/src/components/`
- **Implementation**:
  - Container/Presentational component split
  - Component directories with index exports (barrel pattern)
  - Styled-components for CSS-in-JS (`styled.js` files)
- **Example Structure**:
  ```
  components/Campaigns/
  ├── Campaigns.jsx      # Container component
  ├── index.js           # Export
  └── styled.js          # Styled components
  ```

### 5. Higher-Order Component (HOC) Pattern
- **Location**: Throughout `components/`
- **Implementation**: React-Redux connect, React Router withRouter
- **Example**: Components wrapped with Redux state/dispatch via `connect()`

### 6. Middleware Chain Pattern
- **Location**: `server/src/index.js`
- **Implementation**: Koa middleware composition
- **Example**:
  ```javascript
  app.use(bodyParser());
  app.use(requestCounter);
  app.use(metrics.middleware);
  app.use(context);
  app.use(Correlation(correlationHeaderKey));
  app.use(AccessLog({ log: Log('accessLog'), blacklist }));
  app.use(mount('/ui', serve));
  app.use(Sessions(app));
  app.use(router.routes());
  ```

### 7. GraphQL Client Pattern
- **Location**: `frontend/src/graphql/`, `lib/graphql/`
- **Implementation**:
  - Centralized GraphQL client using Apollo Client
  - Query/mutation definitions co-located with business logic
  - GraphQL operations exposed as functions (`initApp()`, `getCampaign()`, etc.)
- **Example**:
  ```javascript
  // frontend/src/graphql/index.js
  const { query, mutation } = GraphQL({ uri, headers });
  export const getCampaign = ({ id, options = {} }) =>
    query({ fetchPolicy: 'network-only', query: _getCampaign, variables: { id } });
  ```

### 8. Action Creator Pattern
- **Location**: `frontend/src/actions/`
- **Implementation**: Functions that return Redux action objects with type and payload
- **Example**: Actions dispatched to trigger state updates and saga effects

### 9. Hot Module Replacement (HMR) Pattern
- **Location**: `frontend/src/index.jsx`, `frontend/src/getStore.js`
- **Implementation**: Webpack HMR for development with React and Redux hot reloading
- **Example**:
  ```javascript
  if (module.hot) {
    module.hot.accept('./App', () => render(App));
  }
  ```

## Layer Separation

### Frontend Layers (Following Redux Pattern):

1. **Presentation Layer** (`components/`)
   - React components rendering UI
   - Connected to Redux via `react-redux`
   - Route definitions in `App.jsx`

2. **State Management Layer** (`actions/`, `reducers/`, `selectors/`)
   - Actions define state change intents
   - Reducers handle state transformations
   - Selectors encapsulate state access

3. **Side Effects Layer** (`sagas/`)
   - Asynchronous operations (API calls, navigation, file processing)
   - Business logic orchestration
   - Integration with external services (GraphQL API)

4. **Data Access Layer** (`graphql/`)
   - GraphQL queries and mutations
   - API client configuration
   - Data fetching abstractions

5. **Shared Utilities** (`shared/`)
   - Utilities, constants, enums
   - Styling configurations
   - Reusable logic

### Backend Layers:

1. **HTTP Layer** (`server/src/index.js`, `router/`)
   - Koa server setup
   - Route definitions (heartbeat, metrics, frontend routing)

2. **Middleware Layer** (`server/src/middlewares/`)
   - Request processing (sessions, logging, static serving)
   - Cross-cutting concerns

3. **Template Layer** (`server/src/handlebars/`)
   - Server-side rendering templates

### Shared Libraries (`lib/`):
- Configuration management
- Logging
- Metrics collection
- GraphQL client

## Dependency Direction

**Clean Dependency Flow**:

```
Components → Sagas → GraphQL → External API
     ↓          ↓
  Selectors  Actions
     ↓          ↓
   Reducers ← ←
     ↓
   Store
```

**Key Observations**:
- **Unidirectional data flow**: Actions → Reducers → Store → Selectors → Components
- **Side effects isolated**: Sagas handle all async operations, keeping reducers pure
- **Components don't directly call APIs**: All network requests go through sagas
- **State access abstracted**: Components use selectors, not direct state access
- **No circular dependencies**: Clear separation between layers

**Dependencies Flow Downward**:
- Components depend on selectors, actions (via react-redux)
- Sagas depend on actions, GraphQL client
- Reducers depend on actions
- GraphQL depends on lib/graphql (shared library)
- Server depends on lib/ (config, logging, metrics)

**Shared Code**: `lib/` is dependency-free and imported by both frontend and server

## Deviations & Technical Debt

### 1. Monolithic Component Structure
**Observation**: All features bundled in single `components/` directory
- `Campaigns/`, `CampaignDistribution/`, `CampaignMetrics/`, `CampaignScoring/`, `CampaignSelection/`, `CampaignExports/` all within same app
- **Impact**: Large bundle size, all code loaded upfront
- **Potential Improvement**: Code splitting or lazy loading for feature modules

### 2. Mixed Reducer Pattern
**Location**: `frontend/src/reducers/index.js`
- Single monolithic reducer using object lookup pattern
- **Current**: `reducer = (state, action) => ({ [type]: handler }[type] || noop)()`
- **Deviation**: Not using standard `combineReducers` for feature slicing
- **Impact**: Single large reducer file vs. modular per-feature reducers

### 3. ImmutableJS vs Plain JS Objects
**Observation**: Mix of ImmutableJS (state) and plain JS (actions, props)
- State stored as Immutable Map
- Requires `.toJS()` conversions frequently
- **Impact**: Complexity, performance overhead of conversions
- **Modern Alternative**: Immer.js or Redux Toolkit for simpler immutability

### 4. Saga Organization
**Location**: `frontend/src/sagas/`
- Some sagas export arrays (`...wave`, `...wavePrep`) while others export single functions
- Inconsistent saga file structure
- **Impact**: Hard to understand which sagas are registered

### 5. GraphQL Client Configuration
**Observation**: Client configured with global `window.titanConf.graphql`
- Config injected via server-rendered HTML
- **Location**: `frontend/src/graphql/index.js` reads `window.titanConf`
- **Deviation**: Tight coupling to server-injected config
- **Impact**: Harder to test, config not explicit in code

### 6. Server as Static File Server
**Observation**: Koa server primarily serves static assets and SSR, minimal API logic
- Most business logic happens client-side (sagas) calling external GraphQL API
- Server routes mainly forward to frontend (`home` route renders React app)
- **Pattern**: "Backend for Frontend" but minimal backend logic

### 7. Test Coverage
**Observation**: Limited test files found
- Only a few `.spec.js` and `.test.js` files in codebase
- Missing tests for most sagas, reducers, components
- **Impact**: Refactoring risk, regression potential

### 8. Configuration Management
**Observation**: Config split between:
- `lib/config/` (shared)
- `configs/` (environment-specific)
- `window.titanConf` (server-injected runtime config)
- **Impact**: Config sources not centralized, harder to trace configuration flow

### 9. Legacy Patterns
**Observation**: Some deprecated code noted in reducers
- Comments indicate deprecated FAQ functionality
- `console.log` statements in production code
- **Location**: `reducers/index.js` lines 128-160

### 10. Hot Reload Implementation
**Observation**: Custom HMR setup for sagas
- Saga cancellation and restart on hot reload
- **Location**: `getStore.js` lines 28-38
- **Complexity**: Custom logic increases maintenance burden

## Modern Architecture Considerations

**Current State**: Mature, stable pattern for internal tools (circa 2017-2019 React/Redux era)

**Modernization Opportunities**:
- Redux Toolkit for simpler state management
- React Query or SWR for data fetching (reduce saga complexity)
- Code splitting with React.lazy and Suspense
- TypeScript for type safety
- Increased test coverage
- Feature-based folder structure instead of type-based
