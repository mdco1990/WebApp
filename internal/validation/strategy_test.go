package validation

import (
	"context"
	"testing"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStrictValidation(t *testing.T) {
	ctx := context.Background()
	strictValidation := NewStrictValidation("expense")

	t.Run("Validate Expense Success", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense description",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := strictValidation.Validate(ctx, expense)
		require.NoError(t, err)
	})

	t.Run("Validate Expense Missing Description", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := strictValidation.Validate(ctx, expense)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "description", validationErrors[0].Field)
		assert.Equal(t, "description is required", validationErrors[0].Message)
		assert.Equal(t, "REQUIRED", validationErrors[0].Code)
	})

	t.Run("Validate Expense Short Description", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "ab",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := strictValidation.Validate(ctx, expense)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "description", validationErrors[0].Field)
		assert.Equal(t, "description must be at least 3 characters long", validationErrors[0].Message)
		assert.Equal(t, "MIN_LENGTH", validationErrors[0].Code)
	})

	t.Run("Validate Expense Long Description", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: string(make([]byte, 256)), // 256 characters
			AmountCents: 1000,
			Category:    "Food",
		}

		err := strictValidation.Validate(ctx, expense)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "description", validationErrors[0].Field)
		assert.Equal(t, "description must be at most 255 characters long", validationErrors[0].Message)
		assert.Equal(t, "MAX_LENGTH", validationErrors[0].Code)
	})

	t.Run("Validate Expense Negative Amount", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense",
			AmountCents: -100,
			Category:    "Food",
		}

		err := strictValidation.Validate(ctx, expense)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "amount_cents", validationErrors[0].Field)
		assert.Equal(t, "amount must be positive", validationErrors[0].Message)
		assert.Equal(t, "POSITIVE", validationErrors[0].Code)
	})

	t.Run("Validate Expense Invalid Category", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense",
			AmountCents: 1000,
			Category:    "InvalidCategory",
		}

		err := strictValidation.Validate(ctx, expense)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "category", validationErrors[0].Field)
		assert.Equal(t, "ENUM", validationErrors[0].Code)
	})

	t.Run("Validate Expense Invalid Year", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2019, Month: 1},
			Description: "Valid expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := strictValidation.Validate(ctx, expense)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "year_month", validationErrors[0].Field)
		assert.Equal(t, "year must be between 2020 and 2030", validationErrors[0].Message)
		assert.Equal(t, "RANGE", validationErrors[0].Code)
	})

	t.Run("Validate Income Source Success", func(t *testing.T) {
		income := &domain.IncomeSource{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Name:        "Salary",
			AmountCents: 5000,
		}

		err := strictValidation.Validate(ctx, income)
		require.NoError(t, err)
	})

	t.Run("Validate Income Source Missing Name", func(t *testing.T) {
		income := &domain.IncomeSource{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Name:        "",
			AmountCents: 5000,
		}

		err := strictValidation.Validate(ctx, income)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "name", validationErrors[0].Field)
		assert.Equal(t, "name is required", validationErrors[0].Message)
	})

	t.Run("Validate Budget Source Success", func(t *testing.T) {
		budget := &domain.BudgetSource{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Name:        "Food Budget",
			AmountCents: 1000,
		}

		err := strictValidation.Validate(ctx, budget)
		require.NoError(t, err)
	})

	t.Run("Validate Budget Source Negative Amount", func(t *testing.T) {
		budget := &domain.BudgetSource{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Name:        "Food Budget",
			AmountCents: -100,
		}

		err := strictValidation.Validate(ctx, budget)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "amount_cents", validationErrors[0].Field)
		assert.Equal(t, "amount cannot be negative", validationErrors[0].Message)
		assert.Equal(t, "NON_NEGATIVE", validationErrors[0].Code)
	})

	t.Run("Validate User Success", func(t *testing.T) {
		user := &domain.User{
			Username: "validuser123",
			Email:    "user@example.com",
		}

		err := strictValidation.Validate(ctx, user)
		require.NoError(t, err)
	})

	t.Run("Validate User Invalid Username", func(t *testing.T) {
		user := &domain.User{
			Username: "ab", // Too short
			Email:    "user@example.com",
		}

		err := strictValidation.Validate(ctx, user)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "username", validationErrors[0].Field)
		assert.Equal(t, "PATTERN", validationErrors[0].Code)
	})

	t.Run("Validate User Invalid Email", func(t *testing.T) {
		user := &domain.User{
			Username: "validuser123",
			Email:    "invalid-email",
		}

		err := strictValidation.Validate(ctx, user)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "email", validationErrors[0].Field)
		assert.Equal(t, "invalid email format", validationErrors[0].Message)
		assert.Equal(t, "PATTERN", validationErrors[0].Code)
	})

	t.Run("Validate Login Request Success", func(t *testing.T) {
		login := &domain.LoginRequest{
			Username: "testuser",
			Password: "password123",
		}

		err := strictValidation.Validate(ctx, login)
		require.NoError(t, err)
	})

	t.Run("Validate Login Request Short Password", func(t *testing.T) {
		login := &domain.LoginRequest{
			Username: "testuser",
			Password: "12345", // Less than 6 characters
		}

		err := strictValidation.Validate(ctx, login)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "password", validationErrors[0].Field)
		assert.Equal(t, "password must be at least 6 characters long", validationErrors[0].Message)
		assert.Equal(t, "MIN_LENGTH", validationErrors[0].Code)
	})

	t.Run("Validate Unsupported Type", func(t *testing.T) {
		unsupported := "string value"

		err := strictValidation.Validate(ctx, unsupported)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported data type for strict validation")
	})
}

