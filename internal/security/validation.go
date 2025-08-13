// Package security provides OWASP-compliant input validation and sanitization
package security

import (
	"errors"
	"fmt"
	"html"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/mdco1990/webapp/internal/domain"
)

const (
	// Maximum lengths to prevent buffer overflow attacks
	MaxUsernameLength    = 50
	MaxPasswordLength    = 200
	MaxEmailLength       = 254 // RFC 5321
	MaxNameLength        = 100
	MaxDescriptionLength = 500
	MaxCategoryLength    = 50

	// Numeric limits to prevent overflow
	MinYear   = 1970
	MaxYear   = 3000
	MinMonth  = 1
	MaxMonth  = 12
	MinAmount = 0
	MaxAmount = 9223372036854775807 // int64 max for cents (approx 92 trillion dollars)
	MinUserID = 1
	MaxUserID = 9223372036854775807
)

var (
	// OWASP-compliant regex patterns
	usernameRegex    = regexp.MustCompile(`^[a-zA-Z0-9_\-\.]{3,50}$`)
	emailRegex       = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	nameRegex        = regexp.MustCompile(`^[a-zA-Z0-9\s\-\_\.\(\)]{1,100}$`)
	categoryRegex    = regexp.MustCompile(`^[a-zA-Z0-9\s\-\_]{0,50}$`)
	descriptionRegex = regexp.MustCompile(`^[a-zA-Z0-9\s\-\_\.\,\!\?\(\)\[\]]{1,500}$`)

	// Error definitions
	ErrInvalidInput      = errors.New("invalid input")
	ErrInputTooLong      = errors.New("input too long")
	ErrInvalidFormat     = errors.New("invalid format")
	ErrInvalidRange      = errors.New("value out of valid range")
	ErrSQLInjection      = errors.New("potential SQL injection detected")
	ErrXSSAttempt        = errors.New("potential XSS attempt detected")
	ErrInvalidCharacters = errors.New("invalid characters detected")
)

// ValidationError wraps validation errors with context
type ValidationError struct {
	Field   string
	Value   string
	Message string
	Err     error
}

func (v ValidationError) Error() string {
	return fmt.Sprintf("validation error in field '%s': %s", v.Field, v.Message)
}

func (v ValidationError) Unwrap() error {
	return v.Err
}

// Input sanitization functions

// SanitizeString removes potentially dangerous characters and encodes HTML entities
func SanitizeString(input string, fieldName string) (string, error) {
	if len(input) == 0 {
		return "", nil
	}

	// Check for excessively long input
	if len(input) > MaxDescriptionLength {
		return "", ValidationError{
			Field:   fieldName,
			Value:   input[:50] + "...",
			Message: fmt.Sprintf("input too long (max %d chars)", MaxDescriptionLength),
			Err:     ErrInputTooLong,
		}
	}

	// Check for potential SQL injection patterns
	if containsSQLInjection(input) {
		return "", ValidationError{
			Field:   fieldName,
			Value:   input,
			Message: "potential SQL injection pattern detected",
			Err:     ErrSQLInjection,
		}
	}

	// Check for potential XSS patterns
	if containsXSS(input) {
		return "", ValidationError{
			Field:   fieldName,
			Value:   input,
			Message: "potential XSS pattern detected",
			Err:     ErrXSSAttempt,
		}
	}

	// HTML encode to prevent XSS
	sanitized := html.EscapeString(strings.TrimSpace(input))

	// Ensure valid UTF-8
	if !utf8.ValidString(sanitized) {
		return "", ValidationError{
			Field:   fieldName,
			Value:   input,
			Message: "invalid UTF-8 encoding",
			Err:     ErrInvalidFormat,
		}
	}

	return sanitized, nil
}

// Security pattern detection

// containsSQLInjection checks for common SQL injection patterns
func containsSQLInjection(input string) bool {
	lower := strings.ToLower(input)

	// SQL injection patterns - more precise matching to avoid false positives
	sqlPatterns := []string{
		"' or ", "\" or ", "' union ", "\" union ",
		"' select ", "\" select ", "' insert ", "\" insert ",
		"' update ", "\" update ", "' delete ", "\" delete ",
		"' drop ", "\" drop ", "' exec ", "\" exec ",
		"' execute ", "\" execute ", "' sp_ ", "\" sp_ ",
		"' xp_ ", "\" xp_ ", "' alter ", "\" alter ",
		"' create ", "\" create ", "--;", "/**/",
		"char(", "chr(", "ascii(", "substring(",
		"waitfor delay", "benchmark(", "sleep(",
		"information_schema", "sysobjects", "syscolumns",
		"' and ", "\" and ", "' having ", "\" having ",
	}

	for _, pattern := range sqlPatterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}

	return false
}

