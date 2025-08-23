// Package validation implements functional validation patterns.
package validation

import (
	"errors"
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/mdco1990/webapp/internal/domain"
)

// Validator is a function type that validates a value and returns an error if validation fails.
type Validator func(interface{}) error

// Error represents a single validation error.
type Error struct {
	Field   string      `json:"field"`
	Message string      `json:"message"`
	Value   interface{} `json:"value"`
}

// Error implements the error interface.
func (e Error) Error() string {
	return fmt.Sprintf("%s: %s (value: %v)", e.Field, e.Message, e.Value)
}

// Errors represents multiple validation errors.
type Errors []Error

// Error implements the error interface.
func (e Errors) Error() string {
	if len(e) == 0 {
		return ""
	}

	messages := make([]string, 0, len(e))
	for _, err := range e {
		messages = append(messages, err.Error())
	}
	return strings.Join(messages, "; ")
}

// HasErrors returns true if there are validation errors.
func (e Errors) HasErrors() bool {
	return len(e) > 0
}

// Add adds a validation error to the collection and returns the updated slice.
func (e Errors) Add(field, message string, value interface{}) Errors {
	return append(e, Error{
		Field:   field,
		Message: message,
		Value:   value,
	})
}

// Chain combines multiple validators into a single validator.
// All validators are executed, and all errors are collected.
func Chain(validators ...Validator) Validator {
	return func(value interface{}) error {
		var validationErrors Errors

		for _, validator := range validators {
			if err := validator(value); err != nil {
				// Try to extract Errors
				var nestedErrors Errors
				if errors.As(err, &nestedErrors) {
					validationErrors = append(validationErrors, nestedErrors...)
				} else {
					// Create a generic validation error
					validationErrors = validationErrors.Add("", err.Error(), value)
				}
			}
		}

		if validationErrors.HasErrors() {
			return validationErrors
		}

		return nil
	}
}

// ChainField combines multiple validators for a specific field.
func ChainField(field string, validators ...Validator) Validator {
	return func(value interface{}) error {
		var validationErrors Errors

		for _, validator := range validators {
			if err := validator(value); err != nil {
				var nestedErrors Errors
				if errors.As(err, &nestedErrors) {
					// Update field names to include the parent field
					for _, validationError := range nestedErrors {
						if validationError.Field == "" {
							validationError.Field = field
						} else {
							validationError.Field = field + "." + validationError.Field
						}
						validationErrors = append(validationErrors, validationError)
					}
				} else {
					validationErrors = append(validationErrors, Error{
						Field:   field,
						Message: err.Error(),
						Value:   value,
					})
				}
			}
		}

		if validationErrors.HasErrors() {
			return validationErrors
		}

		return nil
	}
}

// Required validates that a value is not empty.
func Required(field string) Validator {
	return func(value interface{}) error {
		if value == nil {
			return Errors{{
				Field:   field,
				Message: "field is required",
				Value:   value,
			}}
		}

		switch v := value.(type) {
		case string:
			if strings.TrimSpace(v) == "" {
				return Errors{{
					Field:   field,
					Message: "field is required",
					Value:   value,
				}}
			}
		case []interface{}:
			if len(v) == 0 {
				return Errors{{
					Field:   field,
					Message: "field is required",
					Value:   value,
				}}
			}
		case []string:
			if len(v) == 0 {
				return Errors{{
					Field:   field,
					Message: "field is required",
					Value:   value,
				}}
			}
		}

		return nil
	}
}

// MinLength validates that a string has a minimum length.
func MinLength(field string, minVal int) Validator {
	return func(value interface{}) error {
		if str, ok := value.(string); ok {
			if len(strings.TrimSpace(str)) < minVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("minimum length is %d characters", minVal),
					Value:   value,
				}}
			}
		}
		return nil
	}
}

// MaxLength validates that a string has a maximum length.
func MaxLength(field string, maxVal int) Validator {
	return func(value interface{}) error {
		if str, ok := value.(string); ok {
			if len(str) > maxVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("maximum length is %d characters", maxVal),
					Value:   value,
				}}
			}
		}
		return nil
	}
}

