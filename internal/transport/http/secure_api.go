package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/repository"
	"github.com/mdco1990/webapp/internal/security"
	"github.com/mdco1990/webapp/internal/service"
)

// Error message constants
const (
	msgInvalidUser        = "invalid user"
	msgInvalidRequestBody = "invalid request body"
	msgValidationFailed   = "validation failed"
	msgInvalidID          = "invalid ID"
)

// secureAPIHandlers contains OWASP-compliant API handlers
type secureAPIHandlers struct {
	secureHandler *security.SecureHTTPHandler
}

func newSecureAPIHandlers() *secureAPIHandlers {
	return &secureAPIHandlers{
		secureHandler: security.NewSecureHandler(),
	}
}

// Helper functions to reduce cognitive complexity

func (h *secureAPIHandlers) validateUserID(w http.ResponseWriter, userID int64) bool {
	if err := security.ValidateUserID(userID); err != nil {
		h.secureHandler.SecureErrorResponse(w, http.StatusUnauthorized, msgInvalidUser)
		return false
	}
	return true
}

func (h *secureAPIHandlers) handleValidationError(
	w http.ResponseWriter,
	err error,
	defaultMsg string,
) {
	var validationErr security.ValidationError
	if errors.As(err, &validationErr) {
		h.secureHandler.SecureErrorResponse(w, http.StatusBadRequest, validationErr.Message)
	} else {
		h.secureHandler.SecureErrorResponse(w, http.StatusBadRequest, defaultMsg)
	}
}

// Simplified secure handlers with enhanced OWASP validation

// secureHandleCreateIncomeSource creates income sources with full validation
func (h *secureAPIHandlers) secureHandleCreateIncomeSource(
	repo *repository.Repository,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		if !h.validateUserID(w, userID) {
			return
		}

		var req domain.CreateIncomeSourceRequest
		if err := h.secureHandler.SecureJSONDecoder(r, &req); err != nil {
			h.handleValidationError(w, err, msgInvalidRequestBody)
			return
		}

		validatedReq, err := security.ValidateCreateIncomeSourceRequest(req)
		if err != nil {
			h.handleValidationError(w, err, msgValidationFailed)
			return
		}

		source, err := repo.CreateIncomeSource(r.Context(), userID, *validatedReq)
		if err != nil {
			h.secureHandler.SecureErrorResponse(
				w,
				http.StatusInternalServerError,
				"failed to create income source",
			)
			return
		}

		h.secureHandler.SecureJSONResponse(w, http.StatusCreated, source)
	}
}

// secureHandleUpdateIncomeSource updates income sources with validation
func (h *secureAPIHandlers) secureHandleUpdateIncomeSource(
	repo *repository.Repository,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		if !h.validateUserID(w, userID) {
			return
		}

		id, err := h.secureHandler.ValidateAndParseURLParam(r, "id")
		if err != nil {
			h.handleValidationError(w, err, msgInvalidID)
			return
		}

		var req domain.UpdateSourceRequest
		if err := h.secureHandler.SecureJSONDecoder(r, &req); err != nil {
			h.handleValidationError(w, err, msgInvalidRequestBody)
			return
		}

		validatedReq, err := security.ValidateUpdateSourceRequest(req)
		if err != nil {
			h.handleValidationError(w, err, msgValidationFailed)
			return
		}

		if err := repo.UpdateIncomeSource(r.Context(), id, userID, *validatedReq); err != nil {
			h.secureHandler.SecureErrorResponse(
				w,
				http.StatusInternalServerError,
				"failed to update",
			)
			return
		}

		h.secureHandler.SecureJSONResponse(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// secureHandleDeleteIncomeSource deletes income sources with validation
func (h *secureAPIHandlers) secureHandleDeleteIncomeSource(
	repo *repository.Repository,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		if !h.validateUserID(w, userID) {
			return
		}

		id, err := h.secureHandler.ValidateAndParseURLParam(r, "id")
		if err != nil {
			h.handleValidationError(w, err, msgInvalidID)
			return
		}

		if err := repo.DeleteIncomeSource(r.Context(), id, userID); err != nil {
			h.secureHandler.SecureErrorResponse(
				w,
				http.StatusInternalServerError,
				"failed to delete income source",
			)
			return
		}

		h.secureHandler.SecureJSONResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
	}
}

// secureHandleCreateBudgetSource creates budget sources with full validation
func (h *secureAPIHandlers) secureHandleCreateBudgetSource(
	repo *repository.Repository,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		if !h.validateUserID(w, userID) {
			return
		}

		var req domain.CreateBudgetSourceRequest
		if err := h.secureHandler.SecureJSONDecoder(r, &req); err != nil {
			h.handleValidationError(w, err, msgInvalidRequestBody)
			return
		}

		validatedReq, err := security.ValidateCreateBudgetSourceRequest(req)
		if err != nil {
			h.handleValidationError(w, err, msgValidationFailed)
			return
		}

		source, err := repo.CreateBudgetSource(r.Context(), userID, *validatedReq)
		if err != nil {
			h.secureHandler.SecureErrorResponse(
				w,
				http.StatusInternalServerError,
				"failed to create budget source",
			)
			return
		}

		h.secureHandler.SecureJSONResponse(w, http.StatusCreated, source)
	}
}

