import React, { ComponentType } from 'react';
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
  className = '',
}) => (
  <div className={`d-flex flex-column align-items-center justify-content-center p-4 ${className}`}>
    <output className="spinner-border text-primary">
      <span className="visually-hidden">{text}</span>
    </output>
    <div className="mt-2 text-muted">{text}</div>
  </div>
);

// Error message component
const ErrorMessage: React.FC<{
  message: string;
  retry?: () => void;
  className?: string;
  showRetry?: boolean;
}> = ({ message, retry, className = '', showRetry = true }) => (
  <div className={`alert alert-danger ${className}`} role="alert">
    <div className="d-flex align-items-center">
      <i className="bi bi-exclamation-triangle-fill me-2"></i>
      <div className="flex-grow-1">
        <strong>Error:</strong> {message}
      </div>
    </div>
    {showRetry && retry && (
      <button className="btn btn-outline-danger btn-sm mt-2" onClick={retry}>
        <i className="bi bi-arrow-clockwise me-1" /> Retry
      </button>
    )}
  </div>
);

// withLoading HOC implementation
export function withLoading<P extends object>(
  Component: ComponentType<P & WithLoadingProps>
): ComponentType<WithLoadingComponentProps<P>> {
  const WithLoadingComponent: React.FC<WithLoadingComponentProps<P>> = (props) => {
    const {
      loading,
      error,
      retry,
      loadingText,
      errorText,
      showSpinner = true,
      showError = true,
      className = '',
      ..._componentProps
    } = props;

    // Show loading state
    if (loading && showSpinner) {
      return <LoadingSpinner text={loadingText} className={className} />;
    }

    // Show error state
    if (error && showError) {
      return <ErrorMessage message={errorText || error} retry={retry} className={className} />;
    }

    // Render the wrapped component
    return <Component {...(props as P & WithLoadingProps)} />;
  };

  // Set display name for debugging
  WithLoadingComponent.displayName = `withLoading(${Component.displayName || Component.name})`;

  return WithLoadingComponent;
}

// withLoadingState HOC that works with FetchState
export function withLoadingState<T, P extends object>(
  Component: ComponentType<P & { data: T }>
): ComponentType<P & { state: FetchState<T> }> {
  const WithLoadingStateComponent: React.FC<P & { state: FetchState<T> }> = (props) => {
    const { state, ..._componentProps } = props;

    // Show loading state
    if (state.status === 'loading') {
      return <LoadingSpinner text="Loading data..." />;
    }

    // Show error state
    if (state.status === 'error') {
      return <ErrorMessage message={state.error} retry={state.retry} showRetry={!!state.retry} />;
    }

    // Show success state with data
    if (state.status === 'success') {
      return <Component {...(_componentProps as P)} data={state.data} />;
    }

    // Show idle state
    return (
      <div className="d-flex flex-column align-items-center justify-content-center p-4">
        <div className="text-muted">No data loaded</div>
      </div>
    );
  };

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
  const { fallback: FallbackComponent, onError, resetOnPropsChange = true } = options;

  class WithErrorBoundaryClass extends React.Component<
    P,
    { hasError: boolean; error: Error | null }
  > {
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
            <button className="btn btn-outline-danger btn-sm" onClick={this.resetError}>
              Try Again
            </button>
          </div>
        );
      }

      return <Component {...this.props} />;
    }
  }

  // Set display name for debugging
  (WithErrorBoundaryClass as unknown as { displayName: string }).displayName =
    `withErrorBoundary(${Component.displayName || Component.name})`;

  return WithErrorBoundaryClass;
}

// withAuthentication HOC for protected components
export type WithAuthenticationProps = {
  isAuthenticated: boolean;
  user?: { roles?: string[] };
  loginRequired?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
};

export function withAuthentication<P extends object>(
  Component: ComponentType<P & WithAuthenticationProps>,
  options: {
    loginRequired?: boolean;
    requiredRoles?: string[];
    redirectTo?: string;
  } = {}
): ComponentType<P & WithAuthenticationProps> {
  const { loginRequired = true, requiredRoles = [], redirectTo = '/login' } = options;

  const WithAuthenticationComponent: React.FC<P & WithAuthenticationProps> = (props) => {
    const {
      isAuthenticated,
      user,
      loginRequired: propLoginRequired = loginRequired,
      requiredRoles: propRequiredRoles = requiredRoles,
      redirectTo: propRedirectTo = redirectTo,
      ...componentProps
    } = props;

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
      const hasRequiredRole = propRequiredRoles.some((role) => userRoles.includes(role));

      if (!hasRequiredRole) {
        return (
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Access Denied</h4>
            <p>You don&apos;t have permission to access this resource.</p>
          </div>
        );
      }
    }

    // Render the wrapped component
    return (
      <Component
        {...(componentProps as P)}
        isAuthenticated={isAuthenticated}
        user={user}
        loginRequired={propLoginRequired}
        requiredRoles={propRequiredRoles}
        redirectTo={propRedirectTo}
      />
    );
  };

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
): ComponentType<P & WithThemeProps> {
  const WithThemeComponent: React.FC<P> = (props) => {
    const [theme, setTheme] = React.useState<Theme>('light');
    const themeProps: WithThemeProps = {
      theme,
      setTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
    };
    return <Component {...props} {...themeProps} />;
  };
  WithThemeComponent.displayName = `withTheme(${Component.displayName || Component.name})`;
  return WithThemeComponent as unknown as ComponentType<P & WithThemeProps>;
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
): ComponentType<P & WithResponsiveProps> {
  const WithResponsiveComponent: React.FC<P> = (props) => {
    const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('lg');
    React.useEffect(() => {
      const handleResize = () => {
        const width = window.innerWidth;
        let newBreakpoint: Breakpoint;
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
      isLargeDesktop: breakpoint === 'xxl',
    };
    return <Component {...props} {...responsiveProps} />;
  };
  WithResponsiveComponent.displayName = `withResponsive(${Component.displayName || Component.name})`;
  return WithResponsiveComponent as unknown as ComponentType<P & WithResponsiveProps>;
}

// All HOCs are exported individually above
