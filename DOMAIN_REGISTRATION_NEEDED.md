# 🚨 Action Required: Register mailgoat.ai Domain

**Status:** Critical path blocker for MailGoat launch  
**Time Required:** 15 minutes  
**Cost:** ~$12/year  
**Target:** This week (by Feb 20-21)

---

## Summary

Two agents are blocked and ready to execute immediately once domain is registered:

- **Marketing Growth Lead:** Landing page built and ready to deploy (5 minutes)
- **BizOps Lead:** All infrastructure docs ready, DNS configs prepared

**Total time from domain registration to live website:** ~20 minutes

---

## What You Need to Do

### Step 1: Register Domain (10 minutes)

1. **Go to:** https://www.cloudflare.com/products/registrar/
2. **Create/login** to Cloudflare account
3. **Search for:** `mailgoat.ai`
4. **Register** the domain
5. **Cost:** ~$12/year (Cloudflare at-cost pricing)

**Why Cloudflare?**

- At-cost pricing (cheapest)
- Best DNS performance
- Free DDoS protection
- Agents can manage DNS via API

### Step 2: Save Credentials (2 minutes)

Save these securely (password manager):

- Cloudflare account email
- Cloudflare account password
- Domain registrant details

### Step 3: Notify Agents (1 minute)

Post in webchat or update the task:

```
@marketing-growth @bizops-lead - mailgoat.ai domain registered!
Cloudflare credentials: [share securely]
```

---

## What Happens Next (Automated)

Once you notify the agents:

**Within 5 minutes:**

- Marketing Growth deploys landing page to Vercel/Netlify
- BizOps configures DNS records

**Within 20 minutes:**

- Landing page live at mailgoat.ai
- SSL configured automatically
- Email forwarding set up

**Within 24-48 hours:**

- DNS fully propagated globally
- Ready for launch activities

---

## Complete Documentation

All the detailed guides are ready:

- **Setup Guide:** `/home/node/.opengoat/workspaces/bizops-lead/mailgoat-setup-guide.md`
- **Deployment Guide:** `/home/node/.opengoat/organization/website/DEPLOY.md`
- **Operations Doc:** `/home/node/.opengoat/organization/docs/operations.md`
- **Handoff Doc:** `/home/node/.opengoat/organization/website/HANDOFF.md`

---

## Alternative: Delegate to Someone Else

If you don't want to register the domain yourself, you can delegate to anyone with:

- Payment method (credit card)
- 15 minutes of time
- Ability to follow the setup guide

Just share the guides above and have them notify the agents when done.

---

## Questions?

- **Cost concerns?** $12/year is standard for .ai domains
- **Why this week?** Late-Feb launch window (Feb 24-28) needs infrastructure ready
- **Why Cloudflare?** At-cost pricing + API access for agents
- **Security?** Cloudflare has excellent security, agents can manage DNS safely

---

**This is the only human action blocking two agents' work.** Once complete, everything else is automated.

Contact @ceo (me) or @bizops-lead with questions!
