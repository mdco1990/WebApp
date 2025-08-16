// Package errors implements functional error handling patterns.
package errors

import (
	"fmt"
	"log/slog"
	"runtime"
	"strings"
	"time"
)

// ErrorType represents the type of error for categorization.
type ErrorType string

const (
	ErrorTypeValidation   ErrorType = "validation"
	ErrorTypeNotFound     ErrorType = "not_found"
	ErrorTypeUnauthorized ErrorType = "unauthorized"
	ErrorTypeForbidden    ErrorType = "forbidden"
	ErrorTypeConflict     ErrorType = "conflict"
	ErrorTypeInternal     ErrorType = "internal"
	ErrorTypeExternal     ErrorType = "external"
	ErrorTypeTimeout      ErrorType = "timeout"
	ErrorTypeRateLimit    ErrorType = "rate_limit"
)

// AppError represents a structured application error.
type AppError struct {
	Type      ErrorType      `json:"type"`
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Details   map[string]any `json:"details,omitempty"`
	Cause     error          `json:"cause,omitempty"`
	Timestamp time.Time      `json:"timestamp"`
	Stack     []StackFrame   `json:"stack,omitempty"`
	Context   map[string]any `json:"context,omitempty"`
}

// StackFrame represents a stack frame for error tracing.
type StackFrame struct {
	Function string `json:"function"`
	File     string `json:"file"`
	Line     int    `json:"line"`
}

// Error implements the error interface.
func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s (caused by: %v)", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap returns the underlying error.
func (e *AppError) Unwrap() error {
	return e.Cause
}

// Is checks if the error is of a specific type.
func (e *AppError) Is(target error) bool {
	if target == nil {
		return false
	}

	if appErr, ok := target.(*AppError); ok {
		return e.Type == appErr.Type && e.Code == appErr.Code
	}

	return false
}

// WithContext adds context information to the error.
func (e *AppError) WithContext(key string, value any) *AppError {
	if e.Context == nil {
		e.Context = make(map[string]any)
	}
	e.Context[key] = value
	return e
}

// WithDetails adds additional details to the error.
func (e *AppError) WithDetails(details map[string]any) *AppError {
	if e.Details == nil {
		e.Details = make(map[string]any)
	}
	for k, v := range details {
		e.Details[k] = v
	}
	return e
}

// ErrorHandler is a function type that processes errors.
type ErrorHandler func(error) error

// ErrorProcessor is a function type that processes errors and returns a result.
type ErrorProcessor[T any] func(error) T

// HandleError applies multiple error handlers in sequence.
func HandleError(err error, handlers ...ErrorHandler) error {
	for _, handler := range handlers {
		if err = handler(err); err == nil {
			break
		}
	}
	return err
}

// ProcessError processes an error with a processor function.
func ProcessError[T any](err error, processor ErrorProcessor[T]) T {
	return processor(err)
}

// Error handlers

// LogError logs the error with structured logging.
func LogError(err error) error {
	if err == nil {
		return nil
	}

	attrs := []any{"error", err.Error()}

	if appErr, ok := err.(*AppError); ok {
		attrs = append(attrs, "type", appErr.Type)
		attrs = append(attrs, "code", appErr.Code)
		attrs = append(attrs, "timestamp", appErr.Timestamp)
		if appErr.Context != nil {
			attrs = append(attrs, "context", appErr.Context)
		}
		if appErr.Details != nil {
			attrs = append(attrs, "details", appErr.Details)
		}
	}

	slog.Error("Application error", attrs...)
	return err
}

// WrapError wraps an error with additional context.
func WrapError(err error, message string) error {
	if err == nil {
		return nil
	}

	appErr := &AppError{
		Type:      ErrorTypeInternal,
		Code:      "WRAPPED_ERROR",
		Message:   message,
		Cause:     err,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}

	return appErr
}

