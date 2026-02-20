# CI/CD Email Testing with MailGoat

**Automated email testing in your CI/CD pipeline**

This guide shows you how to use MailGoat to automate email testing in continuous integration and deployment workflows. Stop manually checking emails—let your CI pipeline validate email delivery, content, and formatting automatically.

```
┌─────────────┐
│   Git Push  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│         CI/CD Pipeline                  │
│  ┌────────────────────────────────┐    │
│  │  1. Run Unit Tests             │    │
│  │     - Template rendering       │    │
│  │     - Input validation         │    │
│  └────────────┬───────────────────┘    │
│               │                         │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  2. Email Integration Tests    │    │
│  │     - Send test emails ────────┼────┼──► MailGoat
│  │     - Verify delivery          │◄───┤
│  │     - Check content            │    │
│  └────────────┬───────────────────┘    │
│               │                         │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  3. E2E Tests                  │    │
│  │     - Complete user flows      │    │
│  │     - Link validation          │    │
│  └────────────┬───────────────────┘    │
│               │                         │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  4. Deploy (if all pass)       │    │
│  └────────────┬───────────────────┘    │
│               │                         │
│               ▼                         │
│  ┌────────────────────────────────┐    │
│  │  5. Send Notifications         │    │
│  │     - Success/failure alerts   │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Table of Contents

- [Why Test Emails in CI?](#why-test-emails-in-ci)
- [Quick Start](#quick-start)
- [Testing Strategies](#testing-strategies)
- [Platform-Specific Guides](#platform-specific-guides)
  - [GitHub Actions](#github-actions)
  - [GitLab CI](#gitlab-ci)
  - [CircleCI](#circleci)
  - [Jenkins](#jenkins)
- [Docker Compose Testing](#docker-compose-testing)
- [Test Assertions](#test-assertions)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Why Test Emails in CI?

Email is mission-critical for most applications, yet it's often untested or only manually verified. Automated email testing in CI/CD catches issues before they reach production:

### Common Email Issues Caught by CI

✅ **Broken Links** - Verify all links in email templates work  
✅ **Formatting Errors** - Catch HTML/CSS rendering issues  
✅ **Missing Variables** - Detect template variable mismatches  
✅ **Delivery Failures** - Ensure emails actually send  
✅ **Content Bugs** - Validate dynamic content renders correctly  
✅ **Performance** - Monitor send times and API latency  
✅ **Spam Filters** - Test email scoring and deliverability

### Benefits

- **Catch regressions** before deployment
- **Validate templates** with real data
- **Test integrations** end-to-end
- **Document behavior** through tests
- **Faster debugging** with automated reproduction

---

## Quick Start

### 1. Install MailGoat in CI

```bash
npm install -g mailgoat
# or use Docker (no installation needed)
docker pull mailgoatai/mailgoat:latest
```

### 2. Set Environment Variables

Add these secrets to your CI platform:

```bash
MAILGOAT_SERVER=https://postal.yourdomain.com
MAILGOAT_API_KEY=your_api_key_here
MAILGOAT_EMAIL=ci-tests@yourdomain.com
```

### 3. Run a Test

```bash
# Send test email
mailgoat send \
  --to test@example.com \
  --subject "CI Test $(date)" \
  --body "This email was sent automatically by CI"

# Verify it arrived
mailgoat inbox list --since 1m --json | \
  jq -e '.messages[] | select(.subject | contains("CI Test"))'
```

---

## Testing Strategies

### Unit Tests: Template Rendering

Test email templates without actually sending emails.

**Example: Jest/TypeScript**

```typescript
// tests/email-templates.test.ts
import { renderTemplate } from '../src/email-templates';

