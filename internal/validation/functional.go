// Package validation implements functional validation patterns.
package validation

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/mdco1990/webapp/internal/domain"
)

// Validator is a function type that validates a value and returns an error if validation fails.
type Validator func(interface{}) error

// ValidationError represents a validation error with field and message.
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (ve ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", ve.Field, ve.Message)
}

// ValidationErrors is a collection of validation errors.
type ValidationErrors []ValidationError

func (ves ValidationErrors) Error() string {
	messages := make([]string, len(ves))
	for i, ve := range ves {
		messages[i] = ve.Error()
	}
	return strings.Join(messages, "; ")
}

// Chain combines multiple validators into a single validator.
// All validators are executed, and all errors are collected.
func Chain(validators ...Validator) Validator {
	return func(v interface{}) error {
		var errors ValidationErrors
		for _, validator := range validators {
			if err := validator(v); err != nil {
				// Try to convert to ValidationError
				if ve, ok := err.(ValidationError); ok {
					errors = append(errors, ve)
				} else if ves, ok := err.(ValidationErrors); ok {
					errors = append(errors, ves...)
				} else {
					// Create a generic validation error
					errors = append(errors, ValidationError{
						Field:   "unknown",
						Message: err.Error(),
					})
				}
			}
		}
		if len(errors) > 0 {
			return errors
		}
		return nil
	}
}

// Compose combines multiple validators into a single validator.
// Execution stops at the first error (short-circuit evaluation).
func Compose(validators ...Validator) Validator {
	return func(v interface{}) error {
		for _, validator := range validators {
			if err := validator(v); err != nil {
				return err
			}
		}
		return nil
	}
}

// Specific validators for domain entities

// ValidateAmount validates that an expense has a positive amount.
func ValidateAmount(v interface{}) error {
	expense, ok := v.(*domain.Expense)
	if !ok {
		return ValidationError{Field: "amount", Message: "invalid type for amount validation"}
	}

	if expense.AmountCents <= 0 {
		return ValidationError{Field: "amount_cents", Message: "amount must be positive"}
	}

	// Additional business rules
	if expense.AmountCents > 999999999 { // $9,999,999.99
		return ValidationError{Field: "amount_cents", Message: "amount exceeds maximum allowed"}
	}

	return nil
}

// ValidateDescription validates that an expense has a valid description.
func ValidateDescription(v interface{}) error {
	expense, ok := v.(*domain.Expense)
	if !ok {
		return ValidationError{Field: "description", Message: "invalid type for description validation"}
	}

	if strings.TrimSpace(expense.Description) == "" {
		return ValidationError{Field: "description", Message: "description is required"}
	}

	if len(expense.Description) > 255 {
		return ValidationError{Field: "description", Message: "description too long (max 255 characters)"}
	}

	// Check for potentially problematic content
	if strings.Contains(strings.ToLower(expense.Description), "test") {
		return ValidationError{Field: "description", Message: "description contains invalid content"}
	}

	return nil
}

// ValidateYearMonth validates that a year/month combination is valid.
func ValidateYearMonth(v interface{}) error {
	var ym domain.YearMonth

	switch val := v.(type) {
	case domain.YearMonth:
		ym = val
	case *domain.Expense:
		ym = domain.YearMonth{Year: val.Year, Month: val.Month}
	case *domain.IncomeSource:
		ym = domain.YearMonth{Year: val.Year, Month: val.Month}
	case *domain.BudgetSource:
		ym = domain.YearMonth{Year: val.Year, Month: val.Month}
	default:
		return ValidationError{Field: "year_month", Message: "invalid type for year/month validation"}
	}

	if ym.Year < 1970 || ym.Year > 3000 {
		return ValidationError{Field: "year", Message: "year must be between 1970 and 3000"}
	}

	if ym.Month < 1 || ym.Month > 12 {
		return ValidationError{Field: "month", Message: "month must be between 1 and 12"}
	}

	return nil
}

// ValidateCategory validates that an expense has a valid category.
func ValidateCategory(v interface{}) error {
	expense, ok := v.(*domain.Expense)
	if !ok {
		return ValidationError{Field: "category", Message: "invalid type for category validation"}
	}

	// Category is optional, but if provided, validate it
	if expense.Category != "" {
		if len(expense.Category) > 100 {
			return ValidationError{Field: "category", Message: "category too long (max 100 characters)"}
		}

		// Check for valid categories (could be expanded)
		validCategories := []string{"food", "transport", "entertainment", "utilities", "shopping", "health", "other"}
		isValid := false
		for _, cat := range validCategories {
			if strings.ToLower(expense.Category) == cat {
				isValid = true
				break
			}
		}

		if !isValid {
			return ValidationError{Field: "category", Message: "invalid category"}
		}
	}

	return nil
}

// ValidateIncomeSource validates income source data.
func ValidateIncomeSource(v interface{}) error {
	source, ok := v.(*domain.IncomeSource)
	if !ok {
		return ValidationError{Field: "income_source", Message: "invalid type for income source validation"}
	}

	if strings.TrimSpace(source.Name) == "" {
		return ValidationError{Field: "name", Message: "income source name is required"}
	}

	if len(source.Name) > 100 {
		return ValidationError{Field: "name", Message: "income source name too long (max 100 characters)"}
	}

	if source.AmountCents <= 0 {
		return ValidationError{Field: "amount_cents", Message: "income amount must be positive"}
	}

	if source.AmountCents > 999999999 {
		return ValidationError{Field: "amount_cents", Message: "income amount exceeds maximum allowed"}
	}

	return nil
}

