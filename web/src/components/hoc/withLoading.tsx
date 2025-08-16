import React, { ComponentType, forwardRef, useImperativeHandle, useRef } from 'react';
import { FetchState } from '../../types/state';

// Props for the withLoading HOC
export type WithLoadingProps = {
  loading: boolean;
  error?: string;
  retry?: () => void;
  loadingText?: string;
  errorText?: string;
  showSpinner?: boolean;
  showError?: boolean;
  className?: string;
};

// Enhanced props that include loading state
export type WithLoadingComponentProps<P> = P & WithLoadingProps;

// HOC function type
export type WithLoadingHOC<P extends object> = (
  Component: ComponentType<P>
) => ComponentType<WithLoadingComponentProps<P>>;

// Loading spinner component
const LoadingSpinner: React.FC<{ text?: string; className?: string }> = ({ 
  text = 'Loading...', 
  className = '' 
}) => (
  <div className={`d-flex flex-column align-items-center justify-content-center p-4 ${className}`}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">{text}</span>
    </div>
    <div className="mt-2 text-muted">{text}</div>
  </div>
);

// Error message component
const ErrorMessage: React.FC<{ 
  message: string; 
  retry?: () => void; 
  className?: string;
  showRetry?: boolean;
}> = ({ 
  message, 
  retry, 
  className = '',
  showRetry = true
}) => (
  <div className={`alert alert-danger ${className}`} role="alert">
    <div className="d-flex align-items-center">
      <i className="bi bi-exclamation-triangle-fill me-2"></i>
      <div className="flex-grow-1">
        <strong>Error:</strong> {message}
      </div>
    </div>
    {showRetry && retry && (
      <button 
        className="btn btn-outline-danger btn-sm mt-2"
        onClick={retry}
      >
        <i className="bi bi-arrow-clockwise me-1"></i>
        Retry
      </button>
    )}
  </div>
);

// withLoading HOC implementation
export function withLoading<P extends object>(
  Component: ComponentType<P>
): ComponentType<WithLoadingComponentProps<P>> {
  const WithLoadingComponent = forwardRef<any, WithLoadingComponentProps<P>>((props, ref) => {
    const {
      loading,
      error,
      retry,
      loadingText,
      errorText,
      showSpinner = true,
      showError = true,
      className = '',
      ...componentProps
    } = props;

    // Forward ref to the wrapped component
    const componentRef = useRef<ComponentType<P>>(null);
    useImperativeHandle(ref, () => componentRef.current);

    // Show loading state
    if (loading && showSpinner) {
      return (
        <LoadingSpinner 
          text={loadingText} 
          className={className}
        />
      );
    }

    // Show error state
    if (error && showError) {
      return (
        <ErrorMessage 
          message={errorText || error} 
          retry={retry}
          className={className}
        />
      );
    }

    // Render the wrapped component
    return (
      <Component 
        {...(componentProps as P)} 
        ref={componentRef}
      />
    );
  });

  // Set display name for debugging
  WithLoadingComponent.displayName = `withLoading(${Component.displayName || Component.name})`;

  return WithLoadingComponent;
}

// withLoadingState HOC that works with FetchState
export function withLoadingState<T, P extends object>(
  Component: ComponentType<P & { data: T }>
): ComponentType<P & { state: FetchState<T> }> {
  const WithLoadingStateComponent = forwardRef<any, P & { state: FetchState<T> }>((props, ref) => {
    const { state, ...componentProps } = props;

    // Forward ref to the wrapped component
    const componentRef = useRef<ComponentType<P & { data: T }>>(null);
    useImperativeHandle(ref, () => componentRef.current);

    // Show loading state
    if (state.status === 'loading') {
      return <LoadingSpinner text="Loading data..." />;
    }

    // Show error state
    if (state.status === 'error') {
      return (
        <ErrorMessage 
          message={state.error} 
          retry={state.retry}
          showRetry={!!state.retry}
        />
      );
    }

    // Show success state with data
    if (state.status === 'success') {
      return (
        <Component 
          {...(componentProps as P)} 
          data={state.data}
          ref={componentRef}
        />
      );
    }

    // Show idle state
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-4">
        <div className="text-muted">No data loaded</div>
      </div>
    );
  });

  // Set display name for debugging
  WithLoadingStateComponent.displayName = `withLoadingState(${Component.displayName || Component.name})`;

  return WithLoadingStateComponent;
}

// withErrorBoundary HOC for error handling
export type WithErrorBoundaryProps = {
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
};

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryProps = {}
): ComponentType<P> {
  const {
    fallback: FallbackComponent,
    onError,
    resetOnPropsChange = true
  } = options;

  class WithErrorBoundaryClass extends React.Component<P, { hasError: boolean; error: Error | null }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      if (onError) {
        onError(error, errorInfo);
      }
    }

    componentDidUpdate(prevProps: P) {
      if (resetOnPropsChange && prevProps !== this.props) {
        this.setState({ hasError: false, error: null });
      }
    }

    resetError = () => {
      this.setState({ hasError: false, error: null });
    };

    render() {
      if (this.state.hasError) {
        if (FallbackComponent) {
          return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
        }

        return (
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Something went wrong</h4>
            <p>An error occurred while rendering this component.</p>
            <button 
              className="btn btn-outline-danger btn-sm"
              onClick={this.resetError}
            >
              Try Again
            </button>
          </div>
        );
      }

      return <Component {...this.props} />;
    }
  }

  // Set display name for debugging
  WithErrorBoundaryClass.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WithErrorBoundaryClass;
}

