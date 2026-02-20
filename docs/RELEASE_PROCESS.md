# MailGoat Release Process

**Last Updated:** 2026-02-19  
**Current Stable Version:** v1.1.7

---

## Overview

MailGoat uses semantic versioning and automated releases via GitHub Actions with npm Trusted Publishers (OIDC). No manual npm authentication is required.

---

## Quick Reference

**Current Release Status:**
- **Published:** v1.1.7 (2026-02-19)
- **Latest Tag:** v1.2.0 (created but not published)
- **Next Version:** TBD based on changes

**Key Files:**
- Release workflow: `.github/workflows/release.yml`
- Package version: `package.json`
- Change history: `CHANGELOG.md`
- Security audit: `docs/security/`

---

## Pre-Release Checklist

### 1. Code Quality ✅

- [ ] All tests passing: `npm test`
- [ ] Integration tests passing: `npm run test:integration`
- [ ] Build succeeds: `npm run build`
- [ ] Lint clean (or warnings acceptable): `npm run lint`
- [ ] No security vulnerabilities: `npm audit --production`

### 2. Documentation ✅

- [ ] `CHANGELOG.md` updated with version and changes
- [ ] `README.md` accurate (examples, commands, features)
- [ ] API docs current (if applicable)
- [ ] Breaking changes documented clearly
- [ ] Migration guide (if breaking changes)

### 3. Git Status ✅

- [ ] All commits pushed to GitHub
- [ ] Branch up to date with `origin/master`
- [ ] No uncommitted changes
- [ ] Git history clean (no WIP commits)

### 4. Version Check ✅

- [ ] Version number follows semver
- [ ] Version incremented correctly:
  - Patch (x.y.Z): Bug fixes only
  - Minor (x.Y.0): New features, backward compatible
  - Major (X.0.0): Breaking changes
- [ ] Version in `package.json` updated
- [ ] No version conflicts with npm registry

### 5. Dependencies ✅

- [ ] `package-lock.json` up to date
- [ ] No known vulnerable dependencies
- [ ] Dependencies versions locked (not using `^` or `~` for critical deps)
- [ ] Peer dependencies documented

---

## Version Bump Strategy

### Semantic Versioning (SemVer)

**Format:** MAJOR.MINOR.PATCH (e.g., 1.2.3)

**When to bump:**

**Patch (1.2.X):**
- Bug fixes
- Performance improvements
- Documentation updates
- Dependency updates (no API changes)
- Internal refactoring

**Minor (1.X.0):**
- New features
- New commands added
- Backward-compatible API additions
- Deprecation warnings (not removal)

**Major (X.0.0):**
- Breaking API changes
- Removed features
- Changed CLI command structure
- Required Node.js version increase
- Database schema changes

### Current Version Strategy

**Incremental Release Plan:**

```
v1.1.7 (current) → Stable, published, working
v1.1.8           → Bug fixes only (CLI version reporting, etc.)
v1.2.0           → Admin panel improvements (when stable)
v1.3.0           → Additional features (webhooks, templates stable)
v2.0.0           → Major refactor or breaking changes (future)
```

---

## Release Steps

### Method 1: Automated (Recommended)

**Uses GitHub Actions + npm Trusted Publishers (OIDC)**

1. **Update Version**
   ```bash
   # Bump version in package.json
   npm version patch   # for x.y.Z
   npm version minor   # for x.Y.0
   npm version major   # for X.0.0
   ```

2. **Push Tag**
   ```bash
   # npm version automatically creates git tag
   git push origin master --tags
   ```

3. **GitHub Actions Will:**
   - Run all tests
   - Build the package
   - Publish to npm via OIDC
   - Create GitHub release
   - Attach artifacts

4. **Verify**
   ```bash
   # Wait 2-3 minutes for workflow
   npm view mailgoat version
   npm install -g mailgoat@latest
   mailgoat --version
   ```

### Method 2: Manual (Emergency Only)

**Only use if GitHub Actions is down**

1. **Prerequisites**
   ```bash
   npm login  # Log into npm
   ```

2. **Publish**
   ```bash
   npm run build
   npm test
   npm publish
   ```

3. **Tag**
   ```bash
   git tag v1.2.3
   git push --tags
   ```

---

## Testing Requirements

### Before Release

**Unit Tests:**
```bash
npm run test:unit
# All tests must pass
```

**Integration Tests:**
```bash
npm run test:integration
# 81+ tests should pass
```

**Build Test:**
```bash
npm run build
# TypeScript compilation must succeed
# Check for any error TS* messages
```

**Security Audit:**
```bash
npm audit --production
# 0 vulnerabilities in production dependencies
# Dev vulnerabilities acceptable if low/moderate
```

### After Release

**Smoke Tests:**
```bash
# Install from npm
npm install -g mailgoat@latest

# Verify version
mailgoat --version

# Test core commands
mailgoat --help
mailgoat config init
mailgoat health
```

**Integration Test (with Postal):**
- Test actual email sending
- Verify inbox functionality
- Check admin panel (if applicable)

