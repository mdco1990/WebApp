# WebApp
WebApp - A modern full-stack budget tracking application built with Go and React/TypeScript.

## Quick Start

### Development
```bash
# Docker Compose (Recommended)
./scripts/docker.sh up --tools      # Start with SQLite admin
./scripts/docker.sh up --detach     # Start in background
make docker-dev                     # Alternative using Makefile

# Local Development
make dev                            # Start API + frontend locally
make dev-logs                       # View development logs  
make dev-stop                       # Stop development services

# Manual Setup
./scripts/dev.sh                    # Start Go API only
cd web && npm run dev               # Start React frontend only
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
# Backend Tests
make test                           # Go unit tests
make check-all                     # Format check + lint + tests

# Frontend Tests  
cd web && npm test                  # Jest unit tests
cd web && npm run test:coverage    # With coverage report

# All Tests
./scripts/test.sh                   # Run full test suite
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
- [Security](docs/SECURITY.md) - Security considerations
- [Cleanup Summary](docs/CLEANUP_SUMMARY.md) - Recent Docker cleanup changes
- [TODO](docs/TODO.md) - Development roadmap

- **Frontend UI** (React+TS+Vite): `web/`

**Technology Stack:**
- Backend: Go (chi HTTP, SQLite via modernc), structured per Go Project Layout
- Frontend: React + TypeScript + Vite + Bootstrap  
- Development: Docker Compose with SQLite
- Production: Kubernetes with MySQL

This project is designed for personal use and small datasets, with a clean separation of layers to allow future scaling.

## Features

### 💰 Budget Management
- Monthly salary and budget target tracking
- Income sources and budget categories management
- Comprehensive expense tracking with categorization
- Manual budget planning with bank deductions
- Monthly financial summaries and analytics

### 👥 User Management
- User authentication and session management
- Role-based access control (admin/user)
- User registration and approval workflows
- Password management and security

### 📊 Analytics & Reporting
- Interactive charts and visualizations
- Monthly data aggregation and insights
- Export capabilities and data persistence
- Real-time budget vs. actual tracking

### 🛠️ Technical Features
- Interactive API documentation (SwaggerUI, Scalar, ReDoc)
- Internationalization (English/French)
- Modern responsive UI with Bootstrap
- RESTful API with OpenAPI specification
- Database administration interface
- Comprehensive logging and observability

## Project Layout
- `cmd/webapp`: Application entrypoint
- `internal/config`: Configuration loading
- `internal/db`: Database connection and schema
- `internal/domain`: Types/models and business logic
- `internal/repository`: Data access layer
- `internal/service`: Business logic layer
- `internal/transport/http`: HTTP router and handlers
- `internal/middleware`: Security middleware
- `web/`: Vite React + TypeScript frontend
- `deployments/`: Docker and deployment configurations
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

Interactive API documentation is available via SwaggerUI (admin-only route):
- Admin only: http://localhost:8082/api/ (backend) or http://localhost:5173/api/ (frontend proxy)
- You must be authenticated as an admin user to access the Swagger UI.
- The OpenAPI spec is served publicly at: http://localhost:8082/docs/swagger.yaml

The documentation includes all endpoints, request/response schemas, and interactive testing capabilities.

## API overview

### Interactive Documentation
- SwaggerUI (admin-only): http://localhost:8082/api/
- OpenAPI Spec: http://localhost:8082/docs/swagger.yaml
- Via Frontend: Click "📚 API Docs" when logged in as admin

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
Environment variables and configuration:
- `.env.dev`: Development environment variables
- `deployments/docker-compose.yml`: Docker Compose configuration
- `deployments/nginx.conf`: Nginx reverse proxy configuration
- `web/vite.config.ts`: Frontend build configuration

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
