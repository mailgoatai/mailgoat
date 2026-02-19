---
title: send
---

Send an email message

## Usage

```bash
mailgoat send --help
```

## Common Options

- CC recipients
- BCC recipients
- Treat body as HTML instead of plain text
- Custom tag for this message
- Attach file (repeat flag for multiple attachments)
- Use email template
- Template variables (e.g., --var name=John --var age=30)
- JSON file with template variables
- Schedule send time in local timezone (YYYY-MM-DD HH:mm)
- Validate and preview message without sending
- Show timing breakdown for this command
- Disable automatic retry on failure (for debugging)
- Output result as JSON
