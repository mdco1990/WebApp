package validation

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/mdco1990/webapp/internal/domain"
)

// StrategyValidationError represents a validation error for strategy-based validation
type StrategyValidationError struct {
	Field   string      `json:"field"`
	Message string      `json:"message"`
	Value   interface{} `json:"value,omitempty"`
	Code    string      `json:"code,omitempty"`
}

// Error implements the error interface
func (sve StrategyValidationError) Error() string {
	return fmt.Sprintf("%s: %s", sve.Field, sve.Message)
}

// StrategyValidationErrors represents multiple strategy validation errors
type StrategyValidationErrors []StrategyValidationError

// Error implements the error interface
func (sves StrategyValidationErrors) Error() string {
	if len(sves) == 0 {
		return "no validation errors"
	}

	messages := make([]string, len(sves))
	for i, err := range sves {
		messages[i] = err.Error()
	}

	return strings.Join(messages, "; ")
}

// GetErrors returns the validation errors
func (sves StrategyValidationErrors) GetErrors() []StrategyValidationError {
	return []StrategyValidationError(sves)
}

// ValidationStrategy defines the interface for validation strategies
type ValidationStrategy interface {
	Validate(ctx context.Context, data interface{}) error
	GetName() string
	GetContext() string
}

// ValidationResult represents the result of validation
type ValidationResult struct {
	IsValid bool
	Errors  []StrategyValidationError
}

// StrictValidation implements strict validation rules
type StrictValidation struct {
	context string
}

// NewStrictValidation creates a new strict validation strategy
func NewStrictValidation(context string) *StrictValidation {
	return &StrictValidation{
		context: context,
	}
}

// GetName returns the strategy name
func (s *StrictValidation) GetName() string {
	return "strict"
}

// GetContext returns the validation context
func (s *StrictValidation) GetContext() string {
	return s.context
}

// Validate implements strict validation
func (s *StrictValidation) Validate(ctx context.Context, data interface{}) error {
	var errors []StrategyValidationError

	switch v := data.(type) {
	case *domain.Expense:
		errors = s.validateExpenseStrict(v)
	case *domain.IncomeSource:
		errors = s.validateIncomeSourceStrict(v)
	case *domain.BudgetSource:
		errors = s.validateBudgetSourceStrict(v)
	case *domain.User:
		errors = s.validateUserStrict(v)
	case *domain.LoginRequest:
		errors = s.validateLoginRequestStrict(v)
	default:
		return fmt.Errorf("unsupported data type for strict validation: %T", data)
	}

	if len(errors) > 0 {
		return StrategyValidationErrors(errors)
	}

	return nil
}

// validateExpenseStrict validates an expense with strict rules
func (s *StrictValidation) validateExpenseStrict(expense *domain.Expense) []StrategyValidationError {
	var errors []StrategyValidationError

	// Description validation
	if expense.Description == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "description",
			Message: "description is required",
			Code:    "REQUIRED",
		})
	} else if len(expense.Description) < 3 {
		errors = append(errors, StrategyValidationError{
			Field:   "description",
			Message: "description must be at least 3 characters long",
			Code:    "MIN_LENGTH",
			Value:   len(expense.Description),
		})
	} else if len(expense.Description) > 255 {
		errors = append(errors, StrategyValidationError{
			Field:   "description",
			Message: "description must be at most 255 characters long",
			Code:    "MAX_LENGTH",
			Value:   len(expense.Description),
		})
	}

	// Amount validation
	if expense.AmountCents <= 0 {
		errors = append(errors, StrategyValidationError{
			Field:   "amount_cents",
			Message: "amount must be positive",
			Code:    "POSITIVE",
			Value:   expense.AmountCents,
		})
	} else if expense.AmountCents > 999999999 {
		errors = append(errors, StrategyValidationError{
			Field:   "amount_cents",
			Message: "amount is too large",
			Code:    "MAX_VALUE",
			Value:   expense.AmountCents,
		})
	}

	// Category validation
	if expense.Category == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "category",
			Message: "category is required",
			Code:    "REQUIRED",
		})
	} else {
		validCategories := []string{"Food", "Transport", "Entertainment", "Utilities", "Healthcare", "Other"}
		isValid := false
		for _, cat := range validCategories {
			if cat == expense.Category {
				isValid = true
				break
			}
		}
		if !isValid {
			errors = append(errors, StrategyValidationError{
				Field:   "category",
				Message: fmt.Sprintf("category must be one of: %s", strings.Join(validCategories, ", ")),
				Code:    "ENUM",
				Value:   expense.Category,
			})
		}
	}

	// Date validation
	if expense.YearMonth.Year < 2020 || expense.YearMonth.Year > 2030 {
		errors = append(errors, StrategyValidationError{
			Field:   "year_month",
			Message: "year must be between 2020 and 2030",
			Code:    "RANGE",
			Value:   expense.YearMonth.Year,
		})
	}

	if expense.YearMonth.Month < 1 || expense.YearMonth.Month > 12 {
		errors = append(errors, StrategyValidationError{
			Field:   "year_month",
			Message: "month must be between 1 and 12",
			Code:    "RANGE",
			Value:   expense.YearMonth.Month,
		})
	}

	return errors
}

