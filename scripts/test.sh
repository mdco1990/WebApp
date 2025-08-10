#!/bin/bash
# Test script for WebApp

set -e

echo "Running tests..."

# Run all tests with coverage
go test -v -race -coverprofile=coverage.out ./...

# Show coverage report
go tool cover -html=coverage.out -o coverage.html

echo "✓ Tests completed"
echo "Coverage report: coverage.html"
