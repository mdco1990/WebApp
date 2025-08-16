// Package transformation implements functional data transformation patterns.
package transformation

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
)

// Transformer is a function type that transforms data and returns the result.
type Transformer func(interface{}) (interface{}, error)

// AsyncTransformer is a function type that transforms data asynchronously.
type AsyncTransformer func(context.Context, interface{}) (interface{}, error)

// Pipeline chains multiple transformers together.
func Pipeline(transformers ...Transformer) Transformer {
	return func(data interface{}) (interface{}, error) {
		result := data
		for _, transformer := range transformers {
			var err error
			result, err = transformer(result)
			if err != nil {
				return nil, err
			}
		}
		return result, nil
	}
}

// AsyncPipeline chains multiple async transformers together.
func AsyncPipeline(transformers ...AsyncTransformer) AsyncTransformer {
	return func(ctx context.Context, data interface{}) (interface{}, error) {
		result := data
		for _, transformer := range transformers {
			var err error
			result, err = transformer(ctx, result)
			if err != nil {
				return nil, err
			}
		}
		return result, nil
	}
}

// Compose combines multiple transformers with error handling.
func Compose(transformers ...Transformer) Transformer {
	return func(data interface{}) (interface{}, error) {
		result := data
		for _, transformer := range transformers {
			var err error
			result, err = transformer(result)
			if err != nil {
				// Return the last successful result and the error
				return result, err
			}
		}
		return result, nil
	}
}

// Specific transformers for domain data

// SortExpensesByAmount sorts expenses by amount in descending order.
func SortExpensesByAmount(data interface{}) (interface{}, error) {
	expenses, ok := data.([]domain.Expense)
	if !ok {
		return nil, fmt.Errorf("invalid type for expense sorting: expected []domain.Expense")
	}

	sorted := make([]domain.Expense, len(expenses))
	copy(sorted, expenses)

	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].AmountCents > sorted[j].AmountCents
	})

	return sorted, nil
}

// SortExpensesByDate sorts expenses by creation date in descending order.
func SortExpensesByDate(data interface{}) (interface{}, error) {
	expenses, ok := data.([]domain.Expense)
	if !ok {
		return nil, fmt.Errorf("invalid type for expense sorting: expected []domain.Expense")
	}

	sorted := make([]domain.Expense, len(expenses))
	copy(sorted, expenses)

	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].CreatedAt.After(sorted[j].CreatedAt)
	})

	return sorted, nil
}

// FilterExpensesByCategory filters expenses by category.
func FilterExpensesByCategory(category string) Transformer {
	return func(data interface{}) (interface{}, error) {
		expenses, ok := data.([]domain.Expense)
		if !ok {
			return nil, fmt.Errorf("invalid type for expense filtering: expected []domain.Expense")
		}

		var filtered []domain.Expense
		for _, expense := range expenses {
			if strings.EqualFold(expense.Category, category) {
				filtered = append(filtered, expense)
			}
		}

		return filtered, nil
	}
}

// FilterExpensesByAmountRange filters expenses by amount range.
func FilterExpensesByAmountRange(minAmount, maxAmount domain.Money) Transformer {
	return func(data interface{}) (interface{}, error) {
		expenses, ok := data.([]domain.Expense)
		if !ok {
			return nil, fmt.Errorf("invalid type for expense filtering: expected []domain.Expense")
		}

		var filtered []domain.Expense
		for _, expense := range expenses {
			if expense.AmountCents >= minAmount && expense.AmountCents <= maxAmount {
				filtered = append(filtered, expense)
			}
		}

		return filtered, nil
	}
}

// FilterExpensesByDateRange filters expenses by date range.
func FilterExpensesByDateRange(startDate, endDate time.Time) Transformer {
	return func(data interface{}) (interface{}, error) {
		expenses, ok := data.([]domain.Expense)
		if !ok {
			return nil, fmt.Errorf("invalid type for expense filtering: expected []domain.Expense")
		}

		var filtered []domain.Expense
		for _, expense := range expenses {
			if expense.CreatedAt.After(startDate) && expense.CreatedAt.Before(endDate) {
				filtered = append(filtered, expense)
			}
		}

		return filtered, nil
	}
}

// GroupExpensesByCategory groups expenses by category.
func GroupExpensesByCategory(data interface{}) (interface{}, error) {
	expenses, ok := data.([]domain.Expense)
	if !ok {
		return nil, fmt.Errorf("invalid type for expense grouping: expected []domain.Expense")
	}

	groups := make(map[string][]domain.Expense)
	for _, expense := range expenses {
		category := expense.Category
		if category == "" {
			category = "uncategorized"
		}
		groups[category] = append(groups[category], expense)
	}

	return groups, nil
}

