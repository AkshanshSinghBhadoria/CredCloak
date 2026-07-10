'use client';

import type { ReactNode } from 'react';
import { WalletProvider } from '@/hooks/useWallet';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ToastProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <WalletProvider>
        {children}
        <ToastProvider />
      </WalletProvider>
    </ErrorBoundary>
  );
}
