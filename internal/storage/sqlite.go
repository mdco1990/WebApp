// Package storage implements SQLite storage provider.
package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	_ "github.com/glebarez/go-sqlite" // SQLite driver registration
)

// ErrNoTTL is returned when no TTL is set for a key
var ErrNoTTL = errors.New("no TTL set")

// SQLiteStorage implements Provider using SQLite
type SQLiteStorage struct {
	db            *sql.DB
	options       Options
	mu            sync.RWMutex
	eventHandlers []EventHandler
	cleanupTicker *time.Ticker
	done          chan bool
}

// SQLiteStorageEntry represents a storage entry in SQLite
type SQLiteStorageEntry struct {
	Key       string     `json:"key"`
	Value     []byte     `json:"value"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	Size      int64      `json:"size_bytes"`
	Metadata  []byte     `json:"metadata,omitempty"`
}

// NewSQLiteStorage creates a new SQLite storage provider
func NewSQLiteStorage(dbPath string, options Options) (*SQLiteStorage, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open SQLite database: %w", err)
	}

	storage := &SQLiteStorage{
		db:            db,
		options:       options,
		eventHandlers: make([]EventHandler, 0),
		done:          make(chan bool),
	}

	// Initialize database schema
	if err := storage.initSchema(); err != nil {
		if closeErr := db.Close(); closeErr != nil {
			slog.Error("Failed to close database after schema init error", "error", closeErr)
		}
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	// Start cleanup routine
	storage.startCleanupRoutine()

	return storage, nil
}

// initSchema creates the necessary tables
func (s *SQLiteStorage) initSchema() error {
	query := `
	CREATE TABLE IF NOT EXISTS storage_entries (
		key TEXT PRIMARY KEY,
		value BLOB NOT NULL,
		created_at DATETIME NOT NULL,
		expires_at DATETIME,
		size_bytes INTEGER NOT NULL,
		metadata BLOB,
		created_at_idx DATETIME,
		expires_at_idx DATETIME
	);
	
	CREATE INDEX IF NOT EXISTS idx_created_at ON storage_entries(created_at_idx);
	CREATE INDEX IF NOT EXISTS idx_expires_at ON storage_entries(expires_at_idx);
	CREATE INDEX IF NOT EXISTS idx_size ON storage_entries(size_bytes);
	`

	_, err := s.db.Exec(query)
	return err
}

// Save stores a value with optional TTL
//
//nolint:cyclop
func (s *SQLiteStorage) Save(ctx context.Context, key string, value interface{}, ttl *time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Serialize value
	valueBytes, err := json.Marshal(value)
	if err != nil {
		return &Error{
			Op:      "Save",
			Key:     key,
			Message: fmt.Sprintf("failed to marshal value: %v", err),
			Code:    "MARSHAL_ERROR",
		}
	}

	// Calculate size
	size := int64(len(valueBytes))

	// Check size limits
	if s.options.MaxSize > 0 && size > s.options.MaxSize {
		return &Error{
			Op:      "Save",
			Key:     key,
			Message: fmt.Sprintf("value size %d exceeds maximum %d", size, s.options.MaxSize),
			Code:    "SIZE_LIMIT_EXCEEDED",
		}
	}

	// Calculate expiration time
	var expiresAt *time.Time
	if ttl != nil {
		exp := time.Now().Add(*ttl)
		expiresAt = &exp
	} else if s.options.DefaultTTL != nil {
		exp := time.Now().Add(*s.options.DefaultTTL)
		expiresAt = &exp
	}

	// Check key count limits
	if s.options.MaxKeys > 0 {
		var count int64
		err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM storage_entries").Scan(&count)
		if err != nil {
			return &Error{
				Op:      "Save",
				Key:     key,
				Message: fmt.Sprintf("failed to count keys: %v", err),
				Code:    "COUNT_ERROR",
			}
		}

		// Check if this is an update or new key
		var exists bool
		err = s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM storage_entries WHERE key = ?)", key).Scan(&exists)
		if err != nil {
			return &Error{
				Op:      "Save",
				Key:     key,
				Message: fmt.Sprintf("failed to check key existence: %v", err),
				Code:    "EXISTS_CHECK_ERROR",
			}
		}

		if !exists && count >= s.options.MaxKeys {
			return &Error{
				Op:      "Save",
				Key:     key,
				Message: fmt.Sprintf("maximum number of keys %d reached", s.options.MaxKeys),
				Code:    "KEY_LIMIT_EXCEEDED",
			}
		}
	}

	// Insert or update
	query := `
	INSERT OR REPLACE INTO storage_entries 
	(key, value, created_at, expires_at, size_bytes, metadata, created_at_idx, expires_at_idx)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	now := time.Now()
	_, err = s.db.ExecContext(ctx, query, key, valueBytes, now, expiresAt, size, nil, now, expiresAt)
	if err != nil {
		return &Error{
			Op:      "Save",
			Key:     key,
			Message: fmt.Sprintf("failed to save to database: %v", err),
			Code:    "DATABASE_ERROR",
		}
	}

	// Emit event
	s.emitEvent(Event{
		Type:      EventCreated,
		Key:       key,
		Timestamp: now,
		Data:      value,
	})

	return nil
}

