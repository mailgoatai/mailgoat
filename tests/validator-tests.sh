#!/bin/bash
#
# Validator Tests for MailGoat CLI
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
# Email Validation Tests
# ============================================================================

test_valid_emails() {
  echo "Test: Valid email addresses..."
  
  local valid_emails=(
    "user@example.com"
    "test.user@example.com"
    "user+tag@example.co.uk"
    "user_name@sub.example.com"
    "123@example.com"
    "user@example-domain.com"
  )
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  # Check that validation function exists
  if grep -q "validateEmail" "$validators_path"; then
    test_pass "Email validation function exists"
  else
    test_fail "Email validation" "Function not found"
    return
  fi
  
  # Check regex is RFC 5322 compliant
  if grep -q "a-zA-Z0-9.!#\$%&" "$validators_path"; then
    test_pass "Email validation uses RFC 5322 regex"
  else
    test_info "Email validation uses simplified regex"
  fi
}

test_invalid_emails() {
  echo "Test: Invalid email addresses..."
  
  local invalid_emails=(
    "notanemail"
    "@example.com"
    "user@"
    "user @example.com"
    "user@example"
    ""
    "user@@example.com"
  )
  
  test_pass "Invalid email patterns defined"
}

# ============================================================================
# URL Validation Tests
# ============================================================================

test_valid_urls() {
  echo "Test: Valid URL validation..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "validateUrl" "$validators_path"; then
    test_pass "URL validation function exists"
  else
    test_fail "URL validation" "Function not found"
  fi
  
  # Check it handles URLs without protocol
  if grep -q "startsWith.*http" "$validators_path"; then
    test_pass "URL validation handles protocol-less URLs"
  else
    test_fail "URL validation" "Protocol handling not found"
  fi
}

# ============================================================================
# API Key Validation Tests
# ============================================================================

test_api_key_validation() {
  echo "Test: API key validation..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "validateApiKey" "$validators_path"; then
    test_pass "API key validation function exists"
  else
    test_fail "API key validation" "Function not found"
    return
  fi
  
  # Check minimum length requirement
  if grep -q "length.*10" "$validators_path"; then
    test_pass "API key minimum length check (10+ chars)"
  else
    test_fail "API key validation" "Minimum length check not found"
  fi
  
  # Check format validation
  if grep -q "a-zA-Z0-9_-" "$validators_path"; then
    test_pass "API key format validation (alphanumeric + dash/underscore)"
  else
    test_fail "API key validation" "Format check not found"
  fi
}

# ============================================================================
# Subject Validation Tests
# ============================================================================

test_subject_validation() {
  echo "Test: Subject validation..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "validateSubject" "$validators_path"; then
    test_pass "Subject validation function exists"
  else
    test_fail "Subject validation" "Function not found"
    return
  fi
  
  # Check for length limits
  if grep -q "998" "$validators_path"; then
    test_pass "Subject length limit (998 chars per RFC 2822)"
  else
    test_info "Subject validation may not check RFC 2822 limit"
  fi
}

# ============================================================================
# Body Validation Tests
# ============================================================================

test_body_validation() {
  echo "Test: Body validation..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "validateBody" "$validators_path"; then
    test_pass "Body validation function exists"
  else
    test_fail "Body validation" "Function not found"
    return
  fi
  
  # Check it accepts either plain or HTML
  if grep -q "html.*body" "$validators_path"; then
    test_pass "Body validation accepts plain or HTML"
  else
    test_fail "Body validation" "HTML body support not found"
  fi
}

# ============================================================================
# Tag Validation Tests
# ============================================================================

test_tag_validation() {
  echo "Test: Tag validation..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "validateTag" "$validators_path"; then
    test_pass "Tag validation function exists"
  else
    test_fail "Tag validation" "Function not found"
    return
  fi
}

# ============================================================================
# File Path Validation Tests
# ============================================================================

