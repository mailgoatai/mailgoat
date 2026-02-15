# MailGoat GitHub Action

Send email notifications from GitHub workflows using MailGoat/Postal.

[![GitHub release](https://img.shields.io/github/v/release/mailgoatai/mailgoat-github-action)](https://github.com/mailgoatai/mailgoat-github-action/releases)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-MailGoat%20Email-blue?logo=github)](https://github.com/marketplace/actions/mailgoat-email-notification)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

✉️ **Email Notifications** - Send emails from any GitHub workflow  
🎨 **HTML Support** - Send plain text or HTML emails  
👥 **Multiple Recipients** - CC and BCC support  
🔒 **Secure** - API keys stored as GitHub secrets  
📊 **Job Summaries** - Rich output in GitHub Actions UI  
🚀 **Fast** - Direct Postal API integration  
🎯 **Context Variables** - Auto-expand GitHub variables

## Quick Start

```yaml
- name: Send email
  uses: mailgoatai/mailgoat-github-action@v1
  with:
    postal_server: ${{ secrets.POSTAL_SERVER_URL }}
    postal_api_key: ${{ secrets.POSTAL_API_KEY }}
    from_email: 'noreply@company.com'
    to: 'team@company.com'
    subject: 'Deploy complete'
    body: 'Deployed ${{ github.sha }} to production'
```

## Inputs

### Required

| Input            | Description        | Example                                           |
| ---------------- | ------------------ | ------------------------------------------------- |
| `postal_server`  | Postal server URL  | `https://postal.example.com`                      |
| `postal_api_key` | Postal API key     | Use GitHub secrets                                |
| `from_email`     | From email address | `noreply@company.com`                             |
| `to`             | Recipient email(s) | `user@example.com` or `user1@ex.com,user2@ex.com` |
| `subject`        | Email subject      | `Deploy notification`                             |
| `body`           | Email body         | `Deployment successful`                           |

### Optional

| Input           | Description                   | Default |
| --------------- | ----------------------------- | ------- |
| `cc`            | CC email address(es)          | -       |
| `bcc`           | BCC email address(es)         | -       |
| `reply_to`      | Reply-to address              | -       |
| `html`          | Body is HTML (`true`/`false`) | `false` |
| `fail_on_error` | Fail workflow on error        | `true`  |

## Outputs

| Output       | Description                                      |
| ------------ | ------------------------------------------------ |
| `message_id` | Postal message ID                                |
| `success`    | Whether email sent successfully (`true`/`false`) |
| `error`      | Error message if failed                          |

## Setup

### 1. Add Secrets

Add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

- `POSTAL_SERVER_URL` - Your Postal server URL
- `POSTAL_API_KEY` - Your Postal API key

### 2. Create Workflow

Create `.github/workflows/notify.yml`:

```yaml
name: Notify on Push

on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: mailgoatai/mailgoat-github-action@v1
        with:
          postal_server: ${{ secrets.POSTAL_SERVER_URL }}
          postal_api_key: ${{ secrets.POSTAL_API_KEY }}
          from_email: 'github@company.com'
          to: 'team@company.com'
          subject: 'New push to main'
          body: 'Commit ${{ github.sha }} by ${{ github.actor }}'
```

## Examples

### Deploy Notification

```yaml
- name: Notify deployment
  uses: mailgoatai/mailgoat-github-action@v1
  with:
    postal_server: ${{ secrets.POSTAL_SERVER_URL }}
    postal_api_key: ${{ secrets.POSTAL_API_KEY }}
    from_email: 'deployments@company.com'
    to: 'team@company.com'
    subject: '🚀 Deployed to production'
    body: |
      Repository: ${{ github.repository }}
      Commit: ${{ github.sha }}
      Branch: ${{ github.ref }}
      Deployed by: ${{ github.actor }}
```

### HTML Email

```yaml
- name: Send HTML email
  uses: mailgoatai/mailgoat-github-action@v1
  with:
    postal_server: ${{ secrets.POSTAL_SERVER_URL }}
    postal_api_key: ${{ secrets.POSTAL_API_KEY }}
    from_email: 'noreply@company.com'
    to: 'user@example.com'
    subject: 'Build Complete'
    html: 'true'
    body: |
      <h1>Build Successful</h1>
      <p>Your build has completed successfully.</p>
      <ul>
        <li><strong>Commit:</strong> ${{ github.sha }}</li>
        <li><strong>Branch:</strong> ${{ github.ref }}</li>
      </ul>
```

### Failure Alert

```yaml
- name: Alert on failure
  if: failure()
  uses: mailgoatai/mailgoat-github-action@v1
  with:
    postal_server: ${{ secrets.POSTAL_SERVER_URL }}
    postal_api_key: ${{ secrets.POSTAL_API_KEY }}
    from_email: 'alerts@company.com'
    to: 'oncall@company.com'
    subject: '🚨 Workflow failed: ${{ github.workflow }}'
    body: |
      Workflow failed in ${{ github.repository }}

      Run: ${{ github.run_number }}
      Commit: ${{ github.sha }}
      Actor: ${{ github.actor }}
    fail_on_error: 'false'
```

### Multiple Recipients

```yaml
- name: Notify team
  uses: mailgoatai/mailgoat-github-action@v1
  with:
    postal_server: ${{ secrets.POSTAL_SERVER_URL }}
    postal_api_key: ${{ secrets.POSTAL_API_KEY }}
    from_email: 'noreply@company.com'
    to: 'user1@example.com,user2@example.com,user3@example.com'
    cc: 'manager@example.com'
    bcc: 'archive@example.com'
    subject: 'Release notification'
    body: 'Version ${{ github.ref }} released'
```

### Pull Request Review

```yaml
on:
  pull_request:
    types: [opened, ready_for_review]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: mailgoatai/mailgoat-github-action@v1
        with:
          postal_server: ${{ secrets.POSTAL_SERVER_URL }}
          postal_api_key: ${{ secrets.POSTAL_API_KEY }}
          from_email: 'github@company.com'
          to: 'reviewers@company.com'
          subject: 'PR ready: ${{ github.event.pull_request.title }}'
          body: |
            Pull request opened by ${{ github.event.pull_request.user.login }}

            Title: ${{ github.event.pull_request.title }}
            URL: ${{ github.event.pull_request.html_url }}
```

## GitHub Context Variables

The action automatically expands GitHub context variables in subject and body:

| Variable                   | Expanded To            |
| -------------------------- | ---------------------- |
| `${{ github.sha }}`        | Commit SHA             |
| `${{ github.ref }}`        | Branch or tag ref      |
| `${{ github.repository }}` | Repository name        |
| `${{ github.actor }}`      | Username who triggered |
| `${{ github.workflow }}`   | Workflow name          |
| `${{ github.event_name }}` | Event type             |
| `${{ github.run_number }}` | Run number             |
| `${{ github.run_id }}`     | Run ID                 |

## Advanced Usage

### Conditional Notifications

Only send email on main branch:

```yaml
- name: Notify (main only)
  if: github.ref == 'refs/heads/main'
  uses: mailgoatai/mailgoat-github-action@v1
  with:
    # ... inputs
```

### Use Action Outputs

```yaml
- name: Send email
  id: email
  uses: mailgoatai/mailgoat-github-action@v1
  with:
    # ... inputs

- name: Check result
  run: |
    echo "Success: ${{ steps.email.outputs.success }}"
    echo "Message ID: ${{ steps.email.outputs.message_id }}"

    if [ "${{ steps.email.outputs.success }}" != "true" ]; then
      echo "Error: ${{ steps.email.outputs.error }}"
    fi
```

### Matrix Notifications

Send to different recipients based on matrix:

```yaml
strategy:
  matrix:
    environment: [dev, staging, production]

steps:
  - uses: mailgoatai/mailgoat-github-action@v1
    with:
      postal_server: ${{ secrets.POSTAL_SERVER_URL }}
      postal_api_key: ${{ secrets.POSTAL_API_KEY }}
      from_email: 'deploys@company.com'
      to: 'team-${{ matrix.environment }}@company.com'
      subject: 'Deployed to ${{ matrix.environment }}'
      body: 'Deployment complete'
```

## Troubleshooting

### "Invalid email address"

Ensure all email addresses are properly formatted:

```yaml
to: 'user@example.com'  # ✅ Correct
to: 'User <user@example.com>'  # ❌ Wrong
```

### "Authentication failed"

Check your Postal API key:

1. Verify it's set in GitHub Secrets
2. Ensure it has send permissions
3. Test with curl:

```bash
curl -X POST https://postal.example.com/api/v1/send/message \
  -H "X-Server-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":["test@example.com"],"from":"test@example.com","subject":"Test","plain_body":"Test"}'
```

### "Connection timeout"

- Check `postal_server` URL is correct
- Ensure Postal server is accessible from GitHub Actions
- Verify firewall rules allow GitHub Actions IPs

### Email not received

- Check spam folder
- Verify DKIM/SPF are configured in Postal
- Check Postal logs for delivery status
- Ensure recipient email is valid

## Development

### Build Action

```bash
npm install
npm run build
```

### Test Locally

```bash
# Set environment variables
export INPUT_POSTAL_SERVER="https://postal.example.com"
export INPUT_POSTAL_API_KEY="your_key"
export INPUT_FROM_EMAIL="test@example.com"
export INPUT_TO="recipient@example.com"
export INPUT_SUBJECT="Test"
export INPUT_BODY="Test body"

# Run
node dist/index.js
```

### Publish to Marketplace

1. Update `action.yml` version
2. Create git tag: `git tag -a v1.0.0 -m "v1.0.0"`
3. Push tag: `git push origin v1.0.0`
4. Create GitHub release
5. Publish to marketplace

## Security

⚠️ **Important:**

- **Never** commit Postal API keys to git
- **Always** use GitHub Secrets for sensitive data
- **Limit** API key permissions to send-only
- **Rotate** keys regularly
- **Monitor** usage in Postal dashboard

## Requirements

- GitHub Actions runner (ubuntu-latest, windows-latest, macos-latest)
- Postal server with API access
- Valid Postal API key

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Support

- **Documentation:** https://docs.mailgoat.dev
- **Issues:** https://github.com/mailgoatai/mailgoat-github-action/issues
- **Community:** https://discord.gg/mailgoat

## License

MIT - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

---

**Made with ❤️ by the MailGoat team**

**By Agents, For Agents** 🐐
