# Local Postal Development

Use this setup to run a local Postal server for MailGoat testing.

## What this provides

- Postal Web UI/API on `http://localhost:5000`
- SMTP on port `25`
- Backing services: MariaDB, Redis, RabbitMQ
- A bootstrap script to initialize Postal and generate local MailGoat env config

## Prerequisites

- Docker
- Docker Compose (`docker-compose` or `docker compose`)
- MailGoat CLI available in your shell

## Quick Start

```bash
# 1. Start Postal stack
docker-compose up -d

# 2. Initialize (first time only)
./scripts/init-postal.sh

# 3. Configure MailGoat
mailgoat config init
# Enter server: http://localhost:5000
# Enter API key from .env.mailgoat.local

# 4. Send a test email
mailgoat send --to test@example.com --subject "Test" --body "Hello!"
```

## Files

- `docker-compose.yml`: local Postal development stack
- `scripts/init-postal.sh`: one-time initialization helper
- `.env.mailgoat.local.example`: sample MailGoat local env config

## Init script details

`./scripts/init-postal.sh` does the following:

1. Verifies Docker daemon is running
2. Starts all required containers
3. Waits for `http://localhost:5000`
4. Runs `postal initialize`
5. Prompts for (or reads) `POSTAL_API_KEY`
6. Writes `.env.mailgoat.local`

If `POSTAL_API_KEY` is already set in your shell, the script uses it directly:

```bash
POSTAL_API_KEY=your_key_here ./scripts/init-postal.sh
```

## Getting an API key

If you do not already have one, create a server API credential in Postal UI:

1. Open `http://localhost:5000`
2. Create admin user/org/server (first run)
3. Create a server credential
4. Copy the generated API key
5. Re-run `./scripts/init-postal.sh` and paste the key

## Troubleshooting

- Docker daemon not running:

```bash
docker info
```

- Postal logs:

```bash
docker-compose logs -f postal
```

- Reset local data:

```bash
docker-compose down -v
```

This removes the `db-data` volume and re-initializes everything.
