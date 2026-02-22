# Dependency Analysis - code-service

## Executive Summary

The code-service has **41 production dependencies** (10 internal + 31 external) and **40 dev dependencies** (2 internal + 38 external).

**Key Findings:**
- Most dependencies are from 2017-2018 era (5-6 years old)
- Multiple outdated build tools (Babel 6, Webpack 3, ESLint 4)
- One deprecated library (request-promise-native)
- Two misplaced production dependencies (should be dev)
- One missing dependency declaration (@verifiedfan/aws)
- Heavy reliance on functional programming (Ramda)
- Strong observability instrumentation (Prometheus + Tracing)

## Risk Assessment

### 🔴 High Priority Issues

#### 1. Missing Dependency Declaration
**Package**: `@verifiedfan/aws`
- **Issue**: Imported in code but not declared in package.json
- **Impact**: Installation failures, version conflicts
- **Location**: `app/services/s3/index.js`
- **Fix**: Add to dependencies: `"@verifiedfan/aws": "^x.x.x"`

#### 2. Deprecated HTTP Library
**Package**: `request-promise-native` (^1.0.5)
- **Issue**: The `request` library and its wrappers are fully deprecated
- **Impact**: No security updates, potential vulnerabilities
- **Usage**: Likely used in `@verifiedfan/titan-request` as the base HTTP client
- **Fix**: Migrate to modern alternatives:
  - `axios` (most popular)
  - `node-fetch` (lightweight)
  - `got` (modern, feature-rich)

#### 3. Misplaced Test Dependencies
**Packages**: `chai` (^4.1.2), `chai-json-equal` (^0.0.1)
- **Issue**: Listed as production dependencies but only used in tests
- **Impact**: Bloats production bundle, confuses dependency purpose
- **Fix**: Move to devDependencies

### 🟡 Medium Priority Updates

#### 4. Outdated Build Toolchain
**Babel 6.x → Babel 7.x**
- Current: Multiple babel-* packages at 6.x (2017)
- Latest: Babel 7.x (2018+)
- Impact: Missing performance improvements, modern syntax support
- Migration effort: Medium (requires package renames, config updates)

**Webpack 3.x → Webpack 5.x**
- Current: ^3.8.1 (2017)
- Latest: 5.x (2020+)
- Impact: Better performance, tree-shaking, smaller bundles
- Migration effort: High (breaking changes, loader updates)

**ESLint 4.x → ESLint 8.x**
- Current: ^4.9.0 (2017)
- Latest: 8.x (current)
- Impact: Better rules, performance, modern JS support
- Migration effort: Low-Medium

#### 5. Outdated Test Framework
**Jest 21.x → Jest 29.x**
- Current: ^21.2.1 (2017)
- Latest: 29.x (current)
- Impact: Performance improvements, better snapshots
- Migration effort: Low

#### 6. Koa 2.4.1 → Koa 2.15.x
- Current: ^2.4.1 (2017)
- Latest: ^2.15.x (2024)
- Impact: Bug fixes, security updates
- Migration effort: Low (likely backwards compatible)

### 🟢 Low Priority / Informational

#### 7. Ramda ^0.27.0 → ^0.30.x
- Current: ^0.27.0 (2020)
- Latest: ^0.30.x (2024)
- Impact: New utility functions, minor improvements
- Migration effort: Very low (backwards compatible)

#### 8. OpenTracing / Lightstep
**Note**: OpenTracing has merged with OpenCensus to form OpenTelemetry
- Current: `opentracing` (^0.14.4), `lightstep-tracer` (^0.28.0)
- Future: Consider migrating to OpenTelemetry when feasible
- Impact: Future-proofs tracing infrastructure
- Migration effort: High (major architectural change)

## Outdated Packages Summary

| Package | Current | Latest | Versions Behind | Priority |
|---------|---------|--------|-----------------|----------|
| babel-* | 6.x | 7.x | 1 major | High |
| webpack | 3.8.1 | 5.x | 2 majors | High |
| eslint | 4.9.0 | 8.x | 4 majors | Medium |
| jest | 21.2.1 | 29.x | 8 majors | Medium |
| koa | 2.4.1 | 2.15.x | ~11 minors | Medium |
| cucumber | 6.0.5 | 10.x | 4 majors | Low |
| ramda | 0.27.0 | 0.30.x | 3 minors | Low |

## Unused Dependencies Analysis

Based on code search results, the following dependencies **may be unused** but require deeper verification:

**Production Dependencies - Not Found in Searches:**
- `dns-cache` - May be used internally by other packages or in runtime config

**Dev Dependencies - Possibly Unused:**
- `eslint-plugin-react` - No React code found (may be leftover from template)
- `eslint-plugin-graphql` - No GraphQL code found
- `eslint-plugin-css-modules` - No CSS modules found
- `copy-paste` - Not found in searches

**Note**: These should be verified with more thorough searches or test removals before deletion.

## Security Considerations

### Known Issues
1. **Deprecated request-promise-native**: No longer receives security updates
2. **Old Babel/Webpack versions**: May have unpatched vulnerabilities
3. **Old ESLint plugins**: May have security issues in dependency trees

