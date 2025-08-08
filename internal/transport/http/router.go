package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"github.com/personal/webapp/internal/config"
	"github.com/personal/webapp/internal/domain"
	"github.com/personal/webapp/internal/middleware"
	"github.com/personal/webapp/internal/repository"
	"github.com/personal/webapp/internal/service"
)

const invalidBodyMsg = "invalid body"

func NewRouter(cfg config.Config, db *sql.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "X-API-Key"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	repo := repository.New(db)
	svc := service.New(repo)

	r.Route("/api/v1", func(api chi.Router) {
		api.Use(middleware.APIKeyAuth(middleware.APIKeyConfig{Header: "X-API-Key", Key: cfg.APIKey}))

		api.Get("/summary", func(w http.ResponseWriter, r *http.Request) {
			ym, err := parseYM(r)
			if err != nil { respondErr(w, http.StatusBadRequest, err.Error()); return }
			s, err := svc.Summary(r.Context(), ym)
			if err != nil { respondErr(w, http.StatusInternalServerError, "failed"); return }
			respondJSON(w, http.StatusOK, s)
		})

		api.Post("/salary", func(w http.ResponseWriter, r *http.Request) {
			var req struct { Year int `json:"year"`; Month int `json:"month"`; AmountCents int64 `json:"amount_cents"` }
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respondErr(w, http.StatusBadRequest, invalidBodyMsg); return }
			if err := svc.SetSalary(r.Context(), domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.AmountCents)); err != nil { respondErr(w, http.StatusBadRequest, err.Error()); return }
			respondJSON(w, http.StatusOK, map[string]string{"status":"ok"})
		})

		api.Post("/budget", func(w http.ResponseWriter, r *http.Request) {
			var req struct { Year int `json:"year"`; Month int `json:"month"`; AmountCents int64 `json:"amount_cents"` }
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respondErr(w, http.StatusBadRequest, invalidBodyMsg); return }
			if err := svc.SetBudget(r.Context(), domain.YearMonth{Year: req.Year, Month: req.Month}, domain.Money(req.AmountCents)); err != nil { respondErr(w, http.StatusBadRequest, err.Error()); return }
			respondJSON(w, http.StatusOK, map[string]string{"status":"ok"})
		})

		api.Get("/expenses", func(w http.ResponseWriter, r *http.Request) {
			ym, err := parseYM(r)
			if err != nil { respondErr(w, http.StatusBadRequest, err.Error()); return }
			items, err := svc.ListExpenses(r.Context(), ym)
			if err != nil { respondErr(w, http.StatusInternalServerError, "failed"); return }
			respondJSON(w, http.StatusOK, items)
		})

		api.Post("/expenses", func(w http.ResponseWriter, r *http.Request) {
			var req struct { Year int `json:"year"`; Month int `json:"month"`; Category string `json:"category"`; Description string `json:"description"`; AmountCents int64 `json:"amount_cents"` }
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil { respondErr(w, http.StatusBadRequest, invalidBodyMsg); return }
			id, err := svc.AddExpense(r.Context(), &domain.Expense{YearMonth: domain.YearMonth{Year: req.Year, Month: req.Month}, Category: req.Category, Description: req.Description, AmountCents: domain.Money(req.AmountCents)})
			if err != nil { respondErr(w, http.StatusBadRequest, err.Error()); return }
			respondJSON(w, http.StatusCreated, map[string]any{"id": id})
		})

		api.Delete("/expenses/{id}", func(w http.ResponseWriter, r *http.Request) {
			idStr := chi.URLParam(r, "id")
			id, err := strconv.ParseInt(idStr, 10, 64)
			if err != nil || id <= 0 { respondErr(w, http.StatusBadRequest, "invalid id"); return }
			if err := svc.DeleteExpense(r.Context(), id); err != nil { respondErr(w, http.StatusInternalServerError, "failed"); return }
			respondJSON(w, http.StatusOK, map[string]string{"status":"ok"})
		})
	})

	return r
}

func parseYM(r *http.Request) (domain.YearMonth, error) {
	yearStr := r.URL.Query().Get("year")
	monthStr := r.URL.Query().Get("month")
	y, err := strconv.Atoi(yearStr); if err != nil { return domain.YearMonth{}, err }
	m, err := strconv.Atoi(monthStr); if err != nil { return domain.YearMonth{}, err }
	return domain.YearMonth{Year: y, Month: m}, nil
}

func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func respondErr(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, map[string]string{"error": msg})
}
