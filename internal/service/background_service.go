// Package service implements background task processing.
package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/mdco1990/webapp/internal/domain"
	"github.com/mdco1990/webapp/internal/repository"
)

// TaskStatus represents the current status of a background task.
type TaskStatus string

// Task status constants
const (
	TaskStatusPending    TaskStatus = "pending"
	TaskStatusProcessing TaskStatus = "processing"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusFailed     TaskStatus = "failed"
	TaskStatusCancelled  TaskStatus = "cancelled"
)

// TaskType represents the type of background task.
type TaskType string

// Task type constants
const (
	TaskTypeExpenseReport TaskType = "expense_report"
	TaskTypeDataExport    TaskType = "data_export"
	TaskTypeDataImport    TaskType = "data_import"
	TaskTypeBackup        TaskType = "backup"
)

// BackgroundTask represents a background task with its metadata and results.
type BackgroundTask struct {
	ID          string                 `json:"id"`
	Type        TaskType               `json:"type"`
	Data        map[string]interface{} `json:"data"`
	Status      TaskStatus             `json:"status"`
	Result      interface{}            `json:"result,omitempty"`
	Error       string                 `json:"error,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	StartedAt   *time.Time             `json:"started_at,omitempty"`
	CompletedAt *time.Time             `json:"completed_at,omitempty"`
	Progress    int                    `json:"progress"` // 0-100
}

// BackgroundService handles background task processing.
type BackgroundService struct {
	repo        *repository.Repository
	tasks       map[string]*BackgroundTask
	taskResults map[string]interface{}
	mu          sync.RWMutex
}

// NewBackgroundService creates a new BackgroundService instance.
func NewBackgroundService(repo *repository.Repository) *BackgroundService {
	return &BackgroundService{
		repo:        repo,
		tasks:       make(map[string]*BackgroundTask),
		taskResults: make(map[string]interface{}),
	}
}

// ProcessExpenseReportAsync processes an expense report in the background and returns task ID immediately.
func (s *BackgroundService) ProcessExpenseReportAsync(ctx context.Context, ym domain.YearMonth, filters map[string]interface{}) (string, error) {
	if err := validateYM(ym); err != nil {
		return "", err
	}

	taskID := generateTaskID()
	task := &BackgroundTask{
		ID:        taskID,
		Type:      TaskTypeExpenseReport,
		Data:      map[string]interface{}{"year_month": ym, "filters": filters},
		Status:    TaskStatusPending,
		CreatedAt: time.Now(),
		Progress:  0,
	}

	s.mu.Lock()
	s.tasks[taskID] = task
	s.mu.Unlock()

	// Start background processing
	go s.processExpenseReportTask(ctx, task)

	return taskID, nil
}

// processExpenseReportTask processes the expense report task in the background.
func (s *BackgroundService) processExpenseReportTask(ctx context.Context, task *BackgroundTask) {
	// Update status to processing
	s.mu.Lock()
	task.Status = TaskStatusProcessing
	now := time.Now()
	task.StartedAt = &now
	s.mu.Unlock()

	// Simulate processing with progress updates
	for progress := 10; progress <= 100; progress += 10 {
		select {
		case <-ctx.Done():
			s.updateTaskStatus(task.ID, TaskStatusCancelled, nil, ctx.Err().Error())
			return
		case <-time.After(100 * time.Millisecond):
			s.updateTaskProgress(task.ID, progress)
		}
	}

	// Perform actual expense report processing
	yearMonthData, ok := task.Data["year_month"].(domain.YearMonth)
	if !ok {
		s.updateTaskStatus(task.ID, TaskStatusFailed, nil, "invalid year_month data type")
		return
	}
	expenses, err := s.repo.ListExpenses(ctx, yearMonthData)
	if err != nil {
		s.updateTaskStatus(task.ID, TaskStatusFailed, nil, err.Error())
		return
	}

	// Generate report data
	reportData := map[string]interface{}{
		"year_month":    task.Data["year_month"],
		"expense_count": len(expenses),
		"total_amount":  calculateTotalExpenses(expenses),
		"expenses":      expenses,
		"generated_at":  time.Now(),
	}

	// Store result and mark as completed
	s.updateTaskStatus(task.ID, TaskStatusCompleted, reportData, "")
}

// GetTaskStatus returns the current status of a task.
func (s *BackgroundService) GetTaskStatus(taskID string) (*BackgroundTask, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return nil, fmt.Errorf("task not found: %s", taskID)
	}

	return task, nil
}

// GetTaskResult returns the result of a completed task.
func (s *BackgroundService) GetTaskResult(taskID string) (interface{}, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return nil, fmt.Errorf("task not found: %s", taskID)
	}

	if task.Status != TaskStatusCompleted {
		return nil, fmt.Errorf("task not completed: %s", task.Status)
	}

	return task.Result, nil
}

// CancelTask cancels a running task.
func (s *BackgroundService) CancelTask(taskID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return fmt.Errorf("task not found: %s", taskID)
	}

	if task.Status != TaskStatusPending && task.Status != TaskStatusProcessing {
		return fmt.Errorf("cannot cancel task in status: %s", task.Status)
	}

	task.Status = TaskStatusCancelled
	now := time.Now()
	task.CompletedAt = &now

	return nil
}

// ListTasks returns all tasks with optional filtering.
func (s *BackgroundService) ListTasks(taskType *TaskType, status *TaskStatus) []*BackgroundTask {
	s.mu.RLock()
	defer s.mu.RUnlock()

	filteredTasks := make([]*BackgroundTask, 0, len(s.tasks))
	for _, task := range s.tasks {
		if taskType != nil && task.Type != *taskType {
			continue
		}
		if status != nil && task.Status != *status {
			continue
		}
		filteredTasks = append(filteredTasks, task)
	}

	return filteredTasks
}

// CleanupCompletedTasks removes completed tasks older than the specified duration.
func (s *BackgroundService) CleanupCompletedTasks(olderThan time.Duration) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().Add(-olderThan)
	removed := 0

	for taskID, task := range s.tasks {
		if (task.Status == TaskStatusCompleted || task.Status == TaskStatusFailed ||
			task.Status == TaskStatusCancelled) && task.CreatedAt.Before(cutoff) {
			delete(s.tasks, taskID)
			delete(s.taskResults, taskID)
			removed++
		}
	}

	return removed
}

// updateTaskStatus updates the status of a task.
func (s *BackgroundService) updateTaskStatus(taskID string, status TaskStatus, result interface{}, errorMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return
	}

	task.Status = status
	task.Result = result
	task.Error = errorMsg
	task.Progress = 100

	if status == TaskStatusCompleted || status == TaskStatusFailed || status == TaskStatusCancelled {
		now := time.Now()
		task.CompletedAt = &now
	}
}

// updateTaskProgress updates the progress of a task.
func (s *BackgroundService) updateTaskProgress(taskID string, progress int) {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, exists := s.tasks[taskID]
	if !exists {
		return
	}

	task.Progress = progress
}

// generateTaskID generates a unique task ID.
func generateTaskID() string {
	return fmt.Sprintf("task_%d", time.Now().UnixNano())
}

// calculateTotalExpenses calculates the total amount from expenses.
func calculateTotalExpenses(expenses []domain.Expense) int64 {
	var total int64
	for _, expense := range expenses {
		total += int64(expense.AmountCents)
	}
	return total
}
