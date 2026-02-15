#!/bin/bash
#
# CI/CD Test Runner
# 
# Wrapper script for running email delivery tests in CI environments
# Handles environment setup, error handling, and result reporting
#

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "MailGoat CI Test Runner"
echo "======================="
echo ""

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq not installed${NC}"
    echo "Install with: apt-get install jq"
    exit 1
fi

# Check configuration
if [ -z "${POSTAL_API_KEY:-}" ] && ! command -v mailgoat &> /dev/null; then
    echo -e "${RED}Error: Neither MailGoat CLI nor Postal API credentials available${NC}"
    echo "Either install mailgoat CLI or set POSTAL_API_KEY environment variable"
    exit 1
fi

# Run tests
echo "Running email delivery tests..."
echo ""

if "${SCRIPT_DIR}/test-email-delivery.sh" --json --report test-results.json --verbose; then
    echo ""
    echo -e "${GREEN}✓ All tests passed${NC}"
    
    # Print summary
    if [ -f test-results.json ]; then
        echo ""
        echo "Summary:"
        jq -r '.summary | "  Total: \(.total)\n  Passed: \(.passed)\n  Failed: \(.failed)\n  Duration: \(.duration_seconds)s"' test-results.json || true
    fi
    
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    
    # Print failed tests
    if [ -f test-results.json ]; then
        echo ""
        echo "Failed tests:"
        jq -r '.results[] | select(.result == "FAIL") | "  - \(.name)"' test-results.json || true
    fi
    
    exit 1
fi
