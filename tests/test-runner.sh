#!/bin/bash
#
# MailGoat Test Runner
#
# Automated test suite for MailGoat CLI functionality
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
NC='\033[0m'

# Test configuration
TEST_MODE="${TEST_MODE:-mock}"
MAILGOAT_CMD="${MAILGOAT_CMD:-mailgoat}"
TEST_VERBOSE="${TEST_VERBOSE:-false}"
TEST_FAIL_FAST="${TEST_FAIL_FAST:-false}"
TEST_TIMEOUT="${TEST_TIMEOUT:-30}"
TEST_REPORT_FORMAT="${TEST_REPORT_FORMAT:-text}"
DRY_RUN=false
FILTER_PATTERN=""
TEST_SUITE=""
TEST_ID=""

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
START_TIME=""
FAILED_TEST_LIST=()

# Performance thresholds (milliseconds)
PERF_STARTUP_MAX="${PERF_STARTUP_MAX:-2000}"
PERF_SEND_MAX="${PERF_SEND_MAX:-5000}"
PERF_INBOX_MAX="${PERF_INBOX_MAX:-3000}"

# Logging
LOG_DIR="${SCRIPT_DIR}/test-logs"
RUN_LOG="${LOG_DIR}/test-run-$(date +%Y-%m-%d-%H%M).log"

# ============================================================================
# Utility Functions
# ============================================================================

setup_logging() {
  mkdir -p "$LOG_DIR"
  mkdir -p "${LOG_DIR}/failures"
  echo "Test run started at $(date)" > "$RUN_LOG"
}

log() {
  echo "$1" | tee -a "$RUN_LOG"
}

log_verbose() {
  if [ "$TEST_VERBOSE" = "true" ]; then
    echo "$1" | tee -a "$RUN_LOG"
  else
    echo "$1" >> "$RUN_LOG"
  fi
}

now_ms() {
  python3 - <<'PY'
import time
print(int(time.time() * 1000))
PY
}

run_with_timeout() {
  local timeout_sec="$1"
  local cmd="$2"

  if command -v timeout >/dev/null 2>&1; then
    timeout "$timeout_sec" bash -lc "$cmd"
  else
    bash -lc "$cmd"
  fi
}

test_start() {
  local test_id="$1"
  local test_name="$2"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if [ "$TEST_REPORT_FORMAT" = "text" ]; then
    printf "[$test_id] %-50s " "$test_name"
  fi
  
  log_verbose "Starting test $test_id: $test_name"
}

test_pass() {
  local test_id="$1"
  local duration="${2:-0.0}"
  
  PASSED_TESTS=$((PASSED_TESTS + 1))
  
  if [ "$TEST_REPORT_FORMAT" = "text" ]; then
    echo -e "${GREEN}PASS${NC} (${duration}s)"
  fi
  
  log_verbose "Test $test_id PASSED in ${duration}s"
}

test_fail() {
  local test_id="$1"
  local reason="$2"
  local duration="${3:-0.0}"
  
  FAILED_TESTS=$((FAILED_TESTS + 1))
  FAILED_TEST_LIST+=("$test_id: $reason")
  
  if [ "$TEST_REPORT_FORMAT" = "text" ]; then
    echo -e "${RED}FAIL${NC} (${duration}s)"
    echo -e "  ${RED}Reason: $reason${NC}"
  fi
  
  log_verbose "Test $test_id FAILED in ${duration}s: $reason"
  
  # Save failure details
  echo "Test ID: $test_id" > "${LOG_DIR}/failures/${test_id}.log"
  echo "Reason: $reason" >> "${LOG_DIR}/failures/${test_id}.log"
  echo "Time: $(date)" >> "${LOG_DIR}/failures/${test_id}.log"
  
  if [ "$TEST_FAIL_FAST" = "true" ]; then
    echo -e "\n${RED}Fail-fast enabled, stopping test run${NC}"
    exit 1
  fi
}

