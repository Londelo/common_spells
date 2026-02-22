# Operations - vf-lib

## Overview

This is a **library repository** that publishes npm packages. Operational concerns are primarily around the CI/CD pipeline, package versioning, and npm registry availability.

## Monitoring

### GitLab CI Pipeline Monitoring

**Monitor**: GitLab CI pipeline status
**Location**: `https://git.tmaws.io/verifiedfan/lib/pipelines`

**Key Metrics**:
- Pipeline success/failure rate
- Build duration
- Test execution time
- Release frequency

**Alerts**:
- Pipeline failures visible in GitLab UI
- Email notifications to committers on failure (if configured)

### npm Package Availability

**Registry**: npmjs.org
**Package Scope**: `@verifiedfan`

**How to Check**:
```bash
# Check if package exists
npm view @verifiedfan/<package-name>

# Check latest version
npm view @verifiedfan/<package-name> version

# Check all versions
npm view @verifiedfan/<package-name> versions
```

### No Application Monitoring

This repository does NOT have:
- CloudWatch metrics or alarms
- Application performance monitoring (APM)
- Error tracking (Sentry, Rollbar, etc.)
- Log aggregation
- Health check endpoints
- Uptime monitoring

Monitoring is handled by services that consume these packages.

## Logging

### CI/CD Logs

**Location**: GitLab CI job logs
**Retention**: Per GitLab retention policy
**Access**: Via GitLab UI at `https://git.tmaws.io/verifiedfan/lib/pipelines`

**Log Sources**:
- Build output (`npm install`, `lerna bootstrap`)
- Test results (ESLint, Jest)
- Publish output (`lerna publish`)

### No Application Logs

This repository does NOT generate:
- CloudWatch logs
- Application logs
- Access logs
- Error logs

Consuming services handle their own logging.

## Alerting

### Pipeline Failures

**Alert Method**: GitLab notifications
**Recipients**: Committers and maintainers

**Common Failure Scenarios**:
- ESLint violations
- Unit test failures
- Build errors (TypeScript/Babel compilation)
- npm publish failures (authentication, network)

### Package Publication Issues

No automated alerts. Issues detected via:
- Pipeline failure in release stage
- Manual verification of published versions
- Consumer reports of missing/broken packages

## Common Issues and Resolutions

### Issue: Release Job Fails with "Cannot publish over existing version"

**Cause**: A package version already exists in npm registry

**Resolution**:
1. Check if version was already published: `npm view @verifiedfan/<package> versions`
2. If published but not committed, pull latest changes from Git
3. If version bump wasn't applied, check commit message format
4. Re-run pipeline or manually bump version

### Issue: ESLint Stage Fails

**Cause**: Code style violations

**Resolution**:
```bash
# Auto-fix issues locally
npx run eslint:fix

# Commit fixes
git add .
git commit -m "style: fix eslint violations"
git push
```

### Issue: Unit Tests Fail

**Cause**: Breaking changes or new bugs

**Resolution**:
1. Run tests locally: `npx run tests:unit`
2. Debug failing tests
3. Fix code or update tests
4. Commit and push

### Issue: Integration Tests Fail

**Note**: Integration tests allow failure and don't block pipeline

**Cause**: External service unavailable or test environment issues

**Resolution**:
1. Check if `MONGO_USERNAME` secret is set correctly
2. Verify test environment connectivity
3. Run locally if possible: `npx run tests:integration`
4. Fix tests or update environment
5. Since these don't block releases, can be fixed in follow-up

### Issue: "SSH_PRIVATE_KEY not found" in Release Job

**Cause**: Missing or incorrect SSH key secret

**Resolution**:
1. Verify `SSH_PRIVATE_KEY` is set in GitLab CI/CD Variables
2. Ensure key has write access to `git@git.tmaws.io:verifiedfan/lib.git`
3. Re-run pipeline after fixing secret

### Issue: "NPM_TOKEN authentication failed"

**Cause**: Invalid or expired npm token

**Resolution**:
1. Generate new npm token with publish access
2. Update `NPM_TOKEN` in GitLab CI/CD Variables
3. Re-run pipeline

### Issue: Lerna Detects No Changes

