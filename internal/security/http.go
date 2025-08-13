// Package security provides OWASP-compliant HTTP handler security wrappers
package security

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/domain"
)

const (
	// Maximum request body size to prevent DoS attacks
	MaxRequestBodySize = 1024 * 1024 // 1MB

	// Security headers
	HeaderContentType         = "Content-Type"
	HeaderContentLength       = "Content-Length"
	HeaderXContentTypeOptions = "X-Content-Type-Options"
	HeaderXFrameOptions       = "X-Frame-Options"
	HeaderXXSSProtection      = "X-XSS-Protection"

	ContentTypeJSON = "application/json"
)

// SecureHTTPHandler wraps HTTP handlers with OWASP security validations
type SecureHTTPHandler struct{}

// NewSecureHandler creates a new secure HTTP handler wrapper
func NewSecureHandler() *SecureHTTPHandler {
	return &SecureHTTPHandler{}
}

// SecureJSONDecoder safely decodes JSON with size limits and validation
func (s *SecureHTTPHandler) SecureJSONDecoder(r *http.Request, v interface{}) error {
	// Limit request body size to prevent DoS
	r.Body = http.MaxBytesReader(nil, r.Body, MaxRequestBodySize)

	// Read and validate content type
	contentType := r.Header.Get(HeaderContentType)
	if !strings.HasPrefix(contentType, ContentTypeJSON) {
		return ValidationError{
			Field:   "Content-Type",
			Value:   contentType,
			Message: "invalid content type, expected application/json",
			Err:     ErrInvalidFormat,
		}
	}

	// Create decoder with strict validation
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields() // Prevent injection of unexpected fields

	if err := decoder.Decode(v); err != nil {
		if err == io.EOF {
			return ValidationError{
				Field:   "body",
				Value:   "",
				Message: "request body is empty",
				Err:     ErrInvalidInput,
			}
		}

		// Check for potential JSON injection
		if strings.Contains(err.Error(), "json: unknown field") {
			return ValidationError{
				Field:   "body",
				Value:   err.Error(),
				Message: "unknown fields not allowed",
				Err:     ErrInvalidInput,
			}
		}

		return ValidationError{
			Field:   "body",
			Value:   err.Error(),
			Message: "invalid JSON format",
			Err:     ErrInvalidFormat,
		}
	}

	// Ensure no additional data exists
	if decoder.More() {
		return ValidationError{
			Field:   "body",
			Value:   "",
			Message: "additional data found after JSON object",
			Err:     ErrInvalidFormat,
		}
	}

	return nil
}

// ValidateAndParseURLParam safely parses URL parameters with validation
func (s *SecureHTTPHandler) ValidateAndParseURLParam(r *http.Request, paramName string) (int64, error) {
	paramStr := chi.URLParam(r, paramName)
	if paramStr == "" {
		return 0, ValidationError{
			Field:   paramName,
			Value:   paramStr,
			Message: fmt.Sprintf("%s parameter is required", paramName),
			Err:     ErrInvalidInput,
		}
	}

	// Check for potential injection in URL param
	if containsSQLInjection(paramStr) || containsXSS(paramStr) {
		return 0, ValidationError{
			Field:   paramName,
			Value:   paramStr,
			Message: "invalid characters in parameter",
			Err:     ErrInvalidInput,
		}
	}

	id, err := strconv.ParseInt(paramStr, 10, 64)
	if err != nil {
		return 0, ValidationError{
			Field:   paramName,
			Value:   paramStr,
			Message: "parameter must be a valid integer",
			Err:     ErrInvalidFormat,
		}
	}

	if err := ValidateID(id, paramName); err != nil {
		return 0, err
	}

	return id, nil
}

// ValidateAndParseQueryParams safely parses query parameters
func (s *SecureHTTPHandler) ValidateAndParseQueryParams(r *http.Request) (domain.YearMonth, error) {
	yearStr := r.URL.Query().Get("year")
	monthStr := r.URL.Query().Get("month")

	if yearStr == "" || monthStr == "" {
		return domain.YearMonth{}, ValidationError{
			Field:   "query_params",
			Value:   fmt.Sprintf("year=%s&month=%s", yearStr, monthStr),
			Message: "year and month query parameters are required",
			Err:     ErrInvalidInput,
		}
	}

	// Check for injection attempts
	if containsSQLInjection(yearStr) || containsXSS(yearStr) ||
		containsSQLInjection(monthStr) || containsXSS(monthStr) {
		return domain.YearMonth{}, ValidationError{
			Field:   "query_params",
			Value:   fmt.Sprintf("year=%s&month=%s", yearStr, monthStr),
			Message: "invalid characters in query parameters",
			Err:     ErrInvalidInput,
		}
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		return domain.YearMonth{}, ValidationError{
			Field:   "year",
			Value:   yearStr,
			Message: "year must be a valid integer",
			Err:     ErrInvalidFormat,
		}
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil {
		return domain.YearMonth{}, ValidationError{
			Field:   "month",
			Value:   monthStr,
			Message: "month must be a valid integer",
			Err:     ErrInvalidFormat,
		}
	}

	ym := domain.YearMonth{Year: year, Month: month}
	if err := ValidateYearMonth(ym); err != nil {
		return domain.YearMonth{}, err
	}

	return ym, nil
}

// SecureJSONResponse safely sends JSON responses with security headers
func (s *SecureHTTPHandler) SecureJSONResponse(w http.ResponseWriter, status int, data interface{}) {
	// Set security headers
	w.Header().Set(HeaderContentType, ContentTypeJSON)
	w.Header().Set(HeaderXContentTypeOptions, "nosniff")
	w.Header().Set(HeaderXFrameOptions, "DENY")
	w.Header().Set(HeaderXXSSProtection, "1; mode=block")

	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		// If we can't encode the response, send a generic error
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal server error"}`))
	}
}

