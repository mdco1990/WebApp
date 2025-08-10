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

	"github.com/personal/webapp/internal/config"
	"github.com/personal/webapp/internal/db"
	obslog "github.com/personal/webapp/internal/observability/log"
	httpapi "github.com/personal/webapp/internal/transport/http"
)

func main() {
	// Load config
	cfg := config.Load()
	// Setup logging
	obslog.Setup(cfg.LogLevel, cfg.LogFormat)

	// Ensure data dir exists for sqlite
	if cfg.DBDriver == "sqlite" {
		if err := os.MkdirAll("data", 0o700); err != nil {
			slog.Error("failed to create data dir", "err", err)
			os.Exit(1)
		}
	}

	// Open DB with retries for external drivers (e.g., MySQL)
	var (
		dbConn *sql.DB
		err    error
	)
	if cfg.DBDriver == "mysql" {
		backoff := time.Second
		deadline := time.Now().Add(90 * time.Second)
		for {
			dbConn, err = db.Open(cfg.DBDriver, cfg.DBPath, cfg.DBDSN)
			if err == nil {
				break
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
	} else {
		dbConn, err = db.Open(cfg.DBDriver, cfg.DBPath, cfg.DBDSN)
		if err != nil {
			slog.Error("db open failed", "err", err)
			os.Exit(1)
		}
	}
	defer dbConn.Close()
	// Only run SQLite embedded migrations automatically.
	if cfg.DBDriver == "sqlite" {
		if err := db.Migrate(dbConn); err != nil {
			slog.Error("db migrate failed", "err", err)
			os.Exit(1)
		}
	}

	// Build HTTP server
	r := httpapi.NewRouter(cfg, dbConn)
	srv := &http.Server{
		Addr:    cfg.HTTPAddress,
		Handler: r,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	go func() {
		slog.Info("server starting", "addr", cfg.HTTPAddress, "env", cfg.Env, "db_driver", cfg.DBDriver)
		start := time.Now()
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server listen error", "err", err)
			os.Exit(1)
		}
		slog.Info("server stopped", "uptime", time.Since(start).String())
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	slog.Info("server shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), config.ShutdownTimeout)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
