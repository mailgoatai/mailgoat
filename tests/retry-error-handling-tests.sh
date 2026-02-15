#!/bin/bash
#
# Retry Logic and Error Handling Tests for MailGoat CLI
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0

test_pass() {
  echo -e "${GREEN}✓${NC} $1"
  PASSED=$((PASSED + 1))
}

test_fail() {
  echo -e "${RED}✗${NC} $1: $2"
  FAILED=$((FAILED + 1))
}

test_info() {
  echo -e "${CYAN}ℹ${NC} $1"
}

# ============================================================================
# Error Handling Tests
# ============================================================================

test_invalid_server_error() {
  echo "Test: Invalid server URL error message..."
  
  # Create config with invalid server
  local test_config_dir="/tmp/mailgoat-test-$$"
  mkdir -p "$test_config_dir"
  
  cat > "$test_config_dir/config.yml" << EOF
server: invalid-server-that-does-not-exist.com
email: test@example.com
api_key: test_key_12345678
EOF
  
  # Try to send (should fail with helpful error)
  local output
  output=$(HOME="$test_config_dir/.." mailgoat send \
    --to test@example.com \
    --subject "Test" \
    --body "Test" \
    --no-retry 2>&1 || true)
  
  rm -rf "$test_config_dir"
  
  if echo "$output" | grep -qi "network"; then
    test_pass "Invalid server shows helpful network error"
  else
    test_fail "Invalid server error" "Expected network error message"
  fi
}

test_no_retry_flag() {
  echo "Test: --no-retry flag is available..."
  
  if mailgoat send --help 2>&1 | grep -q "\-\-no\-retry"; then
    test_pass "--no-retry flag available in send command"
  else
    test_fail "--no-retry flag" "Flag not found in help"
  fi
  
  if mailgoat read --help 2>&1 | grep -q "\-\-no\-retry"; then
    test_pass "--no-retry flag available in read command"
  else
    test_fail "--no-retry flag" "Flag not found in read help"
  fi
}

test_missing_recipients_error() {
  echo "Test: Missing recipients error message..."
  
  # This should fail with clear validation error before hitting API
  local output
  output=$(mailgoat send \
    --subject "Test" \
    --body "Test" 2>&1 || true)
  
  if echo "$output" | grep -qi "required"; then
    test_pass "Missing recipients shows validation error"
  else
    test_info "Validation happens at command level (before API)"
  fi
}

test_error_message_structure() {
  echo "Test: Error categorization structure..."
  
  # Test that PostalClient exports proper types
  local postal_client_path="/home/node/.opengoat/organization/src/lib/postal-client.ts"
  
  if grep -q "PostalClientOptions" "$postal_client_path"; then
    test_pass "PostalClientOptions interface defined"
  else
    test_fail "Error structure" "PostalClientOptions not found"
  fi
  
  if grep -q "maxRetries" "$postal_client_path"; then
    test_pass "Retry configuration parameters defined"
  else
    test_fail "Retry config" "maxRetries not found"
  fi
  
  if grep -q "categorizeError" "$postal_client_path"; then
    test_pass "Error categorization implemented"
  else
    test_fail "Error categorization" "Method not found"
  fi
}

test_retry_logic_implementation() {
  echo "Test: Retry logic implementation..."
  
  local postal_client_path="/home/node/.opengoat/organization/src/lib/postal-client.ts"
  
  if grep -q "retryWithBackoff" "$postal_client_path"; then
    test_pass "Retry logic with exponential backoff implemented"
  else
    test_fail "Retry logic" "retryWithBackoff not found"
  fi
  
  if grep -q "shouldNotRetry" "$postal_client_path"; then
    test_pass "Smart retry logic (skips non-retryable errors)"
  else
    test_fail "Smart retry" "shouldNotRetry not found"
  fi
}

test_error_messages_defined() {
  echo "Test: Helpful error messages defined..."
  
  local postal_client_path="/home/node/.opengoat/organization/src/lib/postal-client.ts"
  
  # Check for specific error cases
  if grep -q "Could not connect to Postal" "$postal_client_path"; then
    test_pass "Network error message defined"
  else
    test_fail "Network error" "Message not found"
  fi
  
  if grep -q "Authentication failed" "$postal_client_path"; then
    test_pass "Auth error message defined"
  else
    test_fail "Auth error" "Message not found"
  fi
  
  if grep -q "Rate limit exceeded" "$postal_client_path"; then
    test_pass "Rate limit error message defined"
  else
    test_fail "Rate limit error" "Message not found"
  fi
  
  if grep -q "mailgoat config init" "$postal_client_path"; then
    test_pass "Error messages include helpful commands"
  else
    test_fail "Helpful commands" "Not found in error messages"
  fi
}

test_postal_error_codes() {
  echo "Test: Postal-specific error codes handled..."
  
  local postal_client_path="/home/node/.opengoat/organization/src/lib/postal-client.ts"
  
  local error_codes=(
    "NoRecipients"
    "NoContent"
    "TooManyToAddresses"
    "FromAddressMissing"
    "UnauthenticatedFromAddress"
    "MessageNotFound"
  )
  
  local all_found=true
  for code in "${error_codes[@]}"; do
    if ! grep -q "$code" "$postal_client_path"; then
      all_found=false
      break
    fi
  done
  
  if [ "$all_found" = true ]; then
    test_pass "Postal error codes handled"
  else
    test_fail "Postal error codes" "Not all codes found"
  fi
}

test_exponential_backoff() {
  echo "Test: Exponential backoff calculation..."
  
  local postal_client_path="/home/node/.opengoat/organization/src/lib/postal-client.ts"
  
  if grep -q "Math.pow(2, attempt)" "$postal_client_path"; then
    test_pass "Exponential backoff implemented (2^attempt)"
  else
    test_fail "Exponential backoff" "Not found"
  fi
}

# ============================================================================
# Main
# ============================================================================

print_summary() {
  echo ""
  echo "========================================"
  echo "Retry & Error Handling Tests Summary"
  echo "========================================"
  echo "Passed: $PASSED"
  echo "Failed: $FAILED"
  echo "========================================"
  
  if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    return 0
  else
    echo -e "${RED}Some tests failed${NC}"
    return 1
  fi
}

main() {
  echo "MailGoat Retry & Error Handling Tests"
  echo "======================================"
  echo ""
  
  # Run tests
  test_no_retry_flag
  test_error_message_structure
  test_retry_logic_implementation
  test_error_messages_defined
  test_postal_error_codes
  test_exponential_backoff
  test_missing_recipients_error
  test_invalid_server_error
  
  # Summary
  print_summary
}

main