func TestRelaxedValidation(t *testing.T) {
	ctx := context.Background()
	relaxedValidation := NewRelaxedValidation("expense")

	t.Run("Validate Expense Success", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := relaxedValidation.Validate(ctx, expense)
		require.NoError(t, err)
	})

	t.Run("Validate Expense Missing Description", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := relaxedValidation.Validate(ctx, expense)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "description", validationErrors[0].Field)
		assert.Equal(t, "description is required", validationErrors[0].Message)
	})

	t.Run("Validate Expense Short Description Allowed", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "ab", // Short description is allowed in relaxed mode
			AmountCents: 1000,
			Category:    "Food",
		}

		err := relaxedValidation.Validate(ctx, expense)
		require.NoError(t, err) // Should pass in relaxed mode
	})

	t.Run("Validate Income Source Success", func(t *testing.T) {
		income := &domain.IncomeSource{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Name:        "Salary",
			AmountCents: 5000,
		}

		err := relaxedValidation.Validate(ctx, income)
		require.NoError(t, err)
	})

	t.Run("Validate Budget Source Success", func(t *testing.T) {
		budget := &domain.BudgetSource{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Name:        "Food Budget",
			AmountCents: 0, // Zero amount is allowed in relaxed mode
		}

		err := relaxedValidation.Validate(ctx, budget)
		require.NoError(t, err)
	})
}

func TestCustomValidation(t *testing.T) {
	ctx := context.Background()
	customValidation := NewCustomValidation("expense")

	t.Run("Add and Use Custom Rules", func(t *testing.T) {
		// Add custom rules
		customValidation.AddRule("Description", ValidationRule{
			Required: true,
			Min:      3,
			Max:      100,
			Pattern:  `^[a-zA-Z0-9\s]+$`,
		})

		customValidation.AddRule("AmountCents", ValidationRule{
			Required: true,
			Min:      int64(1),
			Max:      int64(1000000),
		})

		// Test valid expense
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense 123",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := customValidation.Validate(ctx, expense)
		require.NoError(t, err)
	})

	t.Run("Custom Rule Validation Failure", func(t *testing.T) {
		// Add custom rules
		customValidation.AddRule("Description", ValidationRule{
			Required: true,
			Min:      3,
			Max:      100,
		})

		// Test invalid expense
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "ab", // Too short
			AmountCents: 1000,
			Category:    "Food",
		}

		err := customValidation.Validate(ctx, expense)
		assert.Error(t, err)

		validationErrors, ok := err.(StrategyValidationErrors)
		assert.True(t, ok)
		assert.Len(t, validationErrors, 1)
		assert.Equal(t, "Description", validationErrors[0].Field)
		assert.Contains(t, validationErrors[0].Message, "length must be at least")
	})

	t.Run("Custom Function Validation", func(t *testing.T) {
		// Add custom rule with function
		customValidation.AddRule("AmountCents", ValidationRule{
			Required: true,
			Custom: func(value interface{}) error {
				amount := value.(domain.Money)
				if amount%100 != 0 {
					return assert.AnError
				}
				return nil
			},
		})

		// Test valid amount (divisible by 100)
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense",
			AmountCents: 1000, // Divisible by 100
			Category:    "Food",
		}

		err := customValidation.Validate(ctx, expense)
		require.NoError(t, err)

		// Test invalid amount (not divisible by 100)
		expense.AmountCents = 1050 // Not divisible by 100
		err = customValidation.Validate(ctx, expense)
		assert.Error(t, err)
	})
}

