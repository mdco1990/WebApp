# 📚 API Reference Documentation

## Overview

This document provides comprehensive API reference for all implemented patterns and services in the web application. The API is built using Go with clean architecture principles and supports multiple programming paradigms.

## 🏗️ **Architecture Overview**

### **Service Layer Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP Layer    │    │  Service Layer  │    │ Repository Layer│
│                 │    │                 │    │                 │
│ - Router        │───▶│ - Core Service  │───▶│ - Repository    │
│ - Middleware    │    │ - Event Service │    │ - Database      │
│ - Handlers      │    │ - Reactive Svc  │    │ - Cache         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Pattern Implementation**
- **Phase 1**: Concurrency (Goroutines, Channels, Context)
- **Phase 2**: Functional Programming (Pure Functions, Composition)
- **Phase 3**: Reactive Programming (Observables, Event Streams)
- **Phase 4**: Strategy Pattern (Authentication, Validation)
- **Phase 5**: Event-Driven Architecture (Event Bus, Domain Events)

## 🔧 **Core Service API**

### **Service Interface**
```go
type Service struct {
    repo RepositoryInterface
}

func New(repo RepositoryInterface) *Service
```

### **Core Methods**

#### **AddExpense**
```go
func (s *Service) AddExpense(ctx context.Context, e *domain.Expense) (int64, error)
```
**Description**: Adds a new expense to the system.

**Parameters**:
- `ctx context.Context`: Context for cancellation and timeouts
- `e *domain.Expense`: Expense data to add

**Returns**:
- `int64`: Expense ID
- `error`: Error if operation fails

**Example**:
```go
expense := &domain.Expense{
    YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
    Description: "Groceries",
    AmountCents: 15000,
    Category:    "Food",
}
expenseID, err := service.AddExpense(ctx, expense)
```

#### **ListExpenses**
```go
func (s *Service) ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error)
```
**Description**: Retrieves all expenses for a given year/month.

**Parameters**:
- `ctx context.Context`: Context for cancellation and timeouts
- `ym domain.YearMonth`: Year and month to query

**Returns**:
- `[]domain.Expense`: List of expenses
- `error`: Error if operation fails

#### **GetMonthlyData**
```go
func (s *Service) GetMonthlyData(ctx context.Context, ym domain.YearMonth) (*domain.MonthlyData, error)
```
**Description**: Retrieves comprehensive monthly financial data.

**Parameters**:
- `ctx context.Context`: Context for cancellation and timeouts
- `ym domain.YearMonth`: Year and month to query

**Returns**:
- `*domain.MonthlyData`: Monthly financial summary
- `error`: Error if operation fails

## 🚀 **Event Service API**

### **EventService Interface**
```go
type EventService struct {
    coreService *Service
    eventBus    EventBusInterface
}

func NewEventService(coreService *Service, eventBus EventBusInterface) *EventService
```

### **Event-Driven Methods**

#### **AddExpense (Event-Driven)**
```go
func (es *EventService) AddExpense(ctx context.Context, expense *domain.Expense, userID int64) (int64, error)
```
**Description**: Adds expense and publishes events for notifications, audit, and analytics.

**Parameters**:
- `ctx context.Context`: Context for cancellation and timeouts
- `expense *domain.Expense`: Expense data to add
- `userID int64`: User ID for event context

**Events Published**:
- `expense.created`: When expense is successfully added
- `budget.exceeded`: When budget limit is exceeded

#### **CreateIncomeSource**
```go
func (es *EventService) CreateIncomeSource(ctx context.Context, userID int64, name string, ym domain.YearMonth, amountCents domain.Money) (int64, error)
```
**Description**: Creates income source and publishes events.

**Events Published**:
- `income_source.created`: When income source is created

#### **CreateBudgetSource**
```go
func (es *EventService) CreateBudgetSource(ctx context.Context, userID int64, name string, ym domain.YearMonth, amountCents domain.Money) (int64, error)
```
**Description**: Creates budget source and publishes events.

**Events Published**:
- `budget_source.created`: When budget source is created

#### **PublishSystemHealth**
```go
func (es *EventService) PublishSystemHealth(ctx context.Context, status, message string, metrics map[string]interface{})
```
**Description**: Publishes system health events for monitoring.

