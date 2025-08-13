package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/mdco1990/webapp/internal/config"
	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/middleware"
	"github.com/mdco1990/webapp/internal/repository"
	"github.com/mdco1990/webapp/internal/security"
	"github.com/mdco1990/webapp/internal/service"
)

const errInvalidID = "invalid id"

// registerAPIRoutes wires protected API endpoints
func registerAPIRoutes(
	r chi.Router,
	cfg config.Config,
	repo *repository.Repository,
	svc *service.Service,
) {
	r.Route("/api/v1", func(api chi.Router) {
		api.Use(
			middleware.APIKeyAuth(middleware.APIKeyConfig{Header: "X-API-Key", Key: cfg.APIKey}),
		)
		api.Use(RequireSession(repo))

		registerLegacyEndpoints(api, svc)
		registerEnhancedEndpoints(api, repo)
		registerIncomeSourceEndpoints(api, repo)
		registerBudgetSourceEndpoints(api, repo)
		registerManualBudgetEndpoints(api, repo)
	})
}

// registerLegacyEndpoints wires legacy API endpoints
func registerLegacyEndpoints(api chi.Router, svc *service.Service) {
	api.Get("/summary", handleSummary(svc))
	api.Post("/salary", handleSetSalary(svc))
	api.Post("/budget", handleSetBudget(svc))
	api.Get("/expenses", handleListExpenses(svc))
	api.Post("/expenses", handleAddExpense(svc))
	api.Delete("/expenses/{id}", handleDeleteExpense(svc))
}

// handleSummary returns monthly summary
func handleSummary(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ym, err := parseYM(r)
		if err != nil {
			respondErr(w, http.StatusBadRequest, err.Error())
			return
		}
		s, err := svc.Summary(r.Context(), ym)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed")
			return
		}
		respondJSON(w, http.StatusOK, s)
	}
}

// handleSetSalary sets salary for a month
func handleSetSalary(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Year        int   `json:"year"`
			Month       int   `json:"month"`
			AmountCents int64 `json:"amount_cents"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondErr(w, http.StatusBadRequest, invalidBodyMsg)
			return
		}
		if err := svc.SetSalary(r.Context(), domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.AmountCents)); err != nil {
			respondErr(w, http.StatusBadRequest, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// handleSetBudget sets budget for a month
func handleSetBudget(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Year        int   `json:"year"`
			Month       int   `json:"month"`
			AmountCents int64 `json:"amount_cents"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondErr(w, http.StatusBadRequest, invalidBodyMsg)
			return
		}
		if err := svc.SetBudget(r.Context(), domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.AmountCents)); err != nil {
			respondErr(w, http.StatusBadRequest, err.Error())
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// handleListExpenses lists expenses for a month
func handleListExpenses(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ym, err := parseYM(r)
		if err != nil {
			respondErr(w, http.StatusBadRequest, err.Error())
			return
		}
		items, err := svc.ListExpenses(r.Context(), ym)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed")
			return
		}
		respondJSON(w, http.StatusOK, items)
	}
}

// handleAddExpense adds a new expense with OWASP security validation
func handleAddExpense(svc *service.Service) http.HandlerFunc {
	secureHandler := security.NewSecureHandler()
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Year        int    `json:"year"`
			Month       int    `json:"month"`
			Category    string `json:"category"`
			Description string `json:"description"`
			AmountCents int64  `json:"amount_cents"`
		}

		if err := secureHandler.SecureJSONDecoder(r, &req); err != nil {
			secureHandler.SecureErrorResponse(w, http.StatusBadRequest, "invalid request body")
			return
		}

		expense := &domain.Expense{
			YearMonth:   domain.YearMonth{Year: req.Year, Month: req.Month},
			Category:    req.Category,
			Description: req.Description,
			AmountCents: domain.Money(req.AmountCents),
		}

		// Enhanced OWASP validation and sanitization
		validatedExpense, err := security.ValidateExpense(expense)
		if err != nil {
			secureHandler.SecureErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}

		id, err := svc.AddExpense(r.Context(), validatedExpense)
		if err != nil {
			secureHandler.SecureErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}

		secureHandler.SecureJSONResponse(w, http.StatusCreated, map[string]any{"id": id})
	}
}

