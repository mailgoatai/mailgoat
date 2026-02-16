# CI/CD Pipeline Documentation

This document describes MailGoat's Continuous Integration and Continuous Deployment (CI/CD) setup.

## Overview

MailGoat uses GitHub Actions for automated testing, security scanning, and releases. The pipeline ensures code quality, catches bugs early, and enables rapid, reliable deployments.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Trigger:** Every push and pull request to `main` or `develop`

**Jobs:**
- **Lint**: ESLint, Prettier, and TypeScript type checking
- **Build**: Compile TypeScript to JavaScript
- **Test (Unit)**: Run Jest unit tests
- **Test (Integration - Mock)**: Run bash test runner in mock mode
- **Test (Integration - Jest)**: Run Jest integration tests
- **All Checks Passed**: Final gate that requires all jobs to pass

**Duration:** ~5-8 minutes

**Branch Protection:**
Configure these as required status checks:
- `Lint & Format Check`
- `Build`
- `Integration Tests (Mock Mode)`
- `All Checks Passed`

### 2. Release Pipeline (`release.yml`)

**Trigger:** Git tag push (e.g., `v0.1.0`, `v1.2.3`)

**Jobs:**
1. **Run Full Test Suite**: Complete lint, build, and test suite
2. **Build CLI Package**: Create npm package (`.tgz`)
3. **Create GitHub Release**: Auto-generate release with artifacts
4. **Announce Release**: Log release announcement (future: Slack/Discord)

**Artifacts:**
- npm package tarball
- Build artifacts
- Release notes (extracted from CHANGELOG.md if available)

**Pre-release Detection:**
Tags containing `alpha`, `beta`, or `rc` are marked as pre-releases.

### 3. Security Scanning (`security.yml`)

**Trigger:** 
- Pull requests
- Daily at 2 AM UTC
- Manual (workflow_dispatch)

**Jobs:**
- **Dependency Audit**: `npm audit` for known vulnerabilities
- **CodeQL Analysis**: Static code analysis for security issues
- **Secret Scanning**: TruffleHog OSS for leaked credentials
- **License Check**: Verify dependency licenses
- **Security Summary**: Aggregate report

**Action on Failure:**
- PRs are blocked if security issues found
- Daily runs create issues for tracking

## Running Tests Locally

### Quick Test
```bash
# Run full CI test suite locally
npm run lint
npm run build
npm test
bash tests/test-runner.sh --mode=mock
```

### Individual Components

**Linting:**
```bash
npm run lint          # Run ESLint
npm run format:check  # Check Prettier
npm run typecheck     # TypeScript type check
```

**Build:**
```bash
npm run build         # Compile TypeScript
```

**Tests:**
```bash
npm run test:unit           # Jest unit tests
npm run test:integration    # Jest integration tests
npm run test:bash           # Bash test runner (mock mode)
npm run test:coverage       # Generate coverage report
```

**Security:**
```bash
npm audit                   # Check for vulnerabilities
npm audit fix               # Auto-fix vulnerabilities
npx license-checker         # Check licenses
```

## Triggering a Release

### 1. Update Version
```bash
# Update package.json version
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.1 -> 0.2.0
npm version major   # 0.2.0 -> 1.0.0

# Or manually edit package.json
```

### 2. Update CHANGELOG.md
Add a new version section:
```markdown
## [1.0.0] - 2026-02-16

### Added
- New feature X
- Improvement Y

### Fixed
- Bug Z
```

### 3. Commit and Tag
```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

### 4. Monitor Release
- Watch GitHub Actions: https://github.com/mailgoatai/mailgoat/actions
- Release will appear at: https://github.com/mailgoatai/mailgoat/releases

## Branch Protection Rules

**Main Branch:**
- Require pull request reviews (at least 1)
- Require status checks to pass:
  - `All Checks Passed`
  - `Lint & Format Check`
  - `Build`
  - `Integration Tests (Mock Mode)`
- Require branches to be up to date
- Do not allow force pushes

**Develop Branch:**
- Require status checks to pass (same as main)
- Allow force pushes (for team members)

## Environment Variables & Secrets

### Repository Secrets (when needed)
- `NPM_TOKEN`: For publishing to npm (future)
- `DISCORD_WEBHOOK`: For release notifications (future)
- `CODECOV_TOKEN`: For coverage reports (optional)

### Environment Variables in Workflows
- `NODE_VERSION`: Node.js version (currently 20)
- `TEST_MODE`: mock/integration/full
- `PERF_*`: Performance thresholds

## Troubleshooting

### CI Failing: "npm ci failed"
**Cause:** Lock file out of sync with package.json

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "fix: update lock file"
```

### CI Failing: "Tests timeout"
**Cause:** Test runner hung or slow

**Fix:**
- Check test logs artifact
- Run locally: `bash tests/test-runner.sh --mode=mock --verbose`
- Increase timeout in workflow if legitimate

### Security Scan Failing: "Vulnerabilities found"
**Cause:** Outdated dependencies with known issues

**Fix:**
```bash
npm audit
npm audit fix          # Auto-fix
npm audit fix --force  # If auto-fix not sufficient
# Or manually update: npm update <package>
```

### Release Not Triggering
**Cause:** Tag not pushed or incorrect format

**Fix:**
```bash
git tag -l             # List tags
git push origin v1.0.0 # Push specific tag
git push --tags        # Push all tags
```

## Future Enhancements

### Phase 2: Full Integration Tests
- Spin up Postal in Docker during CI
- Run full integration tests against real mail server
- See: [testing-infrastructure.md](testing-infrastructure.md)

### Phase 3: Deployment Automation
- Backend deployment (when built)
- Database migrations
- Environment management (dev/staging/prod)
- See: [deployment-strategy.md](deployment-strategy.md)

### Phase 4: Advanced Monitoring
- Test coverage reporting (Codecov)
- Performance regression detection
- Bundle size tracking
- Automated dependency updates (Dependabot/Renovate)

## Questions?

- **CLI Issues**: Check [README.md](../README.md)
- **Test Failures**: See [testing-infrastructure.md](testing-infrastructure.md)
- **Architecture**: See [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Development**: See [DEVELOPMENT-GUIDELINES.md](../DEVELOPMENT-GUIDELINES.md)

---

**Last Updated:** 2026-02-15  
**Maintained By:** DevOps Team (@devops)
