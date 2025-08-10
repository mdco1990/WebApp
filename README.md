# WebApp
Budget Web App - A modern full-stack application built with Go and React/TypeScript.

## Quick Start

### Development
```bash
# Start all services (SQLite + hot reloading)
docker compose up

# With development tools (SQLite admin)
docker compose --profile tools up

# Or run manually
./scripts/dev.sh    # Start Go API
cd web && npm run dev  # Start React frontend

# Using Makefile
make dev              # Start both API and frontend
make docker-dev       # Start with Docker + tools
```

### Production
Production deployments use **Kubernetes with Helm charts**. 

For local production testing, use the development setup with appropriate environment variables.

### Build
```bash
./scripts/build.sh
# OR
make build
```

### Test
```bash
./scripts/test.sh  
# OR
make test
```

## Architecture

This application follows Clean Architecture principles with a clear separation of concerns:

- **Backend**: Go with Chi router, following standard project layout
- **Frontend**: React/TypeScript with Vite and Bootstrap
- **Database**: SQLite (development) / MySQL (production via Kubernetes)
- **Development**: Docker Compose for local development
- **Production**: Kubernetes with Helm charts

## Documentation

- [Development Guide](docs/DEVELOPMENT.md) - Local development setup and workflows  
- [Project Layout](docs/PROJECT_LAYOUT.md) - Detailed architecture and structure
- [API Documentation](docs/swagger.yaml) - OpenAPI specification
- [Security](docs/SECURITY.md) - Security considerations
- [Cleanup Summary](docs/CLEANUP_SUMMARY.md) - Recent Docker cleanup changes
- [TODO](docs/TODO.md) - Development roadmap

A modern full-stack web app for tracking monthly budget, salary, and expenses. The codebase is split into two components:

- **Backend API** (Go): `cmd/webapp`, `internal/*`
- **Frontend UI** (React+TS+Vite): `web/`

**Technology Stack:**
- Backend: Go (chi HTTP, SQLite via modernc), structured per Go Project Layout
- Frontend: React + TypeScript + Vite + Bootstrap  
- Development: Docker Compose with SQLite
- Production: Kubernetes with MySQL

This project is designed for personal use and small datasets, with a clean separation of layers to allow future scaling.

## Features
- Record monthly salary and budget targets
- Add, list, and delete expenses by month
- Monthly summary (salary, budget, expenses, remaining)
- User authentication and session management
- Named income sources and budget categories
- Comprehensive monthly data aggregation
- Interactive API documentation with SwaggerUI
- OpenAPI-like JSON responses
- Optional API key header for simple protection

## Project Layout
- `cmd/webapp`: Application entrypoint
- `internal/config`: Configuration loading
- `internal/platform/database`: DB connection and schema
- `internal/domain`: Types/models and business logic
- `internal/repository`: Data access layer
- `internal/service`: Business logic layer
- `internal/handler`: HTTP router and handlers
- `internal/middleware`: Security middleware
- `web/`: Vite React + TypeScript frontend
- `configs/`: Environment configuration examples
- `docs/`: Documentation and API specifications

**Reference**: https://github.com/golang-standards/project-layout

## Quick start

### Backend
1. Ensure Go 1.21+ is installed.
2. Build and run the server:

```bash
# in project root
go mod tidy
go run ./cmd/webapp
```

Server listens on 127.0.0.1:8082 by default and creates a local DB at data/app.db (when DB_DRIVER=sqlite).

### Frontend
1. Ensure Node.js 18+ and pnpm/npm are installed.
2. Install deps and start dev server:

```bash
cd web
npm install
npm run dev
```

Frontend runs on http://localhost:5173 and calls the backend at http://127.0.0.1:8082.

## API Documentation

Interactive API documentation is available via SwaggerUI:
- **Local Development**: http://localhost:8082/api/ or http://localhost:5173/api/
- **Production**: http://instance-agent.subnet05071228.vcn05071228.oraclevcn.com:5173/api/

The documentation includes all endpoints, request/response schemas, and interactive testing capabilities.

## API overview

