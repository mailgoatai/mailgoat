#!/bin/bash
#
# Automated Response Agent
# 
# Analyzes incoming emails and sends intelligent responses based on content.
# Uses pattern matching and templates to provide quick, automated replies.
#
# USE CASES:
# - Customer support automation
# - Out-of-office responses
# - FAQ automation
# - Email triage and categorization
#
# PREREQUISITES:
# - MailGoat CLI installed and configured
# - mailgoat command in PATH
# - jq for JSON parsing (required)
#
# USAGE:
#   ./auto-responder.sh
#
# ENVIRONMENT VARIABLES:
#   RESPONSE_TEMPLATES  - Path to response templates file (default: ./response-templates.json)
#   POLL_INTERVAL       - Seconds between inbox checks (default: 120)
#   AUTO_REPLY_ENABLED  - Enable automatic replies (default: true)
#   SIGNATURE          - Email signature to append (optional)
#

set -euo pipefail

# Configuration
RESPONSE_TEMPLATES="${RESPONSE_TEMPLATES:-./response-templates.json}"
POLL_INTERVAL="${POLL_INTERVAL:-120}"
AUTO_REPLY_ENABLED="${AUTO_REPLY_ENABLED:-true}"
SIGNATURE="${SIGNATURE:-

---
This is an automated response from an AI agent.
If you need human assistance, please reply with 'HUMAN' in the subject.}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# State file
STATE_FILE="${HOME}/.mailgoat-auto-responder-state.json"

# Check dependencies
if ! command -v mailgoat &> /dev/null; then
    echo -e "${RED}Error: mailgoat CLI not found${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not found${NC}"
    exit 1
fi

# Create default response templates if not exists
create_default_templates() {
    if [ ! -f "$RESPONSE_TEMPLATES" ]; then
        echo -e "${YELLOW}Creating default response templates...${NC}"
        
        cat > "$RESPONSE_TEMPLATES" << 'EOF'
{
  "templates": [
    {
      "name": "pricing_inquiry",
      "keywords": ["price", "pricing", "cost", "how much", "plan", "subscription"],
      "response": "Thank you for your interest in our pricing!\n\nWe offer several plans to fit different needs:\n\n- Free Tier: 1,000 emails/month\n- Starter: $10/month - 10,000 emails\n- Pro: $50/month - 100,000 emails\n- Enterprise: Custom pricing for higher volumes\n\nAll plans include full API access and webhook support.\n\nYou can view detailed pricing at: https://mailgoat.dev/pricing\n\nWould you like me to connect you with our sales team?"
    },
    {
      "name": "technical_support",
      "keywords": ["help", "error", "bug", "not working", "problem", "issue", "support"],
      "response": "Thank you for reaching out!\n\nI'm here to help with your technical issue. To assist you better, please provide:\n\n1. What were you trying to do?\n2. What happened instead?\n3. Any error messages you received\n4. Your CLI version (run: mailgoat --version)\n\nFor urgent issues, you can also check our documentation:\nhttps://docs.mailgoat.dev/troubleshooting\n\nOr join our community Discord:\nhttps://discord.gg/mailgoat\n\nI'll route this to our support team and they'll get back to you within 24 hours."
    },
    {
      "name": "getting_started",
      "keywords": ["how to", "getting started", "tutorial", "guide", "setup", "install"],
      "response": "Welcome to MailGoat! 🎉\n\nGetting started is easy:\n\n1. Install the CLI:\n   npm install -g mailgoat\n\n2. Register an account:\n   mailgoat register --email your-agent@example.com\n\n3. Send your first email:\n   mailgoat send --to someone@example.com --subject \"Hello\" --body \"Test email\"\n\nCheck out our quickstart guide:\nhttps://docs.mailgoat.dev/quickstart\n\nOr watch our 5-minute video tutorial:\nhttps://mailgoat.dev/tutorial\n\nLet me know if you have any questions!"
    },
    {
      "name": "feature_request",
      "keywords": ["feature", "request", "suggestion", "would be nice", "can you add", "enhancement"],
      "response": "Thanks for the feature suggestion!\n\nWe love hearing from our users about what would make MailGoat better.\n\nI've logged your request and our product team will review it. You can track feature requests and vote on others here:\nhttps://github.com/mailgoat/mailgoat/discussions/categories/ideas\n\nIn the meantime, you might want to check if there's a workaround using our current features:\nhttps://docs.mailgoat.dev\n\nWe'll keep you updated!"
    },
    {
      "name": "integration_question",
      "keywords": ["integrate", "api", "webhook", "openclaw", "zapier", "automation"],
      "response": "Great question about integrations!\n\nMailGoat is designed to be integration-friendly:\n\n**APIs:**\n- RESTful HTTP API\n- Full CLI access\n- Webhook support for push notifications\n\n**Common Integrations:**\n- OpenClaw agents (native support)\n- Zapier (coming soon)\n- Make.com (coming soon)\n- Custom webhooks\n\nCheck our integration guides:\nhttps://docs.mailgoat.dev/integrations\n\nExample code:\nhttps://github.com/mailgoat/examples\n\nWhat are you trying to integrate with?"
    },
    {
      "name": "default",
      "keywords": [],
      "response": "Thank you for your email!\n\nI'm an automated agent that handles initial responses. I've received your message and logged it for our team.\n\nSomeone will get back to you within 24-48 hours during business days.\n\nIn the meantime:\n- For technical issues: https://docs.mailgoat.dev\n- For urgent matters: Reply with 'URGENT' in the subject\n- Join our community: https://discord.gg/mailgoat\n\nThanks for your patience!"
    }
  ]
}
EOF
        
        echo -e "${GREEN}✓ Created default templates at $RESPONSE_TEMPLATES${NC}"
    fi
}

