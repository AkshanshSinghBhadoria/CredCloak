'use client';

import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { truncateHash } from '@/lib/financial';

interface TransactionStatusProps {
  status: 'idle' | 'signing' | 'submitting' | 'confirmed' | 'failed';
  txHash?: string;
  explorerUrl?: string;
  errorMessage?: string;
  onDismiss: () => void;
}

export function TransactionStatus({
  status,
  txHash,
  explorerUrl,
  errorMessage,
  onDismiss,
}: TransactionStatusProps) {
  if (status === 'idle') return null;

  return (
    <Card className="p-5 border border-cloak-border/80 bg-cloak-panel/90 backdrop-blur-xl animate-rise">
      <h3 className="font-display font-bold text-white text-base">Transaction Status</h3>
      
      <div className="mt-4 space-y-4">
        {status === 'signing' && (
          <div className="flex items-center gap-3 text-slate-300">
            <LoadingSpinner label="" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Signing transaction</p>
              <p className="text-xs text-slate-400">Please approve the request in your wallet extension...</p>
            </div>
          </div>
        )}

        {status === 'submitting' && (
          <div className="flex items-center gap-3 text-slate-300">
            <LoadingSpinner label="" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Submitting to network</p>
              <p className="text-xs text-slate-400">Broadcasting and awaiting consensus from Stellar nodes...</p>
            </div>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-white">Readiness Claim Confirmed</p>
                <p className="text-xs text-emerald-400/90 font-medium">Claim successfully written to on-chain ledger.</p>
              </div>

              {txHash && (
                <div className="rounded-lg bg-slate-950/60 p-2 border border-slate-900 font-mono text-xs flex justify-between gap-4">
                  <span className="text-slate-500">Hash:</span>
                  <span className="text-slate-300 truncate" title={txHash}>{truncateHash(txHash, 10)}</span>
                </div>
              )}

              {explorerUrl && (
                <div className="flex gap-2 pt-1">
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
                  >
                    <span>Explorer ↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-white">Submission Failed</p>
                <p className="text-xs text-rose-300/80 mt-1">{errorMessage || 'An error occurred during transaction execution.'}</p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition"
                >
                  Dismiss & Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
