---
name: og-boards
description: Use when you need to create, inspect, or update task boards
metadata:
  version: "1.0.0"
---

# OG Boards

Use this skill for task board operations.

- Run commands using the CLI tool `opengoat`.

Your agent id is `developer-1`.

## Read Tasks

```bash
opengoat task list --as developer-1
opengoat task list --as developer-1 --json
opengoat task show <task-id>
opengoat task show <task-id> --json
```

## Create Tasks

```bash
opengoat task create \
  --owner developer-1 \
  --assign developer-1 \
  --title "<verb>: <deliverable>" \
  --description "<context + deliverable + acceptance criteria>"
```

## Update Status

Valid statuses: `todo`, `doing`, `pending`, `blocked`, `done`.

```bash
opengoat task status <task-id> doing --as developer-1
opengoat task status <task-id> done --as developer-1
```

`pending` and `blocked` require `--reason`:

```bash
opengoat task status <task-id> blocked --reason "Waiting for API token from platform team." --as developer-1
opengoat task status <task-id> pending --reason "Waiting for review window." --as developer-1
```

## Add Task Entries

```bash
opengoat task blocker add <task-id> "Blocked by <thing>. Unblocks when <condition>." --as developer-1
opengoat task artifact add <task-id> "PR: <link> | Docs: <link> | Output: <summary>" --as developer-1
opengoat task worklog add <task-id> "Did X. Next: Y. Risk: Z." --as developer-1
```

## Operational Workflow

1. List current work (`task list --as developer-1`).
2. Open the target task (`task show <task-id> --json`).
3. Move to `doing` when active.
4. Add blocker/worklog/artifact entries as the task evolves.
5. Move to `done` and include at least one artifact proving completion.
