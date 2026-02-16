# Git Workflow

## Branch → Pull Request → Merge

**Rule:** Every feature branch MUST have a pull request before merging to `main`.

### Why Pull Requests Matter

- **Code review** - Catch issues before they hit main
- **Documentation** - PR description explains what changed and why
- **History** - Clear record of what was merged and when
- **CI/CD** - Tests run automatically on every PR
- **Collaboration** - Team can comment and suggest improvements

### The Workflow

#### 1. Create a Branch

```bash
# Start from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/your-feature
# or
git checkout -b fix/your-bugfix
```

**Branch naming:**

- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `test/` - Test additions/fixes

#### 2. Make Your Changes

```bash
# Work on your feature
# ... code, test, repeat ...

# Commit with clear messages
git add .
git commit -m "feat: add email batch sending

- Support CSV and JSON input
- Add progress tracking
- Include retry logic"

# Push to remote
git push origin feat/your-feature
```

#### 3. Create Pull Request

**Using GitHub CLI:**

```bash
gh pr create --title "feat: add email batch sending" \
  --body "Adds batch sending support for CSV/JSON files.

Changes:
- New send-batch command
- Progress bar during send
- Automatic retry on failures

Closes #123"
```

**Using GitHub Web UI:**

1. Go to repository on GitHub
2. Click "Pull requests" → "New pull request"
3. Select your branch
4. Fill in title and description
5. Click "Create pull request"

**PR Description Template:**

```markdown
## What Changed

[Brief summary of changes]

## Why

[Why was this needed?]

## Testing

[How did you test this?]

## Checklist

- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests pass

Closes #[issue-number]
```

#### 4. Wait for Review

- **Automated checks** run (tests, linting, etc.)
- **Code review** by maintainers
- **Address feedback** if requested
- **Approval** when ready

#### 5. Merge to Main

Once approved:

```bash
# Merge via GitHub UI (preferred)
# - Squash and merge (for single logical change)
# - Merge commit (for multiple related commits)

# Or via CLI
gh pr merge 123 --squash --delete-branch
```

**After merge:**

```bash
# Update your local main
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feat/your-feature
```

## Current State

We are **sharing the same GitHub account**. This means:

- All branches are visible to everyone
- All PRs are reviewed by the team
- We use PRs to coordinate changes
- **Lead Engineer (AI)** reviews and merges PRs

## PR Review Guidelines

### For Authors

**Before creating PR:**

- [ ] Code is tested locally
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Commits are clean and descriptive

**During review:**

- Respond to comments promptly
- Ask questions if feedback is unclear
- Push updates to address feedback
- Mark conversations as resolved when fixed

### For Reviewers

**What to check:**

- Does it solve the stated problem?
- Is the code clear and maintainable?
- Are edge cases handled?
- Are tests adequate?
- Is documentation updated?

**How to review:**

- Be constructive, not critical
- Suggest improvements
- Approve when ready
- Request changes if needed

## Common Issues

### "I forgot to create a PR"

If you already pushed to a branch:

```bash
# Create PR from existing branch
gh pr create --head feat/your-feature
```

### "My branch is behind main"

```bash
# Rebase on main
git checkout feat/your-feature
git fetch origin
git rebase origin/main

# Force push (safe for feature branches)
git push --force-with-lease
```

### "I need to update my PR"

```bash
# Make changes
git add .
git commit -m "address review feedback"
git push origin feat/your-feature

# PR updates automatically
```

### "Merge conflicts"

```bash
# Update main
git checkout main
git pull origin main

# Rebase your branch
git checkout feat/your-feature
git rebase main

# Fix conflicts in editor
# ... resolve conflicts ...

git add .
git rebase --continue
git push --force-with-lease
```

## Automation

### Lead Engineer (AI) Role

**Responsibilities:**

- Monitor unmerged branches
- Create PRs for branches without them
- Review PRs for code quality
- Merge approved PRs to main
- Keep main branch clean

**When branches sit idle:**

- Create PR with summary of changes
- Request review from relevant developers
- Merge if tests pass and code looks good

### CI/CD

Every PR triggers:

- **Tests** - Unit and integration tests
- **Linting** - Code style checks
- **Type checking** - TypeScript validation
- **Build** - Ensure project compiles

## Best Practices

### Commit Messages

**Good:**

```
feat: add batch email sending

- Support CSV and JSON input formats
- Add progress bar
- Include retry logic for failed sends

Closes #123
```

**Bad:**

```
fix stuff
```

### Branch Lifetime

- **Keep branches short-lived** (days, not weeks)
- **Delete after merge** (keeps repo clean)
- **One feature per branch** (focused changes)

### PR Size

- **Small PRs** - Easier to review
- **Focused changes** - One logical feature/fix
- **Split large work** - Multiple PRs if needed

**Good PR:** 100-300 lines changed
**Large PR:** >500 lines (consider splitting)

## Emergency Hotfixes

For critical production issues:

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# Fix the issue
# ... code ...

# Commit and push
git commit -m "hotfix: fix critical auth bug"
git push origin hotfix/critical-bug

# Create PR (mark as urgent)
gh pr create --title "HOTFIX: fix critical auth bug" \
  --body "Critical fix for production auth failure"

# Fast-track review and merge
```

## Questions?

- **General questions:** GitHub Discussions
- **Workflow help:** Ask in team chat
- **Technical issues:** Open an issue

---

**Remember:** Branches are for development. Pull requests are for collaboration. Main is for production-ready code.

Always use PRs. No exceptions.
