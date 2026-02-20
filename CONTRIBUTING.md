# Contributing to MailGoat

Thanks for your interest in contributing.

Before contributing, please read our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to Contribute

You do not need to start with a large feature. Helpful contributions include:

- Code changes (bug fixes, performance, developer experience)
- Documentation improvements (clarity, corrections, missing examples)
- New examples and tutorials
- Bug reports with clear reproduction steps
- Feature proposals with use case and expected behavior

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Fork and Clone

```bash
# 1) Fork in GitHub UI, then clone your fork
git clone https://github.com/<your-user>/mailgoat.git
cd mailgoat

# 2) Add upstream remote
git remote add upstream https://github.com/mailgoatai/mailgoat.git

# 3) Install dependencies
npm install
```

### Verify Local Setup

```bash
npm run build
npm run lint
npm run typecheck
npm test
```

## Development Workflow

### Branch Naming

Create a feature branch from the default branch:

```bash
git checkout master
git pull upstream master
git checkout -b feature/add-inbox-filter
```

Use descriptive branch prefixes:

- `feature/<name>` for new functionality
- `fix/<name>` for bug fixes
- `docs/<name>` for documentation-only changes
- `chore/<name>` for tooling/maintenance work

### Commit Messages

Use clear, conventional commit messages:

- `feat: add inbox filtering by sender domain`
- `fix: handle empty recipient list in send command`
- `docs: add Playwright email testing guide`
- `test: add integration coverage for retry backoff`
- `chore: update eslint config for TS 5.9`

Bad examples:

- `update stuff`
- `misc fixes`
- `WIP`

### Local Quality Checks

Run these before pushing:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

MailGoat also uses Husky + lint-staged hooks on commit/push. Treat hook failures as required fixes, not optional warnings.

## Pull Request Process

All changes should go through a pull request.

### Open a PR

```bash
git push origin feature/add-inbox-filter
```

Then open a PR in GitHub against `mailgoatai/mailgoat`.

### What Makes a Good PR

- One focused change (avoid unrelated edits in the same PR)
- Clear title and description (problem, solution, tradeoffs)
- Tests added or updated for behavior changes
- Documentation updated for user-facing changes
- CI green before requesting final review

### Suggested PR Description

Include:

- What changed
- Why it changed
- How it was tested
- Screenshots/output (if relevant)
- Follow-up tasks (if any)

## Code Style

MailGoat is TypeScript-first and uses ESLint + Prettier.

### Conventions

- Prefer explicit types on public interfaces.
- Keep functions small and purpose-focused.
- Avoid dead code and commented-out blocks.
- Use clear names over abbreviations.

### Formatting and Linting

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
```

Resources:

- ESLint config: `eslint.config.mjs`
- TypeScript config: `tsconfig.json`
- Prettier config: `.prettierrc.json`

## Testing

### Run Existing Tests

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
```

### Writing New Tests

- Unit tests: `src/**/__tests__/*.test.ts` or adjacent test files following existing patterns
- Integration tests: `tests/integration/*.test.ts`
- E2E tests: `tests/e2e/*.test.ts`

Guidelines:

- Test behavior, not implementation details.
- Add regression tests for bug fixes.
- Keep tests deterministic and isolated.

## Documentation

If your change affects behavior, commands, flags, APIs, or workflows, update docs in the same PR.

Common docs to update:

- `README.md` for user-facing workflows
- `docs/api-reference.md` for command/flag changes
- `docs/guides/*.md` for new integration patterns
- `docs/faq.md` when common questions change

## Getting Help

If you get blocked, ask early:

- GitHub Discussions: <https://github.com/mailgoatai/mailgoat/discussions>
- GitHub Issues: <https://github.com/mailgoatai/mailgoat/issues>
- Community notes: `docs/COMMUNITY.md`

When asking for help, include:

- What you expected
- What happened
- Exact command(s) you ran
- Error output and environment details

Thanks for helping improve MailGoat.

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

## Dependency Updates

MailGoat uses [Dependabot](https://docs.github.com/en/code-security/dependabot) to automatically manage dependency updates.

### How It Works

- **Automated PRs:** Dependabot creates pull requests for dependency updates weekly
- **Grouped Updates:** Minor and patch updates are grouped together to reduce PR noise
- **Security Updates:** Critical security vulnerabilities trigger immediate PRs
- **GitHub Actions:** CI/CD workflow dependencies are also monitored

### What You Should Know

**For Maintainers:**

- Review and merge Dependabot PRs regularly (weekly check recommended)
- Major version updates require manual review and testing
- Minor/patch updates can often be merged after CI passes
- Security updates should be prioritized

**For Contributors:**

- Don't manually update dependencies without discussion (Dependabot handles this)
- If you need a specific version, mention it in your issue/PR
- Major dependency changes should be discussed first

**Configuration:**
See `.github/dependabot.yml` for the full configuration.

---

## License

By contributing to MailGoat, you agree that your contributions will be licensed under the MIT License.