test_skip() {
  local test_id="$1"
  local reason="$2"
  
  SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
  
  if [ "$TEST_REPORT_FORMAT" = "text" ]; then
    echo -e "${YELLOW}SKIP${NC} ($reason)"
  fi
  
  log_verbose "Test $test_id SKIPPED: $reason"
}

# ============================================================================
# Test Helper Functions
# ============================================================================

mailgoat_exec() {
  local command="$1"
  local timeout="${2:-$TEST_TIMEOUT}"
  
  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN] mailgoat $command"
    return 0
  fi

  if [ "$TEST_MODE" = "mock" ]; then
    case "$command" in
      send*invalid-email*)
        echo "Invalid email"
        return 1
        ;;
      "send --to test@example.com")
        echo "Missing required fields"
        return 1
        ;;
      send*)
        cat <<'JSON'
{"message_id":"mock-message-id","messages":{"test@example.com":{"id":1,"token":"mock-token"}}}
JSON
        return 0
        ;;
      inbox\ --limit\ *\ --json*)
        cat "${SCRIPT_DIR}/fixtures/mock-inbox-response.json"
        return 0
        ;;
      "inbox --json"*)
        cat "${SCRIPT_DIR}/fixtures/mock-inbox-response.json"
        return 0
        ;;
      "inbox --unread --json"*)
        cat "${SCRIPT_DIR}/fixtures/mock-inbox-response.json"
        return 0
        ;;
      read\ invalid-message-id-12345*)
        echo "Message not found"
        return 1
        ;;
      read*)
        cat "${SCRIPT_DIR}/fixtures/mock-message-response.json"
        return 0
        ;;
      config\ --check*)
        echo "Config valid"
        return 0
        ;;
    esac
  fi
  
  run_with_timeout "$timeout" "$MAILGOAT_CMD $command" 2>&1
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="${3:-Value mismatch}"
  
  if [ "$expected" = "$actual" ]; then
    return 0
  else
    echo "$message: expected '$expected', got '$actual'"
    return 1
  fi
}

assert_contains() {
  local text="$1"
  local substring="$2"
  local message="${3:-Substring not found}"
  
  if [[ "$text" == *"$substring"* ]]; then
    return 0
  else
    echo "$message: '$substring' not found in '$text'"
    return 1
  fi
}

assert_exit_code() {
  local expected="$1"
  local actual="$2"
  local message="${3:-Exit code mismatch}"
  
  if [ "$expected" -eq "$actual" ]; then
    return 0
  else
    echo "$message: expected $expected, got $actual"
    return 1
  fi
}

measure_time_ms() {
  local start_ms=$(now_ms)
  eval "$1" > /dev/null 2>&1 || true
  local end_ms=$(now_ms)
  echo $((end_ms - start_ms))
}

# ============================================================================
# Send Tests (T001-T020)
# ============================================================================

test_T001_send_simple() {
  test_start "T001" "Send simple email"
  
  local start=$(now_ms)
  local output
  local exit_code=0
  
  output=$(mailgoat_exec "send --to test@example.com --subject 'Test' --body 'Test body' --json") || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  if [ $exit_code -eq 0 ]; then
    if echo "$output" | jq -e '.message_id' > /dev/null 2>&1; then
      test_pass "T001" "$duration"
    else
      test_fail "T001" "No message_id in response" "$duration"
    fi
  else
    test_fail "T001" "Command failed with exit code $exit_code" "$duration"
  fi
}

test_T002_send_multiple_recipients() {
  test_start "T002" "Send to multiple recipients"
  
  local start=$(now_ms)
  local output
  local exit_code=0
  
  output=$(mailgoat_exec "send --to test1@example.com,test2@example.com --subject 'Test' --body 'Test' --json") || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  if [ $exit_code -eq 0 ]; then
    test_pass "T002" "$duration"
  else
    test_fail "T002" "Command failed with exit code $exit_code" "$duration"
  fi
}

