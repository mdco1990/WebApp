package db

import (
	"testing"
)

func TestOpenSQLite(t *testing.T) {
	// Test SQLite connection
	db, err := Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Test basic query
	var result int
	err = db.QueryRow("SELECT 1").Scan(&result)
	if err != nil {
		t.Fatalf("Failed to execute query: %v", err)
	}
	if result != 1 {
		t.Errorf("Expected result 1, got %d", result)
	}
}

func TestOpenMySQL(t *testing.T) {
	// Skip if MySQL is not available
	if testing.Short() {
		t.Skip("Skipping MySQL test in short mode")
	}

	// Test MySQL connection (this will fail if MySQL is not running, which is expected)
	_, err := Open("mysql", "", "user:pass@tcp(localhost:3306)/testdb")
	if err == nil {
		t.Log("MySQL connection successful (unexpected in test environment)")
	} else {
		t.Logf("MySQL connection failed as expected: %v", err)
	}
}

func TestOpenInvalidDriver(t *testing.T) {
	// Test invalid driver
	_, err := Open("invalid_driver", "", "")
	if err == nil {
		t.Error("Expected error for invalid driver")
	}
}

func TestMigrate(t *testing.T) {
	// Test migration on in-memory SQLite
	db, err := Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Run migrations
	err = Migrate(db)
	if err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Verify migrations ran by checking if tables exist
	tables := []string{"expense", "budget", "salary"}
	for _, table := range tables {
		var count int
		err := db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", table).
			Scan(&count)
		if err != nil {
			t.Fatalf("Failed to check table %s: %v", table, err)
		}
		if count == 0 {
			t.Errorf("Table %s was not created", table)
		}
	}
}

func TestDatabasePing(t *testing.T) {
	db, err := Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Test ping
	err = db.Ping()
	if err != nil {
		t.Errorf("Database ping failed: %v", err)
	}
}

func TestDatabaseStats(t *testing.T) {
	db, err := Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Test database stats
	stats := db.Stats()
	if stats.OpenConnections == 0 {
		t.Error("Expected at least one open connection")
	}
}

func TestDatabaseClose(t *testing.T) {
	db, err := Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}

	// Test close
	err = db.Close()
	if err != nil {
		t.Errorf("Failed to close database: %v", err)
	}

	// Test that we can't use closed database
	rows, err := db.Query("SELECT 1")
	if err == nil {
		defer func() {
			if err := rows.Close(); err != nil {
				t.Logf("Failed to close rows: %v", err)
			}
		}()
		if err := rows.Err(); err != nil {
			t.Logf("Rows error: %v", err)
		}
		t.Error("Expected error when querying closed database")
	}
}

func TestDatabaseConcurrency(t *testing.T) {
	db, err := Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Test concurrent queries
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(id int) {
			defer func() { done <- true }()

			var result int
			err := db.QueryRow("SELECT ?", id).Scan(&result)
			if err != nil {
				t.Errorf("Concurrent query %d failed: %v", id, err)
				return
			}
			if result != id {
				t.Errorf("Concurrent query %d expected %d, got %d", id, id, result)
			}
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}
}

func TestDatabaseTransaction(t *testing.T) {
	db, err := Open("sqlite", ":memory:", "")
	if err != nil {
		t.Fatalf("Failed to open SQLite database: %v", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
		}
	}()

	// Run migrations first
	err = Migrate(db)
	if err != nil {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Test transaction
	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("Failed to begin transaction: %v", err)
	}

	// Insert test data
	_, err = tx.Exec(
		"INSERT INTO expense (year, month, description, amount_cents) VALUES (?, ?, ?, ?)",
		2024,
		1,
		"Test Expense",
		1000,
	)
	if err != nil {
		t.Fatalf("Failed to insert test data: %v", err)
	}

	// Rollback transaction
	err = tx.Rollback()
	if err != nil {
		t.Fatalf("Failed to rollback transaction: %v", err)
	}

	// Verify data was rolled back
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM expense").Scan(&count)
	if err != nil {
		t.Fatalf("Failed to count expenses: %v", err)
	}
	if count != 0 {
		t.Errorf("Expected 0 expenses after rollback, got %d", count)
	}
}
