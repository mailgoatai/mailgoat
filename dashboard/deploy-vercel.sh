#!/bin/bash
# Vercel CLI Deployment Script for MailGoat Analytics Dashboard
# Usage: VERCEL_TOKEN=xxx ./deploy-vercel.sh

set -e

echo "🚀 MailGoat Analytics - Vercel Deployment"
echo "=========================================="
echo ""

# Check if Vercel token is provided
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Error: VERCEL_TOKEN environment variable not set"
    echo ""
    echo "To deploy via CLI, you need a Vercel token:"
    echo "1. Go to: https://vercel.com/account/tokens"
    echo "2. Generate new token"
    echo "3. Run: export VERCEL_TOKEN='your-token-here'"
    echo "4. Run this script again"
    echo ""
    echo "OR use the web UI (easier):"
    echo "See: ../VERCEL_DEPLOYMENT_GUIDE.md"
    exit 1
fi

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI ready"
echo ""

# Navigate to dashboard directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

echo "📂 Current directory: $(pwd)"
echo ""

# Deploy with Vercel CLI
echo "🚀 Deploying to Vercel..."
echo ""

vercel \
    --token "$VERCEL_TOKEN" \
    --yes \
    --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Your dashboard should be live at the URL shown above"
echo ""
echo "🔍 Verify:"
echo "  - Charts load correctly"
echo "  - npm Downloads shows ~180"
echo "  - GitHub Stats shows 4 stars"
echo ""
echo "🎉 Done! Share the URL with your team."
