// Package storage implements flexible storage backends with interface abstractions.
package storage

import (
	"context"
	"time"
)

// StorageProvider defines the interface for storage backends.
type StorageProvider interface {
	// Save stores a value with an optional TTL
	Save(ctx context.Context, key string, value interface{}, ttl *time.Duration) error

	// Load retrieves a value by key
	Load(ctx context.Context, key string) (interface{}, error)

	// Delete removes a value by key
	Delete(ctx context.Context, key string) error

	// Exists checks if a key exists
	Exists(ctx context.Context, key string) (bool, error)

	// GetTTL returns the remaining TTL for a key
	GetTTL(ctx context.Context, key string) (*time.Duration, error)

	// SetTTL updates the TTL for a key
	SetTTL(ctx context.Context, key string, ttl time.Duration) error

	// Clear removes all data from storage
	Clear(ctx context.Context) error

	// GetStats returns storage statistics
	GetStats(ctx context.Context) (*StorageStats, error)

	// Close closes the storage provider
	Close(ctx context.Context) error
}

// StorageStats provides information about storage usage
type StorageStats struct {
	TotalKeys    int64     `json:"total_keys"`
	TotalSize    int64     `json:"total_size_bytes"`
	ExpiredKeys  int64     `json:"expired_keys"`
	MemoryUsage  int64     `json:"memory_usage_bytes"`
	LastCleanup  time.Time `json:"last_cleanup"`
	ProviderType string    `json:"provider_type"`
}

