#!/bin/bash
#
# Daily Digest Agent
# 
# Aggregates information from multiple sources and sends a formatted summary email.
# Perfect for daily reports, news summaries, metric dashboards, and status roundups.
#
# USE CASES:
# - Daily status reports
# - News/article summaries
# - Metric dashboards
# - Team activity roundups
# - System health digests
#
# PREREQUISITES:
# - MailGoat CLI installed and configured
# - mailgoat command in PATH
# - jq for JSON parsing (optional)
#
# USAGE:
#   DIGEST_EMAIL=team@example.com ./digest-agent.sh
#
# CRON EXAMPLE:
#   # Send daily digest at 9 AM
#   0 9 * * * /path/to/digest-agent.sh
#
# ENVIRONMENT VARIABLES:
#   DIGEST_EMAIL      - Email to send digest to (required)
#   DIGEST_TITLE      - Custom digest title (default: "Daily Digest")
#   INCLUDE_WEATHER   - Include weather forecast (default: true)
#   INCLUDE_SYSTEM    - Include system metrics (default: true)
#   INCLUDE_GIT       - Include git activity (default: true)
#   PROJECT_DIR       - Project directory for git stats (default: current dir)
#

set -euo pipefail

# Configuration
DIGEST_EMAIL="${DIGEST_EMAIL:-team@example.com}"
DIGEST_TITLE="${DIGEST_TITLE:-Daily Digest}"
INCLUDE_WEATHER="${INCLUDE_WEATHER:-true}"
INCLUDE_SYSTEM="${INCLUDE_SYSTEM:-true}"
INCLUDE_GIT="${INCLUDE_GIT:-true}"
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check mailgoat
if ! command -v mailgoat &> /dev/null; then
    echo -e "${RED}Error: mailgoat CLI not found${NC}"
    exit 1
fi

# Gather weather information (mock - replace with actual weather API)
get_weather() {
    if [ "$INCLUDE_WEATHER" != "true" ]; then
        return
    fi
    
    cat << EOF

## 🌤 Weather Forecast

**Today:** Partly cloudy, High 72°F / Low 58°F
**Tomorrow:** Sunny, High 75°F / Low 60°F

*Weather data for San Francisco, CA*

EOF
}

# Gather system metrics
get_system_metrics() {
    if [ "$INCLUDE_SYSTEM" != "true" ]; then
        return
    fi
    
    local hostname=$(hostname)
    local uptime_info=$(uptime | awk -F'load average:' '{print $2}')
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}')
    local mem_free="N/A"
    
    if command -v free &> /dev/null; then
        mem_free=$(free -h | grep Mem | awk '{print $4}')
    fi
    
    cat << EOF

## 💻 System Status

