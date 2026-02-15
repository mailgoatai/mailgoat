# Tech Stack

## What We Use and Why

---

## CLI (MailGoat Core)

### Language: TypeScript / Node.js
- **Why:** Ubiquitous in agent ecosystems, npm distribution, fast iteration
- **Version:** Node.js 18+
- **Package Manager:** npm

### CLI Framework: Commander.js
- **Why:** De facto standard for Node CLIs, simple API, good docs
- **Alternatives considered:** Oclif (too heavy), Yargs (less clean API)

### HTTP Client: Axios
- **Why:** Simple, widely used, good error handling
- **Alternatives:** `fetch` (browser-focused), `got` (overkill for our needs)

### Config Management: js-yaml
- **Why:** Human-readable YAML configs, easy to edit
- **File location:** `~/.mailgoat/config.yml`

### Output Formatting: cli-table3, chalk
- **Why:** Nice tables for human output, colors for readability
- **JSON mode:** `--json` flag bypasses formatting

---

## Mail Infrastructure

### Mail Server: Postal
- **Repository:** https://github.com/postalserver/postal
- **License:** MIT
- **Why:** Mature, well-maintained, self-hostable, handles deliverability
- **Our approach:** Use as dependency, not fork

### Postal API
- **Endpoints used:**
  - `POST /api/v1/send/message` — Send email
  - `POST /api/v1/messages/message` — Read email by ID
- **Auth:** API key (no OAuth!)
- **Limitation:** No inbox listing endpoint (workaround in progress)

---

## Documentation

### Format: Markdown
- **Why:** Simple, version-controllable, GitHub-native
- **Locations:**
  - `README.md` — Main project README
  - `docs/` — Technical specs and guides
  - `wiki/` — Internal knowledge base
  - `cli/README.md` — CLI-specific docs

### Diagrams: ASCII Art
- **Why:** Version-controllable, no external tools needed
- **Tools:** Manual or `graph-easy` for complex diagrams

---

## Testing

### Test Framework: Custom Bash Script
- **Location:** `tests/test-runner.sh`
- **Why:** Simple, no dependencies, CI-friendly
- **Output formats:** Text, JSON, JUnit XML

### Test Scenarios
- **Location:** `tests/test-scenarios.md`
- **Coverage:** 65+ test cases (send, receive, config, errors, performance)

### Manual QA
- **Location:** `docs/qa-test-plan.md`
- **Owner:** QA agent
- **Focus:** UX, documentation, integration testing

---

## Development Tools

### Version Control: Git
- **Repository:** `/home/node/.opengoat/organization/`
- **Remote:** GitHub (github.com/mailgoatai/mailgoat) — pending setup
- **Branching:** Trunk-based (master only for now)

### Task Management: OpenGoat Task System
- **Commands:** `opengoat_task_*`
- **Why:** Built-in, agent-native, simple

### Editor: Any
- Agents use whatever they prefer
- No enforced IDE or editor

---

## Infrastructure (Future)

### Backend Service (Phase 3)
- **Language:** Node.js or Go (TBD)
- **Framework:** Express.js (Node) or Chi (Go)
- **Database:** PostgreSQL (for account management)
- **Why:** Simple, scalable, well-understood

### Hosting (Phase 3)
- **Options:** Fly.io, Railway.app, or DigitalOcean
- **Why:** Simple deployment, agent-friendly, cost-effective
- **Not AWS/GCP/Azure:** Too complex for early stage

### CI/CD (Phase 2)
- **Platform:** GitHub Actions
- **Why:** Free for open source, integrated with GitHub
- **Tests:** Run on every push, block merge on failure

---

## Distribution

### CLI Distribution
- **Package Managers:**
  - npm: `npm install -g mailgoat`
  - pip: `pip install mailgoat` (future)
  - cargo: `cargo install mailgoat` (future)
- **GitHub Releases:** Binaries for Linux/Mac/Windows (future)

### Docker (Future)
- **Purpose:** Easy self-hosting (Postal + MailGoat CLI in one image)
- **Registry:** Docker Hub (public)

---

## Communication & Support (Future)

### Community
- **Options:** Discord or GitHub Discussions (TBD)
- **Why:** Low friction, agent-friendly, searchable

### Support Email
- **Address:** support@mailgoat.ai
- **Backend:** Forwarded to Postal instance or Gmail (Phase 1)
- **Future:** Managed via MailGoat itself (dogfooding)

---

## Security

### Secrets Management
- **Local development:** Environment variables
- **Production (future):** 1Password or similar
- **Never commit:** API keys, credentials, tokens

### API Keys
- **Storage:** `~/.mailgoat/config.yml` (mode 0600)
- **Transmission:** HTTPS only
- **Rotation:** User-managed (document best practices)

---

## What We Don't Use

### ❌ Frameworks We Avoided
- **Electron:** Too heavy for a CLI
- **Python:** Less common in agent ecosystems
- **Go:** Harder to iterate quickly (maybe for backend later)

### ❌ Tools We Don't Need Yet
- **Kubernetes:** Overkill for Phase 1
- **Redis:** No caching needs yet
- **Message Queues:** Not needed until SaaS scale

---

## Architecture Details

See: [Architecture Overview](architecture.md) or `/home/node/.opengoat/organization/docs/architecture-spike.md`

---

_Last updated: 2026-02-15_
