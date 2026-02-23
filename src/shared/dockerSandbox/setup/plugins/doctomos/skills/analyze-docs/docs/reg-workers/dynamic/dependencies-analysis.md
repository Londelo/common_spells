# Dependency Analysis - reg-workers

## Risk Assessment

### High Priority Updates

#### Critical Security Risk
| Package | Current | Latest Stable | Risk Level | Issue |
|---------|---------|---------------|------------|-------|
| uuid | ^3.2.1 | 11.0.4 | **CRITICAL** | 8 major versions behind. Version 3.x is from 2017. Potential security vulnerabilities and lack of ES module support. |

#### Major Updates Needed
| Package | Current | Latest Stable | Risk Level | Issue |
|---------|---------|---------------|------------|-------|
| ramda | ^0.27.0 | 0.30.1 | HIGH | 3 years behind. Missing bug fixes and performance improvements. |
| jest | ^25.1.0 | 29.7.0 | HIGH | 4 major versions behind. Missing critical features and security fixes. |
| babel-jest | ^25.1.0 | 29.7.0 | HIGH | Must match Jest version for compatibility. |
| cucumber | ^6.0.5 | 11.1.0 | HIGH | 5 major versions behind. Missing modern BDD features. |
| eslint | ^7.26.0 | 9.18.0 | MEDIUM | 2 major versions behind. Missing latest linting rules. |
| webpack | ^5.0.0 | 5.98.0 | MEDIUM | On major version 5 but likely on early 5.0.0 (2020). Should update to 5.98.x (2025). |

