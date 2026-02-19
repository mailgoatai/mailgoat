# Admin Panel Deployment Guide

**Last Updated:** 2026-02-19  
**Status:** ⚠️ Backend Ready, Frontend Needs Fixes

## Overview

The MailGoat admin panel is a React + Express application that provides a web interface for managing emails, viewing inboxes, and monitoring system status.

## Architecture

```
mailgoat admin serve
  ↓
Express Server (src/commands/admin.ts)
  ├── Static Files: admin-ui/dist/ (React app)
  ├── API Routes: /api/admin/* (authenticated)
  └── Auth: /admin/login, /admin/logout
```

## Current Status

### ✅ Backend Complete
- **Express server:** Fully implemented in `src/commands/admin.ts`
- **Security hardening:** Applied (timing-safe password compare, rate limiting, security headers)
- **API endpoints:** Status endpoint implemented
- **Session management:** express-session with secure cookies
- **Authentication:** Password-based with regeneration on login
- **Build scripts:** Available in `package.json`

### ⚠️ Frontend Needs Fixes
- **React app:** Scaffolding exists in `admin-ui/`
- **Build:** Currently failing with TypeScript errors
- **Issues:**
  - `status-badge.tsx`: Variant prop type error
  - `use-status.ts`: Undefined type error
- **Next step:** Fix TypeScript errors, then rebuild

## Prerequisites

- Node.js 18+
- Admin password (12+ characters)
- Session secret (32+ characters)

## Build Process

### 1. Install Dependencies

```bash
cd mailgoat

# Install root dependencies
npm install

# Install admin UI dependencies
npm run admin:ui:install
# OR: cd admin-ui && npm install
```

### 2. Fix TypeScript Errors (Required)

Current errors to fix:

**File:** `admin-ui/src/components/common/status-badge.tsx`
```typescript
// Error: Property 'variant' does not exist
// Fix: Add proper type definition or use className
```

**File:** `admin-ui/src/features/dashboard/hooks/use-status.ts`
```typescript
// Error: Type 'undefined' not assignable to 'StatusData | null'
// Fix: Handle undefined case properly
```

### 3. Build Frontend

```bash
# From mailgoat root
npm run admin:ui:build

# OR from admin-ui directory
cd admin-ui
npm run build
```

**Output:** Creates `admin-ui/dist/` with built React app

### 4. Verify Build

```bash
ls -la admin-ui/dist/
# Should see: index.html, assets/, etc.
```

## Running Locally

### Development Mode

**Terminal 1 - Frontend Dev Server:**
```bash
cd admin-ui
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd ..
export ADMIN_PASSWORD="your-secure-password-here"
export SESSION_SECRET="your-random-32-char-secret-here"
npm run admin:serve
# Runs on http://127.0.0.1:3001
```

### Production Mode

```bash
# Build frontend first
npm run admin:ui:build

# Run admin server
export ADMIN_PASSWORD="your-secure-password-here"
export SESSION_SECRET="your-random-32-char-secret-here"
mailgoat admin serve --port 3001
```

## Environment Variables

### Required

- **`ADMIN_PASSWORD`**: Admin login password (min 12 characters)
- **`SESSION_SECRET`**: Session encryption key (min 32 characters)

### Optional

- **`NODE_ENV`**: Set to `production` for production deployment
- **`PORT`**: Override default port (default: 3001)
- **`HOST`**: Override default host (default: 127.0.0.1)

### Generating Secure Secrets

```bash
# Generate session secret
openssl rand -base64 32

# Generate strong password
openssl rand -base64 16
```

## Deployment to admin.mailgoat.ai

### Prerequisites

