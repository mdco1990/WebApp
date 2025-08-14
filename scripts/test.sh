#!/bin/bash
# Comprehensive test script for WebApp (Go + Frontend)

set -e

echo "🧪 Running comprehensive test suite..."

# Go Tests
echo "📋 Running Go tests..."
go test -v -race -coverprofile=coverage.out ./...

# Generate coverage report
if [ -f coverage.out ]; then
    go tool cover -html=coverage.out -o coverage.html
    echo "✓ Go tests completed - Coverage report: coverage.html"
fi

# Frontend Tests
if [ -d "web" ]; then
    echo "📋 Running frontend tests..."
    cd web
    if [ -f package.json ]; then
        npm test -- --coverage --watchAll=false
        echo "✓ Frontend tests completed"
    fi
    cd ..
fi

echo "✅ All tests completed successfully!"
