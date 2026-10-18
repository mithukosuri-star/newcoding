import { useEffect, useState } from 'react';

/**
 * State backed by localStorage. Falls back to the initial value when storage is
 * unavailable or holds invalid data.
 */
export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // Ignore malformed or inaccessible storage and use the default.
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be full or blocked; the app still works in memory.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
