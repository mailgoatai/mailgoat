# MailGoat Engineering Plan

**Lead Engineer:** @lead-engineer  
**Date:** 2026-02-15  
**Status:** Active Development

---

## Current State Assessment

### ✅ What Works
- **CLI Structure:** Complete with Commander.js
  - `mailgoat send` - Sends emails (tested, works)
  - `mailgoat read` - Reads messages by ID (implemented)
  - `mailgoat config` - Shows current config (basic)
  - `mailgoat inbox` - Stubbed (Postal API limitation noted)

- **Postal API Client:** Implemented and functional
  - HTTP client with axios
  - Authentication headers
  - Error handling
  - Type definitions

- **Package Structure:** Ready for npm publish
  - TypeScript compiled to dist/
  - package.json configured
  - bin/mailgoat.js executable

### ⚠️ What's Missing
1. **Config Init:** No interactive setup flow
2. **Attachments:** Send command doesn't support files
3. **Landing Page:** Basic HTML, needs polish
4. **Examples:** Shell scripts, not real code
5. **Tests:** Test files exist but not running
6. **Documentation:** CLI docs need updates

---

## Sprint Plan: Week 1

### Developer 1 Tasks (10 hours)
1. **Config Init Command** (4h)
   - Interactive prompts for setup
   - Validation and testing
   - See: task-implement-config-init-command-f3fd4f59

2. **Attachment Support** (6h)
   - File reading and encoding
   - MIME type detection
   - Size validation
   - See: task-add-attachment-support-to-send-command-a445406c

### Developer 2 Tasks (8 hours)
1. **Landing Page Polish** (8h)
   - Modern typography and animations
   - Better visual design
   - Mobile responsive
   - See: task-build-production-landing-page-static-584a564b

### Developer 3 Tasks (16 hours)
1. **Notification Bot Example** (16h)
   - Complete Node.js implementation
   - Docker deployment
   - Full documentation
   - See: task-create-one-complete-integration-example-c10e3615

### QA Tasks (Parallel)
- Test config init flow
- Test attachment handling
- Validate landing page on devices
- Run integration tests

---

## Coordination Points

### Daily Standups
- What did you finish yesterday?
- What are you working on today?
- Any blockers?

### Code Review Requirements
- All PRs need review before merge
- Test coverage for new code
- Update documentation

### Communication Channels
- Tasks: OpenGoat task system
- Code: GitHub PRs
- Urgent: Direct message lead-engineer

---

## Definition of Done

### For Each Task:
- [ ] Code works as specified
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Code reviewed and merged
- [ ] Committed to main branch

### For Sprint:
- [ ] All P0 tasks complete
- [ ] CLI can be published to npm
- [ ] Landing page deployed
- [ ] One working example

---

## Risk Management

### Known Risks:
1. **Postal API Limitation:** Inbox listing not supported
   - Mitigation: Document workaround, defer to v0.2

2. **Time Pressure:** CEO wants results
   - Mitigation: Clear scope, realistic timelines

3. **Team Coordination:** Remote async work
   - Mitigation: Daily updates, clear tasks

---

## Success Metrics

### Week 1 Goals:
- [ ] npm package publishable
- [ ] Landing page live at mailgoat.ai
- [ ] 1 complete example
- [ ] Ready for soft launch

### Longer Term (Month 1):
- [ ] 100+ GitHub stars
- [ ] 10+ self-hosted installations
- [ ] Community feedback collected
- [ ] v0.2 roadmap defined

---

## Notes

**Why This Approach:**
- Focused on shipping working code
- Realistic task sizing (4-16 hours each)
- Clear ownership and accountability
- Product spec drives implementation
- Incremental progress vs. big bang

**What Changed:**
- Previously: Dumped everything on one developer
- Now: Proper task breakdown with specs
- Previously: "Build it all"
- Now: "Complete these specific features"

**Lead Engineer Responsibilities:**
- Define tasks with clear scope
- Unblock developers
- Code review
- Keep stakeholders informed
- Protect team from scope creep
