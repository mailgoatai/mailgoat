# Guide: Templates

Related docs: [API Reference: send](../api-reference.md), [Examples: report-generator](../examples/report-generator/README.md)

## Syntax

Handlebars-style templating:
- Variables: `{{name}}`
- Helpers: `{{uppercase value}}`, `{{lowercase value}}`, `{{date}}`

## Data Inputs

You can pass variables via:
- `--var key=value` (repeatable)
- `--data data.json` (JSON object)

If keys overlap, `--var` overrides the JSON file.

## Modes

1. Inline template in `--subject` / `--body`.
2. `--template <saved-name>` from template storage.
3. `--template <file-path>` direct body template file.

## Examples

```bash
mailgoat send --to user@example.com \
  --subject "Hello {{uppercase name}}" \
  --body "Generated at {{date}}" \
  --data data.json

mailgoat template create welcome -s "Welcome {{name}}" -b "Hi {{name}}"
mailgoat send --template welcome --to user@example.com --var name=alice
```

## Validation and Failure Mode

Template rendering is strict. Missing variables produce an error and message send is aborted.
