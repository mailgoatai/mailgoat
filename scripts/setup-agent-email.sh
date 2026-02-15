#!/bin/bash
#
# MailGoat Agent Email Setup Script
#
# Automated configuration script for setting up MailGoat CLI for AI agents
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default values
EMAIL=""
API_KEY=""
SERVER="mail.mailgoat.ai"
CONFIG_DIR="${HOME}/.mailgoat"
CONFIG_FILE="${CONFIG_DIR}/config.yml"
FORCE=false
SKIP_TEST=false

# Script info
SCRIPT_VERSION="1.0.0"
SCRIPT_NAME="$(basename "$0")"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "${CYAN}${BOLD}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  MailGoat Agent Email Setup"
  echo "  Version ${SCRIPT_VERSION}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗ Error:${NC} $1" >&2
}

print_warning() {
  echo -e "${YELLOW}⚠ Warning:${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_usage() {
  cat << EOF
Usage: ${SCRIPT_NAME} [OPTIONS]

Automated setup script for MailGoat CLI configuration.

OPTIONS:
  -e, --email EMAIL       Agent email address (required)
  -k, --api-key KEY       Postal API key (required)
  -s, --server SERVER     Postal server URL (default: mail.mailgoat.ai)
  -f, --force             Overwrite existing configuration
  --skip-test             Skip connection test after setup
  -h, --help              Show this help message
  -v, --version           Show version information

EXAMPLES:
  # Basic setup
  ${SCRIPT_NAME} \\
    --email dev1@mailgoat.ai \\
    --api-key "postal_abc123..."

  # Custom server
  ${SCRIPT_NAME} \\
    --email agent@example.com \\
    --api-key "key123" \\
    --server postal.example.com

  # Force overwrite existing config
  ${SCRIPT_NAME} \\
    --email dev1@mailgoat.ai \\
    --api-key "key456" \\
    --force

ENVIRONMENT VARIABLES:
  MAILGOAT_EMAIL      Default email address
  MAILGOAT_API_KEY    Default API key
  MAILGOAT_SERVER     Default server URL

CONFIGURATION:
  Config file: ~/.mailgoat/config.yml
  Permissions: 0600 (owner read/write only)

For more information: https://mailgoat.ai/docs
EOF
}

print_version() {
  echo "MailGoat Agent Email Setup Script v${SCRIPT_VERSION}"
}

# ============================================================================
# Validation Functions
# ============================================================================

