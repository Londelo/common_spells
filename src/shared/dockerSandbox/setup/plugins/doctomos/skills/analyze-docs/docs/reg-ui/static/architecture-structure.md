# Architecture Structure - reg-ui

## Directory Layout

```
reg-ui/
├── app/                          # Next.js 14 App Router
│   ├── [...path]/               # Catch-all route for campaign pages
│   │   ├── page.tsx            # Main campaign page entry point
│   │   ├── layout.tsx          # Campaign-specific layout
│   │   └── View.tsx            # Client-side view controller
│   ├── api/                    # API routes
│   │   ├── graphql/           # Mock GraphQL server for local dev
│   │   ├── log/               # Client-side logging endpoint
│   │   └── og/                # Open Graph image generation
│   ├── layout.tsx             # Root layout with next-intl provider
│   ├── heartbeat/             # Health check endpoint
│   ├── metrics/               # Prometheus metrics endpoint
│   └── graphql/               # Production GraphQL proxy
├── components/                 # React UI components
│   ├── SignupForm/            # Registration form with market selection
│   ├── Pages/                 # Page-level components (Registration, Confirmation)
│   ├── Theme/                 # Styled-components theme provider
│   ├── SWRProvider/           # SWR configuration provider
│   ├── Header/                # Global header component
│   ├── Footer/                # Global footer component
│   ├── Timeline/              # Campaign timeline visualization
│   ├── Info/                  # Campaign info display components
│   ├── GoogleTagManager/      # Analytics integration
│   ├── ErrorModal/            # Error display modal
│   └── [30+ other components] # Modular UI components
├── lib/                       # Core business logic
│   ├── config/               # Environment configuration
│   │   ├── server.ts        # Server-side config (from YAML)
│   │   ├── client.ts        # Client-safe config subset
│   │   └── readConfig.ts    # YAML config loader
│   ├── store/               # Zustand global state
│   │   ├── index.ts        # Store definition and actions
│   │   └── createSelector.ts # Selector utility
│   ├── cache.ts            # Redis cache wrapper
│   ├── types/              # TypeScript type definitions
│   │   ├── campaign.ts    # Campaign domain types
│   │   ├── appsync.ts     # Generated GraphQL types
│   │   └── cache.ts       # Cache interface types
│   ├── utils/              # Pure utility functions
│   │   ├── campaign/      # Campaign-specific utilities
│   │   ├── form/          # Form processing utilities
│   │   └── [50+ utilities] # Functional utilities
│   ├── mocks/              # Mock data for local development
│   │   ├── campaign/      # Campaign JSON fixtures
│   │   ├── artist/        # Artist data fixtures
│   │   └── promoters/     # Promoter data fixtures
│   ├── logs/              # Logging infrastructure
│   └── theme/             # Theme definitions
├── graphql/               # GraphQL integration
│   ├── operations/       # GraphQL queries/mutations (.gql)
│   ├── schema.graphql   # Generated schema from AppSync
│   ├── types.ts         # GraphQL type utilities
│   └── client.ts        # GraphQL client configuration
├── hooks/                # Custom React hooks
│   ├── useLoadCampaignData.ts
│   ├── useLoadFanData.ts
│   ├── useCheckLiveness/
│   ├── useLoadIsMobileApp/
│   └── [15+ hooks]
├── context/              # React Context providers
│   └── ClientConfigProvider.tsx
├── hoc/                  # Higher-order components
│   └── WithHideInMobileApp.tsx
├── configs/              # Environment YAML configs
│   ├── default.config.yml
│   ├── dev.config.yml
│   ├── qa.config.yml
│   ├── preprod.config.yml
│   └── prod.config.yml
├── messages/             # i18n translation files
│   ├── en_US.json
│   ├── es_MX.json
│   ├── [other locales]
│   └── terms/           # Custom terms by market
├── shared/              # Shared utilities (server/client)
│   └── intlDateFormat.ts
├── public/              # Static assets
│   └── assets/
├── typings/             # Custom TypeScript declarations
│   ├── @verifiedfan/
│   └── yml/
├── kube/                # Kubernetes manifests
│   ├── nonprod9.us-east-1/
│   ├── preprod9.us-east-1/
│   └── prod9.us-east-1/
├── scripts/             # Build and development scripts
│   ├── nextDev.mjs
│   └── writeBuildVersion.mjs
├── middleware.ts        # Next.js middleware
├── i18n.ts             # next-intl configuration
├── codegen.ts          # GraphQL code generation config
└── package.json        # Dependencies and scripts
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js 14 App Router with React Server Components, API routes, and page definitions |
| `app/[...path]/` | Catch-all dynamic route handling campaign slugs (e.g., `/taylor-swift`, `/coldplay-tour`) |
| `components/` | Self-contained React UI components with co-located styled-components |
| `lib/` | Core business logic, utilities, types, state management, and caching |
| `lib/config/` | Environment-specific configuration loaded from YAML files |
| `lib/store/` | Zustand global state (campaign, user, form, UI state) |
| `lib/utils/campaign/` | Campaign transformation, lookup, permissions, and locale handling |
| `lib/mocks/` | Mock campaign/artist/promoter data for local development |
| `graphql/` | GraphQL schema, operations (.gql files), and client configuration |
| `hooks/` | Custom React hooks following functional patterns |
| `configs/` | YAML configuration files per environment (dev/qa/preprod/prod) |
| `messages/` | Internationalization JSON files managed via Transifex |
| `kube/` | Kubernetes deployment manifests per environment |
| `public/` | Static assets served directly |

## Entry Points

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout wrapping all pages with `NextIntlClientProvider` for i18n |
| `app/[...path]/page.tsx` | Main campaign page entry - loads campaign from Redis, handles locale resolution, renders with providers |
| `app/[...path]/View.tsx` | Client-side view controller that determines which page to render (Registration/Confirmation) |
| `middleware.ts` | Runs on every request to normalize URLs, set surrogate keys for CDN caching |
| `i18n.ts` | next-intl request handler configuring locale determination from campaign settings |
| `lib/store/index.ts` | Zustand store initialization with global state and actions |
| `lib/cache.ts` | Redis cache client instantiation for campaign data |
| `graphql/client.ts` | GraphQL client configuration for AppSync communication |

## File Organization Pattern

**By Feature/Component** - The codebase organizes files by feature or component rather than by technical layer:

- Each component directory contains the component logic, styles, tests, and sub-components
- `lib/utils/campaign/` groups all campaign-related utilities together
- `components/SignupForm/` contains form logic, sub-components (Markets, OptIns), hooks, and styles

**Functional Programming Structure** - No classes, only functions and pure utilities:

- All React components are functional components
- State management uses Zustand with functional selectors
- Utilities are pure functions in `lib/utils/`
- No loops (use `.map()`, `.filter()`, `.reduce()`)
- No `let` declarations (enforced via ESLint)

**Co-location** - Related files are kept together:

- Components have their styles in the same directory (`styled.tsx` or `styled.ts`)
- Tests live next to the code they test (`.spec.ts`, `.spec.tsx`)
- Sub-components are nested within parent component directories

**Barrel Exports** - Common pattern for clean imports:

- `components/Pages/index.tsx` re-exports Registration and Confirmation
- `lib/utils/form/index.ts` exports form utilities
- Enables clean imports: `import { Registration } from 'components/Pages'`
