package httpapi

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/personal/webapp/internal/config"
	"github.com/personal/webapp/internal/domain"
	"github.com/personal/webapp/internal/middleware"
	"github.com/personal/webapp/internal/repository"
	"github.com/personal/webapp/internal/service"
)

const errInvalidID = "invalid id"

// registerAPIRoutes wires protected API endpoints
func registerAPIRoutes(r chi.Router, cfg config.Config, repo *repository.Repository, svc *service.Service) {
	r.Route("/api/v1", func(api chi.Router) {
		api.Use(middleware.APIKeyAuth(middleware.APIKeyConfig{Header: "X-API-Key", Key: cfg.APIKey}))
		api.Use(RequireSession(repo))

		// Legacy endpoints
		api.Get("/summary", func(w http.ResponseWriter, r *http.Request) {
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
		})

		api.Post("/salary", func(w http.ResponseWriter, r *http.Request) {
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
		})

		api.Post("/budget", func(w http.ResponseWriter, r *http.Request) {
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
		})

		api.Get("/expenses", func(w http.ResponseWriter, r *http.Request) {
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
		})

		api.Post("/expenses", func(w http.ResponseWriter, r *http.Request) {
			var req struct {
				Year        int    `json:"year"`
				Month       int    `json:"month"`
				Category    string `json:"category"`
				Description string `json:"description"`
				AmountCents int64  `json:"amount_cents"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				respondErr(w, http.StatusBadRequest, invalidBodyMsg)
				return
			}
			id, err := svc.AddExpense(r.Context(), &domain.Expense{YearMonth: domain.YearMonth{Year: req.Year, Month: req.Month}, Category: req.Category, Description: req.Description, AmountCents: domain.Money(req.AmountCents)})
			if err != nil {
				respondErr(w, http.StatusBadRequest, err.Error())
				return
			}
			respondJSON(w, http.StatusCreated, map[string]any{"id": id})
		})

		api.Delete("/expenses/{id}", func(w http.ResponseWriter, r *http.Request) {
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
		})

		// New enhanced endpoints
		api.Get("/monthly-data", func(w http.ResponseWriter, r *http.Request) {
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
		})

		// Seed default income/budget sources for the month if they are empty
		api.Post("/seed-defaults", func(w http.ResponseWriter, r *http.Request) {
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

			// Check existing
			income, err := repo.ListIncomeSources(r.Context(), userID, ym)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to list income sources")
				return
			}
			budget, err := repo.ListBudgetSources(r.Context(), userID, ym)
			if err != nil {
				respondErr(w, http.StatusInternalServerError, "failed to list budget sources")
				return
			}

			seededIncome := 0
			seededBudget := 0

			if len(income) == 0 {
				defaults := []domain.CreateIncomeSourceRequest{
					{Name: "Main Salary", Year: req.Year, Month: req.Month, AmountCents: 268187},
					{Name: "Secondary Salary", Year: req.Year, Month: req.Month, AmountCents: 141054},
					{Name: "Meal Vouchers", Year: req.Year, Month: req.Month, AmountCents: 15000},
					{Name: "Other", Year: req.Year, Month: req.Month, AmountCents: 0},
				}
				for _, d := range defaults {
					if _, err := repo.CreateIncomeSource(r.Context(), userID, d); err == nil {
						seededIncome++
					}
				}
			}

			if len(budget) == 0 {
				defaults := []domain.CreateBudgetSourceRequest{
					{Name: "Money Savings", Year: req.Year, Month: req.Month, AmountCents: 10000},
					{Name: "Gas/Fuel", Year: req.Year, Month: req.Month, AmountCents: 8000},
					{Name: "Dance School", Year: req.Year, Month: req.Month, AmountCents: 4000},
					{Name: "Rent", Year: req.Year, Month: req.Month, AmountCents: 97686},
					{Name: "Car Loan", Year: req.Year, Month: req.Month, AmountCents: 28404},
					{Name: "Car Maintenance", Year: req.Year, Month: req.Month, AmountCents: 20025},
					{Name: "Home Insurance", Year: req.Year, Month: req.Month, AmountCents: 2315},
					{Name: "Car Insurance", Year: req.Year, Month: req.Month, AmountCents: 21185},
					{Name: "Electricity", Year: req.Year, Month: req.Month, AmountCents: 5300},
					{Name: "Gas", Year: req.Year, Month: req.Month, AmountCents: 11200},
					{Name: "Water", Year: req.Year, Month: req.Month, AmountCents: 4500},
					{Name: "Daycare", Year: req.Year, Month: req.Month, AmountCents: 6865},
					{Name: "Internet Subscription", Year: req.Year, Month: req.Month, AmountCents: 3798},
					{Name: "Phone Subscription", Year: req.Year, Month: req.Month, AmountCents: 3998},
					{Name: "Miscellaneous Courses", Year: req.Year, Month: req.Month, AmountCents: 65000},
				}
				for _, d := range defaults {
					if _, err := repo.CreateBudgetSource(r.Context(), userID, d); err == nil {
						seededBudget++
					}
				}
			}

			respondJSON(w, http.StatusOK, map[string]any{
				"seeded_income": seededIncome,
				"seeded_budget": seededBudget,
			})
		})

		// Income Sources endpoints
		api.Route("/income-sources", func(income chi.Router) {
			income.Get("/", func(w http.ResponseWriter, r *http.Request) {
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
			})

			income.Post("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				var req domain.CreateIncomeSourceRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondErr(w, http.StatusBadRequest, invalidBodyMsg)
					return
				}
				source, err := repo.CreateIncomeSource(r.Context(), userID, req)
				if err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to create income source")
					return
				}
				respondJSON(w, http.StatusCreated, source)
			})

			income.Put("/{id}", func(w http.ResponseWriter, r *http.Request) {
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
			})

			income.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
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
			})
		})

		// Budget Sources endpoints
		api.Route("/budget-sources", func(budget chi.Router) {
			budget.Get("/", func(w http.ResponseWriter, r *http.Request) {
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
			})
			budget.Post("/", func(w http.ResponseWriter, r *http.Request) {
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
			})

			budget.Put("/{id}", func(w http.ResponseWriter, r *http.Request) {
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
			})

			budget.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
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
			})
		})

		// Manual Budget endpoints
		api.Route("/manual-budget", func(mb chi.Router) {
			mb.Get("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				tym, err := parseYM(r)
				if err != nil {
					respondErr(w, http.StatusBadRequest, err.Error())
					return
				}
				data, err := repo.GetManualBudget(r.Context(), userID, tym)
				if err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to get manual budget")
					return
				}
				respondJSON(w, http.StatusOK, map[string]any{
					"bank_amount_cents": int64(data.BankAmountCents),
					"items":             data.Items,
				})
			})

			mb.Put("/", func(w http.ResponseWriter, r *http.Request) {
				userID := getUserIDFromContext(r.Context())
				var req struct {
					Year            int                       `json:"year"`
					Month           int                       `json:"month"`
					BankAmountCents int64                     `json:"bank_amount_cents"`
					Items           []domain.ManualBudgetItem `json:"items"`
				}
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					respondErr(w, http.StatusBadRequest, invalidBodyMsg)
					return
				}
				if req.Year == 0 || req.Month == 0 {
					respondErr(w, http.StatusBadRequest, "year and month required")
					return
				}
				// Sanitize items: keep name, amount_cents
				items := make([]domain.ManualBudgetItem, 0, len(req.Items))
				for _, it := range req.Items {
					items = append(items, domain.ManualBudgetItem{Name: strings.TrimSpace(it.Name), AmountCents: domain.Money(it.AmountCents)})
				}
				if err := repo.UpsertManualBudget(r.Context(), userID, domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.BankAmountCents), items); err != nil {
					respondErr(w, http.StatusInternalServerError, "failed to save manual budget")
					return
				}
				respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
			})
		})
	})
}
