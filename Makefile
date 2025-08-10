SHELL := /bin/bash
GO ?= go
GOTOOLCHAIN ?= go1.24.5
BIN_DIR := bin
BIN := $(BIN_DIR)/webapp
PORT ?= 8082
PORT_WEB ?= 5173
DEV_DIR := .dev

.PHONY: all tidy build run stop free-port test fmt vet clean web-setup web-dev web-build health dev dev-stop dev-logs \
	lint lint-install lint-fix format format-check check-all lint-web format-web lint-verify lint-linters \
	docker-dev docker-dev-detached docker-stop

all: build

# Show available commands
help:
	@echo "WebApp Makefile Commands"
	@echo ""
	@echo "🏗️  Building:"
	@echo "  build                Build Go binary"
	@echo "  tidy                 Sync Go module dependencies"
	@echo ""
	@echo "🚀 Running:"
	@echo "  run                  Run Go API server (PORT=$(PORT))"
	@echo "  dev                  Run API + frontend locally"
	@echo "  docker-dev           Run with Docker + tools"
	@echo "  docker-dev-detached  Run Docker in background"
	@echo ""
	@echo "🐳 Docker:"
	@echo "  docker-stop          Stop Docker services"
	@echo ""
	@echo "📊 Development:"
	@echo "  dev-logs             View dev logs"
	@echo "  dev-stop             Stop local dev services"
	@echo "  health               Test API health endpoint"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  test                 Run Go unit tests"
	@echo "  check-all            Run format check + lint + tests"
	@echo ""
	@echo "✨ Code Quality:"
	@echo "  format               Format Go code (goimports)"
	@echo "  format-check         Check Go formatting"
	@echo "  lint                 Run Go linting (golangci-lint)"
	@echo "  lint-install         Install linting tools"
	@echo "  lint-fix             Auto-fix linting issues"
	@echo ""
	@echo "🎨 Frontend:"
	@echo "  web-setup            Install frontend dependencies"
	@echo "  web-dev              Run frontend dev server"
	@echo "  web-build            Build frontend for production"
	@echo "  lint-web             Lint frontend code"
	@echo "  format-web           Format frontend code"
	@echo ""
	@echo "🧹 Cleanup:"
	@echo "  clean                Remove build artifacts"
	@echo "  stop                 Stop any running server"
	@echo "  free-port            Kill processes using PORT=$(PORT)"
	@echo ""
	@echo "Environment Variables:"
	@echo "  PORT=$(PORT)         API server port"
	@echo "  PORT_WEB=$(PORT_WEB) Frontend dev server port"

# Sync dependencies
tidy:
	$(GO) mod tidy

# Build backend server
build:
	@mkdir -p $(BIN_DIR)
	GOTOOLCHAIN=$(GOTOOLCHAIN) $(GO) build -o $(BIN) ./cmd/webapp

# Run backend server (foreground). Override with: make run PORT=8081
run: free-port
	@echo "Starting server on 127.0.0.1:$(PORT)"
	HTTP_ADDRESS=127.0.0.1:$(PORT) GOTOOLCHAIN=$(GOTOOLCHAIN) $(GO) run ./cmd/webapp

# Stop any running server (best-effort)
stop:
	@echo "Stopping server on port $(PORT) (if any)"
	@if command -v lsof >/dev/null; then \
		PIDS=$$(lsof -t -iTCP:$(PORT) -sTCP:LISTEN 2>/dev/null || true); \
		if [ -n "$$PIDS" ]; then echo "Killing: $$PIDS"; kill $$PIDS || true; fi; \
	elif command -v fuser >/dev/null; then \
		fuser -k -n tcp $(PORT) || true; \
	else \
		echo "No lsof/fuser to stop server."; \
	fi

# Ensure the port is available; if something is listening, attempt to kill it.
free-port:
	@echo "Checking and freeing port $(PORT) if busy..."
	@# Detect a listener
	@if ss -ltnp 2>/dev/null | grep -w ":$(PORT)" >/dev/null; then \
		echo "Port $(PORT) is busy. Attempting to kill listener..."; \
		if command -v lsof >/dev/null; then \
			PIDS=$$(lsof -t -iTCP:$(PORT) -sTCP:LISTEN 2>/dev/null || true); \
			if [ -n "$$PIDS" ]; then echo "Killing: $$PIDS"; kill $$PIDS || true; fi; \
		elif command -v fuser >/dev/null; then \
			fuser -k -n tcp $(PORT) || true; \
		else \
			echo "Neither lsof nor fuser available; cannot auto-free port."; \
		fi; \
		sleep 1; \
	fi
	@# Verify now free
	@if ss -ltnp 2>/dev/null | grep -w ":$(PORT)" >/dev/null; then \
		echo "Port $(PORT) still busy. Aborting."; \
		exit 2; \
	else \
		echo "Port $(PORT) is free."; \
	fi

