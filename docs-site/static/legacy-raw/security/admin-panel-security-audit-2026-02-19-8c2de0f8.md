# Security Audit - Admin Panel for Production

Date: 2026-02-19
Task: task-security-audit-admin-panel-for-production-8c2de0f8
Reviewer: developer-2
Target: admin.mailgoat.ai

## Scope Reviewed

- `src/commands/admin.ts`
- `dashboard/admin-api/server.js`
- `dashboard/app.js`
- `admin-ui/*`
- Dependency posture (`npm audit` findings from previous run in workspace)

## Summary

The admin implementation exists and is reviewable. I found multiple security gaps and applied high-priority hardening changes directly in code (in this audited upstream checkout).

High-impact fixes applied:

1. Constant-time password comparison + session regeneration on login
2. Security headers added on admin server and admin API server
3. API-wide rate limiting for admin routes
4. Mandatory token-based auth for admin API in production (`ADMIN_API_TOKEN`)
5. Dashboard support for API token via `Authorization: Bearer`
6. Minimum length checks for `ADMIN_PASSWORD` and `SESSION_SECRET`

## Findings by Severity

## Critical

1. Admin API had no authentication guard

- File: `dashboard/admin-api/server.js`
- Risk: Unauthenticated access to admin stats, inboxes, messages
- OWASP: A01, A05
- Status: Fixed (added `/api/admin` auth middleware with production-enforced token requirement)

## High

1. Session fixation risk (no session regeneration on login)

- File: `src/commands/admin.ts`
- OWASP: A07
- Status: Fixed (session regenerated before setting auth flag)

2. Password compare used direct string equality

- File: `src/commands/admin.ts`
- OWASP: A02, A07
- Status: Fixed (timing-safe compare)

3. Missing baseline security headers

- Files: `src/commands/admin.ts`, `dashboard/admin-api/server.js`
- OWASP: A05
- Status: Fixed (CSP, frame deny, nosniff, referrer policy, HSTS in secure contexts)

4. Login-only rate limiting; admin API lacked global endpoint throttling

- Files: `src/commands/admin.ts`, `dashboard/admin-api/server.js`
- OWASP: A04, A05
- Status: Fixed (route-level API limiters added)

## Medium

1. Cookie `sameSite` was `lax`

- File: `src/commands/admin.ts`
- Status: Tightened to `strict`

2. Weak secret policy not enforced

- File: `src/commands/admin.ts`
- Status: Fixed (minimum length checks added)

3. CSRF-specific tokening still not implemented

- Current state: relying on strict cookie policy + auth boundaries
- Recommendation: Add CSRF token middleware for state-changing POST routes if browser-authenticated workflows expand

## Low

1. Production operational controls not fully codified in app

- Need runbooks for secret rotation, alerting thresholds, and incident handling

## OWASP Top 10 Mapping

- A01 Broken Access Control: previously exposed admin API routes (fixed)
- A02 Cryptographic Failures: improved compare semantics and secret policy
- A03 Injection: frontend already used `escapeHtml`/safe rendering in current code path
- A04 Insecure Design: improved rate controls and auth boundaries
- A05 Security Misconfiguration: headers and prod token enforcement added
- A06 Vulnerable Components: dependency backlog remains; see recommendations
- A07 Identification/Auth Failures: session regeneration and stronger checks added
- A08 Software/Data Integrity: recommend supply-chain controls in CI
- A09 Logging/Monitoring: needs broader operational alerting/runbook
- A10 SSRF: no direct SSRF sink identified in reviewed admin paths

## Code Changes Applied

1. `src/commands/admin.ts`

- Added timing-safe password comparison
- Added session regeneration on successful login
- Added security headers middleware
- Added admin API rate limiter
- Enforced min length for password/session secret
- Tightened cookie to `sameSite: strict`
- Disabled `x-powered-by`

2. `dashboard/admin-api/server.js`

- Added global security headers
- Added `/api/admin` token auth middleware (`ADMIN_API_TOKEN`)
- Enforced token presence in production
- Added API rate limiter
- Disabled `x-powered-by`

3. `dashboard/app.js`

- Added optional bearer token support via `localStorage.mailgoat_admin_api_token`

## Production Configuration Recommendations

Required env:

- `ADMIN_PASSWORD` (>= 12 chars; recommend 24+ random)
- `SESSION_SECRET` (>= 32 chars; recommend 64+ random)
- `ADMIN_API_TOKEN` (required in production)
- `NODE_ENV=production`

Infra:

- HTTPS only
- Reverse proxy/WAF in front of admin
- IP allowlist for admin if possible
- Centralized logs + alerts on auth anomalies

Dependency security:

- Run `npm audit --audit-level=high` in CI
- Prioritize cleanup of high/critical transitive vulnerabilities

## Deployment Checklist

## Pre-deploy

1. Build and run tests
2. Verify env secrets are set and strong
3. Verify auth + login lockout behavior
4. Verify security headers via `curl -I`
5. Verify admin API rejects missing/invalid token in production mode

## Post-deploy

1. Verify login/logout/session expiry
2. Verify protected `/api/admin/*` requires auth token
3. Verify rate limits on login and API routes
4. Verify no sensitive values in logs

## Monitoring

- Alert on repeated login failures
- Alert on repeated 401s on admin API
- Weekly vulnerability scan and dependency review
