# Dependency Analysis - entry-service

## Risk Assessment

### High Priority Updates

#### Security & Maintenance Concerns

1. **ESLint 4.9.0** → Latest is 8.x (2025)
   - **Risk**: High - Missing security patches and bug fixes
   - **Impact**: Development tooling only, but outdated by several major versions
   - **Action**: Upgrade to latest ESLint 8.x with updated plugins

2. **Koa Ecosystem (2.4.1)** → Latest is 2.15.x
   - **Risk**: Medium - Missing bug fixes and potential security patches
   - **Impact**: Core framework, but likely API-compatible
   - **Action**: Test upgrade to latest Koa 2.x

3. **Babel ESLint (8.0.0)** → Deprecated
   - **Risk**: Medium - Package is deprecated in favor of @babel/eslint-parser
   - **Impact**: Build tooling
   - **Action**: Migrate to @babel/eslint-parser

4. **Request-Promise-Native (1.0.5)** → Deprecated
   - **Risk**: Medium - Request library is deprecated
   - **Impact**: HTTP client functionality
   - **Action**: Migrate to modern alternatives (axios, node-fetch, or native fetch)

5. **Husky (0.14.3)** → Latest is 9.x
   - **Risk**: Low - Git hooks manager, but very outdated
   - **Impact**: Development workflow only
   - **Action**: Upgrade to latest Husky

### Outdated Packages

#### Major Version Behind

| Package | Current | Latest | Gap | Risk |
|---------|---------|--------|-----|------|
| eslint | 4.9.0 | 8.57.0 | 4 major | High |
| husky | 0.14.3 | 9.x | 9 major | Low |
| cucumber | 6.0.5 | 10.x | 4 major | Medium |
| jest | 25.1.0 | 29.x | 4 major | Medium |
| nodemon | 1.12.1 | 3.x | 2 major | Low |
| debug | 3.1.0 | 4.x | 1 major | Low |
| colors | 1.1.2 | 1.4.0 | Minor | Low |

#### Framework & Runtime

| Package | Current | Status | Notes |
|---------|---------|--------|-------|
| koa | 2.4.1 | Stable 2.x exists | Upgrade to latest 2.x |
| koa-router | 7.3.0 | Latest 12.x | Major version behind |
| koa-bodyparser | 4.2.0 | Latest 4.4.x | Minor updates available |

#### Social Media SDKs

| Package | Current | Status | Risk |
|---------|---------|--------|------|
| fb | 2.0.0 | Outdated | Low - code is commented out |
| twitter | 1.7.1 | Deprecated | Low - code is commented out |
| tumblr.js | 1.1.1 | Unmaintained | Low - code is commented out |

**Note**: Social media integration code is entirely commented out but dependencies remain installed.

### Unused Dependencies

These packages appear in package.json but are not actively imported in the codebase:

#### Production Dependencies
- **fuel-rest (2.0.5)**: Salesforce Marketing Cloud SDK - not found in imports
  - May be used indirectly by @verifiedfan/lib's SfmcClient
  - **Action**: Verify usage and move to peer dependencies if needed

#### Potentially Unused
- **chai (4.1.2)**: Listed as production dependency but is a testing library
  - **Action**: Move to devDependencies

- **chai-json-equal (0.0.1)**: Listed as production dependency but is a testing library
  - **Action**: Move to devDependencies

### Commented Out Code

The `app/managers/shares/index.js` file has extensive social media integration code commented out:
- Facebook sharing via `fb` package
- Twitter posting via `twitter` package
- References to Tumblr integration

**Recommendation**: Either:
1. Remove commented code and unused social media dependencies
2. Document why this code is preserved (future re-enablement?)

## Security Considerations

### Known Vulnerability Classes

1. **Deprecated HTTP Libraries**
   - `request-promise-native` uses deprecated `request` library
   - Should migrate to maintained alternatives

2. **Outdated Testing Tools**
   - `jest@25.1.0` may have security vulnerabilities
   - Upgrade to latest Jest 29.x

3. **Old Build Tools**
   - `webpack@5.0.0` - on major version 5 but missing patches
   - Should upgrade to latest 5.x

### Best Practices

✅ **Good Practices**:
- Using escape-html for XSS prevention
- OpenTelemetry for modern observability
- Separation of internal and external dependencies

⚠️ **Areas for Improvement**:
- Several deprecated packages still in use
- Testing libraries in production dependencies
- Commented code with unused dependencies

## Internal Package Versions

### Potential Version Mismatches

The following internal packages may have newer versions available:

- **@verifiedfan/aws**: Currently ^2.4.0 (check for latest)
- **@verifiedfan/lib**: Currently ^1.6.1 (critical package, ensure latest)
- **@verifiedfan/configs**: Currently ^1.2.4 (check for updates)
- **@verifiedfan/mongodb**: Currently ^2.1.0 (check for updates)
- **@verifiedfan/tracing**: Currently ^3.0.1 (observability, ensure latest)

**Action**: Check internal package registry for latest versions and update accordingly.

## Recommendations

### Immediate Actions (High Priority)

1. **Move testing libraries to devDependencies**
   - chai, chai-json-equal

2. **Remove or document social media dependencies**
   - If code will be re-enabled: Document why it's commented
   - If code is dead: Remove fb, twitter, tumblr.js dependencies

3. **Upgrade ESLint ecosystem**
   - ESLint 4 → 8
   - babel-eslint → @babel/eslint-parser
   - Update all eslint-plugin-* packages

4. **Verify fuel-rest usage**
   - Determine if it's actually used
   - Move to peerDependencies if used indirectly

### Medium Priority

5. **Update Koa ecosystem**
   - Koa 2.4.1 → 2.15.x
   - koa-router 7.3.0 → 12.x (breaking changes possible)
   - Test thoroughly after upgrade

6. **Modernize HTTP client**
   - Replace request-promise-native with axios or native fetch
   - Update related code

7. **Update testing frameworks**
   - Jest 25 → 29
   - Cucumber 6 → 10
   - Update test configurations

### Low Priority

8. **Development tools**
   - Husky 0.14 → 9.x (new configuration format)
   - Nodemon 1.x → 3.x
   - Update other dev utilities

9. **Internal package updates**
   - Review internal package registry for updates
   - Prioritize @verifiedfan/lib, tracing, prometheus

## Migration Complexity

### Low Complexity (Quick Wins)
- Moving chai packages to devDependencies
- Updating @verifiedfan packages (should be compatible)
- Removing unused social media packages

### Medium Complexity (Plan & Test)
- ESLint major upgrade (config changes needed)
- Koa-router upgrade (API changes possible)
- Jest upgrade (config and API changes)

### High Complexity (Significant Effort)
- Replacing request-promise-native (code refactoring)
- Husky upgrade (configuration rewrite)
- Cucumber upgrade (feature file compatibility)

## Dependency Health Score

**Overall Health: 6/10**

**Breakdown**:
- ✅ Modern internal packages (8/10)
- ⚠️ External package versions (5/10)
- ⚠️ Security posture (6/10)
- ✅ Separation of concerns (8/10)
- ⚠️ Dead code cleanup (4/10)

**Key Issues**:
1. Multiple major versions behind on tooling
2. Deprecated packages still in use
3. Significant commented code with dependencies
4. Testing libraries in wrong dependency category