### Recommendations
1. Run `npm audit` to identify known vulnerabilities
2. Update critical security dependencies first
3. Consider automated dependency update tools (Dependabot, Renovate)

## Bundle Size Impact

### Heavy Dependencies
- **ramda** (~60KB): Very heavily used, justified
- **koa** + middlewares (~50KB): Core framework, justified
- **babel-polyfill** (if included in prod): Consider targeted polyfills
- **chai** (if in prod bundle): Should be dev-only

### Optimization Opportunities
1. Ensure test libraries aren't bundled in production
2. Use tree-shaking with Ramda (import specific functions)
3. Consider code splitting if bundle is large

## Recommendations

### Immediate Actions (Week 1)
1. ✅ **Add `@verifiedfan/aws` to package.json**
   ```json
   "@verifiedfan/aws": "^2.x.x"
   ```

2. ✅ **Move test dependencies to devDependencies**
   - Move `chai` and `chai-json-equal` from dependencies to devDependencies

3. ✅ **Run security audit**
   ```bash
   npm audit
   npm audit fix
   ```

### Short-term Updates (Month 1-2)
1. **Replace deprecated HTTP library**
   - Evaluate: axios vs node-fetch vs got
   - Update @verifiedfan/titan-request (or fork if needed)
   - Test all external HTTP calls

2. **Update Koa ecosystem** (likely backwards compatible)
   ```bash
   npm update koa koa-router koa-bodyparser koa-compress
   ```

3. **Update minor versions** (low risk)
   - ramda: ^0.27.0 → ^0.30.x
   - Update internal @verifiedfan packages to latest

### Medium-term Upgrades (Month 3-6)
1. **Migrate to Babel 7**
   - Update all babel packages to @babel/* scoped versions
   - Update configuration files
   - Test build process thoroughly

2. **Update ESLint to v8**
   - Update eslint and all plugins
   - Update .eslintrc configuration
   - Fix any new linting errors

3. **Update Jest to v29**
   - Update jest and related packages
   - Review and update test configurations
   - Run full test suite

### Long-term Considerations (6+ months)
1. **Webpack 5 Migration**
   - Significant breaking changes
   - Review loader compatibility
   - Test build process extensively

2. **OpenTelemetry Migration**
   - Evaluate organizational readiness
   - Plan migration from OpenTracing to OpenTelemetry
   - Coordinate with infrastructure team

3. **Node.js Version Strategy**
   - Ensure Node.js version supports all updated dependencies
   - Plan LTS upgrade strategy

## Dependency Health Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| **Internal Deps** | 🟢 8/10 | Well-maintained, good versioning |
| **External Deps** | 🟡 5/10 | Functional but significantly outdated |
| **Security** | 🟡 6/10 | No critical issues but needs audit |
| **Maintenance** | 🟡 4/10 | 5-6 years since major updates |
| **Build Tools** | 🟡 4/10 | Very outdated (Babel 6, Webpack 3) |
| **Test Tools** | 🟡 5/10 | Functional but outdated |
| **Documentation** | 🟢 7/10 | Dependencies match usage patterns |

**Overall Assessment**: 🟡 **5.5/10** - Service is functional but needs modernization effort

## Testing Strategy for Updates

### For Each Update:
1. **Update dependencies** in package.json
2. **Run full test suite**: `npm test`
3. **Run integration tests**: Cucumber tests
4. **Check bundle size**: Ensure no unexpected increases
5. **Test in staging**: Deploy to staging environment
6. **Monitor metrics**: Watch Prometheus metrics for anomalies
7. **Check traces**: Verify distributed tracing still works
8. **Smoke test APIs**: Test all major endpoints

### Critical Paths to Test:
- Code upload (CSV parsing with csv-parse)
- Code reservation API endpoints
- Code counting operations
- MongoDB queries and indexes
- S3 operations
- JWT authentication
- Prometheus metrics collection
- Distributed tracing spans

## Cost-Benefit Analysis

### High-Value Updates (High benefit, low effort):
- Move test deps to devDependencies
- Add @verifiedfan/aws to package.json
- Update Koa ecosystem
- Update minor versions (Ramda, etc.)

### Medium-Value Updates (High benefit, medium effort):
- Replace request-promise-native
- Update ESLint
- Update Jest
- Migrate to Babel 7

### Low-Value Updates (Medium benefit, high effort):
- Webpack 5 migration (unless needed for features)
- OpenTelemetry migration (wait for org-wide initiative)

## Conclusion

The code-service has a **functional but aging dependency tree**. While the service works reliably, the dependencies are 5-6 years old, which presents maintenance and security risks.

**Priority**: Schedule a **dependency modernization sprint** in Q2-Q3 to address:
1. Critical issues (missing deps, deprecated libraries)
2. Security updates (audit + fixes)
3. Build toolchain updates (Babel, ESLint, Jest)

**Estimated effort**: 2-3 weeks for all short + medium-term updates

**Risk if not addressed**: Increasing difficulty to update in the future, potential security vulnerabilities, missing out on performance improvements
