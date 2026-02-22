# Dependency Analysis - upload-service

## Executive Summary

The upload-service has **43 total dependencies** (13 production, 30 dev) plus **11 internal @verifiedfan packages** (9 production, 2 dev). The codebase is approximately **5-7 years old** based on dependency versions, with significant technical debt in outdated packages.

## Risk Assessment

### 🔴 Critical Issues

#### 1. Testing Libraries in Production Dependencies
**Problem:** `chai` and `chai-json-equal` are in `dependencies` instead of `devDependencies`

**Impact:**
- Bloats production bundle size
- Unnecessary packages in production containers
- Security attack surface increased

**Resolution:**
```bash
npm uninstall chai chai-json-equal
npm install --save-dev chai chai-json-equal
```

#### 2. Ancient External Dependencies
**Problem:** Most external packages are 5-7 years old (from 2017-2018)

**Critical packages needing updates:**
- **koa**: ^2.4.1 (2017) → Latest: 2.15.x (missing security fixes)
- **koa-router**: ^7.3.0 (2017) → Latest: 12.x (major version behind)
- **opentracing**: ^0.14.4 (2018) → Deprecated, migrate to OpenTelemetry
- **request-promise-native**: ^1.0.5 → **DEPRECATED** (use axios/node-fetch)
- **lightstep-tracer**: ^0.28.0 (2018) → Consider OpenTelemetry
- **eslint**: ^4.9.0 (2017) → Latest: 8.x+ (major security/features)
- **webpack**: ^3.8.1 (2017) → Latest: 5.x (major version behind)
- **husky**: ^0.14.3 (2017) → Latest: 9.x (completely different API)

#### 3. Deprecated Packages
**Confirmed deprecated:**
- **request-promise-native**: Package officially deprecated since 2020
  - Recommendation: Migrate to `axios`, `node-fetch`, or native `fetch` (Node 18+)

**Likely deprecated:**
- **lightstep-tracer**: Old tracing implementation
  - Recommendation: Migrate to OpenTelemetry
- **opentracing**: Superseded by OpenTelemetry specification

### 🟡 High Priority Updates

#### Node.js Version Compatibility
**Current tooling suggests:** Node 8-10 era (2017-2018)
**Recommendation:** Audit Node.js version requirements
- If using Node 18+, leverage native `fetch` API
- If using Node 16+, consider native Promise improvements
- Update Babel configuration for newer Node target

#### Major Version Updates Needed
1. **Koa ecosystem** (2.4.1 → 2.15.x)
   - Security patches
   - Performance improvements
   - Bug fixes

2. **Build tooling**
   - Webpack 3 → 5 (major performance/features)
   - ESLint 4 → 8+ (major improvements)
   - Babel 7.8.3 → 7.24+ (current)

3. **Testing frameworks**
   - Jest 25.1.0 → 29.x (current)
   - Cucumber 4.2.1 → 10.x (current)

### 🟢 Medium Priority

#### CSV Parsing
- **csv-parse**: Pinned to 4.8.6 (likely for stability)
- Latest: 5.x available
- Recommendation: Test migration, as pinning suggests previous breaking changes

#### Ramda Usage
- **ramda**: ^0.27.0 (2020)
- Latest: 0.30.x
- Minor updates available
- Heavily used throughout codebase (26+ files)

#### DNS Caching
- **dns-cache**: ^2.0.0
- Verify this is still providing value
- Consider native DNS caching improvements in newer Node versions

## Outdated Packages

### Production Dependencies Age
| Package | Current | Latest (Est.) | Age | Risk |
|---------|---------|---------------|-----|------|
| koa | 2.4.1 | 2.15.x | 7 years | High |
| koa-router | 7.3.0 | 12.x | 7 years | High |
| koa-better-body | 3.3.9 | 3.5.x | 6 years | Medium |
| koa-compress | 2.0.0 | 5.x | 7 years | Medium |
| koa-unless | 1.0.7 | 1.0.7 | Current | Low |
| request-promise-native | 1.0.5 | DEPRECATED | N/A | Critical |
| lightstep-tracer | 0.28.0 | 0.91.x | 5 years | High |
| opentracing | 0.14.4 | 0.14.7 | 5 years | High |
| ramda | 0.27.0 | 0.30.x | 4 years | Low |
| csv-parse | 4.8.6 | 5.5.x | 3 years | Low |
| dns-cache | 2.0.0 | 2.0.0 | Current | Low |
| chai* | 4.1.2 | 5.x | 6 years | High |