func TestValidationService(t *testing.T) {
	ctx := context.Background()
	validationService := NewValidationService()

	t.Run("Register and Use Strategies", func(t *testing.T) {
		// Register strategies
		strictValidation := NewStrictValidation("expense")
		relaxedValidation := NewRelaxedValidation("expense")
		customValidation := NewCustomValidation("expense")

		validationService.RegisterStrategy(strictValidation)
		validationService.RegisterStrategy(relaxedValidation)
		validationService.RegisterStrategy(customValidation)

		// Test available strategies
		strategies := validationService.GetAvailableStrategies()
		assert.Contains(t, strategies, "strict")
		assert.Contains(t, strategies, "relaxed")
		assert.Contains(t, strategies, "custom")

		// Test default strategy
		assert.Equal(t, "strict", validationService.GetDefaultStrategy())
	})

	t.Run("Validate with Specific Strategy", func(t *testing.T) {
		strictValidation := NewStrictValidation("expense")
		validationService.RegisterStrategy(strictValidation)

		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := validationService.Validate(ctx, "strict", expense)
		require.NoError(t, err)
	})

	t.Run("Validate with Default Strategy", func(t *testing.T) {
		strictValidation := NewStrictValidation("expense")
		validationService.RegisterStrategy(strictValidation)

		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := validationService.ValidateDefault(ctx, expense)
		require.NoError(t, err)
	})

	t.Run("Validate with Non-existent Strategy", func(t *testing.T) {
		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		err := validationService.Validate(ctx, "nonexistent", expense)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "validation strategy not found")
	})

	t.Run("Validate by Context", func(t *testing.T) {
		strictValidation := NewStrictValidation("expense")
		relaxedValidation := NewRelaxedValidation("income")
		validationService.RegisterStrategy(strictValidation)
		validationService.RegisterStrategy(relaxedValidation)

		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Description: "Valid expense",
			AmountCents: 1000,
			Category:    "Food",
		}

		// Should use strict validation for expense context
		err := validationService.ValidateByContext(ctx, "expense", expense)
		require.NoError(t, err)

		// Should use relaxed validation for income context
		income := &domain.IncomeSource{
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Name:        "Salary",
			AmountCents: 5000,
		}

		err = validationService.ValidateByContext(ctx, "income", income)
		require.NoError(t, err)
	})

	t.Run("Set Default Strategy", func(t *testing.T) {
		relaxedValidation := NewRelaxedValidation("expense")
		validationService.RegisterStrategy(relaxedValidation)

		validationService.SetDefaultStrategy("relaxed")
		assert.Equal(t, "relaxed", validationService.GetDefaultStrategy())

		// Reset to strict
		validationService.SetDefaultStrategy("strict")
		assert.Equal(t, "strict", validationService.GetDefaultStrategy())
	})
}

func TestStrategyValidationErrors(t *testing.T) {
	t.Run("StrategyValidationErrors Error Method", func(t *testing.T) {
		errors := StrategyValidationErrors{
			{Field: "name", Message: "name is required"},
			{Field: "email", Message: "invalid email"},
		}

		errorString := errors.Error()
		assert.Contains(t, errorString, "name: name is required")
		assert.Contains(t, errorString, "email: invalid email")
		assert.Contains(t, errorString, "; ")
	})

	t.Run("StrategyValidationErrors GetErrors Method", func(t *testing.T) {
		errors := StrategyValidationErrors{
			{Field: "name", Message: "name is required"},
			{Field: "email", Message: "invalid email"},
		}

		result := errors.GetErrors()
		assert.Len(t, result, 2)
		assert.Equal(t, "name", result[0].Field)
		assert.Equal(t, "email", result[1].Field)
	})

	t.Run("Empty StrategyValidationErrors", func(t *testing.T) {
		errors := StrategyValidationErrors{}

		errorString := errors.Error()
		assert.Equal(t, "no validation errors", errorString)

		result := errors.GetErrors()
		assert.Len(t, result, 0)
	})
}

func TestStrategyValidationError(t *testing.T) {
	t.Run("StrategyValidationError Error Method", func(t *testing.T) {
		validationError := StrategyValidationError{
			Field:   "name",
			Message: "name is required",
			Value:   "",
			Code:    "REQUIRED",
		}

		errorString := validationError.Error()
		assert.Equal(t, "name: name is required", errorString)
	})
}
