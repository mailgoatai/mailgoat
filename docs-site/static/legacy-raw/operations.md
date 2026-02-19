# MailGoat Operations Infrastructure

**Status:** 🚧 In Progress  
**Owner:** @bizops-lead  
**Last Updated:** 2026-02-15

---

## Overview

This document tracks all operational infrastructure for MailGoat, including domains, accounts, credentials, and support workflows.

---

## 1. Domain & DNS

### Primary Domain

**Domain:** mailgoat.ai  
**Registrar:** Cloudflare _(approved by Growth Lead 2026-02-15)_  
**Status:** 🔴 Not yet registered  
**Cost:** ~$9.15/year

**Required DNS Records:**

- [ ] A/AAAA records for mailgoat.ai
- [ ] MX records (for support@mailgoat.ai)
- [ ] SPF record
- [ ] DKIM record
- [ ] DMARC record
- [ ] TXT verification records (for GitHub, etc.)

**DNS Management:** Cloudflare (integrated with registrar)

---

## 2. GitHub Organization

**Organization Name:** mailgoatai  
**URL:** https://github.com/mailgoatai  
**Status:** 🔴 Not yet created  
**Ownership:** OpenGoat organization

**Planned Repositories:**

- `mailgoat` - Main CLI and self-hosting code (MIT license)
- `mailgoat-landing` - Marketing website (mailgoat.ai)
- `mailgoat-docs` - Documentation site
- `mailgoat-backend` - Managed service backend (private initially)

**Access Control:**

- Admin: @ceo, @lead-engineer, @bizops-lead
- Maintainers: @developer-1, @developer-2, @developer-3
- Write: @product-lead, @qa, @devrel

---

## 3. Social Media & Community

### Twitter/X

**Handle:** @mailgoatai  
**Status:** 🔴 Not yet registered  
**Owner:** OpenGoat organization

### Discord

**Server Name:** MailGoat Community  
**Status:** 🟡 Evaluating (Discord vs GitHub Discussions)  
**Decision:** Pending Growth Lead input

**Alternative:** GitHub Discussions (lower maintenance, integrated with repo)

### ProductHunt

**Profile:** TBD  
**Status:** 🔴 Not yet created  
**Purpose:** Future launch announcement

---

## 4. Email Infrastructure

### Support Email

**Address:** support@mailgoat.ai  
**Status:** 🔴 Not yet configured  
**Backend:** Options:

1. Forward to Postal instance (self-hosted)
2. Forward to Gmail/Google Workspace (temporary)
3. Route to shared support inbox (Postal + webhook)

**Recommendation:** Start with forwarding to Gmail, migrate to Postal webhook once backend is ready.

### Admin Email

**Address:** admin@mailgoat.ai or ops@mailgoat.ai  
**Purpose:** Account signups, registrations, admin communications  
**Status:** 🔴 Not yet configured

---

## 5. Credentials & Secrets

**Storage Strategy:** TBD (Options: 1Password, Bitwarden, ENV vars in deployment)

**Accounts to Track:**

- [ ] Cloudflare (domain registrar + DNS)
- [ ] GitHub organization admin
- [ ] Twitter/X account
- [ ] Discord server (if created)
- [ ] ProductHunt account
- [ ] Email forwarding/SMTP credentials
- [ ] Postal API keys (if used for support)

**Access Control:**

- Critical credentials: CEO + BizOps Lead
- Service credentials: Lead Engineer + DevOps

---

## 6. Support Workflow

### GitHub Issues (Primary)

**Location:** https://github.com/mailgoatai/mailgoat/issues

**Triage Process:**

1. New issue filed by user/agent
2. Auto-labeled by GitHub Actions (bug/feature/question)
3. BizOps Lead or DevRel triages within 24h
4. Assign to appropriate agent (developer, QA, etc.)
5. Close with resolution or link to docs

**Labels:**

- `bug` - Something broken
- `feature` - Enhancement request
- `question` - User needs help
- `documentation` - Docs issue
- `P0` / `P1` / `P2` - Priority levels

### Email Support (Secondary)

**Address:** support@mailgoat.ai  
**Response Time:** Best effort, no SLA during beta/MVP  
**Target:** <48h for initial response  
**Escalation:** Tag @lead-engineer for technical issues, @product-lead for feature questions

### Community Support (If Discord)

**Channel:** #support  
**Coverage:** Community-driven, agents monitor  
**Escalation:** Move to GitHub issues for bugs

---

## 7. Monitoring & Health Checks

**Status Page:** TBD (consider GitHub status or custom page)  
**Uptime Monitoring:** TBD (Postal self-hosted, managed service backend)  
**Incident Response:** TBD (define on-call rotation if needed)

---

## 8. Landing Page Placeholder

**URL:** https://mailgoat.ai  
**Status:** 🔴 Not yet deployed  
**Content:**

- Hero: "Email for AI Agents. By AI Agents."
- Subhead: "Coming soon. Built by OpenGoat."
- Email capture form (MailChimp, ConvertKit, or custom)
- GitHub link
- Twitter link

**Hosting:** Netlify, Vercel, or Cloudflare Pages (free tier)

---

## 9. Launch Checklist

### Phase 1: Foundation (Current)

- [ ] Register mailgoat.ai domain
- [ ] Configure basic DNS
- [ ] Create GitHub org and repos
- [ ] Secure Twitter handle
- [ ] Deploy landing page placeholder
- [ ] Set up email forwarding for support@

### Phase 2: Pre-Launch

- [ ] Finalize support workflow
- [ ] Configure Postal for support@ routing
- [ ] Create Discord or enable GitHub Discussions
- [ ] Set up credentials vault
- [ ] Document emergency contacts

### Phase 3: Launch

- [ ] Announce on Twitter, HN, Reddit
- [ ] Monitor GitHub issues closely
- [ ] Respond to first users/agents
- [ ] Iterate based on feedback

---

## 10. Emergency Contacts

**Critical Infrastructure Issues:**

- Primary: @bizops-lead
- Backup: @ceo

**Technical Outages:**

- Primary: @lead-engineer
- Backup: @developer-1

**Security Incidents:**

- Primary: @lead-engineer
- Secondary: @ceo

---

## 11. Budget Tracking

| Item                 | Cost                  | Frequency | Status        |
| -------------------- | --------------------- | --------- | ------------- |
| mailgoat.ai domain   | ~$9.15                | Annual    | 🔴 Pending    |
| GitHub org           | Free                  | N/A       | 🔴 Pending    |
| Twitter account      | Free                  | N/A       | 🔴 Pending    |
| Discord              | Free                  | N/A       | 🟡 Evaluating |
| Landing page hosting | Free (Netlify/Vercel) | N/A       | 🔴 Pending    |
| Email forwarding     | Free (Cloudflare)     | N/A       | 🔴 Pending    |

**Total Monthly Cost:** $0  
**Total Annual Cost:** ~$10

---

## Change Log

**2026-02-15:**

- Initial document created by @bizops-lead
- Coordinated with @growth-lead on registrar choice (Cloudflare approved)
- Documented infrastructure plan and launch checklist
