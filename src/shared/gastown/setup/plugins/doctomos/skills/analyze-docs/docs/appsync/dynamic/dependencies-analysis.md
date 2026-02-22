# Dependency Analysis - appsync

## Executive Summary

The appsync repository has **zero production dependencies** - all 63 packages are development dependencies used for building, testing, and linting. This is expected for an AWS AppSync service where resolvers are deployed as standalone JavaScript.

**Key Findings:**
- Several dependencies are severely outdated (5+ years behind)
- Babel 6.x toolchain appears to be legacy/unused (esbuild is the active build tool)
- AWS SDK v2 should be migrated to v3
- Cucumber testing framework is 5+ major versions behind
- Test-only internal dependencies have appropriate isolation

## Risk Assessment

### 🔴 High Priority Updates

#### 1. Cucumber (3.2.0 → 10.x)
**Gap:** 5+ major versions, 7 years old (released 2018)
**Risk:** Security vulnerabilities, missing features, ecosystem incompatibility
**Impact:** All feature tests use this framework
**Recommendation:** Upgrade to Cucumber 10.x. Breaking changes expected in API.

**Migration Steps:**
- Review Cucumber migration guides (v4-10)
- Update `features/` step definitions for new API
- Test all feature scenarios after upgrade
- Update `cucumber-html-reporter` to compatible version

#### 2. Babel Ecosystem (6.x → 7.x)
**Gap:** 7+ years old, end-of-life
**Risk:** Security vulnerabilities, no maintenance
**Suspicion:** May be unused since esbuild is the active build tool

**Recommendation:**
- **Option A (Preferred):** Remove Babel entirely if unused
  - Verify webpack is also unused
  - Remove 11 Babel packages (~30% of dependencies)
  - Simplify build pipeline
- **Option B:** Upgrade to Babel 7.x if needed for specific transforms
  - Significant breaking changes
  - Rewrite all babel config files

**Verification Needed:**
```bash
# Check if babel is actually invoked in build
grep -r "babel" runfile.js package.json
# Check webpack usage
grep -r "webpack" runfile.js package.json
```

#### 3. AWS SDK v2 (2.1438.0 → v3)
**Gap:** AWS SDK v2 is in maintenance mode
**Risk:** No new features, eventual deprecation
**Current State:** Project already uses `@aws-sdk/client-appsync` (v3) for AppSync operations

**Recommendation:**
- Identify where aws-sdk v2 is used (likely feature tests)
- Replace with specific @aws-sdk v3 clients (DynamoDB, Lambda, etc.)
- Remove aws-sdk v2 dependency

**Benefits:**
- Smaller bundle size (tree-shakeable)
- Better TypeScript support
- Active development/security updates

### 🟡 Medium Priority Updates

#### 4. Webpack (4.x → 5.x)
**Status:** Potentially unused (esbuild is primary bundler)
**Recommendation:**
- Verify if webpack is actually used
- If unused, remove dependency
- If used, upgrade to webpack 5.x

#### 5. Ramda (0.26.1 → 0.30.x)
**Gap:** ~4 minor versions behind
**Risk:** Low (stable library, minor version gaps)
**Recommendation:** Update to latest 0.30.x for bug fixes

#### 6. Chai (4.2.0 → 5.x)
**Gap:** 1 major version
**Risk:** Low-Medium (test-only, breaking changes possible)
**Recommendation:** Upgrade to Chai 5.x when convenient

### 🟢 Low Priority / No Action

- Jest (29.x): Up to date
- TypeScript (5.1.6): Modern version
- ESLint (8.x): Current stable
- esbuild (0.19.2): Recent version
- GraphQL (16.x): Current major version
- @aws-appsync packages: Recent versions

## Security Considerations

### Vulnerabilities (Expected)

Old packages with likely CVEs:
- **Babel 6.x**: End-of-life, no security patches
- **Cucumber 3.x**: 7 years old, unpatched vulnerabilities likely
- **AWS SDK v2**: In maintenance mode, limited security updates
- **Webpack 4.x**: If used, may have known vulnerabilities

**Action:** Run `npm audit` to identify specific CVEs
```bash
npm audit --production  # Check production dependencies (should be empty)
npm audit               # Check all dependencies
```

### Mitigation Strategy

Since all dependencies are **dev-only**:
- Lower risk than production dependencies
- Still important for developer security (supply chain attacks)
- Should be updated before they become critical vulnerabilities

## Unused Dependencies

