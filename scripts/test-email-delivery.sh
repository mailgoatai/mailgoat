#!/bin/bash
#
# MailGoat Email Delivery Test Suite
# 
# Validates email delivery for all agents across internal, external, and security checks.
#
# Usage:
#   ./test-email-delivery.sh [options]
#
# Options:
#   --json              Output results as JSON
#   --timeout <sec>     Timeout per test (default: 30)
#   --report <file>     Save report to file
#   --verbose           Verbose output
#   --use-cli           Use MailGoat CLI (default: Postal API if CLI not available)
#   --help              Show this help
#

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_FORMAT="${OUTPUT_FORMAT:-text}"
TEST_TIMEOUT="${TEST_TIMEOUT:-30}"
REPORT_FILE="${REPORT_FILE:-}"
VERBOSE="${VERBOSE:-false}"
USE_CLI="${USE_CLI:-auto}"

# Postal API configuration (fallback if CLI not available)
POSTAL_SERVER_URL="${POSTAL_SERVER_URL:-https://postal.example.com}"
POSTAL_API_KEY="${POSTAL_API_KEY:-}"

# Test agents
declare -a TEST_AGENTS=(
  "dev1@mailgoat.ai"
  "dev2@mailgoat.ai"
  "dev3@mailgoat.ai"
)

TEAM_EMAIL="team@mailgoat.ai"
EXTERNAL_GMAIL="test-mailgoat@gmail.com"
EXTERNAL_OUTLOOK="test-mailgoat@outlook.com"

# Test results
declare -A TEST_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# ============================================================================
# Utility Functions
# ============================================================================

log() {
  local level="$1"
  shift
  local message="$*"
  
  if [ "$OUTPUT_FORMAT" = "text" ]; then
    case "$level" in
      INFO)
        echo -e "${BLUE}[INFO]${NC} $message"
        ;;
      SUCCESS)
        echo -e "${GREEN}[✓]${NC} $message"
        ;;
      FAIL)
        echo -e "${RED}[✗]${NC} $message"
        ;;
      WARN)
        echo -e "${YELLOW}[!]${NC} $message"
        ;;
      *)
        echo "$message"
        ;;
    esac
  fi
  
  if [ "$VERBOSE" = "true" ]; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $message" >&2
  fi
}

log_verbose() {
  if [ "$VERBOSE" = "true" ]; then
    log INFO "$@"
  fi
}

# Check if MailGoat CLI is available
check_mailgoat_cli() {
  if command -v mailgoat &> /dev/null; then
    log_verbose "MailGoat CLI found"
    return 0
  else
    log_verbose "MailGoat CLI not found, will use Postal API fallback"
    return 1
  fi
}

# Detect which method to use for sending/receiving
detect_method() {
  if [ "$USE_CLI" = "auto" ]; then
    if check_mailgoat_cli; then
      USE_CLI="true"
    else
      USE_CLI="false"
    fi
  fi
  
  if [ "$USE_CLI" = "true" ] && ! check_mailgoat_cli; then
    log FAIL "MailGoat CLI requested but not found"
    exit 1
  fi
  
  if [ "$USE_CLI" = "false" ] && [ -z "$POSTAL_API_KEY" ]; then
    log FAIL "Postal API key required when CLI not available"
    exit 1
  fi
}

# Send email via MailGoat CLI
send_email_cli() {
  local from="$1"
  local to="$2"
  local subject="$3"
  local body="$4"
  
  timeout "$TEST_TIMEOUT" mailgoat send \
    --from "$from" \
    --to "$to" \
    --subject "$subject" \
    --body "$body" \
    --json 2>/dev/null
}

# Send email via Postal API (fallback)
send_email_postal() {
  local from="$1"
  local to="$2"
  local subject="$3"
  local body="$4"
  
  local response
  response=$(curl -s -X POST \
    "${POSTAL_SERVER_URL}/api/v1/send/message" \
    -H "X-Server-API-Key: ${POSTAL_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"to\": [\"$to\"],
      \"from\": \"$from\",
      \"subject\": \"$subject\",
      \"plain_body\": \"$body\"
    }")
  
  echo "$response"
}

# Read inbox via MailGoat CLI
read_inbox_cli() {
  local email="$1"
  local since="${2:-}"
  
  local cmd="mailgoat inbox --json"
  if [ -n "$since" ]; then
    cmd="$cmd --since \"$since\""
  fi
  
  timeout "$TEST_TIMEOUT" eval "$cmd" 2>/dev/null
}

