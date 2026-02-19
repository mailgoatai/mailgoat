# Branch Protection Setup Guide

## Overview

This document outlines how to protect the `master` branch and ensure code quality before merging.

## Current Issues Fixed

### TypeScript Errors (59 total)

1. **fs/promises misuse**: Changed `import * as fs from 'fs/promises'` to `import * as fs from 'fs'` in:
   - `src/commands/health.ts`
   - `src/lib/template-manager.ts`
2. **Async/await issues**: Fixed promises not being awaited in tests
3. **Missing properties in test mocks**: Need to add required fields

### ESLint Errors (13 total)

1. **Unused variables**: Prefixed with `_` or removed
2. **Unused imports**: Removed from `src/commands/search.ts`

## Branch Protection Rules

### Required Status Checks

All CI jobs must pass before merging:

- ✅ Lint & Format Check
- ✅ Build
- ✅ Unit Tests
- ✅ Integration Tests (Mock Mode)
- ✅ Jest Integration Tests

### GitHub Branch Protection Settings

To enable branch protection on `master`:

```bash
gh api repos/:owner/:repo/branches/master/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=lint \
  --field required_status_checks[contexts][]=build \
  --field required_status_checks[contexts][]=test-unit \
  --field required_status_checks[contexts][]=test-integration \
  --field required_status_checks[contexts][]=test-jest \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field enforce_admins=true \
  --field restrictions=null
```

Or via GitHub UI:

1. Go to **Settings** → **Branches**
2. Click **Add rule** for `master`
3. Enable:
   - ✅ Require pull request reviews before merging (1 approval)
   - ✅ Require status checks to pass before merging
     - Select all CI jobs
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators
4. Click **Create**

## Workflow

### For New Features

```bash
# Create a feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: your feature"

# Push and create PR
git push origin feature/your-feature
gh pr create --title "feat: your feature" --body "Description"

# Wait for CI to pass
# Get review approval
# Merge via GitHub (or gh pr merge)
```

### For Bug Fixes

```bash
git checkout -b fix/bug-description
# ... make fixes ...
git push origin fix/bug-description
gh pr create --title "fix: bug description"
```

## Quality Gates

Before a PR can be merged:

1. ✅ All CI checks pass
2. ✅ At least 1 approval from a maintainer
3. ✅ Branch is up to date with master
4. ✅ No merge conflicts

## Emergency Hotfixes

For critical production fixes:

1. Create a `hotfix/` branch
2. Make minimal changes
3. Fast-track review (but still require CI pass)
4. Merge ASAP
5. Follow up with proper fix if needed

## Pre-commit Hooks

The repo has husky pre-commit hooks that run:

- Prettier (formatting)
- Linting on staged files

To fix prettier issues locally:

```bash
npm run format
```

To fix linting issues:

```bash
npm run lint:fix
```

## Local Development Checklist

Before pushing:

```bash
# Run all checks locally
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run format:check # Prettier
npm run test:unit    # Unit tests
npm run build        # Build check
```

## Troubleshooting

### "Prettier permission denied"

```bash
chmod +x node_modules/.bin/prettier
# Or use npx
npx prettier --write .
```

### "CI failing but works locally"

- Ensure `node_modules` are up to date: `npm ci`
- Check Node version matches CI (v20)
- Review GitHub Actions logs for specific errors

### "Can't push to master"

- This is intentional! Create a PR instead
- Branch protection is working as designed
