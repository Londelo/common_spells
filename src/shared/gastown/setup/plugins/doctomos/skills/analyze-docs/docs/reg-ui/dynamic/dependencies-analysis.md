# Dependency Analysis - reg-ui

## Risk Assessment

### High Priority Updates

#### Next.js 14.1.4 → Latest 14.x
**Current**: 14.1.4 (pinned)
**Latest Stable**: 14.2.x+ (as of analysis)
**Risk**: High
**Impact**: Security patches, performance improvements, bug fixes

**Recommendation**: Update to latest 14.x version for security patches. Test thoroughly as version is currently pinned (no caret).

**Breaking Changes**: Review Next.js 14.2+ changelog for App Router changes.

---

#### @apollo/server 4.10.4 → Latest 4.x
**Current**: ^4.10.4
**Latest**: 4.x series may have updates
**Risk**: Low (dev-only mock server)
**Impact**: Mock GraphQL server improvements

**Recommendation**: Update if newer versions available; only affects local development.

---

### Medium Priority Updates

#### styled-components 6.1.8 → Latest 6.x
**Current**: ^6.1.8
**Latest**: Check for 6.x updates
**Risk**: Medium
**Impact**: SSR improvements, TypeScript fixes

**Recommendation**: Update to latest 6.x for bug fixes. Ensure babel plugin compatibility.

---

#### @testing-library/react 15.0.7 → Latest 15.x
**Current**: ^15.0.7
**Latest**: Check for 15.x updates
**Risk**: Low (testing only)
**Impact**: Testing utilities improvements

**Recommendation**: Keep current testing library stack up to date.

---

#### date-fns 3.6.0 → Latest 3.x
**Current**: ^3.6.0
**Latest**: Check for 3.x updates
**Risk**: Low
**Impact**: Bug fixes, new date utilities

**Recommendation**: Update to latest 3.x for improvements.

---

### Low Priority / Stable

These packages are either:
- Already on latest major versions
- Dev dependencies with low impact
- Stable with infrequent updates

**Stable Production Dependencies**:
- `react` / `react-dom` (^18) - Latest major version
- `zustand` (^4.5.2) - Stable, actively maintained
- `swr` (^2.2.5) - Stable
- `zod` (^3.23.8) - Stable
- `ramda` (^0.29.1) - Mature, stable API
- `graphql` (^16.8.1) - Stable reference implementation

**Stable Dev Dependencies**:
- `jest` (^29.7.0) - Latest major version
- `typescript` (^5) - Latest major version
- `eslint` (^8) - Stable (note: ESLint 9 may require migration)
- `prettier` (^3.2.5) - Latest major version

---

## Outdated Packages

### Potentially Outdated (Requires Investigation)

#### @ticketmaster/global-design-system (^19.18.0)
**Status**: Unknown if latest
**Action**: Check internal registry for latest version
**Impact**: Design system components, styling updates

**Recommendation**: Verify against Ticketmaster's internal package registry.

---

#### Internal Packages (@verifiedfan/*)
**Packages**:
- `@verifiedfan/idv-sdk` (^1.2.0)
- `@verifiedfan/locale` (^1.2.0)
- `@verifiedfan/log` (^1.5.4)
- `@verifiedfan/redis` (^2.1.1)

**Action**: Check internal registry for updates
**Impact**: Bug fixes, new features, security patches

**Recommendation**: Coordinate with platform teams for upgrade schedules.

---

#### next-intl (^3.14.1)
**Current**: ^3.14.1
**Latest**: Check for 3.x updates
**Risk**: Medium
**Impact**: i18n fixes, Next.js 14 compatibility improvements

**Recommendation**: Stay current with latest 3.x for Next.js 14 optimizations.

---

#### graphql-request (^6.1.0)
**Current**: ^6.1.0
**Latest**: Check for 6.x updates
**Risk**: Low
**Impact**: AppSync query improvements

**Recommendation**: Update if newer versions available.

---

## Unused Dependencies

### Audit Required

To identify unused dependencies, run:

```bash
npx depcheck /Users/Brodie.Balser/Documents/TM/titan/reg-ui
```