**Events Published**:
- `system.health`: System health status and metrics

### **Event Metrics**
```go
func (es *EventService) GetEventMetrics() *events.EventMetrics
func (es *EventService) GetEventTypes() []string
func (es *EventService) GetSubscriberCount() int
```

## ⚡ **Concurrent Service API**

### **ConcurrentService Interface**
```go
type ConcurrentService struct {
    repo RepositoryInterface
}

func NewConcurrentService(repo RepositoryInterface) *ConcurrentService
```

### **Concurrent Methods**

#### **GetMonthlyDataConcurrent**
```go
func (cs *ConcurrentService) GetMonthlyDataConcurrent(ctx context.Context, ym domain.YearMonth) (*domain.MonthlyData, error)
```
**Description**: Retrieves monthly data using concurrent operations for improved performance.

**Features**:
- Concurrent data retrieval
- Context cancellation support
- Timeout handling
- Error aggregation

## 🔄 **Reactive Service API**

### **ReactiveService Interface**
```go
type ReactiveService struct {
    repo              RepositoryInterface
    monthlyDataStream *reactive.Subject
    expenseStream     *reactive.Subject
    analyticsStream   *reactive.Subject
    summaryStream     *reactive.Subject
    expenseEvents     *reactive.Subject
    validationEvents  *reactive.Subject
}

func NewReactiveService(repo RepositoryInterface, ctx context.Context) *ReactiveService
```

### **Reactive Methods**

#### **LoadMonthlyDataReactive**
```go
func (rs *ReactiveService) LoadMonthlyDataReactive(ctx context.Context, ym domain.YearMonth) error
```
**Description**: Loads monthly data reactively and publishes to streams.

#### **GetExpenseAnalyticsReactive**
```go
func (rs *ReactiveService) GetExpenseAnalyticsReactive() *reactive.Observable
```
**Description**: Returns reactive stream for expense analytics.

#### **GetFinancialSummaryReactive**
```go
func (rs *ReactiveService) GetFinancialSummaryReactive() *reactive.Observable
```
**Description**: Returns reactive stream for financial summaries.

#### **SubscribeToExpenseEvents**
```go
func (rs *ReactiveService) SubscribeToExpenseEvents(id string, handler func(*reactive.Event) error) error
```
**Description**: Subscribes to expense events reactively.

## 🔐 **Authentication Strategy API**

### **AuthService Interface**
```go
type AuthService struct {
    strategies       map[string]AuthStrategy
    defaultStrategy  string
}

func NewAuthService() *AuthService
```

### **Authentication Methods**

#### **RegisterStrategy**
```go
func (as *AuthService) RegisterStrategy(name string, strategy AuthStrategy)
```
**Description**: Registers an authentication strategy.

#### **Authenticate**
```go
func (as *AuthService) Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error)
```
**Description**: Authenticates using the default strategy.

#### **AuthenticateWithStrategy**
```go
func (as *AuthService) AuthenticateWithStrategy(ctx context.Context, credentials interface{}, strategyName string) (*domain.User, error)
```
**Description**: Authenticates using a specific strategy.

### **Available Strategies**

#### **SessionAuth**
```go
func NewSessionAuth(repo RepositoryInterface) *SessionAuth
```
**Methods**:
- `Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error)`
- `ValidateSession(ctx context.Context, sessionID string) (*domain.User, error)`
- `RefreshSession(ctx context.Context, sessionID string) error`
- `RevokeSession(ctx context.Context, sessionID string) error`

#### **TokenAuth**
```go
func NewTokenAuth(secret string, repo RepositoryInterface) *TokenAuth
```
**Methods**:
- `Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error)`
- `ValidateToken(ctx context.Context, token string) (*domain.User, error)`
- `RefreshToken(ctx context.Context, token string) (string, error)`
- `RevokeToken(ctx context.Context, token string) error`

#### **OAuthAuth**
```go
func NewOAuthAuth(provider string, repo RepositoryInterface) *OAuthAuth
```
**Methods**:
- `Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error)`
- `ValidateOAuthToken(ctx context.Context, token string) (*domain.User, error)`
- `RefreshOAuthToken(ctx context.Context, token string) (string, error)`
- `RevokeOAuthToken(ctx context.Context, token string) error`

