'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchTransactions } from '@/lib/horizon';
import { StellarTransaction } from '@/lib/types';

export function useTransactions(address: string | null) {
  const [transactions, setTransactions] = useState<StellarTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const load = useCallback(async (bypassCache = false) => {
    if (!address) {
      setTransactions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (bypassCache && typeof window !== 'undefined') {
        const cacheKey = `credcloak:txs:${address}:200`;
        window.sessionStorage.removeItem(cacheKey);
      }
      const txs = await fetchTransactions(address, 200);
      setTransactions(txs);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { transactions, isLoading, error, lastFetched, refresh };
}