# Read inbox via Postal API (fallback)
read_inbox_postal() {
  local email="$1"
  
  # Note: Postal's API for reading messages varies by implementation
  # This is a placeholder that would need to be adapted to actual Postal API
  log_verbose "Reading inbox via Postal API (placeholder)"
  echo "[]"
}

# Send email (auto-detect method)
send_email() {
  local from="$1"
  local to="$2"
  local subject="$3"
  local body="$4"
  
  log_verbose "Sending: $from → $to"
  
  if [ "$USE_CLI" = "true" ]; then
    send_email_cli "$from" "$to" "$subject" "$body"
  else
    send_email_postal "$from" "$to" "$subject" "$body"
  fi
}

# Read inbox (auto-detect method)
read_inbox() {
  local email="$1"
  local since="${2:-}"
  
  if [ "$USE_CLI" = "true" ]; then
    read_inbox_cli "$email" "$since"
  else
    read_inbox_postal "$email"
  fi
}

# Wait for email delivery
wait_for_delivery() {
  local to_email="$1"
  local subject="$2"
  local max_wait="${3:-30}"
  
  log_verbose "Waiting for email to $to_email with subject: $subject"
  
  local elapsed=0
  while [ $elapsed -lt $max_wait ]; do
    local inbox
    inbox=$(read_inbox "$to_email" "30s" 2>/dev/null || echo "[]")
    
    # Check if message with subject exists
    if echo "$inbox" | jq -e ".[] | select(.subject == \"$subject\")" &> /dev/null; then
      log_verbose "Message found after ${elapsed}s"
      return 0
    fi
    
    sleep 2
    elapsed=$((elapsed + 2))
  done
  
  log_verbose "Timeout waiting for message after ${max_wait}s"
  return 1
}

# Parse email headers for DKIM/SPF
check_email_headers() {
  local message_id="$1"
  
  log_verbose "Checking headers for message: $message_id"
  
  # Get message details with headers
  local message_json
  if [ "$USE_CLI" = "true" ]; then
    message_json=$(timeout "$TEST_TIMEOUT" mailgoat read "$message_id" --json --expand headers 2>/dev/null || echo "{}")
  else
    message_json="{}"
  fi
  
  # Check for DKIM
  local has_dkim=false
  if echo "$message_json" | jq -e '.headers["DKIM-Signature"]' &> /dev/null; then
    has_dkim=true
  fi
  
  # Check for SPF
  local has_spf=false
  if echo "$message_json" | jq -e '.headers["Received-SPF"] | contains("pass")' &> /dev/null; then
    has_spf=true
  fi
  
  echo "{\"dkim\": $has_dkim, \"spf\": $has_spf}"
}

# Record test result
record_test() {
  local test_name="$1"
  local passed="$2"
  local details="${3:-}"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if [ "$passed" = "true" ]; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    TEST_RESULTS["$test_name"]="PASS"
    log SUCCESS "$test_name: $details"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TEST_RESULTS["$test_name"]="FAIL"
    log FAIL "$test_name: $details"
  fi
}

# ============================================================================
# Test Suites
# ============================================================================

test_internal_delivery() {
  echo ""
  log INFO "Testing Internal Delivery"
  log INFO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  for agent in "${TEST_AGENTS[@]}"; do
    local subject="[TEST] Internal delivery from $agent"
    local body="Test message from $agent to team inbox at $(date)"
    
    log_verbose "Sending test email from $agent to $TEAM_EMAIL"
    
    # Send email
    local send_result
    if send_result=$(send_email "$agent" "$TEAM_EMAIL" "$subject" "$body" 2>&1); then
      log_verbose "Email sent successfully"
      
      # Wait for delivery
      if wait_for_delivery "$TEAM_EMAIL" "$subject" "$TEST_TIMEOUT"; then
        record_test "$agent → $TEAM_EMAIL" "true" "delivered"
      else
        record_test "$agent → $TEAM_EMAIL" "false" "timeout waiting for delivery"
      fi
    else
      record_test "$agent → $TEAM_EMAIL" "false" "send failed: $send_result"
    fi
  done
}

