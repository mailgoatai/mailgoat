# Agent Integration

How to use MailGoat from AI agents, scripts, and automation systems.

## Overview

MailGoat is built for programmatic use. This guide shows how to integrate it with agents and automation workflows.

**Key patterns:**
- ✅ Use `--json` flag for machine-readable output
- ✅ Parse exit codes for error handling
- ✅ Set environment variables for credentials
- ✅ Use message IDs for tracking
- ✅ Implement retry logic for network errors

## OpenClaw Integration

### Basic Email Sending

```javascript
// File: mailgoat-skill.js
const { execSync } = require('child_process');

function sendEmail(to, subject, body) {
  try {
    const output = execSync(
      `mailgoat send --to "${to}" --subject "${subject}" --body "${body}" --json`,
      { encoding: 'utf-8' }
    );
    
    const result = JSON.parse(output);
    console.log(`✓ Email sent. Message ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error.message);
    throw error;
  }
}

// Usage
sendEmail(
  'user@example.com',
  'Daily Report',
  'Here is your daily summary...'
);
```

### Full OpenClaw Skill Example

```javascript
// File: ~/.openclaw/skills/mailgoat/index.js
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class MailGoatSkill {
  constructor() {
    this.name = 'mailgoat';
    this.description = 'Send and read emails via MailGoat';
  }

  async send({ to, subject, body, html = false }) {
    const htmlFlag = html ? '--html' : '';
    const command = `mailgoat send --to "${to}" --subject "${subject}" --body "${body}" ${htmlFlag} --json`;
    
    try {
      const { stdout } = await execAsync(command);
      const result = JSON.parse(stdout);
      
      if (!result.success) {
        throw new Error('Send failed: ' + result.error);
      }
      
      return {
        success: true,
        messageId: result.messageId,
        from: result.from,
        to: result.to
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async read(messageId) {
    const command = `mailgoat read ${messageId} --json`;
    
    try {
      const { stdout } = await execAsync(command);
      const message = JSON.parse(stdout);
      
      return {
        success: true,
        message: {
          id: message.id,
          from: message.from,
          to: message.to,
          subject: message.subject,
          body: message.body,
          date: message.date
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendWithRetry(params, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.send(params);
      
      if (result.success) {
        return result;
      }
      
      if (attempt < maxRetries) {
        console.log(`Retry ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('Failed after ' + maxRetries + ' attempts');
  }
}

module.exports = new MailGoatSkill();
```

### OpenClaw Usage

```javascript
// In your OpenClaw agent
const mailgoat = require('./skills/mailgoat');

// Send email
const result = await mailgoat.send({
  to: 'user@example.com',
  subject: 'Task Complete',
  body: 'Your requested task has been completed.'
});

console.log('Sent:', result.messageId);

// Read email
const message = await mailgoat.read('abc123def456');
console.log('Subject:', message.message.subject);

// Send with retry (for flaky networks)
const reliableResult = await mailgoat.sendWithRetry({
  to: 'important@example.com',
  subject: 'Critical Alert',
  body: 'This email will retry if it fails'
});
```

## Python Integration

### Basic Example

```python
#!/usr/bin/env python3
import subprocess
import json
import sys

def send_email(to, subject, body, html=False):
    """Send an email via MailGoat CLI"""
    cmd = [
        'mailgoat', 'send',
        '--to', to,
        '--subject', subject,
        '--body', body,
        '--json'
    ]
    
    if html:
        cmd.append('--html')
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        data = json.loads(result.stdout)
        return data
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}", file=sys.stderr)
        sys.exit(e.returncode)

def read_email(message_id):
    """Read an email by message ID"""
    cmd = ['mailgoat', 'read', message_id, '--json']
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}", file=sys.stderr)
        return None

# Usage
if __name__ == '__main__':
    # Send email
    result = send_email(
        to='user@example.com',
        subject='Python Test',
        body='Sent from Python script'
    )
    
    print(f"✓ Sent message: {result['messageId']}")
    
    # Read email
    message = read_email(result['messageId'])
    if message:
        print(f"Subject: {message['subject']}")
        print(f"Body: {message['body']}")
```

### Agent Class (Reusable)

```python
#!/usr/bin/env python3
import subprocess
import json
import time
from typing import Optional, Dict, Any

class MailGoatAgent:
    """Python agent for MailGoat email operations"""
    
    def __init__(self):
        self.cli = 'mailgoat'
    
    def send(
        self,
        to: str,
        subject: str,
        body: str,
        html: bool = False,
        cc: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send an email"""
        cmd = [
            self.cli, 'send',
            '--to', to,
            '--subject', subject,
            '--body', body,
            '--json'
        ]
        
        if html:
            cmd.append('--html')
        if cc:
            cmd.extend(['--cc', cc])
        if bcc:
            cmd.extend(['--bcc', bcc])
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return {
                'success': False,
                'error': result.stderr,
                'exitCode': result.returncode
            }
        
        data = json.loads(result.stdout)
        return {
            'success': True,
            **data
        }
    
    def read(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Read an email by message ID"""
        result = subprocess.run(
            [self.cli, 'read', message_id, '--json'],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return None
        
        return json.loads(result.stdout)
    
    def send_with_retry(
        self,
        to: str,
        subject: str,
        body: str,
        max_retries: int = 3,
        **kwargs
    ) -> Dict[str, Any]:
        """Send email with automatic retry"""
        for attempt in range(1, max_retries + 1):
            result = self.send(to, subject, body, **kwargs)
            
            if result['success']:
                return result
            
            if attempt < max_retries:
                print(f"Retry {attempt}/{max_retries}...")
                time.sleep(attempt)  # Exponential backoff
        
        return result
    
    def send_batch(self, emails: list) -> list:
        """Send multiple emails"""
        results = []
        
        for email in emails:
            result = self.send(**email)
            results.append(result)
            time.sleep(0.5)  # Rate limiting
        
        return results

# Usage example
if __name__ == '__main__':
    agent = MailGoatAgent()
    
    # Send single email
    result = agent.send(
        to='user@example.com',
        subject='Hello from Agent',
        body='This is an automated message'
    )
    
    if result['success']:
        print(f"✓ Sent: {result['messageId']}")
    else:
        print(f"✗ Failed: {result['error']}")
    
    # Send batch
    emails = [
        {'to': 'user1@example.com', 'subject': 'Report 1', 'body': '...'},
        {'to': 'user2@example.com', 'subject': 'Report 2', 'body': '...'},
    ]
    
    results = agent.send_batch(emails)
    print(f"Sent {sum(1 for r in results if r['success'])}/{len(results)} emails")
```

## Bash Automation

### Simple Monitoring Script

```bash
#!/bin/bash
# File: monitor.sh
# Sends email alerts when disk usage exceeds threshold

THRESHOLD=80
ALERT_EMAIL="admin@example.com"

# Get disk usage
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ "$USAGE" -gt "$THRESHOLD" ]; then
  mailgoat send \
    --to "$ALERT_EMAIL" \
    --subject "⚠️ Disk Usage Alert" \
    --body "Disk usage is ${USAGE}% (threshold: ${THRESHOLD}%)" \
    --json > /tmp/alert.json
  
  if [ $? -eq 0 ]; then
    echo "Alert sent successfully"
  else
    echo "Failed to send alert"
    exit 1
  fi
fi
```

### Daily Report Generator

```bash
#!/bin/bash
# File: daily-report.sh
# Generates and emails a daily system report

REPORT_EMAIL="team@example.com"
REPORT_FILE="/tmp/daily-report.txt"

# Generate report
cat > "$REPORT_FILE" << EOF
Daily System Report - $(date '+%Y-%m-%d')

System Information:
- Hostname: $(hostname)
- Uptime: $(uptime -p)
- Load Average: $(uptime | awk -F'load average:' '{print $2}')

Disk Usage:
$(df -h | grep -v tmpfs)

Memory Usage:
$(free -h)

Top Processes:
$(ps aux --sort=-%mem | head -6)

Recent Errors:
$(journalctl -p err -n 10 --no-pager)
EOF

# Send report
mailgoat send \
  --to "$REPORT_EMAIL" \
  --subject "Daily Report - $(date '+%Y-%m-%d')" \
  --body "$(cat $REPORT_FILE)" \
  --json

if [ $? -eq 0 ]; then
  echo "Report sent successfully"
  rm -f "$REPORT_FILE"
else
  echo "Failed to send report"
  exit 1
fi
```

### Email Command Processor

```bash
#!/bin/bash
# File: command-processor.sh
# Reads emails and executes commands (for inbox-driven automation)

MESSAGE_ID="$1"

if [ -z "$MESSAGE_ID" ]; then
  echo "Usage: $0 <message-id>"
  exit 1
fi

# Read the message
MESSAGE=$(mailgoat read "$MESSAGE_ID" --json)

if [ $? -ne 0 ]; then
  echo "Failed to read message"
  exit 1
fi

# Parse subject and body
SUBJECT=$(echo "$MESSAGE" | jq -r '.subject')
BODY=$(echo "$MESSAGE" | jq -r '.body')
FROM=$(echo "$MESSAGE" | jq -r '.from')

echo "Processing command from $FROM: $SUBJECT"

# Execute based on subject
case "$SUBJECT" in
  "CMD: deploy")
    echo "Deploying application..."
    ./deploy.sh
    RESULT="Deployment complete"
    ;;
  
  "CMD: status")
    RESULT="$(systemctl status myapp)"
    ;;
  
  "CMD: restart")
    echo "Restarting service..."
    systemctl restart myapp
    RESULT="Service restarted"
    ;;
  
  *)
    RESULT="Unknown command: $SUBJECT"
    ;;
esac

# Send response
mailgoat send \
  --to "$FROM" \
  --subject "Re: $SUBJECT" \
  --body "$RESULT" \
  --json

echo "Response sent to $FROM"
```

## JSON Parsing Tips

### Using jq (Bash)

```bash
# Extract message ID
MESSAGE_ID=$(mailgoat send --to user@example.com --subject "Test" --body "Hello" --json | jq -r '.messageId')

# Check if send was successful
RESULT=$(mailgoat send --to user@example.com --subject "Test" --body "Hello" --json)
SUCCESS=$(echo "$RESULT" | jq -r '.success')

if [ "$SUCCESS" = "true" ]; then
  echo "Email sent!"
fi

# Parse multiple fields
mailgoat read abc123 --json | jq -r '{from, subject, date}'
```

### Using Python json module

```python
import json
import subprocess

result = subprocess.run(
    ['mailgoat', 'send', '--to', 'user@example.com', '--subject', 'Test', '--body', 'Hello', '--json'],
    capture_output=True,
    text=True
)

data = json.loads(result.stdout)
print(f"Message ID: {data['messageId']}")
print(f"From: {data['from']}")
print(f"Success: {data['success']}")
```

### Using Node.js

```javascript
const { execSync } = require('child_process');

const output = execSync(
  'mailgoat send --to user@example.com --subject "Test" --body "Hello" --json',
  { encoding: 'utf-8' }
);

const result = JSON.parse(output);
console.log('Message ID:', result.messageId);
console.log('Success:', result.success);
```

## Error Handling Patterns

### Check Exit Codes (Bash)

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello"
EXIT_CODE=$?

case $EXIT_CODE in
  0)
    echo "✓ Success"
    ;;
  1)
    echo "✗ Invalid arguments"
    ;;
  2)
    echo "✗ Authentication failed"
    ;;
  3)
    echo "✗ Network error"
    ;;
  4)
    echo "✗ API error"
    ;;
  *)
    echo "✗ Unknown error (exit code: $EXIT_CODE)"
    ;;
esac
```

### Try-Catch (Python)

```python
import subprocess
import sys

try:
    result = subprocess.run(
        ['mailgoat', 'send', '--to', 'user@example.com', '--subject', 'Test', '--body', 'Hello'],
        capture_output=True,
        text=True,
        check=True
    )
    print("✓ Email sent")
except subprocess.CalledProcessError as e:
    if e.returncode == 2:
        print("✗ Authentication failed - check API key")
    elif e.returncode == 3:
        print("✗ Network error - check server connectivity")
    else:
        print(f"✗ Failed with exit code {e.returncode}")
        print(e.stderr)
    sys.exit(1)
```

### Retry Logic (Node.js)

```javascript
async function sendWithRetry(params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const output = execSync(
        `mailgoat send --to "${params.to}" --subject "${params.subject}" --body "${params.body}" --json`,
        { encoding: 'utf-8' }
      );
      
      const result = JSON.parse(output);
      return result; // Success!
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Give up
      }
      
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Usage
try {
  const result = await sendWithRetry({
    to: 'user@example.com',
    subject: 'Important',
    body: 'This will retry on failure'
  });
  console.log('Sent:', result.messageId);
} catch (error) {
  console.error('Failed after retries:', error.message);
}
```

## Best Practices

### 1. Use Environment Variables for Credentials

```bash
# Export in ~/.bashrc or ~/.zshrc
export MAILGOAT_API_KEY=your-api-key-here
export MAILGOAT_SERVER=postal.example.com
export MAILGOAT_EMAIL=agent@example.com
```

### 2. Always Use --json in Scripts

```bash
# ✗ Bad (human-readable output is unpredictable)
mailgoat send --to user@example.com --subject "Test" --body "Hello"

# ✓ Good (JSON output is consistent)
mailgoat send --to user@example.com --subject "Test" --body "Hello" --json
```

### 3. Check Exit Codes

```bash
if mailgoat send --to user@example.com --subject "Test" --body "Hello"; then
  echo "Success"
else
  echo "Failed"
  exit 1
fi
```

### 4. Log Message IDs

```bash
MESSAGE_ID=$(mailgoat send ... --json | jq -r '.messageId')
echo "$(date): Sent message $MESSAGE_ID" >> /var/log/mailgoat-agent.log
```

### 5. Rate Limiting

```bash
# Send batch with delay
for email in email1@example.com email2@example.com; do
  mailgoat send --to "$email" --subject "Newsletter" --body "..."
  sleep 1  # 1 email per second
done
```

## See Also

- [CLI Reference](cli-reference.md) - Complete command documentation
- [Configuration](configuration.md) - Environment variables and profiles
- [Examples](https://github.com/opengoat/mailgoat/tree/main/examples) - More integration examples
- [FAQ](faq.md) - Common questions
