# Dependency Analysis - ccpa-workers

## Risk Assessment

### 🔴 High Priority Updates

**Security & Maintenance Concerns:**

1. **moment (^2.24.0)** - CRITICAL
   - Current: 2.24.0 (released 2019)
   - Latest: 2.30.1+
   - Status: **Officially deprecated** - maintainers recommend migrating to alternatives
   - Risk: Security vulnerabilities, no active maintenance
   - Recommendation: Migrate to `date-fns` or `luxon`, or use `@verifiedfan/date`

2. **uuid (^3.2.1)** - HIGH PRIORITY
   - Current: 3.2.1 (released 2018)
   - Latest: 11.x
   - Risk: 6+ years outdated, missing security patches
   - Recommendation: Update to `uuid@^11.0.0`

3. **csv-parse (^4.14.1)** - MODERATE
   - Current: 4.14.1
   - Latest: 5.x
   - Risk: Missing bug fixes and performance improvements
   - Recommendation: Update to `csv-parse@^5.0.0`

4. **ramda (^0.27.0)** - MODERATE
   - Current: 0.27.0 (released 2020)
   - Latest: 0.30.x
   - Risk: Missing features and optimizations
   - Recommendation: Update to `ramda@^0.30.0`

### 🟡 Outdated Packages (2-4+ years behind)

**Testing & Development Tools:**

1. **cucumber (^6.0.5)**
   - Current: 6.0.5 (released 2020)
   - Latest: 10.x
   - Impact: Missing modern features, slower test execution
   - Recommendation: Update to `@cucumber/cucumber@^10.0.0` (note package rename)

2. **chai (^4.1.2)**
   - Current: 4.1.2 (released 2017)
   - Latest: 4.5.0+
   - Impact: Missing assertion features
   - Recommendation: Update to `chai@^4.5.0`

3. **eslint (^7.26.0)**
   - Current: 7.26.0 (released 2021)
   - Latest: 9.x
   - Impact: Missing new rules, performance improvements
   - Note: May require config updates for v8/v9
   - Recommendation: Update to `eslint@^9.0.0` with config migration

4. **jest (^30.0.4)** - UNUSUAL
   - Current version (30.0.4) is ahead of official releases
   - Official latest: ~29.7.x
   - Issue: This appears to be an invalid version
   - Recommendation: Verify and correct to `jest@^29.7.0`

**Build Tools:**

1. **@babel/* packages** - Mixed versions
   - Core packages: 7.13.0 (released 2021)
   - Some plugins: 7.23.4/7.26.8 (recent)
   - Inconsistency risk
   - Recommendation: Align all Babel packages to latest 7.x

2. **webpack (^5.0.0)**
   - Very broad range, could be anything from 5.0.0 to 5.95.x
   - Recommendation: Pin to more specific range like `^5.90.0`

### 🟢 Up-to-Date Packages

**Well-Maintained:**
- `typescript` (^5.2.2) - Recent, within major version
- `ts-node` (^10.9.1) - Latest stable
- `@opentelemetry/api` (^1.8.0) - Current
- `@typescript-eslint/*` (^6.7.5) - Recent
- `node-cache` (^5.1.2) - Stable, maintained

## Unused Dependencies Analysis

### Potentially Unused (Not Found in TypeScript Scans)

**Production:**
- `awaity` - No direct imports found
- `raw-loader` - Webpack-specific, may be in config only
- `readline-sync` - Likely CLI tool usage only

**Development:**
- `ls` - Unclear purpose, very generic name
- `immutable` - No imports found (declared as type in `shared/config/index.d.ts`)
- `colors` - No imports found in TypeScript files

**Verification Needed:**
These packages may be used in:
- JavaScript files (`/tools/`, `/features/`)
- Webpack/Babel configuration files
- Dynamic imports or require statements
- Transitive dependencies

### Recommended Actions
1. Run `npx depcheck` to identify truly unused dependencies
2. Search JavaScript files: `/tools/`, `/features/lib/`
3. Check webpack config and babel config for loader usage

## Internal Package Analysis (@verifiedfan/*)

### Version Alignment
Most internal packages use recent versions (1.x - 3.x range), suggesting active maintenance.

### Exception: Tracing Version Pin
```json
"@verifiedfan/tracing": "3.0.1"  // No caret!
```
**Why This Matters:**
- All other `@verifiedfan/*` packages use caret (`^`) versioning
- Exact pin suggests breaking changes in 3.0.2+ or intentional freeze
- Should investigate reason and consider updating

### Internal Package Updates Needed

Check these packages for available updates:
1. `@verifiedfan/aws` (^2.13.0) - Verify latest is 2.x
2. `@verifiedfan/request` (^3.5.1) - Check for 3.6+
3. `@verifiedfan/test-utils` (^3.4.2) - Development package

## Security Considerations

### Known Vulnerabilities (Run `yarn audit` to verify)

**High Risk Areas:**
1. **moment** - Known vulnerabilities in older versions
2. **uuid@3.x** - Potential weak random number generation
3. **Old Babel packages** - May have known issues
4. **webpack@5.0.0** - Very old 5.x, missing security patches

### Security Audit Commands
```bash
# Check for known vulnerabilities
yarn audit

# Check for outdated packages
yarn outdated

# Check for unused dependencies
npx depcheck
```

## Recommendations Summary

### Immediate Actions (Critical)
1. **Replace moment** with `date-fns`, `luxon`, or use `@verifiedfan/date`
2. **Update uuid** to ^11.0.0
3. **Fix jest version** from invalid 30.0.4 to correct 29.7.x
4. **Run security audit** and address high/critical vulnerabilities

### Short-term Actions (1-2 sprints)
1. Update csv-parse to ^5.0.0
2. Update ramda to ^0.30.0
3. Align all Babel packages to consistent 7.x version
4. Update cucumber to ^10.0.0 (new package name)
5. Update eslint to ^8.x or ^9.x (with migration)

### Long-term Actions (Next quarter)
1. Review and remove unused dependencies
2. Implement automated dependency update process (Renovate/Dependabot)
3. Standardize on internal package version policies
4. Document reason for `@verifiedfan/tracing` version pin

### Maintenance Strategy

**Suggested Approach:**
1. Enable Renovate or Dependabot for automated PRs
2. Set up grouped updates for related packages (@babel/*, @types/*)
3. Require security updates within 1 week
4. Allow minor/patch updates automatically (with tests)
5. Review major updates quarterly

## Testing Strategy for Updates

### Before Updating
1. Run full test suite: `yarn test`
2. Run linting: `yarn eslint:lint`
3. Check for build errors: `yarn build` (if exists)

### After Each Update
1. Run tests again
2. Test workers locally with `tools/invokeWorker.js`
3. Verify telemetry still works (tracing/logging)
4. Check AWS service integrations
5. Run integration tests if available

### High-Risk Updates (Require Extra Testing)
- **moment replacement**: Date formatting, timezone handling
- **uuid update**: UUID format consistency
- **cucumber update**: All BDD tests
- **babel updates**: Transpilation correctness

## Impact Analysis

### Low Risk Updates (Safe to do anytime)
- TypeScript type definitions (@types/*)
- Development tools (prettier, ls, colors)
- Documentation generators

### Medium Risk Updates (Test thoroughly)
- ramda, csv-parse, node-cache
- ESLint, Babel packages
- Testing frameworks (chai, jest)

### High Risk Updates (Require validation)
- moment → alternative (changes date handling throughout)
- uuid (changes ID generation)
- webpack, cucumber (changes build/test infrastructure)
- @verifiedfan/* packages (changes core functionality)