# Unit tests
test:
	GOTOOLCHAIN=$(GOTOOLCHAIN) $(GO) test ./...

# Basic Go formatting (legacy - use 'format' target instead)
fmt:
	$(GO) fmt ./...

# Legacy vet target (may have compatibility issues)
vet:
	$(GO) vet ./...

# Install linting tools (if not present)
lint-install:
	@echo "Installing Go linting tools..."
	@echo "Ensuring Go toolchain $(GOTOOLCHAIN) is available..."
	@GOTOOLCHAIN=$(GOTOOLCHAIN) $(GO) toolchain download $(GOTOOLCHAIN) >/dev/null 2>&1 || true
	@if ! command -v goimports >/dev/null 2>&1; then \
		echo "Installing goimports..."; \
		$(GO) install golang.org/x/tools/cmd/goimports@latest; \
	fi
	@if ! command -v golangci-lint >/dev/null 2>&1; then \
		echo "Installing golangci-lint..."; \
		curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/HEAD/install.sh | sh -s -- -b $$(go env GOPATH)/bin v2.3.1; \
	fi
	@echo "Go linting tools installed"

# Run comprehensive Go linting (using golangci-lint minimal + goimports)
lint: lint-install format-check
	@echo "Running Go linting with working configuration..."
	@echo "✓ Code formatting and import management verified (goimports)"
	@echo ""
	@export PATH=$$PATH:$$(go env GOPATH)/bin && GOTOOLCHAIN=$(GOTOOLCHAIN) golangci-lint run --timeout=4m
	@echo ""
	@echo "golangci-lint checks completed (core set):"
	@echo "  ✓ govet, staticcheck (type-aware analysis)"
	@echo "  ✓ errcheck, ineffassign, unused (robustness)"
	@echo "  ✓ revive, misspell (style & spelling)"
	@echo ""
	@echo "Formatters available via golangci-lint: goimports, gofmt, gofumpt, gci, golines"
	@echo ""
	@echo "Go linting completed successfully"

# Verify golangci-lint configuration (which file is used, schema validity) and print version
lint-verify:
	@which golangci-lint >/dev/null 2>&1 || { echo "golangci-lint not installed; run 'make lint-install'"; exit 1; }
	@echo "golangci-lint version:" && golangci-lint --version
	@echo "Verifying configuration file..." && GOTOOLCHAIN=$(GOTOOLCHAIN) golangci-lint config verify -v || true

# List enabled/disabled linters according to current configuration
lint-linters:
	@which golangci-lint >/dev/null 2>&1 || { echo "golangci-lint not installed; run 'make lint-install'"; exit 1; }
	@GOTOOLCHAIN=$(GOTOOLCHAIN) golangci-lint linters

# Run linting with automatic fixes where possible
lint-fix: lint-install
	@echo "Auto-fixing Go code issues with golangci-lint and goimports..."
	@$(MAKE) format
	@export PATH=$$PATH:$$(go env GOPATH)/bin && GOTOOLCHAIN=$(GOTOOLCHAIN) golangci-lint run --fix --timeout=4m
	@echo "✓ Auto-fix completed: formatting + import management + spelling fixes"

# Format Go code with goimports (comprehensive formatting + import management)
format:
	@echo "Formatting Go code with goimports (replaces gofmt + manages imports)..."
	@if command -v goimports >/dev/null 2>&1; then \
		echo "Using goimports: adds missing imports, removes unused ones, sorts alphabetically"; \
		goimports -w .; \
	else \
		echo "Installing goimports..."; \
		$(GO) install golang.org/x/tools/cmd/goimports@latest; \
		echo "Running goimports: comprehensive formatting + import management"; \
		goimports -w .; \
	fi
	@echo "✓ Go code formatted and imports organized"

