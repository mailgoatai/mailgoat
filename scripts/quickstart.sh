#!/bin/bash
#
# MailGoat + Postal Quick Start Script
# 
# This script helps you get MailGoat and Postal running in minutes
# Usage: bash scripts/quickstart.sh
#

set -e  # Exit on error

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper functions
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  warning "Not running as root. Some operations may require sudo."
fi

# Banner
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║   🐐 MailGoat + Postal Quick Start                   ║"
echo "║                                                       ║"
echo "║   Email for AI agents, self-hosted                   ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check prerequisites
info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
  error "Docker is not installed. Please install Docker first:"
  echo "  curl -fsSL https://get.docker.com | sh"
  exit 1
fi
success "Docker found: $(docker --version)"

if ! command -v docker-compose &> /dev/null; then
  error "Docker Compose is not installed. Please install Docker Compose first:"
  echo "  See: https://docs.docker.com/compose/install/"
  exit 1
fi
success "Docker Compose found: $(docker-compose --version)"

# Step 2: Check if .env exists
if [ ! -f .env ]; then
  warning ".env file not found. Creating from .env.example..."
  
  if [ ! -f .env.example ]; then
    error ".env.example not found. Are you in the correct directory?"
    exit 1
  fi
  
  cp .env.example .env
  success "Created .env file"
  
  # Generate secure passwords
  info "Generating secure passwords..."
  DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
  RABBITMQ_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
  SECRET_KEY=$(openssl rand -hex 64)
  SIGNING_KEY=$(openssl rand -hex 64)
  
  # Update .env file
  sed -i.bak "s/DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=$DB_PASSWORD/" .env
  sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
  sed -i.bak "s/RABBITMQ_PASSWORD=.*/RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD/" .env
  sed -i.bak "s/SECRET_KEY_BASE=.*/SECRET_KEY_BASE=$SECRET_KEY/" .env
  sed -i.bak "s/SIGNING_KEY=.*/SIGNING_KEY=$SIGNING_KEY/" .env
  rm .env.bak
  
  success "Generated secure passwords"
  
  # Prompt for domain configuration
  echo ""
  info "Domain Configuration"
  echo "You need to configure your domains in .env file"
  echo "Required settings:"
  echo "  - POSTAL_HOSTNAME (e.g., postal.example.com)"
  echo "  - SMTP_HOSTNAME (e.g., mail.example.com)"
  echo ""
  read -p "Do you want to edit .env now? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    ${EDITOR:-nano} .env
  else
    warning "Please edit .env manually before starting services"
    echo "  nano .env"
    echo ""
    exit 0
  fi
else
  success ".env file found"
fi

# Step 3: Verify domain configuration
info "Verifying configuration..."
source .env

if [ "$POSTAL_HOSTNAME" = "postal.example.com" ] || [ -z "$POSTAL_HOSTNAME" ]; then
  warning "POSTAL_HOSTNAME is not configured"
  warning "Please edit .env and set your actual domain"
  exit 1
fi

if [ "$SMTP_HOSTNAME" = "mail.example.com" ] || [ -z "$SMTP_HOSTNAME" ]; then
  warning "SMTP_HOSTNAME is not configured"
  warning "Please edit .env and set your actual domain"
  exit 1
fi

success "Configuration verified"

# Step 4: Pull Docker images
info "Pulling Docker images (this may take a few minutes)..."
docker-compose -f docker-compose.full.yml pull
success "Images pulled"

# Step 5: Start services
info "Starting services..."
docker-compose -f docker-compose.full.yml up -d
success "Services started"

# Step 6: Wait for services to be healthy
info "Waiting for services to be healthy (this may take 1-2 minutes)..."
timeout=120
elapsed=0
while [ $elapsed -lt $timeout ]; do
  if docker-compose -f docker-compose.full.yml ps | grep -q "healthy"; then
    break
  fi
  sleep 5
  elapsed=$((elapsed + 5))
  echo -n "."
done
echo ""

if [ $elapsed -ge $timeout ]; then
  error "Services did not become healthy in time"
  echo "Check logs with: docker-compose -f docker-compose.full.yml logs"
  exit 1
fi
success "Services are healthy"

# Step 7: Initialize Postal database
info "Initializing Postal database..."
docker-compose -f docker-compose.full.yml exec -T postal-web postal initialize || {
  warning "Database might already be initialized (this is okay)"
}
success "Database initialized"

# Step 8: Show next steps
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  ✓ MailGoat + Postal is running!                     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Access Postal web UI:"
echo "   → http://$POSTAL_HOSTNAME:5000"
echo ""
echo "2. Create an admin account:"
echo "   docker-compose -f docker-compose.full.yml exec postal-web postal make-user"
echo ""
echo "3. Create an organization and get API credentials"
echo ""
echo "4. Add API key to .env file:"
echo "   nano .env  # Set MAILGOAT_API_KEY"
echo ""
echo "5. Test MailGoat CLI:"
echo "   docker-compose -f docker-compose.full.yml run --rm mailgoat \\"
echo "     mailgoat send --to user@example.com --subject 'Test' --body 'Hello!'"
echo ""
echo "Documentation:"
echo "  - Full guide: DOCKER.md"
echo "  - Postal docs: https://docs.postalserver.io"
echo "  - MailGoat docs: https://mailgoat.ai/docs"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.full.yml logs -f"
echo "  - Stop: docker-compose -f docker-compose.full.yml down"
echo "  - Restart: docker-compose -f docker-compose.full.yml restart"
echo ""
success "Setup complete! Happy mailing 🐐📧"
echo ""
