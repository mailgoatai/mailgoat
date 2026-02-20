# Guide: Playwright Email Testing with MailGoat

Related docs: [API Reference](../api-reference.md), [End-to-End Testing](../e2e-testing.md), [CI/CD Guide](./ci-cd-integration.md)

This guide shows a practical setup for validating email flows in Playwright E2E tests using MailGoat inbox APIs via the `mailgoat` CLI.

## 1) Setup

Install dependencies:

```bash
npm install -D @playwright/test
npm install -D execa
npm install -g mailgoat
```

Configure env:

```bash
export BASE_URL="http://localhost:3000"
export MAILGOAT_SERVER="https://api.mailgoat.ai"
export MAILGOAT_API_KEY="mg_test_key"
export MAILGOAT_TEST_RECIPIENT="e2e-tests@your-domain.test"
```

Add Playwright config timeout defaults:

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  },
  expect: {
    timeout: 15_000,
  },
  timeout: 90_000,
  retries: 1,
});
```

## 2) Helper Utilities

Create `tests/utils/mailgoat.ts`:

```ts
import { execa } from "execa";

export type MailGoatMessage = {
  id: string;
  to?: string[];
  subject?: string;
  text?: string;
  html?: string;
  from?: string;
  created_at?: string;
};

async function runMailgoatJson(args: string[]): Promise<any> {
  const { stdout } = await execa("mailgoat", [...args, "--json"], {
    env: process.env,
  });
  return JSON.parse(stdout);
}

export async function getLatestEmail(filter: {
  to: string;
  subjectIncludes?: string;
}): Promise<MailGoatMessage | null> {
  const list = await runMailgoatJson(["inbox", "list", "--limit", "50"]);
  const messages = (list.messages ?? list.items ?? []) as MailGoatMessage[];

  const found = messages.find((m) => {
    const toMatches = (m.to ?? []).includes(filter.to);
    const subjectMatches = filter.subjectIncludes
      ? (m.subject ?? "").includes(filter.subjectIncludes)
      : true;
    return toMatches && subjectMatches;
  });

  if (!found) return null;

  const detail = await runMailgoatJson(["read", found.id, "--full"]);
  return (detail.message ?? detail) as MailGoatMessage;
}

