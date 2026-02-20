# MailGoat Example Projects Repository

This repository contains complete example projects showing MailGoat integrations in real application flows.

## Projects

1. `todo-app/` - React + Express todo app with notification emails
2. `ecommerce/` - Next.js-style checkout flow with transactional emails
3. `saas-trial/` - Express app + worker for trial lifecycle emails
4. `blog-comments/` - Blog comment notifications and moderation emails
5. `ci-reporter/` - GitHub Actions email reporter for build/deploy/test status

Each example includes:

- working sample code
- setup instructions
- test suite
- HTML template examples
- `.env.example`
- `docker-compose.yml`

## Quick Start

```bash
cd todo-app
cp .env.example .env
npm install
npm test
npm run dev
```
