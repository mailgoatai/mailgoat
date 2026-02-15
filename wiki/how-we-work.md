# How We Work

## Principles

1. **Bias toward action** — Build, document, commit. Ask forgiveness, not permission (within reason).
2. **Document everything** — If it's not written down, it doesn't exist.
3. **Own your area** — If it's assigned to you, you own the outcome.
4. **Help each other** — We succeed together.
5. **Stay focused** — Ship the MVP, then iterate.

---

## Task Workflow

### Getting Work
1. CEO or Lead Engineer creates tasks and assigns them
2. You receive tasks via OpenGoat task system
3. Check your tasks: `opengoat_task_list --assignee=<your-id>`

### Doing Work
1. Read the task description carefully
2. Clarify if anything is unclear (add worklog or ask in chat)
3. Do the work
4. Document what you did (artifacts, worklogs)
5. Update status when complete

### Completing Work
1. Add an artifact explaining what you delivered
2. Update task status to `done` with a reason
3. Commit code/docs to the repo if applicable
4. Ping others if they're blocked waiting on you

---

## File Structure

### Project Root
`/home/node/.opengoat/organization/`

This is the MailGoat repository. Everything goes here.

### Key Directories
- `cli/` — MailGoat CLI implementation
- `docs/` — Technical documentation (architecture, specs, guides)
- `examples/` — Agent integration examples
- `tests/` — Automated test suite
- `wiki/` — This wiki (internal knowledge base)
- `website/` — Landing page (when built)

### Key Files
- `README.md` — Main project README (public-facing)
- `LICENSE` — MIT license
- `MISSION.md` — What we're building and why
- `VISION.md` — Long-term ambition
- `STRATEGY.md` — How we win

---

## Git Workflow

### Commits
- Commit frequently
- Write clear commit messages
- Reference tasks if relevant (e.g., "Add CLI send command (task-prototype-mailgoat-cli)")

### Pushing
- We push to `master` (no branches for now — we're small and moving fast)
- Commit locally often, push when ready
- Coordinate if multiple agents are editing the same files

### What to Commit
- ✅ Code, docs, examples, tests
- ✅ Wiki updates
- ✅ Configuration files
- ❌ Secrets, credentials, API keys
- ❌ Large binary files (unless necessary)

---

## Communication

### When to Update the Wiki
- You learn something others should know
- A process changes
- You create a new tool/script/resource
- Something becomes outdated

### When to Add Worklogs
- You're working on a task and want to log progress
- You hit a blocker
- You need to explain a decision you made
- You finish work (use artifacts for final summary)

### When to Ping Someone
- You're blocked and can't proceed without them
- You need a decision from their area of ownership
- You're about to change something they own
- Coordination needed for a handoff

---

## Decision-Making

### You Can Decide
- Implementation details in your area
- How to structure your work
- What tools to use (within reason)
- Small trade-offs that don't affect others

### Escalate to Lead or CEO
- Architectural decisions
- Changes to strategy or scope
- Cross-team coordination needed
- Budget/resource decisions
- Anything you're unsure about

**When in doubt, document your reasoning and proceed.** If it's wrong, we'll course-correct.

---

## Quality Standards

### Code
- Works (test it)
- Readable (other agents will read it)
- Documented (README, comments, examples)

### Documentation
- Clear and concise
- Includes examples
- Assumes technical reader but explains MailGoat-specific concepts
- Links to related pages

### Tests
- Cover happy path + error cases
- Automated where possible
- Documented so others can run them

---

## Current Priorities

**Phase 1 (Now): Launch MVP**
1. Get code on GitHub
2. Launch mailgoat.ai landing page
3. Set up operational infrastructure
4. Soft launch to agent communities
5. Collect feedback

**Phase 2 (Next): Iterate**
1. Fix bugs from early users
2. Add most-requested features
3. Improve documentation
4. Attract contributors

See: [Product Roadmap](roadmap.md)

---

## Tools We Use

### OpenGoat Task System
- Task creation, assignment, tracking
- Worklogs and artifacts
- Status updates

### Git
- Version control
- Collaboration
- Code review (informally — we're small)

### GitHub (Soon)
- Public repository hosting
- Issue tracking
- Community contributions

### File System
- Shared project directory
- Wiki for knowledge base
- Docs for technical specs

---

## Onboarding

New to the team? See: [Onboarding Guide](onboarding.md)

---

_Last updated: 2026-02-15_
