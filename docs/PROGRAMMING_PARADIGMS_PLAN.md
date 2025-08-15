# Programming Paradigms & Design Patterns Implementation Plan (Phase-Based Approach)

## Overview

This document outlines the phase-based implementation plan for applying programming paradigms and design patterns to improve the WebApp architecture. The plan integrates both Go backend and React+TypeScript frontend development in coordinated phases, based on the [Guide to Programming Paradigms in Golang](https://medium.com/@zakariasaif/guide-to-programming-paradigms-in-golang-go-eff42b678a40) and TypeScript patterns for our unified architecture.

## Current Architecture Assessment

### Existing Patterns ✅
**Backend (Go)**:
- **Clean Architecture**: Domain, Service, Repository, Transport layers
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **HTTP Handlers**: Transport layer concerns
- **Domain Models**: Clear business entities

**Frontend (React+TypeScript)**:
- **Component-Based Architecture**: Reusable React components
- **TypeScript Integration**: Basic type safety
- **State Management**: React hooks and context
- **Build System**: Vite for fast development
- **UI Framework**: Bootstrap for styling

### Areas for Improvement 🚀
**Backend (Go)**:
- **Concurrency**: Limited use of goroutines and channels
- **Functional Programming**: Basic validation, could be more functional
- **Interface Abstractions**: Limited interface usage for flexibility
- **Event-Driven Architecture**: No event system for notifications
- **Strategy Patterns**: Hard-coded implementations

**Frontend (React+TypeScript)**:
- **Advanced TypeScript Patterns**: Limited use of advanced type features
- **Generic Components**: Basic component reusability
- **State Management**: Could benefit from discriminated unions
- **Performance Optimization**: Limited memoization and optimization
- **Type Safety**: Could improve with utility types and type guards

## Phase-Based Implementation Plan

### Phase 1: Foundation - Concurrency & Type-Safe State Management (High Priority)

**Duration**: Weeks 1-2  
**Goal**: Establish foundational patterns for backend concurrency and frontend state management

#### Backend Implementation: Concurrency Foundation

**File**: `internal/service/concurrent_service.go`
```go
// Concurrent monthly data processing
func (s *Service) GetMonthlyDataConcurrent(ctx context.Context, ym domain.YearMonth) (*domain.MonthlyData, error) {
    var wg sync.WaitGroup
    var mu sync.Mutex
    
    data := &domain.MonthlyData{YearMonth: ym}
    
    // Concurrent data fetching
    wg.Add(3)
    go func() {
        defer wg.Done()
        income, err := s.repo.GetIncomeSources(ctx, ym)
        if err == nil {
            mu.Lock()
            data.IncomeSources = income
            mu.Unlock()
        }
    }()
    
    go func() {
        defer wg.Done()
        budget, err := s.repo.GetBudgetSources(ctx, ym)
        if err == nil {
            mu.Lock()
            data.BudgetSources = budget
            mu.Unlock()
        }
    }()
    
    go func() {
        defer wg.Done()
        expenses, err := s.repo.GetExpenses(ctx, ym)
        if err == nil {
            mu.Lock()
            data.Expenses = expenses
            mu.Unlock()
        }
    }()
    
    wg.Wait()
    return data, nil
}
```

**File**: `internal/service/background_service.go`
```go
type BackgroundTask struct {
    ID        string
    Type      string
    Data      interface{}
    Status    string
    CreatedAt time.Time
}

func (s *Service) ProcessExpenseReportAsync(ctx context.Context, ym domain.YearMonth) string {
    taskID := generateTaskID()
    
    go func() {
        // Update task status
        s.updateTaskStatus(taskID, "processing")
        
        // Perform heavy computation
        report, err := s.generateExpenseReport(ctx, ym)
        if err != nil {
            s.updateTaskStatus(taskID, "failed")
            return
        }
        
        // Store result
        s.storeTaskResult(taskID, report)
        s.updateTaskStatus(taskID, "completed")
    }()
    
    return taskID
}
```

**File**: `internal/service/worker_pool.go`
```go
type WorkerPool struct {
    workers    int
    jobQueue   chan Job
    resultChan chan Result
    wg         sync.WaitGroup
}

type Job struct {
    ID   string
    Data interface{}
}

type Result struct {
    JobID  string
    Data   interface{}
    Error  error
}

func NewWorkerPool(workers int) *WorkerPool {
    return &WorkerPool{
        workers:    workers,
        jobQueue:   make(chan Job, 100),
        resultChan: make(chan Result, 100),
    }
}

func (wp *WorkerPool) Start(ctx context.Context) {
    for i := 0; i < wp.workers; i++ {
        wp.wg.Add(1)
        go wp.worker(ctx)
    }
}

func (wp *WorkerPool) worker(ctx context.Context) {
    defer wp.wg.Done()
    
    for {
        select {
        case job := <-wp.jobQueue:
            result := wp.processJob(job)
            wp.resultChan <- result
        case <-ctx.Done():
            return
        }
    }
}
```

#### Frontend Implementation: Type-Safe State Management

**File**: `web/src/types/state.ts`
```typescript
type FetchState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

type ApiResponse<T> = {
  data: T;
  message: string;
  timestamp: string;
};

// Usage with backend concurrent data
const [monthlyDataState, setMonthlyDataState] = useState<FetchState<MonthlyData>>({ status: 'idle' });

const fetchMonthlyData = async (yearMonth: YearMonth) => {
  setMonthlyDataState({ status: 'loading' });
  try {
    // Calls backend concurrent service
    const response = await api.getMonthlyDataConcurrent(yearMonth);
    setMonthlyDataState({ status: 'success', data: response.data });
  } catch (error) {
    setMonthlyDataState({ status: 'error', error: error.message });
  }
};
```

**File**: `web/src/components/common/GenericTable.tsx`
```typescript
type TableProps<T> = {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  sortable?: boolean;
  filterable?: boolean;
  loading?: boolean;
  error?: string;
};

type Column<T> = {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  sortable?: boolean;
};

function GenericTable<T>({ data, columns, onRowClick, sortable, filterable, loading, error }: TableProps<T>) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map(column => (
            <th key={String(column.key)}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index} onClick={() => onRowClick?.(item)}>
            {columns.map(column => (
              <td key={String(column.key)}>
                {column.render 
                  ? column.render(item[column.key], item)
                  : String(item[column.key])
                }
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**File**: `web/src/types/forms.ts`
```typescript
type FormValues = {
  name: string;
  email: string;
  age: number;
  category: string;
};

type FormErrors<T> = {
  [K in keyof T]?: string;
};

type FormTouched<T> = {
  [K in keyof T]?: boolean;
};

type FormState<T> = {
  values: T;
  errors: FormErrors<T>;
  touched: FormTouched<T>;
  isValid: boolean;
  isSubmitting: boolean;
};

// Integration with backend validation
const validateForm = async (formData: FormValues): Promise<FormErrors<FormValues>> => {
  // Calls backend functional validation pipeline
  const response = await api.validateFormData(formData);
  return response.errors || {};
};
```

#### Phase 1 Tasks:
- [ ] Implement concurrent data processing in Go
- [ ] Add background task processing with goroutines
- [ ] Create worker pool for heavy operations
- [ ] Implement discriminated unions for React state
- [ ] Create generic table components
- [ ] Add mapped types for dynamic forms
- [ ] Integrate frontend with backend concurrent APIs
- [ ] Add proper error handling across both layers

### Phase 2: Functional Programming & Advanced Component Patterns (High Priority)

**Duration**: Weeks 3-4  
**Goal**: Implement functional patterns in Go and advanced component patterns in React

#### Backend Implementation: Functional Programming Patterns

**File**: `internal/validation/functional.go`
```go
type Validator func(interface{}) error

// Chain multiple validators
func Chain(validators ...Validator) Validator {
    return func(v interface{}) error {
        for _, validator := range validators {
            if err := validator(v); err != nil {
                return err
            }
        }
        return nil
    }
}

// Specific validators
func ValidateAmount(v interface{}) error {
    expense := v.(*domain.Expense)
    if expense.AmountCents <= 0 {
        return errors.New("amount must be positive")
    }
    return nil
}

func ValidateDescription(v interface{}) error {
    expense := v.(*domain.Expense)
    if len(expense.Description) == 0 {
        return errors.New("description is required")
    }
    if len(expense.Description) > 255 {
        return errors.New("description too long")
    }
    return nil
}

// Usage in service
func (s *Service) AddExpense(ctx context.Context, e *domain.Expense) (int64, error) {
    validator := Chain(
        ValidateAmount,
        ValidateDescription,
        ValidateYearMonth,
    )
    
    if err := validator(e); err != nil {
        return 0, err
    }
    
    return s.repo.AddExpense(ctx, e)
}
```

**File**: `internal/errors/functional.go`
```go
type ValidationError struct {
    Field   string
    Message string
}

func (ve ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", ve.Field, ve.Message)
}

type ValidationErrors []ValidationError

func (ves ValidationErrors) Error() string {
    messages := make([]string, len(ves))
    for i, ve := range ves {
        messages[i] = ve.Error()
    }
    return strings.Join(messages, "; ")
}

// Functional error handling
func HandleError(err error, handlers ...func(error) error) error {
    for _, handler := range handlers {
        if err = handler(err); err == nil {
            break
        }
    }
    return err
}
```

**File**: `internal/transformation/functional.go`
```go
type Transformer func(interface{}) (interface{}, error)

// Pipeline for data transformation
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

// Specific transformers
func SortExpensesByAmount(data interface{}) (interface{}, error) {
    expenses := data.([]domain.Expense)
    sorted := make([]domain.Expense, len(expenses))
    copy(sorted, expenses)
    
    sort.Slice(sorted, func(i, j int) bool {
        return sorted[i].AmountCents > sorted[j].AmountCents
    })
    
    return sorted, nil
}
```

#### Frontend Implementation: Advanced Component Patterns

**File**: `web/src/components/hoc/withLoading.tsx`
```typescript
type WithLoadingProps = {
  loading: boolean;
  error?: string;
};

function withLoading<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & WithLoadingProps> {
  return function WithLoadingComponent(props: P & WithLoadingProps) {
    const { loading, error, ...componentProps } = props;
    
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;
    
    return <Component {...(componentProps as P)} />;
  };
}

// Usage with backend functional validation
const ExpenseFormWithLoading = withLoading(ExpenseForm);
```

**File**: `web/src/hooks/useApi.ts`
```typescript
type UseApiOptions<T> = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: T;
  headers?: Record<string, string>;
  cache?: boolean;
};

