# Dependency Analysis - dmd-workers

## Executive Summary

This repository has **39 production dependencies** (20 internal, 13 external) and **40 dev dependencies**. The codebase shows several dependencies that are significantly outdated and may require attention.

## Risk Assessment

### HIGH PRIORITY UPDATES

#### 1. **moment** (^2.24.0) - CRITICAL
- **Current**: 2.24.0 (released ~2019)
- **Latest**: 2.30.1+
- **Risk**: Security vulnerabilities, deprecated by maintainers
- **Impact**: Used for date/time manipulation throughout codebase
- **Recommendation**: Migrate to modern alternatives (date-fns, dayjs, or Temporal when stable)
- **Note**: Moment is in maintenance mode and no longer recommended for new projects

#### 2. **uuid** (^3.2.1) - HIGH
- **Current**: 3.2.1 (released ~2018)
- **Latest**: 11.x
- **Risk**: 6+ major versions behind, potential bugs/security issues
- **Impact**: UUID generation for identifiers
- **Recommendation**: Upgrade to uuid@11.x (breaking changes likely)

#### 3. **debug** (^4.1.0) - MODERATE
- **Current**: 4.1.0 (released ~2019)
- **Latest**: 4.4.x
- **Risk**: Minor version drift (4.1 → 4.4)
- **Impact**: Debugging utilities
- **Recommendation**: Safe to upgrade to ^4.4.0

#### 4. **i18n** (^0.15.1) - MODERATE
- **Current**: 0.15.1 (released ~2023)
- **Latest**: 0.15.x (check for updates)
- **Risk**: May have newer patch versions
- **Impact**: Internationalization
- **Recommendation**: Check for latest 0.15.x patch version

#### 5. **ramda** (^0.27.0) - MODERATE
- **Current**: 0.27.0 (released ~2020)
- **Latest**: 0.30.x
- **Risk**: 3 minor versions behind
- **Impact**: Heavily used functional programming utilities
- **Recommendation**: Test and upgrade to ^0.30.0 (may have breaking changes)

### OUTDATED DEV DEPENDENCIES

#### 1. **eslint** (^7.26.0) - HIGH
- **Current**: 7.26.0 (released ~2021)
- **Latest**: 9.x
- **Risk**: 2 major versions behind, missing new linting rules
- **Impact**: Code quality tooling
- **Recommendation**: Upgrade to eslint@9.x (breaking changes expected)

#### 2. **jest** (^30.0.4) vs **babel-jest** (^25.1.0) - MISMATCH
- **Issue**: Jest is at v30, but babel-jest is at v25
- **Risk**: Version mismatch can cause testing issues
- **Recommendation**: Upgrade babel-jest to match jest version (^30.x)

#### 3. **cucumber** (^6.0.5) - MODERATE
- **Current**: 6.0.5 (released ~2020)
- **Latest**: 10.x+
- **Risk**: 4 major versions behind
- **Impact**: BDD testing
- **Recommendation**: Evaluate upgrade to latest Cucumber (breaking changes likely)

#### 4. **webpack** (^5.90.1) - CURRENT
- **Status**: Recent version, but check for latest 5.x patches
- **Recommendation**: Keep updated with 5.x patches

### INTERNAL PACKAGE VERSIONS

#### Potentially Outdated Internal Packages

1. **@verifiedfan/aws** (^2.8.0)
   - Check if newer 2.x versions available
   - Core infrastructure dependency - keep current

2. **@verifiedfan/tracing** (3.0.1 - NO CARET)
   - Only package without flexible versioning
   - **Action**: Verify if intentional lock or needs update

3. **Other @verifiedfan packages**
   - Most at 1.x or 2.x versions
   - **Action**: Coordinate with internal package maintainers for update strategy

## Security Considerations

### Known Issues

1. **moment.js**: CVE history, deprecated by maintainers
2. **Old uuid versions**: Potential entropy/randomness issues
3. **Old eslint**: May miss security-relevant linting rules

### Recommendations

1. Run `npm audit` or `yarn audit` to check for known CVEs
2. Update all packages showing vulnerabilities
3. Consider replacing deprecated packages (moment)

## Unused Dependencies Analysis

**Cannot fully determine without code inspection**, but suspicious candidates:

1. **awaity** (^1.0.0) - Promise utilities
   - Low usage utility, may be redundant with native async/await
   - Verify if actually used

2. **aws4** (^1.11.0) - AWS signing
   - May be redundant if @verifiedfan/aws handles signing
   - Verify if actually needed

3. **remove-accents** (^0.5.0)
   - Specialized text processing
   - Verify usage in internationalization context

4. **ls** (^0.2.1) - File listing utility in devDependencies
   - Check if actually used in build scripts

**Note**: Grep searches timed out due to repo size. Manual verification recommended.

## Performance Considerations

### Bundle Size Impact

1. **moment + moment-timezone**: Large bundle size (~50-60 KB combined)
   - Alternative: date-fns (~10 KB tree-shakeable)
   - Alternative: dayjs (~2 KB with plugins)

2. **ramda**: Full library is large (~150 KB)
   - Consider tree-shaking or targeted imports
   - Alternative: lodash/fp with tree-shaking

3. **immutable**: Large library if not tree-shaken
   - Verify usage and ensure tree-shaking

## Recommendations by Priority

### IMMEDIATE (Do in next sprint)

1. Audit dependencies with `yarn audit` for CVEs
2. Fix jest/babel-jest version mismatch (^30.x)
3. Plan migration away from moment.js
4. Upgrade uuid from v3 to v11

### SHORT TERM (1-2 months)

5. Upgrade eslint to v9.x
6. Update ramda to ^0.30.0
7. Update @typescript-eslint packages to match eslint
8. Review and remove unused dependencies (awaity, aws4, ls, etc.)

### MEDIUM TERM (3-6 months)

9. Complete moment.js migration to modern alternative
10. Upgrade Cucumber to v10+ (coordinate with test suite)
11. Review all @verifiedfan/* packages for newer versions
12. Consider replacing ramda with lodash/fp for better tree-shaking

### LONG TERM (Ongoing)

13. Establish dependency update policy (monthly/quarterly reviews)
14. Automate dependency updates with Renovate or Dependabot
15. Monitor bundle size and evaluate tree-shaking strategies

## Testing Strategy for Updates

When updating dependencies:

1. **Unit tests**: Ensure all Jest tests pass
2. **E2E tests**: Run Cucumber/BDD tests
3. **Build verification**: Ensure webpack builds successfully
4. **Linting**: Verify no new eslint errors
5. **Staging deployment**: Test in non-production environment
6. **Monitor**: Check CloudWatch logs for errors after deployment

## Dependency Graph Complexity

- **Internal coupling**: HIGH (20 @verifiedfan packages)
- **External coupling**: MODERATE (13 core packages)
- **Upgrade coordination**: Required across internal packages
- **Risk**: Internal package updates may cascade across multiple workers

## Notes

- Package manager: Yarn v4.0.2
- No peer dependency issues noted
- Babel ecosystem well-aligned (all ^7.x)
- TypeScript ecosystem current (^5.2.2, ^6.x eslint plugins)
