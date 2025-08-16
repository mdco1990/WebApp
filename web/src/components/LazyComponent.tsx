import React, { Suspense, lazy, ComponentType, ReactNode, forwardRef, ForwardedRef } from 'react';

// Error boundary component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h3>Something went wrong</h3>
          <p>Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy component wrapper props
interface LazyComponentWrapperProps {
  component: ComponentType<Record<string, unknown>>;
  props: Record<string, unknown>;
  fallback?: ReactNode;
  errorBoundary?: ComponentType<ErrorBoundaryProps>;
  onError?: (error: Error) => void;
}

// Lazy component wrapper
const LazyComponentWrapper = forwardRef<unknown, LazyComponentWrapperProps>(
  ({ component: LazyComponent, props, fallback, errorBoundary: ErrorBoundaryComponent, onError }, ref) => {
    const ErrorBoundaryToUse = ErrorBoundaryComponent || ErrorBoundary;

    return (
      <ErrorBoundaryToUse onError={onError}>
        <Suspense fallback={fallback || <div>Loading...</div>}>
          <LazyComponent {...props} ref={ref} />
        </Suspense>
      </ErrorBoundaryToUse>
    );
  }
);

LazyComponentWrapper.displayName = 'LazyComponentWrapper';

// Hook for creating lazy components with error boundaries
export function useLazyComponent<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: ReactNode,
  errorBoundary?: ComponentType<ErrorBoundaryProps>
) {
  const LazyComponent = lazy(importFn) as unknown as ComponentType<Record<string, unknown>>;

  return React.useCallback(
    (props: T) => (
      <LazyComponentWrapper
        component={LazyComponent}
        props={props as Record<string, unknown>}
        fallback={fallback}
        errorBoundary={errorBoundary}
      />
    ),
    [LazyComponent, fallback, errorBoundary]
  );
}

// HOC for adding error boundaries to components
export function withErrorBoundary<T extends Record<string, unknown>>(
  Component: ComponentType<T>,
  fallback?: ReactNode,
  onError?: (error: Error) => void
) {
  return function ErrorBoundaryWrappedComponent(props: T) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Utility for creating lazy components with default error handling
export function createLazyComponent<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    fallback?: ReactNode;
    errorBoundary?: ComponentType<ErrorBoundaryProps>;
    onError?: (error: Error) => void;
  } = {}
) {
  const { fallback, errorBoundary, onError } = options;
  const LazyComponent = lazy(importFn) as unknown as ComponentType<Record<string, unknown>>;

  return function LazyComponentWithErrorBoundary(props: T) {
    return (
      <LazyComponentWrapper
        component={LazyComponent}
        props={props as Record<string, unknown>}
        fallback={fallback}
        errorBoundary={errorBoundary}
        onError={onError}
      />
    );
  };
}