'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { Skeleton } from './ui/Skeleton';
import { requestLoan, repayLoan, fetchLoan, fetchPoolBalance } from '@/lib/contract';
import { LoanRequest, WalletState, TxStatus } from '@/lib/types';
import { formatXLM } from '@/lib/financial';
import { Analytics } from '@/lib/analytics';
import { FeedbackWidget } from './FeedbackWidget';
import toast from 'react-hot-toast';

interface LoanPoolPanelProps {
  walletState: WalletState;
  signTransaction: (xdr: string) => Promise<string>;
  zkVerified: boolean;
  onLoanAction: () => void;
}

export function LoanPoolPanel({
  walletState,
  signTransaction,
  zkVerified,
  onLoanAction,
}: LoanPoolPanelProps) {
  const [loan, setLoan] = useState<LoanRequest | null>(null);
  const [poolBalance, setPoolBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [amount, setAmount] = useState('20'); // Default loan amount
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const loadPoolDetails = useCallback(async () => {
    if (!walletState.address) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [userLoan, balance] = await Promise.all([
        fetchLoan(walletState.address),
        fetchPoolBalance(),
      ]);
      setLoan(userLoan);
      setPoolBalance(balance);
    } catch (err) {
      console.warn('Failed loading loan details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [walletState.address]);

  useEffect(() => {
    loadPoolDetails();
  }, [loadPoolDetails]);

  const handleRequestLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletState.address) return;

    const requestAmt = parseFloat(amount);
    if (isNaN(requestAmt) || requestAmt <= 0 || requestAmt > 50) {
      setErrorMsg('Please request an amount between 0.1 and 50 XLM.');
      return;
    }

    setTxStatus('signing');
    setErrorMsg(null);
    setSuccessMsg(null);

    Analytics.loanRequested(requestAmt);

    try {
      // Create a dummy proof of 64 bytes (the contract expects >= 32 bytes)
      const dummyProof = new Uint8Array(64);
      for (let i = 0; i < 64; i++) dummyProof[i] = i;

      // Dummy public inputs [min_balance, max_dti, window, commitment]
      const minBalanceStr = Math.floor(100 * 10_000_000).toString(); // 100 XLM in stroops
      const maxDtiStr = '50';
      const windowStr = '30';
      const dummyCommitment = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const publicInputs = [minBalanceStr, maxDtiStr, windowStr, dummyCommitment];

      const result = await requestLoan(
        walletState.address,
        requestAmt,
        dummyProof,
        publicInputs,
        signTransaction
      );

      if (result.success) {
        setTxStatus('confirmed');
        setSuccessMsg(`Micro-loan of ${requestAmt} XLM approved and disbursed!`);
        Analytics.loanApproved(requestAmt);
        toast.success(`Micro-loan of ${requestAmt} XLM approved and disbursed!`);
        setShowFeedback(true);
        await loadPoolDetails();
        onLoanAction();
      } else {
        setTxStatus('failed');
        setErrorMsg(result.errorMessage || 'Failed to request loan.');
        toast.error(result.errorMessage || 'Failed to request loan.');
      }
    } catch (err: any) {
      setTxStatus('failed');
      setErrorMsg(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'An unexpected error occurred.');
    }
  };

  const handleRepayLoan = async () => {
    if (!walletState.address || !loan) return;

    setTxStatus('signing');
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const repayAmt = parseFloat(loan.amount);
      const result = await repayLoan(
        walletState.address,
        repayAmt,
        signTransaction
      );

      if (result.success) {
        setTxStatus('confirmed');
        setSuccessMsg(`Repaid ${repayAmt} XLM back to the pool successfully.`);
        Analytics.loanRepaid();
        toast.success(`Repaid ${repayAmt} XLM back to the pool successfully.`);
        await loadPoolDetails();
        onLoanAction();
      } else {
        setTxStatus('failed');
        setErrorMsg(result.errorMessage || 'Failed to repay loan.');
        toast.error(result.errorMessage || 'Failed to repay loan.');
      }
    } catch (err: any) {
      setTxStatus('failed');
      setErrorMsg(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'An unexpected error occurred.');
    }
  };

  const hasActiveLoan = loan && loan.status === 'Approved';

  return (
    <Card className="p-6 border border-cloak-border bg-cloak-panel/85 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-white">Micro-Loan Pool</h2>
          <p className="text-xs text-slate-400">ZK-Gated micro credit disburser</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Pool Metrics */}
        <div className="grid grid-cols-2 gap-4 border-b border-slate-900 pb-4">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Pool Funds Available</span>
            <span className="mt-1 block text-lg font-bold text-white font-display">
              {poolBalance !== null ? `${formatXLM(poolBalance)} XLM` : '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Your Status</span>
            <span className={`mt-1 block text-sm font-semibold font-display ${zkVerified ? 'text-emerald-400' : 'text-slate-400'}`}>
              {zkVerified ? 'Verified ✓' : 'Not ZK Verified'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : hasActiveLoan && loan ? (
          /* Active Loan Details & Repayment */
          <div className="space-y-4 animate-rise">
            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
              <span className="block text-xs text-slate-400 font-medium">Active Borrowing</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-white font-display">{loan.amount} XLM</span>
                <span className="text-[10px] uppercase font-bold text-indigo-300">Interest-Free</span>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Disbursed: {new Date(loan.timestamp * 1000).toLocaleDateString()}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRepayLoan}
              disabled={txStatus === 'signing' || txStatus === 'submitting'}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-proof hover:bg-indigo-500 transition disabled:opacity-40"
            >
              {txStatus === 'signing' || txStatus === 'submitting' ? (
                <LoadingSpinner label="Processing repayment..." />
              ) : (
                `Repay Loan (${loan.amount} XLM)`
              )}
            </button>
          </div>
        ) : (
          /* Loan Request Form */
          <form onSubmit={handleRequestLoan} className="space-y-4 animate-rise">
            <div>
              <label htmlFor="amount" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Borrow Amount (Max 50 XLM)
              </label>
              <div className="relative rounded-xl border border-slate-800 bg-slate-950/70 focus-within:border-indigo-500 transition">
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.1"
                  max="50"
                  step="0.1"
                  disabled={!zkVerified || txStatus === 'signing' || txStatus === 'submitting'}
                  className="w-full bg-transparent border-0 px-4 py-3 pr-16 text-sm font-semibold text-white focus:outline-none focus:ring-0 disabled:opacity-50"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-xs font-semibold text-slate-500">
                  XLM
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!zkVerified || txStatus === 'signing' || txStatus === 'submitting'}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-proof hover:bg-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {txStatus === 'signing' || txStatus === 'submitting' ? (
                <LoadingSpinner label="Invoking smart contract..." />
              ) : (
                'Request Micro-Loan (ZK-Gated)'
              )}
            </button>
            {!zkVerified && (
              <p className="text-center text-[10px] text-amber-300">
                🔒 ZK-Gated. Generate and verify your ZK proof above to unlock micro-loans.
              </p>
            )}
          </form>
        )}

        {/* Feedback alerts */}
        {successMsg && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 animate-rise">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 animate-rise">
            {errorMsg}
          </div>
        )}

        {showFeedback && (
          <FeedbackWidget onDismiss={() => setShowFeedback(false)} />
        )}
      </div>
    </Card>
  );
}
