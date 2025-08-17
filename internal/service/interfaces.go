// Package service implements service interface abstractions and factory patterns.
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/repository"
	"github.com/mdco1990/webapp/internal/storage"
)

// UserService defines the interface for user-related operations
//
//nolint:interfacebloat
type UserService interface {
	// User management
	CreateUser(ctx context.Context, user *domain.User) error
	GetUser(ctx context.Context, id int64) (*domain.User, error)
	GetUserByUsername(ctx context.Context, username string) (*domain.User, error)
	UpdateUser(ctx context.Context, user *domain.User) error
	DeleteUser(ctx context.Context, id int64) error
	ListUsers(ctx context.Context, limit, offset int) ([]*domain.User, error)

	// Authentication
	AuthenticateUser(ctx context.Context, username, password string) (*domain.User, error)
	ValidateSession(ctx context.Context, sessionID string) (*domain.User, error)
	CreateSession(ctx context.Context, userID int64) (string, error)
	DestroySession(ctx context.Context, sessionID string) error

	// User roles and permissions
	GetUserRoles(ctx context.Context, userID int64) ([]string, error)
	AssignRole(ctx context.Context, userID int64, role string) error
	RemoveRole(ctx context.Context, userID int64, role string) error
	HasPermission(ctx context.Context, userID int64, permission string) (bool, error)
}

// FinancialService defines the interface for financial operations
//
//nolint:interfacebloat
type FinancialService interface {
	// Income management
	SetIncome(ctx context.Context, ym domain.YearMonth, amount domain.Money) error
	GetIncome(ctx context.Context, ym domain.YearMonth) (domain.Money, error)
	AddIncomeSource(ctx context.Context, source *domain.IncomeSource) error
	UpdateIncomeSource(ctx context.Context, source *domain.IncomeSource) error
	DeleteIncomeSource(ctx context.Context, id int64) error
	ListIncomeSources(ctx context.Context, ym domain.YearMonth) ([]domain.IncomeSource, error)

	// Budget management
	SetBudget(ctx context.Context, ym domain.YearMonth, amount domain.Money) error
	GetBudget(ctx context.Context, ym domain.YearMonth) (domain.Money, error)
	AddBudgetSource(ctx context.Context, source *domain.BudgetSource) error
	UpdateBudgetSource(ctx context.Context, source *domain.BudgetSource) error
	DeleteBudgetSource(ctx context.Context, id int64) error
	ListBudgetSources(ctx context.Context, ym domain.YearMonth) ([]domain.BudgetSource, error)

	// Expense management
	AddExpense(ctx context.Context, expense *domain.Expense) (int64, error)
	GetExpense(ctx context.Context, id int64) (*domain.Expense, error)
	UpdateExpense(ctx context.Context, expense *domain.Expense) error
	DeleteExpense(ctx context.Context, id int64) error
	ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error)

	// Financial summaries and reports
	GetMonthlySummary(ctx context.Context, ym domain.YearMonth) (*domain.Summary, error)
	GetYearlySummary(ctx context.Context, year int) (*domain.YearlySummary, error)
	GetExpenseReport(ctx context.Context, ym domain.YearMonth,
		filters map[string]interface{}) (*domain.ExpenseReport, error)

	// Concurrent operations
	GetMonthlyDataConcurrent(ctx context.Context, ym domain.YearMonth) (*MonthlyDataResult, error)
}

// NotificationService defines the interface for notification operations
type NotificationService interface {
	// Notification management
	SendNotification(ctx context.Context, userID int64, notification *domain.Notification) error
	GetNotifications(ctx context.Context, userID int64, limit, offset int) ([]*domain.Notification, error)
	MarkAsRead(ctx context.Context, notificationID int64) error
	MarkAllAsRead(ctx context.Context, userID int64) error
	DeleteNotification(ctx context.Context, notificationID int64) error

	// Notification preferences
	GetUserPreferences(ctx context.Context, userID int64) (*domain.NotificationPreferences, error)
	UpdateUserPreferences(ctx context.Context, userID int64, preferences *domain.NotificationPreferences) error

	// Bulk notifications
	SendBulkNotification(ctx context.Context, userIDs []int64, notification *domain.Notification) error
	SendSystemNotification(ctx context.Context, notification *domain.SystemNotification) error
}