### Interactive Documentation
- **SwaggerUI**: http://localhost:8082/swagger/ (interactive API explorer)
- **OpenAPI Spec**: http://localhost:8082/docs/swagger.yaml
- **Via Frontend**: Click "📚 API Docs" button when logged in

### Core Endpoints
**Authentication:**
- POST /auth/login - User authentication
- POST /auth/logout - Session termination  
- POST /auth/register - User registration

**Financial Data:**
- GET /api/v1/monthly-data?year=YYYY&month=MM - Comprehensive monthly data
- GET /api/v1/income-sources?year=YYYY&month=MM - List income sources
- POST /api/v1/income-sources - Create income source
- GET /api/v1/budget-sources?year=YYYY&month=MM - List budget categories
- POST /api/v1/budget-sources - Create budget category
- GET /api/v1/expenses?year=YYYY&month=MM - List expenses
- POST /api/v1/expenses - Create expense

**Legacy Endpoints:**
- GET /api/v1/summary?year=YYYY&month=MM
- POST /api/v1/salary { year, month, amount_cents }
- POST /api/v1/budget { year, month, amount_cents }
- DELETE /api/v1/expenses/{id}

**Health:**
- GET /healthz

### Authentication
1. **API Key**: Include header `X-API-Key: your-secret-api-key` for all `/api/v1` endpoints
2. **Session Token**: Include header `Authorization: Bearer {session_id}` (from login response)

### Data Format
- Monetary amounts in **cents** (e.g., 150000 = $1,500.00)
- Dates in ISO 8601 format
- Complete API documentation available at `/swagger/`

## Run both components together

### Option A: Docker Compose (Recommended - Secure Isolated Setup)

The Docker Compose setup provides a secure, isolated development environment where:
- API is isolated within Docker network (not accessible from host machine)
- Frontend acts as proxy to access API endpoints
- Only frontend port (5173) is exposed to host

```bash
docker compose up --build
# Frontend: http://localhost:5173 (includes API proxy)
# API: Isolated within Docker network (secure)
# DB: SQLite within API container

# With development tools
docker compose --profile tools up --build
# Adds: SQLite Admin on http://localhost:8080
```

### Option B: Local Development (Direct Access)

For local development outside Docker:

1. **Backend**: Copy `configs/.env.local` to project root as `.env`
2. **Start API**: `go run ./cmd/webapp` (will bind to 127.0.0.1:8082)
3. **Start Frontend**: `cd web && npm install && npm run dev`

### Option C: Makefile (Recommended)

```bash
# Local development (no Docker)
make dev              # Start API + frontend locally
make dev-logs         # View logs (Ctrl+C to stop)
make dev-stop         # Stop both services

# Docker development  
make docker-dev       # Start with Docker + tools
make docker-stop      # Stop Docker services
```

## Security

### Development Environment Isolation

The Docker Compose setup implements security best practices:

- **API Isolation**: API service is not exposed to host machine (no external port mapping)
- **Network Segmentation**: API only accessible within Docker internal network
- **Proxy Pattern**: Frontend serves as secure proxy for API access
- **CORS Protection**: Configured allowed origins for cross-origin requests
- **Principle of Least Privilege**: Only necessary ports exposed

### Port Exposure
- **Exposed**: Frontend (5173) - User interface and API proxy
- **Isolated**: API (8082) - Only accessible within Docker network
- **Protected**: Database - SQLite file within API container
- **Development Tools**: SQLite Admin (8080) - When using `--profile tools`

### Configuration Files
Environment variables (see configs/ directory):
- `configs/.env.docker`: Docker Compose setup (isolated API)
- `configs/.env.local`: Local development setup (direct API access)
- `configs/.env.example`: Template configuration

### Environment Variables
- HTTP_ADDRESS: default 127.0.0.1:8082 (local) or 0.0.0.0:8082 (Docker)
- DB_PATH: default data/app.db
- CORS_ALLOWED_ORIGINS: default http://localhost:5173
- API_KEY: optional (if set, required by API)
- ENV: dev|prod, default dev

## Security notes
See docs/SECURITY.md for a list of common pitfalls and mitigations relevant to this app.

## Tests
Run unit tests:

```bash
go test ./...
```

## License
Personal use. Adapt as needed.