**Server:** \`$hostname\`
**Uptime:** Running smoothly
**Load Average:** $uptime_info
**Disk Usage:** $disk_usage used
**Memory Free:** $mem_free

EOF
}

# Gather git activity
get_git_activity() {
    if [ "$INCLUDE_GIT" != "true" ]; then
        return
    fi
    
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        return
    fi
    
    cd "$PROJECT_DIR"
    
    # Get commits from last 24 hours
    local commits=$(git log --since="24 hours ago" --oneline 2>/dev/null || echo "")
    local commit_count=$(echo "$commits" | grep -c "^" || echo "0")
    
    # Get contributors
    local contributors=$(git log --since="24 hours ago" --format='%an' 2>/dev/null | sort -u || echo "")
    
    # Get file changes
    local files_changed=$(git diff --stat HEAD~1..HEAD 2>/dev/null | tail -1 || echo "No changes")
    
    cat << EOF

## 🔧 Development Activity

**Repository:** $PROJECT_DIR
**Commits (24h):** $commit_count
**Contributors:** 
$(echo "$contributors" | sed 's/^/- /')

**Recent Commits:**
\`\`\`
$(echo "$commits" | head -5)
\`\`\`

**Changes:** $files_changed

EOF
}

# Gather email statistics
get_email_stats() {
    # This would query MailGoat stats if available
    # For now, generate mock data
    
    cat << EOF

## 📧 Email Activity

**Last 24 hours:**
- Received: 42 emails
- Sent: 18 emails
- Auto-responses: 7

**Top Senders:**
1. notifications@github.com (12)
2. team@company.com (8)
3. alerts@monitoring.com (5)

EOF
}

# Gather custom metrics (placeholder for user customization)
get_custom_metrics() {
    # Add your custom data sources here
    # Examples:
    # - API metrics
    # - Database stats
    # - Application logs
    # - Third-party integrations
    
    cat << EOF

## 📊 Custom Metrics

**API Requests (24h):** 1,247
**Response Time (avg):** 142ms
**Error Rate:** 0.3%
**Active Users:** 89

**Top Endpoints:**
1. /api/send - 543 requests
2. /api/inbox - 387 requests
3. /api/read - 234 requests

EOF
}

# Build HTML email
build_html_email() {
    local plain_content="$1"
    
    # Convert markdown-style content to HTML
    cat << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        code {
            background-color: #f8f8f8;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: #f8f8f8;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 0.9em;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📬 $DIGEST_TITLE</h1>
        <p><em>Generated on $(date '+%A, %B %d, %Y at %I:%M %p')</em></p>
        
        $(echo "$plain_content" | sed 's/^## /\n<h2>/g' | sed 's/$/\n<\/h2>/g' | sed 's/\*\*\(.*\)\*\*/<strong>\1<\/strong>/g')
        
        <div class="footer">
            <p>This is an automated digest from your MailGoat agent.</p>
            <p>To unsubscribe or modify preferences, reply with "STOP DIGEST"</p>
        </div>
    </div>
</body>
</html>
EOF
}

# Build digest content
build_digest() {
    echo "Building digest content..."
    
    local content=""
    
    content+="$(get_weather)"
    content+="$(get_system_metrics)"
    content+="$(get_git_activity)"
    content+="$(get_email_stats)"
    content+="$(get_custom_metrics)"
    
    echo "$content"
}

# Send digest email
send_digest() {
    echo -e "${BLUE}Preparing to send digest...${NC}"
    
    # Build content
    local plain_content=$(build_digest)
    
    # Generate HTML version
    local html_content=$(build_html_email "$plain_content")
    
    # Save to temp files
    local plain_file=$(mktemp)
    local html_file=$(mktemp)
    
    echo "$plain_content" > "$plain_file"
    echo "$html_content" > "$html_file"
    
    # Send email with both plain and HTML versions
    echo -e "${BLUE}Sending digest to $DIGEST_EMAIL...${NC}"
    
    if mailgoat send \
        --to "$DIGEST_EMAIL" \
        --subject "$DIGEST_TITLE - $(date '+%B %d, %Y')" \
        --body "$plain_content" \
        --html "$html_file"; then
        echo -e "${GREEN}✓ Digest sent successfully!${NC}"
        
        # Log success
        echo "[$(date)] Digest sent to $DIGEST_EMAIL" >> ~/.mailgoat-digest.log
        
        rm -f "$plain_file" "$html_file"
        return 0
    else
        echo -e "${RED}✗ Failed to send digest${NC}"
        rm -f "$plain_file" "$html_file"
        return 1
    fi
}

# Main
main() {
    echo "================================================"
    echo "Daily Digest Agent"
    echo "================================================"
    echo "Title: $DIGEST_TITLE"
    echo "Recipient: $DIGEST_EMAIL"
    echo "Sections: Weather=$INCLUDE_WEATHER System=$INCLUDE_SYSTEM Git=$INCLUDE_GIT"
    echo "================================================"
    echo ""
    
    # Send digest
    send_digest
    
    echo ""
    echo -e "${GREEN}Done!${NC}"
}

# Run
main
