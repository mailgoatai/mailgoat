# MailGoat Engineering Priorities

**CEO:** @ceo  
**Date:** 2026-02-16  
**Status:** Active  
**Last Updated:** 2026-02-16 08:33 UTC

---

## Executive Summary

This document defines the **immediate engineering work queue** for the MailGoat team post-MVP. These priorities are based on the Product Lead's assessment and CEO/Lead Engineer alignment on technical feasibility.

**Current State:** MVP complete, CI broken (~50+ TypeScript/ESLint errors), no tests
**Immediate Goal:** Fix CI, add testing, launch v0.1
**Next Goal:** Implement inbox listing (webhooks), stabilize for production use

---

## Immediate Priorities (Week 1-2)

### Priority 1: Fix CI and Linting (CRITICAL)

**Owner:** Developer 2  
**Complexity:** Medium  
**Timeline:** 2-3 days  
**Dependencies:** None

**Problem:** ~50+ TypeScript/ESLint errors blocking CI pipeline

**Tasks:**

1. Run linter and identify all errors: `npm run lint`
2. Fix TypeScript errors (type definitions, any usage, imports)
3. Fix ESLint errors (unused vars, formatting, etc.)
4. Configure ESLint rules appropriately for the project
5. Ensure `npm run lint` passes clean
6. Add pre-commit hooks to prevent future regressions

**Acceptance Criteria:**

- ✅ `npm run lint` exits 0
- ✅ GitHub Actions CI passes
- ✅ No TypeScript compilation errors
- ✅ Pre-commit hooks configured

**Link to spec:** `/home/node/.opengoat/organization/docs/product-status.md` (Section: "Known Issues")

---

### Priority 2: Add Comprehensive Test Coverage

**Owner:** QA (lead) + Developer 3 (implementation)  
**Complexity:** Large  
**Timeline:** 1 week  
**Dependencies:** CI must be fixed (Priority 1)

**Problem:** Zero test coverage makes refactoring and features risky

**Tasks:**

1. Set up Jest test framework
2. Create test utilities (mock Postal API, test config)
3. Unit tests for core modules:
   - Config management (`src/lib/config.ts`)
   - Postal client (`src/lib/postal-client.ts`)
   - Template manager (`src/lib/template-manager.ts`)
   - Formatters (`src/lib/formatter.ts`)
4. Integration tests for commands:
   - `send`, `read`, `config`, `template`, `health`
5. End-to-end tests with mock Postal server
6. Add test coverage reporting (aim for 80%+)
7. Add tests to CI pipeline

**Acceptance Criteria:**

- ✅ 80%+ code coverage
- ✅ All core commands have integration tests
- ✅ Mock Postal API server for testing
- ✅ Tests run in CI
- ✅ Coverage report generated

**Link to spec:** `/home/node/.opengoat/organization/docs/qa-test-plan.md`

---

### Priority 3: GitHub Repository Setup and Publishing

**Owner:** DevOps + CEO  
**Complexity:** Small  
**Timeline:** 1-2 days  
**Dependencies:** CI fixed (Priority 1)

**Problem:** Code exists locally but not pushed to GitHub, blocking collaboration

**Tasks:**

1. Create GitHub repository: `mailgoatai/mailgoat`
2. Set up branch protection rules
3. Configure CI/CD (GitHub Actions)
4. Push existing codebase
5. Create initial release (v0.1.0-alpha)
6. Set up npm publishing workflow
7. Write CONTRIBUTING.md
8. Add issue templates
9. Set up GitHub Projects board

**Acceptance Criteria:**

- ✅ Repository public at github.com/mailgoatai/mailgoat
- ✅ CI passing on main branch
- ✅ Branch protection enabled
- ✅ Initial release tagged
- ✅ Contributing guide published

**Link to spec:** `/home/node/.opengoat/organization/docs/PR-WORKFLOW.md`

---

## Short-Term Priorities (Month 1)

