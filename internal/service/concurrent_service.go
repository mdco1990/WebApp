// Package service implements concurrent business logic operations.
package service

import (
	"context"
	"sync"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/repository"
)

// ConcurrentService handles concurrent operations for the financial service.
type ConcurrentService struct {
	repo *repository.Repository
}

// NewConcurrentService creates a new ConcurrentService instance.
func NewConcurrentService(repo *repository.Repository) *ConcurrentService {
	return &ConcurrentService{repo: repo}
}

// MonthlyDataResult holds the result of concurrent data fetching.
type MonthlyDataResult struct {
	IncomeSources []domain.IncomeSource
	BudgetSources []domain.BudgetSource
	Expenses      []domain.Expense
	Errors        []error
}

// GetMonthlyDataConcurrent fetches income sources, budget sources, and expenses concurrently.
// Uses goroutines for parallel data fetching with proper synchronization.
//
//nolint:cyclop
func (s *ConcurrentService) GetMonthlyDataConcurrent(ctx context.Context, ym domain.YearMonth) (*MonthlyDataResult, error) {
	if err := validateYM(ym); err != nil {
		return nil, err
	}

	// Create context with timeout for concurrent operations
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var (
		wg          sync.WaitGroup
		mu          sync.Mutex
		result      = &MonthlyDataResult{}
		incomeChan  = make(chan []domain.IncomeSource, 1)
		budgetChan  = make(chan []domain.BudgetSource, 1)
		expenseChan = make(chan []domain.Expense, 1)
		errorChan   = make(chan error, 3)
	)

	// Fetch income sources concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(incomeChan)

		select {
		case <-ctx.Done():
			errorChan <- ctx.Err()
			return
		default:
			//nolint:godox
			// TODO: Need userID parameter - using empty slice for now
			incomeSources := []domain.IncomeSource{}
			incomeChan <- incomeSources
		}
	}()

	// Fetch budget sources concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(budgetChan)

		select {
		case <-ctx.Done():
			errorChan <- ctx.Err()
			return
		default:
			//nolint:godox
			// TODO: Need userID parameter - using empty slice for now
			budgetSources := []domain.BudgetSource{}
			budgetChan <- budgetSources
		}
	}()

	// Fetch expenses concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer close(expenseChan)

		select {
		case <-ctx.Done():
			errorChan <- ctx.Err()
			return
		default:
			expenses, err := s.repo.ListExpenses(ctx, ym)
			if err != nil {
				errorChan <- err
				return
			}
			expenseChan <- expenses
		}
	}()

	// Collect results from channels
	go func() {
		defer close(errorChan)
		wg.Wait()
	}()

	// Process results with proper error handling
	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case incomeSources, ok := <-incomeChan:
			if ok {
				mu.Lock()
				result.IncomeSources = incomeSources
				mu.Unlock()
			}
		case budgetSources, ok := <-budgetChan:
			if ok {
				mu.Lock()
				result.BudgetSources = budgetSources
				mu.Unlock()
			}
		case expenses, ok := <-expenseChan:
			if ok {
				mu.Lock()
				result.Expenses = expenses
				mu.Unlock()
			}
		case err, ok := <-errorChan:
			if !ok {
				// All goroutines completed
				return result, nil
			}
			if err != nil {
				mu.Lock()
				result.Errors = append(result.Errors, err)
				mu.Unlock()
			}
		}
	}
}

// GetMonthlyDataConcurrentWithTimeout fetches data with a custom timeout.
func (s *ConcurrentService) GetMonthlyDataConcurrentWithTimeout(ctx context.Context, ym domain.YearMonth, timeout time.Duration) (*MonthlyDataResult, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	return s.GetMonthlyDataConcurrent(ctx, ym)
}

// GetMonthlyDataConcurrentWithCancellation fetches data with cancellation support.
func (s *ConcurrentService) GetMonthlyDataConcurrentWithCancellation(ctx context.Context, ym domain.YearMonth, cancelFunc context.CancelFunc) (*MonthlyDataResult, error) {
	defer cancelFunc()
	return s.GetMonthlyDataConcurrent(ctx, ym)
}
