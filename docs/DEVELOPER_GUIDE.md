# 👨‍💻 Developer Guide

## Overview

This developer guide provides comprehensive information on how to use all implemented programming paradigms and design patterns in the web application. It includes best practices, code examples, and architectural guidance.

## 🏗️ **Architecture Overview**

### **Clean Architecture Implementation**
```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   HTTP API  │  │   Web UI    │  │   CLI       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Business Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Core Service │  │Event Service│  │Reactive Svc │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Concurrent   │  │Auth Service │  │Validation   │        │
│  │Service      │  └─────────────┘  │Service      │        │
│  └─────────────┘                   └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Repository  │  │ Event Bus   │  │   Cache     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Database  │  │   Logging   │  │ Monitoring  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 **Getting Started**

### **Prerequisites**
- Go 1.21+
- SQLite (for development)
- Node.js 18+ (for frontend)
- Git

### **Project Structure**
```
webapp/
├── cmd/                    # Application entry points
├── internal/              # Private application code
│   ├── auth/             # Authentication strategies
│   ├── domain/           # Business entities and models
│   ├── events/           # Event-driven architecture
│   ├── repository/       # Data access layer
│   ├── service/          # Business logic services
│   ├── validation/       # Validation strategies
│   └── transport/        # HTTP layer
├── web/                  # Frontend React application
├── docs/                 # Documentation
└── tests/                # Test files
```

### **Quick Start**
```bash
# Clone the repository
git clone <repository-url>
cd webapp

# Install dependencies
go mod download
cd web && npm install

# Run tests
go test ./...

# Start the application
go run cmd/webapp/main.go
```

## 🔧 **Core Patterns Implementation**

### **1. Concurrency (Phase 1)**

#### **Goroutines and Channels**
```go
// Example: Concurrent data processing
func (cs *ConcurrentService) GetMonthlyDataConcurrent(ctx context.Context, ym domain.YearMonth) (*domain.MonthlyData, error) {
    var wg sync.WaitGroup
    var expenses []domain.Expense
    var incomeSources []domain.IncomeSource
    var budgetSources []domain.BudgetSource
    
    // Concurrent expense retrieval
    wg.Add(1)
    go func() {
        defer wg.Done()
        expenses, _ = cs.repo.ListExpenses(ctx, ym)
    }()
    
    // Concurrent income source retrieval
    wg.Add(1)
    go func() {
        defer wg.Done()
        incomeSources, _ = cs.repo.GetIncomeSources(ctx, ym)
    }()
    
    // Wait for all goroutines to complete
    wg.Wait()
    
    return &domain.MonthlyData{
        YearMonth:     ym,
        Expenses:      expenses,
        IncomeSources: incomeSources,
        BudgetSources: budgetSources,
    }, nil
}
```

#### **Context Management**
```go
// Example: Context with timeout
func (s *Service) AddExpenseWithTimeout(ctx context.Context, expense *domain.Expense) (int64, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    return s.repo.AddExpense(ctx, expense)
}
```

#### **Worker Pool Pattern**
```go
// Example: Event processing worker pool
type EventWorkerPool struct {
    workers    int
    jobQueue   chan Event
    workerPool chan chan Event
    quit       chan bool
}

func (wp *EventWorkerPool) Start() {
    for i := 0; i < wp.workers; i++ {
        worker := NewEventWorker(wp.workerPool)
        worker.Start()
    }
    
    go wp.dispatch()
}
```

### **2. Functional Programming (Phase 2)**

#### **Pure Functions**
```go
// Example: Pure validation function
func ValidateExpense(expense *domain.Expense) error {
    if expense.Description == "" {
        return errors.New("description is required")
    }
    if expense.AmountCents <= 0 {
        return errors.New("amount must be positive")
    }
    return nil
}
```

#### **Function Composition**
```go
// Example: Validation chain composition
func ComposeValidators(validators ...func(*domain.Expense) error) func(*domain.Expense) error {
    return func(expense *domain.Expense) error {
        for _, validator := range validators {
            if err := validator(expense); err != nil {
                return err
            }
        }
        return nil
    }
}