// StorageOptions configures storage behavior
type StorageOptions struct {
	DefaultTTL      *time.Duration         `json:"default_ttl"`
	MaxKeys         int64                  `json:"max_keys"`
	MaxSize         int64                  `json:"max_size_bytes"`
	CleanupInterval time.Duration          `json:"cleanup_interval"`
	Compression     bool                   `json:"compression"`
	Encryption      bool                   `json:"encryption"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// StorageEntry represents a stored value with metadata
type StorageEntry struct {
	Key       string                 `json:"key"`
	Value     interface{}            `json:"value"`
	CreatedAt time.Time              `json:"created_at"`
	ExpiresAt *time.Time             `json:"expires_at,omitempty"`
	Size      int64                  `json:"size_bytes"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// StorageError represents storage-specific errors
type StorageError struct {
	Op      string `json:"operation"`
	Key     string `json:"key"`
	Message string `json:"message"`
	Code    string `json:"error_code"`
}

func (e StorageError) Error() string {
	return e.Message
}

// StorageEvent represents storage lifecycle events
type StorageEvent struct {
	Type      StorageEventType `json:"type"`
	Key       string           `json:"key"`
	Timestamp time.Time        `json:"timestamp"`
	Data      interface{}      `json:"data,omitempty"`
}

// StorageEventType defines the type of storage event
type StorageEventType string

const (
	StorageEventCreated StorageEventType = "created"
	StorageEventUpdated StorageEventType = "updated"
	StorageEventDeleted StorageEventType = "deleted"
	StorageEventExpired StorageEventType = "expired"
	StorageEventCleared StorageEventType = "cleared"
)

// StorageEventHandler handles storage events
type StorageEventHandler func(event StorageEvent)

// StorageProviderFactory creates storage providers
type StorageProviderFactory interface {
	// Create creates a new storage provider with the given options
	Create(ctx context.Context, options StorageOptions) (StorageProvider, error)

	// GetType returns the type of storage provider this factory creates
	GetType() string
}

// CompositeStorageProvider combines multiple storage providers
type CompositeStorageProvider struct {
	providers []StorageProvider
	primary   StorageProvider
	fallback  StorageProvider
}

// NewCompositeStorageProvider creates a new composite storage provider
func NewCompositeStorageProvider(primary StorageProvider, fallback StorageProvider) *CompositeStorageProvider {
	return &CompositeStorageProvider{
		providers: []StorageProvider{primary, fallback},
		primary:   primary,
		fallback:  fallback,
	}
}

// Save implements StorageProvider.Save with fallback
func (c *CompositeStorageProvider) Save(ctx context.Context, key string, value interface{}, ttl *time.Duration) error {
	// Try primary first
	err := c.primary.Save(ctx, key, value, ttl)
	if err != nil {
		// Fallback to secondary
		return c.fallback.Save(ctx, key, value, ttl)
	}

	// Also save to fallback for redundancy
	go func() {
		_ = c.fallback.Save(ctx, key, value, ttl)
	}()

	return nil
}

// Load implements StorageProvider.Load with fallback
func (c *CompositeStorageProvider) Load(ctx context.Context, key string) (interface{}, error) {
	// Try primary first
	value, err := c.primary.Load(ctx, key)
	if err == nil {
		return value, nil
	}

	// Fallback to secondary
	value, err = c.fallback.Load(ctx, key)
	if err == nil {
		// Restore to primary
		go func() {
			_ = c.primary.Save(ctx, key, value, nil)
		}()
	}

	return value, err
}

// Delete implements StorageProvider.Delete
func (c *CompositeStorageProvider) Delete(ctx context.Context, key string) error {
	// Delete from both providers
	err1 := c.primary.Delete(ctx, key)
	err2 := c.fallback.Delete(ctx, key)

	if err1 != nil {
		return err1
	}
	return err2
}

// Exists implements StorageProvider.Exists
func (c *CompositeStorageProvider) Exists(ctx context.Context, key string) (bool, error) {
	// Check primary first
	exists, err := c.primary.Exists(ctx, key)
	if err == nil && exists {
		return true, nil
	}

	// Check fallback
	return c.fallback.Exists(ctx, key)
}

// GetTTL implements StorageProvider.GetTTL
func (c *CompositeStorageProvider) GetTTL(ctx context.Context, key string) (*time.Duration, error) {
	// Try primary first
	ttl, err := c.primary.GetTTL(ctx, key)
	if err == nil {
		return ttl, nil
	}

	// Fallback to secondary
	return c.fallback.GetTTL(ctx, key)
}

// SetTTL implements StorageProvider.SetTTL
func (c *CompositeStorageProvider) SetTTL(ctx context.Context, key string, ttl time.Duration) error {
	// Set TTL on both providers
	err1 := c.primary.SetTTL(ctx, key, ttl)
	err2 := c.fallback.SetTTL(ctx, key, ttl)

	if err1 != nil {
		return err1
	}
	return err2
}

// Clear implements StorageProvider.Clear
func (c *CompositeStorageProvider) Clear(ctx context.Context) error {
	// Clear both providers
	err1 := c.primary.Clear(ctx)
	err2 := c.fallback.Clear(ctx)

	if err1 != nil {
		return err1
	}
	return err2
}

// GetStats implements StorageProvider.GetStats
func (c *CompositeStorageProvider) GetStats(ctx context.Context) (*StorageStats, error) {
	// Get stats from primary
	primaryStats, err := c.primary.GetStats(ctx)
	if err != nil {
		return nil, err
	}

	// Get stats from fallback
	fallbackStats, err := c.fallback.GetStats(ctx)
	if err != nil {
		return nil, err
	}

	// Combine stats
	combinedStats := &StorageStats{
		TotalKeys:    primaryStats.TotalKeys + fallbackStats.TotalKeys,
		TotalSize:    primaryStats.TotalSize + fallbackStats.TotalSize,
		ExpiredKeys:  primaryStats.ExpiredKeys + fallbackStats.ExpiredKeys,
		MemoryUsage:  primaryStats.MemoryUsage + fallbackStats.MemoryUsage,
		LastCleanup:  time.Now(),
		ProviderType: "composite",
	}

	return combinedStats, nil
}

// Close implements StorageProvider.Close
func (c *CompositeStorageProvider) Close(ctx context.Context) error {
	// Close both providers
	err1 := c.primary.Close(ctx)
	err2 := c.fallback.Close(ctx)

	if err1 != nil {
		return err1
	}
	return err2
}

// StorageManager manages multiple storage providers
type StorageManager struct {
	providers map[string]StorageProvider
	factories map[string]StorageProviderFactory
	options   map[string]StorageOptions
}

// NewStorageManager creates a new storage manager
func NewStorageManager() *StorageManager {
	return &StorageManager{
		providers: make(map[string]StorageProvider),
		factories: make(map[string]StorageProviderFactory),
		options:   make(map[string]StorageOptions),
	}
}

// RegisterFactory registers a storage provider factory
func (sm *StorageManager) RegisterFactory(name string, factory StorageProviderFactory) {
	sm.factories[name] = factory
}

// CreateProvider creates a storage provider using a registered factory
func (sm *StorageManager) CreateProvider(ctx context.Context, name string, factoryName string, options StorageOptions) error {
	factory, exists := sm.factories[factoryName]
	if !exists {
		return &StorageError{
			Op:      "CreateProvider",
			Key:     name,
			Message: "factory not found: " + factoryName,
			Code:    "FACTORY_NOT_FOUND",
		}
	}

	provider, err := factory.Create(ctx, options)
	if err != nil {
		return err
	}

	sm.providers[name] = provider
	sm.options[name] = options

	return nil
}

// GetProvider returns a storage provider by name
func (sm *StorageManager) GetProvider(name string) (StorageProvider, error) {
	provider, exists := sm.providers[name]
	if !exists {
		return nil, &StorageError{
			Op:      "GetProvider",
			Key:     name,
			Message: "provider not found: " + name,
			Code:    "PROVIDER_NOT_FOUND",
		}
	}

	return provider, nil
}

// ListProviders returns a list of all provider names
func (sm *StorageManager) ListProviders() []string {
	names := make([]string, 0, len(sm.providers))
	for name := range sm.providers {
		names = append(names, name)
	}
	return names
}

// RemoveProvider removes a storage provider
func (sm *StorageManager) RemoveProvider(ctx context.Context, name string) error {
	provider, exists := sm.providers[name]
	if !exists {
		return &StorageError{
			Op:      "RemoveProvider",
			Key:     name,
			Message: "provider not found: " + name,
			Code:    "PROVIDER_NOT_FOUND",
		}
	}

	// Close the provider
	if err := provider.Close(ctx); err != nil {
		return err
	}

	// Remove from maps
	delete(sm.providers, name)
	delete(sm.options, name)

	return nil
}

// CloseAll closes all storage providers
func (sm *StorageManager) CloseAll(ctx context.Context) error {
	var lastError error

	for name, provider := range sm.providers {
		if err := provider.Close(ctx); err != nil {
			lastError = err
		}
		delete(sm.providers, name)
	}

	return lastError
}

// GetStats returns combined stats from all providers
func (sm *StorageManager) GetStats(ctx context.Context) (map[string]*StorageStats, error) {
	stats := make(map[string]*StorageStats)

	for name, provider := range sm.providers {
		providerStats, err := provider.GetStats(ctx)
		if err != nil {
			return nil, err
		}
		stats[name] = providerStats
	}

	return stats, nil
}
