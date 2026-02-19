# Email Template System

MailGoat supports email templates with Handlebars-style variable substitution, making it easy to send personalized emails at scale.

## Quick Start

```bash
# Create a template
mailgoat template create welcome \
  --subject "Welcome to {{company}}!" \
  --body "Hello {{name}}, welcome aboard!"

# Use the template
mailgoat send --template welcome \
  --to john@example.com \
  --var name=John --var company="MailGoat"
```

## Creating Templates

### From Command Line

```bash
# Simple text template
mailgoat template create reminder \
  --subject "Reminder: {{task}}" \
  --body "Don't forget to {{action}} by {{deadline}}."

# HTML template
mailgoat template create newsletter \
  --subject "{{month}} Newsletter" \
  --html "<h1>Hello {{name}}</h1><p>Latest news...</p>"

# Template with defaults
mailgoat template create invoice \
  --subject "Invoice {{invoice_number}}" \
  --body-file invoice-template.txt \
  --from billing@example.com \
  --tag invoices
```

### From Files

```bash
# Read body from file
mailgoat template create report \
  --subject "{{type}} Report" \
  --body-file templates/report.txt

# HTML from file
mailgoat template create newsletter \
  --subject "{{month}} Newsletter" \
  --html-file templates/newsletter.html
```

### Template Structure

Templates are stored as YAML files in `~/.mailgoat/templates/`:

```yaml
name: welcome
subject: Welcome to {{company}}!
body: |
  Hello {{name}},

  Welcome to {{company}}! We're excited to have you on board.

  Best regards,
  The {{company}} Team
from: hello@example.com
tag: welcome-emails
description: Welcome email for new users
created_at: 2026-02-15T19:00:00.000Z
updated_at: 2026-02-15T19:00:00.000Z
```

## Using Templates

### Basic Usage

```bash
# Send email using template
mailgoat send --template welcome \
  --to john@example.com \
  --var name=John --var company="MailGoat"
```

### Override Template Values

CLI options override template defaults:

```bash
# Use template but override subject and from
mailgoat send --template welcome \
  --to john@example.com \
  --subject "Custom Subject" \
  --from custom@example.com \
  --var name=John
```

### Multiple Recipients

```bash
# Send to multiple recipients
mailgoat send --template newsletter \
  --to user1@example.com user2@example.com user3@example.com \
  --var month=February
```

### With Attachments

```bash
# Template + attachments
mailgoat send --template invoice \
  --to client@example.com \
  --var invoice_number=12345 --var amount="$1,234.56" \
  --attach invoice-12345.pdf
```

## Template Variables

### Variable Syntax

Handlebars-style double curly braces:

```
Hello {{name}}!
Your order #{{order_id}} will arrive on {{delivery_date}}.
```

### Variable Types

Variables are automatically typed:

```bash
# String
--var name="John Doe"

# Number
--var age=30

# Boolean
--var premium=true

# Quotes optional for simple strings
--var status=active
```

### Complex Variables

```bash
# Multi-word strings
--var message="Hello, world!"

# Numbers with decimals
--var price=19.99

# Dates (as strings)
--var date="2026-02-15"
```

### Built-in Helpers

Handlebars provides built-in helpers:

**Conditionals:**

```handlebars
{{#if premium}}
  Premium features unlocked!
{{else}}
  Upgrade to premium for more features.
{{/if}}
```

**Loops (for arrays):**

```handlebars
{{#each items}}
  -
  {{this}}
{{/each}}
```

**Note:** Arrays must be passed as JSON strings or handled in custom helpers.

## Managing Templates

### List Templates

```bash
# List all templates
mailgoat template list

# JSON output
mailgoat template list --json
```

### Show Template Details

```bash
# View template content
mailgoat template show welcome

# JSON output
mailgoat template show welcome --json
```

### Edit Templates

