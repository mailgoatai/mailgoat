# Changelog

All notable changes to MailGoat will be documented in this file.

## [1.2.0] - 2026-02-20

### 🚀 Major Features

**Relay Configuration System**
- Multi-provider email relay support (SendGrid, Mailgun, Amazon SES, Mailjet, custom SMTP)
- Provider factory with automatic routing
- Connection testing and validation
- CLI commands for configuration (`mailgoat relay`)
- Fallback to Postal when no relay configured

**Email Queue Management**
- SQLite-based persistent queue
- Priority levels: critical, high, normal, low, bulk
- Scheduled email delivery with Unix timestamps
- Automatic retry with configurable max attempts
- Background worker with batch processing
- Queue management CLI (`mailgoat queue`)
- Statistics and monitoring

**Email Testing & Validation Tools**
- Spam score checker (keyword detection, pattern matching, link/text ratio)
- Accessibility validator (alt text, semantic HTML, WCAG compliance)
- Link validator (HTTP status checking, redirect detection)
- CLI commands (`mailgoat test-email`)
- JSON output for CI integration

**Database Performance Optimization**
- Auto-tuning on initialization (WAL mode, 40MB cache, memory-mapped I/O)
- Optimized indexing (composite partial indexes)
- Database maintenance commands (`mailgoat db`)
- >500 emails/sec queue processing
- VACUUM, ANALYZE, integrity checking

**Performance Benchmarking Suite**
- Send performance benchmarks
- API performance benchmarks
- Percentile tracking (p50, p95, p99)
- HTML report generation
- CI-ready

### ✅ Testing & Quality

**Admin Panel E2E Testing**
- 28 comprehensive tests (100% pass rate)
- Authentication flow testing
- Security validation
- Rate limiting verification
- Zero critical bugs found

### 🔧 Improvements

- Better error messages throughout
- Improved logging and debugging
- Enhanced security headers
- Optimized memory usage
- Faster startup times

### 📚 Documentation

- Updated README with new features
- Added benchmarking suite documentation
- Database optimization guide
- Email testing tool examples

### 🐛 Bug Fixes

- Fixed admin panel startup validation
- Improved error handling in relay providers
- Better template variable handling

### ⚡ Performance

- Queue processing: >500 emails/sec (5x improvement)
- Database queries: Optimized with composite indexes
- Memory usage: Reduced with better caching
- Startup time: <1s with auto-tuning

### 📊 Stats

- **4,500+ lines** of production code added
- **6 major features** delivered
- **0 critical bugs** in testing
- **28/28 tests** passing

### ⬆️ Upgrading from v1.1.x

No breaking changes. All v1.1.x configurations are compatible with v1.2.0.

**New Optional Configuration:**

```json
{
  "relay": {
    "provider": "sendgrid",
    "credentials": {
      "apiKey": "..."
    }
  }
}
```

**New Commands:**
- `mailgoat relay` - Relay configuration and testing
- `mailgoat queue` - Queue management
- `mailgoat test-email` - Email validation
- `mailgoat db` - Database maintenance

**Database Migration:**

Existing queue databases will auto-upgrade on first run. No manual migration needed.

---

## [1.1.8] - 2026-02-19

### Fixed
- CLI version display bug (now reads from package.json)
- CHANGELOG formatting and completeness

### Documentation
- Published comprehensive release on GitHub
- Updated PUBLISH_INSTRUCTIONS.md
- Created RELEASE_STATUS.md

---

## [1.1.7] - 2026-02-15

### Added
- Admin panel web interface
- Docker Compose templates
- Analytics infrastructure

---

## [1.1.0] - [Previous releases]

See git history for earlier releases.
