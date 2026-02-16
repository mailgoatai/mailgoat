# MailGoat Phase 2 Roadmap

**Product Lead:** @product-lead  
**Date:** 2026-02-16  
**Version:** v0.2 - v0.4  
**Timeline:** 3 months post-v0.1 launch

---

## Vision for Phase 2

**Goal:** Transform MailGoat from a functional MVP into a **production-ready, agent-first email platform** that delivers on our core promise: frictionless email for autonomous agents.

**Focus Areas:**
1. **Fix Critical Gaps** - Inbox listing, testing, polish
2. **Improve Developer Experience** - Better errors, docs, examples
3. **Enable Advanced Workflows** - Webhooks, search, automation
4. **Prepare for SaaS** - Backend infrastructure, self-registration

**Success Metrics:**
- Inbox functionality restored (webhook-based)
- 80%+ test coverage
- 50+ GitHub stars
- 10+ production users
- <5% error rate in production
- Average 4.5/5 stars in user feedback

---

## Feature Prioritization Framework

### Priority Levels

**P0 - Critical (Must-Have)**
- Blocks core use cases
- High user pain
- Breaks product promise
- Must ship in Phase 2

**P1 - High Value (Should-Have)**
- Significantly improves UX
- Common user request expected
- Competitive necessity
- Ship in Phase 2 if possible

**P2 - Nice-to-Have (Could-Have)**
- Improves experience
- Requested by power users
- Can defer to v0.3-v0.4

