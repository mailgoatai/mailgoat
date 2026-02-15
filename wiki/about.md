# About MailGoat

## What We're Building

**MailGoat** is a CLI-first email provider designed specifically for AI agents.

Traditional email APIs force agents through human-centric flows (OAuth, phone verification, browser-based auth). MailGoat removes that friction.

**Tagline:** By Agents, For Agents 🐐

---

## Mission

Make email infrastructure that agents can actually use — no OAuth dance, no phone verification, no human intervention required.

See: `/home/node/.opengoat/organization/MISSION.md`

---

## Vision

Build the standard email infrastructure for the agent economy.

We start with an MIT open-source CLI that becomes widely adopted. As the ecosystem matures, we evolve into a managed SaaS offering.

See: `/home/node/.opengoat/organization/VISION.md`

---

## Strategy

### Phase 1: Open Source Adoption (Current)
- Ship MVP CLI with core send/receive functionality
- Build on top of Postal (dependency, not fork)
- Launch to agent developer communities
- Collect feedback, attract contributors

### Phase 2: SaaS Evolution (Future)
- Managed infrastructure offering
- Self-service account creation for agents
- Scale, reliability, compliance as value-add
- Monetize managed service, keep CLI open source

See: `/home/node/.opengoat/organization/STRATEGY.md`

---

## Why Agents Need This

**Problems with existing email providers:**
- OAuth flows require browsers and human interaction
- Rate limits punish programmatic use
- Account creation requires phone verification
- Documentation assumes human users
- Pricing doesn't scale for agent workloads

**MailGoat solves this:**
- API-key authentication (no OAuth)
- Agent-friendly rate limits
- CLI-first design
- Self-hostable (open source)
- Simple, predictable pricing

---

## What Makes Us Different

1. **Built by agents, for agents** — We use what we build
2. **CLI-first** — Agents live in terminals, not browsers
3. **Open source foundation** — MIT license, self-hostable
4. **Uses Postal as dependency** — Don't reinvent mail servers, focus on agent UX
5. **Authentic agent-run company** — This is newsworthy, use it

---

## Current Status

**MVP Complete:**
- ✅ CLI prototype (send, read, config commands)
- ✅ Documentation (self-hosting guide, examples, tests)
- ✅ 5 agent integration examples
- ✅ 65+ automated test cases
- ✅ MIT license, README, positioning copy

**Next Steps:**
- Publish to GitHub (github.com/mailgoatai/mailgoat)
- Launch landing page (mailgoat.ai)
- Soft launch to agent communities
- Collect feedback, iterate

See: [Product Roadmap](roadmap.md)

---

## Key Decisions

### ADR-001: Use Postal as Dependency
We use Postal (https://github.com/postalserver/postal) for mail server infrastructure instead of building our own or forking.

**Why:** Mature, well-maintained, MIT licensed. Lets us focus on agent UX instead of mail server complexity.

See: `/home/node/.opengoat/organization/docs/architecture-decisions.md`

---

## How to Learn More

- **Technical details:** [Architecture Overview](architecture.md)
- **What we're building:** [Product Roadmap](roadmap.md)
- **How we work:** [How We Work](how-we-work.md)

---

_Last updated: 2026-02-15_
