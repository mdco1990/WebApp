// Advanced TypeScript utility types and conditional types
// This file provides comprehensive utility types for complex type scenarios

// Types imported from budget module for reference

// ============================================================================
// CONDITIONAL TYPES
// ============================================================================

// Conditional type for form field validation based on field type
export type FormFieldValidation<T, K extends keyof T> = T[K] extends string
  ? {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      custom?: (value: string) => boolean | string;
    }
  : T[K] extends number
    ? {
        required?: boolean;
        min?: number;
        max?: number;
        step?: number;
        custom?: (value: number) => boolean | string;
      }
    : T[K] extends boolean
      ? {
          required?: boolean;
          custom?: (value: boolean) => boolean | string;
        }
      : {
          required?: boolean;
          custom?: (value: T[K]) => boolean | string;
        };

// Conditional type for API response based on success status
export type ApiResponseConditional<T, S extends boolean> = S extends true
  ? {
      success: true;
      data: T;
      message: string;
      timestamp: string;
    }
  : {
      success: false;
      error: string;
      code: string;
      timestamp: string;
    };

// Conditional type for component props based on variant
export type ComponentPropsConditional<T, V extends string> = V extends 'loading'
  ? { loading: true; data?: never }
  : V extends 'error'
    ? { loading?: false; error: string; data?: never }
    : V extends 'success'
      ? { loading?: false; error?: never; data: T }
      : { loading?: boolean; error?: string; data?: T };

// Conditional type for form field rendering based on field type
export type FormFieldRenderer<T, K extends keyof T> = T[K] extends string
  ? 'input' | 'textarea' | 'select'
  : T[K] extends number
    ? 'input' | 'slider' | 'spinner'
    : T[K] extends boolean
      ? 'checkbox' | 'toggle' | 'radio'
      : T[K] extends Date
        ? 'date' | 'datetime' | 'time'
        : 'input';

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Make specific fields optional
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific fields required
export type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Make specific fields readonly
export type ReadonlyFields<T, K extends keyof T> = Omit<T, K> & Readonly<Pick<T, K>>;

// Extract function return type
export type ReturnType<T> = T extends (...args: unknown[]) => infer R ? R : never;

// Extract function parameters
export type Parameters<T> = T extends (...args: infer P) => unknown ? P : never;

// Extract promise type
export type PromiseType<T> = T extends Promise<infer U> ? U : never;

// Extract array element type
export type ArrayElement<T> = T extends Array<infer U> ? U : never;

// Extract object value types
export type ObjectValues<T> = T extends Record<string, infer V> ? V : never;

// Extract object key types
export type ObjectKeys<T> = T extends Record<infer K, unknown> ? K : never;

// Deep partial type (makes all nested properties optional)
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep required type (makes all nested properties required)
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Deep readonly type (makes all nested properties readonly)
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Deep mutable type (removes readonly from all nested properties)
export type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

// ============================================================================
// TYPE TRANSFORMATIONS
// ============================================================================

// Transform object keys
export type TransformKeys<T, U> = {
  [K in keyof T as U extends string ? U : never]: T[K];
};

// Transform object values
export type TransformValues<T, U> = {
  [K in keyof T]: U;
};

// Transform specific keys
export type TransformSpecificKeys<T, K extends keyof T, U> = {
  [P in keyof T]: P extends K ? U : T[P];
};

// Transform specific values
export type TransformSpecificValues<T, K extends keyof T, U> = {
  [P in keyof T]: P extends K ? U : T[P];
};

// ============================================================================
// TEMPLATE LITERAL TYPES
// ============================================================================

// CSS property values
export type CSSPropertyValue<T extends string> = T extends `${infer Value}px`
  ? `${Value}px`
  : T extends `${infer Value}%`
    ? `${Value}%`
    : T extends `${infer Value}em`
      ? `${Value}em`
      : T extends `${infer Value}rem`
        ? `${Value}rem`
        : T extends `${infer Value}vw`
          ? `${Value}vw`
          : T extends `${infer Value}vh`
            ? `${Value}vh`
            : T extends `${infer Value}deg`
              ? `${Value}deg`
              : T extends `${infer Value}ms`
                ? `${Value}ms`
                : T extends `${infer Value}s`
                  ? `${Value}s`
                  : T;

// API endpoint patterns
export type APIEndpoint<T extends string> = T extends `/api/${infer Resource}/${infer Action}`
  ? `/api/${Resource}/${Action}`
  : T extends `/api/${infer Resource}`
    ? `/api/${Resource}`
    : T extends `/api`
      ? `/api`
      : never;

// Route patterns
export type RoutePattern<T extends string> = T extends `/${infer Segment}/${infer Rest}`
  ? `/${Segment}/${RoutePattern<Rest>}`
  : T extends `/${infer Segment}`
    ? `/${Segment}`
    : T extends ``
      ? ``
      : never;

// ============================================================================
// ADVANCED UTILITY TYPES
// ============================================================================