validate_email() {
  local email="$1"
  
  if [[ -z "$email" ]]; then
    return 1
  fi
  
  # Basic email validation regex
  if [[ ! "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    return 1
  fi
  
  return 0
}

validate_api_key() {
  local key="$1"
  
  if [[ -z "$key" ]]; then
    print_error "API key cannot be empty"
    return 1
  fi
  
  if [[ ${#key} -lt 10 ]]; then
    print_error "API key seems too short (minimum 10 characters)"
    return 1
  fi
  
  return 0
}

validate_server() {
  local server="$1"
  
  if [[ -z "$server" ]]; then
    print_error "Server URL cannot be empty"
    return 1
  fi
  
  # Remove protocol if provided
  server="${server#http://}"
  server="${server#https://}"
  
  # Check for basic domain format
  if [[ ! "$server" =~ \. ]]; then
    print_error "Server URL must be a valid domain (e.g., postal.example.com)"
    return 1
  fi
  
  if [[ "$server" =~ [[:space:]] ]]; then
    print_error "Server URL cannot contain spaces"
    return 1
  fi
  
  return 0
}

# ============================================================================
# Setup Functions
# ============================================================================

check_prerequisites() {
  # Check if mailgoat CLI is installed
  if ! command -v mailgoat &> /dev/null; then
    print_warning "mailgoat CLI not found in PATH"
    print_info "Install with: npm install -g mailgoat"
    print_info "Continuing anyway (config will be ready when CLI is installed)..."
  fi
}

create_config_directory() {
  if [[ -d "$CONFIG_DIR" ]]; then
    print_info "Config directory already exists: $CONFIG_DIR"
  else
    print_info "Creating config directory: $CONFIG_DIR"
    
    if ! mkdir -p "$CONFIG_DIR"; then
      print_error "Failed to create directory: $CONFIG_DIR"
      return 1
    fi
    
    # Set directory permissions to 0700 (owner only)
    chmod 700 "$CONFIG_DIR"
    print_success "Created config directory"
  fi
  
  return 0
}

check_existing_config() {
  if [[ -f "$CONFIG_FILE" ]] && [[ "$FORCE" != true ]]; then
    print_error "Configuration already exists at: $CONFIG_FILE"
    echo "Use --force to overwrite"
    return 1
  fi
  
  if [[ -f "$CONFIG_FILE" ]] && [[ "$FORCE" = true ]]; then
    print_warning "Overwriting existing configuration"
  fi
  
  return 0
}

write_config_file() {
  print_info "Writing configuration to: $CONFIG_FILE"
  
  # Write YAML config
  cat > "$CONFIG_FILE" << EOF
server: ${SERVER}
email: ${EMAIL}
api_key: ${API_KEY}
EOF
  
  if [[ $? -ne 0 ]]; then
    print_error "Failed to write configuration file"
    return 1
  fi
  
  # Set file permissions to 0600 (owner read/write only)
  chmod 600 "$CONFIG_FILE"
  
  print_success "Configuration written successfully"
  return 0
}

test_connection() {
  if [[ "$SKIP_TEST" = true ]]; then
    print_info "Skipping connection test (--skip-test)"
    return 0
  fi
  
  if ! command -v mailgoat &> /dev/null; then
    print_warning "Cannot test connection (mailgoat CLI not installed)"
    return 0
  fi
  
  print_info "Testing configuration..."
  
  if mailgoat config show --json &> /dev/null; then
    print_success "Configuration test passed"
    return 0
  else
    print_warning "Configuration test failed (may need to install MailGoat CLI)"
    return 0
  fi
}

print_next_steps() {
  echo ""
  echo -e "${GREEN}${BOLD}✓ Setup Complete!${NC}"
  echo ""
  echo "Configuration saved to: ${CONFIG_FILE}"
  echo ""
  echo -e "${BOLD}Next Steps:${NC}"
  echo ""
  echo "1. Verify configuration:"
  echo -e "   ${CYAN}mailgoat config show${NC}"
  echo ""
  echo "2. Send your first email:"
  echo -e "   ${CYAN}mailgoat send \\${NC}"
  echo -e "   ${CYAN}  --to user@example.com \\${NC}"
  echo -e "   ${CYAN}  --subject \"Hello\" \\${NC}"
  echo -e "   ${CYAN}  --body \"Test message\"${NC}"
  echo ""
  echo "3. Check your inbox:"
  echo -e "   ${CYAN}mailgoat inbox${NC}"
  echo ""
  echo "For more help:"
  echo -e "   ${CYAN}mailgoat --help${NC}"
  echo ""
}

# ============================================================================
# Argument Parsing
# ============================================================================

parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -e|--email)
        EMAIL="$2"
        shift 2
        ;;
      -k|--api-key)
        API_KEY="$2"
        shift 2
        ;;
      -s|--server)
        SERVER="$2"
        shift 2
        ;;
      -f|--force)
        FORCE=true
        shift
        ;;
      --skip-test)
        SKIP_TEST=true
        shift
        ;;
      -h|--help)
        print_usage
        exit 0
        ;;
      -v|--version)
        print_version
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        echo ""
        print_usage
        exit 1
        ;;
    esac
  done
  
  # Check for environment variables as fallback
  EMAIL="${EMAIL:-${MAILGOAT_EMAIL:-}}"
  API_KEY="${API_KEY:-${MAILGOAT_API_KEY:-}}"
  SERVER="${SERVER:-${MAILGOAT_SERVER:-mail.mailgoat.ai}}"
}

validate_arguments() {
  local has_error=false
  
  if [[ -z "$EMAIL" ]]; then
    print_error "Email address is required (--email)"
    has_error=true
  elif ! validate_email "$EMAIL"; then
    print_error "Invalid email format: $EMAIL"
    has_error=true
  fi
  
  if [[ -z "$API_KEY" ]]; then
    print_error "API key is required (--api-key)"
    has_error=true
  elif ! validate_api_key "$API_KEY"; then
    has_error=true
  fi
  
  if ! validate_server "$SERVER"; then
    has_error=true
  fi
  
  if [[ "$has_error" = true ]]; then
    echo ""
    print_usage
    exit 1
  fi
}

# ============================================================================
# Main
# ============================================================================

main() {
  # Parse command line arguments
  parse_arguments "$@"
  
  # Show header
  print_header
  
  # Validate arguments
  validate_arguments
  
  # Check prerequisites
  check_prerequisites
  
  # Create config directory
  if ! create_config_directory; then
    exit 1
  fi
  
  # Check for existing config
  if ! check_existing_config; then
    exit 1
  fi
  
  # Write configuration file
  if ! write_config_file; then
    exit 1
  fi
  
  # Test connection
  test_connection
  
  # Print success and next steps
  print_next_steps
  
  exit 0
}

# Run main function
main "$@"
