# AI Implementation Prompt for Programming Paradigms (Phase-Based Approach)

## Context

You are an expert full-stack developer implementing programming paradigms and design patterns for a web application with the following architecture:

- **Backend**: Go with clean architecture (domain, service, repository, transport layers)
- **Frontend**: React + TypeScript + Bootstrap
- **Database**: SQLite with GORM
- **Proxy**: Nginx reverse proxy
- **Current Patterns**: Repository pattern, Service layer, HTTP handlers, Domain models

This implementation covers both backend (Go) and frontend (React+TypeScript) patterns to create a cohesive, type-safe, and scalable application, organized by implementation phases for coordinated development.

## Implementation Request

Please implement the following programming paradigms and design patterns organized by phase, with both backend and frontend components working together:

Based on the [Guide to Programming Paradigms in Golang](https://medium.com/@zakariasaif/guide-to-programming-paradigms-in-golang-go-eff42b678a40) and the [TypeScript Patterns for React Development](https://medium.com/@ignatovich.dm/typescript-patterns-you-should-know-for-react-development-d43129494027) to create a unified, type-safe, scalable application.

## Phase-Based Implementation Plan

### Phase 1: Foundation - Concurrency & Type-Safe State Management (High Priority)

This phase establishes the foundational patterns for both backend concurrency and frontend state management, ensuring they work cohesively together.

#### Backend Implementation: Concurrency Foundation

##### 1.1 Concurrent Data Processing
**File**: `internal/service/concurrent_service.go`

```go
// Implement concurrent monthly data processing
// - Use goroutines for parallel data fetching
// - Implement proper synchronization with sync.WaitGroup and sync.Mutex
// - Handle errors gracefully in concurrent operations
// - Add context support for cancellation
```

**Requirements**:
- Create `GetMonthlyDataConcurrent` method that fetches income sources, budget sources, and expenses concurrently
- Use goroutines for each data fetch operation
- Implement proper error handling and resource cleanup
- Add timeout support using context
- Support graceful cancellation

##### 1.2 Background Task Processing
**File**: `internal/service/background_service.go`

```go
// Implement non-blocking background task processing
// - Use goroutines for heavy computations
// - Implement task status tracking
// - Add task result storage
// - Support task cancellation
```

**Requirements**:
- Create `BackgroundTask` struct with ID, Type, Data, Status, CreatedAt fields
- Implement `ProcessExpenseReportAsync` method that returns task ID immediately
- Use goroutines for background processing
- Add task status updates (processing, completed, failed)
- Implement task result storage mechanism

##### 1.3 Worker Pool for Data Processing
**File**: `internal/service/worker_pool.go`

```go
// Implement controlled concurrency with worker pools
// - Create configurable worker pool
// - Support job queuing and result collection
// - Implement graceful shutdown
// - Add job processing with error handling
```

**Requirements**:
- Create `WorkerPool` struct with configurable number of workers
- Implement job queue and result channel
- Add worker lifecycle management (start, stop, graceful shutdown)
- Support job processing with proper error handling
- Add context support for cancellation

#### Frontend Implementation: Type-Safe State Management

##### 1.4 Discriminated Unions for Complex State
**File**: `web/src/types/state.ts`

```typescript
// Implement discriminated unions for managing complex state
// - Create type-safe loading states
// - Handle multiple state variations
// - Ensure invalid state combinations are impossible
// - Support explicit state transitions
```

**Requirements**:
- Define discriminated union types for API states (idle, loading, success, error)
- Create type-safe state reducers for data fetching
- Implement proper error handling with typed error states
- Add loading state management for async operations
- Support optimistic updates with rollback capabilities

**Example Implementation**:
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

// Usage in components for backend API integration
const [expenseState, setExpenseState] = useState<FetchState<Expense[]>>({ status: 'idle' });
```

##### 1.5 Generic Components for Reusability
**File**: `web/src/components/common/GenericTable.tsx`

```typescript
// Implement generic components for maximum reusability
// - Create type-safe table components
// - Support custom rendering functions
// - Maintain type inference throughout
// - Enable flexible data structures
```

**Requirements**:
- Create generic table component with typed props
- Implement custom row rendering with type safety
- Support sorting and filtering with typed callbacks
- Add pagination with generic data handling
- Create reusable form components with validation
- Integrate with backend concurrent data fetching

**Example Implementation**:
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
  // Implementation with full type safety and loading states
}
```

##### 1.6 Mapped Types for Dynamic Forms
**File**: `web/src/types/forms.ts`

```typescript
// Implement mapped types for dynamic form handling
// - Create type-safe form validation
// - Support dynamic field generation
// - Enable conditional form logic
// - Maintain type safety for form state
```

**Requirements**:
- Define mapped types for form validation errors
- Create dynamic form field types
- Implement conditional form rendering
- Add type-safe form submission handling
- Support nested form structures
- Integrate with backend validation patterns

**Example Implementation**:
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
```

### Phase 2: Functional Programming & Advanced Component Patterns (High Priority)

This phase implements functional programming patterns in Go and advanced component patterns in React, ensuring they complement each other.

#### Backend Implementation: Functional Programming Patterns

##### 2.1 Functional Validation Pipeline
**File**: `internal/validation/functional.go`

```go
// Implement chainable, composable validation
// - Create Validator function type
// - Implement Chain function for combining validators
// - Add specific validators for domain entities
// - Support functional composition patterns
```

**Requirements**:
- Define `Validator` as `func(interface{}) error`
- Implement `Chain` function that combines multiple validators
- Create specific validators: `ValidateAmount`, `ValidateDescription`, `ValidateYearMonth`
- Update service layer to use functional validation
- Add type safety with proper type assertions

##### 2.2 Functional Error Handling
**File**: `internal/errors/functional.go`

```go
// Implement functional error handling patterns
// - Create structured error types
// - Implement error composition
// - Add error handling pipelines
// - Support error transformation
```

**Requirements**:
- Create `ValidationError` and `ValidationErrors` types
- Implement `HandleError` function for error processing pipelines
- Add error handlers: `LogError`, `WrapError`
- Support error composition and transformation
- Integrate with existing error handling

##### 2.3 Functional Data Transformation
**File**: `internal/transformation/functional.go`

```go
// Implement pipeline-based data transformation
// - Create Transformer function type
// - Implement Pipeline function for chaining transformations
// - Add specific transformers for domain data
// - Support functional data processing
```

**Requirements**:
- Define `Transformer` as `func(interface{}) (interface{}, error)`
- Implement `Pipeline` function for chaining transformers
- Create specific transformers: `SortExpensesByAmount`, `FilterExpensesByCategory`
- Support immutable data transformations
- Add error handling in transformation pipelines

#### Frontend Implementation: Advanced Component Patterns

##### 2.4 Higher-Order Components with TypeScript
**File**: `web/src/components/hoc/withLoading.tsx`

```typescript
// Implement type-safe higher-order components
// - Create reusable HOCs with proper typing
// - Support component composition
// - Maintain prop forwarding
// - Enable conditional rendering
```

**Requirements**:
- Create HOC for loading states with proper typing
- Implement error boundary HOC with typed error handling
- Add authentication HOC with user context
- Support theme HOC with typed theme objects
- Create responsive HOC with breakpoint handling
- Integrate with backend functional error handling

**Example Implementation**:
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
```

##### 2.5 Custom Hooks with TypeScript
**File**: `web/src/hooks/useApi.ts`

```typescript
// Implement type-safe custom hooks
// - Create reusable API hooks
// - Support proper error handling
// - Enable caching and optimization
// - Maintain type safety throughout
```

**Requirements**:
- Create useApi hook with generic data types
- Implement useLocalStorage hook with type safety
- Add useDebounce hook for search functionality
- Create useForm hook with validation
- Support useCallback and useMemo with proper typing
- Integrate with backend concurrent operations

**Example Implementation**:
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
  // Implementation with full type safety and backend integration
}
```

##### 2.6 Context API with TypeScript
**File**: `web/src/context/AppContext.tsx`

```typescript
// Implement type-safe context providers
// - Create strongly typed context
// - Support multiple context providers
// - Enable context composition
// - Maintain performance optimization
```

**Requirements**:
- Create typed context for user authentication
- Implement theme context with typed theme objects
- Add notification context with typed messages
- Create settings context with typed configuration
- Support context composition and nesting
- Integrate with backend authentication strategies

**Example Implementation**:
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
  // Implementation with proper typing and backend integration
}
```