### Suspected Unused Packages

Based on build configuration analysis:

**High Confidence Unused:**
- All 11 Babel 6.x packages (esbuild is the active build tool)
- `webpack` 4.x (no webpack config files, esbuild handles bundling)
- `babel-loader` (webpack-specific)

**Verification Needed:**
```bash
# Check actual usage in build scripts
cat /Users/Brodie.Balser/Documents/TM/vf/appsync/appsync/runfile.js
# Check for babel/webpack configs
ls -la /Users/Brodie.Balser/Documents/TM/vf/appsync/appsync | grep -E "babel|webpack"
```

**Potential Savings:**
- Remove 13+ unused packages
- Reduce `node_modules` size
- Faster `npm install`
- Simpler dependency tree

## Internal Dependency Health

### @verifiedfan/* Packages: Good Health

**Strengths:**
- All 11 packages properly scoped to dev dependencies
- No runtime coupling to production code
- Clear separation: tests use internal packages, resolvers don't

**Version Discipline:**
- All use semantic versioning with caret (^) ranges
- No wildcard versions
- All on stable 1.x or 2.x releases

**Recommendations:**
- Keep test-utils and cucumber-features in sync across repos
- Document breaking changes in internal package releases
- Consider version alignment across VF services

## Recommendations Summary

### Immediate Actions (This Sprint)

1. **Audit unused dependencies**
   - Verify Babel/Webpack usage
   - Remove if unused (~30% dependency reduction)

2. **Run security audit**
   ```bash
   npm audit
   npm outdated
   ```

3. **Create upgrade tickets**
   - Cucumber 3 → 10
   - AWS SDK v2 → v3 clients
   - Remove legacy build tools

### Short Term (Next 1-2 Sprints)

4. **Upgrade Cucumber to 10.x**
   - High-impact change (all feature tests)
   - Requires careful testing
   - Consider pairing with QA team

5. **Migrate AWS SDK v2 → v3**
   - Identify usage in feature tests
   - Replace with specific v3 clients
   - Test all AWS interactions

6. **Remove legacy build tools**
   - Delete Babel 6.x packages
   - Remove Webpack if unused
   - Update CI/CD scripts if needed

### Medium Term (Next Quarter)

7. **Update moderate outdated packages**
   - Ramda, Chai, ESLint plugins
   - Lower risk, incremental improvements

8. **Establish dependency update policy**
   - Regular dependency audits (monthly)
   - Automated Dependabot/Renovate PRs
   - Version pinning strategy for critical packages

## Dependency Update Strategy

### Proposed Approach

**Phase 1: Clean House (Week 1)**
- Remove unused dependencies
- Run security audit
- Document findings

**Phase 2: Critical Updates (Weeks 2-4)**
- Cucumber upgrade (biggest risk)
- AWS SDK v2 → v3 migration
- Babel removal

**Phase 3: Maintenance Updates (Weeks 5-6)**
- Update medium-priority packages
- Verify all tests pass
- Update documentation

**Phase 4: Automation (Ongoing)**
- Set up Dependabot
- Create dependency update policy
- Establish testing procedures for dependency updates

## Testing Strategy for Updates

### For Each Major Update

1. **Unit Tests**
   ```bash
   npx run test  # All Jest tests must pass
   ```

2. **Feature Tests**
   ```bash
   npx run features  # All Cucumber scenarios must pass
   ```

3. **Build Verification**
   ```bash
   npx run build     # Successful compilation
   npx run eslint    # No new linting errors
   ```

4. **Integration Testing**
   - Deploy to qa1 environment
   - Run full feature test suite
   - Verify API functionality

5. **Rollback Plan**
   - Keep package-lock.json in version control
   - Tag release before major updates
   - Document rollback procedure

## Long-Term Dependency Health

### Goals

- **Zero critical vulnerabilities** in npm audit
- **All dependencies < 2 major versions behind** latest
- **Monthly dependency review** process
- **Automated dependency updates** for patches/minors
- **Documentation of upgrade blockers** for major versions

### Metrics to Track

- Number of outdated packages
- Number of high/critical CVEs
- Time to update dependencies
- Test coverage during updates
- Dependency bundle size

### Success Criteria

- ✅ All critical security updates applied within 1 week
- ✅ Major version updates completed within 1 quarter
- ✅ Automated PR process for minor/patch updates
- ✅ Zero dependencies > 2 years old
- ✅ Regular dependency audits in CI/CD pipeline
