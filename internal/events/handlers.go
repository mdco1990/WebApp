// Package events implements event handlers for various business operations.
package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/storage"
)

// ============================================================================
// NOTIFICATION HANDLER
// ============================================================================

// NotificationHandler handles user notifications for various events
type NotificationHandler struct {
	storage storage.Provider
	config  NotificationConfig
}

// NotificationConfig holds notification handler configuration
type NotificationConfig struct {
	EnableEmail     bool          `json:"enable_email"`
	EnablePush      bool          `json:"enable_push"`
	EnableSMS       bool          `json:"enable_sms"`
	DefaultPriority string        `json:"default_priority"`
	RetryCount      int           `json:"retry_count"`
	RetryDelay      time.Duration `json:"retry_delay"`
	BatchSize       int           `json:"batch_size"`
	BatchTimeout    time.Duration `json:"batch_timeout"`
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(storage storage.Provider, config NotificationConfig) *NotificationHandler {
	return &NotificationHandler{
		storage: storage,
		config:  config,
	}
}

// Handle processes events and sends notifications
func (nh *NotificationHandler) Handle(ctx context.Context, event Event) error {
	switch event.Type() {
	case "expense.created":
		return nh.handleExpenseCreated(ctx, event)
	case "budget.exceeded":
		return nh.handleBudgetExceeded(ctx, event)
	case "user.login":
		return nh.handleUserLogin(ctx, event)
	case "data.export":
		return nh.handleDataExport(ctx, event)
	default:
		// Log unknown event types but don't fail
		log.Printf("Unknown event type: %s", event.Type())
		return nil
	}
}

// handleExpenseCreated handles expense creation events
func (nh *NotificationHandler) handleExpenseCreated(ctx context.Context, event Event) error {
	// Extract expense data
	expenseEvent, ok := event.(*ExpenseCreatedEvent)
	if !ok {
		return fmt.Errorf("invalid event type for expense.created: %T", event)
	}

	// Create notification
	notification := &domain.Notification{
		UserID: expenseEvent.UserID,
		Type:   "expense_created",
		Title:  "New Expense Added",
		Message: fmt.Sprintf("Expense of $%.2f in category '%s' has been added",
			float64(expenseEvent.Amount)/100, expenseEvent.Category),
		Priority: nh.config.DefaultPriority,
		Data: map[string]interface{}{
			"expense_id": expenseEvent.ExpenseID,
			"amount":     expenseEvent.Amount,
			"category":   expenseEvent.Category,
		},
		CreatedAt: time.Now(),
		Read:      false,
	}

	// Store notification
	notificationData, _ := json.Marshal(notification)
	ttl := 30 * 24 * time.Hour // 30 days
	err := nh.storage.Save(ctx, fmt.Sprintf("notification:%d:%s", notification.UserID, notification.ID), notificationData, &ttl)
	if err != nil {
		return fmt.Errorf("failed to store notification: %w", err)
	}

	// Send notifications through different channels
	if nh.config.EnableEmail {
		go nh.sendEmailNotification(ctx, notification)
	}

	if nh.config.EnablePush {
		go nh.sendPushNotification(ctx, notification)
	}

	if nh.config.EnableSMS {
		go nh.sendSMSNotification(ctx, notification)
	}

	return nil
}

// handleBudgetExceeded handles budget exceeded events
func (nh *NotificationHandler) handleBudgetExceeded(ctx context.Context, event Event) error {
	// Extract budget data
	budgetEvent, ok := event.(*BudgetExceededEvent)
	if !ok {
		return fmt.Errorf("invalid event type for budget.exceeded: %T", event)
	}

	// Create high-priority notification
	notification := &domain.Notification{
		UserID: budgetEvent.UserID,
		Type:   "budget_exceeded",
		Title:  "Budget Exceeded",
		Message: fmt.Sprintf("Your budget for %d/%d has been exceeded by $%.2f",
			budgetEvent.Month, budgetEvent.Year, float64(budgetEvent.Excess)/100),
		Priority: "high",
		Data: map[string]interface{}{
			"month":  budgetEvent.Month,
			"year":   budgetEvent.Year,
			"excess": budgetEvent.Excess,
		},
		CreatedAt: time.Now(),
		Read:      false,
	}

	// Store notification
	notificationData, _ := json.Marshal(notification)
	ttl := 30 * 24 * time.Hour // 30 days
	err := nh.storage.Save(ctx, fmt.Sprintf("notification:%d:%s", notification.UserID, notification.ID), notificationData, &ttl)
	if err != nil {
		return fmt.Errorf("failed to store notification: %w", err)
	}

	// Send immediate notifications for budget alerts
	if nh.config.EnableEmail {
		go nh.sendEmailNotification(ctx, notification)
	}

	if nh.config.EnablePush {
		go nh.sendPushNotification(ctx, notification)
	}

	return nil
}

// handleUserLogin handles user login events
func (nh *NotificationHandler) handleUserLogin(ctx context.Context, event Event) error {
	// Extract login data
	loginEvent, ok := event.(*UserLoginEvent)
	if !ok {
		return fmt.Errorf("invalid event type for user.login: %T", event)
	}

	// Only send notifications for failed login attempts
	if !loginEvent.Success {
		notification := &domain.Notification{
			UserID:    loginEvent.UserID,
			Type:      "login_failed",
			Title:     "Failed Login Attempt",
			Message:   fmt.Sprintf("Failed login attempt for user '%s' from %s", loginEvent.Username, loginEvent.IPAddress),
			Priority:  "medium",
			Data:      map[string]interface{}{"ip_address": loginEvent.IPAddress, "user_agent": loginEvent.UserAgent},
			CreatedAt: time.Now(),
			Read:      false,
		}

		// Store notification
		notificationData, _ := json.Marshal(notification)
		ttl := 7 * 24 * time.Hour // 7 days
		err := nh.storage.Save(ctx, fmt.Sprintf("notification:%d:%s", notification.UserID, notification.ID), notificationData, &ttl)
		if err != nil {
			return fmt.Errorf("failed to store notification: %w", err)
		}

		// Send security alert
		if nh.config.EnableEmail {
			go nh.sendEmailNotification(ctx, notification)
		}
	}

	return nil
}

// handleDataExport handles data export events
func (nh *NotificationHandler) handleDataExport(ctx context.Context, event Event) error {
	// Extract export data
	exportEvent, ok := event.(*DataExportEvent)
	if !ok {
		return fmt.Errorf("invalid event type for data.export: %T", event)
	}

	// Create notification based on export status
	var title, message string
	var priority string

	switch exportEvent.Status {
	case "completed":
		title = "Data Export Completed"
		message = fmt.Sprintf("Your %s export in %s format is ready (%.2f MB)", exportEvent.ExportType, exportEvent.Format, float64(exportEvent.FileSize)/(1024*1024))
		priority = "low"
	case "failed":
		title = "Data Export Failed"
		message = fmt.Sprintf("Your %s export in %s format failed to complete", exportEvent.ExportType, exportEvent.Format)
		priority = "medium"
	case "processing":
		title = "Data Export Processing"
		message = fmt.Sprintf("Your %s export in %s format is being processed", exportEvent.ExportType, exportEvent.Format)
		priority = "low"
	default:
		title = "Data Export Update"
		message = fmt.Sprintf("Your %s export status: %s", exportEvent.ExportType, exportEvent.Status)
		priority = "low"
	}

	notification := &domain.Notification{
		UserID:    exportEvent.UserID,
		Type:      "data_export",
		Title:     title,
		Message:   message,
		Priority:  priority,
		Data:      map[string]interface{}{"export_type": exportEvent.ExportType, "format": exportEvent.Format, "file_size": exportEvent.FileSize, "status": exportEvent.Status},
		CreatedAt: time.Now(),
		Read:      false,
	}

	// Store notification
	notificationData, _ := json.Marshal(notification)
	ttl := 30 * 24 * time.Hour // 30 days
	err := nh.storage.Save(ctx, fmt.Sprintf("notification:%d:%s", notification.UserID, notification.ID), notificationData, &ttl)
	if err != nil {
		return fmt.Errorf("failed to store notification: %w", err)
	}

	// Send notification
	if nh.config.EnableEmail {
		go nh.sendEmailNotification(ctx, notification)
	}

	return nil
}

// sendEmailNotification sends an email notification
func (nh *NotificationHandler) sendEmailNotification(ctx context.Context, notification *domain.Notification) {
	// This would integrate with an email service
	// For now, just log the action
	log.Printf("Sending email notification to user %d: %s", notification.UserID, notification.Title)

	// Simulate email sending delay
	time.Sleep(100 * time.Millisecond)

	// Mark notification as sent
	nh.markNotificationSent(ctx, notification.ID, "email")
}

// sendPushNotification sends a push notification
func (nh *NotificationHandler) sendPushNotification(ctx context.Context, notification *domain.Notification) {
	// This would integrate with a push notification service
	// For now, just log the action
	log.Printf("Sending push notification to user %d: %s", notification.UserID, notification.Title)

	// Simulate push notification delay
	time.Sleep(50 * time.Millisecond)

	// Mark notification as sent
	nh.markNotificationSent(ctx, notification.ID, "push")
}

// sendSMSNotification sends an SMS notification
func (nh *NotificationHandler) sendSMSNotification(ctx context.Context, notification *domain.Notification) {
	// This would integrate with an SMS service
	// For now, just log the action
	log.Printf("Sending SMS notification to user %d: %s", notification.UserID, notification.Title)

	// Simulate SMS sending delay
	time.Sleep(200 * time.Millisecond)

	// Mark notification as sent
	nh.markNotificationSent(ctx, notification.ID, "sms")
}

// markNotificationSent marks a notification as sent through a specific channel
func (nh *NotificationHandler) markNotificationSent(ctx context.Context, notificationID string, channel string) {
	// Update notification status in storage
	key := fmt.Sprintf("notification_sent:%s:%s", notificationID, channel)
	status := map[string]interface{}{
		"sent_at": time.Now(),
		"channel": channel,
		"status":  "sent",
	}

	statusData, _ := json.Marshal(status)
	ttl := 7 * 24 * time.Hour // 7 days
	_ = nh.storage.Save(ctx, key, statusData, &ttl)
}

// ============================================================================
// AUDIT HANDLER
// ============================================================================

// AuditHandler handles audit logging for various events
type AuditHandler struct {
	storage storage.Provider
	config  AuditConfig
}

// AuditConfig holds audit handler configuration
type AuditConfig struct {
	EnableAuditLogging bool          `json:"enable_audit_logging"`
	LogLevel           string        `json:"log_level"`
	RetentionPeriod    time.Duration `json:"retention_period"`
	BatchSize          int           `json:"batch_size"`
	BatchTimeout       time.Duration `json:"batch_timeout"`
	Compression        bool          `json:"compression"`
	Encryption         bool          `json:"encryption"`
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(storage storage.Provider, config AuditConfig) *AuditHandler {
	return &AuditHandler{
		storage: storage,
		config:  config,
	}
}

// Handle processes events and creates audit logs
func (ah *AuditHandler) Handle(ctx context.Context, event Event) error {
	if !ah.config.EnableAuditLogging {
		return nil
	}

	// Create audit log entry
	auditLog := &domain.AuditAction{
		UserID:    ah.extractUserID(event),
		Action:    event.Type(),
		Resource:  ah.extractResource(event),
		Details:   ah.extractDetails(event),
		IPAddress: ah.extractIPAddress(event),
		UserAgent: ah.extractUserAgent(event),
		Timestamp: event.Timestamp(),
		Source:    event.Source(),
		EventID:   event.ID(),
		Status:    "success",
	}

	// Store audit log
	auditData, _ := json.Marshal(auditLog)
	ttl := ah.config.RetentionPeriod
	err := ah.storage.Save(ctx, "audit:"+auditLog.ID, auditData, &ttl)
	if err != nil {
		return fmt.Errorf("failed to store audit log: %w", err)
	}

	// Log to console if configured
	if ah.config.LogLevel == "debug" {
		log.Printf("Audit: %s by user %d - %s", auditLog.Action, auditLog.UserID, auditLog.Details)
	}

	return nil
}

// extractUserID extracts user ID from event data
func (ah *AuditHandler) extractUserID(event Event) int64 {
	switch e := event.(type) {
	case *ExpenseCreatedEvent:
		return e.UserID
	case *BudgetExceededEvent:
		return e.UserID
	case *UserLoginEvent:
		return e.UserID
	case *DataExportEvent:
		return e.UserID
	default:
		return 0
	}
}

// extractResource extracts resource information from event data
func (ah *AuditHandler) extractResource(event Event) string {
	switch e := event.(type) {
	case *ExpenseCreatedEvent:
		return "expense:" + strconv.FormatInt(e.ExpenseID, 10)
	case *BudgetExceededEvent:
		return "budget:" + strconv.Itoa(e.Month) + "/" + strconv.Itoa(e.Year)
	case *UserLoginEvent:
		return "user:" + strconv.FormatInt(e.UserID, 10)
	case *DataExportEvent:
		return "export:" + e.ExportType + ":" + e.Format
	default:
		return "unknown"
	}
}

// extractDetails extracts detailed information from event data
func (ah *AuditHandler) extractDetails(event Event) string {
	switch e := event.(type) {
	case *ExpenseCreatedEvent:
		return "Created expense of $" + strconv.FormatFloat(float64(e.Amount)/100, 'f', 2, 64) + " in category '" + e.Category + "'"
	case *BudgetExceededEvent:
		return "Budget exceeded by $" + strconv.FormatFloat(float64(e.Excess)/100, 'f', 2, 64) + " for " + strconv.Itoa(e.Month) + "/" + strconv.Itoa(e.Year)
	case *UserLoginEvent:
		if e.Success {
			return "Successful login from " + e.IPAddress
		}
		return "Failed login attempt from " + e.IPAddress
	case *DataExportEvent:
		return "Data export " + e.ExportType + " in " + e.Format + " format, status: " + e.Status
	default:
		return "Event processed"
	}
}

// extractIPAddress extracts IP address from event data
func (ah *AuditHandler) extractIPAddress(event Event) string {
	switch e := event.(type) {
	case *UserLoginEvent:
		return e.IPAddress
	default:
		return ""
	}
}

// extractUserAgent extracts user agent from event data
func (ah *AuditHandler) extractUserAgent(event Event) string {
	switch e := event.(type) {
	case *UserLoginEvent:
		return e.UserAgent
	default:
		return ""
	}
}

// ============================================================================
// COMPOSITE HANDLER
// ============================================================================

// CompositeHandler combines multiple event handlers
type CompositeHandler struct {
	handlers []EventHandler
	config   CompositeConfig
}

// CompositeConfig holds composite handler configuration
type CompositeConfig struct {
	ContinueOnError bool          `json:"continue_on_error"`
	Timeout         time.Duration `json:"timeout"`
	MaxRetries      int           `json:"max_retries"`
	RetryDelay      time.Duration `json:"retry_delay"`
}

// NewCompositeHandler creates a new composite handler
func NewCompositeHandler(handlers []EventHandler, config CompositeConfig) *CompositeHandler {
	return &CompositeHandler{
		handlers: handlers,
		config:   config,
	}
}

// Handle processes events through all registered handlers
func (ch *CompositeHandler) Handle(ctx context.Context, event Event) error {
	var errors []error

	// Process event through all handlers
	for _, handler := range ch.handlers {
		// Create context with timeout if configured
		handlerCtx := ctx
		if ch.config.Timeout > 0 {
			var cancel context.CancelFunc
			handlerCtx, cancel = context.WithTimeout(ctx, ch.config.Timeout)
			defer cancel()
		}

		// Execute handler with retry logic
		err := ch.executeWithRetry(handlerCtx, handler, event)
		if err != nil {
			errors = append(errors, err)

			// Stop processing if configured to stop on error
			if !ch.config.ContinueOnError {
				break
			}
		}
	}

	// Return combined errors if any
	if len(errors) > 0 {
		return fmt.Errorf("composite handler errors: %v", errors)
	}

	return nil
}

// executeWithRetry executes a handler with retry logic
func (ch *CompositeHandler) executeWithRetry(ctx context.Context, handler EventHandler, event Event) error {
	var lastError error

	for attempt := 0; attempt <= ch.config.MaxRetries; attempt++ {
		err := handler(ctx, event)
		if err == nil {
			return nil
		}

		lastError = err

		// Don't retry on last attempt
		if attempt == ch.config.MaxRetries {
			break
		}

		// Wait before retry
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(ch.config.RetryDelay):
			continue
		}
	}

	return fmt.Errorf("handler failed after %d attempts: %w", ch.config.MaxRetries+1, lastError)
}

// ============================================================================
// MIDDLEWARE HANDLERS
// ============================================================================

// LoggingMiddleware logs event processing
func LoggingMiddleware(logger *log.Logger) EventMiddleware {
	return func(next EventHandler) EventHandler {
		return func(ctx context.Context, event Event) error {
			start := time.Now()

			logger.Printf("Processing event: %s (ID: %s)", event.Type(), event.ID())

			err := next(ctx, event)

			duration := time.Since(start)
			if err != nil {
				logger.Printf("Event processing failed: %s (ID: %s) - %v (took %v)", event.Type(), event.ID(), err, duration)
			} else {
				logger.Printf("Event processed successfully: %s (ID: %s) (took %v)", event.Type(), event.ID(), duration)
			}

			return err
		}
	}
}

// MetricsMiddleware collects metrics for event processing
func MetricsMiddleware(metrics MetricsCollector) EventMiddleware {
	return func(next EventHandler) EventHandler {
		return func(ctx context.Context, event Event) error {
			start := time.Now()

			// Increment event counter
			metrics.IncrementCounter("events_processed_total", map[string]string{
				"event_type": event.Type(),
				"source":     event.Source(),
			})

			err := next(ctx, event)

			duration := time.Since(start)

			// Record processing time
			metrics.RecordHistogram("event_processing_duration_seconds", duration.Seconds(), map[string]string{
				"event_type": event.Type(),
			})

			// Record success/failure
			if err != nil {
				metrics.IncrementCounter("events_failed_total", map[string]string{
					"event_type": event.Type(),
					"error":      err.Error(),
				})
			} else {
				metrics.IncrementCounter("events_succeeded_total", map[string]string{
					"event_type": event.Type(),
				})
			}

			return err
		}
	}
}

// ErrorHandlingMiddleware provides centralized error handling
func ErrorHandlingMiddleware(errorHandler ErrorHandler) EventMiddleware {
	return func(next EventHandler) EventHandler {
		return func(ctx context.Context, event Event) error {
			defer func() {
				if r := recover(); r != nil {
					errorHandler.HandlePanic(ctx, event, r)
				}
			}()

			err := next(ctx, event)
			if err != nil {
				errorHandler.HandleError(ctx, event, err)
			}

			return err
		}
	}
}

// ============================================================================
// INTERFACES
// ============================================================================

// MetricsCollector defines the interface for metrics collection
type MetricsCollector interface {
	IncrementCounter(name string, labels map[string]string)
	RecordHistogram(name string, value float64, labels map[string]string)
}

// ErrorHandler defines the interface for error handling
type ErrorHandler interface {
	HandleError(ctx context.Context, event Event, err error)
	HandlePanic(ctx context.Context, event Event, recovered interface{})
}
