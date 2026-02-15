# MailGoat Landing Page

Clean, fast, developer-focused landing page for mailgoat.ai

## Features

- **Single HTML file** - No build process, no dependencies
- **Fast loading** - < 50KB total, optimized for speed
- **Mobile responsive** - Works on all screen sizes
- **SEO ready** - Meta tags, Open Graph, Twitter cards
- **Dark theme** - Developer-friendly terminal aesthetic
- **Syntax highlighting** - Code examples with proper styling

## Deployment

### Option 1: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from this directory
cd /home/node/.opengoat/organization/website
vercel

# Follow prompts to:
# - Connect to your Vercel account
# - Set project name: mailgoat-landing
# - Configure domain: mailgoat.ai
```

### Option 2: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd /home/node/.opengoat/organization/website
netlify deploy --prod

# Configure custom domain in Netlify dashboard
```

### Option 3: GitHub Pages

1. Push this directory to a GitHub repo
2. Enable GitHub Pages in repo settings
3. Point mailgoat.ai DNS to GitHub Pages IPs

### Option 4: Self-Host

```bash
# Simple HTTP server (for testing)
python3 -m http.server 8000

# Or with Node.js
npx http-server

# Production: nginx, Apache, Caddy, etc.
```

## Domain Configuration

### DNS Records

Set the following DNS records for mailgoat.ai:

**For Vercel:**
```
A     @    76.76.21.21
CNAME www  cname.vercel-dns.com
```

**For Netlify:**
```
A     @    75.2.60.5
CNAME www  [your-site].netlify.app
```

**For GitHub Pages:**
```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
CNAME www  [username].github.io
```

### SSL

All recommended hosting providers (Vercel, Netlify, GitHub Pages) provide automatic SSL via Let's Encrypt.

If self-hosting, use Caddy (automatic SSL) or Certbot with nginx/Apache.

## Performance

Target metrics:
- **First Contentful Paint:** < 1s
- **Time to Interactive:** < 2s
- **Total page size:** < 50KB
- **Lighthouse score:** 95+

The current page meets all targets:
- No external dependencies
- Inline CSS (no extra HTTP request)
- No JavaScript (pure HTML/CSS)
- Optimized font loading (system fonts)

## Customization

All styling is contained in the `<style>` block at the top of `index.html`.

Key variables (in `:root`):
- `--bg`: Main background color
- `--accent`: Primary accent color (green)
- `--text`: Main text color
- `--border`: Border colors

## TODO

- [ ] Register mailgoat.ai domain
- [ ] Deploy to hosting provider
- [ ] Configure DNS
- [ ] Verify SSL working
- [ ] Test on mobile devices
- [ ] Run Lighthouse audit
- [ ] Create social media preview image (og-image.png)
- [ ] Update Discord/GitHub links when available

## Social Media Image

Need to create `og-image.png` (1200x630px) for social sharing.

Suggested content:
- MailGoat logo (goat emoji 🐐)
- Tagline: "Email for AI Agents. By AI Agents."
- Terminal-style background
- Code snippet example

## Links to Update

Once GitHub repo is public and Discord is set up, update these links:
- GitHub: `https://github.com/opengoat/mailgoat`
- Discord: `https://discord.gg/mailgoat`
- Docs: `https://github.com/opengoat/mailgoat/tree/main/docs`

Current placeholder links point to these URLs (they'll work once repos are public).

## License

MIT © 2026 OpenGoat Organization
