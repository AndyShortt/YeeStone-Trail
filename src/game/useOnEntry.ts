import { useEffect, useRef } from "react";

/**
 * Runs `effect` once per distinct `key` value — StrictMode-safe (won't
 * double-fire on the dev double-mount) while still re-firing when `key`
 * genuinely changes (e.g. ski-day looping Thursday -> Friday -> Saturday
 * without unmounting).
 */
export function useOnEntry(effect: () => void, key: string | number = "once") {
  const lastKey = useRef<string | number | null>(null);

  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
