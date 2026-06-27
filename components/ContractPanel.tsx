'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { FinancialStats, WalletState, ReadinessClaim, TxStatus } from '@/lib/types';
import { truncateAddress } from '@/lib/financial';

interface ContractPanelProps {
  walletState: WalletState;
  stats: FinancialStats;
  totalClaims: number | null;
  activeClaim: ReadinessClaim | null;
  isLoadingStatus: boolean;
  isClaimActive: boolean;
  cooldownDaysLeft: number;
  onRegister: () => void;
  txStatus: TxStatus;
  thresholdsMet: boolean;
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'CAS3D5Y4CQCXR3B7GOAOZFFJZUY267C7ND34SIEIJTTND2NDTT2NCTGG';
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/contract';

export function ContractPanel({
  walletState,
  stats,
  totalClaims,
  activeClaim,
  isLoadingStatus,
  isClaimActive,
  cooldownDaysLeft,
  onRegister,
  txStatus,
  thresholdsMet,
}: ContractPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && CONTRACT_ADDRESS) {
      navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasWallet = walletState.isConnected && !!walletState.address;

  // Tooltip descriptions
  let buttonTooltip = '';
  if (!hasWallet) {
    buttonTooltip = 'Please connect your wallet first.';
  } else if (isClaimActive) {
    buttonTooltip = `You already have an active claim on-chain. Resubmission available in ${cooldownDaysLeft} days.`;
  } else if (!thresholdsMet) {
    buttonTooltip = 'Your credit metrics do not meet the minimum criteria to register.';
  }

  return (
    <Card className="p-6 border border-cloak-border bg-cloak-panel/85 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-white">CredCloak Proof Registry</h2>
          <p className="text-xs text-slate-400">Secure, non-custodial loan readiness claims</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* Contract Address */}
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Contract Address</span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-slate-300 bg-slate-950/70 border border-slate-900 px-3 py-1.5 rounded-lg select-all text-ellipsis overflow-hidden max-w-[200px] sm:max-w-none">
              {truncateAddress(CONTRACT_ADDRESS, 8)}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-white transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={`${EXPLORER_BASE}/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-white transition"
            >
              Explorer ↗
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-4">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Global Claims</span>
            <span className="mt-1 block text-lg font-bold text-white font-display">
              {totalClaims !== null ? totalClaims : '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Network</span>
            <span className="mt-1 block text-sm font-semibold text-indigo-300 font-display">
              Stellar Testnet
            </span>
          </div>
        </div>

        {/* Your Claim Status */}
        <div className="border-t border-slate-900 pt-4">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Your Registry Status</span>
          {isLoadingStatus ? (
            <div className="mt-2 text-slate-400 text-xs"><LoadingSpinner label="Checking on-chain records..." /></div>
          ) : isClaimActive ? (
            <div className="mt-2 space-y-1 animate-rise">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Active claim registered on-chain
              </div>
              <div className="text-xs text-slate-400">
                Registered: {activeClaim?.timestamp ? new Date(activeClaim.timestamp * 1000).toLocaleString() : 'Recent'}
              </div>
              <div className="text-xs text-slate-400">
                Registry Cooldown expires in <span className="font-bold text-white">{cooldownDaysLeft}</span> days
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-slate-400 text-sm font-medium animate-rise">
              <span className="h-2 w-2 rounded-full bg-slate-600"></span>
              No active readiness claim registered on-chain
            </div>
          )}
        </div>

        {/* Register Action CTA */}
        <div className="pt-2">
          <div title={buttonTooltip}>
            <button
              type="button"
              onClick={onRegister}
              disabled={!hasWallet || !thresholdsMet || isClaimActive || txStatus === 'signing' || txStatus === 'submitting'}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-proof transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {txStatus === 'signing' || txStatus === 'submitting' ? (
                <LoadingSpinner label="Processing transaction..." />
              ) : (
                'Register Readiness Claim on Stellar'
              )}
            </button>
          </div>
          
          <p className="mt-3 text-center text-[10px] text-slate-500">
            ⚡ Thresholds required: Average Balance ≥ 100 XLM & DTI Ratio ≤ 50%
          </p>
        </div>
      </div>
    </Card>
  );
}
