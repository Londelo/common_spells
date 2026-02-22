# Deployment - vf-lib

## Overview

This repository uses **GitLab CI** to build, test, and publish npm packages to the npmjs.org registry. Deployment means publishing new package versions, not deploying cloud infrastructure.

## CI/CD Pipeline

**Platform**: GitLab CI
**Runner Tags**: `tm-prod cicd build`, `tm-prod-preprod cicd test`
**Base Image**: `tmhub.io/verifiedfan/node-builder:16.16.0-latest`

### Pipeline Stages

The pipeline has 3 stages that run sequentially:

#### 1. Install Stage

**Job**: `dependencies`

- Installs all npm dependencies
- Runs `npm install --unsafe-perm`
- Bootstraps Lerna monorepo with `npx lerna bootstrap`
- Builds all packages with `NODE_ENV=production npx lerna run build`
- Caches `node_modules` for subsequent jobs
- Publishes artifacts (valid for 1 day)

**Artifacts**:
- `node_modules/`
- `packages/*/dist/`
- `packages/*/package.json`
- `packages/*/node_modules/`

**Additional Job**: `ensureGitPushAvailable` (master only)
- Verifies Git push access before release
- Runs dry-run push to Git remote

#### 2. Test Stage

**Job**: `eslint`
- Runs ESLint on all JavaScript and TypeScript files
- Command: `npx run eslint:lint`
- Blocks pipeline if linting fails

**Job**: `unit tests`
- Runs Jest unit tests for all packages
- Command: `npx run tests:unit`
- Tests files in `packages/*/src/**`
- Blocks pipeline if tests fail

**Job**: `integration tests`
- Runs integration tests (if present)
- Command: `npx run tests:integration`
- Tests files in `packages/*/integrationTests/`
- Allows failure (`allow_failure: true`) - does not block pipeline

#### 3. Release Stage

**Job**: `release` (master branch only)

- Configures Git user:
  - Email: `thomas.zheng@ticketmaster.com`
  - Name: `Thomas Zheng`
- Authenticates with npm using `NPM_TOKEN` secret
- Runs `npx lerna publish --yes` to:
  - Detect changed packages since last release
  - Determine version bumps using conventional commits
  - Update package.json versions
  - Create Git tags
  - Publish to npmjs.org
  - Commit changes with message: `chore(release): publish [skip ci]`

## Release Strategy

**Tool**: Lerna + Semantic Release

**Version Management**:
- Independent versioning per package
- Semantic versioning (semver) enforced
- Conventional commits determine version bumps:
  - `feat:` → minor version bump
  - `fix:` → patch version bump
  - `BREAKING CHANGE:` → major version bump

**Semantic Release Configuration** (`.releaserc.yml`):
- Updates `CHANGELOG.md` with release notes
- Publishes to npmjs.org
- Creates GitLab releases at `https://git.tmaws.io`
- Commits changes to `package.json` and `CHANGELOG.md`

**Commit Validation**:
- Enforced commit message format
- Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `ci`
- Pre-push hook runs linting and commit validation

## Environments

This repository does NOT have traditional deployment environments (dev/staging/prod). Instead:

**npm Registry**: Production registry (npmjs.org)
**Git Remote**: `git@git.tmaws.io:verifiedfan/lib.git`

Published packages are immediately available to all consumers via `npm install`.

## Required Secrets

The following secrets must be configured in GitLab CI:

| Secret | Purpose | Used In |
|--------|---------|---------|
| `NPM_TOKEN` | Authenticate to npmjs.org for publishing | `release` job |
| `SSH_PRIVATE_KEY` | Git push access to repository | `release` job |
| `MONGO_USERNAME` | MongoDB access for integration tests | Integration tests |

## Manual Operations

### Build Locally

```bash
npm install
npx run build
```

### Run Tests Locally

```bash
# Unit tests
npx run tests:unit

# Integration tests
npx run tests:integration

# Linting
npx run eslint:lint
npx run eslint:fix  # Auto-fix issues
```

### Publish Manually (if needed)

```bash
# Must be on master branch with clean working directory
npx lerna publish
```

### Bootstrap Monorepo

```bash
npx run bootstrap
# Equivalent to: npx lerna bootstrap
```

## Pipeline Behavior

**Branch Protection**:
- Release job only runs on `master` branch
- Other branches run install and test stages only

**Failure Handling**:
- Pipeline stops if install, eslint, or unit tests fail
- Integration test failures do NOT stop the pipeline
- Release job skipped if earlier stages fail

**Caching**:
- `node_modules` cached per branch
- Cache key: `$CI_COMMIT_REF_SLUG`

## Git Configuration

**Required Git Config** (automated in CI):
```bash
git config --global user.email "thomas.zheng@ticketmaster.com"
git config --global user.name "Thomas Zheng"
```

**SSH Setup** (automated in CI):
- SSH key added from `SSH_PRIVATE_KEY` secret
- `git.tmaws.io` added to known hosts
- Git remote set to `git@git.tmaws.io:verifiedfan/lib.git`

## Node.js Requirements

**Minimum Node Version**: 12.14 (specified in `package.json`)
**CI Node Version**: 16.16.0 (via Docker image)

## Change Tracking

**Files Ignored for Release**:
- `*.md` files do NOT trigger package releases (configured in Lerna)

**Commit Message Format**:
- Skip CI: Add `[skip ci]` to commit message
- Release commits automatically include `[skip ci]` to prevent recursive builds