// TransformError transforms an error to a different type.
func TransformError(err error, errorType ErrorType, code string, message string) error {
	if err == nil {
		return nil
	}

	appErr := &AppError{
		Type:      errorType,
		Code:      code,
		Message:   message,
		Cause:     err,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}

	return appErr
}

// SuppressError suppresses an error and returns nil.
func SuppressError(err error) error {
	return nil
}

// RetryError determines if an error is retryable.
func RetryError(err error) error {
	if err == nil {
		return nil
	}

	// Check if error is retryable
	if appErr, ok := err.(*AppError); ok {
		switch appErr.Type {
		case ErrorTypeTimeout, ErrorTypeRateLimit, ErrorTypeExternal:
			return err // Retryable errors
		default:
			return nil // Non-retryable errors
		}
	}

	// Default to retryable for unknown errors
	return err
}

// Error constructors

// NewValidationError creates a new validation error.
func NewValidationError(code string, message string) *AppError {
	return &AppError{
		Type:      ErrorTypeValidation,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}
}

// NewNotFoundError creates a new not found error.
func NewNotFoundError(code string, message string) *AppError {
	return &AppError{
		Type:      ErrorTypeNotFound,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}
}

// NewUnauthorizedError creates a new unauthorized error.
func NewUnauthorizedError(code string, message string) *AppError {
	return &AppError{
		Type:      ErrorTypeUnauthorized,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}
}

// NewForbiddenError creates a new forbidden error.
func NewForbiddenError(code string, message string) *AppError {
	return &AppError{
		Type:      ErrorTypeForbidden,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}
}

// NewConflictError creates a new conflict error.
func NewConflictError(code string, message string) *AppError {
	return &AppError{
		Type:      ErrorTypeConflict,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}
}

// NewInternalError creates a new internal error.
func NewInternalError(code string, message string) *AppError {
	return &AppError{
		Type:      ErrorTypeInternal,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}
}

// NewTimeoutError creates a new timeout error.
func NewTimeoutError(code string, message string) *AppError {
	return &AppError{
		Type:      ErrorTypeTimeout,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}
}

// NewRateLimitError creates a new rate limit error.
func NewRateLimitError(code string, message string) *AppError {
	return &AppError{
		Type:      ErrorTypeRateLimit,
		Code:      code,
		Message:   message,
		Timestamp: time.Now(),
		Stack:     captureStack(),
	}
}

// Error utilities

// IsValidationError checks if an error is a validation error.
func IsValidationError(err error) bool {
	return isErrorType(err, ErrorTypeValidation)
}

// IsNotFoundError checks if an error is a not found error.
func IsNotFoundError(err error) bool {
	return isErrorType(err, ErrorTypeNotFound)
}

// IsUnauthorizedError checks if an error is an unauthorized error.
func IsUnauthorizedError(err error) bool {
	return isErrorType(err, ErrorTypeUnauthorized)
}

// IsForbiddenError checks if an error is a forbidden error.
func IsForbiddenError(err error) bool {
	return isErrorType(err, ErrorTypeForbidden)
}

// IsConflictError checks if an error is a conflict error.
func IsConflictError(err error) bool {
	return isErrorType(err, ErrorTypeConflict)
}

// IsInternalError checks if an error is an internal error.
func IsInternalError(err error) bool {
	return isErrorType(err, ErrorTypeInternal)
}

// IsTimeoutError checks if an error is a timeout error.
func IsTimeoutError(err error) bool {
	return isErrorType(err, ErrorTypeTimeout)
}

// IsRateLimitError checks if an error is a rate limit error.
func IsRateLimitError(err error) bool {
	return isErrorType(err, ErrorTypeRateLimit)
}

// IsRetryableError checks if an error is retryable.
func IsRetryableError(err error) bool {
	return IsTimeoutError(err) || IsRateLimitError(err) || IsExternalError(err)
}