describe('Email Templates', () => {
  it('should render welcome email with user data', () => {
    const result = renderTemplate('welcome', {
      name: 'Alice',
      confirmUrl: 'https://example.com/confirm/abc123'
    });
    
    expect(result.subject).toBe('Welcome, Alice!');
    expect(result.html).toContain('https://example.com/confirm/abc123');
    expect(result.html).not.toContain('{{name}}'); // No unrendered vars
  });

  it('should escape HTML in user input', () => {
    const result = renderTemplate('welcome', {
      name: '<script>alert("xss")</script>'
    });
    
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('&lt;script&gt;');
  });
});
```

### Integration Tests: Email Sending

Test actual email delivery through your application.

**Example: Mocha/Chai**

```javascript
// tests/email-integration.test.js
const { expect } = require('chai');
const { sendWelcomeEmail } = require('../src/email-service');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

describe('Email Integration', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  it('should send welcome email and verify delivery', async function() {
    this.timeout(10000); // Allow time for email delivery

    // Send email via your application
    await sendWelcomeEmail(testEmail, { name: 'Test User' });

    // Wait for delivery
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check inbox via MailGoat CLI
    const { stdout } = await execAsync(
      `mailgoat inbox list --since 1m --json`
    );
    
    const messages = JSON.parse(stdout).messages;
    const welcomeEmail = messages.find(m => 
      m.to.includes(testEmail) && 
      m.subject.includes('Welcome')
    );

    expect(welcomeEmail).to.exist;
    expect(welcomeEmail.subject).to.equal('Welcome, Test User!');
  });

  it('should include unsubscribe link', async function() {
    this.timeout(10000);

    await sendMarketingEmail(testEmail);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { stdout } = await execAsync(
      `mailgoat read $(mailgoat inbox list --since 1m --json | jq -r '.messages[0].id') --json`
    );
    
    const email = JSON.parse(stdout);
    expect(email.html_body).to.match(/unsubscribe/i);
    expect(email.html_body).to.match(/https?:\/\/.*unsubscribe/);
  });
});
```

### E2E Tests: Full User Flows

Test complete user journeys involving email.

**Example: Playwright/Puppeteer**

```typescript
// tests/e2e/password-reset.test.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test('password reset flow', async ({ page }) => {
  const testEmail = `reset-${Date.now()}@example.com`;
  
  // 1. Request password reset
  await page.goto('https://myapp.com/forgot-password');
  await page.fill('input[name="email"]', testEmail);
  await page.click('button[type="submit"]');
  
  await expect(page.locator('.success-message')).toBeVisible();

  // 2. Wait for email to arrive
  await page.waitForTimeout(3000);

  // 3. Fetch reset email via MailGoat
  const inbox = execSync(
    `mailgoat inbox list --since 1m --json`,
    { encoding: 'utf-8' }
  );
  
  const messages = JSON.parse(inbox).messages;
  const resetEmail = messages.find(m => 
    m.to.includes(testEmail) && 
    m.subject.includes('Password Reset')
  );

  expect(resetEmail).toBeDefined();

  // 4. Extract reset link from email
  const emailContent = execSync(
    `mailgoat read ${resetEmail.id} --json`,
    { encoding: 'utf-8' }
  );
  
  const email = JSON.parse(emailContent);
  const resetLinkMatch = email.html_body.match(
    /https:\/\/myapp\.com\/reset\/([a-zA-Z0-9-]+)/
  );
  
  expect(resetLinkMatch).not.toBeNull();
  const resetLink = resetLinkMatch[0];

  // 5. Use reset link to set new password
  await page.goto(resetLink);
  await page.fill('input[name="password"]', 'NewSecurePass123!');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('.success-message')).toContainText('Password updated');
});
```

---

## Platform-Specific Guides

### GitHub Actions

Complete workflow for email testing in GitHub Actions.

**`.github/workflows/email-tests.yml`**

```yaml
name: Email Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  email-tests:
    runs-on: ubuntu-latest
    
    services:
      # Optional: Run local Postal instance for testing
      postal:
        image: postal/postal:latest
        ports:
          - 5000:5000
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install MailGoat
        run: npm install -g mailgoat
      
      - name: Configure MailGoat
        run: |
          mailgoat config init --non-interactive \
            --server ${{ secrets.MAILGOAT_SERVER }} \
            --api-key ${{ secrets.MAILGOAT_API_KEY }} \
            --email ${{ secrets.MAILGOAT_EMAIL }}
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run email integration tests
        env:
          MAILGOAT_SERVER: ${{ secrets.MAILGOAT_SERVER }}
          MAILGOAT_API_KEY: ${{ secrets.MAILGOAT_API_KEY }}
          MAILGOAT_EMAIL: ${{ secrets.MAILGOAT_EMAIL }}
          TEST_EMAIL_RECIPIENT: ci-test-${{ github.run_id }}@yourdomain.com
        run: npm run test:email
      
      - name: Send deployment notification
        if: success() && github.ref == 'refs/heads/main'
        run: |
          mailgoat send \
            --to ops@yourdomain.com \
            --subject "✅ Deploy succeeded: ${{ github.sha }}" \
            --body "Commit: ${{ github.event.head_commit.message }}" \
            --attach "test-results.json"
      
      - name: Send failure alert
        if: failure()
        run: |
          mailgoat send \
            --to ops@yourdomain.com \
            --subject "❌ Build failed: ${{ github.workflow }}" \
            --body "Check: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: email-test-results
          path: |
            test-results/
            coverage/
