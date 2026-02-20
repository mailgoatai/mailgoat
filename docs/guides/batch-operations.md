# Guide: Batch Operations

Related docs: [Examples: batch-sender](../examples/batch-sender/README.md), [Error Handling](./error-handling.md)

## Principles

- Keep per-batch size small (25-200 recipients/messages depending on infrastructure).
- Add delay/jitter between sends to reduce burst pressure.
- Use tags to trace campaign waves.
- Capture per-message output IDs.

## Recommended Strategy

1. Validate input list format.
2. Split into chunks.
3. Send each chunk with retry enabled.
4. Persist result IDs and failures.
5. Requeue failures with capped attempts.

## CLI Pattern

```bash
mailgoat send-batch \
  --file recipients.json \
  --concurrency 10 \
  --metrics-output metrics.json
```

Campaign pattern (CSV + personalization + tracking):

```bash
mailgoat campaign send \
  --template newsletter.html \
  --subject "Hi {{name}}" \
  --recipients subscribers.csv \
  --name "Weekly Newsletter" \
  --batch-size 100 \
  --delay 2000
```

Resume interrupted batch:

```bash
mailgoat send-batch --file recipients.json --resume
```

Resume campaign:

```bash
mailgoat campaign send --resume <campaign-id>
```

## Scaling Tips

- Run multiple workers with partitioned input files.
- Avoid one huge process with unbounded memory.
- Separate transient failures from hard failures.
