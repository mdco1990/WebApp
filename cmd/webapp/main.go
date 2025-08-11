// Package main is the application entry point for the webapp API server.
package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mdco1990/webapp/internal/config"
	"github.com/mdco1990/webapp/internal/db"
	obslog "github.com/mdco1990/webapp/internal/observability/log"
	httpapi "github.com/mdco1990/webapp/internal/transport/http"
)

func main() {
	// Load config and setup logging
	cfg := config.Load()
	obslog.Setup(cfg.LogLevel, cfg.LogFormat)

	// Prepare filesystem and database
	ensureDataDir(cfg.DBDriver)
	dbConn := openDBWithRetry(cfg.DBDriver, cfg.DBPath, cfg.DBDSN)
	defer func() { _ = dbConn.Close() }()
	if err := migrateIfSQLite(cfg.DBDriver, dbConn); err != nil {
		slog.Error("db migrate failed", "err", err)
		os.Exit(1)
	}

	// HTTP server
	r := httpapi.NewRouter(cfg, dbConn)
	srv := newHTTPServer(cfg, r)
	runServerAsync(srv, cfg.HTTPAddress, cfg.Env, cfg.DBDriver)

	// Graceful shutdown
	waitForShutdown(srv, config.ShutdownTimeout)
}

// ensureDataDir creates the sqlite data directory when needed.
func ensureDataDir(driver string) {
	if driver != "sqlite" {
		return
	}
	if err := os.MkdirAll("data", 0o700); err != nil {
		slog.Error("failed to create data dir", "err", err)
		os.Exit(1)
	}
}

// openDBWithRetry opens the database and retries with backoff for MySQL.
func openDBWithRetry(driver, path, dsn string) *sql.DB {
	if driver != "mysql" {
		dbConn, err := db.Open(driver, path, dsn)
		if err != nil {
			slog.Error("db open failed", "err", err)
			os.Exit(1)
		}
		return dbConn
	}
	var (
		dbConn   *sql.DB
		err      error
		backoff  = time.Second
		deadline = time.Now().Add(90 * time.Second)
	)
	for {
		dbConn, err = db.Open(driver, path, dsn)
		if err == nil {
			return dbConn
		}
		if time.Now().After(deadline) {
			slog.Error("db open (mysql) timeout", "err", err)
			os.Exit(1)
		}
		slog.Warn("db open failed (mysql), retrying", "err", err, "backoff", backoff.String())
		time.Sleep(backoff)
		if backoff < 5*time.Second {
			backoff += time.Second
		}
	}
}

// migrateIfSQLite runs embedded migrations automatically for sqlite.
func migrateIfSQLite(driver string, dbConn *sql.DB) error {
	if driver != "sqlite" {
		return nil
	}
	return db.Migrate(dbConn)
}

// newHTTPServer constructs an http.Server from config.
func newHTTPServer(cfg config.Config, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              cfg.HTTPAddress,
		Handler:           handler,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}
}

// runServerAsync starts the HTTP server in a goroutine and logs lifecycle events.
func runServerAsync(srv *http.Server, addr, env, dbDriver string) {
	go func() {
		slog.Info("server starting", "addr", addr, "env", env, "db_driver", dbDriver)
		start := time.Now()
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server listen error", "err", err)
			os.Exit(1)
		}
		slog.Info("server stopped", "uptime", time.Since(start).String())
	}()
}

// waitForShutdown blocks until a termination signal then gracefully shuts the server down.
func waitForShutdown(srv *http.Server, timeout time.Duration) {
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	slog.Info("server shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
