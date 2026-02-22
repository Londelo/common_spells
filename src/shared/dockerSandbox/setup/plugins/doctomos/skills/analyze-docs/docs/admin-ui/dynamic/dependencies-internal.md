# Internal Dependencies - admin-ui

## @verifiedfan/* Packages

| Package | Version | Purpose | Usage |
|---------|---------|---------|-------|
| @verifiedfan/lib | 1.0.0 | Core utilities, middleware, metrics | Used in server, runfile, features |
| @verifiedfan/locale | ^1.2.0 | Localization and fallback locale handling | Used throughout frontend for i18n |
| @verifiedfan/log | ^1.4.0 | Logging utilities | Used in lib/Log |
| @verifiedfan/styled-components | (implicit) | Design system and styled components | Used extensively in frontend components |

## Import Analysis

### @verifiedfan/lib
**Files importing**:
- `lib/metrics.js` - Imports `Metrics` class
- `runfile.js` - Imports `Runfile` and `Objects` utilities
- `lib/config/index.js` - Requires `Config` via CommonJS
- `server/src/index.js` - Imports `middlewares`
- `features/step_definitions/metrics/index.js` - Imports test utilities and Prometheus parser

**Purpose**: Provides core business logic, configuration management, metrics collection, and middleware for the Express server.

### @verifiedfan/locale
**Files importing**:
- `frontend/src/selectors/campaignContent.js`
- `frontend/src/sagas/handleCountryChange.js`
- `frontend/src/sagas/utils/campaign.js`
- `frontend/src/shared/defaultCampaigns/defaultRegistrationV2.spec.js`
- `frontend/src/shared/defaultCampaigns/registrationV2.js`

**Purpose**: Handles internationalization (i18n) logic, particularly `getFallbackLocale()` function for determining appropriate locale based on user's country/settings.

### @verifiedfan/log
**Files importing**:
- `lib/Log/index.js`

**Purpose**: Structured logging for application monitoring and debugging.

### @verifiedfan/styled-components
**Files importing** (heavily used in frontend):
- `frontend/src/App.jsx` - `BaseGlobalStyle`
- `frontend/.storybook/config.js` - `Base`, `generateTheme`, `spacing`
- `frontend/src/styled.js` - `spacing`, `text`, `utils`
- `frontend/src/shared/styled.js` - Various styled utilities
- `frontend/src/shared/style/theme.js` - Theme utilities
- `frontend/src/ConnectedThemeProvider.js` - `generateTheme`
- Multiple component files - `Button`, `GridRow`, `GridCol`, `UL`, `CheckboxGroup`, `InputGroup`, `Checkbox`, `TextInput`, `Select`, etc.

**Purpose**: Organization's design system providing:
- Theming capabilities
- Pre-built React components (buttons, inputs, grids, etc.)
- Spacing and typography utilities
- Global styles

## Coupling Analysis

### Tight Coupling Areas

**Frontend UI Layer**: Extremely tight coupling to `@verifiedfan/styled-components`
- All UI components depend on design system primitives
- Theme generation and styling infrastructure deeply integrated
- Migration away from this package would require complete UI rewrite

**Business Logic Layer**: Moderate coupling to `@verifiedfan/lib`
- Server middleware and metrics collection are core dependencies
- Configuration management is centralized through this package
- Could be decoupled with some refactoring effort

**Internationalization**: Moderate coupling to `@verifiedfan/locale`
- Used in ~5 files for locale fallback logic
- Relatively isolated usage, could be replaced if needed

**Logging**: Low coupling to `@verifiedfan/log`
- Single integration point in `lib/Log/index.js`
- Easy to swap with alternative logging solution

### Dependency Graph

```
admin-ui
├── @verifiedfan/styled-components (HIGH - UI foundation)
│   └── Used by: ~20+ component files
├── @verifiedfan/lib (MEDIUM - Core utilities)
│   └── Used by: server, metrics, config, runfile
├── @verifiedfan/locale (MEDIUM - i18n)
│   └── Used by: 5 frontend files
└── @verifiedfan/log (LOW - Logging)
    └── Used by: 1 file
```

### Decoupling Recommendations

1. **Keep**: `@verifiedfan/styled-components` - too deeply integrated, provides value
2. **Consider abstracting**: `@verifiedfan/lib` - create internal abstraction layer for metrics and config
3. **Easily replaceable**: `@verifiedfan/locale` and `@verifiedfan/log` - limited surface area

## Version Pinning

- `@verifiedfan/lib` is **pinned** at `1.0.0` (no caret)
- All other internal packages use **caret ranges** (`^1.x.0`)

**Risk**: Pinned version may miss important bug fixes and security updates. Recommend moving to caret range if API is stable.
