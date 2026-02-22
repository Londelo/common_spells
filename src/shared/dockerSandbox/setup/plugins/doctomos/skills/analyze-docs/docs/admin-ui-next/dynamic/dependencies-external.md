# External Dependencies - admin-ui-next

Last Updated: 2026-02-13

## Production Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| **@apollo/client** | ^3.13.8 | GraphQL client with React integration | Data Fetching |
| **@apollo/client-integration-nextjs** | ^0.12.0 | Next.js integration for Apollo Client | Data Fetching |
| **@ticketmaster/global-design-system** | ^23.6.0 | Ticketmaster global design system | UI Framework |
| **@tm1/design-system** | 3.19.48 | TM1 design system core | UI Framework |
| **@tm1/design-system-react** | 2.35.7 | TM1 React components | UI Components |
| **date-fns** | 4.1.0 | Modern date utility library | Date/Time |
| **date-fns-tz** | ^3.2.0 | Timezone support for date-fns | Date/Time |
| **fast-fuzzy** | ^1.12.0 | Fast fuzzy search library | Search |
| **intl-messageformat** | ^10.7.18 | ICU MessageFormat internationalization | i18n |
| **next** | 15.3.6 | React framework for production | Framework |
| **omit-deep** | ^0.3.0 | Deep object property omission utility | Utilities |
| **prom-client** | ^15.1.3 | Prometheus metrics client | Monitoring |
| **ramda** | ^0.31.3 | Functional programming utility library | Utilities |
| **react** | ^18.3.1 | JavaScript library for UI | Framework |
| **react-dom** | ^18.3.1 | React DOM renderer | Framework |
| **react-hook-form** | ^7.62.0 | Performant form library | Forms |
| **server-only** | ^0.0.1 | Runtime check for server-only code | Utilities |
| **styled-components** | ^6.1.19 | CSS-in-JS styling library | Styling |
| **zod** | ^3.25.67 | TypeScript-first schema validation | Validation |
| **zustand** | ^4.5.7 | Lightweight state management | State Management |

## Dev Dependencies

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| **@eslint/eslintrc** | ^3 | ESLint configuration | Code Quality |
| **@testing-library/jest-dom** | ^6.6.3 | Custom Jest matchers for DOM | Testing |
| **@testing-library/react** | ^16.3.0 | React testing utilities | Testing |
| **@types/jest** | ^30 | TypeScript definitions for Jest | Types |
| **@types/node** | ^20 | TypeScript definitions for Node.js | Types |
| **@types/ramda** | ^0.29.2 | TypeScript definitions for Ramda | Types |
| **@types/react** | ^18.3.1 | TypeScript definitions for React | Types |
| **@types/react-dom** | ^18.3.1 | TypeScript definitions for React DOM | Types |
| **@types/styled-components** | ^5.1.34 | TypeScript definitions for styled-components | Types |
| **@typescript-eslint/eslint-plugin** | ^8.35.0 | TypeScript ESLint plugin | Code Quality |
| **eslint** | ^8 | JavaScript/TypeScript linter | Code Quality |
| **eslint-config-next** | 15.3.4 | ESLint config for Next.js | Code Quality |
| **eslint-config-prettier** | ^10.1.5 | Disable ESLint rules conflicting with Prettier | Code Quality |
| **eslint-import-resolver-pnp** | ^0.0.0 | Import resolver for PnP package managers | Code Quality |
| **eslint-import-resolver-typescript** | ^4.4.4 | TypeScript import resolver for ESLint | Code Quality |
| **eslint-plugin-fp** | ^2.3.0 | ESLint rules for functional programming | Code Quality |
| **eslint-plugin-import** | ^2.32.0 | ESLint plugin for import/export syntax | Code Quality |
| **husky** | ^9.1.7 | Git hooks management | Git Hooks |
| **jest** | ^30.0.3 | JavaScript testing framework | Testing |
| **jest-environment-jsdom** | ^30.0.2 | JSDOM environment for Jest | Testing |
| **jest-transform-yaml** | ^0.1.2 | Jest transformer for YAML files | Testing |
| **js-yaml** | ^4.1.0 | YAML parser and serializer | Utilities |
| **lint-staged** | ^16.1.2 | Run linters on staged git files | Git Hooks |
| **prettier** | ^3.6.2 | Code formatter | Code Quality |
| **typescript** | ^5 | TypeScript compiler | Language |
| **yaml-loader** | ^0.8.1 | Webpack loader for YAML files | Build Tools |

## Peer Dependencies

None explicitly declared.

## Usage Analysis

### Framework & Core (100% coverage)
- **next**: Used throughout for routing, server components, API routes
- **react**: Core library used in all components
- **react-dom**: Required for React rendering

### Data Management (High usage)
- **@apollo/client**: Used extensively in `lib/hooks/graphql/`, `lib/graphql/`, and components for GraphQL operations
- **zustand**: State management in `lib/store/`
- **react-hook-form**: Form handling in EventForm, PromoterForm components
- **zod**: Schema validation in `lib/config/client.ts`

### UI & Styling (Heavy usage)
- **@tm1/design-system-react**: Used extensively across all components (Button, Typography, TextField, Select, etc.)
- **@tm1/design-system**: Core design tokens
- **styled-components**: Used in all styled.tsx/styled.ts files for component styling
- **@ticketmaster/global-design-system**: Design system integration

### Utilities (Active)
- **date-fns-tz**: Date formatting and timezone handling in EventForm and EventsList
- **ramda**: Functional programming utilities (usage to be confirmed in deeper analysis)
- **fast-fuzzy**: Search functionality
- **intl-messageformat**: i18n message formatting

### Monitoring
- **prom-client**: Prometheus metrics collection

### Specialized (Minimal usage)
- **@verifiedfan/locale**: Used only in Promoter components for locale enums
- **omit-deep**: Utility for deep object manipulation
- **server-only**: Runtime check for server-side-only code

## Version Currency

### Latest/Modern
- Next.js 15.3.6 (latest stable)
- React 18.3.1 (latest stable)
- TypeScript 5 (latest major version)
- Jest 30 (latest major version)

### Well-Maintained
- Apollo Client 3.13.8 (actively maintained)
- styled-components 6.1.19 (latest major version)
- zustand 4.5.7 (actively maintained)
- zod 3.25.67 (actively maintained)

### Internal Design Systems
- @tm1/design-system-react 2.35.7 (internal, version tracking varies)
- @tm1/design-system 3.19.48 (internal)
- @verifiedfan/locale 1.4.0 (internal)
