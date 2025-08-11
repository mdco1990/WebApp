# Development Guide

## Local Development Setup

This project supports multiple development approaches. Choose the one that best fits your workflow.

### Quick Start Options

#### Option 1: Docker Compose (Recommended)
```bash
# Start development environment
docker compose -f deployments/docker-compose.yml up

# With development tools (SQLite Admin)
docker compose -f deployments/docker-compose.yml --profile tools up

# Background mode
docker compose -f deployments/docker-compose.yml up -d
```

#### Option 2: Makefile (Most Convenient)
```bash
# Local development (no Docker)
make dev              # Start both API and frontend locally
make dev-logs         # View logs
make dev-stop         # Stop both services

# Docker development
make docker-dev       # Start with Docker + tools
make docker-stop      # Stop Docker services

# Other useful commands
make build           # Build the Go binary
make test            # Run all tests
make lint            # Run linting
make format          # Format code
```

#### Option 3: Manual Setup
```bash
# Terminal 1: Start API
go run ./cmd/webapp

# Terminal 2: Start Frontend  
cd web
npm install
npm run dev
```

## Development Environment Details

### Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| `api` | 8082 | Go backend (internal to Docker network) |
| `web` | 5173 | React frontend (exposed to host) |
| `db` | - | SQLite database (file-based) |
| `sqlite-admin` | 8080 | Database admin UI (profile: tools) |

### Environment Configuration

The development environment uses SQLite for simplicity:

```bash
# Default development settings
HTTP_ADDRESS=0.0.0.0:8082
DB_DRIVER=sqlite
DB_PATH=/db/app.db
ENV=dev
LOG_LEVEL=debug
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Hot Reloading

- **Go Backend**: Code changes trigger automatic restart
- **React Frontend**: Vite provides instant hot module replacement
- **Database**: SQLite file persists between restarts

### Development Tools

Enable development tools with the `tools` profile:

```bash
docker compose -f deployments/docker-compose.yml --profile tools up
```

This adds:
- **SQLite Admin**: http://localhost:8080 - Web-based SQLite browser

## Production Deployment

Production deployments use **Kubernetes with Helm charts**, not Docker Compose.

For production configuration:
- Database: MySQL (managed in Kubernetes)
- Frontend: Built static files served by nginx
- Backend: Optimized Go binary
- Scaling: Horizontal pod autoscaling
- Monitoring: Kubernetes-native observability

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using port 5173
lsof -i :5173
# Or use make to auto-free ports
make dev
```

**Database issues:**
```bash
# Reset SQLite database
docker compose -f deployments/docker-compose.yml down -v
docker compose -f deployments/docker-compose.yml up
```

**Module cache issues:**
```bash
# Clear Go modules cache
docker compose -f deployments/docker-compose.yml down
docker volume rm webapp_webapp_cache
docker compose -f deployments/docker-compose.yml up --build
```

### Development Tips

1. **API Testing**: Use the built-in Swagger UI at http://localhost:5173/api/
2. **Database Inspection**: Enable SQLite Admin with `--profile tools`
3. **Log Monitoring**: Use `make dev-logs` to tail both API and frontend logs
4. **Quick Restart**: `make dev-stop && make dev` for clean restart

## Code Quality

### Linting and Formatting
```bash
make lint          # Run golangci-lint
make format        # Format Go code with goimports
make format-check  # Check if formatting is needed
make lint-web      # Lint frontend code
make format-web    # Format frontend code
```

### Testing
```bash
make test          # Run all Go tests
go test -v ./...   # Verbose test output
go test -race      # Race condition detection
```

### Build
```bash
make build         # Build optimized binary
./bin/webapp       # Run the built binary
```