test_agent_to_agent() {
  echo ""
  log INFO "Testing Direct Agent-to-Agent Delivery"
  log INFO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Define agent pairs
  local pairs=(
    "dev1@mailgoat.ai:dev2@mailgoat.ai"
    "dev2@mailgoat.ai:dev3@mailgoat.ai"
    "dev3@mailgoat.ai:dev1@mailgoat.ai"
  )
  
  for pair in "${pairs[@]}"; do
    IFS=':' read -r from_agent to_agent <<< "$pair"
    
    local subject="[TEST] Direct message from $from_agent"
    local body="Test message from $from_agent to $to_agent at $(date)"
    
    log_verbose "Testing: $from_agent → $to_agent"
    
    # Send email
    if send_result=$(send_email "$from_agent" "$to_agent" "$subject" "$body" 2>&1); then
      # Wait for delivery
      if wait_for_delivery "$to_agent" "$subject" "$TEST_TIMEOUT"; then
        record_test "$from_agent → $to_agent" "true" "delivered"
      else
        record_test "$from_agent → $to_agent" "false" "timeout"
      fi
    else
      record_test "$from_agent → $to_agent" "false" "send failed"
    fi
  done
}

test_external_delivery() {
  echo ""
  log INFO "Testing External Delivery"
  log INFO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Gmail test
  local gmail_subject="[TEST] MailGoat delivery test to Gmail"
  local gmail_body="This is a test email from MailGoat to Gmail at $(date)"
  
  log_verbose "Testing delivery to Gmail"
  
  if send_result=$(send_email "${TEST_AGENTS[0]}" "$EXTERNAL_GMAIL" "$gmail_subject" "$gmail_body" 2>&1); then
    log WARN "Gmail test: Email sent (manual verification required)"
    record_test "External (Gmail)" "true" "sent (manual verification required)"
  else
    record_test "External (Gmail)" "false" "send failed"
  fi
  
  # Outlook test
  local outlook_subject="[TEST] MailGoat delivery test to Outlook"
  local outlook_body="This is a test email from MailGoat to Outlook at $(date)"
  
  log_verbose "Testing delivery to Outlook"
  
  if send_result=$(send_email "${TEST_AGENTS[0]}" "$EXTERNAL_OUTLOOK" "$outlook_subject" "$outlook_body" 2>&1); then
    log WARN "Outlook test: Email sent (manual verification required)"
    record_test "External (Outlook)" "true" "sent (manual verification required)"
  else
    record_test "External (Outlook)" "false" "send failed"
  fi
  
  log WARN "Note: External delivery tests require manual verification in Gmail/Outlook"
}

test_dkim_spf() {
  echo ""
  log INFO "Testing DKIM/SPF Validation"
  log INFO "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # Get recent messages from team inbox
  log_verbose "Fetching recent messages for header analysis"
  
  local inbox
  inbox=$(read_inbox "$TEAM_EMAIL" "1h" 2>/dev/null || echo "[]")
  
  local message_count
  message_count=$(echo "$inbox" | jq 'length')
  
  if [ "$message_count" -eq 0 ]; then
    log WARN "No messages found for DKIM/SPF testing"
    record_test "DKIM Validation" "false" "no messages to test"
    record_test "SPF Validation" "false" "no messages to test"
    return
  fi
  
  log_verbose "Analyzing $message_count messages"
  
  local dkim_pass=0
  local spf_pass=0
  local checked=0
  
  # Check up to 3 recent messages
  for i in $(seq 0 $((message_count > 3 ? 2 : message_count - 1))); do
    local msg_id
    msg_id=$(echo "$inbox" | jq -r ".[$i].id")
    
    log_verbose "Checking message: $msg_id"
    
    local headers
    headers=$(check_email_headers "$msg_id")
    
    if [ -n "$headers" ]; then
      checked=$((checked + 1))
      
      if echo "$headers" | jq -e '.dkim == true' &> /dev/null; then
        dkim_pass=$((dkim_pass + 1))
      fi
      
      if echo "$headers" | jq -e '.spf == true' &> /dev/null; then
        spf_pass=$((spf_pass + 1))
      fi
    fi
  done
  
  if [ $checked -eq 0 ]; then
    record_test "DKIM Validation" "false" "unable to check headers"
    record_test "SPF Validation" "false" "unable to check headers"
  else
    if [ $dkim_pass -eq $checked ]; then
      record_test "DKIM Validation" "true" "valid on $dkim_pass/$checked messages"
    else
      record_test "DKIM Validation" "false" "valid on only $dkim_pass/$checked messages"
    fi
    
    if [ $spf_pass -eq $checked ]; then
      record_test "SPF Validation" "true" "pass on $spf_pass/$checked messages"
    else
      record_test "SPF Validation" "false" "pass on only $spf_pass/$checked messages"
    fi
  fi
}

