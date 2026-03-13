import { useState } from 'react'

/**
 * Hook to persist state in localStorage
 * @param key - The localStorage key
 * @param initialValue - The initial value if not in localStorage
 * @returns [value, setValue] - Current value and setter function
 */
export const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        return JSON.parse(item) as T
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error instanceof Error ? error.message : String(error))
    }

    return initialValue
  })

  const setValue = (value: T) => {
    try {
      setStoredValue(value)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error instanceof Error ? error.message : String(error))
    }
  }

  return [storedValue, setValue]
}