# Check if code is properly formatted with goimports standards
format-check:
	@echo "Checking Go code formatting with goimports standards..."
	@if command -v goimports >/dev/null 2>&1; then \
		DIFF_OUTPUT=$$(goimports -l .); \
		if [ -n "$$DIFF_OUTPUT" ]; then \
			echo "The following files are not properly formatted or have import issues:"; \
			echo "$$DIFF_OUTPUT"; \
			echo ""; \
			echo "Run 'make format' to fix these issues automatically."; \
			echo "goimports will:"; \
			echo "  - Format code (replaces gofmt)"; \
			echo "  - Add missing imports"; \
			echo "  - Remove unused imports"; \
			echo "  - Sort imports alphabetically"; \
			exit 1; \
		fi; \
	else \
		echo "goimports not found, falling back to gofmt check..."; \
		if [ -n "$$(gofmt -l .)" ]; then \
			echo "Files need formatting - install goimports for full import management:"; \
			echo "  go install golang.org/x/tools/cmd/goimports@latest"; \
			gofmt -l .; \
			exit 1; \
		fi; \
	fi
	@echo "✓ All Go files are properly formatted and imports are organized"

# Run all Go quality checks (format, static analysis, security, test)
check-all: format-check lint test
	@echo "All Go quality checks completed!"

# Frontend linting
lint-web:
	cd web && npm run lint

# Frontend formatting
format-web:
	cd web && npm run format

clean:
	rm -rf $(BIN_DIR) data/app.db

# Frontend tasks
web-setup:
	cd web && npm install

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm run build

# Quick health probe (requires server running with matching PORT)
health:
	curl -sf http://127.0.0.1:$(PORT)/healthz | cat

# Run both backend and frontend for local development integration
dev:
	@mkdir -p $(DEV_DIR)
	@echo "Stopping any existing processes..."
	@$(MAKE) dev-stop >/dev/null 2>&1 || true
	@pkill -f "vite" || true
	@sleep 2
	@$(MAKE) free-port >/dev/null 2>&1 || true
	@echo "Starting API on 127.0.0.1:$(PORT)"
	@HTTP_ADDRESS=127.0.0.1:$(PORT) GOTOOLCHAIN=$(GOTOOLCHAIN) $(GO) run ./cmd/webapp > $(DEV_DIR)/api.log 2>&1 & echo $$! > $(DEV_DIR)/api.pid
	@sleep 3
	@echo "Starting Web on http://localhost:$(PORT_WEB) (proxy -> API)"
	@cd web && npm install --silent >/dev/null 2>&1 && npm run dev -- --host 127.0.0.1 --port $(PORT_WEB) > ../$(DEV_DIR)/web.log 2>&1 & echo $$! > ../$(DEV_DIR)/web.pid
	@sleep 2
	@echo "Services started:"
	@echo "  API: http://127.0.0.1:$(PORT) (PID: $$(cat $(DEV_DIR)/api.pid 2>/dev/null || echo 'unknown'))"
	@echo "  Web: http://localhost:$(PORT_WEB) (PID: $$(cat $(DEV_DIR)/web.pid 2>/dev/null || echo 'unknown'))"
	@echo "  Logs: make dev-logs"
	@echo "  Stop: make dev-stop"
	@echo "  Docker Dev: ./scripts/docker.sh up --tools"

# Docker development environment
docker-dev:
	@echo "Starting Docker development environment..."
	@./scripts/docker.sh up --tools

docker-dev-detached:
	@echo "Starting Docker development environment in background..."
	@./scripts/docker.sh up --detach --tools

docker-stop:
	@echo "Stopping Docker development environment..."
	@./scripts/docker.sh down

dev-stop:
	@echo "Stopping dev processes..."
	@test -f $(DEV_DIR)/web.pid && kill $$(cat $(DEV_DIR)/web.pid) 2>/dev/null || true
	@test -f $(DEV_DIR)/api.pid && kill $$(cat $(DEV_DIR)/api.pid) 2>/dev/null || true
	@pkill -f "vite" || true
	@pkill -f "go run ./cmd/webapp" || true
	@sleep 2
	@rm -f $(DEV_DIR)/api.pid $(DEV_DIR)/web.pid
	@$(MAKE) stop >/dev/null 2>&1 || true
	@echo "All dev processes stopped."

dev-logs:
	@echo "Tailing logs (Ctrl+C to stop)"
	@tail -n +1 -f $(DEV_DIR)/api.log $(DEV_DIR)/web.log