// AuditService defines the interface for audit logging
type AuditService interface {
	// Audit logging
	LogAction(ctx context.Context, action *domain.AuditAction) error
	GetAuditLog(ctx context.Context, filters map[string]interface{}, limit, offset int) ([]*domain.AuditAction, error)
	GetUserAuditLog(ctx context.Context, userID int64, limit, offset int) ([]*domain.AuditAction, error)

	// Audit queries
	SearchAuditLog(ctx context.Context, query string, filters map[string]interface{}, limit, offset int) ([]*domain.AuditAction, error)
	GetAuditStats(ctx context.Context, timeRange domain.TimeRange) (*domain.AuditStats, error)
}

// CacheService defines the interface for caching operations
type CacheService interface {
	// Basic cache operations
	Get(ctx context.Context, key string) (interface{}, error)
	Set(ctx context.Context, key string, value interface{}, ttl *time.Duration) error
	Delete(ctx context.Context, key string) error
	Exists(ctx context.Context, key string) (bool, error)

	// Advanced cache operations
	GetOrSet(ctx context.Context, key string, factory func() (interface{}, error), ttl *time.Duration) (interface{}, error)
	Increment(ctx context.Context, key string, value int64) (int64, error)
	Decrement(ctx context.Context, key string, value int64) (int64, error)

	// Cache management
	Clear(ctx context.Context) error
	GetStats(ctx context.Context) (*storage.Stats, error)
	GetKeys(ctx context.Context, pattern string) ([]string, error)
}

// BackgroundTaskService defines the interface for background task operations
type BackgroundTaskService interface {
	// Task management
	ProcessExpenseReportAsync(ctx context.Context, ym domain.YearMonth, filters map[string]interface{}) (string, error)
	GetTaskStatus(ctx context.Context, taskID string) (*BackgroundTask, error)
	GetTaskResult(ctx context.Context, taskID string) (interface{}, error)
	CancelTask(ctx context.Context, taskID string) error
	ListTasks(ctx context.Context, taskType *TaskType, status *TaskStatus) []*BackgroundTask

	// Task cleanup
	CleanupCompletedTasks(ctx context.Context, olderThan time.Duration) int
}

// Factory creates and manages service instances
type Factory struct {
	repo           *repository.Repository
	storageManager *storage.Manager
	services       map[string]interface{}
}

// NewFactory creates a new service factory
func NewFactory(repo *repository.Repository, storageManager *storage.Manager) *Factory {
	return &Factory{
		repo:           repo,
		storageManager: storageManager,
		services:       make(map[string]interface{}),
	}
}

// GetUserService returns or creates a UserService instance
//
//nolint:ireturn
func (sf *Factory) GetUserService() UserService {
	if service, exists := sf.services["user"]; exists {
		if userService, ok := service.(UserService); ok {
			return userService
		}
	}

	//nolint:godox
	// TODO: Implement NewUserService
	// service := NewUserService(sf.repo)
	// sf.services["user"] = service
	// return service
	return nil
}

// GetFinancialService returns or creates a FinancialService instance
//
//nolint:ireturn
func (sf *Factory) GetFinancialService() FinancialService {
	if service, exists := sf.services["financial"]; exists {
		if financialService, ok := service.(FinancialService); ok {
			return financialService
		}
	}

	//nolint:godox
	// TODO: Implement NewFinancialService
	// service := NewFinancialService(sf.repo)
	// sf.services["financial"] = service
	// return service
	return nil
}

// GetNotificationService returns or creates a NotificationService instance
//
//nolint:ireturn
func (sf *Factory) GetNotificationService() NotificationService {
	if service, exists := sf.services["notification"]; exists {
		if notificationService, ok := service.(NotificationService); ok {
			return notificationService
		}
	}

	//nolint:godox
	// TODO: Implement NewNotificationService
	// service := NewNotificationService(sf.repo, sf.storageManager)
	// sf.services["notification"] = service
	// return service
	return nil
}

// GetAuditService returns or creates an AuditService instance
//
//nolint:ireturn
func (sf *Factory) GetAuditService() AuditService {
	if service, exists := sf.services["audit"]; exists {
		if auditService, ok := service.(AuditService); ok {
			return auditService
		}
	}

	//nolint:godox
	// TODO: Implement NewAuditService
	// service := NewAuditService(sf.repo)
	// sf.services["audit"] = service
	// return service
	return nil
}