### Phase 3: Interface Abstractions & Advanced Type Patterns (Medium Priority)

This phase focuses on creating flexible abstractions in Go and advanced type patterns in React for maximum reusability and type safety.

#### Backend Implementation: Interface-Based Design

##### 3.1 Storage Interface Abstraction
**File**: `internal/storage/interface.go`

```go
// Implement flexible storage backends
// - Create StorageProvider interface
// - Implement SQLite storage provider
// - Add Redis storage provider (for future use)
// - Support TTL and cache management
```

**Requirements**:
- Define `StorageProvider` interface with Save, Load, Delete, Exists methods
- Implement `SQLiteStorage` struct with SQLite-specific operations
- Add `RedisStorage` struct for future Redis integration
- Support TTL (Time To Live) for cache entries
- Add proper error handling and context support

##### 3.2 Service Interface Abstractions
**File**: `internal/service/interfaces.go`

```go
// Implement service interface abstractions
// - Create interfaces for all services
// - Implement concrete service structs
// - Add factory pattern for service creation
// - Support dependency injection
```

**Requirements**:
- Define interfaces: `UserService`, `FinancialService`, `NotificationService`
- Create concrete implementations with proper struct embedding
- Implement `ServiceFactory` for dependency injection
- Support configuration-based service creation
- Add proper error handling and context support

