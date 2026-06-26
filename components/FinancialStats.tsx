'use client';

import { Card } from '@/components/ui/Card';
import { FinancialStats as FinancialStatsType } from '@/lib/types';
import { formatXLM } from '@/lib/financial';

export function FinancialStats({ stats, isLoading }: { stats: FinancialStatsType; isLoading: boolean }) {
  const cards = [
    { label: `Avg Balance (${stats.windowDays} days)`, value: `${formatXLM(stats.averageBalance)} XLM`, meta: 'Live Horizon estimate' },
    { label: `Total Inflow (${stats.windowDays} days)`, value: `${formatXLM(stats.totalInflow)} XLM`, meta: `${stats.transactionCount} window transactions` },
    { label: `Total Outflow (${stats.windowDays} days)`, value: `${formatXLM(stats.totalOutflow)} XLM`, meta: 'Sent testnet XLM' },
    { label: 'DTI Ratio', value: `${stats.dtiRatio.toFixed(1)}%`, meta: stats.dtiRatio <= 50 ? 'Healthy' : 'Needs attention' },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-700" />
            <div className="mt-6 h-8 w-36 animate-pulse rounded bg-slate-700" />
            <div className="mt-5 h-3 w-24 animate-pulse rounded bg-slate-800" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-5 animate-rise">
          <p className="text-sm font-medium text-slate-400">{card.label}</p>
          <p className="mt-5 break-words font-display text-3xl font-bold text-white">{card.value}</p>
          <p className="mt-5 text-sm text-slate-400">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
            {card.meta}
          </p>
        </Card>
      ))}
    </div>
  );
}