### Potentially Unused (Based on Code Search)

#### jest-transform-yaml (^1.1.2)
**Declared In**: `dependencies` (should be `devDependencies`)
**Usage**: Jest configuration for YAML file transformation
**Issue**: This is a testing dependency misplaced in production dependencies

**Recommendation**: Move to `devDependencies`:
```bash
npm uninstall jest-transform-yaml
npm install --save-dev jest-transform-yaml
```

---

#### @svgr/webpack (^8.1.0)
**Declared In**: Both `dependencies` AND `devDependencies` (duplicate)
**Usage**: Build-time SVG loader
**Issue**: Listed twice in package.json

**Recommendation**: Remove from `dependencies`, keep only in `devDependencies`:
```bash
npm uninstall @svgr/webpack
npm install --save-dev @svgr/webpack
```

---

#### server-only (^0.0.1)
**Status**: Verify actual usage
**Purpose**: Marker package to prevent server code bundling to client
**Usage**: Should be imported in server-only files

**Action**: Grep for `import 'server-only'` to confirm usage.

---

### Type Definition Packages in Production Dependencies

#### @types/ramda (^0.29.12)
**Declared In**: `dependencies`
**Should Be**: `devDependencies`
**Reason**: Type definitions are not needed at runtime

**Recommendation**: Move to `devDependencies`:
```bash
npm uninstall @types/ramda
npm install --save-dev @types/ramda
```

---

## Security Considerations

### Known Vulnerabilities

**Action Required**: Run security audit:

```bash
npm audit
npm audit fix --dry-run  # Preview fixes
npm audit fix            # Apply fixes
```

### Vulnerability Monitoring

**Recommendations**:
1. Enable Dependabot alerts (GitHub)
2. Run `npm audit` in CI pipeline
3. Subscribe to security advisories for:
   - Next.js
   - React
   - GraphQL packages
   - styled-components

### High-Risk Packages

**Packages to Monitor**:
- `next` - Web framework (high exposure)
- `@apollo/server` - GraphQL server (dev only, but still important)
- `graphql-request` - HTTP client for AppSync
- `styled-components` - CSS-in-JS (XSS risks if misused)

---

## Dependency Conflicts

### Potential Conflicts

#### ESLint Ecosystem
**Current**: ESLint ^8
**Future**: ESLint 9 has breaking changes
**Risk**: When upgrading to ESLint 9, all plugins must be compatible

**Affected Plugins**:
- `eslint-plugin-fp`
- `eslint-plugin-import`
- `@typescript-eslint/eslint-plugin`

**Recommendation**: Stay on ESLint 8.x until all plugins support ESLint 9.

---

#### TypeScript Compatibility
**Current**: TypeScript ^5
**Risk**: Some older type definition packages may not be compatible with TS 5

**Monitor**:
- `@types/styled-components` (^5.1.34) - Check if TS 5 compatible

**Recommendation**: Test type checking after any TypeScript minor version updates.

---

## Recommendations

### Immediate Actions (This Sprint)

1. **Fix Dependency Misplacement**:
   - Move `jest-transform-yaml` to devDependencies
   - Move `@types/ramda` to devDependencies
   - Remove duplicate `@svgr/webpack` from dependencies

2. **Security Audit**:
   - Run `npm audit` and address high/critical vulnerabilities
   - Document any vulnerabilities that cannot be immediately fixed

3. **Version Verification**:
   - Check if Next.js 14.1.4 has security advisories
   - Verify internal package versions with platform team

### Short Term (Next Month)

1. **Next.js Update**:
   - Update to latest Next.js 14.x
   - Test all App Router features
   - Verify React Server Components work correctly
   - Test i18n routing with next-intl

2. **Internal Package Updates**:
   - Check for updates to `@verifiedfan/*` packages
   - Review changelogs for breaking changes
   - Update and test in development environment first

3. **Testing Library Updates**:
   - Update `@testing-library/react` to latest 15.x
   - Update `jest` to latest 29.x
   - Run full test suite to verify compatibility