// MinValue validates that a numeric value is greater than or equal to a minimum.
func MinValue(field string, minVal float64) Validator {
	return func(value interface{}) error {
		switch v := value.(type) {
		case int:
			if float64(v) < minVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("value must be at least %v", minVal),
					Value:   value,
				}}
			}
		case int64:
			if float64(v) < minVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("value must be at least %v", minVal),
					Value:   value,
				}}
			}
		case float64:
			if v < minVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("value must be at least %v", minVal),
					Value:   value,
				}}
			}
		case string:
			if f, err := strconv.ParseFloat(v, 64); err == nil && f < minVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("value must be at least %v", minVal),
					Value:   value,
				}}
			}
		}
		return nil
	}
}

// MaxValue validates that a numeric value is less than or equal to a maximum.
func MaxValue(field string, maxVal float64) Validator {
	return func(value interface{}) error {
		switch v := value.(type) {
		case int:
			if float64(v) > maxVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("value must be at most %v", maxVal),
					Value:   value,
				}}
			}
		case int64:
			if float64(v) > maxVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("value must be at most %v", maxVal),
					Value:   value,
				}}
			}
		case float64:
			if v > maxVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("value must be at most %v", maxVal),
					Value:   value,
				}}
			}
		case string:
			if f, err := strconv.ParseFloat(v, 64); err == nil && f > maxVal {
				return Errors{{
					Field:   field,
					Message: fmt.Sprintf("value must be at most %v", maxVal),
					Value:   value,
				}}
			}
		}
		return nil
	}
}

// Pattern validates that a string matches a regular expression pattern.
func Pattern(field, pattern string) Validator {
	return func(value interface{}) error {
		if str, ok := value.(string); ok {
			matched, err := regexp.MatchString(pattern, str)
			if err != nil {
				return Errors{{
					Field:   field,
					Message: "invalid pattern",
					Value:   value,
				}}
			}
			if !matched {
				return Errors{{
					Field:   field,
					Message: "value does not match pattern: " + pattern,
					Value:   value,
				}}
			}
		}
		return nil
	}
}