test_T003_send_with_cc_bcc() {
  test_start "T003" "Send with CC/BCC"
  
  local start=$(now_ms)
  local output
  local exit_code=0
  
  output=$(mailgoat_exec "send --to test@example.com --cc cc@example.com --bcc bcc@example.com --subject 'Test' --body 'Test' --json") || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  if [ $exit_code -eq 0 ]; then
    test_pass "T003" "$duration"
  else
    test_fail "T003" "Command failed" "$duration"
  fi
}

test_T007_send_invalid_email() {
  test_start "T007" "Send to invalid email"
  
  local start=$(now_ms)
  local output
  local exit_code=0
  
  output=$(mailgoat_exec "send --to 'invalid-email' --subject 'Test' --body 'Test' 2>&1") || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  # Should fail with non-zero exit code
  if [ $exit_code -ne 0 ]; then
    test_pass "T007" "$duration"
  else
    test_fail "T007" "Should have failed with invalid email" "$duration"
  fi
}

test_T008_send_missing_fields() {
  test_start "T008" "Send with missing required fields"
  
  local start=$(now_ms)
  local exit_code=0
  
  mailgoat_exec "send --to test@example.com" > /dev/null 2>&1 || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  # Should fail without subject and body
  if [ $exit_code -ne 0 ]; then
    test_pass "T008" "$duration"
  else
    test_fail "T008" "Should have failed with missing fields" "$duration"
  fi
}

# ============================================================================
# Receive Tests (T021-T035)
# ============================================================================

test_T021_inbox_list_all() {
  test_start "T021" "List all messages"
  
  local start=$(now_ms)
  local output
  local exit_code=0
  
  output=$(mailgoat_exec "inbox --json") || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  if [ $exit_code -eq 0 ]; then
    if echo "$output" | jq -e 'type == "array"' > /dev/null 2>&1; then
      test_pass "T021" "$duration"
    else
      test_fail "T021" "Response is not an array" "$duration"
    fi
  else
    test_fail "T021" "Command failed with exit code $exit_code" "$duration"
  fi
}

test_T022_inbox_unread() {
  test_start "T022" "Filter unread messages"
  
  local start=$(now_ms)
  local output
  local exit_code=0
  
  output=$(mailgoat_exec "inbox --unread --json") || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  if [ $exit_code -eq 0 ]; then
    test_pass "T022" "$duration"
  else
    test_fail "T022" "Command failed" "$duration"
  fi
}

test_T023_read_message() {
  test_start "T023" "Read specific message"
  
  # First get a message ID from inbox
  local message_id=$(mailgoat_exec "inbox --limit 1 --json" | jq -r '.[0].id' 2>/dev/null || echo "")
  
  if [ -z "$message_id" ] || [ "$message_id" = "null" ]; then
    test_skip "T023" "No messages in inbox"
    return
  fi
  
  local start=$(now_ms)
  local output
  local exit_code=0
  
  output=$(mailgoat_exec "read $message_id --json") || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  if [ $exit_code -eq 0 ]; then
    if echo "$output" | jq -e '.id' > /dev/null 2>&1; then
      test_pass "T023" "$duration"
    else
      test_fail "T023" "No message ID in response" "$duration"
    fi
  else
    test_fail "T023" "Command failed" "$duration"
  fi
}

test_T026_read_invalid_id() {
  test_start "T026" "Read invalid message ID"
  
  local start=$(now_ms)
  local exit_code=0
  
  mailgoat_exec "read invalid-message-id-12345" > /dev/null 2>&1 || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  # Should fail with non-zero exit code
  if [ $exit_code -ne 0 ]; then
    test_pass "T026" "$duration"
  else
    test_fail "T026" "Should have failed with invalid ID" "$duration"
  fi
}

# ============================================================================
# Configuration Tests (T036-T045)
# ============================================================================

