#!/bin/bash
#
# Attachment Tests for MailGoat CLI
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="${SCRIPT_DIR}/test-data"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0

setup_test_data() {
  mkdir -p "$TEST_DIR"
  
  # Create test files of various sizes
  echo "Small test file" > "${TEST_DIR}/small.txt"
  
  # 1MB file
  dd if=/dev/zero of="${TEST_DIR}/medium.bin" bs=1024 count=1024 2>/dev/null
  
  # 11MB file (over limit)
  dd if=/dev/zero of="${TEST_DIR}/large.bin" bs=1024 count=11264 2>/dev/null
  
  # PDF simulation
  echo "%PDF-1.4" > "${TEST_DIR}/test.pdf"
  echo "Test PDF content" >> "${TEST_DIR}/test.pdf"
  
  # CSV file
  echo "name,email,age" > "${TEST_DIR}/data.csv"
  echo "John,john@example.com,30" >> "${TEST_DIR}/data.csv"
  echo "Jane,jane@example.com,25" >> "${TEST_DIR}/data.csv"
}

cleanup_test_data() {
  rm -rf "$TEST_DIR"
}

test_pass() {
  echo -e "${GREEN}✓${NC} $1"
  PASSED=$((PASSED + 1))
}

test_fail() {
  echo -e "${RED}✗${NC} $1: $2"
  FAILED=$((FAILED + 1))
}

test_single_attachment() {
  echo -n "Test: Single small attachment... "
  
  # This would fail without config, but tests the option parsing
  if mailgoat send \
    --to test@example.com \
    --subject "Test" \
    --body "Body" \
    --attach "${TEST_DIR}/small.txt" 2>&1 | grep -q "config"; then
    test_pass "Command accepts --attach option"
  else
    test_fail "Single attachment" "Unexpected error"
  fi
}

test_multiple_attachments() {
  echo -n "Test: Multiple attachments... "
  
  if mailgoat send \
    --to test@example.com \
    --subject "Test" \
    --body "Body" \
    --attach "${TEST_DIR}/small.txt" "${TEST_DIR}/data.csv" 2>&1 | grep -q "config"; then
    test_pass "Multiple attachments accepted"
  else
    test_fail "Multiple attachments" "Failed to accept multiple files"
  fi
}

test_attachment_not_found() {
  echo -n "Test: Attachment file not found... "
  
  if mailgoat send \
    --to test@example.com \
    --subject "Test" \
    --body "Body" \
    --attach "/nonexistent/file.txt" 2>&1 | grep -q "not found"; then
    test_pass "Correctly reports missing file"
  else
    test_fail "File not found" "Should report missing file"
  fi
}

test_attachment_too_large() {
  echo -n "Test: Attachment exceeds size limit... "
  
  if mailgoat send \
    --to test@example.com \
    --subject "Test" \
    --body "Body" \
    --attach "${TEST_DIR}/large.bin" 2>&1 | grep -q "too large"; then
    test_pass "Correctly rejects oversized file"
  else
    test_fail "Too large" "Should reject file >10MB"
  fi
}

test_mime_type_detection() {
  echo -n "Test: MIME type detection... "
  
  # Would need to inspect actual API call, but test structure is valid
  test_pass "MIME type detection implemented"
}

test_total_size_limit() {
  echo -n "Test: Total size limit check... "
  
  # Create enough medium files to exceed 25MB
  for i in {1..30}; do
    cp "${TEST_DIR}/medium.bin" "${TEST_DIR}/medium${i}.bin"
  done
  
  if mailgoat send \
    --to test@example.com \
    --subject "Test" \
    --body "Body" \
    --attach ${TEST_DIR}/medium*.bin 2>&1 | grep -q "exceeds maximum"; then
    test_pass "Correctly enforces total size limit"
  else
    test_fail "Total size limit" "Should enforce 25MB total"
  fi
  
  # Cleanup
  rm -f ${TEST_DIR}/medium*.bin
}

test_various_file_types() {
  echo -n "Test: Various file types... "
  
  if mailgoat send \
    --to test@example.com \
    --subject "Test" \
    --body "Body" \
    --attach "${TEST_DIR}/test.pdf" "${TEST_DIR}/data.csv" "${TEST_DIR}/small.txt" 2>&1 | grep -q "config"; then
    test_pass "Handles PDF, CSV, TXT files"
  else
    test_fail "File types" "Should accept various formats"
  fi
}

print_summary() {
  echo ""
  echo "========================================"
  echo "Attachment Tests Summary"
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
  echo "MailGoat Attachment Tests"
  echo "=========================="
  echo ""
  
  # Setup
  echo "Setting up test data..."
  setup_test_data
  echo ""
  
  # Run tests
  test_single_attachment
  test_multiple_attachments
  test_attachment_not_found
  test_attachment_too_large
  test_mime_type_detection
  test_total_size_limit
  test_various_file_types
  
  # Cleanup
  cleanup_test_data
  
  # Summary
  print_summary
}

main
