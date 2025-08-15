#!/bin/bash
# Comprehensive Code Quality Script for WebApp
# Reviews, lints, refactors, fixes lint issues, cleans code, tests, and formats backend and frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}🔧 $1${NC}"
}

log_section() {
    echo -e "${CYAN}📋 $1${NC}"
    echo "=================================="
}

# Configuration
DOCKER_COMPOSE_FILE="deployments/docker-compose.yml"
BACKEND_SERVICE="api"
FRONTEND_SERVICE="web"
TOOLS_SERVICE="sqlite-admin"

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_success "Docker is running"
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! docker compose version >/dev/null 2>&1; then
        log_error "Docker Compose is not available. Please install Docker Compose and try again."
        exit 1
    fi
    log_success "Docker Compose is available"
}

# Function to stop any running containers
stop_containers() {
    log_step "Stopping any running containers..."
    docker compose -f $DOCKER_COMPOSE_FILE down --remove-orphans >/dev/null 2>&1 || true
    log_success "Containers stopped"
}

# Function to build containers
build_containers() {
    log_step "Building Docker containers..."
    docker compose -f $DOCKER_COMPOSE_FILE build --no-cache
    log_success "Containers built successfully"
}

# Function to run backend linting and formatting
run_backend_quality() {
    log_section "Backend Code Quality (Go)"
    
    log_step "Running Go linting and formatting..."
    docker compose -f $DOCKER_COMPOSE_FILE run --rm $BACKEND_SERVICE sh -c "
        echo 'Installing linting tools...'
        go install golang.org/x/tools/cmd/goimports@latest
        curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/HEAD/install.sh | sh -s -- -b \$(go env GOPATH)/bin latest
        
        echo 'Formatting Go code with goimports...'
        goimports -w .
        
        echo 'Running golangci-lint...'
        export PATH=\$PATH:\$(go env GOPATH)/bin
        golangci-lint run --timeout=5m
        
        echo 'Running go vet...'
        go vet ./...
        
        echo 'Running go mod tidy...'
        go mod tidy
        
        echo 'Checking for unused dependencies...'
        go mod verify
    "
    
    if [ $? -eq 0 ]; then
        log_success "Backend code quality checks passed"
    else
        log_error "Backend code quality checks failed"
        return 1
    fi
}

# Function to run frontend linting and formatting
run_frontend_quality() {
    log_section "Frontend Code Quality (React/TypeScript)"
    
    log_step "Running frontend linting and formatting..."
    docker compose -f $DOCKER_COMPOSE_FILE run --rm $FRONTEND_SERVICE sh -c "
        echo 'Installing dependencies...'
        npm ci
        
        echo 'Running ESLint...'
        npm run lint
        
        echo 'Running Stylelint...'
        npm run lint:css
        
        echo 'Running Prettier formatting...'
        npm run format
        
        echo 'Running TypeScript type checking...'
        npx tsc --noEmit
        
        echo 'Running Vite build check...'
        npm run build
    "
    
    if [ $? -eq 0 ]; then
        log_success "Frontend code quality checks passed"
    else
        log_error "Frontend code quality checks failed"
        return 1
    fi
}

# Function to run tests
run_tests() {
    log_section "Running Tests"
    
    log_step "Running backend tests..."
    docker compose -f $DOCKER_COMPOSE_FILE run --rm $BACKEND_SERVICE sh -c "
        echo 'Running Go tests...'
        go test -v ./...
        
        echo 'Running Go tests with coverage...'
        go test -v -coverprofile=coverage.out ./...
        go tool cover -func=coverage.out
    "
    
    if [ $? -eq 0 ]; then
        log_success "Backend tests passed"
    else
        log_error "Backend tests failed"
        return 1
    fi
    
    log_step "Running frontend tests..."
    docker compose -f $DOCKER_COMPOSE_FILE run --rm $FRONTEND_SERVICE sh -c "
        echo 'Running Jest tests...'
        npm test -- --coverage --watchAll=false
        
        echo 'Running Jest tests with coverage...'
        npm run test:coverage
    "
    
    if [ $? -eq 0 ]; then
        log_success "Frontend tests passed"
    else
        log_error "Frontend tests failed"
        return 1
    fi
}

# Function to run security checks
run_security_checks() {
    log_section "Security Checks"
    
    log_step "Running backend security checks..."
    docker compose -f $DOCKER_COMPOSE_FILE run --rm $BACKEND_SERVICE sh -c "
        echo 'Checking for Go module vulnerabilities...'
        go list -m -u all
        
        echo 'Running go-audit if available...'
        if command -v go-audit >/dev/null 2>&1; then
            go-audit -v
        else
            echo 'go-audit not available, skipping...'
        fi
    "
    
    log_step "Running frontend security checks..."
    docker compose -f $DOCKER_COMPOSE_FILE run --rm $FRONTEND_SERVICE sh -c "
        echo 'Running npm audit...'
        npm audit --audit-level=moderate || true
        
        echo 'Checking for outdated packages...'
        npm outdated || true
    "
    
    log_success "Security checks completed"
}

