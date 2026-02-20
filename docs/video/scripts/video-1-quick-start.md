# Video 1 Script: Quick Start (3:00)

## 00:00-00:15 Hook

"Email testing shouldn\'t be a full project. In the next 3 minutes, I\'ll install MailGoat, send an email, and verify it in the admin panel."

## 00:15-00:45 Problem

"Most email setups require too many moving pieces before you get feedback. MailGoat gives you a fast CLI workflow for sending, inspecting, and validating messages."

## 00:45-02:45 Demo

1. Install

```bash
npm install -g mailgoat
```

2. Initialize and verify

```bash
mailgoat config init
mailgoat health
```

3. Send first email

```bash
mailgoat send --to user@example.com --subject "Hello from MailGoat" --body "First message from CLI"
```

4. Open admin panel and show message arrival

```bash
npm run admin:serve
# open http://127.0.0.1:3001/admin
```

5. Show two quick extras

```bash
mailgoat template list
mailgoat scheduler list
```

## 02:45-03:00 CTA

"If you want the full setup and production flow, check the docs and the next two videos in this series."
