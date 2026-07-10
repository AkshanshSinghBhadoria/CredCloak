'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { getStellarLabUrl } from '@/lib/stellar';
import { mintScore } from '@/lib/contract';
import { Analytics } from '@/lib/analytics';
import { ReadinessClaim } from '@/lib/types';
import toast from 'react-hot-toast';

interface CredCloakScoreProps {
  claim: ReadinessClaim | null;
  borrowerAddress: string;
  signTransaction: (xdr: string) => Promise<string>;
  onScoreMinted: () => void;
}

export function CredCloakScore({ claim, borrowerAddress, signTransaction, onScoreMinted }: CredCloakScoreProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  if (!claim || !claim.zkVerified) return null;

  const isMinted = !!claim.scoreMinted;
  const expiryMs = (claim.scoreExpiry ?? 0) * 1000;
  const isExpired = isMinted && expiryMs < Date.now();
  const isActive = isMinted && !isExpired;

  const handleMintOrRefresh = async () => {
    setIsMinting(true);
    try {
      const result = await mintScore(borrowerAddress, claim.timestamp, signTransaction);
      if (result.success) {
        setExplorerUrl(result.explorerUrl ?? null);
        Analytics.scoreMinted();
        toast.success('CredCloak Score minted successfully.');
        onScoreMinted();
      } else {
        toast.error(result.errorMessage || 'Failed to mint CredCloak Score.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to mint CredCloak Score.');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Card className="p-6 border border-cloak-border bg-cloak-panel/85 backdrop-blur-xl animate-rise">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400 text-xl">🛡️</div>
          <div>
            <h2 className="font-display text-xl font-bold text-white">CredCloak Score</h2>
            <p className="text-xs text-slate-400">Non-transferable, on-chain credit signal</p>
          </div>
        </div>
        {isMinted && (
          <Badge tone={isActive ? 'green' : 'red'}>{isActive ? 'ACTIVE' : 'EXPIRED'}</Badge>
        )}
      </div>

      <div className="mt-6 space-y-2 text-sm">
        <div className="flex items-center justify-between text-slate-300">
          <span>ZK Verified</span>
          <span className="text-emerald-400 font-semibold">✓</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span>Balance Pass</span>
          <span className={claim.balancePass ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {claim.balancePass ? '✓' : '✗'}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span>DTI Pass</span>
          <span className={claim.dtiPass ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {claim.dtiPass ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {isMinted && (
        <div className="mt-4 pt-4 border-t border-slate-900 space-y-1 text-xs text-slate-400">
          <p>Minted: {new Date(claim.timestamp * 1000).toLocaleDateString()}</p>
          <p>Valid until: {new Date(expiryMs).toLocaleDateString()}</p>
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-500">
        This score is readable by any Stellar lending protocol via <span className="font-mono text-indigo-300">has_valid_score()</span> — no proof re-run required.
      </p>

      <div className="mt-5 space-y-3">
        {!isMinted && (
          <button
            type="button"
            onClick={handleMintOrRefresh}
            disabled={isMinting}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-proof hover:bg-indigo-500 transition disabled:opacity-40"
          >
            {isMinting ? <LoadingSpinner label="Minting Score..." /> : 'Mint CredCloak Score'}
          </button>
        )}
        {isExpired && (
          <button
            type="button"
            onClick={handleMintOrRefresh}
            disabled={isMinting}
            className="w-full rounded-xl bg-amber-600 px-4 py-3 font-semibold text-white shadow-proof hover:bg-amber-500 transition disabled:opacity-40"
          >
            {isMinting ? <LoadingSpinner label="Refreshing..." /> : 'Refresh Score'}
          </button>
        )}
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            View on Stellar Expert ↗
          </a>
        )}
      </div>
    </Card>
  );
}
