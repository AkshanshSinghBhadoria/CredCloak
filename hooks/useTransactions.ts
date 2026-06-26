'use client';

import { useEffect, useState } from 'react';
import { fetchTransactions } from '@/lib/horizon';
import { StellarTransaction } from '@/lib/types';

export function useTransactions(address: string | null) {
  const [transactions, setTransactions] = useState<StellarTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => {
    if (!address) {
      setTransactions([]);
      return;
    }

    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const txs = await fetchTransactions(address, 200);
        if (!active) return;
        setTransactions(txs);
        setLastFetched(new Date());
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load transactions.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [address]);

  return { transactions, isLoading, error, lastFetched };
}