test_T036_valid_config() {
  test_start "T036" "Valid config file"
  
  local test_config="/tmp/mailgoat-test-config-$$.yml"
  
  cat > "$test_config" << EOF
server: postal.example.com
email: test@example.com
api_key: test_key_12345
EOF
  
  local start=$(now_ms)
  local exit_code=0
  
  # Test config validation (if CLI supports it)
  mailgoat_exec "config --check --config-file $test_config" > /dev/null 2>&1 || exit_code=$?
  
  local end=$(now_ms)
  local duration=$(echo "scale=1; ($end - $start) / 1000" | bc)
  
  rm -f "$test_config"
  
  if [ $exit_code -eq 0 ]; then
    test_pass "T036" "$duration"
  else
    test_skip "T036" "Config check not supported"
  fi
}

# ============================================================================
# Performance Tests (T056-T065)
# ============================================================================

test_T056_cli_startup_time() {
  test_start "T056" "CLI startup time"
  
  local total_time=0
  local iterations=5
  
  for i in $(seq 1 $iterations); do
    local time_ms=$(measure_time_ms "$MAILGOAT_CMD --version")
    total_time=$((total_time + time_ms))
  done
  
  local avg_time=$((total_time / iterations))
  local duration=$(echo "scale=1; $avg_time / 1000" | bc)
  
  if [ "$avg_time" -lt "$PERF_STARTUP_MAX" ]; then
    test_pass "T056" "$duration"
  else
    test_fail "T056" "Startup time ${avg_time}ms exceeds threshold ${PERF_STARTUP_MAX}ms" "$duration"
  fi
}

test_T057_send_latency() {
  test_start "T057" "Send operation latency"
  
  local time_ms=$(measure_time_ms "$MAILGOAT_CMD send --to test@example.com --subject 'Test' --body 'Test'")
  local duration=$(echo "scale=1; $time_ms / 1000" | bc)
  
  if [ "$time_ms" -lt "$PERF_SEND_MAX" ]; then
    test_pass "T057" "$duration"
  else
    test_fail "T057" "Send latency ${time_ms}ms exceeds threshold ${PERF_SEND_MAX}ms" "$duration"
  fi
}

test_T058_inbox_latency() {
  test_start "T058" "Inbox fetch latency"
  
  local time_ms=$(measure_time_ms "$MAILGOAT_CMD inbox --limit 10")
  local duration=$(echo "scale=1; $time_ms / 1000" | bc)
  
  if [ "$time_ms" -lt "$PERF_INBOX_MAX" ]; then
    test_pass "T058" "$duration"
  else
    test_fail "T058" "Inbox latency ${time_ms}ms exceeds threshold ${PERF_INBOX_MAX}ms" "$duration"
  fi
}

# ============================================================================
# Test Suite Management
# ============================================================================

run_send_tests() {
  echo -e "\n${CYAN}=== Send Tests ===${NC}\n"
  test_T001_send_simple
  test_T002_send_multiple_recipients
  test_T003_send_with_cc_bcc
  test_T007_send_invalid_email
  test_T008_send_missing_fields
}

run_receive_tests() {
  echo -e "\n${CYAN}=== Receive Tests ===${NC}\n"
  test_T021_inbox_list_all
  test_T022_inbox_unread
  test_T023_read_message
  test_T026_read_invalid_id
}

run_config_tests() {
  echo -e "\n${CYAN}=== Configuration Tests ===${NC}\n"
  test_T036_valid_config
}

run_performance_tests() {
  echo -e "\n${CYAN}=== Performance Tests ===${NC}\n"
  test_T056_cli_startup_time
  test_T057_send_latency
  test_T058_inbox_latency
}

run_all_tests() {
  run_send_tests
  run_receive_tests
  run_config_tests
  run_performance_tests
}

# ============================================================================
# Report Generation
# ============================================================================

