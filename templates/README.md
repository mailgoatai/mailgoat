# MailGoat Email Signature Templates

Professional email signatures for AI agents using MailGoat.

## 📋 Files

- `email-signature.html` - HTML template for rich email clients
- `email-signature.txt` - Plain text template for simple email clients
- `generate-signature.js` - Script to generate personalized signatures
- `README.md` - This file

## 🎨 Preview

### HTML Version

```
Developer 1
Software Engineer
OpenGoat

dev1@mailgoat.ai

────────────────────────────────────────────

🐐 Sent via MailGoat · Email for AI Agents
```

### Rendered Preview

![Email Signature Preview](preview.png)

_(Actual rendering in email clients)_

---

**Developer 1**  
Software Engineer  
OpenGoat

[dev1@mailgoat.ai](mailto:dev1@mailgoat.ai)

────────────────────────────────────────────

🐐 Sent via [MailGoat](https://mailgoat.ai) · Email for AI Agents

---

## 🚀 Quick Start

### Generate a signature

```bash
node generate-signature.js \
  --name "Developer 1" \
  --role "Software Engineer" \
  --email "dev1@mailgoat.ai" \
  --organization "OpenGoat"
```

Output files will be created in `generated/`:

- `developer-1.html`
- `developer-1.txt`

### Using a config file

Create `agent-config.json`:

```json
{
  "agent_name": "Developer 1",
  "agent_role": "Software Engineer",
  "agent_email": "dev1@mailgoat.ai",
  "agent_organization": "OpenGoat"
}
```

Generate signature:

```bash
node generate-signature.js --config agent-config.json
```

## 📝 Template Variables

| Variable                 | Description           | Example             | Required |
| ------------------------ | --------------------- | ------------------- | -------- |
| `{{AGENT_NAME}}`         | Agent's full name     | "Developer 1"       | ✅ Yes   |
| `{{AGENT_ROLE}}`         | Agent's role/title    | "Software Engineer" | ✅ Yes   |
| `{{AGENT_EMAIL}}`        | Agent's email address | "dev1@mailgoat.ai"  | ✅ Yes   |
| `{{AGENT_ORGANIZATION}}` | Organization name     | "OpenGoat"          | ❌ No    |

## 🎯 Features

### ✅ Mobile-Friendly

- Responsive table layout
- Readable on all screen sizes
- No fixed widths

### ✅ Dark Mode Compatible

- Uses semantic color values
- Gracefully degrades in dark mode
- Links remain visible

### ✅ No External Images

- Uses emoji for branding (🐐)
- Faster loading
- Works in all email clients
- No tracking

### ✅ Professional Design

- Clean, minimal aesthetic
- Proper spacing and hierarchy
- Consistent with MailGoat brand
- Works in Gmail, Outlook, Apple Mail, etc.

## 📧 Adding to Email Clients

### Gmail

1. Open Gmail Settings (gear icon → See all settings)
2. Go to "General" tab
3. Scroll to "Signature" section
4. Click "Create new" and name it (e.g., "MailGoat")
5. Copy content from `generated/your-name.html`
6. Paste into signature editor
7. Click "Save Changes"

### Apple Mail

1. Open Mail → Settings (⌘,)
2. Go to "Signatures" tab
3. Select your email account
4. Click "+" to create new signature
5. Copy content from `generated/your-name.html`
6. Paste into signature editor
7. Close settings (saves automatically)

### Outlook (Desktop)

1. File → Options → Mail → Signatures
2. Click "New" to create signature
3. Copy content from `generated/your-name.html`
4. Paste into signature editor
5. Click "OK" to save

### Thunderbird

1. Tools → Account Settings
2. Select your account
3. Check "Attach the signature from a file instead"
4. Browse to `generated/your-name.html`
5. Select "Use HTML" format
6. Click "OK"

## 🛠️ Customization

### Changing Colors

Edit the HTML template and modify these inline styles:

```html
<!-- Agent name color -->
color: #1a1a1a;

<!-- Role/org color -->
color: #666666;

<!-- Email link color (MailGoat green) -->
color: #3dd68c;

<!-- Branding text color -->
color: #999999;
```

### Changing Font

Replace the font-family in the table element:

```html
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
```

### Adding Social Links

Add this after the email link:

```html
<div style="margin-top: 8px;">
  <a
    href="https://github.com/yourusername"
    style="color: #3dd68c; text-decoration: none; margin-right: 12px;"
    >GitHub</a
  >
  <a href="https://twitter.com/yourusername" style="color: #3dd68c; text-decoration: none;"
    >Twitter</a
  >
</div>
```

### Removing Organization Line

Simply delete this line from the template:

```html
<div style="font-size: 14px; color: #666666;">{{AGENT_ORGANIZATION}}</div>
```

## 🧪 Testing

### Test in multiple clients

1. Send test email to yourself from:
   - Gmail
   - Outlook
   - Apple Mail
   - Thunderbird

2. Check rendering in:
   - Light mode
   - Dark mode
   - Mobile view
   - Desktop view

### Validation

HTML should be:

- ✅ Valid HTML5
- ✅ Inline styles only (no external CSS)
- ✅ Table-based layout (email client compatible)
- ✅ No JavaScript
- ✅ No external images
- ✅ Accessible (semantic markup)

## 📊 Analytics (Optional)

The MailGoat link includes UTM parameters:

```
https://mailgoat.ai?utm_source=signature&utm_medium=email
```

This allows tracking how many people discover MailGoat through email signatures.

To disable tracking, remove the query parameters:

```html
<a href="https://mailgoat.ai">MailGoat</a>
```

## 🤝 Contributing

Improvements welcome! Consider:

- Alternative design layouts
- Additional color schemes
- More customization options
- Support for additional template variables

## 📄 License

MIT License - Same as MailGoat project

## 💬 Support

Questions or issues?

- GitHub: https://github.com/opengoat/mailgoat
- Discord: https://discord.gg/mailgoat
- Docs: https://docs.mailgoat.ai

---

Built with 🐐 by the OpenGoat organization
