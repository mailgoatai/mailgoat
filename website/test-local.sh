#!/bin/bash
# Quick local test server for MailGoat landing page

echo "🐐 Starting MailGoat Landing Page Test Server..."
echo ""
echo "📍 Server will run at: http://localhost:8000"
echo "🔍 Open in your browser to preview"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")"

# Try Python 3 first
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
# Fall back to Python 2
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
# Try Node.js
elif command -v node &> /dev/null && command -v npx &> /dev/null; then
    npx http-server -p 8000
else
    echo "❌ Error: No suitable HTTP server found"
    echo ""
    echo "Please install one of:"
    echo "  - Python 3: apt-get install python3"
    echo "  - Node.js: https://nodejs.org"
    exit 1
fi