```bash
# Update subject
mailgoat template edit welcome \
  --subject "New Welcome Subject"

# Update body from file
mailgoat template edit welcome \
  --body-file new-welcome.txt

# Update multiple fields
mailgoat template edit welcome \
  --subject "{{greeting}}, {{name}}!" \
  --tag updated-welcome \
  --description "Updated welcome email"
```

### Delete Templates

```bash
# Delete with confirmation
mailgoat template delete old-template

# Skip confirmation
mailgoat template delete old-template --yes
```

## Template Best Practices

### 1. Use Descriptive Names

```bash
# Good
mailgoat template create password-reset
mailgoat template create weekly-newsletter
mailgoat template create order-confirmation

# Avoid
mailgoat template create template1
mailgoat template create test
```

### 2. Add Descriptions

```bash
mailgoat template create invoice \
  --subject "Invoice {{number}}" \
  --body-file invoice.txt \
  --description "Monthly invoice email with payment details"
```

### 3. Set Reasonable Defaults

```yaml
# Template with sensible defaults
name: notification
subject: '{{type}} Notification'
body: '{{message}}'
from: notifications@example.com
tag: notifications
```

### 4. Document Required Variables

In template descriptions or separate docs:

```
Required variables:
- name: User's full name
- company: Company name
- signup_date: Date user signed up (YYYY-MM-DD)
```

### 5. Test Templates

```bash
# Test with dummy data before production use
mailgoat send --template welcome \
  --to test@example.com \
  --var name="Test User" --var company="Test Corp"
```

### 6. Version Control Templates

Export templates to files for version control:

```bash
# Templates are stored in ~/.mailgoat/templates/
cp ~/.mailgoat/templates/welcome.yml ~/project/templates/
```

## Examples

### Welcome Email

```bash
# Create template
mailgoat template create welcome \
  --subject "Welcome to {{service}}, {{name}}!" \
  --body "Hello {{name}},

Thanks for signing up for {{service}}!

Your account is ready. Login at {{login_url}}.

Questions? Reply to this email anytime.

Cheers,
The {{service}} Team" \
  --from hello@example.com \
  --description "Welcome email for new users"

# Send
mailgoat send --template welcome \
  --to newuser@example.com \
  --var name="Alice" \
  --var service="MailGoat" \
  --var login_url="https://app.mailgoat.ai/login"
```

### Password Reset

```bash
# Create template
mailgoat template create password-reset \
  --subject "Reset your password" \
  --html "<h2>Password Reset</h2>
<p>Hi {{name}},</p>
<p>Click the link below to reset your password:</p>
<p><a href=\"{{reset_url}}\">Reset Password</a></p>
<p>This link expires in {{expiry_hours}} hours.</p>
<p>If you didn't request this, ignore this email.</p>" \
  --from security@example.com

# Send
mailgoat send --template password-reset \
  --to user@example.com \
  --var name="Bob" \
  --var reset_url="https://example.com/reset?token=abc123" \
  --var expiry_hours=24
```

### Order Confirmation

```bash
# Create template
mailgoat template create order-confirmation \
  --subject "Order #{{order_id}} Confirmed" \
  --body-file order-confirmation.txt \
  --from orders@example.com \
  --tag orders

# Send with attachment
mailgoat send --template order-confirmation \
  --to customer@example.com \
  --var order_id=12345 \
  --var total="$99.99" \
  --var delivery_date="2026-02-20" \
  --attach receipt-12345.pdf
```

### Newsletter

```bash
# Create template
mailgoat template create newsletter \
  --subject "{{month}} {{year}} Newsletter" \
  --html-file newsletter-template.html \
  --from newsletter@example.com \
  --tag newsletter

# Send to multiple recipients
mailgoat send --template newsletter \
  --to subscriber1@example.com subscriber2@example.com \
  --var month=February --var year=2026
```

## Advanced Usage

### Batch Sending with Scripts

