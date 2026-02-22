# Dependency Analysis - export-service

## Risk Assessment

### Critical: Security & Maintenance Issues

#### Outdated Major Versions

**chai** (v4.1.2, latest: v5.x)
- **Risk**: Using very old version from 2017
- **Impact**: Missing security patches and bug fixes
- **Action**: Update to v5.x (breaking changes expected)
- **Note**: Only used in production dependencies (unusual - should be dev dependency)

**koa** (v2.4.1, latest: v2.15+)
- **Risk**: Multiple minor versions behind
- **Impact**: Missing security patches, performance improvements
- **Action**: Update to latest v2.x (should be backwards compatible)

**koa-router** (v7.3.0, latest: v12+)
- **Risk**: Multiple major versions behind
- **Impact**: Missing features and security updates
- **Action**: Major version update required (breaking changes expected)

**moment** (v2.24.0, latest: v2.30+)
- **Risk**: Known deprecated library, legacy version
- **Impact**: No longer actively maintained
- **Action**: Migrate to modern alternatives (date-fns, dayjs, or Temporal API)
- **Note**: Internal @verifiedfan/date package may already provide abstraction

**moment-timezone** (v0.5.14, latest: v0.5.45+)
- **Risk**: Many patch versions behind
- **Impact**: Missing timezone data updates
- **Action**: Update to latest v0.5.x

**uuid** (v3.3.2, latest: v11.x)
- **Risk**: Multiple major versions behind
- **Impact**: Missing performance improvements and new features
- **Action**: Update to v11.x (breaking changes expected)

**ramda** (v0.27.0, latest: v0.30+)
- **Risk**: Minor versions behind
- **Impact**: Missing optimizations
- **Action**: Update to v0.30.x

#### Development Dependencies - Critical

**babel-eslint** (v8.0.0, deprecated)
- **Risk**: Package is deprecated, replaced by @babel/eslint-parser
- **Impact**: No longer maintained
- **Action**: Replace with @babel/eslint-parser

**eslint** (v7.0.0, latest: v9.x)
- **Risk**: Multiple major versions behind
- **Impact**: Missing modern linting rules and features
- **Action**: Update to v9.x (breaking changes expected)

**jest** (v25.1.0, latest: v29.x)
- **Risk**: Multiple major versions behind
- **Impact**: Missing features, performance improvements
- **Action**: Update to v29.x (test changes may be required)

**cucumber** (v6.0.5, latest: v10.x)
- **Risk**: Multiple major versions behind
- **Impact**: Missing features and improvements
- **Action**: Update to v10.x

**husky** (v0.14.3, latest: v9.x)
- **Risk**: Extremely outdated, different API in modern versions
- **Impact**: Old git hooks implementation
- **Action**: Major migration to v9.x (completely different setup)

**webpack** (v5.90.1, latest: v5.96+)
- **Risk**: Minor patch versions behind
- **Impact**: Missing bug fixes
- **Action**: Update to latest v5.x

### Medium Priority Updates

**dns-cache** (v2.0.0)
- Low activity package, consider if still needed

**jszip** (v3.10.1, latest: v3.10.1)
- Up to date

**csv-parse** (v4.15.4, latest: v5.x)
- Major version behind but stable

**csv-write-stream** (v2.0.0)
- Low activity package but functional

### Unused Dependencies

Based on code analysis, **potential unused dependencies**:

**chai** & **chai-json-equal** (in production deps)
- **Issue**: Testing libraries in production dependencies
- **Actual Usage**: Not found in production code (lib/app directories)
- **Action**: Move to devDependencies or remove if unused
- **Risk**: Low (just unnecessary package size)

## Security Considerations

### Known Vulnerabilities

1. **moment.js** - Known maintenance mode, potential timezone vulnerabilities
2. **old koa/koa-router** - May have known CVEs, need audit
3. **old uuid** - May have cryptographic randomness issues in v3.x

### Recommended Actions

1. Run `yarn audit` to identify specific CVEs
2. Update critical security packages immediately
3. Plan migration away from moment.js

## Modernization Roadmap

