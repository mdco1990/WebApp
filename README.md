# WebApp – Personal Budget Tracker

A modern micro-service-style full-stack web app for tracking monthly budget, salary, and expenses.

- Backend: Go (chi HTTP, SQLite via modernc), structured per Go Project Layout
- Frontend: React + TypeScript + Vite + Bootstrap
- Storage: Local SQLite DB (embedded, pure Go driver)

This project is designed for personal use and small datasets, with a clean separation of layers to allow future extraction into separate services.

## Features
- Record monthly salary and budget targets
- Add, list, and delete expenses by month
- Monthly summary (salary, budget, expenses, remaining)
- OpenAPI-like JSON responses
- Optional API key header for simple protection

## Project Layout
- cmd/server: entrypoint
- internal/config: configuration loading
- internal/db: DB connection and schema
- internal/domain: types/models
- internal/repository: data access
- internal/service: business logic
- internal/transport/http: HTTP router and handlers
- internal/middleware: security middleware
- web: Vite React + TypeScript frontend
- configs: environment examples
- docs: security notes

Refer: https://github.com/golang-standards/project-layout

## Quick start

### Backend
1. Ensure Go 1.21+ is installed.
2. Build and run the server:

```bash
# in project root
go mod tidy
go run ./cmd/server
```

Server listens on 127.0.0.1:8080 by default and creates a local DB at data/app.db.

### Frontend
1. Ensure Node.js 18+ and pnpm/npm are installed.
2. Install deps and start dev server:

```bash
cd web
npm install
npm run dev
```

Frontend runs on http://localhost:5173 and calls the backend at http://127.0.0.1:8080.

## API overview
- GET /healthz
- GET /api/v1/summary?year=YYYY&month=MM
- POST /api/v1/salary { year, month, amount }
- POST /api/v1/budget { year, month, amount }
- GET /api/v1/expenses?year=YYYY&month=MM
- POST /api/v1/expenses { year, month, category?, description, amount }
- DELETE /api/v1/expenses/{id}

If API key is configured, include header: X-API-Key: <key>

## Configuration
Environment variables (see configs/.env.example):
- HTTP_ADDRESS: default 127.0.0.1:8080
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