// Load retrieves a value by key
func (s *SQLiteStorage) Load(ctx context.Context, key string) (interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := `
	SELECT value, expires_at FROM storage_entries 
	WHERE key = ?
	`

	var valueBytes []byte
	var expiresAt *time.Time
	err := s.db.QueryRowContext(ctx, query, key).Scan(&valueBytes, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, &Error{
				Op:      "Load",
				Key:     key,
				Message: "key not found",
				Code:    "KEY_NOT_FOUND",
			}
		}
		return nil, &Error{
			Op:      "Load",
			Key:     key,
			Message: fmt.Sprintf("database error: %v", err),
			Code:    "DATABASE_ERROR",
		}
	}

	// Check if expired
	if expiresAt != nil && time.Now().After(*expiresAt) {
		// Remove expired entry
		go func() {
			_ = s.Delete(ctx, key)
		}()

		return nil, &Error{
			Op:      "Load",
			Key:     key,
			Message: "key expired",
			Code:    "KEY_EXPIRED",
		}
	}

	// Deserialize value
	var value interface{}
	if err := json.Unmarshal(valueBytes, &value); err != nil {
		return nil, &Error{
			Op:      "Load",
			Key:     key,
			Message: fmt.Sprintf("failed to unmarshal value: %v", err),
			Code:    "UNMARSHAL_ERROR",
		}
	}

	return value, nil
}

// Delete removes a value by key
func (s *SQLiteStorage) Delete(ctx context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	query := "DELETE FROM storage_entries WHERE key = ?"
	result, err := s.db.ExecContext(ctx, query, key)
	if err != nil {
		return &Error{
			Op:      "Delete",
			Key:     key,
			Message: fmt.Sprintf("database error: %v", err),
			Code:    "DATABASE_ERROR",
		}
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return &Error{
			Op:      "Delete",
			Key:     key,
			Message: fmt.Sprintf("failed to get rows affected: %v", err),
			Code:    "ROWS_AFFECTED_ERROR",
		}
	}

	if rowsAffected == 0 {
		return &Error{
			Op:      "Delete",
			Key:     key,
			Message: "key not found",
			Code:    "KEY_NOT_FOUND",
		}
	}

	// Emit event
	s.emitEvent(Event{
		Type:      EventDeleted,
		Key:       key,
		Timestamp: time.Now(),
	})

	return nil
}

// Exists checks if a key exists
func (s *SQLiteStorage) Exists(ctx context.Context, key string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := "SELECT EXISTS(SELECT 1 FROM storage_entries WHERE key = ?)"
	var exists bool
	err := s.db.QueryRowContext(ctx, query, key).Scan(&exists)
	if err != nil {
		return false, &Error{
			Op:      "Exists",
			Key:     key,
			Message: fmt.Sprintf("database error: %v", err),
			Code:    "DATABASE_ERROR",
		}
	}

	return exists, nil
}

// GetTTL returns the remaining TTL for a key
func (s *SQLiteStorage) GetTTL(ctx context.Context, key string) (*time.Duration, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	query := "SELECT expires_at FROM storage_entries WHERE key = ?"
	var expiresAt *time.Time
	err := s.db.QueryRowContext(ctx, query, key).Scan(&expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, &Error{
				Op:      "GetTTL",
				Key:     key,
				Message: "key not found",
				Code:    "KEY_NOT_FOUND",
			}
		}
		return nil, &Error{
			Op:      "GetTTL",
			Key:     key,
			Message: fmt.Sprintf("database error: %v", err),
			Code:    "DATABASE_ERROR",
		}
	}

	if expiresAt == nil {
		return nil, ErrNoTTL
	}

	remaining := time.Until(*expiresAt)
	if remaining <= 0 {
		return nil, ErrNoTTL
	}

	return &remaining, nil
}

// SetTTL updates the TTL for a key
func (s *SQLiteStorage) SetTTL(ctx context.Context, key string, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	expiresAt := time.Now().Add(ttl)
	query := "UPDATE storage_entries SET expires_at = ?, expires_at_idx = ? WHERE key = ?"
	result, err := s.db.ExecContext(ctx, query, expiresAt, expiresAt, key)
	if err != nil {
		return &Error{
			Op:      "SetTTL",
			Key:     key,
			Message: fmt.Sprintf("database error: %v", err),
			Code:    "DATABASE_ERROR",
		}
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return &Error{
			Op:      "SetTTL",
			Key:     key,
			Message: fmt.Sprintf("failed to get rows affected: %v", err),
			Code:    "ROWS_AFFECTED_ERROR",
		}
	}

	if rowsAffected == 0 {
		return &Error{
			Op:      "SetTTL",
			Key:     key,
			Message: "key not found",
			Code:    "KEY_NOT_FOUND",
		}
	}

	return nil
}