# Initialize state
initialize_state() {
    if [ ! -f "$STATE_FILE" ]; then
        echo '{"processed_ids": [], "response_count": 0}' > "$STATE_FILE"
    fi
}

# Check if processed
is_processed() {
    local msg_id="$1"
    jq -e ".processed_ids | index(\"$msg_id\")" "$STATE_FILE" > /dev/null 2>&1
}

# Mark processed
mark_processed() {
    local msg_id="$1"
    jq ".processed_ids += [\"$msg_id\"] | .response_count += 1" "$STATE_FILE" > "${STATE_FILE}.tmp"
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
}

# Find matching template
find_template() {
    local subject="$1"
    local body="$2"
    
    # Combine subject and body for matching
    local content="$(echo "$subject $body" | tr '[:upper:]' '[:lower:]')"
    
    # Load templates
    local templates=$(jq -c '.templates[]' "$RESPONSE_TEMPLATES")
    
    local best_match=""
    local best_score=0
    
    # Check each template
    while IFS= read -r template; do
        local name=$(echo "$template" | jq -r '.name')
        local keywords=$(echo "$template" | jq -r '.keywords[]')
        local score=0
        
        # Count keyword matches
        while IFS= read -r keyword; do
            if [[ "$content" == *"$keyword"* ]]; then
                score=$((score + 1))
            fi
        done <<< "$keywords"
        
        # Update best match if better score
        if [ $score -gt $best_score ]; then
            best_score=$score
            best_match="$name"
        fi
    done <<< "$templates"
    
    # Return default if no good match
    if [ $best_score -eq 0 ]; then
        echo "default"
    else
        echo "$best_match"
    fi
}

# Get template response
get_response() {
    local template_name="$1"
    jq -r ".templates[] | select(.name == \"$template_name\") | .response" "$RESPONSE_TEMPLATES"
}