// containsXSS checks for common XSS patterns
func containsXSS(input string) bool {
	lower := strings.ToLower(input)

	// XSS patterns - more precise matching to avoid false positives
	xssPatterns := []string{
		"<script", "</script>", "<iframe", "</iframe>",
		"javascript:", "vbscript:", "data:text/html",
		"onload=", "onerror=", "onclick=", "onmouseover=",
		"onfocus=", "onblur=", "onkeyup=", "onkeydown=",
		"onsubmit=", "onchange=", "onselect=", "onreset=",
		"alert(", "confirm(", "prompt(", "document.cookie",
		"document.write", "window.location", "eval(",
		"expression(", "url(javascript:", "\\x3c", "&#60;",
		"&lt;script", "<svg onload", "<img onerror",
	}

	for _, pattern := range xssPatterns {
		if strings.Contains(lower, pattern) {
			return true
		}
	}

	return false
}

// Type-specific validation functions

// ValidateUsername validates usernames with OWASP guidelines
func ValidateUsername(username string) (string, error) {
	if len(username) == 0 {
		return "", ValidationError{
			Field:   "username",
			Value:   username,
			Message: "username is required",
			Err:     ErrInvalidInput,
		}
	}

	if len(username) > MaxUsernameLength {
		return "", ValidationError{
			Field:   "username",
			Value:   username,
			Message: fmt.Sprintf("username too long (max %d chars)", MaxUsernameLength),
			Err:     ErrInputTooLong,
		}
	}

	if !usernameRegex.MatchString(username) {
		return "", ValidationError{
			Field:   "username",
			Value:   username,
			Message: "username contains invalid characters (use only letters, numbers, underscore, hyphen, dot)",
			Err:     ErrInvalidCharacters,
		}
	}

	// Additional security checks
	sanitized, err := SanitizeString(username, "username")
	if err != nil {
		return "", err
	}

	return sanitized, nil
}

// ValidatePassword validates passwords with security requirements
func ValidatePassword(password string) error {
	if len(password) == 0 {
		return ValidationError{
			Field:   "password",
			Value:   "[hidden]",
			Message: "password is required",
			Err:     ErrInvalidInput,
		}
	}

	if len(password) < 8 {
		return ValidationError{
			Field:   "password",
			Value:   "[hidden]",
			Message: "password must be at least 8 characters long",
			Err:     ErrInvalidInput,
		}
	}

	if len(password) > MaxPasswordLength {
		return ValidationError{
			Field:   "password",
			Value:   "[hidden]",
			Message: fmt.Sprintf("password too long (max %d chars)", MaxPasswordLength),
			Err:     ErrInputTooLong,
		}
	}

	// Check for valid UTF-8
	if !utf8.ValidString(password) {
		return ValidationError{
			Field:   "password",
			Value:   "[hidden]",
			Message: "password contains invalid characters",
			Err:     ErrInvalidFormat,
		}
	}

	// Ensure password complexity
	var hasLower, hasUpper, hasDigit, hasSpecial bool
	for _, r := range password {
		switch {
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsDigit(r):
			hasDigit = true
		case unicode.IsPunct(r) || unicode.IsSymbol(r):
			hasSpecial = true
		}
	}

	if !hasLower || !hasUpper || !hasDigit || !hasSpecial {
		return ValidationError{
			Field:   "password",
			Value:   "[hidden]",
			Message: "password must contain at least one lowercase letter, uppercase letter, digit, and special character",
			Err:     ErrInvalidInput,
		}
	}

	return nil
}

// ValidateEmail validates email addresses
func ValidateEmail(email string) (string, error) {
	if len(email) == 0 {
		return "", nil // Email is optional
	}

	if len(email) > MaxEmailLength {
		return "", ValidationError{
			Field:   "email",
			Value:   email,
			Message: fmt.Sprintf("email too long (max %d chars)", MaxEmailLength),
			Err:     ErrInputTooLong,
		}
	}

	if !emailRegex.MatchString(email) {
		return "", ValidationError{
			Field:   "email",
			Value:   email,
			Message: "invalid email format",
			Err:     ErrInvalidFormat,
		}
	}

	sanitized, err := SanitizeString(email, "email")
	if err != nil {
		return "", err
	}

	return sanitized, nil
}

