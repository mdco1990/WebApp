package db

import (
	"database/sql"
	"embed"
	"fmt"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schemaFS embed.FS

// Open opens an SQLite database using the pure-Go driver.
func Open(path string) (*sql.DB, error) {
	dsn := fmt.Sprintf("file:%s?_pragma=busy_timeout=5000&_fk=1", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

// Migrate executes the embedded schema.
func Migrate(db *sql.DB) error {
	b, err := schemaFS.ReadFile("schema.sql")
	if err != nil {
		return err
	}
	_, err = db.Exec(string(b))
	return err
}
