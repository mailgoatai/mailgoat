# Example: Todo App with Email Notifications

React frontend + Express backend demonstrating signup, task assignment, daily digest, and password reset email flows.

## Features

- User signup -> Welcome email
- Task assignment -> Notification email
- Daily digest -> Scheduled email
- Password reset -> Reset email

## Setup

1. `cp .env.example .env`
2. `cd backend && npm install`
3. `npm test`
4. `npm run dev`

## Email Templates

- `emails/templates/task-assigned.html`
- `emails/templates/task-completed.html`
- `emails/templates/daily-digest.html`

## Testing

Run: `cd backend && npm test`