## ✅ **Validation Strategy API**

### **ValidationService Interface**
```go
type ValidationService struct {
    strategies      map[string]ValidationStrategy
    defaultStrategy string
}

func NewValidationService() *ValidationService
```

### **Validation Methods**

#### **RegisterStrategy**
```go
func (vs *ValidationService) RegisterStrategy(strategy ValidationStrategy)
```
**Description**: Registers a validation strategy.

#### **Validate**
```go
func (vs *ValidationService) Validate(ctx context.Context, data interface{}) error
```
**Description**: Validates data using the default strategy.

#### **ValidateWithStrategy**
```go
func (vs *ValidationService) ValidateWithStrategy(ctx context.Context, data interface{}, strategyName string) error
```
**Description**: Validates data using a specific strategy.

### **Available Strategies**

#### **StrictValidation**
```go
func NewStrictValidation(name string) *StrictValidation
```
**Features**:
- Strict validation rules
- Comprehensive error reporting
- No leniency for edge cases

#### **RelaxedValidation**
```go
func NewRelaxedValidation(name string) *RelaxedValidation
```
**Features**:
- Flexible validation rules
- Graceful error handling
- Lenient for edge cases

#### **CustomValidation**
```go
func NewCustomValidation(name string) *CustomValidation
```
**Features**:
- Custom validation rules
- Extensible validation logic
- Business-specific validation

## 📊 **Event Bus API**

### **EventBus Interface**
```go
type EventBus struct {
    handlers map[string][]EventHandler
    mu       sync.RWMutex
    metrics  *EventMetrics
}

func NewEventBus() *EventBus
```

### **Event Bus Methods**

#### **Subscribe**
```go
func (eb *EventBus) Subscribe(eventType string, handler EventHandler)
```
**Description**: Subscribes to events of a specific type.

#### **Unsubscribe**
```go
func (eb *EventBus) Unsubscribe(eventType string, handler EventHandler)
```
**Description**: Unsubscribes from events of a specific type.

#### **Publish**
```go
func (eb *EventBus) Publish(ctx context.Context, event Event)
```
**Description**: Publishes an event to all subscribers.

#### **PublishAsync**
```go
func (eb *EventBus) PublishAsync(ctx context.Context, event Event)
```
**Description**: Publishes an event asynchronously.

#### **GetMetrics**
```go
func (eb *EventBus) GetMetrics() *EventMetrics
```
**Description**: Returns event bus performance metrics.

## 🗄️ **Repository API**

### **Repository Interface**
```go
type Repository struct {
    db *sql.DB
}

func New(db *sql.DB) *Repository
```

### **Repository Methods**

#### **AddExpense**
```go
func (r *Repository) AddExpense(ctx context.Context, e *domain.Expense) (int64, error)
```
**Description**: Adds expense to database.

#### **ListExpenses**
```go
func (r *Repository) ListExpenses(ctx context.Context, ym domain.YearMonth) ([]domain.Expense, error)
```
**Description**: Lists expenses for a period.

#### **CreateIncomeSource**
```go
func (r *Repository) CreateIncomeSource(ctx context.Context, userID int64, req domain.CreateIncomeSourceRequest) (*domain.IncomeSource, error)
```
**Description**: Creates income source in database.

#### **CreateBudgetSource**
```go
func (r *Repository) CreateBudgetSource(ctx context.Context, userID int64, req domain.CreateBudgetSourceRequest) (*domain.BudgetSource, error)
```
**Description**: Creates budget source in database.

#### **CreateUser**
```go
func (r *Repository) CreateUser(ctx context.Context, username, email, passwordHash string) (*domain.User, error)
```
**Description**: Creates user in database.

## 📋 **Domain Models**

### **Expense**
```go
type Expense struct {
    ID            int64
    YearMonth     YearMonth
    Category      string
    Description   string
    AmountCents   Money
    CreatedAt     time.Time
}
```

### **MonthlyData**
```go
type MonthlyData struct {
    YearMonth     YearMonth
    Expenses      []Expense
    IncomeSources []IncomeSource
    BudgetSources []BudgetSource
    Summary       *FinancialSummary
}
```

