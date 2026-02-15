#!/bin/bash
#
# Inbox Processing Agent
# 
# Reads and processes incoming emails, extracting commands or structured data.
# Supports command execution via email, automated workflows, and data extraction.
#
# USE CASES:
# - Email-based command execution
# - Automated ticket processing
# - Data extraction from emails
# - Email-triggered workflows
#
# PREREQUISITES:
# - MailGoat CLI installed and configured
# - mailgoat command in PATH
# - jq for JSON parsing (required)
#
# USAGE:
#   ./inbox-processor.sh
#
# ENVIRONMENT VARIABLES:
#   COMMAND_PREFIX    - Email subject prefix for commands (default: "CMD:")
#   POLL_INTERVAL     - Seconds between inbox checks (default: 60)
#   ALLOWED_SENDERS   - Comma-separated list of allowed sender emails (optional)
#   DRY_RUN          - If set, don't execute commands (default: false)
#

set -euo pipefail

# Configuration
COMMAND_PREFIX="${COMMAND_PREFIX:-CMD:}"
POLL_INTERVAL="${POLL_INTERVAL:-60}"
ALLOWED_SENDERS="${ALLOWED_SENDERS:-}"
DRY_RUN="${DRY_RUN:-false}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# State file to track processed messages
STATE_FILE="${HOME}/.mailgoat-inbox-processor-state.json"

# Check dependencies
if ! command -v mailgoat &> /dev/null; then
    echo -e "${RED}Error: mailgoat CLI not found${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not found. Install with: apt-get install jq${NC}"
    exit 1
fi

# Initialize state file
initialize_state() {
    if [ ! -f "$STATE_FILE" ]; then
        echo '{"processed_ids": []}' > "$STATE_FILE"
        echo -e "${GREEN}Created state file: $STATE_FILE${NC}"
    fi
}

# Check if message has been processed
is_processed() {
    local msg_id="$1"
    jq -e ".processed_ids | index(\"$msg_id\")" "$STATE_FILE" > /dev/null 2>&1
}

# Mark message as processed
mark_processed() {
    local msg_id="$1"
    
    # Add to processed list
    jq ".processed_ids += [\"$msg_id\"]" "$STATE_FILE" > "${STATE_FILE}.tmp"
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
}

# Check if sender is allowed
is_sender_allowed() {
    local from_email="$1"
    
    # If no allowlist configured, allow all
    if [ -z "$ALLOWED_SENDERS" ]; then
        return 0
    fi
    
    # Check if sender is in allowlist
    IFS=',' read -ra ALLOWED <<< "$ALLOWED_SENDERS"
    for allowed in "${ALLOWED[@]}"; do
        if [ "$from_email" = "$(echo $allowed | tr -d ' ')" ]; then
            return 0
        fi
    done
    
    return 1
}

# Extract command from email subject
extract_command() {
    local subject="$1"
    
    # Check if subject starts with command prefix
    if [[ "$subject" == "$COMMAND_PREFIX"* ]]; then
        # Remove prefix and return command
        echo "${subject#$COMMAND_PREFIX}" | xargs
    else
        echo ""
    fi
}

# Execute command from email
execute_command() {
    local command="$1"
    local from_email="$2"
    local msg_id="$3"
    
    echo -e "${BLUE}Executing command: $command${NC}"
    echo -e "${BLUE}Requested by: $from_email${NC}"
    
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${YELLOW}[DRY RUN] Would execute: $command${NC}"
        return 0
    fi
    
    # Execute command and capture output
    local output
    local exit_code
    
    if output=$(eval "$command" 2>&1); then
        exit_code=0
        echo -e "${GREEN}✓ Command executed successfully${NC}"
    else
        exit_code=$?
        echo -e "${RED}✗ Command failed with exit code $exit_code${NC}"
    fi
    
    # Send result back via email
    local result_body="Command execution result:

Command: $command
Exit code: $exit_code
Executed at: $(date)

Output:
$output"
    
    if mailgoat send \
        --to "$from_email" \
        --subject "Re: $COMMAND_PREFIX $command" \
        --body "$result_body" \
        --reply-to "$msg_id"; then
        echo -e "${GREEN}✓ Result sent to $from_email${NC}"
    else
        echo -e "${RED}✗ Failed to send result email${NC}"
    fi
}

# Process a single message
process_message() {
    local msg_id="$1"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Processing message: $msg_id${NC}"
    
    # Check if already processed
    if is_processed "$msg_id"; then
        echo -e "${YELLOW}⊘ Already processed, skipping${NC}"
        return 0
    fi
    
    # Read full message
    local message_json
    if ! message_json=$(mailgoat read "$msg_id" --json); then
        echo -e "${RED}✗ Failed to read message${NC}"
        return 1
    fi
    
    # Extract fields using jq
    local from_email=$(echo "$message_json" | jq -r '.from')
    local subject=$(echo "$message_json" | jq -r '.subject')
    local body=$(echo "$message_json" | jq -r '.body')
    local received_at=$(echo "$message_json" | jq -r '.received_at')
    
    echo "From: $from_email"
    echo "Subject: $subject"
    echo "Received: $received_at"
    
    # Check if sender is allowed
    if ! is_sender_allowed "$from_email"; then
        echo -e "${RED}✗ Sender not in allowlist, ignoring${NC}"
        mark_processed "$msg_id"
        return 0
    fi
    
    # Extract command from subject
    local command=$(extract_command "$subject")
    
    if [ -n "$command" ]; then
        echo -e "${GREEN}✓ Command detected${NC}"
        execute_command "$command" "$from_email" "$msg_id"
    else
        echo -e "${YELLOW}⊘ No command found in subject${NC}"
        
        # Could add other processing logic here:
        # - Data extraction
        # - Ticket creation
        # - Webhook triggering
    fi
    
    # Mark as processed
    mark_processed "$msg_id"
}

# Process inbox
process_inbox() {
    echo "[$(date)] Checking inbox..."
    
    # Get unread messages as JSON
    local inbox_json
    if ! inbox_json=$(mailgoat inbox --unread --json); then
        echo -e "${RED}✗ Failed to fetch inbox${NC}"
        return 1
    fi
    
    # Parse message IDs
    local msg_ids=$(echo "$inbox_json" | jq -r '.[] | .id')
    
    if [ -z "$msg_ids" ]; then
        echo -e "${GREEN}✓ No new messages${NC}"
        return 0
    fi
    
    local count=$(echo "$msg_ids" | wc -l)
    echo -e "${GREEN}Found $count unread message(s)${NC}"
    
    # Process each message
    while IFS= read -r msg_id; do
        if [ -n "$msg_id" ]; then
            process_message "$msg_id"
        fi
    done <<< "$msg_ids"
}

# Main loop
main() {
    echo "================================================"
    echo "Inbox Processing Agent"
    echo "================================================"
    echo "Command prefix: $COMMAND_PREFIX"
    echo "Poll interval: ${POLL_INTERVAL}s"
    echo "Allowed senders: ${ALLOWED_SENDERS:-all}"
    echo "Dry run: $DRY_RUN"
    echo "State file: $STATE_FILE"
    echo "================================================"
    echo ""
    
    initialize_state
    
    while true; do
        process_inbox
        
        echo ""
        echo "Next check in ${POLL_INTERVAL} seconds..."
        echo ""
        
        sleep "$POLL_INTERVAL"
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Processing stopped${NC}"; exit 0' INT TERM

# Run
main