// Email validates that a string is a valid email address.
func Email(field string) Validator {
	return Pattern(field, `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
}

// URL validates that a string is a valid URL.
func URL(field string) Validator {
	return Pattern(field, `^https?://[^\s/$.?#].[^\s]*$`)
}

// In validates that a value is in a list of allowed values.
func In(field string, allowedValues ...interface{}) Validator {
	return func(value interface{}) error {
		for _, allowed := range allowedValues {
			if reflect.DeepEqual(value, allowed) {
				return nil
			}
		}
		return Errors{{
			Field:   field,
			Message: "value must be one of: " + fmt.Sprint(allowedValues...),
			Value:   value,
		}}
	}
}

// Custom creates a custom validator with a custom validation function.
func Custom(field string, validator func(interface{}) error) Validator {
	return func(value interface{}) error {
		if err := validator(value); err != nil {
			return Errors{{
				Field:   field,
				Message: err.Error(),
				Value:   value,
			}}
		}
		return nil
	}
}

// Domain-specific validators

// ValidateAmount validates that an amount is positive.
func ValidateAmount(field string) Validator {
	return ChainField(field,
		Required(field),
		MinValue(field, 0.01),
	)
}

// ValidateDescription validates that a description meets requirements.
func ValidateDescription(field string) Validator {
	return ChainField(field,
		Required(field),
		MinLength(field, 3),
		MaxLength(field, 255),
	)
}

// ValidateYearMonth validates that a YearMonth is within valid ranges.
func ValidateYearMonth(field string) Validator {
	return func(value interface{}) error {
		if ym, ok := value.(domain.YearMonth); ok {
			var errors Errors

			if ym.Year < 1970 || ym.Year > 3000 {
				errors = errors.Add(field+".year", "year must be between 1970 and 3000", ym.Year)
			}

			if ym.Month < 1 || ym.Month > 12 {
				errors = errors.Add(field+".month", "month must be between 1 and 12", ym.Month)
			}

			if errors.HasErrors() {
				return errors
			}
		}
		return nil
	}
}

// ValidateExpense validates an expense entity.
func ValidateExpense() Validator {
	return func(value interface{}) error {
		if expense, ok := value.(*domain.Expense); ok {
			var validationErrors Errors

			// Validate description
			if err := ValidateDescription("description")(expense.Description); err != nil {
				var nestedErrors Errors
				if errors.As(err, &nestedErrors) {
					validationErrors = append(validationErrors, nestedErrors...)
				}
			}

			// Validate amount
			if err := ValidateAmount("amount")(expense.AmountCents); err != nil {
				var nestedErrors Errors
				if errors.As(err, &nestedErrors) {
					validationErrors = append(validationErrors, nestedErrors...)
				}
			}

			// Validate year/month
			if err := ValidateYearMonth("year_month")(domain.YearMonth{Year: expense.Year, Month: expense.Month}); err != nil {
				var nestedErrors Errors
				if errors.As(err, &nestedErrors) {
					validationErrors = append(validationErrors, nestedErrors...)
				}
			}

			if validationErrors.HasErrors() {
				return validationErrors
			}
		}
		return nil
	}
}

// ValidateUser validates a user entity.
func ValidateUser() Validator {
	return func(value interface{}) error {
		if user, ok := value.(*domain.User); ok {
			var validationErrors Errors

			// Validate username
			if err := ChainField("username",
				Required("username"),
				MinLength("username", 3),
				MaxLength("username", 50),
				Pattern("username", `^[a-zA-Z0-9_]+$`),
			)(user.Username); err != nil {
				var nestedErrors Errors
				if errors.As(err, &nestedErrors) {
					validationErrors = append(validationErrors, nestedErrors...)
				}
			}

			// Validate email if provided
			if user.Email != "" {
				if err := Email("email")(user.Email); err != nil {
					var nestedErrors Errors
					if errors.As(err, &nestedErrors) {
						validationErrors = append(validationErrors, nestedErrors...)
					}
				}
			}

			if validationErrors.HasErrors() {
				return validationErrors
			}
		}
		return nil
	}
}

// Utility functions

// IsValid checks if a value passes all validators.
func IsValid(value interface{}, validators ...Validator) bool {
	return Chain(validators...)(value) == nil
}

// ValidateStruct validates a struct using field tags.
//
//nolint:gocognit,cyclop
func ValidateStruct(value interface{}) error {
	v := reflect.ValueOf(value)
	t := v.Type()

	if v.Kind() != reflect.Struct {
		return errors.New("value must be a struct")
	}

	var validationErrors Errors

	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		fieldType := t.Field(i)

		// Get validation tags
		tag := fieldType.Tag.Get("validate")
		if tag == "" {
			continue
		}

		// Parse validation rules from tag
		rules := strings.Split(tag, ",")
		var validators []Validator

		for _, rule := range rules {
			rule = strings.TrimSpace(rule)
			if rule == "" {
				continue
			}

			// Parse rule (e.g., "required", "min:5", "max:100")
			if strings.Contains(rule, ":") {
				parts := strings.SplitN(rule, ":", 2)
				ruleName := parts[0]
				ruleValue := parts[1]

				switch ruleName {
				case "min":
					if f, err := strconv.ParseFloat(ruleValue, 64); err == nil {
						validators = append(validators, MinValue(fieldType.Name, f))
					}
				case "max":
					if f, err := strconv.ParseFloat(ruleValue, 64); err == nil {
						validators = append(validators, MaxValue(fieldType.Name, f))
					}
				case "minlen":
					if i, err := strconv.Atoi(ruleValue); err == nil {
						validators = append(validators, MinLength(fieldType.Name, i))
					}
				case "maxlen":
					if i, err := strconv.Atoi(ruleValue); err == nil {
						validators = append(validators, MaxLength(fieldType.Name, i))
					}
				}
			} else {
				switch rule {
				case "required":
					validators = append(validators, Required(fieldType.Name))
				case "email":
					validators = append(validators, Email(fieldType.Name))
				}
			}
		}

		// Apply validators
		if len(validators) > 0 {
			if err := Chain(validators...)(field.Interface()); err != nil {
				var nestedErrors Errors
				if errors.As(err, &nestedErrors) {
					validationErrors = append(validationErrors, nestedErrors...)
				}
			}
		}
	}

	if validationErrors.HasErrors() {
		return validationErrors
	}

	return nil
}
