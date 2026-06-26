'use client';

import { useEffect } from 'react';
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

export default function DashboardPage() {
  const router = useRouter();
  const { walletState, connect, disconnect, isConnecting, signTransaction, refreshBalance } = useWallet();
  const { transactions, isLoading, error, lastFetched } = useTransactions(walletState.address);
  const currentBalance = Number.parseFloat(walletState.balance ?? '0');
  const { stats, loanReadiness, windowDays, setWindowDays } = useFinancialStats(transactions, currentBalance);

  useEffect(() => {
    if (!walletState.isConnected) router.replace('/');
  }, [router, walletState.isConnected]);

  if (!walletState.isConnected || !walletState.address) return null;

  const refreshAfterSend = async () => {
    await refreshBalance();
    window.sessionStorage.removeItem(`credcloak:txs:${walletState.address}:200`);
    window.location.reload();
  };

  return (
    <main className="min-h-screen">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-cloak-border bg-cloak-panel/80 p-5 backdrop-blur-xl lg:block">
        <ShieldLogo connected />
        <nav className="mt-10 space-y-2 text-sm font-semibold text-slate-400">
          {['Overview', 'Transactions', 'Readiness', 'Send XLM'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="block rounded-lg px-3 py-2 hover:bg-slate-900 hover:text-white">
              {item}
            </a>
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
        </header>

        <section id="overview" className="mx-auto max-w-7xl px-5 py-8">
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

          <div id="readiness" className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
            <Card className="p-6">
              <DTIGauge dtiRatio={stats.dtiRatio} />
            </Card>
            <LoanReadinessSnapshot indicators={loanReadiness} />
          </div>
        </section>

        <section id="transactions" className="mx-auto max-w-7xl px-5 py-6">
          <TransactionHistory transactions={transactions} isLoading={isLoading} address={walletState.address} />
        </section>

        <section id="send-xlm" className="mx-auto max-w-3xl px-5 py-8 pb-16">
          <SendTransaction walletState={walletState} signTransaction={signTransaction} onSent={refreshAfterSend} />
        </section>
      </div>
    </main>
  );
}
