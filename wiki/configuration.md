# Configuration

Complete guide to configuring MailGoat.

## Configuration File

MailGoat stores configuration in `~/.mailgoat/config.yml` by default.

### Basic Configuration

```yaml
server: postal.example.com
email: agent@example.com
api_key: your-postal-api-key-here
```

### Full Configuration Example

```yaml
# Postal server (no http:// or https:// prefix)
server: postal.example.com

# Your email address (must be allowed in Postal)
email: agent@example.com

# Postal API key (from Postal web UI)
api_key: your-postal-api-key-here

# Optional: Default sender name
from_name: "MailGoat Agent"

# Optional: Enable debug logging
debug: false

# Optional: Request timeout (milliseconds)
timeout: 30000
```

## Creating Configuration

### Interactive Setup (Recommended)

```bash
mailgoat config init
```

Prompts for required fields and creates the config file.

### Manual Creation

```bash
mkdir -p ~/.mailgoat
cat > ~/.mailgoat/config.yml << EOF
server: postal.example.com
email: agent@example.com
api_key: your-api-key-here
EOF
```

### Verify Configuration

```bash
mailgoat config show
```

Output:
```yaml
server: postal.example.com
email: agent@example.com
api_key: **********************def456
```

## Multiple Profiles

Use different configuration files for different accounts or environments.

### Profile Structure

```bash
~/.mailgoat/
├── config.yml       # Default profile
├── work.yml         # Work account
├── personal.yml     # Personal account
└── staging.yml      # Staging environment
```

### Creating Profiles

```bash
# Work profile
cat > ~/.mailgoat/work.yml << EOF
server: postal.company.com
email: bot@company.com
api_key: work-api-key
EOF

# Personal profile
cat > ~/.mailgoat/personal.yml << EOF
server: postal.example.com
email: me@example.com
api_key: personal-api-key
EOF
```

### Using Profiles

```bash
# Use specific profile
MAILGOAT_CONFIG=~/.mailgoat/work.yml mailgoat send --to user@example.com --subject "Test" --body "Hello"

# Or export for the session
export MAILGOAT_CONFIG=~/.mailgoat/work.yml
mailgoat send --to user@example.com --subject "Work Email" --body "..."
```

### Profile Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Aliases for different profiles
alias mg-work='MAILGOAT_CONFIG=~/.mailgoat/work.yml mailgoat'
alias mg-personal='MAILGOAT_CONFIG=~/.mailgoat/personal.yml mailgoat'
alias mg-staging='MAILGOAT_CONFIG=~/.mailgoat/staging.yml mailgoat'

# Usage:
# mg-work send --to colleague@company.com --subject "..." --body "..."
# mg-personal send --to friend@example.com --subject "..." --body "..."
```

## Environment Variables

Environment variables override config file values.

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MAILGOAT_CONFIG` | Path to config file | `/etc/mailgoat/config.yml` |
| `MAILGOAT_SERVER` | Postal server URL | `postal.example.com` |
| `MAILGOAT_EMAIL` | Sender email address | `agent@example.com` |
| `MAILGOAT_API_KEY` | Postal API key | `your-api-key-here` |
| `MAILGOAT_DEBUG` | Enable debug logging | `true` or `false` |
| `MAILGOAT_TIMEOUT` | Request timeout (ms) | `30000` |

### Configuration Precedence

Settings are applied in this order (highest to lowest priority):

1. **Command-line options** (if available)
2. **Environment variables** (`MAILGOAT_*`)
3. **Config file** (`~/.mailgoat/config.yml` or `MAILGOAT_CONFIG`)
4. **Defaults** (built-in fallbacks)

### Using Environment Variables

**Export for session:**
```bash
export MAILGOAT_API_KEY=your-api-key-here
export MAILGOAT_SERVER=postal.example.com
export MAILGOAT_EMAIL=agent@example.com

mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

**One-time use:**
```bash
MAILGOAT_API_KEY=temp-key mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

**In scripts:**
```bash
#!/bin/bash
export MAILGOAT_CONFIG=/etc/mailgoat/production.yml
mailgoat send --to admin@example.com --subject "Alert" --body "System alert!"
```

## Security Best Practices

### 1. Protect Your API Key

**✗ Bad - committed to git:**
```yaml
# config.yml (in git repo)
api_key: my-secret-key-123
```

**✓ Good - use environment variable:**
```yaml
# config.yml (in git repo)
api_key: ${MAILGOAT_API_KEY}
```

```bash
# .env (not in git, in .gitignore)
export MAILGOAT_API_KEY=my-secret-key-123
```

### 2. File Permissions

Restrict config file access:

```bash
chmod 600 ~/.mailgoat/config.yml
```

Only the owner can read/write.

### 3. Never Log API Keys

```bash
# ✗ Bad
echo "Using API key: $MAILGOAT_API_KEY"

# ✓ Good
echo "Using API key: ${MAILGOAT_API_KEY:0:8}..."
```

### 4. Rotate API Keys Periodically

1. Generate new API key in Postal UI
2. Update config/environment
3. Test with new key
4. Delete old key in Postal UI

