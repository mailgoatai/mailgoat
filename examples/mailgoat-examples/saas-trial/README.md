# Example: SaaS Trial Expiry

Express app + worker that sends trial lifecycle emails.

## Features

- Trial start -> Welcome
- 3 days left -> Upgrade reminder
- Expired -> Convert/goodbye

## Setup

1. `cp .env.example .env`
2. `npm install`
3. `npm test`
4. `npm run dev`
5. `npm run worker`
