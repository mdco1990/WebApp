package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/personal/webapp/internal/config"
	"github.com/personal/webapp/internal/db"
	httpapi "github.com/personal/webapp/internal/transport/http"
)

func main() {
	// Load config
	cfg := config.Load()

	// Ensure data dir exists for sqlite
	if cfg.DBDriver == "sqlite" {
		if err := os.MkdirAll("data", 0o700); err != nil {
			log.Fatalf("failed to create data dir: %v", err)
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
				log.Fatalf("db open (mysql) timeout: %v", err)
			}
			log.Printf("db open failed (mysql): %v; retrying in %s", err, backoff)
			time.Sleep(backoff)
			if backoff < 5*time.Second {
				backoff += time.Second
			}
		}
	} else {
		dbConn, err = db.Open(cfg.DBDriver, cfg.DBPath, cfg.DBDSN)
		if err != nil {
			log.Fatalf("db open: %v", err)
		}
	}
	defer dbConn.Close()
	// Only run SQLite embedded migrations automatically.
	if cfg.DBDriver == "sqlite" {
		if err := db.Migrate(dbConn); err != nil {
			log.Fatalf("db migrate: %v", err)
		}
	}

	// Build HTTP server
	r := httpapi.NewRouter(cfg, dbConn)
	srv := &http.Server{
		Addr:    cfg.HTTPAddress,
		Handler: r,
	}

	go func() {
		log.Printf("server: starting addr=%s env=%s db_driver=%s", cfg.HTTPAddress, cfg.Env, cfg.DBDriver)
		start := time.Now()
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: listen error err=%v", err)
		}
		log.Printf("server: stopped uptime=%s", time.Since(start).String())
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Println("server: shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), config.ShutdownTimeout)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