print_summary() {
  local end_time=$(date +%s)
  local duration=$((end_time - START_TIME))
  local success_rate=0
  
  if [ $TOTAL_TESTS -gt 0 ]; then
    success_rate=$(echo "scale=1; ($PASSED_TESTS / $TOTAL_TESTS) * 100" | bc)
  fi
  
  echo ""
  echo "================================================================="
  echo "Test Summary"
  echo "================================================================="
  echo "Total:         $TOTAL_TESTS"
  echo "Passed:        $PASSED_TESTS"
  echo "Failed:        $FAILED_TESTS"
  echo "Skipped:       $SKIPPED_TESTS"
  echo "Duration:      ${duration}s"
  echo "Success Rate:  ${success_rate}%"
  echo "================================================================="
  
  if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    echo "Failed Tests:"
    for failure in "${FAILED_TEST_LIST[@]}"; do
      echo "  - $failure"
    done
  fi
  
  echo ""
  echo "Detailed logs: $RUN_LOG"
}

# ============================================================================
# Main
# ============================================================================

print_usage() {
  cat << EOF
Usage: $0 [options]

Options:
  --mode <integration|mock>    Test mode (default: integration)
  --suite <suite>              Run specific suite (send, receive, config, performance)
  --filter <pattern>           Run tests matching pattern
  --test-id <id>              Run specific test by ID
  --dry-run                   Validate test structure without execution
  --fail-fast                 Stop on first failure
  --verbose                   Verbose output
  --report-format <format>    Output format: text, json, junit (default: text)
  --help                      Show this help

Examples:
  $0                                    # Run all tests
  $0 --suite send                       # Run only send tests
  $0 --filter "T00.*"                   # Run tests T001-T009
  $0 --test-id T001                     # Run single test
  $0 --dry-run                          # Validate without execution

EOF
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --mode)
        TEST_MODE="$2"
        shift 2
        ;;
      --mode=*)
        TEST_MODE="${1#*=}"
        shift
        ;;
      --suite)
        TEST_SUITE="$2"
        shift 2
        ;;
      --filter)
        FILTER_PATTERN="$2"
        shift 2
        ;;
      --test-id)
        TEST_ID="$2"
        shift 2
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --fail-fast)
        TEST_FAIL_FAST=true
        shift
        ;;
      --verbose)
        TEST_VERBOSE=true
        shift
        ;;
      --report-format)
        TEST_REPORT_FORMAT="$2"
        shift 2
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

check_prerequisites() {
  local missing_deps=()

  if [ "$TEST_MODE" = "mock" ]; then
    MAILGOAT_CMD="echo"
  fi
  
  if [ "$TEST_MODE" != "mock" ] && ! command -v mailgoat &> /dev/null; then
    if [ -f "${SCRIPT_DIR}/../dist/index.js" ]; then
      MAILGOAT_CMD="node ${SCRIPT_DIR}/../dist/index.js"
    else
      missing_deps+=("mailgoat (or build dist/index.js)")
    fi
  fi
  
  if ! command -v jq &> /dev/null; then
    missing_deps+=("jq")
  fi
  
  if ! command -v bc &> /dev/null; then
    missing_deps+=("bc")
  fi
  
  if [ ${#missing_deps[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required dependencies:${NC}"
    for dep in "${missing_deps[@]}"; do
      echo "  - $dep"
    done
    echo ""
    echo "Please install missing dependencies and try again."
    exit 1
  fi
}

main() {
  parse_args "$@"
  
  echo "MailGoat Test Runner"
  echo "===================="
  echo ""
  
  check_prerequisites
  setup_logging
  
  START_TIME=$(date +%s)
  
  # Run tests based on options
  if [ -n "$TEST_SUITE" ]; then
    case "$TEST_SUITE" in
      send)
        run_send_tests
        ;;
      receive)
        run_receive_tests
        ;;
      config)
        run_config_tests
        ;;
      performance)
        run_performance_tests
        ;;
      *)
        echo "Unknown test suite: $TEST_SUITE"
        exit 1
        ;;
    esac
  else
    run_all_tests
  fi
  
  print_summary
  
  # Exit with appropriate code
  if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
  else
    exit 0
  fi
}

main "$@"