*Should be in devDependencies

### Dev Dependencies Age
| Package | Current | Latest (Est.) | Age | Risk |
|---------|---------|---------------|-----|------|
| eslint | 4.9.0 | 8.x+ | 7 years | Critical |
| webpack | 3.8.1 | 5.x | 7 years | Critical |
| jest | 25.1.0 | 29.x | 4 years | Medium |
| cucumber | 4.2.1 | 10.x | 6 years | Medium |
| husky | 0.14.3 | 9.x | 7 years | High |
| babel/* | 7.8.3 | 7.24.x | 4 years | Low |
| aws-sdk | 2.190.0 | 2.1600+ / 3.x | 6 years | Medium |

## Unused Dependencies

### Potentially Unused Production Dependencies
Based on code analysis, these may not be used:
- ⚠️ **chai**, **chai-json-equal** - Testing libs in production deps (confirmed unused in prod code)

### Potentially Unused Dev Dependencies
**Requires deeper analysis:**
- **eslint-plugin-react**: React linting, but no React code found
- **eslint-plugin-graphql**: GraphQL linting, usage unclear
- **eslint-plugin-css-modules**: CSS Modules, usage unclear
- **colors**: Console colors, limited usage found
- **copy-paste**: Clipboard utilities, usage unclear
- **yaml-loader**: YAML loading, usage unclear

**Recommendation:** Run `npx depcheck` to identify truly unused packages

## Security Considerations

### Known Vulnerability Categories

#### 1. Ancient ESLint (4.9.0 from 2017)
- Multiple known vulnerabilities in old versions
- Missing 4+ years of security patches
- **Action:** Upgrade to ESLint 8.x immediately

#### 2. Old Webpack (3.8.1 from 2017)
- Multiple known vulnerabilities
- Missing 5+ years of security patches
- **Action:** Upgrade to Webpack 5.x

#### 3. Deprecated request-promise-native
- No longer maintained
- Based on deprecated `request` package
- **Action:** Migrate to maintained alternative

#### 4. Old Koa Ecosystem
- Koa 2.4.1 missing security patches from 2018-2024
- Middleware packages similarly outdated
- **Action:** Update entire Koa stack

#### 5. Ancient Husky (0.14.3)
- Git hooks package from 2017
- API completely changed in modern versions
- **Action:** Upgrade (requires migration to new config format)

### Recommended Security Audit
```bash
# Run npm audit
npm audit

# Generate detailed report
npm audit --json > audit-report.json

# Fix automatically (with caution)
npm audit fix

# Check for outdated packages
npm outdated
```

## Internal Package Dependency Analysis

### @verifiedfan/lib - Refactoring Opportunity
**Issue:** This package is imported in 20+ files for various purposes

**Modules used:**
- `selectors`
- `middlewares`
- `error`
- `jwt`
- `paramUtils`
- `date`
- `tracingUtils`
- `testUtils`
- `validators`
- `Config`
- `Runfile`
- `Objects`
- `Build`

**Recommendation:**
- Consider if `@verifiedfan/lib` should be split into focused packages
- Example: `@verifiedfan/middleware`, `@verifiedfan/selectors`, etc.
- Would improve tree-shaking and reduce coupling

### Internal Package Update Strategy
All internal packages use caret (^) versioning:
- Allows automatic minor/patch updates
- Ensures latest fixes are picked up
- **Risk:** Breaking changes in minor versions

**Recommendation:**
- Audit internal package change logs before updating
- Consider using lock file (package-lock.json) for stability
- Run full test suite after internal package updates

## Recommendations

### Immediate Actions (This Sprint)
1. ✅ **Move test libraries to devDependencies**
   - `chai`, `chai-json-equal`

2. ✅ **Run security audit**
   - `npm audit`
   - Address critical/high vulnerabilities

3. ✅ **Identify unused dependencies**
   - `npx depcheck`
   - Remove confirmed unused packages

### Short-term (Next 1-2 Sprints)

4. ✅ **Replace deprecated request-promise-native**
   ```javascript
   // Before
   const rp = require('request-promise-native');

   // After (with axios)
   const axios = require('axios');
   ```

5. ✅ **Update Koa ecosystem**
   - Koa 2.4.1 → 2.15.x
   - Test thoroughly (likely non-breaking)

6. ✅ **Update ESLint**
   - ESLint 4 → 8+
   - Update ESLint config syntax
   - Fix new linting errors

### Medium-term (Next Quarter)

7. ✅ **Migrate to OpenTelemetry**
   - Replace `opentracing` + `lightstep-tracer`
   - Modern observability standard
   - Better ecosystem support

8. ✅ **Update build tooling**
   - Webpack 3 → 5
   - Update Babel configuration
   - Test build pipeline thoroughly

9. ✅ **Update testing frameworks**
   - Jest 25 → 29
   - Cucumber 4 → 10
   - Update test scripts

10. ✅ **Update Husky**
    - Husky 0.14 → 9.x
    - Migrate to new configuration format
    - Update git hooks

### Long-term (Next 6 Months)

11. ✅ **Node.js version audit**
    - Determine minimum Node.js version
    - Update to Node 18+ LTS
    - Leverage native features (fetch, etc.)

12. ✅ **Internal package architecture review**
    - Consider splitting `@verifiedfan/lib`
    - Improve tree-shaking
    - Reduce coupling

13. ✅ **Dependency update automation**
    - Implement Renovate or Dependabot
    - Automated PR for updates
    - Automated testing of updates

## Migration Guides

### Replacing request-promise-native

**Option 1: Axios (Recommended)**
```javascript
// Before
const rp = require('request-promise-native');
const result = await rp({
  uri: 'https://api.example.com',
  json: true
});

// After
const axios = require('axios');
const { data } = await axios.get('https://api.example.com');
```

**Option 2: Native fetch (Node 18+)**
```javascript
// Before
const rp = require('request-promise-native');
const result = await rp({ uri: url, json: true });

// After
const response = await fetch(url);
const result = await response.json();
```

### Migrating to OpenTelemetry

**Current:**
```javascript
import { Tracer } from 'opentracing';
import LightstepTracer from 'lightstep-tracer';
```

**Future:**
```javascript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { LightstepHttpExporter } from '@opentelemetry/exporter-lightstep';
```

See OpenTelemetry migration guide: https://opentelemetry.io/docs/migration/opentracing/

## Dependency Health Score

| Category | Score | Grade |
|----------|-------|-------|
| Production Dependencies | 3/10 | F |
| Dev Dependencies | 2/10 | F |
| Internal Dependencies | 7/10 | C |
| Security Posture | 3/10 | F |
| Maintenance Status | 2/10 | F |
| **Overall** | **3.4/10** | **F** |

### Rationale
- **Critical issues:** Deprecated packages, ancient versions, misplaced dependencies
- **Security:** Multiple packages 5-7 years old with known vulnerabilities
- **Maintenance:** Most packages not updated since 2017-2018
- **Internal packages:** Well-versioned and maintained (only bright spot)

## Conclusion

The upload-service dependency ecosystem requires **urgent attention**. With most external packages 5-7 years old and several deprecated, the service is at **high risk** for security vulnerabilities and compatibility issues.

**Priority order:**
1. Security fixes (ESLint, Webpack, Koa)
2. Remove deprecated packages (request-promise-native)
3. Systematic update of core dependencies
4. Internal package architecture review

Estimated effort: **8-12 weeks** for complete modernization.
