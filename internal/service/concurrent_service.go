// Package service implements concurrent business logic operations.
package service

import (
	"context"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
)

// ConcurrentService extends the base Service with concurrent operations.
type ConcurrentService struct {
	repo RepositoryInterface
}

// NewConcurrentService creates a ConcurrentService backed by the provided repository.
func NewConcurrentService(repo RepositoryInterface) *ConcurrentService {
	return &ConcurrentService{
		repo: repo,
	}
}

// GetMonthlyDataConcurrent fetches monthly data using the existing repository method.
// This method provides a concurrent interface to the existing GetMonthlyData functionality.
func (s *ConcurrentService) GetMonthlyDataConcurrent(ctx context.Context, ym domain.YearMonth) (*domain.MonthlyData, error) {
	// Validate input
	if err := validateYM(ym); err != nil {
		return nil, err
	}

	// Create context with timeout for concurrent operations
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// For now, use the existing GetMonthlyData method
	// In a real implementation, you might want to make the individual calls concurrent
	// by implementing separate methods for each data type
	data, err := s.repo.GetMonthlyData(ctx, 1, ym) // Using userID 1 as default
	if err != nil {
		return nil, err
	}

	return data, nil
}

// getMonthName returns the name of the month for the given month number.
func getMonthName(month int) string {
	months := []string{
		"", "January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	}
	if month >= 1 && month <= 12 {
		return months[month]
	}
	return "Unknown"
}
