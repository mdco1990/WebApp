// Package db provides database connectivity and schema migration helpers.
package db

import (
	"database/sql"
	"embed"
	"fmt"
	"log"

	// sqlite driver is required at runtime when DBDriver=sqlite; imported for side effects.
	_ "github.com/glebarez/sqlite"
)

//go:embed schema.sql
var schemaFS embed.FS

// Open opens a SQLite database at the specified path.
func Open(driver string, path string, dsn string) (*sql.DB, error) {
	if driver != "sqlite" {
		return nil, fmt.Errorf("unsupported driver: %s, only sqlite is supported", driver)
	}

	dsnSqlite := fmt.Sprintf("file:%s?_pragma=busy_timeout=5000&_fk=1", path)
	db, err := sql.Open("sqlite", dsnSqlite)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	log.Printf("db: connected using sqlite driver at %s", path)
	return db, nil
}

// Migrate executes the embedded schema.
func Migrate(db *sql.DB) error {
	b, err := schemaFS.ReadFile("schema.sql")
	if err != nil {
		return err
	}
	if _, err = db.Exec(string(b)); err != nil {
		return err
	}
	// Post-migration: ensure is_admin column exists for users (for older DBs)
	// SQLite only: add column if missing, then set admin flag if possible.
	var exists int
	if err := db.QueryRow(`SELECT COUNT(1) FROM pragma_table_info('users') WHERE name='is_admin'`).Scan(&exists); err == nil {
		if exists == 0 {
			if _, err := db.Exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0`); err == nil {
				log.Printf("db: added is_admin column to users")
				// Now that column exists, promote 'admin'
				_, _ = db.Exec(`UPDATE users SET is_admin = 1 WHERE username = 'admin'`)
			} else {
				log.Printf("db: failed to add is_admin column: %v", err)
			}
		} else {
			// Column exists; ensure admin is promoted
			_, _ = db.Exec(`UPDATE users SET is_admin = 1 WHERE username = 'admin'`)
		}
	}
	return nil
}