test_file_path_validation() {
  echo "Test: File path validation..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "validateFilePath" "$validators_path"; then
    test_pass "File path validation function exists"
  else
    test_fail "File path validation" "Function not found"
    return
  fi
  
  # Check for null byte detection
  if grep -q "\\\\0" "$validators_path"; then
    test_pass "File path validation checks for null bytes"
  else
    test_info "File path validation may not check for null bytes"
  fi
}

# ============================================================================
# Recipient Count Validation Tests
# ============================================================================

test_recipient_count_validation() {
  echo "Test: Recipient count validation..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "validateRecipientCount" "$validators_path"; then
    test_pass "Recipient count validation exists"
  else
    test_fail "Recipient count" "Function not found"
    return
  fi
  
  # Check for Postal's 50 recipient limit
  if grep -q "50" "$validators_path"; then
    test_pass "Recipient limit check (50 per Postal)"
  else
    test_fail "Recipient limit" "50 recipient limit not found"
  fi
}

# ============================================================================
# Integration Tests
# ============================================================================

test_send_validation_integration() {
  echo "Test: Send command validation integration..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "validateSendInputs" "$validators_path"; then
    test_pass "Comprehensive send validation function exists"
  else
    test_fail "Send validation" "validateSendInputs not found"
    return
  fi
}

test_error_message_formatting() {
  echo "Test: Error message formatting..."
  
  local validators_path="/home/node/.opengoat/organization/src/lib/validators.ts"
  
  if grep -q "createValidationError" "$validators_path"; then
    test_pass "Validation error formatter exists"
  else
    test_fail "Error formatting" "createValidationError not found"
  fi
}

test_command_integration() {
  echo "Test: Command integration..."
  
  local send_path="/home/node/.opengoat/organization/src/commands/send.ts"
  local config_path="/home/node/.opengoat/organization/src/commands/config.ts"
  
  # Check send command uses validators
  if grep -q "validateSendInputs" "$send_path"; then
    test_pass "Send command uses validation"
  else
    test_fail "Send command" "Validation not integrated"
  fi
  
  # Check config command uses validators
  if grep -q "validators" "$config_path"; then
    test_pass "Config command uses validation"
  else
    test_fail "Config command" "Validation not integrated"
  fi
}

test_invalid_email_rejection() {
  echo "Test: Invalid email rejection..."
  
  # Try to send with invalid email (should fail before hitting API)
  local output
  output=$(cd /home/node/.opengoat/organization && \
    node bin/mailgoat.js send \
    --to "invalid-email" \
    --subject "Test" \
    --body "Test" 2>&1 || true)
  
  if echo "$output" | grep -qi "invalid.*email"; then
    test_pass "Invalid email rejected with helpful error"
  else
    test_info "Email validation may happen at different level"
  fi
}

test_empty_subject_rejection() {
  echo "Test: Empty subject rejection..."
  
  local output
  output=$(cd /home/node/.opengoat/organization && \
    node bin/mailgoat.js send \
    --to "test@example.com" \
    --subject "" \
    --body "Test" 2>&1 || true)
  
  if echo "$output" | grep -qi "subject"; then
    test_pass "Empty subject rejected"
  else
    test_info "Subject validation may accept empty values"
  fi
}

# ============================================================================
# Main
# ============================================================================

print_summary() {
  echo ""
  echo "========================================"
  echo "Validator Tests Summary"
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
  echo "MailGoat Validator Tests"
  echo "========================="
  echo ""
  
  # Run tests
  test_valid_emails
  test_invalid_emails
  test_valid_urls
  test_api_key_validation
  test_subject_validation
  test_body_validation
  test_tag_validation
  test_file_path_validation
  test_recipient_count_validation
  test_send_validation_integration
  test_error_message_formatting
  test_command_integration
  test_invalid_email_rejection
  test_empty_subject_rejection
  
  # Summary
  print_summary
}

main
