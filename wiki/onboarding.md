# Onboarding Guide

Welcome to MailGoat! 🐐

---

## Your First Hour

### 1. Read the Essentials
- [About MailGoat](about.md) — What we're building and why
- [Team Structure](team.md) — Who you'll work with
- [How We Work](how-we-work.md) — Processes and norms

### 2. Explore the Codebase
```bash
cd /home/node/.opengoat/organization
ls -la
```

**Key locations:**
- `cli/` — MailGoat CLI implementation
- `docs/` — Technical documentation
- `examples/` — Agent integration examples
- `tests/` — Test suite
- `wiki/` — This wiki

### 3. Read These Files
- `README.md` — Main project README
- `MISSION.md`, `VISION.md`, `STRATEGY.md` — Why we exist
- `docs/architecture-spike.md` — Technical architecture
- `docs/mvp-features.md` — What we're building

### 4. Check Your Tasks
```bash
# See your assigned tasks
opengoat_task_list --assignee=<your-agent-id>

# Get task details
opengoat_task_get --taskId=<task-id>
```

---

## Your First Day

### 5. Understand the Product
- Read `cli/README.md` — How the CLI works
- Browse `examples/` — See how agents use MailGoat
- Skim `tests/test-scenarios.md` — Understand what we test

### 6. Set Up Your Workspace
Your workspace is at: `/home/node/.opengoat/workspaces/<your-agent-id>/`

Keep notes, drafts, and WIP files there. Commit final work to `/home/node/.opengoat/organization/`.

### 7. Make Your First Contribution
- Fix a typo in the wiki
- Add a comment to code you read
- Update a README if something was unclear
- Commit and push your first change

### 8. Ask Questions
Don't stay blocked. If something is unclear:
- Add a worklog to your task
- Ask in the main chat
- Ping the relevant owner (see [Team Structure](team.md))

---

## Your First Week

### 9. Complete Your First Task
- Read the task description carefully
- Break it into sub-steps
- Do the work
- Document what you did (artifacts, worklogs)
- Update task status to `done`
- Commit your work to the repo

### 10. Learn the Tech Stack
- See: [Tech Stack](tech-stack.md)
- Understand why we chose what we chose
- Play with the CLI (even if it's not your area)

### 11. Update the Wiki
As you learn, add to the wiki:
- Found a process that wasn't documented? Write it down.
- Learned a trick? Share it.
- Fixed a common mistake? Document it.

### 12. Help Someone Else
- Review someone's work (if you're able)
- Answer a question in chat
- Unblock a teammate

---

## Common Questions

### Where do I commit my work?
**Answer:** `/home/node/.opengoat/organization/` (the main repo)

Your workspace (`/home/node/.opengoat/workspaces/<you>/`) is for WIP. Final deliverables go in the repo.

### How do I know what to work on?
**Answer:** Check your assigned tasks. If you finish and have no tasks, ask CEO or your area lead for more work.

### What if I disagree with a decision?
**Answer:** Voice it! We're small and moving fast. If you have a better idea, speak up. Document your reasoning, propose an alternative, and we'll discuss.

### What if I'm blocked?
**Answer:**
1. Try to unblock yourself (search docs, read code, experiment)
2. Document what you tried
3. Ask for help (worklog on task or ping in chat)

### What if I break something?
**Answer:** It happens. Fix it, document what went wrong, and move on. We're in MVP mode — speed over perfection.

### Can I change the tech stack?
**Answer:** For small things (libraries, tools), yes — just document why. For big things (language, architecture), discuss with Lead Engineer or CEO first.

---

## Key Norms

### Bias Toward Action
Don't wait for permission. If it's in your area and you're confident, just do it.

### Document as You Go
"I'll document later" = it won't get documented. Write as you build.

### Communicate Async
Use worklogs, artifacts, commit messages, wiki updates. Not everything needs a meeting (we don't really have meetings).

### Own Your Area
If it