#### TypeScript Ecosystem Updates
| Package | Current | Latest Stable | Risk Level | Issue |
|---------|---------|---------------|------------|-------|
| @types/node | ^20.12.7 | 22.10.5 | MEDIUM | Node.js 20 types. Consider updating if targeting Node 22. |
| @typescript-eslint/* | ^6.7.5 | 8.22.1 | MEDIUM | 2 major versions behind. May have compatibility issues with TypeScript 5.2.2. |

### Outdated Packages

#### Babel Ecosystem (Dev Only)
Most Babel packages are locked to `^7.13.0` (March 2021), now 4 years old. Current Babel is 7.26.x (2025).

**Impact:** Low for production (not bundled), but missing modern JavaScript feature transforms.

**Recommendation:** Update entire Babel ecosystem together to maintain compatibility.

#### Testing Frameworks
- `jest` and `babel-jest` at version 25 (2020) vs current 29 (2025)
- `cucumber` at version 6 (2020) vs current 11 (2025)
- `chai` at version 4.1.2 (2017) vs current 5.1.2 (2024)

**Impact:** Missing test features, slower test execution, potential security issues.

#### Development Tools
- `husky` - Updated to `^9.1.7` (current as of 2025) ✓
- `ts-node` - At `^10.9.1`, current is 10.9.2 (minor update available)
- `runjs` - At `^4.3.2`, current is 4.4.2 (minor update available)

### Unused Dependencies

#### Potentially Unused
Based on package.json analysis, these may be unused:

1. **`immutable` (^4.3.4)** - Listed in devDependencies but purpose unclear. FP patterns use Ramda instead.
2. **`ls` (^0.2.1)** - Utility package. Likely used in scripts, but Node.js `fs.readdir` could replace it.
3. **`copy-paste` (^2.1.1)** - CLI utility. Used in operational scripts?
4. **`colors` (^1.1.2)** - Terminal colors. May be used in runjs tasks.
5. **`csv-parse` (^4.4.1)** - CSV parsing. Used in `uploadInvites` script per CLAUDE.md.

**Recommendation:** Audit these packages by searching for imports. Remove if genuinely unused.

#### Duplicate Functionality
- **Date handling:** Both `date-fns` (^3.6.0) and `@verifiedfan/date` (^1.2.1). Consider standardizing on one.
- **Logging:** Both `debug` (^4.1.0) and `@verifiedfan/log` (^1.4.1). Ensure clear separation of concerns.

### Bundle Size Concerns

#### Large Production Dependencies
| Package | Approximate Size | Impact |
|---------|-----------------|--------|
| ramda | ~80 KB | Used extensively for FP transformations. Consider tree-shaking. |
| date-fns | ~70 KB | Can be tree-shaken if imported with subpath imports. |
| jsonwebtoken | ~50 KB | Necessary for JWT validation. |
| ajv | ~120 KB | Necessary for schema validation. |
| @opentelemetry/api | ~30 KB | Necessary for tracing. |

**Total Production Bundle:** Estimated ~800 KB before Webpack optimization.

**Recommendation:**
- Verify Webpack is tree-shaking unused Ramda and date-fns functions
- Consider replacing `ramda` with more targeted FP utilities if only using a subset
- Audit if all dependencies are needed in all workers (some workers may need lighter bundles)

## Security Considerations

### Known Vulnerabilities

**Run audit:**
```bash
yarn audit
npm audit
```

### High-Risk Packages

1. **`uuid@3.2.1`** - Ancient version. Known to have performance and security issues in older versions.
2. **`jsonwebtoken@^9.0.3`** - JWT library. Ensure it's patched against algorithm confusion attacks.
3. **`ajv@^8.17.1`** - Schema validator. Should be current (8.x is latest major).

### Dependency Confusion Risk

Internal `@verifiedfan/*` packages could be vulnerable to dependency confusion attacks if not properly scoped to private registry.

**Recommendation:** Ensure `.npmrc` or `.yarnrc` properly scopes `@verifiedfan` to internal registry only.

## Performance Impact

### Ramda Performance
Ramda is known for prioritizing currying over raw performance. For high-throughput Lambda workers:

**Consider:**
- Native array methods where currying isn't needed
- Lodash/fp as alternative (similar API, better performance)
- Custom utility functions for hot paths

### Date Library Performance
`date-fns` is tree-shakeable and performant. Good choice over Moment.js.

### Async Patterns
- `async-retry` - Small, focused package. Good choice.
- `awaity` - May be redundant with modern async/await patterns.

## Recommendations

### Immediate Actions (Priority 1)

1. **Update `uuid` from 3.2.1 to 11.x**
   - Breaking change: API differences between v3 and v11
   - Test thoroughly before deploying
   - Use `uuid@11.x` or migrate to Node.js built-in `crypto.randomUUID()`

2. **Update Jest ecosystem (jest, babel-jest, @types/jest)**
   - Update to version 29.x
   - Review Jest config for breaking changes
   - Update test snapshots

3. **Run security audit**
   ```bash
   yarn audit
   yarn upgrade-interactive --latest
   ```

### Short-term Actions (Priority 2)

4. **Update Babel ecosystem**
   - Update all Babel packages to `^7.26.x` (latest)
   - Test bundling process
   - Verify no transform regressions

5. **Update ESLint and TypeScript tooling**
   - Update `@typescript-eslint/*` to version 8.x
   - Update `eslint` to version 9.x
   - Review breaking changes in ESLint flat config

6. **Update Cucumber to version 11.x**
   - Review integration test suite for breaking changes
   - Update Cucumber HTML reporter if needed

### Long-term Actions (Priority 3)

7. **Audit and remove unused dependencies**
   - Search codebase for imports of `immutable`, `ls`, `copy-paste`, `colors`
   - Remove if unused

8. **Consolidate date utilities**
   - Standardize on either `date-fns` or `@verifiedfan/date`
   - Document decision in CLAUDE.md

9. **Optimize bundle size**
   - Analyze Webpack bundle with `webpack-bundle-analyzer`
   - Ensure tree-shaking is working for Ramda and date-fns
   - Consider code-splitting for domain-specific workers

10. **Dependency update policy**
    - Schedule quarterly dependency updates
    - Automate with Renovate or Dependabot
    - Pin critical packages for stability

## Version Compatibility Matrix

| Tool/Runtime | Current Version | Required Node.js | Status |
|--------------|----------------|------------------|--------|
| Node.js | 18.18.2 (per CLAUDE.md) | - | ✓ Active LTS |
| TypeScript | 5.2.2 | >=14.17 | ✓ Compatible |
| ts-node | 10.9.1 | >=14.17 | ✓ Compatible |
| Jest | 25.1.0 | >=10 | ⚠ Old, update to 29.x |
| Webpack | 5.0.0 | >=10.13.0 | ⚠ Update to 5.98.x |
| ESLint | 7.26.0 | ^12.22.0 \|\| ^14.17.0 \|\| >=16.0.0 | ✓ Compatible, but outdated |

## Breaking Changes to Watch

When updating dependencies, pay special attention to:

1. **Jest 25 → 29**
   - `testEnvironment` defaults changed
   - Timer mocks API changed
   - Coverage reporting improved

2. **ESLint 7 → 9**
   - Flat config format (no more `.eslintrc`)
   - Some rules removed or renamed
   - Plugin API changes

3. **Cucumber 6 → 11**
   - Step definition API changes
   - Async/await now required
   - Configuration format changes

4. **uuid 3 → 11**
   - API completely rewritten
   - v1/v3/v4/v5 now separate named exports
   - `uuidv4()` no longer default export

5. **Ramda 0.27 → 0.30**
   - Minor breaking changes in type signatures
   - Some functions optimized (behavior unchanged)

## Dependency Update Testing Plan

1. **Update in isolated branch**
2. **Run full test suite:** `yarn test` (unit + integration + e2e)
3. **Test bundle:** `npx run workers:bundle`
4. **Test local invocation:** `npx run workers:invoke <worker> '<payload>'`
5. **Deploy to qa environment**
6. **Run integration tests in qa**
7. **Monitor CloudWatch metrics for 24 hours**
8. **Promote to dev → preprod → prod**

## Conclusion

This repository has significant technical debt in its dependencies. The most critical issue is the ancient `uuid` package (8 major versions behind). Testing frameworks are also severely outdated.

**Estimated effort to bring dependencies current:** 2-3 days
- Day 1: Update uuid, test, deploy to qa
- Day 2: Update Jest/Babel ecosystem, test thoroughly
- Day 3: Update ESLint, Cucumber, and remaining packages

**Risk level if not updated:**
- **Security:** HIGH (old packages may have CVEs)
- **Performance:** MEDIUM (missing optimizations)
- **Maintainability:** HIGH (harder to find documentation for old versions)
- **Developer Experience:** MEDIUM (missing modern features and better error messages)
