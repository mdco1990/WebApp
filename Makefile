SHELL := /bin/bash
GO ?= go
GOTOOLCHAIN ?= go1.22.6
BIN_DIR := bin
BIN := $(BIN_DIR)/server
PORT ?= 8082
PORT_WEB ?= 5173
DEV_DIR := .dev

.PHONY: all tidy build run stop free-port test fmt vet clean web-setup web-dev web-build health dev dev-stop dev-logs

all: build

# Sync dependencies
tidy:
	$(GO) mod tidy

# Build backend server
build:
	@mkdir -p $(BIN_DIR)
	GOTOOLCHAIN=$(GOTOOLCHAIN) $(GO) build -o $(BIN) ./cmd/server

# Run backend server (foreground). Override with: make run PORT=8081
run: free-port
	@echo "Starting server on 127.0.0.1:$(PORT)"
	HTTP_ADDRESS=127.0.0.1:$(PORT) GOTOOLCHAIN=$(GOTOOLCHAIN) $(GO) run ./cmd/server

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

fmt:
	$(GO) fmt ./...

vet:
	$(GO) vet ./...

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

# Run both backend and frontend for integration testing
dev:
	@mkdir -p $(DEV_DIR)
	@echo "Stopping any existing processes..."
	@$(MAKE) dev-stop >/dev/null 2>&1 || true
	@pkill -f "vite" || true
	@sleep 2
	@$(MAKE) free-port >/dev/null 2>&1 || true
	@echo "Starting API on 127.0.0.1:$(PORT)"
	@HTTP_ADDRESS=127.0.0.1:$(PORT) GOTOOLCHAIN=$(GOTOOLCHAIN) $(GO) run ./cmd/server > $(DEV_DIR)/api.log 2>&1 & echo $$! > $(DEV_DIR)/api.pid
	@sleep 3
	@echo "Starting Web on http://localhost:$(PORT_WEB) (proxy -> API)"
	@cd web && npm install --silent >/dev/null 2>&1 && npm run dev -- --host 127.0.0.1 --port $(PORT_WEB) > ../$(DEV_DIR)/web.log 2>&1 & echo $$! > ../$(DEV_DIR)/web.pid
	@sleep 2
	@echo "Services started:"
	@echo "  API: http://127.0.0.1:$(PORT) (PID: $$(cat $(DEV_DIR)/api.pid 2>/dev/null || echo 'unknown'))"
	@echo "  Web: http://localhost:$(PORT_WEB) (PID: $$(cat $(DEV_DIR)/web.pid 2>/dev/null || echo 'unknown'))"
	@echo "  Logs: make dev-logs"
	@echo "  Stop: make dev-stop"

dev-stop:
	@echo "Stopping dev processes..."
	@test -f $(DEV_DIR)/web.pid && kill $$(cat $(DEV_DIR)/web.pid) 2>/dev/null || true
	@test -f $(DEV_DIR)/api.pid && kill $$(cat $(DEV_DIR)/api.pid) 2>/dev/null || true
	@pkill -f "vite" || true
	@pkill -f "go run ./cmd/server" || true
	@sleep 2
	@rm -f $(DEV_DIR)/api.pid $(DEV_DIR)/web.pid
	@$(MAKE) stop >/dev/null 2>&1 || true
	@echo "All dev processes stopped."

dev-logs:
	@echo "Tailing logs (Ctrl+C to stop)"
	@tail -n +1 -f $(DEV_DIR)/api.log $(DEV_DIR)/web.log