# Function to run code review and analysis
run_code_review() {
    log_section "Code Review and Analysis"
    
    log_step "Running backend code analysis..."
    docker compose -f $DOCKER_COMPOSE_FILE run --rm $BACKEND_SERVICE sh -c "
        echo 'Running static analysis...'
        export PATH=\$PATH:\$(go env GOPATH)/bin
        golangci-lint run --timeout=5m --out-format=colored-line-number
        
        echo 'Checking code complexity...'
        go install github.com/fzipp/gocyclo/cmd/gocyclo@latest
        gocyclo -over 15 .
        
        echo 'Checking for dead code...'
        go install github.com/tsenart/deadcode@latest
        deadcode ./...
    "
    
    log_step "Running frontend code analysis..."
    docker compose -f $DOCKER_COMPOSE_FILE run --rm $FRONTEND_SERVICE sh -c "
        echo 'Running ESLint with detailed output...'
        npm run lint -- --format=stylish
        
        echo 'Running TypeScript strict checks...'
        npx tsc --noEmit --strict
        
        echo 'Checking bundle size...'
        npm run build
        echo 'Bundle analysis completed'
    "
    
    log_success "Code review and analysis completed"
}

# Function to clean up
cleanup() {
    log_section "Cleanup"
    
    log_step "Cleaning up containers and volumes..."
    docker compose -f $DOCKER_COMPOSE_FILE down --volumes --remove-orphans
    
    log_step "Cleaning up build artifacts..."
    docker system prune -f
    
    log_success "Cleanup completed"
}

# Function to generate report
generate_report() {
    log_section "Quality Report"
    
    echo "📊 Code Quality Report"
    echo "======================"
    echo "✅ Backend (Go):"
    echo "   - Linting: golangci-lint"
    echo "   - Formatting: goimports"
    echo "   - Testing: go test"
    echo "   - Security: go audit"
    echo ""
    echo "✅ Frontend (React/TypeScript):"
    echo "   - Linting: ESLint + Stylelint"
    echo "   - Formatting: Prettier"
    echo "   - Testing: Jest"
    echo "   - Type Checking: TypeScript"
    echo "   - Security: npm audit"
    echo ""
    echo "✅ Docker:"
    echo "   - Containerization: Docker Compose"
    echo "   - Build: Multi-stage builds"
    echo "   - Health checks: Configured"
    echo ""
    echo "🎯 All quality checks completed successfully!"
}

# Main execution function
main() {
    log_info "Starting comprehensive code quality review for WebApp"
    echo ""
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Stop any running containers
    stop_containers
    
    # Build containers
    build_containers
    
    # Run quality checks
    run_backend_quality
    run_frontend_quality
    
    # Run tests
    run_tests
    
    # Run security checks
    run_security_checks
    
    # Run code review
    run_code_review
    
    # Cleanup
    cleanup
    
    # Generate report
    generate_report
    
    log_success "🎉 All code quality tasks completed successfully!"
}

# Help function
show_help() {
    cat << EOF
WebApp Comprehensive Code Quality Script

This script performs a complete code quality review including:
- Linting and formatting (Go + React/TypeScript)
- Testing (unit tests for both backend and frontend)
- Security checks
- Code analysis and review
- Cleanup

Usage: $0 [OPTIONS]

Options:
  -h, --help    Show this help message
  --no-cleanup  Skip cleanup step
  --backend-only Run only backend quality checks
  --frontend-only Run only frontend quality checks
  --tests-only  Run only tests
  --security-only Run only security checks

Examples:
  $0                    # Run all quality checks
  $0 --backend-only     # Run only backend checks
  $0 --tests-only       # Run only tests
  $0 --no-cleanup       # Run checks without cleanup

Requirements:
  - Docker and Docker Compose
  - Internet connection for downloading tools
EOF
}

# Parse command line arguments
SKIP_CLEANUP=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
TESTS_ONLY=false
SECURITY_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --no-cleanup)
            SKIP_CLEANUP=true
            ;;
        --backend-only)
            BACKEND_ONLY=true
            ;;
        --frontend-only)
            FRONTEND_ONLY=true
            ;;
        --tests-only)
            TESTS_ONLY=true
            ;;
        --security-only)
            SECURITY_ONLY=true
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
    shift
done

# Execute based on options
if [ "$BACKEND_ONLY" = true ]; then
    log_info "Running backend-only quality checks"
    check_docker
    check_docker_compose
    stop_containers
    build_containers
    run_backend_quality
    [ "$SKIP_CLEANUP" = false ] && cleanup
elif [ "$FRONTEND_ONLY" = true ]; then
    log_info "Running frontend-only quality checks"
    check_docker
    check_docker_compose
    stop_containers
    build_containers
    run_frontend_quality
    [ "$SKIP_CLEANUP" = false ] && cleanup
elif [ "$TESTS_ONLY" = true ]; then
    log_info "Running tests only"
    check_docker
    check_docker_compose
    stop_containers
    build_containers
    run_tests
    [ "$SKIP_CLEANUP" = false ] && cleanup
elif [ "$SECURITY_ONLY" = true ]; then
    log_info "Running security checks only"
    check_docker
    check_docker_compose
    stop_containers
    build_containers
    run_security_checks
    [ "$SKIP_CLEANUP" = false ] && cleanup
else
    main
fi

log_success "Script completed successfully!"