// handleDeleteExpense deletes an expense
func handleDeleteExpense(svc *service.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			respondErr(w, http.StatusBadRequest, errInvalidID)
			return
		}
		if err := svc.DeleteExpense(r.Context(), id); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// registerEnhancedEndpoints wires new enhanced API endpoints
func registerEnhancedEndpoints(api chi.Router, repo *repository.Repository) {
	api.Get("/monthly-data", handleMonthlyData(repo))
	api.Post("/seed-defaults", handleSeedDefaults(repo))
}

// handleMonthlyData gets monthly data
func handleMonthlyData(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		ym, err := parseYM(r)
		if err != nil {
			respondErr(w, http.StatusBadRequest, err.Error())
			return
		}

		data, err := repo.GetMonthlyData(r.Context(), userID, ym)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to get monthly data")
			return
		}

		respondJSON(w, http.StatusOK, data)
	}
}

// handleSeedDefaults seeds default income/budget sources for the month if they are empty
func handleSeedDefaults(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		var req struct {
			Year  int `json:"year"`
			Month int `json:"month"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondErr(w, http.StatusBadRequest, invalidBodyMsg)
			return
		}
		if req.Year == 0 || req.Month == 0 {
			respondErr(w, http.StatusBadRequest, "year and month required")
			return
		}

		ym := domain.YearMonth{Year: req.Year, Month: req.Month}
		seededIncome, seededBudget, err := seedDefaultData(r, repo, userID, ym)
		if err != nil {
			return
		}

		respondJSON(w, http.StatusOK, map[string]any{
			"seeded_income": seededIncome,
			"seeded_budget": seededBudget,
		})
	}
}

// seedDefaultData helper function to seed income and budget defaults
func seedDefaultData(
	r *http.Request,
	repo *repository.Repository,
	userID int64,
	ym domain.YearMonth,
) (int, int, error) {
	// Check existing
	income, err := repo.ListIncomeSources(r.Context(), userID, ym)
	if err != nil {
		return 0, 0, err
	}
	budget, err := repo.ListBudgetSources(r.Context(), userID, ym)
	if err != nil {
		return 0, 0, err
	}

	seededIncome := 0
	seededBudget := 0

	if len(income) == 0 {
		seededIncome = seedDefaultIncome(r, repo, userID, ym)
	}

	if len(budget) == 0 {
		seededBudget = seedDefaultBudget(r, repo, userID, ym)
	}

	return seededIncome, seededBudget, nil
}

// seedDefaultIncome creates default income sources
func seedDefaultIncome(
	r *http.Request,
	repo *repository.Repository,
	userID int64,
	ym domain.YearMonth,
) int {
	defaults := []domain.CreateIncomeSourceRequest{
		{Name: "Main Salary", Year: ym.Year, Month: ym.Month, AmountCents: 268187},
		{Name: "Secondary Salary", Year: ym.Year, Month: ym.Month, AmountCents: 141054},
		{Name: "Meal Vouchers", Year: ym.Year, Month: ym.Month, AmountCents: 15000},
		{Name: "Other", Year: ym.Year, Month: ym.Month, AmountCents: 0},
	}
	seeded := 0
	for _, d := range defaults {
		if _, err := repo.CreateIncomeSource(r.Context(), userID, d); err == nil {
			seeded++
		}
	}
	return seeded
}

// seedDefaultBudget creates default budget sources
func seedDefaultBudget(
	r *http.Request,
	repo *repository.Repository,
	userID int64,
	ym domain.YearMonth,
) int {
	defaults := []domain.CreateBudgetSourceRequest{
		{Name: "Money Savings", Year: ym.Year, Month: ym.Month, AmountCents: 10000},
		{Name: "Gas/Fuel", Year: ym.Year, Month: ym.Month, AmountCents: 8000},
		{Name: "Dance School", Year: ym.Year, Month: ym.Month, AmountCents: 4000},
		{Name: "Rent", Year: ym.Year, Month: ym.Month, AmountCents: 97686},
		{Name: "Car Loan", Year: ym.Year, Month: ym.Month, AmountCents: 28404},
		{Name: "Car Maintenance", Year: ym.Year, Month: ym.Month, AmountCents: 20025},
		{Name: "Home Insurance", Year: ym.Year, Month: ym.Month, AmountCents: 2315},
		{Name: "Car Insurance", Year: ym.Year, Month: ym.Month, AmountCents: 21185},
		{Name: "Electricity", Year: ym.Year, Month: ym.Month, AmountCents: 5300},
		{Name: "Gas", Year: ym.Year, Month: ym.Month, AmountCents: 11200},
		{Name: "Water", Year: ym.Year, Month: ym.Month, AmountCents: 4500},
		{Name: "Daycare", Year: ym.Year, Month: ym.Month, AmountCents: 6865},
		{Name: "Internet Subscription", Year: ym.Year, Month: ym.Month, AmountCents: 3798},
		{Name: "Phone Subscription", Year: ym.Year, Month: ym.Month, AmountCents: 3998},
		{Name: "Miscellaneous Courses", Year: ym.Year, Month: ym.Month, AmountCents: 65000},
	}
	seeded := 0
	for _, d := range defaults {
		if _, err := repo.CreateBudgetSource(r.Context(), userID, d); err == nil {
			seeded++
		}
	}
	return seeded
}

// registerIncomeSourceEndpoints wires income source CRUD endpoints
func registerIncomeSourceEndpoints(api chi.Router, repo *repository.Repository) {
	api.Route("/income-sources", func(income chi.Router) {
		income.Get("/", handleListIncomeSources(repo))
		income.Post("/", handleCreateIncomeSource(repo))
		income.Put("/{id}", handleUpdateIncomeSource(repo))
		income.Delete("/{id}", handleDeleteIncomeSource(repo))
	})
}

// handleListIncomeSources lists income sources for a month
func handleListIncomeSources(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		ym, err := parseYM(r)
		if err != nil {
			respondErr(w, http.StatusBadRequest, err.Error())
			return
		}
		sources, err := repo.ListIncomeSources(r.Context(), userID, ym)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed")
			return
		}
		respondJSON(w, http.StatusOK, sources)
	}
}

// handleCreateIncomeSource creates a new income source with OWASP security validation
func handleCreateIncomeSource(repo *repository.Repository) http.HandlerFunc {
	secureHandler := security.NewSecureHandler()
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())

		// Validate user ID
		if err := security.ValidateUserID(userID); err != nil {
			secureHandler.SecureErrorResponse(w, http.StatusUnauthorized, "invalid user")
			return
		}

		var req domain.CreateIncomeSourceRequest
		if err := secureHandler.SecureJSONDecoder(r, &req); err != nil {
			secureHandler.SecureErrorResponse(w, http.StatusBadRequest, "invalid request body")
			return
		}

		// Enhanced OWASP validation and sanitization
		validatedReq, err := security.ValidateCreateIncomeSourceRequest(req)
		if err != nil {
			secureHandler.SecureErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}

		source, err := repo.CreateIncomeSource(r.Context(), userID, *validatedReq)
		if err != nil {
			secureHandler.SecureErrorResponse(w, http.StatusInternalServerError, "failed to create income source")
			return
		}

		secureHandler.SecureJSONResponse(w, http.StatusCreated, source)
	}
}

// handleUpdateIncomeSource updates an income source
func handleUpdateIncomeSource(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			respondErr(w, http.StatusBadRequest, errInvalidID)
			return
		}
		var req domain.UpdateSourceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondErr(w, http.StatusBadRequest, invalidBodyMsg)
			return
		}
		if err := repo.UpdateIncomeSource(r.Context(), id, userID, req); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to update income source")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// handleDeleteIncomeSource deletes an income source
func handleDeleteIncomeSource(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			respondErr(w, http.StatusBadRequest, errInvalidID)
			return
		}
		if err := repo.DeleteIncomeSource(r.Context(), id, userID); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to delete income source")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// registerBudgetSourceEndpoints wires budget source CRUD endpoints
func registerBudgetSourceEndpoints(api chi.Router, repo *repository.Repository) {
	api.Route("/budget-sources", func(budget chi.Router) {
		budget.Get("/", handleListBudgetSources(repo))
		budget.Post("/", handleCreateBudgetSource(repo))
		budget.Put("/{id}", handleUpdateBudgetSource(repo))
		budget.Delete("/{id}", handleDeleteBudgetSource(repo))
	})
}

// handleListBudgetSources lists budget sources for a month
func handleListBudgetSources(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		ym, err := parseYM(r)
		if err != nil {
			respondErr(w, http.StatusBadRequest, err.Error())
			return
		}
		sources, err := repo.ListBudgetSources(r.Context(), userID, ym)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed")
			return
		}
		respondJSON(w, http.StatusOK, sources)
	}
}

// handleCreateBudgetSource creates a new budget source
func handleCreateBudgetSource(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		var req domain.CreateBudgetSourceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondErr(w, http.StatusBadRequest, invalidBodyMsg)
			return
		}
		source, err := repo.CreateBudgetSource(r.Context(), userID, req)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to create budget source")
			return
		}
		respondJSON(w, http.StatusCreated, source)
	}
}

// handleUpdateBudgetSource updates a budget source
func handleUpdateBudgetSource(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			respondErr(w, http.StatusBadRequest, errInvalidID)
			return
		}
		var req domain.UpdateSourceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondErr(w, http.StatusBadRequest, invalidBodyMsg)
			return
		}
		if err := repo.UpdateBudgetSource(r.Context(), id, userID, req); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to update budget source")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// handleDeleteBudgetSource deletes a budget source
func handleDeleteBudgetSource(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		idStr := chi.URLParam(r, "id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || id <= 0 {
			respondErr(w, http.StatusBadRequest, errInvalidID)
			return
		}
		if err := repo.DeleteBudgetSource(r.Context(), id, userID); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to delete budget source")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// registerManualBudgetEndpoints wires manual budget endpoints
func registerManualBudgetEndpoints(api chi.Router, repo *repository.Repository) {
	api.Route("/manual-budget", func(mb chi.Router) {
		mb.Get("/", handleGetManualBudget(repo))
		mb.Put("/", handleUpdateManualBudget(repo))
	})
}

// handleGetManualBudget gets manual budget data
func handleGetManualBudget(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		ym, err := parseYM(r)
		if err != nil {
			respondErr(w, http.StatusBadRequest, err.Error())
			return
		}
		data, err := repo.GetManualBudget(r.Context(), userID, ym)
		if err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to get manual budget")
			return
		}
		respondJSON(w, http.StatusOK, map[string]any{
			"bank_amount_cents": int64(data.BankAmountCents),
			"items":             data.Items,
		})
	}
}

// handleUpdateManualBudget updates manual budget data
func handleUpdateManualBudget(repo *repository.Repository) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := getUserIDFromContext(r.Context())
		var req struct {
			Year            int   `json:"year"`
			Month           int   `json:"month"`
			BankAmountCents int64 `json:"bank_amount_cents"`
			Items           []struct {
				ID          interface{} `json:"id"` // Accept both string and int64
				Name        string      `json:"name"`
				AmountCents int64       `json:"amount_cents"`
			} `json:"items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondErr(w, http.StatusBadRequest, invalidBodyMsg)
			return
		}
		if req.Year == 0 || req.Month == 0 {
			respondErr(w, http.StatusBadRequest, "year and month required")
			return
		}

		// Convert to domain objects
		items := make([]domain.ManualBudgetItem, 0, len(req.Items))
		for _, it := range req.Items {
			items = append(items, domain.ManualBudgetItem{
				Name:        strings.TrimSpace(it.Name),
				AmountCents: domain.Money(it.AmountCents),
			})
		}

		if err := repo.UpsertManualBudget(r.Context(), userID, domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.BankAmountCents), items); err != nil {
			respondErr(w, http.StatusInternalServerError, "failed to save manual budget")
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
