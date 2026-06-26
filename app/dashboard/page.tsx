'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DTIGauge } from '@/components/DTIGauge';
import { FinancialStats } from '@/components/FinancialStats';
import { LoanReadinessSnapshot } from '@/components/LoanReadinessSnapshot';
import { SendTransaction } from '@/components/SendTransaction';
import { ShieldLogo } from '@/components/ShieldLogo';
import { TransactionHistory } from '@/components/TransactionHistory';
import { WalletConnect } from '@/components/WalletConnect';
import { useFinancialStats } from '@/hooks/useFinancialStats';
import { useTransactions } from '@/hooks/useTransactions';
import { useWallet } from '@/hooks/useWallet';
import { formatXLM, truncateAddress } from '@/lib/financial';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'send-xlm', label: 'Send XLM' },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const { walletState, connect, disconnect, isConnecting, signTransaction, refreshBalance } = useWallet();
  const { transactions, isLoading, error, lastFetched, refresh: refreshTransactions } = useTransactions(walletState.address);
  const currentBalance = Number.parseFloat(walletState.balance ?? '0');
  const { stats, loanReadiness, windowDays, setWindowDays } = useFinancialStats(transactions, currentBalance);

  const [activeTab, setActiveTab] = useState<typeof tabs[number]['id']>('overview');

  useEffect(() => {
    if (!walletState.isConnected) router.replace('/');
  }, [router, walletState.isConnected]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveTab((current) => {
          const index = tabs.findIndex((t) => t.id === current);
          const nextIndex = (index + 1) % tabs.length;
          return tabs[nextIndex].id;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveTab((current) => {
          const index = tabs.findIndex((t) => t.id === current);
          const prevIndex = (index - 1 + tabs.length) % tabs.length;
          return tabs[prevIndex].id;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!walletState.isConnected || !walletState.address) return null;

  const refreshAfterSend = async () => {
    await refreshBalance();
    await refreshTransactions();
  };

  return (
    <main className="min-h-screen">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-cloak-border bg-cloak-panel/80 p-5 backdrop-blur-xl lg:block">
        <ShieldLogo connected />
        <nav className="mt-10 space-y-2 text-sm font-semibold">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`block w-full text-left rounded-lg px-3 py-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-indigo-600/20 text-indigo-200 border-l-2 border-indigo-500'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          Stellar Testnet only. Never send mainnet funds here.
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-cloak-border bg-cloak-bg/75 px-5 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="lg:hidden"><ShieldLogo connected /></div>
            <div className="hidden lg:block">
              <p className="text-sm text-slate-400">Connected wallet</p>
              <p className="font-mono text-indigo-300" title={walletState.address}>{truncateAddress(walletState.address, 8)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="amber">Testnet</Badge>
              <WalletConnect walletState={walletState} connect={connect} disconnect={disconnect} isConnecting={isConnecting} redirectOnConnect={false} />
            </div>
          </div>
          
          {/* Mobile Navigation Tabs */}
          <div className="mt-4 flex overflow-x-auto gap-2 border-t border-slate-800/55 pt-3 lg:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-8">
          {activeTab === 'overview' && (
            <div className="animate-rise space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div>
                  <h1 className="font-display text-4xl font-bold text-white">Financial Health Dashboard</h1>
                  <p className="mt-2 text-slate-400">
                    Balance: <span className="font-display text-xl font-bold text-white">{formatXLM(currentBalance)} XLM</span>
                    {lastFetched && <span className="ml-3 text-xs">Updated {lastFetched.toLocaleTimeString()}</span>}
                  </p>
                </div>
                <div className="flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
                  {([30, 60, 90] as const).map((days) => (
                    <button
                      type="button"
                      key={days}
                      onClick={() => setWindowDays(days)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${windowDays === days ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

              <div className="mt-6">
                <FinancialStats stats={stats} isLoading={isLoading} />
              </div>
            </div>
          )}

          {activeTab === 'readiness' && (
            <div className="animate-rise space-y-6">
              <div>
                <h1 className="font-display text-4xl font-bold text-white">Loan Readiness</h1>
                <p className="mt-2 text-slate-400">DTI ratio and balance analysis projections.</p>
              </div>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
                <Card className="p-6">
                  <DTIGauge dtiRatio={stats.dtiRatio} />
                </Card>
                <LoanReadinessSnapshot indicators={loanReadiness} />
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="animate-rise">
              <TransactionHistory transactions={transactions} isLoading={isLoading} address={walletState.address} onFunded={refreshAfterSend} />
            </div>
          )}

          {activeTab === 'send-xlm' && (
            <div className="animate-rise max-w-3xl mx-auto">
              <div className="mb-6">
                <h1 className="font-display text-4xl font-bold text-white">Send XLM</h1>
                <p className="mt-2 text-slate-400">Transfer testnet XLM funds securely.</p>
              </div>
              <SendTransaction walletState={walletState} signTransaction={signTransaction} onSent={refreshAfterSend} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