### **FinancialSummary**
```go
type FinancialSummary struct {
    TotalIncome   Money
    TotalBudget   Money
    TotalExpenses Money
    Remaining     Money
    Categories    map[string]Money
}
```

### **User**
```go
type User struct {
    ID           int64
    Username     string
    Email        string
    PasswordHash string
    CreatedAt    time.Time
    LastLogin    *time.Time
    IsAdmin      bool
}
```

## 🔧 **HTTP API Endpoints**

### **Health Check**
```
GET /healthz
```
**Description**: Returns system health status.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### **Manual Budget API**
```
GET /api/v1/manual-budget?year=2024&month=1
```
**Description**: Retrieves manual budget for a month.

**Response**:
```json
{
  "bank_amount_cents": 500000,
  "items": [
    {
      "name": "Groceries",
      "amount_cents": 150000
    }
  ]
}
```

```
PUT /api/v1/manual-budget
```
**Description**: Updates manual budget for a month.

**Request Body**:
```json
{
  "year": 2024,
  "month": 1,
  "bank_amount_cents": 500000,
  "items": [
    {
      "name": "Groceries",
      "amount_cents": 150000
    }
  ]
}
```

## 🚀 **Usage Examples**

### **Basic Expense Management**
```go
// Initialize services
repo := repository.New(db)
eventBus := events.NewEventBus()
coreService := service.New(repo)
eventService := service.NewEventService(coreService, eventBus)

// Add expense with events
expense := &domain.Expense{
    YearMonth:   domain.YearMonth{Year: 2024, Month: 1},
    Description: "Groceries",
    AmountCents: 15000,
    Category:    "Food",
}
expenseID, err := eventService.AddExpense(ctx, expense, userID)
```

### **Concurrent Data Retrieval**
```go
concurrentService := service.NewConcurrentService(repo)
monthlyData, err := concurrentService.GetMonthlyDataConcurrent(ctx, ym)
```

### **Reactive Data Processing**
```go
reactiveService := service.NewReactiveService(repo, ctx)
err := reactiveService.LoadMonthlyDataReactive(ctx, ym)
analyticsStream := reactiveService.GetExpenseAnalyticsReactive()
```

### **Authentication with Strategy**
```go
authService := auth.NewAuthService()
sessionAuth := auth.NewSessionAuth(repo)
authService.RegisterStrategy("session", sessionAuth)

user, err := authService.AuthenticateWithStrategy(ctx, credentials, "session")
```

### **Validation with Strategy**
```go
validationService := validation.NewValidationService()
strictValidation := validation.NewStrictValidation("strict")
validationService.RegisterStrategy(strictValidation)

err := validationService.ValidateWithStrategy(ctx, data, "strict")
```

## 📈 **Performance Characteristics**

### **Response Times**
- **Core Operations**: <1ms
- **Event Publishing**: <1ms
- **Database Operations**: <1ms
- **Concurrent Operations**: <1ms

### **Throughput**
- **Memory Usage**: 29,290 ops/sec
- **Event Processing**: 1,000+ events/sec
- **Concurrent Operations**: 3,900+ ops/sec
- **End-to-End Workflow**: 1,876 workflows/sec

### **Scalability**
- **Horizontal Scaling**: Ready for multiple instances
- **Vertical Scaling**: Optimized for high resource utilization
- **Event-Driven**: Supports distributed processing
- **Stateless**: Easy to scale horizontally

## 🔍 **Error Handling**

### **Error Types**
- `ValidationError`: Input validation failures
- `RepositoryError`: Database operation failures
- `EventError`: Event processing failures
- `AuthenticationError`: Authentication failures

### **Error Response Format**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid expense data",
    "details": {
      "field": "amount",
      "reason": "Amount must be positive"
    }
  }
}
```

## 📚 **Additional Resources**

- **Integration Guide**: See `docs/INTEGRATION_TEST_RESULTS.md`
- **Performance Results**: See `docs/PERFORMANCE_BENCHMARK_RESULTS.md`
- **Implementation Summary**: See `docs/IMPLEMENTATION_COMPLETE_SUMMARY.md`
- **Next Steps**: See `docs/NEXT_STEPS.md`

---

**📚 This API reference provides comprehensive documentation for all implemented patterns and services.**