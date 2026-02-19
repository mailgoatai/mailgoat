# Pull Request Workflow

## ✅ Branch Protection Enabled

The `master` branch is now protected! Direct pushes are **blocked**.

### Protection Rules Active:

- ✅ All CI checks must pass before merging
- ✅ At least 1 approval required
- ✅ Branch must be up-to-date with master
- ✅ Stale reviews are dismissed on new commits
- ✅ Rules apply to administrators too
- ✅ Force pushes blocked
- ✅ Branch deletion blocked

## Workflow

### 1. Create a Feature Branch

```bash
# Always start from latest master
git checkout master
git pull origin master

# Create your feature branch
git checkout -b feature/descriptive-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

```bash
# Write code, tests, docs
vim src/...

# Commit with conventional commits
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve bug"
```

**Commit message prefixes:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes
- `ci:` - CI configuration changes

### 3. Run Pre-Push Checks (Recommended)

```bash
# Run all checks locally before pushing
npm run lint
npm run typecheck
npm run test:unit
npm run build

# Or use the pre-push check script
npm run lint && npm run typecheck && npm run build
```

**Why?** Catch issues early! Faster feedback than waiting for CI.

### 4. Push and Create PR

```bash
# Push your branch
git push origin feature/descriptive-name

# Create pull request via gh CLI
gh pr create \
  --title "feat: descriptive title" \
  --body "
## Description
Brief description of changes

## Changes
- Change 1
- Change 2

## Testing
- [ ] Unit tests pass
- [ ] Manual testing done
- [ ] No breaking changes
"

# Or via GitHub web interface
# Navigate to: https://github.com/mailgoatai/mailgoat/compare
```

### 5. Wait for CI and Reviews

- ⏳ **CI will run automatically** - takes ~5 minutes
- 👀 **Request a review** from a teammate
- 🔍 **Address feedback** if requested
- ✅ **All checks must pass** before merge is allowed

### 6. Merge

Once approved and all checks pass:

```bash
# Merge via CLI
gh pr merge --squash

# Or click "Squash and merge" on GitHub
```

## What Happens if CI Fails?

### Scenario 1: Lint Errors

```bash
# Fix locally
npm run lint:fix
git add .
git commit -m "fix: lint errors"
git push
```

### Scenario 2: TypeScript Errors

```bash
# Check types
npm run typecheck

# Fix the errors, then:
git add .
git commit -m "fix: type errors"
git push
```

### Scenario 3: Test Failures

```bash
# Run tests locally
npm run test:unit

# Fix failing tests, then:
git add .
git commit -m "fix: failing tests"
git push
```

### Scenario 4: Build Failures

```bash
# Try building locally
npm run build

# Fix build issues, then:
git add .
git commit -m "fix: build errors"
git push
```

## Emergency Procedures

### Critical Production Bug

1. Create a `hotfix/` branch from master
2. Make **minimal** changes to fix the issue
3. Create PR with `[HOTFIX]` in title
4. Get expedited review
5. Merge as soon as CI passes

**Note:** Branch protection still applies! Can't skip CI.

### Temporarily Disable Protection (Last Resort)

If absolutely necessary (infrastructure emergency):

```bash
# Disable (admins only)
gh api repos/mailgoatai/mailgoat/branches/master/protection -X DELETE

# Make emergency fix

# Re-enable immediately!
# (Use the setup script in BRANCH-PROTECTION-SETUP.md)
```

**⚠️ Only for extreme emergencies!** Document why in an incident report.

## PR Best Practices

### Good PR Characteristics:

- ✅ **Small and focused** - One logical change
- ✅ **Well-tested** - Includes tests for new code
- ✅ **Self-contained** - Can be reviewed independently
- ✅ **Documented** - Updates docs if needed
- ✅ **Clean commits** - Logical, well-described commits

### Bad PR Characteristics:

- ❌ **Too large** - >500 lines changed
- ❌ **Multiple unrelated changes** - Mix of features/fixes
- ❌ **No tests** - New code without test coverage
- ❌ **Breaks CI** - Pushed without local testing
- ❌ **Vague description** - "Fixed stuff"

## Review Guidelines

### As a PR Author:

1. **Self-review first** - Check your own diff
2. **Run all tests** - Don't rely only on CI
3. **Respond promptly** to feedback
4. **Keep it professional** - Code review is not personal

### As a Reviewer:

1. **Be constructive** - Suggest improvements
2. **Ask questions** - Understand the "why"
3. **Check for edge cases** - Think about what could break
4. **Approve confidently** - Only when you're satisfied

## Troubleshooting

### "Branch protection: Required status check... is failing"

→ Your CI checks haven't passed. Check the Actions tab.

### "Branch protection: Review required"

→ Need 1 approval from another maintainer.

### "Branch protection: Branch not up to date"

→ Master has new commits. Rebase or merge master into your branch.

```bash
git checkout feature/your-branch
git pull origin master
git push
```

### "Can't push to master directly"

→ This is intentional! Create a PR instead.

## Next Steps

1. ✅ Branch protection enabled
2. ⚠️ **NEXT:** Fix existing CI errors (see FIX_CHECKLIST.md)
3. 📋 **THEN:** All future changes go through PRs
4. 🚀 **RESULT:** Much higher code quality!

---

**Questions?** Ask in Discord or create a discussion on GitHub.