// ValidateName validates names for income sources, budget sources, etc.
func ValidateName(name string, fieldName string) (string, error) {
	if len(name) == 0 {
		return "", ValidationError{
			Field:   fieldName,
			Value:   name,
			Message: "name is required",
			Err:     ErrInvalidInput,
		}
	}

	if len(name) > MaxNameLength {
		return "", ValidationError{
			Field:   fieldName,
			Value:   name,
			Message: fmt.Sprintf("name too long (max %d chars)", MaxNameLength),
			Err:     ErrInputTooLong,
		}
	}

	if !nameRegex.MatchString(name) {
		return "", ValidationError{
			Field:   fieldName,
			Value:   name,
			Message: "name contains invalid characters",
			Err:     ErrInvalidCharacters,
		}
	}

	return SanitizeString(name, fieldName)
}

// ValidateDescription validates descriptions for expenses
func ValidateDescription(description string) (string, error) {
	if len(description) == 0 {
		return "", ValidationError{
			Field:   "description",
			Value:   description,
			Message: "description is required",
			Err:     ErrInvalidInput,
		}
	}

	if len(description) > MaxDescriptionLength {
		return "", ValidationError{
			Field:   "description",
			Value:   description[:50] + "...",
			Message: fmt.Sprintf("description too long (max %d chars)", MaxDescriptionLength),
			Err:     ErrInputTooLong,
		}
	}

	if !descriptionRegex.MatchString(description) {
		return "", ValidationError{
			Field:   "description",
			Value:   description,
			Message: "description contains invalid characters",
			Err:     ErrInvalidCharacters,
		}
	}

	return SanitizeString(description, "description")
}

// ValidateCategory validates expense categories
func ValidateCategory(category string) (string, error) {
	if len(category) == 0 {
		return "", nil // Category is optional
	}

	if len(category) > MaxCategoryLength {
		return "", ValidationError{
			Field:   "category",
			Value:   category,
			Message: fmt.Sprintf("category too long (max %d chars)", MaxCategoryLength),
			Err:     ErrInputTooLong,
		}
	}

	if !categoryRegex.MatchString(category) {
		return "", ValidationError{
			Field:   "category",
			Value:   category,
			Message: "category contains invalid characters",
			Err:     ErrInvalidCharacters,
		}
	}

	return SanitizeString(category, "category")
}

// ValidateYearMonth validates year and month values
func ValidateYearMonth(ym domain.YearMonth) error {
	if ym.Year < MinYear || ym.Year > MaxYear {
		return ValidationError{
			Field:   "year",
			Value:   fmt.Sprintf("%d", ym.Year),
			Message: fmt.Sprintf("year must be between %d and %d", MinYear, MaxYear),
			Err:     ErrInvalidRange,
		}
	}

	if ym.Month < MinMonth || ym.Month > MaxMonth {
		return ValidationError{
			Field:   "month",
			Value:   fmt.Sprintf("%d", ym.Month),
			Message: fmt.Sprintf("month must be between %d and %d", MinMonth, MaxMonth),
			Err:     ErrInvalidRange,
		}
	}

	return nil
}

// ValidateAmount validates monetary amounts
func ValidateAmount(amount domain.Money, fieldName string) error {
	if int64(amount) < MinAmount {
		return ValidationError{
			Field:   fieldName,
			Value:   fmt.Sprintf("%d", amount),
			Message: fmt.Sprintf("amount must be at least %d", MinAmount),
			Err:     ErrInvalidRange,
		}
	}

	if int64(amount) > MaxAmount {
		return ValidationError{
			Field:   fieldName,
			Value:   fmt.Sprintf("%d", amount),
			Message: fmt.Sprintf("amount exceeds maximum allowed value"),
			Err:     ErrInvalidRange,
		}
	}

	return nil
}

// ValidateUserID validates user ID values
func ValidateUserID(userID int64) error {
	if userID < MinUserID || userID > MaxUserID {
		return ValidationError{
			Field:   "user_id",
			Value:   fmt.Sprintf("%d", userID),
			Message: "invalid user ID",
			Err:     ErrInvalidRange,
		}
	}

	return nil
}

// ValidateID validates generic ID values
func ValidateID(id int64, fieldName string) error {
	if id <= 0 || id > MaxUserID {
		return ValidationError{
			Field:   fieldName,
			Value:   fmt.Sprintf("%d", id),
			Message: "invalid ID value",
			Err:     ErrInvalidRange,
		}
	}

	return nil
}

// Comprehensive request validation functions