# Send automated response
send_response() {
    local to_email="$1"
    local original_subject="$2"
    local response_text="$3"
    local msg_id="$4"
    
    local response_subject="Re: $original_subject"
    local full_response="${response_text}${SIGNATURE}"
    
    if [ "$AUTO_REPLY_ENABLED" != "true" ]; then
        echo -e "${YELLOW}[DRY RUN] Would send response to $to_email${NC}"
        echo -e "${BLUE}Subject: $response_subject${NC}"
        echo -e "${BLUE}Body preview: ${response_text:0:100}...${NC}"
        return 0
    fi
    
    # Send reply
    if mailgoat send \
        --to "$to_email" \
        --subject "$response_subject" \
        --body "$full_response" \
        --reply-to "$msg_id"; then
        echo -e "${GREEN}✓ Response sent to $to_email${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to send response${NC}"
        return 1
    fi
}

# Process single message
process_message() {
    local msg_id="$1"
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Processing message: $msg_id${NC}"
    
    # Check if already processed
    if is_processed "$msg_id"; then
        echo -e "${YELLOW}⊘ Already processed${NC}"
        return 0
    fi
    
    # Read message
    local message_json
    if ! message_json=$(mailgoat read "$msg_id" --json); then
        echo -e "${RED}✗ Failed to read message${NC}"
        return 1
    fi
    
    # Extract fields
    local from_email=$(echo "$message_json" | jq -r '.from')
    local subject=$(echo "$message_json" | jq -r '.subject')
    local body=$(echo "$message_json" | jq -r '.body')
    
    echo "From: $from_email"
    echo "Subject: $subject"
    
    # Check for "HUMAN" keyword - skip auto-response if human requested
    if [[ "$subject" == *"HUMAN"* ]] || [[ "$body" == *"HUMAN"* ]]; then
        echo -e "${YELLOW}⊘ Human assistance requested - skipping auto-response${NC}"
        # TODO: Flag for human review
        mark_processed "$msg_id"
        return 0
    fi
    
    # Find matching template
    local template=$(find_template "$subject" "$body")
    echo "Matched template: $template"
    
    # Get response text
    local response=$(get_response "$template")
    
    # Send response
    send_response "$from_email" "$subject" "$response" "$msg_id"
    
    # Mark processed
    mark_processed "$msg_id"
}

# Process inbox
process_inbox() {
    echo "[$(date)] Checking inbox..."
    
    local inbox_json
    if ! inbox_json=$(mailgoat inbox --unread --json); then
        echo -e "${RED}✗ Failed to fetch inbox${NC}"
        return 1
    fi
    
    local msg_ids=$(echo "$inbox_json" | jq -r '.[] | .id')
    
    if [ -z "$msg_ids" ]; then
        echo -e "${GREEN}✓ No new messages${NC}"
        return 0
    fi
    
    local count=$(echo "$msg_ids" | wc -l)
    echo -e "${GREEN}Found $count unread message(s)${NC}"
    
    while IFS= read -r msg_id; do
        if [ -n "$msg_id" ]; then
            process_message "$msg_id"
        fi
    done <<< "$msg_ids"
}

# Main
main() {
    echo "================================================"
    echo "Automated Response Agent"
    echo "================================================"
    echo "Templates: $RESPONSE_TEMPLATES"
    echo "Poll interval: ${POLL_INTERVAL}s"
    echo "Auto-reply: $AUTO_REPLY_ENABLED"
    echo "State: $STATE_FILE"
    echo "================================================"
    echo ""
    
    create_default_templates
    initialize_state
    
    # Show stats
    local response_count=$(jq -r '.response_count' "$STATE_FILE")
    echo -e "${GREEN}Total responses sent: $response_count${NC}"
    echo ""
    
    while true; do
        process_inbox
        
        echo ""
        echo "Next check in ${POLL_INTERVAL} seconds..."
        echo ""
        
        sleep "$POLL_INTERVAL"
    done
}

trap 'echo -e "\n${YELLOW}Auto-responder stopped${NC}"; exit 0' INT TERM

main