// ValidateBudgetSource validates budget source data.
func ValidateBudgetSource(v interface{}) error {
	source, ok := v.(*domain.BudgetSource)
	if !ok {
		return ValidationError{Field: "budget_source", Message: "invalid type for budget source validation"}
	}

	if strings.TrimSpace(source.Name) == "" {
		return ValidationError{Field: "name", Message: "budget source name is required"}
	}

	if len(source.Name) > 100 {
		return ValidationError{Field: "name", Message: "budget source name too long (max 100 characters)"}
	}

	if source.AmountCents < 0 {
		return ValidationError{Field: "amount_cents", Message: "budget amount cannot be negative"}
	}

	if source.AmountCents > 999999999 {
		return ValidationError{Field: "amount_cents", Message: "budget amount exceeds maximum allowed"}
	}

	return nil
}

// ValidateUser validates user data.
func ValidateUser(v interface{}) error {
	user, ok := v.(*domain.User)
	if !ok {
		return ValidationError{Field: "user", Message: "invalid type for user validation"}
	}

	if strings.TrimSpace(user.Username) == "" {
		return ValidationError{Field: "username", Message: "username is required"}
	}

	if len(user.Username) < 3 {
		return ValidationError{Field: "username", Message: "username must be at least 3 characters"}
	}

	if len(user.Username) > 50 {
		return ValidationError{Field: "username", Message: "username too long (max 50 characters)"}
	}

	// Username format validation
	if !strings.Contains(user.Username, " ") && len(user.Username) >= 3 {
		// Basic format check - no spaces, minimum length
	} else {
		return ValidationError{Field: "username", Message: "username format is invalid"}
	}

	if user.Email != "" {
		if !isValidEmail(user.Email) {
			return ValidationError{Field: "email", Message: "invalid email format"}
		}
	}

	return nil
}

// Utility functions

// isValidEmail performs basic email validation.
func isValidEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}

// ValidateRequired validates that a field is not empty.
func ValidateRequired(fieldName string) Validator {
	return func(v interface{}) error {
		val := reflect.ValueOf(v)
		if val.Kind() == reflect.Ptr {
			val = val.Elem()
		}

		field := val.FieldByName(fieldName)
		if !field.IsValid() {
			return ValidationError{Field: fieldName, Message: "field not found"}
		}

		switch field.Kind() {
		case reflect.String:
			if strings.TrimSpace(field.String()) == "" {
				return ValidationError{Field: fieldName, Message: "field is required"}
			}
		case reflect.Int, reflect.Int64:
			if field.Int() == 0 {
				return ValidationError{Field: fieldName, Message: "field is required"}
			}
		default:
			if field.IsZero() {
				return ValidationError{Field: fieldName, Message: "field is required"}
			}
		}

		return nil
	}
}

// ValidateMinLength validates minimum string length.
func ValidateMinLength(fieldName string, minLength int) Validator {
	return func(v interface{}) error {
		val := reflect.ValueOf(v)
		if val.Kind() == reflect.Ptr {
			val = val.Elem()
		}

		field := val.FieldByName(fieldName)
		if !field.IsValid() {
			return ValidationError{Field: fieldName, Message: "field not found"}
		}

		if field.Kind() != reflect.String {
			return ValidationError{Field: fieldName, Message: "field is not a string"}
		}

		if len(field.String()) < minLength {
			return ValidationError{Field: fieldName, Message: fmt.Sprintf("minimum length is %d characters", minLength)}
		}

		return nil
	}
}

// ValidateMaxLength validates maximum string length.
func ValidateMaxLength(fieldName string, maxLength int) Validator {
	return func(v interface{}) error {
		val := reflect.ValueOf(v)
		if val.Kind() == reflect.Ptr {
			val = val.Elem()
		}

		field := val.FieldByName(fieldName)
		if !field.IsValid() {
			return ValidationError{Field: fieldName, Message: "field not found"}
		}

		if field.Kind() != reflect.String {
			return ValidationError{Field: fieldName, Message: "field is not a string"}
		}

		if len(field.String()) > maxLength {
			return ValidationError{Field: fieldName, Message: fmt.Sprintf("maximum length is %d characters", maxLength)}
		}

		return nil
	}
}

// ValidateRange validates numeric range.
func ValidateRange(fieldName string, min, max int64) Validator {
	return func(v interface{}) error {
		val := reflect.ValueOf(v)
		if val.Kind() == reflect.Ptr {
			val = val.Elem()
		}

		field := val.FieldByName(fieldName)
		if !field.IsValid() {
			return ValidationError{Field: fieldName, Message: "field not found"}
		}

		var num int64
		switch field.Kind() {
		case reflect.Int, reflect.Int64:
			num = field.Int()
		default:
			return ValidationError{Field: fieldName, Message: "field is not a number"}
		}

		if num < min || num > max {
			return ValidationError{Field: fieldName, Message: fmt.Sprintf("value must be between %d and %d", min, max)}
		}

		return nil
	}
}

// Predefined validation chains for common use cases

// ValidateExpense creates a validation chain for expense entities.
func ValidateExpense() Validator {
	return Chain(
		ValidateAmount,
		ValidateDescription,
		ValidateYearMonth,
		ValidateCategory,
	)
}

// ValidateIncomeSource creates a validation chain for income source entities.
func ValidateIncomeSourceChain() Validator {
	return Chain(
		ValidateIncomeSource,
		ValidateYearMonth,
	)
}

// ValidateBudgetSource creates a validation chain for budget source entities.
func ValidateBudgetSourceChain() Validator {
	return Chain(
		ValidateBudgetSource,
		ValidateYearMonth,
	)
}

// ValidateUserChain creates a validation chain for user entities.
func ValidateUserChain() Validator {
	return Chain(
		ValidateUser,
	)
}
