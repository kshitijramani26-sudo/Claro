/**
 * Tiny data hook for the api.ts seam: { data, loading, error, reload }.
 * Re-fetches when the store's refreshKey bumps (after any mutation) so
 * stock/balances/summary stay live after Create Bill, Settle Up, etc.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/state/store';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: readonly unknown[] = []): ApiState<T> {
  const refreshKey = useAppStore((s) => s.refreshKey);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetcher()
      .then((result) => {
        if (!cancelled && alive.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled && alive.current) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