// IsExternalError checks if an error is an external error.
func IsExternalError(err error) bool {
	return isErrorType(err, ErrorTypeExternal)
}

// isErrorType is a helper function to check error type.
func isErrorType(err error, errorType ErrorType) bool {
	if err == nil {
		return false
	}

	if appErr, ok := err.(*AppError); ok {
		return appErr.Type == errorType
	}

	return false
}

// captureStack captures the current stack trace.
func captureStack() []StackFrame {
	var frames []StackFrame

	// Skip the first few frames (captureStack, New*Error, etc.)
	for i := 3; i < 10; i++ {
		pc, file, line, ok := runtime.Caller(i)
		if !ok {
			break
		}

		fn := runtime.FuncForPC(pc)
		if fn == nil {
			continue
		}

		// Skip internal error handling functions
		if strings.Contains(fn.Name(), "errors.") || strings.Contains(fn.Name(), "runtime.") {
			continue
		}

		frames = append(frames, StackFrame{
			Function: fn.Name(),
			File:     file,
			Line:     line,
		})
	}

	return frames
}

// Error composition utilities

// ComposeErrors combines multiple error handlers into a single handler.
func ComposeErrors(handlers ...ErrorHandler) ErrorHandler {
	return func(err error) error {
		return HandleError(err, handlers...)
	}
}

// WithLogging adds logging to an error handler.
func WithLogging(handler ErrorHandler) ErrorHandler {
	return ComposeErrors(LogError, handler)
}

// WithWrapping wraps errors with additional context.
func WithWrapping(message string) ErrorHandler {
	return func(err error) error {
		return WrapError(err, message)
	}
}

// WithTransformation transforms errors to a specific type.
func WithTransformation(errorType ErrorType, code string, message string) ErrorHandler {
	return func(err error) error {
		return TransformError(err, errorType, code, message)
	}
}

// Error recovery utilities

// RecoverError recovers from panics and converts them to errors.
func RecoverError() error {
	if r := recover(); r != nil {
		var message string
		if err, ok := r.(error); ok {
			message = err.Error()
		} else {
			message = fmt.Sprintf("%v", r)
		}

		return NewInternalError("PANIC", message).WithContext("panic_value", r)
	}
	return nil
}

// SafeExecute executes a function and recovers from panics.
func SafeExecute(fn func() error) error {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("Panic recovered", "panic", r)
		}
	}()

	return fn()
}

// Error aggregation

// AggregateErrors aggregates multiple errors into a single error.
func AggregateErrors(errors ...error) error {
	var validErrors []error
	for _, err := range errors {
		if err != nil {
			validErrors = append(validErrors, err)
		}
	}

	if len(validErrors) == 0 {
		return nil
	}

	if len(validErrors) == 1 {
		return validErrors[0]
	}

	// Create an aggregated error
	appErr := NewInternalError("AGGREGATED_ERRORS", "multiple errors occurred")
	appErr.Details = map[string]any{
		"error_count": len(validErrors),
		"errors":      validErrors,
	}

	return appErr
}

// Error context utilities

// WithContext adds context to an error.
func WithContext(err error, key string, value any) error {
	if err == nil {
		return nil
	}

	if appErr, ok := err.(*AppError); ok {
		return appErr.WithContext(key, value)
	}

	// Wrap non-AppError with context
	wrappedErr := WrapError(err, "")
	if appErr, ok := wrappedErr.(*AppError); ok {
		return appErr.WithContext(key, value)
	}
	return wrappedErr
}

// WithDetails adds details to an error.
func WithDetails(err error, details map[string]any) error {
	if err == nil {
		return nil
	}

	if appErr, ok := err.(*AppError); ok {
		return appErr.WithDetails(details)
	}

	// Wrap non-AppError with details
	wrappedErr := WrapError(err, "")
	if appErr, ok := wrappedErr.(*AppError); ok {
		return appErr.WithDetails(details)
	}
	return wrappedErr
}
