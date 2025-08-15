#!/bin/bash
# Comprehensive build script for WebApp (Go + Frontend)

set -e

echo "🏗️  Building WebApp..."

# Create bin directory if it doesn't exist
mkdir -p bin

# Build the Go backend
echo "📦 Building Go backend..."
go build -ldflags="-s -w" -o bin/webapp ./cmd/webapp
echo "✓ Go backend built: bin/webapp"

# Build the frontend
if [ -d "web" ]; then
    echo "📦 Building frontend..."
    cd web
    if [ -f package.json ]; then
        npm install --production=false
        npm run build
        echo "✓ Frontend built: web/dist/"
    fi
    cd ..
fi

echo "✅ Build completed successfully!"
echo "Backend binary: bin/webapp"
if [ -d "web/dist" ]; then
    echo "Frontend assets: web/dist/"
fi
