// Package service implements worker pool for controlled concurrency.
package service

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Job represents a work item to be processed by a worker.
type Job struct {
	ID       string      `json:"id"`
	Type     string      `json:"type"`
	Data     interface{} `json:"data"`
	Priority int         `json:"priority"` // Higher number = higher priority
	Created  time.Time   `json:"created"`
}

// Result represents the result of processing a job.
type Result struct {
	JobID     string        `json:"job_id"`
	Type      string        `json:"type"`
	Data      interface{}   `json:"data,omitempty"`
	Error     error         `json:"error,omitempty"`
	Duration  time.Duration `json:"duration"`
	Completed time.Time     `json:"completed"`
}

// JobProcessor defines the interface for processing jobs.
type JobProcessor interface {
	Process(ctx context.Context, job Job) (interface{}, error)
}

// WorkerPool manages a pool of workers for processing jobs concurrently.
type WorkerPool struct {
	workers    int
	jobQueue   chan Job
	resultChan chan Result
	processor  JobProcessor
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
	mu         sync.RWMutex
	isRunning  bool
	stats      *PoolStats
}

// PoolStats tracks worker pool statistics.
type PoolStats struct {
	JobsProcessed   int64         `json:"jobs_processed"`
	JobsFailed      int64         `json:"jobs_failed"`
	TotalDuration   time.Duration `json:"total_duration"`
	AverageDuration time.Duration `json:"average_duration"`
	ActiveWorkers   int           `json:"active_workers"`
	QueuedJobs      int           `json:"queued_jobs"`
	mu              sync.RWMutex
}

// NewWorkerPool creates a new worker pool with the specified number of workers.
func NewWorkerPool(workers int, processor JobProcessor) *WorkerPool {
	if workers <= 0 {
		workers = 1
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &WorkerPool{
		workers:    workers,
		jobQueue:   make(chan Job, workers*10), // Buffer size = workers * 10
		resultChan: make(chan Result, workers*10),
		processor:  processor,
		ctx:        ctx,
		cancel:     cancel,
		stats:      &PoolStats{},
	}
}

// Start begins the worker pool operation.
func (wp *WorkerPool) Start() error {
	wp.mu.Lock()
	defer wp.mu.Unlock()

	if wp.isRunning {
		return fmt.Errorf("worker pool is already running")
	}

	wp.isRunning = true

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

	if !wp.isRunning {
		return fmt.Errorf("worker pool is not running")
	}

	// Signal shutdown
	wp.cancel()

	// Wait for all workers to complete
	wp.wg.Wait()

	// Close channels
	close(wp.jobQueue)
	close(wp.resultChan)

	wp.isRunning = false
	return nil
}

// SubmitJob adds a job to the worker pool queue.
func (wp *WorkerPool) SubmitJob(job Job) error {
	wp.mu.RLock()
	defer wp.mu.RUnlock()

	if !wp.isRunning {
		return fmt.Errorf("worker pool is not running")
	}

	// Set job creation time if not set
	if job.Created.IsZero() {
		job.Created = time.Now()
	}

	// Generate job ID if not provided
	if job.ID == "" {
		job.ID = generateJobID()
	}

	select {
	case wp.jobQueue <- job:
		wp.stats.mu.Lock()
		wp.stats.QueuedJobs++
		wp.stats.mu.Unlock()
		return nil
	case <-wp.ctx.Done():
		return fmt.Errorf("worker pool is shutting down")
	default:
		return fmt.Errorf("job queue is full")
	}
}

// GetResults returns a channel for receiving job results.
func (wp *WorkerPool) GetResults() <-chan Result {
	return wp.resultChan
}

// GetStats returns current worker pool statistics.
func (wp *WorkerPool) GetStats() *PoolStats {
	wp.stats.mu.RLock()
	defer wp.stats.mu.RUnlock()

	stats := &PoolStats{
		JobsProcessed:   wp.stats.JobsProcessed,
		JobsFailed:      wp.stats.JobsFailed,
		TotalDuration:   wp.stats.TotalDuration,
		AverageDuration: wp.stats.AverageDuration,
		ActiveWorkers:   wp.workers,
		QueuedJobs:      len(wp.jobQueue),
	}

	return stats
}

// IsRunning returns whether the worker pool is currently running.
func (wp *WorkerPool) IsRunning() bool {
	wp.mu.RLock()
	defer wp.mu.RUnlock()
	return wp.isRunning
}

// worker is the main worker goroutine that processes jobs.
func (wp *WorkerPool) worker(id int) {
	defer wp.wg.Done()

	for {
		select {
		case job := <-wp.jobQueue:
			wp.processJob(job)
		case <-wp.ctx.Done():
			return
		}
	}
}

// processJob processes a single job and sends the result.
func (wp *WorkerPool) processJob(job Job) {
	start := time.Now()
	var result Result

	// Process the job
	data, err := wp.processor.Process(wp.ctx, job)

	// Create result
	result = Result{
		JobID:     job.ID,
		Type:      job.Type,
		Data:      data,
		Error:     err,
		Duration:  time.Since(start),
		Completed: time.Now(),
	}

	// Update statistics
	wp.stats.mu.Lock()
	wp.stats.JobsProcessed++
	if err != nil {
		wp.stats.JobsFailed++
	}
	wp.stats.TotalDuration += result.Duration
	wp.stats.AverageDuration = wp.stats.TotalDuration / time.Duration(wp.stats.JobsProcessed)
	wp.stats.QueuedJobs--
	wp.stats.mu.Unlock()

	// Send result
	select {
	case wp.resultChan <- result:
	case <-wp.ctx.Done():
		// Worker pool is shutting down, drop the result
	}
}

// resultCollector handles result processing (placeholder for future enhancements).
func (wp *WorkerPool) resultCollector() {
	for result := range wp.resultChan {
		// Process results (e.g., logging, metrics, etc.)
		if result.Error != nil {
			// Log error results
			_ = result.Error
		}
	}
}

// generateJobID creates a unique job identifier.
func generateJobID() string {
	return fmt.Sprintf("job_%d", time.Now().UnixNano())
}

// DefaultJobProcessor provides a basic implementation of JobProcessor.
type DefaultJobProcessor struct {
	handlers map[string]func(context.Context, Job) (interface{}, error)
}

// NewDefaultJobProcessor creates a new default job processor.
func NewDefaultJobProcessor() *DefaultJobProcessor {
	return &DefaultJobProcessor{
		handlers: make(map[string]func(context.Context, Job) (interface{}, error)),
	}
}

// RegisterHandler registers a handler for a specific job type.
func (p *DefaultJobProcessor) RegisterHandler(jobType string, handler func(context.Context, Job) (interface{}, error)) {
	p.handlers[jobType] = handler
}

// Process processes a job using the registered handler.
func (p *DefaultJobProcessor) Process(ctx context.Context, job Job) (interface{}, error) {
	handler, exists := p.handlers[job.Type]
	if !exists {
		return nil, fmt.Errorf("no handler registered for job type: %s", job.Type)
	}

	return handler(ctx, job)
}
