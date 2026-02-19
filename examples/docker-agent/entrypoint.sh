#!/bin/sh
set -eu

# Write cron schedule from env (default every 5 minutes)
CRON_SCHEDULE="${CRON_SCHEDULE:-*/5 * * * *}"
mkdir -p /var/spool/cron/crontabs

echo "$CRON_SCHEDULE /opt/agent/agent.sh >> /var/log/agent.log 2>&1" > /var/spool/cron/crontabs/root
chmod 600 /var/spool/cron/crontabs/root

echo "Starting cron with schedule: $CRON_SCHEDULE"
crond -f -l 8
