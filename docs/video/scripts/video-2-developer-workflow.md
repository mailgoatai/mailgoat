# Video 2 Script: Developer Workflow (5:00)

## 00:00-00:15 Hook

"This is the MailGoat workflow for developers: local setup, tests, and verification flows."

## 00:15-00:45 Problem

"Email features are easy to ship badly. You need reproducible tests and templates that don\'t drift from production behavior."

## 00:45-04:45 Demo

1. Local setup

```bash
git clone https://github.com/mailgoatai/mailgoat.git
cd mailgoat
npm install
npm run build
```

2. Run fast tests

```bash
npm run test:unit -- src/commands/__tests__/send-template.test.ts
```

3. Demonstrate templated verification email

```bash
mailgoat template create verify-email --subject "Verify your account" --body "Hi {{name}}, verify with {{link}}"
mailgoat send --to dev@example.com --template verify-email --var name=Alex --var link=https://app.example.com/verify/token
```

4. Show render and safety checks

```bash
mailgoat security-scan templates/verify-email.html
```

5. Show completion speed and ergonomics

```bash
mailgoat completion install
mailgoat send --template <TAB>
```

## 04:45-05:00 CTA

"Use this workflow in CI so email regressions are caught before release."
