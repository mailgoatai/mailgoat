# Contributing to MailGoat

Thank you for your interest in contributing to MailGoat! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Git Hooks](#git-hooks)
- [Code Quality](#code-quality)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Release Process](#release-process)

---

## Getting Started

MailGoat is built by AI agents for AI agents. We welcome contributions from humans and agents alike!

**Prerequisites:**

- Node.js 18+ (check with `node --version`)
- npm 9+ (check with `npm --version`)
- Git

**Quick Start:**

```bash
# Clone the repository
git clone https://github.com/mailgoatai/mailgoat.git
cd mailgoat

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

---

## Development Setup

### Install Dependencies

```bash
npm install
```

This will:

- Install all project dependencies
- Set up Husky git hooks automatically (via `prepare` script)

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm test` - Run integration tests
- `npm run test:unit` - Run unit tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Auto-fix linting errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Check TypeScript types

---

## Git Hooks

MailGoat uses [Husky](https://typicode.github.io/husky/) to run automated checks before commits and pushes.

### Pre-commit Hook

**Runs automatically before every commit.**

The pre-commit hook uses [lint-staged](https://github.com/okonet/lint-staged) to:

- Run ESLint on staged `.ts` files and auto-fix issues
- Format staged files with Prettier
- Only check files you're committing (fast!)

**Configuration:** `.lintstagedrc.json`

**Example:**

```bash
git add src/my-file.ts
git commit -m "Add feature"
# → Husky runs lint-staged
# → Auto-fixes and formats your code
# → Commits if successful
```

**If the hook fails:**

- Review the error messages
- Fix the issues (or let auto-fix handle it)
- Stage the fixed files: `git add .`
- Retry the commit

### Pre-push Hook

**Runs automatically before every push.**

The pre-push hook runs the full test suite (`npm test`) to catch breaking changes before they reach CI.

**Example:**

```bash
git push origin my-branch
# → Husky runs npm test
# → Push succeeds only if tests pass
```

**If tests fail:**

- Review the test output
- Fix the failing tests
- Commit your fixes
- Retry the push

### Bypassing Hooks (Not Recommended)

In rare cases where you need to bypass hooks:

```bash
# Skip pre-commit
git commit --no-verify -m "Emergency fix"

# Skip pre-push
git push --no-verify
```

**⚠️ Warning:** Only use `--no-verify` when absolutely necessary. Bypassing hooks can introduce bugs into the codebase.

### Manual Hook Testing

Test hooks without committing:

```bash
# Test pre-commit
npm run lint && npm run format:check

# Test pre-push
npm test
```

---

## Code Quality

### Linting

We use ESLint with TypeScript support:

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

**Configuration:** `eslint.config.mjs`

### Formatting

We use Prettier for consistent code formatting:

```bash
# Format all TypeScript files
npm run format

# Check formatting without making changes
npm run format:check
```

**Configuration:** `.prettierrc.json`, `.prettierignore`

### Type Checking

TypeScript strict mode is enabled:

```bash
# Check for type errors
npm run typecheck
```

**Configuration:** `tsconfig.json`

---

## Testing

### Running Tests

```bash
# Run integration tests (default)
npm test

# Run unit tests
npm run test:unit

# Run specific test file
npx jest src/path/to/test.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Writing Tests

- **Unit tests:** Place in `src/__tests__/` next to the code
- **Integration tests:** Place in `tests/integration/`
- Use Jest for all tests
- Follow existing test patterns

**Example test:**

```typescript
import { describe, it, expect } from '@jest/globals';
import { MyFunction } from './my-function';

describe('MyFunction', () => {
  it('should do something', () => {
    const result = MyFunction('input');
    expect(result).toBe('expected');
  });
});
```

---

## Pull Requests

### Workflow

We push directly to `main` branch - no PRs needed (as of 2026-02-18).

**Process:**

1. Make your changes
2. Test locally (hooks will run automatically)
3. Commit with clear message
4. Push to main

**Before Pushing:**

- Ensure all tests pass: `npm test`
- Ensure linting passes: `npm run lint`
- Ensure formatting is correct: `npm run format:check`
- Ensure types are correct: `npm run typecheck`

### Commit Messages

Write clear, concise commit messages:

**Good:**

```
feat: Add environment variable support for Docker
fix: Correct MAILGOAT_EMAIL variable name
docs: Update CONTRIBUTING.md with hook information
```

**Format:**

```
<type>: <description>

[optional body]
[optional footer]
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

---

## Release Process

Releases are managed by the maintainers:

1. Update `CHANGELOG.md`
2. Bump version in `package.json`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions builds and publishes to npm

---

## Questions?

- **Issues:** https://github.com/mailgoatai/mailgoat/issues
- **Discussions:** https://github.com/mailgoatai/mailgoat/discussions
- **Discord:** https://discord.gg/mailgoat

---

## License

By contributing to MailGoat, you agree that your contributions will be licensed under the MIT License.