// CalculateExpenseTotals calculates totals for expenses.
func CalculateExpenseTotals(data interface{}) (interface{}, error) {
	expenses, ok := data.([]domain.Expense)
	if !ok {
		return nil, fmt.Errorf("invalid type for expense totals: expected []domain.Expense")
	}

	var total domain.Money
	for _, expense := range expenses {
		total += expense.AmountCents
	}

	return total, nil
}

// TransformExpenseDescriptions transforms expense descriptions.
func TransformExpenseDescriptions(transformer func(string) string) Transformer {
	return func(data interface{}) (interface{}, error) {
		expenses, ok := data.([]domain.Expense)
		if !ok {
			return nil, fmt.Errorf("invalid type for expense transformation: expected []domain.Expense")
		}

		transformed := make([]domain.Expense, len(expenses))
		for i, expense := range expenses {
			transformed[i] = expense
			transformed[i].Description = transformer(expense.Description)
		}

		return transformed, nil
	}
}

// NormalizeExpenseDescriptions normalizes expense descriptions.
func NormalizeExpenseDescriptions(data interface{}) (interface{}, error) {
	return TransformExpenseDescriptions(func(desc string) string {
		return strings.TrimSpace(strings.ToLower(desc))
	})(data)
}

// CapitalizeExpenseDescriptions capitalizes expense descriptions.
func CapitalizeExpenseDescriptions(data interface{}) (interface{}, error) {
	return TransformExpenseDescriptions(func(desc string) string {
		return strings.Title(strings.ToLower(desc))
	})(data)
}

// TransformIncomeSources sorts income sources by amount.
func SortIncomeSourcesByAmount(data interface{}) (interface{}, error) {
	sources, ok := data.([]domain.IncomeSource)
	if !ok {
		return nil, fmt.Errorf("invalid type for income source sorting: expected []domain.IncomeSource")
	}

	sorted := make([]domain.IncomeSource, len(sources))
	copy(sorted, sources)

	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].AmountCents > sorted[j].AmountCents
	})

	return sorted, nil
}

// TransformBudgetSources sorts budget sources by amount.
func SortBudgetSourcesByAmount(data interface{}) (interface{}, error) {
	sources, ok := data.([]domain.BudgetSource)
	if !ok {
		return nil, fmt.Errorf("invalid type for budget source sorting: expected []domain.BudgetSource")
	}

	sorted := make([]domain.BudgetSource, len(sources))
	copy(sorted, sources)

	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].AmountCents > sorted[j].AmountCents
	})

	return sorted, nil
}

// TransformMonthlyData calculates additional fields for monthly data.
func TransformMonthlyData(data interface{}) (interface{}, error) {
	monthlyData, ok := data.(*domain.MonthlyData)
	if !ok {
		return nil, fmt.Errorf("invalid type for monthly data transformation: expected *domain.MonthlyData")
	}

	// Calculate totals if not already calculated
	if monthlyData.TotalIncome == 0 {
		for _, source := range monthlyData.IncomeSources {
			monthlyData.TotalIncome += source.AmountCents
		}
	}

	if monthlyData.TotalBudget == 0 {
		for _, source := range monthlyData.BudgetSources {
			monthlyData.TotalBudget += source.AmountCents
		}
	}

	if monthlyData.TotalExpenses == 0 {
		for _, expense := range monthlyData.Expenses {
			monthlyData.TotalExpenses += expense.AmountCents
		}
	}

	// Recalculate remaining
	monthlyData.Remaining = monthlyData.TotalIncome + monthlyData.TotalBudget - monthlyData.TotalExpenses

	return monthlyData, nil
}

// Utility transformers

// Map transforms each element in a slice using a mapping function.
func Map[T any, R any](mapper func(T) R) Transformer {
	return func(data interface{}) (interface{}, error) {
		slice, ok := data.([]T)
		if !ok {
			return nil, fmt.Errorf("invalid type for mapping: expected []%T", *new(T))
		}

		result := make([]R, len(slice))
		for i, item := range slice {
			result[i] = mapper(item)
		}

		return result, nil
	}
}

// Filter filters elements in a slice using a predicate function.
func Filter[T any](predicate func(T) bool) Transformer {
	return func(data interface{}) (interface{}, error) {
		slice, ok := data.([]T)
		if !ok {
			return nil, fmt.Errorf("invalid type for filtering: expected []%T", *new(T))
		}

		var result []T
		for _, item := range slice {
			if predicate(item) {
				result = append(result, item)
			}
		}

		return result, nil
	}
}

