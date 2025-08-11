#!/bin/bash
# Build script for WebApp

set -e

echo "Building WebApp..."

# Build the main application
go build -o bin/webapp ./cmd/webapp

echo "✓ Build completed successfully"
echo "Binary location: bin/webapp"
