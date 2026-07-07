#!/bin/bash
# Start Agently News Collector server for IdeaHub
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECTOR_DIR="$SCRIPT_DIR/agently-news-collector"

echo "=== Agently News Collector Server ==="
echo "Collector dir: $COLLECTOR_DIR"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is required"
    exit 1
fi

# Install dependencies if needed
if [ ! -f "$COLLECTOR_DIR/.deps_installed" ]; then
    echo "Installing Agently dependencies..."
    pip3 install -r "$COLLECTOR_DIR/requirements.txt" fastapi uvicorn
    touch "$COLLECTOR_DIR/.deps_installed"
fi

# Load .env if present
if [ -f "$COLLECTOR_DIR/.env" ]; then
    set -a
    source "$COLLECTOR_DIR/.env"
    set +a
fi

# Start the server
echo "Starting Agently server on port 8766..."
python3 "$SCRIPT_DIR/agently_server.py"