// Usage
validateExpense := ComposeValidators(
    ValidateDescription,
    ValidateAmount,
    ValidateCategory,
)
```

#### **Immutable Data Structures**
```go
// Example: Immutable expense update
func (e *Expense) WithAmount(amount domain.Money) *Expense {
    return &Expense{
        ID:          e.ID,
        YearMonth:   e.YearMonth,
        Category:    e.Category,
        Description: e.Description,
        AmountCents: amount,
        CreatedAt:   e.CreatedAt,
    }
}
```

### **3. Reactive Programming (Phase 3)**

#### **Observables and Streams**
```go
// Example: Reactive expense stream
func (rs *ReactiveService) GetExpenseStream() *reactive.Observable {
    return rs.expenseStream.AsObservable()
}

// Example: Reactive data transformation
func (rs *ReactiveService) GetExpenseAnalyticsReactive() *reactive.Observable {
    return rs.expenseStream.AsObservable().
        Map(func(data interface{}) interface{} {
            expenses := data.([]domain.Expense)
            return calculateAnalytics(expenses)
        }).
        Filter(func(data interface{}) bool {
            return data != nil
        })
}
```

#### **Event Streams**
```go
// Example: Subscribing to expense events
func (rs *ReactiveService) SubscribeToExpenseEvents(id string, handler func(*reactive.Event) error) error {
    return rs.expenseEvents.AsObservable().Subscribe(func(event *reactive.Event) {
        if err := handler(event); err != nil {
            log.Printf("Error handling expense event: %v", err)
        }
    })
}
```

### **4. Strategy Pattern (Phase 4)**

#### **Authentication Strategies**
```go
// Example: Using authentication strategies
func SetupAuthentication() *auth.AuthService {
    authService := auth.NewAuthService()
    
    // Register strategies
    sessionAuth := auth.NewSessionAuth(repo)
    tokenAuth := auth.NewTokenAuth("secret-key", repo)
    oauthAuth := auth.NewOAuthAuth("google", repo)
    
    authService.RegisterStrategy("session", sessionAuth)
    authService.RegisterStrategy("token", tokenAuth)
    authService.RegisterStrategy("oauth", oauthAuth)
    
    // Set default strategy
    authService.SetDefaultStrategy("session")
    
    return authService
}

// Usage
user, err := authService.AuthenticateWithStrategy(ctx, credentials, "token")
```

#### **Validation Strategies**
```go
// Example: Using validation strategies
func SetupValidation() *validation.ValidationService {
    validationService := validation.NewValidationService()
    
    // Register strategies
    strictValidation := validation.NewStrictValidation("strict")
    relaxedValidation := validation.NewRelaxedValidation("relaxed")
    customValidation := validation.NewCustomValidation("custom")
    
    validationService.RegisterStrategy(strictValidation)
    validationService.RegisterStrategy(relaxedValidation)
    validationService.RegisterStrategy(customValidation)
    
    return validationService
}

// Usage
err := validationService.ValidateWithStrategy(ctx, data, "strict")
```

### **5. Event-Driven Architecture (Phase 5)**

#### **Event Bus Usage**
```go
// Example: Setting up event bus
func SetupEventBus() *events.EventBus {
    eventBus := events.NewEventBus()
    
    // Subscribe to events
    eventBus.Subscribe("expense.created", handleExpenseCreated)
    eventBus.Subscribe("budget.exceeded", handleBudgetExceeded)
    eventBus.Subscribe("system.health", handleSystemHealth)
    
    return eventBus
}

