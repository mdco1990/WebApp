#!/bin/bash
# Docker Compose Quality Script for WebApp
# Review, lint, refactor, fix lint, clean code, test, and format backend and frontend

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "\033[0;32m[$(date +'%H:%M:%S')] $1\033[0m"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

step() {
    echo -e "\033[0;34m🔧 $1\033[0m"
}

# Configuration
COMPOSE_FILE="deployments/docker-compose.yml"

# Function to run backend quality checks
run_backend_quality() {
    log "Starting backend quality checks..."
    
    step "Formatting Go code..."
    docker compose -f $COMPOSE_FILE run --rm api sh -c "
        go install golang.org/x/tools/cmd/goimports@latest
        goimports -w .
    "
    
    step "Running Go linting..."
    docker compose -f $COMPOSE_FILE run --rm api sh -c "
        curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/HEAD/install.sh | sh -s -- -b \$(go env GOPATH)/bin latest
        export PATH=\$PATH:\$(go env GOPATH)/bin
        golangci-lint run --timeout=5m --fix
    "
    
    step "Running Go tests..."
    docker compose -f $COMPOSE_FILE run --rm api sh -c "
        go test -v ./...
    "
    
    step "Cleaning Go modules..."
    docker compose -f $COMPOSE_FILE run --rm api sh -c "
        go mod tidy
        go mod verify
    "
    
    log "Backend quality checks completed"
}

# Function to run frontend quality checks
run_frontend_quality() {
    log "Starting frontend quality checks..."
    
    step "Installing dependencies..."
    docker compose -f $COMPOSE_FILE run --rm web sh -c "
        npm ci
    "
    
    step "Formatting frontend code..."
    docker compose -f $COMPOSE_FILE run --rm web sh -c "
        npm run format
    "
    
    step "Running ESLint with auto-fix..."
    docker compose -f $COMPOSE_FILE run --rm web sh -c "
        npm run lint:fix
    "
    
    step "Running Stylelint with auto-fix..."
    docker compose -f $COMPOSE_FILE run --rm web sh -c "
        npm run lint:css:fix
    "
    
    step "Running TypeScript checks..."
    docker compose -f $COMPOSE_FILE run --rm web sh -c "
        npx tsc --noEmit
    "
    
    step "Running frontend tests..."
    docker compose -f $COMPOSE_FILE run --rm web sh -c "
        npm test -- --coverage --watchAll=false
    "
    
    step "Building frontend..."
    docker compose -f $COMPOSE_FILE run --rm web sh -c "
        npm run build
    "
    
    log "Frontend quality checks completed"
}

# Function to run security checks
run_security_checks() {
    log "Starting security checks..."
    
    step "Checking Go dependencies..."
    docker compose -f $COMPOSE_FILE run --rm api sh -c "
        go list -m -u all
        echo 'Go dependencies checked'
    "
    
    step "Checking npm dependencies..."
    docker compose -f $COMPOSE_FILE run --rm web sh -c "
        npm audit --audit-level=moderate || true
        echo 'npm dependencies checked'
    "
    
    log "Security checks completed"
}

# Function to clean up
cleanup() {
    log "Cleaning up..."
    docker compose -f $COMPOSE_FILE down --volumes --remove-orphans
    docker system prune -f
    log "Cleanup completed"
}

# Main execution
main() {
    log "Starting comprehensive code quality review via Docker Compose"
    
    # Check Docker
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Docker is not running"
        exit 1
    fi
    
    # Stop containers and build
    docker compose -f $COMPOSE_FILE down --remove-orphans >/dev/null 2>&1 || true
    docker compose -f $COMPOSE_FILE build --no-cache
    
    # Run quality checks
    run_backend_quality
    run_frontend_quality
    
    # Cleanup
    docker compose -f $COMPOSE_FILE down --volumes --remove-orphans
    docker system prune -f
    
    log "🎉 All quality checks completed successfully!"
}

# Parse arguments
case "${1:-}" in
    --backend)
        docker compose -f $COMPOSE_FILE down --remove-orphans >/dev/null 2>&1 || true
        docker compose -f $COMPOSE_FILE build --no-cache
        run_backend_quality
        docker compose -f $COMPOSE_FILE down --volumes --remove-orphans
        ;;
    --frontend)
        docker compose -f $COMPOSE_FILE down --remove-orphans >/dev/null 2>&1 || true
        docker compose -f $COMPOSE_FILE build --no-cache
        run_frontend_quality
        docker compose -f $COMPOSE_FILE down --volumes --remove-orphans
        ;;
    -h|--help)
        echo "Usage: $0 [--backend|--frontend]"
        echo "  --backend   Run only backend quality checks"
        echo "  --frontend  Run only frontend quality checks"
        echo "  (no args)   Run all quality checks"
        ;;
    *)
        main
        ;;
esac
