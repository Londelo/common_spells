# Dependency Analysis - campaign-service

## Risk Assessment

### Critical - High Priority Updates

**GraphQL Stack (Legacy Versions)**
- `graphql` ^0.11.7 (Current: v16.x)
  - **7+ major versions behind**
  - Security vulnerabilities in older versions
  - Missing performance improvements
  - Recommendation: Upgrade to v15.x or v16.x with caution

- `graphql-tools` ^2.6.1 (Current: v10.x)
  - **8 major versions behind**
  - Recommendation: Upgrade after graphql core

- `graphql-type-json` ^0.1.4 (Archived package)
  - No longer maintained
  - Recommendation: Consider alternatives or fork

**Koa Stack (Outdated)**
- `koa` ^2.4.1 (Current: v2.15.x)
  - Missing security patches
  - Missing async/await improvements
  - Recommendation: Upgrade to latest v2.x

- `koa-router` ^7.3.0 (Current: v12.x)
  - **5 major versions behind**
  - Recommendation: Upgrade to v12.x

- `koa-bodyparser` ^4.2.0 (Current: v4.4.x)
  - Recommendation: Upgrade to latest v4.x

**Testing Stack (Outdated)**
- `jest` ^25.1.0 (Current: v29.x)
  - **4 major versions behind**
  - Missing performance improvements
  - Recommendation: Upgrade to v29.x

- `cucumber` ^6.0.5 (Current: @cucumber/cucumber v10.x)
  - **4 major versions behind**
  - Package renamed to @cucumber/cucumber
  - Recommendation: Migrate to new package

**Build Tools (Outdated)**
- `eslint` ^4.9.0 (Current: v9.x)
  - **5 major versions behind**
  - Missing critical security fixes
  - Recommendation: Upgrade to v8.x or v9.x (may require config changes)

- `webpack` ^5.90.1 (Current: v5.97.x)
  - Patch updates available
  - Recommendation: Upgrade to latest v5.x

**HTTP Client (Deprecated)**
- `request-promise-native` ^1.0.5
  - **Package deprecated** since 2020
  - Depends on deprecated `request` package
  - Security vulnerabilities
  - Recommendation: Replace with `axios`, `node-fetch`, or native `fetch`

### High - Outdated Packages

**Babel Stack (Minor Updates Needed)**
- `@babel/core` ^7.24.6 (Current: v7.26.x)
  - Recommendation: Upgrade to latest v7.x
- All Babel packages should be updated together

**Development Tools**
- `nodemon` ^1.12.1 (Current: v3.x)
  - **2 major versions behind**
  - Recommendation: Upgrade to v3.x

- `husky` ^0.14.3 (Current: v9.x)
  - **9 major versions behind**
  - Breaking changes in v4+ (new API)
  - Recommendation: Upgrade requires reconfiguring git hooks

**Utility Libraries**
- `ramda` ^0.27.0 (Current: v0.30.x)
  - Minor updates available
  - Recommendation: Upgrade to v0.30.x

- `debug` ^3.1.0 (Current: v4.x)
  - Recommendation: Upgrade to v4.x

### Medium - Minor Updates Available