function useApi<TData, TBody = never>(
  options: UseApiOptions<TBody>
): {
  data: TData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(options.url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      const result = await response.json();
      
      // Integrate with backend functional validation
      if (!result.success && result.errors) {
        setError(result.errors.join('; '));
        return;
      }
      
      setData(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

**File**: `web/src/context/AppContext.tsx`
```typescript
type User = {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
};

type AuthContextType = {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      // Integrates with backend functional validation
      const response = await api.login(credentials);
      if (response.success) {
        setUser(response.data.user);
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

#### Phase 2 Tasks:
- [ ] Implement functional validation pipeline in Go
- [ ] Add functional error handling and transformation
- [ ] Create higher-order components in React
- [ ] Implement custom hooks with proper typing
- [ ] Add context API with TypeScript integration
- [ ] Integrate frontend components with backend functional patterns
- [ ] Update existing validation to use functional approach

### Phase 3: Interface Abstractions & Advanced Type Patterns (Medium Priority)

**Duration**: Weeks 5-6  
**Goal**: Create flexible abstractions and advanced type patterns

#### Backend Implementation: Interface-Based Design

**File**: `internal/storage/interface.go`
```go
type StorageProvider interface {
    Save(ctx context.Context, key string, data []byte, ttl time.Duration) error
    Load(ctx context.Context, key string) ([]byte, error)
    Delete(ctx context.Context, key string) error
    Exists(ctx context.Context, key string) (bool, error)
}

// SQLite implementation
type SQLiteStorage struct {
    db *sql.DB
}

func (s *SQLiteStorage) Save(ctx context.Context, key string, data []byte, ttl time.Duration) error {
    _, err := s.db.ExecContext(ctx,
        `INSERT OR REPLACE INTO cache (key, data, expires_at) VALUES (?, ?, ?)`,
        key, data, time.Now().Add(ttl))
    return err
}

// Redis implementation (future)
type RedisStorage struct {
    client *redis.Client
}

func (r *RedisStorage) Save(ctx context.Context, key string, data []byte, ttl time.Duration) error {
    return r.client.Set(ctx, key, data, ttl).Err()
}
```

**File**: `internal/service/interfaces.go`
```go
type UserService interface {
    CreateUser(ctx context.Context, user *domain.User) error
    GetUser(ctx context.Context, id int64) (*domain.User, error)
    UpdateUser(ctx context.Context, user *domain.User) error
    DeleteUser(ctx context.Context, id int64) error
}

type FinancialService interface {
    AddExpense(ctx context.Context, expense *domain.Expense) (int64, error)
    GetMonthlyData(ctx context.Context, ym domain.YearMonth) (*domain.MonthlyData, error)
    SetBudget(ctx context.Context, ym domain.YearMonth, amount domain.Money) error
}

// Factory for creating services
type ServiceFactory struct {
    db     *sql.DB
    cache  StorageProvider
    config *config.Config
}

func (f *ServiceFactory) CreateUserService() UserService {
    repo := repository.NewUserRepository(f.db)
    return &userService{repo: repo, cache: f.cache}
}
```

#### Frontend Implementation: Advanced Type Patterns

**File**: `web/src/types/utilities.ts`
```typescript
type ApiResponse<T> = {
  data: T;
  success: boolean;
  message: string;
};

type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type FormField<T> = {
  value: T;
  error?: string;
  touched: boolean;
  required: boolean;
};

type FormState<T> = {
  [K in keyof T]: FormField<T[K]>;
};

// Conditional types for backend integration
type BackendValidated<T> = T & {
  _validated: true;
  _validationTimestamp: number;
};

type ValidationRule<T> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => Promise<string | null>;
};

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};
```

**File**: `web/src/utils/typeGuards.ts`
```typescript
function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    'success' in obj &&
    'message' in obj
  );
}

