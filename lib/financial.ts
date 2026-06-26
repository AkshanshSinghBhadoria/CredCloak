import { FinancialStats, LoanReadinessIndicator, StellarTransaction } from '@/lib/types';

export function computeFinancialStats(
  transactions: StellarTransaction[],
  currentBalance: number,
  windowDays: 30 | 60 | 90,
): FinancialStats {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const windowTxs = transactions.filter((tx) => new Date(tx.createdAt) >= cutoff);
  const totalInflow = windowTxs
    .filter((tx) => tx.type === 'received')
    .reduce((sum, tx) => sum + Number.parseFloat(tx.amount), 0);
  const totalOutflow = windowTxs
    .filter((tx) => tx.type === 'sent')
    .reduce((sum, tx) => sum + Number.parseFloat(tx.amount), 0);
  const dtiRatio = totalInflow > 0 ? (totalOutflow / totalInflow) * 100 : 0;
  const netFlow = totalInflow - totalOutflow;
  const averageBalance = Math.max(0, currentBalance - netFlow / 2);
  const oldestTx = transactions[transactions.length - 1];
  const historyDays = oldestTx
    ? Math.floor((Date.now() - new Date(oldestTx.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return {
    averageBalance,
    totalInflow,
    totalOutflow,
    dtiRatio,
    transactionCount: windowTxs.length,
    historyDays,
    windowDays,
  };
}

export function computeLoanReadiness(stats: FinancialStats): LoanReadinessIndicator[] {
  return [
    {
      label: 'Average Balance',
      value: `${stats.averageBalance.toFixed(2)} XLM`,
      status: stats.averageBalance >= 100 ? 'pass' : stats.averageBalance >= 50 ? 'warn' : 'fail',
      threshold: '>= 100 XLM',
      description: 'Minimum average balance over the selected period',
    },
    {
      label: 'DTI Ratio',
      value: `${stats.dtiRatio.toFixed(1)}%`,
      status: stats.dtiRatio <= 35 ? 'pass' : stats.dtiRatio <= 50 ? 'warn' : 'fail',
      threshold: '<= 50%',
      description: 'Debt-to-Income: outflows divided by inflows. Lower is better.',
    },
    {
      label: 'History Length',
      value: `${stats.historyDays} days`,
      status: stats.historyDays >= 30 ? 'pass' : stats.historyDays >= 14 ? 'warn' : 'fail',
      threshold: '>= 30 days',
      description: 'Length of available on-chain transaction history',
    },
  ];
}

export function formatXLM(amount: number | string): string {
  return Number.parseFloat(amount.toString()).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function truncateHash(hash: string, chars = 8): string {
  if (!hash) return '';
  return `${hash.slice(0, chars)}...${hash.slice(-4)}`;
}