---

## Rollback Procedure

### If Release Fails

**Option 1: Unpublish (within 72 hours)**
```bash
npm unpublish mailgoat@1.2.3
# Only works within 72 hours of publish
# Only if no one has installed it
```

**Option 2: Publish Hotfix**
```bash
# Fix the issue
npm version patch
git push --tags
# Publish fixed version
```

**Option 3: Deprecate**
```bash
npm deprecate mailgoat@1.2.3 "This version has critical bug, please upgrade to 1.2.4"
```

### If Tests Fail Post-Release

1. **Document the issue** in GitHub Issues
2. **Publish hotfix** ASAP (bump patch version)
3. **Update CHANGELOG** with fix notes
4. **Notify users** if critical

---

## Common Issues & Solutions

### Issue: Build Fails with TypeScript Errors

**Symptoms:**
```
error TS2688: Cannot find type definition file for 'node'
```

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Git Push Rejected

**Symptoms:**
```
! [rejected]        master -> master (fetch first)
```

**Solution:**
```bash
git fetch origin
git pull --rebase origin master
# Resolve conflicts if any
git push origin master
```

### Issue: npm Publish Fails with Auth Error

**Symptoms:**
```
npm ERR! need auth
```

**Solution:**
This shouldn't happen with trusted publishers! If it does:
1. Check GitHub Actions workflow logs
2. Verify OIDC configuration: https://www.npmjs.com/settings/mailgoatai/packages
3. Ensure workflow has `id-token: write` permission

### Issue: Version Already Exists

**Symptoms:**
```
npm ERR! 403 You cannot publish over the previously published versions
```

**Solution:**
```bash
# Increment version again
npm version patch
git push --tags
```

---

## Emergency Contacts

**If Release Blocked:**
- @lead-engineer (technical issues)
- @devops (infrastructure/deployment)
- @ceo (decision on version strategy)

**npm Organization Admins:**
- Check: https://www.npmjs.com/settings/mailgoatai/members

---

## Release Checklist Template

Copy this for each release:

```markdown
## Release vX.Y.Z Checklist

**Pre-Release:**
- [ ] Code quality: tests pass, build succeeds
- [ ] CHANGELOG.md updated
- [ ] README.md accurate
- [ ] Git clean and pushed
- [ ] Version bumped correctly
- [ ] npm audit clean

**Release:**
- [ ] Tag pushed: `git push --tags`
- [ ] GitHub Actions workflow succeeded
- [ ] Package published to npm
- [ ] GitHub release created

**Post-Release:**
- [ ] Smoke tests passed
- [ ] Integration tests with Postal passed
- [ ] Admin panel working (if applicable)
- [ ] Documentation site updated (if applicable)

**Verification:**
- [ ] `npm view mailgoat version` shows new version
- [ ] `npm install -g mailgoat` installs correctly
- [ ] `mailgoat --version` shows correct version
- [ ] All commands work: `mailgoat --help`
```

---

## Known Issues (Current)

### v1.2.0 Environment Issues (2026-02-19)

**Problem:**
- node_modules corrupted after installing `pg` package
- TypeScript missing 19 type definition files
- Git repo diverged from remote

**Status:** Not blocking (v1.1.7 is stable)

**Solution:** Clean reinstall needed
```bash
cd mailgoat
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Admin Panel (2026-02-19)

**Problem:**
- "Invalid response: 62" error in frontend
- NOT a backend issue (APIs work correctly)
- React app JavaScript error

**Status:** Frontend dev needs to fix

**Solution:** Check browser console for exact error

---

## Best Practices

### DO ✅

- **Test locally first** before pushing tags
- **Update CHANGELOG** before every release
- **Use semantic versioning** correctly
- **Review GitHub Actions logs** after tag push
- **Verify npm publish** succeeded before announcing
- **Keep commits clean** (meaningful messages)
- **Document breaking changes** clearly

### DON'T ❌

- **Don't skip tests** "to save time"
- **Don't push broken code** to master
- **Don't reuse version numbers** (can't unpublish after 72h)
- **Don't publish without CHANGELOG** update
- **Don't assume workflow worked** (always verify)
- **Don't publish pre-alpha code** to latest tag

---

## Continuous Improvement

**After Each Release, Consider:**
- Did the process go smoothly?
- Were there any unexpected issues?
- Should we update this document?
- Can we automate more steps?
- Are our tests catching real bugs?

**Update This Document:**
When processes change, update this file immediately. Don't let docs drift from reality.

---

## References

- **npm Trusted Publishers:** https://docs.npmjs.com/generating-provenance-statements
- **Semantic Versioning:** https://semver.org/
- **GitHub Actions:** https://docs.github.com/en/actions
- **MailGoat Repo:** https://github.com/mailgoatai/mailgoat
- **npm Package:** https://www.npmjs.com/package/mailgoat

---

**Last Release:** v1.1.7 (2026-02-19)  
**Next Planned:** v1.1.8 or v1.2.0 (TBD)  
**Maintainer:** @lead-engineer