```bash
# Test new key
MAILGOAT_API_KEY=new-key mailgoat send --to test@example.com --subject "Test" --body "Testing new key"
```

### 5. Use Separate Keys for Different Environments

```bash
~/.mailgoat/
├── production.yml  # Production API key
├── staging.yml     # Staging API key
└── development.yml # Development API key
```

Never use production keys in development!

### 6. Secure Storage

For production systems, consider:

- **Environment variables** in orchestration (Docker, Kubernetes)
- **Secret managers** (AWS Secrets Manager, HashiCorp Vault)
- **Encrypted files** (ansible-vault, git-crypt)

**Example with Docker:**
```dockerfile
# Dockerfile
ENV MAILGOAT_SERVER=postal.example.com
ENV MAILGOAT_EMAIL=agent@example.com
# API key passed at runtime via -e flag
```

```bash
docker run -e MAILGOAT_API_KEY=$SECRET_KEY myapp
```

## Advanced Configuration

### Custom Config Location

```bash
# System-wide config
sudo mkdir -p /etc/mailgoat
sudo cat > /etc/mailgoat/config.yml << EOF
server: postal.example.com
email: system@example.com
api_key: system-api-key
EOF

# Use it
MAILGOAT_CONFIG=/etc/mailgoat/config.yml mailgoat send ...
```

### Debug Mode

Enable detailed logging:

```yaml
# In config.yml
debug: true
```

Or:

```bash
MAILGOAT_DEBUG=true mailgoat send --to user@example.com --subject "Test" --body "Hello"
```

Output includes:
- HTTP requests/responses
- Parsed configuration
- API call details
- Error stack traces

### Timeout Configuration

Adjust network timeout:

```yaml
# In config.yml
timeout: 60000  # 60 seconds
```

Or:

```bash
MAILGOAT_TIMEOUT=60000 mailgoat send ...
```

Useful for slow networks or large attachments.

### Per-Command Configuration

Some commands support inline overrides:

```bash
# Override sender address (must be allowed in Postal)
mailgoat send \
  --from different@example.com \
  --to user@example.com \
  --subject "Test" \
  --body "Sent from alternate address"
```

## Configuration Templates

### Development

```yaml
# ~/.mailgoat/dev.yml
server: postal.dev.example.com
email: dev-bot@example.com
api_key: ${DEV_API_KEY}
debug: true
timeout: 60000
```

### Production

```yaml
# ~/.mailgoat/prod.yml
server: postal.example.com
email: bot@example.com
api_key: ${PROD_API_KEY}
debug: false
timeout: 30000
```

### CI/CD

```yaml
# ~/.mailgoat/ci.yml
server: postal.ci.example.com
email: ci-bot@example.com
api_key: ${CI_API_KEY}
debug: false
timeout: 30000
```

## Troubleshooting

### Config File Not Found

**Error:** `Configuration file not found: ~/.mailgoat/config.yml`

**Fix:**
```bash
mailgoat config init
# Or manually create config.yml
```

### Invalid YAML Syntax

**Error:** `Failed to parse config file`

**Fix:**
- Check YAML indentation (use spaces, not tabs)
- Verify quotes around special characters
- Validate with: `yamllint ~/.mailgoat/config.yml`

### API Key Not Working

**Error:** `Authentication failed`

**Fix:**
1. Check for extra spaces/newlines in config
2. Regenerate API key in Postal UI
3. Verify key has correct permissions

```bash
# Test key
mailgoat config get api_key
# Should show masked key

# Re-enter key
mailgoat config set api_key your-new-key
```

### Environment Variable Not Applied

**Issue:** Config file value is used instead of environment variable

**Fix:**
- Verify export: `echo $MAILGOAT_API_KEY`
- Check variable name (must match exactly)
- Ensure no typos in variable name

### Permission Denied

**Error:** `Permission denied: ~/.mailgoat/config.yml`

**Fix:**
```bash
# Fix ownership
sudo chown $USER ~/.mailgoat/config.yml

# Fix permissions
chmod 600 ~/.mailgoat/config.yml
```

## Migration

### From Old Config Format

If you're upgrading from an old version:

```bash
# Backup old config
cp ~/.mailgoat/config.yml ~/.mailgoat/config.yml.backup

# Initialize new config
mailgoat config init

# Verify
mailgoat config show
```

### To Environment Variables

Convert config file to environment variables:

```bash
# From config.yml
cat ~/.mailgoat/config.yml

# To environment variables
export MAILGOAT_SERVER=$(mailgoat config get server)
export MAILGOAT_EMAIL=$(mailgoat config get email)
export MAILGOAT_API_KEY=$(mailgoat config get api_key)

# Test
mailgoat send --to test@example.com --subject "Test" --body "Testing env vars"

# Add to ~/.bashrc for persistence
```

## See Also

- [Getting Started](getting-started.md) - Initial setup
- [CLI Reference](cli-reference.md) - Command-line options
- [Agent Integration](agent-integration.md) - Using config in scripts
- [Security Best Practices](#security-best-practices) - Protecting credentials