// Example: Event handlers
func handleExpenseCreated(ctx context.Context, event events.Event) error {
    expenseEvent := event.(*events.ExpenseCreatedEvent)
    
    // Send notification
    notificationService.SendExpenseNotification(ctx, expenseEvent.UserID, expenseEvent.Expense)
    
    // Update analytics
    analyticsService.UpdateExpenseAnalytics(ctx, expenseEvent.Expense)
    
    return nil
}
```

#### **Domain Events**
```go
// Example: Publishing domain events
func (es *EventService) AddExpense(ctx context.Context, expense *domain.Expense, userID int64) (int64, error) {
    // Add expense to database
    expenseID, err := es.coreService.AddExpense(ctx, expense)
    if err != nil {
        return 0, err
    }
    
    // Publish expense created event
    expenseEvent := events.NewExpenseCreatedEvent(expenseID, userID, expense)
    es.eventBus.PublishAsync(ctx, expenseEvent)
    
    // Check budget and publish if exceeded
    if budgetExceeded {
        budgetEvent := events.NewBudgetExceededEvent(userID, category, budget, spent)
        es.eventBus.PublishAsync(ctx, budgetEvent)
    }
    
    return expenseID, nil
}
```

## 🎯 **Best Practices**

### **1. Error Handling**
```go
// Example: Comprehensive error handling
func (s *Service) AddExpense(ctx context.Context, expense *domain.Expense) (int64, error) {
    // Validate input
    if err := ValidateExpense(expense); err != nil {
        return 0, fmt.Errorf("validation failed: %w", err)
    }
    
    // Add to database
    expenseID, err := s.repo.AddExpense(ctx, expense)
    if err != nil {
        return 0, fmt.Errorf("failed to add expense: %w", err)
    }
    
    return expenseID, nil
}
```

### **2. Context Usage**
```go
// Example: Proper context usage
func (s *Service) GetMonthlyData(ctx context.Context, ym domain.YearMonth) (*domain.MonthlyData, error) {
    // Check for cancellation
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }
    
    // Add timeout for database operations
    dbCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()
    
    return s.repo.GetMonthlyData(dbCtx, ym)
}
```

### **3. Logging**
```go
// Example: Structured logging
func (es *EventService) AddExpense(ctx context.Context, expense *domain.Expense, userID int64) (int64, error) {
    logger := slog.With(
        "user_id", userID,
        "expense_description", expense.Description,
        "expense_amount", expense.AmountCents,
    )
    
    logger.Info("adding expense")
    
    expenseID, err := es.coreService.AddExpense(ctx, expense)
    if err != nil {
        logger.Error("failed to add expense", "error", err)
        return 0, err
    }
    
    logger.Info("expense added successfully", "expense_id", expenseID)
    return expenseID, nil
}
```

### **4. Testing**
```go
// Example: Comprehensive testing
func TestEventService_AddExpense(t *testing.T) {
    // Setup
    mockRepo := &MockRepository{}
    eventBus := events.NewEventBus()
    coreService := service.New(mockRepo)
    eventService := service.NewEventService(coreService, eventBus)
    
    // Test data
    expense := &domain.Expense{
        YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
        Description: "Test Expense",
        AmountCents: 1000,
        Category:    "Test",
    }
    
    // Expectations
    mockRepo.On("AddExpense", mock.Anything, expense).Return(int64(1), nil)
    
    // Execute
    expenseID, err := eventService.AddExpense(context.Background(), expense, 1)
    
    // Assertions
    assert.NoError(t, err)
    assert.Equal(t, int64(1), expenseID)
    mockRepo.AssertExpectations(t)
}
```

## 🔧 **Configuration Management**

### **Environment Variables**
```go
// Example: Configuration structure
type Config struct {
    Database DatabaseConfig
    Server   ServerConfig
    Auth     AuthConfig
    Events   EventsConfig
}

type DatabaseConfig struct {
    Driver   string
    DSN      string
    MaxConns int
}

type ServerConfig struct {
    Port    int
    Host    string
    Timeout time.Duration
}

// Usage
func LoadConfig() (*Config, error) {
    config := &Config{
        Database: DatabaseConfig{
            Driver:   getEnv("DB_DRIVER", "sqlite"),
            DSN:      getEnv("DB_DSN", ":memory:"),
            MaxConns: getEnvAsInt("DB_MAX_CONNS", 10),
        },
        Server: ServerConfig{
            Port:    getEnvAsInt("SERVER_PORT", 8080),
            Host:    getEnv("SERVER_HOST", "localhost"),
            Timeout: getEnvAsDuration("SERVER_TIMEOUT", 30*time.Second),
        },
    }
    
    return config, nil
}
```

## 🚀 **Performance Optimization**

### **1. Connection Pooling**
```go
// Example: Database connection pooling
func NewRepository(db *sql.DB) *Repository {
    // Configure connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(5 * time.Minute)
    
    return &Repository{db: db}
}
```

### **2. Caching**
```go
// Example: In-memory caching
type CachedRepository struct {
    repo   RepositoryInterface
    cache  map[string]interface{}
    mutex  sync.RWMutex
    ttl    time.Duration
}

