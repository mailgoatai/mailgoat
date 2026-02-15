# Postal Account Setup Guide for MailGoat Agents

**Purpose:** Create email accounts and API credentials for all 13 OpenGoat agents

**Prerequisites:**
- Access to Postal web UI (admin account)
- Postal server with mailgoat.ai domain already configured
- 1Password or secure storage for credentials

---

## Accounts to Create (13 total)

| Agent | Email | Purpose |
|-------|-------|---------|
| ceo | ceo@mailgoat.ai | CEO communications |
| lead-engineer | lead-engineer@mailgoat.ai | Technical leadership |
| product-lead | product@mailgoat.ai | Product management |
| developer-1 | dev1@mailgoat.ai | Development team member |
| developer-2 | dev2@mailgoat.ai | Development team member |
| developer-3 | dev3@mailgoat.ai | Development team member |
| qa | qa@mailgoat.ai | Quality assurance |
| devrel | devrel@mailgoat.ai | Developer relations |
| bizops-lead | bizops@mailgoat.ai | Business operations |
| growth-lead | growth@mailgoat.ai | Growth strategy |
| marketing-growth | marketing@mailgoat.ai | Marketing |
| team | team@mailgoat.ai | General team communications |
| support | support@mailgoat.ai | Customer support |

---

## Step-by-Step Instructions

### Step 1: Access Postal Web UI

1. Navigate to your Postal instance (e.g., `https://postal.mailgoat.ai` or wherever it's hosted)
2. Log in with admin credentials
3. Select the mail server for mailgoat.ai

### Step 2: Create Email Addresses (Repeat 13x)

For **each agent** in the table above:

1. Go to **Mail Server** → **Addresses** (or **Users** / **Mailboxes** depending on Postal version)
2. Click **Add Address** or **New Mailbox**
3. Fill in:
   - **Address:** Use the email from the table (e.g., `ceo`, `dev1`, etc.)
   - **Domain:** mailgoat.ai
   - **Password:** Leave empty (API-only access, no IMAP/SMTP login needed)
   - **Name/Display Name:** Optional - use the role (e.g., "CEO", "Developer 1")
4. Click **Create** or **Save**

**Tip:** Do this for all 13 addresses before moving to API credentials.

### Step 3: Generate API Credentials (Repeat 13x)

For **each agent**:

1. Go to **Mail Server** → **Credentials** (or **API Keys**)
2. Click **New Credential** or **Generate API Key**
3. Fill in:
   - **Name:** `MailGoat CLI - <agent-name>` (e.g., "MailGoat CLI - ceo", "MailGoat CLI - developer-1")
   - **Type:** API credential (not SMTP/IMAP)
   - **Permissions:** Full access (send + receive)
4. Click **Create**
5. **IMPORTANT:** Copy the API key immediately (it's only shown once!)
6. Paste it into your secure notes or the template below

### Step 4: Document Credentials Securely

Create a secure document (NOT in git) with this format:

```markdown
# MailGoat Agent Email Credentials
# Store in 1Password, Bitwarden, or secure vault
# DO NOT COMMIT TO GIT

## Credentials

ceo@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

lead-engineer@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

product@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

dev1@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

dev2@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

dev3@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

qa@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

devrel@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

bizops@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

growth@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

marketing@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

team@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

support@mailgoat.ai
API Key: postal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 5: Create Config Templates for Each Agent

For each agent workspace, create `~/.mailgoat/config.yml`:

```yaml
# MailGoat CLI Configuration
server: mail.mailgoat.ai
email: <agent-email>@mailgoat.ai
api_key: <api-key-from-step-4>
```

**Example for CEO:**
```yaml
server: mail.mailgoat.ai
email: ceo@mailgoat.ai
api_key: postal_abc123...
```

---

## Security Checklist

- [ ] All 13 email addresses created
- [ ] All 13 API credentials generated
- [ ] Credentials stored in 1Password or secure vault
- [ ] Credentials NOT committed to git
- [ ] Each agent gets only their own API key (not shared)
- [ ] Config templates prepared for deployment

---

## Testing

After setup, test one account:

```bash
# Test sending (replace with actual credentials)
mailgoat send \
  --server mail.mailgoat.ai \
  --api-key postal_xxx... \
  --from ceo@mailgoat.ai \
  --to test@example.com \
  --subject "Test from MailGoat" \
  --body "This is a test email"

# Or use config file
echo "server: mail.mailgoat.ai
email: ceo@mailgoat.ai
api_key: postal_xxx..." > ~/.mailgoat/config.yml

mailgoat send --to test@example.com --subject "Test" --body "Hello"
```

---

## Troubleshooting

**Problem:** Can't create address - "Domain not found"
- **Solution:** Ensure mailgoat.ai domain is added to the mail server first

**Problem:** API key not working
- **Solution:** Check that the credential has send/receive permissions enabled

**Problem:** Lost API key
- **Solution:** Delete the old credential and generate a new one (API keys can't be retrieved)

---

## Next Steps

Once complete:
1. Update task status to DONE
2. Distribute credentials to Lead Engineer for workspace setup
3. Test sending/receiving with at least 2 agents
4. Document any issues encountered

---

**Estimated Time:** 45-60 minutes for all 13 accounts
