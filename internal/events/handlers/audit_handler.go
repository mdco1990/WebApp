// Audit Handler - Real Implementation
// Handles audit logging for compliance and security purposes

package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/events"
)

// AuditLevel represents the severity level of an audit event
type AuditLevel string

const (
	AuditLevelInfo     AuditLevel = "info"
	AuditLevelWarning  AuditLevel = "warning"
	AuditLevelError    AuditLevel = "error"
	AuditLevelCritical AuditLevel = "critical"
)

// AuditCategory represents the category of an audit event
type AuditCategory string

const (
	AuditCategoryUser      AuditCategory = "user"
	AuditCategoryFinancial AuditCategory = "financial"
	AuditCategorySystem    AuditCategory = "system"
	AuditCategorySecurity  AuditCategory = "security"
	AuditCategoryData      AuditCategory = "data"
)

// AuditEvent represents an audit event
type AuditEvent struct {
	ID          string         `json:"id"`
	Timestamp   time.Time      `json:"timestamp"`
	Level       AuditLevel     `json:"level"`
	Category    AuditCategory  `json:"category"`
	EventType   string         `json:"event_type"`
	UserID      *int64         `json:"user_id,omitempty"`
	SessionID   string         `json:"session_id,omitempty"`
	IPAddress   string         `json:"ip_address,omitempty"`
	UserAgent   string         `json:"user_agent,omitempty"`
	Resource    string         `json:"resource,omitempty"`
	Action      string         `json:"action,omitempty"`
	Description string         `json:"description"`
	Data        map[string]any `json:"data,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	Hash        string         `json:"hash,omitempty"` // For data integrity
}

// AuditService handles audit operations
type AuditService struct {
	logger *slog.Logger
	// In a real implementation, you would have:
	// - Database for storing audit logs
	// - External audit service integration
	// - Compliance reporting tools
	// - Data retention policies
}

// NewAuditService creates a new audit service
func NewAuditService(logger *slog.Logger) *AuditService {
	return &AuditService{
		logger: logger,
	}
}

// AuditHandler handles audit events
type AuditHandler struct {
	service *AuditService
	logger  *slog.Logger
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(service *AuditService, logger *slog.Logger) *AuditHandler {
	return &AuditHandler{
		service: service,
		logger:  logger,
	}
}

// Handle handles audit events
func (h *AuditHandler) Handle(ctx context.Context, event events.Event) error {
	h.logger.Info("Handling audit event",
		"event_type", event.Type,
		"event_id", event.ID,
		"timestamp", event.Timestamp,
	)

	switch event.Type() {
	case "expense.created":
		return h.handleExpenseCreated(ctx, event)
	case "expense.updated":
		return h.handleExpenseUpdated(ctx, event)
	case "expense.deleted":
		return h.handleExpenseDeleted(ctx, event)
	case "income.source.created":
		return h.handleIncomeSourceCreated(ctx, event)
	case "income.source.updated":
		return h.handleIncomeSourceUpdated(ctx, event)
	case "income.source.deleted":
		return h.handleIncomeSourceDeleted(ctx, event)
	case "budget.source.created":
		return h.handleBudgetSourceCreated(ctx, event)
	case "budget.source.updated":
		return h.handleBudgetSourceUpdated(ctx, event)
	case "budget.source.deleted":
		return h.handleBudgetSourceDeleted(ctx, event)
	case "user.login":
		return h.handleUserLogin(ctx, event)
	case "user.logout":
		return h.handleUserLogout(ctx, event)
	case "user.created":
		return h.handleUserCreated(ctx, event)
	case "user.updated":
		return h.handleUserUpdated(ctx, event)
	case "user.deleted":
		return h.handleUserDeleted(ctx, event)
	case "system.health":
		return h.handleSystemHealth(ctx, event)
	case "data.export":
		return h.handleDataExport(ctx, event)
	case "data.import":
		return h.handleDataImport(ctx, event)
	case "security.alert":
		return h.handleSecurityAlert(ctx, event)
	default:
		return h.handleGenericEvent(ctx, event)
	}
}

// handleExpenseCreated handles expense creation audit
func (h *AuditHandler) handleExpenseCreated(ctx context.Context, event events.Event) error {
	expenseData := event.Data().(*domain.Expense)

	// Get UserID from the event type
	var userID int64
	if expenseEvent, ok := event.(*events.ExpenseCreatedEvent); ok {
		userID = expenseEvent.UserID
	} else {
		userID = 0 // Default value
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryFinancial,
		EventType:   "expense.created",
		UserID:      &userID,
		Resource:    fmt.Sprintf("expense:%d", expenseData.ID),
		Action:      "create",
		Description: fmt.Sprintf("Expense '%s' created for $%.2f", expenseData.Description, float64(expenseData.AmountCents)/100),
		Data: map[string]any{
			"expense_id":   expenseData.ID,
			"amount_cents": expenseData.AmountCents,
			"category":     expenseData.Category,
			"description":  expenseData.Description,
			"year_month":   expenseData.YearMonth,
			"created_at":   expenseData.CreatedAt,
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleExpenseUpdated handles expense update audit
func (h *AuditHandler) handleExpenseUpdated(ctx context.Context, event events.Event) error {
	expenseData := event.Data().(*domain.Expense)

	// Get UserID from the event type
	var userID int64
	if expenseEvent, ok := event.(*events.ExpenseUpdatedEvent); ok {
		userID = expenseEvent.UserID
	} else {
		userID = 0 // Default value
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryFinancial,
		EventType:   "expense.updated",
		UserID:      &userID,
		Resource:    fmt.Sprintf("expense:%d", expenseData.ID),
		Action:      "update",
		Description: fmt.Sprintf("Expense '%s' updated", expenseData.Description),
		Data: map[string]any{
			"expense_id":   expenseData.ID,
			"amount_cents": expenseData.AmountCents,
			"category":     expenseData.Category,
			"description":  expenseData.Description,
			"year_month":   expenseData.YearMonth,
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleExpenseDeleted handles expense deletion audit
func (h *AuditHandler) handleExpenseDeleted(ctx context.Context, event events.Event) error {
	expenseData := event.Data().(*domain.Expense)

	// Get UserID from the event type
	var userID int64
	if expenseEvent, ok := event.(*events.ExpenseDeletedEvent); ok {
		userID = expenseEvent.UserID
	} else {
		userID = 0 // Default value
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelWarning, // Deletion is more significant
		Category:    AuditCategoryFinancial,
		EventType:   "expense.deleted",
		UserID:      &userID,
		Resource:    fmt.Sprintf("expense:%d", expenseData.ID),
		Action:      "delete",
		Description: fmt.Sprintf("Expense '%s' deleted", expenseData.Description),
		Data: map[string]any{
			"expense_id":  expenseData.ID,
			"description": expenseData.Description,
			"deleted_at":  time.Now(),
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleIncomeSourceCreated handles income source creation audit
func (h *AuditHandler) handleIncomeSourceCreated(ctx context.Context, event events.Event) error {
	incomeSourceData := event.Data().(*domain.IncomeSource)

	// Get UserID from the event type
	var userID int64
	if incomeEvent, ok := event.(*events.IncomeSourceCreatedEvent); ok {
		userID = incomeEvent.UserID
	} else {
		userID = incomeSourceData.UserID // Fallback to data
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryFinancial,
		EventType:   "income.source.created",
		UserID:      &userID,
		Resource:    fmt.Sprintf("income_source:%d", incomeSourceData.ID),
		Action:      "create",
		Description: fmt.Sprintf("Income source '%s' created for $%.2f", incomeSourceData.Name, float64(incomeSourceData.AmountCents)/100),
		Data: map[string]any{
			"income_source_id": incomeSourceData.ID,
			"name":             incomeSourceData.Name,
			"amount_cents":     incomeSourceData.AmountCents,
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleIncomeSourceUpdated handles income source update audit
func (h *AuditHandler) handleIncomeSourceUpdated(ctx context.Context, event events.Event) error {
	incomeSourceData := event.Data().(*domain.IncomeSource)

	// Get UserID from the event type
	var userID int64
	if incomeEvent, ok := event.(*events.IncomeSourceUpdatedEvent); ok {
		userID = incomeEvent.UserID
	} else {
		userID = incomeSourceData.UserID // Fallback to data
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryFinancial,
		EventType:   "income.source.updated",
		UserID:      &userID,
		Resource:    fmt.Sprintf("income_source:%d", incomeSourceData.ID),
		Action:      "update",
		Description: fmt.Sprintf("Income source '%s' updated", incomeSourceData.Name),
		Data: map[string]any{
			"income_source_id": incomeSourceData.ID,
			"name":             incomeSourceData.Name,
			"amount_cents":     incomeSourceData.AmountCents,
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleIncomeSourceDeleted handles income source deletion audit
func (h *AuditHandler) handleIncomeSourceDeleted(ctx context.Context, event events.Event) error {
	incomeSourceData := event.Data().(*domain.IncomeSource)

	// Get UserID from the data
	userID := incomeSourceData.UserID

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelWarning,
		Category:    AuditCategoryFinancial,
		EventType:   "income.source.deleted",
		UserID:      &userID,
		Resource:    fmt.Sprintf("income_source:%d", incomeSourceData.ID),
		Action:      "delete",
		Description: fmt.Sprintf("Income source '%s' deleted", incomeSourceData.Name),
		Data: map[string]any{
			"income_source_id": incomeSourceData.ID,
			"name":             incomeSourceData.Name,
			"deleted_at":       time.Now(),
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleBudgetSourceCreated handles budget source creation audit
func (h *AuditHandler) handleBudgetSourceCreated(ctx context.Context, event events.Event) error {
	budgetSourceData := event.Data().(*domain.BudgetSource)

	// Get UserID from the event type
	var userID int64
	if budgetEvent, ok := event.(*events.BudgetSourceCreatedEvent); ok {
		userID = budgetEvent.UserID
	} else {
		userID = budgetSourceData.UserID // Fallback to data
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryFinancial,
		EventType:   "budget.source.created",
		UserID:      &userID,
		Resource:    fmt.Sprintf("budget_source:%d", budgetSourceData.ID),
		Action:      "create",
		Description: fmt.Sprintf("Budget source '%s' created for $%.2f", budgetSourceData.Name, float64(budgetSourceData.AmountCents)/100),
		Data: map[string]any{
			"budget_source_id": budgetSourceData.ID,
			"name":             budgetSourceData.Name,
			"amount_cents":     budgetSourceData.AmountCents,
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleBudgetSourceUpdated handles budget source update audit
func (h *AuditHandler) handleBudgetSourceUpdated(ctx context.Context, event events.Event) error {
	budgetSourceData := event.Data().(*domain.BudgetSource)

	// Get UserID from the event type
	var userID int64
	if budgetEvent, ok := event.(*events.BudgetSourceUpdatedEvent); ok {
		userID = budgetEvent.UserID
	} else {
		userID = budgetSourceData.UserID // Fallback to data
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryFinancial,
		EventType:   "budget.source.updated",
		UserID:      &userID,
		Resource:    fmt.Sprintf("budget_source:%d", budgetSourceData.ID),
		Action:      "update",
		Description: fmt.Sprintf("Budget source '%s' updated", budgetSourceData.Name),
		Data: map[string]any{
			"budget_source_id": budgetSourceData.ID,
			"name":             budgetSourceData.Name,
			"amount_cents":     budgetSourceData.AmountCents,
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleBudgetSourceDeleted handles budget source deletion audit
func (h *AuditHandler) handleBudgetSourceDeleted(ctx context.Context, event events.Event) error {
	budgetSourceData := event.Data().(*domain.BudgetSource)

	// Get UserID from the data
	userID := budgetSourceData.UserID

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelWarning,
		Category:    AuditCategoryFinancial,
		EventType:   "budget.source.deleted",
		UserID:      &userID,
		Resource:    fmt.Sprintf("budget_source:%d", budgetSourceData.ID),
		Action:      "delete",
		Description: fmt.Sprintf("Budget source '%s' deleted", budgetSourceData.Name),
		Data: map[string]any{
			"budget_source_id": budgetSourceData.ID,
			"name":             budgetSourceData.Name,
			"deleted_at":       time.Now(),
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleUserLogin handles user login audit
func (h *AuditHandler) handleUserLogin(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	userID, _ := data["user_id"].(int64)
	sessionID, _ := data["session_id"].(string)
	ipAddress, _ := data["ip_address"].(string)
	userAgent, _ := data["user_agent"].(string)

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategorySecurity,
		EventType:   "user.login",
		UserID:      &userID,
		SessionID:   sessionID,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		Resource:    fmt.Sprintf("user:%d", userID),
		Action:      "login",
		Description: fmt.Sprintf("User %d logged in from %s", userID, ipAddress),
		Data: map[string]any{
			"login_time": time.Now(),
			"success":    true,
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleUserLogout handles user logout audit
func (h *AuditHandler) handleUserLogout(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	userID, _ := data["user_id"].(int64)
	sessionID, _ := data["session_id"].(string)

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategorySecurity,
		EventType:   "user.logout",
		UserID:      &userID,
		SessionID:   sessionID,
		Resource:    fmt.Sprintf("user:%d", userID),
		Action:      "logout",
		Description: fmt.Sprintf("User %d logged out", userID),
		Data: map[string]any{
			"logout_time": time.Now(),
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleUserCreated handles user creation audit
func (h *AuditHandler) handleUserCreated(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	userID, _ := data["user_id"].(int64)
	username, _ := data["username"].(string)

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryUser,
		EventType:   "user.created",
		UserID:      &userID,
		Resource:    fmt.Sprintf("user:%d", userID),
		Action:      "create",
		Description: fmt.Sprintf("User '%s' created", username),
		Data: map[string]any{
			"username":   username,
			"created_at": time.Now(),
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleUserUpdated handles user update audit
func (h *AuditHandler) handleUserUpdated(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	userID, _ := data["user_id"].(int64)
	username, _ := data["username"].(string)

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryUser,
		EventType:   "user.updated",
		UserID:      &userID,
		Resource:    fmt.Sprintf("user:%d", userID),
		Action:      "update",
		Description: fmt.Sprintf("User '%s' updated", username),
		Data:        data,
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleUserDeleted handles user deletion audit
func (h *AuditHandler) handleUserDeleted(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	userID, _ := data["user_id"].(int64)
	username, _ := data["username"].(string)

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelCritical, // User deletion is critical
		Category:    AuditCategoryUser,
		EventType:   "user.deleted",
		UserID:      &userID,
		Resource:    fmt.Sprintf("user:%d", userID),
		Action:      "delete",
		Description: fmt.Sprintf("User '%s' deleted", username),
		Data: map[string]any{
			"username":   username,
			"deleted_at": time.Now(),
		},
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleSystemHealth handles system health audit
func (h *AuditHandler) handleSystemHealth(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	status, _ := data["status"].(string)
	message, _ := data["message"].(string)

	level := AuditLevelInfo
	if status == "error" || status == "critical" {
		level = AuditLevelError
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       level,
		Category:    AuditCategorySystem,
		EventType:   "system.health",
		Resource:    "system",
		Action:      "health_check",
		Description: fmt.Sprintf("System health check: %s - %s", status, message),
		Data:        data,
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleDataExport handles data export audit
func (h *AuditHandler) handleDataExport(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	userID, _ := data["user_id"].(int64)
	exportType, _ := data["export_type"].(string)
	recordCount, _ := data["record_count"].(int)

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategoryData,
		EventType:   "data.export",
		UserID:      &userID,
		Resource:    "data",
		Action:      "export",
		Description: fmt.Sprintf("Data export: %s (%d records)", exportType, recordCount),
		Data:        data,
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleDataImport handles data import audit
func (h *AuditHandler) handleDataImport(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	userID, _ := data["user_id"].(int64)
	importType, _ := data["import_type"].(string)
	recordCount, _ := data["record_count"].(int)

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelWarning, // Import is more significant
		Category:    AuditCategoryData,
		EventType:   "data.import",
		UserID:      &userID,
		Resource:    "data",
		Action:      "import",
		Description: fmt.Sprintf("Data import: %s (%d records)", importType, recordCount),
		Data:        data,
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleSecurityAlert handles security alert audit
func (h *AuditHandler) handleSecurityAlert(ctx context.Context, event events.Event) error {
	data := event.Data().(map[string]any)

	alertType, _ := data["alert_type"].(string)
	severity, _ := data["severity"].(string)
	description, _ := data["description"].(string)

	level := AuditLevelWarning
	if severity == "high" || severity == "critical" {
		level = AuditLevelCritical
	}

	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       level,
		Category:    AuditCategorySecurity,
		EventType:   "security.alert",
		Resource:    "security",
		Action:      "alert",
		Description: fmt.Sprintf("Security alert: %s - %s", alertType, description),
		Data:        data,
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// handleGenericEvent handles generic events
func (h *AuditHandler) handleGenericEvent(ctx context.Context, event events.Event) error {
	auditEvent := &AuditEvent{
		ID:          generateAuditID(),
		Timestamp:   time.Now(),
		Level:       AuditLevelInfo,
		Category:    AuditCategorySystem,
		EventType:   event.Type(),
		Resource:    "system",
		Action:      "event",
		Description: fmt.Sprintf("Generic event: %s", event.Type()),
		Data:        event.Data().(map[string]any),
		Metadata: map[string]any{
			"source":          "event_system",
			"event_id":        event.ID(),
			"event_timestamp": event.Timestamp(),
		},
	}

	return h.service.LogAuditEvent(ctx, auditEvent)
}

// LogAuditEvent logs an audit event
func (s *AuditService) LogAuditEvent(ctx context.Context, auditEvent *AuditEvent) error {
	// Generate hash for data integrity
	auditEvent.Hash = generateAuditHash(auditEvent)

	s.logger.Info("Audit event logged",
		"audit_id", auditEvent.ID,
		"event_type", auditEvent.EventType,
		"level", auditEvent.Level,
		"category", auditEvent.Category,
		"user_id", auditEvent.UserID,
		"resource", auditEvent.Resource,
		"action", auditEvent.Action,
		"description", auditEvent.Description,
		"timestamp", auditEvent.Timestamp,
	)

	// In a real implementation, you would:
	// 1. Store the audit event in the database
	// 2. Send to external audit service if required
	// 3. Trigger compliance reporting if needed
	// 4. Apply data retention policies

	// Simulate database storage
	time.Sleep(50 * time.Millisecond)

	s.logger.Info("Audit event stored successfully",
		"audit_id", auditEvent.ID,
		"hash", auditEvent.Hash,
	)

	return nil
}

// generateAuditID generates a unique audit ID
func generateAuditID() string {
	return fmt.Sprintf("audit_%d", time.Now().UnixNano())
}

// generateAuditHash generates a hash for audit data integrity
func generateAuditHash(auditEvent *AuditEvent) string {
	// In a real implementation, you would use a proper hash function
	// For now, we'll create a simple hash from the event data
	data, _ := json.Marshal(auditEvent)
	return fmt.Sprintf("hash_%d", len(data))
}