func (cr *CachedRepository) GetMonthlyData(ctx context.Context, ym domain.YearMonth) (*domain.MonthlyData, error) {
    cacheKey := fmt.Sprintf("monthly_data_%d_%d", ym.Year, ym.Month)
    
    // Check cache first
    cr.mutex.RLock()
    if cached, exists := cr.cache[cacheKey]; exists {
        cr.mutex.RUnlock()
        return cached.(*domain.MonthlyData), nil
    }
    cr.mutex.RUnlock()
    
    // Fetch from database
    data, err := cr.repo.GetMonthlyData(ctx, ym)
    if err != nil {
        return nil, err
    }
    
    // Cache the result
    cr.mutex.Lock()
    cr.cache[cacheKey] = data
    cr.mutex.Unlock()
    
    return data, nil
}
```

### **3. Batch Operations**
```go
// Example: Batch expense insertion
func (r *Repository) AddExpensesBatch(ctx context.Context, expenses []*domain.Expense) error {
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    stmt, err := tx.PrepareContext(ctx, `
        INSERT INTO expense (year, month, category, description, amount_cents)
        VALUES (?, ?, ?, ?, ?)
    `)
    if err != nil {
        return err
    }
    defer stmt.Close()
    
    for _, expense := range expenses {
        _, err := stmt.ExecContext(ctx,
            expense.YearMonth.Year,
            expense.YearMonth.Month,
            expense.Category,
            expense.Description,
            expense.AmountCents,
        )
        if err != nil {
            return err
        }
    }
    
    return tx.Commit()
}
```

## 🔍 **Monitoring and Observability**

### **1. Metrics Collection**
```go
// Example: Custom metrics
type Metrics struct {
    ExpenseAdditions    prometheus.Counter
    DatabaseLatency     prometheus.Histogram
    EventPublishLatency prometheus.Histogram
    ActiveConnections   prometheus.Gauge
}

func NewMetrics() *Metrics {
    return &Metrics{
        ExpenseAdditions: prometheus.NewCounter(prometheus.CounterOpts{
            Name: "expense_additions_total",
            Help: "Total number of expense additions",
        }),
        DatabaseLatency: prometheus.NewHistogram(prometheus.HistogramOpts{
            Name:    "database_operation_duration_seconds",
            Help:    "Database operation duration in seconds",
            Buckets: prometheus.DefBuckets,
        }),
    }
}
```

### **2. Health Checks**
```go
// Example: Health check endpoint
func (s *Service) HealthCheck(ctx context.Context) (*HealthStatus, error) {
    status := &HealthStatus{
        Status:    "healthy",
        Timestamp: time.Now(),
        Checks:    make(map[string]CheckResult),
    }
    
    // Database health check
    if err := s.repo.Ping(ctx); err != nil {
        status.Status = "unhealthy"
        status.Checks["database"] = CheckResult{
            Status:  "failed",
            Message: err.Error(),
        }
    } else {
        status.Checks["database"] = CheckResult{
            Status:  "ok",
            Message: "Database connection is healthy",
        }
    }
    
    return status, nil
}
```

## 📚 **Additional Resources**

### **Documentation**
- **API Reference**: See `docs/API_REFERENCE.md`
- **Integration Guide**: See `docs/INTEGRATION_TEST_RESULTS.md`
- **Performance Results**: See `docs/PERFORMANCE_BENCHMARK_RESULTS.md`

### **Code Examples**
- **Service Layer**: See `internal/service/`
- **Event System**: See `internal/events/`
- **Authentication**: See `internal/auth/`
- **Validation**: See `internal/validation/`

### **Testing**
- **Unit Tests**: See `*_test.go` files
- **Integration Tests**: See `internal/integration/`
- **Performance Tests**: See `internal/benchmark/`

---

**👨‍💻 This developer guide provides comprehensive information on using all implemented patterns and best practices.**