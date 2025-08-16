import { useState, useEffect, useCallback, useRef } from 'react';

// Hook return type
export type UseLocalStorageReturn<T> = [
  T | null,
  (value: T | null) => void,
  () => void
];

// Options for the hook
export type UseLocalStorageOptions<T> = {
  defaultValue?: T | null;
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  onError?: (error: Error) => void;
};

// Default serializer and deserializer
const defaultSerializer = <T>(value: T): string => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new Error(`Failed to serialize value: ${error}`);
  }
};

const defaultDeserializer = <T>(value: string): T => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Failed to deserialize value: ${error}`);
  }
};

// Main useLocalStorage hook
export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T> = {}
): UseLocalStorageReturn<T> {
  const {
    defaultValue = null,
    serializer = defaultSerializer,
    deserializer = defaultDeserializer,
    onError = console.error,
  } = options;

  const [storedValue, setStoredValue] = useState<T | null>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return deserializer(item);
    } catch (error) {
      onError(error as Error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T | null) => {
    try {
      if (value === null) {
        window.localStorage.removeItem(key);
        setStoredValue(null);
      } else {
        const serializedValue = serializer(value);
        window.localStorage.setItem(key, serializedValue);
        setStoredValue(value);
      }
    } catch (error) {
      onError(error as Error);
    }
  }, [key, serializer, onError]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(null);
    } catch (error) {
      onError(error as Error);
    }
  }, [key, onError]);

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(deserializer(e.newValue));
        } catch (error) {
          onError(error as Error);
        }
      } else if (e.key === key && e.newValue === null) {
        setStoredValue(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserializer, onError]);

  return [storedValue, setValue, removeValue];
}

// Hook for storing primitive values
export function useLocalStorageString(key: string, defaultValue: string = ''): UseLocalStorageReturn<string> {
  return useLocalStorage(key, {
    defaultValue,
    serializer: (value: string) => value,
    deserializer: (value: string) => value,
  });
}

export function useLocalStorageNumber(key: string, defaultValue: number = 0): UseLocalStorageReturn<number> {
  return useLocalStorage(key, {
    defaultValue,
    serializer: (value: number) => value.toString(),
    deserializer: (value: string) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    },
  });
}

export function useLocalStorageBoolean(key: string, defaultValue: boolean = false): UseLocalStorageReturn<boolean> {
  return useLocalStorage(key, {
    defaultValue,
    serializer: (value: boolean) => value.toString(),
    deserializer: (value: string) => value === 'true',
  });
}

// Hook for storing arrays
export function useLocalStorageArray<T>(
  key: string, 
  defaultValue: T[] = []
): UseLocalStorageReturn<T[]> {
  return useLocalStorage<T[]>(key, { defaultValue });
}

// Hook for storing objects
export function useLocalStorageObject<T extends Record<string, any>>(
  key: string, 
  defaultValue: T = {} as T
): UseLocalStorageReturn<T> {
  return useLocalStorage<T>(key, { defaultValue });
}

// Hook for storing with TTL (Time To Live)
export type UseLocalStorageTTLOptions<T> = UseLocalStorageOptions<T> & {
  ttl: number; // milliseconds
};

export function useLocalStorageTTL<T>(
  key: string,
  options: UseLocalStorageTTLOptions<T>
): UseLocalStorageReturn<T> {
  const { ttl, ...baseOptions } = options;
  
  const [storedValue, setStoredValue] = useState<T | null>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return baseOptions.defaultValue || null;
      }
      
      const parsed = JSON.parse(item);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        // Expired, remove it
        window.localStorage.removeItem(key);
        return baseOptions.defaultValue || null;
      }
      
      return parsed.value;
    } catch (error) {
      baseOptions.onError?.(error as Error);
      return baseOptions.defaultValue || null;
    }
  });

  const setValue = useCallback((value: T | null) => {
    try {
      if (value === null) {
        window.localStorage.removeItem(key);
        setStoredValue(null);
      } else {
        const expiresAt = Date.now() + ttl;
        const itemToStore = {
          value,
          expiresAt,
        };
        window.localStorage.setItem(key, JSON.stringify(itemToStore));
        setStoredValue(value);
      }
    } catch (error) {
      baseOptions.onError?.(error as Error);
    }
  }, [key, ttl, baseOptions.onError]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(null);
    } catch (error) {
      baseOptions.onError?.(error as Error);
    }
  }, [key, baseOptions.onError]);

  // Cleanup expired items on mount
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          window.localStorage.removeItem(key);
          setStoredValue(null);
        }
      }
    } catch (error) {
      baseOptions.onError?.(error as Error);
    }
  }, [key, baseOptions.onError]);

  return [storedValue, setValue, removeValue];
}

// Hook for managing multiple localStorage keys
export function useLocalStorageMulti<T extends Record<string, any>>(
  keys: (keyof T)[],
  defaultValues: Partial<T> = {}
): [
  T,
  (updates: Partial<T>) => void,
  (key: keyof T) => void,
  () => void
] {
  const [values, setValues] = useState<T>(() => {
    const initialValues: T = {} as T;
    
    keys.forEach(key => {
      try {
        const item = window.localStorage.getItem(String(key));
        if (item !== null) {
          initialValues[key] = JSON.parse(item);
        } else if (defaultValues[key] !== undefined) {
          initialValues[key] = defaultValues[key]!;
        }
      } catch (error) {
        console.error(`Failed to load localStorage key: ${String(key)}`, error);
        if (defaultValues[key] !== undefined) {
          initialValues[key] = defaultValues[key]!;
        }
      }
    });
    
    return initialValues;
  });

  const updateValues = useCallback((updates: Partial<T>) => {
    const newValues = { ...values, ...updates };
    
    Object.entries(updates).forEach(([key, value]) => {
      try {
        if (value === null || value === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch (error) {
        console.error(`Failed to update localStorage key: ${key}`, error);
      }
    });
    
    setValues(newValues);
  }, [values]);

  const removeValue = useCallback((key: keyof T) => {
    try {
      window.localStorage.removeItem(String(key));
      setValues(prev => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
    } catch (error) {
      console.error(`Failed to remove localStorage key: ${String(key)}`, error);
    }
  }, []);

  const clearAll = useCallback(() => {
    keys.forEach(key => {
      try {
        window.localStorage.removeItem(String(key));
      } catch (error) {
        console.error(`Failed to clear localStorage key: ${String(key)}`, error);
      }
    });
    setValues({} as T);
  }, [keys]);

  return [values, updateValues, removeValue, clearAll];
}

// Utility hook for form persistence
export function useFormPersistence<T extends Record<string, any>>(
  formKey: string,
  defaultValues: T,
  options: {
    debounceMs?: number;
    includeFields?: (keyof T)[];
    excludeFields?: (keyof T)[];
  } = {}
): [
  T,
  (updates: Partial<T>) => void,
  () => void
] {
  const { debounceMs = 500, includeFields, excludeFields } = options;
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [values, setValues] = useLocalStorageObject<T>(formKey, defaultValues);
  
  const updateValues = useCallback((updates: Partial<T>) => {
    const newValues = { ...values, ...updates };
    
    // Filter fields if specified
    let filteredUpdates = updates;
    if (includeFields) {
      filteredUpdates = Object.keys(updates).reduce((acc, key) => {
        if (includeFields.includes(key as keyof T)) {
          acc[key as keyof T] = updates[key as keyof T]!;
        }
        return acc;
      }, {} as Partial<T>);
    }
    
    if (excludeFields) {
      filteredUpdates = Object.keys(filteredUpdates).reduce((acc, key) => {
        if (!excludeFields.includes(key as keyof T)) {
          acc[key as keyof T] = filteredUpdates[key as keyof T]!;
        }
        return acc;
      }, {} as Partial<T>);
    }
    
    // Debounce the localStorage update
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      const storageKey = `${formKey}_${Date.now()}`;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(filteredUpdates));
      } catch (error) {
        console.error('Failed to persist form data:', error);
      }
    }, debounceMs);
    
    setValues(newValues);
  }, [values, setValues, formKey, debounceMs, includeFields, excludeFields]);
  
  const resetForm = useCallback(() => {
    setValues(defaultValues);
  }, [setValues, defaultValues]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  return [values, updateValues, resetForm];
}