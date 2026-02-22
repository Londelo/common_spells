# Internal Dependencies - reg-ui

## @verifiedfan/* Packages

| Package | Version | Purpose | Usage Location |
|---------|---------|---------|----------------|
| **@verifiedfan/idv-sdk** | ^1.2.0 | Identity verification SDK for liveness checks | `hooks/useCheckLiveness/` |
| **@verifiedfan/locale** | ^1.2.0 | Locale utilities and fallback logic | `i18n.ts`, `lib/utils/campaign/locales/` |
| **@verifiedfan/log** | ^1.5.4 | Centralized logging utility | `lib/logs/log.ts` |
| **@verifiedfan/redis** | ^2.1.1 | Redis client wrapper with primary/replica support | `lib/cache.ts` |

## Package Details

### @verifiedfan/idv-sdk (^1.2.0)

**Purpose**: Provides identity verification functionality including liveness detection.

**Used In**:
- `hooks/useCheckLiveness/useCheckLiveness.ts` - Imports `LivenessTier`, `VerificationType` types
- `hooks/useCheckLiveness/useCheckEntryLiveness.ts` - Imports `IDVSDKError`, `LivenessTier` types

**Functionality**:
- Type definitions for liveness verification tiers (e.g., passive, active liveness)
- Error types for IDV operations
- Verification type enums

**Criticality**: High - Core feature for identity verification in registration flows

---

### @verifiedfan/locale (^1.2.0)

**Purpose**: Handles locale resolution and fallback logic across Verified Fan applications.

**Used In**:
- `i18n.ts` - Imports `getFallbackLocale` function
- `lib/utils/campaign/locales/index.ts` - Imports `getFallbackLocale` function

**Functionality**:
- Determines appropriate fallback locale (e.g., `en-CA` → `en-US`)
- Ensures consistent locale behavior across applications
- Integrates with `next-intl` for internationalization

**Criticality**: High - Essential for multi-locale campaign support

---

### @verifiedfan/log (^1.5.4)

**Purpose**: Centralized logging abstraction for consistent log formatting and transport.

**Used In**:
- `lib/logs/log.ts` - Primary logging instance

**Functionality**:
- Structured logging with log levels (info, warn, error, debug)
- Context-aware logging with metadata
- Server-side logging (not bundled to client)

**Integration**:
- Client-side logging uses custom `useClientLogger` hook that hits `/api/log` endpoint
- Server-side logging imports directly from `@verifiedfan/log`

**Criticality**: High - Core observability infrastructure

---

### @verifiedfan/redis (^2.1.1)

**Purpose**: Redis client wrapper with support for primary/replica topology and connection management.

**Used In**:
- `lib/cache.ts` - Redis cache implementation for campaign data

**Functionality**:
- Campaign caching with 8-hour TTL
- Primary/replica support for read-heavy workloads
- Graceful error handling (returns null on cache miss)
- Connection pooling and retry logic

**Key Operations**:
```typescript
// Campaign cache operations
readCampaignFromRedis(campaignSlug: string)
writeCampaignToRedis(campaignSlug: string, campaign: Campaign)
```

**Criticality**: Critical - All campaign data is served from Redis cache. Cache failures degrade to null returns (graceful degradation).

---

## Coupling Analysis

### Dependency on Internal Packages

**Level**: Medium Coupling

The application has targeted dependencies on Verified Fan infrastructure:

1. **Infrastructure Services** (Redis, Logging)
   - Tightly coupled to `@verifiedfan/redis` and `@verifiedfan/log`
   - These are foundational services - replacing would require significant refactoring
   - **Risk**: Changes to these packages could impact core functionality

2. **Business Logic** (IDV SDK, Locale)
   - Moderate coupling to `@verifiedfan/idv-sdk` for identity verification features
   - Moderate coupling to `@verifiedfan/locale` for i18n logic
   - **Risk**: Breaking changes in IDV SDK would affect registration flows

3. **Abstraction Quality**
   - Good: Most internal packages are used through well-defined interfaces
   - Cache operations abstracted in `lib/cache.ts`
   - Logging abstracted in `lib/logs/log.ts` and `hooks/useClientLogger.ts`
   - IDV types imported but SDK likely consumed elsewhere in the flow

### Replaceability Assessment

| Package | Replaceability | Effort | Notes |
|---------|----------------|--------|-------|
| `@verifiedfan/redis` | Low | High | Core caching infrastructure; would need full cache layer rewrite |
| `@verifiedfan/log` | Medium | Medium | Could swap with winston/pino, but structured logging format may be required |
| `@verifiedfan/locale` | High | Low | Small utility; could be replaced with custom logic |
| `@verifiedfan/idv-sdk` | Low | High | Business-critical feature; domain-specific types |

### Version Management

All internal packages use caret ranges (`^`), allowing minor/patch updates:
- ✅ **Good**: Enables automatic security/bug fixes
- ⚠️ **Risk**: Breaking changes in minor versions could cause issues
- **Recommendation**: Pin versions if stability issues arise

### Cross-Package Communication

**Direct Dependencies Only**: No transitive internal package dependencies detected. This is a clean architecture where each internal package serves a distinct purpose.

### Internal Package Upgrade Risk

**Low to Medium Risk**:
- Small number of internal dependencies (4 total)
- Well-isolated usage patterns
- Type imports only for IDV SDK (minimal runtime coupling)
- Utility functions for locale (easy to test/validate)
- Core infrastructure for Redis/logging (breaking changes unlikely)

### Recommended Practices

1. **Version Pinning**: Consider pinning `@verifiedfan/redis` and `@verifiedfan/log` to specific versions if stability is critical
2. **Changelog Monitoring**: Watch changelogs for `@verifiedfan/idv-sdk` for breaking changes in verification types
3. **Testing**: Ensure integration tests cover Redis cache failures and locale fallback scenarios
4. **Documentation**: Keep internal package usage documented in CLAUDE.md for new developers
