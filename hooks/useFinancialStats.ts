'use client';

import { useMemo, useState } from 'react';
import { computeFinancialStats, computeLoanReadiness } from '@/lib/financial';
import { FinancialStats, LoanReadinessIndicator, StellarTransaction } from '@/lib/types';

export function useFinancialStats(transactions: StellarTransaction[], currentBalance: number) {
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);

  const stats: FinancialStats = useMemo(
    () => computeFinancialStats(transactions, currentBalance, windowDays),
    [transactions, currentBalance, windowDays],
  );

  const loanReadiness: LoanReadinessIndicator[] = useMemo(() => computeLoanReadiness(stats), [stats]);

  return { stats, loanReadiness, windowDays, setWindowDays };
}