// GetCacheService returns or creates a CacheService instance
//
//nolint:ireturn
func (sf *Factory) GetCacheService() CacheService {
	if service, exists := sf.services["cache"]; exists {
		if cacheService, ok := service.(CacheService); ok {
			return cacheService
		}
	}

	//nolint:godox
	// TODO: Implement cache provider creation
	// Get the default cache provider
	// cacheProvider, err := sf.storageManager.GetProvider("cache")
	// if err != nil {
	// 	// Create a default in-memory cache provider
	// 	_ = sf.storageManager.CreateProvider(context.Background(), "cache", "sqlite", storage.StorageOptions{
	// 		DefaultTTL:      func() *time.Duration { d := 5 * time.Minute; return &d }(),
	// 		MaxKeys:         1000,
	// 		MaxSize:         10 * 1024 * 1024, // 10MB
	// 		CleanupInterval: 1 * time.Minute,
	// 		Metadata: map[string]interface{}{
	// 			"db_path": ":memory:",
	// 	},
	// 	})
	// }

	//nolint:godox
	// TODO: Implement NewCacheService
	// service := NewCacheService(cacheProvider)
	// sf.services["cache"] = service
	// return service
	return nil
}

// GetBackgroundTaskService returns or creates a BackgroundTaskService instance
//
//nolint:ireturn
func (sf *Factory) GetBackgroundTaskService() BackgroundTaskService {
	if service, exists := sf.services["background_task"]; exists {
		if backgroundTaskService, ok := service.(BackgroundTaskService); ok {
			return backgroundTaskService
		}
	}

	//nolint:godox
	// TODO: Implement NewBackgroundTaskService
	// service := NewBackgroundTaskService(sf.repo)
	// sf.services["background_task"] = service
	// return service
	return nil
}

// GetService returns a service by name
func (sf *Factory) GetService(name string) (interface{}, error) {
	switch name {
	case "user":
		return sf.GetUserService(), nil
	case "financial":
		return sf.GetFinancialService(), nil
	case "notification":
		return sf.GetNotificationService(), nil
	case "audit":
		return sf.GetAuditService(), nil
	case "cache":
		return sf.GetCacheService(), nil
	case "background_task":
		return sf.GetBackgroundTaskService(), nil
	default:
		return nil, fmt.Errorf("unknown service: %s", name)
	}
}

// ListServices returns a list of available service names
func (sf *Factory) ListServices() []string {
	return []string{
		"user",
		"financial",
		"notification",
		"audit",
		"cache",
		"background_task",
	}
}

// Close closes all services
func (sf *Factory) Close(ctx context.Context) error {
	var lastError error

	for name, service := range sf.services {
		if closer, ok := service.(interface {
			Close(ctx context.Context) error
		}); ok {
			if err := closer.Close(ctx); err != nil {
				lastError = err
			}
		}
		delete(sf.services, name)
	}

	return lastError
}

// Config holds configuration for services
type Config struct {
	UserService           UserServiceConfig           `json:"user_service"`
	FinancialService      FinancialServiceConfig      `json:"financial_service"`
	NotificationService   NotificationServiceConfig   `json:"notification_service"`
	AuditService          AuditServiceConfig          `json:"audit_service"`
	CacheService          CacheServiceConfig          `json:"cache_service"`
	BackgroundTaskService BackgroundTaskServiceConfig `json:"background_task_service"`
}

// UserServiceConfig holds configuration for user service
type UserServiceConfig struct {
	SessionTimeout           time.Duration `json:"session_timeout"`
	MaxLoginAttempts         int           `json:"max_login_attempts"`
	PasswordMinLength        int           `json:"password_min_length"`
	RequireEmailVerification bool          `json:"require_email_verification"`
}

// FinancialServiceConfig holds configuration for financial service
type FinancialServiceConfig struct {
	MaxAmount            int64  `json:"max_amount"`
	DefaultCurrency      string `json:"default_currency"`
	AllowNegativeBalance bool   `json:"allow_negative_balance"`
	AuditAllTransactions bool   `json:"audit_all_transactions"`
}