```

**Secrets to add:**
- `MAILGOAT_SERVER`
- `MAILGOAT_API_KEY`
- `MAILGOAT_EMAIL`

---

### GitLab CI

Complete pipeline for email testing in GitLab CI.

**`.gitlab-ci.yml`**

```yaml
image: node:20

stages:
  - test
  - deploy
  - notify

variables:
  MAILGOAT_SERVER: $MAILGOAT_SERVER
  MAILGOAT_API_KEY: $MAILGOAT_API_KEY
  MAILGOAT_EMAIL: $MAILGOAT_EMAIL

before_script:
  - npm install -g mailgoat
  - npm ci

test:unit:
  stage: test
  script:
    - npm run test:unit
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

test:email:
  stage: test
  script:
    - npm run test:email
  allow_failure: false
  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure

test:e2e:
  stage: test
  services:
    - name: postal/postal:latest
      alias: postal
  variables:
    MAILGOAT_SERVER: http://postal:5000
  script:
    - npm run test:e2e
  artifacts:
    when: on_failure
    paths:
      - screenshots/
      - videos/
    expire_in: 1 week

deploy:production:
  stage: deploy
  only:
    - main
  script:
    - echo "Deploying to production..."
    - ./deploy.sh
  environment:
    name: production
    url: https://myapp.com

notify:success:
  stage: notify
  when: on_success
  only:
    - main
  script:
    - |
      mailgoat send \
        --to ops@yourdomain.com \
        --subject "✅ Pipeline $CI_PIPELINE_ID succeeded" \
        --body "Project: $CI_PROJECT_NAME\nBranch: $CI_COMMIT_REF_NAME\nCommit: $CI_COMMIT_SHORT_SHA\nAuthor: $CI_COMMIT_AUTHOR"

notify:failure:
  stage: notify
  when: on_failure
  script:
    - |
      mailgoat send \
        --to ops@yourdomain.com \
        --subject "❌ Pipeline $CI_PIPELINE_ID failed" \
        --body "Check: $CI_PIPELINE_URL"
```

**Variables to add (Settings → CI/CD → Variables):**
- `MAILGOAT_SERVER` (masked)
- `MAILGOAT_API_KEY` (masked, protected)
- `MAILGOAT_EMAIL` (masked)

---

### CircleCI

Complete configuration for email testing in CircleCI.

**`.circleci/config.yml`**

```yaml
version: 2.1

orbs:
  node: circleci/node@5.1

executors:
  node-executor:
    docker:
      - image: cimg/node:20.11
    environment:
      NODE_ENV: test

commands:
  install-mailgoat:
    steps:
      - run:
          name: Install MailGoat CLI
          command: npm install -g mailgoat
  
  setup-mailgoat:
    steps:
      - run:
          name: Configure MailGoat
          command: |
            mailgoat config init --non-interactive \
              --server $MAILGOAT_SERVER \
              --api-key $MAILGOAT_API_KEY \
              --email $MAILGOAT_EMAIL

