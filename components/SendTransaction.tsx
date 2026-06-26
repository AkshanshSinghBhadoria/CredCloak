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
        <div className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          Transaction submitted:
          <a href={result.stellarLabUrl} target="_blank" rel="noreferrer" className="ml-2 font-mono underline">
            {result.hash}
          </a>
        </div>
      )}
      {result && !result.success && (
        <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{result.error}</div>
      )}
    </Card>
  );
}