# ============================================================================
# Reporting
# ============================================================================

generate_text_report() {
  local duration=$(($(date +%s) - START_TIME))
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Summary"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Total Tests:   $TOTAL_TESTS"
  echo "Passed:        $PASSED_TESTS"
  echo "Failed:        $FAILED_TESTS"
  echo "Duration:      ${duration}s"
  echo ""
  
  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
  else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Failed tests:"
    for test_name in "${!TEST_RESULTS[@]}"; do
      if [ "${TEST_RESULTS[$test_name]}" = "FAIL" ]; then
        echo "  - $test_name"
      fi
    done
  fi
  
  echo ""
}

generate_json_report() {
  local duration=$(($(date +%s) - START_TIME))
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  
  # Build test results array
  local results_json="["
  local first=true
  for test_name in "${!TEST_RESULTS[@]}"; do
    if [ "$first" = "false" ]; then
      results_json+=","
    fi
    first=false
    results_json+="{\"name\":\"$test_name\",\"result\":\"${TEST_RESULTS[$test_name]}\"}"
  done
  results_json+="]"
  
  cat << EOF
{
  "timestamp": "$timestamp",
  "duration_seconds": $duration,
  "summary": {
    "total": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS
  },
  "results": $results_json
}
EOF
}

save_report() {
  local report="$1"
  local file="$2"
  
  echo "$report" > "$file"
  log INFO "Report saved to: $file"
}

# ============================================================================
# Main
# ============================================================================

print_usage() {
  cat << EOF
MailGoat Email Delivery Test Suite

Usage: $0 [options]

Options:
  --json              Output results as JSON
  --timeout <sec>     Timeout per test (default: 30)
  --report <file>     Save report to file
  --verbose           Verbose output
  --use-cli           Force use of MailGoat CLI
  --use-postal        Force use of Postal API
  --help              Show this help

Environment Variables:
  POSTAL_SERVER_URL   Postal server URL (for API fallback)
  POSTAL_API_KEY      Postal API key (for API fallback)

Examples:
  # Run tests with default settings
  $0

  # Output JSON and save to file
  $0 --json --report results.json

  # Verbose mode with custom timeout
  $0 --verbose --timeout 60

EOF
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --json)
        OUTPUT_FORMAT="json"
        shift
        ;;
      --timeout)
        TEST_TIMEOUT="$2"
        shift 2
        ;;
      --report)
        REPORT_FILE="$2"
        shift 2
        ;;
      --verbose)
        VERBOSE="true"
        shift
        ;;
      --use-cli)
        USE_CLI="true"
        shift
        ;;
      --use-postal)
        USE_CLI="false"
        shift
        ;;
      --help)
        print_usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1"
        print_usage
        exit 1
        ;;
    esac
  done
}

main() {
  parse_args "$@"
  
  if [ "$OUTPUT_FORMAT" = "text" ]; then
    echo "MailGoat Email Delivery Tests"
    echo "=============================="
    echo ""
  fi
  
  # Detect method (CLI or API)
  detect_method
  
  if [ "$OUTPUT_FORMAT" = "text" ]; then
    if [ "$USE_CLI" = "true" ]; then
      log INFO "Using MailGoat CLI"
    else
      log INFO "Using Postal API (fallback)"
    fi
  fi
  
  # Check dependencies
  if ! command -v jq &> /dev/null; then
    log FAIL "jq is required but not installed"
    exit 1
  fi
  
  # Run test suites
  test_internal_delivery
  test_agent_to_agent
  test_external_delivery
  test_dkim_spf
  
  # Generate report
  local report
  if [ "$OUTPUT_FORMAT" = "json" ]; then
    report=$(generate_json_report)
  else
    report=$(generate_text_report)
  fi
  
  # Output report
  echo "$report"
  
  # Save to file if requested
  if [ -n "$REPORT_FILE" ]; then
    save_report "$report" "$REPORT_FILE"
  fi
  
  # Exit with appropriate code
  if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
  else
    exit 1
  fi
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed"
  echo "Install with: apt-get install jq (Ubuntu/Debian) or brew install jq (macOS)"
  exit 1
fi

main "$@"