// validateIncomeSourceStrict validates an income source with strict rules
func (s *StrictValidation) validateIncomeSourceStrict(income *domain.IncomeSource) []StrategyValidationError {
	var errors []StrategyValidationError

	// Name validation
	if income.Name == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "name",
			Message: "name is required",
			Code:    "REQUIRED",
		})
	} else if len(income.Name) < 2 {
		errors = append(errors, StrategyValidationError{
			Field:   "name",
			Message: "name must be at least 2 characters long",
			Code:    "MIN_LENGTH",
			Value:   len(income.Name),
		})
	} else if len(income.Name) > 100 {
		errors = append(errors, StrategyValidationError{
			Field:   "name",
			Message: "name must be at most 100 characters long",
			Code:    "MAX_LENGTH",
			Value:   len(income.Name),
		})
	}

	// Amount validation
	if income.AmountCents <= 0 {
		errors = append(errors, StrategyValidationError{
			Field:   "amount_cents",
			Message: "amount must be positive",
			Code:    "POSITIVE",
			Value:   income.AmountCents,
		})
	}

	// Date validation
	if income.YearMonth.Year < 2020 || income.YearMonth.Year > 2030 {
		errors = append(errors, StrategyValidationError{
			Field:   "year_month",
			Message: "year must be between 2020 and 2030",
			Code:    "RANGE",
			Value:   income.YearMonth.Year,
		})
	}

	return errors
}

// validateBudgetSourceStrict validates a budget source with strict rules
func (s *StrictValidation) validateBudgetSourceStrict(budget *domain.BudgetSource) []StrategyValidationError {
	var errors []StrategyValidationError

	// Name validation
	if budget.Name == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "name",
			Message: "name is required",
			Code:    "REQUIRED",
		})
	} else if len(budget.Name) < 2 {
		errors = append(errors, StrategyValidationError{
			Field:   "name",
			Message: "name must be at least 2 characters long",
			Code:    "MIN_LENGTH",
			Value:   len(budget.Name),
		})
	}

	// Amount validation
	if budget.AmountCents < 0 {
		errors = append(errors, StrategyValidationError{
			Field:   "amount_cents",
			Message: "amount cannot be negative",
			Code:    "NON_NEGATIVE",
			Value:   budget.AmountCents,
		})
	}

	return errors
}

