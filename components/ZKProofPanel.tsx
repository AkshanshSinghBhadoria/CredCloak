'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { useZKProof } from '@/hooks/useZKProof';
import { FinancialStats } from '@/lib/types';
import { upgradeClaimToZKVerified } from '@/lib/contract';

interface ZKProofPanelProps {
  stats: FinancialStats;
  borrowerAddress: string;
  signTransaction: (xdr: string) => Promise<string>;
  onProofVerified: () => void;
  claimRegistered: boolean;
}

export function ZKProofPanel({
  stats,
  borrowerAddress,
  signTransaction,
  onProofVerified,
  claimRegistered,
}: ZKProofPanelProps) {
  const { step, setStep, proof, error, setError, progressMsg, generate, reset } = useZKProof();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    // Standard thresholds set in Level 3
    const minBalance = Number(process.env.NEXT_PUBLIC_ZK_MIN_BALANCE_XLM || 100);
    const maxDti = Number(process.env.NEXT_PUBLIC_ZK_MAX_DTI_PERCENT || 50);
    await generate(stats, borrowerAddress, { minBalance, maxDti });
  };

  const handleSubmitProof = async () => {
    if (!proof) return;
    setIsSubmitting(true);
    setError(null);
    setStep('submitting');

    try {
      const result = await upgradeClaimToZKVerified(
        borrowerAddress,
        proof.proofBytes,
        signTransaction
      );

      if (result.success) {
        setStep('verified');
        setTxHash(result.txHash || null);
        setExplorerUrl(result.explorerUrl || null);
        onProofVerified();
      } else {
        setStep('failed');
        setError(result.errorMessage || 'Failed to submit proof to contract.');
      }
    } catch (err: any) {
      setStep('failed');
      setError(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 border border-cloak-border bg-cloak-panel/85 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-white">Generate ZK Proof</h2>
          <p className="text-xs text-slate-400">Prove your metrics privately in the browser</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="text-sm text-slate-300 space-y-2">
          <p>This generates a zero-knowledge proof showing:</p>
          <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
            <li>Your Average Balance is <span className="text-white font-semibold">≥ 100 XLM</span> (without revealing your actual balance)</li>
            <li>Your Debt-to-Income (DTI) is <span className="text-white font-semibold">≤ 50%</span> (without revealing inflows/outflows)</li>
            <li>The proof is bound to your account address to prevent theft</li>
          </ul>
        </div>

        {step === 'idle' && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!claimRegistered}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-proof hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {claimRegistered ? 'Generate ZK Proof (Client-Side)' : 'Register Claim First to Enable ZK'}
            </button>
            {!claimRegistered && (
              <p className="mt-2 text-center text-[10px] text-amber-300">
                You must have an active on-chain claim registered before generating a ZK proof.
              </p>
            )}
          </div>
        )}

        {(step === 'computing_inputs' || step === 'generating_proof') && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-900 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <LoadingSpinner label="" />
              <span className="text-xs font-semibold text-slate-300">{progressMsg}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full animate-[loading-bar_4s_ease-out_infinite]" style={{ width: '60%' }}></div>
            </div>
            <p className="text-[10px] text-slate-500">ZK prover runs locally. Processing arithmetic circuits...</p>
          </div>
        )}

        {step === 'proof_ready' && proof && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-900 space-y-3 animate-rise">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Proving Time:</span>
              <span className="font-semibold text-white">{(proof.generationTimeMs / 1000).toFixed(2)}s</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Proof Size:</span>
              <span className="font-semibold text-white">{(proof.proofBytes.length / 1024).toFixed(2)} KB</span>
            </div>
            <div className="space-y-1">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Public Inputs</span>
              <div className="bg-slate-900 rounded p-2 text-[10px] font-mono text-indigo-300 truncate">
                [{proof.publicInputs.join(', ')}]
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmitProof}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-proof hover:bg-indigo-500 transition"
            >
              {isSubmitting ? <LoadingSpinner label="Submitting XDR..." /> : 'Submit ZK Proof to Soroban'}
            </button>
          </div>
        )}

        {step === 'submitting' && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-900 flex items-center gap-3">
            <LoadingSpinner label="" />
            <span className="text-xs font-semibold text-slate-300">Submitting proof verification transaction...</span>
          </div>
        )}

        {step === 'verified' && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 animate-rise">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              ZK Proof Verified On-Chain!
            </div>
            <p className="text-xs text-slate-300">Your claim has been upgraded to ZK-verified status. You are now eligible to claim micro-loans from the pool.</p>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
              >
                View Transaction on Explorer ↗
              </a>
            )}
            <button
              type="button"
              onClick={reset}
              className="block w-full mt-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs py-2 transition"
            >
              Reset Prover
            </button>
          </div>
        )}

        {(step === 'failed' || error) && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 space-y-2 animate-rise">
            <div className="text-xs font-semibold text-rose-300">Error Encountered</div>
            <p className="text-xs text-slate-300">{error || 'Proof generation or verification failed.'}</p>
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs py-2 transition hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
