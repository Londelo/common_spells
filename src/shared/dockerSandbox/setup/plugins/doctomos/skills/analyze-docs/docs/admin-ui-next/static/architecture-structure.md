# Architecture Structure - admin-ui-next

## Directory Layout

```
admin-ui-next/
├── app/                          # Next.js 15 App Router pages
│   ├── campaigns/                # Campaign management routes
│   │   ├── [campaignId]/         # Dynamic campaign detail routes
│   │   │   ├── events/           # Event management within campaign
│   │   │   │   └── create/       # Create event form
│   │   │   ├── layout.tsx        # Campaign detail layout wrapper
│   │   │   └── page.tsx          # Campaign detail page
│   │   └── page.tsx              # Campaigns list page
│   ├── promoters/                # Promoter management routes
│   │   ├── create/               # Create promoter form
│   │   └── page.tsx              # Promoters list page
│   ├── metrics/                  # Prometheus metrics endpoint
│   │   └── route.ts              # API route for metrics
│   ├── heartbeat/                # Health check endpoint
│   │   └── route.ts              # API route for heartbeat
│   ├── layout.tsx                # Root layout with providers
│   └── favicon.ico               # App icon
├── components/                   # React components (organized by feature)
│   ├── Campaigns/                # Campaign-related components
│   ├── Promoters/                # Promoter-related components
│   ├── EventForm/                # Event form components
│   ├── EventsList/               # Events list components
│   ├── layout/                   # Layout components (SideNav, Subheader, etc.)
│   ├── common/                   # Shared/reusable components
│   └── PreloadQueries/           # GraphQL query preloading wrapper
├── lib/                          # Core library code
│   ├── config/                   # Configuration management
│   │   ├── client.ts             # Client-side config
│   │   └── server.ts             # Server-side config
│   ├── context/                  # React context providers
│   │   ├── AuthProvider.tsx      # Authentication context
│   │   ├── LazyAuthProvider.tsx  # Lazy-loaded auth wrapper
│   │   └── ClientConfigProvider.tsx # Config context
│   ├── graphql/                  # GraphQL client setup and operations
│   │   ├── apollo/               # Apollo Client configuration
│   │   ├── queries/              # GraphQL queries
│   │   ├── mutations/            # GraphQL mutations
│   │   └── fragments/            # GraphQL fragments
│   ├── hooks/                    # Custom React hooks
│   │   ├── graphql/              # GraphQL-specific hooks
│   │   └── useTableControls/     # Table UI control hooks
│   ├── store/                    # Zustand state management
│   │   ├── slices/               # Store slices
│   │   └── index.ts              # Store configuration
│   ├── theme/                    # Styled-components theme
│   │   ├── Provider.tsx          # Theme provider
│   │   └── GlobalStyles.tsx      # Global CSS
│   ├── types/                    # TypeScript type definitions
│   ├── selectors/                # State selectors
│   ├── date/                     # Date utilities
│   └── utils/                    # Utility functions
├── configs/                      # External configuration files
├── public/                       # Static assets
├── kube/                         # Kubernetes deployment configs
├── scripts/                      # Build and dev scripts
├── certificates/                 # SSL certificates for local dev
├── typings/                      # Custom TypeScript type declarations
├── middleware.ts                 # Next.js middleware (redirects)
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest testing configuration
├── docker-compose.yml            # Docker compose for local dev
└── dockerfile                    # Docker container definition
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| app/ | Next.js 15 App Router pages and API routes (file-based routing) |
| components/ | React components organized by feature/domain |
| lib/ | Core application logic, hooks, GraphQL, state management |
| lib/graphql/ | Apollo Client setup, queries, mutations, fragments |
| lib/hooks/ | Custom React hooks including GraphQL data fetching hooks |
| lib/store/ | Zustand state management store |
| lib/context/ | React Context providers for auth, config, theming |
| lib/theme/ | Styled-components theme configuration |
| configs/ | Environment-specific configuration files |
| public/ | Static assets served directly |
| kube/ | Kubernetes deployment manifests |
| scripts/ | Build and development utility scripts |

## Entry Points

| File | Purpose |
|------|---------|
| app/layout.tsx | Root React layout with all providers (Auth, Apollo, Theme, Config) |
| app/campaigns/page.tsx | Campaigns list page (default route via middleware) |
| app/promoters/page.tsx | Promoters list page |
| middleware.ts | Next.js middleware for routing (redirects / to /campaigns) |
| next.config.ts | Next.js build and runtime configuration |

## File Organization Pattern

**Feature-based organization**: Components are organized by domain/feature (Campaigns, Promoters, EventForm, EventsList) rather than by technical type. This promotes cohesion and makes it easier to find related code.

**Separation of concerns**:
- `app/` directory contains only page components and API routes (Next.js App Router convention)
- `components/` directory contains presentational and feature-specific components
- `lib/` directory contains all business logic, data fetching, state management, and utilities
- GraphQL operations are centralized in `lib/graphql/` with queries, mutations, and fragments separated

**Component structure**:
- Each feature component has its own directory with an `index.tsx` entry point
- Styled components may be in a separate `styled.tsx` file
- Complex forms have dedicated subdirectories (e.g., `EventForm/`, `PromoterForm/`)

**Library structure**:
- Custom hooks are in `lib/hooks/` with GraphQL-specific hooks in `lib/hooks/graphql/`
- Context providers are in `lib/context/`
- State management (Zustand) is in `lib/store/` with slices pattern
- Configuration is split between client and server in `lib/config/`