export async function waitForEmail(
  filter: { to: string; subjectIncludes?: string },
  opts: { timeoutMs?: number; pollMs?: number } = {}
): Promise<MailGoatMessage> {
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const pollMs = opts.pollMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const msg = await getLatestEmail(filter);
    if (msg) return msg;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for email to=${filter.to} subject~=${filter.subjectIncludes ?? "*"}`
  );
}

export async function cleanupMailbox(olderThan = "24h"): Promise<void> {
  await execa("mailgoat", ["delete", "--older-than", olderThan], {
    env: process.env,
  });
}
```

## 3) Complete Playwright Test File

Create `tests/email-flows.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { cleanupMailbox, waitForEmail } from "./utils/mailgoat";

const recipient = process.env.MAILGOAT_TEST_RECIPIENT!;

test.describe("email flows", () => {
  test.afterAll(async () => {
    // Keep test inbox clean between runs.
    await cleanupMailbox("12h");
  });

  test("sign up sends verification email", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(recipient);
    await page.getByLabel("Password").fill("Str0ngPass!123");
    await page.getByRole("button", { name: "Create account" }).click();

    const verification = await waitForEmail({
      to: recipient,
      subjectIncludes: "Verify your email",
    });

    const content = `${verification.text ?? ""}\n${verification.html ?? ""}`;
    expect(content).toContain("Verify your email");

    const linkMatch = content.match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]*/i);
    expect(linkMatch?.[0]).toBeTruthy();

    await page.goto(linkMatch![0]);
    await expect(page.getByText("Email verified")).toBeVisible();
  });

  test("password reset flow", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(recipient);
    await page.getByRole("button", { name: "Send reset link" }).click();

    const reset = await waitForEmail({
      to: recipient,
      subjectIncludes: "Reset your password",
    });

    const content = `${reset.text ?? ""}\n${reset.html ?? ""}`;
    expect(content).toContain("Reset your password");

    const resetLink = content.match(/https?:\/\/[^\s"'<>]+reset[^\s"'<>]*/i)?.[0];
    expect(resetLink).toBeTruthy();

    await page.goto(resetLink!);
    await page.getByLabel("New password").fill("N3wPass!123");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Password updated")).toBeVisible();
  });

  test("welcome email series", async () => {
    const welcome = await waitForEmail({
      to: recipient,
      subjectIncludes: "Welcome to",
    });
    expect(`${welcome.text ?? ""}${welcome.html ?? ""}`).toContain("getting started");

    const tips = await waitForEmail(
      { to: recipient, subjectIncludes: "Tips for your first week" },
      { timeoutMs: 120_000, pollMs: 5_000 }
    );
    expect(`${tips.text ?? ""}${tips.html ?? ""}`).toContain("best practices");
  });

  test("notification email", async () => {
    const notification = await waitForEmail({
      to: recipient,
      subjectIncludes: "Build completed",
    });

    const body = `${notification.text ?? ""}\n${notification.html ?? ""}`;
    expect(body).toContain("status: success");
    expect(body).toMatch(/build #\d+/i);
  });
});
```

## 4) Assertions to Add in Real Projects

Use these checks to prevent false positives:

- Content: `expect(body).toContain("expected text")`
- Links: extract URL and assert path includes expected token/action
- Images: assert HTML contains required image URL or CID
- Formatting: assert key HTML markers (`<h1>`, CTA button classes, footer/legal text)
- Security: assert links use `https://` and tokenized URLs are single-use in backend tests

Example:

```ts
expect(body).toContain("https://");
expect(body).toContain("unsubscribe");
expect(body).toMatch(/<img[^>]+src=/i);
```

## 5) Docker Compose Test Environment

Create `docker-compose.playwright.yml`:

```yaml
version: "3.9"

services:
  app:
    build: .
    environment:
      NODE_ENV: test
      MAILGOAT_SERVER: ${MAILGOAT_SERVER}
      MAILGOAT_API_KEY: ${MAILGOAT_API_KEY}
      MAILGOAT_EMAIL: no-reply@your-domain.test
    ports:
      - "3000:3000"

  playwright:
    image: mcr.microsoft.com/playwright:v1.52.0-jammy
    working_dir: /work
    volumes:
      - ./:/work
    environment:
      BASE_URL: http://app:3000
      MAILGOAT_SERVER: ${MAILGOAT_SERVER}
      MAILGOAT_API_KEY: ${MAILGOAT_API_KEY}
      MAILGOAT_TEST_RECIPIENT: ${MAILGOAT_TEST_RECIPIENT}
    depends_on:
      - app
    command: >
      sh -lc "npm ci && npx playwright test tests/email-flows.spec.ts"
```

Run:

```bash
docker compose -f docker-compose.playwright.yml up --build --abort-on-container-exit
```

## 6) package.json Scripts

Add:

```json
{
  "scripts": {
    "test:e2e:email": "playwright test tests/email-flows.spec.ts",
    "test:e2e:email:debug": "PWDEBUG=1 playwright test tests/email-flows.spec.ts",
    "test:e2e:email:headed": "playwright test tests/email-flows.spec.ts --headed",
    "test:e2e:email:docker": "docker compose -f docker-compose.playwright.yml up --build --abort-on-container-exit"
  }
}
```

## 7) Best Practices

- Use dedicated test inboxes per branch/PR to avoid cross-test collisions.
- Keep polling interval moderate (2-5s) with a hard timeout.
- Clean old test messages in teardown or before each suite.
- Scope subject lines with unique run IDs for parallel tests.
- Prefer deterministic trigger points before polling (wait for UI/API success first).
- In CI, keep one retry for flaky network behavior, not logic failures.
- Export raw email bodies as artifacts on failure for faster debugging.

## 8) Parallel Test Pattern

Use a unique subject prefix:

```ts
const runId = `run-${Date.now()}-${test.info().parallelIndex}`;
const subjectPrefix = `[${runId}]`;
```

Emit that prefix from your app (or test-only feature flag), then filter in `waitForEmail({ subjectIncludes: subjectPrefix, ... })`.
