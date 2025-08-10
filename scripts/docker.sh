#!/bin/bash
# Docker Compose Development Environment Manager for WebApp

set -e

show_help() {
    cat << EOF
WebApp Docker Compose Development Manager

Usage: $0 [ACTION] [OPTIONS]

Actions:
  up       Start development services (default)
  down     Stop services
  build    Build development images
  logs     Show logs
  ps       Show status
  config   Show configuration

Options:
  --tools  Include development tools (sqlite-admin)
  --detach Use detached mode (-d)

Examples:
  $0                    # Start development environment
  $0 --tools           # Start development with tools
  $0 up --detach       # Start development in background
  $0 logs api          # Show API logs
  $0 down              # Stop all services

Note: Production deployments use Kubernetes with Helm charts.
This script is for local development only.
EOF
}

# Default values
ACTION=${1:-up}
COMPOSE_FILES="-f deployments/docker-compose.yml"
EXTRA_ARGS=""
PROFILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        up|down|build|logs|ps|config)
            ACTION=$1
            ;;
        --tools)
            PROFILE="--profile tools"
            ;;
        --detach)
            EXTRA_ARGS="$EXTRA_ARGS -d"
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            EXTRA_ARGS="$EXTRA_ARGS $1"
            ;;
    esac
    shift
done

# Set environment file if it exists
ENV_FILE=".env.dev"
if [[ -f $ENV_FILE ]]; then
    COMPOSE_FILES="--env-file $ENV_FILE $COMPOSE_FILES"
fi

echo "🚀 WebApp Development Environment"
echo "Action: $ACTION"
echo "Files: $COMPOSE_FILES"
echo "Profile: ${PROFILE:-none}"
echo ""

# Execute docker compose command
CMD="docker compose $COMPOSE_FILES $PROFILE $ACTION $EXTRA_ARGS"
echo "Running: $CMD"
echo ""

exec $CMD
