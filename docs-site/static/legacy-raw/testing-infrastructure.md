# Testing Infrastructure

This document describes MailGoat's testing setup, environments, and future integration test infrastructure.

## Overview

MailGoat has multiple test layers:

- **Unit Tests**: Fast, isolated tests of individual functions (Jest)
- **Integration Tests (Mock)**: CLI tests against mocked Postal API (Bash + nock)
- **Integration Tests (Full)**: CLI tests against real Postal instance (Future)

## Current Test Stack

### 1. Jest Unit Tests (`src/`)

**Location:** `src/**/*.test.ts`

**Purpose:** Test individual modules in isolation

**Examples:**

- Config parsing
- Template rendering
- Validation logic
- Error handling

**Run:**

```bash
npm run test:unit
npm run test:unit -- --watch   # Watch mode
npm run test:coverage          # With coverage
```

### 2. Jest Integration Tests (`tests/integration/`)

**Location:** `tests/integration/**/*.test.ts`

**Purpose:** Test CLI commands end-to-end with mocked API

**Uses:** `nock` to intercept HTTP requests

**Examples:**

- `mailgoat send` command flow
- `mailgoat inbox` command flow
- Error handling
- Configuration management

**Run:**

```bash
npm run test:integration
```

### 3. Bash Test Runner (`tests/test-runner.sh`)

**Location:** `tests/test-runner.sh`

**Purpose:** Comprehensive CLI behavioral tests

**Features:**

- 65+ test scenarios
- Mock mode (default)
- Performance testing
- Detailed reporting

**Run:**

```bash
bash tests/test-runner.sh --mode=mock
bash tests/test-runner.sh --mode=mock --verbose
bash tests/test-runner.sh --filter="send"  # Run specific tests
```

## Test Modes

### Mock Mode (Current Default)

**What:** Tests run against mocked Postal API responses

**Pros:**

- Fast (~2-3 minutes for full suite)
- No external dependencies
- Repeatable and deterministic
- Safe for CI/CD

**Cons:**

- Doesn't catch API contract changes
- Can't test real SMTP/email delivery
- Limited coverage of error scenarios

**CI Usage:** ✅ Enabled in all PR and push workflows

### Integration Mode (Future Phase 2)

**What:** Tests run against a real Postal instance in Docker

**Pros:**

- Tests real API interactions
- Catches breaking changes in Postal
- Full SMTP/delivery testing
- Real-world error scenarios

**Cons:**

- Slower (~10-15 minutes)
- Requires Docker
- More complex setup

**CI Usage:** 🚧 Planned for dedicated workflow

## Future: Docker-Based Integration Tests

### Architecture

```
┌─────────────────────────────────────────┐
│         GitHub Actions Runner           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Test Container                   │ │
│  │  - MailGoat CLI                   │ │
│  │  - Test Runner                    │ │
│  └───────────────┬───────────────────┘ │
│                  │                      │
│  ┌───────────────▼───────────────────┐ │
│  │  Postal Stack (docker-compose)   │ │
│  │  - MariaDB                        │ │
│  │  - RabbitMQ                       │ │
│  │  - Postal Web                     │ │
│  │  - Postal SMTP                    │ │
│  │  - Postal Worker                  │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Setup Script (`tests/setup-postal-docker.sh`)

```bash
#!/bin/bash
#
# Setup ephemeral Postal instance for integration tests
#

set -euo pipefail

POSTAL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/postal-test"

echo "🐐 Setting up Postal test instance..."

# Create test directory
mkdir -p "$POSTAL_DIR"
cd "$POSTAL_DIR"

# Create minimal docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mariadb:
    image: mariadb:10.11
    environment:
      MARIADB_ROOT_PASSWORD: test123
      MARIADB_DATABASE: postal
      MARIADB_USER: postal
      MARIADB_PASSWORD: test123
    tmpfs:
      - /var/lib/mysql  # Use tmpfs for speed

  rabbitmq:
    image: rabbitmq:3.12-management
    environment:
      RABBITMQ_DEFAULT_USER: postal
      RABBITMQ_DEFAULT_PASS: test123

  postal-web:
    image: ghcr.io/postalserver/postal:3.3.2
    command: postal web-server
    environment:
      MAIN_DB_HOST: mariadb
      MAIN_DB_PASSWORD: test123
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PASSWORD: test123
      # ... other env vars
    ports:
      - "5000:5000"

  postal-smtp:
    image: ghcr.io/postalserver/postal:3.3.2
    command: postal smtp-server
    environment:
      MAIN_DB_HOST: mariadb
      MAIN_DB_PASSWORD: test123
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PASSWORD: test123
    ports:
      - "25:25"

  postal-worker:
    image: ghcr.io/postalserver/postal:3.3.2
    command: postal worker
    environment:
      MAIN_DB_HOST: mariadb
      MAIN_DB_PASSWORD: test123
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PASSWORD: test123
EOF