function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.username === 'string' &&
    typeof obj.email === 'string'
  );
}

function isBackendError(obj: any): obj is BackendError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'field' in obj &&
    'message' in obj &&
    typeof obj.field === 'string' &&
    typeof obj.message === 'string'
  );
}

// Integration with backend validation
const validateApiResponse = <T>(response: unknown): response is ApiResponse<T> => {
  if (!isApiResponse<T>(response)) {
    throw new Error('Invalid API response format');
  }
  return true;
};
```

#### Phase 3 Tasks:
- [ ] Create storage interface abstractions in Go
- [ ] Implement service interface abstractions
- [ ] Add factory pattern for dependency injection
- [ ] Create conditional types and utility types in TypeScript
- [ ] Implement type guards for runtime safety
- [ ] Add advanced type utilities for form handling
- [ ] Integrate frontend type patterns with backend interfaces

### Phase 4: Strategy Patterns & Performance Optimization (Medium Priority)

**Duration**: Weeks 7-8  
**Goal**: Implement flexible strategies and optimize performance

#### Backend Implementation: Strategy Pattern Implementation

**File**: `internal/auth/strategy.go`
```go
type AuthStrategy interface {
    Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error)
    Validate(ctx context.Context, token string) (*domain.User, error)
}

type SessionAuth struct {
    repo *repository.Repository
}

