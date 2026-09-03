import { useCallback, useState } from "react";

type Updater<T> = T | ((prev: T) => T);

/** useState mirrored into localStorage. Read-once on mount; write on every set. */
export function useLocalStorage<T>(key: string, initial: T): [T, (next: Updater<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: Updater<T>) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch {
          /* storage full or unavailable — keep the in-memory value */
        }
        return v;
      });
    },
    [key],
  );

  return [value, set];
}
