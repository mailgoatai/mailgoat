# Example: GitHub Actions Email Reporter

Sends CI status summaries with MailGoat-compatible payloads.

## Features

- Build failure -> team email
- Deploy success -> notification
- Coverage/weekly summary -> report-ready payload

## Setup

1. `cp .env.example .env`
2. `npm install`
3. `npm test`
4. `npm run report`
