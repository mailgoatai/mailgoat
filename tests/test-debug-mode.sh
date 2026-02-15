#!/usr/bin/env bash
#
# Test script for debug mode functionality
# Tests both --debug flag and DEBUG environment variable
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Build mailgoat CLI
echo -e "${BLUE}Building MailGoat CLI...${NC}"
cd "$PROJECT_DIR"
npm run build > /dev/null 2>&1

# Get mailgoat path
MAILGOAT="$PROJECT_DIR/bin/mailgoat.js"

# Helper function to run test
run_test() {
  local test_name="$1"
  local expected_pattern="$2"
  local command="$3"
  
  TESTS_RUN=$((TESTS_RUN + 1))
  
  echo -e "\n${YELLOW}Test $TESTS_RUN: $test_name${NC}"
  
  # Run command and capture stderr
  if output=$(eval "$command" 2>&1); then
    # Check if expected pattern is in output
    if echo "$output" | grep -q "$expected_pattern"; then
      echo -e "${GREEN}✓ PASS${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      return 0
    else
      echo -e "${RED}✗ FAIL${NC}"
      echo "Expected pattern: $expected_pattern"
      echo "Output:"
      echo "$output" | head -20
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
    fi
  else
    # Command failed, but that's ok if we found the pattern
    if echo "$output" | grep -q "$expected_pattern"; then
      echo -e "${GREEN}✓ PASS (with error)${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      return 0
    else
      echo -e "${RED}✗ FAIL${NC}"
      echo "Expected pattern: $expected_pattern"
      echo "Output:"
      echo "$output" | head -20
      TESTS_FAILED=$((TESTS_FAILED + 1))
      return 1
    fi
  fi
}

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}MailGoat Debug Mode Test Suite${NC}"
echo -e "${BLUE}======================================${NC}"

# Test 1: --debug flag enables debug mode
run_test \
  "Global --debug flag enables debug logging" \
  "Debug mode enabled" \
  "node $MAILGOAT --debug config show"

# Test 2: DEBUG=mailgoat:* enables all namespaces
run_test \
  "DEBUG=mailgoat:* enables all debug namespaces" \
  "\[mailgoat:" \
  "DEBUG=mailgoat:* node $MAILGOAT config show"

# Test 3: DEBUG=mailgoat:config enables config namespace
run_test \
  "DEBUG=mailgoat:config enables config namespace" \
  "\[mailgoat:config\]" \
  "DEBUG=mailgoat:config node $MAILGOAT config show"

# Test 4: Debug logs show Node version
run_test \
  "Debug mode shows Node version" \
  "Node version:" \
  "node $MAILGOAT --debug config show"

# Test 5: Debug logs show platform
run_test \
  "Debug mode shows platform info" \
  "Platform:" \
  "node $MAILGOAT --debug config show"

# Test 6: Debug logs show command
run_test \
  "Debug mode shows command being run" \
  "Command:" \
  "node $MAILGOAT --debug config show"

# Test 7: Config loading debug
run_test \
  "Debug mode logs config loading" \
  "Config path resolved to:" \
  "node $MAILGOAT --debug config show"

# Test 8: Without debug, no debug logs
run_test \
  "No debug logs when debug mode disabled" \
  "^(?!.*\[mailgoat:).*" \
  "node $MAILGOAT config show 2>&1 | grep -v '\[mailgoat:' | wc -l"

# Test 9: Sensitive data sanitization (if config exists)
if [ -f "$HOME/.mailgoat/config.yml" ]; then
  run_test \
    "API key is sanitized in debug logs" \
    "API key length:.*characters" \
    "DEBUG=mailgoat:config node $MAILGOAT config show"
fi

# Test 10: Debug with send command (will fail auth, but should show debug logs)
run_test \
  "Debug logs work with send command" \
  "\[mailgoat:" \
  "DEBUG=mailgoat:* node $MAILGOAT send --to test@example.com --subject Test --body Hello || true"

# Summary
echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Tests run:    $TESTS_RUN"
echo -e "${GREEN}Tests passed: $TESTS_PASSED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Tests failed: $TESTS_FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
