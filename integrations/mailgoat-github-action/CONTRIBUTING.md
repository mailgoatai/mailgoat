# Contributing to MailGoat GitHub Action

Thank you for considering contributing! This document provides guidelines for contributing to this project.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- GitHub account

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/mailgoatai/mailgoat-github-action.git
cd mailgoat-github-action

# Install dependencies
npm install

# Build
npm run build

# Run tests (when available)
npm test
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Use prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clear, concise code
- Follow TypeScript best practices
- Add comments for complex logic
- Update documentation if needed

### 3. Test Your Changes

Test locally before committing:

```bash
# Build action
npm run build

# Set environment variables
export INPUT_POSTAL_SERVER="https://postal.example.com"
export INPUT_POSTAL_API_KEY="your_test_key"
export INPUT_FROM_EMAIL="test@example.com"
export INPUT_TO="recipient@example.com"
export INPUT_SUBJECT="Test"
export INPUT_BODY="Test body"

# Run action
node dist/index.js
```

### 4. Commit Changes

Write clear commit messages:

```bash
git commit -m "feat: add attachment support"
git commit -m "fix: handle invalid email addresses"
git commit -m "docs: update README examples"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style/formatting
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Pull Request Guidelines

### PR Title

Use clear, descriptive titles:

- ✅ "Add support for email attachments"
- ✅ "Fix validation for international email addresses"
- ❌ "Update code"
- ❌ "Fixes"

### PR Description

Include:

1. **What** - What does this PR do?
2. **Why** - Why is this change needed?
3. **How** - How does it work?
4. **Testing** - How was it tested?

Example:

```markdown
## What

Adds support for email attachments via the `attachments` input.

## Why

Users requested the ability to send files with notifications.

## How

- Added `attachments` input to action.yml
- Implemented base64 encoding in src/index.ts
- Updated Postal API call to include attachments

## Testing

- Tested with PDF attachment (2MB)
- Tested with multiple attachments
- Verified error handling for large files
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await over callbacks
- Add JSDoc comments for public functions
- Use meaningful variable names

Example:

```typescript
/**
 * Send email via Postal API
 * @param config Email configuration
 * @returns Postal API response
 */
async function sendEmail(config: EmailConfig): Promise<PostalResponse> {
  // Implementation
}
```

### Formatting

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in objects/arrays
- Max line length: 100 characters

Run linter:

```bash
npm run lint
```

## Testing

### Manual Testing

Always test your changes manually:

1. Build the action: `npm run build`
2. Set environment variables
3. Run: `node dist/index.js`
4. Verify email sent correctly

### Automated Tests

When adding tests (future):

```bash
npm test
```

## Documentation

Update documentation when adding features:

- Update `README.md` with new inputs/outputs
- Add examples to example workflows
- Update `CHANGELOG.md`
- Add JSDoc comments to new functions

## Releasing

(For maintainers only)

### Version Numbers

Follow [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backwards compatible)
- Patch: Bug fixes

### Release Process

1. Update `CHANGELOG.md`
2. Update version in `package.json`
3. Build: `npm run build`
4. Commit: `git commit -m "chore: release v1.1.0"`
5. Tag: `git tag -a v1.1.0 -m "v1.1.0"`
6. Push: `git push && git push --tags`
7. Create GitHub release
8. Update marketplace listing

## Questions?

- **Issues:** https://github.com/mailgoatai/mailgoat-github-action/issues
- **Discussions:** https://github.com/mailgoatai/mailgoat-github-action/discussions
- **Discord:** https://discord.gg/mailgoat

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
