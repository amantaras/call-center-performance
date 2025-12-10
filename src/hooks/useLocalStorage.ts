import { useState, useEffect, useCallback } from 'react';

/**
 * Custom JSON replacer to handle File objects and other non-serializable types
 */
function customReplacer(_key: string, value: any): any {
  // Skip File/Blob objects - they'll be restored from audioDataURL
  if (value instanceof File || value instanceof Blob) {
    return undefined;
  }
  return value;
}

/**
 * Custom event for cross-component localStorage sync within same tab
 */
const STORAGE_SYNC_EVENT = 'localStorage-sync';

/**
 * Custom hook for localStorage persistence (replaces GitHub Spark useKV)
 * Syncs across components in the same tab using custom events
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialize state with value from localStorage or default
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return defaultValue;
      }
      const parsed = JSON.parse(item);
      // If the stored value is an empty array and default is not empty, use default
      if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(defaultValue) && defaultValue.length > 0) {
        return defaultValue;
      }
      return parsed;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Custom setValue that also dispatches sync event
  const setValueWithSync = useCallback((newValue: React.SetStateAction<T>) => {
    setValue(prev => {
      const resolvedValue = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(prev) 
        : newValue;
      
      // Dispatch custom event for same-tab sync
      window.dispatchEvent(new CustomEvent(STORAGE_SYNC_EVENT, { 
        detail: { key, value: resolvedValue } 
      }));
      
      return resolvedValue;
    });
  }, [key]);

  // Update localStorage when value changes
  useEffect(() => {
    try {
      // Use custom replacer to handle File objects
      window.localStorage.setItem(key, JSON.stringify(value, customReplacer));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  // Listen for sync events from other components in same tab
  useEffect(() => {
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.key === key) {
        setValue(customEvent.detail.value);
      }
    };

    window.addEventListener(STORAGE_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(STORAGE_SYNC_EVENT, handleSync);
  }, [key]);

  return [value, setValueWithSync];
}
