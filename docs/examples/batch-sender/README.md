# Example: Batch Sender

High-volume send pattern with CSV input and pacing.

## Input format

`recipients.csv`:

```csv
email,name
alice@example.com,Alice
bob@example.com,Bob
```

## Run

```bash
./batch-send.sh recipients.csv
```