// Clear removes all data from storage
func (s *SQLiteStorage) Clear(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	query := "DELETE FROM storage_entries"
	_, err := s.db.ExecContext(ctx, query)
	if err != nil {
		return &Error{
			Op:      "Clear",
			Key:     "",
			Message: fmt.Sprintf("database error: %v", err),
			Code:    "DATABASE_ERROR",
		}
	}

	// Emit event
	s.emitEvent(Event{
		Type:      EventCleared,
		Key:       "",
		Timestamp: time.Now(),
	})

	return nil
}

// GetStats returns storage statistics
func (s *SQLiteStorage) GetStats(ctx context.Context) (*Stats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := &Stats{
		ProviderType: "sqlite",
		LastCleanup:  time.Now(),
	}

	// Get total keys
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM storage_entries").Scan(&stats.TotalKeys)
	if err != nil {
		return nil, fmt.Errorf("failed to get total keys: %w", err)
	}

	// Get total size
	err = s.db.QueryRowContext(ctx, "SELECT COALESCE(SUM(size_bytes), 0) FROM storage_entries").Scan(&stats.TotalSize)
	if err != nil {
		return nil, fmt.Errorf("failed to get total size: %w", err)
	}

	// Get expired keys count
	err = s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM storage_entries WHERE expires_at < ?", time.Now()).Scan(&stats.ExpiredKeys)
	if err != nil {
		return nil, fmt.Errorf("failed to get expired keys count: %w", err)
	}

	// Estimate memory usage (rough approximation)
	stats.MemoryUsage = stats.TotalSize + (stats.TotalKeys * 100) // Add overhead per key

	return stats, nil
}

// Close closes the storage provider
func (s *SQLiteStorage) Close(_ context.Context) error {
	// Stop cleanup routine
	if s.cleanupTicker != nil {
		s.cleanupTicker.Stop()
		close(s.done)
	}

	// Close database
	return s.db.Close()
}

// AddEventHandler adds an event handler
func (s *SQLiteStorage) AddEventHandler(handler EventHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.eventHandlers = append(s.eventHandlers, handler)
}

// emitEvent emits a storage event to all handlers
func (s *SQLiteStorage) emitEvent(event Event) {
	s.mu.RLock()
	handlers := make([]EventHandler, len(s.eventHandlers))
	copy(handlers, s.eventHandlers)
	s.mu.RUnlock()

	for _, handler := range handlers {
		go func(h EventHandler, e Event) {
			defer func() {
				if r := recover(); r != nil {
					// Log panic but don't crash
					slog.Error("Storage event handler panicked", "panic", r)
				}
			}()
			h(e)
		}(handler, event)
	}
}

// startCleanupRoutine starts the background cleanup routine
func (s *SQLiteStorage) startCleanupRoutine() {
	if s.options.CleanupInterval <= 0 {
		s.options.CleanupInterval = 5 * time.Minute // Default cleanup interval
	}

	s.cleanupTicker = time.NewTicker(s.options.CleanupInterval)
	go func() {
		for {
			select {
			case <-s.cleanupTicker.C:
				s.cleanupExpiredBackground()
			case <-s.done:
				return
			}
		}
	}()
}

// cleanupExpiredBackground removes expired entries in background (no context)
func (s *SQLiteStorage) cleanupExpiredBackground() {
	query := "DELETE FROM storage_entries WHERE expires_at < ?"

	result, err := s.db.Exec(query, time.Now())
	if err != nil {
		slog.Error("Failed to cleanup expired entries", "error", err)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		slog.Error("Failed to get cleanup rows affected", "error", err)
		return
	}

	if rowsAffected > 0 {
		slog.Info("Cleaned up expired entries", "count", rowsAffected)
	}
}

// SQLiteStorageFactory implements StorageProviderFactory
type SQLiteStorageFactory struct{}

// NewSQLiteStorageFactory creates a new SQLite storage factory
func NewSQLiteStorageFactory() *SQLiteStorageFactory {
	return &SQLiteStorageFactory{}
}

// Create creates a new SQLite storage provider
//
//nolint:ireturn
func (f *SQLiteStorageFactory) Create(_ context.Context, options Options) (Provider, error) {
	// Extract SQLite-specific options
	dbPath, ok := options.Metadata["db_path"].(string)
	if !ok {
		dbPath = ":memory:" // Default to in-memory database
	}

	return NewSQLiteStorage(dbPath, options)
}

// GetType returns the type of storage provider
func (f *SQLiteStorageFactory) GetType() string {
	return "sqlite"
}
