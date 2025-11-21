import { useState, useEffect } from 'react';

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
 * Custom hook for localStorage persistence (replaces GitHub Spark useKV)
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

  // Update localStorage when value changes
  useEffect(() => {
    try {
      // Use custom replacer to handle File objects
      window.localStorage.setItem(key, JSON.stringify(value, customReplacer));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