// Extract nested property type
export type NestedProperty<T, P extends string> = P extends `${infer First}.${infer Rest}`
  ? First extends keyof T
    ? NestedProperty<T[First], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// Set nested property type
export type SetNestedProperty<T, P extends string, V> = P extends `${infer First}.${infer Rest}`
  ? First extends keyof T
    ? {
        [K in keyof T]: K extends First ? SetNestedProperty<T[K], Rest, V> : T[K];
      }
    : T
  : P extends keyof T
    ? {
        [K in keyof T]: K extends P ? V : T[K];
      }
    : T;

// Path to property type (simplified to avoid excessive depth)
export type PathToProperty<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// ============================================================================
// FORM-SPECIFIC UTILITY TYPES
// ============================================================================

// Form field state with validation
export type FormFieldState<T> = {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  validating: boolean;
};

// Form state with field states
export type FormStateWithFields<T> = {
  [K in keyof T]: FormFieldState<T[K]>;
} & {
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;
};

// Form validation schema
export type FormValidationSchema<T> = {
  [K in keyof T]?: FormFieldValidation<T, K>;
};

// Form field configuration
export type FormFieldConfig<T, K extends keyof T> = {
  key: K;
  label: string;
  type: FormFieldRenderer<T, K>;
  placeholder?: string;
  helpText?: string;
  validation?: FormFieldValidation<T, K>;
  options?: Array<{ value: T[K]; label: string }>;
  dependsOn?: keyof T;
  dependsOnValue?: unknown;
  disabled?: boolean;
  hidden?: boolean;
  defaultValue?: T[K];
  className?: string;
  style?: React.CSSProperties;
};

// ============================================================================
// API-SPECIFIC UTILITY TYPES
// ============================================================================

// API request configuration
export type APIRequestConfig<T = unknown> = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: T;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTime?: number;
};

// API response wrapper
export type APIResponseWrapper<T> = {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
  statusCode: number;
  headers?: Record<string, string>;
};

// API error response
export type APIErrorResponse = {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  statusCode: number;
};

// ============================================================================
// COMPONENT-SPECIFIC UTILITY TYPES
// ============================================================================

// Component props with common patterns
export type ComponentProps<T = unknown> = {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  'data-testid'?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
} & T;

// Component with loading state
export type LoadingComponentProps<T> = ComponentProps<{
  loading: boolean;
  error?: string;
  data?: T;
  onRetry?: () => void;
}>;

// Component with error boundary
export type ErrorBoundaryProps = ComponentProps<{
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: boolean;
}>;

// Component with theme support
export type ThemedComponentProps<T = Record<string, unknown>> = ComponentProps<T> & {
  theme?: 'light' | 'dark' | 'auto';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

// ============================================================================
// HOOK-SPECIFIC UTILITY TYPES
// ============================================================================

// Hook return type with loading and error states
export type HookReturnType<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (data: T) => void;
  reset: () => void;
};

// Hook with pagination
export type PaginatedHookReturnType<T> = HookReturnType<T[]> & {
  page: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
};

// Hook with infinite loading
export type InfiniteHookReturnType<T> = HookReturnType<T[]> & {
  pages: T[][];
  pageParams: unknown[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchNextPage: () => Promise<void>;
  fetchPreviousPage: () => Promise<void>;
};

// ============================================================================
// EVENT-SPECIFIC UTILITY TYPES
// ============================================================================

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;

// Form event handler
export type FormEventHandler<T = HTMLFormElement> = EventHandler<React.FormEvent<T>>;

// Input event handler
export type InputEventHandler<T = HTMLInputElement> = EventHandler<React.ChangeEvent<T>>;

// Click event handler
export type ClickEventHandler<T = HTMLElement> = EventHandler<React.MouseEvent<T>>;

// Keyboard event handler
export type KeyboardEventHandler<T = HTMLElement> = EventHandler<React.KeyboardEvent<T>>;

// ============================================================================
// VALIDATION UTILITY TYPES
// ============================================================================

// Validation rule types
export type ValidationRule<T = unknown> = {
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'min'
    | 'max'
    | 'pattern'
    | 'custom'
    | 'email'
    | 'url';
  value?: unknown;
  message: string;
  validator?: (value: T, formData?: unknown) => boolean | string;
};

// Validation result
export type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
};

// Field validation result
export type FieldValidationResult = {
  isValid: boolean;
  error?: string;
  warning?: string;
};

// ============================================================================
// STORAGE UTILITY TYPES
// ============================================================================

// Local storage key types
export type LocalStorageKey<T extends string | number | bigint | boolean | null | undefined> =
  `app_${string}_${T}`;

// Session storage key types
export type SessionStorageKey<T extends string | number | bigint | boolean | null | undefined> =
  `session_${string}_${T}`;

// Storage value types
export type StorageValue<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends object
        ? string // JSON stringified
        : never;

// Storage entry with metadata
export type StorageEntry<T> = {
  value: T;
  timestamp: number;
  expiresAt?: number;
  version: string;
  checksum: string;
};

// All utility types are exported individually above
