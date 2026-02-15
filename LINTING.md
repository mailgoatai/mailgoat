# Code Quality Setup

This project uses ESLint and Prettier to maintain code quality and consistency.

## Tools

- **ESLint** - Linting for TypeScript code
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Run linters on staged files

## Quick Start

```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Type checking
npm run typecheck
```

## Pre-commit Hooks

Husky is configured to run lint-staged on pre-commit. This automatically:

- Runs ESLint with auto-fix on staged `.ts` files
- Runs Prettier on staged `.ts`, `.json`, `.md`, `.yml` files

To bypass pre-commit hooks (not recommended):

```bash
git commit --no-verify
```

## ESLint Configuration

Configuration: `eslint.config.mjs` (ESLint 9 flat config)

### Rules

**TypeScript-specific:**

- `@typescript-eslint/no-explicit-any` - Warn on `any` usage (not error to allow gradual typing)
- `@typescript-eslint/no-unused-vars` - Error on unused variables (except prefixed with `_`)
- `@typescript-eslint/explicit-function-return-type` - Off (allow type inference)
- `@typescript-eslint/no-require-imports` - Off (allow CommonJS imports where needed)

**General:**

- `prefer-const` - Error (use const when variable isn't reassigned)
- `no-var` - Error (always use let/const, never var)
- `eqeqeq` - Error (always use `===` and `!==`)
- `curly` - Error (always use braces for if/while/for)

### Ignored Patterns

- `dist/**` - Build output
- `node_modules/**` - Dependencies
- `bin/**` - CLI binary
- `examples/**` - Example files
- `docs/**` - Documentation
- `*.js`, `*.mjs`, `*.cjs` - JavaScript config files

## Prettier Configuration

Configuration: `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5",
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/lint.yml`) runs on every push and PR:

1. ESLint check
2. Prettier formatting check
3. TypeScript type check

## Editor Integration

### VS Code

Install extensions:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

Add to `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["typescript"]
}
```

### Other Editors

- **IntelliJ/WebStorm**: ESLint and Prettier support built-in
- **Vim/Neovim**: Use ALE or coc.nvim with eslint and prettier plugins
- **Sublime Text**: Install SublimeLinter-eslint and JsPrettier packages

## Troubleshooting

### ESLint not running

```bash
# Check ESLint is installed
npx eslint --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --include=dev
```

### Prettier conflicts with ESLint

We use `eslint-config-prettier` to disable conflicting ESLint rules. If you see conflicts:

```bash
# Check for conflicts
npx eslint-config-prettier src/index.ts
```

### Pre-commit hooks not working

```bash
# Reinstall Husky
rm -rf .husky
npx husky init
echo 'npx lint-staged' > .husky/pre-commit
chmod +x .husky/pre-commit
```

### "any" warnings

The project allows `any` types with warnings (not errors) to enable gradual typing. To fix:

1. Replace `any` with specific types
2. Use `unknown` and type guards
3. Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for legitimate cases

## Scripts Reference

| Script                 | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm run lint`         | Run ESLint on all TypeScript files             |
| `npm run lint:fix`     | Run ESLint with auto-fix                       |
| `npm run format`       | Format all TypeScript files with Prettier      |
| `npm run format:check` | Check formatting without modifying files       |
| `npm run typecheck`    | Run TypeScript compiler without emitting files |

## Contributing

All code contributions must:

1. ✅ Pass ESLint checks
2. ✅ Be formatted with Prettier
3. ✅ Pass TypeScript type checking
4. ✅ Pass pre-commit hooks

Pull requests with linting errors will not be merged.

## Updating Configuration

To modify linting rules:

1. Edit `eslint.config.mjs`
2. Test changes: `npm run lint`
3. Update this documentation
4. Commit changes

To modify formatting:

1. Edit `.prettierrc.json`
2. Run `npm run format` to apply to all files
3. Update this documentation
4. Commit changes

## Dependencies

```json
{
  "@typescript-eslint/eslint-plugin": "^8.55.0",
  "@typescript-eslint/parser": "^8.55.0",
  "eslint": "^9.39.2",
  "eslint-config-prettier": "^10.1.8",
  "husky": "^9.1.7",
  "lint-staged": "^16.2.7",
  "prettier": "^3.8.1"
}
```

## Resources

- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/okonet/lint-staged)
