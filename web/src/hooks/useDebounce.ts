import { useState, useEffect, useCallback, useRef } from 'react';

// Hook return type
export type UseDebounceReturn<T> = [T, (value: T) => void, T];

// Options for the hook
export type UseDebounceOptions = {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
};

// Main useDebounce hook
export function useDebounce<T>(
  value: T,
  delay: number = 500,
  options: Omit<UseDebounceOptions, 'delay'> = {}
): UseDebounceReturn<T> {
  const { leading = false, trailing = true, maxWait } = options;

  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastCallTimerRef = useRef<NodeJS.Timeout>();

  // Update debounced value
  const setDebouncedValueWithDelay = useCallback(
    (newValue: T) => {
      const now = Date.now();

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Clear maxWait timer
      if (lastCallTimerRef.current) {
        clearTimeout(lastCallTimerRef.current);
      }

      // Handle leading edge
      if (leading && now - lastCallTimeRef.current >= delay) {
        setDebouncedValue(newValue);
        lastCallTimeRef.current = now;
      }

      // Set timeout for trailing edge
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          setDebouncedValue(newValue);
          lastCallTimeRef.current = now;
        }, delay);
      }

      // Handle maxWait
      if (maxWait !== undefined) {
        lastCallTimerRef.current = setTimeout(() => {
          setDebouncedValue(newValue);
          lastCallTimeRef.current = now;
        }, maxWait);
      }
    },
    [delay, leading, trailing, maxWait]
  );

  // Update value immediately
  const setValueImmediately = useCallback((newValue: T) => {
    setDebouncedValue(newValue);
    lastCallTimeRef.current = Date.now();

    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (lastCallTimerRef.current) {
      clearTimeout(lastCallTimerRef.current);
    }
  }, []);

  // Update when value changes
  useEffect(() => {
    setDebouncedValueWithDelay(value);
  }, [value, setDebouncedValueWithDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (lastCallTimerRef.current) {
        clearTimeout(lastCallTimerRef.current);
      }
    };
  }, []);

  return [debouncedValue, setValueImmediately, value];
}

