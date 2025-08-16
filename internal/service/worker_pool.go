// Package service implements worker pool patterns for controlled concurrency.
package service

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

// Job represents a unit of work to be processed by the worker pool.
type Job struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Data     map[string]interface{} `json:"data"`
	Priority int                    `json:"priority"` // Higher number = higher priority
	Created  time.Time              `json:"created"`
}

// JobResult represents the result of processing a job.
type JobResult struct {
	JobID     string                 `json:"job_id"`
	Type      string                 `json:"type"`
	Data      map[string]interface{} `json:"data"`
	Result    interface{}            `json:"result,omitempty"`
	Error     error                  `json:"error,omitempty"`
	Processed time.Time              `json:"processed"`
	Duration  time.Duration          `json:"duration"`
	WorkerID  int                    `json:"worker_id"`
}

// JobProcessor defines the interface for processing jobs.
type JobProcessor interface {
	Process(ctx context.Context, job *Job) (interface{}, error)
}

// WorkerPool manages a pool of workers for processing jobs.
type WorkerPool struct {
	workers       int
	jobQueue      chan *Job
	resultChannel chan *JobResult
	processor     JobProcessor
	ctx           context.Context //nolint:containedctx
	cancel        context.CancelFunc
	wg            sync.WaitGroup
	mu            sync.RWMutex
	active        bool
	stats         *PoolStats
}

// PoolStats tracks worker pool statistics.
type PoolStats struct {
	JobsProcessed   int64         `json:"jobs_processed"`
	JobsFailed      int64         `json:"jobs_failed"`
	JobsQueued      int64         `json:"jobs_queued"`
	WorkersActive   int           `json:"workers_active"`
	AverageJobTime  time.Duration `json:"average_job_time"`
	TotalProcessing time.Duration `json:"total_processing"`
	mu              sync.RWMutex
}

// NewWorkerPool creates a new worker pool with the specified number of workers.
func NewWorkerPool(workers int, processor JobProcessor) *WorkerPool {
	if workers <= 0 {
		workers = 1
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &WorkerPool{
		workers:       workers,
		jobQueue:      make(chan *Job, workers*2), // Buffer size = workers * 2
		resultChannel: make(chan *JobResult, workers*2),
		processor:     processor,
		ctx:           ctx,
		cancel:        cancel,
		stats:         &PoolStats{},
	}
}

// Start starts the worker pool and begins processing jobs.
func (wp *WorkerPool) Start() error {
	wp.mu.Lock()
	defer wp.mu.Unlock()

	if wp.active {
		return errors.New("worker pool is already active")
	}

	wp.active = true

	// Start workers
	for i := 0; i < wp.workers; i++ {
		wp.wg.Add(1)
		go wp.worker(i)
	}

	// Start result collector
	go wp.resultCollector()

	return nil
}

// Stop gracefully shuts down the worker pool.
func (wp *WorkerPool) Stop() error {
	wp.mu.Lock()
	defer wp.mu.Unlock()

	if !wp.active {
		return errors.New("worker pool is not active")
	}

	// Signal shutdown
	wp.cancel()

	// Close job queue
	close(wp.jobQueue)

	// Wait for workers to finish
	wp.wg.Wait()

	// Close result channel
	close(wp.resultChannel)

	wp.active = false
	return nil
}

// SubmitJob submits a job to the worker pool.
func (wp *WorkerPool) SubmitJob(ctx context.Context, jobType string, data map[string]interface{}, priority int) (string, error) {
	wp.mu.RLock()
	defer wp.mu.RUnlock()

	if !wp.active {
		return "", errors.New("worker pool is not active")
	}

	job := &Job{
		ID:       generateJobID(),
		Type:     jobType,
		Data:     data,
		Priority: priority,
		Created:  time.Now(),
	}

	select {
	case wp.jobQueue <- job:
		wp.stats.mu.Lock()
		wp.stats.JobsQueued++
		wp.stats.mu.Unlock()
		return job.ID, nil
	case <-ctx.Done():
		return "", ctx.Err()
	case <-wp.ctx.Done():
		return "", errors.New("worker pool is shutting down")
	}
}

// SubmitJobWithTimeout submits a job with a timeout.
func (wp *WorkerPool) SubmitJobWithTimeout(jobType string, data map[string]interface{}, priority int, timeout time.Duration) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return wp.SubmitJob(ctx, jobType, data, priority)
}