// secureHandleUpdateBudgetSource updates budget sources with validation
func (h *secureAPIHandlers) secureHandleUpdateBudgetSource(
	repo *repository.Repository,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		if !h.validateUserID(w, userID) {
			return
		}

		id, err := h.secureHandler.ValidateAndParseURLParam(r, "id")
		if err != nil {
			h.handleValidationError(w, err, msgInvalidID)
			return
		}

		var req domain.UpdateSourceRequest
		if err := h.secureHandler.SecureJSONDecoder(r, &req); err != nil {
			h.handleValidationError(w, err, msgInvalidRequestBody)
			return
		}

		validatedReq, err := security.ValidateUpdateSourceRequest(req)
		if err != nil {
			h.handleValidationError(w, err, msgValidationFailed)
			return
		}

		if err := repo.UpdateBudgetSource(r.Context(), id, userID, *validatedReq); err != nil {
			h.secureHandler.SecureErrorResponse(
				w,
				http.StatusInternalServerError,
				"failed to update budget source",
			)
			return
		}

		h.secureHandler.SecureJSONResponse(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// secureHandleDeleteBudgetSource deletes budget sources with validation
func (h *secureAPIHandlers) secureHandleDeleteBudgetSource(
	repo *repository.Repository,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		if !h.validateUserID(w, userID) {
			return
		}

		id, err := h.secureHandler.ValidateAndParseURLParam(r, "id")
		if err != nil {
			h.handleValidationError(w, err, msgInvalidID)
			return
		}

		if err := repo.DeleteBudgetSource(r.Context(), id, userID); err != nil {
			h.secureHandler.SecureErrorResponse(
				w,
				http.StatusInternalServerError,
				"failed to delete budget source",
			)
			return
		}

		h.secureHandler.SecureJSONResponse(w, http.StatusOK, map[string]string{"status": "deleted"})
	}
}

// secureHandleUpsertManualBudget creates or updates manual budgets with full validation
func (h *secureAPIHandlers) secureHandleUpsertManualBudget(
	repo *repository.Repository,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		if !h.validateUserID(w, userID) {
			return
		}

		var req domain.ManualBudget
		if err := h.secureHandler.SecureJSONDecoder(r, &req); err != nil {
			h.handleValidationError(w, err, msgInvalidRequestBody)
			return
		}

		// Validate the manual budget data
		if err := security.ValidateManualBudget(req); err != nil {
			h.handleValidationError(w, err, msgValidationFailed)
			return
		}

		// Call the repository method with correct parameters
		err := repo.UpsertManualBudget(
			r.Context(),
			userID,
			req.YearMonth,
			req.BankAmountCents,
			req.Items,
		)
		if err != nil {
			h.secureHandler.SecureErrorResponse(
				w,
				http.StatusInternalServerError,
				"failed to upsert manual budget",
			)
			return
		}

		h.secureHandler.SecureJSONResponse(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// Enhanced middleware with validation

// ValidatedJSONDecoder middleware that ensures JSON requests are properly validated
func ValidatedJSONDecoder(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost || r.Method == http.MethodPut ||
			r.Method == http.MethodPatch {
			contentType := r.Header.Get("Content-Type")
			if contentType != "" && !contains(contentType, "application/json") {
				secureHandler := security.NewSecureHandler()
				secureHandler.SecureErrorResponse(
					w,
					http.StatusBadRequest,
					"Content-Type must be application/json",
				)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

// registerSecureAPIRoutes registers API routes with enhanced security validation
func registerSecureAPIRoutes(
	r chi.Router,
	repo *repository.Repository,
	_ *service.Service,
) {
	handlers := newSecureAPIHandlers()

	r.Route("/api/v1/secure", func(api chi.Router) {
		// Income Sources with enhanced validation
		api.Route("/income-sources", func(income chi.Router) {
			income.Post("/", handlers.secureHandleCreateIncomeSource(repo))
			income.Put("/{id}", handlers.secureHandleUpdateIncomeSource(repo))
			income.Delete("/{id}", handlers.secureHandleDeleteIncomeSource(repo))
		})

		// Budget Sources with enhanced validation
		api.Route("/budget-sources", func(budget chi.Router) {
			budget.Post("/", handlers.secureHandleCreateBudgetSource(repo))
			budget.Put("/{id}", handlers.secureHandleUpdateBudgetSource(repo))
			budget.Delete("/{id}", handlers.secureHandleDeleteBudgetSource(repo))
		})

		// Manual Budget with enhanced validation
		api.Route("/manual-budgets", func(manual chi.Router) {
			manual.Post("/", handlers.secureHandleUpsertManualBudget(repo))
			manual.Put("/{id}", handlers.secureHandleUpsertManualBudget(repo))
		})
	})
}