### Phase 1: Critical Security (Immediate)
1. Update koa, koa-router, koa-bodyparser, koa-compress
2. Update uuid to v11.x
3. Replace babel-eslint with @babel/eslint-parser
4. Move chai/chai-json-equal to devDependencies

### Phase 2: Testing Infrastructure (1-2 weeks)
1. Update jest to v29.x
2. Update cucumber to v10.x
3. Update all chai plugins
4. Test all test suites after updates

### Phase 3: Build Tools (1-2 weeks)
1. Update eslint to v9.x
2. Update webpack to latest v5.x
3. Update all babel packages to latest v7.x
4. Update husky to v9.x (requires configuration migration)

### Phase 4: Moment.js Migration (2-4 weeks)
1. Audit all moment usage
2. Check if @verifiedfan/date abstracts moment
3. Plan migration to date-fns or dayjs
4. Update moment-timezone or remove

### Phase 5: Utility Updates (Low priority)
1. Update ramda to v0.30.x
2. Update csv-parse to v5.x
3. Evaluate dns-cache usage
4. Update other minor packages

## Internal Package Health

### @verifiedfan/* Dependencies Status

All internal packages use caret (^) versioning, which is appropriate. No immediate concerns.

**Recommendation**: Verify that @verifiedfan/mongodb v2.1.0 is compatible with mongodb driver v6.17.0 (specified in resolutions).

## MongoDB Driver Resolution

```json
"resolutions": {
  "mongodb": "^6.17.0"
}
```

**Analysis**:
- Forces mongodb driver to v6.17.0 across all dependencies
- Likely required for @verifiedfan/mongodb v2.1.0 compatibility
- **Verify**: Check if @verifiedfan/mongodb has been updated to support newer drivers
- **Risk**: Medium - forcing old driver version may have security implications

## Performance Considerations

### Current Performance Risks

1. **Old Koa**: Missing HTTP/2 support and performance improvements
2. **Old uuid**: v3.x is slower than modern versions
3. **moment.js**: Known to be slower and larger than alternatives
4. **dns-cache**: Verify if still providing value

### Optimization Opportunities

1. Replace moment with lighter alternatives (60% bundle size reduction possible)
2. Update uuid for improved generation speed
3. Update koa ecosystem for better async performance

## Recommendations Summary

### Do Now
- [ ] Run `yarn audit` to identify CVEs
- [ ] Update koa, koa-router, koa-bodyparser to latest v2.x
- [ ] Move chai & chai-json-equal to devDependencies
- [ ] Update uuid to v11.x
- [ ] Update webpack to latest v5.x

### Do Soon (Next Sprint)
- [ ] Replace babel-eslint with @babel/eslint-parser
- [ ] Update jest to v29.x
- [ ] Update eslint to v9.x
- [ ] Update cucumber to v10.x
- [ ] Update moment-timezone to latest

### Plan For (Next Quarter)
- [ ] Migrate away from moment.js (consider @verifiedfan/date as abstraction)
- [ ] Update ramda to v0.30.x
- [ ] Migrate husky to v9.x
- [ ] Update csv-parse to v5.x
- [ ] Audit and potentially remove dns-cache if not providing value

### Monitor
- [ ] Watch @verifiedfan/* packages for updates
- [ ] Verify mongodb resolution is still necessary
- [ ] Track deprecation notices from yarn

## Dependency Graph Health

**Overall Health**: ⚠️ **Needs Attention**

- **Production Dependencies**: 7 outdated, 2 critical (moment, koa ecosystem)
- **Development Dependencies**: 10+ outdated, 3 critical (babel-eslint, eslint, jest)
- **Internal Dependencies**: ✅ Healthy
- **Security Risk**: Medium-High (multiple old versions with potential CVEs)
- **Maintenance Burden**: High (deferred updates accumulating technical debt)

## Long-term Strategy

1. **Establish Update Cadence**: Monthly dependency reviews
2. **Lock Major Versions**: Use ^ for minor updates, explicit majors
3. **Test Coverage**: Ensure tests catch breaking changes
4. **Internal Package Coordination**: Align @verifiedfan/* updates across services
5. **Deprecation Monitoring**: Track deprecated packages proactively
