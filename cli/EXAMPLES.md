# MailGoat CLI Examples

Practical examples for using MailGoat in various scenarios.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Agent Integration](#agent-integration)
- [Automation Scripts](#automation-scripts)
- [Error Handling](#error-handling)
- [Advanced Patterns](#advanced-patterns)

## Basic Usage

### Sending Simple Emails

```bash
# Basic send
mailgoat send \
  --to user@example.com \
  --subject "Hello" \
  --body "This is a test message"

# Multiple recipients
mailgoat send \
  --to alice@example.com bob@example.com \
  --subject "Team Update" \
  --body "Here's the latest news..."

# With CC and BCC
mailgoat send \
  --to recipient@example.com \
  --cc manager@example.com \
  --bcc archive@example.com \
  --subject "Important Update" \
  --body "Please review this update."
```

### HTML Emails

```bash
# Simple HTML
mailgoat send \
  --to user@example.com \
  --subject "Welcome!" \
  --body "<h1>Welcome to Our Service</h1><p>Thanks for signing up!</p>" \
  --html

# With inline styles
mailgoat send \
  --to user@example.com \
  --subject "Newsletter" \
  --body '<div style="font-family: Arial;"><h2>Latest News</h2><p>Check out our updates...</p></div>' \
  --html
```

### Reading Messages

```bash
# Basic read
mailgoat read abc123-def456

# Full details (includes headers, attachments)
mailgoat read abc123-def456 --full

# JSON output (for parsing)
mailgoat read abc123-def456 --json
```

## Agent Integration

### OpenClaw Skill Example

```typescript
// skills/email/send-email.ts
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  body: string;
  html?: boolean;
  cc?: string[];
  tag?: string;
}

/**
 * Send email via MailGoat CLI
 */
export async function sendEmail(params: SendEmailParams): Promise<any> {
  const recipients = Array.isArray(params.to) ? params.to.join(' ') : params.to;
  
  let cmd = `mailgoat send --to ${recipients} --subject "${params.subject}" --body "${params.body}"`;
  
  if (params.html) {
    cmd += ' --html';
  }
  
  if (params.cc) {
    cmd += ` --cc ${params.cc.join(' ')}`;
  }
  
  if (params.tag) {
    cmd += ` --tag "${params.tag}"`;
  }
  
  cmd += ' --json';
  
  try {
    const { stdout } = await execAsync(cmd);
    return JSON.parse(stdout);
  } catch (error: any) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Read email via MailGoat CLI
 */
export async function readEmail(messageId: string): Promise<any> {
  try {
    const { stdout } = await execAsync(`mailgoat read "${messageId}" --json`);
    return JSON.parse(stdout);
  } catch (error: any) {
    throw new Error(`Failed to read email: ${error.message}`);
  }
}

// Usage in agent
async function handleEmailTask() {
  const result = await sendEmail({
    to: 'user@example.com',
    subject: 'Task Complete',
    body: '<h1>Done!</h1><p>Your task has been completed.</p>',
    html: true,
    tag: 'task-notification'
  });
  
  console.log(`Email sent: ${result.message_id}`);
}
```

### Python Agent Example

```python
#!/usr/bin/env python3
"""
MailGoat integration for Python-based AI agents
"""

import subprocess
import json
from typing import List, Optional, Dict, Any

class MailGoatClient:
    """Python wrapper for MailGoat CLI"""
    
    def __init__(self, mailgoat_path: str = 'mailgoat'):
        self.mailgoat_path = mailgoat_path
    
    def send(
        self,
        to: List[str],
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[List[str]] = None,
        tag: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send an email"""
        cmd = [
            self.mailgoat_path, 'send',
            '--to', *to,
            '--subject', subject,
            '--body', body,
            '--json'
        ]
        
        if html:
            cmd.append('--html')
        
        if cc:
            cmd.extend(['--cc', *cc])
        
        if tag:
            cmd.extend(['--tag', tag])
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    
    def read(self, message_id: str, full: bool = False) -> Dict[str, Any]:
        """Read a message"""
        cmd = [self.mailgoat_path, 'read', message_id, '--json']
        
        if full:
            cmd.append('--full')
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

# Usage example
def main():
    client = MailGoatClient()
    
    # Send notification
    response = client.send(
        to=['user@example.com'],
        subject='Daily Report',
        body='<h2>Report for 2024-01-15</h2><ul><li>Tasks: 5</li><li>Status: Good</li></ul>',
        html=True,
        tag='daily-report'
    )
    
    print(f"Sent message: {response['message_id']}")
    
    # Read it back (if you have the ID)
    # message = client.read(response['message_id'])
    # print(f"Subject: {message['details']['subject']}")

if __name__ == '__main__':
    main()
```

## Automation Scripts

### Daily Report Generator

```bash
#!/bin/bash
# daily-report.sh - Send daily status report

set -euo pipefail

REPORT_DATE=$(date +%Y-%m-%d)
RECIPIENTS="manager@example.com team@example.com"

# Generate report (example)
BODY="Daily Report for ${REPORT_DATE}

Tasks Completed: 8
Issues Resolved: 3
Uptime: 99.9%
Status: All systems operational

Generated by automated agent at $(date)"

# Send via MailGoat
mailgoat send \
  --to $RECIPIENTS \
  --subject "Daily Report - ${REPORT_DATE}" \
  --body "$BODY" \
  --tag "daily-report"

echo "Report sent successfully"
```

### Email on Error

```bash
#!/bin/bash
# backup.sh - Backup script with email notification

BACKUP_DIR="/var/backups"
LOG_FILE="/var/log/backup.log"

# Run backup
if ! ./run-backup.sh >> "$LOG_FILE" 2>&1; then
  # Backup failed - send alert
  ERROR_LOG=$(tail -50 "$LOG_FILE")
  
  mailgoat send \
    --to admin@example.com \
    --subject "❌ Backup Failed - $(hostname)" \
    --body "Backup failed on $(hostname) at $(date).

Last 50 lines of log:

$ERROR_LOG" \
    --tag "backup-failure"
  
  exit 1
fi

# Success notification
mailgoat send \
  --to admin@example.com \
  --subject "✅ Backup Successful - $(hostname)" \
  --body "Backup completed successfully on $(hostname) at $(date)." \
  --tag "backup-success"
```

### Cron Job Integration

```bash
# Add to crontab: crontab -e

# Send daily report at 8 AM
0 8 * * * /home/agent/scripts/daily-report.sh

# Send weekly summary every Monday at 9 AM
0 9 * * 1 /home/agent/scripts/weekly-summary.sh

# Check for important events every hour and email if found
0 * * * * /home/agent/scripts/check-events.sh
```

## Error Handling

### Bash Error Handling

```bash
#!/bin/bash
# safe-send.sh - Send email with error handling

send_email() {
  local to=$1
  local subject=$2
  local body=$3
  
  if ! output=$(mailgoat send \
    --to "$to" \
    --subject "$subject" \
    --body "$body" \
    --json 2>&1); then
    
    echo "Error sending email: $output" >&2
    return 1
  fi
  
  # Parse response
  message_id=$(echo "$output" | jq -r '.message_id')
  echo "Sent successfully: $message_id"
  return 0
}

# Usage
if send_email "user@example.com" "Test" "Hello"; then
  echo "Email sent!"
else
  echo "Failed to send email"
  exit 1
fi
```

### Python Error Handling

```python
import subprocess
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def safe_send_email(to: str, subject: str, body: str) -> Optional[str]:
    """Send email with error handling"""
    try:
        cmd = [
            'mailgoat', 'send',
            '--to', to,
            '--subject', subject,
            '--body', body,
            '--json'
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=30  # 30 second timeout
        )
        
        response = json.loads(result.stdout)
        message_id = response['message_id']
        
        logger.info(f"Email sent successfully: {message_id}")
        return message_id
        
    except subprocess.TimeoutExpired:
        logger.error("Email send timed out")
        return None
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Email send failed: {e.stderr}")
        return None
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse response: {e}")
        return None
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return None

# Usage
message_id = safe_send_email(
    'user@example.com',
    'Test',
    'Hello world'
)

if message_id:
    print(f"Success: {message_id}")
else:
    print("Failed to send email")
```

## Advanced Patterns

### Batch Sending

```bash
#!/bin/bash
# batch-send.sh - Send to multiple recipients from file

RECIPIENTS_FILE="recipients.txt"
SUBJECT="Important Announcement"
BODY="This is an important announcement for all team members."

# Read recipients from file (one per line)
while IFS= read -r email; do
  # Skip empty lines and comments
  [[ -z "$email" || "$email" =~ ^# ]] && continue
  
  echo "Sending to: $email"
  
  if ! mailgoat send \
    --to "$email" \
    --subject "$SUBJECT" \
    --body "$BODY" \
    --tag "batch-announcement"; then
    
    echo "Failed to send to: $email" >&2
  fi
  
  # Rate limiting - wait 1 second between sends
  sleep 1
done < "$RECIPIENTS_FILE"

echo "Batch send complete"
```

### Template-Based Emails

```python
#!/usr/bin/env python3
"""
Template-based email sending
"""

from string import Template
import subprocess
import json

EMAIL_TEMPLATES = {
    'welcome': Template("""
        <html>
        <body>
            <h1>Welcome, $name!</h1>
            <p>Thanks for joining our service.</p>
            <p>Your account email is: <strong>$email</strong></p>
        </body>
        </html>
    """),
    
    'password_reset': Template("""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Hi $name,</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="$reset_link">Reset Password</a></p>
            <p>This link expires in 1 hour.</p>
        </body>
        </html>
    """)
}

def send_templated_email(template_name: str, to: str, subject: str, **kwargs):
    """Send email using a template"""
    if template_name not in EMAIL_TEMPLATES:
        raise ValueError(f"Unknown template: {template_name}")
    
    template = EMAIL_TEMPLATES[template_name]
    body = template.substitute(**kwargs)
    
    cmd = [
        'mailgoat', 'send',
        '--to', to,
        '--subject', subject,
        '--body', body,
        '--html',
        '--json'
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

# Usage
response = send_templated_email(
    'welcome',
    to='newuser@example.com',
    subject='Welcome to Our Service',
    name='Alice',
    email='newuser@example.com'
)

print(f"Welcome email sent: {response['message_id']}")
```

### Async Sending (Python)

```python
import asyncio
import subprocess
import json
from typing import List, Dict, Any

async def send_email_async(to: str, subject: str, body: str) -> Dict[str, Any]:
    """Send email asynchronously"""
    cmd = [
        'mailgoat', 'send',
        '--to', to,
        '--subject', subject,
        '--body', body,
        '--json'
    ]
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    stdout, stderr = await process.communicate()
    
    if process.returncode != 0:
        raise Exception(f"Failed to send: {stderr.decode()}")
    
    return json.loads(stdout.decode())

async def send_batch_async(emails: List[Dict[str, str]]):
    """Send multiple emails concurrently"""
    tasks = [
        send_email_async(email['to'], email['subject'], email['body'])
        for email in emails
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"Email {i} failed: {result}")
        else:
            print(f"Email {i} sent: {result['message_id']}")

# Usage
emails = [
    {'to': 'user1@example.com', 'subject': 'Test 1', 'body': 'Hello 1'},
    {'to': 'user2@example.com', 'subject': 'Test 2', 'body': 'Hello 2'},
    {'to': 'user3@example.com', 'subject': 'Test 3', 'body': 'Hello 3'},
]

asyncio.run(send_batch_async(emails))
```

## Configuration Patterns

### Multi-Environment Setup

```bash
# ~/.mailgoat/config.yml (production)
server: postal.production.com
email: agent@production.com
api_key: prod-key-here

# ~/.mailgoat/config.dev.yml (development)
server: postal.dev.com
email: agent@dev.com
api_key: dev-key-here

# Usage with custom config
mailgoat --config ~/.mailgoat/config.dev.yml send \
  --to test@example.com \
  --subject "Test" \
  --body "Hello"
```

### Environment Variables

```bash
#!/bin/bash
# Use environment variables for CI/CD

export MAILGOAT_SERVER="postal.example.com"
export MAILGOAT_EMAIL="ci@example.com"
export MAILGOAT_API_KEY="$CI_EMAIL_API_KEY"

# Generate config on-the-fly
cat > /tmp/mailgoat-ci.yml <<EOF
server: $MAILGOAT_SERVER
email: $MAILGOAT_EMAIL
api_key: $MAILGOAT_API_KEY
EOF

# Use temporary config
mailgoat --config /tmp/mailgoat-ci.yml send \
  --to team@example.com \
  --subject "Build Complete" \
  --body "CI build #$CI_BUILD_NUMBER completed successfully"
```

---

For more examples and use cases, see the [README](./README.md) and [API documentation](./docs/api.md).
