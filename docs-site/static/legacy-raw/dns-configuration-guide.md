# DNS Configuration Guide for mailgoat.ai Email

**Purpose:** Configure all DNS records required for email delivery with Postal

**⚠️ Prerequisites Required Before Starting:**

1. **Postal server IP address** - Get from hosting provider or Postal deployment
2. **DKIM public key** - Get from Postal admin panel (Settings → DKIM)
3. **DNS provider access** - Cloudflare, Route53, Namecheap, etc.

---

## DNS Records to Configure (6 total)

### 1. MX Record (Mail Exchange)

**Purpose:** Tells the internet where to deliver emails for @mailgoat.ai

**Record:**

```
Type: MX
Name: mailgoat.ai (or @)
Priority: 10
Value: mail.mailgoat.ai
TTL: 3600 (or Auto)
```

**Cloudflare Example:**

- Type: MX
- Name: @
- Mail server: mail.mailgoat.ai
- Priority: 10
- TTL: Auto

---

### 2. A Record (Mail Server IP)

**Purpose:** Points mail.mailgoat.ai to the Postal server IP

**Record:**

```
Type: A
Name: mail.mailgoat.ai (or mail)
Value: <POSTAL_SERVER_IP>
TTL: 3600
```

**Example:**

```
Type: A
Name: mail
Value: 203.0.113.50  ← Replace with actual IP
TTL: 3600
```

**How to find the IP:**

- Check your Postal server hosting dashboard
- SSH into server: `curl ifconfig.me`
- Ask hosting provider for server IP

---

### 3. SPF Record (Sender Policy Framework)

**Purpose:** Authorizes mail.mailgoat.ai to send email on behalf of mailgoat.ai

**Record:**

```
Type: TXT
Name: mailgoat.ai (or @)
Value: v=spf1 mx ~all
TTL: 3600
```

**What it means:**

