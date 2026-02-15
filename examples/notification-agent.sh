#!/bin/bash
#
# Email Notification Agent
# 
# Monitors system resources (disk space, memory, CPU) and sends alert emails
# when thresholds are exceeded.
#
# USE CASES:
# - Server monitoring
# - Resource alerts
# - Error notifications
# - Status updates
#
# PREREQUISITES:
# - MailGoat CLI installed and configured
# - mailgoat command in PATH
# - jq for JSON parsing (optional)
#
# USAGE:
#   ALERT_EMAIL=admin@example.com ./notification-agent.sh
#
# ENVIRONMENT VARIABLES:
#   ALERT_EMAIL     - Email address to send alerts to (required)
#   DISK_THRESHOLD  - Disk usage percentage threshold (default: 80)
#   MEM_THRESHOLD   - Memory usage percentage threshold (default: 85)
#   CPU_THRESHOLD   - CPU usage percentage threshold (default: 90)
#   CHECK_INTERVAL  - Seconds between checks (default: 300)
#

set -euo pipefail

# Configuration
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
DISK_THRESHOLD="${DISK_THRESHOLD:-80}"
MEM_THRESHOLD="${MEM_THRESHOLD:-85}"
CPU_THRESHOLD="${CPU_THRESHOLD:-90}"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if mailgoat is installed
if ! command -v mailgoat &> /dev/null; then
    echo -e "${RED}Error: mailgoat CLI not found. Please install it first.${NC}"
    exit 1
fi

# Function to send alert email
send_alert() {
    local subject="$1"
    local body="$2"
    local priority="${3:-normal}"
    
    echo -e "${YELLOW}Sending alert: ${subject}${NC}"
    
    # Send email using MailGoat CLI
    if mailgoat send \
        --to "$ALERT_EMAIL" \
        --subject "[ALERT] $subject" \
        --body "$body" \
        --priority "$priority"; then
        echo -e "${GREEN}✓ Alert sent successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to send alert${NC}"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    echo "Checking disk space..."
    
    # Get disk usage percentage (excluding the % sign)
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    echo "  Disk usage: ${DISK_USAGE}%"
    
    if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
        echo -e "${RED}  ⚠ Disk usage exceeded threshold!${NC}"
        
        # Build detailed message
        DISK_INFO=$(df -h | grep -v tmpfs | grep -v devtmpfs)
        
        BODY="Disk usage has exceeded the ${DISK_THRESHOLD}% threshold.

Current disk usage: ${DISK_USAGE}%

Detailed disk information:
${DISK_INFO}

Server: $(hostname)
Time: $(date)

Please investigate and free up disk space."
        
        send_alert "Disk Space Critical (${DISK_USAGE}%)" "$BODY" "high"
        return 1
    else
        echo -e "${GREEN}  ✓ Disk usage OK${NC}"
        return 0
    fi
}

# Check memory usage
check_memory() {
    echo "Checking memory usage..."
    
    # Get memory usage percentage
    if command -v free &> /dev/null; then
        MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", ($3/$2) * 100)}')
        
        echo "  Memory usage: ${MEM_USAGE}%"
        
        if [ "$MEM_USAGE" -gt "$MEM_THRESHOLD" ]; then
            echo -e "${RED}  ⚠ Memory usage exceeded threshold!${NC}"
            
            MEM_INFO=$(free -h)
            
            BODY="Memory usage has exceeded the ${MEM_THRESHOLD}% threshold.

Current memory usage: ${MEM_USAGE}%

Detailed memory information:
${MEM_INFO}

Server: $(hostname)
Time: $(date)

Top memory consumers:
$(ps aux --sort=-%mem | head -10)

Please investigate high memory usage."
            
            send_alert "Memory Usage High (${MEM_USAGE}%)" "$BODY" "high"
            return 1
        else
            echo -e "${GREEN}  ✓ Memory usage OK${NC}"
            return 0
        fi
    else
        echo -e "${YELLOW}  ⚠ 'free' command not available, skipping memory check${NC}"
        return 0
    fi
}

# Check CPU load
check_cpu_load() {
    echo "Checking CPU load..."
    
    # Get 1-minute load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
    CPU_COUNT=$(nproc)
    
    # Convert to percentage (load / cores * 100)
    CPU_USAGE=$(echo "scale=0; ($LOAD_AVG / $CPU_COUNT) * 100" | bc)
    
    echo "  CPU load: ${LOAD_AVG} (${CPU_USAGE}% on ${CPU_COUNT} cores)"
    
    if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
        echo -e "${RED}  ⚠ CPU load exceeded threshold!${NC}"
        
        UPTIME_INFO=$(uptime)
        
        BODY="CPU load has exceeded the ${CPU_THRESHOLD}% threshold.

Current load: ${LOAD_AVG} (${CPU_USAGE}% on ${CPU_COUNT} cores)

Uptime information:
${UPTIME_INFO}

Server: $(hostname)
Time: $(date)

Top CPU consumers:
$(ps aux --sort=-%cpu | head -10)

Please investigate high CPU usage."
        
        send_alert "CPU Load High (${CPU_USAGE}%)" "$BODY" "high"
        return 1
    else
        echo -e "${GREEN}  ✓ CPU load OK${NC}"
        return 0
    fi
}

# Main monitoring loop
main() {
    echo "================================================"
    echo "Email Notification Agent"
    echo "================================================"
    echo "Alert email: $ALERT_EMAIL"
    echo "Thresholds: Disk=${DISK_THRESHOLD}% Memory=${MEM_THRESHOLD}% CPU=${CPU_THRESHOLD}%"
    echo "Check interval: ${CHECK_INTERVAL}s"
    echo "================================================"
    echo ""
    
    while true; do
        echo "[$(date)] Running system checks..."
        
        # Run all checks
        check_disk_space
        check_memory
        check_cpu_load
        
        echo ""
        echo "Next check in ${CHECK_INTERVAL} seconds..."
        echo ""
        
        sleep "$CHECK_INTERVAL"
    done
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Monitoring stopped${NC}"; exit 0' INT TERM

# Run main loop
main
