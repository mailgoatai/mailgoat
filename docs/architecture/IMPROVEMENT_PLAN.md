# MailGoat Improvement Plan

**Lead Engineer:** @lead-engineer  
**Date:** 2026-02-18  
**Based on:** ARCHITECTURE_ASSESSMENT.md  
**Timeline:** Week 1 (Critical) + Week 2 (High Priority)

---

## Executive Summary

This plan prioritizes **completing existing work** over starting new initiatives. The goal is production-ready code with multi-agent collaboration support.

**Critical Path:** Fix tests → Complete DI → Add logging  
**Timeline:** 5 days for P0, 5 days for P1  
**Success Metric:** All tests passing, 80%+ coverage, clean CI

---

## Priority Framework

- **P0 (CRITICAL):** Blocks all development, must fix immediately
- **P1 (HIGH):** Needed for V1 launch, blocks production
- **P2 (MEDIUM):** Important but can defer to V1.1
- **P3 (LOW):** Nice to have, V2.0 consideration

---

## P0: Critical (Must Fix This Week)

### 1. Fix Test Infrastructure 🚨

**Problem:** Tests failing with TypeScript/mocking errors, can't validate changes

**Impact:** HIGH - Blocks all agent development, high regression risk

**Root Causes:**
- axios mock strategy incomplete
- fs/promises not properly mocked
- TypeScript type errors in test files
- Jest configuration may need updates

**Solution:**
1. Fix axios interceptor mocking in postal-client tests
2. Properly mock fs/promises in TemplateManager tests
3. Update TypeScript types in test mocks
4. Ensure all tests pass locally and in CI
5. Document mocking patterns for agents

**Acceptance Criteria:**
- ✅ `npm test` passes locally
- ✅ `npm run test:coverage` works
- ✅ CI shows green checkmark
- ✅ Coverage >60% (baseline)
- ✅ No TypeScript errors in tests

**Effort:** 4-6 hours

**Owner:** QA (primary) + Developer 2 (support)

**Dependencies:** None (top priority)

**Deliverables:**
- All tests passing
- Test coverage report
- Mocking guide document

---

### 2. DI Migration Decision 🚨

**Problem:** Dependency injection container exists but not used, two patterns coexist

**Impact:** HIGH - Confuses agents, creates inconsistent code

**Options:**

**Option A: Complete Migration (RECOMMENDED)**
- Migrate all commands to use DI container
- Remove direct PostalClient instantiation
- Update examples and documentation
- **Pros:** Cleaner long-term, easier testing, professional
- **Cons:** 8-12 hours effort
- **Recommended IF:** We have time this week

**Option B: Rollback DI**
- Remove TSyringe dependency
- Remove container.ts and di-example.ts
- Document direct instantiation pattern
- **Pros:** Fast (2 hours), simpler for now
- **Cons:** Harder to test, less professional
- **Recommended IF:** Tight timeline, ship fast

**Recommendation:** **Option A** - Complete the migration

**Rationale:**
- Foundation is already in place
- Better for multi-agent development
- Easier to test
- More maintainable long-term
- Only 8-12 hours investment

**Solution (Option A):**
1. Migrate `send` command to use DI container
2. Migrate `read` command to use DI container
3. Migrate `inbox` command to use DI container
4. Migrate `config` command to use DI container
5. Migrate `template` command to use DI container
6. Remove all direct PostalClient instantiations
7. Update examples to use DI pattern
8. Document DI usage in CONTRIBUTING.md

**Acceptance Criteria:**
- ✅ All commands use DI container
- ✅ No direct PostalClient instantiation
- ✅ di-example.ts demonstrates pattern
- ✅ Tests use DI for mocking
- ✅ Documentation updated

**Effort:** 8-12 hours (complete) OR 2 hours (rollback)

**Owner:** Lead Engineer (decision) + Developer 1 (implementation)

**Dependencies:** Fix tests first (helps validate migration)

**Deliverables:**
- Updated commands using DI
- Migration guide
- Updated documentation

---

