# Dependency Analysis - dmd-pipeline

## Risk Assessment

### High Priority Issues

#### 1. Missing Dependency: uuid
**Severity**: High
**Issue**: `uuid` is imported in `src/delivery/S3Storage.ts` but not declared in package.json
**Impact**: May work due to transitive dependency, but could break if upstream changes
**Action**: Add `uuid` to dependencies section in package.json

```bash
yarn add uuid
```

#### 2. Unused Dependencies
**Severity**: Medium
**Issue**: Several packages in dependencies are not actively used
**Impact**: Increases bundle size, maintenance burden, and security surface area
**Action**: Remove unused packages

Unused packages:
- `liquidjs` (^10.11.1) - Template engine, no imports found
- `@aws-sdk/client-athena` (^3.564.0) - Not imported in src/
- `@aws-sdk/client-dynamodb` (^3.564.0) - Using streams/util instead
- `@aws-sdk/lib-dynamodb` (^3.564.0) - Not imported in src/
- `@aws-sdk/credential-providers` (^3.564.0) - Not explicitly imported (may be transitive)

```bash
yarn remove liquidjs @aws-sdk/client-athena @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/credential-providers
```

#### 3. Internal Framework Stability
**Severity**: Medium
**Issue**: `@ticketmaster/lambda` is at version ^0.0.2 (pre-1.0)
**Impact**: API instability, potential breaking changes
**Recommendation**:
- Coordinate with framework team on upgrade path
- Monitor for version updates and breaking changes
- Consider pinning exact version if stability issues arise

### Outdated Packages

#### ESLint Version
**Current**: ^8.54.1
**Latest**: 9.x
**Status**: One major version behind
**Impact**: Missing newer linting rules and fixes
**Priority**: Low
**Note**: ESLint 9.x has breaking changes; upgrade requires configuration updates
**Action**: Consider upgrading to ESLint 9.x when team bandwidth allows

#### Other Dependencies
All other external dependencies appear reasonably up-to-date:
- AWS SDK v3 at 3.564.0 (recent)
- Jest at 29.7.0 (current major version)
- TypeScript at 5.4.5 (recent)
- Winston at 3.13.0 (stable)

### Low Priority Updates

#### Parquets Package
**Current**: ^0.10.10
**Note**: `parquets` package has patched `ParquetTransformer` in codebase (see `src/format/parquet/index.ts`)
**Issue**: Custom patch to propagate errors to stream (PR #26)
**Action**: Monitor upstream for merge of error propagation fix
**Risk**: Future updates may conflict with local patch

## Security Considerations

### Known Vulnerabilities
**Status**: No known critical vulnerabilities identified in listed versions
**Recommendation**: Run `yarn audit` regularly to check for security advisories

### Serialization Libraries
**Packages**: `avsc`, `parquets`
**Risk**: These handle binary data deserialization
**Mitigation**: Always validate input data before deserialization (already implemented via `validate()` methods)
**Note**: Both packages are actively maintained with good security track records

### AWS SDK
**Version**: 3.564.0 across all packages
**Status**: Modern, well-maintained SDK
**Note**: Modular approach reduces attack surface by only including needed clients

### Logging
**Package**: `winston` (^3.13.0)
**Risk**: Potential log injection if user input logged without sanitization
**Mitigation**: Review logging calls to ensure no unsanitized user input
**Current Status**: Logger usage appears safe (mostly internal data)

## Recommendations

### Immediate Actions (High Priority)
1. **Add `uuid` to package.json** - Fix missing dependency
2. **Remove unused dependencies** - Clean up liquidjs, unused AWS SDK packages
3. **Run dependency audit** - `yarn audit` to check for vulnerabilities

### Short-term Actions (Next Sprint)
1. **Verify AWS SDK usage** - Confirm `credential-providers` is truly unused
2. **Monitor `@ticketmaster/lambda`** - Watch for version updates
3. **Document parquets patch** - Ensure team knows about custom error handling

### Long-term Considerations
1. **ESLint upgrade** - Plan migration to ESLint 9.x
2. **Track parquets upstream** - Watch for error propagation PR merge
3. **Framework stability** - Coordinate with `@ticketmaster/lambda` maintainers on v1.0 timeline

## Dependency Health Matrix

| Category | Status | Notes |
|----------|--------|-------|
| Production Dependencies | Good | Modern versions, well-maintained |
| Dev Dependencies | Good | Current tooling versions |
| Security Posture | Good | No known critical vulnerabilities |
| Maintenance Burden | Medium | Some unused deps to clean up |
| Framework Risk | Medium | Internal framework at v0.0.2 |
| Type Safety | Excellent | Full TypeScript with @types packages |

## Technical Debt

### Item 1: Missing uuid Declaration
**Effort**: 5 minutes
**Impact**: Prevents potential runtime breakage
**Priority**: High

### Item 2: Unused Dependencies
**Effort**: 15 minutes (remove + test)
**Impact**: Reduces bundle size, improves install time
**Priority**: Medium

### Item 3: Parquets Custom Patch
**Effort**: Ongoing monitoring
**Impact**: May require manual merge on upstream updates
**Priority**: Low (document and monitor)

### Item 4: Framework Version Lock
**Effort**: Coordinate with framework team
**Impact**: Stability vs. features tradeoff
**Priority**: Medium (discuss with team)

## Testing Dependencies

All testing dependencies are current and appropriate:
- Jest 29.7.0 (latest stable)
- ts-jest 29.1.2 (matches Jest version)
- @types/jest 29.5.12 (matches Jest version)

No testing-specific concerns identified.

## Build Tool Dependencies

Build tooling is modern and appropriate:
- TypeScript 5.4.5 (recent)
- esbuild 0.20.2 (fast bundler)
- ts-node 10.9.2 (development execution)

No build tool concerns identified.

## Summary

Overall dependency health is **GOOD** with a few cleanup items needed. The main risks are:
1. Missing `uuid` declaration (high priority fix)
2. Unused dependencies adding bloat (medium priority cleanup)
3. Pre-1.0 internal framework requiring coordination (ongoing monitoring)

Recommended immediate action: Add uuid and remove unused dependencies in next maintenance window.
