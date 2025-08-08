package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/personal/webapp/internal/config"
	"github.com/personal/webapp/internal/db"
	httpapi "github.com/personal/webapp/internal/transport/http"
)

func main() {
	// Load config
	cfg := config.Load()

	// Ensure data dir exists
	if err := os.MkdirAll("data", 0o700); err != nil {
		log.Fatalf("failed to create data dir: %v", err)
	}

	// Open DB and run migrations
	dbConn, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer dbConn.Close()
	if err := db.Migrate(dbConn); err != nil {
		log.Fatalf("db migrate: %v", err)
	}

	// Build HTTP server
	r := httpapi.NewRouter(cfg, dbConn)
	srv := &http.Server{
		Addr:    cfg.HTTPAddress,
		Handler: r,
	}

	go func() {
		log.Printf("server listening on http://%s", cfg.HTTPAddress)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), config.ShutdownTimeout)
	defer cancel()
	_ = srv.Shutdown(ctx)
}
