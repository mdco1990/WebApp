package security

import (
	"testing"

	"github.com/mdco1990/webapp/internal/domain"
)

func TestValidateUsername(t *testing.T) {
	tests := []struct {
		name        string
		username    string
		expectError bool
		expected    string
	}{
		{"valid username", "testuser", false, "testuser"},
		{"valid with underscore", "test_user", false, "test_user"},
		{"valid with hyphen", "test-user", false, "test-user"},
		{"valid with dot", "test.user", false, "test.user"},
		{"empty username", "", true, ""},
		{"too long", "a_very_long_username_that_exceeds_the_maximum_allowed_length", true, ""},
		{"invalid characters", "test@user", true, ""},
		{"SQL injection attempt", "admin'; DROP TABLE users; --", true, ""},
		{"XSS attempt", "<script>alert('xss')</script>", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ValidateUsername(tt.username)
			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !tt.expectError && result != tt.expected {
				t.Errorf("Expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	tests := []struct {
		name        string
		password    string
		expectError bool
	}{
		{"valid password", "StrongP@ssw0rd!", false},
		{"empty password", "", true},
		{"too short", "Short1!", true},
		{"no lowercase", "STRONG1!", true},
		{"no uppercase", "strong1!", true},
		{"no digit", "StrongPassword!", true},
		{"no special", "StrongPassword1", true},
		{"too long", "a" + string(make([]byte, MaxPasswordLength)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePassword(tt.password)
			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		expectError bool
		expected    string
	}{
		{"valid email", "test@example.com", false, "test@example.com"},
		{"empty email", "", false, ""}, // Email is optional
		{"invalid format", "invalid-email", true, ""},
		{"too long", string(make([]byte, MaxEmailLength+1)) + "@example.com", true, ""},
		{"XSS attempt", "test@<script>alert('xss')</script>.com", true, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ValidateEmail(tt.email)
			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !tt.expectError && result != tt.expected {
				t.Errorf("Expected %q, got %q", tt.expected, result)
			}
		})
	}
}

func TestValidateYearMonth(t *testing.T) {
	tests := []struct {
		name        string
		ym          domain.YearMonth
		expectError bool
	}{
		{"valid year month", domain.YearMonth{Year: 2024, Month: 1}, false},
		{"year too low", domain.YearMonth{Year: 1969, Month: 1}, true},
		{"year too high", domain.YearMonth{Year: 3001, Month: 1}, true},
		{"month too low", domain.YearMonth{Year: 2024, Month: 0}, true},
		{"month too high", domain.YearMonth{Year: 2024, Month: 13}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateYearMonth(tt.ym)
			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestValidateAmount(t *testing.T) {
	tests := []struct {
		name        string
		amount      domain.Money
		expectError bool
	}{
		{"valid amount", domain.Money(100), false},
		{"zero amount", domain.Money(0), false},
		{"negative amount", domain.Money(-1), true},
		{"max amount", domain.Money(MaxAmount), false},
		// Note: Can't test MaxAmount + 1 due to overflow, but validation will catch it
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateAmount(tt.amount, "test_amount")
			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestContainsSQLInjection(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"clean input", "regular text", false},
		{"single quote", "It's a test", false},
		{"union select", "test UNION SELECT * FROM users", true},
		{"comment", "test -- comment", true},
		{"exec command", "test; EXEC sp_helpdb", true},
		{"drop table", "'; DROP TABLE users; --", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsSQLInjection(tt.input)
			if result != tt.expected {
				t.Errorf("Expected %t, got %t for input: %q", tt.expected, result, tt.input)
			}
		})
	}
}

func TestContainsXSS(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{"clean input", "regular text", false},
		{"script tag", "<script>alert('xss')</script>", true},
		{"javascript protocol", "javascript:alert('xss')", true},
		{"onload event", "onload=alert('xss')", true},
		{"document cookie", "document.cookie", true},
		{"eval function", "eval('malicious code')", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsXSS(tt.input)
			if result != tt.expected {
				t.Errorf("Expected %t, got %t for input: %q", tt.expected, result, tt.input)
			}
		})
	}
}

func TestValidateCreateIncomeSourceRequest(t *testing.T) {
	tests := []struct {
		name        string
		req         domain.CreateIncomeSourceRequest
		expectError bool
	}{
		{
			"valid request",
			domain.CreateIncomeSourceRequest{
				Name:        "Test Income",
				Year:        2024,
				Month:       1,
				AmountCents: 100000,
			},
			false,
		},
		{
			"empty name",
			domain.CreateIncomeSourceRequest{
				Name:        "",
				Year:        2024,
				Month:       1,
				AmountCents: 100000,
			},
			true,
		},
		{
			"invalid year",
			domain.CreateIncomeSourceRequest{
				Name:        "Test Income",
				Year:        1969,
				Month:       1,
				AmountCents: 100000,
			},
			true,
		},
		{
			"negative amount",
			domain.CreateIncomeSourceRequest{
				Name:        "Test Income",
				Year:        2024,
				Month:       1,
				AmountCents: -1000,
			},
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ValidateCreateIncomeSourceRequest(tt.req)
			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !tt.expectError && result == nil {
				t.Errorf("Expected result but got nil")
			}
		})
	}
}

func TestValidateExpense(t *testing.T) {
	tests := []struct {
		name        string
		expense     *domain.Expense
		expectError bool
	}{
		{
			"valid expense",
			&domain.Expense{
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
				Category:    "Food",
				Description: "Grocery shopping",
				AmountCents: 5000,
			},
			false,
		},
		{
			"empty description",
			&domain.Expense{
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
				Category:    "Food",
				Description: "",
				AmountCents: 5000,
			},
			true,
		},
		{
			"SQL injection in description",
			&domain.Expense{
				YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
				Category:    "Food",
				Description: "'; DROP TABLE expenses; --",
				AmountCents: 5000,
			},
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ValidateExpense(tt.expense)
			if tt.expectError && err == nil {
				t.Errorf("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if !tt.expectError && result == nil {
				t.Errorf("Expected result but got nil")
			}
		})
	}
}
