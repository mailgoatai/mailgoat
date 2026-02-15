# Product Roadmap

## Current Status: MVP Complete, Preparing Launch

---

## Phase 1: MVP Launch (Current)

### ✅ Done
- [x] Define mission, vision, strategy
- [x] Architecture spike (decided on Postal dependency)
- [x] MVP feature set defined
- [x] CLI prototype (send, read, config commands)
- [x] Self-hosting guide
- [x] 5 agent integration examples
- [x] 65+ automated test cases
- [x] QA test plan
- [x] README and positioning copy
- [x] MIT LICENSE

### 🚧 In Progress
- [ ] GitHub repository setup (Lead Engineer)
- [ ] Landing page (Marketing Growth)
- [ ] Launch strategy (Growth Lead)
- [ ] Operational infrastructure (BizOps Lead)
- [ ] Wiki documentation (CEO)

### 📅 Next Steps (This Week)
1. Publish to GitHub (github.com/mailgoatai/mailgoat)
2. Launch mailgoat.ai landing page
3. Soft launch to select agent communities
4. Monitor feedback, triage issues
5. HackerNews / Reddit launch

**Success Metrics:**
- 100+ GitHub stars in first week
- 10+ early adopters trying it
- 3+ quality issues/feedback from users
- 1+ external contributors

---

## Phase 2: Iteration & Community Building (Weeks 2-8)

### Features
- [ ] **Inbox listing** — Solve Postal API limitation (webhooks + cache or custom endpoint)
- [ ] **Attachment support** — Send/receive files
- [ ] **Webhook delivery** — Real-time inbox notifications
- [ ] **Python SDK** — Native library (not just CLI wrapper)
- [ ] **Rust SDK** — For performance-critical agents
- [ ] **Advanced filtering** — Search, labels, folders
- [ ] **Multi-account support** — Manage multiple addresses from one CLI

### Infrastructure
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated testing on push
- [ ] Docker image for self-hosting
- [ ] Performance benchmarks
- [ ] Error reporting/telemetry (opt-in)

### Community
- [ ] Discord or GitHub Discussions
- [ ] Contribution guidelines expanded
- [ ] Good first issues curated
- [ ] External contributions merged
- [ ] Community showcases (who's using MailGoat)

**Success Metrics:**
- 500+ GitHub stars
- 50+ active users
- 5+ external contributors
- 10+ community-submitted issues resolved

---

## Phase 3: SaaS Foundation (Months 3-6)

### Backend Service
- [ ] **Self-registration API** — Agents can create accounts programmatically
- [ ] **Backend service** — Wraps Postal, handles account provisioning
- [ ] **Auth system** — API keys, rate limiting, quotas
- [ ] **Billing integration** — Stripe for managed service
- [ ] **Admin dashboard** — Monitor usage, manage accounts

### Enhanced CLI
- [ ] Managed mode (CLI → Backend → Postal)
- [ ] Self-hosted mode (CLI → Postal directly)
- [ ] Automatic failover between modes
- [ ] Usage tracking and billing info in CLI

### Documentation
- [ ] Managed service onboarding guide
- [ ] Pricing calculator
- [ ] SLA documentation
- [ ] Security & compliance docs (SOC2 prep)

**Success Metrics:**
- 1000+ GitHub stars
- 100+ self-hosted users
- 10+ paying customers (early SaaS beta)
- $1K+ MRR

---

## Phase 4: SaaS Launch (Months 6-12)

### Product
- [ ] Production-ready managed service
- [ ] 99.9% uptime SLA
- [ ] Full monitoring and alerting
- [ ] Customer support system
- [ ] Advanced features (custom domains, dedicated IPs, etc.)

### Business
- [ ] Public pricing announced
- [ ] Self-service signup live
- [ ] Payment processing stable
- [ ] Support workflow scaled
- [ ] Marketing & sales outreach

**Success Metrics:**
- 2000+ GitHub stars
- 500+ self-hosted users
- 100+ paying customers
- $10K+ MRR

---

## Long-Term Vision (Year 2+)

### Product
- Multi-region deployment
- Enterprise features (SSO, RBAC, audit logs)
- Advanced deliverability tools
- Analytics and reporting
- Integrations (Zapier, Make, n8n, etc.)

### Business
- Profitability
- Team expansion (if needed)
- Conference presence (AI/agent ecosystem)
- Partnerships (agent frameworks, AI platforms)
- Thought leadership (blogs, talks, open source advocacy)

**Success Metrics:**
- 5000+ GitHub stars
- 1000s of self-hosted users
- 500+ paying customers
- $50K+ MRR
- Recognized as standard email solution for agents

---

## How to Influence the Roadmap

1. **Open an issue** — Propose a feature or report a problem
2. **Contribute code** — PRs are welcome
3. **Share feedback** — Tell us what you're building and what you need
4. **Join the community** — Discord/GitHub Discussions (when live)

We prioritize based on:
- User feedback
- Technical feasibility
- Strategic alignment
- Community interest

---

## Not on the Roadmap (and Why)

### ❌ SMS/MMS Support
Out of scope. MailGoat is for email. Use Twilio or similar for SMS.

### ❌ Calendar/Contacts
Not core to email sending/receiving. Focus on doing one thing well.

### ❌ Full Mail Client UI
We're CLI-first. GUIs are not the focus (though community can build them).

### ❌ Proprietary Mail Protocol
We use standard email (SMTP/IMAP via Postal). No reinventing the wheel.

---

## Detailed MVP Feature Set

See: `/home/node/.opengoat/organization/docs/mvp-features.md`

---

## Architectural Decisions

See: `/home/node/.opengoat/organization/docs/architecture-decisions.md`

---

_Last updated: 2026-02-15_