```bash
#!/bin/bash
# send-welcome-emails.sh

# Read user data from CSV
while IFS=, read -r email name company; do
  echo "Sending to $email..."

  mailgoat send --template welcome \
    --to "$email" \
    --var name="$name" \
    --var company="$company"

  # Avoid rate limiting
  sleep 1
done < users.csv
```

### Dynamic Templates

```bash
# Generate template dynamically
cat > /tmp/custom-template.yml <<EOF
name: dynamic-template
subject: Notification for {{user}}
body: |
  Hello {{user}},

  Event: {{event}}
  Time: {{time}}

  Details: {{details}}
EOF

# Import template
cp /tmp/custom-template.yml ~/.mailgoat/templates/
```

### Template Variables from Environment

```bash
#!/bin/bash
# Use environment variables as template variables

export USER_NAME="John Doe"
export COMPANY="MailGoat"

mailgoat send --template welcome \
  --to user@example.com \
  --var name="$USER_NAME" \
  --var company="$COMPANY"
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Send deployment notification
  run: |
    mailgoat send --template deployment-notification \
      --to team@example.com \
      --var version="${{ github.ref_name }}" \
      --var build="${{ github.run_number }}" \
      --var status="success"
```

## Troubleshooting

### Template Not Found

```bash
# List available templates
mailgoat template list

# Check template location
ls ~/.mailgoat/templates/
```

### Missing Variables

Error: `Variable '{{name}}' not provided`

Solution: Provide all variables used in template:

```bash
mailgoat send --template welcome \
  --to user@example.com \
  --var name="John" --var company="ACME"
```

### Template Syntax Errors

Handlebars will throw errors for invalid syntax:

```
# Invalid: {{name
# Valid: {{name}}

# Invalid: {{#if status}
# Valid: {{#if status}}...{{/if}}
```

### Permission Errors

```bash
# Check templates directory permissions
ls -la ~/.mailgoat/templates/

# Should be 0700 (user-only access)
chmod 700 ~/.mailgoat/templates/
chmod 600 ~/.mailgoat/templates/*.yml
```

## Migration Guide

### From Plain Text Emails

Before:

```bash
mailgoat send \
  --to user@example.com \
  --subject "Welcome!" \
  --body "Hello John, welcome to ACME Corp!"
```

After:

```bash
# Create template once
mailgoat template create welcome \
  --subject "Welcome to {{company}}!" \
  --body "Hello {{name}}, welcome to {{company}}!"

# Reuse many times
mailgoat send --template welcome \
  --to user@example.com \
  --var name=John --var company="ACME Corp"
```

### From External Template Systems

If you have templates in another system:

1. Export templates to text files
2. Create MailGoat templates from files:

```bash
mailgoat template create imported-template \
  --subject "$(cat subject.txt)" \
  --body-file body.txt
```

## API Reference

### Template YAML Schema

```yaml
# Required fields
name: string # Template identifier (alphanumeric, dash, underscore)
subject: string # Email subject (can contain {{variables}})

# Body (at least one required)
body: string # Plain text body
html: string # HTML body

# Optional fields
from: string # Default sender email
cc: string[] # Default CC recipients
bcc: string[] # Default BCC recipients
tag: string # Default tag
description: string # Template description

# Metadata (auto-generated)
created_at: ISO8601 string # Creation timestamp
updated_at: ISO8601 string # Last update timestamp
```

### Variable Substitution Rules

1. Variables use `{{key}}` syntax
2. Undefined variables render as empty string
3. Variable names: alphanumeric + underscore
4. Values: strings, numbers, booleans
5. Escaping: Use `\{{` to render literal `{{`

## Related Commands

- [`mailgoat send`](./COMMANDS.md#send) - Send emails
- [`mailgoat config`](./COMMANDS.md#config) - Configure MailGoat
- [`mailgoat template`](./COMMANDS.md#template) - Manage templates

## See Also

- [Handlebars Documentation](https://handlebarsjs.com/)
- [Email Best Practices](./EMAIL-BEST-PRACTICES.md)
- [CLI Reference](./CLI-REFERENCE.md)
