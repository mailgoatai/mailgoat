#!/usr/bin/env bash
#
# MailGoat Delete Command Examples
# Demonstrates various ways to delete messages
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}MailGoat Delete Command Examples${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Example 1: Delete single message
echo -e "${YELLOW}Example 1: Delete Single Message${NC}"
echo -e "${BLUE}Command:${NC} mailgoat delete msg-12345"
echo
echo "This will:"
echo "  1. Prompt for confirmation"
echo "  2. Delete the message"
echo "  3. Show success message"
echo
echo -e "${GREEN}Output:${NC}"
echo "? Delete message msg-12345? (y/N) y"
echo "✓ Message msg-12345 deleted successfully"
echo

# Example 2: Delete without confirmation
echo -e "${YELLOW}Example 2: Delete Without Confirmation${NC}"
echo -e "${BLUE}Command:${NC} mailgoat delete msg-12345 --yes"
echo
echo "Skips confirmation prompt. Useful for scripts."
echo
echo -e "${RED}⚠️  WARNING:${NC} Use --yes carefully, especially in automation!"
echo

# Example 3: Dry run
echo -e "${YELLOW}Example 3: Dry Run (Preview)${NC}"
echo -e "${BLUE}Command:${NC} mailgoat delete msg-12345 --dry-run"
echo
echo "Shows what would be deleted without actually deleting."
echo
echo -e "${GREEN}Output:${NC}"
echo "[DRY RUN] Would delete message: msg-12345"
echo

# Example 4: JSON output
echo -e "${YELLOW}Example 4: JSON Output${NC}"
echo -e "${BLUE}Command:${NC} mailgoat delete msg-12345 --json"
echo
echo "Outputs result in JSON format for script parsing."
echo
echo -e "${GREEN}Output:${NC}"
echo '{'
echo '  "success": true,'
echo '  "deleted": ["msg-12345"],'
echo '  "count": 1'
echo '}'
echo

# Example 5: Delete with debug mode
echo -e "${YELLOW}Example 5: Debug Mode${NC}"
echo -e "${BLUE}Command:${NC} mailgoat delete msg-12345 --debug"
echo
echo "Shows detailed debug information including:"
echo "  - API requests and responses"
echo "  - Timing information"
echo "  - Retry attempts"
echo

# Example 6: Script integration
echo -e "${YELLOW}Example 6: Script Integration${NC}"
echo -e "${BLUE}Bash Script:${NC}"
cat <<'EOF'
#!/bin/bash
MESSAGE_ID="msg-12345"

# Delete with JSON output
result=$(mailgoat delete "$MESSAGE_ID" --yes --json)

# Check if successful
if [ $(echo "$result" | jq -r '.success') = "true" ]; then
  echo "Successfully deleted message: $MESSAGE_ID"
else
  echo "Failed to delete message"
  exit 1
fi
EOF
echo

# Example 7: Bulk deletion (coming soon)
echo -e "${YELLOW}Example 7: Bulk Deletion (Coming Soon)${NC}"
echo
echo "These commands will be available in future releases:"
echo
echo -e "${BLUE}Delete old messages:${NC}"
echo "  mailgoat delete --older-than 30d"
echo
echo -e "${BLUE}Delete from specific sender:${NC}"
echo "  mailgoat delete --from spam@example.com"
echo
echo -e "${BLUE}Delete tagged messages:${NC}"
echo "  mailgoat delete --tag newsletter --older-than 90d"
echo
echo -e "${BLUE}Combined filters:${NC}"
echo "  mailgoat delete --older-than 30d --from test@example.com --limit 50"
echo

# Example 8: Automation with cron
echo -e "${YELLOW}Example 8: Automated Cleanup with Cron${NC}"
echo
echo "Add to crontab for automated cleanup:"
echo
echo -e "${BLUE}Delete old messages weekly:${NC}"
echo "0 2 * * 0 /usr/local/bin/mailgoat delete --older-than 90d --yes >> /var/log/mailgoat.log 2>&1"
echo
echo -e "${BLUE}Daily cleanup of test messages:${NC}"
echo "0 1 * * * /usr/local/bin/mailgoat delete --tag test --older-than 7d --yes"
echo

# Best practices
echo -e "${YELLOW}Best Practices${NC}"
echo
echo "1. ${GREEN}Always test with dry-run first:${NC}"
echo "   mailgoat delete msg-12345 --dry-run"
echo
echo "2. ${GREEN}Use --yes carefully in automation:${NC}"
echo "   # Add error checking"
echo "   if ! mailgoat delete msg-12345 --yes --json; then"
echo "     echo 'Delete failed!'"
echo "     exit 1"
echo "   fi"
echo
echo "3. ${GREEN}Keep logs for automated deletions:${NC}"
echo "   mailgoat delete --older-than 90d --yes 2>&1 | tee -a cleanup.log"
echo
echo "4. ${GREEN}Use specific filters to avoid accidents:${NC}"
echo "   # Good: Specific tag and time range"
echo "   mailgoat delete --tag temp --older-than 7d"
echo "   "
echo "   # Risky: No filters"
echo "   mailgoat delete --older-than 1d  # Might delete too much!"
echo

# Real-world example
echo -e "${YELLOW}Real-World Example: Test Email Cleanup${NC}"
echo
echo "Scenario: Clean up test emails after CI/CD runs"
echo
cat <<'EOF'
#!/bin/bash
# cleanup-test-emails.sh

# Configuration
TAG="ci-test"
MAX_AGE="6h"
LOG_FILE="/var/log/mailgoat-cleanup.log"

# Log function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Main cleanup
log "Starting test email cleanup..."

# Dry run first
log "Running dry-run to preview..."
mailgoat delete --tag "$TAG" --older-than "$MAX_AGE" --dry-run

# Actual deletion
log "Deleting test emails..."
result=$(mailgoat delete --tag "$TAG" --older-than "$MAX_AGE" --yes --json)

# Check result
if [ $(echo "$result" | jq -r '.success') = "true" ]; then
  count=$(echo "$result" | jq -r '.count')
  log "Successfully deleted $count test emails"
else
  log "ERROR: Failed to delete test emails"
  exit 1
fi

log "Cleanup completed successfully"
EOF
echo

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}For more information:${NC}"
echo "  mailgoat delete --help"
echo "  mailgoat --help"
echo
echo "Documentation: docs/DELETE.md"
echo -e "${BLUE}========================================${NC}"
