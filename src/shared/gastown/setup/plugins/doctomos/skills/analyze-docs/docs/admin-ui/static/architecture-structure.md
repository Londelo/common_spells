# Architecture Structure - admin-ui

## Directory Layout

```
admin-ui/
├── frontend/                    # React frontend application
│   ├── .storybook/             # Storybook configuration
│   ├── src/
│   │   ├── actions/            # Redux action creators
│   │   ├── components/         # React components (UI)
│   │   ├── config/             # Frontend configuration
│   │   ├── graphql/            # GraphQL queries and mutations
│   │   ├── identity/           # Authentication/identity (v1 & v2)
│   │   ├── localization/       # i18n resources
│   │   ├── reducers/           # Redux reducers
│   │   ├── sagas/              # Redux-saga side effects
│   │   ├── selectors/          # Redux state selectors
│   │   ├── shared/             # Shared utilities, styles, constants
│   │   ├── App.jsx             # Root React component
│   │   ├── getStore.js         # Redux store configuration
│   │   └── index.jsx           # Application entry point
│   └── webpack.config.babel.js # Webpack build configuration
├── server/                      # Koa.js server application
│   └── src/
│       ├── handlebars/         # Handlebars templates
│       ├── localHttps/         # HTTPS configuration for local dev
│       ├── middlewares/        # Koa middleware
│       ├── router/             # Route definitions
│       └── index.js            # Server entry point
├── lib/                         # Shared libraries
│   ├── config/                 # Shared configuration
│   ├── graphql/                # GraphQL client library
│   ├── Log/                    # Logging utilities
│   └── metrics.js              # Metrics collection
├── configs/                     # Environment-specific configs
├── features/                    # E2E test features (Cucumber)
├── kube/                        # Kubernetes deployment configs
├── terraform/                   # Infrastructure as code
├── babel.config.json            # Babel transpiler configuration
├── jest.config.js               # Jest testing framework config
└── package.json                 # Root package dependencies & scripts
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `frontend/src/` | All React frontend application code |
| `frontend/src/components/` | Reusable and page-level React components |
| `frontend/src/sagas/` | Redux-saga middleware for side effects (API calls, async logic) |
| `frontend/src/graphql/` | GraphQL query/mutation definitions and API client |
| `frontend/src/actions/` | Redux action creators for state updates |
| `frontend/src/reducers/` | Redux reducers defining state transformation logic |
| `frontend/src/selectors/` | State selectors for reading from Redux store |
| `frontend/src/shared/` | Shared utilities (utils, enums, styles, constants) |
| `server/src/` | Koa.js server serving the frontend and handling SSR |
| `server/src/router/` | Server route definitions (heartbeat, metrics, frontend routing) |
| `server/src/middlewares/` | Koa middleware (sessions, static serving, etc.) |
| `lib/` | Shared libraries used by both frontend and server |
| `configs/` | Environment-specific configuration files |
| `features/` | End-to-end tests using Cucumber |
| `kube/` | Kubernetes deployment manifests |
| `terraform/` | Infrastructure provisioning code |

## Entry Points

| File | Purpose |
|------|---------|
| `frontend/src/index.jsx` | Frontend application entry - renders React app to DOM |
| `frontend/src/App.jsx` | Root React component defining application routes and structure |
| `frontend/src/getStore.js` | Redux store configuration with saga middleware |
| `server/src/index.js` | Koa server entry point - starts HTTP/HTTPS server |
| `server/src/router/index.js` | Server route definitions (API endpoints, frontend routes) |
| `lib/graphql/` | GraphQL client initialization used by sagas |

## File Organization Pattern

The codebase is organized using **separation by type and feature**:

### Frontend Structure:
- **By Type (Technical Layers)**:
  - `actions/`, `reducers/`, `selectors/`, `sagas/` follow Redux architectural patterns
  - Each layer is organized by domain/feature within (e.g., `sagas/campaignDetails.js`, `sagas/wave.js`)

- **By Feature (UI Components)**:
  - `components/` contains feature-specific components (e.g., `Campaigns/`, `CampaignDistribution/`, `FanlistCampaign/`)
  - Each component directory typically includes:
    - Component file (`ComponentName.jsx`)
    - Index file (`index.js` for exports)
    - Styled components (`styled.js`)

### Backend Structure:
- **By Type**: Server follows middleware-based organization
  - `middlewares/` - Koa middleware (sessions, logging, static serving)
  - `router/` - Route definitions

### Shared Code:
- `lib/` contains reusable libraries shared between frontend and server
- `shared/` within frontend contains utilities, styles, enums used across components

### Configuration:
- Root-level config files (`babel.config.json`, `jest.config.js`, `webpack.config.babel.js`)
- Environment configs in `configs/` directory
- Deployment configs in `kube/` and `terraform/`

This structure balances **technical separation** (Redux patterns, middleware) with **feature cohesion** (component grouping), typical of mature React/Redux applications.