# Start services
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for Postal to be ready..."
timeout 60 bash -c 'until curl -sf http://localhost:5000/health; do sleep 2; done'

# Initialize database
docker-compose exec -T postal-web postal initialize

# Create test user and organization
# ... setup commands

echo "✅ Postal test instance ready at http://localhost:5000"
```

### Teardown Script (`tests/teardown-postal-docker.sh`)

```bash
#!/bin/bash
#
# Teardown Postal test instance
#

set -euo pipefail

POSTAL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/postal-test"

echo "🧹 Tearing down Postal test instance..."

cd "$POSTAL_DIR"

# Stop and remove containers
docker-compose down -v

# Clean up
cd ..
rm -rf postal-test

echo "✅ Cleanup complete"
```

### GitHub Actions Workflow (Future)

```yaml
name: Integration Tests (Full)

on:
  # Run on main branch merges and tags
  push:
    branches: [main]
    tags: ['v*']

  # Allow manual trigger
  workflow_dispatch:

jobs:
  integration-full:
    name: Full Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build CLI
        run: npm run build

      - name: Setup Postal test instance
        run: bash tests/setup-postal-docker.sh

      - name: Run full integration tests
        run: bash tests/test-runner.sh --mode=integration
        env:
          POSTAL_HOST: localhost:5000
          POSTAL_API_KEY: test-key-123

      - name: Teardown Postal
        if: always()
        run: bash tests/teardown-postal-docker.sh

      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: integration-logs
          path: |
            tests/test-logs/
            tests/postal-test/logs/
```

## Test Data & Fixtures

### Mock API Responses (`tests/fixtures/`)

```
tests/fixtures/
├── api/
│   ├── send-success.json
│   ├── send-error.json
│   ├── inbox-empty.json
│   └── inbox-with-messages.json
├── config/
│   ├── valid-config.json
│   └── invalid-config.json
└── templates/
    ├── basic.hbs
    └── with-attachments.hbs
```

### Test Scenarios (`tests/test-scenarios.md`)

Comprehensive list of all test cases - maintained by QA team.

## Performance Testing

### Benchmarks (`benchmarks/`)

- CLI startup time
- Config loading
- Send throughput
- Memory usage

**Run:**

```bash
npm run bench
npm run bench:startup  # Specific benchmark
```

**CI:** Runs on benchmarks workflow, tracks performance over time

## Coverage

### Generate Coverage Report

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Coverage Goals

- **Overall:** >80%
- **Core modules:** >90%
- **CLI commands:** >85%

### Future: Automated Coverage Tracking

- Codecov integration
- PR comments with coverage diff
- Block PRs that decrease coverage significantly

## Adding New Tests

### 1. Unit Test (Jest)

```typescript
// src/config/parser.test.ts
import { parseConfig } from './parser';

describe('parseConfig', () => {
  it('should parse valid config', () => {
    const input = '{ "api_key": "test" }';
    const result = parseConfig(input);
    expect(result.api_key).toBe('test');
  });
});
```

### 2. Integration Test (Bash)

```bash
# tests/suites/new-feature.sh

test_new_feature() {
  local test_name="New Feature Test"

  # Setup
  export MAILGOAT_API_KEY="test-key"

  # Execute
  run_cli "mailgoat new-feature --option=value"

  # Assert
  assert_success "$test_name"
  assert_output_contains "Expected output"
}
```

### 3. Register Test

```bash
# tests/test-runner.sh
# Add to test suite list
AVAILABLE_SUITES=(
  "basic"
  "send"
  "inbox"
  "new-feature"  # <-- Add here
)
```

## Continuous Improvement

### Test Metrics to Track

- Test execution time
- Flaky test rate
- Coverage percentage
- Performance benchmarks

### Regular Maintenance

- Review and update fixtures monthly
- Remove obsolete tests
- Optimize slow tests
- Add tests for new features

---

**Last Updated:** 2026-02-15  
**Maintained By:** QA Team (@qa) & DevOps (@devops)