**Cause**: Only `*.md` files changed (ignored for versioning)

**Expected Behavior**: No release triggered (by design)

**If Unintended**:
1. Check `.gitignore` - ensure code changes committed
2. Verify changes are in `packages/*/src/` not just docs
3. Force publish (not recommended): `npx lerna publish --force-publish`

## Debugging

### Debug Build Issues Locally

```bash
# Clean all node_modules
rm -rf node_modules packages/*/node_modules

# Reinstall
npm install

# Bootstrap monorepo
npx run bootstrap

# Build all packages
npx run build

# Run tests
npx run tests:unit
```

### Debug a Specific Package

```bash
# Navigate to package
cd packages/<package-name>

# Install dependencies
npm install

# Build
npm run build

# Run tests (if configured)
npm test
```

### Check Published Package Content

```bash
# Download tarball of published package
npm pack @verifiedfan/<package-name>

# Extract and inspect
tar -xzf verifiedfan-<package-name>-*.tgz
ls -la package/
```

### Verify Lerna Configuration

```bash
# List packages Lerna detects
npx lerna list

# Check what changed since last release
npx lerna changed

# See what would be published (dry run)
npx lerna publish --dry-run
```

## Security

### Dependency Vulnerabilities

**Check for Vulnerabilities**:
```bash
npm audit

# Fix automatically if possible
npm audit fix
```

**Note**: This repository does not currently run `npm audit` in CI

### Secrets Management

**Secrets in GitLab CI**:
- `NPM_TOKEN` - masked in logs
- `SSH_PRIVATE_KEY` - masked in logs
- `MONGO_USERNAME` - masked in logs

**Never commit**:
- API tokens
- SSH keys
- Database credentials
- npm authentication tokens

## Maintenance

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update dependencies (carefully)
npm update

# Or update specific package
npm install <package>@latest

# Test after updating
npx run tests:unit
npx run eslint:lint
```

### Updating Node Version

1. Update `engines.node` in root `package.json`
2. Update Docker image in `.gitlab-ci.yml` (`image:` line)
3. Test locally with new Node version
4. Commit and push

### Repository Access

**Git Remote**: `git@git.tmaws.io:verifiedfan/lib.git`
**Web UI**: `https://git.tmaws.io/verifiedfan/lib`

**Required Permissions**:
- Developer: Push code, trigger pipelines
- Maintainer: Manage CI/CD secrets, branch protection

## Incident Response

### Pipeline is Broken

1. Check recent commits: `git log --oneline -10`
2. Identify failing job in GitLab CI
3. Review job logs
4. Fix issue and push fix OR revert breaking commit
5. Monitor pipeline success

### Package Published with Bug

1. **Immediate**: Deprecate broken version
   ```bash
   npm deprecate @verifiedfan/<package>@<version> "Contains critical bug, use X.Y.Z instead"
   ```

2. **Fix**: Create fix in Git
   ```bash
   git commit -m "fix: resolve critical bug in <feature>"
   git push
   ```

3. **Release**: Pipeline will publish fixed version automatically

4. **Notify**: Inform teams consuming the package

### npm Registry Unavailable

1. Check npmjs.org status: https://status.npmjs.org/
2. Wait for registry to recover
3. Re-run failed pipeline jobs once registry is available
4. No action needed if only publishing failed - code is safe in Git

## Performance

### Build Time Optimization

**Current Strategy**:
- Caches `node_modules` per branch
- Runs jobs in parallel where possible (test stage)
- Reuses artifacts between stages

**If Builds Are Slow**:
1. Review package build scripts - minimize work
2. Consider splitting test jobs by package groups
3. Use `lerna run --scope` to build subsets
4. Ensure cache is working (check CI logs for "Cache hit")

## Support

### Getting Help

**For CI/CD Issues**:
- Check GitLab CI documentation
- Review `.gitlab-ci.yml` comments
- Contact DevOps team

**For Lerna/npm Issues**:
- Check Lerna documentation: https://lerna.js.org/
- Review `lerna.json` configuration
- Check npm publish documentation

**For Code Issues**:
- Run tests locally first
- Check ESLint rules
- Review package-specific README files