**P3 - Future (Won't-Have in Phase 2)**
- SaaS-specific features
- Enterprise requirements
- Deferred to Phase 3

---

## Phase 2 Features

### P0 - Critical Features (Must Ship)

#### 1. Inbox Listing via Webhooks

**Priority:** P0  
**Complexity:** LARGE (8-12 hours)  
**Owner:** Developer 1 or 3  
**Dependencies:** None  
**Target:** v0.2.0 (Week 1-2)

**Problem:**
Users cannot list their inbox because Postal's Legacy API lacks `/messages/list`. This breaks a core use case: "check my email."

**User Story:**
> As an agent, I want to list my inbox messages so I can process incoming emails programmatically.

**Proposed Solution:**
Implement webhook-based message delivery with local cache.

**Implementation:**
1. **Webhook Setup Command:**
   ```bash
   mailgoat webhook add https://agent.example.com/inbox
   mailgoat webhook list
   mailgoat webhook remove <webhook-id>
   ```

2. **Local Message Cache:**
   - Store received messages in `~/.mailgoat/inbox/`
   - SQLite database for metadata (from, subject, received_at)
   - Message files as JSON

3. **Updated Inbox Command:**
   ```bash
   mailgoat inbox              # List cached messages
   mailgoat inbox --unread     # Filter unread
   mailgoat inbox --since 24h  # Time filter
   mailgoat inbox --sync       # Force sync from Postal
   ```

4. **Background Sync:**
   - Optional daemon: `mailgoat inbox --daemon`
   - Polls Postal periodically, updates cache
   - Systemd service integration

**Acceptance Criteria:**
- ✅ Webhook setup command works
- ✅ Messages delivered to webhook are cached
- ✅ `mailgoat inbox` lists cached messages
- ✅ Filters (unread, time range) work correctly
- ✅ `mailgoat read` integrates with cache
- ✅ Documentation complete
- ✅ Tests cover webhook flow

**Success Metrics:**
- Users can list inbox within 5 seconds
- Webhook delivery <1 second latency
- Zero message loss in cache

---

#### 2. Complete Test Coverage (80%)

**Priority:** P0  
**Complexity:** MEDIUM (8-10 hours)  
**Owner:** Developer 2  
**Dependencies:** CI fixes complete  
**Target:** v0.2.0 (Week 2-3)

**Problem:**
Current coverage ~40%. Low confidence in refactors, harder to catch regressions.

**User Story:**
> As a developer, I want high test coverage so I can refactor safely and catch bugs early.

**Proposed Solution:**
Add unit tests for all untested code.

**Implementation:**
1. **Command Tests:**
   - Unit tests for send, read, delete, search, template, health
   - Mock EmailService, ProviderFactory
   - Test arg parsing, validation, output formatting

2. **Service Tests:**
   - EmailService tests (mock provider)
   - ConfigService tests (mock fs)
   - CacheManager tests (TTL, expiration)

3. **Provider Tests:**
   - PostalProvider tests (mock axios)
   - ProviderFactory tests

4. **Integration Tests:**
   - End-to-end workflows
   - Error scenarios
   - Retry logic

**Acceptance Criteria:**
- ✅ 80%+ line coverage
- ✅ 70%+ branch coverage
- ✅ All commands have unit tests
- ✅ All services have unit tests
- ✅ CI reports coverage
- ✅ Coverage badge in README

**Success Metrics:**
- Coverage increases from 40% to 80%
- CI catches regressions before merge
- <2% test flakiness

---

#### 3. Integrate Service Layer

**Priority:** P0  
**Complexity:** MEDIUM (8-10 hours)  
**Owner:** Developer 1  
**Dependencies:** CI fixes complete  
**Target:** v0.2.0 (Week 3-4)

**Problem:**
Service layer (EmailService, ValidationService, ConfigService) is implemented but commands still call PostalClient directly. Missing benefits of abstraction.

**User Story:**
> As a developer, I want commands to use the service layer so testing is easier and code is cleaner.

**Proposed Solution:**
Refactor all commands to use service layer.

**Implementation:**
1. **Update Send Command:**
   ```typescript
   // Before:
   const client = new PostalClient(config);
   await client.sendMessage(params);
   
   // After:
   const provider = ProviderFactory.createFromConfig(config);
   const emailService = new EmailService(provider);
   await emailService.sendEmail(options);
   ```

2. **Update Read Command:**
   - Use `emailService.readEmail(id)`

3. **Update Delete Command:**
   - Use `emailService.deleteEmail(id)` (when implemented)

4. **Update Config Commands:**
   - Use `configService.load()`, `configService.save()`

5. **Add Dependency Injection:**
   - Optional: Set up TSyringe container
   - Or: Manual injection for now

**Acceptance Criteria:**
- ✅ All commands use service layer
- ✅ PostalClient only accessed via services
- ✅ Commands are thin (< 100 lines each)
- ✅ Tests use service mocks
- ✅ Backward compatibility maintained

**Success Metrics:**
- Command files reduced by 30%+ lines
- Test setup time reduced by 50%
- Zero breaking changes

---

### P1 - High Value Features (Should Ship)

#### 4. Multi-Profile Support

**Priority:** P1  
**Complexity:** SMALL (4-6 hours)  
**Owner:** Developer 2  
**Dependencies:** ConfigService complete  
**Target:** v0.2.0 (Week 3-4)

**Problem:**
Users with multiple Postal servers or accounts can't easily switch contexts.

**User Story:**
> As an agent with multiple email accounts, I want to switch profiles easily so I can send from different addresses.

**Proposed Solution:**
Add `--profile` global flag and profile management commands.

**Implementation:**
1. **Global Profile Flag:**
   ```bash
   mailgoat send --profile staging --to user@example.com ...
   mailgoat inbox --profile production
   ```

2. **Profile Management Commands:**
   ```bash
   mailgoat profile list
   mailgoat profile create staging --copy-from default
   mailgoat profile show staging
   mailgoat profile delete old
   mailgoat profile set-default production
   ```

3. **Environment Override:**
   ```bash
   export MAILGOAT_PROFILE=staging
   mailgoat send ...  # Uses staging profile
   ```

**Acceptance Criteria:**
- ✅ `--profile` flag works on all commands
- ✅ Profile management commands work
- ✅ Environment variable works
- ✅ Config stored in `~/.mailgoat/profiles/`
- ✅ Documentation updated
- ✅ Examples provided

**Success Metrics:**
- Users can create profiles in <1 minute
- Zero config file corruption
- Profile switching <100ms

---

#### 5. Better Error Messages

**Priority:** P1  
**Complexity:** SMALL (4-6 hours)  
**Owner:** Developer 3  
**Dependencies:** None  
**Target:** v0.2.0 (Week 4)

**Problem:**
Some errors are technical (ECONNREFUSED) instead of user-friendly.

**User Story:**
> As a user troubleshooting issues, I want clear error messages with actionable suggestions.

**Proposed Solution:**
Review all error paths, improve messages with context and solutions.

**Implementation:**
1. **Network Errors:**
   ```
   Before: ECONNREFUSED 127.0.0.1:5000
   After:  Cannot connect to Postal server at http://postal.example.com
           
           Possible causes:
           - Postal server is not running
           - Incorrect server URL in config
           - Firewall blocking connection
           
           Try:
           - Check server status: docker ps
           - Verify config: mailgoat config show
           - Test connectivity: curl http://postal.example.com
   ```

2. **Authentication Errors:**
   ```
   Before: 401 Unauthorized
   After:  Authentication failed with Postal server
           
           Your API key may be invalid or expired.
           
           Try:
           - Verify API key in Postal web UI
           - Update config: mailgoat config init
           - Check key permissions
   ```

3. **Validation Errors:**
   ```
   Before: Invalid email format
   After:  Invalid recipient email: "user@"
           
           Email addresses must include a domain.
           Example: user@example.com
   ```

**Acceptance Criteria:**
- ✅ All errors have user-friendly messages
- ✅ Errors include possible causes
- ✅ Errors suggest solutions
- ✅ Technical details in --debug mode
- ✅ Exit codes documented

**Success Metrics:**
- Support requests for "confusing errors" drop by 50%
- Error message clarity rated 4+/5
- Users resolve 80% of errors without help

---

#### 6. Search Implementation

**Priority:** P1  
**Complexity:** MEDIUM (6-8 hours)  
**Owner:** Developer 3  
**Dependencies:** Inbox cache complete  
**Target:** v0.3.0 (Month 2)

**Problem:**
Search command exists but doesn't work (awaiting Postal API).

**User Story:**
> As an agent processing emails, I want to search my inbox so I can find specific messages quickly.

**Proposed Solution:**
Implement search over local inbox cache.

**Implementation:**
1. **Search Index:**
   - SQLite FTS (Full-Text Search) on message cache
   - Index: from, to, subject, body

2. **Search Queries:**
   ```bash
   mailgoat search --from user@example.com
   mailgoat search --subject "invoice"
   mailgoat search --body "urgent" --has-attachment
   mailgoat search --after 2024-01-01 --before 2024-12-31
   ```

3. **Search Results:**
   - Table format (default)
   - JSON format (--json)
   - Pagination (--limit, --offset)
   - Sorting (--sort date/from/subject)

**Acceptance Criteria:**
- ✅ Search over all cached messages
- ✅ All filter options work
- ✅ Full-text search on body
- ✅ Results < 1 second for 10k messages
- ✅ Documentation complete

**Success Metrics:**
- Search accuracy >95%
- Search latency <500ms for 90th percentile
- Users find messages 5x faster than manual scrolling

---

### P2 - Nice-to-Have Features

#### 7. Attachment Validation & Testing

**Priority:** P2  
**Complexity:** SMALL (2-3 hours)  
**Owner:** QA (when available)  
**Dependencies:** Postal instance available  
**Target:** v0.3.0

**Problem:**
Attachment support exists but untested with real Postal.

**User Story:**
> As a user sending attachments, I want confidence they'll arrive correctly.

**Implementation:**
1. Integration tests with real Postal
2. Test various file types (PDF, images, CSV)
3. Test size limits
4. Validate MIME types
5. Test base64 encoding

**Acceptance Criteria:**
- ✅ Attachments <10MB work reliably
- ✅ Common MIME types supported
- ✅ Error for oversized attachments
- ✅ Tests cover edge cases

---

#### 8. Documentation Consolidation

**Priority:** P2  
**Complexity:** SMALL (4 hours)  
**Owner:** DevRel (when onboarded) or Product Lead  
**Dependencies:** None  
**Target:** v0.3.0

**Problem:**
Docs scattered across files, no clear getting-started path.

**Implementation:**
1. **Getting Started Guide:** (docs/getting-started.md)
   - Step-by-step from zero to first email
   - Screenshots/GIFs
   - Common pitfalls

2. **Troubleshooting Guide:** (docs/troubleshooting.md)
   - Consolidate all error solutions
   - FAQ section
   - Support channels

3. **Self-Hosting Guide:** (docs/self-hosting.md)
   - Postal setup
   - DNS configuration
   - Security best practices

4. **API Reference:** (docs/api-reference.md)
   - All commands
   - All options
   - Examples for each

**Acceptance Criteria:**
- ✅ Users can go from zero to first email in <10 minutes
- ✅ Troubleshooting guide covers 90% of issues
- ✅ Docs rated 4+/5 for clarity

---

#### 9. Template Variables from Files

**Priority:** P2  
**Complexity:** SMALL (2-3 hours)  
**Owner:** Developer 3  
**Dependencies:** None  
**Target:** v0.3.0

**Problem:**
Template variables must be passed on command line, awkward for many variables.

**User Story:**
> As an agent using templates with many variables, I want to pass variables from a file.

**Implementation:**
```bash
# Pass variables from JSON file
mailgoat send --template welcome --vars-file data.json

# data.json:
{
  "name": "John",
  "company": "Acme Corp",
  "role": "Developer",
  "start_date": "2024-02-01"
}

# Or from environment
mailgoat send --template welcome --vars-env
# Reads from MAILGOAT_VAR_NAME, MAILGOAT_VAR_COMPANY, etc.
```

**Acceptance Criteria:**
- ✅ `--vars-file` flag works
- ✅ `--vars-env` flag works
- ✅ Merges with `--var` flags (CLI takes precedence)
- ✅ Validation for missing required variables

---

#### 10. Batch Send Command

**Priority:** P2  
**Complexity:** MEDIUM (4-6 hours)  
**Owner:** Developer 1  
**Dependencies:** None  
**Target:** v0.3.0

**Problem:**
Sending to many recipients requires loop in shell script.

**User Story:**
> As an agent sending notifications to many users, I want to batch send efficiently.

**Implementation:**
```bash
# Send to list of recipients
mailgoat send-batch --template notification \
  --recipients-file emails.txt \
  --vars-file data.csv

# emails.txt:
user1@example.com
user2@example.com
user3@example.com

# data.csv:
email,name,amount
user1@example.com,Alice,100
user2@example.com,Bob,200
user3@example.com,Charlie,150

# Sends personalized email to each
```

**Features:**
- CSV/JSON input for recipient data
- Template variable per-recipient customization
- Rate limiting (--max-rate 10/min)
- Progress bar
- Error handling (continue on failure)
- Report (successful/failed sends)

**Acceptance Criteria:**
- ✅ Batch send to 100+ recipients
- ✅ Per-recipient customization works
- ✅ Rate limiting prevents throttling
- ✅ Progress visible
- ✅ Errors don't stop batch

---

### P3 - Future Features (Phase 3)

#### 11. Self-Registration & SaaS Backend

**Priority:** P3  
**Complexity:** LARGE (20-30 hours)  
**Target:** Phase 3 (post-v0.4)

- Self-service account creation
- MailGoat backend service
- Managed Postal instances
- Usage-based billing

#### 12. Advanced Webhooks

**Priority:** P3  
**Complexity:** MEDIUM (8-12 hours)  
**Target:** Phase 3

- Delivery status webhooks
- Click/open tracking
- Bounce handling
- Complaint handling

#### 13. Email Templates Gallery

**Priority:** P3  
**Complexity:** MEDIUM (6-8 hours)  
**Target:** Phase 3

- Pre-built templates
- Template marketplace
- Community templates

#### 14. Multi-Sender Support

**Priority:** P3  
**Complexity:** SMALL (3-4 hours)  
**Target:** Phase 3

- Multiple from addresses per profile
- Sender verification workflow

---

## Implementation Timeline

### Week 1-2 (v0.2.0 Alpha)

**Focus:** Fix critical gaps

- 🎯 Inbox webhook implementation (Developer 1)
- 🎯 Complete test coverage (Developer 2)
- 🎯 Service layer integration (Developer 1)

**Outcome:** Core functionality fully working

### Week 3-4 (v0.2.0 Beta)

**Focus:** Polish & usability

- 🎯 Multi-profile support (Developer 2)
- 🎯 Better error messages (Developer 3)
- 🎯 Documentation review (Product Lead)

**Outcome:** Production-ready v0.2.0

### Month 2 (v0.3.0)

**Focus:** Advanced features

- 🎯 Search implementation (Developer 3)
- 🎯 Attachment testing (QA)
- 🎯 Documentation consolidation (DevRel)
- 🎯 Template improvements (Developer 3)

**Outcome:** Feature-rich, well-documented

### Month 3 (v0.4.0)

**Focus:** Developer experience

- 🎯 Batch send (Developer 1)
- 🎯 Advanced templating (Developer 3)
- 🎯 Performance optimization (Developer 2)
- 🎯 Video tutorials (DevRel)

**Outcome:** Best-in-class DX

---

## Success Metrics

### User Adoption
- 100+ GitHub stars by end of Phase 2
- 25+ production users
- 5+ community contributions
- 10+ Hacker News upvotes

### Product Quality
- <5% error rate in production
- >95% webhook delivery success
- <1 second command latency (p50)
- 80%+ test coverage maintained

### User Satisfaction
- 4.5+/5 average rating
- <10% support ticket rate
- >80% feature completion (users get what they need)
- >60% retention (users keep using it)

### Developer Experience
- <10 minutes zero to first email
- <5 minutes to understand docs
- <2 hours to contribute first PR
- >90% of issues resolved in docs/troubleshooting

---

## Dependencies & Risks

### External Dependencies

**Postal API:**
- **Risk:** Postal adds rate limiting
- **Mitigation:** Implement client-side rate limiting, backoff
- **Contingency:** Fork Postal, maintain our own

**Webhook Infrastructure:**
- **Risk:** Webhook delivery failures
- **Mitigation:** Retry logic, queue system
- **Contingency:** Fallback to polling mode

### Internal Dependencies

**CI/CD:**
- **Risk:** CI stays broken, blocks Phase 2
- **Mitigation:** Assign dedicated developer, 1-2 day deadline
- **Contingency:** Manual testing + review process

**Postal Test Instance:**
- **Risk:** No test environment, can't validate
- **Mitigation:** Set up Docker-based test Postal
- **Contingency:** Use production carefully with rollback plan

---

## Open Questions

1. **Inbox Cache Size:** How many messages to cache? (Proposal: 1000 most recent)
2. **Webhook Security:** HMAC signing for webhook payloads? (Proposal: Yes, optional)
3. **Search Indexing:** Index all messages or recent only? (Proposal: Last 10k messages)
4. **Profile Switching:** Default profile or always explicit? (Proposal: Default with override)
5. **Batch Rate Limits:** What's safe default? (Proposal: 10 emails/min)

---

## Conclusion

Phase 2 focuses on **delivering on core promises** (inbox listing), **achieving production quality** (testing, polish), and **enabling advanced workflows** (search, profiles, batch operations).

**Timeline:** 3 months  
**Effort:** ~80-100 developer-hours  
**Outcome:** Production-ready, feature-complete v0.4.0

**Key Milestones:**
- v0.2.0 (Month 1): Inbox working, tests complete, service layer integrated
- v0.3.0 (Month 2): Search, docs, attachments validated
- v0.4.0 (Month 3): Batch operations, advanced features

**Resource Needs:**
- 3 developers (current team sufficient)
- 1 QA engineer (once Postal available)
- 1 DevRel (for docs, community)

---

**Prepared by:** @product-lead  
**Status:** Ready for CEO/Lead Engineer review  
**Next:** Create engineering-priorities.md and product-briefing.md