// Reduce reduces a slice to a single value using a reducer function.
func Reduce[T any, R any](reducer func(R, T) R, initial R) Transformer {
	return func(data interface{}) (interface{}, error) {
		slice, ok := data.([]T)
		if !ok {
			return nil, fmt.Errorf("invalid type for reducing: expected []%T", *new(T))
		}

		result := initial
		for _, item := range slice {
			result = reducer(result, item)
		}

		return result, nil
	}
}

// Take takes the first n elements from a slice.
func Take[T any](n int) Transformer {
	return func(data interface{}) (interface{}, error) {
		slice, ok := data.([]T)
		if !ok {
			return nil, fmt.Errorf("invalid type for taking: expected []%T", *new(T))
		}

		if n >= len(slice) {
			return slice, nil
		}

		return slice[:n], nil
	}
}

// Skip skips the first n elements from a slice.
func Skip[T any](n int) Transformer {
	return func(data interface{}) (interface{}, error) {
		slice, ok := data.([]T)
		if !ok {
			return nil, fmt.Errorf("invalid type for skipping: expected []%T", *new(T))
		}

		if n >= len(slice) {
			return []T{}, nil
		}

		return slice[n:], nil
	}
}

// Distinct removes duplicate elements from a slice.
func Distinct[T comparable](data interface{}) (interface{}, error) {
	slice, ok := data.([]T)
	if !ok {
		return nil, fmt.Errorf("invalid type for distinct: expected []%T", *new(T))
	}

	seen := make(map[T]bool)
	var result []T

	for _, item := range slice {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}

	return result, nil
}

// Predefined transformation pipelines

// CreateExpenseAnalysisPipeline creates a pipeline for expense analysis.
func CreateExpenseAnalysisPipeline() Transformer {
	return Pipeline(
		SortExpensesByAmount,
		Take[domain.Expense](10), // Top 10 expenses
		GroupExpensesByCategory,
	)
}

// CreateExpenseSummaryPipeline creates a pipeline for expense summary.
func CreateExpenseSummaryPipeline() Transformer {
	return Pipeline(
		CalculateExpenseTotals,
	)
}

// CreateIncomeAnalysisPipeline creates a pipeline for income analysis.
func CreateIncomeAnalysisPipeline() Transformer {
	return Pipeline(
		SortIncomeSourcesByAmount,
		Take[domain.IncomeSource](5), // Top 5 income sources
	)
}

// CreateBudgetAnalysisPipeline creates a pipeline for budget analysis.
func CreateBudgetAnalysisPipeline() Transformer {
	return Pipeline(
		SortBudgetSourcesByAmount,
		Take[domain.BudgetSource](5), // Top 5 budget sources
	)
}

// Async transformers for performance

// AsyncSortExpensesByAmount sorts expenses asynchronously.
func AsyncSortExpensesByAmount(ctx context.Context, data interface{}) (interface{}, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
		return SortExpensesByAmount(data)
	}
}

// AsyncFilterExpensesByCategory filters expenses asynchronously.
func AsyncFilterExpensesByCategory(ctx context.Context, category string) AsyncTransformer {
	return func(ctx context.Context, data interface{}) (interface{}, error) {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
			return FilterExpensesByCategory(category)(data)
		}
	}
}

// AsyncCalculateExpenseTotals calculates expense totals asynchronously.
func AsyncCalculateExpenseTotals(ctx context.Context, data interface{}) (interface{}, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
		return CalculateExpenseTotals(data)
	}
}

// Error handling for transformers

// WithErrorHandling wraps a transformer with error handling.
func WithErrorHandling(transformer Transformer, errorHandler func(error) error) Transformer {
	return func(data interface{}) (interface{}, error) {
		result, err := transformer(data)
		if err != nil {
			return result, errorHandler(err)
		}
		return result, nil
	}
}

// WithDefaultValue wraps a transformer with a default value on error.
func WithDefaultValue[T any](transformer Transformer, defaultValue T) Transformer {
	return func(data interface{}) (interface{}, error) {
		result, err := transformer(data)
		if err != nil {
			return defaultValue, nil
		}
		return result, nil
	}
}

// WithRecovery wraps a transformer with panic recovery.
func WithRecovery(transformer Transformer) Transformer {
	return func(data interface{}) (interface{}, error) {
		defer func() {
			if r := recover(); r != nil {
				// Log the panic but don't re-panic
				// In a real implementation, you might want to log this
			}
		}()

		return transformer(data)
	}
}