### 3. Implement Production Logging 🔴

**Problem:** No structured logging, only console.log, can't debug production

**Impact:** HIGH - Can't troubleshoot live issues, blind in production

**Solution:**
1. Choose logging framework (Winston recommended)
2. Implement ILogger interface with Winston
3. Add log levels (error, warn, info, debug)
4. Replace all console.log with logger
5. Add --debug flag to CLI
6. Add --silent flag for JSON output mode
7. Log to file in production (~/.mailgoat/logs/)
8. Add log rotation (keep last 7 days)

**Acceptance Criteria:**
- ✅ Winston integrated
- ✅ No console.log in src/ code
- ✅ Log levels working
- ✅ --debug flag shows detailed logs
- ✅ --silent flag suppresses output
- ✅ Logs written to file
- ✅ Old logs auto-deleted

**Effort:** 6-8 hours

**Owner:** Developer 2

**Dependencies:** None (can start immediately)

**Deliverables:**
- Winston implementation
- Logger documentation
- Debug mode guide

---

## P1: High Priority (Needed for V1)

### 4. Complete Service Layer Migration

**Problem:** Services exist but commands bypass them, logic duplicated

**Impact:** MEDIUM - Hard to maintain, inconsistent behavior

**Solution:**
1. Move all business logic from commands to EmailService
2. Commands become thin wrappers (validation + service call + format)
3. Services handle all Postal interaction
4. Services testable independently of CLI

**Command Migration Pattern:**
```typescript
// BEFORE (fat command)
async execute(options) {
  const client = new PostalClient(config);
  const result = await client.sendMessage(...);
  // business logic here
}

// AFTER (thin command)
async execute(options) {
  const emailService = container.resolve(EmailService);
  const result = await emailService.send(...);
  return formatter.format(result);
}
```

**Acceptance Criteria:**
- ✅ All commands use services (no direct client calls)
- ✅ Business logic in services only
- ✅ Commands < 50 lines each
- ✅ Services fully tested
- ✅ Clear service responsibilities documented

**Effort:** 12-16 hours

**Owner:** Developer 1

**Dependencies:** DI migration complete

**Deliverables:**
- Migrated commands
- Service layer documentation
- Architectural boundary guide

---

### 5. Config Validation

**Problem:** Config loaded but not validated, runtime errors from bad config

**Impact:** MEDIUM - Poor user experience, hard to debug config issues

**Solution:**
1. Choose validation library (Zod recommended - better TypeScript support)
2. Define config schema
3. Validate on config load
4. Provide clear error messages
5. Add config migration for version changes

**Example:**
```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  postal: z.object({
    apiUrl: z.string().url(),
    apiKey: z.string().min(20),
    fromAddress: z.string().email(),
  }),
  profiles: z.record(z.object({
    // profile schema
  })).optional(),
});

// Validate
const config = ConfigSchema.parse(rawConfig);
```

**Acceptance Criteria:**
- ✅ Zod schemas defined
- ✅ Config validated on load
- ✅ Clear error messages for invalid config
- ✅ All fields validated
- ✅ Optional fields handled
- ✅ Migration guide for config changes

**Effort:** 4-6 hours

**Owner:** Developer 3

**Dependencies:** None (can start immediately)

**Deliverables:**
- Config validation
- Config schema documentation
- Migration guide

---

### 6. Async CLI Entry Point

**Problem:** bin/mailgoat.js is synchronous, blocks event loop

**Impact:** LOW - Performance issue, slow startup

**Solution:**
1. Make bin/mailgoat.js async
2. Use top-level await
3. Handle async errors properly
4. Graceful shutdown on signals

**Acceptance Criteria:**
- ✅ bin/mailgoat.js uses async/await
- ✅ No blocking operations in entry point
- ✅ Proper error handling
- ✅ SIGINT/SIGTERM handled
- ✅ Startup time improved

**Effort:** 2-3 hours

**Owner:** Developer 2

**Dependencies:** None

**Deliverables:**
- Async entry point
- Benchmarks showing improvement