- `v=spf1` - SPF version 1
- `mx` - Allow mail exchangers (mail.mailgoat.ai) to send
- `~all` - Soft fail for others (mark as spam but don't reject)

**Alternative (stricter):**

```
v=spf1 a:mail.mailgoat.ai ~all
```

---

### 4. DKIM Record (DomainKeys Identified Mail)

**Purpose:** Cryptographic signature proving emails are from mailgoat.ai

**Record:**

```
Type: TXT
Name: postal._domainkey.mailgoat.ai (or postal._domainkey)
Value: v=DKIM1; k=rsa; p=<PUBLIC_KEY>
TTL: 3600
```

**How to get the public key:**

1. Log into Postal admin panel
2. Go to **Settings** → **DKIM** (or **Domains** → mailgoat.ai → **DKIM**)
3. Copy the public key (long string starting with `MIIB...`)
4. Paste into DNS record

**Example:**

```
Type: TXT
Name: postal._domainkey
Value: v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
TTL: 3600
```

**⚠️ Important:**

- The public key is usually 300-400 characters long
- Some DNS providers require splitting long TXT records into 255-character chunks
- Copy the entire key without line breaks or spaces

---

### 5. DMARC Record (Domain-based Message Authentication)

**Purpose:** Tells receiving servers what to do if SPF/DKIM fail

**Record:**

```
Type: TXT
Name: _dmarc.mailgoat.ai (or _dmarc)
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@mailgoat.ai
TTL: 3600
```

**What it means:**

- `v=DMARC1` - DMARC version 1
- `p=none` - Don't reject failed emails (monitoring only)
- `rua=mailto:...` - Send aggregate reports here

**Progressive enforcement:**

1. Start with `p=none` (monitor only)
2. After 2-4 weeks, change to `p=quarantine` (mark as spam)
3. After another month, change to `p=reject` (full enforcement)

**Alternative (stricter):**

```
v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc-reports@mailgoat.ai
```

(Quarantine 10% of failed emails as a test)

---

### 6. PTR Record (Reverse DNS)

**Purpose:** Maps IP address back to mail.mailgoat.ai (improves deliverability)

**⚠️ Special Note:** This is configured at your **hosting provider** (not DNS provider)

**Record:**

```
Type: PTR
IP: <POSTAL_SERVER_IP>
Value: mail.mailgoat.ai
```

**How to configure:**

**For AWS/DigitalOcean/Linode:**

1. Go to hosting provider dashboard
2. Find "Reverse DNS" or "PTR Record" settings
3. Set PTR for server IP to: mail.mailgoat.ai

**For Cloudflare/Namecheap DNS:**
You **cannot** configure PTR records here. Contact your server hosting provider.

**How to verify:**

```bash
dig -x <SERVER_IP>
# Should return: mail.mailgoat.ai
```

---

## DNS Provider Instructions

### Cloudflare

1. Log into Cloudflare dashboard
2. Select mailgoat.ai domain
3. Go to **DNS** → **Records**
4. Click **Add record** for each DNS record above
5. Save each record

### AWS Route 53

1. Open Route 53 console
2. Select hosted zone: mailgoat.ai
3. Click **Create record**
4. Choose record type (MX, A, TXT)
5. Fill in Name, Value, TTL
6. Click **Create records**

### Namecheap

1. Log into Namecheap account
2. Go to **Domain List** → mailgoat.ai → **Manage**
3. Go to **Advanced DNS** tab
4. Click **Add New Record**
5. Select type, fill in details
6. Save changes

---

## Verification & Testing

### 1. Check DNS Propagation

**Wait 5-15 minutes after creating records, then:**

```bash
# Check MX record
dig MX mailgoat.ai +short
# Expected: 10 mail.mailgoat.ai.

# Check A record
dig A mail.mailgoat.ai +short
# Expected: <SERVER_IP>

# Check SPF
dig TXT mailgoat.ai +short
# Expected: "v=spf1 mx ~all"

# Check DKIM
dig TXT postal._domainkey.mailgoat.ai +short
# Expected: "v=DKIM1; k=rsa; p=MIIB..."

# Check DMARC
dig TXT _dmarc.mailgoat.ai +short
# Expected: "v=DMARC1; p=none; rua=mailto:..."

# Check PTR (reverse)
dig -x <SERVER_IP> +short
# Expected: mail.mailgoat.ai.
```

### 2. Use Online Tools

**MX Toolbox (comprehensive):**
https://mxtoolbox.com/domain/mailgoat.ai

✅ Green checks mean everything is configured correctly

**DNS Checker (propagation):**
https://dnschecker.org/#MX/mailgoat.ai

Shows DNS records from different geographic locations

**Mail Tester (send test):**
https://www.mail-tester.com

Send a test email and get a deliverability score out of 10

### 3. Send Test Email

Once DNS propagates (1-24 hours):

```bash
# Using MailGoat CLI (if you have credentials)
mailgoat send \
  --from test@mailgoat.ai \
  --to youremail@gmail.com \
  --subject "DNS Test" \
  --body "Testing SPF/DKIM/DMARC"

# Check email headers in Gmail:
# 1. Open email
# 2. Click three dots → "Show original"
# 3. Look for:
#    - SPF: PASS
#    - DKIM: PASS
#    - DMARC: PASS
```

---

## Troubleshooting

### Problem: MX record not found

**Solution:**

- Wait 30 minutes for DNS propagation
- Check you used `@` for root domain (not `mailgoat.ai.` with trailing dot)
- Verify record is saved in DNS provider dashboard

### Problem: DKIM key too long

**Solution:**
Some DNS providers (GoDaddy, Namecheap) have 255-character TXT record limits.

Split the key into chunks:

```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr
"1234567890abcdef..." "more_characters_here..."
```

Or switch to a better DNS provider (Cloudflare has no limit)

### Problem: PTR record missing

**Solution:**
PTR records are set at the **hosting provider**, not DNS provider.

- DigitalOcean: Droplet Settings → Networking → PTR
- AWS: Request form for reverse DNS
- Linode: Networking tab → Reverse DNS

### Problem: Emails going to spam

**Checklist:**

- [ ] SPF record exists and validates
- [ ] DKIM record exists with correct public key
- [ ] DMARC record exists
- [ ] PTR record points to mail.mailgoat.ai
- [ ] Server IP not on blacklists (check MX Toolbox)
- [ ] Sending from established domain (not brand new)

---

## Timeline

| Task                 | Duration      |
| -------------------- | ------------- |
| Create DNS records   | 15-30 minutes |
| DNS propagation      | 1-24 hours    |
| Test email delivery  | 10 minutes    |
| Monitor for 48 hours | Ongoing       |

**Total:** 1 hour of work + 24-48 hours waiting for propagation

---

## Security Checklist

- [ ] MX record points to mail.mailgoat.ai
- [ ] A record has correct server IP
- [ ] SPF record authorizes mail server
- [ ] DKIM public key from Postal admin panel
- [ ] DMARC starts with `p=none` (monitoring)
- [ ] PTR record configured at hosting provider
- [ ] All records verified with `dig` commands
- [ ] MX Toolbox shows green checks
- [ ] Test email passes SPF/DKIM/DMARC

---

## Next Steps

Once DNS is configured and verified:

1. Create email accounts in Postal (see `/docs/postal-account-setup-guide.md`)
2. Generate API credentials for agents
3. Test sending/receiving emails
4. Monitor DMARC reports for issues
5. After 2-4 weeks, consider tightening DMARC policy to `p=quarantine`

---

**Questions?** Check Postal documentation or MX Toolbox for validation errors.