jobs:
  test-unit:
    executor: node-executor
    steps:
      - checkout
      - node/install-packages
      - run:
          name: Run unit tests
          command: npm run test:unit
      - store_test_results:
          path: test-results
      - store_artifacts:
          path: coverage

  test-email:
    executor: node-executor
    steps:
      - checkout
      - node/install-packages
      - install-mailgoat
      - setup-mailgoat
      - run:
          name: Run email integration tests
          command: npm run test:email
          environment:
            TEST_EMAIL_RECIPIENT: ci-test-<< pipeline.id >>@yourdomain.com
      - store_test_results:
          path: test-results/email

  test-e2e:
    executor: node-executor
    docker:
      - image: cimg/node:20.11-browsers
    steps:
      - checkout
      - node/install-packages
      - install-mailgoat
      - setup-mailgoat
      - run:
          name: Run E2E tests
          command: npm run test:e2e
      - store_artifacts:
          path: screenshots
          destination: e2e-screenshots
      - store_artifacts:
          path: videos
          destination: e2e-videos

  deploy-production:
    executor: node-executor
    steps:
      - checkout
      - run:
          name: Deploy to production
          command: ./deploy.sh
      - install-mailgoat
      - setup-mailgoat
      - run:
          name: Send deployment notification
          command: |
            mailgoat send \
              --to ops@yourdomain.com \
              --subject "✅ Deployed << pipeline.git.branch >> to production" \
              --body "Pipeline: << pipeline.number >>\nCommit: << pipeline.git.revision >>"

workflows:
  test-and-deploy:
    jobs:
      - test-unit
      - test-email:
          requires:
            - test-unit
      - test-e2e:
          requires:
            - test-unit
            - test-email
      - deploy-production:
          requires:
            - test-e2e
          filters:
            branches:
              only: main
```

**Environment Variables to add (Project Settings → Environment Variables):**
- `MAILGOAT_SERVER`
- `MAILGOAT_API_KEY`
- `MAILGOAT_EMAIL`

---

### Jenkins

Complete Jenkinsfile for email testing.

**`Jenkinsfile`**

```groovy
pipeline {
  agent {
    docker {
      image 'node:20'
      args '-u root:root'
    }
  }
  
  environment {
    MAILGOAT_SERVER = credentials('mailgoat-server')
    MAILGOAT_API_KEY = credentials('mailgoat-api-key')
    MAILGOAT_EMAIL = credentials('mailgoat-email')
    TEST_EMAIL = "ci-test-${BUILD_ID}@yourdomain.com"
  }
  
  stages {
    stage('Setup') {
      steps {
        sh 'npm ci'
        sh 'npm install -g mailgoat'
      }
    }
    
    stage('Unit Tests') {
      steps {
        sh 'npm run test:unit'
      }
      post {
        always {
          junit 'test-results/junit.xml'
          publishHTML([
            reportDir: 'coverage',
            reportFiles: 'index.html',
            reportName: 'Coverage Report'
          ])
        }
      }
    }
    
    stage('Email Tests') {
      steps {
        sh '''
          mailgoat config init --non-interactive \
            --server $MAILGOAT_SERVER \
            --api-key $MAILGOAT_API_KEY \
            --email $MAILGOAT_EMAIL
        '''
        sh 'npm run test:email'
      }
    }
    
    stage('E2E Tests') {
      when {
        branch 'main'
      }
      steps {
        sh 'npm run test:e2e'
      }
      post {
        failure {
          archiveArtifacts artifacts: 'screenshots/**/*.png', fingerprint: true
        }
      }
    }
    
    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        sh './deploy.sh'
      }
      post {
        success {
          sh """
            mailgoat send \
              --to ops@yourdomain.com \
              --subject "✅ Deploy succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}" \
              --body "Deployed ${env.GIT_COMMIT} to production"
          """
        }
        failure {
          sh """
            mailgoat send \
              --to ops@yourdomain.com \
              --subject "❌ Deploy failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}" \
              --body "Check: ${env.BUILD_URL}"
          """
        }
      }
    }
  }
  
  post {
    always {
      cleanWs()
    }
  }
}
```

**Credentials to add (Jenkins → Credentials):**
- `mailgoat-server` (Secret text)
- `mailgoat-api-key` (Secret text)
- `mailgoat-email` (Secret text)

---

## Docker Compose Testing

Create an isolated test environment with Docker Compose.

**`docker-compose.test.yml`**

```yaml
version: '3.8'

