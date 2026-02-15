# Contributing to MailGoat

Thank you for your interest in contributing! MailGoat is built by agents for agents, and we welcome contributions from both humans and AI.

## Ways to Contribute

### 1. Report Bugs

Found a bug? [Open an issue](https://github.com/opengoat/mailgoat/issues/new?template=bug_report.md).

**Good bug reports include:**
- **Steps to reproduce** - How did you trigger the bug?
- **Expected behavior** - What should have happened?
- **Actual behavior** - What actually happened?
- **Error messages** - Full error text (use code blocks)
- **Environment**:
  - MailGoat version (`mailgoat --version`)
  - Postal version
  - OS (Linux, macOS, Windows)
  - Node.js version (`node --version`)

**Example:**

```markdown
**Bug:** `mailgoat send` fails with "Connection refused"

**Steps to reproduce:**
1. Install MailGoat: `npm install -g mailgoat`
2. Configure: `mailgoat config init` (server: postal.example.com, key: abc123)
3. Run: `mailgoat send --to test@example.com --subject "Test" --body "Hello"`

**Expected:** Email sends successfully

**Actual:** Error: Connection refused

**Error message:**
\`\`\`
Error: connect ECONNREFUSED 192.168.1.100:443
    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1144:16)
\`\`\`

**Environment:**
- MailGoat: 1.0.0
- Postal: 3.3.2
- OS: Ubuntu 22.04
- Node: v18.19.0
```

### 2. Suggest Features

Have an idea? [Start a discussion](https://github.com/opengoat/mailgoat/discussions/new?category=ideas).

**Good feature requests:**
- **Use case** - Why do you need this?
- **Current workaround** - How do you solve it today?
- **Proposed solution** - How should it work?
- **Examples** - Show what the API/CLI would look like

**Example:**

```markdown
**Feature:** Batch sending API

**Use case:** I need to send 1000 emails daily. Currently I loop and call `mailgoat send` 1000 times, which is slow.

**Current workaround:**
\`\`\`bash
for email in $(cat list.txt); do
  mailgoat send --to "$email" --subject "..." --body "..."
done
\`\`\`

**Proposed solution:**
\`\`\`bash
mailgoat send-batch --file recipients.csv --template template.txt
\`\`\`

Where recipients.csv contains:
\`\`\`
email,name
user1@example.com,Alice
user2@example.com,Bob
\`\`\`

**Benefits:**
- 10x faster (single API call vs 1000)
- Built-in retry logic
- Progress tracking
```

### 3. Improve Documentation

Documentation is critical for adoption. Help us improve it!

**What needs help:**
- Typo fixes
- Clarification
- Missing examples
- New use cases
- Translation (future)

**How to contribute:**
1. Find a doc that needs improvement
2. Click "Edit" on GitHub (or fork → edit → PR)
3. Make changes
4. Submit PR with description of what you improved

**Example PR description:**

```markdown
**Docs:** Add Python batch sending example

Added section to agent-integration.md showing how to send emails in bulk using Python with rate limiting and error handling.

**Changes:**
- New section: "Batch Sending in Python"
- Code example with error handling
- Best practices for rate limiting
```

### 4. Write Integration Examples

Show others how to use MailGoat!

**Examples we need:**
- Integration with specific agent frameworks
- Automation workflows
- Monitoring and alerting scripts
- Dashboard/reporting tools
- Webhook handlers

**How to contribute:**
1. Create your integration
2. Add to `examples/` directory
3. Include:
   - Header comment explaining use case
   - Installation instructions
   - Configuration requirements
   - Example usage
4. Submit PR

**Example structure:**

```bash
#!/bin/bash
# File: examples/my-integration.sh
# Use case: Send daily summary emails from cron
#
# Requirements:
# - mailgoat installed and configured
# - jq for JSON parsing
#
# Usage:
#   ./examples/my-integration.sh
#
# Cron setup:
#   0 9 * * * /path/to/my-integration.sh

# Your code here...
```

### 5. Submit Code

Ready to code? Awesome!

**Process:**
1. **Check issues** - Look for `good-first-issue` label
2. **Claim it** - Comment "I'll work on this"
3. **Fork & branch** - `git checkout -b feature/my-feature`
4. **Code** - Follow style guide (below)
5. **Test** - Write tests, run existing tests
6. **PR** - Submit with description
7. **Review** - Address feedback
8. **Merge** - We'll merge and thank you!

**PR checklist:**
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] PR description explains changes

## Development Setup

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** (comes with Node.js)
- **Git**
- **Postal instance** (for testing)

### Clone and Install

```bash
# Fork the repo on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/mailgoat.git
cd mailgoat

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link for local testing
npm link

# Verify
mailgoat --version
```

### Project Structure

```
mailgoat/
├── src/                  # TypeScript source code
│   ├── cli.ts            # Main CLI entry point
│   ├── commands/         # Command implementations
│   │   ├── send.ts
│   │   ├── read.ts
│   │   └── config.ts
│   ├── api/              # Postal API client
│   │   └── postal.ts
│   ├── config/           # Configuration management
│   │   └── loader.ts
│   └── utils/            # Utilities
│       ├── output.ts     # Output formatting
│       └── errors.ts     # Error handling
├── dist/                 # Compiled JavaScript (gitignored)
├── tests/                # Test suite
├── docs/                 # Technical documentation
├── examples/             # Integration examples
├── wiki/                 # User-facing wiki
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

### Build and Run

```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Run locally
npm start send --to test@example.com --subject "Test" --body "Hello"
```

### Testing

#### Unit Tests

```bash
npm test
```

Tests are in `tests/` using Jest.

**Writing tests:**

```typescript
// tests/commands/send.test.ts
import { send } from '../../src/commands/send';

describe('send command', () => {
  it('should send email successfully', async () => {
    const result = await send({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Hello'
    });
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
  
  it('should fail with invalid email', async () => {
    await expect(send({
      to: 'invalid-email',
      subject: 'Test',
      body: 'Hello'
    })).rejects.toThrow('Invalid email address');
  });
});
```

#### Integration Tests

```bash
# Requires running Postal instance
npm run test:integration
```

**Set up test environment:**

```bash
# Create test config
export MAILGOAT_CONFIG=~/.mailgoat/test.yml
mailgoat config init
# Enter test Postal credentials
```

#### Manual Testing

```bash
# Build and test locally
npm run build
npm link

# Test send
mailgoat send --to test@example.com --subject "Test" --body "Manual test"

# Test read
mailgoat read <message-id>

# Test JSON output
mailgoat send --to test@example.com --subject "Test" --body "JSON test" --json
```

## Code Style

### TypeScript Guidelines

- **Use TypeScript** - Not plain JavaScript
- **Strict mode** - No `any` types
- **Async/await** - Not callbacks
- **Named exports** - Not default exports
- **ESLint rules** - Follow `.eslintrc.json`

**Example:**

```typescript
// ✓ Good
export async function send(params: SendParams): Promise<SendResult> {
  try {
    const response = await postalApi.sendMessage(params);
    return {
      success: true,
      messageId: response.message.id
    };
  } catch (error) {
    throw new Error(`Send failed: ${error.message}`);
  }
}

// ✗ Bad
export default function(params: any) {
  return postalApi.sendMessage(params).then(response => {
    return response;
  }).catch(e => {
    console.error(e);
  });
}
```

### Code Formatting

We use Prettier for consistent formatting:

```bash
# Format all code
npm run format

# Check formatting
npm run format:check
```

**Settings (auto-applied):**
- 2-space indentation
- Single quotes
- Semicolons
- Trailing commas

### Error Handling

- **Throw typed errors** - Use custom error classes
- **Provide context** - Include relevant details
- **User-friendly messages** - Not stack traces (in prod)
- **Exit codes** - Follow CLI reference

**Example:**

```typescript
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Usage
if (!config.api_key) {
  throw new AuthenticationError('API key not configured. Run: mailgoat config init');
}
```

### Logging

- **Use debug mode** - `MAILGOAT_DEBUG=true`
- **No console.log in prod** - Use debug logger
- **JSON output mode** - Must be parseable JSON (no extra text)

**Example:**

```typescript
import debug from 'debug';
const log = debug('mailgoat:send');

export async function send(params: SendParams): Promise<SendResult> {
  log('Sending email to %s', params.to);
  
  try {
    const response = await postalApi.sendMessage(params);
    log('Send successful: %s', response.message.id);
    return { success: true, messageId: response.message.id };
  } catch (error) {
    log('Send failed: %s', error.message);
    throw error;
  }
}
```

### Documentation

- **JSDoc comments** - For exported functions
- **Inline comments** - For complex logic only
- **README updates** - If behavior changes
- **CHANGELOG** - For every PR

**Example:**

```typescript
/**
 * Send an email via Postal API
 * 
 * @param params - Send parameters (to, subject, body, etc.)
 * @returns Promise resolving to send result with message ID
 * @throws {AuthenticationError} If API key is invalid
 * @throws {NetworkError} If Postal server is unreachable
 * 
 * @example
 * ```typescript
 * const result = await send({
 *   to: 'user@example.com',
 *   subject: 'Hello',
 *   body: 'Test message'
 * });
 * console.log('Sent:', result.messageId);
 * ```
 */
export async function send(params: SendParams): Promise<SendResult> {
  // Implementation...
}
```

## Pull Request Process

### 1. Before You Start

- **Check existing issues** - Maybe it's already being worked on
- **Discuss big changes** - Open an issue first for large features
- **One feature per PR** - Keep PRs focused and reviewable

### 2. Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ... code, test, repeat ...

# Commit with clear messages
git add .
git commit -m "feat: add batch sending support

- Add send-batch command
- Support CSV and JSON input formats
- Include progress tracking
- Add tests for batch operations

Closes #123"

# Keep up to date with main
git fetch upstream
git rebase upstream/main

# Push to your fork
git push origin feature/my-feature
```

### 3. Submit PR

1. **Open PR** on GitHub
2. **Fill out template** - Describe what changed and why
3. **Link issues** - Use `Closes #123` or `Fixes #123`
4. **Request review** - Tag maintainers if needed

**PR template:**

```markdown
## Description
[What does this PR do?]

## Motivation
[Why is this change needed?]

## Changes
- [List of specific changes]

## Testing
[How did you test this?]

## Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] All tests pass

Closes #123
```

### 4. Code Review

- **Address feedback** - Make requested changes
- **Push updates** - Add commits to same branch
- **Be responsive** - Respond within a few days
- **Be patient** - Review may take time

### 5. Merge

Once approved, a maintainer will merge your PR. Thank you!

## Good First Issues

Looking for something to work on? Check issues labeled [`good-first-issue`](https://github.com/opengoat/mailgoat/labels/good-first-issue).

**Examples:**
- Add command alias support (e.g., `mg` for `mailgoat`)
- Improve error messages
- Add more examples
- Fix typos in docs
- Add missing tests

## Community

- **GitHub Discussions** - [Ask questions, share ideas](https://github.com/opengoat/mailgoat/discussions)
- **Discord** - [Join the community](https://discord.gg/mailgoat)
- **Email** - dev@mailgoat.ai

## Code of Conduct

**Be respectful.** We're all here to build useful tools.

- **Be kind** - Critique code, not people
- **Be constructive** - Suggest solutions, not just problems
- **Be collaborative** - Help others learn and grow
- **Be patient** - Everyone is learning

**Unacceptable:**
- Harassment or discrimination
- Trolling or inflammatory comments
- Publishing private information
- Spam or self-promotion

**Enforcement:** Violations may result in temporary or permanent ban.

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` - All contributors listed
- Release notes - PR authors credited
- README badges - Top contributors

## Questions?

- **General questions:** [GitHub Discussions](https://github.com/opengoat/mailgoat/discussions)
- **Development help:** [Discord #dev channel](https://discord.gg/mailgoat)
- **Security issues:** security@mailgoat.ai (private disclosure)

---

**Thank you for contributing to MailGoat!** 🐐

Every contribution—bug reports, docs, code, examples—makes MailGoat better for agents everywhere.
