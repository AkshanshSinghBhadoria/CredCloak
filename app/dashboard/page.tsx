'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { ContractPanel } from '@/components/ContractPanel';
import { EventFeed } from '@/components/EventFeed';
import { fetchActiveClaim, fetchTotalClaims, registerReadinessClaim } from '@/lib/contract';
import { ReadinessClaim, TxStatus } from '@/lib/types';
import { ZKProofPanel } from '@/components/ZKProofPanel';
import { LoanPoolPanel } from '@/components/LoanPoolPanel';
import { MobileNav } from '@/components/MobileNav';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'zk-loans', label: 'ZK Loans' },
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

  const [activeClaim, setActiveClaim] = useState<ReadinessClaim | null>(null);
  const [totalClaims, setTotalClaims] = useState<number | null>(null);
  const [isLoadingOnChain, setIsLoadingOnChain] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [explorerUrl, setExplorerUrl] = useState<string | undefined>(undefined);

  const loadOnChainData = useCallback(async () => {
    if (!walletState.address) return;
    setIsLoadingOnChain(true);
    try {
      const [total, active] = await Promise.all([
        fetchTotalClaims(),
        fetchActiveClaim(walletState.address),
      ]);
      setTotalClaims(total);
      setActiveClaim(active);
    } catch (err) {
      console.warn('Failed loading on-chain contract stats:', err);
    } finally {
      setIsLoadingOnChain(false);
    }
  }, [walletState.address]);

  useEffect(() => {
    loadOnChainData();
  }, [loadOnChainData]);

  const isAvgBalancePassing = stats.averageBalance >= 100;
  const isDtiPassing = stats.dtiRatio <= 50 && stats.dtiRatio >= 0;
  const thresholdsMet = isAvgBalancePassing && isDtiPassing;

  const hasActiveClaim = !!activeClaim && activeClaim.timestamp > 0;
  
  let cooldownDaysLeft = 0;
  if (hasActiveClaim && activeClaim) {
    const elapsedSeconds = Date.now() / 1000 - activeClaim.timestamp;
    const cooldownSeconds = 30 * 24 * 60 * 60;
    if (elapsedSeconds < cooldownSeconds) {
      cooldownDaysLeft = Math.ceil((cooldownSeconds - elapsedSeconds) / (24 * 60 * 60));
    }
  }

  const isClaimActive = hasActiveClaim && cooldownDaysLeft > 0;
  const isAccountEmpty = !walletState.balance || parseFloat(walletState.balance) === 0;
  const isRegisterDisabled = !walletState.isConnected || !walletState.address || (!thresholdsMet && !isAccountEmpty) || isClaimActive || txStatus === 'signing' || txStatus === 'submitting';

  const handleRegisterClaim = async () => {
    if (isAccountEmpty) {
      alert("Registration failed: Your wallet balance is 0 XLM. You cannot register a readiness claim with an empty account. Please fund your account using the Friendbot button to establish transaction history.");
      return;
    }

    if (!walletState.isConnected || !walletState.address || !thresholdsMet || isClaimActive) return;

    setTxStatus('signing');
    setErrorMessage(undefined);
    setTxHash(undefined);
    setExplorerUrl(undefined);

    try {
      const result = await registerReadinessClaim(
        walletState.address,
        stats,
        async (xdr) => {
          setTxStatus('signing');
          return await signTransaction(xdr);
        }
      );

      if (result.success) {
        setTxStatus('confirmed');
        setTxHash(result.txHash);
        setExplorerUrl(result.explorerUrl);
        await loadOnChainData();
      } else {
        setTxStatus('failed');
        setErrorMessage(result.errorMessage || 'Contract invocation failed.');
      }
    } catch (err: any) {
      setTxStatus('failed');
      setErrorMessage(err.message || 'An unexpected error occurred.');
    }
  };

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
    await loadOnChainData();
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
        </header>

        <div className="mx-auto max-w-7xl px-5 py-8 pb-24 lg:pb-8">
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
                <p className="mt-2 text-slate-400">Review your eligibility snapshots and claim registry status.</p>
              </div>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
                <Card className="p-6 flex flex-col justify-center items-center">
                  <DTIGauge dtiRatio={stats.dtiRatio} />
                </Card>
                <LoanReadinessSnapshot
                  indicators={loanReadiness}
                  onRegisterClick={handleRegisterClaim}
                  isRegisterDisabled={isRegisterDisabled}
                  isClaimActive={isClaimActive}
                  cooldownDaysLeft={cooldownDaysLeft}
                  onGenerateZKProofClick={() => setActiveTab('zk-loans')}
                />
              </div>
              <div>
                <ContractPanel
                  walletState={walletState}
                  stats={stats}
                  totalClaims={totalClaims}
                  activeClaim={activeClaim}
                  isLoadingStatus={isLoadingOnChain}
                  isClaimActive={isClaimActive}
                  cooldownDaysLeft={cooldownDaysLeft}
                  onRegister={handleRegisterClaim}
                  txStatus={txStatus}
                  thresholdsMet={thresholdsMet}
                />
              </div>
            </div>
          )}

          {activeTab === 'zk-loans' && (
            <div className="animate-rise space-y-6">
              <div>
                <h1 className="font-display text-4xl font-bold text-white">ZK Loans & Liquidity Pool</h1>
                <p className="mt-2 text-slate-400">Generate browser-based zero-knowledge proofs privately and request micro-loans.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <ZKProofPanel
                  stats={stats}
                  borrowerAddress={walletState.address}
                  signTransaction={signTransaction}
                  onProofVerified={loadOnChainData}
                  claimRegistered={hasActiveClaim}
                />
                <LoanPoolPanel
                  walletState={walletState}
                  signTransaction={signTransaction}
                  zkVerified={!!activeClaim?.zkVerified}
                  onLoanAction={refreshAfterSend}
                />
              </div>
              <div className="mt-6">
                <EventFeed />
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

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </main>
  );
}