// GetResult retrieves a result from the result channel.
func (wp *WorkerPool) GetResult(ctx context.Context) (*JobResult, error) {
	select {
	case result, ok := <-wp.resultChannel:
		if !ok {
			return nil, errors.New("result channel is closed")
		}
		return result, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-wp.ctx.Done():
		return nil, errors.New("worker pool is shutting down")
	}
}

// GetResultWithTimeout retrieves a result with a timeout.
func (wp *WorkerPool) GetResultWithTimeout(timeout time.Duration) (*JobResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return wp.GetResult(ctx)
}

// GetStats returns the current pool statistics.
func (wp *WorkerPool) GetStats() PoolStats {
	wp.stats.mu.RLock()
	defer wp.stats.mu.RUnlock()

	// Create a copy to avoid race conditions
	return PoolStats{
		JobsProcessed:   wp.stats.JobsProcessed,
		JobsFailed:      wp.stats.JobsFailed,
		JobsQueued:      wp.stats.JobsQueued,
		WorkersActive:   wp.stats.WorkersActive,
		AverageJobTime:  wp.stats.AverageJobTime,
		TotalProcessing: wp.stats.TotalProcessing,
	}
}

// IsActive returns whether the worker pool is currently active.
func (wp *WorkerPool) IsActive() bool {
	wp.mu.RLock()
	defer wp.mu.RUnlock()
	return wp.active
}

// worker is the main worker function that processes jobs.
func (wp *WorkerPool) worker(workerID int) {
	defer wp.wg.Done()

	wp.stats.mu.Lock()
	wp.stats.WorkersActive++
	wp.stats.mu.Unlock()

	defer func() {
		wp.stats.mu.Lock()
		wp.stats.WorkersActive--
		wp.stats.mu.Unlock()
	}()

	for {
		select {
		case job, ok := <-wp.jobQueue:
			if !ok {
				// Job queue is closed, worker should exit
				return
			}

			wp.processJob(workerID, job)

		case <-wp.ctx.Done():
			// Context is cancelled, worker should exit
			return
		}
	}
}

// processJob processes a single job and sends the result.
func (wp *WorkerPool) processJob(workerID int, job *Job) {
	startTime := time.Now()

	// Process the job
	result, err := wp.processor.Process(wp.ctx, job)

	duration := time.Since(startTime)

	// Create job result
	jobResult := &JobResult{
		JobID:     job.ID,
		Type:      job.Type,
		Data:      job.Data,
		Result:    result,
		Error:     err,
		Processed: time.Now(),
		Duration:  duration,
		WorkerID:  workerID,
	}

	// Update statistics
	wp.stats.mu.Lock()
	wp.stats.JobsProcessed++
	if err != nil {
		wp.stats.JobsFailed++
	}

	// Update average job time
	if wp.stats.JobsProcessed > 0 {
		totalTime := wp.stats.TotalProcessing + duration
		wp.stats.TotalProcessing = totalTime
		wp.stats.AverageJobTime = totalTime / time.Duration(wp.stats.JobsProcessed)
	}
	wp.stats.mu.Unlock()

	// Send result (non-blocking)
	select {
	case wp.resultChannel <- jobResult:
		// Result sent successfully
	default:
		// Result channel is full, log warning
		// In a production system, you might want to implement a fallback strategy
	}
}

// resultCollector collects results and updates statistics.
func (wp *WorkerPool) resultCollector() {
	for result := range wp.resultChannel {
		// Process result if needed
		// This could include logging, metrics collection, etc.
		_ = result
	}
}

// generateJobID generates a unique job ID.
func generateJobID() string {
	return fmt.Sprintf("job_%d", time.Now().UnixNano())
}

// SetWorkerCount dynamically changes the number of workers.
func (wp *WorkerPool) SetWorkerCount(count int) error {
	if count <= 0 {
		return errors.New("worker count must be positive")
	}

	wp.mu.Lock()
	defer wp.mu.Unlock()

	if wp.active {
		return errors.New("cannot change worker count while pool is active")
	}

	wp.workers = count
	return nil
}

// GetWorkerCount returns the current number of workers.
func (wp *WorkerPool) GetWorkerCount() int {
	wp.mu.RLock()
	defer wp.mu.RUnlock()
	return wp.workers
}