// NotificationServiceConfig holds configuration for notification service
type NotificationServiceConfig struct {
	DefaultTTL       time.Duration `json:"default_ttl"`
	MaxNotifications int           `json:"max_notifications"`
	EnableEmail      bool          `json:"enable_email"`
	EnablePush       bool          `json:"enable_push"`
	EnableSMS        bool          `json:"enable_sms"`
}

// AuditServiceConfig holds configuration for audit service
type AuditServiceConfig struct {
	RetentionPeriod   time.Duration `json:"retention_period"`
	LogLevel          string        `json:"log_level"`
	EnableCompression bool          `json:"enable_compression"`
	MaxLogSize        int64         `json:"max_log_size"`
}

// CacheServiceConfig holds configuration for cache service
type CacheServiceConfig struct {
	DefaultTTL        time.Duration `json:"default_ttl"`
	MaxKeys           int64         `json:"max_keys"`
	MaxSize           int64         `json:"max_size"`
	CleanupInterval   time.Duration `json:"cleanup_interval"`
	EnableCompression bool          `json:"enable_compression"`
}

// BackgroundTaskServiceConfig holds configuration for background task service
type BackgroundTaskServiceConfig struct {
	MaxConcurrentTasks     int           `json:"max_concurrent_tasks"`
	TaskTimeout            time.Duration `json:"task_timeout"`
	RetentionPeriod        time.Duration `json:"retention_period"`
	EnableProgressTracking bool          `json:"enable_progress_tracking"`
}

// Health represents the health status of a service
type Health struct {
	Name      string                 `json:"name"`
	Status    string                 `json:"status"` // "healthy", "degraded", "unhealthy"
	Message   string                 `json:"message"`
	Timestamp time.Time              `json:"timestamp"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// HealthChecker defines the interface for checking service health
type HealthChecker interface {
	CheckHealth(ctx context.Context) (*Health, error)
}

// HealthCheckerFactory creates health checkers for services
type HealthCheckerFactory struct {
	factory *Factory
}

// NewHealthCheckerFactory creates a new health checker factory
func NewHealthCheckerFactory(factory *Factory) *HealthCheckerFactory {
	return &HealthCheckerFactory{
		factory: factory,
	}
}

// CreateHealthChecker creates a health checker for a specific service
//
//nolint:ireturn
func (shcf *HealthCheckerFactory) CreateHealthChecker(serviceName string) (HealthChecker, error) {
	switch serviceName {
	case "user":
		//nolint:godox
		// TODO: Implement NewUserServiceHealthChecker
		// return NewUserServiceHealthChecker(shcf.factory.GetUserService()), nil
		return nil, fmt.Errorf("health checker not implemented for service: %s", serviceName)
	case "financial":
		//nolint:godox
		// TODO: Implement NewFinancialServiceHealthChecker
		// return NewFinancialServiceHealthChecker(shcf.factory.GetFinancialService()), nil
		return nil, fmt.Errorf("health checker not implemented for service: %s", serviceName)
	case "cache":
		//nolint:godox
		// TODO: Implement NewCacheServiceHealthChecker
		// return NewCacheServiceHealthChecker(shcf.factory.GetCacheService()), nil
		return nil, fmt.Errorf("health checker not implemented for service: %s", serviceName)
	default:
		return nil, fmt.Errorf("no health checker available for service: %s", serviceName)
	}
}

// CheckAllServices checks the health of all services
func (shcf *HealthCheckerFactory) CheckAllServices(ctx context.Context) (map[string]*Health, error) {
	services := shcf.factory.ListServices()
	results := make(map[string]*Health)

	for _, serviceName := range services {
		checker, err := shcf.CreateHealthChecker(serviceName)
		if err != nil {
			results[serviceName] = &Health{
				Name:      serviceName,
				Status:    "unhealthy",
				Message:   fmt.Sprintf("Failed to create health checker: %v", err),
				Timestamp: time.Now(),
			}
			continue
		}

		health, err := checker.CheckHealth(ctx)
		if err != nil {
			results[serviceName] = &Health{
				Name:      serviceName,
				Status:    "unhealthy",
				Message:   fmt.Sprintf("Health check failed: %v", err),
				Timestamp: time.Now(),
			}
			continue
		}

		results[serviceName] = health
	}

	return results, nil
}
