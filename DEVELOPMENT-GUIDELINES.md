# Development Guidelines

**Updated:** 2026-02-15 20:08 UTC

## Commit and Push Requirements

### ⚠️ CRITICAL: Push After Every Task

**Every completed task MUST result in a git commit and push.** This is mandatory for:
- Code changes
- Documentation updates
- Configuration files
- New files or directories
- Test files

### The Rule

```bash
# After completing ANY task:
git add .
git commit -m "Description of changes"
git push origin master
```

### Why This Matters

1. **Visibility** - Team needs to see progress in git history
2. **Backup** - Your work is preserved
3. **Collaboration** - Others can build on your changes
4. **Tracking** - Management can track velocity
5. **Recovery** - Easy to revert if needed

### Commit Message Format

Use clear, descriptive messages:

```bash
# Good:
git commit -m "Add attachment support to send command"
git commit -m "Create comprehensive self-hosting guide"
git commit -m "Implement config init with validation"

# Bad:
git commit -m "updates"
git commit -m "wip"
git commit -m "fix"
```

### When to Commit

**Immediately after:**
- Task status changes to "done"
- New files are created
- Existing files are modified
- Tests pass
- Documentation is written

**Before:**
- Moving to next task
- Taking a break
- End of work session

### Git Workflow

```bash
# 1. Check status
git status

# 2. Add all changes
git add .

# 3. Commit with description
git commit -m "Clear description of what changed"

# 4. Push immediately
git push origin master

# 5. Verify push succeeded
git log --oneline -1
```

### What If I Forget?

If you realize you haven't pushed:

```bash
# Check what's uncommitted
git status

# Commit everything
git add .
git commit -m "Previous task completion: [describe what you did]"
git push origin master
```

### Multiple Small Commits

**It's OK to make multiple commits for one task:**

```bash
# While working on task:
git commit -m "Add email validation"
git push

git commit -m "Add retry logic"  
git push

git commit -m "Add tests for retry"
git push

# All related to same task - that's fine!
```

### File Changes Without Commits

**Never leave file changes uncommitted.** If you have changes:

```bash
# Always commit before stopping work
git add .
git commit -m "Work in progress: [what's done]"
git push
```

### Checking Your Work

```bash
# See your recent commits
git log --oneline -10

# See uncommitted changes
git status

# See what changed
git diff
```

## Task Workflow

### Standard Flow

1. **Start task** - Update status to "doing"
2. **Do the work** - Write code, tests, docs
3. **Commit frequently** - Don't wait till task is done
4. **Push immediately** - After each commit
5. **Mark done** - Update task status
6. **Final commit** - Ensure everything is pushed
7. **Verify** - Check git log shows your work

### Task Complete Checklist

Before marking task "done":

- [ ] All code changes committed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Files in correct locations
- [ ] `git push` completed successfully
- [ ] Git log shows commit
- [ ] No uncommitted changes (`git status` clean)

## Code Quality

### Before Committing

Run checks if available:

```bash
# Format code
npm run format  # or prettier, if configured

# Run linter
npm run lint    # if configured

# Run tests
npm test        # if tests exist

# Then commit
git add .
git commit -m "Description"
git push
```

### Test Your Changes

```bash
# Build if needed
npm run build

# Test your code
npm test

# Then commit
git commit -m "Feature with tests"
git push
```

## Documentation

### When Writing Docs

Commit documentation separately or with related code:

```bash
# Option 1: Doc with code
git add src/ docs/
git commit -m "Add feature X with documentation"
git push

# Option 2: Doc separate
git add docs/
git commit -m "Add documentation for feature X"
git push
```

### README Updates

Always commit README changes:

```bash
git add README.md
git commit -m "Update README with new features"
git push
```

## File Organization

### New Files

When creating new files:

```bash
# Create file
echo "content" > new-file.md

# Immediately stage and commit
git add new-file.md
git commit -m "Add new-file.md"
git push
```

### Moving Files

If you move files:

```bash
git mv old-location/file.txt new-location/file.txt
git commit -m "Move file to new location"
git push
```

### Deleting Files

If you delete files:

```bash
git rm old-file.txt
git commit -m "Remove old-file.txt (reason)"
git push
```

## Common Mistakes

### ❌ Mistake: "I'll commit later"

**Don't do this.** Commit immediately after changes.

### ❌ Mistake: "Waiting to finish everything"

**Don't do this.** Commit incremental progress.

### ❌ Mistake: "Forgot to push"

```bash
# Fix it now:
git push origin master
```

### ❌ Mistake: "Lost my changes"

This shouldn't happen if you commit+push frequently.

If it does:
```bash
# Check if there's uncommitted work
git status

# Recover from reflog (if committed locally)
git reflog
git reset --hard HEAD@{1}
```

## Emergency: I Haven't Pushed Anything

If you realize you have work that's not pushed:

```bash
# 1. Check what's there
git status
git log --oneline -10

# 2. If commits exist but not pushed
git push origin master

# 3. If no commits but file changes
git add .
git commit -m "Catching up: [describe work]"
git push origin master

# 4. Verify
git log --oneline -5
```

## Questions?

- **Q: How often should I commit?**
  - A: Every time you complete a logical chunk of work. Minimum once per task.

- **Q: Should I squash commits?**
  - A: No, keep commits separate for now. Clear history is better.

- **Q: What if push fails?**
  - A: Run `git pull --rebase` then `git push`. Report to @lead-engineer if issues.

- **Q: Can I commit to a branch?**
  - A: Use `master` branch for now unless told otherwise.

- **Q: Do I need pull requests?**
  - A: No, direct push to master for MVP. PRs for Phase 2.

## Summary

**The Golden Rule:**

```
Work → Commit → Push → Repeat
```

**Never:**
- Leave work uncommitted
- Wait days to push
- Skip commits for "small changes"

**Always:**
- Commit after meaningful progress
- Push immediately after commit
- Verify your changes are in git log
- Keep commit messages clear

---

**This guideline is mandatory for all developers.**

If you're unsure about git, ask @lead-engineer for help.