// withAuthentication HOC for protected components
export type WithAuthenticationProps = {
  isAuthenticated: boolean;
  user?: any;
  loginRequired?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
};

export function withAuthentication<P extends object>(
  Component: ComponentType<P>,
  options: {
    loginRequired?: boolean;
    requiredRoles?: string[];
    redirectTo?: string;
  } = {}
): ComponentType<P & WithAuthenticationProps> {
  const { loginRequired = true, requiredRoles = [], redirectTo = '/login' } = options;

  const WithAuthenticationComponent = forwardRef<any, P & WithAuthenticationProps>((props, ref) => {
    const { 
      isAuthenticated, 
      user, 
      loginRequired: propLoginRequired = loginRequired,
      requiredRoles: propRequiredRoles = requiredRoles,
      redirectTo: propRedirectTo = redirectTo,
      ...componentProps 
    } = props;

    // Forward ref to the wrapped component
    const componentRef = useRef<ComponentType<P>>(null);
    useImperativeHandle(ref, () => componentRef.current);

    // Check if authentication is required
    if (propLoginRequired && !isAuthenticated) {
      // In a real app, you would redirect here
      return (
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Authentication Required</h4>
          <p>Please log in to access this page.</p>
          <a href={propRedirectTo} className="btn btn-primary btn-sm">
            Go to Login
          </a>
        </div>
      );
    }

    // Check if user has required roles
    if (propRequiredRoles.length > 0 && user) {
      const userRoles = user.roles || [];
      const hasRequiredRole = propRequiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return (
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Access Denied</h4>
            <p>You don't have permission to access this resource.</p>
          </div>
        );
      }
    }

    // Render the wrapped component
    return (
      <Component 
        {...(componentProps as P)} 
        ref={componentRef}
      />
    );
  });

  // Set display name for debugging
  WithAuthenticationComponent.displayName = `withAuthentication(${Component.displayName || Component.name})`;

  return WithAuthenticationComponent;
}

// withTheme HOC for theme support
export type Theme = 'light' | 'dark' | 'auto';

export type WithThemeProps = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLight: boolean;
};

export function withTheme<P extends object>(
  Component: ComponentType<P & WithThemeProps>
): ComponentType<P> {
  const WithThemeComponent = forwardRef<any, P>((props, ref) => {
    const [theme, setTheme] = React.useState<Theme>('light');

    // Forward ref to the wrapped component
    const componentRef = useRef<ComponentType<P & WithThemeProps>>(null);
    useImperativeHandle(ref, () => componentRef.current);

    const themeProps: WithThemeProps = {
      theme,
      setTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light'
    };

    // Render the wrapped component with theme props
    return (
      <Component 
        {...props} 
        {...themeProps}
        ref={componentRef}
      />
    );
  });

  // Set display name for debugging
  WithThemeComponent.displayName = `withTheme(${Component.displayName || Component.name})`;

  return WithThemeComponent;
}

// withResponsive HOC for responsive behavior
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export type WithResponsiveProps = {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
};

export function withResponsive<P extends object>(
  Component: ComponentType<P & WithResponsiveProps>
): ComponentType<P> {
  const WithResponsiveComponent = forwardRef<any, P>((props, ref) => {
    const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('lg');

    // Forward ref to the wrapped component
    const componentRef = useRef<ComponentType<P & WithResponsiveProps>>(null);
    useImperativeHandle(ref, () => componentRef.current);

    React.useEffect(() => {
      const handleResize = () => {
        const width = window.innerWidth;
        let newBreakpoint: Breakpoint = 'lg';

        if (width < 576) newBreakpoint = 'xs';
        else if (width < 768) newBreakpoint = 'sm';
        else if (width < 992) newBreakpoint = 'md';
        else if (width < 1200) newBreakpoint = 'lg';
        else if (width < 1400) newBreakpoint = 'xl';
        else newBreakpoint = 'xxl';

        setBreakpoint(newBreakpoint);
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const responsiveProps: WithResponsiveProps = {
      breakpoint,
      isMobile: breakpoint === 'xs' || breakpoint === 'sm',
      isTablet: breakpoint === 'md',
      isDesktop: breakpoint === 'lg' || breakpoint === 'xl',
      isLargeDesktop: breakpoint === 'xxl'
    };

    // Render the wrapped component with responsive props
    return (
      <Component 
        {...props} 
        {...responsiveProps}
        ref={componentRef}
      />
    );
  });

  // Set display name for debugging
  WithResponsiveComponent.displayName = `withResponsive(${Component.displayName || Component.name})`;

  return WithResponsiveComponent;
}

// Export all HOCs
export {
  withLoading,
  withLoadingState,
  withErrorBoundary,
  withAuthentication,
  withTheme,
  withResponsive
};