#### Frontend Implementation: Advanced Type Patterns

##### 3.3 Conditional Types and Utility Types
**File**: `web/src/types/utilities.ts`

```typescript
// Implement advanced TypeScript utility types
// - Create conditional types for dynamic behavior
// - Support utility types for common patterns
// - Enable type transformations
// - Maintain type safety for complex scenarios
```

**Requirements**:
- Create conditional types for form field validation
- Implement utility types for API responses
- Add type guards for runtime type checking
- Create mapped types for configuration objects
- Support template literal types for dynamic strings
- Integrate with backend interface abstractions

**Example Implementation**:
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
```

##### 3.4 Type Guards and Runtime Type Checking
**File**: `web/src/utils/typeGuards.ts`

```typescript
// Implement type guards for runtime safety
// - Create type-safe runtime checks
// - Support API response validation
// - Enable error boundary handling
// - Maintain type narrowing
```

**Requirements**:
- Create type guards for API responses
- Implement user input validation guards
- Add error type guards for error boundaries
- Create form validation guards
- Support union type narrowing
- Integrate with backend validation patterns

**Example Implementation**:
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
```

### Phase 4: Strategy Patterns & Performance Optimization (Medium Priority)

This phase implements flexible strategy patterns in Go and performance optimizations in React for scalability and efficiency.

#### Backend Implementation: Strategy Pattern Implementation

##### 4.1 Authentication Strategy
**File**: `internal/auth/strategy.go`

```go
// Implement multiple authentication strategies
// - Create AuthStrategy interface
// - Implement SessionAuth and TokenAuth strategies
// - Add AuthService for strategy management
// - Support strategy registration and selection
```

**Requirements**:
- Define `AuthStrategy` interface with Authenticate and Validate methods
- Implement `SessionAuth` for session-based authentication
- Implement `TokenAuth` for JWT-based authentication
- Create `AuthService` for strategy management
- Support dynamic strategy registration and selection

##### 4.2 Validation Strategy
**File**: `internal/validation/strategy.go`

```go
// Implement different validation strategies
// - Create ValidationStrategy interface
// - Implement StrictValidation and RelaxedValidation
// - Add ValidationService for strategy management
// - Support context-based validation selection
```

**Requirements**:
- Define `ValidationStrategy` interface with Validate method
- Implement `StrictValidation` for strict business rules
- Implement `RelaxedValidation` for relaxed validation
- Create `ValidationService` for strategy management
- Support context-based validation strategy selection

#### Frontend Implementation: Performance Optimization Patterns

##### 4.3 Memoization with TypeScript
**File**: `web/src/hooks/useMemoizedValue.ts`

```typescript
// Implement type-safe memoization
// - Create custom memoization hooks
// - Support complex dependency arrays
// - Enable performance optimization
// - Maintain type safety for cached values
```

**Requirements**:
- Create useMemoizedValue hook with proper typing
- Implement useCallback with typed dependencies
- Add useMemo for expensive calculations
- Create custom memoization for API calls
- Support memoization with custom comparison functions
- Integrate with backend strategy patterns

##### 4.4 Lazy Loading and Code Splitting
**File**: `web/src/components/LazyComponent.tsx`