func (s *SessionAuth) Authenticate(ctx context.Context, credentials interface{}) (*domain.User, error) {
    creds := credentials.(*domain.LoginRequest)
    
    user, err := s.repo.GetUserByUsername(ctx, creds.Username)
    if err != nil {
        return nil, err
    }
    
    if !s.validatePassword(creds.Password, user.PasswordHash) {
        return nil, errors.New("invalid credentials")
    }
    
    return user, nil
}

type TokenAuth struct {
    jwtSecret string
    repo      *repository.Repository
}

type AuthService struct {
    strategies map[string]AuthStrategy
}

func (s *AuthService) RegisterStrategy(name string, strategy AuthStrategy) {
    s.strategies[name] = strategy
}

func (s *AuthService) Authenticate(ctx context.Context, method string, credentials interface{}) (*domain.User, error) {
    strategy, exists := s.strategies[method]
    if !exists {
        return nil, errors.New("unsupported auth method")
    }
    return strategy.Authenticate(ctx, credentials)
}
```

**File**: `internal/validation/strategy.go`
```go
type ValidationStrategy interface {
    Validate(ctx context.Context, data interface{}) error
}

type StrictValidation struct{}

func (s *StrictValidation) Validate(ctx context.Context, data interface{}) error {
    // Strict validation rules
    return nil
}

type RelaxedValidation struct{}

