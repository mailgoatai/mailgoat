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
while IFS=, read -r email name; do
  mailgoat send \
    --to "$email" \
    --subject "Campaign Update" \
    --body "Hello $name" \
    --tag campaign-2026-02
  sleep 0.2
done < recipients.csv
```

## Scaling Tips

- Run multiple workers with partitioned input files.
- Avoid one huge process with unbounded memory.
- Separate transient failures from hard failures.