// validateUserStrict validates a user with strict rules
func (s *StrictValidation) validateUserStrict(user *domain.User) []StrategyValidationError {
	var errors []StrategyValidationError

	// Username validation
	if user.Username == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "username",
			Message: "username is required",
			Code:    "REQUIRED",
		})
	} else {
		usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9_]{3,20}$`)
		if !usernameRegex.MatchString(user.Username) {
			errors = append(errors, StrategyValidationError{
				Field:   "username",
				Message: "username must be 3-20 characters long and contain only letters, numbers, and underscores",
				Code:    "PATTERN",
				Value:   user.Username,
			})
		}
	}

	// Email validation
	if user.Email == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "email",
			Message: "email is required",
			Code:    "REQUIRED",
		})
	} else {
		emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
		if !emailRegex.MatchString(user.Email) {
			errors = append(errors, StrategyValidationError{
				Field:   "email",
				Message: "invalid email format",
				Code:    "PATTERN",
				Value:   user.Email,
			})
		}
	}

	return errors
}

// validateLoginRequestStrict validates a login request with strict rules
func (s *StrictValidation) validateLoginRequestStrict(login *domain.LoginRequest) []StrategyValidationError {
	var errors []StrategyValidationError

	// Username validation
	if login.Username == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "username",
			Message: "username is required",
			Code:    "REQUIRED",
		})
	}

	// Password validation
	if login.Password == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "password",
			Message: "password is required",
			Code:    "REQUIRED",
		})
	} else if len(login.Password) < 6 {
		errors = append(errors, StrategyValidationError{
			Field:   "password",
			Message: "password must be at least 6 characters long",
			Code:    "MIN_LENGTH",
			Value:   len(login.Password),
		})
	}

	return errors
}

// RelaxedValidation implements relaxed validation rules
type RelaxedValidation struct {
	context string
}

// NewRelaxedValidation creates a new relaxed validation strategy
func NewRelaxedValidation(context string) *RelaxedValidation {
	return &RelaxedValidation{
		context: context,
	}
}

// GetName returns the strategy name
func (r *RelaxedValidation) GetName() string {
	return "relaxed"
}

// GetContext returns the validation context
func (r *RelaxedValidation) GetContext() string {
	return r.context
}

// Validate implements relaxed validation
func (r *RelaxedValidation) Validate(ctx context.Context, data interface{}) error {
	var errors []StrategyValidationError

	switch v := data.(type) {
	case *domain.Expense:
		errors = r.validateExpenseRelaxed(v)
	case *domain.IncomeSource:
		errors = r.validateIncomeSourceRelaxed(v)
	case *domain.BudgetSource:
		errors = r.validateBudgetSourceRelaxed(v)
	case *domain.User:
		errors = r.validateUserRelaxed(v)
	case *domain.LoginRequest:
		errors = r.validateLoginRequestRelaxed(v)
	default:
		return fmt.Errorf("unsupported data type for relaxed validation: %T", data)
	}

	if len(errors) > 0 {
		return StrategyValidationErrors(errors)
	}

	return nil
}

// validateExpenseRelaxed validates an expense with relaxed rules
func (r *RelaxedValidation) validateExpenseRelaxed(expense *domain.Expense) []StrategyValidationError {
	var errors []StrategyValidationError

	// Only validate essential fields
	if expense.Description == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "description",
			Message: "description is required",
			Code:    "REQUIRED",
		})
	}

	if expense.AmountCents <= 0 {
		errors = append(errors, StrategyValidationError{
			Field:   "amount_cents",
			Message: "amount must be positive",
			Code:    "POSITIVE",
			Value:   expense.AmountCents,
		})
	}

	return errors
}

// validateIncomeSourceRelaxed validates an income source with relaxed rules
func (r *RelaxedValidation) validateIncomeSourceRelaxed(income *domain.IncomeSource) []StrategyValidationError {
	var errors []StrategyValidationError

	if income.Name == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "name",
			Message: "name is required",
			Code:    "REQUIRED",
		})
	}

	if income.AmountCents <= 0 {
		errors = append(errors, StrategyValidationError{
			Field:   "amount_cents",
			Message: "amount must be positive",
			Code:    "POSITIVE",
			Value:   income.AmountCents,
		})
	}

	return errors
}

// validateBudgetSourceRelaxed validates a budget source with relaxed rules
func (r *RelaxedValidation) validateBudgetSourceRelaxed(budget *domain.BudgetSource) []StrategyValidationError {
	var errors []StrategyValidationError

	if budget.Name == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "name",
			Message: "name is required",
			Code:    "REQUIRED",
		})
	}

	return errors
}

// validateUserRelaxed validates a user with relaxed rules
func (r *RelaxedValidation) validateUserRelaxed(user *domain.User) []StrategyValidationError {
	var errors []StrategyValidationError

	if user.Username == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "username",
			Message: "username is required",
			Code:    "REQUIRED",
		})
	}

	return errors
}

// validateLoginRequestRelaxed validates a login request with relaxed rules
func (r *RelaxedValidation) validateLoginRequestRelaxed(login *domain.LoginRequest) []StrategyValidationError {
	var errors []StrategyValidationError

	if login.Username == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "username",
			Message: "username is required",
			Code:    "REQUIRED",
		})
	}

	if login.Password == "" {
		errors = append(errors, StrategyValidationError{
			Field:   "password",
			Message: "password is required",
			Code:    "REQUIRED",
		})
	}

	return errors
}

// CustomValidation implements custom validation rules
type CustomValidation struct {
	context string
	rules   map[string]ValidationRule
}

// ValidationRule represents a custom validation rule
type ValidationRule struct {
	Field    string
	Required bool
	Min      interface{}
	Max      interface{}
	Pattern  string
	Custom   func(interface{}) error
}

// NewCustomValidation creates a new custom validation strategy
func NewCustomValidation(context string) *CustomValidation {
	return &CustomValidation{
		context: context,
		rules:   make(map[string]ValidationRule),
	}
}

// AddRule adds a custom validation rule
func (c *CustomValidation) AddRule(field string, rule ValidationRule) {
	c.rules[field] = rule
}

// GetName returns the strategy name
func (c *CustomValidation) GetName() string {
	return "custom"
}

// GetContext returns the validation context
func (c *CustomValidation) GetContext() string {
	return c.context
}

// Validate implements custom validation
func (c *CustomValidation) Validate(ctx context.Context, data interface{}) error {
	var errors []StrategyValidationError

	// Use reflection to validate fields based on custom rules
	val := reflect.ValueOf(data).Elem()
	typ := val.Type()

	for i := 0; i < val.NumField(); i++ {
		field := val.Field(i)
		fieldType := typ.Field(i)
		fieldName := fieldType.Name

		if rule, exists := c.rules[fieldName]; exists {
			if err := c.validateField(field, rule); err != nil {
				errors = append(errors, StrategyValidationError{
					Field:   fieldName,
					Message: err.Error(),
					Value:   field.Interface(),
				})
			}
		}
	}

	if len(errors) > 0 {
		return StrategyValidationErrors(errors)
	}

	return nil
}

// validateField validates a single field based on custom rules
func (c *CustomValidation) validateField(field reflect.Value, rule ValidationRule) error {
	// Check if field is required
	if rule.Required && field.IsZero() {
		return errors.New("field is required")
	}

	// Skip further validation if field is empty and not required
	if field.IsZero() {
		return nil
	}

	// Apply custom validation function if provided
	if rule.Custom != nil {
		if err := rule.Custom(field.Interface()); err != nil {
			return err
		}
	}

	// Apply pattern validation if provided
	if rule.Pattern != "" {
		if err := c.validatePattern(field, rule.Pattern); err != nil {
			return err
		}
	}

	// Apply min/max validation
	if err := c.validateRange(field, rule.Min, rule.Max); err != nil {
		return err
	}

	return nil
}

// validatePattern validates a field against a regex pattern
func (c *CustomValidation) validatePattern(field reflect.Value, pattern string) error {
	if field.Kind() != reflect.String {
		return nil
	}

	regex := regexp.MustCompile(pattern)
	if !regex.MatchString(field.String()) {
		return fmt.Errorf("field does not match pattern: %s", pattern)
	}

	return nil
}

// validateRange validates a field against min/max values
func (c *CustomValidation) validateRange(field reflect.Value, min, max interface{}) error {
	switch field.Kind() {
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		value := field.Int()
		if min != nil {
			if minVal, ok := min.(int64); ok && value < minVal {
				return fmt.Errorf("value must be at least %d", minVal)
			}
		}
		if max != nil {
			if maxVal, ok := max.(int64); ok && value > maxVal {
				return fmt.Errorf("value must be at most %d", maxVal)
			}
		}
	case reflect.String:
		value := field.String()
		if min != nil {
			if minVal, ok := min.(int); ok && len(value) < minVal {
				return fmt.Errorf("length must be at least %d", minVal)
			}
		}
		if max != nil {
			if maxVal, ok := max.(int); ok && len(value) > maxVal {
				return fmt.Errorf("length must be at most %d", maxVal)
			}
		}
	}

	return nil
}

// ValidationService manages multiple validation strategies
type ValidationService struct {
	strategies      map[string]ValidationStrategy
	defaultStrategy string
}

// NewValidationService creates a new validation service
func NewValidationService() *ValidationService {
	return &ValidationService{
		strategies:      make(map[string]ValidationStrategy),
		defaultStrategy: "strict",
	}
}

// RegisterStrategy registers a validation strategy
func (vs *ValidationService) RegisterStrategy(strategy ValidationStrategy) {
	vs.strategies[strategy.GetName()] = strategy
}

// SetDefaultStrategy sets the default validation strategy
func (vs *ValidationService) SetDefaultStrategy(name string) {
	if _, exists := vs.strategies[name]; exists {
		vs.defaultStrategy = name
	}
}

// Validate validates data using the specified strategy
func (vs *ValidationService) Validate(ctx context.Context, strategyName string, data interface{}) error {
	strategy, exists := vs.strategies[strategyName]
	if !exists {
		return fmt.Errorf("validation strategy not found: %s", strategyName)
	}
	return strategy.Validate(ctx, data)
}

// ValidateDefault validates data using the default strategy
func (vs *ValidationService) ValidateDefault(ctx context.Context, data interface{}) error {
	return vs.Validate(ctx, vs.defaultStrategy, data)
}

// ValidateByContext validates data using a strategy based on context
func (vs *ValidationService) ValidateByContext(ctx context.Context, context string, data interface{}) error {
	// Find strategy by context
	for _, strategy := range vs.strategies {
		if strategy.GetContext() == context {
			return strategy.Validate(ctx, data)
		}
	}

	// Fall back to default strategy
	return vs.ValidateDefault(ctx, data)
}

// GetAvailableStrategies returns the list of available validation strategies
func (vs *ValidationService) GetAvailableStrategies() []string {
	strategies := make([]string, 0, len(vs.strategies))
	for name := range vs.strategies {
		strategies = append(strategies, name)
	}
	return strategies
}

// GetDefaultStrategy returns the default validation strategy name
func (vs *ValidationService) GetDefaultStrategy() string {
	return vs.defaultStrategy
}
