package db

import (
	"database/sql"
	"embed"
	"fmt"
	"log"

	_ "github.com/glebarez/sqlite"
	_ "github.com/go-sql-driver/mysql"
)

//go:embed schema.sql
var schemaFS embed.FS

// Open opens a database based on driver and DSN or sqlite path.
func Open(driver string, path string, dsn string) (*sql.DB, error) {
	var (
		db  *sql.DB
		err error
	)
	switch driver {
	case "sqlite":
		dsnSqlite := fmt.Sprintf("file:%s?_pragma=busy_timeout=5000&_fk=1", path)
		db, err = sql.Open("sqlite", dsnSqlite)
	case "mysql":
		// dsn example: user:pass@tcp(db:3306)/webapp?parseTime=true&multiStatements=true
		if dsn == "" {
			return nil, fmt.Errorf("empty DSN for mysql driver")
		}
		db, err = sql.Open("mysql", dsn)
	default:
		return nil, fmt.Errorf("unsupported driver: %s", driver)
	}
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	log.Printf("db: connected using driver %s", driver)
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