func (r *RelaxedValidation) Validate(ctx context.Context, data interface{}) error {
    // Relaxed validation rules
    return nil
}

type ValidationService struct {
    strategies map[string]ValidationStrategy
}

func (vs *ValidationService) Validate(ctx context.Context, context string, data interface{}) error {
    strategy, exists := vs.strategies[context]
    if !exists {
        strategy = vs.strategies["default"]
    }
    return strategy.Validate(ctx, data)
}
```

#### Frontend Implementation: Performance Optimization Patterns

**File**: `web/src/hooks/useMemoizedValue.ts`
```typescript
function useMemoizedValue<T>(
  value: T,
  dependencies: React.DependencyList,
  compareFn?: (prev: T, next: T) => boolean
): T {
  const memoizedValue = useMemo(() => value, dependencies);
  
  if (compareFn) {
    const prevValueRef = useRef<T>(memoizedValue);
    if (!compareFn(prevValueRef.current, memoizedValue)) {
      prevValueRef.current = memoizedValue;
    }
    return prevValueRef.current;
  }
  
  return memoizedValue;
}

// Integration with backend strategies
const useMemoizedApiCall = <T>(
  apiCall: () => Promise<T>,
  dependencies: React.DependencyList,
  authStrategy: 'session' | 'token' = 'session'
) => {
  return useMemoizedValue(
    apiCall,
    [authStrategy, ...dependencies],
    (prev, next) => prev === next
  );
};
```

**File**: `web/src/components/LazyComponent.tsx`
```typescript
type LazyComponentProps = {
  fallback?: React.ReactNode;
  errorBoundary?: React.ComponentType<{ children: React.ReactNode }>;
  preload?: boolean;
};

function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentProps = {}
): React.LazyExoticComponent<T> {
  const LazyComponent = lazy(importFn);
  
  // Preload if requested
  if (options.preload) {
    importFn();
  }
  
  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <Suspense fallback={options.fallback || <LoadingSpinner />}>
      {options.errorBoundary ? (
        <options.errorBoundary>
          <LazyComponent {...props} ref={ref} />
        </options.errorBoundary>
      ) : (
        <LazyComponent {...props} ref={ref} />
      )}
    </Suspense>
  ));
}

// Integration with backend auth strategies
const LazyAdminPanel = createLazyComponent(
  () => import('../components/AdminPanel'),
  { 
    fallback: <AdminPanelSkeleton />,
    preload: true // Preload for admin users
  }
);
```

#### Phase 4 Tasks:
- [ ] Implement authentication strategies in Go
- [ ] Add validation strategies with context selection
- [ ] Create memoization patterns in React
- [ ] Implement lazy loading and code splitting
- [ ] Optimize component rendering performance
- [ ] Integrate frontend optimizations with backend strategies
- [ ] Add performance monitoring and metrics

### Phase 5: Event-Driven Architecture & Advanced State Management (Low Priority)

**Duration**: Weeks 9-10  
**Goal**: Implement event-driven patterns and advanced state management

#### Backend Implementation: Event-Driven Architecture

**File**: `internal/events/bus.go`
```go
type Event interface {
    Type() string
    Data() interface{}
    Timestamp() time.Time
}

type EventHandler func(ctx context.Context, event Event) error

type EventBus struct {
    handlers map[string][]EventHandler
    mu       sync.RWMutex
}

func NewEventBus() *EventBus {
    return &EventBus{
        handlers: make(map[string][]EventHandler),
    }
}

func (eb *EventBus) Subscribe(eventType string, handler EventHandler) {
    eb.mu.Lock()
    defer eb.mu.Unlock()
    eb.handlers[eventType] = append(eb.handlers[eventType], handler)
}

func (eb *EventBus) Publish(ctx context.Context, event Event) {
    eb.mu.RLock()
    handlers := eb.handlers[event.Type()]
    eb.mu.RUnlock()
    
    for _, handler := range handlers {
        go func(h EventHandler) {
            if err := h(ctx, event); err != nil {
                slog.Error("event handler failed", "event", event.Type(), "err", err)
            }
        }(handler)
    }
}

// Specific events
type ExpenseCreatedEvent struct {
    Expense *domain.Expense
    UserID  int64
    time    time.Time
}

