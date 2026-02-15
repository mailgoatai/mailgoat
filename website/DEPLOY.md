# Deployment Guide - MailGoat Landing Page

Quick deployment guide for mailgoat.ai landing page.

## Pre-Deployment Checklist

- [ ] Domain mailgoat.ai registered
- [ ] Hosting provider account created (Vercel/Netlify recommended)
- [ ] GitHub repo is public (for linking)
- [ ] Discord server created (for community link)
- [ ] Social media image created (og-image.png)

## Quick Deploy with Vercel (5 minutes)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

### 3. Deploy

```bash
cd /home/node/.opengoat/organization/website
vercel --prod
```

### 4. Configure Domain

```bash
# Add custom domain
vercel domains add mailgoat.ai

# Follow DNS instructions provided by Vercel
# Usually:
# A record @ → 76.76.21.21
# CNAME www → cname.vercel-dns.com
```

### 5. Verify

- Visit https://mailgoat.ai
- Check SSL certificate (should be automatic)
- Test mobile responsiveness
- Run Lighthouse audit (target 95+ score)

## Quick Deploy with Netlify (5 minutes)

### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
```

### 2. Login to Netlify

```bash
netlify login
```

### 3. Deploy

```bash
cd /home/node/.opengoat/organization/website
netlify init

# Follow prompts:
# - Create & configure a new site
# - Set build command: (leave empty)
# - Set publish directory: .

netlify deploy --prod
```

### 4. Configure Domain

In Netlify dashboard:
1. Go to Domain Settings
2. Add custom domain: mailgoat.ai
3. Follow DNS configuration instructions
4. SSL will be automatically provisioned

## DNS Configuration

### Required DNS Records

**For Vercel:**
```
Type  Name  Value
A     @     76.76.21.21
CNAME www   cname.vercel-dns.com
```

**For Netlify:**
```
Type  Name  Value
A     @     75.2.60.5
CNAME www   [your-site].netlify.app
```

### Propagation Time

DNS changes can take 1-48 hours to propagate globally. Check status:
```bash
dig mailgoat.ai
dig www.mailgoat.ai
```

## Post-Deployment

### 1. Test Core Functionality

- [ ] Page loads in < 2 seconds
- [ ] All links work (GitHub, Discord, Docs)
- [ ] Mobile responsive on various devices
- [ ] SSL certificate valid
- [ ] Social media preview working (test in Discord/Slack/Twitter)

### 2. Performance Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run audit
lighthouse https://mailgoat.ai --view

# Target scores:
# Performance: 95+
# Accessibility: 95+
# Best Practices: 95+
# SEO: 95+
```

### 3. SEO Verification

- [ ] Google Search Console setup
- [ ] Submit sitemap (if needed)
- [ ] Verify robots.txt
- [ ] Test social media preview cards:
  - Twitter: https://cards-dev.twitter.com/validator
  - Facebook: https://developers.facebook.com/tools/debug/
  - LinkedIn: https://www.linkedin.com/post-inspector/

### 4. Analytics (Optional)

If desired, add lightweight analytics:
- Plausible (privacy-focused)
- Simple Analytics
- Umami (self-hosted option)

**Do NOT use:** Google Analytics (privacy concerns, heavy weight)

## Updating the Site

### With Vercel

```bash
cd /home/node/.opengoat/organization/website
# Make changes to index.html
vercel --prod
```

### With Netlify

```bash
cd /home/node/.opengoat/organization/website
# Make changes to index.html
netlify deploy --prod
```

### Git-Based Deployment (Recommended for Production)

1. Push website folder to GitHub repo
2. Connect repo to Vercel/Netlify
3. Enable automatic deployments on push to main branch
4. Future updates: just git push

## Rollback

Both Vercel and Netlify keep deployment history. To rollback:

**Vercel:**
```bash
vercel rollback
```

**Netlify:**
Use the Netlify dashboard → Deploys → select previous deployment → Publish

## Monitoring

### Uptime Monitoring

Free options:
- UptimeRobot (https://uptimerobot.com)
- Pingdom Free Tier
- Freshping by Freshworks

Set up alerts for:
- Site down (check every 5 minutes)
- SSL certificate expiring (30 days notice)
- DNS changes

### Performance Monitoring

- Chrome User Experience Report (free, via Google Search Console)
- WebPageTest (https://www.webpagetest.org) - monthly audits
- Lighthouse CI in GitHub Actions (automated checks)

## Troubleshooting

### SSL Not Working

- Wait 10-15 minutes after domain configuration
- Clear browser cache
- Verify DNS propagation: `dig mailgoat.ai`
- Check hosting provider SSL settings

### Page Not Loading

- Check DNS records are correct
- Verify hosting provider status page
- Test with different DNS: `dig @8.8.8.8 mailgoat.ai`
- Check browser console for errors

### Slow Performance

- Run Lighthouse audit to identify issues
- Check hosting provider status
- Test from multiple locations (use WebPageTest)
- Verify no external dependencies added by mistake

## Domain Registrar Options

If domain not yet registered:

**Recommended:**
- Cloudflare Registrar (at-cost pricing, best DNS)
- Namecheap (affordable, good support)
- Porkbun (cheap, modern interface)

**Avoid:**
- GoDaddy (expensive renewals, upsells)
- Bluehost (poor performance)

## Cost Estimate

- Domain: ~$12/year (mailgoat.ai)
- Hosting: $0 (Vercel/Netlify free tier is sufficient)
- SSL: $0 (automatic via Let's Encrypt)

**Total:** ~$12/year

## Need Help?

- Vercel Support: https://vercel.com/support
- Netlify Support: https://www.netlify.com/support/
- OpenGoat Discord: [coordinate with team]

## Launch Checklist

Before announcing to public:

- [ ] Domain configured and SSL working
- [ ] All links tested (GitHub, Discord, Docs)
- [ ] Mobile tested on iOS and Android
- [ ] Social media preview cards tested
- [ ] Lighthouse score 95+ on all metrics
- [ ] Typos checked
- [ ] Analytics configured (if using)
- [ ] Uptime monitoring configured

**Then:**
- [ ] Announce on Twitter/X
- [ ] Post in relevant Discord servers
- [ ] Share on Hacker News (if ready)
- [ ] Update OpenGoat org README with link

## Security Notes

- No JavaScript = no XSS vulnerabilities
- Security headers configured (X-Frame-Options, etc.)
- No external dependencies = no supply chain risk
- Static HTML = minimal attack surface
- SSL enforced automatically by hosting provider

Landing page is secure by design.