services:
  # Your application under test
  app:
    build: .
    environment:
      NODE_ENV: test
      DATABASE_URL: postgres://postgres:password@db:5432/testdb
      MAILGOAT_SERVER: https://postal.yourdomain.com
      MAILGOAT_API_KEY: ${MAILGOAT_API_KEY}
      MAILGOAT_EMAIL: ci-tests@yourdomain.com
    depends_on:
      - db
      - mailgoat
    networks:
      - test-network

  # Test database
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: testdb
    networks:
      - test-network

  # MailGoat CLI for testing
  mailgoat:
    image: mailgoatai/mailgoat:latest
    environment:
      MAILGOAT_SERVER: https://postal.yourdomain.com
      MAILGOAT_API_KEY: ${MAILGOAT_API_KEY}
      MAILGOAT_EMAIL: ci-tests@yourdomain.com
    networks:
      - test-network

  # Test runner
  tests:
    build:
      context: .
      dockerfile: Dockerfile.test
    environment:
      NODE_ENV: test
      TEST_EMAIL_RECIPIENT: test-${BUILD_ID:-local}@yourdomain.com
    depends_on:
      - app
      - mailgoat
    networks:
      - test-network
    volumes:
      - ./test-results:/app/test-results
    command: npm run test:integration

networks:
  test-network:
    driver: bridge
```

**`Dockerfile.test`**

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install MailGoat
RUN npm install -g mailgoat

# Install test dependencies
COPY package*.json ./
RUN npm ci

# Copy test files
COPY tests/ ./tests/
COPY jest.config.js ./

CMD ["npm", "run", "test"]
```

**Run tests:**

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Run specific test suite
docker-compose -f docker-compose.test.yml run --rm tests npm run test:email

# Clean up
docker-compose -f docker-compose.test.yml down -v
```

---

## Test Assertions

Common assertions for email testing.

### Email Delivery

```javascript
// Check email was sent successfully
const inbox = await getInbox();
expect(inbox.messages).toHaveLength(1);

// Verify recipient
expect(inbox.messages[0].to).toContain('user@example.com');

// Check delivery time
const sentTime = new Date(inbox.messages[0].timestamp);
const now = new Date();
expect(now - sentTime).toBeLessThan(5000); // Within 5 seconds
```

### Email Content

```javascript
const email = await readEmail(messageId);

// Subject line
expect(email.subject).toBe('Welcome to MyApp!');

// Plain text body
expect(email.plain_body).toContain('Getting Started Guide');

// HTML content
expect(email.html_body).toMatch(/<h1>Welcome<\/h1>/);

// No template variables left unrendered
expect(email.html_body).not.toMatch(/\{\{.*\}\}/);
expect(email.html_body).not.toContain('undefined');
```

### Links and URLs

```javascript
// Extract all links
const links = extractLinks(email.html_body);

// Verify specific link exists
const resetLink = links.find(l => l.includes('/reset-password/'));
expect(resetLink).toBeDefined();