```typescript
// Implement type-safe lazy loading
// - Create lazy-loaded components
// - Support dynamic imports
// - Enable code splitting
// - Maintain type safety for async components
```

**Requirements**:
- Create lazy loading wrapper with proper typing
- Implement dynamic imports with type safety
- Add loading states for lazy components
- Create error boundaries for lazy loading
- Support preloading strategies
- Coordinate with backend authentication strategies

### Phase 5: Event-Driven Architecture & Advanced State Management (Low Priority)

This final phase implements event-driven patterns in Go and advanced state management in React for maximum scalability and maintainability.

#### Backend Implementation: Event-Driven Architecture

##### 5.1 Event Bus System
**File**: `internal/events/bus.go`

```go
// Implement decoupled event handling
// - Create Event interface
// - Implement EventBus for event management
// - Add event subscription and publishing
// - Support concurrent event handling
```

**Requirements**:
- Define `Event` interface with Type, Data, Timestamp methods
- Implement `EventBus` with subscription and publishing capabilities
- Support concurrent event handling with goroutines
- Add proper synchronization with mutexes
- Create specific event types: `ExpenseCreatedEvent`, `BudgetExceededEvent`

##### 5.2 Event Handlers
**File**: `internal/events/handlers.go`

```go
// Implement asynchronous event handlers
// - Create NotificationHandler for user notifications
// - Implement AuditHandler for audit logging
// - Add proper error handling in handlers
// - Support handler composition
```

**Requirements**:
- Implement `NotificationHandler` for user notifications
- Create `AuditHandler` for audit logging
- Add proper error handling and logging
- Support handler composition and chaining
- Integrate with existing notification and audit systems

#### Frontend Implementation: Advanced State Management

##### 5.3 Reducer Pattern with TypeScript
**File**: `web/src/reducers/appReducer.ts`

```typescript
// Implement type-safe reducer pattern
// - Create strongly typed reducers
// - Support action creators
// - Enable state transitions
// - Maintain type safety for complex state
```

**Requirements**:
- Create typed action creators
- Implement reducer with discriminated unions
- Add middleware support with typing
- Create selector functions with type safety
- Support async actions with proper typing
- Integrate with backend event system

##### 5.4 State Machines with TypeScript
**File**: `web/src/machines/formMachine.ts`

```typescript
// Implement type-safe state machines
// - Create finite state machines
// - Support state transitions
// - Enable event handling
// - Maintain type safety for complex flows
```

**Requirements**:
- Create state machine for form workflows
- Implement authentication flow machine
- Add navigation state machine
- Create data fetching state machine
- Support nested state machines
- Coordinate with backend event handlers

## Implementation Guidelines

### Cross-Phase Integration Standards
- Ensure backend and frontend patterns complement each other
- Maintain consistent error handling across both layers
- Use shared type definitions where possible
- Implement proper logging and monitoring for both sides

### Backend Code Quality Standards (Go)
- Follow Go best practices and idioms
- Use proper error handling with wrapped errors
- Implement comprehensive logging with structured logging
- Add proper context support for cancellation and timeouts
- Use meaningful variable and function names

### Frontend Code Quality Standards (TypeScript/React)
- Follow TypeScript best practices and strict mode
- Use proper type definitions and interfaces
- Implement comprehensive error boundaries
- Add proper prop validation and default props
- Use meaningful component and function names
- Follow React hooks best practices

### Testing Requirements
- Write unit tests for all new functions, methods, and components
- Test concurrent operations for race conditions
- Mock dependencies using interfaces
- Test error scenarios and edge cases
- Add integration tests for complex workflows
- Test TypeScript type safety with type checking

### Performance Considerations
- Use appropriate concurrency patterns in Go
- Implement proper resource cleanup
- Add timeouts for all operations
- Monitor goroutine usage and memory consumption
- Implement proper memoization with useMemo and useCallback
- Use React.memo for component optimization
- Implement code splitting and lazy loading

### Security Requirements
- Validate all inputs thoroughly
- Use proper authentication and authorization
- Implement secure session management
- Add rate limiting for concurrent operations
- Follow OWASP security guidelines
- Implement proper XSS protection
- Use secure authentication flows

### Documentation Requirements
- Add comprehensive comments for complex logic
- Document interface contracts clearly
- Provide usage examples in comments
- Update README.md with new features
- Add API documentation where applicable
- Add comprehensive JSDoc comments for components and hooks