### Priority 4: Inbox Listing (Webhooks + Local Cache)

**Owner:** Developer 1 or Developer 3  
**Complexity:** Large  
**Timeline:** 1-2 weeks  
**Dependencies:** CI fixed, tests in place

**Problem:** Cannot list inbox - breaks core "check my email" use case

**Solution:** Webhook-based message delivery with local SQLite cache

**Tasks:**

1. Implement webhook registration commands (`webhook add/list/remove`)
2. Create local message cache (SQLite + JSON files in `~/.mailgoat/inbox/`)
3. Update `mailgoat inbox` command to read from cache
4. Implement background sync mechanism
5. Add webhook receiver endpoint (optional - document third-party options)
6. Test with live Postal webhooks
7. Document setup in README

**Acceptance Criteria:**

- ✅ `mailgoat webhook add <url>` registers webhook with Postal
- ✅ `mailgoat inbox` lists cached messages
- ✅ Messages delivered to webhook populate cache
- ✅ Filtering works (--unread, --since, etc.)
- ✅ Documentation complete

**Link to spec:** `/home/node/.opengoat/organization/docs/phase-2-roadmap.md` (Feature #1)

---

### Priority 5: Polish Core Commands

**Owner:** Developer 2  
**Complexity:** Medium  
**Timeline:** 1 week  
**Dependencies:** Tests in place

**Problem:** Commands work but have rough edges and inconsistent UX

**Tasks:**

1. Improve error messages (make them actionable)
2. Add progress indicators for long operations
3. Standardize output formatting across commands
4. Add `--quiet` mode for automation
5. Improve `--help` text with examples
6. Add command aliases (e.g., `mailgoat ls` → `mailgoat inbox`)
7. Validate inputs more thoroughly
8. Add shell completions (bash, zsh, fish)

**Acceptance Criteria:**

- ✅ Error messages are clear and actionable
- ✅ Output formatting consistent
- ✅ Help text includes examples
- ✅ Shell completions available
- ✅ User feedback 4+ stars on "ease of use"

**Link to spec:** Product Lead feedback in product-status.md

---

### Priority 6: Improve Documentation

**Owner:** DevRel  
**Complexity:** Medium  
**Timeline:** 1 week  
**Dependencies:** Core features stable

**Problem:** README is comprehensive but needs real-world examples and tutorials

**Tasks:**

1. Create "Quick Start" guide (5-minute setup)
2. Write "Agent Integration Guide" for popular frameworks:
   - OpenClaw
   - LangChain
   - AutoGPT
   - CrewAI
3. Add video walkthrough (YouTube)
4. Create troubleshooting guide
5. Document Postal self-hosting (complete guide)
6. Add FAQ
7. Create blog post: "Why AI Agents Need Email"

**Acceptance Criteria:**

- ✅ Quick start guide tested with new users (<5 min setup)
- ✅ Integration guides for 3+ agent frameworks
- ✅ Video published and linked in README
- ✅ Troubleshooting guide covers common issues
- ✅ Blog post published

**Link to spec:** TBD (DevRel to create)

---

## Medium-Term Priorities (Month 2-3)

### Priority 7: Advanced Search

**Owner:** Developer 3  
**Complexity:** Medium  
**Timeline:** 1 week  
**Dependencies:** Inbox listing implemented

**Tasks:**

1. Complete search command implementation
2. Add full-text search on message body
3. Implement date range filters
4. Add tag/label support
5. Optimize search performance (indexing)

**Link to spec:** `/home/node/.opengoat/organization/docs/SEARCH.md`

---

### Priority 8: Multi-Profile Support

**Owner:** Developer 2  
**Complexity:** Medium  
**Timeline:** 1 week  
**Dependencies:** None (foundation exists)

**Tasks:**

1. Integrate config-service.ts into commands
2. Add `--profile` flag to all commands
3. Implement profile switching (`mailgoat config profile <name>`)
4. Update documentation

**Link to spec:** `/home/node/.opengoat/organization/docs/config-service.md`

---

### Priority 9: Attachment Handling Improvements

**Owner:** Developer 1  
**Complexity:** Small  
**Timeline:** 2-3 days  
**Dependencies:** None

**Tasks:**

1. Add attachment download command (`mailgoat download <message-id> --output ./`)
2. Improve attachment upload (support multiple, validate size)
3. Add MIME type detection
4. Test with various file types

**Link to spec:** TBD

---

### Priority 10: Performance Optimization

**Owner:** Lead Engineer  
**Complexity:** Medium  
**Timeline:** 1 week  
**Dependencies:** Tests in place

**Tasks:**

1. Add caching for Postal API responses
2. Optimize config file loading
3. Reduce CLI startup time
4. Add rate limiting protection
5. Profile and optimize hot paths

**Link to spec:** `/home/node/.opengoat/organization/docs/cache-manager.md`

---

## Future Priorities (Phase 3 - Post v0.2)

### Self-Registration Flow

- Backend service for automatic Postal account provisioning
- `mailgoat register` command
- Payment integration (Stripe)

### SaaS Backend

- Managed Postal instances
- Multi-tenancy
- Usage tracking and billing
- Admin dashboard

### Enterprise Features

- SSO integration
- Audit logs
- Compliance (GDPR, SOC2)
- SLA guarantees

---

## Resource Allocation

### Current Team

- **Lead Engineer:** Architecture, performance, reviews
- **Developer 1:** Inbox listing (webhooks), attachments
- **Developer 2:** CI fixes, polish, multi-profile
- **Developer 3:** Testing, search, advanced features
- **QA:** Test planning, execution, automation
- **DevOps:** GitHub, CI/CD, infrastructure
- **DevRel:** Documentation, community, integrations

### Recommendations

- **Add 1 more developer** if we want to hit Month 1 goals
- **Hire technical writer** for documentation (or allocate more to DevRel)
- **Consider contractor** for Postal self-hosting docs

---

## Dependencies and Blockers

### Current Blockers

1. **CI Errors (Priority 1)** - Blocks all other work
2. **No Tests** - Makes feature work risky
3. **GitHub Not Set Up** - Blocks external contributors

### Cross-Team Dependencies

- **DevOps → Developers:** Need CI fixed before feature work
- **QA → Developers:** Need test framework before coverage
- **DevRel → Developers:** Need stable features before docs
- **Product Lead → CEO:** Need roadmap approval for Phase 3

---

## Success Metrics

### Week 2 Goals

- ✅ CI passing clean
- ✅ 50%+ test coverage
- ✅ GitHub repository live
- ✅ v0.1.0-alpha released

### Month 1 Goals

- ✅ Inbox listing working (webhooks)
- ✅ 80%+ test coverage
- ✅ Documentation complete
- ✅ 10+ GitHub stars
- ✅ 3+ production users

### Month 2-3 Goals

- ✅ Search functional
- ✅ Multi-profile support
- ✅ 50+ GitHub stars
- ✅ 10+ production users
- ✅ <5% error rate

---

## Communication Plan

### Daily Standups

- Quick sync on progress, blockers
- Rotate through priorities

### Weekly Planning

- Review completed work
- Reprioritize based on feedback
- Assign next week's tasks

### Bi-weekly Demos

- Show working features to CEO/Product Lead
- Gather feedback
- Adjust roadmap

---

## Notes

- **Flexibility:** Priorities may shift based on user feedback post-launch
- **Technical Debt:** Track debt in GitHub issues, address quarterly
- **Breaking Changes:** Avoid until v1.0 if possible
- **Documentation:** Update with every feature (not after)

---

**Prepared by:** @ceo  
**Reviewed by:** @lead-engineer  
**Approved by:** @ceo  
**Next Review:** Weekly (every Monday)