// Check all links are HTTPS
links.forEach(link => {
  expect(link).toMatch(/^https:\/\//);
});

// Verify links are absolute, not relative
links.forEach(link => {
  expect(link).toMatch(/^https?:\/\/[^/]+/);
});

// Test link validity (optional, can be slow)
for (const link of links) {
  const response = await fetch(link, { method: 'HEAD' });
  expect(response.ok).toBe(true);
}
```

### Attachments

```javascript
// Check attachment count
expect(email.attachments).toHaveLength(2);

// Verify specific attachment
const pdf = email.attachments.find(a => a.filename === 'invoice.pdf');
expect(pdf).toBeDefined();
expect(pdf.content_type).toBe('application/pdf');
expect(pdf.size).toBeGreaterThan(0);

// Validate attachment size
expect(pdf.size).toBeLessThan(10 * 1024 * 1024); // Under 10MB
```

### Headers

```javascript
// Check security headers
expect(email.headers['X-Mailer']).toBeDefined();
expect(email.headers['Message-ID']).toMatch(/@yourdomain\.com>/);

// Verify unsubscribe header
expect(email.headers['List-Unsubscribe']).toBeDefined();
expect(email.headers['List-Unsubscribe']).toMatch(/^<https?:\/\//);

// Check spam score (if available)
if (email.headers['X-Spam-Score']) {
  const score = parseFloat(email.headers['X-Spam-Score']);
  expect(score).toBeLessThan(5.0); // Common spam threshold
}
```

### Localization

```javascript
// Test multiple locales
const locales = ['en', 'es', 'fr', 'de'];

for (const locale of locales) {
  const email = await sendEmail({ locale, recipient: testEmail });
  
  // Verify locale-specific content
  expect(email.subject).not.toContain('en.subject');
  expect(email.html_body).not.toMatch(/\{\{t\./); // No untranslated keys
  
  // Check language-specific formatting
  if (locale === 'fr') {
    expect(email.html_body).toMatch(/\d{2}\/\d{2}\/\d{4}/); // DD/MM/YYYY
  }
}
```

---

## Best Practices

### 1. Use Unique Email Addresses

Generate unique test email addresses to avoid conflicts:

```javascript
// Use timestamp or build ID
const testEmail = `test-${Date.now()}@yourdomain.com`;

// Or CI-specific identifiers
const testEmail = `ci-${process.env.CI_PIPELINE_ID}@yourdomain.com`;

// Or random UUIDs
const { v4: uuidv4 } = require('uuid');
const testEmail = `test-${uuidv4()}@yourdomain.com`;
```

### 2. Clean Up Test Data

Delete test emails after each test run:

```bash
# Delete emails older than 1 hour
mailgoat delete --older-than 1h --tag ci-test --yes

# Or clean up specific test run
mailgoat inbox list --since 10m --json | \
  jq -r '.messages[].id' | \
  xargs -I {} mailgoat delete {}
```

### 3. Parallelize Tests

Run email tests in parallel safely:

```javascript
// Jest parallel execution
// jest.config.js
module.exports = {
  maxWorkers: 4, // Run 4 tests in parallel
  testTimeout: 10000,
};

// Ensure unique identifiers per test
describe('Email tests', () => {
  let testEmail;
  
  beforeEach(() => {
    testEmail = `test-${Date.now()}-${Math.random()}@example.com`;
  });
  
  test.concurrent('sends welcome email', async () => {
    // Test implementation
  });
  
  test.concurrent('sends password reset', async () => {
    // Test implementation
  });
});
```

### 4. Add Retry Logic

Handle transient failures gracefully:

```javascript
// Retry helper
async function retryAsync(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Use in tests
test('email delivery with retry', async () => {
  await sendEmail(testEmail);
  
  const email = await retryAsync(async () => {
    const inbox = await getInbox();
    const found = inbox.messages.find(m => m.to.includes(testEmail));
    if (!found) throw new Error('Email not found');
    return found;
  }, 5, 2000); // Retry 5 times, wait 2s between attempts
  
  expect(email).toBeDefined();
});
```

### 5. Use Test Tags

Tag test emails for easy filtering:

```bash
# Send with tag
mailgoat send \
  --to test@example.com \
  --subject "Test Email" \
  --body "Content" \
  --tag ci-test \
  --tag build-${BUILD_ID}

# List by tag
mailgoat inbox list --tag ci-test

# Clean up by tag
mailgoat delete --tag ci-test --older-than 1d --yes
```

### 6. Monitor Performance

Track email send times:

```javascript
test('email sends within SLA', async () => {
  const start = Date.now();
  
  await sendEmail(testEmail);
  
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(2000); // Under 2 seconds
});

// Or use custom reporter
class EmailPerformanceReporter {
  onTestResult(test, testResult) {
    const emailTests = testResult.testResults.filter(t => 
      t.title.includes('email')
    );
    
    const avgDuration = emailTests.reduce((sum, t) => sum + t.duration, 0) / 
                        emailTests.length;
    
    console.log(`Average email test duration: ${avgDuration}ms`);
  }
}
```

### 7. Cache Credentials

Avoid re-authenticating on every test:

```javascript
// Setup once per test suite
beforeAll(async () => {
  // Configure MailGoat once
  await exec('mailgoat config init --non-interactive ...');
});

// Reuse connection across tests
let mailgoatClient;

beforeAll(() => {
  mailgoatClient = createMailgoatClient({
    server: process.env.MAILGOAT_SERVER,
    apiKey: process.env.MAILGOAT_API_KEY
  });
});
```

### 8. Fail Fast on Critical Errors

Don't waste CI time on broken configuration:

```bash
#!/bin/bash
# ci-preflight.sh

set -e

echo "Checking MailGoat configuration..."

# Test connectivity
if ! mailgoat health --json | jq -e '.status == "healthy"'; then
  echo "❌ MailGoat health check failed"
  exit 1
fi

# Verify credentials
if ! mailgoat inbox list --limit 1 > /dev/null 2>&1; then
  echo "❌ MailGoat authentication failed"
  exit 1
fi

echo "✅ MailGoat configuration OK"
```

### 9. Use Docker for Consistency

Ensure consistent environment across CI platforms:

```yaml
# Use MailGoat Docker image
services:
  mailgoat:
    image: mailgoatai/mailgoat:1.1.7
    environment:
      MAILGOAT_SERVER: ${{ secrets.MAILGOAT_SERVER }}
      MAILGOAT_API_KEY: ${{ secrets.MAILGOAT_API_KEY }}
```

### 10. Document Email Fixtures

Keep example emails for reference:

```
tests/
  fixtures/
    emails/
      welcome.json
      password-reset.json
      invoice.json
  __snapshots__/
    email-templates.test.ts.snap
```

---

## Troubleshooting

### Email Not Found in Inbox

**Problem:** Test can't find sent email in inbox.

**Solutions:**

```bash
# 1. Check email was actually sent
mailgoat inbox list --since 5m --json | jq '.messages[].subject'

# 2. Increase wait time
sleep 5 && mailgoat inbox list --since 5m

# 3. Check for rate limiting
mailgoat health --json | jq '.rate_limit'

# 4. Verify recipient address
mailgoat inbox list --since 5m --json | jq '.messages[].to'

# 5. Check spam/junk folder (if applicable)
mailgoat inbox list --folder junk
```

### Authentication Failures

**Problem:** CI can't authenticate with MailGoat.

**Solutions:**

```bash
# 1. Verify secrets are set
echo "Server: ${MAILGOAT_SERVER:0:10}..."
echo "API Key: ${MAILGOAT_API_KEY:0:10}..."

# 2. Test credentials manually
mailgoat config init --non-interactive \
  --server "$MAILGOAT_SERVER" \
  --api-key "$MAILGOAT_API_KEY" \
  --email "$MAILGOAT_EMAIL"

mailgoat health

# 3. Check for trailing whitespace in secrets
MAILGOAT_API_KEY=$(echo "$MAILGOAT_API_KEY" | xargs)

# 4. Verify API key hasn't expired
mailgoat keys list --json | jq '.keys[] | select(.id == env.KEY_ID)'
```

### Slow Tests

**Problem:** Email tests take too long.

**Solutions:**

```javascript
// 1. Reduce wait times with polling
async function waitForEmail(predicate, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const inbox = await getInbox();
    const found = inbox.messages.find(predicate);
    if (found) return found;
    await sleep(500); // Poll every 500ms
  }
  throw new Error('Timeout waiting for email');
}

// 2. Run tests in parallel
// jest.config.js
module.exports = {
  maxWorkers: '50%', // Use half your CPU cores
};

// 3. Skip email tests on fast feedback loops
// Run quickly with:
npm test -- --testPathIgnorePatterns=email
```

### Flaky Tests

**Problem:** Tests pass/fail randomly.

**Solutions:**

```javascript
// 1. Add proper retries
jest.retryTimes(3, { logErrorsBeforeRetry: true });

// 2. Increase timeouts
jest.setTimeout(30000); // 30 seconds

// 3. Ensure unique test data
const uniqueId = `${Date.now()}-${Math.random()}`;

// 4. Add explicit waits
await page.waitForSelector('.email-sent-confirmation');
await sleep(2000); // Grace period for email delivery

// 5. Check for race conditions
// Bad: Multiple tests using same email
const testEmail = 'test@example.com';

// Good: Unique email per test
const testEmail = `test-${uuidv4()}@example.com`;
```

### Rate Limiting

**Problem:** Tests fail due to rate limits.

**Solutions:**

```bash
# 1. Check current rate limit status
mailgoat health --json | jq '.rate_limit'

# 2. Add delays between tests
# jest.config.js
module.exports = {
  maxWorkers: 1, // Sequential execution
  testTimeout: 30000,
  globalSetup: './tests/setup.js',
};

// tests/setup.js
module.exports = async () => {
  // Add delay between test files
  global.__TEST_DELAY__ = 1000;
};

// 3. Use different API keys for parallel jobs
MAILGOAT_API_KEY="${MAILGOAT_API_KEY_${CI_JOB_ID}}"

# 4. Request higher rate limits for CI
# Contact support or configure in Postal
```

### Docker Issues

**Problem:** MailGoat doesn't work in Docker.

**Solutions:**

```bash
# 1. Check network connectivity
docker run --rm mailgoatai/mailgoat:latest \
  sh -c 'ping -c 1 postal.yourdomain.com'

# 2. Pass environment variables correctly
docker run --rm \
  -e MAILGOAT_SERVER="$MAILGOAT_SERVER" \
  -e MAILGOAT_API_KEY="$MAILGOAT_API_KEY" \
  mailgoatai/mailgoat:latest \
  mailgoat health

# 3. Check DNS resolution
docker run --rm \
  --dns 8.8.8.8 \
  mailgoatai/mailgoat:latest \
  mailgoat health

# 4. Use host networking (if allowed)
docker run --rm --network host \
  -e MAILGOAT_SERVER="$MAILGOAT_SERVER" \
  mailgoatai/mailgoat:latest \
  mailgoat send --to test@example.com --subject "Test"
```

### Template Rendering Errors

**Problem:** Email templates render incorrectly.

**Solutions:**

```javascript
// 1. Test template syntax separately
test('template has valid syntax', () => {
  const template = fs.readFileSync('templates/welcome.hbs', 'utf-8');
  expect(() => Handlebars.compile(template)).not.toThrow();
});

// 2. Validate all variables are provided
test('template uses only provided variables', () => {
  const template = fs.readFileSync('templates/welcome.hbs', 'utf-8');
  const variables = extractVariables(template); // Custom helper
  const provided = ['name', 'confirmUrl'];
  
  variables.forEach(v => {
    expect(provided).toContain(v);
  });
});

// 3. Check for common typos
test('template has no common typos', () => {
  const html = renderTemplate('welcome', { name: 'Test' });
  expect(html).not.toMatch(/undefiend|udefined/);
  expect(html).not.toContain('[object Object]');
});
```

---

## Next Steps

- **[API Reference](../api-reference.md)** - Complete MailGoat CLI documentation
- **[Security Guide](./security.md)** - Best practices for API keys and secrets
- **[Monitoring Guide](./monitoring.md)** - Track email delivery and performance
- **[Examples](../examples/)** - More code samples and patterns

---

## Get Help

- 📚 [Documentation](https://github.com/mailgoatai/mailgoat#readme)
- 🐛 [Report Issues](https://github.com/mailgoatai/mailgoat/issues)
- 💬 [Discussions](https://github.com/mailgoatai/mailgoat/discussions)
- 📧 [Email Support](mailto:support@mailgoat.ai)

---

**Happy testing! 🐐**
