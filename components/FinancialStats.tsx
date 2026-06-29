'use client';

import { Card } from '@/components/ui/Card';
import { FinancialStats as FinancialStatsType } from '@/lib/types';
import { formatXLM } from '@/lib/financial';

export function FinancialStats({ stats, isLoading }: { stats: FinancialStatsType; isLoading: boolean }) {
  const cards = [
    { 
      label: `Avg Balance (${stats.windowDays} days)`, 
      value: `${formatXLM(stats.averageBalance)} XLM`, 
      meta: 'Live Horizon estimate',
      icon: (
        <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    { 
      label: `Total Inflow (${stats.windowDays} days)`, 
      value: `${formatXLM(stats.totalInflow)} XLM`, 
      meta: `${stats.transactionCount} window transactions`,
      icon: (
        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
        </svg>
      ),
    },
    { 
      label: `Total Outflow (${stats.windowDays} days)`, 
      value: `${formatXLM(stats.totalOutflow)} XLM`, 
      meta: 'Sent testnet XLM',
      icon: (
        <svg className="h-5 w-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13l-3 3m0 0l-3-3m3 3V8m0-5a9 9 0 110 18 9 9 0 010-18z" />
        </svg>
      ),
    },
    { 
      label: 'DTI Ratio', 
      value: `${stats.dtiRatio.toFixed(1)}%`, 
      meta: stats.dtiRatio <= 50 ? 'Healthy DTI Ratio' : 'DTI Needs attention',
      icon: (
        <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-8 sm:grid-cols-2 max-w-4xl mx-auto mt-10">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="p-6 h-[178px] flex flex-col justify-between bg-slate-900/60 border border-slate-900">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
                <div className="h-8 w-44 animate-pulse rounded bg-slate-700" />
              </div>
              <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-800" />
            </div>
            <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2 max-w-4xl mx-auto mt-10">
      {cards.map((card, index) => (
        <Card
          key={card.label}
          className="group relative overflow-hidden p-6 hover:scale-[1.02] hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-2xl transition-all duration-300 ease-out animate-rise bg-gradient-to-b from-slate-900/90 to-slate-950/95"
          style={{ animationDelay: `${index * 250}ms` }}
        >
          {/* Top highlight glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
              <p className="mt-4 break-words font-display text-3xl font-black text-white tracking-tight">{card.value}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-800/80 group-hover:border-indigo-500/30 transition-all duration-300 shadow-inner">
              {card.icon}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-900 flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {card.meta}
          </div>
        </Card>
      ))}
    </div>
  );
}