1. ✅ Server access (91.98.35.3 or admin.mailgoat.ai)
2. ✅ nginx reverse proxy configured
3. ✅ SSL certificate (Let's Encrypt)
4. ✅ mailgoat@1.1.7+ installed globally
5. ⚠️ Frontend build working

### Deployment Steps

#### 1. Build Production Version

```bash
# On development machine or CI
cd mailgoat
npm run admin:ui:build

# Verify build
ls -la admin-ui/dist/index.html
```

#### 2. Deploy to Server

```bash
# SCP the built files
scp -r admin-ui/dist/ user@admin.mailgoat.ai:/opt/mailgoat/admin-ui/

# OR rebuild on server
ssh user@admin.mailgoat.ai
cd /opt/mailgoat
git pull origin master
npm run admin:ui:build
```

#### 3. Configure Environment

```bash
# On server: /etc/systemd/system/mailgoat-admin.service
[Unit]
Description=MailGoat Admin Panel
After=network.target

[Service]
Type=simple
User=mailgoat
WorkingDirectory=/opt/mailgoat
Environment="NODE_ENV=production"
Environment="ADMIN_PASSWORD=<secure-password>"
Environment="SESSION_SECRET=<32-char-secret>"
ExecStart=/usr/local/bin/mailgoat admin serve --host 127.0.0.1 --port 3001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 4. Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable mailgoat-admin
sudo systemctl start mailgoat-admin
sudo systemctl status mailgoat-admin
```

#### 5. Configure nginx

```nginx
# /etc/nginx/sites-available/admin.mailgoat.ai
server {
    listen 443 ssl http2;
    server_name admin.mailgoat.ai;

    ssl_certificate /etc/letsencrypt/live/admin.mailgoat.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.mailgoat.ai/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Session cookies
        proxy_cookie_path / "/; SameSite=strict";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name admin.mailgoat.ai;
    return 301 https://$host$request_uri;
}
```

#### 6. Reload nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. Verify Deployment

```bash
# From local machine
curl -I https://admin.mailgoat.ai
# Should return 200 OK

# Test login endpoint
curl -X POST https://admin.mailgoat.ai/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"test"}'
# Should return 401 (works!)
```

## Testing

### Unit Tests

```bash
# Test admin command
npm test src/commands/__tests__/admin.test.ts
```

### Manual Testing Checklist

- [ ] Admin panel loads at https://admin.mailgoat.ai
- [ ] Login page appears
- [ ] Can log in with correct password
- [ ] Incorrect password rejected
- [ ] Rate limiting works (5 attempts/hour)
- [ ] Dashboard loads after login
- [ ] API status endpoint works
- [ ] Logout works
- [ ] Session persists across page refreshes
- [ ] Session expires after 24 hours
- [ ] No console errors in browser
- [ ] Security headers present in responses

## Troubleshooting

### Build Fails

**Problem:** TypeScript errors during build
```
error TS2322: Type '{ children: string; variant: string; }' is not assignable...
```

**Solution:** Fix TypeScript errors in React components (see section 2 above)

### Admin Server Won't Start

**Problem:** `admin-ui/dist not found`
```
Error: admin-ui/dist not found. Run `npm run admin:ui:build` first.
```

**Solution:** Build the frontend first

### Login Fails

**Problem:** Invalid credentials but password is correct

**Solution:** Check password length (must be 12+ characters)

### Session Not Persisting

**Problem:** Logged out after page refresh

**Solution:**
- Check SESSION_SECRET is set (32+ characters)
- Verify cookies are enabled in browser
- Check `secure` cookie flag (requires HTTPS in production)

### 404 on API Routes

**Problem:** `/api/admin/status` returns 404

**Solution:**
- Verify nginx proxy passes `/api/admin` correctly
- Check admin server is running
- Verify authentication (requires login first)

## Security Considerations

### Production Checklist

- [ ] ADMIN_PASSWORD is strong (16+ characters, random)
- [ ] SESSION_SECRET is cryptographically random (32+ characters)
- [ ] Secrets stored in environment variables (not in code)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Rate limiting enabled (5 login attempts/hour)
- [ ] Security headers present
- [ ] Admin panel bound to localhost (proxied via nginx)
- [ ] Firewall allows only necessary ports
- [ ] Regular security updates applied

### Rate Limiting

- **Login endpoint:** 5 attempts per hour per IP
- **Admin API:** 300 requests per minute per IP

### Session Security

- **Cookie flags:** httpOnly, secure (in production), sameSite=strict
- **Session timeout:** 24 hours
- **Session regeneration:** On login (prevents fixation attacks)
- **Timing-safe password comparison:** Prevents timing attacks

## Monitoring

### Health Check

```bash
# Check if admin server is running
curl http://127.0.0.1:3001/api/admin/status

# Should return (after login):
{
  "ok": true,
  "data": {
    "service": "mailgoat-admin",
    "version": "1.1.8",
    "uptimeSeconds": 12345,
    "checkedAt": "2026-02-19T17:00:00.000Z",
    "environment": "production"
  }
}
```

### Logs

```bash
# systemd logs
sudo journalctl -u mailgoat-admin -f

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Next Steps

1. **Fix TypeScript errors** in React components
2. **Complete build** of frontend
3. **Test end-to-end** locally
4. **Deploy to production** following steps above
5. **Update DNS** if needed
6. **Test in production**
7. **Document credentials** securely (not in git!)

## References

- Backend code: `src/commands/admin.ts`
- Frontend code: `admin-ui/src/`
- Security audit: `docs/security/admin-panel-security-audit-2026-02-19-8c2de0f8.md`
- nginx config: `docs/security/admin-nginx-security.conf`

## Support

For issues or questions, contact:
- **Infrastructure:** @devops
- **Security:** @developer-2
- **Frontend:** @developer-1
- **Backend:** @lead-engineer
