#!/bin/bash
# Development run script for WebApp

set -e

echo "Starting WebApp in development mode..."

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Set development defaults
export ENV=${ENV:-dev}
export LOG_LEVEL=${LOG_LEVEL:-debug}
export LOG_FORMAT=${LOG_FORMAT:-text}

# Run the application
go run ./cmd/webapp
