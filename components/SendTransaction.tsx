'use client';

import { FormEvent, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { buildAndSubmitTransaction, isValidStellarAddress } from '@/lib/stellar';
import { TransactionResult, WalletState } from '@/lib/types';

export function SendTransaction({
  walletState,
  signTransaction,
  onSent,
}: {
  walletState: WalletState;
  signTransaction: (xdr: string) => Promise<string>;
  onSent?: () => Promise<void> | void;
}) {
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [isSending, setIsSending] = useState(false);

  const destinationError = destination && !isValidStellarAddress(destination) ? 'Enter a valid Stellar public key beginning with G.' : '';
  const amountError = amount && (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) ? 'Use a positive amount with up to 2 decimals.' : '';
  const memoError = memo.length > 28 ? 'Text memos are limited to 28 characters.' : '';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!walletState.address || destinationError || amountError || memoError || !destination || !amount) return;

    setIsSending(true);
    setResult(null);
    const txResult = await buildAndSubmitTransaction(
      {
        sourceAddress: walletState.address,
        destination,
        amount,
        memo: memo.trim() || undefined,
      },
      signTransaction,
    );
    setResult(txResult);
    setIsSending(false);

    if (txResult.success) {
      setDestination('');
      setAmount('');
      setMemo('');
      await onSent?.();
    }
  };

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-bold text-white">Send XLM (Testnet)</h2>
      <p className="mt-2 text-sm text-slate-400">This sends real testnet XLM. Testnet funds have no real value.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Destination address</span>
          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value.trim())}
            placeholder="G..."
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white outline-none transition focus:border-indigo-400"
          />
          {destinationError && <span className="mt-1 block text-sm text-red-300">{destinationError}</span>}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Amount in XLM</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="10.00"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-indigo-400"
          />
          {amountError && <span className="mt-1 block text-sm text-red-300">{amountError}</span>}
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-300">Memo (optional)</span>
          <input
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            maxLength={28}
            placeholder="CredCloak test"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-indigo-400"
          />
          {memoError && <span className="mt-1 block text-sm text-red-300">{memoError}</span>}
        </label>

        <button
          type="submit"
          disabled={isSending || !destination || !amount || Boolean(destinationError || amountError || memoError)}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-proof transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? <LoadingSpinner label="Sending..." /> : 'Send XLM'}
        </button>
      </form>

      {result?.success && (
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 backdrop-blur-md animate-rise">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-display font-bold text-white text-base">Transaction Dispatched Successfully</h3>
                <p className="text-sm text-slate-400 mt-1">Your transaction has been written and validated on the Stellar Testnet ledger.</p>
              </div>

              <div className="grid gap-2 text-xs rounded-xl bg-slate-950/60 p-3 border border-slate-900 font-mono">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Tx Hash:</span>
                  <span className="text-slate-300 truncate max-w-[200px]" title={result.hash}>{result.hash}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Status:</span>
                  <span className="text-emerald-400 font-bold">Confirmed</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <a
                  href={result.stellarLabUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600/90 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600"
                >
                  <span>View on Stellar Expert</span>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="rounded-lg border border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 backdrop-blur-md animate-rise">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-display font-bold text-white text-base">Transaction Submission Failed</h3>
                <p className="text-sm text-rose-300/80 mt-1">An error occurred while signing or submitting your transaction to Horizon.</p>
              </div>

              <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-900">
                <p className="font-mono text-xs text-rose-200 break-all">{result.error}</p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition"
                >
                  Dismiss & Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
