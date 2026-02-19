#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_BIN="docker-compose"
elif command -v docker >/dev/null 2>&1; then
  COMPOSE_BIN="docker compose"
else
  echo "Error: docker-compose or docker compose is required."
  exit 1
fi

compose() {
  # shellcheck disable=SC2086
  $COMPOSE_BIN -f "$REPO_ROOT/docker-compose.yml" "$@"
}

echo "[1/5] Checking Docker daemon..."
if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker daemon is not running."
  exit 1
fi

echo "[2/5] Ensuring local Postal stack is running..."
compose up -d db redis rabbitmq postal postal-worker postal-smtp

echo "[3/5] Waiting for Postal API on http://localhost:5000 ..."
for i in $(seq 1 60); do
  if curl -fsS "http://localhost:5000" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [ "$i" -eq 60 ]; then
    echo "Error: Postal did not become reachable in time."
    exit 1
  fi
done

echo "[4/5] Initializing Postal database (safe to run multiple times)..."
if ! compose exec -T postal postal initialize; then
  echo "Info: 'postal initialize' returned non-zero. It may already be initialized."
fi

MAILGOAT_ENV_FILE="$REPO_ROOT/.env.mailgoat.local"
DEFAULT_KEY="${POSTAL_API_KEY:-}"

if [ -z "$DEFAULT_KEY" ]; then
  echo ""
  echo "Postal is initialized. Next step is creating/retrieving a Server API key."
  echo "- Open: http://localhost:5000"
  echo "- Create org/server + server credential in Postal UI"
  echo "- Paste the API key below"
  read -r -p "Postal API key: " DEFAULT_KEY
fi

if [ -z "$DEFAULT_KEY" ]; then
  echo "Error: API key is required to generate MailGoat local env file."
  exit 1
fi

cat > "$MAILGOAT_ENV_FILE" <<ENVEOF
MAILGOAT_SERVER=http://localhost:5000
MAILGOAT_API_KEY=$DEFAULT_KEY
MAILGOAT_FROM_ADDRESS=agent@local.test
MAILGOAT_FROM_NAME=Local Agent
ENVEOF

echo "[5/5] Wrote $MAILGOAT_ENV_FILE"
echo "Done. Run: mailgoat config init"
echo "Server: http://localhost:5000"
echo "API key: (use value from $MAILGOAT_ENV_FILE)"