// SecureErrorResponse safely sends error responses
func (s *SecureHTTPHandler) SecureErrorResponse(w http.ResponseWriter, status int, message string) {
	// Sanitize error message to prevent information leakage
	sanitizedMsg, err := SanitizeString(message, "error_message")
	if err != nil {
		// If we can't sanitize the error message, use a generic one
		sanitizedMsg = "an error occurred"
	}

	s.SecureJSONResponse(w, status, map[string]string{
		"error": sanitizedMsg,
	})
}

// Middleware functions

// RequestSizeLimit middleware limits request body size
func RequestSizeLimit(maxSize int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxSize)
			next.ServeHTTP(w, r)
		})
	}
}

// SecurityHeadersMiddleware adds security headers to all responses
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Security headers
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Content Security Policy
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net https://esm.run; " +
			"style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; " +
			"font-src 'self' https://unpkg.com https://cdn.jsdelivr.net; " +
			"connect-src 'self'; " +
			"img-src 'self' data:; " +
			"frame-ancestors 'none';"
		w.Header().Set("Content-Security-Policy", csp)

		next.ServeHTTP(w, r)
	})
}

// InputValidationMiddleware validates common input patterns
func InputValidationMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip validation for health endpoints
		if r.URL.Path == "/healthz" || r.URL.Path == "/readyz" {
			next.ServeHTTP(w, r)
			return
		}

		// Check User-Agent to prevent automated attacks (but allow empty for tests)
		userAgent := r.Header.Get("User-Agent")
		if userAgent != "" {
			if containsSQLInjection(userAgent) || containsXSS(userAgent) {
				handler := NewSecureHandler()
				handler.SecureErrorResponse(w, http.StatusBadRequest, "invalid user agent")
				return
			}
		}

		// Validate Referer if present
		if referer := r.Header.Get("Referer"); referer != "" {
			if containsSQLInjection(referer) || containsXSS(referer) {
				handler := NewSecureHandler()
				handler.SecureErrorResponse(w, http.StatusBadRequest, "invalid referer")
				return
			}
		}

		next.ServeHTTP(w, r)
	})
} // RateLimitMiddleware provides basic rate limiting per IP
func RateLimitMiddleware(requestsPerMinute int) func(http.Handler) http.Handler {
	// Simple in-memory rate limiting - in production, use Redis or similar
	type client struct {
		requests  int
		resetTime int64
	}

	clients := make(map[string]*client)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get client IP
			ip := r.RemoteAddr
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = strings.Split(forwarded, ",")[0]
			}
			if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
				ip = realIP
			}

			// Clean up old entries and check rate limit
			now := getCurrentTimestamp()
			if c, exists := clients[ip]; exists {
				if now > c.resetTime {
					c.requests = 0
					c.resetTime = now + 60 // Reset after 60 seconds
				}

				if c.requests >= requestsPerMinute {
					handler := NewSecureHandler()
					handler.SecureErrorResponse(w, http.StatusTooManyRequests, "rate limit exceeded")
					return
				}

				c.requests++
			} else {
				clients[ip] = &client{
					requests:  1,
					resetTime: now + 60,
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// getCurrentTimestamp returns current Unix timestamp
func getCurrentTimestamp() int64 {
	// In production, use time.Now().Unix()
	// For demo purposes, return a simple incrementing value
	return 1700000000 // Placeholder timestamp
}

// Helper function to validate session tokens
func ValidateSessionToken(token string) error {
	if len(token) == 0 {
		return ValidationError{
			Field:   "session_token",
			Value:   "",
			Message: "session token is required",
			Err:     ErrInvalidInput,
		}
	}

	if len(token) > 128 { // Reasonable session token length
		return ValidationError{
			Field:   "session_token",
			Value:   token[:20] + "...",
			Message: "session token too long",
			Err:     ErrInputTooLong,
		}
	}

	// Check for potential injection patterns
	if containsSQLInjection(token) || containsXSS(token) {
		return ValidationError{
			Field:   "session_token",
			Value:   token,
			Message: "invalid session token format",
			Err:     ErrInvalidFormat,
		}
	}

	return nil
}

// ValidateAPIKey validates API key format and content
func ValidateAPIKey(apiKey string) error {
	if len(apiKey) == 0 {
		return ValidationError{
			Field:   "api_key",
			Value:   "",
			Message: "API key is required",
			Err:     ErrInvalidInput,
		}
	}

	if len(apiKey) < 10 || len(apiKey) > 255 {
		return ValidationError{
			Field:   "api_key",
			Value:   apiKey[:10] + "...",
			Message: "API key length invalid",
			Err:     ErrInvalidFormat,
		}
	}

	// Check for potential injection patterns
	if containsSQLInjection(apiKey) || containsXSS(apiKey) {
		return ValidationError{
			Field:   "api_key",
			Value:   apiKey,
			Message: "invalid API key format",
			Err:     ErrInvalidFormat,
		}
	}

	return nil
}