### Long Term (Next Quarter)

1. **Major Version Planning**:
   - Monitor Next.js 15 release (App Router improvements)
   - Plan ESLint 9 migration when plugins support it
   - Evaluate React 19 when stable

2. **Dependency Cleanup**:
   - Run `depcheck` to identify unused dependencies
   - Remove any packages no longer in use
   - Document required but rarely used packages

3. **Bundle Size Optimization**:
   - Analyze bundle with `@next/bundle-analyzer`
   - Consider alternatives for heavy dependencies
   - Evaluate if Ramda could be replaced with lighter utilities (or use tree-shaking)

4. **Alternative Evaluation**:
   - Consider Radix UI or Headless UI if design system flexibility needed
   - Evaluate Jotai or Valtio as zustand alternatives (if needed)
   - Consider TanStack Query as SWR alternative (if more features needed)

### Continuous Practices

1. **Monthly Dependency Review**:
   - Review `npm outdated` output
   - Update patch versions automatically (already done via caret ranges)
   - Schedule minor version updates monthly

2. **Security Monitoring**:
   - Enable GitHub Dependabot
   - Subscribe to Next.js security mailing list
   - Monitor Snyk/npm advisories

3. **Testing Protocol**:
   - Run full test suite before any dependency update
   - Test in dev environment first
   - Verify production build completes successfully
   - Check bundle size for significant changes

4. **Documentation**:
   - Update this analysis after major dependency changes
   - Document any breaking changes encountered
   - Share learnings with team

---

## Dependency Health Metrics

### Overall Health: GOOD

| Metric | Score | Notes |
|--------|-------|-------|
| **Security** | 🟡 Moderate | Needs audit; Next.js version should be latest |
| **Freshness** | 🟢 Good | Most packages on latest major versions |
| **Maintenance** | 🟢 Good | Active maintenance on key dependencies |
| **Bundle Size** | 🟢 Good | Reasonable for a Next.js application |
| **Conflicts** | 🟢 Good | No known conflicts |
| **Tech Debt** | 🟡 Moderate | Some misplaced dependencies |

### Package Category Health

| Category | Health | Notes |
|----------|--------|-------|
| **Framework** (Next.js, React) | 🟢 Good | Modern, supported versions |
| **State Management** (Zustand, SWR) | 🟢 Good | Lightweight, modern choices |
| **Styling** (styled-components) | 🟢 Good | Latest major version |
| **GraphQL** | 🟢 Good | Comprehensive, modern stack |
| **Testing** | 🟢 Good | Jest 29, Testing Library 15 |
| **Linting** | 🟡 Moderate | ESLint 8 stable, but 9 coming |
| **Build Tools** | 🟢 Good | TypeScript 5, modern loaders |
| **Monitoring** | 🟢 Good | Prometheus client for metrics |
| **Internal Packages** | 🟡 Moderate | Need version verification |

---

## Estimated Update Effort

### Quick Wins (< 1 hour)
- Fix dependency categorization (dev vs prod)
- Run `npm audit fix` for auto-fixable issues
- Update patch versions of stable packages

### Medium Effort (1-4 hours)
- Update Next.js to latest 14.x (includes testing)
- Update styled-components to latest 6.x
- Update testing libraries

### High Effort (1-2 days)
- Migrate to Next.js 15 (future)
- Migrate to ESLint 9 (future)
- Replace major dependencies if needed

---

## Conclusion

The reg-ui project has a healthy dependency graph with modern, well-maintained packages. The main areas for improvement are:

1. **Immediate**: Fix misplaced dependencies (dev vs prod)
2. **Short-term**: Update Next.js for security patches
3. **Ongoing**: Monitor internal package updates from platform team

The application follows good practices with:
- ✅ Minimal dependencies (no bloat)
- ✅ Modern framework choices
- ✅ Functional programming support (Ramda + FP linting)
- ✅ Comprehensive testing setup
- ✅ Type safety throughout (TypeScript + Zod)

**Overall Risk Level**: LOW to MODERATE

The project is in good shape from a dependency perspective and can be maintained with standard update practices.