// Hook for debouncing function calls
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 500,
  options: UseDebounceOptions = {}
): T {
  const { leading = false, trailing = true, maxWait } = options;

  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastCallTimeRef = useRef<number>(0);
  const lastCallTimerRef = useRef<NodeJS.Timeout>();
  const argsRef = useRef<Parameters<T>>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;
      const now = Date.now();

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Clear maxWait timer
      if (lastCallTimerRef.current) {
        clearTimeout(lastCallTimerRef.current);
      }

      // Handle leading edge
      if (leading && now - lastCallTimeRef.current >= delay) {
        callback(...args);
        lastCallTimeRef.current = now;
      }

      // Set timeout for trailing edge
      if (trailing) {
        timeoutRef.current = setTimeout(() => {
          if (argsRef.current) {
            callback(...argsRef.current);
          }
          lastCallTimeRef.current = now;
        }, delay);
      }

      // Handle maxWait
      if (maxWait !== undefined) {
        lastCallTimerRef.current = setTimeout(() => {
          if (argsRef.current) {
            callback(...argsRef.current);
          }
          lastCallTimeRef.current = now;
        }, maxWait);
      }
    },
    [callback, delay, leading, trailing, maxWait]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (lastCallTimerRef.current) {
        clearTimeout(lastCallTimerRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

// Hook for debouncing search queries
export function useDebouncedSearch<T>(
  initialValue: T,
  delay: number = 300,
  options: {
    minLength?: number;
    onSearch?: (value: T) => void;
    onClear?: () => void;
  } = {}
): {
  value: T;
  debouncedValue: T;
  setValue: (value: T) => void;
  isSearching: boolean;
  clearSearch: () => void;
} {
  const { minLength = 0, onSearch, onClear } = options;

  const [value, setValue] = useState<T>(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedValue] = useDebounce(value, delay);

  // Handle search when debounced value changes
  useEffect(() => {
    if (debouncedValue !== undefined && debouncedValue !== null) {
      const stringValue = String(debouncedValue);

      if (stringValue.length >= minLength) {
        setIsSearching(true);
        onSearch?.(debouncedValue);
        setIsSearching(false);
      } else if (stringValue.length === 0) {
        onClear?.();
      }
    }
  }, [debouncedValue, minLength, onSearch, onClear]);

  const clearSearch = useCallback(() => {
    setValue(initialValue);
    onClear?.();
  }, [initialValue, onClear]);

  return {
    value,
    debouncedValue,
    setValue,
    isSearching,
    clearSearch,
  };
}

// Hook for debouncing form inputs
export function useDebouncedInput<T>(
  initialValue: T,
  delay: number = 500,
  options: {
    validate?: (value: T) => boolean | string;
    onValidChange?: (value: T) => void;
    onInvalidChange?: (value: T, error: string) => void;
  } = {}
): {
  value: T;
  debouncedValue: T;
  setValue: (value: T) => void;
  isValid: boolean;
  error: string | null;
  isDirty: boolean;
} {
  const { validate, onValidChange, onInvalidChange } = options;

  const [value, setValue] = useState<T>(initialValue);
  const [isDirty, setIsDirty] = useState(false);
  const [debouncedValue] = useDebounce(value, delay);

  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate when debounced value changes
  useEffect(() => {
    if (debouncedValue !== undefined && debouncedValue !== null) {
      if (validate) {
        const validationResult = validate(debouncedValue);

        if (validationResult === true) {
          setIsValid(true);
          setError(null);
          onValidChange?.(debouncedValue);
        } else {
          setIsValid(false);
          setError(typeof validationResult === 'string' ? validationResult : 'Invalid value');
          onInvalidChange?.(
            debouncedValue,
            typeof validationResult === 'string' ? validationResult : 'Invalid value'
          );
        }
      } else {
        setIsValid(true);
        setError(null);
        onValidChange?.(debouncedValue);
      }
    }
  }, [debouncedValue, validate, onValidChange, onInvalidChange]);

  const handleSetValue = useCallback((newValue: T) => {
    setValue(newValue);
    setIsDirty(true);
  }, []);

  return {
    value,
    debouncedValue,
    setValue: handleSetValue,
    isValid,
    error,
    isDirty,
  };
}

// Hook for debouncing scroll events
export function useDebouncedScroll(
  delay: number = 100,
  options: {
    onScroll?: (event: Event) => void;
    onScrollStart?: () => void;
    onScrollEnd?: () => void;
  } = {}
): {
  isScrolling: boolean;
  scrollTop: number;
  scrollLeft: number;
} {
  const { onScroll, onScrollStart, onScrollEnd } = options;

  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useDebouncedCallback((...args: unknown[]) => {
    const event = args[0];
    if (event && typeof event === 'object' && 'target' in event) {
      const target = (event as Event).target as Element;
      setScrollTop(target.scrollTop);
      setScrollLeft(target.scrollLeft);
      onScroll?.(event as Event);
    }
  }, delay);

  const handleScrollStart = useCallback(() => {
    setIsScrolling(true);
    onScrollStart?.();
  }, [onScrollStart]);

  const handleScrollEnd = useCallback(() => {
    setIsScrolling(false);
    onScrollEnd?.();
  }, [onScrollEnd]);

  // Extracted scroll handler to reduce cognitive complexity
  const handleScrollWithTiming = useCallback(
    (event: Event) => {
      handleScrollWithTimingImpl(
        event,
        isScrolling,
        handleScrollStart,
        handleScroll,
        timeoutRef,
        handleScrollEnd,
        delay
      );
    },
    [isScrolling, handleScroll, handleScrollStart, handleScrollEnd, delay]
  );

  // Helper function to reduce cognitive complexity
  function handleScrollWithTimingImpl(
    event: Event,
    isScrolling: boolean,
    handleScrollStart: () => void,
    handleScroll: (event: Event) => void,
    timeoutRef: React.MutableRefObject<NodeJS.Timeout | undefined>,
    handleScrollEnd: () => void,
    delay: number
  ) {
    if (!isScrolling) {
      handleScrollStart();
    }

    handleScroll(event);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to mark scroll as ended
    timeoutRef.current = setTimeout(() => {
      handleScrollEnd();
    }, delay + 50); // Add small buffer
  }

  // Set up scroll listeners
  useEffect(() => {
    window.addEventListener('scroll', handleScrollWithTiming, { passive: true });
    document.addEventListener('scroll', handleScrollWithTiming, { passive: true });

    const timeout = timeoutRef.current;
    return () => {
      window.removeEventListener('scroll', handleScrollWithTiming);
      document.removeEventListener('scroll', handleScrollWithTiming);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [handleScrollWithTiming]);

  return {
    isScrolling,
    scrollTop,
    scrollLeft,
  };
}

// Hook for debouncing resize events
export function useDebouncedResize(
  delay: number = 250,
  options: {
    onResize?: (dimensions: { width: number; height: number }) => void;
    onResizeStart?: () => void;
    onResizeEnd?: () => void;
  } = {}
): {
  isResizing: boolean;
  width: number;
  height: number;
} {
  const { onResize, onResizeStart, onResizeEnd } = options;

  const [isResizing, setIsResizing] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleResize = useDebouncedCallback((..._args: unknown[]) => {
    // Optionally use event if needed: const event = args[0];
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;

    setWidth(newWidth);
    setHeight(newHeight);
    onResize?.({ width: newWidth, height: newHeight });
  }, delay);

  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    onResizeStart?.();
  }, [onResizeStart]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    onResizeEnd?.();
  }, [onResizeEnd]);

  // Set up resize listener
  useEffect(() => {
    const handleResizeWithTiming = (event: Event) => {
      if (!isResizing) {
        handleResizeStart();
      }

      handleResize(event);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to mark resize as ended
      timeoutRef.current = setTimeout(() => {
        handleResizeEnd();
      }, delay + 50); // Add small buffer
    };

    window.addEventListener('resize', handleResizeWithTiming, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResizeWithTiming);
      const timeout = timeoutRef.current;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [handleResize, handleResizeStart, handleResizeEnd, isResizing, delay]);

  return {
    isResizing,
    width,
    height,
  };
}
