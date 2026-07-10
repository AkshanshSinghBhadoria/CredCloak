'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { WalletConnect } from './WalletConnect';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions } from '@/hooks/useTransactions';
import { useFinancialStats } from '@/hooks/useFinancialStats';
import { useZKProof } from '@/hooks/useZKProof';
import { registerReadinessClaim, upgradeClaimToZKVerified, requestLoan } from '@/lib/contract';
import toast from 'react-hot-toast';

const steps = [
  { id: 1, label: 'Connect Wallet' },
  { id: 2, label: 'Fund Account' },
  { id: 3, label: 'Register Claim' },
  { id: 4, label: 'Generate ZK Proof' },
  { id: 5, label: 'Request Micro-Loan' },
] as const;

export function OnboardingFlow() {
  const router = useRouter();
  const { walletState, connect, disconnect, isConnecting, signTransaction, refreshBalance } = useWallet();
  const { transactions, refresh: refreshTransactions } = useTransactions(walletState.address);
  const currentBalance = Number.parseFloat(walletState.balance ?? '0');
  const { stats } = useFinancialStats(transactions, currentBalance);
  const { step: zkStep, proof, error: zkError, generate, reset: resetZk } = useZKProof();

  const [step, setStep] = useState(1);
  const [isFunding, setIsFunding] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [isRequestingLoan, setIsRequestingLoan] = useState(false);
  const [loanTxUrl, setLoanTxUrl] = useState<string | null>(null);

  const isAccountFunded = currentBalance > 0;

  const handleFund = async () => {
    if (!walletState.address) return;
    setIsFunding(true);
    try {
      const response = await fetch(`https://friendbot.stellar.org/?addr=${walletState.address}`);
      if (!response.ok) throw new Error(`Friendbot failed with status ${response.status}`);
      await refreshBalance();
      await refreshTransactions();
      toast.success('Testnet account funded with 10,000 XLM.');
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Friendbot funding failed. Try the manual link below.');
    } finally {
      setIsFunding(false);
    }
  };

  const handleRegisterClaim = async () => {
    if (!walletState.address) return;
    setIsRegistering(true);
    try {
      const result = await registerReadinessClaim(walletState.address, stats, signTransaction);
      if (result.success) {
        toast.success('Readiness claim registered on-chain.');
        setStep(4);
      } else {
        toast.error(result.errorMessage || 'Failed to register claim.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGenerateAndSubmitProof = async () => {
    if (!walletState.address) return;
    const minBalance = Number(process.env.NEXT_PUBLIC_ZK_MIN_BALANCE_XLM || 100);
    const maxDti = Number(process.env.NEXT_PUBLIC_ZK_MAX_DTI_PERCENT || 50);
    await generate(stats, walletState.address, { minBalance, maxDti });
  };

  const handleSubmitProof = async () => {
    if (!proof || !walletState.address) return;
    setIsSubmittingProof(true);
    try {
      const result = await upgradeClaimToZKVerified(walletState.address, proof.proofBytes, signTransaction);
      if (result.success) {
        toast.success('ZK proof verified on-chain.');
        setStep(5);
      } else {
        toast.error(result.errorMessage || 'Failed to submit proof.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleRequestLoan = async () => {
    if (!walletState.address) return;
    setIsRequestingLoan(true);
    try {
      const dummyProof = new Uint8Array(64);
      for (let i = 0; i < 64; i++) dummyProof[i] = i;
      const minBalanceStr = Math.floor(100 * 10_000_000).toString();
      const publicInputs = [minBalanceStr, '50', '30', '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'];

      const result = await requestLoan(walletState.address, 20, dummyProof, publicInputs, signTransaction);
      if (result.success) {
        setLoanTxUrl(result.explorerUrl ?? null);
        toast.success('Micro-loan of 20 XLM approved and disbursed!');
      } else {
        toast.error(result.errorMessage || 'Failed to request loan.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setIsRequestingLoan(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="mb-8 text-center">
        <Badge tone="indigo">Level 4 Onboarding</Badge>
        <h1 className="mt-4 font-display text-4xl font-bold text-white">Get Started with CredCloak</h1>
        <p className="mt-2 text-slate-400">A guided 5-step walkthrough from wallet connect to your first micro-loan.</p>
      </div>

      <div className="mb-8 flex items-center justify-between">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex flex-1 items-center">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {step > s.id ? '✓' : s.id}
            </div>
            {idx < steps.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-800'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        Step {step} of {steps.length}: {steps[step - 1].label}
      </p>

      <Card className="p-6">
        {step === 1 && (
          <div className="space-y-4 text-center">
            <p className="text-slate-300">Connect a Stellar testnet wallet (Freighter, Albedo, xBull, or Lobstr) to begin.</p>
            <div className="flex justify-center">
              <WalletConnect walletState={walletState} connect={connect} disconnect={disconnect} isConnecting={isConnecting} redirectOnConnect={false} />
            </div>
            {walletState.isConnected && (
              <button
                type="button"
                onClick={() => setStep(isAccountFunded ? 3 : 2)}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 transition"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 text-center">
            <p className="text-slate-300">Fund your testnet wallet with Friendbot to establish an on-chain transaction history.</p>
            <button
              type="button"
              onClick={handleFund}
              disabled={isFunding}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-40"
            >
              {isFunding ? <LoadingSpinner label="Funding..." /> : 'Fund Account Automatically'}
            </button>
            <a
              href={`https://laboratory.stellar.org/#create-account?addr=${walletState.address}`}
              target="_blank"
              rel="noreferrer"
              className="block text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              Manual Funding (Stellar Lab) ↗
            </a>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <p className="text-slate-300">Register your loan readiness claim on-chain based on your Stellar wallet history.</p>
            <button
              type="button"
              onClick={handleRegisterClaim}
              disabled={isRegistering}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-40"
            >
              {isRegistering ? <LoadingSpinner label="Registering..." /> : 'Register Readiness Claim'}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center">
            <p className="text-slate-300">Generate a zero-knowledge proof of your financial readiness, entirely in your browser.</p>
            {zkStep === 'idle' && (
              <button
                type="button"
                onClick={handleGenerateAndSubmitProof}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500 transition"
              >
                Generate ZK Proof
              </button>
            )}
            {(zkStep === 'computing_inputs' || zkStep === 'generating_proof') && (
              <LoadingSpinner label="Generating proof in browser..." />
            )}
            {zkStep === 'proof_ready' && (
              <button
                type="button"
                onClick={handleSubmitProof}
                disabled={isSubmittingProof}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-40"
              >
                {isSubmittingProof ? <LoadingSpinner label="Submitting..." /> : 'Submit Proof to Contract'}
              </button>
            )}
            {zkStep === 'failed' && (
              <div className="space-y-2">
                <p className="text-xs text-rose-300">{zkError}</p>
                <button type="button" onClick={resetZk} className="w-full rounded-xl border border-slate-700 px-4 py-3 text-slate-300 hover:border-indigo-400">
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-center">
            {!loanTxUrl ? (
              <>
                <p className="text-slate-300">You&apos;re ZK-verified. Request your first interest-free micro-loan of 20 XLM.</p>
                <button
                  type="button"
                  onClick={handleRequestLoan}
                  disabled={isRequestingLoan}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-40"
                >
                  {isRequestingLoan ? <LoadingSpinner label="Requesting..." /> : 'Request Micro-Loan (20 XLM)'}
                </button>
              </>
            ) : (
              <>
                <p className="text-emerald-300 font-semibold">🎉 Onboarding complete! Your micro-loan has been disbursed.</p>
                <a href={loanTxUrl} target="_blank" rel="noreferrer" className="block text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                  View Transaction ↗
                </a>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 transition"
                >
                  Go to Dashboard
                </button>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
