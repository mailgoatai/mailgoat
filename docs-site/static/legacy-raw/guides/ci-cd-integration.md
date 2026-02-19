# Guide: CI/CD Integration

Related docs: [Examples: ci-cd](../examples/ci-cd/README.md), [Security guide](./security.md)

## GitHub Actions

Use secrets for API key and sender configuration. Prefer job-scoped env vars.

```yaml
- name: Send deploy notification
  run: |
    mailgoat send --to ops@example.com --subject "Deploy $GITHUB_SHA" --body "Done"
  env:
    MAILGOAT_SERVER: ${{ secrets.MAILGOAT_SERVER }}
    MAILGOAT_API_KEY: ${{ secrets.MAILGOAT_API_KEY }}
    MAILGOAT_EMAIL: ${{ secrets.MAILGOAT_EMAIL }}
```

## GitLab CI

```yaml
notify:
  script:
    - mailgoat send --to ops@example.com --subject "Pipeline $CI_PIPELINE_ID" --body "Finished"
```

## Best Practices

- Never print API keys in logs.
- Use `--json` for machine parsing.
- Fail fast on notification failures only when required by policy.