func (e ExpenseCreatedEvent) Type() string { return "expense.created" }
func (e ExpenseCreatedEvent) Data() interface{} { return e.Expense }
func (e ExpenseCreatedEvent) Timestamp() time.Time { return e.time }
```

**File**: `internal/events/handlers.go`
```go
type NotificationHandler struct {
    notificationService NotificationService
}

func (h *NotificationHandler) HandleExpenseCreated(ctx context.Context, event Event) error {
    expenseEvent := event.(ExpenseCreatedEvent)
    
    message := fmt.Sprintf("New expense added: %s - $%.2f", 
        expenseEvent.Expense.Description, 
        float64(expenseEvent.Expense.AmountCents)/100)
    
    return h.notificationService.SendNotification(ctx, expenseEvent.UserID, message)
}

type AuditHandler struct {
    auditRepo *repository.AuditRepository
}

func (h *AuditHandler) HandleExpenseCreated(ctx context.Context, event Event) error {
    expenseEvent := event.(ExpenseCreatedEvent)
    
    audit := &domain.AuditLog{
        UserID:    expenseEvent.UserID,
        Action:    "expense.created",
        Resource:  "expense",
        ResourceID: expenseEvent.Expense.ID,
        Timestamp: event.Timestamp(),
    }
    
    return h.auditRepo.Create(ctx, audit)
}
```

#### Frontend Implementation: Advanced State Management

**File**: `web/src/reducers/appReducer.ts`
```typescript
type AppState = {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  filters: ExpenseFilters;
  events: AppEvent[];
};

type AppAction = 
  | { type: 'SET_EXPENSES'; payload: Expense[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: ExpenseFilters }
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: number }
  | { type: 'ADD_EVENT'; payload: AppEvent };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload };
    case 'ADD_EXPENSE':
      // Integrate with backend events
      return { 
        ...state, 
        expenses: [...state.expenses, action.payload],
        events: [...state.events, { 
          type: 'expense.created', 
          data: action.payload, 
          timestamp: new Date() 
        }]
      };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    default:
      return state;
  }
}

// Event integration hook
const useEventListener = (eventType: string, handler: (event: AppEvent) => void) => {
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    
    eventSource.addEventListener(eventType, (event) => {
      const appEvent = JSON.parse(event.data);
      handler(appEvent);
    });
    
    return () => eventSource.close();
  }, [eventType, handler]);
};
```

**File**: `web/src/machines/formMachine.ts`
```typescript
type FormState = 
  | { status: 'idle' }
  | { status: 'editing'; data: FormData }
  | { status: 'validating'; data: FormData }
  | { status: 'submitting'; data: FormData }
  | { status: 'success'; data: FormData }
  | { status: 'error'; data: FormData; error: string };

type FormEvent = 
  | { type: 'START_EDITING'; data: FormData }
  | { type: 'VALIDATE' }
  | { type: 'SUBMIT' }
  | { type: 'SUCCESS' }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };

function formMachine(state: FormState, event: FormEvent): FormState {
  switch (state.status) {
    case 'idle':
      if (event.type === 'START_EDITING') {
        return { status: 'editing', data: event.data };
      }
      break;
    case 'editing':
      if (event.type === 'VALIDATE') {
        return { status: 'validating', data: state.data };
      }
      break;
    case 'validating':
      if (event.type === 'SUBMIT') {
        return { status: 'submitting', data: state.data };
      }
      break;
    case 'submitting':
      if (event.type === 'SUCCESS') {
        return { status: 'success', data: state.data };
      }
      if (event.type === 'ERROR') {
        return { status: 'error', data: state.data, error: event.error };
      }
      break;
  }
  return state;
}

