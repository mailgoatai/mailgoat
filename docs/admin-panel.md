# Admin Panel

The MailGoat Admin Panel provides a web-based interface for managing and monitoring your MailGoat instance with built-in authentication and security features.

## Features

- 🔐 **Session-based Authentication** - Secure login with httpOnly cookies
- 🛡️ **Rate Limiting** - Protection against brute-force attacks (5 attempts per hour per IP)
- ⏱️ **Auto Session Timeout** - Sessions expire after 24 hours of inactivity
- 🔒 **Protected API Endpoints** - All `/api/admin/*` routes require authentication
- 🚪 **Secure Logout** - Properly destroys sessions on logout

## Quick Start

### 1. Set Environment Variables

```bash
# Generate secure credentials
export ADMIN_PASSWORD=$(openssl rand -base64 24)
export SESSION_SECRET=$(openssl rand -hex 32)

# Or add to .env file
echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" >> .env
echo "SESSION_SECRET=$SESSION_SECRET" >> .env
```

### 2. Start the Admin Server

```bash
# Using environment variables
mailgoat admin serve

# Or with command-line options
mailgoat admin serve --password "YourSecurePassword" --session-secret "YourSecretKey"

# Custom host and port
mailgoat admin serve --host 0.0.0.0 --port 8080
```

### 3. Access the Admin Panel

Open your browser and navigate to:
- Admin Panel: `http://localhost:3001/admin`
- Login Page: `http://localhost:3001/admin/login`

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_PASSWORD` | Yes | Password for admin access |
| `SESSION_SECRET` | Recommended | Secret key for session encryption (auto-generated if not provided) |

### Command-Line Options

```bash
mailgoat admin serve [options]

Options:
  --host <host>              Host to bind (default: "127.0.0.1")
  --port <port>              Port to listen on (default: "3001")
  --password <password>      Admin password (overrides ADMIN_PASSWORD)
  --session-secret <secret>  Session secret (overrides SESSION_SECRET)
  -h, --help                 Display help for command
```

## Security Features

### 1. Authentication Flow

```
User visits /admin
  ↓
Check if authenticated
  ↓ NO
Redirect to /admin/login
  ↓
Enter password
  ↓
Validate against ADMIN_PASSWORD
  ↓ VALID
Set session cookie
  ↓
Redirect to /admin
```

### 2. Session Management

- **Cookie Flags**: `httpOnly`, `sameSite=strict`, `secure` (in production)
- **Max Age**: 24 hours
- **Storage**: In-memory (session lost on server restart)
- **Regeneration**: Session ID changes after successful login

### 3. Rate Limiting

Login endpoint is protected with rate limiting:
- **Window**: 1 hour
- **Max Attempts**: 5 per IP address
- **Response**: HTTP 429 "Too Many Requests" after limit exceeded

Rate limit headers are included in responses:
```
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 3600
```

### 4. Protected Routes

All routes under `/admin` and `/api/admin/*` require authentication:

```javascript
// Protected routes (require login)
GET  /admin              → Admin dashboard
POST /admin/logout       → Logout endpoint
GET  /api/admin/status   → API status check
GET  /api/admin/*        → All other admin API endpoints

// Public routes (no auth required)
GET  /admin/login        → Login page
POST /admin/login        → Login submission
```

## Production Deployment

### 1. Use HTTPS

The admin panel uses `secure` cookies in production (`NODE_ENV=production`), which requires HTTPS:

```bash
# Behind a reverse proxy (nginx, Caddy, etc.)
export NODE_ENV=production
mailgoat admin serve --host 127.0.0.1 --port 3001
```

### 2. Reverse Proxy Configuration

#### Nginx Example

```nginx
server {
    listen 443 ssl;
    server_name admin.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Caddy Example

```caddy
admin.example.com {
    reverse_proxy localhost:3001
}
```

### 3. Secure Credential Management

Never commit credentials to version control:

```bash
# Store in .env (add .env to .gitignore)
echo ".env" >> .gitignore

# Or use a secrets manager
# - AWS Secrets Manager
# - HashiCorp Vault
# - 1Password CLI
# - Environment variables on your hosting platform
```

### 4. Firewall Configuration

Restrict admin panel access:

```bash
# UFW (Ubuntu)
sudo ufw allow from 192.168.1.0/24 to any port 3001

# iptables
sudo iptables -A INPUT -p tcp -s 192.168.1.0/24 --dport 3001 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j DROP
```

## API Reference

### GET /api/admin/status

Check admin panel status (requires authentication).

**Response:**
```json
{
  "status": "ok",
  "authenticated": true,
  "timestamp": "2026-02-19T13:01:58.469Z"
}
```

## Troubleshooting

### "Error: Admin password not set"

You must set `ADMIN_PASSWORD` either via environment variable or command-line option:

```bash
export ADMIN_PASSWORD="YourSecurePassword"
mailgoat admin serve
```

### Session Lost on Restart

Sessions are stored in memory by default. To persist sessions across restarts, you can integrate Redis or another session store (future enhancement).

### Rate Limit Reset

Rate limits are per-IP and reset after 1 hour. If you're locked out:

1. Wait 1 hour for automatic reset
2. Restart the server (clears in-memory rate limit counters)
3. Use a different IP address

### Cookie Not Being Set

Check browser console for:
- Mixed content warnings (HTTP page trying to set secure cookies)
- Third-party cookie blocking
- Browser extensions blocking cookies

## Future Enhancements

Planned features (not in current MVP):

- [ ] Multiple admin users with role-based access
- [ ] Two-factor authentication (2FA)
- [ ] Redis session storage for persistence
- [ ] Audit logs for all admin actions
- [ ] Email/username login instead of password-only
- [ ] OAuth integration (Google, GitHub, etc.)
- [ ] API key management UI
- [ ] Real-time metrics dashboard
- [ ] Email template editor

## Security Best Practices

1. **Use Strong Passwords**: Generate with `openssl rand -base64 32`
2. **Rotate Credentials**: Change passwords and session secrets regularly
3. **Monitor Access**: Check logs for suspicious login attempts
4. **Enable HTTPS**: Always use TLS in production
5. **Restrict Network Access**: Use firewalls or VPN for admin access
6. **Keep Updated**: Apply security patches promptly
7. **Backup Secrets**: Store credentials in a secure password manager

## Contributing

Found a security issue? Please report it privately to security@mailgoat.ai.

For feature requests and bug reports, open an issue on GitHub.

## License

MIT License - see LICENSE file for details.
