// Package service implements business logic orchestrating repositories.
package service

import (
	"context"
	"errors"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/repository"
)

// Service exposes business operations.
type Service struct {
	repo *repository.Repository
}

// New creates a Service backed by the provided repository.
func New(repo *repository.Repository) *Service { return &Service{repo: repo} }

// ErrValidation is returned when inputs fail validation.
var ErrValidation = errors.New("validation error")

func validateYM(ym domain.YearMonth) error {
	if ym.Year < 1970 || ym.Year > 3000 || ym.Month < 1 || ym.Month > 12 {
		return ErrValidation
	}
	return nil
}

// SetSalary validates inputs then stores salary for a month.
func (s *Service) SetSalary(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	if err := validateYM(ym); err != nil {
		return err
	}
	if amount < 0 {
		return ErrValidation
	}
	return s.repo.UpsertSalary(ctx, ym, amount)
}

// SetBudget validates inputs then stores budget for a month.
func (s *Service) SetBudget(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	if err := validateYM(ym); err != nil {
		return err
	}
	if amount < 0 {
		return ErrValidation
	}
	return s.repo.UpsertBudget(ctx, ym, amount)
}

// AddExpense validates and creates an expense.
func (s *Service) AddExpense(ctx context.Context, e *domain.Expense) (int64, error) {
	if err := validateYM(domain.YearMonth{Year: e.Year, Month: e.Month}); err != nil {
		return 0, err
	}
	if e.Description == "" || e.AmountCents <= 0 {
		return 0, ErrValidation
	}
	return s.repo.AddExpense(ctx, e)
}

// ListExpenses returns expenses for a month.
func (s *Service) ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error) {
	if err := validateYM(ym); err != nil {
		return nil, err
	}
	return s.repo.ListExpenses(ctx, ym)
}

// DeleteExpense removes an expense by ID.
func (s *Service) DeleteExpense(ctx context.Context, id int64) error {
	if id <= 0 {
		return ErrValidation
	}
	return s.repo.DeleteExpense(ctx, id)
}

// Summary returns aggregate info for a month.
func (s *Service) Summary(ctx context.Context, ym domain.YearMonth) (domain.Summary, error) {
	if err := validateYM(ym); err != nil {
		return domain.Summary{}, err
	}
	salary, err := s.repo.GetSalary(ctx, ym)
	if err != nil {
		return domain.Summary{}, err
	}
	budget, err := s.repo.GetBudget(ctx, ym)
	if err != nil {
		return domain.Summary{}, err
	}
	expenses, err := s.repo.GetExpensesTotal(ctx, ym)
	if err != nil {
		return domain.Summary{}, err
	}
	remaining := salary + budget - expenses
	return domain.Summary{
		YearMonth:    ym,
		SalaryCents:  salary,
		BudgetCents:  budget,
		ExpenseCents: expenses,
		Remaining:    remaining,
	}, nil
}
