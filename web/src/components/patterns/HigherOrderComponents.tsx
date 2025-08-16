import React, { Component, ComponentType, ReactNode, useState, useEffect, useCallback } from 'react';
import { Expense } from '../../types/budget';

// HOC for authentication
interface WithAuthProps {
  isAuthenticated: boolean;
  user: Record<string, unknown> | null;
  login: (credentials: Record<string, unknown>) => Promise<void>;
  logout: () => void;
}

export function withAuth<T extends WithAuthProps>(
  WrappedComponent: ComponentType<T>
): ComponentType<Omit<T, keyof WithAuthProps>> {
  return function AuthenticatedComponent(_props: Omit<T, keyof WithAuthProps>) {
    const [user, setUser] = useState<Record<string, unknown> | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkAuthStatus = useCallback(async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Verify token with backend
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('authToken');
          }
        } catch {
          // Auth check failed silently
        }
      }
      setLoading(false);
    }, []);

    useEffect(() => {
      // Check authentication status on mount
      checkAuthStatus();
    }, [checkAuthStatus]);

    const login = useCallback(async (credentials: Record<string, unknown>) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const { token, user: userData } = await response.json();
        localStorage.setItem('authToken', token);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        throw new Error('Login failed');
      }
    }, []);

    const logout = useCallback(() => {
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
    }, []);

    if (loading) {
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      return <div>Please log in to access this page.</div>;
    }

    return (
      <WrappedComponent
        {...(_props as T)}
        isAuthenticated={isAuthenticated}
        user={user}
        login={login}
        logout={logout}
      />
    );
  };
}

// HOC for error boundaries
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export function withErrorBoundary<T extends object>(
  WrappedComponent: ComponentType<T>,
  fallback?: ReactNode
) {
  return class ErrorBoundaryComponent extends Component<T, ErrorBoundaryState> {
    constructor(props: T) {
      super(props);
      this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      // Log error to monitoring service
      // logErrorToService(error, errorInfo);
      this.setState({ error, errorInfo });
    }

    render() {
      if (this.state.hasError) {
        if (fallback) {
          return fallback;
        }
        
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>Something went wrong.</h2>
            <details style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
              <br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
            <button onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}>
              Try again
            </button>
          </div>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  };
}

// HOC for loading states
interface WithLoadingProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function withLoading<T extends WithLoadingProps>(
  WrappedComponent: ComponentType<T>
): ComponentType<Omit<T, keyof WithLoadingProps>> {
  return function LoadingComponent(props: Omit<T, keyof WithLoadingProps>) {
    const [loading, setLoading] = useState(false);

    return (
      <WrappedComponent
        {...(props as T)}
        loading={loading}
        setLoading={setLoading}
      />
    );
  };
}

// HOC for data fetching
interface WithDataFetchingProps<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function withDataFetching<T>(
  url: string,
  options?: RequestInit
) {
  return function<P extends WithDataFetchingProps<T>>(
    WrappedComponent: ComponentType<P>
  ): ComponentType<Omit<P, keyof WithDataFetchingProps<T>>> {
    return function DataFetchingComponent(props: Omit<P, keyof WithDataFetchingProps<T>>) {
      const [data, setData] = useState<T | null>(null);
      const [loading, setLoading] = useState(true);
      const [_error, setError] = useState<string | null>(null);

      const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(url, options);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          setData(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        fetchData();
      }, [fetchData]);

      return (
        <WrappedComponent
          {...(props as P)}
          data={data}
          loading={loading}
          error={_error}
          refetch={fetchData}
        />
      );
    };
  };
}

// HOC for performance optimization (memoization)
export function withMemoization<T extends object>(
  WrappedComponent: ComponentType<T>,
  propsAreEqual?: (prevProps: T, nextProps: T) => boolean
) {
  return React.memo(WrappedComponent, propsAreEqual);
}

// HOC for logging
interface WithLoggingProps {
  log: (message: string, data?: unknown) => void;
}

export function withLogging<T extends WithLoggingProps>(
  WrappedComponent: ComponentType<T>
): ComponentType<Omit<T, keyof WithLoggingProps>> {
  return function LoggingComponent(props: Omit<T, keyof WithLoggingProps>) {
    const log = useCallback((_message: string, _data?: unknown) => {
      // In a real app, you might send this to a logging service
      // console.log(`[${WrappedComponent.name}] ${_message}`, _data);
    }, []);

    return (
      <WrappedComponent
        {...(props as T)}
        log={log}
      />
    );
  };
}

// HOC for analytics tracking
interface WithAnalyticsProps {
  track: (event: string, properties?: Record<string, unknown>) => void;
}

export function withAnalytics<T extends WithAnalyticsProps>(
  WrappedComponent: ComponentType<T>
): ComponentType<Omit<T, keyof WithAnalyticsProps>> {
  return function AnalyticsComponent(props: Omit<T, keyof WithAnalyticsProps>) {
    const track = useCallback((_event: string, _properties?: Record<string, unknown>) => {
      // In a real app, you would send this to your analytics service
      // console.log(`[Analytics] ${_event}`, _properties);
      
      // Example: Google Analytics
      // gtag('event', _event, _properties);
      
      // Example: Mixpanel
      // mixpanel.track(_event, _properties);
    }, []);

    return (
      <WrappedComponent
        {...(props as T)}
        track={track}
      />
    );
  };
}

