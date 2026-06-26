'use client';

import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { truncateAddress } from '@/lib/financial';
import { WalletState } from '@/lib/types';

interface WalletConnectProps {
  walletState: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  redirectOnConnect?: boolean;
}

export function WalletConnect({ walletState, connect, disconnect, isConnecting, redirectOnConnect = true }: WalletConnectProps) {
  const router = useRouter();

  const handleConnect = async () => {
    await connect();
    if (redirectOnConnect) router.push('/dashboard');
  };

  if (walletState.isConnected && walletState.address) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-full border border-indigo-300/20 bg-indigo-500/10 px-3 py-2">
        <span className="font-mono text-sm text-indigo-200" title={walletState.address}>
          {truncateAddress(walletState.address)}
        </span>
        <span className="text-sm text-slate-300">{Number(walletState.balance ?? 0).toFixed(2)} XLM</span>
        <button
          type="button"
          onClick={disconnect}
          className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-slate-300 transition hover:bg-red-500/20 hover:text-red-200"
          aria-label="Disconnect wallet"
        >
          x
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={isConnecting}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-proof transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isConnecting ? <LoadingSpinner label="Connecting..." /> : <span>Connect Wallet</span>}
    </button>
  );
}
