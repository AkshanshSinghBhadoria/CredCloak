'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getStellarLabUrl } from '@/lib/stellar';
import { truncateAddress, truncateHash } from '@/lib/financial';
import { StellarTransaction } from '@/lib/types';

type Filter = 'all' | 'received' | 'sent';

export function TransactionHistory({ transactions, isLoading, address, onFunded }: { transactions: StellarTransaction[]; isLoading: boolean; address: string | null; onFunded?: () => Promise<void> | void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [isFunding, setIsFunding] = useState(false);
  const [fundingError, setFundingError] = useState<string | null>(null);

  const pageSize = 10;
  const filtered = useMemo(
    () => transactions.filter((tx) => filter === 'all' || tx.type === filter).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transactions, filter],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const selectFilter = (next: Filter) => {
    setFilter(next);
    setPage(1);
  };

  const handleFund = async () => {
    if (!address) return;
    setIsFunding(true);
    setFundingError(null);
    try {
      const response = await fetch(`https://friendbot.stellar.org/?addr=${address}`);
      if (!response.ok) {
        throw new Error(`Friendbot failed with status ${response.status}`);
      }
      // Successful funding! Clear cache and trigger callback
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(`credcloak:txs:${address}:200`);
      }
      if (onFunded) {
        await onFunded();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setFundingError('Failed to fund account automatically. Please try the manual link or try again.');
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cloak-border p-5">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Transaction History</h2>
          <p className="mt-1 text-sm text-slate-400">Live native XLM payments from Stellar Horizon.</p>
        </div>
        <div className="flex rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {(['all', 'received', 'sent'] as Filter[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => selectFilter(item)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${filter === item ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="p-8 text-slate-300"><LoadingSpinner label="Loading transactions..." /></div>
      ) : visible.length === 0 ? (
        <div className="p-8 text-center">
          <p className="font-display text-lg font-semibold text-white">No transactions found.</p>
          <p className="mt-2 text-sm text-slate-400">This account is empty. Fund it to activate it on the Stellar Testnet.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleFund}
              disabled={isFunding}
              className="inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {isFunding ? <LoadingSpinner label="Funding..." /> : 'Fund Account Automatically'}
            </button>
            <a
              href={`https://laboratory.stellar.org/#create-account?addr=${address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-xl border border-slate-700 px-5 py-2.5 font-semibold text-slate-300 hover:border-indigo-400 hover:text-white"
            >
              Manual Funding (Stellar Lab) ↗
            </a>
          </div>
          {fundingError && <p className="mt-3 text-sm text-red-400">{fundingError}</p>}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Counterparty</th>
                  <th className="px-5 py-3">TX Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visible.map((tx) => (
                  <tr key={tx.id} className={tx.type === 'received' ? 'border-l-4 border-l-emerald-400/70 bg-emerald-500/[0.03]' : 'border-l-4 border-l-red-400/70 bg-red-500/[0.03]'}>
                    <td className="px-5 py-4 text-slate-300">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4"><Badge tone={tx.type === 'received' ? 'green' : 'red'}>{tx.type}</Badge></td>
                    <td className="px-5 py-4 font-display font-bold text-white">{Number(tx.amount).toFixed(2)} XLM</td>
                    <td className="px-5 py-4">
                      <button type="button" onClick={() => navigator.clipboard?.writeText(tx.counterparty)} className="font-mono text-indigo-300 hover:text-indigo-100" title="Copy full address">
                        {truncateAddress(tx.counterparty)}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <a href={getStellarLabUrl(tx.hash)} target="_blank" rel="noreferrer" className="font-mono text-indigo-300 hover:text-indigo-100">
                        {truncateHash(tx.hash)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-cloak-border p-4 text-sm text-slate-400">
            <span>Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Prev</button>
              <button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
