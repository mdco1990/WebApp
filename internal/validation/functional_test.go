package validation

import (
	"testing"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/stretchr/testify/assert"
)

func TestValidatorChain(t *testing.T) {
	tests := []struct {
		name     string
		expense  *domain.Expense
		expected bool // true if validation should pass
	}{
		{
			name: "valid expense",
			expense: &domain.Expense{
				Description: "Valid expense",
				AmountCents: 1000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
				Category:    "food",
			},
			expected: true,
		},
		{
			name: "invalid amount",
			expense: &domain.Expense{
				Description: "Invalid expense",
				AmountCents: -100,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
				Category:    "food",
			},
			expected: false,
		},
		{
			name: "empty description",
			expense: &domain.Expense{
				Description: "",
				AmountCents: 1000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
				Category:    "food",
			},
			expected: false,
		},
		{
			name: "invalid year",
			expense: &domain.Expense{
				Description: "Valid expense",
				AmountCents: 1000,
				YearMonth:   domain.YearMonth{Year: 1969, Month: 1}, // Too old
				Category:    "food",
			},
			expected: false,
		},
		{
			name: "invalid month",
			expense: &domain.Expense{
				Description: "Valid expense",
				AmountCents: 1000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 13}, // Invalid month
				Category:    "food",
			},
			expected: false,
		},
		{
			name: "invalid category",
			expense: &domain.Expense{
				Description: "Valid expense",
				AmountCents: 1000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
				Category:    "invalid_category",
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			validator := ValidateExpense()
			err := validator(tt.expense)

			if tt.expected {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestValidatorCompose(t *testing.T) {
	t.Run("compose with short circuit", func(t *testing.T) {
		validator := Compose(
			ValidateAmount,
			ValidateDescription,
			ValidateYearMonth,
		)

		// This should fail at ValidateAmount and not continue
		expense := &domain.Expense{
			Description: "Valid description",
			AmountCents: -100, // Invalid amount
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
		}

		err := validator(expense)
		assert.Error(t, err)

		// Should only have amount validation error
		if validationErrors, ok := err.(ValidationErrors); ok {
			assert.Len(t, validationErrors, 1)
			assert.Equal(t, "amount_cents", validationErrors[0].Field)
		}
	})
}

func TestValidateAmount(t *testing.T) {
	tests := []struct {
		name        string
		amountCents domain.Money
		expected    bool
	}{
		{"positive amount", 1000, true},
		{"zero amount", 0, false},
		{"negative amount", -100, false},
		{"very large amount", 999999999, true},
		{"too large amount", 1000000000, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expense := &domain.Expense{AmountCents: tt.amountCents}
			err := ValidateAmount(expense)

			if tt.expected {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestValidateDescription(t *testing.T) {
	tests := []struct {
		name        string
		description string
		expected    bool
	}{
		{"valid description", "Valid expense description", true},
		{"empty description", "", false},
		{"whitespace only", "   ", false},
		{"too long description", string(make([]byte, 256)), false},
		{"contains test word", "This is a test expense", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expense := &domain.Expense{Description: tt.description}
			err := ValidateDescription(expense)

			if tt.expected {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestValidateYearMonth(t *testing.T) {
	tests := []struct {
		name     string
		year     int
		month    int
		expected bool
	}{
		{"valid year month", 2024, 1, true},
		{"valid year month 2", 2024, 12, true},
		{"invalid year too old", 1969, 1, false},
		{"invalid year too new", 3001, 1, false},
		{"invalid month too low", 2024, 0, false},
		{"invalid month too high", 2024, 13, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ym := domain.YearMonth{Year: tt.year, Month: tt.month}
			err := ValidateYearMonth(ym)

			if tt.expected {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestValidateCategory(t *testing.T) {
	tests := []struct {
		name     string
		category string
		expected bool
	}{
		{"valid category food", "food", true},
		{"valid category transport", "transport", true},
		{"valid category entertainment", "entertainment", true},
		{"valid category utilities", "utilities", true},
		{"valid category shopping", "shopping", true},
		{"valid category health", "health", true},
		{"valid category other", "other", true},
		{"empty category", "", true}, // Categories are optional
		{"invalid category", "invalid", false},
		{"case insensitive", "FOOD", true},
		{"too long category", string(make([]byte, 101)), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			expense := &domain.Expense{Category: tt.category}
			err := ValidateCategory(expense)

			if tt.expected {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestValidateIncomeSource(t *testing.T) {
	tests := []struct {
		name         string
		incomeSource *domain.IncomeSource
		expected     bool
	}{
		{
			name: "valid income source",
			incomeSource: &domain.IncomeSource{
				Name:        "Salary",
				AmountCents: 50000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: true,
		},
		{
			name: "empty name",
			incomeSource: &domain.IncomeSource{
				Name:        "",
				AmountCents: 50000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: false,
		},
		{
			name: "whitespace name",
			incomeSource: &domain.IncomeSource{
				Name:        "   ",
				AmountCents: 50000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: false,
		},
		{
			name: "too long name",
			incomeSource: &domain.IncomeSource{
				Name:        string(make([]byte, 101)),
				AmountCents: 50000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: false,
		},
		{
			name: "negative amount",
			incomeSource: &domain.IncomeSource{
				Name:        "Salary",
				AmountCents: -1000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: false,
		},
		{
			name: "zero amount",
			incomeSource: &domain.IncomeSource{
				Name:        "Salary",
				AmountCents: 0,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateIncomeSource(tt.incomeSource)

			if tt.expected {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestValidateBudgetSource(t *testing.T) {
	tests := []struct {
		name         string
		budgetSource *domain.BudgetSource
		expected     bool
	}{
		{
			name: "valid budget source",
			budgetSource: &domain.BudgetSource{
				Name:        "Groceries",
				AmountCents: 1000,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: true,
		},
		{
			name: "zero amount allowed",
			budgetSource: &domain.BudgetSource{
				Name:        "Groceries",
				AmountCents: 0,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: true,
		},
		{
			name: "negative amount not allowed",
			budgetSource: &domain.BudgetSource{
				Name:        "Groceries",
				AmountCents: -100,
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateBudgetSource(tt.budgetSource)

			if tt.expected {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestValidateUser(t *testing.T) {
	tests := []struct {
		name     string
		user     *domain.User
		expected bool
	}{
		{
			name: "valid user",
			user: &domain.User{
				Username: "validuser",
				Email:    "user@example.com",
			},
			expected: true,
		},
		{
			name: "username too short",
			user: &domain.User{
				Username: "ab",
				Email:    "user@example.com",
			},
			expected: false,
		},
		{
			name: "username too long",
			user: &domain.User{
				Username: string(make([]byte, 51)),
				Email:    "user@example.com",
			},
			expected: false,
		},
		{
			name: "username with spaces",
			user: &domain.User{
				Username: "user name",
				Email:    "user@example.com",
			},
			expected: false,
		},
		{
			name: "invalid email",
			user: &domain.User{
				Username: "validuser",
				Email:    "invalid-email",
			},
			expected: false,
		},
		{
			name: "empty email allowed",
			user: &domain.User{
				Username: "validuser",
				Email:    "",
			},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUser(tt.user)

			if tt.expected {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestValidationErrorFormatting(t *testing.T) {
	t.Run("single validation error", func(t *testing.T) {
		err := ValidationError{
			Field:   "amount_cents",
			Message: "amount must be positive",
		}
		expected := "amount_cents: amount must be positive"
		assert.Equal(t, expected, err.Error())
	})

	t.Run("multiple validation errors", func(t *testing.T) {
		errors := ValidationErrors{
			{Field: "amount_cents", Message: "amount must be positive"},
			{Field: "description", Message: "description is required"},
		}
		expected := "amount_cents: amount must be positive; description: description is required"
		assert.Equal(t, expected, errors.Error())
	})
}

func TestUtilityValidators(t *testing.T) {
	t.Run("ValidateRequired", func(t *testing.T) {
		validator := ValidateRequired("Name")

		// Test with struct
		type TestStruct struct {
			Name string
		}

		validStruct := TestStruct{Name: "John"}
		err := validator(validStruct)
		assert.NoError(t, err)

		emptyStruct := TestStruct{Name: ""}
		err = validator(emptyStruct)
		assert.Error(t, err)
	})

	t.Run("ValidateMinLength", func(t *testing.T) {
		validator := ValidateMinLength("Name", 3)

		type TestStruct struct {
			Name string
		}

		validStruct := TestStruct{Name: "John"}
		err := validator(validStruct)
		assert.NoError(t, err)

		shortStruct := TestStruct{Name: "Jo"}
		err = validator(shortStruct)
		assert.Error(t, err)
	})

	t.Run("ValidateMaxLength", func(t *testing.T) {
		validator := ValidateMaxLength("Name", 5)

		type TestStruct struct {
			Name string
		}

		validStruct := TestStruct{Name: "John"}
		err := validator(validStruct)
		assert.NoError(t, err)

		longStruct := TestStruct{Name: "Johnny"}
		err = validator(longStruct)
		assert.Error(t, err)
	})

	t.Run("ValidateRange", func(t *testing.T) {
		validator := ValidateRange("Age", 18, 65)

		type TestStruct struct {
			Age int64
		}

		validStruct := TestStruct{Age: 25}
		err := validator(validStruct)
		assert.NoError(t, err)

		youngStruct := TestStruct{Age: 16}
		err = validator(youngStruct)
		assert.Error(t, err)

		oldStruct := TestStruct{Age: 70}
		err = validator(oldStruct)
		assert.Error(t, err)
	})
}

func TestValidationChains(t *testing.T) {
	t.Run("ValidateExpense chain", func(t *testing.T) {
		validator := ValidateExpense()
		assert.NotNil(t, validator)

		// Test with valid expense
		expense := &domain.Expense{
			Description: "Valid expense",
			AmountCents: 1000,
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
			Category:    "food",
		}
		err := validator(expense)
		assert.NoError(t, err)
	})

	t.Run("ValidateIncomeSourceChain", func(t *testing.T) {
		validator := ValidateIncomeSourceChain()
		assert.NotNil(t, validator)

		// Test with valid income source
		incomeSource := &domain.IncomeSource{
			Name:        "Salary",
			AmountCents: 50000,
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
		}
		err := validator(incomeSource)
		assert.NoError(t, err)
	})

	t.Run("ValidateBudgetSourceChain", func(t *testing.T) {
		validator := ValidateBudgetSourceChain()
		assert.NotNil(t, validator)

		// Test with valid budget source
		budgetSource := &domain.BudgetSource{
			Name:        "Groceries",
			AmountCents: 1000,
			YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
		}
		err := validator(budgetSource)
		assert.NoError(t, err)
	})

	t.Run("ValidateUserChain", func(t *testing.T) {
		validator := ValidateUserChain()
		assert.NotNil(t, validator)

		// Test with valid user
		user := &domain.User{
			Username: "validuser",
			Email:    "user@example.com",
		}
		err := validator(user)
		assert.NoError(t, err)
	})
}
