package service

import (
	"context"
	"errors"

	"github.com/personal/webapp/internal/domain"
	"github.com/personal/webapp/internal/repository"
)

type Service struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Service { return &Service{repo: repo} }

var ErrValidation = errors.New("validation error")

func validateYM(ym domain.YearMonth) error {
	if ym.Year < 1970 || ym.Year > 3000 || ym.Month < 1 || ym.Month > 12 {
		return ErrValidation
	}
	return nil
}

func (s *Service) SetSalary(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	if err := validateYM(ym); err != nil { return err }
	if amount < 0 { return ErrValidation }
	return s.repo.UpsertSalary(ctx, ym, amount)
}

func (s *Service) SetBudget(ctx context.Context, ym domain.YearMonth, amount domain.Money) error {
	if err := validateYM(ym); err != nil { return err }
	if amount < 0 { return ErrValidation }
	return s.repo.UpsertBudget(ctx, ym, amount)
}

func (s *Service) AddExpense(ctx context.Context, e *domain.Expense) (int64, error) {
	if err := validateYM(domain.YearMonth{Year: e.Year, Month: e.Month}); err != nil { return 0, err }
	if e.Description == "" || e.AmountCents <= 0 { return 0, ErrValidation }
	return s.repo.AddExpense(ctx, e)
}

func (s *Service) ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error) {
	if err := validateYM(ym); err != nil { return nil, err }
	return s.repo.ListExpenses(ctx, ym)
}

func (s *Service) DeleteExpense(ctx context.Context, id int64) error {
	if id <= 0 { return ErrValidation }
	return s.repo.DeleteExpense(ctx, id)
}

func (s *Service) Summary(ctx context.Context, ym domain.YearMonth) (domain.Summary, error) {
	if err := validateYM(ym); err != nil { return domain.Summary{}, err }
	salary, err := s.repo.GetSalary(ctx, ym); if err != nil { return domain.Summary{}, err }
	budget, err := s.repo.GetBudget(ctx, ym); if err != nil { return domain.Summary{}, err }
	expenses, err := s.repo.GetExpensesTotal(ctx, ym); if err != nil { return domain.Summary{}, err }
	remaining := salary + budget - expenses
	return domain.Summary{YearMonth: ym, SalaryCents: salary, BudgetCents: budget, ExpenseCents: expenses, Remaining: remaining}, nil
}