---

### 7. API Documentation

**Problem:** No TSDoc comments, hard for agents to understand code

**Impact:** MEDIUM - Slows agent development, increases errors

**Solution:**
1. Add TSDoc comments to all public APIs
2. Generate documentation with TypeDoc
3. Publish to website or wiki
4. Keep docs updated via CI check

**Example:**
```typescript
/**
 * Sends an email via the configured mail provider
 * @param options - Email sending options
 * @param options.to - Recipient email addresses
 * @param options.subject - Email subject line
 * @param options.body - Email body content
 * @returns Promise resolving to send result
 * @throws {InvalidEmailError} If email address format is invalid
 * @throws {ProviderError} If mail provider API call fails
 */
async send(options: SendOptions): Promise<SendResult>
```

**Acceptance Criteria:**
- ✅ All public APIs documented
- ✅ TSDoc format followed
- ✅ TypeDoc generates clean docs
- ✅ Examples provided
- ✅ CI checks for missing docs

**Effort:** 4-6 hours

**Owner:** Developer 3

**Dependencies:** Complete service layer first

**Deliverables:**
- TSDoc comments
- Generated documentation
- Documentation site

---

## P2: Medium Priority (V1.1)

### 8. Cache Implementation

**Problem:** CacheManager exists but not used, repeated API calls

**Impact:** LOW - Performance could be better, but acceptable

**Solution:**
1. Integrate CacheManager with EmailService
2. Cache config in memory
3. Cache message metadata
4. Define cache TTL strategy
5. Add cache invalidation

**Effort:** 6-8 hours

**Owner:** Developer 2

**Defer to:** V1.1

---

### 9. Connection Pooling

**Problem:** New HTTP connection per request, inefficient

**Impact:** LOW - Performance impact is minor for CLI tool

**Solution:**
1. Configure axios HTTP agent
2. Set keepAlive: true
3. Define max sockets
4. Connection timeout configuration

**Effort:** 2-3 hours

**Owner:** Developer 2

**Defer to:** V1.1

---

### 10. Request Queue

**Problem:** No queuing for failed sends, no retry persistence

**Impact:** LOW - Reliability could be better for bulk operations

**Solution:**
1. Implement queue with Bull or BullMQ
2. Persist failed sends
3. Auto-retry with backoff
4. Status command to show queue

**Effort:** 8-12 hours

**Owner:** Developer 1

**Defer to:** V1.2

---

## P3: Low Priority (V2.0)

### 11. Plugin System

**Problem:** Hard to extend, no plugin architecture

**Impact:** LOW - Not needed for MVP

**Defer to:** V2.0

---

### 12. Multi-Provider Support

**Problem:** Only Postal supported

**Impact:** LOW - Abstraction exists, easy to add later

**Defer to:** V2.0 (add SendGrid, SMTP)

---

## Implementation Roadmap

### Week 1: Critical Path (P0)

**Monday-Tuesday:**
- Fix test infrastructure (QA + Dev 2) - 4-6 hours
- DI migration decision (Lead Engineer) - 2 hours
- Start logging implementation (Dev 2) - 3 hours

**Wednesday-Thursday:**
- Complete DI migration (Dev 1) - 8-12 hours
- Complete logging (Dev 2) - 3-5 hours
- Start config validation (Dev 3) - 4-6 hours

**Friday:**
- Testing and validation
- Documentation updates
- Launch readiness review

**Week 1 Deliverables:**
- ✅ All tests passing
- ✅ DI fully implemented
- ✅ Production logging working
- ✅ 60%+ test coverage

### Week 2: High Priority (P1)

**Monday-Wednesday:**
- Complete service layer migration (Dev 1) - 12-16 hours
- Complete config validation (Dev 3) - remaining time
- Async entry point (Dev 2) - 2-3 hours

**Thursday-Friday:**
- API documentation (Dev 3) - 4-6 hours
- Performance testing
- Final testing and validation

