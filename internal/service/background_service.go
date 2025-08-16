// Package service implements background task processing.
package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
)

// BackgroundTask represents a background task with status tracking.
type BackgroundTask struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Data      interface{}            `json:"data,omitempty"`
	Status    string                 `json:"status"` // processing, completed, failed
	Result    interface{}            `json:"result,omitempty"`
	Error     string                 `json:"error,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// BackgroundService manages background task processing.
type BackgroundService struct {
	tasks map[string]*BackgroundTask
	mu    sync.RWMutex
}

// NewBackgroundService creates a new BackgroundService.
func NewBackgroundService() *BackgroundService {
	return &BackgroundService{
		tasks: make(map[string]*BackgroundTask),
	}
}

// ProcessExpenseReportAsync starts a background task to generate an expense report.
// Returns task ID immediately for non-blocking operation.
func (s *BackgroundService) ProcessExpenseReportAsync(ctx context.Context, ym domain.YearMonth) string {
	taskID := generateTaskID()

	task := &BackgroundTask{
		ID:        taskID,
		Type:      "expense_report",
		Data:      ym,
		Status:    "processing",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Metadata: map[string]interface{}{
			"year":  ym.Year,
			"month": ym.Month,
		},
	}

	// Store task
	s.mu.Lock()
	s.tasks[taskID] = task
	s.mu.Unlock()

	// Start background processing
	go func() {
		defer func() {
			if r := recover(); r != nil {
				s.updateTaskStatus(taskID, "failed", fmt.Sprintf("panic: %v", r))
			}
		}()

		// Create context with timeout for the background task
		taskCtx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		// Simulate heavy computation
		time.Sleep(2 * time.Second)

		// Generate report (this would call the actual service)
		report, err := s.generateExpenseReport(taskCtx, ym)
		if err != nil {
			s.updateTaskStatus(taskID, "failed", err.Error())
			return
		}

		// Store result and mark as completed
		s.updateTaskStatus(taskID, "completed", "", report)
	}()

	return taskID
}

// GetTaskStatus returns the current status of a background task.
func (s *BackgroundService) GetTaskStatus(taskID string) (*BackgroundTask, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return nil, fmt.Errorf("task not found: %s", taskID)
	}

	return task, nil
}

// ListTasks returns all background tasks with optional filtering.
func (s *BackgroundService) ListTasks(status string) []*BackgroundTask {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var tasks []*BackgroundTask
	for _, task := range s.tasks {
		if status == "" || task.Status == status {
			tasks = append(tasks, task)
		}
	}

	return tasks
}

// CancelTask attempts to cancel a running task.
func (s *BackgroundService) CancelTask(taskID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return fmt.Errorf("task not found: %s", taskID)
	}

	if task.Status != "processing" {
		return fmt.Errorf("cannot cancel task in status: %s", task.Status)
	}

	task.Status = "cancelled"
	task.UpdatedAt = time.Now()
	task.Error = "task cancelled by user"

	return nil
}

// CleanupCompletedTasks removes completed and failed tasks older than the specified duration.
func (s *BackgroundService) CleanupCompletedTasks(olderThan time.Duration) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().Add(-olderThan)
	removed := 0

	for id, task := range s.tasks {
		if (task.Status == "completed" || task.Status == "failed" || task.Status == "cancelled") &&
			task.UpdatedAt.Before(cutoff) {
			delete(s.tasks, id)
			removed++
		}
	}

	return removed
}

// updateTaskStatus updates the status of a background task.
func (s *BackgroundService) updateTaskStatus(taskID, status, errorMsg string, result ...interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return
	}

	task.Status = status
	task.UpdatedAt = time.Now()

	if errorMsg != "" {
		task.Error = errorMsg
	}

	if len(result) > 0 {
		task.Result = result[0]
	}
}

// generateExpenseReport creates an expense report for the given year/month.
// This is a placeholder implementation that would integrate with the actual service.
func (s *BackgroundService) generateExpenseReport(ctx context.Context, ym domain.YearMonth) (interface{}, error) {
	// Simulate report generation
	report := map[string]interface{}{
		"year_month":   ym,
		"generated_at": time.Now(),
		"summary": map[string]interface{}{
			"total_expenses": 0,
			"total_income":   0,
			"total_budget":   0,
			"remaining":      0,
		},
		"expenses_by_category": map[string]interface{}{},
		"monthly_trends":       []interface{}{},
	}

	return report, nil
}

// generateTaskID creates a unique task identifier.
func generateTaskID() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
