# Dependency Analysis - admin-ui

## Risk Assessment

### Critical Security & Compatibility Issues

#### 1. **@babel/polyfill is deprecated** (HIGH PRIORITY)
- **Package**: `@babel/polyfill@^7.12.1`
- **Issue**: Deprecated since Babel 7.4.0
- **Impact**: No longer maintained, potential security vulnerabilities
- **Recommendation**: Replace with direct imports of `core-js` and `regenerator-runtime`
- **Migration**: Use `@babel/preset-env` with `useBuiltIns: 'usage'` option

#### 2. **ESLint v4 is extremely outdated** (HIGH PRIORITY)
- **Package**: `eslint@^4.9.0` (current version: 9.x)
- **Issue**: 5+ major versions behind, missing critical security patches
- **Impact**: Security vulnerabilities, missing modern JavaScript features
- **Recommendation**: Upgrade to ESLint 8.x or 9.x (with compatibility testing)

#### 3. **Apollo Client v2 is outdated** (MEDIUM PRIORITY)
- **Packages**:
  - `apollo-client@^2.6.10`
  - `apollo-cache-inmemory@^1.1.7`
  - `apollo-link-http@^1.3.3`
- **Issue**: Apollo Client v2 reached end-of-life, current version is v3.x
- **Impact**: Missing performance improvements, type safety, and security updates
- **Recommendation**: Migrate to `@apollo/client@^3.x` (breaking changes)

#### 4. **GraphQL v0.13 is ancient** (HIGH PRIORITY)
- **Package**: `graphql@^0.13.0` (current version: 16.x)
- **Issue**: 15+ major versions behind (released ~2018)
- **Impact**: Missing critical features and security patches
- **Recommendation**: Upgrade to `graphql@^16.x`

#### 5. **source-map-support v0.4 is very old** (LOW PRIORITY)
- **Package**: `source-map-support@^0.4.18` (current version: 0.5.x)
- **Issue**: Minor version outdated
- **Recommendation**: Upgrade to `^0.5.21`

#### 6. **Husky v0.14 is extremely outdated** (MEDIUM PRIORITY)
- **Package**: `husky@^0.14.3` (current version: 9.x)
- **Issue**: 8+ major versions behind, API completely changed
- **Recommendation**: Upgrade to Husky 9.x (requires configuration changes)

### Outdated but Functional

#### Babel Ecosystem (MEDIUM PRIORITY)
- **Versions**: Most packages at `^7.13.0` (2021)
- **Current**: Babel 7.26.x
- **Issue**: Missing 3+ years of improvements
- **Recommendation**: Upgrade to latest `^7.26.x` for all Babel packages

#### Webpack 5 (LOW PRIORITY)
- **Version**: `^5.72.0` (2022)
- **Current**: `^5.97.x`
- **Issue**: Minor versions behind
- **Recommendation**: Update to `^5.97.x`

#### Jest 30 (GOOD)
- **Version**: `^30.0.5`
- **Status**: Latest version
- **Recommendation**: No action needed

### Potentially Unused Dependencies

Based on code search, the following packages may be unused:

1. **async-retry** - No imports found
2. **cucumber-html-reporter** - Only in package.json, no feature files reference it
3. **randomstring** - No imports found
4. **request-promise-native** - No imports found (potentially replaced by fetch)

**Recommendation**: Audit these packages with more thorough search or remove if confirmed unused.

## Security Considerations

### Known Vulnerability Patterns

1. **Prototype Pollution**: Old versions of libraries (ESLint, GraphQL, Apollo) may have unpatched prototype pollution vulnerabilities
2. **RegEx DoS**: Outdated parsers (babel-eslint v8) may have regex denial-of-service issues
3. **Supply Chain**: Ancient packages have higher risk of unmaintained transitive dependencies

### Immediate Actions Required

1. Run `npm audit` or `yarn audit` to identify known CVEs
2. Update ESLint, GraphQL, and Apollo packages immediately
3. Remove deprecated `@babel/polyfill`
4. Audit potentially unused dependencies

## Maintenance Burden

### High Maintenance Cost

- **Apollo v2 → v3 Migration**: Significant API changes, requires refactoring GraphQL client setup
- **ESLint v4 → v9 Upgrade**: Breaking changes in rules and configuration format
- **Babel Updates**: Relatively safe but requires testing

### Medium Maintenance Cost

- **Husky v0.14 → v9**: Configuration format completely changed (git hooks)
- **GraphQL v0.13 → v16**: API changes, schema validation differences

### Low Maintenance Cost

- **date-fns**, **ramda**, **webpack**: Minor version updates, mostly backward compatible

## Recommendations Summary

### Immediate (This Sprint)
1. Remove `@babel/polyfill`, configure `@babel/preset-env` properly
2. Update `graphql` to `^16.x`
3. Update `eslint` to `^8.57.0` (last v8 before v9 breaking changes)
4. Remove unused dependencies (async-retry, randomstring, etc.)

### Short-term (Next Quarter)
1. Migrate Apollo Client v2 → v3
2. Update all Babel packages to `^7.26.x`
3. Upgrade Husky to v9 with new configuration
4. Update ESLint to v9 (after v8 stabilization)

### Long-term (Tech Debt)
1. Consider replacing `ramda` with native ES methods (if not heavily used)
2. Evaluate if `request-promise-native` can be fully replaced by `fetch`
3. Regular dependency update cadence (quarterly)

## Testing Strategy for Updates

1. **GraphQL Update**:
   - Test all GraphQL queries/mutations
   - Verify schema introspection works
   - Check error handling

2. **Apollo Client v3 Migration**:
   - Rewrite client initialization
   - Test cache behavior
   - Verify file uploads still work
   - Check SSR compatibility (if applicable)

3. **ESLint Update**:
   - Fix linting errors incrementally
   - Update `.eslintrc.yml` for new rule formats
   - Verify all plugins are compatible

4. **Babel Updates**:
   - Test transpilation output
   - Verify polyfills work in target browsers
   - Check source maps are correct

## Dependency Health Score

| Category | Score | Notes |
|----------|-------|-------|
| Security | 3/10 | Critical vulnerabilities likely due to outdated packages |
| Maintenance | 4/10 | Significant tech debt, multiple breaking updates needed |
| Modernity | 3/10 | Many packages 3-5 years behind current versions |
| Stability | 7/10 | Current setup works, no immediate breaking issues |
| **Overall** | **4/10** | Requires urgent attention |

## Long-term Sustainability

**Current Trajectory**: Without updates, this project will accumulate more tech debt and become increasingly difficult to maintain.

**Recommended Approach**:
1. Establish quarterly dependency review process
2. Update critical security patches immediately
3. Plan migration sprints for major version upgrades
4. Consider using Dependabot or Renovate for automated PR creation
