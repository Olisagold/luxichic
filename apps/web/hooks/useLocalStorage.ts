import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted state for the prototype. Replace with API calls when the backend is ready.
 * Starts from `initial` on the server and first client render (so hydration matches),
 * then loads the stored value after mount and persists changes from then on.
 */
export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {

      /* ignore */}
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {

      /* storage full or unavailable */}
  }, [key, value, loaded]);

  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, set, loaded] as const;
}