**Internal Packages**
- All @verifiedfan/* packages should be checked for updates
- Recommendation: Review internal package registry for latest versions

**Dependencies Correctly Versioned**
- `@opentelemetry/api` ^1.9.0 (Reasonably current)
- `aws-sdk` ^2.429.0 (v2 is in maintenance, but acceptable for dev dependency)

### Low - Unusual/Abandoned Packages

**Small/Abandoned Packages to Review**
- `yamlparser` ^0.0.2 - Last updated 2012, consider `js-yaml` instead
- `random-ip` ^0.0.1 - Tiny package, consider implementing inline
- `dns-cache` ^2.0.0 - Check if still needed
- `nid` ^0.3.2 - Check if still needed, consider `nanoid` or `uuid`
- `koa-unless` ^1.0.7 - Last updated 2017
- `chai-json-equal` ^0.0.1 - Tiny package, version 0.0.1

## Unused Dependencies

**Likely Unused** (based on code search):
- `@verifiedfan/locale` - Present in both dependencies and devDependencies with different versions, but no imports found
  - Recommendation: Remove if not used

**Misplaced Dependencies**
- `chai` - In `dependencies` but should be in `devDependencies`
- `chai-json-equal` - In `dependencies` but should be in `devDependencies`
  - Recommendation: Move to devDependencies

**Potentially Unused** (requires manual verification):
- `@verifiedfan/avro` - No imports found (dev dependency)
- `random-ip` - No imports found
- `yamlparser` - No imports found

## Security Considerations

### Known Vulnerable Packages

**request-promise-native → request** (Deprecated)
- CVE-2023-28155: SSRF vulnerability
- Package officially deprecated
- **Action Required**: Replace immediately

**eslint ^4.9.0**
- Multiple security advisories for old versions
- **Action Required**: Upgrade to v8.x or v9.x

**Old GraphQL versions**
- Potential DoS vulnerabilities in older versions
- **Action Required**: Upgrade to v15.x or v16.x

**aws-sdk v2**
- AWS recommends migrating to v3
- v2 is in maintenance mode
- Lower priority (dev dependency only)

### Dependency Audit Recommendations

Run these commands to identify vulnerabilities:
```bash
yarn audit
npm audit
```

Consider using:
- `yarn audit fix` - Auto-fix vulnerabilities
- Snyk or Dependabot for continuous monitoring

## Recommendations

### Immediate Actions (Security & Deprecated)

1. **Replace request-promise-native**
   - Replace with `axios` or native `fetch`
   - Search codebase for usage
   - Update all HTTP client calls

2. **Upgrade ESLint**
   - Upgrade to v8.x
   - Update all eslint-plugin-* packages
   - May require config changes

3. **Move test dependencies**
   - Move `chai` and `chai-json-equal` to devDependencies

### Short-term Actions (3-6 months)

4. **Upgrade GraphQL stack**
   - Test compatibility with v15.x
   - Update schema definitions
   - Update all graphql-* packages together

5. **Upgrade Koa stack**
   - Update to latest v2.x
   - Update all koa-* middleware packages
   - Test routing and middleware

6. **Upgrade Jest**
   - Upgrade to v29.x
   - Update jest.config.js if needed
   - Verify all tests pass

7. **Migrate Cucumber**
   - Change from `cucumber` to `@cucumber/cucumber`
   - Update imports and scripts

### Medium-term Actions (6-12 months)

8. **Upgrade Husky**
   - Upgrade to v9.x
   - Reconfigure git hooks (new API in v4+)
   - Update scripts

9. **Clean up small packages**
   - Replace `yamlparser` with `js-yaml`
   - Replace `nid` with `nanoid` or `uuid`
   - Remove unused packages (`random-ip`, etc.)

10. **Upgrade Babel**
    - Update all @babel/* packages to latest v7.x
    - Test transpilation

### Long-term Maintenance

11. **Set up dependency monitoring**
    - Enable Dependabot or Renovate Bot
    - Configure auto-merge for patch updates
    - Weekly review of dependency updates

12. **Version pinning strategy**
    - Consider using exact versions for critical packages
    - Use `^` for minor updates, `~` for patches
    - Lock file (`yarn.lock`) should always be committed

13. **Internal package updates**
    - Establish schedule for checking @verifiedfan/* updates
    - Document breaking changes in internal packages

## Breaking Change Risk

### High Risk (Requires Careful Testing)
- GraphQL upgrade (schema changes, API changes)
- ESLint upgrade (may break existing code)
- Koa Router upgrade (routing changes)
- Husky upgrade (configuration format change)
- Cucumber migration (package rename, API changes)

### Medium Risk
- Jest upgrade (test API changes)
- Koa upgrade (middleware API changes)
- Babel upgrades (transpilation differences)

### Low Risk
- Ramda upgrade (mostly backward compatible)
- Debug upgrade (minimal API changes)
- Internal package updates (should be backward compatible)

## Version Lock Rationale

**mongodb resolution: ^6.17.0**
- Explicitly pinned in package.json resolutions
- Likely for compatibility with @verifiedfan/mongodb
- Recommendation: Verify with internal team before changing

## Dependency Count Summary

- **Production dependencies**: 18 packages
  - Internal: 14 @verifiedfan packages
  - External: 4 unique packages (2 misplaced test packages)

- **Dev dependencies**: 40 packages
  - Internal: 4 @verifiedfan packages
  - External: 36 packages

- **Total**: 58 dependencies (18 internal, 40 external)

**Health Score: 4/10**
- Many outdated packages
- Several deprecated packages
- Security vulnerabilities present
- Good: Internal packages well-utilized
- Good: Using Immutable dependency resolution for mongodb