## Integration Instructions

### Existing Code Integration
- Maintain backward compatibility with existing code
- Update existing service methods to use new patterns
- Integrate with existing repository layer
- Update HTTP handlers to use new service interfaces
- Preserve existing API contracts

### Configuration Updates
- Add configuration options for new features
- Support feature flags for gradual rollout
- Add environment-specific configurations
- Update Docker configurations if needed
- Add monitoring and logging configurations

### Database Schema Updates
- Add tables for background tasks if needed
- Create cache tables for storage providers
- Add audit log tables for event handling
- Update existing tables if required
- Add proper indexes for performance

## Expected Deliverables

### Code Files
- All Go source files with proper package structure
- All TypeScript source files with proper component structure
- Updated service layer with new patterns
- New validation and transformation packages
- Event handling system
- Storage abstraction layer
- Updated React components with new patterns
- New type definitions and interfaces
- Custom hooks and context providers
- Utility functions and type guards

### Tests
- Unit tests for all new functionality
- Integration tests for complex workflows
- Performance tests for concurrent operations and rendering
- Mock implementations for testing

### Documentation
- Updated README.md with new features
- API documentation for new endpoints
- Configuration documentation
- Usage examples and best practices
- Component storybook documentation

### Configuration
- Updated configuration files
- Environment variable documentation
- Docker configuration updates
- Monitoring and logging setup

## Success Criteria

### Performance Metrics
- 50% reduction in response times for data-heavy operations (Backend)
- 80% improvement in concurrent request handling (Backend)
- 90% reduction in blocking operations (Backend)
- 40% reduction in component render times (Frontend)
- 60% improvement in bundle size optimization (Frontend)
- 70% reduction in unnecessary re-renders (Frontend)

### Code Quality Metrics
- 100% test coverage for new patterns
- Zero race conditions in concurrent code
- 100% TypeScript type coverage
- Zero runtime type errors
- Improved error handling and recovery
- Better separation of concerns

### Maintainability Metrics
- Reduced coupling between components
- Improved testability through interfaces
- Better code organization and structure
- Enhanced developer experience

## Implementation Notes

### Phase Priority Order
1. **Phase 1** (Foundation): Establishes core patterns for immediate benefits
2. **Phase 2** (Functional & Components): Improves code quality and reusability
3. **Phase 3** (Interfaces & Types): Enhances flexibility and type safety
4. **Phase 4** (Strategy & Performance): Optimizes for scalability and efficiency
5. **Phase 5** (Events & State): Implements advanced patterns for complex scenarios

### Migration Strategy
- Implement patterns incrementally
- Maintain backward compatibility
- Use feature flags for gradual rollout
- Monitor performance and stability
- Rollback plan for each phase

### Testing Strategy
- Test each pattern in isolation
- Verify integration with existing code
- Performance testing for concurrent operations
- Load testing for new features
- Security testing for authentication and validation

## Additional Context

### Current Project Structure
```
├── cmd/webapp/           # Application entry point
├── internal/
│   ├── config/          # Configuration management
│   ├── db/             # Database layer
│   ├── domain/         # Business entities
│   ├── middleware/     # HTTP middleware
│   ├── observability/  # Logging, metrics
│   ├── repository/     # Data access layer
│   ├── security/       # Security utilities
│   ├── service/        # Business services
│   └── transport/      # HTTP handlers
├── web/                # React frontend
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── types/      # TypeScript type definitions
│   │   ├── utils/      # Utility functions
│   │   ├── context/    # React context providers
│   │   └── pages/      # Page components
│   ├── public/         # Static assets
│   └── package.json    # Frontend dependencies
├── deployments/        # Docker and deployment configs
└── docs/              # Documentation
```

### Dependencies
- **Backend**: Go 1.23.0+, Chi router, SQLite with GORM, structured logging with slog
- **Frontend**: React 18+, TypeScript 5.0+, Vite, Bootstrap, React Router, Jest and React Testing Library

### Development Environment
- Docker Compose for full-stack development
- Air for Go hot reloading
- Vite for React hot reloading
- Quality checks with golangci-lint and ESLint
- Testing with Go's testing package and Jest

This prompt provides comprehensive guidance for implementing the programming paradigms and design patterns in a coordinated, phase-based approach while maintaining the existing architecture and ensuring high code quality standards.