// Integration with backend events
const useFormMachine = (initialData: FormData) => {
  const [state, dispatch] = useReducer(formMachine, { status: 'idle' });
  
  const handleSubmit = useCallback(async (data: FormData) => {
    dispatch({ type: 'VALIDATE' });
    
    try {
      // Backend validation
      await api.validateForm(data);
      dispatch({ type: 'SUBMIT' });
      
      // Backend submission
      await api.submitForm(data);
      dispatch({ type: 'SUCCESS' });
    } catch (error) {
      dispatch({ type: 'ERROR', error: error.message });
    }
  }, []);
  
  return { state, handleSubmit };
};
```

#### Phase 5 Tasks:
- [ ] Implement event bus system in Go
- [ ] Create event handlers for notifications and auditing
- [ ] Add event subscription and publishing
- [ ] Implement reducer pattern in React
- [ ] Create state machines for complex flows
- [ ] Add real-time event integration between backend and frontend
- [ ] Implement advanced state management patterns

## Phase-Based Implementation Timeline

### Overall Schedule (10 Weeks)

**Weeks 1-2: Phase 1** - Foundation
- Backend: Concurrency patterns (concurrent data processing, background tasks, worker pools)
- Frontend: Type-safe state management (discriminated unions, generic components, mapped types)
- Integration: Connect frontend to backend concurrent APIs

**Weeks 3-4: Phase 2** - Functional & Components
- Backend: Functional programming (validation pipeline, error handling, data transformation)
- Frontend: Advanced components (HOCs, custom hooks, context API)
- Integration: Frontend components with backend functional patterns

**Weeks 5-6: Phase 3** - Interfaces & Types
- Backend: Interface abstractions (storage interfaces, service interfaces, factory patterns)
- Frontend: Advanced types (conditional types, utility types, type guards)
- Integration: Type-safe communication between layers

**Weeks 7-8: Phase 4** - Strategy & Performance
- Backend: Strategy patterns (authentication strategies, validation strategies)
- Frontend: Performance optimization (memoization, lazy loading, code splitting)
- Integration: Frontend optimizations with backend strategies

**Weeks 9-10: Phase 5** - Events & State
- Backend: Event-driven architecture (event bus, event handlers)
- Frontend: Advanced state management (reducers, state machines)
- Integration: Real-time event communication

## Testing Strategy

### Unit Testing
- **Phase 1**: Test concurrent operations and state management
- **Phase 2**: Test functional patterns and component behavior
- **Phase 3**: Test interface implementations and type safety
- **Phase 4**: Test strategy selection and performance optimizations
- **Phase 5**: Test event handling and state transitions

### Integration Testing
- Test cross-layer communication for each phase
- Verify frontend-backend integration
- Test error scenarios and edge cases
- Performance testing for concurrent operations

### End-to-End Testing
- Complete user workflows
- Real-time event handling
- Authentication and authorization flows
- Data consistency across all patterns

## Monitoring and Observability

### Metrics to Track
- **Phase 1**: Concurrent operation performance, state management efficiency
- **Phase 2**: Validation pipeline performance, component render times
- **Phase 3**: Interface usage patterns, type safety coverage
- **Phase 4**: Strategy selection frequency, performance improvements
- **Phase 5**: Event processing latency, state machine transitions

### Logging
- Structured logging for all patterns
- Correlation IDs for cross-layer requests
- Performance metrics for each phase
- Error tracking and recovery patterns

## Success Criteria

### Performance Improvements
- **Phase 1**: 50% reduction in data loading times, improved concurrent handling
- **Phase 2**: Better error handling, improved component reusability
- **Phase 3**: Increased type safety, better interface abstractions
- **Phase 4**: Optimized authentication flows, improved rendering performance
- **Phase 5**: Real-time event processing, advanced state management

### Code Quality Metrics
- 100% test coverage for new patterns
- Zero race conditions in concurrent code
- 100% TypeScript type coverage
- Improved maintainability scores
- Better separation of concerns

### Developer Experience
- Reduced development time for new features
- Improved debugging capabilities
- Better code organization and structure
- Enhanced type safety and IDE support

## Risk Mitigation

### Phase-Specific Risks
- **Phase 1**: Concurrency complexity, state management overhead
- **Phase 2**: Functional pattern adoption, component complexity
- **Phase 3**: Over-abstraction, type complexity
- **Phase 4**: Strategy overhead, performance regression
- **Phase 5**: Event system complexity, state management overhead

### Mitigation Strategies
- Start with simple implementations
- Add complexity incrementally
- Maintain backward compatibility
- Monitor performance continuously
- Regular code reviews and pair programming

## Conclusion

This phase-based implementation plan provides a coordinated approach to improving the WebApp architecture using programming paradigms and design patterns. By implementing backend Go patterns and frontend React+TypeScript patterns together in each phase, we ensure better integration and more cohesive development.

Each phase builds upon the previous one, creating a solid foundation for a robust, scalable web application that leverages both Go's concurrency strengths and TypeScript's type safety effectively.
