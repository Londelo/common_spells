# Internal Dependencies - admin-ui-next

Last Updated: 2026-02-13

## @verifiedfan/* Packages

| Package | Version | Purpose | Usage Locations |
|---------|---------|---------|-----------------|
| **@verifiedfan/locale** | 1.4.0 | Locale enums and internationalization utilities | Promoter form components |

## @tm1/* Packages (TM1 Design System)

| Package | Version | Purpose | Usage Locations |
|---------|---------|---------|-----------------|
| **@tm1/design-system** | 3.19.48 | Core design system tokens, types, and utilities | Used for type imports (e.g., BadgeColor) |
| **@tm1/design-system-react** | 2.35.7 | React component library (buttons, forms, typography) | Used extensively across all UI components |

## @ticketmaster/* Packages

| Package | Version | Purpose | Usage Locations |
|---------|---------|---------|-----------------|
| **@ticketmaster/global-design-system** | ^23.6.0 | Ticketmaster global design system | Design system integration |

## Detailed Usage Analysis

### @verifiedfan/locale (1.4.0)

**Purpose**: Provides locale-related enumerations and utilities for internationalization.

**Usage Pattern**:
```typescript
import { enums as LocaleEnums } from '@verifiedfan/locale';
```

**Files Using This Package**:
1. `components/Promoters/PromoterForm/usePromoterForm.ts` - Form hook for promoter data
2. `components/Promoters/PromoterForm/PrivacyUrls.tsx` - Privacy URL form fields
3. `components/Promoters/PromoterForm/PromoterFormFields.tsx` - Main promoter form fields

**Coupling Level**: Low
- Only used in Promoter-related components
- Limited to locale enumeration imports
- Could be easily replaced if needed

---

### @tm1/design-system (3.19.48)

**Purpose**: Core design system package providing design tokens, types, and base utilities.

**Usage Pattern**:
```typescript
import type { BadgeColor } from '@tm1/design-system';
```

**Files Using This Package**:
1. `components/layout/ObjectHeader/index.tsx` - Type imports for badge colors

**Coupling Level**: Low-Medium
- Primarily used for type definitions
- Supports the React component library
- Provides design tokens and theming

---

### @tm1/design-system-react (2.35.7)

**Purpose**: Comprehensive React component library providing all UI components used throughout the application.

**Usage Pattern**:
```typescript
import { Tm1Button, Tm1Typography, Tm1TextField } from '@tm1/design-system-react';
```

**Components Used**:
- **Tm1Button**: Action buttons throughout the app
- **Tm1Typography**: Text and headings
- **Tm1TextField**: Text input fields
- **Tm1Select / Tm1Option**: Dropdown selectors
- **Tm1Checkbox**: Checkbox inputs
- **Tm1Radio / Tm1RadioGroup**: Radio button groups
- **Tm1Switch**: Toggle switches
- **Tm1Icon**: Icon components
- **Tm1Tooltip**: Tooltip overlays
- **Tm1DateTimePicker**: Date/time selection
- **Tm1Grid**: Layout grid system
- **Tm1Badge**: Status badges
- **Tm1Banner**: Alert/notification banners
- **Tm1Dialog**: Modal dialogs
- **Tm1Table / Tm1TableCell / Tm1TableRow / Tm1TableHeader**: Table components

**Files Using This Package** (High usage - 20+ files):
- `lib/hooks/useTableControls/index.tsx` - Table control utilities
- `components/Campaigns/` - Campaign management components
- `components/EventForm/` - Event form components
- `components/Promoters/` - Promoter management components
- `components/EventsList/` - Event list components
- `components/layout/` - Layout components (headers, navigation)
- `components/common/` - Reusable UI components

**Coupling Level**: Very High
- Used as the primary UI component library
- Deep integration throughout the entire UI layer
- Would require significant refactoring to replace
- Acts as the foundation for all UI components

---

### @ticketmaster/global-design-system (^23.6.0)

**Purpose**: Ticketmaster's global design system for consistent branding and UI patterns.

**Usage**: Referenced as a dependency but specific import usage not found in codebase search. May be used:
- For global theming
- As a peer dependency for @tm1 packages
- For design tokens or CSS variables

**Coupling Level**: Unknown (requires deeper analysis)
- Listed in dependencies but no direct imports found
- May be transitively used by @tm1 packages
- Could be for build-time or runtime theming

---

## Coupling Analysis

### Overall Assessment

**Tight Coupling**:
- **@tm1/design-system-react**: The application is heavily dependent on this component library. Replacing it would require:
  - Rewriting all UI components
  - Mapping 15+ component types to alternatives
  - Updating 30+ files
  - Estimated effort: High (weeks)

**Loose Coupling**:
- **@verifiedfan/locale**: Limited to 3 files in Promoter components. Could be replaced relatively easily.
- **@tm1/design-system**: Mostly type imports, minimal coupling.

### Dependency Graph

```
admin-ui-next
├── @tm1/design-system-react (CRITICAL - UI layer)
│   └── @tm1/design-system (types & tokens)
│       └── @ticketmaster/global-design-system (?)
└── @verifiedfan/locale (MINOR - Promoter forms only)
```

### Risk Assessment

**High Risk Dependencies**:
1. **@tm1/design-system-react**: Any breaking changes would significantly impact the application
2. **@tm1/design-system**: Breaking changes would affect type definitions

**Low Risk Dependencies**:
1. **@verifiedfan/locale**: Easy to isolate and replace

### Recommendations

1. **Monitor @tm1 packages closely**:
   - Track version updates and changelogs
   - Test thoroughly before upgrading
   - Consider wrapping components in abstraction layer for future flexibility

2. **Document @ticketmaster/global-design-system usage**:
   - Investigate actual usage patterns
   - Determine if it's required or can be removed

3. **@verifiedfan/locale**:
   - Current usage is minimal and well-isolated
   - No immediate concerns

4. **Version Pinning Strategy**:
   - @tm1/design-system: Pinned (3.19.48) - good for stability
   - @tm1/design-system-react: Pinned (2.35.7) - good for stability
   - @verifiedfan/locale: Pinned (1.4.0) - appropriate for internal package
   - @ticketmaster/global-design-system: Caret range (^23.6.0) - may receive minor updates

## Internal Package Update Strategy

**Recommended Approach**:
1. Test @tm1 package updates in isolated environment first
2. Review changelogs for breaking changes
3. Run full test suite before deploying updates
4. Keep @verifiedfan/locale updated regularly (low risk)
5. Coordinate with design system team for major version updates
