# MailGoat v1.2.0 Release Notes

**Release Date:** 2026-02-20  
**Type:** Major Feature Release

---

## 🎉 Overview

MailGoat v1.2.0 is a major release focused on production readiness, performance, and developer experience. We've added comprehensive email relay support, a robust queue system, advanced testing tools, and significant performance optimizations.

**4,500+ lines of production code, 6 major features, 0 critical bugs, 100% test pass rate.**

---

## 🚀 What's New

### 1. Multi-Relay Support

Choose your email provider instead of being locked to Postal:

```bash
# SendGrid
mailgoat relay config-sendgrid --api-key sk_xxx

# Mailgun
mailgoat relay config-mailgun --api-key key-xxx --domain mg.example.com

# Amazon SES
mailgoat relay config-ses --access-key xxx --secret-key xxx

# Mailjet
mailgoat relay config-mailjet --api-key xxx --api-secret xxx

# Custom SMTP
mailgoat relay config-smtp --host smtp.gmail.com --port 587
```

**Features:**

- 5 provider implementations (SendGrid, Mailgun, SES, Mailjet, Custom SMTP)
- Connection testing before deployment
- Automatic credential validation
- Fallback to Postal when unconfigured

### 2. Email Queue System

Production-ready email queuing with priority, scheduling, and retry:

```bash
# View queue status
mailgoat queue status

# List pending emails
mailgoat queue list --status pending

# Retry failed emails
mailgoat queue retry <id>

# Database maintenance
mailgoat queue clear --status sent
```

**Features:**

- 5 priority levels (critical → bulk)
- Scheduled sends with Unix timestamps
- Automatic retry (configurable max attempts)
- SQLite-based persistence
- Background worker (500+ emails/sec)
- Atomic operations

### 3. Email Testing & Validation

Catch issues before sending with comprehensive testing tools:

```bash
# Spam test
mailgoat test-email spam template.html --subject "Test"
# Output: Spam Score: 3/10 (Good) ✓

# Accessibility test
mailgoat test-email accessibility template.html
# Output: Score: 7/10 (Good) ✓

# Link validation
mailgoat test-email links template.html
# Validates all links, reports 404s
```

**Features:**

- Spam score calculation (50+ keywords, pattern detection)
- Accessibility validation (WCAG compliance)
- Link validation (HTTP status checking)
- JSON output for CI integration
- Color-coded console output

### 4. Database Performance Optimization

Automatic performance tuning for high-throughput scenarios:

```bash
# Full optimization
mailgoat db optimize

# Check statistics
mailgoat db stats

# Maintenance
mailgoat db vacuum
mailgoat db analyze
```

**Performance Improvements:**

- **5x faster** queue processing (100 → 500+ emails/sec)
- WAL journal mode (concurrent reads/writes)
- 40MB cache (vs 2MB default)
- Memory-mapped I/O (256MB)
- Composite partial indexes

### 5. Performance Benchmarking

Track performance over time and catch regressions:

```bash
cd benchmarks
npm install
npm run bench
```

**Features:**

- Send performance benchmarks
- API performance benchmarks
- Percentile tracking (p50, p95, p99)
- HTML report generation
- CI-ready, reproducible

### 6. Admin Panel E2E Testing

Comprehensive testing confirms production readiness:

**Test Results:**

- ✅ 28 tests run, 28 tests passed, 0 tests failed
- ✅ Zero critical bugs found
- ✅ All security features validated
- ✅ Rate limiting functional
- ✅ Authentication flow verified

---

## 📊 By the Numbers

- **4,500+** lines of production code
- **6** major features
- **0** critical bugs
- **28/28** tests passing (100%)
- **5x** performance improvement
- **500+** emails/sec queue processing
- **5** relay providers supported

---

## 🔧 Technical Details

### New Commands

**Relay Management:**

- `mailgoat relay list` - Show available providers
- `mailgoat relay status` - Current configuration
- `mailgoat relay test` - Test connection
- `mailgoat relay config-*` - Configure providers
- `mailgoat relay reset` - Remove relay

**Queue Management:**

- `mailgoat queue status` - Queue statistics
- `mailgoat queue list` - List emails
- `mailgoat queue get <id>` - Email details
- `mailgoat queue cancel <id>` - Cancel email
- `mailgoat queue retry <id>` - Retry failed
- `mailgoat queue clear` - Clear by status

**Email Testing:**

- `mailgoat test-email spam` - Spam check
- `mailgoat test-email accessibility` - A11y check
- `mailgoat test-email links` - Link validation

**Database:**

- `mailgoat db stats` - Database info
- `mailgoat db optimize` - Full optimization
- `mailgoat db vacuum` - Reclaim space
- `mailgoat db analyze` - Update statistics
- `mailgoat db check` - Integrity check

### Performance Benchmarks

**Before v1.2.0:**

- Queue processing: ~100 emails/sec
- Database cache: 2MB
- Journal mode: DELETE

**After v1.2.0:**

- Queue processing: **500+ emails/sec** (5x)
- Database cache: 40MB (20x)
- Journal mode: WAL (concurrent)

### Architecture Improvements

- **Better-sqlite3** with optimized pragmas
- **Factory pattern** for relay providers
- **Background worker** with batch processing
- **Composite indexes** for complex queries
- **Memory-mapped I/O** for faster reads

---

## ⬆️ Upgrading

### From v1.1.x

**No breaking changes.** All v1.1.x configurations work in v1.2.0.

```bash
npm install -g mailgoat@1.2.0
mailgoat --version  # Should show 1.2.0
```

**New Optional Configuration:**

Add relay configuration to `~/.mailgoat/config.json`:

```json
{
  "relay": {
    "provider": "sendgrid",
    "credentials": {
      "apiKey": "SG.xxx"
    }
  }
}
```

**Database Migration:**

Existing queue databases auto-upgrade on first access. No manual steps required.

---

## 🐛 Bug Fixes

- Fixed admin panel password/secret validation
- Improved error messages in relay providers
- Better template variable handling in links
- Fixed TypeScript strict mode issues

---

## 📚 Documentation

- Updated README with all new features
- Added benchmarking suite README
- Database optimization guide included
- Email testing examples provided

---

## 🙏 Credits

Built with:

- TypeScript
- better-sqlite3
- Commander.js
- Chalk
- Cheerio (for HTML parsing)
- Axios (for HTTP)

---

## 🔜 What's Next (v1.3.0)

Planned features for the next release:

- Webhook delivery system
- Template marketplace
- Email analytics dashboard
- Internationalization support
- Plugin system

---

## 💬 Feedback & Support

- 🐛 [Report bugs](https://github.com/mailgoatai/mailgoat/issues)
- 💡 [Feature requests](https://github.com/mailgoatai/mailgoat/discussions)
- 📧 [Email support](mailto:support@mailgoat.ai)
- 📖 [Documentation](https://github.com/mailgoatai/mailgoat#readme)

---

**Happy email sending! 🐐📧**