// ValidateCreateIncomeSourceRequest validates income source creation
func ValidateCreateIncomeSourceRequest(req domain.CreateIncomeSourceRequest) (*domain.CreateIncomeSourceRequest, error) {
	validated := domain.CreateIncomeSourceRequest{}

	// Validate name
	name, err := ValidateName(req.Name, "name")
	if err != nil {
		return nil, err
	}
	validated.Name = name

	// Validate year/month
	ym := domain.YearMonth{Year: req.Year, Month: req.Month}
	if err := ValidateYearMonth(ym); err != nil {
		return nil, err
	}
	validated.Year = req.Year
	validated.Month = req.Month

	// Validate amount
	if err := ValidateAmount(req.AmountCents, "amount_cents"); err != nil {
		return nil, err
	}
	validated.AmountCents = req.AmountCents

	return &validated, nil
}

// ValidateCreateBudgetSourceRequest validates budget source creation
func ValidateCreateBudgetSourceRequest(req domain.CreateBudgetSourceRequest) (*domain.CreateBudgetSourceRequest, error) {
	validated := domain.CreateBudgetSourceRequest{}

	// Validate name
	name, err := ValidateName(req.Name, "name")
	if err != nil {
		return nil, err
	}
	validated.Name = name

	// Validate year/month
	ym := domain.YearMonth{Year: req.Year, Month: req.Month}
	if err := ValidateYearMonth(ym); err != nil {
		return nil, err
	}
	validated.Year = req.Year
	validated.Month = req.Month

	// Validate amount
	if err := ValidateAmount(req.AmountCents, "amount_cents"); err != nil {
		return nil, err
	}
	validated.AmountCents = req.AmountCents

	return &validated, nil
}

// ValidateUpdateSourceRequest validates source updates
func ValidateUpdateSourceRequest(req domain.UpdateSourceRequest) (*domain.UpdateSourceRequest, error) {
	validated := domain.UpdateSourceRequest{}

	// Validate name
	name, err := ValidateName(req.Name, "name")
	if err != nil {
		return nil, err
	}
	validated.Name = name

	// Validate amount
	if err := ValidateAmount(req.AmountCents, "amount_cents"); err != nil {
		return nil, err
	}
	validated.AmountCents = req.AmountCents

	return &validated, nil
}

// ValidateExpense validates expense data
func ValidateExpense(expense *domain.Expense) (*domain.Expense, error) {
	validated := &domain.Expense{}

	// Validate year/month
	ym := domain.YearMonth{Year: expense.Year, Month: expense.Month}
	if err := ValidateYearMonth(ym); err != nil {
		return nil, err
	}
	validated.Year = expense.Year
	validated.Month = expense.Month

	// Validate category (optional)
	category, err := ValidateCategory(expense.Category)
	if err != nil {
		return nil, err
	}
	validated.Category = category

	// Validate description
	description, err := ValidateDescription(expense.Description)
	if err != nil {
		return nil, err
	}
	validated.Description = description

	// Validate amount
	if err := ValidateAmount(expense.AmountCents, "amount_cents"); err != nil {
		return nil, err
	}
	validated.AmountCents = expense.AmountCents

	return validated, nil
}

// ValidateManualBudgetItems validates manual budget items
func ValidateManualBudgetItems(items []domain.ManualBudgetItem) ([]domain.ManualBudgetItem, error) {
	validated := make([]domain.ManualBudgetItem, 0, len(items))

	for i, item := range items {
		// Validate name
		name, err := ValidateName(item.Name, fmt.Sprintf("items[%d].name", i))
		if err != nil {
			return nil, err
		}

		// Validate amount
		if err := ValidateAmount(item.AmountCents, fmt.Sprintf("items[%d].amount_cents", i)); err != nil {
			return nil, err
		}

		validated = append(validated, domain.ManualBudgetItem{
			Name:        name,
			AmountCents: item.AmountCents,
		})
	}

	return validated, nil
}

// ValidateLoginRequest validates login credentials
func ValidateLoginRequest(req domain.LoginRequest) (*domain.LoginRequest, error) {
	validated := domain.LoginRequest{}

	// Validate username
	username, err := ValidateUsername(req.Username)
	if err != nil {
		return nil, err
	}
	validated.Username = username

	// Validate password (don't sanitize, just validate)
	if err := ValidatePassword(req.Password); err != nil {
		return nil, err
	}
	validated.Password = req.Password

	return &validated, nil
}

// Status validation for user status updates
func ValidateUserStatus(status string) (string, error) {
	validStatuses := map[string]bool{
		"pending":  true,
		"approved": true,
		"rejected": true,
	}

	if !validStatuses[status] {
		return "", ValidationError{
			Field:   "status",
			Value:   status,
			Message: "status must be one of: pending, approved, rejected",
			Err:     ErrInvalidInput,
		}
	}

	return status, nil
}
