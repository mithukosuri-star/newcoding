import { useEffect, useState } from 'react';

/** State mirrored into localStorage so the library survives refreshes. */
export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // Ignore malformed data and fall back to the initial value.
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private mode / full storage: keep working in memory.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