// HOC for theme support
interface WithThemeProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function withTheme<T extends WithThemeProps>(
  WrappedComponent: ComponentType<T>
): ComponentType<Omit<T, keyof WithThemeProps>> {
  return function ThemeComponent(props: Omit<T, keyof WithThemeProps>) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const toggleTheme = useCallback(() => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
    }, []);

    useEffect(() => {
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
      <WrappedComponent
        {...(props as T)}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  };
}

// HOC for responsive design
interface WithResponsiveProps {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: 'mobile' | 'tablet' | 'desktop';
}

export function withResponsive<T extends WithResponsiveProps>(
  WrappedComponent: ComponentType<T>
): ComponentType<Omit<T, keyof WithResponsiveProps>> {
  return function ResponsiveComponent(props: Omit<T, keyof WithResponsiveProps>) {
    const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

    useEffect(() => {
      const handleResize = () => {
        const width = window.innerWidth;
        if (width < 768) {
          setScreenSize('mobile');
        } else if (width < 1024) {
          setScreenSize('tablet');
        } else {
          setScreenSize('desktop');
        }
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = screenSize === 'mobile';
    const isTablet = screenSize === 'tablet';
    const isDesktop = screenSize === 'desktop';

    return (
      <WrappedComponent
        {...(props as T)}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
        screenSize={screenSize}
      />
    );
  };
}

// HOC for form validation
interface WithValidationProps {
  validate: (data: Record<string, unknown>) => Record<string, string>;
  isValid: boolean;
  errors: Record<string, string>;
}

export function withValidation(
  validationSchema: (data: Record<string, unknown>) => Record<string, string>
) {
  return function<P extends WithValidationProps>(
    WrappedComponent: ComponentType<P>
  ): ComponentType<Omit<P, keyof WithValidationProps>> {
    return function ValidationComponent(props: Omit<P, keyof WithValidationProps>) {
      const [errors, setErrors] = useState<Record<string, string>>({});

      const validate = useCallback((data: Record<string, unknown>) => {
        const validationErrors = validationSchema(data);
        setErrors(validationErrors);
        return validationErrors;
      }, []);

      const isValid = Object.keys(errors).length === 0;

      return (
        <WrappedComponent
          {...(props as P)}
          validate={validate}
          isValid={isValid}
          errors={errors}
        />
      );
    };
  };
}

// HOC for caching
interface WithCacheProps<T> {
  cachedData: T | null;
  setCachedData: (data: T) => void;
  clearCache: () => void;
}

export function withCache<T>(
  cacheKey: string,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
) {
  return function<P extends WithCacheProps<T>>(
    WrappedComponent: ComponentType<P>
  ): ComponentType<Omit<P, keyof WithCacheProps<T>>> {
    return function CacheComponent(props: Omit<P, keyof WithCacheProps<T>>) {
      const [cachedData, setCachedDataState] = useState<T | null>(null);

      const setCachedData = useCallback((data: T) => {
        const cacheItem = {
          data,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
        setCachedDataState(data);
      }, []);

      const clearCache = useCallback(() => {
        localStorage.removeItem(cacheKey);
        setCachedDataState(null);
      }, []);

      useEffect(() => {
        // Load cached data on mount
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < ttl) {
              setCachedDataState(data);
            } else {
              clearCache();
            }
          } catch {
            clearCache();
          }
        }
      }, [clearCache]);

      return (
        <WrappedComponent
          {...(props as P)}
          cachedData={cachedData}
          setCachedData={setCachedData}
          clearCache={clearCache}
        />
      );
    };
  };
}

// Example usage components

interface ExpenseListProps {
  expenses: Expense[];
}

const ExpenseListComponent: React.FC<ExpenseListProps> = ({ 
  expenses
}) => {

  return (
    <div>
      <h2>Expenses</h2>
      {expenses?.map(expense => (
        <div key={expense.id}>
          {expense.description} - ${expense.amount_cents / 100}
        </div>
      ))}
    </div>
  );
};

// Compose multiple HOCs - simplified for type safety
export const EnhancedExpenseList = withErrorBoundary(ExpenseListComponent);

// HOC composition utility
export function composeHOCs<T extends Record<string, unknown>>(
  ...hocs: Array<(component: ComponentType<Record<string, unknown>>) => ComponentType<Record<string, unknown>>>
) {
  return function (component: ComponentType<T>): ComponentType<T> {
    return hocs.reduce((acc, hoc) => hoc(acc as ComponentType<Record<string, unknown>>), component as ComponentType<Record<string, unknown>>) as ComponentType<T>;
  };
}

// Example of using the composition utility - simplified
export const ComposedExpenseList = withErrorBoundary(ExpenseListComponent);