**Week 2 Deliverables:**
- ✅ Service layer complete
- ✅ Config validation working
- ✅ API docs published
- ✅ 80%+ test coverage
- ✅ Production ready

### Week 3+: Medium/Low Priority (P2/P3)

**V1.1 Release:**
- Cache implementation
- Connection pooling
- Performance optimizations

**V1.2 Release:**
- Request queue
- Bulk operations
- Advanced features

**V2.0 Release:**
- Plugin system
- Multi-provider support
- Advanced configuration

---

## Resource Allocation

| Developer | Week 1 Focus | Week 2 Focus |
|-----------|--------------|--------------|
| **QA** | Fix tests (primary) | Testing & validation |
| **Developer 1** | DI migration | Service layer migration |
| **Developer 2** | Logging + tests support | Async entry + cache (start) |
| **Developer 3** | Config validation | API docs |
| **Lead Engineer** | Architecture decisions, code reviews, unblocking |

---

## Risk Management

### High Risks

**Risk 1: Test Fixes Take Longer**
- **Mitigation:** Pair QA with Developer 2, escalate blockers
- **Contingency:** If >8 hours, consider switching to Vitest

**Risk 2: DI Migration Breaks Things**
- **Mitigation:** Do incrementally, test after each command
- **Contingency:** Can rollback to direct instantiation

**Risk 3: Team Overload**
- **Mitigation:** Clear priorities, Lead Engineer available
- **Contingency:** Cut P1 items to P2 if needed

### Medium Risks

**Risk 4: Config Validation Edge Cases**
- **Mitigation:** Start with simple schema, expand
- **Contingency:** Basic validation better than none

**Risk 5: Documentation Incomplete**
- **Mitigation:** Focus on critical APIs first
- **Contingency:** Can finish docs in V1.1

---

## Success Metrics

### Week 1 Goals

- ✅ All tests passing (0 failures)
- ✅ CI green checkmark
- ✅ Test coverage >60%
- ✅ All commands use DI
- ✅ Winston logging implemented
- ✅ No console.log in production code

### Week 2 Goals

- ✅ Test coverage >80%
- ✅ All commands <50 lines
- ✅ Config validation working
- ✅ API documentation published
- ✅ Performance benchmarks passing
- ✅ Production readiness checklist complete

### V1 Launch Criteria

- ✅ All P0 and P1 items complete
- ✅ Security audit passed
- ✅ Performance targets met
- ✅ Documentation complete
- ✅ Team sign-off

---

## Communication Plan

### Daily Standups (Async)

Each developer posts:
- What I completed yesterday
- What I'm working on today
- Any blockers

### Code Reviews

- All PRs need Lead Engineer approval
- Focus on pattern consistency
- Use review checklist (to be created)

### Blocker Escalation

- Post blocker immediately in task worklog
- Lead Engineer responds within 2 hours
- If critical, escalate to CEO

---

## Next Steps

### Immediate (Today)

1. **Lead Engineer:**
   - Review and approve this plan
   - Make DI migration decision
   - Create code review checklist

2. **QA:**
   - Start fixing test infrastructure
   - Document test failures
   - Create mocking guide outline

3. **Developer 2:**
   - Start logging implementation
   - Support QA with test fixes
   - Research Winston best practices

4. **Developer 1:**
   - Review DI migration scope
   - Plan command migration order
   - Prepare for DI work

5. **Developer 3:**
   - Research Zod validation
   - Review current config structure
   - Plan validation schema

---

## Conclusion

**Focus:** Complete what we started  
**Timeline:** 2 weeks to production ready  
**Risk:** Manageable with clear priorities  
**Confidence:** HIGH - Clear path, right team  

**Key Success Factors:**
1. Fix tests FIRST
2. Complete migrations, don't start new ones
3. Document patterns clearly
4. Maintain communication
5. Escalate blockers fast

**Lead Engineer commitment:** Available for reviews, unblocking, and architectural decisions throughout.

---

**Document Status:** APPROVED  
**Last Updated:** 2026-02-18  
**Next Review:** After Week 1 completion
