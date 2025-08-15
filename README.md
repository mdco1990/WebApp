# WebApp

A modern web application with Go backend and React frontend.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start the full development environment
make docker-dev

# Or use the script directly
./scripts/docker.sh up --tools
```

### Using Local Development

```bash
# Start backend and frontend locally
make dev

# Or start them separately
make run          # Backend only
make web-dev      # Frontend only
```

## Code Quality System

The project includes a comprehensive code quality system that reviews, lints, refactors, fixes lint issues, cleans code, tests, and formats both backend and frontend using Docker Compose.

### Quick Quality Checks

```bash
# Run all quality checks (recommended)
make quality-docker

# Run specific quality checks
make quality-docker-backend   # Backend only (Go)
make quality-docker-frontend  # Frontend only (React/TypeScript)

# Using scripts directly
./scripts/quality-docker.sh
./scripts/quality-docker.sh --backend
./scripts/quality-docker.sh --frontend
```

### What the Quality System Does

**Backend (Go):**
- ✅ Code formatting with `goimports`
- ✅ Linting with `golangci-lint` (auto-fix enabled)
- ✅ Unit testing with `go test`
- ✅ Module management with `go mod tidy`

**Frontend (React/TypeScript):**
- ✅ Code formatting with `Prettier`
- ✅ Linting with `ESLint` and `Stylelint` (auto-fix enabled)
- ✅ Type checking with `TypeScript`
- ✅ Unit testing with `Jest`
- ✅ Build verification with `Vite`

**Docker Integration:**
- ✅ Consistent environment across machines
- ✅ No local tool installation required
- ✅ Isolated testing environment
- ✅ Reproducible results

For detailed information about the quality system, see [docs/QUALITY.md](docs/QUALITY.md).

## Available Commands

### Development

```bash
make help              # Show all available commands
make dev               # Start local development
make docker-dev        # Start Docker development
make docker-stop       # Stop Docker services
```

### Quality & Testing

```bash
# Docker-based quality checks (recommended)
make quality-docker
make quality-docker-backend
make quality-docker-frontend

# Traditional local quality checks
make lint              # Go linting
make format            # Go formatting
make test              # Go tests
make lint-web          # Frontend linting
make format-web        # Frontend formatting
make test-web          # Frontend tests
```

### Building

```bash
make build             # Build Go binary
make web-build         # Build frontend
make tidy              # Sync Go dependencies
```

## Project Structure

```
├── cmd/               # Application entry points
├── internal/          # Private application code
│   ├── config/        # Configuration
│   ├── db/           # Database layer
│   ├── domain/       # Business logic
│   ├── middleware/   # HTTP middleware
│   ├── observability/ # Logging, metrics
│   ├── repository/   # Data access layer
│   ├── security/     # Security utilities
│   ├── service/      # Business services
│   └── transport/    # HTTP handlers
├── web/              # Frontend React application
├── deployments/      # Docker and deployment configs
├── docs/            # Documentation
└── scripts/         # Utility scripts
```

## Configuration

### Environment Variables

Create a `.env.dev` file for local development:

```env
HTTP_ADDRESS=127.0.0.1:8082
DB_DRIVER=sqlite
DB_PATH=./data/app.db
CORS_ALLOWED_ORIGINS=http://localhost:5173
ENV=dev
LOG_LEVEL=debug
```

### Docker Configuration

The project uses Docker Compose for development with the following services:

- **api**: Go backend with live reloading
- **web**: React frontend with Vite
- **db**: SQLite database
- **https-proxy**: Nginx reverse proxy with HTTPS
- **sqlite-admin**: Database administration UI

## Development Workflow

1. **Start Development Environment**
   ```bash
   make docker-dev
   ```

2. **Run Quality Checks**
   ```bash
   make quality-docker
   ```

3. **Make Changes**
   - Backend changes auto-reload via Air
   - Frontend changes auto-reload via Vite

4. **Test Changes**
   ```bash
   make quality-docker-backend   # Test backend
   make quality-docker-frontend  # Test frontend
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   make docker-stop
   make free-port
   ```

2. **Docker issues**
   ```bash
   docker system prune -f
   docker compose -f deployments/docker-compose.yml down --volumes
   ```

3. **Quality check failures**
   - Review the linting output
   - Fix issues manually if auto-fix doesn't work
   - Check configuration files

### Getting Help

```bash
make help              # Show all commands
./scripts/quality-docker.sh --help  # Quality script help
./scripts/docker.sh --help          # Docker script help
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run quality checks: `make quality-docker`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
